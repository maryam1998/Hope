// توابع و ثابت‌های بدونِ وابستگی به state (از StoryBuilder بیرون کشیده شد؛ منطق دست‌نخورده).


export function pdfImgTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// نمایش/ترجمه‌ی تدریجی: به‌جای رندر و صف‌کردنِ ترجمه‌ی همه‌ی پاراگراف‌ها
// یه‌جا (که برای داستان‌های خیلی بلند — مثلاً از PDF — هم DOM رو سنگین
// می‌کنه و هم صدها/هزاران درخواستِ ترجمه رو یه‌جا صف می‌کنه و کاربر تا
// آخرِ کل کار هیچی نمی‌بینه)، فقط این تعداد پاراگرافِ اول رندر/ترجمه
// می‌شه؛ با دکمه‌ی «نمایش بیشتر» جلو می‌ره.
export const PARAGRAPH_PAGE_SIZE = 15;

// -----------------------------------------------------------------------
// بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده روی لیستِ داستان‌های
// ذخیره‌شده — همون الگویِ WordList/SavedWordsPanel، اینجا واحدِ لیست
// خودِ داستان‌هاست (نه لغات تکی). شمارنده‌ها هر بار از رویِ readIds و
// لیستِ فعلی (فیلترشده/مرتب‌شده) دوباره محاسبه می‌شن، نه عددِ ثابت.
export const STORY_LIST_ID = "storyBuilder";

// آپلودِ PDF برای «منبعِ لغت» — استخراجِ متن با pdf.js (لود می‌شه از CDN،
// فقط وقتی واقعاً لازم بشه، نه موقعِ بازشدنِ اپ) کاملاً سمتِ مرورگرِ
// خودِ کاربره؛ هیچ فایلی جایی آپلود نمی‌شه، و نتیجه‌ش هم مثلِ بقیه‌ی
// منبع‌های لغت فقط تو localStorage (روی همین گوشی) ذخیره می‌شه، نه تو
// Supabase — پس نیازی به ارتقاءِ پلن نداره.
export const PDF_MAX_BYTES = 500 * 1024 * 1024;

 // ۵۰۰ مگابایت
export const PDF_MAX_CHARS = 20000;

// «وارد کردنِ PDF برای خوانش» — برخلافِ آپلودِ PDF بالا (که فقط برای
// «منبعِ لغت» بود)، این‌یکی کلِ متنِ PDF رو مستقیم می‌ذاره تو همون
// سیستمِ خوانشِ داستان (پاراگراف‌به‌پاراگراف/جمله‌به‌جمله، هایلایت،
// ترجمه، صدا) — بدون اینکه از هوش‌مصنوعی بخوایم داستانی بسازه؛ یعنی
// paragraphs رو مستقیم از خودِ متنِ PDF می‌سازیم، دقیقاً هم‌شکلِ همون
// چیزی که generateStory در پایان تولید می‌کنه، پس تمام رابط کاربریِ
// پایین (که به paragraphs/currentStoryId وصله) بدونِ هیچ
// تغییری کار می‌کنه. کاربر بعداً خودش با پاپ‌آپِ لغت تصمیم می‌گیره کدوم
// لغت‌ها رو «ذخیره برای داستانِ بعدی» یا «افزودن به جعبه‌ی لایتنر» کنه.
export const PDF_READ_MAX_BYTES = 500 * 1024 * 1024;

 // ۵۰۰ مگابایت
export const PDF_READ_SENTENCES_PER_PARAGRAPH = 5;

 // استخراجِ PDF معمولاً مرزِ پاراگرافِ واقعی رو حفظ نمی‌کنه، پس خودمون هر ۵ جمله رو یه «پاراگراف» حساب می‌کنیم تا خوانا بمونه
export const PDF_READ_MAX_SENTENCES = 2000;

// «وارد کردنِ عکس برای خوندن/ترجمه» — همون منطقِ handlePdfImportForReading
// بالا (paragraphs مستقیم از رویِ متنِ استخراج‌شده ساخته می‌شه، بدونِ
// دخالتِ AI)، با این تفاوت که به‌جایِ pdf.js از Tesseract.js برای OCR
// (تشخیصِ متنِ رویِ عکس) استفاده می‌کنیم. کاربر می‌تونه چند عکس رو یه‌جا
// انتخاب کنه (مثلاً چند صفحه از یه کتاب که خودش عکس گرفته) — متنِ همه‌ی
// عکس‌ها به‌ترتیب به هم می‌چسبه و یه داستان/متنِ واحد برای خوندن می‌شه.
export const IMAGE_READ_MAX_BYTES_PER_FILE = 25 * 1024 * 1024;

 // ۲۵ مگابایت برای هر عکس
// 🐛 عکس‌های تزئینی/پوستری معمولاً دورشون کادر/گل‌وبوته/خط‌تزئینی دارن —
// Tesseract قبلاً کلِ عکس (از جمله همون تزئینات) رو هم سعی می‌کرد بخونه،
// و چیزهایی مثل کادرهای طلایی رو به‌غلط به یه مشت حرف/علامتِ الکی
// (مثلاً «ge((5 $C” 2) (=)...») تبدیل می‌کرد که هم خودش قاطیِ اولِ متنِ
// واقعی می‌شد، هم چون پر از نقل‌قول/پرانتز بود باعث می‌شد سرویسِ ترجمه
// به‌جای بعضی نویسه‌ها موجودیت‌های HTML خام (مثلِ &quot; یا &#10;) برگردونه.
// Tesseract به‌ازای هر کلمه یه «میزانِ اطمینان» (confidence، بینِ ۰ تا ۱۰۰)
// هم می‌ده؛ نویسه‌های تزئینیِ غیرمتنی معمولاً اطمینانِ خیلی پایینی می‌گیرن
// (بر خلافِ متنِ واقعیِ تایپ‌شده که اطمینانِ بالایی داره). این تابع فقط
// کلماتی که اطمینانِ کافی دارن رو نگه می‌داره، پس اون آشغال‌های تزئینی
// قبل از این‌که وارد متنِ خوانش/ترجمه بشن حذف می‌شن.
export const IMAGE_READ_MIN_WORD_CONFIDENCE = 62;

// 🐛 فیلترِ اطمینان به‌تنهایی کافی نبود: نویسه‌های تزئینیِ حاشیه (گل‌وبوته،
// خط‌های جداکننده) که کنارِ هم یه شکلِ نامفهوم می‌سازن (مثلِ «5°»، «§ [%»،
// «A i i ,.») گاهی از نظرِ خودِ Tesseract اطمینانِ بالایی هم می‌گیرن — چون
// مطمئنه یه‌چیزی اونجا هست، فقط نمی‌دونه دقیقاً چیه. این تابع هر «کلمه»‌ای
// که بیشترِ نویسه‌هاش حرف نباشن (یعنی بیشتر از علامت/عدد/فاصله تشکیل شده)
// رو هم حذف می‌کنه، چون متنِ زبانِ واقعی تقریباً همیشه بیشترش حرفه.
export const MIN_LETTER_RATIO = 0.5;

export function wordLooksLikeText(word) {
  if (!word) return false;
  const letters = (word.match(/\p{L}/gu) || []).length;
  return letters / word.length >= MIN_LETTER_RATIO;
}

export function cleanOcrPageText(data) {
  const words = data?.words;
  if (Array.isArray(words) && words.length) {
    return words
      .filter((w) => (typeof w.confidence === "number" ? w.confidence : 100) >= IMAGE_READ_MIN_WORD_CONFIDENCE)
      .filter((w) => wordLooksLikeText(w.text))
      .map((w) => w.text)
      .join(" ")
      .trim();
  }
  return (data?.text || "").trim();
}

// 🐛 عکس‌هایی که ورودیِ OCR می‌شن معمولاً پوستر/عکسِ چاپی‌ان، نه اسکنِ
// سفیدِ ساده — متنِ تیره روی زمینه‌ی گرادیانی/عکسِ رنگی (مثلِ آسمونِ
// غروب یا کاغذِ قدیمی) کنتراستِ پایینی داره و همین باعثِ اشتباه‌خوانی‌های
// فاحش می‌شه (مثلاً «These» رو «J» یا «Help» رو «ME» تشخیص بده). این تابع
// قبل از OCR، عکس رو خاکستری می‌کنه و کنتراستش رو تا سیاه‌ترین/سفیدترین
// نقطه‌ی واقعیِ خودِ عکس می‌کِشه (اگه عکس از قبل کنتراستِ خوبی داشت، این
// عملاً بی‌اثره)؛ و اگه عکس کوچیک بود (مثلاً یه اسکرین‌شاتِ فشرده) تا
// حداقلِ ۱۶۰۰پیکسل بزرگش می‌کنه، چون فونت‌های تزئینی/کج به‌جزئیاتِ
// بیشتری نیاز دارن تا شکلِ حرف‌ها قاطیِ هم نشه.
export async function preprocessImageForOcr(file) {
  const bitmap = await createImageBitmap(file);
  const MIN_LONG_SIDE = 1600;
  const longSide = Math.max(bitmap.width, bitmap.height);
  const scale = longSide < MIN_LONG_SIDE ? MIN_LONG_SIDE / longSide : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  let minLum = 255, maxLum = 0;
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    lum[p] = g;
    if (g < minLum) minLum = g;
    if (g > maxLum) maxLum = g;
  }
  const range = Math.max(maxLum - minLum, 1);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const stretched = Math.min(255, Math.max(0, ((lum[p] - minLum) / range) * 255));
    px[i] = px[i + 1] = px[i + 2] = stretched;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// «خروجی PDF دوزبانه» — فایلِ خامِ PDF (عکس‌ها/چیدمانِ اصلی) دست‌نخورده
// می‌مونه: هر صفحه با pdf.js دقیقاً همون‌جوری که هست به یک عکس رندر و
// در یک PDFِ خروجیِ تازه گذاشته می‌شه، و بلافاصله بعدش یک صفحه‌ی
// «روبرو»ی ترجمه اضافه می‌شه (متنِ همون صفحه، ترجمه‌شده). چون کشیدنِ
// مستقیمِ متنِ فارسی/عربی با pdf-lib شکلِ حروف رو به‌هم نمی‌چسبونه (بدونِ
// text-shaping بدشکل درمیاد)، ترجمه رو هم با canvas (fillText خودِ
// مرورگر که shaping/جهتِ RTL رو کامل بلده) می‌کِشیم و مثلِ صفحه‌ی اصلی،
// به‌صورتِ عکس embed می‌کنیم — نتیجه یک PDFِ واحد با متنِ اصلی و ترجمه‌ی
// روبروی هم، برای هر صفحه.
export const BILINGUAL_PDF_MAX_BYTES = 80 * 1024 * 1024;

 // ۸۰ مگابایت — رندرِ تصویریِ صفحه‌به‌صفحه از استخراجِ صرفِ متن سنگین‌تره
export const BILINGUAL_PDF_MAX_PAGES = 60;

 // سقفِ صفحات، تا رندر+ترجمه رو موبایل خیلی طول نکشه/قفل نکنه
export const BILINGUAL_PDF_RENDER_SCALE = 1.6;

// «نمایشِ PDF همینجا» — حالتِ دومِ بارگذاریِ PDF. به‌جای رندرِ از پیش هر
// صفحه به یک عکسِ ثابت، بایتِ خامِ خودِ فایل ذخیره می‌شه و هر صفحه با
// PdfLivePageView همون لحظه که کاربر می‌بینتش زنده رندر می‌شه — یعنی یک
// ویووِرِ واقعیِ PDF، با لایه‌ی متنِ قابلِ‌سلکت، نه یک عکس. متنِ هر صفحه
// هم همچنان از قبل استخراج و ترجمه می‌شه (برای باکسِ ترجمه‌ی روبرو و
// بخشِ «نمایشِ متنِ اصلی (کلیک‌پذیر)»).
export const PDF_VIEW_MAX_BYTES = 80 * 1024 * 1024;

// استخراجِ «متنِ اصلیِ» یه صفحه‌ی وب از رویِ HTMLِ خامش — یعنی بدنه‌ی
// نوشته (مقاله/پست)، نه منو/هدر/فوتر/سایدبار/تبلیغ/اسکریپت. اول دنبالِ
// تگ‌های معناداری مثلِ <article> یا <main> می‌گردیم (رایج‌ترین الگو تو
// سایت‌های خبری/وبلاگ‌ها)؛ اگه نبود، بینِ همه‌یِ بلاک‌های باقی‌مونده
// (بعدِ حذفِ nav/header/footer/aside/script/style) اونی که بیشترین حجمِ
// متن رو داره انتخاب می‌شه — یه heuristic ساده ولی برای اکثرِ صفحات کافیه.
export const extractMainBodyText = (html) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, nav, header, footer, aside, svg, form, iframe").forEach((el) => el.remove());
  const direct = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role='main']");
  if (direct && direct.textContent.trim().length > 200) {
    return direct.textContent;
  }
  const candidates = doc.body ? Array.from(doc.body.querySelectorAll("div, section, article")) : [];
  let best = doc.body;
  let bestLen = 0;
  for (const el of candidates) {
    // بلاک‌هایی که خودشون یه بلاکِ بزرگ‌تر رو کامل تو خودشون دارن، حساب
    // نمی‌شن (وگرنه همیشه بالاترین والد برنده می‌شد) — فقط طولِ متنِ
    // مستقیمِ خودِ این تگ (بدونِ فرزندهای بلاکیِ تو در تو) مهمه.
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 || ["P", "SPAN", "STRONG", "EM", "B", "I", "A"].includes(n.nodeName))
      .map((n) => n.textContent)
      .join(" ");
    if (ownText.length > bestLen) {
      bestLen = ownText.length;
      best = el;
    }
  }
  return (bestLen > 200 ? best : doc.body)?.textContent || "";
};

// اگه لینکِ واردشده یه ویدیوی یوتیوب باشه (watch؟v=، youtu.be/،
// shorts/، embed/، یا حتی خودِ آی‌دیِ خام)، آی‌دیِ ویدیو رو برمی‌گردونه؛
// وگرنه null — تا handleLinkImportForReading بفهمه باید متنِ صفحه رو
// بخونه یا زیرنویسِ ویدیو رو.
export const extractYouTubeVideoId = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // URL نامعتبر بود
  }
  return null;
};
