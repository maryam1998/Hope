import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

/* =============================================================================
   نگاشت موضوع → (اسم فارسی، آیکون). کلید دقیقاً همون رشته‌ی topic توی
   DAILY_CONVERSATIONS.js هست، پس نیازی به تغییر دیتا نیست.
   ============================================================================= */
const TOPIC_META_LIST = [
  ["Greetings and Small Talk", "احوال‌پرسی و گفتگوی کوتاه", "👋"],
  ["Introducing People", "معرفی افراد", "🤝"],
  ["Visiting an Old Friend", "دیدار دوست قدیمی", "🏠"],
  ["Getting Acquainted (Personal Questions)", "آشنایی (سوالات شخصی)", "💬"],
  ["Invitations", "دعوت‌کردن", "✉️"],
  ["Accepting or Refusing an Invitation", "پذیرفتن یا رد کردن دعوت", "✅"],
  ["Saying Goodbye", "خداحافظی", "🚶"],
  ["Telephone Conversation", "مکالمه تلفنی", "☎️"],
  ["Transportation", "حمل‌ونقل", "🚌"],
  ["Gas Station and Auto Repair", "پمپ بنزین و تعمیر ماشین", "⛽"],
  ["Weather and Seasons", "آب‌وهوا و فصل‌ها", "☀️"],
  ["At a Restaurant / Café", "رستوران و کافه", "🍽️"],
  ["Shopping (Clothes and General)", "خرید (لباس و عمومی)", "🛍️"],
  ["At a Hotel", "در هتل", "🏨"],
  ["Health and Doctor's Visit", "سلامتی و ویزیت دکتر", "🩺"],
  ["Asking for Directions / Landmarks", "پرسیدن آدرس و نشانی", "🧭"],
  ["Plans and Free Time (Hobbies)", "برنامه‌ها و اوقات فراغت", "🎨"],
  ["Work and Workplace", "کار و محیط کار", "💼"],
  ["Time and Appointments", "زمان و قرار ملاقات", "⏰"],
  ["Expressing Opinions and Feelings", "ابراز نظر و احساسات", "❤️"],
  ["Asking for Help and Clarification", "درخواست کمک و توضیح", "🙋"],
  ["Politeness and Compliments", "ادب و تعارفات", "🙏"],
  ["Travel and Experiences", "سفر و تجربیات", "✈️"],
  ["Apologies and Forgiveness", "عذرخواهی و بخشش", "🙇"],
  ["Family and Cultural Questions", "خانواده و سوالات فرهنگی", "👪"],
  ["Sports and Fitness", "ورزش و تناسب اندام", "🏃"],
  ["Technology and Communication", "فناوری و ارتباطات", "💻"],
  ["Holidays and Celebrations", "تعطیلات و جشن‌ها", "🎉"],
  ["Pets and Animals", "حیوانات خانگی", "🐾"],
  ["Learning a Language", "یادگیری زبان", "🗣️"],
  ["Emergency Situations", "موقعیت‌های اضطراری", "🚨"],
  ["City Attractions and Sightseeing", "جاذبه‌های شهری و گردش", "🏙️"],
  ["Schools and Education", "مدرسه و آموزش", "🏫"],
  ["Money and Expenses", "پول و هزینه‌ها", "💰"],
  ["Books and Reading", "کتاب و مطالعه", "📚"],
  ["Environment and Nature", "محیط‌زیست و طبیعت", "🌿"],
  ["Cooking and Recipes", "آشپزی و دستور پخت", "🍳"],
  ["Movies and TV Series", "فیلم و سریال", "🎬"],
  ["Music", "موسیقی", "🎵"],
  ["Banking and Financial Services", "بانک و خدمات مالی", "🏦"],
  ["Post Office and Mail", "اداره پست", "📮"],
  ["Neighbors and Community", "همسایه‌ها و جامعه", "🏘️"],
  ["Future Plans and Dreams", "برنامه‌های آینده و رویاها", "🌅"],
  ["Memories and Past Experiences", "خاطرات و تجربیات گذشته", "🕰️"],
];
const TOPIC_META = {};
TOPIC_META_LIST.forEach(([en, fa, icon]) => (TOPIC_META[en] = { fa, icon }));

const UI_STRINGS = {
  fa: {
    search: "جستجوی موضوع یا مکالمه...",
    comingSoon: "به‌زودی اضافه می‌شه",
    youHear: "می‌شنوی",
    youSay: "می‌گی",
    noResults: "چیزی پیدا نشد",
    backToTopics: "بازگشت به موضوعات",
  },
  en: {
    search: "Search topics or conversations...",
    comingSoon: "Coming soon",
    youHear: "You Hear",
    youSay: "You Say",
    noResults: "Nothing found",
    backToTopics: "Back to topics",
  },
};

// همون توکن‌های رنگ/فونتِ کل اپ (app.jsx) — چون این‌ها همه روی متغیرهای CSS
// سراسری (--c-ink و ...) سوارن که خودِ App روی یه div ریشه ست می‌کنه، همینجا
// دوباره تعریف‌شون کردن هیچ وابستگی جدیدی نمی‌سازه و باعث می‌شه این تب هم
// دقیقاً مثل بقیه‌ی تب‌ها با تعویض تم (اقیانوسی/جنگلی/شب...) عوض بشه.
const colors = {
  paper: "var(--c-paper)",
  paperDark: "var(--c-paperDark)",
  ink: "var(--c-ink)",
  inkSoft: "var(--c-inkSoft)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  teal: "var(--c-teal)",
  rose: "var(--c-rose)",
  cardBorder: "var(--c-cardBorder)",
};
// طبق درخواست: متن اصلی (جمله‌ی انگلیسی) مشکی/سورمه‌ای پررنگ و بولد،
// و متنِ ترجمه‌ها سبزِ پررنگ و بولد — این دو تا رنگ ثابتن (نه وابسته به
// تم انتخابی) چون خودِ کاربر رنگ مشخص خواسته.
const mainTextColor = "#0B1220";
const translationColor = "#0F5C34";
// رنگِ ثابتِ «ماژیک هایلایتِ خواندن» — دقیقاً همون مقداری که تو app.jsx
// برای داستان‌ساز و لغات استفاده می‌شه (اینجا هم محلی تعریف شده، عیناً به
// همون دلیلی که colors/mainTextColor بالا محلی تعریف شدن) تا هایلایتِ
// جمله‌ی درحالِ‌خواندن، توی همه‌ی تب‌ها دقیقاً یک رنگ باشه.
const READ_MARKER_COLOR = "#FFD54F";
const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";
// نسخه‌ی محلیِ نگاشتِ لوکالِ TTS — عیناً همون چیزی که app.jsx داره (برای
// ساختِ کلیدِ speechController: `${locale}::${text}`). این‌جا فقط برای
// تشخیصِ این‌که «همین الان کدوم زبانِ ترجمه داره خونده می‌شه» لازمه، پس
// یه کپیِ محلی (مثلِ colors/mainTextColor بالاتر) کافیه.
const TTS_LOCALE_MINI = {
  fa: "fa-IR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  ar: "ar-SA",
  tr: "tr-TR",
  zh: "zh-CN",
  ru: "ru-RU",
  it: "it-IT",
  ko: "ko-KR",
  ja: "ja-JP",
  hi: "hi-IN",
  ga: "ga-IE",
  uk: "uk-UA",
};

function TopicCard({ meta, hasData, onClick, uiLang, isRead, onToggleRead, readDoneColor, readDoneBg }) {
  const label = uiLang === "fa" ? meta.fa : meta.en;
  return (
    <div
      dir={uiLang === "fa" ? "rtl" : "ltr"}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "14px 12px 12px",
        borderRadius: 14,
        textAlign: uiLang === "fa" ? "right" : "left",
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: isRead ? readDoneBg : "white",
        opacity: hasData ? 1 : 0.55,
        minHeight: 90,
      }}
    >
      {/* دایره‌ی خوانده‌شده — روی خودِ کارت، جدا از کلیکِ بازکردنِ موضوع، تا
          کاربر بتونه بدونِ بازکردنِ موضوع هم پیشرفتش رو علامت بزنه. همیشه
          سمتِ راستِ کارت (چه فارسی چه انگلیسی) — قبلاً برای فارسی به‌اشتباه
          سمتِ چپ می‌رفت، اینجا با ternary درست‌شده تا با بقیه‌ی تب‌ها یکسان باشه. */}
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          onToggleRead && onToggleRead();
        }}
        aria-label={uiLang === "fa" ? "علامت‌زدن به‌عنوان خوانده‌شده" : "Toggle read"}
        style={{
          position: "absolute",
          top: 8,
          [uiLang === "fa" ? "right" : "left"]: 8,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${isRead ? readDoneColor : colors.cardBorder}`,
          backgroundColor: isRead ? readDoneColor : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRead && <Check size={13} color="white" strokeWidth={3} />}
      </button>
      <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, width: "100%" }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{meta.icon}</span>
        <span style={{ fontFamily: uiLang === "fa" ? fontFa : fontLatin, fontSize: 13, fontWeight: 700, color: colors.ink, lineHeight: 1.4 }}>
          {label}
        </span>
      </button>
    </div>
  );
}

// ترجمه‌ی زنده‌ی یک خط به یک زبان مقصد. اگه زبان فارسیه و از قبل توی خودِ
// دیتا (it.fa) موجوده، همون رو مستقیم نشون می‌ده (بدون درخواست شبکه)؛
// برای بقیه‌ی زبان‌ها (هر چی که کاربر بالای صفحه اضافه کنه) با همون
// translateFree که به کل اپ وصله می‌گیره — و چون translateFree خودش کش
// IndexedDB داره، دفعه‌ی بعد همون ترجمه بدون اینترنت هم در دسترسه.
function LineTranslation({ text, langCode, variant, i, knownFa, aiSettings, translateFree, SpeakButton, ClickableSentence, nativeLang, nativeLabel, autoScrollActive, highlightColor, fullText, lineOffsets, isActiveLine, onResolved }) {
  const [value, setValue] = useState(langCode === "fa" ? knownFa || "" : "");
  const [loading, setLoading] = useState(langCode !== "fa" && !knownFa);

  useEffect(() => {
    if (langCode === "fa") {
      setValue(knownFa || "");
      setLoading(false);
      return;
    }
    if (!translateFree) return;
    let cancelled = false;
    setLoading(true);
    translateFree(text, langCode, "en", aiSettings)
      .then((res) => {
        if (!cancelled) setValue(res || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [text, langCode, knownFa]);

  // به محضِ این‌که ترجمه‌ی این خط آماده شد، به بالا (DailyConversationsTab)
  // خبر می‌دیم — والد از روی مقدارِ همه‌ی خط‌ها، «متنِ کاملِ ترجمه‌ها»یِ
  // همین زبان رو می‌سازه؛ دقیقاً همون الگویی که برای متنِ اصلیِ انگلیسی
  // (fullText/lineOffsets در سطحِ تب) استفاده شده، این‌جا هم برای هر زبانِ
  // ترجمه تکرار می‌شه.
  useEffect(() => {
    if (!loading && value && onResolved && variant != null && i != null) {
      onResolved(langCode, variant, i, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, value, langCode, variant, i]);

  // isActiveLine از والد میاد (بر اساسِ آفستِ واقعیِ پخشِ speechController
  // داخلِ fullTextِ همین زبان) — دقیقاً همون مکانیزمی که خطِ اصلیِ انگلیسی
  // استفاده می‌کنه، نه یه مقایسه‌ی سادهٔ متنیِ محلی مثلِ قبل (که با پخشِ
  // پیوسته/ادامه‌دار کار نمی‌کرد).
  const rowRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !isActiveLine) return;
    if (rowRef.current && rowRef.current.scrollIntoView) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, isActiveLine]);

  if (!value && !loading) return null;

  const highlightStyle = {
    backgroundColor: isActiveLine ? (highlightColor || READ_MARKER_COLOR) : "transparent",
    borderRadius: 5,
    padding: isActiveLine ? "2px 4px" : "2px 0",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
    transition: "background-color 0.35s ease",
  };

  // آفستِ همین خطِ ترجمه داخلِ fullTextِ کاملِ همین زبان — با این، زدنِ
  // 🔊ِ این خط، دقیقاً از همینجا وارد پخشِ پیوسته‌ی همه‌ی ترجمه‌های همین
  // زبان می‌شه (نه فقط همین یه خط)، و خودش تا آخر ادامه پیدا می‌کنه؛
  // درست مثلِ رفتارِ بلندگوی متنِ اصلیِ انگلیسی.
  const myOffset = lineOffsets && lineOffsets.find((o) => o.variant === variant && o.i === i);

  return (
    // طبق درخواست: این ردیف هم مثل متنِ اصلی چپ‌به‌راست نوشته می‌شه، ولی
    // بلندگو طبق قانونِ کلیِ خودِ SpeakButton («همیشه سمت راستِ ردیف») باید
    // edge="end" بگیره — وگرنه چون ردیف رو ltr کردیم ولی این پراپ رو ندادیم،
    // بلندگو با فرضِ پیش‌فرضِ راست‌چین می‌رفت سمت چپ (دقیقاً برعکسِ خواسته).
    <div ref={rowRef} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, direction: "ltr" }}>
      {value && SpeakButton && (
        <SpeakButton
          text={value}
          code={langCode}
          color={translationColor}
          edge="end"
          fullText={fullText}
          startOffset={myOffset ? myOffset.start : undefined}
        />
      )}
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 9,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "0px 5px",
          flexShrink: 0,
        }}
      >
        {langCode.toUpperCase()}
      </span>
      {loading ? (
        <span style={{ fontSize: 12, color: colors.inkSoft, flex: 1 }}>...</span>
      ) : ClickableSentence ? (
        <span style={{ flex: 1, ...highlightStyle }}>
          <ClickableSentence
            text={value}
            langCode={langCode}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            aiSettings={aiSettings}
            color={translationColor}
            fontFamily={fontFa}
            fontWeight={900}
            fontSize={13}
          />
        </span>
      ) : (
        <span style={{ fontSize: 13, color: translationColor, fontWeight: 900, fontFamily: fontFa, flex: 1, ...highlightStyle }}>{value}</span>
      )}
    </div>
  );
}

function ConversationBox({ items, variant, label, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine, onResolveTranslation }) {
  const isHear = variant === "hear";
  if (items.length === 0) return null;
  const accent = isHear ? colors.teal : colors.gold;
  const langCodes = (targetLangs && targetLangs.length ? targetLangs.map((l) => l.code) : ["fa"]).filter((c) => c !== "en");
  return (
    <div>
      {/* eyebrow: بج دایره‌ای رنگی (تیل برای می‌شنوی، طلایی برای می‌گی) + برچسب —
          همون زبانِ بج‌های سطح/زبان که توی تب لغات هست، نه یه استایل جدا */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: isHear ? 10 : 14, marginBottom: 6 }}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 5,
            backgroundColor: accent,
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: fontFa, fontSize: 12.5, fontWeight: 800, color: colors.ink }}>{label}</span>
      </div>
      <div
        style={{
          backgroundColor: "white",
          border: `1px solid ${colors.cardBorder}`,
          borderInlineStart: `3px solid ${accent}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {items.map((it, i) => {
          const isLineActive = activeLine && activeLine.variant === variant && activeLine.i === i;
          // آفستِ همین خط داخلِ متنِ کاملِ سناریو — با این، زدنِ 🔊ِ همین خط
          // (چه چیزِ دیگه‌ای از قبل در حالِ پخش باشه چه نه) به‌جای خواندنِ
          // تک این یه خط، از دقیقاً همین‌جا وارد پخشِ کلِ سناریو می‌شه و
          // خودش تا آخر ادامه پیدا می‌کنه.
          const lineOffset = lineOffsets && lineOffsets.find((l) => l.variant === variant && l.i === i);
          return (
          <div
            key={i}
            ref={(el) => registerLineRef && registerLineRef(variant, i, el)}
            style={{
              position: "relative",
              padding: "9px 12px",
              borderBottom: i < items.length - 1 ? `1px dashed ${colors.cardBorder}` : "none",
            }}
          >
            {/* ردیفِ متنِ اصلی و هر ردیفِ ترجمه (پایین‌تر) حالا هر کدوم یه
                ردیفِ کامل و هم‌عرض‌ان (نه یکی تو دیگری قایم شده) — این‌جوری
                بلندگوی هر دو همیشه دقیقاً روی یه ستونِ ثابتِ سمت راست
                می‌شینه، هم‌راستا با هم. */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, direction: "rtl" }}>
              {/* بلندگو همیشه اول (یعنی لبه‌ی راست، چون کانتینر rtl‌ه)،
                  بعد بجِ سطح، بعد خودِ متن که فضای باقی‌مونده رو پر می‌کنه. */}
              {SpeakButton && (
                <SpeakButton
                  text={it.en}
                  code="en"
                  color={colors.teal}
                  fullText={fullText}
                  startOffset={lineOffset ? lineOffset.start : undefined}
                />
              )}
              <span
                style={{
                  fontFamily: fontLatin,
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.ink,
                  backgroundColor: colors.goldSoft,
                  borderRadius: 6,
                  padding: "1px 6px",
                  flexShrink: 0,
                }}
              >
                {it.level}
              </span>
              <div style={{ direction: "ltr", textAlign: "left", flex: 1, fontSize: 16, fontWeight: 800, color: mainTextColor, fontFamily: fontLatin }}>
                {/* هایلایتِ «همین الان داره خونده می‌شه» — دقیقاً همون مارکرِ
                    زردِ تنگِ دورِ خودِ متن که تو داستان‌ساز و لغات هست، نه
                    یه باکسِ تمام‌عرض دورِ کل ردیف. */}
                <span
                  style={{
                    backgroundColor: isLineActive ? (highlightColor || READ_MARKER_COLOR) : "transparent",
                    borderRadius: 5,
                    padding: isLineActive ? "2px 4px" : "2px 0",
                    WebkitBoxDecorationBreak: "clone",
                    boxDecorationBreak: "clone",
                    transition: "background-color 0.35s ease",
                  }}
                >
                  {ClickableSentence ? (
                    <ClickableSentence text={it.en} langCode="en" nativeLang={nativeLang} aiSettings={aiSettings} color={mainTextColor} fontFamily={fontLatin} fontWeight={800} fontSize={16} />
                  ) : (
                    it.en
                  )}
                </span>
              </div>
            </div>
            {langCodes.map((code) => {
              const info = translationTextInfo && translationTextInfo[code];
              return (
                <LineTranslation
                  key={code}
                  text={it.en}
                  langCode={code}
                  variant={variant}
                  i={i}
                  knownFa={it.fa}
                  aiSettings={aiSettings}
                  translateFree={translateFree}
                  SpeakButton={SpeakButton}
                  ClickableSentence={ClickableSentence}
                  nativeLang={nativeLang}
                  nativeLabel={nativeLabel}
                  autoScrollActive={autoScrollActive}
                  highlightColor={highlightColor}
                  fullText={info ? info.fullText : ""}
                  lineOffsets={info ? info.lineOffsets : []}
                  isActiveLine={!!(activeTranslationLine && activeTranslationLine.langCode === code && activeTranslationLine.variant === variant && activeTranslationLine.i === i)}
                  onResolved={onResolveTranslation}
                />
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioAccordionItem({ sc, isOpen, onToggle, levelFilter, t, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine, onResolveTranslation, isRead, onToggleRead, readDoneColor, readDoneBg }) {
  const filterFn = (arr) => (levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr);
  const speakerA = filterFn(sc.speakerA);
  const speakerB = filterFn(sc.speakerB);
  if (levelFilter && levelFilter !== "all" && speakerA.length === 0 && speakerB.length === 0) return null;

  return (
    <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", backgroundColor: isRead ? readDoneBg : "white" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", textAlign: "right" }}>
        <div className="flex items-center" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span
            onClick={(ev) => {
              ev.stopPropagation();
              onToggleRead && onToggleRead();
            }}
            aria-label={t.toggleRead || "Toggle read"}
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `2px solid ${isRead ? readDoneColor : colors.cardBorder}`,
              backgroundColor: isRead ? readDoneColor : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRead && <Check size={13} color="white" strokeWidth={3} />}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fontFa, fontWeight: 700, fontSize: 14, color: colors.ink }}>{sc.scenario}</div>
            {sc.context && !isOpen && (
              <div style={{ fontFamily: fontFa, fontSize: 11.5, color: colors.inkSoft, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sc.context}
              </div>
            )}
          </div>
        </div>
        <ChevronDown size={18} color={colors.teal} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0, marginRight: 8 }} />
      </button>
      {isOpen && (
        <div style={{ padding: "0 15px 15px" }}>
          {sc.context && <div style={{ fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>{sc.context}</div>}
          <ConversationBox items={speakerA} variant="hear" label={t.youHear} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} activeLine={isOpen ? activeLine : null} registerLineRef={isOpen ? registerLineRef : undefined} highlightColor={highlightColor} fullText={fullText} lineOffsets={lineOffsets} autoScrollActive={autoScrollActive} translationTextInfo={translationTextInfo} activeTranslationLine={isOpen ? activeTranslationLine : null} onResolveTranslation={onResolveTranslation} />
          <ConversationBox items={speakerB} variant="say" label={t.youSay} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} activeLine={isOpen ? activeLine : null} registerLineRef={isOpen ? registerLineRef : undefined} highlightColor={highlightColor} fullText={fullText} lineOffsets={lineOffsets} autoScrollActive={autoScrollActive} translationTextInfo={translationTextInfo} activeTranslationLine={isOpen ? activeTranslationLine : null} onResolveTranslation={onResolveTranslation} />
        </div>
      )}
    </div>
  );
}

// موضوع/سناریوی بازِ همین‌الان — بیرونِ کامپوننت نگه داشته می‌شه چون این تب
// (برخلاف تب‌های داستان/گرامر که با display:none زنده می‌مونن) با تعویضِ تب
// کاملاً unmount می‌شه؛ بدونِ این، هر برگشت به تب مکالمات، state لوکال از نو
// null می‌شد و کاربر می‌افتاد رو لیستِ موضوعات — حتی وسطِ پخشِ صدا. با
// remount از همین‌جا شروع می‌شه و افکتِ activeLine/scrollIntoView پایین‌تر
// (که به speechController گوش می‌ده) خودش کاربر رو دقیقاً به همون خطِ در
// حالِ پخش می‌بره.
let lastConversationsNav = { topic: null, scenario: null };

export default function DailyConversationsTab({
  data,
  query,
  uiLang: uiLangProp,
  nativeLang,
  nativeLabel,
  aiSettings,
  ClickableSentence,
  SpeakButton,
  targetLangs,
  translateFree,
  getCachedTranslationMap,
  levelFilter,
  speechController,
  onFullTextChange,
  autoScrollActive,
  highlightColor,
  loadReadWordIds,
  saveReadWordIds,
  wordsPageSize,
  readDoneColor,
  readDoneBg,
}) {
  const uiLang = uiLangProp || (nativeLang === "fa" ? "fa" : "en");
  const [activeTopic, setActiveTopic] = useState(() => lastConversationsNav.topic);
  const [openScenario, setOpenScenario] = useState(() => lastConversationsNav.scenario);
  useEffect(() => {
    lastConversationsNav = { topic: activeTopic, scenario: openScenario };
  }, [activeTopic, openScenario]);

  const t = UI_STRINGS[uiLang] || UI_STRINGS.fa;

  const filterByLevel = (arr) => (levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr);

  const dataByTopic = useMemo(() => {
    const map = {};
    data.forEach((tp) => (map[tp.topic] = tp));
    return map;
  }, [data]);

  // ترجمه‌ی هر خطِ مکالمه به زبان‌های غیر از فارسی/انگلیسی، بر خلافِ لغات،
  // فقط لحظه‌ای (وقتی کاربر واقعاً همون سناریو رو باز می‌کنه) گرفته و توی
  // IndexedDB کش می‌شه — نه یه فیلدِ ثابتِ توی خودِ دیتا. برای اینکه جستجو
  // بتونه رویِ همون ترجمه‌های از قبل کش‌شده هم (بدونِ درخواستِ شبکه‌ی تازه
  // برای صدها خط) جواب بده، وقتی کاربر چیزی تایپ می‌کنه، کلِ کشِ هر زبانِ
  // مقصدِ انتخاب‌شده (غیر از فارسی/انگلیسی که خودِ دیتا داره) رو یه‌بار
  // می‌خونیم و محلی نگه می‌داریم. طبیعتاً فقط جمله‌هایی که قبلاً یه‌جایی
  // (باز کردنِ همون سناریو) ترجمه و کش شده باشن پیدا می‌شن — نه هر جمله‌ای
  // که هنوز اصلاً دیده نشده.
  const [extraLangMaps, setExtraLangMaps] = useState({}); // { [langCode]: Map<en, translation> }
  useEffect(() => {
    if (!getCachedTranslationMap || !query || !query.trim()) return;
    const codes = Array.from(new Set((targetLangs || []).map((l) => l.code))).filter((c) => c !== "en" && c !== "fa");
    if (!codes.length) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      codes.forEach((code) => {
        getCachedTranslationMap(code, "en").then((map) => {
          if (!cancelled) setExtraLangMaps((prev) => ({ ...prev, [code]: map }));
        });
      });
    }, 250); // دبانس — تا وسطِ تایپ‌کردن، هر ضربه‌ی کیبورد یه اسکنِ کامل از کش نسازه
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, targetLangs, getCachedTranslationMap]);

  // یه خطِ مکالمه، صرف‌نظر از اینکه it.t (زبان‌های ثابتِ توی دیتا) داره یا
  // نه، آیا با عبارتِ جستجو‌شده (q) — چه تو متنِ اصلیِ انگلیسی، چه فارسیِ
  // ثابتِ دیتا، چه هر ترجمه‌ی از قبل کش‌شده‌ی extraLangMaps — مطابقت داره؟
  const itemMatchesQuery = (it, q, rawQuery) => {
    if (it.t) {
      return Object.values(it.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    }
    if (it.en && it.en.toLowerCase().includes(q)) return true;
    if (it.fa && it.fa.includes(rawQuery)) return true;
    for (const code of Object.keys(extraLangMaps)) {
      const val = extraLangMaps[code] && extraLangMaps[code].get(it.en);
      if (val && val.toLowerCase().includes(q)) return true;
    }
    return false;
  };

  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده — همون الگویی که تب‌های
  // لغات/داستان‌ساز/گرامر دارن. اینجا دو سطح جدا ردیابی می‌شه: خودِ
  // موضوع‌ها (کارت‌های توری بالا) و سناریوهای داخلِ هر موضوع، چون شمارشِ
  // «خوانده‌شده» باید هر بار زنده از رویِ همین دو Set حساب بشه، نه یه
  // عددِ ثابت.
  const [topicReadIds, setTopicReadIds] = useState(() => loadReadWordIds("dailyConvTopics"));
  const toggleTopicRead = (en) => {
    setTopicReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(en)) next.delete(en);
      else next.add(en);
      saveReadWordIds("dailyConvTopics", next);
      return next;
    });
  };
  const markTopicRangeRead = (items, read) => {
    setTopicReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((m) => {
        if (read) next.add(m.en);
        else next.delete(m.en);
      });
      saveReadWordIds("dailyConvTopics", next);
      return next;
    });
  };
  const [topicRangeInput, setTopicRangeInput] = useState({ from: "", to: "" });

  const [scenarioReadIds, setScenarioReadIds] = useState(() => loadReadWordIds("dailyConvScenarios"));
  const toggleScenarioRead = (topicEn, i) => {
    const id = `${topicEn}::${i}`;
    setScenarioReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds("dailyConvScenarios", next);
      return next;
    });
  };

  const filteredMeta = useMemo(() => {
    const all = TOPIC_META_LIST.map(([en, fa, icon]) => ({ en, fa, icon }));
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((m) => {
      if (m.fa.includes(query.trim()) || m.en.toLowerCase().includes(q)) return true;
      const d = dataByTopic[m.en];
      if (!d) return false;
      return d.scenarios.some((sc) => {
        if (sc.scenario && sc.scenario.toLowerCase().includes(q)) return true;
        return [...(sc.speakerA || []), ...(sc.speakerB || [])].some((it) => itemMatchesQuery(it, q, query.trim()));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dataByTopic, extraLangMaps]);

  const activeTopicData = activeTopic ? dataByTopic[activeTopic] : null;

  // خطوطِ قابل‌خوندنِ سناریوی همین‌الان بازشده — دقیقاً همون ترتیبی که
  // ConversationBox نشون می‌ده (اول «می‌شنوی»، بعد «می‌گی»). این‌ها منبعِ
  // متنِ دکمه‌ی 🔊ِ «خواندنِ کل متن» روی نوارِ پلیرن.
  const openScenarioData = activeTopicData && openScenario != null ? activeTopicData.scenarios[openScenario] : null;
  const readableLines = useMemo(() => {
    if (!openScenarioData) return [];
    const a = filterByLevel(openScenarioData.speakerA || []).map((it, i) => ({ text: it.en, variant: "hear", i }));
    const b = filterByLevel(openScenarioData.speakerB || []).map((it, i) => ({ text: it.en, variant: "say", i }));
    return [...a, ...b];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openScenarioData, levelFilter]);

  const fullText = readableLines.map((l) => l.text).join(" ");

  const lineOffsets = useMemo(() => {
    let offset = 0;
    return readableLines.map((l) => {
      const start = offset;
      offset += l.text.length + 1; // فاصله‌ی join(" ")
      return { variant: l.variant, i: l.i, start, end: start + l.text.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  // هر بار متنِ خوندنیِ سناریوی بازشده عوض بشه، به بالا (App) خبر می‌دیم تا
  // دکمه‌ی 🔊ِ روی نوارِ پلیر بتونه همین متن رو بخونه — دقیقاً همون الگویی
  // که تبِ داستان‌ساز استفاده می‌کنه.
  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: "en" });
  }, [fullText]);

  // خطی که همین الان، در حینِ پخشِ «کل متن» از روی پلیر، داره خونده می‌شه —
  // فقط برای اسکرولِ خودکار استفاده می‌شه (هایلایتِ بصری نداره).
  const [activeLine, setActiveLine] = useState(null); // {variant, i} | null

  // موقع رفتن به سناریو یا موضوعِ دیگه، نشانگرِ خط قدیمی رو پاک کن. این افکت
  // عمداً *قبل* از افکتِ محاسبه‌ی activeLine (پایین‌تر) اومده: هر دو افکت با
  // تغییرِ activeTopic/openScenario یا موقعِ mount با هم اجرا می‌شن، و چون
  // ترتیبِ اجرای افکت‌ها همون ترتیبِ نوشتنشونه، اگه این‌یکی زودتر باشه،
  // setActiveLine(null) این افکت با setActiveLine(found) افکتِ بعدی
  // overwrite نمی‌شه — وگرنه دقیقاً همون لحظه‌ی remount (برگشت به این تب
  // وسطِ پخش) که باید activeLine درست محاسبه بشه، این افکت با اجرا شدنِ
  // بعد از اون، دوباره می‌ذاشتش رو null.
  useEffect(() => {
    setActiveLine(null);
  }, [activeTopic, openScenario]);

  useEffect(() => {
    if (!speechController) return;
    const myKey = `en-US::${fullText}`;
    const update = (state) => {
      if (!fullText || state.key !== myKey || state.status === "idle") {
        setActiveLine(null);
        return;
      }
      const offset = speechController.getCharOffset();
      let found = lineOffsets[0] || null;
      for (const l of lineOffsets) {
        if (offset >= l.start) found = l;
        else break;
      }
      setActiveLine((prev) => {
        const next = found ? { variant: found.variant, i: found.i } : null;
        if (prev && next && prev.variant === next.variant && prev.i === next.i) return prev;
        return next;
      });
    };
    update(speechController.getState());
    // chunkIndex دقیقاً همون لحظه‌ای که خطِ بعدی شروع می‌شه آپدیت می‌شه (نه
    // با تخمین)، پس دیگه نیازی به polling نیست.
    return speechController.subscribe(update);
  }, [fullText, lineOffsets, speechController]);

  // -------------------------------------------------------------------------
  // «خواندنِ پیوسته‌ی ترجمه‌ها» — دقیقاً همون سیستمِ متنِ اصلیِ انگلیسی
  // (fullText + lineOffsets + activeLine + اسکرولِ خودکار) بالاتر، اما این‌بار
  // برای هر زبانِ ترجمه‌ی هدف جدا جدا. چون ترجمه‌ی هر خط lazy و async لود
  // می‌شه (LineTranslation)، نمی‌شه از قبل fullText رو ساخت؛ به‌جاش هر خط،
  // به محضِ آماده‌شدنِ مقدارش، از طریق onResolveTranslation به بالا خبر
  // می‌ده و اینجا، از رویِ مقادیرِ جمع‌شده، fullText/offsetِ هر زبان
  // ساخته می‌شه.
  const [translationValues, setTranslationValues] = useState({}); // { [langCode]: { [`${variant}-${i}`]: text } }
  const reportTranslation = useCallback((langCode, variant, i, value) => {
    setTranslationValues((prev) => {
      const langMap = prev[langCode] || {};
      const key = `${variant}-${i}`;
      if (langMap[key] === value) return prev;
      return { ...prev, [langCode]: { ...langMap, [key]: value } };
    });
  }, []);
  useEffect(() => {
    setTranslationValues({});
  }, [activeTopic, openScenario]);

  const targetLangCodes = useMemo(
    () => (targetLangs && targetLangs.length ? targetLangs.map((l) => l.code) : ["fa"]).filter((c) => c !== "en"),
    [targetLangs]
  );

  const translationTextInfo = useMemo(() => {
    const info = {};
    targetLangCodes.forEach((code) => {
      const langMap = translationValues[code] || {};
      let offset = 0;
      const parts = [];
      const offsets = [];
      readableLines.forEach((l) => {
        const val = langMap[`${l.variant}-${l.i}`];
        if (!val) return;
        const start = offset;
        parts.push(val);
        offset += val.length + 1; // فاصله‌ی join(" ")
        offsets.push({ variant: l.variant, i: l.i, start, end: start + val.length });
      });
      info[code] = { fullText: parts.join(" "), lineOffsets: offsets };
    });
    return info;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLangCodes, translationValues, readableLines]);

  // خطِ ترجمه‌ای که همین الان، در حینِ پخشِ پیوسته‌ی ترجمه‌های یک زبان، داره
  // خونده می‌شه — {langCode, variant, i} | null. دقیقاً همون الگویی که
  // activeLine بالاتر برای متنِ انگلیسی داره.
  const [activeTranslationLine, setActiveTranslationLine] = useState(null);

  useEffect(() => {
    setActiveTranslationLine(null);
  }, [activeTopic, openScenario]);

  useEffect(() => {
    if (!speechController) return;
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveTranslationLine(null);
        return;
      }
      for (const code of targetLangCodes) {
        const info = translationTextInfo[code];
        if (!info || !info.fullText) continue;
        const myKey = `${TTS_LOCALE_MINI[code] || "en-US"}::${info.fullText}`;
        if (state.key !== myKey) continue;
        const offset = speechController.getCharOffset();
        let found = info.lineOffsets[0] || null;
        for (const l of info.lineOffsets) {
          if (offset >= l.start) found = l;
          else break;
        }
        if (found) {
          setActiveTranslationLine((prev) => {
            if (prev && prev.langCode === code && prev.variant === found.variant && prev.i === found.i) return prev;
            return { langCode: code, variant: found.variant, i: found.i };
          });
        }
        return;
      }
      setActiveTranslationLine(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [targetLangCodes, translationTextInfo, speechController]);

  const lineRefs = useRef({});
  const registerLineRef = (variant, i, el) => {
    lineRefs.current[`${variant}-${i}`] = el;
  };
  useEffect(() => {
    if (!autoScrollActive || !activeLine) return;
    const node = lineRefs.current[`${activeLine.variant}-${activeLine.i}`];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, activeLine?.variant, activeLine?.i]);

  // جستجوی سراسری روی کلِ مکالمات (نه فقط اسمِ موضوع‌ها): وقتی کاربر عبارتی
  // تایپ می‌کنه، چه تو صفحه‌ی موضوعات باشه چه داخل یه موضوعِ بازشده، همه‌ی
  // خط‌های همه‌ی سناریوهای همه‌ی موضوعات (هم متنِ انگلیسی هم ترجمه‌ی فارسیِ
  // ذخیره‌شده‌شون) رو می‌گرده و نتیجه رو مستقل از activeTopic نشون می‌ده.
  // قبلاً وقتی داخلِ یه موضوع بودی، سرچ اصلاً به محتوای بازشده اعمال
  // نمی‌شد و همیشه همون موضوعِ باز نشون داده می‌شد — همین باعث می‌شد سرچ
  // «کاری نکنه».
  const searchResults = useMemo(() => {
    if (!query || !query.trim()) return null;
    const q = query.trim().toLowerCase();
    const results = [];
    data.forEach((tp) => {
      const meta = TOPIC_META[tp.topic] || { fa: tp.topic, icon: "💬" };
      (tp.scenarios || []).forEach((sc) => {
        const scenarioHit = sc.scenario && sc.scenario.toLowerCase().includes(q);
        [["speakerA", "hear"], ["speakerB", "say"]].forEach(([key, variant]) => {
          (sc[key] || []).forEach((it) => {
            const hit = scenarioHit || itemMatchesQuery(it, q, query.trim());
            if (hit) {
              results.push({ topicLabel: uiLang === "fa" ? meta.fa : tp.topic, icon: meta.icon, scenario: sc.scenario, item: it, variant });
            }
          });
        });
      });
    });
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, data, extraLangMaps, uiLang]);

  if (searchResults) {
    return (
      <div>
        {searchResults.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa }}>{t.noResults}</div>
        ) : (
          searchResults.map((r, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: colors.inkSoft, fontFamily: uiLang === "fa" ? fontFa : fontLatin, marginBottom: 5 }}>
                {r.icon} {r.topicLabel} · {r.scenario}
              </div>
              <ConversationBox
                items={[r.item]}
                variant={r.variant}
                label={r.variant === "hear" ? t.youHear : t.youSay}
                nativeLang={nativeLang}
                aiSettings={aiSettings}
                ClickableSentence={ClickableSentence}
                SpeakButton={SpeakButton}
                targetLangs={targetLangs}
                translateFree={translateFree}
                speechController={speechController}
                autoScrollActive={autoScrollActive}
                highlightColor={highlightColor}
              />
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div>
      {/* شبکه‌ی کارت‌های موضوعی */}
      {!activeTopic && (() => {
        const total = filteredMeta.length;
        const defaultTo = Math.min(total, wordsPageSize) || total || 1;
        const parsedFrom = parseInt(topicRangeInput.from, 10);
        const parsedTo = parseInt(topicRangeInput.to, 10);
        const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
        const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
        const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(total, 1));
        const clampedTo = Math.min(Math.max(clampedFrom, effTo), total || clampedFrom);
        const visibleMeta = filteredMeta.slice(clampedFrom - 1, clampedTo);
        const readCountInRange = visibleMeta.filter((m) => topicReadIds.has(m.en)).length;
        const readCountTotal = filteredMeta.filter((m) => topicReadIds.has(m.en)).length;
        return (
          <>
            {total > 0 && (
              <div
                className="flex flex-col gap-2 p-3 rounded-lg"
                style={{ backgroundColor: colors.paperDark, border: `1px solid ${colors.cardBorder}`, marginBottom: 10 }}
              >
                <div className="flex items-center gap-2 flex-wrap" style={{ direction: uiLang === "fa" ? "rtl" : "ltr" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.ink, fontFamily: uiLang === "fa" ? fontFa : fontLatin }}>
                    {uiLang === "fa" ? "موضوع‌ها" : "Topics"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={total}
                    value={topicRangeInput.from}
                    placeholder="1"
                    onChange={(ev) => setTopicRangeInput((prev) => ({ ...prev, from: ev.target.value }))}
                    onBlur={() => {
                      if (topicRangeInput.from !== "") setTopicRangeInput((prev) => ({ ...prev, from: String(clampedFrom) }));
                    }}
                    style={{ width: 56, padding: "4px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, fontSize: 13, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 13, color: colors.inkSoft }}>{uiLang === "fa" ? "تا" : "to"}</span>
                  <input
                    type="number"
                    min={1}
                    max={total}
                    value={topicRangeInput.to}
                    placeholder={String(defaultTo)}
                    onChange={(ev) => setTopicRangeInput((prev) => ({ ...prev, to: ev.target.value }))}
                    onBlur={() => {
                      if (topicRangeInput.to !== "") setTopicRangeInput((prev) => ({ ...prev, to: String(clampedTo) }));
                    }}
                    style={{ width: 56, padding: "4px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, fontSize: 13, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 12, color: colors.inkSoft }}>
                    {uiLang === "fa" ? `از مجموع ${total.toLocaleString("fa-IR")}` : `of ${total}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ direction: uiLang === "fa" ? "rtl" : "ltr" }}>
                  <span style={{ fontSize: 12, color: colors.teal, fontWeight: 700 }}>
                    {uiLang === "fa"
                      ? `خوانده‌شده: ${readCountInRange.toLocaleString("fa-IR")} از ${visibleMeta.length.toLocaleString("fa-IR")} در این بازه · ${readCountTotal.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")} کل`
                      : `Read: ${readCountInRange}/${visibleMeta.length} in range · ${readCountTotal}/${total} total`}
                  </span>
                  <button
                    type="button"
                    onClick={() => markTopicRangeRead(visibleMeta, true)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "2px 8px" }}
                  >
                    {uiLang === "fa" ? "علامت‌گذاری همه به خوانده‌شده" : "Mark range read"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markTopicRangeRead(visibleMeta, false)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "2px 8px" }}
                  >
                    {uiLang === "fa" ? "پاک‌کردن علامت این بازه" : "Clear range"}
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {visibleMeta.map((m) => (
                <TopicCard
                  key={m.en}
                  meta={m}
                  uiLang={uiLang}
                  hasData={!!dataByTopic[m.en]}
                  isRead={topicReadIds.has(m.en)}
                  onToggleRead={() => toggleTopicRead(m.en)}
                  readDoneColor={readDoneColor}
                  readDoneBg={readDoneBg}
                  onClick={() => {
                    setActiveTopic(m.en);
                    setOpenScenario(0);
                  }}
                />
              ))}
              {filteredMeta.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa }}>{t.noResults}</div>
              )}
            </div>
          </>
        );
      })()}

      {/* آکاردئون سناریوهای موضوع انتخاب‌شده */}
      {activeTopic && (
        <div style={{ paddingTop: 6 }}>
          <button onClick={() => setActiveTopic(null)} style={{ display: "flex", alignItems: "center", gap: 6, color: colors.teal, fontSize: 13, fontWeight: 700, fontFamily: uiLang === "fa" ? fontFa : fontLatin, marginBottom: 14 }}>
            ← {t.backToTopics}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{TOPIC_META[activeTopic]?.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: colors.ink, fontFamily: uiLang === "fa" ? fontFa : fontLatin }}>
              {uiLang === "fa" ? TOPIC_META[activeTopic]?.fa : activeTopic}
            </span>
          </div>

          {activeTopicData ? (
            activeTopicData.scenarios.map((sc, i) => (
              <ScenarioAccordionItem
                key={i}
                sc={sc}
                t={t}
                levelFilter={levelFilter}
                isOpen={openScenario === i}
                onToggle={() => setOpenScenario(openScenario === i ? null : i)}
                isRead={scenarioReadIds.has(`${activeTopic}::${i}`)}
                onToggleRead={() => toggleScenarioRead(activeTopic, i)}
                readDoneColor={readDoneColor}
                readDoneBg={readDoneBg}
                nativeLang={nativeLang}
                nativeLabel={nativeLabel}
                aiSettings={aiSettings}
                ClickableSentence={ClickableSentence}
                SpeakButton={SpeakButton}
                targetLangs={targetLangs}
                translateFree={translateFree}
                activeLine={activeLine}
                registerLineRef={registerLineRef}
                highlightColor={highlightColor}
                fullText={fullText}
                lineOffsets={lineOffsets}
                autoScrollActive={autoScrollActive}
                translationTextInfo={translationTextInfo}
                activeTranslationLine={activeTranslationLine}
                onResolveTranslation={reportTranslation}
              />
            ))
          ) : (
            <div style={{ textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa }}>{t.comingSoon}</div>
          )}
        </div>
      )}
    </div>
  );
}
