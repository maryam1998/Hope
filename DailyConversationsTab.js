import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
const TOPIC_META_LIST = [
  ["Greetings and Small Talk", "\u0627\u062D\u0648\u0627\u0644\u200C\u067E\u0631\u0633\u06CC \u0648 \u06AF\u0641\u062A\u06AF\u0648\u06CC \u06A9\u0648\u062A\u0627\u0647", "\u{1F44B}"],
  ["Introducing People", "\u0645\u0639\u0631\u0641\u06CC \u0627\u0641\u0631\u0627\u062F", "\u{1F91D}"],
  ["Visiting an Old Friend", "\u062F\u06CC\u062F\u0627\u0631 \u062F\u0648\u0633\u062A \u0642\u062F\u06CC\u0645\u06CC", "\u{1F3E0}"],
  ["Getting Acquainted (Personal Questions)", "\u0622\u0634\u0646\u0627\u06CC\u06CC (\u0633\u0648\u0627\u0644\u0627\u062A \u0634\u062E\u0635\u06CC)", "\u{1F4AC}"],
  ["Invitations", "\u062F\u0639\u0648\u062A\u200C\u06A9\u0631\u062F\u0646", "\u2709\uFE0F"],
  ["Accepting or Refusing an Invitation", "\u067E\u0630\u06CC\u0631\u0641\u062A\u0646 \u06CC\u0627 \u0631\u062F \u06A9\u0631\u062F\u0646 \u062F\u0639\u0648\u062A", "\u2705"],
  ["Saying Goodbye", "\u062E\u062F\u0627\u062D\u0627\u0641\u0638\u06CC", "\u{1F6B6}"],
  ["Telephone Conversation", "\u0645\u06A9\u0627\u0644\u0645\u0647 \u062A\u0644\u0641\u0646\u06CC", "\u260E\uFE0F"],
  ["Transportation", "\u062D\u0645\u0644\u200C\u0648\u0646\u0642\u0644", "\u{1F68C}"],
  ["Gas Station and Auto Repair", "\u067E\u0645\u067E \u0628\u0646\u0632\u06CC\u0646 \u0648 \u062A\u0639\u0645\u06CC\u0631 \u0645\u0627\u0634\u06CC\u0646", "\u26FD"],
  ["Weather and Seasons", "\u0622\u0628\u200C\u0648\u0647\u0648\u0627 \u0648 \u0641\u0635\u0644\u200C\u0647\u0627", "\u2600\uFE0F"],
  ["At a Restaurant / Caf\xE9", "\u0631\u0633\u062A\u0648\u0631\u0627\u0646 \u0648 \u06A9\u0627\u0641\u0647", "\u{1F37D}\uFE0F"],
  ["Shopping (Clothes and General)", "\u062E\u0631\u06CC\u062F (\u0644\u0628\u0627\u0633 \u0648 \u0639\u0645\u0648\u0645\u06CC)", "\u{1F6CD}\uFE0F"],
  ["At a Hotel", "\u062F\u0631 \u0647\u062A\u0644", "\u{1F3E8}"],
  ["Health and Doctor's Visit", "\u0633\u0644\u0627\u0645\u062A\u06CC \u0648 \u0648\u06CC\u0632\u06CC\u062A \u062F\u06A9\u062A\u0631", "\u{1FA7A}"],
  ["Asking for Directions / Landmarks", "\u067E\u0631\u0633\u06CC\u062F\u0646 \u0622\u062F\u0631\u0633 \u0648 \u0646\u0634\u0627\u0646\u06CC", "\u{1F9ED}"],
  ["Plans and Free Time (Hobbies)", "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627 \u0648 \u0627\u0648\u0642\u0627\u062A \u0641\u0631\u0627\u063A\u062A", "\u{1F3A8}"],
  ["Work and Workplace", "\u06A9\u0627\u0631 \u0648 \u0645\u062D\u06CC\u0637 \u06A9\u0627\u0631", "\u{1F4BC}"],
  ["Time and Appointments", "\u0632\u0645\u0627\u0646 \u0648 \u0642\u0631\u0627\u0631 \u0645\u0644\u0627\u0642\u0627\u062A", "\u23F0"],
  ["Expressing Opinions and Feelings", "\u0627\u0628\u0631\u0627\u0632 \u0646\u0638\u0631 \u0648 \u0627\u062D\u0633\u0627\u0633\u0627\u062A", "\u2764\uFE0F"],
  ["Asking for Help and Clarification", "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0645\u06A9 \u0648 \u062A\u0648\u0636\u06CC\u062D", "\u{1F64B}"],
  ["Politeness and Compliments", "\u0627\u062F\u0628 \u0648 \u062A\u0639\u0627\u0631\u0641\u0627\u062A", "\u{1F64F}"],
  ["Travel and Experiences", "\u0633\u0641\u0631 \u0648 \u062A\u062C\u0631\u0628\u06CC\u0627\u062A", "\u2708\uFE0F"],
  ["Apologies and Forgiveness", "\u0639\u0630\u0631\u062E\u0648\u0627\u0647\u06CC \u0648 \u0628\u062E\u0634\u0634", "\u{1F647}"],
  ["Family and Cultural Questions", "\u062E\u0627\u0646\u0648\u0627\u062F\u0647 \u0648 \u0633\u0648\u0627\u0644\u0627\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC", "\u{1F46A}"],
  ["Sports and Fitness", "\u0648\u0631\u0632\u0634 \u0648 \u062A\u0646\u0627\u0633\u0628 \u0627\u0646\u062F\u0627\u0645", "\u{1F3C3}"],
  ["Technology and Communication", "\u0641\u0646\u0627\u0648\u0631\u06CC \u0648 \u0627\u0631\u062A\u0628\u0627\u0637\u0627\u062A", "\u{1F4BB}"],
  ["Holidays and Celebrations", "\u062A\u0639\u0637\u06CC\u0644\u0627\u062A \u0648 \u062C\u0634\u0646\u200C\u0647\u0627", "\u{1F389}"],
  ["Pets and Animals", "\u062D\u06CC\u0648\u0627\u0646\u0627\u062A \u062E\u0627\u0646\u06AF\u06CC", "\u{1F43E}"],
  ["Learning a Language", "\u06CC\u0627\u062F\u06AF\u06CC\u0631\u06CC \u0632\u0628\u0627\u0646", "\u{1F5E3}\uFE0F"],
  ["Emergency Situations", "\u0645\u0648\u0642\u0639\u06CC\u062A\u200C\u0647\u0627\u06CC \u0627\u0636\u0637\u0631\u0627\u0631\u06CC", "\u{1F6A8}"],
  ["City Attractions and Sightseeing", "\u062C\u0627\u0630\u0628\u0647\u200C\u0647\u0627\u06CC \u0634\u0647\u0631\u06CC \u0648 \u06AF\u0631\u062F\u0634", "\u{1F3D9}\uFE0F"],
  ["Schools and Education", "\u0645\u062F\u0631\u0633\u0647 \u0648 \u0622\u0645\u0648\u0632\u0634", "\u{1F3EB}"],
  ["Money and Expenses", "\u067E\u0648\u0644 \u0648 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627", "\u{1F4B0}"],
  ["Books and Reading", "\u06A9\u062A\u0627\u0628 \u0648 \u0645\u0637\u0627\u0644\u0639\u0647", "\u{1F4DA}"],
  ["Environment and Nature", "\u0645\u062D\u06CC\u0637\u200C\u0632\u06CC\u0633\u062A \u0648 \u0637\u0628\u06CC\u0639\u062A", "\u{1F33F}"],
  ["Cooking and Recipes", "\u0622\u0634\u067E\u0632\u06CC \u0648 \u062F\u0633\u062A\u0648\u0631 \u067E\u062E\u062A", "\u{1F373}"],
  ["Movies and TV Series", "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644", "\u{1F3AC}"],
  ["Music", "\u0645\u0648\u0633\u06CC\u0642\u06CC", "\u{1F3B5}"],
  ["Banking and Financial Services", "\u0628\u0627\u0646\u06A9 \u0648 \u062E\u062F\u0645\u0627\u062A \u0645\u0627\u0644\u06CC", "\u{1F3E6}"],
  ["Post Office and Mail", "\u0627\u062F\u0627\u0631\u0647 \u067E\u0633\u062A", "\u{1F4EE}"],
  ["Neighbors and Community", "\u0647\u0645\u0633\u0627\u06CC\u0647\u200C\u0647\u0627 \u0648 \u062C\u0627\u0645\u0639\u0647", "\u{1F3D8}\uFE0F"],
  ["Future Plans and Dreams", "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647 \u0648 \u0631\u0648\u06CC\u0627\u0647\u0627", "\u{1F305}"],
  ["Memories and Past Experiences", "\u062E\u0627\u0637\u0631\u0627\u062A \u0648 \u062A\u062C\u0631\u0628\u06CC\u0627\u062A \u06AF\u0630\u0634\u062A\u0647", "\u{1F570}\uFE0F"]
];
const TOPIC_META = {};
TOPIC_META_LIST.forEach(([en, fa, icon]) => TOPIC_META[en] = { fa, icon });
const UI_STRINGS = {
  fa: {
    search: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0645\u0648\u0636\u0648\u0639 \u06CC\u0627 \u0645\u06A9\u0627\u0644\u0645\u0647...",
    comingSoon: "\u0628\u0647\u200C\u0632\u0648\u062F\u06CC \u0627\u0636\u0627\u0641\u0647 \u0645\u06CC\u200C\u0634\u0647",
    youHear: "\u0645\u06CC\u200C\u0634\u0646\u0648\u06CC",
    youSay: "\u0645\u06CC\u200C\u06AF\u06CC",
    noResults: "\u0686\u06CC\u0632\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F",
    backToTopics: "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0645\u0648\u0636\u0648\u0639\u0627\u062A"
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
const READ_MARKER_COLOR = "#FFD54F";
const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";
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
  uk: "uk-UA"
};
function TopicCard({ meta, hasData, onClick, uiLang, isRead, onToggleRead, readDoneColor }) {
  const label = uiLang === "fa" ? meta.fa : meta.en;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      dir: uiLang === "fa" ? "rtl" : "ltr",
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "14px 12px 12px",
        borderRadius: 14,
        textAlign: uiLang === "fa" ? "right" : "left",
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: "white",
        opacity: hasData ? 1 : 0.55,
        minHeight: 90
      }
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (ev) => {
          ev.stopPropagation();
          onToggleRead && onToggleRead();
        },
        "aria-label": uiLang === "fa" ? "\u0639\u0644\u0627\u0645\u062A\u200C\u0632\u062F\u0646 \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \u062E\u0648\u0627\u0646\u062F\u0647\u200C\u0634\u062F\u0647" : "Toggle read",
        style: {
          position: "absolute",
          top: 8,
          [uiLang === "fa" ? "left" : "right"]: 8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${isRead ? readDoneColor : colors.cardBorder}`,
          backgroundColor: isRead ? readDoneColor : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      isRead && /* @__PURE__ */ React.createElement(Check, { size: 10, color: "white", strokeWidth: 3 })
    ),
    /* @__PURE__ */ React.createElement("button", { onClick, style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, width: "100%" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 24, lineHeight: 1 } }, meta.icon), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: uiLang === "fa" ? fontFa : fontLatin, fontSize: 13, fontWeight: 700, color: colors.ink, lineHeight: 1.4 } }, label))
  );
}
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
    translateFree(text, langCode, "en", aiSettings).then((res) => {
      if (!cancelled) setValue(res || "");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [text, langCode, knownFa]);
  useEffect(() => {
    if (!loading && value && onResolved && variant != null && i != null) {
      onResolved(langCode, variant, i, value);
    }
  }, [loading, value, langCode, variant, i]);
  const rowRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !isActiveLine) return;
    if (rowRef.current && rowRef.current.scrollIntoView) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, isActiveLine]);
  if (!value && !loading) return null;
  const highlightStyle = {
    backgroundColor: isActiveLine ? highlightColor || READ_MARKER_COLOR : "transparent",
    borderRadius: 5,
    padding: isActiveLine ? "2px 4px" : "2px 0",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
    transition: "background-color 0.35s ease"
  };
  const myOffset = lineOffsets && lineOffsets.find((o) => o.variant === variant && o.i === i);
  return (
    // طبق درخواست: این ردیف هم مثل متنِ اصلی چپ‌به‌راست نوشته می‌شه، ولی
    // بلندگو طبق قانونِ کلیِ خودِ SpeakButton («همیشه سمت راستِ ردیف») باید
    // edge="end" بگیره — وگرنه چون ردیف رو ltr کردیم ولی این پراپ رو ندادیم،
    // بلندگو با فرضِ پیش‌فرضِ راست‌چین می‌رفت سمت چپ (دقیقاً برعکسِ خواسته).
    /* @__PURE__ */ React.createElement("div", { ref: rowRef, style: { display: "flex", alignItems: "center", gap: 6, marginTop: 4, direction: "ltr" } }, value && SpeakButton && /* @__PURE__ */ React.createElement(
      SpeakButton,
      {
        text: value,
        code: langCode,
        color: translationColor,
        edge: "end",
        fullText,
        startOffset: myOffset ? myOffset.start : void 0
      }
    ), /* @__PURE__ */ React.createElement(
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
    ), loading ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.inkSoft, flex: 1 } }, "...") : ClickableSentence ? /* @__PURE__ */ React.createElement("span", { style: { flex: 1, ...highlightStyle } }, /* @__PURE__ */ React.createElement(
      ClickableSentence,
      {
        text: value,
        langCode,
        nativeLang,
        nativeLabel,
        aiSettings,
        color: translationColor,
        fontFamily: fontFa,
        fontWeight: 900,
        fontSize: 13
      }
    )) : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: translationColor, fontWeight: 900, fontFamily: fontFa, flex: 1, ...highlightStyle } }, value))
  );
}
function ConversationBox({ items, variant, label, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine, onResolveTranslation }) {
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
      const isLineActive = activeLine && activeLine.variant === variant && activeLine.i === i;
      const lineOffset = lineOffsets && lineOffsets.find((l) => l.variant === variant && l.i === i);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          ref: (el) => registerLineRef && registerLineRef(variant, i, el),
          style: {
            position: "relative",
            padding: "9px 12px",
            borderBottom: i < items.length - 1 ? `1px dashed ${colors.cardBorder}` : "none"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 8, direction: "rtl" } }, SpeakButton && /* @__PURE__ */ React.createElement(
          SpeakButton,
          {
            text: it.en,
            code: "en",
            color: colors.teal,
            fullText,
            startOffset: lineOffset ? lineOffset.start : void 0
          }
        ), /* @__PURE__ */ React.createElement(
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
        ), /* @__PURE__ */ React.createElement("div", { style: { direction: "ltr", textAlign: "left", flex: 1, fontSize: 16, fontWeight: 800, color: mainTextColor, fontFamily: fontLatin } }, /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              backgroundColor: isLineActive ? highlightColor || READ_MARKER_COLOR : "transparent",
              borderRadius: 5,
              padding: isLineActive ? "2px 4px" : "2px 0",
              WebkitBoxDecorationBreak: "clone",
              boxDecorationBreak: "clone",
              transition: "background-color 0.35s ease"
            }
          },
          ClickableSentence ? /* @__PURE__ */ React.createElement(ClickableSentence, { text: it.en, langCode: "en", nativeLang, aiSettings, color: mainTextColor, fontFamily: fontLatin, fontWeight: 800, fontSize: 16 }) : it.en
        ))),
        langCodes.map((code) => {
          const info = translationTextInfo && translationTextInfo[code];
          return /* @__PURE__ */ React.createElement(
            LineTranslation,
            {
              key: code,
              text: it.en,
              langCode: code,
              variant,
              i,
              knownFa: it.fa,
              aiSettings,
              translateFree,
              SpeakButton,
              ClickableSentence,
              nativeLang,
              nativeLabel,
              autoScrollActive,
              highlightColor,
              fullText: info ? info.fullText : "",
              lineOffsets: info ? info.lineOffsets : [],
              isActiveLine: !!(activeTranslationLine && activeTranslationLine.langCode === code && activeTranslationLine.variant === variant && activeTranslationLine.i === i),
              onResolved: onResolveTranslation
            }
          );
        })
      );
    })
  ));
}
function ScenarioAccordionItem({ sc, isOpen, onToggle, levelFilter, t, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine, registerLineRef, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine, onResolveTranslation, isRead, onToggleRead, readDoneColor }) {
  const filterFn = (arr) => levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr;
  const speakerA = filterFn(sc.speakerA);
  const speakerB = filterFn(sc.speakerB);
  if (levelFilter && levelFilter !== "all" && speakerA.length === 0 && speakerB.length === 0) return null;
  return /* @__PURE__ */ React.createElement("div", { style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", backgroundColor: "white" } }, /* @__PURE__ */ React.createElement("button", { onClick: onToggle, style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center", style: { display: "flex", alignItems: "center", gap: 8, flex: 1 } }, /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick: (ev) => {
        ev.stopPropagation();
        onToggleRead && onToggleRead();
      },
      "aria-label": t.toggleRead || "Toggle read",
      style: {
        flexShrink: 0,
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${isRead ? readDoneColor : colors.cardBorder}`,
        backgroundColor: isRead ? readDoneColor : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    },
    isRead && /* @__PURE__ */ React.createElement(Check, { size: 10, color: "white", strokeWidth: 3 })
  ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontWeight: 700, fontSize: 14, color: colors.ink } }, sc.scenario), sc.context && !isOpen && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontSize: 11.5, color: colors.inkSoft, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sc.context))), /* @__PURE__ */ React.createElement(ChevronDown, { size: 18, color: colors.teal, style: { transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0, marginRight: 8 } })), isOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 15px 15px" } }, sc.context && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginBottom: 4 } }, sc.context), /* @__PURE__ */ React.createElement(ConversationBox, { items: speakerA, variant: "hear", label: t.youHear, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine: isOpen ? activeLine : null, registerLineRef: isOpen ? registerLineRef : void 0, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine: isOpen ? activeTranslationLine : null, onResolveTranslation }), /* @__PURE__ */ React.createElement(ConversationBox, { items: speakerB, variant: "say", label: t.youSay, nativeLang, nativeLabel, aiSettings, ClickableSentence, SpeakButton, targetLangs, translateFree, activeLine: isOpen ? activeLine : null, registerLineRef: isOpen ? registerLineRef : void 0, highlightColor, fullText, lineOffsets, autoScrollActive, translationTextInfo, activeTranslationLine: isOpen ? activeTranslationLine : null, onResolveTranslation })));
}
let lastConversationsNav = { topic: null, scenario: null };
function DailyConversationsTab({
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
  readDoneColor
}) {
  const uiLang = uiLangProp || (nativeLang === "fa" ? "fa" : "en");
  const [activeTopic, setActiveTopic] = useState(() => lastConversationsNav.topic);
  const [openScenario, setOpenScenario] = useState(() => lastConversationsNav.scenario);
  useEffect(() => {
    lastConversationsNav = { topic: activeTopic, scenario: openScenario };
  }, [activeTopic, openScenario]);
  const t = UI_STRINGS[uiLang] || UI_STRINGS.fa;
  const filterByLevel = (arr) => levelFilter && levelFilter !== "all" ? arr.filter((x) => x.level === levelFilter) : arr;
  const dataByTopic = useMemo(() => {
    const map = {};
    data.forEach((tp) => map[tp.topic] = tp);
    return map;
  }, [data]);
  const [extraLangMaps, setExtraLangMaps] = useState({});
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
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, targetLangs, getCachedTranslationMap]);
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
        return [...sc.speakerA || [], ...sc.speakerB || []].some((it) => itemMatchesQuery(it, q, query.trim()));
      });
    });
  }, [query, dataByTopic, extraLangMaps]);
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
    return speechController.subscribe(update);
  }, [fullText, lineOffsets, speechController]);
  const [translationValues, setTranslationValues] = useState({});
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
        offset += val.length + 1;
        offsets.push({ variant: l.variant, i: l.i, start, end: start + val.length });
      });
      info[code] = { fullText: parts.join(" "), lineOffsets: offsets };
    });
    return info;
  }, [targetLangCodes, translationValues, readableLines]);
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
  const searchResults = useMemo(() => {
    if (!query || !query.trim()) return null;
    const q = query.trim().toLowerCase();
    const results = [];
    data.forEach((tp) => {
      const meta = TOPIC_META[tp.topic] || { fa: tp.topic, icon: "\u{1F4AC}" };
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
  }, [query, data, extraLangMaps, uiLang]);
  if (searchResults) {
    return /* @__PURE__ */ React.createElement("div", null, searchResults.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.noResults) : searchResults.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: colors.inkSoft, fontFamily: uiLang === "fa" ? fontFa : fontLatin, marginBottom: 5 } }, r.icon, " ", r.topicLabel, " \xB7 ", r.scenario), /* @__PURE__ */ React.createElement(
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
        translateFree,
        speechController,
        autoScrollActive,
        highlightColor
      }
    ))));
  }
  return /* @__PURE__ */ React.createElement("div", null, !activeTopic && (() => {
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, total > 0 && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex flex-col gap-2 p-3 rounded-lg",
        style: { backgroundColor: colors.paperDark, border: `1px solid ${colors.cardBorder}`, marginBottom: 10 }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap", style: { direction: uiLang === "fa" ? "rtl" : "ltr" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: colors.ink, fontFamily: uiLang === "fa" ? fontFa : fontLatin } }, uiLang === "fa" ? "\u0645\u0648\u0636\u0648\u0639\u200C\u0647\u0627" : "Topics"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: 1,
          max: total,
          value: topicRangeInput.from,
          placeholder: "1",
          onChange: (ev) => setTopicRangeInput((prev) => ({ ...prev, from: ev.target.value })),
          onBlur: () => {
            if (topicRangeInput.from !== "") setTopicRangeInput((prev) => ({ ...prev, from: String(clampedFrom) }));
          },
          style: { width: 56, padding: "4px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, fontSize: 13, textAlign: "center" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: colors.inkSoft } }, uiLang === "fa" ? "\u062A\u0627" : "to"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: 1,
          max: total,
          value: topicRangeInput.to,
          placeholder: String(defaultTo),
          onChange: (ev) => setTopicRangeInput((prev) => ({ ...prev, to: ev.target.value })),
          onBlur: () => {
            if (topicRangeInput.to !== "") setTopicRangeInput((prev) => ({ ...prev, to: String(clampedTo) }));
          },
          style: { width: 56, padding: "4px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, fontSize: 13, textAlign: "center" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.inkSoft } }, uiLang === "fa" ? `\u0627\u0632 \u0645\u062C\u0645\u0648\u0639 ${total.toLocaleString("fa-IR")}` : `of ${total}`)),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap", style: { direction: uiLang === "fa" ? "rtl" : "ltr" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.teal, fontWeight: 700 } }, uiLang === "fa" ? `\u062E\u0648\u0627\u0646\u062F\u0647\u200C\u0634\u062F\u0647: ${readCountInRange.toLocaleString("fa-IR")} \u0627\u0632 ${visibleMeta.length.toLocaleString("fa-IR")} \u062F\u0631 \u0627\u06CC\u0646 \u0628\u0627\u0632\u0647 \xB7 ${readCountTotal.toLocaleString("fa-IR")} \u0627\u0632 ${total.toLocaleString("fa-IR")} \u06A9\u0644` : `Read: ${readCountInRange}/${visibleMeta.length} in range \xB7 ${readCountTotal}/${total} total`), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => markTopicRangeRead(visibleMeta, true),
          style: { fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "2px 8px" }
        },
        uiLang === "fa" ? "\u0639\u0644\u0627\u0645\u062A\u200C\u06AF\u0630\u0627\u0631\u06CC \u0647\u0645\u0647 \u0628\u0647 \u062E\u0648\u0627\u0646\u062F\u0647\u200C\u0634\u062F\u0647" : "Mark range read"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => markTopicRangeRead(visibleMeta, false),
          style: { fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "2px 8px" }
        },
        uiLang === "fa" ? "\u067E\u0627\u06A9\u200C\u06A9\u0631\u062F\u0646 \u0639\u0644\u0627\u0645\u062A \u0627\u06CC\u0646 \u0628\u0627\u0632\u0647" : "Clear range"
      ))
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } }, visibleMeta.map((m) => /* @__PURE__ */ React.createElement(
      TopicCard,
      {
        key: m.en,
        meta: m,
        uiLang,
        hasData: !!dataByTopic[m.en],
        isRead: topicReadIds.has(m.en),
        onToggleRead: () => toggleTopicRead(m.en),
        readDoneColor,
        onClick: () => {
          setActiveTopic(m.en);
          setOpenScenario(0);
        }
      }
    )), filteredMeta.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1", textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.noResults)));
  })(), activeTopic && /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveTopic(null), style: { display: "flex", alignItems: "center", gap: 6, color: colors.teal, fontSize: 13, fontWeight: 700, fontFamily: uiLang === "fa" ? fontFa : fontLatin, marginBottom: 14 } }, "\u2190 ", t.backToTopics), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, TOPIC_META[activeTopic]?.icon), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 16, color: colors.ink, fontFamily: uiLang === "fa" ? fontFa : fontLatin } }, uiLang === "fa" ? TOPIC_META[activeTopic]?.fa : activeTopic)), activeTopicData ? activeTopicData.scenarios.map((sc, i) => /* @__PURE__ */ React.createElement(
    ScenarioAccordionItem,
    {
      key: i,
      sc,
      t,
      levelFilter,
      isOpen: openScenario === i,
      onToggle: () => setOpenScenario(openScenario === i ? null : i),
      isRead: scenarioReadIds.has(`${activeTopic}::${i}`),
      onToggleRead: () => toggleScenarioRead(activeTopic, i),
      readDoneColor,
      nativeLang,
      nativeLabel,
      aiSettings,
      ClickableSentence,
      SpeakButton,
      targetLangs,
      translateFree,
      activeLine,
      registerLineRef,
      highlightColor,
      fullText,
      lineOffsets,
      autoScrollActive,
      translationTextInfo,
      activeTranslationLine,
      onResolveTranslation: reportTranslation
    }
  )) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.inkSoft, padding: 30, fontSize: 13.5, fontFamily: fontFa } }, t.comingSoon)));
}
export {
  DailyConversationsTab as default
};
