import React, { useState, useEffect, useCallback } from "react";
import { Plus, Minus } from "lucide-react";

/**
 * RangeSliderFilter Component (نسخه‌ی ورودیِ عددی)
 *
 * قبلاً این کامپوننت یک اسلایدرِ کشیدنی (pointer drag) بود که چون هر پیکسل
 * جابه‌جایی یک onFromChange/onToChange صدا می‌زد و در اپ اصلی این باعث
 * فیلتر/اسلایس‌شدنِ دوباره‌ی کل لیست در هر فریم می‌شد، روی لیست‌های بزرگ
 * هنگ می‌کرد. این نسخه به‌جای کشیدن، از دو ورودیِ عددی («از» / «تا»)
 * استفاده می‌کند: مقدار فقط وقتی به بیرون فرستاده می‌شود که کاربر تایپ را
 * تمام کرده (blur یا Enter)، نه در حین هر keystroke.
 *
 * Props (بدون تغییر نسبت به نسخه‌ی قبلی، سازگار با همه‌ی جاهایی که استفاده شده):
 * - min: عدد کمینه
 * - max: حداکثر عدد
 * - from: مقدار شروع
 * - to: مقدار پایان
 * - onFromChange: تابع تغییر مقدار شروع
 * - onToChange: تابع تغییر مقدار پایان
 * - readCount: تعداد خوانده‌شده‌ها در این بازه
 * - totalInRange: کل اعداد در این بازه
 * - label: برچسب (مثلاً "داستان‌ها")
 * - uiLang: زبان UI ("fa" یا "en")
 * - colors: پالت رنگ‌ها
 */
export default function RangeSliderFilter({
  min = 1,
  max = 100,
  from = 1,
  to = 10,
  onFromChange,
  onToChange,
  readCount = 0,
  totalInRange = 0,
  readCountTotal = 0,
  label = "بازه",
  uiLang = "fa",
  colors = {},
}) {
  const isRTL = uiLang === "fa";

  // مقادیرِ محلیِ درحالِ‌تایپ — تا وقتی commit نشده‌اند، به بیرون فرستاده نمی‌شوند
  const [fromText, setFromText] = useState(String(from));
  const [toText, setToText] = useState(String(to));

  // اگر مقدارِ واقعی از بیرون تغییر کند (مثلاً با دکمه‌های +/- یا clamp شدن)،
  // ورودی‌های محلی هم همگام شوند — به‌شرطی که کاربر همین لحظه در حالِ تایپ نباشد.
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);

  useEffect(() => {
    if (!fromFocused) setFromText(String(from));
  }, [from, fromFocused]);

  useEffect(() => {
    if (!toFocused) setToText(String(to));
  }, [to, toFocused]);

  const commitFrom = useCallback(
    (raw) => {
      const parsed = parseInt(raw, 10);
      const val = Number.isNaN(parsed) ? from : Math.min(Math.max(parsed, min), to);
      setFromText(String(val));
      if (val !== from) onFromChange && onFromChange(String(val));
    },
    [from, to, min, onFromChange]
  );

  const commitTo = useCallback(
    (raw) => {
      const parsed = parseInt(raw, 10);
      const val = Number.isNaN(parsed) ? to : Math.max(Math.min(parsed, max), from);
      setToText(String(val));
      if (val !== to) onToChange && onToChange(String(val));
    },
    [to, from, max, onToChange]
  );

  const handleKeyDown = (commitFn) => (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleMinusFrom = () => {
    if (from > min) onFromChange(String(from - 1));
  };
  const handlePlusFrom = () => {
    if (from < to) onFromChange(String(from + 1));
  };
  const handleMinusTo = () => {
    if (to > from) onToChange(String(to - 1));
  };
  const handlePlusTo = () => {
    if (to < max) onToChange(String(to + 1));
  };

  const gold = "#D4AF37";
  const goldDark = "#B8860B";
  const track = colors.cardBorder || "#E8E0D0";

  const progressPercent = totalInRange > 0 ? (readCount / totalInRange) * 100 : 0;

  const numberInputStyle = {
    width: 64,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${track}`,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color: colors.ink || "#0B1220",
    outline: "none",
    MozAppearance: "textfield",
  };

  const iconBtnStyle = (disabled) => ({
    width: 26,
    height: 26,
    borderRadius: 6,
    flexShrink: 0,
    border: `1px solid ${track}`,
    background: disabled ? "#f5f5f5" : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background: "#fff",
        border: `1px solid ${colors.cardBorder || "#E8E0D0"}`,
        borderRadius: 18,
        boxShadow: "0 10px 24px -12px rgba(18,46,42,.28)",
        padding: 16,
      }}
    >
      {/* بخش اول: ورودیِ عددیِ «از» / «تا» */}
      <div style={{ marginBottom: 16 }}>
        {label && (
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink || "#0B1220", marginBottom: 12 }}>
            {label}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: colors.inkSoft || "#6B7280", fontWeight: 600 }}>
            {isRTL ? "از" : "From"}
          </span>
          <button
            type="button"
            onClick={handleMinusFrom}
            disabled={from <= min}
            style={iconBtnStyle(from <= min)}
            title={uiLang === "en" ? "Decrease start" : "کاهش شروع"}
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={fromText}
            min={min}
            max={to}
            onFocus={() => setFromFocused(true)}
            onChange={(e) => setFromText(e.target.value)}
            onBlur={(e) => {
              setFromFocused(false);
              commitFrom(e.target.value);
            }}
            onKeyDown={handleKeyDown(commitFrom)}
            className="range-slider-filter-number"
            style={numberInputStyle}
          />
          <button
            type="button"
            onClick={handlePlusFrom}
            disabled={from >= to}
            style={iconBtnStyle(from >= to)}
            title={uiLang === "en" ? "Increase start" : "افزایش شروع"}
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>

          <span style={{ fontSize: 12, color: colors.inkSoft || "#6B7280", fontWeight: 600, marginInlineStart: 6 }}>
            {isRTL ? "تا" : "To"}
          </span>
          <button
            type="button"
            onClick={handleMinusTo}
            disabled={to <= from}
            style={iconBtnStyle(to <= from)}
            title={uiLang === "en" ? "Decrease end" : "کاهش پایان"}
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={toText}
            min={from}
            max={max}
            onFocus={() => setToFocused(true)}
            onChange={(e) => setToText(e.target.value)}
            onBlur={(e) => {
              setToFocused(false);
              commitTo(e.target.value);
            }}
            onKeyDown={handleKeyDown(commitTo)}
            className="range-slider-filter-number"
            style={numberInputStyle}
          />
          <button
            type="button"
            onClick={handlePlusTo}
            disabled={to >= max}
            style={iconBtnStyle(to >= max)}
            title={uiLang === "en" ? "Increase end" : "افزایش پایان"}
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* متن نمایش اعداد و "از مجموع" */}
        <div style={{ fontSize: 11, color: colors.inkSoft || "#6B7280", marginTop: 8, textAlign: isRTL ? "right" : "left" }}>
          {isRTL ? (
            <>
              {from} تا {to} از مجموع {max.toLocaleString("fa-IR")}
            </>
          ) : (
            <>
              {from} to {to} of {max.toLocaleString("en-US")}
            </>
          )}
        </div>
      </div>

      {/* نوار پیشرفت (Progress Bar) برای خوانده‌شده‌ها */}
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 3,
            background: "#E8E0D0",
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #D4AF37, #B8860B)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <span style={{ fontSize: 11, color: colors.teal || "#0F7D5C", fontWeight: 700 }}>
          {isRTL ? (
            <>
              خوانده‌شده: {readCount.toLocaleString("fa-IR")} از {totalInRange.toLocaleString("fa-IR")} در این بازه · {readCountTotal.toLocaleString("fa-IR")} از {max.toLocaleString("fa-IR")} کل
            </>
          ) : (
            <>
              Read: {readCount}/{totalInRange} in range · {readCountTotal}/{max} total
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// استایل‌های CSS برای input[type="range"] که در جاهای دیگر اپ استفاده می‌شوند
// (این کامپوننت خودش دیگر از input[type="range"] استفاده نمی‌کند، ولی چون
// چند اسلایدرِ دیگر در app.jsx از input[type="range"] استفاده می‌کنند، این
// استایل‌ها همچنان لازم است و حذف نشده.)
const rangeInputStyles = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #D4AF37;
    cursor: pointer;
    border: 2px solid #B8860B;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #D4AF37;
    cursor: pointer;
    border: 2px solid #B8860B;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-webkit-slider-runnable-track {
    background: transparent;
    height: 6px;
  }

  input[type="range"]::-moz-range-track {
    background: transparent;
    height: 6px;
  }

  /* پیکان‌های پیش‌فرضِ input[type=number] را در این کامپوننت مخفی می‌کنیم
     چون خودمان دکمه‌های +/- سفارشی داریم */
  input.range-slider-filter-number::-webkit-outer-spin-button,
  input.range-slider-filter-number::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

if (typeof document !== "undefined" && !document.getElementById("range-slider-filter-legacy-styles")) {
  const style = document.createElement("style");
  style.id = "range-slider-filter-legacy-styles";
  style.textContent = rangeInputStyles;
  document.head.appendChild(style);
}
