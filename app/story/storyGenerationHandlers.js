// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { CONTENT_TYPES, STORY_LENGTHS, enforceSentenceSplit, splitTextIntoSentenceStrings } from "./storyText.js";
import { PARAGRAPH_PAGE_SIZE } from "./readingHelpers.js";
import { STORY_SEARCH_CONVERSATION_POOL, STORY_SEARCH_WORD_POOL } from "../config/dataPools.js";
import { VOCAB } from "../../VOCAB.js";
import { callAI } from "../ai/callAI.js";
import { detectPastedTextLanguage } from "../constants/languages.js";
import { ensureSavedStoryWord } from "../words/savedStoryWords.js";
import { normalizeWord } from "../words/wordCache.js";
import { translateFree } from "../translate/translateService.js";

export function createGenerateStory({
  aiSettings,
  contentType,
  generating,
  nativeLabel,
  selectedWords,
  setCurrentStoryId,
  setError,
  setGenerating,
  setParagraphs,
  setRepeatNotice,
  setVisibleParagraphCount,
  storyLang,
  storyLangLabel,
  storyLength,
  storyLevel,
  uiLang,
}) {
  // force=true یعنی «مطمئنم، بدونِ چک‌کردنِ دوباره‌ی داستان‌های مشابه، مستقیم
  // AI رو صدا بزن» — وقتی کاربر خودش از کارتِ «داستانِ مشابه پیدا شد» دکمه‌ی
  // «ساخت داستان جدید» رو بزنه همین حالت پیش میاد.
  const generateStory = async () => {
    if (!selectedWords.length || generating) return;

    // اطمینان از اینکه هر لغتی که برای این داستان استفاده می‌شه، تو انبار
    // دائمی «لغات ذخیره‌شده» هم بمونه — حتی اگه از یه مسیر دیگه (غیر از
    // toggleWord/addCustomWord) به selectedWords اضافه شده باشه.
    selectedWords.forEach((w) => ensureSavedStoryWord(w, storyLang));
    setGenerating(true);
    setError("");
    setRepeatNotice("");
    setParagraphs([]);
    try {
      // 🔥 اینجا فقط داستان به زبان اصلی ساخته می‌شه (بدون درخواست ترجمه از هوش مصنوعی)
      const genre = CONTENT_TYPES.find((c) => c.key === contentType) || CONTENT_TYPES[0];
      const lengthCfg = STORY_LENGTHS.find((l) => l.key === storyLength) || STORY_LENGTHS[1];

      const targetParagraphs = Math.round((lengthCfg.paragraphMin + lengthCfg.paragraphMax) / 2);
      const wordsList = selectedWords.map((w) => `"${w}"`).join(", ");

      const buildPrompt = (correction) => `Write ${genre.prompt} in ${storyLangLabel}, CEFR ${storyLevel}, for a learner whose native language is ${nativeLabel}.
- It must clearly belong to that genre from the first sentence.
- EXACTLY ${targetParagraphs} paragraphs, each with ${lengthCfg.sentencesHint}.
- ONE coherent, well-crafted story with a real arc (beginning, development, ending): vivid, specific, with varied sentence structure; each sentence follows from the previous one and later paragraphs refer back to earlier ones. It must read like a real story, not like example sentences.
- Target words: ${wordsList}. Work each of them into the story naturally, with its correct meaning and natural collocations (any grammatical form is fine). Do not count them, do not repeat them on purpose, and never force a word in; if one doesn't fit somewhere, rewrite the sentence instead. A phrase or full sentence target is used once, naturally.${correction ? "\n" + correction : ""}
Reply ONLY with JSON, no markdown, no extra text: {"paragraphs": ["full text of paragraph 1", "full text of paragraph 2"]}`;


      // زبان‌هایی با خطِ غیرلاتین (فارسی/عربی/هندی/روسی/چینی/کره‌ای/ژاپنی) برای همون
      // تعداد جمله خیلی بیشتر توکن مصرف می‌کنن؛ با بودجه‌ی قبلی خروجیِ JSON
      // وسط کار بریده می‌شد و می‌شد «JSON معتبر نبود».
      const heavyScript = ["fa", "ar", "hi", "ru", "zh", "ko", "ja"].includes(storyLang);
      // خروجی الان فقط متنِ داستانه (سؤال‌ها حذف شدن) — بودجه رو متناسب کم کردیم.
      const tokenBudget = Math.min(Math.round((Math.round(lengthCfg.tokens * 0.6) + 150) * (heavyScript ? 1.6 : 1)), 6000);

      // پارسِ تحمل‌پذیر: متنِ اضافه قبل/بعد از JSON، تگ <think>، و مهم‌تر از همه
      // JSON بریده‌شده (به‌خاطر تموم‌شدن توکن) — در حالت بریده، بزرگ‌ترین پیشوندِ
      // معتبر رو با بستنِ براکت‌ها برمی‌گردونه.
      const parseJsonLoose = (raw) => {
        let t = String(raw || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
        const start = t.indexOf("{");
        if (start === -1) throw new Error("no-json");
        t = t.slice(start);
        const end = t.lastIndexOf("}");
        try { return JSON.parse(end === -1 ? t : t.slice(0, end + 1)); } catch {}
        const stack = [];
        const cuts = [];
        let inStr = false, esc = false;
        for (let i = 0; i < t.length; i++) {
          const ch = t[i];
          if (inStr) {
            if (esc) esc = false;
            else if (ch === "\\") esc = true;
            else if (ch === '"') inStr = false;
            continue;
          }
          if (ch === '"') inStr = true;
          else if (ch === "{" || ch === "[") stack.push(ch);
          else if (ch === "}" || ch === "]") {
            stack.pop();
            cuts.push({ i, closers: stack.map((c) => (c === "{" ? "}" : "]")).reverse().join("") });
          }
        }
        for (let k = cuts.length - 1; k >= Math.max(0, cuts.length - 60); k--) {
          try { return JSON.parse(t.slice(0, cuts[k].i + 1) + cuts[k].closers); } catch {}
        }
        throw new Error("bad-json");
      };

      const runAttempt = async (correction) => {
        // تولیدِ کلِ داستان (تا چند هزار توکن، از چند پرووایدرِ پشت‌سرهم) خیلی بیشتر از
        // سقفِ پیش‌فرضِ ۱۰ثانیه‌ی callAI طول می‌کشه — همون «signal is aborted».
        const res = await callAI({ prompt: buildPrompt(correction), maxTokens: tokenBudget, aiSettings, timeoutMs: 120000, retries: 1 });
        try {
          const obj = parseJsonLoose(res);
          if (!Array.isArray(obj.paragraphs) || !obj.paragraphs.length) throw new Error("no-paragraphs");
          // سرویس الان هر پاراگراف رو به‌شکل یه رشته‌ی ساده برمی‌گردونه (ارزون‌تر از
          // آرایه‌ی {text}) — همین‌جا به ساختارِ همیشگیِ {sentences:[{text}]} برمی‌گردونیم.
          obj.paragraphs = obj.paragraphs
            .map((p) => {
              const txt = typeof p === "string" ? p
                : Array.isArray(p) ? p.join(" ")
                : (p?.sentences || []).map((x) => x?.text || "").join(" ");
              return { sentences: splitTextIntoSentenceStrings(txt).map((text) => ({ text })) };
            })
            .filter((p) => p.sentences.length);
          if (!obj.paragraphs.length) throw new Error("no-paragraphs");
          return obj;
        } catch (parseErr) {
          console.warn("story JSON parse failed:", String(res).slice(0, 300), "…", String(res).slice(-200));
        throw new Error(uiLang === "en"
          ? "parse-error: The AI's response wasn't complete or valid JSON — try again."
          : "parse-error: پاسخ هوش مصنوعی کامل یا JSON معتبر نبود — دوباره امتحان کن.");
        }
      };

      const scoreAttempt = (parsedAttempt) => {
        const paras = parsedAttempt.paragraphs || [];
        const paraTexts = paras.map((p) => (p.sentences || []).map((s) => s.text).join(" "));
        const paraCount = paras.length;
        const paraDeviation = paraCount !== targetParagraphs ? Math.abs(paraCount - targetParagraphs) * 3 : 0;
        const lengthOk = paraCount >= lengthCfg.paragraphMin && paraCount <= lengthCfg.paragraphMax;
        return { paraTexts, paraCount, lengthOk, deviation: paraDeviation };
      };

      let parsed = await runAttempt();
      let best = { parsed, ...scoreAttempt(parsed) };

      // فقط اگه تعداد پاراگراف‌ها با درخواست نمی‌خوند یه بار دیگه می‌سازیم
      // (دیگه هیچ بررسی/پچ/ریترای برای «تعداد تکرار لغات» وجود نداره).
      if (!best.lengthOk) {
        const correction = `Your previous attempt had ${best.paraCount} paragraphs, but it must have exactly ${targetParagraphs} paragraphs. Rewrite it from scratch with the exact paragraph count, keeping the story natural and coherent.`;
        try {
          const retryParsed = await runAttempt(correction);
          const retryScore = { parsed: retryParsed, ...scoreAttempt(retryParsed) };
          if (retryScore.deviation < best.deviation) best = retryScore;
        } catch {
          // اگه این تلاش هم خطا داد، بهترین نسخه‌ی موجود رو نگه می‌داریم
        }
      }
      parsed = best.parsed;

      const storyParagraphs = enforceSentenceSplit(parsed.paragraphs || []);
      
      // ============================================================
      // 🔥 داستان بدون ترجمه ذخیره می‌شه — ترجمه‌ی خودش (با سرویس‌های
      // رایگان، جدا از هوش مصنوعی) رو یه useEffect جدا انجام می‌ده که هر
      // وقت translationLangs عوض بشه (چه همین الان، چه هر وقت کاربر بعداً
      // یه زبان دیگه هم اضافه/کم کنه) خودش رو به‌روز می‌کنه — نیازی به
      // ساختن دوباره‌ی کل داستان نیست.
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      // داستانِ تازه‌ساخته‌شده هنوز ذخیره نشده — پس هنوز شناسه‌ای نداره؛ اگه
      // قبلاً یه داستانِ ذخیره‌شده‌ی دیگه باز بوده، این‌جا اون ارتباط پاک
      // می‌شه تا لغاتِ تازه‌ذخیره‌شده به اون داستانِ قدیمی نچسبن.
      setCurrentStoryId(null);
      
      // سؤال‌های درک مطلب دیگه ساخته نمی‌شن (برای صرفه‌جویی در توکن).

      // توجه: قبلاً بعد از ساخت هر داستان، همه‌ی لغات ذخیره‌شده‌ی این زبان
      // از «لغات ذخیره‌شده» پاک می‌شدن. دیگه این کار انجام نمی‌شه — لغات
      // ذخیره‌شده می‌مونن تا هر وقت خواستی (با دکمه‌ی ضربدر کنار هرکدوم)
      // خودت پاکشون کنی.
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.startsWith("ai-backend-error:")) {
        setError(uiLang === "en" ? `Server error: ${msg.replace("ai-backend-error: ", "")}` : `خطای سرور: ${msg.replace("ai-backend-error: ", "")}`);
      } else if (msg.startsWith("parse-error:")) {
        setError(msg.replace("parse-error: ", ""));
      } else {
        setError(uiLang === "en" ? `Connection error: ${msg || "unknown reason"}` : `خطای اتصال: ${msg || "دلیل نامشخص"}`);
      }
    } finally {
      setGenerating(false);
    }
  };
  return generateStory;
}

export function createHandleVocabPaste({
  aiSettings,
  savedWordsForLang,
  selectedWords,
  setSelectedWords,
  setTranslateNote,
  setWordTranslating,
  storyLang,
  uiLang,
}) {
  // وقتی کاربر یه لغت/عبارتی که خودش جایی کپی کرده رو تو همین کادرِ جستجو
  // پیست می‌کنه: اگه این متن تو هیچ‌کدوم از منبع‌های خودِ نرم‌افزار (VOCAB،
  // لغات‌واخبار/اسلنگ/مکالمات‌روزمره، لغاتِ ذخیره‌شده) پیدا نشه — یعنی چیزیه
  // که کاربر از بیرون آورده — مستقیم (دقیقاً مثلِ addCustomWord) به
  // انتخاب‌هایِ داستان اضافه‌ش می‌کنیم، نه اینکه فقط تو کادرِ جستجو بمونه.
  // اگه پیدا بشه، دخالت نمی‌کنیم و می‌ذاریم جستجوی معمولی کارشو بکنه.
  const handleVocabPaste = async (e) => {
    const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const w = pasted.trim();
    if (!w) return;
    const q = w.toLowerCase();
    const foundInVocab = VOCAB.some((v) => {
      const vw = v.t[storyLang] || v.t.en || "";
      return vw.toLowerCase().includes(q) || (v.meaningFa && v.meaningFa.includes(w));
    });
    const foundInPools = [STORY_SEARCH_WORD_POOL, STORY_SEARCH_CONVERSATION_POOL].some((pool) =>
      pool.some((item) => item.term.toLowerCase().includes(q) || (item.fa && item.fa.includes(w)))
    );
    const foundInSaved = savedWordsForLang.some(
      (se) => se.word.toLowerCase().includes(q) || (se.meaning && se.meaning.includes(w))
    );
    if (foundInVocab || foundInPools || foundInSaved) return;

    e.preventDefault();
    if (selectedWords.includes(w)) return;
    // اگه چیزی که پیست شده از قبل همون زبونِ داستانه (مثلاً کاربر داره یه
    // داستانِ انگلیسی می‌سازه و یه عبارتِ انگلیسی پیست می‌کنه)، نیازی به
    // تماس با سرویسِ ترجمه نیست — همون لحظه، بدونِ تأخیرِ شبکه اضافه می‌شه.
    if (detectPastedTextLanguage(w) === storyLang) {
      setSelectedWords((prev) => [...prev, w]);
      ensureSavedStoryWord(w, storyLang);
      setTranslateNote(uiLang === "en" ? `"${w}" added to Story Builder` : `«${w}» به داستان‌ساز اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
      return;
    }
    setWordTranslating(true);
    try {
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      setTranslateNote(
        normalizeWord(translated) !== normalizeWord(w)
          ? (uiLang === "en" ? `"${w}" → "${translated}" added` : `«${w}» → «${translated}» اضافه شد`)
          : (uiLang === "en" ? `"${w}" added to Story Builder` : `«${w}» به داستان‌ساز اضافه شد`)
      );
      setTimeout(() => setTranslateNote(""), 3000);
    } catch (err) {
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      setTranslateNote(uiLang === "en" ? `Automatic translation failed; "${w}" added as-is` : `ترجمه‌ی خودکار ناموفق بود؛ «${w}» به‌همون شکل اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
    } finally {
      setWordTranslating(false);
    }
  };
  return handleVocabPaste;
}

export function createAddCustomWord({
  aiSettings,
  customWord,
  selectedWords,
  setCustomWord,
  setSelectedWords,
  setTranslateNote,
  setWordTranslating,
  storyLang,
  uiLang,
}) {
  const addCustomWord = async () => {
    const w = customWord.trim();
    if (!w) return;
    setCustomWord("");
    setTranslateNote("");
    // همون میان‌بر: اگه متنِ واردشده از قبل همون زبونِ داستانه، بدونِ زدن به
    // سرویسِ ترجمه (که تأخیرِ شبکه داره) مستقیم اضافه می‌شه.
    if (detectPastedTextLanguage(w) === storyLang) {
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      return;
    }
    setWordTranslating(true);
    try {
      // The user can type the word in ANY language (usually their native
      // one) — the story itself is written in storyLang, so the word list
      // fed to the story generator must be in storyLang too. Translate it
      // via the free translation services (not the AI) — a same-language
      // word just comes back unchanged.
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      if (normalizeWord(translated) !== normalizeWord(w)) {
        setTranslateNote(uiLang === "en" ? `"${w}" → "${translated}" added` : `«${w}» → «${translated}» اضافه شد`);
        setTimeout(() => setTranslateNote(""), 3000);
      }
    } catch (e) {
      // translation failed — fall back to the raw word rather than losing the input
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      setTranslateNote(uiLang === "en" ? `Automatic translation failed; "${w}" added as-is` : `ترجمه‌ی خودکار ناموفق بود؛ «${w}» به‌همون شکل اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
    } finally {
      setWordTranslating(false);
    }
  };
  return addCustomWord;
}

export function createAddPdfWordToStory({
  aiSettings,
  selectedWords,
  setSelectedWords,
  setTranslateNote,
  setWordTranslating,
  storyLang,
  uiLang,
}) {
  // افزودنِ تک‌تکِ کلماتِ متنِ استخراج‌شده از PDF (originalText) به داستان‌ساز
  // — دقیقاً همون منطقِ addCustomWord (تشخیصِ زبان، ترجمه در صورتِ نیاز)،
  // فقط به‌جای گرفتنِ ورودی از کادرِ متنی، مستقیم یه کلمه/عبارتِ کلیک‌شده
  // از متنِ PDF رو می‌گیره.
  const addPdfWordToStory = async (raw) => {
    const w = raw.trim().replace(/^[.,!?;:،؛؟»«"'()\[\]]+|[.,!?;:،؛؟»«"'()\[\]]+$/g, "");
    if (!w) return;
    setTranslateNote("");
    if (selectedWords.includes(w)) return;
    if (detectPastedTextLanguage(w) === storyLang) {
      setSelectedWords((prev) => [...prev, w]);
      ensureSavedStoryWord(w, storyLang);
      setTranslateNote(uiLang === "en" ? `"${w}" added to Story Builder` : `«${w}» به داستان‌ساز اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
      return;
    }
    setWordTranslating(true);
    try {
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      setTranslateNote(
        normalizeWord(translated) !== normalizeWord(w)
          ? (uiLang === "en" ? `"${w}" → "${translated}" added` : `«${w}» → «${translated}» اضافه شد`)
          : (uiLang === "en" ? `"${w}" added to Story Builder` : `«${w}» به داستان‌ساز اضافه شد`)
      );
      setTimeout(() => setTranslateNote(""), 3000);
    } catch (e) {
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      setTranslateNote(uiLang === "en" ? `Automatic translation failed; "${w}" added as-is` : `ترجمه‌ی خودکار ناموفق بود؛ «${w}» به‌همون شکل اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
    } finally {
      setWordTranslating(false);
    }
  };
  return addPdfWordToStory;
}
