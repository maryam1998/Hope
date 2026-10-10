// ضبط صدای کاربر
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { X, Pause, PlayCircle, Square, Mic } from "lucide-react";
import { colors } from "../../ui/theme.js";

// دکمه‌ی «ضبطِ صدایِ خودم» — گوشه‌ی بالا-راستِ پلیر. کاملاً جدا از پخشِ
// اصلیِ TTS (که با MuteButton/MainPlayButton و speechController کار
// می‌کنه): این ضبط با getUserMedia + MediaRecorder انجام می‌شه و پخشِ
// برگشتی‌اش هم یه <audio> کاملاً مستقله — پس نه رویِ خواندنِ اپ تأثیر
// می‌ذاره نه برعکس، و می‌شه هر دو رو همزمان پخش کرد و باهم مقایسه کرد.
// صدایِ ضبط‌شده فقط توی حافظه (state) نگه داشته می‌شه — جایی ذخیره
// نمی‌شه، موقتیه، و با دکمه‌ی ضربدر یا بستنِ صفحه پاک می‌شه.
//
// طبقِ درخواستِ کاربر: اگه همون لحظه‌ی ضبط، صدایِ خودِ اپ هم داره پخش
// می‌شه، اون صدا باید همراهِ صدایِ میکروفون توی فایلِ ضبط‌شده باشه (نه
// فقط شنیده بشه). این فقط برایِ حالتی که «صوتِ آپلودیِ کاربر» (فایلِ
// صوتیِ سینک‌شده‌ی داستان) داره پخش می‌شه ممکنه — چون فقط اون یه المانِ
// <audio> واقعیه که با captureStream() می‌شه ازش یه کپی از خروجی گرفت.
// وقتی خواننده TTSِ داخلیِ گوشیه (Web Speech API)، هیچ مرورگری راهی
// برای گرفتنِ صدایِ آن به‌عنوانِ یه MediaStream نمی‌ده — پس اونجا فقط
// صدایِ خودِ کاربر ضبط می‌شه (مثلِ قبل)، با یه پیغامِ کوتاه که چرا.
export function MyVoiceRecorder({ color, getAppAudioElement, appAudioActive }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [micError, setMicError] = useState(false);
  const [mixNote, setMixNote] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioElRef = useRef(null);
  const audioUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      if (audioElRef.current) audioElRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const startRecording = async (e) => {
    e.stopPropagation();
    setMicError(false);
    setMixNote("");
    try {
      // درخواستِ کیفیتِ بالاترِ میکروفون: حذفِ اکو/نویز و تنظیمِ خودکارِ
      // گین توسطِ خودِ مرورگر، به‌علاوه‌ی نرخِ نمونه‌برداریِ بالاتر، تا صدایِ
      // ورودیِ کاربر واضح‌تر و تمیزتر ضبط بشه.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      micStreamRef.current = micStream;
      let recordStream = micStream;

      // اگه صوتِ آپلودیِ کاربر همین الان در حالِ پخشه، تلاش می‌کنیم یه کپی
      // از خروجیِ صداش رو با میکروفون میکس کنیم — بدونِ اینکه پخشِ عادیِ
      // خودش (از بلندگو) رو قطع/تغییر بدیم.
      const appEl = appAudioActive && getAppAudioElement ? getAppAudioElement() : null;
      if (appEl && typeof appEl.captureStream === "function") {
        try {
          const appStream = appEl.captureStream();
          if (appStream && appStream.getAudioTracks().length) {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            audioCtxRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            // میکروفون رو تقویت و صدایِ اپ رو کمی کم می‌کنیم تا موقعِ پخشِ
            // همزمان، صدایِ خودِ کاربر توی فایلِ ضبط‌شده گم/خفه نشه.
            const micGain = ctx.createGain();
            micGain.gain.value = 1.8;
            const appGain = ctx.createGain();
            appGain.gain.value = 0.45;
            ctx.createMediaStreamSource(micStream).connect(micGain).connect(dest);
            ctx.createMediaStreamSource(appStream).connect(appGain).connect(dest);
            recordStream = dest.stream;
          } else {
            setMixNote("صدای اپ الان قابلِ ترکیب نبود؛ فقط صدای خودم ضبط می‌شه");
          }
        } catch {
          setMixNote("صدای اپ الان قابلِ ترکیب نبود؛ فقط صدای خودم ضبط می‌شه");
        }
      } else if (appAudioActive) {
        setMixNote("چون این متن با صدای داخلیِ گوشی خونده می‌شه، نمی‌شه همراهِ صدای خودم ضبطش کرد");
      }

      chunksRef.current = [];
      // نرخِ بیتِ بالاتر برای صدایِ ضبط‌شده تا کیفیتِ خروجی واضح‌تر بمونه.
      const mr = new MediaRecorder(recordStream, { audioBitsPerSecond: 192000 });
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        audioElRef.current = null;
        setAudioUrl(url);
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setMicError(true);
    }
  };

  const stopRecording = (e) => {
    e.stopPropagation();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (!audioElRef.current) {
      audioElRef.current = new Audio(audioUrl);
      audioElRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioElRef.current.pause();
      setPlaying(false);
    } else {
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const deleteRecording = (e) => {
    e.stopPropagation();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setPlaying(false);
  };

  const c = color || colors.rose;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6, flexShrink: 0 }}
    >
      {micError && (
        <span style={{ fontSize: 10, color: colors.rose }}>دسترسی به میکروفون رد شد</span>
      )}
      {!micError && mixNote && (
        <span style={{ fontSize: 10, color: colors.inkSoft }}>{mixNote}</span>
      )}
      {audioUrl && (
        <>
          <button
            onClick={togglePlay}
            aria-label={playing ? "توقفِ پخشِ صدایِ ضبط‌شده" : "پخشِ صدایِ ضبط‌شده‌ی من"}
            title="پخشِ صدایِ خودم — جدا از خواندنِ اپ"
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.teal, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {playing ? <Pause size={15} /> : <PlayCircle size={15} />}
          </button>
          <button
            onClick={deleteRecording}
            aria-label="حذفِ صدایِ ضبط‌شده"
            title="حذفِ صدایِ ضبط‌شده (موقتی بود، ذخیره نمی‌شه)"
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.inkSoft, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} />
          </button>
        </>
      )}
      <button
        onClick={recording ? stopRecording : startRecording}
        aria-label={recording ? "توقفِ ضبط" : "ضبطِ صدایِ من"}
        title={recording ? "توقفِ ضبط" : "ضبطِ صدایِ من — برایِ خواندنِ متن و تمرین با صدایِ بلندِ خودم"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: recording ? colors.rose : c,
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {recording ? <Square size={19} fill={colors.rose} /> : <Mic size={19} />}
      </button>
    </div>
  );
}
