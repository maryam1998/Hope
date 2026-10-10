// مودال لغات آفلاین
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { VOCAB } from "../../../VOCAB.js";
import { WORDS_AZ } from "../../../WORDS_AZ.js";
import { DAILY_WORDS } from "../../../DAILY_WORDS.js";
import { getTranslationCacheCount } from "../../storage/translationCacheDb.js";
import { LANGUAGES } from "../../constants/languages.js";
import { colors } from "../../ui/theme.js";
import { looksLikelyMistranslated, translateFree } from "../../translate/translateService.js";

// ---------------------------------------------------------------------------
// Hamburger settings menu — theme color, font family, font size. Appears as
// a dropdown panel from the header. Appearance prefs are device-level
// (appPrefs/setAppPrefs, persisted via APP_PREFS_KEY) so they apply
// immediately across the whole app, including the login screen.
// ---------------------------------------------------------------------------
// ============================================================
// دانلود آفلاین لغات — زبان(ها) رو انتخاب می‌کنی، همه‌ی لغات لیست‌های
// VOCAB / WORDS_AZ / DAILY_WORDS رو یکی‌یکی با همون زنجیره‌ی
// سرویس‌های رایگان (translateFree) ترجمه می‌کنه و توی IndexedDB ذخیره
// می‌کنه. بعد از اون، همون کلمات کاملاً آفلاین در دسترسن (چون translateFree
// اول کش رو چک می‌کنه). اگه وسط کار قطع بشه، دفعه‌ی بعد فقط لغاتِ باقی‌مونده
// رو ادامه می‌ده (لغاتی که قبلاً کش شدن رد می‌شن، پس منابع رو هدر نمی‌ده).
// ============================================================
function formatDownloadSize(bytes) {
  if (!bytes) return "۰ کیلوبایت";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)}`.replace(".", "٫") + " کیلوبایت";
  const mb = kb / 1024;
  return `${mb.toFixed(1)}`.replace(".", "٫") + " مگابایت";
}
export function OfflineWordsModal({ open, onClose, aiSettings }) {
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, bytes: 0, failed: 0 });
  const [currentWord, setCurrentWord] = useState("");
  const [cachedCount, setCachedCount] = useState(null);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      getTranslationCacheCount().then(setCachedCount);
      setFinished(false);
    }
  }, [open]);

  const allWords = useMemo(() => {
    const map = new Map();
    [VOCAB, WORDS_AZ, DAILY_WORDS].forEach((list) => {
      (list || []).forEach((w) => {
        if (w?.en && !map.has(w.en)) map.set(w.en, true);
      });
    });
    return Array.from(map.keys());
  }, []);

  if (!open) return null;

  const toggleLang = (code) => {
    setSelectedLangs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const startDownload = async () => {
    if (selectedLangs.length === 0 || running) return;
    setRunning(true);
    setFinished(false);
    cancelRef.current = false;

    const jobs = [];
    selectedLangs.forEach((lang) => allWords.forEach((word) => jobs.push({ word, lang })));
    setProgress({ done: 0, total: jobs.length, bytes: 0, failed: 0 });

    let doneCount = 0;
    let byteCount = 0;
    let failedCount = 0;
    // با اضافه‌شدنِ circuit-breakerِ سرویس‌های ترجمه (که سرویسِ فیلترشده رو
    // بعد از چندبار شکست کنار می‌ذاره)، هر کار خیلی سریع‌تر از قبل تصمیم
    // می‌گیره — پس هم‌زمانیِ محلیِ این دانلود رو هم به همون سقفِ سراسری
    // (GLOBAL_TRANSLATE_CONCURRENCY) نزدیک می‌کنیم تا صف زودتر خالی بشه.
    const CONCURRENCY = 8;
    let cursor = 0;

    async function worker() {
      while (cursor < jobs.length) {
        if (cancelRef.current) return;
        const job = jobs[cursor++];
        setCurrentWord(job.word);
        // لغات از قبل انگلیسی‌ان؛ برای زبانِ انگلیسی چیزی برای دانلود/ترجمه نیست — فوراً «انجام‌شده» حساب می‌شه
        if (job.lang === "en") {
          doneCount++;
          setProgress({ done: doneCount, total: jobs.length, bytes: byteCount, failed: failedCount });
          continue;
        }
        try {
          const result = await translateFree(job.word, job.lang, "en", aiSettings);
          // اگه نتیجه هنوز مشکوک/ترجمه‌نشده‌ست (یعنی همه‌ی سرویس‌ها شکست
          // خوردن و متنِ اصلی برگشته)، به‌عنوانِ «موفق» حسابش نمی‌کنیم —
          // تا شمارشگرِ کاربر واقعی باشه، نه گمراه‌کننده.
          if (result && !looksLikelyMistranslated(job.word, result, job.lang, "en")) {
            byteCount += new TextEncoder().encode(result).length;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
        doneCount++;
        setProgress({ done: doneCount, total: jobs.length, bytes: byteCount, failed: failedCount });
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    setFinished(!cancelRef.current);
    getTranslationCacheCount().then(setCachedCount);
  };

  const cancelDownload = () => {
    cancelRef.current = true;
    setRunning(false);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      onClick={() => !running && onClose()}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.paper, borderRadius: 18, padding: 20, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>دانلود آفلاین لغات</p>
          {!running && (
            <button onClick={onClose} aria-label="بستن">
              <X size={18} color={colors.inkSoft} />
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.8, marginBottom: 14 }}>
          زبان‌های موردنظرت رو انتخاب کن. برنامه {allWords.length.toLocaleString("fa-IR")} لغت رو یکی‌یکی با سرویس‌های ترجمه‌ی رایگان ترجمه و روی گوشی ذخیره می‌کنه — فقط همین یک‌بار به اینترنت نیاز داره؛ بعدش این لغات کاملاً آفلاین در دسترسن.
        </p>

        {!running && !finished && (
          <>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => toggleLang(l.code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: `1.5px solid ${selectedLangs.includes(l.code) ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selectedLangs.includes(l.code) ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={startDownload}
              disabled={selectedLangs.length === 0}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                backgroundColor: selectedLangs.length ? colors.ink : "#ccc",
                color: colors.paper,
              }}
            >
              شروع دانلود
              {selectedLangs.length > 0 && ` (${(allWords.length * selectedLangs.length).toLocaleString("fa-IR")} ترجمه)`}
            </button>
          </>
        )}

        {running && (
          <>
            <div style={{ height: 10, borderRadius: 6, backgroundColor: "#eee", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.gold, transition: "width .2s" }} />
            </div>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
              {progress.done.toLocaleString("fa-IR")} از {progress.total.toLocaleString("fa-IR")} ({pct}٪) · {formatDownloadSize(progress.bytes)}
            </p>
            {progress.failed > 0 && (
              <p style={{ fontSize: 11, color: colors.rose, marginBottom: 4 }}>
                {progress.failed.toLocaleString("fa-IR")} تا هنوز جواب نگرفتن (بعداً دوباره امتحان می‌شن)
              </p>
            )}
            <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 16, direction: "ltr", textAlign: "left", opacity: 0.7 }}>
              {currentWord}
            </p>
            <button
              onClick={cancelDownload}
              style={{ width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `1.5px solid ${colors.rose}`, color: colors.rose }}
            >
              لغو
            </button>
          </>
        )}

        {finished && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>✅ تمام شد</p>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              الان {cachedCount?.toLocaleString("fa-IR")} ترجمه (حدود {formatDownloadSize(progress.bytes)} این‌بار) روی گوشی ذخیره‌ست و کاملاً آفلاین در دسترسه.
            </p>
            {progress.failed > 0 && (
              <p style={{ fontSize: 11, color: colors.rose, marginBottom: 10 }}>
                {progress.failed.toLocaleString("fa-IR")} تا ترجمه نشدن (احتمالاً سرویس‌ها موقتاً در دسترس نبودن) — می‌تونی دوباره «شروع دانلود» رو بزنی، فقط همین‌ها امتحان می‌شن.
              </p>
            )}
            <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, backgroundColor: colors.ink, color: colors.paper }}>
              باشه
            </button>
          </div>
        )}

        {!running && !finished && cachedCount !== null && cachedCount > 0 && (
          <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 12, textAlign: "center" }}>
            {cachedCount.toLocaleString("fa-IR")} ترجمه از قبل ذخیره شده (این‌ها دوباره دانلود نمی‌شن)
          </p>
        )}
      </div>
    </div>
  );
}
