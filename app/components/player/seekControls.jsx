// کنترل‌های جلو/عقب
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { colors } from "../../ui/theme.js";
import { toFaDigits } from "../../utils/calendar.js";
import { speechController } from "../../speech/speechController.js";
import { ClassicTriangleIcon } from "./playerButtons.jsx";
import { TTS_MS_PER_CHAR } from "./PlayerProgress.jsx";

// ---------------------------------------------------------------------------
// «چند ثانیه پرش» رویِ دکمه‌های جمله‌ی قبل/بعد — به‌جایِ دکمه‌ی جداگانه
// (که پلیر رو شلوغ می‌کرد): تپِ کوتاه دقیقاً همون رفتارِ قبلی (جمله‌ی
// بعد/قبل) رو داره؛ نگه‌داشتنِ انگشت بیشتر از حدودِ نیم‌ثانیه پرشِ
// چندثانیه‌ای رو شروع می‌کنه و تا وقتی نگه داشته بشه ادامه پیدا می‌کنه
// (مثلِ دکمه‌ی rewind/fast-forwardِ پلیرهای واقعی). مقدارِ ثانیه با یه
// کنترلِ کوچیکِ −/عدد/+ (هم‌شکلِ SpeedControl) قابلِ‌تنظیمه، بینِ TTS و
// صوتِ آپلودیِ کاربر مشترکه، و در localStorage نگه داشته می‌شه.
// ---------------------------------------------------------------------------
const SEEK_AMOUNT_STEPS = [5, 10, 15, 20, 30, 45, 60];
export const seekAmountStore = (() => {
  let value = (() => {
    const saved = Number(localStorage.getItem("phrasebook-seek-seconds"));
    return SEEK_AMOUNT_STEPS.includes(saved) ? saved : 10;
  })();
  const listeners = new Set();
  return {
    get() {
      return value;
    },
    set(v) {
      if (!SEEK_AMOUNT_STEPS.includes(v)) return;
      value = v;
      try {
        window.localStorage.setItem("phrasebook-seek-seconds", String(value));
      } catch {}
      listeners.forEach((fn) => fn(value));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
})();
function useSeekAmount() {
  const [amount, setAmount] = useState(() => seekAmountStore.get());
  useEffect(() => seekAmountStore.subscribe(setAmount), []);
  return amount;
}
function stepSeekAmount(delta) {
  const idx = SEEK_AMOUNT_STEPS.indexOf(seekAmountStore.get());
  const nextIdx = Math.min(SEEK_AMOUNT_STEPS.length - 1, Math.max(0, idx + delta));
  seekAmountStore.set(SEEK_AMOUNT_STEPS[nextIdx]);
}
// هوکِ «تپِ کوتاه در برابرِ لمسِ طولانیِ تکرارشونده» — رویِ دکمه‌های
// جمله‌ی قبل/بعد سوار می‌شه (به‌جایِ onClickِ ساده). onHoldStart (اختیاری)
// همون لحظه‌ی pointerdown صدا زده می‌شه — برایِ ذخیره‌ی نقطه‌ی شروعِ پرش،
// قبل از این‌که آستانه‌ی لمسِ‌طولانی رد بشه.
const LONG_PRESS_MS = 550;
const LONG_PRESS_REPEAT_MS = 320;
const LONG_PRESS_MOVE_TOLERANCE = 12;
// 🐛 نسخه‌ی قبلی از Pointer Events (onPointerDown/Up/Leave/Cancel) استفاده
// می‌کرد. مشکل: اگه به هر دلیلی (اورلپ‌شدنِ عنصر، رفتارِ خاصِ وب‌ویو/
// مرورگر با touch-action، و…) رویدادِ pointerup روی خودِ دکمه شلیک
// نمی‌شد، تایمرِ ۴۵۰ میلی‌ثانیه‌ای هیچ‌وقت clear نمی‌شد و بعد از همون
// مدت خودش‌به‌خود «لمسِ‌طولانی» رو فعال می‌کرد — یعنی حتی یه تپِ خیلی
// سریع هم، چون clearTimers هیچ‌وقت اجرا نمی‌شد، به‌جایِ جمله‌ی بعد/قبل
// می‌رفت سراغِ پرشِ چندثانیه‌ای (همونی که کاربر گزارش کرد: «همیشه» ثانیه‌ای
// می‌شد). الان دقیقاً همون الگویِ mouse+touch (onMouseDown/Move/Up/Leave +
// onTouchStart/Move/End/Cancel، با تلورانسِ حرکتِ انگشت) که برایِ
// لانگ‌پرسِ نوارِ پلیر (playerLongPressRef پایین‌تر) قبلاً تست شده و
// درست کار می‌کنه رو اینجا هم به‌کار می‌بریم — پایانِ لمس همیشه قابل‌اعتماد
// گزارش می‌شه، و اگه انگشت حین لمس کمی لیز خورد (نه لمسِ‌طولانیِ عمدی)،
// تپِ ساده حساب می‌شه.
export function useHoldToSeek(onTap, onSeekStep, onHoldStart) {
  const timerRef = useRef(null);
  const repeatRef = useRef(null);
  const firedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const touchActiveRef = useRef(false); // برای نادیده‌گرفتنِ mousedown-ِ ساختگیِ بعدِ لمس
  function clearTimers() {
    clearTimeout(timerRef.current);
    clearInterval(repeatRef.current);
    timerRef.current = null;
    repeatRef.current = null;
  }
  useEffect(() => clearTimers, []);
  function start(x, y) {
    clearTimers();
    firedRef.current = false;
    startPosRef.current = { x, y };
    if (onHoldStart) onHoldStart();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onSeekStep();
      repeatRef.current = setInterval(onSeekStep, LONG_PRESS_REPEAT_MS);
    }, LONG_PRESS_MS);
  }
  function move(x, y) {
    if (!timerRef.current) return;
    if (Math.abs(x - startPosRef.current.x) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(y - startPosRef.current.y) > LONG_PRESS_MOVE_TOLERANCE) {
      clearTimers();
    }
  }
  function end() {
    const wasFired = firedRef.current;
    clearTimers();
    if (!wasFired) onTap();
  }
  // 🐛 باگِ اصلیِ «دکمه‌ی جمله‌ی بعد/قبل یک‌درمیون جمله‌ها رو رد می‌کنه»:
  // روی موبایل، بعدِ هر لمس (touchend)، مرورگر به‌طورِ خودکار رویدادهای
  // موسِ ساختگی (mousedown/mouseup) رو هم شبیه‌سازی می‌کنه. اینجا فقط
  // onMouseDown با touchActiveRef محافظت شده بود، ولی onMouseUp/onMouseLeave
  // بی‌محافظت مستقیم end() رو صدا می‌زدن. نتیجه: با هر تپِ لمسی، end()
  // دوبار اجرا می‌شد — یک‌بار از خودِ onTouchEnd، یک‌بار از mouseup-ِ
  // ساختگیِ چند میلی‌ثانیه بعدش — و چون هیچ‌کدوم «لمسِ‌طولانی» نبودن،
  // onTap() (یعنی جمله‌ی بعد/قبل) هم دوبار صدا زده می‌شد؛ یعنی هر تپ
  // عملاً دو جمله جلو/عقب می‌رفت. الان onMouseUp/onMouseLeave هم دقیقاً
  // مثلِ onMouseDown چک می‌کنن که این یه mouseup-ِ ساختگیِ بعدِ لمس نیست.
  function guardedEnd() {
    if (touchActiveRef.current) return;
    end();
  }
  return {
    onMouseDown: (e) => {
      e.stopPropagation(); // جلوگیری از تداخل با لانگ‌پرسِ «برگشت به تب» رویِ کلِ نوارِ پلیر
      if (touchActiveRef.current) return; // mousedown-ِ ساختگیِ بعدِ لمس
      start(e.clientX, e.clientY);
    },
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onMouseUp: guardedEnd,
    onMouseLeave: guardedEnd,
    onTouchStart: (e) => {
      e.stopPropagation(); // همون جلوگیری، برایِ نسخه‌ی لمسی
      touchActiveRef.current = true;
      const t = e.touches[0];
      if (t) start(t.clientX, t.clientY);
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    },
    onTouchEnd: () => {
      end();
      setTimeout(() => { touchActiveRef.current = false; }, 500);
    },
    onTouchCancel: () => {
      end();
      setTimeout(() => { touchActiveRef.current = false; }, 500);
    },
  };
}
// کنترلِ کوچیکِ انتخابِ «مقدارِ پرشِ لمسِ‌طولانی» — دقیقاً هم‌شکل/هم‌رفتارِ
// SpeedControl/UserAudioSpeedControl (آیکون + دکمه‌ی −/+)، تا حسِ یه
// کنترلِ جداگانه‌ی ناآشنا نده و پلیر شلوغ نشه.
export function SeekAmountControl({ color }) {
  const amount = useSeekAmount();
  const c = color || colors.gold;
  const idx = SEEK_AMOUNT_STEPS.indexOf(amount);
  const btnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    border: `1px solid ${colors.cardBorder}`,
    background: "white",
    color: c,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  };
  return (
    <span
      title={`مقدارِ پرشِ لمسِ طولانی: ${toFaDigits(String(amount))} ثانیه`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
    >
      <Clock size={15} color={colors.inkSoft} />
      <button
        type="button"
        onClick={() => stepSeekAmount(-1)}
        disabled={idx <= 0}
        style={{ ...btnStyle, opacity: idx <= 0 ? 0.4 : 1 }}
        aria-label="کم‌کردنِ مقدارِ پرش"
      >
        −
      </button>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24, textAlign: "center" }}>
        {toFaDigits(String(amount))}ث
      </span>
      <button
        type="button"
        onClick={() => stepSeekAmount(1)}
        disabled={idx >= SEEK_AMOUNT_STEPS.length - 1}
        style={{ ...btnStyle, opacity: idx >= SEEK_AMOUNT_STEPS.length - 1 ? 0.4 : 1 }}
        aria-label="زیادکردنِ مقدارِ پرش"
      >
        +
      </button>
    </span>
  );
}
// دکمه‌های «جمله‌ی قبل / جمله‌ی بعد» — تو نوارِ کنترلِ پلیرِ جدید، کنارِ دکمه‌ی
// مرکزیِ پخش می‌شینن. با تپِ کوتاه، speechController.seekToChunk جمله‌ی
// currentِ فعلی رو عوض می‌کنه (پخش هم خودکار از همون‌جا ادامه پیدا می‌کنه)؛
// با لمسِ طولانی، به‌اندازه‌ی «مقدارِ پرش»ِ SeekAmountControl عقب/جلو می‌ره
// (تخمینی، بر اساسِ طولِ کاراکتریِ متن — دقیقاً همون منطقِ نوارِ پیشرفتِ
// TTS پایین‌تر — چون پخشِ TTS زمانِ واقعیِ پیوسته نداره).
export function ChunkNavButton({ direction, color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key && state.total > 0;
  const atStart = state.chunkIndex <= 0;
  const atEnd = state.chunkIndex >= state.total - 1;
  const disabled = !isActive || (direction === "prev" ? atStart : atEnd);
  const c = color || colors.ink;

  const handleTap = () => {
    if (disabled) return;
    speechController.seekToChunk(state.chunkIndex + (direction === "prev" ? -1 : 1));
  };
  const handleSeekStep = () => {
    const st = speechController.getState();
    if (st.status === "idle" || !st.key || !st.total) return;
    const meta = speechController.getChunksMeta();
    const fullLen = speechController.getFullTextLength();
    if (!meta.length || !fullLen) return;
    const msPerChar = TTS_MS_PER_CHAR / Math.max(st.rate || 1, 0.25);
    const deltaChars = ((seekAmountStore.get() * 1000) / msPerChar) * (direction === "prev" ? -1 : 1);
    const curChar = meta[st.chunkIndex] ? meta[st.chunkIndex].start : 0;
    const targetChar = Math.min(fullLen, Math.max(0, curChar + deltaChars));
    let idx = 0;
    for (let i = 0; i < meta.length; i++) {
      if (targetChar >= meta[i].start) idx = i;
    }
    speechController.seekToChunk(idx);
  };
  const holdHandlers = useHoldToSeek(handleTap, handleSeekStep);

  return (
    <button
      {...holdHandlers}
      disabled={disabled}
      aria-label={direction === "prev" ? "جمله‌ی قبل (نگه‌دار: چند ثانیه عقب)" : "جمله‌ی بعد (نگه‌دار: چند ثانیه جلو)"}
      title={direction === "prev" ? "جمله‌ی قبل" : "جمله‌ی بعد"}
      style={{
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? colors.cardBorder : c,
        opacity: disabled ? 0.45 : 1,
        padding: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        // 🐛 «نگه‌داشتن» رویِ موبایل گاهی اصلاً شروع نمی‌شد یا انگار فقط تپ
        // حساب می‌شد: با touchAction: "manipulation" مرورگر هنوز اجازه‌ی
        // pan (اسکرول با انگشت) رو روی این دکمه داره، و اگه یه‌کمی حرکتِ
        // طبیعیِ انگشت (لرزش/اصطکاک) رو اسکرول تشخیص بده، رویداد رو خودش
        // می‌قاپه و touchcancel می‌فرسته — قبل از اینکه تایمرِ ۵۵۰
        // میلی‌ثانیه‌ایِ لمسِ‌طولانی برسه. با "none"، کل ژستِ لمس رویِ این
        // دکمه دستِ خودِ جاوااسکریپت می‌مونه و لمسِ‌طولانی همیشه قابل‌اعتماد
        // شروع می‌شه.
        touchAction: "none",
      }}
    >
      <ClassicTriangleIcon direction={direction === "prev" ? "left" : "right"} size={22} color={disabled ? colors.cardBorder : c} />
    </button>
  );
}
