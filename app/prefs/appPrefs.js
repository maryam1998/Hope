// تنظیمات اپ، تب‌ها و ذخیره/بارگذاری
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { Heart, Sparkles, Bookmark, Layers, Mic, MessagesSquare, SpellCheck, BookA, MessageSquareQuote, Boxes } from "lucide-react";
import { LINGOVA_CHARACTER_KEYS } from "../../LINGOVA_CHARACTERS.js";
import { APP_FONTS, APP_FONT_SIZES, APP_LANGUAGES, APP_THEMES, HIGHLIGHT_COLOR_PALETTE } from "../ui/theme.js";
import { LINGOVA_OUTFIT_KEYS } from "../mascot/lingovaConfig.js";

export const STORAGE_KEY = "phrasebook-state-v1";
// Appearance preferences (theme / font family / font size) — separate from
// the per-account STORAGE_KEY above since these are device-level, not tied
// to any one user, and should already apply on the login screen before
// anyone's signed in.
const APP_PREFS_KEY = "phrasebook-app-prefs";
// ── پرچم‌هایِ نمایشِ بخش‌هایِ تنظیمات ──
// false = آن بخش در تنظیمات دیده نمی‌شود و اثرش هم اعمال نمی‌شود (آدمکِ کلاسیک با
// لباسِ پیش‌فرض و بدونِ عکسِ پس‌زمینه). برایِ برگرداندنِ هر بخش فقط همان پرچم را
// true کن؛ انتخاب‌هایِ قبلیِ کاربر پاک نمی‌شوند و دوباره کار می‌کنند.
export const SHOW_MASCOT_CHARACTER_OPTIONS = false;  // انتخابِ کاراکترِ آدمک (به‌جز کلاسیک)
export const SHOW_MASCOT_OUTFIT_OPTIONS = false;     // لباسِ آدمک
export const SHOW_CUSTOM_BG_OPTIONS = false;         // پس‌زمینه‌یِ سفارشی
// false = بخشِ «شخصی‌سازیِ ترتیبِ تب‌ها» در تنظیمات نشان داده نمی‌شود (ناوبری حالا
// بر اساسِ ۵ گروهِ ثابت است). برایِ برگرداندنش فقط true کن.
export const SHOW_TAB_ORDER_OPTIONS = false;
const CALENDAR_SYSTEMS = ["jalali", "gregorian", "both"];
// ── ترتیبِ تب‌ها (قابلِ شخصی‌سازی توسطِ کاربر) ──
// دو گروهِ جدا: سه تبِ داخلِ هدر، و نوارِ تب‌های زیرِ هدر. جابجایی فقط
// داخلِ هر گروهه تا طراحیِ هدر به‌هم نریزه. هر آیکون فقط برایِ یه تب استفاده شده.
export const PRIMARY_TAB_DEFAULT = ["conversations", "story", "saved"];
export const SECONDARY_TAB_DEFAULT = ["grammar", "speaking", "words", "vocabInUse", "slang", "favorites", "review"];
export const TAB_META = {
  conversations: { labelKey: "tabConversations", icon: MessagesSquare },
  story: { labelKey: "tabStory", icon: Sparkles },
  saved: { labelKey: "tabSaved", icon: Bookmark },
  grammar: { labelKey: "tabGrammar", icon: SpellCheck },
  speaking: { labelKey: "tabSpeaking", icon: Mic },
  words: { labelKey: "tabWords", icon: BookA },
  vocabInUse: { labelKey: "tabVocabInUse", icon: Layers },
  slang: { labelKey: "tabSlang", icon: MessageSquareQuote },
  favorites: { labelKey: "tabFavorites", icon: Heart },
  review: { labelKey: "tabReview", icon: Boxes },
};
// ── ناوبریِ ساده‌شده: ۵ گروهِ اصلی ──
// به‌جایِ ۱۰ تبِ هم‌ردیف، تب‌ها در ۵ گروه جمع شدند. ردیفِ بالا (توی هدر) فقط
// گروه‌ها را نشان می‌دهد؛ اگر گروهِ فعال بیش از یک تب داشته باشد، زیرِ هدر یک
// ردیفِ کوچک از زیرتب‌هایِ همان گروه ظاهر می‌شود. کلیدِ تب‌ها (tab) دست‌نخورده
// مانده، پس هر جایی که setTab("...") صدا زده می‌شود مثلِ قبل کار می‌کند.
export const TAB_GROUPS = [
  { key: "talk", labelKey: "groupTalk", icon: MessagesSquare, tabs: ["conversations", "speaking"] },
  { key: "story", labelKey: "groupStory", icon: Sparkles, tabs: ["story", "saved"] },
  { key: "words", labelKey: "groupWords", icon: BookA, tabs: ["words", "vocabInUse", "slang", "favorites"] },
  { key: "practice", labelKey: "groupPractice", icon: SpellCheck, tabs: ["grammar", "review"] },
];
export function groupOfTab(tabKey) {
  return TAB_GROUPS.find((g) => g.tabs.includes(tabKey)) || TAB_GROUPS[0];
}
// ترتیبِ ذخیره‌شده رو با لیستِ پیش‌فرض ادغام می‌کنه: کلیدهایِ ناشناخته حذف،
// تکراری‌ها یکی، و تبِ جدیدی که توی ذخیره‌شده نیست آخرِ گروه اضافه می‌شه.
function normalizeTabGroup(saved, defaults) {
  const out = [];
  if (Array.isArray(saved)) {
    for (const k of saved) if (defaults.includes(k) && !out.includes(k)) out.push(k);
  }
  for (const k of defaults) if (!out.includes(k)) out.push(k);
  return out;
}
export function normalizeTabOrder(saved) {
  const o = saved && typeof saved === "object" ? saved : {};
  return {
    primary: normalizeTabGroup(o.primary, PRIMARY_TAB_DEFAULT),
    secondary: normalizeTabGroup(o.secondary, SECONDARY_TAB_DEFAULT),
  };
}
export function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      theme: APP_THEMES[parsed.theme] ? parsed.theme : "vintage",
      font: APP_FONTS[parsed.font] ? parsed.font : "default",
      fontSize: APP_FONT_SIZES[parsed.fontSize] ? parsed.fontSize : "medium",
      uiLang: APP_LANGUAGES[parsed.uiLang] ? parsed.uiLang : "fa",
      calendarSystem: CALENDAR_SYSTEMS.includes(parsed.calendarSystem) ? parsed.calendarSystem : "jalali",
      highlightColor: (parsed.highlightColor === "none" || HIGHLIGHT_COLOR_PALETTE.includes(parsed.highlightColor)) ? parsed.highlightColor : HIGHLIGHT_COLOR_PALETTE[0],
      mascotOutfit: LINGOVA_OUTFIT_KEYS.includes(parsed.mascotOutfit) ? parsed.mascotOutfit : "classic",
      // آیا آدمکِ متحرکِ Lingova نمایش داده بشه یا نه — پیش‌فرض روشنه؛ خاموش
      // کردنش آدمک رو حذف نمی‌کنه، فقط با ترنزیشنِ opacity محو می‌شه (خودِ
      // راه‌رفتن/تایمرهاش پشتِ صحنه ادامه دارن، فقط دیده نمی‌شه).
      mascotEnabled: parsed.mascotEnabled !== false,
      // کدوم کاراکتر به‌جایِ آدمکِ کلاسیک نشون داده بشه — "classic" همون
      // آدمکِ اصلیِ کدنویسی‌شده‌ست (پیش‌فرض)، بقیه‌ی کلیدها از LINGOVA_CHARACTERS
      // میان (تصویرهایِ آماده‌ای که کاربر اضافه کرد).
      mascotCharacter: LINGOVA_CHARACTER_KEYS.includes(parsed.mascotCharacter) ? parsed.mascotCharacter : "classic",
      // پس‌زمینه‌ی سفارشی — خودِ عکس تو IndexedDB نگه داشته می‌شه (نه اینجا)؛
      // این دو تا فقط می‌گن آیا نشون داده بشه و با چه میزان شفافیتی.
      customBgEnabled: parsed.customBgEnabled === true,
      customBgOpacity: Number.isFinite(parsed.customBgOpacity) ? Math.min(90, Math.max(15, parsed.customBgOpacity)) : 55,
      tabOrder: normalizeTabOrder(parsed.tabOrder),
    };
  } catch (e) {
    return { theme: "vintage", font: "default", fontSize: "medium", uiLang: "fa", calendarSystem: "jalali", highlightColor: HIGHLIGHT_COLOR_PALETTE[0], mascotOutfit: "classic", mascotEnabled: true, mascotCharacter: "classic", customBgEnabled: false, customBgOpacity: 55, tabOrder: normalizeTabOrder(null) };
  }
}
export function saveAppPrefs(prefs) {
  try {
    localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
    // 🧬 به NeuralPath هم خبر بده که تنظیماتِ اپ عوض شده — چون اون فایل
    // مستقل از این فایله و از همون localStorage می‌خونه؛ این رویداد باعث
    // می‌شه تقویمِ مسیرِ عصبی همون لحظه خودش رو با تنظیمِ جدید تطبیق بده.
    window.dispatchEvent(new Event("phrasebook:appPrefsChanged"));
  } catch (e) {}
}
