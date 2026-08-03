// ---------------------------------------------------------------------------
// کتاب مکالمه — Backend proxy
// ---------------------------------------------------------------------------
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const AI_PROVIDER_CHAIN = (process.env.AI_PROVIDER || "deepseek,openai")
  .toLowerCase()
  .split(",")
  .map((p) => p.trim())
  .filter((p) => ["deepseek", "openai"].includes(p));

if (AI_PROVIDER_CHAIN.length === 0) {
  console.warn("No valid AI provider, defaulting to deepseek");
  AI_PROVIDER_CHAIN.push("deepseek");
}

app.get("/", (req, res) => res.send("Phrasebook backend is running"));
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
      console.log(`Trying ${provider}...`);
      const text = await callProvider(provider, prompt, capped);
      console.log(`${provider} succeeded`);
      return res.json({ text, provider });
    } catch (e) {
      console.error(`${provider} failed:`, e.message);
      errors.push(`${provider}: ${e.message}`);
    }
  }
  res.status(502).json({ error: errors.join(" | ") });
});

async function callProvider(provider, prompt, maxTokens) {
  if (provider === "openai") return callOpenAI(prompt, maxTokens);
  if (provider === "deepseek") return callDeepSeek(prompt, maxTokens);
  throw new Error(`Unknown provider "${provider}"`);
}

async function callOpenAI(prompt, maxTokens) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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

async function callDeepSeek(prompt, maxTokens) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
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

app.listen(PORT, () =>
  console.log(`Backend running on :${PORT} (providers: ${AI_PROVIDER_CHAIN.join(" -> ")})`)
);
