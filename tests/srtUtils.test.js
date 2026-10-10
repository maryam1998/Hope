import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSRT, serializeSRT } from "../app/srt/srtUtils.js";

const SAMPLE = `1
00:00:01,000 --> 00:00:03,500
Hello there.

2
00:00:04,000 --> 00:00:06,000
Line one
Line two
`;

test("parseSRT: بلوک‌ها، تایم‌کد و متنِ چندخطی", () => {
  const e = parseSRT(SAMPLE);
  assert.equal(e.length, 2);
  assert.deepEqual(e[0], { index: 1, start: "00:00:01,000", end: "00:00:03,500", text: "Hello there." });
  assert.equal(e[1].text, "Line one\nLine two");
  assert.equal(e[1].index, 2);
});

test("parseSRT: ورودیِ خالی/نامعتبر آرایه‌ی خالی می‌دهد", () => {
  assert.deepEqual(parseSRT(""), []);
  assert.deepEqual(parseSRT(null), []);
  assert.deepEqual(parseSRT(undefined), []);
  assert.deepEqual(parseSRT("just some text\nwithout timecodes"), []);
});

test("parseSRT: پایانِ خطِ ویندوزی (CRLF) و مک قدیمی (CR) را می‌فهمد", () => {
  const crlf = SAMPLE.replace(/\n/g, "\r\n");
  const cr = SAMPLE.replace(/\n/g, "\r");
  assert.equal(parseSRT(crlf).length, 2);
  assert.equal(parseSRT(cr).length, 2);
  assert.equal(parseSRT(crlf)[1].text, "Line one\nLine two");
});

test("parseSRT: شماره‌ی بلوک اختیاری است و ایندکس خودکار ساخته می‌شود", () => {
  const e = parseSRT("00:00:01,000 --> 00:00:02,000\nA\n\n00:00:03,000 --> 00:00:04,000\nB");
  assert.deepEqual(e.map((x) => x.index), [1, 2]);
  assert.deepEqual(e.map((x) => x.text), ["A", "B"]);
});

test("parseSRT: بلوکِ بدونِ --> نادیده گرفته می‌شود", () => {
  const e = parseSRT("1\nbroken line\nmore\n\n2\n00:00:01,000 --> 00:00:02,000\nok");
  assert.equal(e.length, 1);
  assert.equal(e[0].text, "ok");
});

test("serializeSRT: شماره‌گذاریِ دوباره از ۱ و فرمتِ استاندارد", () => {
  const out = serializeSRT([
    { index: 7, start: "00:00:01,000", end: "00:00:02,000", text: "سلام" },
    { index: 9, start: "00:00:03,000", end: "00:00:04,000", text: "دنیا" },
  ]);
  assert.equal(out, "1\n00:00:01,000 --> 00:00:02,000\nسلام\n\n2\n00:00:03,000 --> 00:00:04,000\nدنیا\n");
});

test("parse ∘ serialize: رفت‌وبرگشت متن و تایم‌کدها را حفظ می‌کند", () => {
  const first = parseSRT(SAMPLE);
  const second = parseSRT(serializeSRT(first));
  assert.deepEqual(second, first);
});

test("serializeSRT: لیستِ خالی رشته‌ی خالی می‌دهد", () => {
  assert.equal(serializeSRT([]), "");
});
