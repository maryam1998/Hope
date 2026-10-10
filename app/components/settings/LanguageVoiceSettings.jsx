// تنظیمات زبان و صدا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect, useMemo } from "react";
import { LANGUAGES } from "../../constants/languages.js";
import { tr } from "../../ui/uiStrings.js";
import { VOICE_PREFS_CHANGED_EVENT, loadVoicePrefs, setVoicePrefForLang } from "../../prefs/textPrefs.js";

// ---------------------------------------------------------------------------
// بخشِ «زبان‌های خواندن با صدای بلند» توی تنظیمات — به کاربر نشون می‌ده
// گوشی‌اش برای هر زبون صدای نصب‌شده داره یا نه، اجازه می‌ده از بینِ
// صداهای نصب‌شده یکی رو انتخاب کنه، و یه دکمه‌ی «نصب بسته‌های زبان» داره که
// سعی می‌کنه (فقط در اندروید) مستقیم صفحه‌ی تنظیماتِ گوشی رو باز کنه؛ در
// غیرِ این‌صورت (iOS/دسکتاپ، یا اگه بازکردنِ خودکار جواب نداد) یه راهنمای
// متنیِ کوتاه نشون می‌ده. فارسی این‌جا نیست، چون همیشه از مسیرِ آنلاینِ
// رایگان (بالاتر، onlineTtsProviders) پخش می‌شه و نیازی به نصب نداره.
// ---------------------------------------------------------------------------
function detectPlatform() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}
function openLanguagePackSettings(platform) {
  if (platform === "android") {
    // این intent-uri فقط داخلِ کروم/اندروید کار می‌کنه؛ روی مرورگرها/
    // دستگاه‌های دیگه بی‌اثره (بی‌خطر) و کاربر راهنمای متنی رو می‌بینه.
    try {
      window.location.href =
        "intent://#Intent;action=com.android.settings.TTS_SETTINGS;end";
    } catch (e) {}
  }
}
function LanguageVoiceSettings({ uiLang, colors }) {
  const [voices, setVoices] = useState(() =>
    typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  );
  const [voicePrefs, setVoicePrefsState] = useState(loadVoicePrefs);
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    const refresh = () => setVoicePrefsState(loadVoicePrefs());
    window.addEventListener(VOICE_PREFS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(VOICE_PREFS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const installSteps =
    platform === "android" ? tr("androidInstallSteps", uiLang) : platform === "ios" ? tr("iosInstallSteps", uiLang) : tr("desktopInstallSteps", uiLang);

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        🔊 {tr("voiceSectionTitle", uiLang)}
      </p>

      <button
        onClick={() => openLanguagePackSettings(platform)}
        className="flex items-center gap-2"
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: colors.ink,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: "9px 12px",
          width: "100%",
          marginBottom: 6,
        }}
      >
        📥 {tr("installLanguagePacks", uiLang)}
      </button>
      <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 6, lineHeight: 1.6 }}>{tr("installLanguagePacksHint", uiLang)}</p>
      <p style={{ fontSize: 10.5, color: colors.inkSoft, marginBottom: 12, lineHeight: 1.6, opacity: 0.85 }}>{installSteps}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
        {LANGUAGES.filter((l) => l.code !== "fa").map((l) => {
          const matches = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(l.code));
          const hasVoices = matches.length > 0;
          const currentURI = voicePrefs[l.code] || "";
          return (
            <div
              key={l.code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "7px 10px",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.ink, flexShrink: 0 }}>{l.label}</span>
              {hasVoices ? (
                <select
                  value={currentURI}
                  onChange={(e) => setVoicePrefForLang(l.code, e.target.value || null)}
                  style={{
                    fontSize: 11.5,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 8,
                    padding: "4px 6px",
                    color: colors.ink,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <option value="">{tr("voiceAutoOption", uiLang)}</option>
                  {matches.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 11, color: colors.inkSoft, opacity: 0.8 }}>{tr("voiceNotInstalled", uiLang)}</span>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 6, lineHeight: 1.6, opacity: 0.85 }}>🌐 {tr("persianVoiceNote", uiLang)}</p>
    </div>
  );
}
