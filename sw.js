// هر بار که دیپلوی جدید می‌کنی، این عدد رو یکی زیاد کن (v1 -> v2 -> v3 -> ...).
// این کار باعث می‌شه یه کشِ کاملاً تازه ساخته بشه و مطمئن باشی چیزی از
// نسخه‌ی قبلی باقی نمونده — even اگه به هر دلیلی یه فایل قدیمی جا بمونه.
// همچنین چون خودِ محتوای این فایل عوض می‌شه، مرورگر متوجهِ نسخه‌ی جدید
// می‌شه و چرخه‌ی install/activate رو اجرا می‌کنه (وگرنه اگه byte-به-byte
// با نسخه‌ی قبلی یکی باشه، اصلاً آپدیت رو تشخیص نمی‌ده).
const CACHE_VERSION = "v402";
const CACHE_NAME = `phrasebook-cache-${CACHE_VERSION}`;
const LIB_CACHE = "fb-sync-lib"; // دائمی: در activate پاک نمی‌شه

const APP_SHELL = ["./", "./index.html", "./app.bundle.min.js", "./tailwind.css", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k.startsWith("phrasebook-cache-")).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// همه‌ی درخواست‌های هم‌مبدأ (خودِ سایت: HTML/JS/JSON — چه خودِ باندل باشه چه
// فایل‌های دیتا مثل DAILY_WORDS.js) رو «شبکه اول» می‌گیریم. فایل‌های خارجی
// (فونت گوگل، کتابخونه‌های CDN مثل esm.sh) که به‌ندرت عوض می‌شن رو
// «کش اول» می‌گیریم تا هم سریع باز بشن هم دیتا مصرف نکنن.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // فایل‌های بسته‌ی همگام‌سازی حجیم‌ان و کشِ خودشون رو دارن؛ از دستِ کشِ برنامه دورشون نگه می‌داریم.
  if (!isSameOrigin) {
    const h = url.hostname;
    const skip = [atob("aHVnZ2luZ2ZhY2UuY28="), atob("aGYuY28=")];
    if (skip.some((x) => h === x || h.endsWith("." + x))) return;
    // کتابخونه‌ی همگام‌سازی (اسکریپت + wasm) در یک کشِ دائمی که با آپدیتِ نسخه پاک نمی‌شه،
    // تا بعد از یک‌بار دانلود، بدونِ اینترنت هم کار کنه.
    if (h === "cdn.jsdelivr.net") {
      event.respondWith(
        caches.open(LIB_CACHE).then((c) =>
          c.match(req).then(
            (hit) =>
              hit ||
              fetch(req).then((res) => {
                if (res && res.ok) c.put(req, res.clone()).catch(() => {});
                return res;
              })
          )
        )
      );
      return;
    }
  }

  if (isSameOrigin) {
    event.respondWith(
      // { cache: "no-store" } یعنی خودِ fetch هم از کشِ HTTP دیسکِ مرورگر
      // رد بشه و واقعاً بره سراغ شبکه — این همون قسمتیه که قبلاً نبود و
      // باعث می‌شد با اینکه sw «شبکه اول» می‌نوشت، مرورگر بازم یه نسخه‌ی
      // کش‌شده‌ی قدیمی رو از دیسک برگردونه.
      fetch(req, { cache: "no-store" })
        .then((res) => {
          // فقط درخواست‌های GET رو تو Cache Storage بذار — cache.put روی
          // POST/PUT و... خطا می‌ده (مثلاً درخواست‌های Supabase).
          if (req.method === "GET") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
