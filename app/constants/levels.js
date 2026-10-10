// سطح‌ها (CEFR) و برچسب‌های نقش دستوری
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const POS_FA = {
  noun: "اسم",
  verb: "فعل",
  adjective: "صفت",
  adverb: "قید",
  preposition: "حرف اضافه",
  pronoun: "ضمیر",
  conjunction: "حرف ربط",
  article: "حرف تعریف",
  interjection: "صوت",
  numeral: "عدد",
  auxiliary: "فعل کمکی",
  other: "سایر",
  determiner: "حرف تعیین‌کننده",
  exclamation: "صوت",
  "modal verb": "فعل وجهی",
  number: "عدد",
  "ordinal number": "عدد ترتیبی",
  "indefinite article": "حرف تعریف نکره",
  "definite article": "حرف تعریف معرفه",
  "linking verb": "فعل ربطی",
  "infinitive marker": "نشانه‌ی مصدر",
  idiom: "اصطلاح",
  slang: "اصطلاح عامیانه (مدرن)",
};
// نسخه‌ی انگلیسیِ همون برچسب‌های نوعِ دستوریِ بالا — کلیدها دقیقاً همونن،
// فقط برای حالتی که زبانِ نرم‌افزار (uiLang) روی English باشه.
const POS_EN = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  pronoun: "pronoun",
  conjunction: "conjunction",
  article: "article",
  interjection: "interjection",
  numeral: "numeral",
  auxiliary: "auxiliary verb",
  other: "other",
  determiner: "determiner",
  exclamation: "exclamation",
  "modal verb": "modal verb",
  number: "number",
  "ordinal number": "ordinal number",
  "indefinite article": "indefinite article",
  "definite article": "definite article",
  "linking verb": "linking verb",
  "infinitive marker": "infinitive marker",
  idiom: "idiom",
  slang: "slang",
};
export function posLabel(pos, uiLang) {
  const table = uiLang === "en" ? POS_EN : POS_FA;
  return table[pos] || pos;
}
