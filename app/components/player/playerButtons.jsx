// دکمه‌های پلیر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect } from "react";
import { RotateCcw, Repeat, Volume2, VolumeX, Pause, Play, PlayCircle } from "lucide-react";
import { TTS_LOCALE, TTS_NEED_MODEL_MSG, ttsFailMsg } from "../../tts/ttsConfig.js";
import { LANGUAGES } from "../../constants/languages.js";
import { colors, fontFa } from "../../ui/theme.js";
import { speechController } from "../../speech/speechController.js";

// دکمه‌ی مرکزیِ Play/Pause توی نوارِ پلیرِ پایینِ صفحه. قبلاً این دکمه به‌جای
// subscribe کردن به speechController، state رو فقط یک‌بار موقعِ رندر
// می‌خوند — در نتیجه با یه وضعیتِ کهنه کار می‌کرد و کلیک روش گاهی به‌جای
// «ادامه‌ی پخش» می‌رفت تو مسیرِ «متنِ جدید» (چون key کهنه بود) و از اول
// شروع می‌شد. حالا مثلِ SpeakButton درست subscribe می‌کنه تا همیشه با
// وضعیتِ واقعی و به‌روزِ speechController کار کنه.
function PlayerCentralButton() {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key;
  const isPlaying = isActive && state.status === "playing";
  // متن کوتاه‌شده‌ای که در حال پخشه (حداکثر ۲۰ کاراکتر)
  const shortText = isActive ? state.key?.split("::")?.[1]?.slice(0, 20) : "";

  const handleClick = () => {
    if (!isActive) return;
    // اگر در حال پخش یا مکث است، همان toggle را روی همان متن صدا بزن
    // باید کلید state.key را بشکافیم تا text و code را به دست آوریم
    const parts = state.key?.split("::");
    if (parts && parts.length === 2) {
      const code = Object.keys(TTS_LOCALE).find(k => TTS_LOCALE[k] === parts[0]) || "en";
      speechController.toggle(parts[1], code);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: isActive ? colors.gold : colors.cardBorder,
        opacity: isActive ? 1 : 0.5,
        padding: 2,
        flexShrink: 0,
      }}
      title={isActive ? (isPlaying ? "توقف پخش" : "ادامه‌ی پخش") : "هیچ صدایی در حال پخش نیست"}
      aria-label={isActive ? (isPlaying ? "توقف" : "ادامه") : "خاموش"}
    >
      {isPlaying ? <Pause size={18} /> : <PlayCircle size={18} />}
      {isActive && (
        <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
          {shortText}
        </span>
      )}
    </button>
  );
}
// دکمه‌ی تکرار سراسری — یک تنظیم مشترکه که خودِ speechController نگهش
// می‌داره؛ هر جا کاربر روی هر 🔊ای کلیک کنه همین تنظیم روش اعمال می‌شه.
// به همین خاطر لازم نیست کنار تک‌تک جمله‌ها/عبارت‌ها دکمه‌ی 🔁 جدا بذاریم —
// یکی بالای هر بخش کافیه.
export function RepeatButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const handleClick = (e) => {
    e.stopPropagation();
    speechController.cycleGlobalRepeat();
  };

  const c = color || colors.gold;
  const repeatSetting = state.globalRepeatSetting;
  const active = repeatSetting !== 0;
  const label = repeatSetting === "inf" ? "∞" : repeatSetting === 0 ? "" : String(repeatSetting);

  return (
    <button
      onClick={handleClick}
      aria-label="تکرار سراسری"
      title={
        repeatSetting === 0
          ? "تکرار خاموش — بزن روشن کن (روی هر جمله/پاراگرافی که پخش کنی اعمال می‌شه)"
          : repeatSetting === "inf"
          ? "تکرار بی‌نهایت — بزن خاموش کن"
          : `تکرار ${repeatSetting} بار — روی هر 🔊ای که بزنی اعمال می‌شه`
      }
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 6,
        color: active ? c : colors.cardBorder,
        opacity: active ? 1 : 0.6,
      }}
    >
      <Repeat size={19} />
      {label && (
        <span
          style={{
            position: "absolute",
            top: -5,
            right: -7,
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            backgroundColor: c,
            color: "white",
            borderRadius: 6,
            padding: "1px 3px",
            minWidth: 10,
            textAlign: "center",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
// دکمه‌ی A-B — تکرارِ یه بازه‌ی دلخواه بینِ دو جمله، رویِ متنِ TTSِ در حالِ
// پخش. کلاسیک، شبیهِ پلیرهایِ قدیمی: بارِ اول جایِ فعلی رو نقطه‌ی A
// می‌کنه، بارِ دوم نقطه‌ی B — از همون‌جا پخش بینِ A و B تکرار می‌شه. بارِ
// سوم پاک می‌کنه. چون TTS جمله‌به‌جمله‌ست (نه یه فایلِ صوتیِ پیوسته)، A و B
// اینجا شماره‌یِ جمله‌ن (خودِ speechController.markAB این رو مدیریت می‌کنه).
export function ABRepeatButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key;
  const disabled = !isActive;
  const c = color || colors.gold;
  const ab = state.abState || "idle";

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    speechController.markAB();
  };

  // به‌جایِ شماره‌ی خامِ جمله (که کاربر هیچ‌جوره نمی‌دونه کدوم جمله‌ست، مگه
  // بره بشمره)، خودِ متنِ همون جمله رو (کوتاه‌شده) نشون می‌دیم — دقیقاً همون
  // شفافیتی که نسخه‌ی صوتِ آپلودی با نمایشِ زمان داره.
  const truncateAB = (s, n) => {
    if (!s) return "";
    const t = s.trim();
    return t.length > n ? `${t.slice(0, n).trim()}…` : t;
  };
  const chunkPreview = (idx, n) => truncateAB(speechController.getChunkText(idx), n);

  const title =
    ab === "idle"
      ? "تکرارِ یه بازه‌ی دلخواه — بزن تا نقطه‌ی A ثبت بشه"
      : ab === "waitingB"
      ? `نقطه‌ی A: «${chunkPreview(state.abChunkA, 30)}» — حالا رویِ جمله‌ی موردنظر برایِ B بزن`
      : `تکرارِ «${chunkPreview(state.abChunkA, 20)}» تا «${chunkPreview(state.abChunkB, 20)}» — بزن تا پاک بشه`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="تکرار بازه A-B"
      title={title}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 2,
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: -0.5,
        color: disabled ? colors.cardBorder : ab === "idle" ? colors.inkSoft : c,
        opacity: disabled ? 0.4 : ab === "idle" ? 0.75 : 1,
      }}
    >
      A-B
      {ab === "waitingB" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          A
        </span>
      )}
      {ab === "looping" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          ↻
        </span>
      )}
      {/* روی موبایل title (تولتیپِ هاور) اصلاً دیده نمی‌شه، برایِ همین بدونِ
          این برچسبِ همیشه‌-نمایان، هیچ راهی نبود بفهمی A/B کجان یا اصلاً
          فعاله یا نه. این چیپ همیشه، بدونِ نیاز به لمسِ نگه‌داشته، بالایِ
          دکمه نشون‌داده می‌شه. */}
      {ab !== "idle" && (
        <span
          style={{
            position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4,
            fontSize: 9, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap",
            backgroundColor: c, color: "white", borderRadius: 5, padding: "2px 5px",
            textAlign: "center", pointerEvents: "none",
          }}
        >
          {ab === "waitingB"
            ? `A: «${chunkPreview(state.abChunkA, 12)}»`
            : `«${chunkPreview(state.abChunkA, 9)}»→«${chunkPreview(state.abChunkB, 9)}»`}
        </span>
      )}
    </button>
  );
}
// همینِ دکمه‌ی A-B، نسخه‌ی صوتِ آپلودیِ کاربر — دقیقاً همون سه‌حالته
// (idle -> waitingB -> looping)، ولی چون اینجا صدا پیوسته‌ست (نه
// جمله‌به‌جمله‌ی TTS)، A و B زمانِ دقیقِ ثانیه‌ای‌ان — همون چیزی که توی
// پروتوتایپِ HTML امتحان شد. منطقش داخلِ useStoryUserAudio (markAB) است.
export function UserAudioABButton({ ua, color }) {
  const disabled = !ua.hasAudio;
  const c = color || colors.gold;
  const ab = ua.abState || "idle";

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    ua.markAB();
  };

  const fmtShort = (t) => {
    if (t === null || t === undefined || !isFinite(t)) return "";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const title =
    ab === "idle"
      ? "تکرارِ یه بازه‌ی دلخواه — بزن تا نقطه‌ی A ثبت بشه"
      : ab === "waitingB"
      ? `نقطه‌ی A: ${fmtShort(ua.abA)} — حالا نقطه‌ی B رو بزن`
      : `تکرارِ ${fmtShort(ua.abA)} تا ${fmtShort(ua.abB)} — بزن تا پاک بشه`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="تکرار بازه A-B"
      title={title}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 2,
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: -0.5,
        color: disabled ? colors.cardBorder : ab === "idle" ? colors.inkSoft : c,
        opacity: disabled ? 0.4 : ab === "idle" ? 0.75 : 1,
      }}
    >
      A-B
      {ab === "waitingB" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          A
        </span>
      )}
      {ab === "looping" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          ↻
        </span>
      )}
      {/* همون چیپِ همیشه‌-نمایان که برای نسخه‌ی TTS اضافه شد — اینجا به‌جایِ
          شماره‌ی جمله، زمانِ دقیقِ ثانیه‌ایِ A/B رو نشون می‌ده. */}
      {ab !== "idle" && (
        <span
          style={{
            position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4,
            fontSize: 9, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap",
            backgroundColor: c, color: "white", borderRadius: 5, padding: "2px 5px",
            textAlign: "center", pointerEvents: "none",
          }}
        >
          {ab === "waitingB" ? `A: ${fmtShort(ua.abA)}` : `${fmtShort(ua.abA)}–${fmtShort(ua.abB)}`}
        </span>
      )}
    </button>
  );
}
// دکمه‌ی «بی‌صداکردنِ خوانش» — برایِ کسی که یه نرم‌افزار/دستگاهِ صوتیِ
// جداگانه داره و نمی‌خواد صدایِ TTS اپ باهاش قاطی/تداخل کنه: با زدنش،
// خروجیِ صوتی خاموش می‌شه ولی پخش (پیش‌رفتنِ جمله‌به‌جمله، هایلایت، نوارِ
// پیشرفت) دقیقاً عادی ادامه پیدا می‌کنه — انگار داره می‌خونه، فقط بی‌صدا.
// این یه تنظیمِ سراسریه (خودِ speechController نگهش می‌داره، مثلِ تکرار/
// سرعت) — هرجایِ اپ که بشه پخش کرد، همینجا خاموش/روشنش می‌کنه.
export function MuteButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const handleClick = (e) => {
    e.stopPropagation();
    speechController.toggleMuted();
  };

  const c = color || colors.gold;
  const muted = !!state.muted;

  return (
    <button
      onClick={handleClick}
      aria-label={muted ? "روشن‌کردنِ صدا" : "بی‌صداکردنِ صدا"}
      title={
        muted
          ? "صدا خاموشه — پخش و هایلایت عادی ادامه داره؛ بزن روشنش کن"
          : "بی‌صداکردنِ صدایِ خوانش — برایِ وقتی نرم‌افزارِ دیگه‌ای صدایِ خودش رو داره"
      }
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        color: muted ? colors.rose : c,
        opacity: muted ? 1 : 0.6,
      }}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      {/* خطِ قطریِ روشن/واضح روی خودِ آیکون — علاوه بر آیکونِ VolumeX،
          تا وقتی صدا خاموشه، بدونِ هیچ ابهامی (حتی با یه نگاهِ گذرا) روشن
          باشه که صدا قطعه. */}
      {muted && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 17,
            height: 2,
            backgroundColor: colors.rose,
            transform: "translate(-50%, -50%) rotate(-45deg)",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}
// دکمه‌ی «رفرش / شروع مجدد» — کنارِ دکمه‌ی تکرارِ سراسری می‌شینه. با زدنش،
// خواندنِ همون متنِ کاملِ تبِ فعلی (چیزی که MainPlayButton هم روش کار
// می‌کنه — startText/startCode) از دقیقاً از ابتدا شروع می‌شه؛ چه الان
// چیزی در حالِ پخش/مکث باشه چه نه، و چه این متن همون متنِ همین الان
// لودشده باشه چه یه متنِ دیگه (مثلاً کاربر بینِ تب‌ها جابه‌جا شده و
// حافظه‌ی «نقطه‌ی ادامه» یه‌جای وسط رو نگه داشته).
// نکته‌ی مهم برای حفظِ هایلایت: اینجا کلیدِ speechController (key) رو
// عوض نمی‌کنیم — فقط chunkIndex رو با seekToChunk(0) برمی‌گردونیم به صفر.
// همه‌ی جاهایی که هایلایتِ زنده رو نشون می‌دن (StoryBuilder، PhraseList،
// WordList و...) با subscribe شدن به همین speechController و مقایسه‌ی
// key/chunkIndex کار می‌کنن؛ پس چون key دست‌نخورده می‌مونه، هایلایت هم
// بدونِ هیچ تغییرِ اضافه‌ای، خودش با chunkIndexِ صفر هماهنگ می‌شه.
export function RestartButton({ color, startText, startCode, sentenceBoundaries }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const locale = TTS_LOCALE[startCode] || "en-US";
  const myKey = startText ? `${locale}::${startText}` : null;
  const isLoaded = !!myKey && state.key === myKey && state.status !== "idle";
  const disabled = !startText;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!startText) return;
    if (isLoaded) {
      // همین متن از قبل لود شده (چه در حالِ پخش، چه مکث‌شده) — فقط جهش به
      // چانکِ صفر، بدونِ باز کردنِ یه سِشنِ جدید (که باعثِ ازدست‌رفتنِ
      // پیوستگیِ key/هایلایت می‌شد).
      speechController.seekToChunk(0);
    } else {
      // متنِ دیگه‌ای لود بود یا هیچی — یه سِشنِ تازه باز می‌کنیم. توگل با
      // آفستِ ۰ رو صریح حساب نمی‌کنه (۰ یعنی «آفستِ صریح نداده»، پس ممکنه
      // به‌جاش نقطه‌ی ادامه‌ی قبلاً ذخیره‌شده رو بردارد) — برای همین بلافاصله
      // بعدش seekToChunk(0) رو هم صدا می‌زنیم تا مطمئن از ابتدا شروع بشه.
      // sentenceBoundaries رو هم پاس می‌دیم (اگه موجود باشه) تا اینجا هم مثلِ
      // MainPlayButton از مرزهای دقیقِ جمله‌های خودِ اپ استفاده کنه، نه از
      // تشخیصِ خامِ نقطه‌محور.
      speechController.toggle(startText, startCode, undefined, { sentenceBoundaries });
      speechController.seekToChunk(0);
    }
  };

  const c = color || colors.gold;
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="شروع مجدد از ابتدای این تب"
      title="شروع مجدد از ابتدای همینِ متن — هایلایت هم همراهش از اول می‌شه"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 6,
        color: disabled ? colors.cardBorder : c,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <RotateCcw size={19} />
    </button>
  );
}
// نسخه‌ی «صوتِ کاربر» از دکمه‌ی رفرش/شروع مجدد — کاملاً دستی، بدونِ هیچ
// وابستگی به speechController: فقط ua.restart() رو صدا می‌زنه که همزمان
// currentTime رو صفر می‌کنه و هایلایتِ خطِ فعال (manualIndex) رو هم به خطِ
// اول برمی‌گردونه. وضعیتِ پخش/مکث دست‌نخورده می‌مونه، دقیقاً مثلِ رفتارِ
// نسخه‌ی TTS.
export function UserAudioRestartButton({ ua, color }) {
  const { hasAudio, restart } = ua || {};
  const disabled = !hasAudio;
  const c = color || colors.gold;
  return (
    <button
      onClick={() => { if (!disabled && restart) restart(); }}
      disabled={disabled}
      aria-label="شروع مجدد از ابتدای صوت"
      title="شروع مجدد از ابتدای این صوت — هایلایت هم همراهش از اول می‌شه"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 6,
        color: disabled ? colors.cardBorder : c,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <RotateCcw size={19} />
    </button>
  );
}
// دکمه‌ی مرکزیِ Play/Pause تو طراحیِ جدیدِ پلیر (شبیهِ پلیرهای موزیک). دو
// حالت داره:
//  - وقتی صدایی از قبل فعاله (پخش/مکث): دقیقاً مثلِ PlayerCentralButtonِ
//    قبلی، همون toggle رو رو همون متن صدا می‌زنه.
//  - وقتی هیچی فعال نیست: اگه startText بهش داده شده باشه (متنِ کاملِ تبِ
//    فعلی — داستان/مکالمه/لیست‌کلمات)، با زدنش همون متن با تنظیمِ تکرارِ
//    سراسری شروع به پخش می‌کنه. این همون کاریه که قبلاً یه SpeakButtonِ
//    جدا کنارِ پلیر انجامش می‌داد؛ الان همون قابلیت داخلِ دکمه‌ی مرکزیه.
export function MainPlayButton({ startText, startCode, resolveStartOffset, sentenceBoundaries, color, size }) {
  const [state, setState] = useState(() => speechController.getState());
  const [localMsg, setLocalMsg] = useState(null);
  useEffect(() => speechController.subscribe(setState), []);

  useEffect(() => {
    if (!localMsg) return;
    const t = setTimeout(() => setLocalMsg(null), 5000);
    return () => clearTimeout(t);
  }, [localMsg]);

  const isActive = state.status !== "idle" && !!state.key;
  const isPlaying = isActive && state.status === "playing";
  const canStart = !isActive && !!startText;
  const disabled = !isActive && !canStart;
  const c = color || colors.teal;
  const btnSize = size || 30;

  const myKey = startText ? `${TTS_LOCALE[startCode] || "en-US"}::${startText}` : null;
  const errorMsg =
    localMsg || (state.ttsError && myKey && state.ttsError === myKey ? ttsFailMsg(startCode) : null);

  const handleClick = () => {
    if (isActive) {
      const parts = state.key?.split("::");
      if (parts && parts.length === 2) {
        const code = Object.keys(TTS_LOCALE).find((k) => TTS_LOCALE[k] === parts[0]) || "en";
        speechController.toggle(parts[1], code);
      }
      return;
    }
    if (!startText) return;
    const offset = resolveStartOffset ? resolveStartOffset() : undefined;
    const result = speechController.toggle(startText, startCode, offset, { loop: true, sentenceBoundaries });
    // به‌جای alert، همین‌جا زیرِ دکمه‌ی مرکزیِ پلیر نشون داده می‌شه.
    if (result === "unsupported") {
      setLocalMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
    } else if (result === "error") {
      setLocalMsg(ttsFailMsg(startCode));
    } else if (result === "offline-need-model") {
      setLocalMsg(TTS_NEED_MODEL_MSG);
    } else if (result === "no-local-voice") {
      const langLabel = LANGUAGES.find((l) => l.code === startCode)?.label || startCode;
      setLocalMsg(`صدای ${langLabel} روی گوشیت نصب نیست — از تنظیماتِ گوشی نصبش کن`);
    } else if (result === "no-tts-engine") {
      setLocalMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
    }
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-label={isPlaying ? "توقف موقت" : "پخش"}
        title={isPlaying ? "توقف موقت" : isActive ? "ادامه‌ی پخش" : canStart ? "پخشِ کل متن" : "متنی برای پخش نیست"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: btnSize + 18,
          height: btnSize + 18,
          borderRadius: "50%",
          background: disabled ? colors.cardBorder : c,
          border: "none",
          cursor: disabled ? "default" : "pointer",
          color: colors.paper,
          opacity: disabled ? 0.45 : 1,
          flexShrink: 0,
          padding: 0,
          boxShadow: disabled ? "none" : "0 2px 6px rgba(28,37,65,0.22)",
        }}
      >
        {isPlaying ? (
          <Pause size={Math.round(btnSize * 0.56)} fill={colors.paper} />
        ) : (
          <Play size={Math.round(btnSize * 0.56)} fill={colors.paper} style={{ marginInlineStart: 2 }} />
        )}
      </button>
      {errorMsg && (
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 2,
            fontSize: 11,
            color: colors.rose,
            whiteSpace: "nowrap",
            fontFamily: fontFa,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {errorMsg}
        </span>
      )}
    </span>
  );
}
// آیکونِ سه‌گوشِ خطی-سبک («کلاسیک») برایِ دکمه‌های عقب/جلوی پلیر — به‌جایِ
// آیکونِ SkipBack/SkipForwardِ پیش‌فرضِ lucide (که یه خط/بار کنارِ مثلث
// داره، شبیهِ «برو ترکِ بعدی»)، اینجا فقط یه مثلثِ توخالیِ ساده می‌کشیم؛
// دقیقاً شبیهِ دکمه‌های پلیرهایِ قدیمی/کلاسیک.
export function ClassicTriangleIcon({ direction = "right", size = 20, color = "currentColor" }) {
  const points = direction === "right" ? "7,4 20,12 7,20" : "17,4 4,12 17,20";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points={points} stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
