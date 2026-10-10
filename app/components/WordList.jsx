// تب لغات
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Star, Check, X } from "lucide-react";
import RangeSliderFilter from "../../RangeSliderFilter.jsx";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { LANGUAGES } from "../constants/languages.js";
import { posLabel } from "../constants/levels.js";
import { READ_DONE_BORDER, READ_DONE_CHECK_GRADIENT, READ_DONE_GRADIENT, READ_DONE_SHADOW, READ_MARKER_COLOR, STAR_FAVORITE_COLOR, colors, fontFa, fontLatin, highlightBg, mainTextColor } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";
import { sortWordListEntries } from "../sort/sortHelpers.js";
import { rememberMainTextResumeOffset, speechController, useAutoplayOnScroll } from "../speech/speechController.js";
import { hideFromWordsTab } from "../words/savedStoryWords.js";
import { loadReadWordIds, loadWordTranslation, saveReadWordIds } from "../words/wordTranslations.js";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelBadge, PersonalLevelPicker } from "./levels/LevelControls.jsx";
import { VocabBookExample, WordExamples, WordTargetTranslation } from "./words/WordExamples.jsx";

// ---------------------------------------------------------------------------
// A–Z word dictionary, grouped by CEFR level — same card language as
// PhraseList (word + audio + star) plus a part-of-speech tag like VocabList.
// ---------------------------------------------------------------------------
// تعداد لغتی که در هر «بخش» رندر می‌شه. رندر کردن هزاران لغت با هم (کل
// WORDS_AZ، حدود چند هزار ردیف) همون چیزیه که تب «لغات» رو کند می‌کرد —
// هر ردیف یه ClickableSentence کامل با چند useEffect خودشه، و چند هزارتاش
// با هم خیلی سنگینه. اینجا فقط WORDS_PAGE_SIZE تا رندر می‌شه و با رسیدن
// اسکرول به ته لیست، بخش بعدی اضافه می‌شه (اسکرول‌بی‌نهایتِ ساده، بدون نیاز
// به کتابخونه‌ی جدید).
export const WORDS_PAGE_SIZE = 60;
export const WordList = React.memo(function WordList({ words, listId, wordFavorites, toggleWordFavorite, query, levelFilter, sortKey, emptyText, nativeLang, nativeLabel, targetLangs, aiSettings, autoplayEnabled, onFullTextChange, autoScrollActive, ClickableSentence, highlightColor, jumpTarget, uiLang, defaultPageSize }) {
  // بازه‌ی پیش‌فرضِ نمایش برای این لیستِ خاص. همه‌ی تب‌ها (لغات، اخبار،
  // اسلنگ، Vocabulary in Use) چیزی پاس نمی‌دن و همون WORDS_PAGE_SIZE
  // (۶۰ تا) امن رو می‌گیرن — چون هرکدوم می‌تونن چند صد تا چند هزار ردیف
  // داشته باشن و رندرِ همه‌شون با هم (هر ردیف چند فچِ ترجمه/مثالِ جدا داره)
  // برنامه رو هنگ می‌کنه. قبلاً تبِ «Vocabulary in Use» با
  // defaultPageSize={VOCAB_IN_USE_WORDS.length} کلِ ۲۲۶۸ لغتش رو یه‌جا
  // می‌ساخت — همون بلایی که سرِ اسلنگ اومده بود. الان دیگه هیچ تبی این
  // override رو پاس نمی‌ده؛ به‌جاش، پایین‌تر (loadMoreRef/IntersectionObserver)
  // با اسکرولِ کاربر به‌طور خودکار دسته‌های بعدی اضافه می‌شن، بدون نیاز به
  // تایپِ عدد.
  const effectivePageSize = defaultPageSize || WORDS_PAGE_SIZE;
  // زبان‌هایی که باید زیرِ هر لغت ترجمه‌شون نشون داده بشه: همون زبان‌های
  // مقصدی که کاربر بالای صفحه انتخاب/مرتب کرده (targetLangs)، منهای خودِ
  // انگلیسی (چون انگلیسی همون سرلغته که بالا نشون داده می‌شه و تکرارش
  // بی‌فایده‌ست). اگه به‌هر دلیلی چیزی انتخاب نشده بود، حداقل فارسی رو نشون
  // می‌دیم تا لیست هیچ‌وقت بدون معنی نمونه.
  const targetDisplayLangs = (targetLangs && targetLangs.length ? targetLangs.filter((l) => l.code !== "en") : []);
  // زبانِ مادریِ کاربر (nativeLang) باید همیشه جزوِ زبان‌هایی باشه که
  // ترجمه‌شون نشون داده می‌شه — قبلاً این لیست فقط از targetLangs (زبان‌های
  // مقصد/در حالِ یادگیری) ساخته می‌شد، و اگه nativeLang رو کاربر به‌عنوانِ
  // یکی از زبان‌های مقصد هم اضافه نکرده بود، ترجمه‌ش هیچ‌وقت نشون داده
  // نمی‌شد (و به‌جاش فارسیِ هاردکدشده به‌عنوانِ fallback می‌اومد).
  const nativeDisplayLang = nativeLang && nativeLang !== "en" && !targetDisplayLangs.some((l) => l.code === nativeLang)
    ? LANGUAGES.find((l) => l.code === nativeLang) || { code: nativeLang, label: nativeLabel || nativeLang, abbr: nativeLang.toUpperCase() }
    : null;
  const effectiveDisplayLangs = nativeDisplayLang
    ? [nativeDisplayLang, ...targetDisplayLangs]
    : (targetDisplayLangs.length ? targetDisplayLangs : [{ code: "fa", label: "فارسی", abbr: "FA" }]);

  const q = (query || "").trim().toLowerCase();

  // ترجمه‌های همین لغت‌ها که تا الان (در این نشست، یا از کشِ دائمیِ دستگاه
  // در نشست‌های قبلی) resolve شدن. برای اینکه جستجو بتونه رویِ ترجمه‌ها هم
  // کار کنه — نه فقط متنِ اصلیِ انگلیسی/فارسی — این state رو زودتر از
  // فیلترِ پایین تعریف می‌کنیم (قبلاً پایین‌تر تعریف می‌شد و فقط برایِ
  // «خواندنِ پیوسته‌ی ترجمه‌ها» استفاده می‌شد، پس جستجو اصلاً بهش دسترسی
  // نداشت). WordTargetTranslation با onResolved همین رو پر می‌کنه.
  const [wordTranslationValues, setWordTranslationValues] = useState({}); // { [langCode]: { [wordId]: text } }
  const reportWordTranslation = useCallback((langCode, wordId, value) => {
    setWordTranslationValues((prev) => {
      const langMap = prev[langCode] || {};
      if (langMap[wordId] === value) return prev;
      return { ...prev, [langCode]: { ...langMap, [wordId]: value } };
    });
  }, []);

  // فیلترِ سطح/جستجو رو با useMemo محاسبه می‌کنیم — نه رویِ هر رندر از نو —
  // چون این لیست‌ها (مخصوصاً اسلنگ) می‌تونن چند هزار ردیف داشته باشن؛
  // محاسبه‌ی دوباره‌ش رویِ هر رندر (مثلاً هر بار که کاربر تویِ بازه‌ی
  // «از # تا #» یه رقم تایپ می‌کنه) همون چیزی بود که برنامه رو کند/هنگ
  // می‌کرد. displayLangsKey به‌جای خودِ آرایه‌ی effectiveDisplayLangs تویِ
  // وابستگی‌ها میاد چون اون آرایه هر رندر یه رفرنسِ تازه‌ست (حتی با محتوایِ
  // یکسان) و می‌ذاشت memo هیچ‌وقت واقعاً کار نکنه.
  const displayLangsKey = effectiveDisplayLangs.map((l) => l.code).join(",");
  const filtered = useMemo(() => {
    let list = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
    if (q) {
      list = list.filter((w) => {
        if (w.t) {
          return Object.values(w.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
        }
        if (w.en.toLowerCase().includes(q) || w.fa.includes(q)) return true;
        // لغاتی مثلِ DAILY_WORDS/SLANG_WORDS/WORDS_AZ ترجمه‌ی
        // ثابتِ توی دیتا ندارن — ترجمه‌شون فقط لحظه‌ای (lazy) گرفته و کش
        // می‌شه. برای این‌که جستجو رویِ همون ترجمه‌های انتخابیِ کاربر هم
        // جواب بده، هم کشِ زنده‌ی همین رندر (wordTranslationValues) و هم
        // کشِ دائمیِ دستگاه (localStorage، از بازدیدهای قبلی) رو چک می‌کنیم.
        return effectiveDisplayLangs.some((l) => {
          const live = wordTranslationValues[l.code] && wordTranslationValues[l.code][w.id];
          if (live && live.toLowerCase().includes(q)) return true;
          const cached = loadWordTranslation(w.en, l.code);
          return cached && cached.toLowerCase().includes(q);
        });
      });
    }
    // مرتب‌سازی — نگاه کن به GenericSortMenu/WORD_LIST_SORT_OPTIONS بالای
    // فایل. بعد از فیلترِ سطح/جستجو انجام می‌شه تا رویِ همون لیستِ نهاییِ
    // نمایش‌داده‌شده اثر بذاره.
    return sortWordListEntries(list, sortKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, levelFilter, q, wordTranslationValues, displayLangsKey, sortKey]);

  // به‌جای اسکرولِ بی‌نهایت، چون تعدادِ لغات خیلی زیاده، کاربر یه بازه‌ی
  // عددی («از # تا #») مشخص می‌کنه و فقط همون بخش از لیست رندر می‌شه.
  // ورودی‌ها رو به‌صورتِ رشته (نه عدد) نگه می‌داریم و پیش‌فرض خالی‌ان — اگه
  // مستقیم به عددِ ثابتِ ۱ ست بشن، همین که کاربر فیلد رو خالی کنه تا عددِ
  // جدید تایپ کنه، فوراً دوباره ۱ می‌شه و اصلاً نمی‌شه چیزی توش تایپ کرد
  // (باگی که قبلاً باعث می‌شد ستونِ «تا» همیشه رویِ ۱ بمونه). محدودکردنِ
  // مقدار به بازه‌ی معتبر فقط موقعِ خروج از فیلد (onBlur) انجام می‌شه، نه
  // حینِ تایپ.
  const [rangeFromInput, setRangeFromInput] = useState("");
  const [rangeToInput, setRangeToInput] = useState("");
  // مرزِ بالاییِ «خودکار» — با اسکرولِ کاربر به تهِ بخشِ فعلی، این مقدار
  // خودش effectivePageSize واحد زیاد می‌شه (اسکرولِ بی‌نهایتِ واقعی، بدون
  // نیاز به تایپِ عدد). فقط وقتی کاربر خودش چیزی تو فیلدِ «تا» تایپ/درگ
  // کنه (rangeToInput غیرخالی بشه)، اون مقدارِ دستی اولویت پیدا می‌کنه و
  // این مقدارِ خودکار نادیده گرفته می‌شه — تا وقتی که دوباره جستجو/فیلتر
  // عوض بشه و همه‌چیز ریست بشه.
  const [autoLoadedTo, setAutoLoadedTo] = useState(effectivePageSize);
  useEffect(() => {
    setRangeFromInput("");
    setRangeToInput("");
    setAutoLoadedTo(effectivePageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, levelFilter, words, effectivePageSize]);

  const defaultRangeTo = Math.min(filtered.length, autoLoadedTo) || filtered.length || 1;
  const parsedFrom = parseInt(rangeFromInput, 10);
  const parsedTo = parseInt(rangeToInput, 10);
  const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
  const effTo = Number.isNaN(parsedTo) ? defaultRangeTo : parsedTo;
  const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(filtered.length, 1));
  const clampedTo = Math.min(Math.max(clampedFrom, effTo), filtered.length || clampedFrom);
  const visible = filtered.slice(clampedFrom - 1, clampedTo);

  // اسکرولِ بی‌نهایتِ واقعی: یه سنتینلِ نامرئی زیرِ آخرین ردیفِ رندرشده
  // می‌ذاریم؛ همین که وارد دیدِ کاربر بشه (یعنی به تهِ لیستِ فعلی رسیده)،
  // با IntersectionObserver دسته‌ی بعدی رو خودکار اضافه می‌کنیم. این‌جوری
  // هم فقط effectivePageSize ردیف در هر لحظه رندر می‌شه (پایداری/سرعت،
  // چه لیست ۶۰ تایی باشه چه ۲۲۶۸ تایی مثلِ Vocabulary in Use)، هم کاربر
  // با اسکرولِ ساده، بدون هیچ تایپِ عددی، نهایتاً به همه‌ی لغات می‌رسه.
  const loadMoreRef = useRef(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setAutoLoadedTo((prev) => Math.min(prev + effectivePageSize, filtered.length));
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, effectivePageSize, clampedTo]);

  // -----------------------------------------------------------------------
  // ردیابیِ خوانده‌شده/خوانده‌نشده — به ازای همین تب (listId) روی دستگاه
  // ذخیره می‌شه تا کاربر بفهمه کدوم لغات رو قبلاً مرور کرده.
  const [readIds, setReadIds] = useState(() => loadReadWordIds(listId));
  useEffect(() => {
    setReadIds(loadReadWordIds(listId));
  }, [listId]);
  const toggleWordRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(listId, next);
      return next;
    });
  };
  const markRangeRead = (read) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      visible.forEach((w) => {
        if (read) next.add(w.id);
        else next.delete(w.id);
      });
      saveReadWordIds(listId, next);
      return next;
    });
  };
  const readCountInRange = visible.filter((w) => readIds.has(w.id)).length;
  // این یکی رویِ کلِ لیستِ فیلترشده حساب می‌شه (نه فقط بازه‌ی دیده‌شده)، پس
  // با useMemo فقط وقتی filtered یا readIds واقعاً عوض بشن دوباره محاسبه
  // می‌شه — نه رویِ هر رندر (مثلاً هر تایپ تویِ فیلدهای بازه).
  const readCountTotal = useMemo(() => filtered.filter((w) => readIds.has(w.id)).length, [filtered, readIds]);

  const autoplayItems = visible.map((w) => ({ id: w.id, text: w.en, code: "en" }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  // متنِ کاملِ «خواندنِ همه‌ی این لیست» — همون الگویی که داستان‌ساز و
  // مکالمات روزمره دارن، اینجا هم برای لیستِ لغات. فقط همون بازه‌ی
  // انتخاب‌شده (از # تا #) خونده می‌شه، نه کلِ لیستِ فیلترشده — هم چون
  // منطقی‌تره (کاربر همون بازه رو می‌بینه)، هم چون ساختنِ این متن برایِ
  // کلِ لیست (که می‌تونه چند هزار لغت باشه) رویِ هر رندر محاسبه می‌شد و
  // خودش یکی از عواملِ اصلیِ کندی/هنگِ صفحه بود.
  //
  // نکته‌ی مهم: برخلافِ داستان‌ساز/مکالمات (که خط‌هاشون خودشون نقطه‌ی پایانِ
  // جمله دارن و همین باعث می‌شه speechController هر خط رو یه «جمله»ی
  // جدا و مستقل حساب کنه)، این‌جا فقط کلمه‌های تک‌افتاده‌ی بدونِ علامتِ
  // نگارشی پشتِ‌سرِ‌همن. speechController اگه یه بلوکِ متنِ بدونِ نقطه رو
  // خیلی طولانی ببینه، مجبور می‌شه به‌صورتِ اضطراری هر ۴۰ کلمه رو یه‌جا تو
  // یه chunk بریزه (MAX_WORDS_PER_CHUNK) — یعنی هایلایت/اسکرول فقط هر ۴۰
  // کلمه یه‌بار به‌روز می‌شد، و چون این ۴۰ کلمه همه با هم توی یه نفس (یه
  // Utterance) خونده می‌شدن، برای کاربر مثلِ این بود که کلمه‌ها خیلی سریع
  // و بدونِ هیچ هایلایتِ قابلِ‌دنبال‌کردنی رد می‌شن. برای همین این‌جا بینِ
  // هر کلمه یه نقطه می‌ذاریم — این‌جوری خودِ همون منطقِ تقسیمِ جمله‌ایِ
  // speechController هر کلمه رو یه جمله‌ی مستقل حساب می‌کنه: هم چانک/آفست
  // دقیقاً روی همون کلمه می‌ایسته (هایلایتِ لحظه‌به‌لحظه‌ی هر کلمه)، هم بینِ
  // دو کلمه همون مکثِ طبیعیِ بینِ‌جمله‌ای (sentenceGapMs) میفته که سرعتِ
  // خوندن رو قابلِ‌دنبال‌کردن می‌کنه.
  const fullText = visible.map((w) => w.en).join(". ") + (visible.length ? "." : "");
  const wordOffsets = useMemo(() => {
    let offset = 0;
    return visible.map((w, idx) => {
      const start = offset;
      offset += w.en.length;
      const end = offset;
      offset += idx < visible.length - 1 ? 2 : 1; // "." یا ". " بینِ کلمه‌ها
      return { id: w.id, start, end };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: "en" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);
  // فقط موقعِ خروج از این تب (unmount کاملِ کامپوننت) متن رو پاک کن — نه
  // به‌ازای هر تغییرِ فیلتر/جستجو، وگرنه دکمه‌ی 🔊 رو پلیر لحظه‌ای چشمک
  // می‌زد (پاک می‌شد و دوباره ست می‌شد) با هر تایپ تو جستجو.
  useEffect(() => {
    return () => {
      if (onFullTextChange) onFullTextChange({ text: "", code: "" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لغتی که همین الان، در حینِ پخشِ «کل لیست» از روی پلیر، داره خونده
  // می‌شه — هم برای هایلایتِ بصریِ زنده‌ی کارتِ لغت (لغت + همه‌ی ترجمه‌هاش)
  // و هم برای اسکرولِ خودکار استفاده می‌شه.
  const [activeWordId, setActiveWordId] = useState(null);
  useEffect(() => {
    const myKey = `en-US::${fullText}`;
    const update = (state) => {
      if (!fullText || state.key !== myKey || state.status === "idle") {
        setActiveWordId(null);
        return;
      }
      const offset = speechController.getCharOffset();
      let found = wordOffsets[0] || null;
      for (const w of wordOffsets) {
        if (offset >= w.start) found = w;
        else break;
      }
      setActiveWordId((prev) => {
        const next = found ? found.id : null;
        return prev === next ? prev : next;
      });
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [fullText, wordOffsets]);

  const listNodeMapRef = useRef(new Map());
  useEffect(() => {
    if (!autoScrollActive || activeWordId == null) return;
    const node = listNodeMapRef.current.get(String(activeWordId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, activeWordId]);
  const registerListRef = (id) => (node) => {
    const key = String(id);
    if (node) listNodeMapRef.current.set(key, node);
    else listNodeMapRef.current.delete(key);
  };

  // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» → دقیقاً همون ردیف اینجا (نه فقط
  // همون تب) هایلایت و بهش اسکرول می‌شه. jumpTarget ={ id, token } از
  // PhrasebookMain میاد؛ token فقط برای این‌که هر لانگ‌پرسِ تازه (حتی روی
  // همون لغتِ قبلی) یه افکتِ جدید بشه. اول باید مطمئن بشیم لغتِ موردنظر
  // توی بازه‌ی فعلی (rangeFrom..rangeTo) قرار داره، وگرنه هنوز رندر نشده —
  // پس در صورتِ نیاز، بازه رو طوری تنظیم می‌کنیم که خودِ همون لغت را دربر بگیره.
  const [justJumpedId, setJustJumpedId] = useState(null);
  useEffect(() => {
    if (!jumpTarget || jumpTarget.id == null) return;
    const idx = filtered.findIndex((w) => w.id === jumpTarget.id);
    if (idx === -1) return; // با این فیلتر/جستجو، این لغت دیده نمی‌شه
    // نکته‌ی مهم: onJumpToOrigin معمولاً هم‌زمان با تنظیمِ jumpTarget، جستجو
    // و فیلترِ سطح رو هم پاک می‌کنه (setQuery("")/setLevelFilter("all")) تا
    // چیزی لغتِ موردنظر رو قایم نکنه. اون تغییر، افکتِ بالاتر (ریستِ بازه
    // رویِ تغییرِ q/levelFilter) رو هم هم‌زمان (توی همون batch) فعال می‌کنه.
    // با functional updater روی رنج، همیشه رویِ آخرین مقدارِ صف‌شده حساب
    // می‌کنیم، پس این ریستِ هم‌زمان دیگه نمی‌تونه رویِ گسترشِ لازم رو بپوشونه.
    setRangeFromInput((prev) => {
      const prevNum = parseInt(prev, 10);
      const effPrev = Number.isNaN(prevNum) ? 1 : prevNum;
      return idx + 1 < effPrev ? "1" : prev;
    });
    setRangeToInput((prev) => {
      const prevNum = parseInt(prev, 10);
      const effPrev = Number.isNaN(prevNum) ? Math.min(filtered.length, effectivePageSize) || filtered.length || 1 : prevNum;
      return String(Math.max(effPrev, Math.min(idx + 1, filtered.length)));
    });
    setJustJumpedId(jumpTarget.id);
    const t = setTimeout(() => setJustJumpedId(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget?.token]);
  useEffect(() => {
    if (justJumpedId == null) return;
    const node = listNodeMapRef.current.get(String(justJumpedId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [justJumpedId, rangeFromInput, rangeToInput]);

  // -------------------------------------------------------------------------
  // «خواندنِ پیوسته‌ی ترجمه‌ها» — طبق درخواست، همون سیستمِ بالا (fullText +
  // wordOffsets + activeWordId + اسکرولِ خودکار) برایِ متنِ اصلیِ انگلیسی،
  // این‌جا هم برایِ هر زبانِ ترجمه‌ی هدف (effectiveDisplayLangs) جدا جدا
  // پیاده می‌شه. چون ترجمه‌ی هر لغت lazy و async لود می‌شه
  // (WordTargetTranslation)، نمی‌شه از قبل fullText رو ساخت؛ به‌جاش هر
  // لغت، به محضِ آماده‌شدنِ ترجمه‌ش، از طریق onResolveTranslation به بالا
  // خبر می‌ده و اینجا، از رویِ مقادیرِ جمع‌شده، fullText/آفستِ هر زبان
  // ساخته می‌شه.
  // (wordTranslationValues/reportWordTranslation حالا بالاترِ همین تابع،
  // کنارِ فیلترِ جستجو، تعریف شدن — تا جستجو هم بتونه ازشون استفاده کنه.)

  const wordTranslationInfo = useMemo(() => {
    const info = {};
    effectiveDisplayLangs.forEach((l) => {
      const langMap = wordTranslationValues[l.code] || {};
      // نکته‌ی مهم (عیناً همون دلیلی که fullText/wordOffsetsِ لیستِ انگلیسیِ
      // بالا بینِ لغت‌ها نقطه می‌ذاره): لغاتِ ترجمه‌شده هم مثلِ خودِ لغتِ
      // انگلیسی هیچ علامتِ‌نگارشیِ پایانی ندارن. اگه اینجا فقط با یه فاصله
      // به‌هم بچسبونیمشون، speechController کلِ رشته رو یه «جمله»ی
      // غیرعادی‌بلند می‌بینه و مجبور می‌شه هر ۴۰ لغت رو یه‌جا (یه نفس) بخونه
      // (MAX_WORDS_PER_CHUNK) — هم خیلی سریع/نامفهوم می‌شه، هم هایلایت/اسکرول
      // فقط هر ۴۰ لغت یه‌بار به‌روز می‌شه (تو لیست‌های کوتاه‌تر از ۴۰ اصلاً
      // انگار کاری نمی‌کنه). با گذاشتنِ «.» بینِ لغت‌ها، هر ترجمه دقیقاً مثلِ
      // خودِ لغتِ انگلیسی یه جمله‌ی مستقل حساب می‌شه.
      const entries = visible.filter((w) => langMap[w.id]);
      let offset = 0;
      const parts = [];
      const offsets = [];
      entries.forEach((w, idx) => {
        const val = langMap[w.id];
        const start = offset;
        parts.push(val);
        offset += val.length;
        offsets.push({ id: w.id, start, end: offset });
        offset += idx < entries.length - 1 ? 2 : 1; // "." یا ". " بینِ لغت‌ها
      });
      info[l.code] = { fullText: parts.join(". ") + (entries.length ? "." : ""), offsets };
    });
    return info;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDisplayLangs, wordTranslationValues, visible]);

  // لغت/زبانی که همین الان، در حینِ پخشِ پیوسته‌ی ترجمه‌های یک زبان، داره
  // خونده می‌شه — {code, id} | null.
  const [activeWordTranslation, setActiveWordTranslation] = useState(null);
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveWordTranslation(null);
        return;
      }
      for (const l of effectiveDisplayLangs) {
        const info = wordTranslationInfo[l.code];
        if (!info || !info.fullText) continue;
        const myKey = `${TTS_LOCALE[l.code] || "en-US"}::${info.fullText}`;
        if (state.key !== myKey) continue;
        const offset = speechController.getCharOffset();
        let found = info.offsets[0] || null;
        for (const w of info.offsets) {
          if (offset >= w.start) found = w;
          else break;
        }
        setActiveWordTranslation((prev) => {
          if (prev && prev.code === l.code && found && prev.id === found.id) return prev;
          return found ? { code: l.code, id: found.id } : null;
        });
        return;
      }
      setActiveWordTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [effectiveDisplayLangs, wordTranslationInfo]);

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? tr("noWordsForSearch", uiLang) : emptyText || tr("noWordsToShow", uiLang)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* کنترلِ بازه‌ی نمایش («از # تا #») + وضعیتِ خوانده‌شده — چون تعدادِ
          لغات این لیست زیاده، به‌جای اسکرولِ بی‌نهایت، کاربر خودش مشخص
          می‌کنه کدوم بازه رو ببینه. همون ظاهرِ progress-card طرحِ مرجع:
          کارتِ سفیدِ گرد با سایه، به‌جای جعبه‌ی تختِ paperDark قبلی. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>
        <RangeSliderFilter
          min={1}
          max={filtered.length}
          from={clampedFrom}
          to={clampedTo}
          onFromChange={(val) => setRangeFromInput(val)}
          onToChange={(val) => setRangeToInput(val)}
          readCount={readCountInRange}
          totalInRange={visible.length}
          readCountTotal={readCountTotal}
          label={uiLang === "en" ? "Dictionary" : "دیکشنری"}
          uiLang={uiLang}
          colors={colors}
        />
        <div className="flex items-center gap-2 flex-wrap" style={{ direction: uiLang === "en" ? "ltr" : "rtl" }}>
          <button
            type="button"
            onClick={() => markRangeRead(true)}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, border: "1px solid #CFE6DF", background: "#EAF4F1", color: colors.teal, cursor: "pointer" }}
          >
            {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
          </button>
          <button
            type="button"
            onClick={() => markRangeRead(false)}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, border: `1px solid ${colors.cardBorder}`, background: colors.paper, color: colors.teal, cursor: "pointer" }}
          >
            {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
          </button>
        </div>
      </div>
      {visible.map((w) => {
        const isRead = readIds.has(w.id);
        return (
        <div
          key={w.id}
          ref={(el) => {
            registerRef(w.id)(el);
            registerListRef(w.id)(el);
          }}
          className="flex items-center justify-between p-3"
          style={{
            position: "relative",
            paddingBottom: w.isUserSaved ? 30 : undefined,
            borderRadius: 14,
            background: isRead ? READ_DONE_GRADIENT : "white",
            border: `1px solid ${highlightBg(highlightColor, justJumpedId === w.id, isRead ? READ_DONE_BORDER : colors.cardBorder)}`,
            boxShadow:
              justJumpedId === w.id && highlightColor !== "none"
                ? `0 0 0 2px ${highlightColor || READ_MARKER_COLOR}`
                : isRead
                ? READ_DONE_SHADOW
                : "none",
            transition: "border-color 0.4s ease, box-shadow 0.4s ease, background-color 0.3s ease",
          }}
        >
          <button
            onClick={() => toggleWordRead(w.id)}
            aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
            style={{
              marginLeft: 4,
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: isRead ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
              background: isRead ? READ_DONE_CHECK_GRADIENT : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRead && <Check size={13} color="white" strokeWidth={3} />}
          </button>
          <button onClick={() => toggleWordFavorite(w.id)} aria-label={tr("addToFavoritesAria", uiLang)} style={{ marginLeft: 4, flexShrink: 0 }}>
            <Star size={20} color={STAR_FAVORITE_COLOR} fill={wordFavorites.has(w.id) ? STAR_FAVORITE_COLOR : "none"} />
          </button>
          <div className="flex-1">
            {/* لغت + نشان‌های سطح/نوع توی یه زیرجعبه‌ی flex-wrap جدا هستن، و
                خودِ بلندگو بیرون از اون زیرجعبه، به‌عنوانِ یه خواهر/برادرِ
                ثابت — این‌جوری هر چقدرم لغت بلند باشه و نشان‌ها به خط بعد
                بیفتن، بلندگو همیشه دقیقاً روی یه ستونِ ثابت (لبه‌ی راستِ
                ردیف) می‌مونه، هم‌راستا با بلندگوهای ردیف‌های ترجمه‌ی زیرش. */}
            <div className="flex items-start gap-2" style={{ direction: "ltr" }}>
              <div className="flex items-center flex-wrap gap-2" style={{ flex: 1 }}>
                {/* هایلایتِ «همین الان داره خونده می‌شه» — دقیقاً همون مارکرِ
                    زردِ تنگِ دورِ خودِ متن که تو داستان‌ساز و مکالمات روزمره
                    هست، نه یه باکسِ تمام‌عرض دورِ کل ردیف. */}
                <span
                  style={{
                    backgroundColor: highlightBg(highlightColor, activeWordId === w.id),
                    borderRadius: 5,
                    padding: activeWordId === w.id ? "2px 4px" : "2px 0",
                    WebkitBoxDecorationBreak: "clone",
                    boxDecorationBreak: "clone",
                    transition: "background-color 0.55s ease-in-out",
                  }}
                >
                  <ClickableSentence
                    text={w.en}
                    langCode="en"
                    nativeLang={nativeLang}
                    aiSettings={aiSettings}
                    color={mainTextColor}
                    fontFamily={fontLatin}
                    fontWeight={800}
                    fontSize={19}
                    originExtra={{ id: w.id }}
                    // همون مکانیزمِ «نقطه‌ی ادامه»ای که داستان‌ساز داره
                    // (storyBaseOffset/onSpeakOffset → rememberMainTextResumeOffset)
                    // اینجا هم وصل می‌شه: با زدنِ 🔊ِ همین لغت از پاپ‌آپ، نقطه‌ش
                    // به‌خاطر سپرده می‌شه تا دفعه‌ی بعد که دکمه‌ی پخشِ کلِ لیست
                    // (روی پلیرِ پایین) زده بشه، از همین‌جا ادامه پیدا کنه — قبلاً
                    // این وایرینگ فقط توی داستان‌ساز بود، نه لیستِ لغات.
                    storyBaseOffset={wordOffsets.find((o) => o.id === w.id)?.start ?? 0}
                    onSpeakOffset={(localEnd) =>
                      rememberMainTextResumeOffset(`${TTS_LOCALE.en || "en-US"}::${fullText}`, (wordOffsets.find((o) => o.id === w.id)?.start ?? 0) + (localEnd || 0))
                    }
                  />
                </span>
                {w.isUserSaved ? (
                  <PersonalLevelPicker word={w.en} level={w.level} uiLang={uiLang} />
                ) : (
                  w.level && <LevelBadge level={w.level} />
                )}
                {w.isUserSaved && (
                  <span
                    style={{
                      fontFamily: uiLang === "en" ? fontLatin : fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.rose,
                      border: `1px solid ${colors.rose}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {tr("personalBadge", uiLang)}
                  </span>
                )}
                {w.pos && (
                  <span
                    style={{
                      fontFamily: uiLang === "en" ? fontLatin : fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.teal,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {posLabel(w.pos, uiLang)}
                  </span>
                )}
              </div>
              <SpeakButton
                text={w.en}
                code="en"
                color={colors.teal}
                edge="end"
                fullText={fullText}
                startOffset={wordOffsets.find((o) => o.id === w.id)?.start}
                neuralId={`vocabuse:${w.id}:en`}
                neuralLabel="لغت"
              />
            </div>
            {/* ترجمه‌ی این لغت به همه‌ی زبان‌های مقصدِ انتخاب‌شده — نه فقط
                فارسی. رنگ متن‌ها مشکی و پررنگه (نه رنگ‌های کم‌کنتراست) تا
                خوندنش چشم رو خسته نکنه. */}
            <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
              {effectiveDisplayLangs.map((l) => {
                const info = wordTranslationInfo[l.code];
                const isTransActive = !!(activeWordTranslation && activeWordTranslation.code === l.code && activeWordTranslation.id === w.id);
                return (
                  <WordTargetTranslation
                    key={l.code}
                    word={w.en}
                    wordId={w.id}
                    pos={w.pos}
                    level={w.level}
                    langCode={l.code}
                    abbr={l.abbr}
                    knownText={l.code === "fa" ? w.fa : ""}
                    nativeLang={nativeLang}
                    nativeLabel={nativeLabel}
                    aiSettings={aiSettings}
                    ClickableSentence={ClickableSentence}
                    fullText={info ? info.fullText : ""}
                    lineOffsets={info ? info.offsets : []}
                    isActiveLine={isTransActive}
                    autoScrollActive={autoScrollActive}
                    highlightColor={highlightColor}
                    onResolved={reportWordTranslation}
                  />
                );
              })}
            </div>
            {/* مثال/کالوکیشنِ خودِ دیتا (فقط لغاتی که این فیلدها رو دارن،
                مثلِ تبِ «Vocabulary in Use» — بقیه‌ی لیست‌ها این فیلد رو
                ندارن، پس این بخش خودکار مخفی می‌مونه). این جدا از
                WordExamples پایینه که مثالِ زنده با AI می‌سازه؛ اینجا
                همون مثال/کالوکیشنِ ثابتِ نویسنده‌ی کتابه — با
                direction:"ltr"ِ صریح (چپ‌به‌راستِ درست، نه راست‌چین‌شده به‌خاطرِ
                ریشه‌یِ rtlِ اپ)، بلندگویِ خودش (لبه‌ی راست، هم‌راستا با بقیه‌ی
                ردیف‌ها)، و ترجمه‌ی زنده‌ی جمله‌ی مثال به هر زبانِ مقصدی که
                کاربر بالای صفحه انتخاب کرده. */}
            {(w.collocation || w.example) && (
              <VocabBookExample
                collocation={w.collocation}
                example={w.example}
                targetLangs={effectiveDisplayLangs}
                aiSettings={aiSettings}
                nativeLang={nativeLang}
                ClickableSentence={ClickableSentence}
                highlightColor={highlightColor}
                autoScrollActive={autoScrollActive}
              />
            )}
            <WordExamples word={w.en} langCode="en" meaningNative={w.fa} nativeLang={nativeLang} targetLangs={effectiveDisplayLangs} aiSettings={aiSettings} />
          </div>
          {/* ✕ فقط برای لغات/عبارات شخصی: از تبِ «لغات» مخفی می‌شه ولی از
              «لغات ذخیره‌شده» (کنارِ داستان‌ساز) پاک نمی‌شه. */}
          {w.isUserSaved && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hideFromWordsTab(w.en);
              }}
              aria-label={uiLang === "en" ? "Remove from My dictionary" : "حذف از دیکشنری من"}
              title={uiLang === "en" ? "Remove from My dictionary (stays in Saved words)" : "حذف از دیکشنری من (در لغات ذخیره‌شده می‌مونه)"}
              style={{
                position: "absolute",
                right: 8,
                bottom: 6,
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: `1px solid ${colors.cardBorder}`,
                background: "white",
                color: colors.inkSoft,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        );
      })}
      {/* سنتینلِ نامرئیِ اسکرولِ بی‌نهایت — فقط وقتی چیزی برای لود شدن مونده
          رندر می‌شه؛ ورودش به دیدِ کاربر (بالاتر، با IntersectionObserver)
          دسته‌ی بعدی رو خودکار اضافه می‌کنه. */}
      {clampedTo < filtered.length && <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} />}
    </div>
  );
});
