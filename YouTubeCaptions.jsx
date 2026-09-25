import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

// -----------------------------------------------------------------------
// تبِ «یوتیوب»: کاربر یه لینک ویدیوی یوتیوب می‌ده، خودِ ویدیو همین‌جا (نه
// توی مرورگرِ جدا) پخش می‌شه.
//
// 🩹 قبلاً این پنل خودش یه راهِ جداگانه برای «گرفتنِ زیرنویس» هم داشت
// (دریافتِ خودکار از یوتیوب، آپلودِ فایلِ srt/vtt، یا پیستِ متنِ زیرنویس تو
// یه باکسِ مخصوصِ همینجا) — یعنی برای واردکردنِ متن، کاربر دو جای متفاوت
// داشت (این پنل، و باکسِ عمومیِ «پیستِ متن/داستان» که بیرون از این پنل،
// پایین‌ترِ همین صفحه هست). طبقِ خواسته‌ی کاربر، اون راهِ دوم و جداگانه
// کاملاً حذف شده — این پنل الان فقط ویدیو رو نشون می‌ده؛ برای واردکردنِ
// متنِ داستان، کاربر رونوشتِ ویدیو رو (از هرجا که خودش داره) کپی می‌کنه و تو
// همون باکسِ عمومیِ «پیستِ متن/داستان» می‌چسبونه — یعنی فقط یه جا برای
// پیستِ متن وجود داره، نه دوتا.
//
// 📌 ویدیو با position:fixed (نه sticky) نگه داشته می‌شه: چون این پنل خودش
// فقط شاملِ اینپوتِ لینک + خودِ ویدیوعه و محتوایی که بعدش میاد (باکس‌های
// PDF/لینک/پیستِ متن) بیرون از همین کامپوننته، sticky فقط تا آخرِ کانتینرِ
// خودِ این پنل (که خیلی کوتاهه) دووم می‌آورد. با fixed، ویدیو مستقلِ از
// اسکرولِ صفحه، تا وقتی همین پنل بازه، همیشه رویِ صفحه می‌مونه.
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

export default function YouTubeCaptionPanel({
  uiLang,
  colors: colorsProp,
  fontFa: fontFaProp,
}) {
  const colors = colorsProp || FALLBACK_COLORS;
  const fontFa = fontFaProp || "inherit";
  const isFa = uiLang !== "en";

  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const [fileError, setFileError] = useState("");

  function loadVideo() {
    const id = extractYouTubeId(urlInput);
    if (!id) {
      setFileError(isFa ? "این لینک شناخته نشد. لینکِ کاملِ ویدیوی یوتیوب رو پیست کن." : "Couldn't recognize this link. Paste a full YouTube video link.");
      return;
    }
    setFileError("");
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
          {/* 📌 جاگیرِ خالی (spacer) — چون خودِ ویدیو fixed شده و از جریانِ
              عادیِ صفحه بیرون رفته، این باکسِ خالی (با همون نسبتِ تصویرِ
              16:9) جایِ لازم رو تو جریانِ صفحه نگه می‌داره تا محتوایِ بعدی
              زیرِ ویدیو گم نشه. */}
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

          <p style={{ margin: 0, fontSize: 12, color: colors.inkSoft, fontFamily: fontFa }}>
            {isFa
              ? "برای واردکردنِ متنِ این ویدیو به داستان، رونوشتش رو کپی کن و پایین‌ترِ همین صفحه، توی باکسِ «یا یک متن/داستان رو اینجا پیست کن» بچسبونش."
              : "To bring this video's text into the story, copy its transcript and paste it further down, in the “Or paste a text/story here” box."}
          </p>
        </>
      )}
    </div>
  );
}
