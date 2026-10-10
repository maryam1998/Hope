// خواندن/نوشتن SRT
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// هوکِ مدیریتِ صوتِ کاربر برای یک داستانِ مشخص (storyKey پایدار — معمولاً
// mainStoryKey). یک <audio> واقعی رو کنترل می‌کنه — بدونِ هیچ محدودیتی
// رو فرمتِ فایل. هیچ هایلایت/خوانشِ خودکاری بر اساسِ زمانِ صدا انجام
// نمی‌شه؛ خطِ فعال فقط با دکمه‌های «جمله‌ی قبل/بعد» (که خودِ کاربر پایینِ
// پلیر می‌زنه) عوض می‌شه — یه شمارنده‌ی ساده (manualIndex) که کاملاً
// مستقل از currentTimeِ صداست.
// ============================================================
// ابزارِ SRT — کاربر یه فایلِ زیرنویسِ srt وارد می‌کنه، متنِ هر بلوک
// (بدونِ دست‌زدن به شماره/تایم‌کد) ترجمه می‌شه، و در نهایت یه فایلِ srt
// جدید (با همون تایم‌کدها ولی متنِ ترجمه‌شده) قابلِ دانلوده — تا کاربر
// خودش تو پلیرِ ویدیو/صوتِ خودش (بیرون از این اپ) بارش کنه.
// ============================================================
export function parseSRT(raw) {
  const text = (raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/);
  const entries = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.length || l === "");
    if (!lines.length) continue;
    let idx = 0;
    let timeLineIdx = 0;
    // خطِ اول ممکنه شماره‌ی بلوک باشه (اختیاری در بعضی فایل‌ها)
    if (/^\d+$/.test(lines[0].trim())) {
      idx = parseInt(lines[0].trim(), 10);
      timeLineIdx = 1;
    }
    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes("-->")) continue;
    const [start, end] = timeLine.split("-->").map((s) => s.trim());
    const textLines = lines.slice(timeLineIdx + 1);
    entries.push({
      index: idx || entries.length + 1,
      start,
      end,
      text: textLines.join("\n"),
    });
  }
  return entries;
}
export function serializeSRT(entries) {
  return entries
    .map((e, i) => `${i + 1}\n${e.start} --> ${e.end}\n${e.text}\n`)
    .join("\n");
}
