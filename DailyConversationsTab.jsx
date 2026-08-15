import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

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
const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";

function TopicCard({ meta, hasData, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "14px 12px 12px",
        borderRadius: 14,
        textAlign: "right",
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: "white",
        opacity: hasData ? 1 : 0.55,
        minHeight: 90,
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{meta.icon}</span>
      <span style={{ fontFamily: fontFa, fontSize: 13, fontWeight: 700, color: colors.ink, lineHeight: 1.4 }}>
        {meta.fa}
      </span>
    </button>
  );
}

// ترجمه‌ی زنده‌ی یک خط به یک زبان مقصد. اگه زبان فارسیه و از قبل توی خودِ
// دیتا (it.fa) موجوده، همون رو مستقیم نشون می‌ده (بدون درخواست شبکه)؛
// برای بقیه‌ی زبان‌ها (هر چی که کاربر بالای صفحه اضافه کنه) با همون
// translateFree که به کل اپ وصله می‌گیره — و چون translateFree خودش کش
// IndexedDB داره، دفعه‌ی بعد همون ترجمه بدون اینترنت هم در دسترسه.
function LineTranslation({ text, langCode, knownFa, aiSettings, translateFree, SpeakButton, ClickableSentence, nativeLang, nativeLabel }) {
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

  if (!value && !loading) return null;

  return (
    // طبق درخواست: این ردیف هم مثل متنِ اصلی چپ‌به‌راست نوشته می‌شه، ولی
    // بلندگو طبق قانونِ کلیِ خودِ SpeakButton («همیشه سمت راستِ ردیف») باید
    // edge="end" بگیره — وگرنه چون ردیف رو ltr کردیم ولی این پراپ رو ندادیم،
    // بلندگو با فرضِ پیش‌فرضِ راست‌چین می‌رفت سمت چپ (دقیقاً برعکسِ خواسته).
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, direction: "ltr" }}>
      {value && SpeakButton && <SpeakButton text={value} code={langCode} color={translationColor} edge="end" />}
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
        <span style={{ flex: 1 }}>
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
        <span style={{ fontSize: 13, color: translationColor, fontWeight: 900, fontFamily: fontFa, flex: 1 }}>{value}</span>
      )}
    </div>
  );
}

// متن رو به کلمه‌های \S+ می‌شکنه و آفستِ start/end هر کلمه (نسبتِ به شروعِ
// همون متن) رو نگه می‌داره — دقیقاً همون الگوریتمی که speechController خودش
// برای تکه‌بندی به‌کار می‌بره، پس ایندکس‌ها با هم سازگارن.
function tokenizeWords(text) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text || "")) !== null) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

function findActiveWordIndex(words, offset) {
  for (let i = 0; i < words.length; i++) {
    if (offset >= words[i].start && offset < words[i].end) return i;
  }
  for (let i = words.length - 1; i >= 0; i--) {
    if (offset >= words[i].start) return i;
  }
  return 0;
}

// استایلِ کلمه‌ای که همین الان داره خونده می‌شه: به‌جای خط زیرش، خودِ
// کلمه یه سایه‌ی نرم می‌گیره (box-shadow) — یه حس برجسته/شناور، بدون
// این‌که به شکلِ خط یا برجستگیِ تیز دربیاد.
const ACTIVE_WORD_STYLE = {
  position: "relative",
  borderRadius: 5,
  padding: "1px 4px",
  margin: "-1px -4px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18)",
  transition: "box-shadow .15s ease",
};

// نسخه‌ی «ردیاب‌دار» یه جمله: هر کلمه یه span مجزاست، و فقط کلمه‌ای که
// همین الان در حالِ خونده‌شدنه سایه می‌گیره. فقط برای خطی که همین الان
// در حالِ خونده‌شدنه صدا زده می‌شه (بقیه‌ی خط‌ها همون رندرِ قبلی/
// ClickableSentence رو دارن).
function WordTrackedText({ text, relOffset, fontFamily, fontSize, fontWeight, color }) {
  const words = useMemo(() => tokenizeWords(text), [text]);
  const activeIdx = findActiveWordIndex(words, relOffset);

  return (
    <span style={{ fontFamily, fontSize, fontWeight, color }}>
      {words.map((w, i) => (
        <span key={i} style={i === activeIdx ? ACTIVE_WORD_STYLE : undefined}>
          {w.text}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function ConversationBox({ items, variant, label, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, activeWordRelOffset, registerLineRef }) {
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
              {SpeakButton && <SpeakButton text={it.en} code="en" color={colors.teal} />}
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
                {activeLine && activeLine.variant === variant && activeLine.i === i ? (
                  // این دقیقاً همون خطیه که همین الان از روی پلیرِ «خواندنِ
                  // کل متن» داره خونده می‌شه — به‌جای رندرِ عادی، ردیابِ
                  // خوانش (خطِ سایه‌ی زیرِ کلمه) رو نشون می‌ده.
                  <WordTrackedText text={it.en} relOffset={activeWordRelOffset} fontFamily={fontLatin} fontSize={16} fontWeight={800} color={mainTextColor} />
                ) : ClickableSentence ? (
                  <ClickableSentence text={it.en} langCode="en" nativeLang={nativeLang} aiSettings={aiSettings} color={mainTextColor} fontFamily={fontLatin} fontWeight={800} fontSize={16} />
                ) : (
                  it.en
                )}
              </div>
            </div>
            {langCodes.map((code) => (
              <LineTranslation
                key={code}
                text={it.en}
                langCode={code}
                knownFa={it.fa}
                aiSettings={aiSettings}
                translateFree={translateFree}
                SpeakButton={SpeakButton}
                ClickableSentence={ClickableSentence}
                nativeLang={nativeLang}
                nativeLabel={nativeLabel}
              />
            ))}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioAccordionItem({ sc, isOpen, onToggle, levelFilter, t, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, activeWordRelOffset, registerLineRef }) {
  const filterFn = (arr) => (levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr);
  const speakerA = filterFn(sc.speakerA);
  const speakerB = filterFn(sc.speakerB);
  if (levelFilter && levelFilter !== "all" && speakerA.length === 0 && speakerB.length === 0) return null;

  return (
    <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", backgroundColor: "white" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", textAlign: "right" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fontFa, fontWeight: 700, fontSize: 14, color: colors.ink }}>{sc.scenario}</div>
          {sc.context && !isOpen && (
            <div style={{ fontFamily: fontFa, fontSize: 11.5, color: colors.inkSoft, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sc.context}
            </div>
          )}
        </div>
        <ChevronDown size={18} color={colors.teal} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0, marginRight: 8 }} />
      </button>
      {isOpen && (
        <div style={{ padding: "0 15px 15px" }}>
          {sc.context && <div style={{ fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>{sc.context}</div>}
          <ConversationBox items={speakerA} variant="hear" label={t.youHear} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} activeLine={isOpen ? activeLine : null} activeWordRelOffset={activeWordRelOffset} registerLineRef={isOpen ? registerLineRef : undefined} />
          <ConversationBox items={speakerB} variant="say" label={t.youSay} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} activeLine={isOpen ? activeLine : null} activeWordRelOffset={activeWordRelOffset} registerLineRef={isOpen ? registerLineRef : undefined} />
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
  nativeLang,
  nativeLabel,
  aiSettings,
  ClickableSentence,
  SpeakButton,
  targetLangs,
  translateFree,
  levelFilter,
  speechController,
  onFullTextChange,
  autoScrollActive,
}) {
  const uiLang = nativeLang === "fa" ? "fa" : "en";
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
        return [...(sc.speakerA || []), ...(sc.speakerB || [])].some((it) =>
          it.t
            ? Object.values(it.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q))
            : it.en && it.en.toLowerCase().includes(q)
        );
      });
    });
  }, [query, dataByTopic]);

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
  // برای اسکرولِ خودکار و برای اینکه بدونیم ردیابِ خوانش (خطِ سایه) رو زیرِ
  // کدوم خط نشون بدیم.
  const [activeLine, setActiveLine] = useState(null); // {variant, i} | null
  // آفستِ کاراکتریِ کلمه‌ی در حال خوانده‌شدن، *نسبت به شروعِ همون خطِ فعال*
  // (نه کلِ fullText). فقط وقتی activeLine غیرِnull‌ه معنی داره.
  const [activeWordRelOffset, setActiveWordRelOffset] = useState(0);

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
    setActiveWordRelOffset(0);
  }, [activeTopic, openScenario]);

  useEffect(() => {
    if (!speechController) return;
    const myKey = `en-US::${fullText}`;
    const update = (state) => {
      if (!fullText || state.key !== myKey || state.status === "idle") {
        setActiveLine(null);
        setActiveWordRelOffset(0);
        return;
      }
      // getWordOffset (اگه موجود باشه) دقتِ سطحِ کلمه می‌ده؛ روی
      // speechControllerهای قدیمی‌تر که این متد رو ندارن، به همون
      // getCharOffset (سطحِ جمله) برمی‌گرده.
      const offset = speechController.getWordOffset
        ? speechController.getWordOffset()
        : speechController.getCharOffset();
      let found = lineOffsets[0] || null;
      for (const l of lineOffsets) {
        if (offset >= l.start) found = l;
        else break;
      }
      // این عدد هر بار (حتی وسطِ همون خط، کلمه‌به‌کلمه) عوض می‌شه، برخلافِ
      // activeLine که فقط سرِ عوض‌شدنِ خط آپدیت می‌شه — برای همینه که اینجا
      // بدونِ دیدوپ مستقیم set می‌شه.
      setActiveWordRelOffset(found ? Math.max(0, offset - found.start) : 0);
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
            const hit =
              scenarioHit ||
              (it.t
                ? Object.values(it.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q))
                : (it.en && it.en.toLowerCase().includes(q)) || (it.fa && it.fa.includes(query.trim())));
            if (hit) {
              results.push({ topicFa: meta.fa, icon: meta.icon, scenario: sc.scenario, item: it, variant });
            }
          });
        });
      });
    });
    return results;
  }, [query, data]);

  if (searchResults) {
    return (
      <div>
        {searchResults.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa }}>{t.noResults}</div>
        ) : (
          searchResults.map((r, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: colors.inkSoft, fontFamily: fontFa, marginBottom: 5 }}>
                {r.icon} {r.topicFa} · {r.scenario}
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
      {!activeTopic && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {filteredMeta.map((m) => (
            <TopicCard
              key={m.en}
              meta={m}
              hasData={!!dataByTopic[m.en]}
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
      )}

      {/* آکاردئون سناریوهای موضوع انتخاب‌شده */}
      {activeTopic && (
        <div style={{ paddingTop: 6 }}>
          <button onClick={() => setActiveTopic(null)} style={{ display: "flex", alignItems: "center", gap: 6, color: colors.teal, fontSize: 13, fontWeight: 700, fontFamily: fontFa, marginBottom: 14 }}>
            ← {t.backToTopics}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{TOPIC_META[activeTopic]?.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: colors.ink, fontFamily: fontFa }}>
              {TOPIC_META[activeTopic]?.fa}
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
                nativeLang={nativeLang}
                nativeLabel={nativeLabel}
                aiSettings={aiSettings}
                ClickableSentence={ClickableSentence}
                SpeakButton={SpeakButton}
                targetLangs={targetLangs}
                translateFree={translateFree}
                activeLine={activeLine}
                activeWordRelOffset={activeWordRelOffset}
                registerLineRef={registerLineRef}
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
