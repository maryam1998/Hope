// نوار پیشرفت، خواندن خودکار و سرعت
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { Pause, PlayCircle, Gauge } from "lucide-react";
import { TTS_LOCALE } from "../../tts/ttsConfig.js";
import { colors } from "../../ui/theme.js";
import { toFaDigits } from "../../utils/calendar.js";
import { speechController } from "../../speech/speechController.js";
import { SeekAmountControl } from "./seekControls.jsx";

// نوارِ پیشرفتِ کِشیدنی/تپ‌کردنیِ پلیر — دقیقاً همون ایده‌ی دموی
// «demo-progress-bar.html»: چون پخش با Web Speech API انجام می‌شه (نه یه
// فایلِ صوتیِ واقعی)، مرورگر currentTime/duration واقعی بهمون نمی‌ده. برای
// همین دقتِ این نوار «جمله‌به‌جمله»ست (نه میلی‌ثانیه‌ای)، و زمانِ نشون‌داده‌شده
// یه تخمینه — بر اساسِ طولِ کاراکتریِ متن و سرعتِ فعلیِ پخش. کشیدن/تپ‌کردن
// رو نوار، جمله‌ی متناظرش رو با speechController.seekToChunk صدا می‌زنه.
export const TTS_MS_PER_CHAR = 90; // فقط برای تخمینِ زمانِ نمایشی — نه پخشِ واقعی
export function PlayerProgressTrack({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);
  const trackRef = useRef(null);
  const [dragPct, setDragPct] = useState(null);
  const draggingRef = useRef(false);

  const isActive = state.status !== "idle" && !!state.key && state.total > 0;
  const meta = isActive ? speechController.getChunksMeta() : [];
  const fullLen = isActive ? speechController.getFullTextLength() : 0;
  const msPerChar = TTS_MS_PER_CHAR / Math.max(state.rate || 1, 0.25);
  const totalMs = fullLen * msPerChar;
  const chunkStart = isActive && meta[state.chunkIndex] ? meta[state.chunkIndex].start : 0;
  const restPct = fullLen ? (chunkStart / fullLen) * 100 : 0;
  const shownPct = dragPct != null ? dragPct : restPct;
  const c = color || colors.gold;

  function fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return toFaDigits(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
  }

  function pctFromClientX(clientX) {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    // پخش همیشه از چپ به راست پیش می‌ره (استانداردِ جهانیِ پلیرهای صوتی،
    // مستقل از راست‌به‌چپ بودنِ متن/رابط): سمتِ چپِ نوار = صفر درصد، راست = صد درصد
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(100, Math.max(0, pct));
  }
  function idxFromPct(pct) {
    if (!meta.length || !fullLen) return 0;
    const targetChar = (pct / 100) * fullLen;
    let idx = 0;
    for (let i = 0; i < meta.length; i++) {
      if (targetChar >= meta[i].start) idx = i;
    }
    return idx;
  }
  function onMove(clientX) {
    setDragPct(pctFromClientX(clientX));
  }
  function onEnd(clientX) {
    const pct = pctFromClientX(clientX);
    const idx = idxFromPct(pct);
    setDragPct(null);
    draggingRef.current = false;
    speechController.seekToChunk(idx);
  }
  function startDrag(clientX) {
    if (!isActive) return;
    draggingRef.current = true;
    onMove(clientX);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (draggingRef.current) onMove(e.clientX);
    }
    function handleMouseUp(e) {
      if (draggingRef.current) onEnd(e.clientX);
    }
    function handleTouchMove(e) {
      if (draggingRef.current && e.touches[0]) onMove(e.touches[0].clientX);
    }
    function handleTouchEnd(e) {
      if (draggingRef.current) {
        const t = e.changedTouches[0];
        onEnd(t ? t.clientX : 0);
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, fullLen]);

  return (
    <div className="px-4 flex items-center gap-2" style={{ paddingTop: 2 }}>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center", flexShrink: 0 }}>
        {isActive ? fmtTime((shownPct / 100) * totalMs) : "۰۰:۰۰"}
      </span>
      <div
        ref={trackRef}
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) startDrag(t.clientX);
        }}
        style={{
          position: "relative",
          flex: 1,
          height: 24,
          display: "flex",
          alignItems: "center",
          cursor: isActive ? "pointer" : "default",
          touchAction: "none",
          opacity: isActive ? 1 : 0.45,
        }}
      >
        <div style={{ position: "absolute", right: 0, left: 0, height: 4, borderRadius: 2, background: colors.goldSoft }} />
        {isActive && meta.length > 1 && fullLen > 0 && (
          <div style={{ position: "absolute", right: 0, left: 0, height: 4 }}>
            {meta.slice(1).map((m, i) => (
              <div
                key={i}
                style={{ position: "absolute", top: 0, width: 2, height: 4, background: "rgba(28,37,65,.3)", left: `${(m.start / fullLen) * 100}%` }}
              />
            ))}
          </div>
        )}
        {/* پخش از چپ به راست پیش می‌ره: بخشِ پرشده از سمتِ چپِ نوار شروع
            می‌شه و با پیشرفتِ خواندن به سمتِ راست بزرگ‌تر می‌شه. */}
        <div style={{ position: "absolute", left: 0, height: 4, borderRadius: 2, background: c, width: `${shownPct}%` }} />
        <div
          style={{
            position: "absolute",
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: c,
            border: `2px solid ${colors.paper}`,
            boxShadow: "0 1px 4px rgba(28,37,65,.35)",
            left: `${shownPct}%`,
            transform: "translateX(-50%)",
          }}
        />
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center", flexShrink: 0 }}>
        {isActive ? fmtTime(totalMs) : "۰۰:۰۰"}
      </span>
      <SpeedControl color={colors.gold} />
      <SeekAmountControl color={colors.gold} />
    </div>
  );
}
// دکمه‌ی «خواندن خودکار» — یک لیست از {text, code, el} می‌گیره (el اختیاریه،
// برای اسکرول‌کردن خودکار به همون آیتم) و پشت سر هم، با توجه به تنظیم
// تکرار سراسری (RepeatButton بالاتر)، هرکدوم رو می‌خونه؛ وقتی یه آیتم تمام
// تکرارهاش تموم شد (status از speechController میره رو idle)، خودش می‌ره
// سراغ آیتم بعدی و صفحه رو با اسکرول نرم به همون‌جا می‌بره.
function AutoReadButton({ getItems, color, label, trackLangCode, modeKey }) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const idxRef = useRef(0);
  // پاراگرافی که آیتمِ در حال خواندنِ فعلی بهش تعلق داره (نه ایندکسِ خام تو
  // لیست — چون طول لیست با عوض‌شدنِ حالت جمله‌به‌جمله/پاراگراف‌به‌پاراگراف
  // فرق می‌کنه). با همین، وقتی کاربر وسط خواندنِ خودکار حالت رو عوض می‌کنه
  // می‌فهمیم دقیقاً کجای داستانیم و می‌تونیم تو لیستِ تازه هم از همون‌جا
  // ادامه بدیم.
  const piRef = useRef(0);
  const lastKeyRef = useRef(null);
  // آخرین ایندکسِ آیتمی که خواندنِ خودکار توش بود، وقتی کاربر دکمه‌ی
  // توقف رو زد (یا کامپوننت خاموش شد). دفعه‌ی بعد که دوباره روشنش کنه،
  // از همین ایندکس ادامه می‌ده — نه از آیتمِ اول. (آفستِ دقیقِ داخلِ خودِ
  // همون آیتم رو دیگه لازم نیست جدا نگه داریم؛ چون speechController خودش
  // به‌طور خودکار آخرین نقطه‌ی هر متن رو به‌خاطر می‌سپاره و همین که
  // playAt دوباره برای همون آیتم toggle رو صدا بزنه، از همون‌جا ادامه
  // پیدا می‌کنه.)
  const savedIdxRef = useRef(0);
  // آخرین لیستِ آیتم‌هایی که واقعاً باهاش پخش شروع شده (یعنی مالِ حالتِ
  // نمایشِ *قبلی*، نه تازه‌ترین). لازمه چون وقتی modeKey عوض می‌شه،
  // getItemsRef.current() دیگه لیستِ حالتِ قدیم رو نمی‌ده — برای محاسبه‌ی
  // اینکه دقیقاً کجای متن بودیم، به همین لیستِ قدیمی نیاز داریم.
  const lastItemsRef = useRef([]);
  const [elapsed, setElapsed] = useState(0);
  // همیشه آخرین getItems (یعنی آخرین انتخاب کاربر برای جمله‌به‌جمله/
  // پاراگراف‌به‌پاراگراف) رو نگه می‌داره. چون این ref هر رندر آپدیت می‌شه ولی
  // خودِ آبجکتش عوض نمی‌شه، حتی effectِ زیرین (که فقط یه‌بار موقع mount اجرا
  // می‌شه و playAt رو closure می‌کنه) هم با خوندن getItemsRef.current همیشه
  // به آخرین انتخاب کاربر می‌رسه — نه یه نسخه‌ی قدیمی که موقع mount گیر کرده.
  const getItemsRef = useRef(getItems);
  useEffect(() => {
    getItemsRef.current = getItems;
  });

  // تایمرِ زنده — تا کاربر همون لحظه ببینه چقدر داره می‌خونه.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  function playAt(i, startCharOffset) {
    if (!activeRef.current) return;
    const items = (getItemsRef.current && getItemsRef.current()) || [];
    lastItemsRef.current = items;
    if (i >= items.length) {
      activeRef.current = false;
      setActive(false);
      lastKeyRef.current = null;
      // کل لیست طبیعی تموم شد — دفعه‌ی بعد که «خواندنِ خودکار» دوباره
      // زده بشه، باید از آیتمِ اول شروع بشه، نه اینکه بخواد ادامه‌ی
      // چیزی بده که قبلاً تمام‌شده.
      savedIdxRef.current = 0;
      return;
    }
    const item = items[i];
    idxRef.current = i;
    if (!item || !item.text) {
      playAt(i + 1);
      return;
    }
    if (item.pi !== undefined) piRef.current = item.pi;
    if (item.el && item.el.scrollIntoView) {
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const locale = TTS_LOCALE[item.code] || "en-US";
    lastKeyRef.current = `${locale}::${item.text}`;
    speechController.toggle(item.text, item.code, startCharOffset);
  }

  useEffect(() => {
    return speechController.subscribe((state) => {
      if (!activeRef.current) return;
      if (state.status !== "idle" || !state.key) return;
      if (state.key === lastKeyRef.current) {
        // خودِ آیتمِ جاریِ خواندن خودکار تموم شد — برو سراغ بعدی.
        playAt(idxRef.current + 1);
      } else if (lastKeyRef.current) {
        // یه پخشِ دیگه (مثلاً تلفظِ یه لغت که کاربر روش زده) وسط خواندن
        // خودکار اجرا و تموم شد — به‌جای اینکه خواندن خودکار متوقف بمونه یا
        // از اول شروع بشه، دقیقاً از همون جمله/پاراگرافی که قطع شده بود
        // ادامه پیدا می‌کنه.
        playAt(idxRef.current);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // اگه کامپوننت از بین رفت وسط خوندن خودکار، پخش رو نگه‌دار.
    return () => {
      if (activeRef.current) {
        activeRef.current = false;
        speechController.stop();
      }
    };
  }, []);

  // کاربر وسط خواندنِ خودکار، حالتِ نمایش ترجمه رو عوض کرد (جمله‌به‌جمله
  // ↔ پاراگراف‌به‌پاراگراف ↔ هیچکدام) — به‌جای اینکه صدا قطع بشه یا از اولِ
  // جمله/پاراگرافِ تازه از نو شروع بشه، دقیقاً از همون نقطه‌ای که تا الان
  // خونده بودیم ادامه پیدا می‌کنه. برای این کار، نقطه‌ی فعلی رو نسبت به
  // متنِ کاملِ همون پاراگراف اندازه می‌گیریم (چون متنِ حالتِ پاراگراف/هیچکدام
  // دقیقاً حاصلِ چسبوندنِ جمله‌های همون پاراگرافه با فاصله)، بعد همون آفست
  // رو تو ساختارِ تازه (جمله‌به‌جمله یا پاراگراف‌به‌پاراگراف) پیدا می‌کنیم.
  const prevModeKeyRef = useRef(modeKey);
  useEffect(() => {
    if (modeKey === prevModeKeyRef.current) return;
    prevModeKeyRef.current = modeKey;
    if (!activeRef.current) return;

    const pi = piRef.current;
    const oldItems = lastItemsRef.current || [];
    const newItems = (getItemsRef.current && getItemsRef.current()) || [];
    const oldPlayingItem = oldItems[idxRef.current];

    function fallback() {
      let newIdx = newItems.findIndex((it) => it.pi === pi);
      if (newIdx === -1) newIdx = 0;
      playAt(newIdx);
    }

    if (!oldPlayingItem) {
      fallback();
      return;
    }

    // آفستِ فعلی، داخلِ متنِ آیتمِ در حال پخشِ قبلی (سبک قدیم).
    const localOffset = speechController.getCharOffset();

    // اگه اون آیتم خودش تنها بخشِ این پاراگراف بود (یعنی حالتِ قبلی
    // پاراگراف/هیچکدام بوده)، این آفست همون آفستِ داخلِ کلِ پاراگرافه.
    // اگه چند جمله برای این پاراگراف بوده (حالتِ قبلی جمله‌به‌جمله)، باید
    // طولِ جمله‌های قبلیِ همون پاراگراف رو هم اضافه کنیم.
    const oldOfParagraph = oldItems.filter((it) => it.pi === pi);
    let paragraphOffset = localOffset;
    if (oldOfParagraph.length > 1) {
      let acc = 0;
      for (const it of oldOfParagraph) {
        if (it === oldPlayingItem) {
          paragraphOffset = acc + localOffset;
          break;
        }
        acc += it.text.length + 1; // +1 برای فاصله‌ای که بینِ جمله‌ها موقعِ چسبوندن گذاشته می‌شه
      }
    }

    const newOfParagraph = newItems.filter((it) => it.pi === pi);
    let targetItem = null;
    let targetOffset = 0;
    if (newOfParagraph.length > 1) {
      // مقصد جمله‌به‌جمله‌ست — ببین این آفست تو کدوم جمله می‌افته.
      let acc = 0;
      for (let k = 0; k < newOfParagraph.length; k++) {
        const it = newOfParagraph[k];
        const end = acc + it.text.length;
        if (paragraphOffset <= end || k === newOfParagraph.length - 1) {
          targetItem = it;
          targetOffset = Math.max(0, paragraphOffset - acc);
          break;
        }
        acc = end + 1;
      }
    } else if (newOfParagraph.length === 1) {
      targetItem = newOfParagraph[0];
      targetOffset = paragraphOffset;
    }

    if (!targetItem) {
      fallback();
      return;
    }

    const newIdx = newItems.indexOf(targetItem);
    const newLocale = TTS_LOCALE[targetItem.code] || "en-US";
    const newKeyForTarget = `${newLocale}::${targetItem.text}`;
    if (newKeyForTarget === lastKeyRef.current) {
      // متنِ آیتمِ تازه با متنی که همین الان داره پخش می‌شه یکیه (مثلاً
      // جابه‌جایی بینِ «پاراگراف‌به‌پاراگراف» و «هیچکدام» که هر دو از
      // متنِ یکسانی استفاده می‌کنن) — پس صدا اصلاً قطع نشده و کاری لازم
      // نیست، فقط ایندکس/پاراگرافِ ردگیری‌شده رو به‌روز می‌کنیم.
      idxRef.current = newIdx;
      lastItemsRef.current = newItems;
      return;
    }

    const startCharOffset = Math.max(0, Math.min(targetOffset, Math.max(targetItem.text.length - 1, 0)));

    playAt(newIdx, startCharOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeKey]);

  const c = color || colors.gold;

  function handleClick(e) {
    e.stopPropagation();
    if (active) {
      // نقطه‌ی توقف رو نگه می‌داریم — دفعه‌ی بعد که «خواندنِ خودکار» دوباره
      // روشن بشه، از همین آیتم ادامه پیدا می‌کنه (نه از اول لیست). آفستِ
      // دقیقِ داخلِ خودِ آیتم رو خودِ speechController خودکار به‌خاطر می‌سپاره.
      savedIdxRef.current = idxRef.current;
      activeRef.current = false;
      setActive(false);
      speechController.stop();
    } else {
      activeRef.current = true;
      idxRef.current = savedIdxRef.current;
      setActive(true);
      playAt(savedIdxRef.current);
    }
  }

  return (
    <span className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className="flex items-center gap-1"
        style={{
          color: active ? c : colors.inkSoft,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          flexShrink: 0,
        }}
        title={active ? "توقف خواندن خودکار" : "خواندن خودکار همه (با اسکرول خودکار)"}
        aria-label={active ? "توقف خواندن خودکار" : "خواندن خودکار همه"}
      >
        {active ? <Pause size={16} /> : <PlayCircle size={16} />}
        {label && <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>}
      </button>
      {active && trackLangCode && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: c,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
          title="مدت زمان خواندن این جلسه"
        >
          ⏱ {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      )}
    </span>
  );
}
function SpeedControl({ color }) {
  const [rate, setRateState] = useState(() => speechController.getRate());
  useEffect(
    () => speechController.subscribe((s) => setRateState(s.rate)),
    []
  );
  const c = color || colors.gold;
  // با انگشت روی اسلایدر تنظیم دقیق سخته؛ برای همین دو تا دکمه‌ی +/- هم
  // اضافه شده که با هر بار لمس، ۰.۱ واحد سرعت رو کم/زیاد می‌کنن. چون این
  // کامپوننت مشترکه و همه‌ی پلیرهای اپ از همین یه SpeedControl استفاده
  // می‌کنن، این تغییر خودکار روی همه‌شون اعمال می‌شه.
  const step = (delta) => {
    const next = Math.round((rate + delta) * 10) / 10;
    speechController.setRate(next);
  };
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
      title={`سرعت پخش: ${rate.toFixed(1)}×`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
    >
      <Gauge size={15} color={colors.inkSoft} />
      <button
        type="button"
        onClick={() => step(-0.1)}
        disabled={rate <= 0.25}
        style={{ ...btnStyle, opacity: rate <= 0.25 ? 0.4 : 1 }}
        aria-label="کم کردن سرعت پخش"
      >
        −
      </button>
      <input
        type="range"
        min={0.25}
        max={2}
        step={0.05}
        value={rate}
        onChange={(e) => speechController.setRate(e.target.value)}
        style={{ width: 44, accentColor: c }}
        aria-label="سرعت پخش صدا"
      />
      <button
        type="button"
        onClick={() => step(0.1)}
        disabled={rate >= 2}
        style={{ ...btnStyle, opacity: rate >= 2 ? 0.4 : 1 }}
        aria-label="زیاد کردن سرعت پخش"
      >
        +
      </button>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24 }}>
        {rate.toFixed(1)}×
      </span>
    </span>
  );
}
