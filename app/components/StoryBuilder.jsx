// داستان‌ساز
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Sparkles, Wand2, Library } from "lucide-react";
import { VOCAB } from "../../VOCAB.js";
import { recordNeuralRepeat, addNeuralFiber } from "../../NeuralPath.jsx";
import { bridge } from "../runtime/bridge.js";
import { STORY_SEARCH_CONVERSATION_POOL, STORY_SEARCH_WORD_POOL } from "../config/dataPools.js";
import { deleteStoryAudioRecord, getStoryAudioRecord, saveStoryAudioRecord } from "../storage/storyAudioDb.js";
import { deletePdfViewDoc, listPdfViewDocs } from "../storage/pdfViewDb.js";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { LANGUAGES, syncLangPickerFromTargetOrder } from "../constants/languages.js";
import { colors, fontFa, fontLatin, smoothScrollToCenter } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";
import { translateFree, translateFreeNetwork, translateViaAI } from "../translate/translateService.js";
import { rememberMainTextResumeOffset, speechController } from "../speech/speechController.js";
import { SAVED_WORDS_CHANGED_EVENT, STORY_WORD_PICKED_EVENT, ensureSavedStoryWord, loadSavedStoryWords } from "../words/savedStoryWords.js";
import { loadReadWordIds, saveReadWordIds } from "../words/wordTranslations.js";
import { useStoryNote } from "../story/storyNotes.js";
import { useTargetTextPrefs } from "../prefs/textPrefs.js";
import { addWordCollection, loadWordCollections, removeWordFromCollectionEntry, updateWordInCollectionEntry } from "../words/wordCollections.js";
import { splitTextIntoSentenceStrings } from "../story/storyText.js";
import { getStoryEntryAudioKey, openYtSource } from "../story/storyEntries.js";
import { useStoryUserAudio } from "../hooks/useStoryUserAudio.js";
import { SrtTranslatorTool } from "./SrtTranslatorTool.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelFilterRow } from "./levels/LevelControls.jsx";
import { DraggableToggleLangGrid } from "./OrderChips.jsx";
import { ClickableSentence } from "./story/ClickableSentence.jsx";
import { PdfLivePageView } from "./story/PdfLivePageView.jsx";
import { PARAGRAPH_PAGE_SIZE, STORY_LIST_ID, pdfImgTouchDist } from "../story/readingHelpers.js";
import { SavedStoriesLibrary } from "./story/SavedStoriesLibrary.jsx";
import { StorySettingsPanel } from "./story/StorySettingsPanel.jsx";
import { StoryWordPicker } from "./story/StoryWordPicker.jsx";
import { StoryReadingImportPanel } from "./story/StoryReadingImportPanel.jsx";
import { StoryReaderPanel } from "./story/StoryReaderPanel.jsx";
import { createHandlePdfViewImport, createOpenSavedPdfViewDoc, createHandleDeletePdfViewDoc, createClosePdfView, createHandleBilingualPdfExport } from "../story/pdfViewHandlers.js";
import { createHandlePdfImportForReading, createHandleImagesImportForReading, createHandlePastedTextForReading, createHandleLinkImportForReading } from "../story/readingImportHandlers.js";
import { createGenerateStory, createHandleVocabPaste, createAddCustomWord, createAddPdfWordToStory } from "../story/storyGenerationHandlers.js";
import { createHandlePdfUpload, createHandleTranslateAllMissing, createHandleAddWordToCollection } from "../story/collectionHandlers.js";
import { useImportYtSaved, createSaveCurrentStory, createSavePdfToStories } from "../story/savedStoryHandlers.js";
import { createRetranslateStoryParagraph, createRetranslateStorySentence } from "../story/storyTranslationHandlers.js";

export function StoryBuilder({ nativeLang, nativeLabel, targetOrder, langPickerOrder, setLangPickerOrder, wordStats, setWordStats, savedStories, setSavedStories, aiSettings, jumpTo, onFullTextChange, onUserAudioStateChange, autoScrollActive, calendarSystem, highlightColor, uid, uiLang }) {
  // Story language & translation languages are driven by whatever the user
  // already picked at the top of the app (native language + target
  // languages) — no separate picker duplicated here.
  const storyLangOptions = (targetOrder && targetOrder.length ? targetOrder : LANGUAGES.filter((l) => l.code !== nativeLang).map((l) => l.code));
  // Default to whatever language the user is already studying in the main
  // Phrasebook tab (targetOrder[0]) instead of always defaulting to English —
  // the pill selector below still lets them switch to any language freely.
  const defaultStoryLang =
    (targetOrder || []).find((c) => storyLangOptions.includes(c)) || storyLangOptions[0] || "en";
  const [storyLang, setStoryLang] = useState(defaultStoryLang);
  // اگه کاربر بالای صفحه زبان‌های مقصد رو عوض کنه (مثلاً از انگلیسی به
  // هندی)، storyLang باید خودش رو با انتخاب جدید هماهنگ کنه — قبلاً فقط
  // یه‌بار موقع mount مقداردهی می‌شد و بعدش «قفل» می‌موند رو همون زبون اول،
  // حتی اگه دیگه جزو گزینه‌های فعلی نبود.
  useEffect(() => {
    if (!storyLangOptions.includes(storyLang)) {
      setStoryLang(defaultStoryLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStoryLang, storyLangOptions.join(",")]);
  const sentenceElsRef = useRef({}); // "pi-si" -> DOM node, for auto-read scroll
  const paragraphElsRef = useRef({}); // pi -> DOM node, for auto-read scroll
  const [storyLevel, setStoryLevel] = useState("A2");
  const [contentType, setContentType] = useState("general");
  const [storyLength, setStoryLength] = useState("medium");
  const [selectedWords, setSelectedWords] = useState([]);
  const [customWord, setCustomWord] = useState("");
  const [wordTranslating, setWordTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState("");
  const [collections, setCollections] = useState([]);
  const [activeCollectionId, setActiveCollectionId] = useState("");
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionText, setNewCollectionText] = useState("");
  // آپلودِ PDF برای «منبعِ لغت» — استخراجِ متن کاملاً تو خودِ مرورگره
  // (با pdf.js)، هیچ فایلی به هیچ سروری فرستاده نمی‌شه. pdfBusy یعنی «داره
  // پردازش می‌کنه»، pdfError پیامِ خطا (حجمِ زیاد/فایلِ خراب/و غیره).
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const pdfInputRef = useRef(null);
  // همون الگو، برای «وارد کردنِ PDF برای خوانش» (جدا از PDFِ بالا که فقط
  // برای منبعِ لغته) — این‌یکی متنِ کامل رو می‌ذاره تو سیستمِ خوانش.
  const [pdfReadBusy, setPdfReadBusy] = useState(false);
  const [pdfReadProgress, setPdfReadProgress] = useState("");
  const [pdfReadError, setPdfReadError] = useState("");
  const pdfReadInputRef = useRef(null);
  // «وارد کردنِ عکس برای خوندن/ترجمه» — دقیقاً همون الگوی «وارد کردنِ PDF
  // برای خوانش» بالا، فقط منبعش عکسه: با Tesseract.js (OCR)، متنِ رویِ
  // هر عکس تو خودِ مرورگر استخراج می‌شه (هیچ عکسی به هیچ سروری فرستاده
  // نمی‌شه)، بعد دقیقاً وارد همون سیستمِ خوانش/ترجمه/صدای داستان می‌شه.
  // کاربر می‌تونه هر تعداد عکس که بخواد یه‌جا انتخاب کنه (بدون سقفِ تعداد).
  const [imgReadBusy, setImgReadBusy] = useState(false);
  const [imgReadProgress, setImgReadProgress] = useState("");
  const [imgReadError, setImgReadError] = useState("");
  const imgReadInputRef = useRef(null);
  // خروجیِ «PDF دوزبانه» — برخلافِ دوتای بالا (که فقط متنِ PDF رو
  // استخراج می‌کنن)، این‌یکی خودِ فایل رو دست‌نخورده نگه می‌داره: هر صفحه‌ی
  // اصلی (با عکس/چیدمانِ خودش) دقیقاً همون‌جوری که هست به‌صورتِ عکس رندر
  // و در یک PDFِ خروجیِ جدید embed می‌شه، و بلافاصله بعدش یک صفحه‌ی
  // «روبرو» با ترجمه‌ی همون متن اضافه می‌شه — پس چیزی از فایلِ اصلی
  // (عکس‌ها/فرمت) گم نمی‌شه، فقط یک PDFِ تازه با متن+ترجمه ساخته و دانلود
  // می‌شه (فایلِ اصلیِ کاربر جایی آپلود/تغییر داده نمی‌شه).
  const [bilingualPdfBusy, setBilingualPdfBusy] = useState(false);
  const [bilingualPdfProgress, setBilingualPdfProgress] = useState("");
  const [bilingualPdfError, setBilingualPdfError] = useState("");
  const bilingualPdfInputRef = useRef(null);
  // «نمایشِ PDF همینجا» — حالتِ دومِ بارگذاریِ PDF، برخلافِ «خروجی PDF
  // دوزبانه» بالا (که یک فایلِ تازه می‌سازه و دانلود می‌کنه)، این‌یکی
  // چیزی دانلود نمی‌کنه: فایلِ خام رو با عکس‌های خودش همینجا تو
  // داستان‌ساز، صفحه‌به‌صفحه نشون می‌ده و ترجمه‌ی متنِ همون صفحه رو
  // درست کنارش/زیرش می‌ذاره (روبروی هم).
  const [pdfViewBusy, setPdfViewBusy] = useState(false);
  const [pdfViewProgress, setPdfViewProgress] = useState("");
  const [pdfViewError, setPdfViewError] = useState("");
  const [pdfViewPages, setPdfViewPages] = useState([]); // [{pageNum, originalText, translatedText}] (سندهای قدیمی‌تر ممکنه imageUrl هم داشته باشن — fallback)
  const [pdfViewTitle, setPdfViewTitle] = useState("");
  const [pdfViewIndex, setPdfViewIndex] = useState(0);
  // همون تنظیماتِ سراسریِ «اندازه/بولدِ فونتِ زبانِ مقصد» که تو صفحه‌ی
  // تنظیمات هست و ClickableSentence خودش داخلی اعمال می‌کنه — اینجا هم
  // دستی روی باکسِ ترجمه‌ی PDF (که خودش ClickableSentence نیست، فقط یه
  // <div> ساده‌ست) اعمال می‌شه، تا با بقیه‌ی اپ هماهنگ باشه.
  const pdfTargetTextPrefs = useTargetTextPrefs();
  const pdfTranslationShouldBold =
    pdfTargetTextPrefs.bold === "both" || pdfTargetTextPrefs.bold === "translation";
  const pdfTranslationFontSize = Math.round(13 * ((pdfTargetTextPrefs.scale || 100) / 100));
  const pdfViewInputRef = useRef(null);
  // شناسه‌ی سندِ جاری (برای ذخیره‌ی صفحه‌به‌صفحه تو IndexedDB حین پردازش)،
  // و لیستِ PDFهایی که قبلاً کامل/ناقص ذخیره شدن — تا کاربر بتونه بدونِ
  // آپلود و ترجمه‌ی دوباره، از لیست بازشون کنه.
  const [pdfViewDocId, setPdfViewDocId] = useState(null);
  const [pdfViewDocs, setPdfViewDocs] = useState([]);
  // 🆕 نمونه‌ی زنده‌ی pdf.js برای فایلِ فعلاً بازشده — تا هر صفحه به‌جای
  // عکسِ ثابت، همون لحظه با PdfLivePageView رندر بشه (لایه‌ی متنِ
  // قابلِ‌سلکت هم داره). pdfjsLibRef فقط برای این‌که ماژولِ pdfjs-dist
  // (و workerSrc اش) فقط یه‌بار import بشه، نه هر بار که PDF عوض می‌شه.
  const pdfjsLibRef = useRef(null);
  const [pdfViewLiveDoc, setPdfViewLiveDoc] = useState(null); // { docId, doc } | null
  const getPdfjsLib = async () => {
    if (!pdfjsLibRef.current) {
      const lib = await import("pdfjs-dist");
      lib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      pdfjsLibRef.current = lib;
    }
    return pdfjsLibRef.current;
  };
  const clearPdfViewLiveDoc = () => {
    setPdfViewLiveDoc((prev) => {
      if (prev?.doc) {
        try { prev.doc.destroy(); } catch {}
      }
      return null;
    });
  };
  // اگه کاربر کاملاً از تبِ داستان‌ساز بره بیرون (کامپوننت unmount بشه)،
  // نمونه‌ی زنده‌ی pdf.js هم آزاد بشه — وگرنه حافظه نگه داشته می‌مونه.
  useEffect(() => {
    return () => {
      setPdfViewLiveDoc((prev) => {
        if (prev?.doc) {
          try { prev.doc.destroy(); } catch {}
        }
        return null;
      });
    };
  }, []);
  // 🩹 آیا صفحاتِ همین PDFِ باز، واقعاً توی IndexedDB ذخیره شدن یا نه —
  // چون تا الان «ذخیره در داستان‌ها» بدونِ توجه به این، همیشه یه کارتِ
  // اشاره‌گر می‌ساخت؛ حتی وقتی نوشتنِ واقعیِ صفحات (به‌خاطرِ پُر بودنِ
  // فضا/حالتِ خصوصی/محدودیتِ WebView) شکست خورده بود. نتیجه: کارت تو
  // لیست بود ولی بازکردنش هیچی نشون نمی‌داد. حالا این دکمه فقط وقتی فعاله
  // که ذخیره‌سازیِ واقعی موفق بوده باشه.
  const [pdfViewPersisted, setPdfViewPersisted] = useState(true);
  // نمایش/عدم‌نمایشِ متنِ اصلیِ همین صفحه به‌صورتِ کلمه‌به‌کلمه‌ی کلیک‌پذیر
  // (برای افزودنِ لغات به داستان‌ساز).
  const [showPdfOriginalWords, setShowPdfOriginalWords] = useState(false);

  // زوم/جابه‌جاییِ تصویرِ صفحه‌ی PDF با انگشت (پینچ برای زوم، تک‌انگشت
  // برای جابه‌جایی وقتی زوم شده). هر بار صفحه عوض بشه، زوم ریست می‌شه.
  const [pdfImgZoom, setPdfImgZoom] = useState(1);
  const [pdfImgPan, setPdfImgPan] = useState({ x: 0, y: 0 });
  const pdfImgGestureRef = useRef({ mode: null, startDist: 0, startZoom: 1, startPan: { x: 0, y: 0 }, startTouch: { x: 0, y: 0 } });

  useEffect(() => {
    setPdfImgZoom(1);
    setPdfImgPan({ x: 0, y: 0 });
    setShowPdfOriginalWords(false);
  }, [pdfViewIndex]);

  const handlePdfImgTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pdfImgGestureRef.current = {
        mode: "pinch",
        startDist: pdfImgTouchDist(e.touches),
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: 0, y: 0 },
      };
    } else if (e.touches.length === 1 && pdfImgZoom > 1) {
      pdfImgGestureRef.current = {
        mode: "pan",
        startDist: 0,
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, [pdfImgZoom, pdfImgPan]);

  const handlePdfImgTouchMove = useCallback((e) => {
    const g = pdfImgGestureRef.current;
    if (g.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const dist = pdfImgTouchDist(e.touches);
      const ratio = dist / (g.startDist || dist);
      const newZoom = Math.min(4, Math.max(1, g.startZoom * ratio));
      setPdfImgZoom(newZoom);
      if (newZoom <= 1) setPdfImgPan({ x: 0, y: 0 });
    } else if (g.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - g.startTouch.x;
      const dy = e.touches[0].clientY - g.startTouch.y;
      setPdfImgPan({ x: g.startPan.x + dx, y: g.startPan.y + dy });
    }
  }, []);

  const handlePdfImgTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      pdfImgGestureRef.current.mode = null;
    } else if (e.touches.length === 1) {
      // از پینچ به تک‌انگشت افتاد — اگه هنوز زوم داریم، پن رو از همینجا ادامه بده
      pdfImgGestureRef.current = {
        mode: pdfImgZoom > 1 ? "pan" : null,
        startDist: 0,
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, [pdfImgZoom, pdfImgPan]);

  const handlePdfImgDoubleClick = useCallback(() => {
    setPdfImgZoom((z) => (z > 1 ? 1 : 2));
    setPdfImgPan({ x: 0, y: 0 });
  }, []);

  const refreshPdfViewDocs = useCallback(async () => {
    setPdfViewDocs(await listPdfViewDocs());
  }, []);

  // اولین باری که این تب باز می‌شه، لیستِ PDFهای ذخیره‌شده رو بیار.
  useEffect(() => {
    refreshPdfViewDocs();
  }, [refreshPdfViewDocs]);
  // پیست‌کردنِ مستقیمِ متن/داستان برای خوانش — همون مسیرِ «وارد کردنِ PDF
  // برای خوانش» بالا، فقط منبعِ متن به‌جای فایل، تایپ‌شده/پیست‌شده‌ی خودِ کاربره.
  const [pastedReadingText, setPastedReadingText] = useState("");
  const [showPasteReading, setShowPasteReading] = useState(false);
  // ویرایشِ متنِ داستانِ همین الان (بعد از این‌که پیست/PDF/لینک قبلاً به
  // paragraphs تبدیل شده) — چون قبلاً تنها راهِ تصحیحِ یه غلط تو متنِ اصلی
  // (نه ترجمه) این بود که کل داستان پاک بشه و از اول پیست بشه. با این
  // دکمه، متنِ فعلی (با همون تقسیم‌بندیِ پاراگرافی‌ش) برمی‌گرده تو یه
  // textarea قابل‌ویرایش؛ با تأیید، دوباره از splitTextIntoSentenceStrings
  // رد می‌شه و paragraphs تازه می‌سازه (ترجمه‌های قبلی این‌جوری از نو
  // گرفته می‌شن، چون متنِ اصلی عوض شده و دیگه معتبر نیستن).
  const [editingStoryText, setEditingStoryText] = useState(false);
  const [storyEditDraft, setStoryEditDraft] = useState("");
  const startEditingStoryText = () => {
    const draft = paragraphs.map((p) => (p.sentences || []).map((s) => s?.text || "").join(" ")).join("\n\n");
    setStoryEditDraft(draft);
    setEditingStoryText(true);
  };
  const cancelEditingStoryText = () => {
    setEditingStoryText(false);
    setStoryEditDraft("");
  };
  const applyEditedStoryText = async () => {
    const raw = storyEditDraft.trim();
    if (!raw) return;
    const rawParagraphs = raw.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
    const storyParagraphs = rawParagraphs
      .map((paraText) => ({ sentences: splitTextIntoSentenceStrings(paraText).map((text) => ({ text })) }))
      .filter((p) => p.sentences.length);
    if (!storyParagraphs.length) return;

    // 🎵 کلیدِ ذخیره‌سازیِ صوتِ آپلودیِ کاربر (mainStoryKey) شاملِ خودِ
    // متنِ کاملِ داستانه؛ پس با کوچیک‌ترین ویرایشِ متن، این کلید عوض
    // می‌شه و صوتِ آپلودیِ قبلی (که زیرِ کلیدِ قدیمی توی IndexedDB نشسته)
    // دیگه پیدا نمی‌شه — نه اینکه واقعاً پاک شده باشه، فقط "گم" می‌شه و
    // کاربر مجبور می‌شه دوباره آپلودش کنه. برای همین، قبل از اعمالِ متنِ
    // تازه، اگه صوتی زیرِ کلیدِ قدیمی هست، به کلیدِ جدید منتقلش می‌کنیم.
    const oldStoryKey = mainStoryKey;
    const newFullText = storyParagraphs.flatMap((p) => p.sentences.map((s) => s.text)).join(" ");
    const newStoryKey = newFullText ? `${TTS_LOCALE[storyLang] || "en-US"}::${newFullText}` : null;
    if (oldStoryKey && newStoryKey && oldStoryKey !== newStoryKey) {
      try {
        const rec = await getStoryAudioRecord(oldStoryKey);
        if (rec) {
          await saveStoryAudioRecord(newStoryKey, rec);
          await deleteStoryAudioRecord(oldStoryKey);
        }
      } catch {}
    }

    setParagraphs(storyParagraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setRepeatNotice("");
    setEditingStoryText(false);
    setStoryEditDraft("");
  };
  // وارد کردنِ یه لینک برای خوانش — به‌جای کپی/پیستِ دستیِ متن، کاربر فقط
  // آدرسِ صفحه رو می‌ده و خودِ برنامه متنِ اصلیِ صفحه (بدنه/بادیِ نوشته، نه
  // منو/فوتر/تبلیغ) رو استخراج می‌کنه. همون مسیرِ پردازشِ بعدیِ PDF/پیست
  // (تقسیم به جمله → پاراگراف) دقیقاً همین‌جا هم استفاده می‌شه.
  const [linkReadUrl, setLinkReadUrl] = useState("");
  const [showLinkReading, setShowLinkReading] = useState(false);
  const [linkReadBusy, setLinkReadBusy] = useState(false);
  const [linkReadError, setLinkReadError] = useState("");
  const [newWordTerm, setNewWordTerm] = useState("");
  const [newWordMeaning, setNewWordMeaning] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editDraftMeaning, setEditDraftMeaning] = useState("");
  const [translatingAll, setTranslatingAll] = useState(false);
  const [vocabQuery, setVocabQuery] = useState("");
  const [paragraphs, setParagraphs] = useState([]); // [{ sentences: [{text, t:{lang:text}}] }]
  // کلیدهای `${pi}-${si}-${code}`ای که الان دارن دوباره ترجمه می‌شن — برای
  // نشون‌دادنِ اسپینر روی دکمه‌ی رفرشِ همون جمله، بدون قفل‌کردنِ کل صفحه.
  const [retranslatingSentences, setRetranslatingSentences] = useState({});
  // دکمه‌ی رفرشِ ترجمه‌ی هر جمله — اگه ترجمه‌ی خودکار یه جمله اشتباه از آب
  // دراومد، کاربر می‌تونه فقط همون یکی رو (بدون دست‌زدن به بقیه‌ی داستان)
  // دوباره ترجمه کنه.
  // 🐛 اصلاحِ باگ: قبلاً این دکمه از همون translateFree معمولی (با
  // forceVerify=true) استفاده می‌کرد — یعنی اولش کشِ IndexedDB رو چک
  // می‌کرد، و چون خودِ همون ترجمه‌ی غلط از قبل توی کش نشسته بود (کاربر
  // داره دقیقاً به‌خاطرِ همین ترجمه‌ی غلط رفرش می‌زنه!)، اگه heuristic
  // (looksLikelyMistranslated) اون رو «مشکوک» تشخیص نمی‌داد، دقیقاً همون
  // ترجمه‌ی غلط بدونِ هیچ درخواستِ تازه‌ای دوباره برمی‌گشت — انگار دکمه
  // اصلاً کاری نکرده. زدنِ دکمه‌ی رفرش خودش یعنی «این ترجمه مشکل داره»،
  // پس دیگه نیازی به حدسِ heuristic نیست: مستقیم می‌ریم سراغِ بک‌اندِ AI
  // (بدونِ چک‌کردنِ کش، بدونِ صف‌ایستادنِ پشتِ سرویس‌های رایگان). فقط اگه
  // AI در دسترس نبود (تنظیم نشده یا شبکه قطع بود)، به‌عنوانِ آخرین چاره
  // مستقیم سراغِ شبکه‌ی سرویس‌های رایگان می‌ریم (نه از کش، چون همون کش
  // مشکل‌داره).
  async function retranslateOneSentenceText(text, code) {
    try {
      return await translateViaAI(text || "", code, storyLang, aiSettings);
    } catch {
      return await translateFreeNetwork(text || "", code, storyLang, aiSettings, true);
    }
  }
  const retranslateStoryParagraph = createRetranslateStoryParagraph({
    paragraphs,
    retranslateOneSentenceText,
    setParagraphs,
    setRetranslatingSentences,
    storyLang,
  });
  const retranslateStorySentence = createRetranslateStorySentence({
    retranslateOneSentenceText,
    setParagraphs,
    setRetranslatingSentences,
    storyLang,
  });
  const [visibleParagraphCount, setVisibleParagraphCount] = useState(PARAGRAPH_PAGE_SIZE);
  // شناسه‌ی داستانِ ذخیره‌شده‌ای که همین الان روی صفحه‌ست (اگه از «داستان‌های
  // ذخیره‌شده» باز شده باشه یا تازه ذخیره شده باشه)؛ برای داستانِ تازه‌ساخته‌
  // شده‌ای که هنوز ذخیره نشده، null می‌مونه. با هر لغتی که از وسطِ همین
  // داستان (با پاپ‌آپِ لغت) ذخیره می‌شه، همین شناسه (به‌همراهِ شماره‌ی
  // پاراگراف/جمله) به‌عنوانِ origin ذخیره می‌شه — تا لانگ‌پرس روی اون لغت
  // توی «لغات ذخیره‌شده» بتونه دقیقاً به همین داستان و همین سطر برگرده.
  const [currentStoryId, setCurrentStoryId] = useState(null);
  // جمله‌ای که همین الان (به‌خاطرِ اومدن از یه لانگ‌پرسِ «لغات ذخیره‌شده»)
  // باید چند لحظه هایلایت بشه تا کاربر بلافاصله بفهمه دقیقاً کدوم سطره —
  // خودش به‌تنهایی باعثِ اسکرول نمی‌شه، فقط یه هایلایتِ موقته.
  const [highlightSentence, setHighlightSentence] = useState(null); // {pi, si} | null
  // موقعیتی که باید بهش اسکرول کنیم ولی هنوز DOMـش آماده نیست (مثلاً چون
  // تازه داریم یه داستانِ ذخیره‌شده‌ی دیگه رو باز می‌کنیم و پاراگراف‌هاش
  // هنوز رندر نشدن). یه useLayoutEffectِ بدونِ وابستگی (پایین‌تر) هر بار بعد
  // از هر رندر چک می‌کنه که آیا نودِ موردنظر حالا در دسترسه یا نه.
  const pendingScrollRef = useRef(null); // {pi, si} | null
  // جستجوی آزاد داخلِ متنِ داستان — کاربر می‌تونه با هر زبانی تایپ کنه؛ روی
  // متنِ اصلیِ هر جمله و روی همه‌ی ترجمه‌هاش (هر زبانی که فعاله) چک می‌شه.
  // فقط برای پیداکردن و پریدن به جمله‌ی موردنظره، لیستِ داستان رو فیلتر
  // نمی‌کنه (که شماره‌ی پاراگراف/جمله‌ها به‌هم نریزه).
  const [storySearchQuery, setStorySearchQuery] = useState("");
  // یه شمارنده‌ی ساده که با هر بار زدنِ رویِ یه نتیجه‌ی جستجو یکی زیاد می‌شه،
  // فقط برای این‌که کامپوننت مطمئناً یه رندرِ تازه بزنه و useLayoutEffectِ
  // اسکرول (پایین‌تر، بر اساسِ pendingScrollRef) بعدش اجرا بشه — حتی اگه
  // granularity/visibleParagraphCount قبلاً همون مقدار بودن.
  const [searchJumpSeq, setSearchJumpSeq] = useState(0);
  const [translationLangs, setTranslationLangs] = useState(
    Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter((c) => c !== defaultStoryLang)
  );
  // داستان‌ساز هیچ‌وقت unmount نمی‌شه (کامنتِ بالای <StoryBuilder/> رو ببین)،
  // پس useState بالا فقط یه بار — همون اولین لودِ اپ — nativeLang رو می‌گیره.
  // اگه کاربر بعداً از تنظیمات زبان مادری رو عوض کنه (مثلاً fa -> de)،
  // چیزی translationLangs رو آپدیت نمی‌کرد و ترجمه‌ها همیشه با همون زبونِ
  // اولیه (که ممکنه دیگه اصلاً nativeLang فعلی نباشه) نشون داده می‌شدن. دقیقاً
  // همون باگی که برای storyLang قبلاً فیکس شده بود (افکتِ چند خط بالاتر)،
  // اینجا هم لازم بود: هر بار nativeLang واقعاً عوض بشه، زبونِ قبلی رو از
  // لیست درمیاریم و زبونِ جدید رو جایگزینش می‌کنیم.
  const prevNativeLangRef = useRef(nativeLang);
  useEffect(() => {
    const prevNativeLang = prevNativeLangRef.current;
    prevNativeLangRef.current = nativeLang;
    if (!nativeLang || prevNativeLang === nativeLang) return;
    setTranslationLangs((prev) => {
      const withoutOld = prev.includes(prevNativeLang) ? prev.filter((c) => c !== prevNativeLang) : prev;
      if (nativeLang === storyLang || withoutOld.includes(nativeLang)) return withoutOld;
      return [...withoutOld, nativeLang];
    });
  }, [nativeLang, storyLang]);
  const [granularity, setGranularity] = useState("sentence"); // "sentence" | "paragraph" | "none"
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  // اگه بعد از همه‌ی ریترای‌ها بازم تعداد تکرارِ بعضی لغات دقیقاً برابر
  // repeatCount نشد، این پیام (غیر-بلاک‌کننده — داستان بازم نمایش داده
  // می‌شه) به کاربر می‌گه کدوم لغت چند بار واقعاً استفاده شده.
  const [repeatNotice, setRepeatNotice] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  // 📺 زیرنویس‌های ذخیره‌شده از حبابِ یوتیوب (فقط اندروید): حباب تو یه صفِ بومی می‌نویسه، اینجا وارد
  // «داستان‌های ذخیره‌شده» می‌شه. ذخیره‌ی دوباره‌ی همون ویدیو، خط‌ها رو ادغام می‌کنه (نه کپیِ تکراری).
  const ytImportBusyRef = useRef(false);
  const importYtSaved = useImportYtSaved({
    setSavedStories,
    ytImportBusyRef,
  });
  useEffect(() => {
    importYtSaved();
    const onVis = () => { if (!document.hidden) importYtSaved(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [importYtSaved]);
  useEffect(() => { if (showSaved) importYtSaved(); }, [showSaved, importYtSaved]);
  // 🧹 ذخیره‌های قدیمیِ یوتیوب/ترجمه‌ی زنده ممکنه متنِ زیرنویس داشته باشن؛ فقط لینک/منبع می‌مونه.
  useEffect(() => {
    if (!showSaved) return;
    setSavedStories((prev) => (prev.some((x) => x && x.ytSession && x.ytLines && x.ytLines.length)
      ? prev.map((x) => (x && x.ytSession && x.ytLines && x.ytLines.length ? { ...x, ytLines: [] } : x))
      : prev));
  }, [showSaved, setSavedStories]);
  // فیلترِ سطح برای لیستِ «داستان‌های ذخیره‌شده» — دقیقاً همون الگوی
  // LevelFilterRow که بقیه‌ی تب‌ها (واژگان، عبارت‌ها و ...) دارن؛ هر داستان
  // از قبل با سطحِ خودش (storyLevel) ذخیره می‌شه، این فیلتر فقط برای پیداکردن
  // و ساماندهیِ راحت‌ترِ همون داستان‌های ازقبل‌ذخیره‌شده‌ست.
  const [savedStoriesLevelFilter, setSavedStoriesLevelFilter] = useState("all");
  // جستجو در لیستِ «داستان‌های ذخیره‌شده» — روی متنِ خودِ داستان، لغاتِ
  // انتخاب‌شده، و عنوانِ PDF (برای کارت‌های PDF) چک می‌شه؛ زبانِ داستان
  // اصلاً مهم نیست — چون فقط includeِ سادهٔ رشته‌ست، هر زبان/اسکریپتی
  // (فارسی، انگلیسی، عربی، هرچی) بدونِ هیچ فرقی جستجو می‌شه.
  const [savedStoriesSearch, setSavedStoriesSearch] = useState("");
  // مرتب‌سازیِ لیستِ «داستان‌های ذخیره‌شده» — گزینه‌ها دقیقاً مثلِ منوی
  // Sort byِ سیستم (جدیدترین/قدیمی‌ترین تاریخ، نام A→Z/Z→A، و تعدادِ
  // کلمات کم/زیاد به‌جای اندازه‌ی فایل).
  const [savedStoriesSort, setSavedStoriesSort] = useState("newest");
  const [savedStoryReadIds, setSavedStoryReadIds] = useState(() => loadReadWordIds(STORY_LIST_ID));
  const toggleSavedStoryRead = (id) => {
    setSavedStoryReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(STORY_LIST_ID, next);
      return next;
    });
  };
  const markStoryRangeRead = (items, read) => {
    setSavedStoryReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((s) => {
        if (read) next.add(s.id);
        else next.delete(s.id);
      });
      saveReadWordIds(STORY_LIST_ID, next);
      return next;
    });
  };
  const [savedStoryRangeInput, setSavedStoryRangeInput] = useState({ from: "", to: "" });
  // ✏️ ویرایشِ عنوانِ دلخواهِ یه داستانِ ذخیره‌شده — فقط یه کارت هم‌زمان
  // می‌تونه تویِ حالتِ ویرایشِ عنوان باشه.
  const [renamingStoryId, setRenamingStoryId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const startRenamingStory = (s) => {
    setRenamingStoryId(s.id);
    setRenameDraft(s.title || "");
  };
  const commitRenamingStory = (id) => {
    renameSavedStory(id, renameDraft);
    setRenamingStoryId(null);
    setRenameDraft("");
  };

  // نقشه‌ی id-ِ داستانِ ذخیره‌شده → آیا صوتِ آپلودیِ کاربر داره یا نه؛ فقط
  // برای نشون‌دادنِ آیکونِ 🎵 کنارِ کارتِ داستان‌های ذخیره‌شده استفاده می‌شه.
  // چون صوت با کلیدِ متن (نه idِ داستان) توی IndexedDB ذخیره می‌شه، اینجا
  // برای هر داستان همون کلید رو از روی متنش می‌سازیم و وجودش رو چک می‌کنیم.
  const [savedStoriesAudioMap, setSavedStoriesAudioMap] = useState({});
  useEffect(() => {
    if (!showSaved || !savedStories.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        savedStories.map(async (s) => {
          const key = getStoryEntryAudioKey(s);
          if (!key) return [s.id, false];
          const rec = await getStoryAudioRecord(key);
          return [s.id, !!rec];
        })
      );
      if (cancelled) return;
      const map = {};
      entries.forEach(([id, has]) => { map[id] = has; });
      setSavedStoriesAudioMap(map);
    })();
    return () => { cancelled = true; };
  }, [showSaved, savedStories]);
  // نکته: قبلاً یه state جدا به‌اسمِ justSaved بود که فقط ۱.۸ ثانیه بعدِ
  // سیو، تیک نشون می‌داد و بعدش خودش برمی‌گشت به حالتِ اولیه — کاربر گیج
  // می‌شد که آیا واقعاً ذخیره شده یا نه. حالا به‌جاش مستقیم از
  // currentStoryId استفاده می‌کنیم (پایین‌تر، دکمه‌ی ذخیره): تا وقتی همین
  // داستان ذخیره‌شده باز مونده، تیک همیشه می‌مونه؛ فقط با ساختن/بازکردنِ
  // یه داستانِ دیگه (currentStoryId => null/idِ دیگه) عوض می‌شه.
  // لغاتِ ذخیره‌شده‌ی همین زبان — به‌شکلِ چیپ‌های کوچیکِ قابل‌تپ همین‌جا هم
  // نشون داده می‌شن (نه فقط توی تبِ «لغات ذخیره‌شده») تا کاربر لازم نباشه
  // برای استفاده‌ی دوباره از یه لغتِ قبلاً ذخیره‌شده، تب عوض کنه.
  const [savedWordsForLang, setSavedWordsForLang] = useState([]);
  useEffect(() => {
    const refresh = () => setSavedWordsForLang(loadSavedStoryWords().filter((e) => e.langCode === storyLang));
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [storyLang]);

  // وقتی از پاپ‌آپِ لغت (وسطِ خوندنِ یه داستان یا هر جای دیگه‌ی برنامه)
  // «ذخیره برای داستان بعدی» زده می‌شه، اگه زبانِ همون لغت با زبانِ
  // داستانِ فعلی یکی باشه، مستقیم به لیستِ لغاتِ انتخاب‌شده (پیش از
  // تولید/ترجمه‌ی داستان) هم اضافه‌ش می‌کنیم — نه فقط انبار دائمی.
  useEffect(() => {
    function handlePicked(e) {
      const { word, langCode } = (e && e.detail) || {};
      if (!word || langCode !== storyLang) return;
      setSelectedWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
    }
    window.addEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
    return () => window.removeEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
  }, [storyLang]);

  const storyLangLabel = LANGUAGES.find((l) => l.code === storyLang)?.label || storyLang;
  // ⚠️ این خط رو همیشه با گارد (|| []) نگه دار — این کامپوننت با
  // display:none حتی وقتی تب «داستان‌ساز» فعال نیست هم mount می‌مونه، پس
  // اگه یه داستانِ ذخیره‌شده‌ی قدیمی/ناقص (بدون paragraph.sentences) باز
  // بشه و اینجا کرش کنه، کل اپ (نه فقط این تب) قفل می‌شه.
  // هر جمله رو با شماره‌ی پاراگراف/جمله‌ش (pi/si) نگه می‌داریم — هم برای
  // ساختنِ متنِ کامل، هم برای اینکه بعداً بتونیم بفهمیم موقع پخشِ «کل متن»
  // از روی پلیر، الان دقیقاً کدوم جمله داره خونده می‌شه (برای هایلایت/اسکرول).
  // 🐛 قبلاً این با flatMap ساده بود (بدونِ useMemo) — یعنی یه آرایه‌ی
  // کاملاً تازه (رفرنسِ جدید) با هر رندرِ این کامپوننت ساخته می‌شد، حتی
  // وقتی خودِ متنِ داستان اصلاً عوض نشده بود (مثلاً فقط چون activeStorySentence
  // موقعِ پخش تیک می‌خورد). این رفرنسِ همیشه-تازه به‌صورتِ زنجیره‌ای به
  // fullTranslatedTextByLang/translatedSentenceOffsetsByLang هم می‌رسید (چون
  // وابسته به allSentences بودن) و باعث می‌شد افکتِ ردیابیِ activeTranslation
  // (که به همینا وابسته‌ست) با هر رندر — نه فقط وقتی واقعاً چیزی عوض شده —
  // از speechController دوباره subscribe/unsubscribe کنه. همین
  // subscribe/unsubscribeِ مکرر دقیقاً همون چیزیه که هایلایتِ ترجمه رو
  // ناپایدار می‌کرد (یه لحظه هایلایت می‌شد، بعد به‌خاطرِ یه رساب‌سکرایبِ
  // میونی گم می‌شد). با useMemo، allSentences فقط وقتی paragraphs واقعاً
  // عوض بشه بازسازی می‌شه، نه با هر رندر.
  const allSentences = useMemo(
    () => paragraphs.flatMap((p, pi) => (p.sentences || []).map((s, si) => ({ ...s, _pi: pi, _si: si }))),
    [paragraphs]
  );
  const fullStoryText = allSentences.map((s) => s?.text || "").join(" ");

  // آفستِ کاراکتریِ شروعِ هر جمله داخلِ fullStoryText — دقیقاً باید با نحوه‌ی
  // ساختنِ fullStoryText بالا (join با یک فاصله) هماهنگ باشه.
  const sentenceOffsets = useMemo(() => {
    let offset = 0;
    return allSentences.map((s, idx) => {
      const start = offset;
      const text = s?.text || "";
      offset += text.length;
      if (idx < allSentences.length - 1) offset += 1; // فاصله‌ی join(" ")
      return { pi: s._pi, si: s._si, start, end: start + text.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullStoryText]);

  // نسخه‌ی نگاشت‌شده‌ی sentenceOffsets (با کلیدِ pi-si) و آفستِ شروعِ هر
  // پاراگراف (اولین جمله‌ش) — هر دو برای اینه که موقعِ کلیک‌کردن روی یه
  // کلمه/عبارت (در ClickableSentence)، بشه فهمید همون کلمه دقیقاً کجای
  // fullStoryText افتاده و «نقطه‌ی ادامه»ی پخشِ کل متن رو بر اساسش به‌خاطر
  // سپرد.
  const sentenceOffsetMap = useMemo(() => {
    const map = {};
    sentenceOffsets.forEach((s) => {
      map[`${s.pi}-${s.si}`] = s;
    });
    return map;
  }, [sentenceOffsets]);
  const paragraphBaseOffsetMap = useMemo(() => {
    const map = {};
    sentenceOffsets.forEach((s) => {
      if (!(s.pi in map)) map[s.pi] = s.start;
    });
    return map;
  }, [sentenceOffsets]);
  // فقط آفستِ شروعِ هر جمله (بدونِ pi/si) — دقیقاً چیزی که speechController
  // برای splitSentences(text, sentenceBoundaries) لازم داره تا هیچ‌وقت دو
  // جمله‌ی UI رو با هم ادغام نکنه (توضیحِ کامل، بالای splitSentences).
  const storySentenceBoundaries = useMemo(() => sentenceOffsets.map((s) => s.start), [sentenceOffsets]);
  // نسخه‌ی «ترجمه‌شده»ی fullStoryText/sentenceOffsets — برای هر زبانِ
  // ترجمه‌ای که فعلاً نمایش داده می‌شه (translationLangs)، متنِ کاملِ همون
  // ترجمه (به همون ترتیبِ جمله‌ها، با join(" ") دقیقاً مثلِ متنِ اصلی) و
  // آفستِ شروعِ هر جمله‌ش رو می‌سازیم — تا دکمه‌ی 🔊ِ روی هر ترجمه هم بتونه
  // (دقیقاً مثلِ متنِ اصلی) کلِ ترجمه رو با هایلایت/اسکرولِ خودکار و رفتنِ
  // خودکار به جمله‌ی بعد بخونه، نه فقط همون یک جمله رو.
  //
  // 🐛 قبلاً این با allSentences.every(...) ساخته می‌شد — یعنی اگه حتی یه
  // جمله‌یِ تنها (تویِ کلِ داستان، حتی وسط یه پاراگرافِ دورتر که کاربر هنوز
  // ندیده) هنوز ترجمه نشده بود، fullTranslatedTextByLang[code] کلاً
  // undefined می‌موند. با undefined بودنش، افکتِ activeTranslation
  // (پایین‌تر) اون زبون رو کاملاً نادیده می‌گرفت — یعنی هایلایت/اسکرولِ
  // خودکار برایِ *همه‌یِ* ترجمه‌های همون زبون از کار می‌افتاد، حتی برایِ
  // جمله‌هایی که کاملاً ترجمه‌شده و رویِ صفحه هم دیده می‌شدن. این دقیقاً
  // همون چیزیه که تویِ داستان‌های بلند/ذخیره‌شده (که پاراگراف‌بندی و
  // ترجمه‌شون تدریجیه) بروز می‌کرد، در حالی که تویِ عبارت‌ها/لغت‌ها (که هر
  // آیتم مستقل و همیشه کامل ترجمه می‌شه) هیچ‌وقت دیده نمی‌شد. الان به‌جایِ
  // «همه یا هیچ»، فقط از جمله‌هایی که واقعاً ترجمه دارن متنِ پیوسته ساخته
  // می‌شه — جمله‌های هنوز-ترجمه‌نشده به‌سادگی از این متنِ پیوسته/آفست‌ها کنار
  // گذاشته می‌شن (نه این‌که کلِ زبون رو خراب کنن)، و به‌محضِ ترجمه‌شدنشون
  // (که allSentences دوباره رندر می‌شه)، خودکار به همین متنِ پیوسته اضافه
  // می‌شن.
  const fullTranslatedTextByLang = useMemo(() => {
    const map = {};
    (translationLangs || []).forEach((code) => {
      const translatedOnly = allSentences.filter((s) => s?.t?.[code]);
      if (translatedOnly.length) {
        map[code] = translatedOnly.map((s) => s.t[code]).join(" ");
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSentences, translationLangs.join(",")]);

  const translatedSentenceOffsetsByLang = useMemo(() => {
    const map = {};
    Object.keys(fullTranslatedTextByLang).forEach((code) => {
      let offset = 0;
      const translatedOnly = allSentences.filter((s) => s?.t?.[code]);
      map[code] = translatedOnly.map((s, idx) => {
        const t = s?.t?.[code] || "";
        const start = offset;
        offset += t.length;
        if (idx < translatedOnly.length - 1) offset += 1; // فاصله‌ی join(" ")
        return { pi: s._pi, si: s._si, start, end: start + t.length };
      });
    });
    return map;
  }, [fullTranslatedTextByLang, allSentences]);

  // همون منطقِ storySentenceBoundaries بالا، ولی برای هر زبانِ ترجمه —
  // جدا نگه‌داشته می‌شه چون آفست‌های هر ترجمه (طولِ متنِ ترجمه‌شده فرق داره)
  // مستقل از متنِ اصلی‌ان.
  const translatedSentenceBoundariesByLang = useMemo(() => {
    const map = {};
    Object.keys(translatedSentenceOffsetsByLang).forEach((code) => {
      map[code] = translatedSentenceOffsetsByLang[code].map((s) => s.start);
    });
    return map;
  }, [translatedSentenceOffsetsByLang]);

  const translatedSentenceOffsetMapByLang = useMemo(() => {
    const map = {};
    Object.keys(translatedSentenceOffsetsByLang).forEach((code) => {
      const inner = {};
      translatedSentenceOffsetsByLang[code].forEach((s) => {
        inner[`${s.pi}-${s.si}`] = s;
      });
      map[code] = inner;
    });
    return map;
  }, [translatedSentenceOffsetsByLang]);

  const translatedParagraphBaseOffsetMapByLang = useMemo(() => {
    const map = {};
    Object.keys(translatedSentenceOffsetsByLang).forEach((code) => {
      const inner = {};
      translatedSentenceOffsetsByLang[code].forEach((s) => {
        if (!(s.pi in inner)) inner[s.pi] = s.start;
      });
      map[code] = inner;
    });
    return map;
  }, [translatedSentenceOffsetsByLang]);

  const mainStoryKey = fullStoryText ? `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}` : null;
  // صوتِ خودِ کاربر برای همین داستان (اگه آپلود/علامت‌گذاری شده باشه) —
  // کاملاً مستقل از speechController/TTS، فقط با mainStoryKey به داستان
  // فعلی وصل می‌شه. playbackMode مشخص می‌کنه پلیر الان کدوم منبع رو نشون
  // می‌ده: "tts" (پیش‌فرض، همون سیستمِ قبلی) یا "user" (فایلِ صوتیِ کاربر).
  const userAudio = useStoryUserAudio(mainStoryKey, allSentences);
  const [playbackMode, setPlaybackMode] = useState("tts"); // "tts" | "user"
  useEffect(() => {
    // اگه داستان عوض شد و صوتِ کاربر نداشت، خودکار برگرد به TTS
    if (playbackMode === "user" && !userAudio.hasAudio) setPlaybackMode("tts");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainStoryKey, userAudio.hasAudio]);

  // 🧬 مسیرِ عصبی برایِ صوتِ آپلودیِ کاربر: برخلافِ TTS (که با تغییرِ
  // chunkIndex داخلِ SpeakButton خودکار رشته می‌سازه)، اینجا manualIndex/
  // activeSentence فقط با اقدامِ صریحِ کاربر عوض می‌شه (دکمه‌ی جمله‌ی
  // بعد/قبل، تپِ مستقیم روی جمله، دکمه‌ی پخشِ مرکزی که چیزی رو جابه‌جا
  // نمی‌کنه). قبلاً هیچ‌کدومِ این مسیرها recordNeuralRepeat/addNeuralFiber
  // رو صدا نمی‌زدن — پس با گوش‌دادن از دکمه‌ی مرکزی/جمله‌ی بعد، هیچ رشته‌ای
  // ساخته نمی‌شد. حالا با هر تغییرِ activeSentence، وقتی واقعاً در حالِ
  // پخشیم و پلیر رویِ «صوتِ من» ایستاده، یه رشته برای همون جمله می‌سازیم.
  const userAudioNeuralRef = useRef({ key: null });
  useEffect(() => {
    if (playbackMode !== "user") return;
    if (!userAudio.isPlaying) return;
    const as = userAudio.activeSentence;
    if (!as) return;
    const s = paragraphs[as.pi]?.sentences?.[as.si];
    if (!s || !s.text) return;
    const neuralId = `story:${storyLang}::${s.text}`;
    const fireKey = `${neuralId}#${as.pi}#${as.si}`;
    if (userAudioNeuralRef.current.key === fireKey) return;
    userAudioNeuralRef.current.key = fireKey;
    recordNeuralRepeat(neuralId, { source: "player" });
    addNeuralFiber(neuralId);
  }, [playbackMode, userAudio.isPlaying, userAudio.activeSentence, paragraphs, storyLang]);

  // 🧬 مسیرِ عصبیِ خودکار حینِ پخشِ صوتِ آپلودی: اثرِ بالا فقط با
  // جابه‌جاییِ دستیِ manualIndex/activeSentence فایر می‌شه (دکمه‌ی جمله‌ی
  // بعد/تپِ روی جمله)؛ ولی وقتی کاربر فقط می‌ذاره فایل از اول تا آخر خودش
  // پخش بشه (بدونِ هیچ تپ/دکمه‌ای)، activeSentence اصلاً عوض نمی‌شه — چون
  // آپدیتِ خودکارِ هایلایت قبلاً عمداً حذف شده (نگاه کن به توضیحِ بالایِ
  // useStoryUserAudio). نتیجه این بود که برایِ همچین گوشِ‌دادنِ ساده‌ای هیچ
  // رشته‌ی عصبی‌ای ساخته نمی‌شد. این افکتِ جدید کاملاً مستقل از سیستمِ
  // هایلایت/manualIndex عمل می‌کنه — هیچ stateِ UI/هایلایتی رو عوض نمی‌کنه،
  // فقط از رویِ نسبتِ currentTime/duration (دقیقاً همون تخمینِ نسبی‌ای که
  // jumpToLineInUserAudio برعکسش رو حساب می‌کنه: offset/fullStoryText.length
  // ⇄ ratio*duration) حدس می‌زنه پخش الان رویِ کدوم جمله است، و با هر عبورِ
  // واقعی به جمله‌یِ بعدی (نه با هر تیکِ زمان) یه رشته براش می‌سازه.
  const userAudioAutoNeuralRef = useRef({ key: null, storyKey: null });
  useEffect(() => {
    if (playbackMode !== "user") return;
    if (!userAudio.isPlaying) return;
    if (!fullStoryText || !userAudio.duration) return;
    if (userAudioAutoNeuralRef.current.storyKey !== mainStoryKey) {
      userAudioAutoNeuralRef.current = { key: null, storyKey: mainStoryKey };
    }
    const ratio = userAudio.currentTime / userAudio.duration;
    const charPos = ratio * fullStoryText.length;
    const hit = sentenceOffsets.find((s) => charPos >= s.start && charPos < s.end);
    if (!hit) return;
    const s = paragraphs[hit.pi]?.sentences?.[hit.si];
    if (!s || !s.text) return;
    const neuralId = `story:${storyLang}::${s.text}`;
    const fireKey = `${neuralId}#${hit.pi}#${hit.si}`;
    if (userAudioAutoNeuralRef.current.key === fireKey) return;
    userAudioAutoNeuralRef.current.key = fireKey;
    recordNeuralRepeat(neuralId, { source: "player" });
    addNeuralFiber(neuralId);
  }, [playbackMode, userAudio.isPlaying, userAudio.currentTime, userAudio.duration, fullStoryText, sentenceOffsets, paragraphs, storyLang, mainStoryKey]);

  // پُلِ سراسری برای GlobalAddToStorySelection (نگاه کن به توضیحِ کاملِ
  // activeUserAudioFocusPause بالایِ فایل): فقط وقتی پلیر واقعاً رویِ
  // «صوتِ من» است و فایلی هم آپلود شده، تابعِ pauseForFocus رو در دسترسِ
  // پاپ‌آپِ سراسری می‌ذاریم؛ وگرنه (حالتِ TTS، یا بدونِ صوتِ آپلودی) چیزی
  // برای مکث‌کردن نیست و همین متغیر باید null بمونه.
  useEffect(() => {
    bridge.activeUserAudioFocusPause = playbackMode === "user" && userAudio.hasAudio ? userAudio.pauseForFocus : null;
    bridge.activeUserAudioPause = playbackMode === "user" && userAudio.hasAudio ? userAudio.pause : null;
    bridge.activeUserAudioPlay = playbackMode === "user" && userAudio.hasAudio ? userAudio.play : null;
    return () => {
      bridge.activeUserAudioFocusPause = null;
      bridge.activeUserAudioPause = null;
      bridge.activeUserAudioPlay = null;
    };
  }, [playbackMode, userAudio.hasAudio, userAudio.pauseForFocus, userAudio.pause, userAudio.play]);
  // وقتی از پاپ‌آپِ کلمه یا محدوده‌ی انتخابی، دکمه‌ی پخش زده می‌شه، همین‌جا
  // موقعیت (نسبت به کلِ fullStoryText) به‌خاطر سپرده می‌شه — تا دفعه‌ی بعد
  // که دکمه‌ی «پخشِ کل متن» روی نوارِ پلیر زده بشه، از همون‌جا (نه از اول)
  // ادامه پیدا کنه.
  function reportStoryWordSpoken(baseOffset, localEnd) {
    if (!mainStoryKey) return;
    rememberMainTextResumeOffset(mainStoryKey, (baseOffset || 0) + (localEnd || 0));
  }

  // یادداشتِ آزادِ همین داستان — با mainStoryKey مشخص می‌شه دقیقاً کدوم
  // داستانه، پس با بازکردنِ داستانِ دیگه، یادداشتِ همون داستانِ دیگه نشون
  // داده می‌شه.
  const [storyNote, setStoryNote] = useStoryNote(mainStoryKey);

  // نتیجه‌های جستجوی آزادِ داخلِ متنِ داستان — روی متنِ اصلیِ هر جمله و
  // ترجمه‌های فعالش چک می‌شه؛ حداکثر ۳۰ نتیجه (برای سبک‌موندنِ رابط) نشون
  // داده می‌شه.
  const storySearchMatches = useMemo(() => {
    const q = storySearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    for (let pi = 0; pi < paragraphs.length; pi++) {
      const sentences = paragraphs[pi]?.sentences || [];
      for (let si = 0; si < sentences.length; si++) {
        const s = sentences[si];
        if (!s) continue;
        const original = (s.text || "").toLowerCase();
        const translated = translationLangs
          .map((code) => s.t?.[code] || "")
          .join(" ")
          .toLowerCase();
        if (original.includes(q) || translated.includes(q)) {
          results.push({ pi, si, text: s.text || "" });
          if (results.length >= 30) return results;
        }
      }
    }
    return results;
  }, [storySearchQuery, paragraphs, translationLangs]);

  // پریدن به یه نتیجه‌ی جستجو — همون مکانیزمِ pendingScrollRef/highlightSentence
  // که برای لانگ‌پرسِ لغاتِ ذخیره‌شده استفاده می‌شه؛ اگه پاراگرافش هنوز نمایش
  // داده نشده، visibleParagraphCount رو هم جلو می‌بره. در حالتِ TTS، خودِ
  // خواندن هم از همون جمله ادامه/شروع می‌شه. در حالتِ صوتِ آپلودیِ کاربر
  // فقط اسکرول+هایلایت انجام می‌شه، بدونِ seek/play — چون تخمینِ نسبیِ
  // آفستِ کاراکتری برای پریدنِ مستقیم از نتیجه‌ی جستجو (که معمولاً خیلی
  // دورتر از نقطه‌ی فعلیِ پخشه) خیلی وقت‌ها به ثانیه‌ی کاملاً اشتباه
  // می‌رفت؛ کاربر ترجیح داد فقط به همون خط برده بشه و خودش تصمیم بگیره از
  // کجا گوش بده.
  function jumpToStorySearchMatch(pi, si) {
    setGranularity("sentence");
    setVisibleParagraphCount((n) => (pi >= n ? pi + 1 : n));
    pendingScrollRef.current = { pi, si };
    setSearchJumpSeq((n) => n + 1);

    const offset = sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0;

    if (playbackMode === "user" && userAudio.hasAudio) {
      userAudio.setActiveLine(pi, si);
      return;
    }

    // حالتِ TTS: اگه همین متن همین الان (پخش‌شده یا مکث‌شده) لود شده،
    // seekToChunk می‌زنیم تا دقیقاً از همین جمله ادامه بده (بدونِ توگل‌کردنِ
    // پاز/پخش)؛ وگرنه از صفر، یه سشنِ تازه‌ی «خواندنِ کل متن» رو از همین
    // آفست شروع می‌کنیم.
    if (!fullStoryText) return;
    const st = speechController.getState();
    if (st.key === mainStoryKey && st.status !== "idle") {
      const meta = speechController.getChunksMeta();
      let idx = 0;
      for (let i = 0; i < meta.length; i++) {
        if (offset >= meta[i].start) idx = i;
        else break;
      }
      speechController.seekToChunk(idx);
    } else {
      speechController.toggle(fullStoryText, storyLang, offset, { loop: true, sentenceBoundaries: storySentenceBoundaries });
    }
  }

  // پرش به یه جمله/پاراگرافِ مشخص در صوتِ آپلودیِ کاربر — از تپِ مستقیمِ
  // کاربر روی خودِ آیکونِ پخشِ کنارِ یه جمله/پاراگراف صدا زده می‌شه. با
  // تخمینِ نسبیِ آفستِ کاراکتری seek می‌کنه (سیستمِ سینکِ دقیق‌تر حذف شد
  // چون قابلِ‌اعتماد نبود)؛ هایلایت هم فوراً با setActiveLine به همون‌جا
  // می‌ره — نه اینکه صبر کنه دکمه‌ی جمله‌ی بعد/قبل زده بشه.
  function jumpToLineInUserAudio(pi, si, offset) {
    if (!userAudio.hasAudio) return;
    const ratio = fullStoryText.length ? (offset || 0) / fullStoryText.length : 0;
    const target = ratio * (userAudio.duration || 0);
    userAudio.setActiveLine(pi, si);
    userAudio.seek(target);
    userAudio.play();
  }

  // جمله‌ای که همین الان، در حینِ پخشِ «کل متن» از روی پلیر، داره خونده
  // می‌شه — هم برای هایلایتِ بصریِ زنده (متنِ اصلی + همه‌ی ترجمه‌هاش، چون
  // هر دو داخلِ همون باکسِ jsهایلایت‌شونده‌ان) و هم برای اسکرولِ خودکار
  // استفاده می‌شه. وقتی پخشِ فعلی چیز دیگه‌ای غیر از کلِ داستانه (مثلاً
  // کاربر خودش رو یک جمله‌ی خاص زده)، این null می‌مونه.
  const [activeStorySentence, setActiveStorySentence] = useState(null); // {pi, si} | null
  useEffect(() => {
    const myKey = `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}`;
    const update = (state) => {
      if (!fullStoryText || state.key !== myKey || state.status === "idle") {
        setActiveStorySentence(null);
        return;
      }
      const offset = speechController.getCharOffset();
      let found = sentenceOffsets[0] || null;
      for (const s of sentenceOffsets) {
        if (offset >= s.start) found = s;
        else break;
      }
      setActiveStorySentence((prev) => {
        const next = found ? { pi: found.pi, si: found.si } : null;
        if (prev && next && prev.pi === next.pi && prev.si === next.si) return prev;
        return next;
      });
    };
    update(speechController.getState());
    // دیگه نیازی به polling نیست — chunkIndex دقیقاً همون لحظه‌ای که جمله‌ی
    // بعدی شروع می‌شه آپدیت می‌شه (نه با تخمین)، پس subscribe به‌تنهایی کافیه.
    return speechController.subscribe(update);
  }, [fullStoryText, storyLang, sentenceOffsets]);

  // دقیقاً همون مکانیزمِ activeStorySentence بالا، ولی برای «پخشِ کلِ یه
  // ترجمه» — وقتی کاربر روی 🔊ِ کنارِ یه ترجمه می‌زنه، حالا (به‌جای فقط
  // همون یک جمله) کلِ ترجمه‌ی همون زبان از همونجا تا آخر خونده می‌شه؛ این
  // افکت هر بار که speechController آپدیت می‌شه چک می‌کنه که آیا کلیدِ
  // فعلیِ پخش، دقیقاً مطابقِ یکی از fullTranslatedTextByLang هاست یا نه، و
  // اگه بود pi/si/code اون جمله رو نگه می‌داره — هم برای هایلایت، هم برای
  // اسکرولِ خودکار.
  const [activeTranslation, setActiveTranslation] = useState(null); // {code, pi, si} | null
  const translationLangsKey = (translationLangs || []).join(",");
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveTranslation(null);
        return;
      }
      for (const code of translationLangs || []) {
        const text = fullTranslatedTextByLang[code];
        if (!text) continue;
        const myKey = `${TTS_LOCALE[code] || "en-US"}::${text}`;
        if (state.key === myKey) {
          const offset = speechController.getCharOffset();
          const offs = translatedSentenceOffsetsByLang[code] || [];
          let found = offs[0] || null;
          for (const s of offs) {
            if (offset >= s.start) found = s;
            else break;
          }
          setActiveTranslation((prev) => {
            const next = found ? { code, pi: found.pi, si: found.si } : null;
            if (prev && next && prev.code === next.code && prev.pi === next.pi && prev.si === next.si) return prev;
            return next;
          });
          return;
        }
      }
      setActiveTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationLangsKey, fullTranslatedTextByLang, translatedSentenceOffsetsByLang]);

  // موقع پخشِ سراسریِ داستان، اگه اسکرولِ خودکار (همون دکمه‌ی کنارِ پلیر)
  // فعال باشه، خطِ در حالِ خواندن رو خودکار وسطِ صفحه نگه می‌داره — کاربر
  // خطش رو گم نمی‌کنه.
  useEffect(() => {
    const sentenceForScroll = playbackMode === "user" ? userAudio.activeSentence : activeStorySentence;
    if (!autoScrollActive || !sentenceForScroll) return;
    const node =
      granularity === "sentence"
        ? sentenceElsRef.current[`${sentenceForScroll.pi}-${sentenceForScroll.si}`]
        : paragraphElsRef.current[sentenceForScroll.pi];
    if (node) smoothScrollToCenter(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollActive, activeStorySentence?.pi, activeStorySentence?.si, userAudio.activeSentence?.pi, userAudio.activeSentence?.si, playbackMode, granularity]);

  // همون قابلیتِ بالا، ولی برای پخشِ کلِ یه ترجمه — وقتی کاربر 🔊ِ کنارِ یه
  // ترجمه رو می‌زنه و اسکرولِ خودکار فعاله، خطِ در حالِ خواندنِ همون ترجمه
  // رو خودکار وسطِ صفحه نگه می‌داره.
  useEffect(() => {
    if (!autoScrollActive || !activeTranslation) return;
    const node =
      granularity === "sentence"
        ? sentenceElsRef.current[`${activeTranslation.pi}-${activeTranslation.si}`]
        : paragraphElsRef.current[activeTranslation.pi];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollActive, activeTranslation?.pi, activeTranslation?.si, granularity]);

  // هر بار متنِ داستان یا زبانش عوض می‌شه، به بالا (App) گزارش می‌دیم تا
  // دکمه‌ی 🔊ِ روی نوارِ پلیر — همون‌جایی که قبلاً بالای این باکس بود —
  // بتونه همین متن رو بخونه. (این کامپوننت با display:none همیشه mount
  // می‌مونه، پس نیازی به پاک‌کردنش موقعِ خروج از تب نیست؛ نمایشِ دکمه روی
  // پلیر با چک‌کردنِ تبِ فعال کنترل می‌شه، نه با خالی‌بودنِ این متن.)
  useEffect(() => {
    bridge.latestStoryTextContext = { text: fullStoryText, code: storyLang };
    // 🐛 اصلاحِ باگ: قبلاً این‌جا فقط {text, code} به بیرون گزارش می‌شد — یعنی
    // دکمه‌ی «پخشِ مرکزیِ» نوارِ سراسریِ پایینِ صفحه (MainPlayButton/RestartButton)
    // با toggle کردنِ fullStoryText بدونِ sentenceBoundaries شروع می‌کرد، و
    // چون اون مسیر از همون splitSentencesRaw خامِ regex-محور استفاده می‌کنه
    // (نه از مرزهای دقیقِ جمله‌های خودِ اپ)، جمله‌هایی که کاربر آخرشون نقطه
    // نذاشته با جمله‌ی بعدی توی یه چانکِ TTS واحد ادغام می‌شدن — دقیقاً همون
    // «هایلایت/اسکرول دیرتر از جمله‌ی واقعی عوض می‌شه» که فقط وقتی از خودِ
    // StoryBuilder (دکمه‌های کنارِ هر جمله، storySentenceBoundaries) پخش
    // می‌شد درست بود. حالا storySentenceBoundaries رو هم همراهِ متن می‌فرستیم
    // تا دکمه‌ی مرکزی هم دقیقاً همون مرزبندی رو استفاده کنه.
    if (onFullTextChange) onFullTextChange({ text: fullStoryText, code: storyLang, sentenceBoundaries: storySentenceBoundaries });
  }, [fullStoryText, storyLang, storySentenceBoundaries]);

  // درست مثلِ onFullTextChange بالا — هر بار وضعیتِ صوتِ کاربر (آپلود شده یا
  // نه، در حالِ پخش یا نه، زمانِ فعلی/کل، و اینکه پلیر الان رو حالتِ tts یا
  // user ایستاده) عوض بشه، به App گزارش می‌شه تا نوارِ پخشِ سراسریِ پایینِ
  // صفحه (پلیرِ اصلی) بتونه سوییچ و کنترل‌های همین صوت رو نشون بده. توابعِ
  // play/pause/seek/nextLine/prevLine/setPlaybackMode مستقیم همینجا پاس داده
  // می‌شن (نه به‌عنوانِ dependency) تا افکت فقط با تغییرِ واقعیِ مقادیر اجرا
  // بشه، نه با هر رندر.
  useEffect(() => {
    if (onUserAudioStateChange) {
      onUserAudioStateChange({
        // این آبجکت قبلاً فقط یه زیرمجموعه‌ی ناقص از فیلدهایِ userAudio رو
        // می‌فرستاد (hasAudio/isPlaying/currentTime/duration/play/pause/
        // seek/nextLine/prevLine) — چیزهایی مثلِ markAB، abState، abA، abB
        // (که دکمه‌ی A-B رویِ پلیرِ سراسری بهشون نیاز داره) اصلاً توش نبودن.
        // نتیجه: با اپلودِ صوت و زدنِ دکمه‌ی A-B رویِ پلیرِ پایینِ صفحه،
        // ua.markAB یه تابع نبود (چون اصلاً پاس داده نشده بود) و اپ کرش
        // می‌کرد. حالا کلِ userAudio رو با spread می‌فرستیم تا هرچی به این
        // هوک اضافه بشه، خودکار به پلیرِ سراسری هم برسه.
        ...userAudio,
        playbackMode,
        setPlaybackMode,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mainStoryKey,
    userAudio.hasAudio,
    userAudio.isPlaying,
    userAudio.currentTime,
    userAudio.duration,
    userAudio.abState,
    userAudio.abA,
    userAudio.abB,
    userAudio.manualIndex,
    userAudio.audioSaving,
    userAudio.audioSaveError,
    playbackMode,
  ]);

  useEffect(() => {
    setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));
    setActiveCollectionId("");
  }, [storyLang]);

  // Coming from the Saved Words panel with "افزودن به داستان‌ساز" — jump the
  // story language to match, and drop the specific words the user picked
  // there straight into this story's selected-words list.
  useEffect(() => {
    if (jumpTo && jumpTo.lang) {
      setStoryLang(jumpTo.lang);
      if (Array.isArray(jumpTo.words) && jumpTo.words.length) {
        setSelectedWords((prev) => {
          const merged = [...prev];
          jumpTo.words.forEach((w) => {
            if (!merged.includes(w)) merged.push(w);
          });
          return merged;
        });
      }
    }
    // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» — باید دقیقاً همون داستان و همون
    // سطری که این لغت ازش ذخیره شده بود رو باز کنیم و بهش اسکرول کنیم.
    if (jumpTo && jumpTo.pi != null) {
      // اگه لغت از یه داستانِ ذخیره‌شده‌ی مشخص اومده، اول همون داستان رو باز
      // کن (حتی اگه همون داستانیه که همین الانم بازه — بازکردنِ دوباره‌ش
      // بی‌ضرره). اگه داستانِ اصلی دیگه بینِ داستان‌های ذخیره‌شده نیست
      // (مثلاً پاک شده)، همون‌جوری که هست می‌مونیم و فقط تلاش می‌کنیم به
      // pi/si موردنظر (اگه هنوز معتبره) اسکرول کنیم.
      if (jumpTo.storyId != null) {
        const match = savedStories.find((s) => s.id === jumpTo.storyId);
        if (match) openSavedStory(match);
      } else {
        setShowSaved(false);
      }
      // برای این‌که نودِ دقیقِ همون جمله (نه فقط پاراگراف) روی صفحه باشه،
      // اگه شماره‌ی جمله مشخصه، نمایش رو موقتاً روی «جمله به جمله» می‌ذاریم.
      if (jumpTo.si != null) setGranularity("sentence");
      pendingScrollRef.current = { pi: jumpTo.pi, si: jumpTo.si };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  // بعد از هر رندر چک می‌کنه که آیا نودِ موردنظرِ pendingScrollRef حالا آماده‌ست
  // یا نه (چون بازکردنِ یه داستانِ دیگه/تغییرِ granularity، یکی-دو رندر طول
  // می‌کشه تا به DOM برسه). وقتی پیدا شد، بهش اسکرول می‌کنه و چند ثانیه
  // هایلایتش می‌کنه، بعد پاک می‌شه که دیگه هر رندر بی‌خودی چک نکنه.
  useLayoutEffect(() => {
    const target = pendingScrollRef.current;
    if (!target) return;
    const node =
      target.si != null
        ? sentenceElsRef.current[`${target.pi}-${target.si}`]
        : paragraphElsRef.current[target.pi];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightSentence({ pi: target.pi, si: target.si });
    pendingScrollRef.current = null;
    const t = setTimeout(() => setHighlightSentence(null), 2400);
    return () => clearTimeout(t);
  });

  const activeCollection = collections.find((c) => c.id === activeCollectionId) || null;

  const refreshCollections = () => setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));

  const handleSaveCollection = () => {
    const entry = addWordCollection({ langCode: storyLang, title: newCollectionTitle, rawText: newCollectionText });
    if (!entry) return;
    refreshCollections();
    setActiveCollectionId(entry.id);
    setNewCollectionTitle("");
    setNewCollectionText("");
    setShowAddCollection(false);
  };
  const handlePdfUpload = createHandlePdfUpload({
    newCollectionTitle,
    setNewCollectionText,
    setNewCollectionTitle,
    setPdfBusy,
    setPdfError,
    setShowAddCollection,
    uiLang,
  });
  const handleAddWordToCollection = createHandleAddWordToCollection({
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
  });

  const startEditWord = (w) => {
    setEditingTerm(w.term);
    setEditDraftMeaning(w.meaning || "");
  };
  const saveEditWord = (originalTerm) => {
    if (!activeCollection) return;
    updateWordInCollectionEntry(activeCollection.id, originalTerm, { meaning: editDraftMeaning });
    refreshCollections();
    setEditingTerm(null);
  };
  const removeWord = (term) => {
    if (!activeCollection) return;
    removeWordFromCollectionEntry(activeCollection.id, term);
    setSelectedWords((prev) => prev.filter((w) => w !== term));
    refreshCollections();
  };
  const handleTranslateAllMissing = createHandleTranslateAllMissing({
    activeCollection,
    aiSettings,
    nativeLang,
    refreshCollections,
    setTranslatingAll,
    storyLang,
    uiLang,
  });

  // any language in the app can be a translation target — the story is
  // always AI-generated fresh, so it isn't limited to the static phrase data.
  // نمایش همه‌ی زبان‌های اپ اینجا (نه فقط زبان‌های بالای صفحه)، تا کاربر
  // مجبور نباشه برای اضافه‌کردن یه زبون جدید بره بالا و اسکرول کنه.
  // ترتیبِ این چیپ‌ها از langPickerOrder (همون ترتیبِ سراسری/قابل‌کشیدنی که
  // بالای تنظیمات هم استفاده می‌شه) میاد — تا کاربر بتونه با کشیدنِ چیپ‌ها
  // (پایین‌تر، DraggableToggleLangGrid) جاشون رو عوض کنه، و همون ترتیب هم
  // این‌جا هم توی خودِ متنِ ترجمه‌شده‌ی داستان رعایت بشه.
  const translationLangOptions = (langPickerOrder && langPickerOrder.length ? langPickerOrder : LANGUAGES.map((l) => l.code)).filter(
    (c) => c !== storyLang
  );

  const toggleTranslationLang = (code) => {
    setTranslationLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };
  // ترتیبِ نمایشِ خودِ ترجمه‌ها زیرِ هر جمله/پاراگراف — همیشه بر اساسِ همون
  // ترتیبِ چیپ‌ها (نه بر اساسِ ترتیبِ تپ‌کردن/انتخاب‌کردن)، تا جابه‌جاکردنِ
  // چیپ‌ها واقعاً روی چیدمانِ ترجمه‌های داستان هم اثر بذاره.
  const orderedTranslationLangs = translationLangOptions.filter((c) => translationLangs.includes(c));
  const selectAllTranslationLangs = () => setTranslationLangs(translationLangOptions);
  const clearAllTranslationLangs = () => setTranslationLangs([]);

  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => c !== storyLang));
  }, [storyLang]);

  // اگه کاربر یه زبان رو از «زبان‌های مقصد» (بالای صفحه) حذف کنه، دیگه نباید
  // به‌عنوان یه گزینه‌ی ترجمه‌ی فعال هم بمونه — همون لحظه از نمایش می‌افته،
  // حتی اگه قبلاً توی translationLangs انتخاب شده بود.
  const translationLangOptionsKey = translationLangOptions.join(",");
  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => translationLangOptions.includes(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationLangOptionsKey]);

  // 🔥 ترجمه‌ی زنده و افزایشی: هر زبانی که توی translationLangs باشه ولی
  // هنوز برای جمله‌های داستان ترجمه نشده (چه همون اول، چه هر زبان جدیدی که
  // کاربر بعداً — بعد از ساخته‌شدنِ داستان — اضافه کنه)، همینجا با زنجیره‌ی
  // سرویس‌های ترجمه‌ی رایگان (translateFree) گرفته و به state اضافه می‌شه.
  // بدون نیاز به ساختن دوباره‌ی داستان.
  useEffect(() => {
    if (!paragraphs.length || !translationLangs.length) return;
    // 🔥 فقط پاراگراف‌های فعلاً نمایش‌داده‌شده رو ترجمه می‌کنیم (نه کلِ
    // داستان یه‌جا) — هماهنگ با «نمایش تدریجی» بالا. با هر بار «نمایش
    // بیشتر»، این افکت دوباره اجرا می‌شه و فقط جمله‌های تازه‌نمایان‌شده
    // (که هنوز `s.t` ندارن) صف می‌شن؛ جمله‌های قبلی که ترجمه شدن، با چکِ
    // «in» زیر، دوباره صف نمی‌شن.
    const visibleParagraphs = paragraphs.slice(0, visibleParagraphCount);
    // نکته: چک با «in» (وجودِ کلید)، نه truthiness — چون اگه یه جمله متنِ
    // خالی داشته باشه، ترجمه‌ش هم می‌تونه رشته‌ی خالی برگرده؛ اگه اینجا با
    // truthiness چک می‌کردیم، همچین جمله‌ای همیشه «هنوز ترجمه نشده» حساب
    // می‌شد و این افکت هر بار دوباره اجرا می‌شد — یه حلقه‌ی بی‌پایان که کل
    // اپ رو کند/قفل می‌کرد.
    const missingLangs = translationLangs.filter((code) =>
      visibleParagraphs.some((p) => (p.sentences || []).some((s) => !s.t || !(code in s.t)))
    );
    if (!missingLangs.length) return;
    let cancelled = false;
    (async () => {
      // همه‌ی جمله‌های پاراگراف‌های نمایان (× همه‌ی زبان‌های ناقص) رو تو یه
      // لیستِ تخت جمع می‌کنیم و با سقفِ هم‌زمانیِ محدود اجرا می‌کنیم — نه
      // یک‌جا برای همه (که برای متن‌های طولانی باعثِ rate-limit/ترجمه‌ی
      // ناقص می‌شد).
      const jobs = [];
      visibleParagraphs.forEach((p, pIdx) => {
        (p.sentences || []).forEach((s, sIdx) => {
          missingLangs.forEach((code) => {
            if (s.t && code in s.t) return;
            jobs.push({ pIdx, sIdx, code, text: s.text || "" });
          });
        });
      });
      if (!jobs.length) return;
      // به‌جای صبر برای تمومِ کلِ jobs و یه setParagraphs در آخر (که باعث
      // می‌شد کاربر تا آخرِ کارِ صدها/هزاران درخواست هیچ ترجمه‌ای نبینه)،
      // نتیجه‌ی هر جمله همون لحظه که آماده شد به state اضافه می‌شه — پس
      // ترجمه‌ها تدریجی و زنده روی صفحه ظاهر می‌شن.
      const applyResult = (job, translated) => {
        if (cancelled) return;
        setParagraphs((prevParagraphs) => {
          const target = prevParagraphs[job.pIdx];
          const targetSentence = target?.sentences?.[job.sIdx];
          if (!targetSentence) return prevParagraphs;
          const updated = [...prevParagraphs];
          const sentences = [...(target.sentences || [])];
          sentences[job.sIdx] = { ...targetSentence, t: { ...(targetSentence.t || {}), [job.code]: translated } };
          updated[job.pIdx] = { ...target, sentences };
          return updated;
        });
      };
      let nextIndex = 0;
      async function worker() {
        while (nextIndex < jobs.length) {
          if (cancelled) return;
          const job = jobs[nextIndex++];
          let translated;
          try {
            // 🔧 قبلاً اینجا forceVerify=true بود: یعنی هر جمله‌ی هر داستان،
            // برای هر زبونِ مقصد، حتی وقتی نتیجه‌ی سرویس‌های رایگان اصلاً
            // مشکوک نبود، یه بار مستقیم با AI بازبینی می‌شد. با دیکشنری‌های
            // چندهزارتایی و داستان‌های زیاد، همین یه‌جا به‌تنهایی حجمِ AI رو
            // چند برابر می‌کرد و سهمیه‌ی روزانه‌ی همه‌ی پرووایدرها
            // (OpenRouter/Mistral/Groq/Gemini/HF) رو زود ته می‌کشید — بعدش
            // حتی بخش‌های دیگه‌ی اپ (مثل ساخت داستان) هم با خطای سرور روبه‌رو
            // می‌شدن. حالا مثلِ بقیه‌ی جاهای اپ، فقط به heuristic رایگانِ
            // looksLikelyMistranslated اعتماد می‌کنیم: نتیجه‌ی رایگان اول
            // نشون داده می‌شه، و AI فقط وقتی صدا زده می‌شه که خودِ
            // translateFreeNetwork این نتیجه رو مشکوک تشخیص بده.
            translated = await translateFree(job.text, job.code, storyLang, aiSettings, false);
          } catch (e) {
            translated = job.text;
          }
          applyResult(job, translated);
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
    })();
    return () => {
      cancelled = true;
    };
  }, [translationLangs, paragraphs, storyLang, visibleParagraphCount]);

  // طبق درخواستِ کاربر: دیگه پیش‌فرض (بدون جستجو) هیچ چیپ پیشنهادی‌ای از VOCAB
  // نشون داده نمی‌شه — قبلاً همیشه کل VOCAB نشون داده می‌شد که خیلی شلوغ بود.
  // فقط وقتی کاربر واقعاً چیزی تو کادرِ جستجو تایپ کرده، نتیجه می‌آد؛ کادر
  // حتی بعد از انتخاب‌شدنِ لغت هم (اگه چیزی برای نمایش نمونده) خالی می‌مونه.
  const filteredVocab = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const matches = VOCAB.filter((v) => {
      const w = v.t[storyLang] || v.t.en || "";
      if (selectedWords.includes(w)) return false;
      return w.toLowerCase().includes(q) || v.meaningFa.includes(qRaw);
    });
    // مثل otherTabMatches، سقف می‌ذاریم تا کادر شلوغ نشه — کاربر با
    // تایپِ دقیق‌تر می‌تونه نتیجه رو محدودتر کنه.
    return matches.slice(0, 20);
  }, [vocabQuery, storyLang, selectedWords]);

  // نتایجِ جستجو از تب‌های «لغات»، «لغات و اخبار»، «مکالمه و روزمره» و
  // «مکالمات روزمره» — فقط وقتی کاربر واقعاً چیزی تایپ کرده (چون این
  // منبع‌ها هزاران ردیف دارن و نشون‌دادنِ همه‌شون بدون جستجو هم کند می‌شه
  // هم بی‌فایده). حداکثر ۳۰ تا نتیجه، برای اینکه چیپ‌ها از صفحه بیرون نزنن.
  const otherTabMatches = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const seen = new Set();
    const results = [];
    for (const pool of [STORY_SEARCH_WORD_POOL, STORY_SEARCH_CONVERSATION_POOL]) {
      for (const item of pool) {
        if (results.length >= 30) break;
        const key = item.term.toLowerCase();
        if (seen.has(key)) continue;
        if (key.includes(q) || (item.fa && item.fa.includes(qRaw))) {
          seen.add(key);
          results.push(item);
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [vocabQuery]);

  // طبق همون درخواست: لغاتِ ذخیره‌شده هم دیگه به‌طور پیش‌فرض (بدون جستجو)
  // نشون داده نمی‌شن — فقط با تایپ‌کردن ظاهر می‌شن، درست مثل بقیه‌ی منبع‌ها.
  const matchingSavedWords = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const matches = savedWordsForLang.filter((e) => {
      // همینجا هم لغتِ از قبل انتخاب‌شده رو مخفی می‌کنیم، همون دلیلِ بالا.
      if (selectedWords.includes(e.word)) return false;
      return e.word.toLowerCase().includes(q) || (e.meaning && e.meaning.includes(qRaw));
    });
    return matches.slice(0, 20);
  }, [vocabQuery, savedWordsForLang, selectedWords]);

  // لغتی که از یه منبعِ فقط-انگلیسی (لغات/اخبار/مکالمه‌ی روزمره) انتخاب
  // شده رو، اگه زبانِ داستان انگلیسی نیست، اول به زبانِ داستان ترجمه می‌کنه
  // (دقیقاً همون مسیرِ addCustomWord)، بعد به لیستِ انتخاب‌شده‌ها اضافه می‌کنه.
  const [translatingPick, setTranslatingPick] = useState(null); // term در حال ترجمه
  // نگه‌داشتنِ نگاشتِ «لغتِ منبع (انگلیسی) → لغتِ ترجمه‌شده‌ای که واقعاً به
  // selectedWords اضافه شد» — چون otherTabMatches همیشه به انگلیسیه ولی
  // selectedWords ممکنه به زبانِ دیگه‌ای باشه؛ بدون این نگاشت نمی‌شه فهمید
  // کدوم آیتمِ این لیست الان «انتخاب‌شده» حساب می‌شه تا از لیست مخفیش کنیم.
  const [pickedTermTranslations, setPickedTermTranslations] = useState({});
  const pickForeignWord = async (term) => {
    if (storyLang === "en") {
      toggleWord(term);
      return;
    }
    setTranslatingPick(term);
    try {
      const res = await translateFree(term, storyLang, "en", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || term;
      setPickedTermTranslations((prev) => ({ ...prev, [term]: translated }));
      toggleWord(translated);
    } catch (e) {
      setPickedTermTranslations((prev) => ({ ...prev, [term]: term }));
      toggleWord(term);
    } finally {
      setTranslatingPick(null);
    }
  };

  const toggleWord = (word) => {
    setSelectedWords((prev) => {
      const already = prev.includes(word);
      if (!already) {
        // با اضافه‌شدن به انتخاب این داستان، خودکار تو انبار دائمی
        // (لغات ذخیره‌شده) هم بمونه — حذف از این داستان بعداً باعث
        // حذف از انبار نمی‌شه، چون اونجا رو دست نمی‌زنیم.
        ensureSavedStoryWord(word, storyLang);
      }
      return already ? prev.filter((w) => w !== word) : [...prev, word];
    });
  };
  const handleVocabPaste = createHandleVocabPaste({
    aiSettings,
    savedWordsForLang,
    selectedWords,
    setSelectedWords,
    setTranslateNote,
    setWordTranslating,
    storyLang,
    uiLang,
  });
  const addCustomWord = createAddCustomWord({
    aiSettings,
    customWord,
    selectedWords,
    setCustomWord,
    setSelectedWords,
    setTranslateNote,
    setWordTranslating,
    storyLang,
    uiLang,
  });
  const addPdfWordToStory = createAddPdfWordToStory({
    aiSettings,
    selectedWords,
    setSelectedWords,
    setTranslateNote,
    setWordTranslating,
    storyLang,
    uiLang,
  });
  const generateStory = createGenerateStory({
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
  });
  const handlePdfImportForReading = createHandlePdfImportForReading({
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
  });
  const handleImagesImportForReading = createHandleImagesImportForReading({
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
  });
  const handleBilingualPdfExport = createHandleBilingualPdfExport({
    aiSettings,
    nativeLang,
    setBilingualPdfBusy,
    setBilingualPdfError,
    setBilingualPdfProgress,
    uiLang,
  });
  const handlePdfViewImport = createHandlePdfViewImport({
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
  });
  const openSavedPdfViewDoc = createOpenSavedPdfViewDoc({
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
  });
  const handleDeletePdfViewDoc = createHandleDeletePdfViewDoc({
    clearPdfViewLiveDoc,
    pdfViewDocId,
    pdfViewPages,
    refreshPdfViewDocs,
    setPdfViewDocId,
    setPdfViewIndex,
    setPdfViewPages,
    setPdfViewTitle,
  });
  const closePdfView = createClosePdfView({
    clearPdfViewLiveDoc,
    pdfViewPages,
    setPdfViewDocId,
    setPdfViewError,
    setPdfViewIndex,
    setPdfViewPages,
    setPdfViewTitle,
  });
  const handlePastedTextForReading = createHandlePastedTextForReading({
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
  });
  const handleLinkImportForReading = createHandleLinkImportForReading({
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
  });
  const saveCurrentStory = createSaveCurrentStory({
    contentType,
    currentStoryId,
    paragraphs,
    selectedWords,
    setCurrentStoryId,
    setSavedStories,
    storyLang,
    storyLength,
    storyLevel,
  });

  const openSavedStory = (entry) => {
    if (entry.ytSession) { openYtSource(entry); return; }
    // 🆕 داستان‌های ذخیره‌شده‌ای که از «PDF رو با عکسِ اصلی + ترجمه همینجا
    // نشون بده» اومدن، فقط یه اشاره‌گر (pdfDocId) به سندِ واقعی‌شون تو
    // IndexedDBِ خودِ PDFها نگه می‌دارن (نه خودِ تصاویر/صفحات — که خیلی
    // سنگین‌تر از اونه که تو همون آرایه‌ی savedStories/localStorage جا بشه).
    // پس بازکردن‌شون باید از همون مسیرِ «بازکردنِ PDFِ ذخیره‌شده» رد بشه.
    if (entry.pdfDocId) {
      openSavedPdfViewDoc({ id: entry.pdfDocId, title: entry.title, pageCount: entry.pageCount, doneCount: entry.pageCount });
      return;
    }
    setStoryLang(entry.storyLang);
    setStoryLevel(entry.storyLevel);
    setStoryLength(entry.storyLength || "medium");
    setContentType(entry.contentType || "general");
    setSelectedWords(entry.selectedWords);
    setParagraphs(entry.paragraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setShowSaved(false);
    setCurrentStoryId(entry.id);
  };

  const deleteSavedStory = (id) => {
    setSavedStories((prev) => {
      const entry = prev.find((s) => s.id === id);
      // اگه این کارت در واقع یه اشاره‌گر به یه PDFِ ذخیره‌شده بود، خودِ
      // سندِ PDF (صفحات/عکس‌ها) رو هم از IndexedDBِ مخصوصِ PDFها پاک کن —
      // وگرنه یه سندِ یتیم و بی‌استفاده اونجا برای همیشه می‌مونه.
      if (entry?.pdfDocId) {
        deletePdfViewDoc(entry.pdfDocId, entry.pageCount).then(refreshPdfViewDocs).catch(() => {});
      }
      return prev.filter((s) => s.id !== id);
    });
  };

  // 🏷️ عنوانِ دلخواهِ کاربر برای یه داستانِ ذخیره‌شده — قبلاً فقط
  // داستان‌های PDF یه title داشتن (اسمِ خودِ فایل)؛ حالا هر داستانی
  // (متنی/PDF) می‌تونه یه عنوانِ دستی داشته باشه که به‌جایِ خلاصه‌ی
  // خودکار (یا کنارِ اون) نشون داده می‌شه. عنوانِ خالی = برگشت به حالتِ
  // پیش‌فرض (بدونِ عنوانِ دستی).
  const renameSavedStory = (id, title) => {
    const trimmed = (title || "").trim();
    setSavedStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: trimmed || undefined } : s))
    );
  };

  // ⭐ افزودن/حذفِ یه داستانِ ذخیره‌شده به/از علاقه‌مندی‌ها — برخلافِ
  // ستاره‌ی لغات (favorites/wordFavorites که تویِ یه Setِ جدا نگه داشته
  // می‌شن)، اینجا یه فیلدِ favorite رویِ خودِ entry نگه داشته می‌شه، چون
  // این ستاره مالِ خودِ کارتِ داستانه، نه یه عبارت/لغتِ داخلِ متنش.
  const toggleSavedStoryFavorite = (id) => {
    setSavedStories((prev) => prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  };
  const savePdfToStories = createSavePdfToStories({
    pdfViewDocId,
    pdfViewPages,
    pdfViewPersisted,
    pdfViewTitle,
    setSavedStories,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontWeight: 700, fontSize: 16, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("tabStory", uiLang)}</p>
      </div>

      {/* سوئیچِ دو‌قسمتی: ساختنِ داستان / کتابخانه‌ی من. قسمتِ فعال پررنگه تا
          همیشه معلوم باشه کاربر توی کدوم حالته. */}
      <div className="flex" role="tablist" style={{ padding: 3, borderRadius: 999, border: `1px solid ${colors.cardBorder}`, backgroundColor: colors.paperDark }}>
        {[
          [false, "storyModeCreate", Wand2, null],
          [true, "storyModeLibrary", Library, savedStories.length],
        ].map(([isLib, labelKey, Icon, count]) => (
          <button
            key={labelKey}
            role="tab"
            aria-selected={showSaved === isLib}
            onClick={() => {
              if (isLib) refreshPdfViewDocs();
              setShowSaved(isLib);
            }}
            className="flex items-center justify-center gap-1.5"
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 8px",
              borderRadius: 999,
              fontFamily: uiLang === "en" ? fontLatin : fontFa,
              backgroundColor: showSaved === isLib ? colors.ink : "transparent",
              color: showSaved === isLib ? colors.paper : colors.inkSoft,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={15} /> {tr(labelKey, uiLang)}{count !== null ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      <SrtTranslatorTool nativeLang={nativeLang} targetOrder={targetOrder} aiSettings={aiSettings} uiLang={uiLang} />

      {showSaved ? (
        <SavedStoriesLibrary
          calendarSystem={calendarSystem}
          commitRenamingStory={commitRenamingStory}
          deleteSavedStory={deleteSavedStory}
          handleDeletePdfViewDoc={handleDeletePdfViewDoc}
          markStoryRangeRead={markStoryRangeRead}
          openSavedPdfViewDoc={openSavedPdfViewDoc}
          openSavedStory={openSavedStory}
          pdfViewBusy={pdfViewBusy}
          pdfViewDocs={pdfViewDocs}
          renameDraft={renameDraft}
          renamingStoryId={renamingStoryId}
          savedStories={savedStories}
          savedStoriesAudioMap={savedStoriesAudioMap}
          savedStoriesLevelFilter={savedStoriesLevelFilter}
          savedStoriesSearch={savedStoriesSearch}
          savedStoriesSort={savedStoriesSort}
          savedStoryRangeInput={savedStoryRangeInput}
          savedStoryReadIds={savedStoryReadIds}
          setRenameDraft={setRenameDraft}
          setRenamingStoryId={setRenamingStoryId}
          setSavedStoriesLevelFilter={setSavedStoriesLevelFilter}
          setSavedStoriesSearch={setSavedStoriesSearch}
          setSavedStoriesSort={setSavedStoriesSort}
          setSavedStoryRangeInput={setSavedStoryRangeInput}
          startRenamingStory={startRenamingStory}
          toggleSavedStoryFavorite={toggleSavedStoryFavorite}
          toggleSavedStoryRead={toggleSavedStoryRead}
          uiLang={uiLang}
        />
      ) : (
        <>
      <StorySettingsPanel
        contentType={contentType}
        setContentType={setContentType}
        setStoryLang={setStoryLang}
        setStoryLength={setStoryLength}
        setStoryLevel={setStoryLevel}
        storyLang={storyLang}
        storyLangLabel={storyLangLabel}
        storyLangOptions={storyLangOptions}
        storyLength={storyLength}
        storyLevel={storyLevel}
        uiLang={uiLang}
      />

      <StoryWordPicker
        addCustomWord={addCustomWord}
        customWord={customWord}
        filteredVocab={filteredVocab}
        handleVocabPaste={handleVocabPaste}
        matchingSavedWords={matchingSavedWords}
        otherTabMatches={otherTabMatches}
        pickedTermTranslations={pickedTermTranslations}
        pickForeignWord={pickForeignWord}
        selectedWords={selectedWords}
        setCustomWord={setCustomWord}
        setSelectedWords={setSelectedWords}
        setVocabQuery={setVocabQuery}
        storyLang={storyLang}
        storyLangLabel={storyLangLabel}
        toggleWord={toggleWord}
        translateNote={translateNote}
        translatingPick={translatingPick}
        uiLang={uiLang}
        vocabQuery={vocabQuery}
        wordTranslating={wordTranslating}
      />

      {translationLangOptions.length > 0 && (
        <div className="mb-3" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, backgroundColor: colors.paper }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 12, color: colors.inkSoft }}>
              {uiLang === "en"
                ? "Translate the story into which languages at once? (You can pick several — hold and drag to reorder)"
                : "داستان همزمان به چه زبان‌هایی ترجمه بشه؟ (می‌تونی چند تا انتخاب کنی — برای جابه‌جاییِ ترتیب، نگه‌دار و بکش)"}
            </p>
            <div className="flex gap-2">
              <button onClick={selectAllTranslationLangs} style={{ fontSize: 11, color: colors.teal, textDecoration: "underline" }}>
                {tr("selectAll", uiLang)}
              </button>
              <button onClick={clearAllTranslationLangs} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                {tr("clearAllWords", uiLang)}
              </button>
            </div>
          </div>
          <DraggableToggleLangGrid
            order={translationLangOptions}
            onReorder={(next) => {
              if (typeof setLangPickerOrder === "function") {
                setLangPickerOrder((prev) => syncLangPickerFromTargetOrder(prev, next));
              }
            }}
            languages={LANGUAGES}
            selected={translationLangs}
            onToggle={toggleTranslationLang}
          />
        </div>
      )}

      <button
        onClick={() => generateStory()}
        disabled={!selectedWords.length || generating}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: colors.gold,
          color: "white",
          borderRadius: 14,
          padding: "12px 16px",
          fontWeight: 700,
          opacity: !selectedWords.length || generating ? 0.6 : 1,
        }}
      >
        <Sparkles size={18} />
        {uiLang === "en" ? (generating ? "Generating story..." : "Generate story") : (generating ? "در حال ساخت داستان..." : "بساز داستان")}
      </button>

      <StoryReadingImportPanel
        aiSettings={aiSettings}
        closePdfView={closePdfView}
        handleImagesImportForReading={handleImagesImportForReading}
        handleLinkImportForReading={handleLinkImportForReading}
        handlePastedTextForReading={handlePastedTextForReading}
        handlePdfImgDoubleClick={handlePdfImgDoubleClick}
        handlePdfImgTouchEnd={handlePdfImgTouchEnd}
        handlePdfImgTouchMove={handlePdfImgTouchMove}
        handlePdfImgTouchStart={handlePdfImgTouchStart}
        handlePdfImportForReading={handlePdfImportForReading}
        handlePdfViewImport={handlePdfViewImport}
        imgReadBusy={imgReadBusy}
        imgReadError={imgReadError}
        imgReadInputRef={imgReadInputRef}
        imgReadProgress={imgReadProgress}
        linkReadBusy={linkReadBusy}
        linkReadError={linkReadError}
        linkReadUrl={linkReadUrl}
        nativeLabel={nativeLabel}
        nativeLang={nativeLang}
        pastedReadingText={pastedReadingText}
        pdfImgGestureRef={pdfImgGestureRef}
        pdfImgPan={pdfImgPan}
        pdfImgZoom={pdfImgZoom}
        pdfjsLibRef={pdfjsLibRef}
        pdfReadBusy={pdfReadBusy}
        pdfReadError={pdfReadError}
        pdfReadInputRef={pdfReadInputRef}
        pdfReadProgress={pdfReadProgress}
        pdfTranslationFontSize={pdfTranslationFontSize}
        pdfTranslationShouldBold={pdfTranslationShouldBold}
        pdfViewBusy={pdfViewBusy}
        pdfViewDocId={pdfViewDocId}
        pdfViewError={pdfViewError}
        pdfViewIndex={pdfViewIndex}
        pdfViewInputRef={pdfViewInputRef}
        pdfViewLiveDoc={pdfViewLiveDoc}
        pdfViewPages={pdfViewPages}
        pdfViewPersisted={pdfViewPersisted}
        pdfViewProgress={pdfViewProgress}
        pdfViewTitle={pdfViewTitle}
        savedStories={savedStories}
        savePdfToStories={savePdfToStories}
        setLinkReadUrl={setLinkReadUrl}
        setPastedReadingText={setPastedReadingText}
        setPdfViewError={setPdfViewError}
        setPdfViewIndex={setPdfViewIndex}
        setShowLinkReading={setShowLinkReading}
        setShowPasteReading={setShowPasteReading}
        setShowPdfOriginalWords={setShowPdfOriginalWords}
        showLinkReading={showLinkReading}
        showPasteReading={showPasteReading}
        showPdfOriginalWords={showPdfOriginalWords}
        storyLang={storyLang}
        uiLang={uiLang}
      />

      {error && (
        <div style={{ backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 }}>{error}</p>
          <button
            onClick={() => generateStory()}
            disabled={generating}
            style={{
              fontFamily: uiLang === "en" ? fontLatin : fontFa,
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              backgroundColor: colors.rose,
              borderRadius: 8,
              padding: "5px 14px",
              opacity: generating ? 0.6 : 1,
            }}
          >
            {uiLang === "en" ? "Try again" : "تلاش دوباره"}
          </button>
        </div>
      )}

      {repeatNotice && !error && (
        <div style={{ backgroundColor: "#FFF6E0", border: `1px solid ${colors.gold}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 12, color: colors.ink }}>{repeatNotice}</p>
        </div>
      )}

      {paragraphs.length > 0 && (
        <StoryReaderPanel
          activeStorySentence={activeStorySentence}
          activeTranslation={activeTranslation}
          aiSettings={aiSettings}
          applyEditedStoryText={applyEditedStoryText}
          cancelEditingStoryText={cancelEditingStoryText}
          currentStoryId={currentStoryId}
          editingStoryText={editingStoryText}
          fullStoryText={fullStoryText}
          fullTranslatedTextByLang={fullTranslatedTextByLang}
          granularity={granularity}
          highlightColor={highlightColor}
          highlightSentence={highlightSentence}
          jumpToLineInUserAudio={jumpToLineInUserAudio}
          jumpToStorySearchMatch={jumpToStorySearchMatch}
          nativeLabel={nativeLabel}
          nativeLang={nativeLang}
          orderedTranslationLangs={orderedTranslationLangs}
          paragraphBaseOffsetMap={paragraphBaseOffsetMap}
          paragraphElsRef={paragraphElsRef}
          paragraphs={paragraphs}
          playbackMode={playbackMode}
          reportStoryWordSpoken={reportStoryWordSpoken}
          retranslateStoryParagraph={retranslateStoryParagraph}
          retranslateStorySentence={retranslateStorySentence}
          retranslatingSentences={retranslatingSentences}
          saveCurrentStory={saveCurrentStory}
          selectedWords={selectedWords}
          sentenceElsRef={sentenceElsRef}
          sentenceOffsetMap={sentenceOffsetMap}
          setGranularity={setGranularity}
          setStoryEditDraft={setStoryEditDraft}
          setStoryNote={setStoryNote}
          setStorySearchQuery={setStorySearchQuery}
          setVisibleParagraphCount={setVisibleParagraphCount}
          startEditingStoryText={startEditingStoryText}
          storyEditDraft={storyEditDraft}
          storyLang={storyLang}
          storyNote={storyNote}
          storySearchMatches={storySearchMatches}
          storySearchQuery={storySearchQuery}
          storySentenceBoundaries={storySentenceBoundaries}
          translatedParagraphBaseOffsetMapByLang={translatedParagraphBaseOffsetMapByLang}
          translatedSentenceBoundariesByLang={translatedSentenceBoundariesByLang}
          translatedSentenceOffsetMapByLang={translatedSentenceOffsetMapByLang}
          translationLangOptions={translationLangOptions}
          translationLangs={translationLangs}
          uiLang={uiLang}
          userAudio={userAudio}
          visibleParagraphCount={visibleParagraphCount}
        />
      )}

        </>
      )}
    </div>
  );
}
// دورِ StoryBuilder رو با React.memo می‌پیچیم: با پخشِ صوتِ آپلودیِ کاربر،
// وضعیتِ صدا (currentTime و...) هر نیم‌ثانیه به بالا (App) گزارش می‌شه
// (onUserAudioStateChange -> setStoryUserAudio) و باعثِ رندرِ دوباره‌ی
// App می‌شه. چون هیچ‌کدوم از propهایِ خودِ StoryBuilder (که همه‌شون
// state/setterِ پایدارن، نه چیزی که هر رندر از نو ساخته بشه) با اون
// تیک عوض نمی‌شن، React.memo جلویِ اجرایِ دوباره‌ی رندرِ این کامپوننتِ
// سنگین (که کلِ متنِ داستان رو نگه می‌داره) رو می‌گیره — همون چیزی که
// باعثِ کندی/هنگ‌کردنِ محسوس با فایل‌های صوتیِ طولانی (مثلاً یک‌ساعته) می‌شد.
StoryBuilder = React.memo(StoryBuilder);
