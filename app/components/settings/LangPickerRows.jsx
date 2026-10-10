// ردیف‌های انتخاب زبان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { colors, fontFa } from "../../ui/theme.js";

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function LangStamp({ lang, active, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        fontFamily: fontFa,
        width: 52,
        height: 52,
        borderRadius: "50%",
        // این مهر همیشه روی پس‌زمینه‌ی تیره‌ی هدر (گرادیانتِ teal→ink) رندر
        // می‌شه، نه روی کارتِ روشنِ صفحه — برای همین حالتِ غیرفعالش باید از
        // رنگ‌های ثابتِ خودِ هدر (نه colors.inkSoft/colors.cardBorder که
        // برای متنِ روی زمینه‌ی روشن طراحی شدن) استفاده کنه. مقادیر دقیقاً
        // از موکاپِ طراحی (language-app-home.html) گرفته شده.
        border: active ? `1.6px solid ${colors.gold}` : "1.6px dashed rgba(233,226,200,.4)",
        background: active ? `linear-gradient(135deg, ${colors.gold}, ${colors.goldSoft})` : "rgba(255,255,255,.03)",
        color: active ? colors.ink : "#CFE3DC",
        fontWeight: 700,
        fontSize: 12.5,
        letterSpacing: 0.3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        boxShadow: active ? "0 6px 16px -4px rgba(201,154,46,.55)" : "none",
        transition: "background-color 0.15s, border-color 0.15s",
        // این متن (AR/HI/IT/...) هیچ‌وقت نباید با لمسِ طولانی (که برای
        // جابه‌جاییِ ترتیب استفاده می‌شه) به‌صورتِ متنِ قابل‌انتخاب/های‌لایت
        // آبیِ مرورگر دربیاد — چون این یه دکمه‌ست، نه متنِ داستان.
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      aria-pressed={active}
      title={disabled ? `${lang.label} (زبان مادری‌ته، نمی‌تونه هم‌زمان مقصد باشه)` : lang.label}
    >
      {lang.abbr}
    </button>
  );
}
// ---------------------------------------------------------------------------
// ردیفِ قابل‌کشیدنِ زبان‌ها — همون LangStamp‌های قبلی رو نشون می‌ده (برای
// انتخابِ زبان مادری/مقصد با یه تپ ساده)، و کل ردیف همیشه با اسکرولِ افقیِ
// طبیعیِ خودِ مرورگر (بدون هیچ دخالتی) لغزنده می‌مونه — چون دقیقاً همون
// حرکتِ افقی هم برای اسکرول و هم برای جابه‌جایی استفاده می‌شه، این دو با
// «نگه‌داشتنِ طولانی» (long-press) از هم جدا می‌شن، نه با آستانه‌ی حرکت:
//   - تپِ سریع (بدون نگه‌داشتن) → همون انتخابِ زبانِ قبلی.
//   - کشیدنِ سریع/پیوسته (بدون مکث) → اسکرولِ عادیِ ردیفه، هیچ preventDefault
//     ای صدا زده نمی‌شه، برای همین دیگه هنگ/کندی نداره.
//   - لمس و نگه‌داشتن حدود سیصد میلی‌ثانیه بدونِ حرکتِ زیاد → حالتِ
//     جابه‌جایی فعال می‌شه (مهر کمی بزرگ‌تر می‌شه)، از اون لحظه حرکت
//     دادنِ انگشت باعثِ عوض‌شدنِ ترتیب می‌شه، نه اسکرول.
//   - با ماوس (دسکتاپ) نیازی به نگه‌داشتن نیست، چون کشیدن-با-کلیک روی این
//     ردیف اصلاً اسکرولی رو راه نمی‌ندازه؛ همون آستانه‌ی چندپیکسلی کافیه.
// ---------------------------------------------------------------------------
export function DraggableLangRow({ order, setOrder, languages, isActive, isDisabled, onClick }) {
  const dragState = useRef({ code: null, startX: 0, startY: 0, dragging: false, longPressTimer: null });
  const [dragCode, setDragCode] = useState(null);

  function clearLongPress(st) {
    if (st.longPressTimer) {
      clearTimeout(st.longPressTimer);
      st.longPressTimer = null;
    }
  }

  function reorderTo(code, clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const stampEl = el && el.closest("[data-lang-order-code]");
    if (!stampEl) return;
    const hoveredCode = stampEl.getAttribute("data-lang-order-code");
    if (hoveredCode === code) return;
    const fromIndex = order.indexOf(code);
    const toIndex = order.indexOf(hoveredCode);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, code);
    setOrder(next);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      const st = dragState.current;
      if (!st.code) return;
      if (!st.dragging) {
        const dx = Math.abs(e.clientX - st.startX);
        const dy = Math.abs(e.clientY - st.startY);
        if (dx < 8 && dy < 8) return; // هنوز آستانه‌ی کشیدن رد نشده — تپ حساب می‌شه
        st.dragging = true;
        setDragCode(st.code);
      }
      reorderTo(st.code, e.clientX, e.clientY);
    }
    function handleTouchMove(e) {
      const st = dragState.current;
      if (!st.code) return;
      const t = e.touches[0];
      if (!st.dragging) {
        // هنوز long-press فعال نشده — اگه انگشت زیاد جابه‌جا شده، یعنی
        // کاربر داره اسکرول می‌کنه، نه نگه‌می‌داره؛ بی‌خیالِ کاندیدشدنِ
        // این لمس برای کشیدن می‌شیم و می‌ذاریم اسکرولِ عادی انجام بشه.
        const dx = Math.abs(t.clientX - st.startX);
        const dy = Math.abs(t.clientY - st.startY);
        if (dx > 10 || dy > 10) {
          clearLongPress(st);
          st.code = null;
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      reorderTo(st.code, t.clientX, t.clientY);
    }
    function handleUp() {
      const st = dragState.current;
      clearLongPress(st);
      dragState.current = { code: null, startX: 0, startY: 0, dragging: false, longPressTimer: null };
      setDragCode(null);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [order, setOrder]);

  // زبان‌هایی که هنوز توی order نیستن (مثلاً بعداً به PHRASEBOOK_LANGUAGES
  // اضافه شدن) آخرِ ردیف نشون داده می‌شن تا از دست نرن.
  const orderedLangs = [
    ...order.map((code) => languages.find((l) => l.code === code)).filter(Boolean),
    ...languages.filter((l) => !order.includes(l.code)),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
      {orderedLangs.map((l) => (
        <div
          key={l.code}
          data-lang-order-code={l.code}
          onMouseDown={(e) => {
            dragState.current = { code: l.code, startX: e.clientX, startY: e.clientY, dragging: false, longPressTimer: null };
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            const st = { code: l.code, startX: t.clientX, startY: t.clientY, dragging: false, longPressTimer: null };
            dragState.current = st;
            st.longPressTimer = setTimeout(() => {
              // اگه تا این لحظه هنوز همین لمس زنده‌ست (با حرکتِ زیاد لغو
              // نشده)، وارد حالتِ جابه‌جایی می‌شیم.
              if (dragState.current === st && st.code) {
                st.dragging = true;
                setDragCode(st.code);
              }
            }, 320);
          }}
          style={{
            touchAction: "pan-x",
            cursor: "grab",
            flexShrink: 0,
            transform: dragCode === l.code ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.12s",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <LangStamp
            lang={l}
            active={isActive(l.code)}
            disabled={isDisabled ? isDisabled(l.code) : false}
            onClick={() => {
              if (!dragState.current.dragging) onClick(l.code);
            }}
          />
        </div>
      ))}
    </div>
  );
}
