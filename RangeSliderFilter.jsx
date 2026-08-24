import React, { useRef, useCallback } from "react";
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

  const trackRef = useRef(null);
  const draggingRef = useRef(null); // "from" | "to" | null
  const rafRef = useRef(null);
  const pendingRef = useRef(null); // { which, val }

  const progressPercent = totalInRange > 0 ? (readCount / totalInRange) * 100 : 0;
  const span = Math.max(1, max - min);
  const fromPct = ((from - min) / span) * 100;
  const toPct = ((to - min) / span) * 100;

  // نکته: صرف‌نظر از جهت متن (fa/en)، خودِ نوار همیشه از چپ (کمینه) به راست (بیشینه) است
  // تا حرکت انگشت با موقعیت واقعی روی صفحه همیشه یکی باشد و لَگ/تناقض پیش نیاید.
  const valueFromClientX = useCallback(
    (clientX) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(min + pct * (max - min));
    },
    [min, max]
  );

  const scheduleFlush = useCallback(
    (which, val) => {
      pendingRef.current = { which, val };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingRef.current;
        if (!pending) return;
        if (pending.which === "from") onFromChange && onFromChange(String(pending.val));
        else onToChange && onToChange(String(pending.val));
      });
    },
    [onFromChange, onToChange]
  );

  const handleMove = useCallback(
    (clientX) => {
      const which = draggingRef.current;
      if (!which) return;
      let val = valueFromClientX(clientX);
      if (which === "from") {
        val = Math.min(val, to);
        if (val !== from) scheduleFlush("from", val);
      } else {
        val = Math.max(val, from);
        if (val !== to) scheduleFlush("to", val);
      }
    },
    [from, to, valueFromClientX, scheduleFlush]
  );

  const makePointerDown = (which) => (e) => {
    e.preventDefault();
    draggingRef.current = which;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    handleMove(e.clientX);
  };

  const endDrag = (e) => {
    if (draggingRef.current && e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    draggingRef.current = null;
  };

  const handleTrackPointerDown = (e) => {
    // اگر مستقیم روی خودِ دستگیره کلیک شده، بگذار هندلر خودش کار را انجام دهد
    if (e.target.dataset && e.target.dataset.thumb) return;
    const val = valueFromClientX(e.clientX);
    const nearestIsFrom = Math.abs(val - from) <= Math.abs(val - to);
    if (nearestIsFrom) {
      onFromChange && onFromChange(String(Math.min(val, to)));
    } else {
      onToChange && onToChange(String(Math.max(val, from)));
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
      {/* بخش اول: اسلایدر یکپارچه با دو دستگیره */}
      <div style={{ marginBottom: 16 }}>
        {label && (
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink || "#0B1220", marginBottom: 12 }}>
            {label}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleMinusFrom}
            disabled={from <= min}
            style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
              border: `1px solid ${track}`,
              background: from <= min ? "#f5f5f5" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: from <= min ? "not-allowed" : "pointer",
              opacity: from <= min ? 0.5 : 1,
            }}
            title={uiLang === "en" ? "Decrease start" : "کاهش شروع"}
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>

          {/* نوار اصلی اسلایدر */}
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            style={{
              position: "relative",
              flex: 1,
              height: 32,
              display: "flex",
              alignItems: "center",
              touchAction: "none",
              cursor: "pointer",
            }}
          >
            {/* خط پس‌زمینه */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 6,
                borderRadius: 3,
                background: track,
              }}
            />
            {/* بازه‌ی انتخاب‌شده */}
            <div
              style={{
                position: "absolute",
                left: `${fromPct}%`,
                width: `${Math.max(0, toPct - fromPct)}%`,
                height: 6,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${gold}, ${goldDark})`,
              }}
            />
            {/* دستگیره‌ی شروع */}
            <div
              data-thumb="from"
              onPointerDown={makePointerDown("from")}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "absolute",
                left: `${fromPct}%`,
                transform: "translateX(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: gold,
                border: `2px solid ${goldDark}`,
                boxShadow: "0 2px 4px rgba(0,0,0,.25)",
                touchAction: "none",
                cursor: "grab",
              }}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={to}
              aria-valuenow={from}
            />
            {/* دستگیره‌ی پایان */}
            <div
              data-thumb="to"
              onPointerDown={makePointerDown("to")}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "absolute",
                left: `${toPct}%`,
                transform: "translateX(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: gold,
                border: `2px solid ${goldDark}`,
                boxShadow: "0 2px 4px rgba(0,0,0,.25)",
                touchAction: "none",
                cursor: "grab",
              }}
              role="slider"
              aria-valuemin={from}
              aria-valuemax={max}
              aria-valuenow={to}
            />
          </div>

          <button
            onClick={handlePlusTo}
            disabled={to >= max}
            style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
              border: `1px solid ${track}`,
              background: to >= max ? "#f5f5f5" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: to >= max ? "not-allowed" : "pointer",
              opacity: to >= max ? 0.5 : 1,
            }}
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
// (این کامپوننت خودش دیگر از input[type="range"] استفاده نمی‌کند)
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

if (typeof document !== "undefined" && !document.getElementById("range-slider-filter-legacy-styles")) {
  const style = document.createElement("style");
  style.id = "range-slider-filter-legacy-styles";
  style.textContent = rangeInputStyles;
  document.head.appendChild(style);
}
