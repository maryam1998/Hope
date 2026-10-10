// دکمه‌ی پخش
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { Volume2, Pause } from "lucide-react";
import { recordNeuralRepeat, addNeuralFiber, NeuralPathButton } from "../../../NeuralPath.jsx";
import { TTS_LOCALE, TTS_NEED_MODEL_MSG, ttsFailMsg } from "../../tts/ttsConfig.js";
import { LANGUAGES } from "../../constants/languages.js";
import { colors, fontFa } from "../../ui/theme.js";
import { speechController } from "../../speech/speechController.js";

// fullText (اختیاری): وقتی این دکمه کنارِ یه جمله/پاراگرافِ داخلِ یه متنِ
// بزرگ‌تر (مثلاً یه جمله‌ی داخلِ داستان) نشسته و می‌خوایم کلیک روش، به‌جای
// پخشِ *ایزوله‌ی* همون جمله‌ی کوچیک، دقیقاً از همون‌جا وسطِ پخشِ *کلِ* متن
// بپره و ادامه بده (یعنی «خواندنِ کلی از همینجا شروع بشه») — fullText همون
// متنِ کامله، و startOffset/resolveStartOffset آفستِ این جمله‌ی خاص داخلِ
// اون متنِ کامله. کلیدِ speechController همیشه بر اساسِ fullText+code
// حساب می‌شه (نه text)، طوری که این دکمه دقیقاً همون سِشنِ پخشِ کلِ متن رو
// (چه در حالِ پخش، چه مکث‌شده) پیدا کنه.
export function SpeakButton({ text, code, color, edge, forceRepeat, startOffset, resolveStartOffset, onPlayed, fullText, onOverrideClick, sentenceBoundaries, neuralId, neuralLabel }) {
  const locale = TTS_LOCALE[code] || "en-US";
  const jumpText = fullText || text;
  const myKey = `${locale}::${jumpText}`;
  // شناسه‌ی این آیتم برای رشته‌ی عصبی — پیش‌فرض از رویِ خودِ کلیدِ پخش
  // ساخته می‌شه (کد زبان + متن)، مگر اینکه صراحتاً neuralId داده شده باشه.
  const neuralItemId = neuralLabel ? neuralId || `${code}::${jumpText}` : null;
  const [state, setState] = useState(() => speechController.getState());
  // پیغامِ خطای فوری (سنکرون، از خودِ handleToggle) — مثلاً «مرورگر
  // پشتیبانی نمی‌کنه». چند ثانیه بعد خودش پاک می‌شه.
  const [localMsg, setLocalMsg] = useState(null);
  // پیغامِ دوستانه (نه خطا) — وقتی این دکمه، به‌جای صدای نصب‌شده‌ی خودِ
  // گوشی، از مسیرِ آنلاینِ رایگان پخش کرد. جایگزینِ همون پنلِ قدیمیِ
  // «نصب بسته‌ی زبان» تو تنظیمات که حذف شد — حالا این پیام دقیقاً همون‌جا
  // که کاربر واقعاً بهش نیاز داره (زیرِ همون دکمه‌ی 🔊ی همون زبون) ظاهر می‌شه.
  const [voiceHint, setVoiceHint] = useState(null);

  useEffect(() => speechController.subscribe(setState), []);

  useEffect(() => {
    if (!localMsg) return;
    const t = setTimeout(() => setLocalMsg(null), 5000);
    return () => clearTimeout(t);
  }, [localMsg]);

  useEffect(() => {
    if (!voiceHint) return;
    const t = setTimeout(() => setVoiceHint(null), 6000);
    return () => clearTimeout(t);
  }, [voiceHint]);

  // 🧬 اتصالِ خودکارِ «تکرار» به «رشته‌ی عصبی»: تا اینجا فقط با تپِ دستیِ
  // «امروز انجام دادم» توی کارتِ NeuralPath یه رشته ساخته می‌شد. حالا وقتی
  // کاربر روی همین جمله زده و پخش رو در حالتِ «تکرارِ سراسری» (دکمه‌ی 🔁)
  // نگه داشته، خودِ speechController به‌ازایِ هر بار که این جمله‌ی خاص
  // (chunkIndex) دوباره خونده می‌شه repeatsDone رو بالا می‌بره — این افکت
  // دقیقاً همون لحظه‌ها رو می‌گیره و به‌ازای هر تکرارِ واقعی، یه رشته‌ی
  // عصبیِ تازه (addNeuralFiber) برای همین آیتم می‌سازه؛ خواندنِ اولِ جمله
  // (قبل از اولین تکرار) حساب نمی‌شه — فقط خودِ تکرارها.
  // 🧬 این افکت تنها مسئولِ ساختِ رشته‌هاست — هم برای خوندنِ خودکار،
  // هم برای تپِ دستی، هم برای تکرار. با -1 شروع می‌کنیم تا خوندنِ اول
  // هم به‌عنوانِ رشته حساب بشه.
  const repeatFiberRef = useRef({ fireKey: null, lastSeenRepeat: -1 });
  useEffect(() => {
    if (!neuralItemId) return;
    if (!state.key || state.status !== "playing") return;

    // 🐛 چرا این چکِ جدید لازمه: این SpeakButton در دو حالت مختلف استفاده
    // می‌شه: (۱) پخشِ کلِ متن (fullText + startOffset)، (۲) پخشِ تکی.
    // لیستِ مکالماتِ روزمره از حالتِ (۱) استفاده می‌کنه ولی startOffset
    // رو پاس نمی‌ده، پس myIdx همیشه صفر محاسبه می‌شد و افکت برای جمله‌های
    // بعدی هیچ‌وقت شلیک نمی‌شد — دقیقاً همون «فقط ۱ رشته ساخته می‌شه».
    // حالا دو حالت رو جدا پوشش می‌دیم:
    //   A) کلیدِ پخش === کلیدِ این SpeakButton → با startOffset (اگه باشه)
    //      بفهم کدوم chunk.
    //   B) کلید یکسان نیست، ولی متنِ chunkِ در حالِ پخش عیناً همون textِ
    //      این SpeakButtonه → این SpeakButton یه جمله/لغتِ درونِ اون
    //      متنِ بزرگ‌تره.
    let matched = false;
    if (state.key === myKey) {
      let myIdx = 0;
      if (fullText) {
        const effectiveStartOffset = resolveStartOffset ? resolveStartOffset() : startOffset;
        if (Number.isInteger(effectiveStartOffset)) {
          const meta = speechController.getChunksMeta();
          for (let i = 0; i < meta.length; i++) {
            if (effectiveStartOffset >= meta[i].start) myIdx = i;
            else break;
          }
        }
      }
      if (state.chunkIndex === myIdx) matched = true;
    } else {
      const chunkText = (speechController.getChunkText(state.chunkIndex) || "").trim().replace(/\s+/g, " ");
      const ownText = (text || "").trim().replace(/\s+/g, " ");
      if (chunkText && ownText && chunkText === ownText) matched = true;
    }
    if (!matched) return;

    const fireKey = `${state.key}#${state.chunkIndex}#${neuralItemId}`;
    if (repeatFiberRef.current.fireKey !== fireKey) {
      repeatFiberRef.current = { fireKey, lastSeenRepeat: -1 };
    }
    if (repeatFiberRef.current.lastSeenRepeat > (state.repeatsDone || 0)) {
      repeatFiberRef.current.lastSeenRepeat = -1;
    }
    const done = state.repeatsDone || 0;
    if (done > repeatFiberRef.current.lastSeenRepeat) {
      const delta = done - repeatFiberRef.current.lastSeenRepeat;
      repeatFiberRef.current.lastSeenRepeat = done;
      for (let i = 0; i < delta; i++) {
        recordNeuralRepeat(neuralItemId, { source: "player" });
        addNeuralFiber(neuralItemId);
      }
    }
  }, [state, neuralItemId, myKey, text, fullText, startOffset, resolveStartOffset]);

  // اگه مسیرِ آنلاینِ جایگزین (وقتی گوشی صدایی برای این زبون نداره) کلاً
  // شکست خورد — نه فقط این دکمه ساکت شد، بلکه واقعاً هیچ صدایی از هیچ
  // سرویسی پخش نشد — به‌جای پاپ‌آپِ alert (که کاربر رو مجبور به بستنِ
  // دستی می‌کرد)، پایین‌تر همین‌جا، درست زیرِ همین دکمه/جمله، یه پیغامِ
  // کوچیکِ درجا نشون داده می‌شه (پایین‌تر، errorMsg).
  const errorMsg =
    localMsg || (state.ttsError && state.ttsError === myKey ? ttsFailMsg(code) : null);

  const isActive = state.key === myKey && state.status !== "idle";
  const isPlaying = isActive && state.status === "playing";
  const c = color || colors.gold;

  const handleToggle = (e) => {
    e.stopPropagation();
    // اگه onOverrideClick پاس داده شده (مثلاً پلیرِ صوتِ آپلودیِ کاربر فعاله)،
    // به‌جای منطقِ TTS پایین، فقط همون رو صدا می‌زنیم و برمی‌گردیم — وگرنه
    // زدنِ این دکمه، حتی وقتی کاربر رو حالتِ «صوتِ آپلودی» باشه، همیشه
    // TTS رو پخش می‌کرد (که دقیقاً باگیه که کاربر ازش شکایت داشت).
    if (onOverrideClick) {
      onOverrideClick();
      if (onPlayed) onPlayed();
      // 🧬 ساختِ رشته برای این حالت (صوتِ آپلودیِ کاربر) حالا یکجا و
      // متمرکز، با افکتِ activeSentence/isPloading نزدیکِ useStoryUserAudio
      // انجام می‌شه (نگاه کن به توضیحِ کاملِ اونجا) — نه اینجا. اون افکت
      // هم موردِ «تپِ مستقیم روی این دکمه» رو پوشش می‌ده، هم موردِ
      // «جمله‌ی بعد/قبل» و «پخشِ مرکزی» رو، که قبلاً هیچ‌کدوم رشته
      // نمی‌ساختن. اگه اینجا هم رشته می‌ساختیم، برایِ همین تپ، دوبار
      // شمرده می‌شد.
      return;
    }
    // نکته‌ی مهم: اگه resolveStartOffset پاس داده شده، به‌جای پراپِ
    // startOffset (که موقعِ رندرِ قبلیِ این کامپوننت محاسبه شده و ممکنه
    // کهنه باشه — چون rememberMainTextResumeOffset فقط یه Map رو مستقیم
    // آپدیت می‌کنه و هیچ ری‌رندری رو تریگر نمی‌کنه)، همین لحظه که کاربر
    // واقعاً دکمه رو زده دوباره از Map می‌خونیمش. این دقیقاً همون چیزیه که
    // باعث می‌شد «خواندنِ کل متن» بعد از یه پخشِ جزئی (کلمه/محدوده/جمله)
    // گاهی از همون نقطه ادامه پیدا نکنه و از اول شروع بشه.
    const effectiveStartOffset = resolveStartOffset ? resolveStartOffset() : startOffset;

    if (fullText) {
      // حالتِ «پرش داخلِ متنِ کامل» — اگه همین الان دقیقاً همین متنِ کامل
      // (چه در حالِ پخش، چه مکث‌شده) لود شده، هیچ‌وقت نباید toggle معمولی
      // صدا بزنیم (چون toggle با کلیدِ یکسان یعنی «پاز/ادامه»، نه «پرش»).
      // به‌جاش seekToChunk رو مستقیم صدا می‌زنیم تا از دقیقاً همینجا ادامه
      // بده. فقط وقتی کاربر دقیقاً روی همون جمله‌ای که همین الان داره
      // خونده می‌شه دوباره کلیک کنه (یعنی چیزی برای «پرش» نیست)، توگل
      // می‌کنیم تا رفتارِ آشنای «پاز/ادامه» حفظ بشه.
      const st = speechController.getState();
      let fullTextResult = null;
      if (st.key === myKey && st.status !== "idle") {
        const meta = speechController.getChunksMeta();
        const off = Number.isInteger(effectiveStartOffset) ? effectiveStartOffset : 0;
        let idx = 0;
        for (let i = 0; i < meta.length; i++) {
          if (off >= meta[i].start) idx = i;
          else break;
        }
        if (idx === st.chunkIndex) {
          fullTextResult = speechController.toggle(jumpText, code);
        } else {
          speechController.seekToChunk(idx);
        }
      } else {
        // نکته‌ی مهمِ رفعِ باگ: هر دکمه‌ای که با fullText صدا زده می‌شه یعنی
        // «کلِ متن رو از همین‌جا بخون» — پس صرف‌نظر از اینکه کدوم دکمه
        // (پلیرِ مرکزی، یه جمله‌ی خاص، یا یه پاراگراف) این پخش رو شروع
        // کرده، باید همون‌قدر «loop» باشه که پلیرِ مرکزی هست؛ وگرنه با
        // شروعِ پخش از یه جمله‌ی وسط (نه از دکمه‌ی مرکزی) وقتی به آخرِ متن
        // می‌رسید، به‌جای برگشتن به اول، پخش کامل متوقف می‌شد. فقط وقتی
        // صراحتاً forceRepeat === false داده بشه (که فعلاً هیچ‌جا این‌طور
        // نیست)، لوپ خاموش می‌مونه.
        fullTextResult = speechController.toggle(jumpText, code, effectiveStartOffset, {
          ...(forceRepeat === false ? null : { loop: true }),
          sentenceBoundaries,
        });
      }
      if (fullTextResult === "online-fallback") {
        const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
        setVoiceHint(`صدای ${langLabel} روی گوشیت نصب نیست — فعلاً از اینترنت پخش می‌شه`);
      }
      if (onPlayed) onPlayed();
      return;
    }

    const result = speechController.toggle(text, code, effectiveStartOffset, forceRepeat ? { loop: true } : undefined);
    if (onPlayed) onPlayed();
    // "no-voice" دیگه پیش نمی‌آد چون خودکار می‌ره سراغ سرویس آنلاین رایگان
    // (result === "online-fallback")؛ فقط وقتی هیچ راهی — نه گوشی نه آنلاین —
    // ممکن نبود، خطا نشون می‌دیم. به‌جای alert، همین‌جا زیرِ دکمه نشون
    // داده می‌شه (بالاتر، errorMsg).
    if (result === "unsupported") {
      setLocalMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
    } else if (result === "error") {
      setLocalMsg(ttsFailMsg(code));
    } else if (result === "offline-need-model") {
      setLocalMsg(TTS_NEED_MODEL_MSG);
    } else if (result === "online-fallback") {
      const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
      setVoiceHint(`صدای ${langLabel} روی گوشیت نصب نیست — فعلاً از اینترنت پخش می‌شه`);
    } else if (result === "no-local-voice") {
      const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
      setLocalMsg(`صدای ${langLabel} روی گوشیت نصب نیست — از تنظیماتِ گوشی نصبش کن`);
    } else if (result === "no-tts-engine") {
      setLocalMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
    }
  };

  // این آیکون همیشه باید سمت راستِ ردیف بشینه، صرف‌نظر از اینکه توی JSX
  // کجا نوشته شده. توی یه ردیفِ راست‌چین (که پیش‌فرضِ کل اپه) «سمت راست»
  // یعنی اولِ محور اصلی، پس order: -1 کافیه. اما چند جای خاص از اپ
  // (مثلاً ردیف کلمه‌ی دیکشنری یا جمله‌های داستان به زبان خارجی) به‌خاطر
  // محتوای لاتین، خودِ ردیف رو dir="ltr" می‌کنن؛ اونجا «سمت راست» یعنی
  // آخرِ محور اصلی، پس با پراپ edge="end" یه order خیلی بزرگ می‌گیره.
  const orderStyle = edge === "end" ? 999 : -1;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, order: orderStyle, position: "relative" }}>
      <button
        onClick={handleToggle}
        aria-label={isPlaying ? "توقف موقت" : "تلفظ"}
        title={isPlaying ? "توقف موقت" : isActive ? "ادامه" : "تلفظ"}
        style={{ 
          flexShrink: 0, 
          display: "flex", 
          alignItems: "center", 
          color: c,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
      </button>
      {neuralItemId && (
        <NeuralPathButton
          id={neuralItemId}
          label={neuralLabel}
          colors={{
            paper: colors.paper,
            border: colors.cardBorder,
            soft: colors.paperDark,
            ink: colors.ink,
            inkSoft: colors.inkSoft,
            gold: colors.gold,
            goldSoft: colors.goldSoft,
            teal: colors.teal,
          }}
        />
      )}
      {(errorMsg || voiceHint) && (
        <span
          style={{
            position: "absolute",
            top: "100%",
            insetInlineStart: 0,
            marginTop: 2,
            fontSize: 11,
            color: errorMsg ? colors.rose : colors.teal,
            whiteSpace: "nowrap",
            fontFamily: fontFa,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {errorMsg || voiceHint}
        </span>
      )}
    </span>
  );
}
