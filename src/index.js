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
const VALID_PROVIDERS = ["huggingface", "groq", "gemini", "deepseek", "openai", "avalai", "grok", "openrouter", "mistral", "cerebras"];
function getProviderChain(env) {
  // Gemini is geo-blocked by Google itself for requests from Iran-adjacent
  // Cloudflare edge locations ("User location is not supported for the API
  // use") — this happens on Cloudflare's own network, completely
  // independent of any VPN on the phone/computer using the app (the phone's
  // VPN only affects the connection TO the Worker, not the Worker's own
  // outbound call FROM Cloudflare's servers TO Google). Hugging Face's
  // router has also been consistently unreachable (Cloudflare error 1016 —
  // likely blocked/broken for the same region-based reason).
  // Default chain now leads with the providers the app owner actually holds
  // API keys for (openrouter/mistral/groq/gemini/cerebras) — set
  // OPENROUTER_API_KEY, MISTRAL_API_KEY, GROQ_API_KEY, GEMINI_API_KEY,
  // CEREBRAS_API_KEY (and/or GROK_API_KEY) in the Worker's environment
  // variables (wrangler.toml / dashboard → Settings → Variables) for these
  // to actually work; any provider whose key isn't set is skipped
  // automatically and the chain moves on to the next one.
  const raw = (env.AI_PROVIDER || "openrouter,mistral,groq,gemini,cerebras,grok,huggingface").toLowerCase();
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
// replacement (openai/gpt-oss-20b if you want the smaller/faster one).
//
// GROQ_MODEL می‌تونه چند مدل، جدا شده با کاما، داشته باشه (مثلاً
// "openai/gpt-oss-120b,openai/gpt-oss-20b,llama-3.3-70b-versatile") — هر
// درخواست، مدل‌ها رو دقیقاً به همین ترتیب امتحان می‌کنه؛ اگه یکی خطا داد
// (مثلاً rate limit یا هر خطای دیگه‌ای)، بلافاصله سراغ مدلِ بعدیِ همین
// لیست می‌ره، نه اینکه مستقیم بره سراغِ provider بعدی (openrouter/mistral و
// غیره) توی زنجیره‌ی اصلی. فقط وقتی همه‌ی مدل‌های این لیست هم شکست
// بخورن، به provider بعدیِ زنجیره‌ی اصلی می‌رسیم.
function groqModelList(env) {
  const raw = env.GROQ_MODEL || "openai/gpt-oss-120b";
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

async function callGroqModel(model, prompt, maxTokens, key) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
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

async function callGroq(prompt, maxTokens, env) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const models = groqModelList(env);
  const errors = [];
  for (const model of models) {
    try {
      return await callGroqModel(model, prompt, maxTokens, key);
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  throw new Error(errors.join(" | ") || "Groq: no models configured");
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
