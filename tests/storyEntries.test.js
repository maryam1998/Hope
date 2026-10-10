import { test } from "node:test";
import assert from "node:assert/strict";
import { getStoryEntryFullText, getStoryEntryAudioKey, getStoryEntryPreview } from "../app/story/storyEntries.js";

const entry = (extra = {}) => ({
  storyLang: "en",
  paragraphs: [{ sentences: [{ text: "Hello world." }, { text: "Second one." }] }, { sentences: [{ text: "Third." }] }],
  ...extra,
});

test("getStoryEntryFullText: جمله‌ها با space به هم وصل می‌شوند", () => {
  assert.equal(getStoryEntryFullText(entry()), "Hello world. Second one. Third.");
});

test("getStoryEntryFullText: ورودیِ ناقص یا زیرنویسِ یوتیوب → ''", () => {
  assert.equal(getStoryEntryFullText(null), "");
  assert.equal(getStoryEntryFullText({}), "");
  assert.equal(getStoryEntryFullText(entry({ ytSession: true })), "");
});

test("getStoryEntryFullText: جمله‌ی ناقص (null) خطا نمی‌دهد", () => {
  assert.equal(getStoryEntryFullText({ paragraphs: [{ sentences: [null, { text: "x" }] }, {}] }), " x");
});

test("getStoryEntryAudioKey: locale::text، و en-US پیش‌فرض برای زبانِ ناشناخته", () => {
  assert.equal(getStoryEntryAudioKey(entry()), "en-US::Hello world. Second one. Third.");
  assert.equal(getStoryEntryAudioKey(entry({ storyLang: "fa" })), "fa-IR::Hello world. Second one. Third.");
  assert.equal(getStoryEntryAudioKey(entry({ storyLang: "xx" })), "en-US::Hello world. Second one. Third.");
});

test("getStoryEntryAudioKey: متنِ خالی → null", () => {
  assert.equal(getStoryEntryAudioKey({ paragraphs: [] }), null);
  assert.equal(getStoryEntryAudioKey(null), null);
});

test("getStoryEntryPreview: برش با … و حدِ پیش‌فرض ۷۰", () => {
  const long = entry({ paragraphs: [{ sentences: [{ text: "a".repeat(200) }] }] });
  const p = getStoryEntryPreview(long);
  assert.equal(p, "a".repeat(70) + "…");
  assert.equal(getStoryEntryPreview(long, 10), "a".repeat(10) + "…");
});

test("getStoryEntryPreview: متنِ کوتاه بدونِ … و متنِ خالی ''", () => {
  assert.equal(getStoryEntryPreview(entry()), "Hello world. Second one. Third.");
  assert.equal(getStoryEntryPreview({}), "");
});
