// تاریخ شمسی/میلادی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// --- Jalali (Persian) calendar conversion --------------------------------
// Well-known Gregorian→Jalali algorithm (accurate for the whole modern
// range we care about). Used to show saved-story timestamps in Shamsi,
// Gregorian, or both, based on the user's choice in Settings.
const PERSIAN_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function toFaDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    parseInt((gy2 + 3) / 4) -
    parseInt((gy2 + 99) / 100) +
    parseInt((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + parseInt(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + parseInt((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}
function formatJalaliDateTime(date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const jmStr = String(jm).padStart(2, "0");
  const jdStr = String(jd).padStart(2, "0");
  // فرمتِ خواسته‌شده: ۱۴۰۵/۰۵/۲۰     ۲۰:۱۱ — سال/ماه/روزِ عددی (هرکدوم
  // دو رقمی با صفرِ ابتدایی)، بعد چند فاصله‌ی ثابت (با نویسه‌ی nbsp تا
  // مرورگر جمعشون نکنه)، بعد ساعت:دقیقه.
  return toFaDigits(`${jy}/${jmStr}/${jdStr}\u00A0\u00A0\u00A0\u00A0\u00A0${hh}:${mm}`);
}
function formatGregorianDateTime(date) {
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
// همینا ولی فقط تاریخ (بدون ساعت) و با نامِ روزِ هفته — برای هدرِ
// گروه‌بندیِ روزانه‌ی یادداشت‌های گرامر (GrammarPanel)، که قبلاً بدونِ توجه
// به calendarSystem همیشه با toLocaleDateString(nativeLang) رندر می‌شد و
// همین باعثِ ناهماهنگی با بقیه‌ی جاهایی می‌شد که تنظیمِ تقویمِ کاربر رو
// رعایت می‌کنن (مثلاً تاریخِ داستان‌های ذخیره‌شده).
const PERSIAN_WEEKDAYS_SHORT = ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
function formatJalaliDateOnly(date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const weekday = PERSIAN_WEEKDAYS_SHORT[date.getDay()];
  const jmStr = String(jm).padStart(2, "0");
  const jdStr = String(jd).padStart(2, "0");
  return toFaDigits(`${weekday} ${jy}/${jmStr}/${jdStr}`);
}
function formatGregorianDateOnly(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
// calendarSystem: "jalali" | "gregorian" | "both" — تاریخِ خالی (بدونِ ساعت)
export function formatCalendarDateOnly(iso, calendarSystem) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  if (calendarSystem === "gregorian") return formatGregorianDateOnly(date);
  if (calendarSystem === "both") return `${formatJalaliDateOnly(date)} — ${formatGregorianDateOnly(date)}`;
  return formatJalaliDateOnly(date);
}
// calendarSystem: "jalali" | "gregorian" | "both"
export function formatSavedDate(iso, calendarSystem) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  if (calendarSystem === "gregorian") return formatGregorianDateTime(date);
  if (calendarSystem === "both") return `${formatJalaliDateTime(date)} — ${formatGregorianDateTime(date)}`;
  return formatJalaliDateTime(date);
}
