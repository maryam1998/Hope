var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// فقط از این دو سرویس استفاده می‌کنیم
var VALID_PROVIDERS = ["groq", "huggingface"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
__name(json, "json");

function getProviderChain(env) {
  const chain = (env.AI_PROVIDER || "groq").toLowerCase().split(",").map((p) => p.trim()).filter((p) => VALID_PROVIDERS.includes(p));
  return chain.length ? chain : ["groq"];
}
__name(getProviderChain, "getProviderChain");

var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("phrasebook backend is up", { headers: corsHeaders() });
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, providers: getProviderChain(env) });
    }
    if (url.pathname === "/api/generate" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "request body must be valid JSON" }, 400);
      }
      const { prompt, maxTokens } = body || {};
      if (!prompt || typeof prompt !== "string") {
        return json({ error: "prompt (string) is required" }, 400);
      }
      const capped = Math.min(Math.max(Number(maxTokens) || 1000, 1), 8192);
      const errors = [];
      for (const provider of getProviderChain(env)) {
        try {
          const text = await callProvider(provider, prompt, capped, env);
          return json({ text, provider });
        } catch (e) {
          console.error(`[${provider}] error:`, e.message);
          errors.push(`${provider}: ${e.message}`);
        }
      }
      return json({ error: errors.join(" | ") || "AI provider request failed" }, 502);
    }
    return json({ error: "not found" }, 404);
  }
};

async function callProvider(provider, prompt, maxTokens, env) {
  if (provider === "groq") return callGroq(prompt, maxTokens, env);
  if (provider === "huggingface") return callHuggingFace(prompt, maxTokens, env);
  throw new Error(`Unknown AI provider "${provider}" — use groq or huggingface`);
}
__name(callProvider, "callProvider");

// --- تابع Groq ---
async function callGroq(prompt, maxTokens, env) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set (wrangler secret put GROQ_API_KEY)");
  const model = env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Groq HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Groq returned an empty response");
  return text;
}
__name(callGroq, "callGroq");

// --- تابع Hugging Face ---
async function callHuggingFace(prompt, maxTokens, env) {
  const key = env.HF_API_KEY;
  if (!key) throw new Error("HF_API_KEY is not set (wrangler secret put HF_API_KEY)");
  const model = env.HF_MODEL || "meta-llama/Llama-2-7b-chat-hf";
  const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HuggingFace HTTP ${r.status}`);
  const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
  return text || "";
}
__name(callHuggingFace, "callHuggingFace");

export {
  index_default as default
};

