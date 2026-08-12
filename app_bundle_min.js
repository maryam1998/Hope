import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Star, MessageCircle, RotateCcw, Repeat, Send, Check, X, BookOpen, Heart, Search, Volume2, Newspaper, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, ChevronLeft, ChevronRight, Pencil, Wand2, Menu, Palette, Type, Trash2, PlayCircle, Gauge, Layers, Coffee, CheckSquare, Copy } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { VOCAB } from "./VOCAB.js";
import { WORDS_AZ } from "./WORDS_AZ.js";
import { NEWS_WORDS } from "./NEWS_WORDS.js";
import { DAILY_WORDS } from "./DAILY_WORDS.js";
import { DAILY_CONVERSATIONS } from "./DAILY_CONVERSATIONS.js";
import DailyConversationsTab from "./DailyConversationsTab.js";
const STORY_SEARCH_WORD_POOL = [
  ...WORDS_AZ.map((w) => ({ term: w.en, fa: w.fa, source: "لغات" })),
  ...NEWS_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "لغات و اخبار" })),
  ...DAILY_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "مکالمه و روزمره" }))
];
const STORY_SEARCH_CONVERSATION_POOL = DAILY_CONVERSATIONS.flatMap(
  (tp) => tp.scenarios.flatMap((sc) => [...sc.speakerA || [], ...sc.speakerB || []])
).map((it) => ({ term: it.en, fa: it.fa || "", source: "مکالمات روزمره" }));
const SUPABASE_URL = "https://avfceytrbmsdkuyppspp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmNleXRyYm1zZGt1eXBwc3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjMwNDUsImV4cCI6MjEwMTQ5OTA0NX0.IYyNpcznb3g2zdruLn2XSlVHFtDK4OQPm0RIOcIBNhE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function supabaseUserToSession(su) {
  if (!su) return null;
  const meta = su.user_metadata || {};
  return {
    uid: su.id,
    email: su.email,
    name: meta.name || meta.full_name || su.email,
    picture: meta.avatar_url || meta.picture || "",
    provider: meta.provider_source || (su.app_metadata?.provider === "google" ? "google" : "email")
  };
}
async function supabaseLoadState(uid) {
  if (!uid) return null;
  try {
    const { data, error } = await supabase.from("user_data").select("data").eq("user_id", uid).maybeSingle();
    if (error || !data) return null;
    return data.data || null;
  } catch (e) {
    return null;
  }
}
async function supabaseSaveState(uid, data) {
  if (!uid) return;
  try {
    await supabase.from("user_data").upsert({ user_id: uid, data, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (e) {
  }
}
const TRANSLATION_DB_NAME = "phrasebook-translations";
const TRANSLATION_STORE = "translations";
function openTranslationDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
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
async function translateViaMyMemory(text, targetLang, sourceLang = "auto") {
  const sl = sourceLang && sourceLang !== "auto" ? sourceLang : "en";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetLang}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("mymemory-http-" + response.status);
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("mymemory-empty-response");
  const looksLikeApiError = /^(PLEASE SELECT|INVALID |NO TRANSLATION|AMOUNT OF WORDS)/i.test(translated.trim());
  if (looksLikeApiError) throw new Error("mymemory-api-error: " + translated);
  return translated;
}
async function translateViaLingva(text, targetLang, sourceLang = "auto") {
  const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("lingva-http-" + response.status);
  const data = await response.json();
  if (!data?.translation) throw new Error("lingva-empty-response");
  return data.translation;
}
async function translateViaLibre(text, targetLang, sourceLang = "auto") {
  const response = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: sourceLang || "auto", target: targetLang, format: "text" })
  });
  if (!response.ok) throw new Error("libre-http-" + response.status);
  const data = await response.json();
  if (!data?.translatedText) throw new Error("libre-empty-response");
  return data.translatedText;
}
async function translateViaAI(text, targetLang, sourceLang, aiSettings) {
  if (!aiSettings) throw new Error("translate-ai-no-settings");
  const targetLabel = typeof LANGUAGES !== "undefined" && LANGUAGES.find((l) => l.code === targetLang)?.label || targetLang;
  const prompt = `Translate the following text into ${targetLabel}. Respond with ONLY the translation itself — no quotes, no explanation, no original text, nothing else.

Text: ${text}`;
  const result = await callAI({ prompt, maxTokens: 200, retries: 1, aiSettings });
  const cleaned = String(result || "").replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
  if (!cleaned) throw new Error("translate-ai-empty-response");
  return cleaned;
}
async function translateFree(text, targetLang, sourceLang = "auto", aiSettings = null) {
  if (!text || !targetLang) return text;
  if (sourceLang && sourceLang !== "auto" && sourceLang === targetLang) return text;
  const cached = await getCachedTranslation(text, targetLang, sourceLang);
  if (cached) return cached;
  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre];
  for (const provider of providers) {
    try {
      const result = await provider(text, targetLang, sourceLang);
      if (result && result.trim()) {
        setCachedTranslation(text, targetLang, sourceLang, result);
        return result;
      }
    } catch (error) {
      console.warn(`ترجمه با ${provider.name} ناموفق بود، رفتن سراغ سرویس بعدی:`, error?.message || error);
    }
  }
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
  return text;
}
async function translateWithGoogle(text, targetLang) {
  return translateFree(text, targetLang, "auto");
}
const ALIGN_L = "⟦";
const ALIGN_R = "⟧";
async function translateWordInContext(sentenceText, word, sourceLang, targetLang) {
  if (!sentenceText || !word) return null;
  const idx = sentenceText.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return null;
  const wrapped = sentenceText.slice(0, idx) + ALIGN_L + sentenceText.slice(idx, idx + word.length) + ALIGN_R + sentenceText.slice(idx + word.length);
  try {
    const translated = await translateFree(wrapped, targetLang, sourceLang);
    if (!translated) return null;
    const re = new RegExp(`${ALIGN_L}([^${ALIGN_R}]*)${ALIGN_R}`);
    const m = translated.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  } catch {
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
  cardBorder: "var(--c-cardBorder)"
};
const mainTextColor = "#0B1220";
const translationColor = "#0F5C34";
const APP_THEMES = {
  vintage: {
    label: "کلاسیک (پیش‌فرض)",
    swatch: "#B8862B",
    values: { paper: "#F1E8D6", paperDark: "#E4D8BE", ink: "#1C2541", inkSoft: "#3A4566", gold: "#B8862B", goldSoft: "#DDBB77", teal: "#2F6F62", rose: "#9E3B3B", cardBorder: "#C9BB98" }
  },
  ocean: {
    label: "اقیانوسی",
    swatch: "#1C7C93",
    values: { paper: "#EAF4F4", paperDark: "#D7E9EA", ink: "#0F2A38", inkSoft: "#2A4E5C", gold: "#1C7C93", goldSoft: "#8FCBD8", teal: "#1C7C93", rose: "#B4533F", cardBorder: "#BBD6D8" }
  },
  forest: {
    label: "جنگلی",
    swatch: "#5C7A3A",
    values: { paper: "#F1F0E4", paperDark: "#E2E0CC", ink: "#26321D", inkSoft: "#41522C", gold: "#8A6D2F", goldSoft: "#C9B77E", teal: "#5C7A3A", rose: "#9C4A3A", cardBorder: "#CBCBA8" }
  },
  rosewine: {
    label: "گلبهی",
    swatch: "#A34960",
    values: { paper: "#F7EAEA", paperDark: "#EBD6D8", ink: "#3A1F26", inkSoft: "#5C3540", gold: "#A34960", goldSoft: "#E3AFBC", teal: "#6E5A78", rose: "#A34960", cardBorder: "#DDBFC4" }
  },
  midnight: {
    label: "تیره (شب)",
    swatch: "#D9A441",
    values: { paper: "#1B1F2A", paperDark: "#262C3B", ink: "#F1E8D6", inkSoft: "#C9C2AE", gold: "#D9A441", goldSoft: "#8A6A2C", teal: "#5FA997", rose: "#D9776A", cardBorder: "#3A4258" }
  }
};
const APP_FONTS = {
  default: { label: "پیش‌فرض", fa: "'Vazirmatn', sans-serif", latin: "'Lora', serif" },
  modern: { label: "مدرن", fa: "'Vazirmatn', sans-serif", latin: "'Inter', sans-serif" },
  classic: { label: "کلاسیک", fa: "'Noto Naskh Arabic', serif", latin: "'Merriweather', serif" }
};
const APP_FONT_SIZES = {
  small: { label: "کوچک", zoom: 0.9 },
  medium: { label: "متوسط (پیش‌فرض)", zoom: 1 },
  large: { label: "بزرگ", zoom: 1.15 },
  xlarge: { label: "خیلی بزرگ", zoom: 1.3 }
};
const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";
const STORAGE_KEY = "phrasebook-state-v1";
const APP_PREFS_KEY = "phrasebook-app-prefs";
function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      theme: APP_THEMES[parsed.theme] ? parsed.theme : "vintage",
      font: APP_FONTS[parsed.font] ? parsed.font : "default",
      fontSize: APP_FONT_SIZES[parsed.fontSize] ? parsed.fontSize : "medium"
    };
  } catch (e) {
    return { theme: "vintage", font: "default", fontSize: "medium" };
  }
}
function saveAppPrefs(prefs) {
  try {
    localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
  }
}
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
  }
};
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const FIREBASE_ENABLED = !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");
let fbAuth = null;
let fbDb = null;
let fbGoogleProvider = null;
let fbMod = null;
async function ensureFirebase() {
  if (!FIREBASE_ENABLED) return null;
  if (fbAuth && fbDb) return { auth: fbAuth, db: fbDb };
  const [{ initializeApp }, authMod, storeMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore")
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
  } catch {
  }
}
async function firestoreLoadState(uid) {
  if (!FIREBASE_ENABLED || !uid) return null;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    const snap = await fbMod.firestore.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}
async function firestoreSaveState(uid, data) {
  if (!FIREBASE_ENABLED || !uid) return;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    await fbMod.firestore.setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
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
  slang: "اصطلاح عامیانه (مدرن)"
};
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
  uk: "uk-UA"
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
  let md = `# کتاب مکالمه — عبارات

زبان‌ها: ${langLabels.join(" / ")}

`;
  const byCategory = {};
  conversation.forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    md += `## ${CATEGORIES[cat] || cat}

`;
    items.forEach((p) => {
      const parts = langs.map((l) => p.t[l]).filter(Boolean);
      md += `- **[${p.level}]** ${parts.join(" — ")}
`;
    });
    md += `
`;
  });
  return md;
}
function vocabToMarkdown() {
  let md = `# کتاب مکالمه — دیکشنری

`;
  VOCAB.forEach((v) => {
    md += `- **${v.t.en || v.t.fa}** _(${v.level}, ${POS_FA[v.pos] || v.pos})_ — ${v.meaningFa}
`;
  });
  return md;
}
const FALLBACK_CHARS_PER_SEC = 13;
const speechController = (() => {
  let fullText = "";
  let words = [];
  let key = null;
  let locale = "en-US";
  let status = "idle";
  let wordIndex = 0;
  let segmentStartOffset = 0;
  let segmentStartTime = 0;
  let boundaryFired = false;
  let rate = Number(localStorage.getItem("phrasebook-tts-rate")) || 1;
  let currentUtterance = null;
  let mode = "local";
  let globalRepeatSetting = (() => {
    const saved = localStorage.getItem("phrasebook-tts-repeat");
    if (saved === "inf") return "inf";
    const n = Number(saved);
    return n === 3 || n === 6 ? n : 0;
  })();
  let remaining = 0;
  let expectingCancel = false;
  const listeners = /* @__PURE__ */ new Set();
  function cancelSpeech() {
    expectingCancel = true;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
    }
  }
  let onlineAudio = null;
  let onlineChunks = [];
  let onlineChunkIndex = 0;
  let onlineLangForTts = "en";
  function splitForOnlineTts(text, maxLen = 180) {
    const chunks = [];
    let rest = (text || "").trim();
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(" ", maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks.length ? chunks : [text];
  }
  function onlineTtsUrls(chunkText, langCode) {
    const q = encodeURIComponent(chunkText);
    return [
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${q}`,
      `https://api.streamelements.com/kappa/v2/speech?voice=${langCode}&text=${q}`
    ];
  }
  function stopOnlineAudio() {
    if (onlineAudio) {
      try {
        onlineAudio.pause();
      } catch (e) {
      }
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
      if (globalRepeatSetting === "inf") {
        playOnlineChunk(0);
        return;
      }
      if (remaining > 0) {
        remaining -= 1;
        playOnlineChunk(0);
        return;
      }
      status = "idle";
      wordIndex = 0;
      notify();
      return;
    }
    onlineChunkIndex = idx;
    wordIndex = wordIndexForCharOffset(
      Math.min(fullText.length - 1, Math.floor(idx / Math.max(onlineChunks.length, 1) * fullText.length))
    );
    status = "playing";
    notify();
    playOnlineChunkUrls(onlineTtsUrls(onlineChunks[idx], onlineLangForTts), 0, idx);
  }
  function speakOnline(text, langCodeForTts, startWordIndex) {
    stopOnlineAudio();
    mode = "online";
    fullText = text;
    words = tokenize(text);
    onlineChunks = splitForOnlineTts(text);
    onlineLangForTts = langCodeForTts;
    remaining = globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
    let startChunk = 0;
    if (Number.isInteger(startWordIndex) && startWordIndex > 0 && words.length && onlineChunks.length) {
      const frac = Math.min(Math.max(startWordIndex / words.length, 0), 1);
      startChunk = Math.min(onlineChunks.length - 1, Math.floor(frac * onlineChunks.length));
    }
    playOnlineChunk(startChunk);
  }
  function notify() {
    listeners.forEach(
      (cb) => cb({ key, status, wordIndex, total: words.length, rate, globalRepeatSetting, remaining })
    );
  }
  function tokenize(text) {
    const arr = [];
    const re = /\S+/g;
    let m;
    while (m = re.exec(text)) arr.push({ start: m.index, end: m.index + m[0].length });
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
    const elapsedSec = (Date.now() - segmentStartTime) / 1e3;
    const estOffset = segmentStartOffset + elapsedSec * FALLBACK_CHARS_PER_SEC * rate;
    return wordIndexForCharOffset(Math.min(estOffset, fullText.length - 1));
  }
  function getBestVoice(langCode) {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split("-")[0];
    let preferred = voices.find(
      (v) => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural")) && (v.name.includes("Female") || v.name.includes("Male"))
    );
    if (!preferred) {
      preferred = voices.find(
        (v) => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural"))
      );
    }
    if (!preferred) {
      preferred = voices.find(
        (v) => v.lang.startsWith(langPrefix) && (v.name.includes("Enhanced") || v.name.includes("Premium"))
      );
    }
    if (!preferred) {
      preferred = voices.find((v) => v.lang.startsWith(langPrefix));
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
    if (status === "paused" && !forceRestart) {
      const baseOffset2 = words[wordIndex].start;
      segmentStartOffset = baseOffset2;
      segmentStartTime = Date.now();
      boundaryFired = false;
      status = "playing";
      notify();
      const segment2 = fullText.slice(baseOffset2);
      const utter2 = new SpeechSynthesisUtterance(segment2);
      utter2.lang = locale;
      utter2.rate = rate;
      const bestVoice2 = getBestVoice(locale);
      if (bestVoice2) utter2.voice = bestVoice2;
      utter2.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        boundaryFired = true;
        const abs = baseOffset2 + (e.charIndex || 0);
        wordIndex = wordIndexForCharOffset(abs);
        notify();
      };
      utter2.onend = () => {
        if (status !== "playing") return;
        if (globalRepeatSetting === "inf") {
          speakFromWord(0, true);
          return;
        }
        if (remaining > 0) {
          remaining -= 1;
          speakFromWord(0, true);
          return;
        }
        status = "idle";
        wordIndex = 0;
        notify();
      };
      utter2.onerror = (e) => {
        if (expectingCancel) {
          expectingCancel = false;
          return;
        }
        status = "idle";
        notify();
      };
      currentUtterance = utter2;
      window.speechSynthesis.speak(utter2);
      return;
    }
    cancelSpeech();
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
      if (globalRepeatSetting === "inf") {
        speakFromWord(0, true);
        return;
      }
      if (remaining > 0) {
        remaining -= 1;
        speakFromWord(0, true);
        return;
      }
      status = "idle";
      wordIndex = 0;
      notify();
    };
    utter.onerror = (e) => {
      if (expectingCancel) {
        expectingCancel = false;
        return;
      }
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
      return { key, status, wordIndex, total: words.length, rate, globalRepeatSetting, remaining };
    },
    // آفستِ کاراکتریِ نقطه‌ی فعلیِ پخش، داخلِ متنی که همین الان در حال
    // خوندنشه. برای «ادامه‌ی پخش از همون‌جا» وقتی متنِ در حال پخش عوض
    // می‌شه (مثلاً تغییرِ حالتِ نمایش ترجمه) لازمه.
    getCharOffset() {
      if (!words.length) return 0;
      const idx = status === "playing" ? estimateWordIndex() : wordIndex;
      const clamped = Math.min(Math.max(idx, 0), words.length - 1);
      return words[clamped].start;
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
      } catch (e) {
      }
      if (status === "playing" || status === "paused") {
        remaining = globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
      }
      notify();
    },
    toggle(text, code, startWordIndex) {
      try {
        if (!text) return "unsupported";
        const hasSynthesis = "speechSynthesis" in window;
        let newLocale = TTS_LOCALE[code] || "en-US";
        if (hasSynthesis && code === "fa") {
          const voices2 = window.speechSynthesis.getVoices();
          const hasPersianVoice = voices2.some((v) => v.lang.startsWith("fa"));
          if (!hasPersianVoice) {
            const arabicVoice = voices2.find((v) => v.lang.startsWith("ar"));
            if (arabicVoice) newLocale = "ar-SA";
          }
        }
        const newKey = `${newLocale}::${text}`;
        if (key === newKey && status === "playing") {
          if (mode === "online") {
            if (onlineAudio) {
              try {
                onlineAudio.pause();
              } catch (e) {
              }
            }
            status = "paused";
            notify();
            return "ok";
          }
          wordIndex = estimateWordIndex();
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
            speakFromWord(wordIndex, false);
          }
          return "ok";
        }
        const voices = hasSynthesis ? window.speechSynthesis.getVoices() : [];
        const baseLang = newLocale.split("-")[0].toLowerCase();
        const hasVoice = voices.some((v) => v.lang && v.lang.toLowerCase().startsWith(baseLang));
        key = newKey;
        locale = newLocale;
        if (hasSynthesis && (voices.length === 0 || hasVoice)) {
          mode = "local";
          stopOnlineAudio();
          fullText = text;
          words = tokenize(text);
          status = "playing";
          remaining = globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
          const startIdx = Number.isInteger(startWordIndex) ? Math.min(Math.max(startWordIndex, 0), Math.max(words.length - 1, 0)) : 0;
          speakFromWord(startIdx, true);
          return "ok";
        }
        cancelSpeech();
        const onlineLang = code === "zh" ? "zh-CN" : code;
        speakOnline(text, onlineLang, startWordIndex);
        return "online-fallback";
      } catch (e) {
        status = "idle";
        notify();
        return "error";
      }
    },
    seek(delta) {
      if (!key || !words.length || mode === "online") return;
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
      cancelSpeech();
      stopOnlineAudio();
      mode = "local";
      key = null;
      words = [];
      status = "idle";
      wordIndex = 0;
      remaining = 0;
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
      } catch (e) {
      }
      if (status === "playing" && mode === "online") {
        if (onlineAudio) onlineAudio.playbackRate = rate;
        notify();
      } else if (status === "playing") {
        speakFromWord(estimateWordIndex(), true);
      } else {
        notify();
      }
    }
  };
})();
function useAutoplayOnScroll(enabled, items) {
  const nodeMapRef = useRef(/* @__PURE__ */ new Map());
  const indexRef = useRef(0);
  const genRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    if (!enabled) {
      speechController.stop();
      genRef.current++;
      return;
    }
    const myGen = ++genRef.current;
    let unsub = null;
    function playAt(i) {
      if (myGen !== genRef.current) return;
      const list = itemsRef.current;
      if (i >= list.length) {
        indexRef.current = 0;
        return;
      }
      indexRef.current = i;
      const item = list[i];
      const node = nodeMapRef.current.get(String(item.id));
      if (node && node.scrollIntoView) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      window.setTimeout(() => {
        if (myGen !== genRef.current) return;
        if (!item.text) {
          playAt(i + 1);
          return;
        }
        let started = false;
        if (unsub) unsub();
        unsub = speechController.subscribe((state) => {
          if (myGen !== genRef.current) return;
          if (state.status === "playing") started = true;
          if (state.status === "idle" && started) {
            if (unsub) {
              unsub();
              unsub = null;
            }
            playAt(i + 1);
          }
        });
        speechController.toggle(item.text, item.code);
      }, 450);
    }
    playAt(indexRef.current);
    return () => {
      genRef.current++;
      if (unsub) unsub();
    };
  }, [enabled]);
  useEffect(() => {
    indexRef.current = 0;
  }, [items.length]);
  const registerRef = (id) => (node) => {
    const key = String(id);
    if (node) nodeMapRef.current.set(key, node);
    else nodeMapRef.current.delete(key);
  };
  return { registerRef };
}
function AutoplayToggle({ enabled, onToggle, color }) {
  const c = color || colors.gold;
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onToggle,
      "aria-label": "پخش خودکار هنگام اسکرول",
      title: enabled ? "پخش خودکار روشن است — بزن خاموش کن" : "با اسکرول، هر کارت خودکار خونده بشه",
      className: "flex items-center gap-1",
      style: {
        fontFamily: fontFa,
        fontSize: 11,
        fontWeight: 700,
        color: enabled ? "white" : c,
        backgroundColor: enabled ? c : "transparent",
        border: `1px solid ${c}`,
        borderRadius: 14,
        padding: "3px 9px"
      }
    },
    /* @__PURE__ */ React.createElement(PlayCircle, { size: 14 }),
    "پخش با اسکرول"
  );
}
const OFFLINE_DICT_CACHE_NAME = "phrasebook-offline-dict-v1";
const OFFLINE_DICT_LANGS = ["en"];
const offlineDictionary = /* @__PURE__ */ (() => {
  const loaded = /* @__PURE__ */ new Map();
  const listeners = /* @__PURE__ */ new Set();
  function notify() {
    listeners.forEach((cb) => cb());
  }
  function fileUrl(code) {
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
    } catch (e) {
    }
  }
  async function download(code, onProgress) {
    const url = fileUrl(code);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`دانلود دیکشنری ${code} شکست خورد (HTTP ${res.status})`);
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
        if (onProgress) onProgress(total ? Math.min(99, Math.round(received / total * 100)) : 60);
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
      } catch (e) {
      }
    }
    if (onProgress) onProgress(100);
    notify();
    return data.length;
  }
  function entryCount(code) {
    return loaded.get(code)?.length || 0;
  }
  function lookup(word, code) {
    const list = loaded.get(code);
    if (!list || !word) return [];
    const q = word.trim().toLowerCase();
    const qFa = word.trim();
    if (!q) return [];
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
    }
  };
})();
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
    maxTokens: Math.min(Math.max(maxTokens || 300, 64), 8192)
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        const isRateLimited = res.status === 429;
        const isClientError = res.status >= 400 && res.status < 500 && !isRateLimited;
        try {
          const errBody = await res.json();
          detail = errBody.error || detail;
        } catch (_) {
        }
        if ((!isClientError || isRateLimited) && attempt < Math.max(retries, isRateLimited ? 1 : retries)) {
          const retrySecondsMatch = detail.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
          const waitMs = isRateLimited ? Math.ceil((retrySecondsMatch ? parseFloat(retrySecondsMatch[1]) : 15) * 1e3) + 500 : 700 * (attempt + 1);
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
      const isNetworkFailure = e instanceof TypeError;
      if (!isKnownServerError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      if (isKnownServerError) throw e;
      throw new Error(
        isNetworkFailure ? `ai-backend-error: به سرور (${base}) وصل نشد. یعنی خودِ Cloudflare Worker جواب نداد — چک کن: ۱) آخرین دیپلوی توی داشبورد Cloudflare بدون خطا انجام شده باشه، ۲) این آدرس رو مستقیم توی مرورگر باز کن (${base}/health) و ببین یه JSON برمی‌گردونه یا خطا می‌ده، ۳) آدرس بک‌اند توی تنظیمات اپ (اگه دستی ست کردی) درست باشه.` : `ai-backend-error: ${msg || "خطای ناشناخته در اتصال"}`
      );
    }
  }
}
const WORD_CACHE_KEY = "phrasebook-word-lookup-cache-v1";
function normalizeWord(raw) {
  return (raw || "").toLowerCase().replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "").trim();
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
  } catch {
  }
}
const SAVED_STORY_WORDS_KEY = "phrasebook-saved-story-words-v1";
const SAVED_WORDS_CHANGED_EVENT = "phrasebook:savedWordsChanged";
const STORY_WORD_PICKED_EVENT = "phrasebook:storyWordPicked";
const crossTranslateInFlight = /* @__PURE__ */ new Set();
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
function toggleSavedStoryWord(word, langCode, opts) {
  const w = normalizeWord(word);
  if (!w) return false;
  const cleanWord = (word || "").replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "").trim();
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
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      translations,
      origin: { tab: currentOriginTab }
    });
    nowSaved = true;
  }
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {
  }
  return nowSaved;
}
function updateSavedWordTranslation(word, langCode, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const w = normalizeWord(word);
  const list = loadSavedStoryWords();
  const idx = list.findIndex((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (idx === -1) return;
  const entry = list[idx];
  const prev = entry.translations && entry.translations[targetLangCode] || "";
  if (prev === translatedText.trim()) return;
  const translations = { ...entry.translations || {}, [targetLangCode]: translatedText.trim() };
  list[idx] = { ...entry, translations };
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {
  }
}
function ensureSavedStoryWord(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return;
  const cleanWord = (word || "").replace(/^[«»"'.,!?;:()\u060C\u061B\u061F]+|[«»"'.,!?;:()\u060C\u061B\u061F]+$/g, "").trim();
  const list = loadSavedStoryWords();
  const exists = list.some((e) => e.langCode === langCode && normalizeWord(e.word) === w);
  if (exists) return;
  list.unshift({
    word: cleanWord || word,
    langCode,
    savedAt: (/* @__PURE__ */ new Date()).toISOString(),
    translations: {},
    origin: { tab: currentOriginTab }
  });
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {
  }
}
function removeSavedStoryWord(word, langCode) {
  const list = loadSavedStoryWords().filter(
    (e) => !(e.langCode === langCode && normalizeWord(e.word) === normalizeWord(word))
  );
  try {
    window.localStorage.setItem(SAVED_STORY_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SAVED_WORDS_CHANGED_EVENT));
  } catch {
  }
}
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
      const mergedTranslations = { ...cloudEntry.translations || {}, ...existing.translations || {} };
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
  } catch {
  }
}
function addTextToStoryPicks(text, langCode) {
  const clean = (text || "").trim();
  if (!clean) return;
  ensureSavedStoryWord(clean, langCode);
  try {
    window.dispatchEvent(new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: clean, langCode } }));
  } catch {
  }
}
const WORD_EXAMPLES_KEY = "phrasebook-word-examples-v1";
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  list.unshift(entry);
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
  } catch {
  }
  return entry;
}
function updateWordExampleTranslation(word, langCode, exampleId, targetLangCode, translatedText) {
  if (!translatedText || !translatedText.trim()) return;
  const all = loadAllWordExamples();
  const key = wordExamplesKey(word, langCode);
  const list = all[key] || [];
  const idx = list.findIndex((e) => e.id === exampleId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], translations: { ...list[idx].translations || {}, [targetLangCode]: translatedText.trim() } };
  all[key] = list;
  try {
    window.localStorage.setItem(WORD_EXAMPLES_KEY, JSON.stringify(all));
  } catch {
  }
}
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
  } catch {
  }
}
async function generateWordExample({ word, langCode, meaningNative, nativeLabel, existingExamples, aiSettings }) {
  const langLabel = typeof LANGUAGES !== "undefined" && LANGUAGES.find((l) => l.code === langCode)?.label || langCode;
  const avoidBlock = existingExamples && existingExamples.length ? `Do NOT reuse or closely paraphrase any of these already-used examples for this same word:
${existingExamples.map((e, i) => `${i + 1}. ${e}`).join("\n")}

` : "";
  const prompt = `Write exactly ONE natural example sentence in ${langLabel} that uses the word/expression "${word}"` + (meaningNative ? ` (its ${nativeLabel || "native-language"} meaning is: "${meaningNative}")` : "") + ` in a way that reflects REAL, current, everyday usage — the kind of sentence a native speaker might actually say or write today, optionally touching on everyday life, technology, or something plausibly connected to current news/world events. Avoid textbook-sounding, generic sentences. Keep it natural length (roughly 8-20 words), grammatically correct, and appropriate for a language learner to study.

` + avoidBlock + `Respond with ONLY the example sentence itself in ${langLabel} — no quotes, no translation, no numbering, no explanation, nothing else.`;
  const result = await callAI({ prompt, maxTokens: 150, retries: 1, aiSettings });
  return String(result || "").replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
}
const READING_SESSIONS_KEY = "phrasebook-reading-sessions-v1";
const READING_SESSIONS_CHANGED_EVENT = "phrasebook:readingSessionsChanged";
function loadReadingSessions() {
  try {
    const raw = window.localStorage.getItem(READING_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function formatJalaliDate(date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}
function saveReadingSession({ category = "story", langCode, startedAt, endedAt, durationSeconds }) {
  if (!durationSeconds || durationSeconds < 3) return;
  const list = loadReadingSessions();
  const endDate = new Date(endedAt);
  list.unshift({
    id: `${endedAt}-${Math.random().toString(36).slice(2, 7)}`,
    category,
    langCode: langCode || null,
    startedAt,
    endedAt,
    durationSeconds: Math.round(durationSeconds),
    gregorianDate: endDate.toISOString().slice(0, 10),
    jalaliDate: formatJalaliDate(endDate)
  });
  try {
    window.localStorage.setItem(READING_SESSIONS_KEY, JSON.stringify(list.slice(0, 800)));
    window.dispatchEvent(new Event(READING_SESSIONS_CHANGED_EVENT));
  } catch {
  }
}
function buildReadingReport() {
  const sessions = loadReadingSessions();
  if (!sessions.length) return null;
  const appSessions = sessions.filter((e) => e.category === "app");
  const totalAppSeconds = appSessions.reduce((s, e) => s + e.durationSeconds, 0);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const todaySeconds = appSessions.filter((e) => e.gregorianDate === today).reduce((s, e) => s + e.durationSeconds, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1e3);
  const weekSeconds = appSessions.filter((e) => new Date(e.endedAt) >= weekAgo).reduce((s, e) => s + e.durationSeconds, 0);
  const byCategory = {};
  sessions.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.durationSeconds;
  });
  const byLang = {};
  sessions.filter((e) => e.langCode).forEach((e) => {
    byLang[e.langCode] = (byLang[e.langCode] || 0) + e.durationSeconds;
  });
  return {
    totalSessions: sessions.length,
    totalAppMinutes: Math.round(totalAppSeconds / 60),
    todayMinutes: Math.round(todaySeconds / 60),
    weekMinutes: Math.round(weekSeconds / 60),
    byCategoryMinutes: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, Math.round(v / 60)])),
    byLangMinutes: Object.fromEntries(Object.entries(byLang).map(([k, v]) => [k, Math.round(v / 60)])),
    recent: sessions.slice(0, 10).map((e) => ({
      category: e.category,
      langCode: e.langCode,
      minutes: Math.max(1, Math.round(e.durationSeconds / 60)),
      gregorianDate: e.gregorianDate,
      jalaliDate: e.jalaliDate
    }))
  };
}
function useActivityTimeTracker(category, isActive, langCode) {
  const startRef = useRef(null);
  useEffect(() => {
    function start() {
      if (!startRef.current) startRef.current = (/* @__PURE__ */ new Date()).toISOString();
    }
    function stop() {
      if (!startRef.current) return;
      const startedAt = startRef.current;
      startRef.current = null;
      const endedAt = (/* @__PURE__ */ new Date()).toISOString();
      const durationSeconds = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1e3;
      saveReadingSession({ category, langCode, startedAt, endedAt, durationSeconds });
    }
    if (isActive && (typeof document === "undefined" || document.visibilityState === "visible")) start();
    else stop();
    function handleVisibility() {
      if (!isActive) return;
      if (document.visibilityState === "visible") start();
      else stop();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", stop);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", stop);
      stop();
    };
  }, [isActive, category, langCode]);
}
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
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  list.unshift(entry);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {
  }
  return entry;
}
function removeGrammarNote(id) {
  const list = loadGrammarNotes().filter((n) => n.id !== id);
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {
  }
}
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
  } catch {
  }
}
function updateGrammarNoteMarkdown(id, markdown) {
  if (!markdown) return;
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], markdown };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {
  }
}
function appendGrammarNoteThread(id, { question, answer }) {
  const list = loadGrammarNotes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const thread = Array.isArray(list[idx].thread) ? list[idx].thread : [];
  list[idx] = { ...list[idx], thread: [...thread, { question, answer }] };
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {
  }
}
let requestGrammarJump = null;
async function lookupWordGrammarDetail({ word, sentence, langCode, nativeLang, nativeLabel, aiSettings }) {
  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label || langCode;
  const prompt = `You are an expert ${langLabel} teacher preparing a beginner-friendly grammar breakdown of one sentence, for internal use only. Your ENTIRE reply must be plain ENGLISH — headers, explanations, everything — no matter what ${langLabel} is or what the learner's native language is. A separate step (not you) will translate the English explanatory text afterward, so you never need to translate anything into another language yourself.

Sentence in ${langLabel}: "${sentence}"
Word the learner tapped on, to focus on especially: "${word}"

⛔️ CRITICAL FORMAT RULE, before anything else: every time you write a full example sentence in ${langLabel} (the main sentence itself, or a new example/practice sentence), wrap that entire sentence — and ONLY that ${langLabel} sentence — on its own line between double section-marks, exactly like this: §§Sentence in ${langLabel} here§§. Never wrap English text in §§. Never put an ${langLabel} sentence and English commentary on the same line. Introducing a single ${langLabel} vocabulary word (not a full sentence) with **bold** followed by its English gloss (e.g. **word** — meaning) does NOT need §§ around it — §§ is only for full sentences.

Follow EXACTLY this structure:

## 1. Simple meaning
Give the ${langLabel} sentence wrapped in §§...§§ on its own bolded line, then on the next line a natural, complete English translation of it — never literal/word-for-word, never incomplete.

## 2. Sentence structure
Point out the main pieces by quoting the actual ${langLabel} words, like this pattern: "Subject: **[actual word]** (meaning: ...) — Verb: **[actual word]** (meaning: ...)", plus object or other key parts if relevant. Every line here stays clean English with the quoted ${langLabel} word always **bold**, never blended into a running sentence.

## 3. Key words
Bullet only the genuinely important words (skip trivial ones like articles/prepositions) in this format: **word** — meaning, and its grammatical role in plain English (e.g. "auxiliary verb", "adjective" — never unexplained jargon). Give "${word}" extra detail: exactly what role it plays in this specific sentence.

## 4. Grammar note
Explain the ONE main grammar point in this sentence like a patient, great teacher — step by step, in plain English, why it works this way and how it differs from similar structures. Then give one small everyday example (different from the main sentence) that shows the same point: a full, correct ${langLabel} sentence wrapped in §§...§§ on its own line, immediately followed on the next line by its full English translation — never merge these two lines.

## 5. Key phrase or expression
If the sentence has a genuinely important fixed phrase/collocation, explain its meaning and give exactly 2 short, everyday example sentences — each a complete ${langLabel} sentence wrapped in §§...§§ on its own line, immediately followed by its English translation on the next line. If there truly isn't one, omit this whole section — don't force it.

## 6. Practice
Write 2 new, simple, genuinely everyday practice sentences in ${langLabel} that drill the same grammar point/word (not copies of the main sentence) — each wrapped in §§...§§ on its own line, immediately followed on the next line by its full English translation. Never merge a practice sentence and its translation onto one line.

General rules: keep every section short and useful (no padding), never use unexplained grammar jargon, only mention what's genuinely useful for everyday conversation. Before answering, re-check every ${langLabel} sentence is wrapped in §§...§§ and every other line is plain English with no ${langLabel} words dropped in unmarked. Return ONLY the markdown, nothing before or after.`;
  const englishText = await callAI({ prompt, maxTokens: 1100, aiSettings });
  return await localizeGrammarDetailMarkdown(englishText.trim(), nativeLang, aiSettings);
}
async function localizeGrammarDetailMarkdown(englishText, nativeLang, aiSettings) {
  const text = String(englishText || "");
  if (!nativeLang || nativeLang === "en") return text.replace(/§§/g, "");
  const lines = text.split(/\r?\n/);
  const translatedLines = await Promise.all(
    lines.map(async (raw) => {
      const line = raw.trim();
      if (!line) return raw;
      const wrapped = line.match(/^§§(.+)§§$/);
      if (wrapped) return wrapped[1];
      const headerMatch = line.match(/^(#{1,3}\s*\d*\.?\s*)(.+)$/);
      if (headerMatch) {
        const [, prefix, title] = headerMatch;
        const translatedTitle = await translateFree(title, nativeLang, "en", aiSettings);
        return prefix + (translatedTitle || title);
      }
      const bulletMatch = line.match(/^(-\s*\*\*.+?\*\*\s*[—-]\s*)(.+)$/);
      if (bulletMatch) {
        const [, prefix, rest] = bulletMatch;
        const translatedRest = await translateFree(rest, nativeLang, "en", aiSettings);
        return prefix + (translatedRest || rest);
      }
      const translated = await translateFree(line, nativeLang, "en", aiSettings);
      return translated || line;
    })
  );
  return translatedLines.join("\n").replace(/§§/g, "");
}
async function askGrammarTeacher({ userSentence, langCode, nativeLang, nativeLabel, aiSettings, history }) {
  const label = nativeLabel || "Persian";
  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label || langCode;
  const historyText = (history || []).slice(-8).map((m) => `${m.role === "user" ? "Learner" : "Teacher"}: ${m.text}`).join("\n");
  const prompt = `You are an expert, patient, encouraging ${langLabel} language teacher helping a true beginner whose native language is ${label}.

🚨 HARD LANGUAGE RULE (read this twice): your ENTIRE reply — every explanation, every header, every sentence of commentary — must be written in ${label}. This applies NO MATTER WHAT language the learner's message, question, or the sentence being discussed is in, and no matter what language ${langLabel} (the language being learned) is. The ONLY things allowed to appear in ${langLabel} are: the example/practice sentences themselves, and individual quoted words being pointed out (e.g. **word**). Never write a full explanatory sentence in ${langLabel} or in English — if you catch yourself doing that, stop and rewrite it in ${label}. This rule applies equally to brand-new sentences (case A) and to follow-up questions (case B) below.

Formatted in Markdown, beginner-friendly (A1/A2 level), and genuinely FUN to read — never a dry, robotic list.
` + (historyText ? `Recent conversation so far, for context — use it to understand what the learner is referring to:
${historyText}

` : "") + `The learner's new message is: "${userSentence}"

First decide which of these two situations this is:
A) A NEW sentence in ${langLabel} that the learner wants checked/practiced (this is the default when there's no earlier conversation, or the message reads like a fresh attempt at a sentence).
B) A FOLLOW-UP question about something you (the teacher) already said above — e.g. asking "چرا will نه؟", "یعنی چی؟", "فرق ... با ... چیه؟", or anything else that's clearly a question about the previous explanation rather than a new sentence to check. This includes questions that themselves mix in ${langLabel} words or conversation  (like "i will speak, i am speaking, i speak فرق چیه") — the question being partly in ${langLabel} does NOT mean you should answer in ${langLabel}; your answer is still 100% in ${label}.

IF (B) — follow-up question:
Just answer their question directly and conversationally, ENTIRELY in ${label} (see hard rule above), referring back to the earlier sentence/explanation from the conversation above as needed. Keep it short, clear, and warm — like a teacher answering a student, not a fixed report. Use a short header like "## 💬 جواب سوالت" if it reads well, bold (**) for the key word/rule being explained, and a tiny example if it genuinely helps. Do NOT redo the full correction+breakdown structure below — only follow it for case (A). Return ONLY the markdown.

IF (A) — new sentence to check, respond with EXACTLY this structure, in ${label} (headers included), for the sentence: "${userSentence}":

Write like a warm, professional language teacher who makes complicated things sound simple for a real beginner — never like a dry grammar manual or a list of technical terms. Only ever mention what's actually USEFUL for everyday conversation, nothing extra.

## ۱. معنی ساده
One simple, natural ${label} translation of the whole sentence, in a single line (bold the original ${langLabel} sentence first, then the translation).

## ۲. ساختار جمله
Point out the main structural pieces by literally quoting the actual word(s) from the sentence, like this pattern: «فاعل: **[actual word]** (${label}: ...) — فعل: **[actual word]** (${label}: ...)» plus مفعول/عبارت‌های مهم if relevant. Keep every line of this section clean — the ${langLabel} word always **bold** and separate from its ${label} gloss, never blended into one running sentence.

## ۳. کلمه‌های مهم
Bullet each genuinely important word (skip trivial ones like "the"/"a"): **word** — meaning, and its role in plain language (نه اصطلاح فنی بدون توضیح — اگه یه اصطلاح دستوری لازمه، همون‌جا با یه مثال ساده توضیحش بده).

## ۴. نکته‌ی گرامری
The ONE main grammar point in this sentence, explained the way a great teacher would — simply, step by step, never with unexplained jargon. Then give one small everyday example (different from the main sentence) that shows this same point: a full, correct ${langLabel} sentence on its own line, and immediately below it, on a separate line, its full correct ${label} translation — never merge these two lines.

## ۵. ترکیب یا عبارت مهم
If there's a meaningful fixed phrase/collocation, give its meaning + exactly 2 short everyday example sentences — each a complete ${langLabel} sentence on its own line, immediately followed by a separate line with its full ${label} translation. If there genuinely isn't one, skip this whole section entirely (don't force it).

## ۶. تمرین کن
2 new, simple, genuinely everyday practice sentences in ${langLabel} that drill the same grammar point/word (not a copy of the main sentence) — each a complete, correct sentence on its own line, immediately followed by a separate line with its full, natural ${label} translation.

Keep every section SHORT — a couple of lines each, not paragraphs. No filler, no repeating yourself, no unexplained technical terms.

⛔️ CRITICAL: never drop a ${langLabel} word or phrase in the middle of a ${label} sentence, or vice versa (e.g. never write something like «او afraid به خفه شدن» — that is broken and wrong). Every sentence must be entirely in ONE language; the only exception is a single word/phrase being introduced with **bold** immediately followed by its gloss (e.g. **afraid** — ترسیده), never woven into a flowing sentence. Before you output anything, silently re-check every ${langLabel} and every ${label} line for this — if any line is broken, incomplete, or mixes languages, rewrite it. Keep everything short, warm, and genuinely engaging — like a great teacher, not a manual. Use headers (##) and bold (**) exactly like Markdown. Return ONLY the markdown, for whichever case (A or B) applies.`;
  const text = await callAI({ prompt, maxTokens: 1700, aiSettings });
  return text.trim();
}
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
    if (m[2] !== void 0) {
      parts.push(/* @__PURE__ */ React.createElement("b", { key: `${keyBase}-${key++}` }, m[2]));
    } else if (m[3] !== void 0) {
      parts.push(
        /* @__PURE__ */ React.createElement(
          "code",
          {
            key: `${keyBase}-${key++}`,
            dir: "auto",
            style: { background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontFamily: fontLatin }
          },
          m[3]
        )
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}
function extractSpeakableText(markdown) {
  if (!markdown) return "";
  const lines = String(markdown).split(/\r?\n/);
  const kept = [];
  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) continue;
    if (/^-{3,}$/.test(line)) continue;
    line = line.replace(/^[-*]\s+/, "");
    line = line.replace(/^(ترجمه|Translation)\s*:\s*/i, "TRANSLATION::");
    if (line.startsWith("TRANSLATION::")) continue;
    if (/[\u0600-\u06FF]/.test(line)) continue;
    line = line.replace(/^[❌✅🟢🟡🔴]\s*/u, "");
    line = line.replace(/\*\*/g, "").replace(/`/g, "");
    line = line.replace(/^\*\*?🔹.*?:\*\*?/, "").trim();
    if (!line) continue;
    kept.push(line);
  }
  return kept.join(". ");
}
function isPersianScriptLine(s) {
  const persianChars = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const letters = (s.match(/[^\s\d.,;:!?()"'«»\-–—]/g) || []).length;
  return letters > 0 && persianChars / letters > 0.4;
}
function stripMdInline(s) {
  return String(s || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1");
}
function MiniMarkdown({ text, speakCode, nativeLang, aiSettings }) {
  if (!text) return null;
  const alwaysSpeak = speakCode && ["fa", "ar"].includes(speakCode);
  const shouldSpeak = (line) => !!speakCode && (alwaysSpeak || !isPersianScriptLine(line));
  const renderContent = (content, key) => {
    if (nativeLang && shouldSpeak(content)) {
      return /* @__PURE__ */ React.createElement(
        ClickableSentence,
        {
          text: stripMdInline(content),
          langCode: speakCode,
          nativeLang,
          aiSettings
        }
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
        /* @__PURE__ */ React.createElement("ul", { key: blocks.length, style: { margin: "4px 0 8px", paddingInlineStart: 18 } }, listBuffer.map((li, i) => (
          // dir="auto" اینجا لازمه که برای هر خط جدا تصمیم بگیره راست‌چین
          // باشه یا چپ‌چین (بر اساس اولین حرفِ همون خط)، نه اینکه از یه
          // جهتِ کلیِ ثابت (که معمولاً فارسیه) برای کل کارت پیروی کنه —
          // وگرنه جمله‌های انگلیسیِ خالص هم بر عکس/به‌هم‌ریخته نشون داده
          // می‌شن، دقیقاً همون مشکلی که توی مثال‌ها پیش اومده بود.
          /* @__PURE__ */ React.createElement("li", { key: i, dir: "auto", className: "flex items-start gap-1", style: { marginBottom: 2, lineHeight: 1.8, textAlign: "start" } }, shouldSpeak(li) && /* @__PURE__ */ React.createElement(SpeakButton, { text: li, code: speakCode, color: colors.inkSoft }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, renderContent(li, `${blocks.length}-${i}`)))
        )))
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
        /* @__PURE__ */ React.createElement(
          "p",
          {
            key: blocks.length,
            dir: "auto",
            className: "flex items-start gap-1",
            style: {
              fontWeight: 800,
              fontSize: level === 1 ? 16 : level === 2 ? 15 : 14,
              margin: "10px 0 4px",
              color: colors.ink,
              textAlign: "start"
            }
          },
          shouldSpeak(content) && /* @__PURE__ */ React.createElement(SpeakButton, { text: content, code: speakCode, color: colors.inkSoft }),
          /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, renderContent(content, blocks.length))
        )
      );
      return;
    }
    if (/^-{3,}$/.test(line)) {
      flushList();
      blocks.push(
        /* @__PURE__ */ React.createElement("hr", { key: blocks.length, style: { border: "none", borderTop: `1px dashed ${colors.cardBorder}`, margin: "8px 0" } })
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList();
    blocks.push(
      /* @__PURE__ */ React.createElement("p", { key: blocks.length, dir: "auto", className: "flex items-start gap-1", style: { margin: "4px 0", lineHeight: 1.9, textAlign: "start" } }, shouldSpeak(line) && /* @__PURE__ */ React.createElement(SpeakButton, { text: line, code: speakCode, color: colors.inkSoft }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, renderContent(line, blocks.length)))
    );
  });
  flushList();
  return /* @__PURE__ */ React.createElement("div", null, blocks);
}
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
  } catch {
  }
}
function parseCollectionText(rawText) {
  return rawText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(.+?)\s*[-–:=]\s*(.+)$/);
    return m ? { term: m[1].trim(), meaning: m[2].trim() } : { term: line, meaning: "" };
  }).filter((w) => w.term);
}
function addWordCollection({ langCode, title, rawText }) {
  const words = parseCollectionText(rawText);
  if (!title.trim() || !words.length) return null;
  const entry = {
    id: `${Date.now()}`,
    langCode,
    title: title.trim(),
    words,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const list = loadWordCollections();
  list.unshift(entry);
  saveWordCollectionsList(list);
  return entry;
}
function deleteWordCollection(id) {
  saveWordCollectionsList(loadWordCollections().filter((c) => c.id !== id));
}
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
  const words = list[idx].words.map(
    (w) => w.term === originalTerm ? { term: (patch.term ?? w.term).trim(), meaning: (patch.meaning ?? w.meaning ?? "").trim() } : w
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
    source: "vocab"
  };
}
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
  { code: "ja", label: "ژاپنی", abbr: "JA" }
];
const RTL_LANGS = ["fa", "ar"];
const dirFor = (code) => RTL_LANGS.includes(code) ? "rtl" : "ltr";
const PHRASEBOOK_LANGUAGES = LANGUAGES;
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
  repair: "تعمیر ماشین"
};
export const conversation = [];
const LEVEL_BY_EN_WORD = /* @__PURE__ */ new Map();
[...WORDS_AZ, ...NEWS_WORDS, ...DAILY_WORDS].forEach((w) => {
  const key = normalizeWord(w.en);
  if (key && !LEVEL_BY_EN_WORD.has(key)) LEVEL_BY_EN_WORD.set(key, w.level);
});
(DAILY_CONVERSATIONS || []).forEach((sc) => {
  [...sc.speakerA || [], ...sc.speakerB || []].forEach((it) => {
    const key = normalizeWord(it.en);
    if (key && it.level && !LEVEL_BY_EN_WORD.has(key)) LEVEL_BY_EN_WORD.set(key, it.level);
  });
});
const LEVEL_BY_LANG_WORD = /* @__PURE__ */ new Map();
[...VOCAB, ...conversation].forEach((v) => {
  if (!v.level) return;
  Object.entries(v.t || {}).forEach(([code, text]) => {
    const key = `${code}:${normalizeWord(text)}`;
    if (text && !LEVEL_BY_LANG_WORD.has(key)) LEVEL_BY_LANG_WORD.set(key, v.level);
  });
});
function lookupSavedWordLevel(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return null;
  if (langCode === "en" && LEVEL_BY_EN_WORD.has(w)) return LEVEL_BY_EN_WORD.get(w);
  const key = `${langCode}:${w}`;
  if (LEVEL_BY_LANG_WORD.has(key)) return LEVEL_BY_LANG_WORD.get(key);
  return null;
}
function LangStamp({ lang, active, onClick, disabled }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: disabled ? void 0 : onClick,
      disabled,
      style: {
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
        transition: "background-color 0.15s, border-color 0.15s"
      },
      "aria-pressed": active,
      title: disabled ? `${lang.label} (زبان مادری‌ته، نمی‌تونه هم‌زمان مقصد باشه)` : lang.label
    },
    lang.abbr
  );
}
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
        if (dx < 8 && dy < 8) return;
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
  const orderedLangs = [
    ...order.map((code) => languages.find((l) => l.code === code)).filter(Boolean),
    ...languages.filter((l) => !order.includes(l.code))
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1", style: { WebkitOverflowScrolling: "touch" } }, orderedLangs.map((l) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: l.code,
      "data-lang-order-code": l.code,
      onMouseDown: (e) => {
        dragState.current = { code: l.code, startX: e.clientX, startY: e.clientY, dragging: false, longPressTimer: null };
      },
      onTouchStart: (e) => {
        const t = e.touches[0];
        const st = { code: l.code, startX: t.clientX, startY: t.clientY, dragging: false, longPressTimer: null };
        dragState.current = st;
        st.longPressTimer = setTimeout(() => {
          if (dragState.current === st && st.code) {
            st.dragging = true;
            setDragCode(st.code);
          }
        }, 320);
      },
      style: {
        touchAction: "pan-x",
        cursor: "grab",
        flexShrink: 0,
        transform: dragCode === l.code ? "scale(1.15)" : "scale(1)",
        transition: "transform 0.12s"
      }
    },
    /* @__PURE__ */ React.createElement(
      LangStamp,
      {
        lang: l,
        active: isActive(l.code),
        disabled: isDisabled ? isDisabled(l.code) : false,
        onClick: () => {
          if (!dragState.current.dragging) onClick(l.code);
        }
      }
    )
  )));
}
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
    const map = /* @__PURE__ */ new Map();
    [VOCAB, WORDS_AZ, NEWS_WORDS, DAILY_WORDS].forEach((list) => {
      (list || []).forEach((w) => {
        if (w?.en && !map.has(w.en)) map.set(w.en, true);
      });
    });
    return Array.from(map.keys());
  }, []);
  if (!open) return null;
  const toggleLang = (code) => {
    setSelectedLangs((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
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
  const pct = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => !running && onClose(),
      style: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        dir: "rtl",
        onClick: (e) => e.stopPropagation(),
        style: { backgroundColor: colors.paper, borderRadius: 18, padding: 20, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between", style: { marginBottom: 4 } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 15, fontWeight: 800, color: colors.ink } }, "دانلود آفلاین لغات"), !running && /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": "بستن" }, /* @__PURE__ */ React.createElement(X, { size: 18, color: colors.inkSoft }))),
      /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, lineHeight: 1.8, marginBottom: 14 } }, "زبان‌های موردنظرت رو انتخاب کن. برنامه ", allWords.length.toLocaleString("fa-IR"), " لغت رو یکی‌یکی با سرویس‌های ترجمه‌ی رایگان ترجمه و روی گوشی ذخیره می‌کنه — فقط همین یک‌بار به اینترنت نیاز داره؛ بعدش این لغات کاملاً آفلاین در دسترسن."),
      !running && !finished && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { marginBottom: 16 } }, LANGUAGES.filter((l) => l.code !== "en").map((l) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: l.code,
          onClick: () => toggleLang(l.code),
          style: {
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12.5,
            fontWeight: 600,
            border: `1.5px solid ${selectedLangs.includes(l.code) ? colors.gold : colors.cardBorder}`,
            backgroundColor: selectedLangs.includes(l.code) ? colors.goldSoft : "white",
            color: colors.ink
          }
        },
        l.label
      ))), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: startDownload,
          disabled: selectedLangs.length === 0,
          style: {
            width: "100%",
            padding: "11px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            backgroundColor: selectedLangs.length ? colors.ink : "#ccc",
            color: colors.paper
          }
        },
        "شروع دانلود",
        selectedLangs.length > 0 && ` (${(allWords.length * selectedLangs.length).toLocaleString("fa-IR")} ترجمه)`
      )),
      running && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { height: 10, borderRadius: 6, backgroundColor: "#eee", overflow: "hidden", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, backgroundColor: colors.gold, transition: "width .2s" } })), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 4 } }, progress.done.toLocaleString("fa-IR"), " از ", progress.total.toLocaleString("fa-IR"), " (", pct, "٪)"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginBottom: 16, direction: "ltr", textAlign: "left", opacity: 0.7 } }, currentWord), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: cancelDownload,
          style: { width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `1.5px solid ${colors.rose}`, color: colors.rose }
        },
        "لغو"
      )),
      finished && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "10px 0" } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, fontWeight: 700, color: colors.ink, marginBottom: 6 } }, "✅ تمام شد"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 16 } }, "الان ", cachedCount?.toLocaleString("fa-IR"), " ترجمه روی گوشی ذخیره‌ست و کاملاً آفلاین در دسترسه."), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, backgroundColor: colors.ink, color: colors.paper } }, "باشه")),
      !running && !finished && cachedCount !== null && cachedCount > 0 && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginTop: 12, textAlign: "center" } }, cachedCount.toLocaleString("fa-IR"), " ترجمه از قبل ذخیره شده (این‌ها دوباره دانلود نمی‌شن)")
    )
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
  return /* @__PURE__ */ React.createElement("div", { style: { position: "relative" }, ref: panelRef }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setOpen((v) => !v),
      "aria-label": "تنظیمات",
      title: "تنظیمات",
      style: { color: colors.goldSoft, display: "flex" }
    },
    /* @__PURE__ */ React.createElement(Menu, { size: 20 })
  ), open && /* @__PURE__ */ React.createElement(
    "div",
    {
      dir: "rtl",
      style: {
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
        zIndex: 50
      }
    },
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 } }, "حساب کاربری"),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { marginBottom: 14 } }, user?.picture ? /* @__PURE__ */ React.createElement("img", { src: user.picture, alt: "", style: { width: 30, height: 30, borderRadius: "50%" } }) : /* @__PURE__ */ React.createElement("div", { style: { width: 30, height: 30, borderRadius: "50%", background: colors.gold, color: colors.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 } }, (user?.name || user?.email || "?").trim().charAt(0).toUpperCase()), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, user?.name || "کاربر"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, user?.email))),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onLogout,
        className: "flex items-center gap-2",
        style: { fontSize: 12, color: colors.rose, marginBottom: 16 }
      },
      /* @__PURE__ */ React.createElement(LogOut, { size: 14 }),
      " خروج از حساب"
    ),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(Palette, { size: 14 }), " رنگ و تم"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { marginBottom: 16 } }, Object.entries(APP_THEMES).map(([key, t]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => update("theme", key),
        title: t.label,
        "aria-pressed": appPrefs.theme === key,
        style: {
          width: 34,
          height: 34,
          borderRadius: "50%",
          backgroundColor: t.swatch,
          border: appPrefs.theme === key ? `3px solid ${colors.ink}` : `1px solid ${colors.cardBorder}`,
          flexShrink: 0
        }
      }
    ))),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(Type, { size: 14 }), " نوع فونت"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { marginBottom: 16 } }, Object.entries(APP_FONTS).map(([key, f]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => update("font", key),
        style: {
          padding: "5px 12px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${appPrefs.font === key ? colors.gold : colors.cardBorder}`,
          backgroundColor: appPrefs.font === key ? colors.goldSoft : "white",
          color: colors.ink
        }
      },
      f.label
    ))),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 } }, "اندازه‌ی فونت"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { marginBottom: 16 } }, Object.entries(APP_FONT_SIZES).map(([key, s]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => update("fontSize", key),
        style: {
          padding: "5px 12px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${appPrefs.fontSize === key ? colors.gold : colors.cardBorder}`,
          backgroundColor: appPrefs.fontSize === key ? colors.goldSoft : "white",
          color: colors.ink
        }
      },
      s.label
    ))),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOfflineModalOpen(true),
        className: "flex items-center gap-2",
        style: { fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%" }
      },
      /* @__PURE__ */ React.createElement(BookOpen, { size: 14 }),
      " دانلود آفلاین لغات"
    )
  ), /* @__PURE__ */ React.createElement(OfflineWordsModal, { open: offlineModalOpen, onClose: () => setOfflineModalOpen(false), aiSettings }));
}
function TabButton({ label, icon: Icon, active, onClick }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      className: "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
      style: {
        fontFamily: fontFa,
        backgroundColor: active ? colors.ink : "transparent",
        color: active ? colors.paper : colors.inkSoft,
        border: `1px solid ${active ? colors.ink : colors.cardBorder}`,
        whiteSpace: "nowrap"
      }
    },
    /* @__PURE__ */ React.createElement(Icon, { size: 16 }),
    label
  );
}
function SpeakButton({ text, code, color, edge }) {
  const locale = TTS_LOCALE[code] || "en-US";
  const myKey = `${locale}::${text}`;
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);
  const isActive = state.key === myKey && state.status !== "idle";
  const isPlaying = isActive && state.status === "playing";
  const c = color || colors.gold;
  const handleToggle = (e) => {
    e.stopPropagation();
    const result = speechController.toggle(text, code);
    if (result === "unsupported") {
      alert("این مرورگر از خوندن صوتی متن پشتیبانی نمی‌کنه.");
    } else if (result === "error") {
      alert("پخش صدا با مشکل مواجه شد. اتصال اینترنت رو چک کن و دوباره امتحان کن.");
    }
  };
  const orderStyle = edge === "end" ? 999 : -1;
  return /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, order: orderStyle } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggle,
      "aria-label": isPlaying ? "توقف موقت" : "تلفظ",
      title: isPlaying ? "توقف موقت" : isActive ? "ادامه" : "تلفظ",
      style: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        color: c,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2
      }
    },
    isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 16 }) : /* @__PURE__ */ React.createElement(Volume2, { size: 16 })
  ));
}
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
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClick,
      "aria-label": "تکرار سراسری",
      title: repeatSetting === 0 ? "تکرار خاموش — بزن روشن کن (روی هر جمله/پاراگرافی که پخش کنی اعمال می‌شه)" : repeatSetting === "inf" ? "تکرار بی‌نهایت — بزن خاموش کن" : `تکرار ${repeatSetting} بار — روی هر 🔊ای که بزنی اعمال می‌شه`,
      style: {
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
        opacity: active ? 1 : 0.6
      }
    },
    /* @__PURE__ */ React.createElement(Repeat, { size: 15 }),
    label && /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
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
          textAlign: "center"
        }
      },
      label
    )
  );
}
function ttsTokenizeWords(text) {
  const arr = [];
  const re = /\S+/g;
  let m;
  while (m = re.exec(text || "")) arr.push({ start: m.index, end: m.index + m[0].length });
  return arr;
}
function wordIndexForCharOffsetLocal(words, offset) {
  for (let i = words.length - 1; i >= 0; i--) {
    if (offset >= words[i].start) return i;
  }
  return 0;
}
function AutoReadButton({ getItems, color, label, trackLangCode, modeKey }) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const idxRef = useRef(0);
  const piRef = useRef(0);
  const lastKeyRef = useRef(null);
  const lastItemsRef = useRef([]);
  const sessionStartRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const getItemsRef = useRef(getItems);
  useEffect(() => {
    getItemsRef.current = getItems;
  });
  useEffect(() => {
    if (!trackLangCode) return;
    if (active) {
      sessionStartRef.current = (/* @__PURE__ */ new Date()).toISOString();
    } else if (sessionStartRef.current) {
      const startedAt = sessionStartRef.current;
      sessionStartRef.current = null;
      const endedAt = (/* @__PURE__ */ new Date()).toISOString();
      const durationSeconds = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1e3;
      saveReadingSession({ langCode: trackLangCode, startedAt, endedAt, durationSeconds });
    }
  }, [active, trackLangCode]);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1e3)), 1e3);
    return () => clearInterval(id);
  }, [active]);
  function playAt(i, startWordIndex) {
    if (!activeRef.current) return;
    const items = getItemsRef.current && getItemsRef.current() || [];
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
    if (item.pi !== void 0) piRef.current = item.pi;
    if (item.el && item.el.scrollIntoView) {
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const locale = TTS_LOCALE[item.code] || "en-US";
    lastKeyRef.current = `${locale}::${item.text}`;
    speechController.toggle(item.text, item.code, startWordIndex);
  }
  useEffect(() => {
    return speechController.subscribe((state) => {
      if (!activeRef.current) return;
      if (state.status !== "idle" || !state.key) return;
      if (state.key === lastKeyRef.current) {
        playAt(idxRef.current + 1);
      } else if (lastKeyRef.current) {
        playAt(idxRef.current);
      }
    });
  }, []);
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        activeRef.current = false;
        speechController.stop();
      }
    };
  }, []);
  const prevModeKeyRef = useRef(modeKey);
  useEffect(() => {
    if (modeKey === prevModeKeyRef.current) return;
    prevModeKeyRef.current = modeKey;
    if (!activeRef.current) return;
    const pi = piRef.current;
    const oldItems = lastItemsRef.current || [];
    const newItems = getItemsRef.current && getItemsRef.current() || [];
    const oldPlayingItem = oldItems[idxRef.current];
    function fallback() {
      let newIdx2 = newItems.findIndex((it) => it.pi === pi);
      if (newIdx2 === -1) newIdx2 = 0;
      playAt(newIdx2);
    }
    if (!oldPlayingItem) {
      fallback();
      return;
    }
    const localOffset = speechController.getCharOffset();
    const oldOfParagraph = oldItems.filter((it) => it.pi === pi);
    let paragraphOffset = localOffset;
    if (oldOfParagraph.length > 1) {
      let acc = 0;
      for (const it of oldOfParagraph) {
        if (it === oldPlayingItem) {
          paragraphOffset = acc + localOffset;
          break;
        }
        acc += it.text.length + 1;
      }
    }
    const newOfParagraph = newItems.filter((it) => it.pi === pi);
    let targetItem = null;
    let targetOffset = 0;
    if (newOfParagraph.length > 1) {
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
      idxRef.current = newIdx;
      lastItemsRef.current = newItems;
      return;
    }
    const wordsInTarget = ttsTokenizeWords(targetItem.text);
    const startWordIndex = wordsInTarget.length ? wordIndexForCharOffsetLocal(wordsInTarget, Math.min(targetOffset, targetItem.text.length - 1)) : 0;
    playAt(newIdx, startWordIndex);
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
  return /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClick,
      className: "flex items-center gap-1",
      style: {
        color: active ? c : colors.inkSoft,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        flexShrink: 0
      },
      title: active ? "توقف خواندن خودکار" : "خواندن خودکار همه (با اسکرول خودکار)",
      "aria-label": active ? "توقف خواندن خودکار" : "خواندن خودکار همه"
    },
    active ? /* @__PURE__ */ React.createElement(Pause, { size: 16 }) : /* @__PURE__ */ React.createElement(PlayCircle, { size: 16 }),
    label && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" } }, label)
  ), active && trackLangCode && /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: c,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap"
      },
      title: "مدت زمان خواندن این جلسه"
    },
    "⏱ ",
    String(Math.floor(elapsed / 60)).padStart(2, "0"),
    ":",
    String(elapsed % 60).padStart(2, "0")
  ));
}
function SpeedControl({ color }) {
  const [rate, setRateState] = useState(() => speechController.getRate());
  useEffect(
    () => speechController.subscribe((s) => setRateState(s.rate)),
    []
  );
  const c = color || colors.gold;
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
    padding: 0
  };
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      title: `سرعت پخش: ${rate.toFixed(1)}×`,
      style: { display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }
    },
    /* @__PURE__ */ React.createElement(Gauge, { size: 15, color: colors.inkSoft }),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => step(-0.1),
        disabled: rate <= 0.5,
        style: { ...btnStyle, opacity: rate <= 0.5 ? 0.4 : 1 },
        "aria-label": "کم کردن سرعت پخش"
      },
      "−"
    ),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0.5,
        max: 2,
        step: 0.1,
        value: rate,
        onChange: (e) => speechController.setRate(e.target.value),
        style: { width: 44, accentColor: c },
        "aria-label": "سرعت پخش صدا"
      }
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => step(0.1),
        disabled: rate >= 2,
        style: { ...btnStyle, opacity: rate >= 2 ? 0.4 : 1 },
        "aria-label": "زیاد کردن سرعت پخش"
      },
      "+"
    ),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24 } }, rate.toFixed(1), "×")
  );
}
function ClickableSentence({ text, langCode, nativeLang, nativeLabel: nativeLabelProp, aiSettings, color, fontFamily, fontWeight, fontSize, alignSourceText, alignSourceLang }) {
  const [openKey, setOpenKey] = useState(null);
  const [info, setInfo] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [coords, setCoords] = useState(null);
  const [saved, setSaved] = useState(false);
  const [grammarSaved, setGrammarSaved] = useState(false);
  const [activeTerm, setActiveTerm] = useState("");
  const [savedTerms, setSavedTerms] = useState([]);
  const [crossTerms, setCrossTerms] = useState([]);
  const popupRef = useRef(null);
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
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      const others = loadSavedStoryWords().filter((e) => e.langCode !== langCode);
      const cached = others.filter((e) => e.translations && e.translations[langCode]).map((e) => e.translations[langCode]);
      if (!cancelled) setCrossTerms(cached);
      others.forEach((e) => {
        if (e.translations && e.translations[langCode]) return;
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${langCode}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        const aligned = alignSourceText && e.langCode === alignSourceLang ? translateWordInContext(alignSourceText, e.word, alignSourceLang, langCode) : Promise.resolve(null);
        aligned.then((result) => result || translateFree(e.word, langCode, e.langCode)).then((result) => {
          if (result && normalizeWord(result) !== normalizeWord(e.word)) {
            updateSavedWordTranslation(e.word, e.langCode, langCode, result);
          }
        }).catch(() => {
        }).finally(() => crossTranslateInFlight.delete(fetchKey));
      });
    };
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    };
  }, [langCode, alignSourceText, alignSourceLang]);
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
    let top = anchorRect.top - h - 8;
    if (top < margin) top = Math.min(anchorRect.bottom + 8, vh - h - margin);
    setCoords({ top, left, width: w });
  }, [openKey, anchorRect, info]);
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
  const tokens = text.split(/(\s+)/);
  const savedNorms = new Set(
    [...savedTerms.map((e) => e.word), ...crossTerms].map((w) => normalizeWord(w)).filter(Boolean)
  );
  const wordTokIdx = [];
  tokens.forEach((t, i) => {
    if (!(/^\s+$/.test(t) || t === "")) wordTokIdx.push(i);
  });
  const groupAt = {};
  const groupSkip = /* @__PURE__ */ new Set();
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
    setGrammarSaved(false);
    setOpenKey(key);
    setInfo("loading");
    try {
      const result = await lookupWordMeaning({ word: term, sentence: text, langCode, nativeLang });
      setInfo(result);
      if (result && result !== "error" && result.meaning) {
        updateSavedWordTranslation(term, langCode, nativeLang, result.meaning);
      }
    } catch (e) {
      setInfo("error");
    }
  }
  function saveActiveTermToGrammar() {
    if (!activeTerm) return;
    const meaningText = info && info !== "loading" && info !== "error" ? info.meaning : "";
    const basicMarkdown = `## 🧩 ${activeTerm}

` + (meaningText ? `**🔹 معنی:** ${meaningText}

` : "") + `**جمله:** ${text}`;
    const entry = saveGrammarNote({ langCode, word: activeTerm, sentence: text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({ word: activeTerm, sentence: text, langCode, nativeLang, nativeLabel, aiSettings }).then((md) => {
      if (md) updateGrammarNoteMarkdown(entry.id, md);
    }).catch(() => {
    });
  }
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
  return /* @__PURE__ */ React.createElement("span", { ref: containerRef, "data-lang-code": langCode, style: { position: "relative", display: "inline" } }, tokens.map((tok, idx) => {
    if (/^\s+$/.test(tok) || tok === "") return /* @__PURE__ */ React.createElement(React.Fragment, { key: idx }, tok);
    if (groupSkip.has(idx)) return null;
    const group = groupAt[idx];
    const displayText = group ? group.text : tok;
    const startTok = group ? group.start : idx;
    const endTok = group ? group.end : idx;
    const isOpen = openKey === `${startTok}-${endTok}`;
    const isUnderlined = !!group;
    return /* @__PURE__ */ React.createElement("span", { key: idx, style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          openLookup(displayText, startTok, endTok, e);
        },
        style: {
          fontFamily: fontFamily || fontLatin,
          color: color || colors.teal,
          fontWeight: fontWeight || void 0,
          fontSize: fontSize || 14,
          cursor: "pointer",
          textDecorationLine: isUnderlined ? "underline" : "none",
          textDecorationStyle: "dotted",
          textDecorationColor: colors.gold,
          textUnderlineOffset: 3
        }
      },
      displayText
    ), isOpen && /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: popupRef,
        onClick: (e) => e.stopPropagation(),
        onMouseDown: (e) => e.stopPropagation(),
        onTouchStart: (e) => e.stopPropagation(),
        style: {
          position: "fixed",
          top: coords ? coords.top : -9999,
          left: coords ? coords.left : -9999,
          visibility: coords ? "visible" : "hidden",
          width: coords ? coords.width : void 0,
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
          overflowWrap: "break-word"
        }
      },
      info === "loading" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Loader2, { size: 12, className: "spin" }), /* @__PURE__ */ React.createElement("span", null, isFa ? "در حال یافتن معنی..." : "Looking up meaning...")),
      info !== "loading" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { marginBottom: 4 } }, /* @__PURE__ */ React.createElement(SpeakButton, { text: activeTerm, code: langCode, color: colors.goldSoft }), /* @__PURE__ */ React.createElement("span", { dir: "auto", style: { fontWeight: 800, fontSize: 13 } }, activeTerm)), info && info !== "error" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 2, fontSize: 10, color: colors.inkSoft, opacity: 0.85 } }, isFa ? "ترجمه:" : "Translation:"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, info.meaning)) : /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.rose, fontSize: 11 } }, isFa ? "معنی پیدا نشد (احتمالاً آفلاینی)" : "Couldn't find a meaning (maybe offline)"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            retryLookup();
          },
          style: {
            display: "block",
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            color: colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 6,
            padding: "3px 8px"
          }
        },
        isFa ? "تلاش دوباره" : "Retry"
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            if (!activeTerm) return;
            const meaningNow = info && info !== "loading" && info !== "error" ? info.meaning : "";
            const nowSaved = toggleSavedStoryWord(activeTerm, langCode, { meaning: meaningNow, nativeLang });
            setSaved(nowSaved);
            if (nowSaved) {
              try {
                window.dispatchEvent(
                  new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: activeTerm, langCode } })
                );
              } catch {
              }
            }
          },
          style: {
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
            marginBottom: 6
          }
        },
        /* @__PURE__ */ React.createElement(Bookmark, { size: 11, fill: saved ? colors.gold : "none" }),
        saved ? isFa ? "ذخیره شد برای داستان بعدی" : "Saved for next story" : isFa ? "ذخیره برای داستان بعدی" : "Save for next story"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            saveActiveTermToGrammar();
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: grammarSaved ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${grammarSaved ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "3px 8px"
          }
        },
        /* @__PURE__ */ React.createElement(Type, { size: 11 }),
        grammarSaved ? isFa ? "ذخیره شد در گرامر" : "Saved to grammar" : isFa ? "افزودن به یادگیری گرامر" : "Add to grammar learning"
      ))
    ));
  }));
}
function LevelBadge({ level }) {
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        fontFamily: fontLatin,
        fontSize: 10,
        fontWeight: 700,
        color: colors.ink,
        backgroundColor: colors.goldSoft,
        borderRadius: 6,
        padding: "1px 6px",
        flexShrink: 0
      }
    },
    level
  );
}
function LevelFilterRow({ levelFilter, setLevelFilter }) {
  return /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setLevelFilter("all"),
      style: {
        fontFamily: fontFa,
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: 14,
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: levelFilter === "all" ? colors.ink : "white",
        color: levelFilter === "all" ? colors.paper : colors.inkSoft,
        flexShrink: 0
      }
    },
    "همه سطح‌ها"
  ), LEVELS.map((lvl) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: lvl,
      onClick: () => setLevelFilter(lvl),
      style: {
        fontFamily: fontLatin,
        fontSize: 12,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 14,
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: levelFilter === lvl ? colors.ink : "white",
        color: levelFilter === lvl ? colors.paper : colors.inkSoft,
        flexShrink: 0
      }
    },
    lvl
  )));
}
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
  return /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1" }, order.map((code) => {
    const lang = languages.find((l) => l.code === code);
    if (!lang) return null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: code,
        "data-order-code": code,
        onMouseDown: () => setDragCode(code),
        onTouchStart: (e) => {
          e.preventDefault();
          setDragCode(code);
        },
        style: {
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
          flexShrink: 0
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { color: dragCode === code ? colors.paper : colors.gold, fontSize: 11 } }, "⠿"),
      lang.label,
      onRemove && order.length > 1 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onRemove(code);
          },
          onMouseDown: (e) => e.stopPropagation(),
          onTouchStart: (e) => e.stopPropagation(),
          "aria-label": `حذف ${lang.label}`,
          title: `حذف ${lang.label}`,
          style: {
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
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement(X, { size: 10 })
      )
    );
  }));
}
function countOccurrences(story, word) {
  if (!story || !word) return 0;
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = story.match(new RegExp(escaped, "gi"));
  return matches ? matches.length : 0;
}
const STORY_LENGTHS = [
  { key: "short", label: "کوتاه", paragraphs: "1-2", paragraphMin: 1, paragraphMax: 2, sentencesHint: "short, roughly 4-6 sentences per paragraph", tokens: 1400 },
  { key: "medium", label: "متوسط", paragraphs: "2-3", paragraphMin: 2, paragraphMax: 3, sentencesHint: "medium length, roughly 5-8 sentences per paragraph", tokens: 2500 },
  { key: "long", label: "بلند", paragraphs: "4-6", paragraphMin: 4, paragraphMax: 6, sentencesHint: "long, roughly 6-10 sentences per paragraph", tokens: 4200 }
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
  { key: "metaphysical", label: "متافیزیکی", prompt: "a short metaphysical/speculative piece about existence, mind, or reality" }
];
function OfflineDictionaryCard({ code, label }) {
  const [status, setStatus] = useState("checking");
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
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: 12,
        backgroundColor: "white"
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "دیکشنری آفلاین ", label), status === "ready" && /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 4, color: colors.teal, fontSize: 11, fontWeight: 600 } }, /* @__PURE__ */ React.createElement(Check, { size: 13 }), " آماده (", count, " لغت)")),
    status === "idle" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDownload,
        style: {
          marginTop: 8,
          fontSize: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "none",
          backgroundColor: colors.gold,
          color: "white",
          cursor: "pointer"
        }
      },
      "دانلود برای استفاده‌ی آفلاین"
    ),
    status === "downloading" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: colors.inkSoft, marginBottom: 4 } }, "در حال دانلود… ", progress, "٪"), /* @__PURE__ */ React.createElement("div", { style: { height: 6, backgroundColor: colors.cardBorder, borderRadius: 4, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${progress}%`, backgroundColor: colors.gold, transition: "width .15s linear" } }))),
    status === "ready" && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginTop: 6 } }, "از این به بعد، جستجوی این لغات حتی بدون اینترنت هم کار می‌کنه — رایگان و آنی."),
    status === "error" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.rose } }, errMsg), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDownload,
        style: { marginTop: 4, fontSize: 12, color: colors.gold, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }
      },
      "دوباره امتحان کن"
    ))
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
      const schema = `{"word": "the term exactly as given, corrected for obvious typos", "detectedLang": "ISO 639-1 code of the language the term is written in", "pos": "part of speech in Persian (اسم/فعل/صفت/قید/حرف اضافه/عبارت)", "ipa": "IPA pronunciation if it's a single word, else empty string", "meaningFa": "clear definition/meaning of the word IN PERSIAN, 1-2 sentences", "translations": {${langLabelPairs.map((p) => `"${p.code}": "translation of the term into ${p.label}"`).join(", ")}, "fa": "Persian translation (if the term itself isn't Persian)"}, "examples": [{"text": "an example sentence using the term, in the term's own language", "fa": "Persian translation of that example sentence"}]}`;
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
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, fontSize: 16 } }, "دیکشنری"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowHistory((s) => !s),
      style: {
        fontSize: 12,
        padding: "5px 12px",
        borderRadius: 20,
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: showHistory ? colors.ink : "white",
        color: showHistory ? "white" : colors.ink
      }
    },
    "تاریخچه (",
    dictHistory.length,
    ")"
  )), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 13, color: colors.inkSoft } }, "هر کلمه یا اصطلاحی رو، به هر زبونی، تایپ کن — معنی، تلفظ، مثال و ترجمه‌ش به همه‌ی زبون‌های اپ رو زنده از AI می‌گیره."), /* @__PURE__ */ React.createElement(OfflineDictionaryCard, { code: "en", label: "انگلیسی" }), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex items-center gap-2 px-3",
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 44 }
    },
    /* @__PURE__ */ React.createElement(Search, { size: 16, color: colors.inkSoft }),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && lookup(),
        placeholder: "مثلاً: apprehensive یا سرسبز یا break a leg",
        style: { flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }
      }
    ),
    query && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setQuery("");
      setResult(null);
      setOfflineHits([]);
    }, "aria-label": "پاک کردن" }, /* @__PURE__ */ React.createElement(X, { size: 16, color: colors.inkSoft }))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => lookup(),
      disabled: !query.trim() || loading,
      className: "w-full py-2 rounded-lg font-medium",
      style: {
        fontFamily: fontFa,
        backgroundColor: !query.trim() || loading ? colors.cardBorder : colors.gold,
        color: "white",
        opacity: loading ? 0.7 : 1
      }
    },
    loading ? "در حال جستجو..." : "جستجو"
  ), offlineHits.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: 12, backgroundColor: "white" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between", style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: colors.teal, fontWeight: 600 } }, "از دیکشنری آفلاین (بدون اینترنت)")), offlineHits.map((h, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      className: "flex items-center justify-between",
      style: { padding: "8px 2px", borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : "none" }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 15 } }, h.fa),
    /* @__PURE__ */ React.createElement("span", { style: { color: colors.teal, fontSize: 14, direction: "ltr" } }, h.en)
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => lookup(query, { forceAI: true }),
      disabled: loading,
      style: { marginTop: 8, fontSize: 12, color: colors.gold, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }
    },
    "جستجوی کامل‌تر با هوش مصنوعی (مثال، تلفظ، ترجمه به همه‌ی زبون‌ها)"
  )), error && /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 } }, error), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => lookup(),
      disabled: loading,
      style: {
        fontFamily: fontFa,
        fontSize: 12,
        fontWeight: 700,
        color: "white",
        backgroundColor: colors.rose,
        borderRadius: 8,
        padding: "5px 14px",
        opacity: loading ? 0.6 : 1
      }
    },
    "تلاش دوباره"
  )), showHistory && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, dictHistory.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 13, color: colors.inkSoft, textAlign: "center", padding: 16 } }, "هنوز چیزی جستجو نکردی."), dictHistory.map((h) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: h.word,
      onClick: () => openFromHistory(h),
      className: "flex items-center justify-between p-3 rounded-lg cursor-pointer",
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, fontWeight: 600, fontSize: 14, color: colors.ink } }, h.word), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 12, color: colors.inkSoft } }, h.meaningFa)),
    /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      removeFromHistory(h.word);
    }, "aria-label": "حذف" }, /* @__PURE__ */ React.createElement(X, { size: 16, color: colors.inkSoft }))
  ))), !showHistory && result && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 p-4 rounded-lg", style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}` } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { direction: "ltr" } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, fontWeight: 800, fontSize: 20, color: mainTextColor } }, result.word), /* @__PURE__ */ React.createElement(SpeakButton, { text: result.word, code: result.detectedLang || "en", edge: "end" }), result.pos && /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        fontFamily: fontFa,
        fontSize: 11,
        color: colors.gold,
        border: `1px solid ${colors.goldSoft}`,
        borderRadius: 6,
        padding: "1px 6px"
      }
    },
    result.pos
  )), result.ipa && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, fontSize: 13, color: colors.inkSoft, direction: "ltr" } }, "/", result.ipa, "/"), result.meaningFa && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 14, fontWeight: 800, color: translationColor } }, result.meaningFa), result.translations && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1", style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 12, fontWeight: 700, color: colors.inkSoft } }, "ترجمه‌ها"), targetLangs.map((l) => result.translations[l.code] ? /* @__PURE__ */ React.createElement("div", { key: l.code, style: { display: "flex", alignItems: "center", gap: 8, direction: "ltr" } }, /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        fontFamily: fontFa,
        fontSize: 10,
        fontWeight: 700,
        color: colors.gold,
        border: `1px solid ${colors.goldSoft}`,
        borderRadius: 6,
        padding: "1px 5px",
        flexShrink: 0
      }
    },
    l.abbr
  ), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, color: translationColor, fontWeight: 800, fontSize: 14, flex: 1 } }, result.translations[l.code]), /* @__PURE__ */ React.createElement(SpeakButton, { text: result.translations[l.code], code: l.code, color: translationColor, edge: "end" })) : null)), Array.isArray(result.examples) && result.examples.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2", style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 12, fontWeight: 700, color: colors.inkSoft } }, "مثال"), result.examples.map((ex, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { backgroundColor: colors.paper, borderRadius: 8, padding: 8 } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, fontSize: 13, color: colors.ink, direction: "ltr" } }, ex.text), ex.fa && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 12, color: colors.inkSoft, marginTop: 2 } }, ex.fa))))));
}
function StoryBuilder({ nativeLang, nativeLabel, targetOrder, wordStats, setWordStats, savedStories, setSavedStories, aiSettings, jumpTo }) {
  const storyLangOptions = targetOrder && targetOrder.length ? targetOrder : LANGUAGES.filter((l) => l.code !== nativeLang).map((l) => l.code);
  const defaultStoryLang = (targetOrder || []).find((c) => storyLangOptions.includes(c)) || storyLangOptions[0] || "en";
  const [storyLang, setStoryLang] = useState(defaultStoryLang);
  useEffect(() => {
    if (!storyLangOptions.includes(storyLang)) {
      setStoryLang(defaultStoryLang);
    }
  }, [defaultStoryLang, storyLangOptions.join(",")]);
  const sentenceElsRef = useRef({});
  const paragraphElsRef = useRef({});
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
  const [paragraphs, setParagraphs] = useState([]);
  const [translationLangs, setTranslationLangs] = useState(
    Array.from(/* @__PURE__ */ new Set([nativeLang, ...targetOrder || []])).filter((c) => c !== defaultStoryLang)
  );
  const [granularity, setGranularity] = useState("sentence");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedWordsForLang, setSavedWordsForLang] = useState([]);
  useEffect(() => {
    const refresh = () => setSavedWordsForLang(loadSavedStoryWords().filter((e) => e.langCode === storyLang));
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, [storyLang]);
  useEffect(() => {
    function handlePicked(e) {
      const { word, langCode } = e && e.detail || {};
      if (!word || langCode !== storyLang) return;
      setSelectedWords((prev) => prev.includes(word) ? prev : [...prev, word]);
    }
    window.addEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
    return () => window.removeEventListener(STORY_WORD_PICKED_EVENT, handlePicked);
  }, [storyLang]);
  const storyLangLabel = LANGUAGES.find((l) => l.code === storyLang)?.label || storyLang;
  const allSentences = paragraphs.flatMap((p) => p.sentences);
  const fullStoryText = allSentences.map((s) => s.text).join(" ");
  useEffect(() => {
    setCollections(loadWordCollections().filter((c) => c.langCode === storyLang));
    setActiveCollectionId("");
  }, [storyLang]);
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
  }, [jumpTo?.token]);
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
  const handleAddWordToCollection = async () => {
    if (!activeCollection) return;
    const term = newWordTerm.trim();
    if (!term) return;
    setAddingWord(true);
    let meaning = newWordMeaning.trim();
    try {
      if (!meaning) {
        const res = await translateFree(term, nativeLang, storyLang, aiSettings);
        meaning = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
      }
    } catch (e) {
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
  const handleTranslateAllMissing = async () => {
    if (!activeCollection) return;
    const missing = activeCollection.words.filter((w) => !w.meaning);
    if (!missing.length) return;
    setTranslatingAll(true);
    try {
      const meanings = await Promise.all(
        missing.map(
          (w) => translateFree(w.term, nativeLang, storyLang, aiSettings).catch(() => "")
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
  const translationLangOptions = LANGUAGES.map((l) => l.code).filter((c) => c !== storyLang);
  const toggleTranslationLang = (code) => {
    setTranslationLangs(
      (prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };
  const selectAllTranslationLangs = () => setTranslationLangs(translationLangOptions);
  const clearAllTranslationLangs = () => setTranslationLangs([]);
  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => c !== storyLang));
  }, [storyLang]);
  const translationLangOptionsKey = translationLangOptions.join(",");
  useEffect(() => {
    setTranslationLangs((prev) => prev.filter((c) => translationLangOptions.includes(c)));
  }, [translationLangOptionsKey]);
  useEffect(() => {
    if (!paragraphs.length || !translationLangs.length) return;
    const missingLangs = translationLangs.filter(
      (code) => paragraphs.some((p) => (p.sentences || []).some((s) => !s.t || !s.t[code]))
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
              return Object.keys(additions).length ? { ...s, t: { ...s.t || {}, ...additions } } : s;
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
  const filteredVocab = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    return VOCAB.filter((v) => {
      const w = v.t[storyLang] || v.t.en || "";
      if (selectedWords.includes(w)) return false;
      return w.toLowerCase().includes(q) || v.meaningFa.includes(qRaw);
    });
  }, [vocabQuery, storyLang, selectedWords]);
  const otherTabMatches = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    const seen = /* @__PURE__ */ new Set();
    const results = [];
    for (const pool of [STORY_SEARCH_WORD_POOL, STORY_SEARCH_CONVERSATION_POOL]) {
      for (const item of pool) {
        if (results.length >= 30) break;
        const key = item.term.toLowerCase();
        if (seen.has(key)) continue;
        if (key.includes(q) || item.fa && item.fa.includes(qRaw)) {
          seen.add(key);
          results.push(item);
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [vocabQuery]);
  const matchingSavedWords = useMemo(() => {
    const qRaw = vocabQuery.trim();
    if (!qRaw) return [];
    const q = qRaw.toLowerCase();
    return savedWordsForLang.filter((e) => {
      if (selectedWords.includes(e.word)) return false;
      return e.word.toLowerCase().includes(q) || e.meaning && e.meaning.includes(qRaw);
    });
  }, [vocabQuery, savedWordsForLang, selectedWords]);
  const [translatingPick, setTranslatingPick] = useState(null);
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
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      if (normalizeWord(translated) !== normalizeWord(w)) {
        setTranslateNote(`«${w}» → «${translated}» اضافه شد`);
        setTimeout(() => setTranslateNote(""), 3e3);
      }
    } catch (e) {
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      setTranslateNote(`ترجمه‌ی خودکار ناموفق بود؛ «${w}» به‌همون شکل اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3e3);
    } finally {
      setWordTranslating(false);
    }
  };
  const suggestForgottenWords = () => {
    const ranked = Object.entries(wordStats).filter(([, s]) => s.lang === storyLang).sort((a, b) => b[1].missed - b[1].correct - (a[1].missed - a[1].correct)).slice(0, 5).map(([w]) => w);
    if (ranked.length) {
      setSelectedWords(ranked);
      ranked.forEach((w) => ensureSavedStoryWord(w, storyLang));
    }
  };
  const generateStory = async () => {
    if (!selectedWords.length || generating) return;
    selectedWords.forEach((w) => ensureSavedStoryWord(w, storyLang));
    setGenerating(true);
    setError("");
    setParagraphs([]);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    try {
      const genre = CONTENT_TYPES.find((c) => c.key === contentType) || CONTENT_TYPES[0];
      const lengthCfg = STORY_LENGTHS.find((l) => l.key === storyLength) || STORY_LENGTHS[1];
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

REPETITION — hard requirement: each target word below has a strict usage BUDGET of exactly ${repeatCount} total mentions (all grammatical forms/inflections of the word counted together as one). ${repeatCount} is simultaneously the ceiling AND the goal — never go over it, and never pad the story with extra unnecessary mentions "to be safe" or fall short of it either. Meet this budget WITHOUT sacrificing narrative coherence — never break the story's flow just to squeeze in a repetition; if a word's budget is hard to fill naturally, let the plot itself create a reason for that word to come up again. Before finalizing your answer, silently go back through the story and count how many times you actually used each target word, and rewrite any part where the count is off. Target words and their exact budget: ${selectedWords.map((w) => `"${w}" → exactly ${repeatCount} times`).join(", ")}.${correction ? " " + correction : ""}

Do NOT lengthen the story beyond the paragraph count above just to fit more repetitions of a word; if a word's budget doesn't fit naturally within that length, reuse it within an existing sentence instead of adding new sentences or paragraphs.

After the story, write 5 multiple-choice comprehension/vocabulary questions in ${storyLangLabel}, each testing ONE of the target words, with 4 options and exactly one correct answer. Respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape: {"paragraphs": [{"sentences": [{"text": "sentence in ${storyLang}"}]}], "questions": [{"word": "the target word this question tests, matching one from the list exactly", "question": "...", "options": ["...","...","...","..."], "answerIndex": 0}]}`;
      const tokenBudget = Math.min(lengthCfg.tokens + 500, 8e3);
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
        const offenders = attemptCounts.filter((c) => c.count > repeatCount || c.count < Math.max(1, repeatCount - 2));
        const paraDeviation = paraCount < lengthCfg.paragraphMin ? (lengthCfg.paragraphMin - paraCount) * 3 : paraCount > lengthCfg.paragraphMax ? (paraCount - lengthCfg.paragraphMax) * 3 : 0;
        const lengthOk = paraCount >= lengthCfg.paragraphMin && paraCount <= lengthCfg.paragraphMax;
        return { counts: attemptCounts, paraCount, lengthOk, deviation: repDeviation + paraDeviation, offenders };
      };
      let parsed = await runAttempt();
      let best = { parsed, ...scoreAttempt(parsed) };
      for (let attempt = 0; attempt < 2 && (best.offenders.length > 0 || !best.lengthOk); attempt++) {
        const repDetail = best.counts.map((c) => `"${c.word}": you used it ${c.count} times, but the budget is ${repeatCount}`).join("; ");
        const lengthDetail = best.lengthOk ? "" : ` Also, your previous attempt had ${best.paraCount} paragraphs, but it must have ${lengthCfg.paragraphMin === lengthCfg.paragraphMax ? lengthCfg.paragraphMin : `between ${lengthCfg.paragraphMin} and ${lengthCfg.paragraphMax}`} paragraphs — fix the paragraph count too.`;
        const correction = `Your previous attempt broke the repetition budget (${repDetail}).${lengthDetail} Rewrite the story from scratch and this time strictly cap every target word at exactly ${repeatCount} total mentions (count as you go and stop each word once it hits its budget) AND land the paragraph count exactly in the required range. Keep the story just as coherent and connected as before (or more so) while you do this — don't turn it into disconnected example sentences to make counting easier.`;
        try {
          const retryParsed = await runAttempt(correction);
          const retryScore = { parsed: retryParsed, ...scoreAttempt(retryParsed) };
          if (retryScore.deviation < best.deviation) {
            best = retryScore;
          }
        } catch {
        }
      }
      parsed = best.parsed;
      const storyParagraphs = parsed.paragraphs || [];
      setParagraphs(storyParagraphs);
      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);
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
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
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
          correct: cur.correct + (isRight ? 1 : 0)
        };
      });
      return next;
    });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, fontSize: 16 } }, "داستان‌ساز"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowSaved((s) => !s),
      style: {
        fontSize: 12,
        padding: "5px 12px",
        borderRadius: 20,
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: showSaved ? colors.ink : "white",
        color: showSaved ? "white" : colors.ink
      }
    },
    "داستان‌های ذخیره‌شده (",
    savedStories.length,
    ")"
  )), showSaved ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, savedStories.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: colors.inkSoft } }, "هنوز داستانی ذخیره نکردی."), savedStories.map((s) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: s.id,
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 14 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, fontSize: 13 } }, LANGUAGES.find((l) => l.code === s.storyLang)?.label, " · ", s.storyLevel, " ·", " ", CONTENT_TYPES.find((c) => c.key === s.contentType)?.label || "عمومی", " ·", " ", STORY_LENGTHS.find((l) => l.key === s.storyLength)?.label || "متوسط"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft } }, s.selectedWords.join("، "))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => openSavedStory(s),
        style: { fontSize: 12, color: colors.teal, textDecoration: "underline" }
      },
      "باز کردن"
    ), /* @__PURE__ */ React.createElement("button", { onClick: () => deleteSavedStory(s.id), "aria-label": "حذف" }, /* @__PURE__ */ React.createElement(X, { size: 16, color: colors.rose }))))
  ))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }
    },
    /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, marginBottom: 10 } }, "۱. زبان و سطح داستان"),
    storyLangOptions.length > 1 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 6 } }, "زبان داستان (از بین زبان‌های مقصدی که بالای صفحه انتخاب کردی)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" }, storyLangOptions.map((code) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: code,
        onClick: () => setStoryLang(code),
        style: {
          padding: "6px 14px",
          borderRadius: 20,
          fontSize: 13,
          border: `1px solid ${storyLang === code ? colors.gold : colors.cardBorder}`,
          backgroundColor: storyLang === code ? colors.goldSoft : "white",
          color: colors.ink
        }
      },
      LANGUAGES.find((l) => l.code === code)?.label
    )))) : /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 10 } }, "زبان داستان: ", storyLangLabel, " (طبق زبان مقصدی که بالای صفحه انتخاب کردی)"),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, margin: "0 0 6px" } }, "سطح داستان"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-1" }, LEVELS.map((lv) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: lv,
        onClick: () => setStoryLevel(lv),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${storyLevel === lv ? colors.teal : colors.cardBorder}`,
          backgroundColor: storyLevel === lv ? colors.teal : "white",
          color: storyLevel === lv ? "white" : colors.ink
        }
      },
      lv
    ))),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px" } }, "نوع محتوا"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-1" }, CONTENT_TYPES.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.key,
        onClick: () => setContentType(c.key),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${contentType === c.key ? colors.rose : colors.cardBorder}`,
          backgroundColor: contentType === c.key ? colors.rose : "white",
          color: contentType === c.key ? "white" : colors.ink
        }
      },
      c.label
    ))),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px" } }, "طول داستان"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-1" }, STORY_LENGTHS.map((l) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: l.key,
        onClick: () => setStoryLength(l.key),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${storyLength === l.key ? colors.gold : colors.cardBorder}`,
          backgroundColor: storyLength === l.key ? colors.gold : "white",
          color: storyLength === l.key ? "white" : colors.ink
        }
      },
      l.label
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mt-3" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: colors.inkSoft } }, "تعداد تکرار هر لغت"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 1,
        max: 15,
        value: repeatCount,
        onChange: (e) => setRepeatCount(Number(e.target.value)),
        style: { flex: 1 }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700 } }, repeatCount))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700 } }, "۲. انتخاب لغت‌ها"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: suggestForgottenWords,
        style: { fontSize: 12, color: colors.teal, textDecoration: "underline" }
      },
      "پیشنهاد بر اساس فراموشی"
    )),
    /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        value: customWord,
        onChange: (e) => setCustomWord(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && !wordTranslating && addCustomWord(),
        placeholder: `یه لغت بنویس (به هر زبونی) — به ${storyLangLabel} ترجمه و اضافه می‌شه...`,
        dir: "auto",
        disabled: wordTranslating,
        style: {
          flex: 1,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 13,
          outline: "none",
          textAlign: "start",
          opacity: wordTranslating ? 0.6 : 1
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: addCustomWord,
        disabled: wordTranslating,
        style: { backgroundColor: colors.ink, color: "white", borderRadius: 10, padding: "0 12px", opacity: wordTranslating ? 0.6 : 1 }
      },
      wordTranslating ? /* @__PURE__ */ React.createElement(Loader2, { size: 16, className: "spin" }) : /* @__PURE__ */ React.createElement(Plus, { size: 16 })
    )),
    translateNote && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginBottom: 8 } }, translateNote),
    /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10, border: `1px dashed ${colors.cardBorder}`, borderRadius: 12, padding: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft } }, "منبع لغت (مثل کتاب ۵۰۴ واژه) — ", storyLangLabel), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAddCollection((v) => !v),
        style: { fontSize: 12, color: colors.teal, textDecoration: "underline" }
      },
      showAddCollection ? "بستن" : "+ منبع جدید"
    )), showAddCollection && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        value: newCollectionTitle,
        onChange: (e) => setNewCollectionTitle(e.target.value),
        placeholder: `اسم منبع، مثلاً «۵۰۴ واژه ضروری» (زبان: ${storyLangLabel})`,
        dir: "auto",
        style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none" }
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: newCollectionText,
        onChange: (e) => setNewCollectionText(e.target.value),
        placeholder: `لغت‌ها رو یکی یکی توی هر خط بچسبون. مثال:
abandon - to leave completely
benevolent - kind and generous
candid`,
        dir: "auto",
        rows: 5,
        style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "monospace" }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSaveCollection,
        disabled: !newCollectionTitle.trim() || !newCollectionText.trim(),
        style: {
          alignSelf: "flex-start",
          backgroundColor: colors.teal,
          color: "white",
          borderRadius: 10,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 700,
          opacity: !newCollectionTitle.trim() || !newCollectionText.trim() ? 0.5 : 1
        }
      },
      "ذخیره‌ی منبع"
    )), collections.length > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, collections.map((c) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: c.id,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${activeCollectionId === c.id ? colors.teal : colors.cardBorder}`,
          backgroundColor: activeCollectionId === c.id ? colors.teal : "white",
          color: activeCollectionId === c.id ? "white" : colors.ink
        }
      },
      /* @__PURE__ */ React.createElement("button", { dir: "auto", onClick: () => setActiveCollectionId(c.id) }, c.title, " (", c.words.length, ")"),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            deleteWordCollection(c.id);
            refreshCollections();
            if (activeCollectionId === c.id) setActiveCollectionId("");
          },
          title: "حذف منبع"
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))), activeCollection && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { maxHeight: 220, overflowY: "auto" } }, activeCollection.words.map((w) => {
      const active = selectedWords.includes(w.term);
      const isEditing = editingTerm === w.term;
      if (isEditing) {
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: w.term,
            dir: "auto",
            className: "flex items-center gap-1",
            style: {
              padding: "4px 8px",
              borderRadius: 20,
              fontSize: 12,
              border: `1px solid ${colors.teal}`,
              backgroundColor: "white"
            }
          },
          /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, w.term),
          /* @__PURE__ */ React.createElement(
            "input",
            {
              value: editDraftMeaning,
              onChange: (e) => setEditDraftMeaning(e.target.value),
              placeholder: "معنی فارسی",
              autoFocus: true,
              style: { width: 110, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, padding: "3px 6px", fontSize: 12, outline: "none" }
            }
          ),
          /* @__PURE__ */ React.createElement("button", { onClick: () => saveEditWord(w.term), title: "ذخیره", style: { color: colors.teal, display: "flex" } }, /* @__PURE__ */ React.createElement(Check, { size: 14 })),
          /* @__PURE__ */ React.createElement("button", { onClick: () => setEditingTerm(null), title: "انصراف", style: { color: colors.inkSoft, display: "flex" } }, /* @__PURE__ */ React.createElement(X, { size: 12 }))
        );
      }
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: w.term,
          dir: "auto",
          className: "flex items-center gap-1",
          style: {
            padding: "5px 6px 5px 12px",
            borderRadius: 20,
            fontSize: 12,
            border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
            backgroundColor: active ? colors.goldSoft : colors.paper
          }
        },
        /* @__PURE__ */ React.createElement("button", { onClick: () => toggleWord(w.term), title: w.meaning || "" }, w.term, w.meaning ? ` — ${w.meaning}` : ""),
        /* @__PURE__ */ React.createElement("button", { onClick: () => startEditWord(w), title: "ویرایش معنی", style: { color: colors.inkSoft, display: "flex" } }, /* @__PURE__ */ React.createElement(Pencil, { size: 11 })),
        /* @__PURE__ */ React.createElement("button", { onClick: () => removeWord(w.term), title: "حذف لغت", style: { color: colors.inkSoft, display: "flex" } }, /* @__PURE__ */ React.createElement(X, { size: 12 }))
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2", style: { flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        value: newWordTerm,
        onChange: (e) => setNewWordTerm(e.target.value),
        placeholder: `لغت جدید (${storyLangLabel})`,
        dir: "auto",
        style: { flex: "1 1 120px", border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px", fontSize: 12, outline: "none" }
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        value: newWordMeaning,
        onChange: (e) => setNewWordMeaning(e.target.value),
        placeholder: "معنی فارسی (خالی = ترجمه خودکار)",
        dir: "auto",
        style: { flex: "1 1 160px", border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px", fontSize: 12, outline: "none" }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleAddWordToCollection,
        disabled: !newWordTerm.trim() || addingWord,
        className: "flex items-center gap-1",
        style: {
          backgroundColor: colors.teal,
          color: "white",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 700,
          opacity: !newWordTerm.trim() || addingWord ? 0.5 : 1
        }
      },
      addingWord ? /* @__PURE__ */ React.createElement(Loader2, { size: 13, className: "spin" }) : /* @__PURE__ */ React.createElement(Plus, { size: 13 }),
      "افزودن"
    )), activeCollection.words.some((w) => !w.meaning) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleTranslateAllMissing,
        disabled: translatingAll,
        className: "flex items-center gap-1 mt-2",
        style: { fontSize: 12, color: colors.teal }
      },
      translatingAll ? /* @__PURE__ */ React.createElement(Loader2, { size: 13, className: "spin" }) : /* @__PURE__ */ React.createElement(Wand2, { size: 13 }),
      "ترجمه‌ی خودکار معنی‌های خالی"
    ))) : !showAddCollection && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft } }, "هنوز منبعی برای ", storyLangLabel, " اضافه نکردی. لغات کتابی مثل ۵۰۴ واژه رو بچسبون تا بشه ازش برای داستان انتخاب کرد.")),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        value: vocabQuery,
        onChange: (e) => setVocabQuery(e.target.value),
        placeholder: "یا از لغات، مکالمات روزمره، لغات و اخبار، لغات ذخیره‌شده جستجو کن...",
        style: {
          width: "100%",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 13,
          outline: "none",
          marginBottom: 10
        }
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-3", style: { maxHeight: 140, overflowY: "auto" } }, filteredVocab.map((v) => {
      const w = v.t[storyLang] || v.t.en;
      const active = selectedWords.includes(w);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: v.id,
          onClick: () => toggleWord(w),
          style: {
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12,
            border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
            backgroundColor: active ? colors.goldSoft : colors.paper
          }
        },
        w
      );
    }), matchingSavedWords.map((e) => {
      const active = selectedWords.includes(e.word);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: `saved-${e.word}`,
          onClick: () => toggleWord(e.word),
          title: "از لغات ذخیره‌شده",
          className: "flex items-center gap-1",
          style: {
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12,
            border: `1px solid ${active ? colors.gold : colors.teal}`,
            backgroundColor: active ? colors.goldSoft : "white"
          }
        },
        /* @__PURE__ */ React.createElement(Bookmark, { size: 11, color: colors.teal }),
        e.word
      );
    }), otherTabMatches.filter((item) => {
      const mapped = storyLang === "en" ? item.term : pickedTermTranslations[item.term];
      return !mapped || !selectedWords.includes(mapped);
    }).map((item) => {
      const busy = translatingPick === item.term;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: `other-${item.source}-${item.term}`,
          onClick: () => pickForeignWord(item.term),
          disabled: busy,
          title: item.source,
          className: "flex items-center gap-1",
          style: {
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: colors.paper,
            opacity: busy ? 0.6 : 1
          }
        },
        busy && /* @__PURE__ */ React.createElement(Loader2, { size: 11, className: "spin" }),
        item.term,
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: colors.inkSoft } }, "(", item.source, ")")
      );
    })),
    selectedWords.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2", style: { borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 } }, selectedWords.map((w) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: w,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: 20,
          fontSize: 12,
          backgroundColor: colors.ink,
          color: "white"
        }
      },
      w,
      /* @__PURE__ */ React.createElement("button", { onClick: () => toggleWord(w), "aria-label": "حذف" }, /* @__PURE__ */ React.createElement(X, { size: 12 }))
    )))
  ), translationLangOptions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3", style: { border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, backgroundColor: colors.paper } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft } }, "داستان همزمان به چه زبان‌هایی ترجمه بشه؟ (می‌تونی چند تا انتخاب کنی)"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: selectAllTranslationLangs, style: { fontSize: 11, color: colors.teal, textDecoration: "underline" } }, "انتخاب همه"), /* @__PURE__ */ React.createElement("button", { onClick: clearAllTranslationLangs, style: { fontSize: 11, color: colors.rose, textDecoration: "underline" } }, "پاک کردن همه"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, translationLangOptions.map((code) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: code,
      onClick: () => toggleTranslationLang(code),
      style: {
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        border: `1px solid ${translationLangs.includes(code) ? colors.gold : colors.cardBorder}`,
        backgroundColor: translationLangs.includes(code) ? colors.goldSoft : "white"
      }
    },
    LANGUAGES.find((l) => l.code === code)?.label
  )))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: generateStory,
      disabled: !selectedWords.length || generating,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.gold,
        color: "white",
        borderRadius: 14,
        padding: "12px 16px",
        fontWeight: 700,
        opacity: !selectedWords.length || generating ? 0.6 : 1
      }
    },
    /* @__PURE__ */ React.createElement(Sparkles, { size: 18 }),
    generating ? "در حال ساخت داستان..." : "بساز داستان"
  ), error && /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 } }, error), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: generateStory,
      disabled: generating,
      style: {
        fontFamily: fontFa,
        fontSize: 12,
        fontWeight: 700,
        color: "white",
        backgroundColor: colors.rose,
        borderRadius: 8,
        padding: "5px 14px",
        opacity: generating ? 0.6 : 1
      }
    },
    "تلاش دوباره"
  )), paragraphs.length > 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700 } }, "داستان"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 flex-wrap", style: { rowGap: 8 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: saveCurrentStory,
        title: justSaved ? "ذخیره شد" : "ذخیره داستان",
        "aria-label": justSaved ? "ذخیره شد" : "ذخیره داستان",
        style: {
          display: "flex",
          alignItems: "center",
          color: justSaved ? colors.teal : colors.gold,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          flexShrink: 0
        }
      },
      justSaved ? /* @__PURE__ */ React.createElement(Check, { size: 16 }) : /* @__PURE__ */ React.createElement(Bookmark, { size: 16 })
    ), /* @__PURE__ */ React.createElement(SpeakButton, { text: fullStoryText, code: storyLang, color: colors.teal }), /* @__PURE__ */ React.createElement(
      AutoReadButton,
      {
        color: colors.teal,
        trackLangCode: storyLang,
        modeKey: granularity,
        getItems: () => {
          if (granularity === "sentence") {
            return paragraphs.flatMap(
              (p, pi) => p.sentences.map((s, si) => ({
                text: s.text,
                code: storyLang,
                el: sentenceElsRef.current[`${pi}-${si}`],
                pi
              }))
            );
          }
          return paragraphs.map((p, pi) => ({
            text: p.sentences.map((s) => s.text).join(" "),
            code: storyLang,
            el: paragraphElsRef.current[pi],
            pi
          }));
        }
      }
    ), /* @__PURE__ */ React.createElement(RepeatButton, { color: colors.teal }), /* @__PURE__ */ React.createElement(SpeedControl, { color: colors.teal }))),
    translationLangOptions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 6 } }, "نمایش ترجمه:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, [
      { key: "sentence", label: "جمله به جمله" },
      { key: "paragraph", label: "پاراگراف به پاراگراف" },
      { key: "none", label: "هیچکدام" }
    ].map((opt) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: opt.key,
        onClick: () => setGranularity(opt.key),
        style: {
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 12,
          border: `1px solid ${granularity === opt.key ? colors.teal : colors.cardBorder}`,
          backgroundColor: granularity === opt.key ? colors.teal : "white",
          color: granularity === opt.key ? "white" : colors.ink
        }
      },
      opt.label
    )))),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-5" }, paragraphs.map((p, pi) => {
      const paragraphText = p.sentences.map((s) => s.text).join(" ");
      const showTranslations = granularity !== "none" && translationLangs.length > 0;
      return /* @__PURE__ */ React.createElement("div", { key: pi, style: { borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 } }, granularity === "sentence" ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, p.sentences.map((s, si) => /* @__PURE__ */ React.createElement("div", { key: si, ref: (el) => sentenceElsRef.current[`${pi}-${si}`] = el }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2", dir: dirFor(storyLang) }, /* @__PURE__ */ React.createElement(SpeakButton, { text: s.text, code: storyLang, color: colors.inkSoft, edge: dirFor(storyLang) === "ltr" ? "end" : void 0 }), /* @__PURE__ */ React.createElement(
        "p",
        {
          style: {
            fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
            fontSize: 15,
            lineHeight: 1.8,
            textAlign: "justify",
            fontWeight: 900,
            // برخی فونت‌های سریف بارگذاری‌شده (مثل Lora) وزن ۸۰۰/۹۰۰ واقعی
            // ندارن و مرورگر بی‌سروصدا همون رگولار رو نشون می‌ده؛ این
            // text-stroke تضمین می‌کنه متن اصلیِ داستان همیشه پررنگ دیده
            // بشه، صرف‌نظر از اینکه فونت خودش وزن سنگین داره یا نه.
            WebkitTextStroke: `0.4px ${mainTextColor}`
          }
        },
        /* @__PURE__ */ React.createElement(
          ClickableSentence,
          {
            text: s.text,
            langCode: storyLang,
            nativeLang,
            nativeLabel,
            aiSettings,
            color: mainTextColor,
            fontWeight: 900
          }
        )
      )), showTranslations && translationLangs.map((code) => {
        const translated = s.t?.[code];
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: code,
            className: "flex items-start gap-2",
            dir: dirFor(code),
            style: {
              marginTop: 3,
              marginInlineStart: 26
            }
          },
          translated && /* @__PURE__ */ React.createElement(SpeakButton, { text: translated, code, color: translationColor, edge: dirFor(code) === "ltr" ? "end" : void 0 }),
          /* @__PURE__ */ React.createElement(
            "p",
            {
              style: {
                fontSize: 13,
                color: translationColor,
                fontWeight: 800,
                textAlign: "justify",
                fontFamily: code === "fa" ? fontFa : fontLatin
              }
            },
            /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: colors.gold } }, "[", code, "]"),
            " ",
            translated ? /* @__PURE__ */ React.createElement(
              ClickableSentence,
              {
                text: translated,
                langCode: code,
                nativeLang,
                nativeLabel,
                aiSettings,
                color: translationColor,
                fontFamily: code === "fa" ? fontFa : fontLatin,
                alignSourceText: s.text,
                alignSourceLang: storyLang
              }
            ) : /* @__PURE__ */ React.createElement("span", { style: { color: colors.inkSoft, opacity: 0.7 } }, "(در حال ترجمه...)")
          )
        );
      })))) : /* @__PURE__ */ React.createElement("div", { ref: (el) => paragraphElsRef.current[pi] = el }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2", dir: dirFor(storyLang) }, /* @__PURE__ */ React.createElement(SpeakButton, { text: paragraphText, code: storyLang, color: colors.inkSoft, edge: dirFor(storyLang) === "ltr" ? "end" : void 0 }), /* @__PURE__ */ React.createElement(
        "p",
        {
          style: {
            fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
            fontSize: 15,
            lineHeight: 1.8,
            textAlign: "justify",
            fontWeight: 900,
            WebkitTextStroke: `0.4px ${mainTextColor}`
          }
        },
        /* @__PURE__ */ React.createElement(
          ClickableSentence,
          {
            text: paragraphText,
            langCode: storyLang,
            nativeLang,
            nativeLabel,
            aiSettings,
            color: mainTextColor,
            fontWeight: 900
          }
        )
      )), showTranslations && translationLangs.map((code) => {
        const translated = p.sentences.every((s) => s.t?.[code]) ? p.sentences.map((s) => s.t[code]).join(" ") : null;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: code,
            className: "flex items-start gap-2",
            dir: dirFor(code),
            style: { marginTop: 4, marginInlineStart: 26 }
          },
          translated && /* @__PURE__ */ React.createElement(SpeakButton, { text: translated, code, color: translationColor, edge: dirFor(code) === "ltr" ? "end" : void 0 }),
          /* @__PURE__ */ React.createElement(
            "p",
            {
              style: {
                fontSize: 13,
                color: translationColor,
                fontWeight: 800,
                textAlign: "justify",
                fontFamily: code === "fa" ? fontFa : fontLatin
              }
            },
            /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: colors.gold } }, "[", code, "]"),
            " ",
            translated ? /* @__PURE__ */ React.createElement(
              ClickableSentence,
              {
                text: translated,
                langCode: code,
                nativeLang,
                nativeLabel,
                aiSettings,
                color: translationColor,
                fontFamily: code === "fa" ? fontFa : fontLatin,
                alignSourceText: paragraphText,
                alignSourceLang: storyLang
              }
            ) : /* @__PURE__ */ React.createElement("span", { style: { color: colors.inkSoft, opacity: 0.7 } }, "(در حال ترجمه...)")
          )
        );
      })));
    })),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-4", style: { borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 } }, selectedWords.map((w) => /* @__PURE__ */ React.createElement("span", { key: w, style: { fontSize: 11, color: colors.inkSoft, backgroundColor: colors.paper, borderRadius: 10, padding: "3px 8px" } }, w, ": ", countOccurrences(fullStoryText, w), " بار")))
  ), questions.length > 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }
    },
    /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, marginBottom: 12 } }, "تمرین درک مطلب"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, questions.map((q, i) => /* @__PURE__ */ React.createElement("div", { key: i }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, marginBottom: 8 } }, i + 1, ". ", q.question, " ", /* @__PURE__ */ React.createElement("span", { style: { color: colors.teal, fontSize: 12 } }, "(", q.word, ")")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, q.options.map((opt, oi) => {
      const isChosen = answers[i] === oi;
      const isCorrect = q.answerIndex === oi;
      let bg = "white";
      if (submitted && isCorrect) bg = "#DDEEE4";
      else if (submitted && isChosen && !isCorrect) bg = "#F3DADA";
      else if (isChosen) bg = colors.paper;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: oi,
          disabled: submitted,
          onClick: () => setAnswers((prev) => ({ ...prev, [i]: oi })),
          style: {
            textAlign: "right",
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: bg,
            fontSize: 13
          }
        },
        opt
      );
    }))))),
    !submitted ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: submitQuiz,
        disabled: Object.keys(answers).length < questions.length,
        style: {
          marginTop: 16,
          backgroundColor: colors.teal,
          color: "white",
          borderRadius: 12,
          padding: "10px 16px",
          fontWeight: 700,
          opacity: Object.keys(answers).length < questions.length ? 0.6 : 1
        }
      },
      "بررسی جواب‌ها"
    ) : /* @__PURE__ */ React.createElement("p", { style: { marginTop: 16, fontSize: 14, fontWeight: 700 } }, questions.filter((q, i) => answers[i] === q.answerIndex).length, " از ", questions.length, " درست بود. لغاتی که اشتباه زدی خودکار برای داستان بعدی «پیشنهاد بر اساس فراموشی» می‌شن.")
  )));
}
function SavedWordsPanel({ onJumpToStory, onJumpToOrigin, nativeLang, nativeLabel, targetOrder, dictHistory, setDictHistory, onGoToDictionary }) {
  const [words, setWords] = useState([]);
  const [picked, setPicked] = useState({});
  const [query, setQuery] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const pressStateRef = useRef({ key: null, timer: null, moved: false, startX: 0, startY: 0 });
  const clearPress = () => {
    if (pressStateRef.current.timer) clearTimeout(pressStateRef.current.timer);
    pressStateRef.current = { key: null, timer: null, moved: false, startX: 0, startY: 0 };
  };
  const jumpToOrigin = (entry) => {
    if (!onJumpToOrigin) return;
    const ok = onJumpToOrigin(entry);
    setActionMsg(
      ok ? `رفتیم به همون بخشی که «${entry.word}» ازش ذخیره شده بود` : "منبعِ این لغت مشخص نیست (احتمالاً قبل از این قابلیت ذخیره شده)"
    );
  };
  const beginPress = (key, clientX, clientY, entry, target) => {
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
      }, 550)
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
  const relevantLangs = Array.from(/* @__PURE__ */ new Set([nativeLang, ...targetOrder || []])).filter(Boolean);
  useEffect(() => {
    if (!relevantLangs.length) return;
    words.forEach((e) => {
      relevantLangs.forEach((toLang) => {
        if (toLang === e.langCode) return;
        if (e.translations && e.translations[toLang]) return;
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${toLang}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        translateFree(e.word, toLang, e.langCode).then((result) => {
          if (result && normalizeWord(result) !== normalizeWord(e.word)) {
            updateSavedWordTranslation(e.word, e.langCode, toLang, result);
          }
        }).catch(() => {
        }).finally(() => crossTranslateInFlight.delete(fetchKey));
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
  const filteredWords = words.filter(matchesQuery);
  const byLang = {};
  filteredWords.forEach((w) => {
    if (!byLang[w.langCode]) byLang[w.langCode] = [];
    byLang[w.langCode].push(w);
  });
  const langCodes = Object.keys(byLang);
  const totalPicked = Object.values(picked).reduce((sum, set) => sum + (set ? set.size : 0), 0);
  const allVisibleSelected = filteredWords.length > 0 && filteredWords.every((e) => (picked[e.langCode] || /* @__PURE__ */ new Set()).has(e.word));
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
      (set || /* @__PURE__ */ new Set()).forEach((word) => removeSavedStoryWord(word, code));
    });
    setPicked({});
    setActionMsg(`${totalPicked} لغت حذف شد`);
  };
  const clearAll = () => {
    if (!filteredWords.length) return;
    const msg = normalizedQuery ? `${filteredWords.length} لغتِ در حال نمایش برای همیشه پاک بشن؟` : `همه‌ی ${filteredWords.length} لغت ذخیره‌شده برای همیشه پاک بشن؟`;
    if (!window.confirm(msg)) return;
    filteredWords.forEach((e) => removeSavedStoryWord(e.word, e.langCode));
    setPicked({});
    setActionMsg(`${filteredWords.length} لغت پاک شد`);
  };
  const copySelectedToDictionary = () => {
    if (!totalPicked || !setDictHistory) return;
    const toCopy = [];
    Object.entries(picked).forEach(([code, set]) => {
      (set || /* @__PURE__ */ new Set()).forEach((word) => {
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
        meaningFa: e.langCode !== nativeLang ? e.translations && e.translations[nativeLang] || "" : "",
        translations: { ...e.translations || {} },
        examples: [],
        lookedUpAt: Date.now()
      });
    });
    if (additions.length) {
      setDictHistory((prev) => [...additions, ...prev].slice(0, 50));
    }
    const skipped = toCopy.length - additions.length;
    setActionMsg(
      additions.length && skipped ? `${additions.length} لغت به دیکشنری اضافه شد (${skipped} تا قبلاً بود)` : additions.length ? `${additions.length} لغت به دیکشنری اضافه شد` : "همه‌ی لغات انتخاب‌شده قبلاً توی دیکشنری بودن"
    );
  };
  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(""), 4e3);
    return () => clearTimeout(t);
  }, [actionMsg]);
  const toolbarButtonStyle = {
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 20,
    border: `1px solid ${colors.cardBorder}`,
    backgroundColor: "white",
    whiteSpace: "nowrap"
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 } }, "لغات ذخیره‌شده"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 } }, "لغاتی که با دکمه‌ی «ذخیره برای داستان بعدی» نشون کردی، یا موقع ساختن هر داستانی انتخاب کردی، همه‌شون اینجا جمع می‌شن. هرکدوم رو خواستی بزن تا انتخاب بشه، بعد «افزودن به داستان‌ساز» رو بزن.")), words.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex items-center gap-2 px-3",
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }
    },
    /* @__PURE__ */ React.createElement(Search, { size: 15, color: colors.inkSoft }),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        placeholder: "جستجو در لغات ذخیره‌شده...",
        dir: "auto",
        style: { flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }
      }
    ),
    query && /* @__PURE__ */ React.createElement("button", { onClick: () => setQuery(""), "aria-label": "پاک کردن جستجو", style: { display: "flex" } }, /* @__PURE__ */ React.createElement(X, { size: 15, color: colors.inkSoft }))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: toggleSelectAll,
      disabled: filteredWords.length === 0,
      className: "flex items-center gap-1",
      style: { ...toolbarButtonStyle, color: colors.ink, opacity: filteredWords.length ? 1 : 0.5 }
    },
    /* @__PURE__ */ React.createElement(CheckSquare, { size: 13 }),
    allVisibleSelected ? "لغو انتخاب همه" : "انتخاب همه"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: clearAll,
      disabled: filteredWords.length === 0,
      className: "flex items-center gap-1",
      style: { ...toolbarButtonStyle, color: colors.rose, opacity: filteredWords.length ? 1 : 0.5 }
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 13 }),
    "پاک کردن همه"
  ), totalPicked > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: deleteSelected, className: "flex items-center gap-1", style: { ...toolbarButtonStyle, color: colors.rose } }, /* @__PURE__ */ React.createElement(X, { size: 13 }), "حذف ", totalPicked, " انتخاب‌شده"), /* @__PURE__ */ React.createElement("button", { onClick: copySelectedToDictionary, className: "flex items-center gap-1", style: { ...toolbarButtonStyle, color: colors.teal } }, /* @__PURE__ */ React.createElement(Copy, { size: 13 }), "کپی در دیکشنری"))), actionMsg && /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2", style: { fontSize: 12, color: colors.teal } }, actionMsg, onGoToDictionary && actionMsg.includes("دیکشنری") && /* @__PURE__ */ React.createElement("button", { onClick: onGoToDictionary, style: { textDecoration: "underline", color: colors.teal } }, "مشاهده در دیکشنری"))), langCodes.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: colors.inkSoft } }, words.length === 0 ? "هنوز لغتی ذخیره نکردی. روی هر کلمه‌ی داخل متن‌ها بزن و از پاپ‌آپش «ذخیره برای داستان بعدی» رو انتخاب کن، یا موقع ساخت داستان لغت انتخاب کن." : "با این جستجو لغتی پیدا نشد.") : langCodes.map((code) => {
    const label = LANGUAGES.find((l) => l.code === code)?.label || code;
    const pickedSet = picked[code] || /* @__PURE__ */ new Set();
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: code,
        style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700 } }, label, " (", byLang[code].length, ")"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onJumpToStory(code, Array.from(pickedSet)),
          disabled: pickedSet.size === 0,
          className: "flex items-center gap-1",
          style: {
            fontSize: 12,
            color: pickedSet.size ? colors.teal : colors.inkSoft,
            textDecoration: "underline",
            opacity: pickedSet.size ? 1 : 0.5
          }
        },
        /* @__PURE__ */ React.createElement(Sparkles, { size: 13 }),
        pickedSet.size ? `افزودن ${pickedSet.size} لغت به داستان‌ساز` : "افزودن به داستان‌ساز"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, byLang[code].map((e) => {
        const isPicked = pickedSet.has(e.word);
        const otherLangs = relevantLangs.filter((l) => l !== code);
        const level = lookupSavedWordLevel(e.word, code);
        const pressKey = `${code}:${e.word}`;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: e.word,
            title: "نگه‌دار تا به منبعِ این لغت بری",
            onMouseDown: (ev) => beginPress(pressKey, ev.clientX, ev.clientY, e, ev.target),
            onMouseMove: (ev) => movePress(ev.clientX, ev.clientY),
            onMouseUp: clearPress,
            onMouseLeave: clearPress,
            onTouchStart: (ev) => {
              const t = ev.touches[0];
              beginPress(pressKey, t.clientX, t.clientY, e, ev.target);
            },
            onTouchMove: (ev) => {
              const t = ev.touches[0];
              movePress(t.clientX, t.clientY);
            },
            onTouchEnd: clearPress,
            onTouchCancel: clearPress,
            onContextMenu: (ev) => ev.preventDefault(),
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 110,
              maxWidth: 210,
              borderRadius: 14,
              border: `1px solid ${isPicked ? colors.gold : colors.cardBorder}`,
              backgroundColor: isPicked ? colors.goldSoft : colors.paper,
              padding: "7px 10px",
              touchAction: "pan-y"
            }
          },
          /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => togglePick(code, e.word),
              dir: "auto",
              style: {
                fontWeight: 700,
                fontSize: 13,
                color: colors.ink,
                textAlign: "start",
                overflowWrap: "break-word"
              }
            },
            e.word
          ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1", style: { flexShrink: 0 } }, /* @__PURE__ */ React.createElement(SpeakButton, { text: e.word, code, color: colors.gold }), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => removeSavedStoryWord(e.word, code),
              style: { color: colors.inkSoft, display: "flex" },
              title: "حذف دائمی"
            },
            /* @__PURE__ */ React.createElement(X, { size: 12 })
          ))),
          level && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(LevelBadge, { level })),
          otherLangs.map((toLang) => {
            const translation = e.translations && e.translations[toLang] || "";
            const toLabel = LANGUAGES.find((l) => l.code === toLang)?.label || toLang;
            return /* @__PURE__ */ React.createElement("div", { key: toLang, className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement(
              "div",
              {
                dir: dirFor(toLang),
                title: toLabel,
                style: {
                  fontSize: 11,
                  color: colors.inkSoft,
                  lineHeight: 1.6,
                  fontFamily: toLang === "fa" ? fontFa : fontLatin,
                  overflowWrap: "break-word",
                  flex: 1
                }
              },
              translation || "…"
            ), translation && /* @__PURE__ */ React.createElement(SpeakButton, { text: translation, code: toLang, color: colors.teal }));
          })
        );
      }))
    );
  }));
}
function GrammarPanel({ nativeLang, nativeLabel, targetOrder, aiSettings, jumpTo }) {
  const [notes, setNotes] = useState([]);
  const [expandedNote, setExpandedNote] = useState(null);
  const [pending, setPending] = useState(null);
  const [chatLang, setChatLang] = useState(targetOrder && targetOrder[0] || "en");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const [noteAskInput, setNoteAskInput] = useState({});
  const [noteAskLoading, setNoteAskLoading] = useState({});
  const [noteAskError, setNoteAskError] = useState({});
  const noteElsRef = useRef({});
  const noteAskTextareaRefs = useRef({});
  const [savedWordsTick, setSavedWordsTick] = useState(0);
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
      aiSettings
    }).then((md) => {
      if (!cancelled) setPending((p) => p && p.word === jumpTo.word ? { ...p, markdown: md } : p);
    }).catch(() => {
      if (!cancelled) setPending((p) => p && p.word === jumpTo.word ? { ...p, markdown: "error" } : p);
    });
    return () => {
      cancelled = true;
    };
  }, [jumpTo?.token]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chatMessages, chatLoading]);
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
          { role: "ai", text: t.answer }
        ])
      ];
      const answer = await askGrammarTeacher({
        userSentence: question,
        langCode: note.langCode,
        nativeLang,
        nativeLabel,
        aiSettings,
        history
      });
      appendGrammarNoteThread(note.id, { question, answer });
    } catch (e) {
      setNoteAskError((s) => ({
        ...s,
        [note.id]: e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply")
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
        history: chatMessages
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: sentence }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply"));
    } finally {
      setChatLoading(false);
    }
  }
  const langOptions = targetOrder && targetOrder.length ? targetOrder : LANGUAGES.map((l) => l.code);
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 } }, "گرامر"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 } }, "توضیحات گرامری‌ای که از روی لغت‌های داستان ذخیره کردی اینجاست. پایین‌تر هم می‌تونی با هوش مصنوعی جمله بنویسی تا مثل یه معلم زبان، اصلاحش کنه و گرامرش رو کلمه‌به‌کلمه بهت یاد بده.")), pending && /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "white", border: `1px solid ${colors.gold}`, borderRadius: 16, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(SpeakButton, { text: pending.word, code: pending.langCode }), /* @__PURE__ */ React.createElement("p", { dir: "auto", style: { fontWeight: 700 } }, pending.word), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => toggleSavedStoryWord(pending.word, pending.langCode),
      title: isWordSaved(pending.word, pending.langCode) ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت",
      style: { color: isWordSaved(pending.word, pending.langCode) ? colors.gold : colors.inkSoft, display: "flex" }
    },
    /* @__PURE__ */ React.createElement(Bookmark, { size: 14, fill: isWordSaved(pending.word, pending.langCode) ? colors.gold : "none" })
  )), /* @__PURE__ */ React.createElement("button", { onClick: () => setPending(null), style: { color: colors.inkSoft, display: "flex" } }, /* @__PURE__ */ React.createElement(X, { size: 16 }))), pending.markdown === "loading" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", style: { fontSize: 13, color: colors.inkSoft } }, /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "spin" }), "در حال آماده کردن توضیح کامل..."), pending.markdown === "error" && /* @__PURE__ */ React.createElement("p", { style: { color: colors.rose, fontSize: 13 } }, "خطا در دریافت توضیح. دوباره امتحان کن."), pending.markdown && pending.markdown !== "loading" && pending.markdown !== "error" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MiniMarkdown, { text: pending.markdown, speakCode: pending.langCode, nativeLang, aiSettings }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        saveGrammarNote({
          langCode: pending.langCode,
          word: pending.word,
          sentence: pending.sentence,
          markdown: pending.markdown
        });
        setPending(null);
      },
      className: "flex items-center gap-1",
      style: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: 700,
        color: "white",
        background: colors.gold,
        borderRadius: 8,
        padding: "6px 12px"
      }
    },
    /* @__PURE__ */ React.createElement(Bookmark, { size: 13 }),
    "ذخیره در یادگیری گرامر"
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, notes.length === 0 && !pending && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: colors.inkSoft } }, "هنوز نکته‌ی گرامری‌ای ذخیره نکردی. روی هر کلمه‌ی داخل داستان بزن و «افزودن به یادگیری گرامر» رو انتخاب کن."), notes.map((n) => {
    const isOpen = expandedNote === n.id;
    const langLabel = LANGUAGES.find((l) => l.code === n.langCode)?.label || n.langCode;
    const wordSaved = isWordSaved(n.word, n.langCode);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: n.id,
        ref: (el) => noteElsRef.current[n.id] = el,
        style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12 }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "flex items-center justify-between",
          onClick: () => setExpandedNote(isOpen ? null : n.id),
          style: { cursor: "pointer" }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(SpeakButton, { text: extractSpeakableText(n.markdown) || n.word, code: n.langCode }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { dir: "auto", style: { fontWeight: 700, fontSize: 14 } }, n.word), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft } }, langLabel))),
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              toggleSavedStoryWord(n.word, n.langCode);
            },
            style: { color: wordSaved ? colors.gold : colors.inkSoft, display: "flex" },
            title: wordSaved ? "حذف از لغات ذخیره‌شده" : "ذخیره‌ی لغت"
          },
          /* @__PURE__ */ React.createElement(Bookmark, { size: 14, fill: wordSaved ? colors.gold : "none" })
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              removeGrammarNote(n.id);
            },
            style: { color: colors.inkSoft, display: "flex" },
            title: "حذف"
          },
          /* @__PURE__ */ React.createElement(X, { size: 14 })
        ), isOpen ? /* @__PURE__ */ React.createElement(ChevronLeft, { size: 16 }) : /* @__PURE__ */ React.createElement(ChevronRight, { size: 16 }))
      ),
      isOpen && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 8 } }, /* @__PURE__ */ React.createElement(MiniMarkdown, { text: n.markdown, speakCode: n.langCode, nativeLang, aiSettings }), (n.thread || []).map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { dir: "auto", style: { fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 4 } }, t.question), /* @__PURE__ */ React.createElement("div", { style: { background: colors.goldSoft, borderRadius: 10, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement(MiniMarkdown, { text: t.answer, speakCode: n.langCode, nativeLang, aiSettings })))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 items-end", style: { marginTop: 10, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 } }, /* @__PURE__ */ React.createElement(
        "textarea",
        {
          ref: (el) => noteAskTextareaRefs.current[n.id] = el,
          dir: "auto",
          rows: 1,
          value: noteAskInput[n.id] || "",
          onChange: (e) => {
            setNoteAskInput((s) => ({ ...s, [n.id]: e.target.value }));
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          },
          onKeyDown: (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              askAboutNote(n);
            }
          },
          placeholder: isFa ? "سوالی درباره‌ی همین نکته داری؟ (برای خط جدید Enter، برای پرسیدن دکمه رو بزن)" : "Ask about this note... (Enter for new line, tap the button to ask)",
          style: {
            flex: 1,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8,
            padding: "6px 8px",
            fontSize: 12,
            fontFamily: "inherit",
            resize: "none",
            lineHeight: 1.6,
            maxHeight: 120
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => askAboutNote(n),
          disabled: noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim(),
          style: {
            backgroundColor: colors.gold,
            color: "white",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            opacity: noteAskLoading[n.id] || !(noteAskInput[n.id] || "").trim() ? 0.6 : 1,
            flexShrink: 0
          }
        },
        noteAskLoading[n.id] ? /* @__PURE__ */ React.createElement(Loader2, { size: 13, className: "spin" }) : isFa ? "بپرس" : "Ask"
      )), noteAskError[n.id] && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.rose, marginTop: 4 } }, noteAskError[n.id]))
    );
  })), /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700 } }, "تمرین جمله‌سازی با هوش مصنوعی"), chatMessages.length > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: clearChat,
      className: "flex items-center gap-1",
      style: { fontSize: 11, color: colors.rose },
      title: isFa ? "پاک‌کردن گفتگو" : "Clear conversation"
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 12 }),
    isFa ? "پاک‌کردن گفتگو" : "Clear"
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: chatLang,
      onChange: (e) => setChatLang(e.target.value),
      style: { fontSize: 12, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, padding: "3px 6px" }
    },
    langOptions.map((code) => /* @__PURE__ */ React.createElement("option", { key: code, value: code }, LANGUAGES.find((l) => l.code === code)?.label || code))
  )), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, marginBottom: 8 } }, "یه جمله به ", LANGUAGES.find((l) => l.code === chatLang)?.label || chatLang, " بنویس؛ اگه غلط بود اصلاحش می‌کنم و کلمه‌به‌کلمه گرامرش رو توضیح می‌دم. بعدش هم می‌تونی هر سوال گرامری‌ای درباره‌ش داشتی همین‌جا بپرسی."), chatMessages.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { maxHeight: 360, overflowY: "auto", marginBottom: 10, paddingRight: 2 } }, chatMessages.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end", marginBottom: 10 } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      dir: "auto",
      style: {
        maxWidth: "90%",
        padding: "8px 12px",
        borderRadius: 12,
        fontSize: 13,
        backgroundColor: m.role === "user" ? colors.paper : colors.goldSoft,
        border: `1px solid ${colors.cardBorder}`
      }
    },
    m.role === "user" ? m.text : /* @__PURE__ */ React.createElement(MiniMarkdown, { text: m.text, speakCode: chatLang, nativeLang, aiSettings }),
    m.role === "ai" && /* @__PURE__ */ React.createElement("div", { className: "flex justify-end", style: { marginTop: 6 } }, m.savedToGrammar ? /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "flex items-center gap-1",
        style: { fontSize: 11, color: colors.gold, fontWeight: 700 }
      },
      /* @__PURE__ */ React.createElement(Bookmark, { size: 12, fill: colors.gold }),
      "ذخیره شد"
    ) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          saveGrammarNote({
            langCode: chatLang,
            word: m.forSentence || "جمله",
            sentence: m.forSentence || "",
            markdown: m.text
          });
          setChatMessages(
            (prev) => prev.map((msg, idx) => idx === i ? { ...msg, savedToGrammar: true } : msg)
          );
        },
        className: "flex items-center gap-1",
        style: { fontSize: 11, color: colors.teal, textDecoration: "underline" }
      },
      /* @__PURE__ */ React.createElement(Bookmark, { size: 12 }),
      "ذخیره در یادگیری گرامر"
    ))
  ))), chatLoading && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", style: { fontSize: 12, color: colors.inkSoft } }, /* @__PURE__ */ React.createElement(Loader2, { size: 13, className: "spin" }), "در حال بررسی جمله..."), /* @__PURE__ */ React.createElement("div", { ref: chatEndRef })), chatError && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.rose, marginBottom: 8 } }, chatError), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex gap-2 items-end",
      style: {
        position: "sticky",
        bottom: 8,
        backgroundColor: "white",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: 6
      }
    },
    /* @__PURE__ */ React.createElement(
      "textarea",
      {
        ref: chatTextareaRef,
        dir: "auto",
        rows: 1,
        value: chatInput,
        onChange: (e) => setChatInput(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sendChat();
          }
        },
        placeholder: "جمله‌ت رو بنویس یا سوالت رو بپرس... (برای خط جدید Enter، برای ارسال دکمه رو بزن)",
        style: {
          flex: 1,
          border: "none",
          outline: "none",
          resize: "none",
          padding: "8px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          lineHeight: 1.6,
          maxHeight: 140
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: sendChat,
        disabled: chatLoading || !chatInput.trim(),
        style: {
          backgroundColor: colors.teal,
          color: "white",
          borderRadius: 10,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          opacity: chatLoading || !chatInput.trim() ? 0.6 : 1,
          flexShrink: 0
        }
      },
      /* @__PURE__ */ React.createElement(Send, { size: 16 })
    )
  )));
}
function PhrasebookMain({ user, onLogout, appPrefs, setAppPrefs }) {
  const [nativeLang, setNativeLang] = useState("fa");
  const [targetOrder, setTargetOrder] = useState(["en"]);
  const [langPickerOrder, setLangPickerOrder] = useState(() => PHRASEBOOK_LANGUAGES.map((l) => l.code));
  const [favorites, setFavorites] = useState(/* @__PURE__ */ new Set());
  const [wordFavorites, setWordFavorites] = useState(/* @__PURE__ */ new Set());
  const [tab, setTab] = useState("conversations");
  useEffect(() => {
    setCurrentOriginTab(tab);
  }, [tab]);
  const [boxes, setBoxes] = useState(() => {
    const initial = {};
    conversation.forEach((p) => initial[p.id] = 1);
    return initial;
  });
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [autoScrollPlay, setAutoScrollPlay] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [readingReport, setReadingReport] = useState(() => buildReadingReport());
  useEffect(() => {
    const refresh = () => setReadingReport(buildReadingReport());
    window.addEventListener(READING_SESSIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(READING_SESSIONS_CHANGED_EVENT, refresh);
  }, []);
  useActivityTimeTracker("app", true);
  const [loaded, setLoaded] = useState(false);
  const [cloudChecked, setCloudChecked] = useState(false);
  const [wordStats, setWordStats] = useState({});
  const [savedStories, setSavedStories] = useState([]);
  const [dictHistory, setDictHistory] = useState([]);
  const [backendUrl, setBackendUrl] = useState("");
  const [storyJump, setStoryJump] = useState(null);
  const [grammarJump, setGrammarJump] = useState(null);
  const aiSettings = { backendUrl, setBackendUrl };
  const userStorageKey = `${STORAGE_KEY}:${user?.email || "guest"}`;
  useEffect(() => {
    requestGrammarJump = (word, sentence, langCode) => {
      setGrammarJump({ word, sentence, langCode, token: Date.now() });
      setTab("grammar");
    };
    return () => {
      requestGrammarJump = null;
    };
  }, []);
  const [savedWordsVersion, setSavedWordsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setSavedWordsVersion((v) => v + 1);
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, bump);
  }, []);
  const wordsWithSaved = useMemo(() => {
    const existing = new Set(WORDS_AZ.map((w) => normalizeWord(w.en)));
    const extras = loadSavedStoryWords().filter((e) => e.langCode === "en" && !/\s/.test(normalizeWord(e.word))).filter((e) => !existing.has(normalizeWord(e.word))).map((e) => ({
      id: `saved:${normalizeWord(e.word)}`,
      en: e.word,
      fa: e.translations && e.translations.fa || "",
      level: lookupSavedWordLevel(e.word, "en") || null,
      pos: null,
      isUserSaved: true
    }));
    return extras.length ? [...extras, ...WORDS_AZ] : WORDS_AZ;
  }, [savedWordsVersion]);
  const [grammarNotesVersion, setGrammarNotesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setGrammarNotesVersion((v) => v + 1);
    window.addEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(GRAMMAR_NOTES_CHANGED_EVENT, bump);
  }, []);
  const applySavedState = (saved, opts) => {
    if (!saved) return;
    const merge = !!(opts && opts.merge);
    if (saved.nativeLang) setNativeLang(saved.nativeLang);
    if (Array.isArray(saved.targetOrder) && saved.targetOrder.length) setTargetOrder(saved.targetOrder);
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
        } catch {
        }
      }
    }
    if (Array.isArray(saved.grammarNotes)) {
      if (merge) {
        mergeGrammarNotesFromCloud(saved.grammarNotes);
      } else {
        try {
          window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify(saved.grammarNotes));
          window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
        } catch {
        }
      }
    }
  };
  useEffect(() => {
    let cancelled = false;
    setCloudChecked(false);
    (async () => {
      try {
        const local = await storage.get(userStorageKey, false);
        const savedLocal = local && local.value ? JSON.parse(local.value) : null;
        if (!cancelled) applySavedState(savedLocal);
      } catch (e) {
      } finally {
        if (!cancelled) setLoaded(true);
      }
      if (user?.uid) {
        try {
          const cloud = await supabaseLoadState(user.uid);
          if (!cancelled && cloud) applySavedState(cloud, { merge: true });
        } catch (e) {
        } finally {
          if (!cancelled) setCloudChecked(true);
        }
      } else {
        if (!cancelled) setCloudChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);
  useEffect(() => {
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
        grammarNotes: loadGrammarNotes()
      };
      try {
        await storage.set(userStorageKey, JSON.stringify(payload), false);
      } catch (e) {
      }
      if (user?.uid) supabaseSaveState(user.uid, payload);
    }, 500);
    return () => clearTimeout(timeout);
  }, [nativeLang, targetOrder, langPickerOrder, favorites, wordFavorites, boxes, wordStats, savedStories, dictHistory, backendUrl, loaded, cloudChecked, userStorageKey, user?.uid, savedWordsVersion, grammarNotesVersion]);
  const toggleTargetLang = (code) => {
    setTargetOrder((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
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
  const targetLangList = targetOrder.map((code) => LANGUAGES.find((l) => l.code === code)).filter(Boolean);
  const targetLabel = targetLangList.map((l) => l.label).join("، ");
  if (!loaded) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        dir: "rtl",
        lang: "fa",
        style: { fontFamily: fontFa, backgroundColor: colors.paper, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.inkSoft }
      },
      /* @__PURE__ */ React.createElement("style", null, `@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`),
      "در حال بارگذاری..."
    );
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      dir: "rtl",
      lang: "fa",
      style: {
        fontFamily: fontFa,
        backgroundColor: colors.paper,
        minHeight: "100vh",
        color: colors.ink,
        position: "relative"
      }
    },
    /* @__PURE__ */ React.createElement(GlobalAddToStorySelection, { fallbackLangCode: nativeLang, nativeLang, nativeLabel, aiSettings }),
    /* @__PURE__ */ React.createElement("style", null, `
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
      `),
    /* @__PURE__ */ React.createElement(
      "header",
      {
        style: { backgroundColor: colors.ink, color: colors.paper },
        className: "px-4 pt-6 pb-5"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, user?.picture ? /* @__PURE__ */ React.createElement("img", { src: user.picture, alt: "", style: { width: 26, height: 26, borderRadius: "50%" } }) : /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: colors.gold,
            color: colors.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800
          }
        },
        (user?.name || user?.email || "?").trim().charAt(0).toUpperCase()
      ), /* @__PURE__ */ React.createElement(SettingsMenu, { appPrefs, setAppPrefs, user, onLogout, aiSettings }))),
      /* @__PURE__ */ React.createElement("p", { style: { color: colors.goldSoft, fontSize: 13 } }, "از ", nativeLabel, " به ", targetLabel, " · ", user?.name || user?.email),
      /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.paperDark, marginBottom: 6 } }, "زبان مادری (برای جابه‌جایی، مهرِ زبان رو نگه‌دار و بکش)"), /* @__PURE__ */ React.createElement(
        DraggableLangRow,
        {
          order: langPickerOrder,
          setOrder: (next) => {
            setLangPickerOrder(next);
            setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
          },
          languages: PHRASEBOOK_LANGUAGES,
          isActive: (code) => code === nativeLang,
          onClick: (code) => setNativeLang(code)
        }
      ), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" } }, "زبان‌های مقصد (چند تا رو می‌تونی هم‌زمان انتخاب کنی — برای جابه‌جایی، مهرِ زبان رو نگه‌دار و بکش)"), /* @__PURE__ */ React.createElement(
        DraggableLangRow,
        {
          order: langPickerOrder,
          setOrder: (next) => {
            setLangPickerOrder(next);
            setTargetOrder((prev) => syncTargetOrderFromLangPicker(next, prev));
          },
          languages: PHRASEBOOK_LANGUAGES,
          isActive: (code) => targetOrder.includes(code),
          onClick: (code) => toggleTargetLang(code)
        }
      ), targetLangList.length > 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.paperDark, margin: "10px 0 6px" } }, "ترتیب نمایش ترجمه‌ها (بکش تا جابجا بشه)"), /* @__PURE__ */ React.createElement(
        OrderChips,
        {
          order: targetOrder,
          languages: PHRASEBOOK_LANGUAGES,
          onReorder: (next) => {
            setTargetOrder(next);
            setLangPickerOrder((prev) => syncLangPickerFromTargetOrder(prev, next));
          },
          onRemove: toggleTargetLang
        }
      )))
    ),
    /* @__PURE__ */ React.createElement("nav", { className: "flex gap-2 px-4 py-3 overflow-x-auto", style: { backgroundColor: colors.paperDark } }, /* @__PURE__ */ React.createElement(TabButton, { label: "مکالمات روزمره", icon: MessageCircle, active: tab === "conversations", onClick: () => setTab("conversations") }), /* @__PURE__ */ React.createElement(TabButton, { label: "لغات", icon: Layers, active: tab === "words", onClick: () => setTab("words") }), /* @__PURE__ */ React.createElement(TabButton, { label: "علاقه‌مندی‌ها", icon: Heart, active: tab === "favorites", onClick: () => setTab("favorites") }), /* @__PURE__ */ React.createElement(TabButton, { label: "لغات و اخبار", icon: Newspaper, active: tab === "vocab", onClick: () => setTab("vocab") }), /* @__PURE__ */ React.createElement(TabButton, { label: "مکالمه و روزمره", icon: Coffee, active: tab === "daily", onClick: () => setTab("daily") }), /* @__PURE__ */ React.createElement(TabButton, { label: "دیکشنری", icon: Search, active: tab === "dictionary", onClick: () => setTab("dictionary") }), /* @__PURE__ */ React.createElement(TabButton, { label: "مرور (جعبه لایتنر)", icon: RotateCcw, active: tab === "review", onClick: () => {
      setTab("review");
      setReviewIndex(0);
      setShowAnswer(false);
    } }), /* @__PURE__ */ React.createElement(TabButton, { label: "داستان‌ساز", icon: Sparkles, active: tab === "story", onClick: () => setTab("story") }), /* @__PURE__ */ React.createElement(TabButton, { label: "لغات ذخیره‌شده", icon: Bookmark, active: tab === "saved", onClick: () => setTab("saved") }), /* @__PURE__ */ React.createElement(TabButton, { label: "گرامر", icon: Type, active: tab === "grammar", onClick: () => setTab("grammar") })),
    (tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocab" || tab === "daily") && /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3" }, /* @__PURE__ */ React.createElement(LevelFilterRow, { levelFilter, setLevelFilter })),
    (tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocab" || tab === "daily") && /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-2 flex items-center gap-2 flex-wrap", style: { justifyContent: "flex-end", rowGap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: colors.inkSoft } }, "تکرار پخش"), /* @__PURE__ */ React.createElement(RepeatButton, { color: colors.gold }), /* @__PURE__ */ React.createElement(SpeedControl, { color: colors.gold }), /* @__PURE__ */ React.createElement(AutoplayToggle, { enabled: autoScrollPlay, onToggle: () => setAutoScrollPlay((v) => !v), color: colors.teal })),
    (tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocab" || tab === "daily") && /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center gap-2 px-3",
        style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }
      },
      /* @__PURE__ */ React.createElement(Search, { size: 16, color: colors.inkSoft }),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: tab === "words" || tab === "vocab" || tab === "daily" ? "جستجوی لغت..." : tab === "conversations" ? "جستجوی مکالمه..." : "جستجوی عبارت...",
          style: { flex: 1, fontFamily: fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }
        }
      ),
      query && /* @__PURE__ */ React.createElement("button", { onClick: () => setQuery(""), "aria-label": "پاک کردن جستجو" }, /* @__PURE__ */ React.createElement(X, { size: 16, color: colors.inkSoft }))
    )),
    /* @__PURE__ */ React.createElement("main", { className: "px-4 py-4 pb-24" }, tab === "conversations" && /* @__PURE__ */ React.createElement(
      DailyConversationsTab,
      {
        data: DAILY_CONVERSATIONS,
        query,
        nativeLang,
        aiSettings,
        ClickableSentence,
        SpeakButton,
        targetLangs: targetLangList,
        translateFree,
        levelFilter
      }
    ), tab === "favorites" && /* @__PURE__ */ React.createElement(
      PhraseList,
      {
        conversation: conversation.filter((p) => favorites.has(p.id)),
        nativeLang,
        targetLangs: targetLangList,
        favorites,
        toggleFavorite,
        query,
        levelFilter,
        aiSettings,
        autoplayEnabled: tab === "favorites" && autoScrollPlay,
        emptyText: "هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی. روی ⭐ کنار هر عبارت بزن."
      }
    ), tab === "words" && /* @__PURE__ */ React.createElement(
      WordList,
      {
        words: wordsWithSaved,
        wordFavorites,
        toggleWordFavorite,
        query,
        levelFilter,
        emptyText: "لغتی برای نمایش نیست.",
        nativeLang,
        targetLangs: targetLangList,
        aiSettings,
        autoplayEnabled: tab === "words" && autoScrollPlay
      }
    ), tab === "vocab" && /* @__PURE__ */ React.createElement(
      WordList,
      {
        words: NEWS_WORDS,
        wordFavorites,
        toggleWordFavorite,
        query,
        levelFilter,
        emptyText: "لغتی برای نمایش نیست.",
        nativeLang,
        targetLangs: targetLangList,
        aiSettings,
        autoplayEnabled: tab === "vocab" && autoScrollPlay
      }
    ), tab === "daily" && /* @__PURE__ */ React.createElement(
      WordList,
      {
        words: DAILY_WORDS,
        wordFavorites,
        toggleWordFavorite,
        query,
        levelFilter,
        emptyText: "لغتی برای نمایش نیست.",
        nativeLang,
        targetLangs: targetLangList,
        aiSettings,
        autoplayEnabled: tab === "daily" && autoScrollPlay
      }
    ), tab === "review" && /* @__PURE__ */ React.createElement(
      ReviewBox,
      {
        conversation,
        boxes,
        setBoxes,
        nativeLang,
        targetLangs: targetLangList,
        index: reviewIndex,
        setIndex: setReviewIndex,
        showAnswer,
        setShowAnswer
      }
    ), tab === "dictionary" && /* @__PURE__ */ React.createElement(
      Dictionary,
      {
        nativeLang,
        nativeLabel,
        dictHistory,
        setDictHistory,
        aiSettings
      }
    ), tab === "saved" && /* @__PURE__ */ React.createElement(
      SavedWordsPanel,
      {
        nativeLang,
        nativeLabel,
        targetOrder,
        dictHistory,
        setDictHistory,
        onGoToDictionary: () => setTab("dictionary"),
        onJumpToStory: (lang, words) => {
          setStoryJump({ lang, words, token: Date.now() });
        },
        onJumpToOrigin: (entry) => {
          const originTab = entry && entry.origin && entry.origin.tab;
          if (!originTab) return false;
          setTab(originTab);
          if (["conversations", "words", "favorites", "vocab", "daily"].includes(originTab)) {
            setQuery(entry.word);
          }
          return true;
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: tab === "grammar" ? "block" : "none" } }, /* @__PURE__ */ React.createElement(
      GrammarPanel,
      {
        nativeLang,
        nativeLabel,
        targetOrder,
        aiSettings,
        jumpTo: grammarJump
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: tab === "story" ? "block" : "none" } }, /* @__PURE__ */ React.createElement(
      StoryBuilder,
      {
        nativeLang,
        nativeLabel,
        targetOrder,
        wordStats,
        setWordStats,
        savedStories,
        setSavedStories,
        aiSettings,
        jumpTo: storyJump
      }
    ))),
    !chatOpen && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setChatOpen(true),
        "aria-label": "گفتگو با هوش مصنوعی",
        style: {
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
          border: "none"
        }
      },
      /* @__PURE__ */ React.createElement(MessageCircle, { size: 24 })
    ),
    chatOpen && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(28,37,65,0.4)",
          display: "flex",
          alignItems: "flex-end",
          zIndex: 50
        },
        onClick: () => setChatOpen(false)
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            width: "100%",
            maxHeight: "80vh",
            backgroundColor: colors.paper,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            display: "flex",
            flexDirection: "column",
            padding: 16
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, fontSize: 15 } }, "گفتگو با هوش مصنوعی"), /* @__PURE__ */ React.createElement("button", { onClick: () => setChatOpen(false), "aria-label": "بستن" }, /* @__PURE__ */ React.createElement(X, { size: 20, color: colors.inkSoft }))),
        /* @__PURE__ */ React.createElement(StudyStatsPanel, { report: readingReport }),
        /* @__PURE__ */ React.createElement(AiChat, { targetLabel, nativeLabel, readingReport })
      )
    )
  );
}
function PhraseList({ conversation: conversation2, nativeLang, targetLangs, favorites, toggleFavorite, emptyText, query, levelFilter, aiSettings, autoplayEnabled }) {
  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? conversation2.filter((p) => p.level === levelFilter) : conversation2;
  filtered = q ? filtered.filter((p) => {
    const nativeText = (p.t[nativeLang] || "").toLowerCase();
    if (nativeText.includes(q)) return true;
    return targetLangs.some((l) => (p.t[l.code] || "").toLowerCase().includes(q));
  }) : filtered;
  const firstTargetCode = targetLangs[0]?.code;
  const autoplayItems = filtered.map((p) => ({ id: p.id, text: firstTargetCode ? p.t[firstTargetCode] : "", code: firstTargetCode }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);
  if (filtered.length === 0) {
    return /* @__PURE__ */ React.createElement("p", { style: { color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 } }, q ? "چیزی با این جستجو پیدا نشد." : emptyText || "چیزی برای نمایش نیست.");
  }
  const grouped = filtered.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-6" }, Object.entries(grouped).map(([cat, items]) => /* @__PURE__ */ React.createElement("section", { key: cat }, /* @__PURE__ */ React.createElement("h2", { style: { color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 } }, CATEGORIES[cat] || cat), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, items.map((p) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: p.id,
      ref: registerRef(p.id),
      className: "flex items-center justify-between p-3 rounded-lg",
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 800, fontSize: 15, color: mainTextColor } }, p.t[nativeLang]), /* @__PURE__ */ React.createElement(SpeakButton, { text: p.t[nativeLang], code: nativeLang }), p.level && /* @__PURE__ */ React.createElement(LevelBadge, { level: p.level })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1", style: { marginTop: 4 } }, targetLangs.map((l) => /* @__PURE__ */ React.createElement("div", { key: l.code, style: { display: "flex", alignItems: "center", gap: 8, direction: "ltr" } }, /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0
        }
      },
      l.abbr
    ), /* @__PURE__ */ React.createElement("p", { style: { flex: 1, fontWeight: 800, color: translationColor } }, p.t[l.code] ? /* @__PURE__ */ React.createElement(
      ClickableSentence,
      {
        text: p.t[l.code],
        langCode: l.code,
        nativeLang,
        aiSettings,
        color: translationColor
      }
    ) : "—"), p.t[l.code] && /* @__PURE__ */ React.createElement(SpeakButton, { text: p.t[l.code], code: l.code, color: translationColor, edge: "end" }))))),
    /* @__PURE__ */ React.createElement("button", { onClick: () => toggleFavorite(p.id), "aria-label": "افزودن به علاقه‌مندی‌ها", style: { marginRight: 4 } }, /* @__PURE__ */ React.createElement(
      Star,
      {
        size: 20,
        color: colors.gold,
        fill: favorites.has(p.id) ? colors.gold : "none"
      }
    ))
  ))))));
}
function VocabList({ words, nativeLang, targetLangs, levelFilter, aiSettings, autoplayEnabled }) {
  const [openIds, setOpenIds] = useState(/* @__PURE__ */ new Set());
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
    return /* @__PURE__ */ React.createElement("p", { style: { color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 } }, "در این سطح لغتی نیست.");
  }
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, filtered.map((w) => {
    const isOpen = openIds.has(w.id);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: w.id,
        ref: registerRef(w.id),
        onClick: () => toggleOpen(w.id),
        className: "p-3 rounded-lg",
        style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, cursor: "pointer" }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 800, fontSize: 16, color: mainTextColor } }, w.t[nativeLang] ?? w.t.fa), /* @__PURE__ */ React.createElement(SpeakButton, { text: w.t[nativeLang] ?? w.t.fa, code: nativeLang })), /* @__PURE__ */ React.createElement(LevelBadge, { level: w.level })),
      isOpen && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2", style: { borderTop: `1px dashed ${colors.cardBorder}` } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.gold, fontWeight: 700, marginBottom: 4 } }, POS_FA[w.pos] || w.pos), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, color: colors.inkSoft, marginBottom: 8 } }, w.meaningFa), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, targetLangs.map((l) => /* @__PURE__ */ React.createElement("div", { key: l.code, style: { display: "flex", alignItems: "center", gap: 8, direction: "ltr" } }, /* @__PURE__ */ React.createElement(
        "span",
        {
          style: {
            fontFamily: fontFa,
            fontSize: 10,
            fontWeight: 700,
            color: colors.gold,
            border: `1px solid ${colors.goldSoft}`,
            borderRadius: 6,
            padding: "1px 5px",
            flexShrink: 0
          }
        },
        l.abbr
      ), /* @__PURE__ */ React.createElement("p", { style: { flex: 1, fontWeight: 800, color: translationColor } }, w.t[l.code] ? /* @__PURE__ */ React.createElement(
        ClickableSentence,
        {
          text: w.t[l.code],
          langCode: l.code,
          nativeLang,
          aiSettings,
          color: translationColor
        }
      ) : "—"), w.t[l.code] && /* @__PURE__ */ React.createElement(SpeakButton, { text: w.t[l.code], code: l.code, color: translationColor, edge: "end" }))))),
      !isOpen && /* @__PURE__ */ React.createElement("p", { style: { color: colors.cardBorder, fontSize: 11, marginTop: 4 } }, "(برای دیدن معنی لمس کن)")
    );
  }));
}
const STORY_SELECTION_HIGHLIGHT = "hope-story-sel";
function GlobalAddToStorySelection({ fallbackLangCode = "fa", nativeLang, nativeLabel, aiSettings }) {
  const [popup, setPopup] = useState(null);
  const [added, setAdded] = useState(false);
  const popupElRef = useRef(null);
  const clearSelectionHighlight = () => {
    try {
      if (typeof CSS !== "undefined" && CSS.highlights) {
        CSS.highlights.delete(STORY_SELECTION_HIGHLIGHT);
      }
    } catch {
    }
  };
  const closePopup = () => {
    setPopup(null);
    clearSelectionHighlight();
  };
  const [saved, setSaved] = useState(false);
  const [grammarSaved, setGrammarSaved] = useState(false);
  useEffect(() => {
    const resolveLangCode = (node) => {
      const el = node && node.nodeType === 1 ? node : node?.parentElement;
      const host = el && el.closest ? el.closest("[data-lang-code]") : null;
      return host && host.getAttribute("data-lang-code") || fallbackLangCode;
    };
    const handleUp = () => {
      const sel = window.getSelection && window.getSelection();
      const selectedText = sel ? sel.toString().trim() : "";
      if (!selectedText || !sel.rangeCount) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      let rect;
      try {
        const range = sel.getRangeAt(0);
        rect = range.getBoundingClientRect();
      } catch {
        return;
      }
      if (!rect || !rect.width && !rect.height) return;
      const langCode = resolveLangCode(sel.anchorNode);
      try {
        if (typeof CSS !== "undefined" && CSS.highlights && typeof Highlight === "function") {
          const range = sel.getRangeAt(0).cloneRange();
          CSS.highlights.set(STORY_SELECTION_HIGHLIGHT, new Highlight(range));
        }
      } catch {
      }
      setAdded(false);
      setSaved(isWordSaved(selectedText, langCode));
      setGrammarSaved(false);
      setPopup({ top: rect.top, left: rect.left + rect.width / 2, text: selectedText, langCode });
      try {
        window.getSelection()?.removeAllRanges?.();
      } catch {
      }
    };
    const handleContextMenu = (e) => {
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
  function saveSelectionToGrammar() {
    if (!popup) return;
    const basicMarkdown = `## 🧩 ${popup.text}

**جمله:** ${popup.text}`;
    const entry = saveGrammarNote({ langCode: popup.langCode, word: popup.text, sentence: popup.text, markdown: basicMarkdown });
    setGrammarSaved(true);
    if (!entry) return;
    lookupWordGrammarDetail({
      word: popup.text,
      sentence: popup.text,
      langCode: popup.langCode,
      nativeLang: nativeLang || fallbackLangCode,
      nativeLabel,
      aiSettings
    }).then((md) => {
      if (md) updateGrammarNoteMarkdown(entry.id, md);
    }).catch(() => {
    });
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: popupElRef,
      onMouseDown: (e) => e.stopPropagation(),
      onTouchStart: (e) => e.stopPropagation(),
      style: {
        position: "fixed",
        top: Math.max(8, popup.top - 40),
        left: Math.min(Math.max(90, popup.left), window.innerWidth - 90),
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 4,
        maxWidth: "92vw",
        background: colors.ink,
        color: colors.paper,
        borderRadius: 8,
        padding: "5px 6px",
        fontFamily: fontFa,
        zIndex: 9999,
        boxShadow: "0 4px 14px rgba(0,0,0,0.28)"
      }
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          addTextToStoryPicks(popup.text, popup.langCode);
          setAdded(true);
          setTimeout(() => closePopup(), 700);
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: colors.paper,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 6,
          padding: "3px 8px",
          cursor: "pointer"
        }
      },
      added ? /* @__PURE__ */ React.createElement(Check, { size: 11, color: colors.gold }) : /* @__PURE__ */ React.createElement(Plus, { size: 11 }),
      added ? "اضافه شد" : "افزودن به داستان"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          const nowSaved = toggleSavedStoryWord(popup.text, popup.langCode, { nativeLang: nativeLang || fallbackLangCode });
          setSaved(nowSaved);
          if (nowSaved) {
            try {
              window.dispatchEvent(
                new CustomEvent(STORY_WORD_PICKED_EVENT, { detail: { word: popup.text, langCode: popup.langCode } })
              );
            } catch {
            }
          }
        },
        style: {
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
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement(Bookmark, { size: 11, fill: saved ? colors.gold : "none" }),
      saved ? "ذخیره شد برای داستان بعدی" : "ذخیره برای داستان بعدی"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          saveSelectionToGrammar();
        },
        style: {
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
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement(Type, { size: 11 }),
      grammarSaved ? "ذخیره شد در گرامر" : "افزودن به یادگیری گرامر"
    )
  );
}
const WORDS_PAGE_SIZE = 60;
function WordList({ words, wordFavorites, toggleWordFavorite, query, levelFilter, emptyText, nativeLang, targetLangs, aiSettings, autoplayEnabled }) {
  const displayLangs = targetLangs && targetLangs.length ? targetLangs.filter((l) => l.code !== "en") : [];
  const effectiveDisplayLangs = displayLangs.length ? displayLangs : [{ code: "fa", label: "فارسی", abbr: "FA" }];
  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
  filtered = q ? filtered.filter((w) => w.en.toLowerCase().includes(q) || w.fa.includes(q)) : filtered;
  const [visibleCount, setVisibleCount] = useState(WORDS_PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(WORDS_PAGE_SIZE);
  }, [q, levelFilter, words]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
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
  if (filtered.length === 0) {
    return /* @__PURE__ */ React.createElement("p", { style: { color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 } }, q ? "چیزی با این جستجو پیدا نشد." : emptyText || "چیزی برای نمایش نیست.");
  }
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, visible.map((w) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: w.id,
      ref: registerRef(w.id),
      className: "flex items-center justify-between p-3 rounded-lg",
      style: { backgroundColor: "white", border: `1px solid ${colors.cardBorder}` }
    },
    /* @__PURE__ */ React.createElement("button", { onClick: () => toggleWordFavorite(w.id), "aria-label": "افزودن به علاقه‌مندی‌ها", style: { marginLeft: 4, flexShrink: 0 } }, /* @__PURE__ */ React.createElement(Star, { size: 20, color: colors.gold, fill: wordFavorites.has(w.id) ? colors.gold : "none" })),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center flex-wrap gap-2", style: { direction: "ltr" } }, /* @__PURE__ */ React.createElement(
      ClickableSentence,
      {
        text: w.en,
        langCode: "en",
        nativeLang,
        aiSettings,
        color: mainTextColor,
        fontFamily: fontLatin,
        fontWeight: 800,
        fontSize: 19
      }
    ), /* @__PURE__ */ React.createElement(SpeakButton, { text: w.en, code: "en", color: colors.teal, edge: "end" }), w.level && /* @__PURE__ */ React.createElement(LevelBadge, { level: w.level }), w.isUserSaved && /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.rose,
          border: `1px solid ${colors.rose}`,
          borderRadius: 6,
          padding: "1px 6px",
          flexShrink: 0
        }
      },
      "شخصی"
    ), w.pos && /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.teal,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 6,
          padding: "1px 6px",
          flexShrink: 0
        }
      },
      POS_FA[w.pos] || w.pos
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1", style: { marginTop: 4 } }, effectiveDisplayLangs.map((l) => /* @__PURE__ */ React.createElement(
      WordTargetTranslation,
      {
        key: l.code,
        word: w.en,
        langCode: l.code,
        abbr: l.abbr,
        knownText: l.code === "fa" ? w.fa : "",
        nativeLang,
        aiSettings
      }
    ))), /* @__PURE__ */ React.createElement(WordExamples, { word: w.en, langCode: "en", meaningNative: w.fa, nativeLang, aiSettings }))
  )), hasMore && /* @__PURE__ */ React.createElement("div", { ref: sentinelRef, style: { height: 1 } }));
}
function WordTargetTranslation({ word, langCode, abbr, knownText, nativeLang, aiSettings }) {
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
    translateFree(word, langCode, "en", aiSettings).then((t) => {
      if (cancelled || !t) return;
      setText(t);
      saveWordTranslation(word, langCode, t);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [word, langCode, knownText]);
  return /* @__PURE__ */ React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8, direction: "ltr" } },
    /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0
        }
      },
      abbr
    ),
    text ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { style: { flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft } }, text), /* @__PURE__ */ React.createElement(SpeakButton, { text, code: langCode, color: colors.teal, edge: "end" })) : /* @__PURE__ */ React.createElement("p", { style: { flex: 1, fontSize: 12, color: colors.inkSoft } }, "در حال ترجمه...")
  );
}
function WordExamples({ word, langCode, meaningNative, nativeLang, aiSettings }) {
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
        aiSettings
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
  return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGenerate,
      disabled: generating,
      style: {
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
        opacity: generating ? 0.6 : 1
      }
    },
    generating ? /* @__PURE__ */ React.createElement(Loader2, { size: 12, className: "spin" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 12 }),
    examples.length ? "مثال دیگر" : "مثال (با هوش مصنوعی)"
  ), err && /* @__PURE__ */ React.createElement("p", { style: { color: colors.rose, fontSize: 11, marginTop: 4 } }, err), examples.map((ex) => /* @__PURE__ */ React.createElement(WordExampleRow, { key: ex.id, example: ex, word, langCode, nativeLang, aiSettings })));
}
function WordExampleRow({ example, word, langCode, nativeLang, aiSettings }) {
  const [translation, setTranslation] = useState(example.translations?.[nativeLang] || "");
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (example.translations?.[nativeLang]) {
      setTranslation(example.translations[nativeLang]);
      return;
    }
    let cancelled = false;
    translateFree(example.text, nativeLang, langCode, aiSettings).then((t) => {
      if (cancelled || !t) return;
      setTranslation(t);
      updateWordExampleTranslation(word, langCode, example.id, nativeLang, t);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [example.id, nativeLang]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        marginTop: 6,
        padding: 8,
        borderRadius: 8,
        background: colors.paperDark,
        border: `1px solid ${colors.cardBorder}`
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { direction: "ltr" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(
      ClickableSentence,
      {
        text: example.text,
        langCode,
        nativeLang,
        aiSettings,
        color: mainTextColor,
        fontWeight: 800,
        fontSize: 13
      }
    )), /* @__PURE__ */ React.createElement(SpeakButton, { text: example.text, code: langCode, color: colors.teal, edge: "end" })),
    translation ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("p", { style: { flex: 1, fontSize: 12, fontWeight: 800, color: translationColor } }, translation), /* @__PURE__ */ React.createElement(SpeakButton, { text: translation, code: nativeLang, color: translationColor })) : /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginTop: 4 } }, "در حال ترجمه..."),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          addTextToStoryPicks(example.text, langCode);
          setAdded(true);
        },
        style: {
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
          marginTop: 6
        }
      },
      added ? /* @__PURE__ */ React.createElement(Check, { size: 11 }) : /* @__PURE__ */ React.createElement(Plus, { size: 11 }),
      added ? "اضافه شد به داستان‌ساز" : "افزودن این مثال به داستان‌ساز"
    )
  );
}
function ReviewBox({ conversation: conversation2, boxes, setBoxes, nativeLang, targetLangs, index, setIndex, showAnswer, setShowAnswer }) {
  const active = conversation2.filter((p) => boxes[p.id] < 5);
  if (active.length === 0) {
    return /* @__PURE__ */ React.createElement("p", { style: { textAlign: "center", color: colors.teal, marginTop: 40, fontWeight: 600 } }, "همه‌ی عبارات رو بلدی! 🎉");
  }
  const current = active[index % active.length];
  const handle = (knew) => {
    setBoxes((prev) => ({
      ...prev,
      [current.id]: knew ? Math.min(5, prev[current.id] + 1) : 1
    }));
    setShowAnswer(false);
    setIndex((i) => i + 1);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-4 mt-6" }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft } }, "باقی‌مانده برای مرور: ", active.length), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-full max-w-sm rounded-xl p-8 text-center",
      style: { backgroundColor: "white", border: `2px solid ${colors.gold}`, minHeight: 140 }
    },
    /* @__PURE__ */ React.createElement("div", { onClick: () => setShowAnswer((s) => !s), style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 800, fontSize: 18, color: mainTextColor } }, current.t[nativeLang]), /* @__PURE__ */ React.createElement(SpeakButton, { text: current.t[nativeLang], code: nativeLang }), current.level && /* @__PURE__ */ React.createElement(LevelBadge, { level: current.level })), !showAnswer && /* @__PURE__ */ React.createElement("p", { style: { color: colors.cardBorder, fontSize: 12, marginTop: 14 } }, "(برای دیدن ترجمه لمس کن)")),
    showAnswer && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2", style: { marginTop: 14 } }, targetLangs.map((l) => /* @__PURE__ */ React.createElement("div", { key: l.code, style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, direction: "ltr" } }, /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontFamily: fontFa,
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          border: `1px solid ${colors.goldSoft}`,
          borderRadius: 6,
          padding: "1px 5px",
          flexShrink: 0
        }
      },
      l.abbr
    ), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: fontLatin, color: translationColor, fontWeight: 800, fontSize: 16 } }, current.t[l.code] ?? "—"), current.t[l.code] && /* @__PURE__ */ React.createElement(SpeakButton, { text: current.t[l.code], code: l.code, color: translationColor, edge: "end" }))))
  ), showAnswer && /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handle(false),
      className: "flex items-center gap-1 px-4 py-2 rounded-full",
      style: { backgroundColor: colors.rose, color: "white", fontFamily: fontFa }
    },
    /* @__PURE__ */ React.createElement(X, { size: 16 }),
    " بلد نبودم"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handle(true),
      className: "flex items-center gap-1 px-4 py-2 rounded-full",
      style: { backgroundColor: colors.teal, color: "white", fontFamily: fontFa }
    },
    /* @__PURE__ */ React.createElement(Check, { size: 16 }),
    " بلد بودم"
  )));
}
function StudyStatsPanel({ report }) {
  const [calendarMode, setCalendarMode] = useState(() => {
    try {
      return window.localStorage.getItem("phrasebook-stats-calendar") || "jalali";
    } catch {
      return "jalali";
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("phrasebook-stats-calendar", calendarMode);
    } catch {
    }
  }, [calendarMode]);
  const sections = [
    { key: "story", label: "داستان‌ساز", color: colors.rose },
    { key: "grammar", label: "گرامر", color: colors.gold },
    { key: "conversation ", label: "عبارات", color: colors.teal }
  ];
  if (!report) {
    return /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: colors.inkSoft, textAlign: "center", padding: "10px 0" } }, "هنوز فعالیتی ثبت نشده — با استفاده از هر بخش (داستان‌ساز/گرامر/عبارات)، آمارت خودکار اینجا نشون داده می‌شه.");
  }
  const maxMinutes = Math.max(1, ...sections.map((s) => report.byCategoryMinutes[s.key] || 0));
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        backgroundColor: "white",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { style: { fontWeight: 700, fontSize: 13 } }, "📊 آمار مطالعه"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, [
      { key: "jalali", label: "شمسی" },
      { key: "gregorian", label: "میلادی" }
    ].map((opt) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: opt.key,
        onClick: () => setCalendarMode(opt.key),
        style: {
          fontSize: 10,
          padding: "2px 7px",
          borderRadius: 10,
          border: `1px solid ${calendarMode === opt.key ? colors.teal : colors.cardBorder}`,
          backgroundColor: calendarMode === opt.key ? colors.teal : "white",
          color: calendarMode === opt.key ? "white" : colors.ink,
          fontWeight: 600
        }
      },
      opt.label
    )))),
    /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginBottom: 10 } }, "امروز ", report.todayMinutes, " دقیقه · هفت روز اخیر ", report.weekMinutes, " دقیقه · مجموع ", report.totalAppMinutes, " دقیقه"),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 mb-3" }, sections.map((s) => {
      const minutes = report.byCategoryMinutes[s.key] || 0;
      const pct = Math.round(minutes / maxMinutes * 100);
      return /* @__PURE__ */ React.createElement("div", { key: s.key }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 600 } }, s.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: colors.inkSoft } }, minutes, " دقیقه")), /* @__PURE__ */ React.createElement("div", { style: { height: 7, borderRadius: 6, backgroundColor: colors.paperDark, overflow: "hidden" } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            height: "100%",
            width: `${pct}%`,
            backgroundColor: s.color,
            borderRadius: 6,
            transition: "width 0.3s"
          }
        }
      )));
    })),
    report.recent.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: colors.inkSoft, marginBottom: 4 } }, "جلسه‌های اخیر"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1", style: { maxHeight: 120, overflowY: "auto" } }, report.recent.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center justify-between", style: { fontSize: 11, color: colors.inkSoft } }, /* @__PURE__ */ React.createElement("span", null, sections.find((s) => s.key === r.category)?.label || r.category, r.langCode ? ` (${r.langCode})` : ""), /* @__PURE__ */ React.createElement("span", null, r.minutes, " دقیقه"), /* @__PURE__ */ React.createElement("span", { dir: "ltr" }, calendarMode === "jalali" ? r.jalaliDate : r.gregorianDate)))))
  );
}
function AiChat({ targetLabel, nativeLabel, readingReport }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `سلام! هر سوالی داری بپرس — درباره‌ی ${targetLabel || "زبانی که یاد می‌گیری"}، یا هر موضوع دیگه‌ای، هرچی دلت خواست. به ${nativeLabel} هم می‌تونی بنویسی.` }
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
      const reportText = readingReport ? `Here is the user's REAL usage/practice data in this app, tracked automatically (Persian dates are the Jalali/Shamsi calendar; "app" = total time the app was open and in view, "story"/"grammar"/"conversation " = time spent specifically in each of those sections — sections can overlap with "app" time, they're not additive). Use it whenever the user asks about their study habits, progress, streaks, or wants encouragement/analysis — refer to real numbers, don't make them up: total sessions ever: ${readingReport.totalSessions}; total app-open minutes ever: ${readingReport.totalAppMinutes}; app-open minutes today: ${readingReport.todayMinutes}; app-open minutes in the last 7 days: ${readingReport.weekMinutes}; minutes per section (app/story/grammar/conversation  → minutes): ${JSON.stringify(readingReport.byCategoryMinutes)}; minutes per language read/listened to (ISO code → minutes): ${JSON.stringify(readingReport.byLangMinutes)}; last sessions (most recent first, section/language/minutes/Gregorian date/Jalali date): ${readingReport.recent.map((r) => `${r.category}${r.langCode ? "/" + r.langCode : ""} ${r.minutes}min on ${r.gregorianDate} (${r.jalaliDate})`).join("; ")}.` : "The user has no recorded usage sessions yet in this app (tracking just started, or they haven't used it long enough — sessions under 3 seconds aren't logged). If they ask about their progress, mention it'll start showing up as they use the app.";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1e3,
          messages: [
            {
              role: "user",
              content: `You are a helpful, all-purpose AI assistant chatting with a Persian speaker inside a language-learning app. Answer ANY question the user asks, on ANY topic (not just language learning) — general knowledge, advice, help with code, translation, or plain conversation — exactly like a general-purpose assistant would. Default to replying in ${nativeLabel} unless the user is specifically practicing ${targetLabel || "a foreign language"} or asks in another language, in which case reply in that language (adding a short ${nativeLabel} translation in parentheses for non-trivial sentences). If the user writes a sentence in ${targetLabel || "the target language"} that looks like a practice attempt, gently correct it. Keep replies reasonably short and conversational unless the question needs more depth.

${reportText}

Conversation so far:

${[...messages, userMsg].map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n")}`
            }
          ]
        })
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
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col", style: { height: "55vh" } }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto flex flex-col gap-3 pb-2" }, messages.map((m, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      style: {
        alignSelf: m.role === "user" ? "flex-start" : "flex-end",
        backgroundColor: m.role === "user" ? "white" : colors.ink,
        color: m.role === "user" ? colors.ink : colors.paper,
        border: m.role === "user" ? `1px solid ${colors.cardBorder}` : "none",
        borderRadius: 14,
        padding: "10px 14px",
        maxWidth: "80%",
        fontSize: 14,
        whiteSpace: "pre-wrap"
      }
    },
    m.text
  )), loading && /* @__PURE__ */ React.createElement("div", { style: { alignSelf: "flex-end", color: colors.inkSoft, fontSize: 13 } }, "در حال نوشتن..."), /* @__PURE__ */ React.createElement("div", { ref: bottomRef })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 items-end pt-2", style: { borderTop: `1px solid ${colors.cardBorder}`, position: "sticky", bottom: 0, backgroundColor: colors.paper } }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows: 1,
      value: input,
      onChange: (e) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          send();
        }
      },
      placeholder: "پیامت رو بنویس... (برای خط جدید Enter، برای ارسال دکمه رو بزن)",
      style: {
        flex: 1,
        fontFamily: fontFa,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 18,
        padding: "10px 16px",
        fontSize: 14,
        outline: "none",
        resize: "none",
        maxHeight: 140,
        lineHeight: 1.5
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: send,
      disabled: loading,
      style: {
        backgroundColor: colors.gold,
        color: "white",
        borderRadius: "50%",
        width: 42,
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      },
      "aria-label": "ارسال"
    },
    /* @__PURE__ */ React.createElement(Send, { size: 18 })
  )));
}
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
  } catch {
  }
}
function persistSession(user) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
  }
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
  } catch {
  }
}
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return String(h);
}
function AuthField({ icon, placeholder, value, onChange, type = "text" }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "10px 12px",
        background: "#fff"
      }
    },
    /* @__PURE__ */ React.createElement("span", { style: { color: colors.inkSoft } }, icon),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type,
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        dir: "rtl",
        style: {
          border: "none",
          outline: "none",
          flex: 1,
          fontFamily: fontFa,
          fontSize: 14,
          background: "transparent",
          color: colors.ink
        }
      }
    )
  );
}
function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (oauthError) throw oauthError;
    } catch (e) {
      setError("ورود با گوگل ناموفق بود: " + (e?.message || "دوباره تلاش کنید."));
      setGoogleBusy(false);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password.trim() || mode === "signup" && !name.trim()) {
      setError("همه‌ی فیلدها را پر کنید.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          onAuthenticated(supabaseUserToSession(data.user));
        } else {
          setNotice("یک ایمیل تایید برایتان فرستاده شد. لطفاً ایمیلتان را باز کنید و لینک را بزنید، بعد وارد شوید.");
          setMode("login");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) throw signInError;
        onAuthenticated(supabaseUserToSession(data.user));
      }
    } catch (e2) {
      const msg = e2?.message || "";
      if (/already registered|already exists/i.test(msg)) setError("این ایمیل قبلاً ثبت شده. وارد شوید.");
      else if (/invalid login credentials/i.test(msg)) setError("ایمیل یا رمز عبور اشتباه است.");
      else if (/email not confirmed/i.test(msg)) setError("هنوز ایمیلتان را تایید نکرده‌اید — صندوق ورودی را چک کنید.");
      else setError(msg || "خطایی رخ داد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      dir: "rtl",
      lang: "fa",
      style: {
        minHeight: "100vh",
        background: colors.paper,
        fontFamily: fontFa,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }
    },
    /* @__PURE__ */ React.createElement("style", null, `@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          width: "100%",
          maxWidth: 380,
          background: colors.paperDark,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 18,
          padding: 32,
          boxShadow: "0 10px 30px rgba(28,37,65,0.12)"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 26 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: colors.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            color: colors.paper
          }
        },
        mode === "signup" ? /* @__PURE__ */ React.createElement(UserPlus, { size: 26 }) : /* @__PURE__ */ React.createElement(LogIn, { size: 26 })
      ), /* @__PURE__ */ React.createElement("h1", { style: { margin: 0, fontSize: 20, fontWeight: 800, color: colors.ink } }, mode === "signup" ? "ساخت حساب کاربری" : "ورود به کتاب مکالمه"), /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: 13, color: colors.inkSoft } }, "برای ذخیره‌ی پیشرفت و واژه‌هایتان وارد شوید")),
      /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: handleGoogleSignIn,
          disabled: googleBusy,
          style: {
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
            cursor: googleBusy ? "default" : "pointer"
          }
        },
        googleBusy ? /* @__PURE__ */ React.createElement(Loader2, { size: 18, className: "spin" }) : /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 48 48" }, /* @__PURE__ */ React.createElement("path", { fill: "#FFC107", d: "M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" }), /* @__PURE__ */ React.createElement("path", { fill: "#FF3D00", d: "M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 15.6 3 8.4 8 6.3 14.7z" }), /* @__PURE__ */ React.createElement("path", { fill: "#4CAF50", d: "M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.5 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C8.3 40 15.5 45 24 45z" }), /* @__PURE__ */ React.createElement("path", { fill: "#1976D2", d: "M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.4C41.4 35.9 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" })),
        "ورود با حساب گوگل"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", style: { margin: "18px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 1, background: colors.cardBorder } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.inkSoft } }, "یا با ایمیل"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 1, background: colors.cardBorder } })),
      /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3" }, mode === "signup" && /* @__PURE__ */ React.createElement(AuthField, { icon: /* @__PURE__ */ React.createElement(User, { size: 16 }), placeholder: "نام شما", value: name, onChange: setName }), /* @__PURE__ */ React.createElement(AuthField, { icon: /* @__PURE__ */ React.createElement(Mail, { size: 16 }), placeholder: "ایمیل", value: email, onChange: setEmail, type: "email" }), /* @__PURE__ */ React.createElement(
        AuthField,
        {
          icon: /* @__PURE__ */ React.createElement(Lock, { size: 16 }),
          placeholder: "رمز عبور",
          value: password,
          onChange: setPassword,
          type: "password"
        }
      ), error && /* @__PURE__ */ React.createElement("div", { style: { color: colors.rose, fontSize: 13, textAlign: "center" } }, error), notice && /* @__PURE__ */ React.createElement("div", { style: { color: colors.teal, fontSize: 13, textAlign: "center" } }, notice), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          disabled: busy,
          style: {
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
            gap: 8
          }
        },
        busy && /* @__PURE__ */ React.createElement(Loader2, { size: 16, className: "spin" }),
        mode === "signup" ? "ساخت حساب" : "ورود"
      )),
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 18, fontSize: 13, color: colors.inkSoft } }, mode === "signup" ? "حساب دارید؟" : "حساب ندارید؟", " ", /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setMode(mode === "signup" ? "login" : "signup");
            setError("");
            setNotice("");
          },
          style: {
            background: "none",
            border: "none",
            color: colors.teal,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: fontFa,
            fontSize: 13
          }
        },
        mode === "signup" ? "وارد شوید" : "بسازید"
      ))
    )
  );
}
export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [appPrefs, setAppPrefs] = useState(loadAppPrefs);
  useEffect(() => saveAppPrefs(appPrefs), [appPrefs]);
  useEffect(() => {
    offlineDictionary.hydrateFromCache();
  }, []);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(supabaseUserToSession(data?.session?.user || null));
      setCheckingSession(false);
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=") || window.location.search.includes("error")) {
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
    minHeight: "100vh"
  };
  if (checkingSession) {
    return /* @__PURE__ */ React.createElement("div", { style: { ...rootStyle, display: "flex", alignItems: "center", justifyContent: "center", background: colors.paper } }, /* @__PURE__ */ React.createElement(Loader2, { size: 28, className: "spin", color: colors.gold }));
  }
  return /* @__PURE__ */ React.createElement("div", { style: rootStyle }, !user ? /* @__PURE__ */ React.createElement(LoginScreen, { onAuthenticated: setUser }) : /* @__PURE__ */ React.createElement(
    PhrasebookMain,
    {
      key: user.email,
      user,
      appPrefs,
      setAppPrefs,
      onLogout: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
        }
        setUser(null);
      }
    }
  ));
}
import ReactDOM from "react-dom/client";
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(/* @__PURE__ */ React.createElement(App, null));
