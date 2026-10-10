// نوار صدای آپلودی داستان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useRef } from "react";
import { Loader2, Pause, Play, Gauge } from "lucide-react";
import { colors } from "../../ui/theme.js";
import { toFaDigits } from "../../utils/calendar.js";
import { StorySyncControls } from "../settings/AudioSyncSettings.jsx";
import { ClassicTriangleIcon } from "../player/playerButtons.jsx";
import { SeekAmountControl, seekAmountStore, useHoldToSeek } from "../player/seekControls.jsx";

// نوارِ کوچکِ صوتِ کاربر برای داستان — بالای متنِ داستان می‌شینه. یه سوییچِ
// دوحالته (TTS ⇄ صوتِ من) داره؛ اگه هنوز صوتی آپلود نشده فقط دکمه‌ی آپلود
// نشون می‌ده (هیچ محدودیتی رو فرمتِ فایل نیست). هیچ هایلایت/خوانشِ
// خودکاری وجود نداره — خطِ فعال فقط با دکمه‌های «◀ جمله‌ی قبل / جمله‌ی
// بعد ▶» پایینِ پلیر عوض می‌شه، کاملاً دستی و مستقل از پخشِ صدا.
// این نوار حالا فقط آپلود/حذفِ فایلِ صوتی رو نشون می‌ده — سوییچِ TTS⇄صوتِ
// من و کنترل‌های پخش (پخش/توقف، جمله‌ی قبل/بعد، نوارِ زمان) دیگه اینجا
// نیستن؛ اون‌ها به نوارِ سراسریِ پایینِ صفحه (پلیرِ اصلی) منتقل شدن —
// PlayerBarStorySwitch و UserAudioMainPlayButton/UserAudioChunkNavButton/
// UserAudioProgressTrack همون‌جا رندر می‌شن.
export function StoryUserAudioBar({ userAudio, storyLang }) {
  const fileInputRef = useRef(null);
  const { hasAudio, uploadFile, removeAudio, audioSaving, audioSaveError } = userAudio;

  const boxStyle = {
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 14,
    backgroundColor: colors.cardBg || "white",
  };

  return (
    <div style={boxStyle}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span style={{ fontSize: 12, color: colors.inkSoft }}>
          {audioSaving
            ? "در حالِ ذخیره‌ی فایلِ صوتی..."
            : hasAudio
            ? "صوتِ من (آپلودی) وصل شده"
            : "صوتِ خودت رو برای این داستان آپلود کن"}
        </span>

        {!hasAudio || audioSaving ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => !audioSaving && fileInputRef.current?.click()}
              disabled={audioSaving}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, opacity: audioSaving ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
            >
              {audioSaving && <Loader2 size={14} className="spin" />}
              {audioSaving ? "در حالِ آپلود..." : "آپلود صوت"}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={removeAudio}
              style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "none", color: colors.rose, fontSize: 12 }}
            >
              حذف صوت
            </button>
          </div>
        )}
      </div>
      {audioSaveError && (
        <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{audioSaveError}</p>
      )}
      {hasAudio && !audioSaving && <StorySyncControls userAudio={userAudio} storyLang={storyLang} />}
    </div>
  );
}
// نسخه‌ی «صوتِ کاربر» از دکمه‌ی مرکزیِ پخشِ نوارِ سراسریِ پایینِ صفحه —
// دقیقاً هم‌شکلِ MainPlayButton، فقط به‌جای speechController (تی‌تی‌اس)،
// play/pause خودِ userAudio (فایلِ آپلودی) رو صدا می‌زنه. فقط وقتی
// tab==="story" و کاربر سوییچ رو رویِ «صوت من» گذاشته رندر می‌شه.
export function UserAudioMainPlayButton({ ua, color }) {
  const { isPlaying, hasAudio, play, pause } = ua || {};
  return (
    <button
      onClick={() => { if (!hasAudio) return; isPlaying ? pause() : play(); }}
      disabled={!hasAudio}
      aria-label={isPlaying ? "توقف" : "پخش"}
      style={{
        width: 44, height: 44, borderRadius: 999, border: "none",
        background: color, color: "white", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, opacity: hasAudio ? 1 : 0.5,
        boxShadow: hasAudio ? "0 2px 6px rgba(28,37,65,0.22)" : "none",
      }}
    >
      {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginInlineStart: 2 }} />}
    </button>
  );
}
// نسخه‌ی «صوتِ کاربر» از دکمه‌ی جمله‌ی قبل/بعد — کاملاً دستی (manualIndex)،
// هیچ ربطی به زمانِ صدا نداره؛ همونی که قبلاً فقط توی StoryUserAudioBar بود.
export function UserAudioChunkNavButton({ direction, ua, color }) {
  const { nextLine, prevLine, hasAudio, seek, currentTime, duration } = ua || {};
  // نقطه‌ی مبنایِ پرش — همون لحظه‌ی شروعِ لمسِ‌طولانی از رویِ currentTimeِ
  // فعلی پر می‌شه (onHoldStart)، بعدش هرباری که تکرار می‌شه رویِ همینِ ref
  // جمع/کم می‌شه؛ چون currentTimeِ خودِ ua هر نیم‌ثانیه یک‌بار به‌روز می‌شه
  // (برای کاراییِ StoryBuilder)، و تکیه‌کردن به همون مقدارِ throttle‌شده
  // باعثِ عقب‌موندنِ محاسبه از پرش‌های پشتِ‌سرِهم می‌شد.
  const seekBaseRef = useRef(0);
  const handleTap = () => {
    if (!hasAudio) return;
    direction === "prev" ? prevLine() : nextLine();
  };
  const handleHoldStart = () => {
    seekBaseRef.current = currentTime || 0;
  };
  const handleSeekStep = () => {
    if (!hasAudio || !seek) return;
    const delta = seekAmountStore.get() * (direction === "prev" ? -1 : 1);
    seekBaseRef.current = Math.min(Math.max(seekBaseRef.current + delta, 0), duration || Infinity);
    seek(seekBaseRef.current);
  };
  const holdHandlers = useHoldToSeek(handleTap, handleSeekStep, handleHoldStart);
  return (
    <button
      {...holdHandlers}
      title={direction === "prev" ? "جمله‌ی قبل" : "جمله‌ی بعد"}
      aria-label={direction === "prev" ? "جمله‌ی قبل (نگه‌دار: چند ثانیه عقب)" : "جمله‌ی بعد (نگه‌دار: چند ثانیه جلو)"}
      disabled={!hasAudio}
      style={{ background: "none", border: "none", cursor: hasAudio ? "pointer" : "default", color, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: hasAudio ? 1 : 0.5, touchAction: "none" }}
    >
      <ClassicTriangleIcon direction={direction === "prev" ? "left" : "right"} size={22} color={color} />
    </button>
  );
}
// نسخه‌ی «صوتِ کاربر» از نوارِ پیشرفتِ پلیر — زمانِ فعلی/کل + اسلایدرِ
// seek، دقیقاً همون چیزی که توی StoryUserAudioBar بود.
export function UserAudioProgressTrack({ ua, color }) {
  const { currentTime, duration, seek, hasAudio } = ua || {};
  function fmtTime(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return toFaDigits(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
  }
  return (
    <div
      className="px-4 flex items-center gap-2"
      style={{ paddingTop: 6 }}
      // نوارِ پخشِ سراسریِ پایینِ صفحه (playerBarRef) خودش روی onTouchStart/
      // onTouchMove یه لانگ‌پرسِ کلی سوار کرده (برای پرش به تبِ در حالِ
      // پخش)؛ این هندلرها روی خودِ عنصرِ والد نصب شدن و باعث می‌شدن کشیدنِ
      // این اسلایدر با انگشت درست کار نکنه — دقیقاً همون مشکلی که برای
      // اسلایدرِ شفافیتِ پلیر هم پیش اومده بود و اونجا با همین ترفند حل شد.
      // با stopPropagation جلوی رسیدنِ لمس/کلیک به هندلرِ والد رو می‌گیریم.
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 34 }}>{fmtTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime || 0}
        onChange={(e) => hasAudio && seek(Number(e.target.value))}
        disabled={!hasAudio}
        // پخش همیشه چپ‌به‌راست پیش می‌ره؛ بدونِ direction:ltr صریح، اینپوتِ
        // native داخلِ صفحه‌ی dir="rtl" برعکس (راست‌به‌چپ) پر می‌شد.
        style={{ flex: 1, accentColor: color, opacity: hasAudio ? 1 : 0.5, direction: "ltr", touchAction: "pan-x" }}
      />
      <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 34, textAlign: "left" }}>{fmtTime(duration)}</span>
      <UserAudioSpeedControl ua={ua} color={color} />
      <SeekAmountControl color={color} />
    </div>
  );
}
// کنترلِ سرعتِ پخشِ صوتِ آپلودیِ کاربر — دقیقاً همون ظاهر/رفتارِ SpeedControl
// (سرعتِ TTS)، ولی به‌جایِ speechController، رویِ ua.rate/ua.setRate از
// useStoryUserAudio کار می‌کنه؛ آخرین آیتمِ همین ردیفه، پس (با جهتِ rtl)
// سمتِ چپِ پلیر می‌شینه — دقیقاً کنارِ دکمه‌ی سرعتِ TTS در همون موقعیت.
function UserAudioSpeedControl({ ua, color }) {
  const { rate, setRate, hasAudio } = ua || {};
  const r = rate || 1;
  const c = color || colors.gold;
  const disabled = !hasAudio || !setRate;
  const step = (delta) => setRate && setRate(Math.round((r + delta) * 10) / 10);
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
      title={`سرعتِ پخشِ صوتِ من: ${r.toFixed(1)}×`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, opacity: disabled ? 0.5 : 1 }}
    >
      <Gauge size={15} color={colors.inkSoft} />
      <button
        type="button"
        onClick={() => step(-0.1)}
        disabled={disabled || r <= 0.5}
        style={{ ...btnStyle, opacity: disabled || r <= 0.5 ? 0.4 : 1 }}
        aria-label="کم‌کردنِ سرعتِ صوتِ من"
      >
        −
      </button>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={r}
        onChange={(e) => setRate && setRate(e.target.value)}
        disabled={disabled}
        style={{ width: 44, accentColor: c }}
        aria-label="سرعتِ پخشِ صوتِ من"
      />
      <button
        type="button"
        onClick={() => step(0.1)}
        disabled={disabled || r >= 2}
        style={{ ...btnStyle, opacity: disabled || r >= 2 ? 0.4 : 1 }}
        aria-label="زیادکردنِ سرعتِ صوتِ من"
      >
        +
      </button>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24 }}>
        {r.toFixed(1)}×
      </span>
    </span>
  );
}
// سوییچِ دوحالته‌ی TTS ⇄ صوتِ من — نسخه‌ی کوچیکِ همون سوییچِ داخلِ
// StoryUserAudioBar، فقط برای نمایش روی نوارِ سراسریِ پایینِ صفحه (پلیرِ
// اصلی) وقتی تبِ فعلی «داستان‌ساز»ه.
export function PlayerBarStorySwitch({ ua }) {
  const { hasAudio, playbackMode, setPlaybackMode } = ua || {};
  return (
    <div className="flex items-center justify-center" style={{ flexShrink: 0 }}>
      <div className="flex items-center gap-1" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 20, padding: 2 }}>
        <button
          onClick={() => setPlaybackMode && setPlaybackMode("tts")}
          style={{
            padding: "3px 12px", borderRadius: 18, fontSize: 11, border: "none",
            backgroundColor: playbackMode === "tts" ? colors.teal : "transparent",
            color: playbackMode === "tts" ? "white" : colors.ink,
          }}
        >
          صدای اپ
        </button>
        <button
          onClick={() => hasAudio && setPlaybackMode && setPlaybackMode("user")}
          disabled={!hasAudio}
          style={{
            padding: "3px 12px", borderRadius: 18, fontSize: 11, border: "none",
            backgroundColor: playbackMode === "user" ? colors.teal : "transparent",
            color: playbackMode === "user" ? "white" : (hasAudio ? colors.ink : colors.cardBorder),
            cursor: hasAudio ? "pointer" : "default",
          }}
        >
          صوت من
        </button>
      </div>
    </div>
  );
}
