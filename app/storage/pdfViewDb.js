// ذخیره‌ی PDF و صفحه‌ها (IndexedDB)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ============================================================
// ذخیره‌سازیِ دائمیِ «نمایشِ PDF» (عکسِ اصلیِ هر صفحه + ترجمه) در
// IndexedDBِ خودِ گوشی/مرورگر — تا کاربر مجبور نباشه هر بار که اپ رو
// می‌بنده/رفرش می‌کنه، دوباره همون فایل رو آپلود و ترجمه کنه. هر صفحه
// به‌صورتِ جدا ذخیره می‌شه (نه یک رکوردِ بزرگِ شاملِ همه‌ی صفحات)، دقیقاً
// برای این‌که بشه صفحه‌به‌صفحه که آماده شد فوراً سِیوش کرد — بدونِ صبر
// برای پردازشِ کلِ فایل — و موقعِ باز کردنِ دوباره هم لازم نیست همه‌چیز
// یک‌جا تو حافظه بیاد.
// ============================================================
const PDF_VIEW_DB_NAME = "pdf-view-documents";
const PDF_VIEW_META_STORE = "meta"; // { id, title, pageCount, doneCount, createdAt }
const PDF_VIEW_PAGE_STORE = "pages"; // key: `${docId}::${pageNum}` -> { pageNum, originalText, translatedText } (فرمتِ قدیمی‌تر ممکنه imageBlob/width/height هم داشته باشه)
// 🆕 بایتِ خامِ خودِ فایلِ PDF (نه عکسِ از پیش‌رندرشده‌ی هر صفحه) — تا
// موقعِ نمایش، هر صفحه با pdf.js همون لحظه زنده رندر بشه (مثلِ یه ویووِرِ
// واقعیِ PDF، با لایه‌ی متنِ قابلِ‌سلکت)، نه یک عکسِ ثابتِ از پیش‌ساخته.
const PDF_VIEW_FILE_STORE = "files"; // key: docId -> ArrayBuffer
// 🩹 قبلاً همیشه با نسخه‌ی ثابتِ ۱ باز می‌شد: indexedDB.open(NAME, 1). اگه
// دیتابیسِ واقعیِ رویِ گوشیِ کاربر، به هر دلیلِ تاریخی‌ای (مثلاً نسخه‌ی
// قدیمی‌ترِ همینِ اپ که یه زمانی این DB رو با نسخه‌ی بالاتر باز/ارتقا داده
// بود)، از قبل نسخه‌ای بالاتر از ۱ داشت، خودِ indexedDB.open(NAME, 1)
// بلافاصله با VersionError رد می‌شد — نه فقط یه نوشتن، بلکه اصلِ بازکردنِ
// دیتابیس. یعنی هیچ صفحه‌ای هیچ‌وقت واقعاً ذخیره نمی‌شد، برای هر PDFِ
// جدیدی که آپلود می‌شد (نه فقط قدیمی‌ها) — دقیقاً همون چیزی که کاربر دید.
// فیکس: دیگه نسخه رو حدس نمی‌زنیم. اول بدونِ مشخص‌کردنِ نسخه باز می‌کنیم
// (که با هر نسخه‌ای که همین الان واقعاً رویِ دستگاهه باز می‌شه، هرچی که
// باشه)، و فقط اگه استورهای لازم رو نداشت، با یه نسخه‌ی بالاتر ارتقاش
// می‌دیم. این‌جوری دیگه هیچ عددِ ثابتی نمی‌تونه با واقعیتِ رویِ گوشی تداخل
// کنه.
function openPdfViewDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const probeReq = indexedDB.open(PDF_VIEW_DB_NAME);
    probeReq.onerror = () => reject(probeReq.error);
    probeReq.onsuccess = () => {
      const probeDb = probeReq.result;
      const hasStores =
        probeDb.objectStoreNames.contains(PDF_VIEW_META_STORE) &&
        probeDb.objectStoreNames.contains(PDF_VIEW_PAGE_STORE) &&
        probeDb.objectStoreNames.contains(PDF_VIEW_FILE_STORE);
      if (hasStores) {
        resolve(probeDb);
        return;
      }
      const nextVersion = probeDb.version + 1;
      probeDb.close();
      const upgradeReq = indexedDB.open(PDF_VIEW_DB_NAME, nextVersion);
      upgradeReq.onupgradeneeded = () => {
        const db = upgradeReq.result;
        if (!db.objectStoreNames.contains(PDF_VIEW_META_STORE)) {
          db.createObjectStore(PDF_VIEW_META_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(PDF_VIEW_PAGE_STORE)) {
          db.createObjectStore(PDF_VIEW_PAGE_STORE);
        }
        if (!db.objectStoreNames.contains(PDF_VIEW_FILE_STORE)) {
          db.createObjectStore(PDF_VIEW_FILE_STORE);
        }
      };
      upgradeReq.onsuccess = () => resolve(upgradeReq.result);
      upgradeReq.onerror = () => reject(upgradeReq.error);
    };
  });
}
export async function savePdfViewMeta(meta) {
  try {
    const db = await openPdfViewDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_VIEW_META_STORE, "readwrite");
      tx.objectStore(PDF_VIEW_META_STORE).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch (err) {
    // 🩹 قبلاً فقط false برمی‌گشت — یعنی هیچ‌جا معلوم نمی‌شد واقعاً چرا
    // نوشتن شکست خورده (پُر بودنِ فضا؟ حالتِ خصوصی؟ چیزِ دیگه؟). حالا
    // نامِ خودِ خطای مرورگر (مثلاً QuotaExceededError) هم برگردونده می‌شه
    // تا بشه مستقیم تو پیامِ روی صفحه نشونش داد — بدونِ نیاز به کنسولِ
    // دیباگ که رو موبایل اصلاً در دسترس نیست.
    return { ok: false, errorName: err?.name || String(err) };
  }
}
export async function savePdfViewPage(docId, page) {
  try {
    const db = await openPdfViewDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_VIEW_PAGE_STORE, "readwrite");
      tx.objectStore(PDF_VIEW_PAGE_STORE).put(page, `${docId}::${page.pageNum}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, errorName: err?.name || String(err) };
  }
}
// 🆕 ذخیره/بازخوانیِ بایتِ خامِ خودِ فایلِ PDF — تا در بازکردنِ بعدی، بشه
// همون فایلِ اصلی رو دوباره با pdf.js باز کرد و صفحه‌ها رو زنده (نه از
// روی عکسِ ثابت) رندر کرد.
export async function savePdfViewFile(docId, arrayBuffer) {
  try {
    const db = await openPdfViewDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_VIEW_FILE_STORE, "readwrite");
      tx.objectStore(PDF_VIEW_FILE_STORE).put(arrayBuffer, docId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, errorName: err?.name || String(err) };
  }
}
export async function loadPdfViewFile(docId) {
  try {
    const db = await openPdfViewDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(PDF_VIEW_FILE_STORE, "readonly");
      const req = tx.objectStore(PDF_VIEW_FILE_STORE).get(docId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
export async function listPdfViewDocs() {
  try {
    const db = await openPdfViewDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(PDF_VIEW_META_STORE, "readonly");
      const req = tx.objectStore(PDF_VIEW_META_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
export async function loadPdfViewPages(docId, pageCount) {
  try {
    const db = await openPdfViewDB();
    const pages = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await new Promise((resolve) => {
        const tx = db.transaction(PDF_VIEW_PAGE_STORE, "readonly");
        const req = tx.objectStore(PDF_VIEW_PAGE_STORE).get(`${docId}::${i}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (page) pages.push(page);
    }
    return pages;
  } catch {
    return [];
  }
}
export async function deletePdfViewDoc(docId, pageCount) {
  try {
    const db = await openPdfViewDB();
    await new Promise((resolve) => {
      const tx = db.transaction([PDF_VIEW_META_STORE, PDF_VIEW_PAGE_STORE, PDF_VIEW_FILE_STORE], "readwrite");
      tx.objectStore(PDF_VIEW_META_STORE).delete(docId);
      const pageStore = tx.objectStore(PDF_VIEW_PAGE_STORE);
      for (let i = 1; i <= pageCount; i++) pageStore.delete(`${docId}::${i}`);
      tx.objectStore(PDF_VIEW_FILE_STORE).delete(docId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}
// 🩹 تخمینِ فضای ذخیره‌سازیِ مرورگر (چقدر استفاده شده از چقدر مجاز) — برای
// اینکه وقتی نوشتن تو IndexedDB شکست می‌خوره، بشه دقیقاً نشون داد آیا
// واقعاً فضا پُر شده یا دلیلِ دیگه‌ای داشته (مثلاً حالتِ خصوصی). خیلی از
// مرورگرهای موبایل این API رو دارن؛ اگه نداشت، بی‌صدا null برمی‌گردونه —
// نبودنِ این اطلاعات نباید کلِ فرآیندِ آپلود رو خراب کنه.
export async function estimatePdfViewStorage() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== "number" || typeof quota !== "number" || !quota) return null;
    return { usageMB: Math.round(usage / (1024 * 1024)), quotaMB: Math.round(quota / (1024 * 1024)), pct: Math.round((usage / quota) * 100) };
  } catch {
    return null;
  }
}
