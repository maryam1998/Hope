// ترجمه‌ی لغات و خوانده‌شده‌ها
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { normalizeWord } from "./wordCache.js";

// ---------------------------------------------------------------------------
// ترجمه‌ی هر لغتِ لیست به همه‌ی زبان‌های مقصدی که کاربر انتخاب کرده (نه فقط
// فارسی). چون خودِ دیتای WORDS_AZ/DAILY_WORDS فقط انگلیسی+فارسی
// دارن، بقیه‌ی زبان‌ها رو همین‌جا، لحظه‌ای و با همون زنجیره‌ی ترجمه‌ی رایگان
// (translateFree) می‌گیریم و روی دستگاه کش می‌کنیم — تا هر لغت فقط یه‌بار
// در طول عمر برنامه از سرور خواسته بشه، نه هر بار که کاربر اسکرول می‌کنه.
const WORD_TRANSLATIONS_KEY = "phrasebook-word-translations-v1";
// ⚡️ فیکسِ سرعت (هنگ‌کردنِ جستجو): loadAllWordTranslations() قبلاً هر بار
// صدا زده می‌شد کلِ رشته‌ی localStorage رو از نو JSON.parse می‌کرد. این
// تابع از داخلِ فیلترِ جستجوی WordList، به‌ازای هر لغتی که مستقیم با
// متنِ جستجو جور در نمیومد، به‌ازای هر زبانِ مقصد دوباره صدا زده می‌شد —
// یعنی با چند هزار لغت (مثلاً تبِ لغات با ۶٬۳۱۹ ردیف) و چند زبان، هر
// کاراکتری که کاربر تایپ می‌کرد چند هزار بار JSON.parse رویِ یه بلاکِ
// به‌مرورِ‌زمان بزرگ‌شونده اجرا می‌شد — دقیقاً همون چیزی که باعثِ هنگِ
// کاملِ جستجو (توی همه‌ی تب‌ها) می‌شد. حالا نتیجه‌ی parse شده رو تا وقتی
// چیزی عوض نشده (فقط با saveWordTranslation) توی حافظه نگه می‌داریم —
// یعنی در طولِ یه نشست، این بلاک حداکثر یه‌بار parse می‌شه، نه هزاران بار.
let wordTranslationsMemoCache = null;
function loadAllWordTranslations() {
  if (wordTranslationsMemoCache) return wordTranslationsMemoCache;
  try {
    const raw = window.localStorage.getItem(WORD_TRANSLATIONS_KEY);
    wordTranslationsMemoCache = raw ? JSON.parse(raw) : {};
  } catch {
    wordTranslationsMemoCache = {};
  }
  return wordTranslationsMemoCache;
}
function wordTranslationKey(word, langCode) {
  return `${langCode}::${normalizeWord(word)}`;
}
export function loadWordTranslation(word, langCode) {
  const all = loadAllWordTranslations();
  return all[wordTranslationKey(word, langCode)] || "";
}
export function saveWordTranslation(word, langCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const all = loadAllWordTranslations();
  all[wordTranslationKey(word, langCode)] = translatedText.trim();
  // کشِ حافظه رو هم هم‌زمان به‌روز نگه می‌داریم (نه فقط localStorage) تا
  // لغتِ تازه‌ترجمه‌شده همون لحظه توی جستجو/نمایش هم در دسترس باشه، بدونِ
  // نیاز به یه parse دیگه.
  wordTranslationsMemoCache = all;
  try {
    window.localStorage.setItem(WORD_TRANSLATIONS_KEY, JSON.stringify(all));
  } catch {}
}
// ---------------------------------------------------------------------------
// ردیابیِ «خوانده‌شده / خوانده‌نشده»ی هر لغت — چون تعداد لغاتِ هر تب
// (لغات/لغات‌و‌اخبار/اسلنگ/علاقه‌مندی‌ها) خیلی زیاده، کاربر می‌تونه با یه
// بازه‌ی عددی (از # تا #) فقط بخشی از لیست رو ببینه، و مشخص کنه کدوم لغات رو
// قبلاً خونده. چون شماره‌ی id بینِ فایل‌های مختلفِ لغت (WORDS_AZ/
// DAILY_WORDS/SLANG_WORDS/...) ممکنه تکراری باشه، این وضعیت را جداگانه به
// ازای هر تب (listId) ذخیره می‌کنیم، نه فقط به ازای id.
const WORD_READ_KEY = "phrasebook-word-read-v1";
export function loadReadWordIds(listId) {
  try {
    const raw = window.localStorage.getItem(WORD_READ_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return new Set(all[listId] || []);
  } catch {
    return new Set();
  }
}
export function saveReadWordIds(listId, idsSet) {
  try {
    const raw = window.localStorage.getItem(WORD_READ_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[listId] = Array.from(idsSet);
    window.localStorage.setItem(WORD_READ_KEY, JSON.stringify(all));
  } catch {}
}
