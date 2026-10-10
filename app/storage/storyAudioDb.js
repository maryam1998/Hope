// ذخیره‌ی صدای داستان (IndexedDB)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ============================================================
// صوتِ خودِ کاربر برای داستان‌ها — کاربر یک فایلِ صوتیِ واقعی (ضبط/آپلود)
// رو به یک داستان وصل می‌کنه؛ خودِ فایل (Blob) و تایم‌استمپِ هر جمله
// (که با «حالتِ علامت‌گذاری» دستی مشخص می‌شه) کاملاً روی خودِ گوشی، توی
// IndexedDB ذخیره می‌مونه — هیچ‌وقت به Supabase یا هیچ سروری فرستاده
// نمی‌شه.
// ============================================================
const STORY_AUDIO_DB_NAME = "story-user-audio";
const STORY_AUDIO_STORE = "audio";
// استورِ جدا برای زمان‌بندیِ جمله‌ها (pi-si -> ثانیه) — عمداً از خودِ فایلِ
// صوتی (که می‌تونه چندصد مگابایت باشه) جدا نگه داشته شده. اگه این زمان‌ها رو
// داخلِ همون رکوردِ blob می‌ذاشتیم، هر بار «سینک‌کردنِ» یه جمله باعثِ
// نوشتنِ دوباره‌ی کلِ فایلِ صوتیِ حجیم روی IndexedDB می‌شد — که خودش دقیقاً
// همون کندی‌ای رو ایجاد می‌کرد که می‌خواستیم رفعش کنیم.
const STORY_AUDIO_META_STORE = "meta";
function openStoryAudioDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const req = indexedDB.open(STORY_AUDIO_DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORY_AUDIO_STORE)) {
        db.createObjectStore(STORY_AUDIO_STORE);
      }
      if (!db.objectStoreNames.contains(STORY_AUDIO_META_STORE)) {
        db.createObjectStore(STORY_AUDIO_META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
// record شکل: { blob: Blob, savedAt }
export async function saveStoryAudioRecord(storyKey, record) {
  try {
    const db = await openStoryAudioDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORY_AUDIO_STORE, "readwrite");
      tx.objectStore(STORY_AUDIO_STORE).put(record, storyKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}
export async function getStoryAudioRecord(storyKey) {
  try {
    const db = await openStoryAudioDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORY_AUDIO_STORE, "readonly");
      const req = tx.objectStore(STORY_AUDIO_STORE).get(storyKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
export async function deleteStoryAudioRecord(storyKey) {
  try {
    const db = await openStoryAudioDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORY_AUDIO_STORE, "readwrite");
      tx.objectStore(STORY_AUDIO_STORE).delete(storyKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
  await deleteStoryAudioTimestamps(storyKey);
}
// سیستمِ سینکِ دقیقِ pi-si -> ثانیه حذف شد (قابلِ‌اعتماد نبود). این تابع
// فقط برای پاک‌کردنِ دیتایِ قدیمیِ باقی‌مانده از نسخه‌های قبلی نگه داشته
// شده — جایی که صوتِ یه داستان کاملاً حذف می‌شه (deleteStoryAudioRecord).
async function deleteStoryAudioTimestamps(storyKey) {
  try {
    const db = await openStoryAudioDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORY_AUDIO_META_STORE, "readwrite");
      tx.objectStore(STORY_AUDIO_META_STORE).delete(storyKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}
