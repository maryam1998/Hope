// تنظیمات و پیام‌های TTS، موتور صدا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// پیامِ فارسی/عربی وقتی اینترنت نیست یا پخشِ آنلاین شکست خورد: راهِ حل = بسته‌ی آفلاین
export const TTS_NEED_MODEL_MSG = "اینترنت در دسترس نیست — بسته‌ی صدا را از تنظیمات دانلود کن تا بدون اینترنت هم بخواند";
export function ttsFailMsg(code) {
  return code === "fa" || code === "ar"
    ? TTS_NEED_MODEL_MSG
    : "پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن";
}
// 🔊 انتخابِ صدای خوانش (فقط اپ اندروید): "model" = صدای اصلیِ اپ (پیش‌فرض)،
// "phone" = TTS خودِ گوشی. توی localStorage نگه‌داشته می‌شه و با رویداد به UI خبر می‌دیم.
const VOICE_ENGINE_KEY = "voiceEnginePref";
export const VOICE_ENGINE_EVENT = "voice-engine-pref-changed";
export function getVoiceEngine() {
  try { return localStorage.getItem(VOICE_ENGINE_KEY) === "phone" ? "phone" : "model"; } catch (e) { return "model"; }
}
export function setVoiceEngine(v) {
  try { localStorage.setItem(VOICE_ENGINE_KEY, v === "phone" ? "phone" : "model"); } catch (e) {}
  try { window.dispatchEvent(new Event(VOICE_ENGINE_EVENT)); } catch (e) {}
}
// Locale codes used for browser text-to-speech per language.
export const TTS_LOCALE = {
  fa: "fa-IR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  ar: "ar-SA",
  tr: "tr-TR",
  zh: "zh-CN",
  ru: "ru-RU",
  it: "it-IT",
  ko: "ko-KR",
  ja: "ja-JP",
  hi: "hi-IN",
  ga: "ga-IE",
  uk: "uk-UA",
};
// نامِ صداهای Neural مایکروسافت (Edge Read Aloud / Azure) برای مسیرِ
// آنلاینِ جایگزین — این سرویس برخلافِ Google-Translate-TTS/StreamElements
// برای همه‌ی این زبون‌ها (از جمله فارسی/عربی/ایتالیایی/هندی/کره‌ای/روسی/
// ژاپنی که قبلاً بی‌صدا شکست می‌خوردن) صدای واقعی داره.
export const EDGE_TTS_VOICE = {
  fa: "fa-IR-DilaraNeural",
  en: "en-US-AriaNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
  fr: "fr-FR-DeniseNeural",
  ar: "ar-SA-ZariyahNeural",
  tr: "tr-TR-EmelNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ru: "ru-RU-SvetlanaNeural",
  it: "it-IT-ElsaNeural",
  ko: "ko-KR-SunHiNeural",
  ja: "ja-JP-NanamiNeural",
  hi: "hi-IN-SwaraNeural",
  ga: "ga-IE-OrlaNeural",
  uk: "uk-UA-PolinaNeural",
};
