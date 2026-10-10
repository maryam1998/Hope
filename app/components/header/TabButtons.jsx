// دکمه‌های تب هدر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React from "react";
import { colors, fontFa } from "../../ui/theme.js";

// ردیفِ سه‌تا تبِ اصلی (مکالمات روزمره، داستان‌ساز، لغات ذخیره‌شده) که —
// دقیقاً طبقِ موکاپِ طراحی (language-app-home.html، کلاسِ .tab/.tab.active —
// دیگه توی نوارِ جداگانه‌ی زیرِ هدر (که پس‌زمینه‌ی روشنِ colors.paperDark
// داره) نیستن، بلکه خودِ هدر (روی گرادیانتِ تیره‌ش) رندر می‌شن: هر سه با
// عرضِ مساوی (flex:1)، غیرفعال = پیلِ کِرم‌رنگ با متنِ تیره، فعال = پیلِ
// هم‌رنگِ خودِ هدر (تقریباً محو می‌شه توی پس‌زمینه، دقیقاً همون افکتِ موکاپ).
function HeaderPrimaryTabButton({ label, icon: Icon, active, onClick, fontFamily: fontFamilyProp }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full"
      style={{
        flex: 1,
        gap: 6,
        fontFamily: fontFamilyProp || fontFa,
        fontSize: 13,
        fontWeight: 600,
        padding: "11px 6px",
        backgroundColor: active ? colors.ink : "#E6DAB2",
        color: active ? "#F3EFDD" : "#5C5637",
        border: `1px solid ${active ? colors.ink : "#E7DEC1"}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
export function HeaderGroupButton({ label, icon: Icon, active, onClick, fontFamily: fontFamilyProp }) {
  // کپسولِ گوشه‌گردِ افقی (آیکون + نام) — همون فرمِ دکمه‌هایِ قدیمیِ هدر.
  // همه‌ی استایل‌ها inline هستن چون tailwind.css از قبل ساخته شده.
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "12px 4px",
        borderRadius: 999,
        fontFamily: fontFamilyProp || fontFa,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
        backgroundColor: active ? colors.ink : "#E6DAB2",
        color: active ? "#F3EFDD" : "#5C5637",
        border: `1px solid ${active ? colors.ink : "#E7DEC1"}`,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </button>
  );
}
export function TabButton({ label, icon: Icon, active, onClick, fontFamily: fontFamilyProp }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 justify-center rounded-full"
      style={{
        fontFamily: fontFamilyProp || fontFa,
        fontSize: 13,
        fontWeight: 600,
        padding: "11px 16px",
        // غیرفعال: کِرمِ تیره‌ترِ همون طرحِ مرجع؛ فعال: سبزِ تیره‌ی هدر —
        // دقیقاً همون جفت‌رنگِ .tab / .tab.active توی language-app-home.html
        backgroundColor: active ? colors.ink : colors.paperDark,
        color: active ? colors.paper : colors.inkSoft,
        border: `1px solid ${active ? colors.ink : colors.cardBorder}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
