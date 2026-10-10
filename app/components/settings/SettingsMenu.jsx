// منوی تنظیمات
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { X, BookOpen, LogOut, Loader2, ChevronUp, ChevronDown, Menu, Palette, Type, Layers, Globe } from "lucide-react";
import { LINGOVA_CHARACTERS, LINGOVA_CHARACTER_KEYS } from "../../../LINGOVA_CHARACTERS.js";
import { CUSTOM_BG_ALLOWED_TYPES, deleteCustomBackground, getCustomBackground, saveCustomBackground } from "../../storage/customBackgroundDb.js";
import { APP_FONTS, APP_FONT_SIZES, APP_LANGUAGES, APP_THEMES, HIGHLIGHT_COLOR_PALETTE, colors, fontFa, fontLatin, swatchButtonStyle } from "../../ui/theme.js";
import { tr } from "../../ui/uiStrings.js";
import { PRIMARY_TAB_DEFAULT, SECONDARY_TAB_DEFAULT, SHOW_CUSTOM_BG_OPTIONS, SHOW_MASCOT_CHARACTER_OPTIONS, SHOW_MASCOT_OUTFIT_OPTIONS, SHOW_TAB_ORDER_OPTIONS, TAB_META, normalizeTabOrder } from "../../prefs/appPrefs.js";
import { loadTargetTextPrefs, saveTargetTextPrefs } from "../../prefs/textPrefs.js";
import { LINGOVA_OUTFITS, LINGOVA_OUTFIT_KEYS } from "../../mascot/lingovaConfig.js";
import { OfflineWordsModal } from "./OfflineWordsModal.jsx";
import { OfflineSpeechModelSettings, SongSttSettings, ensureOfflineSpeechModel } from "./OfflineSpeechSettings.jsx";
import { AudioSyncSettings } from "./AudioSyncSettings.jsx";
import { OfflineTtsModelSettings, VoiceEngineSettings } from "./VoiceSettings.jsx";

export function SettingsMenu({ appPrefs, setAppPrefs, user, onLogout, aiSettings, onCustomBgChange, targetOrder }) {
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  // زبان صدای ورودی برای ترجمه‌ی زنده (روی گوشی ذخیره می‌شه). پیش‌فرض: انگلیسی
  const [liveSrcLang, setLiveSrcLang] = useState(() => {
    try { return localStorage.getItem("liveSrcLang") || "en"; } catch (e) { return "en"; }
  });
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  // پس‌زمینه‌ی سفارشی — پیش‌نمایشِ خودِ همین پنل، مستقل از customBg بالای
  // App (که همون عکس رو برایِ نمایشِ واقعیِ پشتِ کلِ اپ می‌خونه).
  const [bgPreviewUrl, setBgPreviewUrl] = useState(null);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState("");
  const bgInputRef = useRef(null);
  useEffect(() => {
    let active = true;
    let url = null;
    getCustomBackground().then((record) => {
      if (!active) return;
      if (record && record.blob) {
        url = URL.createObjectURL(record.blob);
        setBgPreviewUrl(url);
      }
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  const uiLang = appPrefs.uiLang || "fa";
  const panelDir = APP_LANGUAGES[uiLang]?.dir || "rtl";
  const panelFont = uiLang === "en" ? fontLatin : fontFa;

  // 🎙 ترجمه‌ی زنده: ترجمه به *همه‌ی* زبان‌های مقصدی که کاربر بالای صفحه انتخاب کرده
  // (هر تعداد). اگه هنوز هیچ زبانی انتخاب نشده، زبان رابط (فارسی/انگلیسی).
  const liveTargets = (targetOrder && targetOrder.length) ? targetOrder : [uiLang === "en" ? "en" : "fa"];
  const liveTargetsKey = liveTargets.join(",");
  // حالت نمایش حباب: هر دو (متن + ترجمه) / فقط متن اصلی / فقط ترجمه
  const [liveDisplayMode, setLiveDisplayMode] = useState(() => {
    try { return localStorage.getItem("liveDisplayMode") || "both"; } catch (e) { return "both"; }
  });
  // هر بار زبان‌های مقصد، زبان صدا یا حالت نمایش عوض شد، به حبابِ در حال اجرا هم خبر بده
  useEffect(() => {
    try {
      const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
      if (!B) return;
      let src = "en";
      try { src = localStorage.getItem("liveSrcLang") || "en"; } catch (err) {}
      if (B.setLanguages) B.setLanguages({ sourceLang: src, targetLang: uiLang === "en" ? "en" : "fa", targetLangs: liveTargetsKey.split(",") });
      if (B.setDisplayMode) B.setDisplayMode({ mode: liveDisplayMode });
    } catch (err) {}
  }, [liveTargetsKey, liveDisplayMode, uiLang]);
  // اندازه/بولدِ متنِ زبان‌های مقصد (جدا از اندازه‌ی فونتِ کلیِ اپ بالا) —
  // در localStorage با کلیدِ خودش ذخیره می‌شه (نه appPrefs)، چون از یه
  // هوکِ سبکِ مشترک (useTargetTextPrefs) توسطِ خودِ ClickableSentence هم
  // خونده می‌شه.
  const [targetTextPrefs, setTargetTextPrefsState] = useState(loadTargetTextPrefs);
  const updateTargetTextPrefs = (patch) => {
    setTargetTextPrefsState((prev) => {
      const next = { ...prev, ...patch };
      saveTargetTextPrefs(next);
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const update = (key, value) => setAppPrefs((prev) => ({ ...prev, [key]: value }));

  // انتخابِ فایلِ عکسِ پس‌زمینه — فقط jpg/jpeg/png/gif قبول می‌شه، بعد تویِ
  // IndexedDB ذخیره می‌شه (نه localStorage، چون می‌تونه چند مگابایت باشه).
  const handleBgFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // تا انتخابِ دوباره‌ی همون فایل هم onChange رو دوباره بزنه
    if (!file) return;
    setBgError("");
    const looksLikeAllowedExt = /\.(jpe?g|png|gif)$/i.test(file.name || "");
    if (!CUSTOM_BG_ALLOWED_TYPES.includes(file.type) && !looksLikeAllowedExt) {
      setBgError(uiLang === "en" ? "Only JPG, PNG, and GIF images are supported." : "فقط فرمت‌هایِ JPG، PNG و GIF پشتیبانی می‌شن.");
      return;
    }
    const MAX_BYTES = 12 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setBgError(uiLang === "en" ? "This image is too large (max 12MB)." : "حجمِ این عکس زیاده (حداکثر ۱۲ مگابایت).");
      return;
    }
    setBgBusy(true);
    const ok = await saveCustomBackground(file, file.type);
    setBgBusy(false);
    if (!ok) {
      setBgError(uiLang === "en" ? "Couldn't save the image — try a smaller file." : "ذخیره‌ی عکس ناموفق بود — یه فایلِ کوچیک‌تر امتحان کن.");
      return;
    }
    setBgPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    update("customBgEnabled", true);
    onCustomBgChange?.();
  };

  const handleRemoveBg = async () => {
    setBgBusy(true);
    await deleteCustomBackground();
    setBgBusy(false);
    setBgPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    update("customBgEnabled", false);
    onCustomBgChange?.();
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={tr("settingsTitle", uiLang)}
        title={tr("settingsTitle", uiLang)}
        style={{ color: colors.goldSoft, display: "flex" }}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          dir={panelDir}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            width: 280,
            maxHeight: "70vh",
            overflowY: "auto",
            backgroundColor: colors.paper,
            color: colors.ink,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            zIndex: 50,
            fontFamily: panelFont,
          }}
        >
          {/* Account */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>{tr("account", uiLang)}</p>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.gold, color: colors.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || tr("guestUser", uiLang)}</p>
              <p style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: colors.rose, marginBottom: 16 }}
          >
            <LogOut size={14} /> {tr("logout", uiLang)}
          </button>

          {/* Software language */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} /> {tr("languageSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_LANGUAGES).map(([key, l]) => (
              <button
                key={key}
                onClick={() => update("uiLang", key)}
                aria-pressed={uiLang === key}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${uiLang === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: uiLang === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Theme */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Palette size={14} /> {tr("themeSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_THEMES).map(([key, th]) => (
              <button
                key={key}
                onClick={() => update("theme", key)}
                title={th.label[uiLang] || th.label.fa}
                aria-pressed={appPrefs.theme === key}
                style={swatchButtonStyle(th.swatch, appPrefs.theme === key)}
              />
            ))}
          </div>

          {SHOW_CUSTOM_BG_OPTIONS && (
          <>
          {/* Custom background */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🖼️</span> {uiLang === "en" ? "Custom background" : "پس‌زمینه‌ی سفارشی"}
          </p>
          <div style={{ marginBottom: 16 }}>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleBgFileChange}
              style={{ display: "none" }}
            />
            {bgPreviewUrl && (
              <div
                style={{
                  width: "100%",
                  height: 70,
                  borderRadius: 10,
                  marginBottom: 8,
                  backgroundImage: `url(${bgPreviewUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: `1px solid ${colors.cardBorder}`,
                  opacity: appPrefs.customBgEnabled ? 1 : 0.4,
                }}
              />
            )}
            <div className="flex items-center gap-2" style={{ marginBottom: bgPreviewUrl ? 8 : 0 }}>
              <button
                onClick={() => bgInputRef.current?.click()}
                disabled={bgBusy}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${colors.cardBorder}`,
                  backgroundColor: "white",
                  color: colors.ink,
                  opacity: bgBusy ? 0.6 : 1,
                }}
              >
                {bgBusy && <Loader2 size={12} className="spin" />}
                {bgPreviewUrl
                  ? (uiLang === "en" ? "Change photo" : "تغییرِ عکس")
                  : (uiLang === "en" ? "Upload photo" : "آپلودِ عکس")}
              </button>
              {bgPreviewUrl && (
                <button
                  onClick={handleRemoveBg}
                  disabled={bgBusy}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    border: "none",
                    background: "none",
                    color: colors.rose,
                    opacity: bgBusy ? 0.6 : 1,
                  }}
                >
                  {uiLang === "en" ? "Remove" : "حذف"}
                </button>
              )}
            </div>
            {bgPreviewUrl && (
              <label className="flex items-center gap-2" style={{ fontSize: 12, color: colors.ink, marginBottom: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!appPrefs.customBgEnabled}
                  onChange={(e) => update("customBgEnabled", e.target.checked)}
                />
                {uiLang === "en" ? "Show this background" : "این پس‌زمینه نمایش داده بشه"}
              </label>
            )}
            {bgPreviewUrl && appPrefs.customBgEnabled && (
              <div>
                <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 4 }}>
                  {uiLang === "en" ? "Photo visibility" : "میزانِ نمایانیِ عکس"}
                </p>
                <input
                  type="range"
                  min={15}
                  max={90}
                  value={appPrefs.customBgOpacity ?? 55}
                  onChange={(e) => update("customBgOpacity", Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            )}
            {bgError && <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{bgError}</p>}
            <p style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 6, opacity: 0.85 }}>
              {uiLang === "en" ? "JPG, PNG, and GIF are supported." : "فرمت‌هایِ JPG، PNG و GIF پشتیبانی می‌شن."}
            </p>
          </div>
          </>
          )}

          {/* Font family */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={14} /> {tr("fontSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_FONTS).map(([key, f]) => (
              <button
                key={key}
                onClick={() => update("font", key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${appPrefs.font === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: appPrefs.font === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {f.label[uiLang] || f.label.fa}
              </button>
            ))}
          </div>

          {/* Font size */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>{tr("fontSizeTitle", uiLang)}</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_FONT_SIZES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => update("fontSize", key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${appPrefs.fontSize === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: appPrefs.fontSize === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {s.label[uiLang] || s.label.fa}
              </button>
            ))}
          </div>

          {/* اندازه‌ی فونتِ زبان‌های مقصد — جدا از اندازه‌ی فونتِ کلیِ اپ
              بالا؛ فقط روی متنِ زبانِ خارجی/ترجمه (همون‌جاهایی که
              ClickableSentence رندرشون می‌کنه: تبِ داستان، مکالمات
              روزمره، لغات، و…) اثر می‌ذاره. با یه نوارِ پیمایشِ ساده
              (کم/زیاد) به‌جای دکمه‌های ثابت. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={14} /> {uiLang === "en" ? "Target-language font size" : "اندازه‌ی فونتِ زبان‌های مقصد"}
          </p>
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <button
              onClick={() => updateTargetTextPrefs({ scale: Math.max(70, (targetTextPrefs.scale || 100) - 10) })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1px solid ${colors.cardBorder}`,
                backgroundColor: "white",
                color: colors.ink,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-label={uiLang === "en" ? "Decrease" : "کم کردن"}
            >
              −
            </button>
            <input
              type="range"
              min={70}
              max={160}
              step={5}
              value={targetTextPrefs.scale || 100}
              onChange={(e) => updateTargetTextPrefs({ scale: Number(e.target.value) })}
              style={{ flex: 1, accentColor: colors.gold }}
            />
            <button
              onClick={() => updateTargetTextPrefs({ scale: Math.min(160, (targetTextPrefs.scale || 100) + 10) })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1px solid ${colors.cardBorder}`,
                backgroundColor: "white",
                color: colors.ink,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-label={uiLang === "en" ? "Increase" : "زیاد کردن"}
            >
              +
            </button>
            <span style={{ fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center" }}>
              {(targetTextPrefs.scale || 100).toLocaleString(uiLang === "en" ? "en-US" : "fa-IR")}٪
            </span>
          </div>

          {/* حالتِ بولدشدنِ متنِ زبانِ مقصد — می‌تونه فقط رویِ «متنِ اصلی»
              (زبانی که یاد می‌گیره)، فقط رویِ «ترجمه»، هر دو، یا هیچ‌کدوم
              اعمال بشه. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Bold target text" : "بولدشدنِ متنِ زبانِ مقصد"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {[
              ["none", uiLang === "en" ? "None" : "هیچ‌کدام"],
              ["text", uiLang === "en" ? "Original text" : "متن اصلی"],
              ["translation", uiLang === "en" ? "Translation" : "ترجمه"],
              ["both", uiLang === "en" ? "Both" : "هر دو (متن و ترجمه)"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => updateTargetTextPrefs({ bold: key })}
                aria-pressed={(targetTextPrefs.bold || "both") === key}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${(targetTextPrefs.bold || "both") === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: (targetTextPrefs.bold || "both") === key ? colors.goldSoft : "white",
                  color: colors.ink,
                  fontWeight: key === "none" ? 400 : 700,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar system for saved-story dates */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            📅 {tr("calendarSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {[
              ["gregorian", "calendarGregorian"],
              ["jalali", "calendarJalali"],
              ["both", "calendarBoth"],
            ].map(([key, labelKey]) => (
              <button
                key={key}
                onClick={() => update("calendarSystem", key)}
                aria-pressed={(appPrefs.calendarSystem || "jalali") === key}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${(appPrefs.calendarSystem || "jalali") === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: (appPrefs.calendarSystem || "jalali") === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {tr(labelKey, uiLang)}
              </button>
            ))}
          </div>

          {SHOW_TAB_ORDER_OPTIONS && (
          <>
          {/* شخصی‌سازیِ ترتیبِ تب‌ها — جابجایی فقط داخلِ هر گروه */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={14} /> {tr("tabsCustomizeTitle", uiLang)}
          </p>
          <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>{tr("tabsCustomizeHint", uiLang)}</p>
          {[["primary", "tabsGroupHeader", PRIMARY_TAB_DEFAULT], ["secondary", "tabsGroupBar", SECONDARY_TAB_DEFAULT]].map(([group, titleKey, defaults]) => {
            const order = normalizeTabOrder(appPrefs.tabOrder)[group];
            const move = (idx, dir) => {
              const j = idx + dir;
              if (j < 0 || j >= order.length) return;
              const next = order.slice();
              [next[idx], next[j]] = [next[j], next[idx]];
              update("tabOrder", { ...normalizeTabOrder(appPrefs.tabOrder), [group]: next });
            };
            return (
              <div key={group} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>{tr(titleKey, uiLang)}</p>
                <div className="flex flex-col gap-1">
                  {order.map((key, idx) => {
                    const meta = TAB_META[key];
                    const Icon = meta.icon;
                    const arrowStyle = (disabled) => ({
                      width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${colors.cardBorder}`, backgroundColor: "white", color: colors.ink, opacity: disabled ? 0.3 : 1,
                    });
                    return (
                      <div key={key} className="flex items-center justify-between" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "4px 8px", backgroundColor: "white" }}>
                        <span className="flex items-center gap-2" style={{ fontSize: 12, color: colors.ink }}>
                          <Icon size={14} /> {tr(meta.labelKey, uiLang)}
                        </span>
                        <span className="flex gap-1">
                          <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={tr("tabsMoveUp", uiLang)} title={tr("tabsMoveUp", uiLang)} style={arrowStyle(idx === 0)}>
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1} aria-label={tr("tabsMoveDown", uiLang)} title={tr("tabsMoveDown", uiLang)} style={arrowStyle(idx === order.length - 1)}>
                            <ChevronDown size={14} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => update("tabOrder", normalizeTabOrder(null))}
            style={{ fontSize: 12, padding: "5px 14px", borderRadius: 20, border: `1px solid ${colors.cardBorder}`, backgroundColor: "white", color: colors.ink, marginBottom: 16 }}
          >
            {tr("tabsResetOrder", uiLang)}
          </button>
          </>
          )}

          {/* رنگِ هایلایتِ خواندن — همون مارکری که موقع «خواندنِ خودکار»
              دورِ جمله/کلمه‌ی در‌حالِ‌خواندن کشیده می‌شه. یه پالتِ ثابت از
              رنگ‌های کم‌رنگ/بی‌حال (نه تند)، چون رنگ‌های پررنگ روی متنِ
              تیره خوندن رو خسته‌کننده می‌کنه. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Read-aloud highlight color" : "رنگ هایلایتِ خواندن"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {/* گزینه‌ی «بدون هایلایت»: کاربر می‌تونه انتخاب کنه که موقعِ
                خواندنِ خودکار، هیچ رنگی دورِ جمله/کلمه/پاراگرافِ در‌حالِ‌خواندن
                کشیده نشه — فقط متن با صدای بلند خونده بشه. */}
            <button
              onClick={() => update("highlightColor", "none")}
              aria-pressed={appPrefs.highlightColor === "none"}
              title={uiLang === "en" ? "No highlight" : "بدون هایلایت"}
              style={swatchButtonStyle("white", appPrefs.highlightColor === "none", 30)}
            >
              <X size={14} color={colors.inkSoft} />
            </button>
            {HIGHLIGHT_COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => update("highlightColor", hex)}
                aria-pressed={appPrefs.highlightColor === hex}
                title={hex}
                style={swatchButtonStyle(hex, appPrefs.highlightColor === hex, 30)}
              />
            ))}
          </div>

          {SHOW_MASCOT_CHARACTER_OPTIONS && (
          <>
          {/* کاراکترِ آدمک — «کلاسیک» همون آدمکِ اصلیِ کدنویسی‌شده‌ست (لباسش
              پایین‌تر قابلِ‌تغییره و راه‌رفتنش پا-به-پاست). بقیه‌ی گزینه‌ها
              تصویرِ آماده‌ن (یک‌تیکه، نه لایه‌لایه)، برایِ همین راه‌رفتنشون
              به‌جایِ تاب‌خوردنِ پا/دست جدا، یه چرخشِ نرم (موقعِ برگشت، نه
              پرشِ آنیِ آینه‌ای) رویِ یه لایه + یه واداکِ بالا-پایین/چپ-راست
              رویِ لایه‌ی دیگه‌ست (کلاسِ lingova-char-walk، پایین‌تر تویِ خودِ
              LingovaMascot). با زدنِ روی هرکدوم، همون لحظه در LingovaMascot
              اعمال می‌شه (mascotCharacter از appPrefs میاد). */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Mascot character" : "کاراکترِ آدمک"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {LINGOVA_CHARACTER_KEYS.map((key) => {
              const selected = (appPrefs.mascotCharacter || "classic") === key;
              const isClassic = key === "classic";
              const label = isClassic ? (uiLang === "en" ? "Classic" : "کلاسیک") : LINGOVA_CHARACTERS[key].label;
              return (
                <button
                  key={key}
                  onClick={() => update("mascotCharacter", key)}
                  aria-pressed={selected}
                  title={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    border: `1px solid ${selected ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selected ? colors.goldSoft : "white",
                    color: colors.ink,
                    width: 64,
                  }}
                >
                  {isClassic ? (
                    <span style={{ width: 30, height: 38, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <svg viewBox="0 0 30 38" width="26" height="33">
                        <circle cx="15" cy="8" r="5" fill={colors.gold} />
                        <rect x="12" y="13" width="6" height="12" rx="3" fill={colors.teal} />
                        <rect x="11.5" y="25" width="2.4" height="10" rx="1.2" fill={colors.ink} />
                        <rect x="16" y="25" width="2.4" height="10" rx="1.2" fill={colors.ink} />
                      </svg>
                    </span>
                  ) : (
                    <img src={LINGOVA_CHARACTERS[key].png} alt={label} style={{ width: 34, height: 34, objectFit: "contain" }} />
                  )}
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 58 }}>{label}</span>
                </button>
              );
            })}
          </div>
          </>
          )}

          {/* لباسِ آدمکِ Lingova — سه دست‌لباسِ آماده؛ هر دکمه با دو نقطه‌رنگ
              (پیراهن/شلوار) پیش‌نمایش داده می‌شه. گزینه‌ی «کلاسیک» از رنگِ
              تمِ فعلیِ اپ پیروی می‌کنه، دو تای دیگه رنگِ ثابت دارن. این بخش
              فقط وقتی معنی داره که کاراکترِ کلاسیک انتخاب باشه (بقیه‌ی
              کاراکترها تصویرِ آماده‌ان و لباسِ جداگانه ندارن). */}
          {SHOW_MASCOT_OUTFIT_OPTIONS && (appPrefs.mascotCharacter || "classic") === "classic" && (
          <>
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Mascot outfit" : "لباسِ آدمک"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {LINGOVA_OUTFIT_KEYS.map((key) => {
              const outfit = LINGOVA_OUTFITS[key];
              const shirtPreview = outfit.shirt || colors.teal;
              const pantsPreview = outfit.pants || colors.ink;
              const selected = (appPrefs.mascotOutfit || "classic") === key;
              const outfitLabelKeys = {
                classic: uiLang === "en" ? "Classic" : "کلاسیک",
                scout: uiLang === "en" ? "Scout" : "کاوشگر",
                royal: uiLang === "en" ? "Royal" : "درباری",
              };
              return (
                <button
                  key={key}
                  onClick={() => update("mascotOutfit", key)}
                  aria-pressed={selected}
                  title={outfitLabelKeys[key]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    border: `1px solid ${selected ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selected ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  <span style={{ display: "flex", gap: 2 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: shirtPreview, border: "1px solid rgba(0,0,0,.15)" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: pantsPreview, border: "1px solid rgba(0,0,0,.15)" }} />
                  </span>
                  {outfitLabelKeys[key]}
                </button>
              );
            })}
          </div>
          </>
          )}

          {/* نمایش/محوشدنِ آدمکِ متحرک — خاموش‌کردنش آدمک رو یهو حذف
              نمی‌کنه، با یه ترنزیشنِ نرمِ opacity محو می‌شه (به همین دلیل
              تویِ LingovaMascot با opacity کنترل می‌شه نه رندرِ شرطی). */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Walking mascot" : "آدمکِ متحرک"}
          </p>
          <div className="flex gap-2" style={{ marginBottom: 16 }}>
            {[
              { key: true, labelFa: "نمایش داده بشه", labelEn: "Show" },
              { key: false, labelFa: "محو بشه", labelEn: "Fade out" },
            ].map((opt) => {
              const selected = (appPrefs.mascotEnabled !== false) === opt.key;
              return (
                <button
                  key={String(opt.key)}
                  onClick={() => update("mascotEnabled", opt.key)}
                  aria-pressed={selected}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1px solid ${selected ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selected ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {uiLang === "en" ? opt.labelEn : opt.labelFa}
                </button>
              );
            })}
          </div>

          {/* «زبان‌های خواندن با صدای بلند» (پنلِ نصب بسته‌ی زبان) از تنظیمات
              حذف شد — به‌جاش، هر جا کاربر بخواد ترجمه‌ای رو با صدای بلند
              بشنوه که زبونش رو گوشی نصب نداره، خودِ دکمه‌ی 🔊 (SpeakButton)
              یه پیامِ کوچیکِ درجا نشون می‌ده (نه اینجا، توی تنظیمات). */}

          <VoiceEngineSettings uiLang={uiLang} colors={colors} />
          <OfflineTtsModelSettings uiLang={uiLang} colors={colors} />
          <AudioSyncSettings uiLang={uiLang} colors={colors} />

          {/* 🎙 ترجمه‌ی زنده‌ی صدا (فقط در اپ اندروید — حباب شناور) */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            🎙 {uiLang === "en" ? "Live audio translation" : "ترجمه‌ی زنده‌ی صدا"}
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            <span>{uiLang === "en" ? "Audio language" : "زبان صدا"}</span>
            <select
              value={liveSrcLang}
              onChange={(e) => {
                const v = e.target.value;
                setLiveSrcLang(v);
                try { localStorage.setItem("liveSrcLang", v); } catch (err) {}
                try {
                  const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
                  if (B && B.setLanguages) B.setLanguages({ sourceLang: v, targetLang: uiLang === "en" ? "en" : "fa", targetLangs: liveTargets });
                } catch (err) {}
              }}
              style={{ flex: 1, fontSize: 12.5, padding: "6px 8px", borderRadius: 10, border: `1px solid ${colors.cardBorder}`, backgroundColor: "white", color: colors.ink }}
            >
              {[["en", "English"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"], ["it", "Italiano"], ["tr", "Türkçe"], ["ar", "العربية"], ["ru", "Русский"], ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"], ["hi", "हिन्दी"], ["pt", "Português"], ["nl", "Nederlands"], ["ur", "اردو"], ["fa", "فارسی"]].map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </label>
          <OfflineSpeechModelSettings lang={liveSrcLang} uiLang={uiLang} colors={colors} />
          <SongSttSettings uiLang={uiLang} colors={colors} />
          <p style={{ fontSize: 11.5, color: colors.inkSoft, marginBottom: 6, lineHeight: 1.7 }}>
            {uiLang === "en"
              ? "Translates into your target languages. Earlier sentences stay in a scrollable history."
              : "ترجمه به زبان مقصد شما. جمله‌های قبلی در یک تاریخچه‌ی قابل‌اسکرول می‌مانند."}
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            <span>{uiLang === "en" ? "Show" : "نمایش"}</span>
            <select
              value={liveDisplayMode}
              onChange={(e) => {
                const v = e.target.value;
                setLiveDisplayMode(v);
                try { localStorage.setItem("liveDisplayMode", v); } catch (err) {}
              }}
              style={{ flex: 1, fontSize: 12.5, padding: "6px 8px", borderRadius: 10, border: `1px solid ${colors.cardBorder}`, backgroundColor: "white", color: colors.ink }}
            >
              <option value="both">{uiLang === "en" ? "Original + translations" : "متن اصلی + ترجمه‌ها"}</option>
              <option value="translation">{uiLang === "en" ? "Translations only" : "فقط ترجمه‌ها"}</option>
              <option value="original">{uiLang === "en" ? "Original only" : "فقط متن اصلی"}</option>
            </select>
          </label>
          <button
            onClick={async () => {
              try {
                const Cap = typeof window !== "undefined" ? window.Capacitor : undefined;
                if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) {
                  alert(uiLang === "en" ? "This feature only works in the Android app" : "این قابلیت فقط در نسخه‌ی اندروید کار می‌کنه");
                  return;
                }
                const bubble = Cap.Plugins && Cap.Plugins.BubblePlugin;
                if (!bubble) {
                  alert(uiLang === "en" ? "Bubble plugin not found in this app build" : "پلاگین حباب در این نسخه‌ی اپ پیدا نشد");
                  return;
                }
                const perm = await bubble.checkPermission();
                if (!perm || !perm.granted) {
                  await bubble.requestPermission();
                  alert(uiLang === "en" ? "Please grant the permission, then tap again" : "لطفاً مجوز رو بدید، بعد دوباره بزنید");
                  return;
                }
                // بسته‌ی آفلاینِ زبانِ صدا دانلود نشده؟ → دانلودِ خودکار + پیام (به‌جای تشخیصِ گفتارِ گوگل که صفحه رو قفل می‌کنه)
                if (!(await ensureOfflineSpeechModel(bubble, liveSrcLang, uiLang))) return;
                // targetLang = زبان رابط (fa یا en)، sourceLang = زبان صدایی که پخش می‌شه.
                // با sourceLang مشخص، حباب از مسیر سریع (تشخیص گفتار + ترجمه‌ی روی خود گوشی) استفاده می‌کنه.
                await bubble.showBubble({
                  targetLang: uiLang === "en" ? "en" : "fa",
                  targetLangs: liveTargets,
                  sourceLang: liveSrcLang,
                });
                if (bubble.setDisplayMode) bubble.setDisplayMode({ mode: liveDisplayMode });
              } catch (err) {
                alert((uiLang === "en" ? "Error: " : "خطا: ") + ((err && err.message) || err));
              }
            }}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.gold}`, backgroundColor: colors.goldSoft, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 }}
          >
            <span style={{ fontSize: 16 }}>🎙</span>
            {uiLang === "en" ? "Start live audio translation" : "شروع ترجمه‌ی زنده‌ی صدا"}
          </button>

          {/* 📺 زیرنویس زنده‌ی یوتیوب (فقط اندروید): ویدیوی در حال پخش در اپ یوتیوب تشخیص داده می‌شه،
              زیرنویسش یک‌جا گرفته می‌شه و جمله‌ی فعلی با زمان پخش، همراه ترجمه، توی همون حباب نشون داده می‌شه. */}
          <button
            onClick={async () => {
              try {
                const Cap = typeof window !== "undefined" ? window.Capacitor : undefined;
                if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) {
                  alert(uiLang === "en" ? "This feature only works in the Android app" : "این قابلیت فقط در نسخه‌ی اندروید کار می‌کنه");
                  return;
                }
                const bubble = Cap.Plugins && Cap.Plugins.BubblePlugin;
                if (!bubble || !bubble.ytSetEnabled) {
                  alert(uiLang === "en" ? "This app build does not include YouTube subtitles yet — please update the app" : "این نسخه‌ی اپ هنوز زیرنویس یوتیوب رو نداره — لطفاً اپ رو به‌روزرسانی کنید");
                  return;
                }
                const perm = await bubble.checkPermission();
                if (!perm || !perm.granted) {
                  await bubble.requestPermission();
                  alert(uiLang === "en" ? "Please grant the permission, then tap again" : "لطفاً مجوز رو بدید، بعد دوباره بزنید");
                  return;
                }
                // برای دیدنِ ویدیوی در حال پخشِ یوتیوب، اندروید «دسترسی به اعلان‌ها» رو لازم داره.
                const acc = await bubble.ytCheckAccess();
                if (!acc || !acc.granted) {
                  await bubble.ytRequestAccess();
                  alert(uiLang === "en"
                    ? "Turn on “Notification access” for this app, then come back and tap again. (If it is greyed out: App info → ⋮ → Allow restricted settings.)"
                    : "«دسترسی به اعلان‌ها» رو برای این اپ روشن کنید، بعد برگردید و دوباره بزنید. (اگه خاکستریه: اطلاعات اپ ← ⋮ ← Allow restricted settings)");
                  return;
                }
                // زیرنویسِ یوتیوب خودش بسته نمی‌خواد؛ ولی اگه بسته‌ی آفلاینِ زبان دانلود نشده، دانلودش خودکار شروع می‌شه و پیام می‌ده
                await ensureOfflineSpeechModel(bubble, liveSrcLang, uiLang);
                await bubble.showBubble({
                  targetLang: uiLang === "en" ? "en" : "fa",
                  targetLangs: liveTargets,
                  sourceLang: liveSrcLang,
                });
                if (bubble.setDisplayMode) bubble.setDisplayMode({ mode: liveDisplayMode });
                await bubble.ytSetEnabled({ enabled: true });
              } catch (err) {
                alert((uiLang === "en" ? "Error: " : "خطا: ") + ((err && err.message) || err));
              }
            }}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.gold}`, backgroundColor: colors.goldSoft, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 4 }}
          >
            <span style={{ fontSize: 16 }}>▶️</span>
            {uiLang === "en" ? "Start live YouTube subtitles" : "شروع زیرنویس زنده‌ی یوتیوب"}
          </button>
          <p style={{ fontSize: 11.5, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>
            {uiLang === "en"
              ? "Play a video in the YouTube app: its subtitles appear in the bubble, in sync with playback, with your selected translations. Language of the video = “Audio language” above. You can also toggle it with the ▶ button inside the bubble panel."
              : "یک ویدیو را در اپ یوتیوب پخش کنید: زیرنویسش هم‌زمان با پخش، همراه ترجمه‌های انتخابی شما، توی حباب نشان داده می‌شود. زبان ویدیو همان «زبان صدا» بالاست. با دکمه‌ی ▶ داخل پنل حباب هم می‌توانید روشن/خاموشش کنید."}
          </p>

          {/* Offline words download */}
          <button
            onClick={() => setOfflineModalOpen(true)}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%" }}
          >
            <BookOpen size={14} /> {tr("offlineDownload", uiLang)}
          </button>

        </div>
      )}

      <OfflineWordsModal open={offlineModalOpen} onClose={() => setOfflineModalOpen(false)} aiSettings={aiSettings} />
    </div>
  );
}
