import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countOccurrences,
  splitTextIntoSentenceStrings,
  enforceSentenceSplit,
  extractPdfPageTextFlat,
  extractPdfPageTextWithBreaks,
  STORY_LENGTHS,
  CONTENT_TYPES,
} from "../app/story/storyText.js";

test("countOccurrences: بدونِ حساسیت به بزرگی/کوچکیِ حروف", () => {
  assert.equal(countOccurrences("Run, run, RUN away", "run"), 3);
});

test("countOccurrences: کاراکترهای ویژه‌ی regex امن‌اند", () => {
  assert.equal(countOccurrences("a (b) c (b)", "(b)"), 2);
  assert.equal(countOccurrences("cost $5.00 and $5.00", "$5.00"), 2);
  assert.equal(countOccurrences("what? what?", "what?"), 2);
});

test("countOccurrences: ورودیِ خالی صفر است", () => {
  assert.equal(countOccurrences("", "x"), 0);
  assert.equal(countOccurrences("abc", ""), 0);
  assert.equal(countOccurrences(null, "x"), 0);
  assert.equal(countOccurrences("abc", "zzz"), 0);
});

test("splitTextIntoSentenceStrings: تقسیم روی . ! ? ؟", () => {
  assert.deepEqual(splitTextIntoSentenceStrings("Hi there. How are you? Fine!"), ["Hi there.", "How are you?", "Fine!"]);
  assert.deepEqual(splitTextIntoSentenceStrings("سلام. حالت چطوره؟ خوبم!"), ["سلام.", "حالت چطوره؟", "خوبم!"]);
});

test("splitTextIntoSentenceStrings: عددِ اعشاری پایانِ جمله نیست", () => {
  assert.deepEqual(splitTextIntoSentenceStrings("Pi is 3.14 roughly. Next one."), ["Pi is 3.14 roughly.", "Next one."]);
  const out = splitTextIntoSentenceStrings("The price rose to 20.15 dollars.");
  assert.deepEqual(out, ["The price rose to 20.15 dollars."]);
});

test("splitTextIntoSentenceStrings: علائمِ پشت‌سرهم به جمله می‌چسبند", () => {
  assert.deepEqual(splitTextIntoSentenceStrings("Really?! Yes..."), ["Really?!", "Yes..."]);
});

test("splitTextIntoSentenceStrings: ورودیِ خالی → آرایه‌ی خالی", () => {
  assert.deepEqual(splitTextIntoSentenceStrings(""), []);
  assert.deepEqual(splitTextIntoSentenceStrings("   "), []);
  assert.deepEqual(splitTextIntoSentenceStrings(null), []);
});

test("splitTextIntoSentenceStrings: بدونِ علامتِ پایان، یک جمله برمی‌گرداند", () => {
  assert.deepEqual(splitTextIntoSentenceStrings("no punctuation here"), ["no punctuation here"]);
});

test("splitTextIntoSentenceStrings: جمله‌ی خیلی بلند روی مرزِ کلمه و حداکثر ۴۰ کلمه‌ای می‌شکند", () => {
  const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
  const out = splitTextIntoSentenceStrings(words.join(" "));
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((s) => s.split(" ").length), [40, 40, 20]);
  assert.equal(out.join(" "), words.join(" "), "هیچ کلمه‌ای نباید گم یا تکرار شود");
});

test("splitTextIntoSentenceStrings: دقیقاً ۴۰ کلمه نمی‌شکند", () => {
  const text = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ") + ".";
  assert.equal(splitTextIntoSentenceStrings(text).length, 1);
});

test("enforceSentenceSplit: چند جمله‌ی چپانده‌شده در یک آیتم دوباره جدا می‌شود", () => {
  const input = [{ id: "p1", sentences: [{ text: "One. Two." }, { text: "Three!" }] }];
  const out = enforceSentenceSplit(input);
  assert.equal(out[0].id, "p1", "فیلدهای دیگرِ پاراگراف حفظ شود");
  assert.deepEqual(out[0].sentences, [{ text: "One." }, { text: "Two." }, { text: "Three!" }]);
});

test("enforceSentenceSplit: ورودیِ ناقص خطا نمی‌دهد", () => {
  assert.deepEqual(enforceSentenceSplit(null), []);
  assert.deepEqual(enforceSentenceSplit([{}]), [{ sentences: [] }]);
});

test("extractPdfPageTextFlat: آیتم‌ها بدونِ فاصله‌ی اضافه به هم می‌چسبند، سرِ خط space", () => {
  const content = {
    items: [
      { str: "w" }, { str: "as", hasEOL: true },
      { str: "a " }, { str: "ti" }, { str: "me", hasEOL: true },
    ],
  };
  assert.equal(extractPdfPageTextFlat(content), "was a time");
});

test("extractPdfPageTextFlat: ورودیِ خالی", () => {
  assert.equal(extractPdfPageTextFlat(null), "");
  assert.equal(extractPdfPageTextFlat({ items: [] }), "");
});

test("extractPdfPageTextWithBreaks: فاصله‌ی عمودیِ بزرگ = پاراگرافِ جدید", () => {
  const line = (str, y) => [{ str, hasEOL: true, transform: [1, 0, 0, 1, 0, y] }];
  const content = {
    items: [
      ...line("line one", 100),
      ...line("line two", 88),
      ...line("line three", 76),
      ...line("new paragraph", 40), // فاصله ۳۶ ≫ ۱.۵×۱۲
    ],
  };
  assert.equal(extractPdfPageTextWithBreaks(content), "line one\nline two\nline three\n\nnew paragraph");
});

test("extractPdfPageTextWithBreaks: خطوطِ خالی حذف می‌شوند و ورودیِ خالی ''", () => {
  assert.equal(extractPdfPageTextWithBreaks(null), "");
  assert.equal(extractPdfPageTextWithBreaks({ items: [{ str: "  ", hasEOL: true }] }), "");
});

test("extractPdfPageTextWithBreaks: آخرین خطِ بدونِ hasEOL هم گرفته می‌شود", () => {
  const content = { items: [{ str: "a", hasEOL: true, transform: [1, 0, 0, 1, 0, 10] }, { str: "b", transform: [1, 0, 0, 1, 0, 0] }] };
  assert.equal(extractPdfPageTextWithBreaks(content), "a\nb");
});

test("STORY_LENGTHS / CONTENT_TYPES: کلیدِ یکتا و فیلدهای لازم", () => {
  for (const list of [STORY_LENGTHS, CONTENT_TYPES]) {
    const keys = list.map((x) => x.key);
    assert.equal(new Set(keys).size, keys.length);
  }
  for (const l of STORY_LENGTHS) {
    assert.ok(l.tokens > 0 && l.paragraphMin <= l.paragraphMax, l.key);
  }
  for (const c of CONTENT_TYPES) assert.ok(c.prompt && c.label && c.labelEn, c.key);
  const tokens = STORY_LENGTHS.map((l) => l.tokens);
  assert.deepEqual(tokens, [...tokens].sort((a, b) => a - b), "طولِ بلندتر باید توکنِ بیشتری بدهد");
});
