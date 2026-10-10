// تماس با Worker/AI
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { loadAppPrefs } from "../prefs/appPrefs.js";

//     User → React App (this file) → Cloudflare Worker (src/index.js) → AI provider
// The frontend NEVER talks to an AI provider directly and never holds an
// API key. It only calls this one backend endpoint (POST /api/generate).
// Which actual AI provider answers (with automatic fallback between them)
// is decided entirely on the Worker via AI_PROVIDER — see src/index.js.
//
// The backend URL is configurable per-device (Settings box in Story Builder,
// wired through `aiSettings.backendUrl`) but defaults to DEFAULT_BACKEND_URL
// below — replace that with your own Worker URL once it's deployed.
// ---------------------------------------------------------------------------
export const DEFAULT_BACKEND_URL = "https://phrasebook-api.maryam-s-sharifiyan.workers.dev";
// پیامِ یکدستِ «هوش مصنوعی گیر کرد» — برایِ همه‌جا (timeout / قطعیِ اینترنت / خطایِ سرور /
// پاسخِ خالی). جزئیاتِ فنیِ خطا فقط تویِ console می‌ماند.
export function aiNetMsg() {
  let en = false;
  try { en = loadAppPrefs().uiLang === "en"; } catch (e) {}
  return en
    ? "The AI isn't responding. Check your internet connection and try again."
    : "هوش مصنوعی جواب نداد. اینترنتت رو چک کن و دوباره امتحان کن.";
}
export async function callAI({ prompt, maxTokens, retries = 2, aiSettings, timeoutMs = 10000 }) {
  const base = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
  const body = JSON.stringify({
    prompt,
    // قبلاً اینجا هر درخواستی، حتی یه ترجمه‌ی کوچیک با maxTokens:200، به‌زور
    // به حداقل ۱۰۰۰ توکن گرد می‌شد (Math.max(maxTokens || 1000, 1000)) — یعنی
    // داشتیم بدون دلیل سهمیه‌ی «توکن در دقیقه»ی رایگانِ Groq (که این خطاها
    // ازش میان) رو خیلی سریع‌تر از چیزی که واقعاً لازم بود مصرف می‌کردیم. حالا
    // دقیقاً همون مقداری که خودِ تابع خواسته می‌فرستیم (با یه کف خیلی کوچیک
    // فقط برای جلوگیری از صفر/منفی، نه یه کفِ مصنوعیِ ۱۰۰۰تایی).
    maxTokens: Math.min(Math.max(maxTokens || 300, 64), 8192),
  });

  for (let attempt = 0; ; attempt++) {
    try {
      // ⛔️ قبلاً این fetch هیچ timeoutـی نداشت — اگه سرور بی‌صدا (نه با خطای
      // فوری، بلکه سکوتِ کامل) بلاک/غیرقابل‌دسترس بود، این Promise تا ابد
      // آویزون می‌موند و کل زنجیره‌ی ترجمه (که به‌عنوان آخرین fallback به
      // اینجا می‌رسه) رو برای همیشه معطل می‌کرد. حالا مثلِ fetchWithTimeout
      // بالا، با AbortController یه سقفِ ۱۰ثانیه‌ای داره.
      const aiController = new AbortController();
      const aiTimer = setTimeout(() => aiController.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(`${base}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: aiController.signal,
        });
      } finally {
        clearTimeout(aiTimer);
      }
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        // ۴۲۹ (Too Many Requests) فنی جزو «خطاهای کلاینت»ه، ولی برخلاف ۴۰۰/۴۰۱
        // که تکرارش بی‌فایده‌ست، ۴۲۹ دقیقاً یعنی «صبر کن و دوباره امتحان کن» —
        // خودِ پیام خطای Groq هم صراحتاً همینو می‌گه («Please try again in
        // 18.02s»). قبلاً این حالت رتراى نمی‌شد و همون خطای خام تا رو صفحه
        // بالا می‌اومد؛ حالا آن را retryable در نظر می‌گیریم.
        const isRateLimited = res.status === 429;
        const isClientError = res.status >= 400 && res.status < 500 && !isRateLimited;
        try {
          const errBody = await res.json();
          detail = errBody.error || detail;
        } catch (_) {
          // response wasn't JSON — keep the HTTP status as the detail
        }
        if ((!isClientError || isRateLimited) && attempt < Math.max(retries, isRateLimited ? 1 : retries)) {
          // اگه پیام خطا خودش عدد ثانیه رو داده («try again in 18.02s»)، دقیقاً
          // همون‌قدر (+ یه کم حاشیه‌ی امن) صبر می‌کنیم؛ وگرنه چون سقفِ Groq
          // روی «توکن در دقیقه»ست، یه تأخیر امن‌ترِ ۱۵ ثانیه‌ای در نظر می‌گیریم
          // — تأخیر کوتاهِ معمولیِ ۷۰۰ میلی‌ثانیه برای این نوع خطا کافی نیست.
          const retrySecondsMatch = detail.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
          const waitMs = isRateLimited
            ? Math.ceil((retrySecondsMatch ? parseFloat(retrySecondsMatch[1]) : 15) * 1000) + 500
            : 700 * (attempt + 1);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        console.warn("[callAI] server error:", detail);
        throw new Error(`ai-backend-error: ${(res.status >= 500 || isRateLimited) ? aiNetMsg() : detail}`);
      }
      const data = await res.json();
      const text = data.text || "";
      if (!text) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
          continue;
        }
        throw new Error(`ai-backend-error: ${aiNetMsg()}`);
      }
      return text;
    } catch (e) {
      const msg = String(e?.message || "");
      const isKnownServerError = msg.startsWith("ai-backend-error:");
      const isNetworkFailure = e instanceof TypeError; // fetch() throws TypeError on network/CORS failure
      const isTimeout = e?.name === "AbortError" || e?.name === "TimeoutError";
      if (!isKnownServerError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      if (isKnownServerError) throw e;
      console.warn("[callAI] failed:", e);
      throw new Error(
        (isTimeout || isNetworkFailure)
          ? `ai-backend-error: ${aiNetMsg()}`
          : `ai-backend-error: ${msg || aiNetMsg()}`
      );
    }
  }
}
