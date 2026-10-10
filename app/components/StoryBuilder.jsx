// داستان‌ساز
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Star, RotateCcw, Check, X, Search, Sparkles, Plus, Loader2, Bookmark, Pencil, Wand2, Library } from "lucide-react";
import { VOCAB } from "../../VOCAB.js";
import { recordNeuralRepeat, addNeuralFiber } from "../../NeuralPath.jsx";
import RangeSliderFilter from "../../RangeSliderFilter.jsx";
import { bridge } from "../runtime/bridge.js";
import { STORY_SEARCH_CONVERSATION_POOL, STORY_SEARCH_WORD_POOL } from "../config/dataPools.js";
import { setCachedTranslation } from "../storage/translationCacheDb.js";
import { deleteStoryAudioRecord, getStoryAudioRecord, saveStoryAudioRecord } from "../storage/storyAudioDb.js";
import { deletePdfViewDoc, estimatePdfViewStorage, listPdfViewDocs, loadPdfViewFile, loadPdfViewPages, savePdfViewFile, savePdfViewMeta, savePdfViewPage } from "../storage/pdfViewDb.js";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { LANGUAGES, RTL_LANGS, TESSERACT_LANG_CODE, detectPastedTextLanguage, detectTextCEFRLevel, dirFor, englishLangName, syncLangPickerFromTargetOrder } from "../constants/languages.js";
import { LEVELS } from "../constants/levels.js";
import { READ_DONE_BORDER, READ_DONE_CHECK_GRADIENT, READ_DONE_GRADIENT, READ_DONE_SHADOW, STAR_FAVORITE_COLOR, colors, fontFa, fontLatin, highlightBg, mainTextColor, smoothScrollToCenter, translationColor } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";
import { formatSavedDate } from "../utils/calendar.js";
import { sortSavedStories } from "../sort/sortHelpers.js";
import { GLOBAL_TRANSLATE_CONCURRENCY, runWithConcurrencyLimit, translateFree, translateFreeNetwork, translateViaAI } from "../translate/translateService.js";
import { DEFAULT_BACKEND_URL, callAI } from "../ai/callAI.js";
import { rememberMainTextResumeOffset, speechController } from "../speech/speechController.js";
import { normalizeWord } from "../words/wordCache.js";
import { SAVED_WORDS_CHANGED_EVENT, STORY_WORD_PICKED_EVENT, ensureSavedStoryWord, loadSavedStoryWords } from "../words/savedStoryWords.js";
import { loadReadWordIds, saveReadWordIds } from "../words/wordTranslations.js";
import { useStoryNote } from "../story/storyNotes.js";
import { useTargetTextPrefs } from "../prefs/textPrefs.js";
import { addWordCollection, addWordToCollectionEntry, loadWordCollections, removeWordFromCollectionEntry, saveWordCollectionsList, updateWordInCollectionEntry } from "../words/wordCollections.js";
import { CONTENT_TYPES, STORY_LENGTHS, countOccurrences, enforceSentenceSplit, extractPdfPageTextFlat, extractPdfPageTextWithBreaks, splitTextIntoSentenceStrings, translatePageTextPreservingParagraphs } from "../story/storyText.js";
import { getStoryEntryAudioKey, getStoryEntryFullText, getStoryEntryPreview, openYtSource } from "../story/storyEntries.js";
import { useStoryUserAudio } from "../hooks/useStoryUserAudio.js";
import { SrtTranslatorTool } from "./SrtTranslatorTool.jsx";
import { SavedStoriesSortMenu } from "./SortMenus.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelFilterRow } from "./levels/LevelControls.jsx";
import { DraggableToggleLangGrid } from "./OrderChips.jsx";
import { ClickableSentence } from "./story/ClickableSentence.jsx";
import { StoryUserAudioBar } from "./story/UserAudioBar.jsx";
import { PdfLivePageView } from "./story/PdfLivePageView.jsx";
import { WORDS_PAGE_SIZE } from "./WordList.jsx";

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

  function pdfImgTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

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
  // نسخه‌ی پاراگرافیِ رفرش — وقتی نمایش روی حالتِ «پاراگراف» (نه جمله‌به‌جمله)
  // باشه، ترجمه‌ی کلِ پاراگراف از join همه‌ی s.t[code] ساخته می‌شه؛ پس رفرشِ
  // اینجا یعنی همه‌ی جمله‌های همون پاراگراف رو برای این زبان دوباره بگیریم.
  async function retranslateStoryParagraph(pi, code) {
    const key = `${pi}-all-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const sentences = paragraphs[pi]?.sentences || [];
      await Promise.all(
        sentences.map(async (s, si) => {
          try {
            const translated = await retranslateOneSentenceText(s.text || "", code);
            setCachedTranslation(s.text || "", code, storyLang, translated); // fire-and-forget — جایِ ترجمه‌ی غلطِ قبلی رو تو کش می‌گیره
            setParagraphs((prevParagraphs) => {
              const target = prevParagraphs[pi];
              const targetSentence = target?.sentences?.[si];
              if (!targetSentence) return prevParagraphs;
              const updated = [...prevParagraphs];
              const list = [...(target.sentences || [])];
              list[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
              updated[pi] = { ...target, sentences: list };
              return updated;
            });
          } catch {
            // این یکی شکست خورد؛ بقیه‌ی جمله‌ها همچنان ادامه می‌دن.
          }
        })
      );
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  async function retranslateStorySentence(pi, si, code, text) {
    const key = `${pi}-${si}-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const translated = await retranslateOneSentenceText(text, code);
      setCachedTranslation(text || "", code, storyLang, translated); // fire-and-forget — جایِ ترجمه‌ی غلطِ قبلی رو تو کش می‌گیره
      setParagraphs((prevParagraphs) => {
        const target = prevParagraphs[pi];
        const targetSentence = target?.sentences?.[si];
        if (!targetSentence) return prevParagraphs;
        const updated = [...prevParagraphs];
        const sentences = [...(target.sentences || [])];
        sentences[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
        updated[pi] = { ...target, sentences };
        return updated;
      });
    } catch {
      // شکست خورد؛ ترجمه‌ی قبلی همون‌جا می‌مونه، کاربر می‌تونه دوباره امتحان کنه.
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  // نمایش/ترجمه‌ی تدریجی: به‌جای رندر و صف‌کردنِ ترجمه‌ی همه‌ی پاراگراف‌ها
  // یه‌جا (که برای داستان‌های خیلی بلند — مثلاً از PDF — هم DOM رو سنگین
  // می‌کنه و هم صدها/هزاران درخواستِ ترجمه رو یه‌جا صف می‌کنه و کاربر تا
  // آخرِ کل کار هیچی نمی‌بینه)، فقط این تعداد پاراگرافِ اول رندر/ترجمه
  // می‌شه؛ با دکمه‌ی «نمایش بیشتر» جلو می‌ره.
  const PARAGRAPH_PAGE_SIZE = 15;
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
  const importYtSaved = useCallback(async () => {
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
    if (!B || !B.ytSavedList || ytImportBusyRef.current) return;
    ytImportBusyRef.current = true;
    try {
      const res = await B.ytSavedList();
      const items = (res && res.items) || [];
      if (!items.length) return;
      setSavedStories((prev) => {
        let next = [...prev];
        for (const it of items) {
          if (!it || !it.key) continue;
          const lines = []; // زیرنویس‌ها ذخیره نمی‌شوند؛ فقط عنوان/لینک/منبع
          const at = next.findIndex((x) => x.ytKey === it.key);
          if (at >= 0) {
            const old = next[at];
            const byT = new Map();
            for (const l of old.ytLines || []) byT.set(Math.round((l.t || 0) * 1000), l);
            for (const l of lines) {
              const k = Math.round((l.t || 0) * 1000);
              const o = byT.get(k);
              byT.set(k, { ...l, tr: { ...((o && o.tr) || {}), ...(l.tr || {}) } });
            }
            const merged = [...byT.values()].sort((a, b) => (a.t || 0) - (b.t || 0));
            next[at] = {
              ...old,
              ytLines: [],
              ytTargets: it.targets || old.ytTargets,
              savedAt: it.savedAt || old.savedAt,
              ytSource: it.source || old.ytSource || null,
              ytUrl: it.url || old.ytUrl || "",
              ytChannel: it.channel || old.ytChannel || "",
              title: (it.live && it.source && it.title) ? it.title : old.title,
            };
          } else {
            let level = "B1";
            try { level = detectTextCEFRLevel(lines.map((l) => l.s).join(" ")) || level; } catch (e) { /* ignore */ }
            next = [{
              id: Number(it.rev) || Date.now(),
              ytSession: true,
              ytKey: it.key,
              ytLive: !!it.live,
              ytVideoId: it.videoId || "",
              ytUrl: it.url || "",
              ytChannel: it.channel || "",
              ytSource: it.source || null,
              ytTargets: it.targets || [],
              ytLines: lines,
              title: it.title || (it.live ? "ترجمه‌ی زنده" : ""),
              storyLang: it.lang || "en",
              storyLevel: level,
              contentType: "general",
              storyLength: "medium",
              selectedWords: [],
              paragraphs: [],
              savedAt: it.savedAt || new Date().toISOString(),
            }, ...next];
          }
        }
        return next;
      });
      try { await B.ytSavedAck({ items: items.map((it) => ({ key: it.key, rev: it.rev })) }); } catch (e) { /* ignore */ }
    } catch (e) {
      /* بدونِ پلاگین/خطا: چیزی برای وارد کردن نیست */
    } finally {
      ytImportBusyRef.current = false;
    }
  }, [setSavedStories]);
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
  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده روی لیستِ داستان‌های
  // ذخیره‌شده — همون الگویِ WordList/SavedWordsPanel، اینجا واحدِ لیست
  // خودِ داستان‌هاست (نه لغات تکی). شمارنده‌ها هر بار از رویِ readIds و
  // لیستِ فعلی (فیلترشده/مرتب‌شده) دوباره محاسبه می‌شن، نه عددِ ثابت.
  const STORY_LIST_ID = "storyBuilder";
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

  // آپلودِ PDF برای «منبعِ لغت» — استخراجِ متن با pdf.js (لود می‌شه از CDN،
  // فقط وقتی واقعاً لازم بشه، نه موقعِ بازشدنِ اپ) کاملاً سمتِ مرورگرِ
  // خودِ کاربره؛ هیچ فایلی جایی آپلود نمی‌شه، و نتیجه‌ش هم مثلِ بقیه‌ی
  // منبع‌های لغت فقط تو localStorage (روی همین گوشی) ذخیره می‌شه، نه تو
  // Supabase — پس نیازی به ارتقاءِ پلن نداره.
  const PDF_MAX_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت
  const PDF_MAX_CHARS = 20000; // سقفِ کاراکتر، برای اینکه حجمِ localStorage (که مشترکِ همه‌چیزِ اپه) پر نشه

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

  // «وارد کردنِ PDF برای خوانش» — برخلافِ آپلودِ PDF بالا (که فقط برای
  // «منبعِ لغت» بود)، این‌یکی کلِ متنِ PDF رو مستقیم می‌ذاره تو همون
  // سیستمِ خوانشِ داستان (پاراگراف‌به‌پاراگراف/جمله‌به‌جمله، هایلایت،
  // ترجمه، صدا) — بدون اینکه از هوش‌مصنوعی بخوایم داستانی بسازه؛ یعنی
  // paragraphs رو مستقیم از خودِ متنِ PDF می‌سازیم، دقیقاً هم‌شکلِ همون
  // چیزی که generateStory در پایان تولید می‌کنه، پس تمام رابط کاربریِ
  // پایین (که به paragraphs/currentStoryId وصله) بدونِ هیچ
  // تغییری کار می‌کنه. کاربر بعداً خودش با پاپ‌آپِ لغت تصمیم می‌گیره کدوم
  // لغت‌ها رو «ذخیره برای داستانِ بعدی» یا «افزودن به جعبه‌ی لایتنر» کنه.
  const PDF_READ_MAX_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت
  const PDF_READ_SENTENCES_PER_PARAGRAPH = 5; // استخراجِ PDF معمولاً مرزِ پاراگرافِ واقعی رو حفظ نمی‌کنه، پس خودمون هر ۵ جمله رو یه «پاراگراف» حساب می‌کنیم تا خوانا بمونه
  const PDF_READ_MAX_SENTENCES = 2000; // سقفِ کلی — فراتر از این برای موبایل/سرویسِ ترجمه‌ی رایگان زیادی سنگین می‌شه (لازم شد می‌تونی این عدد رو دوباره کم/زیاد کنی)

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

  // «وارد کردنِ عکس برای خوندن/ترجمه» — همون منطقِ handlePdfImportForReading
  // بالا (paragraphs مستقیم از رویِ متنِ استخراج‌شده ساخته می‌شه، بدونِ
  // دخالتِ AI)، با این تفاوت که به‌جایِ pdf.js از Tesseract.js برای OCR
  // (تشخیصِ متنِ رویِ عکس) استفاده می‌کنیم. کاربر می‌تونه چند عکس رو یه‌جا
  // انتخاب کنه (مثلاً چند صفحه از یه کتاب که خودش عکس گرفته) — متنِ همه‌ی
  // عکس‌ها به‌ترتیب به هم می‌چسبه و یه داستان/متنِ واحد برای خوندن می‌شه.
  const IMAGE_READ_MAX_BYTES_PER_FILE = 25 * 1024 * 1024; // ۲۵ مگابایت برای هر عکس
  // 🐛 عکس‌های تزئینی/پوستری معمولاً دورشون کادر/گل‌وبوته/خط‌تزئینی دارن —
  // Tesseract قبلاً کلِ عکس (از جمله همون تزئینات) رو هم سعی می‌کرد بخونه،
  // و چیزهایی مثل کادرهای طلایی رو به‌غلط به یه مشت حرف/علامتِ الکی
  // (مثلاً «ge((5 $C” 2) (=)...») تبدیل می‌کرد که هم خودش قاطیِ اولِ متنِ
  // واقعی می‌شد، هم چون پر از نقل‌قول/پرانتز بود باعث می‌شد سرویسِ ترجمه
  // به‌جای بعضی نویسه‌ها موجودیت‌های HTML خام (مثلِ &quot; یا &#10;) برگردونه.
  // Tesseract به‌ازای هر کلمه یه «میزانِ اطمینان» (confidence، بینِ ۰ تا ۱۰۰)
  // هم می‌ده؛ نویسه‌های تزئینیِ غیرمتنی معمولاً اطمینانِ خیلی پایینی می‌گیرن
  // (بر خلافِ متنِ واقعیِ تایپ‌شده که اطمینانِ بالایی داره). این تابع فقط
  // کلماتی که اطمینانِ کافی دارن رو نگه می‌داره، پس اون آشغال‌های تزئینی
  // قبل از این‌که وارد متنِ خوانش/ترجمه بشن حذف می‌شن.
  const IMAGE_READ_MIN_WORD_CONFIDENCE = 62;
  // 🐛 فیلترِ اطمینان به‌تنهایی کافی نبود: نویسه‌های تزئینیِ حاشیه (گل‌وبوته،
  // خط‌های جداکننده) که کنارِ هم یه شکلِ نامفهوم می‌سازن (مثلِ «5°»، «§ [%»،
  // «A i i ,.») گاهی از نظرِ خودِ Tesseract اطمینانِ بالایی هم می‌گیرن — چون
  // مطمئنه یه‌چیزی اونجا هست، فقط نمی‌دونه دقیقاً چیه. این تابع هر «کلمه»‌ای
  // که بیشترِ نویسه‌هاش حرف نباشن (یعنی بیشتر از علامت/عدد/فاصله تشکیل شده)
  // رو هم حذف می‌کنه، چون متنِ زبانِ واقعی تقریباً همیشه بیشترش حرفه.
  const MIN_LETTER_RATIO = 0.5;
  function wordLooksLikeText(word) {
    if (!word) return false;
    const letters = (word.match(/\p{L}/gu) || []).length;
    return letters / word.length >= MIN_LETTER_RATIO;
  }
  function cleanOcrPageText(data) {
    const words = data?.words;
    if (Array.isArray(words) && words.length) {
      return words
        .filter((w) => (typeof w.confidence === "number" ? w.confidence : 100) >= IMAGE_READ_MIN_WORD_CONFIDENCE)
        .filter((w) => wordLooksLikeText(w.text))
        .map((w) => w.text)
        .join(" ")
        .trim();
    }
    return (data?.text || "").trim();
  }

  // 🐛 عکس‌هایی که ورودیِ OCR می‌شن معمولاً پوستر/عکسِ چاپی‌ان، نه اسکنِ
  // سفیدِ ساده — متنِ تیره روی زمینه‌ی گرادیانی/عکسِ رنگی (مثلِ آسمونِ
  // غروب یا کاغذِ قدیمی) کنتراستِ پایینی داره و همین باعثِ اشتباه‌خوانی‌های
  // فاحش می‌شه (مثلاً «These» رو «J» یا «Help» رو «ME» تشخیص بده). این تابع
  // قبل از OCR، عکس رو خاکستری می‌کنه و کنتراستش رو تا سیاه‌ترین/سفیدترین
  // نقطه‌ی واقعیِ خودِ عکس می‌کِشه (اگه عکس از قبل کنتراستِ خوبی داشت، این
  // عملاً بی‌اثره)؛ و اگه عکس کوچیک بود (مثلاً یه اسکرین‌شاتِ فشرده) تا
  // حداقلِ ۱۶۰۰پیکسل بزرگش می‌کنه، چون فونت‌های تزئینی/کج به‌جزئیاتِ
  // بیشتری نیاز دارن تا شکلِ حرف‌ها قاطیِ هم نشه.
  async function preprocessImageForOcr(file) {
    const bitmap = await createImageBitmap(file);
    const MIN_LONG_SIDE = 1600;
    const longSide = Math.max(bitmap.width, bitmap.height);
    const scale = longSide < MIN_LONG_SIDE ? MIN_LONG_SIDE / longSide : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const px = imageData.data;
    let minLum = 255, maxLum = 0;
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      lum[p] = g;
      if (g < minLum) minLum = g;
      if (g > maxLum) maxLum = g;
    }
    const range = Math.max(maxLum - minLum, 1);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      const stretched = Math.min(255, Math.max(0, ((lum[p] - minLum) / range) * 255));
      px[i] = px[i + 1] = px[i + 2] = stretched;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

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

  // «خروجی PDF دوزبانه» — فایلِ خامِ PDF (عکس‌ها/چیدمانِ اصلی) دست‌نخورده
  // می‌مونه: هر صفحه با pdf.js دقیقاً همون‌جوری که هست به یک عکس رندر و
  // در یک PDFِ خروجیِ تازه گذاشته می‌شه، و بلافاصله بعدش یک صفحه‌ی
  // «روبرو»ی ترجمه اضافه می‌شه (متنِ همون صفحه، ترجمه‌شده). چون کشیدنِ
  // مستقیمِ متنِ فارسی/عربی با pdf-lib شکلِ حروف رو به‌هم نمی‌چسبونه (بدونِ
  // text-shaping بدشکل درمیاد)، ترجمه رو هم با canvas (fillText خودِ
  // مرورگر که shaping/جهتِ RTL رو کامل بلده) می‌کِشیم و مثلِ صفحه‌ی اصلی،
  // به‌صورتِ عکس embed می‌کنیم — نتیجه یک PDFِ واحد با متنِ اصلی و ترجمه‌ی
  // روبروی هم، برای هر صفحه.
  const BILINGUAL_PDF_MAX_BYTES = 80 * 1024 * 1024; // ۸۰ مگابایت — رندرِ تصویریِ صفحه‌به‌صفحه از استخراجِ صرفِ متن سنگین‌تره
  const BILINGUAL_PDF_MAX_PAGES = 60; // سقفِ صفحات، تا رندر+ترجمه رو موبایل خیلی طول نکشه/قفل نکنه
  const BILINGUAL_PDF_RENDER_SCALE = 1.6; // کیفیتِ کافی برای خوانا بودنِ متن/عکسِ صفحه، بدونِ حجمِ زیادِ نهایی

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

  // «نمایشِ PDF همینجا» — حالتِ دومِ بارگذاریِ PDF. به‌جای رندرِ از پیش هر
  // صفحه به یک عکسِ ثابت، بایتِ خامِ خودِ فایل ذخیره می‌شه و هر صفحه با
  // PdfLivePageView همون لحظه که کاربر می‌بینتش زنده رندر می‌شه — یعنی یک
  // ویووِرِ واقعیِ PDF، با لایه‌ی متنِ قابلِ‌سلکت، نه یک عکس. متنِ هر صفحه
  // هم همچنان از قبل استخراج و ترجمه می‌شه (برای باکسِ ترجمه‌ی روبرو و
  // بخشِ «نمایشِ متنِ اصلی (کلیک‌پذیر)»).
  const PDF_VIEW_MAX_BYTES = 80 * 1024 * 1024; // ۸۰ مگابایت
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

  // استخراجِ «متنِ اصلیِ» یه صفحه‌ی وب از رویِ HTMLِ خامش — یعنی بدنه‌ی
  // نوشته (مقاله/پست)، نه منو/هدر/فوتر/سایدبار/تبلیغ/اسکریپت. اول دنبالِ
  // تگ‌های معناداری مثلِ <article> یا <main> می‌گردیم (رایج‌ترین الگو تو
  // سایت‌های خبری/وبلاگ‌ها)؛ اگه نبود، بینِ همه‌یِ بلاک‌های باقی‌مونده
  // (بعدِ حذفِ nav/header/footer/aside/script/style) اونی که بیشترین حجمِ
  // متن رو داره انتخاب می‌شه — یه heuristic ساده ولی برای اکثرِ صفحات کافیه.
  const extractMainBodyText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, nav, header, footer, aside, svg, form, iframe").forEach((el) => el.remove());
    const direct = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role='main']");
    if (direct && direct.textContent.trim().length > 200) {
      return direct.textContent;
    }
    const candidates = doc.body ? Array.from(doc.body.querySelectorAll("div, section, article")) : [];
    let best = doc.body;
    let bestLen = 0;
    for (const el of candidates) {
      // بلاک‌هایی که خودشون یه بلاکِ بزرگ‌تر رو کامل تو خودشون دارن، حساب
      // نمی‌شن (وگرنه همیشه بالاترین والد برنده می‌شد) — فقط طولِ متنِ
      // مستقیمِ خودِ این تگ (بدونِ فرزندهای بلاکیِ تو در تو) مهمه.
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3 || ["P", "SPAN", "STRONG", "EM", "B", "I", "A"].includes(n.nodeName))
        .map((n) => n.textContent)
        .join(" ");
      if (ownText.length > bestLen) {
        bestLen = ownText.length;
        best = el;
      }
    }
    return (bestLen > 200 ? best : doc.body)?.textContent || "";
  };

  // اگه لینکِ واردشده یه ویدیوی یوتیوب باشه (watch؟v=، youtu.be/،
  // shorts/، embed/، یا حتی خودِ آی‌دیِ خام)، آی‌دیِ ویدیو رو برمی‌گردونه؛
  // وگرنه null — تا handleLinkImportForReading بفهمه باید متنِ صفحه رو
  // بخونه یا زیرنویسِ ویدیو رو.
  const extractYouTubeVideoId = (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        const id = u.pathname.split("/").filter(Boolean)[0];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        const v = u.searchParams.get("v");
        if (v && /^[\w-]{11}$/.test(v)) return v;
        const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
        if (m) return m[2];
      }
    } catch {
      // URL نامعتبر بود
    }
    return null;
  };

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

  const saveCurrentStory = () => {
    if (!paragraphs.length) return;
    // اگه همین داستان (بدونِ تغییر) از قبل ذخیره شده (currentStoryId ست
    // شده)، دوباره یه کپیِ تکراری نساز — قبلاً هر بار کلیک، یه ورودیِ
    // جدید و تکراری به «داستان‌های ذخیره‌شده» اضافه می‌کرد.
    if (currentStoryId) return;
    const entry = {
      id: Date.now(),
      storyLang,
      storyLevel,
      contentType,
      storyLength,
      selectedWords,
      paragraphs,
      savedAt: new Date().toISOString(),
    };
    setSavedStories((prev) => [entry, ...prev]);
    setCurrentStoryId(entry.id);
  };

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

  // 🆕 دکمه‌ی «ذخیره در داستان‌ها»یِ خودِ نمایشگرِ PDF — سندِ PDF از قبل با
  // بازشدنش خودکار تویِ IndexedDBِ خودش ذخیره شده (savePdfViewMeta/Page)،
  // این دکمه فقط یه کارتِ سبک (اشاره‌گر) براش تویِ همون لیستِ یکپارچه‌ی
  // «داستان‌های ذخیره‌شده» می‌سازه، دقیقاً مثلِ بقیه‌ی داستان‌ها — با آیکونِ
  // 📄 کنارش (شبیهِ همون 🎵ای که برای صوتِ آپلودی گذاشته شده).
  const savePdfToStories = () => {
    // 🩹 اگه ذخیره‌سازیِ واقعیِ صفحات تو IndexedDB شکست خورده باشه، دیگه
    // کارتِ اشاره‌گر نساز — چون بعداً بازکردنش هیچی نشون نمی‌ده (دقیقاً
    // همون باگی که قبلاً باعث می‌شد کارت باشه ولی خالی باز بشه).
    if (!pdfViewDocId || !pdfViewPersisted) return;
    setSavedStories((prev) => {
      if (prev.some((s) => s.pdfDocId === pdfViewDocId)) return prev; // قبلاً ذخیره شده
      const entry = {
        id: Date.now(),
        pdfDocId: pdfViewDocId,
        title: pdfViewTitle,
        pageCount: pdfViewPages.length,
        savedAt: new Date().toISOString(),
      };
      return [entry, ...prev];
    });
  };

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
        <div className="flex flex-col gap-3">
          {/* PDFهایی که با «PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده»
              ذخیره شدن، این‌جا بالای لیستِ داستان‌ها نشون داده می‌شن — نه
              پایینِ صفحه‌ی اصلیِ داستان‌ساز. */}
          {pdfViewDocs.length > 0 && (
            <div style={{ textAlign: "start" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>{uiLang === "en" ? "Saved PDFs" : "PDFهای ذخیره‌شده"}</span>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                {pdfViewDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                    style={{
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 12,
                      opacity: pdfViewBusy ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => openSavedPdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.ink, fontWeight: 700, textAlign: "start", flex: 1, minWidth: 0 }}
                    >
                      {doc.title}
                      <span style={{ color: colors.inkSoft, fontWeight: 400 }}>
                        {" "}
                        — {doc.doneCount === doc.pageCount
                          ? (uiLang === "en" ? `${doc.pageCount} pages` : `${doc.pageCount} صفحه`)
                          : (uiLang === "en" ? `${doc.doneCount} of ${doc.pageCount} pages` : `${doc.doneCount} از ${doc.pageCount} صفحه`)}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeletePdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.rose, fontSize: 11, textDecoration: "underline", marginInlineStart: 8 }}
                    >
                      {uiLang === "en" ? "Delete" : "حذف"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* جستجو در داستان‌های ذخیره‌شده — روی متنِ خودِ داستان، لغاتِ
              انتخاب‌شده، و عنوانِ PDF چک می‌شه؛ کاملاً مستقل از زبانِ
              داستان (فارسی/انگلیسی/هرچی) — همه‌شون یکسان جستجو می‌شن. */}
          {savedStories.length > 1 && (
            <div
              className="flex items-center gap-2 px-3"
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
            >
              <Search size={15} color={colors.inkSoft} />
              <input
                value={savedStoriesSearch}
                onChange={(e) => setSavedStoriesSearch(e.target.value)}
                placeholder={uiLang === "en" ? "Search saved stories..." : "جستجو در داستان‌های ذخیره‌شده..."}
                dir="auto"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
              />
              {savedStoriesSearch && (
                <button onClick={() => setSavedStoriesSearch("")} aria-label={uiLang === "en" ? "Clear search" : "پاک کردن جستجو"} style={{ display: "flex" }}>
                  <X size={15} color={colors.inkSoft} />
                </button>
              )}
            </div>
          )}
          {/* سطح‌ها همیشه توی ردیفِ خودشون، تمام‌عرض و بدون تنگ‌شدن نشون
              داده می‌شن؛ مرتب‌سازی یه ردیفِ جدا زیرشه — قبلاً کنارِ هم
              بودن و دکمه‌ی مرتب‌سازی جای سطح‌ها رو تنگ می‌کرد. */}
          <LevelFilterRow levelFilter={savedStoriesLevelFilter} setLevelFilter={setSavedStoriesLevelFilter} uiLang={uiLang} />
          {savedStories.length > 1 && (
            <div className="flex justify-start">
              <SavedStoriesSortMenu sortKey={savedStoriesSort} setSortKey={setSavedStoriesSort} uiLang={uiLang} />
            </div>
          )}
          {savedStories.length === 0 && (
            <p style={{ fontSize: 13, color: colors.inkSoft }}>{uiLang === "en" ? "You haven't saved any stories yet." : "هنوز داستانی ذخیره نکردی."}</p>
          )}
          {savedStories.length > 0 && (() => {
            // جستجو، مستقلِ از زبانِ داستان — یه include سادهٔ رشته‌ست، پس
            // فارسی/انگلیسی/عربی/هر اسکریپتِ دیگه‌ای رو یکسان پیدا می‌کنه.
            const q = savedStoriesSearch.trim().toLowerCase();
            const searched = q
              ? savedStories.filter((s) => {
                  const haystack = [
                    s.title || "",
                    s.pdfDocId ? "" : getStoryEntryFullText(s),
                    (s.selectedWords || []).join(" "),
                  ]
                    .join(" ")
                    .toLowerCase();
                  return haystack.includes(q);
                })
              : savedStories;
            if (q && searched.length === 0) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>{uiLang === "en" ? "Nothing found for this search." : "چیزی با این جستجو پیدا نشد."}</p>
              );
            }
            // هر داستان از قبل با سطحِ خودش (storyLevel) ذخیره شده. وقتی فیلترِ
            // خاصی (مثلاً B1) انتخاب شده فقط داستان‌های همون سطح نشون داده
            // می‌شن. وقتی «همه سطح‌ها»ست، دیگه بر اساسِ سطح دسته‌بندی/تفکیک
            // نمی‌کنیم — همه‌ی داستان‌ها با هم قاطی، فقط بر اساسِ sortKey
            // (مثلاً تاریخ) مرتب می‌شن؛ سطحِ هر داستان همون‌طور که قبلاً بود
            // (خط اول کارت) نمایش داده می‌شه.
            const groups = (
              savedStoriesLevelFilter !== "all"
                ? [[savedStoriesLevelFilter, searched.filter((s) => s.storyLevel === savedStoriesLevelFilter)]]
                : [["all", searched]]
            ).map(([lv, list]) => [lv, sortSavedStories(list, savedStoriesSort)]);
            if (!groups.length || groups.every(([, list]) => list.length === 0)) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>
                  {uiLang === "en"
                    ? `No stories saved at level ${savedStoriesLevelFilter}.`
                    : `داستانی با سطح ${savedStoriesLevelFilter} ذخیره نشده.`}
                </p>
              );
            }
            const totalCount = groups.reduce((sum, [, list]) => sum + list.length, 0);
            const defaultTo = Math.min(totalCount, WORDS_PAGE_SIZE) || totalCount || 1;
            const parsedFrom = parseInt(savedStoryRangeInput.from, 10);
            const parsedTo = parseInt(savedStoryRangeInput.to, 10);
            const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
            const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
            const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(totalCount, 1));
            const clampedTo = Math.min(Math.max(clampedFrom, effTo), totalCount || clampedFrom);
            let seen = 0;
            const rangedGroups = groups.map(([lv, list]) => {
              const groupStart = seen;
              seen += list.length;
              const from = Math.max(clampedFrom - 1 - groupStart, 0);
              const to = Math.max(clampedTo - groupStart, 0);
              return [lv, list.slice(from, to)];
            });
            const visibleTotal = rangedGroups.reduce((sum, [, list]) => sum + list.length, 0);
            const readCountInRange = rangedGroups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const readCountTotal = groups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const allInRangeFlat = rangedGroups.flatMap(([, list]) => list);
            return (
              <>
                <RangeSliderFilter
                  min={1}
                  max={totalCount}
                  from={clampedFrom}
                  to={clampedTo}
                  onFromChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, from: val }))}
                  onToChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, to: val }))}
                  readCount={readCountInRange}
                  totalInRange={visibleTotal}
                  readCountTotal={readCountTotal}
                  label={uiLang === "en" ? "Stories" : "داستان‌ها"}
                  uiLang={uiLang}
                  colors={colors}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, true)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, false)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
                  </button>
                </div>
                {rangedGroups.map(([lv, list]) => (
              <div key={lv} className="flex flex-col gap-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openSavedStory(s)}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      background: savedStoryReadIds.has(s.id) ? READ_DONE_GRADIENT : "white",
                      border: `1px solid ${savedStoryReadIds.has(s.id) ? READ_DONE_BORDER : colors.cardBorder}`,
                      borderRadius: 14,
                      padding: 14,
                      paddingTop: s.savedAt ? 26 : 14,
                      boxShadow: savedStoryReadIds.has(s.id) ? READ_DONE_SHADOW : "none",
                    }}
                  >
                    {s.savedAt && (
                      <p
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 10,
                          margin: 0,
                          fontSize: 10.5,
                          color: colors.inkSoft,
                          whiteSpace: "nowrap",
                          // چون این برچسب داخلِ صفحه‌ی RTL می‌شینه، بدونِ این‌جهت‌دهیِ
                          // صریح، الگوریتمِ Bidi ممکنه ترتیبِ تاریخ/ساعت رو برعکس
                          // نشون بده. با direction: ltr همیشه از چپ به راست —
                          // اول تاریخ، بعد ساعت — دقیقاً به همون ترتیبی که
                          // formatSavedDate می‌سازه، نمایش داده می‌شه.
                          direction: "ltr",
                          unicodeBidi: "isolate",
                          textAlign: "left",
                        }}
                      >
                        📅 {formatSavedDate(s.savedAt, calendarSystem)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {/* دایره‌ی خوانده‌شده کنارِ عنوان، همیشه اولین عضوِ ردیف —
                          تا در چیدمانِ راست‌به‌چپ دقیقاً سمتِ راستِ کارت بیفته،
                          یکسان با بقیه‌ی تب‌ها (قبلاً توی گروهِ دومِ دکمه‌ها
                          بود و سمتِ چپ در میومد). */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSavedStoryRead(s.id); }}
                          aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: savedStoryReadIds.has(s.id) ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                            background: savedStoryReadIds.has(s.id) ? READ_DONE_CHECK_GRADIENT : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {savedStoryReadIds.has(s.id) && <Check size={13} color="white" strokeWidth={3} />}
                        </button>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>
                            {savedStoriesAudioMap[s.id] && (
                              <span title={uiLang === "en" ? "Has uploaded audio" : "صوتِ آپلودی داره"} style={{ marginLeft: 6 }}>🎵</span>
                            )}
                            {s.pdfDocId && (
                              <span title={uiLang === "en" ? "PDF file" : "فایلِ PDF"} style={{ marginLeft: 6 }}>📄</span>
                            )}
                            {s.ytSession && (
                              <span title={s.ytLive ? "Live" : "YouTube"} style={{ marginLeft: 6 }}>{s.ytLive ? "🎙" : "▶"}</span>
                            )}
                            {s.pdfDocId ? (
                              <>PDF{s.pageCount ? ` · ${s.pageCount} ${uiLang === "en" ? "pages" : "صفحه"}` : ""}</>
                            ) : s.ytSession ? (
                              <>{s.ytLive ? (uiLang === "en" ? "Live translation" : "ترجمه‌ی زنده") : "YouTube"} · {LANGUAGES.find((l) => l.code === s.storyLang)?.label}</>
                            ) : (
                              <>
                                {LANGUAGES.find((l) => l.code === s.storyLang)?.label} · {s.storyLevel} ·{" "}
                                {CONTENT_TYPES.find((c) => c.key === s.contentType)?.label || (uiLang === "en" ? "General" : "عمومی")} ·{" "}
                                {STORY_LENGTHS.find((l) => l.key === s.storyLength)?.label || (uiLang === "en" ? "Medium" : "متوسط")}
                              </>
                            )}
                          </p>
                          {renamingStoryId === s.id ? (
                            <div className="flex items-center gap-1" style={{ marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRenamingStory(s.id);
                                  if (e.key === "Escape") setRenamingStoryId(null);
                                }}
                                placeholder={uiLang === "en" ? "Custom title…" : "عنوانِ دلخواه…"}
                                style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, flex: 1, minWidth: 0 }}
                              />
                              <button onClick={() => commitRenamingStory(s.id)} aria-label={uiLang === "en" ? "Save title" : "ذخیره‌ی عنوان"}>
                                <Check size={14} color={colors.teal} />
                              </button>
                              <button onClick={() => setRenamingStoryId(null)} aria-label={uiLang === "en" ? "Cancel" : "انصراف"}>
                                <X size={14} color={colors.inkSoft} />
                              </button>
                            </div>
                          ) : s.pdfDocId ? (
                            <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{s.title}</p>
                          ) : (
                            <>
                              {s.title && (
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, marginTop: 2 }}>{s.title}</p>
                              )}
                              {getStoryEntryPreview(s) && (
                                <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{getStoryEntryPreview(s)}</p>
                              )}
                              <p style={{ fontSize: 12, color: colors.inkSoft }}>{s.selectedWords.join(uiLang === "en" ? ", " : "، ")}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSavedStoryFavorite(s.id); }}
                          aria-label={tr("addToFavoritesAria", uiLang)}
                        >
                          <Star size={16} color={STAR_FAVORITE_COLOR} fill={s.favorite ? STAR_FAVORITE_COLOR : "none"} />
                        </button>
                        {renamingStoryId !== s.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startRenamingStory(s); }}
                            aria-label={uiLang === "en" ? "Rename" : "تغییرِ نام"}
                          >
                            <Pencil size={14} color={colors.inkSoft} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deleteSavedStory(s.id); }} aria-label={uiLang === "en" ? "Delete" : "حذف"}>
                          <X size={16} color={colors.rose} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                ))}
              </>
            );
          })()}
        </div>
      ) : (
        <>
      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <p style={{ fontWeight: 700, marginBottom: 10, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLangLevelSection", uiLang)}</p>
        {storyLangOptions.length > 1 ? (
          <>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              {uiLang === "en"
                ? "Story language (from the target languages picked above)"
                : "زبان داستان (از بین زبان‌های مقصدی که بالای صفحه انتخاب کردی)"}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {storyLangOptions.map((code) => (
                <button
                  key={code}
                  onClick={() => setStoryLang(code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    border: `1px solid ${storyLang === code ? colors.gold : colors.cardBorder}`,
                    backgroundColor: storyLang === code ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {uiLang === "en" ? englishLangName(code) : LANGUAGES.find((l) => l.code === code)?.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 10 }}>
            {uiLang === "en"
              ? `Story language: ${englishLangName(storyLang)} (based on the target language picked above)`
              : `زبان داستان: ${storyLangLabel} (طبق زبان مقصدی که بالای صفحه انتخاب کردی)`}
          </p>
        )}
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "0 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLevelLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setStoryLevel(lv)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: `1px solid ${storyLevel === lv ? colors.teal : colors.cardBorder}`,
                backgroundColor: storyLevel === lv ? colors.teal : "white",
                color: storyLevel === lv ? "white" : colors.ink,
              }}
            >
              {lv}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyContentTypeLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.key}
              onClick={() => setContentType(c.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${contentType === c.key ? colors.rose : colors.cardBorder}`,
                backgroundColor: contentType === c.key ? colors.rose : "white",
                color: contentType === c.key ? "white" : colors.ink,
              }}
            >
              {uiLang === "en" ? c.labelEn : c.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLengthLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {STORY_LENGTHS.map((l) => (
            <button
              key={l.key}
              onClick={() => setStoryLength(l.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${storyLength === l.key ? colors.gold : colors.cardBorder}`,
                backgroundColor: storyLength === l.key ? colors.gold : "white",
                color: storyLength === l.key ? "white" : colors.ink,
              }}
            >
              {uiLang === "en" ? l.labelEn : l.label}
            </button>
          ))}
        </div>

      </div>

      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <div className="flex items-center justify-between mb-2">
          <p style={{ fontWeight: 700, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyWordsSection", uiLang)}</p>
        </div>

        <div className="flex gap-2 mb-1">
          <input
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !wordTranslating && addCustomWord()}
            placeholder={
              uiLang === "en"
                ? `Type a word (in any language) — it'll be translated and added to ${storyLangLabel}...`
                : `یه لغت بنویس (به هر زبونی) — به ${storyLangLabel} ترجمه و اضافه می‌شه...`
            }
            dir="auto"
            disabled={wordTranslating}
            style={{
              flex: 1,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 13,
              outline: "none",
              textAlign: "start",
              opacity: wordTranslating ? 0.6 : 1,
            }}
          />
          <button
            onClick={addCustomWord}
            disabled={wordTranslating}
            style={{ backgroundColor: colors.ink, color: "white", borderRadius: 10, padding: "0 12px", opacity: wordTranslating ? 0.6 : 1 }}
          >
            {wordTranslating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          </button>
        </div>
        {translateNote && (
          <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>{translateNote}</p>
        )}


        <input
          value={vocabQuery}
          onChange={(e) => setVocabQuery(e.target.value)}
          onPaste={handleVocabPaste}
          placeholder={
            uiLang === "en"
              ? "Or search vocab, daily dialogues, words & news, slang expressions, saved words..."
              : "یا از دیکشنری من، دیالوگ‌های روزمره، لغات و اخبار، اصطلاحات عامیانه، لغات ذخیره‌شده جستجو کن..."
          }
          style={{
            width: "100%",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
            marginBottom: 10,
          }}
        />
        <div className="flex flex-wrap gap-2 mb-3" style={{ maxHeight: 140, overflowY: "auto" }}>
          {filteredVocab.map((v) => {
            const w = v.t[storyLang] || v.t.en;
            const active = selectedWords.includes(w);
            return (
              <button
                key={v.id}
                onClick={() => toggleWord(w)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
                  backgroundColor: active ? colors.goldSoft : colors.paper,
                }}
              >
                {w}
              </button>
            );
          })}

          {/* لغاتِ ذخیره‌شده‌ی همین زبان — فقط وقتی کاربر جستجو می‌کنه (طبق
              درخواست، دیگه به‌طور پیش‌فرض نشون داده نمی‌شن). */}
          {matchingSavedWords.map((e) => {
            const active = selectedWords.includes(e.word);
            return (
              <button
                key={`saved-${e.word}`}
                onClick={() => toggleWord(e.word)}
                title={uiLang === "en" ? "From saved words" : "از لغات ذخیره‌شده"}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.teal}`,
                  backgroundColor: active ? colors.goldSoft : "white",
                }}
              >
                <Bookmark size={11} color={colors.teal} />
                {e.word}
              </button>
            );
          })}

          {/* نتایجِ جستجو از تب‌های لغات / لغات و اخبار / مکالمه‌ی روزمره /
              مکالمات روزمره — فقط وقتی کاربر تایپ کرده. چون این‌ها فقط به
              انگلیسی‌ان، اگه زبانِ داستان چیز دیگه‌ای باشه، اول ترجمه می‌شن. */}
          {otherTabMatches
            .filter((item) => {
              // اگه این لغت (به شکلِ ترجمه‌شده‌ی واقعاً اضافه‌شده‌اش) همین الان
              // تو انتخاب‌های داستانه، دیگه تو این لیست نشونش نده.
              const mapped = storyLang === "en" ? item.term : pickedTermTranslations[item.term];
              return !mapped || !selectedWords.includes(mapped);
            })
            .map((item) => {
            const busy = translatingPick === item.term;
            return (
              <button
                key={`other-${item.source}-${item.term}`}
                onClick={() => pickForeignWord(item.term)}
                disabled={busy}
                title={item.source}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${colors.cardBorder}`,
                  backgroundColor: colors.paper,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy && <Loader2 size={11} className="spin" />}
                {item.term}
                <span style={{ fontSize: 9, color: colors.inkSoft }}>({item.source})</span>
              </button>
            );
          })}
        </div>

        {selectedWords.length > 0 && (
          <div style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((w) => (
                <span
                  key={w}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    backgroundColor: colors.ink,
                    color: "white",
                  }}
                >
                  {w}
                  <button onClick={() => toggleWord(w)} aria-label={uiLang === "en" ? "Remove" : "حذف"}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setSelectedWords([])}
                style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}
              >
                {tr("clearAllWords", uiLang)}
              </button>
            </div>
          </div>
        )}
      </div>

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

      <div style={{ textAlign: "center" }}>
        <input
          ref={pdfReadInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfImportForReading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfReadInputRef.current?.click()}
          disabled={pdfReadBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfReadBusy ? 0.6 : 1,
          }}
        >
          {pdfReadBusy ? <Loader2 size={16} className="spin" /> : <span>📖</span>}
          {pdfReadBusy
            ? (pdfReadProgress || (uiLang === "en" ? "Reading PDF..." : "در حال خوندنِ PDF..."))
            : (uiLang === "en" ? "Import a PDF to read instead" : "به‌جاش یه PDF برای خوانش وارد کن")}
        </button>
        {pdfReadError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfReadError}</p>
        )}

        <input
          ref={imgReadInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImagesImportForReading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => imgReadInputRef.current?.click()}
          disabled={imgReadBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: imgReadBusy ? 0.6 : 1,
            marginTop: 10,
          }}
        >
          {imgReadBusy ? <Loader2 size={16} className="spin" /> : <span>🖼️</span>}
          {imgReadBusy
            ? (imgReadProgress || (uiLang === "en" ? "Reading images..." : "در حال خوندنِ عکس‌ها..."))
            : (uiLang === "en" ? "Import images to translate & read" : "وارد کردنِ عکس برای ترجمه و خوانش")}
        </button>
        {imgReadError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{imgReadError}</p>
        )}

        <input
          ref={pdfViewInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfViewImport}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfViewInputRef.current?.click()}
          disabled={pdfViewBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.teal}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfViewBusy ? 0.6 : 1,
            marginTop: 10,
          }}
        >
          {pdfViewBusy ? <Loader2 size={16} className="spin" /> : <span>📑</span>}
          {pdfViewBusy
            ? (pdfViewProgress || (uiLang === "en" ? "Loading PDF..." : "در حال بارگذاریِ PDF..."))
            : (uiLang === "en" ? "Show the PDF here with original image + translation" : "PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده")}
        </button>
        {pdfViewError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfViewError}</p>
        )}

        {/* لیستِ PDFهای ذخیره‌شده از این‌جا برداشته شد — حالا داخلِ پنلِ
            «داستان‌های ذخیره‌شده» (بالا، گوشه‌ی سمت چپ) نشون داده می‌شه،
            نه اینجا وسطِ صفحه‌ی اصلیِ داستان‌ساز. */}

        {pdfViewPages.length > 0 && (
          <div style={{ marginTop: 12, textAlign: "start" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>
                {uiLang === "en"
                  ? <>{pdfViewTitle} — page {pdfViewIndex + 1} of {pdfViewPages.length}</>
                  : <>{pdfViewTitle} — صفحه‌ی {pdfViewIndex + 1} از {pdfViewPages.length}</>}
                {pdfViewBusy && pdfViewDocId && (
                  <span style={{ color: colors.inkSoft, fontWeight: 400 }}> {uiLang === "en" ? "(remaining pages processing...)" : "(بقیه‌ی صفحات در حالِ پردازش...)"}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={savePdfToStories}
                  disabled={!pdfViewDocId || !pdfViewPersisted || savedStories.some((s) => s.pdfDocId === pdfViewDocId)}
                  title={!pdfViewPersisted ? (uiLang === "en" ? "Local storage failed, so this PDF can't be added to the list" : "چون ذخیره‌سازیِ محلی ناموفق بود، این PDF قابلِ اضافه‌کردن به لیست نیست") : undefined}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? colors.inkSoft : colors.gold,
                    textDecoration: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? "none" : "underline",
                    opacity: !pdfViewDocId || !pdfViewPersisted ? 0.5 : 1,
                  }}
                >
                  {uiLang === "en"
                    ? (savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                        ? "Saved ✓"
                        : !pdfViewPersisted
                        ? "Can't be saved"
                        : "Save to stories")
                    : (savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                        ? "ذخیره شد ✓"
                        : !pdfViewPersisted
                        ? "قابلِ ذخیره نیست"
                        : "ذخیره در داستان‌ها")}
                </button>
                <button onClick={closePdfView} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                  {uiLang === "en" ? "Close" : "بستن"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3" style={{ alignItems: "flex-start" }}>
              <div
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  overflow: "hidden",
                  borderRadius: 10,
                  border: `1px solid ${colors.cardBorder}`,
                  touchAction: pdfImgZoom > 1 ? "none" : "pan-y",
                }}
                onTouchStart={handlePdfImgTouchStart}
                onTouchMove={handlePdfImgTouchMove}
                onTouchEnd={handlePdfImgTouchEnd}
                onDoubleClick={handlePdfImgDoubleClick}
              >
                {(pdfViewLiveDoc?.docId === pdfViewDocId && pdfViewLiveDoc?.doc) || pdfViewPages[pdfViewIndex]?.imageUrl ? (
                  <div
                    style={{
                      transform: `scale(${pdfImgZoom}) translate(${pdfImgPan.x / pdfImgZoom}px, ${pdfImgPan.y / pdfImgZoom}px)`,
                      transformOrigin: "center center",
                      transition: pdfImgGestureRef.current.mode ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <PdfLivePageView
                      pdfDoc={pdfViewLiveDoc?.docId === pdfViewDocId ? pdfViewLiveDoc.doc : null}
                      pdfjsLib={pdfjsLibRef.current}
                      pageNum={pdfViewIndex + 1}
                      fallbackImageUrl={pdfViewPages[pdfViewIndex]?.imageUrl}
                      onError={() =>
                        setPdfViewError(uiLang === "en"
                          ? "There was a problem rendering this page live — the file may be corrupted or encrypted"
                          : "رندرِ زنده‌ی این صفحه مشکل داشت — ممکنه فایل خراب یا رمزگذاری‌شده باشه")
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div
                dir="auto"
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  backgroundColor: colors.goldSoft,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: pdfTranslationFontSize,
                  fontWeight: pdfTranslationShouldBold ? 700 : 400,
                  lineHeight: 1.9,
                  color: colors.ink,
                  maxHeight: 480,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {pdfViewPages[pdfViewIndex]?.translatedText}
              </div>
            </div>

            {pdfViewPages[pdfViewIndex]?.originalText && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowPdfOriginalWords((v) => !v)}
                  style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}
                >
                  {uiLang === "en"
                    ? (showPdfOriginalWords ? "Hide original text" : "Show original text (clickable)")
                    : (showPdfOriginalWords ? "بستنِ متنِ اصلی" : "نمایشِ متنِ اصلی (کلیک‌پذیر)")}
                </button>
                {showPdfOriginalWords && (
                  <div
                    dir={dirFor(storyLang)}
                    style={{
                      marginTop: 8,
                      backgroundColor: colors.paper,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      lineHeight: 2.1,
                      maxHeight: 300,
                      overflowY: "auto",
                      // متنِ خودِ PDF همیشه باید با جهتِ زبانِ داستان (storyLang)
                      // نوشته بشه، نه dir="auto" — چون dir="auto" جهتِ کلِ این
                      // div رو از رویِ اولین کاراکترِ قوی‌اش تشخیص می‌داد؛ چون
                      // اون کاراکتر معمولاً فارسیِ توضیحِ بالای همین باکس بود
                      // (نه خودِ متنِ انگلیسی)، کل پاراگراف RTL می‌شد و کلمات
                      // انگلیسی به‌هم‌ریخته/برعکس نشون داده می‌شدن.
                      textAlign: dirFor(storyLang) === "rtl" ? "right" : "left",
                    }}
                  >
                    <p
                      dir={dirFor(nativeLang)}
                      style={{
                        fontSize: 10,
                        color: colors.inkSoft,
                        marginBottom: 6,
                        textAlign: dirFor(nativeLang) === "rtl" ? "right" : "left",
                      }}
                    >
                      {uiLang === "en"
                        ? "Tap a word to see its translation; from there you can also add it to the next story, grammar practice, or the Leitner box."
                        : "روی هر کلمه بزن تا ترجمه‌اش رو ببینی؛ از همون‌جا می‌تونی به داستانِ بعدی، یادگیریِ گرامر یا جعبه‌ی لایتنر هم اضافه‌اش کنی."}
                    </p>
                    <ClickableSentence
                      text={pdfViewPages[pdfViewIndex].originalText}
                      langCode={storyLang}
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      aiSettings={aiSettings}
                      color={colors.ink}
                      fontFamily={fontLatin}
                      fontSize={13}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
              <button
                onClick={() => setPdfViewIndex((i) => Math.max(0, i - 1))}
                disabled={pdfViewIndex === 0}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === 0 ? 0.4 : 1 }}
              >
                ◀ {uiLang === "en" ? "Previous page" : "صفحه‌ی قبل"}
              </button>
              <button
                onClick={() => setPdfViewIndex((i) => Math.min(pdfViewPages.length - 1, i + 1))}
                disabled={pdfViewIndex === pdfViewPages.length - 1}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === pdfViewPages.length - 1 ? 0.4 : 1 }}
              >
                {uiLang === "en" ? "Next page" : "صفحه‌ی بعد"} ▶
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "start" }}>
          <button
            onClick={() => setShowLinkReading((v) => !v)}
            className="flex items-center justify-center gap-2"
            style={{
              width: "100%",
              border: `1px dashed ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              color: colors.teal,
              marginTop: 8,
            }}
          >
            <span>🔗</span>
            {uiLang === "en"
              ? (showLinkReading ? "Close link import" : "Or enter a page link")
              : (showLinkReading ? "بستنِ وارد کردنِ لینک" : "یا لینکِ یه صفحه رو وارد کن")}
          </button>
          {showLinkReading && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={linkReadUrl}
                onChange={(e) => setLinkReadUrl(e.target.value)}
                placeholder="https://example.com/article  یا  https://youtube.com/watch?v=..."
                dir="ltr"
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                  textAlign: "left",
                }}
              />
              <p style={{ fontSize: 10, color: colors.inkSoft, marginTop: 4 }}>
                {uiLang === "en"
                  ? "Only the page's main text (body content) is extracted — menus, headers, footers, and ads are ignored."
                  : "فقط متنِ اصلیِ صفحه (بدنه‌ی نوشته) استخراج می‌شه — منو، هدر، فوتر و تبلیغ‌ها نادیده گرفته می‌شن."}
              </p>
              <button
                onClick={handleLinkImportForReading}
                disabled={!linkReadUrl.trim() || linkReadBusy}
                className="flex items-center justify-center gap-2"
                style={{
                  marginTop: 6,
                  width: "100%",
                  backgroundColor: colors.teal,
                  color: "white",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: !linkReadUrl.trim() || linkReadBusy ? 0.5 : 1,
                }}
              >
                {linkReadBusy ? <Loader2 size={16} className="spin" /> : <span>🔗</span>}
                {uiLang === "en"
                  ? (linkReadBusy ? "Reading the page..." : "Get text from link")
                  : (linkReadBusy ? "در حال خوندنِ صفحه..." : "دریافتِ متن از لینک")}
              </button>
              {linkReadError && (
                <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{linkReadError}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPasteReading((v) => !v)}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            marginTop: 8,
          }}
        >
          <span>📋</span>
          {uiLang === "en"
            ? (showPasteReading ? "Close text paste" : "Or paste a text/story here")
            : (showPasteReading ? "بستنِ پیست متن" : "یا یه متن/داستان رو اینجا پیست کن")}
        </button>

        {showPasteReading && (
          <div style={{ marginTop: 8, textAlign: "start" }}>
            <textarea
              value={pastedReadingText}
              onChange={(e) => setPastedReadingText(e.target.value)}
              placeholder={uiLang === "en" ? "Paste the text or story you want to read here..." : "متن یا داستانی که می‌خوای بخونی رو اینجا پیست کن..."}
              dir="auto"
              rows={6}
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handlePastedTextForReading}
              disabled={!pastedReadingText.trim()}
              style={{
                marginTop: 6,
                width: "100%",
                backgroundColor: colors.teal,
                color: "white",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 700,
                opacity: !pastedReadingText.trim() ? 0.5 : 1,
              }}
            >
              📖 {uiLang === "en" ? "Ready to read" : "آماده‌ی خوانش کن"}
            </button>
          </div>
        )}
      </div>

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
        <div
          style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontWeight: 700 }}>{uiLang === "en" ? "Story" : "داستان"}</p>
            <div className="flex items-center gap-3 flex-wrap" style={{ rowGap: 8 }}>
              <button
                onClick={editingStoryText ? cancelEditingStoryText : startEditingStoryText}
                title={editingStoryText ? (uiLang === "en" ? "Cancel editing" : "انصراف از ویرایش") : (uiLang === "en" ? "Edit story text" : "ویرایشِ متنِ داستان")}
                aria-label={editingStoryText ? (uiLang === "en" ? "Cancel editing" : "انصراف از ویرایش") : (uiLang === "en" ? "Edit story text" : "ویرایشِ متنِ داستان")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: editingStoryText ? colors.rose : colors.teal,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {editingStoryText ? <X size={16} /> : <Pencil size={16} />}
              </button>
              <button
                onClick={saveCurrentStory}
                title={currentStoryId ? (uiLang === "en" ? "Saved" : "ذخیره شد") : (uiLang === "en" ? "Save story" : "ذخیره داستان")}
                aria-label={currentStoryId ? (uiLang === "en" ? "Saved" : "ذخیره شد") : (uiLang === "en" ? "Save story" : "ذخیره داستان")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: currentStoryId ? colors.teal : colors.gold,
                  background: "none",
                  border: "none",
                  cursor: currentStoryId ? "default" : "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {currentStoryId ? <Check size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {!editingStoryText && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="flex items-center gap-2"
                style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px" }}
              >
                <Search size={14} color={colors.inkSoft} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder={uiLang === "en" ? "Search inside the story text — any language" : "جستجو داخلِ متنِ داستان — به هر زبانی"}
                  dir="auto"
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13, background: "transparent", color: colors.ink }}
                />
                {!!storySearchQuery && (
                  <button
                    onClick={() => setStorySearchQuery("")}
                    aria-label={uiLang === "en" ? "Clear search" : "پاک‌کردنِ جستجو"}
                    style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: colors.inkSoft, cursor: "pointer", flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {!!storySearchQuery.trim() && (
                <div style={{ marginTop: 6 }}>
                  {storySearchMatches.length === 0 ? (
                    <p style={{ fontSize: 12, color: colors.inkSoft }}>{uiLang === "en" ? "Nothing found." : "چیزی پیدا نشد."}</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p style={{ fontSize: 11, color: colors.inkSoft }}>{uiLang === "en" ? `${storySearchMatches.length} results:` : `${storySearchMatches.length} نتیجه:`}</p>
                      {storySearchMatches.map((m, idx) => (
                        <button
                          key={`${m.pi}-${m.si}-${idx}`}
                          type="button"
                          onClick={() => jumpToStorySearchMatch(m.pi, m.si)}
                          dir="auto"
                          style={{
                            textAlign: "start",
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: `1px solid ${colors.cardBorder}`,
                            backgroundColor: colors.paper,
                            color: colors.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {editingStoryText ? (
            <div style={{ marginBottom: 8, textAlign: "start" }}>
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
                {uiLang === "en"
                  ? "Edit the text — leave a blank line between paragraphs."
                  : "متن رو ویرایش کن — برای جداکردنِ پاراگراف‌ها یه خط خالی بینشون بذار."}
              </p>
              <textarea
                value={storyEditDraft}
                onChange={(e) => setStoryEditDraft(e.target.value)}
                dir="auto"
                rows={10}
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                <button
                  onClick={applyEditedStoryText}
                  disabled={!storyEditDraft.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: colors.teal,
                    color: "white",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: !storyEditDraft.trim() ? 0.5 : 1,
                  }}
                >
                  {uiLang === "en" ? "Apply edit" : "ثبتِ ویرایش"}
                </button>
                <button
                  onClick={cancelEditingStoryText}
                  style={{
                    flex: 1,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.inkSoft,
                    background: "white",
                  }}
                >
                  {uiLang === "en" ? "Cancel" : "انصراف"}
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* انتخاب زبان‌های ترجمه از اینجا حذف شد — همون انتخاب بالای دکمه‌ی
              «بساز داستان» (قبل از ساخت) کافیه و دیگه دوباره اینجا تکرار
              نمی‌شه. فقط «نمایش ترجمه» (نحوه‌ی چیدمانش) اینجا می‌مونه. */}
          {translationLangOptions.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>{uiLang === "en" ? "Translation display:" : "نمایش ترجمه:"}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "sentence", label: uiLang === "en" ? "Sentence by sentence" : "جمله به جمله" },
                  { key: "paragraph", label: uiLang === "en" ? "Paragraph by paragraph" : "پاراگراف به پاراگراف" },
                  { key: "none", label: uiLang === "en" ? "None" : "هیچکدام" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGranularity(opt.key)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${granularity === opt.key ? colors.teal : colors.cardBorder}`,
                      backgroundColor: granularity === opt.key ? colors.teal : "white",
                      color: granularity === opt.key ? "white" : colors.ink,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {fullStoryText && (
            <StoryUserAudioBar userAudio={userAudio} storyLang={storyLang} />
          )}

          <div className="flex flex-col gap-5">
            {paragraphs.slice(0, visibleParagraphCount).map((p, pi) => {
              const paragraphText = (p.sentences || []).map((s) => s?.text || "").join(" ");
              const showTranslations = granularity !== "none" && translationLangs.length > 0;
              return (
                <div key={pi} style={{ borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 }}>
                  {granularity === "sentence" ? (
                    <div className="flex flex-col gap-3">
                      {(p.sentences || []).map((s, si) => {
                        // فعال بودنِ این جمله — یا چون همین الان با «پخشِ کل
                        // داستان» داره خونده می‌شه، یا چون تازه از یه
                        // لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش شده (هایلایتِ
                        // موقتِ ۲.۴ ثانیه‌ای).
                        const isSentenceActive =
                          (highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi && userAudio.activeSentence.si === si)
                            : (activeStorySentence && activeStorySentence.pi === pi && activeStorySentence.si === si));
                        return (
                        <div
                          key={si}
                          ref={(el) => (sentenceElsRef.current[`${pi}-${si}`] = el)}
                          style={{ position: "relative", paddingInlineStart: 10 }}
                        >
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={s.text}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                              sentenceBoundaries={storySentenceBoundaries}
                              onOverrideClick={
                                playbackMode === "user" && userAudio.hasAudio
                                  ? () => jumpToLineInUserAudio(pi, si, sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0)
                                  : undefined
                              }
                              neuralId={`story:${storyLang}::${s.text}`}
                              neuralLabel="جمله"
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                // برخی فونت‌های سریف بارگذاری‌شده (مثل Lora) وزن ۸۰۰/۹۰۰ واقعی
                                // ندارن و مرورگر بی‌سروصدا همون رگولار رو نشون می‌ده؛ این
                                // text-stroke تضمین می‌کنه متن اصلیِ داستان همیشه پررنگ دیده
                                // بشه، صرف‌نظر از اینکه فونت خودش وزن سنگین داره یا نه.
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              {/* هایلایتِ «جمله به جمله» — دقیقاً همون جلوه‌ی
                                  دموی مرجع: یه هایلایتِ کِشیده و تنگ دورِ خودِ
                                  متن (نه یه باکسِ تمام‌عرض)، با
                                  box-decoration-break: clone که اگه جمله چند
                                  خط بشه، هر خط هایلایتِ گردشده‌ی خودش رو
                                  می‌گیره — مو‌به‌مو مثلِ تصویرِ مرجع. */}
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isSentenceActive),
                                  borderRadius: 5,
                                  padding: "2px 4px",
                                  margin: "0 -4px",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.55s ease-in-out",
                                }}
                              >
                                <ClickableSentence
                                  text={s.text}
                                  langCode={storyLang}
                                  nativeLang={nativeLang}
                                  nativeLabel={nativeLabel}
                                  aiSettings={aiSettings}
                                  color={mainTextColor}
                                  fontWeight={900}
                                  storyBaseOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                                  onSpeakOffset={(localEnd) => reportStoryWordSpoken(sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0, localEnd)}
                                  originExtra={{ storyId: currentStoryId, pi, si }}
                                />
                              </span>
                            </p>
                          </div>
                          {showTranslations &&
                            orderedTranslationLangs.map((code) => {
                              const translated = s.t?.[code];
                              // فعال بودنِ همین جمله‌ی ترجمه — یا چون همین الان
                              // دقیقاً همین زبان/جمله در حالِ پخشِ «کلِ ترجمه»ست، یا
                              // چون تازه از یه لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش
                              // شده (همون highlightSentenceِ موقتی که متنِ اصلی
                              // بالا هم باهاش هایلایت می‌شه) — قبلاً این‌جا فقط
                              // activeTranslation چک می‌شد، پس موقعِ پرش از یه
                              // داستانِ ذخیره‌شده، متنِ اصلی هایلایت/اسکرول می‌شد ولی
                              // ترجمه‌ی کنارش نه.
                              const isTranslationSentenceActive =
                                (highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si) ||
                                (activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi && activeTranslation.si === si);
                              const fullTranslated = fullTranslatedTextByLang[code];
                              const translatedStartOffset = translatedSentenceOffsetMapByLang[code]?.[`${pi}-${si}`]?.start ?? 0;
                              return (
                                <div
                                  key={code}
                                  className="flex items-start gap-2"
                                  style={{
                                    marginTop: 3,
                                    // 🐛 قبلاً این div اصلاً dir نداشت، پس جهتش از صفحه (که
                                    // برای این اپ rtl ـه) به ارث می‌رسید — یعنی توی یه
                                    // ردیفِ rtl، فرزندِ اول (متن) سمتِ راست می‌شینه و فرزندِ
                                    // دوم (گروهِ دکمه‌ها) سمتِ چپ، دقیقاً برعکسِ چیزی که
                                    // می‌خواستیم. با ثابت‌کردنِ جهتِ خودِ این ردیف رویِ ltr
                                    // (مستقل از جهتِ صفحه یا زبونِ ترجمه)، فرزندِ آخر
                                    // (گروهِ بلندگو+رفرش) همیشه سمتِ راستِ خط می‌مونه —
                                    // برایِ هر زبونی، چه صفحه rtl باشه چه ltr.
                                    direction: "ltr",
                                  }}
                                >
                                  <p
                                    dir={dirFor(code)}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      fontSize: 13.5,
                                      color: translationColor,
                                      fontWeight: 900,
                                      textAlign: "justify",
                                      fontFamily: code === "fa" ? fontFa : fontLatin,
                                    }}
                                  >
                                    <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                    {translated ? (
                                      <span
                                        style={{
                                          backgroundColor: highlightBg(highlightColor, isTranslationSentenceActive),
                                          borderRadius: 5,
                                          padding: isTranslationSentenceActive ? "2px 4px" : "2px 0",
                                          WebkitBoxDecorationBreak: "clone",
                                          boxDecorationBreak: "clone",
                                          transition: "background-color 0.55s ease-in-out",
                                        }}
                                      >
                                        <ClickableSentence
                                          text={translated}
                                          langCode={code}
                                          nativeLang={nativeLang}
                                          nativeLabel={nativeLabel}
                                          aiSettings={aiSettings}
                                          color={translationColor}
                                          fontFamily={code === "fa" ? fontFa : fontLatin}
                                          alignSourceText={s.text}
                                          alignSourceLang={storyLang}
                                          storyBaseOffset={translatedStartOffset}
                                          originExtra={{ storyId: currentStoryId, pi, si }}
                                        />
                                      </span>
                                    ) : (
                                      <span style={{ color: colors.inkSoft, opacity: 0.7 }}>{uiLang === "en" ? "(translating...)" : "(در حال ترجمه...)"}</span>
                                    )}
                                  </p>
                                  {/* هر دو دکمه (بلندگو + رفرش) همیشه توی یه گروهِ ثابت،
                                      آخرین فرزندِ ردیف (بعد از خودِ متن) قرار می‌گیرن —
                                      کاملاً مستقل از dir/جهتِ زبونِ ترجمه (که فقط رویِ خودِ
                                      <p> بالا اثر می‌ذاره، نه رویِ چیدمانِ این ردیف). قبلاً
                                      این دو دکمه با ترفندِ order+dir رویِ کلِ ردیف جابه‌جا
                                      می‌شدن که برایِ زبون‌هایِ rtl (مثلاً فارسی/عربی) نتیجه‌ی
                                      برعکس می‌داد — دکمه‌ها از هم جدا می‌شدن یا کلاً می‌رفتن
                                      سمتِ چپ. الان چون خودِ این div هیچ dirی نداره (همیشه
                                      چیدمانِ عادی/ثابت)، این گروه همیشه دقیقاً سمتِ راستِ
                                      خط می‌مونه — برایِ هر زبونی. */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                    {translated && (
                                      <SpeakButton
                                        text={translated}
                                        code={code}
                                        color={translationColor}
                                        fullText={fullTranslated || translated}
                                        startOffset={translatedStartOffset}
                                        sentenceBoundaries={translatedSentenceBoundariesByLang[code]}
                                        neuralId={`story:${currentStoryId}:${pi}:${si}:${code}`}
                                        neuralLabel="ترجمه"
                                      />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retranslateStorySentence(pi, si, code, s.text);
                                      }}
                                      disabled={!!retranslatingSentences[`${pi}-${si}-${code}`]}
                                      title={translated ? (uiLang === "en" ? "If this translation is wrong, try again" : "اگه این ترجمه اشتباهه، دوباره امتحان کن") : (uiLang === "en" ? "Not translated — tap to retry" : "ترجمه نشده — برای امتحانِ دوباره بزن")}
                                      aria-label={uiLang === "en" ? "Retranslate" : "ترجمه‌ی دوباره"}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: 4,
                                        flexShrink: 0,
                                        cursor: retranslatingSentences[`${pi}-${si}-${code}`] ? "default" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {retranslatingSentences[`${pi}-${si}-${code}`] ? (
                                        <Loader2 size={12} className="spin" color={translationColor} />
                                      ) : (
                                        <RotateCcw size={12} color={translationColor} style={{ opacity: translated ? 0.6 : 1 }} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      ref={(el) => (paragraphElsRef.current[pi] = el)}
                      style={{ position: "relative", paddingInlineStart: 10 }}
                    >
                      {(() => {
                        const isParaActive =
                          (highlightSentence && highlightSentence.pi === pi) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi)
                            : (activeStorySentence && activeStorySentence.pi === pi));
                        return (
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={paragraphText}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={paragraphBaseOffsetMap[pi] ?? 0}
                              sentenceBoundaries={storySentenceBoundaries}
                              onOverrideClick={
                                playbackMode === "user" && userAudio.hasAudio
                                  ? () => jumpToLineInUserAudio(pi, 0, paragraphBaseOffsetMap[pi] ?? 0)
                                  : undefined
                              }
                              neuralId={`story:${storyLang}::${paragraphText}`}
                              neuralLabel="پاراگراف"
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isParaActive),
                                  borderRadius: 5,
                                  padding: "2px 4px",
                                  margin: "0 -4px",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.55s ease-in-out",
                                }}
                              >
                                <ClickableSentence
                                  text={paragraphText}
                                  langCode={storyLang}
                                  nativeLang={nativeLang}
                                  nativeLabel={nativeLabel}
                                  aiSettings={aiSettings}
                                  color={mainTextColor}
                                  fontWeight={900}
                                  storyBaseOffset={paragraphBaseOffsetMap[pi] ?? 0}
                                  onSpeakOffset={(localEnd) => reportStoryWordSpoken(paragraphBaseOffsetMap[pi] ?? 0, localEnd)}
                                  originExtra={{ storyId: currentStoryId, pi, si: null }}
                                />
                              </span>
                            </p>
                          </div>
                        );
                      })()}
                      {showTranslations &&
                        orderedTranslationLangs.map((code) => {
                          const sentencesList = p.sentences || [];
                          const translated = sentencesList.length && sentencesList.every((s) => s?.t?.[code])
                            ? sentencesList.map((s) => s.t[code]).join(" ")
                            : null;
                          // فعال بودنِ این پاراگرافِ ترجمه — یا چون همین الان
                          // دقیقاً همین زبان/پاراگراف در حالِ پخشِ «کلِ ترجمه»ست، یا
                          // چون تازه از یه لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش شده
                          // (همون highlightSentenceِ موقتی که متنِ اصلی/isParaActive
                          // بالا هم باهاش هایلایت می‌شه).
                          const isTranslationParaActive =
                            (highlightSentence && highlightSentence.pi === pi) ||
                            (activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi);
                          const fullTranslated = fullTranslatedTextByLang[code];
                          const translatedStartOffset = translatedParagraphBaseOffsetMapByLang[code]?.[pi] ?? 0;
                          return (
                            <div
                              key={code}
                              className="flex items-start gap-2"
                              style={{ marginTop: 4, direction: "ltr" }}
                            >
                              <p
                                dir={dirFor(code)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 13.5,
                                  color: translationColor,
                                  fontWeight: 900,
                                  textAlign: "justify",
                                  fontFamily: code === "fa" ? fontFa : fontLatin,
                                }}
                              >
                                <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                {translated ? (
                                  <span
                                    style={{
                                      backgroundColor: highlightBg(highlightColor, isTranslationParaActive),
                                      borderRadius: 5,
                                      padding: isTranslationParaActive ? "2px 4px" : "2px 0",
                                      WebkitBoxDecorationBreak: "clone",
                                      boxDecorationBreak: "clone",
                                      transition: "background-color 0.55s ease-in-out",
                                    }}
                                  >
                                    <ClickableSentence
                                      text={translated}
                                      langCode={code}
                                      nativeLang={nativeLang}
                                      nativeLabel={nativeLabel}
                                      aiSettings={aiSettings}
                                      color={translationColor}
                                      fontFamily={code === "fa" ? fontFa : fontLatin}
                                      alignSourceText={paragraphText}
                                      alignSourceLang={storyLang}
                                      storyBaseOffset={translatedStartOffset}
                                      originExtra={{ storyId: currentStoryId, pi, si: null }}
                                    />
                                  </span>
                                ) : (
                                  <span style={{ color: colors.inkSoft, opacity: 0.7 }}>{uiLang === "en" ? "(translating...)" : "(در حال ترجمه...)"}</span>
                                )}
                              </p>
                              {/* هر دو دکمه (بلندگو + رفرش) توی یه گروهِ ثابت، همیشه آخرین
                                  فرزندِ ردیف — مستقل از dir/جهتِ زبونِ ترجمه (طبقِ همون
                                  توضیحِ نسخه‌ی جمله‌به‌جمله‌یِ بالاتر). */}
                              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                {translated && (
                                  <SpeakButton
                                    text={translated}
                                    code={code}
                                    color={translationColor}
                                    fullText={fullTranslated || translated}
                                    startOffset={translatedStartOffset}
                                    sentenceBoundaries={translatedSentenceBoundariesByLang[code]}
                                    neuralId={`story:${currentStoryId}:${pi}:p:${code}`}
                                    neuralLabel="ترجمه"
                                  />
                                )}
                                {translated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      retranslateStoryParagraph(pi, code);
                                    }}
                                    disabled={!!retranslatingSentences[`${pi}-all-${code}`]}
                                    title={uiLang === "en" ? "If this translation is wrong, try again" : "اگه این ترجمه اشتباهه، دوباره امتحان کن"}
                                    aria-label={uiLang === "en" ? "Retranslate" : "ترجمه‌ی دوباره"}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 4,
                                      flexShrink: 0,
                                      cursor: retranslatingSentences[`${pi}-all-${code}`] ? "default" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {retranslatingSentences[`${pi}-all-${code}`] ? (
                                      <Loader2 size={12} className="spin" color={translationColor} />
                                    ) : (
                                      <RotateCcw size={12} color={translationColor} style={{ opacity: 0.6 }} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {visibleParagraphCount < paragraphs.length && (
            <button
              type="button"
              onClick={() => setVisibleParagraphCount((n) => n + PARAGRAPH_PAGE_SIZE)}
              className="flex items-center justify-center gap-2"
              style={{
                width: "100%",
                marginTop: 10,
                border: `1px dashed ${colors.cardBorder}`,
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: 13,
                color: colors.teal,
              }}
            >
              {uiLang === "en"
                ? `Show more (${paragraphs.length - visibleParagraphCount} more paragraphs)`
                : `نمایش بیشتر (${paragraphs.length - visibleParagraphCount} پاراگرافِ دیگه)`}
            </button>
          )}

          <div className="flex flex-wrap gap-2 mt-4" style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            {selectedWords.map((w) => (
              <span key={w} style={{ fontSize: 11, color: colors.inkSoft, backgroundColor: colors.paper, borderRadius: 10, padding: "3px 8px" }}>
                {w}: {countOccurrences(fullStoryText, w)} {uiLang === "en" ? "times" : "بار"}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
              {uiLang === "en" ? "My notes about this story" : "یادداشتِ من دربارهٔ این داستان"}
            </p>
            <textarea
              value={storyNote}
              onChange={(e) => setStoryNote(e.target.value)}
              dir="auto"
              rows={5}
              placeholder={uiLang === "en" ? "Write anything you want about this story — no word limit…" : "هرچی می‌خوای دربارهٔ این داستان یادداشت کن — بدونِ محدودیتِ تعدادِ کلمه…"}
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                minHeight: 90,
              }}
            />
          </div>
          </>
          )}
        </div>
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
