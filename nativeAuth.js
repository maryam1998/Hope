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
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
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
