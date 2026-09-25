import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2, RotateCcw, Upload, Sparkles, X } from "lucide-react";

// -----------------------------------------------------------------------
// تبِ «یوتیوب»: کاربر یه لینک ویدیوی یوتیوب می‌ده، خودِ ویدیو همین‌جا
// (نه توی مرورگرِ جدا) پخش می‌شه، زیرِ ویدیو رونوشتِ زیرنویس با تایم‌بندی
// دیده می‌شه، و برای هر خط، هم‌زمان ترجمه به همه‌ی زبان‌های مقصدی که کاربر
// از تنظیماتِ اصلیِ اپ چیده (targetOrder) نشون داده می‌شه — دقیقاً همون
// الگویِ چند-زبانه‌ای که برای مثال‌سازِ لغت و داستان‌ساز استفاده شده.
//
// زیرنویس از دو راه قابلِ گرفتنه:
//   ۱) خودکار: تلاش می‌کنیم لیستِ زیرنویس‌های رسمی/خودکارِ خودِ یوتیوب رو
//      از endpoint نیمه‌رسمیِ timedtext بگیریم. این endpoint نه مستندِ
//      رسمیِ گوگله و نه CORS‌ش تضمین‌شده — روی خیلی از شبکه‌ها/ویدیوها کار
//      می‌کنه، ولی ممکنه گاهی (فیلترینگ، محدودیتِ ویدیوی خاص، تغییرِ
//      endpoint توسطِ گوگل) شکست بخوره. اگه شکست خورد، پیامِ روشن نشون
//      می‌دیم و راهِ دوم رو پیشنهاد می‌کنیم.
//   ۲) دستی: آپلودِ فایلِ srt/vtt — این همیشه کار می‌کنه، چون کاملاً محلیه
//      و به هیچ سرویسِ بیرونی وابسته نیست.
// -----------------------------------------------------------------------

const FALLBACK_COLORS = {
  paper: "#fdf6e9",
  paperDark: "#f6ecd9",
  cardBorder: "#e7d9b8",
  ink: "#2b2620",
  inkSoft: "#8a7f6b",
  gold: "#b8892b",
  goldSoft: "#e0c98f",
  teal: "#1f8a70",
  rose: "#c0473f",
};

// -----------------------------------------------------------------------
// استخراجِ آی‌دیِ ویدیو از هر شکلِ لینکِ یوتیوب (watch؟v=، youtu.be/،
// shorts/، embed/)، یا حتی خودِ آی‌دیِ خام (۱۱ کاراکتری) که مستقیم پیست شده.
// -----------------------------------------------------------------------
function extractYouTubeId(input) {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // لینکِ معتبر نبود؛ آخرین چاره رو زیر امتحان می‌کنیم
  }
  const m2 = s.match(/[\w-]{11}/);
  return m2 ? m2[0] : null;
}

function timeStrToSeconds(str) {
  const m = String(str || "")
    .trim()
    .match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d+)/);
  if (!m) return 0;
  const [, hh, mm, ss, ms] = m;
  const h = hh ? parseInt(hh, 10) : 0;
  const msNum = parseInt(ms.padEnd(3, "0").slice(0, 3), 10);
  return h * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10) + msNum / 1000;
}

function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// پارسِ srt یا vtt به یه آرایه‌ی ساده‌ی { start, end, text } — تگ‌های
// داخلیِ vtt (مثلِ <00:00:01.000> یا <c>) و شماره‌ی ردیفِ srt نادیده گرفته
// می‌شن، فقط متنِ خام می‌مونه.
function parseSubtitleFile(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  const blocks = text.split(/\r?\n\r?\n+/).map((b) => b.trim()).filter(Boolean);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    let idx = 0;
    if (!/-->/.test(lines[0]) && lines[1] && /-->/.test(lines[1])) idx = 1;
    const timeLine = lines[idx];
    if (!timeLine) continue;
    const m = timeLine.match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if (!m) continue;
    const start = timeStrToSeconds(m[1]);
    const end = timeStrToSeconds(m[2]);
    const cueText = lines
      .slice(idx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cueText) continue;
    if (cues.length && cues[cues.length - 1].text === cueText && start - cues[cues.length - 1].end < 0.4) {
      // خیلی از زیرنویس‌های خودکارِ یوتیوب همون خط رو با یه هم‌پوشانیِ
      // چندصدمِ ثانیه‌ای دوباره تکرار می‌کنن؛ برای رونوشتِ تمیز، اینا رو
      // یکی می‌کنیم به‌جای اینکه دوبار نشون بدیم.
      cues[cues.length - 1].end = end;
      continue;
    }
    cues.push({ start, end, text: cueText });
  }
  return cues;
}

// عملاً روی خیلی از هاست‌ها/شبکه‌ها، fetch مستقیم به video.google.com از
// داخلِ مرورگر با CORS بلاک می‌شه (نتیجه‌ش دقیقاً همون خطای «دریافتِ خودکار
// ناموفق بود» است که اکثرِ وقت‌ها دیده می‌شه) — پس اول یه تلاشِ مستقیم
// می‌زنیم، و اگه شکست خورد، از همون پراکسیِ بک‌اندِ AI (که برای «وارد کردنِ
// لینکِ صفحه» هم استفاده می‌شه) به‌عنوانِ واسط استفاده می‌کنیم.
const YT_DEFAULT_BACKEND_URL = "https://phrasebook-api.maryam-s-sharifiyan.workers.dev";
async function fetchTextWithProxyFallback(url, aiSettings) {
  try {
    const direct = await fetch(url);
    if (direct.ok) {
      const text = await direct.text();
      if (text && text.trim()) return text;
    }
  } catch {
    // مستقیم شکست خورد (به‌احتمالِ زیاد CORS) — می‌ریم سراغِ پراکسی
  }
  const base = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || YT_DEFAULT_BACKEND_URL;
  const proxyRes = await fetch(`${base}/api/fetch-url?url=${encodeURIComponent(url)}`);
  if (!proxyRes.ok) throw new Error(`proxy-failed-${proxyRes.status}`);
  const proxied = await proxyRes.text();
  if (!proxied || !proxied.trim()) throw new Error("proxy-empty");
  return proxied;
}

// تلاش برای گرفتنِ لیستِ زیرنویس‌های موجودِ یه ویدیو از endpoint نیمه‌رسمیِ
// timedtext. این endpoint مستقیماً از سمتِ گوگل مستند نشده، پس هم ممکنه
// جوابِ خالی بده، هم ممکنه به‌خاطرِ CORS اصلاً fetch ناموفق بشه — هر دو
// حالت با یه خطای روشن به کاربر گزارش می‌شه تا بره سراغِ آپلودِ دستی.
async function fetchYouTubeCaptionTracks(videoId, aiSettings) {
  const xml = await fetchTextWithProxyFallback(
    `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
    aiSettings
  );
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const nodes = Array.from(doc.getElementsByTagName("track"));
  if (!nodes.length) throw new Error("no-tracks");
  return nodes.map((n) => ({
    code: n.getAttribute("lang_code") || "",
    name: n.getAttribute("lang_translated") || n.getAttribute("lang_original") || n.getAttribute("lang_code") || "",
    kind: n.getAttribute("kind") || "", // "asr" یعنی زیرنویسِ خودکار
  }));
}

async function fetchYouTubeCaptionTrackText(videoId, langCode, kind, aiSettings) {
  const params = new URLSearchParams({ v: videoId, lang: langCode, fmt: "vtt" });
  if (kind) params.set("kind", kind);
  const vtt = await fetchTextWithProxyFallback(`https://video.google.com/timedtext?${params.toString()}`, aiSettings);
  return parseSubtitleFile(vtt);
}

// بارگذاریِ یک‌باره‌ی اسکریپتِ رسمیِ YouTube IFrame API — اگه قبلاً یه‌جای
// دیگه‌ی صفحه لود شده باشه (یا این کامپوننت دوباره mount بشه)، دوباره
// اسکریپت اضافه نمی‌شه.
let ytApiPromise = null;
function loadYouTubeIframeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") {
        try {
          prevReady();
        } catch {}
      }
      resolve(window.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

// -----------------------------------------------------------------------
// یک خطِ رونوشت: متنِ اصلی + ترجمه‌ی هم‌زمان به هر زبانِ مقصد. با تپ روی
// خطِ اصلی، ویدیو به شروعِ همون خط سیک می‌شه.
// -----------------------------------------------------------------------
function CaptionLine({
  cue,
  active,
  onSeek,
  translations,
  translationLangs,
  onRefreshTranslation,
  refreshingKey,
  colors,
  fontFa,
  ClickableSentence,
  SpeakButton,
  subtitleLang,
  nativeLang,
  nativeLabel,
  aiSettings,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active]);

  return (
    <div
      ref={ref}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        marginBottom: 6,
        background: active ? colors.goldSoft : "transparent",
        border: `1px solid ${active ? colors.gold : "transparent"}`,
        transition: "background 0.15s ease",
      }}
    >
      <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
        <span
          onClick={() => onSeek(cue.start)}
          style={{ fontSize: 10, color: colors.inkSoft, flexShrink: 0, cursor: "pointer", fontFamily: "monospace" }}
          title={fontFa ? "برو به این لحظه" : undefined}
        >
          {formatSeconds(cue.start)}
        </span>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onSeek(cue.start)}>
          {ClickableSentence ? (
            <ClickableSentence
              text={cue.text}
              langCode={subtitleLang}
              nativeLang={nativeLang}
              nativeLabel={nativeLabel}
              aiSettings={aiSettings}
              color={colors.ink}
              fontWeight={700}
              fontSize={13}
            />
          ) : (
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: colors.ink }}>{cue.text}</p>
          )}
        </div>
        {SpeakButton && <SpeakButton text={cue.text} code={subtitleLang} color={colors.teal} edge="end" />}
      </div>
      {translationLangs.map((l) => {
        const key = `${cue.start}:${l.code}`;
        const val = translations[key];
        return (
          <div key={l.code} className="flex items-center gap-2" style={{ marginTop: 4, direction: "ltr" }}>
            <span
              style={{
                fontFamily: fontFa,
                fontSize: 10,
                fontWeight: 700,
                color: colors.gold,
                border: `1px solid ${colors.goldSoft}`,
                borderRadius: 6,
                padding: "1px 5px",
                flexShrink: 0,
              }}
            >
              {l.abbr || l.code.toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              {!val || val === "loading" ? (
                <p style={{ margin: 0, fontSize: 11, color: colors.inkSoft, opacity: 0.8 }}>
                  {val === "loading" ? "در حال ترجمه..." : "—"}
                </p>
              ) : ClickableSentence ? (
                <ClickableSentence
                  text={val}
                  langCode={l.code}
                  nativeLang={nativeLang}
                  nativeLabel={nativeLabel}
                  aiSettings={aiSettings}
                  color={colors.teal}
                  fontWeight={700}
                  fontSize={12}
                  alignSourceText={cue.text}
                  alignSourceLang={subtitleLang}
                />
              ) : (
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: colors.teal }}>{val}</p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefreshTranslation(cue, l.code);
              }}
              disabled={refreshingKey === key}
              title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
              style={{ background: "none", border: "none", padding: 3, flexShrink: 0, cursor: refreshingKey === key ? "default" : "pointer", display: "flex", alignItems: "center" }}
            >
              {refreshingKey === key ? (
                <Loader2 size={11} className="spin" color={colors.teal} />
              ) : (
                <RotateCcw size={11} color={colors.teal} style={{ opacity: 0.6 }} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function YouTubeCaptionPanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  uiLang,
  SpeakButton,
  ClickableSentence,
  translateFree,
  translateViaAI,
  translateFreeNetwork,
  setCachedTranslation,
  colors: colorsProp,
  fontFa: fontFaProp,
  onImportToStory,
}) {
  const colors = colorsProp || FALLBACK_COLORS;
  const fontFa = fontFaProp || "inherit";
  const isFa = uiLang !== "en";

  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const pollRef = useRef(null);

  const [cues, setCues] = useState([]);
  const [subtitleLang, setSubtitleLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [activeIndex, setActiveIndex] = useState(-1);

  const [autoTracks, setAutoTracks] = useState(null); // null = هنوز امتحان نشده
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState("");
  const [fileError, setFileError] = useState("");

  const [translations, setTranslations] = useState({}); // `${start}:${langCode}` -> text | "loading"
  const [refreshingKey, setRefreshingKey] = useState(null);
  const translationsRef = useRef(translations);
  translationsRef.current = translations;

  const nativeLabelSafe = nativeLabel || nativeLang;
  // زبان‌هایی که هم‌زمان ترجمه‌شون زیرِ هر خط نشون داده می‌شه: همه‌ی
  // زبان‌های مقصدی که کاربر توی تنظیماتِ اصلیِ اپ چیده، منهایِ خودِ زبانِ
  // زیرنویس (ترجمه‌ی یه زبون به خودش بی‌معنیه).
  const translationLangs = (targetOrder && targetOrder.length ? targetOrder : [nativeLang])
    .filter((c) => c !== subtitleLang)
    .map((c) => ({ code: c }));

  function loadVideo() {
    const id = extractYouTubeId(urlInput);
    if (!id) {
      setFileError(isFa ? "این لینک شناخته نشد. لینکِ کاملِ ویدیوی یوتیوب رو پیست کن." : "Couldn't recognize this link. Paste a full YouTube video link.");
      return;
    }
    setFileError("");
    setAutoError("");
    setAutoTracks(null);
    setCues([]);
    setTranslations({});
    setActiveIndex(-1);
    setVideoId(id);
  }

  // ساختِ پلیرِ یوتیوب — فقط وقتی videoId عوض می‌شه.
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setPlayerReady(false);
    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !playerElRef.current) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      playerRef.current = new YT.Player(playerElRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            if (cancelled) return;
            setPlayerReady(true);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            setIsPlaying(e.data === 1);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // پولینگِ زمانِ پخش، فقط وقتی واقعاً در حالِ پخشه — برای پیداکردنِ خطِ
  // فعال و هایلایت/اسکرولِ خودکار به همون خط.
  useEffect(() => {
    if (!isPlaying || !playerRef.current || !cues.length) return;
    pollRef.current = setInterval(() => {
      let t = 0;
      try {
        t = playerRef.current.getCurrentTime() || 0;
      } catch {
        return;
      }
      const idx = cues.findIndex((c) => t >= c.start && t < c.end);
      setActiveIndex((prev) => (idx !== -1 && idx !== prev ? idx : idx === -1 ? prev : idx));
    }, 300);
    return () => clearInterval(pollRef.current);
  }, [isPlaying, cues]);

  const translateOne = useCallback(
    async (text, langCode, forceFresh) => {
      if (forceFresh && translateViaAI) {
        try {
          const t = await translateViaAI(text, langCode, subtitleLang, aiSettings);
          if (t) return t;
        } catch {
          // برمی‌گرده روی مسیرِ عادیِ زیر
        }
        if (translateFreeNetwork) {
          try {
            const t = await translateFreeNetwork(text, langCode, subtitleLang, aiSettings, true);
            if (t) return t;
          } catch {}
        }
      }
      return translateFree(text, langCode, subtitleLang, aiSettings, true);
    },
    [translateFree, translateViaAI, translateFreeNetwork, aiSettings, subtitleLang]
  );

  // به‌محضِ اینکه یه خط فعال می‌شه، ترجمه‌ی همه‌ی زبان‌های مقصدش رو (اگه
  // قبلاً نگرفته بودیم) هم‌زمان می‌گیریم — این یعنی «ترجمه‌ی هم‌زمانِ چند
  // زبان» دقیقاً وقتی که خطِ مربوطه شنیده می‌شه.
  useEffect(() => {
    if (activeIndex < 0 || !cues[activeIndex]) return;
    const cue = cues[activeIndex];
    translationLangs.forEach((l) => {
      const key = `${cue.start}:${l.code}`;
      if (translationsRef.current[key]) return;
      setTranslations((prev) => ({ ...prev, [key]: "loading" }));
      translateOne(cue.text, l.code, false)
        .then((t) => setTranslations((prev) => ({ ...prev, [key]: t || "—" })))
        .catch(() => setTranslations((prev) => ({ ...prev, [key]: "—" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, cues]);

  async function handleRefreshTranslation(cue, langCode) {
    const key = `${cue.start}:${langCode}`;
    if (refreshingKey) return;
    setRefreshingKey(key);
    try {
      const t = await translateOne(cue.text, langCode, true);
      if (t) {
        setTranslations((prev) => ({ ...prev, [key]: t }));
        if (setCachedTranslation) setCachedTranslation(cue.text, langCode, subtitleLang, t);
      }
    } catch {
      // شکست خورد؛ ترجمه‌ی قبلی همون‌جا می‌مونه
    } finally {
      setRefreshingKey(null);
    }
  }

  // 📥 فرستادنِ رونوشتِ همین ویدیو به سیستمِ خوانشِ داستان‌ساز — ویدیو و
  // پلیرِ همین‌جا دست‌نخورده و پخش‌شونده باقی می‌مونه (کاربر می‌تونه هم‌زمان
  // ویدیو رو ببینه/بشنوه و از قابلیت‌های کاملِ داستان‌ساز — ترجمه، کلیک‌رویِ
  // کلمه، ذخیره، سوال — روی همون متن استفاده کنه).
  function handleImportToStory() {
    if (!onImportToStory || !cues.length) return;
    onImportToStory({ cues, subtitleLang, videoId });
  }

  function handleSeek(startSeconds) {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(startSeconds, true);
      playerRef.current.playVideo();
    } catch {}
  }

  async function handleAutoFetch() {
    if (!videoId || autoLoading) return;
    setAutoLoading(true);
    setAutoError("");
    setAutoTracks(null);
    try {
      const tracks = await fetchYouTubeCaptionTracks(videoId, aiSettings);
      setAutoTracks(tracks);
    } catch {
      setAutoError(
        isFa
          ? "دریافتِ خودکارِ زیرنویس ناموفق بود (ممکنه این ویدیو زیرنویس نداشته باشه، یا یوتیوب اجازه‌ی دسترسیِ مستقیم/پراکسی نداده). فایلِ srt/vtt رو دستی آپلود کن."
          : "Automatic caption fetch failed (this video may have no captions, or YouTube blocked both direct and proxied access). Please upload an srt/vtt file instead."
      );
    } finally {
      setAutoLoading(false);
    }
  }

  async function handlePickAutoTrack(track) {
    setAutoLoading(true);
    setAutoError("");
    try {
      const parsed = await fetchYouTubeCaptionTrackText(videoId, track.code, track.kind, aiSettings);
      setCues(parsed);
      setTranslations({});
      setActiveIndex(-1);
      const pickedLang = track.code || subtitleLang;
      setSubtitleLang(pickedLang);
      // 📥 به‌محضِ گرفتنِ موفقِ زیرنویس، خودکار به داستان‌ساز فرستاده می‌شه —
      // دقیقاً مثلِ بقیه‌ی منابعِ داستان‌ساز (PDF/پیست/لینک)، بدونِ نیاز به
      // یه کلیکِ اضافه — تا کارتِ «داستان» و دکمه‌ی «ذخیره» بلافاصله ظاهر بشن.
      if (onImportToStory) onImportToStory({ cues: parsed, subtitleLang: pickedLang, videoId });
    } catch {
      setAutoError(isFa ? "گرفتنِ متنِ همین زیرنویس ناموفق بود. فایلِ srt/vtt رو دستی آپلود کن." : "Couldn't fetch this caption's text. Please upload an srt/vtt file instead.");
    } finally {
      setAutoLoading(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSubtitleFile(String(reader.result || ""));
      if (!parsed.length) {
        setFileError(isFa ? "فایل خوانده نشد یا خالی بود — فقط srt/vtt پشتیبانی می‌شه." : "The file couldn't be read or was empty — only srt/vtt are supported.");
        return;
      }
      setCues(parsed);
      setTranslations({});
      setActiveIndex(-1);
      // 📥 آپلودِ دستی هم دقیقاً مثلِ دریافتِ خودکار، بلافاصله به داستان‌ساز
      // فرستاده می‌شه (زبانِ زیرنویس همون subtitleLangِ فعلیه که کاربر بالا
      // تنظیم کرده).
      if (onImportToStory) onImportToStory({ cues: parsed, subtitleLang, videoId });
    };
    reader.onerror = () => setFileError(isFa ? "خطا در خواندنِ فایل." : "Error reading the file.");
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-4" style={{ padding: 16 }} dir={isFa ? "rtl" : "ltr"}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, fontFamily: fontFa }}>
          {isFa ? "لینکِ ویدیوی یوتیوب" : "YouTube video link"}
        </label>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadVideo()}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: colors.paper,
              color: colors.ink,
              fontSize: 13,
              direction: "ltr",
            }}
          />
          <button
            onClick={loadVideo}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: colors.teal,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: fontFa,
              cursor: "pointer",
            }}
          >
            {isFa ? "بارگذاری" : "Load"}
          </button>
        </div>
        {fileError && <p style={{ color: colors.rose, fontSize: 12, marginTop: 6 }}>{fileError}</p>}
      </div>

      {videoId && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${colors.cardBorder}`, background: "#000", position: "relative", paddingTop: "56.25%" }}>
          <div ref={playerElRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          {!playerReady && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Loader2 size={22} className="spin" />
            </div>
          )}
        </div>
      )}

      {videoId && !cues.length && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 10, background: colors.paperDark, border: `1px solid ${colors.cardBorder}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.ink, fontFamily: fontFa }}>
            {isFa ? "زیرنویس رو چطور بگیریم؟" : "How should we get the captions?"}
          </p>

          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            <button
              onClick={handleAutoFetch}
              disabled={autoLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${colors.goldSoft}`,
                background: "transparent",
                color: colors.gold,
                fontWeight: 700,
                fontSize: 12,
                fontFamily: fontFa,
                cursor: autoLoading ? "default" : "pointer",
                opacity: autoLoading ? 0.6 : 1,
              }}
            >
              {autoLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              {isFa ? "دریافتِ خودکارِ زیرنویس" : "Auto-fetch captions"}
            </button>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.teal,
                fontWeight: 700,
                fontSize: 12,
                fontFamily: fontFa,
                cursor: "pointer",
              }}
            >
              <Upload size={14} />
              {isFa ? "آپلودِ فایلِ زیرنویس (srt/vtt)" : "Upload subtitle file (srt/vtt)"}
              <input type="file" accept=".srt,.vtt,text/vtt,text/plain" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>

          {autoError && <p style={{ color: colors.rose, fontSize: 12, margin: 0 }}>{autoError}</p>}

          {autoTracks && autoTracks.length > 0 && (
            <div>
              <p style={{ margin: "4px 0", fontSize: 12, color: colors.inkSoft, fontFamily: fontFa }}>
                {isFa ? "زبانِ زیرنویس رو انتخاب کن:" : "Pick a caption language:"}
              </p>
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                {autoTracks.map((t) => (
                  <button
                    key={`${t.code}:${t.kind}`}
                    onClick={() => handlePickAutoTrack(t)}
                    disabled={autoLoading}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: `1px solid ${colors.goldSoft}`,
                      background: colors.paper,
                      color: colors.ink,
                      fontSize: 12,
                      fontFamily: fontFa,
                      cursor: autoLoading ? "default" : "pointer",
                    }}
                  >
                    {t.name || t.code}
                    {t.kind === "asr" ? (isFa ? " (خودکار)" : " (auto)") : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!!cues.length && (
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: colors.inkSoft, fontFamily: fontFa }}>
              {isFa ? `${cues.length} خط زیرنویس — زبانِ منبع:` : `${cues.length} caption lines — source language:`}
            </span>
            <input
              value={subtitleLang}
              onChange={(e) => setSubtitleLang(e.target.value.trim().toLowerCase())}
              style={{ width: 60, padding: "2px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, fontSize: 12, direction: "ltr" }}
              title={isFa ? "کدِ زبانِ زیرنویس (مثلاً en, fa, es)" : "Subtitle language code (e.g. en, fa, es)"}
            />
            {onImportToStory && (
              <button
                onClick={handleImportToStory}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: colors.teal,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: fontFa,
                  cursor: "pointer",
                }}
              >
                <Sparkles size={13} />
                {isFa ? "افزودن این رونوشت به داستان‌ساز" : "Send this transcript to the story reader"}
              </button>
            )}
            <button
              onClick={() => {
                setCues([]);
                setTranslations({});
                setActiveIndex(-1);
              }}
              style={{ marginInlineStart: onImportToStory ? 0 : "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.rose, background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={12} />
              {isFa ? "پاک‌کردنِ زیرنویس" : "Clear captions"}
            </button>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto", padding: 4 }}>
            {cues.map((cue, i) => (
              <CaptionLine
                key={`${cue.start}-${i}`}
                cue={cue}
                active={i === activeIndex}
                onSeek={handleSeek}
                translations={translations}
                translationLangs={translationLangs}
                onRefreshTranslation={handleRefreshTranslation}
                refreshingKey={refreshingKey}
                colors={colors}
                fontFa={fontFa}
                ClickableSentence={ClickableSentence}
                SpeakButton={SpeakButton}
                subtitleLang={subtitleLang}
                nativeLang={nativeLang}
                nativeLabel={nativeLabelSafe}
                aiSettings={aiSettings}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
