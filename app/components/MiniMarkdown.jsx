// Markdown ساده + ترجمه با تپ روی کلمه
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState } from "react";
import { colors } from "../ui/theme.js";
import { translateFree } from "../translate/translateService.js";
import { isPersianScriptLine, mdInline, stripMdInline } from "../markdown/mdUtils.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { ClickableSentence } from "./story/ClickableSentence.jsx";

// یه لایه‌ی سبک برای «روی لغت زدن → دیدنِ ترجمه» — مخصوصِ متن‌هایی که به
// زبانِ مادریِ کاربر نوشته شدن (مثل توضیحِ گرامری) و ClickableSentence
// معمولی (که برعکس، از زبانِ خارجی به مادری ترجمه می‌کنه) روشون فعال
// نمی‌شه. اینجا هر کلمه‌ای که لمس/کلیک بشه، با translateFree به
// targetLangCode (مثلاً اولین زبانِ مقصدِ چیده‌شده‌ی کاربر) ترجمه و توی
// یه حبابِ کوچیک زیرِ همون کلمه نشون داده می‌شه.
// 🔥 React.memo — این کامپوننت هر بار که پنلِ چتِ تمرین رندر بشه (مثلاً با
// هر حرفی که تو کادرِ ورودی تایپ می‌شه، یا با تپ‌کردنِ رویِ یه پیام)، دوباره
// صدا زده می‌شد و کل کارِ سنگینِ پارس‌کردنِ مارک‌داون + توکِن‌کردنِ
// تک‌تکِ کلماتِ *همه‌ی* پیام‌های قبلی رو از نو انجام می‌داد — نه فقط پیامِ
// تغییریافته. هر چی مکالمه طولانی‌تر می‌شد، این کار سنگین‌تر می‌شد و همون
// «کندیِ روزافزونِ تپ‌کردن» که کاربر گزارش کرد رو می‌ساخت. با memo، وقتی
// props (متن/زبان/...) واقعاً عوض نشده، رندرِ دوباره‌ی این کامپوننت کاملاً
// رد می‌شه.
const TapWordTranslate = React.memo(function TapWordTranslate({ text, targetLangCode }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [results, setResults] = useState({});
  if (!text || !targetLangCode) return text || null;
  const tokens = String(text).split(/(\s+)/);
  const handleTap = async (idx, raw) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!word) return;
    if (openIdx === idx) {
      setOpenIdx(null);
      return;
    }
    setOpenIdx(idx);
    if (results[idx]) return;
    setResults((r) => ({ ...r, [idx]: "loading" }));
    try {
      const t = await translateFree(word, targetLangCode, "auto");
      setResults((r) => ({ ...r, [idx]: t || "—" }));
    } catch {
      setResults((r) => ({ ...r, [idx]: "—" }));
    }
  };
  return (
    <span dir="auto">
      {tokens.map((tok, idx) => {
        if (!tok || /^\s+$/.test(tok)) return <React.Fragment key={idx}>{tok}</React.Fragment>;
        return (
          // نکته‌ی مهم (دقیقاً مثلِ ClickableSentence): این span باید
          // display:inline بمونه، نه inline-block. inline-block هر کلمه رو
          // برای موتورِ بیدایِ مرورگر یه «جعبه‌ی اتمیک» جدا حساب می‌کنه؛ وقتی
          // چندتا از این جعبه‌ها پشتِ‌سرِهم داخلِ یه بلاکِ راست‌به‌چپ (فارسی)
          // می‌شینن، مرورگر با کلماتِ داخلِ هرکدوم مثلِ یه کاراکترِ خنثی رفتار
          // می‌کنه و کلِ ترتیبِ جعبه‌ها رو راست‌به‌چپ می‌چینه — یعنی دقیقاً
          // همون باگی که کاربر گزارش کرد: کلماتِ فارسی و حتی کلماتِ انگلیسیِ
          // وسطِ جمله هم بی‌ربط به‌هم‌ریخته/معکوس نشون داده می‌شن. با
          // display:inline، position:relative همچنان برای لنگرِ پاپ‌آپِ
          // زیرش کار می‌کنه، ولی دیگه جعبه‌ی اتمیکِ جدا نمی‌سازه و ترتیبِ
          // طبیعیِ بیدایِ یونیکد رعایت می‌شه.
          <span key={idx} style={{ position: "relative", display: "inline" }}>
            <span
              onClick={() => handleTap(idx, tok)}
              style={{ cursor: "pointer", borderBottom: `1px dotted ${colors.inkSoft}` }}
            >
              {tok}
            </span>
            {openIdx === idx && (
              <span
                dir="auto"
                style={{
                  position: "absolute",
                  top: "100%",
                  insetInlineStart: 0,
                  backgroundColor: colors.gold,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  zIndex: 5,
                  marginTop: 2,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                }}
              >
                {results[idx] === "loading" ? "…" : results[idx] || ""}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
});
// 🔥 React.memo — همون دلیلِ بالا (TapWordTranslate): این کامپوننت
// جوابِ هوش‌مصنوعی رو تو چتِ تمرین رندر می‌کنه و کارِ سنگینِ پارس‌کردنِ
// مارک‌داون توش انجام می‌شه؛ بدونِ memo، با هر تپ/تایپ تو کادرِ ورودی، این
// کار برای *همه‌ی* پیام‌های قبلیِ مکالمه (نه فقط پیامِ تغییریافته) از نو
// اجرا می‌شد و باعثِ کندیِ روزافزونی می‌شد که کاربر گزارش کرد.
export const MiniMarkdown = React.memo(function MiniMarkdown({ text, speakCode, nativeLang, aiSettings, wordTapTarget, justify }) {
  if (!text) return null;
  // این استایل رو بذاریم رو هر بلاک (پاراگراف/تیتر/آیتمِ لیست) به‌جای
  // «start»ِ همیشگی — فقط وقتی justify=true باشه (یعنی فقط از چتِ تمرین
  // جمله‌سازی صدا زده شده، نه بقیه‌ی جاهایی که از MiniMarkdown استفاده
  // می‌کنن). unicodeBidi:"plaintext" اینجا لازمه چون بدونش، وقتی یه خط
  // ترکیبی از فارسی/عربی (rtl) و کلماتِ زبونِ دیگه (ltr) باشه، justify
  // معمولی فاصله‌های عجیب/نامتقارن بینِ کلمات می‌ذاره (چون مرورگر جهتِ
  // بلاک رو با embedding پیش‌فرض حساب می‌کنه، نه بر اساسِ جهتِ واقعیِ خودِ
  // متن)؛ plaintext باعث می‌شه مرورگر جهتِ هر پاراگراف رو مستقیماً از رو
  // اولین حرفِ قوی‌ش تشخیص بده و چیدمانِ justify درست دربیاد.
  const blockAlignStyle = justify ? { textAlign: "justify", unicodeBidi: "plaintext" } : { textAlign: "start" };
  // dir="auto" جهتِ کل خط رو فقط از رو اولین حرفِ قوی‌ش تشخیص می‌ده — این
  // دقیقاً چیزیه که تو نمونه‌ی کاربر خرابش کرد: خطِ "1. ¿Qué? → بین انتخاب..."
  // با یه کلمه‌ی اسپانیاییِ لاتین (Qué) شروع می‌شه، پس dir="auto" کلِ خط رو
  // (با اینکه ۹۰٪ فارسیه) ltr حساب می‌کنه و ترتیبِ کلمه‌ها/پرانتزها به‌هم
  // می‌ریزه. به‌جاش، وقتی justify=true باشه، جهتِ هر بلاک رو از رو غالبِ
  // اسکریپتِ خودِ خط (isPersianScriptLine) تعیین می‌کنیم، نه اولین حرفش.
  const blockDir = (content) => (justify ? (isPersianScriptLine(content) ? "rtl" : "ltr") : "auto");
  // اگه زبان مقصد خودش فارسی/عربیه، نمی‌شه با اسکریپت تشخیص داد کدوم خط
  // ترجمه‌ست و کدوم جمله‌ی هدف؛ پس همیشه دکمه‌ی خوانش رو نشون بده.
  const alwaysSpeak = speakCode && ["fa", "ar"].includes(speakCode);
  const shouldSpeak = (line) => !!speakCode && (alwaysSpeak || !isPersianScriptLine(line));
  // خط‌های زبان مقصد (shouldSpeak) اگه nativeLang هم داشته باشیم، به‌جای
  // متن ساده با ClickableSentence نشون داده می‌شن — یعنی همون‌جا هم می‌شه
  // روی هر کلمه زد و «ذخیره برای داستان بعدی» / «افزودن به یادگیری گرامر»
  // رو زد، دقیقاً مثل تب عبارات و لغات.
  const renderContent = (content, key) => {
    if (nativeLang && shouldSpeak(content)) {
      return (
        <ClickableSentence
          text={stripMdInline(content)}
          langCode={speakCode}
          nativeLang={nativeLang}
          aiSettings={aiSettings}
        />
      );
    }
    // خط‌هایی که به زبانِ مادریِ کاربرن (توضیحاتِ گرامری) از ClickableSentence
    // معمولی رد می‌شن (چون اون برعکس، از زبانِ خارجی به مادری ترجمه می‌کنه)؛
    // اگه wordTapTarget داده شده باشه (مثلاً توی چتِ تمرین)، همین‌جا با
    // TapWordTranslate قابلِ‌لمس‌شدن می‌کنیمشون تا هر کلمه به اولین زبانِ
    // مقصدِ کاربر ترجمه بشه.
    if (wordTapTarget) {
      return <TapWordTranslate key={key} text={stripMdInline(content)} targetLangCode={wordTapTarget} />;
    }
    return mdInline(content, key);
  };
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={blocks.length} style={{ margin: "4px 0 8px", paddingInlineStart: 18 }}>
          {listBuffer.map((li, i) => (
            // dir="auto" اینجا لازمه که برای هر خط جدا تصمیم بگیره راست‌چین
            // باشه یا چپ‌چین (بر اساس اولین حرفِ همون خط)، نه اینکه از یه
            // جهتِ کلیِ ثابت (که معمولاً فارسیه) برای کل کارت پیروی کنه —
            // وگرنه جمله‌های انگلیسیِ خالص هم بر عکس/به‌هم‌ریخته نشون داده
            // می‌شن، دقیقاً همون مشکلی که توی مثال‌ها پیش اومده بود.
            <li key={i} dir={blockDir(li)} className="flex items-start gap-1" style={{ marginBottom: 2, lineHeight: 1.8, ...blockAlignStyle }}>
              {/* dir="auto" روی همین ردیف باعث می‌شه محورِ اصلیِ فلکس هم عوض
                  بشه: خط‌های فارسی rtl می‌مونن (بلندگو با order پیش‌فرض درست
                  سمت راست می‌شینه)، ولی خط‌های زبانِ خارجی auto می‌شن ltr —
                  اونجا باید edge="end" بدیم وگرنه بلندگو برعکس، سمت چپ
                  می‌افته و انگار تورفتگی/جابه‌جایی داره. */}
              {shouldSpeak(li) && <SpeakButton text={li} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(li) ? undefined : "end"} neuralLabel="جمله" />}
              <span style={{ flex: 1 }}>{renderContent(li, `${blocks.length}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      return;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      const level = line.match(/^#+/)[0].length;
      const content = line.replace(/^#{1,3}\s+/, "");
      blocks.push(
        <p
          key={blocks.length}
          dir={blockDir(content)}
          className="flex items-start gap-1"
          style={{
            fontWeight: 800,
            fontSize: level === 1 ? 16 : level === 2 ? 15 : 14,
            margin: "10px 0 4px",
            color: colors.ink,
            ...blockAlignStyle,
          }}
        >
          {shouldSpeak(content) && <SpeakButton text={content} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(content) ? undefined : "end"} neuralLabel="جمله" />}
          <span style={{ flex: 1 }}>{renderContent(content, blocks.length)}</span>
        </p>
      );
      return;
    }
    if (/^-{3,}$/.test(line)) {
      flushList();
      blocks.push(
        <hr key={blocks.length} style={{ border: "none", borderTop: `1px dashed ${colors.cardBorder}`, margin: "8px 0" }} />
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList();
    blocks.push(
      <p key={blocks.length} dir={blockDir(line)} className="flex items-start gap-1" style={{ margin: "4px 0", lineHeight: 1.9, ...blockAlignStyle }}>
        {shouldSpeak(line) && <SpeakButton text={line} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(line) ? undefined : "end"} neuralLabel="جمله" />}
        <span style={{ flex: 1 }}>{renderContent(line, blocks.length)}</span>
      </p>
    );
  });
  flushList();
  return <div>{blocks}</div>;
}, (prev, next) =>
  prev.text === next.text &&
  prev.speakCode === next.speakCode &&
  prev.nativeLang === next.nativeLang &&
  prev.aiSettings === next.aiSettings &&
  prev.wordTapTarget === next.wordTapTarget &&
  prev.justify === next.justify
);
