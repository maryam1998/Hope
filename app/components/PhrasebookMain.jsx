// تب عبارات/مکالمه
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { RotateCcw, X, Search, Blend } from "lucide-react";
import { WORDS_AZ } from "../../WORDS_AZ.js";
import { DAILY_WORDS } from "../../DAILY_WORDS.js";
import { SLANG_WORDS } from "../../SLANG_WORDS.js";
import DailyConversationsTab from "../../DailyConversationsTab.jsx";
import SpeakingPracticePanel from "../../SpeakingPractice.jsx";
import { bridge } from "../runtime/bridge.js";
import { ALL_DAILY_CONVERSATIONS, VOCAB_IN_USE_WORDS } from "../config/dataPools.js";
import { supabaseLoadState, supabaseSaveState } from "../config/supabaseClient.js";
import { getCachedTranslationMap } from "../storage/translationCacheDb.js";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { LANGUAGES, PHRASEBOOK_LANGUAGES, syncLangPickerFromTargetOrder, syncTargetOrderFromLangPicker } from "../constants/languages.js";
import { conversation } from "../constants/categories.js";
import { APP_FONT_SIZES, READ_DONE_BG, READ_DONE_COLOR, colors, fontFa, fontLatin } from "../ui/theme.js";
import { tr, trf } from "../ui/uiStrings.js";
import { SHOW_MASCOT_CHARACTER_OPTIONS, SHOW_MASCOT_OUTFIT_OPTIONS, STORAGE_KEY, TAB_GROUPS, TAB_META, groupOfTab } from "../prefs/appPrefs.js";
import { WORD_LIST_SORT_OPTIONS } from "../sort/sortHelpers.js";
import { storage } from "../storage/storage.js";
import { retranslateDailyLine, translateFree } from "../translate/translateService.js";
import { callAI } from "../ai/callAI.js";
import { consumeMainTextResumeOffset, speechController } from "../speech/speechController.js";
import { normalizeWord } from "../words/wordCache.js";
import { SAVED_STORY_WORDS_KEY, SAVED_WORDS_CHANGED_EVENT, STORY_WORD_PICKED_EVENT, WORDS_TAB_PERSONAL_EVENT, estimatePhraseLevel, getLastPlayOriginTab, getWordsAzKeySet, isWordSaved, loadPersonalWordLevels, loadSavedStoryWords, loadWordsTabHidden, mergeSavedStoryWordsFromCloud, setCurrentOriginTab, toggleSavedStoryWord, updateSavedWordTranslation } from "../words/savedStoryWords.js";
import { WORD_EXAMPLES_CHANGED_EVENT, WORD_EXAMPLES_KEY, loadAllWordExamples, mergeWordExamplesFromCloud } from "../words/wordExamples.js";
import { loadReadWordIds, loadWordTranslation, saveReadWordIds, saveWordTranslation } from "../words/wordTranslations.js";
import { GRAMMAR_NOTES_CHANGED_EVENT, GRAMMAR_NOTES_KEY, loadGrammarNotes, lookupWordGrammarDetail, mergeGrammarNotesFromCloud, saveGrammarNote, updateGrammarNoteMarkdown } from "../grammar/grammarNotes.js";
import { LEITNER_CUSTOM_WORDS_CHANGED_EVENT, addLeitnerCustomWord, loadLeitnerCustomWords } from "../leitner/leitnerCustomWords.js";
import { estimateEnglishWordLevel, lookupSavedWordLevel } from "../words/wordLevels.js";
import { GenericSortMenu } from "./SortMenus.jsx";
import { DraggableLangRow } from "./settings/LangPickerRows.jsx";
import { SettingsMenu } from "./settings/SettingsMenu.jsx";
import { HeaderGroupButton, TabButton } from "./header/TabButtons.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { ABRepeatButton, MainPlayButton, MuteButton, RepeatButton, RestartButton, UserAudioABButton, UserAudioRestartButton } from "./player/playerButtons.jsx";
import { ChunkNavButton } from "./player/seekControls.jsx";
import { MyVoiceRecorder } from "./player/MyVoiceRecorder.jsx";
import { PlayerProgressTrack } from "./player/PlayerProgress.jsx";
import { LevelFilterRow } from "./levels/LevelControls.jsx";
import { OrderChips } from "./OrderChips.jsx";
import { ClickableSentence } from "./story/ClickableSentence.jsx";
import { PlayerBarStorySwitch, UserAudioChunkNavButton, UserAudioMainPlayButton, UserAudioProgressTrack } from "./story/UserAudioBar.jsx";
import { StoryBuilder } from "./StoryBuilder.jsx";
import { SavedWordsPanel } from "./SavedWordsPanel.jsx";
import { GrammarPanel } from "./GrammarPanel.jsx";
import { PhraseList } from "./PhraseList.jsx";
import { GlobalAddToStorySelection } from "./GlobalAddToStorySelection.jsx";
import { WORDS_PAGE_SIZE, WordList } from "./WordList.jsx";
import { ReviewBox } from "./ReviewBox.jsx";
import { LingovaMascot } from "./LingovaMascot.jsx";

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export function PhrasebookMain({ user, onLogout, appPrefs, setAppPrefs, onCustomBgChange }) {
  const [nativeLang, setNativeLang] = useState("fa");
  // طبق درخواست: هر بار که وارد اکانت می‌شی، زبان‌های مقصد نباید از دفعه‌ی
  // قبل به‌خاطر مونده باشن و از پیش انتخاب‌شده بیان — باید خالی شروع بشه و
  // خودت هر بار انتخابش کنی. برای همین هم مقدارِ اولیه‌ش [] شده (نه ["en"])
  // و هم، پایین‌تر در applySavedState، دیگه از روی داده‌ی ذخیره‌شده (چه
  // محلی چه ابری) پر نمی‌شه.
  const [targetOrder, setTargetOrder] = useState([]);
  // ترتیبِ نمایشِ خودِ مهرهای زبان (ردیفِ زبان مادری و ردیفِ زبان‌های مقصد) —
  // با کشیدن یه مهر روی مهرِ دیگه (DraggableLangRow) عوض می‌شه، جدا از
  // targetOrder که فقط ترتیبِ ترجمه‌های همون زبان‌های از‌قبل‌انتخاب‌شده‌ست.
  const [langPickerOrder, setLangPickerOrder] = useState(() => PHRASEBOOK_LANGUAGES.map((l) => l.code));
  const [favorites, setFavorites] = useState(new Set());
  const [wordFavorites, setWordFavorites] = useState(new Set());
  const [tab, setTab] = useState("conversations");
  // گروهِ فعالِ ناوبری + آخرین زیرتبی که کاربر توی هر گروه باز کرده بود
  const activeTabGroup = groupOfTab(tab);
  const lastTabInGroupRef = useRef({});
  lastTabInGroupRef.current[activeTabGroup.key] = tab;
  const goToTab = (key) => {
    setTab(key);
    if (key === "review") { setReviewIndex(0); setShowAnswer(false); }
  };
  // این تب رو به متغیرِ سراسریِ currentOriginTab هم می‌رسونه — تا هر لغت/
  // عبارتی که همین الان (توی هر تبی) ذخیره می‌شه، بدونه از کجا اومده.
  useEffect(() => {
    setCurrentOriginTab(tab);
  }, [tab]);
  const [boxes, setBoxes] = useState(() => {
    const initial = {};
    conversation .forEach((p) => (initial[p.id] = 1));
    return initial;
  });
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [query, setQuery] = useState("");
  // ⚡️ فیکسِ سرعت: خودِ فیلدِ جستجو رو مستقیم به query وصل نگه می‌داریم (تا
  // تایپ‌کردن هیچ تأخیری حس نشه)، ولی چیزی که واقعاً به WordList/تبِ
  // مکالمات (فیلترِ سنگین رویِ چند هزار ردیف) پاس داده می‌شه debouncedQuery
  // ـه — فقط ۱۵۰ میلی‌ثانیه بعد از آخرین حرفی که کاربر تایپ کرده به‌روز
  // می‌شه. قبلاً هر تک‌کاراکتر بلافاصله کلِ فیلترِ سنگین رو (حتی بعدِ فیکسِ
  // کشِ ترجمه‌ها) روی چند هزار ردیف اجرا می‌کرد؛ روی گوشیِ کم‌رم، تایپِ
  // سریع باعث می‌شد چند اجرای سنگین پشتِ‌سرِهم صف بشن و تایپ کاملاً هنگ کنه.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);
  const [levelFilter, setLevelFilter] = useState("all");
  // مرتب‌سازیِ مشترکِ تب‌های لغات/Vocabulary in Use/اسلنگ/علاقه‌مندی‌ها —
  // همون الگویِ savedStoriesSort تویِ داستان‌ساز، اینجا رویِ WordList اثر
  // می‌ذاره (نگاه کن به GenericSortMenu/WORD_LIST_SORT_OPTIONS).
  const [wordSortKey, setWordSortKey] = useState("default");
  // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» — اگه اون لغت با شناسه‌ی دقیقِ
  // همون ردیف (id) ذخیره شده باشه (نگاه کن به originExtra توی WordList)،
  // این استیت به WordListِ همون تب می‌رسه تا دقیقاً همون ردیف رو (نه فقط
  // نتیجه‌ی جستجو) هایلایت و بهش اسکرول کنه.
  const [wordJumpTarget, setWordJumpTarget] = useState(null);
  // شفافیتِ نوار پخشِ چسبیده به کف صفحه — درصدی از ۰ (کاملاً شفاف) تا ۱۰۰
  // (کاملاً کدر). روی دستگاه ذخیره می‌شه تا هربار برنگرده به پیش‌فرض.
  const [playerOpacity, setPlayerOpacity] = useState(() => {
    const saved = localStorage.getItem("phrasebook-player-opacity");
    const n = saved === null ? 100 : Number(saved);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
  });
  useEffect(() => {
    localStorage.setItem("phrasebook-player-opacity", String(playerOpacity));
  }, [playerOpacity]);
  // باز/بسته‌بودنِ پاپ‌آورِ تنظیمِ شفافیت — با کلیک روی آیکونِ شفافیت باز/بسته می‌شه.
  const [opacityPopoverOpen, setOpacityPopoverOpen] = useState(false);
  // شفافیتِ پنلِ شناورِ «تمرین جمله‌سازی با هوش مصنوعی» — دقیقاً مثل
  // playerOpacity بالا، جدا و مستقل ذخیره می‌شه که با شفافیتِ پلیر تداخل
  // نکنه.
  const [practiceOpacity, setPracticeOpacity] = useState(() => {
    const saved = localStorage.getItem("phrasebook-practice-opacity");
    const n = saved === null ? 100 : Number(saved);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
  });
  useEffect(() => {
    localStorage.setItem("phrasebook-practice-opacity", String(practiceOpacity));
  }, [practiceOpacity]);
  // ارتفاعِ واقعیِ نوارِ پلیر (اندازه‌گیری‌شده)، تا پنلِ شناورِ تمرین دقیقاً
  // بالای همون بشینه، هرجا ارتفاعِ پلیر (مثلاً با چیدمانِ ریسپانسیو) عوض شد.
  const [playerBarHeight, setPlayerBarHeight] = useState(108);
  const playerBarRef = useRef(null);
  useLayoutEffect(() => {
    const el = playerBarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h) setPlayerBarHeight(Math.ceil(h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // لانگ‌پرس روی نوارِ پلیر — چه در حالِ پخش باشه چه مکث‌شده — کاربر رو به
  // همون تب و همون سطری که این پخش ازش شروع شده برمی‌گردونه. خودِ برگشتن به
  // سطرِ دقیق (نه فقط تب) رو منطقِ اسکرولِ خودکارِ هر لیست (که از قبل برای
  // هایلایت/دنبال‌کردنِ پخش وجود داشت) بعد از عوض‌شدنِ تب خودکار انجام می‌ده؛
  // اینجا فقط لازمه تبِ درست رو پیدا و ست کنیم.
  const playerLongPressRef = useRef({ startX: 0, startY: 0, timer: null, active: false, fired: false });
  function clearPlayerLongPress() {
    const st = playerLongPressRef.current;
    if (st.timer) {
      clearTimeout(st.timer);
      st.timer = null;
    }
    st.active = false;
  }
  function startPlayerLongPress(x, y) {
    const st = playerLongPressRef.current;
    clearPlayerLongPress();
    st.startX = x;
    st.startY = y;
    st.active = true;
    st.fired = false;
    st.timer = setTimeout(() => {
      if (!st.active) return;
      st.active = false;
      const state = speechController.getState();
      // فقط وقتی معنی داره که همین الان چیزی واقعاً در حالِ پخش یا مکث باشه —
      // وگرنه (پلیر خاموشه) این لمسِ طولانی رو اصلاً «شمرده‌شده» حساب نمی‌کنیم
      // تا کلیکِ بعدی‌ش (مثلاً چیزِ دیگه‌ای زیرِ همون انگشت) طبیعی کار کنه.
      if (!state.key) return;
      st.fired = true;
      const targetTab = getLastPlayOriginTab();
      if (targetTab && targetTab !== tab) setTab(targetTab);
    }, 550);
  }
  function movePlayerLongPress(x, y) {
    const st = playerLongPressRef.current;
    if (!st.active) return;
    if (Math.abs(x - st.startX) > 12 || Math.abs(y - st.startY) > 12) clearPlayerLongPress();
  }
  // بعد از یه لانگ‌پرسِ موفق، کلیکِ طبیعی‌ای که مرورگر روی همون المنتِ زیرِ
  // انگشت (مثلاً دکمه‌ی پخش) شلیک می‌کنه رو خنثی می‌کنیم — وگرنه بلافاصله
  // بعدِ رفتن به تبِ مقصد، پخش هم قطع/شروع می‌شد.
  function handlePlayerClickCapture(e) {
    const st = playerLongPressRef.current;
    if (st.fired) {
      e.preventDefault();
      e.stopPropagation();
      st.fired = false;
    }
  }
  // ارتفاعِ واقعیِ پنلِ شناورِ تمرین (از خودِ GrammarPanel گزارش می‌شه)، تا
  // پدینگِ پایینِ <main> تو تبِ گرامر به‌اندازه‌ی کافی باشه و آخرین نکته‌ی
  // گرامری زیرِ پنلِ شناور گم نشه.
  const [practicePanelHeight, setPracticePanelHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // «loaded» فقط یعنی نسخه‌ی محلی (localStorage) لود شده و صفحه می‌تونه باز
  // بشه — ولی نسخه‌ی ابری (Supabase) ممکنه هنوز در راه باشه (مخصوصاً
  // اولین‌بار روی یه دستگاه/مرورگر تازه که چیزی توی localStorage نیست).
  // اگه ذخیره‌ی خودکار (افکتِ پایین) فقط به «loaded» گوش می‌داد، ممکن بود
  // ۵۰۰ میلی‌ثانیه بعد از باز شدنِ برنامه — قبل از این‌که جوابِ ابری برسه —
  // همون حالتِ خالی/پیش‌فرض رو به‌عنوانِ «آخرین نسخه» به Supabase بفرسته و
  // داستان‌ها/لغاتِ ذخیره‌شده‌ی واقعی که آنجا بودن رو برای همیشه پاک کنه.
  // «cloudChecked» دقیقاً همین مسابقه (race) رو می‌بنده: تا وقتی جوابِ ابری
  // (چه موفق چه ناموفق) نرسیده، یا اصلاً کاربری لاگین نیست، ذخیره‌ی خودکار
  // منتظر می‌مونه.
  const [cloudChecked, setCloudChecked] = useState(false);
  const [wordStats, setWordStats] = useState({});
  const [savedStories, setSavedStories] = useState([]);
  const [backendUrl, setBackendUrl] = useState("");
  const [storyJump, setStoryJump] = useState(null); // { lang, token } — set when jumping in from Saved Words
  // متنِ کاملِ داستانِ ساخته‌شده در تبِ داستان‌ساز — برای این‌که دکمه‌ی
  // 🔊ِ «خواندنِ کل متن» روی نوارِ پلیر (پایینِ صفحه) بتونه بدونِ داشتنِ
  // دکمه‌ی جداگانه‌ی بالای داستان، همون متن رو بخونه.
  const [storyPlayerText, setStoryPlayerText] = useState({ text: "", code: "" });
  // وضعیت/کنترل‌های صوتِ آپلودیِ کاربر برای داستانِ فعلی — از StoryBuilder
  // گزارش می‌شه (onUserAudioStateChange) تا نوارِ سراسریِ پایینِ صفحه
  // (پلیرِ اصلی) بتونه سوییچِ TTS⇄صوتِ من و کنترل‌هاش رو نشون بده.
  const [storyUserAudio, setStoryUserAudio] = useState(null);
  // همون الگو، ولی برای متنِ خوندنیِ تبِ «مکالمات روزمره» (سناریوی
  // بازشده). هر تب که بخواد دکمه‌ی 🔊ِ روی پلیر متنِ خودش رو بخونه، یه
  // state مشابه اینجا اضافه می‌کنه و پایین (روی نوارِ پلیر) به ازای
  // تبِ خودش نشون داده می‌شه.
  const [dailyPlayerText, setDailyPlayerText] = useState({ text: "", code: "" });
  // یه state مشترک برای هر سه تبی که از WordList استفاده می‌کنن (لغات،
  // لغات‌و‌اخبار، مکالمه‌و‌روزمره) — چون همیشه فقط یکیشون هم‌زمان mount
  // می‌مونه، لازم نیست هر تب state جدا داشته باشه.
  const [wordListPlayerText, setWordListPlayerText] = useState({ text: "", code: "" });
  const [grammarJump, setGrammarJump] = useState(null); // { word, sentence, langCode, token } — set from the word popover
  // ⚡️ فیکسِ سرعت: قبلاً این آبجکت هر بار که PhrasebookMain رندر می‌شد (یعنی
  // با هر تایپ توی جستجو، هر تیک تایمر، هر حرکتِ انگشت روی نوارِ تمرینِ
  // جمله‌سازی، هرچیزی) یه رفرنسِ کاملاً تازه می‌ساخت. چون aiSettings به
  // ده‌ها کامپوننتِ React.memo‌شده در سراسرِ اپ (WordList، MiniMarkdown،
  // GrammarPanel، WordTargetTranslation و...) پاس داده می‌شه، رفرنسِ تازه
  // در هر رندر باعث می‌شد memo همیشه «تغییر کرده» تشخیص بده و کلِ اون
  // زیردرخت‌ها (از جمله فیلترِ سنگینِ جستجو و چتِ تمرینِ گرامر) دوباره
  // محاسبه/رندر بشن — همونی که باعثِ هنگ/کندیِ گسترده می‌شد. با useMemo،
  // فقط وقتی backendUrl واقعاً عوض بشه یه آبجکتِ تازه ساخته می‌شه.
  const aiSettings = useMemo(() => ({ backendUrl, setBackendUrl }), [backendUrl]);
  const userStorageKey = `${STORAGE_KEY}:${user?.email || "guest"}`;

  // Lets the word-tap popover (ClickableSentence, rendered in several
  // far-apart tabs) hand a word straight to the Grammar tab without
  // threading a callback prop through every component in between.
  useEffect(() => {
    bridge.requestGrammarJump = (word, sentence, langCode) => {
      setGrammarJump({ word, sentence, langCode, token: Date.now() });
      setTab("grammar");
    };
    return () => {
      bridge.requestGrammarJump = null;
    };
  }, []);

  // همون الگو: پاپ‌آپِ لغت (ClickableSentence) این‌جوری یه لغتِ دلخواه رو
  // مستقیم به استخرِ مرورِ جعبه‌ی لایتنر اضافه می‌کنه — بدونِ اینکه boxes/
  // setBoxes رو لازم باشه به هر کامپوننتِ واسط پاس بدیم. خودِ ذخیره‌سازی تو
  // localStorage انجام می‌شه (addLeitnerCustomWord)؛ اینجا فقط با bump‌کردنِ
  // leitnerWordsVersion، useEffectِ لودِ لیست (پایین‌تر) رو دوباره اجرا می‌کنیم.
  const [leitnerCustomWords, setLeitnerCustomWords] = useState(() => loadLeitnerCustomWords());
  const [leitnerWordsVersion, setLeitnerWordsVersion] = useState(0);
  useEffect(() => {
    setLeitnerCustomWords(loadLeitnerCustomWords());
  }, [leitnerWordsVersion]);
  useEffect(() => {
    const refresh = () => setLeitnerCustomWords(loadLeitnerCustomWords());
    window.addEventListener(LEITNER_CUSTOM_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LEITNER_CUSTOM_WORDS_CHANGED_EVENT, refresh);
  }, []);
  useEffect(() => {
    bridge.requestAddToLeitner = (word, langCode, meaning) => {
      addLeitnerCustomWord(word, langCode, { meaning, nativeLang });
      setLeitnerWordsVersion((v) => v + 1);
    };
    return () => {
      bridge.requestAddToLeitner = null;
    };
  }, [nativeLang]);

  // 🔖 لغت/عبارت‌هایی که کاربر از پنلِ شناورِ «ترجمه‌ی زنده / زیرنویس یوتیوب» (فقط اندروید) زده:
  // پنل تو یه صفِ بومی می‌نویسه (حتی وقتی اپ بسته است)؛ اینجا موقعِ باز شدن، برگشتن به اپ، یا
  // رویدادِ wordQueued (اپ زنده است) وارد «ذخیره برای داستان بعدی» / «یادگیری گرامر» / «جعبه‌ی لایتنر» می‌شه
  // — دقیقاً با همون توابعِ دکمه‌های پاپ‌آپِ ClickableSentence.
  useEffect(() => {
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
    if (!B || !B.wordQueueList || !B.wordQueueAck) return undefined;
    let busy = false;
    let handle = null;
    let disposed = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await B.wordQueueList();
        const items = (res && res.items) || [];
        if (!items.length) return;
        let leitnerChanged = false;
        for (const it of items) {
          const word = String((it && it.word) || "").trim();
          const lang = (it && it.lang) || "en";
          if (!word) continue;
          const mLang = (it && it.meaningLang) || nativeLang;
          const meaning = String((it && it.meaning) || "").trim();
          const sentence = String((it && it.sentence) || word);
          try {
            if (it.action === "story") {
              if (!isWordSaved(word, lang)) {
                toggleSavedStoryWord(word, lang, { meaning, nativeLang: mLang, originExtra: { via: "bubble" } });
                try {
                  window.dispatchEvent(new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word, langCode: lang } }));
                } catch {}
              } else if (meaning) {
                updateSavedWordTranslation(word, lang, mLang, meaning);
              }
            } else if (it.action === "grammar") {
              const w = normalizeWord(word);
              const dup = loadGrammarNotes().some(
                (n) => n.langCode === lang && normalizeWord(n.word) === w && n.sentence === sentence
              );
              if (!dup) {
                const md =
                  `## 🧩 ${word}\n\n` +
                  (meaning ? `**🔹 معنی:** ${meaning}\n\n` : "") +
                  `**جمله:** ${sentence}`;
                const entry = saveGrammarNote({ langCode: lang, word, sentence, markdown: md });
                if (entry) {
                  const label = LANGUAGES.find((l) => l.code === mLang)?.label || "Persian";
                  lookupWordGrammarDetail({ word, sentence, langCode: lang, nativeLang: mLang, nativeLabel: label, aiSettings })
                    .then((full) => { if (full) updateGrammarNoteMarkdown(entry.id, full); })
                    .catch(() => { /* بک‌اند در دسترس نیست — یادداشتِ پایه همچنان ذخیره است */ });
                }
              }
            } else if (it.action === "leitner") {
              addLeitnerCustomWord(word, lang, { meaning, nativeLang: mLang });
              leitnerChanged = true;
            }
          } catch (e) { /* یک ردیفِ خراب نباید بقیه را متوقف کند */ }
        }
        if (leitnerChanged) setLeitnerWordsVersion((v) => v + 1);
        try { await B.wordQueueAck({ items: items.map((it) => ({ key: it.key, rev: it.rev })) }); } catch (e) { /* ignore */ }
      } catch (e) {
        /* بدونِ پلاگین/خطا: چیزی برای وارد کردن نیست */
      } finally {
        busy = false;
      }
    };
    const onVis = () => { if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", onVis);
    try {
      Promise.resolve(B.addListener("wordQueued", run)).then((h) => {
        if (disposed) { try { h.remove(); } catch (e) {} } else handle = h;
      }).catch(() => {});
    } catch (e) { /* ignore */ }
    run();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      if (handle) { try { handle.remove(); } catch (e) {} }
    };
  }, [nativeLang, aiSettings]);

  // بوکمارک‌های «ذخیره برای داستان بعدی» توی localStorage نگه داشته می‌شن
  // (نه توی یه useState اینجا)، برای همین بدون این ورژن‌شمار، افکت ذخیره‌ی
  // ابری پایین هیچ‌وقت با تغییر لغات ذخیره‌شده اجرا نمی‌شد — یعنی لغت‌های
  // تازه‌بوکمارک‌شده هیچ‌وقت به سرور/کلود نمی‌رفتن، و دفعه‌ی بعد که برنامه
  // لود می‌شد، نسخه‌ی قدیمی‌تر ابری جایگزین نسخه‌ی محلی (که لغت جدید رو
  // داشت) می‌شد و لغت انگار «گم» می‌شد. این ورژن‌شمار همون چیزیه که باعث
  // می‌شه لغات ذخیره‌شده واقعاً از همه‌ی داستان‌ها (قبل و بعد) جمع بمونن.
  const [savedWordsVersion, setSavedWordsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setSavedWordsVersion((v) => v + 1);
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
  }, []);
  // تغییرِ سطح/مخفی‌کردنِ لغاتِ شخصیِ تبِ «لغات» (بدونِ دست‌زدن به لغات ذخیره‌شده)
  const [personalWordsVersion, setPersonalWordsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setPersonalWordsVersion((v) => v + 1);
    window.addEventListener(WORDS_TAB_PERSONAL_EVENT, bump);
    return () => window.removeEventListener(WORDS_TAB_PERSONAL_EVENT, bump);
  }, []);

  // درخواست: لغاتی که از پاپ‌آپ/انتخابِ متن «ذخیره برای داستان بعدی» می‌شن،
  // خودکار و دائمی تو خودِ تبِ «لغات» (لیستِ اصلیِ WORDS_AZ) هم دیده بشن —
  // نه فقط تو پنلِ جدای «لغات ذخیره‌شده». چون WORDS_AZ.js یه فایلِ استاتیکه
  // که تو خودِ اپ باندل شده (مشترکِ همه‌ی کاربرا رو گیت‌هاب پیجز)، از سمتِ
  // مرورگر نمی‌شه واقعاً روش نوشت — این‌جا به‌جاش لغاتِ ذخیره‌شده (که خودشون
  // از قبل توی Supabase/localStorage دائمی‌ان) رو موقعِ نمایش با WORDS_AZ
  // ترکیب می‌کنیم؛ نتیجه برای کاربر دقیقاً همون حسی رو داره که خواسته:
  // لغتی که ذخیره کرده، همیشه تو تبِ لغات هست. فقط لغاتِ تک‌کلمه‌ایِ
  // انگلیسی رو اضافه می‌کنیم (چون WORDS_AZ فقط انگلیسیه)؛ جمله/اصطلاح یا
  // زبانِ دیگه همچنان فقط تو «لغات ذخیره‌شده» می‌مونه چون قالبِ این لیست
  // (تک‌لغتِ انگلیسی + معنی) باهاش جور درنمی‌آد.
  const wordsWithSaved = useMemo(() => {
    const existing = getWordsAzKeySet();
    const hidden = loadWordsTabHidden();
    const levels = loadPersonalWordLevels();
    const extras = [];
    // لغت/عبارتِ ذخیره‌شده‌ی انگلیسی، منهای مواردی که کاربر از همین تب مخفی کرده.
    // سطح: انتخابِ دستیِ کاربر ← پیدا کردن از دیتای محلی ← تخمین برای عبارت.
    loadSavedStoryWords().forEach((e) => {
      if (!e || e.langCode !== "en") return;
      const k = normalizeWord(e.word);
      if (!k || existing.has(k) || hidden.has(k)) return;
      extras.push({
        id: `saved:${k}`,
        en: e.word,
        fa: (e.translations && e.translations.fa) || "",
        level: levels[k] || lookupSavedWordLevel(e.word, "en") || estimatePhraseLevel(e.word) || estimateEnglishWordLevel(e.word) || null,
        pos: null,
        isUserSaved: true,
      });
    });
    return extras.length ? [...extras, ...WORDS_AZ] : WORDS_AZ;
  }, [savedWordsVersion, personalWordsVersion]);

  // لغاتی که کاربر با ⭐ از تب‌های لغات/لغات‌و‌اخبار/مکالمه‌روزمره/اسلنگ
  // علاقه‌مندشون کرده — قبلاً تنها جایی که ذخیره می‌شدن تنظیماتِ داخلی بود
  // و هیچ‌جا نشون داده نمی‌شدن (ستاره می‌خورد ولی توی تبِ «علاقه‌مندی‌ها»
  // ظاهر نمی‌شد)؛ حالا همین‌جا، کنارِ عبارت‌های علاقه‌مندشده، نشون داده می‌شن.
  const favoritedWords = useMemo(() => {
    const sources = [wordsWithSaved, DAILY_WORDS, SLANG_WORDS, VOCAB_IN_USE_WORDS];
    const seen = new Set();
    const result = [];
    sources.forEach((list) => {
      (list || []).forEach((w) => {
        if (wordFavorites.has(w.id) && !seen.has(w.id)) {
          seen.add(w.id);
          result.push(w);
        }
      });
    });
    return result;
  }, [wordsWithSaved, wordFavorites]);

  // Same idea, but for saved grammar notes (added to the cloud-sync payload
  // below) — bumps whenever a note is added/removed/updated so the debounced
  // save effect actually re-runs and pushes the change to Supabase, not just
  // to this one browser's localStorage.
  const [grammarNotesVersion, setGrammarNotesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setGrammarNotesVersion((v) => v + 1);
    window.addEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
  }, []);

  // همون الگو برای مثال‌های ساخته‌شده با هوش مصنوعی — قبلاً فقط توی
  // localStorage همین گوشی می‌موندن و با پاک‌شدنِ کش گم می‌شدن؛ حالا مثلِ
  // بقیه‌ی داده‌ها با اکانتِ کاربر روی ابر هم بکاپ می‌گیرن.
  const [wordExamplesVersion, setWordExamplesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setWordExamplesVersion((v) => v + 1);
    window.addEventListener(WORD_EXAMPLES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(WORD_EXAMPLES_CHANGED_EVENT, bump);
  }, []);

  // --- Load saved progress once, on first mount ---------------------------
  // قبلاً اینجا هم‌زمان منتظر جواب localStorage و Supabase (Promise.all)
  // می‌موندیم و تا هر دو برنمی‌گشتن صفحه‌ی «در حال بارگذاری...» می‌موند —
  // یعنی هر بار ورود به برنامه، یه رفت‌وبرگشتِ شبکه‌ای کامل به Supabase
  // (که خودش بعد از چک‌کردن سشن تو App، دومین رفت‌وبرگشته) قبل از نمایش
  // برنامه لازم بود. حالا اول نسخه‌ی محلی (که تقریباً آنی آماده‌ست) اعمال
  // می‌شه و صفحه باز می‌شه؛ نسخه‌ی ابری (Supabase) در پس‌زمینه لود می‌شه و
  // هروقت رسید — اگه واقعاً چیزی داشت — جایگزین می‌شه. کاربر تقریباً فوری
  // وارد برنامه می‌شه، بدون این‌که دیتای ابری از دست بره.
  // opts.merge = true یعنی این «saved» از منبعِ دوم (ابری) می‌آد و باید با
  // چیزی که همین الان روی صفحه/محلی هست ادغام بشه، نه جایگزینش بشه — برای
  // سه مجموعه‌ای که گم‌شدن‌شون واقعاً مهمه (داستان‌های ذخیره‌شده، لغات
  // ذخیره‌شده، یادداشت‌های گرامر) از توابع merge بالا استفاده می‌کنیم؛ بقیه‌ی
  // تنظیمات (زبان، ترتیب زبان‌ها و...) مثل قبل مستقیم اعمال می‌شن چون از
  // دست‌رفتن‌شون به این شدت آسیب‌زننده نیست.
  const applySavedState = (saved, opts) => {
    if (!saved) return;
    const merge = !!(opts && opts.merge);
    if (saved.nativeLang) setNativeLang(saved.nativeLang);
    // طبق درخواست، زبان‌های مقصد دیگه از ذخیره‌ی قبلی بازیابی نمی‌شن — هر بار
    // ورود باید خالی باشه، صرف‌نظر از این‌که دفعه‌ی قبل چی انتخاب شده بود.
    // (خودِ targetOrder هنوز داره ذخیره می‌شه — پایین‌تر توی همون افکتِ ذخیره —
    // فقط دیگه اینجا خودکار روی صفحه اعمال نمی‌شه.)
    if (Array.isArray(saved.langPickerOrder) && saved.langPickerOrder.length) setLangPickerOrder(saved.langPickerOrder);
    // نکته‌ی مهم: اینا هم مثلِ savedStories/savedStoryWords باید موقعِ merge
    // (یعنی وقتی این «saved» از نسخه‌ی ابریه، نه اولین لودِ محلی) با چیزی که
    // همین الان روی صفحه‌ست ادغام (union) بشن، نه جایگزینش بشن — قبلاً چون
    // بدونِ توجه به merge مستقیم setFavorites(new Set(saved.favorites))
    // صدا زده می‌شد، اگه یه ستاره‌ی تازه هنوز به ابر sync نشده بود (مثلاً
    // کاربر بلافاصله بعدِ ستاره‌زدن برنامه رو بسته بود)، نسخه‌ی قدیمی‌ترِ
    // ابری که چند لحظه بعد می‌رسید کاملاً جایگزینش می‌کرد و همون ستاره‌ی
    // تازه انگار «با هر بار وارد شدن حذف می‌شد».
    if (Array.isArray(saved.favorites)) {
      if (merge) {
        setFavorites((prev) => new Set([...prev, ...saved.favorites]));
      } else {
        setFavorites(new Set(saved.favorites));
      }
    }
    if (Array.isArray(saved.wordFavorites)) {
      if (merge) {
        setWordFavorites((prev) => new Set([...prev, ...saved.wordFavorites]));
      } else {
        setWordFavorites(new Set(saved.wordFavorites));
      }
    }
    if (saved.boxes) setBoxes((prev) => ({ ...prev, ...saved.boxes }));
    if (saved.wordStats) setWordStats(saved.wordStats);
    if (saved.savedStories) {
      if (merge) {
        setSavedStories((prev) => {
          const prevIds = new Set((prev || []).map((s) => s.id));
          const additions = (saved.savedStories || []).filter((s) => s && !prevIds.has(s.id));
          return additions.length ? [...additions, ...prev] : prev;
        });
      } else {
        setSavedStories(saved.savedStories);
      }
    }
    if (saved.backendUrl) setBackendUrl(saved.backendUrl);
    if (Array.isArray(saved.savedStoryWords)) {
      if (merge) {
        mergeSavedStoryWordsFromCloud(saved.savedStoryWords);
      } else {
        try {
          window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(saved.savedStoryWords));
          window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
        } catch {}
      }
    }
    if (Array.isArray(saved.grammarNotes)) {
      if (merge) {
        mergeGrammarNotesFromCloud(saved.grammarNotes);
      } else {
        try {
          window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(saved.grammarNotes));
          window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
        } catch {}
      }
    }
    if (saved.wordExamples) {
      if (merge) {
        mergeWordExamplesFromCloud(saved.wordExamples);
      } else {
        try {
          window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(saved.wordExamples));
          window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
        } catch {}
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    setCloudChecked(false);
    (async () => {
      // مرحله‌ی ۱ (سریع): نسخه‌ی محلی رو بخون، اعمال کن، و فوراً صفحه رو باز کن.
      try {
        const local = await storage.get(userStorageKey, false);
        const savedLocal = local && local.value ? JSON.parse(local.value) : null;
        if (!cancelled) applySavedState(savedLocal);
      } catch (e) {
        // نسخه‌ی محلی‌ای در کار نبود — مشکلی نیست، از خالی شروع می‌کنیم
      } finally {
        if (!cancelled) setLoaded(true);
      }

      // مرحله‌ی ۲ (در پس‌زمینه): نسخه‌ی ابری Supabase — با نسخه‌ی محلی/فعلی
      // ادغام می‌شه (نه جایگزینش)، پس هیچ‌وقت چیزی که یکی از این دوتا داشت
      // و اون‌یکی نداشت، گم نمی‌شه.
      if (user?.uid) {
        try {
          const cloud = await supabaseLoadState(user.uid);
          if (!cancelled && cloud) applySavedState(cloud, { merge: true });
        } catch (e) {
          // آفلاین یا خطای شبکه — نسخه‌ی محلی همچنان سرِ جاشه
        } finally {
          // چه موفق چه ناموفق، همین‌که جوابِ ابری (یا خطاش) رسید، ذخیره‌ی
          // خودکار می‌تونه شروع بشه — قبل از این لحظه اجازه نمی‌دیم.
          if (!cancelled) setCloudChecked(true);
        }
      } else {
        // کاربر مهمونه، ابری‌ای در کار نیست — منتظر نمی‌مونیم.
        if (!cancelled) setCloudChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // --- Save progress whenever it changes (debounced) -----------------------
  // pendingSaveRef همیشه یه نسخه‌ی به‌روز از تابعِ «همین الان بساز و ذخیره کن»
  // رو نگه می‌داره (با آخرین مقادیرِ state، چون هر رندر دوباره نوشته می‌شه).
  // دلیلِ وجودش: اگه کاربر درست بعد از ستاره‌زدن (قبل از این‌که تایمرِ debounce
  // پایین فرصتِ اجرا پیدا کنه) صفحه رو رفرش/ببنده، اون تغییرِ آخر هیچ‌وقت
  // ذخیره نمی‌شه. پایین‌تر، با گوش‌دادن به pagehide/visibilitychange، همین
  // تابع رو درست همون لحظه (sync، بدون صبر برای تایمر) صدا می‌زنیم.
  const pendingSaveRef = useRef(null);
  useEffect(() => {
    pendingSaveRef.current = () => {
      const payload = {
        nativeLang,
        targetOrder,
        langPickerOrder,
        favorites: Array.from(favorites),
        wordFavorites: Array.from(wordFavorites),
        boxes,
        wordStats,
        savedStories,
        backendUrl,
        savedStoryWords: loadSavedStoryWords(),
        grammarNotes: loadGrammarNotes(),
        wordExamples: loadAllWordExamples(),
      };
      // مستقیم localStorage (نه storage.set که async-wrapped ولی همون زیرش
      // sync-ه) — چون تو هندلرِ pagehide/beforeunload نباید await کنیم، ممکنه
      // مرورگر قبل از تمومِ await صفحه رو واقعاً ببنده.
      try {
        window.localStorage.setItem(userStorageKey, JSON.stringify(payload));
      } catch (e) {
        // local save failed — still try the cloud copy below
      }
      if (user?.uid) supabaseSaveState(user.uid, payload);
      return payload;
    };
  });

  useEffect(() => {
    // تا وقتی هم نسخه‌ی محلی لود نشده («loaded»)، هم جوابِ ابری (چه موفق چه
    // ناموفق) نرسیده («cloudChecked»)، ذخیره‌ی خودکار رو شروع نمی‌کنیم — وگرنه
    // ممکنه حالتِ خالی/پیش‌فرضِ اولیه به‌جای نسخه‌ی واقعی روی ابری بشینه.
    if (!loaded || !cloudChecked) return;
    const timeout = setTimeout(() => {
      if (pendingSaveRef.current) pendingSaveRef.current();
    }, 500);
    return () => clearTimeout(timeout);
  }, [nativeLang, targetOrder, langPickerOrder, favorites, wordFavorites, boxes, wordStats, savedStories, backendUrl, loaded, cloudChecked, userStorageKey, user?.uid, savedWordsVersion, grammarNotesVersion, wordExamplesVersion]);

  // --- Flush فوری درست قبل از بستن/رفرش/مینیمایز‌کردنِ صفحه ------------------
  // اگه یه ذخیره‌ی معلق (تو تایمرِ ۵۰۰ میلی‌ثانیه‌یِ بالا) هنوز اجرا نشده،
  // همین‌جا فوری اجراش می‌کنیم — تا مثلاً ستاره‌ای که همین الان زده شده، با
  // رفرشِ سریع از دست نره.
  useEffect(() => {
    if (!loaded || !cloudChecked) return;
    const flush = () => {
      if (pendingSaveRef.current) pendingSaveRef.current();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [loaded, cloudChecked]);

  const toggleTargetLang = (code) => {
    setTargetOrder((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // always keep at least one target language
        return prev.filter((c) => c !== code);
      }
      return [...prev, code]; // newly picked languages go to the end of the order
    });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleWordFavorite = (id) => {
    setWordFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const nativeLabel = LANGUAGES.find((l) => l.code === nativeLang)?.label;
  const targetLangList = targetOrder
    .map((code) => LANGUAGES.find((l) => l.code === code))
    .filter(Boolean);
  const targetLabel = targetLangList.map((l) => l.label).join("، ");
  // مرور (جعبه‌ی لایتنر) رو دیگه فقط رویِ VOCABِ ثابتِ برنامه انجام نمی‌ده —
  // لغاتِ دلخواهی هم که کاربر از پاپ‌آپِ لغت («افزودن به جعبه‌ی لایتنر») در
  // هر تبی اضافه کرده، به همین استخر می‌پیوندن.
  const reviewPool = useMemo(() => [...conversation , ...leitnerCustomWords], [leitnerCustomWords]);
  // نوار پخشِ چسبیده به کف صفحه فقط تو تب‌هایی معنی داره که صدا/تکرار/
  // اسکرول خودکار توشون فعاله.
  // پلیر چسبیده به کف صفحه — سرتاسری، تو همه‌ی تب‌ها نشون داده می‌شه.
  const showPlayerBar = true;
  // متن/زبونِ مربوط به «پخشِ کل متنِ تبِ فعلی» — دقیقاً همون منطقی که قبلاً
  // سه‌تا SpeakButtonِ جدا (یکی برای هر تب) پیاده‌سازیش می‌کردن؛ حالا فقط
  // یه‌جا محاسبه می‌شه تا دکمه‌ی مرکزیِ پخشِ پلیرِ جدید (MainPlayButton)
  // وقتی چیزی در حالِ پخش نیست، بدونه با زدنش چه متنی رو باید شروع کنه.
  const activeTabAudio =
    tab === "story" && storyPlayerText.text
      ? {
          text: storyPlayerText.text,
          code: storyPlayerText.code,
          sentenceBoundaries: storyPlayerText.sentenceBoundaries,
          resolveStartOffset: () =>
            consumeMainTextResumeOffset(`${TTS_LOCALE[storyPlayerText.code] || "en-US"}::${storyPlayerText.text}`),
        }
      : tab === "conversations" && dailyPlayerText.text
      ? { text: dailyPlayerText.text, code: dailyPlayerText.code, sentenceBoundaries: dailyPlayerText.sentenceBoundaries }
      : (tab === "words" || tab === "vocabInUse" || tab === "slang" || tab === "favorites") && wordListPlayerText.text
      ? {
          text: wordListPlayerText.text,
          code: wordListPlayerText.code,
          resolveStartOffset: () =>
            consumeMainTextResumeOffset(`${TTS_LOCALE[wordListPlayerText.code] || "en-US"}::${wordListPlayerText.text}`),
        }
      : null;
  // فقط وقتی تبِ فعلی «داستان‌ساز»ه و کاربر روی نوارِ سراسریِ پایینِ صفحه
  // سوییچ رو رویِ «صوتِ من» گذاشته، پلیرِ اصلی به‌جای TTS، فایلِ آپلودیِ
  // کاربر رو کنترل می‌کنه (پخش/توقف، جمله‌ی قبل/بعد کاملاً دستی، بدون
  // هایلایتِ خودکار — دقیقاً همون منطقی که خودِ StoryBuilder داره).
  const isStoryUserAudioMode = tab === "story" && storyUserAudio?.playbackMode === "user";

  if (!loaded) {
    return (
      <div
        dir="rtl"
        lang="fa"
        style={{ fontFamily: fontFa, backgroundColor: colors.paper, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.inkSoft }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`}</style>
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        fontFamily: fontFa,
        backgroundColor: colors.paper,
        minHeight: "100vh",
        color: colors.ink,
        position: "relative",
      }}
    >
      <GlobalAddToStorySelection fallbackLangCode={nativeLang} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} isStoryUserAudioMode={isStoryUserAudioMode} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Lora:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        /* منوی بومیِ گوشی/مرورگر (کپی، اشتراک‌گذاری، انتخاب همه، جستجوی وب)
           هیچ‌جای این برنامه لازم نیست — همه‌جا به‌جاش دکمه‌ی «افزودن به
           داستان» خودمون (GlobalAddToStorySelection) هست. */
        * { -webkit-touch-callout: none; }
        ::selection { background: ${colors.goldSoft}; }
        /* هایلایتِ محدوده‌ی انتخاب‌شده برای «افزودن به داستان» —
           جایگزینِ انتخابِ بومیِ مرورگر (که فوراً پاک می‌شه)، تا رنگش
           تا وقتی پاپ‌آپِ «ذخیره / گرامر» بازه سرِ جاش بمونه. */
        ::highlight(hope-story-sel) { background-color: ${colors.goldSoft}; color: ${colors.ink}; }
        .spin { animation: pb-spin 0.8s linear infinite; }
        @keyframes pb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* لایه‌ی متنِ نامرئی/قابلِ‌سلکتِ ویووِرِ زنده‌ی PDF (PdfLivePageView) —
           همون CSSِ استانداردِ textLayer خودِ pdf.js: هر اسپن دقیقاً روی
           همون کلمه‌ی رسم‌شده تو canvas می‌شینه (شفاف، ولی قابلِ‌انتخاب). */
        .textLayer {
          position: absolute;
          text-align: initial;
          inset: 0;
          overflow: hidden;
          line-height: 1;
          text-size-adjust: none;
          forced-color-adjust: none;
          transform-origin: 0 0;
          caret-color: transparent;
        }
        .textLayer span, .textLayer br {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer ::selection { background: ${colors.gold}; opacity: 0.35; }
      `}</style>

      {/* Header — گرادیانتِ اختصاصیِ هر تم (headerFrom→headerTo)، به‌جای اینکه
          همیشه از teal→ink ساخته بشه؛ قبلاً چون ink توی همه‌ی تم‌ها خیلی
          تیره بود، هدر فارغ از تمِ انتخابی همیشه تقریباً یه‌شکل و تیره بود.
          radial highlight همون‌جوری برای حسِ عمق/نرمی نگه داشته شده. */}
      <header
        style={{
          background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.14), transparent 55%), linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
          color: colors.headerText,
        }}
        className="px-4 pt-6 pb-5"
      >
        <LingovaMascot uiLang={appPrefs.uiLang} fontZoom={APP_FONT_SIZES[appPrefs.fontSize]?.zoom || 1} outfitKey={SHOW_MASCOT_OUTFIT_OPTIONS ? appPrefs.mascotOutfit : "classic"} enabled={appPrefs.mascotEnabled !== false} characterKey={SHOW_MASCOT_CHARACTER_OPTIONS ? appPrefs.mascotCharacter : "classic"} />
        <div className="flex items-center justify-end mb-1">
          <div className="flex items-center gap-2.5">
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 34, height: 34, borderRadius: "50%" }} />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldSoft})`,
                  color: colors.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <SettingsMenu appPrefs={appPrefs} setAppPrefs={setAppPrefs} user={user} onLogout={onLogout} aiSettings={aiSettings} onCustomBgChange={onCustomBgChange} targetOrder={targetOrder} />
          </div>
        </div>
        <p style={{ color: colors.headerText, opacity: 0.85, fontSize: 13.5, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
          {trf("headerFromTo", appPrefs.uiLang, { native: nativeLabel, target: targetLabel })} · {user?.name || user?.email}
        </p>

        {/* Language pickers */}
        <div className="mt-4">
          <p style={{ fontSize: 13.5, color: colors.headerText, opacity: 0.85, marginBottom: 10, lineHeight: 1.9, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
            {tr("nativeLanguageLabel", appPrefs.uiLang)}
          </p>
          <DraggableLangRow
            order={langPickerOrder}
            setOrder={(next) => {
              setLangPickerOrder(next);
              setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
            }}
            languages={PHRASEBOOK_LANGUAGES}
            isActive={(code) => code === nativeLang}
            onClick={(code) => setNativeLang(code)}
          />
          <div style={{ height: 1, background: "rgba(255,255,255,.14)", margin: "18px 0 14px" }} />
          <p style={{ fontSize: 13.5, color: colors.headerText, opacity: 0.85, marginBottom: 10, lineHeight: 1.9, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
            {tr("targetLanguagesLabel", appPrefs.uiLang)}
          </p>
          <DraggableLangRow
            order={langPickerOrder}
            setOrder={(next) => {
              setLangPickerOrder(next);
              setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
            }}
            languages={PHRASEBOOK_LANGUAGES}
            isActive={(code) => targetOrder.includes(code)}
            onClick={(code) => toggleTargetLang(code)}
          />

          {targetLangList.length > 1 && (
            <>
              <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px", fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
                {tr("translationOrderLabel", appPrefs.uiLang)}
              </p>
              <OrderChips
                order={targetOrder}
                languages={PHRASEBOOK_LANGUAGES}
                onReorder={(next) => {
                  setTargetOrder(next);
                  setLangPickerOrder((prev) => syncLangPickerFromTargetOrder(prev, next));
                }}
                onRemove={toggleTargetLang}
              />
            </>
          )}
        </div>

        {/* ۵ گروهِ اصلی — داخلِ خودِ هدر، زیرِ زبان‌های مقصد. زیرتب‌هایِ هر
            گروه (اگر بیش از یکی باشد) در نوارِ زیرِ هدر نشان داده می‌شود. */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {TAB_GROUPS.map((g) => (
            <HeaderGroupButton
              key={g.key}
              label={tr(g.labelKey, appPrefs.uiLang)}
              icon={g.icon}
              active={activeTabGroup.key === g.key}
              onClick={() => goToTab(activeTabGroup.key === g.key ? g.tabs[0] : (lastTabInGroupRef.current[g.key] || g.tabs[0]))}
              fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa}
            />
          ))}
        </div>
      </header>

      {/* زیرتب‌هایِ گروهِ فعال — فقط وقتی گروه بیش از یک تب داره */}
      {activeTabGroup.tabs.length > 1 && (
        <nav className="px-4 py-3" style={{ backgroundColor: colors.paperDark, display: "flex", gap: 8, overflowX: "auto", borderBottom: `1px solid ${colors.cardBorder}` }}>
          {activeTabGroup.tabs.map((key) => (
            <TabButton key={key} label={tr(TAB_META[key].labelKey, appPrefs.uiLang)} icon={TAB_META[key].icon} active={tab === key} onClick={() => goToTab(key)} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
          ))}
        </nav>
      )}

      {/* Level filter — applies to conversation , words, favorites, and vocabulary */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3">
          <LevelFilterRow levelFilter={levelFilter} setLevelFilter={setLevelFilter} uiLang={appPrefs.uiLang} />
        </div>
      )}

      {/* دکمه‌ی مرتب‌سازی — دقیقاً همون چیزی که تبِ داستان‌ساز داره، اینجا هم
          برای تب‌های لغات/Vocabulary in Use/اسلنگ/علاقه‌مندی‌ها. مکالماتِ
          روزمره از یه کامپوننتِ جدا (DailyConversationsTab) استفاده می‌کنه
          که ترتیبِ خودِ سناریوها رو نگه می‌داره، پس اینجا نمی‌گنجه. */}
      {(tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3 flex justify-start">
          <GenericSortMenu sortKey={wordSortKey} setSortKey={setWordSortKey} options={WORD_LIST_SORT_OPTIONS} uiLang={appPrefs.uiLang} />
        </div>
      )}

      {/* Search — meaningful for the phrase and word list tabs */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3">
          <div
            className="flex items-center gap-2 px-4"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, height: 48 }}
          >
            <Search size={17} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "words" || tab === "vocabInUse" || tab === "slang"
                  ? tr("searchWordsPlaceholder", appPrefs.uiLang)
                  : tab === "conversations"
                  ? tr("searchConversationsPlaceholder", appPrefs.uiLang)
                  : tr("searchPhrasesPlaceholder", appPrefs.uiLang)
              }
              style={{ flex: 1, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="پاک کردن جستجو">
                <X size={16} color={colors.inkSoft} />
              </button>
            )}
          </div>
        </div>
      )}

      <main
        className="px-4 py-4"
        style={{
          // نوارِ «تمرین جمله‌سازی» حالا همیشه چسبیده به کفِ صفحه‌ست (بالای
          // پلیر) و توی همه‌ی تب‌ها دیده می‌شه، پس محتوای اصلی باید به
          // اندازه‌ی ارتفاعِ واقعیِ همون نوار (practicePanelHeight، که با
          // ResizeObserver اندازه‌گیری می‌شه) از پایین فاصله بگیره تا زیرِ
          // نوار گم نشه.
          paddingBottom: (showPlayerBar ? 150 : 96) + practicePanelHeight,
        }}
      >
        {tab === "conversations" && (
  <DailyConversationsTab
    data={ALL_DAILY_CONVERSATIONS}
    query={debouncedQuery}
    uiLang={appPrefs.uiLang || "fa"}
    nativeLang={nativeLang}
    nativeLabel={nativeLabel}
    aiSettings={aiSettings}
    ClickableSentence={ClickableSentence}
    SpeakButton={SpeakButton}
    targetLangs={targetLangList}
    translateFree={translateFree}
    retranslateLine={(text, code) => retranslateDailyLine(text, code, aiSettings)}
    getCachedTranslationMap={getCachedTranslationMap}
    levelFilter={levelFilter}
    speechController={speechController}
    onFullTextChange={setDailyPlayerText}
    autoScrollActive={tab === "conversations"}
    highlightColor={appPrefs.highlightColor}
    loadReadWordIds={loadReadWordIds}
    saveReadWordIds={saveReadWordIds}
    wordsPageSize={WORDS_PAGE_SIZE}
    readDoneColor={READ_DONE_COLOR}
    readDoneBg={READ_DONE_BG}
  />
)}

        {tab === "favorites" && (
          <div className="flex flex-col gap-6">
            {favorites.size === 0 && favoritedWords.length === 0 ? (
              <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
                {tr("noFavoritesYet", appPrefs.uiLang)}
              </p>
            ) : (
              <>
                {favorites.size > 0 && (
                  <PhraseList
                    conversation ={conversation .filter((p) => favorites.has(p.id))}
                    nativeLang={nativeLang}
                    targetLangs={targetLangList}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    query={debouncedQuery}
                    levelFilter={levelFilter}
                    aiSettings={aiSettings}
                    autoplayEnabled={tab === "favorites"}
                    emptyText=""
                    uiLang={appPrefs.uiLang}
                    // اگه عبارتِ علاقه‌مندی‌شده‌ای هست، دکمه‌ی مرکزیِ پخشِ پلیر
                    // همینا رو می‌خونه (با هایلایتِ همینجا). اگه چیزی نبود،
                    // نوبت به لیستِ لغاتِ زیرش می‌رسه (پایین‌تر).
                    onFullTextChange={setWordListPlayerText}
                    autoScrollActive={tab === "favorites"}
                    highlightColor={appPrefs.highlightColor}
                  />
                )}
                {favoritedWords.length > 0 && (
                  <div>
                    <h2 style={{ color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{tr("favoritesWordsHeading", appPrefs.uiLang)}</h2>
                    <WordList
                      words={favoritedWords}
                      listId="favorites"
                      wordFavorites={wordFavorites}
                      toggleWordFavorite={toggleWordFavorite}
                      query={debouncedQuery}
                      levelFilter={levelFilter}
                      sortKey={wordSortKey}
                      emptyText=""
                      uiLang={appPrefs.uiLang}
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      targetLangs={targetLangList}
                      aiSettings={aiSettings}
                      ClickableSentence={ClickableSentence}
                      autoplayEnabled={tab === "favorites"}
                      // فقط وقتی عبارتِ علاقه‌مندی‌شده‌ای نیست، لیستِ لغات
                      // مسئولِ متنِ دکمه‌ی مرکزیِ پلیر می‌شه — تا دو تا لیست
                      // با هم رویِ یه دکمه رقابت نکنن.
                      onFullTextChange={favorites.size > 0 ? undefined : setWordListPlayerText}
                      autoScrollActive={tab === "favorites"}
                      highlightColor={appPrefs.highlightColor}
                      jumpTarget={wordJumpTarget}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "words" && (
          <WordList
            words={wordsWithSaved}
            listId="words"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "words"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "words"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "vocabInUse" && (
          <WordList
            words={VOCAB_IN_USE_WORDS}
            listId="vocabInUse"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "vocabInUse"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "vocabInUse"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "slang" && (
          <WordList
            words={SLANG_WORDS}
            listId="slang"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "slang"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "slang"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "review" && (
          <ReviewBox
            conversation ={reviewPool}
            boxes={boxes}
            setBoxes={setBoxes}
            nativeLang={nativeLang}
            targetLangs={targetLangList}
            index={reviewIndex}
            setIndex={setReviewIndex}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            uiLang={appPrefs.uiLang}
            aiSettings={aiSettings}
          />
        )}

        {tab === "saved" && (
          <SavedWordsPanel
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            onJumpToStory={(lang, words) => {
              // فقط لغات رو به داستان‌ساز می‌فرسته (که همیشه mount شده و
              // همون لحظه‌شون رو دریافت می‌کنه) — بدون این‌که خودش تبِ
              // فعلی رو عوض کنه؛ رفتن به تبِ داستان‌ساز، خودِ کاربره.
              setStoryJump({ lang, words, token: Date.now() });
            }}
            onJumpToOrigin={(entry) => {
              // لغت/عبارتی که هنوز (قبل از این قابلیت) origin نداشته —
              // نمی‌دونیم از کجا اومده.
              const originTab = entry && entry.origin && entry.origin.tab;
              if (!originTab) return false;
              setTab(originTab);
              // اگه این لغت وسطِ خوندنِ یه داستان (تبِ «داستان‌ساز») ذخیره شده
              // بود، شماره‌ی پاراگراف/جمله‌ش (و شناسه‌ی داستان، اگه اون
              // موقع ذخیره شده بود) رو هم داریم — پس به‌جای فقط بازکردنِ تب،
              // دقیقاً همون داستان و همون سطر رو باز می‌کنیم و بهش اسکرول
              // می‌کنیم.
              if (originTab === "story" && entry.origin.pi != null) {
                setStoryJump({
                  storyId: entry.origin.storyId ?? null,
                  pi: entry.origin.pi,
                  si: entry.origin.si ?? null,
                  token: Date.now(),
                });
              }
              // تب‌های لغات (لغات/لغات‌و‌اخبار/اسلنگ/علاقه‌مندی‌ها) — اگه اون
              // لغت با شناسه‌ی دقیقِ همون ردیف (origin.id) ذخیره شده باشه،
              // به‌جای فقط پرکردنِ کادرِ جستجو، دقیقاً همون ردیف رو (بعد از
              // پاک‌کردنِ فیلترِ سطح و جستجو، تا چیزی قایمش نکنه) هایلایت و
              // بهش اسکرول می‌کنیم. اگه id نبود (لغاتی که قبل از این
              // قابلیت ذخیره شدن، یا از مکالمات روزمره اومدن — که ردیفِ
              // مستقلی نداره)، مثلِ قبل کادرِ جستجو رو با خودِ لغت پر می‌کنیم.
              if (["words", "vocabInUse", "slang", "favorites"].includes(originTab) && entry.origin.id != null) {
                setLevelFilter("all");
                setQuery("");
                setWordJumpTarget({ id: entry.origin.id, token: Date.now() });
              } else if (["conversations", "words", "favorites", "vocabInUse", "slang"].includes(originTab)) {
                setQuery(entry.word);
              }
              return true;
            }}
          />
        )}

        {/* گرامر هم مثل داستان‌ساز همیشه mount شده می‌مونه، که با رفتن به تب
            دیگه، چتِ تمرین جمله‌سازی و توضیحِ در حال بارگذاری از بین نره. */}
        <div style={{ display: tab === "grammar" ? "block" : "none" }}>
          <GrammarPanel
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            aiSettings={aiSettings}
            calendarSystem={appPrefs.calendarSystem || "jalali"}
            jumpTo={grammarJump}
            playerBarHeight={showPlayerBar ? playerBarHeight : 0}
            practiceOpacity={practiceOpacity}
            setPracticeOpacity={setPracticeOpacity}
            onPracticePanelHeightChange={setPracticePanelHeight}
          />
        </div>

        {tab === "speaking" && (
          <SpeakingPracticePanel
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            aiSettings={aiSettings}
            callAI={callAI}
            SpeakButton={SpeakButton}
            ClickableSentence={ClickableSentence}
            translateFree={translateFree}
            user={user}
            saveGrammarNote={saveGrammarNote}
          />
        )}

        {/* توجه: برخلاف بقیه‌ی تب‌ها، داستان‌ساز همیشه mount شده می‌مونه (فقط
            با display:none قایم می‌شه) نه این‌که با رفتن به تب دیگه کامل از
            بین بره. قبلاً چون با {tab === "story" && ...} کاملاً unmount
            می‌شد، هر بار کاربر می‌رفت لغات‌ذخیره‌شده/دیکشنری و برمی‌گشت،
            داستانِ ساخته‌شده (و لغات انتخابی) پاک می‌شد. */}
        <div style={{ display: tab === "story" ? "block" : "none" }}>
          <StoryBuilder
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            langPickerOrder={langPickerOrder}
            setLangPickerOrder={setLangPickerOrder}
            wordStats={wordStats}
            setWordStats={setWordStats}
            savedStories={savedStories}
            setSavedStories={setSavedStories}
            aiSettings={aiSettings}
            jumpTo={storyJump}
            onFullTextChange={setStoryPlayerText}
            onUserAudioStateChange={setStoryUserAudio}
            autoScrollActive={tab === "story"}
            calendarSystem={appPrefs.calendarSystem || "jalali"}
            highlightColor={appPrefs.highlightColor}
            uid={user?.uid}
            uiLang={appPrefs.uiLang}
          />
        </div>
      </main>

      {/* پلیر — درست یه پله بالاترِ نوارِ «تمرین جمله‌سازی» می‌شینه (که حالا
          پایین‌ترین قسمتِ صفحه‌ست، bottom: 0)، پس ارتفاعِ اندازه‌گیری‌شده‌ی
          همون نوار (practicePanelHeight) رو به bottom اضافه می‌کنیم. همیشه
          روی صفحه می‌مونه (position: fixed)، حتی موقع اسکرول. */}
      {showPlayerBar && (
        <>
        <div
          ref={playerBarRef}
          onMouseDown={(e) => startPlayerLongPress(e.clientX, e.clientY)}
          onMouseMove={(e) => movePlayerLongPress(e.clientX, e.clientY)}
          onMouseUp={clearPlayerLongPress}
          onMouseLeave={clearPlayerLongPress}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) startPlayerLongPress(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) movePlayerLongPress(t.clientX, t.clientY);
          }}
          onTouchEnd={clearPlayerLongPress}
          onTouchCancel={clearPlayerLongPress}
          onClickCapture={handlePlayerClickCapture}
          onContextMenu={(e) => {
            if (playerLongPressRef.current.fired) e.preventDefault();
          }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: practicePanelHeight,
            zIndex: 40,
            // پس‌زمینه‌ی خودِ نوارِ پلیر، طبقِ درخواستِ کاربر، حالا با همون
            // گرادیانتِ اختصاصیِ تمِ فعلی که هدرِ بالای صفحه ازش استفاده
            // می‌کنه «ست» شده — به‌جایِ رنگِ صافِ paper. کنترل‌های خودِ پلیر
            // (نوارِ پیشرفت، دکمه‌ها) داخلِ یه پنلِ روشنِ داخلی می‌مونن (پایین‌تر)
            // تا کنتراست/خوانایی‌شون که برایِ زمینه‌ی روشن طراحی شده بود
            // دست‌نخورده بمونه، و فقط قابِ بیرونیِ نوار رنگِ هدر رو بگیره.
            background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.14), transparent 55%), linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
            opacity: playerOpacity / 100,
            padding: "7px 7px 0",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.18)",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <div
            style={{
              backgroundColor: colors.paper,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: "hidden",
            }}
          >
          {/* ردیفِ سوییچِ TTS⇄صوتِ من — فقط تبِ داستان‌ساز؛ اگه این تب نباشه
              اصلاً رندر نمی‌شه که فضایِ خالی نمونه. */}
          {tab === "story" && (
            <div className="px-4" style={{ paddingTop: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlayerBarStorySwitch ua={storyUserAudio} />
            </div>
          )}
          {/* ردیفِ نوارِ پیشرفت: زمانِ فعلی — نوارِ کِشیدنی — زمانِ کل — سرعت */}
          {isStoryUserAudioMode ? (
            <UserAudioProgressTrack ua={storyUserAudio} color={colors.gold} />
          ) : (
            <PlayerProgressTrack color={colors.gold} />
          )}
          {/* ردیفِ واحدِ همه‌ی آیکون‌ها: ضبطِ صدا، میوت، تکرار، بازگشت‌به‌اول،
              جمله‌ی بعد، پخش/توقفِ مرکزی، جمله‌ی قبل، شفافیت — با
              space-between پخش می‌شن رویِ کلِ عرضِ پلیر تا فضایِ خالیِ
              کنارها هدر نره، ولی خودِ آیکون‌ها هم زیادی به هم نچسبن. */}
          <div className="px-3" style={{ paddingTop: 2, paddingBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ marginInlineStart: 18 }}>
              <MyVoiceRecorder
                color={colors.rose}
                getAppAudioElement={storyUserAudio?.getAudioElement}
                appAudioActive={isStoryUserAudioMode && !!storyUserAudio?.isPlaying}
              />
            </div>
            <MuteButton color={colors.gold} />
            <RepeatButton color={colors.gold} />
            {isStoryUserAudioMode ? (
              <UserAudioRestartButton color={colors.gold} ua={storyUserAudio} />
            ) : (
              <RestartButton color={colors.gold} startText={activeTabAudio?.text} startCode={activeTabAudio?.code} sentenceBoundaries={activeTabAudio?.sentenceBoundaries} />
            )}
            {isStoryUserAudioMode ? (
              <UserAudioABButton ua={storyUserAudio} color={colors.gold} />
            ) : (
              <ABRepeatButton color={colors.gold} />
            )}
            {isStoryUserAudioMode ? (
              <UserAudioChunkNavButton direction="next" ua={storyUserAudio} color={colors.ink} />
            ) : (
              <ChunkNavButton direction="next" color={colors.ink} />
            )}
            <div style={{ margin: "0 4px" }}>
              {isStoryUserAudioMode ? (
                <UserAudioMainPlayButton ua={storyUserAudio} color={colors.teal} />
              ) : (
                <MainPlayButton
                  startText={activeTabAudio?.text}
                  startCode={activeTabAudio?.code}
                  resolveStartOffset={activeTabAudio?.resolveStartOffset}
                  sentenceBoundaries={activeTabAudio?.sentenceBoundaries}
                  color={colors.teal}
                />
              )}
            </div>
            {isStoryUserAudioMode ? (
              <UserAudioChunkNavButton direction="prev" ua={storyUserAudio} color={colors.ink} />
            ) : (
              <ChunkNavButton direction="prev" color={colors.ink} />
            )}
            {/* آیکونِ شفافیتِ پلیر — کلیک روش ردیفِ سرتاسریِ اسلایدر رو
                (که در کفِ پلیر، زیرِ همینِ ردیفِ آیکون‌ها رندر می‌شه) باز می‌کنه. */}
            <button
              onClick={(e) => { e.stopPropagation(); setOpacityPopoverOpen((v) => !v); }}
              aria-label="تنظیمِ شفافیتِ پلیر"
              title="تنظیمِ شفافیتِ پلیر"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: opacityPopoverOpen ? colors.gold : colors.inkSoft,
                padding: 7,
                marginInlineEnd: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Blend size={19} />
            </button>
          </div>
          {/* ردیفِ سرتاسریِ تنظیمِ شفافیت — دقیقاً در کفِ پلیر، زیرِ ردیفِ
              آیکون‌ها، به عرضِ کاملِ پلیر (نه یه پاپ‌آورِ کوچیکِ شناور که
              ممکنه از کادر بزنه بیرون). */}
          {opacityPopoverOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="px-3"
              style={{
                paddingTop: 6,
                paddingBottom: 10,
                borderTop: `1px solid ${colors.cardBorder}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap" }}>شفافیت پلیر</span>
              <input
                type="range"
                min={0}
                max={100}
                value={playerOpacity}
                onChange={(e) => setPlayerOpacity(Number(e.target.value))}
                aria-label="شفافیت پلیر"
                style={{ flex: 1, accentColor: colors.gold }}
              />
              <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 28, textAlign: "left" }}>{playerOpacity}%</span>
              <button
                onClick={() => setPlayerOpacity(100)}
                aria-label="بازنشانی شفافیت پلیر به ۱۰۰٪"
                title="بازنشانی شفافیت"
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.gold, padding: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
          </div>
        </div>
        {/* دکمه‌ی «بازنشانیِ شفافیت» — وقتی شفافیتِ پلیر خیلی پایین میاد (زیرِ
            ۷۰٪)، خودِ نوار (و اسلایدرِ توش) هم کم‌رنگ/کم‌کنتراست می‌شه و
            برگردوندنش به حالتِ عادی سخت می‌شه. این دکمه بیرونِ اون div ِ
            کم‌رنگ‌شده (خارج از اثرِ opacity والد) رندر می‌شه تا همیشه کاملاً
            واضح و قابل‌لمس بمونه، مهم نیست شفافیتِ پلیر چقدر پایین رفته باشه. */}
        {playerOpacity <= 7 && (
          <button
            onClick={() => setPlayerOpacity(100)}
            aria-label="بازنشانی شفافیت پلیر به ۱۰۰٪"
            title="بازنشانی شفافیت"
            style={{
              position: "fixed",
              left: 10,
              bottom: practicePanelHeight + 10,
              zIndex: 41,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${colors.cardBorder}`,
              backgroundColor: colors.paper,
              color: colors.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(28,37,65,0.25)",
              opacity: 1,
            }}
          >
            <RotateCcw size={16} />
          </button>
        )}
        </>
      )}

    </div>
  );
}
// ---------------------------------------------------------------------------
// 🐛 باگِ اصلی: زبانِ مادری (nativeLang) روی خیلی از لیست‌ها (عبارات/VOCAB،
// لیستِ لغاتِ خبر/اسلنگ، فلش‌کارتِ لایتنر) به‌صورتِ `p.t[nativeLang]`
// مستقیم از رویِ دیتای ثابتِ VOCAB خونده می‌شد. دیتای VOCAB فقط برایِ یه
// زیرمجموعه‌ی محدود از زبان‌ها (مثلاً en/fa و چندتایِ دیگه) از قبل ترجمه‌ی
// نویسنده داره — پس اگه کاربر زبانِ مادری‌ش رو چیزی بیرونِ همون زیرمجموعه
// می‌ذاشت (مثلاً آلمانی)، `p.t[nativeLang]` همیشه `undefined` می‌موند و کل
// خط/متن خالی نشون داده می‌شد؛ یعنی انگار انتخابِ زبانِ مادری اصلاً اثری
// نداشت. راه‌حل: دقیقاً همون الگویی که تبِ «لغات» (WordList/
// WordTargetTranslation) برای این مشکل داره — اگه ترجمه‌ی ثابت نبود، اول
// کشِ دستگاه، بعد لحظه‌ای translateFree (از رویِ متنِ انگلیسیِ ثابتِ خودِ
// آیتم) — اینجا هم به‌صورتِ یه کامپوننتِ سبکِ مشترک (بدون رندرِ خودش، فقط
// resolve و گزارش به بالا) پیاده می‌شه، تا هر لیستی که همین مشکل رو داره
// بتونه ازش استفاده کنه.
export function NativeTextResolver({ resolveKey, sourceText, nativeLang, knownText, aiSettings, onResolved }) {
  useEffect(() => {
    if (knownText) {
      onResolved(resolveKey, knownText);
      return;
    }
    if (!sourceText || !nativeLang) return;
    const cached = loadWordTranslation(sourceText, nativeLang);
    if (cached) {
      onResolved(resolveKey, cached);
      return;
    }
    let cancelled = false;
    translateFree(sourceText, nativeLang, "en", aiSettings)
      .then((t) => {
        if (cancelled || !t) return;
        onResolved(resolveKey, t);
        saveWordTranslation(sourceText, nativeLang, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveKey, sourceText, nativeLang, knownText]);
  return null;
}
