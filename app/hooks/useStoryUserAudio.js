// هوک صدای آپلودیِ داستان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { useState, useRef, useEffect, useMemo } from "react";
import { cancelSync, transcribeForSync, alignSentences, alignPartial, sentenceIndexAt, loadSyncTimes, saveSyncTimes, clearSyncTimes } from "../../audioSync.js";
import { deleteStoryAudioRecord, getStoryAudioRecord, saveStoryAudioRecord } from "../storage/storyAudioDb.js";
import { speechController } from "../speech/speechController.js";

export function useStoryUserAudio(storyKey, allSentences) {
  const audioElRef = useRef(null);
  if (!audioElRef.current && typeof Audio !== "undefined") {
    audioElRef.current = new Audio();
  }
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [manualIndex, setManualIndex] = useState(0); // اشاره‌گرِ دستیِ خط، فقط با دکمه‌ی قبل/بعد عوض می‌شه
  // نسخه‌ی ref از manualIndex — برای اینکه nextLine/prevLine بتونن مقدارِ
  // همیشه‌به‌روز رو بی‌نیاز از فرمِ تابعیِ setManualIndex بخونن.
  const manualIndexRef = useRef(0);
  useEffect(() => {
    manualIndexRef.current = manualIndex;
  }, [manualIndex]);
  // ⚠️ قبلاً اینجا یه سیستمِ «سینکِ خودکار» بود: با زدنِ دکمه‌ی جمله‌ی
  // بعد/قبل حینِ گوش‌دادن، زمانِ دقیقِ شروعِ هر جمله ثبت می‌شد و حینِ پخش،
  // هایلایت به‌طور خودکار (با پیدا کردنِ نزدیک‌ترین جمله‌ی سینک‌شده به
  // ثانیه‌ی فعلی) جلو می‌رفت. این سیستم کاملاً حذف شد — چون قابلِ‌اعتماد
  // نبود (با آپلودِ فایلِ جدید یا سینک‌های ناقص/نامنظم، هایلایت به‌طور
  // ناخواسته به جمله‌های غلط/قبلی می‌پرید و با اسکرولِ دستیِ کاربر می‌جنگید).
  // حالا هایلایت/جابه‌جایی توی صوتِ آپلودی *فقط* با اقدامِ صریحِ کاربر عوض
  // می‌شه: دکمه‌ی جمله‌ی بعد/قبل، تپ‌کردنِ مستقیم روی یه جمله، یا ری‌استارت.
  const lastAutoIdxRef = useRef(0);

  // --- همگام‌سازیِ اختیاریِ متن با صدا (audioSync.js) ---------------------
  // فقط وقتی کاربر خودش «همگام‌سازی» رو بزنه و زمانِ جمله‌ها ساخته بشه فعال
  // می‌شه. بدونِ اون، رفتارِ بالا (هایلایتِ دستی) دقیقاً مثلِ قبله.
  const [syncTimes, setSyncTimesState] = useState(null);
  const [syncOn, setSyncOnState] = useState(() => {
    try { return window.localStorage?.getItem("fb-sync-follow") !== "0"; } catch { return true; }
  });
  const [syncProgress, setSyncProgress] = useState(null); // { phase, frac }
  const [syncError, setSyncError] = useState("");
  const syncTimesRef = useRef(null);
  const syncOnRef = useRef(syncOn);
  useEffect(() => { syncTimesRef.current = syncTimes; }, [syncTimes]);
  useEffect(() => {
    syncOnRef.current = syncOn;
    try { window.localStorage?.setItem("fb-sync-follow", syncOn ? "1" : "0"); } catch {}
  }, [syncOn]);
  useEffect(() => {
    const t = loadSyncTimes(storyKey, allSentences?.length || 0);
    syncTimesRef.current = t;
    setSyncTimesState(t);
    setSyncError("");
  }, [storyKey, allSentences?.length]);
  // اشاره‌گرِ خط رو از روی زمانِ فعلیِ صدا تنظیم می‌کنه (فقط وقتی همگام‌سازی فعاله)
  function applySyncAt(t) {
    const ts = syncTimesRef.current;
    if (!syncOnRef.current || !ts) return;
    const idx = sentenceIndexAt(ts, t);
    if (idx !== manualIndexRef.current) {
      manualIndexRef.current = idx;
      lastAutoIdxRef.current = idx;
      setManualIndex(idx);
    }
  }
  // با جمله‌ی قبل/بعد یا تپ روی جمله، صدا هم به شروعِ همون جمله می‌پره —
  // وگرنه همگام‌سازی فوراً اشاره‌گر رو به جمله‌ی در حالِ پخش برمی‌گردوند.
  function syncSeek(idx) {
    const ts = syncTimesRef.current;
    // جمله‌هایی که هنوز همگام نشدن (Infinity) نادیده گرفته می‌شن
    if (!syncOnRef.current || !ts || ts[idx] == null || !isFinite(ts[idx]) || !audioElRef.current) return;
    audioElRef.current.currentTime = ts[idx];
  }
  // سرعتِ پخشِ صوتِ آپلودیِ کاربر — مستقل از سرعتِ TTS (که سراسری و
  // مخصوصِ speechController است). یه پیش‌فرضِ سراسری (نه مخصوصِ هر داستان)
  // در localStorage نگه داشته می‌شه — دقیقاً همون الگویِ phrasebook-tts-rate.
  const [rate, setRateState] = useState(() => {
    const r = Number(window.localStorage?.getItem("phrasebook-user-audio-rate"));
    return r >= 0.5 && r <= 2 ? r : 1;
  });
  const rateRef = useRef(rate);
  // وضعیتِ ذخیره‌سازیِ فایلِ آپلودی — تا وقتی روی IndexedDB نوشته می‌شه
  // (که برایِ فایل‌های صوتیِ حجیم/طولانی ممکنه یه لحظه طول بکشه)، دکمه‌ی
  // آپلود باید غیرفعال/در حالِ بارگذاری نشون داده بشه، وگرنه کاربر حسِ
  // «هنگ‌کردن» می‌کنه چون هیچ فیدبکی نمی‌بینه.
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioSaveError, setAudioSaveError] = useState("");
  const objectUrlRef = useRef(null);
  // آخرین currentTime‌ای که واقعاً به state گزارش شده — برای throttleِ زیر.
  const lastReportedTimeRef = useRef(0);
  // چندبار، بعدِ اولین پخش، صوتِ آپلودی رو دوباره از اول تکرار کرده‌ایم —
  // برای اینکه دکمه‌ی «تکرارِ سراسری» (که تا قبل از این فقط رویِ TTS اثر
  // داشت) رویِ صوتِ آپلودیِ کاربر هم کار کنه. با هر پخشِ تازه (play()) یا
  // عوض‌شدنِ داستان صفر می‌شه.
  const repeatsDoneRef = useRef(0);
  // --- تکرارِ A-B رویِ صوتِ آپلودیِ کاربر --------------------------------
  // برخلافِ TTS (که چانک/جمله‌ایه)، اینجا صوت پیوسته‌ست، پس A و B دقیقاً
  // زمان (currentTime، به‌ثانیه) هستن — دقیقاً همون مکانیزمی که توی
  // پروتوتایپِ HTML تست شد. abState: "idle" -> "waitingB" -> "looping".
  // Ref هم نگه می‌داریم چون onTime پایین‌تر داخلِ یه useEffect با
  // dependency آرایِ خالیه و به مقدارِ همیشه‌به‌روزِ state دسترسی نداره.
  const [abState, setAbState] = useState("idle");
  const [abA, setAbA] = useState(null);
  const [abB, setAbB] = useState(null);
  const abStateRef = useRef("idle");
  const abARef = useRef(null);
  const abBRef = useRef(null);

  function markAB() {
    const t = audioElRef.current?.currentTime ?? 0;
    if (abStateRef.current === "idle") {
      abARef.current = t;
      abStateRef.current = "waitingB";
      setAbA(t);
      setAbState("waitingB");
    } else if (abStateRef.current === "waitingB") {
      let a = abARef.current, b = t;
      if (b <= a) { b = a; a = t; }
      abARef.current = a;
      abBRef.current = b;
      abStateRef.current = "looping";
      setAbA(a);
      setAbB(b);
      setAbState("looping");
    } else {
      abARef.current = null;
      abBRef.current = null;
      abStateRef.current = "idle";
      setAbA(null);
      setAbB(null);
      setAbState("idle");
    }
  }
  function clearAB() {
    abARef.current = null;
    abBRef.current = null;
    abStateRef.current = "idle";
    setAbA(null);
    setAbB(null);
    setAbState("idle");
  }

  // با هر تغییرِ سرعت، هم رویِ خودِ <audio> اعمالش می‌کنیم (برای همینِ الان،
  // بدونِ صبر برایِ بارگذاریِ بعدی)، هم rateRef رو به‌روز نگه می‌داریم (برایِ
  // onDur پایین‌تر که داخلِ یه useEffectِ بدونِ dependency صدا زده می‌شه و
  // به مقدارِ همیشه‌به‌روزِ state دسترسی نداره)، هم در localStorage ذخیره‌ش
  // می‌کنیم تا دفعه‌ی بعد هم همین سرعت پیش‌فرض باشه.
  useEffect(() => {
    rateRef.current = rate;
    if (audioElRef.current) audioElRef.current.playbackRate = rate;
    try {
      window.localStorage.setItem("phrasebook-user-audio-rate", String(rate));
    } catch {}
  }, [rate]);
  function setRate(r) {
    setRateState(Math.min(Math.max(Number(r) || 1, 0.5), 2));
  }

  // بارگذاریِ اولیه از IndexedDB وقتی storyKey عوض می‌شه
  useEffect(() => {
    let cancelled = false;
    setHasAudio(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setManualIndex(0);
    setAudioSaveError("");
    lastReportedTimeRef.current = 0;
    lastAutoIdxRef.current = 0;
    repeatsDoneRef.current = 0;
    clearFocusResumeTimer();
    abARef.current = null;
    abBRef.current = null;
    abStateRef.current = "idle";
    setAbA(null);
    setAbB(null);
    setAbState("idle");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!storyKey) return;
    (async () => {
      const rec = await getStoryAudioRecord(storyKey);
      if (cancelled) return;
      if (!rec) return;
      const url = URL.createObjectURL(rec.blob);
      objectUrlRef.current = url;
      if (audioElRef.current) audioElRef.current.src = url;
      setHasAudio(true);
    })();
    return () => { cancelled = true; };
  }, [storyKey]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    // نکته‌ی مهمِ کارایی: این هوک داخلِ StoryBuilder صدا زده می‌شه — یعنی
    // کامپوننتی که کلِ متنِ داستان (پاراگراف‌ها، جمله‌های قابل‌کلیک) رو هم
    // رندر می‌کنه؛ و هر تغییرِ این state از طریقِ onUserAudioStateChange به
    // PhrasebookMain (بالاترین سطح) هم گزارش می‌شه، پس عملاً کلِ اپ رو
    // دوباره رندر می‌کنه. رویدادِ «timeupdate» مرورگرها رو معمولاً چندین‌بار
    // در ثانیه صدا می‌زنن؛ اگه هر بار state رو آپدیت کنیم، این رندرهای
    // زنجیره‌ای هم چندین‌بار در ثانیه تکرار می‌شن — دقیقاً همون چیزی که با
    // داستان‌های طولانی (که هر رندرشون خودش سنگینه) باعثِ کند/هنگ‌شدنِ
    // محسوس می‌شه (و چون همون رندرِ سراسری، تایمرِ رندرِ آدمکِ لینگوا رو هم
    // تحتِ‌فشار می‌ذاره، باعثِ در‌جا‌زدنِ آدمک هم می‌شه). برای همین،
    // currentTime رو فقط وقتی به state می‌بریم که حداقل یک ثانیه از آخرین
    // آپدیت گذشته باشه — برایِ نوارِ پیشرفت/نمایشِ زمان کاملاً کافیه، ولی
    // تعدادِ رندرها رو به‌شدت کم می‌کنه. (تکمیلِ این فیکس: LingovaMascot و
    // GrammarPanel هم جداگانه با React.memo از این رندرهای زنجیره‌ای معاف
    // شدن.)
    const onTime = () => {
      const t = el.currentTime || 0;
      // مکانیزمِ تکرارِ A-B: وقتی هر دو نقطه ثبت شده باشن، محدوده رو
      // نمی‌ذاریم رد بشه — دقیقاً همون چک‌کردنِ ساده‌ی «رسیدیم به B یا از
      // A عقب‌تریم» که توی پروتوتایپ جواب داد.
      if (abStateRef.current === "looping" && abARef.current !== null && abBRef.current !== null) {
        if (t >= abBRef.current || t < abARef.current - 0.05) {
          el.currentTime = abARef.current;
          return;
        }
      }
      // ⚠️ قبلاً اینجا یه پیگیریِ خودکارِ هایلایت بود (بر اساسِ timestampِ
      // سینک‌شده) که حذف شد — هایلایت/manualIndex فقط با اقدامِ صریحِ
      // کاربر (دکمه‌ی جمله‌ی بعد/قبل، تپ‌کردنِ روی یه جمله، ری‌استارت) عوض
      // می‌شه، نه خودکار حینِ پخش.
      applySyncAt(t);
      if (Math.abs(t - lastReportedTimeRef.current) >= 1) {
        lastReportedTimeRef.current = t;
        setCurrentTime(t);
      }
    };
    // بعدِ توقف/پایان/جابه‌جاییِ دستیِ نوار، همیشه دقیق‌ترین زمان رو فوراً
    // نشون بده (بدونِ صبر برایِ آستانه‌ی نیم‌ثانیه‌ایِ بالا) — وگرنه بعدِ
    // pause، نوارِ پیشرفت ممکنه تا نیم‌ثانیه عقب‌تر از جاییِ واقعیِ توقف بمونه.
    const syncTimeNow = () => {
      const t = el.currentTime || 0;
      lastReportedTimeRef.current = t;
      setCurrentTime(t);
      applySyncAt(t);
    };
    const onDur = () => { setDuration(el.duration || 0); el.playbackRate = rateRef.current; };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => { setIsPlaying(false); syncTimeNow(); };
    // دکمه‌ی «تکرارِ سراسری» (RepeatButton) یه تنظیمِ مشترک روی
    // speechController نگه می‌داره که قبلاً فقط رویِ پخشِ TTS اثر داشت؛
    // همون تنظیم رو اینجا هم می‌خونیم تا با تمومِ‌شدنِ صوتِ آپلودیِ کاربر،
    // اگه تکرار روشن باشه، دوباره از اول پخش بشه — دقیقاً همون رفتاری که
    // کاربر از زدنِ دکمه‌ی تکرار انتظار داره.
    const onEnd = () => {
      const rs = speechController.getState().globalRepeatSetting;
      const remaining = rs === "inf" ? Infinity : Math.max(0, (Number(rs) || 0) - 1);
      if (remaining > repeatsDoneRef.current && audioElRef.current) {
        repeatsDoneRef.current += 1;
        audioElRef.current.currentTime = 0;
        audioElRef.current.play().catch(() => {});
        return;
      }
      setIsPlaying(false);
      syncTimeNow();
    };
    const onSeeked = () => syncTimeNow();
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onDur);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("seeked", onSeeked);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("seeked", onSeeked);
      clearFocusResumeTimer();
    };
  }, []);

  async function uploadFile(file) {
    if (!storyKey || !file) return;
    setAudioSaveError("");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    if (audioElRef.current) {
      audioElRef.current.src = url;
      audioElRef.current.load();
    }
    setManualIndex(0);
    lastAutoIdxRef.current = 0;
    setHasAudio(true);
    clearAB();
    // فایلِ صوتیِ تازه = زمان‌بندیِ قبلی دیگه معتبر نیست
    clearSyncTimes(storyKey);
    syncTimesRef.current = null;
    setSyncTimesState(null);
    // نوشتنِ خودِ فایل روی IndexedDB (که برایِ فایل‌های صوتیِ حجیم ممکنه
    // چندصدمیلی‌ثانیه طول بکشه) رو به‌عنوانِ «در حالِ ذخیره» علامت می‌زنیم
    // تا دکمه‌ی آپلود در همون لحظه غیرفعال/چرخان بشه — کاربر می‌فهمه داره
    // کاری انجام می‌شه، به‌جای اینکه حس کنه برنامه هنگ کرده. اگه ذخیره
    // شکست بخوره (مثلاً حجمِ فایل بیشتر از ظرفیتِ مجازِ مرورگر بود)، خطا
    // رو نشون می‌دیم — قبلاً این خطا کاملاً بی‌صدا بلعیده می‌شد و کاربر
    // فکر می‌کرد صداش ذخیره شده، ولی با رفرشِ بعدی گم می‌شد.
    setAudioSaving(true);
    try {
      const ok = await saveStoryAudioRecord(storyKey, { blob: file, savedAt: Date.now() });
      if (!ok) setAudioSaveError("ذخیره‌ی این فایلِ صوتی ناموفق بود — شاید حجمش زیاد بود؛ فایلِ کوچیک‌تری امتحان کن");
    } finally {
      setAudioSaving(false);
    }
  }

  // «مکث برای فوکوسِ پاپ‌آپِ لغت» — دقیقاً هم‌معنیِ speechController.pauseForFocus
  // ولی برایِ صوتِ آپلودیِ خودِ کاربر: وقتی این صوت داره پخش می‌شه و کاربر
  // روی یه لغت/محدوده از متنِ داستان لمسِ طولانی می‌کنه (پاپ‌آپِ معنی باز
  // می‌شه)، پخش فوراً مکث می‌شه؛ بعد از سه ثانیه (اگه خودِ کاربر تا اون‌موقع
  // چیزی رو دستی پخش/مکث نکرده باشه) خودکار از همون نقطه ادامه پیدا می‌کنه.
  const focusResumeTimerRef = useRef(null);
  function clearFocusResumeTimer() {
    if (focusResumeTimerRef.current) {
      clearTimeout(focusResumeTimerRef.current);
      focusResumeTimerRef.current = null;
    }
  }
  function pauseForFocus() {
    const el = audioElRef.current;
    if (!el || el.paused) return false;
    clearFocusResumeTimer();
    el.pause();
    focusResumeTimerRef.current = setTimeout(() => {
      focusResumeTimerRef.current = null;
      audioElRef.current?.play().catch(() => {});
    }, 3000);
    return true;
  }
  // پخشِ دستی/تازه (با زدنِ دکمه‌ی پخش) همیشه شمارشگرِ تکرار رو صفر می‌کنه —
  // وگرنه اگه کاربر وسطِ یه چرخه‌ی تکرار دستی pause/play بزنه، شمارشِ
  // تکرارهای قبلی باقی می‌موند و زودتر از موعد قطع می‌شد. هر اقدامِ دستیِ
  // play/pause/seek همچنین تایمرِ خودکارِ «ادامه بعد از سه ثانیه»یِ بالا رو
  // لغو می‌کنه — وگرنه ممکنه چند صدمِ‌ثانیه بعد از یه pause دستیِ کاربر،
  // پخش خودش‌به‌خود (و ناخواسته) دوباره شروع بشه.
  function play() { clearFocusResumeTimer(); repeatsDoneRef.current = 0; audioElRef.current?.play().catch(() => {}); }
  function pause() { clearFocusResumeTimer(); audioElRef.current?.pause(); }
  function seek(t) { clearFocusResumeTimer(); if (audioElRef.current) audioElRef.current.currentTime = t; }

  // دکمه‌ی جمله‌ی بعد/قبل: فقط اشاره‌گرِ دستیِ هایلایت رو جابه‌جا می‌کنه —
  // دیگه هیچ زمانی ثبت/سینک نمی‌شه (سیستمِ سینکِ خودکار کاملاً حذف شد).
  function nextLine() {
    const next = Math.min(manualIndexRef.current + 1, Math.max((allSentences?.length || 1) - 1, 0));
    manualIndexRef.current = next;
    lastAutoIdxRef.current = next;
    setManualIndex(next);
    syncSeek(next);
  }
  function prevLine() {
    const prevIdx = Math.max(manualIndexRef.current - 1, 0);
    manualIndexRef.current = prevIdx;
    lastAutoIdxRef.current = prevIdx;
    setManualIndex(prevIdx);
    syncSeek(prevIdx);
  }
  // دکمه‌ی «رفرش/شروع مجدد» برایِ صوتِ آپلودی — دقیقاً هم‌معنیِ نسخه‌ی TTS
  // (RestartButton بالاتر): فقط برمی‌گردونه به ابتدایِ فایل و هایلایتِ خطِ
  // فعال رو ریست می‌کنه به خطِ اول؛ به وضعیتِ در حالِ پخش/مکث‌بودن دست
  // نمی‌زنه — اگه در حالِ پخش بود، از همون لحظه از نو ادامه پیدا می‌کنه؛
  // اگه مکث بود، مکث‌شده می‌مونه ولی رویِ ثانیه‌ی صفر.
  function restart() {
    manualIndexRef.current = 0;
    lastAutoIdxRef.current = 0;
    setManualIndex(0);
    if (audioElRef.current) audioElRef.current.currentTime = 0;
  }

  // پرشِ مستقیمِ هایلایت به یه (pi, si) مشخص — وقتی کاربر خودش مستقیماً
  // روی جمله/آیکونِ پخشِ کنارِ همون جمله تپ می‌کنه، نه با دکمه‌ی جمله‌ی
  // بعد/قبل. برخلافِ nextLine/prevLine، اینجا هیچ timestampی ثبت نمی‌شه —
  // چون زمانِ دقیقِ این جهش (سینک‌شده یا فقط تخمینِ نسبی) بیرون از این
  // هوک محاسبه می‌شه و ثبتش به‌عنوانِ «سینک‌شده» می‌تونست یه تخمینِ ناقص رو
  // به‌جایِ سینکِ واقعیِ بعدی جا بزنه.
  function setActiveLine(pi, si) {
    if (pi == null || si == null || !allSentences || !allSentences.length) return;
    let idx = -1;
    for (let i = 0; i < allSentences.length; i++) {
      const s = allSentences[i];
      if (s && s._pi === pi && s._si === si) { idx = i; break; }
    }
    if (idx === -1) return;
    manualIndexRef.current = idx;
    lastAutoIdxRef.current = idx;
    setManualIndex(idx);
    syncSeek(idx);
  }

  // ساختِ زمانِ شروعِ جمله‌ها از روی خودِ فایلِ صوتی (روی همین گوشی، یک‌بار)
  async function buildSync(langCode) {
    if (!storyKey || !allSentences || !allSentences.length) return;
    setSyncError("");
    setSyncProgress({ phase: "decode", frac: 0 });
    const prevTimes = syncTimesRef.current;
    let live = false;       // آیا بخشی از همگام‌سازی همین الان قابل‌استفاده‌ست؟
    let finished = false;
    try {
      const rec = await getStoryAudioRecord(storyKey);
      if (!rec || !rec.blob) throw new Error("NO_AUDIO");
      const texts = allSentences.map((x) => (x && x.text) || "");
      // هر بخشی که همگام شد، همون لحظه توی اپ اجرا می‌شه (بدونِ صبر تا آخرِ فایل)
      const onPartial = ({ words, seconds }) => {
        const part = alignPartial(texts, words, seconds);
        if (!part) return;
        live = true;
        syncTimesRef.current = part.times;
        setSyncTimesState(part.times);
        syncOnRef.current = true;
        setSyncOnState(true);
        applySyncAt(audioElRef.current?.currentTime || 0);
      };
      const { words, seconds } = await transcribeForSync(rec.blob, langCode, (p) => setSyncProgress({ ...p, live }), onPartial);
      const res = alignSentences(texts, words, seconds);
      if (!res.ok) {
        setSyncError("متنِ داستان با صدا نخوند (فقط " + Math.round(res.coverage * 100) + "٪ تطبیق پیدا شد). مطمئن شو متن و صدا یکی هستن و زبانِ داستان درست انتخاب شده.");
      } else {
        saveSyncTimes(storyKey, res.times);
        syncTimesRef.current = res.times;
        setSyncTimesState(res.times);
        setSyncOnState(true);
        syncOnRef.current = true;
        applySyncAt(audioElRef.current?.currentTime || 0);
        finished = true;
      }
    } catch (e) {
      const m = String((e && e.message) || e);
      if (m === "CANCELLED") { /* کاربر خودش لغو کرد */ }
      else if (m === "NO_MODEL") setSyncError("اول بسته‌ی همگام‌سازی رو دانلود کن.");
      else {
        try { console.warn("sync failed:", m); } catch {}
        setSyncError("همگام‌سازی ناموفق بود. دوباره امتحان کن؛ اگه تکرار شد، یه فایلِ کوتاه‌تر یا حالتِ «سریع» رو امتحان کن.");
      }
    } finally {
      // اگه کار کامل نشد (خطا/لغو/تطبیقِ ناکافی)، زمان‌های نیمه‌کاره رو کنار می‌ذاریم
      if (!finished) {
        syncTimesRef.current = prevTimes;
        setSyncTimesState(prevTimes);
      }
      setSyncProgress(null);
    }
  }
  function setSyncOn(v) {
    syncOnRef.current = !!v;
    setSyncOnState(!!v);
    if (v) applySyncAt(audioElRef.current?.currentTime || 0);
  }
  function clearSync() {
    clearSyncTimes(storyKey);
    syncTimesRef.current = null;
    setSyncTimesState(null);
  }

  async function removeAudio() {
    pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    if (audioElRef.current) audioElRef.current.removeAttribute("src");
    setHasAudio(false);
    setManualIndex(0);
    lastAutoIdxRef.current = 0;
    setAudioSaveError("");
    clearSyncTimes(storyKey);
    syncTimesRef.current = null;
    setSyncTimesState(null);
    if (storyKey) await deleteStoryAudioRecord(storyKey);
  }

  // خطِ فعال، فقط از روی manualIndex — هیچ ربطی به currentTime نداره.
  const activeSentence = useMemo(() => {
    if (!allSentences || !allSentences.length) return null;
    const s = allSentences[Math.min(manualIndex, allSentences.length - 1)];
    return s ? { pi: s._pi, si: s._si } : null;
  }, [allSentences, manualIndex]);

  // دسترسیِ مستقیم به المانِ <audio> — لازم برایِ «ضبطِ صدایِ من +
  // صدایِ اپ باهم» (MyVoiceRecorder): وقتی این فایلِ صوتیِ آپلودی داره
  // پخش می‌شه، با captureStream() یه کپی از خروجیِ صداش گرفته و با
  // میکروفون میکس می‌شه — بدونِ اینکه رویِ پخشِ عادیِ خودش (که از
  // بلندگو شنیده می‌شه) اثری بذاره.
  function getAudioElement() {
    return audioElRef.current;
  }

  return {
    hasAudio,
    isPlaying,
    currentTime,
    duration,
    manualIndex,
    rate,
    setRate,
    activeSentence,
    audioSaving,
    audioSaveError,
    uploadFile,
    play,
    pause,
    pauseForFocus,
    seek,
    nextLine,
    prevLine,
    restart,
    setActiveLine,
    removeAudio,
    abState,
    abA,
    abB,
    markAB,
    clearAB,
    getAudioElement,
    syncTimes,
    syncOn,
    setSyncOn,
    syncProgress,
    syncError,
    buildSync,
    cancelSyncBuild: cancelSync,
    clearSync,
  };
}
