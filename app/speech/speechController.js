// کنترلر پخش گفتار (TTS) و مکثِ ادامه‌ی متن
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { useRef, useEffect } from "react";
import { isNativeTtsAvailable, isNativeTtsReady, refreshNativeTtsStatus } from "../../nativeTts.js";
import { nativeSpeak, nativeStop, nativePrefetch, nativeWarmAll, nativeSpeakSystem, isSystemTtsReady, isSystemTtsConfirmed, refreshSystemTts } from "../../nativeTtsFast.js";
import { EDGE_TTS_VOICE, TTS_LOCALE, getVoiceEngine } from "../tts/ttsConfig.js";
import { normalizeLangCode } from "../constants/languages.js";
import { DEFAULT_BACKEND_URL } from "../ai/callAI.js";
import { loadVoicePrefs } from "../prefs/textPrefs.js";

// ---------------------------------------------------------------------------
// Speech controller — a single module-level singleton, since only one
// utterance should ever play across the whole app at once.
//
// Plays text one SENTENCE at a time (not one continuous utterance, and not
// one word at a time). This is deliberate:
//   - One utterance per word sounds robotic (every browser adds startup
//     latency + a gap between separate utterances).
//   - One continuous utterance for the whole text sounds natural, but gives
//     us zero reliable control over pacing: many TTS engines (especially
//     "Google"/network voices on Android) mostly ignore utterance.rate values
//     below 1, so picking "0.5x" barely changes anything.
//   - Sentence-sized chunks are the sweet spot: each sentence still sounds
//     natural internally (real prosody, not word-by-word), but the GAP
//     between sentences is something *we* fully control with setTimeout —
//     completely independent of whatever the engine does with `rate`. That
//     gap is what makes slow speeds actually feel slow, reliably, on every
//     device. We also push the rate we hand to the engine further down than
//     what the user picked (see engineRate below) to compensate for engines
//     that have a rate floor.
//
// There is no per-word highlighting anymore — no onboundary tracking, no
// word-position estimation. Pause/resume/repeat just track which SENTENCE
// is currently playing.
// ---------------------------------------------------------------------------

export const speechController = (() => {
  let fullText = "";
  let chunks = []; // [{start, end, text}] sentence-sized chunks of fullText
  let chunkIndex = 0; // index into chunks of the sentence currently playing/paused
  let key = null; // `${locale}::${text}` — identifies what's currently loaded
  let locale = "en-US";
  let status = "idle"; // "idle" | "playing" | "paused"
  let rate = Number(localStorage.getItem("phrasebook-tts-rate")) || 1; // 0.25 (slow) .. 2 (fast), 1 = normal
  // بی‌صداکردنِ خروجیِ صوتیِ خودِ خوانش (TTS/آنلاین) — برای کسی که یه
  // نرم‌افزارِ جداگانه (مثلاً یه پخش‌کننده/screen reader دیگه رویِ گوشی)
  // صدایِ خودش رو داره و نمی‌خواد صدایِ این اپ باهاش تداخل کنه؛ هایلایت و
  // پیش‌رفتنِ جمله‌به‌جمله دقیقاً عادی ادامه پیدا می‌کنه، فقط صدا خاموشه.
  let muted = localStorage.getItem("phrasebook-tts-muted") === "1";
  // "local" = TTS خود گوشی (speechSynthesis) | "online" = سرویس رایگان
  // آنلاین (وقتی گوشی اصلاً صدایی برای اون زبون نصب نداره).
  let mode = "local";
  // پیش‌بارگذاریِ فهرستِ صداهای گوشی: روی خیلی از مرورگرهای موبایل (به‌خصوص
  // Chrome/Android)، اولین باری که getVoices() صدا زده می‌شه لیست خالی
  // برمی‌گرده، تا رویدادِ voiceschanged بعداً شلیک بشه. چون toggle() پایین‌تر
  // دقیقاً همون‌لحظه که کاربر دکمه رو می‌زنه getVoices() رو چک می‌کنه، این
  // خالی‌بودنِ موقت باعث می‌شد حتی برای زبون‌هایی مثل انگلیسی (که قطعاً روی
  // گوشی صدا دارن) نتیجه «no-local-voice» بشه و اصلاً هیچی خونده نشه. این‌جا
  // همون اولِ کار، هم یه‌بار زودهنگام getVoices() صدا زده می‌شه (که خودش روی
  // خیلی مرورگرها بارگذاریِ لیست رو تریگر می‌کنه)، هم به voiceschanged گوش
  // می‌دیم تا لیست هرچه زودتر آماده باشه.
  // voicesEverLoaded / controllerInitTime: صرفاً برای تشخیصِ «گوشی اصلاً
  // موتور TTS نداره» از «فهرستِ صداها هنوز لود نشده» — پایین‌تر، توضیحِ
  // کامل‌تر همون‌جا که استفاده می‌شه.
  let voicesEverLoaded = false;
  const controllerInitTime = Date.now();
  // کشِ فهرستِ صداهایِ گوشی — به‌جایِ صدازدنِ window.speechSynthesis.getVoices()
  // هر بار که یه جایی (getBestVoice، toggle، ...) بهش نیاز داره، یه‌بار
  // اینجا نگه‌داشته می‌شه و فقط با رویدادِ voiceschanged (یا وقتی خودش هنوز
  // خالیه) دوباره از خودِ مرورگر خونده می‌شه. روی گوشی‌ها/WebViewها که
  // getVoices() ممکنه اولش خالی برگرده، همین رویدادِ voiceschanged بعداً
  // کش رو با فهرستِ واقعی پر می‌کنه.
  let cachedVoices = [];
  function refreshVoiceCache() {
    try {
      const list = window.speechSynthesis.getVoices() || [];
      if (list.length > 0) {
        cachedVoices = list;
        voicesEverLoaded = true;
      }
    } catch (e) {}
    return cachedVoices;
  }
  function getCachedVoices() {
    // اگه هنوز هیچ صدایی کش نشده، یه بار دیگه تلاش می‌کنیم (ارزون‌ه) —
    // ولی وقتی از قبل چیزی داریم، دیگه به‌جاش همون کش رو برمی‌گردونیم.
    if (!cachedVoices.length) return refreshVoiceCache();
    return cachedVoices;
  }
  try {
    if ("speechSynthesis" in window) {
      refreshVoiceCache();
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        refreshVoiceCache();
      });
    }
  } catch (e) {}
  // اگه هیچ‌کدوم از سرویس‌های آنلاینِ جایگزین حتی یه تکه هم صدا پخش نکردن
  // (یعنی گوشی برای این زبون صدای محلی نداشت، و مسیرِ آنلاین هم کلاً شکست
  // خورد — مثلاً به‌خاطرِ بلاک‌شدنِ دامنه‌ها یا قطعیِ اینترنت)، کلیدِ همون
  // سشن اینجا ذخیره می‌شه تا SpeakButton بتونه به‌جای سکوتِ کامل (که دقیقاً
  // شبیهِ «این زبون اصلاً پشتیبانی نمی‌شه» به‌نظر می‌رسه)، واقعاً یه خطا به
  // کاربر نشون بده.
  let ttsError = null;
  // گرم‌کردنِ کشِ وضعیتِ بسته‌ی Piper برای فارسی/عربی، تا همون اولین تپ هم از موتورِ نیتیو بخونه
  try { if (isNativeTtsAvailable()) ["fa", "ar"].forEach((l) => refreshNativeTtsStatus(l)); } catch (e) {}
  // همه‌ی زبان‌های دانلودشده توی کشِ سنکرون بشینن (تپِ اول هم از Piper بخونه) + موتورِ آخرین زبان گرم بشه
  try { if (isNativeTtsAvailable()) nativeWarmAll(refreshNativeTtsStatus); } catch (e) {}
  // --- تکرار سراسری ---------------------------------------------------
  let globalRepeatSetting = (() => {
    const saved = localStorage.getItem("phrasebook-tts-repeat");
    if (saved === "inf") return "inf";
    const n = Number(saved);
    return n === 2 || n === 3 ? n : 0;
  })();
  let remaining = 0;
  let singleShot = false;
  // وقتی true باشه یعنی این سِشن با options.loop باز شده (مثلاً دکمه‌ی
  // مرکزیِ «پخشِ کل متن») — تنظیمِ تکرارِ سراسری (globalRepeatSetting) روش
  // اثر نمی‌ذاره؛ به‌جاش کلِ متن، از اول تا آخر، همیشه از سر گرفته می‌شه.
  let loopWholeText = false;
  // چند بار همین جمله/چانکِ فعلی (که مسیرِ محلیِ speakChunk داره می‌خونتش)
  // تا الان علاوه‌بر خواندنِ اولش تکرار شده — هر بار که واقعاً به یه چانکِ
  // *دیگه* بریم صفر می‌شه. با این، تکرارِ سراسری دیگه «کلِ متن رو از اول
  // دوباره بخون» نیست؛ «همین جمله رو N بار بخون، بعد برو جمله‌ی بعد»ه —
  // دقیقاً همون چیزی که دکمه‌ی 🔁 از اولش قرار بود بکنه (تکرار روی «هر
  // جمله‌ای که پخش می‌کنی»، نه کلِ پاراگراف). مسیرِ آنلاینِ جایگزین
  // (playOnlineChunk) عمداً دست‌نخورده مونده و هنوز کلِ متن رو تکرار
  // می‌کنه، چون چانک‌بندیِ اونجا (onlineChunks) بر اساسِ طولِ کاراکتر
  // نیست بر اساسِ مرزِ جمله، پس با مرزِ خط/جمله یکی نیست.
  let chunkRepeatsDone = 0;
  // --- تکرارِ A-B (بازه‌ی دلخواهِ بینِ دو جمله، با دکمه‌ی گردِ A-B رویِ
  // پلیر) --------------------------------------------------------------
  // چون پخشِ TTS پیوسته نیست (هر جمله یه utterance جداست، نه یه فایلِ
  // صوتیِ یکپارچه با currentTime)، اینجا A و B به‌جایِ زمان، شماره‌ی
  // جمله (chunkIndex) هستن — یعنی «از جمله‌ی X تا جمله‌ی Y رو تکرار کن».
  // abState: "idle" (بدونِ بازه) -> "waitingB" (A ثبت شده، منتظرِ B) ->
  // "looping" (هر دو ثبت شدن، بعد از رسیدن به آخرِ جمله‌ی B برمی‌گرده به A).
  let abState = "idle";
  let abChunkA = null;
  let abChunkB = null;
  // اگه تکرارِ سراسری رو «بی‌نهایت» بذاری، طبقِ همون توضیحِ بالا («همین جمله
  // رو N بار بخون، بعد برو جمله‌ی بعد») باید یه جایی این N تموم بشه وگرنه
  // پخش برای همیشه رو همون جمله‌ی اول گیر می‌کنه و هیچ‌وقت به جمله‌های
  // بعدی (وسط/آخرِ متن) نمی‌رسه — دقیقاً همون هنگ‌کردن/ادامه‌ندادنی که
  // باعثش می‌شه. برای همینه که «بی‌نهایت» رو، فقط وقتی متن بیش از یه جمله
  // داره، به یه عددِ خیلی بزرگ ولی محدود سقف می‌زنیم؛ برای متنِ تک‌جمله‌ای
  // (مثلاً یه کلمه/عبارتِ تنها) هیچ جمله‌ی بعدی‌ای برای رسیدن بهش نیست، پس
  // همون‌جا واقعاً بی‌نهایت (تا کاربر خودش خاموشش کنه) می‌مونه.
  const CHUNK_REPEAT_INFINITE_CAP = 40;
  // وقتی خودمون عمداً speechSynthesis.cancel() صدا می‌زنیم (برای مکث یا
  // شروع پخش جدید)، مرورگر یه onerror با error="interrupted" شلیک می‌کنه که
  // خطای واقعی نیست. این فلگ همون قطع‌شدن‌های عمدی رو از خطای واقعی جدا می‌کنه.
  let expectingCancel = false;
  // ---------------------------------------------------------------------
  // «ادامه از وسطِ جمله» — قبلاً مکث/ادامه فقط در سطحِ جمله بود: اگه وسطِ
  // یه جمله‌ی بلند مکث می‌کردی، با زدنِ ادامه، همون جمله از اولش دوباره
  // خونده می‌شد (چون کلاً یه utterance جدا برای هر جمله ساخته می‌شه، نه
  // پخشِ پیوسته‌ای که currentTime داشته باشه). چون هیچ رویدادِ boundary/
  // کلمه‌ای اینجا استفاده نمی‌شه (طبقِ توضیحِ بالای فایل)، نمی‌شه نقطه‌ی
  // دقیقِ مکث رو مستقیم از مرورگر گرفت — پس با زمانِ سپری‌شده از شروعِ
  // این جمله (chunkStartedAt) و نرخِ تقریبیِ حرف‌به‌ثانیه، تخمین می‌زنیم
  // کاربر تا کجای متنِ جمله رسیده بود، و با زدنِ ادامه، فقط باقیِ متن
  // (از نزدیک‌ترین مرزِ کلمه) رو دوباره می‌خونیم — نه کلِ جمله رو.
  // chunkTextOffset: چقدر از متنِ همین جمله، قبل از شروعِ همین‌الانِ
  // utterance، از قبل خونده شده بود (برایِ ادامه‌های زنجیره‌ای/چندباره).
  const RESUME_MS_PER_CHAR = 90; // همون نرخِ تخمینیِ نوارِ پیشرفتِ پلیر
  let chunkStartedAt = 0;
  let chunkTextOffset = 0;
  // سرعتِ واقعیِ خوندنِ Piper (میلی‌ثانیه به‌ازای هر کاراکتر، در سرعتِ ۱×) —
  // از روی جمله‌هایی که کامل پخش شدن یاد گرفته می‌شه؛ برای تخمینِ نقطه‌ی مکث
  // دقیق‌تر از عددِ ثابتِ RESUME_MS_PER_CHAR (که برای Web Speech بود).
  let nativeMsPerChar = RESUME_MS_PER_CHAR;
  // ---------------------------------------------------------------------
  // «نقطه‌ی ادامه»ی سراسری و خودکار برای هر متن — کلیدش همون کلیدِ
  // speechController (`${locale}::${text}`) است. هر بار که وضعیتِ فعلی
  // (چه در حالِ پخش، چه مکث‌شده) اعلام می‌شه، آخرین آفستِ رسیده‌شده برای
  // همون کلید اینجا ذخیره می‌شه. این باعث می‌شه اگه به هر دلیلی (توقفِ
  // کاملِ speechController.stop()، یا شروعِ پخشِ یه متنِ دیگه روش) پخشِ این
  // متن قطع بشه، دفعه‌ی بعد که همین متن دوباره خواسته بشه (از هر دکمه‌ای،
  // در هر حالتی)، به‌جای از اول، از همون نقطه ادامه پیدا کنه — مگر اینکه
  // خودِ صدازننده صریحاً یه startCharOffset دیگه بده. با پایان‌یافتنِ
  // طبیعیِ کاملِ متن (بدونِ تکرارِ باقی‌مونده)، نقطه‌ش پاک می‌شه تا دفعه‌ی
  // بعد از اول شروع بشه.
  const lastOffsetByKey = new Map();
  // کدِ زبانِ (نه لوکِیل — همون چیزی که به toggle داده می‌شه، مثلاً "en")
  // سشنِ فعلاً بارشده — فقط برای وقتی لازمه که سشنِ فعلی قطع می‌شه و باید
  // بعداً دوباره باهاش toggle صدا بزنیم (پایین‌تر، pendingResume).
  let currentCode = null;
  // وقتی یه سشنِ «خواندنِ پیوسته‌ی متنِ اصلی» (loopWholeText) با کلیک روی
  // یه پخشِ تکیِ دیگه (مثلاً پخشِ یه کلمه از پاپ‌آپِ معنیِ لغت) وسط‌راه قطع
  // بشه، اطلاعاتِ لازم برای برگشتن بهش اینجا نگه داشته می‌شه: متنِ اصلی،
  // کدِ زبانش، و نقطه‌ای که توش قطع شده. بعد از اینکه اون پخشِ تکی کاملاً
  // تمام شد (با هر چند بار تکراری که کاربر روش گذاشته بود)، سه ثانیه بعد
  // همین‌جا ازش استفاده می‌شه تا خواندنِ متنِ اصلی خودکار از همون نقطه
  // ادامه پیدا کنه.
  let pendingResume = null; // { text, code, offset } | null
  let resumeTimer = null;

  function clearPendingResume() {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
    pendingResume = null;
  }

  function scheduleResumeIfPending() {
    if (!pendingResume) return;
    const toResume = pendingResume;
    pendingResume = null;
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      controller.toggle(toResume.text, toResume.code, toResume.offset, { loop: true });
    }, 3000);
  }
  // تایمرِ مکثِ بینِ دو جمله (همون چیزی که سرعتِ کند رو واقعاً حس‌شدنی می‌کنه) —
  // موقعِ pause باید کنسل بشه وگرنه جمله‌ی بعدی خودش‌به‌خود شروع می‌شه.
  let gapTimer = null;
  const listeners = new Set();

  function clearGapTimer() {
    if (gapTimer) {
      clearTimeout(gapTimer);
      gapTimer = null;
    }
  }

  // شمارنده‌ی نسلِ پخشِ نیتیو — با هر cancelSpeech بالا می‌ره تا نتیجه‌ی
  // پخشِ لغوشده (که دیر می‌رسه) روی پخشِ جدید اثر نذاره.
  let nativeSpeakGen = 0;

  function cancelSpeech() {
    nativeSpeakGen++;
    clearGapTimer();
    const native = isNativeTtsAvailable();
    if (native) nativeStop();
    try {
      // روی اندروید (Piper) فقط اگه Web Speech هم واقعاً چیزی می‌خونه (fallback) لغوش می‌کنیم؛
      // وگرنه expectingCancel بی‌دلیل روشن می‌موند.
      if (!native || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        expectingCancel = true;
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------
  // مسیر جایگزین: وقتی گوشی صدایی برای این زبون نصب نداره، از یه سرویس
  // آنلاین رایگان (بدون نیاز به کلید API) صدا رو می‌گیریم.
  // -------------------------------------------------------------------
  let onlineAudio = null;
  let onlineChunks = [];
  // 🐛 اصلاحِ باگِ «رد شدن از رویِ یه جمله در میون»: قبلاً نگاشتِ بینِ
  // ایندکسِ جمله (chunks) و ایندکسِ گروهِ صوتیِ آنلاین (onlineChunks) با
  // یه تقریبِ کاراکتری (نسبت/floor) حساب می‌شد — چون splitForOnlineTts
  // مستقل از مرزِ جمله، فقط بر اساسِ طولِ کاراکتر (۱۸۰تایی) می‌شکست. وقتی
  // چند جمله‌ی کوتاه توی یه گروهِ آنلاینِ واحد جا می‌شدن، این تقریب گاهی
  // هیچ پرشی نمی‌کرد و گاهی یه جمله رو کامل رد می‌کرد. الان splitForOnlineTts
  // مستقیم رویِ خودِ chunks گروه‌بندی می‌کنه و این دو آرایه رو هم برمی‌گردونه
  // تا نگاشتِ جمله<->گروهِ‌آنلاین همیشه دقیق باشه، نه تقریبی.
  let onlineChunkStartSentence = []; // onlineIdx -> اولین ایندکسِ جمله‌ی همون گروه
  let sentenceToOnlineChunk = []; // ایندکسِ جمله -> ایندکسِ گروهِ آنلاینِ حاویش
  let onlineChunkIndex = 0;
  // 🐛 اصلاحِ باگِ «هایلایتِ ترجمه‌ها دیرتر از خوندنِ آنلاین»: هر گروهِ
  // آنلاین (splitForOnlineTts) ممکنه چند جمله‌ی کاملِ پشتِ‌سرِهم رو توی یک
  // فایلِ صوتیِ واحد بریزه (تا سقفِ ۱۸۰ کاراکتر) — قبلاً chunkIndex فقط سرِ
  // *شروعِ* هر گروه یه‌بار آپدیت می‌شد و تا آخرِ کلِ گروه (شاید ۲-۳ جمله)
  // همون‌جا می‌موند؛ یعنی صدا وارد جمله‌ی دوم/سومِ گروه می‌شد ولی هایلایت
  // هنوز رو جمله‌ی اولِ گروه بود، تا وقتی کلِ فایلِ صوتیِ گروه تموم بشه و
  // هایلایت یهو چند جمله جلو بپره. اینجا با گوش‌دادن به پیشرفتِ واقعیِ
  // پخشِ صدا (audio.currentTime/duration) و نسبت‌دادنِ اون پیشرفت به طولِ
  // نسبیِ هر جمله‌ی داخلِ همون گروه، chunkIndex رو *در حینِ* پخشِ همون
  // فایلِ صوتیِ واحد هم به‌روز نگه می‌داریم — نه فقط سرِ شروع/پایانش.
  let currentGroupSentenceMap = []; // [{sentenceIdx, start, end}] — آفستِ نسبیِ هر جمله داخلِ متنِ همین گروه
  let currentGroupTotalLen = 0;
  function buildGroupSentenceMap(idx) {
    const startSentence = onlineChunkStartSentence[idx] != null ? onlineChunkStartSentence[idx] : 0;
    const endSentenceExclusive =
      onlineChunkStartSentence[idx + 1] != null ? onlineChunkStartSentence[idx + 1] : chunks.length;
    const map = [];
    let pos = 0;
    for (let i = startSentence; i < endSentenceExclusive; i++) {
      const len = chunks[i] && chunks[i].text ? chunks[i].text.length : 0;
      map.push({ sentenceIdx: i, start: pos, end: pos + len });
      pos += len;
      if (i < endSentenceExclusive - 1) pos += 1; // فاصله‌ی join(" ") توی groupText
    }
    currentGroupSentenceMap = map;
    currentGroupTotalLen = pos;
  }
  let onlineLangForTts = "en";
  // آیا توی همین سشنِ آنلاینِ فعلی، حتی یه تکه‌صدا هم واقعاً شروع به پخش
  // کرده؟ اگه اولین تکه شکست بخوره و این هنوز false باشه، یعنی کلِ مسیرِ
  // آنلاین از همون اول خراب بوده (نه یه قطعیِ موقتِ وسطِ‌راه) — پس به‌جای
  // رد شدنِ بی‌صدا از همه‌ی تکه‌های باقی‌مونده، باید متوقف بشیم و خطا بدیم.
  let onlineAnyAudioPlayed = false;

  // گروه‌بندیِ متن برای درخواست‌هایِ TTSِ آنلاین. قبلاً این تابع مستقیم
  // رویِ متنِ خام و صرفاً بر اساسِ طولِ کاراکتر می‌شکست، کاملاً بی‌خبر از
  // مرزهایِ جمله‌ای که chunks (splitSentences) از قبل مشخص کرده بود —
  // همین جدابودنِ دو تکه‌بندی، ریشه‌ی باگِ «دکمه‌ی جمله‌ی بعد/قبل یکی
  // درمیون رد می‌شه» بود (توضیحِ کامل‌تر بالای seekToChunk). الان مستقیم
  // رویِ خودِ chunks (که هر کدوم دقیقاً یه جمله‌ست) گروه‌بندی می‌کنیم —
  // هر گروهِ آنلاین از یک یا چند جمله‌ی کاملِ پشتِ‌سرِهم تشکیل می‌شه (تا
  // سقفِ maxLen کاراکتر) — و علاوه بر متنِ هر گروه، دو نگاشتِ دقیق هم
  // برمی‌گردونیم: اینکه هر گروهِ آنلاین با کدوم جمله شروع می‌شه، و هر
  // جمله توی کدوم گروهِ آنلاینه. این دو دیگه هیچ تقریب/گردکردنی ندارن.
  function splitForOnlineTts(sentenceChunks, maxLen = 180) {
    const texts = [];
    const onlineToSentenceStart = [];
    const sentenceToOnlineIdx = [];
    if (!sentenceChunks || !sentenceChunks.length) {
      return { texts: [], onlineToSentenceStart: [], sentenceToOnlineIdx: [] };
    }
    let groupText = "";
    let groupStartSentence = 0;
    for (let i = 0; i < sentenceChunks.length; i++) {
      const s = sentenceChunks[i].text;
      const candidate = groupText ? groupText + " " + s : s;
      if (groupText && candidate.length > maxLen) {
        texts.push(groupText);
        onlineToSentenceStart.push(groupStartSentence);
        groupText = s;
        groupStartSentence = i;
      } else {
        groupText = candidate;
      }
      // ایندکسِ گروهی که این جمله توش قرار می‌گیره: همون گروهِ هنوز-باز
      // (که در پایانِ حلقه یا شروعِ گروهِ بعدی بسته و push می‌شه) — یعنی
      // texts.length همین الان، قبل از بسته‌شدنِ گروهِ فعلی.
      sentenceToOnlineIdx.push(texts.length);
    }
    if (groupText) {
      texts.push(groupText);
      onlineToSentenceStart.push(groupStartSentence);
    }
    return { texts, onlineToSentenceStart, sentenceToOnlineIdx };
  }

  // -------------------------------------------------------------------
  // Edge/Azure Neural TTS — قبلاً اینجا مستقیم از خودِ صفحه یه وب‌سوکت به
  // speech.platform.bing.com باز می‌شد، ولی چون Origin صفحه یه دامنه‌ی
  // معمولیه (نه خودِ اپلیکیشنِ Edge)، سرورِ مایکروسافت همیشه رد می‌کرد و
  // اتصال با "failed" می‌افتاد — این یه محدودیتِ ذاتیه، نه یه باگِ قابلِ
  // رفع از سمتِ کلاینت. برای همین این درخواست رو به بک‌اندِ Cloudflare
  // Worker خودمون (همونی که برای AI chat استفاده می‌شه — src/index.js)
  // فرستادیم؛ اونجا سمتِ سرور (بدونِ محدودیتِ Origin) وب‌سوکت رو به
  // مایکروسافت وصل می‌کنه، mp3 رو می‌گیره، و یه فایلِ صوتیِ ساده
  // برمی‌گردونه — از دیدِ اینجا دقیقاً مثلِ یه URLِ معمولی (مثلِ
  // Google-Translate-TTS/StreamElements)، بدونِ نیاز به هیچ منطقِ
  // وب‌سوکت/GEC-token توی خودِ اپ.
  // -------------------------------------------------------------------

  // فهرستِ سرویس‌های آنلاینِ جایگزین برای یه تکه‌متن، به‌ترتیبِ اولویت:
  // اول پراکسیِ Edge/Azureِ خودمون (پوششِ کاملِ همه‌ی زبون‌ها از جمله فارسی
  // و عربی، که Google-Translate-TTS اصلاً پشتیبانی‌شون نمی‌کنه)، بعد
  // Google-Translate-TTS و StreamElements به‌عنوانِ پشتیبان اگه به هر
  // دلیلی خودِ Worker دردسترس نبود.
  // برای فارسی/عربی، Google-Translate-TTS (۴۰۴ می‌ده) و StreamElements
  // (۴۰۱ می‌ده) اصلاً کار نمی‌کنن — امتحان‌کردن‌شون فقط باعثِ تأخیر و یه
  // خطای اضافه توی کنسول می‌شه، برای همین فقط پراکسیِ Edge رو برمی‌گردونیم.
  function onlineTtsProviders(chunkText, langCode) {
    const voice = EDGE_TTS_VOICE[langCode] || EDGE_TTS_VOICE.en;
    const q = encodeURIComponent(sanitizeForTTS(chunkText));
    const edgeProxy = { kind: "url", url: `${DEFAULT_BACKEND_URL}/api/tts?voice=${encodeURIComponent(voice)}&text=${q}` };
    if (langCode === "fa" || langCode === "ar") return [edgeProxy];
    const googleTranslate = { kind: "url", url: `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${q}` };
    const streamElements = { kind: "url", url: `https://api.streamelements.com/kappa/v2/speech?voice=${langCode}&text=${q}` };
    return [edgeProxy, googleTranslate, streamElements];
  }


  function stopOnlineAudio() {
    if (onlineAudio) {
      try {
        onlineAudio.pause();
      } catch (e) {}
      onlineAudio.onended = null;
      onlineAudio.onerror = null;
      onlineAudio = null;
    }
  }

  // بازه‌ی A-B رو برایِ مسیرِ آنلاین هم اعمال می‌کنه — قبلاً این مسیر
  // (که فقط فارسی/عربی، یا وقتی گوشی صدایِ محلی نداره ازش استفاده می‌شه)
  // اصلاً abState رو چک نمی‌کرد و همیشه idx+1 می‌رفت، پس روی این زبون‌ها
  // دکمه‌ی A-B هیچ اثری نداشت. چون تکه‌بندیِ آنلاین (onlineChunks) با
  // تکه‌بندیِ جمله‌ایِ abChunkA/abChunkB (که رویِ chunks حساب می‌شن) یکی
  // نیست، اینجا با chunkIndexForOffset یه تخمینِ «این idx آنلاین معادلِ
  // کدوم جمله‌ست» می‌زنیم؛ وقتی به جمله‌یِ B یا بعدترش رسیدیم، به‌جایِ
  // idx+1 برمی‌گردیم به نزدیک‌ترین idx آنلاینِ معادلِ شروعِ جمله‌ی A.
  function nextOnlineIdx(idx) {
    const fallback = idx + 1;
    if (abState !== "looping" || abChunkB === null || abChunkA === null) return fallback;
    if (!onlineChunks.length) return fallback;
    // دیگه به‌جایِ تخمینِ کاراکتری/floor، مستقیم از نگاشتِ دقیقِ
    // onlineChunkStartSentence استفاده می‌کنیم: می‌فهمیم گروهِ آنلاینِ
    // fallback دقیقاً با کدوم جمله شروع می‌شه.
    const startSentence =
      onlineChunkStartSentence[fallback] != null ? onlineChunkStartSentence[fallback] : chunks.length;
    if (startSentence < abChunkB) return fallback;
    return sentenceToOnlineChunk[abChunkA] != null ? sentenceToOnlineChunk[abChunkA] : fallback;
  }

  function playOnlineChunkUrls(providers, providerIndex, idx) {
    if (providerIndex >= providers.length) {
      if (!onlineAnyAudioPlayed) {
        // هیچ‌کدوم از سرویس‌های آنلاین حتی یه تکه هم پخش نشد — بقیه‌ی
        // تکه‌ها هم قطعاً همین‌طور شکست می‌خورن (چون علتش معمولاً کلیه:
        // بلاک‌بودنِ دامنه یا قطعیِ اینترنت، نه یه تکه‌ی خاص). به‌جای
        // رد شدنِ بی‌صدا از همه‌شون تا آخر (که دقیقاً همون چیزیه که باعث
        // می‌شه انگار این زبون اصلاً پشتیبانی نمی‌شه)، همین‌جا متوقف
        // می‌شیم و خطا رو گزارش می‌کنیم.
        ttsError = key;
        status = "idle";
        notify();
        return;
      }
      playOnlineChunk(nextOnlineIdx(idx));
      return;
    }
    const provider = providers[providerIndex];
    const goNext = () => {
      if (status !== "playing") return;
      playOnlineChunkUrls(providers, providerIndex + 1, idx);
    };

    const audio = new Audio(provider.url);
    audio.playbackRate = rate;
    audio.volume = muted ? 0 : 1;
    audio.onplaying = () => {
      onlineAnyAudioPlayed = true;
      // 🐛 قبلاً chunkIndex (و در نتیجه‌ش هایلایت + اسکرولِ خودکار) همون
      // لحظه‌ای که این گروه *انتخاب* می‌شد آپدیت می‌شد (پایین‌تر، توی
      // playOnlineChunk) — یعنی قبل از اینکه اصلاً درخواستِ شبکه برای
      // گرفتنِ فایلِ صوتی زده بشه. چون مسیرِ آنلاین (که فارسی/عربی همیشه
      // ازش استفاده می‌کنن) بینِ انتخابِ جمله‌ی بعدی و واقعاً شنیده‌شدنِ
      // صداش یه تأخیرِ شبکه‌ای (fetch) داره، هایلایت/اسکرول زودتر از صدا
      // می‌پرید — دقیقاً همون ناهماهنگیِ سه‌تایی‌ای که کاربر گزارش کرد.
      // حالا این آپدیت به همین‌جا (audio.onplaying — یعنی لحظه‌ای که صدا
      // واقعاً شروع به پخش می‌کنه) منتقل شده.
      const startSentence = onlineChunkStartSentence[idx];
      if (startSentence != null && startSentence !== chunkIndex) {
        chunkIndex = startSentence;
        notify();
      }
    };
    // پیشرفتِ زنده‌ی هایلایت *داخلِ* همین یک فایلِ صوتی — وقتی این گروه
    // چند جمله رو با هم داره می‌خونه، با پیش‌رفتنِ currentTime، محاسبه
    // می‌کنیم صدا احتمالاً به کدوم جمله‌ی داخلِ همین گروه رسیده و chunkIndex
    // رو همون‌جا (نه فقط سرِ شروعِ کلِ گروه) جلو می‌بریم.
    audio.ontimeupdate = () => {
      if (status !== "playing" || !currentGroupSentenceMap.length || !isFinite(audio.duration) || audio.duration <= 0) return;
      const frac = Math.min(1, Math.max(0, audio.currentTime / audio.duration));
      const targetPos = frac * currentGroupTotalLen;
      let matched = currentGroupSentenceMap[0].sentenceIdx;
      for (const seg of currentGroupSentenceMap) {
        if (targetPos >= seg.start) matched = seg.sentenceIdx;
        else break;
      }
      if (matched !== chunkIndex) {
        chunkIndex = matched;
        notify();
      }
    };
    audio.onended = () => {
      if (status !== "playing") return;
      // بی‌نهایت: همین گروهِ آنلاین رو از نو پخش کن، نه گروهِ بعدی.
      // کاربر باید خودش دکمه‌ی «جمله‌ی بعد» رو بزنه.
      if (!singleShot && globalRepeatSetting === "inf") {
        playOnlineChunkUrls(onlineTtsProviders(onlineChunks[idx], onlineLangForTts), 0, idx);
        return;
      }
      playOnlineChunk(nextOnlineIdx(idx));
    };
    audio.onerror = () => {
      goNext();
    };
    onlineAudio = audio;
    audio.play().catch(() => {
      goNext();
    });
  }

  function playOnlineChunk(idx) {
    if (idx >= onlineChunks.length) {
      if (abState === "looping" && abChunkA !== null) {
        const aOnlineIdx = sentenceToOnlineChunk[abChunkA] != null ? sentenceToOnlineChunk[abChunkA] : 0;
        playOnlineChunk(aOnlineIdx);
        return;
      }
      if (!singleShot && globalRepeatSetting === "inf") {
        playOnlineChunk(0);
        return;
      }
      if (!singleShot && remaining > 0) {
        remaining -= 1;
        playOnlineChunk(0);
        return;
      }
      if (key) lastOffsetByKey.delete(key);
      status = "idle";
      chunkIndex = 0;
      notify();
      scheduleResumeIfPending();
      return;
    }
    onlineChunkIndex = idx;
    buildGroupSentenceMap(idx);
    status = "playing";
    // توجه: chunkIndex اینجا دیگه دست‌نمی‌خوره — همون مقدارِ قبلی (آخرین
    // جمله‌ای که واقعاً شنیده شد) می‌مونه تا وقتی صدای همین گروهِ جدید
    // واقعاً شروع بشه (audio.onplaying، بالاتر توی playOnlineChunkUrls).
    notify();
    playOnlineChunkUrls(onlineTtsProviders(onlineChunks[idx], onlineLangForTts), 0, idx);
  }

  function speakOnline(text, langCodeForTts, startCharOffset, forceSingle, forceLoop, sentenceBoundaries) {
    stopOnlineAudio();
    mode = "online";
    onlineAnyAudioPlayed = false;
    fullText = text;
    chunks = splitSentences(text, sentenceBoundaries);
    const onlineSplit = splitForOnlineTts(chunks);
    onlineChunks = onlineSplit.texts;
    onlineChunkStartSentence = onlineSplit.onlineToSentenceStart;
    sentenceToOnlineChunk = onlineSplit.sentenceToOnlineIdx;
    onlineLangForTts = langCodeForTts;
    singleShot = !!forceSingle;
    loopWholeText = !!forceLoop;
    remaining = singleShot ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
    let startChunk = 0;
    if (Number.isInteger(startCharOffset) && startCharOffset > 0 && chunks.length && onlineChunks.length) {
      // اول بفهمیم این آفستِ کاراکتری تویِ کدوم جمله‌ست، بعد از نگاشتِ
      // دقیقِ جمله->گروهِ‌آنلاین استفاده کنیم (نه یه فراکشنِ کاراکتریِ
      // مستقیم که دیگه با گروه‌بندیِ جدید هم‌ارز نیست).
      const sIdx = chunkIndexForOffset(Math.min(startCharOffset, Math.max(text.length - 1, 0)));
      startChunk = sentenceToOnlineChunk[sIdx] != null ? sentenceToOnlineChunk[sIdx] : 0;
    }
    // مقدارِ اولیه‌ی chunkIndex رو همین‌جا درست می‌کنیم — چون از این به بعد
    // خودِ playOnlineChunk دیگه chunkIndex رو زودهنگام دست‌نمی‌زنه (این
    // آپدیت به audio.onplaying منتقل شده تا هایلایت زودتر از صدا نپره)،
    // برای همون اولین جمله باید همین‌جا مقدارِ درست رو از قبل بذاریم.
    chunkIndex = onlineChunkStartSentence[startChunk] != null ? onlineChunkStartSentence[startChunk] : 0;
    playOnlineChunk(startChunk);
  }

  function notify() {
    if (key && (status === "playing" || status === "paused") && chunks[chunkIndex]) {
      lastOffsetByKey.set(key, chunks[chunkIndex].start);
    }
    listeners.forEach((cb) =>
      cb({ key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, ttsError, muted, abState, abChunkA, abChunkB, repeatsDone: chunkRepeatsDone })
    );
  }

  // حداکثر چند کلمه تو یه تکه (chunk) بگنجه. این فقط یه دریچه‌ی اطمینانه
  // برای متنِ خیلی بلندِ بدونِ علامتِ‌نگارشی (مثلاً «خواندنِ کل لیستِ لغات»
  // که کلی کلمه با فاصله به‌هم چسبیده‌ن) — جمله‌های عادی (که تقریباً همیشه
  // کمتر از این عدد کلمه دارن) هیچ‌وقت بهش نمی‌رسن و کاملاً یک‌تکه و
  // یک‌نفس خونده می‌شن (ویرگولِ داخلِ جمله دیگه جایی برای شکستنِ چانک
  // نیست — بریدنِ گفتار سرِ هر ویرگول خودش مصنوعی به‌نظر می‌رسید؛ مکثِ
  // ویرگول رو حالا موتور خودش به‌طورِ طبیعی توی همون یک‌ utterance می‌سازه).
  const MAX_WORDS_PER_CHUNK = 40;

  // -----------------------------------------------------------------------
  // محافظت از نقطه‌های داخلِ مخفف‌ها/اعدادِ اعشاری/حروفِ‌اولِ اسم (initials)
  // در برابرِ splitSentencesRaw. بدونِ این محافظت، splitSentencesRaw هر
  // نقطه رو مرزِ پایانِ جمله حساب می‌کرد، پس مثلاً "I saw Dr. Lee." به دو
  // «جمله»ی غلط («I saw Dr.» و «Lee.») می‌شکست و هر کدوم جدا جدا (وقتی
  // تنظیمِ تکرار روشن بود) تکرار می‌شدن — دقیقاً همون باگِ گزارش‌شده.
  // راه‌حل کاملاً کد-محور و بدونِ اتصال به هوش مصنوعی: قبل از اجرایِ
  // regexِ جمله‌بندی، نقطه‌ی این موارد رو با یه کاراکترِ کنترلیِ نامرئی
  // (SENTENCE_DOT_PLACEHOLDER) عوض می‌کنیم — چون این جایگزینی همیشه یک‌به‌یک
  // (یک کاراکتر با یک کاراکتر) انجام می‌شه، طولِ رشته و در نتیجه همه‌ی
  // آفست‌های start/end دست‌نخورده می‌مونن. بعدِ جمله‌بندی، همون کاراکتر رو
  // به نقطه برمی‌گردونیم.
  const SENTENCE_DOT_PLACEHOLDER = "\u0000";
  // توجه: عمداً کلمه‌هایی مثل "no" اینجا نیستن — تویِ مکالمه‌های روزمره،
  // "No." خودش می‌تونه یه جمله‌ی کاملِ تک‌کلمه‌ای باشه (مثلِ جوابِ کوتاهِ
  // «No.» به یه سؤالِ بله/خیر)، پس محافظت‌کردنِ نقطه‌ش باعثِ ادغامِ غلطش با
  // جمله‌ی بعدی می‌شد — دقیقاً برعکسِ چیزی که این تابع باید جلوش رو بگیره.
  const SENTENCE_ABBREVIATIONS = [
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "sgt", "capt", "gen",
    "rev", "hon", "gov", "lt", "col", "cmdr", "adm", "maj", "fr", "pres",
    "vs", "etc", "approx", "vol", "fig", "eq", "dept", "univ", "assn",
    "est", "al", "inc", "ltd", "co", "corp",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  ];
  const SENTENCE_ABBR_RE = new RegExp("\\b(" + SENTENCE_ABBREVIATIONS.join("|") + ")\\.(?=\\s|[A-Z]|$)", "gi");
  // مخفف‌هایی که خودشون از قبل یه نقطه‌ی داخلی دارن (e.g. i.e. a.m. p.m. ...)
  const SENTENCE_MULTI_DOT_ABBR_RE = /\b([ei]\.g|i\.e|[ap]\.m|u\.s|u\.k|u\.n|e\.u)\.(?=\s|$)/gi;

  function protectAbbreviationDots(text) {
    let out = text;
    out = out.replace(SENTENCE_MULTI_DOT_ABBR_RE, (m) => m.replace(/\./g, SENTENCE_DOT_PLACEHOLDER));
    out = out.replace(SENTENCE_ABBR_RE, (m) => m.slice(0, -1) + SENTENCE_DOT_PLACEHOLDER);
    // اعدادِ اعشاری: 3.14 — نقطه‌ی بینِ دو رقم هیچ‌وقت پایانِ جمله نیست.
    out = out.replace(/(\d)\.(?=\d)/g, `$1${SENTENCE_DOT_PLACEHOLDER}`);
    // حروفِ‌اولِ اسم (initials): "J. K. Rowling" یا "U. S." — یه حرفِ بزرگِ
    // تنها که نقطه‌ش بلافاصله با یه حرفِ بزرگِ دیگه (نقطه‌دار یا شروعِ کلمه) دنبال می‌شه.
    out = out.replace(/\b([A-Z])\.(?=\s?[A-Z](?:\.|[a-z]))/g, `$1${SENTENCE_DOT_PLACEHOLDER}`);
    return out;
  }

  // متن رو اول به جمله تقسیم می‌کنه (روی .!?؟ و غیره، با محافظتِ بالا برای
  // مخفف‌ها)، بعد فقط اگه یه «جمله» به‌طرز غیرعادی بلند بود (یعنی احتمالاً
  // اصلاً جمله نیست، یه بلوکِ متنِ بدونِ نقطه‌ست) به تکه‌های چندکلمه‌ای می‌شکنه.
  function splitSentencesRaw(text) {
    const t = text || "";
    if (!t) return [];
    const protectedText = protectAbbreviationDots(t);
    const re = /[^.!?؟。！]+[.!?؟。！]*/g;
    const sentences = [];
    let m;
    while ((m = re.exec(protectedText))) {
      const raw = m[0];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const start = m.index + raw.indexOf(trimmed[0]);
      // نقطه‌هایِ محافظت‌شده رو برمی‌گردونیم؛ چون جایگزینی یک‌به‌یک بود،
      // طولِ trimmed عوض نشده و start/end همچنان درسته.
      const restored = trimmed.split(SENTENCE_DOT_PLACEHOLDER).join(".");
      sentences.push({ start, end: start + restored.length, text: restored });
    }
    if (!sentences.length) return [{ start: 0, end: t.length, text: t }];

    const out = [];
    for (const seg of sentences) {
      const wordRe = /\S+/g;
      const wordPositions = [];
      let wm;
      while ((wm = wordRe.exec(seg.text))) wordPositions.push({ start: wm.index, end: wm.index + wm[0].length });

      if (wordPositions.length <= MAX_WORDS_PER_CHUNK) {
        out.push({ ...seg, boundary: "sentence" });
        continue;
      }
      for (let i = 0; i < wordPositions.length; i += MAX_WORDS_PER_CHUNK) {
        const lastIdx = Math.min(i + MAX_WORDS_PER_CHUNK, wordPositions.length) - 1;
        const isLastSub = lastIdx === wordPositions.length - 1;
        const wStart = wordPositions[i].start;
        const wEnd = wordPositions[lastIdx].end;
        out.push({
          start: seg.start + wStart,
          end: seg.start + wEnd,
          text: seg.text.slice(wStart, wEnd),
          boundary: isLastSub ? "sentence" : "none",
        });
      }
    }
    return out;
  }

  // 🐛 اصلاحِ باگِ «هایلایت گاهی دیرتر از خواندن»: splitSentencesRaw بالا
  // مستقل از دیتای خودِ اپ، فقط با یه regex رویِ علامت‌های‌نگارشی جمله‌بندی
  // می‌کنه. ولی «جمله»هایی که خودِ اپ برای هایلایت استفاده می‌کنه (مثلاً
  // sentenceOffsets تویِ StoryBuilder) از رویِ دیتایِ داستان/ترجمه ساخته
  // می‌شن، نه از رویِ همین regex — و این دو همیشه یکی نیستن (مثلاً یه
  // جمله‌ی ترجمه‌شده که بدونِ نقطه تموم شده). وقتی این دو تا مرزبندی فرق
  // کنن، ممکنه دو «جمله»ی UI توی یه چانکِ TTS واحد ادغام بشن؛ آخرش صدا
  // داره جمله‌ی دوم رو می‌خونه ولی چون از نظرِ TTS هنوز همون چانکِ قبلیه،
  // هیچ رویدادِ «شروعِ چانکِ تازه»ای شلیک نمی‌شه و هایلایت رو جمله‌ی اول
  // گیر می‌کنه تا وقتی این چانکِ ادغام‌شده تمام بشه — دقیقاً همون تاخیرِ
  // هایلایتِ گزارش‌شده.
  //
  // راه‌حل: اگه صدازننده مرزهای دقیقِ جمله‌های خودش (boundaryOffsets — مثلاً
  // sentenceOffsets.map(s => s.start)) رو بده، اول متن رو دقیقاً سرِ همون
  // آفست‌ها به قطعاتِ سخت می‌شکنیم، و فقط داخلِ هر قطعه (نه بینِ دو قطعه)
  // splitSentencesRaw معمولی رو اجرا می‌کنیم. این تضمین می‌کنه هیچ‌وقت دو
  // «جمله»ی UI با هم ادغام نشن — نتیجه‌ش ممکنه یه مکثِ اضافه‌ی خیلی کوتاه
  // سرِ جایی باشه که regex خودش جمله رو تموم‌شده نمی‌دید، ولی هایلایت
  // همیشه دقیقاً هم‌زمان با شروعِ همون جمله عوض می‌شه.
  function splitSentences(text, boundaryOffsets) {
    const t = text || "";
    if (!t) return [];
    const bounds = Array.isArray(boundaryOffsets)
      ? [...new Set(boundaryOffsets.filter((n) => Number.isInteger(n) && n > 0 && n < t.length))].sort((a, b) => a - b)
      : [];
    if (!bounds.length) return splitSentencesRaw(t);

    const out = [];
    let cursor = 0;
    for (const b of [...bounds, t.length]) {
      if (b <= cursor) continue;
      const segment = t.slice(cursor, b);
      for (const piece of splitSentencesRaw(segment)) {
        out.push({ ...piece, start: piece.start + cursor, end: piece.end + cursor });
      }
      cursor = b;
    }
    return out;
  }

  // چیزی که واقعاً باید با صدا خونده بشه — نه هر چی که روی صفحه نوشته شده.
  // گیومه‌های فارسی/عربی/انگلیسی/فرانسوی (« » " " ' ' „ ‟ ` ´) و نشونه‌های
  // نامرئیِ جهتِ‌متن (که برای رفعِ باگِ راست‌به‌چپ/چپ‌به‌راست به متن اضافه
  // می‌شن) هیچ‌کدوم معنایی برای گفتار ندارن؛ بعضی موتورهای TTS گوشی
  // (خصوصاً موتورهای آفلاین/محلی) به‌جای رد شدن ازشون، اسمشون رو با زبانِ
  // فعلی می‌خونن (یا باعثِ یه مکثِ عجیب می‌شن) — همینه که کاربر به‌عنوانِ
  // «گیومه‌ها و فاصله‌ها رو با هر زبونی که باشه می‌خونه» گزارش کرد. این
  // تابع فقط رویِ متنی که مستقیم به موتورِ گفتار داده می‌شه اثر می‌ذاره؛
  // به chunks[i].text یا آفست‌های start/end دست نمی‌زنه (اونا برای
  // sync/ادامه‌دادن از همون نقطه هنوز باید دقیقاً با متنِ اصلی یکی باشن).
  function sanitizeForTTS(s) {
    // علائمِ نگارشی‌ای که برای مکثِ طبیعیِ بینِ‌جمله/بند لازمن و نگه‌داشته
    // می‌شن — بقیه‌ی نشونه‌ها (ایموجی، #، @، %، &، پرانتز، بولت، و غیره)
    // پایین‌تر حذف می‌شن چون خیلی از موتورهای TTS به‌جای ردشدن ازشون،
    // اسم/توصیفِ لفظی‌شون رو می‌خونن.
    const KEEP_PUNCT = ".,!?;:،؛؟…\u2019";
    return String(s || "")
      // بلوک‌های کدِ مارک‌داون (```...```) — کلِ نشونه‌گذاریِ فنس (همراهِ
      // برچسبِ زبونِ احتمالیِ کنارش، مثلاً «```js») حذف می‌شه؛ محتوایِ
      // داخلش که می‌مونه پایین‌تر با همون قاعده‌ی معمولی پاک‌سازی می‌شه.
      .replace(/```[a-zA-Z0-9]*\n?/g, " ")
      // کدِ این‌لاین با یه‌ backtick تکی (مثلاً `const x`) — خودِ backtickها
      // پایین‌تر (کنارِ گیومه‌ها) حذف می‌شن؛ اینجا فقط برای اطمینان از
      // اینکه بلوک‌های چندخطی هم افتاده باشن.
      // آدرس‌های وب (http/https/www) — خوندنِ لفظیِ حروف‌به‌حرفِ یه URL
      // (اسلش، نقطه، دامنه) هیچ ارزشی برایِ شنونده نداره و کاملاً مصنوعی
      // به‌نظر می‌رسه؛ کاملاً حذف می‌شن، نه فقط علامت‌هاشون.
      .replace(/\bhttps?:\/\/\S+/gi, " ")
      .replace(/\bwww\.\S+/gi, " ")
      // 🐛 مخفف‌های رایجِ عنوان — موتورِ TTS وقتی «Dr»/«Mr»/«Mrs»/«Ms»/«Prof»
      // رو تنها (بدون یه اسمِ آشنا بعدش، یا حتی با نقطه) می‌بینه، گاهی
      // به‌جایِ خوندنش به‌عنوانِ عنوان، سعی می‌کنه از روی حروفش یه کلمه‌ی
      // دیگه بسازه (مثلاً «Dr» → «drive») یا تک‌تکِ حروفش رو بخونه. اینجا
      // قبل از هر پاک‌سازیِ دیگه‌ای، این مخفف‌ها رو به شکلِ کاملشون باز
      // می‌کنیم — فقط وقتی که به‌عنوانِ یه کلمه‌ی جدا اومدن (نه وسطِ یه
      // کلمه‌ی دیگه)، تا مثلاً «Drive» خودش دست‌نخورده بمونه.
      .replace(/\bDr\.?(?=\s|$)/g, "Doctor")
      .replace(/\bMrs\.?(?=\s|$)/g, "Missus")
      .replace(/\bMr\.?(?=\s|$)/g, "Mister")
      .replace(/\bMs\.?(?=\s|$)/g, "Miss")
      .replace(/\bProf\.?(?=\s|$)/g, "Professor")
      .replace(/[\u2066-\u2069\u200B-\u200F\u061C\uFEFF]/g, "") // isolate marks/zero-width/bidi/BOM
      // ایموجی‌ها — صورتک/نماد/پرچم/تغییردهنده‌ی رنگِ‌پوست/دنباله‌های ZWJ و
      // انتخاب‌گرِ نمایشِ ایموجی. اکثرِ موتورهای TTS به‌جای رد شدن ازشون،
      // توصیفِ لفظی‌شون رو می‌خونن (مثلاً «😊» → «face with smiling eyes»)
      // که دقیقاً همون چیزیه که کاربر گزارش کرد.
      .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u20E3\uFE0F]/gu, "")
      // علامت‌های نقل‌قول رو در هر شکلی حذف می‌کنیم — چه گیومه‌ی فارسی/تایپوگرافیک
      // («» „ ‟ " " ' ')، چه گیومه‌ی ساده‌ی انگلیسیِ روی کیبورد (" و ') که قبلاً
      // حذف نمی‌شدن و همون چیزی بودن که باعثِ خونده‌شدنِ «گیومه» توسطِ موتورِ
      // TTS می‌شدن — صرف‌نظر از اینکه متن به چه زبونی باشه.
      // علامت‌های نقل‌قولِ خالص (که هیچ‌وقت داخلِ یه کلمه به‌عنوانِ آپاستروف
      // استفاده نمی‌شن) — همیشه حذف می‌شن.
      .replace(/[«»‹›„‟""]/g, "")
      // 🐛 آپاستروفِ ابهام‌دار («straight quote» ' و بک‌تیک/آکسان و گیومه‌ی
      // تک‌تایپوگرافیکِ منحنی) — قبلاً همیشه حذف می‌شد که «I've» رو تبدیل
      // به «Ive» می‌کرد و موتور به‌جایِ یه‌ کلمه، حرف‌به‌حرف می‌خوندش. راه‌حلِ
      // اول (نگه‌داشتنِ خودِ کاراکترِ ' وقتی بینِ دو حرفه) نصفه بود: معلوم شد
      // مشکلِ اصلی خودِ همون کاراکترِ apostrophe سرراست (') ه — موتورِ TTSِ
      // اندروید حتی رویِ کلمه‌های رایجی مثلِ «it's» هم گاهی این نشونه رو
      // به‌جایِ ادغام‌کردنِ طبیعی، به‌طورِ عجیبی می‌خونه. برای همین الان
      // به‌جایِ نگه‌داشتنِ خودِ ' ، وقتی این نشونه بینِ دو حرفه (یعنی واقعاً
      // نقشِ آپاستروفِ کانتراکشن/مالکیت رو داره: I've, don't, it's, cat's)
      // با آپاستروفِ تایپوگرافیکِ راستِ یونیکد (’ U+2019) جایگزین می‌شه —
      // که موتورها طبیعی و بدونِ مکث می‌خوننش، نه به‌عنوانِ یه نشونه‌ی جدا.
      // وقتی لبه‌ی یه کلمه‌ست (یعنی واقعاً داره نقلِ‌قول رو مشخص می‌کنه،
      // مثلِ 'hello') طبقِ قبل کاملاً حذف می‌شه.
      .replace(/[''`´"']/gu, (ch, offset, str) => {
        const isLetter = (c) => /\p{L}/u.test(c || "");
        return isLetter(str[offset - 1]) && isLetter(str[offset + 1]) ? "\u2019" : "";
      })
      // نشونه‌های باقی‌مونده‌ی مارک‌داون (اگه یه‌جایی قبل از رسیدن به اینجا
      // پاک نشده باشن) — بعضی موتورهای TTS این علامت‌ها رو هم لفظی می‌خونن.
      .replace(/[*_~]/g, "")
      // بقیه‌ی علائمِ نگارشی/نمادها (#، @، %، &، +، =، <، >، |، \، ^، پرانتز/
      // براکت، بولت، خط‌تیره‌ی تزئینی و ...) — چون خیلی از موتورها این‌ها رو
      // به‌جای سکوت، لفظی («هشتگ»، «امپرسند»، ...) می‌خونن. فقط علائمِ لازم
      // برای مکثِ طبیعیِ بینِ‌جمله (بالا در KEEP_PUNCT) دست‌نخورده می‌مونن؛
      // بقیه با یه فاصله جایگزین می‌شن تا کلمه‌های اطرافشون به‌هم نچسبن.
      .replace(/[\p{P}\p{S}]/gu, (ch) => (KEEP_PUNCT.includes(ch) ? ch : " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  function chunkIndexForOffset(offset) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (offset >= chunks[i].start) return i;
    }
    return 0;
  }

  // چیزی که موتورِ TTS واقعاً باهاش صدا کنیم. قبلاً کف رو ۰.۴ گذاشته بودیم
  // (برای حفظِ پروسودیِ طبیعی)، ولی همین باعث می‌شد سرعت‌های پایین (مثلاً
  // ۰.۳ که کاربر از اسلایدر انتخاب می‌کنه) عملاً به موتور نزدیک به سرعتِ
  // عادی داده بشه و کندشدنش اصلاً حس نشه. حالا کف رو ۰.۲ گذاشتیم (هم‌راستا
  // با کفِ ۰.۲ی sentenceGapMs پایین‌تر) تا انتخابِ سرعت‌های پایین واقعاً
  // حس بشه — به قیمتِ کمی کمتر طبیعی‌بودنِ لحن، فقط رویِ پایین‌ترین
  // سرعت‌ها. مکثِ سرِ ویرگول رو همچنان خودِ موتور، داخلِ همون یک
  // utterance، به‌طورِ طبیعی می‌سازه — نه ما با شکستنِ دستی. سرعتِ واقعیِ
  // حس‌شده رو مکثِ بینِ‌جمله‌ها (sentenceGapMs) هم تکمیل می‌کنه که کاملاً
  // دستِ خودمونه.
  function engineRate(r) {
    if (r >= 1) return r;
    // r در بازه‌ی [0.25 .. 1] → engine rate در بازه‌ی [0.2 .. 1]
    return 0.2 + ((r - 0.25) / 0.75) * 0.8;
  }

  // مکثِ بعد از پایانِ یه جمله‌ی واقعی — تنها جایی که خودمون دستی مکث
  // اضافه می‌کنیم؛ چون سرِ مرزِ دو جمله‌ی جداست، مصنوعی به‌نظر نمی‌رسه.
  // 🎙️ طولِ این مکث دیگه برای همه‌ی جمله‌ها ثابت نیست: جمله‌های سؤالی/
  // تعجبی/سه‌نقطه‌دار طبیعتاً یه ذره مکثِ محسوس‌ترِ بعدشون لازم دارن (دقیقاً
  // همون چیزی که آدمِ واقعی موقعِ خوندنِ بلند هم انجام می‌ده) تا حسِ
  // یک‌نواختِ خبریِ صرف نده.
  function sentenceGapMs(r, chunkText) {
    const last = String(chunkText || "").trim().slice(-1);
    const base = "!！".includes(last) ? 420 : "?؟？".includes(last) ? 400 : "…".includes(last) ? 480 : 360;
    return Math.round(base / Math.min(Math.max(r, 0.2), 2));
  }
  // مکثِ خیلی‌کوتاهِ بینِ تکه‌های حاصل از شکستنِ اضطراریِ یه جمله‌ی خیلی‌بلندِ
  // بدونِ نقطه (boundary: "none") — قبلاً اینجا اصلاً مکثی نبود (۰ میلی‌ثانیه)
  // که رویِ بعضی موتورها/WebViewها با شروعِ بی‌درنگِ utteranceِ بعدی، صدا
  // یه‌جور «تیک»/قطعِ ریزِ مصنوعی می‌داد؛ یه مکثِ خیلی‌کوچیک (نامحسوس، نه
  // به‌اندازه‌ی مکثِ بینِ‌جمله) این گذارِ بینِ تکه‌ها رو نرم‌تر می‌کنه بدونِ
  // اینکه اصلاً به‌عنوانِ «مکثِ بینِ‌جمله» حس بشه.
  const CHUNK_CONTINUATION_GAP_MS = 30;

  // 🐛 قبلاً اینجا یه پیچِ ثابتِ «گرم‌تر» (FRIENDLY_PITCH=1.05) به‌علاوه‌ی
  // یه شیفتِ اضافه‌ی پیچ/ریت بر اساسِ نوعِ جمله (سؤالی زیرتر، تعجبی زیرتر و
  // تندتر) روی هر utterance اعمال می‌شد. این همون چیزی بود که صدا رو
  // رباتیک‌تر از حالتِ پیش‌فرضِ خودِ گوشی کرد — چون هر جمله با یه پیچِ کمی
  // متفاوت از حالتِ طبیعیِ خودِ صدا خونده می‌شد. حالا حذف شده و پیچ/ریت
  // دست‌نخورده (همون پیش‌فرضِ موتور) می‌مونن؛ مکثِ بینِ‌جمله‌ای
  // (sentenceGapMs پایین‌تر) کاملاً مستقل از این بود و دست‌نخورده باقی مونده.

  // 🔥 انتخاب صدای بهتر — با نرخِ ترجیح: صدایِ ذخیره‌شده‌ی کاربر > صدایی که
  // کیفیتِ موتورش (از رویِ نامش) بالاترین سطح رو داره (Neural/Wavenet/
  // Chirp/Studio/Natural/Premium/Enhanced/Polyglot — این‌ها اسم‌هایی هستن
  // که مرورگرها/گوشی‌ها معمولاً روی صداهای عصبیِ باکیفیت می‌ذارن، در برابرِ
  // موتورهایِ پایه‌ای/robotic مثلِ eSpeak) > هر صدایِ Google دیگه > هر
  // صدایِ منطبق با زبون. هر ۴ حالت از فهرستِ کش‌شده (getCachedVoices)
  // می‌خونن، نه مستقیم از getVoices().
  function getBestVoice(langCode) {
    const voices = getCachedVoices();
    const langPrefix = normalizeLangCode(langCode).split("-")[0];
    const matching = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
    if (!matching.length) return null;

    // اگه کاربر خودش از تنظیمات یه صدای مشخص برای این زبون انتخاب کرده
    // (از بینِ صداهایی که گوشی‌اش واقعاً نصب داره)، همیشه همون اولویت داره.
    try {
      const savedURI = loadVoicePrefs()[langPrefix];
      if (savedURI) {
        const savedVoice = matching.find((v) => v.voiceURI === savedURI);
        if (savedVoice) return savedVoice;
      }
    } catch (e) {}

    // به ترتیبِ کیفیتِ معمولِ این کلیدواژه‌ها در نامِ صداها. اول دنبالِ
    // نسخه‌ی جنسیت‌دارِ هر کلیدواژه می‌گردیم (که معمولاً طبیعی‌تر شنیده
    // می‌شه)، بعد بدونِ جنسیت.
    const QUALITY_KEYWORDS = ["neural", "wavenet", "chirp", "studio", "natural", "premium", "enhanced", "polyglot"];
    for (const kw of QUALITY_KEYWORDS) {
      const withGender = matching.find((v) => v.name.toLowerCase().includes(kw) && /female|male/i.test(v.name));
      if (withGender) return withGender;
    }
    for (const kw of QUALITY_KEYWORDS) {
      const found = matching.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return found;
    }
    const google = matching.find((v) => v.name.toLowerCase().includes("google"));
    if (google) return google;
    return matching[0];
  }

  function speakChunk(idx, forceRestart = false, isRepeatContinuation = false, resumeOffset = 0) {
    if (!chunks.length) {
      status = "idle";
      notify();
      return;
    }
    if (idx >= chunks.length) {
      // به آخرِ کلِ متن رسیدیم. تکرارِ سراسری دیگه اینجا اثری نداره — چون
      // اگه روشن بود، همین‌الان قبلاً به‌ازای هر جمله/خط، جدا جدا اعمال
      // شده (پایین‌تر، توی utter.onend). فقط سِشن‌های «loop»ی (پخشِ همیشگیِ
      // کل متن) اینجا از اول شروع می‌شن.
      if (!singleShot && loopWholeText) {
        speakChunk(0, true);
        return;
      }
      if (key) lastOffsetByKey.delete(key);
      status = "idle";
      chunkIndex = 0;
      notify();
      scheduleResumeIfPending();
      return;
    }

    clearGapTimer();
    if (forceRestart) cancelSpeech();
    chunkIndex = idx;
    if (!isRepeatContinuation) chunkRepeatsDone = 0;
    status = "playing";
    notify();

    // اگه resumeOffset داده شده (یعنی این ادامه‌ی مکثِ وسطِ همین جمله‌ست)،
    // فقط باقیِ متن رو می‌خونیم؛ وگرنه (جمله‌ی تازه/تکرارِ کامل) از اولِ
    // خودِ جمله. chunkTextOffset رو هم به‌روز می‌کنیم تا اگه دوباره وسطِ
    // همین باقیمانده مکث شد، تخمینِ بعدی رویِ همین مبنا جمع بشه.
    const fullChunkText = chunks[idx].text;
    chunkTextOffset = resumeOffset > 0 && resumeOffset < fullChunkText.length ? resumeOffset : 0;
    const textToSpeak = chunkTextOffset > 0 ? fullChunkText.slice(chunkTextOffset) : fullChunkText;

    const handleChunkEnd = () => {
      if (status !== "playing") return;
      // فقط سرِ پایانِ یه جمله‌ی واقعی مکثِ کاملِ بینِ‌جمله می‌ذاریم؛ تکه‌های
      // حاصل از شکستنِ اضطراریِ وسطِ متنِ خیلی‌بلند (boundary: "none") فقط
      // یه مکثِ خیلی‌کوچیک برای نرمیِ گذار می‌گیرن، نه مکثِ کاملِ بینِ‌جمله.
      const boundary = chunks[idx] && chunks[idx].boundary;
      const gap = boundary === "sentence" ? sentenceGapMs(rate, fullChunkText) : CHUNK_CONTINUATION_GAP_MS;

      // تکرارِ سراسری (اگه روشن باشه) اینجا اعمال می‌شه: قبل از رفتن سراغِ
      // جمله‌ی بعد، همینِ جمله‌ی همین‌الان‌تمام‌شده رو دوباره می‌خونه — به
      // تعدادِ تنظیمِ ۳/۶/بی‌نهایت. فقط وقتی این تعداد کامل شد (یا تکرار
      // خاموش بود)، نوبتِ جمله‌ی بعدی می‌رسه. توجه: این دیگه به loopWholeText
      // بستگی نداره — چون همه‌ی دکمه‌های 🔊 (کنار هر خط) الان با
      // options.loop=true صدا زده می‌شن (برای اینکه رسیدن به آخرِ متن به‌جای
      // توقف، از اول ادامه پیدا کنه)، و اگه اینجا رو به loopWholeText گیر
      // می‌دادیم، همون true‌بودنش باعث می‌شد تکرارِ هر خط/جمله کلاً غیرفعال
      // بشه — دقیقاً همون باگی که کاربر گزارش کرد (دکمه‌ی تکرار ۳/۶/∞ اثر
      // نداشت). loopWholeText فقط پایین‌تر، توی speakChunk، برای تصمیمِ
      // «رسیدن به آخرِ متن → از اول شروع کن یا نه» استفاده می‌شه؛ اینجا
      // فقط singleShot (پخشِ تک‌ضربه‌ی بدونِ تکرار و بدونِ لوپ) باید
      // خاموشش کنه.
      // تکرار فقط سرِ پایانِ یه «جمله»ی واقعی (boundary === "sentence")
      // اعمال می‌شه، نه سرِ تکه‌های مصنوعیِ ۴۰کلمه‌ای (boundary === "none")
      // که فقط یه دریچه‌ی اطمینان برای متنِ خیلی‌بلندِ بدونِ علامتِ‌نگارشی‌ان.
      // قبلاً هر تکه (even boundary:"none") جدا جدا تا تعدادِ تنظیمِ تکرار
      // خونده می‌شد، پس یه متنِ بدونِ نقطه، تکه‌به‌تکه گیر می‌کرد و کاربر
      // حس می‌کرد «تکرار ادامه‌دار شده تا جایی که نقطه هست» — دقیقاً همون
      // باگِ گزارش‌شده. الان این تکه‌ها فقط یک‌بار (بدونِ تکرار) خونده
      // می‌شن و بی‌درنگ به تکه‌ی بعدی می‌رن؛ فقط جمله‌ی واقعیِ پایانی تکرار می‌شه.
      if (!singleShot && boundary === "sentence") {
        // تنظیمِ تکرار یعنی «کلاً N بار خونده بشه»، نه «N بار اضافه بر
        // خوندنِ اولش». چون همینِ خط داره برای اولین‌بار تمومِ خوندنش رو
        // اعلام می‌کنه (یعنی همون ۱ بار اول قبلاً اتفاق افتاده)، فقط N-1
        // بارِ اضافه لازمه تا جمعاً به N برسه — قبلاً این -1 نبود و برای
        // مثلاً تنظیمِ ۳، در واقع ۴ بار خونده می‌شد.
        const repeatTarget =
          globalRepeatSetting === "inf"
            ? Infinity
            : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
        if (chunkRepeatsDone < repeatTarget) {
          chunkRepeatsDone += 1;
          gapTimer = setTimeout(() => {
            gapTimer = null;
            speakChunk(idx, false, true);
          }, gap);
          return;
        }
      }

      // اگه تکرارِ A-B روشنه و همین‌الان جمله‌ی B تمام شد، به‌جایِ رفتن سراغِ
      // جمله‌ی بعد، برمی‌گردیم سرِ جمله‌ی A — همون مکانیزمِ لوپی که قبلاً
      // برایِ صوتِ آپلودی (useStoryUserAudio) ساختیم، اینجا بر حسبِ
      // شماره‌ی جمله به‌جایِ ثانیه.
      const nextIdx =
        abState === "looping" && abChunkB !== null && idx === abChunkB ? abChunkA : chunkIndex + 1;
      gapTimer = setTimeout(() => {
        gapTimer = null;
        speakChunk(nextIdx, false, false);
      }, gap);
    };

    const startWebSpeech = () => {
      const utter = new SpeechSynthesisUtterance(sanitizeForTTS(textToSpeak));
      utter.lang = locale;
      // اینتونیشنِ این جمله (سؤالی/تعجبی/خبری) رو از رویِ کلِ متنِ جمله تشخیص
      // می‌دیم (نه فقط باقیِ بخشی که بعدِ یه ادامه‌ی مکث ممکنه خونده بشه) —
      // چون علامتِ‌نگارشیِ پایان همیشه سرِ خودِ fullChunkText هست.
      utter.rate = engineRate(rate);
      // پیچ رو دیگه دست نمی‌زنیم — همون پیش‌فرضِ خودِ صدا (۱٫۰) می‌مونه، دقیقاً
      // شبیهِ همون چیزی که موقعِ خواندنِ خودِ گوشی می‌شنیدی.
      utter.volume = muted ? 0 : 1;
      utter.onstart = () => {
        chunkStartedAt = Date.now();
      };
      // بعضی مرورگرها/WebViewها گاهی onstart رو دیر یا اصلاً شلیک نمی‌کنن —
      // یه نقطه‌ی شروعِ پیش‌فرض هم همین‌جا می‌ذاریم تا اگه onstart نیومد،
      // تخمینِ نقطه‌ی مکثِ بعدی حداقل از لحظه‌ی صداکردنِ speak() حساب بشه
      // (کمی محافظه‌کارانه‌تر، ولی به‌مراتب بهتر از نداشتنِ هیچ تخمینی).
      chunkStartedAt = Date.now();

      const bestVoice = getBestVoice(locale);
      if (bestVoice) utter.voice = bestVoice;

      utter.onend = handleChunkEnd;
      utter.onerror = (e) => {
        if (expectingCancel) {
          expectingCancel = false;
          return;
        }
        status = "idle";
        notify();
      };

      window.speechSynthesis.speak(utter);
    };

    // ✅ اگه روی اپ اندرویدیم، از موتور Piper (BubblePlugin.speak) استفاده کن.
    // توی مرورگر معمولی isNativeTtsAvailable() false می‌ده و همون Web Speech می‌ره.
    if (isNativeTtsAvailable()) {
      const cleanText = sanitizeForTTS(textToSpeak);
      const nativeGen = nativeSpeakGen;
      chunkStartedAt = Date.now();

      if (!cleanText || !cleanText.trim()) {
        // متن بعد از پاک‌سازی خالی شد — مستقیم برو سراغِ منطقِ پایانِ چانک
        gapTimer = setTimeout(() => {
          gapTimer = null;
          if (nativeGen !== nativeSpeakGen) return;
          handleChunkEnd();
        }, 0);
        return;
      }

      // کدِ دو حرفیِ زبان (fa, en, ...) — نه locale — چون SherpaModelManager با همین کار می‌کنه
      const nativeLang = currentCode || locale.split("-")[0];
      const usePhoneVoice = getVoiceEngine() === "phone";
      // حالتِ بی‌صدا: چیزی پخش نمی‌کنیم، فقط به‌اندازه‌ی مدتِ تقریبیِ خوندن صبر می‌کنیم
      // ⚡ روی صداهای دانلودی (Piper) ساختنِ صدا CPUِ سنگینی می‌گیره. هایلایت و
      // اسکرولِ همین جمله (notify بالا) باید اول رندر بشن؛ برای همین شروعِ
      // واقعیِ خوانش رو یک لحظه‌ی خیلی کوتاه (~۶۰ms) عقب می‌اندازیم تا فریمِ
      // هایلایت/اسکرول قبل از شروعِ کارِ سنگین کشیده بشه. اگه تو این فاصله
      // لغو/مکث شد، چیزی پخش نمی‌شه.
      let nativeT0 = Date.now();
      const played = muted
        ? new Promise((resolve) => {
            setTimeout(() => resolve(true), Math.max(400, (cleanText.length * 70) / Math.max(rate, 0.25)));
          })
        : new Promise((resolve) => {
            setTimeout(() => {
              if (nativeGen !== nativeSpeakGen || status !== "playing") {
                resolve(true);
                return;
              }
              nativeT0 = Date.now();
              (usePhoneVoice
                ? nativeSpeakSystem(cleanText, nativeLang, rate)
                : nativeSpeak(cleanText, nativeLang, rate)
              ).then(resolve);
              // صدای جمله‌ی بعدی رو همین الان (موقعِ پخشِ این جمله) پیش‌پیش بساز تا بینِ جمله‌ها تأخیر نباشه
              // (حتماً «بعد» از خودِ speak فرستاده می‌شه تا prefetch جلوی جمله‌ی جاری نیفته)
              const nx = chunks[idx + 1];
              if (nx && nx.text) {
                const nxClean = sanitizeForTTS(nx.text);
                if (nxClean && nxClean.trim() && !usePhoneVoice) nativePrefetch(nxClean, nativeLang, rate);
              }
            }, 60);
          });

      played.then((ok) => {
        if (nativeGen !== nativeSpeakGen) return; // لغو/جایگزین شده
        if (status !== "playing") return;
        if (ok && !muted && cleanText.length >= 12) {
          // سرعتِ واقعیِ این موتور رو (نرمال‌شده به ۱×) با میانگینِ متحرک یاد می‌گیریم
          const sample = ((Date.now() - nativeT0) * Math.max(rate, 0.25)) / cleanText.length;
          if (sample > 25 && sample < 300) nativeMsPerChar = nativeMsPerChar * 0.6 + sample * 0.4;
        }
        if (!ok) {
          // بسته‌ی Piper دانلود نشده یا پخش شکست خورد → اول TTS خودِ گوشی (نیتیو)،
          // و اگه اون هم نشد، Web Speech
          (usePhoneVoice ? Promise.resolve(false) : nativeSpeakSystem(cleanText, nativeLang, rate)).then((sysOk) => {
            if (nativeGen !== nativeSpeakGen) return;
            if (status !== "playing") return;
            if (sysOk) {
              handleChunkEnd();
              return;
            }
            if ("speechSynthesis" in window) {
              startWebSpeech();
            } else {
              status = "idle";
              notify();
            }
          });
          return;
        }
        handleChunkEnd();
      });
      return; // از مسیرِ Web Speech API بیرون بیا
    }

    startWebSpeech();
  }

  // این آبجکت به یه نامِ ثابت (controller) نگه داشته می‌شه، نه فقط return
  // مستقیم — چون scheduleResumeIfPending (بالاتر) برای برگشتِ خودکار به
  // متنِ اصلی، بعد از تمام‌شدنِ پخشِ یه کلمه‌ی تکی، خودش دوباره controller.toggle
  // رو صدا می‌زنه.
  const controller = {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState() {
      // repeatsDone: چندبار همینِ جمله‌ی فعلی (chunkIndex) تا الان، *علاوه‌بر*
      // خوندنِ اولش، تکرار شده — برای اتصالِ خودکارِ «هر تکرار = یه رشته‌ی
      // عصبی» (NeuralPath) به SpeakButton استفاده می‌شه: هر بار این عدد
      // بالا می‌ره یعنی یه تکرارِ واقعی (نه صرفِ خوندنِ اول) کامل شده.
      return { key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, muted, abState, abChunkA, abChunkB, repeatsDone: chunkRepeatsDone };
    },
    // دکمه‌ی گردِ A-B رویِ پلیر همینِ یه تابع رو صدا می‌زنه؛ خودش وضعیتِ
    // فعلی رو می‌چرخونه: idle -> waitingB -> looping -> idle.
    markAB() {
      if (!chunks.length) return abState;
      if (abState === "idle") {
        abChunkA = chunkIndex;
        abState = "waitingB";
      } else if (abState === "waitingB") {
        if (chunkIndex < abChunkA) {
          abChunkB = abChunkA;
          abChunkA = chunkIndex;
        } else {
          abChunkB = chunkIndex;
        }
        abState = "looping";
      } else {
        abChunkA = null;
        abChunkB = null;
        abState = "idle";
      }
      notify();
      return abState;
    },
    clearAB() {
      abChunkA = null;
      abChunkB = null;
      abState = "idle";
      notify();
    },
    // آفستِ کاراکتریِ شروعِ جمله‌ای که همین الان (یا آخرین‌بار) در حال
    // پخشه — فقط برای «ادامه‌ی پخش از همون‌جا» وقتی متنِ در حال پخش عوض
    // می‌شه (مثلاً تغییرِ حالتِ نمایش ترجمه) لازمه. دیگه هیچ‌جا برای
    // هایلایتِ بصری استفاده نمی‌شه.
    getCharOffset() {
      if (!chunks.length) return 0;
      const idx = Math.min(Math.max(chunkIndex, 0), chunks.length - 1);
      return chunks[idx].start;
    },
    getGlobalRepeatSetting() {
      return globalRepeatSetting;
    },
    cycleGlobalRepeat() {
      const order = [0, 2, 3, "inf"];
      const idx = order.indexOf(globalRepeatSetting);
      globalRepeatSetting = order[(idx + 1) % order.length];
      try {
        localStorage.setItem("phrasebook-tts-repeat", String(globalRepeatSetting));
      } catch (e) {}
      if (status === "playing" || status === "paused") {
        remaining = globalRepeatSetting === "inf" ? Infinity : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
      }
      notify();
    },
    // startCharOffset (اختیاری): آفستِ کاراکتری‌ای که پخش باید تقریباً از
    // جمله‌ی متناظرش شروع بشه — برای «ادامه از همون‌جا» بعد از تغییرِ متن.
    // نکته: toggle خودش پایین‌تر هم دوباره صدا زده می‌شه — از داخلِ
    // scheduleResumeIfPending، برای برگشتِ خودکار به متنِ اصلی بعد از پخشِ
    // یه کلمه‌ی تکی. برای همینه که این آبجکت به یه نامِ ثابت (controller)
    // نگه داشته می‌شه، نه فقط return مستقیم.
    toggle(text, code, startCharOffset, options) {
      try {
        if (!text) return "unsupported";
        const forceSingle = !!(options && options.singlePass);
        const forceLoop = !!(options && options.loop);
        const hasSynthesis = "speechSynthesis" in window;

        // نرمالایزِ کدِ زبون قبل از هر استفاده‌ای — اگه از قبل تمیز بوده
        // (که همیشه همینه، چون LANGUAGES داخلِ اپ همیشه کدِ دو-حرفیِ ساده
        // می‌ده)، این هیچ چیزی رو عوض نمی‌کنه؛ فقط ورودی‌های غیرمنتظره
        // (لوکیلِ کامل/اسمِ زبون) رو هم قابلِ‌استفاده می‌کنه.
        code = normalizeLangCode(code);
        let newLocale = TTS_LOCALE[code] || "en-US";
        // فارسی و عربی: طبقِ تصمیمِ صریحِ کاربر، این دو زبون همیشه از سرویسِ
        // آنلاینِ رایگان (Edge/Azure ...) خونده می‌شن، نه از TTS خودِ گوشی —
        // چون کیفیت/وجودِ صدای محلی برای این دو زبون رو نمی‌شه مطمئن بود.
        // همه‌ی زبون‌های دیگه برعکس: فقط و فقط از TTS خودِ گوشی (بدونِ
        // نیاز به اینترنت) — حتی اگه گوشی صدایی براشون نصب نداشته باشه،
        // دیگه به‌صورتِ خودکار سراغِ سرویسِ آنلاین نمی‌ریم.
        const ONLINE_ONLY_LANGS = new Set(["fa", "ar"]);
        // اگه بسته‌ی Piper همین زبون روی گوشی دانلود شده باشه، فارسی/عربی هم
        // مثلِ بقیه‌ی زبون‌ها از موتورِ نیتیو (آفلاین) خونده می‌شن؛ فقط وقتی
        // بسته نیست (یا اپ توی مرورگره) می‌رن سراغِ سرویسِ آنلاین.
        // وضعیت از کشِ سنکرونِ nativeTts می‌آد؛ این صدا زدن کش رو برای دفعه‌ی بعد تازه می‌کنه.
        if (isNativeTtsAvailable()) refreshNativeTtsStatus(code);
        const phoneVoicePref = isNativeTtsAvailable() && getVoiceEngine() === "phone";
        const useNativePiper = !phoneVoicePref && isNativeTtsAvailable() && isNativeTtsReady(code);
        // TTS خودِ گوشی از طریقِ پلاگین اندروید (speechSynthesis داخل WebView صدا نداره)
        if (isNativeTtsAvailable()) refreshSystemTts(code);
        // اگه کاربر «صدای گوشی» رو انتخاب کرده و گوشی این زبون رو (حتماً) داره، فارسی/عربی هم آنلاین نمی‌شن
        const forceOnlineForLang = ONLINE_ONLY_LANGS.has(code) && !useNativePiper && !(phoneVoicePref && isSystemTtsConfirmed(code));
        const useNativeSystem = isNativeTtsAvailable() && isSystemTtsReady(code);

        const newKey = `${newLocale}::${text}`;

        // اگر همان متن در حال پخش است و دکمه زده شده، توقف/ادامه
        if (key === newKey && status === "playing") {
          if (mode === "online") {
            if (onlineAudio) {
              try {
                onlineAudio.pause();
              } catch (e) {}
            }
            status = "paused";
            notify();
            return "ok";
          }
          clearGapTimer();
          // قبل از cancelSpeech (که utter رو قطع می‌کنه)، تخمین می‌زنیم تا
          // کجایِ این جمله رسیده بودیم — تا دفعه‌ی بعد که ادامه زده بشه،
          // فقط باقیِ همین جمله خونده بشه، نه از اولش.
          {
            const chunkText = chunks[chunkIndex] ? chunks[chunkIndex].text : "";
            const spokenSoFarInThisUtterance = chunkText.length > chunkTextOffset ? chunkText.slice(chunkTextOffset) : "";
            if (spokenSoFarInThisUtterance && chunkStartedAt) {
              const elapsed = Date.now() - chunkStartedAt;
              const native = isNativeTtsAvailable() && !muted && mode !== "online" && isNativeTtsReady(currentCode || "");
              const msPerChar = (native ? nativeMsPerChar : RESUME_MS_PER_CHAR) / Math.max(rate, 0.25);
              // برای نیتیو کمی محافظه‌کارانه (۹۰٪) عقب‌تر می‌ریم تا کلمه‌ای نشنیده رد نشه
              let within = Math.min(
                spokenSoFarInThisUtterance.length,
                Math.max(0, Math.round((elapsed / msPerChar) * (native ? 0.9 : 1)))
              );
              // به نزدیک‌ترین مرزِ کلمه (فاصله‌ی قبلی) عقب می‌ریم — تا وسطِ
              // یه کلمه قطع نشه.
              while (within > 0 && within < spokenSoFarInThisUtterance.length && spokenSoFarInThisUtterance[within] !== " ") within--;
              chunkTextOffset = chunkTextOffset + within;
            }
          }
          cancelSpeech();
          status = "paused";
          notify();
          return "ok";
        }

        if (key === newKey && status === "paused") {
          status = "playing";
          if (mode === "online") {
            notify();
            if (onlineAudio) {
              onlineAudio.play().catch(() => playOnlineChunk(onlineChunkIndex));
            } else {
              playOnlineChunk(onlineChunkIndex);
            }
          } else {
            // ادامه بعد از مکث — همون جمله‌ست، نه جمله‌ی جدید، پس شمارشِ
            // تکرارهاش (chunkRepeatsDone) نباید صفر بشه. resumeOffset (اگه
            // بالاتر، موقعِ مکث، تخمین زده شده بود) باعث می‌شه فقط باقیِ
            // جمله خونده بشه، نه از اولش.
            speakChunk(chunkIndex, false, true, chunkTextOffset);
          }
          return "ok";
        }

        // اگه همین‌الان یه سشنِ «خواندنِ پیوسته»(loopWholeText) واقعاً در حالِ
        // پخش بود و این متنِ تازه یه چیزِ دیگه‌ست (نه ادامه‌ی خودِ همون سشن —
        // چون اون حالت با return "ok"ِ بالا قبلاً رد شده)، قبل از رد شدن روش،
        // خودِ همون سشنِ قطع‌شده رو نگه می‌داریم: متنش، کدِ زبانش، و نقطه‌ای
        // که توش قطع شده — دقیقاً همون سناریوییه که کاربر روی یه کلمه‌ی وسطِ
        // متن کلیک می‌کنه (مثلاً از پاپ‌آپِ معنیِ لغت) تا تلفظش رو تنها
        // بشنوه. وقتی این پخشِ تکیِ لغت (با هر چند بار تکراری که کاربر
        // روش گذاشته) کاملاً تموم شد، سه ثانیه بعد خودکار از همینجا خواندنِ
        // متنِ اصلی ادامه پیدا می‌کنه. اگه سشنِ جدید هم خودش یه سشنِ پیوسته‌ی
        // دیگه‌ست (forceLoop — یعنی کاربر عمداً یه جمله‌ی دیگه از متنِ اصلی
        // رو زده)، این «برگشتِ خودکار» بی‌معنیه؛ پس فقط وقتی سشنِ جدید
        // تک‌ضربه‌ایه (بدونِ loop) این حافظه نگه داشته می‌شه.
        clearPendingResume();
        if ((status === "playing" || status === "paused") && loopWholeText && !forceLoop && key) {
          pendingResume = {
            text: fullText,
            code: currentCode,
            offset: chunks[chunkIndex] ? chunks[chunkIndex].start : 0,
          };
        }

        // متنِ کاملاً جدیدیه (نه ادامه/مکثِ همون قبلی) — بازه‌ی A-B که
        // مالِ متنِ قبلی بود دیگه معنی نداره، پاکش می‌کنیم.
        abChunkA = null;
        abChunkB = null;
        abState = "idle";
        // متن جدید — شمارنده‌ی تکرار از روی تنظیم سراسری تازه می‌شه
        const voices = hasSynthesis ? getCachedVoices() : [];
        const baseLang = newLocale.split("-")[0].toLowerCase();
        const hasVoice = voices.some((v) => v.lang && v.lang.toLowerCase().startsWith(baseLang));

        key = newKey;
        locale = newLocale;
        currentCode = code;
        ttsError = null;

        // اگه صدازننده صریحاً آفستی نداده، ببین همین متن قبلاً (با توقفِ
        // کامل یا با پخشِ یه متنِ دیگه روش) نیمه‌کاره مونده بود یا نه —
        // اگه آره، به‌جای از اول، از همون نقطه ادامه می‌دیم.
        let effectiveStartOffset = startCharOffset;
        if (!(Number.isInteger(effectiveStartOffset) && effectiveStartOffset > 0)) {
          const saved = lastOffsetByKey.get(newKey);
          if (Number.isInteger(saved) && saved > 0) effectiveStartOffset = saved;
        }

        // نکته: قبلاً اینجا «voices.length === 0» هم مسیرِ محلی رو مجاز
        // می‌کرد — یعنی اگه فهرستِ صداهای گوشی هنوز اصلاً لود نشده بود
        // (یه رفتارِ شناخته‌شده و رایج در Chrome/Android که getVoices()
        // بارِ اول می‌تونه خالی برگرده تا رویدادِ voiceschanged شلیک بشه)،
        // کد فرض می‌کرد «حتماً یه صدایی هست» و مسیرِ محلی رو امتحان
        // می‌کرد — با هیچ صدایی برای رندر، که یعنی سکوتِ کامل و بدونِ
        // هیچ خطایی (چون utter.onerror همیشه هم شلیک نمی‌شه). حالا فقط
        // وقتی واقعاً یه صدای منطبق پیدا شده باشه می‌ریم سراغِ محلی؛
        // در غیرِ این‌صورت (چه صدایی نبود، چه فهرست هنوز خالی بود) مسیرِ
        // آنلاینِ جایگزین — که حالا خودش هم دیگه بی‌صدا شکست نمی‌خوره
        // (بالاتر، ttsError) — انتخاب می‌شه.
        // نکته‌ی مهمِ رفعِ باگ: «voices.length === 0» به این معنی نیست که
        // گوشی صدایی نداره — یعنی فهرستِ صداها هنوز لود نشده (رفتارِ شناخته‌
        // شده‌ی getVoices() قبل از شلیکِ voiceschanged، مخصوصاً روی
        // Chrome/Android). قبلاً اینجا این حالت هم مجاز بود؛ بعد به‌خاطرِ یه
        // باگِ دیگه سخت‌گیرتر شد (فقط hasVoice===true)، ولی همون سخت‌گیری
        // خودش باعث شد وقتی فهرست هنوز خالیه (که خیلی وقتا همینه، چون
        // getVoices() سنکرونه و شاید تا اون لحظه لود نشده باشه)، حتی
        // انگلیسی هم اصلاً پخش نشه. الان: وقتی صدای منطبق پیدا شده *یا*
        // فهرست هنوز کلاً خالیه (یعنی وضعیتش نامعلومه، نه قطعاً «نداره»)،
        // مسیرِ محلی رو امتحان می‌کنیم؛ فقط وقتی فهرست واقعاً لود شده و
        // مطمئنیم صدایی برای این زبون نیست، خطای no-local-voice می‌دیم.
        // اگه فهرستِ صداها از اولِ کارِ speechController (چند ثانیه پیش)
        // هیچ‌وقت حتی یه صدا هم نداشته (نه الان، نه هیچ‌وقتِ قبل‌تر)، دیگه
        // نمی‌شه گفت «هنوز لود نشده» — یعنی گوشی/مرورگر اصلاً هیچ موتورِ
        // TTSای نداره (نه فقط برای این زبون خاص). این حالت رو از حالتِ
        // «این زبون رو نداره ولی موتور TTS هست» جدا می‌کنیم چون راهِ حلِ
        // کاربر برای هرکدوم فرق می‌کنه (نصبِ کلِ موتور در برابرِ دانلودِ
        // صدای یه زبونِ خاص).
        const noTtsEngineAtAll =
          hasSynthesis && voices.length === 0 && !voicesEverLoaded && Date.now() - controllerInitTime > 4000;

        if (useNativePiper || (useNativeSystem && !forceOnlineForLang) || (!forceOnlineForLang && hasSynthesis && !noTtsEngineAtAll && (hasVoice || voices.length === 0))) {
          mode = "local";
          stopOnlineAudio();
          fullText = text;
          chunks = splitSentences(text, options && options.sentenceBoundaries);
          status = "playing";
          singleShot = forceSingle;
          loopWholeText = !!forceLoop;
          remaining = forceSingle ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
          const startIdx = Number.isInteger(effectiveStartOffset) && effectiveStartOffset > 0
            ? chunkIndexForOffset(Math.min(effectiveStartOffset, Math.max(text.length - 1, 0)))
            : 0;
          speakChunk(startIdx, true);
          return "ok";
        }

        // اگه زبون جزوِ فارسی/عربی نبود و گوشی هم صدایی براش نداشت، دیگه
        // خودکار سراغِ اینترنت نمی‌ریم (طبقِ خواستِ کاربر: «فقط TTS گوشی،
        // بدونِ نیاز به اینترنت» برای همه‌ی زبون‌ها غیر از فارسی/عربی) —
        // به‌جاش یه خطای روشن نشون می‌دیم که کاربر صدای اون زبون رو از
        // تنظیماتِ گوشی نصب کنه.
        if (!forceOnlineForLang) {
          status = "idle";
          notify();
          return noTtsEngineAtAll ? "no-tts-engine" : "no-local-voice";
        }

        // فارسی/عربی بدونِ بسته‌ی آفلاین و بدونِ اینترنت: به‌جای معطل‌شدن روی درخواستِ آنلاین،
        // همون لحظه پیامِ «بسته رو از تنظیمات دانلود کن» نشون داده می‌شه.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          status = "idle";
          notify();
          return "offline-need-model";
        }

        // مسیر آنلاینِ رایگان — فقط برای فارسی/عربی
        cancelSpeech();
        const onlineLang = code === "zh" ? "zh-CN" : code;
        speakOnline(text, onlineLang, effectiveStartOffset, forceSingle, forceLoop, options && options.sentenceBoundaries);
        return "online-fallback";
      } catch (e) {
        status = "idle";
        notify();
        return "error";
      }
    },
    stop() {
      clearPendingResume();
      cancelSpeech();
      stopOnlineAudio();
      mode = "local";
      key = null;
      chunks = [];
      status = "idle";
      chunkIndex = 0;
      remaining = 0;
      singleShot = false;
      loopWholeText = false;
      chunkRepeatsDone = 0;
      abState = "idle";
      abChunkA = null;
      abChunkB = null;
      notify();
    },
    // فقط وقتی متنِ اصلی (loopWholeText) در حال پخشه صدا می‌زنیم — مثلاً
    // همون لحظه که کاربر روی یه لغت/محدوده لمسِ طولانی می‌کنه و پاپ‌آپ باز
    // می‌شه، حتی اگه هنوز روی 🔊ِ خودِ پاپ‌آپ نزده باشه. پخشِ اصلی رو فوراً
    // مکث می‌کنیم و نقطه‌ی دقیقِ توقف رو (مثلِ همون منطقِ توقفِ toggle) به
    // pendingResume می‌سپاریم، بعد سه ثانیه بعد خودکار از همونجا ادامه پیدا
    // می‌کنه — مگر اینکه تا اون موقع کاربر خودش 🔊ِ پاپ‌آپ رو بزنه، که اونجا
    // toggle خودش (پایین‌تر) این pendingResume رو با نسخه‌ی تازه‌تر
    // (بعد از تمومِ خواندنِ همون لغت) جایگزین می‌کنه.
    pauseForFocus() {
      if (status !== "playing" || !loopWholeText) return false;
      clearPendingResume();
      pendingResume = {
        text: fullText,
        code: currentCode,
        offset: chunks[chunkIndex] ? chunks[chunkIndex].start : 0,
      };
      if (mode === "online") {
        if (onlineAudio) {
          try {
            onlineAudio.pause();
          } catch (e) {}
        }
      } else {
        clearGapTimer();
        cancelSpeech();
      }
      status = "paused";
      notify();
      scheduleResumeIfPending();
      return true;
    },
    getRate() {
      return rate;
    },
    setRate(r) {
      rate = Math.min(Math.max(Number(r) || 1, 0.25), 2);
      try {
        localStorage.setItem("phrasebook-tts-rate", String(rate));
      } catch (e) {}
      if (status === "playing" && mode === "online") {
        if (onlineAudio) onlineAudio.playbackRate = rate;
        notify();
      } else {
        // جمله‌ی درحالِ‌پخش رو قطع نمی‌کنیم (مرورگر هم اصلاً اجازه‌ی عوض‌کردنِ
        // سرعتِ یه utterance رو وسطِ پخش نمی‌ده). سرعتِ جدید خودکار از جمله‌ی
        // بعدی اعمال می‌شه؛ فعلاً فقط اعلامش می‌کنیم که UI آپدیت بشه.
        notify();
      }
    },
    // بی‌صداکردنِ صرفاً خروجیِ صوتی — پخش/هایلایت/پیش‌رفتنِ جمله‌به‌جمله
    // دقیقاً عادی ادامه پیدا می‌کنه. رویِ صدایِ آنلاینِ درحالِ‌پخش (اگه
    // بود) فوراً اعمال می‌شه؛ برایِ TTSِ محلی، چون مرورگر اجازه‌ی
    // تغییرِ volumeِ یه utteranceِ درحالِ‌پخش رو نمی‌ده، از جمله‌ی بعدی
    // اعمال می‌شه (مثلِ سرعت).
    getMuted() {
      return muted;
    },
    setMuted(v) {
      muted = !!v;
      try {
        localStorage.setItem("phrasebook-tts-muted", muted ? "1" : "0");
      } catch (e) {}
      if (onlineAudio) onlineAudio.volume = muted ? 0 : 1;
      notify();
    },
    toggleMuted() {
      controller.setMuted(!muted);
    },
    // --- برای نوارِ پیشرفتِ پلیرِ جدید (کِشیدنی/تپ‌کردنی) --------------------
    // مرزهای هر جمله (start/end کاراکتری) داخلِ متنِ کاملِ در حالِ پخش —
    // فقط برای تخمینِ بصریِ درصدِ پیشرفت لازمه، نه پخشِ واقعی.
    getChunksMeta() {
      return chunks.map((c) => ({ start: c.start, end: c.end }));
    },
    // متنِ خودِ جمله‌یِ idx‌ام — برایِ نشون‌دادنِ A/B رویِ دکمه‌ی تکرارِ بازه
    // به‌جایِ یه شماره‌ی انتزاعی (که کاربر باید حدس بزنه کدوم جمله‌ست)؛
    // حالا خودِ متنِ جمله (کوتاه‌شده) نشون داده می‌شه.
    getChunkText(idx) {
      return (chunks[idx] && chunks[idx].text) || "";
    },
    getFullTextLength() {
      return fullText.length;
    },
    // پرش مستقیم به جمله‌یِ idx‌ام و ادامه‌ی پخش از همون‌جا — هم برای دکمه‌های
    // «جمله‌ی قبل/بعد» و هم برای کشیدنِ نوارِ پیشرفت استفاده می‌شه. اگه هیچ
    // متنی لود نشده باشه (idle)، کاری نمی‌کنه.
    seekToChunk(idx) {
      if (!key || !chunks.length) return "idle";
      const clamped = Math.min(Math.max(Number(idx) || 0, 0), chunks.length - 1);
      if (mode === "online") {
        stopOnlineAudio();
        // 🐛 نسخه‌ی قبلی اینجا با یه نسبتِ کاراکتری/floor حدس می‌زد این جمله
        // تویِ کدوم گروهِ آنلاینه (onlineChunks بر اساسِ طولِ کاراکتره، نه
        // مرزِ جمله؛ splitForOnlineTts پایین‌تر ببین). این حدس دقیق نبود:
        // وقتی چند جمله‌ی کوتاه توی یه گروهِ آنلاینِ واحد جا می‌شدن، گاهی
        // seekToChunk(currentIdx+1) دقیقاً همون گروهِ فعلی رو حساب می‌کرد
        // (پس هیچ پرشی حس نمی‌شد) و گاهی یه گروه جلوتر می‌رفت — یعنی یه
        // جمله‌ی کامل رد می‌شد. دقیقاً همون «دکمه‌ی جمله‌ی بعد/قبل یکی
        // درمیون جمله‌ها رو رد می‌کنه». الان به‌جایِ حدس، از نگاشتِ دقیقِ
        // sentenceToOnlineChunk (که موقعِ splitForOnlineTts ساخته شده)
        // استفاده می‌کنیم — هر جمله همیشه دقیقاً می‌دونه تویِ کدوم گروهِ
        // آنلاینه، بدونِ هیچ گردکردنی.
        const onlineIdx = sentenceToOnlineChunk[clamped] != null ? sentenceToOnlineChunk[clamped] : 0;
        status = "playing";
        playOnlineChunk(onlineIdx);
      } else {
        speakChunk(clamped, true);
      }
      return "ok";
    },
  };
  return controller;
})();
// ---------------------------------------------------------------------------
// حافظه‌ی «نقطه‌ی ادامه» برای متنِ اصلی (مثلاً داستان) — وقتی کاربر روی یه
// کلمه یا یه محدوده‌ی انتخابی از متنِ اصلی دکمه‌ی پخش رو می‌زنه (برای شنیدنِ
// تلفظش)، همون موقعیت (آفستِ کاراکتری داخلِ متنِ کامل) به‌خاطر سپرده می‌شه.
// دفعه‌ی بعد که دکمه‌ی «پخشِ کل متن» زده بشه (از نگاهِ speechController،
// چون کلیدش با کلمه/محدوده فرق داره، «متنِ تازه»ست)، پخش به‌جای شروع از اول،
// از همون نقطه (تقریباً همون جمله) ادامه پیدا می‌کنه. کلید همون کلیدِ
// speechController یعنی `${locale}::${fullText}` است.
// ---------------------------------------------------------------------------
const mainTextResumePoints = new Map();
export function rememberMainTextResumeOffset(mainTextKey, offset) {
  if (!mainTextKey || !Number.isFinite(offset)) return;
  mainTextResumePoints.set(mainTextKey, offset);
}
export function consumeMainTextResumeOffset(mainTextKey) {
  return mainTextKey ? mainTextResumePoints.get(mainTextKey) : undefined;
}
// ---------------------------------------------------------------------------
// اسکرول خودکار — استفاده‌شده توسط PhraseList / WordList / VocabList. خودش
// هیچ صدایی رو پخش نمی‌کنه و شروعش نمی‌کنه؛ فقط وقتی روشنه، دنبالِ هر چیزی
// که همین الان از طریقِ 🔊ِ خودِ آیتم (یا هر جای دیگه‌ای) در حالِ پخشه
// می‌گرده، و کارتِ مربوطه رو خودکار وسطِ صفحه نگه می‌داره — تا کاربر خطش رو
// گم نکنه. پخش/توقف و تکرار کاملاً دستِ خودِ دکمه‌های 🔊 می‌مونه.
// ---------------------------------------------------------------------------
export function useAutoplayOnScroll(enabled, items) {
  const nodeMapRef = useRef(new Map()); // id -> DOM node
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) return;
    const update = (state) => {
      if (!state.key || state.status === "idle") return;
      const list = itemsRef.current;
      const match = list.find(
        (it) => it.text && `${TTS_LOCALE[it.code] || "en-US"}::${it.text}` === state.key
      );
      if (!match) return;
      const node = nodeMapRef.current.get(String(match.id));
      if (node && node.scrollIntoView) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [enabled]);

  const registerRef = (id) => (node) => {
    const key = String(id);
    if (node) nodeMapRef.current.set(key, node);
    else nodeMapRef.current.delete(key);
  };

  return { registerRef };
}
