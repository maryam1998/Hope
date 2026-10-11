// ترجمه‌ی آفلاین با ML Kit (فقط داخلِ اپِ اندرویدی؛ روی وب همیشه null برمی‌گرداند).
// منطق: اگر مدلِ جفت‌زبان روی گوشی هست → آنی و رایگان؛ اگر نیست → دانلودِ پس‌زمینه (فقط Wi‑Fi)
// و فعلاً null تا زنجیره‌ی آنلاین جواب بدهد. زبانِ مبدأ باید مشخص باشد (ML Kit "auto" ندارد).

const MAX_CHARS = 400;
const readyCache = new Map(); // "src>tgt" -> true | false(پشتیبانی‌نشده)
const triedDownload = new Set();

function plugin() {
  try {
    const C = typeof window !== "undefined" ? window.Capacitor : null;
    if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
    const P = C.Plugins && C.Plugins.BubblePlugin;
    return P && typeof P.mlkitTranslate === "function" ? P : null;
  } catch {
    return null;
  }
}

export function isOfflineTranslateAvailable() {
  return !!plugin();
}

// ترجمه‌ی آفلاین؛ null یعنی «استفاده نشد» (نه خطا) → زنجیره‌ی آنلاین ادامه می‌دهد.
export async function translateOffline(text, targetLang, sourceLang) {
  const P = plugin();
  if (!P || !text || text.length > MAX_CHARS) return null;
  if (!sourceLang || sourceLang === "auto" || sourceLang === targetLang) return null;
  const key = `${sourceLang}>${targetLang}`;
  try {
    if (readyCache.get(key) !== true) {
      if (readyCache.get(key) === false) return null;
      const st = await P.mlkitStatus({ src: sourceLang, tgt: targetLang });
      if (!st.supported) {
        readyCache.set(key, false);
        return null;
      }
      if (!st.ready) {
        if (!triedDownload.has(key) && !st.downloading) {
          triedDownload.add(key);
          P.mlkitDownload({ src: sourceLang, tgt: targetLang, wifiOnly: true }).catch(() => {});
        }
        return null;
      }
      readyCache.set(key, true);
    }
    const r = await P.mlkitTranslate({ text, src: sourceLang, tgt: targetLang });
    const out = (r && r.text ? String(r.text) : "").trim();
    return out || null;
  } catch {
    return null;
  }
}

// برای صفحه‌ی تنظیمات: دانلودِ دستیِ یک جفت‌زبان (روی دیتا هم، چون کاربر خودش خواسته).
export async function downloadOfflinePair(sourceLang, targetLang) {
  const P = plugin();
  if (!P) throw new Error("not-native");
  await P.mlkitDownload({ src: sourceLang, tgt: targetLang, wifiOnly: false });
  readyCache.delete(`${sourceLang}>${targetLang}`);
}

export async function deleteOfflineLanguage(lang) {
  const P = plugin();
  if (!P) throw new Error("not-native");
  await P.mlkitDelete({ lang });
  readyCache.clear();
  triedDownload.clear();
}

export function setOfflineFirstEnabled(enabled) {
  const P = plugin();
  if (P && typeof P.mlkitSetEnabled === "function") P.mlkitSetEnabled({ enabled: !!enabled }).catch(() => {});
}
