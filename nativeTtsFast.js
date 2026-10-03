// پل سریع بین اپ و موتور Piper (BubblePlugin) — جایگزینِ nativeSpeak/nativeStop ی قدیمی،
// به‌علاوه‌ی prefetch (ساختنِ صدای جمله‌ی بعدی پیش‌پیش) و warm (گرم‌کردنِ موتور).
// isNativeTtsAvailable / isNativeTtsReady / refreshNativeTtsStatus همچنان از nativeTts.js می‌آن.

function plugin() {
  try {
    const C = typeof window !== "undefined" ? window.Capacitor : null;
    if (!C || !C.Plugins || !C.Plugins.BubblePlugin) return null;
    if (C.isNativePlatform && !C.isNativePlatform()) return null;
    return C.Plugins.BubblePlugin;
  } catch (e) {
    return null;
  }
}

let seq = 0;
const pending = new Map(); // id -> resolve(ok)
let listenerReady = false;

function ensureListener(B) {
  if (listenerReady) return;
  listenerReady = true;
  try {
    B.addListener("ttsSpeakDone", (e) => {
      const id = e && e.id;
      const r = id != null ? pending.get(id) : null;
      if (r) {
        pending.delete(id);
        r(!(e && e.ok === false));
      }
    });
  } catch (err) {
    listenerReady = false;
  }
}

/** متن رو با Piper می‌خونه. وقتی پخش واقعاً تموم شد true؛ اگه مدل نیست/شکست خورد false. */
export function nativeSpeak(text, lang, rate) {
  const B = plugin();
  if (!B || !text) return Promise.resolve(false);
  ensureListener(B);
  const id = "s" + ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    Promise.resolve(B.speak({ text, lang, speed: rate || 1, id })).catch(() => {
      if (pending.delete(id)) resolve(false);
    });
  });
}

export function nativeStop() {
  const B = plugin();
  if (!B) return;
  try {
    Promise.resolve(B.stopSpeaking()).catch(() => {});
  } catch (e) {}
}

/** صدای این متن رو پیش‌پیش بساز (برای جمله‌ی بعدی). */
export function nativePrefetch(text, lang, rate) {
  const B = plugin();
  if (!B || !B.prefetchTts || !text) return;
  try {
    Promise.resolve(B.prefetchTts({ text, lang, speed: rate || 1 })).catch(() => {});
  } catch (e) {}
}

/** موتورِ یه زبان رو توی پس‌زمینه لود و گرم کن. */
export function nativeWarm(lang) {
  const B = plugin();
  if (!B || !B.preloadTts) return;
  try {
    Promise.resolve(B.preloadTts(lang ? { lang } : {})).catch(() => {});
  } catch (e) {}
}

/**
 * موقعِ شروعِ اپ: وضعیتِ همه‌ی زبان‌های دانلودشده رو توی کشِ سنکرونِ nativeTts.js بنشون
 * (تا همون تپِ اولِ هر زبان از Piper بخونه، نه از TTS گوشی) و موتورِ آخرین زبان رو گرم کن.
 */
export async function nativeWarmAll(onDownloadedLang) {
  const B = plugin();
  if (!B || !B.getTtsCatalog) return;
  try {
    const r = await B.getTtsCatalog();
    ((r && r.languages) || []).forEach((x) => {
      if (x && x.downloaded && onDownloadedLang) {
        try { onDownloadedLang(x.lang); } catch (e) {}
      }
    });
    nativeWarm();
  } catch (e) {}
}
