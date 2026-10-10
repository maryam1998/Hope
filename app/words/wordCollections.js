// مجموعه‌های لغت
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { normalizeWord } from "./wordCache.js";

// ---------------------------------------------------------------------------
// Word Collections — lets a user bring in their own reference vocabulary
// list (e.g. a "504 Essential Words" book, a class word list, a personal
// deck for any language) and pick words from it in Story Builder.
//
// We deliberately don't ship any specific book's word list pre-loaded —
// published vocabulary books are copyrighted, so instead the user pastes
// in their own list (which they already have legal access to) and the app
// just gives them a structured, reusable, per-language "deck" built from
// it. One line per word, formats "word", "word - meaning", "word: meaning"
// are all understood.
// ---------------------------------------------------------------------------
const WORD_COLLECTIONS_KEY = "phrasebook-word-collections-v1";
export function loadWordCollections() {
  try {
    const raw = window.localStorage.getItem(WORD_COLLECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function saveWordCollectionsList(list) {
  try {
    window.localStorage.setItem(WORD_COLLECTIONS_KEY, JSON.stringify(list));
  } catch {}
}
function parseCollectionText(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*[-–:=]\s*(.+)$/);
      return m ? { term: m[1].trim(), meaning: m[2].trim() } : { term: line, meaning: "" };
    })
    .filter((w) => w.term);
}
export function addWordCollection({ langCode, title, rawText }) {
  const words = parseCollectionText(rawText);
  if (!title.trim() || !words.length) return null;
  const entry = {
    id: `${Date.now()}`,
    langCode,
    title: title.trim(),
    words,
    createdAt: new Date().toISOString(),
  };
  const list = loadWordCollections();
  list.unshift(entry);
  saveWordCollectionsList(list);
  return entry;
}
function deleteWordCollection(id) {
  saveWordCollectionsList(loadWordCollections().filter((c) => c.id !== id));
}
// Adds (or updates, if the term already exists) a single word inside an
// existing collection — this is what makes a collection "editable" instead
// of a one-time paste-and-done list.
export function addWordToCollectionEntry(id, term, meaning) {
  const t = (term || "").trim();
  if (!t) return null;
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.filter((w) => normalizeWord(w.term) !== normalizeWord(t));
  words.unshift({ term: t, meaning: (meaning || "").trim() });
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}
export function updateWordInCollectionEntry(id, originalTerm, patch) {
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.map((w) =>
    w.term === originalTerm
      ? { term: (patch.term ?? w.term).trim(), meaning: (patch.meaning ?? w.meaning ?? "").trim() }
      : w
  );
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}
export function removeWordFromCollectionEntry(id, term) {
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.filter((w) => w.term !== term);
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}
