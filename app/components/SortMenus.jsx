// منوهای مرتب‌سازی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState } from "react";
import { colors, fontFa, fontLatin } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";
import { SAVED_STORIES_SORT_OPTIONS } from "../sort/sortHelpers.js";

// دکمه‌ی «مرتب‌سازی» + منوی کشویی — با ظاهر و رفتاری شبیه به Sort byِ
// سیستم (یه دکمه که با تپ، لیستِ گزینه‌ها رو باز می‌کنه).
export function SavedStoriesSortMenu({ sortKey, setSortKey, uiLang }) {
  const [open, setOpen] = useState(false);
  const lang = uiLang === "en" ? "en" : "fa";
  const current = SAVED_STORIES_SORT_OPTIONS.find((o) => o.key === sortKey) || SAVED_STORIES_SORT_OPTIONS[0];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: lang === "en" ? fontLatin : fontFa,
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 14,
          border: `1px solid ${colors.cardBorder}`,
          backgroundColor: "white",
          color: colors.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        ⇅ {tr("sortByLabel", lang)}: {current[lang]}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              [lang === "en" ? "left" : "right"]: 0,
              zIndex: 41,
              backgroundColor: "white",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            {SAVED_STORIES_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setSortKey(opt.key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: lang === "en" ? "left" : "right",
                  fontFamily: lang === "en" ? fontLatin : fontFa,
                  fontSize: 13,
                  fontWeight: opt.key === sortKey ? 700 : 500,
                  padding: "9px 14px",
                  border: "none",
                  backgroundColor: opt.key === sortKey ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {opt[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// دکمه‌ی «مرتب‌سازی» عمومی — دقیقاً همون ظاهر/رفتارِ SavedStoriesSortMenu
// (تبِ داستان‌ساز)، ولی به‌جای قفل‌شدن رویِ گزینه‌های اختصاصیِ داستان‌ها،
// یه آرایه‌ی options دلخواه می‌گیره — تا هم تبِ لغات/Vocabulary in
// Use/اسلنگ/علاقه‌مندی‌ها (WordList) و هم تبِ «لغات ذخیره‌شده»
// (SavedWordsPanel) بتونن با گزینه‌های خودشون همینو استفاده کنن، بدونِ
// تکرارِ کدِ منویِ کشویی.
export function GenericSortMenu({ sortKey, setSortKey, options, uiLang }) {
  const [open, setOpen] = useState(false);
  const lang = uiLang === "en" ? "en" : "fa";
  const current = options.find((o) => o.key === sortKey) || options[0];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: lang === "en" ? fontLatin : fontFa,
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 14,
          border: `1px solid ${colors.cardBorder}`,
          backgroundColor: "white",
          color: colors.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        ⇅ {tr("sortByLabel", lang)}: {current[lang] ?? current.label}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              [lang === "en" ? "left" : "right"]: 0,
              zIndex: 41,
              backgroundColor: "white",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setSortKey(opt.key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: lang === "en" ? "left" : "right",
                  fontFamily: lang === "en" ? fontLatin : fontFa,
                  fontSize: 13,
                  fontWeight: opt.key === sortKey ? 700 : 500,
                  padding: "9px 14px",
                  border: "none",
                  backgroundColor: opt.key === sortKey ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {opt[lang] ?? opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
