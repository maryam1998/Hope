// چیپ‌های ترتیب و گرید زبان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { colors } from "../ui/theme.js";

// Drag-to-reorder row of chips (touch + mouse). Dragging a chip over another
// swaps their position live; the new order is reported via onReorder.
export function OrderChips({ order, languages, onReorder, onRemove }) {
  const [dragCode, setDragCode] = useState(null);

  useEffect(() => {
    if (!dragCode) return;

    const handleMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const el = document.elementFromPoint(point.clientX, point.clientY);
      const chipEl = el && el.closest("[data-order-code]");
      if (!chipEl) return;
      const hoveredCode = chipEl.getAttribute("data-order-code");
      if (hoveredCode === dragCode) return;
      const fromIndex = order.indexOf(dragCode);
      const toIndex = order.indexOf(hoveredCode);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...order];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragCode);
      onReorder(next);
    };

    const handleUp = () => setDragCode(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragCode, order, onReorder]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {order.map((code) => {
        const lang = languages.find((l) => l.code === code);
        if (!lang) return null;
        return (
          <div
            key={code}
            data-order-code={code}
            onMouseDown={() => setDragCode(code)}
            onTouchStart={(e) => {
              e.preventDefault();
              setDragCode(code);
            }}
            style={{
              touchAction: "none",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              backgroundColor: dragCode === code ? colors.gold : "white",
              color: dragCode === code ? colors.paper : colors.ink,
              border: `1px solid ${colors.cardBorder}`,
              fontSize: 13,
              fontWeight: 600,
              cursor: "grab",
              flexShrink: 0,
            }}
          >
            <span style={{ color: dragCode === code ? colors.paper : colors.gold, fontSize: 11 }}>⠿</span>
            {lang.label}
            {onRemove && order.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(code);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                aria-label={`حذف ${lang.label}`}
                title={`حذف ${lang.label}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "none",
                  background: dragCode === code ? "rgba(255,255,255,0.3)" : colors.paperDark,
                  color: dragCode === code ? colors.paper : colors.inkSoft,
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ---------------------------------------------------------------------------
// شبکه‌ی چیپ‌های زبانِ داستان‌ساز («داستان همزمان به چه زبان‌هایی ترجمه
// بشه؟») — هم با تپ، انتخاب/عدمِ انتخاب می‌شن (مثلِ قبل)، هم با
// نگه‌داشتن‌وکشیدن (چه با ماوس چه با انگشت) جابه‌جا می‌شن — دقیقاً همون
// تکنیکِ OrderChips بالا، با این تفاوت که این‌جا چون خودِ چیپ‌ها هم قابلِ
// تپ‌کردن‌اند (نه فقط کشیدن)، تشخیصِ «تپ» از «کشیدن» کاملاً خودمون انجام
// می‌دیم (نه با رویدادِ onClick): تا وقتی جابه‌جاییِ لمس/ماوس از یه آستانه‌ی
// کوچیک بیشتر نشده، «تپ» حساب می‌شه و در پایانِ لمس/کلیک، انتخاب/عدمِ
// انتخاب رو صدا می‌زنیم؛ اگه از اون آستانه گذشت، دیگه «کشیدن» حساب می‌شه و
// چیدمانِ چیپ‌ها عوض می‌شه (بدونِ اینکه انتخابش عوض بشه).
export function DraggableToggleLangGrid({ order, onReorder, languages, selected, onToggle }) {
  const [dragCode, setDragCode] = useState(null);
  const stateRef = useRef({ code: null, x: 0, y: 0, dragging: false });
  // اگه واقعاً کشیده شده بود، رویدادِ click ای که مرورگر خودش بعد از
  // mouseup/touchend می‌سازه نباید باعثِ toggle بشه — این پرچم همون یک تپ
  // بعدی رو خنثی می‌کنه (خودِ toggle حالا از رویِ onClick واقعیِ عنصر انجام
  // می‌شه، نه از رویِ شنونده‌های window، که رویِ بعضی webviewها/موبایل‌ها
  // قابل‌اعتماد نبود و باعث می‌شد تپ‌کردن روی زبون‌ها اصلاً چیزی رو
  // انتخاب نکنه).
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const DRAG_THRESHOLD = 8; // px — کمتر از این، تپ حساب می‌شه نه کشیدن
    const getPoint = (e) => (e.touches ? e.touches[0] : e);

    const handleMove = (e) => {
      const st = stateRef.current;
      if (!st.code) return;
      const point = getPoint(e);
      if (!point) return;
      const dx = point.clientX - st.x;
      const dy = point.clientY - st.y;
      if (!st.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        st.dragging = true;
        setDragCode(st.code);
      }
      if (e.cancelable) e.preventDefault();
      const el = document.elementFromPoint(point.clientX, point.clientY);
      const chipEl = el && el.closest("[data-order-code]");
      if (!chipEl) return;
      const hoveredCode = chipEl.getAttribute("data-order-code");
      if (hoveredCode === st.code) return;
      const fromIndex = order.indexOf(st.code);
      const toIndex = order.indexOf(hoveredCode);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...order];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, st.code);
      onReorder(next);
    };

    const handleUp = () => {
      const st = stateRef.current;
      // اگه واقعاً کشیده شده بود، همون تک‌تپِ بعدیِ click (که خودِ مرورگر
      // بعد از mouseup/touchend می‌سازه) نباید toggle کنه.
      if (st.dragging) suppressClickRef.current = true;
      stateRef.current = { code: null, x: 0, y: 0, dragging: false };
      setDragCode(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [order, onReorder, onToggle]);

  return (
    <div className="flex flex-wrap gap-2">
      {order.map((code) => {
        const lang = languages.find((l) => l.code === code);
        if (!lang) return null;
        const isOn = selected.includes(code);
        const isDragging = dragCode === code;
        return (
          <div
            key={code}
            data-order-code={code}
            onMouseDown={(e) => {
              stateRef.current = { code, x: e.clientX, y: e.clientY, dragging: false };
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              stateRef.current = { code, x: t.clientX, y: t.clientY, dragging: false };
            }}
            onClick={() => {
              // خودِ toggle این‌جا انجام می‌شه (رویِ onClickِ واقعیِ عنصر)،
              // نه با شنودِ mouseup/touchendِ روی window — همون چیزی که قبلاً
              // باعث می‌شد تپ‌کردن روی چیپ‌ها هیچ زبونی رو انتخاب نکنه.
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              onToggle(code);
            }}
            style={{
              touchAction: "none",
              userSelect: "none",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 12,
              border: `1px solid ${isDragging ? colors.gold : isOn ? colors.gold : colors.cardBorder}`,
              backgroundColor: isDragging ? colors.gold : isOn ? colors.goldSoft : "white",
              color: isDragging ? "white" : colors.ink,
              cursor: "grab",
            }}
          >
            {lang.label}
          </div>
        );
      })}
    </div>
  );
}
