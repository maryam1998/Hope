// ---------------------------------------------------------------------------
// کتاب مکالمه — Backend proxy (Cloudflare Worker version)
// ---------------------------------------------------------------------------
// Same job as the old Express server.js, ported to Cloudflare Workers:
// the React app never talks to an AI provider directly. It only calls this
// Worker's POST /api/generate. The Worker holds the real API key (as a
// Cloudflare "secret", never committed to git) and forwards the prompt to
// whichever provider(s) AI_PROVIDER points to.
//
// Providers: AvalAI (OpenAI-compatible proxy — DeepSeek, OpenAI, etc. behind
// one key, useful if you can't get a direct DeepSeek/OpenAI key), DeepSeek
// (direct), and OpenAI/ChatGPT (direct). Gemini is NOT used — intentionally
// removed since it's blocked/filtered in some countries.
//
// AI_PROVIDER controls which provider(s) to use and in what order, e.g.:
//   - "avalai"                  → AvalAI only (default)
//   - "deepseek"                → DeepSeek direct only
//   - "openai"                  → OpenAI (ChatGPT) direct only
//   - "avalai,deepseek,openai"  → try AvalAI first, fall back to DeepSeek,
//                                 then OpenAI
// Set this in wrangler.toml under [vars], or as a secret if you'd rather
// not have it in plain text.
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = ["avalai", "deepseek", "openai"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // fine to leave open — this endpoint has no user data, just prompt-in/text-out
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function getProviderChain(env) {
  const chain = (env.AI_PROVIDER || "avalai")
    .toLowerCase()
    .split(",")
    .map((p) => p.trim())
    .filter((p) => VALID_PROVIDERS.includes(p));
  return chain.length ? chain : ["avalai"];
}

export default {
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
          // try the next provider in the chain, if any
        }
      }

      // every provider in the chain failed
      return json({ error: errors.join(" | ") || "AI provider request failed" }, 502);
    }

    return json({ error: "not found" }, 404);
  },
};

async function callProvider(provider, prompt, maxTokens, env) {
  if (provider === "avalai") return callAvalAI(prompt, maxTokens, env);
  if (provider === "openai") return callOpenAI(prompt, maxTokens, env);
  if (provider === "deepseek") return callDeepSeek(prompt, maxTokens, env);
  throw new Error(`Unknown AI provider "${provider}" — use avalai, deepseek, or openai`);
}

// --- AvalAI (OpenAI-compatible proxy — covers DeepSeek, OpenAI, etc. with
//     a single key; see https://docs.avalai.ir) --------------------------
async function callAvalAI(prompt, maxTokens, env) {
  const key = env.AVALAI_API_KEY;
  if (!key) throw new Error("AVALAI_API_KEY is not set (wrangler secret put AVALAI_API_KEY)");
  const model = env.AVALAI_MODEL || "deepseek-chat";
  const r = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `AvalAI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("AvalAI returned an empty response");
  return text;
}

// --- OpenAI / ChatGPT (direct) ------------------------------------------
async function callOpenAI(prompt, maxTokens, env) {
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set (wrangler secret put OPENAI_API_KEY)");
  const model = env.OPENAI_MODEL || "gpt-4o-mini";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}

// --- DeepSeek (direct, OpenAI-compatible API) ----------------------------
async function callDeepSeek(prompt, maxTokens, env) {
  const key = env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set (wrangler secret put DEEPSEEK_API_KEY)");
  const model = env.DEEPSEEK_MODEL || "deepseek-chat";
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `DeepSeek HTTP ${r.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("DeepSeek returned an empty response");
  return text;
}
