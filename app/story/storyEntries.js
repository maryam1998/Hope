// ورودی‌های ذخیره‌شده‌ی داستان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { TTS_LOCALE } from "../tts/ttsConfig.js";

// 📺 نمایشگرِ «زیرنویسِ ذخیره‌شده‌ی یوتیوب» — خط‌های ذخیره‌شده از حباب (متنِ اصلی + ترجمه‌ها) و
// لینکِ ویدیو. زمانِ هر خط لینکِ همون ثانیه از ویدیو رو باز می‌کنه.
function openExternalLink(url) {
  try {
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
    if (B && B.openExternal) { B.openExternal({ url }).catch(() => window.open(url, "_blank")); return; }
  } catch (e) { /* ignore */ }
  window.open(url, "_blank");
}
// 📺 ذخیره‌های لینک/منبع (یوتیوب، اینستاگرام، تیک‌تاک، تلگرام…): با زدن روی کارت، مستقیم همان لینک یا
// همان برنامه‌ی مبدأ باز می‌شود.
export function openYtSource(entry) {
  try {
    if (entry && entry.ytUrl) { openExternalLink(entry.ytUrl); return; }
    const src = entry && entry.ytSource;
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
    if (src && src.pkg && !src.inApp && B && B.openApp) B.openApp({ pkg: src.pkg }).catch(() => {});
  } catch (e) { /* ignore */ }
}
// متنِ کاملِ یه داستانِ ذخیره‌شده رو از روی paragraphs می‌سازه — دقیقاً با
// همون منطقِ fullStoryText/allSentences که داخلِ خودِ StoryBuilder برای
// داستانِ فعلی استفاده می‌شه؛ اینجا برای این لازمه که بتونیم، بدونِ باز
// کردنِ هر داستان، کلیدِ صوتِ آپلودیِ اون رو (که بر اساسِ متن ساخته می‌شه)
// حساب کنیم و بفهمیم آیا صدایی براش ذخیره شده یا نه.
export function getStoryEntryFullText(entry) {
  // 📺 زیرنویسِ ذخیره‌شده از حبابِ یوتیوب: متنِ منبعِ همه‌ی خط‌ها (+ترجمه‌ها برای جستجو)
  if (entry && entry.ytSession) return ""; // متنِ ویدیو/صوت ذخیره/استفاده نمی‌شود؛ فقط لینک و منبع
  if (!entry || !Array.isArray(entry.paragraphs)) return "";
  return entry.paragraphs
    .flatMap((p) => (p?.sentences || []).map((s) => s?.text || ""))
    .join(" ");
}
// همون کلیدی که useStoryUserAudio/mainStoryKey برای داستانِ بازِ فعلی
// می‌سازه — `${locale}::${fullText}` — تا صوتِ آپلودیِ هر داستانِ
// ذخیره‌شده رو بدونِ بازکردنش تو IndexedDB پیدا کنیم.
export function getStoryEntryAudioKey(entry) {
  const text = getStoryEntryFullText(entry);
  if (!text) return null;
  return `${TTS_LOCALE[entry.storyLang] || "en-US"}::${text}`;
}
// یه تکه از متنِ خودِ داستان (نه لیستِ لغات) به‌عنوانِ نامِ کارت — درست
// مثل وقتی خودِ متن رو موقعِ ساختن/ذخیره‌کردن می‌بینیم.
export function getStoryEntryPreview(entry, maxLen) {
  const limit = maxLen || 70;
  const text = getStoryEntryFullText(entry).trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}
