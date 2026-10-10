// رنگ‌ها، تم‌ها، فونت‌ها و ابزارهای ظاهری
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// تبدیلِ رنگِ هگز (#RRGGBB) به rgba با شفافیتِ دلخواه — برای رو-همِ رنگِ
// تمِ فعال روی عکسِ پس‌زمینه، تا با هر میزان شفافیتی که کاربر انتخاب کنه
// متن‌های رویِ صفحه هنوز خوانا بمونن.
export function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
export const colors = {
  paper: "var(--c-paper)",
  paperDark: "var(--c-paperDark)",
  ink: "var(--c-ink)",
  inkSoft: "var(--c-inkSoft)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  teal: "var(--c-teal)",
  rose: "var(--c-rose)",
  cardBorder: "var(--c-cardBorder)",
  // رنگ‌های اختصاصیِ گرادیانتِ هدرِ بالا — هر تم رنگِ خودش رو داره (به‌جای
  // اینکه هدر همیشه از teal→ink بسازه، که چون ink توی همه‌ی تم‌ها تیره‌ست
  // باعث می‌شد هدر همیشه تقریباً یه شکلِ تیره‌ی یکسان داشته باشه، فارغ از
  // اینکه کدوم تم انتخاب شده).
  headerFrom: "var(--c-headerFrom)",
  headerTo: "var(--c-headerTo)",
  headerText: "var(--c-headerText)",
};
// طبق درخواست: متن اصلیِ لغت/جمله مشکی-سورمه‌ای پررنگ و بولد، و متنِ
// ترجمه‌ها سبزِ پررنگ و بولد. این دو ثابتن (نه وابسته به تم رنگی
// انتخابی کاربر توی تنظیمات) چون خودِ کاربر رنگ مشخص خواسته.
export const mainTextColor = "#0B1220";
export const translationColor = "#0F5C34";
// رنگِ ثابتِ «ماژیک هایلایتِ خواندن» — این دیگه فقط یه فال‌بکه؛ رنگِ واقعی
// از appPrefs.highlightColor (که کاربر از تنظیمات انتخاب می‌کنه) میاد.
export const READ_MARKER_COLOR = "#FFD54F";
// رنگ ملایم‌تر برای نشانگر «خوانده‌شده» (دایره‌ی کنار هر واژه) — به‌جای
// colors.teal اشباع‌شده که با تکرار زیاد توی لیست‌های بلند چشم رو اذیت
// می‌کرد؛ این یه سبزِ خاکستری کم‌اشباع‌تره که هنوز به‌عنوانِ «تکمیل‌شده»
// خونده می‌شه ولی نور/کنتراستِ کمتری داره.
export const READ_DONE_COLOR = "#7FA396";
// رنگِ زمینه‌ی یکسان‌شده‌ی کارت/ردیفِ «خوانده‌شده» در همه‌ی تب‌ها (لغات،
// اخبار، اسلنگ، علاقه‌مندی‌ها، مکالمه‌ی روزمره، داستان‌های ذخیره‌شده،
// یادداشت‌های گرامر) — قبلاً یه سبزِ خیلی کم‌رنگ (#F2FBF6) بود که کاربر
// گفت چشم رو اذیت می‌کنه؛ این یه طلاییِ کم‌رنگه که خودِ کاربر از بینِ چند
// گزینه انتخاب کرد.
export const READ_DONE_BG = "#FBF2DF";
// گرادیانتِ طلاییِ «خوانده‌شده» — طبق درخواستِ کاربر، همون افکتِ بصریِ
// کارت‌های تبِ مکالمات (language-app-home.html: .card.done) حالا توی همه‌ی
// تب‌های دیگه هم (لغات، اخبار، اسلنگ، داستان‌های ذخیره‌شده، یادداشت‌های
// گرامر) برای ردیف/کارتِ خوانده‌شده استفاده می‌شه، به‌جای رنگِ تختِ
// READ_DONE_BG بالا.
export const READ_DONE_GRADIENT = "linear-gradient(150deg, #F8F2DE 0%, #F1E6C6 100%)";
export const READ_DONE_BORDER = "#E3D2A2";
export const READ_DONE_SHADOW = "0 2px 8px -6px rgba(150,120,40,.15)";
// تیکِ «خوانده‌شده» همیشه سبزه (مستقل از تمِ رنگیِ فعال) تا با هر پوسته‌ای یکدست بمونه.
export const READ_DONE_CHECK_GRADIENT = "linear-gradient(135deg, #3F9B72, #276E4F)";
// رنگِ ثابتِ ستاره‌ی «افزودن به علاقه‌مندی‌ها» — زرد (نه طلایی/نارنجی)،
// مستقل از تمِ رنگیِ فعال، تا همه‌جای اپ یکدست باشه.
export const STAR_FAVORITE_COLOR = "#F5C518";
// پالتِ رنگ‌های کم‌رنگ/بی‌حال (pastel) که کاربر می‌تونه به‌عنوانِ رنگِ
// هایلایتِ خواندن ازش انتخاب کنه — دقیقاً همون طیفی که خودِ کاربر
// به‌عنوانِ نمونه فرستاد (زردِ کم‌رنگ، هلویی، نارنجیِ ملایم، صورتی‌مرجانی،
// زیتونی، سبز، فیروزه‌ای، آبیِ روشن، آبی، بنفش، بنفشِ صورتی، صورتی).
export const HIGHLIGHT_COLOR_PALETTE = [
  "#F7E98E", // زرد کم‌رنگ
  "#FBD9AE", // هلویی
  "#F7C48C", // نارنجیِ ملایم
  "#F1968E", // صورتی‌مرجانی
  "#DCE07E", // زیتونی روشن
  "#9AD98A", // سبز کم‌رنگ
  "#8DE0BE", // فیروزه‌ای/نعنایی
  "#A6DEE9", // آبیِ خیلی روشن
  "#A9C7F0", // آبی کم‌رنگ
  "#C7B6EC", // بنفشِ کم‌رنگ
  "#F0AEEC", // بنفشیِ صورتی
  "#F4AAC0", // صورتی
];
// همون رنگِ پس‌زمینه‌ی نوارِ پلیرِ پایینِ صفحه (colors.paper) — تا این پنلِ
// شناور با اون هم‌رنگ باشه؛ بردرِ طلاییِ کم‌رنگ (goldSoft) هم اضافه شده تا
// با وجودِ هم‌رنگ بودنِ پس‌زمینه، پنل هنوز به‌وضوح از بقیه‌ی صفحه جدا دیده بشه.
export const PRACTICE_PANEL_BORDER = colors.goldSoft;
// وقتی کاربر از تنظیمات «بدون هایلایت» رو انتخاب کرده باشه
// (appPrefs.highlightColor === "none")، حتی وقتی جمله/کلمه/پاراگرافِ فعلی
// در حالِ خوندنه، هیچ رنگِ هایلایتی روش اعمال نمی‌شه — متن فقط خونده
// می‌شه، بدونِ علامت‌گذاریِ بصری. همه‌جایی که پس‌زمینه‌ی «زنده»ی خواندن رو
// نشون می‌دن (StoryBuilder، PhraseList، لیستِ لغات و ...) به‌جای نوشتنِ
// دستیِ `isActive ? (highlightColor || READ_MARKER_COLOR) : inactive` از
// همین تابع استفاده می‌کنن.
// اسکرولِ نرم و آهسته‌ی خطِ فعال به وسطِ صفحه (به‌جای پرشِ سریعِ مرورگر).
// اگه خط تقریباً وسطه، اصلاً تکون نمی‌خوره؛ انیمیشنِ قبلی هم لغو می‌شه.
let __smoothScrollRaf = 0;
export function smoothScrollToCenter(node, duration = 900) {
  if (!node || typeof window === "undefined") return;
  let sc = node.parentElement;
  while (sc && sc !== document.body && sc !== document.documentElement) {
    const oy = getComputedStyle(sc).overflowY;
    if ((oy === "auto" || oy === "scroll") && sc.scrollHeight > sc.clientHeight + 2) break;
    sc = sc.parentElement;
  }
  const root = document.scrollingElement || document.documentElement;
  const useWin = !sc || sc === document.body || sc === document.documentElement;
  const box = useWin ? { top: 0, height: window.innerHeight } : sc.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  const delta = r.top + r.height / 2 - (box.top + box.height / 2);
  if (Math.abs(delta) < 24) return;
  const startPos = useWin ? root.scrollTop : sc.scrollTop;
  const dist = Math.min(Math.abs(delta), box.height * 1.5) * Math.sign(delta);
  const dur = Math.min(1400, Math.max(500, duration + Math.abs(dist) * 0.3));
  const t0 = performance.now();
  cancelAnimationFrame(__smoothScrollRaf);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const y = startPos + dist * ease(k);
    if (useWin) root.scrollTop = y; else sc.scrollTop = y;
    if (k < 1) __smoothScrollRaf = requestAnimationFrame(step);
  };
  __smoothScrollRaf = requestAnimationFrame(step);
}
export function highlightBg(highlightColor, isActive, inactiveValue) {
  const fallback = inactiveValue === undefined ? "transparent" : inactiveValue;
  if (!isActive || highlightColor === "none") return fallback;
  return highlightColor || READ_MARKER_COLOR;
}
// ⚡️ استایلِ مشترکِ «سواچِ رنگ» — دقیقاً بر اساسِ ظاهرِ سواچ‌های
// «Theme Colors»ِ پاورپوینت که کاربر نمونه فرستاد: یه مربعِ کوچیکِ
// گوشه‌گرد با بردرِ نازکِ خاکستری و یه سایه‌ی ظریف، به‌جای دایره‌ی تختِ
// قبلی. هم پیکِ «رنگ و تم» و هم پالتِ «رنگِ هایلایتِ خواندن» از همین یه
// تابع استفاده می‌کنن تا کاملاً هم‌شکل باشن (طبقِ درخواستِ کاربر). حالتِ
// انتخاب‌شده هم به‌جای یه بردرِ ضخیمِ ساده، یه حلقه‌ی دوتایی (یه خطِ سفید
// و بعدش رنگِ طلایی) دورِ سواچ می‌کشه — همون افکتِ برجسته‌شدنِ سواچِ
// انتخابی که توی اسکرین‌شاتِ پاورپوینت هم دیده می‌شه.
export function swatchButtonStyle(bg, selected, size = 34) {
  return {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${selected ? colors.gold : "rgba(0,0,0,.16)"}`,
    boxShadow: selected
      ? `0 0 0 2px white, 0 0 0 4px ${colors.gold}, 0 1px 3px rgba(0,0,0,.2)`
      : "0 1px 2px rgba(0,0,0,.12), inset 0 0 0 1px rgba(255,255,255,.35)",
    flexShrink: 0,
    transition: "box-shadow .15s ease",
  };
}
// Theme presets — each is a full set of the 9 tokens above. "vintage" is the
// original look; the rest are alternate moods, all still checked for
// readable contrast (dark ink/text tokens on light paper tokens, or the
// reverse for "midnight").
export const APP_THEMES = {
  vintage: {
    label: { fa: "کلاسیک (پیش‌فرض)", en: "Classic (default)" },
    swatch: "#C99A2E",
    // هدرِ همین تمِ پیش‌فرض دست‌نخورده موند (همون چیزی که کاربر می‌پسندید)؛
    // فقط به‌جای اینکه از teal→ink ساخته بشه، حالا مستقیماً به headerFrom/To
    // منتقل شد تا با بقیه‌ی تم‌ها هم‌شکل باشه.
    values: { paper: "#EFE6C9", paperDark: "#E6DAB2", ink: "#1E2A26", inkSoft: "#4B5551", gold: "#C99A2E", goldSoft: "#E3C77E", teal: "#1B4640", rose: "#9E3B3B", cardBorder: "#E7DEC1", headerFrom: "#1B4640", headerTo: "#1E2A26", headerText: "#EFE6C9" },
  },
  ocean: {
    label: { fa: "اقیانوسی", en: "Ocean" },
    // ⚡️ طبقِ درخواستِ کاربر: تم‌های غیرِ پیش‌فرض تیره/کدر بودن، مخصوصاً
    // هدرِ بالا که همیشه تقریباً سیاه به‌نظر می‌رسید (چون از teal→ink
    // ساخته می‌شد و ink توی همه‌ی تم‌ها خیلی تیره‌ست). حالا هدر یه
    // گرادیانتِ روشن و زنده‌ی مخصوصِ خودِ این تم داره (آبیِ واضح → فیروزه‌ای)،
    // نه یه رنگِ تقریباً مشکیِ یکسان با بقیه‌ی تم‌ها.
    swatch: "#2E86DE",
    values: { paper: "#EAF4F4", paperDark: "#D7E9EA", ink: "#0F2A38", inkSoft: "#2A4E5C", gold: "#1C7C93", goldSoft: "#8FCBD8", teal: "#1C7C93", rose: "#B4533F", cardBorder: "#BBD6D8", headerFrom: "#3AA0F2", headerTo: "#1C7C93", headerText: "#F4FBFD" },
  },
  forest: {
    label: { fa: "جنگلی", en: "Forest" },
    swatch: "#2FA84F",
    values: { paper: "#F1F0E4", paperDark: "#E2E0CC", ink: "#26321D", inkSoft: "#41522C", gold: "#8A6D2F", goldSoft: "#C9B77E", teal: "#5C7A3A", rose: "#9C4A3A", cardBorder: "#CBCBA8", headerFrom: "#3FAE5C", headerTo: "#2C6B3D", headerText: "#F5F8EC" },
  },
  rosewine: {
    label: { fa: "گلبهی", en: "Rosewine" },
    swatch: "#C2185B",
    values: { paper: "#F7EAEA", paperDark: "#EBD6D8", ink: "#3A1F26", inkSoft: "#5C3540", gold: "#A34960", goldSoft: "#E3AFBC", teal: "#6E5A78", rose: "#A34960", cardBorder: "#DDBFC4", headerFrom: "#D45079", headerTo: "#9C2E56", headerText: "#FDF1F2" },
  },
  midnight: {
    label: { fa: "تیره (شب)", en: "Midnight" },
    // این یگانه تمِ عمداً تیره‌ست (شب) — پس هدرش هم تیره می‌مونه، ولی حالا
    // با یه گرادیانتِ بنفشِ‌آبیِ واضح به‌جای رنگِ صافِ نزدیک‌به‌مشکی.
    swatch: "#3F51B5",
    values: { paper: "#1B1F2A", paperDark: "#262C3B", ink: "#F1E8D6", inkSoft: "#C9C2AE", gold: "#D9A441", goldSoft: "#8A6A2C", teal: "#5FA997", rose: "#D9776A", cardBorder: "#3A4258", headerFrom: "#4A5AC4", headerTo: "#232A3D", headerText: "#F1E8D6" },
  },
  sunset: {
    label: { fa: "غروب", en: "Sunset" },
    swatch: "#E8622C",
    values: { paper: "#FCEFE2", paperDark: "#F5DFC6", ink: "#3A2313", inkSoft: "#6B4A2C", gold: "#D9752E", goldSoft: "#F0B784", teal: "#4E7A6E", rose: "#B23A3A", cardBorder: "#E6C79E", headerFrom: "#F0793D", headerTo: "#C24A34", headerText: "#FDF3E7" },
  },
  lavender: {
    label: { fa: "بنفش (اسطوخودوس)", en: "Lavender" },
    swatch: "#8E44AD",
    values: { paper: "#F1EEF8", paperDark: "#E1DAF0", ink: "#2C2140", inkSoft: "#4C3E68", gold: "#7A5FA8", goldSoft: "#C5B3E3", teal: "#4C7A8A", rose: "#A8517F", cardBorder: "#D2C5EA", headerFrom: "#9C5FC4", headerTo: "#6A3F92", headerText: "#F8F3FC" },
  },
  mint: {
    label: { fa: "نعنایی", en: "Mint" },
    swatch: "#1AAE8C",
    values: { paper: "#EAF7F1", paperDark: "#D6EEE2", ink: "#12332A", inkSoft: "#2E5548", gold: "#2E9E7B", goldSoft: "#9BDCC3", teal: "#2E9E7B", rose: "#B25353", cardBorder: "#BEE0D0", headerFrom: "#2BC49E", headerTo: "#1B8F71", headerText: "#F2FBF7" },
  },
  // ۶ تمِ جدید — طبقِ درخواستِ کاربر برای تنوعِ بیشترِ رنگی؛ هرکدوم دقیقاً
  // با همون ساختارِ کاملِ تم‌های بالا (paper/ink/gold/teal/... + رنگِ
  // اختصاصیِ هدر) طراحی شدن، نه فقط یه سواچِ تکی.
  amber: {
    label: { fa: "کهربایی", en: "Amber" },
    swatch: "#F0A202",
    values: { paper: "#FDF4E3", paperDark: "#F7E7C4", ink: "#3D2B0E", inkSoft: "#6B4F22", gold: "#D98E04", goldSoft: "#F3C567", teal: "#4E7A3A", rose: "#B23A3A", cardBorder: "#EEDBA6", headerFrom: "#F5A623", headerTo: "#C77800", headerText: "#FFF8EC" },
  },
  coral: {
    label: { fa: "مرجانی", en: "Coral" },
    swatch: "#FF6F61",
    values: { paper: "#FDECE9", paperDark: "#F8D7D0", ink: "#3A1B15", inkSoft: "#6B3A2E", gold: "#E0644F", goldSoft: "#F5AFA0", teal: "#3F8E85", rose: "#E0644F", cardBorder: "#F0C4B8", headerFrom: "#FF7A62", headerTo: "#D9432E", headerText: "#FFF3EF" },
  },
  sky: {
    label: { fa: "آسمانی", en: "Sky" },
    swatch: "#4FC3F7",
    values: { paper: "#EAF7FD", paperDark: "#D5EEFA", ink: "#123244", inkSoft: "#2E5568", gold: "#2B93C4", goldSoft: "#9BD8EF", teal: "#2B93C4", rose: "#C0504F", cardBorder: "#BFE3F3", headerFrom: "#63C8F5", headerTo: "#1E86B8", headerText: "#F2FBFE" },
  },
  berry: {
    label: { fa: "توتی", en: "Berry" },
    swatch: "#9C1F5C",
    values: { paper: "#F8ECF1", paperDark: "#EED8E2", ink: "#350F22", inkSoft: "#5E2C42", gold: "#A8356E", goldSoft: "#DE9AB9", teal: "#6C3B57", rose: "#A8356E", cardBorder: "#E0C0D0", headerFrom: "#B93A79", headerTo: "#7A1E4C", headerText: "#FCF0F5" },
  },
  olive: {
    label: { fa: "زیتونی", en: "Olive" },
    swatch: "#6B8E23",
    values: { paper: "#F3F2E6", paperDark: "#E6E4CC", ink: "#2B2E17", inkSoft: "#4C512C", gold: "#8A7A2F", goldSoft: "#C9BE7E", teal: "#6B8E23", rose: "#A15A3A", cardBorder: "#D8D6B0", headerFrom: "#7FA02E", headerTo: "#556B1B", headerText: "#F6F8EA" },
  },
  slate: {
    label: { fa: "دودی", en: "Slate" },
    swatch: "#5B7C99",
    values: { paper: "#EEF2F5", paperDark: "#DFE6EB", ink: "#1D2C38", inkSoft: "#3D5566", gold: "#4E7B99", goldSoft: "#A9C6D6", teal: "#4E7B99", rose: "#B0524A", cardBorder: "#CBD8E0", headerFrom: "#6E93B0", headerTo: "#3E5F78", headerText: "#F3F7FA" },
  },
};
// Font-family presets. Loaded in index.html via Google Fonts <link>.
// The 3 new presets below (elegant / rounded / warm) need these Google
// Fonts <link> tags added to index.html if not already present:
//   Aref+Ruqaa, Playfair+Display, Noto+Kufi+Arabic, Poppins,
//   Noto+Sans+Arabic, Nunito
export const APP_FONTS = {
  default: { label: { fa: "پیش‌فرض", en: "Default" }, fa: "'Vazirmatn', sans-serif", latin: "'Lora', serif" },
  modern: { label: { fa: "مدرن", en: "Modern" }, fa: "'Vazirmatn', sans-serif", latin: "'Inter', sans-serif" },
  classic: { label: { fa: "کلاسیک", en: "Classic" }, fa: "'Noto Naskh Arabic', serif", latin: "'Merriweather', serif" },
  elegant: { label: { fa: "شیک", en: "Elegant" }, fa: "'Aref Ruqaa', serif", latin: "'Playfair Display', serif" },
  rounded: { label: { fa: "گرد", en: "Rounded" }, fa: "'Noto Kufi Arabic', sans-serif", latin: "'Poppins', sans-serif" },
  warm: { label: { fa: "گرم", en: "Warm" }, fa: "'Noto Sans Arabic', sans-serif", latin: "'Nunito', sans-serif" },
};
// Font-size presets — applied as a CSS `zoom` on the app's root wrapper
// (simplest way to scale an app that's built with fixed px sizes
// throughout, without rewriting every fontSize to rem). Supported in
// Chrome/Edge/Safari and current Firefox; on the rare browser without
// `zoom` support the app still works, just always at 100% size.
export const APP_FONT_SIZES = {
  small: { label: { fa: "کوچک", en: "Small" }, zoom: 0.9 },
  medium: { label: { fa: "متوسط (پیش‌فرض)", en: "Medium (default)" }, zoom: 1 },
  large: { label: { fa: "بزرگ", en: "Large" }, zoom: 1.15 },
  xlarge: { label: { fa: "خیلی بزرگ", en: "Extra large" }, zoom: 1.3 },
};
// Supported UI (software) languages — independent from the "native
// language" / "target languages" the user picks for practicing. This one
// controls what language the app's own interface (menus, tabs, buttons)
// is shown in.
export const APP_LANGUAGES = {
  fa: { label: "فارسی", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
};
export const fontFa = "var(--font-fa)";
export const fontLatin = "var(--font-latin)";
