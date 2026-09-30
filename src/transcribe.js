// Add this file next to your Worker entry, then:
//   import { handleTranscribe } from "./transcribe.js";
// and in your fetch() router, BEFORE your other routes:
//   if (url.pathname === "/api/transcribe") return handleTranscribe(request, env);
//
// wrangler.toml needs the Workers AI binding:
//   [ai]
//   binding = "AI"
// (wrangler.jsonc:  "ai": { "binding": "AI" })

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

function toBase64(bytes) {
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
}

export async function handleTranscribe(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const buf = await request.arrayBuffer();
    if (buf.byteLength < 2000) return json({ text: "" });
    if (buf.byteLength > 4 * 1024 * 1024) return json({ error: "audio too large" }, 413);

    const lang = new URL(request.url).searchParams.get("lang");
    const input = { audio: toBase64(new Uint8Array(buf)), task: "transcribe", vad_filter: true };
    if (lang && lang !== "auto") input.language = lang;

    const out = await env.AI.run("@cf/openai/whisper-large-v3-turbo", input);
    return json({
      text: (out && out.text ? out.text : "").trim(),
      language: out && out.transcription_info ? out.transcription_info.language : undefined,
    });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
}
