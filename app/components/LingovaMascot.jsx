// ماسکات لینگووا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { LINGOVA_CHARACTERS } from "../../LINGOVA_CHARACTERS.js";
import { APP_LANGUAGES, colors } from "../ui/theme.js";
import { speechController } from "../speech/speechController.js";
import { LINGOVA_DOUBLE_TAP_DIST_TOLERANCE, LINGOVA_DOUBLE_TAP_MS, LINGOVA_LONG_PRESS_MS, LINGOVA_MASCOT_HEIGHT, LINGOVA_MASCOT_WIDTH, LINGOVA_OUTFITS, LINGOVA_TAP_MOVE_TOLERANCE, loadLingovaPinnedPos, saveLingovaPinnedPos } from "../mascot/lingovaConfig.js";
import { useLingovaMascot } from "../hooks/useLingovaMascot.js";

// ⚡️ فیکسِ سرعت: این کامپوننت خودش (با تایمرِ داخلیِ ۴۵ میلی‌ثانیه‌ایِ
// useLingovaMascot) مستقل راه می‌ره و مشکلی نداره؛ مشکل اونجاست که چون
// والدش (PhrasebookMain) به‌خاطرِ چیزهایی کاملاً بی‌ربط — مثلاً هر نیم‌ثانیه
// یک‌بار، همون‌قدر که صوتِ آپلودیِ کاربر در حالِ پخشه (نگاه کن به توضیحِ
// useStoryUserAudio) — مدام دوباره رندر می‌شه، بدونِ React.memo این آدمک هم
// هر بار مجبور بود کاملاً دوباره reconcile بشه. وقتی هم‌زمان یه داستانِ
// خیلی طولانی باز باشه (که خودِ اون رندرِ والد رو کند می‌کنه)، این
// reconcile‌های اضافه‌ی آدمک دقیقاً همون فریم‌هایی رو می‌خورن که برایِ
// حرکتِ نرمِ خودش لازم داره — نتیجه‌ش همون «هنگ کردن/در جا زدن»ه. چون
// پراپ‌های این کامپوننت (uiLang/fontZoom/outfitKey/enabled/characterKey)
// همه مقدارهایِ ساده‌ان و عملاً به‌ندرت عوض می‌شن، با React.memo این
// reconcile‌هایِ الکی رو کاملاً حذف می‌کنیم؛ خودِ راه‌رفتنِ آدمک (که از
// تایمر/useReducerِ داخلیِ خودش میاد، نه از پراپ) دست‌نخورده و کاملاً
// طبیعی ادامه پیدا می‌کنه.
export const LingovaMascot = React.memo(function LingovaMascot({ uiLang, fontZoom = 1, outfitKey = "classic", enabled = true, characterKey = "classic" }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);

  // موقعیتِ «سنجاق‌شده» — اگه کاربر قبلاً آدمک رو یه‌جایی درگ کرده باشه،
  // همون‌جا (بر اساسِ درصدِ ذخیره‌شده تو localStorage) بارگذاری می‌شه؛ وگرنه
  // null می‌مونه و آدمک دقیقاً مثلِ قبل تو نوارِ بالای صفحه راه می‌ره.
  const [pinnedPos, setPinnedPos] = useState(() => loadLingovaPinnedPos());
  const [dragPos, setDragPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  // حالتِ «چسبیده به هدر» — با دو‌بار‌زدنِ سریع (دابل‌تپ) رویِ آدمک toggle
  // می‌شه. وقتی true، آدمک دیگه position:fixed نیست و مستقیم داخلِ هدر
  // رندر می‌شه؛ پس با اسکرول‌کردنِ صفحه، مثلِ بقیه‌ی محتوایِ هدر از دید
  // خارج می‌شه. راه‌رفتنِ خودش (تایمر/state تویِ useLingovaMascot) مستقلِ
  // از این پرچمه و همچنان پشتِ صحنه ادامه پیدا می‌کنه، حتی وقتی دیده نمی‌شه.
  const [pageAttached, setPageAttached] = useState(false);
  // پارک/توقف — دقیقاً مثلِ دکمه‌ی توقف/پخشِ یه پلیر: یه تپِ ساده رویِ
  // آدمک همین‌جا نگهش می‌داره (بدونِ جابه‌جایی)، یه تپِ دیگه دوباره راه
  // می‌ندازتش. غیرِ ذخیره‌شونده‌ست (هر بارگذاریِ صفحه از نو راه می‌ره).
  const [paused, setPaused] = useState(false);
  // «قفل‌شده به یه ارتفاعِ مشخصِ صفحه» — با نگه‌داشتنِ انگشت (long-press)
  // رویِ خودِ آدمک روشن/خاموش می‌شه (نه با درگ یا تپ‌های قبلی). وقتی روشنه،
  // ارتفاعِ (y) همون لحظه نسبت‌به‌کلِ سندِ صفحه (نه ویوپورت) ذخیره می‌شه و
  // آدمک رویِ کلِ عرضِ صفحه رفت‌وبرگشتِ واقعی قدم می‌زنه — دقیقاً مثلِ
  // حالتِ سنجاق‌شده — با این فرق که چون ارتفاعش نسبت‌به‌سندِ صفحه‌ست نه
  // ویوپورت، با اسکرول‌کردنِ صفحه، خودِ اون ارتفاع هم دقیقاً هم‌زمان با
  // همون بخش از صفحه پیمایش می‌شه (نه این‌که رویِ ویوپورت ثابت بمونه). با
  // شروعِ پخشِ پلیر (speechController → "playing") خودکار خاموش می‌شه تا
  // آدمک دوباره «آزاد» بشه (برگرده به همون رفتارِ قبلیِ خودش: نوارِ بالا/
  // چسبیده‌به‌هدر/سنجاق‌شده — هرکدوم که قبلاً بوده).
  // سنجاق‌شده — هرکدوم که قبلاً بوده).
  const [stepInPlace, setStepInPlace] = useState(false);
  const [stepInPlacePos, setStepInPlacePos] = useState(null); // {top} — ارتفاعِ سندِ صفحه (نه ویوپورت) در لحظه‌ی روشن‌شدن
  const mascotElRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  // برایِ فعال/غیرفعال‌کردنِ «قدم‌زدنِ سرِ جا» با نگه‌داشتنِ انگشت (long-press)
  // رویِ آدمک — بدونِ نیاز به هیچ دکمه‌ی جداگانه‌ای رویِ صفحه.
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  // وقتی آدمک هنوز سنجاق نشده (رویِ نوارِ بالا)، یه تپِ ساده باید یه‌کم صبر
  // کنه ببینه تپِ دومی (برایِ دابل‌تپِ چسبیدن‌به‌هدر) از راه می‌رسه یا نه،
  // قبل از این‌که به‌عنوانِ toggleِ پارک حساب بشه؛ این تایمر همون صبرِ کوتاهه.
  const singleTapTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => setTrackWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // اگه بعدِ سنجاق‌شدن، سایزِ صفحه عوض بشه (مثلاً چرخیدنِ گوشی)، موقعیت رو
  // دوباره از همون درصدِ ذخیره‌شده حساب می‌کنیم تا همیشه داخلِ صفحه بمونه.
  useEffect(() => {
    if (!pinnedPos) return undefined;
    const onResize = () => setPinnedPos(loadLingovaPinnedPos());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pinnedPos]);

  // موقعِ درگ‌کردن، حرکت/رهاشدنِ انگشت رو رویِ کلِ صفحه (window) گوش می‌دیم —
  // نه فقط رویِ خودِ آدمک — چون همین‌که درگ شروع می‌شه، آدمک از نوارِ بالا
  // بیرون میاد و تو یه پورتالِ دیگه رندر می‌شه؛ اگه فقط رویِ خودِ گره‌ی DOM
  // قبلی گوش می‌دادیم، با این جابه‌جاییِ درخت، رویدادهای بعدی از دست می‌رفت.
  useEffect(() => {
    if (!isDragging) return undefined;
    const clamp = (left, top) => ({
      left: Math.max(0, Math.min(window.innerWidth - LINGOVA_MASCOT_WIDTH, left)),
      top: Math.max(0, Math.min(window.innerHeight - LINGOVA_MASCOT_HEIGHT, top)),
    });
    const onMove = (e) => {
      setDragPos(clamp(e.clientX - dragOffsetRef.current.dx, e.clientY - dragOffsetRef.current.dy));
      // حرکتِ محسوس یعنی این یه درگه، نه long-press؛ تایمرِ قدم‌زدنِ سرِ جا
      // رو لغو کن.
      const movedDist = Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y);
      if (movedDist > LINGOVA_TAP_MOVE_TOLERANCE && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
    const onUp = (e) => {
      // اگه long-press همین الان (تویِ همون فشار) فعال شده، این رهاشدنِ
      // انگشت رو اصلاً به‌عنوانِ تپ/درگِ عادی حساب نکن — فقط استیت رو تمیز کن.
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        setIsDragging(false);
        return;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsDragging(false);
      // اگه بینِ گذاشتن و برداشتنِ انگشت، حرکتِ محسوسی رخ داده، این یه
      // درگِ واقعیه — نه یه تپِ ساده — پس مثلِ قبل، جایی که رها شده رو
      // سنجاق می‌کنیم و به منطقِ دابل‌تپ اصلاً کاری نداریم.
      const movedDist = Math.hypot((e.clientX ?? pointerStartRef.current.x) - pointerStartRef.current.x, (e.clientY ?? pointerStartRef.current.y) - pointerStartRef.current.y);
      if (movedDist > LINGOVA_TAP_MOVE_TOLERANCE) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        setDragPos((dp) => {
          const finalPos = dp || { left: 0, top: 0 };
          setPinnedPos(finalPos);
          saveLingovaPinnedPos(finalPos.left, finalPos.top);
          return null;
        });
        return;
      }
      // یه تپِ ساده (بدونِ حرکتِ محسوس) — دیگه مثلِ قبل بلافاصله سنجاق‌ش
      // نمی‌کنیم؛ فقط چک می‌کنیم آیا این، دومین تپِ یه دابل‌تپِ سریعه یا نه.
      setDragPos(null);
      const now = Date.now();
      const last = lastTapRef.current;
      const sinceLastTap = now - last.time;
      const tapDist = Math.hypot((e.clientX ?? pointerStartRef.current.x) - last.x, (e.clientY ?? pointerStartRef.current.y) - last.y);
      if (!pinnedPos && sinceLastTap < LINGOVA_DOUBLE_TAP_MS && tapDist < LINGOVA_DOUBLE_TAP_DIST_TOLERANCE) {
        // دابل‌تپ — اگه یه توگلِ پارکِ معلق (از تپِ اول) منتظرِ اجراست،
        // لغوش کن؛ این دو تپ برایِ چسبیدن/جداشدن از هدره، نه پارک‌کردن.
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        setPageAttached((v) => !v);
      } else {
        lastTapRef.current = { time: now, x: e.clientX ?? pointerStartRef.current.x, y: e.clientY ?? pointerStartRef.current.y };
        if (pinnedPos) {
          // سنجاق‌شده — این‌جا هیچ دابل‌تپی معنی نداره (بالا هم شرطش
          // !pinnedPos بود)، پس هر تپِ ساده بی‌درنگ پارک/ادامه رو toggle می‌کنه.
          setPaused((p) => !p);
        } else {
          // رویِ نوارِ بالا — قبل از toggleِ پارک، یه‌کم صبر کن ببین تپِ
          // دومی (دابل‌تپِ چسبیدن‌به‌هدر) از راه می‌رسه یا نه.
          if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = setTimeout(() => {
            singleTapTimeoutRef.current = null;
            setPaused((p) => !p);
          }, LINGOVA_DOUBLE_TAP_MS + 30);
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  const pinned = !!(pinnedPos || isDragging);
  // موقعِ خودِ درگ‌کردن (isDragging) آدمک باید دقیقاً زیرِ انگشتِ کاربر
  // بمونه، نه این‌که هم‌زمان رفت‌وبرگشتِ خودکار هم بکنه؛ رفت‌وبرگشت فقط
  // بعدِ رهاشدن (pinnedPos ثبت شده) شروع می‌شه.
  const walking = !!pinnedPos && !isDragging;
  const { x, facing, mode, bubble } = useLingovaMascot(
    trackWidth,
    uiLang,
    pinned,
    walking,
    pinnedPos ? pinnedPos.left : 0,
    paused,
    stepInPlace
  );
  // پارک‌شده که باشه، مُد رو به یه حالتِ ایستاده‌ی ساده (نه walk/read/alert)
  // برمی‌گردونیم تا نه پاها تاب بخورن نه دست، و حبابِ پیام هم مخفی می‌شه —
  // دقیقاً مثلِ فریزشدنِ تصویر با دکمه‌ی توقفِ یه پلیر. تویِ حالتِ
  // «قفل‌شده به یه نقطه‌ی مشخص» نیازی به override نیست — mode/bubble رو
  // خودِ هوک، از رویِ همون رفت‌وبرگشتِ محلی، درست حساب می‌کنه.
  const effectiveMode = paused ? "parked" : mode;
  const effectiveBubble = paused ? null : bubble;

  // با شروعِ پخشِ پلیرِ صدا (دکمه‌ی پلیِ نوارِ پایین)، اگه آدمک «سرِ جا قفل»
  // بود، خودکار آزادش می‌کنیم — یعنی از حالتِ ثابت‌نسبت‌به‌ویوپورتِ این
  // دکمه بیرون میاد و برمی‌گرده به همون رفتارِ عادیِ خودش نسبت‌به‌اسکرول
  // (نوارِ بالا / چسبیده‌به‌هدر / سنجاق‌شده — هرکدوم که قبلاً فعال بوده).
  useEffect(() => {
    return speechController.subscribe((s) => {
      if (s.status === "playing") setStepInPlace(false);
    });
  }, []);

  // نگه‌داشتنِ انگشت رویِ آدمک (long-press، بدونِ حرکتِ محسوس) «قفل‌شدن به
  // همین ارتفاع» رو toggle می‌کنه. موقعِ روشن‌کردن، فقط ارتفاعِ (y) فعلیِ
  // خودِ آدمک رو نسبت‌به‌بالایِ کلِ سندِ صفحه (rect.top + مقدارِ فعلیِ
  // اسکرول) حساب می‌کنیم، نه نسبت‌به‌ویوپورت — همین باعث می‌شه با
  // اسکرول‌کردنِ صفحه، اون ارتفاع دقیقاً هم‌زمان با همون نقطه از صفحه
  // بالا/پایین بره؛ x رو دست‌نخورده می‌ذاریم چون قراره آدمک رویِ کلِ عرضِ
  // صفحه (نه فقط همون x فعلی) رفت‌وبرگشت کنه.
  const activateStepInPlace = () => {
    if (mascotElRef.current) {
      const rect = mascotElRef.current.getBoundingClientRect();
      setStepInPlacePos({ top: rect.top + window.scrollY });
    }
    setStepInPlace(true);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    if (stepInPlace) {
      // تویِ حالتِ «قدم‌زدنِ سرِ جا»، درگ/پین‌کردن بی‌معنیه — تنها کاری که
      // یه فشار این‌جا می‌تونه بکنه، long-press برایِ آزادکردنه.
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setStepInPlace(false);
      }, LINGOVA_LONG_PRESS_MS);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setDragPos({ left: rect.left, top: rect.top });
    setIsDragging(true);

    // long-press (نگه‌داشتن بدونِ حرکتِ محسوس) به‌طورِ مستقل از تپ/دابل‌تپ/
    // درگِ بالا، «قدم‌زدنِ سرِ جا» رو فعال می‌کنه. اگه قبلش حرکتِ محسوسی
    // ثبت بشه (onMove بالاتر) یا زودتر رها بشه (onUp)، همین تایمر لغو می‌شه.
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      setIsDragging(false);
      setDragPos(null);
      activateStepInPlace();
    }, LINGOVA_LONG_PRESS_MS);
  };

  const activePos = isDragging ? dragPos : pinnedPos;
  // اگه آدمک نزدیکِ لبه‌ی بالای صفحه سنجاق شده باشه، حباب رو به‌جای بالا،
  // پایینِ آدمک نشون می‌دیم تا از صفحه بیرون نزنه.
  const bubbleNearTop = pinned && activePos && activePos.top < 34;

  const bubbleDir = APP_LANGUAGES[uiLang]?.dir || "ltr";
  const bubbleFontFamily = uiLang === "fa" ? "var(--font-fa)" : "var(--font-latin)";

  const outfit = LINGOVA_OUTFITS[outfitKey] || LINGOVA_OUTFITS.classic;
  const shirtColor = outfit.shirt || colors.teal;
  const pantsColor = outfit.pants || colors.ink;

  // تویِ حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه»، x همون رفت‌وبرگشتِ محلیِ
  // واقعیه که خودِ هوک (بالاتر) حساب کرده — نه صفرِ ثابت — یعنی آدمک واقعاً
  // قدم برمی‌داره و می‌ره‌وبرمی‌گرده، فقط تویِ یه بازه‌ی کوچیکِ دورِ همون
  // نقطه‌ی ثابت (نه رویِ کلِ صفحه).
  const displayX = x;

  // حبابِ پیام گاهی که آدمک تا انتهای عرضِ صفحه می‌ره، از کادرِ گوشی بیرون
  // می‌زد و متنش کامل دیده نمی‌شد. راه‌رفتنِ آدمک تا لبه‌ی صفحه خودش درسته
  // و دست‌نخورده می‌مونه؛ فقط خودِ حباب رو بعدِ رندر با getBoundingClientRect
  // اندازه می‌گیریم و اگه از عرضِ ویوپورت بیرون زده باشه (چپ یا راست)، با یه
  // translateX افقی به داخلِ صفحه هلش می‌دیم — بدونِ اینکه به موقعیتِ خودِ
  // آدمک یا انیمیشنِ بالا/پایین‌رفتنِ حباب (که رویِ همین transform ولی جدا،
  // رویِ یه div تو در تو، کار می‌کنه) دست بزنیم.
  const bubbleWrapRef = useRef(null);
  const [bubbleShiftX, setBubbleShiftX] = useState(0);
  useLayoutEffect(() => {
    if (!effectiveBubble) {
      setBubbleShiftX(0);
      return;
    }
    const el = bubbleWrapRef.current;
    if (!el) return;
    const prevTransform = el.style.transform;
    el.style.transform = "translateX(0px)";
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.left < margin) {
      shift = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }
    el.style.transform = prevTransform;
    setBubbleShiftX(shift);
  }, [effectiveBubble, displayX, facing, bubbleNearTop]);

  const mascotBody = (
    <div
      ref={mascotElRef}
      onPointerDown={enabled ? handlePointerDown : undefined}
      style={{
        position: "absolute",
        top: 0,
        left: displayX,
        width: LINGOVA_MASCOT_WIDTH,
        height: LINGOVA_MASCOT_HEIGHT,
        touchAction: "none",
        // به‌جایِ حذفِ شرطیِ آدمک، وقتی کاربر از تنظیمات خاموشش کنه فقط
        // opacity‌ش با یه ترنزیشنِ نرم صفر می‌شه (محو شدن) — راه‌رفتن/تایمرها
        // پشتِ صحنه ادامه پیدا می‌کنن، فقط دیگه دیده/قابلِ‌درگ‌کردن نیست.
        opacity: enabled ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: enabled ? "auto" : "none",
        cursor: isDragging ? "grabbing" : "grab",
        filter: isDragging ? "drop-shadow(0 3px 6px rgba(0,0,0,.45))" : "none",
      }}
    >
      {/* حبابِ پیام عمداً بیرونِ هر ظرفی‌ست که scaleX(facing) رو داره — قبلاً
          هم خودِ حباب یه scaleX(-1) جبرانی می‌گرفت تا متنش با چرخشِ آدمک
          آینه‌ای نشه، ولی ترکیبِ اون دو تبدیل باعث می‌شد متنِ فارسی (راست‌به‌چپ)
          گاهی برعکس/جابه‌جا رندر بشه. حالا فقط خودِ کاراکتر (svg) می‌چرخه، پس
          دیگه نیازی به هیچ تبدیلی رویِ حباب نیست و متنش همیشه طبیعی نمایش
          داده می‌شه. جهتِ متن (rtl/ltr) و فونت هم از تنظیماتِ زبان/فونتِ خودِ
          اپ (uiLang, fontFamily) خونده می‌شه، نه یه مقدارِ ثابت. */}
      {effectiveBubble && (
        <div
          ref={bubbleWrapRef}
          style={{
            position: "absolute",
            top: bubbleNearTop ? LINGOVA_MASCOT_HEIGHT + 2 : -22,
            left: facing === 1 ? -4 : -34,
            transform: `translateX(${bubbleShiftX}px)`,
            transition: "transform 0.15s ease",
          }}
        >
          <div
            className="lingova-bubble"
            dir={bubbleDir}
            style={{
              background: colors.paper,
              color: colors.ink,
              fontFamily: bubbleFontFamily,
              fontSize: 9 * fontZoom,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            {effectiveBubble}
          </div>
        </div>
      )}
      {/* نشونه‌ی کوچیکِ پارک‌بودن — یه آیکونِ پلیِ ریز بالای آدمک، تا کاربر
          بفهمه با تپِ بعدی دوباره راه می‌افته (دقیقاً مثلِ حالتِ Pause یه پلیر) */}
      {paused && (
        <div
          style={{
            position: "absolute",
            top: -16,
            left: facing === 1 ? 6 : -6,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: colors.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,.4)",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "3.5px solid transparent",
              borderBottom: "3.5px solid transparent",
              borderLeft: `5px solid ${colors.paper}`,
              marginLeft: 2,
            }}
          />
        </div>
      )}
      {characterKey && characterKey !== "classic" && LINGOVA_CHARACTERS[characterKey] ? (
        // کاراکترهایِ آماده (غیرِکلاسیک) — یه تصویرِ یک‌تیکه‌ن، پس بر خلافِ
        // آدمکِ کلاسیک نمی‌تونن پا/دستشون رو جدا تاب بدن؛ حرکتشون از دو لایه
        // میاد: چرخش (facing) و انیمیشنِ راه‌رفتن (واداک + بالا-پایین).
        //
        // نکته‌ی مهم: چرخش (facing) رویِ یه <div> جدا از خودِ <img> اعمال می‌شه،
        // نه رویِ خودِ تصویر. قبلاً هر دو (چرخش + انیمیشنِ راه‌رفتن) رویِ یه
        // عنصر بودن و چون انیمیشنِ CSS کلِ transform رو بازنویسی می‌کنه،
        // چرخش (scaleX) خاموش می‌شد — یعنی آدمک هیچ‌وقت واقعاً برنمی‌گشت، فقط
        // تاب می‌خورد و انگار داشت دنده‌عقب می‌رفت. با جدا کردنشون رویِ دو
        // لایه، هم چرخش (با transition نرم، نه پرشِ آنی) هم راه‌رفتن هر دو
        // درست کار می‌کنن.
        <div
          style={{
            width: LINGOVA_MASCOT_WIDTH,
            height: LINGOVA_MASCOT_HEIGHT,
            display: "block",
            transform: `scaleX(${facing})`,
            transition: "transform 0.32s cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        >
          <img
            src={LINGOVA_CHARACTERS[characterKey].png}
            alt={LINGOVA_CHARACTERS[characterKey].label}
            draggable={false}
            className={effectiveMode === "walk" ? "lingova-char-walk" : ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
        <svg
          viewBox="0 0 30 38"
          width={LINGOVA_MASCOT_WIDTH}
          height={LINGOVA_MASCOT_HEIGHT}
          style={{ overflow: "visible", display: "block", transform: `scaleX(${facing})` }}
        >
          {/* چماق — دستِ نگه‌دارنده‌اش وقتِ راه‌رفتن تاب می‌خوره، وقتِ
              هشدار (بی‌تعاملیِ کاربر) بالا نگه داشته می‌شه */}
          <g
            className={effectiveMode === "alert" ? "lingova-arm-alert" : effectiveMode === "walk" ? "lingova-arm-walk" : ""}
            style={{ transformOrigin: "18px 15px" }}
          >
            <rect x="17" y="3" width="2.6" height="11" rx="1.3" fill="#8a5a2b" />
            <circle cx="18.3" cy="3" r="2.6" fill="#6b4423" />
          </g>
          {/* سر — موقعِ «خوندن» یکم به‌سمتِ پایین خم می‌شه، انگار حواسش به متنه */}
          <g
            style={{
              transform: effectiveMode === "read" ? "rotate(18deg)" : "none",
              transformOrigin: "15px 8px",
              transition: "transform 0.35s ease",
            }}
          >
            <circle cx="15" cy="8" r="5" fill={colors.gold} />
            <circle cx="17" cy="7.2" r="0.8" fill={colors.ink} />
          </g>
          {/* تنه (پیراهن) */}
          <rect x="12" y="13" width="6" height="12" rx="3" fill={shirtColor} />
          {/* پاها (شلوار) — فقط موقعِ راه‌رفتن (چه رویِ نوار، چه سرِ جا) تاب می‌خورن */}
          <g className={effectiveMode === "walk" ? "lingova-leg-l" : ""} style={{ transformOrigin: "13px 25px" }}>
            <rect x="11.5" y="25" width="2.4" height="10" rx="1.2" fill={pantsColor} />
          </g>
          <g className={effectiveMode === "walk" ? "lingova-leg-r" : ""} style={{ transformOrigin: "17px 25px" }}>
            <rect x="16" y="25" width="2.4" height="10" rx="1.2" fill={pantsColor} />
          </g>
        </svg>
      )}
    </div>
  );

  return (
    <>
      {/* جای‌گیر — همون ارتفاعِ قبلی (40px) رو داخلِ هدر نگه می‌داره تا
          چیدمانِ بقیه‌ی هدر (ردیفِ آواتار/تنظیمات و...) جابه‌جا نشه؛ عرضِ
          همین‌جا برای اندازه‌گیریِ محدوده‌ی حرکتِ آدمک (trackWidth) استفاده
          می‌شه. تو حالتِ پیش‌فرض، آدمک این‌جا رندر نمی‌شه (چون با اسکرول‌شدنِ
          هدر از دیدِ کاربر خارج می‌شد؛ به‌جاش پایین‌تر با createPortal رندر
          می‌شه)، ولی تو حالتِ «چسبیده به هدر» (pageAttached، با دابل‌تپ
          فعال می‌شه)، دقیقاً همین‌جا و به‌صورتِ معمولی (نه پورتال/فیکس) رندر
          می‌شه تا با اسکرول‌کردنِ صفحه، مثلِ بقیه‌ی هدر از دید خارج بشه. */}
      <div ref={trackRef} style={{ height: 40, marginBottom: 2, position: "relative" }}>
        {!stepInPlace && pageAttached && !pinned && mascotBody}
      </div>

      {/* حالتِ پیش‌فرض/راه‌رفتن: آدمک مستقیم زیرِ <body> (با createPortal) و
          position: fixed رندر می‌شه — یه نوارِ باریکِ همیشه-ثابتِ بالای
          صفحه، هم‌رنگِ گرادیانتِ هدر، که با اسکرول‌کردنِ بقیه‌ی صفحه از دید
          خارج نمی‌شه. با دابل‌تپ رویِ آدمک می‌شه از این حالت به حالتِ
          «چسبیده به هدر» بالا سوییچ کرد و برعکس. */}
      {!stepInPlace &&
        !pinned &&
        !pageAttached &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: 40,
              zIndex: 60,
              overflow: "hidden",
              pointerEvents: "none",
              background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.07), transparent 55%), linear-gradient(165deg, ${colors.teal} 0%, ${colors.ink} 78%)`,
            }}
          >
            <div className="px-4" style={{ position: "relative", height: "100%" }}>
              {mascotBody}
            </div>
          </div>,
          document.body
        )}

      {/* حالتِ سنجاق‌شده/درگ: آدمک از نوارِ بالا بیرون میاد و رویِ کلِ صفحه،
          دقیقاً همون‌جایی که کاربر با انگشتش گذاشته/داره می‌بره، رندر می‌شه.
          خودِ لایه‌ی بیرونی pointerEvents:none هست تا رویِ بقیه‌ی صفحه کلیک
          رو نگیره؛ فقط خودِ آدمک (pointerEvents:auto) قابلِ‌گرفتنه. */}
      {!stepInPlace &&
        pinned &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 70, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: activePos ? activePos.top : 0, left: walking ? 0 : activePos ? activePos.left : 0 }}>
              {mascotBody}
            </div>
          </div>,
          document.body
        )}

      {/* حالتِ «قفل‌شده به یه ارتفاعِ مشخص» — با نگه‌داشتنِ انگشت (long-press)
          رویِ آدمک فعال می‌شه. صرفِ‌نظر از این‌که قبلش تو کدوم حالت بود
          (نوارِ بالا/چسبیده‌به‌هدر/سنجاق‌شده)، حالا مستقیماً با ارتفاعِ سندِ
          صفحه (گرفته‌شده در لحظه‌ی long-press، نه ویوپورت) و left:0 (کلِ
          عرضِ صفحه) رندر می‌شه. این div به‌طورِ مستقیم زیرِ <body> پورتال
          شده و position:absolute داره — یعنی هیچ اجدادِ position:fixed/
          relative‌ای بینِ خودش و سندِ صفحه نیست، پس containing-blockِ
          واقعیش خودِ سندِ صفحه‌ست، نه ویوپورت. نتیجه: با اسکرول‌کردنِ صفحه،
          این ارتفاع هم دقیقاً هم‌زمان با همون بخش از صفحه بالا/پایین
          می‌ره — نه این‌که رویِ ویوپورت ثابت بمونه. آدمک خودش رویِ کلِ عرضِ
          صفحه واقعاً رفت‌وبرگشت قدم می‌زنه (x از هوکِ useLingovaMascot،
          دقیقاً مثلِ حالتِ سنجاق‌شده). */}
      {stepInPlace &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: stepInPlacePos ? stepInPlacePos.top : 0,
              left: 0,
              right: 0,
              zIndex: 75,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "relative", pointerEvents: "auto" }}>{mascotBody}</div>
          </div>,
          document.body
        )}
      <style>{`
        @keyframes lingovaLegL { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
        @keyframes lingovaLegR { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }
        @keyframes lingovaArmWalk { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes lingovaArmAlert { 0%, 100% { transform: rotate(-95deg) translateY(0); } 50% { transform: rotate(-95deg) translateY(-2px); } }
        @keyframes lingovaBubbleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .lingova-leg-l { animation: lingovaLegL 0.5s linear infinite; }
        .lingova-leg-r { animation: lingovaLegR 0.5s linear infinite; }
        .lingova-arm-walk { animation: lingovaArmWalk 0.5s linear infinite; }
        .lingova-arm-alert { animation: lingovaArmAlert 0.6s ease-in-out infinite; }
        .lingova-bubble { animation: lingovaBubbleBob 1s ease-in-out infinite; }
        @keyframes lingovaCharWalk {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-4deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-2px) rotate(4deg); }
        }
        .lingova-char-walk { animation: lingovaCharWalk 0.5s ease-in-out infinite; transform-origin: 50% 100%; }
      `}</style>
    </>
  );
});
