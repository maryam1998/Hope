// لغات سفارشی لایتنر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { normalizeWord } from "../words/wordCache.js";

// ---------------------------------------------------------------------------
// لغاتِ دلخواهی که کاربر از پاپ‌آپِ تک‌لغه‌ای (ClickableSentence) با دکمه‌ی
// «افزودن به جعبه‌ی لایتنر» اضافه می‌کنه — جدا از VOCAB ثابتِ برنامه، چون
// این‌ها می‌تونن از هر متنی (داستانِ AI، PDFِ وارد‌شده، هر جای دیگه) بیان.
// شکلِ هر آیتم دقیقاً هم‌شکلِ آیتم‌های VOCAB‌ه (id + t:{lang:text}) تا
// ReviewBox بتونه بدونِ هیچ تغییری، این‌ها رو هم کنارِ VOCAB نمایش بده.
const LEITNER_CUSTOM_WORDS_KEY = "phrasebook-leitner-custom-words-v1";
export const LEITNER_CUSTOM_WORDS_CHANGED_EVENT = "phrasebook:leitnerCustomWordsChanged";
export function loadLeitnerCustomWords() {
  try {
    const raw = window.localStorage.getItem(LEITNER_CUSTOM_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLeitnerCustomWordsList(list) {
  try {
    window.localStorage.setItem(LEITNER_CUSTOM_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(LEITNER_CUSTOM_WORDS_CHANGED_EVENT));
  } catch {}
}
// اگه همون لغت (همون زبان) از قبل اضافه شده باشه، دوباره اضافه نمی‌کنه —
// فقط اگه معنیِ تازه‌تری داشته باشیم (opts.meaning)، همون رکورد رو به‌روز
// می‌کنه. برمی‌گردونه: true اگه تازه اضافه شد، false اگه از قبل بود.
export function addLeitnerCustomWord(word, langCode, opts) {
  const w = normalizeWord(word);
  if (!w) return false;
  const nativeLang = (opts && opts.nativeLang) || "fa";
  const meaning = (opts && opts.meaning) || "";
  const id = `custom:${langCode}:${w}`;
  const list = loadLeitnerCustomWords();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    if (meaning && !list[idx].t[nativeLang]) {
      list[idx] = { ...list[idx], t: { ...list[idx].t, [nativeLang]: meaning } };
      saveLeitnerCustomWordsList(list);
    }
    return false;
  }
  const entry = { id, langCode, t: { [langCode]: word, ...(meaning ? { [nativeLang]: meaning } : {}) } };
  list.unshift(entry);
  saveLeitnerCustomWordsList(list);
  return true;
}
// وقتی یه لغتِ سفارشیِ لایتنر فقط ترجمه‌ی یک زبون رو داره (چون موقعِ
// افزودن، فقط همون یه زبونِ مقصد باز بود) و کاربر بعداً یه زبونِ مقصدِ
// دیگه هم فعال می‌کنه، ReviewBox این تابع رو صدا می‌زنه تا ترجمه‌یِ همون
// زبونِ تازه رو (که جدا با translateFree گرفته) روی همون رکورد پر کنه —
// دقیقاً همون الگویِ «تکمیلِ تنبل» که updateSavedWordTranslation برای
// پنلِ لغاتِ ذخیره‌شده استفاده می‌کنه.
export function fillLeitnerCustomWordTranslation(id, langCode, text) {
  if (!text) return;
  const list = loadLeitnerCustomWords();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0 || list[idx].t[langCode]) return; // دیگه وجود نداره یا از قبل پر شده
  list[idx] = { ...list[idx], t: { ...list[idx].t, [langCode]: text } };
  saveLeitnerCustomWordsList(list);
}
