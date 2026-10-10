import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runWithConcurrencyLimit,
  findWholeWordIndex,
  stripAIReasoning,
  looksLikelyMistranslated,
} from "../app/translate/translateService.js";

test("runWithConcurrencyLimit: ترتیبِ نتایج = ترتیبِ ورودی", async () => {
  const out = await runWithConcurrencyLimit([30, 5, 15, 1], 2, async (ms, i) => {
    await new Promise((r) => setTimeout(r, ms));
    return `${i}:${ms}`;
  });
  assert.deepEqual(out, ["0:30", "1:5", "2:15", "3:1"]);
});

test("runWithConcurrencyLimit: هیچ‌وقت بیشتر از limit کار هم‌زمان اجرا نمی‌شود", async () => {
  let running = 0;
  let peak = 0;
  await runWithConcurrencyLimit(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
  });
  assert.equal(peak, 3);
});

test("runWithConcurrencyLimit: لیستِ خالی و limit نامعتبر", async () => {
  assert.deepEqual(await runWithConcurrencyLimit([], 5, async () => 1), []);
  assert.deepEqual(await runWithConcurrencyLimit([1, 2], 0, async (x) => x * 2), [2, 4]);
});

test("runWithConcurrencyLimit: خطای worker به بیرون می‌رسد", async () => {
  await assert.rejects(
    runWithConcurrencyLimit([1, 2, 3], 2, async (x) => {
      if (x === 2) throw new Error("boom");
      return x;
    }),
    /boom/
  );
});

test("findWholeWordIndex: وسطِ کلمه‌ی دیگر پیدا نمی‌شود", () => {
  assert.equal(findWholeWordIndex("the woman saw a man", "man"), 16);
  assert.equal(findWholeWordIndex("woman", "man"), -1);
});

test("findWholeWordIndex: بزرگی/کوچکیِ حروف، علائم و یونیکد", () => {
  assert.equal(findWholeWordIndex("Hello, World!", "world"), 7);
  assert.equal(findWholeWordIndex("این یک تست است", "تست"), 7);
  assert.equal(findWholeWordIndex("تستی", "تست"), -1);
});

test("findWholeWordIndex: عبارتِ چندکلمه‌ای و ورودیِ خالی", () => {
  assert.equal(findWholeWordIndex("give up now", "give up"), 0);
  assert.equal(findWholeWordIndex("", "x"), -1);
  assert.equal(findWholeWordIndex("abc", ""), -1);
});

test("stripAIReasoning: بلوکِ <think> حذف می‌شود، حتی اگر بسته نشده باشد", () => {
  assert.equal(stripAIReasoning("<think>hmm</think>Bonjour"), "Bonjour");
  assert.equal(stripAIReasoning("<thinking>x\ny</thinking>  سلام "), "سلام");
  assert.equal(stripAIReasoning("Answer<think>never closed"), "Answer");
  assert.equal(stripAIReasoning(null), "");
});

test("looksLikelyMistranslated: خروجیِ خالی، شبیهِ استدلالِ AI، و ترجمه‌نشده", () => {
  assert.equal(looksLikelyMistranslated("Hello", "", "fa", "en"), true);
  assert.equal(looksLikelyMistranslated("Hello", "Thinking process: the user wants me to translate", "fa", "en"), true);
  assert.equal(looksLikelyMistranslated("Hello", "hello", "fa", "en"), true);
});

test("looksLikelyMistranslated: ترجمه‌ی سالم false است", () => {
  assert.equal(looksLikelyMistranslated("Hello", "سلام", "fa", "en"), false);
});
