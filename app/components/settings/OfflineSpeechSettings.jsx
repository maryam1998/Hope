// مدل‌های گفتار آفلاین و Whisper
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "../../constants/languages.js";
import { useTranslation } from "react-i18next";
import { t as tStatic } from "../../../i18nconfig.js";

// ---------------------------------------------------------------------------
// ⬇️ قبل از «ترجمه‌ی زنده‌ی صدا» / «زیرنویس یوتیوب»: اگه بسته‌ی آفلاینِ زبانِ صدا دانلود نشده،
// به‌جای رفتن سراغِ تشخیصِ گفتارِ گوگل (که صفحه رو قفل می‌کنه)، دانلودِ بسته خودکار شروع می‌شه
// و یه پیام به کاربر نشون داده می‌شه. true = می‌شه ادامه داد، false = باید اول بسته دانلود بشه.
// ---------------------------------------------------------------------------
export async function ensureOfflineSpeechModel(bubble, lang, uiLang) {
  const t = tStatic;
  try {
    if (!bubble || !bubble.checkModelStatus || !bubble.downloadModel || !lang || lang === "auto") return true;
    const st = await bubble.checkModelStatus({ lang });
    if (!st) return true;
    const faLabel = (LANGUAGES.find((l) => l.code === lang) || {}).label || lang.toUpperCase();
    const label = t(`lang_name_${lang}`, { defaultValue: faLabel });
    const busyMsg = () => alert(t("settings_speech_busy"));
    const askMsg = (mb) => t("settings_speech_ask", { label: label, mb: mb });
    const startedMsg = () => alert(t("settings_speech_started"));

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
  useTranslation(); // re-render when the UI language changes
  const t = tStatic;
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
        if (!(d && d.cancelled)) alert((t("settings_download_failed_prefix")) + (d && d.error));
        refresh();
      }),
    ];
    return () => { alive = false; subs.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {})); };
  }, []);

  useEffect(() => {
    if (!st || !st.downloading) return;
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
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
    catch (e) { wantOn.current = false; alert((t("settings_download_failed_prefix")) + ((e && e.message) || e)); refresh(); }
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
    if (!confirm(t("settings_pack_delete_confirm"))) return;
    try { await p.deleteWhisperModel({ model: cur.id }); } catch (e) {}
    try { await p.setSttEngine({ engine: "sherpa", model: cur.id }); } catch (e) {}
    refresh();
  };
  return (
    <div>
      <p style={note}>
        ℹ️ {t("settings_whisper_note")}
      </p>
      {active && (
        <div>
          <p style={note}>✅ {t("settings_pack_ready")}</p>
          <button onClick={remove} style={btn}>🗑 {t("settings_pack_delete")}</button>
        </div>
      )}
      {!active && cur.downloaded && !busy && (
        <button onClick={enable} style={btn}>✅ {t("settings_pack_activate")}</button>
      )}
      {!cur.downloaded && !busy && (
        <button onClick={download} style={btn}>
          📥 {have > 0
            ? (t("settings_pack_resume", { have: have, mb: approx }))
            : (t("settings_pack_download", { mb: approx }))}
        </button>
      )}
      {busy && (
        <div>
          <p style={note}>📥 {t("settings_pack_downloading")} {progressMb} MB</p>
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (t("settings_pack_stopping")) : (t("settings_pack_stop_resume"))}
          </button>
        </div>
      )}
    </div>
  );
}
export function OfflineSpeechModelSettings({ lang, uiLang, colors }) {
  useTranslation(); // re-render when the UI language changes
  const t = tStatic;
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
        if (!(d && d.cancelled)) alert((t("settings_download_failed_prefix")) + (d && d.error));
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
      alert((t("settings_download_failed_prefix")) + ((e && e.message) || e));
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
    if (!confirm(t("settings_pack_delete_confirm"))) return;
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
          <p style={note}>✅ {t("settings_pack_ready")}</p>
          <button onClick={remove} style={btn}>🗑 {t("settings_pack_delete")}</button>
        </div>
      )}
      {status.supported && !status.downloaded && !status.downloading && (
        <button onClick={download} style={btn}>
          📥 {(() => {
            // حجمِ تقریبیِ بسته‌ی هر زبان (مگابایت) — با SPECS ی SherpaModelManager.java هم‌خوان
            const mb = { en: 70, zh: 70, ko: 140, ru: 95, fr: 150, de: 150, es: 150 }[lang] || 100;
            const have = Math.round((status.partialBytes || 0) / (1024 * 1024));
            if (have > 0) {
              return t("settings_pack_resume", { have: have, mb: mb });
            }
            return t("settings_pack_download", { mb: mb });
          })()}
        </button>
      )}
      {status.downloading && (!status.activeLang || status.activeLang === lang) && (
        <div>
          <p style={note}>📥 {t("settings_pack_downloading")} {progressMb} MB</p>
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (t("settings_pack_stopping")) : (t("settings_pack_stop_resume"))}
          </button>
        </div>
      )}
      {status.downloading && status.activeLang && status.activeLang !== lang && (
        <p style={note}>📥 {t("settings_pack_other_downloading")}</p>
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
  useTranslation(); // re-render when the UI language changes
  const t = tStatic;
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
        if (!(d && d.cancelled)) alert((t("settings_download_failed_prefix")) + (d && d.error));
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
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
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
    catch (e) { alert((t("settings_download_failed_prefix")) + ((e && e.message) || e)); refresh(); }
  };
  const cancel = async () => {
    setStopping(true);
    try { await getPlugin().cancelWhisperDownload(); } catch (e) {}
    setTimeout(refresh, 800);
    setTimeout(() => { refresh(); setStopping(false); }, 3000);
  };
  const remove = async () => {
    if (!confirm(t("settings_song_delete_confirm"))) return;
    try { await getPlugin().deleteWhisperModel({ model: st.model }); } catch (e) {}
    if (on) await setEngine("sherpa", st.model); else refresh();
  };

  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 };
  const names = { tiny: t("settings_song_model_fast"), base: t("settings_song_model_balanced"), small: t("settings_song_model_accurate") };
  const modelHints = {
    tiny: t("settings_song_hint_fast"),
    base: t("settings_song_hint_balanced"),
    small: t("settings_song_hint_accurate"),
  };

  const active = on && !!cur.downloaded;
  const approx = cur.approxMb || 0;
  const pct = approx > 0 ? Math.min(99, Math.round((progressMb / approx) * 100)) : 0;
  const card = { border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, marginBottom: 10 };
  const badgeText = active ? (t("settings_on")) : cur.downloaded ? (t("settings_off")) : (t("settings_not_installed"));

  return (
    <div style={{ marginTop: 6, marginBottom: 6 }}>
      {/* عنوان + وضعیت */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: colors.ink, margin: 0 }}>
          🎵 {t("settings_song_title")}
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
          {t("settings_song_intro")}
        </p>
        <p style={{ fontSize: 12, fontWeight: 800, color: colors.teal, margin: "0 0 2px" }}>
          ✅ {t("settings_song_on_title")}
        </p>
        <p style={{ ...note, marginBottom: 8 }}>
          {t("settings_song_on_list")}
        </p>
        <p style={{ fontSize: 12, fontWeight: 800, color: colors.rose, margin: "0 0 2px" }}>
          ⛔ {t("settings_song_off_title")}
        </p>
        <p style={{ ...note, marginBottom: 6 }}>
          {t("settings_song_off_list")}
        </p>
        <p style={{ ...note, marginBottom: 0 }}>
          {t("settings_song_on_note")}
        </p>
      </div>

      {/* انتخابِ کیفیت */}
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, margin: "0 0 6px" }}>{t("settings_quality")}</p>
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
                  {names[m.id] || m.id}{m.id === "base" ? (("  " + t("settings_song_recommended_badge"))) : ""}
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
              return t("settings_song_resume", { name: names[st.model] || st.model, have: have, mb: approx });
            }
            return t("settings_song_download", { name: names[st.model] || st.model, mb: approx });
          })()}
        </button>
      )}
      {busy && (
        <div style={{ marginBottom: 8 }}>
          <p style={note}>📥 {t("settings_pack_downloading")} {progressMb} MB{approx > 0 ? ` (~${pct}%)` : ""}</p>
          {approx > 0 && (
            <div style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardBorder, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.teal, transition: "width .3s" }} />
            </div>
          )}
          <button onClick={cancel} disabled={stopping} style={{ ...btn, opacity: stopping ? 0.6 : 1 }}>
            ⏹ {stopping ? (t("settings_pack_stopping")) : (t("settings_pack_stop_resume"))}
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
                {t("settings_song_use")}
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: active ? colors.rose : colors.inkSoft, marginTop: 2, lineHeight: 1.6 }}>
                {active
                  ? (t("settings_song_now_on"))
                  : (t("settings_song_now_off"))}
              </span>
            </span>
            <span aria-hidden="true" style={{ position: "relative", width: 44, height: 26, borderRadius: 13, flexShrink: 0, backgroundColor: active ? colors.teal : colors.cardBorder, transition: "background-color .15s" }}>
              <span style={{ position: "absolute", top: 3, insetInlineStart: active ? 21 : 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transition: "inset-inline-start .15s" }} />
            </span>
          </button>
          <button onClick={remove} style={{ ...btn, fontWeight: 600, color: colors.inkSoft }}>🗑 {t("settings_song_delete")}</button>
        </div>
      )}
      <p style={{ ...note, marginBottom: 0 }}>
        {t("settings_song_tip")}
      </p>
    </div>
  );
}
