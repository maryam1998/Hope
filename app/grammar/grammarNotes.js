// یادداشت‌های گرامر و معلم گرامر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { englishLangName } from "../constants/languages.js";
import { AI_REASONING_RE, stripAIReasoning, translateFree } from "../translate/translateService.js";
import { aiNetMsg, callAI } from "../ai/callAI.js";

// ---------------------------------------------------------------------------
// Grammar notes — detailed, per-word grammar explanations the user chose to
// keep ("افزودن به یادگیری گرامر"), plus AI-checked practice sentences from
// the Grammar tab's chat. Stored per-device, global across every story —
// same pattern as SAVED_STORY_WORDS_KEY above.
// ---------------------------------------------------------------------------
export const GRAMMAR_NOTES_KEY = "phrasebook-grammar-notes-v1";
export const GRAMMAR_NOTES_CHANGED_EVENT = "phrasebook:grammarNotesChanged";
export function loadGrammarNotes() {
  try {
    const raw = window.localStorage.getItem(GRAMMAR_NOTES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function saveGrammarNote({ langCode, word, sentence, markdown }) {
  if (!markdown) return null;
  const list = loadGrammarNotes();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    langCode,
    word: word || "",
    sentence: sentence || "",
    markdown,
    savedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
  return entry;
}
// Replaces a saved note's markdown in place — used to quietly upgrade a
// basic, offline-built note (word + translation + sentence, saved
// instantly with no AI/internet needed) into the AI's fuller grammar
// breakdown once/if that finishes loading in the background. The note is
export function removeGrammarNote(id) {
  const list = loadGrammarNotes().filter((n) => n.id !== id);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// پاک‌کردنِ همه‌ی یادداشت‌های گرامریِ ذخیره‌شده، یک‌جا.
function clearAllGrammarNotes() {
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// حذفِ دسته‌ایِ چند یادداشتِ انتخاب‌شده با آی‌دی — برای حالتِ «انتخاب» در
// تبِ گرامر (حذف براساسِ تاریخچه، مثلِ مدیریتِ فایل).
export function removeGrammarNotesBulk(ids) {
  if (!ids || !ids.size) return;
  const list = loadGrammarNotes().filter((n) => !ids.has(n.id));
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// همون منطقِ ادغامِ mergeSavedStoryWordsFromCloud بالا، برای یادداشت‌های
// گرامری — چیزی که ابری داشت و محلی نداشت اضافه می‌شه، چیزی که محلی داشت
// دست‌نخورده می‌مونه؛ هیچ‌وقت overwrite کامل نمی‌شه.
export function mergeGrammarNotesFromCloud(cloudList) {
  if (!Array.isArray(cloudList) || !cloudList.length) return;
  const local = loadGrammarNotes();
  const localIds = new Set(local.map((n) => n.id));
  const additions = cloudList.filter((n) => n && n.id && !localIds.has(n.id));
  if (!additions.length) return;
  const merged = [...additions, ...local].sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// never lost or left unsaved just because the AI backend is slow or down.
export function updateGrammarNoteMarkdown(id, markdown) {
  if (!markdown) return;
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], markdown };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// Appends one Q&A pair to a saved note's own follow-up thread. Since the
// note itself is already saved, anything asked here is automatically
// persisted along with it — no separate "save" step needed.
export function appendGrammarNoteThread(id, { question, answer }) {
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const thread = Array.isArray(list[idx].thread) ? list[idx].thread : [];
  list[idx] = { ...list[idx], thread: [...thread, { question, answer }] };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// Grammar-detail lookup (word popover → "Add to grammar learning"), rewritten so this ONE spot no
// longer depends on the AI knowing how to write fluently in the learner's native language:
// the AI always analyzes the sentence in fixed English, wrapping every real ${langLabel} example
// sentence in §§...§§ sentinels so it's protected; then localizeGrammarDetailMarkdown() below runs
// the English explanatory text (and only that) through the app's existing free online translation
// pipeline (translateFree — Google/MyMemory/Lingva/LibreTranslate, the same one lookupWordMeaning
// already uses) to turn it into whatever language the learner picked as nativeLang. No AI call is
// used for the localization step itself; askGrammarTeacher (the practice chat) is unrelated and
// intentionally left as-is.
export async function lookupWordGrammarDetail({ word, sentence, langCode, nativeLang, nativeLabel, aiSettings, targetOrder }) {
  const langLabel = englishLangName(langCode);
  const otherLangsLabel = (targetOrder || [])
    .filter((c) => c !== langCode && c !== nativeLang)
    .map((c) => englishLangName(c))
    .join(", ");
  const prompt =
    `You are a language teacher explaining a grammar point to a beginner language learner.\n` +
    `User's native language: ${nativeLabel || nativeLang}\n` +
    `Language they are learning: ${langLabel}\n` +
    `Other languages they are learning simultaneously: ${otherLangsLabel || "None"}\n\n` +
    `Sentence: "${sentence}"\n` +
    `Word the user clicked on: "${word}"\n\n` +
    `Please explain the grammar point in ${nativeLang}. Follow the structure below, but make the explanation natural and fluent:\n\n` +
    `1. Give a natural translation of the sentence in ${nativeLang}.\n` +
    `2. Explain the role of the word "${word}" in this sentence and why it appears in this form.\n` +
    `3. Explain the main grammar point demonstrated by this sentence like a patient teacher. If there is a similar or different rule in the other languages (${otherLangsLabel}), mention it.\n` +
    `4. Give one additional example (different from the original sentence) that demonstrates the same point, along with its translation into ${nativeLang}.\n` +
    `5. Provide a simple trick to help remember this rule.\n\n` +
    `Keep the response short and useful (maximum 4–5 short paragraphs). Do not use technical terminology unless necessary.`;

  const text = stripAIReasoning(await callAI({ prompt, maxTokens: 900, aiSettings }));
  // سرویس به‌جای توضیح، «فرایندِ فکرش» را برگردانده → جوابِ خراب؛ نشان نده (دکمه‌ی تلاش دوباره می‌آید)
  if (!text || AI_REASONING_RE.test(text)) throw new Error(`ai-backend-error: ${aiNetMsg()}`);
  return text.trim();
}
// Localizes lookupWordGrammarDetail()'s fixed-English markdown into `nativeLang` using free online
// translation (translateFree) — no AI call. §§-wrapped ${langLabel} example sentences are left
// completely untouched (unwrapped, not translated); markdown headers keep their "## N." numbering
// and only the title text is translated; "**word** — meaning" bullets keep the bolded word as-is
// and translate only the meaning/role text after the dash; everything else is translated as a whole
// line. If nativeLang is English (or missing), no translation calls are made at all.
async function localizeGrammarDetailMarkdown(englishText, nativeLang, aiSettings) {
  const text = String(englishText || "");
  if (!nativeLang || nativeLang === "en") return text.replace(/§§/g, "");

  const lines = text.split(/\r?\n/);
  const translatedLines = await Promise.all(
    lines.map(async (raw) => {
      const line = raw.trim();
      if (!line) return raw;

      // A full ${langLabel} example sentence, protected by the AI — unwrap, never translate.
      const wrapped = line.match(/^§§(.+)§§$/);
      if (wrapped) return wrapped[1];

      // "## N. Title" — keep the "## N." numbering, translate just the title.
      const headerMatch = line.match(/^(#{1,3}\s*\d*\.?\s*)(.+)$/);
      if (headerMatch) {
        const [, prefix, title] = headerMatch;
        const translatedTitle = await translateFree(title, nativeLang, "en", aiSettings);
        return prefix + (translatedTitle || title);
      }

      // "- **word** — meaning, role" — keep the bolded ${langLabel} word untouched, translate
      // only the meaning/role text that follows the dash.
      const bulletMatch = line.match(/^(-\s*\*\*.+?\*\*\s*[—-]\s*)(.+)$/);
      if (bulletMatch) {
        const [, prefix, rest] = bulletMatch;
        const translatedRest = await translateFree(rest, nativeLang, "en", aiSettings);
        return prefix + (translatedRest || rest);
      }

      // Plain English commentary line — translate the whole thing.
      const translated = await translateFree(line, nativeLang, "en", aiSettings);
      return translated || line;
    })
  );

  return translatedLines.join("\n").replace(/§§/g, "");
}
// Acts as the AI "teacher" in the Grammar tab's practice chat. Two modes,
// decided by the AI itself from the message + recent history:
//   - a NEW sentence to check → full correction + word-by-word + examples
//   - a FOLLOW-UP question about the previous explanation (e.g. "چرا will
//     نه؟") → just answer the question directly, conversationally, no need
//     to redo the whole structured breakdown.
export async function askGrammarTeacher({ userSentence, langCode, nativeLang, nativeLabel, aiSettings, history, targetOrder }) {
  const label = nativeLabel || "Persian";
  // برای خودِ پرامپتِ انگلیسی، از نامِ انگلیسیِ زبون استفاده می‌کنیم (نه
  // برچسبِ فارسیِ LANGUAGES) — چون قاطی‌کردنِ یه کلمه‌ی فارسی وسطِ یه
  // دستورالعملِ انگلیسی باعث می‌شد بعضی سرویس‌های سریع/رایگانِ زنجیره
  // (groq/mistral/...) درست تشخیصش ندن و به‌جاش خودشون پیش‌فرض برن سراغِ
  // انگلیسی برای مثال‌ها — دقیقاً همون باگی که کاربر گزارش کرد.
  const langLabel = englishLangName(langCode);
  const otherLangsLabel =
    (targetOrder || [])
      .filter((c) => c !== langCode && c !== nativeLang)
      .map((c) => englishLangName(c))
      .join(", ") || "None";
  const historyText =
    (history || [])
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Learner" : "Teacher"}: ${m.text}`)
      .join("\n") || "None";
  const prompt =
    `You are a friendly, knowledgeable AI chat assistant inside a language-learning app — talk with the learner the same natural way any general-purpose AI chat assistant would. You're not limited to grammar; you can help with anything they bring up. On top of that, you're great at ${langLabel} practice.\n\n` +
    `Learner's native language: ${label}. Language they're currently practicing: ${langLabel}. Other languages they study: ${otherLangsLabel}.\n\n` +
    `Recent conversation:\n${historyText}\n\n` +
    `Learner just wrote: "${userSentence}"\n\n` +
    `How to respond:\n` +
    `- If this reads like a sentence they wrote in ${langLabel} to practice: check it warmly. Say if it's correct or not, give the corrected version if needed, explain briefly and simply why (in ${label}) — especially if the mistake looks like it came from mixing ${label} and ${langLabel} structure — then add one more example sentence in ${langLabel} with a ${label} translation.\n` +
    `- Otherwise, just answer naturally, like a normal, capable AI assistant would — any topic, any question, no restriction. Weave in an example phrase in ${langLabel} with translation only if it genuinely fits.\n` +
    `- Default to ${langLabel} for any language-practice content (translated into ${label}); only bring in ${otherLangsLabel} or English if the learner specifically asks about them or it clearly helps.\n` +
    `- CRITICAL: this learner is practicing ${langLabel}, NOT English. Every example sentence in your reply MUST be in ${langLabel} (unless ${langLabel} literally is English, or the learner explicitly asked about English/another language). Never default to English examples just out of habit — that is a mistake.\n` +
    `- Write in ${label}. Keep sentences in both languages clean and well-ordered, never jumbled. Keep the reply clear, well-organized, and not too long.`;

  const text = stripAIReasoning(await callAI({ prompt, maxTokens: 1200, aiSettings }));
  if (!text || AI_REASONING_RE.test(text)) throw new Error(`ai-backend-error: ${aiNetMsg()}`);
  return text.trim();
}
