// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { DEFAULT_BACKEND_URL } from "../ai/callAI.js";
import { IMAGE_READ_MAX_BYTES_PER_FILE, PARAGRAPH_PAGE_SIZE, PDF_READ_MAX_BYTES, PDF_READ_MAX_SENTENCES, PDF_READ_SENTENCES_PER_PARAGRAPH, cleanOcrPageText, extractMainBodyText, extractYouTubeVideoId, preprocessImageForOcr } from "./readingHelpers.js";
import { TESSERACT_LANG_CODE, detectPastedTextLanguage, detectTextCEFRLevel } from "../constants/languages.js";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { extractPdfPageTextFlat, splitTextIntoSentenceStrings } from "./storyText.js";
import { speechController } from "../speech/speechController.js";

export function createHandlePdfImportForReading({
  setCurrentStoryId,
  setError,
  setParagraphs,
  setPdfReadBusy,
  setPdfReadError,
  setPdfReadProgress,
  setRepeatNotice,
  setStoryLang,
  setStoryLevel,
  setVisibleParagraphCount,
  uiLang,
}) {
 // سقفِ کلی — فراتر از این برای موبایل/سرویسِ ترجمه‌ی رایگان زیادی سنگین می‌شه (لازم شد می‌تونی این عدد رو دوباره کم/زیاد کنی)

  const handlePdfImportForReading = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setPdfReadError("");
    if (file.size > PDF_READ_MAX_BYTES) {
      setPdfReadError(uiLang === "en"
        ? `File size exceeds the ${Math.round(PDF_READ_MAX_BYTES / (1024 * 1024))}MB limit`
        : `حجمِ فایل بیشتر از ${Math.round(PDF_READ_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setPdfReadBusy(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = doc.numPages;
      let allSentences = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        allSentences.push(...splitTextIntoSentenceStrings(pageText));
        // pdf.js انجامِ getTextContent روی صفحه‌های سنگین رو کاملاً
        // سینکرون/CPU-heavy انجام می‌ده؛ خودِ await هم همیشه کافی نیست تا
        // مرورگر فرصتِ رندر/پاسخ‌گویی به لمس پیدا کنه (چون resolve شدنِ
        // promise یه microtask‌ه، نه یه چرخه‌ی کاملِ event loop). برای
        // همینه که با حذفِ سقفِ صفحه، فایل‌های بزرگ باعثِ «قفل‌شدنِ» ظاهریِ
        // صفحه می‌شدن. هر چند صفحه یه‌بار صریحاً به event loop برمی‌گردیم
        // (setTimeout به‌جایِ Promise.resolve، چون setTimeout یه macrotask
        // واقعیه و بهِ مرورگر اجازه‌ی رندر/پاسخ به لمس رو می‌ده) تا هم UI
        // فریز نشه، هم کاربر بفهمه داره کار می‌کنه (نه هنگ کرده).
        if (i % 3 === 0 || i === pageCount) {
          setPdfReadProgress(uiLang === "en" ? `Page ${i} of ${pageCount}...` : `صفحه‌ی ${i} از ${pageCount}...`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (allSentences.length > PDF_READ_MAX_SENTENCES) break;
      }
      let truncated = false;
      if (allSentences.length > PDF_READ_MAX_SENTENCES) {
        allSentences = allSentences.slice(0, PDF_READ_MAX_SENTENCES);
        truncated = true;
      }
      if (!allSentences.length) {
        setPdfReadError(uiLang === "en"
          ? "No text was extracted from this PDF — it might be a scan/image, not real text"
          : "متنی از این PDF استخراج نشد — شاید این فایل اسکن/عکسه، نه متنِ واقعی");
        return;
      }
      const fullRawText = allSentences.join(" ");
      const detectedLang = detectPastedTextLanguage(fullRawText);
      if (detectedLang) setStoryLang(detectedLang);
      // سطح رو دیگه همیشه A2 نمی‌ذاریم — از رویِ خودِ متنِ استخراج‌شده،
      // بدونِ AI و آنی، حدس زده می‌شه (نگاه کن: detectTextCEFRLevel بالا).
      setStoryLevel(detectTextCEFRLevel(fullRawText));
      const storyParagraphs = [];
      for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
        const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
        storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
      }
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      setCurrentStoryId(null);
      setError("");
      setRepeatNotice("");
      if (truncated) {
        setPdfReadError(uiLang === "en"
          ? "Note: the file was large, so only part of its text was read and made ready to read"
          : "توجه: چون فایل بزرگ بود، فقط بخشی از متنش خونده و آماده‌ی خوانش شد");
      }
    } catch (err) {
      setPdfReadError(uiLang === "en"
        ? "There was a problem reading this PDF — the file may be corrupted or encrypted"
        : "خوندنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfReadBusy(false);
      setPdfReadProgress("");
    }
  };
  return handlePdfImportForReading;
}

export function createHandleImagesImportForReading({
  setCurrentStoryId,
  setError,
  setImgReadBusy,
  setImgReadError,
  setImgReadProgress,
  setParagraphs,
  setRepeatNotice,
  setStoryLang,
  setStoryLevel,
  setVisibleParagraphCount,
  storyLang,
  uiLang,
}) {
  const handleImagesImportForReading = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (!files.length) return;
    setImgReadError("");
    const oversized = files.find((f) => f.size > IMAGE_READ_MAX_BYTES_PER_FILE);
    if (oversized) {
      setImgReadError(uiLang === "en"
        ? `"${oversized.name}" exceeds the ${Math.round(IMAGE_READ_MAX_BYTES_PER_FILE / (1024 * 1024))}MB per-image limit`
        : `«${oversized.name}» بیشتر از سقفِ ${Math.round(IMAGE_READ_MAX_BYTES_PER_FILE / (1024 * 1024))} مگابایتِ هر عکسه`);
      return;
    }
    setImgReadBusy(true);
    let worker = null;
    try {
      const Tesseract = await import("https://esm.sh/tesseract.js@5.1.1");
      const ocrLang = TESSERACT_LANG_CODE[storyLang] || "eng";
      worker = await Tesseract.createWorker(ocrLang);
      // 🐛 حالتِ پیش‌فرضِ Tesseract («تحلیلِ کاملِ چیدمانِ صفحه») روی عکس‌های
      // تزئینی (حاشیه‌ی گل‌وبوته + عکسِ پس‌زمینه‌ی رنگی کنارِ متن) گاهی
      // اشتباهی چندتا «ستون»ِ غیرواقعی تشخیص می‌ده و ترتیبِ خوندنِ خط‌ها رو
      // به‌هم می‌ریزه. SINGLE_COLUMN («فرض کن یه ستونِ تکی از متنه، با
      // اندازه‌های مختلف») دقیقاً مناسبِ همین نوع پوستر/نقل‌قولِ شعرگونه‌ست.
      try {
        const { PSM } = Tesseract;
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      } catch {}
      // پنلِ خوانش رو همون اولِ کار ریست می‌کنیم (نه بعد از تمومِ همه‌ی
      // عکس‌ها) — چون قراره متنِ هر عکس همین که آماده شد، فوراً به
      // paragraphs اضافه بشه و کاربر بتونه شروع به خوندن کنه، بدونِ اینکه
      // منتظرِ OCR شدنِ بقیه‌ی عکس‌ها بمونه.
      setCurrentStoryId(null);
      setError("");
      setRepeatNotice("");
      let allSentences = [];
      // اگه کاربر همین الان (یا مکث‌شده) داره به همین داستان گوش می‌ده، برای
      // اینکه اضافه‌شدنِ متنِ عکسِ بعدی پخش رو از سرِ جمله برنگردونه (دقیقاً
      // همون باگی که قبلاً اینجا بود)، هر بار قبل از رشدِ متن موقعیتِ دقیقِ
      // پخش رو یادداشت می‌کنیم و بلافاصله بعد از رشدِ متن، همون‌جا رو دوباره
      // به speechController می‌دیم — انگار اصلاً متن عوض نشده.
      let langForKey = storyLang;
      for (let i = 0; i < files.length; i++) {
        setImgReadProgress(uiLang === "en" ? `Image ${i + 1} of ${files.length}...` : `عکسِ ${i + 1} از ${files.length}...`);
        // اگه پیش‌پردازش (خاکستری/کنتراست/بزرگ‌نمایی) به هر دلیلی شکست خورد
        // (مثلاً فرمتِ عکسِ پشتیبانی‌نشده تویِ createImageBitmap)، خودِ فایلِ
        // خام رو مستقیم به Tesseract می‌دیم — بهتر از این‌که کلِ خوندنِ همین
        // عکس لغو بشه.
        let ocrSource = files[i];
        try {
          ocrSource = await preprocessImageForOcr(files[i]);
        } catch {}
        const { data } = await worker.recognize(ocrSource);
        const pageText = cleanOcrPageText(data);
        if (pageText) {
          const prevFullText = allSentences.join(" ");
          allSentences.push(...splitTextIntoSentenceStrings(pageText));
          // به‌محضِ آماده‌شدنِ متنِ همین عکس، paragraphs رو دوباره از رویِ
          // کلِ جملاتِ جمع‌شده تا این لحظه می‌سازیم و نشون می‌دیم — یعنی
          // کاربر عکسِ اول رو همون لحظه می‌بینه/می‌خونه، در حالی که بقیه‌ی
          // عکس‌ها هنوز دارن پشتِ‌صحنه OCR می‌شن.
          const fullRawTextSoFar = allSentences.join(" ");
          const detectedLang = detectPastedTextLanguage(fullRawTextSoFar);
          if (detectedLang) { setStoryLang(detectedLang); langForKey = detectedLang; }
          setStoryLevel(detectTextCEFRLevel(fullRawTextSoFar));
          const storyParagraphsSoFar = [];
          for (let j = 0; j < allSentences.length; j += PDF_READ_SENTENCES_PER_PARAGRAPH) {
            const chunk = allSentences.slice(j, j + PDF_READ_SENTENCES_PER_PARAGRAPH);
            storyParagraphsSoFar.push({ sentences: chunk.map((text) => ({ text })) });
          }
          const locale = TTS_LOCALE[langForKey] || "en-US";
          const prevKey = prevFullText ? `${locale}::${prevFullText}` : null;
          const prevState = speechController.getState();
          const wasActiveOnThisStory = !!prevKey && prevState.key === prevKey && prevState.status !== "idle";
          const resumeOffset = wasActiveOnThisStory ? speechController.getCharOffset() : null;
          const wasPlaying = wasActiveOnThisStory && prevState.status === "playing";
          setParagraphs(storyParagraphsSoFar);
          setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
          if (wasActiveOnThisStory) {
            // متنِ تازه (طولانی‌تر) رو جایگزینِ سشنِ فعلی می‌کنیم، دقیقاً از
            // همون آفستی که تا الان پخش/مکث شده بود — نه از اولِ جمله.
            speechController.toggle(fullRawTextSoFar, langForKey, resumeOffset, { loop: true });
            if (!wasPlaying) {
              // اگه مکث بود، همین الان که سشنِ تازه شروع به پخش کرد، فوراً
              // دوباره مکثش می‌کنیم تا حالتِ «مکث» حفظ بشه، نه اینکه خودکار
              // شروع به خوندن کنه.
              speechController.toggle(fullRawTextSoFar, langForKey);
            }
          }
        }
        // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — بدونِ این،
        // پردازشِ چند عکسِ پشتِ‌هم UI رو قفل نشون می‌ده.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (!allSentences.length) {
        setImgReadError(uiLang === "en"
          ? "No text could be recognized in these images"
          : "متنی تو این عکس‌ها تشخیص داده نشد");
        return;
      }
    } catch (err) {
      setImgReadError(uiLang === "en"
        ? "There was a problem reading text from these images"
        : "خوندنِ متن از این عکس‌ها مشکل داشت");
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch {}
      }
      setImgReadBusy(false);
      setImgReadProgress("");
    }
  };
  return handleImagesImportForReading;
}

export function createHandlePastedTextForReading({
  pastedReadingText,
  setCurrentStoryId,
  setError,
  setParagraphs,
  setPastedReadingText,
  setPdfReadError,
  setRepeatNotice,
  setShowPasteReading,
  setStoryLang,
  setStoryLevel,
  setVisibleParagraphCount,
  uiLang,
}) {
  // متنِ پیست‌شده (بدون PDF، بدون AI) رو دقیقاً با همون منطقِ بالا
  // (تقسیم به جمله → گروه‌بندیِ هر ۵ جمله در یک پاراگراف) وارد سیستمِ
  // خوانش می‌کنه — رایگان و آنیه چون هیچ درخواستی به AI زده نمی‌شه.
  // این کادر برخلافِ خوندنِ PDF (که به‌خاطرِ سنگینیِ سرویسِ رایگانِ ترجمه
  // برای موبایل سقفِ PDF_READ_MAX_SENTENCES رو داره) هیچ محدودیتی روی
  // طولِ متن نمی‌ذاره — کاربر هر چقدر متن که می‌خواد رو کامل پیست می‌کنه.
  // زبونِ متن هم دیگه از روی storyLangِ قبلی (که ممکنه هیچ ربطی به این
  // متنِ تازه نداشته باشه) گرفته نمی‌شه؛ خودکار از رویِ خودِ متن حدس زده
  // می‌شه تا هم جهتِ نمایش (چپ‌به‌راست/راست‌به‌چپ) درست باشه، هم موقعِ
  // خوانش صدای محلیِ گوشی برای همون زبون پیدا بشه (به‌جای افتادن به
  // مسیرِ آنلاینِ کندتر چون داشت دنبالِ صدای زبونِ اشتباه می‌گشت).
  const handlePastedTextForReading = () => {
    setPdfReadError("");
    const raw = pastedReadingText.trim();
    if (!raw) return;
    const allSentences = splitTextIntoSentenceStrings(raw);
    if (!allSentences.length) {
      setPdfReadError(uiLang === "en" ? "No text found to read" : "متنی برای خوندن پیدا نشد");
      return;
    }
    const detectedLang = detectPastedTextLanguage(raw);
    if (detectedLang) setStoryLang(detectedLang);
    // همون تشخیصِ خودکارِ سطح، برای مسیرِ پیستِ مستقیمِ متن.
    setStoryLevel(detectTextCEFRLevel(raw));
    const storyParagraphs = [];
    for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
      const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
      storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
    }
    setParagraphs(storyParagraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setCurrentStoryId(null);
    setError("");
    setRepeatNotice("");
    setPastedReadingText("");
    setShowPasteReading(false);
  };
  return handlePastedTextForReading;
}

export function createHandleLinkImportForReading({
  aiSettings,
  linkReadUrl,
  setCurrentStoryId,
  setError,
  setLinkReadBusy,
  setLinkReadError,
  setLinkReadUrl,
  setParagraphs,
  setRepeatNotice,
  setShowLinkReading,
  setStoryLang,
  setStoryLevel,
  setVisibleParagraphCount,
  uiLang,
}) {
  // «وارد کردنِ یه لینک برای خوانش» — دقیقاً همون مقصدِ نهایی‌ای که PDF/پیست
  // دارن (paragraphs همون سیستمِ خوانش)، فقط منبعِ متن یه صفحه‌ی وبه. چون
  // فچِ مستقیمِ یه دامنه‌ی دلخواه از خودِ مرورگر معمولاً با CORS بلاک می‌شه،
  // اول یه تلاشِ مستقیم می‌زنیم (برای سایت‌هایی که CORS باز دارن)؛ اگه شکست
  // خورد، از همون Workerِ بک‌اندِ AI به‌عنوانِ پراکسی استفاده می‌کنیم
  // (/api/fetch-url) — این مسیر باید جداگانه تو Worker اضافه بشه، وگرنه
  // پیامِ خطای روشن نشون داده می‌شه به‌جای هنگ‌کردنِ بی‌دلیل.
  //
  // 🎬 لینکِ یوتیوب پذیرفته نمی‌شه — متن/زیرنویسِ ویدیوها استخراج نمی‌شه (کپی‌رایت).
  const handleLinkImportForReading = async () => {
    setLinkReadError("");
    let raw = linkReadUrl.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    let normalizedUrl;
    try {
      normalizedUrl = new URL(raw).toString();
    } catch {
      setLinkReadError(uiLang === "en" ? "This link isn't valid — please enter the full page address" : "این لینک معتبر نیست — لطفاً آدرسِ کامل صفحه رو وارد کن");
      return;
    }
    if (extractYouTubeVideoId(normalizedUrl)) {
      setLinkReadError(uiLang === "en"
        ? "YouTube links aren't supported — captions are not extracted. Open the video in YouTube instead."
        : "لینکِ یوتیوب پشتیبانی نمی‌شه — متنِ ویدیوها استخراج نمی‌شه. ویدیو رو مستقیم تو یوتیوب ببین.");
      return;
    }
    setLinkReadBusy(true);
    try {
      let bodyText = "";
      let html = "";
      try {
        const directRes = await fetch(normalizedUrl);
        if (directRes.ok) html = await directRes.text();
      } catch {
        // مستقیم شکست خورد (احتمالاً CORS) — می‌ریم سراغِ پراکسیِ بک‌اند
      }
      if (!html) {
        const base = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
        const proxyRes = await fetch(`${base}/api/fetch-url?url=${encodeURIComponent(normalizedUrl)}`);
        if (!proxyRes.ok) {
          throw new Error(
            proxyRes.status === 404
              ? "fetch-url-not-configured"
              : `HTTP ${proxyRes.status}`
          );
        }
        html = await proxyRes.text();
      }
      bodyText = extractMainBodyText(html).replace(/\s+/g, " ").trim();
      if (!bodyText) {
        setLinkReadError(uiLang === "en"
          ? "No text was extracted from this page — the site's content might be built with JavaScript"
          : "متنی از این صفحه استخراج نشد — شاید محتوای این سایت با جاوااسکریپت ساخته می‌شه");
        return;
      }
      let allSentences = splitTextIntoSentenceStrings(bodyText);
      if (!allSentences.length) {
        setLinkReadError(uiLang === "en" ? "No text found to read" : "متنی برای خوندن پیدا نشد");
        return;
      }
      let truncated = false;
      if (allSentences.length > PDF_READ_MAX_SENTENCES) {
        allSentences = allSentences.slice(0, PDF_READ_MAX_SENTENCES);
        truncated = true;
      }
      const detectedLang = detectPastedTextLanguage(bodyText);
      if (detectedLang) setStoryLang(detectedLang);
      // همون تشخیصِ خودکارِ سطح، برای مسیرِ واردکردنِ لینک.
      setStoryLevel(detectTextCEFRLevel(bodyText));
      const storyParagraphs = [];
      for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
        const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
        storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
      }
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      setCurrentStoryId(null);
      setError("");
      setRepeatNotice("");
      setLinkReadUrl("");
      setShowLinkReading(false);
      if (truncated) {
        setLinkReadError(uiLang === "en" ? "Note: the page text was long, so only part of it was made ready to read" : "توجه: چون متنِ صفحه زیاد بود، فقط بخشی از اون آماده‌ی خوانش شد");
      }
    } catch (err) {
      setLinkReadError(
        err?.message === "fetch-url-not-configured"
          ? (uiLang === "en" ? "Reading this link needs an extra server setting — use copy/paste for now" : "خوندنِ این لینک نیاز به یه تنظیمِ اضافه تو سرور داره — فعلاً از کپی/پیستِ متن استفاده کن")
          : (uiLang === "en" ? "This link couldn't be read — either the site doesn't allow direct access, or the address is wrong" : "این لینک قابلِ خوندن نبود — یا سایت اجازه‌ی دسترسیِ مستقیم نمی‌ده، یا آدرس اشتباهه")
      );
    } finally {
      setLinkReadBusy(false);
    }
  };
  return handleLinkImportForReading;
}
