import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
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
  ["Memories and Past Experiences", "خاطرات و تجربیات گذشته", "🕰️"]
];
const TOPIC_META = {};
TOPIC_META_LIST.forEach(([en, fa, icon]) => TOPIC_META[en] = { fa, icon });
const UI_STRINGS = {
  fa: {
    search: "جستجوی موضوع یا مکالمه...",
    comingSoon: "به‌زودی اضافه می‌شه",
    youHear: "می‌شنوی",
    youSay: "می‌گی",
    noResults: "چیزی پیدا نشد",
    backToTopics: "بازگشت به موضوعات"
  },
  en: {
    search: "Search topics or conversations...",
    comingSoon: "Coming soon",
    youHear: "You Hear",
    youSay: "You Say",
    noResults: "Nothing found",
    backToTopics: "Back to topics"
  }
};
const colors = {
  paper: "var(--c-paper)",
  paperDark: "var(--c-paperDark)",
  ink: "var(--c-ink)",
  inkSoft: "var(--c-inkSoft)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  teal: "var(--c-teal)",
  rose: "var(--c-rose)",
  cardBorder: "var(--c-cardBorder)"
};
const mainTextColor = "#0B1220";
const translationColor = "#0F5C34";
const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";
function TopicCard({ meta, hasData, onClick }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      style: {
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
        minHeight: 90
      }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 24, lineHeight: 1 } }, meta.icon),
    /* @__PURE__ */ React.createElement("span", { style: { fontFamily: fontFa, fontSize: 13, fontWeight: 700, color: colors.ink, lineHeight: 1.4 } }, meta.fa)
  );
}
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
    translateFree(text, langCode, "en", aiSettings).then((res) => {
      if (!cancelled) setValue(res || "");
    }).finally(() => {
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
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 4, direction: "ltr" } }, value && SpeakButton && /* @__PURE__ */ React.createElement(SpeakButton, { text: value, code: langCode, color: translationColor, edge: "end" }), /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 9,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "0px 5px",
          flexShrink: 0
        }
      },
      langCode.toUpperCase()
    ), loading ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.inkSoft, flex: 1 } }, "...") : ClickableSentence ? /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(
      ClickableSentence,
      {
        text: value,
        langCode,
        nativeLang,
        nativeLabel,
        aiSettings,
        color: translationColor,
        fontFamily: fontFa,
        fontWeight: 800,
        fontSize: 12.5
      }
    )) : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, color: translationColor, fontWeight: 800, fontFamily: fontFa, flex: 1 } }, value))
  );
}
function ConversationBox({ items, variant, label, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef }) {
  const isHear = variant === "hear";
  if (items.length === 0) return null;
  const accent = isHear ? colors.teal : colors.gold;
  const langCodes = (targetLangs && targetLangs.length ? targetLangs.map((l) => l.code) : ["fa"]).filter((c) => c !== "en");
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: isHear ? 10 : 14, marginBottom: 6 } }, /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        width: 16,
        height: 16,
        borderRadius: 5,
        backgroundColor: accent,
        flexShrink: 0
      }
    }
  ), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: fontFa, fontSize: 12.5, fontWeight: 800, color: colors.ink } }, label)), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        backgroundColor: "white",
        border: `1px solid ${colors.cardBorder}`,
        borderInlineStart: `3px solid ${accent}`,
        borderRadius: 12,
        overflow: "hidden"
      }
    },
    items.map((it, i) => {
      const isReadingNow = activeLine && activeLine.variant === variant && activeLine.i === i;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          ref: (el) => registerLineRef && registerLineRef(variant, i, el),
          style: {
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "9px 12px",
            borderBottom: i < items.length - 1 ? `1px dashed ${colors.cardBorder}` : "none",
            direction: "rtl",
            transition: "background-color 0.2s ease"
          }
        },
        /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              position: "absolute",
              insetInlineStart: 2,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 3,
              backgroundColor: colors.gold,
              opacity: isReadingNow ? 1 : 0,
              transition: "opacity 0.2s ease"
            }
          }
        ),
        /* @__PURE__ */ React.createElement(
          "span",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              insetInlineStart: 12,
              insetInlineEnd: 12,
              bottom: 3,
              height: 2,
              borderRadius: 2,
              backgroundColor: colors.gold,
              opacity: isReadingNow ? 0.28 : 0,
              transition: "opacity 0.25s ease",
              pointerEvents: "none"
            }
          }
        ),
        SpeakButton && /* @__PURE__ */ React.createElement(SpeakButton, { text: it.en, code: "en", color: colors.teal }),
        /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontFamily: fontLatin,
              fontSize: 10,
              fontWeight: 700,
              color: colors.ink,
              backgroundColor: colors.goldSoft,
              borderRadius: 6,
              padding: "1px 6px",
              flexShrink: 0
            }
          },
          it.level
        ),
        /* @__PURE__ */ React.createElement("div", { style: { direction: "ltr", textAlign: "left", flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 800, color: mainTextColor, fontFamily: fontLatin } }, ClickableSentence ? /* @__PURE__ */ React.createElement(ClickableSentence, { text: it.en, langCode: "en", nativeLang, aiSettings, color: mainTextColor, fontFamily: fontLatin, fontWeight: 800, fontSize: 16 }) : it.en), langCodes.map((code) => /* @__PURE__ */ React.createElement(
          LineTranslation,
          {
            key: code,
            text: it.en,
            langCode: code,
            knownFa: it.fa,
            aiSettings,
            translateFree,
            SpeakButton,
            ClickableSentence,
            nativeLang,
            nativeLabel
          }
        )))
      );
    })
  ));
}
function ScenarioAccordionItem({ sc, isOpen, onToggle, levelFilter, t, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef }) {
  const filterFn = (arr) => levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr;
  const speakerA = filterFn(sc.speakerA);
  const speakerB = filterFn(sc.speakerB);
  if (levelFilter && levelFilter !== "all" && speakerA.length === 0 && speakerB.length === 0) return null;
  return /* @__PURE__ */ React.createElement("div", { style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", backgroundColor: "white" } }, /* @__PURE__ */ React.createElement("button", { onClick: onToggle, style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontWeight: 700, fontSize: 14, color: colors.ink } }, sc.scenario), sc.context && !isOpen && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontSize: 11.5, color: colors.inkSoft, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sc.context)), /* @__PURE__ */ React.createElement(ChevronDown, { size: 18, color: colors.teal, style: { transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0, marginRight: 8 } })), isOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 15px 15px" } }, sc.context && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginBottom: 4 } }, sc.context), /* @__PURE__ */ React.createElement(ConversationBox, { items: speakerA, variant: "hear", label: t.youHear, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine: isOpen ? activeLine : null, registerLineRef: isOpen ? registerLineRef : void 0 }), /* @__PURE__ */ React.createElement(ConversationBox, { items: speakerB, variant: "say", label: t.youSay, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine: isOpen ? activeLine : null, registerLineRef: isOpen ? registerLineRef : void 0 })));
}
function DailyConversationsTab({
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
  autoScrollActive
}) {
  const uiLang = nativeLang === "fa" ? "fa" : "en";
  const [activeTopic, setActiveTopic] = useState(null);
  const [openScenario, setOpenScenario] = useState(null);
  const t = UI_STRINGS[uiLang] || UI_STRINGS.fa;
  const filterByLevel = (arr) => levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr;
  const dataByTopic = useMemo(() => {
    const map = {};
    data.forEach((tp) => map[tp.topic] = tp);
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
        (sc) => sc.scenario.toLowerCase().includes(q) || sc.speakerA.some((x) => x.en.toLowerCase().includes(q)) || sc.speakerB.some((x) => x.en.toLowerCase().includes(q))
      );
    });
  }, [query, dataByTopic]);
  const activeTopicData = activeTopic ? dataByTopic[activeTopic] : null;
  const openScenarioData = activeTopicData && openScenario != null ? activeTopicData.scenarios[openScenario] : null;
  const readableLines = useMemo(() => {
    if (!openScenarioData) return [];
    const a = filterByLevel(openScenarioData.speakerA || []).map((it, i) => ({ text: it.en, variant: "hear", i }));
    const b = filterByLevel(openScenarioData.speakerB || []).map((it, i) => ({ text: it.en, variant: "say", i }));
    return [...a, ...b];
  }, [openScenarioData, levelFilter]);
  const fullText = readableLines.map((l) => l.text).join(" ");
  const lineOffsets = useMemo(() => {
    let offset = 0;
    return readableLines.map((l) => {
      const start = offset;
      offset += l.text.length + 1;
      return { variant: l.variant, i: l.i, start, end: start + l.text.length };
    });
  }, [fullText]);
  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: "en" });
  }, [fullText]);
  const [activeLine, setActiveLine] = useState(null);
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
      setActiveLine(found ? { variant: found.variant, i: found.i } : null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [fullText, lineOffsets, speechController]);
  useEffect(() => {
    setActiveLine(null);
  }, [activeTopic, openScenario]);
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
  const searchResults = useMemo(() => {
    if (!query || !query.trim()) return null;
    const q = query.trim().toLowerCase();
    const qFa = query.trim();
    const results = [];
    data.forEach((tp) => {
      const meta = TOPIC_META[tp.topic] || { fa: tp.topic, icon: "💬" };
      (tp.scenarios || []).forEach((sc) => {
        const scenarioHit = sc.scenario && sc.scenario.toLowerCase().includes(q);
        [["speakerA", "hear"], ["speakerB", "say"]].forEach(([key, variant]) => {
          (sc[key] || []).forEach((it) => {
            const hit = scenarioHit || it.en && it.en.toLowerCase().includes(q) || it.fa && it.fa.includes(qFa);
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
    return /* @__PURE__ */ React.createElement("div", null, searchResults.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.noResults) : searchResults.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: colors.inkSoft, fontFamily: fontFa, marginBottom: 5 } }, r.icon, " ", r.topicFa, " · ", r.scenario), /* @__PURE__ */ React.createElement(
      ConversationBox,
      {
        items: [r.item],
        variant: r.variant,
        label: r.variant === "hear" ? t.youHear : t.youSay,
        nativeLang,
        aiSettings,
        ClickableSentence,
        SpeakButton,
        targetLangs,
        translateFree
      }
    ))));
  }
  return /* @__PURE__ */ React.createElement("div", null, !activeTopic && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } }, filteredMeta.map((m) => /* @__PURE__ */ React.createElement(
    TopicCard,
    {
      key: m.en,
      meta: m,
      hasData: !!dataByTopic[m.en],
      onClick: () => {
        setActiveTopic(m.en);
        setOpenScenario(0);
      }
    }
  )), filteredMeta.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1", textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.noResults)), activeTopic && /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveTopic(null), style: { display: "flex", alignItems: "center", gap: 6, color: colors.teal, fontSize: 13, fontWeight: 700, fontFamily: fontFa, marginBottom: 14 } }, "← ", t.backToTopics), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, TOPIC_META[activeTopic]?.icon), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 16, color: colors.ink, fontFamily: fontFa } }, TOPIC_META[activeTopic]?.fa)), activeTopicData ? activeTopicData.scenarios.map((sc, i) => /* @__PURE__ */ React.createElement(
    ScenarioAccordionItem,
    {
      key: i,
      sc,
      t,
      levelFilter,
      isOpen: openScenario === i,
      onToggle: () => setOpenScenario(openScenario === i ? null : i),
      nativeLang,
      nativeLabel,
      aiSettings,
      ClickableSentence,
      SpeakButton,
      targetLangs,
      translateFree,
      activeLine,
      registerLineRef
    }
  )) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.comingSoon)));
}
export {
  DailyConversationsTab as default
};
