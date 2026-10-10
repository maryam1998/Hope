// موتور صدا و مدل‌های TTS آفلاین
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect } from "react";
import { refreshNativeTtsStatus } from "../../../nativeTts.js";
import { nativeWarm } from "../../../nativeTtsFast.js";
import { VOICE_ENGINE_EVENT, getVoiceEngine, setVoiceEngine } from "../../tts/ttsConfig.js";
import { ENGLISH_LANG_NAME, LANGUAGES } from "../../constants/languages.js";

// ---------------------------------------------------------------------------
// 🔊 بسته‌های صدای آفلاینِ باکیفیت (Piper) — فقط اندروید (BubblePlugin).
// تا وقتی بسته‌ی یه زبان دانلود نشده، همون صدای قبلی خونده می‌شه (TTS خودِ گوشی؛
// برای فارسی/عربی سرویسِ آنلاین). بعد از دانلود، همون زبان خودکار از بسته‌ی آفلاین
// می‌خونه — منطقش توی speakChunk/toggle (isNativeTtsReady) از قبل هست.
// ---------------------------------------------------------------------------
export function VoiceEngineSettings({ uiLang, colors }) {
  const en = uiLang === "en";
  const isNative = typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  const [pref, setPref] = useState(getVoiceEngine());
  useEffect(() => {
    const h = () => setPref(getVoiceEngine());
    window.addEventListener(VOICE_ENGINE_EVENT, h);
    return () => window.removeEventListener(VOICE_ENGINE_EVENT, h);
  }, []);
  if (!isNative) return null;
  const opts = [
    { id: "model", label: en ? "App voice (better quality)" : "صدای اپ (باکیفیت‌تر)" },
    { id: "phone", label: en ? "Phone's voice" : "صدای گوشی" },
  ];
  return (
    <div style={{ marginTop: 8, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
        🔈 {en ? "Reading voice" : "صدای خوانش"}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => { setVoiceEngine(o.id); setPref(o.id); }}
            style={{
              flex: 1,
              fontSize: 12.5,
              fontWeight: 700,
              padding: "9px 8px",
              borderRadius: 12,
              border: `1px solid ${colors.cardBorder}`,
              backgroundColor: pref === o.id ? colors.gold : "transparent",
              color: colors.ink,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: colors.inkSoft, lineHeight: 1.6, marginTop: 6 }}>
        {en
          ? "Choose whether texts are read with the app's own voice or the voice installed on your phone."
          : "انتخاب کن متن‌ها با صدای خودِ اپ خونده بشن یا با صدای نصب‌شده روی گوشی‌ت."}
      </p>
    </div>
  );
}
export function OfflineTtsModelSettings({ uiLang, colors }) {
  const en = uiLang === "en";
  const getPlugin = () =>
    (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin) || null;
  const isNative = () =>
    typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  // { fa: true/false (دانلود شده؟) } — فقط زبان‌هایی که بسته‌ی آفلاین دارن
  const [catalog, setCatalog] = useState({});
  // چند زبان می‌تونن هم‌زمان دانلود بشن: { fa: true, en: true }
  const [busyMap, setBusyMap] = useState({});
  // پیشرفتِ هر زبان: { fa: { b: بایت, t: کل (یا -1) } }
  const [progressMap, setProgressMap] = useState({});
  // بخشِ ناتمامِ دانلودشده (بایت) برای دکمه‌ی «ادامه»: { fa: 12345 }
  const [partialMap, setPartialMap] = useState({});
  // زبان‌هایی که «توقف» خوردن و منتظرِ بسته‌شدنِ دانلودن
  const [stoppingMap, setStoppingMap] = useState({});
  const [errorText, setErrorText] = useState("");

  const dropKey = (setter, l) => setter((p) => { const n = { ...p }; delete n[l]; return n; });

  const refresh = async () => {
    const plugin = getPlugin();
    if (!plugin || !plugin.getTtsCatalog) return;
    try {
      const r = await plugin.getTtsCatalog();
      const map = {};
      const partial = {};
      ((r && r.languages) || []).forEach((x) => {
        map[x.lang] = !!x.downloaded;
        if (x.partialBytes > 0) partial[x.lang] = x.partialBytes;
      });
      setCatalog(map);
      setPartialMap(partial);
      const busy = {};
      ((r && r.downloadingLangs) || []).forEach((l) => { busy[l] = true; });
      setBusyMap(busy);
      setStoppingMap((p) => {
        const n = {};
        Object.keys(p).forEach((l) => { if (busy[l]) n[l] = true; });
        return n;
      });
    } catch (e) {}
  };

  useEffect(() => {
    const plugin = getPlugin();
    if (!isNative() || !plugin || !plugin.getTtsCatalog) return;
    refresh();
    const subs = [
      plugin.addListener("ttsModelDownloadProgress", (d) => {
        if (!d || !d.lang) return;
        setProgressMap((p) => ({ ...p, [d.lang]: { b: d.bytes || 0, t: d.total || -1 } }));
      }),
      plugin.addListener("ttsModelDownloadDone", (d) => {
        const l = d && d.lang;
        if (l) {
          dropKey(setProgressMap, l);
          dropKey(setBusyMap, l);
          dropKey(setStoppingMap, l);
        }
        // کشِ وضعیتِ nativeTts رو همین الان تازه کن تا اولین تپ بعد از دانلود هم از بسته‌ی آفلاین بخونه
        try { refreshNativeTtsStatus(l); } catch (e) {}
        try { nativeWarm(l); } catch (e) {}
        refresh();
      }),
      plugin.addListener("ttsModelDownloadCancelled", (d) => {
        const l = d && d.lang;
        if (l) {
          dropKey(setBusyMap, l);
          dropKey(setStoppingMap, l);
        }
        refresh();
      }),
      plugin.addListener("ttsModelDownloadError", (d) => {
        const l = d && d.lang;
        if (l) {
          dropKey(setProgressMap, l);
          dropKey(setBusyMap, l);
          dropKey(setStoppingMap, l);
        }
        setErrorText((en ? "Download failed: " : "دانلود ناموفق بود: ") + (l ? l.toUpperCase() + " — " : "") + ((d && d.error) || ""));
        refresh();
      }),
    ];
    // وقتی کاربر از بیرونِ اپ برمی‌گرده، وضعیتِ دانلودهایی که پس‌زمینه انجام شدن رو تازه کن
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
        try { LANGUAGES.forEach((l) => refreshNativeTtsStatus(l.code)); } catch (e) {}
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      subs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {}));
    };
  }, []);

  const plugin = getPlugin();
  if (!isNative() || !plugin || !plugin.getTtsCatalog) return null;

  const startDownload = async (lang) => {
    setBusyMap((p) => ({ ...p, [lang]: true }));
    dropKey(setStoppingMap, lang);
    try {
      await plugin.downloadTtsModel({ lang });
    } catch (e) {
      setErrorText((en ? "Download failed: " : "دانلود ناموفق بود: ") + lang.toUpperCase() + " — " + ((e && e.message) || e));
      dropKey(setBusyMap, lang);
    }
  };
  const download = (lang) => { setErrorText(""); startDownload(lang); };
  // همه‌ی زبان‌هایی که هنوز دانلود نشدن (یا نصفه‌ان)، هم‌زمان شروع/ادامه پیدا می‌کنن
  const pendingLangs = Object.keys(catalog).filter((l) => !catalog[l] && !busyMap[l]);
  const busyLangs = Object.keys(busyMap).filter((l) => busyMap[l]);
  const downloadAll = () => {
    setErrorText("");
    pendingLangs.forEach((l) => { startDownload(l); });
  };
  // توقفِ یه دانلود (مثلِ دانلود منیجر): بخشِ دانلودشده می‌مونه و بعداً با «ادامه» از همون‌جا می‌ره
  const stopOne = async (lang) => {
    setStoppingMap((p) => ({ ...p, [lang]: true }));
    try { await plugin.cancelTtsDownload({ lang }); } catch (e) {}
    setTimeout(refresh, 800);
  };
  const stopAll = async () => {
    const m = {};
    busyLangs.forEach((l) => { m[l] = true; });
    setStoppingMap((p) => ({ ...p, ...m }));
    try { await plugin.cancelAllTtsDownloads(); } catch (e) {}
    setTimeout(refresh, 800);
  };
  const remove = async (lang) => {
    if (!confirm(en ? "Delete this voice pack?" : "بسته‌ی صدای این زبان حذف بشه؟")) return;
    try { await plugin.deleteTtsModel({ lang }); } catch (e) {}
    try { refreshNativeTtsStatus(lang); } catch (e) {}
    refresh();
  };
  const mbOf = (b) => Math.round((b || 0) / (1024 * 1024));
  const progressLabel = (lang) => {
    const pr = progressMap[lang];
    if (!pr) return "0 MB";
    if (pr.t > 0) return `${mbOf(pr.b)} / ${mbOf(pr.t)} MB`;
    return `${mbOf(pr.b)} MB`;
  };

  const small = { fontSize: 11, color: colors.inkSoft, lineHeight: 1.6 };
  const rowBtn = { fontSize: 11.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "5px 10px", flexShrink: 0 };

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
        🔊 {en ? "High-quality offline voices" : "صدای آفلاینِ باکیفیت"}
      </p>
      <p style={{ ...small, marginBottom: 8 }}>
        {en
          ? "Until a language's voice is downloaded, the phone's voice is used (Persian/Arabic use the online service). Once downloaded, that language is read with the offline pack — no internet needed. Each voice is roughly 60–110 MB; the first download also fetches a small shared data pack."
          : "تا وقتی صدای یه زبان دانلود نشده، همون صدای قبلی خونده می‌شه (TTS گوشی؛ برای فارسی و عربی سرویسِ آنلاین). بعد از دانلود، اون زبان بدونِ اینترنت و با بسته‌ی آفلاین خونده می‌شه. حجمِ هر صدا حدود ۶۰ تا ۱۱۰ مگابایته و دانلودِ اول یه بسته‌ی داده‌ی کوچیکِ مشترک هم می‌گیره."}
      </p>
      {pendingLangs.length > 0 && (
        <button
          onClick={downloadAll}
          style={{ ...rowBtn, width: "100%", marginBottom: 8, padding: "9px 10px", fontSize: 12.5 }}
        >
          📥 {en ? `Download all (${pendingLangs.length})` : `دانلودِ همه‌ی صداها (${pendingLangs.length})`}
        </button>
      )}
      {busyLangs.length > 0 && (
        <button
          onClick={stopAll}
          style={{ ...rowBtn, width: "100%", marginBottom: 8, padding: "9px 10px", fontSize: 12.5 }}
        >
          ⏹ {en ? `Stop all (${busyLangs.length})` : `توقفِ همه (${busyLangs.length})`}
        </button>
      )}
      {errorText ? (
        <p style={{ ...small, color: "#b00020", marginBottom: 8 }}>{errorText}</p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LANGUAGES.map((l) => {
          const has = Object.prototype.hasOwnProperty.call(catalog, l.code);
          const downloaded = has && catalog[l.code];
          const busy = !!busyMap[l.code];
          const name = en ? (ENGLISH_LANG_NAME[l.code] || l.code) : l.label;
          return (
            <div
              key={l.code}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "7px 10px" }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.ink }}>{name}</span>
              {!has ? (
                <span style={{ ...small, opacity: 0.8 }}>{en ? "Phone voice only" : "فقط صدای گوشی"}</span>
              ) : busy ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={small}>
                    {stoppingMap[l.code] ? (en ? "⏳ Stopping…" : "⏳ در حال توقف…") : `📥 ${progressLabel(l.code)}`}
                  </span>
                  {!stoppingMap[l.code] && (
                    <button onClick={() => stopOne(l.code)} style={rowBtn} aria-label={en ? "Stop" : "توقف"}>⏹</button>
                  )}
                </span>
              ) : downloaded ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={small}>✅ {en ? "Offline" : "آفلاین"}</span>
                  <button onClick={() => remove(l.code)} style={rowBtn}>🗑</button>
                </span>
              ) : (
                <button onClick={() => download(l.code)} style={rowBtn}>
                  {partialMap[l.code] > 0
                    ? `▶ ${en ? "Resume" : "ادامه"} (${mbOf(partialMap[l.code])} MB)`
                    : `📥 ${en ? "Download" : "دانلود"}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
