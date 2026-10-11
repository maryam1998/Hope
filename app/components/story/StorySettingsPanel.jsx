import React from "react";
import { useTranslation } from "react-i18next";
import { CONTENT_TYPES, STORY_LENGTHS } from "../../story/storyText.js";
import { uiLanguageName } from "../../constants/languages.js";
import { LEVELS } from "../../constants/levels.js";
import { colors, fontFa, fontLatin } from "../../ui/theme.js";
import { tr } from "../../ui/uiStrings.js";

export function StorySettingsPanel({
  contentType,
  setContentType,
  setStoryLang,
  setStoryLength,
  setStoryLevel,
  storyLang,
  storyLangLabel,
  storyLangOptions,
  storyLength,
  storyLevel,
  uiLang,
}) {
  const { t, i18n } = useTranslation();
  const curLang = String(i18n.language || "fa").split("-")[0];
  return (
      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <p style={{ fontWeight: 700, marginBottom: 10, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLangLevelSection", uiLang)}</p>
        {storyLangOptions.length > 1 ? (
          <>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              {t("story_lang_pick_hint")}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {storyLangOptions.map((code) => (
                <button
                  key={code}
                  onClick={() => setStoryLang(code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    border: `1px solid ${storyLang === code ? colors.gold : colors.cardBorder}`,
                    backgroundColor: storyLang === code ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {uiLanguageName(code, curLang)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 10 }}>
            {t("story_lang_single_note", { lang: uiLanguageName(storyLang, curLang) })}
          </p>
        )}
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "0 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLevelLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setStoryLevel(lv)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: `1px solid ${storyLevel === lv ? colors.teal : colors.cardBorder}`,
                backgroundColor: storyLevel === lv ? colors.teal : "white",
                color: storyLevel === lv ? "white" : colors.ink,
              }}
            >
              {lv}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyContentTypeLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.key}
              onClick={() => setContentType(c.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${contentType === c.key ? colors.rose : colors.cardBorder}`,
                backgroundColor: contentType === c.key ? colors.rose : "white",
                color: contentType === c.key ? "white" : colors.ink,
              }}
            >
              {t(`story_content_${c.key}`)}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLengthLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {STORY_LENGTHS.map((l) => (
            <button
              key={l.key}
              onClick={() => setStoryLength(l.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${storyLength === l.key ? colors.gold : colors.cardBorder}`,
                backgroundColor: storyLength === l.key ? colors.gold : "white",
                color: storyLength === l.key ? "white" : colors.ink,
              }}
            >
              {t(`story_length_${l.key}`)}
            </button>
          ))}
        </div>

      </div>
  );
}
