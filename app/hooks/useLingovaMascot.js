// هوک ماسکات
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { useRef, useEffect, useReducer } from "react";
import { tr } from "../ui/uiStrings.js";
import { speechController } from "../speech/speechController.js";
import { LINGOVA_BUBBLE_KEYS, LINGOVA_IDLE_MS, LINGOVA_LEG_MSG_COUNT, LINGOVA_LEG_MSG_MAX_DELAY_MS, LINGOVA_LEG_MSG_MIN_DELAY_MS, LINGOVA_LEG_MSG_PAUSE_MS, LINGOVA_MASCOT_WIDTH, LINGOVA_TURN_PAUSE_MS } from "../mascot/lingovaConfig.js";

export function useLingovaMascot(trackWidth, uiLang, pinned, walking, pinStartX, paused, localAnchor) {
  // پارک/توقف — با یه تپِ ساده رویِ آدمک (وقتی سنجاق‌شده) یا با یه تپِ ساده
  // بعدِ کوتاه‌مدت‌منتظرماندن برایِ دابل‌تپ (وقتی رویِ نوارِ بالاست) toggle
  // می‌شه؛ دقیقاً مثلِ دکمه‌ی توقف/پخشِ یه پلیر. با رفرنس نگه‌ش می‌داریم تا
  // تیکِ داخلِ setInterval بدونِ نیاز به ری‌استارت‌شدنِ خودِ تایمر، همیشه
  // آخرین مقدارش رو ببینه.
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const xRef = useRef(0);
  const targetRef = useRef(-1); // -1 یعنی هنوز هیچ مسیری شروع نشده
  const speedRef = useRef(0.55);
  const facingRef = useRef(1);
  const modeRef = useRef("walk"); // 'walk' | 'read' (مکثِ سرِ لبه) | 'alert' (نمایشِ پیام)
  const pauseUntilRef = useRef(0); // پایانِ مکثِ فعلی، چه سرِ لبه چه موقعِ نمایشِ پیام
  const checkpointsRef = useRef([]); // دو نقطه‌ی چک‌پوینت رویِ مسیرِ «رفت» یا «برگشتِ» جاری، برای نمایشِ پیام
  const checkpointIdxRef = useRef(0);
  const pinnedXRef = useRef(0); // فقط تو حالتِ pinned+walking: موقعیتِ x رویِ کلِ عرضِ صفحه
  const pinnedTargetRef = useRef(-1);
  const pinnedCheckpointsRef = useRef([]);
  const pinnedCheckpointIdxRef = useRef(0);
  // فقط تو حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه» (localAnchor): رفت‌وبرگشتِ
  // واقعیِ آدمک، ولی محدود به یه بازه‌ی کوچیک دورِ همون نقطه (نه کلِ عرضِ
  // صفحه) — چون قراره «سرِ همون مختصات» بمونه، نه جایِ دیگه بره.
  const localXRef = useRef(0);
  const localTargetRef = useRef(-1);
  const localCheckpointsRef = useRef([]);
  const localCheckpointIdxRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const bubbleRef = useRef(null);
  const [, forceTick] = useReducer((n) => n + 1, 0);

  // شروعِ یه «پا»ی تازه از رفت‌وبرگشت — همیشه تا دقیقاً لبه‌ی مقابل (۰ یا
  // انتهای عرض)، نه یه نقطه‌ی تصادفیِ وسط‌راه؛ همین باعث می‌شه آدمک هیچ‌وقت
  // وسطِ راه مسیرش عوض نشه. دو فاصله‌ی زمانیِ تصادفی هم این‌جا برای همین پا
  // ثبت می‌شن (نه دو موقعیتِ ثابتِ رویِ مسیر) — هر کدوم یعنی «چند میلی‌ثانیه
  // بعدِ بی‌تعامل‌شدنِ کاربر» یه پیامِ کوتاه نشون داده بشه، مستقل از این‌که
  // آدمک دقیقاً کجای مسیره؛ همین باعث می‌شه محلِ نمایشِ پیام‌ها تصادفی و
  // غیرقابل‌پیش‌بینی باشه، نه همیشه سرِ یه نقطه‌ی مشخص (مثلاً لبه‌ی صفحه).
  const startLeg = (fromX, toX, tgtRef, cpRef, cpIdxRef) => {
    tgtRef.current = toX;
    facingRef.current = toX >= fromX ? 1 : -1;
    speedRef.current = 0.45 + Math.random() * 0.3;
    cpRef.current = [
      LINGOVA_LEG_MSG_MIN_DELAY_MS + Math.random() * (LINGOVA_LEG_MSG_MAX_DELAY_MS - LINGOVA_LEG_MSG_MIN_DELAY_MS),
      LINGOVA_LEG_MSG_MIN_DELAY_MS + Math.random() * (LINGOVA_LEG_MSG_MAX_DELAY_MS - LINGOVA_LEG_MSG_MIN_DELAY_MS),
    ].sort((a, b) => a - b);
    cpIdxRef.current = 0;
  };

  // یه پیامِ حبابِ تصادفی، طبقِ زبانِ فعلیِ نرم‌افزار (uiLang)
  const pickBubbleLine = () => {
    const key = LINGOVA_BUBBLE_KEYS[Math.floor(Math.random() * LINGOVA_BUBBLE_KEYS.length)];
    return tr(key, uiLang);
  };

  // ثبتِ آخرین لحظه‌ی تعاملِ کاربر با کلِ اپ — هر نوع لمس/کلیک/اسکرول/کیبورد
  useEffect(() => {
    const mark = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("touchstart", mark, { passive: true });
    window.addEventListener("mousedown", mark);
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, { passive: true, capture: true });
    return () => {
      window.removeEventListener("touchstart", mark);
      window.removeEventListener("mousedown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark, true);
    };
  }, []);

  // پخش‌شدنِ پلیر هم مثلِ لمس/کلیک/اسکرول/کیبورد یه تعاملِ حساب می‌شه —
  // فقط وضعیتِ فعلی رو تو یه رفرنس نگه می‌داریم؛ خودِ رفرش‌کردنِ
  // lastActivityRef تو تیکِ stepLeg (پایین) انجام می‌شه، تا تا وقتی پخش
  // ادامه داره، بی‌تعاملی هیچ‌وقت فعال نشه.
  const playerPlayingRef = useRef(false);
  useEffect(() => {
    return speechController.subscribe((s) => {
      playerPlayingRef.current = s.status === "playing";
    });
  }, []);

  // یه تیکِ مشترک برای هر دو حالت (سنجاق‌شده رویِ کلِ عرضِ صفحه، یا آزادِ
  // رویِ عرضِ نوارِ بالا) — چون منطقشون کاملاً یکیه، فقط بازه‌ی حرکت/رفرنس‌ها
  // فرق می‌کنه.
  const stepLeg = (posRef, tgtRef, cpRef, cpIdxRef, edge0, edge1) => {
    // وقتی پلیر داره پخش می‌کنه، دقیقاً مثلِ یه تعاملِ واقعی، لحظه‌ی
    // «آخرین تعامل» رو مدام تازه نگه می‌داریم — یعنی تا پخش ادامه داره،
    // بی‌تعاملی هیچ‌وقت شمرده نمی‌شه.
    if (playerPlayingRef.current) {
      lastActivityRef.current = Date.now();
    }
    const isIdle = Date.now() - lastActivityRef.current > LINGOVA_IDLE_MS;

    if (tgtRef.current < 0) {
      startLeg(posRef.current, edge1, tgtRef, cpRef, cpIdxRef);
    }

    if (modeRef.current === "alert") {
      // پیام در حالِ نمایشه — با تعاملِ واقعیِ کاربر زودتر قطع می‌شه، وگرنه
      // بعدِ ۲ ثانیه خودش تمومِ و بدونِ تغییرِ مسیر ادامه‌ی راه رو می‌گیره.
      if (!isIdle || Date.now() >= pauseUntilRef.current) {
        modeRef.current = "walk";
        bubbleRef.current = null;
      }
      return;
    }

    if (modeRef.current === "read") {
      // مکثِ خیلی‌کوتاهِ سرِ لبه — بعدش برمی‌گرده به سمتِ لبه‌ی مقابل.
      if (Date.now() >= pauseUntilRef.current) {
        const next = tgtRef.current === edge0 ? edge1 : edge0;
        startLeg(posRef.current, next, tgtRef, cpRef, cpIdxRef);
        modeRef.current = "walk";
      }
      return;
    }

    const dx = tgtRef.current - posRef.current;
    if (Math.abs(dx) < 1.5) {
      // رسید به لبه — یه مکثِ خیلی‌کوتاه، بعد برمی‌گرده برای پاهای بعدی
      modeRef.current = "read";
      pauseUntilRef.current = Date.now() + LINGOVA_TURN_PAUSE_MS;
      return;
    }

    // فقط اگه کاربر واقعاً بی‌تعامل باشه و هنوز هر دو پیامِ این پا نشون داده
    // نشده باشن، بعدِ گذشتنِ فاصله‌ی زمانیِ تصادفیِ همون پیام (از لحظه‌ای که
    // کاربر بی‌تعامل شد) یه پیامِ کوتاه نشون می‌ده و به همون مسیر/مقصدِ قبلی
    // ادامه می‌ده. این فاصله کاملاً زمانیه، نه بر اساسِ موقعیتِ آدمک رویِ
    // مسیر — پس محلِ نمایشِ پیام رندوم و غیرقابل‌پیش‌بینیه.
    if (isIdle && cpIdxRef.current < LINGOVA_LEG_MSG_COUNT) {
      const idleSince = lastActivityRef.current + LINGOVA_IDLE_MS;
      const dueAt = idleSince + cpRef.current[cpIdxRef.current];
      if (Date.now() >= dueAt) {
        cpIdxRef.current += 1;
        modeRef.current = "alert";
        bubbleRef.current = pickBubbleLine();
        pauseUntilRef.current = Date.now() + LINGOVA_LEG_MSG_PAUSE_MS;
        return;
      }
    }

    posRef.current += Math.sign(dx) * speedRef.current;
  };

  // حالتِ «سنجاق‌شده» (pinned) — کاربر آدمک رو یه‌جای دلخواهِ صفحه گذاشته.
  // دیگه رویِ نوارِ بالای صفحه نیست، ولی همچنان تو همون ارتفاع (y ثابت)
  // کاملِ عرضِ صفحه رو رفت‌وبرگشت قدم می‌زنه — دقیقاً مثلِ راه‌رفتنِ آزادِ
  // نوارِ بالا، فقط رویِ محورِ y ثابت‌شده.
  useEffect(() => {
    // موقعِ خودِ درگ‌کردن (pinned=true ولی walking=false، چون هنوز رها نشده)
    // آدمک باید دقیقاً زیرِ انگشتِ کاربر بمونه؛ جابه‌جا نمی‌شه و هیچ تایمری
    // روشن نمی‌شه. اگه localAnchor فعال باشه هم این حلقه رو خاموش نگه
    // می‌داریم — اون یکی حلقه (پایین‌تر) مسئولِ حرکته تا با هم تداخل نکنن
    // (هر دو از modeRef/bubbleRef/pauseUntilRef مشترک استفاده می‌کنن).
    if (!pinned || !walking || localAnchor) {
      return undefined;
    }
    modeRef.current = "walk";
    pinnedXRef.current = pinStartX || 0;
    pinnedTargetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return; // پارک‌شده — هیچ حرکت/تیکِ منطقی انجام نشه
      const w = typeof window !== "undefined" ? window.innerWidth : 320;
      const edge1 = Math.max(w - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(pinnedXRef, pinnedTargetRef, pinnedCheckpointsRef, pinnedCheckpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [pinned, walking, localAnchor, uiLang]);

  useEffect(() => {
    if (pinned || localAnchor) return undefined;
    if (!trackWidth) return undefined;
    targetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return; // پارک‌شده — هیچ حرکت/تیکِ منطقی انجام نشه
      const edge1 = Math.max(trackWidth - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(xRef, targetRef, checkpointsRef, checkpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [trackWidth, pinned, localAnchor, uiLang]);

  // حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه» — با long-press رویِ آدمک فعال
  // می‌شه. خودِ نقطه (مختصاتِ سندِ صفحه) بیرون از این هوک، تویِ کامپوننت
  // نگه‌داری می‌شه؛ این‌جا فقط رفت‌وبرگشتِ محلیِ x رو، تویِ یه بازه‌ی کوچیکِ
  // دورِ همون نقطه، اجرا می‌کنیم — یه راه‌رفتنِ واقعی رویِ کلِ عرضِ صفحه
  // (دقیقاً مثلِ حالتِ سنجاق‌شده)، فقط با این تفاوت که ارتفاعِ (y) لنگر
  // نسبت‌به‌سندِ صفحه‌ست، نه ویوپورت.
  useEffect(() => {
    if (!localAnchor) return undefined;
    modeRef.current = "walk";
    localXRef.current = 0;
    localTargetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const w = typeof window !== "undefined" ? window.innerWidth : 320;
      const edge1 = Math.max(w - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(localXRef, localTargetRef, localCheckpointsRef, localCheckpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [localAnchor, uiLang]);

  return {
    x: localAnchor ? localXRef.current : walking ? pinnedXRef.current : pinned ? 0 : xRef.current,
    facing: facingRef.current,
    mode: pinned && !walking ? "walk" : modeRef.current,
    bubble: pinned && !walking ? null : bubbleRef.current,
  };
}
