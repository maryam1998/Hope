// مثال‌های لغت
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { LANGUAGES } from "../constants/languages.js";
import { callAI } from "../ai/callAI.js";
import { normalizeWord } from "./wordCache.js";

// ---------------------------------------------------------------------------
// مثال‌های ساخته‌شده‌ی هوش مصنوعی برای هر لغت/اصطلاح — کش می‌شن روی دستگاه
// تا هم دوباره از سرور خواسته نشن، هم وقتی مثالِ تازه‌ای ساخته می‌شه، لیستِ
// مثال‌های قبلی به AI داده بشه تا از تکرار پرهیز کنه. کلید هر ورودی، ترکیبِ
// زبان + خودِ لغت (نرمال‌شده) است؛ هر ورودی می‌تونه چند مثال و ترجمه‌ی
// هرکدوم به زبان‌های مختلف رو نگه داره.
export const WORD_EXAMPLES_KEY = "phrasebook-word-examples-v1";
// وقتی مثالی ساخته/ترجمه می‌شه دیسپچ می‌شه — هم برای رفرش کامپوننت‌هایی که
// نشونش می‌دن، هم برای اینکه افکتِ ذخیره‌ی خودکار (پایینِ فایل) بفهمه یه
// تغییری افتاده و باید نسخه‌ی ابری رو هم به‌روز کنه — دقیقاً همون الگویی که
// برای لغاتِ ذخیره‌شده/یادداشت‌های گرامر استفاده شده، چون قبلاً این مثال‌ها
// فقط توی localStorage همین گوشی می‌موندن و با پاک‌شدنِ کش یا عوض‌کردنِ
// دستگاه از دست می‌رفتن.
export const WORD_EXAMPLES_CHANGED_EVENT = "phrasebook:wordExamplesChanged";
export function loadAllWordExamples() {
  try {
    const raw = window.localStorage.getItem(WORD_EXAMPLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function wordExamplesKey(word, langCode) {
  return `${langCode}::${normalizeWord(word)}`;
}
export function loadWordExamples(word, langCode) {
  const all = loadAllWordExamples();
  return all[wordExamplesKey(word, langCode)] || [];
}
export function saveWordExample(word, langCode, exampleText) {
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: exampleText,
    translations: {},
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
  return entry;
}
export function updateWordExampleTranslation(word, langCode, exampleId, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const idx = list.findIndex((e) => e.id === exampleId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], translations: { ...(list[idx].translations || {}), [targetLangCode]: translatedText.trim() } };
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
}
// دکمه‌ی «رفرشِ مثال»: وقتی هوش‌مصنوعی به‌جای یه جمله‌ی مثالِ تمیز، چیزِ
// غلطی (مثلاً خودِ متنِ خامِ فکرکردنش) ساخته، به‌جای اضافه‌کردنِ یه مثالِ
// تازه *در کنارِ* همون مثالِ خراب، همینِ رکورد رو با متنِ جدید جایگزین
// می‌کنیم — id همون id قبلی می‌مونه (پس جایگاهش تویِ لیست عوض نمی‌شه)، ولی
// translations خالی می‌شه چون ترجمه‌های قبلی مالِ متنِ قدیمی بودن و دیگه
// معتبر نیستن.
export function replaceWordExample(word, langCode, exampleId, newText) {
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const idx = list.findIndex((e) => e.id === exampleId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], text: newText, translations: {} };
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
}
// نسخه‌ی ابریِ مثال‌ها رو با نسخه‌ی محلی ادغام می‌کنه (نه جایگزینش) — هر
// مثالی که یا فقط محلی بود یا فقط ابری، نگه داشته می‌شه؛ چیزی گم نمی‌شه.
export function mergeWordExamplesFromCloud(cloudAll) {
  if (!cloudAll || typeof cloudAll !== "object") return;
  const local = loadAllWordExamples();
  let changed = false;
  Object.keys(cloudAll).forEach((key) => {
    const cloudList = Array.isArray(cloudAll[key]) ? cloudAll[key] : [];
    const localList = local[key] || [];
    const localIds = new Set(localList.map((e) => e.id));
    const additions = cloudList.filter((e) => e && e.id && !localIds.has(e.id));
    if (additions.length) {
      local[key] = [...localList, ...additions];
      changed = true;
    }
  });
  if (!changed) return;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(local));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
}
// از هوش مصنوعی یه مثالِ واقعی، امروزی و پرکاربرد برای یه لغت/اصطلاح خاص
// می‌خواد — و صریحاً می‌گیم چه مثال‌هایی قبلاً ساخته شدن تا تکراری نسازه.
export async function generateWordExample({ word, langCode, meaningNative, nativeLabel, existingExamples, aiSettings }) {
  const langLabel = (typeof LANGUAGES !== "undefined" && LANGUAGES.find((l) => l.code === langCode)?.label) || langCode;
  const avoidBlock = existingExamples && existingExamples.length
    ? `Do NOT reuse or closely paraphrase any of these already-used examples for this same word:\n${existingExamples
        .map((e, i) => `${i + 1}. ${e}`)
        .join("\n")}\n\n`
    : "";
  const prompt =
    `Write exactly ONE natural example sentence in ${langLabel} that uses the word/expression "${word}"` +
    (meaningNative ? ` (its ${nativeLabel || "native-language"} meaning is: "${meaningNative}")` : "") +
    ` in a way that reflects REAL, current, everyday usage — the kind of sentence a native speaker might actually say or write today, ` +
    `optionally touching on everyday life, technology, or something plausibly connected to current news/world events. Avoid textbook-sounding, generic sentences. ` +
    `Keep it natural length (roughly 8-20 words), grammatically correct, and appropriate for a language learner to study.\n\n` +
    avoidBlock +
    `Respond with ONLY the example sentence itself in ${langLabel} — no quotes, no translation, no numbering, no explanation, nothing else.`;
  const result = await callAI({ prompt, maxTokens: 150, retries: 1, aiSettings });
  return String(result || "")
    .replace(/^["'«»]+|["'«».\s]+$/g, "")
    .trim();
}
