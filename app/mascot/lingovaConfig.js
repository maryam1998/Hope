// ثابت‌های ماسکات و موقعیت
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ---------------------------------------------------------------------------
// آدمکِ Lingova — یه شخصیتِ کوچیکِ SVG که بالای هدر، تصادفی راه می‌ره، یه
// چماق دستشه، و حواسش به «خوندن»ه: هر از گاهی می‌ایسته و انگار داره متن رو
// می‌خونه (سرش خم می‌شه پایین)، بعد دوباره یه مقصدِ تصادفیِ دیگه انتخاب
// می‌کنه و راه می‌افته. اگه کاربر چند دقیقه هیچ تعاملی (لمس/اسکرول/کلیک/
// کیبورد) با صفحه نداشته باشه، آدمک وایمیسته، چماق رو بالا می‌گیره، و یه
// حبابِ کوچیکِ یادآوری («بخون دیگه!») نشون می‌ده — تا کاربر دوباره تعامل
// کنه، برمی‌گرده به راه‌رفتنِ عادی.
// ---------------------------------------------------------------------------
export const LINGOVA_MASCOT_WIDTH = 30;
export const LINGOVA_MASCOT_HEIGHT = 38;
export const LINGOVA_IDLE_MS = 6000; // بعدِ این‌قدر بی‌تعاملی، پیام‌های یادآوری فعال می‌شن
export const LINGOVA_LEG_MSG_COUNT = 2; // تعدادِ پیامی که تو هر «رفت» یا هر «برگشت» نشون داده می‌شه
export const LINGOVA_LEG_MSG_PAUSE_MS = 2000; // مکثِ کوتاهِ نمایشِ هر پیام
// بازه‌ی تصادفیِ فاصله (بر حسبِ میلی‌ثانیه، از لحظه‌ای که کاربر بی‌تعامل
// می‌شه) که هر کدوم از دو پیامِ هر پا سرِ اون لحظه ظاهر می‌شه — کاملاً
// زمان‌محوره، نه موقعیت‌محور، پس به مکانِ آدمک رویِ صفحه (و درنتیجه به
// عرضِ گوشی) هیچ ربطی نداره.
export const LINGOVA_LEG_MSG_MIN_DELAY_MS = 500;
export const LINGOVA_LEG_MSG_MAX_DELAY_MS = 7000;
export const LINGOVA_TURN_PAUSE_MS = 400; // مکثِ خیلی کوتاه سرِ لبه، قبلِ از برگشتن
// کلیدهای UI_STRINGS برای پیام‌های حباب — به‌جای متنِ ثابتِ فارسی، از سیستمِ
// زبانِ نرم‌افزار (tr/uiLang) خونده می‌شن تا با تغییرِ زبونِ اپ، این پیام‌ها
// هم خودکار انگلیسی/فارسی بشن.
export const LINGOVA_BUBBLE_KEYS = ["lingovaBubbleRead", "lingovaBubbleKeepGoing", "lingovaBubbleStillThere", "lingovaBubbleHeyYou"];
// دو‌بار‌زدنِ سریع (بدونِ حرکتِ محسوس بینِ دوتاش) رویِ آدمک — بینِ حالتِ
// «همیشه رویِ صفحه، حتی موقعِ اسکرول» (پیش‌فرض) و حالتِ «چسبیده به هدر، با
// اسکرول‌کردنِ صفحه از دید خارج می‌شه» جابه‌جا می‌کنه.
export const LINGOVA_DOUBLE_TAP_MS = 350; // حداکثر فاصله‌ی زمانیِ بینِ دو تپ
export const LINGOVA_TAP_MOVE_TOLERANCE = 10; // px — بیشتر از این یعنی درگه، نه یه تپِ ساده
export const LINGOVA_DOUBLE_TAP_DIST_TOLERANCE = 26; // px — حداکثر فاصله‌ی مکانیِ بینِ دو تپ
export const LINGOVA_LONG_PRESS_MS = 550; // نگه‌داشتنِ بیشتر از این (بدونِ حرکتِ محسوس) یعنی long-press
// سه دست‌لباسِ متنوع برای آدمک — روی تنه (پیراهن) و پاها (شلوار) اعمال
// می‌شه. گزینه‌ی اول از رنگِ تمِ فعلیِ اپ پیروی می‌کنه (دقیقاً همون ظاهرِ
// قبلی)؛ دو گزینه‌ی بعدی رنگ‌های ثابت دارن تا مستقل از تمِ انتخابی، همیشه
// قابلِ‌تشخیص و متفاوت از هم باشن.
export const LINGOVA_OUTFITS = {
  classic: { shirt: null, pants: null }, // null یعنی از colors.teal/colors.ink (رنگِ تم) استفاده کن
  scout: { shirt: "#c0562f", pants: "#33302b" },
  royal: { shirt: "#6a3fb5", pants: "#142c46" },
};
export const LINGOVA_OUTFIT_KEYS = Object.keys(LINGOVA_OUTFITS);
// ---------------------------------------------------------------------------
// «سنجاق‌شدنِ» آدمک با درگ‌کردن — وقتی کاربر با انگشت آدمک رو می‌گیره و
// یه‌جای دیگه‌ی صفحه ول می‌کنه، دیگه تو نوارِ بالای صفحه راه نمی‌ره؛ همون‌جا
// می‌مونه و سرِ پا قدم می‌زنه. موقعیت به‌صورتِ درصدِ عرض/ارتفاعِ صفحه توی
// localStorage ذخیره می‌شه (نه پیکسلِ خام) تا با تغییرِ سایزِ صفحه/چرخشِ
// گوشی هم نسبی درست بمونه؛ اگه کاربر هنوز هیچ‌وقت درگش نکرده باشه، این مقدار
// خالیه و آدمک دقیقاً مثلِ قبل بالای صفحه راه می‌ره.
const LINGOVA_POS_STORAGE_KEY = "lingova-mascot-pos-v1";
export function loadLingovaPinnedPos() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LINGOVA_POS_STORAGE_KEY);
    if (!raw) return null;
    const { xPct, yPct } = JSON.parse(raw);
    if (typeof xPct !== "number" || typeof yPct !== "number" || Number.isNaN(xPct) || Number.isNaN(yPct)) return null;
    return {
      left: Math.max(0, Math.min(window.innerWidth - LINGOVA_MASCOT_WIDTH, xPct * window.innerWidth)),
      top: Math.max(0, Math.min(window.innerHeight - LINGOVA_MASCOT_HEIGHT, yPct * window.innerHeight)),
    };
  } catch {
    return null;
  }
}
export function saveLingovaPinnedPos(left, top) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LINGOVA_POS_STORAGE_KEY,
      JSON.stringify({ xPct: left / window.innerWidth, yPct: top / window.innerHeight })
    );
  } catch {
    // localStorage در دسترس نیست — مشکلی نیست، فقط موقعیت بینِ نشست‌ها یادش نمی‌مونه
  }
}
