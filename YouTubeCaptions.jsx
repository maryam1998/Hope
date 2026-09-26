import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

// -----------------------------------------------------------------------
// تبِ «یوتیوب»: کاربر یه لینک ویدیوی یوتیوب می‌ده، خودِ ویدیو همین‌جا پخش
// می‌شه، و زیرنویسِ *واقعیِ* یوتیوب (با تایم‌استمپِ واقعی) خودکار از
// بک‌اندِ خودمون گرفته می‌شه و با پیشرفتِ واقعیِ پخش (player.getCurrentTime)
// سینک می‌مونه — دقیقاً همون کاری که اپ‌هایی مثلِ Native با
// MediaSessionِ سیستم‌عامل انجام می‌دن، با این فرق که چون خودمون پلیر رو
// مستقیم embed کردیم، به هیچ مجوز/ترفندِ خاصی نیاز نداریم.
//
// 🩹 قبلاً این پنل یه راهِ جداگانه برای «گرفتنِ زیرنویس» هم داشت (دریافتِ
// خودکارِ ناموفق، آپلودِ فایل، یا پیستِ دستی) — یعنی کاربر دو جای متفاوت
// برای واردکردنِ متن داشت. حالا دیگه اون UI نیست: گرفتنِ زیرنویس کاملاً
// خودکاره (بدونِ دکمه)؛ فقط اگه ویدیو زیرنویس نداشت یا گرفتنش شکست خورد،
// یه پیامِ کوتاه می‌گه از همون باکسِ عمومیِ «پیستِ متن/داستان» استفاده کن.
//
// 📌 ویدیو با position:fixed (نه sticky) نگه داشته می‌شه چون این پنل فقط
// شاملِ اینپوتِ لینک + خودِ ویدیو + لیستِ زیرنویسه، و محتوایِ بعدی (باکس‌های
// PDF/لینک/پیستِ متن) بیرون از همین کامپوننته.
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

// همون آدرسِ پیش‌فرضی که بقیه‌ی app.jsx هم استفاده می‌کنه (DEFAULT_BACKEND_URL) —
// اینجا جدا نگه‌داشته شده چون این فایل مستقلاً import می‌شه.
const FALLBACK_BACKEND_URL = "https://phrasebook-api.maryam-s-sharifiyan.workers.dev";

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

// بارگذاریِ یک‌باره‌ی اسکریپتِ رسمیِ YouTube IFrame API.
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

// پیدا کردنِ ایندکسِ خطِ زیرنویسی که الان (در ثانیه‌ی t) باید نمایش داده
// بشه. اسکنِ خطی کافیه چون این تابع فقط چندبار در ثانیه صدا زده می‌شه.
function findActiveCueIndex(cues, t) {
  if (!cues || !cues.length) return -1;
  if (t < cues[0].start) return -1;
  for (let i = cues.length - 1; i >= 0; i--) {
    if (t >= cues[i].start) return i;
  }
  return -1;
}

export default function YouTubeCaptionPanel({
  uiLang,
  colors: colorsProp,
  fontFa: fontFaProp,
  aiSettings,
  onImportToStory,
}) {
  const colors = colorsProp || FALLBACK_COLORS;
  const fontFa = fontFaProp || "inherit";
  const isFa = uiLang !== "en";
  const backendUrl = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || FALLBACK_BACKEND_URL;

  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [fileError, setFileError] = useState("");

  const [cues, setCues] = useState([]);
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [captionsError, setCaptionsError] = useState("");
  const [captionLang, setCaptionLang] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const pollRef = useRef(null);
  const lineRefs = useRef({});
  const cuesRef = useRef([]);
  cuesRef.current = cues;

  function loadVideo() {
    const id = extractYouTubeId(urlInput);
    if (!id) {
      setFileError(isFa ? "این لینک شناخته نشد. لینکِ کاملِ ویدیوی یوتیوب رو پیست کن." : "Couldn't recognize this link. Paste a full YouTube video link.");
      return;
    }
    setFileError("");
    setCues([]);
    setCaptionsError("");
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
            const YTState = window.YT?.PlayerState;
            if (e.data === YTState?.PLAYING) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                try {
                  const t = playerRef.current?.getCurrentTime?.() ?? 0;
                  setActiveIndex((prev) => {
                    const next = findActiveCueIndex(cuesRef.current, t);
                    return next === prev ? prev : next;
                  });
                } catch {}
              }, 250);
            } else if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // گرفتنِ خودکارِ زیرنویسِ واقعی از بک‌اند — بدونِ هیچ دکمه‌ای.
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setCaptionsLoading(true);
    setCaptionsError("");
    setCues([]);
    setActiveIndex(-1);
    fetch(`${backendUrl}/api/youtube-captions?videoId=${encodeURIComponent(videoId)}&lang=en`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !Array.isArray(data.cues) || !data.cues.length) {
          throw new Error(data?.error || (isFa ? "زیرنویسی پیدا نشد" : "No captions found"));
        }
        setCues(data.cues);
        setCaptionLang(data.lang || null);
      })
      .catch((e) => {
        if (cancelled) return;
        setCaptionsError(e.message || (isFa ? "گرفتنِ زیرنویس ناموفق بود" : "Couldn't fetch captions"));
      })
      .finally(() => {
        if (!cancelled) setCaptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, backendUrl, isFa]);

  // خطِ فعال رو همیشه تو دیدِ کاربر نگه می‌داره.
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  function seekTo(seconds) {
    try {
      playerRef.current?.seekTo?.(seconds, true);
    } catch {}
  }

  function handleAddToStory() {
    if (typeof onImportToStory === "function" && cues.length) {
      onImportToStory(cues);
    }
  }

  return (
    <div className="flex flex-col gap-2" style={{ padding: 16 }} dir={isFa ? "rtl" : "ltr"}>
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
        <>
          {/* جاگیرِ خالی — چون خودِ ویدیو fixed شده و از جریانِ عادیِ صفحه
              بیرون رفته، این باکسِ خالی (با نسبتِ تصویرِ ۱۶:۹) جایِ لازم رو
              تو جریانِ صفحه نگه می‌داره. */}
          <div style={{ paddingTop: "56.25%" }} />
          <div
            style={{
              position: "fixed",
              top: 8,
              left: 12,
              right: 12,
              zIndex: 20,
              borderRadius: 10,
              overflow: "hidden",
              border: `1px solid ${colors.cardBorder}`,
              background: "#000",
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ position: "relative", paddingTop: "56.25%" }}>
              <div ref={playerElRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              {!playerReady && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Loader2 size={22} className="spin" />
                </div>
              )}
            </div>
          </div>

          {captionsLoading && (
            <p style={{ margin: 0, fontSize: 12, color: colors.inkSoft, fontFamily: fontFa, display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={14} className="spin" />
              {isFa ? "در حالِ گرفتنِ زیرنویس از یوتیوب…" : "Fetching captions from YouTube…"}
            </p>
          )}

          {!captionsLoading && captionsError && (
            <p style={{ margin: 0, fontSize: 12, color: colors.rose, fontFamily: fontFa }}>
              {isFa
                ? `${captionsError} — می‌تونی به‌جاش رونوشتِ ویدیو رو از هرجایی که داری کپی کنی و پایین‌ترِ همین صفحه، توی باکسِ «یا یک متن/داستان رو اینجا پیست کن» بچسبونی.`
                : `${captionsError} — you can instead copy this video's transcript from wherever you have it and paste it further down, in the “Or paste a text/story here” box.`}
            </p>
          )}

          {!captionsLoading && !captionsError && cues.length > 0 && (
            <>
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <span style={{ fontSize: 11, color: colors.inkSoft, fontFamily: fontFa }}>
                  {isFa ? `زیرنویس: ${captionLang || "?"}` : `Captions: ${captionLang || "?"}`}
                </span>
                {typeof onImportToStory === "function" && (
                  <button
                    onClick={handleAddToStory}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1px solid ${colors.teal}`,
                      background: "transparent",
                      color: colors.teal,
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: fontFa,
                      cursor: "pointer",
                    }}
                  >
                    {isFa ? "افزودنِ کلِ متن به داستان" : "Add full text to story"}
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  background: colors.paper,
                }}
              >
                {cues.map((c, i) => {
                  const active = i === activeIndex;
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        lineRefs.current[i] = el;
                      }}
                      onClick={() => seekTo(c.start)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: i < cues.length - 1 ? `1px solid ${colors.cardBorder}` : "none",
                        background: active ? colors.goldSoft : "transparent",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: colors.ink,
                        transition: "background 120ms ease",
                      }}
                    >
                      {c.text}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
