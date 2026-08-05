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
  let currentAudio = null; // 🔥 برای پخش صدای Google TTS
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

  // 🔥 تابع جدید برای پخش صدا
  function speakFromWord(i, forceRestart = false) {
    const clamped = Math.min(Math.max(i, 0), Math.max(words.length - 1, 0));
    if (!words.length) {
      status = "idle";
      notify();
      return;
    }

    // حالت مکث (ادامه از همان کلمه)
    if (status === "paused" && !forceRestart) {
      const baseOffset = words[wordIndex].start;
      segmentStartOffset = baseOffset;
      segmentStartTime = Date.now();
      boundaryFired = false;
      status = "playing";
      notify();
      
      const segment = fullText.slice(baseOffset);
      const encodedText = encodeURIComponent(segment);
      const ttsLang = locale.split('-')[0] === 'fa' ? 'fa-IR' : locale; 
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodedText}`;
      
      currentAudio = new Audio(audioUrl);
      currentAudio.play().catch(() => {
        // اگر Google کار نکرد، TTS گوشی
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
        window.speechSynthesis.speak(utter);
      });
      
      return;
    }

    // شروع از اول یا کلمه‌ی مشخص
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
    const encodedText = encodeURIComponent(segment);
    const ttsLang = locale.split('-')[0] === 'fa' ? 'fa-IR' : locale; 
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodedText}`;
    
    currentAudio = new Audio(audioUrl);
    currentAudio.play().catch(() => {
      // اگر Google کار نکرد، TTS گوشی
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
      window.speechSynthesis.speak(utter);
    });
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
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.currentTime = 0;
              currentAudio = null;
            }
          } catch (e) {}
          status = "paused";
          notify();
          return "ok";
        }
        
        // اگر در حالت مکث است و دکمه زده شده، ادامه بده
        if (key === newKey && status === "paused") {
          status = "playing";
          // اگر صدای Google از قبل وجود دارد، ادامه بده
          if (currentAudio) {
            currentAudio.play();
          } else {
            // اگر نه، از کلمه‌ی فعلی شروع کن
            speakFromWord(wordIndex, false);
          }
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
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          currentAudio = null;
        }
      } catch (e) {}
      key = null;
      words = [];
      status = "idle";
      wordIndex = 0;
      boundaryFired = false;
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

const PHRASES = [
  {id:1,category:"greetings",level:"A1",t:{fa:"سلام",en:"Hello",de:"Hallo",es:"Hola",fr:"Bonjour",ar:"مرحبًا",tr:"Merhaba",zh:"你好"}},
  {id:2,category:"greetings",level:"A1",t:{fa:"سلام صبح بخیر",en:"Good morning",de:"Guten Morgen",es:"Buenos días",fr:"Bonjour",ar:"صباح الخير",tr:"Günaydın",zh:"早上好"}},
  {id:3,category:"greetings",level:"A1",t:{fa:"سلام عصر بخیر",en:"Good afternoon",de:"Guten Tag",es:"Buenas tardes",fr:"Bon après-midi",ar:"مساء الخير",tr:"İyi günler",zh:"下午好"}},
  {id:4,category:"greetings",level:"A1",t:{fa:"سلام شب بخیر",en:"Good evening",de:"Guten Abend",es:"Buenas noches",fr:"Bonsoir",ar:"مساء الخير",tr:"İyi akşamlar",zh:"晚上好"}},
  {id:5,category:"greetings",level:"A1",t:{fa:"شب بخیر",en:"Good night",de:"Gute Nacht",es:"Buenas noches",fr:"Bonne nuit",ar:"تصبح على خير",tr:"İyi geceler",zh:"晚安"}},
  {id:6,category:"greetings",level:"A1",t:{fa:"خداحافظ",en:"Goodbye",de:"Auf Wiedersehen",es:"Adiós",fr:"Au revoir",ar:"مع السلامة",tr:"Hoşça kal",zh:"再见"}},
  {id:7,category:"greetings",level:"A1",t:{fa:"بای",en:"Bye",de:"Tschüss",es:"Chao",fr:"Salut",ar:"باي",tr:"Bay bay",zh:"拜拜"}},
  {id:8,category:"greetings",level:"A1",t:{fa:"فردا می‌بینمت",en:"See you tomorrow",de:"Bis morgen",es:"Hasta mañana",fr:"À demain",ar:"أراك غدًا",tr:"Yarın görüşürüz",zh:"明天见"}},
  {id:9,category:"greetings",level:"A1",t:{fa:"بعداً می‌بینمت",en:"See you later",de:"Bis später",es:"Hasta luego",fr:"À plus tard",ar:"أراك لاحقًا",tr:"Sonra görüşürüz",zh:"回头见"}},
  {id:10,category:"greetings",level:"A1",t:{fa:"خوشحالم که آشنا شدیم",en:"Nice to meet you",de:"Freut mich, dich kennenzulernen",es:"Encantado de conocerte",fr:"Enchanté",ar:"تشرفت بمعرفتك",tr:"Tanıştığıma memnun oldum",zh:"很高兴认识你"}},
  {id:11,category:"greetings",level:"A1",t:{fa:"ممنون",en:"Thank you",de:"Danke",es:"Gracias",fr:"Merci",ar:"شكرًا",tr:"Teşekkür ederim",zh:"谢谢"}},
  {id:12,category:"greetings",level:"A1",t:{fa:"خیلی ممنون",en:"Thank you very much",de:"Vielen Dank",es:"Muchas gracias",fr:"Merci beaucoup",ar:"شكرًا جزيلًا",tr:"Çok teşekkür ederim",zh:"非常感谢"}},
  {id:13,category:"greetings",level:"A1",t:{fa:"ممنونم ازت",en:"Thanks",de:"Danke schön",es:"Gracias",fr:"Merci bien",ar:"شكرًا لك",tr:"Teşekkürler",zh:"谢谢"}},
  {id:14,category:"greetings",level:"A1",t:{fa:"خیلی لطف کردی",en:"Thanks a lot",de:"Danke schön",es:"Muchísimas gracias",fr:"Merci beaucoup",ar:"شكرًا جزيلًا",tr:"Çok sağ ol",zh:"多谢"}},
  {id:15,category:"greetings",level:"A1",t:{fa:"از لطفت ممنونم",en:"Thank you for your kindness",de:"Danke für deine Freundlichkeit",es:"Gracias por tu amabilidad",fr:"Merci pour ta gentillesse",ar:"شكرًا على لطفك",tr:"Nazikliğin için teşekkürler",zh:"谢谢你的好意"}},
  {id:16,category:"greetings",level:"A1",t:{fa:"ممنون بابت کمکت",en:"Thank you for your help",de:"Danke für deine Hilfe",es:"Gracias por tu ayuda",fr:"Merci pour ton aide",ar:"شكرًا على مساعدتك",tr:"Yardımın için teşekkürler",zh:"谢谢你的帮助"}},
  {id:17,category:"greetings",level:"A1",t:{fa:"ممنون بابت غذا",en:"Thank you for the food",de:"Danke für das Essen",es:"Gracias por la comida",fr:"Merci pour le repas",ar:"شكرًا على الطعام",tr:"Yemek için teşekkürler",zh:"谢谢你的食物"}},
  {id:18,category:"greetings",level:"A1",t:{fa:"ممنون بابت هدیه",en:"Thank you for the gift",de:"Danke für das Geschenk",es:"Gracias por el regalo",fr:"Merci pour le cadeau",ar:"شكرًا على الهدية",tr:"Hediye için teşekkürler",zh:"谢谢你的礼物"}},
  {id:19,category:"greetings",level:"A1",t:{fa:"ممنون بابت زمانت",en:"Thank you for your time",de:"Danke für deine Zeit",es:"Gracias por tu tiempo",fr:"Merci pour ton temps",ar:"شكرًا على وقتك",tr:"Zamanın için teşekkürler",zh:"谢谢你的时间"}},
  {id:20,category:"greetings",level:"A1",t:{fa:"لطفاً",en:"Please",de:"Bitte",es:"Por favor",fr:"S'il vous plaît",ar:"من فضلك",tr:"Lütfen",zh:"请"}},
  {id:21,category:"greetings",level:"A1",t:{fa:"لطفاً یک لیوان آب",en:"A glass of water, please",de:"Ein Glas Wasser, bitte",es:"Un vaso de agua, por favor",fr:"Un verre d'eau, s'il vous plaît",ar:"كوب ماء، من فضلك",tr:"Bir bardak su, lütfen",zh:"请给我一杯水"}},
  {id:22,category:"greetings",level:"A1",t:{fa:"لطفاً کمکم کن",en:"Please help me",de:"Bitte hilf mir",es:"Por favor, ayúdame",fr:"Aidez-moi, s'il vous plaît",ar:"من فضلك ساعدني",tr:"Lütfen bana yardım et",zh:"请帮帮我"}},
  {id:23,category:"greetings",level:"A1",t:{fa:"لطفاً تکرار کن",en:"Please repeat",de:"Bitte wiederholen",es:"Por favor, repite",fr:"Répétez, s'il vous plaît",ar:"من فضلك كرر",tr:"Lütfen tekrarla",zh:"请重复"}},
  {id:24,category:"greetings",level:"A1",t:{fa:"لطفاً آهسته‌تر صحبت کن",en:"Please speak slower",de:"Bitte sprich langsamer",es:"Por favor, habla más despacio",fr:"Parlez plus lentement, s'il vous plaît",ar:"من فضلك تكلم ببطء",tr:"Lütfen daha yavaş konuş",zh:"请说慢一点"}},
  {id:25,category:"greetings",level:"A1",t:{fa:"لطفاً بنویس",en:"Please write it",de:"Bitte schreib es auf",es:"Por favor, escríbelo",fr:"Écrivez-le, s'il vous plaît",ar:"من فضلك اكتبها",tr:"Lütfen yaz",zh:"请写下来"}},
  {id:26,category:"greetings",level:"A1",t:{fa:"لطفاً بخون",en:"Please read it",de:"Bitte lies es vor",es:"Por favor, léelo",fr:"Lisez-le, s'il vous plaît",ar:"من فضلك اقرأها",tr:"Lütfen oku",zh:"请读一下"}},
  {id:27,category:"greetings",level:"A1",t:{fa:"لطفاً بگو",en:"Please say it",de:"Bitte sag es",es:"Por favor, dilo",fr:"Dites-le, s'il vous plaît",ar:"من فضلك قلها",tr:"Lütfen söyle",zh:"请说一下"}},
  {id:28,category:"greetings",level:"A1",t:{fa:"لطفاً نشون بده",en:"Please show me",de:"Bitte zeig mir",es:"Por favor, muéstrame",fr:"Montrez-moi, s'il vous plaît",ar:"من فضلك أرني",tr:"Lütfen göster",zh:"请给我看"}},
  {id:29,category:"greetings",level:"A1",t:{fa:"ببخشید",en:"Excuse me",de:"Entschuldigung",es:"Disculpe",fr:"Excusez-moi",ar:"عذرًا",tr:"Özür dilerim",zh:"打扰一下"}},
  {id:30,category:"greetings",level:"A1",t:{fa:"متأسفم",en:"I'm sorry",de:"Es tut mir leid",es:"Lo siento",fr:"Je suis désolé",ar:"أنا آسف",tr:"Üzgünüm",zh:"对不起"}},
  {id:31,category:"greetings",level:"A1",t:{fa:"ببخشید، نفهمیدم",en:"Sorry, I don't understand",de:"Entschuldigung, ich verstehe nicht",es:"Lo siento, no entiendo",fr:"Désolé, je ne comprends pas",ar:"عذرًا، لا أفهم",tr:"Özür dilerim, anlamıyorum",zh:"对不起，我不明白"}},
  {id:32,category:"greetings",level:"A1",t:{fa:"ببخشید، دیر کردم",en:"Sorry I'm late",de:"Entschuldigung, ich bin zu spät",es:"Perdón por llegar tarde",fr:"Désolé d'être en retard",ar:"عذرًا على التأخر",tr:"Özür dilerim, geciktim",zh:"对不起我迟到了"}},
  {id:33,category:"greetings",level:"A1",t:{fa:"مشکلی نیست",en:"No problem",de:"Kein Problem",es:"No hay problema",fr:"Pas de problème",ar:"لا مشكلة",tr:"Sorun değil",zh:"没问题"}},
  {id:34,category:"greetings",level:"A1",t:{fa:"اشکال نداره",en:"It's okay",de:"Schon gut",es:"Está bien",fr:"Ça va",ar:"لا بأس",tr:"Sorun yok",zh:"没关系"}},
  {id:35,category:"greetings",level:"A1",t:{fa:"بخشیده شو",en:"Forgive me",de:"Verzeih mir",es:"Perdóname",fr:"Pardonne-moi",ar:"سامحني",tr:"Beni affet",zh:"原谅我"}},
  {id:36,category:"greetings",level:"A1",t:{fa:"حالت چطوره؟",en:"How are you?",de:"Wie geht es dir?",es:"¿Cómo estás?",fr:"Comment ça va ?",ar:"كيف حالك؟",tr:"Nasılsın?",zh:"你好吗？"}},
  {id:37,category:"greetings",level:"A1",t:{fa:"حالت خوبه؟",en:"Are you okay?",de:"Geht es dir gut?",es:"¿Estás bien?",fr:"Ça va bien ?",ar:"هل أنت بخير؟",tr:"İyi misin?",zh:"你还好吗？"}},
  {id:38,category:"greetings",level:"A1",t:{fa:"من خوبم، ممنون",en:"I'm fine, thanks",de:"Mir geht's gut, danke",es:"Estoy bien, gracias",fr:"Je vais bien, merci",ar:"أنا بخير، شكرًا",tr:"İyiyim, teşekkürler",zh:"我很好，谢谢"}},
  {id:39,category:"greetings",level:"A1",t:{fa:"خوبم",en:"I'm good",de:"Mir geht's gut",es:"Estoy bien",fr:"Je vais bien",ar:"أنا بخير",tr:"İyiyim",zh:"我很好"}},
  {id:40,category:"greetings",level:"A1",t:{fa:"نه خیلی خوب",en:"Not so good",de:"Nicht so gut",es:"No tan bien",fr:"Pas très bien",ar:"ليس جيدًا جدًا",tr:"Çok iyi değilim",zh:"不太好"}},
  {id:41,category:"greetings",level:"A1",t:{fa:"خسته‌ام",en:"I'm tired",de:"Ich bin müde",es:"Estoy cansado",fr:"Je suis fatigué",ar:"أنا متعب",tr:"Yorgunum",zh:"我累了"}},
  {id:42,category:"greetings",level:"A1",t:{fa:"خوشحالم",en:"I'm happy",de:"Ich bin glücklich",es:"Estoy feliz",fr:"Je suis heureux",ar:"أنا سعيد",tr:"Mutluyum",zh:"我很高兴"}},
  {id:43,category:"greetings",level:"A1",t:{fa:"ناراحتم",en:"I'm sad",de:"Ich bin traurig",es:"Estoy triste",fr:"Je suis triste",ar:"أنا حزين",tr:"Üzgünüm",zh:"我很难过"}},
  {id:44,category:"greetings",level:"A1",t:{fa:"گرسم",en:"I'm hungry",de:"Ich habe Hunger",es:"Tengo hambre",fr:"J'ai faim",ar:"أنا جائع",tr:"Açım",zh:"我饿了"}},
  {id:45,category:"greetings",level:"A1",t:{fa:"تنهم",en:"I'm thirsty",de:"Ich habe Durst",es:"Tengo sed",fr:"J'ai soif",ar:"أنا عطشان",tr:"Susadım",zh:"我渴了"}},
  {id:46,category:"greetings",level:"A1",t:{fa:"خوابم میاد",en:"I'm sleepy",de:"Ich bin schläfrig",es:"Tengo sueño",fr:"J'ai sommeil",ar:"أنا نعسان",tr:"Uykum var",zh:"我困了"}},
  {id:47,category:"greetings",level:"A1",t:{fa:"سردمه",en:"I'm cold",de:"Mir ist kalt",es:"Tengo frío",fr:"J'ai froid",ar:"أنا بارد",tr:"Üşüyorum",zh:"我冷"}},
  {id:48,category:"greetings",level:"A1",t:{fa:"گرممه",en:"I'm hot",de:"Mir ist heiß",es:"Tengo calor",fr:"J'ai chaud",ar:"أنا حار",tr:"Sıcak basıyor",zh:"我热"}},
  {id:49,category:"greetings",level:"A1",t:{fa:"اسم من علیه",en:"My name is Ali",de:"Ich heiße Ali",es:"Me llamo Ali",fr:"Je m'appelle Ali",ar:"اسمي علي",tr:"Benim adım Ali",zh:"我叫阿里"}},
  {id:50,category:"greetings",level:"A1",t:{fa:"اسمت چیه؟",en:"What's your name?",de:"Wie heißt du?",es:"¿Cómo te llamas?",fr:"Comment tu t'appelles ?",ar:"ما اسمك؟",tr:"Senin adın ne?",zh:"你叫什么名字？"}},
  {id:51,category:"greetings",level:"A1",t:{fa:"من از ایرانم",en:"I'm from Iran",de:"Ich komme aus dem Iran",es:"Soy de Irán",fr:"Je viens d'Iran",ar:"أنا من إيران",tr:"İranlıyım",zh:"我来自伊朗"}},
  {id:52,category:"greetings",level:"A1",t:{fa:"تو از کجایی؟",en:"Where are you from?",de:"Woher kommst du?",es:"¿De dónde eres?",fr:"D'où viens-tu ?",ar:"من أين أنت؟",tr:"Nerelisin?",zh:"你来自哪里？"}},
  {id:53,category:"greetings",level:"A1",t:{fa:"من دانشجوم",en:"I'm a student",de:"Ich bin Student",es:"Soy estudiante",fr:"Je suis étudiant",ar:"أنا طالب",tr:"Ben öğrenciyim",zh:"我是学生"}},
  {id:54,category:"greetings",level:"A1",t:{fa:"شغلم معلم بودنه",en:"I'm a teacher",de:"Ich bin Lehrer",es:"Soy profesor",fr:"Je suis professeur",ar:"أنا معلم",tr:"Ben öğretmenim",zh:"我是老师"}},
  {id:55,category:"greetings",level:"A1",t:{fa:"من پزشکم",en:"I'm a doctor",de:"Ich bin Arzt",es:"Soy médico",fr:"Je suis médecin",ar:"أنا طبيب",tr:"Ben doktorum",zh:"我是医生"}},
  {id:56,category:"greetings",level:"A1",t:{fa:"من مهندسم",en:"I'm an engineer",de:"Ich bin Ingenieur",es:"Soy ingeniero",fr:"Je suis ingénieur",ar:"أنا مهندس",tr:"Ben mühendisim",zh:"我是工程师"}},
  {id:57,category:"greetings",level:"A1",t:{fa:"شغلت چیه؟",en:"What do you do?",de:"Was machst du beruflich?",es:"¿A qué te dedicas?",fr:"Que fais-tu dans la vie ?",ar:"ما عملك؟",tr:"Ne iş yapıyorsun?",zh:"你是做什么的？"}},
  {id:58,category:"greetings",level:"A1",t:{fa:"چند سالته؟",en:"How old are you?",de:"Wie alt bist du?",es:"¿Cuántos años tienes?",fr:"Quel âge as-tu ?",ar:"كم عمرك؟",tr:"Kaç yaşındasın?",zh:"你多大了？"}},
  {id:59,category:"greetings",level:"A1",t:{fa:"من بیست و پنج سالمه",en:"I'm twenty-five",de:"Ich bin fünfundzwanzig",es:"Tengo veinticinco años",fr:"J'ai vingt-cinq ans",ar:"عمري خمس وعشرون",tr:"Yirmi beş yaşındayım",zh:"我二十五岁"}},
  {id:60,category:"greetings",level:"A1",t:{fa:"من مجردم",en:"I'm single",de:"Ich bin ledig",es:"Soy soltero",fr:"Je suis célibataire",ar:"أنا أعزب",tr:"Ben bekarım",zh:"我单身"}},
  {id:61,category:"greetings",level:"A1",t:{fa:"من متاهلم",en:"I'm married",de:"Ich bin verheiratet",es:"Estoy casado",fr:"Je suis marié",ar:"أنا متزوج",tr:"Ben evliyim",zh:"我结婚了"}},
  {id:62,category:"greetings",level:"A1",t:{fa:"صاحب فرزندم",en:"I have children",de:"Ich habe Kinder",es:"Tengo hijos",fr:"J'ai des enfants",ar:"لدي أطفال",tr:"Çocuğum var",zh:"我有孩子"}},
  {id:63,category:"greetings",level:"A1",t:{fa:"خیلی خوشحالم که می‌بینمت",en:"I'm very happy to see you",de:"Ich freue mich sehr, dich zu sehen",es:"Estoy muy feliz de verte",fr:"Je suis très content de te voir",ar:"أنا سعيد جدًا برؤيتك",tr:"Seni gördüğüme çok sevindim",zh:"见到你我很高兴"}},
  {id:64,category:"airport",level:"A1",t:{fa:"بلیطم رو کجا باید نشون بدم؟",en:"Where should I show my ticket?",de:"Wo soll ich mein Ticket zeigen?",es:"¿Dónde debo mostrar mi boleto?",fr:"Où dois-je montrer mon billet ?",ar:"أين يجب أن أعرض تذكرتي؟",tr:"Biletimi nerede göstermeliyim?",zh:"我应该在哪里出示我的机票？"}},
  {id:65,category:"airport",level:"A1",t:{fa:"پروازم به کدوم گیته؟",en:"Which gate is my flight?",de:"An welchem Gate ist mein Flug?",es:"¿En qué puerta está mi vuelo?",fr:"À quelle porte est mon vol ?",ar:"ما هي بوابة رحلتي؟",tr:"Uçuşum hangi kapıda?",zh:"我的航班在哪个登机口？"}},
  {id:66,category:"airport",level:"A1",t:{fa:"پروازم چه موقعه؟",en:"When is my flight?",de:"Wann ist mein Flug?",es:"¿Cuándo es mi vuelo?",fr:"Quand est mon vol ?",ar:"متى رحلتي؟",tr:"Uçuşum ne zaman?",zh:"我的航班什么时候？"}},
  {id:67,category:"airport",level:"A1",t:{fa:"پروازم تاخیر داره؟",en:"Is my flight delayed?",de:"Ist mein Flug verspätet?",es:"¿Mi vuelo está retrasado?",fr:"Mon vol est-il retardé ?",ar:"هل رحلتي متأخرة؟",tr:"Uçuşum gecikti mi?",zh:"我的航班延误了吗？"}},
  {id:68,category:"airport",level:"A1",t:{fa:"می‌خوام چک‌این کنم",en:"I want to check in",de:"Ich möchte einchecken",es:"Quiero hacer el check-in",fr:"Je veux m'enregistrer",ar:"أريد تسجيل الوصول",tr:"Check-in yapmak istiyorum",zh:"我想办理登机手续"}},
  {id:69,category:"airport",level:"A1",t:{fa:"می‌خوام پنجره‌ای بگیرم",en:"I'd like a window seat",de:"Ich hätte gerne einen Fensterplatz",es:"Quisiera un asiento de ventanilla",fr:"Je voudrais un siège côté fenêtre",ar:"أريد مقعدًا بجانب النافذة",tr:"Pencere kenarı istiyorum",zh:"我想要靠窗的座位"}},
  {id:70,category:"airport",level:"A1",t:{fa:"می‌خوام راهرو بگیرم",en:"I'd like an aisle seat",de:"Ich hätte gerne einen Gangplatz",es:"Quisiera un asiento de pasillo",fr:"Je voudrais un siège côté couloir",ar:"أريد مقعدًا بجانب الممر",tr:"Koridor kenarı istiyorum",zh:"我想要靠过道的座位"}},
  {id:71,category:"airport",level:"A1",t:{fa:"کیف دستیم رو کجا بذارم؟",en:"Where do I put my carry-on?",de:"Wo stelle ich mein Handgepäck ab?",es:"¿Dónde pongo mi equipaje de mano?",fr:"Où je mets mon bagage à main ?",ar:"أين أضع حقيبة يدي؟",tr:"El bagajımı nereye koymalıyım?",zh:"我的手提行李放哪里？"}},
  {id:72,category:"airport",level:"A1",t:{fa:"این کیفم رو باید تحویل بدم؟",en:"Do I need to check this bag?",de:"Muss ich diese Tasche aufgeben?",es:"¿Necesito facturar esta maleta?",fr:"Dois-je enregistrer ce sac ?",ar:"هل أحتاج لتسجيل هذه الحقيبة؟",tr:"Bu çantayı teslim etmem mi gerekiyor?",zh:"我需要托运这个包吗？"}},
  {id:73,category:"airport",level:"A1",t:{fa:"وزن مجاز چنده؟",en:"What's the weight limit?",de:"Wie hoch ist das Gewichtslimit?",es:"¿Cuál es el límite de peso?",fr:"Quelle est la limite de poids ?",ar:"ما هو الحد الأقصى للوزن؟",tr:"Ağırlık sınırı nedir?",zh:"重量限制是多少？"}},
  {id:74,category:"airport",level:"A1",t:{fa:"پاسپورتم رو گم کردم",en:"I lost my passport",de:"Ich habe meinen Pass verloren",es:"Perdí mi pasaporte",fr:"J'ai perdu mon passeport",ar:"فقدت جواز سفري",tr:"Pasaportumu kaybettim",zh:"我丢了护照"}},
  {id:75,category:"airport",level:"A1",t:{fa:"ویزام رو کجا باید نشون بدم؟",en:"Where do I show my visa?",de:"Wo muss ich mein Visum zeigen?",es:"¿Dónde debo mostrar mi visa?",fr:"Où dois-je montrer mon visa ?",ar:"أين يجب أن أعرض تأشيرتي؟",tr:"Vizemi nerede göstermeliyim?",zh:"我应该在哪里出示签证？"}},
  {id:76,category:"airport",level:"A1",t:{fa:"گمرک کجاست؟",en:"Where is customs?",de:"Wo ist der Zoll?",es:"¿Dónde está la aduana?",fr:"Où sont les douanes ?",ar:"أين الجمارك؟",tr:"Gümrük nerede?",zh:"海关在哪里？"}},
  {id:77,category:"airport",level:"A1",t:{fa:"ترانزیت کجاست؟",en:"Where is transit?",de:"Wo ist der Transit?",es:"¿Dónde está tránsito?",fr:"Où est le transit ?",ar:"أين الترانزيت؟",tr:"Transit nerede?",zh:"中转在哪里？"}},
  {id:78,category:"airport",level:"A1",t:{fa:"سرویس بهداشتی کجاست؟",en:"Where is the restroom?",de:"Wo ist die Toilette?",es:"¿Dónde está el baño?",fr:"Où sont les toilettes ?",ar:"أين الحمام؟",tr:"Tuvalet nerede?",zh:"洗手间在哪里？"}},
  {id:79,category:"airport",level:"A1",t:{fa:"می‌خوام آب بخرم",en:"I want to buy water",de:"Ich möchte Wasser kaufen",es:"Quiero comprar agua",fr:"Je veux acheter de l'eau",ar:"أريد شراء ماء",tr:"Su satın almak istiyorum",zh:"我想买水"}},
  {id:80,category:"airport",level:"A1",t:{fa:"فرودگاه کجاست؟",en:"Where is the airport?",de:"Wo ist der Flughafen?",es:"¿Dónde está el aeropuerto?",fr:"Où est l'aéroport ?",ar:"أين المطار؟",tr:"Havaalanı nerede?",zh:"机场在哪里？"}},
  {id:81,category:"airport",level:"A1",t:{fa:"تاکسی کجاست؟",en:"Where are the taxis?",de:"Wo sind die Taxis?",es:"¿Dónde están los taxis?",fr:"Où sont les taxis ?",ar:"أين التاكسيات؟",tr:"Taksiler nerede?",zh:"出租车在哪里？"}},
  {id:82,category:"airport",level:"A1",t:{fa:"اتوبوس به شهر کجاست؟",en:"Where is the bus to the city?",de:"Wo ist der Bus in die Stadt?",es:"¿Dónde está el autobús a la ciudad?",fr:"Où est le bus pour la ville ?",ar:"أين الحافلة إلى المدينة؟",tr:"Şehre giden otobüs nerede?",zh:"去市区的公交车在哪里？"}},
  {id:83,category:"airport",level:"A1",t:{fa:"مترو کجاست؟",en:"Where is the metro?",de:"Wo ist die U-Bahn?",es:"¿Dónde está el metro?",fr:"Où est le métro ?",ar:"أين المترو؟",tr:"Metro nerede?",zh:"地铁在哪里？"}},
  {id:84,category:"airport",level:"A1",t:{fa:"کیفم گم شده",en:"My bag is lost",de:"Meine Tasche ist verloren gegangen",es:"Mi maleta se ha perdido",fr:"Mon sac est perdu",ar:"حقيبتي مفقودة",tr:"Çantam kayboldu",zh:"我的包丢了"}},
  {id:85,category:"airport",level:"A1",t:{fa:"کیفمو پیدا نمی‌کنم",en:"I can't find my bag",de:"Ich finde meine Tasche nicht",es:"No encuentro mi maleta",fr:"Je ne trouve pas mon sac",ar:"لا أجد حقيبتي",tr:"Çantamı bulamıyorum",zh:"我找不到我的包了"}},
  {id:86,category:"airport",level:"A1",t:{fa:"پروازم لغو شده",en:"My flight is cancelled",de:"Mein Flug wurde gestrichen",es:"Mi vuelo está cancelado",fr:"Mon vol est annulé",ar:"رحلتي ملغاة",tr:"Uçuşum iptal edildi",zh:"我的航班取消了"}},
  {id:87,category:"airport",level:"A1",t:{fa:"می‌خوام پروازمو عوض کنم",en:"I want to change my flight",de:"Ich möchte meinen Flug ändern",es:"Quiero cambiar mi vuelo",fr:"Je veux changer mon vol",ar:"أريد تغيير رحلتي",tr:"Uçuşumu değiştirmek istiyorum",zh:"我想改签航班"}},
  {id:88,category:"airport",level:"A1",t:{fa:"می‌خوام بلیط برگشت بگیرم",en:"I want a return ticket",de:"Ich möchte ein Rückflugticket",es:"Quiero un billete de vuelta",fr:"Je veux un billet retour",ar:"أريد تذكرة عودة",tr:"Dönüş bileti istiyorum",zh:"我想要回程票"}},
  {id:89,category:"airport",level:"A1",t:{fa:"یک طرفه می‌خوام",en:"I want one-way",de:"Ich möchte nur hin",es:"Quiero solo ida",fr:"Je veux un aller simple",ar:"أريد ذهابًا فقط",tr:"Tek yön istiyorum",zh:"我想要单程票"}},
  {id:90,category:"airport",level:"A1",t:{fa:"بلیطم رو گم کردم",en:"I lost my ticket",de:"Ich habe mein Ticket verloren",es:"Perdí mi boleto",fr:"J'ai perdu mon billet",ar:"فقدت تذكرتي",tr:"Biletimi kaybettim",zh:"我把票丢了"}},
  {id:91,category:"airport",level:"A1",t:{fa:"می‌تونم سوار بشم؟",en:"Can I board now?",de:"Kann ich jetzt einsteigen?",es:"¿Puedo abordar ahora?",fr:"Puis-je embarquer maintenant ?",ar:"هل يمكنني الصعود الآن؟",tr:"Şimdi binebilir miyim?",zh:"我现在可以登机吗？"}},
  {id:92,category:"airport",level:"A1",t:{fa:"صندلی من کدومه؟",en:"Which is my seat?",de:"Welcher ist mein Sitz?",es:"¿Cuál es mi asiento?",fr:"Quel est mon siège ?",ar:"ما هو مقعدي؟",tr:"Benim koltuğum hangisi?",zh:"我的座位是哪个？"}},
  {id:93,category:"airport",level:"A1",t:{fa:"می‌تونی جامو عوض کنی؟",en:"Can you change my seat?",de:"Können Sie meinen Sitz ändern?",es:"¿Puede cambiar mi asiento?",fr:"Pouvez-vous changer mon siège ?",ar:"هل يمكنك تغيير مقعدي؟",tr:"Koltuğumu değiştirebilir misiniz?",zh:"你能帮我换座位吗？"}},
  {id:94,category:"airport",level:"A1",t:{fa:"هواپیما چه موقع فرود میاد؟",en:"When does the plane land?",de:"Wann landet das Flugzeug?",es:"¿Cuándo aterriza el avión?",fr:"Quand l'avion atterrit-il ?",ar:"متى تهبط الطائرة؟",tr:"Uçak ne zaman inecek?",zh:"飞机什么时候降落？"}},
  {id:95,category:"airport",level:"A1",t:{fa:"هواپیما چه موقع بلند میشه؟",en:"When does the plane take off?",de:"Wann startet das Flugzeug?",es:"¿Cuándo despega el avión?",fr:"Quand l'avion décolle-t-il ?",ar:"متى تقلع الطائرة؟",tr:"Uçak ne zaman kalkacak?",zh:"飞机什么时候起飞？"}},
  {id:96,category:"airport",level:"A1",t:{fa:"می‌خوام چمدونمو تحویل بگیرم",en:"I want to collect my luggage",de:"Ich möchte mein Gepäck abholen",es:"Quiero recoger mi equipaje",fr:"Je veux récupérer mes bagages",ar:"أريد استلام أمتعتي",tr:"Bagajımı almak istiyorum",zh:"我想取行李"}},
  {id:97,category:"airport",level:"A1",t:{fa:"چمدونمو کجا پیدا کنم؟",en:"Where do I find my luggage?",de:"Wo finde ich mein Gepäck?",es:"¿Dónde encuentro mi equipaje?",fr:"Où trouve-je mes bagages ?",ar:"أين أجد أمتعتي؟",tr:"Bagajımı nerede bulurum?",zh:"我在哪里找行李？"}},
  {id:98,category:"airport",level:"A1",t:{fa:"نوار چمدون کدومه؟",en:"Which carousel is mine?",de:"Welches Band ist meins?",es:"¿Cuál es mi cinta?",fr:"Quel est mon tapis ?",ar:"أي حزام أمتعتي؟",tr:"Benim bandım hangisi?",zh:"我的行李传送带是哪个？"}},
  {id:99,category:"airport",level:"A1",t:{fa:"می‌خوام تاکسی کرایه کنم",en:"I want to rent a taxi",de:"Ich möchte ein Taxi mieten",es:"Quiero alquilar un taxi",fr:"Je veux louer un taxi",ar:"أريد استئجار تاكسي",tr:"Taksi kiralamak istiyorum",zh:"我想租出租车"}},
  {id:100,category:"airport",level:"A1",t:{fa:"می‌خوام ماشین کرایه کنم",en:"I want to rent a car",de:"Ich möchte ein Auto mieten",es:"Quiero alquilar un coche",fr:"Je veux louer une voiture",ar:"أريد استئجار سيارة",tr:"Araba kiralamak istiyorum",zh:"我想租车"}},
  {id:101,category:"airport",level:"A1",t:{fa:"می‌خوام هتل رزرو کنم",en:"I want to book a hotel",de:"Ich möchte ein Hotel buchen",es:"Quiero reservar un hotel",fr:"Je veux réserver un hôtel",ar:"أريد حجز فندق",tr:"Otel rezervasyonu yapmak istiyorum",zh:"我想预订酒店"}},
  {id:102,category:"airport",level:"A1",t:{fa:"وای‌فای رایگان دارید؟",en:"Do you have free Wi-Fi?",de:"Haben Sie kostenloses WLAN?",es:"¿Tienen Wi-Fi gratis?",fr:"Avez-vous du Wi-Fi gratuit ?",ar:"هل لديكم واي فاي مجاني؟",tr:"Ücretsiz Wi-Fi var mı?",zh:"你们有免费Wi-Fi吗？"}},
  {id:103,category:"airport",level:"A1",t:{fa:"شارژر کجاست؟",en:"Where is the charger?",de:"Wo ist das Ladegerät?",es:"¿Dónde está el cargador?",fr:"Où est le chargeur ?",ar:"أين الشاحن؟",tr:"Şarj cihazı nerede?",zh:"充电器在哪里？"}},
  {id:104,category:"airport",level:"A1",t:{fa:"پریز برق کجاست؟",en:"Where is the power outlet?",de:"Wo ist die Steckdose?",es:"¿Dónde está el enchufe?",fr:"Où est la prise de courant ?",ar:"أين مقبس الكهرباء؟",tr:"Priz nerede?",zh:"插座在哪里？"}},
  {id:105,category:"airport",level:"A1",t:{fa:"می‌خوام غذا بخورم",en:"I want to eat",de:"Ich möchte essen",es:"Quiero comer",fr:"Je veux manger",ar:"أريد أن آكل",tr:"Yemek yemek istiyorum",zh:"我想吃饭"}},
  {id:106,category:"airport",level:"A1",t:{fa:"رستوران کجاست؟",en:"Where is the restaurant?",de:"Wo ist das Restaurant?",es:"¿Dónde está el restaurante?",fr:"Où est le restaurant ?",ar:"أين المطعم؟",tr:"Restoran nerede?",zh:"餐厅在哪里？"}},
  {id:107,category:"airport",level:"A1",t:{fa:"کافه کجاست؟",en:"Where is the café?",de:"Wo ist das Café?",es:"¿Dónde está el café?",fr:"Où est le café ?",ar:"أين المقهى؟",tr:"Kafe nerede?",zh:"咖啡厅在哪里？"}},
  {id:108,category:"airport",level:"A1",t:{fa:"داروخانه کجاست؟",en:"Where is the pharmacy?",de:"Wo ist die Apotheke?",es:"¿Dónde está la farmacia?",fr:"Où est la pharmacie ?",ar:"أين الصيدلية؟",tr:"Eczane nerede?",zh:"药店在哪里？"}},
  {id:109,category:"airport",level:"A1",t:{fa:"بیمارستان کجاست؟",en:"Where is the hospital?",de:"Wo ist das Krankenhaus?",es:"¿Dónde está el hospital?",fr:"Où est l'hôpital ?",ar:"أين المستشفى؟",tr:"Hastane nerede?",zh:"医院在哪里？"}},
  {id:110,category:"airport",level:"A1",t:{fa:"پلیس کجاست؟",en:"Where is the police?",de:"Wo ist die Polizei?",es:"¿Dónde está la policía?",fr:"Où est la police ?",ar:"أين الشرطة؟",tr:"Polis nerede?",zh:"警察在哪里？"}},
  {id:111,category:"airport",level:"A1",t:{fa:"سفارت کجاست؟",en:"Where is the embassy?",de:"Wo ist die Botschaft?",es:"¿Dónde está la embajada?",fr:"Où est l'ambassade ?",ar:"أين السفارة؟",tr:"Büyükelçilik nerede?",zh:"大使馆在哪里？"}},
  {id:112,category:"airport",level:"A1",t:{fa:"می‌خوام پول عوض کنم",en:"I want to exchange money",de:"Ich möchte Geld wechseln",es:"Quiero cambiar dinero",fr:"Je veux changer de l'argent",ar:"أريد تغيير النقود",tr:"Para bozdurmak istiyorum",zh:"我想换钱"}},
  {id:113,category:"airport",level:"A1",t:{fa:"صرافی کجاست؟",en:"Where is the exchange office?",de:"Wo ist die Wechselstube?",es:"¿Dónde está la casa de cambio?",fr:"Où est le bureau de change ?",ar:"أين مكتب الصرافة؟",tr:"Döviz bürosu nerede?",zh:"兑换处在哪里？"}},
  {id:114,category:"airport",level:"A1",t:{fa:"عابر بانک کجاست؟",en:"Where is the ATM?",de:"Wo ist der Geldautomat?",es:"¿Dónde está el cajero?",fr:"Où est le distributeur ?",ar:"أين الصراف الآلي؟",tr:"ATM nerede?",zh:"ATM在哪里？"}},
  {id:115,category:"airport",level:"A1",t:{fa:"می‌خوام سیم‌کارت بخرم",en:"I want to buy a SIM card",de:"Ich möchte eine SIM-Karte kaufen",es:"Quiero comprar una tarjeta SIM",fr:"Je veux acheter une carte SIM",ar:"أريد شراء شريحة SIM",tr:"SIM kart satın almak istiyorum",zh:"我想买SIM卡"}},
  {id:116,category:"airport",level:"A1",t:{fa:"اینترنت رایگان دارید؟",en:"Do you have free internet?",de:"Haben Sie kostenloses Internet?",es:"¿Tienen internet gratis?",fr:"Avez-vous Internet gratuit ?",ar:"هل لديكم إنترنت مجاني؟",tr:"Ücretsiz internet var mı?",zh:"你们有免费网络吗？"}},
  {id:117,category:"restaurant",level:"A1",t:{fa:"میز برای دو نفر می‌خوام",en:"I'd like a table for two",de:"Ich hätte gerne einen Tisch für zwei",es:"Quisiera una mesa para dos",fr:"Je voudrais une table pour deux",ar:"أريد طاولة لشخصين",tr:"İki kişilik masa istiyorum",zh:"我想要一张两人桌"}},
  {id:118,category:"restaurant",level:"A1",t:{fa:"میز برای چهار نفر می‌خوام",en:"I'd like a table for four",de:"Ich hätte gerne einen Tisch für vier",es:"Quisiera una mesa para cuatro",fr:"Je voudrais une table pour quatre",ar:"أريد طاولة لأربعة أشخاص",tr:"Dört kişilik masa istiyorum",zh:"我想要一张四人桌"}},
  {id:119,category:"restaurant",level:"A1",t:{fa:"میز برای یک نفر می‌خوام",en:"I'd like a table for one",de:"Ich hätte gerne einen Tisch für eine Person",es:"Quisiera una mesa para uno",fr:"Je voudrais une table pour une personne",ar:"أريد طاولة لشخص واحد",tr:"Bir kişilik masa istiyorum",zh:"我想要一张单人桌"}},
  {id:120,category:"restaurant",level:"A1",t:{fa:"منو لطفاً",en:"The menu, please",de:"Die Speisekarte, bitte",es:"El menú, por favor",fr:"Le menu, s'il vous plaît",ar:"القائمة، من فضلك",tr:"Menüyü getirir misiniz?",zh:"请给我菜单"}},
  {id:121,category:"restaurant",level:"A1",t:{fa:"آب لطفاً",en:"Water, please",de:"Wasser, bitte",es:"Agua, por favor",fr:"De l'eau, s'il vous plaît",ar:"ماء، من فضلك",tr:"Su, lütfen",zh:"请给我水"}},
  {id:122,category:"restaurant",level:"A1",t:{fa:"چای لطفاً",en:"Tea, please",de:"Tee, bitte",es:"Té, por favor",fr:"Du thé, s'il vous plaît",ar:"شاي، من فضلك",tr:"Çay, lütfen",zh:"请给我茶"}},
  {id:123,category:"restaurant",level:"A1",t:{fa:"قهوه لطفاً",en:"Coffee, please",de:"Kaffee, bitte",es:"Café, por favor",fr:"Du café, s'il vous plaît",ar:"قهوة، من فضلك",tr:"Kahve, lütfen",zh:"请给我咖啡"}},
  {id:124,category:"restaurant",level:"A1",t:{fa:"نوشابه دارید؟",en:"Do you have soda?",de:"Haben Sie Limonade?",es:"¿Tienen refresco?",fr:"Avez-vous des boissons gazeuses ?",ar:"هل لديكم مشروبات غازية؟",tr:"Gazlı içeceğiniz var mı?",zh:"你们有汽水吗？"}},
  {id:125,category:"restaurant",level:"A1",t:{fa:"آب معدنی لطفاً",en:"Mineral water, please",de:"Mineralwasser, bitte",es:"Agua mineral, por favor",fr:"De l'eau minérale, s'il vous plaît",ar:"ماء معدني، من فضلك",tr:"Maden suyu, lütfen",zh:"请给我矿泉水"}},
  {id:126,category:"restaurant",level:"A1",t:{fa:"صورت‌حساب رو میارید؟",en:"Could you bring the bill?",de:"Könnten Sie die Rechnung bringen?",es:"¿Podría traer la cuenta?",fr:"Pourriez-vous apporter l'addition ?",ar:"هل يمكنكم إحضار الفاتورة؟",tr:"Hesabı getirebilir misiniz?",zh:"可以给我账单吗？"}},
  {id:127,category:"restaurant",level:"A1",t:{fa:"می‌خوام حساب کنم",en:"I'd like to pay",de:"Ich möchte bezahlen",es:"Quisiera pagar",fr:"Je voudrais payer",ar:"أريد أن أدفع",tr:"Ödemek istiyorum",zh:"我想结账"}},
  {id:128,category:"restaurant",level:"A1",t:{fa:"با کارت می‌تونم پرداخت کنم؟",en:"Can I pay by card?",de:"Kann ich mit Karte bezahlen?",es:"¿Puedo pagar con tarjeta?",fr:"Puis-je payer par carte ?",ar:"هل يمكنني الدفع بالبطاقة؟",tr:"Kartla ödeyebilir miyim?",zh:"我可以刷卡吗？"}},
  {id:129,category:"restaurant",level:"A1",t:{fa:"نقدی پرداخت می‌کنم",en:"I'll pay in cash",de:"Ich zahle bar",es:"Pagaré en efectivo",fr:"Je paierai en espèces",ar:"سأدفع نقدًا",tr:"Nakit ödeyeceğim",zh:"我付现金"}},
  {id:130,category:"restaurant",level:"A1",t:{fa:"غذا چه موقع آماده میشه؟",en:"When will the food be ready?",de:"Wann ist das Essen fertig?",es:"¿Cuándo estará lista la comida?",fr:"Quand la nourriture sera-t-elle prête ?",ar:"متى سيكون الطعام جاهزًا؟",tr:"Yemek ne zaman hazır olacak?",zh:"食物什么时候准备好？"}},
  {id:131,category:"restaurant",level:"A1",t:{fa:"هنوز سفارش ندادم",en:"I haven't ordered yet",de:"Ich habe noch nicht bestellt",es:"Todavía no he pedido",fr:"Je n'ai pas encore commandé",ar:"لم أطلب بعد",tr:"Henüz sipariş vermedim",zh:"我还没点餐"}},
  {id:132,category:"restaurant",level:"A1",t:{fa:"من گیاه‌خوارم",en:"I'm vegetarian",de:"Ich bin Vegetarier",es:"Soy vegetariano",fr:"Je suis végétarien",ar:"أنا نباتي",tr:"Ben vejetaryenim",zh:"我是素食者"}},
  {id:133,category:"restaurant",level:"A1",t:{fa:"من وگانم",en:"I'm vegan",de:"Ich bin Veganer",es:"Soy vegano",fr:"Je suis végétalien",ar:"أنا نباتي صرف",tr:"Ben veganım",zh:"我是纯素者"}},
  {id:134,category:"restaurant",level:"A1",t:{fa:"به فلفل حساسیت دارم",en:"I'm allergic to pepper",de:"Ich bin allergisch gegen Pfeffer",es:"Soy alérgico a la pimienta",fr:"Je suis allergique au poivre",ar:"أنا حساس للفلفل",tr:"Biber alerjim var",zh:"我对胡椒过敏"}},
  {id:135,category:"restaurant",level:"A1",t:{fa:"به بادام‌زمینی حساسیت دارم",en:"I'm allergic to peanuts",de:"Ich bin allergisch gegen Erdnüsse",es:"Soy alérgico a los cacahuetes",fr:"Je suis allergique aux cacahuètes",ar:"أنا حساس للفول السوداني",tr:"Yer fıstığı alerjim var",zh:"我对花生过敏"}},
  {id:136,category:"restaurant",level:"A1",t:{fa:"این غذا تند نیست؟",en:"Is this food spicy?",de:"Ist dieses Essen scharf?",es:"¿Esta comida es picante?",fr:"Cette nourriture est-elle épicée ?",ar:"هل هذا الطعام حار؟",tr:"Bu yemek acı mı?",zh:"这个食物辣吗？"}},
  {id:137,category:"restaurant",level:"A1",t:{fa:"بدون گوشت می‌خوام",en:"I want it without meat",de:"Ich möchte es ohne Fleisch",es:"Lo quiero sin carne",fr:"Je le veux sans viande",ar:"أريده بدون لحم",tr:"Etsiz istiyorum",zh:"我不要肉"}},
  {id:138,category:"restaurant",level:"A1",t:{fa:"بدون پیاز لطفاً",en:"Without onion, please",de:"Ohne Zwiebeln, bitte",es:"Sin cebolla, por favor",fr:"Sans oignon, s'il vous plaît",ar:"بدون بصل، من فضلك",tr:"Soğansız, lütfen",zh:"请不要放洋葱"}},
  {id:139,category:"restaurant",level:"A1",t:{fa:"سس جداگانه لطفاً",en:"Sauce on the side, please",de:"Soße separat, bitte",es:"Salsa aparte, por favor",fr:"Sauce à côté, s'il vous plaît",ar:"الصلصة على الجانب، من فضلك",tr:"Sos ayrı, lütfen",zh:"酱汁请分开放"}},
  {id:140,category:"restaurant",level:"A1",t:{fa:"غذا سرد شده",en:"The food is cold",de:"Das Essen ist kalt",es:"La comida está fría",fr:"La nourriture est froide",ar:"الطعام بارد",tr:"Yemek soğuk",zh:"食物凉了"}},
  {id:141,category:"restaurant",level:"A1",t:{fa:"می‌تونی گرمش کنی؟",en:"Can you heat it up?",de:"Können Sie es aufwärmen?",es:"¿Puede calentarlo?",fr:"Pouvez-vous le réchauffer ?",ar:"هل يمكنك تسخينه؟",tr:"Isıtabilir misiniz?",zh:"你能加热一下吗？"}},
  {id:142,category:"restaurant",level:"A1",t:{fa:"خوشمزه بود",en:"It was delicious",de:"Es war köstlich",es:"Estaba delicioso",fr:"C'était délicieux",ar:"كان لذيذًا",tr:"Çok lezzetliydi",zh:"很好吃"}},
  {id:143,category:"restaurant",level:"A1",t:{fa:"غذا خیلی خوب بود",en:"The food was very good",de:"Das Essen war sehr gut",es:"La comida estuvo muy buena",fr:"La nourriture était très bonne",ar:"الطعام كان جيدًا جدًا",tr:"Yemek çok güzeldi",zh:"食物非常好"}},
  {id:144,category:"restaurant",level:"A1",t:{fa:"نوش جان",en:"Bon appétit",de:"Guten Appetit",es:"Buen provecho",fr:"Bon appétit",ar:"بالهناء والشفاء",tr:"Afiyet olsun",zh:"祝您好胃口"}},
  {id:145,category:"restaurant",level:"A1",t:{fa:"سیر شدم",en:"I'm full",de:"Ich bin satt",es:"Estoy lleno",fr:"Je suis rassasié",ar:"أنا شبعان",tr:"Doydum",zh:"我吃饱了"}},
  {id:146,category:"restaurant",level:"A1",t:{fa:"هنوز گرسنمه",en:"I'm still hungry",de:"Ich habe noch Hunger",es:"Todavía tengo hambre",fr:"J'ai encore faim",ar:"أنا ما زلت جائعًا",tr:"Hâlâ açım",zh:"我还饿"}},
  {id:147,category:"restaurant",level:"A1",t:{fa:"می‌خوام دسر بخورم",en:"I want dessert",de:"Ich möchte Nachtisch",es:"Quiero postre",fr:"Je veux du dessert",ar:"أريد الحلوى",tr:"Tatlı istiyorum",zh:"我想要甜点"}},
  {id:148,category:"restaurant",level:"A1",t:{fa:"دسر چی دارید؟",en:"What desserts do you have?",de:"Welche Nachspeisen haben Sie?",es:"¿Qué postres tienen?",fr:"Quels desserts avez-vous ?",ar:"ما الحلويات التي لديكم؟",tr:"Hangi tatlılarınız var?",zh:"你们有什么甜点？"}},
  {id:149,category:"restaurant",level:"A1",t:{fa:"می‌خوام پیش‌غذا",en:"I want an appetizer",de:"Ich möchte eine Vorspeise",es:"Quiero un aperitivo",fr:"Je veux une entrée",ar:"أريد مقبلات",tr:"Meze istiyorum",zh:"我想要开胃菜"}},
  {id:150,category:"restaurant",level:"A1",t:{fa:"نوشیدنی الکی نمی‌خورم",en:"I don't drink alcohol",de:"Ich trinke keinen Alkohol",es:"No bebo alcohol",fr:"Je ne bois pas d'alcool",ar:"لا أشرب الكحول",tr:"Alkol içmem",zh:"我不喝酒"}},
  {id:151,category:"restaurant",level:"A1",t:{fa:"یک لیوان شیر لطفاً",en:"A glass of milk, please",de:"Ein Glas Milch, bitte",es:"Un vaso de leche, por favor",fr:"Un verre de lait, s'il vous plaît",ar:"كوب حليب، من فضلك",tr:"Bir bardak süt, lütfen",zh:"请给我一杯牛奶"}},
  {id:152,category:"restaurant",level:"A1",t:{fa:"یک فنجان چای سبز",en:"A cup of green tea",de:"Eine Tasse grüner Tee",es:"Una taza de té verde",fr:"Une tasse de thé vert",ar:"فنجان شاي أخضر",tr:"Bir fincan yeşil çay",zh:"一杯绿茶"}},
  {id:153,category:"restaurant",level:"A1",t:{fa:"نان لطفاً",en:"Bread, please",de:"Brot, bitte",es:"Pan, por favor",fr:"Du pain, s'il vous plaît",ar:"خبز، من فضلك",tr:"Ekmek, lütfen",zh:"请给我面包"}},
  {id:154,category:"restaurant",level:"A1",t:{fa:"نمک لطفاً",en:"Salt, please",de:"Salz, bitte",es:"Sal, por favor",fr:"Du sel, s'il vous plaît",ar:"ملح، من فضلك",tr:"Tuz, lütfen",zh:"请给我盐"}},
  {id:155,category:"restaurant",level:"A1",t:{fa:"فلفل لطفاً",en:"Pepper, please",de:"Pfeffer, bitte",es:"Pimienta, por favor",fr:"Du poivre, s'il vous plaît",ar:"فلفل، من فضلك",tr:"Biber, lütfen",zh:"请给我胡椒"}},
  {id:156,category:"restaurant",level:"A1",t:{fa:"قند لطفاً",en:"Sugar, please",de:"Zucker, bitte",es:"Azúcar, por favor",fr:"Du sucre, s'il vous plaît",ar:"سكر، من فضلك",tr:"Şeker, lütfen",zh:"请给我糖"}},
  {id:157,category:"restaurant",level:"A1",t:{fa:"چنگال لطفاً",en:"A fork, please",de:"Eine Gabel, bitte",es:"Un tenedor, por favor",fr:"Une fourchette, s'il vous plaît",ar:"شوكة، من فضلك",tr:"Çatal, lütfen",zh:"请给我叉子"}},
  {id:158,category:"restaurant",level:"A1",t:{fa:"چاقو لطفاً",en:"A knife, please",de:"Ein Messer, bitte",es:"Un cuchillo, por favor",fr:"Un couteau, s'il vous plaît",ar:"سكين، من فضلك",tr:"Bıçak, lütfen",zh:"请给我刀"}},
  {id:159,category:"restaurant",level:"A1",t:{fa:"قاشق لطفاً",en:"A spoon, please",de:"Ein Löffel, bitte",es:"Una cuchara, por favor",fr:"Une cuillère, s'il vous plaît",ar:"ملعقة، من فضلك",tr:"Kaşık, lütfen",zh:"请给我勺子"}},
  {id:160,category:"restaurant",level:"A1",t:{fa:"دستمال کاغذی لطفاً",en:"A napkin, please",de:"Eine Serviette, bitte",es:"Una servilleta, por favor",fr:"Une serviette, s'il vous plaît",ar:"منشفة ورقية، من فضلك",tr:"Peçete, lütfen",zh:"请给我餐巾纸"}},
  {id:161,category:"restaurant",level:"A1",t:{fa:"می‌تونم پیش‌خدمت رو صدا کنم؟",en:"Can I call the waiter?",de:"Kann ich den Kellner rufen?",es:"¿Puedo llamar al camarero?",fr:"Puis-je appeler le serveur ?",ar:"هل يمكنني استدعاء النادل؟",tr:"Garsonu çağırabilir miyim?",zh:"我可以叫服务员吗？"}},
  {id:162,category:"restaurant",level:"A1",t:{fa:"چی تو منو هست؟",en:"What's on the menu?",de:"Was gibt es auf der Speisekarte?",es:"¿Qué hay en el menú?",fr:"Qu'y a-t-il au menu ?",ar:"ماذا يوجد في القائمة؟",tr:"Menüde ne var?",zh:"菜单上有什么？"}},
  {id:163,category:"restaurant",level:"A2",t:{fa:"غذای امروزتون چیه؟",en:"What's today's special?",de:"Was ist das heutige Gericht?",es:"¿Cuál es el plato del día?",fr:"Quel est le plat du jour ?",ar:"ما هو طبق اليوم؟",tr:"Günün yemeği ne?",zh:"今日特餐是什么？"}},
  {id:164,category:"restaurant",level:"A2",t:{fa:"چی پیشنهاد می‌کنی؟",en:"What do you recommend?",de:"Was empfehlen Sie?",es:"¿Qué recomienda?",fr:"Que recommandez-vous ?",ar:"بماذا توصي؟",tr:"Ne önerirsiniz?",zh:"你推荐什么？"}},
  {id:165,category:"restaurant",level:"A2",t:{fa:"این غذا با چی میاد؟",en:"What does this dish come with?",de:"Womit wird dieses Gericht serviert?",es:"¿Con qué viene este plato?",fr:"Ce plat est accompagné de quoi ?",ar:"بماذا يأتي هذا الطبق؟",tr:"Bu yemek neyle geliyor?",zh:"这道菜配什么？"}},
  {id:166,category:"restaurant",level:"A2",t:{fa:"می‌شه نصف پرس بگیرم؟",en:"Can I get a half portion?",de:"Kann ich eine halbe Portion bekommen?",es:"¿Puedo pedir media porción?",fr:"Puis-je avoir une demi-portion ?",ar:"هل يمكنني الحصول على نصف حصة؟",tr:"Yarım porsiyon alabilir miyim?",zh:"我可以要半份吗？"}},
  {id:167,category:"restaurant",level:"A2",t:{fa:"سفارشم رو عوض می‌کنم",en:"I'll change my order",de:"Ich ändere meine Bestellung",es:"Voy a cambiar mi pedido",fr:"Je vais changer ma commande",ar:"سأغير طلبي",tr:"Siparişimi değiştireceğim",zh:"我要改一下点单"}},
  {id:168,category:"restaurant",level:"A2",t:{fa:"این سفارش من نبود",en:"This wasn't my order",de:"Das war nicht meine Bestellung",es:"Este no fue mi pedido",fr:"Ce n'était pas ma commande",ar:"لم يكن هذا طلبي",tr:"Bu benim siparişim değildi",zh:"这不是我点的"}},
  {id:169,category:"restaurant",level:"A2",t:{fa:"صورت‌حساب اشتباهه",en:"The bill is wrong",de:"Die Rechnung ist falsch",es:"La cuenta está mal",fr:"L'addition est fausse",ar:"الفاتورة خاطئة",tr:"Hesap yanlış",zh:"账单不对"}},
  {id:170,category:"restaurant",level:"A2",t:{fa:"می‌شه جداگانه حساب کنیم؟",en:"Can we split the bill?",de:"Können wir getrennt zahlen?",es:"¿Podemos dividir la cuenta?",fr:"Peut-on partager l'addition ?",ar:"هل يمكننا تقسيم الفاتورة؟",tr:"Hesabı bölebilir miyiz?",zh:"我们可以分开付款吗？"}},
  {id:171,category:"restaurant",level:"A2",t:{fa:"باقی‌مونده رو نگه‌دار",en:"Keep the change",de:"Behalten Sie das Wechselgeld",es:"Quédese con el cambio",fr:"Gardez la monnaie",ar:"احتفظ بالباقي",tr:"Üstü kalsın",zh:"不用找零了"}},
  {id:172,category:"restaurant",level:"A2",t:{fa:"می‌شه بسته‌بندی کنید؟",en:"Can you pack it to go?",de:"Können Sie es zum Mitnehmen einpacken?",es:"¿Puede empacarlo para llevar?",fr:"Pouvez-vous l'emballer à emporter ?",ar:"هل يمكنك تغليفه للطريق؟",tr:"Paket yapabilir misiniz?",zh:"可以打包吗？"}},
  {id:173,category:"restaurant",level:"A2",t:{fa:"میز رزرو دارم",en:"I have a reservation",de:"Ich habe eine Reservierung",es:"Tengo una reserva",fr:"J'ai une réservation",ar:"لدي حجز",tr:"Rezervasyonum var",zh:"我有预订"}},
  {id:174,category:"restaurant",level:"A2",t:{fa:"می‌خوام یک میز رزرو کنم",en:"I'd like to reserve a table",de:"Ich möchte einen Tisch reservieren",es:"Quisiera reservar una mesa",fr:"Je voudrais réserver une table",ar:"أريد حجز طاولة",tr:"Masa rezervasyonu yaptırmak istiyorum",zh:"我想预订一张桌子"}},
  {id:175,category:"restaurant",level:"A2",t:{fa:"چقدر باید منتظر بمونیم؟",en:"How long is the wait?",de:"Wie lange ist die Wartezeit?",es:"¿Cuánto es la espera?",fr:"Quel est le temps d'attente ?",ar:"كم مدة الانتظار؟",tr:"Bekleme süresi ne kadar?",zh:"要等多久？"}},
  {id:176,category:"shopping",level:"A1",t:{fa:"قیمتش چنده؟",en:"How much does it cost?",de:"Wie viel kostet das?",es:"¿Cuánto cuesta?",fr:"Combien ça coûte ?",ar:"كم يكلف هذا؟",tr:"Bu ne kadar?",zh:"这个多少钱？"}},
  {id:177,category:"shopping",level:"A1",t:{fa:"می‌تونم امتحانش کنم؟",en:"Can I try it on?",de:"Kann ich es anprobieren?",es:"¿Puedo probármelo?",fr:"Puis-je l'essayer ?",ar:"هل يمكنني تجربته؟",tr:"Deneyebilir miyim?",zh:"我可以试穿一下吗？"}},
  {id:178,category:"shopping",level:"A1",t:{fa:"سایز بزرگ‌تر دارید؟",en:"Do you have a bigger size?",de:"Haben Sie eine größere Größe?",es:"¿Tienen una talla más grande?",fr:"Avez-vous une taille plus grande ?",ar:"هل لديكم مقاس أكبر؟",tr:"Daha büyük bedeniniz var mı?",zh:"你们有更大的尺码吗？"}},
  {id:179,category:"shopping",level:"A1",t:{fa:"سایز کوچیک‌تر دارید؟",en:"Do you have a smaller size?",de:"Haben Sie eine kleinere Größe?",es:"¿Tienen una talla más pequeña?",fr:"Avez-vous une taille plus petite ?",ar:"هل لديكم مقاس أصغر؟",tr:"Daha küçük bedeniniz var mı?",zh:"你们有更小的尺码吗？"}},
  {id:180,category:"shopping",level:"A1",t:{fa:"رنگ دیگه‌ای دارید؟",en:"Do you have another color?",de:"Haben Sie eine andere Farbe?",es:"¿Tienen otro color?",fr:"Avez-vous une autre couleur ?",ar:"هل لديكم لون آخر؟",tr:"Başka renginiz var mı?",zh:"你们有其他颜色吗？"}},
  {id:181,category:"shopping",level:"A1",t:{fa:"این چقدره؟",en:"How much is this?",de:"Wie viel kostet das hier?",es:"¿Cuánto cuesta esto?",fr:"Combien coûte ceci ?",ar:"كم سعر هذا؟",tr:"Bunun fiyatı ne kadar?",zh:"这个多少钱？"}},
  {id:182,category:"shopping",level:"A1",t:{fa:"خیلی گرونه",en:"It's too expensive",de:"Das ist zu teuer",es:"Es demasiado caro",fr:"C'est trop cher",ar:"إنه غالٍ جدًا",tr:"Çok pahalı",zh:"太贵了"}},
  {id:183,category:"shopping",level:"A1",t:{fa:"ارزون‌تر دارید؟",en:"Do you have anything cheaper?",de:"Haben Sie etwas Billigeres?",es:"¿Tienen algo más barato?",fr:"Avez-vous quelque chose de moins cher ?",ar:"هل لديكم شيء أرخص؟",tr:"Daha ucuz bir şeyiniz var mı?",zh:"有便宜一点的吗？"}},
  {id:184,category:"shopping",level:"A1",t:{fa:"می‌شه تخفیف بدید؟",en:"Can you give a discount?",de:"Können Sie einen Rabatt geben?",es:"¿Puede hacer un descuento?",fr:"Pouvez-vous faire une réduction ?",ar:"هل يمكنك تقديم خصم؟",tr:"İndirim yapabilir misiniz?",zh:"能打折吗？"}},
  {id:185,category:"shopping",level:"A1",t:{fa:"فقط نگاه می‌کنم",en:"I'm just looking",de:"Ich schaue mich nur um",es:"Solo estoy mirando",fr:"Je regarde seulement",ar:"أنا أنظر فقط",tr:"Sadece bakıyorum",zh:"我只是看看"}},
  {id:186,category:"shopping",level:"A1",t:{fa:"این رو می‌خرم",en:"I'll take this",de:"Ich nehme das",es:"Me llevo esto",fr:"Je prends ceci",ar:"سآخذ هذا",tr:"Bunu alacağım",zh:"我要这个"}},
  {id:187,category:"shopping",level:"A1",t:{fa:"این رو نمی‌خوام",en:"I don't want this",de:"Ich möchte das nicht",es:"No quiero esto",fr:"Je ne veux pas ça",ar:"لا أريد هذا",tr:"Bunu istemiyorum",zh:"我不要这个"}},
  {id:188,category:"shopping",level:"A1",t:{fa:"با کارت پرداخت می‌کنم",en:"I'll pay by card",de:"Ich zahle mit Karte",es:"Pagaré con tarjeta",fr:"Je paierai par carte",ar:"سأدفع بالبطاقة",tr:"Kartla ödeyeceğim",zh:"我刷卡付款"}},
  {id:189,category:"shopping",level:"A1",t:{fa:"رسید می‌خوام",en:"I want a receipt",de:"Ich möchte eine Quittung",es:"Quiero un recibo",fr:"Je veux un reçu",ar:"أريد إيصالًا",tr:"Fiş istiyorum",zh:"我想要收据"}},
  {id:190,category:"shopping",level:"A1",t:{fa:"می‌تونم پسش بدم؟",en:"Can I return it?",de:"Kann ich es zurückgeben?",es:"¿Puedo devolverlo?",fr:"Puis-je le retourner ?",ar:"هل يمكنني إرجاعه؟",tr:"Bunu iade edebilir miyim?",zh:"我可以退货吗？"}},
  {id:191,category:"shopping",level:"A1",t:{fa:"معیوبه",en:"It's defective",de:"Es ist defekt",es:"Está defectuoso",fr:"C'est défectueux",ar:"إنه معيب",tr:"Bu kusurlu",zh:"这个有瑕疵"}},
  {id:192,category:"shopping",level:"A1",t:{fa:"می‌تونم عوضش کنم؟",en:"Can I exchange it?",de:"Kann ich es umtauschen?",es:"¿Puedo cambiarlo?",fr:"Puis-je l'échanger ?",ar:"هل يمكنني استبداله؟",tr:"Değiştirebilir miyim?",zh:"我可以换货吗？"}},
  {id:193,category:"shopping",level:"A1",t:{fa:"فروشگاه ساعت چند بازه؟",en:"What time does the store open?",de:"Wann öffnet das Geschäft?",es:"¿A qué hora abre la tienda?",fr:"À quelle heure ouvre le magasin ?",ar:"متى يفتح المتجر؟",tr:"Mağaza saat kaçta açılıyor?",zh:"商店几点开门？"}},
  {id:194,category:"shopping",level:"A1",t:{fa:"فروشگاه ساعت چند می‌بنده؟",en:"What time does the store close?",de:"Wann schließt das Geschäft?",es:"¿A qué hora cierra la tienda?",fr:"À quelle heure ferme le magasin ?",ar:"متى يغلق المتجر؟",tr:"Mağaza saat kaçta kapanıyor?",zh:"商店几点关门？"}},
  {id:195,category:"shopping",level:"A1",t:{fa:"اتاق پرو کجاست؟",en:"Where is the fitting room?",de:"Wo ist die Umkleidekabine?",es:"¿Dónde está el probador?",fr:"Où est la cabine d'essayage ?",ar:"أين غرفة القياس؟",tr:"Deneme kabini nerede?",zh:"试衣间在哪里？"}},
  {id:196,category:"shopping",level:"A1",t:{fa:"صندوق کجاست؟",en:"Where is the checkout?",de:"Wo ist die Kasse?",es:"¿Dónde está la caja?",fr:"Où est la caisse ?",ar:"أين الصندوق؟",tr:"Kasa nerede?",zh:"收银台在哪里？"}},
  {id:197,category:"shopping",level:"A1",t:{fa:"دنبال یه هدیه می‌گردم",en:"I'm looking for a gift",de:"Ich suche ein Geschenk",es:"Busco un regalo",fr:"Je cherche un cadeau",ar:"أبحث عن هدية",tr:"Hediye arıyorum",zh:"我在找礼物"}},
  {id:198,category:"shopping",level:"A1",t:{fa:"کیف پول می‌خوام",en:"I want a wallet",de:"Ich möchte eine Geldbörse",es:"Quiero una billetera",fr:"Je veux un portefeuille",ar:"أريد محفظة",tr:"Cüzdan istiyorum",zh:"我想要钱包"}},
  {id:199,category:"shopping",level:"A1",t:{fa:"کفش می‌خوام",en:"I want shoes",de:"Ich möchte Schuhe",es:"Quiero zapatos",fr:"Je veux des chaussures",ar:"أريد حذاء",tr:"Ayakkabı istiyorum",zh:"我想要鞋子"}},
  {id:200,category:"shopping",level:"A1",t:{fa:"لباس می‌خوام",en:"I want clothes",de:"Ich möchte Kleidung",es:"Quiero ropa",fr:"Je veux des vêtements",ar:"أريد ملابس",tr:"Kıyafet istiyorum",zh:"我想要衣服"}},
  {id:201,category:"hotel",level:"A1",t:{fa:"یک اتاق رزرو دارم",en:"I have a room reservation",de:"Ich habe eine Zimmerreservierung",es:"Tengo una reserva de habitación",fr:"J'ai une réservation de chambre",ar:"لدي حجز غرفة",tr:"Oda rezervasyonum var",zh:"我有房间预订"}},
  {id:202,category:"hotel",level:"A1",t:{fa:"می‌خوام اتاق رزرو کنم",en:"I want to book a room",de:"Ich möchte ein Zimmer buchen",es:"Quiero reservar una habitación",fr:"Je veux réserver une chambre",ar:"أريد حجز غرفة",tr:"Oda rezervasyonu yapmak istiyorum",zh:"我想订房间"}},
  {id:203,category:"hotel",level:"A1",t:{fa:"اتاق یک تخته می‌خوام",en:"I want a single room",de:"Ich möchte ein Einzelzimmer",es:"Quiero una habitación individual",fr:"Je veux une chambre simple",ar:"أريد غرفة مفردة",tr:"Tek kişilik oda istiyorum",zh:"我想要单人间"}},
  {id:204,category:"hotel",level:"A1",t:{fa:"اتاق دو تخته می‌خوام",en:"I want a double room",de:"Ich möchte ein Doppelzimmer",es:"Quiero una habitación doble",fr:"Je veux une chambre double",ar:"أريد غرفة مزدوجة",tr:"Çift kişilik oda istiyorum",zh:"我想要双人间"}},
  {id:205,category:"hotel",level:"A1",t:{fa:"چک‌این کجاست؟",en:"Where is check-in?",de:"Wo ist der Check-in?",es:"¿Dónde está el check-in?",fr:"Où est l'enregistrement ?",ar:"أين تسجيل الوصول؟",tr:"Check-in nerede?",zh:"入住登记在哪里？"}},
  {id:206,category:"hotel",level:"A1",t:{fa:"می‌خوام چک‌این کنم",en:"I want to check in",de:"Ich möchte einchecken",es:"Quiero hacer el check-in",fr:"Je veux m'enregistrer",ar:"أريد تسجيل الوصول",tr:"Check-in yapmak istiyorum",zh:"我想办理入住"}},
  {id:207,category:"hotel",level:"A1",t:{fa:"می‌خوام چک‌اوت کنم",en:"I want to check out",de:"Ich möchte auschecken",es:"Quiero hacer el check-out",fr:"Je veux régler ma note",ar:"أريد تسجيل المغادرة",tr:"Check-out yapmak istiyorum",zh:"我想退房"}},
  {id:208,category:"hotel",level:"A1",t:{fa:"چک‌این ساعت چنده؟",en:"What time is check-in?",de:"Wann ist der Check-in?",es:"¿A qué hora es el check-in?",fr:"À quelle heure est l'enregistrement ?",ar:"متى موعد تسجيل الوصول؟",tr:"Check-in saati kaçta?",zh:"几点可以入住？"}},
  {id:209,category:"hotel",level:"A1",t:{fa:"چک‌اوت ساعت چنده؟",en:"What time is check-out?",de:"Wann ist der Check-out?",es:"¿A qué hora es el check-out?",fr:"À quelle heure est le départ ?",ar:"متى موعد تسجيل المغادرة؟",tr:"Check-out saati kaçta?",zh:"几点退房？"}},
  {id:210,category:"hotel",level:"A1",t:{fa:"کلید اتاقم رو می‌خوام",en:"I want my room key",de:"Ich möchte meinen Zimmerschlüssel",es:"Quiero la llave de mi habitación",fr:"Je veux la clé de ma chambre",ar:"أريد مفتاح غرفتي",tr:"Oda anahtarımı istiyorum",zh:"我想要房间钥匙"}},
  {id:211,category:"hotel",level:"A1",t:{fa:"کلیدم رو گم کردم",en:"I lost my key",de:"Ich habe meinen Schlüssel verloren",es:"Perdí mi llave",fr:"J'ai perdu ma clé",ar:"فقدت مفتاحي",tr:"Anahtarımı kaybettim",zh:"我把钥匙丢了"}},
  {id:212,category:"hotel",level:"A1",t:{fa:"اینترنت اتاق کار نمی‌کنه",en:"The room's internet isn't working",de:"Das Internet im Zimmer funktioniert nicht",es:"El internet de la habitación no funciona",fr:"Internet dans la chambre ne fonctionne pas",ar:"إنترنت الغرفة لا يعمل",tr:"Odanın interneti çalışmıyor",zh:"房间的网络不能用"}},
  {id:213,category:"hotel",level:"A1",t:{fa:"آب گرم نداره",en:"There is no hot water",de:"Es gibt kein warmes Wasser",es:"No hay agua caliente",fr:"Il n'y a pas d'eau chaude",ar:"لا يوجد ماء ساخن",tr:"Sıcak su yok",zh:"没有热水"}},
  {id:214,category:"hotel",level:"A1",t:{fa:"می‌شه ملحفه رو عوض کنید؟",en:"Can you change the sheets?",de:"Können Sie die Bettwäsche wechseln?",es:"¿Puede cambiar las sábanas?",fr:"Pouvez-vous changer les draps ?",ar:"هل يمكنك تغيير الملاءات؟",tr:"Çarşafları değiştirebilir misiniz?",zh:"可以换床单吗？"}},
  {id:215,category:"hotel",level:"A1",t:{fa:"می‌شه حوله بیشتری بیارید؟",en:"Can you bring more towels?",de:"Können Sie mehr Handtücher bringen?",es:"¿Puede traer más toallas?",fr:"Pouvez-vous apporter plus de serviettes ?",ar:"هل يمكنك إحضار مناشف أخرى؟",tr:"Daha fazla havlu getirebilir misiniz?",zh:"可以多拿一些毛巾吗？"}},
  {id:216,category:"hotel",level:"A1",t:{fa:"صبحونه کجا سرو میشه؟",en:"Where is breakfast served?",de:"Wo wird das Frühstück serviert?",es:"¿Dónde se sirve el desayuno?",fr:"Où le petit-déjeuner est-il servi ?",ar:"أين يقدم الإفطار؟",tr:"Kahvaltı nerede veriliyor?",zh:"早餐在哪里供应？"}},
  {id:217,category:"hotel",level:"A1",t:{fa:"صبحونه ساعت چنده؟",en:"What time is breakfast?",de:"Wann ist das Frühstück?",es:"¿A qué hora es el desayuno?",fr:"À quelle heure est le petit-déjeuner ?",ar:"متى موعد الإفطار؟",tr:"Kahvaltı saat kaçta?",zh:"早餐几点？"}},
  {id:218,category:"hotel",level:"A1",t:{fa:"استخر دارید؟",en:"Do you have a pool?",de:"Haben Sie einen Pool?",es:"¿Tienen piscina?",fr:"Avez-vous une piscine ?",ar:"هل لديكم مسبح؟",tr:"Havuzunuz var mı?",zh:"你们有泳池吗？"}},
  {id:219,category:"hotel",level:"A1",t:{fa:"پارکینگ دارید؟",en:"Do you have parking?",de:"Haben Sie einen Parkplatz?",es:"¿Tienen estacionamiento?",fr:"Avez-vous un parking ?",ar:"هل لديكم موقف سيارات؟",tr:"Otoparkınız var mı?",zh:"你们有停车场吗？"}},
  {id:220,category:"hotel",level:"A1",t:{fa:"می‌خوام یک شب دیگه بمونم",en:"I want to stay one more night",de:"Ich möchte eine weitere Nacht bleiben",es:"Quiero quedarme una noche más",fr:"Je veux rester une nuit de plus",ar:"أريد البقاء ليلة إضافية",tr:"Bir gece daha kalmak istiyorum",zh:"我想多住一晚"}},
  {id:221,category:"directions",level:"A1",t:{fa:"ببخشید، ایستگاه قطار کجاست؟",en:"Excuse me, where is the train station?",de:"Entschuldigung, wo ist der Bahnhof?",es:"Disculpe, ¿dónde está la estación de tren?",fr:"Excusez-moi, où est la gare ?",ar:"عذرًا، أين محطة القطار؟",tr:"Affedersiniz, tren istasyonu nerede?",zh:"打扰一下，火车站在哪里？"}},
  {id:222,category:"directions",level:"A1",t:{fa:"مستقیم برو",en:"Go straight ahead",de:"Gehen Sie geradeaus",es:"Sigue recto",fr:"Allez tout droit",ar:"اذهب مباشرة",tr:"Doğru git",zh:"一直往前走"}},
  {id:223,category:"directions",level:"A1",t:{fa:"بپیچ راست",en:"Turn right",de:"Biegen Sie rechts ab",es:"Gira a la derecha",fr:"Tournez à droite",ar:"انعطف يمينًا",tr:"Sağa dön",zh:"向右转"}},
  {id:224,category:"directions",level:"A1",t:{fa:"بپیچ چپ",en:"Turn left",de:"Biegen Sie links ab",es:"Gira a la izquierda",fr:"Tournez à gauche",ar:"انعطف يسارًا",tr:"Sola dön",zh:"向左转"}},
  {id:225,category:"directions",level:"A1",t:{fa:"نزدیکه؟",en:"Is it close?",de:"Ist es in der Nähe?",es:"¿Está cerca?",fr:"C'est proche ?",ar:"هل هو قريب؟",tr:"Yakın mı?",zh:"近吗？"}},
  {id:226,category:"directions",level:"A1",t:{fa:"دوره؟",en:"Is it far?",de:"Ist es weit?",es:"¿Está lejos?",fr:"C'est loin ?",ar:"هل هو بعيد؟",tr:"Uzak mı?",zh:"远吗？"}},
  {id:227,category:"directions",level:"A1",t:{fa:"پیاده چقدر طول می‌کشه؟",en:"How long does it take on foot?",de:"Wie lange dauert es zu Fuß?",es:"¿Cuánto tarda a pie?",fr:"Combien de temps à pied ?",ar:"كم يستغرق سيرًا على الأقدام؟",tr:"Yürüyerek ne kadar sürer?",zh:"走路要多久？"}},
  {id:228,category:"directions",level:"A1",t:{fa:"می‌شه رو نقشه نشونم بدی؟",en:"Can you show me on the map?",de:"Können Sie es mir auf der Karte zeigen?",es:"¿Puede mostrarme en el mapa?",fr:"Pouvez-vous me montrer sur la carte ?",ar:"هل يمكنك أن تريني على الخريطة؟",tr:"Haritada gösterebilir misiniz?",zh:"你能在地图上指给我看吗？"}},
  {id:229,category:"directions",level:"A1",t:{fa:"من گم شدم",en:"I'm lost",de:"Ich habe mich verirrt",es:"Estoy perdido",fr:"Je suis perdu",ar:"أنا تائه",tr:"Kayboldum",zh:"我迷路了"}},
  {id:230,category:"directions",level:"A1",t:{fa:"این آدرس رو بلدی؟",en:"Do you know this address?",de:"Kennen Sie diese Adresse?",es:"¿Conoce esta dirección?",fr:"Connaissez-vous cette adresse ?",ar:"هل تعرف هذا العنوان؟",tr:"Bu adresi biliyor musunuz?",zh:"你知道这个地址吗？"}},
  {id:231,category:"directions",level:"A1",t:{fa:"چهارراه بعدی بپیچ",en:"Turn at the next intersection",de:"Biegen Sie an der nächsten Kreuzung ab",es:"Gira en el próximo cruce",fr:"Tournez au prochain carrefour",ar:"انعطف عند التقاطع القادم",tr:"Bir sonraki kavşakta dön",zh:"在下个路口转弯"}},
  {id:232,category:"directions",level:"A1",t:{fa:"روبروی بانکه",en:"It's across from the bank",de:"Es ist gegenüber der Bank",es:"Está enfrente del banco",fr:"C'est en face de la banque",ar:"إنه أمام البنك",tr:"Banka karşısında",zh:"在银行对面"}},
  {id:233,category:"directions",level:"A1",t:{fa:"کنار پارکه",en:"It's next to the park",de:"Es ist neben dem Park",es:"Está al lado del parque",fr:"C'est à côté du parc",ar:"إنه بجانب الحديقة",tr:"Park yanında",zh:"在公园旁边"}},
  {id:234,category:"directions",level:"A1",t:{fa:"طبقه بالاست",en:"It's upstairs",de:"Es ist oben",es:"Está arriba",fr:"C'est en haut",ar:"إنه في الطابق العلوي",tr:"Yukarıda",zh:"在楼上"}},
  {id:235,category:"directions",level:"A1",t:{fa:"طبقه پایینه",en:"It's downstairs",de:"Es ist unten",es:"Está abajo",fr:"C'est en bas",ar:"إنه في الطابق السفلي",tr:"Aşağıda",zh:"在楼下"}},
  {id:236,category:"directions",level:"A1",t:{fa:"ایستگاه اتوبوس کجاست؟",en:"Where is the bus stop?",de:"Wo ist die Bushaltestelle?",es:"¿Dónde está la parada de autobús?",fr:"Où est l'arrêt de bus ?",ar:"أين موقف الحافلة؟",tr:"Otobüs durağı nerede?",zh:"公交车站在哪里？"}},
  {id:237,category:"directions",level:"A1",t:{fa:"این خیابون به کجا میره؟",en:"Where does this street go?",de:"Wohin führt diese Straße?",es:"¿A dónde va esta calle?",fr:"Où va cette rue ?",ar:"إلى أين يؤدي هذا الشارع؟",tr:"Bu sokak nereye çıkıyor?",zh:"这条街通往哪里？"}},
  {id:238,category:"directions",level:"A1",t:{fa:"می‌تونی همراهیم کنی؟",en:"Can you walk with me?",de:"Können Sie mich begleiten?",es:"¿Puede acompañarme?",fr:"Pouvez-vous m'accompagner ?",ar:"هل يمكنك مرافقتي؟",tr:"Bana eşlik edebilir misiniz?",zh:"你能陪我走吗？"}},
  {id:239,category:"emergency",level:"A1",t:{fa:"کمک!",en:"Help!",de:"Hilfe!",es:"¡Ayuda!",fr:"À l'aide !",ar:"النجدة!",tr:"İmdat!",zh:"救命！"}},
  {id:240,category:"emergency",level:"A1",t:{fa:"زنگ بزن اورژانس",en:"Call an ambulance",de:"Rufen Sie einen Krankenwagen",es:"Llame a una ambulancia",fr:"Appelez une ambulance",ar:"اتصل بسيارة إسعاف",tr:"Ambulans çağırın",zh:"叫救护车"}},
  {id:241,category:"emergency",level:"A1",t:{fa:"زنگ بزن پلیس",en:"Call the police",de:"Rufen Sie die Polizei",es:"Llame a la policía",fr:"Appelez la police",ar:"اتصل بالشرطة",tr:"Polisi arayın",zh:"叫警察"}},
  {id:242,category:"emergency",level:"A1",t:{fa:"آتیش‌نشانی رو خبر کن",en:"Call the fire department",de:"Rufen Sie die Feuerwehr",es:"Llame a los bomberos",fr:"Appelez les pompiers",ar:"اتصل بالإطفاء",tr:"İtfaiyeyi arayın",zh:"叫消防队"}},
  {id:243,category:"emergency",level:"A1",t:{fa:"من مریضم",en:"I'm sick",de:"Ich bin krank",es:"Estoy enfermo",fr:"Je suis malade",ar:"أنا مريض",tr:"Hastayım",zh:"我生病了"}},
  {id:244,category:"emergency",level:"A1",t:{fa:"دردم میاد",en:"I'm in pain",de:"Ich habe Schmerzen",es:"Tengo dolor",fr:"J'ai mal",ar:"أشعر بالألم",tr:"Ağrım var",zh:"我很痛"}},
  {id:245,category:"emergency",level:"A1",t:{fa:"سرم درد می‌کنه",en:"My head hurts",de:"Mein Kopf tut weh",es:"Me duele la cabeza",fr:"J'ai mal à la tête",ar:"رأسي يؤلمني",tr:"Başım ağrıyor",zh:"我头疼"}},
  {id:246,category:"emergency",level:"A1",t:{fa:"شکمم درد می‌کنه",en:"My stomach hurts",de:"Mein Magen tut weh",es:"Me duele el estómago",fr:"J'ai mal au ventre",ar:"بطني يؤلمني",tr:"Karnım ağrıyor",zh:"我肚子疼"}},
  {id:247,category:"emergency",level:"A1",t:{fa:"تصادف شده",en:"There's been an accident",de:"Es gab einen Unfall",es:"Ha habido un accidente",fr:"Il y a eu un accident",ar:"وقع حادث",tr:"Bir kaza oldu",zh:"发生事故了"}},
  {id:248,category:"emergency",level:"A1",t:{fa:"دزد!",en:"Thief!",de:"Dieb!",es:"¡Ladrón!",fr:"Au voleur !",ar:"لص!",tr:"Hırsız!",zh:"小偷！"}},
  {id:249,category:"emergency",level:"A1",t:{fa:"کیفم دزدیده شد",en:"My bag was stolen",de:"Meine Tasche wurde gestohlen",es:"Me robaron la maleta",fr:"On m'a volé mon sac",ar:"سُرقت حقيبتي",tr:"Çantam çalındı",zh:"我的包被偷了"}},
  {id:250,category:"emergency",level:"A1",t:{fa:"آتیش!",en:"Fire!",de:"Feuer!",es:"¡Fuego!",fr:"Au feu !",ar:"حريق!",tr:"Yangın!",zh:"着火了！"}},
  {id:251,category:"emergency",level:"A1",t:{fa:"مواظب باش!",en:"Watch out!",de:"Vorsicht!",es:"¡Cuidado!",fr:"Attention !",ar:"احذر!",tr:"Dikkat et!",zh:"小心！"}},
  {id:252,category:"emergency",level:"A1",t:{fa:"خطرناکه",en:"It's dangerous",de:"Es ist gefährlich",es:"Es peligroso",fr:"C'est dangereux",ar:"إنه خطير",tr:"Bu tehlikeli",zh:"这很危险"}},
  {id:253,category:"emergency",level:"A1",t:{fa:"داروم رو نیاز دارم",en:"I need my medicine",de:"Ich brauche meine Medizin",es:"Necesito mi medicina",fr:"J'ai besoin de mon médicament",ar:"أحتاج دوائي",tr:"İlacıma ihtiyacım var",zh:"我需要我的药"}},
  {id:254,category:"emergency",level:"A1",t:{fa:"نزدیک‌ترین بیمارستان کجاست؟",en:"Where is the nearest hospital?",de:"Wo ist das nächste Krankenhaus?",es:"¿Dónde está el hospital más cercano?",fr:"Où est l'hôpital le plus proche ?",ar:"أين أقرب مستشفى؟",tr:"En yakın hastane nerede?",zh:"最近的医院在哪里？"}},
  {id:255,category:"numbers",level:"A1",t:{fa:"یک",en:"One",de:"Eins",es:"Uno",fr:"Un",ar:"واحد",tr:"Bir",zh:"一"}},
  {id:256,category:"numbers",level:"A1",t:{fa:"دو",en:"Two",de:"Zwei",es:"Dos",fr:"Deux",ar:"اثنان",tr:"İki",zh:"二"}},
  {id:257,category:"numbers",level:"A1",t:{fa:"سه",en:"Three",de:"Drei",es:"Tres",fr:"Trois",ar:"ثلاثة",tr:"Üç",zh:"三"}},
  {id:258,category:"numbers",level:"A1",t:{fa:"چهار",en:"Four",de:"Vier",es:"Cuatro",fr:"Quatre",ar:"أربعة",tr:"Dört",zh:"四"}},
  {id:259,category:"numbers",level:"A1",t:{fa:"پنج",en:"Five",de:"Fünf",es:"Cinco",fr:"Cinq",ar:"خمسة",tr:"Beş",zh:"五"}},
  {id:260,category:"numbers",level:"A1",t:{fa:"شش",en:"Six",de:"Sechs",es:"Seis",fr:"Six",ar:"ستة",tr:"Altı",zh:"六"}},
  {id:261,category:"numbers",level:"A1",t:{fa:"هفت",en:"Seven",de:"Sieben",es:"Siete",fr:"Sept",ar:"سبعة",tr:"Yedi",zh:"七"}},
  {id:262,category:"numbers",level:"A1",t:{fa:"هشت",en:"Eight",de:"Acht",es:"Ocho",fr:"Huit",ar:"ثمانية",tr:"Sekiz",zh:"八"}},
  {id:263,category:"numbers",level:"A1",t:{fa:"نه",en:"Nine",de:"Neun",es:"Nueve",fr:"Neuf",ar:"تسعة",tr:"Dokuz",zh:"九"}},
  {id:264,category:"numbers",level:"A1",t:{fa:"ده",en:"Ten",de:"Zehn",es:"Diez",fr:"Dix",ar:"عشرة",tr:"On",zh:"十"}},
  {id:265,category:"numbers",level:"A1",t:{fa:"ساعت چنده؟",en:"What time is it?",de:"Wie spät ist es?",es:"¿Qué hora es?",fr:"Quelle heure est-il ?",ar:"كم الساعة؟",tr:"Saat kaç?",zh:"几点了？"}},
  {id:266,category:"numbers",level:"A1",t:{fa:"امروز",en:"Today",de:"Heute",es:"Hoy",fr:"Aujourd'hui",ar:"اليوم",tr:"Bugün",zh:"今天"}},
  {id:267,category:"numbers",level:"A1",t:{fa:"فردا",en:"Tomorrow",de:"Morgen",es:"Mañana",fr:"Demain",ar:"غدًا",tr:"Yarın",zh:"明天"}},
  {id:268,category:"numbers",level:"A1",t:{fa:"دیروز",en:"Yesterday",de:"Gestern",es:"Ayer",fr:"Hier",ar:"أمس",tr:"Dün",zh:"昨天"}},
  {id:269,category:"numbers",level:"A1",t:{fa:"الان",en:"Now",de:"Jetzt",es:"Ahora",fr:"Maintenant",ar:"الآن",tr:"Şimdi",zh:"现在"}},
  {id:270,category:"numbers",level:"A1",t:{fa:"بعداً",en:"Later",de:"Später",es:"Más tarde",fr:"Plus tard",ar:"لاحقًا",tr:"Sonra",zh:"稍后"}},
  {id:271,category:"greetings",level:"A1",t:{fa:"امروز هوا چطوره؟",en:"How's the weather today?",de:"Wie ist das Wetter heute?",es:"¿Cómo está el clima hoy?",fr:"Quel temps fait-il aujourd'hui ?",ar:"كيف الطقس اليوم؟",tr:"Bugün hava nasıl?",zh:"今天天气怎么样？"}},
  {id:272,category:"greetings",level:"A1",t:{fa:"هوا آفتابیه",en:"It's sunny",de:"Es ist sonnig",es:"Está soleado",fr:"Il fait soleil",ar:"الجو مشمس",tr:"Hava güneşli",zh:"天气晴朗"}},
  {id:273,category:"greetings",level:"A1",t:{fa:"هوا بارونیه",en:"It's rainy",de:"Es regnet",es:"Está lloviendo",fr:"Il pleut",ar:"إنها ممطرة",tr:"Hava yağmurlu",zh:"在下雨"}},
  {id:274,category:"greetings",level:"A1",t:{fa:"برادر دارم",en:"I have a brother",de:"Ich habe einen Bruder",es:"Tengo un hermano",fr:"J'ai un frère",ar:"لدي أخ",tr:"Erkek kardeşim var",zh:"我有一个哥哥"}},
  {id:275,category:"greetings",level:"A1",t:{fa:"خواهر دارم",en:"I have a sister",de:"Ich habe eine Schwester",es:"Tengo una hermana",fr:"J'ai une sœur",ar:"لدي أخت",tr:"Kız kardeşim var",zh:"我有一个姐姐"}},
  {id:276,category:"greetings",level:"A1",t:{fa:"با تلفن صحبت می‌کنم",en:"I'm talking on the phone",de:"Ich telefoniere",es:"Estoy hablando por teléfono",fr:"Je parle au téléphone",ar:"أتحدث على الهاتف",tr:"Telefonda konuşuyorum",zh:"我在打电话"}},
  {id:277,category:"greetings",level:"A1",t:{fa:"الو؟",en:"Hello? (on phone)",de:"Hallo? (am Telefon)",es:"¿Aló?",fr:"Allô ?",ar:"ألو؟",tr:"Alo?",zh:"喂？"}},
  {id:278,category:"greetings",level:"A1",t:{fa:"بعداً بهت زنگ می‌زنم",en:"I'll call you later",de:"Ich rufe dich später an",es:"Te llamo más tarde",fr:"Je t'appelle plus tard",ar:"سأتصل بك لاحقًا",tr:"Seni sonra ararım",zh:"我稍后打给你"}},
  {id:279,category:"greetings",level:"A1",t:{fa:"شماره‌تو بهم بده",en:"Give me your number",de:"Gib mir deine Nummer",es:"Dame tu número",fr:"Donne-moi ton numéro",ar:"أعطني رقمك",tr:"Numaranı ver",zh:"把你的号码给我"}},
  {id:280,category:"greetings",level:"A1",t:{fa:"ایمیلت چیه؟",en:"What's your email?",de:"Wie lautet deine E-Mail?",es:"¿Cuál es tu correo electrónico?",fr:"Quelle est ton adresse e-mail ?",ar:"ما هو بريدك الإلكتروني؟",tr:"E-postan ne?",zh:"你的邮箱是什么？"}},
  {id:281,category:"airport",level:"A1",t:{fa:"می‌خوام صندلیمو مشخص کنم",en:"I want to select my seat",de:"Ich möchte meinen Sitzplatz auswählen",es:"Quiero seleccionar mi asiento",fr:"Je veux choisir mon siège",ar:"أريد اختيار مقعدي",tr:"Koltuğumu seçmek istiyorum",zh:"我想选座位"}},
  {id:282,category:"airport",level:"A1",t:{fa:"این پرواز مستقیمه؟",en:"Is this flight direct?",de:"Ist dieser Flug direkt?",es:"¿Este vuelo es directo?",fr:"Ce vol est-il direct ?",ar:"هل هذه الرحلة مباشرة؟",tr:"Bu uçuş direkt mi?",zh:"这是直飞航班吗？"}},
  {id:283,category:"airport",level:"A1",t:{fa:"چند تا توقف داره؟",en:"How many stops does it have?",de:"Wie viele Zwischenstopps hat es?",es:"¿Cuántas escalas tiene?",fr:"Combien d'escales a-t-il ?",ar:"كم عدد التوقفات؟",tr:"Kaç durağı var?",zh:"有几个中转站？"}},
  {id:284,category:"airport",level:"A1",t:{fa:"کیف دستی من اینه",en:"This is my carry-on",de:"Das ist mein Handgepäck",es:"Este es mi equipaje de mano",fr:"C'est mon bagage à main",ar:"هذه حقيبة يدي",tr:"Bu benim el bagajım",zh:"这是我的手提行李"}},
  {id:285,category:"airport",level:"A1",t:{fa:"نگهبانی امنیتی کجاست؟",en:"Where is security?",de:"Wo ist die Sicherheitskontrolle?",es:"¿Dónde está seguridad?",fr:"Où est la sécurité ?",ar:"أين الأمن؟",tr:"Güvenlik nerede?",zh:"安检在哪里？"}},
  {id:286,category:"airport",level:"A1",t:{fa:"باید کفشمو دربیارم؟",en:"Do I need to take off my shoes?",de:"Muss ich meine Schuhe ausziehen?",es:"¿Necesito quitarme los zapatos?",fr:"Dois-je enlever mes chaussures ?",ar:"هل يجب أن أخلع حذائي؟",tr:"Ayakkabılarımı çıkarmam gerekiyor mu?",zh:"我需要脱鞋吗？"}},
  {id:287,category:"airport",level:"A1",t:{fa:"لپ‌تاپمو دربیارم؟",en:"Should I take out my laptop?",de:"Soll ich meinen Laptop herausnehmen?",es:"¿Debo sacar mi portátil?",fr:"Dois-je sortir mon ordinateur portable ?",ar:"هل يجب أن أخرج جهاز الكمبيوتر المحمول؟",tr:"Dizüstü bilgisayarımı çıkarmalı mıyım?",zh:"我需要拿出笔记本电脑吗？"}},
  {id:288,category:"airport",level:"A1",t:{fa:"این مایعات مجازه؟",en:"Are these liquids allowed?",de:"Sind diese Flüssigkeiten erlaubt?",es:"¿Están permitidos estos líquidos?",fr:"Ces liquides sont-ils autorisés ?",ar:"هل هذه السوائل مسموح بها؟",tr:"Bu sıvılara izin veriliyor mu?",zh:"这些液体可以带吗？"}},
  {id:289,category:"airport",level:"A1",t:{fa:"سالن انتظار کجاست؟",en:"Where is the waiting lounge?",de:"Wo ist die Wartelounge?",es:"¿Dónde está la sala de espera?",fr:"Où est le salon d'attente ?",ar:"أين صالة الانتظار؟",tr:"Bekleme salonu nerede?",zh:"候机室在哪里？"}},
  {id:290,category:"airport",level:"A1",t:{fa:"اعلامیه‌ها رو کجا می‌بینم؟",en:"Where do I see the announcements?",de:"Wo sehe ich die Durchsagen?",es:"¿Dónde veo los anuncios?",fr:"Où puis-je voir les annonces ?",ar:"أين أرى الإعلانات؟",tr:"Duyuruları nerede görebilirim?",zh:"我在哪里看通知？"}},
  {id:291,category:"restaurant",level:"A1",t:{fa:"این چیه؟",en:"What is this?",de:"Was ist das?",es:"¿Qué es esto?",fr:"Qu'est-ce que c'est ?",ar:"ما هذا؟",tr:"Bu nedir?",zh:"这是什么？"}},
  {id:292,category:"restaurant",level:"A1",t:{fa:"این با چی درست شده؟",en:"What is this made of?",de:"Woraus besteht das?",es:"¿De qué está hecho esto?",fr:"De quoi est-ce fait ?",ar:"مما صنع هذا؟",tr:"Bu neden yapılmış?",zh:"这是用什么做的？"}},
  {id:293,category:"restaurant",level:"A1",t:{fa:"غذای محلی چیه؟",en:"What is the local food?",de:"Was ist das lokale Essen?",es:"¿Cuál es la comida local?",fr:"Quelle est la nourriture locale ?",ar:"ما هو الطعام المحلي؟",tr:"Yerel yemek nedir?",zh:"当地的食物是什么？"}},
  {id:294,category:"restaurant",level:"A1",t:{fa:"پیتزا می‌خوام",en:"I want pizza",de:"Ich möchte Pizza",es:"Quiero pizza",fr:"Je veux une pizza",ar:"أريد بيتزا",tr:"Pizza istiyorum",zh:"我想要披萨"}},
  {id:295,category:"restaurant",level:"A1",t:{fa:"سالاد می‌خوام",en:"I want a salad",de:"Ich möchte einen Salat",es:"Quiero una ensalada",fr:"Je veux une salade",ar:"أريد سلطة",tr:"Salata istiyorum",zh:"我想要沙拉"}},
  {id:296,category:"restaurant",level:"A1",t:{fa:"سوپ می‌خوام",en:"I want soup",de:"Ich möchte Suppe",es:"Quiero sopa",fr:"Je veux de la soupe",ar:"أريد حساء",tr:"Çorba istiyorum",zh:"我想要汤"}},
  {id:297,category:"restaurant",level:"A1",t:{fa:"مرغ می‌خوام",en:"I want chicken",de:"Ich möchte Hähnchen",es:"Quiero pollo",fr:"Je veux du poulet",ar:"أريد دجاج",tr:"Tavuk istiyorum",zh:"我想要鸡肉"}},
  {id:298,category:"restaurant",level:"A1",t:{fa:"ماهی می‌خوام",en:"I want fish",de:"Ich möchte Fisch",es:"Quiero pescado",fr:"Je veux du poisson",ar:"أريد سمك",tr:"Balık istiyorum",zh:"我想要鱼"}},
  {id:299,category:"restaurant",level:"A1",t:{fa:"میوه دارید؟",en:"Do you have fruit?",de:"Haben Sie Obst?",es:"¿Tienen fruta?",fr:"Avez-vous des fruits ?",ar:"هل لديكم فاكهة؟",tr:"Meyveniz var mı?",zh:"你们有水果吗？"}},
  {id:300,category:"restaurant",level:"A1",t:{fa:"آب‌پرتقال لطفاً",en:"Orange juice, please",de:"Orangensaft, bitte",es:"Zumo de naranja, por favor",fr:"Du jus d'orange, s'il vous plaît",ar:"عصير برتقال، من فضلك",tr:"Portakal suyu, lütfen",zh:"请给我橙汁"}},
  {id:301,category:"restaurant",level:"A1",t:{fa:"بستنی می‌خوام",en:"I want ice cream",de:"Ich möchte Eis",es:"Quiero helado",fr:"Je veux une glace",ar:"أريد آيس كريم",tr:"Dondurma istiyorum",zh:"我想要冰淇淋"}},
  {id:302,category:"restaurant",level:"A1",t:{fa:"کیک می‌خوام",en:"I want cake",de:"Ich möchte Kuchen",es:"Quiero pastel",fr:"Je veux du gâteau",ar:"أريد كعكة",tr:"Pasta istiyorum",zh:"我想要蛋糕"}},
  {id:303,category:"restaurant",level:"A1",t:{fa:"این تازه‌ست؟",en:"Is this fresh?",de:"Ist das frisch?",es:"¿Esto está fresco?",fr:"Est-ce frais ?",ar:"هل هذا طازج؟",tr:"Bu taze mi?",zh:"这个新鲜吗？"}},
  {id:304,category:"restaurant",level:"A1",t:{fa:"این خیلی شوره",en:"This is too salty",de:"Das ist zu salzig",es:"Esto está muy salado",fr:"C'est trop salé",ar:"هذا مالح جدًا",tr:"Bu çok tuzlu",zh:"这个太咸了"}},
  {id:305,category:"restaurant",level:"A1",t:{fa:"این خیلی تنده",en:"This is too spicy",de:"Das ist zu scharf",es:"Esto está muy picante",fr:"C'est trop épicé",ar:"هذا حار جدًا",tr:"Bu çok acı",zh:"这个太辣了"}},
  {id:306,category:"shopping",level:"A1",t:{fa:"این جنسش چیه؟",en:"What is this made of?",de:"Aus welchem Material ist das?",es:"¿De qué material es esto?",fr:"En quelle matière est-ce ?",ar:"من أي مادة صنع هذا؟",tr:"Bu neden yapılmış?",zh:"这是什么材质的？"}},
  {id:307,category:"shopping",level:"A1",t:{fa:"پارچه‌اش پنبه‌ست؟",en:"Is the fabric cotton?",de:"Ist der Stoff Baumwolle?",es:"¿La tela es de algodón?",fr:"Le tissu est-il en coton ?",ar:"هل القماش قطن؟",tr:"Kumaş pamuk mu?",zh:"这个面料是棉的吗？"}},
  {id:308,category:"shopping",level:"A1",t:{fa:"دنبال یه پیراهن می‌گردم",en:"I'm looking for a shirt",de:"Ich suche ein Hemd",es:"Busco una camisa",fr:"Je cherche une chemise",ar:"أبحث عن قميص",tr:"Gömlek arıyorum",zh:"我在找衬衫"}},
  {id:309,category:"shopping",level:"A1",t:{fa:"دنبال یه شلوار می‌گردم",en:"I'm looking for pants",de:"Ich suche eine Hose",es:"Busco unos pantalones",fr:"Je cherche un pantalon",ar:"أبحث عن بنطال",tr:"Pantolon arıyorum",zh:"我在找裤子"}},
  {id:310,category:"shopping",level:"A1",t:{fa:"کلاه می‌خوام",en:"I want a hat",de:"Ich möchte einen Hut",es:"Quiero un sombrero",fr:"Je veux un chapeau",ar:"أريد قبعة",tr:"Şapka istiyorum",zh:"我想要帽子"}},
  {id:311,category:"shopping",level:"A1",t:{fa:"عینک آفتابی می‌خوام",en:"I want sunglasses",de:"Ich möchte eine Sonnenbrille",es:"Quiero gafas de sol",fr:"Je veux des lunettes de soleil",ar:"أريد نظارة شمسية",tr:"Güneş gözlüğü istiyorum",zh:"我想要太阳镜"}},
  {id:312,category:"shopping",level:"A1",t:{fa:"ساعت مچی می‌خوام",en:"I want a wristwatch",de:"Ich möchte eine Armbanduhr",es:"Quiero un reloj de pulsera",fr:"Je veux une montre",ar:"أريد ساعة يد",tr:"Kol saati istiyorum",zh:"我想要手表"}},
  {id:313,category:"shopping",level:"A1",t:{fa:"سوغاتی می‌خوام",en:"I want a souvenir",de:"Ich möchte ein Souvenir",es:"Quiero un recuerdo",fr:"Je veux un souvenir",ar:"أريد تذكارًا",tr:"Hediyelik eşya istiyorum",zh:"我想要纪念品"}},
  {id:314,category:"shopping",level:"A1",t:{fa:"این دست‌سازه؟",en:"Is this handmade?",de:"Ist das handgemacht?",es:"¿Esto es hecho a mano?",fr:"Est-ce fait main ?",ar:"هل هذا مصنوع يدويًا؟",tr:"Bu el yapımı mı?",zh:"这是手工做的吗？"}},
  {id:315,category:"shopping",level:"A1",t:{fa:"بسته‌بندی هدیه دارید؟",en:"Do you have gift wrapping?",de:"Bieten Sie Geschenkverpackung an?",es:"¿Tienen envoltorio para regalo?",fr:"Faites-vous l'emballage cadeau ?",ar:"هل لديكم تغليف هدايا؟",tr:"Hediye paketiniz var mı?",zh:"你们有礼品包装吗？"}},
  {id:316,category:"shopping",level:"A1",t:{fa:"این سالمه یا معیوب؟",en:"Is this in good condition?",de:"Ist das in gutem Zustand?",es:"¿Está en buen estado?",fr:"Est-ce en bon état ?",ar:"هل هذا بحالة جيدة؟",tr:"Bu iyi durumda mı?",zh:"这个状态好吗？"}},
  {id:317,category:"shopping",level:"A1",t:{fa:"کارت هدیه دارید؟",en:"Do you have gift cards?",de:"Haben Sie Geschenkkarten?",es:"¿Tienen tarjetas de regalo?",fr:"Avez-vous des cartes cadeaux ?",ar:"هل لديكم بطاقات هدايا؟",tr:"Hediye kartınız var mı?",zh:"你们有礼品卡吗？"}},
  {id:318,category:"shopping",level:"A1",t:{fa:"بازار محلی کجاست؟",en:"Where is the local market?",de:"Wo ist der lokale Markt?",es:"¿Dónde está el mercado local?",fr:"Où est le marché local ?",ar:"أين السوق المحلي؟",tr:"Yerel pazar nerede?",zh:"当地市场在哪里？"}},
  {id:319,category:"shopping",level:"A1",t:{fa:"مرکز خرید کجاست؟",en:"Where is the shopping mall?",de:"Wo ist das Einkaufszentrum?",es:"¿Dónde está el centro comercial?",fr:"Où est le centre commercial ?",ar:"أين مركز التسوق؟",tr:"AVM nerede?",zh:"购物中心在哪里？"}},
  {id:320,category:"shopping",level:"A1",t:{fa:"این محصول تضمین داره؟",en:"Does this product have a warranty?",de:"Hat dieses Produkt eine Garantie?",es:"¿Este producto tiene garantía?",fr:"Ce produit a-t-il une garantie ?",ar:"هل لهذا المنتج ضمان؟",tr:"Bu ürünün garantisi var mı?",zh:"这个产品有保修吗？"}},
  {id:321,category:"hotel",level:"A1",t:{fa:"اتاق سه تخته می‌خوام",en:"I want a triple room",de:"Ich möchte ein Dreibettzimmer",es:"Quiero una habitación triple",fr:"Je veux une chambre triple",ar:"أريد غرفة ثلاثية",tr:"Üç kişilik oda istiyorum",zh:"我想要三人间"}},
  {id:322,category:"hotel",level:"A1",t:{fa:"اتاق با ویو دریا می‌خوام",en:"I want a room with a sea view",de:"Ich möchte ein Zimmer mit Meerblick",es:"Quiero una habitación con vista al mar",fr:"Je veux une chambre avec vue sur mer",ar:"أريد غرفة بإطلالة على البحر",tr:"Deniz manzaralı oda istiyorum",zh:"我想要海景房"}},
  {id:323,category:"hotel",level:"A1",t:{fa:"اتاق آرام می‌خوام",en:"I want a quiet room",de:"Ich möchte ein ruhiges Zimmer",es:"Quiero una habitación tranquila",fr:"Je veux une chambre calme",ar:"أريد غرفة هادئة",tr:"Sessiz bir oda istiyorum",zh:"我想要安静的房间"}},
  {id:324,category:"hotel",level:"A1",t:{fa:"صبحونه شامل قیمته؟",en:"Is breakfast included in the price?",de:"Ist das Frühstück im Preis inbegriffen?",es:"¿El desayuno está incluido en el precio?",fr:"Le petit-déjeuner est-il inclus ?",ar:"هل الإفطار مشمول بالسعر؟",tr:"Kahvaltı fiyata dahil mi?",zh:"早餐包含在价格里吗？"}},
  {id:325,category:"hotel",level:"A1",t:{fa:"اتاق سیگاری می‌خوام",en:"I want a smoking room",de:"Ich möchte ein Raucherzimmer",es:"Quiero una habitación para fumadores",fr:"Je veux une chambre fumeur",ar:"أريد غرفة للمدخنين",tr:"Sigara içilen oda istiyorum",zh:"我想要吸烟房"}},
  {id:326,category:"hotel",level:"A1",t:{fa:"اتاق غیرسیگاری می‌خوام",en:"I want a non-smoking room",de:"Ich möchte ein Nichtraucherzimmer",es:"Quiero una habitación para no fumadores",fr:"Je veux une chambre non-fumeur",ar:"أريد غرفة لغير المدخنين",tr:"Sigara içilmeyen oda istiyorum",zh:"我想要无烟房"}},
  {id:327,category:"hotel",level:"A1",t:{fa:"اتاق رو تغییر بدید؟",en:"Can you change the room?",de:"Können Sie das Zimmer wechseln?",es:"¿Puede cambiar la habitación?",fr:"Pouvez-vous changer la chambre ?",ar:"هل يمكنكم تغيير الغرفة؟",tr:"Odayı değiştirebilir misiniz?",zh:"可以换房间吗？"}},
  {id:328,category:"hotel",level:"A1",t:{fa:"خدمات اتاق دارید؟",en:"Do you have room service?",de:"Haben Sie Zimmerservice?",es:"¿Tienen servicio a la habitación?",fr:"Avez-vous le service en chambre ?",ar:"هل لديكم خدمة الغرف؟",tr:"Oda servisiniz var mı?",zh:"你们有客房服务吗？"}},
  {id:329,category:"hotel",level:"A1",t:{fa:"کولر کار نمی‌کنه",en:"The air conditioner isn't working",de:"Die Klimaanlage funktioniert nicht",es:"El aire acondicionado no funciona",fr:"La climatisation ne fonctionne pas",ar:"المكيف لا يعمل",tr:"Klima çalışmıyor",zh:"空调坏了"}},
  {id:330,category:"hotel",level:"A1",t:{fa:"بخاری کار نمی‌کنه",en:"The heater isn't working",de:"Die Heizung funktioniert nicht",es:"La calefacción no funciona",fr:"Le chauffage ne fonctionne pas",ar:"التدفئة لا تعمل",tr:"Kalorifer çalışmıyor",zh:"暖气坏了"}},
  {id:331,category:"hotel",level:"A1",t:{fa:"اتاق کثیفه",en:"The room is dirty",de:"Das Zimmer ist schmutzig",es:"La habitación está sucia",fr:"La chambre est sale",ar:"الغرفة متسخة",tr:"Oda kirli",zh:"房间很脏"}},
  {id:332,category:"hotel",level:"A1",t:{fa:"می‌شه نظافت کنید؟",en:"Can you clean it?",de:"Können Sie es reinigen?",es:"¿Puede limpiarlo?",fr:"Pouvez-vous le nettoyer ?",ar:"هل يمكنك تنظيفه؟",tr:"Temizleyebilir misiniz?",zh:"可以打扫一下吗？"}},
  {id:333,category:"hotel",level:"A1",t:{fa:"چمدونمو نگه‌دار می‌کنید؟",en:"Can you keep my luggage?",de:"Können Sie mein Gepäck aufbewahren?",es:"¿Puede guardar mi equipaje?",fr:"Pouvez-vous garder mes bagages ?",ar:"هل يمكنكم الاحتفاظ بأمتعتي؟",tr:"Bagajımı tutabilir misiniz?",zh:"可以帮我保管行李吗？"}},
  {id:334,category:"hotel",level:"A1",t:{fa:"زودتر می‌تونم چک‌این کنم؟",en:"Can I check in earlier?",de:"Kann ich früher einchecken?",es:"¿Puedo hacer check-in antes?",fr:"Puis-je m'enregistrer plus tôt ?",ar:"هل يمكنني تسجيل الوصول مبكرًا؟",tr:"Daha erken check-in yapabilir miyim?",zh:"我可以提前入住吗？"}},
  {id:335,category:"hotel",level:"A1",t:{fa:"دیرتر می‌تونم چک‌اوت کنم؟",en:"Can I check out later?",de:"Kann ich später auschecken?",es:"¿Puedo hacer check-out más tarde?",fr:"Puis-je régler ma note plus tard ?",ar:"هل يمكنني تسجيل المغادرة لاحقًا؟",tr:"Daha geç check-out yapabilir miyim?",zh:"我可以晚点退房吗？"}},
  {id:336,category:"directions",level:"A1",t:{fa:"این نزدیک‌ترین راهه؟",en:"Is this the nearest way?",de:"Ist das der nächste Weg?",es:"¿Es este el camino más corto?",fr:"Est-ce le chemin le plus proche ?",ar:"هل هذا أقرب طريق؟",tr:"Bu en yakın yol mu?",zh:"这是最近的路吗？"}},
  {id:337,category:"directions",level:"A1",t:{fa:"پیاده‌رو کجاست؟",en:"Where is the sidewalk?",de:"Wo ist der Gehweg?",es:"¿Dónde está la acera?",fr:"Où est le trottoir ?",ar:"أين الرصيف؟",tr:"Kaldırım nerede?",zh:"人行道在哪里？"}},
  {id:338,category:"directions",level:"A1",t:{fa:"میدون اصلی کجاست؟",en:"Where is the main square?",de:"Wo ist der Hauptplatz?",es:"¿Dónde está la plaza principal?",fr:"Où est la place principale ?",ar:"أين الساحة الرئيسية؟",tr:"Ana meydan nerede?",zh:"主广场在哪里？"}},
  {id:339,category:"directions",level:"A1",t:{fa:"موزه کجاست؟",en:"Where is the museum?",de:"Wo ist das Museum?",es:"¿Dónde está el museo?",fr:"Où est le musée ?",ar:"أين المتحف؟",tr:"Müze nerede?",zh:"博物馆在哪里？"}},
  {id:340,category:"directions",level:"A1",t:{fa:"کتابخونه کجاست؟",en:"Where is the library?",de:"Wo ist die Bibliothek?",es:"¿Dónde está la biblioteca?",fr:"Où est la bibliothèque ?",ar:"أين المكتبة؟",tr:"Kütüphane nerede?",zh:"图书馆在哪里？"}},
  {id:341,category:"directions",level:"A1",t:{fa:"پارک کجاست؟",en:"Where is the park?",de:"Wo ist der Park?",es:"¿Dónde está el parque?",fr:"Où est le parc ?",ar:"أين الحديقة؟",tr:"Park nerede?",zh:"公园在哪里？"}},
  {id:342,category:"directions",level:"A1",t:{fa:"ساحل کجاست؟",en:"Where is the beach?",de:"Wo ist der Strand?",es:"¿Dónde está la playa?",fr:"Où est la plage ?",ar:"أين الشاطئ؟",tr:"Plaj nerede?",zh:"海滩在哪里？"}},
  {id:343,category:"directions",level:"A1",t:{fa:"کوه کجاست؟",en:"Where is the mountain?",de:"Wo ist der Berg?",es:"¿Dónde está la montaña?",fr:"Où est la montagne ?",ar:"أين الجبل؟",tr:"Dağ nerede?",zh:"山在哪里？"}},
  {id:344,category:"directions",level:"A1",t:{fa:"خیابون اصلی کدومه؟",en:"Which is the main street?",de:"Welche ist die Hauptstraße?",es:"¿Cuál es la calle principal?",fr:"Quelle est la rue principale ?",ar:"ما هو الشارع الرئيسي؟",tr:"Ana cadde hangisi?",zh:"主街是哪条？"}},
  {id:345,category:"directions",level:"A1",t:{fa:"می‌تونم پیاده برم اونجا؟",en:"Can I walk there?",de:"Kann ich zu Fuß dorthin gehen?",es:"¿Puedo caminar hasta allí?",fr:"Puis-je y aller à pied ?",ar:"هل يمكنني السير إلى هناك؟",tr:"Oraya yürüyerek gidebilir miyim?",zh:"我可以走着去吗？"}},
  {id:346,category:"emergency",level:"A1",t:{fa:"خونریزی دارم",en:"I'm bleeding",de:"Ich blute",es:"Estoy sangrando",fr:"Je saigne",ar:"أنا أنزف",tr:"Kanıyorum",zh:"我在流血"}},
  {id:347,category:"emergency",level:"A1",t:{fa:"نفس نمی‌کشه",en:"He/She isn't breathing",de:"Er/Sie atmet nicht",es:"No respira",fr:"Il/Elle ne respire pas",ar:"هو/هي لا يتنفس",tr:"Nefes almıyor",zh:"他/她没有呼吸"}},
  {id:348,category:"emergency",level:"A1",t:{fa:"بیهوش شده",en:"He/She has fainted",de:"Er/Sie ist ohnmächtig geworden",es:"Se ha desmayado",fr:"Il/Elle s'est évanoui(e)",ar:"لقد أُغمي عليه/عليها",tr:"Bayıldı",zh:"他/她昏倒了"}},
  {id:349,category:"emergency",level:"A1",t:{fa:"استخوانم شکسته",en:"My bone is broken",de:"Mein Knochen ist gebrochen",es:"Tengo un hueso roto",fr:"J'ai un os cassé",ar:"عظمي مكسور",tr:"Kemiğim kırık",zh:"我的骨头断了"}},
  {id:350,category:"emergency",level:"A1",t:{fa:"به دارو حساسیت دارم",en:"I'm allergic to medicine",de:"Ich bin allergisch gegen Medikamente",es:"Soy alérgico a medicamentos",fr:"Je suis allergique aux médicaments",ar:"أنا حساس من الأدوية",tr:"İlaç alerjim var",zh:"我对药物过敏"}},
  {id:351,category:"emergency",level:"A1",t:{fa:"بیمه دارم",en:"I have insurance",de:"Ich habe eine Versicherung",es:"Tengo seguro",fr:"J'ai une assurance",ar:"لدي تأمين",tr:"Sigortam var",zh:"我有保险"}},
  {id:352,category:"emergency",level:"A1",t:{fa:"نزدیک‌ترین داروخانه کجاست؟",en:"Where is the nearest pharmacy?",de:"Wo ist die nächste Apotheke?",es:"¿Dónde está la farmacia más cercana?",fr:"Où est la pharmacie la plus proche ?",ar:"أين أقرب صيدلية؟",tr:"En yakın eczane nerede?",zh:"最近的药店在哪里？"}},
  {id:353,category:"emergency",level:"A1",t:{fa:"زنگ بزن سفارتم",en:"Call my embassy",de:"Rufen Sie meine Botschaft an",es:"Llame a mi embajada",fr:"Appelez mon ambassade",ar:"اتصل بسفارتي",tr:"Büyükelçiliğimi arayın",zh:"请联系我的大使馆"}},
  {id:354,category:"numbers",level:"A1",t:{fa:"یازده",en:"Eleven",de:"Elf",es:"Once",fr:"Onze",ar:"أحد عشر",tr:"On bir",zh:"十一"}},
  {id:355,category:"numbers",level:"A1",t:{fa:"دوازده",en:"Twelve",de:"Zwölf",es:"Doce",fr:"Douze",ar:"اثنا عشر",tr:"On iki",zh:"十二"}},
  {id:356,category:"numbers",level:"A1",t:{fa:"بیست",en:"Twenty",de:"Zwanzig",es:"Veinte",fr:"Vingt",ar:"عشرون",tr:"Yirmi",zh:"二十"}},
  {id:357,category:"numbers",level:"A1",t:{fa:"سی",en:"Thirty",de:"Dreißig",es:"Treinta",fr:"Trente",ar:"ثلاثون",tr:"Otuz",zh:"三十"}},
  {id:358,category:"numbers",level:"A1",t:{fa:"صد",en:"One hundred",de:"Hundert",es:"Cien",fr:"Cent",ar:"مئة",tr:"Yüz",zh:"一百"}},
  {id:359,category:"numbers",level:"A1",t:{fa:"دوشنبه",en:"Monday",de:"Montag",es:"Lunes",fr:"Lundi",ar:"الإثنين",tr:"Pazartesi",zh:"星期一"}},
  {id:360,category:"numbers",level:"A1",t:{fa:"سه‌شنبه",en:"Tuesday",de:"Dienstag",es:"Martes",fr:"Mardi",ar:"الثلاثاء",tr:"Salı",zh:"星期二"}},
  {id:361,category:"numbers",level:"A1",t:{fa:"جمعه",en:"Friday",de:"Freitag",es:"Viernes",fr:"Vendredi",ar:"الجمعة",tr:"Cuma",zh:"星期五"}},
  {id:362,category:"numbers",level:"A1",t:{fa:"این هفته",en:"This week",de:"Diese Woche",es:"Esta semana",fr:"Cette semaine",ar:"هذا الأسبوع",tr:"Bu hafta",zh:"这周"}},
  {id:363,category:"numbers",level:"A1",t:{fa:"ماه بعد",en:"Next month",de:"Nächsten Monat",es:"El próximo mes",fr:"Le mois prochain",ar:"الشهر المقبل",tr:"Gelecek ay",zh:"下个月"}},
  {id:364,category:"greetings",level:"A1",t:{fa:"بفرمایید بشینید",en:"Please sit down",de:"Bitte setzen Sie sich",es:"Por favor, siéntese",fr:"Asseyez-vous, s'il vous plaît",ar:"تفضل بالجلوس",tr:"Lütfen oturun",zh:"请坐"}},
  {id:365,category:"greetings",level:"A1",t:{fa:"بفرمایید داخل",en:"Please come in",de:"Bitte kommen Sie herein",es:"Por favor, pase",fr:"Entrez, s'il vous plaît",ar:"تفضل بالدخول",tr:"Lütfen içeri girin",zh:"请进"}},
  {id:366,category:"greetings",level:"A1",t:{fa:"خوش اومدی",en:"Welcome",de:"Willkommen",es:"Bienvenido",fr:"Bienvenue",ar:"أهلاً وسهلاً",tr:"Hoş geldin",zh:"欢迎"}},
  {id:367,category:"greetings",level:"A1",t:{fa:"خوش گذشت",en:"It was fun",de:"Es hat Spaß gemacht",es:"Fue divertido",fr:"C'était amusant",ar:"كان ممتعًا",tr:"Eğlenceliydi",zh:"很开心"}},
  {id:368,category:"greetings",level:"A1",t:{fa:"دلم برات تنگ شده",en:"I miss you",de:"Ich vermisse dich",es:"Te extraño",fr:"Tu me manques",ar:"أفتقدك",tr:"Seni özledim",zh:"我想你"}},
  {id:369,category:"greetings",level:"A1",t:{fa:"مراقب خودت باش",en:"Take care of yourself",de:"Pass auf dich auf",es:"Cuídate",fr:"Prends soin de toi",ar:"اعتنِ بنفسك",tr:"Kendine iyi bak",zh:"照顾好自己"}},
  {id:370,category:"airport",level:"A1",t:{fa:"پرواز من به مقصد لندنه",en:"My flight is to London",de:"Mein Flug geht nach London",es:"Mi vuelo es a Londres",fr:"Mon vol est pour Londres",ar:"رحلتي إلى لندن",tr:"Uçuşum Londra'ya",zh:"我的航班是去伦敦的"}},
  {id:371,category:"airport",level:"A1",t:{fa:"شماره پروازم اینه",en:"This is my flight number",de:"Das ist meine Flugnummer",es:"Este es mi número de vuelo",fr:"Voici mon numéro de vol",ar:"هذا رقم رحلتي",tr:"Bu benim uçuş numaram",zh:"这是我的航班号"}},
  {id:372,category:"airport",level:"A1",t:{fa:"می‌تونم زودتر برم؟",en:"Can I go earlier?",de:"Kann ich früher gehen?",es:"¿Puedo ir antes?",fr:"Puis-je y aller plus tôt ?",ar:"هل يمكنني الذهاب مبكرًا؟",tr:"Daha erken gidebilir miyim?",zh:"我可以早点走吗？"}},
  {id:373,category:"airport",level:"A1",t:{fa:"اسکن بدن لازمه؟",en:"Is a body scan required?",de:"Ist ein Körperscan erforderlich?",es:"¿Se requiere escáner corporal?",fr:"Un scan corporel est-il requis ?",ar:"هل الفحص الجسدي مطلوب؟",tr:"Vücut taraması gerekli mi?",zh:"需要人体安检吗？"}},
  {id:374,category:"airport",level:"A1",t:{fa:"کارت پرواز کجاست؟",en:"Where is the boarding pass?",de:"Wo ist die Bordkarte?",es:"¿Dónde está la tarjeta de embarque?",fr:"Où est la carte d'embarquement ?",ar:"أين بطاقة الصعود؟",tr:"Biniş kartı nerede?",zh:"登机牌在哪里？"}},
  {id:375,category:"airport",level:"A1",t:{fa:"کارت پرواز رو گم کردم",en:"I lost my boarding pass",de:"Ich habe meine Bordkarte verloren",es:"Perdí mi tarjeta de embarque",fr:"J'ai perdu ma carte d'embarquement",ar:"فقدت بطاقة صعودي",tr:"Biniş kartımı kaybettim",zh:"我弄丢了登机牌"}},
  {id:376,category:"restaurant",level:"A1",t:{fa:"این رستوران معروفه؟",en:"Is this restaurant famous?",de:"Ist dieses Restaurant bekannt?",es:"¿Este restaurante es famoso?",fr:"Ce restaurant est-il célèbre ?",ar:"هل هذا المطعم مشهور؟",tr:"Bu restoran ünlü mü?",zh:"这家餐厅有名吗？"}},
  {id:377,category:"restaurant",level:"A1",t:{fa:"تحویل غذا دارید؟",en:"Do you have food delivery?",de:"Bieten Sie Lieferservice an?",es:"¿Tienen entrega a domicilio?",fr:"Avez-vous la livraison ?",ar:"هل لديكم توصيل الطعام؟",tr:"Yemek teslimatınız var mı?",zh:"你们有送餐服务吗？"}},
  {id:378,category:"restaurant",level:"A1",t:{fa:"میز کنار پنجره می‌خوام",en:"I want a table by the window",de:"Ich möchte einen Tisch am Fenster",es:"Quiero una mesa junto a la ventana",fr:"Je veux une table près de la fenêtre",ar:"أريد طاولة بجانب النافذة",tr:"Pencere kenarında masa istiyorum",zh:"我想要靠窗的桌子"}},
  {id:379,category:"restaurant",level:"A1",t:{fa:"غذا رو دیر آوردید",en:"The food came late",de:"Das Essen kam zu spät",es:"La comida llegó tarde",fr:"La nourriture est arrivée en retard",ar:"وصل الطعام متأخرًا",tr:"Yemek geç geldi",zh:"食物来得太晚了"}},
  {id:380,category:"restaurant",level:"A1",t:{fa:"این رو سفارش ندادم",en:"I didn't order this",de:"Das habe ich nicht bestellt",es:"No pedí esto",fr:"Je n'ai pas commandé ça",ar:"لم أطلب هذا",tr:"Bunu sipariş etmedim",zh:"我没点这个"}},
  {id:381,category:"restaurant",level:"A1",t:{fa:"لطفاً یکی دیگه بیارید",en:"Please bring one more",de:"Bitte bringen Sie noch eins",es:"Por favor, traiga uno más",fr:"Apportez-en un autre, s'il vous plaît",ar:"من فضلك أحضر واحدًا آخر",tr:"Lütfen bir tane daha getirin",zh:"请再拿一份"}},
  {id:382,category:"restaurant",level:"A1",t:{fa:"ظرف تمیز می‌خوام",en:"I want a clean plate",de:"Ich möchte einen sauberen Teller",es:"Quiero un plato limpio",fr:"Je veux une assiette propre",ar:"أريد طبقًا نظيفًا",tr:"Temiz tabak istiyorum",zh:"我想要干净的盘子"}},
  {id:383,category:"restaurant",level:"A1",t:{fa:"این نوشیدنی سرده؟",en:"Is this drink cold?",de:"Ist dieses Getränk kalt?",es:"¿Esta bebida está fría?",fr:"Cette boisson est-elle froide ?",ar:"هل هذا المشروب بارد؟",tr:"Bu içecek soğuk mu?",zh:"这个饮料是冷的吗？"}},
  {id:384,category:"shopping",level:"A1",t:{fa:"این جدیده؟",en:"Is this new?",de:"Ist das neu?",es:"¿Esto es nuevo?",fr:"Est-ce neuf ?",ar:"هل هذا جديد؟",tr:"Bu yeni mi?",zh:"这个是新的吗？"}},
  {id:385,category:"shopping",level:"A1",t:{fa:"قدیمیه یا آنتیک؟",en:"Is it old or antique?",de:"Ist es alt oder antik?",es:"¿Es viejo o antiguo?",fr:"Est-ce vieux ou ancien ?",ar:"هل هو قديم أم أثري؟",tr:"Eski mi yoksa antika mı?",zh:"这是旧的还是古董？"}},
  {id:386,category:"shopping",level:"A1",t:{fa:"کیف دستی می‌خوام",en:"I want a handbag",de:"Ich möchte eine Handtasche",es:"Quiero un bolso",fr:"Je veux un sac à main",ar:"أريد حقيبة يد",tr:"El çantası istiyorum",zh:"我想要手提包"}},
  {id:387,category:"shopping",level:"A1",t:{fa:"جوراب می‌خوام",en:"I want socks",de:"Ich möchte Socken",es:"Quiero calcetines",fr:"Je veux des chaussettes",ar:"أريد جوارب",tr:"Çorap istiyorum",zh:"我想要袜子"}},
  {id:388,category:"shopping",level:"A1",t:{fa:"این برای بچه‌ست؟",en:"Is this for kids?",de:"Ist das für Kinder?",es:"¿Esto es para niños?",fr:"Est-ce pour enfants ?",ar:"هل هذا للأطفال؟",tr:"Bu çocuklar için mi?",zh:"这是给孩子的吗？"}},
  {id:389,category:"shopping",level:"A1",t:{fa:"کارت اعتباری قبول می‌کنید؟",en:"Do you accept credit cards?",de:"Akzeptieren Sie Kreditkarten?",es:"¿Aceptan tarjetas de crédito?",fr:"Acceptez-vous les cartes de crédit ?",ar:"هل تقبلون بطاقات الائتمان؟",tr:"Kredi kartı kabul ediyor musunuz?",zh:"你们接受信用卡吗？"}},
  {id:390,category:"shopping",level:"A1",t:{fa:"می‌شه اینو نگه دارید برام؟",en:"Can you hold this for me?",de:"Können Sie das für mich zurücklegen?",es:"¿Puede guardarme esto?",fr:"Pouvez-vous me le mettre de côté ?",ar:"هل يمكنك حجز هذا لي؟",tr:"Bunu benim için ayırabilir misiniz?",zh:"可以帮我留着这个吗？"}},
  {id:391,category:"shopping",level:"A1",t:{fa:"این محدودیت خرید داره؟",en:"Is there a purchase limit?",de:"Gibt es ein Kauflimit?",es:"¿Hay un límite de compra?",fr:"Y a-t-il une limite d'achat ?",ar:"هل هناك حد للشراء؟",tr:"Alışveriş sınırı var mı?",zh:"购买有限制吗？"}},
  {id:392,category:"hotel",level:"A1",t:{fa:"می‌خوام تاریخ رزروم رو تغییر بدم",en:"I want to change my reservation date",de:"Ich möchte mein Reservierungsdatum ändern",es:"Quiero cambiar la fecha de mi reserva",fr:"Je veux changer la date de ma réservation",ar:"أريد تغيير تاريخ حجزي",tr:"Rezervasyon tarihimi değiştirmek istiyorum",zh:"我想改预订日期"}},
  {id:393,category:"hotel",level:"A1",t:{fa:"می‌خوام رزروم رو کنسل کنم",en:"I want to cancel my reservation",de:"Ich möchte meine Reservierung stornieren",es:"Quiero cancelar mi reserva",fr:"Je veux annuler ma réservation",ar:"أريد إلغاء حجزي",tr:"Rezervasyonumu iptal etmek istiyorum",zh:"我想取消预订"}},
  {id:394,category:"hotel",level:"A1",t:{fa:"مینی‌بار اتاق چیه؟",en:"What's in the room's minibar?",de:"Was ist in der Minibar des Zimmers?",es:"¿Qué hay en el minibar de la habitación?",fr:"Qu'y a-t-il dans le minibar ?",ar:"ماذا يوجد في الميني بار؟",tr:"Odanın minibarında ne var?",zh:"房间的迷你吧里有什么？"}},
  {id:395,category:"hotel",level:"A1",t:{fa:"آسانسور کجاست؟",en:"Where is the elevator?",de:"Wo ist der Aufzug?",es:"¿Dónde está el ascensor?",fr:"Où est l'ascenseur ?",ar:"أين المصعد؟",tr:"Asansör nerede?",zh:"电梯在哪里？"}},
  {id:396,category:"hotel",level:"A1",t:{fa:"لابی هتل کجاست؟",en:"Where is the hotel lobby?",de:"Wo ist die Hotellobby?",es:"¿Dónde está el lobby del hotel?",fr:"Où est le hall de l'hôtel ?",ar:"أين لوبي الفندق؟",tr:"Otel lobisi nerede?",zh:"酒店大堂在哪里？"}},
  {id:397,category:"hotel",level:"A1",t:{fa:"می‌شه یه تاکسی برام بگیرید؟",en:"Can you call a taxi for me?",de:"Können Sie mir ein Taxi rufen?",es:"¿Puede llamarme un taxi?",fr:"Pouvez-vous m'appeler un taxi ?",ar:"هل يمكنك استدعاء تاكسي لي؟",tr:"Benim için taksi çağırabilir misiniz?",zh:"可以帮我叫辆出租车吗？"}},
  {id:398,category:"directions",level:"A1",t:{fa:"می‌شه با ماشین بریم؟",en:"Can we go by car?",de:"Können wir mit dem Auto fahren?",es:"¿Podemos ir en coche?",fr:"Peut-on y aller en voiture ?",ar:"هل يمكننا الذهاب بالسيارة؟",tr:"Arabayla gidebilir miyiz?",zh:"我们可以开车去吗？"}},
  {id:399,category:"directions",level:"A1",t:{fa:"این طرف یا اون طرف؟",en:"This way or that way?",de:"Diese Richtung oder jene?",es:"¿Por aquí o por allá?",fr:"Par ici ou par là ?",ar:"هذا الاتجاه أم ذاك؟",tr:"Bu taraf mı o taraf mı?",zh:"这边还是那边？"}},
  {id:400,category:"directions",level:"A1",t:{fa:"اینجا کجاست؟",en:"Where am I?",de:"Wo bin ich hier?",es:"¿Dónde estoy?",fr:"Où suis-je ?",ar:"أين أنا؟",tr:"Neredeyim?",zh:"我在哪里？"}},
  {id:401,category:"directions",level:"A1",t:{fa:"این منطقه امنه؟",en:"Is this area safe?",de:"Ist diese Gegend sicher?",es:"¿Esta zona es segura?",fr:"Cette zone est-elle sûre ?",ar:"هل هذه المنطقة آمنة؟",tr:"Bu bölge güvenli mi?",zh:"这个地区安全吗？"}},
  {id:402,category:"directions",level:"A1",t:{fa:"پل کجاست؟",en:"Where is the bridge?",de:"Wo ist die Brücke?",es:"¿Dónde está el puente?",fr:"Où est le pont ?",ar:"أين الجسر؟",tr:"Köprü nerede?",zh:"桥在哪里？"}},
  {id:403,category:"directions",level:"A1",t:{fa:"میدون تا اینجا چقدر راهه؟",en:"How far is the square from here?",de:"Wie weit ist der Platz von hier?",es:"¿Qué tan lejos está la plaza de aquí?",fr:"Quelle est la distance de la place d'ici ?",ar:"كم تبعد الساحة من هنا؟",tr:"Meydan buradan ne kadar uzakta?",zh:"广场离这里多远？"}},
  {id:404,category:"emergency",level:"A1",t:{fa:"به کمک فوری نیاز دارم",en:"I need urgent help",de:"Ich brauche dringend Hilfe",es:"Necesito ayuda urgente",fr:"J'ai besoin d'aide urgente",ar:"أحتاج مساعدة عاجلة",tr:"Acil yardıma ihtiyacım var",zh:"我需要紧急帮助"}},
  {id:405,category:"emergency",level:"A1",t:{fa:"کسی اینجا انگلیسی حرف می‌زنه؟",en:"Does anyone here speak English?",de:"Spricht hier jemand Englisch?",es:"¿Alguien aquí habla inglés?",fr:"Quelqu'un ici parle anglais ?",ar:"هل يتحدث أحد هنا الإنجليزية؟",tr:"Burada İngilizce konuşan biri var mı?",zh:"这里有人会说英语吗？"}},
  {id:406,category:"emergency",level:"A1",t:{fa:"شماره اورژانس چنده؟",en:"What's the emergency number?",de:"Wie ist die Notrufnummer?",es:"¿Cuál es el número de emergencia?",fr:"Quel est le numéro d'urgence ?",ar:"ما هو رقم الطوارئ؟",tr:"Acil durum numarası nedir?",zh:"紧急电话号码是多少？"}},
  {id:407,category:"emergency",level:"A1",t:{fa:"من در خطرم",en:"I'm in danger",de:"Ich bin in Gefahr",es:"Estoy en peligro",fr:"Je suis en danger",ar:"أنا في خطر",tr:"Tehlikedeyim",zh:"我有危险"}},
  {id:408,category:"numbers",level:"A1",t:{fa:"چهل",en:"Forty",de:"Vierzig",es:"Cuarenta",fr:"Quarante",ar:"أربعون",tr:"Kırk",zh:"四十"}},
  {id:409,category:"numbers",level:"A1",t:{fa:"پنجاه",en:"Fifty",de:"Fünfzig",es:"Cincuenta",fr:"Cinquante",ar:"خمسون",tr:"Elli",zh:"五十"}},
  {id:410,category:"numbers",level:"A1",t:{fa:"هزار",en:"One thousand",de:"Tausend",es:"Mil",fr:"Mille",ar:"ألف",tr:"Bin",zh:"一千"}},
  {id:411,category:"numbers",level:"A1",t:{fa:"چهارشنبه",en:"Wednesday",de:"Mittwoch",es:"Miércoles",fr:"Mercredi",ar:"الأربعاء",tr:"Çarşamba",zh:"星期三"}},
  {id:412,category:"numbers",level:"A1",t:{fa:"شنبه",en:"Saturday",de:"Samstag",es:"Sábado",fr:"Samedi",ar:"السبت",tr:"Cumartesi",zh:"星期六"}},
  {id:413,category:"numbers",level:"A1",t:{fa:"هفته بعد",en:"Next week",de:"Nächste Woche",es:"La próxima semana",fr:"La semaine prochaine",ar:"الأسبوع المقبل",tr:"Gelecek hafta",zh:"下周"}},
  {id:414,category:"greetings",level:"A1",t:{fa:"رنگ قرمز",en:"Red color",de:"Rot",es:"Rojo",fr:"Rouge",ar:"أحمر",tr:"Kırmızı",zh:"红色"}},
  {id:415,category:"greetings",level:"A1",t:{fa:"رنگ آبی",en:"Blue color",de:"Blau",es:"Azul",fr:"Bleu",ar:"أزرق",tr:"Mavi",zh:"蓝色"}},
  {id:416,category:"greetings",level:"A1",t:{fa:"رنگ سبز",en:"Green color",de:"Grün",es:"Verde",fr:"Vert",ar:"أخضر",tr:"Yeşil",zh:"绿色"}},
  {id:417,category:"greetings",level:"A1",t:{fa:"رنگ زرد",en:"Yellow color",de:"Gelb",es:"Amarillo",fr:"Jaune",ar:"أصفر",tr:"Sarı",zh:"黄色"}},
  {id:418,category:"greetings",level:"A1",t:{fa:"رنگ سیاه",en:"Black color",de:"Schwarz",es:"Negro",fr:"Noir",ar:"أسود",tr:"Siyah",zh:"黑色"}},
  {id:419,category:"greetings",level:"A1",t:{fa:"رنگ سفید",en:"White color",de:"Weiß",es:"Blanco",fr:"Blanc",ar:"أبيض",tr:"Beyaz",zh:"白色"}},
  {id:420,category:"greetings",level:"A1",t:{fa:"خوشحالم",en:"I'm happy",de:"Ich bin glücklich",es:"Estoy feliz",fr:"Je suis content(e)",ar:"أنا سعيد",tr:"Mutluyum",zh:"我很开心"}},
  {id:421,category:"greetings",level:"A1",t:{fa:"ناراحتم",en:"I'm sad",de:"Ich bin traurig",es:"Estoy triste",fr:"Je suis triste",ar:"أنا حزين",tr:"Üzgünüm",zh:"我很难过"}},
  {id:422,category:"greetings",level:"A1",t:{fa:"خسته‌ام",en:"I'm tired",de:"Ich bin müde",es:"Estoy cansado",fr:"Je suis fatigué(e)",ar:"أنا متعب",tr:"Yorgunum",zh:"我很累"}},
  {id:423,category:"greetings",level:"A1",t:{fa:"گرسنمه",en:"I'm hungry",de:"Ich habe Hunger",es:"Tengo hambre",fr:"J'ai faim",ar:"أنا جائع",tr:"Açım",zh:"我饿了"}},
  {id:424,category:"greetings",level:"A1",t:{fa:"تشنمه",en:"I'm thirsty",de:"Ich habe Durst",es:"Tengo sed",fr:"J'ai soif",ar:"أنا عطشان",tr:"Susadım",zh:"我渴了"}},
  {id:425,category:"greetings",level:"A1",t:{fa:"سردمه",en:"I'm cold",de:"Mir ist kalt",es:"Tengo frío",fr:"J'ai froid",ar:"أشعر بالبرد",tr:"Üşüyorum",zh:"我很冷"}},
  {id:426,category:"airport",level:"A1",t:{fa:"گمرک کجاست؟",en:"Where is customs?",de:"Wo ist der Zoll?",es:"¿Dónde está la aduana?",fr:"Où est la douane ?",ar:"أين الجمارك؟",tr:"Gümrük nerede?",zh:"海关在哪里？"}},
  {id:427,category:"airport",level:"A1",t:{fa:"چیزی برای اظهار ندارم",en:"I have nothing to declare",de:"Ich habe nichts zu verzollen",es:"No tengo nada que declarar",fr:"Je n'ai rien à déclarer",ar:"ليس لدي ما أصرح به",tr:"Beyan edecek bir şeyim yok",zh:"我没有需要申报的东西"}},
  {id:428,category:"airport",level:"A1",t:{fa:"ویزای من اینجاست",en:"Here is my visa",de:"Hier ist mein Visum",es:"Aquí está mi visa",fr:"Voici mon visa",ar:"هذه تأشيرتي",tr:"İşte vizem",zh:"这是我的签证"}},
  {id:429,category:"airport",level:"A1",t:{fa:"چند روز اینجا می‌مونم",en:"How many days will you stay?",de:"Wie viele Tage bleiben Sie?",es:"¿Cuántos días se quedará?",fr:"Combien de jours restez-vous ?",ar:"كم يومًا ستبقى؟",tr:"Kaç gün kalacaksınız?",zh:"你会待几天？"}},
  {id:430,category:"airport",level:"A1",t:{fa:"برای گردش اومدم",en:"I came for tourism",de:"Ich bin zum Reisen hier",es:"Vine de turismo",fr:"Je suis venu(e) pour le tourisme",ar:"أتيت للسياحة",tr:"Turizm için geldim",zh:"我是来旅游的"}},
  {id:431,category:"airport",level:"A1",t:{fa:"برای کار اومدم",en:"I came for work",de:"Ich bin geschäftlich hier",es:"Vine por trabajo",fr:"Je suis venu(e) pour le travail",ar:"أتيت للعمل",tr:"İş için geldim",zh:"我是来工作的"}},
  {id:432,category:"airport",level:"A1",t:{fa:"کجا اقامت داری؟",en:"Where are you staying?",de:"Wo übernachten Sie?",es:"¿Dónde se hospeda?",fr:"Où logez-vous ?",ar:"أين تقيم؟",tr:"Nerede kalıyorsunuz?",zh:"你住在哪里？"}},
  {id:433,category:"airport",level:"A1",t:{fa:"بلیت برگشت دارم",en:"I have a return ticket",de:"Ich habe ein Rückflugticket",es:"Tengo boleto de regreso",fr:"J'ai un billet retour",ar:"لدي تذكرة عودة",tr:"Dönüş biletim var",zh:"我有回程票"}},
  {id:434,category:"airport",level:"A1",t:{fa:"پرواز من تاخیر داره",en:"My flight is delayed",de:"Mein Flug hat Verspätung",es:"Mi vuelo está retrasado",fr:"Mon vol est retardé",ar:"رحلتي متأخرة",tr:"Uçuşum gecikti",zh:"我的航班延误了"}},
  {id:435,category:"airport",level:"A1",t:{fa:"پرواز کنسل شده",en:"The flight is canceled",de:"Der Flug wurde storniert",es:"El vuelo está cancelado",fr:"Le vol est annulé",ar:"الرحلة ملغاة",tr:"Uçuş iptal edildi",zh:"航班取消了"}},
  {id:436,category:"airport",level:"A1",t:{fa:"پرواز بعدی کیه؟",en:"When is the next flight?",de:"Wann ist der nächste Flug?",es:"¿Cuándo es el próximo vuelo?",fr:"Quand est le prochain vol ?",ar:"متى الرحلة القادمة؟",tr:"Sonraki uçuş ne zaman?",zh:"下一班航班是什么时候？"}},
  {id:437,category:"airport",level:"A1",t:{fa:"می‌شه اتاق انتظار برام رزرو کنید؟",en:"Can you reserve a waiting room for me?",de:"Können Sie mir einen Warteraum reservieren?",es:"¿Puede reservarme una sala de espera?",fr:"Pouvez-vous me réserver une salle d'attente ?",ar:"هل يمكنك حجز غرفة انتظار لي؟",tr:"Benim için bekleme odası ayırabilir misiniz?",zh:"可以帮我预订候机室吗？"}},
  {id:438,category:"restaurant",level:"A1",t:{fa:"گیاه‌خوارم",en:"I'm vegetarian",de:"Ich bin Vegetarier",es:"Soy vegetariano",fr:"Je suis végétarien(ne)",ar:"أنا نباتي",tr:"Vejetaryenim",zh:"我吃素"}},
  {id:439,category:"restaurant",level:"A1",t:{fa:"وگان‌ام",en:"I'm vegan",de:"Ich bin Veganer",es:"Soy vegano",fr:"Je suis végétalien(ne)",ar:"أنا نباتي صرف",tr:"Veganım",zh:"我是纯素食者"}},
  {id:440,category:"restaurant",level:"A1",t:{fa:"به بادوم‌زمینی حساسیت دارم",en:"I'm allergic to peanuts",de:"Ich bin allergisch gegen Erdnüsse",es:"Soy alérgico al maní",fr:"Je suis allergique aux arachides",ar:"أنا حساس من الفول السوداني",tr:"Fıstık alerjim var",zh:"我对花生过敏"}},
  {id:441,category:"restaurant",level:"A1",t:{fa:"به لبنیات حساسیت دارم",en:"I'm allergic to dairy",de:"Ich bin allergisch gegen Milchprodukte",es:"Soy alérgico a los lácteos",fr:"Je suis allergique aux produits laitiers",ar:"أنا حساس من منتجات الألبان",tr:"Süt ürünlerine alerjim var",zh:"我对乳制品过敏"}},
  {id:442,category:"restaurant",level:"A1",t:{fa:"بدون گلوتن دارید؟",en:"Do you have gluten-free?",de:"Haben Sie glutenfrei?",es:"¿Tienen sin gluten?",fr:"Avez-vous du sans gluten ?",ar:"هل لديكم خالي من الغلوتين؟",tr:"Glutensiz var mı?",zh:"有无麸质的吗？"}},
  {id:443,category:"restaurant",level:"A1",t:{fa:"چای بدون شکر لطفاً",en:"Tea without sugar, please",de:"Tee ohne Zucker, bitte",es:"Té sin azúcar, por favor",fr:"Du thé sans sucre, s'il vous plaît",ar:"شاي بدون سكر، من فضلك",tr:"Şekersiz çay, lütfen",zh:"请给我不加糖的茶"}},
  {id:444,category:"restaurant",level:"A1",t:{fa:"قهوه با شیر لطفاً",en:"Coffee with milk, please",de:"Kaffee mit Milch, bitte",es:"Café con leche, por favor",fr:"Café au lait, s'il vous plaît",ar:"قهوة بالحليب، من فضلك",tr:"Sütlü kahve, lütfen",zh:"请给我加奶的咖啡"}},
  {id:445,category:"restaurant",level:"A1",t:{fa:"میز برای دو نفر",en:"Table for two",de:"Tisch für zwei",es:"Mesa para dos",fr:"Table pour deux",ar:"طاولة لشخصين",tr:"İki kişilik masa",zh:"两人桌"}},
  {id:446,category:"restaurant",level:"A1",t:{fa:"نوبت من کیه؟",en:"When is my turn?",de:"Wann bin ich dran?",es:"¿Cuándo es mi turno?",fr:"Quand est mon tour ?",ar:"متى دوري؟",tr:"Sıra bende ne zaman?",zh:"什么时候轮到我？"}},
  {id:447,category:"restaurant",level:"A1",t:{fa:"نوشیدنی الکلی ندارم",en:"I don't want alcoholic drinks",de:"Ich möchte keine alkoholischen Getränke",es:"No quiero bebidas alcohólicas",fr:"Je ne veux pas de boissons alcoolisées",ar:"لا أريد مشروبات كحولية",tr:"Alkollü içecek istemiyorum",zh:"我不要含酒精的饮料"}},
  {id:448,category:"restaurant",level:"A1",t:{fa:"غذای گرم می‌خوام",en:"I want hot food",de:"Ich möchte warmes Essen",es:"Quiero comida caliente",fr:"Je veux un plat chaud",ar:"أريد طعامًا ساخنًا",tr:"Sıcak yemek istiyorum",zh:"我想要热的食物"}},
  {id:449,category:"restaurant",level:"A1",t:{fa:"غذای سرد می‌خوام",en:"I want cold food",de:"Ich möchte kaltes Essen",es:"Quiero comida fría",fr:"Je veux un plat froid",ar:"أريد طعامًا باردًا",tr:"Soğuk yemek istiyorum",zh:"我想要冷的食物"}},
  {id:450,category:"restaurant",level:"A1",t:{fa:"نون بیشتر می‌خوام",en:"I want more bread",de:"Ich möchte mehr Brot",es:"Quiero más pan",fr:"Je veux plus de pain",ar:"أريد المزيد من الخبز",tr:"Daha fazla ekmek istiyorum",zh:"我想要更多面包"}},
  {id:451,category:"restaurant",level:"A1",t:{fa:"این ظرف رو ببرید",en:"Please take this plate away",de:"Bitte nehmen Sie diesen Teller weg",es:"Por favor, retire este plato",fr:"Veuillez retirer cette assiette",ar:"من فضلك خذ هذا الطبق",tr:"Lütfen bu tabağı alın",zh:"请把这个盘子拿走"}},
  {id:452,category:"shopping",level:"A1",t:{fa:"سایز کوچیک می‌خوام",en:"I want a small size",de:"Ich möchte eine kleine Größe",es:"Quiero una talla pequeña",fr:"Je veux une petite taille",ar:"أريد مقاسًا صغيرًا",tr:"Küçük beden istiyorum",zh:"我想要小号"}},
  {id:453,category:"shopping",level:"A1",t:{fa:"سایز متوسط می‌خوام",en:"I want a medium size",de:"Ich möchte eine mittlere Größe",es:"Quiero una talla mediana",fr:"Je veux une taille moyenne",ar:"أريد مقاسًا متوسطًا",tr:"Orta beden istiyorum",zh:"我想要中号"}},
  {id:454,category:"shopping",level:"A1",t:{fa:"سایز بزرگ می‌خوام",en:"I want a large size",de:"Ich möchte eine große Größe",es:"Quiero una talla grande",fr:"Je veux une grande taille",ar:"أريد مقاسًا كبيرًا",tr:"Büyük beden istiyorum",zh:"我想要大号"}},
  {id:455,category:"shopping",level:"A1",t:{fa:"این رنگ رو دارید؟",en:"Do you have this color?",de:"Haben Sie diese Farbe?",es:"¿Tienen este color?",fr:"Avez-vous cette couleur ?",ar:"هل لديكم هذا اللون؟",tr:"Bu renginiz var mı?",zh:"你们有这个颜色吗？"}},
  {id:456,category:"shopping",level:"A1",t:{fa:"رنگ دیگه‌ای دارید؟",en:"Do you have another color?",de:"Haben Sie eine andere Farbe?",es:"¿Tienen otro color?",fr:"Avez-vous une autre couleur ?",ar:"هل لديكم لون آخر؟",tr:"Başka renginiz var mı?",zh:"你们有别的颜色吗？"}},
  {id:457,category:"shopping",level:"A1",t:{fa:"قیمتش چقدره؟",en:"What's the price?",de:"Was kostet es?",es:"¿Cuál es el precio?",fr:"Quel est le prix ?",ar:"كم السعر؟",tr:"Fiyatı ne kadar?",zh:"价格是多少？"}},
  {id:458,category:"shopping",level:"A1",t:{fa:"تخفیف داره؟",en:"Is there a discount?",de:"Gibt es einen Rabatt?",es:"¿Hay descuento?",fr:"Y a-t-il une réduction ?",ar:"هل هناك خصم؟",tr:"İndirim var mı?",zh:"有折扣吗？"}},
  {id:459,category:"shopping",level:"A1",t:{fa:"قیمت نهایی چیه؟",en:"What's the final price?",de:"Was ist der Endpreis?",es:"¿Cuál es el precio final?",fr:"Quel est le prix final ?",ar:"ما هو السعر النهائي؟",tr:"Son fiyat nedir?",zh:"最终价格是多少？"}},
  {id:460,category:"shopping",level:"A1",t:{fa:"رسید می‌خوام",en:"I want a receipt",de:"Ich möchte eine Quittung",es:"Quiero un recibo",fr:"Je veux un reçu",ar:"أريد إيصالًا",tr:"Fiş istiyorum",zh:"我想要收据"}},
  {id:461,category:"shopping",level:"A1",t:{fa:"می‌تونم پس بدم؟",en:"Can I return it?",de:"Kann ich es zurückgeben?",es:"¿Puedo devolverlo?",fr:"Puis-je le rendre ?",ar:"هل يمكنني إرجاعه؟",tr:"İade edebilir miyim?",zh:"我可以退货吗？"}},
  {id:462,category:"shopping",level:"A1",t:{fa:"می‌تونم عوضش کنم؟",en:"Can I exchange it?",de:"Kann ich es umtauschen?",es:"¿Puedo cambiarlo?",fr:"Puis-je l'échanger ?",ar:"هل يمكنني استبداله؟",tr:"Değiştirebilir miyim?",zh:"我可以换货吗？"}},
  {id:463,category:"shopping",level:"A1",t:{fa:"این کجا ساخته شده؟",en:"Where is this made?",de:"Wo wird das hergestellt?",es:"¿Dónde se fabrica esto?",fr:"Où est-ce fabriqué ?",ar:"أين صنع هذا؟",tr:"Bu nerede yapılmış?",zh:"这是在哪里制造的？"}},
  {id:464,category:"shopping",level:"A1",t:{fa:"بیشتر از این دارید؟",en:"Do you have more of this?",de:"Haben Sie mehr davon?",es:"¿Tienen más de esto?",fr:"En avez-vous davantage ?",ar:"هل لديكم المزيد من هذا؟",tr:"Bundan daha fazla var mı?",zh:"还有更多这个吗？"}},
  {id:465,category:"shopping",level:"A1",t:{fa:"چند تا می‌تونم بخرم؟",en:"How many can I buy?",de:"Wie viele kann ich kaufen?",es:"¿Cuántos puedo comprar?",fr:"Combien puis-je acheter ?",ar:"كم يمكنني أن أشتري؟",tr:"Kaç tane alabilirim?",zh:"我可以买多少个？"}},
  {id:466,category:"hotel",level:"A1",t:{fa:"پارکینگ دارید؟",en:"Do you have parking?",de:"Haben Sie einen Parkplatz?",es:"¿Tienen estacionamiento?",fr:"Avez-vous un parking ?",ar:"هل لديكم موقف سيارات؟",tr:"Otoparkınız var mı?",zh:"你们有停车场吗？"}},
  {id:467,category:"hotel",level:"A1",t:{fa:"استخر دارید؟",en:"Do you have a pool?",de:"Haben Sie einen Pool?",es:"¿Tienen piscina?",fr:"Avez-vous une piscine ?",ar:"هل لديكم مسبح؟",tr:"Havuzunuz var mı?",zh:"你们有游泳池吗？"}},
  {id:468,category:"hotel",level:"A1",t:{fa:"باشگاه ورزشی دارید؟",en:"Do you have a gym?",de:"Haben Sie ein Fitnessstudio?",es:"¿Tienen gimnasio?",fr:"Avez-vous une salle de sport ?",ar:"هل لديكم صالة رياضية؟",tr:"Spor salonunuz var mı?",zh:"你们有健身房吗？"}},
  {id:469,category:"hotel",level:"A1",t:{fa:"خدمات بیدارباش می‌خوام",en:"I want a wake-up call",de:"Ich möchte einen Weckruf",es:"Quiero un servicio de despertador",fr:"Je veux un réveil téléphonique",ar:"أريد خدمة الإيقاظ",tr:"Uyandırma servisi istiyorum",zh:"我想要叫醒服务"}},
  {id:470,category:"hotel",level:"A1",t:{fa:"کلید اتاقم رو گم کردم",en:"I lost my room key",de:"Ich habe meinen Zimmerschlüssel verloren",es:"Perdí la llave de mi habitación",fr:"J'ai perdu la clé de ma chambre",ar:"فقدت مفتاح غرفتي",tr:"Oda anahtarımı kaybettim",zh:"我弄丢了房间钥匙"}},
  {id:471,category:"hotel",level:"A1",t:{fa:"اینترنت اتاق کار نمی‌کنه",en:"The room's internet isn't working",de:"Das Internet im Zimmer funktioniert nicht",es:"El internet de la habitación no funciona",fr:"Internet dans la chambre ne fonctionne pas",ar:"الإنترنت في الغرفة لا يعمل",tr:"Odanın interneti çalışmıyor",zh:"房间的网络不能用"}},
  {id:472,category:"hotel",level:"A1",t:{fa:"رمز وای‌فای چیه؟",en:"What's the Wi-Fi password?",de:"Wie lautet das WLAN-Passwort?",es:"¿Cuál es la contraseña del Wi-Fi?",fr:"Quel est le mot de passe Wi-Fi ?",ar:"ما هي كلمة مرور الواي فاي؟",tr:"Wi-Fi şifresi nedir?",zh:"Wi-Fi密码是什么？"}},
  {id:473,category:"hotel",level:"A1",t:{fa:"می‌شه یه بالش دیگه بیارید؟",en:"Can you bring another pillow?",de:"Können Sie noch ein Kissen bringen?",es:"¿Puede traer otra almohada?",fr:"Pouvez-vous apporter un autre oreiller ?",ar:"هل يمكنك إحضار وسادة أخرى؟",tr:"Başka bir yastık getirebilir misiniz?",zh:"可以再拿个枕头吗？"}},
  {id:474,category:"hotel",level:"A1",t:{fa:"پتوی اضافه می‌خوام",en:"I want an extra blanket",de:"Ich möchte eine zusätzliche Decke",es:"Quiero una manta extra",fr:"Je veux une couverture supplémentaire",ar:"أريد بطانية إضافية",tr:"Fazladan battaniye istiyorum",zh:"我想要额外的毯子"}},
  {id:475,category:"hotel",level:"A1",t:{fa:"حوله تمیز می‌خوام",en:"I want a clean towel",de:"Ich möchte ein sauberes Handtuch",es:"Quiero una toalla limpia",fr:"Je veux une serviette propre",ar:"أريد منشفة نظيفة",tr:"Temiz havlu istiyorum",zh:"我想要干净的毛巾"}},
  {id:476,category:"hotel",level:"A1",t:{fa:"صابون تموم شده",en:"The soap is finished",de:"Die Seife ist alle",es:"Se acabó el jabón",fr:"Il n'y a plus de savon",ar:"انتهى الصابون",tr:"Sabun bitti",zh:"肥皂用完了"}},
  {id:477,category:"hotel",level:"A1",t:{fa:"شامپو می‌خوام",en:"I want shampoo",de:"Ich möchte Shampoo",es:"Quiero champú",fr:"Je veux du shampoing",ar:"أريد شامبو",tr:"Şampuan istiyorum",zh:"我想要洗发水"}},
  {id:478,category:"directions",level:"A1",t:{fa:"ایستگاه مترو کجاست؟",en:"Where is the metro station?",de:"Wo ist die U-Bahn-Station?",es:"¿Dónde está la estación de metro?",fr:"Où est la station de métro ?",ar:"أين محطة المترو؟",tr:"Metro istasyonu nerede?",zh:"地铁站在哪里？"}},
  {id:479,category:"directions",level:"A1",t:{fa:"ایستگاه اتوبوس کجاست؟",en:"Where is the bus stop?",de:"Wo ist die Bushaltestelle?",es:"¿Dónde está la parada de autobús?",fr:"Où est l'arrêt de bus ?",ar:"أين موقف الحافلة؟",tr:"Otobüs durağı nerede?",zh:"公交车站在哪里？"}},
  {id:480,category:"directions",level:"A1",t:{fa:"این اتوبوس به مرکز شهر می‌ره؟",en:"Does this bus go downtown?",de:"Fährt dieser Bus ins Stadtzentrum?",es:"¿Este autobús va al centro?",fr:"Ce bus va-t-il au centre-ville ?",ar:"هل هذه الحافلة تذهب إلى وسط المدينة؟",tr:"Bu otobüs şehir merkezine gidiyor mu?",zh:"这辆公交车去市中心吗？"}},
  {id:481,category:"directions",level:"A1",t:{fa:"بلیت اتوبوس کجا می‌خرم؟",en:"Where do I buy a bus ticket?",de:"Wo kaufe ich ein Busticket?",es:"¿Dónde compro un boleto de autobús?",fr:"Où puis-je acheter un billet de bus ?",ar:"أين أشتري تذكرة الحافلة؟",tr:"Otobüs bileti nereden alırım?",zh:"在哪里买公交车票？"}},
  {id:482,category:"directions",level:"A1",t:{fa:"قطار بعدی کیه؟",en:"When is the next train?",de:"Wann ist der nächste Zug?",es:"¿Cuándo es el próximo tren?",fr:"Quand est le prochain train ?",ar:"متى القطار القادم؟",tr:"Sonraki tren ne zaman?",zh:"下一班火车是什么时候？"}},
  {id:483,category:"directions",level:"A1",t:{fa:"این خط به کجا می‌ره؟",en:"Where does this line go?",de:"Wohin fährt diese Linie?",es:"¿Adónde va esta línea?",fr:"Où va cette ligne ?",ar:"إلى أين يذهب هذا الخط؟",tr:"Bu hat nereye gidiyor?",zh:"这条线路去哪里？"}},
  {id:484,category:"directions",level:"A1",t:{fa:"باید کجا پیاده بشم؟",en:"Where should I get off?",de:"Wo soll ich aussteigen?",es:"¿Dónde debo bajarme?",fr:"Où dois-je descendre ?",ar:"أين يجب أن أنزل؟",tr:"Nerede inmem gerekiyor?",zh:"我应该在哪里下车？"}},
  {id:485,category:"directions",level:"A1",t:{fa:"این تاکسی آزاده؟",en:"Is this taxi free?",de:"Ist dieses Taxi frei?",es:"¿Este taxi está libre?",fr:"Ce taxi est-il libre ?",ar:"هل هذا التاكسي متاح؟",tr:"Bu taksi boş mu?",zh:"这辆出租车是空的吗？"}},
  {id:486,category:"directions",level:"A1",t:{fa:"کرایه تاکسی چقدره؟",en:"How much is the taxi fare?",de:"Wie viel kostet die Taxifahrt?",es:"¿Cuánto cuesta el taxi?",fr:"Combien coûte le taxi ?",ar:"كم أجرة التاكسي؟",tr:"Taksi ücreti ne kadar?",zh:"出租车费多少？"}},
  {id:487,category:"directions",level:"A1",t:{fa:"دوچرخه کرایه می‌کنید؟",en:"Do you rent bicycles?",de:"Vermieten Sie Fahrräder?",es:"¿Alquilan bicicletas?",fr:"Louez-vous des vélos ?",ar:"هل تؤجرون دراجات؟",tr:"Bisiklet kiralıyor musunuz?",zh:"你们出租自行车吗？"}},
  {id:488,category:"directions",level:"A1",t:{fa:"ماشین کرایه می‌کنید؟",en:"Do you rent cars?",de:"Vermieten Sie Autos?",es:"¿Alquilan coches?",fr:"Louez-vous des voitures ?",ar:"هل تؤجرون سيارات؟",tr:"Araba kiralıyor musunuz?",zh:"你们出租汽车吗？"}},
  {id:489,category:"directions",level:"A1",t:{fa:"گواهینامه لازمه؟",en:"Is a driver's license required?",de:"Ist ein Führerschein erforderlich?",es:"¿Se requiere licencia de conducir?",fr:"Un permis de conduire est-il requis ?",ar:"هل رخصة القيادة مطلوبة؟",tr:"Ehliyet gerekli mi?",zh:"需要驾照吗？"}},
  {id:490,category:"emergency",level:"A1",t:{fa:"سرم درد می‌کنه",en:"My head hurts",de:"Mein Kopf tut weh",es:"Me duele la cabeza",fr:"J'ai mal à la tête",ar:"رأسي يؤلمني",tr:"Başım ağrıyor",zh:"我头痛"}},
  {id:491,category:"emergency",level:"A1",t:{fa:"شکمم درد می‌کنه",en:"My stomach hurts",de:"Mein Bauch tut weh",es:"Me duele el estómago",fr:"J'ai mal au ventre",ar:"بطني يؤلمني",tr:"Karnım ağrıyor",zh:"我肚子疼"}},
  {id:492,category:"emergency",level:"A1",t:{fa:"دندونم درد می‌کنه",en:"My tooth hurts",de:"Mein Zahn tut weh",es:"Me duele el diente",fr:"J'ai mal aux dents",ar:"سني يؤلمني",tr:"Dişim ağrıyor",zh:"我牙疼"}},
  {id:493,category:"emergency",level:"A1",t:{fa:"تب دارم",en:"I have a fever",de:"Ich habe Fieber",es:"Tengo fiebre",fr:"J'ai de la fièvre",ar:"لدي حمى",tr:"Ateşim var",zh:"我发烧了"}},
  {id:494,category:"emergency",level:"A1",t:{fa:"سرفه می‌کنم",en:"I'm coughing",de:"Ich huste",es:"Estoy tosiendo",fr:"Je tousse",ar:"أسعل",tr:"Öksürüyorum",zh:"我在咳嗽"}},
  {id:495,category:"emergency",level:"A1",t:{fa:"حالم تهوع داره",en:"I feel nauseous",de:"Mir ist übel",es:"Tengo náuseas",fr:"J'ai la nausée",ar:"أشعر بالغثيان",tr:"Midem bulanıyor",zh:"我感到恶心"}},
  {id:496,category:"emergency",level:"A1",t:{fa:"سرگیجه دارم",en:"I feel dizzy",de:"Mir ist schwindelig",es:"Estoy mareado",fr:"J'ai le vertige",ar:"أشعر بالدوار",tr:"Başım dönüyor",zh:"我感到头晕"}},
  {id:497,category:"emergency",level:"A1",t:{fa:"نیاز به دکتر زنان دارم",en:"I need a gynecologist",de:"Ich brauche einen Frauenarzt",es:"Necesito un ginecólogo",fr:"J'ai besoin d'un gynécologue",ar:"أحتاج طبيب نسائي",tr:"Kadın doğum uzmanına ihtiyacım var",zh:"我需要看妇科医生"}},
  {id:498,category:"emergency",level:"A1",t:{fa:"قرص مسکن دارید؟",en:"Do you have painkillers?",de:"Haben Sie Schmerzmittel?",es:"¿Tienen analgésicos?",fr:"Avez-vous des antidouleurs ?",ar:"هل لديكم مسكنات؟",tr:"Ağrı kesiciniz var mı?",zh:"你们有止痛药吗？"}},
  {id:499,category:"emergency",level:"A1",t:{fa:"این دارو رو چطور مصرف کنم؟",en:"How do I take this medicine?",de:"Wie nehme ich dieses Medikament ein?",es:"¿Cómo tomo este medicamento?",fr:"Comment dois-je prendre ce médicament ?",ar:"كيف أتناول هذا الدواء؟",tr:"Bu ilacı nasıl kullanmalıyım?",zh:"这个药怎么吃？"}},
  {id:500,category:"numbers",level:"A1",t:{fa:"اول",en:"First",de:"Erster",es:"Primero",fr:"Premier",ar:"الأول",tr:"Birinci",zh:"第一"}},
  {id:501,category:"numbers",level:"A1",t:{fa:"دوم",en:"Second",de:"Zweiter",es:"Segundo",fr:"Deuxième",ar:"الثاني",tr:"İkinci",zh:"第二"}},
  {id:502,category:"numbers",level:"A1",t:{fa:"سوم",en:"Third",de:"Dritter",es:"Tercero",fr:"Troisième",ar:"الثالث",tr:"Üçüncü",zh:"第三"}},
  {id:503,category:"numbers",level:"A1",t:{fa:"ژانویه",en:"January",de:"Januar",es:"Enero",fr:"Janvier",ar:"يناير",tr:"Ocak",zh:"一月"}},
  {id:504,category:"numbers",level:"A1",t:{fa:"فوریه",en:"February",de:"Februar",es:"Febrero",fr:"Février",ar:"فبراير",tr:"Şubat",zh:"二月"}},
  {id:505,category:"numbers",level:"A1",t:{fa:"مارس",en:"March",de:"März",es:"Marzo",fr:"Mars",ar:"مارس",tr:"Mart",zh:"三月"}},
  {id:506,category:"numbers",level:"A1",t:{fa:"دویست",en:"Two hundred",de:"Zweihundert",es:"Doscientos",fr:"Deux cents",ar:"مئتان",tr:"İki yüz",zh:"两百"}},
  {id:507,category:"numbers",level:"A1",t:{fa:"پونصد",en:"Five hundred",de:"Fünfhundert",es:"Quinientos",fr:"Cinq cents",ar:"خمسمائة",tr:"Beş yüz",zh:"五百"}},
  {id:508,category:"numbers",level:"A1",t:{fa:"دو هزار",en:"Two thousand",de:"Zweitausend",es:"Dos mil",fr:"Deux mille",ar:"ألفان",tr:"İki bin",zh:"两千"}},
  {id:509,category:"numbers",level:"A1",t:{fa:"میلیون",en:"Million",de:"Million",es:"Millón",fr:"Million",ar:"مليون",tr:"Milyon",zh:"百万"}},
  {id:510,category:"numbers",level:"A1",t:{fa:"نصف",en:"Half",de:"Hälfte",es:"Mitad",fr:"Moitié",ar:"نصف",tr:"Yarım",zh:"一半"}},
  {id:511,category:"numbers",level:"A1",t:{fa:"ربع",en:"Quarter",de:"Viertel",es:"Cuarto",fr:"Quart",ar:"ربع",tr:"Çeyrek",zh:"四分之一"}},
  {id:512,category:"numbers",level:"A1",t:{fa:"امسال",en:"This year",de:"Dieses Jahr",es:"Este año",fr:"Cette année",ar:"هذا العام",tr:"Bu yıl",zh:"今年"}},
  {id:513,category:"numbers",level:"A1",t:{fa:"سال بعد",en:"Next year",de:"Nächstes Jahr",es:"El próximo año",fr:"L'année prochaine",ar:"العام المقبل",tr:"Gelecek yıl",zh:"明年"}},
  {id:514,category:"greetings",level:"A1",t:{fa:"سلام",en:"Hi",de:"Hallo",es:"Hola",fr:"Salut",ar:"مرحباً",tr:"Merhaba",zh:"你好"}},
  {id:515,category:"greetings",level:"A1",t:{fa:"صبح بخیر",en:"Good morning",de:"Guten Morgen",es:"Buenos días",fr:"Bonjour",ar:"صباح الخير",tr:"Günaydın",zh:"早上好"}},
  {id:516,category:"greetings",level:"A1",t:{fa:"عصر بخیر",en:"Good afternoon",de:"Guten Tag",es:"Buenas tardes",fr:"Bon après-midi",ar:"مساء الخير",tr:"İyi günler",zh:"下午好"}},
  {id:517,category:"greetings",level:"A1",t:{fa:"شب خوش",en:"Good evening",de:"Guten Abend",es:"Buenas noches",fr:"Bonsoir",ar:"مساء الخير",tr:"İyi akşamlar",zh:"晚上好"}},
  {id:518,category:"greetings",level:"A1",t:{fa:"چطورید؟",en:"How are you?",de:"Wie geht es Ihnen?",es:"¿Cómo está?",fr:"Comment allez-vous?",ar:"كيف حالك؟",tr:"Nasılsınız?",zh:"你好吗？"}},
  {id:519,category:"greetings",level:"A1",t:{fa:"حال شما چطور است؟",en:"How are you doing?",de:"Wie geht es dir?",es:"¿Cómo te va?",fr:"Comment ça va?",ar:"كيف تسير الأمور؟",tr:"Nasıl gidiyor?",zh:"你怎么样？"}},
  {id:520,category:"greetings",level:"A1",t:{fa:"اوضاع چطوره؟",en:"How are things?",de:"Wie läuft es?",es:"¿Cómo van las cosas?",fr:"Comment vont les choses?",ar:"كيف الأمور؟",tr:"İşler nasıl?",zh:"事情怎么样？"}},
  {id:521,category:"greetings",level:"A1",t:{fa:"زندگی چطوره؟",en:"How's life?",de:"Wie läuft das Leben?",es:"¿Cómo va la vida?",fr:"Comment va la vie?",ar:"كيف الحياة؟",tr:"Hayat nasıl?",zh:"生活怎么样？"}},
  {id:522,category:"greetings",level:"A1",t:{fa:"خوبم متشکرم",en:"I'm fine, thank you",de:"Mir geht es gut, danke",es:"Estoy bien, gracias",fr:"Je vais bien, merci",ar:"أنا بخير، شكراً",tr:"İyiyim, teşekkürler",zh:"我很好，谢谢"}},
  {id:523,category:"greetings",level:"A1",t:{fa:"خوب است متشکرم",en:"Fine, thanks",de:"Gut, danke",es:"Bien, gracias",fr:"Bien, merci",ar:"بخير، شكراً",tr:"İyi, teşekkürler",zh:"很好，谢谢"}},
  {id:524,category:"greetings",level:"A1",t:{fa:"خوب نیست",en:"Not well!",de:"Nicht gut!",es:"¡No bien!",fr:"Pas bien!",ar:"ليس بخير!",tr:"İyi değil!",zh:"不太好！"}},
  {id:525,category:"greetings",level:"A1",t:{fa:"آن قدرها خوب نیست",en:"Not so good",de:"Nicht so gut",es:"No tan bien",fr:"Pas si bon",ar:"ليس جيداً",tr:"Pek iyi değil",zh:"不太好"}},
  {id:526,category:"greetings",level:"A1",t:{fa:"چندان خوب نیست",en:"Not very good",de:"Nicht sehr gut",es:"No muy bien",fr:"Pas très bon",ar:"ليس جيداً جداً",tr:"Çok iyi değil",zh:"不太好"}},
  {id:527,category:"greetings",level:"A1",t:{fa:"به اندازه کافی خوب نیست",en:"Not too good",de:"Nicht allzu gut",es:"No demasiado bien",fr:"Pas trop bon",ar:"ليس جيداً كافياً",tr:"Çok iyi değil",zh:"不太好"}},
  {id:528,category:"greetings",level:"A1",t:{fa:"(خیلی) بد نمی گذرد",en:"Not (too) bad",de:"Nicht (allzu) schlecht",es:"No (muy) mal",fr:"Pas (trop) mal",ar:"ليس سيئاً",tr:"Fena değil",zh:"还不错"}},
  {id:529,category:"greetings",level:"A1",t:{fa:"و شما چطورید؟",en:"What about you?",de:"Und Sie?",es:"¿Y tú?",fr:"Et vous?",ar:"وأنت؟",tr:"Peki siz?",zh:"你呢？"}},
  {id:530,category:"greetings",level:"A1",t:{fa:"خودتان چطورید؟",en:"How about yourself?",de:"Und selbst?",es:"¿Y usted mismo?",fr:"Et vous-même?",ar:"وأنت بنفسك؟",tr:"Kendiniz nasılsınız?",zh:"你自己呢？"}},
  {id:531,category:"meeting",level:"A1",t:{fa:"از ملاقات شما خوشوقتم",en:"Nice to meet you",de:"Freut mich, Sie kennenzulernen",es:"Mucho gusto",fr:"Enchanté(e)",ar:"سُررت بلقائك",tr:"Tanıştığımıza memnun oldum",zh:"很高兴见到你"}},
  {id:532,category:"meeting",level:"A1",t:{fa:"اسم شما چیست؟",en:"What's your name?",de:"Wie heißen Sie?",es:"¿Cómo te llamas?",fr:"Comment vous appelez-vous?",ar:"ما اسمك؟",tr:"Adınız nedir?",zh:"你叫什么名字？"}},
  {id:533,category:"meeting",level:"A1",t:{fa:"من علی هستم",en:"I'm Ali",de:"Ich bin Ali",es:"Soy Ali",fr:"Je suis Ali",ar:"أنا علي",tr:"Ben Ali",zh:"我是阿里"}},
  {id:534,category:"meeting",level:"A1",t:{fa:"چه خوب است دوباره دیدمتان",en:"Nice seeing you again",de:"Schön, Sie wiederzusehen",es:"Qué bueno verte de nuevo",fr:"Ravi de vous revoir",ar:"من الجميل رؤيتك مرة أخرى",tr:"Sizi tekrar görmek ne güzel",zh:"很高兴再次见到你"}},
  {id:535,category:"meeting",level:"A1",t:{fa:"از دیدارتان خوشحالم",en:"Happy to meet you",de:"Ich freue mich, Sie zu treffen",es:"Encantado de conocerle",fr:"Heureux de vous rencontrer",ar:"سعيد بلقائك",tr:"Tanıştığıma memnun oldum",zh:"很高兴见到你"}},
  {id:536,category:"meeting",level:"A1",t:{fa:"از ملاقات شما خوشحال شدم",en:"Glad to meet you",de:"Freut mich, Sie zu treffen",es:"Encantado de conocerte",fr:"Ravi de vous rencontrer",ar:"سعيد بلقائك",tr:"Tanıştığıma memnun oldum",zh:"见到你很高兴"}},
  {id:537,category:"meeting",level:"A1",t:{fa:"خوشوقتم (رسمی)",en:"How do you do?",de:"Wie geht es Ihnen?",es:"¿Cómo está usted?",fr:"Comment allez-vous?",ar:"كيف حالك؟",tr:"Nasılsınız?",zh:"您好"}},
  {id:538,category:"introducing",level:"A1",t:{fa:"بگذارید خودم را معرفی کنم",en:"Let me introduce myself",de:"Lassen Sie mich mich vorstellen",es:"Permítanme presentarme",fr:"Permettez-moi de me présenter",ar:"دعني أقدم نفسي",tr:"Kendimi tanıtayım",zh:"让我自我介绍一下"}},
  {id:539,category:"introducing",level:"A1",t:{fa:"این دوستم ادوارد است",en:"This is my friend Edward",de:"Das ist mein Freund Edward",es:"Este es mi amigo Edward",fr:"Voici mon ami Edward",ar:"هذا صديقي إدوارد",tr:"Bu arkadaşım Edward",zh:"这是我的朋友爱德华"}},
  {id:540,category:"introducing",level:"A1",t:{fa:"مایلم شما را به علی معرفی کنم",en:"I'd like to introduce you to Ali",de:"Ich möchte Ihnen Ali vorstellen",es:"Me gustaría presentarle a Ali",fr:"Je voudrais vous présenter Ali",ar:"أود أن أقدمك إلى علي",tr:"Sizi Ali ile tanıştırmak istiyorum",zh:"我想把你介绍给阿里"}},
  {id:541,category:"introducing",level:"A1",t:{fa:"مایلم برادرم علی را ملاقات کنید",en:"I'd like you to meet my brother Ali",de:"Ich möchte, dass Sie meinen Bruder Ali kennenlernen",es:"Me gustaría que conocieras a mi hermano Ali",fr:"Je voudrais que vous rencontriez mon frère Ali",ar:"أود أن تتعرف على أخي علي",tr:"Kardeşim Ali ile tanışmanızı isterim",zh:"我想让你见见我哥哥阿里"}},
  {id:542,category:"old_friend",level:"A1",t:{fa:"مثل این که سالهاست تو را ندیده ام",en:"I haven't seen you for ages",de:"Ich habe dich seit Ewigkeiten nicht gesehen",es:"No te he visto en siglos",fr:"Je ne t'ai pas vu depuis des siècles",ar:"لم أراك منذ دهور",tr:"Seni yıllardır görmedim",zh:"我好久没见到你了"}},
  {id:543,category:"old_friend",level:"A1",t:{fa:"این اواخر کم پیدا هستید",en:"We haven't seen much of you lately",de:"Wir haben dich in letzter Zeit wenig gesehen",es:"No te hemos visto mucho últimamente",fr:"On ne t'a pas beaucoup vu ces derniers temps",ar:"لم نرك كثيراً مؤخراً",tr:"Son zamanlarda seni pek göremiyoruz",zh:"最近很少见到你"}},
  {id:544,category:"old_friend",level:"A1",t:{fa:"کجا بوده ای؟",en:"Where have you been?",de:"Wo bist du gewesen?",es:"¿Dónde has estado?",fr:"Où étais-tu?",ar:"أين كنت؟",tr:"Neredeydin?",zh:"你去哪儿了？"}},
  {id:545,category:"old_friend",level:"A1",t:{fa:"آیا از این جا نقل مکان کرده اید؟",en:"Have you moved or something?",de:"Bist du umgezogen oder so?",es:"¿Te has mudado o algo?",fr:"As-tu déménagé ou quoi?",ar:"هل انتقلت أم ماذا؟",tr:"Taşındın falan mı?",zh:"你搬家了吗？"}},
  {id:546,category:"acquainted",level:"A1",t:{fa:"اهل کجا هستید؟",en:"Where are you from?",de:"Woher kommen Sie?",es:"¿De dónde eres?",fr:"D'où venez-vous?",ar:"من أين أنت؟",tr:"Nerelisiniz?",zh:"你来自哪里？"}},
  {id:547,category:"acquainted",level:"A1",t:{fa:"ایرانی هستم",en:"I'm from Iran",de:"Ich komme aus Iran",es:"Soy de Irán",fr:"Je suis d'Iran",ar:"أنا من إيران",tr:"İran'lıyım",zh:"我来自伊朗"}},
  {id:548,category:"acquainted",level:"A1",t:{fa:"چه مدت است اینجا هستید؟",en:"How long have you been here?",de:"Wie lange sind Sie schon hier?",es:"¿Cuánto tiempo llevas aquí?",fr:"Depuis combien de temps êtes-vous ici?",ar:"منذ متى وأنت هنا؟",tr:"Ne zamandır buradasınız?",zh:"你来这里多久了？"}},
  {id:549,category:"acquainted",level:"A1",t:{fa:"مجرد هستم",en:"I'm single",de:"Ich bin ledig",es:"Soy soltero",fr:"Je suis célibataire",ar:"أنا أعزب",tr:"Bekarım",zh:"我单身"}},
  {id:550,category:"acquainted",level:"A1",t:{fa:"ازدواج کرده ام و یک پسر دارم",en:"I'm married and have a son",de:"Ich bin verheiratet und habe einen Sohn",es:"Estoy casado y tengo un hijo",fr:"Je suis marié et j'ai un fils",ar:"أنا متزوج ولدي ابن",tr:"Evliyim ve bir oğlum var",zh:"我结婚了，有一个儿子"}},
  {id:551,category:"acquainted",level:"A1",t:{fa:"شغل شما چیست؟",en:"What's your job?",de:"Was ist Ihr Beruf?",es:"¿Cuál es tu trabajo?",fr:"Quel est votre métier?",ar:"ما هي وظيفتك؟",tr:"İşiniz nedir?",zh:"你的工作是什么？"}},
  {id:552,category:"acquainted",level:"A1",t:{fa:"من دانشجوی دانشگاه هستم",en:"I'm a university student",de:"Ich bin Student an der Universität",es:"Soy estudiante universitario",fr:"Je suis étudiant à l'université",ar:"أنا طالب في الجامعة",tr:"Üniversite öğrencisiyim",zh:"我是一名大学生"}},
  {id:553,category:"acquainted",level:"A1",t:{fa:"من تاجرم",en:"I'm a businessman",de:"Ich bin Geschäftsmann",es:"Soy hombre de negocios",fr:"Je suis homme d'affaires",ar:"أنا رجل أعمال",tr:"İş adamıyım",zh:"我是商人"}},
  {id:554,category:"invitation",level:"A1",t:{fa:"آیا می‌توانید برای شام بیایید؟",en:"Can you come for dinner?",de:"Können Sie zum Abendessen kommen?",es:"¿Puedes venir a cenar?",fr:"Pouvez-vous venir dîner?",ar:"هل يمكنك الحضور للعشاء؟",tr:"Akşam yemeğine gelebilir misiniz?",zh:"你能来吃晚饭吗？"}},
  {id:555,category:"invitation",level:"A1",t:{fa:"با کمال میل",en:"I'd love to",de:"Sehr gern",es:"Me encantaría",fr:"J'aimerais beaucoup",ar:"يسعدني ذلك",tr:"Çok isterim",zh:"我很乐意"}},
  {id:556,category:"invitation",level:"A1",t:{fa:"خیلی مشتاقم اما نمی‌توانم",en:"I'd love to, but I can't",de:"Ich würde gerne, aber ich kann nicht",es:"Me encantaría, pero no puedo",fr:"J'aimerais beaucoup, mais je ne peux pas",ar:"أحب ذلك، لكن لا أستطيع",tr:"Çok isterim ama gelemem",zh:"我很想去，但我不能"}},
  {id:557,category:"invitation",level:"A1",t:{fa:"دعوت را می‌پذیرم",en:"I'd like that",de:"Das würde mir gefallen",es:"Me gustaría eso",fr:"J'aimerais ça",ar:"يعجبني ذلك",tr:"Bunu isterim",zh:"我喜欢"}},
  {id:558,category:"goodbye",level:"A1",t:{fa:"خدا حافظ",en:"Goodbye",de:"Auf Wiedersehen",es:"Adiós",fr:"Au revoir",ar:"مع السلامة",tr:"Hoşça kalın",zh:"再见"}},
  {id:559,category:"goodbye",level:"A1",t:{fa:"مراقب خودت باش",en:"Take care",de:"Pass auf dich auf",es:"Cuídate",fr:"Prends soin de toi",ar:"اعتن بنفسك",tr:"Kendine iyi bak",zh:"保重"}},
  {id:560,category:"goodbye",level:"A1",t:{fa:"به زودی می‌بینمت",en:"See you soon",de:"Bis bald",es:"Hasta pronto",fr:"À bientôt",ar:"أراك قريباً",tr:"Yakında görüşürüz",zh:"很快见"}},
  {id:561,category:"goodbye",level:"A1",t:{fa:"سفر خوش",en:"Have a good trip",de:"Gute Reise",es:"Buen viaje",fr:"Bon voyage",ar:"رحلة سعيدة",tr:"İyi yolculuklar",zh:"旅途愉快"}},
  {id:562,category:"telephone",level:"A1",t:{fa:"سلام، علی صحبت می‌کند",en:"Hello, this is Ali speaking",de:"Hallo, hier spricht Ali",es:"Hola, habla Ali",fr:"Bonjour, c'est Ali",ar:"مرحباً، علي يتحدث",tr:"Merhaba, Ali konuşuyor",zh:"你好，我是阿里"}},
  {id:563,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را نگهدارید",en:"Hold the line, please",de:"Bitte bleiben Sie am Apparat",es:"Espere en la línea, por favor",fr:"Ne quittez pas, s'il vous plaît",ar:"من فضلك ابق على الخط",tr:"Hatta kalın lütfen",zh:"请别挂断"}},
  {id:564,category:"telephone",level:"A1",t:{fa:"متأسفانه شماره شما اشتباه است",en:"Sorry, you have the wrong number",de:"Entschuldigung, Sie haben die falsche Nummer",es:"Lo siento, tienes el número equivocado",fr:"Désolé, vous avez le mauvais numéro",ar:"آسف، رقمك خاطئ",tr:"Üzgünüm, yanlış numara",zh:"抱歉，你打错号码了"}},
  {id:565,category:"telephone",level:"A1",t:{fa:"می‌توانم پیغامی بگذارم؟",en:"Can I leave a message?",de:"Kann ich eine Nachricht hinterlassen?",es:"¿Puedo dejar un mensaje?",fr:"Puis-je laisser un message?",ar:"هل يمكنني ترك رسالة؟",tr:"Mesaj bırakabilir miyim?",zh:"我能留言吗？"}},
  {id:566,category:"transport",level:"A2",t:{fa:"کرایه BMW چند است؟",en:"How much is it to rent a BMW?",de:"Wie viel kostet es, einen BMW zu mieten?",es:"¿Cuánto cuesta alquilar un BMW?",fr:"Combien coûte la location d'une BMW?",ar:"كم تكلفة استئجار بي إم دبليو؟",tr:"BMW kiralamak ne kadar?",zh:"租一辆宝马多少钱？"}},
  {id:567,category:"transport",level:"A2",t:{fa:"ایستگاه اتوبوس کجاست؟",en:"Where's the bus stop?",de:"Wo ist die Bushaltestelle?",es:"¿Dónde está la parada de autobús?",fr:"Où est l'arrêt de bus?",ar:"أين موقف الحافلة؟",tr:"Otobüs durağı nerede?",zh:"公共汽车站在哪里？"}},
  {id:568,category:"transport",level:"A2",t:{fa:"چه وقت قطار بعدی حرکت می‌کند؟",en:"When does the next train leave?",de:"Wann fährt der nächste Zug ab?",es:"¿Cuándo sale el próximo tren?",fr:"Quand part le prochain train?",ar:"متى يغادر القطار التالي؟",tr:"Sonraki tren ne zaman kalkar?",zh:"下一趟火车什么时候开？"}},
  {id:569,category:"taxi",level:"A2",t:{fa:"به یک تاکسی زنگ بزنید",en:"Call a taxi",de:"Rufen Sie ein Taxi",es:"Llama un taxi",fr:"Appelez un taxi",ar:"اتصل بسيارة أجرة",tr:"Taksi çağırın",zh:"叫一辆出租车"}},
  {id:570,category:"taxi",level:"A2",t:{fa:"لطفاً آهسته‌تر برانید",en:"Please drive slower",de:"Bitte fahren Sie langsamer",es:"Por favor, conduce más despacio",fr:"Conduisez plus lentement s'il vous plaît",ar:"من فضلك قد ببطء أكثر",tr:"Lütfen daha yavaş sürün",zh:"请开慢点"}},
  {id:571,category:"taxi",level:"A2",t:{fa:"لطفاً باک را پر کنید",en:"Fill it up, please",de:"Bitte volltanken",es:"Llénalo por favor",fr:"Faites le plein s'il vous plaît",ar:"امتلئ من فضلك",tr:"Lütfen doldurun",zh:"请加满"}},
  {id:572,category:"taxi",level:"A2",t:{fa:"ماشینم از کار افتاده است",en:"My car is broken down",de:"Mein Auto ist kaputt",es:"Mi coche se ha averiado",fr:"Ma voiture est en panne",ar:"سيارتي تعطلت",tr:"Arabam bozuldu",zh:"我的车坏了"}},
  {id:573,category:"taxi",level:"A2",t:{fa:"باطری از کار افتاده است",en:"The battery's dead",de:"Die Batterie ist leer",es:"La batería está muerta",fr:"La batterie est à plat",ar:"البطارية فارغة",tr:"Batarya bitti",zh:"电池没电了"}},
  {id:574,category:"taxi",level:"A2",t:{fa:"چقدر طول می‌کشد تعمیرش کنید؟",en:"How long will it take to fix?",de:"Wie lange wird die Reparatur dauern?",es:"¿Cuánto tiempo tardará en arreglarlo?",fr:"Combien de temps cela prendra-t-il pour le réparer?",ar:"كم سيستغرق الإصلاح؟",tr:"Tamiri ne kadar sürer?",zh:"修理要花多长时间？"}},
  {id:575,category:"common",level:"A1",t:{fa:"متشکرم",en:"Thank you",de:"Danke",es:"Gracias",fr:"Merci",ar:"شكراً",tr:"Teşekkürler",zh:"谢谢"}},
  {id:576,category:"common",level:"A1",t:{fa:"خواهش می‌کنم",en:"You're welcome",de:"Bitte schön",es:"De nada",fr:"De rien",ar:"عفواً",tr:"Rica ederim",zh:"不客气"}},
  {id:577,category:"common",level:"A1",t:{fa:"بله",en:"Yes",de:"Ja",es:"Sí",fr:"Oui",ar:"نعم",tr:"Evet",zh:"是的"}},
  {id:578,category:"common",level:"A1",t:{fa:"خیر",en:"No",de:"Nein",es:"No",fr:"Non",ar:"لا",tr:"Hayır",zh:"不"}},
  {id:579,category:"common",level:"A1",t:{fa:"متاسفم",en:"I'm sorry",de:"Es tut mir leid",es:"Lo siento",fr:"Je suis désolé",ar:"أنا آسف",tr:"Üzgünüm",zh:"对不起"}},
  {id:580,category:"common",level:"A1",t:{fa:"شب بخیر",en:"Good night",de:"Gute Nacht",es:"Buenas noches",fr:"Bonne nuit",ar:"ليلة سعيدة",tr:"İyi geceler",zh:"晚安"}},
  {id:581,category:"exercises",level:"A2",t:{fa:"آیا باید همین حالا بروید؟",en:"Do you have to leave now?",de:"Müssen Sie jetzt gehen?",es:"¿Tiene que irse ahora?",fr:"Devez-vous partir maintenant?",ar:"هل يجب أن تغادر الآن؟",tr:"Şimdi gitmek zorunda mısınız?",zh:"你现在必须走吗？"}},
  {id:582,category:"exercises",level:"A2",t:{fa:"آیا باید به اندازه کافی استراحت کنید؟",en:"Do you have to get plenty of rest?",de:"Müssen Sie sich ausreichend ausruhen?",es:"¿Tiene que descansar lo suficiente?",fr:"Devez-vous vous reposer suffisamment?",ar:"هل يجب أن تحصل على قسط كافٍ من الراحة؟",tr:"Yeterince dinlenmek zorunda mısınız?",zh:"你需要充分休息吗？"}},
  {id:583,category:"exercises",level:"A2",t:{fa:"آیا مری خسته است؟",en:"Is Mary tired?",de:"Ist Mary müde?",es:"¿Mary está cansada?",fr:"Mary est-elle fatiguée?",ar:"هل ماري متعبة؟",tr:"Mary yorgun mu?",zh:"玛丽累了吗？"}},
  {id:584,category:"exercises",level:"A2",t:{fa:"آیا حالتان خوب است؟",en:"Do you feel all right?",de:"Fühlen Sie sich wohl?",es:"¿Se siente bien?",fr:"Vous sentez-vous bien?",ar:"هل تشعر أنك بخير؟",tr:"Kendinizi iyi hissediyor musunuz?",zh:"你感觉还好吗？"}},
  {id:585,category:"exercises",level:"A2",t:{fa:"آیا خوشحالید؟",en:"Are you happy?",de:"Sind Sie glücklich?",es:"¿Está feliz?",fr:"Êtes-vous heureux/heureuse?",ar:"هل أنت سعيد؟",tr:"Mutlu musunuz?",zh:"你开心吗？"}},
  {id:586,category:"exercises",level:"A2",t:{fa:"آیا علی ترکی است؟",en:"Is Ali Turkish?",de:"Ist Ali Türke?",es:"¿Ali es turco?",fr:"Ali est-il turc?",ar:"هل علي تركي؟",tr:"Ali Türk mü?",zh:"阿里是土耳其人吗？"}},
  {id:587,category:"exercises",level:"A2",t:{fa:"آیا آنها افغان هستند؟",en:"Are they Afghans?",de:"Sind sie Afghanen?",es:"¿Son afganos?",fr:"Sont-ils afghans?",ar:"هل هم أفغان؟",tr:"Onlar Afgan mı?",zh:"他们是阿富汗人吗？"}},
  {id:588,category:"exercises",level:"A2",t:{fa:"آیا معلم شما انگلیسی است؟",en:"Is your teacher English?",de:"Ist Ihr Lehrer Engländer?",es:"¿Su profesor es inglés?",fr:"Votre professeur est-il anglais?",ar:"هل معلمك إنجليزي؟",tr:"Öğretmeniniz İngiliz mi?",zh:"你的老师是英国人吗？"}},
  {id:589,category:"exercises",level:"A2",t:{fa:"آیا ایرانی هستید؟",en:"Are you Iranian?",de:"Sind Sie Iraner?",es:"¿Es iraní?",fr:"Êtes-vous iranien/iranienne?",ar:"هل أنت إيراني؟",tr:"İranlı mısınız?",zh:"你是伊朗人吗？"}},
  {id:590,category:"exercises",level:"A2",t:{fa:"آیا اهل تهران هستید؟",en:"Are you from Tehran?",de:"Kommen Sie aus Teheran?",es:"¿Es de Teherán?",fr:"Êtes-vous de Téhéran?",ar:"هل أنت من طهران؟",tr:"Tahran'lı mısınız?",zh:"你来自德黑兰吗？"}},
  {id:591,category:"exercises",level:"A2",t:{fa:"آیا او اهل سانفرانسیسکو است؟",en:"Is she from San Francisco?",de:"Kommt sie aus San Francisco?",es:"¿Es de San Francisco?",fr:"Est-elle de San Francisco?",ar:"هل هي من سان فرانسيسكو؟",tr:"San Francisco'lu mu?",zh:"她来自旧金山吗？"}},
  {id:592,category:"exercises",level:"A2",t:{fa:"اهل کدام شهر هستید؟",en:"Which city are you from?",de:"Aus welcher Stadt kommen Sie?",es:"¿De qué ciudad es?",fr:"De quelle ville êtes-vous?",ar:"من أي مدينة أنت؟",tr:"Hangi şehirdensiniz?",zh:"你来自哪个城市？"}},
  {id:593,category:"exercises",level:"A2",t:{fa:"آنها به چه زبانی صحبت می‌کنند؟",en:"What language are they speaking?",de:"Welche Sprache sprechen sie?",es:"¿Qué idioma están hablando?",fr:"Quelle langue parlent-ils?",ar:"ما هي اللغة التي يتحدثون بها؟",tr:"Hangi dili konuşuyorlar?",zh:"他们在说什么语言？"}},
  {id:594,category:"exercises",level:"A2",t:{fa:"به چه زبانی صحبت می‌کنید؟",en:"What language do you speak?",de:"Welche Sprache sprechen Sie?",es:"¿Qué idioma habla?",fr:"Quelle langue parlez-vous?",ar:"ما هي اللغة التي تتحدثها؟",tr:"Hangi dili konuşuyorsunuz?",zh:"你说什么语言？"}},
  {id:595,category:"exercises",level:"A2",t:{fa:"شما کی هستید؟",en:"Who are you?",de:"Wer sind Sie?",es:"¿Quién es?",fr:"Qui êtes-vous?",ar:"من أنت؟",tr:"Siz kimsiniz?",zh:"你是谁？"}},
  {id:596,category:"exercises",level:"A2",t:{fa:"او کیست؟ (بیل، دوست من)",en:"Who is he? (Bill, my friend)",de:"Wer ist er? (Bill, mein Freund)",es:"¿Quién es él? (Bill, mi amigo)",fr:"Qui est-il? (Bill, mon ami)",ar:"من هو؟ (بيل، صديقي)",tr:"O kim? (Bill, arkadaşım)",zh:"他是谁？（比尔，我的朋友）"}},
  {id:597,category:"exercises",level:"A2",t:{fa:"او اهل کجاست؟",en:"Where is he from?",de:"Woher kommt er?",es:"¿De dónde es él?",fr:"D'où est-il?",ar:"من أين هو؟",tr:"O nereli?",zh:"他来自哪里？"}},
  {id:598,category:"exercises",level:"A2",t:{fa:"لطفاً اسم شما چیست؟",en:"What's your name, please?",de:"Wie ist Ihr Name, bitte?",es:"¿Cómo se llama, por favor?",fr:"Quel est votre nom, s'il vous plaît?",ar:"ما اسمك من فضلك؟",tr:"Adınız nedir lütfen?",zh:"请问你叫什么名字？"}},
  {id:599,category:"exercises",level:"A2",t:{fa:"لطفاً آن را برایم هجی می‌کنید؟",en:"Would you spell it for me, please?",de:"Würden Sie es bitte für mich buchstabieren?",es:"¿Puede deletreármelo, por favor?",fr:"Pourriez-vous l'épeler pour moi, s'il vous plaît?",ar:"هل يمكنك تهجئتها لي من فضلك؟",tr:"Lütfen benim için heceleyebilir misiniz?",zh:"请你拼写给我看，好吗？"}},
  {id:600,category:"exercises",level:"A2",t:{fa:"کجا زندگی می‌کنید؟",en:"Where do you live?",de:"Wo wohnen Sie?",es:"¿Dónde vive?",fr:"Où habitez-vous?",ar:"أين تعيش؟",tr:"Nerede yaşıyorsunuz?",zh:"你住在哪里？"}},
  {id:601,category:"exercises",level:"A2",t:{fa:"آدرس شما چیست؟",en:"What's your address?",de:"Wie ist Ihre Adresse?",es:"¿Cuál es su dirección?",fr:"Quelle est votre adresse?",ar:"ما هو عنوانك؟",tr:"Adresiniz nedir?",zh:"你的地址是什么？"}},
  {id:602,category:"exercises",level:"A2",t:{fa:"معلم شما کیست؟",en:"Who is your teacher?",de:"Wer ist Ihr Lehrer?",es:"¿Quién es su profesor?",fr:"Qui est votre professeur?",ar:"من هو معلمك؟",tr:"Öğretmeniniz kim?",zh:"你的老师是谁？"}},
  {id:603,category:"exercises",level:"A2",t:{fa:"آیا خواهر یا برادری دارید؟",en:"Do you have any brothers or sisters?",de:"Haben Sie Geschwister?",es:"¿Tiene hermanos?",fr:"Avez-vous des frères et sœurs?",ar:"هل لديك إخوة أو أخوات؟",tr:"Kardeşiniz var mı?",zh:"你有兄弟姐妹吗？"}},
  {id:604,category:"exercises",level:"A2",t:{fa:"چند تا برادر دارید؟",en:"How many brothers do you have?",de:"Wie viele Brüder haben Sie?",es:"¿Cuántos hermanos tiene?",fr:"Combien de frères avez-vous?",ar:"كم عدد إخوتك الذكور؟",tr:"Kaç erkek kardeşiniz var?",zh:"你有几个兄弟？"}},
  {id:605,category:"exercises",level:"A2",t:{fa:"چند تا خواهر دارید؟",en:"How many sisters do you have?",de:"Wie viele Schwestern haben Sie?",es:"¿Cuántas hermanas tiene?",fr:"Combien de sœurs avez-vous?",ar:"كم عدد أخواتك؟",tr:"Kaç kız kardeşiniz var?",zh:"你有几个姐妹？"}},
  {id:606,category:"exercises",level:"A2",t:{fa:"لطفاً می‌توانید کمی آهسته‌تر صحبت کنید؟",en:"Could you speak a bit more slowly, please?",de:"Könnten Sie bitte etwas langsamer sprechen?",es:"¿Podría hablar un poco más despacio, por favor?",fr:"Pourriez-vous parler un peu plus lentement, s'il vous plaît?",ar:"هل يمكنك التحدث ببطء أكثر من فضلك؟",tr:"Lütfen biraz daha yavaş konuşabilir misiniz?",zh:"你能说慢一点吗？"}},
  {id:607,category:"exercises",level:"A2",t:{fa:"من انگلیسی را خیلی خوب صحبت نمی‌کنم",en:"I don't speak English very well",de:"Ich spreche nicht sehr gut Englisch",es:"No hablo muy bien inglés",fr:"Je ne parle pas très bien anglais",ar:"لا أتحدث الإنجليزية بشكل جيد",tr:"İngilizceyi çok iyi konuşamıyorum",zh:"我英语说得不太好"}},
  {id:608,category:"exercises",level:"A2",t:{fa:"لطفاً آن را تکرار می‌کنید؟",en:"Could you repeat that, please?",de:"Könnten Sie das bitte wiederholen?",es:"¿Podría repetir eso, por favor?",fr:"Pourriez-vous répéter cela, s'il vous plaît?",ar:"هل يمكنك تكرار ذلك من فضلك؟",tr:"Lütfen tekrar eder misiniz?",zh:"你能重复一遍吗？"}},
  {id:609,category:"exercises",level:"A2",t:{fa:"لطفاً آن را هجی می‌کنید؟",en:"Could you spell that, please?",de:"Könnten Sie das bitte buchstabieren?",es:"¿Podría deletrear eso, por favor?",fr:"Pourriez-vous l'épeler, s'il vous plaît?",ar:"هل يمكنك تهجئة ذلك من فضلك؟",tr:"Lütfen heceler misiniz?",zh:"你能拼写一下吗？"}},
  {id:610,category:"exercises",level:"A2",t:{fa:"ممکن است اسمتان را بپرسم؟",en:"May I have your name, please?",de:"Darf ich Ihren Namen erfahren?",es:"¿Puedo saber su nombre, por favor?",fr:"Puis-je avoir votre nom, s'il vous plaît?",ar:"هل يمكنني معرفة اسمك من فضلك؟",tr:"Adınızı alabilir miyim?",zh:"请问您叫什么名字？"}},
  {id:611,category:"exercises",level:"A2",t:{fa:"لطفاً می‌توانم با علی صحبت کنم؟",en:"May I speak to Ali, please?",de:"Darf ich bitte mit Ali sprechen?",es:"¿Puedo hablar con Ali, por favor?",fr:"Puis-je parler à Ali, s'il vous plaît?",ar:"هل يمكنني التحدث مع علي من فضلك؟",tr:"Ali ile konuşabilir miyim lütfen?",zh:"请问我可以和阿里说话吗？"}},
  {id:612,category:"exercises",level:"A2",t:{fa:"لطفاً می‌توانم با مدیر صحبت کنم؟",en:"May I speak to the manager, please?",de:"Darf ich bitte mit dem Manager sprechen?",es:"¿Puedo hablar con el gerente, por favor?",fr:"Puis-je parler au gérant, s'il vous plaît?",ar:"هل يمكنني التحدث مع المدير من فضلك؟",tr:"Müdürle konuşabilir miyim lütfen?",zh:"请问我可以和经理说话吗？"}},
  {id:613,category:"exercises",level:"A2",t:{fa:"شما که هستید؟ (پشت تلفن)",en:"Who's calling?",de:"Wer ruft an?",es:"¿Quién llama?",fr:"Qui appelle?",ar:"من المتصل؟",tr:"Kim arıyor?",zh:"请问您是哪位？"}},
  {id:614,category:"greetings",level:"A1",t:{fa:"سلام",en:"Hi",de:"Hallo",es:"Hola",fr:"Salut",tr:"Merhaba",ar:"مرحباً",zh:"你好",ko:"안녕",ja:"こんにちは",hi:"नमस्ते",ga:"Dia dhuit",uk:"Привіт"}},
  {id:615,category:"greetings",level:"A1",t:{fa:"سلام علیکم",en:"Hello there",de:"Hallo",es:"Hola",fr:"Bonjour",tr:"Merhaba",ar:"السلام عليكم",zh:"你好",ko:"안녕하세요",ja:"こんにちは",hi:"नमस्ते",ga:"Dia dhuit",uk:"Вітаю"}},
  {id:616,category:"greetings",level:"A1",t:{fa:"صبح بخیر",en:"Good morning",de:"Guten Morgen",es:"Buenos días",fr:"Bonjour",tr:"Günaydın",ar:"صباح الخير",zh:"早上好",ko:"좋은 아침",ja:"おはようございます",hi:"सुप्रभात",ga:"Maidin mhaith",uk:"Доброго ранку"}},
  {id:617,category:"greetings",level:"A1",t:{fa:"عصر بخیر",en:"Good afternoon",de:"Guten Tag",es:"Buenas tardes",fr:"Bon après-midi",tr:"İyi günler",ar:"مساء الخير",zh:"下午好",ko:"안녕하세요",ja:"こんにちは",hi:"शुभ अपराह्न",ga:"Tráthnóna maith",uk:"Добрий день"}},
  {id:618,category:"greetings",level:"A1",t:{fa:"شب خوش",en:"Good evening",de:"Guten Abend",es:"Buenas noches",fr:"Bonsoir",tr:"İyi akşamlar",ar:"مساء الخير",zh:"晚上好",ko:"안녕히 주무세요",ja:"こんばんは",hi:"शुभ संध्या",ga:"Tráthnóna maith",uk:"Добрий вечір"}},
  {id:619,category:"greetings",level:"A1",t:{fa:"چطورید؟",en:"How are you?",de:"Wie geht es Ihnen?",es:"¿Cómo está?",fr:"Comment allez-vous?",tr:"Nasılsınız?",ar:"كيف حالك؟",zh:"你好吗？",ko:"어떻게 지내세요?",ja:"お元気ですか？",hi:"आप कैसे हैं?",ga:"Conas atá tú?",uk:"Як справи?"}},
  {id:620,category:"greetings",level:"A1",t:{fa:"حال شما چطور است؟",en:"How are you doing?",de:"Wie geht es dir?",es:"¿Cómo te va?",fr:"Comment ça va?",tr:"Nasıl gidiyor?",ar:"كيف تسير الأمور؟",zh:"你怎么样？",ko:"잘 지내세요?",ja:"調子はどうですか？",hi:"आप कैसे हैं?",ga:"Conas atá ag éirí leat?",uk:"Як справи?"}},
  {id:621,category:"greetings",level:"A1",t:{fa:"اوضاع چطوره؟",en:"How are things?",de:"Wie läuft es?",es:"¿Cómo van las cosas?",fr:"Comment vont les choses?",tr:"İşler nasıl?",ar:"كيف الأمور؟",zh:"事情怎么样？",ko:"일은 어떻게 되어가요?",ja:"調子はどうですか？",hi:"हालात कैसे हैं?",ga:"Conas atá cúrsaí?",uk:"Як справи?"}},
  {id:622,category:"greetings",level:"A1",t:{fa:"زندگی چطوره؟",en:"How's life?",de:"Wie läuft das Leben?",es:"¿Cómo va la vida?",fr:"Comment va la vie?",tr:"Hayat nasıl?",ar:"كيف الحياة؟",zh:"生活怎么样？",ko:"인생은 어떠세요?",ja:"人生はどうですか？",hi:"ज़िंदगी कैसी है?",ga:"Conas atá an saol?",uk:"Як життя?"}},
  {id:623,category:"greetings",level:"A1",t:{fa:"خوبم متشکرم",en:"I'm fine, thank you",de:"Mir geht es gut, danke",es:"Estoy bien, gracias",fr:"Je vais bien, merci",tr:"İyiyim, teşekkürler",ar:"أنا بخير، شكراً",zh:"我很好，谢谢",ko:"잘 지내요, 감사합니다",ja:"元気です、ありがとう",hi:"मैं ठीक हूँ, धन्यवाद",ga:"Tá mé go maith, go raibh maith agat",uk:"Я добре, дякую"}},
  {id:624,category:"greetings",level:"A1",t:{fa:"خوب است متشکرم",en:"Fine, thanks",de:"Gut, danke",es:"Bien, gracias",fr:"Bien, merci",tr:"İyi, teşekkürler",ar:"بخير، شكراً",zh:"很好，谢谢",ko:"좋아요, 감사합니다",ja:"いいです、ありがとう",hi:"ठीक हूँ, धन्यवाद",ga:"Go maith, go raibh maith agat",uk:"Добре, дякую"}},
  {id:625,category:"greetings",level:"A1",t:{fa:"خوب نیست",en:"Not well!",de:"Nicht gut!",es:"¡No bien!",fr:"Pas bien!",tr:"İyi değil!",ar:"ليس بخير!",zh:"不太好！",ko:"안 좋아요!",ja:"良くないです！",hi:"ठीक नहीं!",ga:"Níl mé go maith!",uk:"Не добре!"}},
  {id:626,category:"greetings",level:"A1",t:{fa:"آن قدرها خوب نیست",en:"Not so good",de:"Nicht so gut",es:"No tan bien",fr:"Pas si bon",tr:"Pek iyi değil",ar:"ليس جيداً",zh:"不太好",ko:"별로 안 좋아요",ja:"あまり良くない",hi:"बहुत अच्छा नहीं",ga:"Níl sé chomh maith",uk:"Не дуже добре"}},
  {id:627,category:"greetings",level:"A1",t:{fa:"چندان خوب نیست",en:"Not very good",de:"Nicht sehr gut",es:"No muy bien",fr:"Pas très bon",tr:"Çok iyi değil",ar:"ليس جيداً جداً",zh:"不太好",ko:"별로 좋지 않아요",ja:"あまり良くない",hi:"बहुत अच्छा नहीं",ga:"Níl sé an-mhaith",uk:"Не дуже добре"}},
  {id:628,category:"greetings",level:"A1",t:{fa:"به اندازه کافی خوب نیست",en:"Not too good",de:"Nicht allzu gut",es:"No demasiado bien",fr:"Pas trop bon",tr:"Çok iyi değil",ar:"ليس جيداً كافياً",zh:"不太好",ko:"별로 좋지 않아요",ja:"あまり良くない",hi:"बहुत अच्छा नहीं",ga:"Níl sé ró-mhaith",uk:"Не дуже добре"}},
  {id:629,category:"greetings",level:"A1",t:{fa:"(خیلی) بد نمی گذرد",en:"Not (too) bad",de:"Nicht (allzu) schlecht",es:"No (muy) mal",fr:"Pas (trop) mal",tr:"Fena değil",ar:"ليس سيئاً",zh:"还不错",ko:"괜찮아요",ja:"悪くない",hi:"बुरा नहीं",ga:"Níl sé go dona",uk:"Непогано"}},
  {id:630,category:"greetings",level:"A1",t:{fa:"و شما چطورید؟",en:"What about you?",de:"Und Sie?",es:"¿Y tú?",fr:"Et vous?",tr:"Peki siz?",ar:"وأنت؟",zh:"你呢？",ko:"당신은요?",ja:"あなたは？",hi:"और आप?",ga:"Agus tú féin?",uk:"А ви?"}},
  {id:631,category:"greetings",level:"A1",t:{fa:"خودتان چطورید؟",en:"How about yourself?",de:"Und selbst?",es:"¿Y usted mismo?",fr:"Et vous-même?",tr:"Kendiniz nasılsınız?",ar:"وأنت بنفسك؟",zh:"你自己呢？",ko:"당신 자신은요?",ja:"あなた自身は？",hi:"आप स्वयं?",ga:"Agus tú féin?",uk:"А самі ви?"}},
  {id:632,category:"meeting",level:"A1",t:{fa:"از ملاقات شما خوشوقتم",en:"Nice to meet you",de:"Freut mich, Sie kennenzulernen",es:"Mucho gusto",fr:"Enchanté(e)",tr:"Tanıştığımıza memnun oldum",ar:"سُررت بلقائك",zh:"很高兴见到你",ko:"만나서 반갑습니다",ja:"はじめまして",hi:"आपसे मिलकर खुशी हुई",ga:"Is deas bualadh leat",uk:"Приємно познайомитись"}},
  {id:633,category:"meeting",level:"A1",t:{fa:"اسم شما چیست؟",en:"What's your name?",de:"Wie heißen Sie?",es:"¿Cómo te llamas?",fr:"Comment vous appelez-vous?",tr:"Adınız nedir?",ar:"ما اسمك؟",zh:"你叫什么名字？",ko:"이름이 어떻게 되세요?",ja:"お名前は？",hi:"आपका नाम क्या है?",ga:"Cad is ainm duit?",uk:"Як вас звати?"}},
  {id:634,category:"meeting",level:"A1",t:{fa:"من علی هستم",en:"I'm Ali",de:"Ich bin Ali",es:"Soy Ali",fr:"Je suis Ali",tr:"Ben Ali",ar:"أنا علي",zh:"我是阿里",ko:"저는 알리입니다",ja:"アリです",hi:"मैं अली हूँ",ga:"Is mise Ali",uk:"Я Алі"}},
  {id:635,category:"meeting",level:"A1",t:{fa:"فکر نمی کنم قبلاً همدیگر را ملاقات کرده باشیم",en:"I don't think we've met before",de:"Ich glaube nicht, dass wir uns schon einmal getroffen haben",es:"No creo que nos hayamos conocido antes",fr:"Je ne pense pas que nous nous soyons déjà rencontrés",tr:"Daha önce tanıştığımızı sanmıyorum",ar:"لا أعتقد أننا التقينا من قبل",zh:"我想我们以前没见过",ko:"전에 만난 적이 없는 것 같아요",ja:"以前お会いしたことがないと思います",hi:"मुझे नहीं लगता हम पहले मिले हैं",ga:"Ní dóigh liom gur bhuail muid le chéile roimhe",uk:"Не думаю, що ми раніше зустрічалися"}},
  {id:636,category:"meeting",level:"A1",t:{fa:"اسمم احمد است. اسم شما چیست؟",en:"My name is Ahmad. What's yours?",de:"Mein Name ist Ahmad. Wie ist Ihrer?",es:"Mi nombre es Ahmad. ¿Y el tuyo?",fr:"Je m'appelle Ahmad. Et vous?",tr:"Benim adım Ahmad. Sizinki?",ar:"اسمي أحمد. ما اسمك؟",zh:"我叫艾哈迈德。你呢？",ko:"제 이름은 아흐마드입니다. 당신은요?",ja:"私の名前はアフマドです。あなたは？",hi:"मेरा नाम अहमद है। आपका?",ga:"Ahmad is ainm dom. Agus tusa?",uk:"Мене звуть Ахмад. А вас?"}},
  {id:637,category:"meeting",level:"A1",t:{fa:"چه خوب است دوباره دیدمتان",en:"Nice seeing you again",de:"Schön, Sie wiederzusehen",es:"Qué bueno verte de nuevo",fr:"Ravi de vous revoir",tr:"Sizi tekrar görmek ne güzel",ar:"من الجميل رؤيتك مرة أخرى",zh:"很高兴再次见到你",ko:"다시 만나서 반갑습니다",ja:"またお会いできて嬉しいです",hi:"आपको फिर से देखकर अच्छा लगा",ga:"Go deas thú a fheiceáil arís",uk:"Приємно бачити вас знову"}},
  {id:638,category:"meeting",level:"A1",t:{fa:"از دیدارتان خوشحالم",en:"Happy to meet you",de:"Ich freue mich, Sie zu treffen",es:"Encantado de conocerle",fr:"Heureux de vous rencontrer",tr:"Tanıştığıma memnun oldum",ar:"سعيد بلقائك",zh:"很高兴见到你",ko:"만나서 기쁩니다",ja:"お会いできて嬉しいです",hi:"आपसे मिलकर खुशी हुई",ga:"Áthas orm bualadh leat",uk:"Радий познайомитись"}},
  {id:639,category:"meeting",level:"A1",t:{fa:"از ملاقات شما خوشحال شدم",en:"Glad to meet you",de:"Freut mich, Sie zu treffen",es:"Encantado de conocerte",fr:"Ravi de vous rencontrer",tr:"Tanıştığıma memnun oldum",ar:"سعيد بلقائك",zh:"见到你很高兴",ko:"만나서 반갑습니다",ja:"お会いできて嬉しいです",hi:"आपसे मिलकर खुशी हुई",ga:"Áthas orm bualadh leat",uk:"Радий познайомитись"}},
  {id:640,category:"meeting",level:"A1",t:{fa:"خوشوقتم (رسمی)",en:"How do you do?",de:"Wie geht es Ihnen?",es:"¿Cómo está usted?",fr:"Comment allez-vous?",tr:"Nasılsınız?",ar:"كيف حالك؟",zh:"您好",ko:"안녕하십니까?",ja:"お元気ですか？",hi:"आप कैसे हैं?",ga:"Conas atá tú?",uk:"Як справи?"}},
  {id:641,category:"meeting",level:"A1",t:{fa:"باعث خوشحالی و افتخار من است که دیدمتان",en:"It's a pleasure to see you",de:"Es ist eine Freude, Sie zu sehen",es:"Es un placer verte",fr:"C'est un plaisir de vous voir",tr:"Sizi görmek bir zevk",ar:"من دواعي سروري رؤيتك",zh:"很高兴见到你",ko:"뵙게 되어 기쁩니다",ja:"お会いできて光栄です",hi:"आपको देखकर खुशी हुई",ga:"Is áthas liom tú a fheiceáil",uk:"Радий вас бачити"}},
  {id:642,category:"meeting",level:"A1",t:{fa:"باعث خوشحالی است",en:"It's my pleasure",de:"Es ist mir eine Freude",es:"Es un placer",fr:"C'est un plaisir",tr:"Bu bir zevk",ar:"إنه لمن دواعي سروري",zh:"很荣幸",ko:"기쁩니다",ja:"嬉しいです",hi:"यह मेरा सौभाग्य है",ga:"Is é mo phléisiúr é",uk:"Це моє задоволення"}},
  {id:643,category:"meeting",level:"A1",t:{fa:"زندگی در اینجا چطور است؟",en:"What do you think of life in here?",de:"Was halten Sie vom Leben hier?",es:"¿Qué opinas de la vida aquí?",fr:"Que pensez-vous de la vie ici?",tr:"Buradaki hayatı nasıl buluyorsunuz?",ar:"ما رأيك في الحياة هنا؟",zh:"你觉得这里的生活怎么样？",ko:"여기 생활이 어떠세요?",ja:"ここの生活はどうですか？",hi:"यहाँ की ज़िंदगी कैसी है?",ga:"Cad é do bharúil ar an saol anseo?",uk:"Як вам життя тут?"}},
  {id:644,category:"meeting",level:"A1",t:{fa:"(نیویورک/لندن) را چقدر دوست دارید؟",en:"How do you like (New York/London)?",de:"Wie gefällt Ihnen (New York/London)?",es:"¿Cómo te gusta (Nueva York/Londres)?",fr:"Comment aimez-vous (New York/Londres)?",tr:"(New York/Londra)'yı nasıl buluyorsunuz?",ar:"كيف تحب (نيويورك/لندن)؟",zh:"你喜欢（纽约/伦敦）吗？",ko:"(뉴욕/런던)이 어떻게 생각하세요?",ja:"（ニューヨーク／ロンドン）はどうですか？",hi:"आपको (न्यूयॉर्क/लंदन) कैसा लगता है?",ga:"Conas is maith leat (Nua-Eabhrac/Londain)?",uk:"Як вам (Нью-Йорк/Лондон)?"}},
  {id:645,category:"meeting",level:"A1",t:{fa:"به نظرتان وضع این جا چطور است؟",en:"How do you find things over here?",de:"Wie finden Sie die Dinge hier?",es:"¿Cómo encuentras las cosas por aquí?",fr:"Comment trouvez-vous les choses ici?",tr:"Buradaki durumu nasıl buluyorsunuz?",ar:"كيف تجد الأمور هنا؟",zh:"你觉得这里怎么样？",ko:"여기 사정이 어떠세요?",ja:"ここの様子はどうですか？",hi:"आपको यहाँ कैसा लगता है?",ga:"Conas a aimsíonn tú rudaí anseo?",uk:"Як вам тут?"}},
  {id:646,category:"meeting",level:"A1",t:{fa:"آیا قبلاً همدیگر را ملاقات کرده ایم",en:"Have we met before?",de:"Haben wir uns schon einmal getroffen?",es:"¿Nos hemos conocido antes?",fr:"Nous sommes-nous déjà rencontrés?",tr:"Daha önce tanıştık mı?",ar:"هل التقينا من قبل؟",zh:"我们以前见过吗？",ko:"전에 만난 적 있나요?",ja:"以前お会いしましたか？",hi:"क्या हम पहले मिले हैं?",ga:"Ar bhuail muid le chéile roimhe?",uk:"Ми раніше зустрічалися?"}},
  {id:647,category:"meeting",level:"A1",t:{fa:"گویا شما را جایی دیده ام",en:"Do I know you from somewhere?",de:"Kenne ich Sie von irgendwoher?",es:"¿Te conozco de algún lado?",fr:"Est-ce que je vous connais d'ailleurs?",tr:"Sizi bir yerden tanıyor muyum?",ar:"هل أعرفك من مكان ما؟",zh:"我在哪里见过你吗？",ko:"어디서 본 적 있나요?",ja:"どこかでお会いしましたか？",hi:"क्या मैं आपको कहीं से जानता हूँ?",ga:"An bhfuil aithne agam ort as áit éigin?",uk:"Я вас звідкись знаю?"}},
  {id:648,category:"meeting",level:"A1",t:{fa:"مرا ببخشید / معذرت میخواهم",en:"Pardon me / Excuse me",de:"Verzeihen Sie / Entschuldigen Sie",es:"Perdón / Disculpe",fr:"Pardonnez-moi / Excusez-moi",tr:"Affedersiniz / Pardon",ar:"عفواً / اعذرني",zh:"对不起 / 打扰一下",ko:"실례합니다 / 죄송합니다",ja:"すみません / 失礼します",hi:"माफ़ कीजिए / क्षमा कीजिए",ga:"Gabhaigí mo leithscéal",uk:"Вибачте / Перепрошую"}},
  {id:649,category:"meeting",level:"A1",t:{fa:"آیا شما را جایی دیده ام؟",en:"Have I seen you somewhere?",de:"Habe ich Sie irgendwo gesehen?",es:"¿Te he visto en algún lado?",fr:"Est-ce que je vous ai vu quelque part?",tr:"Sizi bir yerde gördüm mü?",ar:"هل رأيتك في مكان ما؟",zh:"我在哪里见过你吗？",ko:"어디서 뵌 적 있나요?",ja:"どこかでお見かけしましたか？",hi:"क्या मैंने आपको कहीं देखा है?",ga:"An bhfaca mé thú áit éigin?",uk:"Я вас десь бачив?"}},
  {id:650,category:"meeting",level:"A1",t:{fa:"من (آقا / خانم / دوشیزه ...) هستم",en:"I am (Mr./Mrs./Ms. ...)",de:"Ich bin (Herr/Frau/Fräulein ...)",es:"Soy (Sr./Sra./Srta. ...)",fr:"Je suis (M./Mme/Mlle ...)",tr:"Ben (Bay/Bayan/Matmazel ...)",ar:"أنا (السيد/السيدة/الآنسة ...)",zh:"我是（先生/女士/小姐...）",ko:"저는 (씨/부인/양)입니다",ja:"（〜さん）です",hi:"मैं (श्री/श्रीमती/सुश्री ...) हूँ",ga:"Is mise (an tUasal/Bean/Iníon ...)",uk:"Я (пан/пані/панна ...)"}},
  {id:651,category:"meeting",level:"A1",t:{fa:"من این کشور را خیلی دوست دارم",en:"I like this country very much",de:"Ich mag dieses Land sehr",es:"Me gusta mucho este país",fr:"J'aime beaucoup ce pays",tr:"Bu ülkeyi çok seviyorum",ar:"أحب هذا البلد كثيراً",zh:"我非常喜欢这个国家",ko:"이 나라를 정말 좋아합니다",ja:"この国がとても好きです",hi:"मुझे यह देश बहुत पसंद है",ga:"Is maith liom an tír seo go mór",uk:"Мені дуже подобається ця країна"}},
  {id:652,category:"meeting",level:"A1",t:{fa:"انگلستان بیش از آنچه تصور می کردم سرد است",en:"England is much colder than I thought",de:"England ist viel kälter, als ich dachte",es:"Inglaterra es mucho más fría de lo que pensaba",fr:"L'Angleterre est beaucoup plus froide que je ne le pensais",tr:"İngiltere düşündüğümden çok daha soğuk",ar:"إنجلترا أبرد بكثير مما توقعت",zh:"英格兰比我想象的要冷得多",ko:"영국은 제가 생각했던 것보다 훨씬 춥습니다",ja:"イギリスは思っていたよりずっと寒いです",hi:"इंग्लैंड मेरी सोच से कहीं ज़्यादा ठंडा है",ga:"Tá Sasana i bhfad níos fuaire ná mar a shíl mé",uk:"Англія набагато холодніша, ніж я думав"}},
  {id:653,category:"meeting",level:"A1",t:{fa:"این کشور با آنچه انتظار داشتم کاملاً تفاوت دارد",en:"This country is quite different from what I expected",de:"Dieses Land ist ganz anders, als ich erwartet hatte",es:"Este país es muy diferente a lo que esperaba",fr:"Ce pays est très différent de ce que j'attendais",tr:"Bu ülke beklediğimden oldukça farklı",ar:"هذا البلد مختلف تماماً عما توقعت",zh:"这个国家和我想象的完全不同",ko:"이 나라는 제가 기대했던 것과 상당히 다릅니다",ja:"この国は思っていたのとかなり違います",hi:"यह देश मेरी उम्मीद से काफी अलग है",ga:"Tá an tír seo an-difriúil ón méid a bhí súil agam",uk:"Ця країна зовсім інша, ніж я очікував"}},
  {id:654,category:"meeting",level:"A1",t:{fa:"من هنوز دلتنگ هستم",en:"I'm still feeling homesick",de:"Ich habe immer noch Heimweh",es:"Todavía estoy nostálgico",fr:"J'ai toujours le mal du pays",tr:"Hâlâ vatan hasreti çekiyorum",ar:"ما زلت أشعر بالحنين إلى الوطن",zh:"我仍然想家",ko:"아직도 향수병이 납니다",ja:"まだホームシックです",hi:"मुझे अब भी घर की याद आ रही है",ga:"Tá mé fós ag iarraidh dul abhaile",uk:"Я все ще сумую за домом"}},
  {id:655,category:"meeting",level:"A1",t:{fa:"بله البته شما چطورید؟",en:"Yes, of course. How are you?",de:"Ja, natürlich. Wie geht es Ihnen?",es:"Sí, claro. ¿Cómo estás?",fr:"Oui, bien sûr. Comment allez-vous?",tr:"Evet, elbette. Nasılsınız?",ar:"نعم، بالطبع. كيف حالك؟",zh:"是的，当然。你好吗？",ko:"네, 물론이죠. 어떻게 지내세요?",ja:"はい、もちろん。お元気ですか？",hi:"हाँ, बिल्कुल। आप कैसे हैं?",ga:"Sea, ar ndóigh. Conas atá tú?",uk:"Так, звичайно. Як справи?"}},
  {id:656,category:"meeting",level:"A1",t:{fa:"بله این طور فکر میکنم شما چطورید؟",en:"Yes, I think so. How are you?",de:"Ja, ich denke schon. Wie geht es Ihnen?",es:"Sí, eso creo. ¿Cómo estás?",fr:"Oui, je le pense. Comment allez-vous?",tr:"Evet, öyle düşünüyorum. Nasılsınız?",ar:"نعم، أعتقد ذلك. كيف حالك؟",zh:"是的，我想是的。你好吗？",ko:"네, 그런 것 같아요. 어떻게 지내세요?",ja:"はい、そう思います。お元気ですか？",hi:"हाँ, मुझे ऐसा लगता है। आप कैसे हैं?",ga:"Sea, sílim go bhfuil. Conas atá tú?",uk:"Так, я так думаю. Як справи?"}},
  {id:657,category:"meeting",level:"A1",t:{fa:"بله، مدت زیادی است که همدیگر را ندیدیم",en:"Yes, it has been a long time",de:"Ja, es ist schon lange her",es:"Sí, ha pasado mucho tiempo",fr:"Oui, cela fait longtemps",tr:"Evet, uzun zaman oldu",ar:"نعم، لقد مضى وقت طويل",zh:"是的，很久不见了",ko:"네, 오랜만이네요",ja:"はい、久しぶりですね",hi:"हाँ, बहुत समय हो गया",ga:"Sea, tá sé i bhfad anois",uk:"Так, минуло багато часу"}},
  {id:658,category:"meeting",level:"A1",t:{fa:"بله کجا بوده اید؟",en:"Yes, where have you been?",de:"Ja, wo sind Sie gewesen?",es:"Sí, ¿dónde has estado?",fr:"Oui, où étiez-vous?",tr:"Evet, neredeydiniz?",ar:"نعم، أين كنت؟",zh:"是的，你去哪儿了？",ko:"네, 어디 계셨나요?",ja:"はい、どこにいましたか？",hi:"हाँ, आप कहाँ थे?",ga:"Sea, cén áit a raibh tú?",uk:"Так, де ви були?"}},
  {id:659,category:"meeting",level:"A1",t:{fa:"نه حدس نمی زنم",en:"No, I guess not",de:"Nein, ich glaube nicht",es:"No, creo que no",fr:"Non, je ne crois pas",tr:"Hayır, sanmıyorum",ar:"لا، أظن ذلك",zh:"不，我想没有",ko:"아니요, 아닌 것 같아요",ja:"いいえ、違うと思います",hi:"नहीं, मुझे नहीं लगता",ga:"Níl, ní dóigh liom",uk:"Ні, я так не думаю"}},
  {id:660,category:"meeting",level:"A1",t:{fa:"نه متأسفانه خیر",en:"No, I'm afraid not",de:"Nein, ich fürchte nicht",es:"No, me temo que no",fr:"Non, j'ai bien peur que non",tr:"Hayır, korkarım ki öyle değil",ar:"لا، أخشى ذلك",zh:"不，恐怕没有",ko:"아니요, 아쉽게도 아닙니다",ja:"いいえ、残念ながら違います",hi:"नहीं, मुझे डर है कि नहीं",ga:"Níl, tá eagla orm nach bhfuil",uk:"Ні, боюсь, що ні"}},
  {id:661,category:"meeting",level:"A1",t:{fa:"متأسفانه این طور نیست",en:"I don't think so",de:"Ich glaube nicht",es:"No lo creo",fr:"Je ne pense pas",tr:"Öyle düşünmüyorum",ar:"لا أعتقد ذلك",zh:"我不这么认为",ko:"그렇게 생각하지 않아요",ja:"そうは思いません",hi:"मुझे ऐसा नहीं लगता",ga:"Ní dóigh liom é",uk:"Я так не думаю"}},
  {id:662,category:"meeting",level:"A1",t:{fa:"متأسفم، این طور فکر نمی کنم",en:"Sorry, I don't think so",de:"Entschuldigung, ich glaube nicht",es:"Lo siento, no lo creo",fr:"Désolé, je ne pense pas",tr:"Üzgünüm, öyle düşünmüyorum",ar:"آسف، لا أعتقد ذلك",zh:"对不起，我不这么认为",ko:"죄송합니다만, 그렇게 생각하지 않아요",ja:"すみません、そうは思いません",hi:"क्षमा करें, मुझे ऐसा नहीं लगता",ga:"Tá brón orm, ní dóigh liom é",uk:"Вибачте, я так не думаю"}},
  {id:663,category:"meeting",level:"A1",t:{fa:"اسمم (احمد) است. خوشوقتم",en:"My name is (Ahmad). Nice to meet you",de:"Mein Name ist (Ahmad). Schön, Sie kennenzulernen",es:"Mi nombre es (Ahmad). Mucho gusto",fr:"Je m'appelle (Ahmad). Enchanté",tr:"Benim adım (Ahmet). Tanıştığıma memnun oldum",ar:"اسمي (أحمد). سررت بلقائك",zh:"我叫（艾哈迈德）。很高兴见到你",ko:"제 이름은 (아흐마드)입니다. 만나서 반갑습니다",ja:"私の名前は（アフマド）です。はじめまして",hi:"मेरा नाम (अहमद) है। आपसे मिलकर खुशी हुई",ga:"(Ahmad) is ainm dom. Is deas bualadh leat",uk:"Мене звуть (Ахмад). Приємно познайомитись"}},
  {id:664,category:"meeting",level:"A1",t:{fa:"خیلی طول نمی کشد که در این جا مستقر شوید",en:"It won't take you long to settle down",de:"Es wird nicht lange dauern, bis Sie sich eingewöhnt haben",es:"No te llevará mucho tiempo adaptarte",fr:"Vous ne mettrez pas longtemps à vous installer",tr:"Yerleşmeniz çok uzun sürmez",ar:"لن يستغرق الأمر وقتاً طويلاً لتستقر",zh:"你很快就会适应的",ko:"정착하는 데 오래 걸리지 않을 거예요",ja:"慣れるまでに時間はかからないでしょう",hi:"आपको यहाँ समायोजित होने में ज़्यादा समय नहीं लगेगा",ga:"Ní thógfaidh sé i bhfad ort socrú síos",uk:"Вам не знадобиться багато часу, щоб влаштуватися"}},
  {id:665,category:"meeting",level:"A1",t:{fa:"نگران نباشید، شما به زودی به آن خو می گیرید",en:"Don't worry. You'll soon get used to it",de:"Keine Sorge. Sie werden sich bald daran gewöhnen",es:"No te preocupes. Pronto te acostumbrarás",fr:"Ne vous inquiétez pas. Vous vous y habituerez bientôt",tr:"Endişelenmeyin. Yakında alışırsınız",ar:"لا تقلق. ستعتاد عليه قريباً",zh:"别担心，你很快就会习惯的",ko:"걱정 마세요. 곧 익숙해질 거예요",ja:"心配しないでください。すぐに慣れますよ",hi:"चिंता न करें। आपको जल्द ही इसकी आदत हो जाएगी",ga:"Ná bí buartha. Gheobhaidh tú cleachtaithe leis go luath",uk:"Не хвилюйтеся. Скоро звикнете"}},
  {id:666,category:"old_friend",level:"A1",t:{fa:"تازه چه خبر؟",en:"What's new?",de:"Was gibt es Neues?",es:"¿Qué hay de nuevo?",fr:"Quoi de neuf?",tr:"Ne var ne yok?",ar:"ما الجديد؟",zh:"有什么新鲜事吗？",ko:"새소식 있나요?",ja:"何か新しいことはありますか？",hi:"क्या नया है?",ga:"Cad é an nuacht?",uk:"Що нового?"}},
  {id:667,category:"old_friend",level:"A1",t:{fa:"این اواخر کجا بوده اید؟",en:"Where have you been lately?",de:"Wo sind Sie in letzter Zeit gewesen?",es:"¿Dónde has estado últimamente?",fr:"Où avez-vous été ces derniers temps?",tr:"Son zamanlarda neredeydiniz?",ar:"أين كنت مؤخراً؟",zh:"你最近去哪儿了？",ko:"요즘 어디 계셨어요?",ja:"最近どこにいましたか？",hi:"आप हाल ही में कहाँ थे?",ga:"Cén áit a raibh tú le déanaí?",uk:"Де ви були останнім часом?"}},
  {id:668,category:"old_friend",level:"A1",t:{fa:"مدت زیادی است که شما را ندیده ام",en:"I haven't seen you for quite a while",de:"Ich habe Sie schon eine ganze Weile nicht gesehen",es:"Hace mucho que no te veo",fr:"Je ne vous ai pas vu depuis longtemps",tr:"Sizi uzun zamandır görmedim",ar:"لم أراك منذ فترة طويلة",zh:"我好久没见到你了",ko:"오랜만에 뵙네요",ja:"しばらくお会いしていませんでしたね",hi:"मैंने आपको काफी समय से नहीं देखा",ga:"Ní fhaca mé thú le tamall maith",uk:"Я вас давно не бачив"}},
  {id:669,category:"old_friend",level:"A1",t:{fa:"فکر کردم در آریزونا بودید",en:"I thought you were in Arizona",de:"Ich dachte, Sie wären in Arizona",es:"Pensé que estabas en Arizona",fr:"Je pensais que vous étiez en Arizona",tr:"Arizona'da olduğunuzu sanıyordum",ar:"ظننت أنك في أريزونا",zh:"我以为你在亚利桑那州",ko:"애리조나에 계신 줄 알았어요",ja:"アリゾナにいると思っていました",hi:"मुझे लगा तुम एरिज़ोना में हो",ga:"Shíl mé go raibh tú in Arizona",uk:"Я думав, ви в Арізоні"}},
  {id:670,category:"old_friend",level:"A1",t:{fa:"هیچ خبر چندانی ندارم",en:"Nothing much / Not much",de:"Nicht viel",es:"Nada especial",fr:"Pas grand-chose",tr:"Pek bir şey yok",ar:"ليس كثيراً",zh:"没什么",ko:"별로 없어요",ja:"特にありません",hi:"कुछ ख़ास नहीं",ga:"Ní mórán",uk:"Нічого особливого"}},
  {id:671,category:"old_friend",level:"A1",t:{fa:"کار زیادی داشتم که انجام بدهم",en:"I've had a lot of work to do",de:"Ich hatte viel Arbeit zu erledigen",es:"He tenido mucho trabajo que hacer",fr:"J'ai eu beaucoup de travail à faire",tr:"Yapacak çok işim vardı",ar:"كان لدي الكثير من العمل لأقوم به",zh:"我有很多工作要做",ko:"할 일이 많았어요",ja:"やるべき仕事がたくさんありました",hi:"मुझे बहुत काम करना था",ga:"Bhí a lán oibre le déanamh agam",uk:"У мене було багато роботи"}},
  {id:672,category:"old_friend",level:"A1",t:{fa:"آلمان بودم",en:"I've been in Germany",de:"Ich war in Deutschland",es:"He estado en Alemania",fr:"J'étais en Allemagne",tr:"Almanya'daydım",ar:"كنت في ألمانيا",zh:"我在德国",ko:"독일에 있었어요",ja:"ドイツにいました",hi:"मैं जर्मनी में था",ga:"Bhí mé sa Ghearmáin",uk:"Я був у Німеччині"}},
  {id:673,category:"old_friend",level:"A1",t:{fa:"درگیر کار بودم",en:"I've been tied up with business",de:"Ich war geschäftlich eingespannt",es:"He estado ocupado con negocios",fr:"J'étais pris par les affaires",tr:"İşlerle meşguldüm",ar:"كنت مشغولاً بأعمالي",zh:"我一直在忙于工作",ko:"업무에 바빴어요",ja:"仕事で忙しかったです",hi:"मैं काम में व्यस्त था",ga:"Bhí mé gnóthach le gnó",uk:"Я був зайнятий справами"}},
  {id:674,category:"old_friend",level:"A1",t:{fa:"مثل این که سالهاست تو را ندیده ام",en:"I haven't seen you for ages",de:"Ich habe dich seit Ewigkeiten nicht gesehen",es:"No te he visto en siglos",fr:"Je ne t'ai pas vu depuis des siècles",tr:"Seni yıllardır görmedim",ar:"لم أراك منذ دهور",zh:"我好久没见到你了",ko:"오랜만이에요",ja:"久しぶりですね",hi:"मैंने तुम्हें युगों से नहीं देखा",ga:"Ní fhaca mé thú le fada an lá",uk:"Я вас не бачив віки"}},
  {id:675,category:"old_friend",level:"A1",t:{fa:"این اواخر کم پیدا هستید",en:"We haven't seen much of you lately",de:"Wir haben dich in letzter Zeit wenig gesehen",es:"No te hemos visto mucho últimamente",fr:"On ne t'a pas beaucoup vu ces derniers temps",tr:"Son zamanlarda seni pek göremiyoruz",ar:"لم نرك كثيراً مؤخراً",zh:"最近很少见到你",ko:"요즘 자주 못 뵙네요",ja:"最近あまりお会いしませんね",hi:"हमने तुम्हें हाल ही में ज़्यादा नहीं देखा",ga:"Ní fhaca muid mórán díot le déanaí",uk:"Ми вас останнім часом рідко бачимо"}},
  {id:676,category:"old_friend",level:"A1",t:{fa:"کجا بوده ای؟ / کجا می گردی؟",en:"Where have you been?",de:"Wo bist du gewesen?",es:"¿Dónde has estado?",fr:"Où étais-tu?",tr:"Neredeydin?",ar:"أين كنت؟",zh:"你去哪儿了？",ko:"어디 있었어요?",ja:"どこにいましたか？",hi:"तुम कहाँ थे?",ga:"Cén áit a raibh tú?",uk:"Де ти був?"}},
  {id:677,category:"old_friend",level:"A1",t:{fa:"آیا از این جا نقل مکان کرده اید؟",en:"Have you moved or something?",de:"Bist du umgezogen oder so?",es:"¿Te has mudado o algo?",fr:"As-tu déménagé ou quoi?",tr:"Taşındın falan mı?",ar:"هل انتقلت أم ماذا؟",zh:"你搬家了吗？",ko:"이사하셨나요?",ja:"引っ越しでもされましたか？",hi:"क्या आपने कहीं और शिफ्ट किया है?",ga:"Ar bhog tú nó rud éigin?",uk:"Ви переїхали чи щось таке?"}},
  {id:678,category:"old_friend",level:"A1",t:{fa:"آیا ناخوش یا مریض بوده اید؟",en:"Have you been ill/sick?",de:"Warst du krank?",es:"¿Has estado enfermo?",fr:"As-tu été malade?",tr:"Hasta mıydın?",ar:"هل كنت مريضاً؟",zh:"你生病了吗？",ko:"아팠었어요?",ja:"病気でしたか？",hi:"क्या आप बीमार थे?",ga:"An raibh tú tinn?",uk:"Ви хворіли?"}},
  {id:679,category:"old_friend",level:"A1",t:{fa:"به ملاقات بستگانم رفته بودم",en:"I've been visiting relatives",de:"Ich habe Verwandte besucht",es:"He estado visitando a familiares",fr:"Je suis allé voir de la famille",tr:"Akrabalarımı ziyaret ediyordum",ar:"كنت أزور الأقارب",zh:"我去探望亲戚了",ko:"친척들을 방문했어요",ja:"親戚を訪ねていました",hi:"मैं रिश्तेदारों से मिलने गया था",ga:"Bhí mé ag tabhairt cuairte ar ghaolta",uk:"Я відвідував родичів"}},
  {id:680,category:"old_friend",level:"A1",t:{fa:"تعطیلات خود را میگذراندم",en:"I've been away on holiday",de:"Ich war im Urlaub",es:"He estado de vacaciones",fr:"J'étais en vacances",tr:"Tatildeydim",ar:"كنت في إجازة",zh:"我去度假了",ko:"휴가 중이었어요",ja:"休暇で出かけていました",hi:"मैं छुट्टी पर था",ga:"Bhí mé ar saoire",uk:"Я був у відпустці"}},
  {id:681,category:"old_friend",level:"A1",t:{fa:"یک ماه به شمال رفته بودم",en:"I've been up north for a month",de:"Ich war einen Monat im Norden",es:"He estado en el norte durante un mes",fr:"Je suis allé dans le nord pendant un mois",tr:"Bir ay kuzeydeydim",ar:"كنت في الشمال لمدة شهر",zh:"我去北方待了一个月",ko:"한 달 동안 북쪽에 있었어요",ja:"一ヶ月北に行っていました",hi:"मैं एक महीने के लिए उत्तर में था",ga:"Bhí mé suas ó thuaidh ar feadh míosa",uk:"Я був на півночі місяць"}},
  {id:682,category:"old_friend",level:"A1",t:{fa:"در منزل برادرم اقامت داشته ام",en:"I've been staying with my brother",de:"Ich habe bei meinem Bruder gewohnt",es:"He estado quedándome con mi hermano",fr:"Je suis resté chez mon frère",tr:"Kardeşimde kalıyordum",ar:"كنت أقيم عند أخي",zh:"我一直住在我哥哥家",ko:"제 형 집에 머물렀어요",ja:"兄の家に滞在していました",hi:"मैं अपने भाई के साथ रह रहा था",ga:"Bhí mé ag fanacht le mo dheartháir",uk:"Я жив у свого брата"}},
  {id:683,category:"old_friend",level:"A1",t:{fa:"به نیویورک به دیدن عمویم رفته بود",en:"I had gone to New York to see my uncle",de:"Ich war nach New York gefahren, um meinen Onkel zu besuchen",es:"Había ido a Nueva York a ver a mi tío",fr:"J'étais allé à New York pour voir mon oncle",tr:"Amcamı görmek için New York'a gitmiştim",ar:"كنت قد ذهبت إلى نيويورك لزيارة عمي",zh:"我去纽约看望叔叔了",ko:"삼촌을 만나러 뉴욕에 갔었어요",ja:"叔父に会いにニューヨークへ行っていました",hi:"मैं अपने चाचा से मिलने न्यूयॉर्क गया था",ga:"Bhí mé imithe go Nua-Eabhrac le m'uncail a fheiceáil",uk:"Я їздив до Нью-Йорка, щоб побачити свого дядька"}},
  {id:684,category:"acquainted",level:"A1",t:{fa:"اهل کجا هستید؟",en:"Where are you from?",de:"Woher kommen Sie?",es:"¿De dónde eres?",fr:"D'où venez-vous?",tr:"Nerelisiniz?",ar:"من أين أنت؟",zh:"你来自哪里？",ko:"어디에서 오셨어요?",ja:"どちらから来ましたか？",hi:"आप कहाँ से हैं?",ga:"Cá as duit?",uk:"Звідки ви?"}},
  {id:685,category:"acquainted",level:"A1",t:{fa:"اهل کدام کشور هستید؟",en:"What country are you from?",de:"Aus welchem Land kommen Sie?",es:"¿De qué país eres?",fr:"De quel pays êtes-vous?",tr:"Hangi ülkedensiniz?",ar:"من أي دولة أنت؟",zh:"你是哪个国家的？",ko:"어느 나라에서 오셨어요?",ja:"どちらの国からですか？",hi:"आप किस देश से हैं?",ga:"Cén tír as duit?",uk:"З якої ви країни?"}},
  {id:686,category:"acquainted",level:"A1",t:{fa:"ملیت شما چیست؟",en:"What is your nationality?",de:"Was ist Ihre Nationalität?",es:"¿Cuál es tu nacionalidad?",fr:"Quelle est votre nationalité?",tr:"Milliyetiniz nedir?",ar:"ما هي جنسيتك؟",zh:"你的国籍是什么？",ko:"국적이 어떻게 되세요?",ja:"国籍は何ですか？",hi:"आपकी राष्ट्रीयता क्या है?",ga:"Cad é do náisiúntacht?",uk:"Яка ваша національність?"}},
  {id:687,category:"acquainted",level:"A1",t:{fa:"از کدام شهر می آیید؟",en:"What city are you from?",de:"Aus welcher Stadt kommen Sie?",es:"¿De qué ciudad eres?",fr:"De quelle ville êtes-vous?",tr:"Hangi şehirdensiniz?",ar:"من أي مدينة أنت؟",zh:"你来自哪个城市？",ko:"어느 도시에서 오셨어요?",ja:"どちらの都市からですか？",hi:"आप किस शहर से हैं?",ga:"Cén chathair as duit?",uk:"З якого ви міста?"}},
  {id:688,category:"acquainted",level:"A1",t:{fa:"از کدام ایالت هستید؟",en:"What state are you from?",de:"Aus welchem Bundesstaat kommen Sie?",es:"¿De qué estado eres?",fr:"De quel état êtes-vous?",tr:"Hangi eyalettensiniz?",ar:"من أي ولاية أنت؟",zh:"你来自哪个州？",ko:"어느 주에서 오셨어요?",ja:"どの州からですか？",hi:"आप किस राज्य से हैं?",ga:"Cén stát as duit?",uk:"З якого ви штату?"}},
  {id:689,category:"acquainted",level:"A1",t:{fa:"ایرانی هستم",en:"I am from Iran",de:"Ich komme aus Iran",es:"Soy de Irán",fr:"Je suis d'Iran",tr:"İran'lıyım",ar:"أنا من إيران",zh:"我来自伊朗",ko:"이란에서 왔어요",ja:"イランから来ました",hi:"मैं ईरान से हूँ",ga:"Is as an Iaráin mé",uk:"Я з Ірану"}},
  {id:690,category:"acquainted",level:"A1",t:{fa:"از (ایران) آمده ام",en:"I come from Iran",de:"Ich komme aus Iran",es:"Vengo de Irán",fr:"Je viens d'Iran",tr:"İran'dan geliyorum",ar:"أتيت من إيران",zh:"我来自伊朗",ko:"이란에서 왔어요",ja:"イランから来ました",hi:"मैं ईरान से आया हूँ",ga:"Tháinig mé as an Iaráin",uk:"Я приїхав з Ірану"}},
  {id:691,category:"acquainted",level:"A1",t:{fa:"(آلمانی) هستم",en:"I am a German",de:"Ich bin Deutscher/Deutsche",es:"Soy alemán/alemana",fr:"Je suis allemand/allemande",tr:"Alman'ım",ar:"أنا ألماني/ألمانية",zh:"我是德国人",ko:"독일인입니다",ja:"ドイツ人です",hi:"मैं जर्मन हूँ",ga:"Is Gearmánach mé",uk:"Я німець"}},
  {id:692,category:"acquainted",level:"A1",t:{fa:"ملیت من (ایتالیایی) است",en:"My nationality is Italian",de:"Meine Nationalität ist Italienisch",es:"Mi nacionalidad es italiana",fr:"Ma nationalité est italienne",tr:"Milliyetim İtalyan",ar:"جنسيتي إيطالية",zh:"我的国籍是意大利",ko:"제 국적은 이탈리아입니다",ja:"私の国籍はイタリアです",hi:"मेरी राष्ट्रीयता इतालवी है",ga:"Is Iodálach mo náisiúntacht",uk:"Моє національність італійська"}},
  {id:693,category:"acquainted",level:"A1",t:{fa:"اهل (تهران) هستم",en:"I am from Tehran",de:"Ich bin aus Teheran",es:"Soy de Teherán",fr:"Je suis de Téhéran",tr:"Tahran'lıyım",ar:"أنا من طهران",zh:"我来自德黑兰",ko:"테헤란에서 왔어요",ja:"テヘランからです",hi:"मैं तेहरान से हूँ",ga:"Is as Tehrán mé",uk:"Я з Тегерана"}},
  {id:694,category:"acquainted",level:"A1",t:{fa:"چه مدت است که اینجا هستید؟",en:"How long have you been here?",de:"Wie lange sind Sie schon hier?",es:"¿Cuánto tiempo llevas aquí?",fr:"Depuis combien de temps êtes-vous ici?",tr:"Ne zamandır buradasınız?",ar:"منذ متى وأنت هنا؟",zh:"你来这里多久了？",ko:"여기에 온 지 얼마나 되셨어요?",ja:"ここに来てどのくらいですか？",hi:"आप यहाँ कितने समय से हैं?",ga:"Cá fada atá tú anseo?",uk:"Як довго ви тут?"}},
  {id:695,category:"acquainted",level:"A1",t:{fa:"کجا زندگی میکنید؟",en:"Where do you live?",de:"Wo wohnen Sie?",es:"¿Dónde vives?",fr:"Où habitez-vous?",tr:"Nerede yaşıyorsunuz?",ar:"أين تعيش؟",zh:"你住在哪里？",ko:"어디에 살아요?",ja:"どこに住んでいますか？",hi:"आप कहाँ रहते हैं?",ga:"Cá bhfuil tú i do chónaí?",uk:"Де ви живете?"}},
  {id:696,category:"acquainted",level:"A1",t:{fa:"آیا متاهل هستید یا مجرد؟",en:"Are you married or single?",de:"Sind Sie verheiratet oder ledig?",es:"¿Estás casado o soltero?",fr:"Êtes-vous marié ou célibataire?",tr:"Evli misiniz, bekar mısınız?",ar:"هل أنت متزوج أم أعزب؟",zh:"你结婚了还是单身？",ko:"결혼하셨나요, 아니면 미혼인가요?",ja:"結婚していますか、それとも独身ですか？",hi:"क्या आप शादीशुदा हैं या अविवाहित?",ga:"An bhfuil tú pósta nó singil?",uk:"Ви одружені/заміжня чи неодружені?"}},
  {id:697,category:"acquainted",level:"A1",t:{fa:"آیا با خانواده تان زندگی میکنید؟",en:"Do you live with your family?",de:"Leben Sie mit Ihrer Familie zusammen?",es:"¿Vives con tu familia?",fr:"Vivez-vous avec votre famille?",tr:"Ailenizle mi yaşıyorsunuz?",ar:"هل تعيش مع عائلتك؟",zh:"你和家人一起住吗？",ko:"가족과 함께 사시나요?",ja:"家族と一緒に住んでいますか？",hi:"क्या आप अपने परिवार के साथ रहते हैं?",ga:"An bhfuil tú i do chónaí le do theaghlach?",uk:"Ви живете з родиною?"}},
  {id:698,category:"acquainted",level:"A1",t:{fa:"آیا دانش آموز یا (دانشجو) هستید؟",en:"Are you a student?",de:"Sind Sie Student/in?",es:"¿Eres estudiante?",fr:"Êtes-vous étudiant(e)?",tr:"Öğrenci misiniz?",ar:"هل أنت طالب؟",zh:"你是学生吗？",ko:"학생이세요?",ja:"学生ですか？",hi:"क्या आप एक छात्र हैं?",ga:"An mac léinn thú?",uk:"Ви студент?"}},
  {id:699,category:"acquainted",level:"A1",t:{fa:"در چه رشته تحصیل میکنید؟",en:"What do you study?",de:"Was studieren Sie?",es:"¿Qué estudias?",fr:"Qu'étudiez-vous?",tr:"Ne okuyorsunuz?",ar:"ماذا تدرس؟",zh:"你学什么专业？",ko:"무슨 전공을 하세요?",ja:"何を勉強していますか？",hi:"आप क्या पढ़ते हैं?",ga:"Cad a dhéanann tú staidéar air?",uk:"Що ви вивчаєте?"}},
  {id:700,category:"acquainted",level:"A1",t:{fa:"شغل شما چیست؟",en:"What's your job?",de:"Was ist Ihr Beruf?",es:"¿Cuál es tu trabajo?",fr:"Quel est votre métier?",tr:"İşiniz nedir?",ar:"ما هي وظيفتك؟",zh:"你的工作是什么？",ko:"직업이 어떻게 되세요?",ja:"お仕事は何ですか？",hi:"आपका काम क्या है?",ga:"Cad é do phost?",uk:"Яка ваша робота?"}},
  {id:701,category:"acquainted",level:"A1",t:{fa:"به چه کاری مشغولید؟",en:"What do you do?",de:"Was machen Sie beruflich?",es:"¿A qué te dedicas?",fr:"Que faites-vous dans la vie?",tr:"Ne iş yapıyorsunuz?",ar:"ماذا تعمل؟",zh:"你是做什么的？",ko:"무슨 일을 하세요?",ja:"どんな仕事をしていますか？",hi:"आप क्या करते हैं?",ga:"Cad a dhéanann tú?",uk:"Чим ви займаєтесь?"}},
  {id:702,category:"acquainted",level:"A1",t:{fa:"حرفه شما چیست؟",en:"What's your profession?",de:"Was ist Ihr Beruf?",es:"¿Cuál es tu profesión?",fr:"Quelle est votre profession?",tr:"Mesleğiniz nedir?",ar:"ما هي مهنتك؟",zh:"你的职业是什么？",ko:"직업이 무엇인가요?",ja:"職業は何ですか？",hi:"आपका पेशा क्या है?",ga:"Cad é do ghairm?",uk:"Яка ваша професія?"}},
  {id:703,category:"acquainted",level:"A1",t:{fa:"شغلتان چیست؟",en:"What's your occupation?",de:"Was ist Ihre Tätigkeit?",es:"¿Cuál es tu ocupación?",fr:"Quelle est votre occupation?",tr:"Uğraşınız nedir?",ar:"ما هي مهنتك؟",zh:"你的职业是什么？",ko:"직업이 어떻게 되세요?",ja:"お仕事は何ですか？",hi:"आपका व्यवसाय क्या है?",ga:"Cad é do shlí bheatha?",uk:"Яке ваше заняття?"}},
  {id:704,category:"acquainted",level:"A1",t:{fa:"از چه راه امرار معاش میکنید؟",en:"What do you do for a living?",de:"Wie verdienen Sie Ihren Lebensunterhalt?",es:"¿De qué vives?",fr:"Comment gagnez-vous votre vie?",tr:"Geçiminizi nasıl sağlıyorsunuz?",ar:"كيف تكسب قوت يومك؟",zh:"你以什么为生？",ko:"생계는 어떻게 유지하세요?",ja:"どのように生計を立てていますか？",hi:"आप अपनी आजीविका कैसे कमाते हैं?",ga:"Conas a thuilleann tú do bheatha?",uk:"Як ви заробляєте на життя?"}},
  {id:705,category:"acquainted",level:"A1",t:{fa:"آیا این کشور را دوست دارید؟",en:"Do you like this country?",de:"Gefällt Ihnen dieses Land?",es:"¿Te gusta este país?",fr:"Aimez-vous ce pays?",tr:"Bu ülkeyi seviyor musunuz?",ar:"هل تحب هذا البلد؟",zh:"你喜欢这个国家吗？",ko:"이 나라를 좋아하세요?",ja:"この国は好きですか？",hi:"क्या आपको यह देश पसंद है?",ga:"An maith leat an tír seo?",uk:"Вам подобається ця країна?"}},
  {id:706,category:"acquainted",level:"A1",t:{fa:"آیا این شهر را دوست دارید؟",en:"Do you like this city?",de:"Gefällt Ihnen diese Stadt?",es:"¿Te gusta esta ciudad?",fr:"Aimez-vous cette ville?",tr:"Bu şehri seviyor musunuz?",ar:"هل تحب هذه المدينة؟",zh:"你喜欢这个城市吗？",ko:"이 도시를 좋아하세요?",ja:"この街は好きですか？",hi:"क्या आपको यह शहर पसंद है?",ga:"An maith leat an chathair seo?",uk:"Вам подобається це місто?"}},
  {id:707,category:"acquainted",level:"A1",t:{fa:"چه مدت است که این جا اقامت دارید؟",en:"How long are you staying here?",de:"Wie lange bleiben Sie hier?",es:"¿Cuánto tiempo te quedas aquí?",fr:"Combien de temps restez-vous ici?",tr:"Burada ne kadar kalacaksınız?",ar:"كم مدة إقامتك هنا؟",zh:"你要在这里待多久？",ko:"여기에 얼마나 머무르실 건가요?",ja:"ここにはどのくらい滞在しますか？",hi:"आप यहाँ कितने समय रुकेंगे?",ga:"Cá fada a bheidh tú ag fanacht anseo?",uk:"Як довго ви тут залишаєтесь?"}},
  {id:708,category:"acquainted",level:"A1",t:{fa:"آیا تنها هستید؟",en:"Are you alone?",de:"Sind Sie allein?",es:"¿Estás solo?",fr:"Êtes-vous seul(e)?",tr:"Yalnız mısınız?",ar:"هل أنت وحدك؟",zh:"你一个人吗？",ko:"혼자이신가요?",ja:"お一人ですか？",hi:"क्या आप अकेले हैं?",ga:"An bhfuil tú i d'aonar?",uk:"Ви самі?"}},
  {id:709,category:"acquainted",level:"A1",t:{fa:"خانواده شما چند نفر است؟",en:"How many are in your family?",de:"Wie viele Personen hat Ihre Familie?",es:"¿Cuántos son en tu familia?",fr:"Combien êtes-vous dans votre famille?",tr:"Aileniz kaç kişi?",ar:"كم عدد عائلتك؟",zh:"你家有几口人？",ko:"가족이 몇 명이세요?",ja:"ご家族は何人ですか？",hi:"आपके परिवार में कितने लोग हैं?",ga:"Cé mhéad atá i do theaghlach?",uk:"Скільки людей у вашій родині?"}},
  {id:710,category:"acquainted",level:"A1",t:{fa:"من شما چقدر است؟",en:"How old are you?",de:"Wie alt sind Sie?",es:"¿Cuántos años tienes?",fr:"Quel âge avez-vous?",tr:"Kaç yaşındasınız?",ar:"كم عمرك؟",zh:"你多大了？",ko:"나이가 어떻게 되세요?",ja:"おいくつですか？",hi:"आपकी उम्र क्या है?",ga:"Cén aois thú?",uk:"Скільки вам років?"}},
  {id:711,category:"acquainted",level:"A1",t:{fa:"به چه زبانهایی صحبت میکنید؟",en:"What language(s) do you speak?",de:"Welche Sprachen sprechen Sie?",es:"¿Qué idiomas hablas?",fr:"Quelles langues parlez-vous?",tr:"Hangi dilleri konuşuyorsunuz?",ar:"ما هي اللغات التي تتحدثها؟",zh:"你会说什么语言？",ko:"어떤 언어를 하세요?",ja:"何語を話しますか？",hi:"आप कौन सी भाषाएँ बोलते हैं?",ga:"Cén teanga(cha) a labhraíonn tú?",uk:"Якими мовами ви розмовляєте?"}},
  {id:712,category:"acquainted",level:"A1",t:{fa:"دین شما چیست؟",en:"What's your religion?",de:"Was ist Ihre Religion?",es:"¿Cuál es tu religión?",fr:"Quelle est votre religion?",tr:"Dininiz nedir?",ar:"ما هو دينك؟",zh:"你的宗教信仰是什么？",ko:"종교가 어떻게 되세요?",ja:"宗教は何ですか？",hi:"आपका धर्म क्या है?",ga:"Cad é do chreideamh?",uk:"Яка ваша релігія?"}},
  {id:713,category:"acquainted",level:"A1",t:{fa:"آیا کتاب خواندن را دوست دارید؟",en:"Do you like to read books?",de:"Lesen Sie gerne Bücher?",es:"¿Te gusta leer libros?",fr:"Aimez-vous lire des livres?",tr:"Kitap okumayı sever misiniz?",ar:"هل تحب قراءة الكتب؟",zh:"你喜欢看书吗？",ko:"책 읽는 것을 좋아하세요?",ja:"本を読むのは好きですか？",hi:"क्या आपको किताबें पढ़ना पसंद है?",ga:"An maith leat leabhair a léamh?",uk:"Ви любите читати книги?"}},
  {id:714,category:"acquainted",level:"A1",t:{fa:"آیا سینما رفتن را دوست دارید؟",en:"Do you like to go to the movies?",de:"Gehen Sie gerne ins Kino?",es:"¿Te gusta ir al cine?",fr:"Aimez-vous aller au cinéma?",tr:"Sinemaya gitmeyi sever misiniz?",ar:"هل تحب الذهاب إلى السينما؟",zh:"你喜欢看电影吗？",ko:"영화 보는 것을 좋아하세요?",ja:"映画に行くのは好きですか？",hi:"क्या आपको सिनेमा जाना पसंद है?",ga:"An maith leat dul go dtí na scannáin?",uk:"Ви любите ходити в кіно?"}},
  {id:715,category:"acquainted",level:"A1",t:{fa:"سرگرمی شما چیست؟",en:"What is your hobby?",de:"Was ist Ihr Hobby?",es:"¿Cuál es tu hobby?",fr:"Quel est votre passe-temps?",tr:"Hobiniz nedir?",ar:"ما هي هوايتك؟",zh:"你的爱好是什么？",ko:"취미가 무엇인가요?",ja:"趣味は何ですか？",hi:"आपका शौक क्या है?",ga:"Cad é do chaitheamh aimsire?",uk:"Яке ваше хобі?"}},
  {id:716,category:"acquainted",level:"A1",t:{fa:"وقت آزادتان را چطور میگذرانید؟",en:"How do you spend your free time?",de:"Wie verbringen Sie Ihre Freizeit?",es:"¿Cómo pasas tu tiempo libre?",fr:"Comment passez-vous votre temps libre?",tr:"Boş zamanlarınızı nasıl geçiriyorsunuz?",ar:"كيف تقضي وقت فراغك؟",zh:"你如何度过空闲时间？",ko:"여가 시간을 어떻게 보내세요?",ja:"自由時間はどう過ごしていますか？",hi:"आप अपना खाली समय कैसे बिताते हैं?",ga:"Conas a chaitheann tú do chuid ama saor?",uk:"Як ви проводите вільний час?"}},
  {id:717,category:"acquainted",level:"A1",t:{fa:"آیا موسیقی دوست دارید؟",en:"Do you like music?",de:"Mögen Sie Musik?",es:"¿Te gusta la música?",fr:"Aimez-vous la musique?",tr:"Müzik sever misiniz?",ar:"هل تحب الموسيقى؟",zh:"你喜欢音乐吗？",ko:"음악을 좋아하세요?",ja:"音楽は好きですか？",hi:"क्या आपको संगीत पसंद है?",ga:"An maith leat ceol?",uk:"Ви любите музику?"}},
  {id:718,category:"acquainted",level:"A1",t:{fa:"چه نوع نوشیدنی دوست دارید؟",en:"What kind of drink do you like?",de:"Was für Getränke mögen Sie?",es:"¿Qué tipo de bebida te gusta?",fr:"Quel genre de boisson aimez-vous?",tr:"Ne tür içecek seversiniz?",ar:"أي نوع من المشروبات تحب؟",zh:"你喜欢什么饮料？",ko:"어떤 음료를 좋아하세요?",ja:"どんな飲み物が好きですか？",hi:"आपको किस तरह का पेय पसंद है?",ga:"Cén cineál dí is maith leat?",uk:"Які напої вам подобаються?"}},
  {id:719,category:"acquainted",level:"A1",t:{fa:"غذای دلخواه شما چیست؟",en:"What's your favorite food?",de:"Was ist Ihr Lieblingsessen?",es:"¿Cuál es tu comida favorita?",fr:"Quel est votre plat préféré?",tr:"En sevdiğiniz yemek nedir?",ar:"ما هو طعامك المفضل؟",zh:"你最喜欢的食物是什么？",ko:"가장 좋아하는 음식은 무엇인가요?",ja:"好きな食べ物は何ですか？",hi:"आपका पसंदीदा भोजन क्या है?",ga:"Cad é an bia is fearr leat?",uk:"Яка ваша улюблена їжа?"}},
  {id:720,category:"acquainted",level:"A1",t:{fa:"آیا می توانم به شام دعوتتان کنم؟",en:"May I invite you to dinner?",de:"Darf ich Sie zum Abendessen einladen?",es:"¿Puedo invitarte a cenar?",fr:"Puis-je vous inviter à dîner?",tr:"Sizi akşam yemeğine davet edebilir miyim?",ar:"هل يمكنني دعوتك للعشاء؟",zh:"我可以请你吃晚饭吗？",ko:"저녁 식사에 초대해도 될까요?",ja:"夕食に招待してもいいですか？",hi:"क्या मैं आपको रात के खाने पर आमंत्रित कर सकता हूँ?",ga:"An féidir liom cuireadh a thabhairt duit chun dinnéir?",uk:"Можна запросити вас на вечерю?"}},
  {id:721,category:"acquainted",level:"A1",t:{fa:"لطفاً آدرستان را به من بدهید",en:"Please give me your address",de:"Geben Sie mir bitte Ihre Adresse",es:"Por favor, dame tu dirección",fr:"Donnez-moi votre adresse, s'il vous plaît",tr:"Lütfen bana adresinizi verin",ar:"من فضلك أعطني عنوانك",zh:"请给我你的地址",ko:"주소를 알려주세요",ja:"住所を教えてください",hi:"कृपया मुझे अपना पता दें",ga:"Tabhair do sheoladh dom le do thoil",uk:"Будь ласка, дайте мені свою адресу"}},
  {id:722,category:"acquainted",level:"A1",t:{fa:"لطفاً شماره تلفنتان را به من بدهید",en:"Please give me your phone number",de:"Geben Sie mir bitte Ihre Telefonnummer",es:"Por favor, dame tu número de teléfono",fr:"Donnez-moi votre numéro de téléphone, s'il vous plaît",tr:"Lütfen bana telefon numaranızı verin",ar:"من فضلك أعطني رقم هاتفك",zh:"请给我你的电话号码",ko:"전화번호를 알려주세요",ja:"電話番号を教えてください",hi:"कृपया मुझे अपना फ़ोन नंबर दें",ga:"Tabhair d'uimhir ghutháin dom le do thoil",uk:"Будь ласка, дайте мені свій номер телефону"}},
  {id:723,category:"acquainted",level:"A1",t:{fa:"لطفاً دوباره به دیدن من بیایید",en:"Please come and see me again",de:"Bitte kommen Sie mich wieder besuchen",es:"Por favor, ven a verme de nuevo",fr:"S'il vous plaît, venez me voir à nouveau",tr:"Lütfen tekrar beni ziyarete gelin",ar:"من فضلك تعال لزيارتي مرة أخرى",zh:"请再来看我",ko:"다시 저를 보러 오세요",ja:"また会いに来てください",hi:"कृपया मुझसे दोबारा मिलने आइए",ga:"Tar ar ais go dtí mé le do thoil",uk:"Будь ласка, приходьте до мене знову"}},
  {id:724,category:"acquainted",level:"A1",t:{fa:"امیدوارم دوباره شما را ببینم",en:"I hope to see you again",de:"Ich hoffe, Sie wiederzusehen",es:"Espero verte de nuevo",fr:"J'espère vous revoir",tr:"Sizi tekrar görmeyi umuyorum",ar:"آمل أن أراك مرة أخرى",zh:"我希望再见到你",ko:"다시 뵙길 바랍니다",ja:"またお会いできることを願っています",hi:"मुझे आशा है कि मैं आपको फिर से देखूंगा",ga:"Tá súil agam tú a fheiceáil arís",uk:"Сподіваюся побачити вас знову"}},
  {id:725,category:"acquainted",level:"A1",t:{fa:"مدت دو سال است اینجا هستم",en:"I've been here for two years",de:"Ich bin seit zwei Jahren hier",es:"Llevo dos años aquí",fr:"Je suis ici depuis deux ans",tr:"İki yıldır buradayım",ar:"أنا هنا منذ عامين",zh:"我来这里两年了",ko:"여기에 온 지 2년 됐어요",ja:"ここに来て2年です",hi:"मैं यहाँ दो साल से हूँ",ga:"Tá mé anseo le dhá bhliain",uk:"Я тут вже два роки"}},
  {id:726,category:"acquainted",level:"A1",t:{fa:"در بلوار مک آرتور شماره ۵۱۶ هستم",en:"I live at 516 Mac Arthur Blvd",de:"Ich wohne in der Mac Arthur Blvd. 516",es:"Vivo en el 516 de Mac Arthur Blvd",fr:"J'habite au 516 Mac Arthur Blvd",tr:"Mac Arthur Bulvarı 516'da yaşıyorum",ar:"أعيش في 516 ماك آرثر بوليفارد",zh:"我住在麦克阿瑟大道516号",ko:"맥아더 대로 516번지에 살아요",ja:"マッカーサーブルバード516番地に住んでいます",hi:"मैं 516 मैकआर्थर बुलेवार्ड में रहता हूँ",ga:"Tá mé i mo chónaí ag 516 Ascaill Mhic Artaire",uk:"Я живу за адресом 516 Мак-Артур бульвар"}},
  {id:727,category:"acquainted",level:"A1",t:{fa:"مجرد هستم",en:"I am single",de:"Ich bin ledig",es:"Soy soltero",fr:"Je suis célibataire",tr:"Bekarım",ar:"أنا أعزب",zh:"我单身",ko:"저는 미혼입니다",ja:"私は独身です",hi:"मैं अविवाहित हूँ",ga:"Tá mé singil",uk:"Я неодружений"}},
  {id:728,category:"acquainted",level:"A1",t:{fa:"هنوز ازدواج نکرده ام",en:"I am not married yet",de:"Ich bin noch nicht verheiratet",es:"Todavía no estoy casado",fr:"Je ne suis pas encore marié",tr:"Henüz evli değilim",ar:"لم أتزوج بعد",zh:"我还没结婚",ko:"아직 결혼하지 않았어요",ja:"まだ結婚していません",hi:"मैंने अभी तक शादी नहीं की है",ga:"Níl mé pósta go fóill",uk:"Я ще не одружений"}},
  {id:729,category:"acquainted",level:"A1",t:{fa:"ازدواج کرده ام و یک پسر دارم",en:"I'm married and have a son",de:"Ich bin verheiratet und habe einen Sohn",es:"Estoy casado y tengo un hijo",fr:"Je suis marié et j'ai un fils",tr:"Evliyim ve bir oğlum var",ar:"أنا متزوج ولدي ابن",zh:"我结婚了，有一个儿子",ko:"결혼했고 아들이 있어요",ja:"結婚していて、息子がいます",hi:"मैं शादीशुदा हूँ और मेरा एक बेटा है",ga:"Tá mé pósta agus tá mac agam",uk:"Я одружений і маю сина"}},
  {id:730,category:"acquainted",level:"A1",t:{fa:"این جا تنها زندگی میکنم",en:"I live here alone",de:"Ich lebe hier allein",es:"Vivo aquí solo",fr:"Je vis ici seul",tr:"Burada yalnız yaşıyorum",ar:"أعيش هنا وحدي",zh:"我一个人住在这里",ko:"여기에 혼자 살아요",ja:"ここに一人で住んでいます",hi:"मैं यहाँ अकेला रहता हूँ",ga:"Tá mé i mo chónaí anseo liom féin",uk:"Я живу тут сам"}},
  {id:731,category:"acquainted",level:"A1",t:{fa:"با والدینم زندگی میکنم",en:"I live with my parents",de:"Ich lebe mit meinen Eltern",es:"Vivo con mis padres",fr:"Je vis avec mes parents",tr:"Ailemle yaşıyorum",ar:"أعيش مع والديّ",zh:"我和父母住在一起",ko:"부모님과 함께 살아요",ja:"両親と一緒に住んでいます",hi:"मैं अपने माता-पिता के साथ रहता हूँ",ga:"Tá mé i mo chónaí le mo thuismitheoirí",uk:"Я живу з батьками"}},
  {id:732,category:"acquainted",level:"A1",t:{fa:"من دانشجوی دانشگاه هستم",en:"I am a university student",de:"Ich bin Student an der Universität",es:"Soy estudiante universitario",fr:"Je suis étudiant à l'université",tr:"Üniversite öğrencisiyim",ar:"أنا طالب في الجامعة",zh:"我是一名大学生",ko:"저는 대학생입니다",ja:"私は大学生です",hi:"मैं एक विश्वविद्यालय का छात्र हूँ",ga:"Is mac léinn ollscoile mé",uk:"Я студент університету"}},
  {id:733,category:"acquainted",level:"A1",t:{fa:"مدیریت اداری بازرگانی میخوانم",en:"I study Business Administration",de:"Ich studiere Betriebswirtschaftslehre",es:"Estudio Administración de Empresas",fr:"J'étudie l'administration des affaires",tr:"İşletme okuyorum",ar:"أدرس إدارة الأعمال",zh:"我学工商管理",ko:"경영학을 공부해요",ja:"経営学を勉強しています",hi:"मैं व्यवसाय प्रशासन पढ़ता हूँ",ga:"Déanaim staidéar ar Riarachán Gnó",uk:"Я вивчаю ділове адміністрування"}},
  {id:734,category:"acquainted",level:"A1",t:{fa:"شغل نیمه وقت دارم",en:"I have a part-time job",de:"Ich habe einen Teilzeitjob",es:"Tengo un trabajo de medio tiempo",fr:"J'ai un travail à temps partiel",tr:"Yarı zamanlı bir işim var",ar:"لدي وظيفة بدوام جزئي",zh:"我有一份兼职工作",ko:"아르바이트를 해요",ja:"アルバイトをしています",hi:"मेरे पास अंशकालिक नौकरी है",ga:"Tá post páirtaimseartha agam",uk:"У мене робота на півставки"}},
  {id:735,category:"acquainted",level:"A1",t:{fa:"در بانک / مغازه / دفتر حقوق کار میکنم",en:"I work in a bank / store / law office",de:"Ich arbeite in einer Bank / einem Geschäft / einer Anwaltskanzlei",es:"Trabajo en un banco / tienda / bufete de abogados",fr:"Je travaille dans une banque / un magasin / un cabinet d'avocats",tr:"Bir bankada / mağazada / hukuk bürosunda çalışıyorum",ar:"أعمل في بنك / متجر / مكتب محاماة",zh:"我在银行/商店/律师事务所工作",ko:"은행/가게/법률 사무소에서 일해요",ja:"銀行/店舗/法律事務所で働いています",hi:"मैं बैंक / दुकान / कानूनी कार्यालय में काम करता हूँ",ga:"Oibrím i mbanc / siopa / oifig dlí",uk:"Я працюю в банку / магазині / юридичній конторі"}},
  {id:736,category:"acquainted",level:"A1",t:{fa:"من نویسنده / پرستار / دکتر / معلم هستم",en:"I am a writer / nurse / doctor / teacher",de:"Ich bin Schriftsteller / Krankenschwester / Arzt / Lehrer",es:"Soy escritor / enfermero / médico / profesor",fr:"Je suis écrivain / infirmier / médecin / enseignant",tr:"Yazar / hemşire / doktor / öğretmenim",ar:"أنا كاتب / ممرض / طبيب / معلم",zh:"我是作家/护士/医生/老师",ko:"저는 작가/간호사/의사/교사입니다",ja:"私は作家/看護師/医者/先生です",hi:"मैं लेखक / नर्स / डॉक्टर / शिक्षक हूँ",ga:"Is scríbhneoir / banaltra / dochtúir / múinteoir mé",uk:"Я письменник / медсестра / лікар / вчитель"}},
  {id:737,category:"acquainted",level:"A1",t:{fa:"حرفه من نویسندگی است",en:"My profession is writing",de:"Mein Beruf ist Schriftsteller",es:"Mi profesión es la escritura",fr:"Ma profession est l'écriture",tr:"Mesleğim yazarlık",ar:"مهنتي هي الكتابة",zh:"我的职业是写作",ko:"제 직업은 작가입니다",ja:"私の職業は執筆です",hi:"मेरा पेशा लेखन है",ga:"Is é scríbhneoireacht mo ghairm",uk:"Моя професія — письменництво"}},
  {id:738,category:"acquainted",level:"A1",t:{fa:"من تاجرم",en:"I am a businessman",de:"Ich bin Geschäftsmann",es:"Soy hombre de negocios",fr:"Je suis homme d'affaires",tr:"İş adamıyım",ar:"أنا رجل أعمال",zh:"我是商人",ko:"저는 사업가입니다",ja:"私は実業家です",hi:"मैं एक व्यवसायी हूँ",ga:"Is fear gnó mé",uk:"Я бізнесмен"}},
  {id:739,category:"acquainted",level:"A1",t:{fa:"برای خودم کار میکنم",en:"I work for myself",de:"Ich arbeite für mich selbst",es:"Trabajo por cuenta propia",fr:"Je travaille à mon compte",tr:"Kendi hesabıma çalışıyorum",ar:"أعمل لحسابي الخاص",zh:"我为自己工作",ko:"자영업을 해요",ja:"自営業です",hi:"मैं अपने लिए काम करता हूँ",ga:"Oibrím dom féin",uk:"Я працюю на себе"}},
  {id:740,category:"acquainted",level:"A1",t:{fa:"برای دولت کار میکنم",en:"I work for the government",de:"Ich arbeite für die Regierung",es:"Trabajo para el gobierno",fr:"Je travaille pour le gouvernement",tr:"Hükümet için çalışıyorum",ar:"أعمل في الحكومة",zh:"我在政府工作",ko:"정부 기관에서 일해요",ja:"政府で働いています",hi:"मैं सरकार के लिए काम करता हूँ",ga:"Oibrím don rialtas",uk:"Я працюю на уряд"}},
  {id:741,category:"acquainted",level:"A1",t:{fa:"استاد دانشگاه هستم",en:"I am a university professor",de:"Ich bin Universitätsprofessor",es:"Soy profesor universitario",fr:"Je suis professeur d'université",tr:"Üniversite profesörüyüm",ar:"أنا أستاذ جامعي",zh:"我是大学教授",ko:"대학교수입니다",ja:"大学教授です",hi:"मैं एक विश्वविद्यालय के प्रोफेसर हूँ",ga:"Is ollamh ollscoile mé",uk:"Я університетський професор"}},
  {id:742,category:"acquainted",level:"A1",t:{fa:"بله این کشور را خیلی دوست دارم",en:"Yes, I like this country a lot",de:"Ja, ich mag dieses Land sehr",es:"Sí, me gusta mucho este país",fr:"Oui, j'aime beaucoup ce pays",tr:"Evet, bu ülkeyi çok seviyorum",ar:"نعم، أحب هذا البلد كثيراً",zh:"是的，我非常喜欢这个国家",ko:"네, 이 나라를 정말 좋아해요",ja:"はい、この国がとても好きです",hi:"हाँ, मुझे यह देश बहुत पसंद है",ga:"Sea, is maith liom an tír seo go mór",uk:"Так, мені дуже подобається ця країна"}},
  {id:743,category:"acquainted",level:"A1",t:{fa:"اما قدری دلتنگ میشوم",en:"But I get a little homesick",de:"Aber ich bekomme ein wenig Heimweh",es:"Pero me pongo un poco nostálgico",fr:"Mais j'ai un peu le mal du pays",tr:"Ama biraz vatan hasreti çekiyorum",ar:"لكنني أشعر ببعض الحنين إلى الوطن",zh:"但我有点想家",ko:"하지만 좀 향수병이 나요",ja:"でも少しホームシックになります",hi:"लेकिन मुझे थोड़ी घर की याद आती है",ga:"Ach bím beagán buartha faoin mbaile",uk:"Але я трохи сумую за домом"}},
  {id:744,category:"acquainted",level:"A1",t:{fa:"هنوز مطمئن نیستم ولی در حدود چهار سال",en:"I'm not sure now, but about four years",de:"Ich bin mir nicht sicher, aber etwa vier Jahre",es:"No estoy seguro ahora, pero unos cuatro años",fr:"Je ne suis pas sûr maintenant, mais environ quatre ans",tr:"Şimdi emin değilim, ama yaklaşık dört yıl",ar:"لست متأكداً الآن، ولكن حوالي أربع سنوات",zh:"我现在不确定，但大约四年",ko:"지금은 확실하지 않지만, 약 4년 정도요",ja:"今は確かではありませんが、約4年です",hi:"मुझे अभी यकीन नहीं है, लेकिन लगभग चार साल",ga:"Níl mé cinnte anois, ach thart ar cheithre bliana",uk:"Я не впевнений зараз, але приблизно чотири роки"}},
  {id:745,category:"acquainted",level:"A1",t:{fa:"بله تنهایم",en:"Yes, I am alone",de:"Ja, ich bin allein",es:"Sí, estoy solo",fr:"Oui, je suis seul",tr:"Evet, yalnızım",ar:"نعم، أنا وحدي",zh:"是的，我一个人",ko:"네, 혼자예요",ja:"はい、一人です",hi:"हाँ, मैं अकेला हूँ",ga:"Sea, tá mé liom féin",uk:"Так, я сам"}},
  {id:746,category:"acquainted",level:"A1",t:{fa:"نه با چند دوست زندگی میکنم",en:"No, I live with some friends",de:"Nein, ich lebe mit einigen Freunden",es:"No, vivo con unos amigos",fr:"Non, je vis avec des amis",tr:"Hayır, birkaç arkadaşımla yaşıyorum",ar:"لا، أعيش مع بعض الأصدقاء",zh:"不，我和一些朋友住在一起",ko:"아니요, 몇 명의 친구들과 살아요",ja:"いいえ、何人かの友達と住んでいます",hi:"नहीं, मैं कुछ दोस्तों के साथ रहता हूँ",ga:"Níl, tá mé i mo chónaí le roinnt cairde",uk:"Ні, я живу з друзями"}},
  {id:747,category:"acquainted",level:"A1",t:{fa:"پنج نفر در خانواده ما هستند",en:"There are five in our family",de:"Wir sind fünf in der Familie",es:"Somos cinco en mi familia",fr:"Nous sommes cinq dans la famille",tr:"Ailemiz beş kişi",ar:"نحن خمسة في عائلتنا",zh:"我们家有五口人",ko:"우리 가족은 다섯 명이에요",ja:"家族は5人です",hi:"हमारे परिवार में पाँच लोग हैं",ga:"Tá cúigear inár dteaghlach",uk:"У нашій родині п'ятеро"}},
  {id:748,category:"acquainted",level:"A1",t:{fa:"والدین، برادر و خواهرم",en:"My parents, one brother and one sister",de:"Meine Eltern, ein Bruder und eine Schwester",es:"Mis padres, un hermano y una hermana",fr:"Mes parents, un frère et une sœur",tr:"Annem, babam, bir erkek ve bir kız kardeşim",ar:"والديّ، أخ وأخت",zh:"我的父母，一个兄弟和一个姐妹",ko:"부모님, 남동생 한 명, 여동생 한 명이에요",ja:"両親と、兄弟が一人、姉妹が一人です",hi:"मेरे माता-पिता, एक भाई और एक बहन",ga:"Mo thuismitheoirí, deartháir amháin agus deirfiúr amháin",uk:"Мої батьки, один брат і одна сестра"}},
  {id:749,category:"acquainted",level:"A1",t:{fa:"من (۳۴) سال دارم",en:"I am (34) years old",de:"Ich bin 34 Jahre alt",es:"Tengo 34 años",fr:"J'ai 34 ans",tr:"34 yaşındayım",ar:"عمري 34 سنة",zh:"我34岁",ko:"저는 34살이에요",ja:"私は34歳です",hi:"मैं 34 साल का हूँ",ga:"Tá mé 34 bliana d'aois",uk:"Мені 34 роки"}},
  {id:750,category:"acquainted",level:"A1",t:{fa:"من به فارسی و قدری انگلیسی حرف میزنم",en:"I speak Persian and a little English",de:"Ich spreche Persisch und ein wenig Englisch",es:"Hablo persa y un poco de inglés",fr:"Je parle persan et un peu anglais",tr:"Farsça ve biraz İngilizce konuşuyorum",ar:"أتحدث الفارسية والقليل من الإنجليزية",zh:"我说波斯语和一点英语",ko:"페르시아어와 영어를 조금 해요",ja:"ペルシア語と少し英語を話します",hi:"मैं फ़ारसी और थोड़ी अंग्रेज़ी बोलता हूँ",ga:"Labhraím Peirsis agus beagán Béarla",uk:"Я говорю перською і трохи англійською"}},
  {id:751,category:"acquainted",level:"A1",t:{fa:"من مسلمانم / دین من اسلام است",en:"I am Muslim / My religion is Islam",de:"Ich bin Muslim / Meine Religion ist der Islam",es:"Soy musulmán / Mi religión es el Islam",fr:"Je suis musulman / Ma religion est l'Islam",tr:"Müslümanım / Dinim İslam",ar:"أنا مسلم / ديني الإسلام",zh:"我是穆斯林 / 我的宗教信仰是伊斯兰教",ko:"저는 무슬림입니다 / 제 종교는 이슬람교입니다",ja:"私はイスラム教徒です / 私の宗教はイスラム教です",hi:"मैं मुसलमान हूँ / मेरा धर्म इस्लाम है",ga:"Is Moslamach mé / Is é an tIoslam mo chreideamh",uk:"Я мусульманин / Моя релігія — іслам"}},
  {id:752,category:"acquainted",level:"A1",t:{fa:"نه در واقع خیر",en:"No, not really",de:"Nein, nicht wirklich",es:"No, realmente no",fr:"Non, pas vraiment",tr:"Hayır, pek sayılmaz",ar:"لا، ليس حقاً",zh:"不，不太喜欢",ko:"아니요, 별로요",ja:"いいえ、あまり",hi:"नहीं, वास्तव में नहीं",ga:"Níl, ní haon",uk:"Ні, не дуже"}},
  {id:753,category:"acquainted",level:"A1",t:{fa:"من گاهی به سینما میروم",en:"I go to the cinema once in a while",de:"Ich gehe ab und zu ins Kino",es:"Voy al cine de vez en cuando",fr:"Je vais au cinéma de temps en temps",tr:"Arada sırada sinemaya giderim",ar:"أذهب إلى السينما بين الحين والآخر",zh:"我偶尔去看电影",ko:"가끔 영화 보러 가요",ja:"たまに映画に行きます",hi:"मैं कभी-कभी सिनेमा जाता हूँ",ga:"Téim go dtí an phictiúrlann uair éigin",uk:"Я іноді ходжу в кіно"}},
  {id:754,category:"acquainted",level:"A1",t:{fa:"آدرس من شماره ۵۱۶ بلوار مک آرتور است",en:"My address is 516 West MacArthur Blvd",de:"Meine Adresse ist 516 West MacArthur Blvd",es:"Mi dirección es 516 West MacArthur Blvd",fr:"Mon adresse est 516 West MacArthur Blvd",tr:"Adresim Batı MacArthur Bulvarı 516",ar:"عنواني هو 516 ويست ماك آرثر بوليفارد",zh:"我的地址是西麦克阿瑟大道516号",ko:"제 주소는 웨스트 맥아더 대로 516번지입니다",ja:"私の住所はウェストマッカーサーブルバード516番地です",hi:"मेरा पता 516 वेस्ट मैकआर्थर बुलेवार्ड है",ga:"Is é mo sheoladh 516 West MacArthur Blvd",uk:"Моя адреса — 516 Вест Мак-Артур бульвар"}},
  {id:755,category:"invitation",level:"A1",t:{fa:"آیا می‌توانید برای شام بیایید؟",en:"Can you come for dinner?",de:"Können Sie zum Abendessen kommen?",es:"¿Puedes venir a cenar?",fr:"Pouvez-vous venir dîner?",tr:"Akşam yemeğine gelebilir misiniz?",ar:"هل يمكنك الحضور للعشاء؟",zh:"你能来吃晚饭吗？",ko:"저녁 식사에 오실 수 있나요?",ja:"夕食に来られますか？",hi:"क्या आप रात के खाने पर आ सकते हैं?",ga:"An féidir leat teacht don dinnéar?",uk:"Ви можете прийти на вечерю?"}},
  {id:756,category:"invitation",level:"A1",t:{fa:"آیا میخواهید امروز برای ناهار به ما ملحق شوید؟",en:"Do you want to join us for lunch today?",de:"Möchten Sie heute zum Mittagessen zu uns stoßen?",es:"¿Quieres unirte a nosotros para el almuerzo hoy?",fr:"Voulez-vous vous joindre à nous pour le déjeuner aujourd'hui?",tr:"Bugün öğle yemeğinde bize katılmak ister misiniz?",ar:"هل تريد الانضمام إلينا لتناول الغداء اليوم؟",zh:"今天想和我们一起吃午饭吗？",ko:"오늘 점심에 우리와 함께 하시겠어요?",ja:"今日の昼食に一緒にいかがですか？",hi:"क्या आप आज दोपहर के भोजन के लिए हमसे जुड़ना चाहेंगे?",ga:"Ar mhaith leat teacht linn don lón inniu?",uk:"Бажаєте приєднатися до нас на обід сьогодні?"}},
  {id:757,category:"invitation",level:"A1",t:{fa:"نظرتان درباره صرف غذا با همدیگر چیست؟",en:"How about eating together?",de:"Wie wäre es mit zusammen essen?",es:"¿Qué te parece comer juntos?",fr:"Que diriez-vous de manger ensemble?",tr:"Birlikte yemek yemeye ne dersiniz?",ar:"ماذا عن تناول الطعام معاً؟",zh:"一起吃个饭怎么样？",ko:"같이 식사하는 게 어때요?",ja:"一緒に食事しませんか？",hi:"साथ में खाना खाने के बारे में क्या ख्याल है?",ga:"Cad é mar gheall ar ithe le chéile?",uk:"Як щодо спільної вечері?"}},
  {id:758,category:"invitation",level:"A1",t:{fa:"من شما را به منزلم دعوت میکنم",en:"I'll invite you to my place",de:"Ich lade Sie zu mir nach Hause ein",es:"Te invito a mi casa",fr:"Je vous invite chez moi",tr:"Sizi evime davet ediyorum",ar:"سأدعوك إلى منزلي",zh:"我邀请你来我家",ko:"제 집으로 초대할게요",ja:"私の家に招待します",hi:"मैं आपको अपने घर बुलाऊँगा",ga:"Tabharfaidh mé cuireadh duit go dtí mo theach",uk:"Я запрошу вас до себе додому"}},
  {id:759,category:"invitation",level:"A1",t:{fa:"من شما را به چای دعوت میکنم",en:"I'll invite you for tea",de:"Ich lade Sie zum Tee ein",es:"Te invito a tomar té",fr:"Je vous invite à prendre le thé",tr:"Sizi çaya davet ediyorum",ar:"سأدعوك لتناول الشاي",zh:"我请你去喝茶",ko:"차를 마시러 초대할게요",ja:"お茶に招待します",hi:"मैं आपको चाय पर बुलाऊँगा",ga:"Tabharfaidh mé cuireadh duit le haghaidh tae",uk:"Я запрошу вас на чай"}},
  {id:760,category:"invitation",level:"A1",t:{fa:"ما میل داریم شما و خانواده تان مهمان ما باشید",en:"We'd like you and your family to be our guests",de:"Wir möchten Sie und Ihre Familie als unsere Gäste haben",es:"Nos gustaría que tú y tu familia fueran nuestros invitados",fr:"Nous aimerions que vous et votre famille soyez nos invités",tr:"Siz ve ailenizi misafirimiz olarak görmek isteriz",ar:"نود أن تكون أنت وعائلتك ضيوفنا",zh:"我们想邀请你和你的家人来做客",ko:"당신과 가족을 초대하고 싶어요",ja:"あなたとご家族をお客様としてお迎えしたいです",hi:"हम चाहेंगे कि आप और आपका परिवार हमारे मेहमान बनें",ga:"Ba mhaith linn tusa agus do theaghlach a bheith mar aíonna againn",uk:"Ми хотіли б, щоб ви та ваша родина були нашими гостями"}},
  {id:761,category:"invitation",level:"A1",t:{fa:"ممکن است شما را به رستوران دعوت کنم؟",en:"May I invite you to a restaurant?",de:"Darf ich Sie in ein Restaurant einladen?",es:"¿Puedo invitarte a un restaurante?",fr:"Puis-je vous inviter au restaurant?",tr:"Sizi bir restorana davet edebilir miyim?",ar:"هل يمكنني دعوتك إلى مطعم؟",zh:"我可以请你去餐厅吗？",ko:"레스토랑에 초대해도 될까요?",ja:"レストランに招待してもいいですか？",hi:"क्या मैं आपको रेस्तराँ में आमंत्रित कर सकता हूँ?",ga:"An féidir liom cuireadh a thabhairt duit chuig bialann?",uk:"Можна запросити вас до ресторану?"}},
  {id:762,category:"invitation",level:"A1",t:{fa:"اگر برنامه دیگری ندارید اجازه بدهید به رستورانی برویم",en:"Let's go to a restaurant if you don't have other plans",de:"Gehen wir in ein Restaurant, wenn Sie keine anderen Pläne haben",es:"Vamos a un restaurante si no tienes otros planes",fr:"Allons au restaurant si vous n'avez pas d'autres projets",tr:"Başka planınız yoksa bir restorana gidelim",ar:"لنذهب إلى مطعم إذا لم يكن لديك خطط أخرى",zh:"如果你没有其他计划，我们去餐馆吧",ko:"다른 계획이 없으시면 레스토랑에 가요",ja:"他に予定がなければ、レストランに行きましょう",hi:"अगर आपकी कोई और योजना नहीं है तो चलो एक रेस्तराँ चलते हैं",ga:"Téimis go dtí bialann mura bhfuil pleananna eile agat",uk:"Ходімо в ресторан, якщо у вас немає інших планів"}},
  {id:763,category:"invitation",level:"A1",t:{fa:"اگر مشغول نیستید مایلید با من غذا بخورید؟",en:"Would you like to eat with me if you are not busy?",de:"Möchten Sie mit mir essen, wenn Sie nicht beschäftigt sind?",es:"¿Te gustaría comer conmigo si no estás ocupado?",fr:"Voulez-vous manger avec moi si vous n'êtes pas occupé?",tr:"Meşgul değilseniz benimle yemek yer misiniz?",ar:"هل ترغب في تناول الطعام معي إذا لم تكن مشغولاً؟",zh:"如果你不忙，想和我一起吃饭吗？",ko:"바쁘지 않으시면 저와 함께 식사하시겠어요?",ja:"お忙しくなければ、一緒に食事しませんか？",hi:"अगर आप व्यस्त नहीं हैं तो क्या आप मेरे साथ खाना खाना चाहेंगे?",ga:"Ar mhaith leat ithe liom mura bhfuil tú gnóthach?",uk:"Хотіли б ви поїсти зі мною, якщо ви не зайняті?"}},
  {id:764,category:"invitation",level:"A1",t:{fa:"اگر آزاد هستید، آیا به دیدن فیلم علاقه مندید؟",en:"Would you be interested in seeing a film if you're free?",de:"Hätten Sie Interesse, einen Film zu sehen, wenn Sie frei sind?",es:"¿Te interesaría ver una película si estás libre?",fr:"Seriez-vous intéressé par un film si vous êtes libre?",tr:"Vaktiniz varsa film izlemek ister misiniz?",ar:"هل ترغب في مشاهدة فيلم إذا كنت حراً؟",zh:"如果你有空，有兴趣看电影吗？",ko:"시간이 있으시면 영화 보실래요?",ja:"お時間があれば、映画に興味がありますか？",hi:"अगर आप खाली हैं तो क्या आप फिल्म देखने में रुचि लेंगे?",ga:"An mbeadh suim agat scannán a fheiceáil má tá tú saor?",uk:"Чи зацікавлені ви подивитися фільм, якщо ви вільні?"}},
  {id:765,category:"invitation",level:"A1",t:{fa:"همین شنبه شب مایلم شما را برای شام به منزل دعوت کنم",en:"I'd like to invite you over for dinner this Saturday evening",de:"Ich möchte Sie diesen Samstagabend zum Abendessen einladen",es:"Me gustaría invitarte a cenar este sábado por la noche",fr:"Je voudrais vous inviter à dîner samedi soir",tr:"Bu Cumartesi akşamı sizi akşam yemeğine davet etmek istiyorum",ar:"أود دعوتك لتناول العشاء مساء السبت القادم",zh:"我想邀请你本周六晚上来吃晚饭",ko:"이번 토요일 저녁에 저녁 식사에 초대하고 싶어요",ja:"今週の土曜日の夕方に夕食に招待したいです",hi:"मैं इस शनिवार शाम को रात के खाने पर आपको आमंत्रित करना चाहूंगा",ga:"Ba mhaith liom cuireadh a thabhairt duit don dinnéar tráthnóna Sathairn seo",uk:"Я хотів би запросити вас на вечерю в суботу ввечері"}},
  {id:766,category:"invitation",level:"A1",t:{fa:"آیا شما به تماشای مناظر علاقه مندید؟",en:"Would you by any chance be interested in sightseeing?",de:"Wären Sie zufällig an einer Stadtbesichtigung interessiert?",es:"¿Te interesaría hacer turismo por casualidad?",fr:"Seriez-vous par hasard intéressé par la visite de la ville?",tr:"Belki şehir turuyla ilgilenir misiniz?",ar:"هل ترغب في مشاهدة المعالم السياحية؟",zh:"你有兴趣观光吗？",ko:"혹시 관광에 관심 있으세요?",ja:"もしかして観光に興味がありますか？",hi:"क्या आप दर्शनीय स्थलों की यात्रा में रुचि रखते हैं?",ga:"An mbeadh suim agat i radharcanna a fheiceáil?",uk:"Чи зацікавлені ви в огляді визначних пам'яток?"}},
  {id:767,category:"invitation",level:"A1",t:{fa:"این جمعه به باغ وحش برویم؟",en:"How would you like to go to the zoo this Friday?",de:"Wie wäre es, wenn wir diesen Freitag in den Zoo gehen?",es:"¿Qué te parece ir al zoológico este viernes?",fr:"Que diriez-vous d'aller au zoo ce vendredi?",tr:"Bu Cuma hayvanat bahçesine gitmeye ne dersiniz?",ar:"ماذا عن الذهاب إلى حديقة الحيوان يوم الجمعة القادم؟",zh:"这周五去动物园怎么样？",ko:"이번 금요일에 동물원에 가는 게 어때요?",ja:"今週の金曜日に動物園に行きませんか？",hi:"इस शुक्रवार को चिड़ियाघर जाने के बारे में क्या ख्याल है?",ga:"Cad é mar gheall ar dul go dtí an zú an Aoine seo?",uk:"Як щодо походу до зоопарку в цю п'ятницю?"}},
  {id:768,category:"invitation",level:"A1",t:{fa:"آیا در تعطیل آخر هفته به پیک نیک می آیید؟",en:"Can you come to a picnic this weekend?",de:"Können Sie dieses Wochenende zu einem Picknick kommen?",es:"¿Puedes venir a un picnic este fin de semana?",fr:"Pouvez-vous venir à un pique-nique ce week-end?",tr:"Bu hafta sonu pikniğe gelebilir misiniz?",ar:"هل يمكنك الحضور إلى نزهة في نهاية هذا الأسبوع؟",zh:"这个周末你能来野餐吗？",ko:"이번 주말에 소풍에 오실 수 있나요?",ja:"今週末ピクニックに来られますか？",hi:"क्या आप इस सप्ताह के अंत में पिकनिक पर आ सकते हैं?",ga:"An féidir leat teacht ar phicnic an deireadh seachtaine seo?",uk:"Ви можете прийти на пікнік цими вихідними?"}},
  {id:769,category:"invitation",level:"A1",t:{fa:"آیا می توانید بیایید؟",en:"Would you be able to come?",de:"Könnten Sie kommen?",es:"¿Podrías venir?",fr:"Pourriez-vous venir?",tr:"Gelebilir misiniz?",ar:"هل ستتمكن من الحضور؟",zh:"你能来吗？",ko:"오실 수 있나요?",ja:"来られますか？",hi:"क्या आप आ सकेंगे?",ga:"An mbeifeá in ann teacht?",uk:"Чи зможете ви прийти?"}},
  {id:770,category:"invitation",level:"A1",t:{fa:"آیا می توانید خودتان را برسانید؟",en:"Can you make it?",de:"Schaffen Sie es?",es:"¿Puedes llegar?",fr:"Pouvez-vous y arriver?",tr:"Yetişebilir misiniz?",ar:"هل تستطيع القدوم؟",zh:"你能赶到吗？",ko:"오실 수 있나요?",ja:"間に合いますか？",hi:"क्या आप आ सकते हैं?",ga:"An féidir leat é a dhéanamh?",uk:"Чи зможете ви прийти?"}},
  {id:771,category:"invitation",level:"A1",t:{fa:"فکر میکنید بتوانید بیایید؟",en:"Do you think you can come?",de:"Glauben Sie, dass Sie kommen können?",es:"¿Crees que puedes venir?",fr:"Pensez-vous pouvoir venir?",tr:"Gelebileceğinizi düşünüyor musunuz?",ar:"هل تعتقد أنك تستطيع المجيء؟",zh:"你觉得你能来吗？",ko:"올 수 있을 것 같아요?",ja:"来られると思いますか？",hi:"क्या आपको लगता है कि आप आ सकते हैं?",ga:"An dóigh leat gur féidir leat teacht?",uk:"Ви думаєте, що зможете прийти?"}},
  {id:772,category:"invitation",level:"A1",t:{fa:"(ما) امیدواریم بتوانید بیایید",en:"(We) hope you can come",de:"(Wir) hoffen, Sie können kommen",es:"(Esperamos) que puedas venir",fr:"(Nous) espérons que vous pourrez venir",tr:"(Biz) gelebileceğinizi umuyoruz",ar:"(نحن) نأمل أن تتمكن من الحضور",zh:"（我们）希望你能来",ko:"(저희는) 오실 수 있기를 바랍니다",ja:"（私たちは）来ていただけることを願っています",hi:"(हम) आशा करते हैं कि आप आ सकेंगे",ga:"(Tá súil) againn gur féidir leat teacht",uk:"(Ми) сподіваємося, що ви зможете прийти"}},
  {id:773,category:"invitation",level:"A1",t:{fa:"با کمال میل",en:"I'd love to",de:"Sehr gern",es:"Me encantaría",fr:"J'aimerais beaucoup",tr:"Çok isterim",ar:"يسعدني ذلك",zh:"我很乐意",ko:"정말 가고 싶어요",ja:"喜んで",hi:"मुझे बहुत अच्छा लगेगा",ga:"Is breá liom",uk:"З великим задоволенням"}},
  {id:774,category:"invitation",level:"A1",t:{fa:"دوست دارم که بیایم",en:"I'd like to",de:"Ich würde gerne",es:"Me gustaría",fr:"Je voudrais bien",tr:"İsterim",ar:"أود ذلك",zh:"我想来",ko:"가고 싶어요",ja:"行きたいです",hi:"मैं आना चाहूंगा",ga:"Ba mhaith liom",uk:"Я хотів би"}},
  {id:775,category:"invitation",level:"A1",t:{fa:"خوشحال میشوم",en:"I'd be glad to",de:"Ich würde mich freuen",es:"Me encantaría",fr:"Je serais ravi",tr:"Memnun olurum",ar:"سأكون سعيداً بذلك",zh:"我会很高兴的",ko:"기쁠 것 같아요",ja:"嬉しいです",hi:"मुझे खुशी होगी",ga:"Bheinn sásta",uk:"Я був би радий"}},
  {id:776,category:"invitation",level:"A1",t:{fa:"دوست دارم بیایم (دعوت را می‌پذیرم)",en:"I'd like that",de:"Das würde mir gefallen",es:"Me gustaría eso",fr:"J'aimerais ça",tr:"Bunu isterim",ar:"يعجبني ذلك",zh:"我喜欢",ko:"그럴게요",ja:"そうしたいです",hi:"मुझे यह पसंद आएगा",ga:"Ba mhaith liom sin",uk:"Мені б це сподобалося"}},
  {id:777,category:"invitation",level:"A1",t:{fa:"خوشحال خواهم شد",en:"I'd be happy to",de:"Ich wäre glücklich",es:"Estaría feliz",fr:"Je serais heureux",tr:"Mutlu olurum",ar:"سأكون سعيداً",zh:"我会很高兴",ko:"기쁠 거예요",ja:"喜んでします",hi:"मुझे खुशी होगी",ga:"Bheinn sásta",uk:"Я буду щасливий"}},
  {id:778,category:"invitation",level:"A1",t:{fa:"ما خوشحال میشویم که بیاییم",en:"We'd be pleased to come",de:"Wir würden gerne kommen",es:"Estaríamos encantados de venir",fr:"Nous serions ravis de venir",tr:"Gelmekten memnuniyet duyarız",ar:"سنكون سعداء بالحضور",zh:"我们会很高兴来的",ko:"가게 되어 기쁠 거예요",ja:"喜んで伺います",hi:"हमें आकर खुशी होगी",ga:"Bheimis sásta teacht",uk:"Ми будемо раді прийти"}},
  {id:779,category:"invitation",level:"A1",t:{fa:"باعث مسرت من خواهد بود",en:"I'd be delighted to",de:"Ich würde mich sehr freuen",es:"Estaría encantado",fr:"Je serais ravi",tr:"Memnun olurum",ar:"سأكون مسروراً",zh:"我会非常高兴",ko:"정말 기쁠 거예요",ja:"喜んで参加します",hi:"मुझे बहुत खुशी होगी",ga:"Bheinn ar m'aird",uk:"Я був би в захваті"}},
  {id:780,category:"invitation",level:"A1",t:{fa:"عالی است",en:"That sounds great",de:"Das klingt großartig",es:"Suena genial",fr:"Ça a l'air super",tr:"Kulağa harika geliyor",ar:"يبدو رائعاً",zh:"听起来很棒",ko:"좋아요",ja:"素晴らしいですね",hi:"यह बहुत अच्छा लगता है",ga:"Fuaimeanna sin go hiontach",uk:"Звучить чудово"}},
  {id:781,category:"invitation",level:"A1",t:{fa:"فکر خوبی است",en:"That's a good idea",de:"Das ist eine gute Idee",es:"Es una buena idea",fr:"C'est une bonne idée",tr:"Bu iyi bir fikir",ar:"هذه فكرة جيدة",zh:"好主意",ko:"좋은 생각이에요",ja:"いいアイデアですね",hi:"यह एक अच्छा विचार है",ga:"Is smaoineamh maith é sin",uk:"Це гарна ідея"}},
  {id:782,category:"invitation",level:"A1",t:{fa:"به شما خبر میدهم",en:"I'll let you know",de:"Ich lasse es Sie wissen",es:"Te lo haré saber",fr:"Je vous tiendrai au courant",tr:"Size haber veririm",ar:"سأعلمك",zh:"我会告诉你的",ko:"알려드릴게요",ja:"お知らせします",hi:"मैं आपको बता दूंगा",ga:"Cuirfidh mé in iúl duit",uk:"Я повідомлю вам"}},
  {id:783,category:"invitation",level:"A1",t:{fa:"نهایت سعی خود را میکنم که بیایم",en:"I'll do my best",de:"Ich werde mein Bestes geben",es:"Haré mi mejor esfuerzo",fr:"Je ferai de mon mieux",tr:"Elimden geleni yapacağım",ar:"سأبذل قصارى جهدي",zh:"我会尽力的",ko:"최선을 다할게요",ja:"頑張ります",hi:"मैं अपनी पूरी कोशिश करूँगा",ga:"Déanfaidh mé mo dhícheall",uk:"Я зроблю все можливе"}},
  {id:784,category:"invitation",level:"A1",t:{fa:"نمی توانم بیایم",en:"I won't be able to",de:"Ich werde nicht können",es:"No podré",fr:"Je ne pourrai pas",tr:"Gelemeyeceğim",ar:"لن أكون قادراً على ذلك",zh:"我来不了",ko:"갈 수 없을 것 같아요",ja:"行けません",hi:"मैं नहीं आ पाऊँगा",ga:"Ní bheidh mé in ann",uk:"Я не зможу"}},
  {id:785,category:"invitation",level:"A1",t:{fa:"خیلی مشتاقم اما نمی‌توانم",en:"I'd love to, but I can't",de:"Ich würde gerne, aber ich kann nicht",es:"Me encantaría, pero no puedo",fr:"J'aimerais beaucoup, mais je ne peux pas",tr:"Çok isterim ama gelemem",ar:"أحب ذلك، لكن لا أستطيع",zh:"我很想去，但我不能",ko:"정말 가고 싶지만, 갈 수 없어요",ja:"行きたいのですが、行けません",hi:"मुझे बहुत अच्छा लगेगा, लेकिन मैं नहीं कर सकता",ga:"Is breá liom, ach ní féidir liom",uk:"Я б дуже хотів, але не можу"}},
  {id:786,category:"invitation",level:"A1",t:{fa:"ممنونم که مرا دعوت کردید",en:"Thank you for inviting me",de:"Danke für die Einladung",es:"Gracias por invitarme",fr:"Merci de m'avoir invité",tr:"Davetiniz için teşekkür ederim",ar:"شكراً لدعوتي",zh:"谢谢你的邀请",ko:"초대해 주셔서 감사합니다",ja:"お招きいただきありがとうございます",hi:"मुझे आमंत्रित करने के लिए धन्यवाद",ga:"Go raibh maith agat as cuireadh a thabhairt dom",uk:"Дякую, що запросили мене"}},
  {id:787,category:"invitation",level:"A1",t:{fa:"ممنونم که از من خواستید بیایم",en:"Thank you for asking",de:"Danke, dass Sie gefragt haben",es:"Gracias por preguntar",fr:"Merci de m'avoir demandé",tr:"Sorduğunuz için teşekkürler",ar:"شكراً لسؤالك",zh:"谢谢你问我",ko:"물어봐 주셔서 감사합니다",ja:"お声がけいただきありがとうございます",hi:"पूछने के लिए धन्यवाद",ga:"Go raibh maith agat as fiafraí",uk:"Дякую, що запитали"}},
  {id:788,category:"invitation",level:"A1",t:{fa:"از دعوتتان سپاسگزارم",en:"Thanks for the invitation",de:"Danke für die Einladung",es:"Gracias por la invitación",fr:"Merci pour l'invitation",tr:"Davet için teşekkürler",ar:"شكراً على الدعوة",zh:"谢谢你的邀请",ko:"초대해 주셔서 감사합니다",ja:"ご招待ありがとうございます",hi:"निमंत्रण के लिए धन्यवाद",ga:"Go raibh maith agat as an gcuireadh",uk:"Дякую за запрошення"}},
  {id:789,category:"invitation",level:"A1",t:{fa:"لطف کردید که ما را دعوت کردید",en:"It's very kind of you to invite us",de:"Es ist sehr nett von Ihnen, uns einzuladen",es:"Es muy amable de tu parte invitarnos",fr:"C'est très gentil à vous de nous inviter",tr:"Bizi davet etmeniz çok nazikçe",ar:"من اللطف منك دعوتنا",zh:"你邀请我们真是太好了",ko:"초대해 주셔서 정말 감사합니다",ja:"お招きいただき誠にありがとうございます",hi:"हमें आमंत्रित करना आपकी बड़ी कृपा है",ga:"Is an-chineálta leat cuireadh a thabhairt dúinn",uk:"Дуже люб'язно з вашого боку запросити нас"}},
  {id:790,category:"goodbye",level:"A1",t:{fa:"متأسفم باید بروم",en:"Sorry I have to rush off like this",de:"Entschuldigung, ich muss so schnell los",es:"Lo siento, tengo que irme rápido así",fr:"Désolé, je dois filer comme ça",tr:"Affedersiniz, böyle aceleyle gitmek zorundayım",ar:"آسف، يجب أن أسرع بالذهاب هكذا",zh:"抱歉，我得这样匆匆走了",ko:"죄송합니다, 이렇게 급히 가야 해요",ja:"すみません、こんなに急いで帰らなければなりません",hi:"क्षमा करें, मुझे इस तरह जल्दी जाना है",ga:"Tá brón orm, caithfidh mé rith amach mar seo",uk:"Вибачте, я мушу так швидко втекти"}},
  {id:791,category:"goodbye",level:"A1",t:{fa:"خوب، احتمالاً به اندازه کافی وقتتان را گرفته ام",en:"Well, I've probably taken up enough of your time",de:"Nun, ich habe wohl genug Ihrer Zeit in Anspruch genommen",es:"Bueno, probablemente te he tomado suficiente tiempo",fr:"Eh bien, j'ai probablement pris assez de votre temps",tr:"Eh, muhtemelen yeterince zamanınızı aldım",ar:"حسناً، ربما أخذت وقتاً كافياً منك",zh:"好吧，我大概占用了你足够多的时间",ko:"글쎄요, 아마도 충분히 시간을 드린 것 같아요",ja:"まあ、もう十分お時間を取ってしまったでしょう",hi:"खैर, मैंने शायद आपका काफी समय ले लिया है",ga:"Bhuel, is dócha gur thóg mé go leor ama uait",uk:"Ну, я, мабуть, забрав у вас достатньо часу"}},
  {id:792,category:"goodbye",level:"A1",t:{fa:"خوب میدانم که شما آدم خیلی پر مشغله ای هستید",en:"Well, I know you're a very busy person",de:"Nun, ich weiß, dass Sie ein sehr beschäftigter Mensch sind",es:"Bueno, sé que eres una persona muy ocupada",fr:"Eh bien, je sais que vous êtes une personne très occupée",tr:"Eh, çok meşgul bir insan olduğunuzu biliyorum",ar:"حسناً، أعلم أنك شخص مشغول جداً",zh:"好吧，我知道你是个大忙人",ko:"글쎄요, 당신이 매우 바쁘신 분인 줄 알아요",ja:"まあ、あなたはとても忙しい人だとわかっています",hi:"खैर, मुझे पता है कि आप बहुत व्यक्ति हैं",ga:"Bhuel, tá a fhios agam gur duine an-ghnóthach tú",uk:"Ну, я знаю, що ви дуже зайнята людина"}},
  {id:793,category:"goodbye",level:"A1",t:{fa:"خوب نمی خواهم بیش از این وقتتان را تلف کنم",en:"Well, I don't want to waste any more of your time",de:"Nun, ich möchte nicht noch mehr Ihrer Zeit verschwenden",es:"Bueno, no quiero hacerte perder más tiempo",fr:"Eh bien, je ne veux pas gaspiller plus de votre temps",tr:"Eh, daha fazla zamanınızı harcamak istemem",ar:"حسناً، لا أريد إضاعة المزيد من وقتك",zh:"好吧，我不想再浪费你的时间了",ko:"글쎄요, 더 이상 당신의 시간을 낭비하고 싶지 않아요",ja:"まあ、これ以上あなたの時間を無駄にしたくありません",hi:"खैर, मैं आपका और अधिक समय बर्बाद नहीं करना चाहता",ga:"Bhuel, níl mé ag iarraidh níos mó ama a chur amú",uk:"Ну, я не хочу більше витрачати ваш час"}},
  {id:794,category:"goodbye",level:"A1",t:{fa:"از صحبتمان لذت بردم",en:"I've enjoyed our talk",de:"Ich habe unser Gespräch genossen",es:"He disfrutado nuestra charla",fr:"J'ai apprécié notre conversation",tr:"Sohbetimizden keyif aldım",ar:"استمتعت بحديثنا",zh:"我很享受我们的谈话",ko:"우리 대화가 즐거웠어요",ja:"お話しできて楽しかったです",hi:"मुझे हमारी बातचीत अच्छी लगी",ga:"Bhain mé sult as ár gcomhrá",uk:"Мені сподобалася наша розмова"}},
  {id:795,category:"goodbye",level:"A1",t:{fa:"از گفتگو با شما لذت بردم",en:"I've enjoyed talking with you",de:"Ich habe gerne mit Ihnen gesprochen",es:"He disfrutado hablando contigo",fr:"J'ai aimé parler avec vous",tr:"Sizinle konuşmaktan keyif aldım",ar:"استمتعت بالحديث معك",zh:"我很喜欢和你聊天",ko:"당신과 대화해서 즐거웠어요",ja:"お話しできて楽しかったです",hi:"मुझे आपसे बात करके अच्छा लगा",ga:"Bhain mé sult as labhairt leat",uk:"Мені сподобалося говорити з вами"}},
  {id:796,category:"goodbye",level:"A1",t:{fa:"مصاحبه دلپذیری بود",en:"It's been a pleasant interview",de:"Es war ein angenehmes Gespräch",es:"Ha sido una entrevista agradable",fr:"Ce fut un entretien agréable",tr:"Hoş bir görüşmeydi",ar:"كانت مقابلة ممتعة",zh:"这是一次愉快的面试",ko:"즐거운 인터뷰였어요",ja:"楽しい面接でした",hi:"यह एक सुखद साक्षात्कार था",ga:"Bhí sé ina agallamh taitneamhach",uk:"Це була приємна співбесіда"}},
  {id:797,category:"goodbye",level:"A1",t:{fa:"خوب شد با شما صحبت کردم",en:"It was nice talking to you",de:"Es war schön, mit Ihnen zu sprechen",es:"Fue un placer hablar contigo",fr:"C'était agréable de vous parler",tr:"Sizinle konuşmak güzeldi",ar:"كان من الجميل التحدث معك",zh:"和你聊天很愉快",ko:"당신과 대화해서 좋았어요",ja:"お話しできて良かったです",hi:"आपसे बात करके अच्छा लगा",ga:"Bhí sé go deas labhairt leat",uk:"Приємно було поговорити з вами"}},
  {id:798,category:"goodbye",level:"A1",t:{fa:"خوب شد دوباره شما را دیدم",en:"It was nice seeing you again",de:"Es war schön, Sie wiederzusehen",es:"Fue bueno verte de nuevo",fr:"C'était bon de vous revoir",tr:"Sizi tekrar görmek güzeldi",ar:"كان من الجميل رؤيتك مرة أخرى",zh:"很高兴再次见到你",ko:"다시 뵙게 되어 좋았어요",ja:"またお会いできて良かったです",hi:"आपको फिर से देखकर अच्छा लगा",ga:"Bhí sé go deas tú a fheiceáil arís",uk:"Приємно було знову побачити вас"}},
  {id:799,category:"goodbye",level:"A1",t:{fa:"از صحبت با شما لذت بردم",en:"It's been a pleasure talking with you",de:"Es war mir eine Freude, mit Ihnen zu sprechen",es:"Ha sido un placer hablar contigo",fr:"Ce fut un plaisir de parler avec vous",tr:"Sizinle konuşmak bir zevkti",ar:"كان من دواعي سروري التحدث معك",zh:"和你聊天是我的荣幸",ko:"당신과 대화하게 되어 기뻤어요",ja:"お話しできて光栄でした",hi:"आपसे बात करके मुझे खुशी हुई",ga:"Bhí sé ina phléisiúr labhairt leat",uk:"Було приємно поговорити з вами"}},
  {id:800,category:"goodbye",level:"A1",t:{fa:"خوب، واقعاً خوب شد شما را دوباره دیدم",en:"Well, it's been really nice seeing you again",de:"Nun, es war wirklich schön, Sie wiederzusehen",es:"Bueno, ha sido realmente bueno verte de nuevo",fr:"Eh bien, c'était vraiment agréable de vous revoir",tr:"Eh, sizi tekrar görmek gerçekten güzeldi",ar:"حسناً، كان من الجميل حقاً رؤيتك مرة أخرى",zh:"好吧，再次见到你真的很好",ko:"글쎄요, 다시 뵙게 되어 정말 좋았어요",ja:"まあ、本当にまたお会いできて良かったです",hi:"खैर, आपको फिर से देखना वास्तव में अच्छा था",ga:"Bhuel, bhí sé go hiontach tú a fheiceáil arís",uk:"Ну, було справді приємно знову побачити вас"}},
  {id:801,category:"goodbye",level:"A1",t:{fa:"خیلی دوست دارم صحبتمان را ادامه دهیم",en:"I'd love to continue our conversation",de:"Ich würde gerne unser Gespräch fortsetzen",es:"Me encantaría continuar nuestra conversación",fr:"J'aimerais continuer notre conversation",tr:"Sohbetimize devam etmeyi çok isterim",ar:"أحب أن نواصل حديثنا",zh:"我很想继续我们的谈话",ko:"대화를 계속하고 싶어요",ja:"会話を続けたいです",hi:"मैं हमारी बातचीत जारी रखना चाहूंगा",ga:"Ba bhreá liom leanúint lenár gcomhrá",uk:"Я хотів би продовжити нашу розмову"}},
  {id:802,category:"goodbye",level:"A1",t:{fa:"اما باید عجله کنم",en:"But I must rush",de:"Aber ich muss mich beeilen",es:"Pero debo apurarme",fr:"Mais je dois me dépêcher",tr:"Ama acele etmeliyim",ar:"لكن يجب أن أسرع",zh:"但我得赶时间了",ko:"하지만 서둘러야 해요",ja:"でも急がなければなりません",hi:"लेकिन मुझे जल्दी करनी है",ga:"Ach caithfidh mé deifir",uk:"Але я мушу поспішати"}},
  {id:803,category:"goodbye",level:"A1",t:{fa:"اوه، داره دیر میشه",en:"Oh, it's getting late",de:"Oh, es wird spät",es:"Oh, se está haciendo tarde",fr:"Oh, il se fait tard",tr:"Oh, geç oluyor",ar:"أوه، الوقت يتأخر",zh:"哦，天晚了",ko:"아, 늦어지고 있어요",ja:"ああ、遅くなってきましたね",hi:"ओह, देर हो रही है",ga:"Ó, tá sé ag éirí déanach",uk:"О, вже пізно"}},
  {id:804,category:"goodbye",level:"A1",t:{fa:"بهتر است حالا بروم",en:"I'd better go now",de:"Ich sollte jetzt besser gehen",es:"Mejor me voy ahora",fr:"Je ferais mieux d'y aller maintenant",tr:"Şimdi gitsem iyi olur",ar:"من الأفضل أن أذهب الآن",zh:"我最好现在走了",ko:"지금 가는 게 좋을 것 같아요",ja:"そろそろ行ったほうがいいですね",hi:"मेरे लिए अब जाना बेहतर होगा",ga:"Is fearr dom imeacht anois",uk:"Краще мені вже піти"}},
  {id:805,category:"goodbye",level:"A1",t:{fa:"باید (بدوم) عجله کنم",en:"I've got to run",de:"Ich muss los",es:"Tengo que correr",fr:"Je dois filer",tr:"Koşmam gerek",ar:"يجب أن أسرع",zh:"我得赶紧走了",ko:"서둘러야 해요",ja:"急いで行かなければ",hi:"मुझे दौड़ना होगा",ga:"Caithfidh mé rith",uk:"Я мушу бігти"}},
  {id:806,category:"goodbye",level:"A1",t:{fa:"باید راه بیفتم",en:"I should get going",de:"Ich sollte mich auf den Weg machen",es:"Debería irme",fr:"Je devrais y aller",tr:"Yola çıkmalıyım",ar:"يجب أن أنطلق",zh:"我该走了",ko:"이제 가야 할 것 같아요",ja:"そろそろ行かなくては",hi:"मुझे चलना चाहिए",ga:"Ba chóir dom dul",uk:"Мені вже час"}},
  {id:807,category:"goodbye",level:"A1",t:{fa:"دیگر باید راه بیفتم و الّا دیرم میشود",en:"I really must be going now or I'll be late",de:"Ich muss wirklich jetzt gehen, sonst komme ich zu spät",es:"Realmente debo irme ahora o llegaré tarde",fr:"Je dois vraiment y aller maintenant ou je serai en retard",tr:"Gerçekten şimdi gitmeliyim yoksa geç kalacağım",ar:"يجب أن أذهب حقاً الآن وإلا سأتأخر",zh:"我真的得走了，不然要迟到了",ko:"정말 지금 가야 해요, 안 그러면 늦을 거예요",ja:"本当に今行かなければ、遅れてしまいます",hi:"मुझे सच में अब जाना होगा, नहीं तो मुझे देर हो जाएगी",ga:"Caithfidh mé imeacht anois nó beidh mé déanach",uk:"Я справді мушу йти зараз, інакше запізнюсь"}},
  {id:808,category:"goodbye",level:"A1",t:{fa:"گمان میکنم حالا دیگه باید بروم",en:"I think I should be going now",de:"Ich denke, ich sollte jetzt gehen",es:"Creo que debería irme ahora",fr:"Je pense que je devrais y aller maintenant",tr:"Sanırım şimdi gitmeliyim",ar:"أعتقد أنني يجب أن أذهب الآن",zh:"我想我现在该走了",ko:"이제 가야 할 것 같아요",ja:"そろそろ行ったほうがいいと思います",hi:"मुझे लगता है कि मुझे अब जाना चाहिए",ga:"Sílim gur chóir dom imeacht anois",uk:"Я думаю, мені вже час"}},
  {id:809,category:"goodbye",level:"A1",t:{fa:"واقعاً حالا وقتش رسیده که بروم",en:"I've really got to go now",de:"Ich muss wirklich jetzt gehen",es:"Realmente tengo que irme ahora",fr:"Je dois vraiment y aller maintenant",tr:"Gerçekten şimdi gitmeliyim",ar:"حقاً يجب أن أذهب الآن",zh:"我真的得走了",ko:"정말 지금 가야 해요",ja:"本当にもう行かなければなりません",hi:"मुझे सच में अब जाना होगा",ga:"Caithfidh mé imeacht anois",uk:"Мені справді пора"}},
  {id:810,category:"goodbye",level:"A1",t:{fa:"لازم است که دیگر بروم",en:"I need to go now",de:"Ich muss jetzt gehen",es:"Necesito irme ahora",fr:"Je dois y aller maintenant",tr:"Şimdi gitmem gerek",ar:"أحتاج للذهاب الآن",zh:"我现在得走了",ko:"지금 가야 해요",ja:"もう行かなければなりません",hi:"मुझे अब जाना है",ga:"Caithfidh mé imeacht anois",uk:"Я повинен йти зараз"}},
  {id:811,category:"goodbye",level:"A1",t:{fa:"من باید خدا حافظی کنم",en:"I've come to say goodbye",de:"Ich bin gekommen, um Auf Wiedersehen zu sagen",es:"He venido a despedirme",fr:"Je suis venu vous dire au revoir",tr:"Hoşçakal demeye geldim",ar:"جئت لأقول وداعاً",zh:"我来道别了",ko:"작별 인사를 하러 왔어요",ja:"お別れを言いに来ました",hi:"मैं अलविदा कहने आया हूँ",ga:"Tháinig mé chun slán a fhágáil",uk:"Я прийшов попрощатися"}},
  {id:812,category:"goodbye",level:"A1",t:{fa:"من می خواهم با همه شما خدا حافظی کنم",en:"I'd like to say goodbye to you all",de:"Ich möchte mich bei allen von Ihnen verabschieden",es:"Me gustaría despedirme de todos ustedes",fr:"Je voudrais dire au revoir à vous tous",tr:"Hepinize hoşçakal demek istiyorum",ar:"أود أن أقول وداعاً لكم جميعاً",zh:"我想向大家道别",ko:"모두에게 작별 인사를 하고 싶어요",ja:"皆さんにお別れを言いたいです",hi:"मैं आप सभी को अलविदा कहना चाहूंगा",ga:"Ba mhaith liom slán a fhágáil agaibh go léir",uk:"Я хотів би попрощатися з усіма вами"}},
  {id:813,category:"goodbye",level:"A1",t:{fa:"تلفن زدم که خدا حافظی کنم",en:"I'm calling to say goodbye",de:"Ich rufe an, um Auf Wiedersehen zu sagen",es:"Llamo para despedirme",fr:"J'appelle pour dire au revoir",tr:"Hoşçakal demek için arıyorum",ar:"أتصل لأقول وداعاً",zh:"我打电话来道别",ko:"작별 인사를 하려고 전화했어요",ja:"お別れを言うために電話しています",hi:"मैं अलविदा कहने के लिए फोन कर रहा हूँ",ga:"Táim ag glaoch chun slán a fhágáil",uk:"Я телефоную попрощатися"}},
  {id:814,category:"goodbye",level:"A1",t:{fa:"اگر اجازه بدهید حالا دیگه باید مرخص شوم",en:"If you excuse me, I really should be off now",de:"Wenn Sie mich entschuldigen, ich sollte jetzt wirklich gehen",es:"Si me disculpas, realmente debería irme ahora",fr:"Si vous m'excusez, je devrais vraiment y aller maintenant",tr:"İzin verirseniz, şimdi gitmeliyim",ar:"إذا سمحت لي، يجب أن أنصرف الآن",zh:"恕我失陪，我真的该走了",ko:"실례합니다만, 이제 가야 해요",ja:"失礼ですが、もう行かなくては",hi:"अगर आप मुझे माफ करें, तो मुझे अब जाना चाहिए",ga:"Má thugann tú cead dom, ba chóir dom imeacht anois",uk:"Якщо ви дозволите, мені вже час"}},
  {id:815,category:"goodbye",level:"A1",t:{fa:"وقتش رسیده که ما مرخص شویم",en:"It's time we were off",de:"Es ist Zeit, dass wir gehen",es:"Es hora de que nos vayamos",fr:"Il est temps que nous partions",tr:"Gitme vaktimiz geldi",ar:"حان وقت ذهابنا",zh:"我们该走了",ko:"우리가 갈 시간이에요",ja:"そろそろ出発する時間です",hi:"हमारे जाने का समय हो गया है",ga:"Tá sé in am dúinn imeacht",uk:"Нам час іти"}},
  {id:816,category:"goodbye",level:"A1",t:{fa:"بله، خوب شد شما را دیدم",en:"Yes, it's been nice seeing you",de:"Ja, es war schön, Sie zu sehen",es:"Sí, ha sido bueno verte",fr:"Oui, ce fut agréable de vous voir",tr:"Evet, sizi görmek güzeldi",ar:"نعم، كان من الجميل رؤيتك",zh:"是的，见到你很高兴",ko:"네, 뵙게 되어 좋았어요",ja:"はい、お会いできて良かったです",hi:"हाँ, आपको देखना अच्छा था",ga:"Sea, bhí sé go deas tú a fheiceáil",uk:"Так, було приємно вас бачити"}},
  {id:817,category:"goodbye",level:"A1",t:{fa:"من هم از صحبت با شما خوشحال شدم",en:"It's been nice talking to you too",de:"Es war auch schön, mit Ihnen zu sprechen",es:"También ha sido agradable hablar contigo",fr:"Ce fut aussi agréable de vous parler",tr:"Ben de sizinle konuşmaktan memnun oldum",ar:"كان من الجميل التحدث معك أيضاً",zh:"和您聊天我也很高兴",ko:"저도 당신과 대화해서 좋았어요",ja:"私もお話しできて良かったです",hi:"आपसे बात करना भी अच्छा था",ga:"Bhí sé go deas labhairt leat freisin",uk:"Мені також було приємно поговорити з вами"}},
  {id:818,category:"goodbye",level:"A1",t:{fa:"خوشحالم همدیگر را دیدیم",en:"I'm glad we saw each other",de:"Ich bin froh, dass wir uns gesehen haben",es:"Me alegra que nos hayamos visto",fr:"Je suis content que nous nous soyons vus",tr:"Birbirimizi gördüğümüze sevindim",ar:"أنا سعيد لأننا رأينا بعضنا",zh:"很高兴我们见面了",ko:"서로 뵙게 되어 기뻐요",ja:"お会いできて嬉しいです",hi:"मुझे खुशी है कि हम एक-दूसरे से मिले",ga:"Tá áthas orm gur bhuail muid le chéile",uk:"Я радий, що ми зустрілися"}},
  {id:819,category:"goodbye",level:"A1",t:{fa:"خوشحالم تصادفی همدیگر را دیدیم",en:"I'm glad we ran into each other",de:"Ich bin froh, dass wir uns zufällig getroffen haben",es:"Me alegra que nos hayamos encontrado",fr:"Je suis content que nous nous soyons rencontrés par hasard",tr:"Tesadüfen karşılaştığımıza sevindim",ar:"أنا سعيد لأننا التقينا بالصدفة",zh:"很高兴我们偶遇了",ko:"우연히 만나게 되어 기뻐요",ja:"偶然お会いできて嬉しいです",hi:"मुझे खुशी है कि हम एक-दूसरे से टकरा गए",ga:"Tá áthas orm gur bhuail muid le chéile de thaisme",uk:"Я радий, що ми випадково зустрілися"}},
  {id:820,category:"goodbye",level:"A1",t:{fa:"این قدر زود؟ (میروید)",en:"So soon?",de:"Schon so bald?",es:"¿Tan pronto?",fr:"Si tôt?",tr:"Bu kadar erken mi?",ar:"بهذه السرعة؟",zh:"这么快？",ko:"벌써요?",ja:"もうそんなに早く？",hi:"इतनी जल्दी?",ga:"Chomh luath sin?",uk:"Так скоро?"}},
  {id:821,category:"goodbye",level:"A1",t:{fa:"چه شده هنوز نیامده میروید؟",en:"What already?",de:"Was, schon?",es:"¿Qué, ya?",fr:"Quoi déjà?",tr:"Ne, şimdiden mi?",ar:"ماذا، بالفعل؟",zh:"什么，已经？",ko:"벌써요?",ja:"もう？",hi:"क्या, पहले ही?",ga:"Cad é, cheana?",uk:"Що, вже?"}},
  {id:822,category:"goodbye",level:"A1",t:{fa:"یک چای دیگر میل نمیکنید؟",en:"Won't you have another (tea)?",de:"Möchten Sie nicht noch einen (Tee)?",es:"¿No quieres otro (té)?",fr:"Ne prendrez-vous pas un autre (thé)?",tr:"Bir (çay) daha içmez misiniz?",ar:"ألا ترغب في (شاي) آخر؟",zh:"不再来一杯（茶）吗？",ko:"(차) 한 잔 더 안 드시겠어요?",ja:"（お茶）をもう一杯いかがですか？",hi:"क्या आप एक और (चाय) नहीं लेंगे?",ga:"Nach mbeadh (tae) eile agat?",uk:"Чи не вип'єте ще одну чашку (чаю)?"}},
  {id:823,category:"goodbye",level:"A1",t:{fa:"نمی توانید یک کمی دیگر بمانید؟",en:"Can't you stay a little longer?",de:"Können Sie nicht etwas länger bleiben?",es:"¿No puedes quedarte un poco más?",fr:"Ne pouvez-vous pas rester un peu plus longtemps?",tr:"Biraz daha kalamaz mısınız?",ar:"ألا تستطيع البقاء لفترة أطول قليلاً؟",zh:"你不能多待一会儿吗？",ko:"조금 더 계실 수 없나요?",ja:"もう少し長くいられませんか？",hi:"क्या आप थोड़ी देर और नहीं रुक सकते?",ga:"Nach féidir leat fanacht beagán níos faide?",uk:"Не могли б ви залишитися ще трохи?"}},
  {id:824,category:"goodbye",level:"A1",t:{fa:"دلتان نمی خواهد برای شام بمانید؟",en:"Wouldn't you like to stay for dinner?",de:"Möchten Sie nicht zum Abendessen bleiben?",es:"¿No te gustaría quedarte a cenar?",fr:"Ne voulez-vous pas rester pour dîner?",tr:"Akşam yemeği için kalmak istemez misiniz?",ar:"ألا ترغب في البقاء لتناول العشاء؟",zh:"你不想留下来吃晚饭吗？",ko:"저녁 드시고 가지 않으시겠어요?",ja:"夕食に残っていかれませんか？",hi:"क्या आप रात के खाने के लिए नहीं रुकना चाहेंगे?",ga:"Nach mbeadh fonn ort fanacht don dinnéar?",uk:"Чи не хотіли б ви залишитися на вечерю?"}},
  {id:825,category:"goodbye",level:"A1",t:{fa:"چه وقت حرکت میکنید؟",en:"When are you leaving?",de:"Wann fahren Sie ab?",es:"¿Cuándo te vas?",fr:"Quand partez-vous?",tr:"Ne zaman ayrılıyorsunuz?",ar:"متى ستغادر؟",zh:"你什么时候出发？",ko:"언제 떠나세요?",ja:"いつ出発しますか？",hi:"आप कब जा रहे हैं?",ga:"Cathain a bhfuil tú ag imeacht?",uk:"Коли ви їдете?"}},
  {id:826,category:"goodbye",level:"A1",t:{fa:"چه ساعتی می روید؟",en:"What time are you going?",de:"Um wie viel Uhr gehen Sie?",es:"¿A qué hora te vas?",fr:"À quelle heure partez-vous?",tr:"Saat kaçta gidiyorsunuz?",ar:"في أي وقت ستذهب؟",zh:"你几点走？",ko:"몇 시에 가세요?",ja:"何時に出かけますか？",hi:"आप कितने बजे जा रहे हैं?",ga:"Cén t-am a bhfuil tú ag imeacht?",uk:"О котрій ви йдете?"}},
  {id:827,category:"goodbye",level:"A1",t:{fa:"خدا حافظ",en:"Goodbye",de:"Auf Wiedersehen",es:"Adiós",fr:"Au revoir",tr:"Hoşça kalın",ar:"مع السلامة",zh:"再见",ko:"안녕히 계세요",ja:"さようなら",hi:"अलविदा",ga:"Slán",uk:"До побачення"}},
  {id:828,category:"goodbye",level:"A1",t:{fa:"می بینمت",en:"See you",de:"Bis bald",es:"Nos vemos",fr:"À plus",tr:"Görüşürüz",ar:"أراك لاحقاً",zh:"回头见",ko:"또 봐요",ja:"またね",hi:"फिर मिलेंगे",ga:"Féach leat",uk:"Побачимось"}},
  {id:829,category:"goodbye",level:"A1",t:{fa:"به شما تلفن خواهم زد",en:"I'll call you",de:"Ich rufe Sie an",es:"Te llamaré",fr:"Je vous appellerai",tr:"Sizi ararım",ar:"سأتصل بك",zh:"我会打电话给你",ko:"전화할게요",ja:"電話します",hi:"मैं आपको फोन करूंगा",ga:"Glaofaidh mé ort",uk:"Я вам зателефоную"}},
  {id:830,category:"goodbye",level:"A1",t:{fa:"دوباره می بینمت",en:"I'll see you again",de:"Wir sehen uns wieder",es:"Te veré de nuevo",fr:"Je te reverrai",tr:"Tekrar görüşürüz",ar:"سأراك مرة أخرى",zh:"我们会再见面的",ko:"다시 만나요",ja:"また会いましょう",hi:"मैं आपको फिर से मिलूंगा",ga:"Feicfidh mé arís thú",uk:"Я побачу вас знову"}},
  {id:831,category:"goodbye",level:"A1",t:{fa:"بعداً با تو صحبت خواهم کرد",en:"I'll speak to you then",de:"Ich spreche dann mit Ihnen",es:"Hablaré contigo entonces",fr:"Je vous parlerai alors",tr:"Sonra konuşuruz",ar:"سأتحدث معك حينها",zh:"到时候再聊",ko:"그때 얘기해요",ja:"その時にまた話しましょう",hi:"मैं तब आपसे बात करूंगा",ga:"Labhróidh mé leat ansin",uk:"Я поговорю з вами тоді"}},
  {id:832,category:"goodbye",level:"A1",t:{fa:"مراقب خودت باش",en:"Take care",de:"Pass auf dich auf",es:"Cuídate",fr:"Prends soin de toi",tr:"Kendine iyi bak",ar:"اعتن بنفسك",zh:"保重",ko:"몸 조리하세요",ja:"お大事に",hi:"अपना ख्याल रखना",ga:"Tabhair aire",uk:"Бережи себе"}},
  {id:833,category:"goodbye",level:"A1",t:{fa:"سخت نگیر",en:"Take it easy",de:"Nehmen Sie es leicht",es:"Tómatelo con calma",fr:"Prenez les choses facilement",tr:"Sakin ol",ar:"خذ الأمور ببساطة",zh:"放轻松",ko:"편하게 지내세요",ja:"気楽にね",hi:"आराम से रहें",ga:"Tóg go bog é",uk:"Не переймайся"}},
  {id:834,category:"goodbye",level:"A1",t:{fa:"به زودی ترا میبینم",en:"See you soon",de:"Bis bald",es:"Hasta pronto",fr:"À bientôt",tr:"Yakında görüşürüz",ar:"أراك قريباً",zh:"很快见",ko:"곧 봐요",ja:"また近いうちに",hi:"जल्द ही मिलते हैं",ga:"Feicfidh mé go luath thú",uk:"Побачимось незабаром"}},
  {id:835,category:"goodbye",level:"A1",t:{fa:"هفته بعد تو را خواهم دید",en:"See you next week",de:"Bis nächste Woche",es:"Hasta la semana que viene",fr:"À la semaine prochaine",tr:"Haftaya görüşürüz",ar:"أراك الأسبوع القادم",zh:"下周见",ko:"다음 주에 봐요",ja:"また来週",hi:"अगले हफ्ते मिलते हैं",ga:"Feicfidh mé an tseachtain seo chugainn thú",uk:"Побачимось наступного тижня"}},
  {id:836,category:"goodbye",level:"A1",t:{fa:"خیلی دوست دارم بمانم",en:"I'd love to stay",de:"Ich würde gerne bleiben",es:"Me encantaría quedarme",fr:"J'aimerais rester",tr:"Kalmayı çok isterim",ar:"أحب البقاء",zh:"我很想留下来",ko:"머물고 싶어요",ja:"残りたいです",hi:"मुझे रहना बहुत पसंद होगा",ga:"Ba bhreá liom fanacht",uk:"Я хотів би залишитися"}},
  {id:837,category:"goodbye",level:"A1",t:{fa:"این محبت شما را می رساند",en:"That's very kind of you",de:"Das ist sehr nett von Ihnen",es:"Es muy amable de tu parte",fr:"C'est très gentil à vous",tr:"Bu çok nazikçe",ar:"هذا لطف منك",zh:"你真是太好了",ko:"정말 친절하시네요",ja:"お優しいですね",hi:"यह आपका बहुत बड़ा सौजन्य है",ga:"Tá sé sin an-chineálta uait",uk:"Це дуже люб'язно з вашого боку"}},
  {id:838,category:"goodbye",level:"A1",t:{fa:"اما فردا باید زود از خواب بلند شوم",en:"But I have to be up early tomorrow",de:"Aber ich muss morgen früh aufstehen",es:"Pero tengo que madrugar mañana",fr:"Mais je dois me lever tôt demain",tr:"Ama yarın erken kalkmam gerek",ar:"لكن يجب أن أستيقظ مبكراً غداً",zh:"但我明天要早起",ko:"하지만 내일 일찍 일어나야 해요",ja:"でも明日早く起きなければなりません",hi:"लेकिन मुझे कल जल्दी उठना है",ga:"Ach caithfidh mé éirí go luath amárach",uk:"Але я маю встати рано завтра"}},
  {id:839,category:"goodbye",level:"A1",t:{fa:"دلم میخواست میتوانستم بیشتر بمانم",en:"I wish I could stay longer",de:"Ich wünschte, ich könnte länger bleiben",es:"Ojalá pudiera quedarme más tiempo",fr:"J'aimerais pouvoir rester plus longtemps",tr:"Keşke daha uzun kalabilseydim",ar:"أتمنى لو أستطيع البقاء لفترة أطول",zh:"我希望我能待得更久",ko:"더 오래 머물 수 있었으면 좋겠어요",ja:"もっと長くいられたらいいのに",hi:"काश मैं और रुक पाता",ga:"Ba mhaith liom go bhféadfainn fanacht níos faide",uk:"Хотів би я залишитися довше"}},
  {id:840,category:"goodbye",level:"A1",t:{fa:"همین حالا هم برایم دیر شده است",en:"But I'm late already",de:"Aber ich bin schon spät dran",es:"Pero ya llego tarde",fr:"Mais je suis déjà en retard",tr:"Ama zaten geç kaldım",ar:"لكنني متأخر بالفعل",zh:"但我已经迟了",ko:"하지만 벌써 늦었어요",ja:"でももう遅れています",hi:"लेकिन मुझे पहले ही देर हो चुकी है",ga:"Ach tá mé déanach cheana féin",uk:"Але я вже запізнююсь"}},
  {id:841,category:"goodbye",level:"A1",t:{fa:"قطار من ساعت ده حرکت میکند",en:"My train leaves at ten",de:"Mein Zug fährt um zehn Uhr ab",es:"Mi tren sale a las diez",fr:"Mon train part à dix heures",tr:"Trenim saat onda kalkıyor",ar:"قطاري يغادر في العاشرة",zh:"我的火车十点开",ko:"제 기차는 10시에 출발해요",ja:"私の電車は10時に出発します",hi:"मेरी ट्रेन दस बजे चलती है",ga:"Imíonn mo thraein ag a deich",uk:"Мій потяг відправляється о десятій"}},
  {id:842,category:"goodbye",level:"A1",t:{fa:"روز یکشنبه به سوی وطنم پرواز میکنم",en:"I'm flying home on Sunday",de:"Ich fliege am Sonntag nach Hause",es:"Vuelo a casa el domingo",fr:"Je prends l'avion pour rentrer chez moi dimanche",tr:"Pazar günü eve uçuyorum",ar:"سأطير إلى المنزل يوم الأحد",zh:"我星期天飞回家",ko:"일요일에 집으로 비행기를 타요",ja:"日曜日に家に飛行機で帰ります",hi:"मैं रविवार को घर के लिए उड़ान भर रहा हूँ",ga:"Táim ag eitilt abhaile Dé Domhnaigh",uk:"Я лечу додому в неділю"}},
  {id:843,category:"goodbye",level:"A1",t:{fa:"به امید دیدار",en:"So long",de:"Mach's gut",es:"Hasta luego",fr:"À la prochaine",tr:"Görüşmek üzere",ar:"إلى اللقاء",zh:"再见",ko:"또 봐요",ja:"またね",hi:"फिर मिलेंगे",ga:"Slán go fóill",uk:"До зустрічі"}},
  {id:844,category:"goodbye",level:"A1",t:{fa:"هر چه زودتر دور هم جمع شویم",en:"Let's get together soon",de:"Lasst uns bald wieder zusammenkommen",es:"Vamos a reunirnos pronto",fr:"Réunissons-nous bientôt",tr:"Yakında bir araya gelelim",ar:"دعنا نجتمع قريباً",zh:"我们很快聚一聚吧",ko:"곧 같이 모여요",ja:"近いうちに集まりましょう",hi:"चलो जल्द ही मिलते हैं",ga:"Tar le chéile go luath",uk:"Зустріньмося скоро"}},
  {id:845,category:"goodbye",level:"A1",t:{fa:"لطفاً تماس داشته باشید",en:"Please keep in touch",de:"Bitte bleiben Sie in Kontakt",es:"Por favor, mantente en contacto",fr:"S'il vous plaît, restez en contact",tr:"Lütfen iletişimde kalın",ar:"من فضلك ابق على اتصال",zh:"请保持联系",ko:"연락하고 지내세요",ja:"連絡を取り合いましょう",hi:"कृपया संपर्क में रहें",ga:"Coinnigh i dteagmháil le do thoil",uk:"Будь ласка, залишайтеся на зв'язку"}},
  {id:846,category:"goodbye",level:"A1",t:{fa:"با ما در تماس باشید",en:"Stay in touch",de:"Bleiben Sie in Kontakt",es:"Mantente en contacto",fr:"Restez en contact",tr:"İletişimde kalın",ar:"ابق على اتصال",zh:"保持联系",ko:"연락하세요",ja:"連絡してください",hi:"संपर्क में रहें",ga:"Fan i dteagmháil",uk:"Залишайтеся на зв'язку"}},
  {id:847,category:"goodbye",level:"A1",t:{fa:"خوب سخت نگیرید",en:"Okay, take it easy",de:"Okay, nehmen Sie es leicht",es:"Bueno, tómatelo con calma",fr:"D'accord, prenez les choses facilement",tr:"Tamam, sakin ol",ar:"حسناً، خذ الأمور ببساطة",zh:"好的，放轻松",ko:"좋아요, 편하게 지내세요",ja:"はい、気楽にね",hi:"ठीक है, आराम से रहें",ga:"Ceart go leor, tóg go bog é",uk:"Добре, не переймайся"}},
  {id:848,category:"goodbye",level:"A1",t:{fa:"روز بخیر",en:"Good day",de:"Einen schönen Tag noch",es:"Buen día",fr:"Bonne journée",tr:"İyi günler",ar:"يوم جيد",zh:"祝你有美好的一天",ko:"좋은 하루 되세요",ja:"良い一日を",hi:"शुभ दिन",ga:"Lá maith",uk:"Гарного дня"}},
  {id:849,category:"goodbye",level:"A1",t:{fa:"شب بخیر",en:"Good night",de:"Gute Nacht",es:"Buenas noches",fr:"Bonne nuit",tr:"İyi geceler",ar:"ليلة سعيدة",zh:"晚安",ko:"안녕히 주무세요",ja:"おやすみなさい",hi:"शुभ रात्रि",ga:"Oíche mhaith",uk:"На добраніч"}},
  {id:850,category:"goodbye",level:"A1",t:{fa:"بدرود",en:"Farewell",de:"Lebewohl",es:"Despedida",fr:"Adieu",tr:"Elveda",ar:"وداعاً",zh:"告别",ko:"작별",ja:"さらば",hi:"विदाई",ga:"Slán",uk:"Прощавай"}},
  {id:851,category:"goodbye",level:"A1",t:{fa:"سفر خوش / سفر خوبی داشته باشید",en:"Have a good journey",de:"Gute Reise",es:"Buen viaje",fr:"Bon voyage",tr:"İyi yolculuklar",ar:"رحلة سعيدة",zh:"旅途愉快",ko:"좋은 여행 되세요",ja:"良い旅を",hi:"शुभ यात्रा",ga:"Go n-éirí an bóthar leat",uk:"Щасливої дороги"}},
  {id:852,category:"goodbye",level:"A1",t:{fa:"سفر بی خطر",en:"Have a safe trip",de:"Sichere Reise",es:"Viaje seguro",fr:"Bon voyage en toute sécurité",tr:"Güvenli yolculuklar",ar:"رحلة آمنة",zh:"一路平安",ko:"안전한 여행 되세요",ja:"安全な旅を",hi:"सुरक्षित यात्रा",ga:"Go raibh turas sábháilte agat",uk:"Безпечної дороги"}},
  {id:853,category:"goodbye",level:"A1",t:{fa:"خوب خدا حافظ",en:"Goodbye then",de:"Dann auf Wiedersehen",es:"Entonces, adiós",fr:"Alors au revoir",tr:"O zaman hoşçakalın",ar:"إذن مع السلامة",zh:"那就再见吧",ko:"그럼 안녕",ja:"では、さようなら",hi:"तो फिर अलविदा",ga:"Slán anois",uk:"Тоді до побачення"}},
  {id:854,category:"goodbye",level:"A1",t:{fa:"با آرزوی موفقیت بیشتر",en:"And all the very best",de:"Und alles Gute",es:"Y todo lo mejor",fr:"Et tout le meilleur",tr:"Ve tüm iyi dileklerimle",ar:"ومع أطيب التمنيات",zh:"祝你一切顺利",ko:"모든 행운을 빕니다",ja:"幸運を祈ります",hi:"और सभी शुभकामनाएँ",ga:"Agus gach rath ort",uk:"І всього найкращого"}},
  {id:855,category:"goodbye",level:"A1",t:{fa:"سلامم را به پدر و مادرت برسان",en:"Remember me to your parents",de:"Grüß deine Eltern von mir",es:"Saluda a tus padres de mi parte",fr:"Transmettez mes salutations à vos parents",tr:"Ailene benden selam söyle",ar:"أبلغ والديّ سلامي",zh:"代我问候你父母",ko:"부모님께 안부 전해주세요",ja:"ご両親によろしくお伝えください",hi:"अपने माता-पिता को मेरा नमस्ते कहना",ga:"Beannachtaí chuig do thuismitheoirí",uk:"Передайте привіт вашим батькам"}},
  {id:856,category:"goodbye",level:"A1",t:{fa:"از طرف من از بقیه افراد خانواده ات خدا حافظی کن",en:"Say good bye to the rest of your family",de:"Verabschiede dich von deiner Familie von mir",es:"Despídete de tu familia de mi parte",fr:"Dites au revoir à votre famille de ma part",tr:"Ailenin diğer bireylerine benden veda et",ar:"ودّع بقية أفراد عائلتك مني",zh:"替我向你家人道别",ko:"가족분들에게 작별 인사 전해주세요",ja:"ご家族の皆さんにお別れを伝えてください",hi:"अपने परिवार के बाकी सदस्यों को मेरी ओर से अलविदा कहना",ga:"Slán le do chlann uile uaim",uk:"Попрощайтеся з рештою вашої родини від мене"}},
  {id:857,category:"goodbye",level:"A1",t:{fa:"لطفاً به نسرین سلام برسان",en:"Please say hello to Nasrin",de:"Bitte grüß Nasrin von mir",es:"Por favor, saluda a Nasrin de mi parte",fr:"S'il vous plaît, dites bonjour à Nasrin",tr:"Lütfen Nasrin'e selam söyle",ar:"من فضلك أبلغ نسرين سلامي",zh:"请代我向纳丝琳问好",ko:"Nasrin에게 안부 전해주세요",ja:"ナスリンによろしくお伝えください",hi:"कृपया नसरीन को मेरा नमस्ते कहना",ga:"Beannachtaí chuig Nasrin le do thoil",uk:"Будь ласка, передайте привіт Насрін"}},
  {id:858,category:"goodbye",level:"A1",t:{fa:"لطفاً سلام مرا به جان برسان",en:"Please give me regards to John",de:"Bitte grüß John von mir",es:"Por favor, saluda a John de mi parte",fr:"S'il vous plaît, transmettez mes salutations à John",tr:"Lütfen John'a benden selam söyle",ar:"من فضلك أبلغ جون سلامي",zh:"请代我向约翰问好",ko:"John에게 안부 전해주세요",ja:"ジョンによろしくお伝えください",hi:"कृपया जॉन को मेरा नमस्ते कहना",ga:"Beannachtaí chuig John le do thoil",uk:"Будь ласка, передайте привіт Джону"}},
  {id:859,category:"goodbye",level:"A1",t:{fa:"اگر فرصت کردی نامه ای بنویس",en:"Please write, when you got/had time",de:"Schreib bitte, wenn du Zeit hast",es:"Por favor, escribe cuando tengas tiempo",fr:"S'il vous plaît, écrivez quand vous aurez le temps",tr:"Vaktin olursa lütfen yaz",ar:"من فضلك اكتب عندما يتوفر لديك وقت",zh:"有时间请写信",ko:"시간이 나면 편지 써주세요",ja:"時間ができたら手紙を書いてください",hi:"जब समय मिले तो कृपया पत्र लिखें",ga:"Scríobh le do thoil nuair a bheidh am agat",uk:"Будь ласка, напишіть, коли матимете час"}},
  {id:860,category:"goodbye",level:"A1",t:{fa:"وقتی رسیدی کارت پستالی برایمان بفرست",en:"Please send us a post card when you got there",de:"Bitte schick uns eine Postkarte, wenn du ankommst",es:"Por favor, envíanos una postal cuando llegues",fr:"S'il vous plaît, envoyez-nous une carte postale à votre arrivée",tr:"Oraya vardığında bize kartpostal gönder lütfen",ar:"من فضلك أرسل لنا بطاقة بريدية عند وصولك",zh:"到了请寄明信片给我们",ko:"도착하면 엽서 보내주세요",ja:"到着したらはがきを送ってください",hi:"जब आप वहाँ पहुँचें तो कृपया हमें पोस्टकार्ड भेजें",ga:"Seol cárta poist chugainn le do thoil nuair a shroicheann tú",uk:"Будь ласка, надішліть нам листівку, коли приїдете"}},
  {id:861,category:"goodbye",level:"A1",t:{fa:"خوب حالا من یک قرار ملاقات دارم",en:"Well I have an appointment now",de:"Nun, ich habe jetzt einen Termin",es:"Bueno, ahora tengo una cita",fr:"Eh bien, j'ai un rendez-vous maintenant",tr:"Pekala, şimdi bir randevum var",ar:"حسنًا، لدي موعد الآن",zh:"好吧，我现在有个约会",ko:"글쎄요, 지금 약속이 있어요",ja:"さて、今約束があります",hi:"खैर, मेरी अभी एक अपॉइंटमेंट है",ga:"Bhuel, tá coinne agam anois",uk:"Що ж, у мене зараз зустріч"}},
  {id:862,category:"goodbye",level:"A1",t:{fa:"امیدوارم بتوانیم دوباره یکدیگر را ببینیم",en:"I hope we can get together",de:"Ich hoffe, wir können uns wiedersehen",es:"Espero que podamos reunirnos de nuevo",fr:"J'espère que nous pourrons nous revoir",tr:"Umarım tekrar bir araya gelebiliriz",ar:"آمل أن نلتقي مجددًا",zh:"希望我们能再见面",ko:"다시 만날 수 있길 바랍니다",ja:"また会えることを願っています",hi:"मुझे उम्मीद है हम फिर मिल सकते हैं",ga:"Tá súil agam go bhfeicfimid a chéile arís",uk:"Сподіваюся, ми зможемо зустрітися знову"}},
  {id:863,category:"goodbye",level:"A1",t:{fa:"(هوا) در حال تاریک شدن است",en:"It's getting dark",de:"Es wird dunkel",es:"Se está haciendo de noche",fr:"Il commence à faire nuit",tr:"Hava kararıyor",ar:"بدأ الظلام يحل",zh:"天黑了",ko:"어두워지고 있어요",ja:"暗くなってきました",hi:"अंधेरा हो रहा है",ga:"Tá sé ag éirí dorcha",uk:"Темніє"}},
  {id:864,category:"telephone",level:"A1",t:{fa:"آیا این شماره ۶۵۴۳ - ۹۸۷ است؟",en:"Is that 9876543?",de:"Ist das 9876543?",es:"¿Es ese el 9876543?",fr:"Est-ce le 9876543 ?",tr:"Bu 9876543 mi?",ar:"هل هذا 9876543؟",zh:"是9876543吗？",ko:"9876543 맞나요?",ja:"9876543ですか？",hi:"क्या यह 9876543 है?",ga:"An é sin 9876543?",uk:"Це 9876543?"}},
  {id:865,category:"telephone",level:"A1",t:{fa:"سلام من جان هستم",en:"Hello. This is John",de:"Hallo. Hier ist John",es:"Hola. Soy John",fr:"Bonjour. C'est John",tr:"Merhaba. Ben John",ar:"مرحبًا. أنا جون",zh:"你好，我是约翰",ko:"안녕하세요. 존입니다",ja:"こんにちは、ジョンです",hi:"नमस्ते। मैं जॉन हूँ",ga:"Dia dhuit. Seo John",uk:"Привіт. Це Джон"}},
  {id:866,category:"telephone",level:"A1",t:{fa:"سلام جان صحبت میکند",en:"Hello. John here",de:"Hallo. John hier",es:"Hola. John al habla",fr:"Bonjour. John à l'appareil",tr:"Merhaba. John burada",ar:"مرحبًا. جون يتحدث",zh:"你好，我是约翰",ko:"안녕하세요. 존입니다",ja:"こんにちは、ジョンです",hi:"नमस्ते। जॉन यहाँ है",ga:"Dia dhuit. Seo John",uk:"Привіт. Джон на зв'язку"}},
  {id:867,category:"telephone",level:"A1",t:{fa:"سلام . اسمم داود است",en:"Hello. My name's David",de:"Hallo. Mein Name ist David",es:"Hola. Me llamo David",fr:"Bonjour. Je m'appelle David",tr:"Merhaba. Benim adım David",ar:"مرحبًا. اسمي داود",zh:"你好，我叫大卫",ko:"안녕하세요. 제 이름은 David입니다",ja:"こんにちは、私の名前はデイビッドです",hi:"नमस्ते। मेरा नाम डेविड है",ga:"Dia dhuit. Is é David mo ainm",uk:"Привіт. Мене звуть Девід"}},
  {id:868,category:"telephone",level:"A1",t:{fa:"سلام مری صحبت میکند",en:"Hello. This is Mary speaking",de:"Hallo. Hier spricht Mary",es:"Hola. Habla Mary",fr:"Bonjour. C'est Mary à l'appareil",tr:"Merhaba. Mary konuşuyor",ar:"مرحبًا. ماري تتحدث",zh:"你好，我是玛丽",ko:"안녕하세요. Mary입니다",ja:"こんにちは、メアリーです",hi:"नमस्ते। मैरी बोल रही हैं",ga:"Dia dhuit. Mary ag labhairt",uk:"Привіт. Мері говорить"}},
  {id:869,category:"telephone",level:"A1",t:{fa:"صبح بخیر. حسن صحبت می کند",en:"Good morning, Hassan speaking",de:"Guten Morgen, Hassan am Apparat",es:"Buenos días, habla Hassan",fr:"Bonjour, Hassan à l'appareil",tr:"Günaydın, Hassan konuşuyor",ar:"صباح الخير، حسن يتحدث",zh:"早上好，哈桑在说话",ko:"안녕하세요, Hassan입니다",ja:"おはようございます、ハッサンです",hi:"सुप्रभात, हसन बोल रहे हैं",ga:"Maidin mhaith, Hassan ag labhairt",uk:"Доброго ранку, Хассан говорить"}},
  {id:870,category:"telephone",level:"A1",t:{fa:"می توانم با بخش حسابداری صحبت کنم؟",en:"Could I speak to the accounting dept?",de:"Könnte ich mit der Buchhaltung sprechen?",es:"¿Podría hablar con el departamento de contabilidad?",fr:"Puis-je parler au service comptabilité ?",tr:"Muhasebe departmanıyla konuşabilir miyim?",ar:"هل يمكنني التحدث إلى قسم المحاسبة؟",zh:"我可以和会计部通话吗？",ko:"회계 부서와 통화할 수 있을까요?",ja:"経理部と話せますか？",hi:"क्या मैं अकाउंटिंग विभाग से बात कर सकता हूँ?",ga:"An bhféadfainn labhairt leis an Roinn Cuntasaíochta?",uk:"Можна мені поговорити з бухгалтерією?"}},
  {id:871,category:"telephone",level:"A1",t:{fa:"سلام آیا شما جان هستید؟",en:"Hello, Is that John?",de:"Hallo, ist da John?",es:"Hola, ¿es John?",fr:"Bonjour, est-ce John ?",tr:"Merhaba, John siz misiniz?",ar:"مرحبًا، هل أنت جون؟",zh:"你好，是约翰吗？",ko:"안녕하세요, John인가요?",ja:"こんにちは、ジョンですか？",hi:"नमस्ते, क्या आप जॉन हैं?",ga:"Dia dhuit, an tusa John?",uk:"Привіт, це Джон?"}},
  {id:872,category:"telephone",level:"A1",t:{fa:"لطفاً می توانم با «جیمز» صحبت کنم؟",en:"Can I speak to James, please?",de:"Kann ich bitte mit James sprechen?",es:"¿Puedo hablar con James, por favor?",fr:"Puis-je parler à James, s'il vous plaît ?",tr:"Lütfen James ile konuşabilir miyim?",ar:"هل يمكنني التحدث إلى جيمس من فضلك؟",zh:"我可以和詹姆斯通话吗？",ko:"James와 통화할 수 있을까요?",ja:"ジェームズと話せますか？",hi:"क्या मैं जेम्स से बात कर सकता हूँ?",ga:"An féidir liom labhairt le James le do thoil?",uk:"Можна мені поговорити з Джеймсом, будь ласка?"}},
  {id:873,category:"telephone",level:"A1",t:{fa:"لطفاً می توانم با «فرانک» صحبت کنم؟",en:"May I speak to Frank, please?",de:"Darf ich bitte mit Frank sprechen?",es:"¿Puedo hablar con Frank, por favor?",fr:"Puis-je parler à Frank, s'il vous plaît ?",tr:"Frank ile konuşabilir miyim lütfen?",ar:"هل يمكنني التحدث إلى فرانك من فضلك؟",zh:"我可以和弗兰克通话吗？",ko:"Frank와 통화할 수 있을까요?",ja:"フランクと話せますか？",hi:"क्या मैं फ्रैंक से बात कर सकता हूँ?",ga:"An bhféadfainn labhairt le Frank le do thoil?",uk:"Можна мені поговорити з Френком, будь ласка?"}},
  {id:874,category:"telephone",level:"A1",t:{fa:"لطفاً می توانم با «لیندا» حرف بزنم؟",en:"Could I talk to Linda, please?",de:"Könnte ich bitte mit Linda sprechen?",es:"¿Podría hablar con Linda, por favor?",fr:"Pourrais-je parler à Linda, s'il vous plaît ?",tr:"Linda ile konuşabilir miyim lütfen?",ar:"هل يمكنني التحدث إلى ليندا من فضلك؟",zh:"我可以和琳达说话吗？",ko:"Linda와 통화할 수 있을까요?",ja:"リンダと話せますか？",hi:"क्या मैं लिंडा से बात कर सकता हूँ?",ga:"An bhféadfainn labhairt le Linda le do thoil?",uk:"Можна мені поговорити з Ліндою, будь ласка?"}},
  {id:875,category:"telephone",level:"A1",t:{fa:"لطفاً ببینید آلیس آنجاست؟",en:"Is Alice there, please?",de:"Ist Alice da, bitte?",es:"¿Está Alice ahí, por favor?",fr:"Est-ce qu'Alice est là, s'il vous plaît ?",tr:"Alice orada mı lütfen?",ar:"هل أليس هناك من فضلك؟",zh:"请问爱丽丝在吗？",ko:"Alice 거기 있나요?",ja:"アリスはいますか？",hi:"क्या एलिस वहाँ हैं?",ga:"An bhfuil Alice ann le do thoil?",uk:"Аліса там, будь ласка?"}},
  {id:876,category:"telephone",level:"A1",t:{fa:"ممکن است اسمتان را بپرسم؟",en:"May I have your name?",de:"Darf ich Ihren Namen erfahren?",es:"¿Puedo saber su nombre?",fr:"Puis-je avoir votre nom ?",tr:"Adınızı alabilir miyim?",ar:"هل يمكنني معرفة اسمك؟",zh:"请问您叫什么名字？",ko:"성함이 어떻게 되세요?",ja:"お名前を伺ってもよろしいですか？",hi:"क्या मैं आपका नाम जान सकता हूँ?",ga:"An bhféadfainn d'ainm a fháil?",uk:"Можна дізнатися ваше ім'я?"}},
  {id:877,category:"telephone",level:"A1",t:{fa:"لطفاً شما که هستید؟ پشت تلفن",en:"Who's calling, please?",de:"Wer ruft an, bitte?",es:"¿Quién llama, por favor?",fr:"Qui est à l'appareil, s'il vous plaît ?",tr:"Kim arıyor lütfen?",ar:"من المتصل من فضلك؟",zh:"请问您是哪位？",ko:"누구세요?",ja:"どちら様ですか？",hi:"कौन बोल रहा है?",ga:"Cé atá ag glaoch le do thoil?",uk:"Хто телефонує, будь ласка?"}},
  {id:878,category:"telephone",level:"A1",t:{fa:"همین الان میبینم که آیا هست یا خیر",en:"I'll just see if she's in",de:"Ich schaue gleich, ob sie da ist",es:"Veré si está",fr:"Je vais voir si elle est là",tr:"Evde olup olmadığına bakayım",ar:"سأنظر إذا كانت موجودة",zh:"我去看看她在不在",ko:"그녀가 있는지 확인해 보겠습니다",ja:"彼女がいるかどうか見てみます",hi:"मैं देखता हूँ कि वह अंदर है या नहीं",ga:"Féachfaidh mé an bhfuil sí istigh",uk:"Я зараз подивлюся, чи вона тут"}},
  {id:879,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را داشته باشید",en:"Hold the line, please",de:"Bitte bleiben Sie am Apparat",es:"Por favor, no cuelgue",fr:"Ne quittez pas, s'il vous plaît",tr:"Lütfen hattı bekleyin",ar:"من فضلك لا تغلق الخط",zh:"请不要挂断",ko:"잠시만 기다려주세요",ja:"そのままお待ちください",hi:"कृपया लाइन पर रहें",ga:"Coinnigh an líne le do thoil",uk:"Будь ласка, тримайте лінію"}},
  {id:880,category:"telephone",level:"A1",t:{fa:"لطفاً یک دقیقه صبر کنید",en:"Hang on a moment, please",de:"Bitte einen Moment warten",es:"Espere un momento, por favor",fr:"Un instant, s'il vous plaît",tr:"Lütfen bir saniye bekleyin",ar:"من فضلك انتظر لحظة",zh:"请稍等",ko:"잠시만 기다려주세요",ja:"少々お待ちください",hi:"कृपया एक क्षण रुकें",ga:"Fan nóiméad le do thoil",uk:"Будь ласка, зачекайте хвилинку"}},
  {id:881,category:"telephone",level:"A1",t:{fa:"(خانه) نیست",en:"She's not in",de:"Sie ist nicht da",es:"No está",fr:"Elle n'est pas là",tr:"Evde değil",ar:"ليست موجودة",zh:"她不在",ko:"그녀는 없어요",ja:"彼女はいません",hi:"वह अंदर नहीं हैं",ga:"Níl sí istigh",uk:"Її немає"}},
  {id:882,category:"telephone",level:"A1",t:{fa:"متأسفانه بیرون است",en:"Sorry, but she's out",de:"Entschuldigung, aber sie ist nicht da",es:"Lo siento, pero no está",fr:"Désolé, mais elle n'est pas là",tr:"Üzgünüm ama dışarıda",ar:"آسف، لكنها خارجة",zh:"对不起，她出去了",ko:"죄송합니다만 그녀는 외출했어요",ja:"申し訳ありませんが、彼女は外出しています",hi:"क्षमा करें, लेकिन वह बाहर हैं",ga:"Tá brón orm, ach tá sí amuigh",uk:"Вибачте, але її немає"}},
  {id:883,category:"telephone",level:"A1",t:{fa:"فعلاً او از شهر بیرون رفته است",en:"He's out of town just now",de:"Er ist gerade verreist",es:"Está fuera de la ciudad",fr:"Il est en dehors de la ville actuellement",tr:"Şu an şehir dışında",ar:"إنه خارج المدينة الآن",zh:"他刚出城了",ko:"그는 지금 도시에 없어요",ja:"彼は今、町を離れています",hi:"वह अभी शहर से बाहर हैं",ga:"Tá sé as baile anois",uk:"Він зараз не в місті"}},
  {id:884,category:"telephone",level:"A1",t:{fa:"او همین حالا بیرون رفته است",en:"He/She has just gone out",de:"Er/Sie ist gerade ausgegangen",es:"Acaba de salir",fr:"Il/Elle vient de sortir",tr:"Az önce dışarı çıktı",ar:"لقد خرج للتو/خرجت للتو",zh:"他/她刚出去",ko:"그/그녀가 방금 나갔어요",ja:"彼/彼女はちょうど出かけました",hi:"वह अभी-अभी बाहर गए/गई हैं",ga:"Tá sé/sí tar éis dul amach",uk:"Він/Вона щойно вийшов/вийшла"}},
  {id:885,category:"telephone",level:"A1",t:{fa:"متأسفانه کسی به این اسم این جا نیست",en:"I'm afraid there's no one of that name here",de:"Es tut mir leid, aber es gibt hier niemanden mit diesem Namen",es:"Me temo que no hay nadie con ese nombre aquí",fr:"Je crains qu'il n'y ait personne de ce nom ici",tr:"Maalesef burada o isimde biri yok",ar:"أخشى أنه لا يوجد أحد بهذا الاسم هنا",zh:"恐怕这里没有叫这个名字的人",ko:"죄송하지만 그 이름의 분은 여기 없어요",ja:"申し訳ありませんが、その名前の方はいらっしゃいません",hi:"मुझे डर है कि यहाँ इस नाम का कोई नहीं है",ga:"Tá eagla orm nach bhfuil aon duine den ainm sin anseo",uk:"Боюся, що тут немає нікого з таким ім'ям"}},
  {id:886,category:"telephone",level:"A1",t:{fa:"متأسفانه این شماره عوض شده است",en:"Sorry, but the number's been changed",de:"Entschuldigung, aber die Nummer wurde geändert",es:"Lo siento, pero el número ha cambiado",fr:"Désolé, mais le numéro a été changé",tr:"Üzgünüm ama numara değişti",ar:"آسف، لكن الرقم تغير",zh:"对不起，这个号码已更改",ko:"죄송합니다만 번호가 변경되었어요",ja:"申し訳ありませんが、その番号は変更されました",hi:"क्षमा करें, लेकिन नंबर बदल गया है",ga:"Tá brón orm, ach athraíodh an uimhir",uk:"Вибачте, але номер змінено"}},
  {id:887,category:"telephone",level:"A1",t:{fa:"متأسفانه، شماره شما اشتباه است",en:"Sorry, you have the wrong number",de:"Entschuldigung, Sie haben die falsche Nummer",es:"Lo siento, tiene el número equivocado",fr:"Désolé, vous avez le mauvais numéro",tr:"Üzgünüm, yanlış numara",ar:"آسف، لديك الرقم الخطأ",zh:"对不起，你打错号码了",ko:"죄송합니다, 잘못된 번호예요",ja:"申し訳ありませんが、番号をお間違えです",hi:"क्षमा करें, आपका नंबर गलत है",ga:"Tá brón orm, tá an uimhir mícheart agat",uk:"Вибачте, у вас неправильний номер"}},
  {id:888,category:"telephone",level:"A1",t:{fa:"متأسفانه شماره داخلی ای که گرفته اید اشتباه است",en:"I'm afraid you have the wrong extension",de:"Ich fürchte, Sie haben die falsche Durchwahl",es:"Me temo que tiene la extensión equivocada",fr:"Je crains que vous ayez le mauvais poste",tr:"Maalesef yanlış dahili numarayı çevirdiniz",ar:"أخشى أن لديك المقسم الخاطئ",zh:"恐怕你打错分机号了",ko:"죄송합니다만 잘못된 내선 번호예요",ja:"内線番号をお間違えのようです",hi:"मुझे डर है कि आपका एक्सटेंशन गलत है",ga:"Tá eagla orm go bhfuil an síneadh mícheart agat",uk:"Боюся, у вас неправильний додатковий номер"}},
  {id:889,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را نگه دارید تا سعی کنم وصلتان کنم",en:"Hold the line and I'll try to transfer you",de:"Bleiben Sie am Apparat, ich versuche Sie durchzustellen",es:"No cuelgue, intentaré transferirle",fr:"Ne quittez pas, je vais essayer de vous transférer",tr:"Hattı bekleyin, sizi bağlamaya çalışayım",ar:"لا تغلق الخط، سأحاول تحويلك",zh:"请不要挂断，我试着转接",ko:"잠시만 기다려주세요, 연결해 드리겠습니다",ja:"お待ちください、接続を試みます",hi:"लाइन पर रहें, मैं आपको ट्रांसफर करने की कोशिश करता हूँ",ga:"Coinnigh an líne agus déanfaidh mé iarracht tú a chur ar aghaidh",uk:"Тримайте лінію, я спробую вас переключити"}},
  {id:890,category:"telephone",level:"A1",t:{fa:"متأسفم، خانم بران الان در کنفرانس است",en:"I'm sorry. Mrs. Brown is in conference right now",de:"Es tut mir leid. Frau Brown ist gerade in einer Konferenz",es:"Lo siento. La Sra. Brown está en una reunión ahora mismo",fr:"Je suis désolé. Mme Brown est en conférence actuellement",tr:"Üzgünüm. Bayan Brown şu anda konferansta",ar:"آسف. السيدة براون في مؤتمر الآن",zh:"对不起，布朗夫人正在开会",ko:"죄송합니다. Brown 부인은 지금 회의 중이에요",ja:"申し訳ありません。ブラウン夫人は会議中です",hi:"मुझे खेद है। श्रीमती ब्राउन अभी कॉन्फ्रेंस में हैं",ga:"Tá brón orm. Tá Bean Brown i gcomhdháil anois",uk:"Мені шкода. Пані Браун зараз на конференції"}},
  {id:891,category:"telephone",level:"A1",t:{fa:"متأسفم، حالا در جلسه است",en:"I'm sorry, He is in a meeting at the moment",de:"Es tut mir leid, er ist gerade in einer Besprechung",es:"Lo siento, está en una reunión en este momento",fr:"Je suis désolé, il est en réunion pour le moment",tr:"Üzgünüm, şu anda toplantıda",ar:"آسف، إنه في اجتماع الآن",zh:"对不起，他现在正在开会",ko:"죄송합니다, 그는 지금 회의 중이에요",ja:"申し訳ありませんが、彼はただ今会議中です",hi:"मुझे खेद है, वह इस समय मीटिंग में हैं",ga:"Tá brón orm, tá sé i gcruinniú faoi láthair",uk:"Мені шкода, він зараз на зустрічі"}},
  {id:892,category:"telephone",level:"A1",t:{fa:"متأسفانه الان با یک تلفن دیگر صحبت می کند",en:"I'm afraid, she's on another line just now",de:"Ich fürchte, sie spricht gerade auf einer anderen Leitung",es:"Me temo que está en otra línea",fr:"Je crains qu'elle ne soit sur une autre ligne",tr:"Maalesef şu anda başka bir hatta",ar:"أخشى أنها على خط آخر الآن",zh:"恐怕她现在正在通另一个电话",ko:"죄송합니다만 그녀는 지금 다른 전화를 받고 있어요",ja:"申し訳ありませんが、彼女は別の電話に出ています",hi:"मुझे डर है कि वह अभी दूसरी लाइन पर हैं",ga:"Tá eagla orm, tá sí ar líne eile anois",uk:"Боюся, вона зараз на іншій лінії"}},
  {id:893,category:"telephone",level:"A1",t:{fa:"متأسفم، علی الان مشغول است",en:"I'm sorry, Ali is busy at the moment",de:"Es tut mir leid, Ali ist gerade beschäftigt",es:"Lo siento, Ali está ocupado en este momento",fr:"Je suis désolé, Ali est occupé pour l'instant",tr:"Üzgünüm, Ali şu anda meşgul",ar:"آسف، علي مشغول الآن",zh:"对不起，阿里现在很忙",ko:"죄송합니다, Ali는 지금 바쁩니다",ja:"申し訳ありませんが、アリはただ今忙しいです",hi:"मुझे खेद है, अली इस समय व्यस्त हैं",ga:"Tá brón orm, tá Ali gnóthach faoi láthair",uk:"Мені шкода, Алі зараз зайнятий"}},
  {id:894,category:"telephone",level:"A1",t:{fa:"متأسفم، حالا گرفتار است",en:"Sorry, He's tied up at the moment",de:"Entschuldigung, er ist gerade beschäftigt",es:"Lo siento, está atareado en este momento",fr:"Désolé, il est occupé pour le moment",tr:"Üzgünüm, şu anda meşgul",ar:"آسف، إنه مشغول الآن",zh:"对不起，他现在正忙着",ko:"죄송합니다, 그는 지금 바빠요",ja:"申し訳ありませんが、彼は今手が離せません",hi:"क्षमा करें, वह इस समय व्यस्त हैं",ga:"Tá brón orm, tá sé gnóthach faoi láthair",uk:"Вибачте, він зараз зайнятий"}},
  {id:895,category:"telephone",level:"A1",t:{fa:"آیا می توانید بعداً تلفن بزنید؟",en:"Can you call back?",de:"Können Sie später zurückrufen?",es:"¿Puede llamar más tarde?",fr:"Pouvez-vous rappeler plus tard ?",tr:"Daha sonra arayabilir misiniz?",ar:"هل يمكنك الاتصال مجددًا لاحقًا؟",zh:"你能稍后再打吗？",ko:"나중에 다시 전화해 주실 수 있나요?",ja:"後でかけ直していただけますか？",hi:"क्या आप बाद में फोन कर सकते हैं?",ga:"An féidir leat glaoch ar ais?",uk:"Можете передзвонити пізніше?"}},
  {id:896,category:"telephone",level:"A1",t:{fa:"خط (تلفن) خراب است",en:"It's a bad line",de:"Die Leitung ist schlecht",es:"La línea es mala",fr:"La ligne est mauvaise",tr:"Hat kötü",ar:"الخط سيء",zh:"线路不好",ko:"통화 품질이 안 좋아요",ja:"回線が悪いです",hi:"लाइन खराब है",ga:"Líne dona",uk:"Погана лінія"}},
  {id:897,category:"telephone",level:"A1",t:{fa:"می توانید قدری بلندتر صحبت کنید؟",en:"Can you speak a bit louder?",de:"Können Sie etwas lauter sprechen?",es:"¿Puede hablar un poco más alto?",fr:"Pouvez-vous parler un peu plus fort ?",tr:"Biraz daha yüksek sesle konuşabilir misiniz?",ar:"هل يمكنك التحدث بصوت أعلى قليلاً؟",zh:"你能说大声一点吗？",ko:"조금 더 크게 말씀해 주실 수 있나요?",ja:"もう少し大きい声で話していただけますか？",hi:"क्या आप थोड़ा ऊँचा बोल सकते हैं?",ga:"An féidir leat labhairt beagán níos airde?",uk:"Можете говорити трохи голосніше?"}},
  {id:898,category:"telephone",level:"A1",t:{fa:"ارتباط تلفنی خراب است",en:"It's a bad connection",de:"Die Verbindung ist schlecht",es:"La conexión es mala",fr:"La connexion est mauvaise",tr:"Bağlantı kötü",ar:"الاتصال سيء",zh:"连接不好",ko:"연결 상태가 안 좋아요",ja:"接続が悪いです",hi:"कनेक्शन खराब है",ga:"Droch-cheangal",uk:"Погане з'єднання"}},
  {id:899,category:"telephone",level:"A1",t:{fa:"می توانید گوشی را بگذارید و دوباره تلفن کنید؟",en:"Can you hang up and call back?",de:"Können Sie auflegen und zurückrufen?",es:"¿Puede colgar y llamar de nuevo?",fr:"Pouvez-vous raccrocher et rappeler ?",tr:"Kapatıp tekrar arayabilir misiniz?",ar:"هل يمكنك إغلاق الخط ومعاودة الاتصال؟",zh:"你能挂断再打吗？",ko:"끊고 다시 전화해 주실 수 있나요?",ja:"切ってからかけ直していただけますか？",hi:"क्या आप फोन काटकर फिर से कॉल कर सकते हैं?",ga:"An féidir leat crochadh agus glaoch ar ais?",uk:"Можете покласти трубку і передзвонити?"}},
  {id:900,category:"telephone",level:"A1",t:{fa:"ارتباط تلفنی ما خراب است",en:"We have a bad connection",de:"Wir haben eine schlechte Verbindung",es:"Tenemos mala conexión",fr:"Nous avons une mauvaise connexion",tr:"Kötü bir bağlantımız var",ar:"لدينا اتصال سيء",zh:"我们的连接不好",ko:"연결 상태가 안 좋아요",ja:"接続が悪いです",hi:"हमारा कनेक्शन खराब है",ga:"Tá droch-cheangal againn",uk:"У нас погане з'єднання"}},
  {id:901,category:"telephone",level:"A1",t:{fa:"چه وقت آزاد می شود؟",en:"When will he be free?",de:"Wann wird er frei sein?",es:"¿Cuándo estará libre?",fr:"Quand sera-t-il libre ?",tr:"Ne zaman müsait olacak?",ar:"متى سيكون متفرغًا؟",zh:"他什么时候有空？",ko:"언제 자유로워질까요?",ja:"彼はいつ空きますか？",hi:"वह कब खाली होंगे?",ga:"Cathain a bheidh sé saor?",uk:"Коли він буде вільний?"}},
  {id:902,category:"telephone",level:"A1",t:{fa:"انتظار دارید کی برگردد؟",en:"When do you expect him back?",de:"Wann erwarten Sie ihn zurück?",es:"¿Cuándo espera que regrese?",fr:"Quand l'attendez-vous de retour ?",tr:"Ne zaman döneceğini tahmin ediyorsunuz?",ar:"متى تتوقعون عودته؟",zh:"你预计他什么时候回来？",ko:"언제 돌아올 것 같으세요?",ja:"彼はいつ戻るとお考えですか？",hi:"आप उसके वापस आने की कब उम्मीद करते हैं?",ga:"Cathain a bhfuil súil agat go dtiocfaidh sé ar ais?",uk:"Коли ви очікуєте його повернення?"}},
  {id:903,category:"telephone",level:"A1",t:{fa:"چه ساعتی بر می گردد؟",en:"What time he'll/she'll be back?",de:"Wann kommt er/sie zurück?",es:"¿A qué hora vuelve?",fr:"À quelle heure sera-t-il/elle de retour ?",tr:"Saat kaçta dönecek?",ar:"في أي ساعة سيعود/ستعود؟",zh:"他/她什么时候回来？",ko:"몇 시에 돌아오나요?",ja:"何時に戻りますか？",hi:"वह किस समय वापस आएंगे/आएंगी?",ga:"Cén t-am a thiocfaidh sé/sí ar ais?",uk:"О котрій годині він/вона повернеться?"}},
  {id:904,category:"telephone",level:"A1",t:{fa:"آیا میدانید چه وقت بر می گردد؟",en:"Do you know when he'll be back?",de:"Wissen Sie, wann er zurückkommt?",es:"¿Sabe cuándo volverá?",fr:"Savez-vous quand il reviendra ?",tr:"Ne zaman döneceğini biliyor musunuz?",ar:"هل تعرف متى سيعود؟",zh:"你知道他什么时候回来吗？",ko:"그가 언제 돌아올지 아시나요?",ja:"彼がいつ戻るかご存知ですか？",hi:"क्या आप जानते हैं कि वह कब वापस आएंगे?",ga:"An bhfuil a fhios agat cathain a thiocfaidh sé ar ais?",uk:"Чи знаєте ви, коли він повернеться?"}},
  {id:905,category:"telephone",level:"A1",t:{fa:"گفت هفته بعد بر می گردد",en:"He said he'll be back next week",de:"Er sagte, er kommt nächste Woche zurück",es:"Dijo que volvería la próxima semana",fr:"Il a dit qu'il reviendrait la semaine prochaine",tr:"Gelecek hafta döneceğini söyledi",ar:"قال إنه سيعود الأسبوع القادم",zh:"他说他下周回来",ko:"그는 다음 주에 돌아온다고 했어요",ja:"彼は来週戻ると言っていました",hi:"उन्होंने कहा कि वह अगले हफ्ते वापस आएंगे",ga:"Dúirt sé go dtiocfaidh sé ar ais an tseachtain seo chugainn",uk:"Він сказав, що повернеться наступного тижня"}},
  {id:906,category:"telephone",level:"A1",t:{fa:"فکر میکنم (فردا) بر می گردد",en:"I think he'll be back tomorrow",de:"Ich denke, er kommt morgen zurück",es:"Creo que vuelve mañana",fr:"Je pense qu'il reviendra demain",tr:"Yarın döneceğini düşünüyorum",ar:"أعتقد أنه سيعود غدًا",zh:"我想他明天回来",ko:"그가 내일 돌아올 것 같아요",ja:"彼は明日戻ると思います",hi:"मुझे लगता है कि वह कल वापस आएंगे",ga:"Sílim go dtiocfaidh sé ar ais amárach",uk:"Я думаю, він повернеться завтра"}},
  {id:907,category:"telephone",level:"A1",t:{fa:"امروز عصر باید برگردد",en:"She should be back this afternoon",de:"Sie sollte heute Nachmittag zurück sein",es:"Debería volver esta tarde",fr:"Elle devrait revenir cet après-midi",tr:"Bu öğleden sonra dönmeli",ar:"يجب أن تعود بعد الظهر اليوم",zh:"她应该今天下午回来",ko:"그녀는 오늘 오후에 돌아올 거예요",ja:"彼女は今日の午後に戻るはずです",hi:"उसे आज दोपहर में वापस आना चाहिए",ga:"Ba chóir di a bheith ar ais tráthnóna inniu",uk:"Вона має повернутися сьогодні вдень"}},
  {id:908,category:"telephone",level:"A1",t:{fa:"احتمالاً ساعت ۴ بر می گردد",en:"He'll probably be back at 4 o'clock",de:"Er wird wahrscheinlich um 4 Uhr zurück sein",es:"Probablemente volverá a las 4",fr:"Il reviendra probablement à 4 heures",tr:"Muhtemelen saat 4'te döner",ar:"من المحتمل أن يعود الساعة 4",zh:"他可能在4点回来",ko:"그는 아마 4시에 돌아올 거예요",ja:"彼はおそらく4時に戻ります",hi:"वह शायद 4 बजे वापस आएंगे",ga:"Is dócha go mbeidh sé ar ais ag 4 a chlog",uk:"Він, ймовірно, повернеться о 4 годині"}},
  {id:909,category:"telephone",level:"A1",t:{fa:"من ساعت ۵ بعد از ظهر انتظارش را دارم",en:"I expect him back at 5:00 PM",de:"Ich erwarte ihn um 17:00 Uhr zurück",es:"Lo espero a las 17:00",fr:"Je l'attends à 17h00",tr:"Onu saat 17:00'de bekliyorum",ar:"أتوقعه الساعة 5 مساءً",zh:"我期待他下午5点回来",ko:"오후 5시에 돌아올 거라 기대합니다",ja:"午後5時に戻ると期待しています",hi:"मुझे उसके शाम 5 बजे वापस आने की उम्मीद है",ga:"Táim ag súil leis ar ais ag 5:00 i.n.",uk:"Я очікую його о 17:00"}},
  {id:910,category:"telephone",level:"A1",t:{fa:"روز (دوشنبه) بر می گردد",en:"She will be back on Monday",de:"Sie wird am Montag zurück sein",es:"Volverá el lunes",fr:"Elle reviendra lundi",tr:"Pazartesi günü dönecek",ar:"ستعود يوم الاثنين",zh:"她星期一回来",ko:"그녀는 월요일에 돌아옵니다",ja:"彼女は月曜日に戻ります",hi:"वह सोमवार को वापस आएंगी",ga:"Beidh sí ar ais Dé Luain",uk:"Вона повернеться в понеділок"}},
  {id:911,category:"telephone",level:"A1",t:{fa:"متأسفانه هیچ اطلاعی ندارم",en:"Sorry, I have no idea",de:"Entschuldigung, ich habe keine Ahnung",es:"Lo siento, no tengo idea",fr:"Désolé, je n'en ai aucune idée",tr:"Üzgünüm, hiçbir fikrim yok",ar:"آسف، ليس لدي أي فكرة",zh:"对不起，我不知道",ko:"죄송합니다, 전혀 모르겠어요",ja:"申し訳ありませんが、全く分かりません",hi:"क्षमा करें, मुझे कोई जानकारी नहीं है",ga:"Tá brón orm, níl aon smaoineamh agam",uk:"Вибачте, я не маю уявлення"}},
  {id:912,category:"telephone",level:"A1",t:{fa:"متأسفم. نمی دانم",en:"Sorry, I don't know",de:"Entschuldigung, ich weiß nicht",es:"Lo siento, no lo sé",fr:"Désolé, je ne sais pas",tr:"Üzgünüm, bilmiyorum",ar:"آسف، لا أعرف",zh:"对不起，我不知道",ko:"죄송합니다, 몰라요",ja:"申し訳ありませんが、知りません",hi:"क्षमा करें, मुझे नहीं पता",ga:"Tá brón orm, níl a fhios agam",uk:"Вибачте, я не знаю"}},
  {id:913,category:"telephone",level:"A1",t:{fa:"ساعت ۳/۵ از کارش فارغ میشود",en:"She'll be free at 3:30",de:"Sie wird um 15:30 Uhr frei sein",es:"Estará libre a las 3:30",fr:"Elle sera libre à 15h30",tr:"Saat 15:30'da müsait olacak",ar:"ستكون متفرغة الساعة 3:30",zh:"她3点半会有空",ko:"그녀는 3시 30분에 자유로워질 거예요",ja:"彼女は3時30分に空きます",hi:"वह 3:30 पर खाली होंगी",ga:"Beidh sí saor ag 3:30",uk:"Вона буде вільною о 15:30"}},
  {id:914,category:"telephone",level:"A1",t:{fa:"امروز بعد از ظهر از کارش فارغ میشود",en:"He should be available this afternoon",de:"Er sollte heute Nachmittag verfügbar sein",es:"Debería estar disponible esta tarde",fr:"Il devrait être disponible cet après-midi",tr:"Bu öğleden sonra müsait olmalı",ar:"يجب أن يكون متفرغًا بعد الظهر اليوم",zh:"他今天下午应该有空",ko:"그는 오늘 오후에 시간이 있을 거예요",ja:"彼は今日の午後には都合がつくはずです",hi:"उसे आज दोपहर में उपलब्ध होना चाहिए",ga:"Ba chóir go mbeadh sé ar fáil tráthnóna inniu",uk:"Він має бути доступним сьогодні вдень"}},
  {id:915,category:"telephone",level:"A1",t:{fa:"ظرف یک ساعت کارش تمام میشود",en:"He'll be finished in an hour",de:"Er wird in einer Stunde fertig sein",es:"Terminará en una hora",fr:"Il aura fini dans une heure",tr:"Bir saat içinde işi biter",ar:"سيكون قد انتهى خلال ساعة",zh:"他一小时内会结束",ko:"그는 한 시간 안에 끝날 거예요",ja:"彼は1時間で終わります",hi:"वह एक घंटे में खत्म हो जाएंगे",ga:"Beidh sé críochnaithe i gceann uair an chloig",uk:"Він закінчить через годину"}},
  {id:916,category:"telephone",level:"A1",t:{fa:"ممکن است بگویید راجع به چیست؟",en:"Could you tell me what's it about?",de:"Könnten Sie mir sagen, worum es geht?",es:"¿Podría decirme de qué se trata?",fr:"Pourriez-vous me dire de quoi il s'agit ?",tr:"Ne hakkında olduğunu söyleyebilir misiniz?",ar:"هل يمكنك أن تخبرني ما هو الموضوع؟",zh:"你能告诉我这是关于什么吗？",ko:"무슨 내용인지 말씀해 주실 수 있나요?",ja:"何についてか教えていただけますか？",hi:"क्या आप मुझे बता सकते हैं कि यह किस बारे में है?",ga:"An bhféadfá a insint dom cad é atá ann?",uk:"Можете сказати мені, про що це?"}},
  {id:917,category:"telephone",level:"A1",t:{fa:"آیا می خواهید پیغامی بگذارید؟",en:"Would you like to leave a message?",de:"Möchten Sie eine Nachricht hinterlassen?",es:"¿Quiere dejar un recado?",fr:"Souhaitez-vous laisser un message ?",tr:"Mesaj bırakmak ister misiniz?",ar:"هل ترغب في ترك رسالة؟",zh:"您要留言吗？",ko:"메시지를 남기시겠어요?",ja:"メッセージを残されますか？",hi:"क्या आप एक संदेश छोड़ना चाहेंगे?",ga:"Ar mhaith leat teachtaireacht a fhágáil?",uk:"Бажаєте залишити повідомлення?"}},
  {id:918,category:"telephone",level:"A1",t:{fa:"می خواهید پیغامی به او بدهم؟",en:"Can I give him a message?",de:"Kann ich ihm eine Nachricht ausrichten?",es:"¿Puedo darle un recado?",fr:"Puis-je lui donner un message ?",tr:"Ona bir mesaj iletebilir miyim?",ar:"هل يمكنني إيصال رسالة إليه؟",zh:"我可以给他捎个口信吗？",ko:"그에게 메시지를 전해드릴까요?",ja:"彼に伝言をお伝えしましょうか？",hi:"क्या मैं उन्हें एक संदेश दे सकता हूँ?",ga:"An féidir liom teachtaireacht a thabhairt dó?",uk:"Можна передати йому повідомлення?"}},
  {id:919,category:"telephone",level:"A1",t:{fa:"خانم اسمیت صحبت میکند",en:"This is Mrs. Smith calling",de:"Hier spricht Frau Smith",es:"Habla la Sra. Smith",fr:"C'est Mme Smith à l'appareil",tr:"Bayan Smith arıyor",ar:"السيدة سميث تتصل",zh:"我是史密斯夫人",ko:"Smith 부인입니다",ja:"スミス夫人です",hi:"श्रीमती स्मिथ बोल रही हैं",ga:"Is í Bean Smith atá ag glaoch",uk:"Телефонує пані Сміт"}},
  {id:920,category:"telephone",level:"A1",t:{fa:"می توانم پیغامی بگذارم؟",en:"Can I leave a message?",de:"Kann ich eine Nachricht hinterlassen?",es:"¿Puedo dejar un recado?",fr:"Puis-je laisser un message ?",tr:"Mesaj bırakabilir miyim?",ar:"هل يمكنني ترك رسالة؟",zh:"我可以留言吗？",ko:"메시지를 남겨도 될까요?",ja:"メッセージを残してもよろしいですか？",hi:"क्या मैं एक संदेश छोड़ सकता हूँ?",ga:"An féidir liom teachtaireacht a fhágáil?",uk:"Можна залишити повідомлення?"}},
  {id:921,category:"telephone",level:"A1",t:{fa:"ممکن است پیغامی بگذارم؟",en:"May I leave a message?",de:"Darf ich eine Nachricht hinterlassen?",es:"¿Puedo dejar un recado?",fr:"Puis-je laisser un message ?",tr:"Mesaj bırakabilir miyim?",ar:"هل يمكنني ترك رسالة؟",zh:"我可以留言吗？",ko:"메시지를 남겨도 될까요?",ja:"メッセージを残してもよろしいでしょうか？",hi:"क्या मैं एक संदेश छोड़ सकता हूँ?",ga:"An bhféadfainn teachtaireacht a fhágáil?",uk:"Можна залишити повідомлення?"}},
  {id:922,category:"telephone",level:"A1",t:{fa:"آیا می توانید پیغام مرا یادداشت کنید؟",en:"Could you take a message?",de:"Könnten Sie eine Nachricht aufnehmen?",es:"¿Podría tomar un recado?",fr:"Pourriez-vous prendre un message ?",tr:"Mesajımı alabilir misiniz?",ar:"هل يمكنك تدوين رسالتي؟",zh:"你能帮我记个口信吗？",ko:"메시지를 받아 주실 수 있나요?",ja:"メッセージを承っていただけますか？",hi:"क्या आप मेरा संदेश लिख सकते हैं?",ga:"An bhféadfá teachtaireacht a ghlacadh?",uk:"Можете записати моє повідомлення?"}},
  {id:923,category:"telephone",level:"A1",t:{fa:"ممکن است به او بگویید من تلفن کردم؟",en:"Would you tell her I called?",de:"Würden Sie ihr sagen, dass ich angerufen habe?",es:"¿Le diría que he llamado?",fr:"Voulez-vous lui dire que j'ai appelé ?",tr:"Aradığımı söyler misiniz?",ar:"هل تخبرها أنني اتصلت؟",zh:"你能告诉她我打过电话吗？",ko:"제가 전화했다고 그녀에게 전해 주실 수 있나요?",ja:"私が電話したと彼女にお伝えいただけますか？",hi:"क्या आप उन्हें बताएंगी कि मैंने फोन किया था?",ga:"An n-inseofa dá sí go ndearna mé glaoch?",uk:"Ви скажете їй, що я телефонував?"}},
  {id:924,category:"telephone",level:"A1",t:{fa:"ممکن است از او بخواهید دوباره تلفن کند؟",en:"Would you ask her to call back?",de:"Würden Sie sie bitten, zurückzurufen?",es:"¿Le pediría que devuelva la llamada?",fr:"Voulez-vous lui demander de rappeler ?",tr:"Geri aramasını rica eder misiniz?",ar:"هل تطلب منها معاودة الاتصال؟",zh:"你能让她回电话吗？",ko:"그녀에게 다시 전화해 달라고 부탁해 주실 수 있나요?",ja:"彼女に折り返し電話するようお伝えいただけますか？",hi:"क्या आप उनसे कहेंगी कि वापस फोन करें?",ga:"An iarrfá uirthi glaoch ar ais?",uk:"Ви попросите її передзвонити?"}},
  {id:925,category:"telephone",level:"A1",t:{fa:"ممکن است از او بخواهید به من تلفن کند؟",en:"Would you ask her to call me?",de:"Würden Sie sie bitten, mich anzurufen?",es:"¿Le pediría que me llame?",fr:"Voulez-vous lui demander de m'appeler ?",tr:"Beni aramasını rica eder misiniz?",ar:"هل تطلب منها الاتصال بي؟",zh:"你能让她给我打电话吗？",ko:"그녀에게 제게 전화해 달라고 부탁해 주실 수 있나요?",ja:"彼女に私に電話するようお伝えいただけますか？",hi:"क्या आप उनसे मुझे फोन करने को कहेंगी?",ga:"An iarrfá uirthi glaoch orm?",uk:"Ви попросите її зателефонувати мені?"}},
  {id:926,category:"telephone",level:"A1",t:{fa:"ممکن است از او بخواهید وقتی برگشت به من تلفن کند؟",en:"Can you tell her to call me when she gets back?",de:"Können Sie ihr sagen, dass sie mich zurückrufen soll, wenn sie zurückkommt?",es:"¿Puede decirle que me llame cuando vuelva?",fr:"Pouvez-vous lui dire de m'appeler quand elle revient ?",tr:"Geri döndüğünde beni aramasını söyler misiniz?",ar:"هل تخبرها أن تتصل بي عند عودتها؟",zh:"你能告诉她回来时给我打电话吗？",ko:"그녀가 돌아오면 제게 전화하라고 전해 주실 수 있나요?",ja:"彼女が戻ったら私に電話するようお伝えいただけますか？",hi:"क्या आप उन्हें बता सकते हैं कि जब वह वापस आएं तो मुझे फोन करें?",ga:"An féidir leat a rá léi glaoch orm nuair a thiocfaidh sí ar ais?",uk:"Можете сказати їй зателефонувати мені, коли вона повернеться?"}},
  {id:927,category:"telephone",level:"A1",t:{fa:"مایلید پیغامی بگذارید؟",en:"Would you like to leave a message?",de:"Möchten Sie eine Nachricht hinterlassen?",es:"¿Quiere dejar un recado?",fr:"Souhaitez-vous laisser un message ?",tr:"Mesaj bırakmak ister misiniz?",ar:"هل ترغب في ترك رسالة؟",zh:"您要留言吗？",ko:"메시지를 남기시겠어요?",ja:"メッセージを残されますか？",hi:"क्या आप एक संदेश छोड़ना चाहेंगे?",ga:"Ar mhaith leat teachtaireacht a fhágáil?",uk:"Бажаєте залишити повідомлення?"}},
  {id:928,category:"telephone",level:"A1",t:{fa:"ممکن است پیغامتان را بگیرم؟",en:"May I take a message?",de:"Darf ich eine Nachricht entgegennehmen?",es:"¿Puedo tomar un recado?",fr:"Puis-je prendre un message ?",tr:"Mesajınızı alabilir miyim?",ar:"هل يمكنني أخذ رسالتك؟",zh:"我可以帮你留言吗？",ko:"메시지를 받아도 될까요?",ja:"メッセージをお預かりしてもよろしいですか？",hi:"क्या मैं आपका संदेश ले सकता हूँ?",ga:"An féidir liom teachtaireacht a ghlacadh?",uk:"Можна прийняти ваше повідомлення?"}},
  {id:929,category:"telephone",level:"A1",t:{fa:"می توانم پیغامتان را بگیرم؟",en:"Can I take a message?",de:"Kann ich eine Nachricht aufnehmen?",es:"¿Puedo tomar un recado?",fr:"Puis-je prendre un message ?",tr:"Mesajınızı alabilir miyim?",ar:"هل يمكنني أخذ رسالتك؟",zh:"我可以帮你留言吗？",ko:"메시지를 받아도 될까요?",ja:"メッセージをお預かりしましょうか？",hi:"क्या मैं आपका संदेश ले सकता हूँ?",ga:"An féidir liom teachtaireacht a ghlacadh?",uk:"Можна записати ваше повідомлення?"}},
  {id:930,category:"telephone",level:"A1",t:{fa:"البته. لطفاً بگویید تلفن کردم",en:"Of course, please tell him I called",de:"Natürlich, sagen Sie ihm bitte, dass ich angerufen habe",es:"Claro, por favor dígale que llamé",fr:"Bien sûr, dites-lui que j'ai appelé",tr:"Tabii, lütfen aradığımı söyleyin",ar:"بالطبع، من فضلك أخبره أنني اتصلت",zh:"当然，请告诉他我打过电话",ko:"물론이죠, 제가 전화했다고 전해주세요",ja:"もちろん、私が電話したとお伝えください",hi:"बिल्कुल, कृपया उन्हें बताएं कि मैंने फोन किया था",ga:"Ar ndóigh, abair leis le do thoil gur ghlaoigh mé",uk:"Звичайно, будь ласка, скажіть йому, що я телефонував"}},
  {id:931,category:"telephone",level:"A1",t:{fa:"بله. لطفاً بگویید به من تلفن کند",en:"Yes, please tell him to call me",de:"Ja, sagen Sie ihm bitte, er soll mich anrufen",es:"Sí, por favor dígale que me llame",fr:"Oui, dites-lui de m'appeler",tr:"Evet, lütfen beni aramasını söyleyin",ar:"نعم، من فضلك أخبره أن يتصل بي",zh:"是的，请告诉他给我打电话",ko:"네, 제게 전화하라고 전해주세요",ja:"はい、私に電話するようお伝えください",hi:"हाँ, कृपया उन्हें मुझे फोन करने को कहें",ga:"Sea, abair leis glaoch orm le do thoil",uk:"Так, будь ласка, скажіть йому зателефонувати мені"}},
  {id:932,category:"telephone",level:"A1",t:{fa:"نه متشکرم. خودم بعداً تلفن میکنم",en:"No, thank you. I'll call him later",de:"Nein, danke. Ich rufe ihn später an",es:"No, gracias. Llamaré más tarde",fr:"Non, merci. Je l'appellerai plus tard",tr:"Hayır, teşekkürler. Daha sonra ararım",ar:"لا، شكرًا. سأتصل به لاحقًا",zh:"不用了谢谢，我稍后打给他",ko:"아니요, 감사합니다. 제가 나중에 전화할게요",ja:"いいえ、結構です。後で私がかけます",hi:"नहीं, धन्यवाद। मैं बाद में उन्हें फोन करूँगा",ga:"Níl, go raibh maith agat. Cuirfidh mé glaoch air ar ball",uk:"Ні, дякую. Я зателефоную йому пізніше"}},
  {id:933,category:"telephone",level:"A1",t:{fa:"کجا می تواند با شما تماس بگیرد؟",en:"Where can he contact you?",de:"Wo kann er Sie erreichen?",es:"¿Dónde puede contactarlo?",fr:"Où peut-il vous contacter ?",tr:"Sizinle nerede iletişime geçebilir?",ar:"أين يمكنه الاتصال بك؟",zh:"他在哪里可以联系到你？",ko:"그가 당신에게 연락할 수 있는 곳이 어디인가요?",ja:"彼はどこで連絡できますか？",hi:"वह आपसे कहाँ संपर्क कर सकते हैं?",ga:"Cá bhféadfadh sé teagmháil a dhéanamh leat?",uk:"Де він може з вами зв'язатися?"}},
  {id:934,category:"telephone",level:"A1",t:{fa:"بله می شود بپرسم شما که هستید؟",en:"Yes, may I ask who's calling?",de:"Ja, darf ich fragen, wer anruft?",es:"Sí, ¿puedo preguntar quién llama?",fr:"Oui, puis-je demander qui appelle ?",tr:"Evet, kimin aradığını sorabilir miyim?",ar:"نعم، هل يمكنني معرفة من المتصل؟",zh:"好的，请问您是哪位？",ko:"네, 누구신지 여쭤봐도 될까요?",ja:"はい、どちら様か伺ってもよろしいですか？",hi:"हाँ, क्या मैं पूछ सकता हूँ कौन बोल रहा है?",ga:"Sea, an bhféadfainn a fhiafraí cé atá ag glaoch?",uk:"Так, можна запитати, хто телефонує?"}},
  {id:935,category:"telephone",level:"A1",t:{fa:"آیا او شماره تلفن شما را دارد؟",en:"Does she have your number?",de:"Hat sie Ihre Nummer?",es:"¿Ella tiene su número?",fr:"A-t-elle votre numéro ?",tr:"Numaranız var mı?",ar:"هل لديها رقمك؟",zh:"她有你的电话号码吗？",ko:"그녀가 당신 번호를 알고 있나요?",ja:"彼女はあなたの番号をお持ちですか？",hi:"क्या उसके पास आपका नंबर है?",ga:"An bhfuil d'uimhir aici?",uk:"У неї є ваш номер?"}},
  {id:936,category:"telephone",level:"A1",t:{fa:"بسیار خوب به مجرد این که آمد از او میخواهم با شما تماس بگیرد",en:"Ok, I'll ask her to call you as soon as she comes in",de:"Okay, ich werde sie bitten, Sie anzurufen, sobald sie reinkommt",es:"Bien, le pediré que lo llame en cuanto llegue",fr:"D'accord, je lui demanderai de vous appeler dès qu'elle arrive",tr:"Tamam, gelir gelmez sizi aramasını söyleyeceğim",ar:"حسنًا، سأطلب منها الاتصال بك فور وصولها",zh:"好的，她一到我就让她给你打电话",ko:"좋아요, 그녀가 오자마자 전화하라고 할게요",ja:"わかりました、彼女が来次第お電話するよう伝えます",hi:"ठीक है, जैसे ही वह आएंगी मैं उन्हें आपको फोन करने को कहूँगा",ga:"Ceart go leor, iarrfaidh mé uirthi glaoch ort a luaithe a thiocfaidh sí isteach",uk:"Добре, я попрошу її зателефонувати вам, як тільки вона прийде"}},
  {id:937,category:"telephone",level:"A1",t:{fa:"خوب من پیغام را به او خواهم رساند",en:"Good, I'll give him the message",de:"Gut, ich werde ihm die Nachricht ausrichten",es:"Bien, le daré el recado",fr:"Bon, je lui transmettrai le message",tr:"Güzel, mesajı ona ileteceğim",ar:"جيد، سأوصل له الرسالة",zh:"好的，我会把留言转告他",ko:"좋아요, 그에게 메시지를 전할게요",ja:"よし、彼に伝言を伝えます",hi:"अच्छा, मैं उन्हें संदेश दे दूंगा",ga:"Maith, tabharfaidh mé an teachtaireacht dó",uk:"Добре, я передам йому повідомлення"}},
  {id:938,category:"telephone",level:"A1",t:{fa:"حتماً وقتی آمد به او خبر خواهم داد",en:"Sure, I'll let him know when he comes in",de:"Sicher, ich werde es ihm sagen, wenn er reinkommt",es:"Claro, le avisaré cuando llegue",fr:"Bien sûr, je le préviendrai quand il arrivera",tr:"Tabii, geldiğinde ona haber vereceğim",ar:"بالطبع، سأخبره عند وصوله",zh:"当然，他来了我会告诉他",ko:"물론이죠, 그가 오면 알려줄게요",ja:"もちろん、彼が来たら伝えます",hi:"ज़रूर, जब वह आएंगे तो मैं उन्हें बता दूंगा",ga:"Cinnte, cuirfidh mé in iúl dó nuair a thiocfaidh sé isteach",uk:"Звичайно, я повідомлю йому, коли він прийде"}},
  {id:939,category:"telephone",level:"A1",t:{fa:"با کمال میل این کار را میکنم",en:"I'd be glad to",de:"Ich würde es gerne tun",es:"Con gusto",fr:"Avec plaisir",tr:"Memnuniyetle",ar:"يسعدني ذلك",zh:"我很乐意",ko:"기꺼이 하겠습니다",ja:"喜んでお引き受けします",hi:"मुझे खुशी होगी",ga:"Ba mhór liom é",uk:"Я з радістю це зроблю"}},
  {id:940,category:"telephone",level:"A1",t:{fa:"بله البته",en:"Yes, of course",de:"Ja, natürlich",es:"Sí, por supuesto",fr:"Oui, bien sûr",tr:"Evet, tabii",ar:"نعم، بالطبع",zh:"是的，当然",ko:"네, 물론이죠",ja:"はい、もちろんです",hi:"हाँ, बिल्कुल",ga:"Sea, ar ndóigh",uk:"Так, звичайно"}},
  {id:941,category:"telephone",level:"A1",t:{fa:"با کمال میل",en:"With pleasure",de:"Mit Vergnügen",es:"Con mucho gusto",fr:"Avec plaisir",tr:"Memnuniyetle",ar:"بكل سرور",zh:"很乐意",ko:"기꺼이",ja:"喜んで",hi:"खुशी से",ga:"Le pléisiúr",uk:"Із задоволенням"}},
  {id:942,category:"telephone",level:"A1",t:{fa:"مطمئناً",en:"Certainly",de:"Sicherlich",es:"Ciertamente",fr:"Certainement",tr:"Kesinlikle",ar:"بالتأكيد",zh:"当然",ko:"확실히",ja:"確かに",hi:"निश्चित रूप से",ga:"Cinnte",uk:"Безумовно"}},
  {id:943,category:"telephone",level:"A1",t:{fa:"حتماً",en:"Surely",de:"Sicher",es:"Seguramente",fr:"Sûrement",tr:"Elbette",ar:"بلا شك",zh:"当然",ko:"물론이죠",ja:"もちろん",hi:"अवश्य",ga:"Cinnte",uk:"Неодмінно"}},
  {id:944,category:"telephone",level:"A1",t:{fa:"آیا شماره ای که گرفتم ۴۳۳۰ - ۶۷۸ است؟",en:"Is this six seven eight four three zero (678-4330)?",de:"Ist das 678-4330?",es:"¿Es este el 678-4330?",fr:"Est-ce le 678-4330 ?",tr:"Bu 678-4330 mu?",ar:"هل هذا 678-4330؟",zh:"这是678-4330吗？",ko:"이 번호가 678-4330인가요?",ja:"これは678-4330ですか？",hi:"क्या यह 678-4330 है?",ga:"An é seo 678-4330?",uk:"Це 678-4330?"}},
  {id:945,category:"telephone",level:"A1",t:{fa:"آیا این شماره نه دو پنج - صفر صفر یک است؟",en:"Is this nine two five double o three one (925-0031)?",de:"Ist das 925-0031?",es:"¿Es este el 925-0031?",fr:"Est-ce le 925-0031 ?",tr:"Bu 925-0031 mi?",ar:"هل هذا 925-0031؟",zh:"这是925-0031吗？",ko:"이 번호가 925-0031인가요?",ja:"これは925-0031ですか？",hi:"क्या यह 925-0031 है?",ga:"An é seo 925-0031?",uk:"Це 925-0031?"}},
  {id:946,category:"telephone",level:"A1",t:{fa:"آیا این خط داخلی است یا خارجی؟",en:"Is it an outside line or an extension?",de:"Ist das eine Amtsleitung oder eine Durchwahl?",es:"¿Es una línea externa o una extensión?",fr:"Est-ce une ligne extérieure ou un poste ?",tr:"Bu harici hat mı yoksa dahili mi?",ar:"هل هذا خط خارجي أم داخلي؟",zh:"这是外线还是分机？",ko:"외부 회선인가요 내선인가요?",ja:"これは外線ですか内線ですか？",hi:"क्या यह बाहरी लाइन है या एक्सटेंशन?",ga:"An líne sheachtrach nó síneadh é?",uk:"Це зовнішня лінія чи додатковий номер?"}},
  {id:947,category:"telephone",level:"A1",t:{fa:"می خواهم به حساب طرف مقابل تلفن کنم",en:"I need to make a reverse charge call",de:"Ich möchte ein Gespräch auf Gegenseite führen",es:"Necesito hacer una llamada a cobro revertido",fr:"Je dois faire un appel à charge renversée",tr:"Ödemeli arama yapmak istiyorum",ar:"أريد إجراء اتصال بدفع الطرف المستقبل",zh:"我需要打一个对方付费电话",ko:"수신자 부담 전화를 걸어야 해요",ja:"コレクトコールをかけたいです",hi:"मुझे कलेक्ट कॉल करना है",ga:"Caithfidh mé glaoch a chur ar ais",uk:"Мені потрібно зателефонувати з оплатою одержувачем"}},
  {id:948,category:"telephone",level:"A1",t:{fa:"می خواهم به حساب طرف مقابل تلفن کنم (collect call)",en:"I need to make a collect call",de:"Ich möchte ein R-Gespräch führen",es:"Necesito hacer una llamada a cobro revertido",fr:"Je dois passer un appel en PCV",tr:"Ödemeli arama yapmak istiyorum",ar:"أريد إجراء اتصال بتحصيل الرسوم من المستقبل",zh:"我需要打对方付费电话",ko:"수신자 부담 전화를 걸어야 해요",ja:"コレクトコールをかけたいです",hi:"मुझे कलेक्ट कॉल करना है",ga:"Caithfidh mé glaoch bailithe a dhéanamh",uk:"Мені потрібно зателефонувати з оплатою за рахунок одержувача"}},
  {id:949,category:"telephone",level:"A1",t:{fa:"ببخشید مایلم پیغامی بگذارم",en:"I would like to leave a message please",de:"Ich möchte bitte eine Nachricht hinterlassen",es:"Me gustaría dejar un recado, por favor",fr:"Je voudrais laisser un message s'il vous plaît",tr:"Mesaj bırakmak istiyorum lütfen",ar:"أرغب في ترك رسالة من فضلك",zh:"我想留个口信",ko:"메시지를 남기고 싶어요",ja:"メッセージを残したいのですが",hi:"मैं एक संदेश छोड़ना चाहता हूँ",ga:"Ba mhaith liom teachtaireacht a fhágáil le do thoil",uk:"Я хотів би залишити повідомлення, будь ласка"}},
  {id:950,category:"telephone",level:"A1",t:{fa:"آیا پیغام می پذیرید؟",en:"Would you take a message please?",de:"Würden Sie bitte eine Nachricht aufnehmen?",es:"¿Tomaría un recado por favor?",fr:"Prendriez-vous un message s'il vous plaît ?",tr:"Mesaj alır mısınız lütfen?",ar:"هل يمكنك تدوين رسالة من فضلك؟",zh:"请问您可以帮我留言吗？",ko:"메시지를 받아 주시겠어요?",ja:"メッセージを承っていただけますか？",hi:"क्या आप एक संदेश लेंगे?",ga:"An nglacfá teachtaireacht le do thoil?",uk:"Ви запишете повідомлення, будь ласка?"}},
  {id:951,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را بردارید و به تلفن جواب بدهید",en:"Please pick up the receiver and answer the phone",de:"Bitte nehmen Sie den Hörer ab und gehen Sie ans Telefon",es:"Por favor, levante el auricular y conteste el teléfono",fr:"S'il vous plaît, décrochez et répondez au téléphone",tr:"Lütfen ahizeyi kaldırın ve telefona cevap verin",ar:"من فضلك ارفع السماعة ورد على الهاتف",zh:"请拿起听筒接电话",ko:"수화기를 들고 전화를 받아주세요",ja:"受話器を取って電話に出てください",hi:"कृपया रिसीवर उठाएं और फोन का जवाब दें",ga:"Tóg an glacadóir agus freagair an fón le do thoil",uk:"Будь ласка, візьміть трубку та відповідьте на телефон"}},
  {id:952,category:"telephone",level:"A1",t:{fa:"لطفاً حالا گوشی تلفن را بگذارید و بعداً تلفن کنید",en:"Please hang up now and call back later",de:"Bitte legen Sie jetzt auf und rufen Sie später zurück",es:"Por favor, cuelgue ahora y llame más tarde",fr:"Raccrochez s'il vous plaît et rappelez plus tard",tr:"Lütfen şimdi kapatın ve daha sonra tekrar arayın",ar:"من فضلك أغلق الخط الآن واتصل لاحقًا",zh:"请现在挂机，稍后再打",ko:"지금 전화를 끊고 나중에 다시 전화해주세요",ja:"今切っていただき、後でかけ直してください",hi:"कृपया अभी फोन काटें और बाद में वापस कॉल करें",ga:"Croch an fón anois agus glaoch ar ais ar ball le do thoil",uk:"Будь ласка, покладіть трубку зараз і передзвоніть пізніше"}},
  {id:953,category:"telephone",level:"A1",t:{fa:"لطفاً با شماره ۱۴۳۲ - ۴۲۶ به من تلفن کنید",en:"Please dial me at 426-1432",de:"Bitte rufen Sie mich unter 426-1432 an",es:"Por favor, llámeme al 426-1432",fr:"Veuillez m'appeler au 426-1432",tr:"Lütfen beni 426-1432 numarasından arayın",ar:"من فضلك اتصل بي على 426-1432",zh:"请打426-1432给我",ko:"426-1432로 전화해주세요",ja:"426-1432に電話してください",hi:"कृपया मुझे 426-1432 पर कॉल करें",ga:"Glaoigh orm ag 426-1432 le do thoil",uk:"Будь ласка, зателефонуйте мені за номером 426-1432"}},
  {id:954,category:"telephone",level:"A1",t:{fa:"لطفاً به این شماره با من تماس بگیرید",en:"Please contact me at this number",de:"Bitte kontaktieren Sie mich unter dieser Nummer",es:"Por favor, contácteme en este número",fr:"Veuillez me contacter à ce numéro",tr:"Lütfen benimle bu numaradan iletişime geçin",ar:"من فضلك تواصل معي على هذا الرقم",zh:"请通过这个号码联系我",ko:"이 번호로 연락해주세요",ja:"この番号でご連絡ください",hi:"कृपया इस नंबर पर मुझसे संपर्क करें",ga:"Déan teagmháil liom ag an uimhir seo le do thoil",uk:"Будь ласка, зв'яжіться зі мною за цим номером"}},
  {id:955,category:"telephone",level:"A1",t:{fa:"لطفاً می خواهم تلفنی به خارج از کشور بزنم",en:"I'd like to make an overseas call please",de:"Ich möchte bitte ein Auslandsgespräch führen",es:"Me gustaría hacer una llamada al extranjero",fr:"Je voudrais passer un appel à l'étranger s'il vous plaît",tr:"Yurtdışına telefon etmek istiyorum lütfen",ar:"أرغب في إجراء مكالمة خارجية من فضلك",zh:"我想打国际电话",ko:"해외 전화를 걸고 싶어요",ja:"国際電話をかけたいのですが",hi:"मैं एक अंतर्राष्ट्रीय कॉल करना चाहता हूँ",ga:"Ba mhaith liom glaoch thar lear a dhéanamh le do thoil",uk:"Я хотів би зателефонувати за кордон, будь ласка"}},
  {id:956,category:"telephone",level:"A1",t:{fa:"لطفاً می خواهم یک تلفن راه دور به ایران بزنم",en:"I'd like to make a long distance call to Iran please",de:"Ich möchte bitte ein Ferngespräch nach Iran führen",es:"Me gustaría hacer una llamada de larga distancia a Irán",fr:"Je voudrais passer un appel longue distance vers l'Iran s'il vous plaît",tr:"İran'a şehirlerarası telefon etmek istiyorum",ar:"أرغب في إجراء مكالمة بعيدة المدى إلى إيران من فضلك",zh:"我想打长途电话到伊朗",ko:"이란으로 장거리 전화를 걸고 싶어요",ja:"イランに長距離電話をかけたいのですが",hi:"मैं ईरान के लिए एक लंबी दूरी की कॉल करना चाहता हूँ",ga:"Ba mhaith liom glaoch fad-achair a dhéanamh chun na hIaráine le do thoil",uk:"Я хотів би зателефонувати до Ірану на далеку відстань, будь ласка"}},
  {id:957,category:"telephone",level:"A1",t:{fa:"لطفاً می خواهم تلفنی به دوشیزه بنسون بزنم (person to person)",en:"I'd like to make a person to person call to Ms. Benson please",de:"Ich möchte bitte ein persönliches Gespräch mit Frau Benson führen",es:"Me gustaría hacer una llamada personal a la Sra. Benson",fr:"Je voudrais passer un appel personnel à Mme Benson s'il vous plaît",tr:"Bayan Benson ile şahsi görüşme yapmak istiyorum lütfen",ar:"أرغب في إجراء مكالمة شخصية للسيدة بنسون من فضلك",zh:"我想打一个人对人的电话给本森女士",ko:"Benson 여사와 통화를 걸고 싶어요",ja:"ベンソンさんにパーソナルコールをかけたいのですが",hi:"मैं सुश्री बेन्सन को पर्सन टू पर्सन कॉल करना चाहता हूँ",ga:"Ba mhaith liom glaoch duine le duine a dhéanamh chuig Iníon Benson le do thoil",uk:"Я хотів би зателефонувати пані Бенсон, будь ласка"}},
  {id:958,category:"telephone",level:"A1",t:{fa:"متأسفم باید اشتباه گرفته باشم",en:"I'm sorry, I must have the wrong number",de:"Es tut mir leid, ich muss die falsche Nummer haben",es:"Lo siento, debo haber tenido el número equivocado",fr:"Je suis désolé, je dois avoir le mauvais numéro",tr:"Üzgünüm, yanlış numara çevirmiş olmalıyım",ar:"آسف، لا بد أن رقمي خطأ",zh:"对不起，我一定打错号码了",ko:"죄송합니다, 번호를 잘못 누른 것 같아요",ja:"申し訳ありません、番号を間違えたようです",hi:"मुझे खेद है, मेरा नंबर गलत होना चाहिए",ga:"Tá brón orm, ní mór go bhfuil an uimhir mícheart agam",uk:"Мені шкода, я, мабуть, набрав неправильний номер"}},
  {id:959,category:"telephone",level:"A1",t:{fa:"از این که مزاحم شدم متأسفم",en:"Sorry to trouble you",de:"Entschuldigung, dass ich Sie störe",es:"Siento molestarlo",fr:"Désolé de vous déranger",tr:"Rahatsız ettiğim için üzgünüm",ar:"آسف لإزعاجك",zh:"打扰您了，很抱歉",ko:"방해해서 죄송합니다",ja:"お手数をかけて申し訳ありません",hi:"आपको परेशान करने के लिए क्षमा करें",ga:"Tá brón orm cur isteach ort",uk:"Перепрошую за турботу"}},
  {id:960,category:"telephone",level:"A1",t:{fa:"شماره را اشتباه گرفته ام",en:"I've got the wrong number",de:"Ich habe die falsche Nummer",es:"Tengo el número equivocado",fr:"J'ai le mauvais numéro",tr:"Yanlış numarayı aradım",ar:"لقد حصلت على الرقم الخطأ",zh:"我打错号码了",ko:"잘못된 번호예요",ja:"番号を間違えました",hi:"मुझे गलत नंबर मिला है",ga:"Tá an uimhir mícheart agam",uk:"У мене неправильний номер"}},
  {id:961,category:"telephone",level:"A1",t:{fa:"بی اندازه متأسفم",en:"I'm terribly sorry",de:"Es tut mir furchtbar leid",es:"Lo siento muchísimo",fr:"Je suis terriblement désolé",tr:"Çok üzgünüm",ar:"أنا آسف جدًا",zh:"我非常抱歉",ko:"정말 죄송합니다",ja:"大変申し訳ありません",hi:"मैं बहुत दुखी हूँ",ga:"Tá brón orm go h-uafásach",uk:"Мені дуже шкода"}},
  {id:962,category:"telephone",level:"A1",t:{fa:"باید شماره اشتباهی گرفته باشم",en:"I must have dialed the wrong number",de:"Ich muss die falsche Nummer gewählt haben",es:"Debo haber marcado el número equivocado",fr:"J'ai dû composer le mauvais numéro",tr:"Yanlış numara çevirmiş olmalıyım",ar:"لا بد أنني طلبت الرقم الخطأ",zh:"我一定拨错号码了",ko:"잘못된 번호를 눌렀나 봐요",ja:"間違った番号をダイヤルしたようです",hi:"मैंने गलत नंबर डायल किया होगा",ga:"Ní mór go ndiailigh mé an uimhir mícheart",uk:"Я, мабуть, набрав неправильний номер"}},
  {id:963,category:"telephone",level:"A1",t:{fa:"سعی میکنم شماره ۰۰۸۷ - ۹۵۰ را بگیرم ولی خط خراب است",en:"I'm trying to get 950-0087, but the line is out of order",de:"Ich versuche 950-0087 zu erreichen, aber die Leitung ist gestört",es:"Estoy tratando de comunicarme al 950-0087, pero la línea está fuera de servicio",fr:"J'essaie d'obtenir le 950-0087, mais la ligne est hors service",tr:"950-0087'yi aramaya çalışıyorum ama hat arızalı",ar:"أحاول الاتصال بـ 950-0087 لكن الخط معطل",zh:"我正在打950-0087，但是线路坏了",ko:"950-0087에 전화하려고 하는데 회선이 고장났어요",ja:"950-0087にかけようとしていますが、回線が故障しています",hi:"मैं 950-0087 पर कॉल करने की कोशिश कर रहा हूँ, लेकिन लाइन खराब है",ga:"Táim ag iarraidh 950-0087 a fháil, ach tá an líne as ord",uk:"Я намагаюся додзвонитися на 950-0087, але лінія несправна"}},
  {id:964,category:"telephone",level:"A1",t:{fa:"سعی می کنم شماره ۵۴۰۱ - ۵۶۹ را بگیرم ولی همیشه مشغول است",en:"I'm trying to get 569-5401, but the number's busy all the time",de:"Ich versuche 569-5401 zu erreichen, aber die Nummer ist ständig besetzt",es:"Estoy tratando de comunicarme al 569-5401, pero la línea está siempre ocupada",fr:"J'essaie d'obtenir le 569-5401, mais la ligne est toujours occupée",tr:"569-5401'i aramaya çalışıyorum ama numara sürekli meşgul",ar:"أحاول الاتصال بـ 569-5401 لكن الرقم مشغول طوال الوقت",zh:"我正在打569-5401，但一直占线",ko:"569-5401에 전화하려고 하는데 항상 통화중이에요",ja:"569-5401にかけようとしていますが、ずっと話し中です",hi:"मैं 569-5401 पर कॉल करने की कोशिश कर रहा हूँ, लेकिन नंबर हमेशा व्यस्त है",ga:"Táim ag iarraidh 569-5401 a fháil, ach tá an uimhir gnóthach i gcónaí",uk:"Я намагаюся зателефонувати за номером 569-5401, але номер завжди зайнятий"}},
  {id:965,category:"telephone",level:"A1",t:{fa:"تلفن / خط از کار افتاده است",en:"The telephone / the line is dead",de:"Das Telefon / die Leitung ist tot",es:"El teléfono / la línea está muerto/a",fr:"Le téléphone / la ligne est mort/morte",tr:"Telefon / hat ölü",ar:"الهاتف / الخط ميت",zh:"电话/线路没声音了",ko:"전화/회선이 끊어졌어요",ja:"電話/回線が不通です",hi:"फोन/लाइन डेड है",ga:"Tá an fón / an líne marbh",uk:"Телефон/лінія не працює"}},
  {id:966,category:"telephone",level:"A1",t:{fa:"کد سانفرانسیسکو چند است؟",en:"What is the area code for San Francisco?",de:"Was ist die Vorwahl für San Francisco?",es:"¿Cuál es el código de área de San Francisco?",fr:"Quel est l'indicatif régional de San Francisco ?",tr:"San Francisco'nun alan kodu nedir?",ar:"ما هو رمز المنطقة لسان فرانسيسكو؟",zh:"旧金山的区号是多少？",ko:"샌프란시스코의 지역 번호가 무엇인가요?",ja:"サンフランシスコの市外局番は何ですか？",hi:"सैन फ्रांसिस्को का एरिया कोड क्या है?",ga:"Cad é cód ceantair San Francisco?",uk:"Який код міста Сан-Франциско?"}},
  {id:967,category:"telephone",level:"A1",t:{fa:"تلفن جواب نمی دهد",en:"There's no answer",de:"Es meldet sich niemand",es:"No contestan",fr:"Personne ne répond",tr:"Açan yok",ar:"لا يوجد رد",zh:"没人接电话",ko:"응답이 없어요",ja:"誰も出ません",hi:"कोई जवाब नहीं है",ga:"Níl aon fhreagra",uk:"Ніхто не відповідає"}},
  {id:968,category:"telephone",level:"A1",t:{fa:"نمی توانم ارتباط برقرار کنم",en:"I can't get through",de:"Ich komme nicht durch",es:"No puedo comunicarme",fr:"Je n'arrive pas à joindre",tr:"Bağlanamıyorum",ar:"لا أستطيع الاتصال",zh:"我打不通",ko:"연결이 안 돼요",ja:"つながりません",hi:"मैं कनेक्ट नहीं हो पा रहा हूँ",ga:"Ní féidir liom dul tríd",uk:"Не можу додзвонитися"}},
  {id:969,category:"telephone",level:"A1",t:{fa:"(صحبتم) قطع شد",en:"I've been cut off",de:"Ich wurde unterbrochen",es:"Me han cortado",fr:"J'ai été coupé",tr:"Hattım kesildi",ar:"لقد انقطع الاتصال بي",zh:"我的电话被切断了",ko:"통화가 끊어졌어요",ja:"切断されました",hi:"मेरा कॉल कट गया है",ga:"Gearradh amach mé",uk:"Мене відключили"}},
  {id:970,category:"telephone",level:"A1",t:{fa:"کد ناحیه شما چه شماره ای است؟",en:"What's your area code?",de:"Was ist Ihre Vorwahl?",es:"¿Cuál es su código de área?",fr:"Quel est votre indicatif régional ?",tr:"Alan kodunuz nedir?",ar:"ما هو رمز منطقتك؟",zh:"你的区号是多少？",ko:"지역 번호가 어떻게 되나요?",ja:"あなたの市外局番は何ですか？",hi:"आपका एरिया कोड क्या है?",ga:"Cad é do chód ceantair?",uk:"Який ваш код міста?"}},
  {id:971,category:"telephone",level:"A1",t:{fa:"کد کشور شما چه شماره ای است؟",en:"What's your country code?",de:"Was ist Ihre Länderkennzahl?",es:"¿Cuál es su código de país?",fr:"Quel est votre indicatif pays ?",tr:"Ülke kodunuz nedir?",ar:"ما هو رمز بلدك؟",zh:"你的国家代码是多少？",ko:"국가 코드가 어떻게 되나요?",ja:"あなたの国番号は何ですか？",hi:"आपका कंट्री कोड क्या है?",ga:"Cad é do chód tíre?",uk:"Який ваш код країни?"}},
  {id:972,category:"telephone",level:"A1",t:{fa:"کد سانفرانسیسکو ۴۱۵ است",en:"The area code for San Francisco is 415",de:"Die Vorwahl für San Francisco ist 415",es:"El código de área de San Francisco es 415",fr:"L'indicatif régional de San Francisco est le 415",tr:"San Francisco'nun alan kodu 415'tir",ar:"رمز منطقة سان فرانسيسكو هو 415",zh:"旧金山的区号是415",ko:"샌프란시스코의 지역 번호는 415입니다",ja:"サンフランシスコの市外局番は415です",hi:"सैन फ्रांसिस्को का एरिया कोड 415 है",ga:"Is é 415 cód ceantair San Francisco",uk:"Код міста Сан-Франциско — 415"}},
  {id:973,category:"telephone",level:"A1",t:{fa:"من خط را وصل می کنم",en:"I'll connect you",de:"Ich verbinde Sie",es:"Le conecto",fr:"Je vous connecte",tr:"Sizi bağlıyorum",ar:"سأقوم بتوصيلك",zh:"我帮你接通",ko:"연결해 드리겠습니다",ja:"おつなぎします",hi:"मैं आपको कनेक्ट करता हूँ",ga:"Ceanglóidh mé tú",uk:"Я з'єднаю вас"}},
  {id:974,category:"telephone",level:"A1",t:{fa:"تلفن در حال زنگ زدن است",en:"It's ringing",de:"Es klingelt",es:"Está sonando",fr:"Ça sonne",tr:"Çalıyor",ar:"إنه يرن",zh:"电话在响",ko:"벨이 울리고 있어요",ja:"電話が鳴っています",hi:"फोन बज रहा है",ga:"Tá sé ag bualadh",uk:"Телефон дзвонить"}},
  {id:975,category:"telephone",level:"A1",t:{fa:"این یک تلفن داخل شهر است",en:"This is a local call",de:"Das ist ein Ortsgespräch",es:"Esta es una llamada local",fr:"C'est un appel local",tr:"Bu bir şehir içi arama",ar:"هذه مكالمة محلية",zh:"这是本地电话",ko:"이것은 시내 전화입니다",ja:"これは市内通話です",hi:"यह एक स्थानीय कॉल है",ga:"Is glaoch áitiúil é seo",uk:"Це місцевий дзвінок"}},
  {id:976,category:"telephone",level:"A1",t:{fa:"این یک تلفن ایالت به ایالت است",en:"This is an out of state call",de:"Das ist ein Ferngespräch in einen anderen Bundesstaat",es:"Esta es una llamada fuera del estado",fr:"C'est un appel hors de l'état",tr:"Bu eyalet dışı bir arama",ar:"هذه مكالمة خارج الولاية",zh:"这是跨州电话",ko:"이것은 주 외부 전화입니다",ja:"これは州外通話です",hi:"यह एक आउट ऑफ स्टेट कॉल है",ga:"Is glaoch ó lasmuigh den stát é seo",uk:"Це міжштатний дзвінок"}},
  {id:977,category:"telephone",level:"A1",t:{fa:"لطفاً یک لحظه صبر کنید",en:"One moment please",de:"Einen Moment bitte",es:"Un momento por favor",fr:"Un instant s'il vous plaît",tr:"Bir dakika lütfen",ar:"لحظة من فضلك",zh:"请稍等片刻",ko:"잠시만요",ja:"少々お待ちください",hi:"एक क्षण कृपया",ga:"Nóiméad amháin le do thoil",uk:"Одну хвилинку, будь ласка"}},
  {id:978,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را نگهدارید",en:"Hold the line please",de:"Bitte bleiben Sie am Apparat",es:"Por favor, no cuelgue",fr:"Ne quittez pas s'il vous plaît",tr:"Lütfen hattı bekleyin",ar:"من فضلك لا تغلق الخط",zh:"请不要挂断",ko:"잠시만 기다려주세요",ja:"そのままお待ちください",hi:"कृपया लाइन पर रहें",ga:"Coinnigh an líne le do thoil",uk:"Будь ласка, тримайте лінію"}},
  {id:979,category:"telephone",level:"A1",t:{fa:"لطفاً گوشی را نگه دارید",en:"Hold on please",de:"Bitte warten Sie",es:"Espere por favor",fr:"Attendez s'il vous plaît",tr:"Lütfen bekleyin",ar:"من فضلك انتظر",zh:"请稍等",ko:"잠시만 기다려주세요",ja:"お待ちください",hi:"कृपया रुकें",ga:"Fan le do thoil",uk:"Будь ласка, зачекайте"}},
  {id:980,category:"telephone",level:"A1",t:{fa:"به چه کسی تلفن می کنید؟",en:"Who are you calling?",de:"Wen rufen Sie an?",es:"¿A quién llama?",fr:"Qui appelez-vous ?",tr:"Kimi arıyorsunuz?",ar:"من تتصل؟",zh:"你打给谁？",ko:"누구에게 전화하시나요?",ja:"どちらにおかけですか？",hi:"आप किसे कॉल कर रहे हैं?",ga:"Cé air a bhfuil tú ag glaoch?",uk:"Кому ви телефонуєте?"}},
  {id:981,category:"telephone",level:"A1",t:{fa:"لطفاً نام شخصی که تلفن می کنید چیست؟",en:"The name of the person you are calling, please?",de:"Der Name der Person, die Sie anrufen, bitte?",es:"¿El nombre de la persona a la que llama, por favor?",fr:"Le nom de la personne que vous appelez, s'il vous plaît ?",tr:"Aradığınız kişinin adı lütfen?",ar:"اسم الشخص الذي تتصل به من فضلك؟",zh:"请问您要找谁？",ko:"전화하실 분의 성함이 어떻게 되세요?",ja:"おかけになる方のお名前は？",hi:"आप जिस व्यक्ति को कॉल कर रहे हैं उसका नाम कृपया?",ga:"Ainm an duine a bhfuil tú ag glaoch air, le do thoil?",uk:"Ім'я особи, якій ви телефонуєте, будь ласка?"}},
  {id:982,category:"telephone",level:"A1",t:{fa:"از کجا تلفن می کنید؟",en:"Where are you calling from?",de:"Von wo rufen Sie an?",es:"¿Desde dónde llama?",fr:"D'où appelez-vous ?",tr:"Nereden arıyorsunuz?",ar:"من أين تتصل؟",zh:"您从哪里打来的？",ko:"어디서 전화하시나요?",ja:"どちらからおかけですか？",hi:"आप कहाँ से कॉल कर रहे हैं?",ga:"Cá bhfuil tú ag glaoch?",uk:"Звідки ви телефонуєте?"}},
  {id:983,category:"telephone",level:"A1",t:{fa:"لطفاً شماره تلفن شما چیست؟",en:"What's your number please?",de:"Wie ist bitte Ihre Nummer?",es:"¿Cuál es su número, por favor?",fr:"Quel est votre numéro s'il vous plaît ?",tr:"Numaranız nedir lütfen?",ar:"ما هو رقمك من فضلك؟",zh:"请问您的电话号码是多少？",ko:"전화번호가 어떻게 되세요?",ja:"お電話番号は何ですか？",hi:"आपका नंबर क्या है?",ga:"Cad é d'uimhir le do thoil?",uk:"Який ваш номер, будь ласка?"}},
  {id:984,category:"telephone",level:"A1",t:{fa:"با چه کسی می خواهید صحبت کنید؟",en:"Who do you want to speak to?",de:"Mit wem möchten Sie sprechen?",es:"¿Con quién quiere hablar?",fr:"À qui voulez-vous parler ?",tr:"Kiminle konuşmak istiyorsunuz?",ar:"من تريد التحدث معه؟",zh:"你想和谁通话？",ko:"누구와 통화하시겠어요?",ja:"どなたとお話しされますか？",hi:"आप किससे बात करना चाहते हैं?",ga:"Cé leis ar mhaith leat labhairt?",uk:"З ким ви хочете поговорити?"}},
  {id:985,category:"telephone",level:"A1",t:{fa:"من ارتباط شما را برقرار می کنم",en:"I'll put you through",de:"Ich verbinde Sie durch",es:"Le paso",fr:"Je vous passe",tr:"Sizi bağlıyorum",ar:"سأقوم بتوصيلك",zh:"我帮你接通",ko:"연결해 드리겠습니다",ja:"おつなぎします",hi:"मैं आपको कनेक्ट करता हूँ",ga:"Cuirfidh mé trí thú",uk:"Я вас з'єднаю"}},
  {id:986,category:"telephone",level:"A1",t:{fa:"شماره مشغول است",en:"The number is busy/engaged",de:"Die Nummer ist besetzt",es:"El número está ocupado",fr:"Le numéro est occupé",tr:"Numara meşgul",ar:"الرقم مشغول",zh:"电话占线",ko:"번호가 통화중입니다",ja:"番号が話し中です",hi:"नंबर व्यस्त है",ga:"Tá an uimhir gnóthach",uk:"Номер зайнятий"}},
  {id:987,category:"telephone",level:"A1",t:{fa:"لطفاً سعی کنید بعداً شماره تان را بگیرید",en:"Please try your call later",de:"Bitte versuchen Sie es später",es:"Por favor, intente llamar más tarde",fr:"Veuillez réessayer plus tard",tr:"Lütfen daha sonra tekrar arayın",ar:"من فضلك حاول الاتصال لاحقًا",zh:"请稍后再试",ko:"나중에 다시 전화해주세요",ja:"後でおかけ直しください",hi:"कृपया बाद में कॉल करें",ga:"Bain triail as do ghlaoch ar ball le do thoil",uk:"Будь ласка, спробуйте зателефонувати пізніше"}},
  {id:988,category:"rental",level:"A1",t:{fa:"کرایه BMW چند است؟",en:"How much is it to rent a BMW?",de:"Wie viel kostet es, einen BMW zu mieten?",es:"¿Cuánto cuesta alquilar un BMW?",fr:"Combien coûte la location d'une BMW ?",tr:"BMW kiralamak ne kadar?",ar:"كم تكلفة استئجار بي إم دبليو؟",zh:"租一辆宝马多少钱？",ko:"BMW를 렌트하는 데 얼마인가요?",ja:"BMWをレンタルするのはいくらですか？",hi:"BMW किराए पर लेने का कितना खर्च है?",ga:"Cé mhéad atá sé chun BMW a fháil ar cíos?",uk:"Скільки коштує оренда BMW?"}},
  {id:989,category:"rental",level:"A1",t:{fa:"نرخ یکی از BMWها چقدر است؟",en:"What's the rate for one of your BMW?",de:"Wie ist der Preis für einen Ihrer BMW?",es:"¿Cuál es la tarifa para uno de sus BMW?",fr:"Quel est le tarif pour une de vos BMW ?",tr:"BMW'lerinizden birinin ücreti ne kadar?",ar:"ما هي تكلفة واحدة من سيارات بي إم دبليو الخاصة بك؟",zh:"你们的一辆宝马多少钱？",ko:"BMW 중 한 대의 요금이 어떻게 되나요?",ja:"BMWのレンタル料金はいくらですか？",hi:"आपकी एक BMW की दर क्या है?",ga:"Cad é an ráta do cheann de do BMWanna?",uk:"Яка ціна оренди одного з ваших BMW?"}},
  {id:990,category:"rental",level:"A1",t:{fa:"چقدر لازم است برای کرایه BMW؟",en:"How much would it cost to hire a BMW?",de:"Wie viel würde es kosten, einen BMW zu mieten?",es:"¿Cuánto costaría alquilar un BMW?",fr:"Combien coûterait la location d'une BMW ?",tr:"BMW kiralamak ne kadara mal olur?",ar:"كم تكلفة استئجار بي إم دبليو؟",zh:"租一辆宝马要多少钱？",ko:"BMW를 렌트하는 데 비용이 얼마나 들까요?",ja:"BMWをレンタルするといくらかかりますか？",hi:"BMW किराए पर लेने में कितना खर्च आएगा?",ga:"Cé mhéad a chosnódh sé BMW a fháil ar cíos?",uk:"Скільки коштуватиме оренда BMW?"}},
  {id:991,category:"rental",level:"A1",t:{fa:"می خواستم / مایلم BMW کرایه کنم",en:"I wanted/ would like to hire a BMW",de:"Ich wollte / möchte einen BMW mieten",es:"Quería / me gustaría alquilar un BMW",fr:"Je voulais / voudrais louer une BMW",tr:"BMW kiralamak istiyorum",ar:"أردت / أرغب في استئجار بي إم دبليو",zh:"我想租一辆宝马",ko:"BMW를 렌트하고 싶어요",ja:"BMWをレンタルしたいのですが",hi:"मैं BMW किराए पर लेना चाहता हूँ",ga:"Bhí mé ag iarraidh / ba mhaith liom BMW a fháil ar cíos",uk:"Я хотів би орендувати BMW"}},
  {id:992,category:"rental",level:"A1",t:{fa:"مایلم یک ماشین برای جمعه بعد رزرو کنم",en:"I would like to book one for next Friday",de:"Ich möchte einen für nächsten Freitag buchen",es:"Me gustaría reservar uno para el próximo viernes",fr:"Je voudrais en réserver un pour vendredi prochain",tr:"Önümüzdeki Cuma için bir tane rezerve etmek istiyorum",ar:"أرغب في حجز واحدة ليوم الجمعة القادم",zh:"我想预订一辆下周五的",ko:"다음 금요일에 한 대 예약하고 싶어요",ja:"来週の金曜日に一台予約したいのですが",hi:"मैं अगले शुक्रवार के लिए एक बुक करना चाहता हूँ",ga:"Ba mhaith liom ceann a chur in áirithe don Aoine seo chugainn",uk:"Я хотів би забронювати одну на наступну п'ятницю"}},
  {id:993,category:"rental",level:"A1",t:{fa:"من ماشینی برای آخر هفته بعد می خواهم",en:"I need one for the next weekend",de:"Ich brauche einen für das nächste Wochenende",es:"Necesito uno para el próximo fin de semana",fr:"J'ai besoin d'une pour le prochain week-end",tr:"Önümüzdeki hafta sonu için birine ihtiyacım var",ar:"أحتاج واحدة لعطلة نهاية الأسبوع القادمة",zh:"我需要一辆下周末用的",ko:"다음 주말에 한 대 필요해요",ja:"次の週末に一台必要です",hi:"मुझे अगले सप्ताहांत के लिए एक चाहिए",ga:"Teastaíonn uaim ceann don deireadh seachtaine seo chugainn",uk:"Мені потрібна одна на наступні вихідні"}},
  {id:994,category:"rental",level:"A1",t:{fa:"نرخ روزانه یا هفتگی شما چند است؟",en:"How much is your daily/ weekly rate?",de:"Wie hoch ist Ihr Tages-/Wochenpreis?",es:"¿Cuánto es su tarifa diaria/semanal?",fr:"Quel est votre tarif journalier/hebdomadaire ?",tr:"Günlük/haftalık ücretiniz ne kadar?",ar:"كم هي تكلفتك اليومية/الأسبوعية؟",zh:"你们的日租/周租价格是多少？",ko:"일일/주간 요금이 어떻게 되나요?",ja:"1日/週の料金はいくらですか？",hi:"आपकी दैनिक/साप्ताहिक दर कितनी है?",ga:"Cé mhéad atá do ráta laethúil / seachtainiúil?",uk:"Скільки коштує ваша денна/тижнева оренда?"}},
  {id:995,category:"rental",level:"A1",t:{fa:"مایلم یک ماشین کرایه کنم",en:"I would like to rent a car",de:"Ich möchte ein Auto mieten",es:"Me gustaría alquilar un coche",fr:"Je voudrais louer une voiture",tr:"Araba kiralamak istiyorum",ar:"أرغب في استئجار سيارة",zh:"我想租一辆车",ko:"차를 렌트하고 싶어요",ja:"車をレンタルしたいのですが",hi:"मैं एक कार किराए पर लेना चाहता हूँ",ga:"Ba mhaith liom carr a fháil ar cíos",uk:"Я хотів би орендувати автомобіль"}},
  {id:996,category:"rental",level:"A1",t:{fa:"چه ماشینهایی برای کرایه دارید؟",en:"What kind of cars you have for rent?",de:"Was für Autos haben Sie zur Miete?",es:"¿Qué tipo de coches tiene para alquilar?",fr:"Quels types de voitures avez-vous à louer ?",tr:"Kiralık ne tür arabalarınız var?",ar:"ما نوع السيارات المتوفرة لديك للإيجار؟",zh:"你们有哪些车可以出租？",ko:"어떤 차종을 렌트할 수 있나요?",ja:"どのような車をレンタルできますか？",hi:"आपके पास किराए के लिए किस प्रकार की कारें हैं?",ga:"Cén cineál gluaisteán atá agat ar cíos?",uk:"Які автомобілі у вас є в оренду?"}},
  {id:997,category:"rental",level:"A1",t:{fa:"آیا در شهرهای دیگر شعبه دارید؟",en:"Do you have branches in other cities?",de:"Haben Sie Filialen in anderen Städten?",es:"¿Tiene sucursales en otras ciudades?",fr:"Avez-vous des agences dans d'autres villes ?",tr:"Diğer şehirlerde şubeleriniz var mı?",ar:"هل لديكم فروع في مدن أخرى؟",zh:"你们在其他城市有分店吗？",ko:"다른 도시에 지점이 있나요?",ja:"他の都市に支店はありますか？",hi:"क्या आपकी अन्य शहरों में शाखाएँ हैं?",ga:"An bhfuil brainsí agat i gcathracha eile?",uk:"У вас є філії в інших містах?"}},
  {id:998,category:"rental",level:"A1",t:{fa:"۱۳۵ پوند / دلار هر هفته",en:"135 pound/ dollar a week",de:"135 Pfund/Dollar pro Woche",es:"135 libras/dólares a la semana",fr:"135 livres/dollars par semaine",tr:"Haftada 135 pound/dolar",ar:"135 جنيهًا/دولارًا في الأسبوع",zh:"每周135英镑/美元",ko:"주당 135파운드/달러",ja:"週135ポンド/ドル",hi:"135 पाउंड/डॉलर प्रति सप्ताह",ga:"135 punt/dollar in aghaidh na seachtaine",uk:"135 фунтів/доларів на тиждень"}},
  {id:999,category:"rental",level:"A1",t:{fa:"نرخ روزانه ۳۵ دلار است",en:"The daily rate is 35 dollars",de:"Der Tagespreis beträgt 35 Dollar",es:"La tarifa diaria es de 35 dólares",fr:"Le tarif journalier est de 35 dollars",tr:"Günlük ücret 35 dolardır",ar:"التكلفة اليومية 35 دولارًا",zh:"日租是35美元",ko:"일일 요금은 35달러입니다",ja:"1日の料金は35ドルです",hi:"दैनिक दर 35 डॉलर है",ga:"Is é 35 dollar an ráta laethúil",uk:"Денна ставка становить 35 доларів"}},
  {id:1000,category:"rental",level:"A1",t:{fa:"نرخ هفتگی ۱۹۹ دلار است",en:"The weekly rate is $199",de:"Der Wochenpreis beträgt 199 Dollar",es:"La tarifa semanal es de $199",fr:"Le tarif hebdomadaire est de 199 dollars",tr:"Haftalık ücret 199 dolardır",ar:"التكلفة الأسبوعية 199 دولارًا",zh:"周租是199美元",ko:"주간 요금은 199달러입니다",ja:"週間料金は199ドルです",hi:"साप्ताहिक दर $199 है",ga:"Is é $199 an ráta seachtainiúil",uk:"Тижнева ставка становить 199 доларів"}},
  {id:1001,category:"rental",level:"A1",t:{fa:"گواهینامه دارید؟",en:"Have you got a (driver's) license?",de:"Haben Sie einen Führerschein?",es:"¿Tiene licencia de conducir?",fr:"Avez-vous un permis de conduire ?",tr:"Ehliyetiniz var mı?",ar:"هل لديك رخصة قيادة؟",zh:"你有驾照吗？",ko:"운전면허증이 있으신가요?",ja:"運転免許証をお持ちですか？",hi:"क्या आपके पास ड्राइविंग लाइसेंस है?",ga:"An bhfuil ceadúnas tiomána agat?",uk:"У вас є водійське посвідчення?"}},
  {id:1002,category:"rental",level:"A1",t:{fa:"آیا گواهینامه دارید؟",en:"Do you have a driver's license?",de:"Haben Sie einen Führerschein?",es:"¿Tiene licencia de conducir?",fr:"Avez-vous un permis de conduire ?",tr:"Ehliyetiniz var mı?",ar:"هل لديك رخصة قيادة؟",zh:"你有驾照吗？",ko:"운전면허증이 있으신가요?",ja:"運転免許証をお持ちですか？",hi:"क्या आपके पास ड्राइविंग लाइसेंस है?",ga:"An bhfuil ceadúnas tiomána agat?",uk:"У вас є водійські права?"}},
  {id:1003,category:"rental",level:"A1",t:{fa:"ما به گواهینامه شما احتیاج داریم",en:"We need your driver's license",de:"Wir brauchen Ihren Führerschein",es:"Necesitamos su licencia de conducir",fr:"Nous avons besoin de votre permis de conduire",tr:"Ehliyetinize ihtiyacımız var",ar:"نحتاج إلى رخصة قيادتك",zh:"我们需要你的驾照",ko:"운전면허증이 필요합니다",ja:"運転免許証が必要です",hi:"हमें आपके ड्राइविंग लाइसेंस की आवश्यकता है",ga:"Teastaíonn do cheadúnas tiomána uainn",uk:"Нам потрібне ваше водійське посвідчення"}},
  {id:1004,category:"rental",level:"A1",t:{fa:"لطفاً باید این فرم را پر کنید",en:"You need to complete this form please",de:"Sie müssen bitte dieses Formular ausfüllen",es:"Necesita completar este formulario por favor",fr:"Vous devez remplir ce formulaire s'il vous plaît",tr:"Lütfen bu formu doldurmanız gerekiyor",ar:"تحتاج إلى ملء هذا النموذج من فضلك",zh:"你需要填写这份表格",ko:"이 양식을 작성해 주셔야 합니다",ja:"こちらの用紙にご記入ください",hi:"आपको यह फॉर्म भरना होगा",ga:"Caithfidh tú an fhoirm seo a chomhlánú le do thoil",uk:"Вам потрібно заповнити цю форму, будь ласка"}},
  {id:1005,category:"rental",level:"A1",t:{fa:"فقط این فرم را پر کنید",en:"Just fill up this form please",de:"Bitte füllen Sie einfach dieses Formular aus",es:"Solo complete este formulario por favor",fr:"Remplissez simplement ce formulaire s'il vous plaît",tr:"Sadece bu formu doldurun lütfen",ar:"فقط املأ هذا النموذج من فضلك",zh:"请填写这份表格",ko:"이 양식을 작성해 주세요",ja:"こちらの用紙にご記入ください",hi:"कृपया यह फॉर्म भरें",ga:"Líon isteach an fhoirm seo le do thoil",uk:"Просто заповніть цю форму, будь ласка"}},
  {id:1006,category:"rental",level:"A1",t:{fa:"آیا کارت اعتباری دارید؟",en:"Do you have a credit card?",de:"Haben Sie eine Kreditkarte?",es:"¿Tiene tarjeta de crédito?",fr:"Avez-vous une carte de crédit ?",tr:"Kredi kartınız var mı?",ar:"هل لديك بطاقة ائتمان؟",zh:"你有信用卡吗？",ko:"신용카드가 있으신가요?",ja:"クレジットカードをお持ちですか？",hi:"क्या आपके पास क्रेडिट कार्ड है?",ga:"An bhfuil cárta creidmheasa agat?",uk:"У вас є кредитна картка?"}},
  {id:1007,category:"rental",level:"A1",t:{fa:"شما باید سپرده ای بگذارید",en:"You must pay a deposit",de:"Sie müssen eine Kaution hinterlegen",es:"Debe pagar un depósito",fr:"Vous devez payer un acompte",tr:"Depozito ödemelisiniz",ar:"يجب عليك دفع وديعة",zh:"你必须付押金",ko:"보증금을 지불하셔야 합니다",ja:"デポジットをお支払いください",hi:"आपको जमा राशि देनी होगी",ga:"Caithfidh tú éarlais a íoc",uk:"Ви повинні внести заставу"}},
  {id:1008,category:"rental",level:"A1",t:{fa:"ما سپرده و یک کارت اعتباری می خواهیم",en:"We need some deposit and a credit card",de:"Wir brauchen eine Kaution und eine Kreditkarte",es:"Necesitamos un depósito y una tarjeta de crédito",fr:"Nous avons besoin d'un acompte et d'une carte de crédit",tr:"Depozito ve kredi kartına ihtiyacımız var",ar:"نحتاج إلى وديعة وبطاقة ائتمان",zh:"我们需要押金和信用卡",ko:"보증금과 신용카드가 필요합니다",ja:"デポジットとクレジットカードが必要です",hi:"हमें कुछ जमा राशि और एक क्रेडिट कार्ड चाहिए",ga:"Teastaíonn éarlais agus cárta creidmheasa uainn",uk:"Нам потрібна застава та кредитна картка"}},
  {id:1009,category:"rental",level:"A1",t:{fa:"فرمی هست که باید پر شود",en:"There's a form to fill in",de:"Es gibt ein Formular auszufüllen",es:"Hay un formulario que rellenar",fr:"Il y a un formulaire à remplir",tr:"Doldurulacak bir form var",ar:"هناك نموذج لملئه",zh:"有一份表格要填",ko:"작성해야 할 양식이 있습니다",ja:"記入する用紙があります",hi:"भरने के लिए एक फॉर्म है",ga:"Tá foirm le líonadh isteach",uk:"Є форма для заповнення"}},
  {id:1010,category:"bus",level:"A1",t:{fa:"من باید سوار اتوبوس شوم",en:"I need to take a bus",de:"Ich muss einen Bus nehmen",es:"Necesito tomar un autobús",fr:"Je dois prendre un bus",tr:"Otobüse binmem gerek",ar:"أحتاج إلى ركوب الحافلة",zh:"我需要坐公交车",ko:"버스를 타야 해요",ja:"バスに乗る必要があります",hi:"मुझे बस लेनी है",ga:"Caithfidh mé bus a ghlacadh",uk:"Мені потрібно сісти на автобус"}},
  {id:1011,category:"bus",level:"A1",t:{fa:"ایستگاه اتوبوس کجاست؟",en:"Where's the bus stop?",de:"Wo ist die Bushaltestelle?",es:"¿Dónde está la parada de autobús?",fr:"Où est l'arrêt de bus ?",tr:"Otobüs durağı nerede?",ar:"أين موقف الحافلة؟",zh:"公交车站在哪里？",ko:"버스 정류장이 어디인가요?",ja:"バス停はどこですか？",hi:"बस स्टॉप कहाँ है?",ga:"Cá bhfuil an stad bus?",uk:"Де зупинка автобуса?"}},
  {id:1012,category:"bus",level:"A1",t:{fa:"کجا می توانم یک بلیط بخرم؟",en:"Where can I buy a ticket?",de:"Wo kann ich eine Fahrkarte kaufen?",es:"¿Dónde puedo comprar un billete?",fr:"Où puis-je acheter un billet ?",tr:"Nerede bilet alabilirim?",ar:"أين يمكنني شراء تذكرة؟",zh:"我在哪里可以买到票？",ko:"어디에서 표를 살 수 있나요?",ja:"どこで切符を買えますか？",hi:"मैं टिकट कहाँ खरीद सकता हूँ?",ga:"Cá háit is féidir liom ticéad a cheannach?",uk:"Де я можу купити квиток?"}},
  {id:1013,category:"bus",level:"A1",t:{fa:"باجه فروش بلیط کجاست؟",en:"Where's the ticket office?",de:"Wo ist der Fahrkartenschalter?",es:"¿Dónde está la taquilla?",fr:"Où est le guichet ?",tr:"Bilet gişesi nerede?",ar:"أين مكتب التذاكر؟",zh:"售票处在哪里？",ko:"매표소가 어디인가요?",ja:"切符売り場はどこですか？",hi:"टिकट कार्यालय कहाँ है?",ga:"Cá bhfuil an oifig ticéad?",uk:"Де каса?"}},
  {id:1014,category:"bus",level:"A1",t:{fa:"کرایه چقدر است؟",en:"How much is the fare?",de:"Wie hoch ist der Fahrpreis?",es:"¿Cuánto cuesta el billete?",fr:"Combien coûte le billet ?",tr:"Ücret ne kadar?",ar:"كم سعر التذكرة؟",zh:"车费多少钱？",ko:"요금이 얼마인가요?",ja:"運賃はいくらですか？",hi:"किराया कितना है?",ga:"Cé mhéad an táille?",uk:"Скільки коштує проїзд?"}},
  {id:1015,category:"bus",level:"A1",t:{fa:"کدام اتوبوس به مرکز شهر می رود؟",en:"Which bus goes to downtown?",de:"Welcher Bus fährt in die Innenstadt?",es:"¿Qué autobús va al centro?",fr:"Quel bus va au centre-ville ?",tr:"Hangi otobüs şehir merkezine gidiyor?",ar:"أي حافلة تتجه إلى وسط المدينة؟",zh:"哪路公交车去市中心？",ko:"어느 버스가 시내로 가나요?",ja:"どのバスがダウンタウンに行きますか？",hi:"कौन सी बस डाउनटाउन जाती है?",ga:"Cén bus a théann go dtí an lár?",uk:"Який автобус їде до центру міста?"}},
  {id:1016,category:"bus",level:"A1",t:{fa:"کجا می توانم به اتوبوس سانفرانسیسکو سوار شوم؟",en:"Where can I catch the San Francisco bus?",de:"Wo kann ich den Bus nach San Francisco nehmen?",es:"¿Dónde puedo tomar el autobús de San Francisco?",fr:"Où puis-je prendre le bus pour San Francisco ?",tr:"San Francisco otobüsüne nerede binebilirim?",ar:"أين يمكنني ركوب حافلة سان فرانسيسكو؟",zh:"我在哪里可以坐上去旧金山的公交车？",ko:"어디에서 샌프란시스코 버스를 탈 수 있나요?",ja:"サンフランシスコ行きのバスはどこで乗れますか？",hi:"मैं सैन फ्रांसिस्को बस कहाँ पकड़ सकता हूँ?",ga:"Cá háit is féidir liom bus San Francisco a fháil?",uk:"Де я можу сісти на автобус до Сан-Франциско?"}},
  {id:1017,category:"bus",level:"A1",t:{fa:"این اتوبوسها هر چند وقت یک بار می آیند؟",en:"How often do these buses come?",de:"Wie oft kommen diese Busse?",es:"¿Con qué frecuencia pasan estos autobuses?",fr:"Ces bus passent à quelle fréquence ?",tr:"Bu otobüsler ne sıklıkla geliyor?",ar:"كم مرة تأتي هذه الحافلات؟",zh:"这些公交车多久来一趟？",ko:"이 버스들은 얼마나 자주 오나요?",ja:"これらのバスはどのくらいの頻度で来ますか？",hi:"ये बसें कितनी बार आती हैं?",ga:"Cé chomh minic a thagann na busanna seo?",uk:"Як часто приходять ці автобуси?"}},
  {id:1018,category:"bus",level:"A1",t:{fa:"آیا این اتوبوس به سانفرانسیسکو می رود؟",en:"Does this bus go to San Francisco?",de:"Fährt dieser Bus nach San Francisco?",es:"¿Este autobús va a San Francisco?",fr:"Est-ce que ce bus va à San Francisco ?",tr:"Bu otobüs San Francisco'ya gidiyor mu?",ar:"هل تذهب هذه الحافلة إلى سان فرانسيسكو؟",zh:"这趟公交车去旧金山吗？",ko:"이 버스는 샌프란시스코로 가나요?",ja:"このバスはサンフランシスコ行きですか？",hi:"क्या यह बस सैन फ्रांसिस्को जाती है?",ga:"An dtéann an bus seo go San Francisco?",uk:"Цей автобус їде до Сан-Франциско?"}},
  {id:1019,category:"bus",level:"A1",t:{fa:"آیا شما به بلوار پارک می روید؟",en:"Do you go to Park Blvd?",de:"Fahren Sie zum Park Blvd?",es:"¿Va al Parque Blvd?",fr:"Allez-vous au Park Blvd ?",tr:"Park Bulvarı'na gidiyor musunuz?",ar:"هل تذهب إلى بارك بوليفارد؟",zh:"你去公园大道吗？",ko:"Park Blvd로 가시나요?",ja:"パークブルバードに行きますか？",hi:"क्या आप पार्क बुलेवार्ड जाते हैं?",ga:"An dtéann tú go dtí Park Blvd?",uk:"Ви їдете до Парк Бульвару?"}},
  {id:1020,category:"bus",level:"A1",t:{fa:"آیا اتوبوسی که به شهر اوکلند می رود همین است؟",en:"Is this the right bus for city of Oakland?",de:"Ist das der richtige Bus nach Oakland?",es:"¿Es este el autobús correcto para la ciudad de Oakland?",fr:"Est-ce le bon bus pour Oakland ?",tr:"Bu Oakland'a giden doğru otobüs mü?",ar:"هل هذه هي الحافلة الصحيحة لمدينة أوكلاند؟",zh:"这是去奥克兰市的公交车吗？",ko:"이 버스가 오클랜드로 가는 맞는 버스인가요?",ja:"これはオークランド行きの正しいバスですか？",hi:"क्या यह ओकलैंड शहर के लिए सही बस है?",ga:"An é seo an bus ceart chun cathair Oakland?",uk:"Це правильний автобус до Окленда?"}},
  {id:1021,category:"bus",level:"A1",t:{fa:"آیا این اتوبوس شماره ۴۳ - الف است؟",en:"Is this bus No. 43-A?",de:"Ist das der Bus Nummer 43-A?",es:"¿Es este el autobús número 43-A?",fr:"Est-ce le bus numéro 43-A ?",tr:"Bu 43-A numaralı otobüs mü?",ar:"هل هذه الحافلة رقم 43-أ؟",zh:"这是43-A路公交车吗？",ko:"이 버스는 43-A번인가요?",ja:"このバスは43-Aですか？",hi:"क्या यह बस नंबर 43-A है?",ga:"An é seo an bus Uimh. 43-A?",uk:"Це автобус № 43-А?"}},
  {id:1022,category:"bus",level:"A1",t:{fa:"ببخشید این چه اتوبوسی است؟",en:"Excuse me. Which bus is this please?",de:"Entschuldigung. Welcher Bus ist das bitte?",es:"Disculpe. ¿Qué autobús es este por favor?",fr:"Excusez-moi. Quel est ce bus s'il vous plaît ?",tr:"Affedersiniz. Bu hangi otobüs lütfen?",ar:"عفواً. أي حافلة هذه من فضلك؟",zh:"对不起，请问这是哪路公交车？",ko:"실례합니다. 이 버스가 몇 번인가요?",ja:"すみません、このバスは何番ですか？",hi:"क्षमा करें। कृपया यह कौन सी बस है?",ga:"Gabhaigí mo leithscéal. Cén bus é seo le do thoil?",uk:"Перепрошую. Який це автобус, будь ласка?"}},
  {id:1023,category:"bus",level:"A1",t:{fa:"لطفاً آیا می توانید بگویید کجا پیاده شوم؟",en:"Can you tell me where to get off please?",de:"Können Sie mir bitte sagen, wo ich aussteigen soll?",es:"¿Puede decirme dónde bajarme por favor?",fr:"Pouvez-vous me dire où descendre s'il vous plaît ?",tr:"Lütfen nerede ineceğimi söyler misiniz?",ar:"هل يمكنك إخباري أين أنزل من فضلك؟",zh:"你能告诉我在哪里下车吗？",ko:"어디서 내려야 하는지 알려주실 수 있나요?",ja:"どこで降りればいいか教えていただけますか？",hi:"क्या आप मुझे बता सकते हैं कि मुझे कहाँ उतरना है?",ga:"An féidir leat a rá liom cá háit le dul as le do thoil?",uk:"Можете сказати, де мені вийти, будь ласка?"}},
  {id:1024,category:"bus",level:"A1",t:{fa:"چقدر دیگر از راه مانده؟",en:"How much further is it?",de:"Wie weit ist es noch?",es:"¿Cuánto falta?",fr:"C'est encore loin ?",tr:"Daha ne kadar var?",ar:"كم بقي من الطريق؟",zh:"还有多远？",ko:"얼마나 더 가야 하나요?",ja:"あとどのくらいですか？",hi:"यह और कितनी दूर है?",ga:"Cé mhéad eile atá ann?",uk:"Як далеко ще?"}},
  {id:1025,category:"bus",level:"A1",t:{fa:"ببخشید. لطفاً ماشین را نگهدارید",en:"Excuse me. Please stop the bus",de:"Entschuldigung. Bitte halten Sie den Bus an",es:"Disculpe. Por favor, pare el autobús",fr:"Excusez-moi. Arrêtez le bus s'il vous plaît",tr:"Affedersiniz. Lütfen otobüsü durdurun",ar:"عفواً. من فضلك أوقف الحافلة",zh:"对不起，请停车",ko:"실례합니다. 버스 세워주세요",ja:"すみません、バスを止めてください",hi:"क्षमा करें। कृपया बस रोकें",ga:"Gabhaigí mo leithscéal. Cuir stad ar an mbus le do thoil",uk:"Перепрошую. Будь ласка, зупиніть автобус"}},
  {id:1026,category:"bus",level:"A1",t:{fa:"اشتباهی سوار این خط شده ام",en:"I'm in the wrong bus!",de:"Ich bin im falschen Bus!",es:"¡Estoy en el autobús equivocado!",fr:"Je suis dans le mauvais bus !",tr:"Yanlış otobüse bindim!",ar:"أنا في الحافلة الخطأ!",zh:"我坐错车了！",ko:"잘못된 버스를 탔어요!",ja:"間違ったバスに乗りました！",hi:"मैं गलत बस में हूँ!",ga:"Tá mé sa bhus mícheart!",uk:"Я в неправильному автобусі!"}},
  {id:1027,category:"bus",level:"A1",t:{fa:"ببخشید. آیا این صندلی کسی است؟",en:"Excuse me. Is this seat taken?",de:"Entschuldigung. Ist dieser Platz besetzt?",es:"Disculpe. ¿Está ocupado este asiento?",fr:"Excusez-moi. Cette place est-elle prise ?",tr:"Affedersiniz. Bu koltuk dolu mu?",ar:"عفواً. هل هذا المقعد مشغول؟",zh:"对不起，这个座位有人吗？",ko:"실례합니다. 이 자리 비어 있나요?",ja:"すみません、この席は空いていますか？",hi:"क्षमा करें। क्या यह सीट खाली है?",ga:"Gabhaigí mo leithscéal. An bhfuil an suíochán seo tógtha?",uk:"Перепрошую. Це місце зайняте?"}},
  {id:1028,category:"bus",level:"A1",t:{fa:"اتوبوس ظرف ۱۵ دقیقه حرکت میکند",en:"The bus leaves in fifteen minutes",de:"Der Bus fährt in fünfzehn Minuten ab",es:"El autobús sale en quince minutos",fr:"Le bus part dans quinze minutes",tr:"Otobüs on beş dakika içinde kalkıyor",ar:"تنطلق الحافلة خلال خمس عشرة دقيقة",zh:"公交车十五分钟后出发",ko:"버스는 15분 후에 출발합니다",ja:"バスは15分後に出発します",hi:"बस पंद्रह मिनट में चलेगी",ga:"Imíonn an bus i gceann cúig nóiméad déag",uk:"Автобус відправляється через п'ятнадцять хвилин"}},
  {id:1029,category:"bus",level:"A1",t:{fa:"شما باید در ایستگاه بعد پیاده شوید",en:"You should get off the next stop",de:"Sie sollten an der nächsten Haltestelle aussteigen",es:"Debería bajarse en la próxima parada",fr:"Vous devriez descendre au prochain arrêt",tr:"Sonraki durakta inmelisiniz",ar:"يجب أن تنزل في المحطة التالية",zh:"你应该在下一站下车",ko:"다음 정류장에서 내리셔야 합니다",ja:"次の停留所で降りてください",hi:"आपको अगले स्टॉप पर उतरना चाहिए",ga:"Ba chóir duit dul as ag an gcéad stad eile",uk:"Вам слід вийти на наступній зупинці"}},
  {id:1030,category:"bus",level:"A1",t:{fa:"بلیط در اتوبوس فروخته میشود",en:"They sell ticket in the bus",de:"Sie verkaufen Fahrkarten im Bus",es:"Venden billetes en el autobús",fr:"Ils vendent des billets dans le bus",tr:"Bilet otobüste satılıyor",ar:"يبيعون التذاكر في الحافلة",zh:"车上卖票",ko:"버스 안에서 표를 팔아요",ja:"バス内で切符を販売しています",hi:"वे बस में टिकट बेचते हैं",ga:"Díolann siad ticéid sa bhus",uk:"Квитки продаються в автобусі"}},
  {id:1031,category:"bus",level:"A1",t:{fa:"بلیط برای برگشت هم اعتبار دارد",en:"The ticket is also good for the return trip",de:"Die Fahrkarte gilt auch für die Rückfahrt",es:"El billete también sirve para el viaje de vuelta",fr:"Le billet est également valable pour le retour",tr:"Bilet dönüş yolculuğu için de geçerli",ar:"التذكرة صالحة أيضًا لرحلة العودة",zh:"这张票回程也有效",ko:"이 표는 왕복 모두 사용 가능합니다",ja:"この切符は往復に有効です",hi:"टिकट वापसी की यात्रा के लिए भी मान्य है",ga:"Tá an ticéad maith don turas fillte freisin",uk:"Квиток дійсний також для зворотної поїздки"}},
  {id:1032,category:"bus",level:"A1",t:{fa:"این اتوبوس سانفرانسیسکو است",en:"This is the San Francisco bus",de:"Das ist der Bus nach San Francisco",es:"Este es el autobús de San Francisco",fr:"C'est le bus de San Francisco",tr:"Bu San Francisco otobüsü",ar:"هذه حافلة سان فرانسيسكو",zh:"这是去旧金山的公交车",ko:"이것은 샌프란시스코 버스입니다",ja:"これはサンフランシスコ行きのバスです",hi:"यह सैन फ्रांसिस्को बस है",ga:"Seo bus San Francisco",uk:"Це автобус до Сан-Франциско"}},
  {id:1033,category:"bus",level:"A1",t:{fa:"شما باید یکی از اتوبوسهای خط ۴۳ را سوار شوید",en:"You'll have to take a 43 bus",de:"Sie müssen den Bus 43 nehmen",es:"Tendrá que tomar el autobús 43",fr:"Vous devrez prendre le bus 43",tr:"43 numaralı otobüse binmelisiniz",ar:"سيكون عليك ركوب الحافلة 43",zh:"你必须坐43路公交车",ko:"43번 버스를 타셔야 합니다",ja:"43番のバスに乗る必要があります",hi:"आपको 43 बस लेनी होगी",ga:"Beidh ort bus 43 a ghlacadh",uk:"Вам доведеться сісти на автобус №43"}},
  {id:1034,category:"bus",level:"A1",t:{fa:"شما باید در خیابان بیستم پیاده شوید و یکی از اتوبوسهای خط چهل را سوار شوید",en:"You have to get off at 20th st. and take a 40 bus",de:"Sie müssen an der 20. Straße aussteigen und den Bus 40 nehmen",es:"Tiene que bajarse en la calle 20 y tomar el autobús 40",fr:"Vous devez descendre à la 20e rue et prendre le bus 40",tr:"20. Caddede inip 40 numaralı otobüse binmelisiniz",ar:"يجب أن تنزل في شارع 20 وتركب الحافلة 40",zh:"你必须在20街下车，然后坐40路公交车",ko:"20번가에서 내려 40번 버스를 타셔야 합니다",ja:"20番街で降りて40番のバスに乗ってください",hi:"आपको 20वीं स्ट्रीट पर उतरना होगा और 40 बस लेनी होगी",ga:"Caithfidh tú dul as ag 20ú Sráid agus bus 40 a ghlacadh",uk:"Вам потрібно вийти на 20-й вулиці та сісти на автобус №40"}},
  {id:1035,category:"bus",level:"A1",t:{fa:"من فقط تا بلوار پارک می روم",en:"I only go as far as Park Blvd",de:"Ich fahre nur bis zum Park Blvd",es:"Solo voy hasta el Parque Blvd",fr:"Je ne vais que jusqu'au Park Blvd",tr:"Sadece Park Bulvarı'na kadar gidiyorum",ar:"أنا أذهب فقط إلى بارك بوليفارد",zh:"我只到公园大道",ko:"저는 Park Blvd까지만 가요",ja:"私はパークブルバードまでしか行きません",hi:"मैं केवल पार्क बुलेवार्ड तक जाता हूँ",ga:"Ní théim ach chomh fada le Park Blvd",uk:"Я їду тільки до Парк Бульвару"}},
  {id:1036,category:"bus",level:"A1",t:{fa:"اتوبوسی که باید سوار شوید ۴۳ است",en:"You need/ want a 43 bus",de:"Sie brauchen den Bus 43",es:"Necesita el autobús 43",fr:"Vous avez besoin du bus 43",tr:"43 numaralı otobüse ihtiyacınız var",ar:"أنت بحاجة إلى الحافلة 43",zh:"你需要坐43路",ko:"43번 버스가 필요해요",ja:"43番のバスが必要です",hi:"आपको 43 बस चाहिए",ga:"Teastaíonn bus 43 uait",uk:"Вам потрібен автобус №43"}},
  {id:1037,category:"bus",level:"A1",t:{fa:"شما باید اتوبوس ۳۲ - الف را سوار می شدید",en:"You should have caught a 32-A bus",de:"Sie hätten den Bus 32-A nehmen sollen",es:"Debería haber tomado el autobús 32-A",fr:"Vous auriez dû prendre le bus 32-A",tr:"32-A otobüsüne binmeliydiniz",ar:"كان يجب أن تركب الحافلة 32-أ",zh:"你应该坐32-A路",ko:"32-A 버스를 타셨어야 했어요",ja:"32-Aのバスに乗るべきでした",hi:"आपको 32-A बस पकड़नी चाहिए थी",ga:"Ba chóir duit bus 32-A a fháil",uk:"Вам слід було сісти на автобус 32-А"}},
  {id:1038,category:"bus",level:"A1",t:{fa:"اتوبوسها هر ۱۵ دقیقه یک بار می آیند",en:"They come every fifteen minutes",de:"Sie kommen alle fünfzehn Minuten",es:"Pasan cada quince minutos",fr:"Ils passent toutes les quinze minutes",tr:"On beş dakikada bir gelirler",ar:"تأتي كل خمس عشرة دقيقة",zh:"每十五分钟来一趟",ko:"15분마다 와요",ja:"15分ごとに来ます",hi:"वे हर पंद्रह मिनट में आते हैं",ga:"Tagann siad gach cúig nóiméad déag",uk:"Вони приходять кожні п'ятнадцять хвилин"}},
  {id:1039,category:"bus",level:"A1",t:{fa:"در اتوبوس سیگار کشیدن ممنوع است",en:"No smoking in the bus",de:"Im Bus ist Rauchen verboten",es:"Prohibido fumar en el autobús",fr:"Défense de fumer dans le bus",tr:"Otobüste sigara içmek yasaktır",ar:"ممنوع التدخين في الحافلة",zh:"公交车上禁止吸烟",ko:"버스에서 금연입니다",ja:"バス内は禁煙です",hi:"बस में धूम्रपान वर्जित है",ga:"Níl cead tobac a chaitheamh sa bhus",uk:"У автобусі заборонено палити"}},
  {id:1040,category:"bus",level:"A1",t:{fa:"در اتوبوس ریختن اشغال ممنوع است",en:"No littering in the bus",de:"Im Bus ist es verboten, Abfall wegzuwerfen",es:"Prohibido tirar basura en el autobús",fr:"Défense de jeter des déchets dans le bus",tr:"Otobüste çöp atmak yasaktır",ar:"ممنوع رمي النفايات في الحافلة",zh:"公交车上禁止乱扔垃圾",ko:"버스에서 쓰레기 투기 금지입니다",ja:"バス内でのポイ捨ては禁止です",hi:"बस में कूड़ा फेंकना मना है",ga:"Níl cead bruscar a chaitheamh sa bhus",uk:"У автобусі заборонено смітити"}},
  {id:1041,category:"bus",level:"A1",t:{fa:"در داخل اتوبوس صدای رادیو را کم کنید",en:"Radio's silent in the bus",de:"Im Bus muss das Radio leise sein",es:"Radio silencioso en el autobús",fr:"Radio silencieuse dans le bus",tr:"Otobüste radyo sessiz olmalı",ar:"الراديو هادئ في الحافلة",zh:"公交车上收音机要调静音",ko:"버스에서 라디오는 조용히 해주세요",ja:"バス内ではラジオを消してください",hi:"बस में रेडियो शांत रखें",ga:"Bí ciúin leis an raidió sa bhus",uk:"У автобусі радіо має бути тихим"}},
  {id:1042,category:"bus",level:"A1",t:{fa:"لطفاً پنجره را ببندید",en:"Please close the window",de:"Bitte schließen Sie das Fenster",es:"Por favor, cierre la ventana",fr:"Veuillez fermer la fenêtre",tr:"Lütfen pencereyi kapatın",ar:"من فضلك أغلق النافذة",zh:"请关窗",ko:"창문을 닫아주세요",ja:"窓を閉めてください",hi:"कृपया खिड़की बंद करें",ga:"Dún an fhuinneog le do thoil",uk:"Будь ласка, закрийте вікно"}},
  {id:1043,category:"bus",level:"A1",t:{fa:"لطفاً پنجره را باز کنید",en:"Please open the window",de:"Bitte öffnen Sie das Fenster",es:"Por favor, abra la ventana",fr:"Veuillez ouvrir la fenêtre",tr:"Lütfen pencereyi açın",ar:"من فضلك افتح النافذة",zh:"请开窗",ko:"창문을 열어주세요",ja:"窓を開けてください",hi:"कृपया खिड़की खोलें",ga:"Oscail an fhuinneog le do thoil",uk:"Будь ласка, відчиніть вікно"}},
  {id:1044,category:"bus",level:"A1",t:{fa:"هنوز راه زیادی مانده",en:"It's quite a way yet",de:"Es ist noch ein ganzes Stück",es:"Todavía queda bastante",fr:"C'est encore un bon bout",tr:"Daha epey yol var",ar:"لا يزال الطريق طويلاً",zh:"还有很远的路",ko:"아직 거리가 꽤 있어요",ja:"まだかなりあります",hi:"अभी काफी दूर है",ga:"Tá sé sách fada fós",uk:"Це ще досить далеко"}},
  {id:1045,category:"bus",level:"A1",t:{fa:"بسیار خوب به شما اطلاع خواهم داد",en:"Ok, I'll let you know",de:"Ok, ich werde es Ihnen mitteilen",es:"Bien, se lo haré saber",fr:"D'accord, je vous ferai savoir",tr:"Tamam, size haber vereceğim",ar:"حسنًا، سأخبرك",zh:"好的，我会告诉你",ko:"좋아요, 알려드릴게요",ja:"わかりました、お知らせします",hi:"ठीक है, मैं आपको बता दूंगा",ga:"Ceart go leor, cuirfidh mé in iúl duit",uk:"Добре, я повідомлю вас"}},
  {id:1046,category:"bus",level:"A1",t:{fa:"سه ایستگاه بعد از این است",en:"It's three stops after this one",de:"Es sind drei Haltestellen nach dieser",es:"Son tres paradas después de esta",fr:"C'est trois arrêts après celui-ci",tr:"Bundan sonra üç durak var",ar:"إنها ثلاث محطات بعد هذه",zh:"离这里还有三站",ko:"여기서 세 정거장 후입니다",ja:"この次の3つ目の停留所です",hi:"यह इसके बाद तीन स्टॉप है",ga:"Tá sé trí stad i ndiaidh an cheann seo",uk:"Це три зупинки після цієї"}},
  {id:1047,category:"bus",level:"A1",t:{fa:"بله تعداد زیادی (ایستگاه) وجود دارد",en:"Yes, there are quite a few",de:"Ja, es gibt ziemlich viele",es:"Sí, hay bastantes",fr:"Oui, il y en a pas mal",tr:"Evet, epeyce var",ar:"نعم، هناك عدد غير قليل",zh:"是的，有不少",ko:"네, 꽤 많아요",ja:"はい、かなりあります",hi:"हाँ, काफी कुछ हैं",ga:"Sea, tá roinnt mhaith",uk:"Так, їх досить багато"}},
  {id:1048,category:"bus",level:"A1",t:{fa:"به اتوبوس شماره ۳۲ سوار شوید",en:"Take bus number 32",de:"Nehmen Sie den Bus Nummer 32",es:"Tome el autobús número 32",fr:"Prenez le bus numéro 32",tr:"32 numaralı otobüse binin",ar:"اركب الحافلة رقم 32",zh:"坐32路公交车",ko:"32번 버스를 타세요",ja:"32番のバスに乗ってください",hi:"बस नंबर 32 लें",ga:"Glac bus uimhir 32",uk:"Сідайте на автобус №32"}},
  {id:1049,category:"bus",level:"A1",t:{fa:"خیر این جا نه - در ایستگاه بعدی",en:"No. Not here- at the next stop",de:"Nein. Nicht hier - an der nächsten Haltestelle",es:"No. No aquí - en la próxima parada",fr:"Non. Pas ici - au prochain arrêt",tr:"Hayır. Burada değil - sonraki durakta",ar:"لا. ليس هنا - في المحطة التالية",zh:"不，不是这里 - 在下一站",ko:"아니요. 여기가 아닙니다 - 다음 정류장에서",ja:"いいえ、ここではありません - 次の停留所で",hi:"नहीं, यहाँ नहीं - अगले स्टॉप पर",ga:"Níl. Níl anseo - ag an gcéad stad eile",uk:"Ні. Не тут - на наступній зупинці"}},
  {id:1050,category:"bus",level:"A1",t:{fa:"آیا ایستگاههای اتوبوس زیادی در طول این خیابان وجود دارد؟",en:"Are there many bus stops along this street?",de:"Gibt es viele Bushaltestellen entlang dieser Straße?",es:"¿Hay muchas paradas de autobús en esta calle?",fr:"Y a-t-il beaucoup d'arrêts de bus dans cette rue ?",tr:"Bu cadde boyunca çok sayıda otobüs durağı var mı?",ar:"هل هناك العديد من مواقف الحافلات على طول هذا الشارع؟",zh:"这条街上有很多公交车站吗？",ko:"이 거리를 따라 버스 정류장이 많이 있나요?",ja:"この通りにはバス停がたくさんありますか？",hi:"क्या इस सड़क पर कई बस स्टॉप हैं?",ga:"An bhfuil go leor stadanna bus ar an tsráid seo?",uk:"Чи багато автобусних зупинок уздовж цієї вулиці?"}},
  {id:1051,category:"bus",level:"A1",t:{fa:"آیا می دانید چه اتوبوسی باید سوار شوم؟",en:"Do you know which bus I take?",de:"Wissen Sie, welchen Bus ich nehmen muss?",es:"¿Sabe qué autobús debo tomar?",fr:"Savez-vous quel bus je dois prendre ?",tr:"Hangi otobüse bineceğimi biliyor musunuz?",ar:"هل تعرف أي حافلة يجب أن أركب؟",zh:"你知道我该坐哪路公交车吗？",ko:"어떤 버스를 타야 하는지 아시나요?",ja:"どのバスに乗ればいいかご存知ですか？",hi:"क्या आप जानते हैं कि मुझे कौन सी बस लेनी है?",ga:"An bhfuil a fhios agat cén bus a ghlacfaidh mé?",uk:"Чи знаєте ви, на який автобус мені сісти?"}},
  {id:1052,category:"bus",level:"A1",t:{fa:"آیا این جا همان محلی است که بایستی پیاده شوم؟",en:"Is this where I get off the bus?",de:"Ist dies die Stelle, wo ich aussteigen muss?",es:"¿Es aquí donde me bajo del autobús?",fr:"Est-ce ici que je dois descendre du bus ?",tr:"Otobüsten ineceğim yer burası mı?",ar:"هل هذا هو المكان الذي يجب أن أنزل فيه من الحافلة؟",zh:"我是在这里下车吗？",ko:"여기가 내려야 할 곳인가요?",ja:"ここがバスを降りる場所ですか？",hi:"क्या मुझे यहाँ बस से उतरना है?",ga:"An é seo an áit a bhfaighidh mé as an mbus?",uk:"Це те місце, де мені вийти з автобуса?"}},
  {id:1053,category:"train",level:"A1",t:{fa:"چه وقت قطار بعدی حرکت میکند؟",en:"When does the next train leave?",de:"Wann fährt der nächste Zug?",es:"¿Cuándo sale el próximo tren?",fr:"Quand part le prochain train ?",tr:"Bir sonraki tren ne zaman kalkıyor?",ar:"متى يغادر القطار التالي؟",zh:"下一班火车什么时候开？",ko:"다음 기차는 언제 출발하나요?",ja:"次の電車は何時に出発しますか？",hi:"अगली ट्रेन कब चलेगी?",ga:"Cathain a fhágann an chéad traein eile?",uk:"Коли відправляється наступний потяг?"}},
  {id:1054,category:"train",level:"A1",t:{fa:"لطفاً (بگویید) باید برای رفتن به شهر اوکلند به چه قطاری سوار شوم؟",en:"Which train do I take for Oakland, please?",de:"Welchen Zug muss ich nach Oakland nehmen, bitte?",es:"¿Qué tren tomo para Oakland, por favor?",fr:"Quel train dois-je prendre pour Oakland, s'il vous plaît ?",tr:"Lütfen Oakland'a gitmek için hangi trene bineceğimi söyler misiniz?",ar:"أي قطار يجب أن آخذه إلى أوكلاند من فضلك؟",zh:"请问去奥克兰坐哪趟火车？",ko:"오클랜드로 가려면 어떤 기차를 타야 하나요?",ja:"オークランド行きはどの電車に乗ればいいですか？",hi:"कृपया ओकलैंड के लिए मुझे कौन सी ट्रेन लेनी चाहिए?",ga:"Cén traein a ghlacfaidh mé go hOakland, le do thoil?",uk:"Який потяг мені взяти до Окленда, будь ласка?"}},
  {id:1055,category:"train",level:"A1",t:{fa:"چه وقت قطار بعدی می رسد؟",en:"What time does the next train arrive?",de:"Wann kommt der nächste Zug an?",es:"¿A qué hora llega el próximo tren?",fr:"À quelle heure arrive le prochain train ?",tr:"Bir sonraki tren saat kaçta varıyor?",ar:"في أي وقت يصل القطار التالي؟",zh:"下一班火车什么时候到？",ko:"다음 기차는 몇 시에 도착하나요?",ja:"次の電車は何時に到着しますか？",hi:"अगली ट्रेन कितने बजे आती है?",ga:"Cén t-am a dtagann an chéad traein eile?",uk:"О котрій годині прибуває наступний потяг?"}},
  {id:1056,category:"train",level:"A1",t:{fa:"چه وقت ما به آنجا میرسیم؟",en:"When do we get there?",de:"Wann kommen wir dort an?",es:"¿Cuándo llegamos?",fr:"Quand arrivons-nous ?",tr:"Oraya ne zaman varıyoruz?",ar:"متى نصل إلى هناك؟",zh:"我们什么时候到那里？",ko:"우리는 거기에 언제 도착하나요?",ja:"いつ到着しますか？",hi:"हम वहाँ कब पहुँचेंगे?",ga:"Cathain a shroicheann muid ann?",uk:"Коли ми туди приїдемо?"}},
  {id:1057,category:"train",level:"A1",t:{fa:"چه وقت به لندن میرسد؟",en:"What time does it reach London?",de:"Wann erreicht es London?",es:"¿A qué hora llega a Londres?",fr:"À quelle heure arrive-t-il à Londres ?",tr:"Londra'ya saat kaçta varıyor?",ar:"في أي وقت تصل إلى لندن؟",zh:"什么时候到伦敦？",ko:"런던에 몇 시에 도착하나요?",ja:"ロンドンには何時に到着しますか？",hi:"यह लंदन कितने बजे पहुँचता है?",ga:"Cén t-am a shroicheann sé Londain?",uk:"О котрій годині прибуває до Лондона?"}},
  {id:1058,category:"train",level:"A1",t:{fa:"آیا مجبور به تعویض قطار خواهم بود؟",en:"Do I have to change trains?",de:"Muss ich umsteigen?",es:"¿Tengo que cambiar de tren?",fr:"Dois-je changer de train ?",tr:"Tren değiştirmek zorunda mıyım?",ar:"هل يجب أن أغير القطار؟",zh:"我需要换火车吗？",ko:"기차를 갈아타야 하나요?",ja:"乗り換えが必要ですか？",hi:"क्या मुझे ट्रेन बदलनी होगी?",ga:"An gá dom traenacha a athrú?",uk:"Мені потрібно пересідати?"}},
  {id:1059,category:"train",level:"A1",t:{fa:"آیا لازم است قطار عوض کنم؟",en:"Is it necessary to change?",de:"Ist es notwendig umzusteigen?",es:"¿Es necesario cambiar?",fr:"Est-il nécessaire de changer ?",tr:"Değiştirmek gerekli mi?",ar:"هل من الضروري التغيير؟",zh:"有必要换车吗？",ko:"갈아타야 하나요?",ja:"乗り換えは必要ですか？",hi:"क्या बदलना आवश्यक है?",ga:"An gá é a athrú?",uk:"Чи потрібно пересідати?"}},
  {id:1060,category:"train",level:"A1",t:{fa:"آیا احتیاجی هست که قطار را عوض کنم؟",en:"Need I change trains?",de:"Muss ich umsteigen?",es:"¿Necesito cambiar de tren?",fr:"Dois-je changer de train ?",tr:"Tren değiştirmem gerekir mi?",ar:"هل أحتاج إلى تغيير القطار؟",zh:"我需要换火车吗？",ko:"기차를 갈아타야 하나요?",ja:"乗り換えは必要ですか？",hi:"क्या मुझे ट्रेन बदलनी चाहिए?",ga:"An gá dom traenacha a athrú?",uk:"Чи потрібно пересідати?"}},
  {id:1061,category:"train",level:"A1",t:{fa:"روی کدام سکو باید منتظر شوم؟",en:"On which platform do I wait?",de:"Auf welchem Bahnsteig muss ich warten?",es:"¿En qué andén espero?",fr:"Sur quel quai dois-je attendre ?",tr:"Hangi peronda beklemeliyim?",ar:"في أي رصيف أنتظر؟",zh:"我在哪个站台等？",ko:"어느 플랫폼에서 기다려야 하나요?",ja:"どのプラットフォームで待ちますか？",hi:"मुझे किस प्लेटफॉर्म पर इंतज़ार करना चाहिए?",ga:"Cén ardán a bhfuil mé ag fanacht air?",uk:"На якій платформі мені чекати?"}},
  {id:1062,category:"train",level:"A1",t:{fa:"آیا روزهای یکشنبه هیچ هواپیمایی وجود دارد؟",en:"Are there any planes available on Sundays?",de:"Gibt es sonntags Flüge?",es:"¿Hay aviones disponibles los domingos?",fr:"Y a-t-il des vols disponibles le dimanche ?",tr:"Pazar günleri uçak var mı?",ar:"هل هناك طائرات متاحة يوم الأحد؟",zh:"星期天有航班吗？",ko:"일요일에 비행기가 있나요?",ja:"日曜日に飛行機はありますか？",hi:"क्या रविवार को कोई विमान उपलब्ध हैं?",ga:"An bhfuil aon eitleáin ar fáil Dé Domhnaigh?",uk:"Чи є рейси в неділю?"}},
  {id:1063,category:"train",level:"A1",t:{fa:"می خواهم پروازی برای شیکاگو روز شنبه رزرو کنم",en:"I'd like to book a flight to Chicago for Saturday",de:"Ich möchte einen Flug nach Chicago für Samstag buchen",es:"Me gustaría reservar un vuelo a Chicago para el sábado",fr:"Je voudrais réserver un vol pour Chicago samedi",tr:"Cumartesi için Chicago'ya uçak bileti ayırtmak istiyorum",ar:"أرغب في حجز رحلة إلى شيكاغو يوم السبت",zh:"我想预订周六去芝加哥的航班",ko:"토요일에 시카고로 가는 비행기를 예약하고 싶어요",ja:"土曜日のシカゴ行きのフライトを予約したいのですが",hi:"मैं शनिवार के लिए शिकागो के लिए उड़ान बुक करना चाहता हूँ",ga:"Ba mhaith liom eitilt go Chicago a chur in áirithe don Satharn",uk:"Я хотів би забронювати рейс до Чикаго на суботу"}},
  {id:1064,category:"train",level:"A1",t:{fa:"می خواهم سوم می به پاریس پرواز کنم",en:"I want to fly to Paris third of May",de:"Ich möchte am dritten Mai nach Paris fliegen",es:"Quiero volar a París el tres de mayo",fr:"Je veux voler à Paris le trois mai",tr:"Üç Mayıs'ta Paris'e uçmak istiyorum",ar:"أريد السفر إلى باريس في الثالث من مايو",zh:"我想五月三号飞往巴黎",ko:"5월 3일에 파리로 비행하고 싶어요",ja:"5月3日にパリに飛びたいです",hi:"मैं तीन मई को पेरिस के लिए उड़ान भरना चाहता हूँ",ga:"Ba mhaith liom eitilt go Páras an tríú lá de Bhealtaine",uk:"Я хочу летіти до Парижа третього травня"}},
  {id:1065,category:"train",level:"A1",t:{fa:"فردا پروازهایی برای لندن وجود دارد؟",en:"What flights are available to London for tomorrow?",de:"Welche Flüge gibt es morgen nach London?",es:"¿Qué vuelos hay disponibles a Londres para mañana?",fr:"Quels vols sont disponibles pour Londres demain ?",tr:"Yarın Londra'ya hangi uçuşlar var?",ar:"ما هي الرحلات المتاحة إلى لندن غدًا؟",zh:"明天有飞往伦敦的航班吗？",ko:"내일 런던으로 가는 항공편이 있나요?",ja:"明日ロンドン行きの便はありますか？",hi:"कल लंदन के लिए कौन सी उड़ानें उपलब्ध हैं?",ga:"Cén eitiltí atá ar fáil go Londain amárach?",uk:"Які рейси до Лондона є на завтра?"}},
  {id:1066,category:"train",level:"A1",t:{fa:"من یک بلیط درجه سه می خواهم / احتیاج دارم",en:"I want / need an economy class",de:"Ich möchte / brauche eine Economy-Klasse",es:"Quiero / necesito clase económica",fr:"Je veux / besoin d'une classe économique",tr:"Ekonomi sınıfı istiyorum / ihtiyacım var",ar:"أريد / أحتاج درجة اقتصادية",zh:"我想要/需要经济舱",ko:"이코노미 클래스가 필요해요",ja:"エコノミークラスが必要です",hi:"मुझे इकॉनमी क्लास चाहिए",ga:"Ba mhaith liom / teastaíonn uaim rang eacnamaíochta",uk:"Я хочу / потребую економ-клас"}},
  {id:1067,category:"train",level:"A1",t:{fa:"من به یک بلیط یکطرفه احتیاج دارم",en:"I need a one way ticket",de:"Ich brauche eine Einzelfahrkarte",es:"Necesito un billete de ida",fr:"J'ai besoin d'un billet simple",tr:"Tek yön biletine ihtiyacım var",ar:"أحتاج تذكرة ذهاب فقط",zh:"我需要单程票",ko:"편도 티켓이 필요해요",ja:"片道切符が必要です",hi:"मुझे एक तरफा टिकट चाहिए",ga:"Teastaíonn ticéad aonbhealaigh uaim",uk:"Мені потрібен квиток в один бік"}},
  {id:1068,category:"train",level:"A1",t:{fa:"من به یک بلیط دو طرفه احتیاج دارم",en:"I need a two way ticket",de:"Ich brauche eine Rückfahrkarte",es:"Necesito un billete de ida y vuelta",fr:"J'ai besoin d'un billet aller-retour",tr:"Gidiş-dönüş biletine ihtiyacım var",ar:"أحتاج تذكرة ذهاب وعودة",zh:"我需要往返票",ko:"왕복 티켓이 필요해요",ja:"往復切符が必要です",hi:"मुझे दो तरफा टिकट चाहिए",ga:"Teastaíonn ticéad fillte uaim",uk:"Мені потрібен квиток туди й назад"}},
  {id:1069,category:"train",level:"A1",t:{fa:"ترجیح میدهم با قطار درجه یک مسافرت کنم",en:"I'd prefer to travel first class",de:"Ich würde gerne erster Klasse reisen",es:"Preferiría viajar en primera clase",fr:"Je préférerais voyager en première classe",tr:"Birinci sınıfta seyahat etmeyi tercih ederim",ar:"أفضل السفر في الدرجة الأولى",zh:"我更喜欢坐头等舱旅行",ko:"일등석으로 여행하고 싶어요",ja:"ファーストクラスで旅行したいです",hi:"मैं फर्स्ट क्लास में यात्रा करना पसंद करूंगा",ga:"B'fhearr liom taisteal den chéad scoth",uk:"Я віддаю перевагу подорожувати першим класом"}},
  {id:1070,category:"train",level:"A1",t:{fa:"پرواز شبانه نمی خواهم",en:"I don't want a night flight",de:"Ich möchte keinen Nachtflug",es:"No quiero un vuelo nocturno",fr:"Je ne veux pas de vol de nuit",tr:"Gece uçuşu istemiyorum",ar:"لا أريد رحلة ليلية",zh:"我不要夜航",ko:"야간 비행은 원하지 않아요",ja:"夜間便は希望しません",hi:"मुझे रात की उड़ान नहीं चाहिए",ga:"Níl uaim eitilt oíche",uk:"Я не хочу нічного рейсу"}},
  {id:1071,category:"train",level:"A1",t:{fa:"صبح را ترجیح میدهم",en:"I'd prefer the morning",de:"Ich würde den Morgen bevorzugen",es:"Preferiría la mañana",fr:"Je préférerais le matin",tr:"Sabahı tercih ederim",ar:"أفضل الصباح",zh:"我更喜欢早上",ko:"오전을 선호해요",ja:"午前中を希望します",hi:"मैं सुबह पसंद करूंगा",ga:"B'fhearr liom an mhaidin",uk:"Я віддаю перевагу ранку"}},
  {id:1072,category:"train",level:"A1",t:{fa:"چه ساعتی باید آن جا باشم؟",en:"What time do I have to be there?",de:"Um wie viel Uhr muss ich dort sein?",es:"¿A qué hora tengo que estar allí?",fr:"À quelle heure dois-je être là ?",tr:"Orada saat kaçta olmalıyım?",ar:"في أي وقت يجب أن أكون هناك؟",zh:"我几点必须到那里？",ko:"거기에 몇 시까지 가야 하나요?",ja:"何時に着いていればいいですか？",hi:"मुझे वहाँ कितने बजे होना चाहिए?",ga:"Cén t-am a gcaithfidh mé a bheith ann?",uk:"О котрій годині мені потрібно там бути?"}},
  {id:1073,category:"train",level:"A1",t:{fa:"چه ساعتی باید به فرودگاه برسم؟",en:"What time should I get the airport?",de:"Wann sollte ich am Flughafen sein?",es:"¿A qué hora debería llegar al aeropuerto?",fr:"À quelle heure dois-je arriver à l'aéroport ?",tr:"Havaalanına saat kaçta varmalıyım?",ar:"في أي وقت يجب أن أصل إلى المطار؟",zh:"我应该几点到机场？",ko:"공항에 몇 시까지 도착해야 하나요?",ja:"空港には何時に着くべきですか？",hi:"मुझे हवाई अड्डे कितने बजे पहुँचना चाहिए?",ga:"Cén t-am ba chóir dom a bheith ag an aerfort?",uk:"О котрій годині я маю бути в аеропорту?"}},
  {id:1074,category:"train",level:"A1",t:{fa:"برای تحویل دادن چمدانها باید چه ساعتی مراجعه کنم؟",en:"What time am I supposed to check in?",de:"Wann soll ich einchecken?",es:"¿A qué hora debo hacer el check-in?",fr:"À quelle heure suis-je censé m'enregistrer ?",tr:"Check-in yapmam için saat kaçta orada olmalıyım?",ar:"في أي وقت من المفترض أن أقوم بتسجيل الوصول؟",zh:"我应该在什么时间办理登机手续？",ko:"몇 시에 체크인해야 하나요?",ja:"チェックインは何時ですか？",hi:"मुझे चेक इन कितने बजे करना है?",ga:"Cén t-am a bhfuiltear ag súil go ndéanfaidh mé seiceáil isteach?",uk:"О котрій годині я маю зареєструватися?"}},
  {id:1075,category:"train",level:"A1",t:{fa:"این قطار به مرکز شهر میرود",en:"This train goes to downtown",de:"Dieser Zug fährt in die Innenstadt",es:"Este tren va al centro",fr:"Ce train va au centre-ville",tr:"Bu tren şehir merkezine gidiyor",ar:"هذا القطار يتجه إلى وسط المدينة",zh:"这趟火车去市中心",ko:"이 기차는 시내로 가요",ja:"この電車はダウンタウン行きです",hi:"यह ट्रेन डाउनटाउन जाती है",ga:"Téann an traein seo go dtí lár na cathrach",uk:"Цей поїзд їде до центру міста"}},
  {id:1076,category:"train",level:"A1",t:{fa:"ساعت ۱۰/۲۵ حرکت میکند",en:"It'll leave at 10.25",de:"Er fährt um 10.25 Uhr ab",es:"Sale a las 10.25",fr:"Il part à 10h25",tr:"Saat 10.25'te kalkıyor",ar:"سيغادر الساعة 10.25",zh:"10点25分发车",ko:"10시 25분에 출발합니다",ja:"10時25分に出発します",hi:"यह 10.25 पर चलेगी",ga:"Fágfaidh sé ag 10.25",uk:"Відправляється о 10.25"}},
  {id:1077,category:"train",level:"A1",t:{fa:"شما باید به قطار شهر ریچموند سوار شوید",en:"You take the Richmond train",de:"Sie müssen den Zug nach Richmond nehmen",es:"Tome el tren de Richmond",fr:"Vous prenez le train de Richmond",tr:"Richmond trenine binmelisiniz",ar:"عليك ركوب قطار ريتشموند",zh:"你坐里士满方向的火车",ko:"리치먼드 행 기차를 타세요",ja:"リッチモンド行きの電車に乗ってください",hi:"आप रिचमंड ट्रेन लें",ga:"Glacann tú traein Richmond",uk:"Ви сідаєте на потяг до Ричмонда"}},
  {id:1078,category:"train",level:"A1",t:{fa:"ساعت ۱۲/۳۰ میرسد",en:"It'll arrive at 12.30",de:"Er kommt um 12.30 Uhr an",es:"Llega a las 12.30",fr:"Il arrive à 12h30",tr:"Saat 12.30'da varıyor",ar:"سيصل الساعة 12.30",zh:"12点30分到达",ko:"12시 30분에 도착합니다",ja:"12時30分に到着します",hi:"यह 12.30 पर आएगी",ga:"Sroichfidh sé ag 12.30",uk:"Прибуває о 12.30"}},
  {id:1079,category:"train",level:"A1",t:{fa:"شما باید ساعت ۲/۱۵ آنجا باشید",en:"You should be there at 2:15",de:"Sie sollten um 14.15 Uhr dort sein",es:"Debería estar allí a las 2:15",fr:"Vous devriez être là à 14h15",tr:"Saat 2.15'te orada olmalısınız",ar:"يجب أن تكون هناك الساعة 2.15",zh:"你2点15分应该在那里",ko:"2시 15분까지 거기에 계셔야 합니다",ja:"2時15分に着いているべきです",hi:"आपको 2:15 पर वहाँ होना चाहिए",ga:"Ba chóir duit a bheith ann ag 2:15",uk:"Вам слід бути там о 2:15"}},
  {id:1080,category:"train",level:"A1",t:{fa:"ما حدوداً ظرف ۲۰ دقیقه به آن جا میرسیم",en:"We get there in about 20 minutes",de:"Wir kommen in etwa 20 Minuten dort an",es:"Llegamos en unos 20 minutos",fr:"Nous y arrivons dans environ 20 minutes",tr:"Yaklaşık 20 dakika içinde oraya varıyoruz",ar:"نصل إلى هناك خلال حوالي 20 دقيقة",zh:"我们大约20分钟后到",ko:"우리는 약 20분 후에 도착합니다",ja:"約20分で到着します",hi:"हम लगभग 20 मिनट में वहाँ पहुँच जाते हैं",ga:"Sroicheann muid ansin i gceann thart ar 20 nóiméad",uk:"Ми прибудемо туди приблизно за 20 хвилин"}},
  {id:1081,category:"train",level:"A1",t:{fa:"بله در ایستگاه کرایدون شرقی عوض کنید",en:"Yes, change at East Crydon",de:"Ja, steigen Sie in East Crydon um",es:"Sí, cambie en East Crydon",fr:"Oui, changez à East Crydon",tr:"Evet, East Crydon'da değiştirin",ar:"نعم، غيّر في محطة إيست كرايدون",zh:"是的，在东克莱顿换乘",ko:"네, East Crydon에서 갈아타세요",ja:"はい、イーストクライドンで乗り換えてください",hi:"हाँ, ईस्ट क्राइडन पर बदलें",ga:"Sea, athraigh ag East Crydon",uk:"Так, пересідайте на Іст-Крайдоні"}},
  {id:1082,category:"train",level:"A1",t:{fa:"خیر، احتیاجی به تعویض نیست",en:"No, there is no need to change",de:"Nein, Sie müssen nicht umsteigen",es:"No, no es necesario cambiar",fr:"Non, il n'est pas nécessaire de changer",tr:"Hayır, değiştirmeye gerek yok",ar:"لا، لا حاجة للتغيير",zh:"不，不需要换乘",ko:"아니요, 갈아탈 필요가 없습니다",ja:"いいえ、乗り換える必要はありません",hi:"नहीं, बदलने की कोई आवश्यकता नहीं है",ga:"Níl, níl gá le hathrú",uk:"Ні, пересідати не потрібно"}},
  {id:1083,category:"train",level:"A1",t:{fa:"بگذارید ببینم چه پروازهایی وجود دارد",en:"I'll see what's available",de:"Ich schaue nach, was verfügbar ist",es:"Veré qué está disponible",fr:"Je vais voir ce qui est disponible",tr:"Ne var ne yok bakayım",ar:"سأرى ما هو متاح",zh:"我看看有什么可用的",ko:"무엇이 있는지 확인해 보겠습니다",ja:"何があるか見てみます",hi:"मैं देखता हूँ क्या उपलब्ध है",ga:"Feicfidh mé cad atá ar fáil",uk:"Я подивлюся, що є в наявності"}},
  {id:1084,category:"train",level:"A1",t:{fa:"رسیدگی میکنم",en:"I'll check",de:"Ich werde nachsehen",es:"Lo comprobaré",fr:"Je vais vérifier",tr:"Kontrol edeceğim",ar:"سأتأكد",zh:"我去查一下",ko:"확인해 보겠습니다",ja:"確認します",hi:"मैं जाँच करूँगा",ga:"Déanfaidh mé seiceáil",uk:"Я перевірю"}},
  {id:1085,category:"train",level:"A1",t:{fa:"برای شما مشخص میکنم",en:"I'll find out for you",de:"Ich werde es für Sie herausfinden",es:"Lo averiguaré para usted",fr:"Je vais me renseigner pour vous",tr:"Sizin için öğreneceğim",ar:"سأستعلم لك",zh:"我帮你查一下",ko:"알아봐 드리겠습니다",ja:"お調べします",hi:"मैं आपके लिए पता करूँगा",ga:"Gheobhaidh mé amach duit",uk:"Я дізнаюся для вас"}},
  {id:1086,category:"train",level:"A1",t:{fa:"پرواز ۷۷۷ ساعت ۱۰:۴۵ حرکت میکند",en:"Flight 777 is leaving at 10:45",de:"Flug 777 startet um 10:45 Uhr",es:"El vuelo 777 sale a las 10:45",fr:"Le vol 777 décolle à 10h45",tr:"777 sefer sayılı uçuş 10.45'te kalkıyor",ar:"الرحلة 777 تقلع الساعة 10.45",zh:"777航班10点45分起飞",ko:"777편이 10시 45분에 출발합니다",ja:"777便は10時45分に出発します",hi:"फ्लाइट 777 10:45 पर निकलेगी",ga:"Eitilt 777 ag fágáil ag 10:45",uk:"Рейс 777 вилітає о 10:45"}},
  {id:1087,category:"train",level:"A1",t:{fa:"پانام در ساعت ۸/۴۵ دقیقه بعد از ظهر از بستون بلند می شود",en:"Pan Am takes off from Boston at 8.45 PM",de:"Pan Am startet um 20.45 Uhr in Boston",es:"Pan Am despega de Boston a las 8.45 PM",fr:"Pan Am décolle de Boston à 20h45",tr:"Pan Am, Boston'dan saat 20.45'te kalkıyor",ar:"بان أم تقلع من بوسطن الساعة 8.45 مساءً",zh:"泛美航空晚上8点45分从波士顿起飞",ko:"팬암이 오후 8시 45분에 보스턴에서 이륙합니다",ja:"パンナムは午後8時45分にボストンを離陸します",hi:"पैन एम शाम 8:45 पर बोस्टन से उड़ान भरता है",ga:"Pan Am ag éirí as Boston ag 8.45 i.n.",uk:"Pan Am вилітає з Бостона о 20:45"}},
  {id:1088,category:"train",level:"A1",t:{fa:"شما می توانید سر ساعت ۹ صبح به اتوبوس فرودگاه سوار شوید",en:"You can catch the airport bus at 9:00",de:"Sie können den Flughafenbus um 9.00 Uhr nehmen",es:"Puede tomar el autobús del aeropuerto a las 9:00",fr:"Vous pouvez prendre le bus de l'aéroport à 9h00",tr:"Saat 9.00'da havaalanı otobüsüne binebilirsiniz",ar:"يمكنك ركوب حافلة المطار الساعة 9.00",zh:"你可以在9点坐机场大巴",ko:"9시에 공항 버스를 탈 수 있습니다",ja:"9時に空港バスに乗れます",hi:"आप 9:00 पर एयरपोर्ट बस पकड़ सकते हैं",ga:"Is féidir leat bus an aerfoirt a fháil ag 9:00",uk:"Ви можете сісти на автобус до аеропорту о 9:00"}},
  {id:1089,category:"train",level:"A1",t:{fa:"اتوبوس کرایه ساعت ۹/۰۵ به مقصد فرودگاه حرکت خواهد کرد",en:"The coach leaves for the airport at 9:05",de:"Der Reisebus fährt um 9.05 Uhr zum Flughafen",es:"El autobús sale para el aeropuerto a las 9:05",fr:"Le car part pour l'aéroport à 9h05",tr:"Otobüs havaalanına saat 9.05'te kalkıyor",ar:"تنطلق الحافلة إلى المطار الساعة 9.05",zh:"大巴9点05分开往机场",ko:"공항행 버스가 9시 5분에 출발합니다",ja:"空港行きのバスは9時5分に出発します",hi:"कोच 9:05 पर एयरपोर्ट के लिए रवाना होती है",ga:"Fágann an cóiste don aerfort ag 9:05",uk:"Автобус відправляється до аеропорту о 9:05"}},
  {id:1090,category:"train",level:"A1",t:{fa:"شما باید قبل از ساعت ۷/۴۰ دقیقه در فرودگاه باشید",en:"You must be at the airport before 7:40 AM",de:"Sie müssen vor 7.40 Uhr am Flughafen sein",es:"Debe estar en el aeropuerto antes de las 7:40 AM",fr:"Vous devez être à l'aéroport avant 7h40",tr:"Saat 7.40'tan önce havaalanında olmalısınız",ar:"يجب أن تكون في المطار قبل الساعة 7.40 صباحاً",zh:"你必须在早上7点40分之前到达机场",ko:"오전 7시 40분까지 공항에 도착하셔야 합니다",ja:"午前7時40分までに空港に着いている必要があります",hi:"आपको सुबह 7:40 से पहले हवाई अड्डे पर होना चाहिए",ga:"Caithfidh tú a bheith ag an aerfort roimh 7:40 r.n.",uk:"Ви повинні бути в аеропорту до 7:40 ранку"}},
  {id:1091,category:"train",level:"A1",t:{fa:"همه روزه با چه وسیله ای به خانه می روید؟",en:"How do you get home everyday?",de:"Wie kommen Sie jeden Tag nach Hause?",es:"¿Cómo llega a casa todos los días?",fr:"Comment rentrez-vous chez vous tous les jours ?",tr:"Her gün eve nasıl gidiyorsunuz?",ar:"كيف تصل إلى المنزل كل يوم؟",zh:"你每天怎么回家？",ko:"매일 어떻게 집에 가나요?",ja:"毎日どのように帰宅しますか？",hi:"आप हर दिन घर कैसे जाते हैं?",ga:"Conas a fhaigheann tú abhaile gach lá?",uk:"Як ви добираєтеся додому щодня?"}},
  {id:1092,category:"train",level:"A1",t:{fa:"کرایه آن چند است؟",en:"What's the fare?",de:"Wie hoch ist der Fahrpreis?",es:"¿Cuánto cuesta el billete?",fr:"Quel est le prix du billet ?",tr:"Ücret ne kadar?",ar:"كم سعر التذكرة؟",zh:"车费多少钱？",ko:"요금이 얼마인가요?",ja:"運賃はいくらですか？",hi:"किराया कितना है?",ga:"Cé mhéad an táille?",uk:"Скільки коштує проїзд?"}},
  {id:1093,category:"train",level:"A1",t:{fa:"خوب، مسافرتتان چطور بود؟",en:"Well, how was your trip?",de:"Nun, wie war Ihre Reise?",es:"Bueno, ¿cómo fue su viaje?",fr:"Alors, comment était votre voyage ?",tr:"Peki, seyahatiniz nasıldı?",ar:"حسنًا، كيف كانت رحلتك؟",zh:"好的，你的旅行怎么样？",ko:"글쎄요, 여행은 어땠나요?",ja:"さて、旅はどうでしたか？",hi:"खैर, आपकी यात्रा कैसी थी?",ga:"Bhuel, conas a bhí do thuras?",uk:"Ну, як пройшла ваша подорож?"}},
  {id:1094,category:"train",level:"A1",t:{fa:"من سوار قطار مسافربری میشوم",en:"I take the commuter train",de:"Ich nehme die S-Bahn",es:"Tomo el tren de cercanías",fr:"Je prends le train de banlieue",tr:"Banliyö trenine binerim",ar:"أركب قطار الركاب",zh:"我坐通勤火车",ko:"통근 열차를 타요",ja:"通勤電車に乗ります",hi:"मैं कम्यूटर ट्रेन लेता हूँ",ga:"Glacaim an traein comaitéireachta",uk:"Я сідаю на приміську електричку"}},
  {id:1095,category:"train",level:"A1",t:{fa:"(کرایه) رفت و برگشت 5 دلار است",en:"It's a five-dollar round trip",de:"Es kostet fünf Dollar hin und zurück",es:"Es un viaje de ida y vuelta de cinco dólares",fr:"C'est un aller-retour à cinq dollars",tr:"Beş dolarlık gidiş-dönüş",ar:"رحلة ذهاب وعودة بخمسة دولارات",zh:"五美元的往返票",ko:"5달러 왕복입니다",ja:"往復5ドルです",hi:"यह पाँच डॉलर का राउंड ट्रिप है",ga:"Tá sé cúig dollar turas fillte",uk:"Це п'ять доларів туди й назад"}},
  {id:1096,category:"train",level:"A1",t:{fa:"آن سفر من راحت بود",en:"It/ my trip was comfortable",de:"Es / meine Reise war angenehm",es:"Mi viaje fue cómodo",fr:"Mon voyage était confortable",tr:"Seyahatim rahattı",ar:"رحلتي كانت مريحة",zh:"我的旅行很舒适",ko:"내 여행은 편안했어요",ja:"旅は快適でした",hi:"मेरी यात्रा आरामदायक थी",ga:"Bhí mo thuras compordach",uk:"Моя подорож була комфортною"}},
  {id:1097,category:"taxi",level:"A1",t:{fa:"به یک تاکسی تلفنی زنگ بزنید",en:"Call a taxi (cab)",de:"Rufen Sie ein Taxi",es:"Llame un taxi",fr:"Appelez un taxi",tr:"Taksi çağırın",ar:"اتصل بسيارة أجرة",zh:"叫一辆出租车",ko:"택시를 부르세요",ja:"タクシーを呼んでください",hi:"टैक्सी बुलाओ",ga:"Glaoigh ar cháb",uk:"Викличте таксі"}},
  {id:1098,category:"taxi",level:"A1",t:{fa:"من عجله دارم",en:"I'm in a hurry",de:"Ich habe es eilig",es:"Tengo prisa",fr:"Je suis pressé",tr:"Acelem var",ar:"أنا في عجلة من أمري",zh:"我很急",ko:"급해요",ja:"急いでいます",hi:"मुझे जल्दी है",ga:"Tá deifir orm",uk:"Я поспішаю"}},
  {id:1099,category:"taxi",level:"A1",t:{fa:"باید یک تاکسی بگیرم",en:"I should take a taxi",de:"Ich sollte ein Taxi nehmen",es:"Debería tomar un taxi",fr:"Je devrais prendre un taxi",tr:"Taksi tutmalıyım",ar:"يجب أن أستقل سيارة أجرة",zh:"我应该坐出租车",ko:"택시를 타야 해요",ja:"タクシーに乗るべきです",hi:"मुझे टैक्सी लेनी चाहिए",ga:"Ba chóir dom cab a ghlacadh",uk:"Мені варто взяти таксі"}},
  {id:1100,category:"taxi",level:"A1",t:{fa:"لطفاً آهسته تر برانید",en:"Please drive slower",de:"Bitte fahren Sie langsamer",es:"Por favor, conduzca más despacio",fr:"Veuillez conduire plus lentement",tr:"Lütfen daha yavaş sürün",ar:"من فضلك قود بشكل أبطأ",zh:"请开慢一点",ko:"천천히 운전해 주세요",ja:"ゆっくり運転してください",hi:"कृपया धीरे चलाएं",ga:"Tiomáin níos moille le do thoil",uk:"Будь ласка, їдьте повільніше"}},
  {id:1101,category:"taxi",level:"A1",t:{fa:"لطفاً تندتر برانید",en:"Please drive faster",de:"Bitte fahren Sie schneller",es:"Por favor, conduzca más rápido",fr:"Veuillez conduire plus vite",tr:"Lütfen daha hızlı sürün",ar:"من فضلك قود بشكل أسرع",zh:"请开快一点",ko:"빨리 운전해 주세요",ja:"速く運転してください",hi:"कृपया तेज़ चलाएं",ga:"Tiomáin níos tapúla le do thoil",uk:"Будь ласка, їдьте швидше"}},
  {id:1102,category:"taxi",level:"A1",t:{fa:"لطفاً اینجا توقف کنید",en:"Please stop here",de:"Bitte halten Sie hier",es:"Por favor, pare aquí",fr:"Arrêtez-vous ici s'il vous plaît",tr:"Lütfen burada durun",ar:"من فضلك توقف هنا",zh:"请在这里停一下",ko:"여기서 세워주세요",ja:"ここで止めてください",hi:"कृपया यहाँ रुकें",ga:"Stop anseo le do thoil",uk:"Будь ласка, зупиніться тут"}},
  {id:1103,category:"taxi",level:"A1",t:{fa:"من به مهمانسرای Holiday Inn می روم",en:"I go to Holiday Inn",de:"Ich fahre zum Holiday Inn",es:"Voy al Holiday Inn",fr:"Je vais au Holiday Inn",tr:"Holiday Inn'e gidiyorum",ar:"أنا ذاهب إلى هوليداي إن",zh:"我去假日酒店",ko:"Holiday Inn으로 가요",ja:"ホリデイインに行きます",hi:"मैं हॉलिडे इन जा रहा हूँ",ga:"Téim go Holiday Inn",uk:"Я їду до Holiday Inn"}},
  {id:1104,category:"taxi",level:"A1",t:{fa:"لطفاً منتظر من باشید",en:"Please wait for me",de:"Bitte warten Sie auf mich",es:"Por favor, espéreme",fr:"Attendez-moi s'il vous plaît",tr:"Lütfen beni bekleyin",ar:"من فضلك انتظرني",zh:"请等我",ko:"저를 기다려주세요",ja:"私を待ってください",hi:"कृपया मेरा इंतज़ार करें",ga:"Fan orm le do thoil",uk:"Будь ласка, зачекайте на мене"}},
  {id:1105,category:"taxi",level:"A1",t:{fa:"(پولش چقدر خواهد شد؟",en:"How much will that be?",de:"Wie viel wird das kosten?",es:"¿Cuánto será?",fr:"Ça fera combien ?",tr:"Bu ne kadar tutar?",ar:"كم سيكون ذلك؟",zh:"那要多少钱？",ko:"그럼 얼마인가요?",ja:"いくらになりますか？",hi:"वह कितना होगा?",ga:"Cé mhéad a bheidh air?",uk:"Скільки це коштуватиме?"}},
  {id:1106,category:"taxi",level:"A1",t:{fa:"خیلی زیاد است",en:"It's too much",de:"Das ist zu viel",es:"Es demasiado",fr:"C'est trop",tr:"Çok fazla",ar:"إنه كثير جدًا",zh:"太贵了",ko:"너무 비싸요",ja:"高すぎます",hi:"यह बहुत ज्यादा है",ga:"Tá sé ró-iomarca",uk:"Це занадто багато"}},
  {id:1107,category:"taxi",level:"A1",t:{fa:"لطفاً به فرودگاه سانفرانسیسکو بروید",en:"San Francisco airport please",de:"Zum Flughafen San Francisco bitte",es:"Al aeropuerto de San Francisco, por favor",fr:"À l'aéroport de San Francisco s'il vous plaît",tr:"San Francisco havaalanına lütfen",ar:"إلى مطار سان فرانسيسكو من فضلك",zh:"请去旧金山机场",ko:"샌프란시스코 공항으로 가주세요",ja:"サンフランシスコ空港へお願いします",hi:"सैन फ्रांसिस्को हवाई अड्डा कृपया",ga:"Aerfort San Francisco le do thoil",uk:"До аеропорту Сан-Франциско, будь ласка"}},
  {id:1108,category:"taxi",level:"A1",t:{fa:"لطفاً مرا به سیرک پیکادلی ببرید",en:"Please take me to Piccadilly Circus",de:"Bitte bringen Sie mich zum Piccadilly Circus",es:"Por favor, lléveme a Piccadilly Circus",fr:"Veuillez me conduire à Piccadilly Circus",tr:"Lütfen beni Piccadilly Circus'a götürün",ar:"من فضلك خذني إلى ميدان بيكاديلي",zh:"请带我去皮卡迪利广场",ko:"Piccadilly Circus로 데려다주세요",ja:"ピカデリーサーカスまでお願いします",hi:"कृपया मुझे पिकाडिली सर्कस ले चलें",ga:"Tabhair go dtí Piccadilly Circus mé le do thoil",uk:"Будь ласка, відвезіть мене на Пікаділлі-Серкус"}},
  {id:1109,category:"taxi",level:"A1",t:{fa:"لطفاً ایستگاه مک آرتور",en:"Mac. Arthur station, please",de:"MacArthur-Station bitte",es:"Estación MacArthur, por favor",fr:"Station MacArthur s'il vous plaît",tr:"Mac Arthur istasyonu lütfen",ar:"محطة ماكارثر من فضلك",zh:"请去麦克阿瑟车站",ko:"Mac Arthur 역으로 가주세요",ja:"マッカーサー駅へお願いします",hi:"मैक आर्थर स्टेशन कृपया",ga:"Stáisiún Mac Arthur le do thoil",uk:"Станція Мак-Артур, будь ласка"}},
  {id:1110,category:"taxi",level:"A1",t:{fa:"باید تا / در ساعت ۱۱ آنجا باشم",en:"I have to be there by (at) 11",de:"Ich muss um 11 dort sein",es:"Tengo que estar allí a las 11",fr:"Je dois être là à 11h",tr:"Saat 11'de orada olmalıyım",ar:"يجب أن أكون هناك الساعة 11",zh:"我必须在11点前到那里",ko:"11시까지 거기에 있어야 해요",ja:"11時までに着いていなければなりません",hi:"मुझे 11 बजे तक वहाँ पहुँचना है",ga:"Caithfidh mé a bheith ann faoi 11",uk:"Я маю бути там до 11"}},
  {id:1111,category:"taxi",level:"A1",t:{fa:"آیا می توانید در حمل ساکها کمکم کنید؟",en:"Could you help me with my bags?",de:"Könnten Sie mir mit meinen Taschen helfen?",es:"¿Podría ayudarme con mis maletas?",fr:"Pourriez-vous m'aider avec mes bagages ?",tr:"Çantalarımda bana yardımcı olabilir misiniz?",ar:"هل يمكنك مساعدتي في حمل حقائبي؟",zh:"你能帮我拿行李吗？",ko:"제 가방을 좀 도와주실 수 있나요?",ja:"荷物を手伝っていただけますか？",hi:"क्या आप मेरे बैग में मदद कर सकते हैं?",ga:"An bhféadfá cabhrú liom le mo mhálaí?",uk:"Ви можете допомогти мені з моїми сумками?"}},
  {id:1112,category:"taxi",level:"A1",t:{fa:"رسیدیم، آقا",en:"Here we are, Sir",de:"Wir sind da, Sir",es:"Aquí estamos, señor",fr:"Nous y sommes, Monsieur",tr:"Burdaz, efendim",ar:"لقد وصلنا يا سيدي",zh:"到了，先生",ko:"도착했습니다, 선생님",ja:"着きました、先生",hi:"हम यहाँ पहुँच गए, महोदय",ga:"Seo muid, a Dhuine Uasail",uk:"Ми приїхали, сер"}},
  {id:1113,category:"taxi",level:"A1",t:{fa:"همین جاست آقا",en:"This is it, Sir",de:"Das ist es, Sir",es:"Aquí es, señor",fr:"C'est ici, Monsieur",tr:"İşte burası, efendim",ar:"ها هو، يا سيدي",zh:"就是这里，先生",ko:"여기예요, 선생님",ja:"ここです、先生",hi:"यही है, महोदय",ga:"Seo é, a Dhuine Uasail",uk:"Це воно, сер"}},
  {id:1114,category:"taxi",level:"A1",t:{fa:"شما درست سر وقت رسیدید",en:"You are just in time",de:"Sie sind gerade rechtzeitig",es:"Llegó justo a tiempo",fr:"Vous arrivez juste à temps",tr:"Tam zamanında geldiniz",ar:"لقد وصلت في الوقت المناسب تمامًا",zh:"你刚好准时",ko:"제시간에 오셨어요",ja:"ちょうど間に合いました",hi:"आप बिल्कुल समय पर आए",ga:"Tá tú díreach in am",uk:"Ви якраз вчасно"}},
  {id:1115,category:"taxi",level:"A1",t:{fa:"لطفاً ۸/۵ دلار بدهید",en:"8 Dollars and fifty Cents please",de:"8 Dollar und 50 Cent bitte",es:"8 dólares con cincuenta centavos, por favor",fr:"8 dollars et cinquante cents s'il vous plaît",tr:"8 dolar 50 sent lütfen",ar:"ثمانية دولارات ونصف من فضلك",zh:"请付8.5美元",ko:"8달러 50센트 주세요",ja:"8ドル50セントお願いします",hi:"कृपया साढ़े आठ डॉलर दें",ga:"Ocht ndollar go leith le do thoil",uk:"Будь ласка, вісім доларів п'ятдесят центів"}},
  {id:1116,category:"taxi",level:"A1",t:{fa:"لطفاً ۴ پوند بدهید",en:"Four pounds please",de:"Vier Pfund bitte",es:"Cuatro libras, por favor",fr:"Quatre livres s'il vous plaît",tr:"Dört pound lütfen",ar:"أربعة جنيهات من فضلك",zh:"请付4英镑",ko:"4파운드 주세요",ja:"4ポンドお願いします",hi:"कृपया चार पाउंड दें",ga:"Ceithre phunt le do thoil",uk:"Чотири фунти, будь ласка"}},
  {id:1117,category:"taxi",level:"A1",t:{fa:"۳۰ دلار میشود",en:"That'll be $ 30",de:"Das macht 30 Dollar",es:"Serán 30 dólares",fr:"Ça fera 30 dollars",tr:"30 dolar olacak",ar:"سيكون 30 دولارًا",zh:"一共30美元",ko:"30달러입니다",ja:"30ドルです",hi:"यह 30 डॉलर होगा",ga:"Beidh sé $30",uk:"Буде 30 доларів"}},
  {id:1118,category:"taxi",level:"A1",t:{fa:"متشکرم بفرمایید هشت دلار",en:"Thank a lot. Here's $ 8",de:"Vielen Dank. Hier sind 8 Dollar",es:"Muchas gracias. Aquí tiene 8 dólares",fr:"Merci beaucoup. Voici 8 dollars",tr:"Çok teşekkürler. 8 dolar buyrun",ar:"شكرًا جزيلاً. تفضل 8 دولارات",zh:"非常感谢。给你8美元",ko:"감사합니다. 8달러입니다",ja:"ありがとうございます。8ドルです",hi:"बहुत धन्यवाद। ये रहे 8 डॉलर",ga:"Go raibh míle maith agat. Seo $8",uk:"Дуже дякую. Ось 8 доларів"}},
  {id:1119,category:"taxi",level:"A1",t:{fa:"متشکرم. این هم یک ۱۰ دلاری",en:"Thanks. Here's a $ 10",de:"Danke. Hier sind 10 Dollar",es:"Gracias. Aquí tiene 10 dólares",fr:"Merci. Voici 10 dollars",tr:"Teşekkürler. 10 dolar buyrun",ar:"شكرًا. تفضل 10 دولارات",zh:"谢谢。给你10美元",ko:"감사합니다. 10달러입니다",ja:"ありがとうございます。10ドルです",hi:"धन्यवाद। ये रहे 10 डॉलर",ga:"Go raibh maith agat. Seo $10",uk:"Дякую. Ось 10 доларів"}},
  {id:1120,category:"taxi",level:"A1",t:{fa:"شما می توانید بقیه اش را نگهدارید",en:"You can keep the change",de:"Sie können das Wechselgeld behalten",es:"Puede quedarse con el cambio",fr:"Vous pouvez garder la monnaie",tr:"Üstü kalsın",ar:"يمكنك الاحتفاظ بالباقي",zh:"零钱不用找了",ko:"잔돈은 가지세요",ja:"おつりは結構です",hi:"आप बचे हुए पैसे रख सकते हैं",ga:"Is féidir leat an t-airgead a choinneáil",uk:"Можете залишити решту собі"}},
  {id:1121,category:"taxi",level:"A1",t:{fa:"بفرمایید ۵ پوند",en:"Here's five pounds",de:"Hier sind fünf Pfund",es:"Aquí tiene cinco libras",fr:"Voici cinq livres",tr:"Beş pound buyrun",ar:"تفضل خمسة جنيهات",zh:"给你5英镑",ko:"5파운드입니다",ja:"5ポンドです",hi:"ये रहे पाँच पाउंड",ga:"Seo cúig phunt",uk:"Ось п'ять фунтів"}},
  {id:1122,category:"taxi",level:"A1",t:{fa:"با قیمانده اش را بدهید",en:"Give me the change please",de:"Geben Sie mir bitte das Wechselgeld",es:"Deme el cambio por favor",fr:"Donnez-moi la monnaie s'il vous plaît",tr:"Üstümü verin lütfen",ar:"أعطني الباقي من فضلك",zh:"请找零给我",ko:"잔돈을 주세요",ja:"お釣りをください",hi:"कृपया मुझे बचे हुए पैसे दें",ga:"Tabhair an t-airgead dom le do thoil",uk:"Будь ласка, дайте мені решту"}},
  {id:1123,category:"taxi",level:"A1",t:{fa:"این کرایه و این هم انعام شما",en:"Here's the fare, and this is for you",de:"Hier ist der Fahrpreis, und das ist für Sie",es:"Aquí está el precio, y esto es para usted",fr:"Voici le prix, et ceci est pour vous",tr:"Ücret buyrun, bu da size",ar:"هذه الأجرة، وهذا لك",zh:"这是车费，这是给你的小费",ko:"요금입니다, 그리고 이건 당신을 위한 거예요",ja:"運賃です、そしてこれはあなたへのチップです",hi:"ये रहा किराया, और यह आपके लिए है",ga:"Seo an táille, agus seo duitse",uk:"Ось плата за проїзд, а це вам"}},
  {id:1124,category:"gas",level:"A1",t:{fa:"لطفاً ۵ پوند بنزین سوپر بدهید",en:"Five pounds worth of super please",de:"Fünf Pfund Super bitte",es:"Cinco libras de súper, por favor",fr:"Cinq livres de super s'il vous plaît",tr:"Beş poundluk süper benzin lütfen",ar:"خمسة جنيهات من البنزين الممتاز من فضلك",zh:"请加5英镑的超级汽油",ko:"5파운드어치 슈퍼 가솔린 주세요",ja:"スーパーを5ポンド分お願いします",hi:"कृपया पाँच पाउंड का सुपर पेट्रोल दें",ga:"Cúig phunt de shár-pheitreal le do thoil",uk:"Будь ласка, п'ять фунтів супер-бензину"}},
  {id:1125,category:"gas",level:"A1",t:{fa:"لطفاً به اندازه ۱۰ دلار بنزین بدون سرب بدهید",en:"Ten dollars worth of unleaded (gas) please",de:"Zehn Dollar bleifreies Benzin bitte",es:"Diez dólares de gasolina sin plomo, por favor",fr:"Dix dollars d'essence sans plomb s'il vous plaît",tr:"On dolarlık kurşunsuz benzin lütfen",ar:"عشرة دولارات من البنزين الخالي من الرصاص من فضلك",zh:"请加10美元的无铅汽油",ko:"10달러어치 무연 가솔린 주세요",ja:"無鉛ガソリンを10ドル分お願いします",hi:"कृपया दस डॉलर का अनलेडेड पेट्रोल दें",ga:"Deich ndollair de pheitreal gan luaidhe le do thoil",uk:"Будь ласка, десять доларів неетилованого бензину"}},
  {id:1126,category:"gas",level:"A1",t:{fa:"لطفاً ۶ گالن بنزین معمولی بدهید",en:"Six gallon of regular (gas), please",de:"Sechs Gallonen Normalbenzin bitte",es:"Seis galones de gasolina regular, por favor",fr:"Six gallons d'essence ordinaire s'il vous plaît",tr:"Altı galon normal benzin lütfen",ar:"ستة غالونات من البنزين العادي من فضلك",zh:"请加6加仑普通汽油",ko:"6갤런 일반 가솔린 주세요",ja:"レギュラーガソリンを6ガロンお願いします",hi:"कृपया छह गैलन नियमित पेट्रोल दें",ga:"Sé ghailín de ghnáth-pheitreal le do thoil",uk:"Будь ласка, шість галонів звичайного бензину"}},
  {id:1127,category:"gas",level:"A1",t:{fa:"لطفاً باک را پر کنید",en:"Fill it up, please",de:"Bitte füllen Sie den Tank",es:"Llene el tanque, por favor",fr:"Faites le plein s'il vous plaît",tr:"Lütfen depoyu doldurun",ar:"املأ الخزان من فضلك",zh:"请加满",ko:"가득 채워주세요",ja:"満タンにしてください",hi:"कृपया टैंक भर दें",ga:"Líon é suas le do thoil",uk:"Будь ласка, заповніть бак"}},
  {id:1128,category:"gas",level:"A1",t:{fa:"لازم است باک را پر کنم",en:"I need to fill up the tank",de:"Ich muss den Tank füllen",es:"Necesito llenar el tanque",fr:"Je dois faire le plein",tr:"Depoyu doldurmam gerek",ar:"أحتاج إلى ملء الخزان",zh:"我需要加油",ko:"탱크를 채워야 해요",ja:"タンクを満タンにする必要があります",hi:"मुझे टैंक भरना है",ga:"Caithfidh mé an umar a líonadh",uk:"Мені потрібно заповнити бак"}},
  {id:1129,category:"gas",level:"A1",t:{fa:"لازم است قدری بنزین بزنم",en:"I need to put some gas",de:"Ich muss etwas Benzin tanken",es:"Necesito poner algo de gasolina",fr:"J'ai besoin de mettre de l'essence",tr:"Biraz benzin almam gerek",ar:"أحتاج إلى وضع بعض البنزين",zh:"我需要加点油",ko:"기름을 좀 넣어야 해요",ja:"ガソリンを入れなければなりません",hi:"मुझे थोड़ा पेट्रोल डालना है",ga:"Caithfidh mé roinnt peitreal a chur",uk:"Мені потрібно залити трохи бензину"}},
  {id:1130,category:"gas",level:"A1",t:{fa:"گاراژ این طرفها کجاست؟",en:"Where's a garage?",de:"Wo ist eine Garage?",es:"¿Dónde hay un garaje?",fr:"Où est un garage ?",tr:"Garaj nerede?",ar:"أين يوجد مرآب؟",zh:"修车厂在哪里？",ko:"수리공장이 어디인가요?",ja:"ガレージはどこですか？",hi:"गैरेज कहाँ है?",ga:"Cá bhfuil garáiste?",uk:"Де гараж?"}},
  {id:1131,category:"gas",level:"A1",t:{fa:"تعمیرگاه کجاست؟",en:"Where's a service station?",de:"Wo ist eine Werkstatt?",es:"¿Dónde hay una estación de servicio?",fr:"Où est une station-service ?",tr:"Servis istasyonu nerede?",ar:"أين توجد محطة خدمة؟",zh:"服务站在哪里？",ko:"정비소가 어디인가요?",ja:"サービスステーションはどこですか？",hi:"सर्विस स्टेशन कहाँ है?",ga:"Cá bhfuil stáisiún seirbhíse?",uk:"Де станція техобслуговування?"}},
  {id:1132,category:"gas",level:"A1",t:{fa:"پمپ بنزین کجاست؟",en:"Where's a gas station?",de:"Wo ist eine Tankstelle?",es:"¿Dónde hay una gasolinera?",fr:"Où est une station-service ?",tr:"Benzin istasyonu nerede?",ar:"أين توجد محطة بنزين؟",zh:"加油站在哪里？",ko:"주유소가 어디인가요?",ja:"ガソリンスタンドはどこですか？",hi:"गैस स्टेशन कहाँ है?",ga:"Cá bhfuil stáisiún gáis?",uk:"Де заправна станція?"}},
  {id:1133,category:"gas",level:"A1",t:{fa:"ماشین شویی کجاست؟",en:"Where's a car wash?",de:"Wo ist eine Autowaschanlage?",es:"¿Dónde hay un lavadero de autos?",fr:"Où est une station de lavage ?",tr:"Araba yıkama nerede?",ar:"أين توجد مغسلة سيارات؟",zh:"洗车场在哪里？",ko:"세차장이 어디인가요?",ja:"洗車場はどこですか？",hi:"कार वॉश कहाँ है?",ga:"Cá bhfuil níochán carr?",uk:"Де автомийка?"}},
  {id:1134,category:"gas",level:"A1",t:{fa:"گلگیر سازی (صافکاری) کجاست؟",en:"Where's a body shop?",de:"Wo ist eine Karosseriewerkstatt?",es:"¿Dónde hay un taller de carrocería?",fr:"Où est un carrossier ?",tr:"Kaporta tamircisi nerede?",ar:"أين يوجد ورشة هيكل السيارات؟",zh:"钣金修理厂在哪里？",ko:"판금 공장이 어디인가요?",ja:"板金工場はどこですか？",hi:"बॉडी शॉप कहाँ है?",ga:"Cá bhfuil ceardlann choirp?",uk:"Де кузовна майстерня?"}},
  {id:1135,category:"gas",level:"A1",t:{fa:"مکانیکی کجاست؟",en:"Where's a mechanic shop?",de:"Wo ist eine Mechanikerwerkstatt?",es:"¿Dónde hay un taller mecánico?",fr:"Où est un atelier de mécanique ?",tr:"Tamir atölyesi nerede?",ar:"أين ورشة الميكانيكي؟",zh:"修理厂在哪里？",ko:"정비 공장이 어디인가요?",ja:"修理工場はどこですか？",hi:"मैकेनिक शॉप कहाँ है?",ga:"Cá bhfuil ceardlann mheicneora?",uk:"Де майстерня механіка?"}},
  {id:1136,category:"gas",level:"A1",t:{fa:"آیا امروز به سفر میروید؟",en:"Are you taking a trip today?",de:"Machen Sie heute eine Reise?",es:"¿Hace un viaje hoy?",fr:"Vous partez en voyage aujourd'hui ?",tr:"Bugün seyahate mi çıkıyorsunuz?",ar:"هل ستسافر اليوم؟",zh:"你今天要旅行吗？",ko:"오늘 여행 가시나요?",ja:"今日旅行に行くのですか？",hi:"क्या आप आज यात्रा पर जा रहे हैं?",ga:"An bhfuil tú ag dul ar thuras inniu?",uk:"Ви їдете в подорож сьогодні?"}},
  {id:1137,category:"gas",level:"A1",t:{fa:"امروز روز خوبی است برای مسافرت",en:"It's a good day for the trip",de:"Es ist ein guter Tag für die Reise",es:"Es un buen día para el viaje",fr:"C'est une bonne journée pour le voyage",tr:"Seyahat için iyi bir gün",ar:"إنه يوم جيد للرحلة",zh:"今天是旅行的好日子",ko:"여행하기 좋은 날이에요",ja:"旅行にいい日です",hi:"यात्रा के लिए अच्छा दिन है",ga:"Lá maith don turas é",uk:"Гарний день для подорожі"}},
  {id:1138,category:"gas",level:"A1",t:{fa:"چقدر طول می کشد با ماشین به آنجا برسیم؟",en:"How long does it take to get there by car?",de:"Wie lange dauert es mit dem Auto dorthin?",es:"¿Cuánto tiempo se tarda en llegar en coche?",fr:"Combien de temps faut-il pour y arriver en voiture ?",tr:"Oraya arabayla ulaşmak ne kadar sürer?",ar:"كم من الوقت يستغرق الوصول إلى هناك بالسيارة؟",zh:"开车去那里要多久？",ko:"차로 거기에 도착하는 데 얼마나 걸리나요?",ja:"車でそこに行くのにどのくらいかかりますか？",hi:"वहाँ कार से पहुँचने में कितना समय लगता है?",ga:"Cé chomh fada a thógann sé le dul ann i gcarr?",uk:"Скільки часу займає дістатися туди на машині?"}},
  {id:1139,category:"gas",level:"A1",t:{fa:"بله ما به بوستون می رویم",en:"Yes, We are going to Boston",de:"Ja, wir fahren nach Boston",es:"Sí, vamos a Boston",fr:"Oui, nous allons à Boston",tr:"Evet, Boston'a gidiyoruz",ar:"نعم، نحن ذاهبون إلى بوسطن",zh:"是的，我们要去波士顿",ko:"네, 우리는 보스턴으로 가요",ja:"はい、ボストンに行きます",hi:"हाँ, हम बोस्टन जा रहे हैं",ga:"Sea, táimid ag dul go Bostún",uk:"Так, ми їдемо до Бостона"}},
  {id:1140,category:"gas",level:"A1",t:{fa:"خوشحالم که آفتاب می تابد",en:"I'm glad the sun is shining",de:"Ich bin froh, dass die Sonne scheint",es:"Me alegra que brille el sol",fr:"Je suis content que le soleil brille",tr:"Güneşin parlamasına sevindim",ar:"أنا سعيد لأن الشمس مشرقة",zh:"我很高兴阳光明媚",ko:"해가 나서 기뻐요",ja:"日差しが差してうれしいです",hi:"मुझे खुशी है कि सूरज चमक रहा है",ga:"Tá áthas orm go bhfuil an ghrian ag scaipeadh",uk:"Я радий, що світить сонце"}},
  {id:1141,category:"gas",level:"A1",t:{fa:"حدود یک ساعت و نیم طول می کشد",en:"It takes about one hour and a half",de:"Es dauert etwa eineinhalb Stunden",es:"Tarda aproximadamente una hora y media",fr:"Ça prend environ une heure et demie",tr:"Yaklaşık bir buçuk saat sürer",ar:"يستغرق حوالي ساعة ونصف",zh:"大约需要一个半小时",ko:"약 1시간 30분이 걸려요",ja:"約1時間半かかります",hi:"इसमें लगभग डेढ़ घंटा लगता है",ga:"Tógann sé thart ar uair go leith",uk:"Це займає приблизно півтори години"}},
  {id:1142,category:"repair",level:"A1",t:{fa:"نمی دانم ماشینم چه ایرادی دارد",en:"I don't know what's wrong with my car",de:"Ich weiß nicht, was mit meinem Auto los ist",es:"No sé qué le pasa a mi coche",fr:"Je ne sais pas ce qui ne va pas avec ma voiture",tr:"Arabama ne olduğunu bilmiyorum",ar:"لا أعرف ما هي مشكلة سيارتي",zh:"我不知道我的车出了什么问题",ko:"내 차에 무슨 문제가 있는지 모르겠어요",ja:"車のどこが悪いのかわかりません",hi:"मुझे नहीं पता मेरी कार में क्या खराबी है",ga:"Níl a fhios agam cad atá cearr le mo charr",uk:"Я не знаю, що не так з моєю машиною"}},
  {id:1143,category:"repair",level:"A1",t:{fa:"ماشینم از کار افتاده است",en:"My car is broken (down)",de:"Mein Auto ist kaputt",es:"Mi coche está averiado",fr:"Ma voiture est en panne",tr:"Arabam bozuldu",ar:"سيارتي معطلة",zh:"我的车抛锚了",ko:"내 차가 고장났어요",ja:"車が壊れました",hi:"मेरी कार खराब हो गई है",ga:"Tá mo charr briste",uk:"Моя машина зламалася"}},
  {id:1144,category:"repair",level:"A1",t:{fa:"ماشینم کار نمی کند",en:"My car doesn't work",de:"Mein Auto funktioniert nicht",es:"Mi coche no funciona",fr:"Ma voiture ne marche pas",tr:"Arabam çalışmıyor",ar:"سيارتي لا تعمل",zh:"我的车不动了",ko:"내 차가 작동하지 않아요",ja:"車が動きません",hi:"मेरी कार काम नहीं कर रही है",ga:"Ní oibríonn mo charr",uk:"Моя машина не працює"}},
  {id:1145,category:"repair",level:"A1",t:{fa:"ماشینم خراب است",en:"My car is out of order",de:"Mein Auto ist nicht betriebsbereit",es:"Mi coche está fuera de servicio",fr:"Ma voiture est hors service",tr:"Arabam bozuk",ar:"سيارتي خارج الخدمة",zh:"我的车坏了",ko:"내 차가 고장났어요",ja:"車が故障しています",hi:"मेरी कार खराब है",ga:"Tá mo charr as ord",uk:"Моя машина несправна"}},
  {id:1146,category:"repair",level:"A1",t:{fa:"ماشینم احتیاج به تعمیر دارد",en:"My car needs fixing",de:"Mein Auto muss repariert werden",es:"Mi coche necesita reparación",fr:"Ma voiture a besoin d'être réparée",tr:"Arabamın tamire ihtiyacı var",ar:"سيارتي بحاجة إلى تصليح",zh:"我的车需要修理",ko:"내 차는 수리가 필요해요",ja:"車の修理が必要です",hi:"मेरी कार को ठीक करने की जरूरत है",ga:"Caithfear mo charr a shocrú",uk:"Моя машина потребує ремонту"}},
  {id:1147,category:"repair",level:"A1",t:{fa:"درست کار نمی کند",en:"It does not run properly",de:"Er läuft nicht richtig",es:"No funciona correctamente",fr:"Il ne tourne pas correctement",tr:"Düzgün çalışmıyor",ar:"لا يعمل بشكل صحيح",zh:"运行不正常",ko:"제대로 작동하지 않아요",ja:"正しく作動しません",hi:"यह ठीक से नहीं चलता",ga:"Ní ritheann sé i gceart",uk:"Він не працює належним чином"}},
  {id:1148,category:"repair",level:"A1",t:{fa:"لطفاً نگاهی به آن بیندازید",en:"Please (take) a look at it",de:"Bitte schauen Sie es sich an",es:"Por favor, échele un vistazo",fr:"Jetez-y un coup d'œil s'il vous plaît",tr:"Lütfen bir bakın",ar:"من فضلك ألقي نظرة عليها",zh:"请看一下",ko:"한 번 봐주세요",ja:"見ていただけますか",hi:"कृपया इसे देखें",ga:"Féach air le do thoil",uk:"Будь ласка, подивіться на це"}},
  {id:1149,category:"repair",level:"A1",t:{fa:"لطفاً کاربراتور را درست کنید",en:"Please fix the carburetor",de:"Bitte reparieren Sie den Vergaser",es:"Por favor, arregle el carburador",fr:"Veuillez réparer le carburateur",tr:"Lütfen karbüratörü tamir edin",ar:"من فضلك أصلح المكربن",zh:"请修理化油器",ko:"기화기를 수리해주세요",ja:"キャブレターを修理してください",hi:"कृपया कार्बोरेटर ठीक करें",ga:"Deisigh an carburetor le do thoil",uk:"Будь ласка, відремонтуйте карбюратор"}},
  {id:1150,category:"repair",level:"A1",t:{fa:"لطفاً لاستیکها را بازرسی کنید",en:"Please check the tires",de:"Bitte überprüfen Sie die Reifen",es:"Por favor, revise los neumáticos",fr:"Veuillez vérifier les pneus",tr:"Lütfen lastikleri kontrol edin",ar:"من فضلك افحص الإطارات",zh:"请检查轮胎",ko:"타이어를 확인해주세요",ja:"タイヤを点検してください",hi:"कृपया टायरों की जाँच करें",ga:"Seiceáil na boinn le do thoil",uk:"Будь ласка, перевірте шини"}},
  {id:1151,category:"repair",level:"A1",t:{fa:"لازم است روغن عوض کنم",en:"I need an oil change",de:"Ich muss das Öl wechseln",es:"Necesito cambiar el aceite",fr:"J'ai besoin d'une vidange",tr:"Yağ değişimine ihtiyacım var",ar:"أحتاج إلى تغيير الزيت",zh:"我需要换机油",ko:"오일 교환이 필요해요",ja:"オイル交換が必要です",hi:"मुझे तेल बदलने की जरूरत है",ga:"Teastaíonn athrú ola uaim",uk:"Мені потрібна заміна масла"}},
  {id:1152,category:"repair",level:"A1",t:{fa:"لازم است قدری روغن بخرم",en:"I need to buy some oil",de:"Ich muss etwas Öl kaufen",es:"Necesito comprar algo de aceite",fr:"Je dois acheter de l'huile",tr:"Biraz yağ almam gerek",ar:"أحتاج إلى شراء بعض الزيت",zh:"我需要买些机油",ko:"오일을 좀 사야 해요",ja:"オイルを買わなければなりません",hi:"मुझे थोड़ा तेल खरीदना है",ga:"Caithfidh mé roinnt ola a cheannach",uk:"Мені потрібно купити трохи масла"}},
  {id:1153,category:"repair",level:"A1",t:{fa:"باید قدری روغن اضافه کنم",en:"I need to add some oil",de:"Ich muss etwas Öl nachfüllen",es:"Necesito añadir algo de aceite",fr:"Je dois ajouter de l'huile",tr:"Biraz yağ eklemem gerek",ar:"أحتاج إلى إضافة بعض الزيت",zh:"我需要加点机油",ko:"오일을 좀 추가해야 해요",ja:"オイルを追加する必要があります",hi:"मुझे थोड़ा तेल डालना है",ga:"Caithfidh mé roinnt ola a chur leis",uk:"Мені потрібно долити трохи масла"}},
  {id:1154,category:"repair",level:"A1",t:{fa:"آیا نقشه جاده ها را دارید؟",en:"Do you have road maps?",de:"Haben Sie Straßenkarten?",es:"¿Tiene mapas de carreteras?",fr:"Avez-vous des cartes routières ?",tr:"Yol haritaları var mı?",ar:"هل لديك خرائط الطرق؟",zh:"你有公路地图吗？",ko:"도로 지도가 있나요?",ja:"道路地図をお持ちですか？",hi:"क्या आपके पास रोड मैप हैं?",ga:"An bhfuil léarscáileanna bóthair agat?",uk:"У вас є дорожні карти?"}},
  {id:1155,category:"repair",level:"A1",t:{fa:"آیا نقشه شهرها را می فروشید؟",en:"Do you sell city maps?",de:"Verkaufen Sie Stadtpläne?",es:"¿Vende mapas de la ciudad?",fr:"Vendez-vous des plans de ville ?",tr:"Şehir haritaları satıyor musunuz?",ar:"هل تبيع خرائط المدن؟",zh:"你卖城市地图吗？",ko:"시내 지도를 파나요?",ja:"街地図は販売していますか？",hi:"क्या आप शहर के नक्शे बेचते हैं?",ga:"An ndíolann tú léarscáileanna cathrach?",uk:"Ви продаєте карти міст?"}},
  {id:1156,category:"repair",level:"A1",t:{fa:"باید لاستیکها را باد بزنم",en:"I need some air",de:"Ich brauche Luft",es:"Necesito aire",fr:"J'ai besoin d'air",tr:"Biraz havaya ihtiyacım var",ar:"أحتاج إلى بعض الهواء",zh:"我需要一些空气",ko:"공기가 좀 필요해요",ja:"空気が必要です",hi:"मुझे थोड़ी हवा चाहिए",ga:"Teastaíonn aer uaim",uk:"Мені потрібне трохи повітря"}},
  {id:1157,category:"repair",level:"A1",t:{fa:"قدری آب برای رادیاتور میخواهم",en:"I need some water for the radiator",de:"Ich brauche etwas Wasser für den Kühler",es:"Necesito agua para el radiador",fr:"J'ai besoin d'eau pour le radiateur",tr:"Radyatör için biraz suya ihtiyacım var",ar:"أحتاج إلى بعض الماء للردياتير",zh:"我需要给散热器加些水",ko:"라디에이터에 물이 필요해요",ja:"ラジエーターに水が必要です",hi:"मुझे रेडिएटर के लिए थोड़ा पानी चाहिए",ga:"Teastaíonn uaim roinnt uisce don radaitheoir",uk:"Мені потрібна вода для радіатора"}},
  {id:1158,category:"repair",level:"A1",t:{fa:"از موتور روغن می چکد",en:"My engine is leaking oil",de:"Mein Motor verliert Öl",es:"Mi motor tiene una fuga de aceite",fr:"Mon moteur fuit de l'huile",tr:"Motorum yağ sızdırıyor",ar:"محركي يتسرب منه الزيت",zh:"我的发动机漏油",ko:"내 엔진에서 오일이 새고 있어요",ja:"エンジンからオイルが漏れています",hi:"मेरे इंजन से तेल लीक हो रहा है",ga:"Tá ola ag sceitheadh ó m'inneall",uk:"Мій двигун тече масло"}},
  {id:1159,category:"repair",level:"A1",t:{fa:"صدای زیاد از اگزوز می آید",en:"I hear excessive noise in the exhaust",de:"Ich höre übermäßige Geräusche im Auspuff",es:"Oigo un ruido excesivo en el escape",fr:"J'entends un bruit excessif dans l'échappement",tr:"Egzozda aşırı gürültü var",ar:"أسمع ضجيجًا مفرطًا في العادم",zh:"我听到排气管声音很大",ko:"배기음에서 과도한 소음이 나요",ja:"排気音が異常に大きいです",hi:"मुझे एग्ज़ॉस्ट में बहुत शोर सुनाई देता है",ga:"Cloisim torann iomarcach san sceithpíopa",uk:"Я чую надмірний шум у вихлопній системі"}},
  {id:1160,category:"repair",level:"A1",t:{fa:"وقتی ترمز میکنم موتور خاموش میشود",en:"The engine dies when I push the brake",de:"Der Motor stirbt ab, wenn ich bremse",es:"El motor se apaga cuando piso el freno",fr:"Le moteur cale quand j'appuie sur le frein",tr:"Frene bastığımda motor ölüyor",ar:"يتوقف المحرك عندما أضغط على الفرامل",zh:"当我踩刹车时发动机熄火",ko:"브레이크를 밟으면 엔진이 꺼져요",ja:"ブレーキを踏むとエンジンが止まります",hi:"जब मैं ब्रेक दबाता हूँ तो इंजन बंद हो जाता है",ga:"Faigheann an t-inneall bás nuair a bhrúim an coscán",uk:"Двигун глухне, коли я натискаю на гальмо"}},
  {id:1161,category:"repair",level:"A1",t:{fa:"وقتی سرد است موتور بسختی روشن میشود",en:"The engine is hard to start when cold",de:"Der Motor springt bei Kälte schwer an",es:"El motor es difícil de arrancar en frío",fr:"Le moteur démarre difficilement à froid",tr:"Motor soğukken zor çalışıyor",ar:"المحرك يصعب تشغيله عندما يكون باردًا",zh:"冷车时发动机很难启动",ko:"엔진이 찬 상태에서 시동이 잘 안 걸려요",ja:"エンジンが冷えているときは始動が難しいです",hi:"ठंड होने पर इंजन मुश्किल से स्टार्ट होता है",ga:"Tá sé deacair an t-inneall a thosú nuair atá sé fuar",uk:"Двигун важко запускається на холодну"}},
  {id:1162,category:"repair",level:"A1",t:{fa:"استارت نمی زند",en:"It won't start",de:"Er springt nicht an",es:"No arranca",fr:"Il ne démarre pas",tr:"Çalışmıyor",ar:"لا يعمل",zh:"它启动不了",ko:"시동이 걸리지 않아요",ja:"エンジンがかかりません",hi:"यह स्टार्ट नहीं होता",ga:"Ní thosóidh sé",uk:"Він не заводиться"}},
  {id:1163,category:"repair",level:"A1",t:{fa:"باطری از کار افتاده است برق ندارد",en:"The battery's dead",de:"Die Batterie ist leer",es:"La batería está descargada",fr:"La batterie est à plat",tr:"Akü bitti",ar:"البطارية فارغة",zh:"电池没电了",ko:"배터리가 방전됐어요",ja:"バッテリーが上がっています",hi:"बैटरी डेड हो गई है",ga:"Tá an ceallraí marbh",uk:"Акумулятор розрядився"}},
  {id:1164,category:"repair",level:"A1",t:{fa:"ماشینم احتیاج به صافکاری دارد",en:"I need a body job",de:"Ich brauche Karosseriearbeiten",es:"Necesito un trabajo de carrocería",fr:"J'ai besoin d'un travail de carrosserie",tr:"Kaportacıya ihtiyacım var",ar:"أحتاج إلى تصليح الهيكل",zh:"我的车需要钣金修理",ko:"판금 작업이 필요해요",ja:"板金修理が必要です",hi:"मुझे बॉडी जॉब की जरूरत है",ga:"Teastaíonn obair choirp uaim",uk:"Мені потрібен кузовний ремонт"}},
  {id:1165,category:"repair",level:"A1",t:{fa:"میخواهم خوردگی گلگیرها را صاف کنم",en:"I'd like to fix the dents on fenders",de:"Ich möchte die Beulen an den Kotflügeln ausbeulen",es:"Me gustaría arreglar las abolladuras de los guardabarros",fr:"Je voudrais réparer les bosses sur les ailes",tr:"Çamurluklardaki göçükleri düzeltmek istiyorum",ar:"أرغب في إصلاح الانبعاجات في المصدات",zh:"我想修好挡泥板上的凹痕",ko:"펜더의 움푹 들어간 곳을 고치고 싶어요",ja:"フェンダーの凹みを直したいです",hi:"मैं फेंडर पर डेंट ठीक करना चाहता हूँ",ga:"Ba mhaith liom na preasáin ar na feander a shocrú",uk:"Я хотів би виправити вм'ятини на крилах"}},
  {id:1166,category:"repair",level:"A1",t:{fa:"آیا می خواهید باد لاستیکها باطری و رادیاتور را بازرسی کنم؟",en:"Shall I check your Tires / Battery/Radiator?",de:"Soll ich Ihre Reifen / Batterie / Kühler überprüfen?",es:"¿Reviso sus neumáticos / batería / radiador?",fr:"Dois-je vérifier vos pneus / batterie / radiateur ?",tr:"Lastiklerinizi / Akünüzü / Radyatörünüzü kontrol edeyim mi?",ar:"هل تريد أن أفحص إطاراتك / بطاريتك / ردياتيرك؟",zh:"要我检查你的轮胎/电池/散热器吗？",ko:"타이어/배터리/라디에이터를 확인해 드릴까요?",ja:"タイヤ/バッテリー/ラジエーターをチェックしましょうか？",hi:"क्या मैं आपके टायर/बैटरी/रेडिएटर की जाँच करूँ?",ga:"Ar cheart dom do bhoinn / ceallraí / radaitheoir a sheiceáil?",uk:"Перевірити ваші шини/акумулятор/радіатор?"}},
  {id:1167,category:"repair",level:"A1",t:{fa:"آیا می خواهید شیشه جلو ماشینتان را تمیز کنم؟",en:"Do you want me to clean your windshield?",de:"Möchten Sie, dass ich Ihre Windschutzscheibe reinige?",es:"¿Quiere que limpie su parabrisas?",fr:"Voulez-vous que je nettoie votre pare-brise ?",tr:"Ön camınızı temizlememi ister misiniz?",ar:"هل تريد مني تنظيف الزجاج الأمامي لسيارتك؟",zh:"要我清洁你的挡风玻璃吗？",ko:"앞유리를 닦아 드릴까요?",ja:"フロントガラスを拭きましょうか？",hi:"क्या आप चाहेंगे कि मैं आपकी विंडशील्ड साफ करूँ?",ga:"Ar mhaith leat go nglanfainn do scáthán gaoithe?",uk:"Бажаєте, щоб я почистив ваше лобове скло?"}},
  {id:1168,category:"repair",level:"A1",t:{fa:"ما سرویس شبانه روزی داریم",en:"We have a 24-hours service",de:"Wir haben einen 24-Stunden-Service",es:"Tenemos servicio las 24 horas",fr:"Nous avons un service 24 heures sur 24",tr:"24 saat servisimiz var",ar:"لدينا خدمة على مدار 24 ساعة",zh:"我们有24小时服务",ko:"24시간 서비스가 있습니다",ja:"24時間サービスがあります",hi:"हमारी 24-घंटे सेवा है",ga:"Tá seirbhís 24-uair an chloig againn",uk:"У нас цілодобове обслуговування"}},
  {id:1169,category:"repair",level:"A1",t:{fa:"شما کجا هستید؟",en:"Where are you?",de:"Wo sind Sie?",es:"¿Dónde está usted?",fr:"Où êtes-vous ?",tr:"Neredesiniz?",ar:"أين أنت؟",zh:"你在哪里？",ko:"어디에 계세요?",ja:"どこにいらっしゃいますか？",hi:"आप कहाँ हैं?",ga:"Cá bhfuil tú?",uk:"Де ви?"}},
  {id:1170,category:"repair",level:"A1",t:{fa:"می دانید خرابی ماشینتان چیست؟",en:"Do you know what's wrong with your car?",de:"Wissen Sie, was mit Ihrem Auto los ist?",es:"¿Sabe qué le pasa a su coche?",fr:"Savez-vous ce qui ne va pas avec votre voiture ?",tr:"Arabanıza ne olduğunu biliyor musunuz?",ar:"هل تعرف ما هي مشكلة سيارتك؟",zh:"你知道你的车有什么问题吗？",ko:"차에 무슨 문제가 있는지 아세요?",ja:"車のどこが悪いかおわかりですか？",hi:"क्या आप जानते हैं कि आपकी कार में क्या खराबी है?",ga:"An bhfuil a fhios agat cad atá cearr le do charr?",uk:"Ви знаєте, що не так з вашою машиною?"}},
  {id:1171,category:"repair",level:"A1",t:{fa:"من مکانیکی به آنجا می فرستم",en:"I'll send a mechanic out to you",de:"Ich schicke Ihnen einen Mechaniker",es:"Le enviaré un mecánico",fr:"Je vous enverrai un mécanicien",tr:"Size bir tamirci göndereceğim",ar:"سأرسل لك ميكانيكيًا",zh:"我会派一个修理工去找你",ko:"정비사를 보내드리겠습니다",ja:"整備士を派遣します",hi:"मैं आपके पास एक मैकेनिक भेजूँगा",ga:"Cuirfidh mé meicneoir chugat",uk:"Я надішлю до вас механіка"}},
  {id:1172,category:"repair",level:"A1",t:{fa:"حدود ۱۵ دقیقه بعد آنجا می رسد",en:"He'll be there in about fifteen minutes",de:"Er wird in etwa fünfzehn Minuten dort sein",es:"Estará allí en unos quince minutos",fr:"Il sera là dans environ quinze minutes",tr:"Yaklaşık on beş dakika içinde orada olacak",ar:"سيكون هناك خلال حوالي خمس عشرة دقيقة",zh:"他大约十五分钟后到",ko:"그는 약 15분 후에 도착할 거예요",ja:"彼は約15分後に到着します",hi:"वह लगभग पंद्रह मिनट में वहाँ पहुँच जाएगा",ga:"Beidh sé ansin i gceann thart ar chúig nóiméad déag",uk:"Він буде там приблизно за п'ятнадцять хвилин"}},
  {id:1173,category:"repair",level:"A1",t:{fa:"فقط بنزینتان تمام شده است",en:"You've just run out of gas",de:"Ihnen ist gerade das Benzin ausgegangen",es:"Se ha quedado sin gasolina",fr:"Vous êtes juste tombé en panne d'essence",tr:"Benzininiz bitmiş",ar:"لقد نفد البنزين لديك",zh:"你的汽油刚好用完了",ko:"기름이 떨어졌어요",ja:"ガソリンが切れました",hi:"आपका पेट्रोल खत्म हो गया है",ga:"Tá do pheitreal ídithe",uk:"У вас просто закінчився бензин"}},
  {id:1174,category:"repair",level:"A1",t:{fa:"روغنتان کافی نیست",en:"You don't have enough oil",de:"Sie haben nicht genug Öl",es:"No tiene suficiente aceite",fr:"Vous n'avez pas assez d'huile",tr:"Yağınız yeterli değil",ar:"ليس لديك زيت كافٍ",zh:"你的机油不够",ko:"오일이 충분하지 않아요",ja:"オイルが足りません",hi:"आपके पास पर्याप्त तेल नहीं है",ga:"Níl go leor ola agat",uk:"У вас недостатньо масла"}},
  {id:1175,category:"repair",level:"A1",t:{fa:"رادیاتور خالی است",en:"The radiator is empty",de:"Der Kühler ist leer",es:"El radiador está vacío",fr:"Le radiateur est vide",tr:"Radyatör boş",ar:"الردياتير فارغ",zh:"散热器是空的",ko:"라디에이터가 비어 있어요",ja:"ラジエーターが空です",hi:"रेडिएटर खाली है",ga:"Tá an radaitheoir folamh",uk:"Радіатор порожній"}},
  {id:1176,category:"repair",level:"A1",t:{fa:"باطری خالی کرده است",en:"The battery's dead",de:"Die Batterie ist leer",es:"La batería está descargada",fr:"La batterie est déchargée",tr:"Akü bitti",ar:"البطارية فارغة",zh:"电池没电了",ko:"배터리가 방전됐어요",ja:"バッテリーが上がっています",hi:"बैटरी डेड हो गई है",ga:"Tá an ceallraí marbh",uk:"Акумулятор розрядився"}},
  {id:1177,category:"repair",level:"A1",t:{fa:"شما می توانید حالا پولش را بپردازید",en:"You can pay me now",de:"Sie können jetzt bezahlen",es:"Puede pagarme ahora",fr:"Vous pouvez me payer maintenant",tr:"Şimdi ödeyebilirsiniz",ar:"يمكنك الدفع لي الآن",zh:"你现在可以付钱给我了",ko:"지금 결제하시면 됩니다",ja:"今お支払いいただけます",hi:"आप अभी मुझे भुगतान कर सकते हैं",ga:"Is féidir leat íoc liom anois",uk:"Ви можете заплатити мені зараз"}},
  {id:1178,category:"repair",level:"A1",t:{fa:"شما به شمعهای جدید احتیاج دارید",en:"You need new spark plugs",de:"Sie brauchen neue Zündkerzen",es:"Necesita bujías nuevas",fr:"Vous avez besoin de nouvelles bougies d'allumage",tr:"Yeni bujilere ihtiyacınız var",ar:"أنت بحاجة إلى شمعات إشعال جديدة",zh:"你需要新的火花塞",ko:"새 점화 플러그가 필요해요",ja:"新しいスパークプラグが必要です",hi:"आपको नए स्पार्क प्लग चाहिए",ga:"Teastaíonn plocóidí spréacha nua uait",uk:"Вам потрібні нові свічки запалювання"}},
  {id:1179,category:"repair",level:"A1",t:{fa:"چقدر طول می کشد تعمیرش کنید؟",en:"How long will it take to fix?",de:"Wie lange wird die Reparatur dauern?",es:"¿Cuánto tiempo tardará en arreglarlo?",fr:"Combien de temps cela prendra-t-il de le réparer ?",tr:"Tamiri ne kadar sürer?",ar:"كم من الوقت سيستغرق إصلاحها؟",zh:"修好要多久？",ko:"수리하는 데 얼마나 걸리나요?",ja:"修理にはどのくらいかかりますか？",hi:"ठीक करने में कितना समय लगेगा?",ga:"Cé chomh fada a thógfaidh sé é a shocrú?",uk:"Скільки часу займе ремонт?"}},
  {id:1180,category:"repair",level:"A1",t:{fa:"نه متشکرم عجله دارم",en:"No thanks. I'm in a hurry",de:"Nein danke. Ich habe es eilig",es:"No, gracias. Tengo prisa",fr:"Non merci. Je suis pressé",tr:"Hayır teşekkürler. Acelem var",ar:"لا، شكرًا. أنا في عجلة من أمري",zh:"不用了谢谢，我赶时间",ko:"아니요 감사합니다. 급해요",ja:"いいえ結構です。急いでいます",hi:"नहीं धन्यवाद। मुझे जल्दी है",ga:"Níl go raibh maith agat. Tá deifir orm",uk:"Ні, дякую. Я поспішаю"}},
  {id:1181,category:"repair",level:"A1",t:{fa:"نه حالا نه",en:"No, not right now",de:"Nein, nicht jetzt",es:"No, no ahora mismo",fr:"Non, pas maintenant",tr:"Hayır, şimdi değil",ar:"لا، ليس الآن",zh:"不，现在不是时候",ko:"아니요, 지금은 아니에요",ja:"いいえ、今は結構です",hi:"नहीं, अभी नहीं",ga:"Níl, ní anois",uk:"Ні, не зараз"}},
  {id:1182,category:"repair",level:"A1",t:{fa:"نه متشکرم قدری دیرم شده است",en:"No, thanks, I'm a little late",de:"Nein, danke, ich habe etwas Verspätung",es:"No, gracias, llego un poco tarde",fr:"Non merci, je suis un peu en retard",tr:"Hayır teşekkürler, biraz geciktim",ar:"لا، شكرًا، لقد تأخرت قليلاً",zh:"不了谢谢，我有点晚了",ko:"아니요 감사합니다, 좀 늦었어요",ja:"いいえ結構です、少し遅れています",hi:"नहीं धन्यवाद, मुझे थोड़ी देर हो गई है",ga:"Níl go raibh maith agat, tá mé beagán déanach",uk:"Ні, дякую, я трохи запізнююсь"}},
  {id:1183,category:"repair",level:"A1",t:{fa:"بله لطفاً (باد) لاستیکها را بازرسی کنید",en:"Yes, please check the tires",de:"Ja, bitte überprüfen Sie die Reifen",es:"Sí, por favor revise los neumáticos",fr:"Oui, vérifiez les pneus s'il vous plaît",tr:"Evet, lütfen lastikleri kontrol edin",ar:"نعم، من فضلك افحص الإطارات",zh:"好的，请检查轮胎",ko:"네, 타이어를 확인해주세요",ja:"はい、タイヤを点検してください",hi:"हाँ, कृपया टायरों की जाँच करें",ga:"Sea, seiceáil na boinn le do thoil",uk:"Так, будь ласка, перевірте шини"}},
  {id:1184,category:"repair",level:"A1",t:{fa:"لطفاً چقدر می شود؟",en:"How much (is it) please?",de:"Wie viel kostet es bitte?",es:"¿Cuánto es por favor?",fr:"Combien cela coûte-t-il s'il vous plaît ?",tr:"Lütfen ne kadar?",ar:"كم يكلف من فضلك؟",zh:"请问多少钱？",ko:"얼마인가요?",ja:"いくらですか？",hi:"कृपया यह कितना है?",ga:"Cé mhéad é le do thoil?",uk:"Скільки це коштує, будь ласка?"}},
  {id:1185,category:"repair",level:"A1",t:{fa:"روی هم چقدر می شود؟",en:"What does it come to?",de:"Was macht das zusammen?",es:"¿Cuánto es en total?",fr:"Combien cela fait-il au total ?",tr:"Toplam ne kadar?",ar:"كم المجموع؟",zh:"一共多少钱？",ko:"총액이 얼마인가요?",ja:"合計はいくらですか？",hi:"कुल कितना हुआ?",ga:"Cad é a thagann sé go?",uk:"Скільки всього?"}},
  {id:1186,category:"repair",level:"A1",t:{fa:"چه قدر باید به شما بپردازم؟",en:"How much do I owe you?",de:"Wie viel schulde ich Ihnen?",es:"¿Cuánto le debo?",fr:"Combien vous dois-je ?",tr:"Size ne kadar borcum var?",ar:"كم يجب أن أدفع لك؟",zh:"我该付你多少钱？",ko:"얼마를 드려야 하나요?",ja:"おいくらお支払いすればよろしいですか？",hi:"मुझे आपको कितना देना है?",ga:"Cé mhéad atá mé ag fiacha duit?",uk:"Скільки я вам винен?"}},
  {id:1187,category:"repair",level:"A1",t:{fa:"پولش چقدر می شود؟",en:"How much is that?",de:"Wie viel kostet das?",es:"¿Cuánto es eso?",fr:"Combien ça coûte ?",tr:"Bu ne kadar?",ar:"كم سعر ذلك؟",zh:"那个多少钱？",ko:"그게 얼마인가요?",ja:"それはいくらですか？",hi:"वह कितना है?",ga:"Cé mhéad é sin?",uk:"Скільки це коштує?"}},
  {id:1188,category:"repair",level:"A1",t:{fa:"۱۸ دلار / ۱۸ پوند می شود",en:"That'll be 18 dollars/ pounds",de:"Das macht 18 Dollar/Pfund",es:"Serán 18 dólares/libras",fr:"Ça fera 18 dollars/livres",tr:"18 dolar/pound olacak",ar:"سيكون 18 دولارًا/جنيهًا",zh:"一共18美元/英镑",ko:"18달러/파운드입니다",ja:"18ドル/ポンドです",hi:"यह 18 डॉलर/पाउंड होगा",ga:"Beidh sé 18 dollar/punt",uk:"Буде 18 доларів/фунтів"}},
  {id:1189,category:"repair",level:"A1",t:{fa:"روی هم ۱۸ دلار می شود",en:"18 dollars, all together, please",de:"18 Dollar insgesamt, bitte",es:"18 dólares en total, por favor",fr:"18 dollars en tout, s'il vous plaît",tr:"Toplam 18 dolar lütfen",ar:"18 دولارًا إجمالاً من فضلك",zh:"一共18美元",ko:"총 18달러입니다",ja:"合計18ドルです",hi:"कुल 18 डॉलर",ga:"18 dollar ar fad, le do thoil",uk:"Всього 18 доларів, будь ласка"}},
  {id:1190,category:"repair",level:"A1",t:{fa:"دو ساعت معطلی دارد طول می کشد",en:"It'll take a couple of hours",de:"Es wird ein paar Stunden dauern",es:"Llevará un par de horas",fr:"Cela prendra quelques heures",tr:"Birkaç saat sürer",ar:"سيستغرق بضع ساعات",zh:"需要几个小时",ko:"몇 시간 걸릴 거예요",ja:"2、3時間かかります",hi:"इसमें कुछ घंटे लगेंगे",ga:"Tógfaidh sé cúpla uair an chloig",uk:"Займе кілька годин"}},
  {id:1191,category:"repair",level:"A1",t:{fa:"ما نمی توانیم آن را امروز درست کنیم",en:"We can't fix it today",de:"Wir können es heute nicht reparieren",es:"No podemos arreglarlo hoy",fr:"Nous ne pouvons pas le réparer aujourd'hui",tr:"Bugün tamir edemeyiz",ar:"لا يمكننا إصلاحها اليوم",zh:"我们今天不能修好它",ko:"오늘은 수리할 수 없어요",ja:"今日は修理できません",hi:"हम आज इसे ठीक नहीं कर सकते",ga:"Ní féidir linn é a shocrú inniu",uk:"Ми не можемо відремонтувати це сьогодні"}},
  {id:1192,category:"repair",level:"A1",t:{fa:"شما باید قطعات خراب را خریداری کنید",en:"You have to buy the broken parts",de:"Sie müssen die defekten Teile kaufen",es:"Tiene que comprar las piezas rotas",fr:"Vous devez acheter les pièces défectueuses",tr:"Kırık parçaları satın almalısınız",ar:"عليك شراء القطع المكسورة",zh:"你必须购买损坏的零件",ko:"고장난 부품을 사셔야 합니다",ja:"壊れた部品を購入する必要があります",hi:"आपको टूटे हुए पुर्जे खरीदने होंगे",ga:"Caithfidh tú na píosaí briste a cheannach",uk:"Ви повинні придбати зламані деталі"}},
  {id:1193,category:"repair",level:"A1",t:{fa:"می توانیم برایتان قطعات را سفارش دهیم",en:"We can order them for you",de:"Wir können sie für Sie bestellen",es:"Podemos pedirlas por usted",fr:"Nous pouvons les commander pour vous",tr:"Size parçaları sipariş edebiliriz",ar:"يمكننا طلبها لك",zh:"我们可以为你订购",ko:"부품을 주문해 드릴 수 있어요",ja:"部品をお取り寄せできます",hi:"हम आपके लिए उन्हें ऑर्डर कर सकते हैं",ga:"Is féidir linn iad a ordú duit",uk:"Ми можемо замовити їх для вас"}},
  {id:1194,category:"repair",level:"A1",t:{fa:"ممکن است اشکال از برق موتورتان باشد",en:"You may have ignition problem",de:"Sie könnten ein Zündproblem haben",es:"Podría tener un problema de encendido",fr:"Vous pourriez avoir un problème d'allumage",tr:"Ateşleme sorununuz olabilir",ar:"قد تكون لديك مشكلة في الإشعال",zh:"你可能有点火问题",ko:"점화 문제가 있을 수 있어요",ja:"イグニッションの問題かもしれません",hi:"आपको इग्निशन समस्या हो सकती है",ga:"D'fhéadfadh fadhb adhainte a bheith agat",uk:"У вас може бути проблема із запалюванням"}},
  {id:1195,category:"repair",level:"A1",t:{fa:"ممکن است ایراد از کاربراتورتان باشد",en:"You may have problem with your carburetor",de:"Sie könnten ein Problem mit Ihrem Vergaser haben",es:"Podría tener un problema con su carburador",fr:"Vous pourriez avoir un problème avec votre carburateur",tr:"Karbüratörünüzle ilgili bir sorun olabilir",ar:"قد تكون لديك مشكلة في المكربن",zh:"你的化油器可能有问题",ko:"기화기에 문제가 있을 수 있어요",ja:"キャブレターに問題があるかもしれません",hi:"आपको कार्बोरेटर में समस्या हो सकती है",ga:"D'fhéadfadh fadhb a bheith agat le do charbradóir",uk:"У вас може бути проблема з карбюратором"}},
  {id:1196,category:"repair",level:"A1",t:{fa:"ممکن است ایراد از سیستم سوخت (بنزین) باشد",en:"You may have problem with your fuel system",de:"Sie könnten ein Problem mit Ihrem Kraftstoffsystem haben",es:"Podría tener un problema con su sistema de combustible",fr:"Vous pourriez avoir un problème avec votre système d'alimentation",tr:"Yakıt'sisteminizle ilgili bir sorun olabilir",ar:"قد تكون لديك مشكلة في نظام الوقود",zh:"你的燃油系统可能有问题",ko:"연료 시스템에 문제가 있을 수 있어요",ja:"燃料系統に問題があるかもしれません",hi:"आपको फ्यूल सिस्टम में समस्या हो सकती है",ga:"D'fhéadfadh fadhb a bheith agat le do chóras breosla",uk:"У вас може бути проблема з паливною системою"}},
  {id:1197,category:"repair",level:"A1",t:{fa:"ممکن است باطری خراب باشد",en:"You may have problem with your battery",de:"Sie könnten ein Problem mit Ihrer Batterie haben",es:"Podría tener un problema con su batería",fr:"Vous pourriez avoir un problème avec votre batterie",tr:"Akünüzde sorun olabilir",ar:"قد تكون لديك مشكلة في البطارية",zh:"你的电池可能有问题",ko:"배터리에 문제가 있을 수 있어요",ja:"バッテリーに問題があるかもしれません",hi:"आपको बैटरी में समस्या हो सकती है",ga:"D'fhéadfadh fadhb a bheith agat le do cheallraí",uk:"У вас може бути проблема з акумулятором"}},
  {id:1198,category:"repair",level:"A1",t:{fa:"شما باید به یک وانت یدک کش تلفن کنید",en:"You have to call a tow truck",de:"Sie müssen einen Abschleppwagen rufen",es:"Tiene que llamar a una grúa",fr:"Vous devez appeler une dépanneuse",tr:"Bir çekici çağırmalısınız",ar:"يجب عليك الاتصال بشاحنة سحب",zh:"你必须叫一辆拖车",ko:"견인 트럭을 불러야 해요",ja:"レッカー車を呼ぶ必要があります",hi:"आपको एक टो ट्रक बुलाना होगा",ga:"Caithfidh tú tarraingtheoir a ghlaoch",uk:"Ви повинні викликати евакуатор"}},
  {id:1199,category:"repair",level:"A1",t:{fa:"شما باید ماشین را یدک بکشید",en:"You have to tow your car",de:"Sie müssen Ihr Auto abschleppen lassen",es:"Tiene que remolcar su coche",fr:"Vous devez faire remorquer votre voiture",tr:"Arabanızı çektirmelisiniz",ar:"يجب عليك سحب سيارتك",zh:"你必须拖车",ko:"차를 견인해야 해요",ja:"車をレッカー移動させる必要があります",hi:"आपको अपनी कार खिंचवानी होगी",ga:"Caithfidh tú do charr a tharraingt",uk:"Ви повинні відбуксирувати свою машину"}},
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
  {
    id: 2,
    level: "A2",
    pos: "noun",
    meaningFa: "نهاد یا افرادی که یک کشور یا منطقه را اداره می‌کنند",
    t: { fa: "دولت", en: "government", de: "Regierung", es: "gobierno", fr: "gouvernement", ar: "حكومة", tr: "hükümet", zh: "政府" },
  },
  {
    id: 3,
    level: "B1",
    pos: "verb",
    meaningFa: "رسماً و علناً چیزی را اعلام کردن",
    t: { fa: "اعلام کردن", en: "to announce", de: "ankündigen", es: "anunciar", fr: "annoncer", ar: "الإعلان", tr: "duyurmak", zh: "宣布" },
  },
  {
    id: 4,
    level: "B2",
    pos: "adjective",
    meaningFa: "دارای اهمیت یا تاثیر قابل توجه",
    t: { fa: "قابل توجه", en: "significant", de: "bedeutend", es: "significativo", fr: "significatif", ar: "مهم", tr: "önemli", zh: "重大的" },
  },
  {
    id: 5,
    level: "B2",
    pos: "verb",
    meaningFa: "برای رسیدن به توافق با طرف مقابل گفتگو کردن",
    t: { fa: "مذاکره کردن", en: "to negotiate", de: "verhandeln", es: "negociar", fr: "négocier", ar: "التفاوض", tr: "müzakere etmek", zh: "谈判" },
  },
  {
    id: 6,
    level: "B1",
    pos: "noun",
    meaningFa: "وضعیت بحرانی و ناپایدار که نیازمند تصمیم فوری است",
    t: { fa: "بحران", en: "crisis", de: "Krise", es: "crisis", fr: "crise", ar: "أزمة", tr: "kriz", zh: "危机" },
  },
  {
    id: 7,
    level: "C1",
    pos: "adjective",
    meaningFa: "قابل ادامه در درازمدت بدون آسیب به منابع",
    t: { fa: "پایدار", en: "sustainable", de: "nachhaltig", es: "sostenible", fr: "durable", ar: "مستدام", tr: "sürdürülebilir", zh: "可持续的" },
  },
  {
    id: 8,
    level: "B1",
    pos: "noun",
    meaningFa: "کسی که به‌خاطر جنگ یا خطر، کشورش را ترک کرده",
    t: { fa: "پناهنده", en: "refugee", de: "Flüchtling", es: "refugiado", fr: "réfugié", ar: "لاجئ", tr: "mülteci", zh: "难民" },
  },
  {
    id: 9,
    level: "B2",
    pos: "noun",
    meaningFa: "نداشتن شغل با وجود توانایی و تمایل به کار کردن",
    t: { fa: "بیکاری", en: "unemployment", de: "Arbeitslosigkeit", es: "desempleo", fr: "chômage", ar: "بطالة", tr: "işsizlik", zh: "失业" },
  },
  {
    id: 10,
    level: "B1",
    pos: "noun",
    meaningFa: "خط‌مشی یا برنامه‌ی رسمی برای تصمیم‌گیری",
    t: { fa: "سیاست", en: "policy", de: "Politik", es: "política", fr: "politique", ar: "سياسة", tr: "politika", zh: "政策" },
  },
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
