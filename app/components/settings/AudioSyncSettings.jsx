// تنظیمات هم‌گام‌سازی صدا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect } from "react";
import { SYNC_MODEL_OPTIONS, getSyncModelState, subscribeSyncModel, setSyncModelSize, downloadSyncModel, removeSyncModel, cancelSync } from "../../../audioSync.js";
import { colors } from "../../ui/theme.js";

// ---------------------------------------------------------------------------
// 🎧 همگام‌سازیِ متن و صوت — بسته‌ی کوچکِ روی‌دستگاه که کاربر یک‌بار از تنظیمات
// دانلود می‌کنه. بعدش فایلِ صوتیِ هر داستان یک‌بار روی خودِ گوشی پردازش می‌شه و
// جمله‌ی در حالِ پخش خودکار هایلایت می‌شه. (موتور: audioSync.js)
// ---------------------------------------------------------------------------
function useSyncModelState() {
  const [st, setSt] = useState(getSyncModelState());
  useEffect(() => {
    const f = () => setSt(getSyncModelState());
    f();
    return subscribeSyncModel(f);
  }, []);
  return st;
}
export function AudioSyncSettings({ uiLang, colors }) {
  const en = uiLang === "en";
  const m = useSyncModelState();
  const cur = SYNC_MODEL_OPTIONS.find((o) => o.id === m.size) || SYNC_MODEL_OPTIONS[1];
  const names = {
    fast: en ? "Fast (lower accuracy)" : "سریع (دقت کمتر)",
    balanced: en ? "Balanced (recommended)" : "متعادل (پیشنهادی)",
  };
  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 };
  return (
    <div style={{ marginTop: 6, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
        🎧 {en ? "Text ↔ audio sync" : "همگام‌سازی متن و صوت"}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
        <span>{en ? "Quality" : "کیفیت"}</span>
        <select
          value={m.size}
          disabled={m.busy}
          onChange={(e) => setSyncModelSize(e.target.value)}
          style={{ flex: 1, fontSize: 12.5, padding: "6px 8px", borderRadius: 10, border: `1px solid ${colors.cardBorder}`, backgroundColor: "white", color: colors.ink }}
        >
          {SYNC_MODEL_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{names[o.id]} ~{o.approxMb}MB</option>
          ))}
        </select>
      </label>
      {!m.downloaded && !m.busy && (
        <button onClick={() => downloadSyncModel()} style={btn}>
          📥 {m.paused
            ? (en ? "Resume download (finished files are kept)" : "ادامه‌ی دانلود (فایل‌های کامل‌شده نگه داشته شده‌اند)")
            : (en ? `Download sync pack (~${cur.approxMb} MB, one-time)` : `دانلود بسته‌ی همگام‌سازی (~${cur.approxMb} مگابایت، فقط یک بار)`)}
        </button>
      )}
      {m.busy && (
        <div>
          <p style={note}>📥 {en ? "Downloading..." : "در حال دانلود..."} {m.mb} MB</p>
          <button onClick={() => cancelSync()} style={btn}>⏹ {en ? "Stop (resume later)" : "توقف (بعداً ادامه می‌دهم)"}</button>
        </div>
      )}
      {m.downloaded && !m.busy && (
        <div>
          <p style={note}>✅ {en ? "Pack downloaded and ready" : "بسته دانلود شده و آماده‌ست"}</p>
          <button
            onClick={() => { if (confirm(en ? "Delete the sync pack?" : "بسته‌ی همگام‌سازی حذف بشه؟")) removeSyncModel(); }}
            style={btn}
          >
            🗑 {en ? "Delete pack" : "حذف بسته"}
          </button>
        </div>
      )}
      {m.error && (
        <p style={{ ...note, color: colors.rose }}>
          {en ? "Download failed — check your connection / VPN and try again." : "دانلود ناموفق بود — اینترنت یا فیلترشکن رو چک کن و دوباره بزن."}
        </p>
      )}
      <p style={note}>
        {en
          ? "Download once. After that, syncing a story's audio runs on your phone, offline. Then use the Sync button on the “My audio” bar of a story."
          : "فقط یک بار دانلود می‌شه (اگه شروع نشد فیلترشکن رو روشن کن). بعدش همگام‌سازیِ صوتِ هر داستان روی خودِ گوشی و بدونِ اینترنت انجام می‌شه. بعد از دانلود، از نوارِ «صوتِ من» توی هر داستان دکمه‌ی همگام‌سازی رو بزن."}
      </p>
    </div>
  );
}
// کنترل‌های همگام‌سازی داخلِ نوارِ «صوتِ من» (StoryUserAudioBar)
export function StorySyncControls({ userAudio, storyLang }) {
  const m = useSyncModelState();
  const { syncTimes, syncOn, setSyncOn, syncProgress, syncError, buildSync, cancelSyncBuild, clearSync } = userAudio;
  const small = { fontSize: 12, color: colors.inkSoft, lineHeight: 1.7 };
  const btn = { padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 12.5 };
  const pct = syncProgress ? Math.round((syncProgress.frac || 0) * 100) : 0;
  const phase = syncProgress
    ? syncProgress.phase === "decode" ? "در حال خواندن صوت..."
      : syncProgress.phase === "load" ? "آماده‌سازی..."
      : syncProgress.live ? `در حال همگام‌سازی... ${pct}٪ — تا همین‌جا همگام شده و قابل‌پخشه`
      : `در حال همگام‌سازی... ${pct}٪`
    : "";
  const cur = SYNC_MODEL_OPTIONS.find((o) => o.id === m.size) || SYNC_MODEL_OPTIONS[1];
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${colors.cardBorder}` }}>
      {syncProgress ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={small}>⏳ {phase}</span>
          <button onClick={() => cancelSyncBuild()} style={btn}>توقف</button>
        </div>
      ) : syncTimes ? (
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: colors.ink, marginBottom: 8 }}>
            <input type="checkbox" checked={!!syncOn} onChange={(e) => setSyncOn(e.target.checked)} />
            <span>خطِ فعال خودکار با صدا جلو بره</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => buildSync(storyLang)} style={btn}>همگام‌سازی دوباره</button>
            <button onClick={clearSync} style={{ ...btn, border: "none", background: "none", color: colors.rose }}>حذف همگام‌سازی</button>
          </div>
        </div>
      ) : m.busy ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={small}>📥 در حال دانلود بسته... {m.mb} MB</span>
          <button onClick={() => cancelSync()} style={btn}>توقف</button>
        </div>
      ) : !m.downloaded ? (
        <div>
          <button onClick={() => downloadSyncModel()} style={btn}>
            📥 دانلود بسته‌ی همگام‌سازی (~{cur.approxMb} مگابایت، فقط یک بار)
          </button>
          <p style={{ ...small, marginTop: 6 }}>برای اینکه جمله‌ی در حالِ پخش خودکار هایلایت بشه. اگه دانلود شروع نشد فیلترشکن رو روشن کن.</p>
          {m.error && <p style={{ ...small, color: colors.rose }}>دانلود ناموفق بود — اینترنت یا فیلترشکن رو چک کن و دوباره بزن.</p>}
        </div>
      ) : (
        <div>
          <button onClick={() => buildSync(storyLang)} style={btn}>🎧 همگام‌سازی متن با صوت</button>
          <p style={{ ...small, marginTop: 6 }}>یک بار انجام می‌شه و روی خودِ گوشی اجرا می‌شه؛ برای فایل‌های طولانی ممکنه چند دقیقه طول بکشه.</p>
        </div>
      )}
      {syncError && <p style={{ ...small, color: colors.rose, marginTop: 6 }}>{syncError}</p>}
    </div>
  );
}
