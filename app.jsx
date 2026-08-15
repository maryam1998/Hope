import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Star, MessageCircle, RotateCcw, Repeat, Send, Check, X, BookOpen, Heart, Search, Volume2, Newspaper, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Wand2, Menu, Palette, Type, Trash2, PlayCircle, Gauge, Layers, Coffee, CheckSquare, Copy } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { VOCAB } from "./VOCAB.js";
import { WORDS_AZ } from "./WORDS_AZ.js";
import { NEWS_WORDS } from "./NEWS_WORDS.js";
import { DAILY_WORDS } from "./DAILY_WORDS.js";
import { DAILY_CONVERSATIONS } from "./DAILY_CONVERSATIONS.js";
import DailyConversationsTab from "./DailyConversationsTab.jsx";

// ---------------------------------------------------------------------------
// ردیابِ خوانش، سرتاسریِ اپ: کلمه‌ای که همین الان داره خونده می‌شه، به‌جای
// یه خط زیرش، خودش یه سایه‌ی نرم می‌گیره (box-shadow). همون منطقی که تبِ
// «مکالمه و روزمره» استفاده می‌کنه (DailyConversationsTab.jsx)، اینجا هم
// برای بقیه‌ی تب‌هایی که متن رو کلمه‌به‌کلمه دنبال می‌کنن (لغات، لغات و
// اخبار، داستان‌ساز) به‌کار می‌ره.
function tokenizeWords(text) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text || "")) !== null) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

function findActiveWordIndex(words, offset) {
  for (let i = 0; i < words.length; i++) {
    if (offset >= words[i].start && offset < words[i].end) return i;
  }
  for (let i = words.length - 1; i >= 0; i--) {
    if (offset >= words[i].start) return i;
  }
  return 0;
}

const ACTIVE_WORD_STYLE = {
  position: "relative",
  borderRadius: 5,
  padding: "1px 4px",
  margin: "-1px -4px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18)",
  transition: "box-shadow .15s ease",
};

// نسخه‌ی «ردیاب‌دار» یه متن: هر کلمه یه span مجزاست، و فقط کلمه‌ای که
// همین الان در حالِ خونده‌شدنه سایه می‌گیره.
function WordTrackedText({ text, relOffset, fontFamily, fontSize, fontWeight, color }) {
  const words = useMemo(() => tokenizeWords(text), [text]);
  const activeIdx = findActiveWordIndex(words, relOffset);

  return (
    <span style={{ fontFamily, fontSize, fontWeight, color }}>
      {words.map((w, i) => (
        <span key={i} style={i === activeIdx ? ACTIVE_WORD_STYLE : undefined}>
          {w.text}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// جستجوی یکپارچه‌ی «یا از دیکشنری جستجو کن...» توی داستان‌ساز — به‌جای
// این‌که فقط تو VOCAB (لیست محدودِ چندزبانه) بگرده، باید بتونه از تبِ
// «لغات» (WORDS_AZ)، «لغات و اخبار» (NEWS_WORDS)، «مکالمه و روزمره»
// (DAILY_WORDS) و «مکالمات روزمره» (DAILY_CONVERSATIONS) هم لغت/عبارت پیدا
// کنه. این آرایه‌های مسطح‌شده فقط یه‌بار موقع بارگذاریِ اپ ساخته می‌شن (نه
// هر رندرِ داستان‌ساز) تا جستجو سنگین نشه.
const STORY_SEARCH_WORD_POOL = [
  ...WORDS_AZ.map((w) => ({ term: w.en, fa: w.fa, source: "لغات" })),
  ...NEWS_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "لغات و اخبار" })),
  ...DAILY_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "مکالمه و روزمره" })),
];
// همه‌ی خط‌های دوطرفِ مکالمه‌های روزمره، مسطح‌شده به یه آرایه‌ی ساده — تا
// کاربر بتونه یه عبارتِ کاملِ یه مکالمه رو هم به‌عنوان لغتِ هدفِ داستان
// انتخاب کنه، نه فقط تک‌کلمه‌ها.
const STORY_SEARCH_CONVERSATION_POOL = DAILY_CONVERSATIONS.flatMap((tp) =>
  tp.scenarios.flatMap((sc) => [...(sc.speakerA || []), ...(sc.speakerB || [])])
).map((it) => ({ term: it.en, fa: it.fa || "", source: "مکالمات روزمره" }));

// ---------------------------------------------------------------------------
// SUPABASE — real accounts (email/password + Google) and cross-device sync.
// این‌جا واقعاً به پروژه‌ی Supabase وصل می‌شیم؛ دیگه هیچ حساب یا داده‌ای فقط
// محلی/ساختگی نیست. برای فعال‌سازی ورود با گوگل هم باید تو داشبورد Supabase
// (نه فقط گوگل کنسول) این مسیر رو انجام بدی:
//   Authentication → Sign In / Providers → Google → روشنش کن و
//   Client ID و Client Secret که از Google Cloud Console گرفتی رو بذار.
// و تو Google Cloud Console، زیر همون OAuth Client، این آدرس رو به
// "Authorized redirect URIs" اضافه کن (Supabase خودش تو همون صفحه‌ی
// Providers این آدرس رو بهت نشون می‌ده تا کپی کنی):
//   https://avfceytrbmsdkuyppspp.supabase.co/auth/v1/callback
// و تو Supabase، زیر Authentication → URL Configuration → Site URL / Redirect
// URLs، آدرس واقعی سایتت رو اضافه کن (مثلاً https://maryam1998.github.io/Hope/)
// وگرنه بعد از ورود با گوگل به آدرس اشتباهی برمی‌گردی.
// ---------------------------------------------------------------------------
const SUPABASE_URL = "https://avfceytrbmsdkuyppspp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmNleXRyYm1zZGt1eXBwc3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjMwNDUsImV4cCI6MjEwMTQ5OTA0NX0.IYyNpcznb3g2zdruLn2XSlVHFtDK4OQPm0RIOcIBNhE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ورودی/خروجی سازگار با بقیه‌ی اپ: { uid, email, name, picture, provider }
function supabaseUserToSession(su) {
  if (!su) return null;
  const meta = su.user_metadata || {};
  return {
    uid: su.id,
    email: su.email,
    name: meta.name || meta.full_name || su.email,
    picture: meta.avatar_url || meta.picture || "",
    provider: meta.provider_source || (su.app_metadata?.provider === "google" ? "google" : "email"),
  };
}

// جدول: user_data (user_id uuid primary key references auth.users, data jsonb, updated_at timestamptz)
// با RLS که هر کاربر فقط ردیف خودش رو بخونه/بنویسه — SQL لازمش رو جدا فرستادم.
async function supabaseLoadState(uid) {
  if (!uid) return null;
  try {
    const { data, error } = await supabase.from("user_data").select("data").eq("user_id", uid).maybeSingle();
    if (error || !data) return null;
    return data.data || null;
  } catch (e) {
    return null; // آفلاین یا جدول هنوز ساخته نشده — نسخه‌ی محلی همچنان کار می‌کنه
  }
}

async function supabaseSaveState(uid, data) {
  if (!uid) return;
  try {
    await supabase.from("user_data").upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
  } catch (e) {
    // ذخیره‌ی ابری ناموفق بود — نسخه‌ی محلی (localStorage) هنوز سِیو شده
  }
}

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

async function getCachedTranslation(text, targetLang, sourceLang = "auto") {
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

async function setCachedTranslation(text, targetLang, sourceLang, translation) {
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

async function getTranslationCacheCount() {
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

// ============================================================
// ترجمه رایگان با چند سرویس پشت‌سرهم (بدون نیاز به کلید API)
// اگه سرویس اول جواب نده یا خطا بده، خودکار میره سراغ سرویس بعدی.
// ترتیب: Google Translate (بدون‌رسمی) → MyMemory → Lingva (پروکسی گوگل) → LibreTranslate
// ============================================================

// ۱) Google Translate — همون endpoint قدیمی و رایگان
async function translateViaGoogle(text, targetLang, sourceLang = "auto") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("google-http-" + response.status);
  const data = await response.json();
  if (data && data[0] && data[0].length) {
    return data[0].map((item) => item[0]).join("");
  }
  throw new Error("google-empty-response");
}

// ۲) MyMemory — کاملاً رایگان و بدون کلید، محدودیت روزانه دارد ولی جای خوبی برای fallback است
async function translateViaMyMemory(text, targetLang, sourceLang = "auto") {
  // MyMemory زبان مبدا "auto" را نمی‌شناسد؛ اگر مشخص نبود انگلیسی را حدس می‌زنیم
  const sl = sourceLang && sourceLang !== "auto" ? sourceLang : "en";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetLang}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("mymemory-http-" + response.status);
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("mymemory-empty-response");
  // MyMemory به‌جای خطای واقعی، بعضی وقت‌ها یه پیام متنی مثل
  // "PLEASE SELECT TWO DISTINCT LANGUAGES." یا "INVALID ..." برمی‌گردونه —
  // این‌ها ترجمه نیستن، پیام خطای خودِ سرویس‌ان؛ باید به‌عنوان شکست تلقی بشن
  // تا زنجیره‌ی fallback بره سراغ سرویس بعدی.
  const looksLikeApiError = /^(PLEASE SELECT|INVALID |NO TRANSLATION|AMOUNT OF WORDS)/i.test(translated.trim());
  if (looksLikeApiError) throw new Error("mymemory-api-error: " + translated);
  return translated;
}

// ۳) Lingva Translate — یک پروکسی متن‌باز و رایگان جلوی Google Translate
async function translateViaLingva(text, targetLang, sourceLang = "auto") {
  const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("lingva-http-" + response.status);
  const data = await response.json();
  if (!data?.translation) throw new Error("lingva-empty-response");
  return data.translation;
}

// ۴) LibreTranslate — سرویس متن‌باز رایگان (نمونه‌ی عمومی)
async function translateViaLibre(text, targetLang, sourceLang = "auto") {
  const response = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: sourceLang || "auto", target: targetLang, format: "text" }),
  });
  if (!response.ok) throw new Error("libre-http-" + response.status);
  const data = await response.json();
  if (!data?.translatedText) throw new Error("libre-empty-response");
  return data.translatedText;
}

// ۵) آخرین راه‌حل: از همون بک‌اند AI خودِ اپ (Cloudflare Worker) بخوایم ترجمه
// کنه. برخلاف ۴ سرویس بالا (که مستقیماً از مرورگر به سرورهای خارجی وصل
// می‌شن و بسته به شبکه/ISP کاربر ممکنه فیلتر یا بلاک باشن)، این یکی از
// همون Worker همیشه‌دردسترسِ خودِ اپ رد می‌شه — پس اگه AI برای بقیه‌ی
// بخش‌های اپ (مثل ساخت داستان) کار می‌کنه، این هم کار می‌کنه.
async function translateViaAI(text, targetLang, sourceLang, aiSettings) {
  if (!aiSettings) throw new Error("translate-ai-no-settings");
  const targetLabel = (typeof LANGUAGES !== "undefined" && LANGUAGES.find((l) => l.code === targetLang)?.label) || targetLang;
  const prompt =
    `Translate the following text into ${targetLabel}. ` +
    `Respond with ONLY the translation itself — no quotes, no explanation, no original text, nothing else.\n\n` +
    `Text: ${text}`;
  const result = await callAI({ prompt, maxTokens: 200, retries: 1, aiSettings });
  const cleaned = String(result || "").replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
  if (!cleaned) throw new Error("translate-ai-empty-response");
  return cleaned;
}

// تابع اصلی: هر سرویس رو به‌ترتیب امتحان می‌کنه، به محض موفقیت نتیجه رو برمی‌گردونه.
// اگه همه شکست خوردن، متن اصلی بدون تغییر برگردونده می‌شه (تا برنامه از کار نیفته).
async function translateFree(text, targetLang, sourceLang = "auto", aiSettings = null) {
  if (!text || !targetLang) return text;
  // اگه زبان مبدا و مقصد یکی باشن، ترجمه بی‌معنیه (و بعضی سرویس‌ها به‌جای
  // خطا، یه پیام متنی برمی‌گردونن که اشتباهی به‌عنوان "ترجمه" ذخیره می‌شد) —
  // پس همون متن اصلی رو بدون درخواست شبکه برمی‌گردونیم.
  if (sourceLang && sourceLang !== "auto" && sourceLang === targetLang) return text;

  // اول کشِ آفلاینِ IndexedDB رو چک کن — اگه این کلمه قبلاً (مثلاً از طریق
  // «دانلود آفلاین لغات» توی تنظیمات) ترجمه و ذخیره شده، بدون هیچ درخواست
  // شبکه‌ای همون رو برگردون. این دقیقاً همونیه که آفلاین‌بودن رو ممکن می‌کنه.
  const cached = await getCachedTranslation(text, targetLang, sourceLang);
  if (cached) return cached;

  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre];
  for (const provider of providers) {
    try {
      const result = await provider(text, targetLang, sourceLang);
      if (result && result.trim()) {
        setCachedTranslation(text, targetLang, sourceLang, result); // fire-and-forget
        return result;
      }
    } catch (error) {
      console.warn(`ترجمه با ${provider.name} ناموفق بود، رفتن سراغ سرویس بعدی:`, error?.message || error);
    }
  }
  // اگه هر ۴ سرویسِ رایگان شکست خوردن (مثلاً به‌خاطر فیلتر/بلاک‌بودنِ
  // این سرورهای خارجی توی شبکه‌ی کاربر) و aiSettings در دسترس بود،
  // به‌عنوان آخرین چاره از بک‌اند AI خودِ اپ کمک می‌گیریم.
  if (aiSettings) {
    try {
      const result = await translateViaAI(text, targetLang, sourceLang, aiSettings);
      if (result && result.trim()) {
        setCachedTranslation(text, targetLang, sourceLang, result);
        return result;
      }
    } catch (error) {
      console.warn("ترجمه با بک‌اند AI هم ناموفق بود:", error?.message || error);
    }
  }
  console.error("همه‌ی سرویس‌های ترجمه شکست خوردند؛ متن اصلی برگردانده شد.");
  return text; // اگر هیچ سرویسی جواب نداد، متن اصلی برگردانده می‌شود
}

// نگه‌داشته شده برای سازگاری با کدهای قبلی که این نام رو صدا می‌زدن —
// حالا خودش زنجیره‌ی کامل fallback رو صدا می‌زنه.
async function translateWithGoogle(text, targetLang) {
  return translateFree(text, targetLang, "auto");
}

// ---------------------------------------------------------------------------
// ترجمه‌ی «داخل جمله»‌ی یک کلمه/عبارت — به‌جای ترجمه‌ی مجزا و بی‌ربطِ خودِ
// کلمه (که معمولاً شکلش با چیزی که واقعاً توی ترجمه‌ی جمله نوشته شده فرق
// داره، مثلاً فعل صرف‌نشده در برابر صرف‌شده)، کل جمله رو با یک نشانگرِ
// مخصوص دور همون کلمه ترجمه می‌کنیم؛ سرویس‌های ترجمه معمولاً این نشانگرها
// رو دست‌نخورده رد می‌کنن، پس دقیقاً همون تکه از ترجمه که به اون کلمه
// مربوطه رو بیرون می‌کشیم. این یعنی نتیجه، رشته‌ای واقعی از همون جمله‌ی
// ترجمه‌شده‌ست و همیشه match می‌کنه — بدون نیاز به هوش مصنوعی یا بک‌اند.
const ALIGN_L = "⟦";
const ALIGN_R = "⟧";
async function translateWordInContext(sentenceText, word, sourceLang, targetLang) {
  if (!sentenceText || !word) return null;
  const idx = sentenceText.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return null;
  const wrapped =
    sentenceText.slice(0, idx) +
    ALIGN_L +
    sentenceText.slice(idx, idx + word.length) +
    ALIGN_R +
    sentenceText.slice(idx + word.length);
  try {
    const translated = await translateFree(wrapped, targetLang, sourceLang);
    if (!translated) return null;
    const re = new RegExp(`${ALIGN_L}([^${ALIGN_R}]*)${ALIGN_R}`);
    const m = translated.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  } catch {
    // اگه سرویس‌ها نشانگر رو حذف/جابجا کردن یا شکست خورد، بی‌سروصدا برمی‌گردیم
    // تا فراخوان‌کننده بره سراغ راه قبلی (ترجمه‌ی مجزای کلمه).
  }
  return null;
}
const colors = {
  paper: "var(--c-paper)",
  paperDark: "var(--c-paperDark)",
  ink: "var(--c-ink)",
  inkSoft: "var(--c-inkSoft)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  teal: "var(--c-teal)",
  rose: "var(--c-rose)",
  cardBorder: "var(--c-cardBorder)",
};
// طبق درخواست: متن اصلیِ لغت/جمله مشکی-سورمه‌ای پررنگ و بولد، و متنِ
// ترجمه‌ها سبزِ پررنگ و بولد. این دو ثابتن (نه وابسته به تم رنگی
// انتخابی کاربر توی تنظیمات) چون خودِ کاربر رنگ مشخص خواسته.
const mainTextColor = "#0B1220";
const translationColor = "#0F5C34";
// همون رنگِ پس‌زمینه‌ی نوارِ پلیرِ پایینِ صفحه (colors.paper) — تا این پنلِ
// شناور با اون هم‌رنگ باشه؛ بردرِ طلاییِ کم‌رنگ (goldSoft) هم اضافه شده تا
// با وجودِ هم‌رنگ بودنِ پس‌زمینه، پنل هنوز به‌وضوح از بقیه‌ی صفحه جدا دیده بشه.
const PRACTICE_PANEL_BORDER = colors.goldSoft;

// Theme presets — each is a full set of the 9 tokens above. "vintage" is the
// original look; the rest are alternate moods, all still checked for
// readable contrast (dark ink/text tokens on light paper tokens, or the
// reverse for "midnight").
const APP_THEMES = {
  vintage: {
    label: "کلاسیک (پیش‌فرض)",
    swatch: "#B8862B",
    values: { paper: "#F1E8D6", paperDark: "#E4D8BE", ink: "#1C2541", inkSoft: "#3A4566", gold: "#B8862B", goldSoft: "#DDBB77", teal: "#2F6F62", rose: "#9E3B3B", cardBorder: "#C9BB98" },
  },
  ocean: {
    label: "اقیانوسی",
    swatch: "#1C7C93",
    values: { paper: "#EAF4F4", paperDark: "#D7E9EA", ink: "#0F2A38", inkSoft: "#2A4E5C", gold: "#1C7C93", goldSoft: "#8FCBD8", teal: "#1C7C93", rose: "#B4533F", cardBorder: "#BBD6D8" },
  },
  forest: {
    label: "جنگلی",
    swatch: "#5C7A3A",
    values: { paper: "#F1F0E4", paperDark: "#E2E0CC", ink: "#26321D", inkSoft: "#41522C", gold: "#8A6D2F", goldSoft: "#C9B77E", teal: "#5C7A3A", rose: "#9C4A3A", cardBorder: "#CBCBA8" },
  },
  rosewine: {
    label: "گلبهی",
    swatch: "#A34960",
    values: { paper: "#F7EAEA", paperDark: "#EBD6D8", ink: "#3A1F26", inkSoft: "#5C3540", gold: "#A34960", goldSoft: "#E3AFBC", teal: "#6E5A78", rose: "#A34960", cardBorder: "#DDBFC4" },
  },
  midnight: {
    label: "تیره (شب)",
    swatch: "#D9A441",
    values: { paper: "#1B1F2A", paperDark: "#262C3B", ink: "#F1E8D6", inkSoft: "#C9C2AE", gold: "#D9A441", goldSoft: "#8A6A2C", teal: "#5FA997", rose: "#D9776A", cardBorder: "#3A4258" },
  },
};

// Font-family presets. Loaded in index.html via Google Fonts <link>.
const APP_FONTS = {
  default: { label: "پیش‌فرض", fa: "'Vazirmatn', sans-serif", latin: "'Lora', serif" },
  modern: { label: "مدرن", fa: "'Vazirmatn', sans-serif", latin: "'Inter', sans-serif" },
  classic: { label: "کلاسیک", fa: "'Noto Naskh Arabic', serif", latin: "'Merriweather', serif" },
};

// Font-size presets — applied as a CSS `zoom` on the app's root wrapper
// (simplest way to scale an app that's built with fixed px sizes
// throughout, without rewriting every fontSize to rem). Supported in
// Chrome/Edge/Safari and current Firefox; on the rare browser without
// `zoom` support the app still works, just always at 100% size.
const APP_FONT_SIZES = {
  small: { label: "کوچک", zoom: 0.9 },
  medium: { label: "متوسط (پیش‌فرض)", zoom: 1 },
  large: { label: "بزرگ", zoom: 1.15 },
  xlarge: { label: "خیلی بزرگ", zoom: 1.3 },
};

const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";

const STORAGE_KEY = "phrasebook-state-v1";

// Appearance preferences (theme / font family / font size) — separate from
// the per-account STORAGE_KEY above since these are device-level, not tied
// to any one user, and should already apply on the login screen before
// anyone's signed in.
const APP_PREFS_KEY = "phrasebook-app-prefs";
function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      theme: APP_THEMES[parsed.theme] ? parsed.theme : "vintage",
      font: APP_FONTS[parsed.font] ? parsed.font : "default",
      fontSize: APP_FONT_SIZES[parsed.fontSize] ? parsed.fontSize : "medium",
    };
  } catch (e) {
    return { theme: "vintage", font: "default", fontSize: "medium" };
  }
}
function saveAppPrefs(prefs) {
  try {
    localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

// Plain localStorage wrapper — works in any real browser (deployed site, PWA
// on a phone, etc). `window.storage` from the Claude preview environment
// does NOT exist once this app is deployed on its own, so we don't rely on it.
const storage = {
  async get(key) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? null : { value: v };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { value };
    } catch (e) {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// FIREBASE — real Google accounts + cross-device sync
// -----------------------------------------------------------------------------
// Free (Spark plan) Firebase project gives you both pieces this needs:
//   • Authentication → Google sign-in provider
//   • Firestore      → stores each user's words/stories/history by uid, so
//                       the same Google account sees the same data on any
//                       device/browser, not just this one's localStorage.
//
// ⚠️ TO ENABLE:
//   1. https://console.firebase.google.com → Add project (free)
//   2. Build → Authentication → Sign-in method → enable "Google"
//   3. Build → Firestore Database → Create database → start in production
//      mode, then add this rule so each user can only read/write their own
//      data (Firestore → Rules tab):
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /users/{uid} {
//              allow read, write: if request.auth != null && request.auth.uid == uid;
//            }
//          }
//        }
//   4. Project settings (gear icon) → General → "Your apps" → Web app (</>) →
//      copy the firebaseConfig object and paste its values below.
// Until FIREBASE_CONFIG.apiKey is filled in, the app falls back to local,
// per-device email/password + demo-Google accounts so it still works.
// ---------------------------------------------------------------------------
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const FIREBASE_ENABLED = !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");

let fbAuth = null;
let fbDb = null;
let fbGoogleProvider = null;
let fbMod = null; // { auth: {...}, firestore: {...} } — the loaded SDK modules

async function ensureFirebase() {
  if (!FIREBASE_ENABLED) return null;
  if (fbAuth && fbDb) return { auth: fbAuth, db: fbDb };
  const [{ initializeApp }, authMod, storeMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  fbMod = { auth: authMod, firestore: storeMod };
  const app = initializeApp(FIREBASE_CONFIG);
  fbAuth = authMod.getAuth(app);
  fbDb = storeMod.getFirestore(app);
  fbGoogleProvider = new authMod.GoogleAuthProvider();
  return { auth: fbAuth, db: fbDb };
}

async function firebaseSignInWithGoogle() {
  const { auth } = await ensureFirebase();
  const cred = await fbMod.auth.signInWithPopup(auth, fbGoogleProvider);
  const u = cred.user;
  return { uid: u.uid, email: u.email, name: u.displayName || u.email, picture: u.photoURL || "", provider: "google" };
}

async function firebaseSignOut() {
  if (!fbAuth) return;
  try {
    await fbMod.auth.signOut(fbAuth);
  } catch {}
}

// Loads this user's synced state from Firestore (users/{uid}), or null if
// there's nothing there yet (first time this account has been used).
async function firestoreLoadState(uid) {
  if (!FIREBASE_ENABLED || !uid) return null;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    const snap = await fbMod.firestore.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null; // offline, rules not set up yet, etc. — local storage still works
  }
}

async function firestoreSaveState(uid, data) {
  if (!FIREBASE_ENABLED || !uid) return;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    await fbMod.firestore.setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    // no network / not signed in yet — the local copy is still saved
  }
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const POS_FA = {
  noun: "اسم",
  verb: "فعل",
  adjective: "صفت",
  adverb: "قید",
  preposition: "حرف اضافه",
  pronoun: "ضمیر",
  conjunction: "حرف ربط",
  article: "حرف تعریف",
  interjection: "صوت",
  numeral: "عدد",
  auxiliary: "فعل کمکی",
  other: "سایر",
  determiner: "حرف تعیین‌کننده",
  exclamation: "صوت",
  "modal verb": "فعل وجهی",
  number: "عدد",
  "ordinal number": "عدد ترتیبی",
  "indefinite article": "حرف تعریف نکره",
  "definite article": "حرف تعریف معرفه",
  "linking verb": "فعل ربطی",
  "infinitive marker": "نشانه‌ی مصدر",
  idiom: "اصطلاح",
  slang: "اصطلاح عامیانه (مدرن)",
};

// Locale codes used for browser text-to-speech per language.
const TTS_LOCALE = {
  fa: "fa-IR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  ar: "ar-SA",
  tr: "tr-TR",
  zh: "zh-CN",
  ru: "ru-RU",
  it: "it-IT",
  ko: "ko-KR",
  ja: "ja-JP",
  hi: "hi-IN",
  ga: "ga-IE",
  uk: "uk-UA",
};

function downloadTextFile(filename, content, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function conversationToMarkdown(nativeLang, targetOrder) {
  const langs = [nativeLang, ...targetOrder.filter((c) => c !== nativeLang)];
  const langLabels = langs.map((c) => LANGUAGES.find((l) => l.code === c)?.label || c);
  let md = `# کتاب مکالمه — عبارات\n\nزبان‌ها: ${langLabels.join(" / ")}\n\n`;
  const byCategory = {};
  conversation .forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    md += `## ${CATEGORIES[cat] || cat}\n\n`;
    items.forEach((p) => {
      const parts = langs.map((l) => p.t[l]).filter(Boolean);
      md += `- **[${p.level}]** ${parts.join(" — ")}\n`;
    });
    md += `\n`;
  });
  return md;
}

function vocabToMarkdown() {
  let md = `# کتاب مکالمه — دیکشنری\n\n`;
  VOCAB.forEach((v) => {
    md += `- **${v.t.en || v.t.fa}** _(${v.level}, ${POS_FA[v.pos] || v.pos})_ — ${v.meaningFa}\n`;
  });
  return md;
}

// ---------------------------------------------------------------------------
// Speech controller — a single module-level singleton, since only one
// utterance should ever play across the whole app at once.
//
// Plays text one SENTENCE at a time (not one continuous utterance, and not
// one word at a time). This is deliberate:
//   - One utterance per word sounds robotic (every browser adds startup
//     latency + a gap between separate utterances).
//   - One continuous utterance for the whole text sounds natural, but gives
//     us zero reliable control over pacing: many TTS engines (especially
//     "Google"/network voices on Android) mostly ignore utterance.rate values
//     below 1, so picking "0.5x" barely changes anything.
//   - Sentence-sized chunks are the sweet spot: each sentence still sounds
//     natural internally (real prosody, not word-by-word), but the GAP
//     between sentences is something *we* fully control with setTimeout —
//     completely independent of whatever the engine does with `rate`. That
//     gap is what makes slow speeds actually feel slow, reliably, on every
//     device. We also push the rate we hand to the engine further down than
//     what the user picked (see engineRate below) to compensate for engines
//     that have a rate floor.
//
// Word-level position (wordOffset / getWordOffset) is tracked via onboundary
// INSIDE each sentence-chunk's utterance, purely for the reading-tracker
// (shadow-line) UI. It does not affect chunking, pacing, or which SENTENCE
// pause/resume/repeat operate on — that logic is untouched.
// ---------------------------------------------------------------------------

const speechController = (() => {
  let fullText = "";
  let chunks = []; // [{start, end, text}] sentence-sized chunks of fullText
  let chunkIndex = 0; // index into chunks of the sentence currently playing/paused
  // آفستِ کاراکتریِ کلمه‌ای که همین الان داره گفته می‌شه (داخلِ fullText) —
  // برای ردیابِ خوانش/خطِ سایه‌ی زیرِ کلمه استفاده می‌شه. فقط توی مسیرِ
  // local (speechSynthesis واقعیِ مرورگر) دقیقه؛ توی مسیرِ آنلاین به سطحِ
  // شروعِ تکه (chunk) برمی‌گرده (getWordOffset پایین‌تر همین رو مدیریت می‌کنه).
  let wordOffset = 0;
  let key = null; // `${locale}::${text}` — identifies what's currently loaded
  let locale = "en-US";
  let status = "idle"; // "idle" | "playing" | "paused"
  let rate = Number(localStorage.getItem("phrasebook-tts-rate")) || 1; // 0.25 (slow) .. 2 (fast), 1 = normal
  // "local" = TTS خود گوشی (speechSynthesis) | "online" = سرویس رایگان
  // آنلاین (وقتی گوشی اصلاً صدایی برای اون زبون نصب نداره).
  let mode = "local";
  // --- تکرار سراسری ---------------------------------------------------
  let globalRepeatSetting = (() => {
    const saved = localStorage.getItem("phrasebook-tts-repeat");
    if (saved === "inf") return "inf";
    const n = Number(saved);
    return n === 3 || n === 6 ? n : 0;
  })();
  let remaining = 0;
  let singleShot = false;
  // وقتی خودمون عمداً speechSynthesis.cancel() صدا می‌زنیم (برای مکث یا
  // شروع پخش جدید)، مرورگر یه onerror با error="interrupted" شلیک می‌کنه که
  // خطای واقعی نیست. این فلگ همون قطع‌شدن‌های عمدی رو از خطای واقعی جدا می‌کنه.
  let expectingCancel = false;
  // تایمرِ مکثِ بینِ دو جمله (همون چیزی که سرعتِ کند رو واقعاً حس‌شدنی می‌کنه) —
  // موقعِ pause باید کنسل بشه وگرنه جمله‌ی بعدی خودش‌به‌خود شروع می‌شه.
  let gapTimer = null;
  const listeners = new Set();

  function clearGapTimer() {
    if (gapTimer) {
      clearTimeout(gapTimer);
      gapTimer = null;
    }
  }

  function cancelSpeech() {
    expectingCancel = true;
    clearGapTimer();
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // -------------------------------------------------------------------
  // مسیر جایگزین: وقتی گوشی صدایی برای این زبون نصب نداره، از یه سرویس
  // آنلاین رایگان (بدون نیاز به کلید API) صدا رو می‌گیریم.
  // -------------------------------------------------------------------
  let onlineAudio = null;
  let onlineChunks = [];
  let onlineChunkIndex = 0;
  let onlineLangForTts = "en";

  function splitForOnlineTts(text, maxLen = 180) {
    const chunksArr = [];
    let rest = (text || "").trim();
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(" ", maxLen);
      if (cut <= 0) cut = maxLen;
      chunksArr.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunksArr.push(rest);
    return chunksArr.length ? chunksArr : [text];
  }

  function onlineTtsUrls(chunkText, langCode) {
    const q = encodeURIComponent(chunkText);
    return [
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${q}`,
      `https://api.streamelements.com/kappa/v2/speech?voice=${langCode}&text=${q}`,
    ];
  }

  function stopOnlineAudio() {
    if (onlineAudio) {
      try {
        onlineAudio.pause();
      } catch (e) {}
      onlineAudio.onended = null;
      onlineAudio.onerror = null;
      onlineAudio = null;
    }
  }

  function playOnlineChunkUrls(urls, urlIndex, idx) {
    if (urlIndex >= urls.length) {
      playOnlineChunk(idx + 1);
      return;
    }
    const audio = new Audio(urls[urlIndex]);
    audio.playbackRate = rate;
    audio.onended = () => {
      if (status !== "playing") return;
      playOnlineChunk(idx + 1);
    };
    audio.onerror = () => {
      if (status !== "playing") return;
      playOnlineChunkUrls(urls, urlIndex + 1, idx);
    };
    onlineAudio = audio;
    audio.play().catch(() => {
      playOnlineChunkUrls(urls, urlIndex + 1, idx);
    });
  }

  function playOnlineChunk(idx) {
    if (idx >= onlineChunks.length) {
      if (!singleShot && globalRepeatSetting === "inf") {
        playOnlineChunk(0);
        return;
      }
      if (!singleShot && remaining > 0) {
        remaining -= 1;
        playOnlineChunk(0);
        return;
      }
      status = "idle";
      chunkIndex = 0;
      notify();
      return;
    }
    onlineChunkIndex = idx;
    chunkIndex = chunkIndexForOffset(
      Math.min(fullText.length - 1, Math.floor((idx / Math.max(onlineChunks.length, 1)) * fullText.length))
    );
    status = "playing";
    notify();
    playOnlineChunkUrls(onlineTtsUrls(onlineChunks[idx], onlineLangForTts), 0, idx);
  }

  function speakOnline(text, langCodeForTts, startCharOffset, forceSingle, forceLoop) {
    stopOnlineAudio();
    mode = "online";
    fullText = text;
    chunks = splitSentences(text);
    onlineChunks = splitForOnlineTts(text);
    onlineLangForTts = langCodeForTts;
    singleShot = !!forceSingle;
    remaining = singleShot ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
    let startChunk = 0;
    if (Number.isInteger(startCharOffset) && startCharOffset > 0 && text.length && onlineChunks.length) {
      const frac = Math.min(Math.max(startCharOffset / text.length, 0), 1);
      startChunk = Math.min(onlineChunks.length - 1, Math.floor(frac * onlineChunks.length));
    }
    playOnlineChunk(startChunk);
  }

  function notify() {
    listeners.forEach((cb) =>
      cb({ key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, wordOffset })
    );
  }

  // حداکثر چند کلمه تو یه تکه (chunk) بگنجه. جمله‌های عادی معمولاً از این
  // کوتاه‌ترن و دست‌نخورده می‌مونن (پروسودیِ طبیعی‌شون حفظ می‌شه). ولی متنِ
  // بدونِ علامتِ‌نگارشی (مثلاً «خواندنِ کل لیستِ لغات» که کلی کلمه با فاصله
  // به‌هم چسبیده‌ن) بدونِ این حد، یه تکه‌ی غول‌پیکر می‌شد و مکثِ بینِ‌تکه‌ها
  // (که سرعتِ کند رو واقعی می‌کنه) اصلاً روش اعمال نمی‌شد.
  const MAX_WORDS_PER_CHUNK = 6;

  // متن رو اول به جمله تقسیم می‌کنه (روی .!?؟ و غیره)، بعد هر جمله‌ای که
  // خیلی بلنده رو خودش به تکه‌های چندکلمه‌ای می‌شکنه. آفستِ کاراکتریِ شروع/
  // پایانِ هر تکه هم نگه داشته می‌شه.
  function splitSentences(text) {
    const t = text || "";
    if (!t) return [];
    const re = /[^.!?؟。！]+[.!?؟。！]*/g;
    const sentences = [];
    let m;
    while ((m = re.exec(t))) {
      const raw = m[0];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const start = m.index + raw.indexOf(trimmed[0]);
      sentences.push({ start, end: start + trimmed.length, text: trimmed });
    }
    if (!sentences.length) return [{ start: 0, end: t.length, text: t }];

    const out = [];
    for (const seg of sentences) {
      const wordRe = /\S+/g;
      const wordPositions = [];
      let wm;
      while ((wm = wordRe.exec(seg.text))) wordPositions.push({ start: wm.index, end: wm.index + wm[0].length });

      if (wordPositions.length <= MAX_WORDS_PER_CHUNK) {
        out.push(seg);
        continue;
      }
      for (let i = 0; i < wordPositions.length; i += MAX_WORDS_PER_CHUNK) {
        const lastIdx = Math.min(i + MAX_WORDS_PER_CHUNK, wordPositions.length) - 1;
        const wStart = wordPositions[i].start;
        const wEnd = wordPositions[lastIdx].end;
        out.push({
          start: seg.start + wStart,
          end: seg.start + wEnd,
          text: seg.text.slice(wStart, wEnd),
        });
      }
    }
    return out;
  }

  function chunkIndexForOffset(offset) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (offset >= chunks[i].start) return i;
    }
    return 0;
  }

  // چیزی که موتورِ TTS واقعاً باهاش صدا کنیم — پایین‌ترِ چیزیه که کاربر
  // انتخاب کرده، چون خیلی از موتورها (مخصوصاً صداهای شبکه‌ای/Google روی
  // اندروید) زیرِ ۱ عملاً کند نمی‌شن؛ این جبرانِ اون کفِ داخلیِ موتوره. سرعتِ
  // واقعیِ حس‌شده رو بیشتر مکثِ بینِ جمله‌ها (interChunkGapMs) تعیین می‌کنه که
  // کاملاً دستِ خودمونه و مستقل از رفتار موتوره.
  function engineRate(r) {
    if (r >= 1) return r;
    return Math.max(0.1, r - (1 - r) * 0.6);
  }

  // مکثِ بینِ دو جمله — پایه‌ش یه فاصله‌ی طبیعیه، و با کاهشِ rate بیشتر می‌شه.
  // چون این تایمر مستقلِ موتورِ TTSه، همیشه دقیقاً همونی که می‌خوایم اجرا می‌شه.
  function interChunkGapMs(r) {
    const base = 160;
    return Math.round(base / Math.min(Math.max(r, 0.2), 2));
  }

  // 🔥 انتخاب صدای بهتر (Google Voices در کروم/اج)
  function getBestVoice(langCode) {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split("-")[0];

    let preferred = voices.find(v =>
      v.lang.startsWith(langPrefix) &&
      (v.name.includes("Google") || v.name.includes("Natural")) &&
      (v.name.includes("Female") || v.name.includes("Male"))
    );
    if (!preferred) {
      preferred = voices.find(v =>
        v.lang.startsWith(langPrefix) &&
        (v.name.includes("Google") || v.name.includes("Natural"))
      );
    }
    if (!preferred) {
      preferred = voices.find(v =>
        v.lang.startsWith(langPrefix) &&
        (v.name.includes("Enhanced") || v.name.includes("Premium"))
      );
    }
    if (!preferred) {
      preferred = voices.find(v => v.lang.startsWith(langPrefix));
    }
    return preferred || null;
  }

  function speakChunk(idx, forceRestart = false) {
    if (!chunks.length) {
      status = "idle";
      notify();
      return;
    }
    if (idx >= chunks.length) {
      if (!singleShot && globalRepeatSetting === "inf") {
        speakChunk(0, true);
        return;
      }
      if (!singleShot && remaining > 0) {
        remaining -= 1;
        speakChunk(0, true);
        return;
      }
      status = "idle";
      chunkIndex = 0;
      notify();
      return;
    }

    clearGapTimer();
    if (forceRestart) cancelSpeech();
    chunkIndex = idx;
    // آفستِ کلمه رو همین‌جا موقتاً به شروعِ همین تکه برمی‌گردونیم؛ به‌محضِ
    // شروعِ واقعیِ گفتار، رویدادِ onboundary زیر دقیق‌ترش می‌کنه.
    wordOffset = chunks[idx].start;
    status = "playing";
    notify();

    const utter = new SpeechSynthesisUtterance(chunks[idx].text);
    utter.lang = locale;
    utter.rate = engineRate(rate);

    const bestVoice = getBestVoice(locale);
    if (bestVoice) utter.voice = bestVoice;

    // این تکه (chunk) خودش حداکثر ۶ کلمه‌ست و به‌صورتِ یک utterance واحد
    // پخش می‌شه، پس رویدادِ onboundary مرورگر (که فقط داخلِ یک utterance
    // معنی داره) اینجا کاملاً معتبره — بدونِ اینکه چیزی از منطقِ تکه‌بندی/
    // مکثِ بینِ‌جمله‌ها (که در بالا توضیح داده شده) رو تغییر بده.
    utter.onboundary = (e) => {
      if (status !== "playing") return;
      if (e.name === "word" || e.name === undefined) {
        wordOffset = chunks[idx].start + e.charIndex;
        notify();
      }
    };

    utter.onend = () => {
      if (status !== "playing") return;
      const gap = interChunkGapMs(rate);
      gapTimer = setTimeout(() => {
        gapTimer = null;
        speakChunk(chunkIndex + 1, false);
      }, gap);
    };
    utter.onerror = (e) => {
      if (expectingCancel) {
        expectingCancel = false;
        return;
      }
      status = "idle";
      notify();
    };

    window.speechSynthesis.speak(utter);
  }

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState() {
      return { key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, wordOffset };
    },
    // آفستِ کاراکتریِ شروعِ جمله‌ای که همین الان (یا آخرین‌بار) در حال
    // پخشه — برای «ادامه‌ی پخش از همون‌جا» وقتی متنِ در حال پخش عوض می‌شه
    // (مثلاً تغییرِ حالتِ نمایش ترجمه) استفاده می‌شه.
    getCharOffset() {
      if (!chunks.length) return 0;
      const idx = Math.min(Math.max(chunkIndex, 0), chunks.length - 1);
      return chunks[idx].start;
    },
    // آفستِ دقیقِ کلمه‌ای که همین الان گفته می‌شه — برای ردیابِ خوانش
    // (خطِ سایه‌ی زیرِ کلمه). توی مسیرِ آنلاین (که رویدادِ onboundary نداره)
    // به سطحِ شروعِ تکه/جمله برمی‌گرده، یعنی همون رفتارِ getCharOffset.
    getWordOffset() {
      if (mode !== "local") return this.getCharOffset();
      return wordOffset;
    },
    getGlobalRepeatSetting() {
      return globalRepeatSetting;
    },
    cycleGlobalRepeat() {
      const order = [0, 3, 6, "inf"];
      const idx = order.indexOf(globalRepeatSetting);
      globalRepeatSetting = order[(idx + 1) % order.length];
      try {
        localStorage.setItem("phrasebook-tts-repeat", String(globalRepeatSetting));
      } catch (e) {}
      if (status === "playing" || status === "paused") {
        remaining = globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
      }
      notify();
    },
    // startCharOffset (اختیاری): آفستِ کاراکتری‌ای که پخش باید تقریباً از
    // جمله‌ی متناظرش شروع بشه — برای «ادامه از همون‌جا» بعد از تغییرِ متن.
    toggle(text, code, startCharOffset, options) {
      try {
        if (!text) return "unsupported";
        const forceSingle = !!(options && options.singlePass);
        const forceLoop = !!(options && options.loop);
        const hasSynthesis = "speechSynthesis" in window;

        let newLocale = TTS_LOCALE[code] || "en-US";
        if (hasSynthesis && code === "fa") {
          const voices = window.speechSynthesis.getVoices();
          const hasPersianVoice = voices.some(v => v.lang.startsWith("fa"));
          if (!hasPersianVoice) {
            const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
            if (arabicVoice) newLocale = "ar-SA";
          }
        }

        const newKey = `${newLocale}::${text}`;

        // اگر همان متن در حال پخش است و دکمه زده شده، توقف/ادامه
        if (key === newKey && status === "playing") {
          if (mode === "online") {
            if (onlineAudio) {
              try {
                onlineAudio.pause();
              } catch (e) {}
            }
            status = "paused";
            notify();
            return "ok";
          }
          clearGapTimer();
          cancelSpeech();
          status = "paused";
          notify();
          return "ok";
        }

        if (key === newKey && status === "paused") {
          status = "playing";
          if (mode === "online") {
            notify();
            if (onlineAudio) {
              onlineAudio.play().catch(() => playOnlineChunk(onlineChunkIndex));
            } else {
              playOnlineChunk(onlineChunkIndex);
            }
          } else {
            speakChunk(chunkIndex, false);
          }
          return "ok";
        }

        // متن جدید — شمارنده‌ی تکرار از روی تنظیم سراسری تازه می‌شه
        const voices = hasSynthesis ? window.speechSynthesis.getVoices() : [];
        const baseLang = newLocale.split("-")[0].toLowerCase();
        const hasVoice = voices.some((v) => v.lang && v.lang.toLowerCase().startsWith(baseLang));

        key = newKey;
        locale = newLocale;

        if (hasSynthesis && (voices.length === 0 || hasVoice)) {
          mode = "local";
          stopOnlineAudio();
          fullText = text;
          chunks = splitSentences(text);
          status = "playing";
          singleShot = forceSingle;
          remaining = forceSingle ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
          const startIdx = Number.isInteger(startCharOffset) && startCharOffset > 0
            ? chunkIndexForOffset(Math.min(startCharOffset, Math.max(text.length - 1, 0)))
            : 0;
          speakChunk(startIdx, true);
          return "ok";
        }

        // مسیر جایگزین (آنلاین رایگان)
        cancelSpeech();
        const onlineLang = code === "zh" ? "zh-CN" : code;
        speakOnline(text, onlineLang, startCharOffset, forceSingle, forceLoop);
        return "online-fallback";
      } catch (e) {
        status = "idle";
        notify();
        return "error";
      }
    },
    stop() {
      cancelSpeech();
      stopOnlineAudio();
      mode = "local";
      key = null;
      chunks = [];
      status = "idle";
      chunkIndex = 0;
      wordOffset = 0;
      remaining = 0;
      singleShot = false;
      notify();
    },
    getRate() {
      return rate;
    },
    setRate(r) {
      rate = Math.min(Math.max(Number(r) || 1, 0.25), 2);
      try {
        localStorage.setItem("phrasebook-tts-rate", String(rate));
      } catch (e) {}
      if (status === "playing" && mode === "online") {
        if (onlineAudio) onlineAudio.playbackRate = rate;
        notify();
      } else if (status === "playing") {
        speakChunk(chunkIndex, true);
      } else {
        notify();
      }
    },
  };
})();


// ---------------------------------------------------------------------------
// حافظه‌ی «نقطه‌ی ادامه» برای متنِ اصلی (مثلاً داستان) — وقتی کاربر روی یه
// کلمه یا یه محدوده‌ی انتخابی از متنِ اصلی دکمه‌ی پخش رو می‌زنه (برای شنیدنِ
// تلفظش)، همون موقعیت (آفستِ کاراکتری داخلِ متنِ کامل) به‌خاطر سپرده می‌شه.
// دفعه‌ی بعد که دکمه‌ی «پخشِ کل متن» زده بشه (از نگاهِ speechController،
// چون کلیدش با کلمه/محدوده فرق داره، «متنِ تازه»ست)، پخش به‌جای شروع از اول،
// از همون نقطه (تقریباً همون جمله) ادامه پیدا می‌کنه. کلید همون کلیدِ
// speechController یعنی `${locale}::${fullText}` است.
// ---------------------------------------------------------------------------
const mainTextResumePoints = new Map();
function rememberMainTextResumeOffset(mainTextKey, offset) {
  if (!mainTextKey || !Number.isFinite(offset)) return;
  mainTextResumePoints.set(mainTextKey, offset);
}
function consumeMainTextResumeOffset(mainTextKey) {
  return mainTextKey ? mainTextResumePoints.get(mainTextKey) : undefined;
}
// آخرین متن/زبانِ داستان — چون GlobalAddToStorySelection سراسریه و مستقیم
// به StoryBuilder دسترسی نداره، از همین متغیر برای ساختنِ کلیدِ درستِ
// speechController موقعِ به‌خاطرسپردنِ نقطه‌ی ادامه استفاده می‌کنه.
let latestStoryTextContext = { text: "", code: "" };

// ---------------------------------------------------------------------------
// اسکرول خودکار — استفاده‌شده توسط PhraseList / WordList / VocabList. خودش
// هیچ صدایی رو پخش نمی‌کنه و شروعش نمی‌کنه؛ فقط وقتی روشنه، دنبالِ هر چیزی
// که همین الان از طریقِ 🔊ِ خودِ آیتم (یا هر جای دیگه‌ای) در حالِ پخشه
// می‌گرده، و کارتِ مربوطه رو خودکار وسطِ صفحه نگه می‌داره — تا کاربر خطش رو
// گم نکنه. پخش/توقف و تکرار کاملاً دستِ خودِ دکمه‌های 🔊 می‌مونه.
// ---------------------------------------------------------------------------
function useAutoplayOnScroll(enabled, items) {
  const nodeMapRef = useRef(new Map()); // id -> DOM node
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) return;
    const update = (state) => {
      if (!state.key || state.status === "idle") return;
      const list = itemsRef.current;
      const match = list.find(
        (it) => it.text && `${TTS_LOCALE[it.code] || "en-US"}::${it.text}` === state.key
      );
      if (!match) return;
      const node = nodeMapRef.current.get(String(match.id));
      if (node && node.scrollIntoView) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [enabled]);

  const registerRef = (id) => (node) => {
    const key = String(id);
    if (node) nodeMapRef.current.set(key, node);
    else nodeMapRef.current.delete(key);
  };

  return { registerRef };
}

// ---------------------------------------------------------------------------
// دیکشنری آفلاین دانلودی — یه فایل JSON ساده (کلمه ↔ معنی) که یه‌بار از
// همین سایت دانلود و با Cache API رو گوشی کاربر ذخیره می‌شه. بعد از اون،
// جستجو کاملاً آفلاینه و نیازی به اینترنت یا سرور AI نداره.
//
// فایل‌های دیکشنری تو پوشه‌ی /dictionaries/<code>.json این ریپو هستن
// (مثلاً dictionaries/en.json). برای اضافه‌کردن یه زبون جدید، همون فرمت
// (آرایه‌ای از {"en": "...", "fa": "..."}) رو تو یه فایل جدید با اسم کد
// زبون بذار و به OFFLINE_DICT_LANGS اضافه‌ش کن.
// ---------------------------------------------------------------------------
const OFFLINE_DICT_CACHE_NAME = "phrasebook-offline-dict-v1";
const OFFLINE_DICT_LANGS = ["en"]; // زبون‌هایی که دیکشنری آفلاین براشون آماده‌ست

const offlineDictionary = (() => {
  // code -> array of {en, fa} (یا هر جفت‌زبونی که فایل داشته باشه)
  const loaded = new Map();
  const listeners = new Set();

  function notify() {
    listeners.forEach((cb) => cb());
  }

  function fileUrl(code) {
    // نسبت به خود صفحه — رو GitHub Pages دقیقاً همون /dictionaries/en.json می‌شه
    return new URL(`dictionaries/${code}.json`, window.location.href).toString();
  }

  async function isDownloaded(code) {
    if (loaded.has(code)) return true;
    if (!("caches" in window)) return false;
    try {
      const cache = await caches.open(OFFLINE_DICT_CACHE_NAME);
      const match = await cache.match(fileUrl(code));
      return !!match;
    } catch (e) {
      return false;
    }
  }

  // موقع بالا اومدن اپ، هر دیکشنری‌ای که قبلاً دانلود شده رو از Cache می‌خونه
  // تو حافظه، بدون نیاز به دوباره‌دانلودکردن یا حتی اینترنت داشتن.
  async function hydrateFromCache() {
    if (!("caches" in window)) return;
    try {
      const cache = await caches.open(OFFLINE_DICT_CACHE_NAME);
      for (const code of OFFLINE_DICT_LANGS) {
        if (loaded.has(code)) continue;
        const match = await cache.match(fileUrl(code));
        if (match) {
          const data = await match.json();
          loaded.set(code, data);
        }
      }
      notify();
    } catch (e) {}
  }

  async function download(code, onProgress) {
    const url = fileUrl(code);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`دانلود دیکشنری ${code} شکست خورد (HTTP ${res.status})`);

    // تخمین پیشرفت از روی Content-Length، اگه سرور بفرسته
    const total = Number(res.headers.get("content-length")) || 0;
    let received = 0;
    const reader = res.body?.getReader ? res.body.getReader() : null;
    let text;
    if (reader) {
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (onProgress) onProgress(total ? Math.min(99, Math.round((received / total) * 100)) : 60);
      }
      const blob = new Blob(chunks);
      text = await blob.text();
    } else {
      text = await res.text();
    }
    const data = JSON.parse(text);

    loaded.set(code, data);
    if ("caches" in window) {
      try {
        const cache = await caches.open(OFFLINE_DICT_CACHE_NAME);
        await cache.put(url, new Response(text, { headers: { "Content-Type": "application/json" } }));
      } catch (e) {}
    }
    if (onProgress) onProgress(100);
    notify();
    return data.length;
  }

  function entryCount(code) {
    return loaded.get(code)?.length || 0;
  }

  // جستجوی دوطرفه: هم تو کلمه‌ی خارجی، هم تو معنی فارسی می‌گرده
  function lookup(word, code) {
    const list = loaded.get(code);
    if (!list || !word) return [];
    const q = word.trim().toLowerCase();
    const qFa = word.trim();
    if (!q) return [];
    // اول تطبیق کامل، بعد شامل‌بودن
    const exact = list.filter((e) => e.en.toLowerCase() === q || e.fa === qFa);
    if (exact.length) return exact;
    return list.filter((e) => e.en.toLowerCase().includes(q) || e.fa.includes(qFa)).slice(0, 20);
  }

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDownloaded,
    hydrateFromCache,
    download,
    entryCount,
    lookup,
    isLoadedInMemory(code) {
      return loaded.has(code);
    },
  };
})();


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
const DEFAULT_BACKEND_URL = "https://phrasebook-api.maryam-s-sharifiyan.workers.dev";

async function callAI({ prompt, maxTokens, retries = 2, aiSettings }) {
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
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
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
        throw new Error(`ai-backend-error: ${detail}`);
      }
      const data = await res.json();
      const text = data.text || "";
      if (!text) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
          continue;
        }
        throw new Error("ai-backend-error: پاسخ خالی از سرور دریافت شد، دوباره تلاش کن.");
      }
      return text;
    } catch (e) {
      const msg = String(e?.message || "");
      const isKnownServerError = msg.startsWith("ai-backend-error:");
      const isNetworkFailure = e instanceof TypeError; // fetch() throws TypeError on network/CORS failure
      if (!isKnownServerError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      if (isKnownServerError) throw e;
      throw new Error(
        isNetworkFailure
          ? `ai-backend-error: به سرور (${base}) وصل نشد. یعنی خودِ Cloudflare Worker جواب نداد — چک کن: ۱) آخرین دیپلوی توی داشبورد Cloudflare بدون خطا انجام شده باشه، ۲) این آدرس رو مستقیم توی مرورگر باز کن (${base}/health) و ببین یه JSON برمی‌گردونه یا خطا می‌ده، ۳) آدرس بک‌اند توی تنظیمات اپ (اگه دستی ست کردی) درست باشه.`
          : `ai-backend-error: ${msg || "خطای ناشناخته در اتصال"}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Word lookup — click any word inside a phrase to see its meaning + role.
// Strategy: 1) check the local VOCAB list (instant, free)
//           2) fall back to the AI backend, with a localStorage cache so the
//              same word is never re-requested twice on this device.
// ---------------------------------------------------------------------------
const WORD_CACHE_KEY = "phrasebook-word-lookup-cache-v1";

function normalizeWord(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
}

function loadWordCache() {
  try {
    const raw = window.localStorage.getItem(WORD_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveWordCache(cache) {
  try {
    window.localStorage.setItem(WORD_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ---------------------------------------------------------------------------
// Words the user bookmarks from the word-tap popover ("save for next story").
// Stored per-device, filtered by langCode when shown inside Story Builder.
// A custom window event lets any open Story Builder instance refresh live,
// since localStorage's own "storage" event doesn't fire in the same tab.
// ---------------------------------------------------------------------------
const SAVED_STORY_WORDS_KEY = "phrasebook-saved-story-words-v1";
const SAVED_WORDS_CHANGED_EVENT = "phrasebook:savedWordsChanged";
// وقتی کاربر از پاپ‌آپِ لغت (وسطِ خوندنِ یه داستان) روی «ذخیره برای داستان
// بعدی» می‌زنه، همین لغت باید بلافاصله به لیستِ لغاتِ انتخاب‌شده‌ی همون
// داستان‌ساز (پیش از تولید/ترجمه‌ی داستانِ بعدی) هم اضافه بشه — نه فقط به
// انبار دائمی. StoryBuilder به این رویداد گوش می‌ده و اگه زبانش با
// زبانِ داستانِ فعلی یکی باشه، لغت رو به selectedWords اضافه می‌کنه.
const STORY_WORD_PICKED_EVENT = "phrasebook:storyWordPicked";
// جلوگیری از چند درخواست هم‌زمان برای ترجمه‌ی یک لغت به یک زبان مشخص —
// چه از پنل «لغات ذخیره‌شده» چه از زیرخط‌کشیِ ClickableSentence در چند
// نمونه‌ی هم‌زمان روی صفحه.
const crossTranslateInFlight = new Set();

// کدامین تبِ برنامه، همین الان روی صفحه‌ست — یک متغیرِ ساده‌ی سطحِ ماژول
// (نه state ری‌اکت)، چون توابعِ ذخیره‌سازیِ پایین (که از خیلی جاهای مختلفِ
// برنامه صدا زده می‌شن، نه فقط از داخلِ کامپوننت‌ها) باید بتونن همین الان
// بفهمن کاربر توی کدوم تبه، بدون این‌که لازم باشه این اطلاعات از بالا تا
// پایینِ کل درختِ کامپوننت‌ها prop-drilling بشه. PhrasebookMain با تغییرِ
// state‌ِ tab خودش، این متغیر رو هم‌زمان به‌روز نگه می‌داره (نگاه کن به
// useEffect مربوطه اونجا). هر لغت/عبارتی که همین الان ذخیره می‌شه، همین
// مقدار به‌عنوانِ origin.tab باهاش ذخیره می‌شه — تا بعداً توی پنلِ «لغات
// ذخیره‌شده»، لانگ‌پرس روی هر کارت بتونه کاربر رو به همون تب برگردونه.
let currentOriginTab = null;
function setCurrentOriginTab(tab) {
  currentOriginTab = tab || null;
}

function loadSavedStoryWords() {
  try {
    const raw = window.localStorage.getItem(SAVED_STORY_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function isWordSaved(word, langCode) {
  const w = normalizeWord(word);
  return loadSavedStoryWords().some((e) => e.langCode === langCode && normalizeWord(e.word) === w);
}
// opts (اختیاری): { meaning, nativeLang } — اگه موقع ذخیره، ترجمه‌ی لغت به
// زبان مادری کاربر از قبل روی صفحه (پاپ‌آپ لغت) موجود بود، همون‌جا همراه
// خودِ لغت ذخیره می‌شه؛ وگرنه بعداً از جاهای دیگه (نگاه‌کردن دوباره به لغت،
// یا پنل «لغات ذخیره‌شده») کامل می‌شه.
function toggleSavedStoryWord(word, langCode, opts) {
  const w = normalizeWord(word);
  if (!w) return false;
  // Strip the same stray leading/trailing punctuation normalizeWord() would
  // (quotes, sentence-final periods, commas, etc.) but keep original casing,
  // so what gets stored is always the clean word/expression, not a token
  // still carrying punctuation from where it happened to sit in a sentence.
  const cleanWord = (word || "")
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
  const list = loadSavedStoryWords();
  const idx = list.findIndex((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  let nowSaved;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowSaved = false;
  } else {
    const translations = {};
    if (opts && opts.meaning && opts.nativeLang) translations[opts.nativeLang] = opts.meaning;
    list.unshift({
      word: cleanWord || word,
      langCode,
      savedAt: new Date().toISOString(),
      translations,
      origin: { tab: currentOriginTab, ...((opts && opts.originExtra) || {}) },
    });
    nowSaved = true;
  }
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
  return nowSaved;
}

// ترجمه‌ی یک لغت ذخیره‌شده رو به یک زبان مشخص (targetLangCode) کامل/به‌روز
// می‌کنه — هم برای نمایش ترجمه توی پنل «لغات ذخیره‌شده» استفاده می‌شه، هم
// برای این‌که همون لغت وقتی به زبان‌های دیگه ترجمه شده تو متن دیده می‌شه،
// زیرخط بخوره (نگاه کن به ClickableSentence).
function updateSavedWordTranslation(word, langCode, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const w = normalizeWord(word);
  const list = loadSavedStoryWords();
  const idx = list.findIndex((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (idx === -1) return;
  const entry = list[idx];
  const prev = (entry.translations && entry.translations[targetLangCode]) || "";
  if (prev === translatedText.trim()) return; // از رویداد بی‌فایده جلوگیری می‌کنه
  const translations = { ...(entry.translations || {}), [targetLangCode]: translatedText.trim() };
  list[idx] = { ...entry, translations };
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
// فقط اضافه می‌کنه (اگه از قبل نبود) — برخلاف toggleSavedStoryWord، هیچ‌وقت
// چیزی رو حذف نمی‌کنه. برای اینکه هر لغتی که برای ساخت یه داستان انتخاب
// می‌شه، خودکار و بی‌سروصدا تو انبار دائمی هم بمونه، حتی اگه بعداً از
// انتخاب همون داستان برداشته بشه.
function ensureSavedStoryWord(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return;
  const cleanWord = (word || "")
    .replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "")
    .trim();
  const list = loadSavedStoryWords();
  const exists = list.some((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (exists) return;
  list.unshift({
    word: cleanWord || word,
    langCode,
    savedAt: new Date().toISOString(),
    translations: {},
    origin: { tab: currentOriginTab },
  });
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}
function removeSavedStoryWord(word, langCode) {
  const list = loadSavedStoryWords().filter(
    (e) => !(e.langCode === langCode && normalizeWord(e.word) === normalizeWord(word))
  );
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}

// وقتی نسخه‌ی ابری (Supabase) لود می‌شه، قبلاً کاملاً جای نسخه‌ی محلی رو
// می‌گرفت (overwrite) — یعنی اگه به هر دلیلی (ردیفِ ابری قدیمی‌تر بود، یا
// هنوز کامل sync نشده بود) نسخه‌ی ابری چیزِ کمتری داشت، لغاتی که محلی
// داشت ولی ابری نداشت، همون لحظه پاک می‌شدن؛ و بدتر، دفعه‌ی بعد که ذخیره
// (debounced save) اجرا می‌شد، همین نسخه‌ی ناقص دوباره به ابری هم می‌رفت —
// یعنی گم‌شدنِ دائمی. این تابع به‌جاش دو لیست رو ادغام می‌کنه: هرچی توی
// یکی از دوتا بود (محلی یا ابری) نگه داشته می‌شه، هیچی دور ریخته نمی‌شه.
function mergeSavedStoryWordsFromCloud(cloudList) {
  if (!Array.isArray(cloudList) || !cloudList.length) return;
  const local = loadSavedStoryWords();
  const keyOf = (e) => `${e.langCode}::${normalizeWord(e.word)}`;
  const localMap = new Map(local.map((e) => [keyOf(e), e]));
  let changed = false;
  cloudList.forEach((cloudEntry) => {
    if (!cloudEntry || !cloudEntry.word || !cloudEntry.langCode) return;
    const key = keyOf(cloudEntry);
    const existing = localMap.get(key);
    if (!existing) {
      localMap.set(key, cloudEntry);
      changed = true;
    } else {
      // خودِ لغت هر دوجا هست — فقط ترجمه‌هایی که ابری داشت و محلی نداشت
      // رو اضافه می‌کنیم، بدون این‌که چیزی که محلی از قبل داشت رو عوض کنیم.
      const mergedTranslations = { ...(cloudEntry.translations || {}), ...(existing.translations || {}) };
      if (JSON.stringify(mergedTranslations) !== JSON.stringify(existing.translations || {})) {
        localMap.set(key, { ...existing, translations: mergedTranslations });
        changed = true;
      }
    }
  });
  if (!changed) return;
  const merged = Array.from(localMap.values()).sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
}

// یه تکه متن (یه کلمه، یه اصطلاح، یا حتی یه جمله‌ی کامل که کاربر انتخابش
// کرده) رو هم به انبار دائمیِ «لغات ذخیره‌شده» اضافه می‌کنه، هم — اگه
// داستان‌سازی همون لحظه باز باشه — به لیستِ انتخاب‌شده‌ی همون داستان.
// هم اون تابعیه که دکمه‌ی «افزودن به داستان‌ساز» زیرِ هر مثال، و هم
// انتخابِ آزادِ یه محدوده از متن (نگاه کن به ClickableSentence) صداش می‌زنن.
function addTextToStoryPicks(text, langCode) {
  const clean = (text || "").trim();
  if (!clean) return;
  ensureSavedStoryWord(clean, langCode);
  try {
    window.dispatchEvent(new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: clean, langCode } }));
  } catch {}
}

// ---------------------------------------------------------------------------
// مثال‌های ساخته‌شده‌ی هوش مصنوعی برای هر لغت/اصطلاح — کش می‌شن روی دستگاه
// تا هم دوباره از سرور خواسته نشن، هم وقتی مثالِ تازه‌ای ساخته می‌شه، لیستِ
// مثال‌های قبلی به AI داده بشه تا از تکرار پرهیز کنه. کلید هر ورودی، ترکیبِ
// زبان + خودِ لغت (نرمال‌شده) است؛ هر ورودی می‌تونه چند مثال و ترجمه‌ی
// هرکدوم به زبان‌های مختلف رو نگه داره.
const WORD_EXAMPLES_KEY = "phrasebook-word-examples-v1";
// وقتی مثالی ساخته/ترجمه می‌شه دیسپچ می‌شه — هم برای رفرش کامپوننت‌هایی که
// نشونش می‌دن، هم برای اینکه افکتِ ذخیره‌ی خودکار (پایینِ فایل) بفهمه یه
// تغییری افتاده و باید نسخه‌ی ابری رو هم به‌روز کنه — دقیقاً همون الگویی که
// برای لغاتِ ذخیره‌شده/یادداشت‌های گرامر استفاده شده، چون قبلاً این مثال‌ها
// فقط توی localStorage همین گوشی می‌موندن و با پاک‌شدنِ کش یا عوض‌کردنِ
// دستگاه از دست می‌رفتن.
const WORD_EXAMPLES_CHANGED_EVENT = "phrasebook:wordExamplesChanged";

function loadAllWordExamples() {
  try {
    const raw = window.localStorage.getItem(WORD_EXAMPLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function wordExamplesKey(word, langCode) {
  return `${langCode}::${normalizeWord(word)}`;
}
function loadWordExamples(word, langCode) {
  const all = loadAllWordExamples();
  return all[wordExamplesKey(word, langCode)] || [];
}
function saveWordExample(word, langCode, exampleText) {
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: exampleText,
    translations: {},
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
  return entry;
}
function updateWordExampleTranslation(word, langCode, exampleId, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const idx = list.findIndex((e) => e.id === exampleId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], translations: { ...(list[idx].translations || {}), [targetLangCode]: translatedText.trim() } };
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
}

// نسخه‌ی ابریِ مثال‌ها رو با نسخه‌ی محلی ادغام می‌کنه (نه جایگزینش) — هر
// مثالی که یا فقط محلی بود یا فقط ابری، نگه داشته می‌شه؛ چیزی گم نمی‌شه.
function mergeWordExamplesFromCloud(cloudAll) {
  if (!cloudAll || typeof cloudAll !== "object") return;
  const local = loadAllWordExamples();
  let changed = false;
  Object.keys(cloudAll).forEach((key) => {
    const cloudList = Array.isArray(cloudAll[key]) ? cloudAll[key] : [];
    const localList = local[key] || [];
    const localIds = new Set(localList.map((e) => e.id));
    const additions = cloudList.filter((e) => e && e.id && !localIds.has(e.id));
    if (additions.length) {
      local[key] = [...localList, ...additions];
      changed = true;
    }
  });
  if (!changed) return;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(local));
    window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
  } catch {}
}

// ---------------------------------------------------------------------------
// ترجمه‌ی هر لغتِ لیست به همه‌ی زبان‌های مقصدی که کاربر انتخاب کرده (نه فقط
// فارسی). چون خودِ دیتای WORDS_AZ/NEWS_WORDS/DAILY_WORDS فقط انگلیسی+فارسی
// دارن، بقیه‌ی زبان‌ها رو همین‌جا، لحظه‌ای و با همون زنجیره‌ی ترجمه‌ی رایگان
// (translateFree) می‌گیریم و روی دستگاه کش می‌کنیم — تا هر لغت فقط یه‌بار
// در طول عمر برنامه از سرور خواسته بشه، نه هر بار که کاربر اسکرول می‌کنه.
const WORD_TRANSLATIONS_KEY = "phrasebook-word-translations-v1";

function loadAllWordTranslations() {
  try {
    const raw = window.localStorage.getItem(WORD_TRANSLATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function wordTranslationKey(word, langCode) {
  return `${langCode}::${normalizeWord(word)}`;
}
function loadWordTranslation(word, langCode) {
  const all = loadAllWordTranslations();
  return all[wordTranslationKey(word, langCode)] || "";
}
function saveWordTranslation(word, langCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const all = loadAllWordTranslations();
  all[wordTranslationKey(word, langCode)] = translatedText.trim();
  try {
    window.localStorage.setItem(WORD_TRANSLATIONS_KEY, JSON.stringify(all));
  } catch {}
}

// از هوش مصنوعی یه مثالِ واقعی، امروزی و پرکاربرد برای یه لغت/اصطلاح خاص
// می‌خواد — و صریحاً می‌گیم چه مثال‌هایی قبلاً ساخته شدن تا تکراری نسازه.
async function generateWordExample({ word, langCode, meaningNative, nativeLabel, existingExamples, aiSettings }) {
  const langLabel = (typeof LANGUAGES !== "undefined" && LANGUAGES.find((l) => l.code === langCode)?.label) || langCode;
  const avoidBlock = existingExamples && existingExamples.length
    ? `Do NOT reuse or closely paraphrase any of these already-used examples for this same word:\n${existingExamples
        .map((e, i) => `${i + 1}. ${e}`)
        .join("\n")}\n\n`
    : "";
  const prompt =
    `Write exactly ONE natural example sentence in ${langLabel} that uses the word/expression "${word}"` +
    (meaningNative ? ` (its ${nativeLabel || "native-language"} meaning is: "${meaningNative}")` : "") +
    ` in a way that reflects REAL, current, everyday usage — the kind of sentence a native speaker might actually say or write today, ` +
    `optionally touching on everyday life, technology, or something plausibly connected to current news/world events. Avoid textbook-sounding, generic sentences. ` +
    `Keep it natural length (roughly 8-20 words), grammatically correct, and appropriate for a language learner to study.\n\n` +
    avoidBlock +
    `Respond with ONLY the example sentence itself in ${langLabel} — no quotes, no translation, no numbering, no explanation, nothing else.`;
  const result = await callAI({ prompt, maxTokens: 150, retries: 1, aiSettings });
  return String(result || "")
    .replace(/^["'«»]+|["'«».\s]+$/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Grammar notes — detailed, per-word grammar explanations the user chose to
// keep ("افزودن به یادگیری گرامر"), plus AI-checked practice sentences from
// the Grammar tab's chat. Stored per-device, global across every story —
// same pattern as SAVED_STORY_WORDS_KEY above.
// ---------------------------------------------------------------------------
const GRAMMAR_NOTES_KEY = "phrasebook-grammar-notes-v1";
const GRAMMAR_NOTES_CHANGED_EVENT = "phrasebook:grammarNotesChanged";

function loadGrammarNotes() {
  try {
    const raw = window.localStorage.getItem(GRAMMAR_NOTES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveGrammarNote({ langCode, word, sentence, markdown }) {
  if (!markdown) return null;
  const list = loadGrammarNotes();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    langCode,
    word: word || "",
    sentence: sentence || "",
    markdown,
    savedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
  return entry;
}

// Replaces a saved note's markdown in place — used to quietly upgrade a
// basic, offline-built note (word + translation + sentence, saved
// instantly with no AI/internet needed) into the AI's fuller grammar
// breakdown once/if that finishes loading in the background. The note is
function removeGrammarNote(id) {
  const list = loadGrammarNotes().filter((n) => n.id !== id);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// همون منطقِ ادغامِ mergeSavedStoryWordsFromCloud بالا، برای یادداشت‌های
// گرامری — چیزی که ابری داشت و محلی نداشت اضافه می‌شه، چیزی که محلی داشت
// دست‌نخورده می‌مونه؛ هیچ‌وقت overwrite کامل نمی‌شه.
function mergeGrammarNotesFromCloud(cloudList) {
  if (!Array.isArray(cloudList) || !cloudList.length) return;
  const local = loadGrammarNotes();
  const localIds = new Set(local.map((n) => n.id));
  const additions = cloudList.filter((n) => n && n.id && !localIds.has(n.id));
  if (!additions.length) return;
  const merged = [...additions, ...local].sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// never lost or left unsaved just because the AI backend is slow or down.
function updateGrammarNoteMarkdown(id, markdown) {
  if (!markdown) return;
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], markdown };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// Appends one Q&A pair to a saved note's own follow-up thread. Since the
// note itself is already saved, anything asked here is automatically
// persisted along with it — no separate "save" step needed.
function appendGrammarNoteThread(id, { question, answer }) {
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const thread = Array.isArray(list[idx].thread) ? list[idx].thread : [];
  list[idx] = { ...list[idx], thread: [...thread, { question, answer }] };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}

// Set once by PhrasebookMain (below) so any ClickableSentence popover,
// wherever it's rendered, can hand a word off to the Grammar tab without
// threading a callback prop through every intermediate component — same
// escape hatch style as the SAVED_WORDS_CHANGED_EVENT plumbing above.
let requestGrammarJump = null;

// Grammar-detail lookup (word popover → "Add to grammar learning"), rewritten so this ONE spot no
// longer depends on the AI knowing how to write fluently in the learner's native language:
// the AI always analyzes the sentence in fixed English, wrapping every real ${langLabel} example
// sentence in §§...§§ sentinels so it's protected; then localizeGrammarDetailMarkdown() below runs
// the English explanatory text (and only that) through the app's existing free online translation
// pipeline (translateFree — Google/MyMemory/Lingva/LibreTranslate, the same one lookupWordMeaning
// already uses) to turn it into whatever language the learner picked as nativeLang. No AI call is
// used for the localization step itself; askGrammarTeacher (the practice chat) is unrelated and
// intentionally left as-is.
async function lookupWordGrammarDetail({ word, sentence, langCode, nativeLang, nativeLabel, aiSettings, targetOrder }) {
  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label || langCode;
  const otherLangsLabel = (targetOrder || [])
    .filter((c) => c !== langCode && c !== nativeLang)
    .map((c) => LANGUAGES.find((l) => l.code === c)?.label || c)
    .join(", ");
  const prompt =
    `You are a language teacher explaining a grammar point to a beginner language learner.\n` +
    `User's native language: ${nativeLabel || nativeLang}\n` +
    `Language they are learning: ${langLabel}\n` +
    `Other languages they are learning simultaneously: ${otherLangsLabel || "None"}\n\n` +
    `Sentence: "${sentence}"\n` +
    `Word the user clicked on: "${word}"\n\n` +
    `Please explain the grammar point in ${nativeLang}. Follow the structure below, but make the explanation natural and fluent:\n\n` +
    `1. Give a natural translation of the sentence in ${nativeLang}.\n` +
    `2. Explain the role of the word "${word}" in this sentence and why it appears in this form.\n` +
    `3. Explain the main grammar point demonstrated by this sentence like a patient teacher. If there is a similar or different rule in the other languages (${otherLangsLabel}), mention it.\n` +
    `4. Give one additional example (different from the original sentence) that demonstrates the same point, along with its translation into ${nativeLang}.\n` +
    `5. Provide a simple trick to help remember this rule.\n\n` +
    `Keep the response short and useful (maximum 4–5 short paragraphs). Do not use technical terminology unless necessary.`;

  const text = await callAI({ prompt, maxTokens: 900, aiSettings });
  return text.trim();
}

// Localizes lookupWordGrammarDetail()'s fixed-English markdown into `nativeLang` using free online
// translation (translateFree) — no AI call. §§-wrapped ${langLabel} example sentences are left
// completely untouched (unwrapped, not translated); markdown headers keep their "## N." numbering
// and only the title text is translated; "**word** — meaning" bullets keep the bolded word as-is
// and translate only the meaning/role text after the dash; everything else is translated as a whole
// line. If nativeLang is English (or missing), no translation calls are made at all.
async function localizeGrammarDetailMarkdown(englishText, nativeLang, aiSettings) {
  const text = String(englishText || "");
  if (!nativeLang || nativeLang === "en") return text.replace(/§§/g, "");

  const lines = text.split(/\r?\n/);
  const translatedLines = await Promise.all(
    lines.map(async (raw) => {
      const line = raw.trim();
      if (!line) return raw;

      // A full ${langLabel} example sentence, protected by the AI — unwrap, never translate.
      const wrapped = line.match(/^§§(.+)§§$/);
      if (wrapped) return wrapped[1];

      // "## N. Title" — keep the "## N." numbering, translate just the title.
      const headerMatch = line.match(/^(#{1,3}\s*\d*\.?\s*)(.+)$/);
      if (headerMatch) {
        const [, prefix, title] = headerMatch;
        const translatedTitle = await translateFree(title, nativeLang, "en", aiSettings);
        return prefix + (translatedTitle || title);
      }

      // "- **word** — meaning, role" — keep the bolded ${langLabel} word untouched, translate
      // only the meaning/role text that follows the dash.
      const bulletMatch = line.match(/^(-\s*\*\*.+?\*\*\s*[—-]\s*)(.+)$/);
      if (bulletMatch) {
        const [, prefix, rest] = bulletMatch;
        const translatedRest = await translateFree(rest, nativeLang, "en", aiSettings);
        return prefix + (translatedRest || rest);
      }

      // Plain English commentary line — translate the whole thing.
      const translated = await translateFree(line, nativeLang, "en", aiSettings);
      return translated || line;
    })
  );

  return translatedLines.join("\n").replace(/§§/g, "");
}

// Acts as the AI "teacher" in the Grammar tab's practice chat. Two modes,
// decided by the AI itself from the message + recent history:
//   - a NEW sentence to check → full correction + word-by-word + examples
//   - a FOLLOW-UP question about the previous explanation (e.g. "چرا will
//     نه؟") → just answer the question directly, conversationally, no need
//     to redo the whole structured breakdown.
async function askGrammarTeacher({ userSentence, langCode, nativeLang, nativeLabel, aiSettings, history, targetOrder }) {
  const label = nativeLabel || "Persian";
  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label || langCode;
  const otherLangsLabel =
    (targetOrder || [])
      .filter((c) => c !== langCode && c !== nativeLang)
      .map((c) => LANGUAGES.find((l) => l.code === c)?.label || c)
      .join(", ") || "None";
  const historyText =
    (history || [])
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Learner" : "Teacher"}: ${m.text}`)
      .join("\n") || "None";
  const prompt =
    `You are a friendly, knowledgeable AI chat assistant inside a language-learning app — talk with the learner the same natural way any general-purpose AI chat assistant would. You're not limited to grammar; you can help with anything they bring up. On top of that, you're great at ${langLabel} practice.\n\n` +
    `Learner's native language: ${label}. Language they're currently practicing: ${langLabel}. Other languages they study: ${otherLangsLabel}.\n\n` +
    `Recent conversation:\n${historyText}\n\n` +
    `Learner just wrote: "${userSentence}"\n\n` +
    `How to respond:\n` +
    `- If this reads like a sentence they wrote in ${langLabel} to practice: check it warmly. Say if it's correct or not, give the corrected version if needed, explain briefly and simply why (in ${label}) — especially if the mistake looks like it came from mixing ${label} and ${langLabel} structure — then add one more example sentence in ${langLabel} with a ${label} translation.\n` +
    `- Otherwise, just answer naturally, like a normal, capable AI assistant would — any topic, any question, no restriction. Weave in an example phrase in ${langLabel} with translation only if it genuinely fits.\n` +
    `- Default to ${langLabel} for any language-practice content (translated into ${label}); only bring in ${otherLangsLabel} or English if the learner specifically asks about them or it clearly helps.\n` +
    `- Write in ${label}. Keep sentences in both languages clean and well-ordered, never jumbled. Keep the reply clear, well-organized, and not too long.`;

  const text = await callAI({ prompt, maxTokens: 1200, aiSettings });
  return text.trim();
}

// A tiny, purpose-built Markdown renderer — just enough for the specific
// shapes lookupWordGrammarDetail()/askGrammarTeacher() are prompted to
// produce (## / ### headers, **bold**, `inline code`, "- " bullet lists,
// "---" rules, plain paragraphs). Avoids pulling in a full Markdown package
// for what's really a fixed, known set of formatting the AI is instructed
// to use.
function mdInline(str, keyBase) {
  const parts = [];
  let rest = String(str || "");
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/;
  let key = 0;
  while (rest) {
    const m = rest.match(regex);
    if (!m) {
      parts.push(rest);
      break;
    }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[2] !== undefined) {
      parts.push(<b key={`${keyBase}-${key++}`}>{m[2]}</b>);
    } else if (m[3] !== undefined) {
      parts.push(
        <code
          key={`${keyBase}-${key++}`}
          dir="auto"
          style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontFamily: fontLatin }}
        >
          {m[3]}
        </code>
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}
// از متن مارک‌داونِ یک نکته‌ی گرامری، فقط جمله‌های زبان مقصد رو (برای خوندن
// با tts) بیرون می‌کشه — خط‌های ترجمه‌ی فارسی/زبان مادری، هدرها و علامت‌های
// مارک‌داون کنار گذاشته می‌شن، چون خوندنشون با صدای زبان مقصد اشتباه از آب
// در میاد.
function extractSpeakableText(markdown) {
  if (!markdown) return "";
  const lines = String(markdown).split(/\r?\n/);
  const kept = [];
  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) continue; // headers
    if (/^-{3,}$/.test(line)) continue; // hr
    line = line.replace(/^[-*]\s+/, ""); // list bullets
    line = line.replace(/^(ترجمه|Translation)\s*:\s*/i, "TRANSLATION::"); // mark translation lines
    if (line.startsWith("TRANSLATION::")) continue;
    if (/[\u0600-\u06FF]/.test(line)) continue; // skip Persian/Arabic-script lines
    line = line.replace(/^[❌✅🟢🟡🔴]\s*/u, "");
    line = line.replace(/\*\*/g, "").replace(/`/g, "");
    line = line.replace(/^\*\*?🔹.*?:\*\*?/, "").trim();
    if (!line) continue;
    kept.push(line);
  }
  return kept.join(". ");
}

// تشخیصِ سرهم‌دستیِ اینکه یه خط عمدتاً با حروف فارسی/عربی نوشته شده یا نه —
// برای اینکه بفهمیم کدوم خط‌های داخل توضیح گرامری، جمله‌ی زبان مقصده (باید
// کنارش دکمه‌ی 🔊 بذاریم) و کدوم‌ها ترجمه/توضیح فارسیه (نیازی به 🔊 نداره).
function isPersianScriptLine(s) {
  const persianChars = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const letters = (s.match(/[^\s\d.,;:!?()"'«»\-–—]/g) || []).length;
  return letters > 0 && persianChars / letters > 0.4;
}

function stripMdInline(s) {
  return String(s || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

function MiniMarkdown({ text, speakCode, nativeLang, aiSettings }) {
  if (!text) return null;
  // اگه زبان مقصد خودش فارسی/عربیه، نمی‌شه با اسکریپت تشخیص داد کدوم خط
  // ترجمه‌ست و کدوم جمله‌ی هدف؛ پس همیشه دکمه‌ی خوانش رو نشون بده.
  const alwaysSpeak = speakCode && ["fa", "ar"].includes(speakCode);
  const shouldSpeak = (line) => !!speakCode && (alwaysSpeak || !isPersianScriptLine(line));
  // خط‌های زبان مقصد (shouldSpeak) اگه nativeLang هم داشته باشیم، به‌جای
  // متن ساده با ClickableSentence نشون داده می‌شن — یعنی همون‌جا هم می‌شه
  // روی هر کلمه زد و «ذخیره برای داستان بعدی» / «افزودن به یادگیری گرامر»
  // رو زد، دقیقاً مثل تب عبارات و لغات.
  const renderContent = (content, key) => {
    if (nativeLang && shouldSpeak(content)) {
      return (
        <ClickableSentence
          text={stripMdInline(content)}
          langCode={speakCode}
          nativeLang={nativeLang}
          aiSettings={aiSettings}
        />
      );
    }
    return mdInline(content, key);
  };
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={blocks.length} style={{ margin: "4px 0 8px", paddingInlineStart: 18 }}>
          {listBuffer.map((li, i) => (
            // dir="auto" اینجا لازمه که برای هر خط جدا تصمیم بگیره راست‌چین
            // باشه یا چپ‌چین (بر اساس اولین حرفِ همون خط)، نه اینکه از یه
            // جهتِ کلیِ ثابت (که معمولاً فارسیه) برای کل کارت پیروی کنه —
            // وگرنه جمله‌های انگلیسیِ خالص هم بر عکس/به‌هم‌ریخته نشون داده
            // می‌شن، دقیقاً همون مشکلی که توی مثال‌ها پیش اومده بود.
            <li key={i} dir="auto" className="flex items-start gap-1" style={{ marginBottom: 2, lineHeight: 1.8, textAlign: "start" }}>
              {/* dir="auto" روی همین ردیف باعث می‌شه محورِ اصلیِ فلکس هم عوض
                  بشه: خط‌های فارسی rtl می‌مونن (بلندگو با order پیش‌فرض درست
                  سمت راست می‌شینه)، ولی خط‌های زبانِ خارجی auto می‌شن ltr —
                  اونجا باید edge="end" بدیم وگرنه بلندگو برعکس، سمت چپ
                  می‌افته و انگار تورفتگی/جابه‌جایی داره. */}
              {shouldSpeak(li) && <SpeakButton text={li} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(li) ? undefined : "end"} />}
              <span style={{ flex: 1 }}>{renderContent(li, `${blocks.length}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      return;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      const level = line.match(/^#+/)[0].length;
      const content = line.replace(/^#{1,3}\s+/, "");
      blocks.push(
        <p
          key={blocks.length}
          dir="auto"
          className="flex items-start gap-1"
          style={{
            fontWeight: 800,
            fontSize: level === 1 ? 16 : level === 2 ? 15 : 14,
            margin: "10px 0 4px",
            color: colors.ink,
            textAlign: "start",
          }}
        >
          {shouldSpeak(content) && <SpeakButton text={content} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(content) ? undefined : "end"} />}
          <span style={{ flex: 1 }}>{renderContent(content, blocks.length)}</span>
        </p>
      );
      return;
    }
    if (/^-{3,}$/.test(line)) {
      flushList();
      blocks.push(
        <hr key={blocks.length} style={{ border: "none", borderTop: `1px dashed ${colors.cardBorder}`, margin: "8px 0" }} />
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList();
    blocks.push(
      <p key={blocks.length} dir="auto" className="flex items-start gap-1" style={{ margin: "4px 0", lineHeight: 1.9, textAlign: "start" }}>
        {shouldSpeak(line) && <SpeakButton text={line} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(line) ? undefined : "end"} />}
        <span style={{ flex: 1 }}>{renderContent(line, blocks.length)}</span>
      </p>
    );
  });
  flushList();
  return <div>{blocks}</div>;
}


// ---------------------------------------------------------------------------
// Word Collections — lets a user bring in their own reference vocabulary
// list (e.g. a "504 Essential Words" book, a class word list, a personal
// deck for any language) and pick words from it in Story Builder.
//
// We deliberately don't ship any specific book's word list pre-loaded —
// published vocabulary books are copyrighted, so instead the user pastes
// in their own list (which they already have legal access to) and the app
// just gives them a structured, reusable, per-language "deck" built from
// it. One line per word, formats "word", "word - meaning", "word: meaning"
// are all understood.
// ---------------------------------------------------------------------------
const WORD_COLLECTIONS_KEY = "phrasebook-word-collections-v1";

function loadWordCollections() {
  try {
    const raw = window.localStorage.getItem(WORD_COLLECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveWordCollectionsList(list) {
  try {
    window.localStorage.setItem(WORD_COLLECTIONS_KEY, JSON.stringify(list));
  } catch {}
}
function parseCollectionText(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*[-–:=]\s*(.+)$/);
      return m ? { term: m[1].trim(), meaning: m[2].trim() } : { term: line, meaning: "" };
    })
    .filter((w) => w.term);
}
function addWordCollection({ langCode, title, rawText }) {
  const words = parseCollectionText(rawText);
  if (!title.trim() || !words.length) return null;
  const entry = {
    id: `${Date.now()}`,
    langCode,
    title: title.trim(),
    words,
    createdAt: new Date().toISOString(),
  };
  const list = loadWordCollections();
  list.unshift(entry);
  saveWordCollectionsList(list);
  return entry;
}
function deleteWordCollection(id) {
  saveWordCollectionsList(loadWordCollections().filter((c) => c.id !== id));
}
// Adds (or updates, if the term already exists) a single word inside an
// existing collection — this is what makes a collection "editable" instead
// of a one-time paste-and-done list.
function addWordToCollectionEntry(id, term, meaning) {
  const t = (term || "").trim();
  if (!t) return null;
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.filter((w) => normalizeWord(w.term) !== normalizeWord(t));
  words.unshift({ term: t, meaning: (meaning || "").trim() });
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}
function updateWordInCollectionEntry(id, originalTerm, patch) {
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.map((w) =>
    w.term === originalTerm
      ? { term: (patch.term ?? w.term).trim(), meaning: (patch.meaning ?? w.meaning ?? "").trim() }
      : w
  );
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}
function removeWordFromCollectionEntry(id, term) {
  const list = loadWordCollections();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const words = list[idx].words.filter((w) => w.term !== term);
  list[idx] = { ...list[idx], words };
  saveWordCollectionsList(list);
  return list[idx];
}

// ---------------------------------------------------------------------------
// نگاشتِ سطح (بالاتر، بعد از تعریفِ conversation) رو این‌جا صدا می‌زنیم —
// نگاه کن به LEVEL_BY_EN_WORD / lookupSavedWordLevel پایین‌ترِ همین فایل،
// دقیقاً بعد از «export const conversation».
function findInVocab(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return null;
  const hit = VOCAB.find((v) => normalizeWord(v.t[langCode]) === w);
  if (!hit) return null;
  return {
    pos: hit.pos,
    possiblePos: [hit.pos],
    posLabel: POS_FA[hit.pos] || hit.pos,
    possiblePosLabels: [POS_FA[hit.pos] || hit.pos],
    meaning: hit.meaningFa,
    meaningFa: hit.meaningFa,
    source: "vocab",
  };
}

// Looks up one tapped word's meaning, in this order:
//   1) the local VOCAB list (instant, fully offline)
//   2) a cached lookup from before (instant, fully offline)
//   3) the free translation chain (translateFree — Google → MyMemory →
//      Lingva → LibreTranslate, each one tried automatically if the last
//      failed/was unreachable)
// No AI backend involved anymore — this used to depend on an AI call for
// the word's part-of-speech, which meant the whole popover broke whenever
// that backend was asleep/unreachable. translateFree() itself never
// throws (see its own definition above): if literally every free service
// fails too, it just hands the original word back, so this function is
// never fully "cut off" — the popover always has *something* to show and
// save. Result is cached in localStorage per (word + language) so it only
// ever costs one network request per word per device.
async function lookupWordMeaning({ word, sentence, langCode, nativeLang }) {
  const local = nativeLang === "fa" ? findInVocab(word, langCode) : null;
  if (local) return local;

  const cacheKey = `${langCode}:${nativeLang}:${normalizeWord(word)}`;
  const cache = loadWordCache();
  if (cache[cacheKey]) return { ...cache[cacheKey], source: "cache" };

  const meaning = await translateFree(word, nativeLang || "fa", langCode);
  const result = { meaning: meaning || word };
  cache[cacheKey] = result;
  saveWordCache(cache);
  return { ...result, source: "translate" };
}

// ---------------------------------------------------------------------------
// DATA — this is placeholder/sample content, written from scratch (not taken
// from any book). Structure is built so you can keep adding languages,
// conversation , and vocabulary: just push more objects into the arrays below.
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: "fa", label: "فارسی", abbr: "FA" },
  { code: "en", label: "انگلیسی", abbr: "EN" },
  { code: "it", label: "ایتالیایی", abbr: "IT" },
  { code: "hi", label: "هندی", abbr: "HI" },
  { code: "tr", label: "ترکی", abbr: "TR" },
  { code: "ar", label: "عربی", abbr: "AR" },
  { code: "es", label: "اسپانیایی", abbr: "ES" },
  { code: "de", label: "آلمانی", abbr: "DE" },
  { code: "fr", label: "فرانسوی", abbr: "FR" },
  { code: "zh", label: "چینی", abbr: "ZH" },
  { code: "ko", label: "کره‌ای", abbr: "KO" },
  { code: "ru", label: "روسی", abbr: "RU" },
  { code: "ja", label: "ژاپنی", abbr: "JA" },
];

// Languages that read right-to-left — used so any text block (story
// sentences, translations, custom words the user types) gets the correct
// direction/alignment no matter which language it's actually written in,
// instead of inheriting the app's own RTL layout.
const RTL_LANGS = ["fa", "ar"];
const dirFor = (code) => (RTL_LANGS.includes(code) ? "rtl" : "ltr");

// Only these have real phrase/vocab data (conversation  / VOCAB below). Russian and
// Italian are only used as extra translation options in the Story Builder,
// which generates its translations live via AI rather than from static data.
// همه‌ی ۱۳ زبان الان توی خودِ لیست LANGUAGES هستن، پس این فیلتر همه رو نگه می‌داره —
// نگه داشته شده صرفاً برای سازگاری با بقیه‌ی کدی که PHRASEBOOK_LANGUAGES رو صدا می‌زنه.
const PHRASEBOOK_LANGUAGES = LANGUAGES;

// ---------------------------------------------------------------------------
// هماهنگ‌سازیِ دوطرفه‌ی ترتیبِ زبان‌ها بین دو جای مختلف صفحه:
//   ۱) ردیفِ مهرهای زبان (کادر آبی بالا — زبان مادری/مقصد) که با
//      langPickerOrder جابه‌جا می‌شه.
//   ۲) پیل‌های سفیدِ «ترتیب نمایش ترجمه‌ها» که با targetOrder جابه‌جا می‌شه.
// هر جفت تابع زیر یکی از این دو رو، بعد از جابه‌جایی توی اون یکی، تطبیق
// می‌ده — بدون این‌که موقعیتِ زبان‌های غیرمرتبط رو به‌هم بریزه.
// ---------------------------------------------------------------------------
// وقتی پیل‌های ترتیبِ ترجمه (targetOrder) جابه‌جا شدن: همون زبان‌ها رو، تو
// همون جایگاه‌هایی که قبلاً توی ردیفِ مهرها داشتن، به ترتیبِ تازه بچین.
function syncLangPickerFromTargetOrder(prevLangPickerOrder, nextTargetOrder) {
  const slots = [];
  prevLangPickerOrder.forEach((code, idx) => {
    if (nextTargetOrder.includes(code)) slots.push(idx);
  });
  if (!slots.length) return prevLangPickerOrder;
  const next = [...prevLangPickerOrder];
  slots.forEach((idx, i) => {
    next[idx] = nextTargetOrder[i];
  });
  return next;
}
// وقتی مهرها (langPickerOrder) جابه‌جا شدن: زبان‌های مقصدِ انتخاب‌شده رو با
// همون ترتیبِ تازه‌ی مهرها بازچینی کن.
function syncTargetOrderFromLangPicker(nextLangPickerOrder, prevTargetOrder) {
  const next = nextLangPickerOrder.filter((c) => prevTargetOrder.includes(c));
  return next.length === prevTargetOrder.length ? next : prevTargetOrder;
}

const CATEGORIES = {
  greetings: "احوال‌پرسی",
  airport: "فرودگاه",
  restaurant: "رستوران",
  shopping: "خرید",
  hotel: "هتل",
  directions: "جهت‌یابی",
  emergency: "اضطراری",
  numbers: "اعداد و زمان",
  meeting: "ملاقات",
  introducing: "معرفی کردن",
  old_friend: "دوست قدیمی",
  acquainted: "آشنایی",
  invitation: "دعوت",
  goodbye: "خداحافظی",
  telephone: "تلفن",
  transport: "حمل‌ونقل",
  taxi: "تاکسی",
  common: "عبارات رایج",
  exercises: "تمرین مکالمه",
  bus: "اتوبوس",
  rental: "اجاره ماشین",
  train: "قطار",
  gas: "پمپ بنزین",
  repair: "تعمیر ماشین",
};

export const conversation = [
  ];

// ---------------------------------------------------------------------------
// نگاشتِ لغت/عبارت/جمله → سطح (A1..C2)، برای نشون‌دادنِ سطح توی پنل «لغات
// ذخیره‌شده» — هم برای تک‌لغت، هم برای اصطلاح/عبارت، هم برای کل یه جمله؛
// چون با قابلیتِ «انتخابِ آزادِ متن → افزودن به داستان» کاربر می‌تونه هرکدوم
// از این‌ها رو ذخیره کنه، نه فقط تک‌کلمه. این نگاشت‌ها فقط یه‌بار (موقع لود
// شدنِ ماژول) از روی دیتای موجود ساخته می‌شن، نه هر بار که پنل رندر می‌شه.
// باید بعد از تعریفِ conversation بیاد چون بهش نیاز داره.
//   ۱) WORDS_AZ / NEWS_WORDS / DAILY_WORDS: تک‌لغتِ انگلیسی (فیلد en).
//   ۲) VOCAB: تک‌لغت/عبارتِ چندزبانه (t.fa, t.en, ...).
//   ۳) conversation (دیتای تبِ «عبارات»/اصطلاحات): همون شکلِ VOCAB —
//      چندزبانه (t.*) + level؛ هر وقت این دیتاست پر بشه، خودکار پوشش داده
//      می‌شه، نیازی به تغییرِ کد نیست.
//   ۴) DAILY_CONVERSATIONS (تبِ «مکالمه»): هر خطِ انگلیسیِ هر سناریو
//      (speakerA + speakerB) خودش یه سطح مستقل داره؛ این‌جا همه‌شون رو
//      مسطح می‌کنیم تا جمله‌های کاملِ ذخیره‌شده هم سطح‌شون پیدا بشه.
// اگه یه لغت/جمله تو چندجا با سطح‌های متفاوت باشه، اولین موردی که پیدا
// می‌شه می‌مونه (کافیه، چون هدف فقط راهنماییِ تقریبیه نه مرجعِ رسمی).
// ---------------------------------------------------------------------------
const LEVEL_BY_EN_WORD = new Map();
[...WORDS_AZ, ...NEWS_WORDS, ...DAILY_WORDS].forEach((w) => {
  const key = normalizeWord(w.en);
  if (key && !LEVEL_BY_EN_WORD.has(key)) LEVEL_BY_EN_WORD.set(key, w.level);
});
(DAILY_CONVERSATIONS || []).forEach((sc) => {
  [...(sc.speakerA || []), ...(sc.speakerB || [])].forEach((it) => {
    const key = normalizeWord(it.en);
    if (key && it.level && !LEVEL_BY_EN_WORD.has(key)) LEVEL_BY_EN_WORD.set(key, it.level);
  });
});
const LEVEL_BY_LANG_WORD = new Map();
[...VOCAB, ...conversation].forEach((v) => {
  if (!v.level) return;
  Object.entries(v.t || {}).forEach(([code, text]) => {
    const key = `${code}:${normalizeWord(text)}`;
    if (text && !LEVEL_BY_LANG_WORD.has(key)) LEVEL_BY_LANG_WORD.set(key, v.level);
  });
});
// سطحِ یک لغت/اصطلاح/جمله‌ی ذخیره‌شده رو از روی دیتای محلی پیدا می‌کنه —
// کاملاً افلاین و آنی، بدون نیاز به AI یا شبکه. اگه متن تو هیچ‌کدوم از
// دیتاست‌های محلی نبود (مثلاً جمله‌ای که کاربر خودش از یه متنِ آزاد
// انتخاب کرده و عیناً تو هیچ لیستی نیست)، null برمی‌گردونه و پنل به‌جای
// بج سطح، چیزی نشون نمی‌ده.
function lookupSavedWordLevel(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return null;
  if (langCode === "en" && LEVEL_BY_EN_WORD.has(w)) return LEVEL_BY_EN_WORD.get(w);
  const key = `${langCode}:${w}`;
  if (LEVEL_BY_LANG_WORD.has(key)) return LEVEL_BY_LANG_WORD.get(key);
  return null;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function LangStamp({ lang, active, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        fontFamily: fontFa,
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: `2px dashed ${active ? colors.gold : colors.cardBorder}`,
        backgroundColor: active ? colors.gold : "transparent",
        color: active ? colors.paper : colors.inkSoft,
        fontWeight: 700,
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
      aria-pressed={active}
      title={disabled ? `${lang.label} (زبان مادری‌ته، نمی‌تونه هم‌زمان مقصد باشه)` : lang.label}
    >
      {lang.abbr}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ردیفِ قابل‌کشیدنِ زبان‌ها — همون LangStamp‌های قبلی رو نشون می‌ده (برای
// انتخابِ زبان مادری/مقصد با یه تپ ساده)، و کل ردیف همیشه با اسکرولِ افقیِ
// طبیعیِ خودِ مرورگر (بدون هیچ دخالتی) لغزنده می‌مونه — چون دقیقاً همون
// حرکتِ افقی هم برای اسکرول و هم برای جابه‌جایی استفاده می‌شه، این دو با
// «نگه‌داشتنِ طولانی» (long-press) از هم جدا می‌شن، نه با آستانه‌ی حرکت:
//   - تپِ سریع (بدون نگه‌داشتن) → همون انتخابِ زبانِ قبلی.
//   - کشیدنِ سریع/پیوسته (بدون مکث) → اسکرولِ عادیِ ردیفه، هیچ preventDefault
//     ای صدا زده نمی‌شه، برای همین دیگه هنگ/کندی نداره.
//   - لمس و نگه‌داشتن حدود سیصد میلی‌ثانیه بدونِ حرکتِ زیاد → حالتِ
//     جابه‌جایی فعال می‌شه (مهر کمی بزرگ‌تر می‌شه)، از اون لحظه حرکت
//     دادنِ انگشت باعثِ عوض‌شدنِ ترتیب می‌شه، نه اسکرول.
//   - با ماوس (دسکتاپ) نیازی به نگه‌داشتن نیست، چون کشیدن-با-کلیک روی این
//     ردیف اصلاً اسکرولی رو راه نمی‌ندازه؛ همون آستانه‌ی چندپیکسلی کافیه.
// ---------------------------------------------------------------------------
function DraggableLangRow({ order, setOrder, languages, isActive, isDisabled, onClick }) {
  const dragState = useRef({ code: null, startX: 0, startY: 0, dragging: false, longPressTimer: null });
  const [dragCode, setDragCode] = useState(null);

  function clearLongPress(st) {
    if (st.longPressTimer) {
      clearTimeout(st.longPressTimer);
      st.longPressTimer = null;
    }
  }

  function reorderTo(code, clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const stampEl = el && el.closest("[data-lang-order-code]");
    if (!stampEl) return;
    const hoveredCode = stampEl.getAttribute("data-lang-order-code");
    if (hoveredCode === code) return;
    const fromIndex = order.indexOf(code);
    const toIndex = order.indexOf(hoveredCode);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, code);
    setOrder(next);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      const st = dragState.current;
      if (!st.code) return;
      if (!st.dragging) {
        const dx = Math.abs(e.clientX - st.startX);
        const dy = Math.abs(e.clientY - st.startY);
        if (dx < 8 && dy < 8) return; // هنوز آستانه‌ی کشیدن رد نشده — تپ حساب می‌شه
        st.dragging = true;
        setDragCode(st.code);
      }
      reorderTo(st.code, e.clientX, e.clientY);
    }
    function handleTouchMove(e) {
      const st = dragState.current;
      if (!st.code) return;
      const t = e.touches[0];
      if (!st.dragging) {
        // هنوز long-press فعال نشده — اگه انگشت زیاد جابه‌جا شده، یعنی
        // کاربر داره اسکرول می‌کنه، نه نگه‌می‌داره؛ بی‌خیالِ کاندیدشدنِ
        // این لمس برای کشیدن می‌شیم و می‌ذاریم اسکرولِ عادی انجام بشه.
        const dx = Math.abs(t.clientX - st.startX);
        const dy = Math.abs(t.clientY - st.startY);
        if (dx > 10 || dy > 10) {
          clearLongPress(st);
          st.code = null;
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      reorderTo(st.code, t.clientX, t.clientY);
    }
    function handleUp() {
      const st = dragState.current;
      clearLongPress(st);
      dragState.current = { code: null, startX: 0, startY: 0, dragging: false, longPressTimer: null };
      setDragCode(null);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [order, setOrder]);

  // زبان‌هایی که هنوز توی order نیستن (مثلاً بعداً به PHRASEBOOK_LANGUAGES
  // اضافه شدن) آخرِ ردیف نشون داده می‌شن تا از دست نرن.
  const orderedLangs = [
    ...order.map((code) => languages.find((l) => l.code === code)).filter(Boolean),
    ...languages.filter((l) => !order.includes(l.code)),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
      {orderedLangs.map((l) => (
        <div
          key={l.code}
          data-lang-order-code={l.code}
          onMouseDown={(e) => {
            dragState.current = { code: l.code, startX: e.clientX, startY: e.clientY, dragging: false, longPressTimer: null };
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            const st = { code: l.code, startX: t.clientX, startY: t.clientY, dragging: false, longPressTimer: null };
            dragState.current = st;
            st.longPressTimer = setTimeout(() => {
              // اگه تا این لحظه هنوز همین لمس زنده‌ست (با حرکتِ زیاد لغو
              // نشده)، وارد حالتِ جابه‌جایی می‌شیم.
              if (dragState.current === st && st.code) {
                st.dragging = true;
                setDragCode(st.code);
              }
            }, 320);
          }}
          style={{
            touchAction: "pan-x",
            cursor: "grab",
            flexShrink: 0,
            transform: dragCode === l.code ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.12s",
          }}
        >
          <LangStamp
            lang={l}
            active={isActive(l.code)}
            disabled={isDisabled ? isDisabled(l.code) : false}
            onClick={() => {
              if (!dragState.current.dragging) onClick(l.code);
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hamburger settings menu — theme color, font family, font size. Appears as
// a dropdown panel from the header. Appearance prefs are device-level
// (appPrefs/setAppPrefs, persisted via APP_PREFS_KEY) so they apply
// immediately across the whole app, including the login screen.
// ---------------------------------------------------------------------------
// ============================================================
// دانلود آفلاین لغات — زبان(ها) رو انتخاب می‌کنی، همه‌ی لغات لیست‌های
// VOCAB / WORDS_AZ / NEWS_WORDS / DAILY_WORDS رو یکی‌یکی با همون زنجیره‌ی
// سرویس‌های رایگان (translateFree) ترجمه می‌کنه و توی IndexedDB ذخیره
// می‌کنه. بعد از اون، همون کلمات کاملاً آفلاین در دسترسن (چون translateFree
// اول کش رو چک می‌کنه). اگه وسط کار قطع بشه، دفعه‌ی بعد فقط لغاتِ باقی‌مونده
// رو ادامه می‌ده (لغاتی که قبلاً کش شدن رد می‌شن، پس منابع رو هدر نمی‌ده).
// ============================================================
function OfflineWordsModal({ open, onClose, aiSettings }) {
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [currentWord, setCurrentWord] = useState("");
  const [cachedCount, setCachedCount] = useState(null);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      getTranslationCacheCount().then(setCachedCount);
      setFinished(false);
    }
  }, [open]);

  const allWords = useMemo(() => {
    const map = new Map();
    [VOCAB, WORDS_AZ, NEWS_WORDS, DAILY_WORDS].forEach((list) => {
      (list || []).forEach((w) => {
        if (w?.en && !map.has(w.en)) map.set(w.en, true);
      });
    });
    return Array.from(map.keys());
  }, []);

  if (!open) return null;

  const toggleLang = (code) => {
    setSelectedLangs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const startDownload = async () => {
    if (selectedLangs.length === 0 || running) return;
    setRunning(true);
    setFinished(false);
    cancelRef.current = false;

    const jobs = [];
    selectedLangs.forEach((lang) => allWords.forEach((word) => jobs.push({ word, lang })));
    setProgress({ done: 0, total: jobs.length });

    let doneCount = 0;
    const CONCURRENCY = 4;
    let cursor = 0;

    async function worker() {
      while (cursor < jobs.length) {
        if (cancelRef.current) return;
        const job = jobs[cursor++];
        setCurrentWord(job.word);
        try {
          await translateFree(job.word, job.lang, "en", aiSettings);
        } catch {
          // اگه یه کلمه شکست خورد، بی‌خیالش می‌شیم و می‌ریم سراغ بعدی
        }
        doneCount++;
        setProgress({ done: doneCount, total: jobs.length });
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    setFinished(!cancelRef.current);
    getTranslationCacheCount().then(setCachedCount);
  };

  const cancelDownload = () => {
    cancelRef.current = true;
    setRunning(false);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      onClick={() => !running && onClose()}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.paper, borderRadius: 18, padding: 20, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>دانلود آفلاین لغات</p>
          {!running && (
            <button onClick={onClose} aria-label="بستن">
              <X size={18} color={colors.inkSoft} />
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.8, marginBottom: 14 }}>
          زبان‌های موردنظرت رو انتخاب کن. برنامه {allWords.length.toLocaleString("fa-IR")} لغت رو یکی‌یکی با سرویس‌های ترجمه‌ی رایگان ترجمه و روی گوشی ذخیره می‌کنه — فقط همین یک‌بار به اینترنت نیاز داره؛ بعدش این لغات کاملاً آفلاین در دسترسن.
        </p>

        {!running && !finished && (
          <>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
              {LANGUAGES.filter((l) => l.code !== "en").map((l) => (
                <button
                  key={l.code}
                  onClick={() => toggleLang(l.code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: `1.5px solid ${selectedLangs.includes(l.code) ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selectedLangs.includes(l.code) ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={startDownload}
              disabled={selectedLangs.length === 0}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                backgroundColor: selectedLangs.length ? colors.ink : "#ccc",
                color: colors.paper,
              }}
            >
              شروع دانلود
              {selectedLangs.length > 0 && ` (${(allWords.length * selectedLangs.length).toLocaleString("fa-IR")} ترجمه)`}
            </button>
          </>
        )}

        {running && (
          <>
            <div style={{ height: 10, borderRadius: 6, backgroundColor: "#eee", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.gold, transition: "width .2s" }} />
            </div>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
              {progress.done.toLocaleString("fa-IR")} از {progress.total.toLocaleString("fa-IR")} ({pct}٪)
            </p>
            <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 16, direction: "ltr", textAlign: "left", opacity: 0.7 }}>
              {currentWord}
            </p>
            <button
              onClick={cancelDownload}
              style={{ width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `1.5px solid ${colors.rose}`, color: colors.rose }}
            >
              لغو
            </button>
          </>
        )}

        {finished && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>✅ تمام شد</p>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 16 }}>
              الان {cachedCount?.toLocaleString("fa-IR")} ترجمه روی گوشی ذخیره‌ست و کاملاً آفلاین در دسترسه.
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, backgroundColor: colors.ink, color: colors.paper }}>
              باشه
            </button>
          </div>
        )}

        {!running && !finished && cachedCount !== null && cachedCount > 0 && (
          <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 12, textAlign: "center" }}>
            {cachedCount.toLocaleString("fa-IR")} ترجمه از قبل ذخیره شده (این‌ها دوباره دانلود نمی‌شن)
          </p>
        )}
      </div>
    </div>
  );
}

function SettingsMenu({ appPrefs, setAppPrefs, user, onLogout, aiSettings }) {
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const update = (key, value) => setAppPrefs((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="تنظیمات"
        title="تنظیمات"
        style={{ color: colors.goldSoft, display: "flex" }}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          dir="rtl"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            width: 280,
            maxHeight: "70vh",
            overflowY: "auto",
            backgroundColor: colors.paper,
            color: colors.ink,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            zIndex: 50,
          }}
        >
          {/* Account */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>حساب کاربری</p>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.gold, color: colors.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "کاربر"}</p>
              <p style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: colors.rose, marginBottom: 16 }}
          >
            <LogOut size={14} /> خروج از حساب
          </button>

          {/* Theme */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Palette size={14} /> رنگ و تم
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => update("theme", key)}
                title={t.label}
                aria-pressed={appPrefs.theme === key}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  backgroundColor: t.swatch,
                  border: appPrefs.theme === key ? `3px solid ${colors.ink}` : `1px solid ${colors.cardBorder}`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Font family */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={14} /> نوع فونت
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_FONTS).map(([key, f]) => (
              <button
                key={key}
                onClick={() => update("font", key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${appPrefs.font === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: appPrefs.font === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Font size */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>اندازه‌ی فونت</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_FONT_SIZES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => update("fontSize", key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${appPrefs.fontSize === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: appPrefs.fontSize === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Offline words download */}
          <button
            onClick={() => setOfflineModalOpen(true)}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%" }}
          >
            <BookOpen size={14} /> دانلود آفلاین لغات
          </button>
        </div>
      )}

      <OfflineWordsModal open={offlineModalOpen} onClose={() => setOfflineModalOpen(false)} aiSettings={aiSettings} />
    </div>
  );
}

function TabButton({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
      style={{
        fontFamily: fontFa,
        backgroundColor: active ? colors.ink : "transparent",
        color: active ? colors.paper : colors.inkSoft,
        border: `1px solid ${active ? colors.ink : colors.cardBorder}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function SpeakButton({ text, code, color, edge, forceRepeat, startOffset, onPlayed }) {
  const locale = TTS_LOCALE[code] || "en-US";
  const myKey = `${locale}::${text}`;
  const [state, setState] = useState(() => speechController.getState());

  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.key === myKey && state.status !== "idle";
  const isPlaying = isActive && state.status === "playing";
  const c = color || colors.gold;

  const handleToggle = (e) => {
    e.stopPropagation();
    const result = speechController.toggle(text, code, startOffset, forceRepeat ? { loop: true } : undefined);
    if (onPlayed) onPlayed();
    // "no-voice" دیگه پیش نمی‌آد چون خودکار می‌ره سراغ سرویس آنلاین رایگان
    // (result === "online-fallback")؛ فقط وقتی هیچ راهی — نه گوشی نه آنلاین —
    // ممکن نبود، خطا نشون می‌دیم.
    if (result === "unsupported") {
      alert("این مرورگر از خوندن صوتی متن پشتیبانی نمی‌کنه.");
    } else if (result === "error") {
      alert("پخش صدا با مشکل مواجه شد. اتصال اینترنت رو چک کن و دوباره امتحان کن.");
    }
  };

  // این آیکون همیشه باید سمت راستِ ردیف بشینه، صرف‌نظر از اینکه توی JSX
  // کجا نوشته شده. توی یه ردیفِ راست‌چین (که پیش‌فرضِ کل اپه) «سمت راست»
  // یعنی اولِ محور اصلی، پس order: -1 کافیه. اما چند جای خاص از اپ
  // (مثلاً ردیف کلمه‌ی دیکشنری یا جمله‌های داستان به زبان خارجی) به‌خاطر
  // محتوای لاتین، خودِ ردیف رو dir="ltr" می‌کنن؛ اونجا «سمت راست» یعنی
  // آخرِ محور اصلی، پس با پراپ edge="end" یه order خیلی بزرگ می‌گیره.
  const orderStyle = edge === "end" ? 999 : -1;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, order: orderStyle }}>
      <button
        onClick={handleToggle}
        aria-label={isPlaying ? "توقف موقت" : "تلفظ"}
        title={isPlaying ? "توقف موقت" : isActive ? "ادامه" : "تلفظ"}
        style={{ 
          flexShrink: 0, 
          display: "flex", 
          alignItems: "center", 
          color: c,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
      </button>
    </span>
  );
}
// دکمه‌ی تکرار سراسری — یک تنظیم مشترکه که خودِ speechController نگهش
// می‌داره؛ هر جا کاربر روی هر 🔊ای کلیک کنه همین تنظیم روش اعمال می‌شه.
// به همین خاطر لازم نیست کنار تک‌تک جمله‌ها/عبارت‌ها دکمه‌ی 🔁 جدا بذاریم —
// یکی بالای هر بخش کافیه.
function RepeatButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const handleClick = (e) => {
    e.stopPropagation();
    speechController.cycleGlobalRepeat();
  };

  const c = color || colors.gold;
  const repeatSetting = state.globalRepeatSetting;
  const active = repeatSetting !== 0;
  const label = repeatSetting === "inf" ? "∞" : repeatSetting === 0 ? "" : String(repeatSetting);

  return (
    <button
      onClick={handleClick}
      aria-label="تکرار سراسری"
      title={
        repeatSetting === 0
          ? "تکرار خاموش — بزن روشن کن (روی هر جمله/پاراگرافی که پخش کنی اعمال می‌شه)"
          : repeatSetting === "inf"
          ? "تکرار بی‌نهایت — بزن خاموش کن"
          : `تکرار ${repeatSetting} بار — روی هر 🔊ای که بزنی اعمال می‌شه`
      }
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        color: active ? c : colors.cardBorder,
        opacity: active ? 1 : 0.6,
      }}
    >
      <Repeat size={15} />
      {label && (
        <span
          style={{
            position: "absolute",
            top: -5,
            right: -7,
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            backgroundColor: c,
            color: "white",
            borderRadius: 6,
            padding: "1px 3px",
            minWidth: 10,
            textAlign: "center",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
// دکمه‌ی «خواندن خودکار» — یک لیست از {text, code, el} می‌گیره (el اختیاریه،
// برای اسکرول‌کردن خودکار به همون آیتم) و پشت سر هم، با توجه به تنظیم
// تکرار سراسری (RepeatButton بالاتر)، هرکدوم رو می‌خونه؛ وقتی یه آیتم تمام
// تکرارهاش تموم شد (status از speechController میره رو idle)، خودش می‌ره
// سراغ آیتم بعدی و صفحه رو با اسکرول نرم به همون‌جا می‌بره.
function AutoReadButton({ getItems, color, label, trackLangCode, modeKey }) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const idxRef = useRef(0);
  // پاراگرافی که آیتمِ در حال خواندنِ فعلی بهش تعلق داره (نه ایندکسِ خام تو
  // لیست — چون طول لیست با عوض‌شدنِ حالت جمله‌به‌جمله/پاراگراف‌به‌پاراگراف
  // فرق می‌کنه). با همین، وقتی کاربر وسط خواندنِ خودکار حالت رو عوض می‌کنه
  // می‌فهمیم دقیقاً کجای داستانیم و می‌تونیم تو لیستِ تازه هم از همون‌جا
  // ادامه بدیم.
  const piRef = useRef(0);
  const lastKeyRef = useRef(null);
  // آخرین لیستِ آیتم‌هایی که واقعاً باهاش پخش شروع شده (یعنی مالِ حالتِ
  // نمایشِ *قبلی*، نه تازه‌ترین). لازمه چون وقتی modeKey عوض می‌شه،
  // getItemsRef.current() دیگه لیستِ حالتِ قدیم رو نمی‌ده — برای محاسبه‌ی
  // اینکه دقیقاً کجای متن بودیم، به همین لیستِ قدیمی نیاز داریم.
  const lastItemsRef = useRef([]);
  const [elapsed, setElapsed] = useState(0);
  // همیشه آخرین getItems (یعنی آخرین انتخاب کاربر برای جمله‌به‌جمله/
  // پاراگراف‌به‌پاراگراف) رو نگه می‌داره. چون این ref هر رندر آپدیت می‌شه ولی
  // خودِ آبجکتش عوض نمی‌شه، حتی effectِ زیرین (که فقط یه‌بار موقع mount اجرا
  // می‌شه و playAt رو closure می‌کنه) هم با خوندن getItemsRef.current همیشه
  // به آخرین انتخاب کاربر می‌رسه — نه یه نسخه‌ی قدیمی که موقع mount گیر کرده.
  const getItemsRef = useRef(getItems);
  useEffect(() => {
    getItemsRef.current = getItems;
  });

  // تایمرِ زنده — تا کاربر همون لحظه ببینه چقدر داره می‌خونه.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  function playAt(i, startCharOffset) {
    if (!activeRef.current) return;
    const items = (getItemsRef.current && getItemsRef.current()) || [];
    lastItemsRef.current = items;
    if (i >= items.length) {
      activeRef.current = false;
      setActive(false);
      lastKeyRef.current = null;
      return;
    }
    const item = items[i];
    idxRef.current = i;
    if (!item || !item.text) {
      playAt(i + 1);
      return;
    }
    if (item.pi !== undefined) piRef.current = item.pi;
    if (item.el && item.el.scrollIntoView) {
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const locale = TTS_LOCALE[item.code] || "en-US";
    lastKeyRef.current = `${locale}::${item.text}`;
    speechController.toggle(item.text, item.code, startCharOffset);
  }

  useEffect(() => {
    return speechController.subscribe((state) => {
      if (!activeRef.current) return;
      if (state.status !== "idle" || !state.key) return;
      if (state.key === lastKeyRef.current) {
        // خودِ آیتمِ جاریِ خواندن خودکار تموم شد — برو سراغ بعدی.
        playAt(idxRef.current + 1);
      } else if (lastKeyRef.current) {
        // یه پخشِ دیگه (مثلاً تلفظِ یه لغت که کاربر روش زده) وسط خواندن
        // خودکار اجرا و تموم شد — به‌جای اینکه خواندن خودکار متوقف بمونه یا
        // از اول شروع بشه، دقیقاً از همون جمله/پاراگرافی که قطع شده بود
        // ادامه پیدا می‌کنه.
        playAt(idxRef.current);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // اگه کامپوننت از بین رفت وسط خوندن خودکار، پخش رو نگه‌دار.
    return () => {
      if (activeRef.current) {
        activeRef.current = false;
        speechController.stop();
      }
    };
  }, []);

  // کاربر وسط خواندنِ خودکار، حالتِ نمایش ترجمه رو عوض کرد (جمله‌به‌جمله
  // ↔ پاراگراف‌به‌پاراگراف ↔ هیچکدام) — به‌جای اینکه صدا قطع بشه یا از اولِ
  // جمله/پاراگرافِ تازه از نو شروع بشه، دقیقاً از همون نقطه‌ای که تا الان
  // خونده بودیم ادامه پیدا می‌کنه. برای این کار، نقطه‌ی فعلی رو نسبت به
  // متنِ کاملِ همون پاراگراف اندازه می‌گیریم (چون متنِ حالتِ پاراگراف/هیچکدام
  // دقیقاً حاصلِ چسبوندنِ جمله‌های همون پاراگرافه با فاصله)، بعد همون آفست
  // رو تو ساختارِ تازه (جمله‌به‌جمله یا پاراگراف‌به‌پاراگراف) پیدا می‌کنیم.
  const prevModeKeyRef = useRef(modeKey);
  useEffect(() => {
    if (modeKey === prevModeKeyRef.current) return;
    prevModeKeyRef.current = modeKey;
    if (!activeRef.current) return;

    const pi = piRef.current;
    const oldItems = lastItemsRef.current || [];
    const newItems = (getItemsRef.current && getItemsRef.current()) || [];
    const oldPlayingItem = oldItems[idxRef.current];

    function fallback() {
      let newIdx = newItems.findIndex((it) => it.pi === pi);
      if (newIdx === -1) newIdx = 0;
      playAt(newIdx);
    }

    if (!oldPlayingItem) {
      fallback();
      return;
    }

    // آفستِ فعلی، داخلِ متنِ آیتمِ در حال پخشِ قبلی (سبک قدیم).
    const localOffset = speechController.getCharOffset();

    // اگه اون آیتم خودش تنها بخشِ این پاراگراف بود (یعنی حالتِ قبلی
    // پاراگراف/هیچکدام بوده)، این آفست همون آفستِ داخلِ کلِ پاراگرافه.
    // اگه چند جمله برای این پاراگراف بوده (حالتِ قبلی جمله‌به‌جمله)، باید
    // طولِ جمله‌های قبلیِ همون پاراگراف رو هم اضافه کنیم.
    const oldOfParagraph = oldItems.filter((it) => it.pi === pi);
    let paragraphOffset = localOffset;
    if (oldOfParagraph.length > 1) {
      let acc = 0;
      for (const it of oldOfParagraph) {
        if (it === oldPlayingItem) {
          paragraphOffset = acc + localOffset;
          break;
        }
        acc += it.text.length + 1; // +1 برای فاصله‌ای که بینِ جمله‌ها موقعِ چسبوندن گذاشته می‌شه
      }
    }

    const newOfParagraph = newItems.filter((it) => it.pi === pi);
    let targetItem = null;
    let targetOffset = 0;
    if (newOfParagraph.length > 1) {
      // مقصد جمله‌به‌جمله‌ست — ببین این آفست تو کدوم جمله می‌افته.
      let acc = 0;
      for (let k = 0; k < newOfParagraph.length; k++) {
        const it = newOfParagraph[k];
        const end = acc + it.text.length;
        if (paragraphOffset <= end || k === newOfParagraph.length - 1) {
          targetItem = it;
          targetOffset = Math.max(0, paragraphOffset - acc);
          break;
        }
        acc = end + 1;
      }
    } else if (newOfParagraph.length === 1) {
      targetItem = newOfParagraph[0];
      targetOffset = paragraphOffset;
    }

    if (!targetItem) {
      fallback();
      return;
    }

    const newIdx = newItems.indexOf(targetItem);
    const newLocale = TTS_LOCALE[targetItem.code] || "en-US";
    const newKeyForTarget = `${newLocale}::${targetItem.text}`;
    if (newKeyForTarget === lastKeyRef.current) {
      // متنِ آیتمِ تازه با متنی که همین الان داره پخش می‌شه یکیه (مثلاً
      // جابه‌جایی بینِ «پاراگراف‌به‌پاراگراف» و «هیچکدام» که هر دو از
      // متنِ یکسانی استفاده می‌کنن) — پس صدا اصلاً قطع نشده و کاری لازم
      // نیست، فقط ایندکس/پاراگرافِ ردگیری‌شده رو به‌روز می‌کنیم.
      idxRef.current = newIdx;
      lastItemsRef.current = newItems;
      return;
    }

    const startCharOffset = Math.max(0, Math.min(targetOffset, Math.max(targetItem.text.length - 1, 0)));

    playAt(newIdx, startCharOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeKey]);

  const c = color || colors.gold;

  function handleClick(e) {
    e.stopPropagation();
    if (active) {
      activeRef.current = false;
      setActive(false);
      speechController.stop();
    } else {
      activeRef.current = true;
      idxRef.current = 0;
      setActive(true);
      playAt(0);
    }
  }

  return (
    <span className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className="flex items-center gap-1"
        style={{
          color: active ? c : colors.inkSoft,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          flexShrink: 0,
        }}
        title={active ? "توقف خواندن خودکار" : "خواندن خودکار همه (با اسکرول خودکار)"}
        aria-label={active ? "توقف خواندن خودکار" : "خواندن خودکار همه"}
      >
        {active ? <Pause size={16} /> : <PlayCircle size={16} />}
        {label && <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>}
      </button>
      {active && trackLangCode && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: c,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
          title="مدت زمان خواندن این جلسه"
        >
          ⏱ {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      )}
    </span>
  );
}
function SpeedControl({ color }) {
  const [rate, setRateState] = useState(() => speechController.getRate());
  useEffect(
    () => speechController.subscribe((s) => setRateState(s.rate)),
    []
  );
  const c = color || colors.gold;
  // با انگشت روی اسلایدر تنظیم دقیق سخته؛ برای همین دو تا دکمه‌ی +/- هم
  // اضافه شده که با هر بار لمس، ۰.۱ واحد سرعت رو کم/زیاد می‌کنن. چون این
  // کامپوننت مشترکه و همه‌ی پلیرهای اپ از همین یه SpeedControl استفاده
  // می‌کنن، این تغییر خودکار روی همه‌شون اعمال می‌شه.
  const step = (delta) => {
    const next = Math.round((rate + delta) * 10) / 10;
    speechController.setRate(next);
  };
  const btnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    border: `1px solid ${colors.cardBorder}`,
    background: "white",
    color: c,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  };
  return (
    <span
      title={`سرعت پخش: ${rate.toFixed(1)}×`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
    >
      <Gauge size={15} color={colors.inkSoft} />
      <button
        type="button"
        onClick={() => step(-0.1)}
        disabled={rate <= 0.25}
        style={{ ...btnStyle, opacity: rate <= 0.25 ? 0.4 : 1 }}
        aria-label="کم کردن سرعت پخش"
      >
        −
      </button>
      <input
        type="range"
        min={0.25}
        max={2}
        step={0.05}
        value={rate}
        onChange={(e) => speechController.setRate(e.target.value)}
        style={{ width: 44, accentColor: c }}
        aria-label="سرعت پخش صدا"
      />
      <button
        type="button"
        onClick={() => step(0.1)}
        disabled={rate >= 2}
        style={{ ...btnStyle, opacity: rate >= 2 ? 0.4 : 1 }}
        aria-label="زیاد کردن سرعت پخش"
      >
        +
      </button>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24 }}>
        {rate.toFixed(1)}×
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Renders a sentence as individually clickable words. Tapping a word shows
// a small popover with its part of speech + Persian meaning, looked up first
// from the local VOCAB list, then (if not found) from the AI backend.
// ---------------------------------------------------------------------------
function ClickableSentence({ text, langCode, nativeLang, nativeLabel: nativeLabelProp, aiSettings, color, fontFamily, fontWeight, fontSize, alignSourceText, alignSourceLang, storyBaseOffset, onSpeakOffset, originExtra }) {
  const [openKey, setOpenKey] = useState(null); // `${startTokenIdx}-${endTokenIdx}` of the word/expression with popover open
  const [info, setInfo] = useState(null); // { pos, meaning } | "loading" | "error"
  const [anchorRect, setAnchorRect] = useState(null); // clicked word's screen position
  const [coords, setCoords] = useState(null); // { top, left } — final, clamped popup position
  const [saved, setSaved] = useState(false);
  // Whether the currently-open word was already saved to grammar learning
  // during this popover session — just for the button's own confirmation
  // state, reset every time a new word is tapped.
  const [grammarSaved, setGrammarSaved] = useState(false);
  // The exact word/expression currently open in the popover. Looked up once
  // at click time and reused for both the AI lookup and the Save button, so
  // Save can never drift from what's actually on screen (this used to read a
  // token straight from the render closure, which is how a tap could end up
  // saving nothing at all).
  const [activeTerm, setActiveTerm] = useState("");
  // آفستِ کاراکتریِ پایانِ همون واژه/عبارتِ فعلاً بازشده، نسبت به شروعِ
  // همینِ `text` — برای گزارشِ «نقطه‌ی ادامه»ی متنِ اصلی وقتی دکمه‌ی پخشِ
  // همین پاپ‌آپ زده می‌شه (پایین‌تر، کنارِ onSpeakOffset).
  const [activeTermLocalEnd, setActiveTermLocalEnd] = useState(0);
  // This language's bookmarked words/expressions ("Save for next story"),
  // kept live so previously-saved terms get a dotted underline as soon as
  // they're saved (or lose it as soon as they're un-saved) anywhere in the app.
  const [savedTerms, setSavedTerms] = useState([]);
  // ترجمه‌ی لغاتی که به یه زبان دیگه ذخیره شدن ولی معادل‌شون تو همین زبان
  // (langCode فعلی) از قبل شناخته شده (یا تازه ترجمه شده) — تا همون معادل
  // هم مثل خودِ لغتِ اصلی زیرخط بخوره.
  const [crossTerms, setCrossTerms] = useState([]);
  const popupRef = useRef(null);
  // انتخابِ آزادِ یه محدوده از جمله (یا کل جمله) با درگ/لانگ‌پرس، برای
  // افزودنِ همون محدوده به داستان‌ساز — جدا از کلیکِ تک‌کلمه‌ای بالا.
  const containerRef = useRef(null);

  const isFa = nativeLang === "fa";
  const nativeLabel = nativeLabelProp || LANGUAGES.find((l) => l.code === nativeLang)?.label || "Persian";
  const popDir = dirFor(nativeLang || "fa");
  const popFont = RTL_LANGS.includes(nativeLang || "fa") ? fontFa : fontLatin;

  useEffect(() => {
    const refresh = () => setSavedTerms(loadSavedStoryWords().filter((e) => e.langCode === langCode));
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [langCode]);

  // زیرخط کشیدنِ لغات ذخیره‌شده فقط به زبان مبدأ محدود نمونه — لغتی که به
  // یه زبان دیگه ذخیره شده، معادلش رو تو این زبان (langCode) هم پیدا می‌کنه
  // (از کش، یا با ترجمه‌ی آزاد در پس‌زمینه) و همون‌جا هم زیرخط می‌خوره.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      const others = loadSavedStoryWords().filter((e) => e.langCode !== langCode);
      const cached = others
        .filter((e) => e.translations && e.translations[langCode])
        .map((e) => e.translations[langCode]);
      if (!cancelled) setCrossTerms(cached);
      others.forEach((e) => {
        if (e.translations && e.translations[langCode]) return;
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${langCode}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        // اگه جمله‌ی مبدأ (همون زبانی که این لغت توش سیو شده) در دسترسه و
        // خودِ لغت واقعاً توش هست، اول با تکنیک «ترجمه‌ی داخل جمله» امتحان
        // می‌کنیم — نتیجه‌ش دقیقاً همون تکه‌ای از متنه که الان روی صفحه
        // دیده می‌شه، پس همیشه زیرش خط می‌افته. فقط اگه این راه جواب نداد
        // (یا جمله‌ی مبدأ در دسترس نبود)، می‌ریم سراغ ترجمه‌ی مجزای کلمه.
        const aligned =
          alignSourceText && e.langCode === alignSourceLang
            ? translateWordInContext(alignSourceText, e.word, alignSourceLang, langCode)
            : Promise.resolve(null);
        aligned
          .then((result) => result || translateFree(e.word, langCode, e.langCode))
          .then((result) => {
            if (result && normalizeWord(result) !== normalizeWord(e.word)) {
              updateSavedWordTranslation(e.word, e.langCode, langCode, result);
            }
          })
          .catch(() => {})
          .finally(() => crossTranslateInFlight.delete(fetchKey));
      });
    };
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    };
  }, [langCode, alignSourceText, alignSourceLang]);

  // انتخابِ آزادِ یه محدوده از متن (درگ با ماوس، یا لانگ‌پرس/درگ روی موبایل)
  // دیگه این‌جا محلی مدیریت نمی‌شه — یه مدیرِ سراسری (GlobalAddToStorySelection،
  // سوار شده توی ریشه‌ی برنامه) کل document رو زیر نظر داره و زبانِ متنِ
  // انتخاب‌شده رو از همون data-lang-code زیر می‌خونه. این یعنی این قابلیت
  // (و پاک‌کردنِ خودکارِ انتخاب برای جلوگیری از نوار ابزار بومیِ گوشی) توی
  // همه‌ی برنامه یکسانه، نه فقط این‌جا.

  // Keep the popup inside the visible viewport (crucial on phones, where a
  // long explanation used to spill off the right/left edge or bottom of
  // the screen). Recompute whenever it opens or its content/size changes.
  useLayoutEffect(() => {
    if (openKey === null || !anchorRect || !popupRef.current) return;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = popupRef.current;
    const w = Math.min(el.offsetWidth, vw - margin * 2);
    const h = el.offsetHeight;

    let left = anchorRect.left + anchorRect.width / 2 - w / 2;
    left = Math.max(margin, Math.min(left, vw - w - margin));

    let top = anchorRect.top - h - 8; // prefer showing above the word
    if (top < margin) top = Math.min(anchorRect.bottom + 8, vh - h - margin);

    setCoords({ top, left, width: w });
  }, [openKey, anchorRect, info]);

  // Close on outside click, scroll, or resize so a stale/misplaced popup
  // never lingers on screen.
  useEffect(() => {
    if (openKey === null) return;
    const close = () => {
      setOpenKey(null);
      setCoords(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [openKey]);

  if (!text) return null;
  const tokens = text.split(/(\s+)/); // keep whitespace so layout/wrapping looks natural

  // Merge contiguous word-tokens into a single group wherever they match a
  // saved word/expression for this language — longest match first, so a
  // saved multi-word expression (e.g. "give up") underlines as ONE unit
  // instead of underlining "give" and "up" separately.
  const savedNorms = new Set(
    [...savedTerms.map((e) => e.word), ...crossTerms].map((w) => normalizeWord(w)).filter(Boolean)
  );
  const wordTokIdx = [];
  tokens.forEach((t, i) => {
    if (!(/^\s+$/.test(t) || t === "")) wordTokIdx.push(i);
  });
  const groupAt = {}; // starting token idx -> { start, end, text }
  const groupSkip = new Set(); // token idx that belong to a group but aren't its start
  if (savedNorms.size) {
    const MAX_EXPR_WORDS = 4;
    let p = 0;
    while (p < wordTokIdx.length) {
      let matched = false;
      const maxW = Math.min(MAX_EXPR_WORDS, wordTokIdx.length - p);
      for (let w = maxW; w >= 1; w--) {
        const startTok = wordTokIdx[p];
        const endTok = wordTokIdx[p + w - 1];
        const phrase = tokens.slice(startTok, endTok + 1).join("");
        const norm = normalizeWord(phrase);
        if (norm && savedNorms.has(norm)) {
          groupAt[startTok] = { start: startTok, end: endTok, text: phrase };
          for (let k = startTok + 1; k <= endTok; k++) groupSkip.add(k);
          p += w;
          matched = true;
          break;
        }
      }
      if (!matched) p += 1;
    }
  }

  async function openLookup(term, startTok, endTok, evt) {
    const clean = normalizeWord(term);
    if (!clean) return;
    const key = `${startTok}-${endTok}`;
    if (openKey === key) {
      setOpenKey(null);
      setCoords(null);
      return;
    }
    setAnchorRect(evt.currentTarget.getBoundingClientRect());
    setActiveTerm(term);
    setActiveTermLocalEnd(tokens.slice(0, endTok + 1).join("").length);
    setSaved(isWordSaved(term, langCode));
    setGrammarSaved(false);
    setOpenKey(key);
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: term, sentence: text, langCode, nativeLang });
      setInfo(result);
      // اگه این لغت از قبل ذخیره شده بود ولی هنوز ترجمه‌اش به زبان مادری
      // کش نشده بود، همین حالا که معنی‌اش پیدا شد، کاملش کن — هم برای
      // نمایش تو پنل «لغات ذخیره‌شده»، هم برای زیرخط خوردنِ ترجمه‌اش.
      if (result && result !== "error" && result.meaning) {
        updateSavedWordTranslation(term, langCode, nativeLang, result.meaning);
      }
    } catch (e) {
      setInfo("error");
    }
  }

  // Saves a grammar note for the currently-open word IMMEDIATELY — no AI
  // and no internet required — using whatever meaning we already have on
  // screen (or just the word + sentence if even the free translation
  // didn't come through). Stays on the current tab; nothing navigates the
  // learner away. If the AI backend does answer, its fuller breakdown
  // quietly replaces the basic note's text afterwards — but the save
  // itself never waits on that.
  function saveActiveTermToGrammar() {
    if (!activeTerm) return;
    const meaningText = info && info !== "loading" && info !== "error" ? info.meaning : "";
    const basicMarkdown =
      `## 🧩 ${activeTerm}\n\n` +
      (meaningText ? `**🔹 معنی:** ${meaningText}\n\n` : "") +
      `**جمله:** ${text}`;
    const entry = saveGrammarNote({ langCode, word: activeTerm, sentence: text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({ word: activeTerm, sentence: text, langCode, nativeLang, nativeLabel, aiSettings })
      .then((md) => {
        if (md) updateGrammarNoteMarkdown(entry.id, md);
      })
      .catch(() => {
        // AI backend down/offline — the basic note saved above still stands.
      });
  }

  // دوباره‌ همون واژه‌ی بازِ فعلی رو (بدون بستن پاپ‌آپ) امتحان می‌کنه — برای
  // دکمه‌ی «تلاش دوباره» وقتی سرور جواب نداده (مثلاً بک‌اند تازه از خواب
  // بیدار می‌شه و اولین درخواست تایم‌اوت می‌خوره).
  async function retryLookup() {
    if (!activeTerm) return;
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: activeTerm, sentence: text, langCode, nativeLang });
      setInfo(result);
    } catch (e) {
      setInfo("error");
    }
  }

  return (
    <span
      ref={containerRef}
      data-lang-code={langCode}
      data-story-base-offset={storyBaseOffset != null ? storyBaseOffset : undefined}
      style={{ position: "relative", display: "inline" }}
    >
      {tokens.map((tok, idx) => {
        if (/^\s+$/.test(tok) || tok === "") return <React.Fragment key={idx}>{tok}</React.Fragment>;
        if (groupSkip.has(idx)) return null; // already rendered as part of its group's combined span
        const group = groupAt[idx];
        const displayText = group ? group.text : tok;
        const startTok = group ? group.start : idx;
        const endTok = group ? group.end : idx;
        const isOpen = openKey === `${startTok}-${endTok}`;
        const isUnderlined = !!group; // has a saved explanation
        return (
          // نکته‌ی مهم: این span باید display:inline بمونه، نه inline-block.
          // inline-block هر کلمه رو برای مرورگر یه «جعبه‌ی اتمیک» جدا حساب
          // می‌کنه، و درگ‌کردنِ انتخاب روی چند خط از میونِ ده‌ها تا از این
          // جعبه‌ها دقیقاً همون باگیه که باعث می‌شه انتخاب نصفه‌ونیمه بشه یا
          // با کلیک لغو بشه (رفتار انتخاب‌متنِ استاندارد فقط با inline درست
          // کار می‌کنه). موقعیتِ پاپ‌آپ زیرش هم position:fixed هست، پس به
          // relative‌بودنِ این span هیچ وابستگی نداره.
          <span key={idx} style={{ display: "inline" }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                openLookup(displayText, startTok, endTok, e);
              }}
              style={{
                fontFamily: fontFamily || fontLatin,
                color: color || colors.teal,
                fontWeight: fontWeight || undefined,
                fontSize: fontSize || 14,
                cursor: "pointer",
                textDecorationLine: isUnderlined ? "underline" : "none",
                textDecorationStyle: "dotted",
                textDecorationColor: colors.gold,
                textUnderlineOffset: 3,
              }}
            >
              {displayText}
            </span>
            {isOpen && (
              <div
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  top: coords ? coords.top : -9999,
                  left: coords ? coords.left : -9999,
                  visibility: coords ? "visible" : "hidden",
                  width: coords ? coords.width : undefined,
                  minWidth: 180,
                  maxWidth: "min(85vw, 280px)",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  background: colors.ink,
                  color: colors.paper,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontFamily: popFont,
                  zIndex: 100,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                  direction: popDir,
                  textAlign: popDir === "rtl" ? "right" : "left",
                  overflowWrap: "break-word",
                }}
              >
                {info === "loading" && (
                  <div className="flex items-center gap-1">
                    <Loader2 size={12} className="spin" />
                    <span>{isFa ? "در حال یافتن معنی..." : "Looking up meaning..."}</span>
                  </div>
                )}
                {info !== "loading" && (
                  <>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <SpeakButton
                        text={activeTerm}
                        code={langCode}
                        color={colors.goldSoft}
                        onPlayed={onSpeakOffset ? () => onSpeakOffset(activeTermLocalEnd) : undefined}
                      />
                      <span dir="auto" style={{ fontWeight: 800, fontSize: 13 }}>
                        {activeTerm}
                      </span>
                    </div>
                    {info && info !== "error" ? (
                      <>
                        <div style={{ marginBottom: 2, fontSize: 10, color: colors.inkSoft, opacity: 0.85 }}>
                          {isFa ? "ترجمه:" : "Translation:"}
                        </div>
                        <div style={{ marginBottom: 6 }}>{info.meaning}</div>
                      </>
                    ) : (
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: colors.rose, fontSize: 11 }}>
                          {isFa ? "معنی پیدا نشد (احتمالاً آفلاینی)" : "Couldn't find a meaning (maybe offline)"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryLookup();
                          }}
                          style={{
                            display: "block",
                            marginTop: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: colors.paper,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.25)",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          {isFa ? "تلاش دوباره" : "Retry"}
                        </button>
                      </div>
                    )}
                    {/* Save + grammar buttons always show once loading is done — even
                        with no meaning found — so bookmarking/saving keeps working
                        fully offline regardless of whether translation succeeded. */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!activeTerm) return;
                        const meaningNow = info && info !== "loading" && info !== "error" ? info.meaning : "";
                        const nowSaved = toggleSavedStoryWord(activeTerm, langCode, { meaning: meaningNow, nativeLang, originExtra });
                        setSaved(nowSaved);
                        // فقط وقتی تازه ذخیره شد (نه وقتی داشت از حالتِ
                        // ذخیره درمی‌اومد) به داستان‌سازِ باز هم اضافه کن.
                        if (nowSaved) {
                          try {
                            window.dispatchEvent(
                              new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: activeTerm, langCode } })
                            );
                          } catch {}
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: saved ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${saved ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        marginBottom: 6,
                      }}
                    >
                      <Bookmark size={11} fill={saved ? colors.gold : "none"} />
                      {saved
                        ? isFa
                          ? "ذخیره شد برای داستان بعدی"
                          : "Saved for next story"
                        : isFa
                        ? "ذخیره برای داستان بعدی"
                        : "Save for next story"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveActiveTermToGrammar();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: grammarSaved ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${grammarSaved ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      <Type size={11} />
                      {grammarSaved
                        ? isFa
                          ? "ذخیره شد در گرامر"
                          : "Saved to grammar"
                        : isFa
                        ? "افزودن به یادگیری گرامر"
                        : "Add to grammar learning"}
                    </button>
                  </>
                )}
              </div>
            )}
          </span>
        );
      })}
    </span>
  );
}

function LevelBadge({ level }) {
  return (
    <span
      style={{
        fontFamily: fontLatin,
        fontSize: 10,
        fontWeight: 700,
        color: colors.ink,
        backgroundColor: colors.goldSoft,
        borderRadius: 6,
        padding: "1px 6px",
        flexShrink: 0,
      }}
    >
      {level}
    </span>
  );
}

function LevelFilterRow({ levelFilter, setLevelFilter }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => setLevelFilter("all")}
        style={{
          fontFamily: fontFa,
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 14,
          border: `1px solid ${colors.cardBorder}`,
          backgroundColor: levelFilter === "all" ? colors.ink : "white",
          color: levelFilter === "all" ? colors.paper : colors.inkSoft,
          flexShrink: 0,
        }}
      >
        همه سطح‌ها
      </button>
      {LEVELS.map((lvl) => (
        <button
          key={lvl}
          onClick={() => setLevelFilter(lvl)}
          style={{
            fontFamily: fontLatin,
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 14,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: levelFilter === lvl ? colors.ink : "white",
            color: levelFilter === lvl ? colors.paper : colors.inkSoft,
            flexShrink: 0,
          }}
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}

// Drag-to-reorder row of chips (touch + mouse). Dragging a chip over another
// swaps their position live; the new order is reported via onReorder.
function OrderChips({ order, languages, onReorder, onRemove }) {
  const [dragCode, setDragCode] = useState(null);

  useEffect(() => {
    if (!dragCode) return;

    const handleMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const el = document.elementFromPoint(point.clientX, point.clientY);
      const chipEl = el && el.closest("[data-order-code]");
      if (!chipEl) return;
      const hoveredCode = chipEl.getAttribute("data-order-code");
      if (hoveredCode === dragCode) return;
      const fromIndex = order.indexOf(dragCode);
      const toIndex = order.indexOf(hoveredCode);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...order];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragCode);
      onReorder(next);
    };

    const handleUp = () => setDragCode(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragCode, order, onReorder]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {order.map((code) => {
        const lang = languages.find((l) => l.code === code);
        if (!lang) return null;
        return (
          <div
            key={code}
            data-order-code={code}
            onMouseDown={() => setDragCode(code)}
            onTouchStart={(e) => {
              e.preventDefault();
              setDragCode(code);
            }}
            style={{
              touchAction: "none",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              backgroundColor: dragCode === code ? colors.gold : "white",
              color: dragCode === code ? colors.paper : colors.ink,
              border: `1px solid ${colors.cardBorder}`,
              fontSize: 13,
              fontWeight: 600,
              cursor: "grab",
              flexShrink: 0,
            }}
          >
            <span style={{ color: dragCode === code ? colors.paper : colors.gold, fontSize: 11 }}>⠿</span>
            {lang.label}
            {onRemove && order.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(code);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                aria-label={`حذف ${lang.label}`}
                title={`حذف ${lang.label}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "none",
                  background: dragCode === code ? "rgba(255,255,255,0.3)" : colors.paperDark,
                  color: dragCode === code ? colors.paper : colors.inkSoft,
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story Builder — pick words, AI writes a story that repeats each word
// several times (in different forms/meanings), reads it aloud, then quizzes
// the user; wrong answers feed back into which words get suggested next time.
// ---------------------------------------------------------------------------
function countOccurrences(story, word) {
  if (!story || !word) return 0;
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = story.match(new RegExp(escaped, "gi"));
  return matches ? matches.length : 0;
}

const STORY_LENGTHS = [
  { key: "short", label: "کوتاه", paragraphs: "1-2", paragraphMin: 1, paragraphMax: 2, sentencesHint: "short, roughly 4-6 sentences per paragraph", tokens: 1400 },
  { key: "medium", label: "متوسط", paragraphs: "2-3", paragraphMin: 2, paragraphMax: 3, sentencesHint: "medium length, roughly 5-8 sentences per paragraph", tokens: 2500 },
  { key: "long", label: "بلند", paragraphs: "4-6", paragraphMin: 4, paragraphMax: 6, sentencesHint: "long, roughly 6-10 sentences per paragraph", tokens: 4200 },
];

const CONTENT_TYPES = [
  { key: "general", label: "عمومی", prompt: "a general, everyday short story" },
  { key: "news", label: "خبری", prompt: "a short news-style report, written like a news article" },
  { key: "psychology", label: "روان‌شناسی", prompt: "a short piece exploring a psychology or self-understanding theme" },
  { key: "children", label: "کودکانه", prompt: "a simple, gentle children's story" },
  { key: "funny", label: "خنده‌دار", prompt: "a lighthearted, funny, comedic story with a humorous twist" },
  { key: "mystery", label: "رازآلود و ترسناک", prompt: "a suspenseful, mysterious, slightly scary story with an eerie atmosphere" },
  { key: "crime", label: "جنایی", prompt: "a crime/detective story involving an investigation or mystery to solve" },
  { key: "scientific", label: "علمی", prompt: "a short popular-science explainer written as a narrative" },
  { key: "conversational", label: "مکالمه‌ای", prompt: "a natural back-and-forth dialogue between two people" },
  { key: "philosophical", label: "فلسفی", prompt: "a short philosophical reflection or thought experiment" },
  { key: "metaphysical", label: "متافیزیکی", prompt: "a short metaphysical/speculative piece about existence, mind, or reality" },
];

// ---------------------------------------------------------------------------
// Dictionary — no static word list. Every lookup is answered live by the
// same AI backend used by the Story Builder (server/ → DeepSeek), so it
// covers any word or phrase in any of the app's languages, not just a
// pre-built database.
// ---------------------------------------------------------------------------
// کارت دانلود/وضعیت دیکشنری آفلاین برای یه زبون مشخص — دانلود یه‌بار،
// بعدش جستجو کاملاً بدون اینترنت کار می‌کنه.
function OfflineDictionaryCard({ code, label }) {
  const [status, setStatus] = useState("checking"); // checking | idle | downloading | ready | error
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    offlineDictionary.isDownloaded(code).then((yes) => {
      if (cancelled) return;
      if (yes) {
        setStatus("ready");
        setCount(offlineDictionary.entryCount(code));
      } else {
        setStatus("idle");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleDownload = async () => {
    setStatus("downloading");
    setProgress(0);
    setErrMsg("");
    try {
      const n = await offlineDictionary.download(code, setProgress);
      setCount(n);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErrMsg(e?.message || "دانلود ناموفق بود");
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: 12,
        backgroundColor: "white",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>دیکشنری آفلاین {label}</span>
        {status === "ready" && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: colors.teal, fontSize: 11, fontWeight: 600 }}>
            <Check size={13} /> آماده ({count} لغت)
          </span>
        )}
      </div>

      {status === "idle" && (
        <button
          onClick={handleDownload}
          style={{
            marginTop: 8,
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            backgroundColor: colors.gold,
            color: "white",
            cursor: "pointer",
          }}
        >
          دانلود برای استفاده‌ی آفلاین
        </button>
      )}

      {status === "downloading" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 4 }}>در حال دانلود… {progress}٪</div>
          <div style={{ height: 6, backgroundColor: colors.cardBorder, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, backgroundColor: colors.gold, transition: "width .15s linear" }} />
          </div>
        </div>
      )}

      {status === "ready" && (
        <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6 }}>
          از این به بعد، جستجوی این لغات حتی بدون اینترنت هم کار می‌کنه — رایگان و آنی.
        </p>
      )}

      {status === "error" && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 11, color: colors.rose }}>{errMsg}</p>
          <button
            onClick={handleDownload}
            style={{ marginTop: 4, fontSize: 12, color: colors.gold, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
          >
            دوباره امتحان کن
          </button>
        </div>
      )}
    </div>
  );
}

function Dictionary({ nativeLang, nativeLabel, dictHistory, setDictHistory, aiSettings }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [offlineHits, setOfflineHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const targetLangs = PHRASEBOOK_LANGUAGES.filter((l) => l.code !== "fa");

  const lookup = async (term, opts = {}) => {
    const word = (term ?? query).trim();
    if (!word || loading) return;
    setError("");
    setResult(null);
    setOfflineHits([]);

    // اول تو دیکشنری آفلاین (اگه دانلود شده باشه) نگاه کن — رایگان و آنی،
    // نیازی به اینترنت یا سرور AI نیست. فقط وقتی opts.forceAI باشه ردش کن.
    if (!opts.forceAI && offlineDictionary.isLoadedInMemory("en")) {
      const hits = offlineDictionary.lookup(word, "en");
      if (hits.length) {
        setOfflineHits(hits);
        return;
      }
    }

    setLoading(true);
    try {
      const langLabelPairs = targetLangs.map((l) => ({ code: l.code, label: l.label }));
      const schema = `{"word": "the term exactly as given, corrected for obvious typos", "detectedLang": "ISO 639-1 code of the language the term is written in", "pos": "part of speech in Persian (اسم/فعل/صفت/قید/حرف اضافه/عبارت)", "ipa": "IPA pronunciation if it's a single word, else empty string", "meaningFa": "clear definition/meaning of the word IN PERSIAN, 1-2 sentences", "translations": {${langLabelPairs
        .map((p) => `"${p.code}": "translation of the term into ${p.label}"`)
        .join(", ")}, "fa": "Persian translation (if the term itself isn't Persian)"}, "examples": [{"text": "an example sentence using the term, in the term's own language", "fa": "Persian translation of that example sentence"}]}`;
      const prompt = `You are a multilingual dictionary. The user (native language: ${nativeLabel}) looked up this word or phrase: "${word}". Identify what language it's in, then respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape: ${schema}. Give exactly 2 example sentences. Keep translations natural and idiomatic, not literal word-for-word.`;
      const res = await callAI({ prompt, maxTokens: 1800, aiSettings });
      const cleaned = res.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error("parse-error: پاسخ هوش مصنوعی JSON معتبر نبود، دوباره امتحان کن.");
      }
      setResult(parsed);
      setDictHistory((prev) => {
        const withoutDup = prev.filter((h) => h.word.toLowerCase() !== (parsed.word || word).toLowerCase());
        return [{ ...parsed, lookedUpAt: Date.now() }, ...withoutDup].slice(0, 50);
      });
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.startsWith("ai-backend-error:")) {
        setError(`خطای سرور: ${msg.replace("ai-backend-error: ", "")}`);
      } else if (msg.startsWith("parse-error:")) {
        setError(msg.replace("parse-error: ", ""));
      } else {
        setError(`خطای اتصال: ${msg || "دلیل نامشخص"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openFromHistory = (entry) => {
    setResult(entry);
    setQuery(entry.word);
    setShowHistory(false);
  };

  const removeFromHistory = (word) => {
    setDictHistory((prev) => prev.filter((h) => h.word !== word));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontWeight: 700, fontSize: 16 }}>دیکشنری</p>
        <button
          onClick={() => setShowHistory((s) => !s)}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 20,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: showHistory ? colors.ink : "white",
            color: showHistory ? "white" : colors.ink,
          }}
        >
          تاریخچه ({dictHistory.length})
        </button>
      </div>

      <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.inkSoft }}>
        هر کلمه یا اصطلاحی رو، به هر زبونی، تایپ کن — معنی، تلفظ، مثال و ترجمه‌ش به همه‌ی زبون‌های اپ رو زنده از AI می‌گیره.
      </p>

      <OfflineDictionaryCard code="en" label="انگلیسی" />

      <div
        className="flex items-center gap-2 px-3"
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 44 }}
      >
        <Search size={16} color={colors.inkSoft} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="مثلاً: apprehensive یا سرسبز یا break a leg"
          style={{ flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setResult(null); setOfflineHits([]); }} aria-label="پاک کردن">
            <X size={16} color={colors.inkSoft} />
          </button>
        )}
      </div>

      <button
        onClick={() => lookup()}
        disabled={!query.trim() || loading}
        className="w-full py-2 rounded-lg font-medium"
        style={{
          fontFamily: fontFa,
          backgroundColor: !query.trim() || loading ? colors.cardBorder : colors.gold,
          color: "white",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "در حال جستجو..." : "جستجو"}
      </button>

      {offlineHits.length > 0 && (
        <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: 12, backgroundColor: "white" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: colors.teal, fontWeight: 600 }}>از دیکشنری آفلاین (بدون اینترنت)</span>
          </div>
          {offlineHits.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{ padding: "8px 2px", borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : "none" }}
            >
              <span style={{ fontWeight: 600, fontSize: 15 }}>{h.fa}</span>
              <span style={{ color: colors.teal, fontSize: 14, direction: "ltr" }}>{h.en}</span>
            </div>
          ))}
          <button
            onClick={() => lookup(query, { forceAI: true })}
            disabled={loading}
            style={{ marginTop: 8, fontSize: 12, color: colors.gold, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
          >
            جستجوی کامل‌تر با هوش مصنوعی (مثال، تلفظ، ترجمه به همه‌ی زبون‌ها)
          </button>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 }}>{error}</p>
          <button
            onClick={() => lookup()}
            disabled={loading}
            style={{
              fontFamily: fontFa,
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              backgroundColor: colors.rose,
              borderRadius: 8,
              padding: "5px 14px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {showHistory && (
        <div className="flex flex-col gap-2">
          {dictHistory.length === 0 && (
            <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.inkSoft, textAlign: "center", padding: 16 }}>
              هنوز چیزی جستجو نکردی.
            </p>
          )}
          {dictHistory.map((h) => (
            <div
              key={h.word}
              onClick={() => openFromHistory(h)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }}
            >
              <div>
                <p style={{ fontFamily: fontLatin, fontWeight: 600, fontSize: 14, color: colors.ink }}>{h.word}</p>
                <p style={{ fontFamily: fontFa, fontSize: 12, color: colors.inkSoft }}>{h.meaningFa}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFromHistory(h.word); }} aria-label="حذف">
                <X size={16} color={colors.inkSoft} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!showHistory && result && (
        <div className="flex flex-col gap-3 p-4 rounded-lg" style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }}>
          <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
            <p style={{ fontFamily: fontLatin, fontWeight: 800, fontSize: 20, color: mainTextColor }}>{result.word}</p>
            <SpeakButton text={result.word} code={result.detectedLang || "en"} edge="end" />
            {result.pos && (
              <span
                style={{
                  fontFamily: fontFa,
                  fontSize: 11,
                  color: colors.gold,
                  border: `1px solid ${colors.goldSoft}`,
                  borderRadius: 6,
                  padding: "1px 6px",
                }}
              >
                {result.pos}
              </span>
            )}
          </div>
          {result.ipa && (
            <p style={{ fontFamily: fontLatin, fontSize: 13, color: colors.inkSoft, direction: "ltr" }}>/{result.ipa}/</p>
          )}
          {result.meaningFa && (
            <p style={{ fontFamily: fontFa, fontSize: 14, fontWeight: 800, color: translationColor }}>{result.meaningFa}</p>
          )}

          {result.translations && (
            <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
              <p style={{ fontFamily: fontFa, fontSize: 12, fontWeight: 700, color: colors.inkSoft }}>ترجمه‌ها</p>
              {targetLangs.map((l) => (
                result.translations[l.code] ? (
                  <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
                    <span
                      style={{
                        fontFamily: fontFa,
                        fontSize: 10,
                        fontWeight: 700,
                        color: colors.gold,
                        border: `1px solid ${colors.goldSoft}`,
                        borderRadius: 6,
                        padding: "1px 5px",
                        flexShrink: 0,
                      }}
                    >
                      {l.abbr}
                    </span>
                    <p style={{ fontFamily: fontLatin, color: translationColor, fontWeight: 800, fontSize: 14, flex: 1 }}>
                      {result.translations[l.code]}
                    </p>
                    <SpeakButton text={result.translations[l.code]} code={l.code} color={translationColor} edge="end" />
                  </div>
                ) : null
              ))}
            </div>
          )}

          {Array.isArray(result.examples) && result.examples.length > 0 && (
            <div className="flex flex-col gap-2" style={{ marginTop: 4 }}>
              <p style={{ fontFamily: fontFa, fontSize: 12, fontWeight: 700, color: colors.inkSoft }}>مثال</p>
              {result.examples.map((ex, i) => (
                <div key={i} style={{ backgroundColor: colors.paper, borderRadius: 8, padding: 8 }}>
                  <p style={{ fontFamily: fontLatin, fontSize: 13, color: colors.ink, direction: "ltr" }}>{ex.text}</p>
                  {ex.fa && <p style={{ fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>{ex.fa}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoryBuilder({ nativeLang, nativeLabel, targetOrder, wordStats, setWordStats, savedStories, setSavedStories, aiSettings, jumpTo, onFullTextChange, autoScrollActive }) {
  // Story language & translation languages are driven by whatever the user
  // already picked at the top of the app (native language + target
  // languages) — no separate picker duplicated here.
  const storyLangOptions = (targetOrder && targetOrder.length ? targetOrder : LANGUAGES.filter((l) => l.code !== nativeLang).map((l) => l.code));
  // Default to whatever language the user is already studying in the main
  // Phrasebook tab (targetOrder[0]) instead of always defaulting to English —
  // the pill selector below still lets them switch to any language freely.
  const defaultStoryLang =
    (targetOrder || []).find((c) => storyLangOptions.includes(c)) || storyLangOptions[0] || "en";
  const [storyLang, setStoryLang] = useState(defaultStoryLang);
  // اگه کاربر بالای صفحه زبان‌های مقصد رو عوض کنه (مثلاً از انگلیسی به
  // هندی)، storyLang باید خودش رو با انتخاب جدید هماهنگ کنه — قبلاً فقط
  // یه‌بار موقع mount مقداردهی می‌شد و بعدش «قفل» می‌موند رو همون زبون اول،
  // حتی اگه دیگه جزو گزینه‌های فعلی نبود.
  useEffect(() => {
    if (!storyLangOptions.includes(storyLang)) {
      setStoryLang(defaultStoryLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStoryLang, storyLangOptions.join(",")]);
  const sentenceElsRef = useRef({}); // "pi-si" -> DOM node, for auto-read scroll
  const paragraphElsRef = useRef({}); // pi -> DOM node, for auto-read scroll
  const [storyLevel, setStoryLevel] = useState("A2");
  const [contentType, setContentType] = useState("general");
  const [storyLength, setStoryLength] = useState("medium");
  const [repeatCount, setRepeatCount] = useState(8);
  const [selectedWords, setSelectedWords] = useState([]);
  const [customWord, setCustomWord] = useState("");
  const [wordTranslating, setWordTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState("");
  const [collections, setCollections] = useState([]);
  const [activeCollectionId, setActiveCollectionId] = useState("");
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionText, setNewCollectionText] = useState("");
  const [newWordTerm, setNewWordTerm] = useState("");
  const [newWordMeaning, setNewWordMeaning] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editDraftMeaning, setEditDraftMeaning] = useState("");
  const [translatingAll, setTranslatingAll] = useState(false);
  const [vocabQuery, setVocabQuery] = useState("");
  const [paragraphs, setParagraphs] = useState([]); // [{ sentences: [{text, t:{lang:text}}] }]
  // شناسه‌ی داستانِ ذخیره‌شده‌ای که همین الان روی صفحه‌ست (اگه از «داستان‌های
  // ذخیره‌شده» باز شده باشه یا تازه ذخیره شده باشه)؛ برای داستانِ تازه‌ساخته‌
  // شده‌ای که هنوز ذخیره نشده، null می‌مونه. با هر لغتی که از وسطِ همین
  // داستان (با پاپ‌آپِ لغت) ذخیره می‌شه، همین شناسه (به‌همراهِ شماره‌ی
  // پاراگراف/جمله) به‌عنوانِ origin ذخیره می‌شه — تا لانگ‌پرس روی اون لغت
  // توی «لغات ذخیره‌شده» بتونه دقیقاً به همین داستان و همین سطر برگرده.
  const [currentStoryId, setCurrentStoryId] = useState(null);
  // جمله‌ای که همین الان (به‌خاطرِ اومدن از یه لانگ‌پرسِ «لغات ذخیره‌شده»)
  // باید چند لحظه هایلایت بشه تا کاربر بلافاصله بفهمه دقیقاً کدوم سطره —
  // خودش به‌تنهایی باعثِ اسکرول نمی‌شه، فقط یه هایلایتِ موقته.
  const [highlightSentence, setHighlightSentence] = useState(null); // {pi, si} | null
  // موقعیتی که باید بهش اسکرول کنیم ولی هنوز DOMـش آماده نیست (مثلاً چون
  // تازه داریم یه داستانِ ذخیره‌شده‌ی دیگه رو باز می‌کنیم و پاراگراف‌هاش
  // هنوز رندر نشدن). یه useLayoutEffectِ بدونِ وابستگی (پایین‌تر) هر بار بعد
  // از هر رندر چک می‌کنه که آیا نودِ موردنظر حالا در دسترسه یا نه.
  const pendingScrollRef = useRef(null); // {pi, si} | null
  const [translationLangs, setTranslationLangs] = useState(
    Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter((c) => c !== defaultStoryLang)
  );
  const [granularity, setGranularity] = useState("sentence"); // "sentence" | "paragraph" | "none"
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  // اگه بعد از همه‌ی ریترای‌ها بازم تعداد تکرارِ بعضی لغات دقیقاً برابر
  // repeatCount نشد، این پیام (غیر-بلاک‌کننده — داستان بازم نمایش داده
  // می‌شه) به کاربر می‌گه کدوم لغت چند بار واقعاً استفاده شده.
  const [repeatNotice, setRepeatNotice] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // لغاتِ ذخیره‌شده‌ی همین زبان — به‌شکلِ چیپ‌های کوچیکِ قابل‌تپ همین‌جا هم
  // نشون داده می‌شن (نه فقط توی تبِ «لغات ذخیره‌شده») تا کاربر لازم نباشه
  // برای استفاده‌ی دوباره از یه لغتِ قبلاً ذخیره‌شده، تب عوض کنه.
  const [savedWordsForLang, setSavedWordsForLang] = useState([]);
  useEffect(() => {
    const refresh = () => setSavedWordsForLang(loadSavedStoryWords().filter((e) => e.langCode === storyLang));
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [storyLang]);

  // وقتی از پاپ‌آپِ لغت (وسطِ خوندنِ یه داستان یا هر جای دیگه‌ی برنامه)
  // «ذخیره برای داستان بعدی» زده می‌شه، اگه زبانِ همون لغت با زبانِ
  // داستانِ فعلی یکی باشه، مستقیم به لیستِ لغاتِ انتخاب‌شده (پیش از
  // تولید/ترجمه‌ی داستان) هم اضافه‌ش می‌کنیم — نه فقط انبار دائمی.
  useEffect(() => {
    function handlePicked(e) {
      const { word, langCode } = (e && e.detail) || {};
      if (!word || langCode !== storyLang) return;
      setSelectedWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
    }
    window.addEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
    return () => window.removeEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
  }, [storyLang]);

  const storyLangLabel = LANGUAGES.find((l) => l.code === storyLang)?.label || storyLang;
  // ⚠️ این خط رو همیشه با گارد (|| []) نگه دار — این کامپوننت با
  // display:none حتی وقتی تب «داستان‌ساز» فعال نیست هم mount می‌مونه، پس
  // اگه یه داستانِ ذخیره‌شده‌ی قدیمی/ناقص (بدون paragraph.sentences) باز
  // بشه و اینجا کرش کنه، کل اپ (نه فقط این تب) قفل می‌شه.
  // هر جمله رو با شماره‌ی پاراگراف/جمله‌ش (pi/si) نگه می‌داریم — هم برای
  // ساختنِ متنِ کامل، هم برای اینکه بعداً بتونیم بفهمیم موقع پخشِ «کل متن»
  // از روی پلیر، الان دقیقاً کدوم جمله داره خونده می‌شه (برای هایلایت/اسکرول).
  const allSentences = paragraphs.flatMap((p, pi) =>
    (p.sentences || []).map((s, si) => ({ ...s, _pi: pi, _si: si }))
  );
  const fullStoryText = allSentences.map((s) => s?.text || "").join(" ");

  // آفستِ کاراکتریِ شروعِ هر جمله داخلِ fullStoryText — دقیقاً باید با نحوه‌ی
  // ساختنِ fullStoryText بالا (join با یک فاصله) هماهنگ باشه.
  const sentenceOffsets = useMemo(() => {
    let offset = 0;
    return allSentences.map((s, idx) => {
      const start = offset;
      const text = s?.text || "";
      offset += text.length;
      if (idx < allSentences.length - 1) offset += 1; // فاصله‌ی join(" ")
      return { pi: s._pi, si: s._si, start, end: start + text.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullStoryText]);

  // نسخه‌ی نگاشت‌شده‌ی sentenceOffsets (با کلیدِ pi-si) و آفستِ شروعِ هر
  // پاراگراف (اولین جمله‌ش) — هر دو برای اینه که موقعِ کلیک‌کردن روی یه
  // کلمه/عبارت (در ClickableSentence)، بشه فهمید همون کلمه دقیقاً کجای
  // fullStoryText افتاده و «نقطه‌ی ادامه»ی پخشِ کل متن رو بر اساسش به‌خاطر
  // سپرد.
  const sentenceOffsetMap = useMemo(() => {
    const map = {};
    sentenceOffsets.forEach((s) => {
      map[`${s.pi}-${s.si}`] = s;
    });
    return map;
  }, [sentenceOffsets]);
  const paragraphBaseOffsetMap = useMemo(() => {
    const map = {};
    sentenceOffsets.forEach((s) => {
      if (!(s.pi in map)) map[s.pi] = s.start;
    });
    return map;
  }, [sentenceOffsets]);
  const mainStoryKey = fullStoryText ? `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}` : null;
  // وقتی از پاپ‌آپِ کلمه یا محدوده‌ی انتخابی، دکمه‌ی پخش زده می‌شه، همین‌جا
  // موقعیت (نسبت به کلِ fullStoryText) به‌خاطر سپرده می‌شه — تا دفعه‌ی بعد
  // که دکمه‌ی «پخشِ کل متن» روی نوارِ پلیر زده بشه، از همون‌جا (نه از اول)
  // ادامه پیدا کنه.
  function reportStoryWordSpoken(baseOffset, localEnd) {
    if (!mainStoryKey) return;
    rememberMainTextResumeOffset(mainStoryKey, (baseOffset || 0) + (localEnd || 0));
  }

  // جمله‌ای که همین الان، در حینِ پخشِ «کل متن» از روی پلیر، داره خونده
  // می‌شه — هم برای اسکرولِ خودکار، هم برای اینکه بدونیم ردیابِ خوانش (سایه‌ی
  // کلمه) رو زیرِ کدوم جمله نشون بدیم. وقتی پخشِ فعلی چیز دیگه‌ای غیر از کلِ
  // داستانه (مثلاً کاربر خودش رو یک جمله‌ی خاص زده)، این null می‌مونه.
  const [activeStorySentence, setActiveStorySentence] = useState(null); // {pi, si} | null
  // آفستِ خامِ (نسبت به کلِ fullStoryText) کلمه‌ی در حال خوانده‌شدن —
  // چون بسته به حالتِ نمایش (sentence/paragraph) پایه‌ی متفاوتی ازش کم
  // می‌شه، خودِ عددِ خام رو نگه می‌داریم نه نسبی.
  const [activeStoryWordOffset, setActiveStoryWordOffset] = useState(0);
  useEffect(() => {
    const myKey = `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}`;
    const update = (state) => {
      if (!fullStoryText || state.key !== myKey || state.status === "idle") {
        setActiveStorySentence(null);
        setActiveStoryWordOffset(0);
        return;
      }
      const offset = speechController.getWordOffset ? speechController.getWordOffset() : speechController.getCharOffset();
      let found = sentenceOffsets[0] || null;
      for (const s of sentenceOffsets) {
        if (offset >= s.start) found = s;
        else break;
      }
      setActiveStoryWordOffset(offset);
      setActiveStorySentence((prev) => {
        const next = found ? { pi: found.pi, si: found.si } : null;
        if (prev && next && prev.pi === next.pi && prev.si === next.si) return prev;
        return next;
      });
    };
    update(speechController.getState());
    // دیگه نیازی به polling نیست — chunkIndex دقیقاً همون لحظه‌ای که جمله‌ی
    // بعدی شروع می‌شه آپدیت می‌شه (نه با تخمین)، پس subscribe به‌تنهایی کافیه.
    return speechController.subscribe(update);
  }, [fullStoryText, storyLang, sentenceOffsets]);

  // موقع پخشِ سراسریِ داستان، اگه اسکرولِ خودکار (همون دکمه‌ی کنارِ پلیر)
  // فعال باشه، خطِ در حالِ خواندن رو خودکار وسطِ صفحه نگه می‌داره — کاربر
  // خطش رو گم نمی‌کنه.
  useEffect(() => {
    if (!autoScrollActive || !activeStorySentence) return;
    const node =
      granularity === "sentence"
        ? sentenceElsRef.current[`${activeStorySentence.pi}-${activeStorySentence.si}`]
        : paragraphElsRef.current[activeStorySentence.pi];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollActive, activeStorySentence?.pi, activeStorySentence?.si, granularity]);

  // هر بار متنِ داستان یا زبانش عوض می‌شه، به بالا (App) گزارش می‌دیم تا
  // دکمه‌ی 🔊ِ روی نوارِ پلیر — همون‌جایی که قبلاً بالای این باکس بود —
  // بتونه همین متن رو بخونه. (این کامپوننت با display:none همیشه mount
  // می‌مونه، پس نیازی به پاک‌کردنش موقعِ خروج از تب نیست؛ نمایشِ دکمه روی
  // پلیر با چک‌کردنِ تبِ فعال کنترل می‌شه، نه با خالی‌بودنِ این متن.)
  useEffect(() => {
    latestStoryTextContext = { text: fullStoryText, code: storyLang };
    if (onFullTextChange) onFullTextChange({ text: fullStoryText, code: storyLang });
  }, [fullStoryText, storyLang]);

  useEffect(() => {
    setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));
    setActiveCollectionId("");
  }, [storyLang]);

  // Coming from the Saved Words panel with "افزودن به داستان‌ساز" — jump the
  // story language to match, and drop the specific words the user picked
  // there straight into this story's selected-words list.
  useEffect(() => {
    if (jumpTo && jumpTo.lang) {
      setStoryLang(jumpTo.lang);
      if (Array.isArray(jumpTo.words) && jumpTo.words.length) {
        setSelectedWords((prev) => {
          const merged = [...prev];
          jumpTo.words.forEach((w) => {
            if (!merged.includes(w)) merged.push(w);
          });
          return merged;
        });
      }
    }
    // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» — باید دقیقاً همون داستان و همون
    // سطری که این لغت ازش ذخیره شده بود رو باز کنیم و بهش اسکرول کنیم.
    if (jumpTo && jumpTo.pi != null) {
      // اگه لغت از یه داستانِ ذخیره‌شده‌ی مشخص اومده، اول همون داستان رو باز
      // کن (حتی اگه همون داستانیه که همین الانم بازه — بازکردنِ دوباره‌ش
      // بی‌ضرره). اگه داستانِ اصلی دیگه بینِ داستان‌های ذخیره‌شده نیست
      // (مثلاً پاک شده)، همون‌جوری که هست می‌مونیم و فقط تلاش می‌کنیم به
      // pi/si موردنظر (اگه هنوز معتبره) اسکرول کنیم.
      if (jumpTo.storyId != null) {
        const match = savedStories.find((s) => s.id === jumpTo.storyId);
        if (match) openSavedStory(match);
      } else {
        setShowSaved(false);
      }
      // برای این‌که نودِ دقیقِ همون جمله (نه فقط پاراگراف) روی صفحه باشه،
      // اگه شماره‌ی جمله مشخصه، نمایش رو موقتاً روی «جمله به جمله» می‌ذاریم.
      if (jumpTo.si != null) setGranularity("sentence");
      pendingScrollRef.current = { pi: jumpTo.pi, si: jumpTo.si };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  // بعد از هر رندر چک می‌کنه که آیا نودِ موردنظرِ pendingScrollRef حالا آماده‌ست
  // یا نه (چون بازکردنِ یه داستانِ دیگه/تغییرِ granularity، یکی-دو رندر طول
  // می‌کشه تا به DOM برسه). وقتی پیدا شد، بهش اسکرول می‌کنه و چند ثانیه
  // هایلایتش می‌کنه، بعد پاک می‌شه که دیگه هر رندر بی‌خودی چک نکنه.
  useLayoutEffect(() => {
    const target = pendingScrollRef.current;
    if (!target) return;
    const node =
      target.si != null
        ? sentenceElsRef.current[`${target.pi}-${target.si}`]
        : paragraphElsRef.current[target.pi];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightSentence({ pi: target.pi, si: target.si });
    pendingScrollRef.current = null;
    const t = setTimeout(() => setHighlightSentence(null), 2400);
    return () => clearTimeout(t);
  });

  const activeCollection = collections.find((c) => c.id === activeCollectionId) || null;

  const refreshCollections = () => setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));

  const handleSaveCollection = () => {
    const entry = addWordCollection({ langCode: storyLang, title: newCollectionTitle, rawText: newCollectionText });
    if (!entry) return;
    refreshCollections();
    setActiveCollectionId(entry.id);
    setNewCollectionTitle("");
    setNewCollectionText("");
    setShowAddCollection(false);
  };

  // Adds one word to the currently open collection. If the user doesn't
  // type a meaning, we ask the AI for a short Persian translation so the
  // dictionary stays useful without extra typing.
  const handleAddWordToCollection = async () => {
    if (!activeCollection) return;
    const term = newWordTerm.trim();
    if (!term) return;
    setAddingWord(true);
    let meaning = newWordMeaning.trim();
    try {
      if (!meaning) {
        // ترجمه با سرویس‌های رایگان (نه هوش مصنوعی) — همون زنجیره‌ی fallback.
        // مقصدِ معنی باید همون زبان مادریِ کاربر باشه (nativeLang)، نه همیشه
        // فارسی — چون پیش‌فرض برنامه فارسیه ولی کاربر می‌تونه هر زبونی رو
        // به‌عنوان زبان مادریش انتخاب کنه.
        const res = await translateFree(term, nativeLang, storyLang, aiSettings);
        meaning = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
      }
    } catch (e) {
      // اگه ترجمه‌ی خودکار شکست بخوره، لغت بدون معنی ذخیره میشه و بعداً قابل ویرایشه
    }
    addWordToCollectionEntry(activeCollection.id, term, meaning);
    refreshCollections();
    setNewWordTerm("");
    setNewWordMeaning("");
    setAddingWord(false);
  };

  const startEditWord = (w) => {
    setEditingTerm(w.term);
    setEditDraftMeaning(w.meaning || "");
  };
  const saveEditWord = (originalTerm) => {
    if (!activeCollection) return;
    updateWordInCollectionEntry(activeCollection.id, originalTerm, { meaning: editDraftMeaning });
    refreshCollections();
    setEditingTerm(null);
  };
  const removeWord = (term) => {
    if (!activeCollection) return;
    removeWordFromCollectionEntry(activeCollection.id, term);
    setSelectedWords((prev) => prev.filter((w) => w !== term));
    refreshCollections();
  };

  // Fills in a Persian meaning for every word in the active collection that
  // doesn't have one yet — via the free translation-service chain (not AI),
  // one request per word, all in parallel.
  const handleTranslateAllMissing = async () => {
    if (!activeCollection) return;
    const missing = activeCollection.words.filter((w) => !w.meaning);
    if (!missing.length) return;
    setTranslatingAll(true);
    try {
      const meanings = await Promise.all(
        missing.map((w) =>
          translateFree(w.term, nativeLang, storyLang, aiSettings).catch(() => "")
        )
      );
      const list = loadWordCollections();
      const idx = list.findIndex((c) => c.id === activeCollection.id);
      if (idx !== -1) {
        const words = list[idx].words.map((w) => {
          const mi = missing.findIndex((m) => m.term === w.term);
          return mi !== -1 && meanings[mi] ? { ...w, meaning: String(meanings[mi]).trim() } : w;
        });
        list[idx] = { ...list[idx], words };
        saveWordCollectionsList(list);
      }
      refreshCollections();
    } catch (e) {
      alert("ترجمه‌ی خودکار انجام نشد، دوباره امتحان کن.");
    } finally {
      setTranslatingAll(false);
    }
  };

  // any language in the app can be a translation target — the story is
  // always AI-generated fresh, so it isn't limited to the static phrase data.
  // نمایش همه‌ی زبان‌های اپ اینجا (نه فقط زبان‌های بالای صفحه)، تا کاربر
  // مجبور نباشه برای اضافه‌کردن یه زبون جدید بره بالا و اسکرول کنه.
  const translationLangOptions = LANGUAGES.map((l) => l.code).filter((c) => c !== storyLang);

  const toggleTranslationLang = (code) => {
    setTranslationLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };
  const selectAllTranslationLangs = () => setTranslationLangs(translationLangOptions);
  const clearAllTranslationLangs = () => setTranslationLangs([]);

  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => c !== storyLang));
  }, [storyLang]);

  // اگه کاربر یه زبان رو از «زبان‌های مقصد» (بالای صفحه) حذف کنه، دیگه نباید
  // به‌عنوان یه گزینه‌ی ترجمه‌ی فعال هم بمونه — همون لحظه از نمایش می‌افته،
  // حتی اگه قبلاً توی translationLangs انتخاب شده بود.
  const translationLangOptionsKey = translationLangOptions.join(",");
  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => translationLangOptions.includes(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationLangOptionsKey]);

  // 🔥 ترجمه‌ی زنده و افزایشی: هر زبانی که توی translationLangs باشه ولی
  // هنوز برای جمله‌های داستان ترجمه نشده (چه همون اول، چه هر زبان جدیدی که
  // کاربر بعداً — بعد از ساخته‌شدنِ داستان — اضافه کنه)، همینجا با زنجیره‌ی
  // سرویس‌های ترجمه‌ی رایگان (translateFree) گرفته و به state اضافه می‌شه.
  // بدون نیاز به ساختن دوباره‌ی داستان.
  useEffect(() => {
    if (!paragraphs.length || !translationLangs.length) return;
    // نکته: چک با «in» (وجودِ کلید)، نه truthiness — چون اگه یه جمله متنِ
    // خالی داشته باشه، ترجمه‌ش هم می‌تونه رشته‌ی خالی برگرده؛ اگه اینجا با
    // truthiness چک می‌کردیم، همچین جمله‌ای همیشه «هنوز ترجمه نشده» حساب
    // می‌شد و این افکت هر بار دوباره اجرا می‌شد — یه حلقه‌ی بی‌پایان که کل
    // اپ رو کند/قفل می‌کرد.
    const missingLangs = translationLangs.filter((code) =>
      paragraphs.some((p) => (p.sentences || []).some((s) => !s.t || !(code in s.t)))
    );
    if (!missingLangs.length) return;
    let cancelled = false;
    (async () => {
      const updated = await Promise.all(
        paragraphs.map(async (p) => {
          const sentences = await Promise.all(
            (p.sentences || []).map(async (s) => {
              const additions = {};
              for (const code of missingLangs) {
                if (s.t && code in s.t) continue;
                try {
                  additions[code] = await translateFree(s.text || "", code, storyLang);
                } catch (e) {
                  additions[code] = s.text || "";
                }
              }
              return Object.keys(additions).length ? { ...s, t: { ...(s.t || {}), ...additions } } : s;
            })
          );
          return { ...p, sentences };
        })
      );
      if (!cancelled) setParagraphs(updated);
    })();
    return () => {
      cancelled = true;
    };
  }, [translationLangs, paragraphs, storyLang]);

  // طبق درخواستِ کاربر: دیگه پیش‌فرض (بدون جستجو) هیچ چیپ پیشنهادی‌ای از VOCAB
  // نشون داده نمی‌شه — قبلاً همیشه کل VOCAB نشون داده می‌شد که خیلی شلوغ بود.
  // فقط وقتی کاربر واقعاً چیزی تو کادرِ جستجو تایپ کرده، نتیجه می‌آد؛ کادر
  // حتی بعد از انتخاب‌شدنِ لغت هم (اگه چیزی برای نمایش نمونده) خالی می‌مونه.
  const filteredVocab = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const matches = VOCAB.filter((v) => {
      const w = v.t[storyLang] || v.t.en || "";
      if (selectedWords.includes(w)) return false;
      return w.toLowerCase().includes(q) || v.meaningFa.includes(qRaw);
    });
    // مثل otherTabMatches، سقف می‌ذاریم تا کادر شلوغ نشه — کاربر با
    // تایپِ دقیق‌تر می‌تونه نتیجه رو محدودتر کنه.
    return matches.slice(0, 20);
  }, [vocabQuery, storyLang, selectedWords]);

  // نتایجِ جستجو از تب‌های «لغات»، «لغات و اخبار»، «مکالمه و روزمره» و
  // «مکالمات روزمره» — فقط وقتی کاربر واقعاً چیزی تایپ کرده (چون این
  // منبع‌ها هزاران ردیف دارن و نشون‌دادنِ همه‌شون بدون جستجو هم کند می‌شه
  // هم بی‌فایده). حداکثر ۳۰ تا نتیجه، برای اینکه چیپ‌ها از صفحه بیرون نزنن.
  const otherTabMatches = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const seen = new Set();
    const results = [];
    for (const pool of [STORY_SEARCH_WORD_POOL, STORY_SEARCH_CONVERSATION_POOL]) {
      for (const item of pool) {
        if (results.length >= 30) break;
        const key = item.term.toLowerCase();
        if (seen.has(key)) continue;
        if (key.includes(q) || (item.fa && item.fa.includes(qRaw))) {
          seen.add(key);
          results.push(item);
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [vocabQuery]);

  // طبق همون درخواست: لغاتِ ذخیره‌شده هم دیگه به‌طور پیش‌فرض (بدون جستجو)
  // نشون داده نمی‌شن — فقط با تایپ‌کردن ظاهر می‌شن، درست مثل بقیه‌ی منبع‌ها.
  const matchingSavedWords = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const matches = savedWordsForLang.filter((e) => {
      // همینجا هم لغتِ از قبل انتخاب‌شده رو مخفی می‌کنیم، همون دلیلِ بالا.
      if (selectedWords.includes(e.word)) return false;
      return e.word.toLowerCase().includes(q) || (e.meaning && e.meaning.includes(qRaw));
    });
    return matches.slice(0, 20);
  }, [vocabQuery, savedWordsForLang, selectedWords]);

  // لغتی که از یه منبعِ فقط-انگلیسی (لغات/اخبار/مکالمه‌ی روزمره) انتخاب
  // شده رو، اگه زبانِ داستان انگلیسی نیست، اول به زبانِ داستان ترجمه می‌کنه
  // (دقیقاً همون مسیرِ addCustomWord)، بعد به لیستِ انتخاب‌شده‌ها اضافه می‌کنه.
  const [translatingPick, setTranslatingPick] = useState(null); // term در حال ترجمه
  // نگه‌داشتنِ نگاشتِ «لغتِ منبع (انگلیسی) → لغتِ ترجمه‌شده‌ای که واقعاً به
  // selectedWords اضافه شد» — چون otherTabMatches همیشه به انگلیسیه ولی
  // selectedWords ممکنه به زبانِ دیگه‌ای باشه؛ بدون این نگاشت نمی‌شه فهمید
  // کدوم آیتمِ این لیست الان «انتخاب‌شده» حساب می‌شه تا از لیست مخفیش کنیم.
  const [pickedTermTranslations, setPickedTermTranslations] = useState({});
  const pickForeignWord = async (term) => {
    if (storyLang === "en") {
      toggleWord(term);
      return;
    }
    setTranslatingPick(term);
    try {
      const res = await translateFree(term, storyLang, "en", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || term;
      setPickedTermTranslations((prev) => ({ ...prev, [term]: translated }));
      toggleWord(translated);
    } catch (e) {
      setPickedTermTranslations((prev) => ({ ...prev, [term]: term }));
      toggleWord(term);
    } finally {
      setTranslatingPick(null);
    }
  };

  const toggleWord = (word) => {
    setSelectedWords((prev) => {
      const already = prev.includes(word);
      if (!already) {
        // با اضافه‌شدن به انتخاب این داستان، خودکار تو انبار دائمی
        // (لغات ذخیره‌شده) هم بمونه — حذف از این داستان بعداً باعث
        // حذف از انبار نمی‌شه، چون اونجا رو دست نمی‌زنیم.
        ensureSavedStoryWord(word, storyLang);
      }
      return already ? prev.filter((w) => w !== word) : [...prev, word];
    });
  };

  const addCustomWord = async () => {
    const w = customWord.trim();
    if (!w) return;
    setCustomWord("");
    setTranslateNote("");
    setWordTranslating(true);
    try {
      // The user can type the word in ANY language (usually their native
      // one) — the story itself is written in storyLang, so the word list
      // fed to the story generator must be in storyLang too. Translate it
      // via the free translation services (not the AI) — a same-language
      // word just comes back unchanged.
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      if (normalizeWord(translated) !== normalizeWord(w)) {
        setTranslateNote(`«${w}» → «${translated}» اضافه شد`);
        setTimeout(() => setTranslateNote(""), 3000);
      }
    } catch (e) {
      // translation failed — fall back to the raw word rather than losing the input
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      setTranslateNote(`ترجمه‌ی خودکار ناموفق بود؛ «${w}» به‌همون شکل اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
    } finally {
      setWordTranslating(false);
    }
  };

  const suggestForgottenWords = () => {
    const ranked = Object.entries(wordStats)
      .filter(([, s]) => s.lang === storyLang)
      .sort((a, b) => (b[1].missed - b[1].correct) - (a[1].missed - a[1].correct))
      .slice(0, 5)
      .map(([w]) => w);
    if (ranked.length) {
      setSelectedWords(ranked);
      ranked.forEach((w) => ensureSavedStoryWord(w, storyLang));
    }
  };

  const generateStory = async () => {
    if (!selectedWords.length || generating) return;
    // اطمینان از اینکه هر لغتی که برای این داستان استفاده می‌شه، تو انبار
    // دائمی «لغات ذخیره‌شده» هم بمونه — حتی اگه از یه مسیر دیگه (غیر از
    // toggleWord/addCustomWord) به selectedWords اضافه شده باشه.
    selectedWords.forEach((w) => ensureSavedStoryWord(w, storyLang));
    setGenerating(true);
    setError("");
    setRepeatNotice("");
    setParagraphs([]);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    try {
      // 🔥 اینجا فقط داستان به زبان اصلی ساخته می‌شه (بدون درخواست ترجمه از هوش مصنوعی)
      const genre = CONTENT_TYPES.find((c) => c.key === contentType) || CONTENT_TYPES[0];
      const lengthCfg = STORY_LENGTHS.find((l) => l.key === storyLength) || STORY_LENGTHS[1];

      // شمارش تقریبی تعداد تکرار هر لغت (و اشکال صرفی نزدیکش) تو متن داستان —
      // برای اینکه بفهمیم مدل واقعاً به تعداد درخواستی پایبند بوده یا نه.
      // شمارش قبلی روی \b (مرزِ کلمه‌ی ASCII) بود که برای هر اسکریپتِ غیرلاتین
      // (فارسی/عربی/روسی و...) و حتی حروفِ لاتینِ با علامت (é, ü, ...) اصلاً
      // کار نمی‌کرد — چون \b فقط بینِ [A-Za-z0-9_] و بقیه‌ی کاراکترها مرز
      // می‌بینه، برای مثلاً فارسی هیچ مرزی پیدا نمی‌شد و شمارش همیشه ۰ برمی‌گشت.
      // نتیجه‌ش این بود که رتراىِ اصلاحِ تعداد تکرار عملاً کور بود و هیچ‌وقت
      // واقعاً کار نمی‌کرد. اینجا با \p{L}/\p{N} (یونیکد) مرزِ کلمه رو دستی
      // می‌سازیم که برای هر زبانی درست کار کنه.
      const countWordOccurrences = (text, word) => {
        const esc = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!esc) return 0;
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}[\\p{L}\\p{N}]*`, "giu");
        const matches = text.match(re);
        return matches ? matches.length : 0;
      };

      const buildPrompt = (correction) => `You are a skilled storyteller writing ${genre.prompt}, in ${storyLangLabel} at CEFR level ${storyLevel}, for a language learner whose native language is ${nativeLabel}.

TOPIC/GENRE — hard requirement, not a suggestion: the story MUST genuinely be ${genre.prompt}. Its plot, tone, setting, and vocabulary must clearly and unmistakably belong to this genre from the first sentence — do not default to a generic everyday story if the genre is something else.

LENGTH — hard requirement: write EXACTLY ${lengthCfg.paragraphMin === lengthCfg.paragraphMax ? lengthCfg.paragraphMin : `between ${lengthCfg.paragraphMin} and ${lengthCfg.paragraphMax}`} paragraphs in total (not fewer, not more), each with ${lengthCfg.sentencesHint}. The "paragraphs" array in your JSON output must contain exactly this many paragraph objects.

NARRATIVE QUALITY:
- Write ONE genuinely coherent, connected story with a real narrative arc (setup → development → payoff/ending appropriate to the genre) — NOT a disconnected list of example sentences that merely happen to sit next to each other.
- Every sentence must follow logically or causally from the one before it and set up the one after it: consistent characters, setting, and cause-and-effect, the way a real short story reads — a reader should never be able to tell which sentence was "built around" which target word.
- The plot and content must feel fully intentional and relevant to the target words themselves — build a story that is actually ABOUT something connected to these words, not a generic story with the words awkwardly inserted.
- You do NOT need to introduce the target words in the order they're listed — use whatever order serves the story best.
- Paragraphs must flow into each other (later paragraphs should refer back to people, places, or events from earlier ones), not restart the scene each time.

REPETITION — important guideline: each target word below should appear as close to ${repeatCount} times as possible (all grammatical forms/inflections of the word counted together as one). A variation of 1 or 2 more or fewer is acceptable — please try to avoid large deviations (e.g., don't use a word 0 times if the budget is ${repeatCount}). The story should feel natural, coherent, and interesting — do not sacrifice quality just to hit an exact number. However, if you notice a word appears much more or much less than ${repeatCount} (e.g., more than double or less than half), try to balance it in your final version. Count roughly before finalizing, but perfection is not required. Target words and their target count: ${selectedWords.map((w) => `"${w}" → about ${repeatCount} times`).join(", ")}.${correction ? " " + correction : ""}

Do NOT lengthen the story beyond the paragraph count above just to fit more repetitions of a word; if a word's target doesn't fit naturally within that length, reuse it within an existing sentence instead of adding new sentences or paragraphs.

After the story, write 5 multiple-choice comprehension/vocabulary questions in ${storyLangLabel}, each testing ONE of the target words, with 4 options and exactly one correct answer. Respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape: {"paragraphs": [{"sentences": [{"text": "sentence in ${storyLang}"}]}], "questions": [{"word": "the target word this question tests, matching one from the list exactly", "question": "...", "options": ["...","...","...","..."], "answerIndex": 0}]}`;

      const tokenBudget = Math.min(lengthCfg.tokens + 500, 8000);

      const runAttempt = async (correction) => {
        const res = await callAI({ prompt: buildPrompt(correction), maxTokens: tokenBudget, aiSettings });
        const cleaned = res.replace(/```json|```/g, "").trim();
        try {
          return JSON.parse(cleaned);
        } catch (parseErr) {
          throw new Error("parse-error: پاسخ هوش مصنوعی کامل یا JSON معتبر نبود — دوباره امتحان کن.");
        }
      };

      const scoreAttempt = (parsedAttempt) => {
        const paraCount = (parsedAttempt.paragraphs || []).length;
        const text = (parsedAttempt.paragraphs || []).flatMap((p) => (p.sentences || []).map((s) => s.text)).join(" ");
        const attemptCounts = selectedWords.map((w) => ({ word: w, count: countWordOccurrences(text, w) }));
        const repDeviation = attemptCounts.reduce((sum, c) => sum + Math.abs(c.count - repeatCount), 0);
        // این دیگه نیازی به «دقیقاً» رسیدن به repeatCount نداره — یه کلمه فقط
        // وقتی offender حساب می‌شه که انحرافش واقعاً بزرگ باشه (بیش از ۲ تا
        // فاصله، و بیشتر از دو برابر یا کمتر از نصفِ عددِ خواسته‌شده)؛ فاصله‌ی
        // ۱ یا ۲ تایی طبیعیه و باعثِ ریترای نمی‌شه.
        const offenders = attemptCounts.filter(
          (c) => Math.abs(c.count - repeatCount) > 2 && (c.count > repeatCount * 2 || c.count < repeatCount / 2)
        );
        // فاصله‌ی تعداد پاراگراف‌ها از بازه‌ی خواسته‌شده (کوتاه/متوسط/بلند) —
        // هر پاراگراف اضافه/کم شمرده می‌شه، وزنِ سنگین‌تری از یه اختلافِ
        // معمولیِ تعداد تکرار می‌گیره چون خودِ ساختارِ داستان رو به هم می‌زنه.
        const paraDeviation =
          paraCount < lengthCfg.paragraphMin ? (lengthCfg.paragraphMin - paraCount) * 3
          : paraCount > lengthCfg.paragraphMax ? (paraCount - lengthCfg.paragraphMax) * 3
          : 0;
        const lengthOk = paraCount >= lengthCfg.paragraphMin && paraCount <= lengthCfg.paragraphMax;
        return { counts: attemptCounts, paraCount, lengthOk, deviation: repDeviation + paraDeviation, offenders };
      };

      let parsed = await runAttempt();
      let best = { parsed, ...scoreAttempt(parsed) };

      // اگه تعداد تکرارها یا تعداد پاراگراف‌ها با درخواست فاصله داشت، تا ۲ بار
      // دیگه با بازخوردِ دقیق (چند بار واقعاً استفاده شده، چند پاراگراف واقعاً
      // نوشته شده) دوباره امتحان می‌کنیم و در نهایت بهترین نسخه (کمترین
      // فاصله‌ی کل از عددهای درخواستی) رو نگه می‌داریم.
      for (let attempt = 0; attempt < 3 && (best.offenders.length > 0 || !best.lengthOk); attempt++) {
        const repDetail = best.offenders.map((c) => `"${c.word}": you used it ${c.count} times, but the target is about ${repeatCount}`).join("; ");
        const lengthDetail = best.lengthOk
          ? ""
          : ` Also, your previous attempt had ${best.paraCount} paragraphs, but it must have ${lengthCfg.paragraphMin === lengthCfg.paragraphMax ? lengthCfg.paragraphMin : `between ${lengthCfg.paragraphMin} and ${lengthCfg.paragraphMax}`} paragraphs — fix the paragraph count too.`;
        const correction = `Your previous attempt had a large repetition imbalance for some words (${repDetail || "see above"}).${lengthDetail} Rewrite the story from scratch and this time get each target word closer to its target of ${repeatCount} mentions — being off by 1 or 2 is totally fine, just avoid using a word way more than double or way less than half of its target. AND land the paragraph count exactly in the required range. Keep the story just as natural, coherent, and connected as before (or more so) while you do this — don't turn it into disconnected example sentences to make counting easier.`;
        try {
          const retryParsed = await runAttempt(correction);
          const retryScore = { parsed: retryParsed, ...scoreAttempt(retryParsed) };
          if (retryScore.deviation < best.deviation) {
            best = retryScore;
          }
        } catch {
          // اگه یه تلاش خطا داد، بهترین نسخه‌ی موجود رو نگه می‌داریم و ادامه می‌دیم
        }
      }
      parsed = best.parsed;

      // بعد از تمومِ ریترای‌ها، اگه هنوزم بعضی لغات دقیقاً به تعدادِ درخواستی
      // نرسیده بودن، شفاف به کاربر می‌گیم — داستان رو (بهترین نسخه‌ی موجود)
      // بازم نشون می‌دیم، فقط دیگه ادعا نمی‌کنیم که تکرارها ۱۰۰٪ دقیقن.
      if (best.offenders && best.offenders.length > 0) {
        const detail = best.offenders.map((o) => `«${o.word}»: ${o.count} بار`).join("، ");
        setRepeatNotice(`تعداد تکرار این لغت‌ها با ${repeatCount} بار خواسته‌شده فاصله‌ی زیادی داره — ${detail}. می‌تونی دوباره «بساز داستان» رو بزنی.`);
      }

      const storyParagraphs = parsed.paragraphs || [];
      
      // ============================================================
      // 🔥 داستان بدون ترجمه ذخیره می‌شه — ترجمه‌ی خودش (با سرویس‌های
      // رایگان، جدا از هوش مصنوعی) رو یه useEffect جدا انجام می‌ده که هر
      // وقت translationLangs عوض بشه (چه همین الان، چه هر وقت کاربر بعداً
      // یه زبان دیگه هم اضافه/کم کنه) خودش رو به‌روز می‌کنه — نیازی به
      // ساختن دوباره‌ی کل داستان نیست.
      setParagraphs(storyParagraphs);
      // داستانِ تازه‌ساخته‌شده هنوز ذخیره نشده — پس هنوز شناسه‌ای نداره؛ اگه
      // قبلاً یه داستانِ ذخیره‌شده‌ی دیگه باز بوده، این‌جا اون ارتباط پاک
      // می‌شه تا لغاتِ تازه‌ذخیره‌شده به اون داستانِ قدیمی نچسبن.
      setCurrentStoryId(null);
      
      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);

      // توجه: قبلاً بعد از ساخت هر داستان، همه‌ی لغات ذخیره‌شده‌ی این زبان
      // از «لغات ذخیره‌شده» پاک می‌شدن. دیگه این کار انجام نمی‌شه — لغات
      // ذخیره‌شده می‌مونن تا هر وقت خواستی (با دکمه‌ی ضربدر کنار هرکدوم)
      // خودت پاکشون کنی.
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.startsWith("ai-backend-error:")) {
        setError(`خطای سرور: ${msg.replace("ai-backend-error: ", "")}`);
      } else if (msg.startsWith("parse-error:")) {
        setError(msg.replace("parse-error: ", ""));
      } else {
        setError(`خطای اتصال: ${msg || "دلیل نامشخص"}`);
      }
    } finally {
      setGenerating(false);
    }
  };
  const saveCurrentStory = () => {
    if (!paragraphs.length) return;
    const entry = {
      id: Date.now(),
      storyLang,
      storyLevel,
      contentType,
      storyLength,
      selectedWords,
      paragraphs,
      questions,
      savedAt: new Date().toISOString(),
    };
    setSavedStories((prev) => [entry, ...prev]);
    setCurrentStoryId(entry.id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const openSavedStory = (entry) => {
    setStoryLang(entry.storyLang);
    setStoryLevel(entry.storyLevel);
    setStoryLength(entry.storyLength || "medium");
    setContentType(entry.contentType || "general");
    setSelectedWords(entry.selectedWords);
    setParagraphs(entry.paragraphs);
    setQuestions(entry.questions || []);
    setAnswers({});
    setSubmitted(false);
    setShowSaved(false);
    setCurrentStoryId(entry.id);
  };

  const deleteSavedStory = (id) => {
    setSavedStories((prev) => prev.filter((s) => s.id !== id));
  };

  const submitQuiz = () => {
    setSubmitted(true);
    setWordStats((prev) => {
      const next = { ...prev };
      questions.forEach((q, i) => {
        if (!q.word) return;
        const key = `${storyLang}:${q.word.toLowerCase()}`;
        const cur = next[key] || { lang: storyLang, missed: 0, correct: 0 };
        const isRight = answers[i] === q.answerIndex;
        next[key] = {
          lang: storyLang,
          missed: cur.missed + (isRight ? 0 : 1),
          correct: cur.correct + (isRight ? 1 : 0),
        };
      });
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontWeight: 700, fontSize: 16 }}>داستان‌ساز</p>
        <button
          onClick={() => setShowSaved((s) => !s)}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 20,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: showSaved ? colors.ink : "white",
            color: showSaved ? "white" : colors.ink,
          }}
        >
          داستان‌های ذخیره‌شده ({savedStories.length})
        </button>
      </div>

      {showSaved ? (
        <div className="flex flex-col gap-3">
          {savedStories.length === 0 && (
            <p style={{ fontSize: 13, color: colors.inkSoft }}>هنوز داستانی ذخیره نکردی.</p>
          )}
          {savedStories.map((s) => (
            <div
              key={s.id}
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 14 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>
                    {LANGUAGES.find((l) => l.code === s.storyLang)?.label} · {s.storyLevel} ·{" "}
                    {CONTENT_TYPES.find((c) => c.key === s.contentType)?.label || "عمومی"} ·{" "}
                    {STORY_LENGTHS.find((l) => l.key === s.storyLength)?.label || "متوسط"}
                  </p>
                  <p style={{ fontSize: 12, color: colors.inkSoft }}>{s.selectedWords.join("، ")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openSavedStory(s)}
                    style={{ fontSize: 12, color: colors.teal, textDecoration: "underline" }}
                  >
                    باز کردن
                  </button>
                  <button onClick={() => deleteSavedStory(s.id)} aria-label="حذف">
                    <X size={16} color={colors.rose} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <p style={{ fontWeight: 700, marginBottom: 10 }}>۱. زبان و سطح داستان</p>
        {storyLangOptions.length > 1 ? (
          <>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              زبان داستان (از بین زبان‌های مقصدی که بالای صفحه انتخاب کردی)
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {storyLangOptions.map((code) => (
                <button
                  key={code}
                  onClick={() => setStoryLang(code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    border: `1px solid ${storyLang === code ? colors.gold : colors.cardBorder}`,
                    backgroundColor: storyLang === code ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {LANGUAGES.find((l) => l.code === code)?.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 10 }}>
            زبان داستان: {storyLangLabel} (طبق زبان مقصدی که بالای صفحه انتخاب کردی)
          </p>
        )}
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "0 0 6px" }}>سطح داستان</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setStoryLevel(lv)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: `1px solid ${storyLevel === lv ? colors.teal : colors.cardBorder}`,
                backgroundColor: storyLevel === lv ? colors.teal : "white",
                color: storyLevel === lv ? "white" : colors.ink,
              }}
            >
              {lv}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px" }}>نوع محتوا</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.key}
              onClick={() => setContentType(c.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: `1px solid ${contentType === c.key ? colors.rose : colors.cardBorder}`,
                backgroundColor: contentType === c.key ? colors.rose : "white",
                color: contentType === c.key ? "white" : colors.ink,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px" }}>طول داستان</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {STORY_LENGTHS.map((l) => (
            <button
              key={l.key}
              onClick={() => setStoryLength(l.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: `1px solid ${storyLength === l.key ? colors.gold : colors.cardBorder}`,
                backgroundColor: storyLength === l.key ? colors.gold : "white",
                color: storyLength === l.key ? "white" : colors.ink,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span style={{ fontSize: 13, color: colors.inkSoft }}>تعداد تکرار هر لغت</span>
          <input
            type="range"
            min={1}
            max={15}
            value={repeatCount}
            onChange={(e) => setRepeatCount(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{repeatCount}</span>
        </div>
      </div>

      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <div className="flex items-center justify-between mb-2">
          <p style={{ fontWeight: 700 }}>۲. انتخاب لغت‌ها</p>
          <button
            onClick={suggestForgottenWords}
            style={{ fontSize: 12, color: colors.teal, textDecoration: "underline" }}
          >
            پیشنهاد بر اساس فراموشی
          </button>
        </div>

        <div className="flex gap-2 mb-1">
          <input
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !wordTranslating && addCustomWord()}
            placeholder={`یه لغت بنویس (به هر زبونی) — به ${storyLangLabel} ترجمه و اضافه می‌شه...`}
            dir="auto"
            disabled={wordTranslating}
            style={{
              flex: 1,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 13,
              outline: "none",
              textAlign: "start",
              opacity: wordTranslating ? 0.6 : 1,
            }}
          />
          <button
            onClick={addCustomWord}
            disabled={wordTranslating}
            style={{ backgroundColor: colors.ink, color: "white", borderRadius: 10, padding: "0 12px", opacity: wordTranslating ? 0.6 : 1 }}
          >
            {wordTranslating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          </button>
        </div>
        {translateNote && (
          <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>{translateNote}</p>
        )}

        <div style={{ marginBottom: 10, border: `1px dashed ${colors.cardBorder}`, borderRadius: 12, padding: 10 }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 12, color: colors.inkSoft }}>منبع لغت (مثل کتاب ۵۰۴ واژه) — {storyLangLabel}</p>
            <button
              onClick={() => setShowAddCollection((v) => !v)}
              style={{ fontSize: 12, color: colors.teal, textDecoration: "underline" }}
            >
              {showAddCollection ? "بستن" : "+ منبع جدید"}
            </button>
          </div>

          {showAddCollection && (
            <div className="flex flex-col gap-2 mb-2">
              <input
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                placeholder={`اسم منبع، مثلاً «۵۰۴ واژه ضروری» (زبان: ${storyLangLabel})`}
                dir="auto"
                style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none" }}
              />
              <textarea
                value={newCollectionText}
                onChange={(e) => setNewCollectionText(e.target.value)}
                placeholder={`لغت‌ها رو یکی یکی توی هر خط بچسبون. مثال:\nabandon - to leave completely\nbenevolent - kind and generous\ncandid`}
                dir="auto"
                rows={5}
                style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "monospace" }}
              />
              <button
                onClick={handleSaveCollection}
                disabled={!newCollectionTitle.trim() || !newCollectionText.trim()}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: colors.teal,
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: !newCollectionTitle.trim() || !newCollectionText.trim() ? 0.5 : 1,
                }}
              >
                ذخیره‌ی منبع
              </button>
            </div>
          )}

          {collections.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-2">
                {collections.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${activeCollectionId === c.id ? colors.teal : colors.cardBorder}`,
                      backgroundColor: activeCollectionId === c.id ? colors.teal : "white",
                      color: activeCollectionId === c.id ? "white" : colors.ink,
                    }}
                  >
                    <button dir="auto" onClick={() => setActiveCollectionId(c.id)}>
                      {c.title} ({c.words.length})
                    </button>
                    <button
                      onClick={() => {
                        deleteWordCollection(c.id);
                        refreshCollections();
                        if (activeCollectionId === c.id) setActiveCollectionId("");
                      }}
                      title="حذف منبع"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {activeCollection && (
                <>
                  <div className="flex flex-wrap gap-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                    {activeCollection.words.map((w) => {
                      const active = selectedWords.includes(w.term);
                      const isEditing = editingTerm === w.term;
                      if (isEditing) {
                        return (
                          <div
                            key={w.term}
                            dir="auto"
                            className="flex items-center gap-1"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 20,
                              fontSize: 12,
                              border: `1px solid ${colors.teal}`,
                              backgroundColor: "white",
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{w.term}</span>
                            <input
                              value={editDraftMeaning}
                              onChange={(e) => setEditDraftMeaning(e.target.value)}
                              placeholder="معنی فارسی"
                              autoFocus
                              style={{ width: 110, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, padding: "3px 6px", fontSize: 12, outline: "none" }}
                            />
                            <button onClick={() => saveEditWord(w.term)} title="ذخیره" style={{ color: colors.teal, display: "flex" }}>
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingTerm(null)} title="انصراف" style={{ color: colors.inkSoft, display: "flex" }}>
                              <X size={12} />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <span
                          key={w.term}
                          dir="auto"
                          className="flex items-center gap-1"
                          style={{
                            padding: "5px 6px 5px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
                            backgroundColor: active ? colors.goldSoft : colors.paper,
                          }}
                        >
                          <button onClick={() => toggleWord(w.term)} title={w.meaning || ""}>
                            {w.term}
                            {w.meaning ? ` — ${w.meaning}` : ""}
                          </button>
                          <button onClick={() => startEditWord(w)} title="ویرایش معنی" style={{ color: colors.inkSoft, display: "flex" }}>
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => removeWord(w.term)} title="حذف لغت" style={{ color: colors.inkSoft, display: "flex" }}>
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mt-2" style={{ flexWrap: "wrap" }}>
                    <input
                      value={newWordTerm}
                      onChange={(e) => setNewWordTerm(e.target.value)}
                      placeholder={`لغت جدید (${storyLangLabel})`}
                      dir="auto"
                      style={{ flex: "1 1 120px", border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px", fontSize: 12, outline: "none" }}
                    />
                    <input
                      value={newWordMeaning}
                      onChange={(e) => setNewWordMeaning(e.target.value)}
                      placeholder="معنی فارسی (خالی = ترجمه خودکار)"
                      dir="auto"
                      style={{ flex: "1 1 160px", border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px", fontSize: 12, outline: "none" }}
                    />
                    <button
                      onClick={handleAddWordToCollection}
                      disabled={!newWordTerm.trim() || addingWord}
                      className="flex items-center gap-1"
                      style={{
                        backgroundColor: colors.teal,
                        color: "white",
                        borderRadius: 10,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: !newWordTerm.trim() || addingWord ? 0.5 : 1,
                      }}
                    >
                      {addingWord ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                      افزودن
                    </button>
                  </div>

                  {activeCollection.words.some((w) => !w.meaning) && (
                    <button
                      onClick={handleTranslateAllMissing}
                      disabled={translatingAll}
                      className="flex items-center gap-1 mt-2"
                      style={{ fontSize: 12, color: colors.teal }}
                    >
                      {translatingAll ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />}
                      ترجمه‌ی خودکار معنی‌های خالی
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            !showAddCollection && (
              <p style={{ fontSize: 11, color: colors.inkSoft }}>
                هنوز منبعی برای {storyLangLabel} اضافه نکردی. لغات کتابی مثل ۵۰۴ واژه رو بچسبون تا بشه ازش برای داستان انتخاب کرد.
              </p>
            )
          )}
        </div>

        <input
          value={vocabQuery}
          onChange={(e) => setVocabQuery(e.target.value)}
          placeholder="یا از لغات، مکالمات روزمره، لغات و اخبار، لغات ذخیره‌شده جستجو کن..."
          style={{
            width: "100%",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
            marginBottom: 10,
          }}
        />
        <div className="flex flex-wrap gap-2 mb-3" style={{ maxHeight: 140, overflowY: "auto" }}>
          {filteredVocab.map((v) => {
            const w = v.t[storyLang] || v.t.en;
            const active = selectedWords.includes(w);
            return (
              <button
                key={v.id}
                onClick={() => toggleWord(w)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
                  backgroundColor: active ? colors.goldSoft : colors.paper,
                }}
              >
                {w}
              </button>
            );
          })}

          {/* لغاتِ ذخیره‌شده‌ی همین زبان — فقط وقتی کاربر جستجو می‌کنه (طبق
              درخواست، دیگه به‌طور پیش‌فرض نشون داده نمی‌شن). */}
          {matchingSavedWords.map((e) => {
            const active = selectedWords.includes(e.word);
            return (
              <button
                key={`saved-${e.word}`}
                onClick={() => toggleWord(e.word)}
                title="از لغات ذخیره‌شده"
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.teal}`,
                  backgroundColor: active ? colors.goldSoft : "white",
                }}
              >
                <Bookmark size={11} color={colors.teal} />
                {e.word}
              </button>
            );
          })}

          {/* نتایجِ جستجو از تب‌های لغات / لغات و اخبار / مکالمه‌ی روزمره /
              مکالمات روزمره — فقط وقتی کاربر تایپ کرده. چون این‌ها فقط به
              انگلیسی‌ان، اگه زبانِ داستان چیز دیگه‌ای باشه، اول ترجمه می‌شن. */}
          {otherTabMatches
            .filter((item) => {
              // اگه این لغت (به شکلِ ترجمه‌شده‌ی واقعاً اضافه‌شده‌اش) همین الان
              // تو انتخاب‌های داستانه، دیگه تو این لیست نشونش نده.
              const mapped = storyLang === "en" ? item.term : pickedTermTranslations[item.term];
              return !mapped || !selectedWords.includes(mapped);
            })
            .map((item) => {
            const busy = translatingPick === item.term;
            return (
              <button
                key={`other-${item.source}-${item.term}`}
                onClick={() => pickForeignWord(item.term)}
                disabled={busy}
                title={item.source}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${colors.cardBorder}`,
                  backgroundColor: colors.paper,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy && <Loader2 size={11} className="spin" />}
                {item.term}
                <span style={{ fontSize: 9, color: colors.inkSoft }}>({item.source})</span>
              </button>
            );
          })}
        </div>

        {selectedWords.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            {selectedWords.map((w) => (
              <span
                key={w}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  backgroundColor: colors.ink,
                  color: "white",
                }}
              >
                {w}
                <button onClick={() => toggleWord(w)} aria-label="حذف">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {translationLangOptions.length > 0 && (
        <div className="mb-3" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, backgroundColor: colors.paper }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 12, color: colors.inkSoft }}>
              داستان همزمان به چه زبان‌هایی ترجمه بشه؟ (می‌تونی چند تا انتخاب کنی)
            </p>
            <div className="flex gap-2">
              <button onClick={selectAllTranslationLangs} style={{ fontSize: 11, color: colors.teal, textDecoration: "underline" }}>
                انتخاب همه
              </button>
              <button onClick={clearAllTranslationLangs} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                پاک کردن همه
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {translationLangOptions.map((code) => (
              <button
                key={code}
                onClick={() => toggleTranslationLang(code)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${translationLangs.includes(code) ? colors.gold : colors.cardBorder}`,
                  backgroundColor: translationLangs.includes(code) ? colors.goldSoft : "white",
                }}
              >
                {LANGUAGES.find((l) => l.code === code)?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={generateStory}
        disabled={!selectedWords.length || generating}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: colors.gold,
          color: "white",
          borderRadius: 14,
          padding: "12px 16px",
          fontWeight: 700,
          opacity: !selectedWords.length || generating ? 0.6 : 1,
        }}
      >
        <Sparkles size={18} />
        {generating ? "در حال ساخت داستان..." : "بساز داستان"}
      </button>

      {error && (
        <div style={{ backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 }}>{error}</p>
          <button
            onClick={generateStory}
            disabled={generating}
            style={{
              fontFamily: fontFa,
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              backgroundColor: colors.rose,
              borderRadius: 8,
              padding: "5px 14px",
              opacity: generating ? 0.6 : 1,
            }}
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {repeatNotice && !error && (
        <div style={{ backgroundColor: "#FFF6E0", border: `1px solid ${colors.gold}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 12, color: colors.ink }}>{repeatNotice}</p>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div
          style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontWeight: 700 }}>داستان</p>
            <div className="flex items-center gap-3 flex-wrap" style={{ rowGap: 8 }}>
              <button
                onClick={saveCurrentStory}
                title={justSaved ? "ذخیره شد" : "ذخیره داستان"}
                aria-label={justSaved ? "ذخیره شد" : "ذخیره داستان"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: justSaved ? colors.teal : colors.gold,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {justSaved ? <Check size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {/* انتخاب زبان‌های ترجمه از اینجا حذف شد — همون انتخاب بالای دکمه‌ی
              «بساز داستان» (قبل از ساخت) کافیه و دیگه دوباره اینجا تکرار
              نمی‌شه. فقط «نمایش ترجمه» (نحوه‌ی چیدمانش) اینجا می‌مونه. */}
          {translationLangOptions.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>نمایش ترجمه:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "sentence", label: "جمله به جمله" },
                  { key: "paragraph", label: "پاراگراف به پاراگراف" },
                  { key: "none", label: "هیچکدام" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGranularity(opt.key)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${granularity === opt.key ? colors.teal : colors.cardBorder}`,
                      backgroundColor: granularity === opt.key ? colors.teal : "white",
                      color: granularity === opt.key ? "white" : colors.ink,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {paragraphs.map((p, pi) => {
              const paragraphText = (p.sentences || []).map((s) => s?.text || "").join(" ");
              const showTranslations = granularity !== "none" && translationLangs.length > 0;
              return (
                <div key={pi} style={{ borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 }}>
                  {granularity === "sentence" ? (
                    <div className="flex flex-col gap-3">
                      {(p.sentences || []).map((s, si) => {
                        return (
                        <div
                          key={si}
                          ref={(el) => (sentenceElsRef.current[`${pi}-${si}`] = el)}
                          style={{
                            position: "relative",
                            paddingInlineStart: 10,
                            borderRadius: 10,
                            transition: "background-color 0.4s ease, box-shadow 0.4s ease",
                            backgroundColor:
                              highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si
                                ? colors.goldSoft
                                : "transparent",
                            boxShadow:
                              highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si
                                ? `0 0 0 2px ${colors.gold}`
                                : "none",
                          }}
                        >
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton text={s.text} code={storyLang} color={colors.inkSoft} edge={dirFor(storyLang) === "ltr" ? "end" : undefined} />
                            <p
                              style={{
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                // برخی فونت‌های سریف بارگذاری‌شده (مثل Lora) وزن ۸۰۰/۹۰۰ واقعی
                                // ندارن و مرورگر بی‌سروصدا همون رگولار رو نشون می‌ده؛ این
                                // text-stroke تضمین می‌کنه متن اصلیِ داستان همیشه پررنگ دیده
                                // بشه، صرف‌نظر از اینکه فونت خودش وزن سنگین داره یا نه.
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              {activeStorySentence && activeStorySentence.pi === pi && activeStorySentence.si === si ? (
                                <WordTrackedText
                                  text={s.text}
                                  relOffset={activeStoryWordOffset - (sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0)}
                                  fontFamily={RTL_LANGS.includes(storyLang) ? fontFa : fontLatin}
                                  fontWeight={900}
                                  color={mainTextColor}
                                />
                              ) : (
                                <ClickableSentence
                                  text={s.text}
                                  langCode={storyLang}
                                  nativeLang={nativeLang}
                                  nativeLabel={nativeLabel}
                                  aiSettings={aiSettings}
                                  color={mainTextColor}
                                  fontWeight={900}
                                  storyBaseOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                                  onSpeakOffset={(localEnd) => reportStoryWordSpoken(sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0, localEnd)}
                                  originExtra={{ storyId: currentStoryId, pi, si }}
                                />
                              )}
                            </p>
                          </div>
                          {showTranslations &&
                            translationLangs.map((code) => {
                              const translated = s.t?.[code];
                              return (
                                <div
                                  key={code}
                                  className="flex items-start gap-2"
                                  dir={dirFor(code)}
                                  style={{
                                    marginTop: 3,
                                  }}
                                >
                                  {translated && <SpeakButton text={translated} code={code} color={translationColor} edge={dirFor(code) === "ltr" ? "end" : undefined} />}
                                  <p
                                    style={{
                                      fontSize: 13.5,
                                      color: translationColor,
                                      fontWeight: 900,
                                      textAlign: "justify",
                                      fontFamily: code === "fa" ? fontFa : fontLatin,
                                    }}
                                  >
                                    <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                    {translated ? (
                                      <ClickableSentence
                                        text={translated}
                                        langCode={code}
                                        nativeLang={nativeLang}
                                        nativeLabel={nativeLabel}
                                        aiSettings={aiSettings}
                                        color={translationColor}
                                        fontFamily={code === "fa" ? fontFa : fontLatin}
                                        alignSourceText={s.text}
                                        alignSourceLang={storyLang}
                                        originExtra={{ storyId: currentStoryId, pi, si }}
                                      />
                                    ) : (
                                      <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      ref={(el) => (paragraphElsRef.current[pi] = el)}
                      style={{
                        position: "relative",
                        paddingInlineStart: 10,
                        borderRadius: 10,
                        transition: "background-color 0.4s ease, box-shadow 0.4s ease",
                        backgroundColor:
                          highlightSentence && highlightSentence.pi === pi ? colors.goldSoft : "transparent",
                        boxShadow:
                          highlightSentence && highlightSentence.pi === pi ? `0 0 0 2px ${colors.gold}` : "none",
                      }}
                    >
                      <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                        <SpeakButton text={paragraphText} code={storyLang} color={colors.inkSoft} edge={dirFor(storyLang) === "ltr" ? "end" : undefined} />
                        <p
                          style={{
                            fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                            fontSize: 15,
                            lineHeight: 1.8,
                            textAlign: "justify",
                            fontWeight: 900,
                            WebkitTextStroke: `0.4px ${mainTextColor}`,
                          }}
                        >
                          {activeStorySentence && activeStorySentence.pi === pi ? (
                            <WordTrackedText
                              text={paragraphText}
                              relOffset={activeStoryWordOffset - (paragraphBaseOffsetMap[pi] ?? 0)}
                              fontFamily={RTL_LANGS.includes(storyLang) ? fontFa : fontLatin}
                              fontWeight={900}
                              color={mainTextColor}
                            />
                          ) : (
                          <ClickableSentence
                            text={paragraphText}
                            langCode={storyLang}
                            nativeLang={nativeLang}
                            nativeLabel={nativeLabel}
                            aiSettings={aiSettings}
                            color={mainTextColor}
                            fontWeight={900}
                            storyBaseOffset={paragraphBaseOffsetMap[pi] ?? 0}
                            onSpeakOffset={(localEnd) => reportStoryWordSpoken(paragraphBaseOffsetMap[pi] ?? 0, localEnd)}
                            originExtra={{ storyId: currentStoryId, pi, si: null }}
                          />
                          )}
                        </p>
                      </div>
                      {showTranslations &&
                        translationLangs.map((code) => {
                          const sentencesList = p.sentences || [];
                          const translated = sentencesList.length && sentencesList.every((s) => s?.t?.[code])
                            ? sentencesList.map((s) => s.t[code]).join(" ")
                            : null;
                          return (
                            <div
                              key={code}
                              className="flex items-start gap-2"
                              dir={dirFor(code)}
                              style={{ marginTop: 4 }}
                            >
                              {translated && <SpeakButton text={translated} code={code} color={translationColor} edge={dirFor(code) === "ltr" ? "end" : undefined} />}
                              <p
                                style={{
                                  fontSize: 13.5,
                                  color: translationColor,
                                  fontWeight: 900,
                                  textAlign: "justify",
                                  fontFamily: code === "fa" ? fontFa : fontLatin,
                                }}
                              >
                                <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                {translated ? (
                                  <ClickableSentence
                                    text={translated}
                                    langCode={code}
                                    nativeLang={nativeLang}
                                    nativeLabel={nativeLabel}
                                    aiSettings={aiSettings}
                                    color={translationColor}
                                    fontFamily={code === "fa" ? fontFa : fontLatin}
                                    alignSourceText={paragraphText}
                                    alignSourceLang={storyLang}
                                    originExtra={{ storyId: currentStoryId, pi, si: null }}
                                  />
                                ) : (
                                  <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-4" style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            {selectedWords.map((w) => (
              <span key={w} style={{ fontSize: 11, color: colors.inkSoft, backgroundColor: colors.paper, borderRadius: 10, padding: "3px 8px" }}>
                {w}: {countOccurrences(fullStoryText, w)} بار
              </span>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div
          style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
        >
          <p style={{ fontWeight: 700, marginBottom: 12 }}>تمرین درک مطلب</p>
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <div key={i}>
                <p style={{ fontSize: 14, marginBottom: 8 }}>
                  {i + 1}. {q.question} <span style={{ color: colors.teal, fontSize: 12 }}>({q.word})</span>
                </p>
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isChosen = answers[i] === oi;
                    const isCorrect = q.answerIndex === oi;
                    let bg = "white";
                    if (submitted && isCorrect) bg = "#DDEEE4";
                    else if (submitted && isChosen && !isCorrect) bg = "#F3DADA";
                    else if (isChosen) bg = colors.paper;
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() => setAnswers((prev) => ({ ...prev, [i]: oi }))}
                        style={{
                          textAlign: "right",
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `1px solid ${colors.cardBorder}`,
                          backgroundColor: bg,
                          fontSize: 13,
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {!submitted ? (
            <button
              onClick={submitQuiz}
              disabled={Object.keys(answers).length < questions.length}
              style={{
                marginTop: 16,
                backgroundColor: colors.teal,
                color: "white",
                borderRadius: 12,
                padding: "10px 16px",
                fontWeight: 700,
                opacity: Object.keys(answers).length < questions.length ? 0.6 : 1,
              }}
            >
              بررسی جواب‌ها
            </button>
          ) : (
            <p style={{ marginTop: 16, fontSize: 14, fontWeight: 700 }}>
              {questions.filter((q, i) => answers[i] === q.answerIndex).length} از {questions.length} درست بود.
              لغاتی که اشتباه زدی خودکار برای داستان بعدی «پیشنهاد بر اساس فراموشی» می‌شن.
            </p>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved Words — a dedicated home for every word bookmarked via the word-tap
// popover's "save for next story" button, grouped by language, so they're
// easy to find later instead of only surfacing inside Story Builder.
// ---------------------------------------------------------------------------
function SavedWordsPanel({ onJumpToStory, onJumpToOrigin, nativeLang, nativeLabel, targetOrder, dictHistory, setDictHistory, onGoToDictionary }) {
  const [words, setWords] = useState([]);
  // لغاتی که کاربر توی همین صفحه علامت زده تا ببره داستان‌ساز — جدا از
  // خودِ انبار دائمی؛ فقط یه انتخاب موقتیه، نه حذف/اضافه به ذخیره‌شده‌ها.
  // همین انتخاب برای «حذف انتخاب‌شده‌ها» و «کپی در دیکشنری» هم استفاده می‌شه.
  const [picked, setPicked] = useState({}); // { [langCode]: Set(word) }
  // متن جستجو برای فیلترکردن لغات ذخیره‌شده (روی خودِ لغت یا هر کدوم از
  // معادل‌هاش) — روی «انتخاب همه» و «پاک کردن همه» هم اثر می‌ذاره، یعنی
  // فقط لغاتِ در حال نمایش رو در برمی‌گیرن.
  const [query, setQuery] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // نگه‌داشتنِ طولانی (لانگ‌پرس) روی هر کارت → کاربر رو به همون تبی می‌بره
  // که اون لغت/عبارت اونجا ذخیره شده بود (origin.tab — نگاه کن به
  // toggleSavedStoryWord/ensureSavedStoryWord). یه ref مشترکِ بینِ همه‌ی
  // کارت‌ها کافیه چون همیشه فقط یک لمس/کلیک در آنِ واحد فعاله.
  const pressStateRef = useRef({ key: null, timer: null, moved: false, startX: 0, startY: 0 });

  const clearPress = () => {
    if (pressStateRef.current.timer) clearTimeout(pressStateRef.current.timer);
    pressStateRef.current = { key: null, timer: null, moved: false, startX: 0, startY: 0 };
  };

  const jumpToOrigin = (entry) => {
    if (!onJumpToOrigin) return;
    const ok = onJumpToOrigin(entry);
    setActionMsg(
      ok
        ? `رفتیم به همون بخشی که «${entry.word}» ازش ذخیره شده بود`
        : "منبعِ این لغت مشخص نیست (احتمالاً قبل از این قابلیت ذخیره شده)"
    );
  };

  const beginPress = (key, clientX, clientY, entry, target) => {
    // اگه لمس/کلیک روی خودِ یکی از دکمه‌های داخلِ کارت (پخش صدا، حذف،
    // ویرایش...) شروع شده، لانگ‌پرس فعال نمی‌شه — همون دکمه کارِ خودش رو بکنه.
    if (target && target.closest && target.closest("button")) return;
    clearPress();
    pressStateRef.current = {
      key,
      startX: clientX,
      startY: clientY,
      moved: false,
      timer: setTimeout(() => {
        if (pressStateRef.current.key === key && !pressStateRef.current.moved) {
          jumpToOrigin(entry);
        }
      }, 550),
    };
  };

  const movePress = (clientX, clientY) => {
    const st = pressStateRef.current;
    if (!st.key) return;
    if (Math.abs(clientX - st.startX) > 10 || Math.abs(clientY - st.startY) > 10) {
      st.moved = true;
      if (st.timer) clearTimeout(st.timer);
    }
  };

  useEffect(() => {
    const refresh = () => setWords(loadSavedStoryWords());
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, []);

  // زبان‌هایی که باید معادل هر لغت رو نشون بدیم: زبان مادری + هر زبان
  // مقصدی که کاربر بالای صفحه انتخاب کرده. اگه کاربر یه زبان مقصد تازه
  // اضافه کنه، همین‌جا هم خودکار معادلش برای همه‌ی لغات ذخیره‌شده می‌آد.
  const relevantLangs = Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter(Boolean);

  // هر لغتی که هنوز ترجمه‌اش به یکی از این زبون‌ها ذخیره نشده (مثلاً چون از
  // داستان‌ساز اضافه شده، نه از پاپ‌آپ لغت، یا چون کاربر تازه یه زبون مقصد
  // جدید اضافه کرده)، همین‌جا در پس‌زمینه ترجمه و کش می‌شه تا زیر همون کلمه
  // نشون داده بشه.
  useEffect(() => {
    if (!relevantLangs.length) return;
    words.forEach((e) => {
      relevantLangs.forEach((toLang) => {
        if (toLang === e.langCode) return;
        if (e.translations && e.translations[toLang]) return;
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${toLang}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        translateFree(e.word, toLang, e.langCode)
          .then((result) => {
            if (result && normalizeWord(result) !== normalizeWord(e.word)) {
              updateSavedWordTranslation(e.word, e.langCode, toLang, result);
            }
          })
          .catch(() => {})
          .finally(() => crossTranslateInFlight.delete(fetchKey));
      });
    });
  }, [words, relevantLangs.join(",")]);

  const togglePick = (code, word) => {
    setPicked((prev) => {
      const set = new Set(prev[code] || []);
      if (set.has(word)) set.delete(word);
      else set.add(word);
      return { ...prev, [code]: set };
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (e) => {
    if (!normalizedQuery) return true;
    if ((e.word || "").toLowerCase().includes(normalizedQuery)) return true;
    if (e.translations) {
      return Object.values(e.translations).some((t) => (t || "").toLowerCase().includes(normalizedQuery));
    }
    return false;
  };
  // فقط لغاتی که با متن جستجو مچ می‌شن نمایش داده می‌شن؛ «انتخاب همه» و
  // «پاک کردن همه» هم روی همین لیستِ فیلترشده عمل می‌کنن، نه کل انبار.
  const filteredWords = words.filter(matchesQuery);

  const byLang = {};
  filteredWords.forEach((w) => {
    if (!byLang[w.langCode]) byLang[w.langCode] = [];
    byLang[w.langCode].push(w);
  });
  const langCodes = Object.keys(byLang);

  const totalPicked = Object.values(picked).reduce((sum, set) => sum + (set ? set.size : 0), 0);
  const allVisibleSelected =
    filteredWords.length > 0 && filteredWords.every((e) => (picked[e.langCode] || new Set()).has(e.word));

  const toggleSelectAll = () => {
    setPicked((prev) => {
      const next = { ...prev };
      filteredWords.forEach((e) => {
        const set = new Set(next[e.langCode] || []);
        if (allVisibleSelected) set.delete(e.word);
        else set.add(e.word);
        next[e.langCode] = set;
      });
      return next;
    });
  };

  const deleteSelected = () => {
    if (!totalPicked) return;
    if (!window.confirm(`حذف دائمی ${totalPicked} لغت انتخاب‌شده؟`)) return;
    Object.entries(picked).forEach(([code, set]) => {
      (set || new Set()).forEach((word) => removeSavedStoryWord(word, code));
    });
    setPicked({});
    setActionMsg(`${totalPicked} لغت حذف شد`);
  };

  const clearAll = () => {
    if (!filteredWords.length) return;
    const msg = normalizedQuery
      ? `${filteredWords.length} لغتِ در حال نمایش برای همیشه پاک بشن؟`
      : `همه‌ی ${filteredWords.length} لغت ذخیره‌شده برای همیشه پاک بشن؟`;
    if (!window.confirm(msg)) return;
    filteredWords.forEach((e) => removeSavedStoryWord(e.word, e.langCode));
    setPicked({});
    setActionMsg(`${filteredWords.length} لغت پاک شد`);
  };

  // معادل‌های هر لغتِ انتخاب‌شده (که قبلاً توی همین پنل جمع شده) رو مستقیم
  // به تاریخچه‌ی دیکشنری اضافه می‌کنه — بدون نیاز به جستجوی دوباره از AI.
  // لغاتی که از قبل توی دیکشنری بودن (بر اساس خودِ کلمه) رد می‌شن تا داده‌ی
  // کامل‌تری که قبلاً از AI گرفته شده بود دست‌نخورده بمونه.
  const copySelectedToDictionary = () => {
    if (!totalPicked || !setDictHistory) return;
    const toCopy = [];
    Object.entries(picked).forEach(([code, set]) => {
      (set || new Set()).forEach((word) => {
        const entry = words.find((w) => w.langCode === code && w.word === word);
        if (entry) toCopy.push(entry);
      });
    });
    if (!toCopy.length) return;
    const existingKeys = new Set((dictHistory || []).map((h) => (h.word || "").toLowerCase()));
    const additions = [];
    toCopy.forEach((e) => {
      const key = (e.word || "").toLowerCase();
      if (!key || existingKeys.has(key)) return;
      existingKeys.add(key);
      additions.push({
        word: e.word,
        detectedLang: e.langCode,
        pos: "",
        ipa: "",
        meaningFa: e.langCode !== nativeLang ? (e.translations && e.translations[nativeLang]) || "" : "",
        translations: { ...(e.translations || {}) },
        examples: [],
        lookedUpAt: Date.now(),
      });
    });
    if (additions.length) {
      setDictHistory((prev) => [...additions, ...prev].slice(0, 50));
    }
    const skipped = toCopy.length - additions.length;
    setActionMsg(
      additions.length && skipped
        ? `${additions.length} لغت به دیکشنری اضافه شد (${skipped} تا قبلاً بود)`
        : additions.length
        ? `${additions.length} لغت به دیکشنری اضافه شد`
        : "همه‌ی لغات انتخاب‌شده قبلاً توی دیکشنری بودن"
    );
  };

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(""), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const toolbarButtonStyle = {
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 20,
    border: `1px solid ${colors.cardBorder}`,
    backgroundColor: "white",
    whiteSpace: "nowrap",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>لغات ذخیره‌شده</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          لغاتی که با دکمه‌ی «ذخیره برای داستان بعدی» نشون کردی، یا موقع ساختن هر داستانی انتخاب کردی، همه‌شون اینجا جمع می‌شن. هرکدوم رو خواستی بزن تا انتخاب بشه، بعد «افزودن به داستان‌ساز» رو بزن.
        </p>
      </div>

      {words.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
          >
            <Search size={15} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در لغات ذخیره‌شده..."
              dir="auto"
              style={{ flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="پاک کردن جستجو" style={{ display: "flex" }}>
                <X size={15} color={colors.inkSoft} />
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={toggleSelectAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.ink, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <CheckSquare size={13} />
              {allVisibleSelected ? "لغو انتخاب همه" : "انتخاب همه"}
            </button>
            <button
              onClick={clearAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.rose, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <Trash2 size={13} />
              پاک کردن همه
            </button>
            {totalPicked > 0 && (
              <>
                <button onClick={deleteSelected} className="flex items-center gap-1" style={{ ...toolbarButtonStyle, color: colors.rose }}>
                  <X size={13} />
                  حذف {totalPicked} انتخاب‌شده
                </button>
                <button onClick={copySelectedToDictionary} className="flex items-center gap-1" style={{ ...toolbarButtonStyle, color: colors.teal }}>
                  <Copy size={13} />
                  کپی در دیکشنری
                </button>
              </>
            )}
          </div>

          {actionMsg && (
            <p className="flex items-center gap-2" style={{ fontSize: 12, color: colors.teal }}>
              {actionMsg}
              {onGoToDictionary && actionMsg.includes("دیکشنری") && (
                <button onClick={onGoToDictionary} style={{ textDecoration: "underline", color: colors.teal }}>
                  مشاهده در دیکشنری
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {langCodes.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.inkSoft }}>
          {words.length === 0
            ? "هنوز لغتی ذخیره نکردی. روی هر کلمه‌ی داخل متن‌ها بزن و از پاپ‌آپش «ذخیره برای داستان بعدی» رو انتخاب کن، یا موقع ساخت داستان لغت انتخاب کن."
            : "با این جستجو لغتی پیدا نشد."}
        </p>
      ) : (
        langCodes.map((code) => {
          const label = LANGUAGES.find((l) => l.code === code)?.label || code;
          const pickedSet = picked[code] || new Set();
          return (
            <div
              key={code}
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontWeight: 700 }}>
                  {label} ({byLang[code].length})
                </p>
                <button
                  onClick={() => onJumpToStory(code, Array.from(pickedSet))}
                  disabled={pickedSet.size === 0}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 12,
                    color: pickedSet.size ? colors.teal : colors.inkSoft,
                    textDecoration: "underline",
                    opacity: pickedSet.size ? 1 : 0.5,
                  }}
                >
                  <Sparkles size={13} />
                  {pickedSet.size ? `افزودن ${pickedSet.size} لغت به داستان‌ساز` : "افزودن به داستان‌ساز"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {byLang[code].map((e) => {
                  const isPicked = pickedSet.has(e.word);
                  // معادلِ این لغت به هر زبونی غیر از خودِ زبونِ مبدا —
                  // زبان مادری اول، بعد هر زبان مقصدِ دیگه‌ای که کاربر
                  // بالای صفحه فعال کرده، به همون ترتیب.
                  const otherLangs = relevantLangs.filter((l) => l !== code);
                  const level = lookupSavedWordLevel(e.word, code);
                  const pressKey = `${code}:${e.word}`;
                  return (
                    <div
                      key={e.word}
                      title="نگه‌دار تا به منبعِ این لغت بری"
                      onMouseDown={(ev) => beginPress(pressKey, ev.clientX, ev.clientY, e, ev.target)}
                      onMouseMove={(ev) => movePress(ev.clientX, ev.clientY)}
                      onMouseUp={clearPress}
                      onMouseLeave={clearPress}
                      onTouchStart={(ev) => {
                        const t = ev.touches[0];
                        beginPress(pressKey, t.clientX, t.clientY, e, ev.target);
                      }}
                      onTouchMove={(ev) => {
                        const t = ev.touches[0];
                        movePress(t.clientX, t.clientY);
                      }}
                      onTouchEnd={clearPress}
                      onTouchCancel={clearPress}
                      onContextMenu={(ev) => ev.preventDefault()}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 110,
                        maxWidth: 210,
                        borderRadius: 14,
                        border: `1px solid ${isPicked ? colors.gold : colors.cardBorder}`,
                        backgroundColor: isPicked ? colors.goldSoft : colors.paper,
                        padding: "7px 10px",
                        touchAction: "pan-y",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2" style={{ direction: "ltr" }}>
                        <button
                          onClick={() => togglePick(code, e.word)}
                          dir="auto"
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: colors.ink,
                            textAlign: "start",
                            overflowWrap: "break-word",
                          }}
                        >
                          {e.word}
                        </button>
                        <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                          <SpeakButton text={e.word} code={code} color={colors.gold} />
                          <button
                            onClick={() => removeSavedStoryWord(e.word, code)}
                            style={{ color: colors.inkSoft, display: "flex" }}
                            title="حذف دائمی"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      </div>
                      {level && (
                        <div>
                          <LevelBadge level={level} />
                        </div>
                      )}
                      {otherLangs.map((toLang) => {
                        const translation = (e.translations && e.translations[toLang]) || "";
                        const toLabel = LANGUAGES.find((l) => l.code === toLang)?.label || toLang;
                        return (
                          <div key={toLang} className="flex items-center justify-between gap-2" style={{ direction: "ltr" }}>
                            <div
                              dir={dirFor(toLang)}
                              title={toLabel}
                              style={{
                                fontSize: 11,
                                color: colors.inkSoft,
                                lineHeight: 1.6,
                                fontFamily: toLang === "fa" ? fontFa : fontLatin,
                                overflowWrap: "break-word",
                                flex: 1,
                              }}
                            >
                              {translation || "…"}
                            </div>
                            {translation && <SpeakButton text={translation} code={toLang} color={colors.teal} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grammar tab — two things live here:
//   1) Saved grammar notes: detailed per-word explanations the user chose to
//      keep from the word-tap popover ("افزودن به یادگیری گرامر").
//   2) A practice chat: the learner writes a sentence, the AI corrects it if
//      needed and walks through it word by word, like a real teacher.
// `jumpTo` arrives from requestGrammarJump() (word popover) with a fresh
// word to fetch + show immediately, offering a "save" button once it loads.
// ---------------------------------------------------------------------------
function GrammarPanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  jumpTo,
  playerBarHeight = 0,
  practiceOpacity = 100,
  setPracticeOpacity,
  onPracticePanelHeightChange,
}) {
  const [notes, setNotes] = useState([]);
  const [expandedNote, setExpandedNote] = useState(null);
  const [pending, setPending] = useState(null); // { word, sentence, langCode, markdown: "loading" | "error" | string }

  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [chatMessages, setChatMessages] = useState([]); // [{ role: "user"|"ai", text }]
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);
  // نوارِ «تمرین جمله‌سازی» یه Bottom Sheetِ قابلِ‌کشیدنه، دقیقاً مثلِ نقشه‌ی
  // گوگل، با سه نقطه‌ی قفل (snap point):
  //   • peek  — فقط سرتیترِ نوار دیده می‌شه (حالتِ جمع‌شده‌ی پیش‌فرض)
  //   • half  — نصفِ ارتفاعِ صفحه (برای تایپ/تمرینِ نوشتن، درحالی‌که
  //             جمله‌های بالای صفحه هم دیده می‌مونن)
  //   • full  — تقریباً کلِ صفحه (فقط وقتی خودِ کاربر کاملاً بکشتش بالا)
  // با کشیدنِ سرتیتر (grip handle) ارتفاع لحظه‌ای تغییر می‌کنه؛ با رهاکردن،
  // به نزدیک‌ترین نقطه قفل می‌شه. تپ‌ِ ساده (بدونِ حرکتِ محسوس) هم بینِ
  // peek و half سوییچ می‌کنه. خودِ گفتگو (chatMessages) در هر سه حالت
  // دست‌نخورده می‌مونه، چون این کامپوننت همیشه mount شده‌ست.
  const [practiceSheet, setPracticeSheet] = useState("peek");
  const [practiceDragHeight, setPracticeDragHeight] = useState(null);
  const practicePanelRef = useRef(null);
  const practiceHeaderRef = useRef(null);
  const practiceDragInfoRef = useRef(null);
  const [practiceHeaderH, setPracticeHeaderH] = useState(56);
  const [practiceViewportH, setPracticeViewportH] = useState(() =>
    typeof window === "undefined" ? 800 : Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight)
  );

  // ارتفاعِ واقعیِ خودِ سرتیتر رو اندازه می‌گیریم (وابسته به فونت/چیدمان)،
  // تا نقطه‌ی «peek» همیشه دقیقاً هم‌اندازه‌ی سرتیتر باشه، نه یه عددِ ثابتِ
  // حدسی.
  useLayoutEffect(() => {
    const el = practiceHeaderRef.current;
    if (!el) return;
    setPracticeHeaderH(Math.ceil(el.getBoundingClientRect().height));
  }, []);

  // ارتفاعِ واقعیِ دیدِ صفحه (viewport) رو دنبال می‌کنیم — نه فقط با resize
  // معمولی، بلکه با visualViewport هم، چون وقتی کیبوردِ موبایل باز می‌شه،
  // این چیزیه که واقعاً کوچیک می‌شه (برخلافِ 100vh که خیلی مرورگرها
  // عوضش نمی‌کنن). این باعث می‌شه سقفِ «full» با بازشدنِ کیبورد درست
  // تنظیم بشه و پنل هیچ‌وقت از چیزی که واقعاً دیده می‌شه بزرگ‌تر نشه.
  useEffect(() => {
    const update = () => {
      const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      setPracticeViewportH(Math.round(h));
    };
    update();
    window.addEventListener("resize", update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    }
    return () => {
      window.removeEventListener("resize", update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      }
    };
  }, []);

  const practiceSnapHeight = useCallback(
    (state) => {
      if (state === "half") return Math.round(practiceViewportH * 0.5);
      if (state === "full") return Math.round(practiceViewportH * 0.92);
      return practiceHeaderH;
    },
    [practiceViewportH, practiceHeaderH]
  );

  const practiceCurrentHeight = practiceDragHeight != null ? practiceDragHeight : practiceSnapHeight(practiceSheet);

  const handlePracticeDragStart = useCallback(
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      practiceDragInfoRef.current = {
        startY: e.clientY,
        startHeight: practiceSnapHeight(practiceSheet),
        moved: false,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    },
    [practiceSheet, practiceSnapHeight]
  );

  const handlePracticeDragMove = useCallback(
    (e) => {
      const info = practiceDragInfoRef.current;
      if (!info) return;
      const delta = info.startY - e.clientY; // کشیدن به بالا = ارتفاع بیشتر
      if (Math.abs(delta) > 4) info.moved = true;
      const min = practiceHeaderH;
      const max = Math.round(practiceViewportH * 0.92);
      setPracticeDragHeight(Math.min(max, Math.max(min, info.startHeight + delta)));
    },
    [practiceHeaderH, practiceViewportH]
  );

  const handlePracticeDragEnd = useCallback(() => {
    const info = practiceDragInfoRef.current;
    practiceDragInfoRef.current = null;
    if (!info) return;
    if (!info.moved) {
      // تپِ ساده (بدونِ کشیدنِ محسوس) — فقط بینِ جمع و نیمه سوییچ کن.
      setPracticeSheet((prev) => (prev === "peek" ? "half" : "peek"));
      setPracticeDragHeight(null);
      return;
    }
    const finalHeight = practiceDragHeight != null ? practiceDragHeight : info.startHeight;
    const candidates = {
      peek: practiceHeaderH,
      half: Math.round(practiceViewportH * 0.5),
      full: Math.round(practiceViewportH * 0.92),
    };
    let nearest = "peek";
    let minDiff = Infinity;
    for (const key of ["peek", "half", "full"]) {
      const diff = Math.abs(candidates[key] - finalHeight);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = key;
      }
    }
    setPracticeSheet(nearest);
    setPracticeDragHeight(null);
  }, [practiceDragHeight, practiceHeaderH, practiceViewportH]);

  useLayoutEffect(() => {
    const el = practicePanelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && onPracticePanelHeightChange) onPracticePanelHeightChange(Math.ceil(h));
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (onPracticePanelHeightChange) onPracticePanelHeightChange(0);
    };
  }, [onPracticePanelHeightChange]);

  // Follow-up "ask about this note" box shown under each expanded saved
  // note. Keyed by note id since several notes can (in theory) be expanded
  // one at a time. Answers here get appended straight onto the note itself
  // (see appendGrammarNoteThread), so they're always persisted already.
  const [noteAskInput, setNoteAskInput] = useState({});
  const [noteAskLoading, setNoteAskLoading] = useState({});
  const [noteAskError, setNoteAskError] = useState({});
  const noteElsRef = useRef({}); // id -> DOM node, for auto-read scroll
  const noteAskTextareaRefs = useRef({}); // id -> textarea DOM node, for auto-grow
  const [savedWordsTick, setSavedWordsTick] = useState(0); // bumps when a word gets saved/removed, to refresh bookmark icons

  useEffect(() => {
    const bump = () => setSavedWordsTick((t) => t + 1);
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
  }, []);

  const isFa = nativeLang === "fa";

  useEffect(() => {
    const refresh = () => setNotes(loadGrammarNotes());
    refresh();
    window.addEventListener(GRAMMAR_NOTES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(GRAMMAR_NOTES_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!jumpTo || !jumpTo.word) return;
    let cancelled = false;
    setPending({ word: jumpTo.word, sentence: jumpTo.sentence, langCode: jumpTo.langCode, markdown: "loading" });
    lookupWordGrammarDetail({
      word: jumpTo.word,
      sentence: jumpTo.sentence,
      langCode: jumpTo.langCode,
      nativeLang,
      nativeLabel,
      aiSettings,
      targetOrder,
    })
      .then((md) => {
        if (!cancelled) setPending((p) => (p && p.word === jumpTo.word ? { ...p, markdown: md } : p));
      })
      .catch(() => {
        if (!cancelled) setPending((p) => (p && p.word === jumpTo.word ? { ...p, markdown: "error" } : p));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chatMessages, chatLoading]);

  // Auto-grow the textarea as the learner types multi-line sentences.
  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [chatInput]);

  function clearChat() {
    setChatMessages([]);
    setChatError("");
  }

  async function askAboutNote(note) {
    const question = (noteAskInput[note.id] || "").trim();
    if (!question || noteAskLoading[note.id]) return;
    setNoteAskInput((s) => ({ ...s, [note.id]: "" }));
    setNoteAskError((s) => ({ ...s, [note.id]: "" }));
    setNoteAskLoading((s) => ({ ...s, [note.id]: true }));
    const ta = noteAskTextareaRefs.current[note.id];
    if (ta) ta.style.height = "auto";
    try {
      const history = [
        { role: "user", text: note.sentence || note.word },
        { role: "ai", text: note.markdown },
        ...(note.thread || []).flatMap((t) => [
          { role: "user", text: t.question },
          { role: "ai", text: t.answer },
        ]),
      ];
      const answer = await askGrammarTeacher({
        userSentence: question,
        langCode: note.langCode,
        nativeLang,
        nativeLabel,
        aiSettings,
        history,
        targetOrder,
      });
      appendGrammarNoteThread(note.id, { question, answer });
    } catch (e) {
      setNoteAskError((s) => ({
        ...s,
        [note.id]: e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply"),
      }));
    } finally {
      setNoteAskLoading((s) => ({ ...s, [note.id]: false }));
    }
  }

  async function sendChat() {
    const sentence = chatInput.trim();
    if (!sentence || chatLoading) return;
    setChatInput("");
    setChatError("");
    const nextMessages = [...chatMessages, { role: "user", text: sentence }];
    setChatMessages(nextMessages);
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: sentence,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: chatMessages,
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: sentence }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply"));
    } finally {
      setChatLoading(false);
    }
  }

  const langOptions = targetOrder && targetOrder.length ? targetOrder : LANGUAGES.map((l) => l.code);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>گرامر</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          توضیحات گرامری‌ای که از روی لغت‌های داستان ذخیره کردی اینجاست. پایین‌تر هم می‌تونی با هوش مصنوعی جمله بنویسی تا مثل یه معلم زبان، اصلاحش کنه و گرامرش رو کلمه‌به‌کلمه بهت یاد بده — یا هر سوال گرامری دیگه‌ای هم داشتی همون‌جا بپرسی.
        </p>
      </div>

      {pending && (
        <div style={{ backgroundColor: "white", border: `1px solid ${colors.gold}`, borderRadius: 16, padding: 16 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SpeakButton text={pending.word} code={pending.langCode} />
              <p dir="auto" style={{ fontWeight: 700 }}>
                {pending.word}
              </p>
              <button
                onClick={() => toggleSavedStoryWord(pending.word, pending.langCode)}
                title={isWordSaved(pending.word, pending.langCode) ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت"}
                style={{ color: isWordSaved(pending.word, pending.langCode) ? colors.gold : colors.inkSoft, display: "flex" }}
              >
                <Bookmark size={14} fill={isWordSaved(pending.word, pending.langCode) ? colors.gold : "none"} />
              </button>
            </div>
            <button onClick={() => setPending(null)} style={{ color: colors.inkSoft, display: "flex" }}>
              <X size={16} />
            </button>
          </div>
          {pending.markdown === "loading" && (
            <div className="flex items-center gap-1" style={{ fontSize: 13, color: colors.inkSoft }}>
              <Loader2 size={14} className="spin" />
              در حال آماده کردن توضیح کامل...
            </div>
          )}
          {pending.markdown === "error" && (
            <p style={{ color: colors.rose, fontSize: 13 }}>خطا در دریافت توضیح. دوباره امتحان کن.</p>
          )}
          {pending.markdown && pending.markdown !== "loading" && pending.markdown !== "error" && (
            <>
              <MiniMarkdown text={pending.markdown} speakCode={pending.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />
              <button
                onClick={() => {
                  saveGrammarNote({
                    langCode: pending.langCode,
                    word: pending.word,
                    sentence: pending.sentence,
                    markdown: pending.markdown,
                  });
                  setPending(null);
                }}
                className="flex items-center gap-1"
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                  background: colors.gold,
                  borderRadius: 8,
                  padding: "6px 12px",
                }}
              >
                <Bookmark size={13} />
                ذخیره در یادگیری گرامر
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notes.length === 0 && !pending && (
          <p style={{ fontSize: 13, color: colors.inkSoft }}>
            هنوز نکته‌ی گرامری‌ای ذخیره نکردی. روی هر کلمه‌ی داخل داستان بزن و «افزودن به یادگیری گرامر» رو انتخاب کن.
          </p>
        )}
        {notes.map((n) => {
          const isOpen = expandedNote === n.id;
          const langLabel = LANGUAGES.find((l) => l.code === n.langCode)?.label || n.langCode;
          const wordSaved = isWordSaved(n.word, n.langCode);
          return (
            <div
              key={n.id}
              ref={(el) => (noteElsRef.current[n.id] = el)}
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12 }}
            >
              <div
                className="flex items-center justify-between"
                onClick={() => setExpandedNote(isOpen ? null : n.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-2">
                  <SpeakButton text={extractSpeakableText(n.markdown) || n.word} code={n.langCode} />
                  <div>
                    <p dir="auto" style={{ fontWeight: 700, fontSize: 14 }}>
                      {n.word}
                    </p>
                    <p style={{ fontSize: 11, color: colors.inkSoft }}>{langLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSavedStoryWord(n.word, n.langCode);
                    }}
                    style={{ color: wordSaved ? colors.gold : colors.inkSoft, display: "flex" }}
                    title={wordSaved ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت"}
                  >
                    <Bookmark size={14} fill={wordSaved ? colors.gold : "none"} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGrammarNote(n.id);
                    }}
                    style={{ color: colors.inkSoft, display: "flex" }}
                    title="حذف"
                  >
                    <X size={14} />
                  </button>
                  {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 8, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 8 }}>
                  <MiniMarkdown text={n.markdown} speakCode={n.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />

                  {(n.thread || []).map((t, i) => (
                    <div key={i} style={{ marginTop: 10 }}>
                      <div dir="auto" style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 4 }}>
                        {t.question}
                      </div>
                      <div style={{ background: colors.goldSoft, borderRadius: 10, padding: "8px 10px" }}>
                        <MiniMarkdown text={t.answer} speakCode={n.langCode} nativeLang={nativeLang} aiSettings={aiSettings} />
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 items-end" style={{ marginTop: 10, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
                    <textarea
                      ref={(el) => (noteAskTextareaRefs.current[n.id] = el)}
                      dir="auto"
                      rows={1}
                      value={noteAskInput[n.id] || ""}
                      onChange={(e) => {
                        setNoteAskInput((s) => ({ ...s, [n.id]: e.target.value }));
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          askAboutNote(n);
                        }
                      }}
                      placeholder={
                        isFa
                          ? "سوالی درباره‌ی همین نکته داری؟ (برای خط جدید Enter، برای پرسیدن دکمه رو بزن)"
                          : "Ask about this note... (Enter for new line, tap the button to ask)"
                      }
                      style={{
                        flex: 1,
                        border: `1px solid ${colors.cardBorder}`,
                        borderRadius: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        fontFamily: "inherit",
                        resize: "none",
                        lineHeight: 1.6,
                        maxHeight: 120,
                      }}
                    />
                    <button
                      onClick={() => askAboutNote(n)}
                      disabled={noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim()}
                      style={{
                        backgroundColor: colors.gold,
                        color: "white",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        opacity: noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim() ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {noteAskLoading[n.id] ? <Loader2 size={13} className="spin" /> : (isFa ? "بپرس" : "Ask")}
                    </button>
                  </div>
                  {noteAskError[n.id] && (
                    <p style={{ fontSize: 11, color: colors.rose, marginTop: 4 }}>{noteAskError[n.id]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* نوارِ «تمرین جمله‌سازی با هوش مصنوعی» — یه Bottom Sheetِ
          قابلِ‌کشیدنه با سه نقطه‌ی قفل (peek/half/full)، همیشه چسبیده به
          کفِ صفحه (bottom: 0)، درست بالای نوارِ پلیر. با createPortal
          مستقیم زیرِ <body> رندر می‌شه — چون GrammarPanel خودش داخلِ یه
          div با display:none قایم می‌شه وقتی تبِ فعلی «گرامر» نیست (برای
          این‌که چتِ تمرین از بین نره)، و اگه همین‌جا با position:fixed
          می‌موند، آبا/جد با display:none باعث می‌شد این نوار هم با رفتن به
          تب‌های دیگه قایم بشه. با پورتال، این نوار از اون محدودیت فرار
          می‌کنه و توی همه‌ی تب‌ها همیشه روی صفحه باقی می‌مونه (sticky در
          تمامِ صفحات). */}
      {createPortal(
        <div
          ref={practicePanelRef}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 42,
            height: practiceCurrentHeight,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: colors.paperDark,
            border: `1px solid ${PRACTICE_PANEL_BORDER}`,
            borderTop: `1px solid ${PRACTICE_PANEL_BORDER}`,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.12)",
            transition: practiceDragHeight != null ? "none" : "height 0.24s cubic-bezier(.2,.8,.2,1)",
            touchAction: "none",
          }}
        >
          {/* هدرِ رنگیِ نوار — تیل توپر با متنِ سفید؛ خودِ این هدر همون
              دستگیره‌ی کشیدنه (grip handle). کشیدنِ آروم بالا/پایین ارتفاع
              رو لحظه‌ای عوض می‌کنه؛ با رهاکردن، به نزدیک‌ترین نقطه‌ی قفل
              (جمع/نیمه/کامل) اسنپ می‌شه. یه تپِ ساده (بدونِ کشیدنِ محسوس)
              هم بینِ جمع و نیمه سوییچ می‌کنه. کادرِ نوشتنِ پایین همیشه (در
              هر سه حالت) در دسترسه، دقیقاً مثلِ نوارِ ارسالِ پیامِ
              اپ‌های چت. */}
          <div
            ref={practiceHeaderRef}
            onPointerDown={handlePracticeDragStart}
            onPointerMove={handlePracticeDragMove}
            onPointerUp={handlePracticeDragEnd}
            onPointerCancel={handlePracticeDragEnd}
            role="button"
            tabIndex={0}
            aria-expanded={practiceSheet !== "peek"}
            aria-label={
              practiceSheet === "peek"
                ? "بازکردنِ گفتگوی تمرین جمله‌سازی و گرامر"
                : "جمع‌کردنِ گفتگوی تمرین جمله‌سازی و گرامر"
            }
            style={{ backgroundColor: colors.teal, cursor: "grab", userSelect: "none", flexShrink: 0 }}
          >
            {/* دستگیره‌ی کوچیکِ بالا — نشونه‌ی بصریِ این‌که قابلِ‌کشیدنه. */}
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.55)",
                margin: "6px auto 0",
              }}
            />
            <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap" style={{ rowGap: 6 }}>
              <div className="flex items-center gap-2" style={{ fontWeight: 700, color: "#fff" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: colors.teal,
                    border: "2px solid rgba(255,255,255,0.85)",
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle size={12} color="#ffffff" fill="rgba(255,255,255,0.15)" strokeWidth={2.25} />
                  {chatMessages.length > 0 && practiceSheet === "peek" && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -2,
                        insetInlineEnd: -2,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: colors.gold,
                        border: `2px solid ${colors.teal}`,
                      }}
                    />
                  )}
                </span>
                <span>تمرین جمله‌سازی و گرامر با هوش مصنوعی</span>
                {practiceSheet === "peek" ? <ChevronUp size={16} color="#fff" /> : <ChevronDown size={16} color="#fff" />}
              </div>
              <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="flex items-center gap-1"
                    style={{ fontSize: 11, color: "#fff", opacity: 0.9 }}
                    title={isFa ? "پاک‌کردن گفتگو" : "Clear conversation"}
                  >
                    <Trash2 size={12} />
                    {isFa ? "پاک‌کردن گفتگو" : "Clear"}
                  </button>
                )}
                <select
                  value={chatLang}
                  onChange={(e) => setChatLang(e.target.value)}
                  style={{ fontSize: 12, border: "none", borderRadius: 8, padding: "3px 6px" }}
                >
                  {langOptions.map((code) => (
                    <option key={code} value={code}>
                      {LANGUAGES.find((l) => l.code === code)?.label || code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* بدنه‌ی نوار — عرضش استانداردِ صفحاتِ چته (تمام‌عرض روی موبایل،
              با یه سقفِ عرض روی صفحه‌های بزرگ‌تر تا خیلی کشیده نشه).
              flex:1 می‌گیره تا هرچقدر ارتفاعِ نوار (با کشیدن) عوض بشه،
              خودش رو با اون تطبیق بده؛ تاریخچه‌ی گفتگو هم به‌جای یه
              maxHeight ثابت، از باقیِ فضا پر می‌شه (flex:1، خودش
              overflow-y:auto). همیشه mount می‌مونه (نه با شرط)، تا کشیدن/
              اسنپ‌شدن نرم به نظر بیاد؛ فقط توی حالتِ «peek»، ارتفاعِ خودِ
              نوار (که همون ارتفاعِ هدره) عملاً هیچی ازش رو نشون نمی‌ده. */}
          <div
            style={{
              width: "min(100%, 640px)",
              margin: "0 auto",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              aria-hidden={practiceSheet === "peek"}
              className="px-4"
              style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <p style={{ fontSize: 12, color: colors.inkSoft, margin: "8px 0 8px", flexShrink: 0 }}>
                یه جمله به {LANGUAGES.find((l) => l.code === chatLang)?.label || chatLang} بنویس؛ اگه غلط بود اصلاحش می‌کنم و کلمه‌به‌کلمه گرامرش رو توضیح می‌دم. یا هر سوال گرامری‌ای که داری — چه درباره‌ی این جمله، چه یه سوال کاملاً جدا — همین‌جا بپرس تا مثل یه معلم زبان جواب بدم.
              </p>

                {chatMessages.length > 0 && (
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginBottom: 10, paddingRight: 2 }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end", marginBottom: 10 }}>
                        <div
                          dir="auto"
                          style={{
                            maxWidth: "90%",
                            padding: "8px 12px",
                            borderRadius: 12,
                            fontSize: 13,
                            backgroundColor: m.role === "user" ? colors.paper : colors.goldSoft,
                            border: `1px solid ${colors.cardBorder}`,
                          }}
                        >
                          {m.role === "user" ? m.text : <MiniMarkdown text={m.text} speakCode={chatLang} nativeLang={nativeLang} aiSettings={aiSettings} />}
                          {m.role === "ai" && (
                            <div className="flex justify-end" style={{ marginTop: 6 }}>
                              {m.savedToGrammar ? (
                                <span
                                  className="flex items-center gap-1"
                                  style={{ fontSize: 11, color: colors.gold, fontWeight: 700 }}
                                >
                                  <Bookmark size={12} fill={colors.gold} />
                                  ذخیره شد
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    saveGrammarNote({
                                      langCode: chatLang,
                                      word: m.forSentence || "جمله",
                                      sentence: m.forSentence || "",
                                      markdown: m.text,
                                    });
                                    // یه‌بار ذخیره کافیه — با تغییر همین پیام به حالت
                                    // «ذخیره شد»، دکمه غیرفعال می‌شه و دیگه نیازی به
                                    // زدن دوباره‌ش نیست (که قبلاً گیج‌کننده بود).
                                    setChatMessages((prev) =>
                                      prev.map((msg, idx) => (idx === i ? { ...msg, savedToGrammar: true } : msg))
                                    );
                                  }}
                                  className="flex items-center gap-1"
                                  style={{ fontSize: 11, color: colors.teal, textDecoration: "underline" }}
                                >
                                  <Bookmark size={12} />
                                  ذخیره در یادگیری گرامر
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-1" style={{ fontSize: 12, color: colors.inkSoft }}>
                        <Loader2 size={13} className="spin" />
                        در حال بررسی جمله...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
                {chatError && <p style={{ fontSize: 12, color: colors.rose, marginBottom: 8, flexShrink: 0 }}>{chatError}</p>}
            </div>

            {/* کادرِ نوشتن — همیشه در دسترسه (در هر سه حالتِ جمع/نیمه/کامل)،
                دقیقاً مثلِ نوارِ ارسالِ پیامِ اپ‌های چت که همیشه پایینِ صفحه
                ثابته. با تپ‌کردن روی خودِ اینپوت، اگه نوار کاملاً جمع بود
                (peek)، فقط تا نیمه (half) باز می‌شه — نه کاملِ صفحه — تا
                جمله‌های بالای صفحه هم درحینِ تایپ دیده بمونن. */}
            <div className="px-4" style={{ paddingBottom: 8, flexShrink: 0 }}>
              <div
                className="flex gap-2 items-end"
                style={{
                  backgroundColor: colors.paper,
                  border: `1.5px solid ${colors.teal}`,
                  borderRadius: 12,
                  padding: 6,
                  marginTop: practiceSheet === "peek" ? 8 : 0,
                }}
              >
                <textarea
                  ref={chatTextareaRef}
                  dir="auto"
                  rows={1}
                  value={chatInput}
                  onFocus={() => setPracticeSheet((s) => (s === "peek" ? "half" : s))}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder="جمله‌ت رو بنویس یا سوالت رو بپرس... (برای خط جدید Enter، برای ارسال دکمه رو بزن)"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    maxHeight: 140,
                    backgroundColor: "transparent",
                    color: colors.ink,
                  }}
                />
                <button
                  onClick={() => {
                    setPracticeSheet((s) => (s === "peek" ? "half" : s));
                    sendChat();
                  }}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    backgroundColor: colors.teal,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                    boxShadow: chatLoading || !chatInput.trim() ? "none" : "0 2px 8px rgba(28,37,65,0.25)",
                    flexShrink: 0,
                  }}
                >
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
function PhrasebookMain({ user, onLogout, appPrefs, setAppPrefs }) {
  const [nativeLang, setNativeLang] = useState("fa");
  // طبق درخواست: هر بار که وارد اکانت می‌شی، زبان‌های مقصد نباید از دفعه‌ی
  // قبل به‌خاطر مونده باشن و از پیش انتخاب‌شده بیان — باید خالی شروع بشه و
  // خودت هر بار انتخابش کنی. برای همین هم مقدارِ اولیه‌ش [] شده (نه ["en"])
  // و هم، پایین‌تر در applySavedState، دیگه از روی داده‌ی ذخیره‌شده (چه
  // محلی چه ابری) پر نمی‌شه.
  const [targetOrder, setTargetOrder] = useState([]);
  // ترتیبِ نمایشِ خودِ مهرهای زبان (ردیفِ زبان مادری و ردیفِ زبان‌های مقصد) —
  // با کشیدن یه مهر روی مهرِ دیگه (DraggableLangRow) عوض می‌شه، جدا از
  // targetOrder که فقط ترتیبِ ترجمه‌های همون زبان‌های از‌قبل‌انتخاب‌شده‌ست.
  const [langPickerOrder, setLangPickerOrder] = useState(() => PHRASEBOOK_LANGUAGES.map((l) => l.code));
  const [favorites, setFavorites] = useState(new Set());
  const [wordFavorites, setWordFavorites] = useState(new Set());
  const [tab, setTab] = useState("conversations");
  // این تب رو به متغیرِ سراسریِ currentOriginTab هم می‌رسونه — تا هر لغت/
  // عبارتی که همین الان (توی هر تبی) ذخیره می‌شه، بدونه از کجا اومده.
  useEffect(() => {
    setCurrentOriginTab(tab);
  }, [tab]);
  const [boxes, setBoxes] = useState(() => {
    const initial = {};
    conversation .forEach((p) => (initial[p.id] = 1));
    return initial;
  });
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  // شفافیتِ نوار پخشِ چسبیده به کف صفحه — درصدی از ۰ (کاملاً شفاف) تا ۱۰۰
  // (کاملاً کدر). روی دستگاه ذخیره می‌شه تا هربار برنگرده به پیش‌فرض.
  const [playerOpacity, setPlayerOpacity] = useState(() => {
    const saved = localStorage.getItem("phrasebook-player-opacity");
    const n = saved === null ? 100 : Number(saved);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
  });
  useEffect(() => {
    localStorage.setItem("phrasebook-player-opacity", String(playerOpacity));
  }, [playerOpacity]);
  // شفافیتِ پنلِ شناورِ «تمرین جمله‌سازی با هوش مصنوعی» — دقیقاً مثل
  // playerOpacity بالا، جدا و مستقل ذخیره می‌شه که با شفافیتِ پلیر تداخل
  // نکنه.
  const [practiceOpacity, setPracticeOpacity] = useState(() => {
    const saved = localStorage.getItem("phrasebook-practice-opacity");
    const n = saved === null ? 100 : Number(saved);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
  });
  useEffect(() => {
    localStorage.setItem("phrasebook-practice-opacity", String(practiceOpacity));
  }, [practiceOpacity]);
  // ارتفاعِ واقعیِ نوارِ پلیر (اندازه‌گیری‌شده)، تا پنلِ شناورِ تمرین دقیقاً
  // بالای همون بشینه، هرجا ارتفاعِ پلیر (مثلاً با چیدمانِ ریسپانسیو) عوض شد.
  const [playerBarHeight, setPlayerBarHeight] = useState(108);
  const playerBarRef = useRef(null);
  useLayoutEffect(() => {
    const el = playerBarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h) setPlayerBarHeight(Math.ceil(h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // ارتفاعِ واقعیِ پنلِ شناورِ تمرین (از خودِ GrammarPanel گزارش می‌شه)، تا
  // پدینگِ پایینِ <main> تو تبِ گرامر به‌اندازه‌ی کافی باشه و آخرین نکته‌ی
  // گرامری زیرِ پنلِ شناور گم نشه.
  const [practicePanelHeight, setPracticePanelHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // «loaded» فقط یعنی نسخه‌ی محلی (localStorage) لود شده و صفحه می‌تونه باز
  // بشه — ولی نسخه‌ی ابری (Supabase) ممکنه هنوز در راه باشه (مخصوصاً
  // اولین‌بار روی یه دستگاه/مرورگر تازه که چیزی توی localStorage نیست).
  // اگه ذخیره‌ی خودکار (افکتِ پایین) فقط به «loaded» گوش می‌داد، ممکن بود
  // ۵۰۰ میلی‌ثانیه بعد از باز شدنِ برنامه — قبل از این‌که جوابِ ابری برسه —
  // همون حالتِ خالی/پیش‌فرض رو به‌عنوانِ «آخرین نسخه» به Supabase بفرسته و
  // داستان‌ها/لغاتِ ذخیره‌شده‌ی واقعی که آنجا بودن رو برای همیشه پاک کنه.
  // «cloudChecked» دقیقاً همین مسابقه (race) رو می‌بنده: تا وقتی جوابِ ابری
  // (چه موفق چه ناموفق) نرسیده، یا اصلاً کاربری لاگین نیست، ذخیره‌ی خودکار
  // منتظر می‌مونه.
  const [cloudChecked, setCloudChecked] = useState(false);
  const [wordStats, setWordStats] = useState({});
  const [savedStories, setSavedStories] = useState([]);
  const [dictHistory, setDictHistory] = useState([]);
  const [backendUrl, setBackendUrl] = useState("");
  const [storyJump, setStoryJump] = useState(null); // { lang, token } — set when jumping in from Saved Words
  // متنِ کاملِ داستانِ ساخته‌شده در تبِ داستان‌ساز — برای این‌که دکمه‌ی
  // 🔊ِ «خواندنِ کل متن» روی نوارِ پلیر (پایینِ صفحه) بتونه بدونِ داشتنِ
  // دکمه‌ی جداگانه‌ی بالای داستان، همون متن رو بخونه.
  const [storyPlayerText, setStoryPlayerText] = useState({ text: "", code: "" });
  // همون الگو، ولی برای متنِ خوندنیِ تبِ «مکالمات روزمره» (سناریوی
  // بازشده). هر تب که بخواد دکمه‌ی 🔊ِ روی پلیر متنِ خودش رو بخونه، یه
  // state مشابه اینجا اضافه می‌کنه و پایین (روی نوارِ پلیر) به ازای
  // تبِ خودش نشون داده می‌شه.
  const [dailyPlayerText, setDailyPlayerText] = useState({ text: "", code: "" });
  // یه state مشترک برای هر سه تبی که از WordList استفاده می‌کنن (لغات،
  // لغات‌و‌اخبار، مکالمه‌و‌روزمره) — چون همیشه فقط یکیشون هم‌زمان mount
  // می‌مونه، لازم نیست هر تب state جدا داشته باشه.
  const [wordListPlayerText, setWordListPlayerText] = useState({ text: "", code: "" });
  const [grammarJump, setGrammarJump] = useState(null); // { word, sentence, langCode, token } — set from the word popover
  const aiSettings = { backendUrl, setBackendUrl };
  const userStorageKey = `${STORAGE_KEY}:${user?.email || "guest"}`;

  // Lets the word-tap popover (ClickableSentence, rendered in several
  // far-apart tabs) hand a word straight to the Grammar tab without
  // threading a callback prop through every component in between.
  useEffect(() => {
    requestGrammarJump = (word, sentence, langCode) => {
      setGrammarJump({ word, sentence, langCode, token: Date.now() });
      setTab("grammar");
    };
    return () => {
      requestGrammarJump = null;
    };
  }, []);

  // بوکمارک‌های «ذخیره برای داستان بعدی» توی localStorage نگه داشته می‌شن
  // (نه توی یه useState اینجا)، برای همین بدون این ورژن‌شمار، افکت ذخیره‌ی
  // ابری پایین هیچ‌وقت با تغییر لغات ذخیره‌شده اجرا نمی‌شد — یعنی لغت‌های
  // تازه‌بوکمارک‌شده هیچ‌وقت به سرور/کلود نمی‌رفتن، و دفعه‌ی بعد که برنامه
  // لود می‌شد، نسخه‌ی قدیمی‌تر ابری جایگزین نسخه‌ی محلی (که لغت جدید رو
  // داشت) می‌شد و لغت انگار «گم» می‌شد. این ورژن‌شمار همون چیزیه که باعث
  // می‌شه لغات ذخیره‌شده واقعاً از همه‌ی داستان‌ها (قبل و بعد) جمع بمونن.
  const [savedWordsVersion, setSavedWordsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setSavedWordsVersion((v) => v + 1);
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
  }, []);

  // درخواست: لغاتی که از پاپ‌آپ/انتخابِ متن «ذخیره برای داستان بعدی» می‌شن،
  // خودکار و دائمی تو خودِ تبِ «لغات» (لیستِ اصلیِ WORDS_AZ) هم دیده بشن —
  // نه فقط تو پنلِ جدای «لغات ذخیره‌شده». چون WORDS_AZ.js یه فایلِ استاتیکه
  // که تو خودِ اپ باندل شده (مشترکِ همه‌ی کاربرا رو گیت‌هاب پیجز)، از سمتِ
  // مرورگر نمی‌شه واقعاً روش نوشت — این‌جا به‌جاش لغاتِ ذخیره‌شده (که خودشون
  // از قبل توی Supabase/localStorage دائمی‌ان) رو موقعِ نمایش با WORDS_AZ
  // ترکیب می‌کنیم؛ نتیجه برای کاربر دقیقاً همون حسی رو داره که خواسته:
  // لغتی که ذخیره کرده، همیشه تو تبِ لغات هست. فقط لغاتِ تک‌کلمه‌ایِ
  // انگلیسی رو اضافه می‌کنیم (چون WORDS_AZ فقط انگلیسیه)؛ جمله/اصطلاح یا
  // زبانِ دیگه همچنان فقط تو «لغات ذخیره‌شده» می‌مونه چون قالبِ این لیست
  // (تک‌لغتِ انگلیسی + معنی) باهاش جور درنمی‌آد.
  const wordsWithSaved = useMemo(() => {
    const existing = new Set(WORDS_AZ.map((w) => normalizeWord(w.en)));
    const extras = loadSavedStoryWords()
      .filter((e) => e.langCode === "en" && !/\s/.test(normalizeWord(e.word)))
      .filter((e) => !existing.has(normalizeWord(e.word)))
      .map((e) => ({
        id: `saved:${normalizeWord(e.word)}`,
        en: e.word,
        fa: (e.translations && e.translations.fa) || "",
        level: lookupSavedWordLevel(e.word, "en") || null,
        pos: null,
        isUserSaved: true,
      }));
    return extras.length ? [...extras, ...WORDS_AZ] : WORDS_AZ;
  }, [savedWordsVersion]);

  // لغاتی که کاربر با ⭐ از تب‌های لغات/لغات‌و‌اخبار/مکالمه‌روزمره
  // علاقه‌مندشون کرده — قبلاً تنها جایی که ذخیره می‌شدن تنظیماتِ داخلی بود
  // و هیچ‌جا نشون داده نمی‌شدن (ستاره می‌خورد ولی توی تبِ «علاقه‌مندی‌ها»
  // ظاهر نمی‌شد)؛ حالا همین‌جا، کنارِ عبارت‌های علاقه‌مندشده، نشون داده می‌شن.
  const favoritedWords = useMemo(() => {
    const sources = [wordsWithSaved, NEWS_WORDS, DAILY_WORDS];
    const seen = new Set();
    const result = [];
    sources.forEach((list) => {
      (list || []).forEach((w) => {
        if (wordFavorites.has(w.id) && !seen.has(w.id)) {
          seen.add(w.id);
          result.push(w);
        }
      });
    });
    return result;
  }, [wordsWithSaved, wordFavorites]);

  // Same idea, but for saved grammar notes (added to the cloud-sync payload
  // below) — bumps whenever a note is added/removed/updated so the debounced
  // save effect actually re-runs and pushes the change to Supabase, not just
  // to this one browser's localStorage.
  const [grammarNotesVersion, setGrammarNotesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setGrammarNotesVersion((v) => v + 1);
    window.addEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
  }, []);

  // همون الگو برای مثال‌های ساخته‌شده با هوش مصنوعی — قبلاً فقط توی
  // localStorage همین گوشی می‌موندن و با پاک‌شدنِ کش گم می‌شدن؛ حالا مثلِ
  // بقیه‌ی داده‌ها با اکانتِ کاربر روی ابر هم بکاپ می‌گیرن.
  const [wordExamplesVersion, setWordExamplesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setWordExamplesVersion((v) => v + 1);
    window.addEventListener(WORD_EXAMPLES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(WORD_EXAMPLES_CHANGED_EVENT, bump);
  }, []);

  // --- Load saved progress once, on first mount ---------------------------
  // قبلاً اینجا هم‌زمان منتظر جواب localStorage و Supabase (Promise.all)
  // می‌موندیم و تا هر دو برنمی‌گشتن صفحه‌ی «در حال بارگذاری...» می‌موند —
  // یعنی هر بار ورود به برنامه، یه رفت‌وبرگشتِ شبکه‌ای کامل به Supabase
  // (که خودش بعد از چک‌کردن سشن تو App، دومین رفت‌وبرگشته) قبل از نمایش
  // برنامه لازم بود. حالا اول نسخه‌ی محلی (که تقریباً آنی آماده‌ست) اعمال
  // می‌شه و صفحه باز می‌شه؛ نسخه‌ی ابری (Supabase) در پس‌زمینه لود می‌شه و
  // هروقت رسید — اگه واقعاً چیزی داشت — جایگزین می‌شه. کاربر تقریباً فوری
  // وارد برنامه می‌شه، بدون این‌که دیتای ابری از دست بره.
  // opts.merge = true یعنی این «saved» از منبعِ دوم (ابری) می‌آد و باید با
  // چیزی که همین الان روی صفحه/محلی هست ادغام بشه، نه جایگزینش بشه — برای
  // سه مجموعه‌ای که گم‌شدن‌شون واقعاً مهمه (داستان‌های ذخیره‌شده، لغات
  // ذخیره‌شده، یادداشت‌های گرامر) از توابع merge بالا استفاده می‌کنیم؛ بقیه‌ی
  // تنظیمات (زبان، ترتیب زبان‌ها و...) مثل قبل مستقیم اعمال می‌شن چون از
  // دست‌رفتن‌شون به این شدت آسیب‌زننده نیست.
  const applySavedState = (saved, opts) => {
    if (!saved) return;
    const merge = !!(opts && opts.merge);
    if (saved.nativeLang) setNativeLang(saved.nativeLang);
    // طبق درخواست، زبان‌های مقصد دیگه از ذخیره‌ی قبلی بازیابی نمی‌شن — هر بار
    // ورود باید خالی باشه، صرف‌نظر از این‌که دفعه‌ی قبل چی انتخاب شده بود.
    // (خودِ targetOrder هنوز داره ذخیره می‌شه — پایین‌تر توی همون افکتِ ذخیره —
    // فقط دیگه اینجا خودکار روی صفحه اعمال نمی‌شه.)
    if (Array.isArray(saved.langPickerOrder) && saved.langPickerOrder.length) setLangPickerOrder(saved.langPickerOrder);
    if (Array.isArray(saved.favorites)) setFavorites(new Set(saved.favorites));
    if (Array.isArray(saved.wordFavorites)) setWordFavorites(new Set(saved.wordFavorites));
    if (saved.boxes) setBoxes((prev) => ({ ...prev, ...saved.boxes }));
    if (saved.wordStats) setWordStats(saved.wordStats);
    if (saved.savedStories) {
      if (merge) {
        setSavedStories((prev) => {
          const prevIds = new Set((prev || []).map((s) => s.id));
          const additions = (saved.savedStories || []).filter((s) => s && !prevIds.has(s.id));
          return additions.length ? [...additions, ...prev] : prev;
        });
      } else {
        setSavedStories(saved.savedStories);
      }
    }
    if (saved.dictHistory) setDictHistory(saved.dictHistory);
    if (saved.backendUrl) setBackendUrl(saved.backendUrl);
    if (Array.isArray(saved.savedStoryWords)) {
      if (merge) {
        mergeSavedStoryWordsFromCloud(saved.savedStoryWords);
      } else {
        try {
          window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(saved.savedStoryWords));
          window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
        } catch {}
      }
    }
    if (Array.isArray(saved.grammarNotes)) {
      if (merge) {
        mergeGrammarNotesFromCloud(saved.grammarNotes);
      } else {
        try {
          window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(saved.grammarNotes));
          window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
        } catch {}
      }
    }
    if (saved.wordExamples) {
      if (merge) {
        mergeWordExamplesFromCloud(saved.wordExamples);
      } else {
        try {
          window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(saved.wordExamples));
          window.dispatchEvent(new Event(WORD_EXAMPLES_CHANGED_EVENT));
        } catch {}
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    setCloudChecked(false);
    (async () => {
      // مرحله‌ی ۱ (سریع): نسخه‌ی محلی رو بخون، اعمال کن، و فوراً صفحه رو باز کن.
      try {
        const local = await storage.get(userStorageKey, false);
        const savedLocal = local && local.value ? JSON.parse(local.value) : null;
        if (!cancelled) applySavedState(savedLocal);
      } catch (e) {
        // نسخه‌ی محلی‌ای در کار نبود — مشکلی نیست، از خالی شروع می‌کنیم
      } finally {
        if (!cancelled) setLoaded(true);
      }

      // مرحله‌ی ۲ (در پس‌زمینه): نسخه‌ی ابری Supabase — با نسخه‌ی محلی/فعلی
      // ادغام می‌شه (نه جایگزینش)، پس هیچ‌وقت چیزی که یکی از این دوتا داشت
      // و اون‌یکی نداشت، گم نمی‌شه.
      if (user?.uid) {
        try {
          const cloud = await supabaseLoadState(user.uid);
          if (!cancelled && cloud) applySavedState(cloud, { merge: true });
        } catch (e) {
          // آفلاین یا خطای شبکه — نسخه‌ی محلی همچنان سرِ جاشه
        } finally {
          // چه موفق چه ناموفق، همین‌که جوابِ ابری (یا خطاش) رسید، ذخیره‌ی
          // خودکار می‌تونه شروع بشه — قبل از این لحظه اجازه نمی‌دیم.
          if (!cancelled) setCloudChecked(true);
        }
      } else {
        // کاربر مهمونه، ابری‌ای در کار نیست — منتظر نمی‌مونیم.
        if (!cancelled) setCloudChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // --- Save progress whenever it changes (debounced) -----------------------
  useEffect(() => {
    // تا وقتی هم نسخه‌ی محلی لود نشده («loaded»)، هم جوابِ ابری (چه موفق چه
    // ناموفق) نرسیده («cloudChecked»)، ذخیره‌ی خودکار رو شروع نمی‌کنیم — وگرنه
    // ممکنه حالتِ خالی/پیش‌فرضِ اولیه به‌جای نسخه‌ی واقعی روی ابری بشینه.
    if (!loaded || !cloudChecked) return;
    const timeout = setTimeout(async () => {
      const payload = {
        nativeLang,
        targetOrder,
        langPickerOrder,
        favorites: Array.from(favorites),
        wordFavorites: Array.from(wordFavorites),
        boxes,
        wordStats,
        savedStories,
        dictHistory,
        backendUrl,
        savedStoryWords: loadSavedStoryWords(),
        grammarNotes: loadGrammarNotes(),
        wordExamples: loadAllWordExamples(),
      };
      try {
        await storage.set(userStorageKey, JSON.stringify(payload), false);
      } catch (e) {
        // local save failed — still try the cloud copy below
      }
      if (user?.uid) supabaseSaveState(user.uid, payload);
    }, 500);
    return () => clearTimeout(timeout);
  }, [nativeLang, targetOrder, langPickerOrder, favorites, wordFavorites, boxes, wordStats, savedStories, dictHistory, backendUrl, loaded, cloudChecked, userStorageKey, user?.uid, savedWordsVersion, grammarNotesVersion, wordExamplesVersion]);

  const toggleTargetLang = (code) => {
    setTargetOrder((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // always keep at least one target language
        return prev.filter((c) => c !== code);
      }
      return [...prev, code]; // newly picked languages go to the end of the order
    });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleWordFavorite = (id) => {
    setWordFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const nativeLabel = LANGUAGES.find((l) => l.code === nativeLang)?.label;
  const targetLangList = targetOrder
    .map((code) => LANGUAGES.find((l) => l.code === code))
    .filter(Boolean);
  const targetLabel = targetLangList.map((l) => l.label).join("، ");
  // نوار پخشِ چسبیده به کف صفحه فقط تو تب‌هایی معنی داره که صدا/تکرار/
  // اسکرول خودکار توشون فعاله.
  // پلیر چسبیده به کف صفحه — سرتاسری، تو همه‌ی تب‌ها نشون داده می‌شه.
  const showPlayerBar = true;

  if (!loaded) {
    return (
      <div
        dir="rtl"
        lang="fa"
        style={{ fontFamily: fontFa, backgroundColor: colors.paper, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.inkSoft }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`}</style>
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        fontFamily: fontFa,
        backgroundColor: colors.paper,
        minHeight: "100vh",
        color: colors.ink,
        position: "relative",
      }}
    >
      <GlobalAddToStorySelection fallbackLangCode={nativeLang} nativeLang={nativeLang} nativeLabel={nativeLabel} aiSettings={aiSettings} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Lora:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        /* منوی بومیِ گوشی/مرورگر (کپی، اشتراک‌گذاری، انتخاب همه، جستجوی وب)
           هیچ‌جای این برنامه لازم نیست — همه‌جا به‌جاش دکمه‌ی «افزودن به
           داستان» خودمون (GlobalAddToStorySelection) هست. */
        * { -webkit-touch-callout: none; }
        ::selection { background: ${colors.goldSoft}; }
        /* هایلایتِ محدوده‌ی انتخاب‌شده برای «افزودن به داستان» —
           جایگزینِ انتخابِ بومیِ مرورگر (که فوراً پاک می‌شه)، تا رنگش
           تا وقتی پاپ‌آپِ «ذخیره / گرامر» بازه سرِ جاش بمونه. */
        ::highlight(hope-story-sel) { background-color: ${colors.goldSoft}; color: ${colors.ink}; }
        .spin { animation: pb-spin 0.8s linear infinite; }
        @keyframes pb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header
        style={{ backgroundColor: colors.ink, color: colors.paper }}
        className="px-4 pt-6 pb-5"
      >
        <div className="flex items-center justify-end mb-1">
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />
            ) : (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: colors.gold,
                  color: colors.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <SettingsMenu appPrefs={appPrefs} setAppPrefs={setAppPrefs} user={user} onLogout={onLogout} aiSettings={aiSettings} />
          </div>
        </div>
        <p style={{ color: colors.goldSoft, fontSize: 13 }}>
          از {nativeLabel} به {targetLabel} · {user?.name || user?.email}
        </p>

        {/* Language pickers */}
        <div className="mt-4">
          <p style={{ fontSize: 12, color: colors.paperDark, marginBottom: 6 }}>
            زبان مادری (برای جابه‌جایی، مهرِ زبان رو نگه‌دار و بکش)
          </p>
          <DraggableLangRow
            order={langPickerOrder}
            setOrder={(next) => {
              setLangPickerOrder(next);
              setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
            }}
            languages={PHRASEBOOK_LANGUAGES}
            isActive={(code) => code === nativeLang}
            onClick={(code) => setNativeLang(code)}
          />
          <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" }}>
            زبان‌های مقصد (چند تا رو می‌تونی هم‌زمان انتخاب کنی — برای جابه‌جایی، مهرِ زبان رو نگه‌دار و بکش)
          </p>
          <DraggableLangRow
            order={langPickerOrder}
            setOrder={(next) => {
              setLangPickerOrder(next);
              setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
            }}
            languages={PHRASEBOOK_LANGUAGES}
            isActive={(code) => targetOrder.includes(code)}
            onClick={(code) => toggleTargetLang(code)}
          />

          {targetLangList.length > 1 && (
            <>
              <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" }}>
                ترتیب نمایش ترجمه‌ها (بکش تا جابجا بشه)
              </p>
              <OrderChips
                order={targetOrder}
                languages={PHRASEBOOK_LANGUAGES}
                onReorder={(next) => {
                  setTargetOrder(next);
                  setLangPickerOrder((prev) => syncLangPickerFromTargetOrder(prev, next));
                }}
                onRemove={toggleTargetLang}
              />
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ backgroundColor: colors.paperDark }}>
        <TabButton label="مکالمات روزمره" icon={MessageCircle} active={tab === "conversations"} onClick={() => setTab("conversations")} />
        <TabButton label="لغات" icon={Layers} active={tab === "words"} onClick={() => setTab("words")} />
        <TabButton label="علاقه‌مندی‌ها" icon={Heart} active={tab === "favorites"} onClick={() => setTab("favorites")} />
        <TabButton label="لغات و اخبار" icon={Newspaper} active={tab === "vocab"} onClick={() => setTab("vocab")} />
        <TabButton label="مکالمه و روزمره" icon={Coffee} active={tab === "daily"} onClick={() => setTab("daily")} />
        <TabButton label="دیکشنری" icon={Search} active={tab === "dictionary"} onClick={() => setTab("dictionary")} />
        <TabButton label="مرور (جعبه لایتنر)" icon={RotateCcw} active={tab === "review"} onClick={() => { setTab("review"); setReviewIndex(0); setShowAnswer(false); }} />
        <TabButton label="داستان‌ساز" icon={Sparkles} active={tab === "story"} onClick={() => setTab("story")} />
        <TabButton label="لغات ذخیره‌شده" icon={Bookmark} active={tab === "saved"} onClick={() => setTab("saved")} />
        <TabButton label="گرامر" icon={Type} active={tab === "grammar"} onClick={() => setTab("grammar")} />
      </nav>

      {/* Level filter — applies to conversation , words, favorites, and vocabulary */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocab" || tab === "daily") && (
        <div className="px-4 pt-3">
          <LevelFilterRow levelFilter={levelFilter} setLevelFilter={setLevelFilter} />
        </div>
      )}

      {/* Search — meaningful for the phrase and word list tabs */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocab" || tab === "daily") && (
        <div className="px-4 pt-3">
          <div
            className="flex items-center gap-2 px-3"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
          >
            <Search size={16} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "words" || tab === "vocab" || tab === "daily" ? "جستجوی لغت..." : tab === "conversations" ? "جستجوی مکالمه..." : "جستجوی عبارت..."}
              style={{ flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="پاک کردن جستجو">
                <X size={16} color={colors.inkSoft} />
              </button>
            )}
          </div>
        </div>
      )}

      <main
        className="px-4 py-4"
        style={{
          // نوارِ «تمرین جمله‌سازی» حالا همیشه چسبیده به کفِ صفحه‌ست (بالای
          // پلیر) و توی همه‌ی تب‌ها دیده می‌شه، پس محتوای اصلی باید به
          // اندازه‌ی ارتفاعِ واقعیِ همون نوار (practicePanelHeight، که با
          // ResizeObserver اندازه‌گیری می‌شه) از پایین فاصله بگیره تا زیرِ
          // نوار گم نشه.
          paddingBottom: (showPlayerBar ? 150 : 96) + practicePanelHeight,
        }}
      >
        {tab === "conversations" && (
  <DailyConversationsTab
    data={DAILY_CONVERSATIONS}
    query={query}
    nativeLang={nativeLang}
    nativeLabel={nativeLabel}
    aiSettings={aiSettings}
    ClickableSentence={ClickableSentence}
    SpeakButton={SpeakButton}
    targetLangs={targetLangList}
    translateFree={translateFree}
    levelFilter={levelFilter}
    speechController={speechController}
    onFullTextChange={setDailyPlayerText}
    autoScrollActive={tab === "conversations"}
  />
)}

        {tab === "favorites" && (
          <div className="flex flex-col gap-6">
            {favorites.size === 0 && favoritedWords.length === 0 ? (
              <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
                هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی. روی ⭐ کنار هر عبارت یا لغت بزن.
              </p>
            ) : (
              <>
                {favorites.size > 0 && (
                  <PhraseList
                    conversation ={conversation .filter((p) => favorites.has(p.id))}
                    nativeLang={nativeLang}
                    targetLangs={targetLangList}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    query={query}
                    levelFilter={levelFilter}
                    aiSettings={aiSettings}
                    autoplayEnabled={tab === "favorites"}
                    emptyText=""
                  />
                )}
                {favoritedWords.length > 0 && (
                  <div>
                    <h2 style={{ color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>لغات</h2>
                    <WordList
                      words={favoritedWords}
                      wordFavorites={wordFavorites}
                      toggleWordFavorite={toggleWordFavorite}
                      query={query}
                      levelFilter={levelFilter}
                      emptyText=""
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      targetLangs={targetLangList}
                      aiSettings={aiSettings}
                      ClickableSentence={ClickableSentence}
                      autoplayEnabled={tab === "favorites"}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "words" && (
          <WordList
            words={wordsWithSaved}
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={query}
            levelFilter={levelFilter}
            emptyText="لغتی برای نمایش نیست."
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "words"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "words"}
          />
        )}

        {tab === "vocab" && (
          <WordList
            words={NEWS_WORDS}
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={query}
            levelFilter={levelFilter}
            emptyText="لغتی برای نمایش نیست."
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "vocab"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "vocab"}
          />
        )}

        {tab === "daily" && (
          <WordList
            words={DAILY_WORDS}
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={query}
            levelFilter={levelFilter}
            emptyText="لغتی برای نمایش نیست."
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "daily"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "daily"}
          />
        )}

        {tab === "review" && (
          <ReviewBox
            conversation ={conversation }
            boxes={boxes}
            setBoxes={setBoxes}
            nativeLang={nativeLang}
            targetLangs={targetLangList}
            index={reviewIndex}
            setIndex={setReviewIndex}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
          />
        )}

        {tab === "dictionary" && (
          <Dictionary
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            dictHistory={dictHistory}
            setDictHistory={setDictHistory}
            aiSettings={aiSettings}
          />
        )}

        {tab === "saved" && (
          <SavedWordsPanel
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            dictHistory={dictHistory}
            setDictHistory={setDictHistory}
            onGoToDictionary={() => setTab("dictionary")}
            onJumpToStory={(lang, words) => {
              // فقط لغات رو به داستان‌ساز می‌فرسته (که همیشه mount شده و
              // همون لحظه‌شون رو دریافت می‌کنه) — بدون این‌که خودش تبِ
              // فعلی رو عوض کنه؛ رفتن به تبِ داستان‌ساز، خودِ کاربره.
              setStoryJump({ lang, words, token: Date.now() });
            }}
            onJumpToOrigin={(entry) => {
              // لغت/عبارتی که هنوز (قبل از این قابلیت) origin نداشته —
              // نمی‌دونیم از کجا اومده.
              const originTab = entry && entry.origin && entry.origin.tab;
              if (!originTab) return false;
              setTab(originTab);
              // اگه این لغت وسطِ خوندنِ یه داستان (تبِ «داستان‌ساز») ذخیره شده
              // بود، شماره‌ی پاراگراف/جمله‌ش (و شناسه‌ی داستان، اگه اون
              // موقع ذخیره شده بود) رو هم داریم — پس به‌جای فقط بازکردنِ تب،
              // دقیقاً همون داستان و همون سطر رو باز می‌کنیم و بهش اسکرول
              // می‌کنیم.
              if (originTab === "story" && entry.origin.pi != null) {
                setStoryJump({
                  storyId: entry.origin.storyId ?? null,
                  pi: entry.origin.pi,
                  si: entry.origin.si ?? null,
                  token: Date.now(),
                });
              }
              // توی تب‌هایی که خودشون یه نوارِ جستجو دارن (مکالمات، لغات،
              // علاقه‌مندی‌ها، لغات‌و‌اخبار، مکالمه‌روزمره)، همون کادرِ
              // جستجو رو با خودِ لغت پر می‌کنیم تا دقیقاً همون موردی که
              // این لغت ازش اومده، فیلتر و نشون داده بشه.
              if (["conversations", "words", "favorites", "vocab", "daily"].includes(originTab)) {
                setQuery(entry.word);
              }
              return true;
            }}
          />
        )}

        {/* گرامر هم مثل داستان‌ساز همیشه mount شده می‌مونه، که با رفتن به تب
            دیگه، چتِ تمرین جمله‌سازی و توضیحِ در حال بارگذاری از بین نره. */}
        <div style={{ display: tab === "grammar" ? "block" : "none" }}>
          <GrammarPanel
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            aiSettings={aiSettings}
            jumpTo={grammarJump}
            playerBarHeight={showPlayerBar ? playerBarHeight : 0}
            practiceOpacity={practiceOpacity}
            setPracticeOpacity={setPracticeOpacity}
            onPracticePanelHeightChange={setPracticePanelHeight}
          />
        </div>

        {/* توجه: برخلاف بقیه‌ی تب‌ها، داستان‌ساز همیشه mount شده می‌مونه (فقط
            با display:none قایم می‌شه) نه این‌که با رفتن به تب دیگه کامل از
            بین بره. قبلاً چون با {tab === "story" && ...} کاملاً unmount
            می‌شد، هر بار کاربر می‌رفت لغات‌ذخیره‌شده/دیکشنری و برمی‌گشت،
            داستانِ ساخته‌شده (و لغات انتخابی) پاک می‌شد. */}
        <div style={{ display: tab === "story" ? "block" : "none" }}>
          <StoryBuilder
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
            wordStats={wordStats}
            setWordStats={setWordStats}
            savedStories={savedStories}
            setSavedStories={setSavedStories}
            aiSettings={aiSettings}
            jumpTo={storyJump}
            onFullTextChange={setStoryPlayerText}
            autoScrollActive={tab === "story"}
          />
        </div>
      </main>

      {/* پلیر — درست یه پله بالاترِ نوارِ «تمرین جمله‌سازی» می‌شینه (که حالا
          پایین‌ترین قسمتِ صفحه‌ست، bottom: 0)، پس ارتفاعِ اندازه‌گیری‌شده‌ی
          همون نوار (practicePanelHeight) رو به bottom اضافه می‌کنیم. همیشه
          روی صفحه می‌مونه (position: fixed)، حتی موقع اسکرول. */}
      {showPlayerBar && (
        <div
          ref={playerBarRef}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: practicePanelHeight,
            zIndex: 40,
            backgroundColor: colors.paper,
            opacity: playerOpacity / 100,
            borderTop: `1px solid ${colors.cardBorder}`,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.12)",
          }}
        >
          <div className="px-4 pt-2 flex items-center gap-2 flex-wrap" style={{ justifyContent: "flex-end", rowGap: 8 }}>
            {/* دکمه‌ی مرکزی Play/Pause + نمایش متن در حال پخش */}
            {(() => {
              const state = speechController.getState();
              const isActive = state.status !== "idle" && state.key;
              const isPlaying = isActive && state.status === "playing";
              // متن کوتاه‌شده‌ای که در حال پخشه (حداکثر ۲۰ کاراکتر)
              const shortText = isActive ? state.key?.split("::")?.[1]?.slice(0, 20) : "";
              return (
                <button
                  onClick={() => {
                    if (isActive) {
                      // اگر در حال پخش یا مکث است، همان toggle را روی همان متن صدا بزن
                      // باید کلید state.key را بشکافیم تا text و code را به دست آوریم
                      const parts = state.key?.split("::");
                      if (parts && parts.length === 2) {
                        const code = Object.keys(TTS_LOCALE).find(k => TTS_LOCALE[k] === parts[0]) || "en";
                        speechController.toggle(parts[1], code);
                      }
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive ? colors.gold : colors.cardBorder,
                    opacity: isActive ? 1 : 0.5,
                    padding: 2,
                    flexShrink: 0,
                  }}
                  title={isActive ? (isPlaying ? "توقف پخش" : "ادامه‌ی پخش") : "هیچ صدایی در حال پخش نیست"}
                  aria-label={isActive ? (isPlaying ? "توقف" : "ادامه") : "خاموش"}
                >
                  {isPlaying ? <Pause size={18} /> : <PlayCircle size={18} />}
                  {isActive && (
                    <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {shortText}
                    </span>
                  )}
                </button>
              );
            })()}
            <span style={{ fontSize: 11, color: colors.inkSoft }}>تکرار پخش</span>
            <RepeatButton color={colors.gold} />
            {/* خواندنِ کل متن — فقط وقتی معنی داره که متنی برای خوندن باشه؛
                فعلاً منبعِ این متن، داستانِ ساخته‌شده تو تبِ داستان‌سازه (قبلاً
                دکمه‌ش بالای خودِ داستان بود، الان اینجا کنارِ تکرار نشسته). */}
            {tab === "story" && storyPlayerText.text && (
              <SpeakButton
                text={storyPlayerText.text}
                code={storyPlayerText.code}
                color={colors.teal}
                forceRepeat
                startOffset={consumeMainTextResumeOffset(`${TTS_LOCALE[storyPlayerText.code] || "en-US"}::${storyPlayerText.text}`)}
              />
            )}
            {tab === "conversations" && dailyPlayerText.text && (
              <SpeakButton text={dailyPlayerText.text} code={dailyPlayerText.code} color={colors.teal} forceRepeat />
            )}
            {(tab === "words" || tab === "vocab" || tab === "daily") && wordListPlayerText.text && (
              <SpeakButton text={wordListPlayerText.text} code={wordListPlayerText.code} color={colors.teal} forceRepeat />
            )}
            <SpeedControl color={colors.gold} />
          </div>
          <div className="px-4 flex items-center gap-2" style={{ paddingTop: 4, paddingBottom: 8 }}>
            <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap" }}>شفافیت پلیر</span>
            <input
              type="range"
              min={0}
              max={100}
              value={playerOpacity}
              onChange={(e) => setPlayerOpacity(Number(e.target.value))}
              aria-label="شفافیت پلیر"
              style={{ flex: 1, accentColor: colors.gold }}
            />
            <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 28, textAlign: "left" }}>{playerOpacity}%</span>
          </div>
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Phrase list (used for both "all conversation " and "favorites")
// ---------------------------------------------------------------------------
function PhraseList({ conversation , nativeLang, targetLangs, favorites, toggleFavorite, emptyText, query, levelFilter, aiSettings, autoplayEnabled }) {
  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? conversation .filter((p) => p.level === levelFilter) : conversation ;
  filtered = q
    ? filtered.filter((p) => {
        const nativeText = (p.t[nativeLang] || "").toLowerCase();
        if (nativeText.includes(q)) return true;
        return targetLangs.some((l) => (p.t[l.code] || "").toLowerCase().includes(q));
      })
    : filtered;

  const firstTargetCode = targetLangs[0]?.code;
  const autoplayItems = filtered.map((p) => ({ id: p.id, text: firstTargetCode ? p.t[firstTargetCode] : "", code: firstTargetCode }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? "چیزی با این جستجو پیدا نشد." : emptyText || "چیزی برای نمایش نیست."}
      </p>
    );
  }

  const grouped = filtered.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 style={{ color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            {CATEGORIES[cat] || cat}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((p) => (
              <div
                key={p.id}
                ref={registerRef(p.id)}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
                    {p.level && <LevelBadge level={p.level} />}
                    <p style={{ flex: 1, fontWeight: 800, fontSize: 15, color: mainTextColor }}>{p.t[nativeLang]}</p>
                    <SpeakButton text={p.t[nativeLang]} code={nativeLang} edge="end" />
                  </div>
                  <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                    {targetLangs.map((l) => (
                      <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
                        <span
                          style={{
                            fontFamily: fontFa,
                            fontSize: 10,
                            fontWeight: 700,
                            color: colors.gold,
                            border: `1px solid ${colors.goldSoft}`,
                            borderRadius: 6,
                            padding: "1px 5px",
                            flexShrink: 0,
                          }}
                        >
                          {l.abbr}
                        </span>
                        <p style={{ flex: 1, fontWeight: 800, color: translationColor }}>
                          {p.t[l.code] ? (
                            <ClickableSentence
                              text={p.t[l.code]}
                              langCode={l.code}
                              nativeLang={nativeLang}
                              aiSettings={aiSettings}
                              color={translationColor}
                            />
                          ) : (
                            "—"
                          )}
                        </p>
                        {p.t[l.code] && <SpeakButton text={p.t[l.code]} code={l.code} color={translationColor} edge="end" />}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => toggleFavorite(p.id)} aria-label="افزودن به علاقه‌مندی‌ها" style={{ marginRight: 4 }}>
                  <Star
                    size={20}
                    color={colors.gold}
                    fill={favorites.has(p.id) ? colors.gold : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vocabulary & news words — click a word to reveal meaning + part of speech
// ---------------------------------------------------------------------------
function VocabList({ words, nativeLang, targetLangs, levelFilter, aiSettings, autoplayEnabled }) {
  const [openIds, setOpenIds] = useState(new Set());

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
  const autoplayItems = filtered.map((w) => ({ id: w.id, text: w.t[nativeLang] ?? w.t.fa, code: nativeLang }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        در این سطح لغتی نیست.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map((w) => {
        const isOpen = openIds.has(w.id);
        return (
          <div
            key={w.id}
            ref={registerRef(w.id)}
            onClick={() => toggleOpen(w.id)}
            className="p-3 rounded-lg"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p style={{ fontWeight: 800, fontSize: 16, color: mainTextColor }}>{w.t[nativeLang] ?? w.t.fa}</p>
                <SpeakButton text={w.t[nativeLang] ?? w.t.fa} code={nativeLang} />
              </div>
              <LevelBadge level={w.level} />
            </div>

            {isOpen && (
              <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${colors.cardBorder}` }}>
                <p style={{ fontSize: 12, color: colors.gold, fontWeight: 700, marginBottom: 4 }}>
                  {POS_FA[w.pos] || w.pos}
                </p>
                <p style={{ fontSize: 14, color: colors.inkSoft, marginBottom: 8 }}>{w.meaningFa}</p>
                <div className="flex flex-col gap-1">
                  {targetLangs.map((l) => (
                    <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
                      <span
                        style={{
                          fontFamily: fontFa,
                          fontSize: 10,
                          fontWeight: 700,
                          color: colors.gold,
                          border: `1px solid ${colors.goldSoft}`,
                          borderRadius: 6,
                          padding: "1px 5px",
                          flexShrink: 0,
                        }}
                      >
                        {l.abbr}
                      </span>
                      <p style={{ flex: 1, fontWeight: 800, color: translationColor }}>
                        {w.t[l.code] ? (
                          <ClickableSentence
                            text={w.t[l.code]}
                            langCode={l.code}
                            nativeLang={nativeLang}
                            aiSettings={aiSettings}
                            color={translationColor}
                          />
                        ) : (
                          "—"
                        )}
                      </p>
                      {w.t[l.code] && <SpeakButton text={w.t[l.code]} code={l.code} color={translationColor} edge="end" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isOpen && (
              <p style={{ color: colors.cardBorder, fontSize: 11, marginTop: 4 }}>(برای دیدن معنی لمس کن)</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// یک مدیرِ سراسریِ «انتخابِ متن → افزودن به داستان» برای کل نرم‌افزار.
// جای اینکه هر تکه متن (ClickableSentence، توضیح گرامری، معنیِ دیکشنری،
// هرجای دیگه) خودش یه پاپ‌آپ جدا برای انتخاب متن داشته باشه، این یکی —
// فقط یه بار توی ریشه‌ی برنامه سوار می‌شه — کل document رو زیر نظر داره:
// هر جا کاربر یه محدوده از متن رو (درگ با ماوس یا لانگ‌پرس/درگ روی موبایل)
// انتخاب کنه، بلافاصله بعد از گرفتنِ متنِ انتخاب‌شده، خودِ انتخابِ مرورگر
// رو پاک می‌کنیم (removeAllRanges) تا نوار ابزار بومیِ گوشی/مرورگر
// (Copy / Share / Select all / Web search) اصلاً فرصت نکنه ظاهر بشه یا
// بمونه — و به‌جاش دکمه‌ی شناور خودمون «افزودن به داستان» رو نشون می‌دیم.
// زبانِ متنِ انتخاب‌شده رو از نزدیک‌ترین والدی که data-lang-code داره
// می‌خونیم (هر جایی از اپ که زبانش معلومه — مثل ClickableSentence — این
// اتریبیوت رو داره)؛ اگه پیدا نشد، زبان مادری/پیش‌فرض کاربر رو استفاده
// می‌کنیم تا این قابلیت هیچ‌جای برنامه بی‌اثر نمونه.
// نامِ هایلایتِ CSS Custom Highlight API — با این، محدوده‌ی انتخاب‌شده رو
// بدون دست‌کاریِ DOM (بدون wrap کردن با <span>) رنگ می‌کنیم؛ چون محدوده
// معمولاً از وسطِ چند تا کلمه/span مختلف رد می‌شه و روش‌های مبتنی بر
// surroundContents برای همچین محدوده‌ای کار نمی‌کنن. مرورگرهایی که این API
// رو ندارن (خیلی قدیمی) فقط این جلوه‌ی بصری رو نمی‌بینن؛ بقیه‌ی قابلیت
// (پاپ‌آپ ذخیره/گرامر) دست‌نخورده کار می‌کنه.
const STORY_SELECTION_HIGHLIGHT = "hope-story-sel";

function GlobalAddToStorySelection({ fallbackLangCode = "fa", nativeLang, nativeLabel, aiSettings }) {
  const [popup, setPopup] = useState(null); // { top, left, text, langCode } | null
  // ترجمه‌ی خودِ محدوده‌ی انتخاب‌شده به زبان مبدأ/مادریِ کاربر (nativeLang) —
  // دقیقاً همون کاری که برای تک‌کلمه‌ها توی ClickableSentence با
  // lookupWordMeaning انجام می‌شه، اینجا هم برای کل محدوده (چند کلمه/جمله)
  // با translateFree انجام می‌شه. { status: "loading" | "done" | "error", text? }
  const [translation, setTranslation] = useState(null);
  const popupElRef = useRef(null);
  // فقط برای این‌که دکمه‌ی 🔊ِ پاپ‌آپ بین آیکونِ پخش/توقف سوییچ کنه — دقیقاً
  // همون الگویی که SpeakButton خودش استفاده می‌کنه.
  const [speakState, setSpeakState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setSpeakState), []);

  const clearSelectionHighlight = () => {
    try {
      if (typeof CSS !== "undefined" && CSS.highlights) {
        CSS.highlights.delete(STORY_SELECTION_HIGHLIGHT);
      }
    } catch {}
  };

  const closePopup = () => {
    setPopup(null);
    setTranslation(null);
    clearSelectionHighlight();
  };

  // هر بار محدوده‌ی تازه‌ای انتخاب می‌شه (popup عوض می‌شه)، ترجمه‌ی همون
  // محدوده رو به زبان مبدأ/مادریِ کاربر می‌گیریم — دقیقاً همون زنجیره‌ی
  // fallback (کش → گوگل/مای‌مموری/لینگوا/لیبره → در آخر بک‌اند AI) که
  // translateFree برای بقیه‌ی جاهای برنامه هم استفاده می‌کنه. اگه زبانِ
  // مبدأِ متنِ انتخاب‌شده همون زبانِ مادریِ کاربر باشه، ترجمه بی‌معنیه و
  // اصلاً درخواستی فرستاده نمی‌شه.
  useEffect(() => {
    if (!popup) return;
    const targetLang = nativeLang || fallbackLangCode;
    if (targetLang === popup.langCode) {
      setTranslation(null);
      return;
    }
    let cancelled = false;
    setTranslation({ status: "loading" });
    translateFree(popup.text, targetLang, popup.langCode, aiSettings)
      .then((result) => {
        if (cancelled) return;
        const clean = (result || "").trim();
        if (clean && clean !== popup.text.trim()) {
          setTranslation({ status: "done", text: clean });
        } else {
          setTranslation({ status: "error" });
        }
      })
      .catch(() => {
        if (!cancelled) setTranslation({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [popup, nativeLang, fallbackLangCode, aiSettings]);

  // دکمه‌ی «تلاش دوباره»ی خودِ ترجمه (جدا از دکمه‌های ذخیره/گرامر پایین) —
  // برای وقتی سرویس‌های ترجمه‌ی رایگان موقتاً جواب ندادن.
  function retryTranslation() {
    if (!popup) return;
    const targetLang = nativeLang || fallbackLangCode;
    setTranslation({ status: "loading" });
    translateFree(popup.text, targetLang, popup.langCode, aiSettings)
      .then((result) => {
        const clean = (result || "").trim();
        setTranslation(clean && clean !== popup.text.trim() ? { status: "done", text: clean } : { status: "error" });
      })
      .catch(() => setTranslation({ status: "error" }));
  }
  // این دوتا دقیقاً معادل دکمه‌های «ذخیره برای داستان بعدی» و «افزودن به
  // یادگیری گرامر» توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence هستن — اینجا هم
  // همون رفتار رو برای یک محدوده‌ی انتخاب‌شده (چند کلمه یا یک جمله‌ی کامل)
  // فعال می‌کنیم، بدون این‌که هیچ درخواست شبکه‌ای فوری لازم باشه (معنی/
  // ترجمه بعداً و در پس‌زمینه کامل می‌شه، دقیقاً مثل بقیه‌ی جاهای برنامه).
  const [saved, setSaved] = useState(false);
  const [grammarSaved, setGrammarSaved] = useState(false);

  useEffect(() => {
    const resolveLangCode = (node) => {
      const el = node && node.nodeType === 1 ? node : node?.parentElement;
      const host = el && el.closest ? el.closest("[data-lang-code]") : null;
      return (host && host.getAttribute("data-lang-code")) || fallbackLangCode;
    };

    const handleUp = () => {
      const sel = window.getSelection && window.getSelection();
      const selectedText = sel ? sel.toString().trim() : "";
      if (!selectedText || !sel.rangeCount) return;
      // فیلدهای ورودی/قابل‌ویرایش (مثلاً جستجو، ورودی چت) از این قابلیت
      // مستثنی‌ان — همون‌جا انتخابِ عادیِ متن (برای کپی/پیست خودِ کاربر تو
      // فرم‌ها) باید دست‌نخورده بمونه.
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      let rect;
      try {
        const range = sel.getRangeAt(0);
        rect = range.getBoundingClientRect();
      } catch {
        return;
      }
      if (!rect || (!rect.width && !rect.height)) return;
      const langCode = resolveLangCode(sel.anchorNode);
      // اگه این محدوده داخلِ متنِ اصلیِ داستانه (یعنی یه پدرِ نزدیک با
      // data-story-base-offset داره)، آفستِ پایانِ انتخاب رو نسبت به کلِ
      // fullStoryText حساب می‌کنیم — تا اگه بعداً دکمه‌ی پخشِ همین محدوده
      // زده بشه، «نقطه‌ی ادامه»ی پخشِ کل داستان هم به‌خاطر سپرده بشه.
      let storyResumeOffset = null;
      try {
        const endEl = range.endContainer && range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer?.parentElement;
        const storyEl = endEl && endEl.closest ? endEl.closest("[data-story-base-offset]") : null;
        if (storyEl) {
          const measureRange = document.createRange();
          measureRange.selectNodeContents(storyEl);
          measureRange.setEnd(range.endContainer, range.endOffset);
          const localEnd = measureRange.toString().length;
          const baseOffset = Number(storyEl.getAttribute("data-story-base-offset")) || 0;
          storyResumeOffset = baseOffset + localEnd;
        }
      } catch {}
      // قبل از پاک‌کردنِ انتخابِ بومی، خودِ محدوده رو با CSS Custom
      // Highlight API رنگ می‌کنیم — این هایلایت مستقل از Selection مرورگره،
      // پس پاک‌کردنِ Selection (چند خط پایین‌تر) روش اثری نداره و تا وقتی
      // خودمون clearSelectionHighlight رو صدا نزنیم (پاپ‌آپ بسته بشه) سرِ
      // جاش می‌مونه.
      try {
        if (typeof CSS !== "undefined" && CSS.highlights && typeof Highlight === "function") {
          const range = sel.getRangeAt(0).cloneRange();
          CSS.highlights.set(STORY_SELECTION_HIGHLIGHT, new Highlight(range));
        }
      } catch {}
      setSaved(isWordSaved(selectedText, langCode));
      setGrammarSaved(false);
      setPopup({ top: rect.top, left: rect.left + rect.width / 2, text: selectedText, langCode, storyResumeOffset });
      // بلافاصله انتخابِ بومیِ مرورگر رو پاک می‌کنیم — دکمه‌ی شناورِ خودمون
      // (که همین الان ست شد) جایگزینش می‌شه، و نوار ابزارِ سیستم دیگه چیزی
      // برای نشون‌دادن نداره. هایلایتِ سفارشیِ بالا از این کار متأثر نمی‌شه.
      try {
        window.getSelection()?.removeAllRanges?.();
      } catch {}
    };

    const handleContextMenu = (e) => {
      // منوی راست‌کلیک/لانگ‌پرسِ پیش‌فرض هیچ‌جای برنامه لازم نیست — همه‌جا
      // به‌جاش دکمه‌ی «افزودن به داستان» خودمون داریم.
      e.preventDefault();
    };

    const handleScroll = () => closePopup();

    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchend", handleUp);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("scroll", handleScroll, true);
      clearSelectionHighlight();
    };
  }, [fallbackLangCode]);

  // لمس/کلیک بیرون از پاپ‌آپ (بدون این‌که متن جدیدی انتخاب بشه) هم باید
  // هم پاپ‌آپ و هم هایلایتِ همراهش رو ببنده — وگرنه هایلایت تا ابد (یا تا
  // اسکرول بعدی) روی صفحه می‌مونه.
  useEffect(() => {
    if (!popup) return;
    const onOutside = (e) => {
      if (popupElRef.current && popupElRef.current.contains(e.target)) return;
      closePopup();
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [popup]);

  if (!popup) return null;

  // معنیِ فوریِ لغتیه که تازه ذخیره می‌شه — این‌جا لازم نیست، درست مثل بقیه‌ی
  // جاهای برنامه که ذخیره‌ی اولیه بدون معنی انجام می‌شه و بعداً (از پنل «لغات
  // ذخیره‌شده» یا زیرخط‌کشیِ ClickableSentence) کامل می‌شه.
  function saveSelectionToGrammar() {
    if (!popup) return;
    const basicMarkdown = `## 🧩 ${popup.text}\n\n**جمله:** ${popup.text}`;
    const entry = saveGrammarNote({ langCode: popup.langCode, word: popup.text, sentence: popup.text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({
      word: popup.text,
      sentence: popup.text,
      langCode: popup.langCode,
      nativeLang: nativeLang || fallbackLangCode,
      nativeLabel,
      aiSettings,
    })
      .then((md) => {
        if (md) updateGrammarNoteMarkdown(entry.id, md);
      })
      .catch(() => {
        // بک‌اند AI در دسترس نبود — یادداشتِ پایه که همین الان ذخیره شد سرِ جاشه.
      });
  }

  return (
    <div
      ref={popupElRef}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: Math.max(8, popup.top - (translation ? 128 : 88)),
        left: Math.min(Math.max(90, popup.left), window.innerWidth - 90),
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 6,
        minWidth: 190,
        maxWidth: "min(92vw, 320px)",
        background: colors.ink,
        color: colors.paper,
        borderRadius: 10,
        padding: "10px 12px",
        fontFamily: fontFa,
        zIndex: 9999,
        boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
      }}
    >
      {/* متنِ اصلیِ انتخاب‌شده + دکمه‌ی خواندنِ صوتی، دقیقاً مطابقِ تصویرِ
          مرجع: بالای پاپ‌آپ خودِ متنِ انتخاب‌شده‌ست، نه ترجمه. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          dir={dirFor(popup.langCode)}
          style={{ fontWeight: 800, fontSize: 16, overflowWrap: "break-word", flex: 1 }}
        >
          {popup.text}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const result = speechController.toggle(popup.text, popup.langCode);
            // اگه این محدوده از متنِ اصلیِ داستان بوده (آفستش شناخته شده)، همون
            // نقطه رو برای دفعه‌ی بعدِ زدنِ «پخشِ کل داستان» به‌خاطر می‌سپاریم —
            // فقط وقتی زبانِ محدوده با زبانِ فعلیِ داستان یکیه، وگرنه به‌درد
            // نمی‌خوره (مثلاً محدوده از متنِ ترجمه بوده).
            if (popup.storyResumeOffset != null && latestStoryTextContext.text && popup.langCode === latestStoryTextContext.code) {
              rememberMainTextResumeOffset(
                `${TTS_LOCALE[latestStoryTextContext.code] || "en-US"}::${latestStoryTextContext.text}`,
                popup.storyResumeOffset
              );
            }
            if (result === "unsupported") {
              alert("این مرورگر از خوندن صوتی متن پشتیبانی نمی‌کنه.");
            } else if (result === "error") {
              alert("پخش صدا با مشکل مواجه شد. اتصال اینترنت رو چک کن و دوباره امتحان کن.");
            }
          }}
          aria-label="خواندنِ بخشِ انتخاب‌شده"
          title="خواندنِ همینِ بخشِ انتخاب‌شده"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 26,
            height: 26,
            color: colors.goldSoft,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {speakState.key === `${TTS_LOCALE[popup.langCode] || "en-US"}::${popup.text}` && speakState.status === "playing" ? (
            <Pause size={16} />
          ) : (
            <Volume2 size={16} />
          )}
        </button>
      </div>

      {/* ترجمه‌ی خودِ محدوده‌ی انتخاب‌شده — درست زیرِ متنِ اصلی، مطابقِ
          تصویرِ مرجع. وقتی زبانِ متن با زبانِ مادریِ کاربر یکیه، اصلاً
          نشون داده نمی‌شه (translation همون‌جا null می‌مونه). */}
      {translation && (
        <div
          dir={dirFor(nativeLang || fallbackLangCode)}
          style={{ textAlign: dirFor(nativeLang || fallbackLangCode) === "rtl" ? "right" : "left" }}
        >
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>ترجمه:</div>
          {translation.status === "loading" && (
            <div className="flex items-center gap-1" style={{ color: colors.paper, opacity: 0.85, fontSize: 13 }}>
              <Loader2 size={12} className="spin" />
              <span>در حال یافتن ترجمه...</span>
            </div>
          )}
          {translation.status === "done" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13 }}>
              <SpeakButton text={translation.text} code={nativeLang || fallbackLangCode} color={colors.goldSoft} />
              <span style={{ flex: 1, overflowWrap: "break-word" }}>{translation.text}</span>
            </div>
          )}
          {translation.status === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: colors.rose, fontSize: 11 }}>ترجمه پیدا نشد (احتمالاً آفلاینی)</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryTranslation();
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.paper,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                تلاش دوباره
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "2px 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const nowSaved = toggleSavedStoryWord(popup.text, popup.langCode, { nativeLang: nativeLang || fallbackLangCode });
            setSaved(nowSaved);
            if (nowSaved) {
              try {
                window.dispatchEvent(
                  new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: popup.text, langCode: popup.langCode } })
                );
              } catch {}
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: saved ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${saved ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <Bookmark size={13} fill={saved ? colors.gold : "none"} />
          {saved ? "ذخیره شد برای داستان بعدی" : "ذخیره برای داستان بعدی"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            saveSelectionToGrammar();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: grammarSaved ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${grammarSaved ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <Type size={13} />
          {grammarSaved ? "ذخیره شد در گرامر" : "افزودن به یادگیری گرامر"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A–Z word dictionary, grouped by CEFR level — same card language as
// PhraseList (word + audio + star) plus a part-of-speech tag like VocabList.
// ---------------------------------------------------------------------------
// تعداد لغتی که در هر «بخش» رندر می‌شه. رندر کردن هزاران لغت با هم (کل
// WORDS_AZ، حدود چند هزار ردیف) همون چیزیه که تب «لغات» رو کند می‌کرد —
// هر ردیف یه ClickableSentence کامل با چند useEffect خودشه، و چند هزارتاش
// با هم خیلی سنگینه. اینجا فقط WORDS_PAGE_SIZE تا رندر می‌شه و با رسیدن
// اسکرول به ته لیست، بخش بعدی اضافه می‌شه (اسکرول‌بی‌نهایتِ ساده، بدون نیاز
// به کتابخونه‌ی جدید).
const WORDS_PAGE_SIZE = 60;

function WordList({ words, wordFavorites, toggleWordFavorite, query, levelFilter, emptyText, nativeLang, nativeLabel, targetLangs, aiSettings, autoplayEnabled, onFullTextChange, autoScrollActive, ClickableSentence }) {
  // زبان‌هایی که باید زیرِ هر لغت ترجمه‌شون نشون داده بشه: همون زبان‌های
  // مقصدی که کاربر بالای صفحه انتخاب/مرتب کرده (targetLangs)، منهای خودِ
  // انگلیسی (چون انگلیسی همون سرلغته که بالا نشون داده می‌شه و تکرارش
  // بی‌فایده‌ست). اگه به‌هر دلیلی چیزی انتخاب نشده بود، حداقل فارسی رو نشون
  // می‌دیم تا لیست هیچ‌وقت بدون معنی نمونه.
  const displayLangs = (targetLangs && targetLangs.length ? targetLangs.filter((l) => l.code !== "en") : []);
  const effectiveDisplayLangs = displayLangs.length ? displayLangs : [{ code: "fa", label: "فارسی", abbr: "FA" }];

  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
  filtered = q
    ? filtered.filter((w) =>
        w.t
          ? Object.values(w.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q))
          : w.en.toLowerCase().includes(q) || w.fa.includes(q)
      )
    : filtered;

  // با هر تغییر جستجو/سطح، دوباره از همون بخش اول شروع می‌کنیم.
  const [visibleCount, setVisibleCount] = useState(WORDS_PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(WORDS_PAGE_SIZE);
  }, [q, levelFilter, words]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // وقتی سنسورِ ته لیست دیده بشه، بخش بعدی رو اضافه می‌کنیم.
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + WORDS_PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const autoplayItems = filtered.map((w) => ({ id: w.id, text: w.en, code: "en" }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  // متنِ کاملِ «خواندنِ همه‌ی این لیست» — همون الگویی که داستان‌ساز و
  // مکالمات روزمره دارن، اینجا هم برای لیستِ لغات. کلِ لیستِ فیلترشده
  // (نه فقط چیزی که تا الان اسکرول شده) خونده می‌شه؛ هرچی پخش جلوتر بره،
  // صفحه با اسکرولِ خودکار پایین‌تر می‌ره و همون IntersectionObserver
  // بالا خودش بخش‌های بعدی رو لود می‌کنه.
  const fullText = filtered.map((w) => w.en).join(" ");
  const wordOffsets = useMemo(() => {
    let offset = 0;
    return filtered.map((w) => {
      const start = offset;
      offset += w.en.length + 1; // فاصله‌ی join(" ")
      return { id: w.id, start, end: start + w.en.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: "en" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);
  // فقط موقعِ خروج از این تب (unmount کاملِ کامپوننت) متن رو پاک کن — نه
  // به‌ازای هر تغییرِ فیلتر/جستجو، وگرنه دکمه‌ی 🔊 رو پلیر لحظه‌ای چشمک
  // می‌زد (پاک می‌شد و دوباره ست می‌شد) با هر تایپ تو جستجو.
  useEffect(() => {
    return () => {
      if (onFullTextChange) onFullTextChange({ text: "", code: "" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لغتی که همین الان، در حینِ پخشِ «کل لیست» از روی پلیر، داره خونده
  // می‌شه — برای نشانگرِ کنارِ کارت و اسکرولِ خودکار.
  const [activeWordId, setActiveWordId] = useState(null);
  // آفستِ کاراکتریِ کلمه‌ی در حال خوانده‌شدن، *نسبت به شروعِ همون کارتِ
  // فعال* (نه کلِ fullText) — برای سایه‌دار کردنِ همون کلمه‌ی داخلِ متنِ
  // لغت/عبارتِ کارت (ردیابِ خوانش، مثلِ تبِ «مکالمه و روزمره»).
  const [activeWordRelOffset, setActiveWordRelOffset] = useState(0);
  useEffect(() => {
    const myKey = `en-US::${fullText}`;
    const update = (state) => {
      if (!fullText || state.key !== myKey || state.status === "idle") {
        setActiveWordId(null);
        setActiveWordRelOffset(0);
        return;
      }
      const offset = speechController.getWordOffset ? speechController.getWordOffset() : speechController.getCharOffset();
      let found = wordOffsets[0] || null;
      for (const w of wordOffsets) {
        if (offset >= w.start) found = w;
        else break;
      }
      setActiveWordRelOffset(found ? Math.max(0, offset - found.start) : 0);
      setActiveWordId((prev) => {
        const next = found ? found.id : null;
        return prev === next ? prev : next;
      });
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [fullText, wordOffsets]);

  const listNodeMapRef = useRef(new Map());
  useEffect(() => {
    if (!autoScrollActive || activeWordId == null) return;
    const node = listNodeMapRef.current.get(String(activeWordId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, activeWordId]);
  const registerListRef = (id) => (node) => {
    const key = String(id);
    if (node) listNodeMapRef.current.set(key, node);
    else listNodeMapRef.current.delete(key);
  };

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? "چیزی با این جستجو پیدا نشد." : emptyText || "چیزی برای نمایش نیست."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((w) => (
        <div
          key={w.id}
          ref={(el) => {
            registerRef(w.id)(el);
            registerListRef(w.id)(el);
          }}
          className="flex items-center justify-between p-3 rounded-lg"
          style={{
            position: "relative",
            backgroundColor: "white",
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <button onClick={() => toggleWordFavorite(w.id)} aria-label="افزودن به علاقه‌مندی‌ها" style={{ marginLeft: 4, flexShrink: 0 }}>
            <Star size={20} color={colors.gold} fill={wordFavorites.has(w.id) ? colors.gold : "none"} />
          </button>
          <div className="flex-1">
            {/* لغت + نشان‌های سطح/نوع توی یه زیرجعبه‌ی flex-wrap جدا هستن، و
                خودِ بلندگو بیرون از اون زیرجعبه، به‌عنوانِ یه خواهر/برادرِ
                ثابت — این‌جوری هر چقدرم لغت بلند باشه و نشان‌ها به خط بعد
                بیفتن، بلندگو همیشه دقیقاً روی یه ستونِ ثابت (لبه‌ی راستِ
                ردیف) می‌مونه، هم‌راستا با بلندگوهای ردیف‌های ترجمه‌ی زیرش. */}
            <div className="flex items-start gap-2" style={{ direction: "ltr" }}>
              <div className="flex items-center flex-wrap gap-2" style={{ flex: 1 }}>
                {activeWordId === w.id ? (
                  <WordTrackedText
                    text={w.en}
                    relOffset={activeWordRelOffset}
                    fontFamily={fontLatin}
                    fontWeight={800}
                    fontSize={19}
                    color={mainTextColor}
                  />
                ) : (
                  <ClickableSentence
                    text={w.en}
                    langCode="en"
                    nativeLang={nativeLang}
                    aiSettings={aiSettings}
                    color={mainTextColor}
                    fontFamily={fontLatin}
                    fontWeight={800}
                    fontSize={19}
                  />
                )}
                {w.level && <LevelBadge level={w.level} />}
                {w.isUserSaved && (
                  <span
                    style={{
                      fontFamily: fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.rose,
                      border: `1px solid ${colors.rose}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    شخصی
                  </span>
                )}
                {w.pos && (
                  <span
                    style={{
                      fontFamily: fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.teal,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {POS_FA[w.pos] || w.pos}
                  </span>
                )}
              </div>
              <SpeakButton text={w.en} code="en" color={colors.teal} edge="end" />
            </div>
            {/* ترجمه‌ی این لغت به همه‌ی زبان‌های مقصدِ انتخاب‌شده — نه فقط
                فارسی. رنگ متن‌ها مشکی و پررنگه (نه رنگ‌های کم‌کنتراست) تا
                خوندنش چشم رو خسته نکنه. */}
            <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
              {effectiveDisplayLangs.map((l) => (
                <WordTargetTranslation
                  key={l.code}
                  word={w.en}
                  langCode={l.code}
                  abbr={l.abbr}
                  knownText={l.code === "fa" ? w.fa : ""}
                  nativeLang={nativeLang}
                  nativeLabel={nativeLabel}
                  aiSettings={aiSettings}
                  ClickableSentence={ClickableSentence}
                />
              ))}
            </div>
            <WordExamples word={w.en} langCode="en" meaningNative={w.fa} nativeLang={nativeLang} targetLangs={effectiveDisplayLangs} aiSettings={aiSettings} />
          </div>
        </div>
      ))}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// یک ردیف ترجمه‌ی یک لغت به یک زبان مقصد. اگه ترجمه‌اش از قبل معلومه
// (فارسی — چون تو خودِ دیتای لغت هست) همون رو مستقیم نشون می‌ده؛ وگرنه اول
// از کش دستگاه می‌خونه و اگه نبود، لحظه‌ای با translateFree می‌گیره و کش
// می‌کنه (تا دفعه‌ی بعد دیگه درخواستی به سرور نره). متن با رنگ مشکی‌پررنگ
// (colors.ink) و bold نشون داده می‌شه — نه رنگ‌های کم‌کنتراست — تا خوندنِ
// پشت‌سرهمِ چند زبان چشم رو خسته نکنه.
function WordTargetTranslation({ word, langCode, abbr, knownText, nativeLang, nativeLabel, aiSettings, ClickableSentence }) {
  const [text, setText] = useState(knownText || (() => loadWordTranslation(word, langCode)));

  useEffect(() => {
    if (knownText) {
      setText(knownText);
      return;
    }
    const cached = loadWordTranslation(word, langCode);
    if (cached) {
      setText(cached);
      return;
    }
    let cancelled = false;
    translateFree(word, langCode, "en", aiSettings)
      .then((t) => {
        if (cancelled || !t) return;
        setText(t);
        saveWordTranslation(word, langCode, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, langCode, knownText]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        {abbr}
      </span>
      {text ? (
        <>
          {ClickableSentence ? (
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft }}>
              <ClickableSentence
                text={text}
                langCode={langCode}
                nativeLang={nativeLang}
                nativeLabel={nativeLabel}
                aiSettings={aiSettings}
                color={colors.inkSoft}
                fontWeight={700}
                fontSize={14}
              />
            </p>
          ) : (
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft }}>{text}</p>
          )}
          <SpeakButton text={text} code={langCode} color={colors.teal} edge="end" />
        </>
      ) : (
        <p style={{ flex: 1, fontSize: 12, color: colors.inkSoft }}>در حال ترجمه...</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// دکمه‌ی «مثال» زیرِ ترجمه‌ی هر لغت (فقط توی تب‌های لغات/مکالمه/اخبار، نه
// عبارات) — با هوش مصنوعی یه مثالِ واقعی و امروزی برای همون لغت می‌سازه،
// زیرش نگه‌ داشته (کش) می‌شه، و ترجمه‌ی خودش رو هم با همون زنجیره‌ی رایگانِ
// ترجمه‌ای که برای داستان‌سازی استفاده می‌شه می‌گیره. هر مثال، یه دکمه‌ی
// «افزودن به داستان‌ساز» جدا داره؛ و چون خودِ متنِ مثال با ClickableSentence
// رندر می‌شه، انتخابِ آزادِ یه تکه از همون مثال هم (نگاه کن به ClickableSentence)
// همون‌جا قابل افزودن به داستانه.
function WordExamples({ word, langCode, meaningNative, nativeLang, targetLangs, aiSettings }) {
  const [examples, setExamples] = useState(() => loadWordExamples(word, langCode));
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");
  const nativeLabel = LANGUAGES.find((l) => l.code === nativeLang)?.label || nativeLang;

  async function handleGenerate(e) {
    e.stopPropagation();
    if (generating) return;
    setGenerating(true);
    setErr("");
    try {
      const text = await generateWordExample({
        word,
        langCode,
        meaningNative,
        nativeLabel,
        existingExamples: examples.map((ex) => ex.text),
        aiSettings,
      });
      if (!text) throw new Error("empty");
      saveWordExample(word, langCode, text);
      setExamples(loadWordExamples(word, langCode));
    } catch {
      setErr("مثال ساخته نشد — دوباره امتحان کن.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: colors.gold,
          background: "transparent",
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "3px 8px",
          opacity: generating ? 0.6 : 1,
        }}
      >
        {generating ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
        {examples.length ? "مثال دیگر" : "مثال (با هوش مصنوعی)"}
      </button>
      {err && <p style={{ color: colors.rose, fontSize: 11, marginTop: 4 }}>{err}</p>}
      {examples.map((ex) => (
        <WordExampleRow key={ex.id} example={ex} word={word} langCode={langCode} nativeLang={nativeLang} targetLangs={targetLangs} aiSettings={aiSettings} />
      ))}
    </div>
  );
}

// ترجمه‌ی خودِ جمله‌ی مثال به یک زبانِ مقصدِ مشخص — دقیقاً همون الگویی که
// WordTargetTranslation/LineTranslation برای خودِ لغت/جمله استفاده می‌کنن،
// اینجا هم عیناً برای هر کدوم از زبان‌های مقصدِ انتخاب‌شده تکرار می‌شه (نه
// فقط nativeLang) تا مثلاً هم فارسی هم اسپانیایی هم‌زمان دیده بشن.
function WordExampleTranslationLine({ example, word, langCode, targetLang, abbr, aiSettings }) {
  const [translation, setTranslation] = useState(example.translations?.[targetLang] || "");

  useEffect(() => {
    if (example.translations?.[targetLang]) {
      setTranslation(example.translations[targetLang]);
      return;
    }
    let cancelled = false;
    translateFree(example.text, targetLang, langCode, aiSettings)
      .then((t) => {
        if (cancelled || !t) return;
        setTranslation(t);
        updateWordExampleTranslation(word, langCode, example.id, targetLang, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [example.id, targetLang]);

  if (!translation) {
    return <p style={{ fontSize: 11, color: colors.inkSoft, marginTop: 4 }}>در حال ترجمه...</p>;
  }

  return (
    <div className="flex items-center gap-2" style={{ marginTop: 4, direction: "ltr" }}>
      <span
        style={{
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        {abbr || targetLang.toUpperCase()}
      </span>
      <p style={{ flex: 1, fontSize: 12, fontWeight: 800, color: translationColor }}>{translation}</p>
      <SpeakButton text={translation} code={targetLang} color={translationColor} edge="end" />
    </div>
  );
}

function WordExampleRow({ example, word, langCode, nativeLang, targetLangs, aiSettings }) {
  const [added, setAdded] = useState(false);
  // زبان‌های مقصدی که کاربر بالای صفحه انتخاب/مرتب کرده، منهای خودِ زبانِ
  // مقصدی که جمله‌ی مثال بهش نوشته شده (langCode) — اگه چیزی انتخاب نشده
  // بود، حداقل fa رو نشون بده که خالی نمونه.
  const exampleTargetLangs =
    targetLangs && targetLangs.length
      ? targetLangs.filter((l) => l.code !== langCode)
      : [{ code: nativeLang, label: "", abbr: nativeLang.toUpperCase() }];

  return (
    <div
      style={{
        marginTop: 6,
        padding: 8,
        borderRadius: 8,
        background: colors.paperDark,
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      {/* متن مثال مشکی/سورمه‌ای پررنگ و bold، ترجمه‌اش سبز پررنگ و bold —
          تا هم خوندن‌شون تو کادرِ کرم‌رنگ چشم رو خسته نکنه، هم متن اصلی
          از ترجمه به‌وضوح جدا باشه. */}
      <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
        <div style={{ flex: 1 }}>
          <ClickableSentence
            text={example.text}
            langCode={langCode}
            nativeLang={nativeLang}
            aiSettings={aiSettings}
            color={mainTextColor}
            fontWeight={800}
            fontSize={13}
          />
        </div>
        <SpeakButton text={example.text} code={langCode} color={colors.teal} edge="end" />
      </div>
      {exampleTargetLangs.map((l) => (
        <WordExampleTranslationLine
          key={l.code}
          example={example}
          word={word}
          langCode={langCode}
          targetLang={l.code}
          abbr={l.abbr}
          aiSettings={aiSettings}
        />
      ))}
      <button
        onClick={() => {
          addTextToStoryPicks(example.text, langCode);
          setAdded(true);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: added ? colors.gold : colors.teal,
          background: "transparent",
          border: `1px solid ${added ? colors.gold : colors.cardBorder}`,
          borderRadius: 6,
          padding: "3px 8px",
          marginTop: 6,
        }}
      >
        {added ? <Check size={11} /> : <Plus size={11} />}
        {added ? "اضافه شد به داستان‌ساز" : "افزودن این مثال به داستان‌ساز"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leitner review box
// ---------------------------------------------------------------------------
function ReviewBox({ conversation , boxes, setBoxes, nativeLang, targetLangs, index, setIndex, showAnswer, setShowAnswer }) {
  const active = conversation .filter((p) => boxes[p.id] < 5);
  if (active.length === 0) {
    return (
      <p style={{ textAlign: "center", color: colors.teal, marginTop: 40, fontWeight: 600 }}>
        همه‌ی عبارات رو بلدی! 🎉
      </p>
    );
  }
  const current = active[index % active.length];

  const handle = (knew) => {
    setBoxes((prev) => ({
      ...prev,
      [current.id]: knew ? Math.min(5, prev[current.id] + 1) : 1,
    }));
    setShowAnswer(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <p style={{ fontSize: 12, color: colors.inkSoft }}>
        باقی‌مانده برای مرور: {active.length}
      </p>
      <div
        className="w-full max-w-sm rounded-xl p-8 text-center"
        style={{ backgroundColor: "white", border: `2px solid ${colors.gold}`, minHeight: 140 }}
      >
        <div onClick={() => setShowAnswer((s) => !s)} style={{ cursor: "pointer" }}>
          <div className="flex items-center justify-center gap-2">
            <p style={{ fontWeight: 800, fontSize: 18, color: mainTextColor }}>{current.t[nativeLang]}</p>
            <SpeakButton text={current.t[nativeLang]} code={nativeLang} />
            {current.level && <LevelBadge level={current.level} />}
          </div>
          {!showAnswer && (
            <p style={{ color: colors.cardBorder, fontSize: 12, marginTop: 14 }}>
              (برای دیدن ترجمه لمس کن)
            </p>
          )}
        </div>
        {showAnswer && (
          <div className="flex flex-col gap-2" style={{ marginTop: 14 }}>
            {targetLangs.map((l) => (
              <div key={l.code} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, direction: "ltr" }}>
                <span
                  style={{
                    fontFamily: fontFa,
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.gold,
                    border: `1px solid ${colors.goldSoft}`,
                    borderRadius: 6,
                    padding: "1px 5px",
                    flexShrink: 0,
                  }}
                >
                  {l.abbr}
                </span>
                <p style={{ fontFamily: fontLatin, color: translationColor, fontWeight: 800, fontSize: 16 }}>
                  {current.t[l.code] ?? "—"}
                </p>
                {current.t[l.code] && <SpeakButton text={current.t[l.code]} code={l.code} color={translationColor} edge="end" />}
              </div>
            ))}
          </div>
        )}
      </div>
      {showAnswer && (
        <div className="flex gap-3">
          <button
            onClick={() => handle(false)}
            className="flex items-center gap-1 px-4 py-2 rounded-full"
            style={{ backgroundColor: colors.rose, color: "white", fontFamily: fontFa }}
          >
            <X size={16} /> بلد نبودم
          </button>
          <button
            onClick={() => handle(true)}
            className="flex items-center gap-1 px-4 py-2 rounded-full"
            style={{ backgroundColor: colors.teal, color: "white", fontFamily: fontFa }}
          >
            <Check size={16} /> بلد بودم
          </button>
        </div>
      )}
    </div>
  );
}


// =============================================================================
// AUTHENTICATION
// -----------------------------------------------------------------------------
// Local, per-device accounts (email/password, stored+hashed in localStorage)
// plus real "Sign in with Google" via Google Identity Services.
//
// ⚠️ TO ENABLE REAL GOOGLE SIGN-IN:
//   1. Go to https://console.cloud.google.com/apis/credentials
//   2. Create an OAuth Client ID → Application type: "Web application"
//   3. Under "Authorized JavaScript origins" add:
//        - http://localhost:5173               (for `npm run dev`)
//        - your production URL (e.g. the Vercel domain from vercel.json)
//   4. Paste the Client ID below, replacing the placeholder.
// Until a real Client ID is set, the Google button falls back to a demo
// sign-in so you can still test the rest of the app end-to-end.
// =============================================================================
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const USERS_KEY = "phrasebook-users-v1";
const SESSION_KEY = "phrasebook-session-v1";

function loadUsers() {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}
function persistSession(user) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {}
}
function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Client-side-only hash — fine for a local demo account system, NOT a
// substitute for real server-side auth with bcrypt/argon2 in production.
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return String(h);
}

function AuthField({ icon, placeholder, value, onChange, type = "text" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "10px 12px",
        background: "#fff",
      }}
    >
      <span style={{ color: colors.inkSoft }}>{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        style={{
          border: "none",
          outline: "none",
          flex: 1,
          fontFamily: fontFa,
          fontSize: 14,
          background: "transparent",
          color: colors.ink,
        }}
      />
    </div>
  );
}

function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // ورود واقعی با گوگل از طریق Supabase (نه Firebase، نه GIS محلی).
  // بعد از این‌که Google را در Supabase → Authentication → Providers فعال
  // کردی، این دکمه کاربر رو به صفحه‌ی ورود گوگل می‌فرسته و بعد از تایید،
  // Supabase خودش برش می‌گردونه به همین سایت با یه سشن واقعی.
  async function handleGoogleSignIn() {
    setError("");
    setGoogleBusy(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        // Always redirect to a CLEAN url (no leftover ?error=/#access_token=
        // from a previous login attempt). Reusing window.location.href as-is
        // carries old auth fragments into the new OAuth request and breaks
        // Supabase's state check ("bad_oauth_state") — this is what was
        // happening.
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (oauthError) throw oauthError;
      // مرورگر همین‌جا به صفحه‌ی گوگل ریدایرکت می‌شه؛ ادامه‌ی کار (ساخت
      // سشن) تو App، با onAuthStateChange انجام می‌شه.
    } catch (e) {
      setError("ورود با گوگل ناموفق بود: " + (e?.message || "دوباره تلاش کنید."));
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("همه‌ی فیلدها را پر کنید.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // تایید ایمیل خاموشه (یا از قبل تاییده) — مستقیم وارد می‌شیم
          onAuthenticated(supabaseUserToSession(data.user));
        } else {
          // Supabase یه ایمیل تاییدیه فرستاده؛ تا کلیک نکنه نمی‌تونه وارد شه
          setNotice("یک ایمیل تایید برایتان فرستاده شد. لطفاً ایمیلتان را باز کنید و لینک را بزنید، بعد وارد شوید.");
          setMode("login");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onAuthenticated(supabaseUserToSession(data.user));
      }
    } catch (e) {
      const msg = e?.message || "";
      if (/already registered|already exists/i.test(msg)) setError("این ایمیل قبلاً ثبت شده. وارد شوید.");
      else if (/invalid login credentials/i.test(msg)) setError("ایمیل یا رمز عبور اشتباه است.");
      else if (/email not confirmed/i.test(msg)) setError("هنوز ایمیلتان را تایید نکرده‌اید — صندوق ورودی را چک کنید.");
      else setError(msg || "خطایی رخ داد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        minHeight: "100vh",
        background: colors.paper,
        fontFamily: fontFa,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: colors.paperDark,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 18,
          padding: 32,
          boxShadow: "0 10px 30px rgba(28,37,65,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: colors.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: colors.paper,
            }}
          >
            {mode === "signup" ? <UserPlus size={26} /> : <LogIn size={26} />}
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.ink }}>
            {mode === "signup" ? "ساخت حساب کاربری" : "ورود به کتاب مکالمه"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.inkSoft }}>
            برای ذخیره‌ی پیشرفت و واژه‌هایتان وارد شوید
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleBusy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 999,
              border: `1px solid ${colors.cardBorder}`,
              background: "#fff",
              color: colors.ink,
              fontFamily: fontFa,
              fontWeight: 600,
              fontSize: 14,
              cursor: googleBusy ? "default" : "pointer",
            }}
          >
            {googleBusy ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 15.6 3 8.4 8 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.5 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C8.3 40 15.5 45 24 45z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.4C41.4 35.9 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
              </svg>
            )}
            ورود با حساب گوگل
          </button>
        </div>

        <div className="flex items-center gap-2" style={{ margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
          <span style={{ fontSize: 12, color: colors.inkSoft }}>یا با ایمیل</span>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <AuthField icon={<User size={16} />} placeholder="نام شما" value={name} onChange={setName} />
          )}
          <AuthField icon={<Mail size={16} />} placeholder="ایمیل" value={email} onChange={setEmail} type="email" />
          <AuthField
            icon={<Lock size={16} />}
            placeholder="رمز عبور"
            value={password}
            onChange={setPassword}
            type="password"
          />

          {error && <div style={{ color: colors.rose, fontSize: 13, textAlign: "center" }}>{error}</div>}
          {notice && <div style={{ color: colors.teal, fontSize: 13, textAlign: "center" }}>{notice}</div>}

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 4,
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: colors.ink,
              color: colors.paper,
              fontFamily: fontFa,
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {busy && <Loader2 size={16} className="spin" />}
            {mode === "signup" ? "ساخت حساب" : "ورود"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: colors.inkSoft }}>
          {mode === "signup" ? "حساب دارید؟" : "حساب ندارید؟"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setNotice("");
            }}
            style={{
              background: "none",
              border: "none",
              color: colors.teal,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: fontFa,
              fontSize: 13,
            }}
          >
            {mode === "signup" ? "وارد شوید" : "بسازید"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Top-level export: gates the whole app behind login/signup, and remounts
// PhrasebookMain (key={user.email}) whenever the account changes so each
// user's saved progress loads fresh from their own storage slot.
// -----------------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [appPrefs, setAppPrefs] = useState(loadAppPrefs);

  useEffect(() => saveAppPrefs(appPrefs), [appPrefs]);

  // اگه کاربر قبلاً دیکشنری‌ای دانلود کرده بوده، همین اول بارگذاریش کن تو
  // حافظه — بدون این کار، جستجوی آفلاین فقط بعد از یه دانلود تازه کار می‌کنه.
  useEffect(() => {
    offlineDictionary.hydrateFromCache();
  }, []);

  // سشن واقعی Supabase: هم موقع بارگذاری اول صفحه (مثلاً بعد از برگشتن از
  // صفحه‌ی ورود گوگل) چک می‌کنیم، هم روی هر تغییر (ورود/خروج/تازه‌سازی توکن)
  // گوش می‌دیم. خود Supabase سشن رو تو localStorage نگه می‌داره، پس با
  // رفرش کردن صفحه هم لاگین باقی می‌مونه.
  useEffect(() => {
    let active = true;
    // NOTE: we used to strip access_token/error from the URL right here,
    // synchronously, before Supabase had a chance to read it. That's a race:
    // Supabase's own hash/code parsing (detectSessionInUrl) runs
    // asynchronously, and if we clear the URL first, Supabase finds nothing
    // left to parse — no session gets created — and the app falls back to
    // the login screen even though Google auth itself succeeded. So now we
    // let getSession()/onAuthStateChange do their job first, and only scrub
    // the address bar afterward (see onAuthStateChange below and the
    // fallback cleanup a few lines down).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(supabaseUserToSession(data?.session?.user || null));
      setCheckingSession(false);
      if (
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=") ||
        window.location.search.includes("error")
      ) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(supabaseUserToSession(session?.user || null));
      setCheckingSession(false);
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);


  const theme = APP_THEMES[appPrefs.theme].values;
  const font = APP_FONTS[appPrefs.font];
  const fontSize = APP_FONT_SIZES[appPrefs.fontSize];

  // پنلِ شناورِ «تمرین جمله‌سازی» با createPortal مستقیم زیرِ <body> رندر
  // می‌شه (نه داخلِ این div پایین‌تر) — یعنی بیرون از دامنه‌ی CSS
  // custom-property هایی (--c-paper, --c-teal, ...) که فقط روی اون div
  // ست می‌شدن. نتیجه‌ش این بود که رنگ‌های colors.xxx (که همه‌شون
  // var(--c-xxx) هستن) داخلِ پنلِ پورتال‌شده تعریف‌نشده می‌موندن و
  // به‌جاش شفاف رندر می‌شدن — هم بک‌گراندِ خودِ پنل، هم آیکون‌هاش.
  // برای رفعِ همیشگیِ این مشکل، همین متغیرها رو مستقیماً روی
  // document.documentElement هم ست می‌کنیم؛ چون <html> جدِ مشترکِ هم
  // #root و هم document.body (مقصدِ پورتال) هست، این‌جوری همه‌جای صفحه —
  // پورتال‌شده یا نه — رنگ‌ها رو درست می‌بینه.
  useEffect(() => {
    const el = document.documentElement.style;
    el.setProperty("--c-paper", theme.paper);
    el.setProperty("--c-paperDark", theme.paperDark);
    el.setProperty("--c-ink", theme.ink);
    el.setProperty("--c-inkSoft", theme.inkSoft);
    el.setProperty("--c-gold", theme.gold);
    el.setProperty("--c-goldSoft", theme.goldSoft);
    el.setProperty("--c-teal", theme.teal);
    el.setProperty("--c-rose", theme.rose);
    el.setProperty("--c-cardBorder", theme.cardBorder);
    el.setProperty("--font-fa", font.fa);
    el.setProperty("--font-latin", font.latin);
  }, [theme, font]);

  // Sets the CSS custom properties every `colors.xxx` / fontFa / fontLatin
  // reference resolves to, plus a `zoom` for the font-size preference — one
  // wrapper, whole app re-themed, login screen included.
  const rootStyle = {
    "--c-paper": theme.paper,
    "--c-paperDark": theme.paperDark,
    "--c-ink": theme.ink,
    "--c-inkSoft": theme.inkSoft,
    "--c-gold": theme.gold,
    "--c-goldSoft": theme.goldSoft,
    "--c-teal": theme.teal,
    "--c-rose": theme.rose,
    "--c-cardBorder": theme.cardBorder,
    "--font-fa": font.fa,
    "--font-latin": font.latin,
    zoom: fontSize.zoom,
    minHeight: "100vh",
  };

  if (checkingSession) {
    return (
      <div style={{ ...rootStyle, display: "flex", alignItems: "center", justifyContent: "center", background: colors.paper }}>
        <Loader2 size={28} className="spin" color={colors.gold} />
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      {!user ? (
        <LoginScreen onAuthenticated={setUser} />
      ) : (
        <PhrasebookMain
          key={user.email}
          user={user}
          appPrefs={appPrefs}
          setAppPrefs={setAppPrefs}
          onLogout={async () => {
            try {
              await supabase.auth.signOut();
            } catch {}
            setUser(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mount point — added so this file can run standalone in a browser (no
// bundler) via an import-map + Babel-standalone setup. See index.html.
// ---------------------------------------------------------------------------
import ReactDOM from "react-dom/client";
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
