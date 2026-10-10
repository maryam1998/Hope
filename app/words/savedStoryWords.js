// لغات ذخیره‌شده برای داستان بعدی، سطح شخصی، تب مبدأ
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { WORDS_AZ } from "../../WORDS_AZ.js";
import { LEVELS } from "../constants/levels.js";
import { speechController } from "../speech/speechController.js";
import { normalizeWord } from "./wordCache.js";
import { LEVEL_BY_EN_WORD } from "./wordLevels.js";

// ---------------------------------------------------------------------------
// Words the user bookmarks from the word-tap popover ("save for next story").
// Stored per-device, filtered by langCode when shown inside Story Builder.
// A custom window event lets any open Story Builder instance refresh live,
// since localStorage's own "storage" event doesn't fire in the same tab.
// ---------------------------------------------------------------------------
export const SAVED_STORY_WORDS_KEY = "phrasebook-saved-story-words-v1";
export const SAVED_WORDS_CHANGED_EVENT = "phrasebook:savedWordsChanged";
// وقتی کاربر از پاپ‌آپِ لغت (وسطِ خوندنِ یه داستان) روی «ذخیره برای داستان
// بعدی» می‌زنه، همین لغت باید بلافاصله به لیستِ لغاتِ انتخاب‌شده‌ی همون
// داستان‌ساز (پیش از تولید/ترجمه‌ی داستانِ بعدی) هم اضافه بشه — نه فقط به
// انبار دائمی. StoryBuilder به این رویداد گوش می‌ده و اگه زبانش با
// زبانِ داستانِ فعلی یکی باشه، لغت رو به selectedWords اضافه می‌کنه.
export const STORY_WORD_PICKED_EVENT = "phrasebook:storyWordPicked";
// جلوگیری از چند درخواست هم‌زمان برای ترجمه‌ی یک لغت به یک زبان مشخص —
// چه از پنل «لغات ذخیره‌شده» چه از زیرخط‌کشیِ ClickableSentence در چند
// نمونه‌ی هم‌زمان روی صفحه.
export const crossTranslateInFlight = new Set();
// کدامین تبِ برنامه، همین الان روی صفحه‌ست — یک متغیرِ ساده‌ی سطحِ ماژول
// (نه state ری‌اکت)، چون توابعِ ذخیره‌سازیِ پایین (که از خیلی جاهای مختلفِ
// برنامه صدا زده می‌شن، نه فقط از داخلِ کامپوننت‌ها) باید بتونن همین الان
// بفهمن کاربر توی کدوم تبه، بدون این‌که لازم باشه این اطلاعات از بالا تا
// پایینِ کل درختِ کامپوننت‌ها prop-drilling بشه. PhrasebookMain با تغییرِ
// state‌ِ tab خودش، این متغیر رو هم‌زمان به‌روز نگه می‌داره (نگاه کن به
// useEffect مربوطه اونجا). هر لغت/عبارتی که همین الان ذخیره می‌شه، همین
// مقدار به‌عنوانِ origin.tab باهاش ذخیره می‌شه — تا بعداً توی پنلِ «لغات
// ذخیره‌شده»، لانگ‌پرس روی هر کارت بتونه کاربر رو به همون تب برگردونه.
let currentOriginTab = null;
export function setCurrentOriginTab(tab) {
  currentOriginTab = tab || null;
}
// دنبال‌کردنِ «پخشِ فعلی از کدوم تب شروع شده» — برای لانگ‌پرس روی نوارِ
// پلیرِ پایینِ صفحه: کاربر ممکنه وقتی چیزی داره پخش می‌شه (یا مکث شده)
// به یه تبِ دیگه بره؛ نوارِ پلیر همیشه روی صفحه می‌مونه، پس لانگ‌پرس روش
// باید کاربر رو دقیقاً به همون تب و همون سطری که پخش ازش شروع شده برگردونه.
// چون دکمه‌ی پخشِ هر آیتم فقط وقتی قابل‌کلیکه که تبِ خودش همین الان بازه
// (تب‌های دیگه یا اصلاً mount نیستن یا با display:none غیرقابل‌لمسن)، همون
// لحظه‌ای که یه پخشِ *تازه* (کلیدِ جدید، نه صرفاً ادامه/مکثِ همون متنِ قبلی)
// شروع می‌شه، currentOriginTab دقیقاً همون تبِ مبدأشه. رفتنِ خودِ سطر
// (نه فقط تب) رو منطقِ اسکرولِ خودکارِ هر لیست (که از قبل وجود داشت) بعد از
// setTab خودش انجام می‌ده.
let lastPlayOriginTab = null;
let lastPlayOriginKey = null;
speechController.subscribe((state) => {
  if (state.key && state.key !== lastPlayOriginKey) {
    lastPlayOriginKey = state.key;
    lastPlayOriginTab = currentOriginTab;
  } else if (!state.key) {
    lastPlayOriginKey = null;
  }
});
export function getLastPlayOriginTab() {
  return lastPlayOriginTab;
}
export function loadSavedStoryWords() {
  try {
    const raw = window.localStorage.getItem(SAVED_STORY_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function isWordSaved(word, langCode) {
  const w = normalizeWord(word);
  return loadSavedStoryWords().some((e) => e.langCode === langCode && normalizeWord(e.word) === w);
}
// opts (اختیاری): { meaning, nativeLang } — اگه موقع ذخیره، ترجمه‌ی لغت به
// زبان مادری کاربر از قبل روی صفحه (پاپ‌آپ لغت) موجود بود، همون‌جا همراه
// خودِ لغت ذخیره می‌شه؛ وگرنه بعداً از جاهای دیگه (نگاه‌کردن دوباره به لغت،
// یا پنل «لغات ذخیره‌شده») کامل می‌شه.
export function toggleSavedStoryWord(word, langCode, opts) {
  const w = normalizeWord(word);
  if (!w) return false;
  // Strip the same stray leading/trailing punctuation normalizeWord() would
  // (quotes, sentence-final periods, commas, etc.) but keep original casing,
  // so what gets stored is always the clean word/expression, not a token
  // still carrying punctuation from where it happened to sit in a sentence.
  const cleanWord = (word || "")
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
  const list = loadSavedStoryWords();
  const idx = list.findIndex((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  let nowSaved;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowSaved = false;
  } else {
    const translations = {};
    if (opts && opts.meaning && opts.nativeLang) translations[opts.nativeLang] = opts.meaning;
    list.unshift({
      word: cleanWord || word,
      langCode,
      savedAt: new Date().toISOString(),
      translations,
      origin: { tab: currentOriginTab, ...((opts && opts.originExtra) || {}) },
    });
    unhideFromWordsTab(w);
    nowSaved = true;
  }
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
  return nowSaved;
}
// ترجمه‌ی یک لغت ذخیره‌شده رو به یک زبان مشخص (targetLangCode) کامل/به‌روز
// می‌کنه — هم برای نمایش ترجمه توی پنل «لغات ذخیره‌شده» استفاده می‌شه، هم
// برای این‌که همون لغت وقتی به زبان‌های دیگه ترجمه شده تو متن دیده می‌شه،
// زیرخط بخوره (نگاه کن به ClickableSentence).
export function updateSavedWordTranslation(word, langCode, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const w = normalizeWord(word);
  const list = loadSavedStoryWords();
  const idx = list.findIndex((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (idx === -1) return;
  const entry = list[idx];
  const prev = (entry.translations && entry.translations[targetLangCode]) || "";
  if (prev === translatedText.trim()) return; // از رویداد بی‌فایده جلوگیری می‌کنه
  const translations = { ...(entry.translations || {}), [targetLangCode]: translatedText.trim() };
  list[idx] = { ...entry, translations };
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
// فقط اضافه می‌کنه (اگه از قبل نبود) — برخلاف toggleSavedStoryWord، هیچ‌وقت
// چیزی رو حذف نمی‌کنه. برای اینکه هر لغتی که برای ساخت یه داستان انتخاب
// می‌شه، خودکار و بی‌سروصدا تو انبار دائمی هم بمونه، حتی اگه بعداً از
// انتخاب همون داستان برداشته بشه.
export function ensureSavedStoryWord(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return;
  const cleanWord = (word || "")
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
  const list = loadSavedStoryWords();
  const exists = list.some((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (exists) return;
  unhideFromWordsTab(w);
  list.unshift({
    word: cleanWord || word,
    langCode,
    savedAt: new Date().toISOString(),
    translations: {},
    origin: { tab: currentOriginTab },
  });
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
// ---------------------------------------------------------------------------
// لغاتِ شخصی در تبِ «لغات»: سطحِ دستی (A1..C2) + مخفی‌کردن از همین تب.
// «مخفی‌کردن» فقط از تبِ لغات حذف می‌کنه؛ خودِ لغت توی «لغات ذخیره‌شده»
// (SAVED_STORY_WORDS_KEY) دست‌نخورده می‌مونه. اگه کاربر دوباره همون لغت رو
// ذخیره کنه، خودکار از حالتِ مخفی درمیاد.
// ---------------------------------------------------------------------------
const PERSONAL_WORD_LEVELS_KEY = "phrasebook-personal-word-levels-v1";
const WORDS_TAB_HIDDEN_KEY = "phrasebook-words-tab-hidden-v1";
export const WORDS_TAB_PERSONAL_EVENT = "phrasebook:wordsTabPersonalChanged";
export function loadPersonalWordLevels() {
  try {
    const raw = window.localStorage.getItem(PERSONAL_WORD_LEVELS_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
export function loadWordsTabHidden() {
  try {
    const raw = window.localStorage.getItem(WORDS_TAB_HIDDEN_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(a) ? a : []);
  } catch {
    return new Set();
  }
}
export function setPersonalWordLevel(word, level) {
  const k = normalizeWord(word);
  if (!k) return;
  const o = loadPersonalWordLevels();
  if (level) o[k] = level;
  else delete o[k];
  try {
    window.localStorage.setItem(PERSONAL_WORD_LEVELS_KEY, JSON.stringify(o));
    window.dispatchEvent(new Event(WORDS_TAB_PERSONAL_EVENT));
  } catch {}
}
export function hideFromWordsTab(word) {
  const k = normalizeWord(word);
  if (!k) return;
  const set = loadWordsTabHidden();
  set.add(k);
  try {
    window.localStorage.setItem(WORDS_TAB_HIDDEN_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event(WORDS_TAB_PERSONAL_EVENT));
  } catch {}
}
// بدونِ دیسپچ — همیشه درست قبل از رویدادِ SAVED_WORDS_CHANGED_EVENT صدا زده می‌شه.
function unhideFromWordsTab(normalizedKey) {
  if (!normalizedKey) return;
  try {
    const set = loadWordsTabHidden();
    if (!set.has(normalizedKey)) return;
    set.delete(normalizedKey);
    window.localStorage.setItem(WORDS_TAB_HIDDEN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}
// مجموعه‌ی لغاتِ WORDS_AZ فقط یک‌بار ساخته می‌شه (قبلاً با هر ذخیره‌ی لغت،
// چند هزار بار normalizeWord اجرا می‌شد و ظاهرشدنِ لغت تو تبِ لغات کند بود).
let _wordsAzKeySet = null;
export function getWordsAzKeySet() {
  if (!_wordsAzKeySet) _wordsAzKeySet = new Set(WORDS_AZ.map((w) => normalizeWord(w.en)));
  return _wordsAzKeySet;
}
// برای عبارت/جمله: بالاترین سطحِ کلماتِ شناخته‌شده‌ی داخلش (تخمینِ تقریبی).
export function estimatePhraseLevel(text) {
  const toks = normalizeWord(text).split(/\s+/).filter(Boolean);
  if (toks.length < 2) return null;
  let best = 0;
  let bestLevel = null;
  toks.forEach((tk) => {
    const lv = LEVEL_BY_EN_WORD.get(tk);
    const r = lv ? LEVELS.indexOf(lv) + 1 : 0;
    if (r > best) {
      best = r;
      bestLevel = lv;
    }
  });
  return bestLevel;
}
export function removeSavedStoryWord(word, langCode) {
  const list = loadSavedStoryWords().filter(
    (e) => !(e.langCode === langCode && normalizeWord(e.word) === normalizeWord(word))
  );
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
// وقتی نسخه‌ی ابری (Supabase) لود می‌شه، قبلاً کاملاً جای نسخه‌ی محلی رو
// می‌گرفت (overwrite) — یعنی اگه به هر دلیلی (ردیفِ ابری قدیمی‌تر بود، یا
// هنوز کامل sync نشده بود) نسخه‌ی ابری چیزِ کمتری داشت، لغاتی که محلی
// داشت ولی ابری نداشت، همون لحظه پاک می‌شدن؛ و بدتر، دفعه‌ی بعد که ذخیره
// (debounced save) اجرا می‌شد، همین نسخه‌ی ناقص دوباره به ابری هم می‌رفت —
// یعنی گم‌شدنِ دائمی. این تابع به‌جاش دو لیست رو ادغام می‌کنه: هرچی توی
// یکی از دوتا بود (محلی یا ابری) نگه داشته می‌شه، هیچی دور ریخته نمی‌شه.
export function mergeSavedStoryWordsFromCloud(cloudList) {
  if (!Array.isArray(cloudList) || !cloudList.length) return;
  const local = loadSavedStoryWords();
  const keyOf = (e) => `${e.langCode}::${normalizeWord(e.word)}`;
  const localMap = new Map(local.map((e) => [keyOf(e), e]));
  let changed = false;
  cloudList.forEach((cloudEntry) => {
    if (!cloudEntry || !cloudEntry.word || !cloudEntry.langCode) return;
    const key = keyOf(cloudEntry);
    const existing = localMap.get(key);
    if (!existing) {
      localMap.set(key, cloudEntry);
      changed = true;
    } else {
      // خودِ لغت هر دوجا هست — فقط ترجمه‌هایی که ابری داشت و محلی نداشت
      // رو اضافه می‌کنیم، بدون این‌که چیزی که محلی از قبل داشت رو عوض کنیم.
      const mergedTranslations = { ...(cloudEntry.translations || {}), ...(existing.translations || {}) };
      if (JSON.stringify(mergedTranslations) !== JSON.stringify(existing.translations || {})) {
        localMap.set(key, { ...existing, translations: mergedTranslations });
        changed = true;
      }
    }
  });
  if (!changed) return;
  const merged = Array.from(localMap.values()).sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
// یه تکه متن (یه کلمه، یه اصطلاح، یا حتی یه جمله‌ی کامل که کاربر انتخابش
// کرده) رو هم به انبار دائمیِ «لغات ذخیره‌شده» اضافه می‌کنه، هم — اگه
// داستان‌سازی همون لحظه باز باشه — به لیستِ انتخاب‌شده‌ی همون داستان.
// هم اون تابعیه که دکمه‌ی «افزودن به داستان‌ساز» زیرِ هر مثال، و هم
// انتخابِ آزادِ یه محدوده از متن (نگاه کن به ClickableSentence) صداش می‌زنن.
export function addTextToStoryPicks(text, langCode) {
  const clean = (text || "").trim();
  if (!clean) return;
  ensureSavedStoryWord(clean, langCode);
  try {
    window.dispatchEvent(new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: clean, langCode } }));
  } catch {}
}
