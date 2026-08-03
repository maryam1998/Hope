// ---------------------------------------------------------------------------
// کتاب مکالمه — Backend proxy (deploy this folder to Render)
// ---------------------------------------------------------------------------
// The React app never talks to an AI provider directly. It only calls this
// server's POST /api/generate. This server holds the real API key (in
// Render's Environment tab, never committed to git) and forwards the prompt
// to whichever provider AI_PROVIDER points to.
//
// Default providers: DeepSeek and OpenAI (ChatGPT). Gemini is NOT used —
// intentionally removed since it's blocked/filtered in some countries.
//
// AI_PROVIDER controls which provider(s) to use and in what order:
//   - "deepseek"        → DeepSeek only
//   - "openai"          → OpenAI (ChatGPT) only
//   - "deepseek,openai" → try DeepSeek first, automatically fall back to
//                         OpenAI if the DeepSeek call fails or its key is
//                         missing (this is the default)
//   - "openai,deepseek" → try OpenAI first, fall back to DeepSeek
// ---------------------------------------------------------------------------
import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // fine to leave open — this endpoint has no user data, just prompt-in/text-out
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const VALID_PROVIDERS = ["deepseek", "openai"];
const AI_PROVIDER_CHAIN = (process.env.AI_PROVIDER || "deepseek,openai")
  .toLowerCase()
  .split(",")
  .map((p) => p.trim())
  .filter((p) => VALID_PROVIDERS.includes(p));

if (AI_PROVIDER_CHAIN.length === 0) {
  throw new Error(
    `AI_PROVIDER must contain "deepseek" and/or "openai" (got "${process.env.AI_PROVIDER}"). Gemini is no longer supported.`
  );
}

app.get("/", (req, res) => res.send("phrasebook backend is up"));
app.get("/health", (req, res) => res.json({ ok: true, providers: AI_PROVIDER_CHAIN }));

app.post("/api/generate", async (req, res) => {
  const { prompt, maxTokens } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt (string) is required" });
  }
  const capped = Math.min(Math.max(Number(maxTokens) || 1000, 1), 8192);

  const errors = [];
  for (const provider of AI_PROVIDER_CHAIN) {
    try {
      const text = await callProvider(provider, prompt, capped);
      return res.json({ text, provider });
    } catch (e) {
      console.error(`[${provider}] error:`, e.message);
      errors.push(`${provider}: ${e.message}`);
      // try the next provider in the chain, if any
    }
  }

  // every provider in the chain failed
  res.status(502).json({ error: errors.join(" | ") || "AI provider request failed" });
});

async function callProvider(provider, prompt, maxTokens) {
  if (provider === "openai") return callOpenAI(prompt, maxTokens);
  if (provider === "deepseek") return callDeepSeek(prompt, maxTokens);
  throw new Error(`Unknown AI provider "${provider}" — use deepseek or openai`);
}

// --- OpenAI / ChatGPT --------------------------------------------------
async function callOpenAI(prompt, maxTokens) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set on the server");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
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

// --- DeepSeek (OpenAI-compatible API) --------------------------------------
async function callDeepSeek(prompt, maxTokens) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set on the server");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
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

app.listen(PORT, () =>
  console.log(`phrasebook backend listening on :${PORT} (providers: ${AI_PROVIDER_CHAIN.join(" → ")})`)
);
