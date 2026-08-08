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
      return json({ ok: true, providers: getProviderChain(env) });
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
const VALID_PROVIDERS = ["huggingface", "groq", "gemini", "deepseek", "openai", "avalai"];
function getProviderChain(env) {
  // Gemini is geo-blocked by Google itself for requests from Iran-adjacent
  // Cloudflare edge locations ("User location is not supported for the API
  // use") — this happens on Cloudflare's own network, completely
  // independent of any VPN on the phone/computer using the app (the phone's
  // VPN only affects the connection TO the Worker, not the Worker's own
  // outbound call FROM Cloudflare's servers TO Google). Hugging Face's
  // router has also been consistently unreachable (Cloudflare error 1016 —
  // likely blocked/broken for the same region-based reason). Groq is the
  // one that's actually been responding (once given a current, non-
  // decommissioned model name), so it's first by default; the other two
  // are just kept as long-shot fallbacks.
  const raw = (env.AI_PROVIDER || "groq,gemini,huggingface").toLowerCase();
  const chain = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => VALID_PROVIDERS.includes(p));
  return chain.length ? chain : ["groq"];
}

async function callProvider(provider, prompt, maxTokens, env) {
  if (provider === "huggingface") return callHuggingFace(prompt, maxTokens, env);
  if (provider === "groq") return callGroq(prompt, maxTokens, env);
  if (provider === "gemini") return callGemini(prompt, maxTokens, env);
  if (provider === "deepseek") return callDeepSeek(prompt, maxTokens, env);
  if (provider === "openai") return callOpenAI(prompt, maxTokens, env);
  if (provider === "avalai") return callAvalAI(prompt, maxTokens, env);
  throw new Error(`Unknown provider "${provider}"`);
}

// --- Hugging Face ------------------------------------------------------------
// api-inference.huggingface.co was retired — HF now routes every model
// through router.huggingface.co with an OpenAI-compatible chat endpoint.
async function callHuggingFace(prompt, maxTokens, env) {
  const key = env.HF_API_KEY;
  if (!key) throw new Error("HF_API_KEY not set");
  const model = env.HF_MODEL || "google/gemma-2-2b-it";
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
async function callGemini(prompt, maxTokens, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = env.GEMINI_MODEL || "gemini-2.0-flash";
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
