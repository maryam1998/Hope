// مثال‌های لغت و ترجمه‌ها
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw, Check, Sparkles, Plus, Loader2 } from "lucide-react";
import { setCachedTranslation } from "../../storage/translationCacheDb.js";
import { TTS_LOCALE } from "../../tts/ttsConfig.js";
import { LANGUAGES } from "../../constants/languages.js";
import { colors, fontFa, highlightBg, mainTextColor, translationColor } from "../../ui/theme.js";
import { looksLikelyMistranslated, translateFree, translateFreeNetwork, translateViaAI } from "../../translate/translateService.js";
import { speechController } from "../../speech/speechController.js";
import { addTextToStoryPicks } from "../../words/savedStoryWords.js";
import { generateWordExample, loadWordExamples, replaceWordExample, saveWordExample, updateWordExampleTranslation } from "../../words/wordExamples.js";
import { loadWordTranslation, saveWordTranslation } from "../../words/wordTranslations.js";
import { SpeakButton } from "../player/SpeakButton.jsx";
import { ClickableSentence } from "../story/ClickableSentence.jsx";

// ---------------------------------------------------------------------------
// یک ردیف ترجمه‌ی یک لغت به یک زبان مقصد. اگه ترجمه‌اش از قبل معلومه
// (فارسی — چون تو خودِ دیتای لغت هست) همون رو مستقیم نشون می‌ده؛ وگرنه اول
// از کش دستگاه می‌خونه و اگه نبود، لحظه‌ای با translateFree می‌گیره و کش
// می‌کنه (تا دفعه‌ی بعد دیگه درخواستی به سرور نره). متن با رنگ مشکی‌پررنگ
// (colors.ink) و bold نشون داده می‌شه — نه رنگ‌های کم‌کنتراست — تا خوندنِ
// پشت‌سرهمِ چند زبان چشم رو خسته نکنه.
export function WordTargetTranslation({ word, wordId, pos, level, langCode, abbr, knownText, nativeLang, nativeLabel, aiSettings, ClickableSentence, fullText, lineOffsets, isActiveLine, autoScrollActive, highlightColor, onResolved }) {
  const [text, setText] = useState(knownText || (() => loadWordTranslation(word, langCode)));
  // 🔁 دکمه‌ی «ترجمه‌ی این ردیف اشتباهه، دوباره امتحان کن» — چون گاهی سرویس‌های
  // رایگان برای یک زبونِ خاص (نه همه) همیشه یه جوابِ غلط/تکراری برمی‌گردونن
  // (مثلاً به‌خاطرِ فیلترینگ یا محدودیتِ خودِ اون سرویس برای اون زبون)، و
  // منتظرِ رفع‌شدنِ خودکارش موندن ممکنه هیچ‌وقت جواب نده. این دکمه به‌جایِ
  // چرخه‌ی معمولیِ ۴ سرویسِ رایگان (که همین الان همون جوابِ غلط رو دادن)،
  // مستقیم سراغِ بک‌اندِ AI خودِ اپ می‌ره (اگه در دسترس باشه) — شانسِ بیشتری
  // برایِ گرفتنِ جوابِ درست داره؛ و فقط اگه نتیجه از تستِ رایگانِ
  // looksLikelyMistranslated رد بشه کش/نمایش می‌شه، وگرنه به‌جایِ ذخیره‌یِ
  // یه غلطِ دیگه، فقط یه پیامِ کوتاهِ خطا نشون می‌ده.
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryFailed(false);
    try {
      let result = aiSettings ? await translateViaAI(word, langCode, "en", aiSettings).catch(() => null) : null;
      if (!result) {
        result = await translateFree(word, langCode, "en", aiSettings, true);
      }
      if (result && !looksLikelyMistranslated(word, result, langCode, "en")) {
        setText(result);
        saveWordTranslation(word, langCode, result);
      } else {
        setRetryFailed(true);
      }
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }, [retrying, word, langCode, aiSettings]);

  useEffect(() => {
    if (knownText) {
      setText(knownText);
      return;
    }
    // ⛔️ رفعِ باگِ «ترجمه‌ی قدیمیِ غلط که برای همیشه گیر می‌کرد»: قبلاً هرچی
    // از این کشِ localStorage (که بینِ همه‌ی تب‌ها مشترکه و فقط با
    // langCode+word کلید می‌شه) می‌اومد، بدونِ هیچ چکی مستقیم نشون داده
    // می‌شد — برخلافِ کشِ IndexedDBِ داخلِ translateFree که قبل از
    // نمایش/کش‌شدن، looksLikelyMistranslated رو چک می‌کنه. نتیجه: اگه یه
    // لغت (مثلاً routine) یه‌بار قبل‌تر (مثلاً موقعی که همه‌ی سرویس‌های
    // ترجمه شکست خورده بودن) با متنِ انگلیسیِ ترجمه‌نشده تو همین کش
    // ذخیره شده باشه، از اون به بعد برای همیشه همون غلط نشون داده می‌شد،
    // چون اصلاً دوباره سراغِ شبکه نمی‌رفت. حالا همون تستِ رایگان رو اینجا
    // هم اعمال می‌کنیم؛ اگه کشِ قدیمی مشکوک بود، نادیده‌ش می‌گیریم و مثلِ
    // حالتِ «کش نداریم» می‌ریم سراغِ translateFree — که خودش دوباره کش
    // می‌کنه (این‌بار با نتیجه‌ی تازه و چک‌شده).
    const cached = loadWordTranslation(word, langCode);
    if (cached && !looksLikelyMistranslated(word, cached, langCode, "en")) {
      setText(cached);
      return;
    }
    let cancelled = false;
    // slang/idiom بیشترین ریسکِ ترجمه‌ی غلطِ معنایی رو دارن (مثل gaslighter)
    // چون معمولاً تحت‌اللفظی نیستن. ولی خیلی از این کلمه‌ها توی دیتاست
    // اصلاً pos="idiom" تگ نخوردن (مثلاً خودِ "gaslight" که pos معمولیِ
    // noun/verb داره ولی معنیِ رایجش استعاره‌ایه، نه چراغِ گاز) — برای
    // همین سطح‌های بالا (C1/C2) رو هم اضافه کردیم، چون کلمه‌های پیشرفته
    // معمولاً بیشتر استعاره‌ای/چندمعنایی‌ان. برای بقیه (A1..B2 با
    // pos معمولی) همون هیوریستیکِ رایگانِ translateFree کافیه، تا حجمِ
    // زیادِ این دیتاست‌ها توکنِ زیادی نخوره.
    const forceVerify = pos === "slang" || pos === "idiom" || level === "C1" || level === "C2";
    translateFree(word, langCode, "en", aiSettings, forceVerify)
      .then((t) => {
        if (cancelled || !t) return;
        setText(t);
        saveWordTranslation(word, langCode, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, langCode, knownText]);

  // به محضِ آماده‌شدنِ ترجمه، به بالا (WordList) خبر می‌دیم — والد از رویِ
  // این مقادیر، «متنِ کاملِ ترجمه‌ها»یِ همین زبان رو می‌سازه تا زدنِ بلندگوی
  // هر لغت، دقیقاً مثلِ لیستِ اصلیِ انگلیسی، از همون‌جا وارد پخشِ پیوسته و
  // خودکارِ همه‌ی لغاتِ بعدی بشه (با اسکرول و هایلایتِ خودکار).
  useEffect(() => {
    if (text && onResolved && wordId != null) {
      onResolved(langCode, wordId, text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, langCode, wordId]);

  const rowRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !isActiveLine) return;
    if (rowRef.current && rowRef.current.scrollIntoView) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, isActiveLine]);

  const myOffset = lineOffsets && lineOffsets.find((o) => o.id === wordId);
  const highlightStyle = {
    backgroundColor: highlightBg(highlightColor, isActiveLine),
    borderRadius: 5,
    padding: isActiveLine ? "2px 4px" : "2px 0",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
    transition: "background-color 0.55s ease-in-out",
  };

  return (
    <div ref={rowRef} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        {abbr}
      </span>
      {text ? (
        <>
          {ClickableSentence ? (
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft, ...highlightStyle }}>
              <ClickableSentence
                text={text}
                langCode={langCode}
                nativeLang={nativeLang}
                nativeLabel={nativeLabel}
                aiSettings={aiSettings}
                color={colors.inkSoft}
                fontWeight={700}
                fontSize={14}
              />
            </p>
          ) : (
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft, ...highlightStyle }}>{text}</p>
          )}
          <SpeakButton
            text={text}
            code={langCode}
            color={colors.teal}
            edge="end"
            fullText={fullText}
            startOffset={myOffset ? myOffset.start : undefined}
            neuralId={`vocabuse:${wordId}:${langCode}`}
            neuralLabel="ترجمه"
          />
          <button
            onClick={handleRetry}
            disabled={retrying}
            title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
            aria-label="ترجمه‌ی دوباره"
            style={{ background: "none", border: "none", padding: 4, flexShrink: 0, cursor: retrying ? "default" : "pointer", display: "flex", alignItems: "center" }}
          >
            {retrying ? <Loader2 size={13} className="spin" color={colors.inkSoft} /> : <RotateCcw size={13} color={colors.inkSoft} style={{ opacity: 0.6 }} />}
          </button>
        </>
      ) : (
        <p style={{ flex: 1, fontSize: 12, color: colors.inkSoft }}>در حال ترجمه...</p>
      )}
      {retryFailed && (
        <span style={{ fontSize: 10, color: colors.rose, flexShrink: 0 }}>هنوز جواب درست نگرفتیم</span>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// دکمه‌ی «مثال» زیرِ ترجمه‌ی هر لغت (فقط توی تب‌های لغات/مکالمه/اخبار، نه
// عبارات) — با هوش مصنوعی یه مثالِ واقعی و امروزی برای همون لغت می‌سازه،
// زیرش نگه‌ داشته (کش) می‌شه، و ترجمه‌ی خودش رو هم با همون زنجیره‌ی رایگانِ
// ترجمه‌ای که برای داستان‌سازی استفاده می‌شه می‌گیره. هر مثال، یه دکمه‌ی
// «افزودن به داستان‌ساز» جدا داره؛ و چون خودِ متنِ مثال با ClickableSentence
// رندر می‌شه، انتخابِ آزادِ یه تکه از همون مثال هم (نگاه کن به ClickableSentence)
// همون‌جا قابل افزودن به داستانه.
// ---------------------------------------------------------------------------
// یه لغتی که همین الان دقیقاً همینِ متن (نه یه متنِ بزرگ‌ترِ شامل‌ش) داره
// با speechController خونده می‌شه یا نه — برای هایلایتِ زنده‌ی خودِ همین
// جمله، دقیقاً همون معیاری که خودِ SpeakButton برای isActive استفاده
// می‌کنه (state.key === `${locale}::${text}` && status !== "idle"). چون
// جمله/کالوکیشنِ ثابتِ کتاب (VocabBookExample) بخشی از یه fullTextِ
// بزرگ‌ترِ پیوسته نیست (نه مثلِ خودِ لیستِ لغات)، همین کافیه: یعنی هر بار
// کاربر دقیقاً روی 🔊ِ همین جمله بزنه (یا یه SpeakButtonِ دیگه‌ای که دقیقاً
// همین fullText رو صدا بزنه)، این true می‌شه.
function useActiveSpeech(text, code) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!text) {
      setActive(false);
      return;
    }
    const myKey = `${TTS_LOCALE[code] || "en-US"}::${text}`;
    const update = (state) => setActive(state.key === myKey && state.status !== "idle");
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [text, code]);
  return active;
}
// ترجمه‌ی جمله‌یِ مثال/کالوکیشنِ ثابتِ کتاب (تبِ «Vocabulary in Use») به یک
// زبانِ مقصدِ مشخص — دقیقاً همون الگویِ WordExampleTranslationLine (بالاتر)
// برای مثال‌هایِ AI-ساز، فقط این‌جا به‌جایِ کشِ example.translations، از همون
// کشِ سراسریِ loadWordTranslation/saveWordTranslation استفاده می‌کنه (متنِ
// جمله رو نرمالایز و کلید می‌کنه) — چون این جمله‌ها ثابتِ دیتان، نه رکوردِ
// AI با id.
// highlightColor/autoScrollActive: دقیقاً همون دو پراپی که WordTargetTranslation
// برای هایلایتِ زنده/اسکرولِ خودکارِ ردیف‌های ترجمه‌ی لغات استفاده می‌کنه —
// اینجا هم عیناً همون رفتار رو برای ترجمه‌ی مثالِ ثابتِ کتاب فعال می‌کنه.
function VocabBookExampleTranslation({ text, targetLang, abbr, aiSettings, highlightColor, autoScrollActive }) {
  // ⛔️ همون فیکسِ WordTargetTranslation (بالاتر) اینجا هم لازم بود: قبلاً
  // نتیجه‌ی translateFree — چه از کش، چه تازه — بدونِ هیچ چکی مستقیم
  // ست/کش می‌شد. وقتی همه‌ی سرویس‌های ترجمه برای یه جمله (که معمولاً از
  // خودِ تکِ‌کلمه طولانی‌تره و شانسِ تایم‌اوت/شکست‌ش بیشتره) شکست می‌خوردن،
  // translateFree به‌جای throw، خودِ متنِ انگلیسیِ اصلی رو برمی‌گردوند —
  // نتیجه: همون جمله‌ی انگلیسی، بدونِ ترجمه، زیرِ برچسبِ زبونِ مقصد (مثلاً
  // KO) نشون داده و برای همیشه تو localStorage کش می‌شد. حالا دقیقاً مثلِ
  // WordTargetTranslation، هم موقعِ خوندنِ کش و هم موقعِ ذخیره‌ی نتیجه‌ی تازه،
  // با looksLikelyMistranslated چک می‌شه؛ اگه مشکوک بود (مثلاً عیناً همون
  // متنِ مبدأ)، نه نشون داده می‌شه نه کش — دوباره سراغِ شبکه می‌ره.
  const [translation, setTranslation] = useState(() => {
    const cached = loadWordTranslation(text, targetLang);
    return cached && !looksLikelyMistranslated(text, cached, targetLang, "en") ? cached : "";
  });
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryFailed(false);
    try {
      let result = aiSettings ? await translateViaAI(text, targetLang, "en", aiSettings).catch(() => null) : null;
      if (!result) {
        result = await translateFree(text, targetLang, "en", aiSettings, true);
      }
      if (result && !looksLikelyMistranslated(text, result, targetLang, "en")) {
        setTranslation(result);
        saveWordTranslation(text, targetLang, result);
      } else {
        setRetryFailed(true);
      }
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }, [retrying, text, targetLang, aiSettings]);

  useEffect(() => {
    const cached = loadWordTranslation(text, targetLang);
    if (cached && !looksLikelyMistranslated(text, cached, targetLang, "en")) {
      setTranslation(cached);
      return;
    }
    let cancelled = false;
    translateFree(text, targetLang, "en", aiSettings, true)
      .then((t) => {
        if (cancelled || !t) return;
        if (looksLikelyMistranslated(text, t, targetLang, "en")) return; // کش نکن — خودِ سیستمِ ترجمه دوباره امتحان می‌کنه
        setTranslation(t);
        saveWordTranslation(text, targetLang, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, targetLang]);

  // هایلایتِ زنده + اسکرولِ خودکار — دقیقاً همون دو رفتاری که
  // WordTargetTranslation برای ردیف‌های ترجمه‌ی لیستِ لغات داره؛ اینجا
  // معیارِ «فعال» بودن اینه که همین الان دقیقاً همینِ ترجمه (نه یه متنِ
  // دیگه) با 🔊ِ همین ردیف در حالِ پخشه.
  const isActive = useActiveSpeech(translation, targetLang);
  const rowRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !isActive || !rowRef.current) return;
    rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoScrollActive, isActive]);

  if (!translation) {
    return <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 4 }}>در حال ترجمه...</p>;
  }

  return (
    <div ref={rowRef} className="flex items-center gap-2" style={{ marginTop: 4, direction: "ltr" }}>
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        {abbr || targetLang.toUpperCase()}
      </span>
      <p style={{ flex: 1, fontSize: 12, fontWeight: 800, color: translationColor }}>
        <span
          style={{
            backgroundColor: highlightBg(highlightColor, isActive),
            borderRadius: 5,
            padding: isActive ? "2px 4px" : "2px 0",
            WebkitBoxDecorationBreak: "clone",
            boxDecorationBreak: "clone",
            transition: "background-color 0.55s ease-in-out",
          }}
        >
          {translation}
        </span>
      </p>
      <SpeakButton text={translation} code={targetLang} color={translationColor} edge="end" neuralLabel="ترجمه" />
      <button
        onClick={handleRetry}
        disabled={retrying}
        title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
        aria-label="ترجمه‌ی دوباره"
        style={{ background: "none", border: "none", padding: 4, flexShrink: 0, cursor: retrying ? "default" : "pointer", display: "flex", alignItems: "center" }}
      >
        {retrying ? <Loader2 size={12} className="spin" color={colors.inkSoft} /> : <RotateCcw size={12} color={colors.inkSoft} style={{ opacity: 0.6 }} />}
      </button>
      {retryFailed && (
        <span style={{ fontSize: 10, color: colors.rose, flexShrink: 0 }}>هنوز جواب درست نگرفتیم</span>
      )}
    </div>
  );
}
// کالوکیشن/جمله‌ی مثالِ ثابتِ کتاب — چپ‌به‌راستِ صریح (dir=ltr)، بلندگو روی
// لبه‌ی راستِ ردیف (edge="end"، عیناً مثلِ بقیه‌ی تب‌ها)، و زیرش ترجمه‌ی
// جمله‌ی مثال به هرکدوم از زبان‌های مقصدِ انتخابیِ کاربر — تا بشه متنِ خودِ
// کتاب رو هم مثلِ مثال‌های AI-ساز به هر زبانی ترجمه/شنید.
// highlightColor/autoScrollActive: عیناً همون دو پراپی که بقیه‌ی جاهای اپ
// (ردیفِ اصلیِ لغت، ردیف‌های ترجمه‌اش) برای هایلایتِ زنده‌ی خودِ متن حینِ
// پخش + اسکرولِ خودکار به سمتش استفاده می‌کنن — قبلاً به این کامپوننت
// اصلاً پاس داده نمی‌شدن، پس کالوکیشن/مثالِ ثابتِ کتاب هیچ‌وقت هایلایت/
// اسکرول نمی‌گرفتن، حتی وقتی 🔊ِ خودشون زده می‌شد.
export function VocabBookExample({ collocation, example, targetLangs, aiSettings, nativeLang, ClickableSentence, highlightColor, autoScrollActive }) {
  const collocationActive = useActiveSpeech(collocation, "en");
  const exampleActive = useActiveSpeech(example, "en");
  const collocationRef = useRef(null);
  const exampleRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !collocationActive || !collocationRef.current) return;
    collocationRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoScrollActive, collocationActive]);
  useEffect(() => {
    if (!autoScrollActive || !exampleActive || !exampleRef.current) return;
    exampleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoScrollActive, exampleActive]);
  return (
    <div
      style={{
        marginTop: 6,
        padding: "6px 10px",
        background: colors.paperDark,
        borderRadius: 8,
        borderInlineStart: `3px solid ${colors.teal}`,
      }}
    >
      {collocation && (
        <div ref={collocationRef} className="flex items-center gap-2" style={{ direction: "ltr" }}>
          <p style={{ flex: 1, margin: 0, fontSize: 12 }}>
            <span
              style={{
                backgroundColor: highlightBg(highlightColor, collocationActive),
                borderRadius: 5,
                padding: collocationActive ? "2px 4px" : "2px 0",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
                transition: "background-color 0.55s ease-in-out",
              }}
            >
              <ClickableSentence
                text={collocation}
                langCode="en"
                nativeLang={nativeLang}
                aiSettings={aiSettings}
                color={colors.teal}
                fontWeight={700}
                fontSize={12}
              />
            </span>
          </p>
          <SpeakButton text={collocation} code="en" color={colors.teal} edge="end" neuralLabel="کالوکیشن" />
        </div>
      )}
      {example && (
        <div ref={exampleRef} className="flex items-center gap-2" style={{ marginTop: collocation ? 4 : 0, direction: "ltr" }}>
          <p style={{ flex: 1, margin: 0, fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}>
            <span
              style={{
                backgroundColor: highlightBg(highlightColor, exampleActive),
                borderRadius: 5,
                padding: exampleActive ? "2px 4px" : "2px 0",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
                transition: "background-color 0.55s ease-in-out",
              }}
            >
              <ClickableSentence
                text={example}
                langCode="en"
                nativeLang={nativeLang}
                aiSettings={aiSettings}
                color={colors.inkSoft}
                fontSize={12.5}
              />
            </span>
          </p>
          <SpeakButton text={example} code="en" color={colors.teal} edge="end" neuralLabel="مثال" />
        </div>
      )}
      {example &&
        (targetLangs || []).map((l) => (
          <VocabBookExampleTranslation
            key={l.code}
            text={example}
            targetLang={l.code}
            abbr={l.abbr}
            aiSettings={aiSettings}
            highlightColor={highlightColor}
            autoScrollActive={autoScrollActive}
          />
        ))}
    </div>
  );
}
export function WordExamples({ word, langCode, meaningNative, nativeLang, targetLangs, aiSettings }) {
  const [examples, setExamples] = useState(() => loadWordExamples(word, langCode));
  const [generating, setGenerating] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [err, setErr] = useState("");
  const nativeLabel = LANGUAGES.find((l) => l.code === nativeLang)?.label || nativeLang;

  async function handleGenerate(e) {
    e.stopPropagation();
    if (generating) return;
    setGenerating(true);
    setErr("");
    try {
      const text = await generateWordExample({
        word,
        langCode,
        meaningNative,
        nativeLabel,
        existingExamples: examples.map((ex) => ex.text),
        aiSettings,
      });
      if (!text) throw new Error("empty");
      saveWordExample(word, langCode, text);
      setExamples(loadWordExamples(word, langCode));
    } catch {
      setErr("مثال ساخته نشد — دوباره امتحان کن.");
    } finally {
      setGenerating(false);
    }
  }

  // دکمه‌ی رفرشِ یه مثالِ مشخص — اگه همون مثال (نه یه مثالِ تازه‌ی اضافه)
  // غلط از آب دراومده بود، دقیقاً همون رکورد رو با یه مثالِ تازه جایگزین
  // می‌کنه؛ existingExamples هم بدونِ خودِ همین مثال فرستاده می‌شه تا AI
  // احتمالاً همون جمله‌ی خراب رو دوباره تحویل نده.
  async function handleRefreshExample(exampleId) {
    if (refreshingId) return;
    setRefreshingId(exampleId);
    setErr("");
    try {
      const text = await generateWordExample({
        word,
        langCode,
        meaningNative,
        nativeLabel,
        existingExamples: examples.filter((ex) => ex.id !== exampleId).map((ex) => ex.text),
        aiSettings,
      });
      if (!text) throw new Error("empty");
      replaceWordExample(word, langCode, exampleId, text);
      setExamples(loadWordExamples(word, langCode));
    } catch {
      setErr("مثال ساخته نشد — دوباره امتحان کن.");
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: colors.gold,
          background: "transparent",
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "3px 8px",
          opacity: generating ? 0.6 : 1,
        }}
      >
        {generating ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
        {examples.length ? "مثال دیگر" : "مثال (با هوش مصنوعی)"}
      </button>
      {err && <p style={{ color: colors.rose, fontSize: 11, marginTop: 4 }}>{err}</p>}
      {examples.map((ex) => (
        <WordExampleRow
          key={ex.id}
          example={ex}
          word={word}
          langCode={langCode}
          nativeLang={nativeLang}
          nativeLabel={nativeLabel}
          targetLangs={targetLangs}
          aiSettings={aiSettings}
          onRefresh={() => handleRefreshExample(ex.id)}
          refreshing={refreshingId === ex.id}
        />
      ))}
    </div>
  );
}
// ترجمه‌ی خودِ جمله‌ی مثال به یک زبانِ مقصدِ مشخص — دقیقاً همون الگویی که
// WordTargetTranslation/LineTranslation برای خودِ لغت/جمله استفاده می‌کنن،
// اینجا هم عیناً برای هر کدوم از زبان‌های مقصدِ انتخاب‌شده تکرار می‌شه (نه
// فقط nativeLang) تا مثلاً هم فارسی هم اسپانیایی هم‌زمان دیده بشن.
function WordExampleTranslationLine({ example, word, langCode, targetLang, abbr, aiSettings, nativeLang, nativeLabel }) {
  const [translation, setTranslation] = useState(example.translations?.[targetLang] || "");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (example.translations?.[targetLang]) {
      setTranslation(example.translations[targetLang]);
      return;
    }
    let cancelled = false;
    translateFree(example.text, targetLang, langCode, aiSettings, true)
      .then((t) => {
        if (cancelled || !t) return;
        setTranslation(t);
        updateWordExampleTranslation(word, langCode, example.id, targetLang, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [example.id, targetLang]);

  // دکمه‌ی رفرشِ همینِ ترجمه — دقیقاً همون منطقِ retranslateStorySentence/
  // retranslateOneSentenceText تویِ داستان‌ساز: چون خودِ کاربر با زدنِ این
  // دکمه داره می‌گه «این ترجمه غلطه»، مستقیم سراغِ بک‌اندِ AI می‌ریم (بدونِ
  // چک‌کردنِ کشِ IndexedDB — که خودِ همون ترجمه‌ی غلط رو نگه داشته)، و اگه
  // AI در دسترس نبود، به‌عنوانِ آخرین چاره مستقیم سراغِ شبکه (بازم بدونِ کش).
  async function handleRefreshTranslation(e) {
    e.stopPropagation();
    if (refreshing) return;
    setRefreshing(true);
    try {
      let t;
      try {
        t = await translateViaAI(example.text, targetLang, langCode, aiSettings);
      } catch {
        t = null;
      }
      if (!t) t = await translateFreeNetwork(example.text, targetLang, langCode, aiSettings, true);
      if (t) {
        setTranslation(t);
        setCachedTranslation(example.text, targetLang, langCode, t); // fire-and-forget — جایِ ترجمه‌ی غلطِ قبلی رو تو کش می‌گیره
        updateWordExampleTranslation(word, langCode, example.id, targetLang, t);
      }
    } catch {
      // شکست خورد؛ ترجمه‌ی قبلی همون‌جا می‌مونه، کاربر می‌تونه دوباره امتحان کنه.
    } finally {
      setRefreshing(false);
    }
  }

  if (!translation) {
    return <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 4 }}>در حال ترجمه...</p>;
  }

  return (
    <div className="flex items-center gap-2" style={{ marginTop: 4, direction: "ltr" }}>
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        {abbr || targetLang.toUpperCase()}
      </span>
      {/* ClickableSentence به‌جای <p> ساده — تا روی ترجمه‌ی مثال‌های
          AI-ساز هم بشه لغت/محدوده انتخاب کرد و همون پاپ‌آپِ «افزودن به
          داستان بعدی / افزودن به گرامر / افزودن به جعبه‌ی لایتنر» باز
          بشه؛ alignSourceText/alignSourceLang همون تکنیکِ «ترجمه‌ی داخلِ
          جمله»یِ نسخه‌ی اصلیِ مثال رو فعال می‌کنه (دقیقاً همون الگویی که
          برایِ ترجمه‌های داخلِ خودِ داستان استفاده می‌شه). */}
      <div style={{ flex: 1 }}>
        <ClickableSentence
          text={translation}
          langCode={targetLang}
          nativeLang={nativeLang}
          nativeLabel={nativeLabel}
          aiSettings={aiSettings}
          color={translationColor}
          fontWeight={800}
          fontSize={12}
          alignSourceText={example.text}
          alignSourceLang={langCode}
        />
      </div>
      <SpeakButton text={translation} code={targetLang} color={translationColor} edge="end" neuralId={`example:${example.id}:${targetLang}`} neuralLabel="ترجمه" />
      <button
        type="button"
        onClick={handleRefreshTranslation}
        disabled={refreshing}
        title={nativeLang === "fa" ? "اگه این ترجمه اشتباهه، دوباره امتحان کن" : "If this translation is wrong, try again"}
        aria-label={nativeLang === "fa" ? "ترجمه‌ی دوباره" : "Retranslate"}
        style={{
          background: "none",
          border: "none",
          padding: 4,
          flexShrink: 0,
          cursor: refreshing ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        {refreshing ? <Loader2 size={12} className="spin" color={translationColor} /> : <RotateCcw size={12} color={translationColor} style={{ opacity: 0.6 }} />}
      </button>
    </div>
  );
}
function WordExampleRow({ example, word, langCode, nativeLang, targetLangs, aiSettings, nativeLabel, onRefresh, refreshing }) {
  const [added, setAdded] = useState(false);
  // زبان‌های مقصدی که کاربر بالای صفحه انتخاب/مرتب کرده، منهای خودِ زبانِ
  // مقصدی که جمله‌ی مثال بهش نوشته شده (langCode) — اگه چیزی انتخاب نشده
  // بود، حداقل fa رو نشون بده که خالی نمونه.
  const exampleTargetLangs =
    targetLangs && targetLangs.length
      ? targetLangs.filter((l) => l.code !== langCode)
      : [{ code: nativeLang, label: "", abbr: nativeLang.toUpperCase() }];

  return (
    <div
      style={{
        marginTop: 6,
        padding: 8,
        borderRadius: 8,
        background: colors.paperDark,
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      {/* متن مثال مشکی/سورمه‌ای پررنگ و bold، ترجمه‌اش سبز پررنگ و bold —
          تا هم خوندن‌شون تو کادرِ کرم‌رنگ چشم رو خسته نکنه، هم متن اصلی
          از ترجمه به‌وضوح جدا باشه. */}
      <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
        <div style={{ flex: 1 }}>
          <ClickableSentence
            text={example.text}
            langCode={langCode}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            aiSettings={aiSettings}
            color={mainTextColor}
            fontWeight={800}
            fontSize={13}
          />
        </div>
        <SpeakButton text={example.text} code={langCode} color={colors.teal} edge="end" neuralId={`example:${example.id}:${langCode}`} neuralLabel="مثال" />
        {/* دکمه‌ی رفرشِ خودِ مثال — اگه هوش‌مصنوعی به‌جای یه جمله‌ی درست چیزِ
            غلطی (مثلاً متنِ خامِ فکرکردنش) ساخته، کاربر می‌تونه بدونِ اضافه
            کردنِ یه مثالِ تازه‌ی جدا، همینِ یکی رو با یه مثالِ بهتر عوض کنه. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh?.();
          }}
          disabled={refreshing}
          title={nativeLang === "fa" ? "اگه این مثال اشتباهه، دوباره بساز" : "If this example is wrong, try again"}
          aria-label={nativeLang === "fa" ? "ساختِ دوبارهِ مثال" : "Regenerate example"}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            flexShrink: 0,
            cursor: refreshing ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {refreshing ? <Loader2 size={12} className="spin" color={colors.teal} /> : <RotateCcw size={12} color={colors.teal} style={{ opacity: 0.7 }} />}
        </button>
      </div>
      {exampleTargetLangs.map((l) => (
        <WordExampleTranslationLine
          key={l.code}
          example={example}
          word={word}
          langCode={langCode}
          targetLang={l.code}
          abbr={l.abbr}
          aiSettings={aiSettings}
          nativeLang={nativeLang}
          nativeLabel={nativeLabel}
        />
      ))}
      <button
        onClick={() => {
          addTextToStoryPicks(example.text, langCode);
          setAdded(true);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: added ? colors.gold : colors.teal,
          background: "transparent",
          border: `1px solid ${added ? colors.gold : colors.cardBorder}`,
          borderRadius: 6,
          padding: "3px 8px",
          marginTop: 6,
        }}
      >
        {added ? <Check size={11} /> : <Plus size={11} />}
        {added ? "اضافه شد به داستان‌ساز" : "افزودن این مثال به داستان‌ساز"}
      </button>
    </div>
  );
}
