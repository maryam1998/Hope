// جمله‌ی قابل‌کلیک
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { RotateCcw, Loader2, Bookmark, Type } from "lucide-react";
import { bridge } from "../../runtime/bridge.js";
import { LANGUAGES, RTL_LANGS, dirFor } from "../../constants/languages.js";
import { colors, fontFa, fontLatin } from "../../ui/theme.js";
import { findWholeWordIndex, translateFree, translateWordInContext } from "../../translate/translateService.js";
import { normalizeWord } from "../../words/wordCache.js";
import { SAVED_WORDS_CHANGED_EVENT, STORY_WORD_PICKED_EVENT, crossTranslateInFlight, isWordSaved, loadSavedStoryWords, toggleSavedStoryWord, updateSavedWordTranslation } from "../../words/savedStoryWords.js";
import { useTargetTextPrefs } from "../../prefs/textPrefs.js";
import { lookupWordGrammarDetail, saveGrammarNote, updateGrammarNoteMarkdown } from "../../grammar/grammarNotes.js";
import { lookupWordMeaning } from "../../words/lookup.js";
import { SpeakButton } from "../player/SpeakButton.jsx";

// ---------------------------------------------------------------------------
// Renders a sentence as individually clickable words. Tapping a word shows
// a small popover with its part of speech + Persian meaning, looked up first
// from the local VOCAB list, then (if not found) from the AI backend.
// ---------------------------------------------------------------------------
export function ClickableSentence({ text, langCode, nativeLang, nativeLabel: nativeLabelProp, aiSettings, color, fontFamily, fontWeight, fontSize, alignSourceText, alignSourceLang, storyBaseOffset, onSpeakOffset, originExtra }) {
  const [openKey, setOpenKey] = useState(null); // `${startTokenIdx}-${endTokenIdx}` of the word/expression with popover open
  const [info, setInfo] = useState(null); // { pos, meaning } | "loading" | "error"
  const [anchorRect, setAnchorRect] = useState(null); // clicked word's screen position
  const [coords, setCoords] = useState(null); // { top, left } — final, clamped popup position
  const [saved, setSaved] = useState(false);
  // Whether the currently-open word was already saved to grammar learning
  // during this popover session — just for the button's own confirmation
  // state, reset every time a new word is tapped.
  const [grammarSaved, setGrammarSaved] = useState(false);
  // همون منطق برای دکمه‌ی «افزودن به جعبه‌ی لایتنر» — فقط برای فیدبکِ خودِ
  // دکمه (تیک‌خوردن)، هر بار که یه لغتِ تازه باز می‌شه ریست می‌شه.
  const [leitnerAdded, setLeitnerAdded] = useState(false);
  // The exact word/expression currently open in the popover. Looked up once
  // at click time and reused for both the AI lookup and the Save button, so
  // Save can never drift from what's actually on screen (this used to read a
  // token straight from the render closure, which is how a tap could end up
  // saving nothing at all).
  const [activeTerm, setActiveTerm] = useState("");
  // آفستِ کاراکتریِ پایانِ همون واژه/عبارتِ فعلاً بازشده، نسبت به شروعِ
  // همینِ `text` — برای گزارشِ «نقطه‌ی ادامه»ی متنِ اصلی وقتی دکمه‌ی پخشِ
  // همین پاپ‌آپ زده می‌شه (پایین‌تر، کنارِ onSpeakOffset).
  const [activeTermLocalEnd, setActiveTermLocalEnd] = useState(0);
  // This language's bookmarked words/expressions ("Save for next story"),
  // kept live so previously-saved terms get a dotted underline as soon as
  // they're saved (or lose it as soon as they're un-saved) anywhere in the app.
  const [savedTerms, setSavedTerms] = useState([]);
  // ترجمه‌ی لغاتی که به یه زبان دیگه ذخیره شدن ولی معادل‌شون تو همین زبان
  // (langCode فعلی) از قبل شناخته شده (یا تازه ترجمه شده) — تا همون معادل
  // هم مثل خودِ لغتِ اصلی زیرخط بخوره.
  const [crossTerms, setCrossTerms] = useState([]);
  const popupRef = useRef(null);
  // انتخابِ آزادِ یه محدوده از جمله (یا کل جمله) با درگ/لانگ‌پرس، برای
  // افزودنِ همون محدوده به داستان‌ساز — جدا از کلیکِ تک‌کلمه‌ای بالا.
  const containerRef = useRef(null);

  const isFa = nativeLang === "fa";
  const nativeLabel = nativeLabelProp || LANGUAGES.find((l) => l.code === nativeLang)?.label || "Persian";
  const popDir = dirFor(nativeLang || "fa");
  const popFont = RTL_LANGS.includes(nativeLang || "fa") ? fontFa : fontLatin;
  // تنظیماتِ سراسریِ اندازه/بولدِ متنِ زبانِ مقصد — alignSourceText فقط
  // وقتی پر می‌شه که این نمونه داره یه «ترجمه» رو نشون می‌ده (نه خودِ
  // متنِ اصلی)؛ همون علامتیه که برای تفکیکِ «متن اصلی» از «ترجمه» در
  // تنظیماتِ بولد استفاده می‌کنیم.
  const targetTextPrefs = useTargetTextPrefs();
  const isTranslationInstance = !!alignSourceText;
  const targetShouldBold =
    targetTextPrefs.bold === "both" ||
    (targetTextPrefs.bold === "text" && !isTranslationInstance) ||
    (targetTextPrefs.bold === "translation" && isTranslationInstance);
  const targetEffectiveWeight = targetShouldBold ? fontWeight || 700 : 400;
  // طبقِ خواستِ کاربر: اسلایدرِ «اندازه‌ی فونتِ زبانِ مقصد» دوباره رویِ *هر*
  // نمونه‌ی ClickableSentence اعمال می‌شه — هم متنِ اصلی/مقصد، هم ترجمه —
  // دقیقاً مثلِ حالتِ اولیه، تا با زیاد/کم‌کردنِ اسلایدر هر دو با هم به یه
  // نسبت بزرگ/کوچیک بشن.
  const targetEffectiveSize = Math.round((fontSize || 14) * ((targetTextPrefs.scale || 100) / 100));

  useEffect(() => {
    const refresh = () => setSavedTerms(loadSavedStoryWords().filter((e) => e.langCode === langCode));
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [langCode]);

  // زیرخط کشیدنِ لغات ذخیره‌شده فقط به زبان مبدأ محدود نمونه — لغتی که به
  // یه زبان دیگه ذخیره شده، معادلش رو تو این زبان (langCode) هم پیدا می‌کنه
  // (از کش، یا با ترجمه‌ی آزاد در پس‌زمینه) و همون‌جا هم زیرخط می‌خوره.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      const others = loadSavedStoryWords().filter((e) => e.langCode !== langCode);
      const cached = others
        .filter((e) => e.translations && e.translations[langCode])
        .map((e) => e.translations[langCode]);
      if (!cancelled) setCrossTerms(cached);
      others.forEach((e) => {
        if (e.translations && e.translations[langCode]) return;
        // این جمله (alignSourceText) فقط وقتی صاحبِ واقعیِ این لغته که خودِ
        // لغت عیناً توش باشه. قبلاً اگه این ClickableSentence خاص جمله‌ی
        // درستِ این لغت رو نداشت (چون هر نمونه از ClickableSentence برای
        // *همه‌ی* لغاتِ ذخیره‌شده تلاش می‌کرد، نه فقط لغاتِ همون جمله)، باز
        // هم می‌رفت سراغِ «ترجمه‌ی مجزای کلمه» (بی‌ربط به این جمله) و همون
        // نتیجه‌ی نادرست رو *سراسری* (برای کل اپ) کش می‌کرد — و اگه این
        // بره جلوتر از نمونه‌ای که واقعاً جمله‌ی درست رو داره، زیرخط همیشه
        // رو کلمه‌ی اشتباه می‌افتاد. پس اگه این جمله زبانِ مبدأِ لغت رو داره
        // ولی خودِ لغت توش نیست، این نمونه کلاً بی‌خیالِ این لغت می‌شه و
        // می‌ذاره نمونه‌ای که واقعاً همون جمله رو داره حلش کنه.
        if (alignSourceText && e.langCode === alignSourceLang && findWholeWordIndex(alignSourceText, e.word) === -1) {
          return;
        }
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${langCode}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        // اگه جمله‌ی مبدأ (همون زبانی که این لغت توش سیو شده) در دسترسه و
        // خودِ لغت واقعاً توش هست، اول با تکنیک «ترجمه‌ی داخل جمله» امتحان
        // می‌کنیم — نتیجه‌ش دقیقاً همون تکه‌ای از متنه که الان روی صفحه
        // دیده می‌شه، پس همیشه زیرش خط می‌افته. فقط اگه این راه جواب نداد
        // (یا جمله‌ی مبدأ در دسترس نبود)، می‌ریم سراغ ترجمه‌ی مجزای کلمه.
        const aligned =
          alignSourceText && e.langCode === alignSourceLang
            ? translateWordInContext(alignSourceText, e.word, alignSourceLang, langCode)
            : Promise.resolve(null);
        aligned
          .then((result) => result || translateFree(e.word, langCode, e.langCode))
          .then((result) => {
            if (result && normalizeWord(result) !== normalizeWord(e.word)) {
              updateSavedWordTranslation(e.word, e.langCode, langCode, result);
            }
          })
          .catch(() => {})
          .finally(() => crossTranslateInFlight.delete(fetchKey));
      });
    };
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    };
  }, [langCode, alignSourceText, alignSourceLang]);

  // انتخابِ آزادِ یه محدوده از متن (درگ با ماوس، یا لانگ‌پرس/درگ روی موبایل)
  // دیگه این‌جا محلی مدیریت نمی‌شه — یه مدیرِ سراسری (GlobalAddToStorySelection،
  // سوار شده توی ریشه‌ی برنامه) کل document رو زیر نظر داره و زبانِ متنِ
  // انتخاب‌شده رو از همون data-lang-code زیر می‌خونه. این یعنی این قابلیت
  // (و پاک‌کردنِ خودکارِ انتخاب برای جلوگیری از نوار ابزار بومیِ گوشی) توی
  // همه‌ی برنامه یکسانه، نه فقط این‌جا.

  // Keep the popup inside the visible viewport (crucial on phones, where a
  // long explanation used to spill off the right/left edge or bottom of
  // the screen). Recompute whenever it opens or its content/size changes.
  useLayoutEffect(() => {
    if (openKey === null || !anchorRect || !popupRef.current) return;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = popupRef.current;
    const w = Math.min(el.offsetWidth, vw - margin * 2);
    const h = el.offsetHeight;

    let left = anchorRect.left + anchorRect.width / 2 - w / 2;
    left = Math.max(margin, Math.min(left, vw - w - margin));

    let top = anchorRect.top - h - 8; // prefer showing above the word
    if (top < margin) top = Math.min(anchorRect.bottom + 8, vh - h - margin);

    setCoords({ top, left, width: w });
  }, [openKey, anchorRect, info]);

  // Close on outside click, scroll, or resize so a stale/misplaced popup
  // never lingers on screen.
  useEffect(() => {
    if (openKey === null) return;
    const close = () => {
      setOpenKey(null);
      setCoords(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [openKey]);

  if (!text) return null;
  const tokens = text.split(/(\s+)/); // keep whitespace so layout/wrapping looks natural

  // Merge contiguous word-tokens into a single group wherever they match a
  // saved word/expression for this language — longest match first, so a
  // saved multi-word expression (e.g. "give up") underlines as ONE unit
  // instead of underlining "give" and "up" separately.
  const savedNorms = new Set(
    [...savedTerms.map((e) => e.word), ...crossTerms].map((w) => normalizeWord(w)).filter(Boolean)
  );
  const wordTokIdx = [];
  tokens.forEach((t, i) => {
    if (!(/^\s+$/.test(t) || t === "")) wordTokIdx.push(i);
  });
  const groupAt = {}; // starting token idx -> { start, end, text }
  const groupSkip = new Set(); // token idx that belong to a group but aren't its start
  if (savedNorms.size) {
    // قبلاً این عدد ثابت (۴) بود، یعنی محدوده‌های انتخابیِ بلندتر از ۴ کلمه
    // (مثلاً یک جمله‌ی کامل که با «افزودن به داستان بعدی» ذخیره شده) هرگز
    // به‌صورتِ یک واحد پیدا/زیرخط نمی‌شدن — نه در متنِ اصلی، نه معادلشون در
    // ترجمه (crossTerms). حالا سقف رو از رویِ درازترین عبارتِ واقعاً
    // ذخیره‌شده حساب می‌کنیم تا هر محدوده‌ای، هرچقدر هم بلند، دقیقاً همون‌طور
    // که انتخاب و ذخیره شده زیرخط بخوره.
    const phraseWordLens = [...savedTerms.map((e) => e.word), ...crossTerms]
      .map((w) => (w.match(/\S+/g) || []).length)
      .filter((n) => n > 0);
    const MAX_EXPR_WORDS = phraseWordLens.length ? Math.min(60, Math.max(...phraseWordLens)) : 1;
    let p = 0;
    while (p < wordTokIdx.length) {
      let matched = false;
      const maxW = Math.min(MAX_EXPR_WORDS, wordTokIdx.length - p);
      for (let w = maxW; w >= 1; w--) {
        const startTok = wordTokIdx[p];
        const endTok = wordTokIdx[p + w - 1];
        const phrase = tokens.slice(startTok, endTok + 1).join("");
        const norm = normalizeWord(phrase);
        if (norm && savedNorms.has(norm)) {
          groupAt[startTok] = { start: startTok, end: endTok, text: phrase };
          for (let k = startTok + 1; k <= endTok; k++) groupSkip.add(k);
          p += w;
          matched = true;
          break;
        }
      }
      if (!matched) p += 1;
    }
  }

  async function openLookup(term, startTok, endTok, evt) {
    const clean = normalizeWord(term);
    if (!clean) return;
    const key = `${startTok}-${endTok}`;
    if (openKey === key) {
      setOpenKey(null);
      setCoords(null);
      return;
    }
    setAnchorRect(evt.currentTarget.getBoundingClientRect());
    setActiveTerm(term);
    setActiveTermLocalEnd(tokens.slice(0, endTok + 1).join("").length);
    setSaved(isWordSaved(term, langCode));
    setGrammarSaved(false);
    setLeitnerAdded(false);
    setOpenKey(key);
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: term, sentence: text, langCode, nativeLang, aiSettings });
      setInfo(result);
      // اگه این لغت از قبل ذخیره شده بود ولی هنوز ترجمه‌اش به زبان مادری
      // کش نشده بود، همین حالا که معنی‌اش پیدا شد، کاملش کن — هم برای
      // نمایش تو پنل «لغات ذخیره‌شده»، هم برای زیرخط خوردنِ ترجمه‌اش.
      if (result && result !== "error" && result.meaning) {
        updateSavedWordTranslation(term, langCode, nativeLang, result.meaning);
      }
    } catch (e) {
      setInfo("error");
    }
  }

  // Saves a grammar note for the currently-open word IMMEDIATELY — no AI
  // and no internet required — using whatever meaning we already have on
  // screen (or just the word + sentence if even the free translation
  // didn't come through). Stays on the current tab; nothing navigates the
  // learner away. If the AI backend does answer, its fuller breakdown
  // quietly replaces the basic note's text afterwards — but the save
  // itself never waits on that.
  function saveActiveTermToGrammar() {
    if (!activeTerm) return;
    const meaningText = info && info !== "loading" && info !== "error" ? info.meaning : "";
    const basicMarkdown =
      `## 🧩 ${activeTerm}\n\n` +
      (meaningText ? `**🔹 معنی:** ${meaningText}\n\n` : "") +
      `**جمله:** ${text}`;
    const entry = saveGrammarNote({ langCode, word: activeTerm, sentence: text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({ word: activeTerm, sentence: text, langCode, nativeLang, nativeLabel, aiSettings })
      .then((md) => {
        if (md) updateGrammarNoteMarkdown(entry.id, md);
      })
      .catch(() => {
        // AI backend down/offline — the basic note saved above still stands.
      });
  }

  // مثلِ saveActiveTermToGrammar بالا، ولی به‌جای گرامر، لغت رو به استخرِ
  // مرورِ جعبه‌ی لایتنر اضافه می‌کنه (سطحِ اول = تازه/نیازمندِ مرور). از
  // singletonِ requestAddToLeitner (بالای فایل، ست‌شده توسطِ PhrasebookMain)
  // استفاده می‌کنه تا لازم نباشه boxes/setBoxes رو تا این‌جا پاس بدیم.
  function addActiveTermToLeitner() {
    if (!activeTerm || !bridge.requestAddToLeitner) return;
    const meaningText = info && info !== "loading" && info !== "error" ? info.meaning : "";
    bridge.requestAddToLeitner(activeTerm, langCode, meaningText);
    setLeitnerAdded(true);
  }

  // دکمه‌ی «تلاش دوباره» وقتی سرور جواب نداده (مثلاً بک‌اند تازه از خواب
  // بیدار می‌شه و اولین درخواست تایم‌اوت می‌خوره).
  async function retryLookup() {
    if (!activeTerm) return;
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: activeTerm, sentence: text, langCode, nativeLang, aiSettings });
      setInfo(result);
    } catch (e) {
      setInfo("error");
    }
  }

  return (
    <span
      ref={containerRef}
      data-lang-code={langCode}
      data-story-base-offset={storyBaseOffset != null ? storyBaseOffset : undefined}
      style={{ position: "relative", display: "inline" }}
    >
      {tokens.map((tok, idx) => {
        if (/^\s+$/.test(tok) || tok === "") return <React.Fragment key={idx}>{tok}</React.Fragment>;
        if (groupSkip.has(idx)) return null; // already rendered as part of its group's combined span
        const group = groupAt[idx];
        const displayText = group ? group.text : tok;
        const startTok = group ? group.start : idx;
        const endTok = group ? group.end : idx;
        const isOpen = openKey === `${startTok}-${endTok}`;
        const isUnderlined = !!group; // has a saved explanation
        return (
          // نکته‌ی مهم: این span باید display:inline بمونه، نه inline-block.
          // inline-block هر کلمه رو برای مرورگر یه «جعبه‌ی اتمیک» جدا حساب
          // می‌کنه، و درگ‌کردنِ انتخاب روی چند خط از میونِ ده‌ها تا از این
          // جعبه‌ها دقیقاً همون باگیه که باعث می‌شه انتخاب نصفه‌ونیمه بشه یا
          // با کلیک لغو بشه (رفتار انتخاب‌متنِ استاندارد فقط با inline درست
          // کار می‌کنه). موقعیتِ پاپ‌آپ زیرش هم position:fixed هست، پس به
          // relative‌بودنِ این span هیچ وابستگی نداره.
          <span key={idx} style={{ display: "inline" }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                openLookup(displayText, startTok, endTok, e);
              }}
              style={{
                fontFamily: fontFamily || fontLatin,
                color: color || colors.teal,
                fontWeight: targetEffectiveWeight,
                fontSize: targetEffectiveSize,
                cursor: "pointer",
                textDecorationLine: isUnderlined ? "underline" : "none",
                textDecorationStyle: "dotted",
                textDecorationColor: colors.gold,
                textUnderlineOffset: 3,
              }}
            >
              {displayText}
            </span>
            {isOpen && (
              <div
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  top: coords ? coords.top : -9999,
                  left: coords ? coords.left : -9999,
                  visibility: coords ? "visible" : "hidden",
                  width: coords ? coords.width : undefined,
                  minWidth: 180,
                  maxWidth: "min(85vw, 280px)",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  background: colors.ink,
                  color: colors.paper,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontFamily: popFont,
                  zIndex: 100,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                  direction: popDir,
                  textAlign: popDir === "rtl" ? "right" : "left",
                  overflowWrap: "break-word",
                }}
              >
                {info === "loading" && (
                  <div className="flex items-center gap-1">
                    <Loader2 size={12} className="spin" />
                    <span>{isFa ? "در حال یافتن معنی..." : "Looking up meaning..."}</span>
                  </div>
                )}
                {info !== "loading" && (
                  <>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <SpeakButton
                        text={activeTerm}
                        code={langCode}
                        color={colors.goldSoft}
                        onPlayed={onSpeakOffset ? () => onSpeakOffset(activeTermLocalEnd) : undefined}
                        neuralLabel="لغت"
                      />
                      <span dir="auto" style={{ fontWeight: 800, fontSize: 13 }}>
                        {activeTerm}
                      </span>
                    </div>
                    {info && info !== "error" ? (
                      <>
                        <div style={{ marginBottom: 2, fontSize: 10, color: colors.inkSoft, opacity: 0.85 }}>
                          {isFa ? "ترجمه:" : "Translation:"}
                        </div>
                        <div style={{ marginBottom: 6 }}>{info.meaning}</div>
                      </>
                    ) : (
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: colors.rose, fontSize: 11 }}>
                          {isFa ? "معنی پیدا نشد (احتمالاً آفلاینی)" : "Couldn't find a meaning (maybe offline)"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryLookup();
                          }}
                          style={{
                            display: "block",
                            marginTop: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: colors.paper,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.25)",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          {isFa ? "تلاش دوباره" : "Retry"}
                        </button>
                      </div>
                    )}
                    {/* Save + grammar buttons always show once loading is done — even
                        with no meaning found — so bookmarking/saving keeps working
                        fully offline regardless of whether translation succeeded. */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!activeTerm) return;
                        const meaningNow = info && info !== "loading" && info !== "error" ? info.meaning : "";
                        const nowSaved = toggleSavedStoryWord(activeTerm, langCode, { meaning: meaningNow, nativeLang, originExtra });
                        setSaved(nowSaved);
                        // فقط وقتی تازه ذخیره شد (نه وقتی داشت از حالتِ
                        // ذخیره درمی‌اومد) به داستان‌سازِ باز هم اضافه کن.
                        if (nowSaved) {
                          try {
                            window.dispatchEvent(
                              new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: activeTerm, langCode } })
                            );
                          } catch {}
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: saved ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${saved ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        marginBottom: 6,
                      }}
                    >
                      <Bookmark size={11} fill={saved ? colors.gold : "none"} />
                      {saved
                        ? isFa
                          ? "ذخیره شد برای داستان بعدی"
                          : "Saved for next story"
                        : isFa
                        ? "ذخیره برای داستان بعدی"
                        : "Save for next story"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveActiveTermToGrammar();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: grammarSaved ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${grammarSaved ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      <Type size={11} />
                      {grammarSaved
                        ? isFa
                          ? "ذخیره شد در گرامر"
                          : "Saved to grammar"
                        : isFa
                        ? "افزودن به یادگیری گرامر"
                        : "Add to grammar learning"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addActiveTermToLeitner();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: leitnerAdded ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${leitnerAdded ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      <RotateCcw size={11} />
                      {leitnerAdded
                        ? isFa
                          ? "به جعبه‌ی لایتنر اضافه شد"
                          : "Added to Leitner box"
                        : isFa
                        ? "افزودن به جعبه‌ی لایتنر"
                        : "Add to Leitner box"}
                    </button>
                  </>
                )}
              </div>
            )}
          </span>
        );
      })}
    </span>
  );
}
