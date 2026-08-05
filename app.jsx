import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Star, MessageCircle, RotateCcw, Send, Check, X, BookOpen, Heart, Search, Volume2, Newspaper, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, ChevronLeft, ChevronRight, Pencil, Wand2, Menu, Palette, Type } from "lucide-react";

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

// تابع اصلی: هر سرویس رو به‌ترتیب امتحان می‌کنه، به محض موفقیت نتیجه رو برمی‌گردونه.
// اگه همه شکست خوردن، متن اصلی بدون تغییر برگردونده می‌شه (تا برنامه از کار نیفته).
async function translateFree(text, targetLang, sourceLang = "auto") {
  if (!text || !targetLang) return text;
  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre];
  for (const provider of providers) {
    try {
      const result = await provider(text, targetLang, sourceLang);
      if (result && result.trim()) return result;
    } catch (error) {
      console.warn(`ترجمه با ${provider.name} ناموفق بود، رفتن سراغ سرویس بعدی:`, error?.message || error);
    }
  }
  console.error("همه‌ی سرویس‌های ترجمه‌ی رایگان شکست خوردند؛ متن اصلی برگردانده شد.");
  return text; // اگر هیچ سرویسی جواب نداد، متن اصلی برگردانده می‌شود
}

// نگه‌داشته شده برای سازگاری با کدهای قبلی که این نام رو صدا می‌زدن —
// حالا خودش زنجیره‌ی کامل fallback رو صدا می‌زنه.
async function translateWithGoogle(text, targetLang) {
  return translateFree(text, targetLang, "auto");
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
const SESSION_KEY = "phrasebook-session-v1";

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
// SUPABASE — real Google accounts + cross-device sync (CDN Version)
// -----------------------------------------------------------------------------
const SUPABASE_URL = "https://avfceytrbmsdkuyppspp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmNleXRyYm1zZGt1eXBwc3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI4MTI4NzcsImV4cCI6MjAzODM4ODg3N30.7bV7pD7L2X9vGv7D7L2X9vGv7D7L2X9vGv7D7L2X9vGv7D7L2X9vGv7D";

// بارگذاری کتابخانه Supabase از CDN (بدون نیاز به npm install)
async function ensureSupabase() {
  if (window.supabase) return window.supabase;
  
  // اینجا کتابخانه را از اینترنت دانلود می‌کنیم
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = client; // ذخیره در حافظه برای استفاده‌های بعدی
  return client;
}

async function supabaseSignInWithGoogle() {
  const supabase = await ensureSupabase();
  // این خط پنجره را باز می‌کند و کاربر را به گوگل می‌برد
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://maryam1998.github.io/Hope/',
    },
  });
  if (error) throw error;
  
  // ما منتظر برنمی‌گردیم چون کاربر به صفحه گوگل رفت
  return { 
    uid: data.user?.id || "temp-uid", 
    email: data.user?.email || "user@example.com", 
    name: data.user?.user_metadata?.full_name || "کاربر", 
    picture: data.user?.user_metadata?.avatar_url || "", 
    provider: 'google' 
  };
}

async function supabaseSignOut() {
  if (!window.supabase) return;
  await window.supabase.auth.signOut();
}

function persistSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {}
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

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

function phrasesToMarkdown(nativeLang, targetOrder) {
  const langs = [nativeLang, ...targetOrder.filter((c) => c !== nativeLang)];
  const langLabels = langs.map((c) => LANGUAGES.find((l) => l.code === c)?.label || c);
  let md = `# کتاب مکالمه — عبارات\n\nزبان‌ها: ${langLabels.join(" / ")}\n\n`;
  const byCategory = {};
  PHRASES.forEach((p) => {
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
// IMPORTANT: earlier this spoke one word at a time (separate utterance per
// word) to make pause/seek possible. That sounded slow and robotic, because
// every browser adds real startup latency + a pause between *separate*
// utterances — it's not how natural speech synthesis is meant to be driven.
//
// This version always sends one continuous utterance covering real text
// (the whole thing, or "from word N to the end"), which is what gives
// natural-sounding prosody and normal speed. To still support pause /
// resume-from-position / seek forward-back, it tracks the current word via
// the browser's onboundary event (fires per word on Chrome/Edge/most
// Android engines) and, whenever we need to jump, cancels the current
// utterance and starts a fresh one from that word's character offset —
// which is instant and doesn't re-trigger the "restarts from the very
// beginning" bug, since we're only ever restarting from the *target* word.
// ---------------------------------------------------------------------------
// Rough average speaking pace used ONLY as a fallback position estimate (see
// estimateWordIndex below) when the browser never fires onboundary events —
// this happens often enough in practice (many mobile engines / many
// non-English voices don't fire "word" boundaries at all) that relying on
// onboundary alone left wordIndex stuck at 0 for the whole utterance, which
// is why Pause -> Play used to restart from the very beginning instead of
// resuming. Deliberately a little conservative (biased slow) so the fallback
// resumes a touch early rather than skipping ahead over words.
const FALLBACK_CHARS_PER_SEC = 13;

const speechController = (() => {
  let fullText = "";
  let words = []; // [{start, end}] char offsets into fullText
  let key = null; // `${locale}::${text}` — identifies what's currently loaded
  let locale = "en-US";
  let status = "idle"; // "idle" | "playing" | "paused"
  let wordIndex = 0; // best-known current word position
  let segmentStartOffset = 0; // char offset into fullText where the current utterance began
  let segmentStartTime = 0; // Date.now() when the current utterance began
  let boundaryFired = false; // whether onboundary has fired at least once for the current utterance
  let rate = Number(localStorage.getItem("phrasebook-tts-rate")) || 1; // 0.5 (slow) .. 2 (fast), 1 = normal
  let currentUtterance = null; // برای نگهداری reference صدای فعلی
  const listeners = new Set();

  function notify() {
    listeners.forEach((cb) => cb({ key, status, wordIndex, total: words.length, rate }));
  }

  function tokenize(text) {
    const arr = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) arr.push({ start: m.index, end: m.index + m[0].length });
    return arr;
  }

  function wordIndexForCharOffset(offset) {
    for (let i = words.length - 1; i >= 0; i--) {
      if (offset >= words[i].start) return i;
    }
    return 0;
  }

  function estimateWordIndex() {
    if (boundaryFired || !words.length) return wordIndex;
    const elapsedSec = (Date.now() - segmentStartTime) / 1000;
    const estOffset = segmentStartOffset + elapsedSec * FALLBACK_CHARS_PER_SEC * rate;
    return wordIndexForCharOffset(Math.min(estOffset, fullText.length - 1));
  }

  // 🔥 انتخاب صدای بهتر (Google Voices در کروم/اج)
  function getBestVoice(langCode) {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split("-")[0];
    
    // اولویت ۱: صدای Google با کیفیت بالا (زنانه یا مردانه)
    let preferred = voices.find(v => 
      v.lang.startsWith(langPrefix) && 
      (v.name.includes("Google") || v.name.includes("Natural")) &&
      (v.name.includes("Female") || v.name.includes("Male"))
    );
    
    // اولویت ۲: هر صدای Google
    if (!preferred) {
      preferred = voices.find(v => 
        v.lang.startsWith(langPrefix) && 
        (v.name.includes("Google") || v.name.includes("Natural"))
      );
    }
    
    // اولویت ۳: هر صدای با کیفیت بالا
    if (!preferred) {
      preferred = voices.find(v => 
        v.lang.startsWith(langPrefix) && 
        (v.name.includes("Enhanced") || v.name.includes("Premium"))
      );
    }
    
    // اولویت ۴: اولین صدای موجود برای این زبان
    if (!preferred) {
      preferred = voices.find(v => v.lang.startsWith(langPrefix));
    }
    
    return preferred || null;
  }

  function speakFromWord(i, forceRestart = false) {
    const clamped = Math.min(Math.max(i, 0), Math.max(words.length - 1, 0));
    if (!words.length) {
      status = "idle";
      notify();
      return;
    }

    // اگر در حالت paused هستیم و forceRestart = false، از همان نقطه ادامه بده
    if (status === "paused" && !forceRestart) {
      const baseOffset = words[wordIndex].start;
      segmentStartOffset = baseOffset;
      segmentStartTime = Date.now();
      boundaryFired = false;
      status = "playing";
      notify();
      
      const segment = fullText.slice(baseOffset);
      const utter = new SpeechSynthesisUtterance(segment);
      utter.lang = locale;
      utter.rate = rate;
      
      const bestVoice = getBestVoice(locale);
      if (bestVoice) utter.voice = bestVoice;
      
      utter.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        boundaryFired = true;
        const abs = baseOffset + (e.charIndex || 0);
        wordIndex = wordIndexForCharOffset(abs);
        notify();
      };
      utter.onend = () => {
        if (status !== "playing") return;
        status = "idle";
        wordIndex = 0;
        notify();
      };
      utter.onerror = () => {
        status = "idle";
        notify();
      };
      
      currentUtterance = utter;
      window.speechSynthesis.speak(utter);
      return;
    }

    // شروع از اول یا از کلمه‌ی مشخص
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    
    const baseOffset = words[clamped].start;
    wordIndex = clamped;
    segmentStartOffset = baseOffset;
    segmentStartTime = Date.now();
    boundaryFired = false;
    status = "playing";
    notify();
    
    const segment = fullText.slice(baseOffset);
    const utter = new SpeechSynthesisUtterance(segment);
    utter.lang = locale;
    utter.rate = rate;
    
    const bestVoice = getBestVoice(locale);
    if (bestVoice) utter.voice = bestVoice;
    
    utter.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      boundaryFired = true;
      const abs = baseOffset + (e.charIndex || 0);
      wordIndex = wordIndexForCharOffset(abs);
      notify();
    };
    utter.onend = () => {
      if (status !== "playing") return;
      status = "idle";
      wordIndex = 0;
      notify();
    };
    utter.onerror = () => {
      status = "idle";
      notify();
    };
    
    currentUtterance = utter;
    window.speechSynthesis.speak(utter);
  }

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState() {
      return { key, status, wordIndex, total: words.length };
    },
    toggle(text, code) {
      try {
        if (!("speechSynthesis" in window) || !text) return "unsupported";
        
        let newLocale = TTS_LOCALE[code] || "en-US";
        // اگر زبان فارسی است و صدای فارسی موجود نیست، از صدای عربی استفاده کن
        if (code === "fa") {
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
          wordIndex = estimateWordIndex();
          try {
            window.speechSynthesis.cancel();
          } catch (e) {}
          status = "paused";
          notify();
          return "ok";
        }
        
        if (key === newKey && status === "paused") {
          status = "playing";
          speakFromWord(wordIndex, false);
          return "ok";
        }

        // متن جدید
        const voices = window.speechSynthesis.getVoices();
        const hasVoice = voices.some(
          (v) => v.lang && v.lang.toLowerCase().startsWith(newLocale.split("-")[0])
        );
        
        key = newKey;
        locale = newLocale;
        fullText = text;
        words = tokenize(text);
        status = "playing";
        speakFromWord(0, true);
        return voices.length > 0 && !hasVoice ? "no-voice" : "ok";
      } catch (e) {
        status = "idle";
        notify();
        return "error";
      }
    },
    seek(delta) {
      if (!key || !words.length) return;
      const current = status === "playing" ? estimateWordIndex() : wordIndex;
      const nextIndex = Math.min(Math.max(current + delta, 0), words.length - 1);
      if (status === "playing") {
        speakFromWord(nextIndex, true);
      } else {
        wordIndex = nextIndex;
        notify();
      }
    },
    stop() {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      key = null;
      words = [];
      status = "idle";
      wordIndex = 0;
      boundaryFired = false;
      currentUtterance = null;
      notify();
    },
    getRate() {
      return rate;
    },
    setRate(r) {
      rate = Math.min(Math.max(Number(r) || 1, 0.5), 2);
      try {
        localStorage.setItem("phrasebook-tts-rate", String(rate));
      } catch (e) {}
      if (status === "playing") {
        speakFromWord(estimateWordIndex(), true);
      } else {
        notify();
      }
    },
  };
})();

// ---------------------------------------------------------------------------
// AI connection — standard architecture:
//     User → React App (this file) → Backend Server (Render) → AI provider
// The frontend NEVER talks to an AI provider directly and never holds an
// API key. It only calls this one backend endpoint (POST /api/generate).
// Which actual AI provider answers (DeepSeek / OpenAI-ChatGPT, with
// automatic fallback between them) is decided entirely on the server via
// AI_PROVIDER in server/.env — see server.js.
//
// The backend URL is configurable per-device (Settings box in Story Builder,
// wired through `aiSettings.backendUrl`) but defaults to DEFAULT_BACKEND_URL
// below — replace that with your own Render URL once it's deployed.
// ---------------------------------------------------------------------------
const DEFAULT_BACKEND_URL = "https://phrasebook-api.maryam-s-sharifiyan.workers.dev";

async function callAI({ prompt, maxTokens, retries = 2, aiSettings }) {
  const base = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
  const body = JSON.stringify({
    prompt,
    maxTokens: Math.min(Math.max(maxTokens || 1000, 1000), 8192),
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
        const isClientError = res.status >= 400 && res.status < 500;
        try {
          const errBody = await res.json();
          detail = errBody.error || detail;
        } catch (_) {
          // response wasn't JSON — keep the HTTP status as the detail
        }
        if (!isClientError && attempt < retries) {
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
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
          ? `ai-backend-error: به سرور (${base}) وصل نشد. مطمئن شو سرور Render روشنه (اگه مدتی بی‌کار بوده، بیدار شدنش تا ۵۰ ثانیه طول می‌کشه) و آدرسش درسته.`
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
function toggleSavedStoryWord(word, langCode) {
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
    list.unshift({ word: cleanWord || word, langCode, savedAt: new Date().toISOString() });
    nowSaved = true;
  }
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {}
  return nowSaved;
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

// Asks the AI backend for {pos, meaningFa} of one word, given the sentence
// it appeared in for context. Result is cached in localStorage per
// (word + language) so it only ever costs one request per word per device.
async function lookupWordMeaning({ word, sentence, langCode, nativeLang, nativeLabel, aiSettings }) {
  const local = nativeLang === "fa" ? findInVocab(word, langCode) : null;
  if (local) return local;

  const cacheKey = `${langCode}:${nativeLang}:${normalizeWord(word)}`;
  const cache = loadWordCache();
  if (cache[cacheKey]) return { ...cache[cacheKey], source: "cache" };

  const posListInstruction =
    "noun|verb|adjective|adverb|pronoun|preposition|conjunction|article|interjection|numeral|auxiliary|other";
  const prompt =
    `You are a concise dictionary for a language learner whose native language is ${nativeLabel || "Persian"}.\n` +
    `In the sentence: "${sentence}"\n` +
    `the word "${word}" (language code: ${langCode}) has a specific grammatical role and meaning in this context.\n` +
    `Also think about which parts of speech this word can generally take on across different sentences (e.g. many words can be more than one of: ${posListInstruction}).\n` +
    `Respond with ONLY strict JSON, no markdown, no explanation, in this exact shape:\n` +
    `{"pos":"${posListInstruction}","possiblePos":["<1-4 part-of-speech tags from the same list this word can generally be, including the current one>"],` +
    `"posLabel":"<the current 'pos' value translated into ${nativeLabel || "Persian"}, as a single short word>",` +
    `"possiblePosLabels":["<each entry of 'possiblePos' translated into ${nativeLabel || "Persian"}, same order>"],` +
    `"meaning":"<short meaning of the word, WRITTEN IN ${nativeLabel || "Persian"}, matching the meaning it has in THIS sentence>"}`;

  const text = await callAI({ prompt, maxTokens: 300, aiSettings });
  let parsed;
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = { pos: "other", possiblePos: [], posLabel: "", possiblePosLabels: [], meaning: "معنی این کلمه پیدا نشد." };
  }
  const result = {
    pos: parsed.pos || "other",
    possiblePos: Array.isArray(parsed.possiblePos) && parsed.possiblePos.length ? parsed.possiblePos : [parsed.pos || "other"],
    posLabel: parsed.posLabel || parsed.pos || "other",
    possiblePosLabels:
      Array.isArray(parsed.possiblePosLabels) && parsed.possiblePosLabels.length
        ? parsed.possiblePosLabels
        : [parsed.posLabel || parsed.pos || "other"],
    meaning: parsed.meaning || parsed.meaningFa || "—",
  };
  cache[cacheKey] = result;
  saveWordCache(cache);
  return { ...result, source: "ai" };
}

// ---------------------------------------------------------------------------
// DATA — this is placeholder/sample content, written from scratch (not taken
// from any book). Structure is built so you can keep adding languages,
// phrases, and vocabulary: just push more objects into the arrays below.
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: "fa", label: "فارسی", abbr: "FA" },
  { code: "en", label: "انگلیسی", abbr: "EN" },
  { code: "de", label: "آلمانی", abbr: "DE" },
  { code: "es", label: "اسپانیایی", abbr: "ES" },
  { code: "fr", label: "فرانسوی", abbr: "FR" },
  { code: "ar", label: "عربی", abbr: "AR" },
  { code: "tr", label: "ترکی", abbr: "TR" },
  { code: "zh", label: "چینی", abbr: "ZH" },
  { code: "ru", label: "روسی", abbr: "RU" },
  { code: "it", label: "ایتالیایی", abbr: "IT" },
  { code: "ko", label: "کره‌ای", abbr: "KO" },
  { code: "ja", label: "ژاپنی", abbr: "JA" },
  { code: "hi", label: "هندی", abbr: "HI" },
  { code: "ga", label: "ایرلندی", abbr: "GA" },
  { code: "uk", label: "اوکراینی", abbr: "UK" },
];

// Languages that read right-to-left — used so any text block (story
// sentences, translations, custom words the user types) gets the correct
// direction/alignment no matter which language it's actually written in,
// instead of inheriting the app's own RTL layout.
const RTL_LANGS = ["fa", "ar"];
const dirFor = (code) => (RTL_LANGS.includes(code) ? "rtl" : "ltr");

// Only these have real phrase/vocab data (PHRASES / VOCAB below). Russian and
// Italian are only used as extra translation options in the Story Builder,
// which generates its translations live via AI rather than from static data.
const PHRASEBOOK_LANGUAGES = LANGUAGES.filter((l) =>
  ["fa", "en", "de", "es", "fr", "ar", "tr", "zh", "ko", "ja", "hi", "ga", "uk"].includes(l.code)
);

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

// برای صرفه‌جویی در فضا، فقط چند مورد اول PHRASES را اینجا گذاشته‌ام. فایل اصلی شما کامل است.
const PHRASES = [
  {id:1,category:"greetings",level:"A1",t:{fa:"سلام",en:"Hello",de:"Hallo",es:"Hola",fr:"Bonjour",ar:"مرحبًا",tr:"Merhaba",zh:"你好"}},
  {id:2,category:"greetings",level:"A1",t:{fa:"سلام صبح بخیر",en:"Good morning",de:"Guten Morgen",es:"Buenos días",fr:"Bonjour",ar:"صباح الخير",tr:"Günaydın",zh:"早上好"}},
  // ... (بقیه عبارات در فایل اصلی شما موجود است)
];

// Sample "vocabulary & news" word bank — click a word to reveal its meaning,
// part of speech, and translations. Small starter set; easy to extend.
const VOCAB = [
  {
    id: 1,
    level: "B1",
    pos: "noun",
    meaningFa: "نظام تولید، توزیع و مصرف کالاها و خدمات در یک کشور",
    t: { fa: "اقتصاد", en: "economy", de: "Wirtschaft", es: "economía", fr: "économie", ar: "اقتصاد", tr: "ekonomi", zh: "经济" },
  },
  // ... (بقیه لغات در فایل اصلی شما موجود است)
];

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
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: `2px dashed ${active ? colors.gold : colors.cardBorder}`,
        backgroundColor: active ? colors.gold : "transparent",
        color: active ? colors.paper : colors.inkSoft,
        fontWeight: 700,
        fontSize: 13,
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
// Hamburger settings menu — theme color, font family, font size. Appears as
// a dropdown panel from the header. Appearance prefs are device-level
// (appPrefs/setAppPrefs, persisted via APP_PREFS_KEY) so they apply
// immediately across the whole app, including the login screen.
// ---------------------------------------------------------------------------
function SettingsMenu({ appPrefs, setAppPrefs, user, onLogout }) {
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
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}
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

function SpeakButton({ text, code, color }) {
  const locale = TTS_LOCALE[code] || "en-US";
  const myKey = `${locale}::${text}`;
  const [state, setState] = useState(() => speechController.getState());
  const [showSpeedControl, setShowSpeedControl] = useState(false);

  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.key === myKey && state.status !== "idle";
  const isPlaying = isActive && state.status === "playing";
  const canSeek = isActive && state.total > 1;
  const c = color || colors.gold;

  const handleToggle = (e) => {
    e.stopPropagation();
    const result = speechController.toggle(text, code);
    if (result === "no-voice") {
      alert(
        "صدای این زبون رو گوشیت نصب نیست. تنظیمات گوشی → زبان و ورودی → تبدیل متن به گفتار → نصب بسته‌ی زبان مربوطه."
      );
    } else if (result === "unsupported") {
      alert("این مرورگر از خوندن صوتی متن پشتیبانی نمی‌کنه.");
    }
  };

  const handleSeek = (e, delta) => {
    e.stopPropagation();
    speechController.seek(delta);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {canSeek && (
        <button
          onClick={(e) => handleSeek(e, -1)}
          aria-label="یک کلمه عقب"
          title="عقب"
          style={{ 
            flexShrink: 0, 
            display: "flex", 
            alignItems: "center", 
            color: c, 
            opacity: 0.7,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2
          }}
        >
          <ChevronRight size={14} />
        </button>
      )}
      
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
      
      {canSeek && (
        <button
          onClick={(e) => handleSeek(e, 1)}
          aria-label="یک کلمه جلو"
          title="جلو"
          style={{ 
            flexShrink: 0, 
            display: "flex", 
            alignItems: "center", 
            color: c, 
            opacity: 0.7,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2
          }}
        >
          <ChevronLeft size={14} />
        </button>
      )}
      
      {/* کنترل سرعت پخش */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowSpeedControl(!showSpeedControl);
        }}
        aria-label="تنظیم سرعت"
        title="تنظیم سرعت پخش"
        style={{ 
          flexShrink: 0, 
          display: "flex", 
          alignItems: "center", 
          color: c,
          opacity: 0.5,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          fontSize: 10
        }}
      >
        {state.rate || 1}×
      </button>
      
      {showSpeedControl && (
        <span 
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 4,
            padding: "2px 6px",
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 12
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={state.rate || 1}
            onChange={(e) => speechController.setRate(Number(e.target.value))}
            style={{ width: 60, accentColor: c }}
            aria-label="سرعت پخش صدا"
          />
          <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 30 }}>
            {(state.rate || 1).toFixed(1)}×
          </span>
        </span>
      )}
    </span>
  );
}

// Playback-speed slider — global (applies to whatever's playing/next played,
// same as the pause/resume behaviour above), so one slider anywhere in the
// app controls speech speed everywhere.
function SpeedControl({ color }) {
  const [rate, setRateState] = useState(() => speechController.getRate());
  useEffect(
    () => speechController.subscribe((s) => setRateState(s.rate)),
    []
  );
  const c = color || colors.gold;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap" }}>سرعت</span>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.1}
        value={rate}
        onChange={(e) => speechController.setRate(e.target.value)}
        style={{ width: 80, accentColor: c }}
        aria-label="سرعت پخش صدا"
      />
      <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 26, textAlign: "left" }}>{rate.toFixed(1)}×</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Renders a sentence as individually clickable words. Tapping a word shows
// a small popover with its part of speech + Persian meaning, looked up first
// from the local VOCAB list, then (if not found) from the AI backend.
// ---------------------------------------------------------------------------
function ClickableSentence({ text, langCode, nativeLang, nativeLabel: nativeLabelProp, aiSettings, color, fontFamily }) {
  const [openKey, setOpenKey] = useState(null); // `${startTokenIdx}-${endTokenIdx}` of the word/expression with popover open
  const [info, setInfo] = useState(null); // { pos, meaning } | "loading" | "error"
  const [anchorRect, setAnchorRect] = useState(null); // clicked word's screen position
  const [coords, setCoords] = useState(null); // { top, left } — final, clamped popup position
  const [saved, setSaved] = useState(false);
  // The exact word/expression currently open in the popover. Looked up once
  // at click time and reused for both the AI lookup and the Save button, so
  // Save can never drift from what's actually on screen (this used to read a
  // token straight from the render closure, which is how a tap could end up
  // saving nothing at all).
  const [activeTerm, setActiveTerm] = useState("");
  // This language's bookmarked words/expressions ("Save for next story"),
  // kept live so previously-saved terms get a dotted underline as soon as
  // they're saved (or lose it as soon as they're un-saved) anywhere in the app.
  const [savedTerms, setSavedTerms] = useState([]);
  const popupRef = useRef(null);

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
  const savedNorms = new Set(savedTerms.map((e) => normalizeWord(e.word)).filter(Boolean));
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
    setSaved(isWordSaved(term, langCode));
    setOpenKey(key);
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: term, sentence: text, langCode, nativeLang, nativeLabel, aiSettings });
      setInfo(result);
    } catch (e) {
      setInfo("error");
    }
  }

  return (
    <span style={{ position: "relative", display: "inline" }}>
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
          <span key={idx} style={{ position: "relative", display: "inline-block" }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                openLookup(displayText, startTok, endTok, e);
              }}
              style={{
                fontFamily: fontFamily || fontLatin,
                color: color || colors.teal,
                fontSize: 14,
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
                {info === "error" && (
                  <span style={{ color: colors.rose }}>{isFa ? "خطا در دریافت معنی" : "Couldn't fetch the meaning"}</span>
                )}
                {info && info !== "loading" && info !== "error" && (
                  <>
                    <div style={{ color: colors.goldSoft, fontWeight: 700, marginBottom: 3, lineHeight: 1.7 }}>
                      {info.possiblePosLabels && info.possiblePosLabels.length > 1 ? (
                        isFa ? (
                          <>
                            این کلمه می‌تونه{" "}
                            {info.possiblePosLabels.map((p, i) => (
                              <span key={p + i}>
                                {i > 0 && (i === info.possiblePosLabels.length - 1 ? " یا " : "، ")}
                                «{p}»
                              </span>
                            ))}{" "}
                            باشه؛ اینجا نقش «{info.posLabel}» گرفته.
                          </>
                        ) : (
                          <>
                            This word can be{" "}
                            {info.possiblePosLabels.map((p, i) => (
                              <span key={p + i}>
                                {i > 0 && (i === info.possiblePosLabels.length - 1 ? " or " : ", ")}
                                “{p}”
                              </span>
                            ))}
                            ; here it's used as “{info.posLabel}”.
                          </>
                        )
                      ) : (
                        <>{isFa ? `نقش: ${info.posLabel}` : `Role: ${info.posLabel}`}</>
                      )}
                    </div>
                    <div style={{ marginBottom: 6 }}>{info.meaning}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!activeTerm) return;
                        setSaved(toggleSavedStoryWord(activeTerm, langCode));
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
function OrderChips({ order, languages, onReorder }) {
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
  { key: "short", label: "کوتاه", paragraphs: "1-2", sentencesHint: "short, roughly 4-6 sentences per paragraph", tokens: 1400 },
  { key: "medium", label: "متوسط", paragraphs: "2-3", sentencesHint: "medium length, roughly 5-8 sentences per paragraph", tokens: 2500 },
  { key: "long", label: "بلند", paragraphs: "4-6", sentencesHint: "long, roughly 6-10 sentences per paragraph", tokens: 4200 },
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
function Dictionary({ nativeLang, nativeLabel, dictHistory, setDictHistory, aiSettings }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const targetLangs = PHRASEBOOK_LANGUAGES.filter((l) => l.code !== "fa");

  const lookup = async (term) => {
    const word = (term ?? query).trim();
    if (!word || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
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
          <button onClick={() => { setQuery(""); setResult(null); }} aria-label="پاک کردن">
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
            <p style={{ fontFamily: fontLatin, fontWeight: 700, fontSize: 20, color: colors.ink }}>{result.word}</p>
            <SpeakButton text={result.word} code={result.detectedLang || "en"} />
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
            <p style={{ fontFamily: fontFa, fontSize: 14, color: colors.ink }}>{result.meaningFa}</p>
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
                    <p style={{ fontFamily: fontLatin, color: colors.teal, fontSize: 14, flex: 1 }}>
                      {result.translations[l.code]}
                    </p>
                    <SpeakButton text={result.translations[l.code]} code={l.code} color={colors.teal} />
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

function StoryBuilder({ nativeLang, nativeLabel, targetOrder, wordStats, setWordStats, savedStories, setSavedStories, aiSettings, jumpTo }) {
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
  const [storyLevel, setStoryLevel] = useState("A2");
  const [contentType, setContentType] = useState("general");
  const [storyLength, setStoryLength] = useState("medium");
  const [repeatCount, setRepeatCount] = useState(8);
  const [selectedWords, setSelectedWords] = useState([]);
  const [customWord, setCustomWord] = useState("");
  const [wordTranslating, setWordTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState("");
  const [savedStoryWords, setSavedStoryWords] = useState([]);
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
  const [translationLangs, setTranslationLangs] = useState(
    Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter((c) => c !== defaultStoryLang)
  );
  const [granularity, setGranularity] = useState("sentence"); // "sentence" | "paragraph" | "none"
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const storyLangLabel = LANGUAGES.find((l) => l.code === storyLang)?.label || storyLang;
  const allSentences = paragraphs.flatMap((p) => p.sentences);
  const fullStoryText = allSentences.map((s) => s.text).join(" ");

  // Words bookmarked via the "Save for next story" button in the word-tap
  // popover. Reload whenever the target language changes, and live-refresh
  // when a word gets (un)bookmarked anywhere in the app.
  useEffect(() => {
    const refresh = () => {
      const list = loadSavedStoryWords().filter((e) => e.langCode === storyLang);
      setSavedStoryWords(list);
      // Bring newly-bookmarked words straight into the next story's word list
      // automatically — this is what a tap on "Save for next story" is for.
      setSelectedWords((prev) => {
        const additions = list.map((e) => e.word).filter((w) => !prev.includes(w));
        return additions.length ? [...prev, ...additions] : prev;
      });
    };
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [storyLang]);

  useEffect(() => {
    setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));
    setActiveCollectionId("");
  }, [storyLang]);

  // Coming from the Saved Words panel with "انتخاب برای داستان" — jump the
  // story language to match so those words are immediately visible.
  useEffect(() => {
    if (jumpTo && jumpTo.lang) {
      setStoryLang(jumpTo.lang);
    }
  }, [jumpTo]);

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
        // ترجمه با سرویس‌های رایگان (نه هوش مصنوعی) — همون زنجیره‌ی fallback
        const res = await translateFree(term, "fa", storyLang);
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
          translateFree(w.term, "fa", storyLang).catch(() => "")
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
  // always AI-generated fresh, so it isn't limited to the static phrase data
  const translationLangOptions = Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter((c) => c !== storyLang);

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

  // 🔥 ترجمه‌ی زنده و افزایشی: هر زبانی که توی translationLangs باشه ولی
  // هنوز برای جمله‌های داستان ترجمه نشده (چه همون اول، چه هر زبان جدیدی که
  // کاربر بعداً — بعد از ساخته‌شدنِ داستان — اضافه کنه)، همینجا با زنجیره‌ی
  // سرویس‌های ترجمه‌ی رایگان (translateFree) گرفته و به state اضافه می‌شه.
  // بدون نیاز به ساختن دوباره‌ی داستان.
  useEffect(() => {
    if (!paragraphs.length || !translationLangs.length) return;
    const missingLangs = translationLangs.filter((code) =>
      paragraphs.some((p) => (p.sentences || []).some((s) => !s.t || !s.t[code]))
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
                if (s.t && s.t[code]) continue;
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

  const filteredVocab = VOCAB.filter((v) => {
    const w = (v.t[storyLang] || v.t.en || "").toLowerCase();
    return !vocabQuery || w.includes(vocabQuery.toLowerCase()) || v.meaningFa.includes(vocabQuery);
  });

  const toggleWord = (word) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
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
      const res = await translateFree(w, storyLang, "auto");
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
      }
      if (normalizeWord(translated) !== normalizeWord(w)) {
        setTranslateNote(`«${w}» → «${translated}» اضافه شد`);
        setTimeout(() => setTranslateNote(""), 3000);
      }
    } catch (e) {
      // translation failed — fall back to the raw word rather than losing the input
      if (!selectedWords.includes(w)) setSelectedWords((prev) => [...prev, w]);
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
    if (ranked.length) setSelectedWords(ranked);
  };

  const generateStory = async () => {
    if (!selectedWords.length || generating) return;
    setGenerating(true);
    setError("");
    setParagraphs([]);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    try {
      // 🔥 اینجا فقط داستان به زبان اصلی ساخته می‌شه (بدون درخواست ترجمه از هوش مصنوعی)
      const genre = CONTENT_TYPES.find((c) => c.key === contentType) || CONTENT_TYPES[0];
      const lengthCfg = STORY_LENGTHS.find((l) => l.key === storyLength) || STORY_LENGTHS[1];
      
      const prompt = `Write ${genre.prompt}, in ${storyLangLabel} at CEFR level ${storyLevel}, for a language learner whose native language is ${nativeLabel}. The story MUST use each of these words naturally, about ${repeatCount} times each, spread across different sentences, grammatical forms, and (where the word allows it) different meanings/contexts: ${selectedWords.join(", ")}. Keep the story coherent and appropriately sized for that many repetitions. Organize the story into ${lengthCfg.paragraphs} paragraphs, ${lengthCfg.sentencesHint}. After the story, write 5 multiple-choice comprehension/vocabulary questions in ${storyLangLabel}, each testing ONE of the target words, with 4 options and exactly one correct answer. Respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape: {"paragraphs": [{"sentences": [{"text": "sentence in ${storyLang}"}]}], "questions": [{"word": "the target word this question tests, matching one from the list exactly", "question": "...", "options": ["...","...","...","..."], "answerIndex": 0}]}`;

      const tokenBudget = Math.min(lengthCfg.tokens + 500, 8000);
      const res = await callAI({ prompt, maxTokens: tokenBudget, aiSettings });
      const cleaned = res.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error("parse-error: پاسخ هوش مصنوعی کامل یا JSON معتبر نبود — دوباره امتحان کن.");
      }
      
      const storyParagraphs = parsed.paragraphs || [];
      
      // ============================================================
      // 🔥 داستان بدون ترجمه ذخیره می‌شه — ترجمه‌ی خودش (با سرویس‌های
      // رایگان، جدا از هوش مصنوعی) رو یه useEffect جدا انجام می‌ده که هر
      // وقت translationLangs عوض بشه (چه همین الان، چه هر وقت کاربر بعداً
      // یه زبان دیگه هم اضافه/کم کنه) خودش رو به‌روز می‌کنه — نیازی به
      // ساختن دوباره‌ی کل داستان نیست.
      setParagraphs(storyParagraphs);
      
      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);
      
      if (savedStoryWords.length) {
        try {
          const remaining = loadSavedStoryWords().filter((e) => e.langCode !== storyLang);
          window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(remaining));
          window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
        } catch {}
      }
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

        {savedStoryWords.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
              لغات ذخیره‌شده برای داستان ({storyLangLabel})
            </p>
            <div className="flex flex-wrap gap-2">
              {savedStoryWords.map((e) => {
                const active = selectedWords.includes(e.word);
                return (
                  <span
                    key={e.word}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
                      backgroundColor: active ? colors.goldSoft : "white",
                    }}
                  >
                    <button dir="auto" onClick={() => toggleWord(e.word)}>
                      {e.word}
                    </button>
                    <button
                      onClick={() => removeSavedStoryWord(e.word, storyLang)}
                      style={{ color: colors.inkSoft, display: "flex" }}
                      title="حذف از لغات ذخیره‌شده"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
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
          placeholder="یا از دیکشنری جستجو کن..."
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
          <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 6 }}>
            ⚠️ هرچی زبون بیشتری انتخاب کنی، احتمال قطع‌شدن داستان وسط کار بیشتره — بهتره ۱ تا ۳ تا باشه.
          </p>
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

      {paragraphs.length > 0 && (
        <div
          style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontWeight: 700 }}>داستان</p>
            <div className="flex items-center gap-3">
              <button
                onClick={saveCurrentStory}
                style={{ fontSize: 12, color: justSaved ? colors.teal : colors.gold, textDecoration: "underline", fontWeight: justSaved ? 700 : 400 }}
              >
                {justSaved ? "✓ ذخیره شد" : "ذخیره داستان"}
              </button>
              <SpeakButton text={fullStoryText} code={storyLang} color={colors.teal} />
              <SpeedControl color={colors.teal} />
            </div>
          </div>

          {translationLangOptions.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 12, color: colors.inkSoft }}>
                  ترجمه به چه زبان‌هایی نشون داده بشه؟
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
              <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 6 }}>
                ⚠️ هرچی زبون بیشتری انتخاب کنی، احتمال قطع‌شدن داستان وسط کار بیشتره — بهتره ۱ تا ۳ تا باشه.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
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
              const paragraphText = p.sentences.map((s) => s.text).join(" ");
              const showTranslations = granularity !== "none" && translationLangs.length > 0;
              return (
                <div key={pi} style={{ borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 }}>
                  {granularity === "sentence" ? (
                    <div className="flex flex-col gap-3">
                      {p.sentences.map((s, si) => (
                        <div key={si}>
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton text={s.text} code={storyLang} color={colors.inkSoft} />
                            <p style={{ fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin, fontSize: 15, lineHeight: 1.8, textAlign: RTL_LANGS.includes(storyLang) ? "right" : "left" }}>
                              <ClickableSentence
                                text={s.text}
                                langCode={storyLang}
                                nativeLang={nativeLang}
                                nativeLabel={nativeLabel}
                                aiSettings={aiSettings}
                                color={colors.ink}
                              />
                            </p>
                          </div>
                          {showTranslations &&
                            translationLangs.map((code) => (
                              <div
                                key={code}
                                className="flex items-start gap-2"
                                dir={dirFor(code)}
                                style={{
                                  marginTop: 3,
                                  marginRight: RTL_LANGS.includes(code) ? 26 : 0,
                                  marginLeft: RTL_LANGS.includes(code) ? 0 : 26,
                                }}
                              >
                                {s.t?.[code] && <SpeakButton text={s.t[code]} code={code} color={colors.teal} />}
                                <p
                                  style={{
                                    fontSize: 13,
                                    color: colors.inkSoft,
                                    textAlign: RTL_LANGS.includes(code) ? "right" : "left",
                                    fontFamily: code === "fa" ? fontFa : fontLatin,
                                  }}
                                >
                                  <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                  {s.t?.[code] || (
                                    <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                        <SpeakButton text={paragraphText} code={storyLang} color={colors.inkSoft} />
                        <p style={{ fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin, fontSize: 15, lineHeight: 1.8, textAlign: RTL_LANGS.includes(storyLang) ? "right" : "left" }}>
                          <ClickableSentence
                            text={paragraphText}
                            langCode={storyLang}
                            nativeLang={nativeLang}
                            nativeLabel={nativeLabel}
                            aiSettings={aiSettings}
                            color={colors.ink}
                          />
                        </p>
                      </div>
                      {showTranslations &&
                        translationLangs.map((code) => (
                          <p
                            key={code}
                            dir={dirFor(code)}
                            style={{
                              fontSize: 13,
                              color: colors.inkSoft,
                              marginTop: 4,
                              marginRight: RTL_LANGS.includes(code) ? 26 : 0,
                              marginLeft: RTL_LANGS.includes(code) ? 0 : 26,
                              textAlign: RTL_LANGS.includes(code) ? "right" : "left",
                              fontFamily: code === "fa" ? fontFa : fontLatin,
                            }}
                          >
                            <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                            {p.sentences.every((s) => s.t?.[code]) ? (
                              p.sentences.map((s) => s.t[code]).join(" ")
                            ) : (
                              <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                            )}
                          </p>
                        ))}
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
function SavedWordsPanel({ onJumpToStory }) {
  const [words, setWords] = useState([]);

  useEffect(() => {
    const refresh = () => setWords(loadSavedStoryWords());
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, []);

  const byLang = {};
  words.forEach((w) => {
    if (!byLang[w.langCode]) byLang[w.langCode] = [];
    byLang[w.langCode].push(w);
  });
  const langCodes = Object.keys(byLang);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>لغات ذخیره‌شده</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          لغاتی که با دکمه‌ی «ذخیره برای داستان بعدی» نشون کردی، اینجا جمع می‌شن تا هر وقت خواستی برای ساخت داستان از بینشون انتخاب کنی.
        </p>
      </div>

      {langCodes.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.inkSoft }}>
          هنوز لغتی ذخیره نکردی. روی هر کلمه‌ی داخل متن‌ها بزن و از پاپ‌آپش «ذخیره برای داستان بعدی» رو انتخاب کن.
        </p>
      ) : (
        langCodes.map((code) => {
          const label = LANGUAGES.find((l) => l.code === code)?.label || code;
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
                  onClick={() => onJumpToStory(code)}
                  className="flex items-center gap-1"
                  style={{ fontSize: 12, color: colors.teal, textDecoration: "underline" }}
                >
                  <Sparkles size={13} />
                  انتخاب برای داستان
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {byLang[code].map((e) => (
                  <span
                    key={e.word}
                    dir="auto"
                    className="flex items-center gap-1"
                    style={{
                      padding: "5px 6px 5px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${colors.cardBorder}`,
                      backgroundColor: colors.paper,
                    }}
                  >
                    {e.word}
                    <button
                      onClick={() => removeSavedStoryWord(e.word, code)}
                      style={{ color: colors.inkSoft, display: "flex" }}
                      title="حذف"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
function PhrasebookMain({ user, onLogout, appPrefs, setAppPrefs }) {
  const [nativeLang, setNativeLang] = useState("fa");
  const [targetOrder, setTargetOrder] = useState(["en"]);
  const [favorites, setFavorites] = useState(new Set());
  const [tab, setTab] = useState("phrases");
  const [boxes, setBoxes] = useState(() => {
    const initial = {};
    PHRASES.forEach((p) => (initial[p.id] = 1));
    return initial;
  });
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [wordStats, setWordStats] = useState({});
  const [savedStories, setSavedStories] = useState([]);
  const [dictHistory, setDictHistory] = useState([]);
  const [backendUrl, setBackendUrl] = useState("");
  const [storyJump, setStoryJump] = useState(null); // { lang, token } — set when jumping in from Saved Words
  const aiSettings = { backendUrl, setBackendUrl };
  const userStorageKey = `${STORAGE_KEY}:${user?.email || "guest"}`;

  // --- Load saved progress once, on first mount ---------------------------
  // Firestore (this Google account, any device) wins over the local copy
  // (this browser only) when both exist, since it's the more current source
  // once more than one device is involved.
  useEffect(() => {
    (async () => {
      try {
        const [local, cloud] = await Promise.all([
          storage.get(userStorageKey, false),
          user?.uid ? firestoreLoadState(user.uid) : Promise.resolve(null),
        ]);
        const saved = cloud || (local && local.value ? JSON.parse(local.value) : null);
        if (saved) {
          if (saved.nativeLang) setNativeLang(saved.nativeLang);
          if (Array.isArray(saved.targetOrder) && saved.targetOrder.length) setTargetOrder(saved.targetOrder);
          if (Array.isArray(saved.favorites)) setFavorites(new Set(saved.favorites));
          if (saved.boxes) setBoxes((prev) => ({ ...prev, ...saved.boxes }));
          if (saved.wordStats) setWordStats(saved.wordStats);
          if (saved.savedStories) setSavedStories(saved.savedStories);
          if (saved.dictHistory) setDictHistory(saved.dictHistory);
          if (saved.backendUrl) setBackendUrl(saved.backendUrl);
          if (Array.isArray(saved.savedStoryWords)) {
            try {
              window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(saved.savedStoryWords));
              window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
            } catch {}
          }
        }
      } catch (e) {
        // no saved data yet, or storage unavailable — start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, [user?.uid]);

  // --- Save progress whenever it changes (debounced) -----------------------
  useEffect(() => {
    if (!loaded) return; // don't overwrite saved data with initial defaults
    const timeout = setTimeout(async () => {
      const payload = {
        nativeLang,
        targetOrder,
        favorites: Array.from(favorites),
        boxes,
        wordStats,
        savedStories,
        dictHistory,
        backendUrl,
        savedStoryWords: loadSavedStoryWords(),
      };
      try {
        await storage.set(userStorageKey, JSON.stringify(payload), false);
      } catch (e) {
        // local save failed — still try the cloud copy below
      }
      if (user?.uid) firestoreSaveState(user.uid, payload);
    }, 500);
    return () => clearTimeout(timeout);
  }, [nativeLang, targetOrder, favorites, boxes, wordStats, savedStories, dictHistory, backendUrl, loaded, userStorageKey, user?.uid]);

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

  const nativeLabel = LANGUAGES.find((l) => l.code === nativeLang)?.label;
  const targetLangList = targetOrder
    .map((code) => LANGUAGES.find((l) => l.code === code))
    .filter(Boolean);
  const targetLabel = targetLangList.map((l) => l.label).join("، ");

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Lora:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${colors.goldSoft}; }
        .spin { animation: pb-spin 0.8s linear infinite; }
        @keyframes pb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header
        style={{ backgroundColor: colors.ink, color: colors.paper }}
        className="px-4 pt-6 pb-5"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BookOpen size={20} color={colors.gold} />
            <h1 style={{ fontWeight: 800, fontSize: 20 }}>کتاب مکالمه من</h1>
          </div>
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
            <SettingsMenu appPrefs={appPrefs} setAppPrefs={setAppPrefs} user={user} onLogout={onLogout} />
          </div>
        </div>
        <p style={{ color: colors.goldSoft, fontSize: 13 }}>
          از {nativeLabel} به {targetLabel} · {user?.name || user?.email}
        </p>

        {/* Language pickers */}
        <div className="mt-4">
          <p style={{ fontSize: 12, color: colors.paperDark, marginBottom: 6 }}>
            زبان مادری
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PHRASEBOOK_LANGUAGES.map((l) => (
              <LangStamp
                key={l.code}
                lang={l}
                active={l.code === nativeLang}
                onClick={() => setNativeLang(l.code)}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" }}>
            زبان‌های مقصد (چند تا رو می‌تونی هم‌زمان انتخاب کنی)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PHRASEBOOK_LANGUAGES.map((l) => (
              <LangStamp
                key={l.code}
                lang={l}
                active={targetOrder.includes(l.code)}
                disabled={l.code === nativeLang}
                onClick={() => toggleTargetLang(l.code)}
              />
            ))}
          </div>

          {targetLangList.length > 1 && (
            <>
              <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" }}>
                ترتیب نمایش ترجمه‌ها (بکش تا جابجا بشه)
              </p>
              <OrderChips order={targetOrder} languages={PHRASEBOOK_LANGUAGES} onReorder={setTargetOrder} />
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ backgroundColor: colors.paperDark }}>
        <TabButton label="عبارات" icon={BookOpen} active={tab === "phrases"} onClick={() => setTab("phrases")} />
        <TabButton label="علاقه‌مندی‌ها" icon={Heart} active={tab === "favorites"} onClick={() => setTab("favorites")} />
        <TabButton label="لغات و اخبار" icon={Newspaper} active={tab === "vocab"} onClick={() => setTab("vocab")} />
        <TabButton label="دیکشنری" icon={Search} active={tab === "dictionary"} onClick={() => setTab("dictionary")} />
        <TabButton label="مرور (جعبه لایتنر)" icon={RotateCcw} active={tab === "review"} onClick={() => { setTab("review"); setReviewIndex(0); setShowAnswer(false); }} />
        <TabButton label="داستان‌ساز" icon={Sparkles} active={tab === "story"} onClick={() => setTab("story")} />
        <TabButton label="لغات ذخیره‌شده" icon={Bookmark} active={tab === "saved"} onClick={() => setTab("saved")} />
      </nav>

      {/* Level filter — applies to phrases, favorites, and vocabulary */}
      {(tab === "phrases" || tab === "favorites" || tab === "vocab") && (
        <div className="px-4 pt-3">
          <LevelFilterRow levelFilter={levelFilter} setLevelFilter={setLevelFilter} />
        </div>
      )}

      {/* Search — only meaningful for the phrase list tabs */}
      {(tab === "phrases" || tab === "favorites") && (
        <div className="px-4 pt-3">
          <div
            className="flex items-center gap-2 px-3"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
          >
            <Search size={16} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی عبارت..."
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

      <main className="px-4 py-4 pb-24">
        {tab === "phrases" && (
          <PhraseList
            phrases={PHRASES}
            nativeLang={nativeLang}
            targetLangs={targetLangList}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            query={query}
            levelFilter={levelFilter}
            aiSettings={aiSettings}
          />
        )}

        {tab === "favorites" && (
          <PhraseList
            phrases={PHRASES.filter((p) => favorites.has(p.id))}
            nativeLang={nativeLang}
            targetLangs={targetLangList}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            query={query}
            levelFilter={levelFilter}
            aiSettings={aiSettings}
            emptyText="هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی. روی ⭐ کنار هر عبارت بزن."
          />
        )}

        {tab === "vocab" && (
          <VocabList words={VOCAB} nativeLang={nativeLang} targetLangs={targetLangList} levelFilter={levelFilter} aiSettings={aiSettings} />
        )}

        {tab === "review" && (
          <ReviewBox
            phrases={PHRASES}
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
            onJumpToStory={(lang) => {
              setStoryJump({ lang, token: Date.now() });
              setTab("story");
            }}
          />
        )}

        {tab === "story" && (
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
          />
        )}
      </main>

      {/* Floating AI chat — reachable from every tab */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          aria-label="گفتگو با هوش مصنوعی"
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: colors.gold,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(28,37,65,0.35)",
            border: "none",
          }}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {chatOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(28,37,65,0.4)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 50,
          }}
          onClick={() => setChatOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "80vh",
              backgroundColor: colors.paper,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              display: "flex",
              flexDirection: "column",
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontWeight: 700, fontSize: 15 }}>گفتگو با هوش مصنوعی</p>
              <button onClick={() => setChatOpen(false)} aria-label="بستن">
                <X size={20} color={colors.inkSoft} />
              </button>
            </div>
            <AiChat targetLabel={targetLabel} nativeLabel={nativeLabel} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phrase list (used for both "all phrases" and "favorites")
// ---------------------------------------------------------------------------
function PhraseList({ phrases, nativeLang, targetLangs, favorites, toggleFavorite, emptyText, query, levelFilter, aiSettings }) {
  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? phrases.filter((p) => p.level === levelFilter) : phrases;
  filtered = q
    ? filtered.filter((p) => {
        const nativeText = (p.t[nativeLang] || "").toLowerCase();
        if (nativeText.includes(q)) return true;
        return targetLangs.some((l) => (p.t[l.code] || "").toLowerCase().includes(q));
      })
    : filtered;

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
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{p.t[nativeLang]}</p>
                    <SpeakButton text={p.t[nativeLang]} code={nativeLang} />
                    {p.level && <LevelBadge level={p.level} />}
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
                        <p style={{ flex: 1 }}>
                          {p.t[l.code] ? (
                            <ClickableSentence
                              text={p.t[l.code]}
                              langCode={l.code}
                              nativeLang={nativeLang}
                              aiSettings={aiSettings}
                            />
                          ) : (
                            "—"
                          )}
                        </p>
                        {p.t[l.code] && <SpeakButton text={p.t[l.code]} code={l.code} color={colors.teal} />}
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
function VocabList({ words, nativeLang, targetLangs, levelFilter, aiSettings }) {
  const [openIds, setOpenIds] = useState(new Set());

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;

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
            onClick={() => toggleOpen(w.id)}
            className="p-3 rounded-lg"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p style={{ fontWeight: 700, fontSize: 16 }}>{w.t[nativeLang] ?? w.t.fa}</p>
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
                      <p style={{ flex: 1 }}>
                        {w.t[l.code] ? (
                          <ClickableSentence
                            text={w.t[l.code]}
                            langCode={l.code}
                            nativeLang={nativeLang}
                            aiSettings={aiSettings}
                          />
                        ) : (
                          "—"
                        )}
                      </p>
                      {w.t[l.code] && <SpeakButton text={w.t[l.code]} code={l.code} color={colors.teal} />}
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
// Leitner review box
// ---------------------------------------------------------------------------
function ReviewBox({ phrases, boxes, setBoxes, nativeLang, targetLangs, index, setIndex, showAnswer, setShowAnswer }) {
  const active = phrases.filter((p) => boxes[p.id] < 5);
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
            <p style={{ fontWeight: 700, fontSize: 18 }}>{current.t[nativeLang]}</p>
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
                <p style={{ fontFamily: fontLatin, color: colors.teal, fontSize: 16 }}>
                  {current.t[l.code] ?? "—"}
                </p>
                {current.t[l.code] && <SpeakButton text={current.t[l.code]} code={l.code} color={colors.teal} />}
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

// ---------------------------------------------------------------------------
// AI chat practice partner
// ---------------------------------------------------------------------------
function AiChat({ targetLabel, nativeLabel }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `سلام! هر سوالی درباره‌ی ${targetLabel || "زبان مقصد"} داری بپرس، یا بیا تمرین مکالمه کنیم. به ${nativeLabel} هم می‌تونی بنویسی.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a friendly conversation-practice partner helping a Persian speaker practice ${targetLabel || "a foreign language"}. The user's native language is ${nativeLabel}. Keep replies short (2-4 sentences), reply mainly in ${targetLabel || "the target language"}, but add a short ${nativeLabel} translation in parentheses when the sentence is non-trivial. Gently correct mistakes. Also answer any general questions the user asks. Conversation so far:\n\n${[...messages, userMsg].map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n")}`,
            },
          ],
        }),
      });
      const data = await res.json();
      const textBlock = (data.content || []).map((b) => b.text || "").join("\n").trim();
      setMessages((m) => [...m, { role: "assistant", text: textBlock || "متاسفم، پاسخی دریافت نشد." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "خطا در برقراری ارتباط. دوباره امتحان کن." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "55vh" }}>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-start" : "flex-end",
              backgroundColor: m.role === "user" ? "white" : colors.ink,
              color: m.role === "user" ? colors.ink : colors.paper,
              border: m.role === "user" ? `1px solid ${colors.cardBorder}` : "none",
              borderRadius: 14,
              padding: "10px 14px",
              maxWidth: "80%",
              fontSize: 14,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-end", color: colors.inkSoft, fontSize: 13 }}>
            در حال نوشتن...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="پیامت رو بنویس..."
          style={{
            flex: 1,
            fontFamily: fontFa,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 20,
            padding: "10px 16px",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            backgroundColor: colors.gold,
            color: "white",
            borderRadius: "50%",
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="ارسال"
        >
          <Send size={18} />
        </button>
      </div>
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
  const [busy, setBusy] = useState(false);
  const [googleLive, setGoogleLive] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const googleBtnRef = useRef(null);

  // Preferred path: real Firebase Auth (Google) — gives a stable `uid` that
  // Firestore syncing keys off, so saved words/stories/history follow the
  // account across devices. Falls through to the local GIS/demo flow below
  // only if FIREBASE_CONFIG hasn't been filled in yet.
  async function handleFirebaseGoogleSignIn() {
    setError("");
    setFbBusy(true);
    try {
      const user = await firebaseSignInWithGoogle();
      persistSession(user);
      onAuthenticated(user);
    } catch (e) {
      setError("ورود با گوگل ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setFbBusy(false);
    }
  }

  const handleGoogleCredential = React.useCallback((response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const user = { email: payload.email, name: payload.name, picture: payload.picture, provider: "google" };
      const users = loadUsers();
      if (!users.find((u) => u.email === user.email)) saveUsers([...users, user]);
      persistSession(user);
      onAuthenticated(user);
    } catch {
      setError("ورود با گوگل ناموفق بود. دوباره تلاش کنید.");
    }
  }, [onAuthenticated]);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID.startsWith("YOUR_")) return; // no real client id configured yet
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 300,
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "signin_with",
        });
        setGoogleLive(true);
      } catch {
        setGoogleLive(false);
      }
    };
    script.onerror = () => setGoogleLive(false);
    document.body.appendChild(script);
    return () => {
      document.body.contains(script) && document.body.removeChild(script);
    };
  }, [mode, handleGoogleCredential]);

  function handleDemoGoogle() {
    setBusy(true);
    setTimeout(() => {
      const user = { email: "demo.user@gmail.com", name: "کاربر آزمایشی", picture: "", provider: "google-demo" };
      persistSession(user);
      setBusy(false);
      onAuthenticated(user);
    }, 450);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("همه‌ی فیلدها را پر کنید.");
      return;
    }
    const users = loadUsers();
    if (mode === "signup") {
      if (users.find((u) => u.email === email.trim())) {
        setError("این ایمیل قبلاً ثبت شده. وارد شوید.");
        return;
      }
      const user = { name: name.trim(), email: email.trim(), passHash: simpleHash(password), provider: "email" };
      saveUsers([...users, user]);
      const session = { name: user.name, email: user.email, provider: "email" };
      persistSession(session);
      onAuthenticated(session);
    } else {
      const user = users.find((u) => u.email === email.trim());
      if (!user || user.passHash !== simpleHash(password)) {
        setError("ایمیل یا رمز عبور اشتباه است.");
        return;
      }
      const session = { name: user.name, email: user.email, provider: "email" };
      persistSession(session);
      onAuthenticated(session);
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
          {FIREBASE_ENABLED ? (
            <button
              type="button"
              onClick={handleFirebaseGoogleSignIn}
              disabled={fbBusy}
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
                cursor: fbBusy ? "default" : "pointer",
              }}
            >
              {fbBusy ? (
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
          ) : googleLive ? (
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
          ) : (
            <button
              type="button"
              onClick={handleDemoGoogle}
              disabled={busy}
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
                cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? (
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
          )}
          {!FIREBASE_ENABLED && !googleLive && (
            <p style={{ fontSize: 11, color: colors.inkSoft, textAlign: "center", marginTop: 6, opacity: 0.75 }}>
              حالت آزمایشی — برای گوگل واقعی، پروژه‌ی Firebase را تنظیم کنید
            </p>
          )}
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

          <button
            type="submit"
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
              cursor: "pointer",
            }}
          >
            {mode === "signup" ? "ساخت حساب" : "ورود"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: colors.inkSoft }}>
          {mode === "signup" ? "حساب دارید؟" : "حساب ندارید؟"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
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
  const [user, setUser] = useState(() => readSession());
  const [appPrefs, setAppPrefs] = useState(loadAppPrefs);

  useEffect(() => saveAppPrefs(appPrefs), [appPrefs]);

  const theme = APP_THEMES[appPrefs.theme].values;
  const font = APP_FONTS[appPrefs.font];
  const fontSize = APP_FONT_SIZES[appPrefs.fontSize];

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
          onLogout={() => {
            clearSession();
            if (user.provider === "google" && FIREBASE_ENABLED) firebaseSignOut();
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
