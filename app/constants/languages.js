// زبان‌ها، کدها و تشخیص زبان/سطح متن
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { splitTextIntoSentenceStrings } from "../story/storyText.js";

// نگاشتِ نام‌ها/کدهایِ متفرقه‌ای که ممکنه به‌جایِ کدِ دو-حرفیِ استانداردِ
// خودِ اپ (همون چیزی که LANGUAGES بالاتر ازش استفاده می‌کنه، مثلاً "en"،
// "fa") به توابعِ TTS داده بشه — مثلاً یه لوکیلِ کامل ("en-US"، "en_GB")،
// یا اسمِ خودِ زبون به انگلیسی/فارسی ("English"، "Persian"، "Farsi").
// این صرفاً یه لایه‌ی دفاعی/محکم‌کاریه (طبقِ درخواستِ صریح) — کدهایِ
// داخلیِ خودِ اپ همیشه از قبل همون کدِ دو-حرفیِ تمیزن، پس این نگاشت هیچ
// رفتارِ فعلی‌ای رو عوض نمی‌کنه، فقط جلویِ یه ورودیِ غیرمنتظره رو می‌گیره.
const LANG_CODE_ALIASES = {
  english: "en",
  persian: "fa",
  farsi: "fa",
  spanish: "es",
  german: "de",
  french: "fr",
  arabic: "ar",
  turkish: "tr",
  chinese: "zh",
  mandarin: "zh",
  russian: "ru",
  italian: "it",
  korean: "ko",
  japanese: "ja",
  hindi: "hi",
  irish: "ga",
  ukrainian: "uk",
};
// کدِ زبونِ ورودی (هر شکلی که باشه: "en"، "en-US"، "en_GB"، "English"، ...)
// رو به همون کدِ دو-حرفیِ استانداردِ داخلیِ اپ نرمالایز می‌کنه — فقط برایِ
// انتخابِ لوکیل/صدا استفاده می‌شه؛ به بقیه‌ی اپ (که همه‌جا از کدهایِ
// LANGUAGES استفاده می‌کنه) هیچ کاری نداره.
export function normalizeLangCode(code) {
  if (!code) return "en";
  const raw = String(code).trim().toLowerCase().replace(/_/g, "-");
  if (TTS_LOCALE[raw]) return raw;
  const prefix = raw.split("-")[0];
  if (TTS_LOCALE[prefix]) return prefix;
  if (LANG_CODE_ALIASES[raw]) return LANG_CODE_ALIASES[raw];
  if (LANG_CODE_ALIASES[prefix]) return LANG_CODE_ALIASES[prefix];
  return prefix || "en";
}
// ---------------------------------------------------------------------------
// DATA — this is placeholder/sample content, written from scratch (not taken
// from any book). Structure is built so you can keep adding languages,
// conversation , and vocabulary: just push more objects into the arrays below.
// ---------------------------------------------------------------------------
export const LANGUAGES = [
  { code: "fa", label: "فارسی", abbr: "FA" },
  { code: "en", label: "انگلیسی", abbr: "EN" },
  { code: "it", label: "ایتالیایی", abbr: "IT" },
  { code: "hi", label: "هندی", abbr: "HI" },
  { code: "tr", label: "ترکی", abbr: "TR" },
  { code: "ar", label: "عربی", abbr: "AR" },
  { code: "es", label: "اسپانیایی", abbr: "ES" },
  { code: "de", label: "آلمانی", abbr: "DE" },
  { code: "fr", label: "فرانسوی", abbr: "FR" },
  { code: "zh", label: "چینی", abbr: "ZH" },
  { code: "ko", label: "کره‌ای", abbr: "KO" },
  { code: "ru", label: "روسی", abbr: "RU" },
  { code: "ja", label: "ژاپنی", abbr: "JA" },
];
// نامِ انگلیسیِ هر زبون — مخصوصِ متنِ پرامپتی که به هوش مصنوعی فرستاده
// می‌شه (askGrammarTeacher و مشابه‌هاش)، چون خودِ اون پرامپت‌ها به انگلیسی
// نوشته شدن. قبلاً به‌جاش برچسبِ فارسیِ LANGUAGES (مثلاً «اسپانیایی») مستقیم
// وسطِ یه جمله‌ی انگلیسی می‌رفت — که خصوصاً سرویس‌های سریع/رایگانِ زنجیره
// (groq/mistral/...) بعضی‌وقت‌ها درست تشخیصش نمی‌دادن و به‌جاش خودشون
// پیش‌فرض می‌رفتن سراغِ انگلیسی برای مثال‌ها. اسمِ انگلیسیِ واضح این ابهام
// رو از بین می‌بره.
export const ENGLISH_LANG_NAME = {
  fa: "Persian",
  en: "English",
  it: "Italian",
  hi: "Hindi",
  tr: "Turkish",
  ar: "Arabic",
  es: "Spanish",
  de: "German",
  fr: "French",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ja: "Japanese",
};
export function englishLangName(code) {
  return ENGLISH_LANG_NAME[code] || code;
}
// نگاشتِ کدِ زبونِ خودِ برنامه (LANGUAGES) به کدِ زبونِ موردِ انتظارِ
// Tesseract.js (برای «خوندن/ترجمه‌ی متنِ عکس») — این کتابخونه از کدهای
// سه‌حرفیِ traineddata استفاده می‌کنه، نه از کدهای دوحرفیِ خودِ برنامه.
export const TESSERACT_LANG_CODE = {
  fa: "fas",
  en: "eng",
  it: "ita",
  hi: "hin",
  tr: "tur",
  ar: "ara",
  es: "spa",
  de: "deu",
  fr: "fra",
  zh: "chi_sim",
  ko: "kor",
  ru: "rus",
  ja: "jpn",
};
// Languages that read right-to-left — used so any text block (story
// sentences, translations, custom words the user types) gets the correct
// direction/alignment no matter which language it's actually written in,
// instead of inheriting the app's own RTL layout.
export const RTL_LANGS = ["fa", "ar"];
export const dirFor = (code) => (RTL_LANGS.includes(code) ? "rtl" : "ltr");
// حدس زدنِ خودکارِ زبونِ یه متنِ پیست‌شده/وارد‌شده (بدونِ نیاز به AI و
// بدونِ اینترنت) — قبلاً متنِ پیست‌شده برای خوانش همیشه با storyLangِ
// فعلی (هر چی که قبلاً بالای صفحه انتخاب شده بود) نمایش داده و خونده
// می‌شد، نه با زبونِ *واقعیِ* خودِ متن. همین باعث می‌شد یه متنِ انگلیسی با
// جهتِ راست‌به‌چپ نشون داده بشه و/یا موقعِ خوانش دنبالِ صدای زبونِ اشتباه
// بگرده، صدای محلیِ گوشی رو پیدا نکنه، و مجبور بشه بره سراغِ سرویسِ
// آنلاینِ کندتر. اینجا با اسکریپتِ یونیکد (فارسی/عربی/چینی/ژاپنی/کره‌ای/
// هندی/روسی) و برای زبون‌های لاتین با شمارشِ کلماتِ خیلی پرتکرارِ هر زبون
// (the/der/el/le/il/ve/...) حدس می‌زنیم. فقط بین ۱۳ زبونی که خودِ برنامه
// پشتیبانی می‌کنه (LANGUAGES) تصمیم می‌گیره؛ اگه هیچ سرنخِ روشنی نبود،
// null برمی‌گردونه تا زبونِ فعلی دست‌نخورده بمونه.
export function detectPastedTextLanguage(text) {
  const sample = (text || "").slice(0, 4000);
  if (!sample.trim()) return null;

  // دیوان‌ناگری → هندی
  if (/[\u0900-\u097F]/.test(sample)) return "hi";

  // اسکریپتِ عربی → فارسی یا عربی (حروفِ ویژه‌ی فارسی: پ چ ژ گ)
  if (/[\u0600-\u06FF]/.test(sample)) {
    return /[\u067E\u0686\u0698\u06AF]/.test(sample) ? "fa" : "ar";
  }

  // هیراگانا/کاتاکانا → ژاپنی
  if (/[\u3040-\u30FF]/.test(sample)) return "ja";
  // هانگول → کره‌ای
  if (/[\uAC00-\uD7A3]/.test(sample)) return "ko";
  // ایدئوگرام‌های یکپارچه‌ی چینی (بدونِ هیراگانا/هانگول که بالاتر رد شدن) → چینی
  if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";
  // سیریلیک → روسی
  if (/[\u0400-\u04FF]/.test(sample)) return "ru";

  // زبون‌های لاتین: هیچ اسکریپتِ منحصربه‌فردی ندارن، پس با شمارشِ
  // کلماتِ خیلی پرتکرارِ هر زبون تصمیم می‌گیریم.
  const words = sample.toLowerCase().match(/[a-zàâäçèéêëîïôöùûüÿñßışğî]+/g) || [];
  if (!words.length) return null;
  const wordSet = new Set(words);
  const scoreOf = (list) => list.reduce((sum, w) => sum + (wordSet.has(w) ? 1 : 0), 0);
  const stop = {
    de: ["der", "die", "das", "und", "ist", "nicht", "mit", "für", "ein", "eine", "sie", "auf", "was", "wie", "wenn", "aber", "auch", "sich", "dass", "ich"],
    es: ["el", "la", "los", "las", "de", "que", "y", "en", "no", "es", "un", "una", "para", "por", "con", "su", "del", "al", "se", "lo"],
    fr: ["le", "la", "les", "et", "est", "une", "des", "dans", "pour", "que", "qui", "ne", "pas", "ce", "vous", "je", "nous", "avec", "au", "un"],
    it: ["il", "la", "di", "che", "è", "un", "una", "per", "non", "con", "gli", "le", "sono", "questo", "questa", "del", "alla", "si", "mi", "ma"],
    tr: ["ve", "bir", "bu", "için", "ile", "de", "da", "çok", "ama", "ne", "gibi", "daha", "var", "yok", "ben", "sen", "biz", "onun", "şey", "değil"],
    en: ["the", "and", "is", "to", "of", "in", "that", "it", "was", "for", "on", "with", "he", "she", "you", "this", "but", "not", "are", "as"],
  };
  const scores = Object.entries(stop).map(([code, list]) => [code, scoreOf(list)]);
  scores.sort((a, b) => b[1] - a[1]);
  const [topCode, topScore] = scores[0];
  // اگه حتی برنده هم امتیازِ صفر داشت، سرنخِ قابلِ‌اطمینانی نیست — به‌جای
  // حدسِ کورکورانه، null برمی‌گردونیم تا زبونِ قبلی دست‌نخورده بمونه.
  return topScore > 0 ? topCode : null;
}
// ---------------------------------------------------------------------------
// تشخیصِ سریعِ سطحِ CEFR یه متن — کاملاً محلی، بدونِ هیچ فراخوانیِ AI، پس
// آنی (چند میلی‌ثانیه، حتی برای متنِ چندهزارکاراکتری) اجرا می‌شه؛ دقیقاً
// برای همون لحظه‌ای طراحی شده که کاربر متن رو پیست/PDF/لینک می‌کنه و قبلاً
// سطح همیشه رویِ A2 (مقدارِ اولیه‌ی storyLevel) می‌موند، چون هیچ‌کدوم از
// این سه مسیر اصلاً سطح رو تنظیم نمی‌کردن.
//
// روش: چند سنجه‌ی سبکِ زبان‌شناسیِ کلاسیک (شبیهِ خانواده‌ی Flesch-Kincaid،
// ولی بدونِ نیاز به شمارشِ دقیقِ هجا که برای فارسی/عربی و خیلی زبون‌های
// دیگه اصلاً تعریف‌شده/قابلِ‌اتکا نیست) با هم ترکیب می‌شن:
//   • میانگینِ طولِ جمله (کلمه) — جمله‌های بلندتر → معمولاً سطحِ بالاتر
//   • میانگینِ طولِ کلمه (حرف) — جایگزینِ سبکِ «تعدادِ هجا»، مستقل از زبون
//   • نسبتِ کلماتِ «بلند» (۷+ حرف) — سرنخِ واژگانِ تخصصی/پیچیده
//   • تنوعِ واژگانی (نسبتِ کلماتِ یکتا به کلِ کلمات) — تکرارِ زیاد → ساده‌تر
// این یه تخمینِ صرفاً آماریه، نه تحلیلِ زبان‌شناختیِ واقعی — دقتش قابلِ
// مقایسه با قضاوتِ AI/معلم نیست، ولی برای اینکه سطحِ پیش‌فرض دیگه همیشه
// «ثابت رویِ A2» نباشه و تقریباً درست باشه، کافیه. آستانه‌های زیر تجربی‌ان؛
// اگه بعداً حس شد سیستماتیک بالا/پایین می‌زنه، همینا رو می‌شه تنظیم کرد.
export function detectTextCEFRLevel(text) {
  const t = (text || "").trim();
  if (!t) return "A2";
  const sentences = splitTextIntoSentenceStrings(t);
  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length || !sentences.length) return "A2";

  const cleanWords = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  if (!cleanWords.length) return "A2";

  const avgSentenceLen = words.length / sentences.length;
  const avgWordLen = cleanWords.reduce((sum, w) => sum + w.length, 0) / cleanWords.length;
  const longWordRatio = cleanWords.filter((w) => w.length >= 7).length / cleanWords.length;
  const uniqueRatio = new Set(cleanWords.map((w) => w.toLowerCase())).size / cleanWords.length;

  const score = avgSentenceLen * 1.0 + avgWordLen * 3.0 + longWordRatio * 40 + uniqueRatio * 15;

  if (score < 14) return "A1";
  if (score < 19) return "A2";
  if (score < 24) return "B1";
  if (score < 29) return "B2";
  if (score < 34) return "C1";
  return "C2";
}
// Only these have real phrase/vocab data (conversation  / VOCAB below). Russian and
// Italian are only used as extra translation options in the Story Builder,
// which generates its translations live via AI rather than from static data.
// همه‌ی ۱۳ زبان الان توی خودِ لیست LANGUAGES هستن، پس این فیلتر همه رو نگه می‌داره —
// نگه داشته شده صرفاً برای سازگاری با بقیه‌ی کدی که PHRASEBOOK_LANGUAGES رو صدا می‌زنه.
export const PHRASEBOOK_LANGUAGES = LANGUAGES;
// ---------------------------------------------------------------------------
// هماهنگ‌سازیِ دوطرفه‌ی ترتیبِ زبان‌ها بین دو جای مختلف صفحه:
//   ۱) ردیفِ مهرهای زبان (کادر آبی بالا — زبان مادری/مقصد) که با
//      langPickerOrder جابه‌جا می‌شه.
//   ۲) پیل‌های سفیدِ «ترتیب نمایش ترجمه‌ها» که با targetOrder جابه‌جا می‌شه.
// هر جفت تابع زیر یکی از این دو رو، بعد از جابه‌جایی توی اون یکی، تطبیق
// می‌ده — بدون این‌که موقعیتِ زبان‌های غیرمرتبط رو به‌هم بریزه.
// ---------------------------------------------------------------------------
// وقتی پیل‌های ترتیبِ ترجمه (targetOrder) جابه‌جا شدن: همون زبان‌ها رو، تو
// همون جایگاه‌هایی که قبلاً توی ردیفِ مهرها داشتن، به ترتیبِ تازه بچین.
export function syncLangPickerFromTargetOrder(prevLangPickerOrder, nextTargetOrder) {
  const slots = [];
  prevLangPickerOrder.forEach((code, idx) => {
    if (nextTargetOrder.includes(code)) slots.push(idx);
  });
  if (!slots.length) return prevLangPickerOrder;
  const next = [...prevLangPickerOrder];
  slots.forEach((idx, i) => {
    next[idx] = nextTargetOrder[i];
  });
  return next;
}
// وقتی مهرها (langPickerOrder) جابه‌جا شدن: زبان‌های مقصدِ انتخاب‌شده رو با
// همون ترتیبِ تازه‌ی مهرها بازچینی کن.
export function syncTargetOrderFromLangPicker(nextLangPickerOrder, prevTargetOrder) {
  const next = nextLangPickerOrder.filter((c) => prevTargetOrder.includes(c));
  return next.length === prevTargetOrder.length ? next : prevTargetOrder;
}
