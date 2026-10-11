// راه‌اندازیِ سیستمِ چندزبانه (react-i18next)
// -----------------------------------------------------------------------------
// متن‌های اپ تو locales/<lang>.json هستن (کلیدهای انگلیسیِ snake_case).
// استفاده تو کامپوننت‌ها:
//     import { useTranslation } from "react-i18next";
//     const { t } = useTranslation();
//     t("settings_title")
// استفاده بیرون از کامپوننت‌ها (فایل‌های ساده‌ی .js):
//     import { t } from "../i18nconfig.js";
// جای‌گذاری‌ها همون فرمتِ قبلی رو دارن: {n}, {name} → t("key", { n: 3 })
// -----------------------------------------------------------------------------
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fa from "./locales/fa.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGS = ["fa", "en", "de", "es", "fr", "ar"];
export const DEFAULT_LANG = "fa";

// جهتِ هر زبان. فعلاً فقط لیستِ جهت‌ها آماده‌ست؛ تغییرِ خودکارِ dir روی کلِ
// صفحه عمداً خاموشه، چون هنوز بیشترِ صفحه‌ها منتقل نشدن و انگلیسی تا الان هم
// تو همون صفحه‌ی راست‌چین نشون داده می‌شد. وقتی همه‌ی بخش‌ها منتقل شدن، این
// رو true کن.
export const LANG_DIR = { fa: "rtl", en: "ltr", de: "ltr", es: "ltr", fr: "ltr", ar: "rtl" };
export const AUTO_DOCUMENT_DIR = false;

// زبانِ رابط از همون تنظیماتِ ذخیره‌شده‌ی اپ (phrasebook-app-prefs → uiLang)
// خونده می‌شه؛ اگه نبود، فارسی (مثلِ رفتارِ قبلی). زبانِ مرورگر/گوشی عمداً
// بررسی نمی‌شه تا رفتارِ فعلیِ اپ عوض نشه.
const APP_PREFS_KEY = "phrasebook-app-prefs";
const detector = new LanguageDetector();
detector.addDetector({
  name: "appPrefs",
  lookup() {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}").uiLang;
      return SUPPORTED_LANGS.includes(saved) ? saved : undefined;
    } catch (e) {
      return undefined;
    }
  },
});

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      fa: { translation: fa },
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    supportedLngs: SUPPORTED_LANGS,
    // اگه کلیدی تو زبانِ انتخاب‌شده نبود: اول انگلیسی، بعد فارسی (به‌جای نمایشِ کلیدِ خام)
    fallbackLng: ["en", "fa"],
    load: "languageOnly",
    detection: { order: ["appPrefs"], caches: [] },
    // کلیدها تخت‌ان (settings_title)، پس جداکننده‌ی نقطه/دونقطه لازم نیست.
    keySeparator: false,
    nsSeparator: false,
    // همون {n} قبلی؛ نه {{n}}ِ پیش‌فرضِ i18next
    interpolation: { prefix: "{", suffix: "}", escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });

function applyDocumentLang(lng) {
  try {
    const code = String(lng || DEFAULT_LANG).split("-")[0];
    document.documentElement.lang = code;
    if (AUTO_DOCUMENT_DIR && LANG_DIR[code]) document.documentElement.dir = LANG_DIR[code];
  } catch (e) {}
}
applyDocumentLang(i18n.language);
i18n.on("languageChanged", applyDocumentLang);

export const t = (...args) => i18n.t(...args);
export default i18n;
