// گزینه‌ها و توابع مرتب‌سازی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ---------------------------------------------------------------------------
// مرتب‌سازیِ داستان‌های ذخیره‌شده — «نام» یه داستان همون لغاتِ انتخابیِ
// ذخیره‌شده باهاشه (چیزی که زیرِ هر کارت هم نشون داده می‌شه)، و «اندازه»
// همون تعدادِ کلمه‌های کلِ داستانه (چون داستان‌ها فایل جداگونه نیستن که
// حجمِ بایتی معنی‌دار داشته باشن).
export const SAVED_STORIES_SORT_OPTIONS = [
  { key: "favorite", fa: "علاقه‌مندی‌ها اول", en: "Favorites first" },
  { key: "newest", fa: "جدیدترین تاریخ", en: "Newest date" },
  { key: "oldest", fa: "قدیمی‌ترین تاریخ", en: "Oldest date" },
  { key: "wordsDesc", fa: "بیشترین تعداد کلمه", en: "Most words" },
  { key: "wordsAsc", fa: "کمترین تعداد کلمه", en: "Fewest words" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
];
function getStoryWordCount(entry) {
  if (Array.isArray(entry?.ytLines)) {
    return entry.ytLines.reduce((n, l) => n + ((l?.s || "").trim().split(/\s+/).filter(Boolean).length), 0);
  }
  const paragraphs = entry?.paragraphs || [];
  let count = 0;
  for (const p of paragraphs) {
    for (const s of p?.sentences || []) {
      const text = (s?.text || "").trim();
      if (text) count += text.split(/\s+/).filter(Boolean).length;
    }
  }
  return count;
}
// 🏷️ اگه کاربر خودش یه عنوانِ دستی گذاشته باشه (entry.title)، همون
// معیارِ نام/مرتب‌سازیه؛ وگرنه (مثلِ قبل) از رویِ لغاتِ انتخاب‌شده ساخته
// می‌شه.
function getStoryNameKey(entry) {
  if (entry?.title && entry.title.trim()) return entry.title.trim();
  return (entry?.selectedWords || []).join("، ").trim();
}
export function sortSavedStories(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case "favorite":
      return arr.sort((a, b) => {
        const fa = a.favorite ? 1 : 0;
        const fb = b.favorite ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
      });
    case "oldest":
      return arr.sort((a, b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
    case "wordsDesc":
      return arr.sort((a, b) => getStoryWordCount(b) - getStoryWordCount(a));
    case "wordsAsc":
      return arr.sort((a, b) => getStoryWordCount(a) - getStoryWordCount(b));
    case "nameAsc":
      return arr.sort((a, b) => getStoryNameKey(a).localeCompare(getStoryNameKey(b), "fa"));
    case "nameDesc":
      return arr.sort((a, b) => getStoryNameKey(b).localeCompare(getStoryNameKey(a), "fa"));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  }
}
// گزینه‌های مرتب‌سازیِ لیستِ لغات (تب‌های لغات/Vocabulary in
// Use/اسلنگ/علاقه‌مندی‌ها) — این لغات تاریخِ ذخیره‌سازی ندارن (یه دیکشنریِ
// ثابتن)، پس فقط بر اساسِ نام (الفبا) و سطحِ CEFR مرتب می‌شن.
export const WORD_LIST_SORT_OPTIONS = [
  { key: "default", fa: "پیش‌فرض", en: "Default" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
  { key: "levelAsc", fa: "سطح: ساده ← سخت", en: "Level: easy → hard" },
  { key: "levelDesc", fa: "سطح: سخت ← ساده", en: "Level: hard → easy" },
];
const WORD_LIST_LEVEL_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
export function sortWordListEntries(list, sortKey) {
  if (!sortKey || sortKey === "default") return list;
  const arr = [...list];
  const levelRank = (w) => WORD_LIST_LEVEL_ORDER[w?.level] ?? 99;
  switch (sortKey) {
    case "nameAsc":
      return arr.sort((a, b) => (a.en || "").localeCompare(b.en || ""));
    case "nameDesc":
      return arr.sort((a, b) => (b.en || "").localeCompare(a.en || ""));
    case "levelAsc":
      return arr.sort((a, b) => levelRank(a) - levelRank(b));
    case "levelDesc":
      return arr.sort((a, b) => levelRank(b) - levelRank(a));
    default:
      return arr;
  }
}
// گزینه‌های مرتب‌سازیِ «لغات ذخیره‌شده» (تبِ ذخیره‌شده‌ها) — این‌ها برخلافِ
// بالا savedAt دارن (وقتی از پاپ‌آپِ لغت/داستان‌ساز ذخیره می‌شن)، پس
// جدیدترین/قدیمی‌ترین هم به گزینه‌ها اضافه می‌شه.
export const SAVED_WORDS_SORT_OPTIONS = [
  { key: "newest", fa: "جدیدترین تاریخ", en: "Newest date" },
  { key: "oldest", fa: "قدیمی‌ترین تاریخ", en: "Oldest date" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
];
export function sortSavedWordEntries(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case "oldest":
      return arr.sort((a, b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
    case "nameAsc":
      return arr.sort((a, b) => (a.word || "").localeCompare(b.word || ""));
    case "nameDesc":
      return arr.sort((a, b) => (b.word || "").localeCompare(a.word || ""));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  }
}
