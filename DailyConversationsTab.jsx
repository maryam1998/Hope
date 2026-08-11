import React, { useState, useMemo, useEffect } from "react";
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
function LineTranslation({ text, langCode, knownFa, aiSettings, translateFree, SpeakButton }) {
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
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
        <span style={{ fontSize: 12, color: colors.inkSoft }}>...</span>
      ) : (
        <span style={{ fontSize: 12.5, color: translationColor, fontWeight: 800, fontFamily: fontFa }}>{value}</span>
      )}
      {value && SpeakButton && <SpeakButton text={value} code={langCode} color={translationColor} />}
    </div>
  );
}

function ConversationBox({ items, variant, label, nativeLang, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree }) {
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
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
              padding: "9px 12px",
              borderBottom: i < items.length - 1 ? `1px dashed ${colors.cardBorder}` : "none",
            }}
          >
            <div style={{ direction: "ltr", textAlign: "left", flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: mainTextColor, fontFamily: fontLatin }}>
                {ClickableSentence ? (
                  <ClickableSentence text={it.en} langCode="en" nativeLang={nativeLang} aiSettings={aiSettings} />
                ) : (
                  it.en
                )}
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
                />
              ))}
            </div>
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
            {SpeakButton && <SpeakButton text={it.en} code="en" color={colors.teal} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioAccordionItem({ sc, isOpen, onToggle, levelFilter, t, nativeLang, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree }) {
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
          <ConversationBox items={speakerA} variant="hear" label={t.youHear} nativeLang={nativeLang} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} />
          <ConversationBox items={speakerB} variant="say" label={t.youSay} nativeLang={nativeLang} aiSettings={aiSettings} ClickableSentence={ClickableSentence} SpeakButton={SpeakButton} targetLangs={targetLangs} translateFree={translateFree} />
        </div>
      )}
    </div>
  );
}

export default function DailyConversationsTab({ data, query, nativeLang, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, levelFilter }) {
  const uiLang = nativeLang === "fa" ? "fa" : "en";
  const [activeTopic, setActiveTopic] = useState(null);
  const [openScenario, setOpenScenario] = useState(null);

  const t = UI_STRINGS[uiLang] || UI_STRINGS.fa;

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
      return d.scenarios.some(
        (sc) =>
          sc.scenario.toLowerCase().includes(q) ||
          sc.speakerA.some((x) => x.en.toLowerCase().includes(q)) ||
          sc.speakerB.some((x) => x.en.toLowerCase().includes(q))
      );
    });
  }, [query, dataByTopic]);

  const activeTopicData = activeTopic ? dataByTopic[activeTopic] : null;

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
                aiSettings={aiSettings}
                ClickableSentence={ClickableSentence}
                SpeakButton={SpeakButton}
                targetLangs={targetLangs}
                translateFree={translateFree}
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
