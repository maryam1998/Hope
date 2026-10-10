// سرویس ترجمه: صف، ارائه‌دهنده‌ها، اعتبارسنجی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { getCachedTranslation, setCachedTranslation } from "../storage/translationCacheDb.js";
import { englishLangName } from "../constants/languages.js";
import { callAI } from "../ai/callAI.js";

// ============================================================
// ترجمه رایگان با چند سرویس پشت‌سرهم (بدون نیاز به کلید API)
// اگه سرویس اول جواب نده یا خطا بده، خودکار میره سراغ سرویس بعدی.
// ترتیب: Google Translate (بدون‌رسمی) → MyMemory → Lingva (پروکسی گوگل) → LibreTranslate
// ============================================================

// ۱) Google Translate — همون endpoint قدیمی و رایگان
// درخواست‌های شبکه با یه timeout کوتاه — اگه یه سرویس (مثلاً به‌خاطر
// فیلترینگ/بلاک‌بودن توی شبکه‌ی کاربر) فوراً جواب رد نکنه، به‌جای معطل
// موندنِ چندده‌ثانیه‌ای، سریع شکست می‌خوریم و می‌ریم سراغ سرویس بعدی —
// این دقیقاً همون چیزیه که با اضافه‌شدنِ continue برای رد کردنِ نتایج
// مشکوک (که حالا ممکنه به سرویس‌های بیشتری سر بزنه) لازم شده.
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function translateViaGoogle(text, targetLang, sourceLang = "auto") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("google-http-" + response.status);
  const data = await response.json();
  if (data && data[0] && data[0].length) {
    return data[0].map((item) => item[0]).join("");
  }
  throw new Error("google-empty-response");
}
// ۲) MyMemory — کاملاً رایگان و بدون کلید، محدودیت روزانه دارد ولی جای خوبی برای fallback است
async function translateViaMyMemory(text, targetLang, sourceLang = "auto") {
  // MyMemory زبان مبدا "auto" را نمی‌شناسد؛ اگر مشخص نبود انگلیسی را حدس می‌زنیم
  const sl = sourceLang && sourceLang !== "auto" ? sourceLang : "en";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetLang}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("mymemory-http-" + response.status);
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("mymemory-empty-response");
  // MyMemory به‌جای خطای واقعی، بعضی وقت‌ها یه پیام متنی مثل
  // "PLEASE SELECT TWO DISTINCT LANGUAGES." یا "INVALID ..." برمی‌گردونه —
  // این‌ها ترجمه نیستن، پیام خطای خودِ سرویس‌ان؛ باید به‌عنوان شکست تلقی بشن
  // تا زنجیره‌ی fallback بره سراغ سرویس بعدی.
  const looksLikeApiError = /^(PLEASE SELECT|INVALID |NO TRANSLATION|AMOUNT OF WORDS)/i.test(translated.trim());
  if (looksLikeApiError) throw new Error("mymemory-api-error: " + translated);
  return translated;
}
// ۳) Lingva Translate — یک پروکسی متن‌باز و رایگان جلوی Google Translate
async function translateViaLingva(text, targetLang, sourceLang = "auto") {
  const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("lingva-http-" + response.status);
  const data = await response.json();
  if (!data?.translation) throw new Error("lingva-empty-response");
  return data.translation;
}
// ۴) LibreTranslate — سرویس متن‌باز رایگان (نمونه‌ی عمومی)
async function translateViaLibre(text, targetLang, sourceLang = "auto") {
  const response = await fetchWithTimeout("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: sourceLang || "auto", target: targetLang, format: "text" }),
  });
  if (!response.ok) throw new Error("libre-http-" + response.status);
  const data = await response.json();
  if (!data?.translatedText) throw new Error("libre-empty-response");
  return data.translatedText;
}
// ۵) آخرین راه‌حل: از همون بک‌اند AI خودِ اپ (Cloudflare Worker) بخوایم ترجمه
// کنه. برخلاف ۴ سرویس بالا (که مستقیماً از مرورگر به سرورهای خارجی وصل
// می‌شن و بسته به شبکه/ISP کاربر ممکنه فیلتر یا بلاک باشن)، این یکی از
// همون Worker همیشه‌دردسترسِ خودِ اپ رد می‌شه — پس اگه AI برای بقیه‌ی
// بخش‌های اپ (مثل ساخت داستان) کار می‌کنه، این هم کار می‌کنه.
export async function translateViaAI(text, targetLang, sourceLang, aiSettings) {
  if (!aiSettings) throw new Error("translate-ai-no-settings");
  // نامِ انگلیسیِ زبون، نه برچسبِ فارسی — همون دلیلِ askGrammarTeacher
  // بالاتر: قاطی‌کردنِ کلمه‌ی فارسی وسطِ پرامپتِ انگلیسی باعث می‌شه
  // سرویس‌های سریع/رایگان بعضی‌وقت‌ها درست تشخیص ندن.
  const targetLabel = englishLangName(targetLang);
  const prompt =
    `Translate the following text into ${targetLabel}. ` +
    `Respond with ONLY the translation itself — no quotes, no explanation, no original text, nothing else.\n\n` +
    `Text: ${text}`;
  const clean = (r) => stripAIReasoning(r).replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
  let cleaned = clean(await callAI({ prompt, maxTokens: 200, retries: 1, aiSettings }));
  // سرویس به‌جای ترجمه «فکر کردنش» رو نوشته → یک‌بار با دستورِ سخت‌گیرانه‌تر دوباره
  if (!cleaned || looksLikeAIReasoning(cleaned)) {
    const strict =
      `Output ONLY the ${targetLabel} translation of the text below, as a single line. ` +
      `Do not think aloud, do not analyze, do not explain, do not use lists or markdown.\n\n` +
      `Text: ${text}\n\n${targetLabel} translation:`;
    cleaned = clean(await callAI({ prompt: strict, maxTokens: 200, retries: 1, aiSettings }));
  }
  if (!cleaned) throw new Error("translate-ai-empty-response");
  if (looksLikeAIReasoning(cleaned)) throw new Error("translate-ai-reasoning-leak");
  return cleaned;
}
// ============================================================
// 🔎 لایه‌ی سبکِ کنترل‌کیفیت — قبل از اینکه یه ترجمه‌ی خام (از گوگل/
// MyMemory/Lingva/Libre) برای همیشه کش بشه، چند تست رایگان و آنی (بدون
// شبکه، بدون AI) روش اجرا می‌کنیم. فقط اگه یکی از این‌ها مشکوک بود، سراغ
// AI برای اصلاح می‌ریم — نه برای هر ترجمه‌ای. و چون نتیجه (تأییدشده یا
// اصلاح‌شده) برای همیشه تو IndexedDB کش می‌مونه، این هزینه‌ی AI برای هر
// جفتِ متن/زبان فقط "یک‌بار در کل عمر اپ" اتفاق می‌افته؛ دفعه‌های بعد که
// همون متن دوباره لازم بشه (حتی برای کاربرهای دیگه‌ی همین دستگاه) مستقیم
// از کش می‌آد، بدون هیچ توکنی.
// ============================================================
function scriptRangeFor(langCode) {
  // بازه‌ی یونیکدِ رسم‌الخطِ اصلیِ هر زبون — برای تشخیصِ «اصلاً ترجمه نشده»
  // (مثلاً گوگل به‌جای فارسی، همون متنِ انگلیسی رو برگردونده).
  switch (langCode) {
    case "fa":
    case "ar":
      return /[\u0600-\u06FF]/;
    case "ru":
      return /[\u0400-\u04FF]/;
    case "zh":
      return /[\u4E00-\u9FFF]/;
    case "ja":
      return /[\u3040-\u30FF\u4E00-\u9FFF]/;
    case "ko":
      return /[\uAC00-\uD7AF]/;
    default:
      // بقیه (en/es/fr/tr و ...) لاتین مشترکن — این چک برای اون‌ها بی‌فایده‌ست
      return null;
  }
}
// 🧠 بعضی سرویس‌های AI به‌جای «فقط ترجمه»، فرایندِ فکر کردنشون رو برمی‌گردونن
// («Here's a thinking process: 1. **Analyze the Request:** …»). این متن حاوی حروفِ
// زبانِ مقصد هم هست پس از تست‌های رسم‌الخط رد می‌شد و به‌عنوانِ ترجمه نمایش/کش می‌شد.
export const AI_REASONING_RE = /(thinking process|here'?s a thinking|analy[sz]e the (request|text|input)|\*\*\s*analy[sz]e|\bconstraint\s*:|the user wants me to|let me (read|think|analy[sz]e|re-?read)|<\/?think(ing)?>|^\s*okay,? (so|let'?s|the user))/im;
function looksLikeAIReasoning(text) {
  const t = String(text || "");
  if (!t) return false;
  if (AI_REASONING_RE.test(t)) return true;
  // فهرستِ شماره‌دارِ مارک‌داون با چند «**» پشتِ هم = توضیحِ سرویس، نه ترجمه
  return (t.match(/\*\*/g) || []).length >= 4 && /(^|\n|\s)\d\.\s/.test(t);
}
// <think>…</think> و مانندش را برمی‌دارد و فقط پاسخِ واقعی را نگه می‌دارد
export function stripAIReasoning(text) {
  return String(text || "")
    .replace(/<think(ing)?>[\s\S]*?<\/think(ing)?>/gi, "")
    .replace(/<think(ing)?>[\s\S]*$/gi, "")
    .trim();
}
export function looksLikelyMistranslated(sourceText, draft, targetLang, sourceLang) {
  const src = (sourceText || "").trim();
  const out = (draft || "").trim();
  if (!out) return true;
  if (looksLikeAIReasoning(out)) return true;
  // زبان مبدا و مقصد فرق دارن ولی خروجی عیناً همون متن مبدأست — یعنی ترجمه نشده
  if (sourceLang && sourceLang !== "auto" && sourceLang !== targetLang && out.toLowerCase() === src.toLowerCase())
    return true;
  // رسم‌الخطِ زبونِ مقصد مشخصه (فارسی/عربی/روسی/چینی/...) ولی هیچ اثری ازش تو خروجی نیست
  const re = scriptRangeFor(targetLang);
  if (re && src.length > 1 && !re.test(out)) return true;
  // نسبتِ طولِ غیرعادی نسبت به متن مبدأ (خیلی کوتاه‌تر یا خیلی بلندتر)
  const ratio = out.length / Math.max(src.length, 1);
  if (src.length > 3 && (ratio < 0.25 || ratio > 3.5)) return true;
  return false;
}
// فقط وقتی looksLikelyMistranslated چراغ قرمز داده، این تابع صدا زده می‌شه:
// یه پرامپت خیلی کوتاه به بک‌اند AI (که خودش اول از Groq — سریع‌ترین حلقه‌ی
// زنجیره — استفاده می‌کنه) می‌فرستیم تا یا تأیید کنه یا خودش ترجمه‌ی درست رو
// بده. maxTokens پایین + بدون retry اضافه، برای اینکه هم سریع باشه هم کم‌توکن.
async function verifyTranslationWithAI(sourceText, targetLang, draft, aiSettings) {
  if (!aiSettings) return draft;
  try {
    const targetLabel = englishLangName(targetLang);
    const prompt =
      `Source text: "${sourceText}"\n` +
      `Draft translation into ${targetLabel}: "${draft}"\n\n` +
      `Is the draft an accurate, complete translation? If yes, reply with EXACTLY: OK\n` +
      `If no, reply with ONLY the corrected translation — no quotes, no explanation, nothing else.`;
    const result = await callAI({ prompt, maxTokens: 80, retries: 0, aiSettings });
    const cleaned = stripAIReasoning(result);
    if (!cleaned || /^OK\.?$/i.test(cleaned) || looksLikeAIReasoning(cleaned)) return draft;
    return cleaned.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || draft;
  } catch (e) {
    // بررسی با AI شکست خورد (مثلاً بک‌اند در دسترس نبود) — همون ترجمه‌ی
    // خامِ سرویس‌های رایگان رو نگه می‌داریم، بهتر از هیچی یا کرش کردنه.
    return draft;
  }
}
// تابع اصلی: هر سرویس رو به‌ترتیب امتحان می‌کنه، به محض موفقیت نتیجه رو برمی‌گردونه.
// اگه همه شکست خوردن، متن اصلی بدون تغییر برگردونده می‌شه (تا برنامه از کار نیفته).
// forceVerify=true یعنی «حتی اگه هیچ‌کدوم از تست‌های رایگان مشکوک نبودن هم
// بازم AI بررسیش کنه» — چون تست‌های رایگان فقط رسم‌الخطِ اشتباه/ترجمه‌نشده رو
// می‌گیرن، نه اشتباهِ معنایی‌ای که مثلاً بینِ دو زبونِ هم‌رسم‌الخط (en↔es/fr/tr)
// پیش میاد. برای همچین مواردی، جایی که کیفیت خیلی مهمه (مثل جمله‌های خودِ
// داستان) این پرچم true پاس داده می‌شه؛ برای موارد پرتکرار/کم‌اهمیت‌تر (تک‌لغت‌ها)
// همون کنترل‌کیفیتِ رایگان کافیه تا مصرفِ توکن بی‌جهت زیاد نشه.
//
// ⛔️ رفعِ باگِ «در حال ترجمه...» که هیچ‌وقت تموم نمی‌شد: قبلاً هیچ سقفِ
// زمانیِ کلی روی کل زنجیره (۴ سرویسِ رایگان + fallback به بک‌اندِ AI) نبود؛
// اگه شبکه‌ی کاربر همه‌ی این‌ها رو (یا لااقل بک‌اند رو، که fetch()ـش هم اصلاً
// timeout نداشت) بی‌صدا بلاک می‌کرد، Promise تا ابد آویزون می‌موند. حالا یه
// سقفِ کلیِ TRANSLATE_HARD_TIMEOUT_MS با Promise.race تضمین می‌کنه که کاربر
// حداکثر همین‌قدر منتظر بمونه؛ اگه تا اون‌موقع هیچ سرویسی جواب نداده باشه،
// موقتاً متنِ اصلی نشون داده می‌شه (نه هیچی) و کارِ شبکه‌ای در پس‌زمینه
// همچنان ادامه پیدا می‌کنه تا دفعه‌ی بعد از کش بیاد.
//
// 🚦 صفِ سراسریِ هم‌زمانی: همه‌ی محل‌های اپ (پاپ‌آپِ کلمه، مرورِ Leitner،
// جمله‌های داستان، و ...) هرکدوم جدا translateFree صدا می‌زدن — اگه چندتاشون
// هم‌زمان اجرا بشن (مثلاً بازکردنِ یه داستانِ بلند + مرورِ لغات هم‌زمان)،
// می‌تونست ده‌ها درخواستِ هم‌زمان به سرویس‌های رایگان/بک‌اندِ AI بفرسته —
// دقیقاً همون چیزی که با زیادشدنِ کاربرها بدتر می‌شه (سهمیه‌ی Groq/بک‌اند
// بینِ همه مشترکه). حالا فقط GLOBAL_TRANSLATE_CONCURRENCY تا درخواستِ
// واقعیِ شبکه‌ای، در کلِ اپ (نه فقط داخلِ یه افکت)، هم‌زمان اجرا می‌شه؛
// بقیه صف می‌کِشن.
// از ۳ به ۶ افزایش پیدا کرد تا صفِ درخواست‌ها (مخصوصاً موقعِ اضافه‌کردنِ یه
// زبانِ مقصدِ تازه رویِ یه لیستِ ۶۰تایی) سریع‌تر خالی بشه و احتمالِ رسیدنِ
// یه کار به تایمر (بالا) قبل از این‌که اصلاً نوبتش برسه کمتر بشه.
export const GLOBAL_TRANSLATE_CONCURRENCY = 10;
const TRANSLATE_HARD_TIMEOUT_MS = 15000;
let _translateActiveCount = 0;
const _translateQueue = [];
function _runNextTranslateJob() {
  if (_translateActiveCount >= GLOBAL_TRANSLATE_CONCURRENCY) return;
  const job = _translateQueue.shift();
  if (!job) return;
  _translateActiveCount++;
  job
    .fn()
    .then(job.resolve, job.reject)
    .finally(() => {
      _translateActiveCount--;
      _runNextTranslateJob();
    });
}
function queueTranslateJob(fn) {
  return new Promise((resolve, reject) => {
    _translateQueue.push({ fn, resolve, reject });
    _runNextTranslateJob();
  });
}
export async function translateFree(text, targetLang, sourceLang = "auto", aiSettings = null, forceVerify = false) {
  if (!text || !targetLang) return text;
  // اگه زبان مبدا و مقصد یکی باشن، ترجمه بی‌معنیه (و بعضی سرویس‌ها به‌جای
  // خطا، یه پیام متنی برمی‌گردونن که اشتباهی به‌عنوان "ترجمه" ذخیره می‌شد) —
  // پس همون متن اصلی رو بدون درخواست شبکه برمی‌گردونیم.
  if (sourceLang && sourceLang !== "auto" && sourceLang === targetLang) return text;

  // اول کشِ آفلاینِ IndexedDB رو چک کن — اگه این کلمه قبلاً (مثلاً از طریق
  // «دانلود آفلاین لغات» توی تنظیمات) ترجمه و ذخیره شده، بدون هیچ درخواست
  // شبکه‌ای همون رو برگردون. این دقیقاً همونیه که آفلاین‌بودن رو ممکن می‌کنه.
  const cached = await getCachedTranslation(text, targetLang, sourceLang);
  // ⛔️ رفعِ باگِ «زبونِ اشتباه/ترجمه‌نشده که برای همیشه کش شده»: قبلاً هر
  // چی از کش می‌اومد، بدونِ هیچ چکی مستقیم نشون داده می‌شد — پس اگه یه‌بار
  // (مثلاً به‌خاطرِ باگِ زیر، یا قطعیِ لحظه‌ایِ AI) متنِ اصلی/غلط اشتباهاً کش
  // شده باشه، همون غلط تا ابد (حتی بعد از رفعِ باگ) نشون داده می‌شد. حالا
  // موقعِ خوندن از کش هم با همون تستِ looksLikelyMistranslated چک می‌کنیم؛
  // اگه مشکوک بود، کش رو نادیده می‌گیریم و انگار اصلاً کش نبوده دوباره
  // می‌ریم سراغِ شبکه — یعنی دیتای غلطِ قدیمی خودش‌به‌خود (بدون نیاز به پاک
  // کردنِ دستیِ IndexedDB) اصلاح می‌شه.
  if (cached && !looksLikelyMistranslated(text, cached, targetLang, sourceLang)) return cached;

  // کش نبود — کارِ واقعیِ شبکه‌ای وارد صفِ سراسری می‌شه (نه بلافاصله اجرا)
  // تا سقفِ هم‌زمانی رعایت بشه؛ و کلِ این کار زیرِ یه سقفِ زمانیِ سخت قرار
  // می‌گیره تا رابط کاربری هیچ‌وقت بی‌نهایت منتظر نمونه.
  //
  // 🐛 باگِ اصلیِ «زبان‌های غیر از EN/FA/ES همیشه انگلیسی برمی‌گردوندن»
  // دقیقاً همین‌جا بود: قبلاً تایمرِ ۱۵ثانیه‌ای همین که translateFree صدا
  // زده می‌شد شروع می‌شد — یعنی از لحظه‌ی *صف‌شدن*، نه از لحظه‌ی *واقعاً
  // اجراشدن*. توی تبِ «Vocabulary in Use» (یا هر لیستِ ۶۰تاییِ دیگه)،
  // با انتخاب/اضافه‌کردنِ یه زبانِ مقصدِ تازه (که هنوز کش نشده، برخلافِ
  // فارسی که مستقیم تویِ دیتاست هست و اصلاً وارد این صف نمی‌شه)، ده‌ها
  // درخواستِ ترجمه هم‌زمان صف می‌شدن؛ ولی GLOBAL_TRANSLATE_CONCURRENCY
  // فقط ۳تاشون رو هم‌زمان اجرا می‌کنه. نتیجه: کلمه‌های آخرِ صف تا نوبتشون
  // برسه بیشتر از ۱۵ثانیه صف می‌موندن، تایمر زودتر از شروعِ کارِ واقعی‌شون
  // فایر می‌شد، و resolve(text) یعنی *متنِ انگلیسیِ اصلی* بدونِ هیچ تلاشِ
  // شبکه‌ای واقعی نمایش داده می‌شد — دقیقاً همون چیزی که با ES (که معمولاً
  // زودتر/با صفِ کوتاه‌تر تست می‌شه) دیده نمی‌شد ولی با بقیه‌ی زبان‌ها
  // (که صف‌شون شلوغ‌تره) دائم تکرار می‌شد. فیکس: تایمر رو می‌بریم *داخلِ*
  // کارِ صف‌شده، تا فقط از لحظه‌ای که واقعاً اجرا شروع می‌شه بشمره؛ تا وقتی
  // یه کار توی صف منتظره، هیچ‌وقت به‌خاطرِ صف‌شدن fail/fallback نمی‌شه.
  return queueTranslateJob(() => {
    const networkPromise = translateFreeNetwork(text, targetLang, sourceLang, aiSettings, forceVerify);
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(text), TRANSLATE_HARD_TIMEOUT_MS);
    });
    return Promise.race([networkPromise, timeoutPromise]);
  });
}
// ---------------------------------------------------------------------------
// 🚦 Circuit breaker برای سرویس‌های ترجمه: اگه یه سرویس (مثلاً چون تویِ
// شبکه‌ی کاربر فیلتر/بلاکه) پشتِ‌سرِهم شکست بخوره، قبلاً همچنان برایِ
// *هر کلمه/هر زبونِ بعدی* دوباره امتحانش می‌کردیم — یعنی هر ردیفِ ترجمه
// (هر کلمه × هر زبون) باید صبر می‌کرد تا هر ۴ سرویس یکی‌یکی (هرکدوم تا
// fetchWithTimeoutِ خودش) شکست بخورن، قبل از این‌که نوبت به بعدی/بک‌اندِ
// AI برسه. روی صفحه‌ای با مثلاً ۶۰ لغت × ۹ زبونِ غیرِفارسی = ۵۴۰ ردیف،
// با فقط GLOBAL_TRANSLATE_CONCURRENCY کارِ هم‌زمان، این یعنی ده‌ها دقیقه
// طول می‌کشید تا کل صف خالی بشه — دقیقاً همون «صبر کردم ولی ترجمه نشد».
// حالا: بعد از چند شکستِ پشتِ‌سرِهمِ یه سرویس (تویِ کلِ اپ، نه فقط یه
// کلمه)، همون سرویس برایِ چند دقیقه به‌طور کامل کنار گذاشته می‌شه — پس
// بقیه‌ی ردیف‌ها بلافاصله سراغِ سرویسِ زنده (یا بک‌اندِ AI) می‌رن، بدونِ
// این‌که وقتِ‌شون رویِ سرویس‌هایِ مرده تلف بشه. بعد از اتمامِ زمانِ بلاک،
// خودکار یه‌بارِ دیگه امتحان می‌شه (شاید فیلترینگ برداشته شده باشه).
const PROVIDER_FAIL_THRESHOLD = 2; // این‌قدر شکستِ پشتِ‌سرِهم یعنی احتمالاً بلاکه، نه یه خطایِ لحظه‌ای
const PROVIDER_BLOCK_MS = 3 * 60 * 1000; // ۳ دقیقه کنار گذاشته می‌شه، بعدش دوباره امتحان می‌شه
const _providerFailCounts = {};
const _providerBlockedUntil = {};
function isProviderTemporarilyBlocked(provider) {
  const until = _providerBlockedUntil[provider.name];
  if (!until) return false;
  if (Date.now() < until) return true;
  // زمانِ بلاک تموم شده — پاکش کن تا دوباره یه شانس بگیره
  delete _providerBlockedUntil[provider.name];
  _providerFailCounts[provider.name] = 0;
  return false;
}
function reportProviderOutcome(provider, succeeded) {
  if (succeeded) {
    _providerFailCounts[provider.name] = 0;
    delete _providerBlockedUntil[provider.name];
    return;
  }
  const count = (_providerFailCounts[provider.name] || 0) + 1;
  _providerFailCounts[provider.name] = count;
  if (count >= PROVIDER_FAIL_THRESHOLD) {
    _providerBlockedUntil[provider.name] = Date.now() + PROVIDER_BLOCK_MS;
  }
}
// اجرای موازیِ چند سرویسِ ترجمه به‌جای پشت‌سرِهم — چون این ۴ سرویسِ خارجی
// (Google/MyMemory/Lingva/Libre) معمولاً توی شبکه‌ی ایران فیلتر/بلاکن، حالتِ
// قبلی (یکی‌یکی با تایم‌اوتِ جدا) یعنی کاربر باید تا ۱۶ ثانیه صبرِ سرویس‌های
// مرده رو می‌کشید قبل از اینکه اصلاً نوبت به بک‌اندِ AI برسه. حالا همه رو
// همزمان می‌فرستیم و اولین جوابِ غیرخالی برنده‌ست؛ بقیه فقط برای گزارشِ
// شکست به circuit breaker استفاده می‌شن (چیزی که تأییدش می‌کنه رو return
// نمی‌کنن، پس هزینه‌ی اضافه‌ای هم ندارن). مصرفِ AI دست‌نخورده می‌مونه: فقط
// روی همون برنده (verify) یا وقتی هیچ‌کدوم جواب ندادن (translateViaAI)
// صدا زده می‌شه — دقیقاً مثل قبل.
function raceProviderResults(providers, text, targetLang, sourceLang) {
  return new Promise((resolve) => {
    if (providers.length === 0) { resolve(null); return; }
    let remaining = providers.length;
    let settled = false;
    providers.forEach((provider) => {
      provider(text, targetLang, sourceLang)
        .then((result) => {
          if (result && result.trim()) {
            if (!settled) { settled = true; resolve({ result, provider }); }
          } else {
            // جواب خالی/بی‌محتوا هم یه‌جور شکستِ همون سرویسه
            reportProviderOutcome(provider, false);
          }
        })
        .catch((error) => {
          reportProviderOutcome(provider, false);
          console.warn(`ترجمه با ${provider.name} ناموفق بود:`, error?.message || error);
        })
        .finally(() => {
          remaining -= 1;
          if (remaining === 0 && !settled) resolve(null);
        });
    });
  });
}
// 🔄 ترجمه‌ی دوباره‌ی یک خطِ مکالمه‌ی روزمره (دکمه‌ی رفرش): اول AI، اگه نبود شبکه‌ی
// سرویس‌های رایگان — هیچ‌وقت از کش نمی‌خونه (چون ترجمه‌ی غلط همون‌جا نشسته)؛
// نتیجه‌ی جدید جایگزین کش می‌شه.
export async function retranslateDailyLine(text, code, aiSettings) {
  let translated;
  try {
    translated = await translateViaAI(text || "", code, "en", aiSettings);
  } catch {
    translated = await translateFreeNetwork(text || "", code, "en", aiSettings, true);
  }
  if (translated && String(translated).trim()) {
    try { setCachedTranslation(text || "", code, "en", translated); } catch (e) {}
  }
  return translated;
}
export async function translateFreeNetwork(text, targetLang, sourceLang, aiSettings, forceVerify) {
  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre].filter(
    (p) => !isProviderTemporarilyBlocked(p)
  );

  const winner = await raceProviderResults(providers, text, targetLang, sourceLang);
  if (winner) {
    const { result, provider } = winner;
    // 🔎 فقط اگه یکی از تست‌های رایگانِ looksLikelyMistranslated مشکوک
    // تشخیص داد (و aiSettings در دسترس بود)، همینجا (قبل از کش‌شدن)
    // یه بررسی سریع با AI انجام می‌شه. چون این کل خط await شده، وقتی
    // چیزی مشکوک نبود (اکثر جمله‌ها) صفر تأخیرِ اضافه داره؛ وقتی هم
    // مشکوک بود، یه تأخیرِ کوتاه (یه کالِ سریعِ Groq) به‌جای نمایشِ
    // ترجمه‌ی غلط، منطقی‌تره.
    const finalResult =
      aiSettings && (forceVerify || looksLikelyMistranslated(text, result, targetLang, sourceLang))
        ? await verifyTranslationWithAI(text, targetLang, result, aiSettings)
        : result;
    // اگه بعد از تلاش برای اصلاح هم هنوز مشکوکه (یعنی AI هم در دسترس نبود
    // و draft خام همون متن مبدأ برگشت)، کش نکن — برو سراغِ بک‌اندِ AI به‌جای
    // اینکه یه ترجمه‌ی غلط برای همیشه تو IndexedDB ذخیره بمونه.
    if (!looksLikelyMistranslated(text, finalResult, targetLang, sourceLang)) {
      reportProviderOutcome(provider, true);
      setCachedTranslation(text, targetLang, sourceLang, finalResult); // fire-and-forget
      return finalResult;
    }
  }
  // اگه هر ۴ سرویسِ رایگان شکست خوردن (مثلاً به‌خاطر فیلتر/بلاک‌بودنِ
  // این سرورهای خارجی توی شبکه‌ی کاربر) و aiSettings در دسترس بود،
  // به‌عنوان آخرین چاره از بک‌اند AI خودِ اپ کمک می‌گیریم.
  if (aiSettings) {
    try {
      const result = await translateViaAI(text, targetLang, sourceLang, aiSettings);
      // 🐛 باگِ اصلی همین‌جا بود: برخلافِ ۴ سرویسِ رایگانِ بالا (که نتیجه‌شون
      // قبل از کش‌شدن از فیلترِ looksLikelyMistranslated رد می‌شه)، این
      // آخرین‌چاره (بک‌اندِ AI) هر جوابی که می‌داد — حتی اگه عیناً همون متنِ
      // مبدأ (مثلاً انگلیسیِ ترجمه‌نشده) بود — بدونِ هیچ چکی برای همیشه کش
      // و نمایش داده می‌شد. چون ۴ سرویسِ رایگانِ بالا (Google/MyMemory/
      // Lingva/Libre) توی شبکه‌ی ایران معمولاً فیلتر/بلاکن، عملاً اکثرِ
      // ترجمه‌ها از همین مسیرِ بدونِ-چک رد می‌شدن — دقیقاً همون دلیلِ دیده‌شدنِ
      // برچسبِ زبونِ اشتباه (مثلاً ES) با متنِ انگلیسیِ دست‌نخورده. حالا این
      // نتیجه هم دقیقاً مثلِ بقیه چک می‌شه.
      if (result && result.trim() && !looksLikelyMistranslated(text, result, targetLang, sourceLang)) {
        setCachedTranslation(text, targetLang, sourceLang, result);
        return result;
      }
    } catch (error) {
      console.warn("ترجمه با بک‌اند AI هم ناموفق بود:", error?.message || error);
    }
  }
  console.error("همه‌ی سرویس‌های ترجمه شکست خوردند؛ متن اصلی برگردانده شد.");
  return text; // اگر هیچ سرویسی جواب نداد، متن اصلی برگردانده می‌شود
}
// اجرای یه آرایه از تسک‌های async با سقفِ هم‌زمانیِ محدود (به‌جای
// Promise.all خام که همه رو یک‌جا شلیک می‌کنه). دلیلِ وجودش: برای
// PDF/فایلِ صوتیِ طولانی که صدها جمله داره، اگه هم‌زمان صدها درخواستِ
// ترجمه به Google/MyMemory/... بره، این سرویس‌های رایگان کاربر رو
// rate-limit یا بلاک می‌کنن — نتیجه‌ش دقیقاً همون «بعضی‌جاها ترجمه شده،
// بعضی‌جاها نه»ست، چون هر جمله‌ای که به هر دلیلی (rate-limit/timeout)
// شکست بخوره، بدونِ ترجمه (متنِ اصلی) برمی‌گرده.
export async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runNext);
  await Promise.all(workers);
  return results;
}
// نگه‌داشته شده برای سازگاری با کدهای قبلی که این نام رو صدا می‌زدن —
// حالا خودش زنجیره‌ی کامل fallback رو صدا می‌زنه.
async function translateWithGoogle(text, targetLang) {
  return translateFree(text, targetLang, "auto");
}
// ---------------------------------------------------------------------------
// ترجمه‌ی «داخل جمله»‌ی یک کلمه/عبارت — به‌جای ترجمه‌ی مجزا و بی‌ربطِ خودِ
// کلمه (که معمولاً شکلش با چیزی که واقعاً توی ترجمه‌ی جمله نوشته شده فرق
// داره، مثلاً فعل صرف‌نشده در برابر صرف‌شده)، کل جمله رو با یک نشانگرِ
// مخصوص دور همون کلمه ترجمه می‌کنیم؛ سرویس‌های ترجمه معمولاً این نشانگرها
// رو دست‌نخورده رد می‌کنن، پس دقیقاً همون تکه از ترجمه که به اون کلمه
// مربوطه رو بیرون می‌کشیم. این یعنی نتیجه، رشته‌ای واقعی از همون جمله‌ی
// ترجمه‌شده‌ست و همیشه match می‌کنه — بدون نیاز به هوش مصنوعی یا بک‌اند.
const ALIGN_L = "⟦";
const ALIGN_R = "⟧";
// جستجوی «کلمه‌ی کامل» به‌جای indexOf ساده — indexOf ساده ممکنه وسطِ یه
// کلمه‌ی دیگه رو پیدا کنه (مثلاً جستجوی "man" داخلِ "woman")، که باعث
// می‌شد نشانگرها دور نصفِ یه کلمه‌ی اشتباه گذاشته بشن و کل زیرخط‌کشی غلط
// از آب دربیاد. اینجا با چک‌کردنِ کاراکترهای قبل/بعد (باید حرف/رقم نباشن)
// مطمئن می‌شیم دقیقاً همون کلمه/عبارتِ کامل پیدا شده.
export function findWholeWordIndex(haystack, needle) {
  if (!haystack || !needle) return -1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  const isWordChar = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
  let from = 0;
  while (true) {
    const idx = h.indexOf(n, from);
    if (idx === -1) return -1;
    const before = idx > 0 ? h[idx - 1] : "";
    const after = idx + n.length < h.length ? h[idx + n.length] : "";
    if (!isWordChar(before) && !isWordChar(after)) return idx;
    from = idx + 1;
  }
}
export async function translateWordInContext(sentenceText, word, sourceLang, targetLang) {
  if (!sentenceText || !word) return null;
  let idx = findWholeWordIndex(sentenceText, word);
  if (idx === -1) idx = sentenceText.toLowerCase().indexOf(word.toLowerCase()); // فالبک برای عبارت‌های چندکلمه‌ای که مرزبندی «کلمه‌ی کامل» براشون صدق نمی‌کنه
  if (idx === -1) return null;
  const wrapped =
    sentenceText.slice(0, idx) +
    ALIGN_L +
    sentenceText.slice(idx, idx + word.length) +
    ALIGN_R +
    sentenceText.slice(idx + word.length);
  try {
    const translated = await translateFree(wrapped, targetLang, sourceLang);
    if (!translated) return null;
    const re = new RegExp(`${ALIGN_L}([^${ALIGN_R}]*)${ALIGN_R}`);
    const m = translated.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  } catch {
    // اگه سرویس‌ها نشانگر رو حذف/جابجا کردن یا شکست خورد، بی‌سروصدا برمی‌گردیم
    // تا فراخوان‌کننده بره سراغ راه قبلی (ترجمه‌ی مجزای کلمه).
  }
  return null;
}
