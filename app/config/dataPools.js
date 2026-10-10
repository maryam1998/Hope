// استخرهای دیتا (جستجوی داستان‌ساز + Vocabulary in Use)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { WORDS_AZ } from "../../WORDS_AZ.js";
import { DAILY_WORDS } from "../../DAILY_WORDS.js";
import { SLANG_WORDS } from "../../SLANG_WORDS.js";
import { VOCAB_IN_USE_UNITS } from "../../vocabularyInUseData.js";
import { DAILY_CONVERSATIONS, THEMATIC_CONVERSATIONS } from "../../DAILY_CONVERSATIONS.js";

// مکالمات روزمره + مکالمات موضوعی، یکجا مرج‌شده — تا هرجا که قبلاً از
// DAILY_CONVERSATIONS استفاده می‌شد (تبِ مکالمه، استخرِ جستجوی داستان‌ساز،
// نگاشتِ سطح‌بندیِ لغات)، مکالمات موضوعی هم به‌صورت خودکار دیده بشن.
export const ALL_DAILY_CONVERSATIONS = [...DAILY_CONVERSATIONS, ...(THEMATIC_CONVERSATIONS || [])];
// ---------------------------------------------------------------------------
// جستجوی یکپارچه‌ی «یا از دیکشنری جستجو کن...» توی داستان‌ساز — به‌جای
// این‌که فقط تو VOCAB (لیست محدودِ چندزبانه) بگرده، باید بتونه از تبِ
// «لغات» (WORDS_AZ)، «مکالمه و روزمره»
// (DAILY_WORDS) و «مکالمات روزمره» (DAILY_CONVERSATIONS) هم لغت/عبارت پیدا
// کنه. این آرایه‌های مسطح‌شده فقط یه‌بار موقع بارگذاریِ اپ ساخته می‌شن (نه
// هر رندرِ داستان‌ساز) تا جستجو سنگین نشه.
export const STORY_SEARCH_WORD_POOL = [
  ...WORDS_AZ.map((w) => ({ term: w.en, fa: w.fa, source: "دیکشنری من" })),
  ...DAILY_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "مکالمه و روزمره" })),
  ...SLANG_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "اصطلاحات عامیانه" })),
];
// همه‌ی خط‌های دوطرفِ مکالمه‌های روزمره، مسطح‌شده به یه آرایه‌ی ساده — تا
// کاربر بتونه یه عبارتِ کاملِ یه مکالمه رو هم به‌عنوان لغتِ هدفِ داستان
// انتخاب کنه، نه فقط تک‌کلمه‌ها.
export const STORY_SEARCH_CONVERSATION_POOL = ALL_DAILY_CONVERSATIONS.flatMap((tp) =>
  tp.scenarios.flatMap((sc) => [...(sc.speakerA || []), ...(sc.speakerB || [])])
).map((it) => ({ term: it.en, fa: it.fa || "", source: "دیالوگ‌های روزمره" }));
// «Vocabulary in Use» — دیتای واحدهای موضوعی (هرکدوم چند لغت + تمرین)، برای
// تبِ لغات مسطح می‌شه به یه آرایه‌ی ساده‌ی {id, en, fa, level, ...} با همون
// شکلی که WordList (تبِ لغات/لغات‌واخبار/اسلنگ) انتظار داره؛ id پایدار
// می‌سازیم (بر اساسِ شناسه‌ی واحد + ایندکس) تا ذخیره‌شدن/⭐/خوانده‌شدنِ هر
// لغت بینِ نشست‌ها ثابت بمونه.
// 🐛 باگِ اصلی: unit.level توی vocabularyInUseData.js فقط یه برچسبِ آزاد
// («intermediate») بود، ولی فیلترِ سطح توی UI (LevelFilterRow/WordList)
// دقیقاً با رشته‌های "A1".."C2" مقایسه می‌کرد (`words.filter(w => w.level
// === levelFilter)`) — پس هیچ‌وقت برابر نمی‌شدن و هر سطحی که می‌زدی خالی
// می‌موند. حالا خودِ ۱۰۰ واحدِ vocabularyInUseData.js با کدهای واقعیِ
// CEFR (بر اساسِ موضوع/سختیِ لغاتِ هر واحد: A1×14، A2×35، B1×41، B2×10)
// برچسب‌گذاری شدن — نه فقط یه نگاشتِ یکنواخت به B1. تابعِ زیر فقط یه
// شبکه‌ی ایمنیه: اگه یه‌جا هنوز برچسبِ آزادِ قدیمی (مثلِ «intermediate»)
// باقی مونده باشه تبدیلش می‌کنه، وگرنه کدِ CEFRِ خودِ دیتا رو دست‌نخورده
// برمی‌گردونه.
const VOCAB_IN_USE_LEVEL_TO_CEFR = {
  elementary: "A2",
  "pre-intermediate": "A2",
  preintermediate: "A2",
  intermediate: "B1",
  "upper-intermediate": "B2",
  upperintermediate: "B2",
  advanced: "C1",
  proficiency: "C2",
};
function normalizeVocabInUseLevel(rawLevel) {
  if (!rawLevel) return null;
  const key = String(rawLevel).trim().toLowerCase();
  // اگه از قبل خودش یه کدِ CEFR معتبره (مثلاً یه‌جا تویِ دیتا اصلاح شد و
  // مستقیم "B1" نوشتن)، همون رو دست‌نخورده برگردون.
  if (/^[abc][12]$/i.test(key)) return key.toUpperCase();
  return VOCAB_IN_USE_LEVEL_TO_CEFR[key] || null;
}
export const VOCAB_IN_USE_WORDS = VOCAB_IN_USE_UNITS.flatMap((unit, ui) =>
  (unit.words || []).map((w, wi) => ({
    id: `viu-${unit.id || ui}-${wi}`,
    en: w.en,
    fa: w.fa,
    level: normalizeVocabInUseLevel(unit.level),
    example: w.example || "",
    collocation: w.collocation || "",
    category: unit.topicFa || unit.topic || "",
  }))
);
