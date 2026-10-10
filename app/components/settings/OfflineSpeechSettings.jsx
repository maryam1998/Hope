// مدل‌های گفتار آفلاین و Whisper
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "../../constants/languages.js";

// ---------------------------------------------------------------------------
// ⬇️ قبل از «ترجمه‌ی زنده‌ی صدا» / «زیرنویس یوتیوب»: اگه بسته‌ی آفلاینِ زبانِ صدا دانلود نشده،
// به‌جای رفتن سراغِ تشخیصِ گفتارِ گوگل (که صفحه رو قفل می‌کنه)، دانلودِ بسته خودکار شروع می‌شه
// و یه پیام به کاربر نشون داده می‌شه. true = می‌شه ادامه داد، false = باید اول بسته دانلود بشه.
// ---------------------------------------------------------------------------
export async function ensureOfflineSpeechModel(bubble, lang, uiLang) {
  const en = uiLang === "en";
  try {
    if (!bubble || !bubble.checkModelStatus || !bubble.downloadModel || !lang || lang === "auto") return true;
    const st = await bubble.checkModelStatus({ lang });
    if (!st) return true;
    const label = (LANGUAGES.find((l) => l.code === lang) || {}).label || lang.toUpperCase();
    const busyMsg = () => alert(en
      ? "Another speech pack is being downloaded right now. When it finishes, tap again."
      : "دانلودِ یک بسته‌ی دیگه در جریانه. بعد از تموم‌شدنش دوباره بزن.");
    const askMsg = (mb) => en
      ? `The offline speech pack for ${label} (~${mb} MB) is not downloaded yet. Download it now? (one-time)`
      : `بسته‌ی آفلاینِ تشخیص گفتارِ «${label}» (~${mb} مگابایت) هنوز دانلود نشده. الان دانلود بشه؟ (فقط یک بار)`;
    const startedMsg = () => alert(en
      ? "The download has started. Tap again when it finishes."
      : "دانلود شروع شد. بعد از تموم‌شدنش دوباره بزن.");

    // زبانی که بسته‌ی اختصاصی نداره (فارسی، عربی، ترکی و...) → فقط بسته‌ی آفلاین؛ بدون دانلودِ خودکار
    if (!st.supported) {
      if (!bubble.getWhisperStatus || !bubble.downloadWhisperModel) return true;
      const w = await bubble.getWhisperStatus();
      const wm = (w.models || []).find((x) => x.id === "small") || (w.models || []).find((x) => x.id === w.model);
      if (!wm) return true;
      if (w.engine === "whisper" && wm.downloaded) return true;
      if (w.downloading) { busyMsg(); return false; }
      if (wm.downloaded) {
        try { await bubble.setSttEngine({ engine: "whisper", model: wm.id }); } catch (e) {}
        return true;
      }
      if (!confirm(askMsg(wm.approxMb || 360))) return false;
      await bubble.downloadWhisperModel({ model: wm.id });
      startedMsg();
      return false;
    }

    if (st.downloaded) return true;
    if (st.downloading) { busyMsg(); return false; }
    if (!confirm(askMsg(({ en: 70, zh: 70, ko: 140, ru: 95, fr: 150, de: 150, es: 150 })[lang] || 100))) return false;
    await bubble.downloadModel({ lang });
    startedMsg();
    return false;
  } catch (e) {
    return true;
  }
}
// ---------------------------------------------------------------------------
// 🎙 بسته‌ی تشخیص گفتار آفلاین (فقط اندروید — BubblePlugin) — دانلود/حذف بسته‌ی
// زبانِ انتخاب‌شده برای «ترجمه‌ی زنده‌ی صدا». زبان از بیرون (liveSrcLang)
// می‌آد تا یه انتخابگرِ زبانِ تکراری توی تنظیمات نداشته باشیم.
// ---------------------------------------------------------------------------
function WhisperFallbackCard({ lang, uiLang, colors }) {
  const en = uiLang === "en";
  const getPlugin = () =>
    (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin) || null;
  const [st, setSt] = useState(null);
  const [progressMb, setProgressMb] = useState(0);
  const [stopping, setStopping] = useState(false);
  const wantOn = useRef(false);

  const refresh = async () => {
    const p = getPlugin();
    if (!p || !p.getWhisperStatus) return;
    try { setSt(await p.getWhisperStatus()); } catch (e) {}
  };
  // مدلِ پیشنهادی برای فارسی/عربی/ترکی: small (tiny و base برای این زبان‌ها ضعیف‌اند)
  const pick = (s) => ((s && s.models) || []).find((m) => m.id === "small") || ((s && s.models) || []).find((m) => m.id === (s && s.model));

  useEffect(() => {
    const p = getPlugin();
    if (!p || !p.getWhisperStatus) return;
    let alive = true;
    refresh();
    const subs = [
      p.addListener("whisperDownloadProgress", (d) => { if (alive) setProgressMb(Math.round(((d && d.bytes) || 0) / (1024 * 1024))); }),
      p.addListener("whisperDownloadDone", async () => {
        setProgressMb(0); setStopping(false);
        if (wantOn.current) {
          wantOn.current = false;
          try { const s = await p.getWhisperStatus(); const m = pick(s); if (m) await p.setSttEngine({ engine: "whisper", model: m.id }); } catch (e) {}
        }
        refresh();
      }),
      p.addListener("whisperDownloadError", (d) => {
        wantOn.current = false; setProgressMb(0); setStopping(false);
        if (!(d && d.cancelled)) alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + (d && d.error));
        refresh();
      }),
    ];
    return () => { alive = false; subs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {})); };
  }, []);

  useEffect(() => {
    if (!st || !st.downloading) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [st && st.downloading]);

  const p = getPlugin();
  if (!p || !p.getWhisperStatus || !st) return null;
  const cur = pick(st);
  if (!cur) return null;
  const active = st.engine === "whisper" && st.model === cur.id && !!cur.downloaded;
  const busy = !!st.downloading;
  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 };

  const enable = async () => { try { await p.setSttEngine({ engine: "whisper", model: cur.id }); } catch (e) {} refresh(); };
  const disable = async () => { try { await p.setSttEngine({ engine: "sherpa", model: cur.id }); } catch (e) {} refresh(); };
  const download = async () => {
    wantOn.current = true;
    setSt((s) => ({ ...s, downloading: true, activeModel: cur.id }));
    try { await p.downloadWhisperModel({ model: cur.id }); }
    catch (e) { wantOn.current = false; alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + ((e && e.message) || e)); refresh(); }
  };
  const cancel = async () => {
    wantOn.current = false; setStopping(true);
    try { await p.cancelWhisperDownload(); } catch (e) {}
    setTimeout(refresh, 800);
    setTimeout(() => { refresh(); setStopping(false); }, 3000);
  };

  const approx = cur.approxMb || 0;
  const have = Math.round((cur.partialBytes || 0) / (1024 * 1024));
  const remove = async () => {
    if (!confirm(en ? "Delete the offline pack?" : "بسته‌ی آفلاین حذف بشه؟")) return;
    try { await p.deleteWhisperModel({ model: cur.id }); } catch (e) {}
    try { await p.setSttEngine({ engine: "sherpa", model: cur.id }); } catch (e) {}
    refresh();
  };
  return (
    <div>
      <p style={note}>
        ℹ️ {en
          ? "For this language the offline pack is less accurate and slower than for languages with a dedicated pack. Text may appear a few seconds late and some words may be recognized incorrectly. We are working on improving it."
          : "برای این زبان، بسته‌ی آفلاین از زبان‌هایی که بسته‌ی اختصاصی دارند کم‌دقت‌تر و کندتر است. ممکن است متن چند ثانیه دیرتر بیاید و بعضی کلمات اشتباه تشخیص داده شوند. در حال بهبود آن هستیم."}
      </p>
      {active && (
        <div>
          <p style={note}>✅ {en ? "Pack downloaded and ready" : "بسته دانلود شده و آماده‌ست"}</p>
          <button onClick={remove} style={btn}>🗑 {en ? "Delete pack" : "حذف بسته"}</button>
        </div>
      )}
      {!active && cur.downloaded && !busy && (
        <button onClick={enable} style={btn}>✅ {en ? "Activate offline pack" : "فعال‌سازی بسته‌ی آفلاین"}</button>
      )}
      {!cur.downloaded && !busy && (
        <button onClick={download} style={btn}>
          📥 {have > 0
            ? (en ? `Resume download (${have} of ~${approx} MB done)` : `ادامه دانلود (${have} از ~${approx} مگابایت دانلود شده)`)
            : (en ? `Download offline pack (~${approx} MB, one-time)` : `دانلود بسته‌ی آفلاین (~${approx} مگابایت، فقط یک بار)`)}
        </button>
      )}
      {busy && (
        <div>
          <p style={note}>📥 {en ? "Downloading..." : "در حال دانلود..."} {progressMb} MB</p>
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (en ? "Stopping..." : "در حال توقف...") : (en ? "Stop (resume later)" : "توقف (بعداً ادامه می‌دهم)")}
          </button>
        </div>
      )}
    </div>
  );
}
export function OfflineSpeechModelSettings({ lang, uiLang, colors }) {
  const en = uiLang === "en";
  const getPlugin = () =>
    (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin) || null;
  const isNative = () =>
    typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  const [status, setStatus] = useState({ supported: false, downloaded: false, downloading: false });
  const [progressMb, setProgressMb] = useState(0);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const plugin = getPlugin();
    if (!isNative() || !plugin) return;
    let alive = true;

    const refresh = async () => {
      try {
        const r = await plugin.checkModelStatus({ lang });
        if (alive && r) setStatus((p) => (JSON.stringify(p) === JSON.stringify(r) ? p : r));
      } catch (e) {}
    };
    refresh();
    // وضعیتِ واقعیِ دانلود (مثلاً بعد از «توقف» یا دانلودِ خودکار) همیشه با نیتیو هماهنگ بمونه
    const pollId = setInterval(refresh, 3000);

    const subs = [
      plugin.addListener("modelDownloadProgress", (d) => {
        setProgressMb(Math.round((d.bytes || 0) / (1024 * 1024)));
      }),
      plugin.addListener("modelDownloadDone", () => {
        setProgressMb(0);
        setStopping(false);
        refresh();
      }),
      plugin.addListener("modelDownloadError", (d) => {
        if (!(d && d.cancelled)) alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + (d && d.error));
        setProgressMb(0);
        setStopping(false);
        refresh();
      }),
    ];

    return () => {
      alive = false;
      clearInterval(pollId);
      subs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {}));
    };
  }, [lang]);

  if (!isNative() || !getPlugin()) return null;

  const refreshNow = async () => {
    try { setStatus(await getPlugin().checkModelStatus({ lang })); } catch (e) {}
  };
  const download = async () => {
    setStatus((s) => ({ ...s, downloading: true }));
    try {
      await getPlugin().downloadModel({ lang });
    } catch (e) {
      alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + ((e && e.message) || e));
      setStatus((s) => ({ ...s, downloading: false }));
    }
  };
  const cancel = async () => {
    setStopping(true);
    try { await getPlugin().cancelModelDownload(); } catch (e) {}
    setTimeout(refreshNow, 800);
    setTimeout(() => { refreshNow(); setStopping(false); }, 3000);
  };
  const remove = async () => {
    if (!confirm(en ? "Delete the offline pack?" : "بسته‌ی آفلاین حذف بشه؟")) return;
    try { await getPlugin().deleteModel({ lang }); } catch (e) {}
    refreshNow();
  };

  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8 };

  return (
    <div>
      {!status.supported && (
        <WhisperFallbackCard lang={lang} uiLang={uiLang} colors={colors} />
      )}
      {status.supported && status.downloaded && (
        <div>
          <p style={note}>✅ {en ? "Pack downloaded and ready" : "بسته دانلود شده و آماده‌ست"}</p>
          <button onClick={remove} style={btn}>🗑 {en ? "Delete pack" : "حذف بسته"}</button>
        </div>
      )}
      {status.supported && !status.downloaded && !status.downloading && (
        <button onClick={download} style={btn}>
          📥 {(() => {
            // حجمِ تقریبیِ بسته‌ی هر زبان (مگابایت) — با SPECS ی SherpaModelManager.java هم‌خوان
            const mb = { en: 70, zh: 70, ko: 140, ru: 95, fr: 150, de: 150, es: 150 }[lang] || 100;
            const have = Math.round((status.partialBytes || 0) / (1024 * 1024));
            if (have > 0) {
              return en ? `Resume download (${have} of ~${mb} MB done)` : `ادامه دانلود (${have} از ~${mb} مگابایت دانلود شده)`;
            }
            return en ? `Download offline pack (~${mb} MB, one-time)` : `دانلود بسته‌ی آفلاین (~${mb} مگابایت، فقط یک بار)`;
          })()}
        </button>
      )}
      {status.downloading && (!status.activeLang || status.activeLang === lang) && (
        <div>
          <p style={note}>📥 {en ? "Downloading..." : "در حال دانلود..."} {progressMb} MB</p>
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (en ? "Stopping..." : "در حال توقف...") : (en ? "Stop (resume later)" : "توقف (بعداً ادامه می‌دهم)")}
          </button>
        </div>
      )}
      {status.downloading && status.activeLang && status.activeLang !== lang && (
        <p style={note}>📥 {en ? "Another language's pack is downloading..." : "دانلودِ بسته‌ی یک زبانِ دیگه در جریانه..."}</p>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// 🎵 حالت آهنگ — تشخیص گفتارِ آفلاین مخصوصِ آهنگ.
// بسته با دکمه‌ی کاربر دانلود می‌شه و روی خودِ گوشی اجرا می‌شه (بدون سرور).
// جریانی نیست: متن هر چند ثانیه یک‌جا می‌آد.
// ---------------------------------------------------------------------------
export function SongSttSettings({ uiLang, colors }) {
  const en = uiLang === "en";
  const getPlugin = () =>
    (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin) || null;
  const isNative = () =>
    typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  const [st, setSt] = useState({ engine: "sherpa", model: "base", models: [], downloading: false, activeModel: "" });
  const [progressMb, setProgressMb] = useState(0);
  const [stopping, setStopping] = useState(false);

  const refresh = async () => {
    const p = getPlugin();
    if (!p || !p.getWhisperStatus) return;
    try { setSt(await p.getWhisperStatus()); } catch (e) {}
  };

  useEffect(() => {
    const p = getPlugin();
    if (!isNative() || !p || !p.getWhisperStatus) return;
    let alive = true;
    refresh();
    const subs = [
      p.addListener("whisperDownloadProgress", (d) => { if (alive) setProgressMb(Math.round(((d && d.bytes) || 0) / (1024 * 1024))); }),
      p.addListener("whisperDownloadDone", () => { setProgressMb(0); setStopping(false); refresh(); }),
      p.addListener("whisperDownloadError", (d) => {
        setProgressMb(0);
        setStopping(false);
        if (!(d && d.cancelled)) alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + (d && d.error));
        refresh();
      }),
    ];
    return () => {
      alive = false;
      subs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {}));
    };
  }, []);

  // تا وقتی دانلود در جریانه، وضعیتِ واقعی رو هر چند ثانیه از نیتیو بگیر (تا بعد از «توقف» دکمه‌ها گیر نکنن)
  useEffect(() => {
    if (!st.downloading) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [st.downloading]);

  if (!isNative() || !getPlugin() || !getPlugin().getWhisperStatus) return null;

  const cur = (st.models || []).find((m) => m.id === st.model) || { downloaded: false, approxMb: 0 };
  const on = st.engine === "whisper";
  const busy = st.downloading;

  const setEngine = async (engine, model) => {
    try { await getPlugin().setSttEngine({ engine, model }); } catch (e) {}
    refresh();
  };
  const download = async () => {
    setSt((s) => ({ ...s, downloading: true, activeModel: s.model }));
    try { await getPlugin().downloadWhisperModel({ model: st.model }); }
    catch (e) { alert((en ? "Download failed: " : "دانلود ناموفق بود: ") + ((e && e.message) || e)); refresh(); }
  };
  const cancel = async () => {
    setStopping(true);
    try { await getPlugin().cancelWhisperDownload(); } catch (e) {}
    setTimeout(refresh, 800);
    setTimeout(() => { refresh(); setStopping(false); }, 3000);
  };
  const remove = async () => {
    if (!confirm(en ? "Delete the song pack?" : "بسته‌ی آهنگ حذف بشه؟")) return;
    try { await getPlugin().deleteWhisperModel({ model: st.model }); } catch (e) {}
    if (on) await setEngine("sherpa", st.model); else refresh();
  };

  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 };
  const names = { tiny: en ? "Fast" : "سریع", base: en ? "Balanced" : "متعادل", small: en ? "Accurate" : "دقیق‌تر" };
  const modelHints = {
    tiny: en ? "Fastest, lowest accuracy — older phones" : "سریع‌ترین و کم‌دقت‌تر؛ برای گوشی‌های ضعیف",
    base: en ? "Recommended — good speed and accuracy" : "پیشنهادی؛ تعادلِ خوبِ سرعت و دقت",
    small: en ? "Most accurate but slower — recent phones" : "دقیق‌ترین ولی کندتر؛ برای گوشی‌های جدید",
  };

  const active = on && !!cur.downloaded;
  const approx = cur.approxMb || 0;
  const pct = approx > 0 ? Math.min(99, Math.round((progressMb / approx) * 100)) : 0;
  const card = { border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, marginBottom: 10 };
  const badgeText = active ? (en ? "On" : "روشن") : cur.downloaded ? (en ? "Off" : "خاموش") : (en ? "Not installed" : "نصب نشده");

  return (
    <div style={{ marginTop: 6, marginBottom: 6 }}>
      {/* عنوان + وضعیت */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: colors.ink, margin: 0 }}>
          🎵 {en ? "Song mode (offline)" : "حالت آهنگ (آفلاین)"}
        </p>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
          color: active ? "#fff" : colors.inkSoft,
          backgroundColor: active ? colors.teal : "transparent",
          border: active ? `1px solid ${colors.teal}` : `1px solid ${colors.cardBorder}`,
        }}>{badgeText}</span>
      </div>

      {/* راهنما: چیست و کی روشنش کنم؟ */}
      <div style={{ ...card, backgroundColor: colors.paperDark }}>
        <p style={{ ...note, marginBottom: 8, color: colors.ink }}>
          {en
            ? "A special speech pack for songs and for speech over background music. While it is on, ALL live translation uses it."
            : "یک بسته‌ی مخصوصِ تشخیصِ آهنگ و صدایی که زیرِ موسیقی است. تا وقتی روشن باشد، «همه‌ی» ترجمه‌ی زنده با همین بسته انجام می‌شود."}
        </p>
        <p style={{ fontSize: 12, fontWeight: 800, color: colors.teal, margin: "0 0 2px" }}>
          ✅ {en ? "Turn it ON for" : "روشن کن وقتی"}
        </p>
        <p style={{ ...note, marginBottom: 8 }}>
          {en
            ? "listening to songs • voices over music • you don't know the audio language (Auto)"
            : "داری آهنگ گوش می‌دهی • صدا زیرِ موسیقی است • زبانِ صدا را نمی‌دانی (Auto)"}
        </p>
        <p style={{ fontSize: 12, fontWeight: 800, color: colors.rose, margin: "0 0 2px" }}>
          ⛔ {en ? "Leave it OFF for" : "خاموش بگذار برای"}
        </p>
        <p style={{ ...note, marginBottom: 6 }}>
          {en
            ? "talking, videos, reels, podcasts, classes — with it off the text appears word by word and faster."
            : "حرف زدن، فیلم، ریل، پادکست، کلاس — وقتی خاموش است متن کلمه‌به‌کلمه و سریع‌تر می‌آید."}
        </p>
        <p style={{ ...note, marginBottom: 0 }}>
          {en
            ? "On: text arrives in chunks every few seconds and gets refined; it uses more battery. Switch it off after the song."
            : "حالت روشن: متن هر چند ثانیه یک تکه می‌آید و دقیق‌تر می‌شود، باتریِ بیشتری مصرف می‌کند. بعد از آهنگ خاموشش کن."}
        </p>
      </div>

      {/* انتخابِ کیفیت */}
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, margin: "0 0 6px" }}>{en ? "Quality" : "کیفیت"}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {(st.models || []).map((m) => {
          const sel = m.id === st.model;
          return (
            <button
              key={m.id}
              disabled={busy}
              onClick={() => setEngine(on ? "whisper" : "sherpa", m.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
                textAlign: "start", padding: "9px 12px", borderRadius: 12, opacity: busy ? 0.6 : 1,
                border: sel ? `2px solid ${colors.gold}` : `1px solid ${colors.cardBorder}`,
                backgroundColor: "transparent", color: colors.ink,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>
                  {names[m.id] || m.id}{m.id === "base" ? (en ? "  ★ recommended" : "  ★ پیشنهادی") : ""}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: colors.inkSoft, marginTop: 2, lineHeight: 1.6 }}>
                  {modelHints[m.id] || ""}
                </span>
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.inkSoft, whiteSpace: "nowrap" }}>
                {m.downloaded ? "✅" : `~${m.approxMb} MB`}
              </span>
            </button>
          );
        })}
      </div>

      {/* دانلود */}
      {!cur.downloaded && !busy && (
        <button onClick={download} style={{ ...btn, color: "#fff", backgroundColor: colors.teal, border: `1px solid ${colors.teal}` }}>
          📥 {(() => {
            const have = Math.round((cur.partialBytes || 0) / (1024 * 1024));
            if (have > 0) {
              return en
                ? `Resume "${names[st.model] || st.model}" (${have} of ~${approx} MB done)`
                : `ادامه‌ی دانلودِ بسته‌ی «${names[st.model] || st.model}» (${have} از ~${approx} مگابایت دانلود شده)`;
            }
            return en ? `Download "${names[st.model] || st.model}" (~${approx} MB, one-time)` : `دانلودِ بسته‌ی «${names[st.model] || st.model}» (~${approx} مگابایت، فقط یک بار)`;
          })()}
        </button>
      )}
      {busy && (
        <div style={{ marginBottom: 8 }}>
          <p style={note}>📥 {en ? "Downloading..." : "در حال دانلود..."} {progressMb} MB{approx > 0 ? ` (~${pct}%)` : ""}</p>
          {approx > 0 && (
            <div style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardBorder, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.teal, transition: "width .3s" }} />
            </div>
          )}
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (en ? "Stopping..." : "در حال توقف...") : (en ? "Stop (resume later)" : "توقف (بعداً ادامه می‌دهم)")}
          </button>
        </div>
      )}

      {/* کلیدِ روشن/خاموش + حذف */}
      {cur.downloaded && (
        <div>
          <button
            role="switch"
            aria-checked={active}
            onClick={() => setEngine(active ? "sherpa" : "whisper", st.model)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
              textAlign: "start", padding: "10px 12px", borderRadius: 12, marginBottom: 8,
              border: active ? `2px solid ${colors.teal}` : `1px solid ${colors.cardBorder}`, backgroundColor: "transparent",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: colors.ink }}>
                {en ? "Use for songs / music" : "برای آهنگ و موسیقی استفاده کن"}
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: active ? colors.rose : colors.inkSoft, marginTop: 2, lineHeight: 1.6 }}>
                {active
                  ? (en ? "Now ON — for talk or videos switch it off." : "الان روشن است — برای حرف زدن و فیلم خاموشش کن.")
                  : (en ? "Off — normal word-by-word live translation." : "خاموش — ترجمه‌ی زنده‌ی معمولیِ کلمه‌به‌کلمه.")}
              </span>
            </span>
            <span aria-hidden="true" style={{ position: "relative", width: 44, height: 26, borderRadius: 13, flexShrink: 0, backgroundColor: active ? colors.teal : colors.cardBorder, transition: "background-color .15s" }}>
              <span style={{ position: "absolute", top: 3, insetInlineStart: active ? 21 : 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transition: "inset-inline-start .15s" }} />
            </span>
          </button>
          <button onClick={remove} style={{ ...btn, fontWeight: 600, color: colors.inkSoft }}>🗑 {en ? "Delete song pack" : "حذف بسته‌ی آهنگ"}</button>
        </div>
      )}
      <p style={{ ...note, marginBottom: 0 }}>
        {en
          ? "Tip: set the audio language above — it makes song recognition much more accurate. The accurate mode needs a recent phone."
          : "نکته: «زبان صدا» را بالا درست انتخاب کن؛ دقتِ تشخیصِ آهنگ خیلی بهتر می‌شود. حالتِ «دقیق‌تر» گوشیِ نسبتاً جدید می‌خواهد."}
      </p>
    </div>
  );
}
