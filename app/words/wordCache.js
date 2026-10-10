// کش لغت
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ---------------------------------------------------------------------------
// Word lookup — click any word inside a phrase to see its meaning + role.
// Strategy: 1) check the local VOCAB list (instant, free)
//           2) fall back to the AI backend, with a localStorage cache so the
//              same word is never re-requested twice on this device.
// ---------------------------------------------------------------------------
const WORD_CACHE_KEY = "phrasebook-word-lookup-cache-v1";
export function normalizeWord(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
}
export function loadWordCache() {
  try {
    const raw = window.localStorage.getItem(WORD_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
export function saveWordCache(cache) {
  try {
    window.localStorage.setItem(WORD_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
