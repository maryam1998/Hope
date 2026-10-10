// افزودن انتخاب به داستان (سراسری)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { RotateCcw, X, Volume2, Loader2, Bookmark, Pause, Type } from "lucide-react";
import { bridge } from "../runtime/bridge.js";
import { TTS_LOCALE, TTS_NEED_MODEL_MSG, ttsFailMsg } from "../tts/ttsConfig.js";
import { dirFor } from "../constants/languages.js";
import { colors, fontFa } from "../ui/theme.js";
import { translateFree, translateFreeNetwork } from "../translate/translateService.js";
import { rememberMainTextResumeOffset, speechController } from "../speech/speechController.js";
import { STORY_WORD_PICKED_EVENT, isWordSaved, toggleSavedStoryWord } from "../words/savedStoryWords.js";
import { lookupWordGrammarDetail, saveGrammarNote, updateGrammarNoteMarkdown } from "../grammar/grammarNotes.js";
import { SpeakButton } from "./player/SpeakButton.jsx";

// ---------------------------------------------------------------------------
// یک مدیرِ سراسریِ «انتخابِ متن → افزودن به داستان» برای کل نرم‌افزار.
// جای اینکه هر تکه متن (ClickableSentence، توضیح گرامری، معنیِ دیکشنری،
// هرجای دیگه) خودش یه پاپ‌آپ جدا برای انتخاب متن داشته باشه، این یکی —
// فقط یه بار توی ریشه‌ی برنامه سوار می‌شه — کل document رو زیر نظر داره:
// هر جا کاربر یه محدوده از متن رو (درگ با ماوس یا لانگ‌پرس/درگ روی موبایل)
// انتخاب کنه، بلافاصله بعد از گرفتنِ متنِ انتخاب‌شده، خودِ انتخابِ مرورگر
// رو پاک می‌کنیم (removeAllRanges) تا نوار ابزار بومیِ گوشی/مرورگر
// (Copy / Share / Select all / Web search) اصلاً فرصت نکنه ظاهر بشه یا
// بمونه — و به‌جاش دکمه‌ی شناور خودمون «افزودن به داستان» رو نشون می‌دیم.
// زبانِ متنِ انتخاب‌شده رو از نزدیک‌ترین والدی که data-lang-code داره
// می‌خونیم (هر جایی از اپ که زبانش معلومه — مثل ClickableSentence — این
// اتریبیوت رو داره)؛ اگه پیدا نشد، زبان مادری/پیش‌فرض کاربر رو استفاده
// می‌کنیم تا این قابلیت هیچ‌جای برنامه بی‌اثر نمونه.
// نامِ هایلایتِ CSS Custom Highlight API — با این، محدوده‌ی انتخاب‌شده رو
// بدون دست‌کاریِ DOM (بدون wrap کردن با <span>) رنگ می‌کنیم؛ چون محدوده
// معمولاً از وسطِ چند تا کلمه/span مختلف رد می‌شه و روش‌های مبتنی بر
// surroundContents برای همچین محدوده‌ای کار نمی‌کنن. مرورگرهایی که این API
// رو ندارن (خیلی قدیمی) فقط این جلوه‌ی بصری رو نمی‌بینن؛ بقیه‌ی قابلیت
// (پاپ‌آپ ذخیره/گرامر) دست‌نخورده کار می‌کنه.
const STORY_SELECTION_HIGHLIGHT = "hope-story-sel";
export function GlobalAddToStorySelection({ fallbackLangCode = "fa", nativeLang, nativeLabel, aiSettings, isStoryUserAudioMode }) {
  const [popup, setPopup] = useState(null); // { top, left, text, langCode } | null
  // ترجمه‌ی خودِ محدوده‌ی انتخاب‌شده به زبان مبدأ/مادریِ کاربر (nativeLang) —
  // دقیقاً همون کاری که برای تک‌کلمه‌ها توی ClickableSentence با
  // lookupWordMeaning انجام می‌شه، اینجا هم برای کل محدوده (چند کلمه/جمله)
  // با translateFree انجام می‌شه. { status: "loading" | "done" | "error", text? }
  const [translation, setTranslation] = useState(null);
  const popupElRef = useRef(null);
  // زمانِ دقیقِ بازشدنِ پاپ‌آپ — برای نادیده‌گرفتنِ «کلیک‌های شبح» (ghost
  // click)ی که بعضی موبایل‌براوزرها چند صدم‌ثانیه بعد از همون لمسی که
  // انتخاب رو ساخته می‌فرستن. چون پاپ‌آپ دقیقاً همون‌جایی باز می‌شه که
  // انگشت لمس کرده بود، اگه این کلیکِ تأخیریِ اضافه درست روی یکی از
  // دکمه‌های «ذخیره» بیفته، بدونِ اینکه کاربر واقعاً لمسش کرده باشه فعال
  // می‌شه — دقیقاً همون باگیه که باعث می‌شد لغت خودبه‌خود «ذخیره در گرامر»
  // بشه و پاپ‌آپ هم دیگه با لمسِ بیرون بسته نشه.
  const openedAtRef = useRef(0);
  // طبق درخواست: دیگه با تمومِ کشیدنِ محدوده (mouseup/touchend) بلافاصله
  // پاپ‌آپ باز نمی‌شه. اول محدوده «آماده» می‌مونه (فقط هایلایتِ طلایی روش
  // می‌مونه)، و پاپ‌آپ فقط وقتی باز می‌شه که کاربر روی همون محدوده انگشتش
  // رو HOLD_TO_OPEN_MS میلی‌ثانیه بدونِ جابه‌جاییِ زیاد نگه داره — یعنی یه
  // لمسِ طولانی/چندثانیه‌ای جدا، بعد از خودِ انتخاب. عددِ پایین رو می‌شه هر
  // وقت خواستی همین‌جا تغییر داد.
  const HOLD_TO_OPEN_MS = 160;
  const pendingRef = useRef(null); // { top, left, text, langCode, storyResumeOffset } | null — محدوده‌ی آماده، منتظرِ لمسِ طولانی
  const holdRef = useRef({ timer: null, startX: 0, startY: 0 });
  const [pendingActive, setPendingActive] = useState(false); // فقط برای رندرِ هایلایتِ CSS synced با وجودِ pendingRef
  const clearHold = () => {
    if (holdRef.current.timer) {
      clearTimeout(holdRef.current.timer);
      holdRef.current.timer = null;
    }
  };
  const [measuredHeight, setMeasuredHeight] = useState(null);
  // فقط برای این‌که دکمه‌ی 🔊ِ پاپ‌آپ بین آیکونِ پخش/توقف سوییچ کنه — دقیقاً
  // همون الگویی که SpeakButton خودش استفاده می‌کنه.
  const [speakState, setSpeakState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setSpeakState), []);
  // پیگیریِ «برگردوندنِ خودکارِ صوتِ آپلودی بعد از تمومِ خواندنِ یه لغتِ تکی
  // با TTS» — وقتی کاربر رو حالتِ «صوتِ من» روی 🔊ِ پاپ‌آپ می‌زنه. یه رفرنس
  // نگه می‌داریم تا هم بشه اگه کاربر پشتِ‌سرِهم چند لغت رو زد، تلاشِ قبلی رو
  // لغو کرد (وگرنه دو تا resume برنامه‌ریزی‌شده روی هم می‌افتادن)، هم موقعِ
  // unmount شدنِ کامپوننت تمیز پاک بشه.
  const userAudioResumeRef = useRef(null); // { unsub, timer } | null
  function clearPendingUserAudioResume() {
    if (userAudioResumeRef.current) {
      userAudioResumeRef.current.unsub?.();
      if (userAudioResumeRef.current.timer) clearTimeout(userAudioResumeRef.current.timer);
      userAudioResumeRef.current = null;
    }
  }
  useEffect(() => clearPendingUserAudioResume, []);
  // بعد از اینکه TTS تلفظِ همون یه لغت رو تموم کرد (state.status می‌ره
  // "idle" برای همون کلید)، دو ثانیه صبر می‌کنیم و بعد صوتِ آپلودیِ کاربر
  // رو دوباره play می‌کنیم — دقیقاً همون تاخیرِ کوتاهی که خودِ کاربر
  // خواسته، تا صدای TTS و صوتِ آپلودی روی هم نیفتن.
  function scheduleUserAudioResumeAfterWord(text, langCode) {
    clearPendingUserAudioResume();
    const myKey = `${TTS_LOCALE[langCode] || "en-US"}::${text}`;
    const unsub = speechController.subscribe((state) => {
      if (state.key !== myKey || state.status !== "idle") return;
      const entry = userAudioResumeRef.current;
      if (entry) entry.unsub?.();
      const timer = setTimeout(() => {
        userAudioResumeRef.current = null;
        bridge.activeUserAudioPlay?.();
      }, 2000);
      userAudioResumeRef.current = { unsub: null, timer };
    });
    userAudioResumeRef.current = { unsub, timer: null };
  }
  // پیغامِ خطای پخشِ صدا برای دکمه‌ی 🔊ِ همین پاپ‌آپ — به‌جای alert، زیرِ
  // متنِ انتخاب‌شده‌ی داخلِ خودِ پاپ‌آپ نشون داده می‌شه.
  const [popupSpeakMsg, setPopupSpeakMsg] = useState(null);
  useEffect(() => {
    if (!popupSpeakMsg) return;
    const t = setTimeout(() => setPopupSpeakMsg(null), 5000);
    return () => clearTimeout(t);
  }, [popupSpeakMsg]);

  const clearSelectionHighlight = () => {
    try {
      if (typeof CSS !== "undefined" && CSS.highlights) {
        CSS.highlights.delete(STORY_SELECTION_HIGHLIGHT);
      }
    } catch {}
  };

  // لغوِ حالتِ «آماده» (محدوده‌ی انتخاب‌شده که هنوز پاپ‌آپش باز نشده) — با
  // زدنِ جایی بیرون، اسکرول، یا شروعِ یه انتخابِ کاملاً تازه.
  const clearPending = () => {
    pendingRef.current = null;
    clearHold();
    setPendingActive(false);
    clearSelectionHighlight();
  };

  const closePopup = () => {
    setPopup(null);
    setTranslation(null);
    clearSelectionHighlight();
  };

  // کلیک/تاچِ شبح: هر رویدادی که کمتر از ۴۰۰ میلی‌ثانیه بعد از بازشدنِ
  // همین پاپ‌آپ برسه رو نادیده می‌گیریم. یه لمسِ واقعی و عمدی روی دکمه
  // همیشه بعد از این فاصله می‌رسه (کاربر باید اول ببینه پاپ‌آپ باز شده،
  // بعد جدا روش بزنه).
  const isGhostEvent = () => Date.now() - openedAtRef.current < 250;

  // ارتفاعِ واقعیِ پاپ‌آپ رو (به‌جای حدس ثابتِ ۸۸/۱۲۸ پیکسل قبلی) اندازه
  // می‌گیریم تا همیشه درست بالای محدوده‌ی انتخاب‌شده بشینه، نه رویش —
  // هم‌پوشانی با نقطه‌ی لمس دقیقاً همون چیزیه که احتمالِ گرفتارشدنِ یه
  // کلیکِ شبح توسطِ یکی از دکمه‌ها رو زیاد می‌کرد.
  useLayoutEffect(() => {
    if (!popup || !popupElRef.current) return;
    setMeasuredHeight(popupElRef.current.offsetHeight);
  }, [popup, translation]);

  // هر بار محدوده‌ی تازه‌ای انتخاب می‌شه (popup عوض می‌شه)، ترجمه‌ی همون
  // محدوده رو به زبان مبدأ/مادریِ کاربر می‌گیریم — دقیقاً همون زنجیره‌ی
  // fallback (کش → گوگل/مای‌مموری/لینگوا/لیبره → در آخر بک‌اند AI) که
  // translateFree برای بقیه‌ی جاهای برنامه هم استفاده می‌کنه. اگه زبانِ
  // مبدأِ متنِ انتخاب‌شده همون زبانِ مادریِ کاربر باشه، ترجمه بی‌معنیه و
  // اصلاً درخواستی فرستاده نمی‌شه.
  useEffect(() => {
    if (!popup) return;
    const targetLang = nativeLang || fallbackLangCode;
    if (targetLang === popup.langCode) {
      setTranslation(null);
      return;
    }
    let cancelled = false;
    setTranslation({ status: "loading" });
    translateFree(popup.text, targetLang, popup.langCode, aiSettings)
      .then((result) => {
        if (cancelled) return;
        const clean = (result || "").trim();
        if (clean && clean !== popup.text.trim()) {
          setTranslation({ status: "done", text: clean });
        } else {
          setTranslation({ status: "error" });
        }
      })
      .catch(() => {
        if (!cancelled) setTranslation({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [popup, nativeLang, fallbackLangCode, aiSettings]);

  // دکمه‌ی «تلاش دوباره»ی خودِ ترجمه (جدا از دکمه‌های ذخیره/گرامر پایین) —
  // برای وقتی سرویس‌های ترجمه‌ی رایگان موقتاً جواب ندادن.
  // پارامترِ reportWrong (دکمه‌ی جدیدِ 🔄 کنارِ خودِ ترجمه، حتی وقتی status
  // از قبل "done" بوده): برخلافِ حالتِ عادی که اول کشِ IndexedDB رو چک
  // می‌کنه (و چون همون ترجمه‌ی «غلط» از قبل کش شده، دوباره همونو برمی‌گردوند
  // و دکمه عملاً هیچ‌کاری نمی‌کرد)، این حالت مستقیم می‌ره سراغِ شبکه با
  // forceVerify=true — یعنی حتی اگه هیچ‌کدوم از تست‌های heuristic مشکوکش
  // نکرده باشن هم، نتیجه‌ی خامِ سرویسِ رایگان قبل از نمایش با AI بازبینی/
  // اصلاح می‌شه (دقیقاً همون مسیری که برای اسلنگ/اصطلاح‌ها همیشه فعاله؛
  // خط ۱۷۵۹۷). نتیجه‌ی تازه همون‌جا (داخلِ translateFreeNetwork) جای کشِ
  // قدیمی رو توی IndexedDB می‌گیره، پس دفعه‌ی بعد هم دیگه همین ترجمه‌ی
  // اصلاح‌شده برمی‌گرده.
  function retryTranslation(reportWrong) {
    if (!popup) return;
    const targetLang = nativeLang || fallbackLangCode;
    setTranslation({ status: "loading" });
    const task = reportWrong
      ? translateFreeNetwork(popup.text, targetLang, popup.langCode, aiSettings, true)
      : translateFree(popup.text, targetLang, popup.langCode, aiSettings);
    task
      .then((result) => {
        const clean = (result || "").trim();
        setTranslation(clean && clean !== popup.text.trim() ? { status: "done", text: clean } : { status: "error" });
      })
      .catch(() => setTranslation({ status: "error" }));
  }
  // این دوتا دقیقاً معادل دکمه‌های «ذخیره برای داستان بعدی» و «افزودن به
  // یادگیری گرامر» توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence هستن — اینجا هم
  // همون رفتار رو برای یک محدوده‌ی انتخاب‌شده (چند کلمه یا یک جمله‌ی کامل)
  // فعال می‌کنیم، بدون این‌که هیچ درخواست شبکه‌ای فوری لازم باشه (معنی/
  // ترجمه بعداً و در پس‌زمینه کامل می‌شه، دقیقاً مثل بقیه‌ی جاهای برنامه).
  const [saved, setSaved] = useState(false);
  const [grammarSaved, setGrammarSaved] = useState(false);
  // دقیقاً معادل leitnerAdded توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence —
  // فیدبکِ خودِ دکمه‌ی «افزودن به جعبه‌ی لایتنر» برای یک محدوده‌ی انتخاب‌شده.
  const [leitnerAdded, setLeitnerAdded] = useState(false);
  useEffect(() => {
    const resolveLangCode = (node) => {
      const el = node && node.nodeType === 1 ? node : node?.parentElement;
      const host = el && el.closest ? el.closest("[data-lang-code]") : null;
      return (host && host.getAttribute("data-lang-code")) || fallbackLangCode;
    };

    const handleUp = (e) => {
      // اگه این touchend/mouseup از خودِ پاپ‌آپِ بازشده (یا لایه‌ی نامرئیِ
      // لمسِ طولانیِ pending) اومده — یعنی کاربر داره روی یکی از دکمه‌های
      // داخلِ پاپ‌آپ (🔊 / ذخیره / گرامر) می‌زنه — این‌جا کاملاً بی‌خیالش
      // می‌شیم. این‌جا دقیقاً همون باگی بود که باعث می‌شد با زدنِ دکمه‌های
      // پاپ‌آپ، یا خودِ پاپ‌آپ ناخواسته بسته بشه، یا (چون این event تا
      // اینجای تابع می‌رسید و window.getSelection() چیزی برمی‌گردوند) یه
      // انتخابِ کاملاً جدید و اشتباه (معمولاً یه تک‌کلمه‌ی زیرِ انگشت) به‌جای
      // تعاملِ واقعیِ کاربر با دکمه ثبت بشه.
      if (e && e.target) {
        if (popupElRef.current && popupElRef.current.contains(e.target)) return;
        if (e.target.closest && e.target.closest("[data-hope-selection-overlay]")) return;
      }
      const sel = window.getSelection && window.getSelection();
      const selectedText = sel ? sel.toString().trim() : "";
      if (!selectedText || !sel.rangeCount) return;
      // فیلدهای ورودی/قابل‌ویرایش (مثلاً جستجو، ورودی چت) از این قابلیت
      // مستثنی‌ان — همون‌جا انتخابِ عادیِ متن (برای کپی/پیست خودِ کاربر تو
      // فرم‌ها) باید دست‌نخورده بمونه.
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      // اگه پاپ‌آپِ یه محدوده‌ی قبلی هنوز بازه و کاربر محدوده‌ی کاملاً تازه‌ای
      // انتخاب کرده، اون پاپ‌آپِ قبلی رو ببند — محدوده‌ی جدید می‌ره تو حالتِ
      // «آماده» و باز هم منتظرِ لمسِ طولانیِ خودش می‌مونه. (setPopup(null)
      // حتی وقتی از قبل هم null بوده بی‌ضرره، پس شرط جداگانه لازم نیست —
      // همین‌جوری هم گیرِ کلوژرِ قدیمیِ متغیرِ popup نمی‌افتیم.)
      closePopup();
      let rect;
      // این متغیر رو بیرونِ try نگه می‌داریم (قبلاً داخلِ همون try/catچِ
      // اول با const تعریف شده بود و چون بلاک‌اسکوپ بود، توی try/catچِ بعدی
      // که storyResumeOffset رو حساب می‌کنه اصلاً در دسترس نبود — یه
      // ReferenceError که بی‌صدا قورت می‌رفت، و همین باعث می‌شد
      // storyResumeOffset همیشه null بمونه و «نقطه‌ی ادامه‌ی پخش» برای
      // محدوده‌های انتخابی هیچ‌وقت واقعاً ذخیره نشه).
      let range;
      try {
        range = sel.getRangeAt(0);
        rect = range.getBoundingClientRect();
      } catch {
        return;
      }
      if (!rect || (!rect.width && !rect.height)) return;
      const langCode = resolveLangCode(sel.anchorNode);
      // اگه این محدوده داخلِ متنِ اصلیِ داستانه (یعنی یه پدرِ نزدیک با
      // data-story-base-offset داره)، آفستِ پایانِ انتخاب رو نسبت به کلِ
      // fullStoryText حساب می‌کنیم — تا اگه بعداً دکمه‌ی پخشِ همین محدوده
      // زده بشه، «نقطه‌ی ادامه»ی پخشِ کل داستان هم به‌خاطر سپرده بشه.
      let storyResumeOffset = null;
      try {
        const endEl = range.endContainer && range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer?.parentElement;
        const storyEl = endEl && endEl.closest ? endEl.closest("[data-story-base-offset]") : null;
        if (storyEl) {
          const measureRange = document.createRange();
          measureRange.selectNodeContents(storyEl);
          measureRange.setEnd(range.endContainer, range.endOffset);
          const localEnd = measureRange.toString().length;
          const baseOffset = Number(storyEl.getAttribute("data-story-base-offset")) || 0;
          storyResumeOffset = baseOffset + localEnd;
        }
      } catch {}
      // قبل از پاک‌کردنِ انتخابِ بومی، خودِ محدوده رو با CSS Custom
      // Highlight API رنگ می‌کنیم — این هایلایت مستقل از Selection مرورگره،
      // پس پاک‌کردنِ Selection (چند خط پایین‌تر) روش اثری نداره و تا وقتی
      // خودمون clearSelectionHighlight رو صدا نزنیم (پاپ‌آپ بسته بشه) سرِ
      // جاش می‌مونه.
      try {
        if (typeof CSS !== "undefined" && CSS.highlights && typeof Highlight === "function") {
          const highlightRange = sel.getRangeAt(0).cloneRange();
          CSS.highlights.set(STORY_SELECTION_HIGHLIGHT, new Highlight(highlightRange));
        }
      } catch {}
      setSaved(isWordSaved(selectedText, langCode));
      setGrammarSaved(false);
      setLeitnerAdded(false);
      setMeasuredHeight(null);
      // دیگه پاپ‌آپ همین‌جا باز نمی‌شه — محدوده فقط «آماده» می‌مونه (با
      // هایلایتِ طلاییِ بالا) تا کاربر جدا روش یه لمسِ طولانی انجام بده
      // (نگاه کن به بخشِ hold-to-open پایین‌تر).
      // مستطیل‌های واقعیِ محدوده (ممکنه چندخطی باشه) رو هم نگه می‌داریم تا
      // یه لایه‌ی لمسِ اختصاصی دقیقاً روی خودِ متنِ هایلایت‌شده بذاریم (نگاه
      // کن به توضیحِ overlay پایین‌تر برای دلیلش).
      let rects = [];
      try {
        rects = Array.from(range.getClientRects()).map((r) => ({ top: r.top, left: r.left, width: r.width, height: r.height }));
      } catch {}
      pendingRef.current = { top: rect.top, left: rect.left + rect.width / 2, text: selectedText, langCode, storyResumeOffset, rects };
      setPendingActive(true);
      // بلافاصله انتخابِ بومیِ مرورگر رو پاک می‌کنیم — هایلایتِ سفارشیِ خودمون
      // (که همین الان ست شد) جایگزینش می‌شه، و نوار ابزارِ سیستم دیگه چیزی
      // برای نشون‌دادن نداره. هایلایتِ سفارشیِ بالا از این کار متأثر نمی‌شه.
      try {
        window.getSelection()?.removeAllRanges?.();
      } catch {}
    };

    const handleContextMenu = (e) => {
      // منوی راست‌کلیک/لانگ‌پرسِ پیش‌فرض روی متنِ خواندنیِ داستان لازم
      // نیست (چون به‌جاش دکمه‌ی «افزودن به داستان» خودمون داریم) — ولی
      // این preventDefault قبلاً بدونِ قیدوشرط رو کل document بود، یعنی
      // داخلِ خودِ کادرهای ورودی (input/textarea) هم منوی Paste/کپی/
      // انتخاب‌همه‌ی بومیِ گوشی رو غیرفعال می‌کرد — برای همین کپی‌پیست تو
      // کادرهایی مثل «افزودن لغت» کار نمی‌کرد. الان فقط وقتی جلوش رو
      // می‌گیریم که هدف یه کادرِ متنیِ قابل‌ویرایش نباشه.
      const el = e.target;
      const isEditable = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (isEditable) return;
      e.preventDefault();
    };

    const handleScroll = () => {
      closePopup();
      clearPending();
    };

    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchend", handleUp);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("scroll", handleScroll, true);
      clearSelectionHighlight();
    };
  }, [fallbackLangCode]);

  // «لمسِ طولانی برای بازکردن»: تا وقتی محدوده‌ای «آماده»ست (pendingRef) و
  // پاپ‌آپ هنوز باز نشده، اگه HOLD_TO_OPEN_MS میلی‌ثانیه بدونِ جابه‌جاییِ زیاد
  // (بیشتر از چند پیکسل) ادامه پیدا کنه، پاپ‌آپ همون‌جا باز می‌شه؛ وگرنه
  // (برداشتن زودهنگامِ انگشت، یا جابه‌جاییِ زیاد) لغو می‌شه و محدوده همچنان
  // «آماده» می‌مونه تا کاربر دوباره امتحان کنه.
  //
  // نکته‌ی مهم (دلیلِ اصلیِ اینکه قبلاً کار نمی‌کرد): این تایمر رو دیگه با
  // شنودِ mousedown/touchstart روی کل document شروع نمی‌کنیم. چون متنِ زیرِ
  // هایلایت هنوز از نظرِ مرورگر «متنِ قابل‌انتخاب»ه، یه لمسِ طولانیِ دوم
  // درست روی همون متن رو خودِ موبایل‌براوزر به‌عنوانِ ژستِ سیستمیِ
  // انتخاب/منوی Copy-Look‌Up قورت می‌ده — و همون‌جا یه touchcancel می‌فرسته
  // که تایمرِ ما رو لغو می‌کنه، پس هیچ‌وقت به HOLD_TO_OPEN_MS نمی‌رسه (این
  // اتفاق مستقل از تنظیمِ CSS مثلِ user-select هم می‌افته، چون OS جدا از
  // CSS همچنان روی خودِ رویدادهای لمسی دست می‌ذاره).
  //
  // به‌جاش، یه لایه‌ی نامرئیِ اختصاصی (نه متن، یه <div> ساده) دقیقاً روی
  // مستطیل‌های خودِ محدوده‌ی انتخاب‌شده (pendingRef.current.rects) می‌ذاریم؛
  // چون این لایه اصلاً متن نیست، هیچ مرورگری روش ژستِ انتخاب/کپی سیستمی
  // اجرا نمی‌کنه و لمسِ طولانی مستقیم و بدون مزاحمت به تایمرِ خودمون می‌رسه.
  // شروعِ تایمر (startHold) پس فقط از رویدادهای onTouchStart/onMouseDown
  // خودِ همون overlay صدا زده می‌شه (پایین‌تر، بخشِ رندر). حرکت و رهاکردنِ
  // انگشت/ماوس همچنان سراسری زیرِ نظره تا اگه بیرون از overlay هم ادامه پیدا
  // کرد (مثلاً کاربر انگشتش رو کشید) به‌درستی لغو بشه.
  const startHold = (x, y) => {
    if (!pendingRef.current || popupElRef.current) return;
    clearHold();
    holdRef.current.startX = x;
    holdRef.current.startY = y;
    holdRef.current.timer = setTimeout(() => {
      const p = pendingRef.current;
      if (!p) return;
      openedAtRef.current = Date.now();
      // همون لحظه‌ای که پاپ‌آپ باز می‌شه (نه فقط وقتی کاربر خودش 🔊ِ داخلش
      // رو می‌زنه) پخشِ پیوسته‌ی متنِ اصلی رو مکث می‌کنیم — تا حواسِ کاربر
      // که رفته سراغِ پاپ‌آپ، با خواندنِ همزمانِ پلیر قاطی نشه. بعد از سه
      // ثانیه (اگه خودِ کاربر تا اون‌موقع 🔊ِ پاپ‌آپ رو نزده باشه) خودکار از
      // همون نقطه ادامه پیدا می‌کنه.
      speechController.pauseForFocus();
      // همینِ مکثِ سه‌ثانیه‌ای برای صوتِ آپلودیِ کاربر هم لازمه (وقتی پلیرِ
      // پایین رو حالتِ «صوتِ من» گذاشته و همون فایل داره پخش می‌شه) — نگاه
      // کن به توضیحِ activeUserAudioFocusPause بالایِ فایل برای اینکه چرا
      // این‌جا از یه پُلِ سراسری استفاده می‌شه، نه پراپ مستقیم.
      bridge.activeUserAudioFocusPause?.();
      setPopup(p);
      pendingRef.current = null;
      setPendingActive(false);
    }, HOLD_TO_OPEN_MS);
  };
  const moveHold = (x, y) => {
    if (!holdRef.current.timer) return;
    const dx = Math.abs(x - holdRef.current.startX);
    const dy = Math.abs(y - holdRef.current.startY);
    if (dx > 12 || dy > 12) clearHold();
  };

  useEffect(() => {
    const onMouseMove = (e) => moveHold(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (t) moveHold(t.clientX, t.clientY);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", clearHold);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", clearHold);
    document.addEventListener("touchcancel", clearHold);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", clearHold);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", clearHold);
      document.removeEventListener("touchcancel", clearHold);
    };
  }, []);

  // لمس/کلیک بیرون از پاپ‌آپ (بدون این‌که متن جدیدی انتخاب بشه) هم باید
  // هم پاپ‌آپ و هم هایلایتِ همراهش رو ببنده — وگرنه هایلایت تا ابد (یا تا
  // اسکرول بعدی) روی صفحه می‌مونه. همین‌طور، اگه محدوده هنوز فقط «آماده»ست
  // (پاپ‌آپ باز نشده، منتظرِ لمسِ طولانیه) و کاربر یه‌جای دیگه رو لمس کنه
  // بدونِ این‌که محدوده‌ی تازه‌ای انتخاب کنه، همون «آماده» هم لغو می‌شه.
  useEffect(() => {
    if (!popup && !pendingActive) return;
    const onOutside = (e) => {
      if (popup) {
        if (popupElRef.current && popupElRef.current.contains(e.target)) return;
        closePopup();
        return;
      }
      // یه تیکِ رندر صبر می‌کنیم چون همین لمس ممکنه داره یه انتخابِ تازه رو
      // شروع می‌کنه — اگه واقعاً همچین چیزی در جریان نبود، «آماده» رو پاک کن.
      setTimeout(() => {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.toString().trim()) return;
        // اگه همین لمس، لحظه‌ای پیش (توی همین event، سینکرون) یه لمسِ
        // طولانیِ تازه رو شروع کرده (یعنی داره دقیقاً روی محدوده‌ی هایلایت‌شده
        // نگه داشته می‌شه)، این یعنی خودِ همون ژستِ «نگه‌داشتن برای باز کردن»ه،
        // نه یه لمسِ واقعاً «بیرون». نباید همین‌جا لغوش کنیم — بذاریم
        // useEffect ِ hold-to-open خودش تصمیم بگیره (یا پاپ‌آپ باز بشه، یا
        // با جابه‌جاییِ زیاد/برداشتنِ زودهنگامِ انگشت لغو بشه).
        // (holdRef.current.timer همین الان، پیش از رسیدنِ این setTimeout،
        // توسطِ handler سینکرونِ startHold ست شده — چون هر دو به یه
        // touchstart/mousedown واحد گوش می‌دن و اون یکی زودتر اجرا می‌شه.)
        if (holdRef.current.timer) return;
        clearPending();
      }, 0);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [popup, pendingActive]);

  // لایه‌ی نامرئیِ لمسِ طولانی — فقط وقتی محدوده «آماده»ست (هایلایتِ طلایی
  // روشه) ولی پاپ‌آپ هنوز باز نشده رندر می‌شه. دقیقاً روی مستطیل‌های خودِ
  // متنِ انتخاب‌شده می‌شینه (نه رویِ کلِ صفحه)، پس بیرون از محدوده هیچ اثری
  // نداره و لمس/اسکرول توی بقیه‌ی صفحه دست‌نخورده می‌مونه.
  if (!popup) {
    if (!pendingActive || !pendingRef.current || !pendingRef.current.rects || !pendingRef.current.rects.length) return null;
    return (
      <div data-hope-selection-overlay="1" style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none" }}>
        {pendingRef.current.rects.map((r, i) => (
          <div
            key={i}
            onMouseDown={(e) => {
              e.stopPropagation();
              startHold(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const t = e.touches[0];
              if (t) startHold(t.clientX, t.clientY);
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: "fixed",
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              pointerEvents: "auto",
              background: "transparent",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
              touchAction: "none",
            }}
          />
        ))}
      </div>
    );
  }

  // معنیِ فوریِ لغتیه که تازه ذخیره می‌شه — این‌جا لازم نیست، درست مثل بقیه‌ی
  // جاهای برنامه که ذخیره‌ی اولیه بدون معنی انجام می‌شه و بعداً (از پنل «لغات
  // ذخیره‌شده» یا زیرخط‌کشیِ ClickableSentence) کامل می‌شه.
  function saveSelectionToGrammar() {
    if (!popup) return;
    const basicMarkdown = `## 🧩 ${popup.text}\n\n**جمله:** ${popup.text}`;
    const entry = saveGrammarNote({ langCode: popup.langCode, word: popup.text, sentence: popup.text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({
      word: popup.text,
      sentence: popup.text,
      langCode: popup.langCode,
      nativeLang: nativeLang || fallbackLangCode,
      nativeLabel,
      aiSettings,
    })
      .then((md) => {
        if (md) updateGrammarNoteMarkdown(entry.id, md);
      })
      .catch(() => {
        // بک‌اند AI در دسترس نبود — یادداشتِ پایه که همین الان ذخیره شد سرِ جاشه.
      });
  }

  // دقیقاً معادل addActiveTermToLeitner توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence
  // — از همون singletonِ requestAddToLeitner استفاده می‌کنه، فقط این‌جا برای
  // یک محدوده‌ی انتخاب‌شده (چند کلمه/جمله) به‌جای تک‌لغت.
  function addSelectionToLeitner() {
    if (!popup || !bridge.requestAddToLeitner) return;
    const meaningText = translation && translation.status === "done" ? translation.text : "";
    bridge.requestAddToLeitner(popup.text, popup.langCode, meaningText);
    setLeitnerAdded(true);
  }

  return (
    <div
      ref={popupElRef}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top: Math.max(8, popup.top - (measuredHeight != null ? measuredHeight + 10 : translation ? 128 : 88)),
        left: Math.min(Math.max(90, popup.left), window.innerWidth - 90),
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 6,
        minWidth: 190,
        maxWidth: "min(92vw, 320px)",
        background: colors.ink,
        color: colors.paper,
        borderRadius: 10,
        padding: "10px 12px",
        fontFamily: fontFa,
        zIndex: 9999,
        boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "manipulation",
      }}
    >
      {/* متنِ اصلیِ انتخاب‌شده + دکمه‌ی خواندنِ صوتی، دقیقاً مطابقِ تصویرِ
          مرجع: بالای پاپ‌آپ خودِ متنِ انتخاب‌شده‌ست، نه ترجمه. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          dir={dirFor(popup.langCode)}
          style={{ fontWeight: 800, fontSize: 16, overflowWrap: "break-word", flex: 1 }}
        >
          {popup.text}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
            // 🐛 اصلاحِ باگ: این دکمه از موتورِ TTS خودِ اپ برای خوندنِ تکِ
            // محدوده‌ی انتخاب‌شده استفاده می‌کنه — این خودش درست و خواسته‌ست،
            // حتی وقتی محدوده از داخلِ متنِ اصلیِ داستانی باشه که کاربر همین
            // الان با «صوتِ آپلودیِ خودش» داره گوش می‌ده (دقیقاً مثلِ حالتِ
            // TTS: کاربر روی لغت می‌زنه، صدای تلفظش رو می‌شنوه، و بعد خودش
            // خودکار ادامه پیدا می‌کنه). چیزی که قبلاً خراب بود این بود که
            // چون speechController یه singleton سراسریه و این تلفظِ تکی رو
            // مستقل از userAudio پخش می‌کنه، هیچ‌کس به userAudio نمی‌گفت
            // «بعد از تمومِ این لغت دوباره ادامه بده» — نتیجه این می‌شد که یا
            // صوتِ آپلودی برای همیشه پازشده می‌موند، یا (بدتر) تایمرِ
            // سه‌ثانیه‌ایِ pauseForFocusِ همون لحظه‌ی بازشدنِ پاپ‌آپ، وسطِ
            // خواندنِ لغت با TTS خودش‌به‌خود صوتِ آپلودی رو دوباره پخش
            // می‌کرد و روی صدای TTS می‌افتاد. حالا: اگه محدوده از خودِ متنِ
            // داستان بوده و پخش رو حالتِ «صوتِ من» ایستاده، اول با
            // activeUserAudioPause صوتِ آپلودی رو مکث می‌کنیم (این خودش
            // تایمرِ زودهنگامِ بالا رو هم لغو می‌کنه)، بعد TTS همون لغت رو
            // می‌خونه، و وقتی TTS تمام شد، دو ثانیه بعد خودمون صوتِ آپلودی
            // رو دوباره play می‌کنیم.
            const inStoryUserAudio = isStoryUserAudioMode && popup.storyResumeOffset != null;
            if (inStoryUserAudio) bridge.activeUserAudioPause?.();
            const result = speechController.toggle(popup.text, popup.langCode);
            if (inStoryUserAudio) scheduleUserAudioResumeAfterWord(popup.text, popup.langCode);
            // اگه این محدوده از متنِ اصلیِ داستان بوده (آفستش شناخته شده)، همون
            // نقطه رو برای دفعه‌ی بعدِ زدنِ «پخشِ کل داستان» به‌خاطر می‌سپاریم —
            // فقط وقتی زبانِ محدوده با زبانِ فعلیِ داستان یکیه، وگرنه به‌درد
            // نمی‌خوره (مثلاً محدوده از متنِ ترجمه بوده).
            if (popup.storyResumeOffset != null && bridge.latestStoryTextContext.text && popup.langCode === bridge.latestStoryTextContext.code) {
              rememberMainTextResumeOffset(
                `${TTS_LOCALE[bridge.latestStoryTextContext.code] || "en-US"}::${bridge.latestStoryTextContext.text}`,
                popup.storyResumeOffset
              );
            }
            if (result === "unsupported") {
              setPopupSpeakMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
            } else if (result === "error") {
              setPopupSpeakMsg(ttsFailMsg(popup.langCode));
            } else if (result === "offline-need-model") {
              setPopupSpeakMsg(TTS_NEED_MODEL_MSG);
            } else if (result === "no-local-voice") {
              setPopupSpeakMsg("صدای این زبان روی گوشیت نصب نیست");
            } else if (result === "no-tts-engine") {
              setPopupSpeakMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
            }
          }}
          aria-label="خواندنِ بخشِ انتخاب‌شده"
          title="خواندنِ همینِ بخشِ انتخاب‌شده"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 26,
            height: 26,
            color: colors.goldSoft,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {speakState.key === `${TTS_LOCALE[popup.langCode] || "en-US"}::${popup.text}` && speakState.status === "playing" ? (
            <Pause size={16} />
          ) : (
            <Volume2 size={16} />
          )}
        </button>
        {/* دکمه‌ی بستنِ صریح — همیشه یه راهِ مطمئن برای خارج‌شدن از این
            پاپ‌آپ باشه، حتی اگه به هر دلیلی لمسِ بیرون کار نکرد. */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            closePopup();
          }}
          aria-label="بستن"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 22,
            height: 22,
            color: colors.paper,
            opacity: 0.7,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={15} />
        </button>
      </div>
      {(popupSpeakMsg ||
        (speakState.ttsError && speakState.ttsError === `${TTS_LOCALE[popup.langCode] || "en-US"}::${popup.text}`)) && (
        <div style={{ fontSize: 11, color: "#ff9a9a" }}>
          {popupSpeakMsg || ttsFailMsg(popup.langCode)}
        </div>
      )}
      </div>

      {/* ترجمه‌ی خودِ محدوده‌ی انتخاب‌شده — درست زیرِ متنِ اصلی، مطابقِ
          تصویرِ مرجع. وقتی زبانِ متن با زبانِ مادریِ کاربر یکیه، اصلاً
          نشون داده نمی‌شه (translation همون‌جا null می‌مونه). */}
      {translation && (
        <div
          dir={dirFor(nativeLang || fallbackLangCode)}
          style={{ textAlign: dirFor(nativeLang || fallbackLangCode) === "rtl" ? "right" : "left" }}
        >
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>ترجمه:</div>
          {translation.status === "loading" && (
            <div className="flex items-center gap-1" style={{ color: colors.paper, opacity: 0.85, fontSize: 13 }}>
              <Loader2 size={12} className="spin" />
              <span>در حال یافتن ترجمه...</span>
            </div>
          )}
          {translation.status === "done" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13 }}>
              <SpeakButton text={translation.text} code={nativeLang || fallbackLangCode} color={colors.goldSoft} neuralLabel="ترجمه" />
              <span
                style={{
                  flex: 1,
                  overflowWrap: "break-word",
                  // دقیقاً هم‌زمان با «ذخیره برای داستان بعدی» زده می‌شه: تا
                  // وقتی محدوده ذخیره نشده زیرخط نداره، همین که saved=true
                  // بشه (چه با زدنِ دکمه، چه چون از قبل ذخیره بوده) ترجمه‌ی
                  // زبانِ مقصد هم مثلِ بقیه‌ی جاهای برنامه زیرخطِ نقطه‌چینِ
                  // طلایی می‌گیره.
                  textDecorationLine: saved ? "underline" : "none",
                  textDecorationStyle: "dotted",
                  textDecorationColor: colors.gold,
                  textUnderlineOffset: 3,
                }}
              >
                {translation.text}
              </span>
              {/* دکمه‌ی «ترجمه اشتباهه؟» — اگه ترجمه‌ی نشون‌داده‌شده درست
                  نبود، کاربر همین‌جا می‌تونه بدونِ بستنِ پاپ‌آپ درخواستِ
                  یه ترجمه‌ی تازه/بازبینی‌شده بده (نگاه کن به توضیحِ
                  reportWrong بالای retryTranslation). */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryTranslation(true);
                }}
                aria-label="این ترجمه اشتباهه، یکی بهتر پیدا کن"
                title="ترجمه اشتباهه؟ دوباره امتحان کن"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  color: colors.goldSoft,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}
          {translation.status === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: colors.rose, fontSize: 11 }}>ترجمه پیدا نشد (احتمالاً آفلاینی)</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryTranslation();
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.paper,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                تلاش دوباره
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "2px 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
            const nowSaved = toggleSavedStoryWord(popup.text, popup.langCode, { nativeLang: nativeLang || fallbackLangCode });
            setSaved(nowSaved);
            if (nowSaved) {
              try {
                window.dispatchEvent(
                  new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: popup.text, langCode: popup.langCode } })
                );
              } catch {}
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: saved ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${saved ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <Bookmark size={13} fill={saved ? colors.gold : "none"} />
          {saved ? "ذخیره شد برای داستان بعدی" : "ذخیره برای داستان بعدی"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
            saveSelectionToGrammar();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: grammarSaved ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${grammarSaved ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <Type size={13} />
          {grammarSaved ? "ذخیره شد در گرامر" : "افزودن به یادگیری گرامر"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
            addSelectionToLeitner();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: leitnerAdded ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${leitnerAdded ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={13} />
          {leitnerAdded ? "به جعبه‌ی لایتنر اضافه شد" : "افزودن به جعبه‌ی لایتنر"}
        </button>
      </div>
    </div>
  );
}
