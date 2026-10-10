import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sortSavedStories,
  sortWordListEntries,
  sortSavedWordEntries,
  SAVED_STORIES_SORT_OPTIONS,
  WORD_LIST_SORT_OPTIONS,
  SAVED_WORDS_SORT_OPTIONS,
} from "../app/sort/sortHelpers.js";

const story = (id, extra = {}) => ({ id, ...extra });
const ids = (list) => list.map((x) => x.id);

test("sortSavedStories: ورودی را تغییر نمی‌دهد (immutable)", () => {
  const input = [story(1, { savedAt: "2026-01-01" }), story(2, { savedAt: "2026-02-01" })];
  const snapshot = JSON.stringify(input);
  sortSavedStories(input, "newest");
  assert.equal(JSON.stringify(input), snapshot);
});

test("sortSavedStories: newest / oldest بر اساسِ savedAt", () => {
  const list = [
    story("a", { savedAt: "2026-01-01" }),
    story("b", { savedAt: "2026-03-01" }),
    story("c", { savedAt: "2026-02-01" }),
  ];
  assert.deepEqual(ids(sortSavedStories(list, "newest")), ["b", "c", "a"]);
  assert.deepEqual(ids(sortSavedStories(list, "oldest")), ["a", "c", "b"]);
});

test("sortSavedStories: کلیدِ ناشناخته مثلِ newest رفتار می‌کند", () => {
  const list = [story("a", { savedAt: "2026-01-01" }), story("b", { savedAt: "2026-03-01" })];
  assert.deepEqual(ids(sortSavedStories(list, "???")), ["b", "a"]);
  assert.deepEqual(ids(sortSavedStories(list, undefined)), ["b", "a"]);
});

test("sortSavedStories: علاقه‌مندی‌ها اول، بینِ هم‌گروه‌ها جدیدتر جلوتر", () => {
  const list = [
    story("old-fav", { favorite: true, savedAt: "2026-01-01" }),
    story("new-plain", { savedAt: "2026-05-01" }),
    story("new-fav", { favorite: true, savedAt: "2026-04-01" }),
  ];
  assert.deepEqual(ids(sortSavedStories(list, "favorite")), ["new-fav", "old-fav", "new-plain"]);
});

test("sortSavedStories: شمارشِ کلمه از paragraphs و از ytLines", () => {
  const withParagraphs = story("p", {
    paragraphs: [{ sentences: [{ text: "one two three" }, { text: "four five" }] }],
  });
  const withYt = story("y", { ytLines: [{ s: "a b" }, { s: "  c  " }] });
  const empty = story("e");
  const list = [empty, withParagraphs, withYt];
  assert.deepEqual(ids(sortSavedStories(list, "wordsDesc")), ["p", "y", "e"]);
  assert.deepEqual(ids(sortSavedStories(list, "wordsAsc")), ["e", "y", "p"]);
});

test("sortSavedStories: نام = title دستی، وگرنه لغاتِ انتخابی", () => {
  const list = [
    story("z", { title: "زرد" }),
    story("a", { selectedWords: ["الف", "ب"] }),
    story("m", { title: "  میم  " }),
  ];
  const asc = ids(sortSavedStories(list, "nameAsc"));
  const desc = ids(sortSavedStories(list, "nameDesc"));
  assert.deepEqual(asc, ["a", "z", "m"]); // الف < زرد < میم (ترتیبِ الفبای فارسی)
  assert.deepEqual(desc, [...asc].reverse());
});

test("sortSavedStories: savedAt نداشتن خطا نمی‌دهد", () => {
  assert.doesNotThrow(() => sortSavedStories([story(1), story(2, { savedAt: "2026-01-01" })], "oldest"));
  assert.deepEqual(sortSavedStories([], "newest"), []);
});

test("sortWordListEntries: default همان آرایه‌ی اصلی را برمی‌گرداند", () => {
  const list = [{ en: "b" }, { en: "a" }];
  assert.equal(sortWordListEntries(list, "default"), list);
  assert.equal(sortWordListEntries(list, undefined), list);
});

test("sortWordListEntries: الفبایی و سطحِ CEFR", () => {
  const list = [
    { en: "cat", level: "B2" },
    { en: "apple", level: "A1" },
    { en: "bird", level: "C1" },
    { en: "dog" }, // بدونِ سطح → آخر در حالتِ آسان←سخت
  ];
  assert.deepEqual(sortWordListEntries(list, "nameAsc").map((w) => w.en), ["apple", "bird", "cat", "dog"]);
  assert.deepEqual(sortWordListEntries(list, "nameDesc").map((w) => w.en), ["dog", "cat", "bird", "apple"]);
  assert.deepEqual(sortWordListEntries(list, "levelAsc").map((w) => w.en), ["apple", "cat", "bird", "dog"]);
  assert.deepEqual(sortWordListEntries(list, "levelDesc").map((w) => w.en), ["dog", "bird", "cat", "apple"]);
});

test("sortWordListEntries: ورودی را تغییر نمی‌دهد", () => {
  const list = [{ en: "b" }, { en: "a" }];
  sortWordListEntries(list, "nameAsc");
  assert.deepEqual(list.map((w) => w.en), ["b", "a"]);
});

test("sortSavedWordEntries: تاریخ و الفبا", () => {
  const list = [
    { word: "kiwi", savedAt: "2026-02-01" },
    { word: "fig", savedAt: "2026-03-01" },
    { word: "lime", savedAt: "2026-01-01" },
  ];
  assert.deepEqual(sortSavedWordEntries(list, "newest").map((w) => w.word), ["fig", "kiwi", "lime"]);
  assert.deepEqual(sortSavedWordEntries(list, "oldest").map((w) => w.word), ["lime", "kiwi", "fig"]);
  assert.deepEqual(sortSavedWordEntries(list, "nameAsc").map((w) => w.word), ["fig", "kiwi", "lime"]);
  assert.deepEqual(sortSavedWordEntries(list, "nameDesc").map((w) => w.word), ["lime", "kiwi", "fig"]);
});

test("گزینه‌های مرتب‌سازی: کلیدِ یکتا و برچسبِ فارسی/انگلیسی دارند", () => {
  for (const opts of [SAVED_STORIES_SORT_OPTIONS, WORD_LIST_SORT_OPTIONS, SAVED_WORDS_SORT_OPTIONS]) {
    const keys = opts.map((o) => o.key);
    assert.equal(new Set(keys).size, keys.length, "کلیدِ تکراری");
    for (const o of opts) {
      assert.ok(o.fa && o.en, `برچسبِ ناقص برای ${o.key}`);
    }
  }
});

test("هر کلیدِ منو در تابع case دارد (گزینه‌ی تازه بدونِ تست رد نمی‌شود)", () => {
  const knownStories = new Set(["favorite", "newest", "oldest", "wordsDesc", "wordsAsc", "nameAsc", "nameDesc"]);
  const knownWords = new Set(["default", "nameAsc", "nameDesc", "levelAsc", "levelDesc"]);
  const knownSaved = new Set(["newest", "oldest", "nameAsc", "nameDesc"]);
  for (const o of SAVED_STORIES_SORT_OPTIONS) assert.ok(knownStories.has(o.key), `کلیدِ تازه‌ی ${o.key} تست ندارد`);
  for (const o of WORD_LIST_SORT_OPTIONS) assert.ok(knownWords.has(o.key), `کلیدِ تازه‌ی ${o.key} تست ندارد`);
  for (const o of SAVED_WORDS_SORT_OPTIONS) assert.ok(knownSaved.has(o.key), `کلیدِ تازه‌ی ${o.key} تست ندارد`);
});
