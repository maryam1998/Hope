// ابزارهای تقسیم متن داستان و PDF
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { GLOBAL_TRANSLATE_CONCURRENCY, runWithConcurrencyLimit, translateFree } from "../translate/translateService.js";

// ---------------------------------------------------------------------------
// Story Builder — pick words, AI writes a story that repeats each word
// several times (in different forms/meanings), reads it aloud, then quizzes
// the user; wrong answers feed back into which words get suggested next time.
// ---------------------------------------------------------------------------
export function countOccurrences(story, word) {
  if (!story || !word) return 0;
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = story.match(new RegExp(escaped, "gi"));
  return matches ? matches.length : 0;
}
// طولِ هر گزینه، تقریبی: «کوتاه» ≈ ۱ تا ۲ پاراگراف (۴-۶ جمله‌ای)، «متوسط» ≈
// ۲ تا ۳ پاراگراف (۵-۸ جمله‌ای)، «بلند» ≈ ۴ تا ۶ پاراگراف (۶-۱۰ جمله‌ای).
// عددِ tokens یعنی سقفِ توکنِ خروجی‌ای که به AI اجازه می‌دیم برای هر تلاش
// مصرف کنه (نه چیزی که همیشه پر می‌شه) — این سقف‌ها نسبت به قبل حدودِ ۲۵٪
// کم شدن (قبلاً ۱۴۰۰/۲۵۰۰/۴۲۰۰ بود) چون فاصله‌ی خالیِ زیادی نسبت به حجمِ
// واقعیِ JSONِ خروجی (پاراگراف‌ها + ۵ سوال) داشتن؛ اگه برای یه زبانِ خاص
// (مثلاً زبان‌هایی با توکن‌به‌ازای‌حرفِ بیشتر) بازم truncation دیدی، همینجا
// بالا ببرشون.
export const STORY_LENGTHS = [
  { key: "short", label: "کوتاه", labelEn: "Short", paragraphs: "1-2", paragraphMin: 1, paragraphMax: 2, sentencesHint: "short, roughly 4-6 sentences per paragraph", tokens: 1100 },
  { key: "medium", label: "متوسط", labelEn: "Medium", paragraphs: "2-3", paragraphMin: 2, paragraphMax: 3, sentencesHint: "medium length, roughly 5-8 sentences per paragraph", tokens: 1900 },
  { key: "long", label: "بلند", labelEn: "Long", paragraphs: "4-6", paragraphMin: 4, paragraphMax: 6, sentencesHint: "long, roughly 6-10 sentences per paragraph", tokens: 3200 },
];
export const CONTENT_TYPES = [
  { key: "general", label: "عمومی", labelEn: "General", prompt: "a general, everyday short story" },
  { key: "news", label: "خبری", labelEn: "News", prompt: "a short news-style report, written like a news article" },
  { key: "psychology", label: "روان‌شناسی", labelEn: "Psychology", prompt: "a short piece exploring a psychology or self-understanding theme" },
  { key: "children", label: "کودکانه", labelEn: "Children's", prompt: "a simple, gentle children's story" },
  { key: "funny", label: "خنده‌دار", labelEn: "Funny", prompt: "a lighthearted, funny, comedic story with a humorous twist" },
  { key: "mystery", label: "رازآلود و ترسناک", labelEn: "Mystery & scary", prompt: "a suspenseful, mysterious, slightly scary story with an eerie atmosphere" },
  { key: "crime", label: "جنایی", labelEn: "Crime", prompt: "a crime/detective story involving an investigation or mystery to solve" },
  { key: "scientific", label: "علمی", labelEn: "Scientific", prompt: "a short popular-science explainer written as a narrative" },
  { key: "conversational", label: "مکالمه‌ای", labelEn: "Conversational", prompt: "a natural back-and-forth dialogue between two people" },
  { key: "philosophical", label: "فلسفی", labelEn: "Philosophical", prompt: "a short philosophical reflection or thought experiment" },
  { key: "metaphysical", label: "متافیزیکی", labelEn: "Metaphysical", prompt: "a short metaphysical/speculative piece about existence, mind, or reality" },
];
// ---------------------------------------------------------------------------
// شکستنِ متنِ یه پاراگراف به جمله‌های واقعی — هوش مصنوعی که داستان می‌سازه
// قراره طبق پرامپت هر جمله رو یه آیتمِ جدا تو آرایه‌ی «sentences» برگردونه،
// ولی بعضی‌وقت‌ها (خصوصاً سرویس‌های سریع/رایگانِ زنجیره) چند جمله رو تو یه
// آیتم می‌چپونه — دقیقاً همون باگی که کاربر تو حالتِ «جمله به جمله» دید
// (یه بلوکِ هایلایت‌شده‌ی خیلی طولانی، شاملِ چند جمله‌ی کامل). به‌جای اینکه
// صرفاً به رعایتِ سرویس اعتماد کنیم، خروجیِ هر پاراگراف رو خودمون هم از نو
// رویِ علامتِ‌های پایانِ‌جمله (.!?؟。！) می‌شکنیم تا «جمله به جمله» همیشه
// واقعاً جمله‌به‌جمله باشه — صرف‌نظر از این‌که سرویس چطور گروه‌بندی کرده بود.
// سقفِ تعدادِ کلمه در هر «جمله»‌یِ داخلِ دیتای اپ — دقیقاً همون عددی که
// speechController برای شکستنِ اضطراریِ جمله‌های خیلی‌بلند موقعِ خوندن با
// صدا استفاده می‌کنه (MAX_WORDS_PER_CHUNK). قبلاً این‌جا هیچ سقفی نبود، و
// وقتی متنِ ورودی (خصوصاً PDF/پیست/لینک) علامتِ‌پایانِ‌جمله نداشت (یا کم
// داشت)، کلِ یه پاراگراف/صفحه به‌عنوانِ یک «جمله»‌ی غول‌پیکر ثبت می‌شد —
// همون چیزی که کاربر به‌عنوانِ «جمله‌به‌جمله جدا نمی‌شه» می‌دید. بدترش این
// بود که همین یک «جمله»‌ی غول‌پیکر، موقعِ پخشِ صوتی، خودِ speechController
// (با همین سقف) به چند تکه‌ی کوچیک‌تر می‌شکستش تا بخونتش — یعنی صدا داشت
// جمله‌به‌جمله جلو می‌رفت ولی هایلایت/اسکرول (که رویِ گرانولاریتیِ دیتای
// اپ کار می‌کنه) کلِ اون مدت رویِ همون یک آیتمِ غول‌پیکر گیر می‌کرد و
// حرکت نمی‌کرد. با اعمالِ همین سقف این‌جا هم، دیتای اپ و چیزی که صدا واقعاً
// می‌خونه یک‌به‌یک هماهنگ می‌مونن.
const MAX_WORDS_PER_SENTENCE_ITEM = 40;
export function splitTextIntoSentenceStrings(text) {
  const t = (text || "").trim();
  if (!t) return [];
  // نقطه‌ی بینِ دو رقم (مثلِ 3.2 یا 20.15) پایانِ جمله نیست، یه عددِ اعشاریه —
  // قبل از تقسیم‌کردن موقتاً با یه کاراکترِ کنترلی (که تو متنِ واقعی پیش
  // نمی‌آد) جایگزینش می‌کنیم تا رجکسِ زیر روش نشکنه، بعد برش‌ش می‌دیم.
  const DECIMAL_MARK = "\u0001";
  const protectedT = t.replace(/(\d)\.(?=\d)/g, `$1${DECIMAL_MARK}`);
  const re = /[^.!?؟。！]+[.!?؟。！]*/g;
  const rawParts = [];
  let m;
  while ((m = re.exec(protectedT))) {
    const trimmed = m[0].trim();
    if (trimmed) rawParts.push(trimmed);
  }
  const restoreDecimals = (s) => s.split(DECIMAL_MARK).join(".");
  const parts = (rawParts.length ? rawParts : [protectedT]).map(restoreDecimals);
  // اگه یکی از این «جمله»‌ها (به‌خاطرِ نبودِ نقطه/علامتِ‌نگارشیِ کافی تو
  // متنِ خام) غیرعادی بلند از آب دراومد، همینجا هم رویِ مرزِ کلمه می‌شکونیمش
  // — دقیقاً هم‌شکلِ همون منطقی که speechController برای پخشِ صوتی داره.
  const out = [];
  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS_PER_SENTENCE_ITEM) {
      out.push(part);
      continue;
    }
    for (let i = 0; i < words.length; i += MAX_WORDS_PER_SENTENCE_ITEM) {
      out.push(words.slice(i, i + MAX_WORDS_PER_SENTENCE_ITEM).join(" "));
    }
  }
  return out.length ? out : [t];
}
export function enforceSentenceSplit(paragraphs) {
  return (paragraphs || []).map((p) => {
    const joined = (p.sentences || []).map((s) => s?.text || "").join(" ");
    const resplit = splitTextIntoSentenceStrings(joined);
    return { ...p, sentences: resplit.map((text) => ({ text })) };
  });
}
// استخراجِ متنِ یک صفحه‌ی PDF از content.items، طوری که ساختارِ سطربندیِ
// خودِ صفحه (کجا خط عوض شده، کجا یه پاراگراف/بلوکِ جدا شروع شده) حفظ
// بشه — نه این‌که همه‌چی با یه space به هم بچسبن و کاملاً یه بلوکِ
// یک‌دست بشن. این برای اونجاهایی لازمه که بعداً ترجمه هم قراره پاراگراف‌
// به‌پاراگراف، هم‌شکلِ متنِ اصلی نشون داده بشه (وگرنه کاربر نمی‌فهمه کدوم
// تکه‌ی ترجمه مالِ کدوم خط/بخشِ اصلیه).
// pdf.js رویِ هر آیتمِ متنی یک `hasEOL` می‌ده (یعنی «بعدِ این آیتم خط عوض
// می‌شه»)؛ از همون برای مرزِ خط استفاده می‌کنیم. برای تشخیصِ مرزِ
// پاراگراف (نه فقط خط)، فاصله‌ی عمودیِ بینِ خط‌ها رو با فاصله‌ی «معمولیِ»
// بینِ خط‌های همون صفحه مقایسه می‌کنیم — فاصله‌ی به‌مراتب بزرگ‌تر یعنی
// این‌جا یه بلوکِ تازه (پاراگراف/تیتر/آیتمِ جدا) شروع شده.
// استخراجِ «تخت» (بدونِ حفظِ پاراگراف) از content.items یه صفحه‌ی PDF —
// برخلافِ چسبوندنِ سرراستِ هر آیتم با یه space وسطشون
// (`.map(it=>it.str).join(" ")`)، که چون خیلی از فونت‌ها/PDFها
// (مخصوصاً متنِ justify‌شده) هر چندتا حرف رو به‌صورتِ آیتمِ جداگونه
// می‌دن، باعثِ افتادنِ فاصله‌ی اضافه وسطِ خودِ کلمه‌ها می‌شد — مثلاً
// «was» به‌صورتِ «w as» یا «time» به‌صورتِ «ti m e» درمی‌اومد، چون
// بینِ هر دو آیتم (even وسطِ یه کلمه) یه space زوری اضافه می‌شد.
// اینجا دقیقاً مثلِ extractPdfPageTextWithBreaks آیتم‌ها رو بدونِ
// separatorِ اضافه بهم می‌چسبونیم (فاصله‌ی واقعیِ بینِ کلمه‌ها از قبل
// خودِ pdf.js تشخیص داده و تو str آیتم‌ها گذاشته)، و فقط سرِ هر خط
// (hasEOL) یه space می‌ذاریم تا کلمه‌های دو سرِ خط بهم نچسبن.
export function extractPdfPageTextFlat(content) {
  const items = content?.items || [];
  let out = "";
  for (const it of items) {
    out += it.str || "";
    if (it.hasEOL) out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}
export function extractPdfPageTextWithBreaks(content) {
  const items = content?.items || [];
  const rawLines = [];
  let curStr = "";
  let curY = null;
  for (const it of items) {
    if (curY === null && Array.isArray(it.transform)) curY = it.transform[5];
    curStr += it.str || "";
    if (it.hasEOL) {
      rawLines.push({ text: curStr, y: curY });
      curStr = "";
      curY = null;
    }
  }
  if (curStr.trim()) rawLines.push({ text: curStr, y: curY });
  const lines = rawLines.filter((l) => l.text.trim());
  if (!lines.length) return "";

  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i - 1].y != null && lines[i].y != null) {
      gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
    }
  }
  gaps.sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

  let out = lines[0].text.trim();
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const line = lines[i];
    const gap = prev.y != null && line.y != null ? Math.abs(prev.y - line.y) : typicalGap;
    const isParagraphBreak = typicalGap > 0 && gap > typicalGap * 1.5;
    out += (isParagraphBreak ? "\n\n" : "\n") + line.text.trim();
  }
  return out.trim();
}
// ترجمه‌ی یک متنِ چندپاراگرافه (خروجیِ تابعِ بالا) طوری که مرزِ پاراگراف‌ها
// (خطِ خالی بینِ بلوک‌ها) عیناً تو ترجمه هم حفظ بشه — هر پاراگراف جدا
// ترجمه می‌شه و با همون \n\n به‌هم وصل می‌شن، تا کاربر بتونه بلوک‌به‌بلوک
// متنِ اصلی و ترجمه رو کنارِ هم تطبیق بده.
export async function translatePageTextPreservingParagraphs(pageText, targetLang, aiSettings) {
  const paragraphs = (pageText || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  const translatedParagraphs = await runWithConcurrencyLimit(paragraphs, GLOBAL_TRANSLATE_CONCURRENCY, async (para) => {
    const flat = para.replace(/\s*\n\s*/g, " ").trim();
    if (!flat) return "";
    const sentences = splitTextIntoSentenceStrings(flat);
    const groups = [];
    let cur = "";
    for (const s of sentences.length ? sentences : [flat]) {
      if (cur && (cur + " " + s).length > 400) {
        groups.push(cur);
        cur = s;
      } else {
        cur = cur ? `${cur} ${s}` : s;
      }
    }
    if (cur) groups.push(cur);
    const translatedGroups = await runWithConcurrencyLimit(groups, GLOBAL_TRANSLATE_CONCURRENCY, (g) =>
      translateFree(g, targetLang, "auto", aiSettings)
    );
    return translatedGroups.join(" ");
  });
  return translatedParagraphs.join("\n\n");
}
