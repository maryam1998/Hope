// ============================================================
// nativeAuth.js — ورود با گوگل داخل اپ اندروید (Capacitor)
//
// مشکل: توی اپ، ورود با گوگل مرورگر رو باز می‌کرد و بعد از ورود، کاربر
// به آدرسِ سایت (github.io) توی کروم برمی‌گشت، نه به اپ.
// راه‌حل: بعد از ورود، سوپابیس به آدرس com.linglearn.app://login-callback
// برمی‌گرده؛ اندروید اپ رو باز می‌کنه و BubblePlugin آدرس رو با رویداد
// «authCallback» به اینجا می‌فرسته و سشن همین‌جا ساخته می‌شه.
// توی مرورگرِ معمولی هیچ‌کدوم از این‌ها فعال نمی‌شه.
// ============================================================

export const NATIVE_AUTH_REDIRECT = "com.linglearn.app://login-callback";

// آدرسی که سوپابیس بعد از ورود بهش برمی‌گرده (توی لیست Redirect URLs هست: Hope/*).
// این صفحه توی مرورگر باز می‌شه و توکن‌ها رو با یک دکمه به اپ تحویل می‌ده.
export const WEB_HANDOFF_URL = "https://maryam1998.github.io/Hope/?from_app=1";

const getPlugin = () => {
  if (typeof window === "undefined") return null;
  const Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== "function") return null;
  if (!Cap.isNativePlatform()) return null;
  return (Cap.Plugins && Cap.Plugins.BubblePlugin) || null;
};

export function isNativeAuthAvailable() {
  const p = getPlugin();
  return !!(p && typeof p.openExternal === "function");
}

// شروع ورود با گوگل: آدرسِ ورود رو از سوپابیس می‌گیره و توی مرورگرِ سیستم باز می‌کنه.
export async function nativeGoogleSignIn(supabase) {
  const plugin = getPlugin();
  if (!plugin) throw new Error("native plugin not available");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: WEB_HANDOFF_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data || !data.url) throw new Error("no OAuth url");
  await plugin.openExternal({ url: data.url });
}

function parseCallback(url) {
  const out = {};
  if (!url) return out;
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const parts = [];
  if (queryIdx >= 0) parts.push(url.slice(queryIdx + 1, hashIdx > queryIdx ? hashIdx : undefined));
  if (hashIdx >= 0) parts.push(url.slice(hashIdx + 1));
  for (const part of parts) {
    for (const kv of part.split("&")) {
      if (!kv) continue;
      const i = kv.indexOf("=");
      const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      const v = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    }
  }
  return out;
}

// وقتی اپ از آدرسِ بازگشت باز شد، سشن رو می‌سازه. cleanup برمی‌گردونه.
export function setupNativeAuthListener(supabase, onError) {
  const plugin = getPlugin();
  if (!plugin || typeof plugin.addListener !== "function") return () => {};
  let handle = null;
  let cancelled = false;

  const onUrl = async (ev) => {
    const url = ev && ev.url;
    if (!url || url.indexOf(NATIVE_AUTH_REDIRECT) !== 0) return;
    try {
      const p = parseCallback(url);
      if (p.error || p.error_description) {
        throw new Error(p.error_description || p.error);
      }
      if (p.access_token && p.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: p.access_token,
          refresh_token: p.refresh_token,
        });
        if (error) throw error;
      } else if (p.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(p.code);
        if (error) throw error;
      }
    } catch (e) {
      if (typeof onError === "function") onError(e);
    }
  };

  try {
    const r = plugin.addListener("authCallback", onUrl);
    Promise.resolve(r).then((h) => {
      if (cancelled) { try { h && h.remove && h.remove(); } catch (_) {} }
      else handle = h;
    }).catch(() => {});
  } catch (_) {}

  return () => {
    cancelled = true;
    try { handle && handle.remove && handle.remove(); } catch (_) {}
  };
}



// نوارِ عیب‌یابیِ کوچک: فقط اسمِ پارامترها رو نشون می‌ده (نه مقدارِ توکن‌ها).
function showAuthDebugBanner() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (getPlugin()) return;
    const loc = window.location;
    const hashKeys = Object.keys(parseCallback("#" + (loc.hash || "").replace(/^#/, "")));
    const queryKeys = Object.keys(parseCallback("?" + (loc.search || "").replace(/^\?/, "")));
    const p = parseCallback(loc.href);
    const interesting =
      /[?&]from_app=1(&|$)/.test(loc.search || "") ||
      p.access_token || p.code || p.error || p.error_description;
    if (!interesting) return;
    const b = document.createElement("div");
    b.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#111;color:#0f0;" +
      "font:11px/1.5 monospace;padding:6px 8px;direction:ltr;text-align:left;word-break:break-all;";
    b.textContent =
      "[LL-auth v3] from_app=" + (/[?&]from_app=1(&|$)/.test(loc.search || "") ? "yes" : "no") +
      " | hash keys: " + (hashKeys.join(",") || "-") +
      " | query keys: " + (queryKeys.join(",") || "-") +
      (p.error || p.error_description ? " | error: " + (p.error_description || p.error) : "");
    b.onclick = () => { try { b.remove(); } catch (_) {} };
    document.body.appendChild(b);
    setTimeout(() => { try { b.remove(); } catch (_) {} }, 120000);
  } catch (_) {}
}

// ------------------------------------------------------------
// سمتِ مرورگر (نه داخل اپ): وقتی بعد از ورود با گوگل به
// .../Hope/?from_app=1 برمی‌گردیم، یک صفحه‌ی تمام‌صفحه نشون می‌دیم که
// توکن‌ها رو با deep link به اپ تحویل می‌ده. این کد قبل از ساخته شدنِ
// کلاینتِ سوپابیس اجرا می‌شه، پس هش (#access_token=...) هنوز دست‌نخورده‌ست.
// ------------------------------------------------------------
(function showAppHandoffIfNeeded() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (getPlugin()) return; // داخل خودِ اپ نیازی نیست
    showAuthDebugBanner();
    const loc = window.location;
    if (!/[?&]from_app=1(&|$)/.test(loc.search || "")) return;

    const hash = loc.hash || "";
    let payload = "";
    if (hash.length > 1) {
      payload = hash;
    } else {
      const q = (loc.search || "")
        .replace(/^\?/, "")
        .split("&")
        .filter((x) => x && x.indexOf("from_app=") !== 0)
        .join("&");
      if (q) payload = "?" + q;
    }

    const params = parseCallback(loc.href);
    const hasTokens = !!(params.access_token || params.code);
    const errText = params.error_description || params.error || "";

    const box = document.createElement("div");
    box.setAttribute("dir", "rtl");
    box.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#f4e8d6;color:#3b2a1e;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:18px;padding:24px;text-align:center;font-family:Vazirmatn,system-ui,sans-serif;";

    const msg = document.createElement("div");
    msg.style.cssText = "font-size:18px;font-weight:700;line-height:1.8;";

    if (hasTokens) {
      const target = NATIVE_AUTH_REDIRECT + payload;
      msg.textContent = "ورود با گوگل انجام شد. برای برگشتن به اپ دکمه‌ی زیر را بزنید.";
      const a = document.createElement("a");
      a.href = target;
      a.textContent = "بازگشت به اپ LingoLearn";
      a.style.cssText =
        "display:inline-block;padding:16px 28px;border-radius:999px;background:#4a7c6f;" +
        "color:#fff;font-size:18px;font-weight:700;text-decoration:none;";
      box.appendChild(msg);
      box.appendChild(a);
      document.body.appendChild(box);
      setTimeout(() => { try { window.location.href = target; } catch (_) {} }, 400);
    } else {
      msg.textContent = errText
        ? "ورود انجام نشد: " + errText
        : "اطلاعات ورود پیدا نشد. دوباره از داخل اپ امتحان کنید.";
      box.appendChild(msg);
      document.body.appendChild(box);
    }
  } catch (_) {}
})();
