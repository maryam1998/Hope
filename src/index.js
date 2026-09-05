// ---------------------------------------------------------------------------
// کتاب مکالمه — Cloudflare Worker backend
// مسیر این فایل باید دقیقاً src/index.js باشه (طبق wrangler.toml).
// ---------------------------------------------------------------------------

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

    if (url.pathname === "/api/tts" && request.method === "GET") {
      const text = (url.searchParams.get("text") || "").trim();
      const voice = url.searchParams.get("voice") || "en-US-AriaNeural";
      if (!text) return json({ error: "text is required" }, 400);
      // فارسی/عربی با Edge-TTS همیشه نتیجه‌ی خوب/درستی نمی‌ده (طبق تجربه‌ی
      // کاربر) — برای این دو زبون اول سراغِ مسیرِ رایگانِ Hugging Face
      // می‌ریم (fetchHuggingFaceTtsAudio پایین‌تر)، و فقط اگه اون هم شکست
      // خورد (تنظیم‌نشده، یا خودِ سرویس در دسترس نبود) برمی‌گردیم به همون
      // Edge-TTS قبلی — یعنی برای بقیه‌ی زبون‌ها هیچ تغییری نکرده.
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

    // فارسی/عربی: مسیرِ جدید Gemini TTS (Google AI Studio). فرانت‌اند اول
    // همین رو صدا می‌زنه؛ اگه شکست بخوره (مثلاً به‌خاطرِ همون بلاکِ
    // جغرافیاییِ Google که پایین‌تر تو getProviderChain توضیح داده شده)
    // خودش برمی‌گرده به /api/tts که از قبل HF-TTS→Edge-TTS رو داره —
    // یعنی این یه لایه‌ی «تلاشِ اول» اضافه‌ست، نه جایگزینِ کاملِ زنجیره‌ی
    // قبلی؛ اگه Gemini برای این حساب/ریجن بلاک باشه، فقط یه‌کمی تأخیر
    // اضافه می‌کنه و بعد خودکار به مسیرِ قبلی می‌ره.
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

// --- Hugging Face TTS (فارسی/عربی) -------------------------------------------
// Edge-TTS برای فارسی/عربی نتیجه‌ی قابل‌قبولی نمی‌ده، پس این دو زبون از یک
// مسیرِ جداگونه رد می‌شن: یا یک «سرویسِ اجراکننده‌ی مدل» که خودت جایی
// (یه Hugging Face Space، یه Inference Endpoint، یا هر سرور دیگه‌ای که
// مدلی مثلِ Aava/SILMA رو اجرا می‌کنه) بالا آوردی و آدرسش رو این‌جا تنظیم
// کردی، یا — اگه اون تنظیم نشده باشه — مسیرِ سرورلسِ رایگانِ خودِ
// Hugging Face («hf-inference») برای مدلِ پیش‌فرض.
//
// نکته‌ی مهم: مدل‌هایی مثلِ xmanii/Ava-82M («Aava») و silma-ai/silma-tts
// («SILMA») فقط وزنِ خام هستن و روی هیچ‌کدوم از Inference Providerهای
// Hugging Face دیپلوی نشدن — یعنی نمی‌شه مستقیم با یه درخواستِ ساده صداشون
// زد؛ برای اجراشون به یه رانتایمِ پایتون (و برای SILMA عملاً GPU) نیاز
// هست. اون «سرویسِ اجراکننده‌ی مدل»ی که خودت تو نمودارت کشیدی همینه: یه
// Space یا سرورِ کوچیک که این مدل‌ها رو بار می‌کنه و یه API معمولی
// (POST متن → بایتِ صوت) جلوش می‌ذاره. وقتی اون رو ساختی/پیدا کردی، فقط
// آدرسش رو تو HF_TTS_SPACE_FA_URL / HF_TTS_SPACE_AR_URL بذار.
//
// تا وقتی همچین سرویسی نداری، این تابع به‌صورتِ پیش‌فرض سراغِ مدل‌های
// facebook/mms-tts-fas و facebook/mms-tts-ara می‌ره — این‌ها بر خلافِ
// Aava/SILMA رسماً با کتابخونه‌ی transformers یکپارچه‌ن، ولی چون خیلی
// پرمصرف نیستن معمولاً (نه همیشه) روی hf-inference در دسترسن؛ کیفیتِ
// صداشون رباتیک‌تر از Aava/SILMA ولی به‌مراتب بهتر از سکوت/خطاست.
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

// برای /health: می‌گه برای این زبون چه چیزی تنظیم شده، بدونِ اینکه واقعاً
// یه درخواست بزنه.
function hfTtsConfigStatus(env, lang) {
  const spaceUrl = hfTtsSpaceUrlFor(lang, env);
  if (spaceUrl) return { mode: "custom-space", url: spaceUrl };
  if (env.HF_API_KEY) return { mode: "hf-inference", model: hfTtsModelFor(lang, env) };
  return { mode: "none (HF_API_KEY not set)" };
}

// یه متنِ فارسی/عربی رو می‌فرسته سمتِ سرویسِ TTS و بایت‌های صوتِ نتیجه رو
// برمی‌گردونه. اول اگه یه «سرویسِ اجراکننده‌ی مدلِ» شخصی تنظیم شده باشه
// (HF_TTS_SPACE_FA_URL/HF_TTS_SPACE_AR_URL) همون رو صدا می‌زنه — قراردادِ
// موردِ انتظار از اون سرویس: POST با بدنه‌ی JSON ‏{ text }‏، و پاسخ =
// بایت‌های خودِ فایلِ صوتی (audio/wav یا audio/mpeg) — یعنی همون چیزی که
// یه Space یا سرورِ کوچیکِ دورِ Aava/SILMA به‌سادگی می‌تونه برگردونه.
// اگه تنظیم نشده باشه، مستقیم سراغِ مسیرِ سرورلسِ رایگانِ خودِ Hugging
// Face (hf-inference) برای مدلِ پیش‌فرض می‌ره.
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
    // Hugging Face معمولاً وقتی مدل دیپلوی نشده یا سرد بوده، به‌جای صدا
    // یه پیغامِ JSON برمی‌گردونه — همون رو به‌عنوانِ خطا نشون می‌دیم تا
    // مشخص باشه مشکل از کجاست.
    const errBody = await safeJson(r).catch(() => null);
    const msg = errBody?.error || `HTTP ${r.status}`;
    throw new Error(`hugging-face (${model}): ${msg}`);
  }
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!bytes.length) throw new Error(`hugging-face (${model}): empty audio`);
  return { bytes, contentType: r.headers.get("Content-Type") || "audio/flac" };
}

// --- Gemini TTS (Google AI Studio) — فقط فارسی/عربی --------------------------
// از همون کلیدی استفاده می‌کنه که برای زنجیره‌ی چت (callGemini بالاتر توی
// همین فایل) استفاده می‌شه — یعنی نیازی به یه GEMINI_API_KEY جدا نیست.
//
// ⚠️ همون‌طور که تو getProviderChain (پایین‌تر) نوشته شده: Google خودش
// درخواست‌هایی که از edge locationهای نزدیک به ایرانِ Cloudflare میان رو
// برای generativelanguage.googleapis.com بلاک می‌کنه («User location is
// not supported»). این endpoint دقیقاً همون API رو صدا می‌زنه، پس ممکنه
// به همون مشکل بخوره. اگه بعد از دیپلوی همیشه با خطای gemini-tts شکست
// خورد (نه فقط گاهی)، یعنی این اکانت/ریجن بلاکه — تو اون حالت این مسیر
// عملاً همیشه به فالبکِ HF-TTS/Edge-TTS تو /api/tts می‌ره، که مشکلی نیست
// چون فرانت‌اند خودش این فالبک رو مدیریت می‌کنه.
const GEMINI_TTS_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";

async function fetchGeminiTtsAudio(text, voice, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = env.GEMINI_TTS_MODEL || GEMINI_TTS_MODEL_DEFAULT;
  const sanitized = String(text).slice(0, 2000);
  // اگه متن با علامتِ سؤال تموم بشه (خیلی از جمله‌های فریزبوک این‌طورن)،
  // مدل ممکنه فکر کنه داری ازش سؤال می‌پرسی و به‌جای خوندنش، بخواد جوابش
  // رو بده — دقیقاً همون خطای «Model tried to generate text» که قبلاً
  // برای عربی گرفتی. برای جلوگیری از این، صریح می‌گیم فقط بخونه، جواب نده.
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
    // برای فهمیدنِ دلیلِ واقعی (متن به‌جای صدا، فیلترِ ایمنی، بلاکِ
    // ریجن که به‌صورتِ candidate خالی/finishReason خودشو نشون می‌ده، یا هر
    // چیزِ دیگه) کل جزئیاتِ مربوط رو تو پیامِ خطا می‌ذاریم.
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

// مرورگر نمی‌تونه PCM خام رو مستقیم با new Audio() پخش کنه — این تابع یه
// هدرِ استانداردِ WAV دورش می‌پیچه (پارامترها ثابتن چون Gemini همیشه
// ۲۴kHz / ۱۶بیت / مونو برمی‌گردونه).
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
// این وب‌سوکت قبلاً مستقیم از خودِ صفحه (مرورگرِ کاربر) به مایکروسافت وصل
// می‌شد و همیشه "failed" می‌شد — چون سرورِ مایکروسافت درخواست‌هایی که
// Originشون یه دامنه‌ی معمولیه (نه خودِ اپلیکیشنِ Edge) رو رد می‌کنه. اینجا
// (سمتِ Worker، بدونِ Origin مرورگری) همون پروتکل رو صدا می‌زنیم و فقط
// بایت‌های mp3ِ نهایی رو برمی‌گردونیم.
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

// یه متن رو با موتورِ Edge/Azure می‌خونه و بایت‌های mp3ِ نتیجه رو برمی‌گردونه.
// حداکثرِ طول رو اینجا هم محدود می‌کنیم (همون splitForOnlineTts سمتِ کلاینت
// تکه‌تکه‌ش می‌کنه، ولی برای احتیاط اینجا هم یه سقف می‌ذاریم).
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

  // نکته‌ی مهم: سرورِ مایکروسافت فقط با هدرِ Upgrade درخواست رو آپگرید
  // نمی‌کنه — باید Origin (همون افزونه‌ی داخلیِ Read Aloud خودِ Edge) و
  // یه User-Agent شبیهِ مرورگرِ Edge هم بفرستیم، وگرنه هندشیکِ وب‌سوکت رو
  // رد می‌کنه و resp.webSocket خالی می‌مونه.
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

// Some providers return an HTML/plain-text error page (e.g. Cloudflare's own
// "error code: 1016" page) instead of JSON when something's wrong upstream.
// r.json() throws a cryptic "Unexpected token..." in that case, which used
// to bubble straight up as the error message. Reading the raw text first and
// parsing it ourselves means a broken provider always fails with a clear,
// readable message and the chain moves on to the next provider cleanly.
async function safeJson(r) {
  const raw = await r.text();
  try {
    return JSON.parse(raw);
  } catch {
    const snippet = raw.trim().slice(0, 120) || `HTTP ${r.status}`;
    throw new Error(`non-JSON response (${snippet})`);
  }
}

// Reads AI_PROVIDER (comma-separated, e.g. "huggingface,groq,gemini") and
// falls back through them in order — same behavior as the old Express
// server. Defaults to huggingface alone if not set.
// 🆕 لیستِ https://github.com/mnfst/awesome-free-llm-apis — همه‌ی پرووایدرهای
// اون لیست اینجا اضافه شدن. سه‌تاشون (kilocode, llm7, ovhcloud) اصلاً کلید
// نمی‌خوان، بقیه هرکدوم یه کلیدِ جداگونه لازم دارن (اسمِ متغیرِ محیطیش کنارِ
// خودِ تابعش کامنت شده). یادت باشه: چون خودِ حساب یه مقدارِ صریح برای
// AI_PROVIDER توی داشبوردِ Cloudflare گذاشته، صرفاً اضافه‌کردنِ این توابع به
// کد کافی نیست — باید همون env var رو توی داشبورد هم آپدیت کنی تا اسمِ
// پرووایدرهای جدید رو شامل بشه (پایین‌تر توضیح دادم).
const VALID_PROVIDERS = [
  "huggingface", "groq", "gemini", "deepseek", "openai", "avalai", "grok", "openrouter", "mistral", "cerebras",
  "aionlabs", "cohere", "zai", "cloudflareai", "kilocode", "llm7", "modelscope", "nvidianim", "ollamacloud", "ovhcloud", "siliconflow",
];
function getProviderChain(env) {
  // Gemini is geo-blocked by Google itself for requests from Iran-adjacent
  // Cloudflare edge locations ("User location is not supported for the API
  // use") — this happens on Cloudflare's own network, completely
  // independent of any VPN on the phone/computer using the app (the phone's
  // VPN only affects the connection TO the Worker, not the Worker's own
  // outbound call FROM Cloudflare's servers TO Google). Hugging Face's
  // router has also been consistently unreachable (Cloudflare error 1016 —
  // likely blocked/broken for the same region-based reason).
  // 🆕 ترتیبِ پیش‌فرضِ جدید: اول سه‌تایی که اصلاً کلید نمی‌خوان (kilocode،
  // llm7، ovhcloud) — این‌ها همیشه یه شانسِ رایگان و بی‌نیاز از تنظیمات
  // می‌دن. بعدش پرووایدرهایی که سقفِ رایگانِ سخاوتمندتری دارن (groq،
  // nvidianim، ollamacloud، cloudflareai)، و آخرِ صف همونایی که یا کلید
  // لازم دارن و تنظیم نشدن یا طبق تجربه‌ی قبلی مشکل‌دار بودن (gemini،
  // huggingface). هر پرووایدری که کلیدش تنظیم نشده باشه خودکار رد می‌شه.
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

// --- Aion Labs (OpenAI-compatible) ------------------------------------------
// کلید: AIONLABS_API_KEY — از https://www.aionlabs.ai/app/api-keys/
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

// --- Cohere (v2 chat API — پاسخش با بقیه فرق داره) --------------------------
// کلید: COHERE_API_KEY — از https://dashboard.cohere.com/api-keys
// ⚠️ اسمِ دقیقِ مدل رو خودِ Cohere مدام آپدیت می‌کنه؛ اگه command-r7b-12-2024
// جواب نداد، اسمِ فعلیِ درست رو از داشبورد/داکیومنتِ خودشون بگیر و بذار توی
// COHERE_MODEL.
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

// --- Z AI / Zhipu (OpenAI-compatible, endpointِ بین‌المللی) -----------------
// کلید: ZAI_API_KEY — از https://open.bigmodel.cn/usercenter/apikeys
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

// --- Cloudflare Workers AI (فرمتِ متفاوت — result.response) -----------------
// کلید: CF_API_TOKEN + CF_ACCOUNT_ID — از داشبوردِ خودِ Cloudflare
// (Profile → API Tokens برای توکن، و آدرس‌بارِ داشبورد یا Workers Overview
// برای Account ID). چون این Workerِ خودمون هم روی Cloudflare ـه، این
// پرووایدر رایگان‌ترین/نزدیک‌ترینه (۱۰٬۰۰۰ نورون در روز).
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

// --- Kilo Code (بدونِ نیاز به کلید — گیت‌وی رایگانِ عمومی) -------------------
// اگه بعداً کلید گرفتی، توی KILOCODE_API_KEY بذار تا هدرِ Authorization هم
// اضافه بشه؛ وگرنه بدونِ هیچ کلیدی هم کار می‌کنه (طبقِ داکیومنتِ خودشون).
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

// --- LLM7.io (بدونِ نیاز به کلید — سطحِ anonymous) ---------------------------
// اگه از https://token.llm7.io یه توکنِ رایگان گرفتی، توی LLM7_API_KEY بذار
// تا سقفِ نرخ بالاتر بره؛ وگرنه بدونِ کلید هم (با سقفِ کمتر) کار می‌کنه.
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

// --- ModelScope (OpenAI-compatible) -----------------------------------------
// کلید: MODELSCOPE_API_KEY — از https://modelscope.cn/my/myaccesstoken
// (نیازمندِ اتصال به حسابِ Alibaba Cloud + احرازِ هویت).
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

// --- NVIDIA NIM (OpenAI-compatible) -----------------------------------------
// کلید: NVIDIA_API_KEY — از https://build.nvidia.com/explore/discover
// (نیازمندِ عضویتِ رایگانِ NVIDIA Developer Program).
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

// --- Ollama Cloud (OpenAI-compatible endpoint) ------------------------------
// کلید: OLLAMA_API_KEY — از https://ollama.com/settings/keys
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

// --- OVHcloud AI Endpoints (سطحِ anonymous — بدونِ نیاز به کلید) ------------
// اگه بعداً API key گرفتی (سقفِ بالاتر)، توی OVHCLOUD_API_KEY بذار.
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

// --- SiliconFlow (OpenAI-compatible) ----------------------------------------
// کلید: SILICONFLOW_API_KEY — از https://cloud.siliconflow.cn/account/ak
// (نیازمندِ احرازِ هویت).
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


// --- Hugging Face ------------------------------------------------------------
// api-inference.huggingface.co was retired — HF now routes every model
// through router.huggingface.co with an OpenAI-compatible chat endpoint.
// 🔧 google/gemma-2-2b-it (قبلی) دیگه توسطِ هیچ‌کدوم از inference-providerهای
// فعالِ حساب پشتیبانی نمی‌شه (خطای "not supported by any provider you have
// enabled") — openai/gpt-oss-120b همون مدلِ متن‌بازیه که Groq هم به‌عنوانِ
// پیش‌فرض استفاده می‌کنه و روی روترِ HF هم در دسترسه.
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

// --- Groq (OpenAI-compatible) ------------------------------------------------
// llama-3.3-70b-versatile and llama-3.1-8b-instant were both deprecated by
// Groq — openai/gpt-oss-120b is their current recommended general-purpose
// replacement (openai/gpt-oss-20b if you want the smaller/faster one). If
// GROQ_MODEL is set in the dashboard to an old name (e.g. the very old
// mixtral-8x7b-32768 default), update it there — this fallback only kicks
// in when GROQ_MODEL isn't set at all.
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

// --- Gemini -------------------------------------------------------------------
// 🔧 gemini-2.0-flash (قبلی) رو گوگل خاموش کرده (۱ ژوئن ۲۰۲۶) و خودِ خطاش
// می‌گفت به‌جاش gemini-3.6-flash رو صدا بزنیم. توجه: طبقِ توضیحِ
// getProviderChain پایین‌تر، Gemini از قبل به‌خاطرِ بلاکِ جغرافیاییِ گوگل
// روی ادج‌لوکیشن‌های نزدیکِ ایران ممکنه مستقل از اسمِ مدل شکست بخوره —
// این فقط باگِ «اسمِ مدلِ منسوخ» رو رفع می‌کنه، نه احتمالاً خودِ بلاکِ جغرافیایی.
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

// --- DeepSeek -------------------------------------------------------------------
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

// --- OpenAI -------------------------------------------------------------------
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

// --- Grok (xAI, OpenAI-compatible) ------------------------------------------
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

// --- OpenRouter (OpenAI-compatible gateway to many models) ------------------
async function callOpenRouter(prompt, maxTokens, env) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      // OpenRouter uses these purely for their own analytics/rankings —
      // optional, but recommended by their docs.
      "HTTP-Referer": env.OPENROUTER_SITE_URL || "https://maryam1998.github.io/Hope/",
      "X-Title": "کتاب مکالمه من",
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

// --- Mistral (OpenAI-compatible) ---------------------------------------------
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

// --- Cerebras (OpenAI-compatible) --------------------------------------------
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

// --- AvalAI (OpenAI-compatible proxy, covers deepseek/openai behind one key) --
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
