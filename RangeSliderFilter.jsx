import React from "react";
import { Plus, Minus } from "lucide-react";

/**
 * RangeSliderFilter Component
 * 
 * Props:
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
  
  // درصد برای نوار پیشرفت
  const progressPercent = totalInRange > 0 ? (readCount / totalInRange) * 100 : 0;

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

  const handleSliderFromChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val <= to) onFromChange(String(val));
  };

  const handleSliderToChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val >= from) onToChange(String(val));
  };

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
      {/* بخش اول: دکمه‌ها و اسلایدر */}
      <div style={{ marginBottom: 16 }}>
        {/* عنوان */}
        {label && (
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink || "#0B1220", marginBottom: 12 }}>
            {label}
          </div>
        )}

        {/* اسلایدرهای محدوده */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          {/* دکمه‌ی مینوس شروع */}
          <button
            onClick={handleMinusFrom}
            disabled={from <= min}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder || "#E8E0D0"}`,
              background: from <= min ? "#f5f5f5" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: from <= min ? "not-allowed" : "pointer",
              opacity: from <= min ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            title={uiLang === "en" ? "Decrease" : "کاهش"}
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>

          {/* اسلایدر شروع */}
          <input
            type="range"
            min={min}
            max={max}
            value={from}
            onChange={handleSliderFromChange}
            style={{
              flex: 1,
              minWidth: 80,
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(to ${isRTL ? "left" : "right"}, #D4AF37 0%, #D4AF37 ${((from - min) / (max - min)) * 100}%, #E8E0D0 ${((from - min) / (max - min)) * 100}%, #E8E0D0 100%)`,
              outline: "none",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          />

          {/* دکمه‌ی پلاس شروع */}
          <button
            onClick={handlePlusFrom}
            disabled={from >= to}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder || "#E8E0D0"}`,
              background: from >= to ? "#f5f5f5" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: from >= to ? "not-allowed" : "pointer",
              opacity: from >= to ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            title={uiLang === "en" ? "Increase" : "افزایش"}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* دکمه‌های محدوده پایان */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* دکمه‌ی مینوس پایان */}
          <button
            onClick={handleMinusTo}
            disabled={to <= from}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder || "#E8E0D0"}`,
              background: to <= from ? "#f5f5f5" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: to <= from ? "not-allowed" : "pointer",
              opacity: to <= from ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            title={uiLang === "en" ? "Decrease" : "کاهش"}
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>

          {/* اسلایدر پایان */}
          <input
            type="range"
            min={min}
            max={max}
            value={to}
            onChange={handleSliderToChange}
            style={{
              flex: 1,
              minWidth: 80,
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(to ${isRTL ? "left" : "right"}, #D4AF37 0%, #D4AF37 ${((to - min) / (max - min)) * 100}%, #E8E0D0 ${((to - min) / (max - min)) * 100}%, #E8E0D0 100%)`,
              outline: "none",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          />

          {/* دکمه‌ی پلاس پایان */}
          <button
            onClick={handlePlusTo}
            disabled={to >= max}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder || "#E8E0D0"}`,
              background: to >= max ? "#f5f5f5" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: to >= max ? "not-allowed" : "pointer",
              opacity: to >= max ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            title={uiLang === "en" ? "Increase" : "افزایش"}
          >
            <Plus size={14} strokeWidth={2.5} />
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

        {/* متن وضعیت خوانده‌شده */}
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

// استایل‌های CSS برای input range (برای مرورگرهای مختلف)
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
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = rangeInputStyles;
  document.head.appendChild(style);
}
