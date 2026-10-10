// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { PDF_MAX_BYTES, PDF_MAX_CHARS } from "./readingHelpers.js";
import { addWordToCollectionEntry, loadWordCollections, saveWordCollectionsList } from "../words/wordCollections.js";
import { extractPdfPageTextFlat } from "./storyText.js";
import { translateFree } from "../translate/translateService.js";

export function createHandlePdfUpload({
  newCollectionTitle,
  setNewCollectionText,
  setNewCollectionTitle,
  setPdfBusy,
  setPdfError,
  setShowAddCollection,
  uiLang,
}) {
 // سقفِ کاراکتر، برای اینکه حجمِ localStorage (که مشترکِ همه‌چیزِ اپه) پر نشه

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // تا انتخابِ دوباره‌ی همون فایل هم onChange رو صدا بزنه
    if (!file) return;
    setPdfError("");
    if (file.size > PDF_MAX_BYTES) {
      setPdfError(uiLang === "en"
        ? `File size exceeds the ${Math.round(PDF_MAX_BYTES / (1024 * 1024))}MB limit`
        : `حجمِ فایل بیشتر از ${Math.round(PDF_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setPdfBusy(true);
    try {
      // pdf.js فقط همین‌جا و فقط یه‌بار لود می‌شه (نه تو بارگذاریِ اولیه‌ی
      // اپ) — چون کتابخونه‌ی نسبتاً سنگینیه و اکثرِ کاربرا اصلاً ازش
      // استفاده نمی‌کنن.
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = doc.numPages;
      let lines = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        // هر PDF متنِ خام رو معمولاً به‌صورتِ یه رشته‌ی پیوسته می‌ده، نه
        // خط‌به‌خط — برای اینکه با پارسرِ فعلی (که هر خط رو یه لغت فرض
        // می‌کنه) جور دربیاد، رویِ نقطه/کاما/newline خودِ PDF می‌شکونیمش.
        pageText
          .split(/\n|(?<=[.،,؛])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => lines.push(s));
        if (i % 3 === 0 || i === pageCount) {
          await new Promise((resolve) => setTimeout(resolve, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — بدونِ این، فایل‌های بزرگ UI رو قفل نشون می‌دن
        }
        if (lines.join("\n").length > PDF_MAX_CHARS) break;
      }
      let text = lines.join("\n");
      let truncated = doc.numPages > pageCount;
      if (text.length > PDF_MAX_CHARS) {
        text = text.slice(0, PDF_MAX_CHARS);
        truncated = true;
      }
      if (!text.trim()) {
        setPdfError(uiLang === "en"
          ? "No text was extracted from this PDF — it might be a scan/image, not real text"
          : "متنی از این PDF استخراج نشد — شاید این فایل اسکن/عکسه، نه متنِ واقعی");
        return;
      }
      setNewCollectionText(text);
      if (!newCollectionTitle.trim()) {
        setNewCollectionTitle(file.name.replace(/\.pdf$/i, ""));
      }
      setShowAddCollection(true);
      if (truncated) {
        setPdfError(uiLang === "en"
          ? "Note: the file was large, so only part of its text was read — you can edit it before saving"
          : "توجه: چون فایل بزرگ بود، فقط بخشی از متنش خونده شد — قبل از ذخیره می‌تونی ویرایشش کنی");
      }
    } catch (err) {
      setPdfError(uiLang === "en"
        ? "There was a problem reading this PDF — the file may be corrupted or encrypted"
        : "خوندنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfBusy(false);
    }
  };
  return handlePdfUpload;
}

export function createHandleTranslateAllMissing({
  activeCollection,
  aiSettings,
  nativeLang,
  refreshCollections,
  setTranslatingAll,
  storyLang,
  uiLang,
}) {
  // Fills in a Persian meaning for every word in the active collection that
  // doesn't have one yet — via the free translation-service chain (not AI),
  // one request per word, all in parallel.
  const handleTranslateAllMissing = async () => {
    if (!activeCollection) return;
    const missing = activeCollection.words.filter((w) => !w.meaning);
    if (!missing.length) return;
    setTranslatingAll(true);
    try {
      const meanings = await Promise.all(
        missing.map((w) =>
          translateFree(w.term, nativeLang, storyLang, aiSettings).catch(() => "")
        )
      );
      const list = loadWordCollections();
      const idx = list.findIndex((c) => c.id === activeCollection.id);
      if (idx !== -1) {
        const words = list[idx].words.map((w) => {
          const mi = missing.findIndex((m) => m.term === w.term);
          return mi !== -1 && meanings[mi] ? { ...w, meaning: String(meanings[mi]).trim() } : w;
        });
        list[idx] = { ...list[idx], words };
        saveWordCollectionsList(list);
      }
      refreshCollections();
    } catch (e) {
      alert(uiLang === "en" ? "Automatic translation failed, please try again." : "ترجمه‌ی خودکار انجام نشد، دوباره امتحان کن.");
    } finally {
      setTranslatingAll(false);
    }
  };
  return handleTranslateAllMissing;
}

export function createHandleAddWordToCollection({
  activeCollection,
  aiSettings,
  nativeLang,
  newWordMeaning,
  newWordTerm,
  refreshCollections,
  setAddingWord,
  setNewWordMeaning,
  setNewWordTerm,
  storyLang,
}) {
  // Adds one word to the currently open collection. If the user doesn't
  // type a meaning, we ask the AI for a short Persian translation so the
  // dictionary stays useful without extra typing.
  const handleAddWordToCollection = async () => {
    if (!activeCollection) return;
    const term = newWordTerm.trim();
    if (!term) return;
    setAddingWord(true);
    let meaning = newWordMeaning.trim();
    try {
      if (!meaning) {
        // ترجمه با سرویس‌های رایگان (نه هوش مصنوعی) — همون زنجیره‌ی fallback.
        // مقصدِ معنی باید همون زبان مادریِ کاربر باشه (nativeLang)، نه همیشه
        // فارسی — چون پیش‌فرض برنامه فارسیه ولی کاربر می‌تونه هر زبونی رو
        // به‌عنوان زبان مادریش انتخاب کنه.
        const res = await translateFree(term, nativeLang, storyLang, aiSettings);
        meaning = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
      }
    } catch (e) {
      // اگه ترجمه‌ی خودکار شکست بخوره، لغت بدون معنی ذخیره میشه و بعداً قابل ویرایشه
    }
    addWordToCollectionEntry(activeCollection.id, term, meaning);
    refreshCollections();
    setNewWordTerm("");
    setNewWordMeaning("");
    setAddingWord(false);
  };
  return handleAddWordToCollection;
}
