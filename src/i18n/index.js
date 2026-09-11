import fa from "./fa";
import en from "./en";

export const TRANSLATIONS = { fa, en };
export const SUPPORTED_LANGS = ["fa", "en"];

// یه تابعِ ترجمه می‌سازه که هم کلیدِ ساده رو می‌فهمه، هم کلیدِ پارامتردار
// ({name}) رو جایگزین می‌کنه. اگه کلید توی زبانِ فعلی نبود، فارسی رو
// نشون می‌ده (بهتر از کلیدِ خام یا خالی).
export function makeT(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.fa;
  return function t(key, vars) {
    const entry = dict[key];
    let text = entry != null ? entry : (TRANSLATIONS.fa[key] ?? key);
    if (vars && typeof text === "string") {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });
    }
    return text;
  };
}

// اعداد رو به رقمِ زبانِ جاری تبدیل می‌کنه — فارسی: ۱۲۳، انگلیسی: 123
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function localizeDigits(n, lang) {
  const s = String(n);
  if (lang === "fa") return s.replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
  return s;
}
