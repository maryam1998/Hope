// scripts/convert-data.mjs
//
// این اسکریپت فایل‌های .js پروژه‌ی React را به JSON تبدیل می‌کند
// تا Flutter بتواند از assets بخواند.
//
// اجرا: node scripts/convert-data.mjs
// ورودی: hope-data/*.js  (فایل‌های خام پروژه‌ی Hope)
// خروجی: assets/data/*.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const INPUT_DIR = join(ROOT, 'hope-data');
const OUTPUT_DIR = join(ROOT, 'assets', 'data');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

/// یک فایل .js با ساختار `export const NAME = [...]` را می‌خواند
/// و آرایه‌ی خالص برمی‌گرداند.
function parseExportArray(filePath, exportName) {
  const src = readFileSync(filePath, 'utf8');
  // پیدا کردن `export const NAME = [...]`
  const re = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`Could not find ${exportName} in ${filePath}`);
  // ارزیابی امن — داده‌ی ثابت است، نه کد اجرایی
  return Function(`"use strict"; return (${m[1]});`)();
}

function writeJson(name, data) {
  const out = join(OUTPUT_DIR, name);
  writeFileSync(out, JSON.stringify(data), 'utf8');
  const sizeKb = (Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1);
  console.log(`✓ ${name}  (${sizeKb} KB)`);
}

// ═══════════════════════════════════════════════════════════════════
// DAILY_CONVERSATIONS + THEMATIC_CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════
try {
  const dailyPath = join(INPUT_DIR, 'DAILY_CONVERSATIONS.js');
  const daily = parseExportArray(dailyPath, 'DAILY_CONVERSATIONS');
  const thematic = parseExportArray(dailyPath, 'THEMATIC_CONVERSATIONS');
  writeJson('daily_conversations.json', daily);
  writeJson('thematic_conversations.json', thematic);
} catch (e) {
  console.warn('⚠ daily conversations skipped:', e.message);
}

// ═══════════════════════════════════════════════════════════════════
// DAILY_WORDS
// ═══════════════════════════════════════════════════════════════════
try {
  const wordsPath = join(INPUT_DIR, 'DAILY_WORDS.js');
  const words = parseExportArray(wordsPath, 'DAILY_WORDS');
  writeJson('daily_words.json', words);
} catch (e) {
  console.warn('⚠ daily words skipped:', e.message);
}

console.log('\n✅ Done — output in assets/data/');
