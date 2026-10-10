// پنل گرامر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, RotateCcw, Send, Check, X, Loader2, Bookmark, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Trash2, CheckSquare, Globe, Square, ListChecks } from "lucide-react";
import RangeSliderFilter from "../../RangeSliderFilter.jsx";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { LANGUAGES } from "../constants/languages.js";
import { PRACTICE_PANEL_BORDER, READ_DONE_BORDER, READ_DONE_CHECK_GRADIENT, READ_DONE_GRADIENT, READ_DONE_SHADOW, colors } from "../ui/theme.js";
import { formatCalendarDateOnly } from "../utils/calendar.js";
import { translateFree } from "../translate/translateService.js";
import { aiNetMsg } from "../ai/callAI.js";
import { SAVED_WORDS_CHANGED_EVENT, isWordSaved, toggleSavedStoryWord } from "../words/savedStoryWords.js";
import { loadReadWordIds, saveReadWordIds } from "../words/wordTranslations.js";
import { GRAMMAR_NOTES_CHANGED_EVENT, appendGrammarNoteThread, askGrammarTeacher, loadGrammarNotes, lookupWordGrammarDetail, removeGrammarNote, removeGrammarNotesBulk, saveGrammarNote } from "../grammar/grammarNotes.js";
import { extractSpeakableText, isPersianScriptLine, stripMdInline } from "../markdown/mdUtils.jsx";
import { MiniMarkdown } from "./MiniMarkdown.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { WORDS_PAGE_SIZE } from "./WordList.jsx";

// ---------------------------------------------------------------------------
// Grammar tab — two things live here:
//   1) Saved grammar notes: detailed per-word explanations the user chose to
//      keep from the word-tap popover ("افزودن به یادگیری گرامر").
//   2) A practice chat: the learner writes a sentence, the AI corrects it if
//      needed and walks through it word by word, like a real teacher.
// `jumpTo` arrives from requestGrammarJump() (word popover) with a fresh
// word to fetch + show immediately, offering a "save" button once it loads.
// ---------------------------------------------------------------------------
// ⚡️ فیکسِ سرعت: طبقِ توضیحِ خودِ aiSettings (پایین‌تر، تویِ PhrasebookMain)
// این کامپوننت قرار بود یکی از چند کامپوننتِ React.memo‌شده باشه که از
// مموایز‌شدنِ aiSettings سود می‌بره — ولی خودِ GrammarPanel هیچ‌وقت واقعاً
// با React.memo پیچیده نشده بود! نتیجه: با اینکه پراپ‌هاش (aiSettings و
// بقیه) پایدار بودن، خودِ کامپوننت باز هم با هر رندرِ PhrasebookMain
// (مثلاً هر نیم‌ثانیه‌ی تیکِ currentTimeِ صوتِ آپلودیِ داستان، یا هر تایپ
// تو جستجوهای دیگه) کامل reconcile می‌شد. چون این کامپوننت همیشه mount
// می‌مونه (حتی وقتی تبِ فعلی «گرامر» نیست، فقط display:none می‌شه — نگاه
// کن به کامنتِ محلِ رندرش) و خودش هم شاملِ لیستِ یادداشت‌ها هم چتِ شناورِ
// تمرینِ جمله‌سازیه، این reconcile‌های الکی دقیقاً همون چیزی بودن که با
// بازشدنِ تبِ گرامر (که علاوه بر reconcile، مرورگر باید لِی‌آوت‌شو هم از
// صفر حساب کنه چون از display:none داشته میومده بیرون) حسِ کند/پرلگ
// می‌داد. با اضافه‌کردنِ خودِ React.memo، این reconcile‌های بی‌ربط کاملاً
// حذف می‌شن.
export const GrammarPanel = React.memo(function GrammarPanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  calendarSystem,
  jumpTo,
  playerBarHeight = 0,
  practiceOpacity = 100,
  setPracticeOpacity,
  onPracticePanelHeightChange,
}) {
  const [notes, setNotes] = useState([]);
  const [expandedNote, setExpandedNote] = useState(null);
  const [pending, setPending] = useState(null); // { word, sentence, langCode, markdown: "loading" | "error" | string }
  // حالتِ «انتخاب» برای حذفِ دسته‌ایِ یادداشت‌های گرامری، دسته‌بندی‌شده
  // براساسِ تاریخِ ذخیره — دقیقاً مثلِ صفحه‌ی «چندتا انتخاب‌شده»یِ مدیریتِ
  // فایلِ اندروید: هر گروهِ تاریخ یه چک‌باکسِ «انتخابِ همه‌ی این گروه»
  // داره، و یه دکمه‌ی «انتخابِ همه» هم کلِ لیست رو انتخاب می‌کنه.
  const [noteSelectMode, setNoteSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(() => new Set());
  const grammarLocale = TTS_LOCALE[nativeLang] || "en-US";
  const formatNoteDateKey = useCallback(
    (iso) => {
      const d = new Date(iso);
      if (isNaN(d)) return (nativeLang === "fa") ? "بدون تاریخ" : "No date";
      // قبلاً اینجا مستقیم toLocaleDateString(grammarLocale) صدا زده می‌شد —
      // که چون لوکیلِ fa-IR توی جاوااسکریپت به‌طور پیش‌فرض از تقویمِ شمسی
      // استفاده می‌کنه، این تاریخ همیشه شمسی نشون داده می‌شد، حتی اگه
      // کاربر توی تنظیمات «میلادی» یا «هر دو» رو انتخاب کرده باشه — و همین
      // ناهماهنگیِ بینِ این تب و بقیه‌ی جاها (مثلاً داستان‌های ذخیره‌شده) رو
      // می‌ساخت. حالا از همون تابعِ عمومیِ formatCalendarDateOnly استفاده
      // می‌کنیم که calendarSystem رو رعایت می‌کنه.
      return formatCalendarDateOnly(iso, calendarSystem || "jalali");
    },
    [calendarSystem, nativeLang]
  );
  const formatNoteTime = useCallback(
    (iso) => {
      const d = new Date(iso);
      if (isNaN(d)) return "";
      return d.toLocaleTimeString(grammarLocale, { hour: "2-digit", minute: "2-digit" });
    },
    [grammarLocale]
  );
  const noteGroups = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      const key = formatNoteDateKey(n.savedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [notes, formatNoteDateKey]);
  function toggleNoteSelected(id) {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleGroupSelected(items) {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((n) => next.has(n.id));
      items.forEach((n) => (allSelected ? next.delete(n.id) : next.add(n.id)));
      return next;
    });
  }
  function selectAllNotes() {
    setSelectedNoteIds(new Set(notes.map((n) => n.id)));
  }
  function exitNoteSelectMode() {
    setNoteSelectMode(false);
    setSelectedNoteIds(new Set());
  }
  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده روی یادداشت‌های گرامری —
  // همون الگوی WordList، ولی گروه‌بندیِ بر اساسِ تاریخ (noteGroups) دست‌نخورده
  // می‌مونه: بازه رو رویِ ترتیبِ کلیِ notes حساب می‌کنیم، بعد هر گروهِ تاریخ
  // فقط یادداشت‌هایی که توی همون بازه‌ان رو نشون می‌ده.
  const GRAMMAR_NOTES_LIST_ID = "grammarNotes";
  const [noteReadIds, setNoteReadIds] = useState(() => loadReadWordIds(GRAMMAR_NOTES_LIST_ID));
  const toggleNoteRead = (id) => {
    setNoteReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(GRAMMAR_NOTES_LIST_ID, next);
      return next;
    });
  };
  const markNoteRangeRead = (items, read) => {
    setNoteReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((n) => {
        if (read) next.add(n.id);
        else next.delete(n.id);
      });
      saveReadWordIds(GRAMMAR_NOTES_LIST_ID, next);
      return next;
    });
  };
  const [noteRangeInput, setNoteRangeInput] = useState({ from: "", to: "" });
  // یه‌بار محاسبه می‌شه (نه دوبار با دو تا IIFEِ جدا)، و همیشه یه آرایه
  // برمی‌گردونه — حتی وقتی notes خالیه — که استفاده‌ی بعدی (.map) هیچ‌وقت
  // رو null صدا زده نشه.
  const rangedNoteGroups = useMemo(() => {
    if (!notes.length) return [];
    const indexById = new Map(notes.map((n, idx) => [n.id, idx]));
    const defaultTo = Math.min(notes.length, WORDS_PAGE_SIZE) || notes.length || 1;
    const parsedFrom = parseInt(noteRangeInput.from, 10);
    const parsedTo = parseInt(noteRangeInput.to, 10);
    const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
    const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
    const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(notes.length, 1));
    const clampedTo = Math.min(Math.max(clampedFrom, effTo), notes.length || clampedFrom);
    const inRange = (n) => {
      const idx = indexById.get(n.id);
      return idx != null && idx >= clampedFrom - 1 && idx < clampedTo;
    };
    return noteGroups
      .map((group) => ({ ...group, items: group.items.filter(inRange) }))
      .filter((group) => group.items.length > 0);
  }, [notes, noteGroups, noteRangeInput]);
  function deleteSelectedNotes() {
    if (!selectedNoteIds.size) return;
    if (!window.confirm((nativeLang === "fa") ? `${selectedNoteIds.size} یادداشتِ انتخاب‌شده پاک بشه؟` : `Delete ${selectedNoteIds.size} selected notes?`)) return;
    removeGrammarNotesBulk(selectedNoteIds);
    setExpandedNote(null);
    exitNoteSelectMode();
  }

  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [chatMessages, setChatMessages] = useState([]); // [{ role: "user"|"ai", text }]
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);
  // ویرایشِ پیام‌هایی که خودِ کاربر توی این چت فرستاده — با تپ‌کردن رویِ
  // پیام، اول یه دکمه‌ی «ویرایش» ظاهر می‌شه (tappedMsgIndex)؛ با زدنش،
  // همون پیام به یه textarea تبدیل می‌شه (editingMsgIndex/editingMsgText).
  // هیچ محدودیتی توی تعدادِ دفعاتِ ویرایش نیست — هر پیام هر چندبار که
  // بخوای قابلِ بازکردن و اصلاح‌کردنه.
  const [tappedMsgIndex, setTappedMsgIndex] = useState(null);
  const [editingMsgIndex, setEditingMsgIndex] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const editMsgTextareaRef = useRef(null);
  // نوارِ «تمرین جمله‌سازی» یه Bottom Sheetِ آزادانه قابلِ‌کشیدنه، دقیقاً
  // مثلِ نقشه‌ی گوگل ولی بدونِ اسنپ‌شدن به نقاطِ از‌پیش‌تعیین‌شده — هرجا
  // کاربر با انگشتش رهاش کنه، ارتفاع دقیقاً همون‌جا می‌مونه (بینِ ارتفاعِ
  // سرتیتر و ۹۲٪ صفحه). فقط دو حالت داریم:
  //   • peek — فقط سرتیترِ نوار دیده می‌شه (حالتِ جمع‌شده‌ی پیش‌فرض)
  //   • open — هر ارتفاعی که خودِ کاربر با کشیدن انتخاب کرده (practiceOpenHeight)
  // با کشیدنِ سرتیتر (grip handle) ارتفاع لحظه‌ای تغییر می‌کنه؛ با رهاکردن،
  // همون ارتفاعِ دقیق ذخیره می‌شه (مگه این‌که تا نزدیکِ ته کشیده بشه، که
  // اون‌وقت کاملاً جمع می‌شه). تپ‌ِ ساده (بدونِ حرکتِ محسوس) هم بینِ
  // peek و آخرین ارتفاعِ بازِ ذخیره‌شده سوییچ می‌کنه. خودِ گفتگو
  // (chatMessages) در هر دو حالت دست‌نخورده می‌مونه، چون این کامپوننت
  // همیشه mount شده‌ست.
  const [practiceSheet, setPracticeSheet] = useState("peek");
  const [practiceOpenHeight, setPracticeOpenHeight] = useState(null);
  const [practiceDragHeight, setPracticeDragHeight] = useState(null);
  const practicePanelRef = useRef(null);
  const practiceHeaderRef = useRef(null);
  const practiceDragInfoRef = useRef(null);
  const [practiceHeaderH, setPracticeHeaderH] = useState(56);
  const [practiceViewportH, setPracticeViewportH] = useState(() =>
    typeof window === "undefined" ? 800 : Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight)
  );

  // جابجاییِ آزادِ کلِ باکس (نه فقط ارتفاعش) — برای وقتی که کیبوردِ
  // موبایل بازه و باکس رویِ متنی که کاربر می‌خواد ببینه رو می‌پوشونه.
  // با دستگیره‌ی مخصوصِ «جابجایی» (کنارِ سرتیتر)، کاربر می‌تونه کلِ باکس
  // رو با انگشتش هرجایی از صفحه ببره؛ practiceMoveOffset همون جابجاییِ
  // ذخیره‌شده‌ست (نسبت به جای اصلیِ چسبیده‌به‌کف). با دکمه‌ی بازگشت
  // (RotateCcw)، دقیقاً به همون جای اولش برمی‌گرده (offset صفر با انیمیشن).
  const [practiceMoveOffset, setPracticeMoveOffset] = useState({ x: 0, y: 0 });
  const [practiceMoveDragOffset, setPracticeMoveDragOffset] = useState(null); // آفستِ لحظه‌ایِ حینِ کشیدن
  const practiceMoveDragInfoRef = useRef(null);
  const practiceMoved = practiceMoveOffset.x !== 0 || practiceMoveOffset.y !== 0;
  const practiceLiveMoveOffset = practiceMoveDragOffset || practiceMoveOffset;

  // ارتفاعِ واقعیِ خودِ سرتیتر رو اندازه می‌گیریم (وابسته به فونت/چیدمان)،
  // تا نقطه‌ی «peek» همیشه دقیقاً هم‌اندازه‌ی سرتیتر باشه، نه یه عددِ ثابتِ
  // حدسی.
  useLayoutEffect(() => {
    const el = practiceHeaderRef.current;
    if (!el) return;
    setPracticeHeaderH(Math.ceil(el.getBoundingClientRect().height));
  }, []);

  // ارتفاعِ واقعیِ دیدِ صفحه (viewport) رو دنبال می‌کنیم — نه فقط با resize
  // معمولی، بلکه با visualViewport هم، چون وقتی کیبوردِ موبایل باز می‌شه،
  // این چیزیه که واقعاً کوچیک می‌شه (برخلافِ 100vh که خیلی مرورگرها
  // عوضش نمی‌کنن). این باعث می‌شه سقفِ «full» با بازشدنِ کیبورد درست
  // تنظیم بشه و پنل هیچ‌وقت از چیزی که واقعاً دیده می‌شه بزرگ‌تر نشه.
  useEffect(() => {
    const update = () => {
      const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      setPracticeViewportH(Math.round(h));
    };
    update();
    window.addEventListener("resize", update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    }
    return () => {
      window.removeEventListener("resize", update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      }
    };
  }, []);

  const practiceSnapHeight = useCallback(
    (state) => {
      if (state === "peek") return practiceHeaderH;
      return practiceOpenHeight != null ? practiceOpenHeight : Math.round(practiceViewportH * 0.5);
    },
    [practiceViewportH, practiceHeaderH, practiceOpenHeight]
  );

  const practiceCurrentHeight = practiceDragHeight != null ? practiceDragHeight : practiceSnapHeight(practiceSheet);

  const handlePracticeMoveStart = useCallback(
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.stopPropagation();
      practiceMoveDragInfoRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffset: practiceMoveOffset,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    },
    [practiceMoveOffset]
  );

  const handlePracticeMoveMove = useCallback(
    (e) => {
      const info = practiceMoveDragInfoRef.current;
      if (!info) return;
      e.stopPropagation();
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      const vw = typeof window === "undefined" ? 400 : window.innerWidth;
      const panelH = practiceCurrentHeight;
      // فقط اجازه‌ی بالابردن می‌دیم (نه پایین‌تر از جای اصلیِ چسبیده‌به‌کف)
      // و اجازه‌ی چپ/راست تا جایی که حداقل بخشی از باکس رویِ صفحه بمونه.
      const minY = -(Math.max(0, practiceViewportH - panelH));
      const maxY = 0;
      const maxX = Math.max(0, vw - 60);
      const minX = -maxX;
      const nextX = Math.min(maxX, Math.max(minX, info.startOffset.x + dx));
      const nextY = Math.min(maxY, Math.max(minY, info.startOffset.y + dy));
      setPracticeMoveDragOffset({ x: nextX, y: nextY });
    },
    [practiceViewportH, practiceCurrentHeight]
  );

  const handlePracticeMoveEnd = useCallback(
    (e) => {
      try {
        e && e.currentTarget && e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const info = practiceMoveDragInfoRef.current;
      practiceMoveDragInfoRef.current = null;
      if (!info) return;
      setPracticeMoveOffset((prev) => practiceMoveDragOffset || prev);
      setPracticeMoveDragOffset(null);
    },
    [practiceMoveDragOffset]
  );

  const resetPracticePosition = useCallback(() => {
    // اگه به هر دلیلی (مثلاً از‌دست‌رفتنِ رویدادِ pointerup روی موبایل)
    // یه کشیدنِ نیمه‌کاره‌ی جابجایی گیر کرده باشه، اول اون رو هم پاک
    // می‌کنیم — وگرنه فرمولِ practiceLiveMoveOffset همچنان از آفستِ
    // گیرکرده استفاده می‌کنه و باکس با دکمه‌ی بازگشت جابجا نمی‌شه.
    practiceMoveDragInfoRef.current = null;
    setPracticeMoveDragOffset(null);
    setPracticeMoveOffset({ x: 0, y: 0 });
  }, []);

  const handlePracticeDragStart = useCallback(
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      practiceDragInfoRef.current = {
        startY: e.clientY,
        startHeight: practiceSnapHeight(practiceSheet),
        moved: false,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    },
    [practiceSheet, practiceSnapHeight]
  );

  const handlePracticeDragMove = useCallback(
    (e) => {
      const info = practiceDragInfoRef.current;
      if (!info) return;
      const delta = info.startY - e.clientY; // کشیدن به بالا = ارتفاع بیشتر
      if (Math.abs(delta) > 4) info.moved = true;
      const min = practiceHeaderH;
      const max = Math.round(practiceViewportH * 0.92);
      setPracticeDragHeight(Math.min(max, Math.max(min, info.startHeight + delta)));
    },
    [practiceHeaderH, practiceViewportH]
  );

  const handlePracticeDragEnd = useCallback(() => {
    const info = practiceDragInfoRef.current;
    practiceDragInfoRef.current = null;
    if (!info) return;
    if (!info.moved) {
      // تپِ ساده (بدونِ کشیدنِ محسوس) — فقط بینِ جمع و بازِ ذخیره‌شده سوییچ کن.
      setPracticeSheet((prev) => (prev === "peek" ? "open" : "peek"));
      setPracticeDragHeight(null);
      return;
    }
    const finalHeight = practiceDragHeight != null ? practiceDragHeight : info.startHeight;
    if (finalHeight <= practiceHeaderH + 2) {
      // تا نزدیکِ ته کشیده شد => کاملاً جمع کن.
      setPracticeSheet("peek");
    } else {
      // هر ارتفاعی که کاربر با انگشتش انتخاب کرده رو دقیقاً همون نگه دار —
      // بدونِ اسنپ‌کردن به نقاطِ از‌پیش‌تعیین‌شده.
      setPracticeSheet("open");
      setPracticeOpenHeight(finalHeight);
    }
    setPracticeDragHeight(null);
  }, [practiceDragHeight, practiceHeaderH]);

  useLayoutEffect(() => {
    const el = practicePanelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && onPracticePanelHeightChange) onPracticePanelHeightChange(Math.ceil(h));
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (onPracticePanelHeightChange) onPracticePanelHeightChange(0);
    };
  }, [onPracticePanelHeightChange]);

  // Follow-up "ask about this note" box shown under each expanded saved
  // note. Keyed by note id since several notes can (in theory) be expanded
  // one at a time. Answers here get appended straight onto the note itself
  // (see appendGrammarNoteThread), so they're always persisted already.
  const [noteAskInput, setNoteAskInput] = useState({});
  const [noteAskLoading, setNoteAskLoading] = useState({});
  const [noteAskError, setNoteAskError] = useState({});
  const [noteAskFailedQ, setNoteAskFailedQ] = useState({});   // note.id -> آخرین پرسشی که جوابش نیامد (برای «تلاش دوباره»)
  const noteElsRef = useRef({}); // id -> DOM node, for auto-read scroll
  const noteAskTextareaRefs = useRef({}); // id -> textarea DOM node, for auto-grow
  const [savedWordsTick, setSavedWordsTick] = useState(0); // bumps when a word gets saved/removed, to refresh bookmark icons

  useEffect(() => {
    const bump = () => setSavedWordsTick((t) => t + 1);
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
  }, []);

  const isFa = nativeLang === "fa";

  useEffect(() => {
    const refresh = () => setNotes(loadGrammarNotes());
    refresh();
    window.addEventListener(GRAMMAR_NOTES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(GRAMMAR_NOTES_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!jumpTo || !jumpTo.word) return;
    let cancelled = false;
    setPending({ word: jumpTo.word, sentence: jumpTo.sentence, langCode: jumpTo.langCode, markdown: "loading" });
    lookupWordGrammarDetail({
      word: jumpTo.word,
      sentence: jumpTo.sentence,
      langCode: jumpTo.langCode,
      nativeLang,
      nativeLabel,
      aiSettings,
      targetOrder,
    })
      .then((md) => {
        if (!cancelled) setPending((p) => (p && p.word === jumpTo.word ? { ...p, markdown: md } : p));
      })
      .catch(() => {
        if (!cancelled) setPending((p) => (p && p.word === jumpTo.word ? { ...p, markdown: "error" } : p));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chatMessages, chatLoading]);

  // Auto-grow the textarea as the learner types multi-line sentences.
  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [chatInput]);

  function clearChat() {
    setChatMessages([]);
    setChatError("");
  }

  async function askAboutNote(note, retryQuestion) {
    const question = (retryQuestion || noteAskInput[note.id] || "").trim();
    if (!question || noteAskLoading[note.id]) return;
    if (!retryQuestion) setNoteAskInput((s) => ({ ...s, [note.id]: "" }));
    setNoteAskError((s) => ({ ...s, [note.id]: "" }));
    setNoteAskLoading((s) => ({ ...s, [note.id]: true }));
    const ta = noteAskTextareaRefs.current[note.id];
    if (ta) ta.style.height = "auto";
    try {
      const history = [
        { role: "user", text: note.sentence || note.word },
        { role: "ai", text: note.markdown },
        ...(note.thread || []).flatMap((t) => [
          { role: "user", text: t.question },
          { role: "ai", text: t.answer },
        ]),
      ];
      const answer = await askGrammarTeacher({
        userSentence: question,
        langCode: note.langCode,
        nativeLang,
        nativeLabel,
        aiSettings,
        history,
        targetOrder,
      });
      appendGrammarNoteThread(note.id, { question, answer });
      setNoteAskFailedQ((s) => ({ ...s, [note.id]: "" }));
    } catch (e) {
      setNoteAskFailedQ((s) => ({ ...s, [note.id]: question }));
      setNoteAskError((s) => ({
        ...s,
        [note.id]: e?.message?.replace(/^ai-backend-error:\s*/, "") || aiNetMsg(),
      }));
    } finally {
      setNoteAskLoading((s) => ({ ...s, [note.id]: false }));
    }
  }

  // 🔄 تلاشِ دوباره برایِ «توضیحِ کاملِ لغت» (کادرِ pending) وقتی هوش مصنوعی جواب نداد
  function retryPending() {
    const p = pending;
    if (!p || p.markdown === "loading") return;
    setPending({ ...p, markdown: "loading" });
    lookupWordGrammarDetail({
      word: p.word,
      sentence: p.sentence,
      langCode: p.langCode,
      nativeLang,
      nativeLabel,
      aiSettings,
      targetOrder,
    })
      .then((md) => setPending((cur) => (cur && cur.word === p.word ? { ...cur, markdown: md } : cur)))
      .catch(() => setPending((cur) => (cur && cur.word === p.word ? { ...cur, markdown: "error" } : cur)));
  }

  async function sendChat() {
    const sentence = chatInput.trim();
    if (!sentence || chatLoading) return;
    setChatInput("");
    setChatError("");
    const nextMessages = [...chatMessages, { role: "user", text: sentence }];
    setChatMessages(nextMessages);
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: sentence,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: chatMessages,
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: sentence }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || aiNetMsg());
    } finally {
      setChatLoading(false);
    }
  }

  // وقتی هوش مصنوعی خطا می‌ده، آخرین پیامِ کاربر (که جوابش نیومده) توی
  // chatMessages می‌مونه بدونِ این‌که دوباره اضافه‌ش کنیم — فقط همون
  // درخواست رو دوباره می‌فرستیم، با تاریخچه‌ی درست (بدونِ خودِ این پیام).
  async function retryLastMessage() {
    const last = chatMessages[chatMessages.length - 1];
    if (!last || last.role !== "user" || chatLoading) return;
    setChatError("");
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: last.text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: chatMessages.slice(0, -1),
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: last.text }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || aiNetMsg());
    } finally {
      setChatLoading(false);
    }
  }

  function startEditingMsg(i, currentText) {
    setTappedMsgIndex(null);
    setEditingMsgIndex(i);
    setEditingMsgText(currentText);
  }

  function cancelEditingMsg() {
    setEditingMsgIndex(null);
    setEditingMsgText("");
  }

  // ویرایشِ یه پیامِ قبلیِ کاربر — دقیقاً مثلِ اپ‌های هوش‌مصنوعیِ معروف: بعد
  // از ذخیره، خودِ همون پیام با متنِ تازه جایگزین می‌شه، هر چی *بعدِ* اون
  // بود (جوابِ قدیمیِ هوش‌مصنوعی + هر پیامِ بعدی‌تر) حذف می‌شه، و یه درخواستِ
  // تازه با متنِ ویرایش‌شده فرستاده می‌شه تا هوش مصنوعی دوباره — با توجه به
  // متنِ جدید — جواب بده.
  async function saveEditingMsg() {
    const text = editingMsgText.trim();
    const idx = editingMsgIndex;
    if (!text || idx == null) {
      cancelEditingMsg();
      return;
    }
    const historyBeforeEdit = chatMessages.slice(0, idx);
    const truncated = [...historyBeforeEdit, { role: "user", text }];
    setChatMessages(truncated);
    cancelEditingMsg();
    setChatError("");
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: historyBeforeEdit,
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: text }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || aiNetMsg());
    } finally {
      setChatLoading(false);
    }
  }

  // اتوگرو برای textareaـیِ ویرایشِ پیام، دقیقاً مثلِ اتوگروی کادرِ اصلی.
  useEffect(() => {
    const el = editMsgTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [editingMsgText, editingMsgIndex]);

  const langOptions = targetOrder && targetOrder.length ? targetOrder : LANGUAGES.map((l) => l.code);
  // ترجمه‌ی توضیحِ هر پیامِ هوش‌مصنوعی (که به زبانِ مادریِ کاربر نوشته
  // می‌شه) به هر کدوم از زبان‌های مقصدی که خودِ کاربر از تنظیماتِ اپ
  // چیده — با زدنِ تراشه‌ی هر زبان، همون‌جا زیرِ پیام باز/بسته می‌شه.
  // کلید: `${msgIndex}:${langCode}` → "loading" | متنِ ترجمه‌شده.
  const [msgTranslations, setMsgTranslations] = useState({});
  const [openMsgTranslation, setOpenMsgTranslation] = useState({}); // msgIndex -> langCode | null
  async function toggleMessageTranslation(msgIndex, text, langCode) {
    setOpenMsgTranslation((prev) => ({ ...prev, [msgIndex]: prev[msgIndex] === langCode ? null : langCode }));
    const key = `${msgIndex}:${langCode}`;
    if (msgTranslations[key]) return;
    setMsgTranslations((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const plain = String(text || "")
        .split(/\r?\n/)
        .map((l) => stripMdInline(l))
        .join("\n");
      const result = await translateFree(plain, langCode, "auto", aiSettings);
      setMsgTranslations((prev) => ({ ...prev, [key]: result || "—" }));
    } catch {
      setMsgTranslations((prev) => ({ ...prev, [key]: "—" }));
    }
  }
  // چون کرکره‌ی انتخابِ زبانِ تمرین از هدرِ باکس حذف شد، زبانِ تمرین همیشه
  // به اولین زبانِ مقصدی که کاربر از تنظیماتِ اصلیِ اپ چیده (targetOrder[0])
  // گره می‌خوره؛ با عوض‌شدنِ اون ترتیب، این هم خودکار به‌روز می‌شه.
  useEffect(() => {
    const first = targetOrder && targetOrder.length ? targetOrder[0] : null;
    if (first) setChatLang(first);
  }, [targetOrder && targetOrder[0]]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>گرامر</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          توضیحات گرامری‌ای که از روی لغت‌های داستان ذخیره کردی اینجاست. پایین‌تر هم می‌تونی با هوش مصنوعی جمله بنویسی تا مثل یه معلم زبان، اصلاحش کنه و گرامرش رو کلمه‌به‌کلمه بهت یاد بده — یا هر سوال گرامری دیگه‌ای هم داشتی همون‌جا بپرسی.
        </p>
      </div>

      {pending && (
        <div style={{ backgroundColor: "white", border: `1px solid ${colors.gold}`, borderRadius: 16, padding: 16 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SpeakButton text={pending.word} code={pending.langCode} neuralLabel="لغت" />
              <p dir="auto" style={{ fontWeight: 700 }}>
                {pending.word}
              </p>
              <button
                onClick={() => toggleSavedStoryWord(pending.word, pending.langCode)}
                title={isWordSaved(pending.word, pending.langCode) ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت"}
                style={{ color: isWordSaved(pending.word, pending.langCode) ? colors.gold : colors.inkSoft, display: "flex" }}
              >
                <Bookmark size={14} fill={isWordSaved(pending.word, pending.langCode) ? colors.gold : "none"} />
              </button>
            </div>
            <button onClick={() => setPending(null)} style={{ color: colors.inkSoft, display: "flex" }}>
              <X size={16} />
            </button>
          </div>
          {pending.markdown === "loading" && (
            <div className="flex items-center gap-1" style={{ fontSize: 13, color: colors.inkSoft }}>
              <Loader2 size={14} className="spin" />
              در حال آماده کردن توضیح کامل...
            </div>
          )}
          {pending.markdown === "error" && (
            <div className="flex items-center justify-between gap-2">
              <p style={{ color: colors.rose, fontSize: 13, margin: 0 }}>{aiNetMsg()}</p>
              <button
                onClick={retryPending}
                className="flex items-center gap-1"
                style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "4px 10px", flexShrink: 0 }}
              >
                <RotateCcw size={12} />
                تلاش دوباره
              </button>
            </div>
          )}
          {pending.markdown && pending.markdown !== "loading" && pending.markdown !== "error" && (
            <>
              <MiniMarkdown text={pending.markdown} speakCode={pending.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />
              <button
                onClick={() => {
                  saveGrammarNote({
                    langCode: pending.langCode,
                    word: pending.word,
                    sentence: pending.sentence,
                    markdown: pending.markdown,
                  });
                  setPending(null);
                }}
                className="flex items-center gap-1"
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                  background: colors.gold,
                  borderRadius: 8,
                  padding: "6px 12px",
                }}
              >
                <Bookmark size={13} />
                ذخیره در یادگیری گرامر
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notes.length === 0 && !pending && (
          <p style={{ fontSize: 13, color: colors.inkSoft }}>
            هنوز نکته‌ی گرامری‌ای ذخیره نکردی. روی هر کلمه‌ی داخل داستان بزن و «افزودن به یادگیری گرامر» رو انتخاب کن.
          </p>
        )}
        {notes.length > 0 && !noteSelectMode && (
          <div className="flex justify-end">
            <button
              onClick={() => setNoteSelectMode(true)}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: colors.rose, fontWeight: 700 }}
            >
              <ListChecks size={13} />
              انتخاب / حذف
            </button>
          </div>
        )}
        {notes.length > 0 && noteSelectMode && (
          <div
            className="flex items-center justify-between flex-wrap"
            style={{ gap: 8, backgroundColor: colors.goldSoft, borderRadius: 12, padding: "8px 10px" }}
          >
            <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>
              {selectedNoteIds.size > 0 ? `${selectedNoteIds.size} مورد انتخاب شد` : "انتخاب کن"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllNotes}
                className="flex items-center gap-1"
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}
              >
                <ListChecks size={13} />
                انتخاب همه
              </button>
              <button
                onClick={deleteSelectedNotes}
                disabled={!selectedNoteIds.size}
                className="flex items-center gap-1"
                style={{ fontSize: 12, fontWeight: 700, color: colors.rose, opacity: selectedNoteIds.size ? 1 : 0.5 }}
              >
                <Trash2 size={13} />
                حذف
              </button>
              <button onClick={exitNoteSelectMode} style={{ fontSize: 12, color: colors.inkSoft, fontWeight: 700 }}>
                انصراف
              </button>
            </div>
          </div>
        )}
        {(() => {
          if (!notes.length) return null;
          const defaultTo = Math.min(notes.length, WORDS_PAGE_SIZE) || notes.length || 1;
          const parsedFrom = parseInt(noteRangeInput.from, 10);
          const parsedTo = parseInt(noteRangeInput.to, 10);
          const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
          const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
          const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(notes.length, 1));
          const clampedTo = Math.min(Math.max(clampedFrom, effTo), notes.length || clampedFrom);
          const visibleTotal = rangedNoteGroups.reduce((sum, g) => sum + g.items.length, 0);
          const readCountInRange = rangedNoteGroups.reduce((sum, g) => sum + g.items.filter((n) => noteReadIds.has(n.id)).length, 0);
          const readCountTotal = notes.filter((n) => noteReadIds.has(n.id)).length;
          const allInRangeFlat = rangedNoteGroups.flatMap((g) => g.items);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RangeSliderFilter
                min={1}
                max={notes.length}
                from={clampedFrom}
                to={clampedTo}
                onFromChange={(val) => setNoteRangeInput((prev) => ({ ...prev, from: val }))}
                onToChange={(val) => setNoteRangeInput((prev) => ({ ...prev, to: val }))}
                readCount={readCountInRange}
                totalInRange={visibleTotal}
                readCountTotal={readCountTotal}
                label="یادداشت‌ها"
                uiLang="fa"
                colors={colors}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => markNoteRangeRead(allInRangeFlat, true)}
                  style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                >
                  علامت‌گذاری همه به خوانده‌شده
                </button>
                <button
                  type="button"
                  onClick={() => markNoteRangeRead(allInRangeFlat, false)}
                  style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                >
                  پاک‌کردن علامت این بازه
                </button>
              </div>
            </div>
          );
        })()}
        {rangedNoteGroups.map((group) => {
          const groupAllSelected = noteSelectMode && group.items.every((n) => selectedNoteIds.has(n.id));
          return (
            <div key={group.label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                {noteSelectMode && (
                  <button
                    onClick={() => toggleGroupSelected(group.items)}
                    style={{ color: groupAllSelected ? colors.gold : colors.inkSoft, display: "flex" }}
                    title="انتخابِ همه‌ی این تاریخ"
                  >
                    {groupAllSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                )}
                <p style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft }}>{group.label}</p>
              </div>
              {group.items.map((n) => {
                const isOpen = expandedNote === n.id;
                const langLabel = LANGUAGES.find((l) => l.code === n.langCode)?.label || n.langCode;
                const wordSaved = isWordSaved(n.word, n.langCode);
                const isSelected = selectedNoteIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    ref={(el) => (noteElsRef.current[n.id] = el)}
                    style={{
                      background: noteReadIds.has(n.id) ? READ_DONE_GRADIENT : "white",
                      border: `1px solid ${isSelected ? colors.gold : noteReadIds.has(n.id) ? READ_DONE_BORDER : colors.cardBorder}`,
                      borderRadius: 14,
                      padding: 12,
                      boxShadow: noteReadIds.has(n.id) ? READ_DONE_SHADOW : "none",
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      onClick={() => (noteSelectMode ? toggleNoteSelected(n.id) : setExpandedNote(isOpen ? null : n.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="flex items-center gap-2">
                        {/* دایره‌ی خوانده‌شده همیشه اولین عضوِ این گروه — تا
                            سمتِ راستِ کارت بمونه، یکسان با بقیه‌ی تب‌ها (قبلاً
                            توی گروهِ دومِ دکمه‌ها، سمتِ چپ بود). */}
                        {!noteSelectMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNoteRead(n.id);
                            }}
                            aria-label="علامت‌زدن به‌عنوان خوانده‌شده"
                            style={{
                              flexShrink: 0,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: noteReadIds.has(n.id) ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                              background: noteReadIds.has(n.id) ? READ_DONE_CHECK_GRADIENT : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {noteReadIds.has(n.id) && <Check size={13} color="white" strokeWidth={3} />}
                          </button>
                        )}
                        {noteSelectMode ? (
                          <span style={{ color: isSelected ? colors.gold : colors.inkSoft, display: "flex" }}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                        ) : (
                          <SpeakButton text={extractSpeakableText(n.markdown) || n.word} code={n.langCode} neuralId={`grammar:${n.id}`} neuralLabel="یادداشت گرامری" />
                        )}
                        <div>
                          <p dir="auto" style={{ fontWeight: 700, fontSize: 14 }}>
                            {n.word}
                          </p>
                          <p style={{ fontSize: 11, color: colors.inkSoft }}>
                            {langLabel}
                            {n.savedAt ? ` · ${formatNoteTime(n.savedAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      {!noteSelectMode && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSavedStoryWord(n.word, n.langCode);
                            }}
                            style={{ color: wordSaved ? colors.gold : colors.inkSoft, display: "flex" }}
                            title={wordSaved ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت"}
                          >
                            <Bookmark size={14} fill={wordSaved ? colors.gold : "none"} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGrammarNote(n.id);
                            }}
                            style={{ color: colors.inkSoft, display: "flex" }}
                            title="حذف"
                          >
                            <X size={14} />
                          </button>
                          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </div>
                      )}
                    </div>
                    {isOpen && !noteSelectMode && (
                <div style={{ marginTop: 8, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 8 }}>
                  <MiniMarkdown text={n.markdown} speakCode={n.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />

                  {(n.thread || []).map((t, i) => (
                    <div key={i} style={{ marginTop: 10 }}>
                      <div dir="auto" style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 4 }}>
                        {t.question}
                      </div>
                      <div style={{ background: colors.goldSoft, borderRadius: 10, padding: "8px 10px" }}>
                        <MiniMarkdown text={t.answer} speakCode={n.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 items-end" style={{ marginTop: 10, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
                    <textarea
                      ref={(el) => (noteAskTextareaRefs.current[n.id] = el)}
                      dir="auto"
                      rows={1}
                      value={noteAskInput[n.id] || ""}
                      onChange={(e) => {
                        setNoteAskInput((s) => ({ ...s, [n.id]: e.target.value }));
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          askAboutNote(n);
                        }
                      }}
                      placeholder={
                        isFa
                          ? "سوالی درباره‌ی همین نکته داری؟ (برای خط جدید Enter، برای پرسیدن دکمه رو بزن)"
                          : "Ask about this note... (Enter for new line, tap the button to ask)"
                      }
                      style={{
                        flex: 1,
                        border: `1px solid ${colors.cardBorder}`,
                        borderRadius: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        fontFamily: "inherit",
                        resize: "none",
                        lineHeight: 1.6,
                        maxHeight: 120,
                      }}
                    />
                    <button
                      onClick={() => askAboutNote(n)}
                      disabled={noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim()}
                      style={{
                        backgroundColor: colors.gold,
                        color: "white",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        opacity: noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim() ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {noteAskLoading[n.id] ? <Loader2 size={13} className="spin" /> : (isFa ? "بپرس" : "Ask")}
                    </button>
                  </div>
                  {noteAskError[n.id] && (
                    <div className="flex items-center justify-between gap-2" style={{ marginTop: 4 }}>
                      <p style={{ fontSize: 11, color: colors.rose, margin: 0 }}>{noteAskError[n.id]}</p>
                      {noteAskFailedQ[n.id] && (
                        <button
                          onClick={() => askAboutNote(n, noteAskFailedQ[n.id])}
                          disabled={noteAskLoading[n.id]}
                          className="flex items-center gap-1"
                          style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "4px 10px", flexShrink: 0, opacity: noteAskLoading[n.id] ? 0.6 : 1 }}
                        >
                          <RotateCcw size={12} />
                          تلاش دوباره
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
            </div>
          );
        })}
      </div>

      {/* نوارِ «تمرین جمله‌سازی با هوش مصنوعی» — یه Bottom Sheetِ
          قابلِ‌کشیدنه با سه نقطه‌ی قفل (peek/half/full)، همیشه چسبیده به
          کفِ صفحه (bottom: 0)، درست بالای نوارِ پلیر. با createPortal
          مستقیم زیرِ <body> رندر می‌شه — چون GrammarPanel خودش داخلِ یه
          div با display:none قایم می‌شه وقتی تبِ فعلی «گرامر» نیست (برای
          این‌که چتِ تمرین از بین نره)، و اگه همین‌جا با position:fixed
          می‌موند، آبا/جد با display:none باعث می‌شد این نوار هم با رفتن به
          تب‌های دیگه قایم بشه. با پورتال، این نوار از اون محدودیت فرار
          می‌کنه و توی همه‌ی تب‌ها همیشه روی صفحه باقی می‌مونه (sticky در
          تمامِ صفحات). */}
      {createPortal(
        <div
          ref={practicePanelRef}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 42,
            height: practiceCurrentHeight,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: colors.paperDark,
            border: `1px solid ${PRACTICE_PANEL_BORDER}`,
            borderTop: `1px solid ${PRACTICE_PANEL_BORDER}`,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.12)",
            transform: `translate3d(${practiceLiveMoveOffset.x}px, ${practiceLiveMoveOffset.y}px, 0)`,
            transition:
              practiceDragHeight != null
                ? "none"
                : practiceMoveDragOffset != null
                ? "none"
                : "height 0.24s cubic-bezier(.2,.8,.2,1), transform 0.24s cubic-bezier(.2,.8,.2,1)",
            // توجه: touchAction:none اینجا (روی کلِ باکس) عمداً گذاشته نشده —
            // چون این ویژگی روی تمامِ فرزندها هم اثر می‌ذاره (فرزند نمی‌تونه
            // با pan-y دوباره بازش کنه) و اسکرولِ لمسیِ لیستِ پیام‌ها رو
            // می‌بست. به‌جاش فقط روی خودِ دستگیره‌ها (هدر/گریپِ جابجایی)
            // که واقعاً از پوینترایونت‌های دستی استفاده می‌کنن گذاشته می‌شه.
          }}
        >
          {/* هدرِ رنگیِ نوار — تیل توپر با متنِ سفید؛ خودِ این هدر همون
              دستگیره‌ی کشیدنه (grip handle). کشیدنِ آروم بالا/پایین ارتفاع
              رو لحظه‌ای عوض می‌کنه؛ با رهاکردن، به نزدیک‌ترین نقطه‌ی قفل
              (جمع/نیمه/کامل) اسنپ می‌شه. یه تپِ ساده (بدونِ کشیدنِ محسوس)
              هم بینِ جمع و نیمه سوییچ می‌کنه. کادرِ نوشتنِ پایین همیشه (در
              هر سه حالت) در دسترسه، دقیقاً مثلِ نوارِ ارسالِ پیامِ
              اپ‌های چت. */}
          <div
            ref={practiceHeaderRef}
            onPointerDown={handlePracticeDragStart}
            onPointerMove={handlePracticeDragMove}
            onPointerUp={handlePracticeDragEnd}
            onPointerCancel={handlePracticeDragEnd}
            role="button"
            tabIndex={0}
            aria-expanded={practiceSheet !== "peek"}
            aria-label={
              practiceSheet === "peek"
                ? "بازکردنِ گفتگوی تمرین جمله‌سازی و گرامر"
                : "جمع‌کردنِ گفتگوی تمرین جمله‌سازی و گرامر"
            }
            style={{
              background: `linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
              cursor: "grab",
              userSelect: "none",
              flexShrink: 0,
              touchAction: "none",
            }}
          >
            {/* دستگیره‌ی کوچیکِ بالا — نشونه‌ی بصریِ این‌که قابلِ‌کشیدنه. */}
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.55)",
                margin: "6px auto 0",
              }}
            />
            <div className="px-3 py-2 flex items-center justify-between gap-1" style={{ flexWrap: "nowrap" }}>
              <div className="flex items-center gap-1" style={{ fontWeight: 700, color: "#fff", minWidth: 0, flex: "1 1 auto" }}>
                {/* دستگیره‌ی جابجایی و دکمه‌ی ریست، طبق درخواستِ جدید، حالا
                    کاملاً اولِ همین گروهِ سمت‌راست می‌شینن (یعنی لبه‌ی
                    راستِ نوار، چون کانتینر راست‌چینه) و بعدشون آیکون/عنوان
                    میاد — نه برعکس مثلِ قبل. */}
                <div
                  onPointerDown={(e) => { e.stopPropagation(); handlePracticeMoveStart(e); }}
                  onPointerMove={handlePracticeMoveMove}
                  onPointerUp={handlePracticeMoveEnd}
                  onPointerCancel={handlePracticeMoveEnd}
                  role="button"
                  tabIndex={0}
                  aria-label={isFa ? "جابجاکردنِ آزادِ باکس رویِ صفحه" : "Freely move this box"}
                  title={isFa ? "نگه‌دار و بکش تا باکس رو جابجا کنی" : "Hold and drag to move this box"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    cursor: "grab",
                    touchAction: "none",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 3px)",
                      gridAutoRows: "3px",
                      gap: 3,
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.85)" }} />
                    ))}
                  </div>
                </div>
                {practiceMoved && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetPracticePosition();
                    }}
                    className="flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.18)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                    title={isFa ? "بازگرداندنِ باکس به جای اولش" : "Reset box position"}
                    aria-label={isFa ? "بازگرداندنِ باکس به جای اولش" : "Reset box position"}
                  >
                    <RotateCcw size={12} color="#fff" />
                  </button>
                )}
                <span
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: colors.teal,
                    border: "2px solid rgba(255,255,255,0.85)",
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle size={11} color="#ffffff" fill="rgba(255,255,255,0.15)" strokeWidth={2.25} />
                  {chatMessages.length > 0 && practiceSheet === "peek" && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -2,
                        insetInlineEnd: -2,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: colors.gold,
                        border: `2px solid ${colors.teal}`,
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                >
                  تمرین جمله‌سازی و گرامر
                </span>
                {practiceSheet === "peek" ? <ChevronUp size={15} color="#fff" /> : <ChevronDown size={15} color="#fff" />}
              </div>
              <div className="flex items-center gap-1" style={{ flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="flex items-center justify-center"
                    style={{ width: 24, height: 24, color: "#fff", opacity: 0.9, flexShrink: 0 }}
                    title={isFa ? "پاک‌کردن گفتگو" : "Clear conversation"}
                    aria-label={isFa ? "پاک‌کردن گفتگو" : "Clear conversation"}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* بدنه‌ی نوار — عرضش استانداردِ صفحاتِ چته (تمام‌عرض روی موبایل،
              با یه سقفِ عرض روی صفحه‌های بزرگ‌تر تا خیلی کشیده نشه).
              flex:1 می‌گیره تا هرچقدر ارتفاعِ نوار (با کشیدن) عوض بشه،
              خودش رو با اون تطبیق بده؛ تاریخچه‌ی گفتگو هم به‌جای یه
              maxHeight ثابت، از باقیِ فضا پر می‌شه (flex:1، خودش
              overflow-y:auto). همیشه mount می‌مونه (نه با شرط)، تا کشیدن/
              اسنپ‌شدن نرم به نظر بیاد؛ فقط توی حالتِ «peek»، ارتفاعِ خودِ
              نوار (که همون ارتفاعِ هدره) عملاً هیچی ازش رو نشون نمی‌ده. */}
          <div
            style={{
              width: "min(100%, 640px)",
              margin: "0 auto",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              aria-hidden={practiceSheet === "peek"}
              className="px-4"
              style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <p style={{ fontSize: 12, color: colors.inkSoft, margin: "8px 0 8px", flexShrink: 0 }}>
                یه جمله به {LANGUAGES.find((l) => l.code === chatLang)?.label || chatLang} بنویس؛ اگه غلط بود اصلاحش می‌کنم و کلمه‌به‌کلمه گرامرش رو توضیح می‌دم. یا هر سوال گرامری‌ای که داری — چه درباره‌ی این جمله، چه یه سوال کاملاً جدا — همین‌جا بپرس تا مثل یه معلم زبان جواب بدم.
              </p>

                {chatMessages.length > 0 && (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      marginBottom: 10,
                      paddingRight: 2,
                      // پنلِ بیرونی برای امکانِ کشیدنِ دستی (تغییرِ ارتفاع/جابجایی)
                      // touchAction:none داره؛ چون این ویژگی روی فرزندها هم اثر
                      // می‌ذاره، اینجا صریحاً pan-y می‌ذاریم تا اسکرولِ عمودیِ
                      // معمولیِ لمسی (مثلِ هر اپِ چتی) روی خودِ لیستِ پیام‌ها کار کنه.
                      touchAction: "pan-y",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {chatMessages.map((m, i) => {
                      const isUser = m.role === "user";
                      const isEditing = editingMsgIndex === i;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end", marginBottom: 10 }}>
                          <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-start" : "flex-end" }}>
                            {isEditing ? (
                              <div
                                style={{
                                  width: "100%",
                                  minWidth: 180,
                                  padding: 6,
                                  borderRadius: 12,
                                  backgroundColor: colors.paper,
                                  border: `1.5px solid ${colors.teal}`,
                                }}
                              >
                                <textarea
                                  ref={editMsgTextareaRef}
                                  dir="auto"
                                  autoFocus
                                  rows={1}
                                  value={editingMsgText}
                                  onChange={(e) => setEditingMsgText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      saveEditingMsg();
                                    } else if (e.key === "Escape") {
                                      cancelEditingMsg();
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    padding: "4px 6px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    lineHeight: 1.6,
                                    maxHeight: 140,
                                    backgroundColor: "transparent",
                                    color: colors.ink,
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2" style={{ marginTop: 4 }}>
                                  <button
                                    onClick={cancelEditingMsg}
                                    className="flex items-center gap-1"
                                    style={{ fontSize: 11, color: colors.inkSoft }}
                                  >
                                    <X size={12} />
                                    انصراف
                                  </button>
                                  <button
                                    onClick={saveEditingMsg}
                                    className="flex items-center gap-1"
                                    style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "3px 8px" }}
                                  >
                                    <Check size={12} />
                                    ذخیره
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                dir={isUser ? (isPersianScriptLine(m.text || "") ? "rtl" : "ltr") : "auto"}
                                onClick={() => isUser && setTappedMsgIndex((prev) => (prev === i ? null : i))}
                                style={{
                                  maxWidth: "100%",
                                  padding: "8px 12px",
                                  borderRadius: 12,
                                  fontSize: 13,
                                  backgroundColor: isUser ? colors.paper : colors.goldSoft,
                                  border: `1px solid ${colors.cardBorder}`,
                                  cursor: isUser ? "pointer" : "default",
                                  // متنِ خودِ کاربر (سوال) مستقیم همینجا چاپ می‌شه؛
                                  // چون MiniMarkdown نیست، justify و فیکسِ
                                  // bidiِ ترکیبِ فارسی/عربی با بقیه‌ی زبون‌ها
                                  // باید مستقیم همینجا هم گذاشته بشه (جوابِ
                                  // هوش‌مصنوعی این استایل رو از طریقِ prop
                                  // «justify» به MiniMarkdown می‌گیره، پایین‌تر).
                                  ...(isUser ? { textAlign: "justify", unicodeBidi: "plaintext" } : null),
                                }}
                              >
                                {isUser ? m.text : <MiniMarkdown text={m.text} speakCode={chatLang} nativeLang={nativeLang} aiSettings={aiSettings} wordTapTarget={targetOrder && targetOrder[0]} justify />}
                                {m.role === "ai" && langOptions.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: 8, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 6 }}>
                                    <Globe size={12} color={colors.inkSoft} />
                                    {langOptions.map((code) => {
                                      const label = LANGUAGES.find((l) => l.code === code)?.label || code;
                                      const isOpenLang = openMsgTranslation[i] === code;
                                      return (
                                        <button
                                          key={code}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMessageTranslation(i, m.text, code);
                                          }}
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            borderRadius: 999,
                                            padding: "2px 8px",
                                            backgroundColor: isOpenLang ? colors.teal : "white",
                                            color: isOpenLang ? "white" : colors.inkSoft,
                                            border: `1px solid ${isOpenLang ? colors.teal : colors.cardBorder}`,
                                          }}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                {m.role === "ai" &&
                                  openMsgTranslation[i] &&
                                  (() => {
                                    const key = `${i}:${openMsgTranslation[i]}`;
                                    const val = msgTranslations[key];
                                    return (
                                      <div
                                        dir="auto"
                                        style={{
                                          marginTop: 6,
                                          fontSize: 12,
                                          color: colors.ink,
                                          backgroundColor: "white",
                                          borderRadius: 8,
                                          padding: "6px 8px",
                                          border: `1px solid ${colors.cardBorder}`,
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {val === "loading" ? (
                                          <span className="flex items-center gap-1" style={{ color: colors.inkSoft }}>
                                            <Loader2 size={12} className="spin" />
                                            در حال ترجمه...
                                          </span>
                                        ) : (
                                          val
                                        )}
                                      </div>
                                    );
                                  })()}
                                {m.role === "ai" && (
                                  <div className="flex justify-end" style={{ marginTop: 6 }}>
                                    {m.savedToGrammar ? (
                                      <span
                                        className="flex items-center gap-1"
                                        style={{ fontSize: 11, color: colors.gold, fontWeight: 700 }}
                                      >
                                        <Bookmark size={12} fill={colors.gold} />
                                        ذخیره شد
                                      </span>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          saveGrammarNote({
                                            langCode: chatLang,
                                            word: m.forSentence || "جمله",
                                            sentence: m.forSentence || "",
                                            markdown: m.text,
                                          });
                                          // یه‌بار ذخیره کافیه — با تغییر همین پیام به حالت
                                          // «ذخیره شد»، دکمه غیرفعال می‌شه و دیگه نیازی به
                                          // زدن دوباره‌ش نیست (که قبلاً گیج‌کننده بود).
                                          setChatMessages((prev) =>
                                            prev.map((msg, idx) => (idx === i ? { ...msg, savedToGrammar: true } : msg))
                                          );
                                        }}
                                        className="flex items-center gap-1"
                                        style={{ fontSize: 11, color: colors.teal, textDecoration: "underline" }}
                                      >
                                        <Bookmark size={12} />
                                        ذخیره در یادگیری گرامر
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* دکمه‌ی «ویرایش» — فقط با تپ‌کردن رویِ پیامِ خودِ کاربر
                                ظاهر می‌شه؛ هیچ محدودیتی در تعدادِ دفعاتِ ویرایش نیست. */}
                            {isUser && !isEditing && tappedMsgIndex === i && (
                              <button
                                onClick={() => startEditingMsg(i, m.text)}
                                className="flex items-center gap-1"
                                style={{ fontSize: 11, color: colors.teal, fontWeight: 700, marginTop: 4 }}
                              >
                                <Pencil size={12} />
                                ویرایش
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {chatLoading && (
                      <div className="flex items-center gap-1" style={{ fontSize: 12, color: colors.inkSoft }}>
                        <Loader2 size={13} className="spin" />
                        در حال بررسی جمله...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
                {chatError && (
                  <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8, flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: colors.rose, margin: 0 }}>{chatError}</p>
                    <button
                      onClick={retryLastMessage}
                      disabled={chatLoading}
                      className="flex items-center gap-1"
                      style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "4px 10px", flexShrink: 0, opacity: chatLoading ? 0.6 : 1 }}
                    >
                      <RotateCcw size={12} />
                      تلاش دوباره
                    </button>
                  </div>
                )}
            </div>

            {/* کادرِ نوشتن — همیشه در دسترسه (در هر سه حالتِ جمع/نیمه/کامل)،
                دقیقاً مثلِ نوارِ ارسالِ پیامِ اپ‌های چت که همیشه پایینِ صفحه
                ثابته. با تپ‌کردن روی خودِ اینپوت، اگه نوار کاملاً جمع بود
                (peek)، فقط تا نیمه (half) باز می‌شه — نه کاملِ صفحه — تا
                جمله‌های بالای صفحه هم درحینِ تایپ دیده بمونن. */}
            <div className="px-4" style={{ paddingBottom: 8, flexShrink: 0 }}>
              <div
                className="flex gap-2 items-end"
                style={{
                  backgroundColor: colors.paper,
                  border: `1.5px solid ${colors.teal}`,
                  borderRadius: 12,
                  padding: 6,
                  marginTop: practiceSheet === "peek" ? 8 : 0,
                }}
              >
                {/* دکمه‌ی ارسال طبق درخواستِ کاربر قبل از textarea میاد — چون
                    این باکس dir="rtl"ه (ریشه‌ی اپ rtlه)، اولین فرزندِ داخلِ
                    یه flex-rowِ rtl سمتِ راست می‌شینه؛ پس دکمه رو اول گذاشتیم
                    تا واقعاً سمتِ راستِ نوار بیفته، نه چپ. */}
                <button
                  onClick={() => {
                    setPracticeSheet((s) => (s === "peek" ? "half" : s));
                    sendChat();
                  }}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    backgroundColor: colors.teal,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                    boxShadow: chatLoading || !chatInput.trim() ? "none" : "0 2px 8px rgba(28,37,65,0.25)",
                    flexShrink: 0,
                  }}
                >
                  <Send size={16} color="#fff" />
                </button>
                <textarea
                  ref={chatTextareaRef}
                  dir="auto"
                  rows={1}
                  value={chatInput}
                  onFocus={() => setPracticeSheet((s) => (s === "peek" ? "half" : s))}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder="جمله‌ت رو بنویس یا سوالت رو بپرس... (برای خط جدید Enter، برای ارسال دکمه رو بزن)"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    maxHeight: 140,
                    backgroundColor: "transparent",
                    color: colors.ink,
                  }}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
