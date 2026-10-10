// کش ترجمه (IndexedDB)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ---------------------------------------------------------------------------
// DESIGN TOKENS — deliberately not Tailwind's default palette / fonts.
// Inspired by old travel phrasebooks & passport stamps: ink on aged paper,
// with a muted gold "stamp" accent for the active target language.
//
// Values are CSS custom-property references (not raw hex) so the whole app
// can be re-themed live: every `colors.xxx` usage below still works exactly
// as before (React accepts "var(--c-xxx)" as a normal color string), but
// changing the variables on the root element (see ThemeStyle/APP_THEMES)
// re-colors everything at once, no per-component edits needed.
// ---------------------------------------------------------------------------
// ============================================================
// کش دائمی ترجمه‌ها در IndexedDB — یک‌بار که کلمه‌ای ترجمه شد، برای همیشه
// (حتی بعد از بستن مرورگر/آفلاین‌شدن) روی خودِ گوشی ذخیره می‌مونه.
// translateFree پایین همین کش رو خودکار چک/پر می‌کنه، پس هرجای اپ که از
// translateFree استفاده می‌کنه (پاپ‌آپ کلمه، دیکشنری، استوری‌بیلدر و...)
// خودبه‌خود از این کش بهره می‌بره، بدون نیاز به تغییر جای دیگه‌ای.
// ============================================================
const TRANSLATION_DB_NAME = "phrasebook-translations";
const TRANSLATION_STORE = "translations";
function openTranslationDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const req = indexedDB.open(TRANSLATION_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRANSLATION_STORE)) {
        db.createObjectStore(TRANSLATION_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function translationCacheKey(text, targetLang, sourceLang) {
  return `${sourceLang || "auto"}::${targetLang}::${text}`;
}
export async function getCachedTranslation(text, targetLang, sourceLang = "auto") {
  try {
    const db = await openTranslationDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(TRANSLATION_STORE, "readonly");
      const req = tx.objectStore(TRANSLATION_STORE).get(translationCacheKey(text, targetLang, sourceLang));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
export async function setCachedTranslation(text, targetLang, sourceLang, translation) {
  try {
    const db = await openTranslationDB();
    await new Promise((resolve) => {
      const tx = db.transaction(TRANSLATION_STORE, "readwrite");
      tx.objectStore(TRANSLATION_STORE).put(translation, translationCacheKey(text, targetLang, sourceLang));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // IndexedDB در دسترس نبود (مثلاً حالت خصوصی مرورگر) — بی‌خیال کش می‌شیم، مشکلی نیست
  }
}
export async function getTranslationCacheCount() {
  try {
    const db = await openTranslationDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(TRANSLATION_STORE, "readonly");
      const req = tx.objectStore(TRANSLATION_STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
// همه‌ی ترجمه‌های کش‌شده‌ی یک زبانِ مقصد خاص (مثلاً «هر جمله‌ای که قبلاً به
// آلمانی ترجمه و کش شده») رو یک‌جا، با یه اسکنِ Cursor، برمی‌گردونه — به
// شکلِ Map از «متنِ اصلی» به «ترجمه». برخلافِ getCachedTranslation (که فقط
// یه متنِ مشخص رو چک می‌کنه)، این یکی برای جستجو لازمه: تبِ مکالماتِ
// روزمره صدها خط داره که ترجمه‌شون به هر زبونی غیر از فارسی، فقط وقتی
// کاربر واقعاً اون سناریو رو باز کرده لحظه‌ای گرفته و همینجا (IndexedDB)
// کش شده؛ پس برای اینکه جستجو بتونه رویِ همون ترجمه‌های قبلاً کش‌شده هم
// جواب بده (بدونِ درخواستِ شبکه‌ی تازه برای هزاران خط)، یه‌بار کلِ کش رو
// برای همون زبان می‌خونیم و محلی فیلتر می‌کنیم.
export async function getCachedTranslationMap(targetLang, sourceLang = "en") {
  const map = new Map();
  try {
    const db = await openTranslationDB();
    return await new Promise((resolve) => {
      const prefix = `${sourceLang || "auto"}::${targetLang}::`;
      const tx = db.transaction(TRANSLATION_STORE, "readonly");
      const req = tx.objectStore(TRANSLATION_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(map); return; }
        const key = cursor.key;
        if (typeof key === "string" && key.startsWith(prefix)) {
          map.set(key.slice(prefix.length), cursor.value);
        }
        cursor.continue();
      };
      req.onerror = () => resolve(map);
    });
  } catch {
    return map;
  }
}
