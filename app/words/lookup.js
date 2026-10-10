// جستجوی لغت/معنی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { VOCAB } from "../../VOCAB.js";
import { POS_FA } from "../constants/levels.js";
import { translateFree } from "../translate/translateService.js";
import { loadWordCache, normalizeWord, saveWordCache } from "./wordCache.js";

// ---------------------------------------------------------------------------
// نگاشتِ سطح (بالاتر، بعد از تعریفِ conversation) رو این‌جا صدا می‌زنیم —
// نگاه کن به LEVEL_BY_EN_WORD / lookupSavedWordLevel پایین‌ترِ همین فایل،
// دقیقاً بعد از «export const conversation».
function findInVocab(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return null;
  const hit = VOCAB.find((v) => normalizeWord(v.t[langCode]) === w);
  if (!hit) return null;
  return {
    pos: hit.pos,
    possiblePos: [hit.pos],
    posLabel: POS_FA[hit.pos] || hit.pos,
    possiblePosLabels: [POS_FA[hit.pos] || hit.pos],
    meaning: hit.meaningFa,
    meaningFa: hit.meaningFa,
    source: "vocab",
  };
}
// Looks up one tapped word's meaning, in this order:
//   1) the local VOCAB list (instant, fully offline)
//   2) a cached lookup from before (instant, fully offline)
//   3) the free translation chain (translateFree — Google → MyMemory →
//      Lingva → LibreTranslate, each one tried automatically if the last
//      failed/was unreachable)
// No AI backend involved anymore — this used to depend on an AI call for
// the word's part-of-speech, which meant the whole popover broke whenever
// that backend was asleep/unreachable. translateFree() itself never
// throws (see its own definition above): if literally every free service
// fails too, it just hands the original word back, so this function is
// never fully "cut off" — the popover always has *something* to show and
// save. Result is cached in localStorage per (word + language) so it only
// ever costs one network request per word per device.
export async function lookupWordMeaning({ word, sentence, langCode, nativeLang, aiSettings }) {
  const local = nativeLang === "fa" ? findInVocab(word, langCode) : null;
  if (local) return local;

  const cacheKey = `${langCode}:${nativeLang}:${normalizeWord(word)}`;
  const cache = loadWordCache();
  if (cache[cacheKey]) return { ...cache[cacheKey], source: "cache" };

  // aiSettings رو پاس می‌دیم تا وقتی هر ۴ سرویسِ رایگان (گوگل/مای‌مموری/
  // لینگوا/لیبره) بلاک/فیلتر باشن، به‌جای برگردوندنِ متنِ اصلی (ترجمه‌نشده)،
  // بک‌اندِ AI خودِ اپ به‌عنوانِ آخرین چاره امتحان بشه.
  const meaning = await translateFree(word, nativeLang || "fa", langCode, aiSettings);
  const result = { meaning: meaning || word };
  cache[cacheKey] = result;
  saveWordCache(cache);
  return { ...result, source: "translate" };
}
