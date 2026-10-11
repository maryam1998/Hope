// گرفتنِ زیرنویسِ یوتیوب مستقیماً روی دستگاهِ کاربر (فقط داخلِ اپِ Capacitor).
// چرا فقط نیتیو؟ مرورگر اجازه‌ی تنظیمِ User-Agent/Origin/Cookie نمی‌ده و یوتیوب CORS نداره،
// ولی CapacitorHttp درخواست رو با پشته‌ی شبکه‌ی خودِ اندروید می‌فرسته (بدونِ CORS، با IPِ خودِ کاربر).
// روی وب (GitHub Pages / PWA) این ماژول کار نمی‌کنه و فراخوانی به Worker برمی‌گرده.

export function isNativeApp() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.CapacitorHttp);
  } catch {
    return false;
  }
}

async function nativeFetchText(url, { method = "GET", headers = {}, body } = {}, timeoutMs = 8000) {
  const http = window.Capacitor.Plugins.CapacitorHttp;
  const res = await http.request({
    url,
    method,
    headers,
    data: body,
    responseType: "text",
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs,
  });
  const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
  return { ok: res.status >= 200 && res.status < 300, status: res.status, text };
}

function ytErr(msg, noCaptions) {
  const e = new Error(msg);
  e.noCaptions = !!noCaptions;
  return e;
}

const YT_CLIENTS = {
  ANDROID: {
    id: "3", version: "20.10.38",
    ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
    client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, osName: "Android", osVersion: "11" },
  },
  ANDROID_VR: {
    id: "28", version: "1.62.27",
    ua: "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    client: { clientName: "ANDROID_VR", clientVersion: "1.62.27", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L" },
  },
  IOS: {
    id: "5", version: "20.10.4",
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
    client: { clientName: "IOS", clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" },
  },
};

function decodeXmlEntities(s) {
  let out = s;
  for (let i = 0; i < 2 && out.includes("&"); i++) {
    out = out
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  }
  return out;
}

function parseCaptionBody(text) {
  const t = text.trim();
  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      return (j.events || [])
        .filter((e) => e.segs && e.segs.length)
        .map((e) => ({
          start: Math.round(e.tStartMs || 0) / 1000,
          end: Math.round((e.tStartMs || 0) + (e.dDurationMs || 0)) / 1000,
          text: e.segs.map((s) => s.utf8 || "").join("").replace(/\n/g, " ").trim(),
        }))
        .filter((c) => c.text);
    } catch { /* می‌افتیم رو XML */ }
  }
  const out = [];
  const clean = (raw) => decodeXmlEntities(raw.replace(/<[^>]+>/g, "")).replace(/\n/g, " ").trim();
  let m;
  const v3 = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  while ((m = v3.exec(t))) {
    const st = parseInt(m[1], 10), du = m[2] ? parseInt(m[2], 10) : 0, tx = clean(m[3]);
    if (tx) out.push({ start: st / 1000, end: (st + du) / 1000, text: tx });
  }
  if (out.length) return out;
  const v1 = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = v1.exec(t))) {
    const st = parseFloat(m[1]), du = m[2] ? parseFloat(m[2]) : 0, tx = clean(m[3]);
    if (tx) out.push({ start: st, end: st + du, text: tx });
  }
  return out;
}

function pickCaptionTrack(tracks, wantLang) {
  const norm = (s) => (s || "").toLowerCase().split("-")[0];
  const want = norm(wantLang);
  if (want === "auto") {
    const asr = tracks.find((t) => t.kind === "asr");
    if (asr) {
      const spoken = norm(asr.languageCode);
      return tracks.find((t) => t.kind !== "asr" && norm(t.languageCode) === spoken) || asr;
    }
    return tracks.find((t) => t.kind !== "asr") || tracks[0];
  }
  return (
    tracks.find((t) => norm(t.languageCode) === want && t.kind !== "asr") ||
    tracks.find((t) => norm(t.languageCode) === want) ||
    tracks.find((t) => t.kind !== "asr") ||
    tracks[0]
  );
}

async function captionsFromPlayerResponse(data, label, ua, wantLang, videoId) {
  const status = data?.playabilityStatus?.status || "";
  if (status !== "OK") {
    const reason = String(data?.playabilityStatus?.reason || "").slice(0, 70);
    throw ytErr(`${label}: ${status || "no playability"}${reason ? ` (${reason})` : ""}`);
  }
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || !tracks.length) throw ytErr(`${label}: no caption tracks`, true);

  const track = pickCaptionTrack(tracks, wantLang);
  const clean = track.baseUrl.replace(/[&?]fmt=[^&]*/g, "");
  let cues = [];
  let why = "";
  for (const url of [`${clean}&fmt=json3`, clean]) {
    const r = await nativeFetchText(url, { headers: { "User-Agent": ua, "Accept-Language": "en-US,en;q=0.9" } });
    if (!r.ok) { why = `timedtext HTTP ${r.status}`; continue; }
    if (!r.text.trim()) { why = "timedtext empty"; continue; }
    cues = parseCaptionBody(r.text);
    if (cues.length) break;
    why = "timedtext unparsable";
  }
  if (!cues.length) throw ytErr(`${label}: ${why}`);
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

async function captionsViaClient(name, videoId, wantLang, delayMs) {
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  const c = YT_CLIENTS[name];
  const label = name.toLowerCase();
  const body = {
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    context: { client: { hl: "en", gl: "US", ...c.client } },
  };
  const r = await nativeFetchText("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": c.ua,
      "X-YouTube-Client-Name": c.id,
      "X-YouTube-Client-Version": c.version,
      Origin: "https://www.youtube.com",
      "Accept-Language": "en-US,en;q=0.9",
    },
    body,
  });
  if (!r.ok) throw ytErr(`${label}: player HTTP ${r.status}`);
  return captionsFromPlayerResponse(JSON.parse(r.text), label, c.ua, wantLang, videoId);
}

// کشِ درون‌حافظه‌ای (تا بسته‌شدنِ اپ) — فقط برای جلوگیری از درخواستِ تکراریِ همان ویدیو در یک نشست.
const memCache = new Map();

export async function fetchCaptionsOnDevice(videoId, wantLang = "auto") {
  const key = `${videoId}|${wantLang}`;
  if (memCache.has(key)) return memCache.get(key);
  const attempts = [
    captionsViaClient("ANDROID", videoId, wantLang, 0),
    captionsViaClient("ANDROID_VR", videoId, wantLang, 0),
    captionsViaClient("IOS", videoId, wantLang, 300),
  ];
  try {
    const result = await Promise.any(attempts);
    memCache.set(key, result);
    return result;
  } catch (agg) {
    const errs = (agg && agg.errors) || [agg];
    const noCaptions = errs.filter((e) => e && e.noCaptions).length >= 2;
    throw ytErr(
      noCaptions ? "no-captions" : errs.map((e) => (e && e.message) || String(e)).join(" · ").slice(0, 300),
      noCaptions
    );
  }
}
