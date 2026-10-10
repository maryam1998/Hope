// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { BILINGUAL_PDF_MAX_BYTES, BILINGUAL_PDF_MAX_PAGES, BILINGUAL_PDF_RENDER_SCALE, PDF_VIEW_MAX_BYTES } from "./readingHelpers.js";
import { GLOBAL_TRANSLATE_CONCURRENCY, runWithConcurrencyLimit, translateFree } from "../translate/translateService.js";
import { deletePdfViewDoc, estimatePdfViewStorage, loadPdfViewFile, loadPdfViewPages, savePdfViewFile, savePdfViewMeta, savePdfViewPage } from "../storage/pdfViewDb.js";
import { extractPdfPageTextFlat, extractPdfPageTextWithBreaks, splitTextIntoSentenceStrings, translatePageTextPreservingParagraphs } from "./storyText.js";

export function createHandlePdfViewImport({
  aiSettings,
  clearPdfViewLiveDoc,
  getPdfjsLib,
  nativeLang,
  pdfViewPages,
  refreshPdfViewDocs,
  setPdfViewBusy,
  setPdfViewDocId,
  setPdfViewError,
  setPdfViewIndex,
  setPdfViewLiveDoc,
  setPdfViewPages,
  setPdfViewPersisted,
  setPdfViewProgress,
  setPdfViewTitle,
  uiLang,
}) {
 // ۸۰ مگابایت
  // 🩹 طبقِ درخواستِ کاربر، سقفِ تعدادِ صفحات کاملاً برداشته شد — قبلاً حتی
  // فایل‌های خیلی طولانی (مثلاً ۲۷۴ صفحه) رو فقط تا صفحه‌ی ۶۰ می‌خوند و
  // بی‌صدا بقیه رو کنار می‌ذاشت. الان همه‌ی صفحاتِ فایل پردازش می‌شن —
  // ممکنه برای فایل‌های خیلی حجیم/طولانی رو موبایل کمی طول بکشه، ولی
  // صفحه‌به‌صفحه که آماده می‌شه فوراً نشون داده و ذخیره می‌شه، پس نیازی به
  // صبرِ کاربر برای کلِ فایل نیست.

  const handlePdfViewImport = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setPdfViewError("");
    if (file.size > PDF_VIEW_MAX_BYTES) {
      setPdfViewError(uiLang === "en"
        ? `File size exceeds the ${Math.round(PDF_VIEW_MAX_BYTES / (1024 * 1024))}MB limit`
        : `حجمِ فایل بیشتر از ${Math.round(PDF_VIEW_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    // قبل از شروعِ فایلِ تازه، عکسِ فرمتِ قدیمی (اگه بود) و نمونه‌ی زنده‌ی
    // قبلی رو آزاد کن.
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewBusy(true);
    setPdfViewProgress(uiLang === "en" ? "Preparing..." : "در حال آماده‌سازی...");
    // شناسه‌ی تازه برای این سند — همین از همین الان تو IndexedDB ثبت می‌شه
    // و صفحه‌به‌صفحه که آماده می‌شن بهش اضافه می‌شن، تا اگه کاربر وسطِ کار
    // هم اپ رو ببنده، صفحاتِ تا اون‌جا پردازش‌شده از دست نره.
    const docId = `pdf-${Date.now()}`;
    const docTitle = file.name.replace(/\.pdf$/i, "");
    setPdfViewDocId(docId);
    setPdfViewTitle(docTitle);
    setPdfViewPersisted(true);
    try {
      const pdfjsLib = await getPdfjsLib();
      const buf = await file.arrayBuffer();
      // یه کپیِ جدا برای ذخیره‌سازی — چون pdf.js ممکنه بافرِ اصلی رو به
      // خودش «منتقل» (transfer/detach) کنه و بعدش دیگه قابلِ خوندن نباشه.
      const bufForStorage = buf.slice(0);
      // disableFontFace:true → به‌جای تکیه به موتورِ فونتِ خودِ مرورگر/وب‌ویو
      // (که رویِ بعضی گوشی‌ها با فونت‌های embedded/subset این PDFها گلیف‌ها
      // رو با فاصله‌ی غلط می‌چیند و کلمه‌ها تکه‌تکه/به‌هم‌ریخته نشون داده
      // می‌شن)، خودِ pdf.js هر گلیف رو مستقیم به‌صورتِ مسیرِ برداری رسم
      // می‌کنه — دقیقاً همون چیزی که تو PDFِ اصلی هست، بدونِ وابستگی به
      // فونت‌شیپینگِ دستگاه.
      const srcDoc = await pdfjsLib.getDocument({ data: buf, disableFontFace: true }).promise;
      const pageCount = srcDoc.numPages;

      // نمایشِ زنده از همین الان فعاله — کاربر منتظرِ ترجمه نمی‌مونه تا
      // خودِ صفحه رو ببینه.
      setPdfViewLiveDoc({ docId, doc: srcDoc });

      const metaSaved = await savePdfViewMeta({
        id: docId,
        title: docTitle,
        pageCount,
        doneCount: 0,
        createdAt: Date.now(),
      });
      const fileSaved = await savePdfViewFile(docId, bufForStorage);
      await refreshPdfViewDocs();
      // savePdfViewMeta/savePdfViewPage/savePdfViewFile قبلاً هر خطایی رو
      // بی‌صدا قورت می‌دادن (فقط false برمی‌گردوندن) — یعنی اگه حافظه‌ی
      // مرورگر (IndexedDB) به هر دلیلی (حالتِ خصوصی، پُر بودنِ فضا، یا
      // محدودیتِ WebViewِ خودِ اپ) اجازه‌ی نوشتن نمی‌داد، کاربر هیچ
      // پیامی نمی‌دید و فقط بعداً می‌فهمید که PDF تو لیستِ «داستان‌های
      // ذخیره‌شده» نیست. حالا این حالت صریحاً ردگیری و به کاربر گفته می‌شه
      // (persistFailed پایین‌تر، بعدِ حلقه‌ی صفحات، چک می‌شه — نه همین‌جا،
      // چون پیامِ پایانِ حلقه نباید این هشدار رو پاک کنه). نامِ دقیقِ خطا
      // (مثلاً QuotaExceededError) هم نگه داشته می‌شه تا تو پیامِ نهایی
      // نشون داده بشه — بدونِ نیاز به کنسولِ دیباگ.
      let persistFailed = !metaSaved.ok || !fileSaved.ok;
      let firstErrorName = (!metaSaved.ok && metaSaved.errorName) || (!fileSaved.ok && fileSaved.errorName) || "";

      for (let i = 1; i <= pageCount; i++) {
        setPdfViewProgress(uiLang === "en" ? `Page ${i} of ${pageCount}: translating...` : `صفحه‌ی ${i} از ${pageCount}: در حال ترجمه...`);
        await new Promise((r) => setTimeout(r, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — تا UI قفل نشه

        const page = await srcDoc.getPage(i);
        const content = await page.getTextContent();
        // به‌جای چسبوندنِ همه‌چیز با یه space (که کاملاً مرزِ خط/پاراگرافِ
        // متنِ اصلی رو گم می‌کرد)، سطربندیِ واقعیِ صفحه حفظ می‌شه — تا
        // ترجمه هم بشه پاراگراف‌به‌پاراگراف هم‌شکلِ متنِ اصلی نشونش داد.
        const pageText = extractPdfPageTextWithBreaks(content);
        const translatedText = pageText
          ? await translatePageTextPreservingParagraphs(pageText, nativeLang || "fa", aiSettings)
          : "";

        const newPage = {
          pageNum: i,
          originalText: pageText,
          translatedText: translatedText || (uiLang === "en" ? "No text found to translate on this page." : "متنی برای ترجمه در این صفحه پیدا نشد."),
        };

        // بلافاصله همین صفحه رو نشون بده — کاربر منتظرِ کلِ فایل نمی‌مونه،
        // از همون صفحه‌ی اول می‌تونه شروع به خوندن کنه، بقیه پشتِ‌صحنه
        // پردازش می‌شن. صفحه‌ی اول هم که آماده شد، خودکار باز می‌شه.
        setPdfViewPages((prev) => [...prev, newPage]);
        if (i === 1) setPdfViewIndex(0);

        // ذخیره‌ی متنِ همین صفحه تو IndexedDB — تا حتی اگه پردازشِ صفحاتِ
        // بعدی قطع بشه، همین‌قدر برای همیشه می‌مونه (خودِ عکس/صفحه دیگه
        // لازم نیست ذخیره بشه، چون از رویِ همون فایلِ خامِ ذخیره‌شده هر بار
        // زنده رندر می‌شه).
        const pageSaved = await savePdfViewPage(docId, newPage);
        const metaSavedThisPage = await savePdfViewMeta({ id: docId, title: docTitle, pageCount, doneCount: i, createdAt: Date.now() });
        if (!pageSaved.ok || !metaSavedThisPage.ok) {
          persistFailed = true;
          if (!firstErrorName) firstErrorName = (!pageSaved.ok && pageSaved.errorName) || (!metaSavedThisPage.ok && metaSavedThisPage.errorName) || "";
        }
      }

      if (persistFailed) {
        // 🩹 علاوه بر پیامِ کلی، تخمینِ واقعیِ فضای ذخیره‌سازیِ مرورگر و
        // نامِ دقیقِ خطا هم نشون داده می‌شه — تا معلوم بشه واقعاً «فضا پُره»
        // یا دلیلِ دیگه‌ای داره (مثلاً حالتِ خصوصی که QuotaExceeded نمی‌ده،
        // بلکه خودِ بازکردنِ دیتابیس رو رد می‌کنه).
        const estimate = await estimatePdfViewStorage();
        const details = [
          firstErrorName ? (uiLang === "en" ? `Error type: ${firstErrorName}` : `نوعِ خطا: ${firstErrorName}`) : "",
          estimate ? (uiLang === "en" ? `Space used: ${estimate.usageMB} of ${estimate.quotaMB}MB (${estimate.pct}%)` : `فضای استفاده‌شده: ${estimate.usageMB} از ${estimate.quotaMB} مگابایت (${estimate.pct}%)`) : "",
        ]
          .filter(Boolean)
          .join(" — ");
        setPdfViewError(
          (uiLang === "en"
            ? "This PDF is only readable while this page stays open — the browser/app's local storage didn't allow permanent saving (e.g. private mode or full storage), so it'll be lost after closing or refreshing. The \"Save to stories\" button is disabled for the same reason — there's nothing left to reopen later."
            : "این PDF فقط تا وقتی همین صفحه بازه قابلِ خوندنه — حافظه‌ی محلیِ مرورگر/اپ اجازه‌ی ذخیره‌ی دائمی رو نداد (مثلاً به‌خاطرِ حالتِ خصوصی یا پُر بودنِ فضا)، پس بعد از بستن یا رفرش از دست می‌ره. دکمه‌ی «ذخیره در داستان‌ها» هم به همین دلیل غیرفعاله — چون چیزی برای بازکردنِ بعدی نمی‌مونه.") +
            (details ? ` (${details})` : "")
        );
        setPdfViewPersisted(false);
      } else {
        setPdfViewError("");
        setPdfViewPersisted(true);
      }
      refreshPdfViewDocs();
    } catch (err) {
      console.error(err);
      setPdfViewError(uiLang === "en"
        ? "There was a problem opening this PDF — the file may be corrupted or encrypted"
        : "بازکردنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfViewBusy(false);
      setPdfViewProgress("");
    }
  };
  return handlePdfViewImport;
}

export function createOpenSavedPdfViewDoc({
  clearPdfViewLiveDoc,
  getPdfjsLib,
  pdfViewPages,
  setPdfViewBusy,
  setPdfViewDocId,
  setPdfViewError,
  setPdfViewIndex,
  setPdfViewLiveDoc,
  setPdfViewPages,
  setPdfViewPersisted,
  setPdfViewProgress,
  setPdfViewTitle,
  setShowSaved,
  uiLang,
}) {
  // بازکردنِ یه PDFِ قبلاً ذخیره‌شده از لیست — بدونِ آپلودِ دوباره یا هیچ
  // درخواستِ ترجمه‌ی تازه‌ای؛ فقط عکس‌ها/ترجمه‌های همون‌موقع از IndexedDB
  // خونده می‌شن و به object URL تبدیل می‌شن.
  const openSavedPdfViewDoc = async (doc) => {
    // این لیست حالا داخلِ پنلِ «داستان‌های ذخیره‌شده»ست؛ برای دیدنِ خودِ
    // صفحاتِ PDF باید از اون پنل برگردیم به نمای اصلیِ داستان‌ساز — دقیقاً
    // همون‌طور که بازکردنِ یه داستانِ ذخیره‌شده هم این کار رو می‌کنه.
    setShowSaved(false);
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewError("");
    setPdfViewBusy(true);
    setPdfViewProgress(uiLang === "en" ? "Opening saved PDF..." : "در حال بازکردنِ PDFِ ذخیره‌شده...");
    try {
      // 🩹 doc.pageCount ممکنه نامعلوم باشه (مثلاً کارتی که از قبل، پیش از
      // اضافه‌شدنِ این فیلد، ساخته شده) — بدونِ این fallback، حلقه‌ی
      // loadPdfViewPages اصلاً اجرا نمی‌شد (for i=1..undefined) و بی‌هیچ
      // خطایی صفحاتِ خالی برمی‌گشت؛ دقیقاً همون حالتی که کاربر می‌بینه
      // «هیچی نشون داده نمی‌شه» بدونِ هیچ پیام یا نشونه‌ای از چرایی‌اش.
      const expectedPageCount = doc.pageCount || 2000;
      // 🆕 اول بایتِ خامِ خودِ فایل رو بردار — اگه این PDF با نسخه‌ی جدید
      // ذخیره شده باشه (نه فرمتِ قدیمی‌ترِ فقط-عکس)، اینجا موجوده و می‌شه
      // با pdf.js دوباره بازش کرد تا صفحه‌ها زنده رندر بشن.
      const [fileBytes, storedPages] = await Promise.all([
        loadPdfViewFile(doc.id),
        loadPdfViewPages(doc.id, expectedPageCount),
      ]);
      const pages = storedPages
        .sort((a, b) => a.pageNum - b.pageNum)
        .map((p) => ({ ...p, imageUrl: p.imageBlob ? URL.createObjectURL(p.imageBlob) : "" }));
      setPdfViewPages(pages);
      setPdfViewTitle(doc.title);
      setPdfViewDocId(doc.id);
      setPdfViewIndex(0);

      let liveDocReady = false;
      if (fileBytes) {
        try {
          const pdfjsLib = await getPdfjsLib();
          // نگاه کن به همین توضیح تو handlePdfViewImport — همون
          // disableFontFace برای بازکردنِ PDFهای قبلاً ذخیره‌شده هم لازمه.
          const liveDoc = await pdfjsLib.getDocument({ data: fileBytes, disableFontFace: true }).promise;
          setPdfViewLiveDoc({ docId: doc.id, doc: liveDoc });
          liveDocReady = true;
        } catch (liveErr) {
          console.error(liveErr);
          // اگه بازکردنِ زنده‌ی فایل شکست خورد، حداقل صفحاتِ متنی/ترجمه
          // (اگه موجود باشن) هنوز قابلِ دیدنن.
        }
      }

      setPdfViewPersisted(liveDocReady || pages.length > 0);
      if (!liveDocReady && pages.length === 0) {
        // 🩹 قبلاً این حالت کاملاً بی‌صدا بود: نه خطا، نه هیچ چیزِ دیگه‌ای —
        // کاربر فقط یه اسپینر می‌دید و بعدش هیچی، انگار برنامه یخ زده.
        // این معمولاً یعنی صفحاتِ واقعیِ PDF (که فقط رویِ همون گوشی/مرورگرِ
        // اصلی، تویِ IndexedDB ذخیره شده بودن — نه رویِ سرور/ابر) از بین
        // رفتن: مثلاً کاربر کش/دیتای مرورگر رو پاک کرده، اپ رو حذف و دوباره
        // نصب کرده، یا داره از یه گوشی/مرورگرِ دیگه وارد می‌شه. کارتِ خودِ
        // داستان (اشاره‌گر) از طریق ابر همگام می‌مونه، ولی خودِ فایل/عکسِ
        // صفحات هیچ‌وقت به سرور فرستاده نمی‌شه، پس روی دستگاهِ تازه در
        // دسترس نیست.
        setPdfViewError(
          uiLang === "en"
            ? "This PDF is no longer available on this phone/browser (it was only stored here, not on the server) — the browser storage was probably cleared, or you're signing in on a different device. To see it again, upload the PDF file from scratch."
            : "این PDF دیگه روی این گوشی/مرورگر در دسترس نیست (چون فقط همینجا ذخیره شده بود، نه روی سرور) — احتمالاً حافظه‌ی مرورگر پاک شده یا داری از یه دستگاهِ دیگه وارد می‌شی. برای دیدنش دوباره، فایلِ PDF رو از اول آپلود کن."
        );
      } else if (pages.length > 0 && doc.doneCount < doc.pageCount) {
        setPdfViewError(
          uiLang === "en"
            ? `Note: last time only ${doc.doneCount} of ${doc.pageCount} pages were processed; upload the file again for the rest`
            : `توجه: دفعه‌ی قبل فقط ${doc.doneCount} صفحه از ${doc.pageCount} صفحه پردازش شده بود؛ برای بقیه دوباره فایل رو آپلود کن`
        );
      }
    } catch (err) {
      console.error(err);
      setPdfViewError(uiLang === "en" ? "There was a problem opening this saved PDF" : "بازکردنِ این PDFِ ذخیره‌شده مشکل داشت");
    } finally {
      setPdfViewBusy(false);
      setPdfViewProgress("");
    }
  };
  return openSavedPdfViewDoc;
}

export function createHandleDeletePdfViewDoc({
  clearPdfViewLiveDoc,
  pdfViewDocId,
  pdfViewPages,
  refreshPdfViewDocs,
  setPdfViewDocId,
  setPdfViewIndex,
  setPdfViewPages,
  setPdfViewTitle,
}) {
  const handleDeletePdfViewDoc = async (doc) => {
    await deletePdfViewDoc(doc.id, doc.pageCount);
    if (pdfViewDocId === doc.id) {
      pdfViewPages.forEach((p) => {
        try { URL.revokeObjectURL(p.imageUrl); } catch {}
      });
      clearPdfViewLiveDoc();
      setPdfViewPages([]);
      setPdfViewIndex(0);
      setPdfViewTitle("");
      setPdfViewDocId(null);
    }
    refreshPdfViewDocs();
  };
  return handleDeletePdfViewDoc;
}

export function createClosePdfView({
  clearPdfViewLiveDoc,
  pdfViewPages,
  setPdfViewDocId,
  setPdfViewError,
  setPdfViewIndex,
  setPdfViewPages,
  setPdfViewTitle,
}) {
  const closePdfView = () => {
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewTitle("");
    setPdfViewDocId(null);
    setPdfViewError("");
    // توجه: بستنِ نمایش، سندِ ذخیره‌شده رو پاک نمی‌کنه — هنوز تو لیستِ
    // «PDFهای ذخیره‌شده» پایینِ همین بخش هست و بعداً بدونِ آپلودِ دوباره
    // قابلِ بازکردنه.
  };
  return closePdfView;
}

export function createHandleBilingualPdfExport({
  aiSettings,
  nativeLang,
  setBilingualPdfBusy,
  setBilingualPdfError,
  setBilingualPdfProgress,
  uiLang,
}) {
 // کیفیتِ کافی برای خوانا بودنِ متن/عکسِ صفحه، بدونِ حجمِ زیادِ نهایی

  const handleBilingualPdfExport = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setBilingualPdfError("");
    if (file.size > BILINGUAL_PDF_MAX_BYTES) {
      setBilingualPdfError(uiLang === "en"
        ? `File size exceeds the ${Math.round(BILINGUAL_PDF_MAX_BYTES / (1024 * 1024))}MB limit`
        : `حجمِ فایل بیشتر از ${Math.round(BILINGUAL_PDF_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setBilingualPdfBusy(true);
    setBilingualPdfProgress(uiLang === "en" ? "Preparing..." : "در حال آماده‌سازی...");
    try {
      const [pdfjsLib, pdfLib] = await Promise.all([import("pdfjs-dist"), import("pdf-lib")]);
      const { PDFDocument } = pdfLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const srcDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = Math.min(srcDoc.numPages, BILINGUAL_PDF_MAX_PAGES);
      const truncated = srcDoc.numPages > BILINGUAL_PDF_MAX_PAGES;

      // مطمئن شو فونتِ فارسیِ خودِ اپ قبل از رسم روی canvas لود شده —
      // وگرنه ممکنه اولین صفحات با فونتِ پیش‌فرضِ سیستم (زشت/بی‌ربط) کشیده بشن.
      try {
        await document.fonts.load("bold 26px Vazirmatn");
        await document.fonts.load("22px Vazirmatn");
        await document.fonts.ready;
      } catch {}

      const outDoc = await PDFDocument.create();
      const isRtl = /^(fa|ar|ur|he|ps|ku)/i.test(nativeLang || "");

      const canvasToJpgBytes = (canvas) =>
        new Promise((resolve) => {
          canvas.toBlob(
            (b) => (b ? b.arrayBuffer().then(resolve) : resolve(null)),
            "image/jpeg",
            0.85
          );
        });

      for (let i = 1; i <= pageCount; i++) {
        setBilingualPdfProgress(uiLang === "en"
          ? `Page ${i} of ${pageCount}: rendering original page...`
          : `صفحه‌ی ${i} از ${pageCount}: رندرِ صفحه‌ی اصلی...`);
        await new Promise((r) => setTimeout(r, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — تا UI قفل نشه

        const page = await srcDoc.getPage(i);
        const viewport = page.getViewport({ scale: BILINGUAL_PDF_RENDER_SCALE });
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = Math.max(1, Math.ceil(viewport.width));
        pageCanvas.height = Math.max(1, Math.ceil(viewport.height));
        const pageCtx = pageCanvas.getContext("2d");
        await page.render({ canvasContext: pageCtx, viewport }).promise;
        const pageBytes = await canvasToJpgBytes(pageCanvas);
        if (pageBytes) {
          const pageImg = await outDoc.embedJpg(pageBytes);
          const outPage1 = outDoc.addPage([pageCanvas.width, pageCanvas.height]);
          outPage1.drawImage(pageImg, { x: 0, y: 0, width: pageCanvas.width, height: pageCanvas.height });
        }

        // متنِ همین صفحه رو دربیار و ترجمه کن
        setBilingualPdfProgress(uiLang === "en"
          ? `Page ${i} of ${pageCount}: translating...`
          : `صفحه‌ی ${i} از ${pageCount}: در حال ترجمه...`);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        let translatedText = "";
        if (pageText) {
          const sentences = splitTextIntoSentenceStrings(pageText);
          // سرویس‌های رایگانِ ترجمه سقفِ طولِ متن دارن — جمله‌ها رو تو
          // گروه‌های چندصدکاراکتری دسته می‌کنیم، هر گروه یه درخواستِ جدا.
          const groups = [];
          let cur = "";
          for (const s of sentences.length ? sentences : [pageText]) {
            if (cur && (cur + " " + s).length > 400) {
              groups.push(cur);
              cur = s;
            } else {
              cur = cur ? `${cur} ${s}` : s;
            }
          }
          if (cur) groups.push(cur);
          const translatedGroups = await runWithConcurrencyLimit(groups, GLOBAL_TRANSLATE_CONCURRENCY, (g) =>
            translateFree(g, nativeLang || "fa", "auto", aiSettings)
          );
          translatedText = translatedGroups.join(" ");
        }

        // صفحه‌ی «روبرو»ی ترجمه — به‌صورتِ عکسِ متنی (canvas)، دقیقاً به
        // همون اندازه‌ی صفحه‌ی اصلی، تا نظمِ صفحه‌به‌صفحه‌ی PDF حفظ بشه.
        const txCanvas = document.createElement("canvas");
        txCanvas.width = pageCanvas.width;
        txCanvas.height = pageCanvas.height;
        const txCtx = txCanvas.getContext("2d");
        txCtx.fillStyle = "#fdfbf5";
        txCtx.fillRect(0, 0, txCanvas.width, txCanvas.height);
        txCtx.direction = isRtl ? "rtl" : "ltr";
        txCtx.textBaseline = "top";
        txCtx.textAlign = isRtl ? "right" : "left";
        const margin = Math.round(txCanvas.width * 0.06);
        const maxWidth = txCanvas.width - margin * 2;
        const startX = isRtl ? txCanvas.width - margin : margin;
        let y = margin;

        txCtx.fillStyle = "#8a6d1f";
        txCtx.font = `bold 26px Vazirmatn, Tahoma, sans-serif`;
        txCtx.fillText(uiLang === "en" ? `Translation — page ${i}` : `ترجمه — صفحه‌ی ${i}`, startX, y);
        y += 46;

        txCtx.fillStyle = "#242018";
        const fontSizePx = 21;
        const lineHeight = Math.round(fontSizePx * 1.7);
        txCtx.font = `${fontSizePx}px Vazirmatn, Tahoma, sans-serif`;
        const words = (translatedText || (uiLang === "en" ? "No text found to translate on this page." : "متنی برای ترجمه در این صفحه پیدا نشد.")).split(/\s+/).filter(Boolean);
        let line = "";
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (line && txCtx.measureText(test).width > maxWidth) {
            if (y > txCanvas.height - margin - lineHeight) { line = ""; break; } // دیگه جا نیست — بقیه‌ی ترجمه‌ی این صفحه truncate می‌شه
            txCtx.fillText(line, startX, y);
            y += lineHeight;
            line = w;
          } else {
            line = test;
          }
        }
        if (line && y <= txCanvas.height - margin) txCtx.fillText(line, startX, y);

        const txBytes = await canvasToJpgBytes(txCanvas);
        if (txBytes) {
          const txImg = await outDoc.embedJpg(txBytes);
          const outPage2 = outDoc.addPage([txCanvas.width, txCanvas.height]);
          outPage2.drawImage(txImg, { x: 0, y: 0, width: txCanvas.width, height: txCanvas.height });
        }
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")} - ${uiLang === "en" ? "bilingual" : "دوزبانه"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      setBilingualPdfError(
        truncated
          ? (uiLang === "en"
              ? `Note: the file had more than ${BILINGUAL_PDF_MAX_PAGES} pages, so only the first ${BILINGUAL_PDF_MAX_PAGES} pages were processed and downloaded`
              : `توجه: چون فایل بیشتر از ${BILINGUAL_PDF_MAX_PAGES} صفحه بود، فقط ${BILINGUAL_PDF_MAX_PAGES} صفحه‌ی اول پردازش و دانلود شد`)
          : ""
      );
    } catch (err) {
      console.error(err);
      setBilingualPdfError(uiLang === "en"
        ? "There was a problem creating the bilingual PDF — the file may be corrupted, or too large/many pages for the browser"
        : "ساختِ PDFِ دوزبانه مشکل داشت — فایل ممکنه خراب باشه یا حجم/تعدادِ صفحاتش برای مرورگر زیاد باشه");
    } finally {
      setBilingualPdfBusy(false);
      setBilingualPdfProgress("");
    }
  };
  return handleBilingualPdfExport;
}
