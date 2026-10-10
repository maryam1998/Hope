// ترجیحات متن هدف و صدا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { useState, useEffect } from "react";

// تنظیماتِ نمایشِ متنِ زبان‌های مقصد — اندازه‌ی فونت (به‌صورتِ درصدِ
// مقیاس، با نوارِ پیمایشِ کم/زیاد در تنظیمات) و حالتِ بولدشدن (برای متنِ
// اصلی، ترجمه، هردو، یا هیچ‌کدوم). این جدا از «اندازه‌ی فونتِ کلیِ اپ»یِ
// APP_FONT_SIZES هست؛ فقط روی متن‌های زبانِ خارجی/ترجمه (که از
// ClickableSentence رد می‌شن) اثر می‌ذاره، نه رابط کاربریِ فارسیِ اپ.
const TARGET_TEXT_PREFS_KEY = "phrasebook-target-text-prefs-v1";
const TARGET_TEXT_PREFS_CHANGED_EVENT = "phrasebook:targetTextPrefsChanged";
const DEFAULT_TARGET_TEXT_PREFS = { scale: 100, bold: "both" }; // bold: "both" | "text" | "translation" | "none"
// ---------------------------------------------------------------------------
// ترجیحِ صدای هر زبان — کاربر توی تنظیمات می‌تونه از بینِ صداهایی که خودِ
// گوشی‌اش (سیستم‌عامل/مرورگر) براش نصب داره، یکی رو مشخص انتخاب کنه (به‌جای
// انتخابِ خودکارِ getBestVoice). با voiceURI ذخیره می‌شه چون یکتاست؛ فارسی
// اینجا نیست چون فارسی همیشه از مسیرِ آنلاینِ رایگان خونده می‌شه (پایین‌تر).
// ---------------------------------------------------------------------------
const VOICE_PREFS_KEY = "phrasebook-voice-prefs-v1";
export const VOICE_PREFS_CHANGED_EVENT = "phrasebook:voicePrefsChanged";
export function loadVoicePrefs() {
  try {
    const raw = window.localStorage.getItem(VOICE_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveVoicePrefs(prefs) {
  try {
    window.localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(VOICE_PREFS_CHANGED_EVENT));
  } catch {}
}
export function setVoicePrefForLang(langPrefix, voiceURI) {
  const prefs = loadVoicePrefs();
  if (voiceURI) prefs[langPrefix] = voiceURI;
  else delete prefs[langPrefix];
  saveVoicePrefs(prefs);
}
export function loadTargetTextPrefs() {
  try {
    const raw = window.localStorage.getItem(TARGET_TEXT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_TARGET_TEXT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TARGET_TEXT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_TARGET_TEXT_PREFS };
  }
}
export function saveTargetTextPrefs(prefs) {
  try {
    window.localStorage.setItem(TARGET_TEXT_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(TARGET_TEXT_PREFS_CHANGED_EVENT));
  } catch {}
}
// هوکِ کوچیکِ مشترک — هر جایی که متنِ زبانِ مقصد رندر می‌شه (اینجا: خودِ
// ClickableSentence) با همین هوک به تنظیماتِ بالا گوش می‌ده و بلافاصله
// با تغییرشون (مثلاً از تبِ تنظیمات) به‌روز می‌شه.
export function useTargetTextPrefs() {
  const [prefs, setPrefs] = useState(loadTargetTextPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(loadTargetTextPrefs());
    window.addEventListener(TARGET_TEXT_PREFS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TARGET_TEXT_PREFS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return prefs;
}
