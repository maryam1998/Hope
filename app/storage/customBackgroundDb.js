// پس‌زمینه‌ی سفارشی (IndexedDB)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ============================================================
// پس‌زمینه‌ی سفارشیِ اپ (عکسِ دلخواهِ کاربر برای زمینه‌ی کلِ برنامه) —
// توی IndexedDB ذخیره می‌شه (نه localStorage)، چون می‌تونه چند مگابایت
// باشه؛ فقط رویِ همین گوشی/مرورگر می‌مونه، هیچ‌وقت به Supabase یا جایِ
// دیگه‌ای فرستاده نمی‌شه. یه رکوردِ تکی با کلیدِ ثابتِ "current" کافیه —
// آپلودِ بعدی همیشه جایگزینِ قبلی می‌شه.
// ============================================================
const CUSTOM_BG_DB_NAME = "app-custom-background";
const CUSTOM_BG_STORE = "bg";
const CUSTOM_BG_KEY = "current";
// فرمت‌هایِ عکسِ قابل‌قبول برایِ پس‌زمینه
export const CUSTOM_BG_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
function openCustomBgDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const req = indexedDB.open(CUSTOM_BG_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_BG_STORE)) {
        db.createObjectStore(CUSTOM_BG_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
// رکورد: { blob: Blob, type: string, savedAt: number }
export async function saveCustomBackground(blob, type) {
  try {
    const db = await openCustomBgDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readwrite");
      tx.objectStore(CUSTOM_BG_STORE).put({ blob, type, savedAt: Date.now() }, CUSTOM_BG_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}
export async function getCustomBackground() {
  try {
    const db = await openCustomBgDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readonly");
      const req = tx.objectStore(CUSTOM_BG_STORE).get(CUSTOM_BG_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
export async function deleteCustomBackground() {
  try {
    const db = await openCustomBgDB();
    await new Promise((resolve) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readwrite");
      tx.objectStore(CUSTOM_BG_STORE).delete(CUSTOM_BG_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    return true;
  } catch {
    return false;
  }
}
