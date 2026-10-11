// تنظیمات هم‌گام‌سازی صدا
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect } from "react";
import { SYNC_MODEL_OPTIONS, getSyncModelState, subscribeSyncModel, setSyncModelSize, downloadSyncModel, removeSyncModel, cancelSync } from "../../../audioSync.js";
import { colors } from "../../ui/theme.js";
import { useTranslation } from "react-i18next";
import { t as tStatic } from "../../../i18nconfig.js";

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
  useTranslation(); // re-render when the UI language changes
  const t = tStatic;
  const m = useSyncModelState();
  const cur = SYNC_MODEL_OPTIONS.find((o) => o.id === m.size) || SYNC_MODEL_OPTIONS[1];
  const names = {
    fast: t("settings_sync_model_fast"),
    balanced: t("settings_sync_model_balanced"),
  };
  const btn = { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%", marginBottom: 8 };
  const note = { fontSize: 12, color: colors.inkSoft, marginBottom: 8, lineHeight: 1.7 };
  return (
    <div style={{ marginTop: 6, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
        🎧 {t("settings_sync_title")}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
        <span>{t("settings_quality")}</span>
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
            ? (t("settings_sync_resume"))
            : (t("settings_sync_download", { mb: cur.approxMb }))}
        </button>
      )}
      {m.busy && (
        <div>
          <p style={note}>📥 {t("settings_pack_downloading")} {m.mb} MB</p>
          <button onClick={() => cancelSync()} style={btn}>⏹ {t("settings_pack_stop_resume")}</button>
        </div>
      )}
      {m.downloaded && !m.busy && (
        <div>
          <p style={note}>✅ {t("settings_pack_ready")}</p>
          <button
            onClick={() => { if (confirm(t("settings_sync_delete_confirm"))) removeSyncModel(); }}
            style={btn}
          >
            🗑 {t("settings_pack_delete")}
          </button>
        </div>
      )}
      {m.error && (
        <p style={{ ...note, color: colors.rose }}>
          {t("settings_sync_download_failed")}
        </p>
      )}
      <p style={note}>
        {t("settings_sync_description")}
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
