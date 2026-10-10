// انتخاب/نمایش/فیلتر سطح
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState } from "react";
import { LEVELS } from "../../constants/levels.js";
import { colors, fontFa, fontLatin } from "../../ui/theme.js";
import { setPersonalWordLevel } from "../../words/savedStoryWords.js";

// انتخابِ سطحِ لغتِ شخصی (A1..C2) — با زدن روی بج باز می‌شه.
export function PersonalLevelPicker({ word, level, uiLang }) {
  const [open, setOpen] = useState(false);
  const pick = (lv) => {
    setPersonalWordLevel(word, lv);
    setOpen(false);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={uiLang === "en" ? "Set level" : "تعیین سطح"}
        style={{
          fontFamily: fontLatin,
          fontSize: 10,
          fontWeight: 700,
          color: colors.ink,
          backgroundColor: level ? colors.goldSoft : "transparent",
          border: level ? "none" : `1px dashed ${colors.cardBorder}`,
          borderRadius: 6,
          padding: "1px 6px",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        {level || (uiLang === "en" ? "level?" : "سطح؟")}
      </button>
      {open && (
        <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap" }}>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(lv);
              }}
              style={{
                fontFamily: fontLatin,
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 6,
                cursor: "pointer",
                border: `1px solid ${lv === level ? colors.ink : colors.cardBorder}`,
                backgroundColor: lv === level ? colors.ink : "white",
                color: lv === level ? colors.paper : colors.ink,
              }}
            >
              {lv}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
export function LevelBadge({ level }) {
  return (
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
      {level}
    </span>
  );
}
export function LevelFilterRow({ levelFilter, setLevelFilter, uiLang }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => setLevelFilter("all")}
        style={{
          fontFamily: uiLang === "en" ? fontLatin : fontFa,
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 16px",
          borderRadius: 999,
          border: `1px solid ${levelFilter === "all" ? colors.ink : colors.cardBorder}`,
          backgroundColor: levelFilter === "all" ? colors.ink : "white",
          color: levelFilter === "all" ? colors.paper : colors.inkSoft,
          flexShrink: 0,
        }}
      >
        {uiLang === "en" ? "All levels" : "همه سطح‌ها"}
      </button>
      {LEVELS.map((lvl) => (
        <button
          key={lvl}
          onClick={() => setLevelFilter(lvl)}
          style={{
            fontFamily: fontLatin,
            fontSize: 13,
            fontWeight: 600,
            padding: "9px 16px",
            borderRadius: 999,
            border: `1px solid ${levelFilter === lvl ? colors.ink : colors.cardBorder}`,
            backgroundColor: levelFilter === lvl ? colors.ink : "white",
            color: levelFilter === lvl ? colors.paper : colors.inkSoft,
            flexShrink: 0,
          }}
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}
// چیپ‌های فیلترِ سطح برای جعبه‌ی لایتنر: «همه» + جعبه‌های ۱ تا ۴ (جعبه‌ی ۵
// یعنی «بلد شدی»، پس اصلاً تو مرور نمی‌آد). هر چیپ تعدادِ موردهای همون سطح
// رو هم نشون می‌ده.
export function LevelFilterChips({ levelFilter, setLevelFilter, levelCounts, uiLang }) {
  const chips = [
    { key: "all", label: uiLang === "en" ? "All" : "همه", count: levelCounts.reduce((a, b) => a + b, 0) },
    ...[1, 2, 3, 4].map((lvl) => ({ key: lvl, label: uiLang === "en" ? `Box ${lvl}` : `جعبه‌ی ${lvl}`, count: levelCounts[lvl - 1] })),
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => setLevelFilter(c.key)}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 20,
            border: `1px solid ${levelFilter === c.key ? colors.gold : colors.cardBorder}`,
            backgroundColor: levelFilter === c.key ? colors.gold : "transparent",
            color: levelFilter === c.key ? "white" : colors.inkSoft,
          }}
        >
          {c.label} ({c.count})
        </button>
      ))}
    </div>
  );
}
