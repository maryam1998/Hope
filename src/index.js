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

// Reads AI_PROVIDER (comma-separated, e.g. "huggingface,groq,gemini") and
// falls back through them in order — same behavior as the old Express
// server. Defaults to huggingface alone if not set.
const VALID_PROVIDERS = ["huggingface", "groq", "gemini", "deepseek", "openai", "avalai"];
function getProviderChain(env) {
  const raw = (env.AI_PROVIDER || "gemini,huggingface,groq").toLowerCase();
  const chain = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => VALID_PROVIDERS.includes(p));
  return chain.length ? chain : ["gemini"];
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
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `Hugging Face HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Hugging Face returned empty response");
  return text.trim();
}

// --- Groq (OpenAI-compatible) ------------------------------------------------
async function callGroq(prompt, maxTokens, env) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json();
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
  const data = await r.json();
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
  const data = await r.json();
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
  const data = await r.json();
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
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `AvalAI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("AvalAI returned empty response");
  return text;
}
