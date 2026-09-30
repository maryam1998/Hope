// ---------------------------------------------------------------------------
// LingoLearn — Cloudflare Worker backend
// مسیر این فایل باید دقیقاً src/index.js باشه (طبق wrangler.toml).
// ---------------------------------------------------------------------------

import { handleTranscribe } from "./transcribe.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({ ok: true, message: "Phrasebook backend is running" });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        providers: getProviderChain(env),
        hfTts: {
          fa: hfTtsConfigStatus(env, "fa"),
          ar: hfTtsConfigStatus(env, "ar"),
        },
      });
    }

    // ⭐ NEW: تبدیل صدا به متن با Whisper (Cloudflare Workers AI)
    if (url.pathname === "/api/transcribe" && request.method === "POST") {
      return handleTranscribe(request, env);
    }

    if (url.pathname === "/api/tts" && request.method === "GET") {
      const text = (url.searchParams.get("text") || "").trim();
      const voice = url.searchParams.get("voice") || "en-US-AriaNeural";
      if (!text) return json({ error: "text is required" }, 400);
      const langPrefix = voice.split("-")[0].toLowerCase();
      if (langPrefix === "fa" || langPrefix === "ar") {
        try {
          const { bytes, contentType } = await fetchHuggingFaceTtsAudio(text, langPrefix, env);
          return new Response(bytes, {
            headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400", ...CORS_HEADERS },
          });
        } catch (hfErr) {
          try {
            const audioBytes = await fetchEdgeTtsAudio(text, voice);
            return new Response(audioBytes, {
              headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", ...CORS_HEADERS },
            });
          } catch (edgeErr) {
            return json({ error: `hf-tts: ${hfErr.message || hfErr} | edge-tts: ${edgeErr.message || edgeErr}` }, 502);
          }
        }
      }
      try {
        const audioBytes = await fetchEdgeTtsAudio(text, voice);
        return new Response(audioBytes, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", ...CORS_HEADERS },
        });
      } catch (e) {
        return json({ error: e.message || "edge-tts failed" }, 502);
      }
    }

    if (url.pathname === "/api/tts-gemini" && request.method === "GET") {
      const text = (url.searchParams.get("text") || "").trim();
      const voice = url.searchParams.get("voice") || "Kore";
      if (!text) return json({ error: "text is required" }, 400);
      try {
        const wavBytes = await fetchGeminiTtsAudio(text, voice, env);
        return new Response(wavBytes, {
          headers: { "Content-Type": "audio/wav", "Cache-Control": "public, max-age=86400", ...CORS_HEADERS },
        });
      } catch (e) {
        return json({ error: e.message || "gemini-tts failed" }, 502);
      }
    }

    if (url.pathname === "/api/youtube-captions" && request.method === "GET") {
      const videoId = (url.searchParams.get("videoId") || "").trim();
      const lang = (url.searchParams.get("lang") || "en").trim();
      if (!videoId) return json({ error: "videoId is required" }, 400);
      try {
        const result = await fetchYoutubeCaptions(videoId, lang);
        return json(result);
      } catch (e) {
        return json({ error: e.message || "Could not fetch captions" }, 502);
      }
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
      const { prompt, maxTokens } = body || {};
      if (!prompt || typeof prompt !== "string") {
        return json({ error: "prompt (string) is required" }, 400);
      }
      const capped = Math.min(Math.max(Number(maxTokens) || 1000, 1), 8192);

      const chain = getProviderChain(env);
      const errors = [];
      for (const provider of chain) {
        try {
          const text = await callProvider(provider, prompt, capped, env);
          return json({ text, provider });
        } catch (e) {
          errors.push(`${provider}: ${e.message}`);
        }
      }
      return json({ error: errors.join(" | ") }, 502);
    }

    return json({ error: "Not found" }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// --- زیرنویسِ واقعیِ یوتیوب -----------------------------------------------
async function fetchYoutubeCaptions(videoId, wantLang) {
  let tracks = await fetchCaptionTracksViaInnertube(videoId).catch(() => null);
  if (!tracks || !tracks.length) {
    tracks = await fetchCaptionTracksViaWatchPage(videoId).catch(() => null);
  }
  if (!tracks || !tracks.length) {
    throw new Error("این ویدیو زیرنویس نداره یا زیرنویسش قابلِ دریافت نیست");
  }

  const track = pickCaptionTrack(tracks, wantLang);
  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const capRes = await fetch(`${track.baseUrl}${sep}fmt=json3`);
  if (!capRes.ok) throw new Error("دریافتِ متنِ زیرنویس ناموفق بود");
  const capJson = await capRes.json();

  const cues = (capJson.events || [])
    .filter((e) => e.segs && e.segs.length)
    .map((e) => ({
      start: Math.round(e.tStartMs || 0) / 1000,
      end: Math.round((e.tStartMs || 0) + (e.dDurationMs || 0)) / 1000,
      text: e.segs.map((s) => s.utf8 || "").join("").replace(/\n/g, " ").trim(),
    }))
    .filter((c) => c.text);

  if (!cues.length) throw new Error("زیرنویسِ این ویدیو خالی برگشت");

  return {
    ok: true,
    videoId,
    lang: track.languageCode,
    isAuto: track.kind === "asr",
    availableLangs: tracks.map((t) => ({
      code: t.languageCode,
      name: (t.name && t.name.simpleText) || t.languageCode,
      auto: t.kind === "asr",
    })),
    cues,
  };
}

async function fetchCaptionTracksViaInnertube(videoId) {
  const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: "WEB", clientVersion: "2.20240401.01.00", hl: "en", gl: "US" },
      },
    }),
  });
  if (!res.ok) throw new Error(`innertube status ${res.status}`);
  const data = await res.json();
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
}

async function fetchCaptionTracksViaWatchPage(videoId) {
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}&hl=en&has_verified=1&bpctr=9999999999`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );
  if (!res.ok) throw new Error(`watch page status ${res.status}`);
  const html = await res.text();
  const jsonStr = extractJsonAfter(html, "ytInitialPlayerResponse");
  if (!jsonStr) throw new Error("player response not found");
  const data = JSON.parse(jsonStr);
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
}

function extractJsonAfter(html, marker) {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf("{", idx);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let strCh = "";
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

function pickCaptionTrack(tracks, wantLang) {
  const norm = (s) => (s || "").toLowerCase().split("-")[0];
  const want = norm(wantLang);
  return (
    tracks.find((t) => norm(t.languageCode) === want && t.kind !== "asr") ||
    tracks.find((t) => norm(t.languageCode) === want) ||
    tracks.find((t) => t.kind !== "asr") ||
    tracks[0]
  );
}

// --- Hugging Face TTS (فارسی/عربی) -------------------------------------------
function hfTtsModelFor(lang, env) {
  if (lang === "fa") return env.HF_TTS_MODEL_FA || "facebook/mms-tts-fas";
  if (lang === "ar") return env.HF_TTS_MODEL_AR || "facebook/mms-tts-ara";
  return null;
}

function hfTtsSpaceUrlFor(lang, env) {
  if (lang === "fa") return env.HF_TTS_SPACE_FA_URL || "";
  if (lang === "ar") return env.HF_TTS_SPACE_AR_URL || "";
  return "";
}

function hfTtsConfigStatus(env, lang) {
  const spaceUrl = hfTtsSpaceUrlFor(lang, env);
  if (spaceUrl) return { mode: "custom-space", url: spaceUrl };
  if (env.HF_API_KEY) return { mode: "hf-inference", model: hfTtsModelFor(lang, env) };
  return { mode: "none (HF_API_KEY not set)" };
}

async function fetchHuggingFaceTtsAudio(text, lang, env) {
  const sanitized = String(text).slice(0, 600);
  const spaceUrl = hfTtsSpaceUrlFor(lang, env);

  if (spaceUrl) {
    const headers = { "Content-Type": "application/json" };
    if (env.HF_TTS_SPACE_TOKEN) headers.Authorization = `Bearer ${env.HF_TTS_SPACE_TOKEN}`;
    const r = await fetch(spaceUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: sanitized, lang }),
    });
    if (!r.ok) {
      const snippet = (await r.text().catch(() => "")).slice(0, 160);
      throw new Error(`custom TTS service HTTP ${r.status}${snippet ? ` (${snippet})` : ""}`);
    }
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (!bytes.length) throw new Error("custom TTS service returned empty audio");
    return { bytes, contentType: r.headers.get("Content-Type") || "audio/mpeg" };
  }

  const key = env.HF_API_KEY;
  if (!key) throw new Error("HF_API_KEY not set (needed for Hugging Face TTS)");
  const model = hfTtsModelFor(lang, env);
  const r = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ inputs: sanitized }),
  });
  if (!r.ok) {
    const errBody = await safeJson(r).catch(() => null);
    const msg = errBody?.error || `HTTP ${r.status}`;
    throw new Error(`hugging-face (${model}): ${msg}`);
  }
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!bytes.length) throw new Error(`hugging-face (${model}): empty audio`);
  return { bytes, contentType: r.headers.get("Content-Type") || "audio/flac" };
}

// --- Gemini TTS (Google AI Studio) — فقط فارسی/عربی --------------------------
const GEMINI_TTS_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";

async function fetchGeminiTtsAudio(text, voice, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = env.GEMINI_TTS_MODEL || GEMINI_TTS_MODEL_DEFAULT;
  const sanitized = String(text).slice(0, 2000);
  const ttsPrompt = `TTS the following text exactly as written, in its own language. Do not answer it, do not add anything, just read it aloud verbatim: ${sanitized}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ttsPrompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(`gemini-tts fetch failed: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }

  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `gemini-tts HTTP ${r.status}`);

  const candidate = data?.candidates?.[0];
  const base64Pcm = candidate?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) {
    const textPart = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;
    const blockReason = data?.promptFeedback?.blockReason;
    const details = [
      finishReason ? `finishReason=${finishReason}` : null,
      blockReason ? `blockReason=${blockReason}` : null,
      textPart ? `returned-text="${String(textPart).slice(0, 120)}"` : null,
      !candidate ? `raw=${JSON.stringify(data).slice(0, 300)}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`gemini-tts: no audio returned${details ? ` (${details})` : ""}`);
  }

  const pcmBytes = base64ToUint8Array(base64Pcm);
  return pcmToWav(pcmBytes, { sampleRate: 24000, numChannels: 1, bitsPerSample: 16 });
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToWav(pcmBytes, { sampleRate, numChannels, bitsPerSample }) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, 44);
  return wavBytes;
}

// --- Edge/Azure Neural TTS proxy ---------------------------------------------
const EDGE_TTS_TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

function edgeTtsUuid() {
  return crypto.randomUUID().replace(/-/g, "");
}

function edgeTtsEscapeXml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function edgeTtsSecMsGec() {
  const WIN_EPOCH = 11644473600;
  let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
  ticks -= ticks % 300;
  const ticksStr = String(Math.round(ticks * 1e7));
  const strToHash = ticksStr + EDGE_TTS_TRUSTED_TOKEN;
  const enc = new TextEncoder().encode(strToHash);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function fetchEdgeTtsAudio(text, voice) {
  const sanitized = String(text).slice(0, 600);
  const gec = await edgeTtsSecMsGec();
  const connId = edgeTtsUuid();
  const wsUrl =
    "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
    `?TrustedClientToken=${EDGE_TTS_TRUSTED_TOKEN}` +
    `&Sec-MS-GEC=${gec}` +
    `&Sec-MS-GEC-Version=1-131.0.2903.99` +
    `&ConnectionId=${connId}`;

  const resp = await fetch(wsUrl, {
    headers: {
      Upgrade: "websocket",
      Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error("edge-tts: upstream didn't upgrade to websocket");
  ws.accept();

  return new Promise((resolve, reject) => {
    const audioParts = [];
    let settled = false;

    const finishOk = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        ws.close();
      } catch (e) {}
      if (!audioParts.length) {
        reject(new Error("edge-tts: no audio returned"));
        return;
      }
      let total = 0;
      for (const p of audioParts) total += p.length;
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const p of audioParts) {
        merged.set(p, offset);
        offset += p.length;
      }
      resolve(merged);
    };
    const finishFail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        ws.close();
      } catch (e) {}
      reject(err || new Error("edge-tts: failed"));
    };
    const timeoutId = setTimeout(() => finishFail(new Error("edge-tts: timeout")), 15000);

    ws.addEventListener("message", (evt) => {
      if (typeof evt.data === "string") {
        if (evt.data.indexOf("Path:turn.end") !== -1) finishOk();
        return;
      }
      try {
        const buf = new Uint8Array(evt.data);
        if (buf.length < 2) return;
        const headerLen = (buf[0] << 8) | buf[1];
        const headerStr = new TextDecoder("utf-8").decode(buf.slice(2, 2 + headerLen));
        if (headerStr.indexOf("Path:audio") !== -1) {
          const audioData = buf.slice(2 + headerLen);
          if (audioData.length) audioParts.push(audioData);
        }
      } catch (e) {}
    });
    ws.addEventListener("close", () => finishOk());
    ws.addEventListener("error", () => finishFail(new Error("edge-tts: websocket error")));

    try {
      const now = new Date().toISOString();
      ws.send(
        `X-Timestamp:${now}\r\n` +
          "Content-Type:application/json; charset=utf-8\r\n" +
          "Path:speech.config\r\n\r\n" +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          })
      );
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody rate='+0%'>${edgeTtsEscapeXml(sanitized)}</prosody></voice>` +
        `</speak>`;
      ws.send(
        `X-RequestId:${edgeTtsUuid()}\r\n` +
          "Content-Type:application/ssml+xml\r\n" +
          `X-Timestamp:${now}\r\n` +
          "Path:ssml\r\n\r\n" +
          ssml
      );
    } catch (e) {
      finishFail(e);
    }
  });
}

async function safeJson(r) {
  const raw = await r.text();
  try {
    return JSON.parse(raw);
  } catch {
    const snippet = raw.trim().slice(0, 120) || `HTTP ${r.status}`;
    throw new Error(`non-JSON response (${snippet})`);
  }
}

const VALID_PROVIDERS = [
  "huggingface", "groq", "gemini", "deepseek", "openai", "avalai", "grok", "openrouter", "mistral", "cerebras",
  "aionlabs", "cohere", "zai", "cloudflareai", "kilocode", "llm7", "modelscope", "nvidianim", "ollamacloud", "ovhcloud", "siliconflow",
];
function getProviderChain(env) {
  const raw = (
    env.AI_PROVIDER ||
    "kilocode,llm7,ovhcloud,groq,nvidianim,ollamacloud,cloudflareai,mistral,cohere,zai,aionlabs,modelscope,siliconflow,openrouter,cerebras,grok,gemini,huggingface"
  ).toLowerCase();
  const chain = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => VALID_PROVIDERS.includes(p));
  return chain.length ? chain : ["openrouter"];
}

async function callProvider(provider, prompt, maxTokens, env) {
  if (provider === "huggingface") return callHuggingFace(prompt, maxTokens, env);
  if (provider === "groq") return callGroq(prompt, maxTokens, env);
  if (provider === "gemini") return callGemini(prompt, maxTokens, env);
  if (provider === "deepseek") return callDeepSeek(prompt, maxTokens, env);
  if (provider === "openai") return callOpenAI(prompt, maxTokens, env);
  if (provider === "avalai") return callAvalAI(prompt, maxTokens, env);
  if (provider === "grok") return callGrok(prompt, maxTokens, env);
  if (provider === "openrouter") return callOpenRouter(prompt, maxTokens, env);
  if (provider === "mistral") return callMistral(prompt, maxTokens, env);
  if (provider === "cerebras") return callCerebras(prompt, maxTokens, env);
  if (provider === "aionlabs") return callAionLabs(prompt, maxTokens, env);
  if (provider === "cohere") return callCohere(prompt, maxTokens, env);
  if (provider === "zai") return callZai(prompt, maxTokens, env);
  if (provider === "cloudflareai") return callCloudflareAI(prompt, maxTokens, env);
  if (provider === "kilocode") return callKiloCode(prompt, maxTokens, env);
  if (provider === "llm7") return callLLM7(prompt, maxTokens, env);
  if (provider === "modelscope") return callModelScope(prompt, maxTokens, env);
  if (provider === "nvidianim") return callNvidiaNim(prompt, maxTokens, env);
  if (provider === "ollamacloud") return callOllamaCloud(prompt, maxTokens, env);
  if (provider === "ovhcloud") return callOvhCloud(prompt, maxTokens, env);
  if (provider === "siliconflow") return callSiliconFlow(prompt, maxTokens, env);
  throw new Error(`Unknown provider "${provider}"`);
}

async function callAionLabs(prompt, maxTokens, env) {
  const key = env.AIONLABS_API_KEY;
  if (!key) throw new Error("AIONLABS_API_KEY not set");
  const r = await fetch("https://api.aionlabs.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.AIONLABS_MODEL || "aion-labs/aion-3.0-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Aion Labs HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Aion Labs returned empty response");
  return text;
}

async function callCohere(prompt, maxTokens, env) {
  const key = env.COHERE_API_KEY;
  if (!key) throw new Error("COHERE_API_KEY not set");
  const r = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.COHERE_MODEL || "command-r7b-12-2024",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.message || `Cohere HTTP ${r.status}`);
  const parts = data?.message?.content || [];
  const text = parts.map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Cohere returned empty response");
  return text;
}

async function callZai(prompt, maxTokens, env) {
  const key = env.ZAI_API_KEY;
  if (!key) throw new Error("ZAI_API_KEY not set");
  const r = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.ZAI_MODEL || "glm-4.7-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Z AI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Z AI returned empty response");
  return text;
}

async function callCloudflareAI(prompt, maxTokens, env) {
  const token = env.CF_API_TOKEN;
  const accountId = env.CF_ACCOUNT_ID;
  if (!token || !accountId) throw new Error("CF_API_TOKEN/CF_ACCOUNT_ID not set");
  const model = env.CF_AI_MODEL || "@cf/openai/gpt-oss-120b";
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      }),
    }
  );
  const data = await safeJson(r);
  if (!r.ok || data?.success === false) {
    const errMsg = (data?.errors || []).map((e) => e.message).join("; ");
    throw new Error(errMsg || `Cloudflare Workers AI HTTP ${r.status}`);
  }
  const text = data?.result?.response || "";
  if (!text) throw new Error("Cloudflare Workers AI returned empty response");
  return text;
}

async function callKiloCode(prompt, maxTokens, env) {
  const headers = { "Content-Type": "application/json" };
  if (env.KILOCODE_API_KEY) headers.Authorization = `Bearer ${env.KILOCODE_API_KEY}`;
  const r = await fetch("https://api.kilo.ai/api/gateway/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: env.KILOCODE_MODEL || "openrouter/free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Kilo Code HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Kilo Code returned empty response");
  return text;
}

async function callLLM7(prompt, maxTokens, env) {
  const headers = { "Content-Type": "application/json" };
  if (env.LLM7_API_KEY) headers.Authorization = `Bearer ${env.LLM7_API_KEY}`;
  const r = await fetch("https://api.llm7.io/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: env.LLM7_MODEL || "gpt-oss:20b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `LLM7.io HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("LLM7.io returned empty response");
  return text;
}

async function callModelScope(prompt, maxTokens, env) {
  const key = env.MODELSCOPE_API_KEY;
  if (!key) throw new Error("MODELSCOPE_API_KEY not set");
  const r = await fetch("https://api-inference.modelscope.cn/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.MODELSCOPE_MODEL || "Qwen/Qwen3.5-35B-A3B",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `ModelScope HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("ModelScope returned empty response");
  return text;
}

async function callNvidiaNim(prompt, maxTokens, env) {
  const key = env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set");
  const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `NVIDIA NIM HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("NVIDIA NIM returned empty response");
  return text;
}

async function callOllamaCloud(prompt, maxTokens, env) {
  const key = env.OLLAMA_API_KEY;
  if (!key) throw new Error("OLLAMA_API_KEY not set");
  const r = await fetch("https://ollama.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL || "gpt-oss:120b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Ollama Cloud HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Ollama Cloud returned empty response");
  return text;
}

async function callOvhCloud(prompt, maxTokens, env) {
  const headers = { "Content-Type": "application/json" };
  if (env.OVHCLOUD_API_KEY) headers.Authorization = `Bearer ${env.OVHCLOUD_API_KEY}`;
  const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: env.OVHCLOUD_MODEL || "gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `OVHcloud HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OVHcloud returned empty response");
  return text;
}

async function callSiliconFlow(prompt, maxTokens, env) {
  const key = env.SILICONFLOW_API_KEY;
  if (!key) throw new Error("SILICONFLOW_API_KEY not set");
  const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.SILICONFLOW_MODEL || "Qwen/Qwen3-8B",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `SiliconFlow HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("SiliconFlow returned empty response");
  return text;
}

async function callHuggingFace(prompt, maxTokens, env) {
  const key = env.HF_API_KEY;
  if (!key) throw new Error("HF_API_KEY not set");
  const model = env.HF_MODEL || "openai/gpt-oss-120b";
  const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Hugging Face HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Hugging Face returned empty response");
  return text.trim();
}

async function callGroq(prompt, maxTokens, env) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `Groq HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Groq returned empty response");
  return text;
}

async function callGemini(prompt, maxTokens, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = env.GEMINI_MODEL || "gemini-3.6-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `Gemini HTTP ${r.status}`);
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callDeepSeek(prompt, maxTokens, env) {
  const key = env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  const baseUrl = env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `DeepSeek HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("DeepSeek returned empty response");
  return text;
}

async function callOpenAI(prompt, maxTokens, env) {
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OpenAI returned empty response");
  return text;
}

async function callGrok(prompt, maxTokens, env) {
  const key = env.GROK_API_KEY || env.XAI_API_KEY;
  if (!key) throw new Error("GROK_API_KEY not set");
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.GROK_MODEL || "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Grok HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Grok returned empty response");
  return text;
}

async function callOpenRouter(prompt, maxTokens, env) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": env.OPENROUTER_SITE_URL || "https://maryam1998.github.io/Hope/",
      "X-Title": "LingoLearn",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OpenRouter returned empty response");
  return text;
}

async function callMistral(prompt, maxTokens, env) {
  const key = env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY not set");
  const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.MISTRAL_MODEL || "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `Mistral HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Mistral returned empty response");
  return text;
}

async function callCerebras(prompt, maxTokens, env) {
  const key = env.CEREBRAS_API_KEY;
  if (!key) throw new Error("CEREBRAS_API_KEY not set");
  const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.CEREBRAS_MODEL || "llama3.1-8b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `Cerebras HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Cerebras returned empty response");
  return text;
}

async function callAvalAI(prompt, maxTokens, env) {
  const key = env.AVALAI_API_KEY;
  if (!key) throw new Error("AVALAI_API_KEY not set");
  const r = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.AVALAI_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || `AvalAI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("AvalAI returned empty response");
  return text;
}
