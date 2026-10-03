import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useReducer } from "react";
import { createPortal } from "react-dom";
import { Star, MessageCircle, RotateCcw, Repeat, Send, Check, X, BookOpen, Heart, Search, Volume2, VolumeX, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Wand2, Menu, Palette, Type, Trash2, PlayCircle, Gauge, Layers, Blend, Coffee, CheckSquare, Copy, Globe, SkipBack, SkipForward, ListMusic, Square, ListChecks, Mic, Clock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { VOCAB } from "./VOCAB.js";
import { WORDS_AZ } from './WORDS_AZ.js';
import { DAILY_WORDS } from "./DAILY_WORDS.js";
import { SLANG_WORDS } from "./SLANG_WORDS.js";
import { VOCAB_IN_USE_UNITS } from "./vocabularyInUseData.js";
import { DAILY_CONVERSATIONS,THEMATIC_CONVERSATIONS } from "./DAILY_CONVERSATIONS.js";
import DailyConversationsTab from "./DailyConversationsTab.jsx";
import SpeakingPracticePanel from "./SpeakingPractice.jsx";
import { recordNeuralRepeat, addNeuralFiber, NeuralPathButton } from "./NeuralPath.jsx";
import YouTubeCaptionPanel from "./YouTubeCaptions.jsx";
// مکالمات روزمره + مکالمات موضوعی، یکجا مرج‌شده — تا هرجا که قبلاً از
// DAILY_CONVERSATIONS استفاده می‌شد (تبِ مکالمه، استخرِ جستجوی داستان‌ساز،
// نگاشتِ سطح‌بندیِ لغات)، مکالمات موضوعی هم به‌صورت خودکار دیده بشن.
const ALL_DAILY_CONVERSATIONS = [...DAILY_CONVERSATIONS, ...(THEMATIC_CONVERSATIONS || [])];
import RangeSliderFilter from "./RangeSliderFilter.jsx";
import { LINGOVA_CHARACTERS, LINGOVA_CHARACTER_KEYS } from "./LINGOVA_CHARACTERS.js";
import { isNativeTtsAvailable, isNativeTtsReady, refreshNativeTtsStatus } from "./nativeTts.js";
import { nativeSpeak, nativeStop, nativePrefetch, nativeWarm, nativeWarmAll, nativeSpeakSystem, isSystemTtsReady, refreshSystemTts } from "./nativeTtsFast.js";
import { isNativeAuthAvailable, nativeGoogleSignIn, setupNativeAuthListener } from "./nativeAuth.js";

// پیامِ فارسی/عربی وقتی اینترنت نیست یا پخشِ آنلاین شکست خورد: راهِ حل = مدلِ آفلاین
const TTS_NEED_MODEL_MSG = "اینترنت در دسترس نیست — مدل صدا را از تنظیمات دانلود کن تا بدون اینترنت هم بخواند";
function ttsFailMsg(code) {
  return code === "fa" || code === "ar"
    ? TTS_NEED_MODEL_MSG
    : "پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن";
}

// ---------------------------------------------------------------------------
// جستجوی یکپارچه‌ی «یا از دیکشنری جستجو کن...» توی داستان‌ساز — به‌جای
// این‌که فقط تو VOCAB (لیست محدودِ چندزبانه) بگرده، باید بتونه از تبِ
// «لغات» (WORDS_AZ)، «مکالمه و روزمره»
// (DAILY_WORDS) و «مکالمات روزمره» (DAILY_CONVERSATIONS) هم لغت/عبارت پیدا
// کنه. این آرایه‌های مسطح‌شده فقط یه‌بار موقع بارگذاریِ اپ ساخته می‌شن (نه
// هر رندرِ داستان‌ساز) تا جستجو سنگین نشه.
const STORY_SEARCH_WORD_POOL = [
  ...WORDS_AZ.map((w) => ({ term: w.en, fa: w.fa, source: "لغات" })),
  ...DAILY_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "مکالمه و روزمره" })),
  ...SLANG_WORDS.map((w) => ({ term: w.en, fa: w.fa, source: "اسلنگ" })),
];
// همه‌ی خط‌های دوطرفِ مکالمه‌های روزمره، مسطح‌شده به یه آرایه‌ی ساده — تا
// کاربر بتونه یه عبارتِ کاملِ یه مکالمه رو هم به‌عنوان لغتِ هدفِ داستان
// انتخاب کنه، نه فقط تک‌کلمه‌ها.
const STORY_SEARCH_CONVERSATION_POOL = ALL_DAILY_CONVERSATIONS.flatMap((tp) =>
  tp.scenarios.flatMap((sc) => [...(sc.speakerA || []), ...(sc.speakerB || [])])
).map((it) => ({ term: it.en, fa: it.fa || "", source: "مکالمات روزمره" }));

// «Vocabulary in Use» — دیتای واحدهای موضوعی (هرکدوم چند لغت + تمرین)، برای
// تبِ لغات مسطح می‌شه به یه آرایه‌ی ساده‌ی {id, en, fa, level, ...} با همون
// شکلی که WordList (تبِ لغات/لغات‌واخبار/اسلنگ) انتظار داره؛ id پایدار
// می‌سازیم (بر اساسِ شناسه‌ی واحد + ایندکس) تا ذخیره‌شدن/⭐/خوانده‌شدنِ هر
// لغت بینِ نشست‌ها ثابت بمونه.
// 🐛 باگِ اصلی: unit.level توی vocabularyInUseData.js فقط یه برچسبِ آزاد
// («intermediate») بود، ولی فیلترِ سطح توی UI (LevelFilterRow/WordList)
// دقیقاً با رشته‌های "A1".."C2" مقایسه می‌کرد (`words.filter(w => w.level
// === levelFilter)`) — پس هیچ‌وقت برابر نمی‌شدن و هر سطحی که می‌زدی خالی
// می‌موند. حالا خودِ ۱۰۰ واحدِ vocabularyInUseData.js با کدهای واقعیِ
// CEFR (بر اساسِ موضوع/سختیِ لغاتِ هر واحد: A1×14، A2×35، B1×41، B2×10)
// برچسب‌گذاری شدن — نه فقط یه نگاشتِ یکنواخت به B1. تابعِ زیر فقط یه
// شبکه‌ی ایمنیه: اگه یه‌جا هنوز برچسبِ آزادِ قدیمی (مثلِ «intermediate»)
// باقی مونده باشه تبدیلش می‌کنه، وگرنه کدِ CEFRِ خودِ دیتا رو دست‌نخورده
// برمی‌گردونه.
const VOCAB_IN_USE_LEVEL_TO_CEFR = {
  elementary: "A2",
  "pre-intermediate": "A2",
  preintermediate: "A2",
  intermediate: "B1",
  "upper-intermediate": "B2",
  upperintermediate: "B2",
  advanced: "C1",
  proficiency: "C2",
};
function normalizeVocabInUseLevel(rawLevel) {
  if (!rawLevel) return null;
  const key = String(rawLevel).trim().toLowerCase();
  // اگه از قبل خودش یه کدِ CEFR معتبره (مثلاً یه‌جا تویِ دیتا اصلاح شد و
  // مستقیم "B1" نوشتن)، همون رو دست‌نخورده برگردون.
  if (/^[abc][12]$/i.test(key)) return key.toUpperCase();
  return VOCAB_IN_USE_LEVEL_TO_CEFR[key] || null;
}
const VOCAB_IN_USE_WORDS = VOCAB_IN_USE_UNITS.flatMap((unit, ui) =>
  (unit.words || []).map((w, wi) => ({
    id: `viu-${unit.id || ui}-${wi}`,
    en: w.en,
    fa: w.fa,
    level: normalizeVocabInUseLevel(unit.level),
    example: w.example || "",
    collocation: w.collocation || "",
    category: unit.topicFa || unit.topic || "",
  }))
);

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

// ---------------------------------------------------------------------------
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
async function saveStoryAudioRecord(storyKey, record) {
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

async function getStoryAudioRecord(storyKey) {
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

async function deleteStoryAudioRecord(storyKey) {
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

// ============================================================
// پس‌زمینه‌ی سفارشیِ اپ (عکسِ دلخواهِ کاربر برای زمینه‌ی کلِ برنامه) —
// توی IndexedDB ذخیره می‌شه (نه localStorage)، چون می‌تونه چند مگابایت
// باشه؛ فقط رویِ همین گوشی/مرورگر می‌مونه، هیچ‌وقت به Supabase یا جایِ
// دیگه‌ای فرستاده نمی‌شه. یه رکوردِ تکی با کلیدِ ثابتِ "current" کافیه —
// آپلودِ بعدی همیشه جایگزینِ قبلی می‌شه.
// ============================================================
const CUSTOM_BG_DB_NAME = "app-custom-background";
const CUSTOM_BG_STORE = "bg";
const CUSTOM_BG_KEY = "current";
// فرمت‌هایِ عکسِ قابل‌قبول برایِ پس‌زمینه
const CUSTOM_BG_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

function openCustomBgDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const req = indexedDB.open(CUSTOM_BG_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_BG_STORE)) {
        db.createObjectStore(CUSTOM_BG_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// رکورد: { blob: Blob, type: string, savedAt: number }
async function saveCustomBackground(blob, type) {
  try {
    const db = await openCustomBgDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readwrite");
      tx.objectStore(CUSTOM_BG_STORE).put({ blob, type, savedAt: Date.now() }, CUSTOM_BG_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

async function getCustomBackground() {
  try {
    const db = await openCustomBgDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readonly");
      const req = tx.objectStore(CUSTOM_BG_STORE).get(CUSTOM_BG_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteCustomBackground() {
  try {
    const db = await openCustomBgDB();
    await new Promise((resolve) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readwrite");
      tx.objectStore(CUSTOM_BG_STORE).delete(CUSTOM_BG_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    return true;
  } catch {
    return false;
  }
}

// تبدیلِ رنگِ هگز (#RRGGBB) به rgba با شفافیتِ دلخواه — برای رو-همِ رنگِ
// تمِ فعال روی عکسِ پس‌زمینه، تا با هر میزان شفافیتی که کاربر انتخاب کنه
// متن‌های رویِ صفحه هنوز خوانا بمونن.
function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

async function savePdfViewMeta(meta) {
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

async function savePdfViewPage(docId, page) {
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
async function savePdfViewFile(docId, arrayBuffer) {
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

async function loadPdfViewFile(docId) {
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

async function listPdfViewDocs() {
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

async function loadPdfViewPages(docId, pageCount) {
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

async function deletePdfViewDoc(docId, pageCount) {
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
async function estimatePdfViewStorage() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== "number" || typeof quota !== "number" || !quota) return null;
    return { usageMB: Math.round(usage / (1024 * 1024)), quotaMB: Math.round(quota / (1024 * 1024)), pct: Math.round((usage / quota) * 100) };
  } catch {
    return null;
  }
}

// هوکِ مدیریتِ صوتِ کاربر برای یک داستانِ مشخص (storyKey پایدار — معمولاً
// mainStoryKey). یک <audio> واقعی رو کنترل می‌کنه — بدونِ هیچ محدودیتی
// رو فرمتِ فایل. هیچ هایلایت/خوانشِ خودکاری بر اساسِ زمانِ صدا انجام
// نمی‌شه؛ خطِ فعال فقط با دکمه‌های «جمله‌ی قبل/بعد» (که خودِ کاربر پایینِ
// پلیر می‌زنه) عوض می‌شه — یه شمارنده‌ی ساده (manualIndex) که کاملاً
// مستقل از currentTimeِ صداست.
// ============================================================
// ابزارِ SRT — کاربر یه فایلِ زیرنویسِ srt وارد می‌کنه، متنِ هر بلوک
// (بدونِ دست‌زدن به شماره/تایم‌کد) ترجمه می‌شه، و در نهایت یه فایلِ srt
// جدید (با همون تایم‌کدها ولی متنِ ترجمه‌شده) قابلِ دانلوده — تا کاربر
// خودش تو پلیرِ ویدیو/صوتِ خودش (بیرون از این اپ) بارش کنه.
// ============================================================
function parseSRT(raw) {
  const text = (raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/);
  const entries = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.length || l === "");
    if (!lines.length) continue;
    let idx = 0;
    let timeLineIdx = 0;
    // خطِ اول ممکنه شماره‌ی بلوک باشه (اختیاری در بعضی فایل‌ها)
    if (/^\d+$/.test(lines[0].trim())) {
      idx = parseInt(lines[0].trim(), 10);
      timeLineIdx = 1;
    }
    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes("-->")) continue;
    const [start, end] = timeLine.split("-->").map((s) => s.trim());
    const textLines = lines.slice(timeLineIdx + 1);
    entries.push({
      index: idx || entries.length + 1,
      start,
      end,
      text: textLines.join("\n"),
    });
  }
  return entries;
}

function serializeSRT(entries) {
  return entries
    .map((e, i) => `${i + 1}\n${e.start} --> ${e.end}\n${e.text}\n`)
    .join("\n");
}

// کامپوننتِ ابزارِ SRT — کاملاً مستقل از داستانِ فعلی؛ فقط داخلِ تبِ
// داستان‌ساز به‌عنوانِ یه پنلِ جمع‌شدنی نشون داده می‌شه.
function SrtTranslatorTool({ nativeLang, targetOrder, aiSettings, uiLang }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [entries, setEntries] = useState([]); // [{index,start,end,text}]
  const [translatedEntries, setTranslatedEntries] = useState(null);
  const [targetLang, setTargetLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cancelRef = useRef(false);

  const langOptions = LANGUAGES;

  function handleFile(file) {
    if (!file) return;
    setError("");
    setTranslatedEntries(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSRT(String(reader.result || ""));
        if (!parsed.length) {
          setError(tr("srtToolErrEmptyFile", uiLang));
          setEntries([]);
          return;
        }
        setEntries(parsed);
      } catch {
        setError(tr("srtToolErrParse", uiLang));
        setEntries([]);
      }
    };
    reader.onerror = () => setError(tr("srtToolErrRead", uiLang));
    reader.readAsText(file);
  }

  async function translateAll() {
    if (!entries.length) return;
    setTranslating(true);
    setError("");
    cancelRef.current = false;
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      if (cancelRef.current) break;
      const e = entries[i];
      const plain = (e.text || "").replace(/\n/g, " ").trim();
      let translated = plain;
      try {
        translated = plain ? await translateFree(plain, targetLang, "auto", aiSettings) : "";
      } catch {
        translated = plain; // اگه ترجمه‌ی یه خط شکست خورد، متنِ اصلی نگه داشته می‌شه (بهتر از خالی)
      }
      out.push({ ...e, text: translated || plain });
      setProgress({ done: i + 1, total: entries.length });
    }
    setTranslatedEntries(out);
    setTranslating(false);
  }

  function cancelTranslate() {
    cancelRef.current = true;
    setTranslating(false);
  }

  function download() {
    if (!translatedEntries) return;
    const base = fileName.replace(/\.srt$/i, "") || "subtitles";
    downloadTextFile(`${base}.${targetLang}.srt`, serializeSRT(translatedEntries), "text/plain;charset=utf-8");
  }

  const boxStyle = {
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 14,
    backgroundColor: colors.cardBg || "white",
  };

  return (
    <div style={boxStyle}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("srtToolTitle", uiLang)}</span>
        {open ? <ChevronUp size={18} color={colors.inkSoft} /> : <ChevronDown size={18} color={colors.inkSoft} />}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 8, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>
            {tr("srtToolDesc", uiLang)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
            >
              {tr("srtToolChooseFile", uiLang)}
            </button>
            {fileName && <span style={{ fontSize: 12, color: colors.inkSoft, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{fileName} ({trf("srtToolLinesCount", uiLang, { n: uiLang === "en" ? entries.length : toFaDigits(String(entries.length)) })})</span>}
          </div>

          {entries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
              <select
                value={targetLang}
                onChange={(e) => { setTargetLang(e.target.value); setTranslatedEntries(null); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
              >
                {langOptions.map((l) => (
                  <option key={l.code} value={l.code}>{uiLang === "en" ? englishLangName(l.code) : l.label}</option>
                ))}
              </select>

              {!translating ? (
                <button
                  onClick={translateAll}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.teal, color: "white", fontWeight: 600, fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {tr("srtToolTranslate", uiLang)}
                </button>
              ) : (
                <button
                  onClick={cancelTranslate}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.rose, color: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {trf("srtToolStop", uiLang, { done: uiLang === "en" ? progress.done : toFaDigits(String(progress.done)), total: uiLang === "en" ? progress.total : toFaDigits(String(progress.total)) })}
                </button>
              )}

              {translatedEntries && !translating && (
                <button
                  onClick={download}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${colors.teal}`, color: colors.teal, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {tr("srtToolDownload", uiLang)}
                </button>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: colors.rose, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function useStoryUserAudio(storyKey, allSentences) {
  const audioElRef = useRef(null);
  if (!audioElRef.current && typeof Audio !== "undefined") {
    audioElRef.current = new Audio();
  }
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [manualIndex, setManualIndex] = useState(0); // اشاره‌گرِ دستیِ خط، فقط با دکمه‌ی قبل/بعد عوض می‌شه
  // نسخه‌ی ref از manualIndex — برای اینکه nextLine/prevLine بتونن مقدارِ
  // همیشه‌به‌روز رو بی‌نیاز از فرمِ تابعیِ setManualIndex بخونن.
  const manualIndexRef = useRef(0);
  useEffect(() => {
    manualIndexRef.current = manualIndex;
  }, [manualIndex]);
  // ⚠️ قبلاً اینجا یه سیستمِ «سینکِ خودکار» بود: با زدنِ دکمه‌ی جمله‌ی
  // بعد/قبل حینِ گوش‌دادن، زمانِ دقیقِ شروعِ هر جمله ثبت می‌شد و حینِ پخش،
  // هایلایت به‌طور خودکار (با پیدا کردنِ نزدیک‌ترین جمله‌ی سینک‌شده به
  // ثانیه‌ی فعلی) جلو می‌رفت. این سیستم کاملاً حذف شد — چون قابلِ‌اعتماد
  // نبود (با آپلودِ فایلِ جدید یا سینک‌های ناقص/نامنظم، هایلایت به‌طور
  // ناخواسته به جمله‌های غلط/قبلی می‌پرید و با اسکرولِ دستیِ کاربر می‌جنگید).
  // حالا هایلایت/جابه‌جایی توی صوتِ آپلودی *فقط* با اقدامِ صریحِ کاربر عوض
  // می‌شه: دکمه‌ی جمله‌ی بعد/قبل، تپ‌کردنِ مستقیم روی یه جمله، یا ری‌استارت.
  const lastAutoIdxRef = useRef(0);
  // سرعتِ پخشِ صوتِ آپلودیِ کاربر — مستقل از سرعتِ TTS (که سراسری و
  // مخصوصِ speechController است). یه پیش‌فرضِ سراسری (نه مخصوصِ هر داستان)
  // در localStorage نگه داشته می‌شه — دقیقاً همون الگویِ phrasebook-tts-rate.
  const [rate, setRateState] = useState(() => {
    const r = Number(window.localStorage?.getItem("phrasebook-user-audio-rate"));
    return r >= 0.5 && r <= 2 ? r : 1;
  });
  const rateRef = useRef(rate);
  // وضعیتِ ذخیره‌سازیِ فایلِ آپلودی — تا وقتی روی IndexedDB نوشته می‌شه
  // (که برایِ فایل‌های صوتیِ حجیم/طولانی ممکنه یه لحظه طول بکشه)، دکمه‌ی
  // آپلود باید غیرفعال/در حالِ بارگذاری نشون داده بشه، وگرنه کاربر حسِ
  // «هنگ‌کردن» می‌کنه چون هیچ فیدبکی نمی‌بینه.
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioSaveError, setAudioSaveError] = useState("");
  const objectUrlRef = useRef(null);
  // آخرین currentTime‌ای که واقعاً به state گزارش شده — برای throttleِ زیر.
  const lastReportedTimeRef = useRef(0);
  // چندبار، بعدِ اولین پخش، صوتِ آپلودی رو دوباره از اول تکرار کرده‌ایم —
  // برای اینکه دکمه‌ی «تکرارِ سراسری» (که تا قبل از این فقط رویِ TTS اثر
  // داشت) رویِ صوتِ آپلودیِ کاربر هم کار کنه. با هر پخشِ تازه (play()) یا
  // عوض‌شدنِ داستان صفر می‌شه.
  const repeatsDoneRef = useRef(0);
  // --- تکرارِ A-B رویِ صوتِ آپلودیِ کاربر --------------------------------
  // برخلافِ TTS (که چانک/جمله‌ایه)، اینجا صوت پیوسته‌ست، پس A و B دقیقاً
  // زمان (currentTime، به‌ثانیه) هستن — دقیقاً همون مکانیزمی که توی
  // پروتوتایپِ HTML تست شد. abState: "idle" -> "waitingB" -> "looping".
  // Ref هم نگه می‌داریم چون onTime پایین‌تر داخلِ یه useEffect با
  // dependency آرایِ خالیه و به مقدارِ همیشه‌به‌روزِ state دسترسی نداره.
  const [abState, setAbState] = useState("idle");
  const [abA, setAbA] = useState(null);
  const [abB, setAbB] = useState(null);
  const abStateRef = useRef("idle");
  const abARef = useRef(null);
  const abBRef = useRef(null);

  function markAB() {
    const t = audioElRef.current?.currentTime ?? 0;
    if (abStateRef.current === "idle") {
      abARef.current = t;
      abStateRef.current = "waitingB";
      setAbA(t);
      setAbState("waitingB");
    } else if (abStateRef.current === "waitingB") {
      let a = abARef.current, b = t;
      if (b <= a) { b = a; a = t; }
      abARef.current = a;
      abBRef.current = b;
      abStateRef.current = "looping";
      setAbA(a);
      setAbB(b);
      setAbState("looping");
    } else {
      abARef.current = null;
      abBRef.current = null;
      abStateRef.current = "idle";
      setAbA(null);
      setAbB(null);
      setAbState("idle");
    }
  }
  function clearAB() {
    abARef.current = null;
    abBRef.current = null;
    abStateRef.current = "idle";
    setAbA(null);
    setAbB(null);
    setAbState("idle");
  }

  // با هر تغییرِ سرعت، هم رویِ خودِ <audio> اعمالش می‌کنیم (برای همینِ الان،
  // بدونِ صبر برایِ بارگذاریِ بعدی)، هم rateRef رو به‌روز نگه می‌داریم (برایِ
  // onDur پایین‌تر که داخلِ یه useEffectِ بدونِ dependency صدا زده می‌شه و
  // به مقدارِ همیشه‌به‌روزِ state دسترسی نداره)، هم در localStorage ذخیره‌ش
  // می‌کنیم تا دفعه‌ی بعد هم همین سرعت پیش‌فرض باشه.
  useEffect(() => {
    rateRef.current = rate;
    if (audioElRef.current) audioElRef.current.playbackRate = rate;
    try {
      window.localStorage.setItem("phrasebook-user-audio-rate", String(rate));
    } catch {}
  }, [rate]);
  function setRate(r) {
    setRateState(Math.min(Math.max(Number(r) || 1, 0.5), 2));
  }

  // بارگذاریِ اولیه از IndexedDB وقتی storyKey عوض می‌شه
  useEffect(() => {
    let cancelled = false;
    setHasAudio(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setManualIndex(0);
    setAudioSaveError("");
    lastReportedTimeRef.current = 0;
    lastAutoIdxRef.current = 0;
    repeatsDoneRef.current = 0;
    clearFocusResumeTimer();
    abARef.current = null;
    abBRef.current = null;
    abStateRef.current = "idle";
    setAbA(null);
    setAbB(null);
    setAbState("idle");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!storyKey) return;
    (async () => {
      const rec = await getStoryAudioRecord(storyKey);
      if (cancelled) return;
      if (!rec) return;
      const url = URL.createObjectURL(rec.blob);
      objectUrlRef.current = url;
      if (audioElRef.current) audioElRef.current.src = url;
      setHasAudio(true);
    })();
    return () => { cancelled = true; };
  }, [storyKey]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    // نکته‌ی مهمِ کارایی: این هوک داخلِ StoryBuilder صدا زده می‌شه — یعنی
    // کامپوننتی که کلِ متنِ داستان (پاراگراف‌ها، جمله‌های قابل‌کلیک) رو هم
    // رندر می‌کنه؛ و هر تغییرِ این state از طریقِ onUserAudioStateChange به
    // PhrasebookMain (بالاترین سطح) هم گزارش می‌شه، پس عملاً کلِ اپ رو
    // دوباره رندر می‌کنه. رویدادِ «timeupdate» مرورگرها رو معمولاً چندین‌بار
    // در ثانیه صدا می‌زنن؛ اگه هر بار state رو آپدیت کنیم، این رندرهای
    // زنجیره‌ای هم چندین‌بار در ثانیه تکرار می‌شن — دقیقاً همون چیزی که با
    // داستان‌های طولانی (که هر رندرشون خودش سنگینه) باعثِ کند/هنگ‌شدنِ
    // محسوس می‌شه (و چون همون رندرِ سراسری، تایمرِ رندرِ آدمکِ لینگوا رو هم
    // تحتِ‌فشار می‌ذاره، باعثِ در‌جا‌زدنِ آدمک هم می‌شه). برای همین،
    // currentTime رو فقط وقتی به state می‌بریم که حداقل یک ثانیه از آخرین
    // آپدیت گذشته باشه — برایِ نوارِ پیشرفت/نمایشِ زمان کاملاً کافیه، ولی
    // تعدادِ رندرها رو به‌شدت کم می‌کنه. (تکمیلِ این فیکس: LingovaMascot و
    // GrammarPanel هم جداگانه با React.memo از این رندرهای زنجیره‌ای معاف
    // شدن.)
    const onTime = () => {
      const t = el.currentTime || 0;
      // مکانیزمِ تکرارِ A-B: وقتی هر دو نقطه ثبت شده باشن، محدوده رو
      // نمی‌ذاریم رد بشه — دقیقاً همون چک‌کردنِ ساده‌ی «رسیدیم به B یا از
      // A عقب‌تریم» که توی پروتوتایپ جواب داد.
      if (abStateRef.current === "looping" && abARef.current !== null && abBRef.current !== null) {
        if (t >= abBRef.current || t < abARef.current - 0.05) {
          el.currentTime = abARef.current;
          return;
        }
      }
      // ⚠️ قبلاً اینجا یه پیگیریِ خودکارِ هایلایت بود (بر اساسِ timestampِ
      // سینک‌شده) که حذف شد — هایلایت/manualIndex فقط با اقدامِ صریحِ
      // کاربر (دکمه‌ی جمله‌ی بعد/قبل، تپ‌کردنِ روی یه جمله، ری‌استارت) عوض
      // می‌شه، نه خودکار حینِ پخش.
      if (Math.abs(t - lastReportedTimeRef.current) >= 1) {
        lastReportedTimeRef.current = t;
        setCurrentTime(t);
      }
    };
    // بعدِ توقف/پایان/جابه‌جاییِ دستیِ نوار، همیشه دقیق‌ترین زمان رو فوراً
    // نشون بده (بدونِ صبر برایِ آستانه‌ی نیم‌ثانیه‌ایِ بالا) — وگرنه بعدِ
    // pause، نوارِ پیشرفت ممکنه تا نیم‌ثانیه عقب‌تر از جاییِ واقعیِ توقف بمونه.
    const syncTimeNow = () => {
      const t = el.currentTime || 0;
      lastReportedTimeRef.current = t;
      setCurrentTime(t);
    };
    const onDur = () => { setDuration(el.duration || 0); el.playbackRate = rateRef.current; };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => { setIsPlaying(false); syncTimeNow(); };
    // دکمه‌ی «تکرارِ سراسری» (RepeatButton) یه تنظیمِ مشترک روی
    // speechController نگه می‌داره که قبلاً فقط رویِ پخشِ TTS اثر داشت؛
    // همون تنظیم رو اینجا هم می‌خونیم تا با تمومِ‌شدنِ صوتِ آپلودیِ کاربر،
    // اگه تکرار روشن باشه، دوباره از اول پخش بشه — دقیقاً همون رفتاری که
    // کاربر از زدنِ دکمه‌ی تکرار انتظار داره.
    const onEnd = () => {
      const rs = speechController.getState().globalRepeatSetting;
      const remaining = rs === "inf" ? Infinity : Math.max(0, (Number(rs) || 0) - 1);
      if (remaining > repeatsDoneRef.current && audioElRef.current) {
        repeatsDoneRef.current += 1;
        audioElRef.current.currentTime = 0;
        audioElRef.current.play().catch(() => {});
        return;
      }
      setIsPlaying(false);
      syncTimeNow();
    };
    const onSeeked = () => syncTimeNow();
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onDur);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("seeked", onSeeked);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("seeked", onSeeked);
      clearFocusResumeTimer();
    };
  }, []);

  async function uploadFile(file) {
    if (!storyKey || !file) return;
    setAudioSaveError("");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    if (audioElRef.current) {
      audioElRef.current.src = url;
      audioElRef.current.load();
    }
    setManualIndex(0);
    lastAutoIdxRef.current = 0;
    setHasAudio(true);
    clearAB();
    // نوشتنِ خودِ فایل روی IndexedDB (که برایِ فایل‌های صوتیِ حجیم ممکنه
    // چندصدمیلی‌ثانیه طول بکشه) رو به‌عنوانِ «در حالِ ذخیره» علامت می‌زنیم
    // تا دکمه‌ی آپلود در همون لحظه غیرفعال/چرخان بشه — کاربر می‌فهمه داره
    // کاری انجام می‌شه، به‌جای اینکه حس کنه برنامه هنگ کرده. اگه ذخیره
    // شکست بخوره (مثلاً حجمِ فایل بیشتر از ظرفیتِ مجازِ مرورگر بود)، خطا
    // رو نشون می‌دیم — قبلاً این خطا کاملاً بی‌صدا بلعیده می‌شد و کاربر
    // فکر می‌کرد صداش ذخیره شده، ولی با رفرشِ بعدی گم می‌شد.
    setAudioSaving(true);
    try {
      const ok = await saveStoryAudioRecord(storyKey, { blob: file, savedAt: Date.now() });
      if (!ok) setAudioSaveError("ذخیره‌ی این فایلِ صوتی ناموفق بود — شاید حجمش زیاد بود؛ فایلِ کوچیک‌تری امتحان کن");
    } finally {
      setAudioSaving(false);
    }
  }

  // «مکث برای فوکوسِ پاپ‌آپِ لغت» — دقیقاً هم‌معنیِ speechController.pauseForFocus
  // ولی برایِ صوتِ آپلودیِ خودِ کاربر: وقتی این صوت داره پخش می‌شه و کاربر
  // روی یه لغت/محدوده از متنِ داستان لمسِ طولانی می‌کنه (پاپ‌آپِ معنی باز
  // می‌شه)، پخش فوراً مکث می‌شه؛ بعد از سه ثانیه (اگه خودِ کاربر تا اون‌موقع
  // چیزی رو دستی پخش/مکث نکرده باشه) خودکار از همون نقطه ادامه پیدا می‌کنه.
  const focusResumeTimerRef = useRef(null);
  function clearFocusResumeTimer() {
    if (focusResumeTimerRef.current) {
      clearTimeout(focusResumeTimerRef.current);
      focusResumeTimerRef.current = null;
    }
  }
  function pauseForFocus() {
    const el = audioElRef.current;
    if (!el || el.paused) return false;
    clearFocusResumeTimer();
    el.pause();
    focusResumeTimerRef.current = setTimeout(() => {
      focusResumeTimerRef.current = null;
      audioElRef.current?.play().catch(() => {});
    }, 3000);
    return true;
  }
  // پخشِ دستی/تازه (با زدنِ دکمه‌ی پخش) همیشه شمارشگرِ تکرار رو صفر می‌کنه —
  // وگرنه اگه کاربر وسطِ یه چرخه‌ی تکرار دستی pause/play بزنه، شمارشِ
  // تکرارهای قبلی باقی می‌موند و زودتر از موعد قطع می‌شد. هر اقدامِ دستیِ
  // play/pause/seek همچنین تایمرِ خودکارِ «ادامه بعد از سه ثانیه»یِ بالا رو
  // لغو می‌کنه — وگرنه ممکنه چند صدمِ‌ثانیه بعد از یه pause دستیِ کاربر،
  // پخش خودش‌به‌خود (و ناخواسته) دوباره شروع بشه.
  function play() { clearFocusResumeTimer(); repeatsDoneRef.current = 0; audioElRef.current?.play().catch(() => {}); }
  function pause() { clearFocusResumeTimer(); audioElRef.current?.pause(); }
  function seek(t) { clearFocusResumeTimer(); if (audioElRef.current) audioElRef.current.currentTime = t; }

  // دکمه‌ی جمله‌ی بعد/قبل: فقط اشاره‌گرِ دستیِ هایلایت رو جابه‌جا می‌کنه —
  // دیگه هیچ زمانی ثبت/سینک نمی‌شه (سیستمِ سینکِ خودکار کاملاً حذف شد).
  function nextLine() {
    const next = Math.min(manualIndexRef.current + 1, Math.max((allSentences?.length || 1) - 1, 0));
    manualIndexRef.current = next;
    lastAutoIdxRef.current = next;
    setManualIndex(next);
  }
  function prevLine() {
    const prevIdx = Math.max(manualIndexRef.current - 1, 0);
    manualIndexRef.current = prevIdx;
    lastAutoIdxRef.current = prevIdx;
    setManualIndex(prevIdx);
  }
  // دکمه‌ی «رفرش/شروع مجدد» برایِ صوتِ آپلودی — دقیقاً هم‌معنیِ نسخه‌ی TTS
  // (RestartButton بالاتر): فقط برمی‌گردونه به ابتدایِ فایل و هایلایتِ خطِ
  // فعال رو ریست می‌کنه به خطِ اول؛ به وضعیتِ در حالِ پخش/مکث‌بودن دست
  // نمی‌زنه — اگه در حالِ پخش بود، از همون لحظه از نو ادامه پیدا می‌کنه؛
  // اگه مکث بود، مکث‌شده می‌مونه ولی رویِ ثانیه‌ی صفر.
  function restart() {
    manualIndexRef.current = 0;
    lastAutoIdxRef.current = 0;
    setManualIndex(0);
    if (audioElRef.current) audioElRef.current.currentTime = 0;
  }

  // پرشِ مستقیمِ هایلایت به یه (pi, si) مشخص — وقتی کاربر خودش مستقیماً
  // روی جمله/آیکونِ پخشِ کنارِ همون جمله تپ می‌کنه، نه با دکمه‌ی جمله‌ی
  // بعد/قبل. برخلافِ nextLine/prevLine، اینجا هیچ timestampی ثبت نمی‌شه —
  // چون زمانِ دقیقِ این جهش (سینک‌شده یا فقط تخمینِ نسبی) بیرون از این
  // هوک محاسبه می‌شه و ثبتش به‌عنوانِ «سینک‌شده» می‌تونست یه تخمینِ ناقص رو
  // به‌جایِ سینکِ واقعیِ بعدی جا بزنه.
  function setActiveLine(pi, si) {
    if (pi == null || si == null || !allSentences || !allSentences.length) return;
    let idx = -1;
    for (let i = 0; i < allSentences.length; i++) {
      const s = allSentences[i];
      if (s && s._pi === pi && s._si === si) { idx = i; break; }
    }
    if (idx === -1) return;
    manualIndexRef.current = idx;
    lastAutoIdxRef.current = idx;
    setManualIndex(idx);
  }

  async function removeAudio() {
    pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    if (audioElRef.current) audioElRef.current.removeAttribute("src");
    setHasAudio(false);
    setManualIndex(0);
    lastAutoIdxRef.current = 0;
    setAudioSaveError("");
    if (storyKey) await deleteStoryAudioRecord(storyKey);
  }

  // خطِ فعال، فقط از روی manualIndex — هیچ ربطی به currentTime نداره.
  const activeSentence = useMemo(() => {
    if (!allSentences || !allSentences.length) return null;
    const s = allSentences[Math.min(manualIndex, allSentences.length - 1)];
    return s ? { pi: s._pi, si: s._si } : null;
  }, [allSentences, manualIndex]);

  // دسترسیِ مستقیم به المانِ <audio> — لازم برایِ «ضبطِ صدایِ من +
  // صدایِ اپ باهم» (MyVoiceRecorder): وقتی این فایلِ صوتیِ آپلودی داره
  // پخش می‌شه، با captureStream() یه کپی از خروجیِ صداش گرفته و با
  // میکروفون میکس می‌شه — بدونِ اینکه رویِ پخشِ عادیِ خودش (که از
  // بلندگو شنیده می‌شه) اثری بذاره.
  function getAudioElement() {
    return audioElRef.current;
  }

  return {
    hasAudio,
    isPlaying,
    currentTime,
    duration,
    manualIndex,
    rate,
    setRate,
    activeSentence,
    audioSaving,
    audioSaveError,
    uploadFile,
    play,
    pause,
    pauseForFocus,
    seek,
    nextLine,
    prevLine,
    restart,
    setActiveLine,
    removeAudio,
    abState,
    abA,
    abB,
    markAB,
    clearAB,
    getAudioElement,
  };
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

// همه‌ی ترجمه‌های کش‌شده‌ی یک زبانِ مقصد خاص (مثلاً «هر جمله‌ای که قبلاً به
// آلمانی ترجمه و کش شده») رو یک‌جا، با یه اسکنِ Cursor، برمی‌گردونه — به
// شکلِ Map از «متنِ اصلی» به «ترجمه». برخلافِ getCachedTranslation (که فقط
// یه متنِ مشخص رو چک می‌کنه)، این یکی برای جستجو لازمه: تبِ مکالماتِ
// روزمره صدها خط داره که ترجمه‌شون به هر زبونی غیر از فارسی، فقط وقتی
// کاربر واقعاً اون سناریو رو باز کرده لحظه‌ای گرفته و همینجا (IndexedDB)
// کش شده؛ پس برای اینکه جستجو بتونه رویِ همون ترجمه‌های قبلاً کش‌شده هم
// جواب بده (بدونِ درخواستِ شبکه‌ی تازه برای هزاران خط)، یه‌بار کلِ کش رو
// برای همون زبان می‌خونیم و محلی فیلتر می‌کنیم.
async function getCachedTranslationMap(targetLang, sourceLang = "en") {
  const map = new Map();
  try {
    const db = await openTranslationDB();
    return await new Promise((resolve) => {
      const prefix = `${sourceLang || "auto"}::${targetLang}::`;
      const tx = db.transaction(TRANSLATION_STORE, "readonly");
      const req = tx.objectStore(TRANSLATION_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(map); return; }
        const key = cursor.key;
        if (typeof key === "string" && key.startsWith(prefix)) {
          map.set(key.slice(prefix.length), cursor.value);
        }
        cursor.continue();
      };
      req.onerror = () => resolve(map);
    });
  } catch {
    return map;
  }
}

// ============================================================
// ترجمه رایگان با چند سرویس پشت‌سرهم (بدون نیاز به کلید API)
// اگه سرویس اول جواب نده یا خطا بده، خودکار میره سراغ سرویس بعدی.
// ترتیب: Google Translate (بدون‌رسمی) → MyMemory → Lingva (پروکسی گوگل) → LibreTranslate
// ============================================================

// ۱) Google Translate — همون endpoint قدیمی و رایگان
// درخواست‌های شبکه با یه timeout کوتاه — اگه یه سرویس (مثلاً به‌خاطر
// فیلترینگ/بلاک‌بودن توی شبکه‌ی کاربر) فوراً جواب رد نکنه، به‌جای معطل
// موندنِ چندده‌ثانیه‌ای، سریع شکست می‌خوریم و می‌ریم سراغ سرویس بعدی —
// این دقیقاً همون چیزیه که با اضافه‌شدنِ continue برای رد کردنِ نتایج
// مشکوک (که حالا ممکنه به سرویس‌های بیشتری سر بزنه) لازم شده.
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function translateViaGoogle(text, targetLang, sourceLang = "auto") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetchWithTimeout(url);
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
  const response = await fetchWithTimeout(url);
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
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("lingva-http-" + response.status);
  const data = await response.json();
  if (!data?.translation) throw new Error("lingva-empty-response");
  return data.translation;
}

// ۴) LibreTranslate — سرویس متن‌باز رایگان (نمونه‌ی عمومی)
async function translateViaLibre(text, targetLang, sourceLang = "auto") {
  const response = await fetchWithTimeout("https://libretranslate.de/translate", {
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
  // نامِ انگلیسیِ زبون، نه برچسبِ فارسی — همون دلیلِ askGrammarTeacher
  // بالاتر: قاطی‌کردنِ کلمه‌ی فارسی وسطِ پرامپتِ انگلیسی باعث می‌شه
  // مدل‌های سریع/رایگان بعضی‌وقت‌ها درست تشخیص ندن.
  const targetLabel = englishLangName(targetLang);
  const prompt =
    `Translate the following text into ${targetLabel}. ` +
    `Respond with ONLY the translation itself — no quotes, no explanation, no original text, nothing else.\n\n` +
    `Text: ${text}`;
  const result = await callAI({ prompt, maxTokens: 200, retries: 1, aiSettings });
  const cleaned = String(result || "").replace(/^["'«»]+|["'«».\s]+$/g, "").trim();
  if (!cleaned) throw new Error("translate-ai-empty-response");
  return cleaned;
}

// ============================================================
// 🔎 لایه‌ی سبکِ کنترل‌کیفیت — قبل از اینکه یه ترجمه‌ی خام (از گوگل/
// MyMemory/Lingva/Libre) برای همیشه کش بشه، چند تست رایگان و آنی (بدون
// شبکه، بدون AI) روش اجرا می‌کنیم. فقط اگه یکی از این‌ها مشکوک بود، سراغ
// AI برای اصلاح می‌ریم — نه برای هر ترجمه‌ای. و چون نتیجه (تأییدشده یا
// اصلاح‌شده) برای همیشه تو IndexedDB کش می‌مونه، این هزینه‌ی AI برای هر
// جفتِ متن/زبان فقط "یک‌بار در کل عمر اپ" اتفاق می‌افته؛ دفعه‌های بعد که
// همون متن دوباره لازم بشه (حتی برای کاربرهای دیگه‌ی همین دستگاه) مستقیم
// از کش می‌آد، بدون هیچ توکنی.
// ============================================================
function scriptRangeFor(langCode) {
  // بازه‌ی یونیکدِ رسم‌الخطِ اصلیِ هر زبون — برای تشخیصِ «اصلاً ترجمه نشده»
  // (مثلاً گوگل به‌جای فارسی، همون متنِ انگلیسی رو برگردونده).
  switch (langCode) {
    case "fa":
    case "ar":
      return /[\u0600-\u06FF]/;
    case "ru":
      return /[\u0400-\u04FF]/;
    case "zh":
      return /[\u4E00-\u9FFF]/;
    case "ja":
      return /[\u3040-\u30FF\u4E00-\u9FFF]/;
    case "ko":
      return /[\uAC00-\uD7AF]/;
    default:
      // بقیه (en/es/fr/tr و ...) لاتین مشترکن — این چک برای اون‌ها بی‌فایده‌ست
      return null;
  }
}

function looksLikelyMistranslated(sourceText, draft, targetLang, sourceLang) {
  const src = (sourceText || "").trim();
  const out = (draft || "").trim();
  if (!out) return true;
  // زبان مبدا و مقصد فرق دارن ولی خروجی عیناً همون متن مبدأست — یعنی ترجمه نشده
  if (sourceLang && sourceLang !== "auto" && sourceLang !== targetLang && out.toLowerCase() === src.toLowerCase())
    return true;
  // رسم‌الخطِ زبونِ مقصد مشخصه (فارسی/عربی/روسی/چینی/...) ولی هیچ اثری ازش تو خروجی نیست
  const re = scriptRangeFor(targetLang);
  if (re && src.length > 1 && !re.test(out)) return true;
  // نسبتِ طولِ غیرعادی نسبت به متن مبدأ (خیلی کوتاه‌تر یا خیلی بلندتر)
  const ratio = out.length / Math.max(src.length, 1);
  if (src.length > 3 && (ratio < 0.25 || ratio > 3.5)) return true;
  return false;
}

// فقط وقتی looksLikelyMistranslated چراغ قرمز داده، این تابع صدا زده می‌شه:
// یه پرامپت خیلی کوتاه به بک‌اند AI (که خودش اول از Groq — سریع‌ترین حلقه‌ی
// زنجیره — استفاده می‌کنه) می‌فرستیم تا یا تأیید کنه یا خودش ترجمه‌ی درست رو
// بده. maxTokens پایین + بدون retry اضافه، برای اینکه هم سریع باشه هم کم‌توکن.
async function verifyTranslationWithAI(sourceText, targetLang, draft, aiSettings) {
  if (!aiSettings) return draft;
  try {
    const targetLabel = englishLangName(targetLang);
    const prompt =
      `Source text: "${sourceText}"\n` +
      `Draft translation into ${targetLabel}: "${draft}"\n\n` +
      `Is the draft an accurate, complete translation? If yes, reply with EXACTLY: OK\n` +
      `If no, reply with ONLY the corrected translation — no quotes, no explanation, nothing else.`;
    const result = await callAI({ prompt, maxTokens: 80, retries: 0, aiSettings });
    const cleaned = String(result || "").trim();
    if (!cleaned || /^OK\.?$/i.test(cleaned)) return draft;
    return cleaned.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || draft;
  } catch (e) {
    // بررسی با AI شکست خورد (مثلاً بک‌اند در دسترس نبود) — همون ترجمه‌ی
    // خامِ سرویس‌های رایگان رو نگه می‌داریم، بهتر از هیچی یا کرش کردنه.
    return draft;
  }
}

// تابع اصلی: هر سرویس رو به‌ترتیب امتحان می‌کنه، به محض موفقیت نتیجه رو برمی‌گردونه.
// اگه همه شکست خوردن، متن اصلی بدون تغییر برگردونده می‌شه (تا برنامه از کار نیفته).
// forceVerify=true یعنی «حتی اگه هیچ‌کدوم از تست‌های رایگان مشکوک نبودن هم
// بازم AI بررسیش کنه» — چون تست‌های رایگان فقط رسم‌الخطِ اشتباه/ترجمه‌نشده رو
// می‌گیرن، نه اشتباهِ معنایی‌ای که مثلاً بینِ دو زبونِ هم‌رسم‌الخط (en↔es/fr/tr)
// پیش میاد. برای همچین مواردی، جایی که کیفیت خیلی مهمه (مثل جمله‌های خودِ
// داستان) این پرچم true پاس داده می‌شه؛ برای موارد پرتکرار/کم‌اهمیت‌تر (تک‌لغت‌ها)
// همون کنترل‌کیفیتِ رایگان کافیه تا مصرفِ توکن بی‌جهت زیاد نشه.
//
// ⛔️ رفعِ باگِ «در حال ترجمه...» که هیچ‌وقت تموم نمی‌شد: قبلاً هیچ سقفِ
// زمانیِ کلی روی کل زنجیره (۴ سرویسِ رایگان + fallback به بک‌اندِ AI) نبود؛
// اگه شبکه‌ی کاربر همه‌ی این‌ها رو (یا لااقل بک‌اند رو، که fetch()ـش هم اصلاً
// timeout نداشت) بی‌صدا بلاک می‌کرد، Promise تا ابد آویزون می‌موند. حالا یه
// سقفِ کلیِ TRANSLATE_HARD_TIMEOUT_MS با Promise.race تضمین می‌کنه که کاربر
// حداکثر همین‌قدر منتظر بمونه؛ اگه تا اون‌موقع هیچ سرویسی جواب نداده باشه،
// موقتاً متنِ اصلی نشون داده می‌شه (نه هیچی) و کارِ شبکه‌ای در پس‌زمینه
// همچنان ادامه پیدا می‌کنه تا دفعه‌ی بعد از کش بیاد.
//
// 🚦 صفِ سراسریِ هم‌زمانی: همه‌ی محل‌های اپ (پاپ‌آپِ کلمه، مرورِ Leitner،
// جمله‌های داستان، و ...) هرکدوم جدا translateFree صدا می‌زدن — اگه چندتاشون
// هم‌زمان اجرا بشن (مثلاً بازکردنِ یه داستانِ بلند + مرورِ لغات هم‌زمان)،
// می‌تونست ده‌ها درخواستِ هم‌زمان به سرویس‌های رایگان/بک‌اندِ AI بفرسته —
// دقیقاً همون چیزی که با زیادشدنِ کاربرها بدتر می‌شه (سهمیه‌ی Groq/بک‌اند
// بینِ همه مشترکه). حالا فقط GLOBAL_TRANSLATE_CONCURRENCY تا درخواستِ
// واقعیِ شبکه‌ای، در کلِ اپ (نه فقط داخلِ یه افکت)، هم‌زمان اجرا می‌شه؛
// بقیه صف می‌کِشن.
// از ۳ به ۶ افزایش پیدا کرد تا صفِ درخواست‌ها (مخصوصاً موقعِ اضافه‌کردنِ یه
// زبانِ مقصدِ تازه رویِ یه لیستِ ۶۰تایی) سریع‌تر خالی بشه و احتمالِ رسیدنِ
// یه کار به تایمر (بالا) قبل از این‌که اصلاً نوبتش برسه کمتر بشه.
const GLOBAL_TRANSLATE_CONCURRENCY = 10;
const TRANSLATE_HARD_TIMEOUT_MS = 15000;
let _translateActiveCount = 0;
const _translateQueue = [];
function _runNextTranslateJob() {
  if (_translateActiveCount >= GLOBAL_TRANSLATE_CONCURRENCY) return;
  const job = _translateQueue.shift();
  if (!job) return;
  _translateActiveCount++;
  job
    .fn()
    .then(job.resolve, job.reject)
    .finally(() => {
      _translateActiveCount--;
      _runNextTranslateJob();
    });
}
function queueTranslateJob(fn) {
  return new Promise((resolve, reject) => {
    _translateQueue.push({ fn, resolve, reject });
    _runNextTranslateJob();
  });
}

async function translateFree(text, targetLang, sourceLang = "auto", aiSettings = null, forceVerify = false) {
  if (!text || !targetLang) return text;
  // اگه زبان مبدا و مقصد یکی باشن، ترجمه بی‌معنیه (و بعضی سرویس‌ها به‌جای
  // خطا، یه پیام متنی برمی‌گردونن که اشتباهی به‌عنوان "ترجمه" ذخیره می‌شد) —
  // پس همون متن اصلی رو بدون درخواست شبکه برمی‌گردونیم.
  if (sourceLang && sourceLang !== "auto" && sourceLang === targetLang) return text;

  // اول کشِ آفلاینِ IndexedDB رو چک کن — اگه این کلمه قبلاً (مثلاً از طریق
  // «دانلود آفلاین لغات» توی تنظیمات) ترجمه و ذخیره شده، بدون هیچ درخواست
  // شبکه‌ای همون رو برگردون. این دقیقاً همونیه که آفلاین‌بودن رو ممکن می‌کنه.
  const cached = await getCachedTranslation(text, targetLang, sourceLang);
  // ⛔️ رفعِ باگِ «زبونِ اشتباه/ترجمه‌نشده که برای همیشه کش شده»: قبلاً هر
  // چی از کش می‌اومد، بدونِ هیچ چکی مستقیم نشون داده می‌شد — پس اگه یه‌بار
  // (مثلاً به‌خاطرِ باگِ زیر، یا قطعیِ لحظه‌ایِ AI) متنِ اصلی/غلط اشتباهاً کش
  // شده باشه، همون غلط تا ابد (حتی بعد از رفعِ باگ) نشون داده می‌شد. حالا
  // موقعِ خوندن از کش هم با همون تستِ looksLikelyMistranslated چک می‌کنیم؛
  // اگه مشکوک بود، کش رو نادیده می‌گیریم و انگار اصلاً کش نبوده دوباره
  // می‌ریم سراغِ شبکه — یعنی دیتای غلطِ قدیمی خودش‌به‌خود (بدون نیاز به پاک
  // کردنِ دستیِ IndexedDB) اصلاح می‌شه.
  if (cached && !looksLikelyMistranslated(text, cached, targetLang, sourceLang)) return cached;

  // کش نبود — کارِ واقعیِ شبکه‌ای وارد صفِ سراسری می‌شه (نه بلافاصله اجرا)
  // تا سقفِ هم‌زمانی رعایت بشه؛ و کلِ این کار زیرِ یه سقفِ زمانیِ سخت قرار
  // می‌گیره تا رابط کاربری هیچ‌وقت بی‌نهایت منتظر نمونه.
  //
  // 🐛 باگِ اصلیِ «زبان‌های غیر از EN/FA/ES همیشه انگلیسی برمی‌گردوندن»
  // دقیقاً همین‌جا بود: قبلاً تایمرِ ۱۵ثانیه‌ای همین که translateFree صدا
  // زده می‌شد شروع می‌شد — یعنی از لحظه‌ی *صف‌شدن*، نه از لحظه‌ی *واقعاً
  // اجراشدن*. توی تبِ «Vocabulary in Use» (یا هر لیستِ ۶۰تاییِ دیگه)،
  // با انتخاب/اضافه‌کردنِ یه زبانِ مقصدِ تازه (که هنوز کش نشده، برخلافِ
  // فارسی که مستقیم تویِ دیتاست هست و اصلاً وارد این صف نمی‌شه)، ده‌ها
  // درخواستِ ترجمه هم‌زمان صف می‌شدن؛ ولی GLOBAL_TRANSLATE_CONCURRENCY
  // فقط ۳تاشون رو هم‌زمان اجرا می‌کنه. نتیجه: کلمه‌های آخرِ صف تا نوبتشون
  // برسه بیشتر از ۱۵ثانیه صف می‌موندن، تایمر زودتر از شروعِ کارِ واقعی‌شون
  // فایر می‌شد، و resolve(text) یعنی *متنِ انگلیسیِ اصلی* بدونِ هیچ تلاشِ
  // شبکه‌ای واقعی نمایش داده می‌شد — دقیقاً همون چیزی که با ES (که معمولاً
  // زودتر/با صفِ کوتاه‌تر تست می‌شه) دیده نمی‌شد ولی با بقیه‌ی زبان‌ها
  // (که صف‌شون شلوغ‌تره) دائم تکرار می‌شد. فیکس: تایمر رو می‌بریم *داخلِ*
  // کارِ صف‌شده، تا فقط از لحظه‌ای که واقعاً اجرا شروع می‌شه بشمره؛ تا وقتی
  // یه کار توی صف منتظره، هیچ‌وقت به‌خاطرِ صف‌شدن fail/fallback نمی‌شه.
  return queueTranslateJob(() => {
    const networkPromise = translateFreeNetwork(text, targetLang, sourceLang, aiSettings, forceVerify);
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(text), TRANSLATE_HARD_TIMEOUT_MS);
    });
    return Promise.race([networkPromise, timeoutPromise]);
  });
}

// ---------------------------------------------------------------------------
// 🚦 Circuit breaker برای سرویس‌های ترجمه: اگه یه سرویس (مثلاً چون تویِ
// شبکه‌ی کاربر فیلتر/بلاکه) پشتِ‌سرِهم شکست بخوره، قبلاً همچنان برایِ
// *هر کلمه/هر زبونِ بعدی* دوباره امتحانش می‌کردیم — یعنی هر ردیفِ ترجمه
// (هر کلمه × هر زبون) باید صبر می‌کرد تا هر ۴ سرویس یکی‌یکی (هرکدوم تا
// fetchWithTimeoutِ خودش) شکست بخورن، قبل از این‌که نوبت به بعدی/بک‌اندِ
// AI برسه. روی صفحه‌ای با مثلاً ۶۰ لغت × ۹ زبونِ غیرِفارسی = ۵۴۰ ردیف،
// با فقط GLOBAL_TRANSLATE_CONCURRENCY کارِ هم‌زمان، این یعنی ده‌ها دقیقه
// طول می‌کشید تا کل صف خالی بشه — دقیقاً همون «صبر کردم ولی ترجمه نشد».
// حالا: بعد از چند شکستِ پشتِ‌سرِهمِ یه سرویس (تویِ کلِ اپ، نه فقط یه
// کلمه)، همون سرویس برایِ چند دقیقه به‌طور کامل کنار گذاشته می‌شه — پس
// بقیه‌ی ردیف‌ها بلافاصله سراغِ سرویسِ زنده (یا بک‌اندِ AI) می‌رن، بدونِ
// این‌که وقتِ‌شون رویِ سرویس‌هایِ مرده تلف بشه. بعد از اتمامِ زمانِ بلاک،
// خودکار یه‌بارِ دیگه امتحان می‌شه (شاید فیلترینگ برداشته شده باشه).
const PROVIDER_FAIL_THRESHOLD = 2; // این‌قدر شکستِ پشتِ‌سرِهم یعنی احتمالاً بلاکه، نه یه خطایِ لحظه‌ای
const PROVIDER_BLOCK_MS = 3 * 60 * 1000; // ۳ دقیقه کنار گذاشته می‌شه، بعدش دوباره امتحان می‌شه
const _providerFailCounts = {};
const _providerBlockedUntil = {};
function isProviderTemporarilyBlocked(provider) {
  const until = _providerBlockedUntil[provider.name];
  if (!until) return false;
  if (Date.now() < until) return true;
  // زمانِ بلاک تموم شده — پاکش کن تا دوباره یه شانس بگیره
  delete _providerBlockedUntil[provider.name];
  _providerFailCounts[provider.name] = 0;
  return false;
}
function reportProviderOutcome(provider, succeeded) {
  if (succeeded) {
    _providerFailCounts[provider.name] = 0;
    delete _providerBlockedUntil[provider.name];
    return;
  }
  const count = (_providerFailCounts[provider.name] || 0) + 1;
  _providerFailCounts[provider.name] = count;
  if (count >= PROVIDER_FAIL_THRESHOLD) {
    _providerBlockedUntil[provider.name] = Date.now() + PROVIDER_BLOCK_MS;
  }
}

// اجرای موازیِ چند سرویسِ ترجمه به‌جای پشت‌سرِهم — چون این ۴ سرویسِ خارجی
// (Google/MyMemory/Lingva/Libre) معمولاً توی شبکه‌ی ایران فیلتر/بلاکن، حالتِ
// قبلی (یکی‌یکی با تایم‌اوتِ جدا) یعنی کاربر باید تا ۱۶ ثانیه صبرِ سرویس‌های
// مرده رو می‌کشید قبل از اینکه اصلاً نوبت به بک‌اندِ AI برسه. حالا همه رو
// همزمان می‌فرستیم و اولین جوابِ غیرخالی برنده‌ست؛ بقیه فقط برای گزارشِ
// شکست به circuit breaker استفاده می‌شن (چیزی که تأییدش می‌کنه رو return
// نمی‌کنن، پس هزینه‌ی اضافه‌ای هم ندارن). مصرفِ AI دست‌نخورده می‌مونه: فقط
// روی همون برنده (verify) یا وقتی هیچ‌کدوم جواب ندادن (translateViaAI)
// صدا زده می‌شه — دقیقاً مثل قبل.
function raceProviderResults(providers, text, targetLang, sourceLang) {
  return new Promise((resolve) => {
    if (providers.length === 0) { resolve(null); return; }
    let remaining = providers.length;
    let settled = false;
    providers.forEach((provider) => {
      provider(text, targetLang, sourceLang)
        .then((result) => {
          if (result && result.trim()) {
            if (!settled) { settled = true; resolve({ result, provider }); }
          } else {
            // جواب خالی/بی‌محتوا هم یه‌جور شکستِ همون سرویسه
            reportProviderOutcome(provider, false);
          }
        })
        .catch((error) => {
          reportProviderOutcome(provider, false);
          console.warn(`ترجمه با ${provider.name} ناموفق بود:`, error?.message || error);
        })
        .finally(() => {
          remaining -= 1;
          if (remaining === 0 && !settled) resolve(null);
        });
    });
  });
}

async function translateFreeNetwork(text, targetLang, sourceLang, aiSettings, forceVerify) {
  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre].filter(
    (p) => !isProviderTemporarilyBlocked(p)
  );

  const winner = await raceProviderResults(providers, text, targetLang, sourceLang);
  if (winner) {
    const { result, provider } = winner;
    // 🔎 فقط اگه یکی از تست‌های رایگانِ looksLikelyMistranslated مشکوک
    // تشخیص داد (و aiSettings در دسترس بود)، همینجا (قبل از کش‌شدن)
    // یه بررسی سریع با AI انجام می‌شه. چون این کل خط await شده، وقتی
    // چیزی مشکوک نبود (اکثر جمله‌ها) صفر تأخیرِ اضافه داره؛ وقتی هم
    // مشکوک بود، یه تأخیرِ کوتاه (یه کالِ سریعِ Groq) به‌جای نمایشِ
    // ترجمه‌ی غلط، منطقی‌تره.
    const finalResult =
      aiSettings && (forceVerify || looksLikelyMistranslated(text, result, targetLang, sourceLang))
        ? await verifyTranslationWithAI(text, targetLang, result, aiSettings)
        : result;
    // اگه بعد از تلاش برای اصلاح هم هنوز مشکوکه (یعنی AI هم در دسترس نبود
    // و draft خام همون متن مبدأ برگشت)، کش نکن — برو سراغِ بک‌اندِ AI به‌جای
    // اینکه یه ترجمه‌ی غلط برای همیشه تو IndexedDB ذخیره بمونه.
    if (!looksLikelyMistranslated(text, finalResult, targetLang, sourceLang)) {
      reportProviderOutcome(provider, true);
      setCachedTranslation(text, targetLang, sourceLang, finalResult); // fire-and-forget
      return finalResult;
    }
  }
  // اگه هر ۴ سرویسِ رایگان شکست خوردن (مثلاً به‌خاطر فیلتر/بلاک‌بودنِ
  // این سرورهای خارجی توی شبکه‌ی کاربر) و aiSettings در دسترس بود،
  // به‌عنوان آخرین چاره از بک‌اند AI خودِ اپ کمک می‌گیریم.
  if (aiSettings) {
    try {
      const result = await translateViaAI(text, targetLang, sourceLang, aiSettings);
      // 🐛 باگِ اصلی همین‌جا بود: برخلافِ ۴ سرویسِ رایگانِ بالا (که نتیجه‌شون
      // قبل از کش‌شدن از فیلترِ looksLikelyMistranslated رد می‌شه)، این
      // آخرین‌چاره (بک‌اندِ AI) هر جوابی که می‌داد — حتی اگه عیناً همون متنِ
      // مبدأ (مثلاً انگلیسیِ ترجمه‌نشده) بود — بدونِ هیچ چکی برای همیشه کش
      // و نمایش داده می‌شد. چون ۴ سرویسِ رایگانِ بالا (Google/MyMemory/
      // Lingva/Libre) توی شبکه‌ی ایران معمولاً فیلتر/بلاکن، عملاً اکثرِ
      // ترجمه‌ها از همین مسیرِ بدونِ-چک رد می‌شدن — دقیقاً همون دلیلِ دیده‌شدنِ
      // برچسبِ زبونِ اشتباه (مثلاً ES) با متنِ انگلیسیِ دست‌نخورده. حالا این
      // نتیجه هم دقیقاً مثلِ بقیه چک می‌شه.
      if (result && result.trim() && !looksLikelyMistranslated(text, result, targetLang, sourceLang)) {
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

// اجرای یه آرایه از تسک‌های async با سقفِ هم‌زمانیِ محدود (به‌جای
// Promise.all خام که همه رو یک‌جا شلیک می‌کنه). دلیلِ وجودش: برای
// PDF/فایلِ صوتیِ طولانی که صدها جمله داره، اگه هم‌زمان صدها درخواستِ
// ترجمه به Google/MyMemory/... بره، این سرویس‌های رایگان کاربر رو
// rate-limit یا بلاک می‌کنن — نتیجه‌ش دقیقاً همون «بعضی‌جاها ترجمه شده،
// بعضی‌جاها نه»ست، چون هر جمله‌ای که به هر دلیلی (rate-limit/timeout)
// شکست بخوره، بدونِ ترجمه (متنِ اصلی) برمی‌گرده.
async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runNext);
  await Promise.all(workers);
  return results;
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
// جستجوی «کلمه‌ی کامل» به‌جای indexOf ساده — indexOf ساده ممکنه وسطِ یه
// کلمه‌ی دیگه رو پیدا کنه (مثلاً جستجوی "man" داخلِ "woman")، که باعث
// می‌شد نشانگرها دور نصفِ یه کلمه‌ی اشتباه گذاشته بشن و کل زیرخط‌کشی غلط
// از آب دربیاد. اینجا با چک‌کردنِ کاراکترهای قبل/بعد (باید حرف/رقم نباشن)
// مطمئن می‌شیم دقیقاً همون کلمه/عبارتِ کامل پیدا شده.
function findWholeWordIndex(haystack, needle) {
  if (!haystack || !needle) return -1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  const isWordChar = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
  let from = 0;
  while (true) {
    const idx = h.indexOf(n, from);
    if (idx === -1) return -1;
    const before = idx > 0 ? h[idx - 1] : "";
    const after = idx + n.length < h.length ? h[idx + n.length] : "";
    if (!isWordChar(before) && !isWordChar(after)) return idx;
    from = idx + 1;
  }
}
async function translateWordInContext(sentenceText, word, sourceLang, targetLang) {
  if (!sentenceText || !word) return null;
  let idx = findWholeWordIndex(sentenceText, word);
  if (idx === -1) idx = sentenceText.toLowerCase().indexOf(word.toLowerCase()); // فالبک برای عبارت‌های چندکلمه‌ای که مرزبندی «کلمه‌ی کامل» براشون صدق نمی‌کنه
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
  // رنگ‌های اختصاصیِ گرادیانتِ هدرِ بالا — هر تم رنگِ خودش رو داره (به‌جای
  // اینکه هدر همیشه از teal→ink بسازه، که چون ink توی همه‌ی تم‌ها تیره‌ست
  // باعث می‌شد هدر همیشه تقریباً یه شکلِ تیره‌ی یکسان داشته باشه، فارغ از
  // اینکه کدوم تم انتخاب شده).
  headerFrom: "var(--c-headerFrom)",
  headerTo: "var(--c-headerTo)",
  headerText: "var(--c-headerText)",
};
// طبق درخواست: متن اصلیِ لغت/جمله مشکی-سورمه‌ای پررنگ و بولد، و متنِ
// ترجمه‌ها سبزِ پررنگ و بولد. این دو ثابتن (نه وابسته به تم رنگی
// انتخابی کاربر توی تنظیمات) چون خودِ کاربر رنگ مشخص خواسته.
const mainTextColor = "#0B1220";
const translationColor = "#0F5C34";
// رنگِ ثابتِ «ماژیک هایلایتِ خواندن» — این دیگه فقط یه فال‌بکه؛ رنگِ واقعی
// از appPrefs.highlightColor (که کاربر از تنظیمات انتخاب می‌کنه) میاد.
const READ_MARKER_COLOR = "#FFD54F";
// رنگ ملایم‌تر برای نشانگر «خوانده‌شده» (دایره‌ی کنار هر واژه) — به‌جای
// colors.teal اشباع‌شده که با تکرار زیاد توی لیست‌های بلند چشم رو اذیت
// می‌کرد؛ این یه سبزِ خاکستری کم‌اشباع‌تره که هنوز به‌عنوانِ «تکمیل‌شده»
// خونده می‌شه ولی نور/کنتراستِ کمتری داره.
const READ_DONE_COLOR = "#7FA396";
// رنگِ زمینه‌ی یکسان‌شده‌ی کارت/ردیفِ «خوانده‌شده» در همه‌ی تب‌ها (لغات،
// اخبار، اسلنگ، علاقه‌مندی‌ها، مکالمه‌ی روزمره، داستان‌های ذخیره‌شده،
// یادداشت‌های گرامر) — قبلاً یه سبزِ خیلی کم‌رنگ (#F2FBF6) بود که کاربر
// گفت چشم رو اذیت می‌کنه؛ این یه طلاییِ کم‌رنگه که خودِ کاربر از بینِ چند
// گزینه انتخاب کرد.
const READ_DONE_BG = "#FBF2DF";
// گرادیانتِ طلاییِ «خوانده‌شده» — طبق درخواستِ کاربر، همون افکتِ بصریِ
// کارت‌های تبِ مکالمات (language-app-home.html: .card.done) حالا توی همه‌ی
// تب‌های دیگه هم (لغات، اخبار، اسلنگ، داستان‌های ذخیره‌شده، یادداشت‌های
// گرامر) برای ردیف/کارتِ خوانده‌شده استفاده می‌شه، به‌جای رنگِ تختِ
// READ_DONE_BG بالا.
const READ_DONE_GRADIENT = "linear-gradient(150deg, #F8F2DE 0%, #F1E6C6 100%)";
const READ_DONE_BORDER = "#E3D2A2";
const READ_DONE_SHADOW = "0 2px 8px -6px rgba(150,120,40,.15)";
// تیکِ «خوانده‌شده» همیشه سبزه (مستقل از تمِ رنگیِ فعال) تا با هر پوسته‌ای یکدست بمونه.
const READ_DONE_CHECK_GRADIENT = "linear-gradient(135deg, #3F9B72, #276E4F)";
// رنگِ ثابتِ ستاره‌ی «افزودن به علاقه‌مندی‌ها» — زرد (نه طلایی/نارنجی)،
// مستقل از تمِ رنگیِ فعال، تا همه‌جای اپ یکدست باشه.
const STAR_FAVORITE_COLOR = "#F5C518";
// پالتِ رنگ‌های کم‌رنگ/بی‌حال (pastel) که کاربر می‌تونه به‌عنوانِ رنگِ
// هایلایتِ خواندن ازش انتخاب کنه — دقیقاً همون طیفی که خودِ کاربر
// به‌عنوانِ نمونه فرستاد (زردِ کم‌رنگ، هلویی، نارنجیِ ملایم، صورتی‌مرجانی،
// زیتونی، سبز، فیروزه‌ای، آبیِ روشن، آبی، بنفش، بنفشِ صورتی، صورتی).
const HIGHLIGHT_COLOR_PALETTE = [
  "#F7E98E", // زرد کم‌رنگ
  "#FBD9AE", // هلویی
  "#F7C48C", // نارنجیِ ملایم
  "#F1968E", // صورتی‌مرجانی
  "#DCE07E", // زیتونی روشن
  "#9AD98A", // سبز کم‌رنگ
  "#8DE0BE", // فیروزه‌ای/نعنایی
  "#A6DEE9", // آبیِ خیلی روشن
  "#A9C7F0", // آبی کم‌رنگ
  "#C7B6EC", // بنفشِ کم‌رنگ
  "#F0AEEC", // بنفشیِ صورتی
  "#F4AAC0", // صورتی
];
// همون رنگِ پس‌زمینه‌ی نوارِ پلیرِ پایینِ صفحه (colors.paper) — تا این پنلِ
// شناور با اون هم‌رنگ باشه؛ بردرِ طلاییِ کم‌رنگ (goldSoft) هم اضافه شده تا
// با وجودِ هم‌رنگ بودنِ پس‌زمینه، پنل هنوز به‌وضوح از بقیه‌ی صفحه جدا دیده بشه.
const PRACTICE_PANEL_BORDER = colors.goldSoft;

// وقتی کاربر از تنظیمات «بدون هایلایت» رو انتخاب کرده باشه
// (appPrefs.highlightColor === "none")، حتی وقتی جمله/کلمه/پاراگرافِ فعلی
// در حالِ خوندنه، هیچ رنگِ هایلایتی روش اعمال نمی‌شه — متن فقط خونده
// می‌شه، بدونِ علامت‌گذاریِ بصری. همه‌جایی که پس‌زمینه‌ی «زنده»ی خواندن رو
// نشون می‌دن (StoryBuilder، PhraseList، لیستِ لغات و ...) به‌جای نوشتنِ
// دستیِ `isActive ? (highlightColor || READ_MARKER_COLOR) : inactive` از
// همین تابع استفاده می‌کنن.
function highlightBg(highlightColor, isActive, inactiveValue) {
  const fallback = inactiveValue === undefined ? "transparent" : inactiveValue;
  if (!isActive || highlightColor === "none") return fallback;
  return highlightColor || READ_MARKER_COLOR;
}

// ⚡️ استایلِ مشترکِ «سواچِ رنگ» — دقیقاً بر اساسِ ظاهرِ سواچ‌های
// «Theme Colors»ِ پاورپوینت که کاربر نمونه فرستاد: یه مربعِ کوچیکِ
// گوشه‌گرد با بردرِ نازکِ خاکستری و یه سایه‌ی ظریف، به‌جای دایره‌ی تختِ
// قبلی. هم پیکِ «رنگ و تم» و هم پالتِ «رنگِ هایلایتِ خواندن» از همین یه
// تابع استفاده می‌کنن تا کاملاً هم‌شکل باشن (طبقِ درخواستِ کاربر). حالتِ
// انتخاب‌شده هم به‌جای یه بردرِ ضخیمِ ساده، یه حلقه‌ی دوتایی (یه خطِ سفید
// و بعدش رنگِ طلایی) دورِ سواچ می‌کشه — همون افکتِ برجسته‌شدنِ سواچِ
// انتخابی که توی اسکرین‌شاتِ پاورپوینت هم دیده می‌شه.
function swatchButtonStyle(bg, selected, size = 34) {
  return {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${selected ? colors.gold : "rgba(0,0,0,.16)"}`,
    boxShadow: selected
      ? `0 0 0 2px white, 0 0 0 4px ${colors.gold}, 0 1px 3px rgba(0,0,0,.2)`
      : "0 1px 2px rgba(0,0,0,.12), inset 0 0 0 1px rgba(255,255,255,.35)",
    flexShrink: 0,
    transition: "box-shadow .15s ease",
  };
}

// Theme presets — each is a full set of the 9 tokens above. "vintage" is the
// original look; the rest are alternate moods, all still checked for
// readable contrast (dark ink/text tokens on light paper tokens, or the
// reverse for "midnight").
const APP_THEMES = {
  vintage: {
    label: { fa: "کلاسیک (پیش‌فرض)", en: "Classic (default)" },
    swatch: "#C99A2E",
    // هدرِ همین تمِ پیش‌فرض دست‌نخورده موند (همون چیزی که کاربر می‌پسندید)؛
    // فقط به‌جای اینکه از teal→ink ساخته بشه، حالا مستقیماً به headerFrom/To
    // منتقل شد تا با بقیه‌ی تم‌ها هم‌شکل باشه.
    values: { paper: "#EFE6C9", paperDark: "#E6DAB2", ink: "#1E2A26", inkSoft: "#4B5551", gold: "#C99A2E", goldSoft: "#E3C77E", teal: "#1B4640", rose: "#9E3B3B", cardBorder: "#E7DEC1", headerFrom: "#1B4640", headerTo: "#1E2A26", headerText: "#EFE6C9" },
  },
  ocean: {
    label: { fa: "اقیانوسی", en: "Ocean" },
    // ⚡️ طبقِ درخواستِ کاربر: تم‌های غیرِ پیش‌فرض تیره/کدر بودن، مخصوصاً
    // هدرِ بالا که همیشه تقریباً سیاه به‌نظر می‌رسید (چون از teal→ink
    // ساخته می‌شد و ink توی همه‌ی تم‌ها خیلی تیره‌ست). حالا هدر یه
    // گرادیانتِ روشن و زنده‌ی مخصوصِ خودِ این تم داره (آبیِ واضح → فیروزه‌ای)،
    // نه یه رنگِ تقریباً مشکیِ یکسان با بقیه‌ی تم‌ها.
    swatch: "#2E86DE",
    values: { paper: "#EAF4F4", paperDark: "#D7E9EA", ink: "#0F2A38", inkSoft: "#2A4E5C", gold: "#1C7C93", goldSoft: "#8FCBD8", teal: "#1C7C93", rose: "#B4533F", cardBorder: "#BBD6D8", headerFrom: "#3AA0F2", headerTo: "#1C7C93", headerText: "#F4FBFD" },
  },
  forest: {
    label: { fa: "جنگلی", en: "Forest" },
    swatch: "#2FA84F",
    values: { paper: "#F1F0E4", paperDark: "#E2E0CC", ink: "#26321D", inkSoft: "#41522C", gold: "#8A6D2F", goldSoft: "#C9B77E", teal: "#5C7A3A", rose: "#9C4A3A", cardBorder: "#CBCBA8", headerFrom: "#3FAE5C", headerTo: "#2C6B3D", headerText: "#F5F8EC" },
  },
  rosewine: {
    label: { fa: "گلبهی", en: "Rosewine" },
    swatch: "#C2185B",
    values: { paper: "#F7EAEA", paperDark: "#EBD6D8", ink: "#3A1F26", inkSoft: "#5C3540", gold: "#A34960", goldSoft: "#E3AFBC", teal: "#6E5A78", rose: "#A34960", cardBorder: "#DDBFC4", headerFrom: "#D45079", headerTo: "#9C2E56", headerText: "#FDF1F2" },
  },
  midnight: {
    label: { fa: "تیره (شب)", en: "Midnight" },
    // این یگانه تمِ عمداً تیره‌ست (شب) — پس هدرش هم تیره می‌مونه، ولی حالا
    // با یه گرادیانتِ بنفشِ‌آبیِ واضح به‌جای رنگِ صافِ نزدیک‌به‌مشکی.
    swatch: "#3F51B5",
    values: { paper: "#1B1F2A", paperDark: "#262C3B", ink: "#F1E8D6", inkSoft: "#C9C2AE", gold: "#D9A441", goldSoft: "#8A6A2C", teal: "#5FA997", rose: "#D9776A", cardBorder: "#3A4258", headerFrom: "#4A5AC4", headerTo: "#232A3D", headerText: "#F1E8D6" },
  },
  sunset: {
    label: { fa: "غروب", en: "Sunset" },
    swatch: "#E8622C",
    values: { paper: "#FCEFE2", paperDark: "#F5DFC6", ink: "#3A2313", inkSoft: "#6B4A2C", gold: "#D9752E", goldSoft: "#F0B784", teal: "#4E7A6E", rose: "#B23A3A", cardBorder: "#E6C79E", headerFrom: "#F0793D", headerTo: "#C24A34", headerText: "#FDF3E7" },
  },
  lavender: {
    label: { fa: "بنفش (اسطوخودوس)", en: "Lavender" },
    swatch: "#8E44AD",
    values: { paper: "#F1EEF8", paperDark: "#E1DAF0", ink: "#2C2140", inkSoft: "#4C3E68", gold: "#7A5FA8", goldSoft: "#C5B3E3", teal: "#4C7A8A", rose: "#A8517F", cardBorder: "#D2C5EA", headerFrom: "#9C5FC4", headerTo: "#6A3F92", headerText: "#F8F3FC" },
  },
  mint: {
    label: { fa: "نعنایی", en: "Mint" },
    swatch: "#1AAE8C",
    values: { paper: "#EAF7F1", paperDark: "#D6EEE2", ink: "#12332A", inkSoft: "#2E5548", gold: "#2E9E7B", goldSoft: "#9BDCC3", teal: "#2E9E7B", rose: "#B25353", cardBorder: "#BEE0D0", headerFrom: "#2BC49E", headerTo: "#1B8F71", headerText: "#F2FBF7" },
  },
  // ۶ تمِ جدید — طبقِ درخواستِ کاربر برای تنوعِ بیشترِ رنگی؛ هرکدوم دقیقاً
  // با همون ساختارِ کاملِ تم‌های بالا (paper/ink/gold/teal/... + رنگِ
  // اختصاصیِ هدر) طراحی شدن، نه فقط یه سواچِ تکی.
  amber: {
    label: { fa: "کهربایی", en: "Amber" },
    swatch: "#F0A202",
    values: { paper: "#FDF4E3", paperDark: "#F7E7C4", ink: "#3D2B0E", inkSoft: "#6B4F22", gold: "#D98E04", goldSoft: "#F3C567", teal: "#4E7A3A", rose: "#B23A3A", cardBorder: "#EEDBA6", headerFrom: "#F5A623", headerTo: "#C77800", headerText: "#FFF8EC" },
  },
  coral: {
    label: { fa: "مرجانی", en: "Coral" },
    swatch: "#FF6F61",
    values: { paper: "#FDECE9", paperDark: "#F8D7D0", ink: "#3A1B15", inkSoft: "#6B3A2E", gold: "#E0644F", goldSoft: "#F5AFA0", teal: "#3F8E85", rose: "#E0644F", cardBorder: "#F0C4B8", headerFrom: "#FF7A62", headerTo: "#D9432E", headerText: "#FFF3EF" },
  },
  sky: {
    label: { fa: "آسمانی", en: "Sky" },
    swatch: "#4FC3F7",
    values: { paper: "#EAF7FD", paperDark: "#D5EEFA", ink: "#123244", inkSoft: "#2E5568", gold: "#2B93C4", goldSoft: "#9BD8EF", teal: "#2B93C4", rose: "#C0504F", cardBorder: "#BFE3F3", headerFrom: "#63C8F5", headerTo: "#1E86B8", headerText: "#F2FBFE" },
  },
  berry: {
    label: { fa: "توتی", en: "Berry" },
    swatch: "#9C1F5C",
    values: { paper: "#F8ECF1", paperDark: "#EED8E2", ink: "#350F22", inkSoft: "#5E2C42", gold: "#A8356E", goldSoft: "#DE9AB9", teal: "#6C3B57", rose: "#A8356E", cardBorder: "#E0C0D0", headerFrom: "#B93A79", headerTo: "#7A1E4C", headerText: "#FCF0F5" },
  },
  olive: {
    label: { fa: "زیتونی", en: "Olive" },
    swatch: "#6B8E23",
    values: { paper: "#F3F2E6", paperDark: "#E6E4CC", ink: "#2B2E17", inkSoft: "#4C512C", gold: "#8A7A2F", goldSoft: "#C9BE7E", teal: "#6B8E23", rose: "#A15A3A", cardBorder: "#D8D6B0", headerFrom: "#7FA02E", headerTo: "#556B1B", headerText: "#F6F8EA" },
  },
  slate: {
    label: { fa: "دودی", en: "Slate" },
    swatch: "#5B7C99",
    values: { paper: "#EEF2F5", paperDark: "#DFE6EB", ink: "#1D2C38", inkSoft: "#3D5566", gold: "#4E7B99", goldSoft: "#A9C6D6", teal: "#4E7B99", rose: "#B0524A", cardBorder: "#CBD8E0", headerFrom: "#6E93B0", headerTo: "#3E5F78", headerText: "#F3F7FA" },
  },
};

// Font-family presets. Loaded in index.html via Google Fonts <link>.
// The 3 new presets below (elegant / rounded / warm) need these Google
// Fonts <link> tags added to index.html if not already present:
//   Aref+Ruqaa, Playfair+Display, Noto+Kufi+Arabic, Poppins,
//   Noto+Sans+Arabic, Nunito
const APP_FONTS = {
  default: { label: { fa: "پیش‌فرض", en: "Default" }, fa: "'Vazirmatn', sans-serif", latin: "'Lora', serif" },
  modern: { label: { fa: "مدرن", en: "Modern" }, fa: "'Vazirmatn', sans-serif", latin: "'Inter', sans-serif" },
  classic: { label: { fa: "کلاسیک", en: "Classic" }, fa: "'Noto Naskh Arabic', serif", latin: "'Merriweather', serif" },
  elegant: { label: { fa: "شیک", en: "Elegant" }, fa: "'Aref Ruqaa', serif", latin: "'Playfair Display', serif" },
  rounded: { label: { fa: "گرد", en: "Rounded" }, fa: "'Noto Kufi Arabic', sans-serif", latin: "'Poppins', sans-serif" },
  warm: { label: { fa: "گرم", en: "Warm" }, fa: "'Noto Sans Arabic', sans-serif", latin: "'Nunito', sans-serif" },
};

// Font-size presets — applied as a CSS `zoom` on the app's root wrapper
// (simplest way to scale an app that's built with fixed px sizes
// throughout, without rewriting every fontSize to rem). Supported in
// Chrome/Edge/Safari and current Firefox; on the rare browser without
// `zoom` support the app still works, just always at 100% size.
const APP_FONT_SIZES = {
  small: { label: { fa: "کوچک", en: "Small" }, zoom: 0.9 },
  medium: { label: { fa: "متوسط (پیش‌فرض)", en: "Medium (default)" }, zoom: 1 },
  large: { label: { fa: "بزرگ", en: "Large" }, zoom: 1.15 },
  xlarge: { label: { fa: "خیلی بزرگ", en: "Extra large" }, zoom: 1.3 },
};

// Supported UI (software) languages — independent from the "native
// language" / "target languages" the user picks for practicing. This one
// controls what language the app's own interface (menus, tabs, buttons)
// is shown in.
const APP_LANGUAGES = {
  fa: { label: "فارسی", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
};

// Small translation dictionary for the app's own interface strings.
// Currently covers the Settings panel and the main tab bar; more screens
// can be added to this table the same way over time.
const UI_STRINGS = {
  settingsTitle: { fa: "تنظیمات", en: "Settings" },
  account: { fa: "حساب کاربری", en: "Account" },
  guestUser: { fa: "کاربر", en: "User" },
  logout: { fa: "خروج از حساب", en: "Log out" },
  themeSectionTitle: { fa: "رنگ و تم", en: "Color & theme" },
  fontSectionTitle: { fa: "نوع فونت", en: "Font style" },
  fontSizeTitle: { fa: "اندازه‌ی فونت", en: "Font size" },
  languageSectionTitle: { fa: "زبان نرم‌افزار", en: "App language" },
  offlineDownload: { fa: "دانلود آفلاین لغات", en: "Download offline words" },
  calendarSectionTitle: { fa: "تقویم تاریخ‌ها", en: "Date calendar" },
  calendarJalali: { fa: "شمسی", en: "Persian (Jalali)" },
  calendarGregorian: { fa: "میلادی", en: "Gregorian" },
  calendarBoth: { fa: "هر دو", en: "Both" },
  sortByLabel: { fa: "مرتب‌سازی", en: "Sort" },
  storyLangLevelSection: { fa: "۱. زبان و سطح داستان", en: "1. Story language & level" },
  storyWordsSection: { fa: "۲. انتخاب لغت‌ها", en: "2. Select words" },
  storyLevelLabel: { fa: "سطح داستان", en: "Story level" },
  storyContentTypeLabel: { fa: "نوع محتوا", en: "Content type" },
  storyLengthLabel: { fa: "طول داستان", en: "Story length" },
  storyRepeatCountLabel: { fa: "تعداد تکرار هر لغت", en: "Repeat count per word" },
  srtToolTitle: { fa: "ترجمه‌ی زیرنویس (SRT)", en: "Subtitle translation (SRT)" },
  srtToolDesc: { fa: "یه فایلِ srt وارد کن، زبانِ مقصد رو انتخاب کن، ترجمه کن و فایلِ srtِ ترجمه‌شده رو دانلود کن — برای استفاده تو هر پلیرِ ویدیو/صوتِ دیگه.", en: "Upload an srt file, pick a target language, translate it, and download the translated srt file — for use in any video/audio player." },
  srtToolChooseFile: { fa: "انتخابِ فایل srt", en: "Choose srt file" },
  srtToolLinesCount: { fa: "{n} خط", en: "{n} lines" },
  srtToolTranslate: { fa: "ترجمه کن", en: "Translate" },
  srtToolStop: { fa: "توقف ({done}/{total})", en: "Stop ({done}/{total})" },
  srtToolDownload: { fa: "دانلودِ srt ترجمه‌شده", en: "Download translated srt" },
  srtToolErrEmptyFile: { fa: "فایل srt قابلِ خوندن نبود یا خالی بود.", en: "The srt file couldn't be read or was empty." },
  srtToolErrParse: { fa: "خطا در خواندنِ فایل srt.", en: "Error reading the srt file." },
  srtToolErrRead: { fa: "خطا در خواندنِ فایل.", en: "Error reading the file." },
  headerFromTo: { fa: "از {native} به {target}", en: "From {native} to {target}" },
  nativeLanguageLabel: { fa: "زبان مادری", en: "Native language" },
  targetLanguagesLabel: { fa: "زبان‌های مقصد", en: "Target languages" },
  translationOrderLabel: { fa: "ترتیب نمایش ترجمه‌ها (بکش تا جابجا بشه)", en: "Translation display order (drag to reorder)" },
  tabConversations: { fa: "مکالمات روزمره", en: "Daily conversations" },
  tabStory: { fa: "داستان‌ساز", en: "Story generator" },
  tabSaved: { fa: "لغات ذخیره‌شده", en: "Saved words" },
  tabGrammar: { fa: "گرامر", en: "Grammar" },
  tabWords: { fa: "لغات", en: "Words" },
  tabFavorites: { fa: "علاقه‌مندی‌ها", en: "Favorites" },
  tabVocabInUse: { fa: "لغات کاربردی", en: "Vocabulary in Use" },
  tabSlang: { fa: "اسلنگ", en: "Slang" },
  tabReview: { fa: "مرور (جعبه لایتنر)", en: "Review (Leitner box)" },
  tabSpeaking: { fa: "تمرین مکالمه", en: "Speaking practice" },
  // Login / signup screen
  loginTitle: { fa: "ورود به LingoLearn", en: "Sign in to LingoLearn" },
  signupTitle: { fa: "ساخت حساب کاربری", en: "Create an account" },
  loginSubtitle: { fa: "برای ذخیره‌ی پیشرفت و واژه‌هایتان وارد شوید", en: "Sign in to save your progress and words" },
  continueWithGoogle: { fa: "ورود با حساب گوگل", en: "Continue with Google" },
  orWithEmail: { fa: "یا با ایمیل", en: "or with email" },
  namePlaceholder: { fa: "نام شما", en: "Your name" },
  emailPlaceholder: { fa: "ایمیل", en: "Email" },
  passwordPlaceholder: { fa: "رمز عبور", en: "Password" },
  signupSubmit: { fa: "ساخت حساب", en: "Create account" },
  loginSubmit: { fa: "ورود", en: "Sign in" },
  haveAccount: { fa: "حساب دارید؟", en: "Already have an account?" },
  noAccount: { fa: "حساب ندارید؟", en: "Don't have an account?" },
  goToLogin: { fa: "وارد شوید", en: "Sign in" },
  goToSignup: { fa: "بسازید", en: "Create one" },
  fillAllFields: { fa: "همه‌ی فیلدها را پر کنید.", en: "Please fill in all fields." },
  googleSignInFailed: { fa: "ورود با گوگل ناموفق بود: ", en: "Google sign-in failed: " },
  tryAgain: { fa: "دوباره تلاش کنید.", en: "Please try again." },
  verifyEmailSent: { fa: "یک ایمیل تایید برایتان فرستاده شد. لطفاً ایمیلتان را باز کنید و لینک را بزنید، بعد وارد شوید.", en: "A verification email has been sent. Please open it and click the link, then sign in." },
  emailAlreadyRegistered: { fa: "این ایمیل قبلاً ثبت شده. وارد شوید.", en: "This email is already registered. Please sign in." },
  invalidCredentials: { fa: "ایمیل یا رمز عبور اشتباه است.", en: "Incorrect email or password." },
  emailNotConfirmed: { fa: "هنوز ایمیلتان را تایید نکرده‌اید — صندوق ورودی را چک کنید.", en: "Your email isn't verified yet — please check your inbox." },
  genericError: { fa: "خطایی رخ داد. دوباره تلاش کنید.", en: "Something went wrong. Please try again." },
  // زبان‌های خواندنِ بلند (Settings)
  voiceSectionTitle: { fa: "زبان‌های خواندن با صدای بلند", en: "Read-aloud languages" },
  installLanguagePacks: { fa: "نصب بسته‌های زبان", en: "Install language packages" },
  installLanguagePacksHint: {
    fa: "برای اینکه گوشی بتواند زبان‌های بیشتری را با صدای بلند بخواند، از تنظیمات گوشی بسته‌ی صوتی همان زبان را نصب کنید.",
    en: "To let your phone read more languages aloud, install that language's voice package from your phone's settings.",
  },
  voiceNotInstalled: { fa: "روی این گوشی نصب نیست", en: "Not installed on this device" },
  voiceInstalledCount: { fa: "صدای نصب‌شده", en: "installed voice(s)" },
  voicePickLabel: { fa: "انتخاب صدا", en: "Choose voice" },
  voiceAutoOption: { fa: "خودکار (پیشنهاد نرم‌افزار)", en: "Automatic (app default)" },
  persianVoiceNote: {
    fa: "فارسی به‌صورت خودکار و رایگان از اینترنت خوانده می‌شود؛ نیازی به نصب چیزی نیست.",
    en: "Persian is read automatically over the internet for free; nothing to install.",
  },
  androidInstallSteps: {
    fa: "اگر دکمه‌ی بالا تنظیمات را باز نکرد، به این مسیر بروید: تنظیمات گوشی ⟵ زبان و ورودی ⟵ تبدیل متن به گفتار ⟵ موتور گوگل ⟵ نصب داده‌ی صوتی زبان‌ها",
    en: "If the button above doesn't open settings, go to: Phone Settings ⟶ Language & input ⟶ Text-to-speech output ⟶ Google engine ⟶ Install voice data",
  },
  iosInstallSteps: {
    fa: "به این مسیر بروید: تنظیمات آیفون ⟵ دسترس‌پذیری ⟵ محتوای گفتاری ⟵ صداها، و زبان مورد نظر را دانلود کنید.",
    en: "Go to: iPhone Settings ⟶ Accessibility ⟶ Spoken Content ⟶ Voices, and download the language you need.",
  },
  desktopInstallSteps: {
    fa: "ویندوز: تنظیمات ⟵ زمان و زبان ⟵ گفتار ⟵ مدیریت صداها. مک: تنظیمات سیستم ⟵ دسترس‌پذیری ⟵ محتوای گفتاری ⟵ مدیریت صداها.",
    en: "Windows: Settings ⟶ Time & language ⟶ Speech ⟶ Manage voices. Mac: System Settings ⟶ Accessibility ⟶ Spoken Content ⟶ Manage Voices.",
  },
  searchWordsPlaceholder: { fa: "جستجوی لغت...", en: "Search words..." },
  searchConversationsPlaceholder: { fa: "جستجوی مکالمه...", en: "Search conversations..." },
  searchPhrasesPlaceholder: { fa: "جستجوی عبارت...", en: "Search phrases..." },
  noWordsForSearch: { fa: "چیزی با این جستجو پیدا نشد.", en: "Nothing found for this search." },
  noWordsToShow: { fa: "چیزی برای نمایش نیست.", en: "Nothing to show." },
  noWordsInList: { fa: "لغتی برای نمایش نیست.", en: "No words to show." },
  personalBadge: { fa: "شخصی", en: "Custom" },
  addToFavoritesAria: { fa: "افزودن به علاقه‌مندی‌ها", en: "Add to favorites" },
  noFavoritesYet: {
    fa: "هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی. روی ⭐ کنار هر عبارت یا لغت بزن.",
    en: "You haven't added anything to favorites yet. Tap ⭐ next to any phrase or word.",
  },
  favoritesWordsHeading: { fa: "لغات", en: "Words" },
  noPhrasesForSearch: { fa: "چیزی با این جستجو پیدا نشد.", en: "Nothing found for this search." },
  noPhrasesToShow: { fa: "چیزی برای نمایش نیست.", en: "Nothing to show." },
  // پنلِ لغاتِ ذخیره‌شده
  savedWordsTitle: { fa: "لغات ذخیره‌شده", en: "Saved words" },
  savedWordsHint: {
    fa: "لغاتی که با دکمه‌ی «ذخیره برای داستان بعدی» نشون کردی، یا موقع ساختن هر داستانی انتخاب کردی، همه‌شون اینجا جمع می‌شن. هرکدوم رو خواستی بزن تا انتخاب بشه، بعد «افزودن به داستان‌ساز» رو بزن.",
    en: "Words you marked with \"Save for next story\", or picked while building a story, all collect here. Tap any to select it, then hit \"Add to Story Builder\".",
  },
  searchSavedWords: { fa: "جستجو در لغات ذخیره‌شده...", en: "Search saved words..." },
  clearSearchAria: { fa: "پاک کردن جستجو", en: "Clear search" },
  deselectAll: { fa: "لغو انتخاب همه", en: "Deselect all" },
  selectAll: { fa: "انتخاب همه", en: "Select all" },
  clearAllWords: { fa: "پاک کردن همه", en: "Clear all" },
  deleteNSelected: { fa: "حذف {n} انتخاب‌شده", en: "Delete {n} selected" },
  noSavedWordsYet: {
    fa: "هنوز لغتی ذخیره نکردی. روی هر کلمه‌ی داخل متن‌ها بزن و از پاپ‌آپش «ذخیره برای داستان بعدی» رو انتخاب کن، یا موقع ساخت داستان لغت انتخاب کن.",
    en: "You haven't saved any words yet. Tap any word in the texts and choose \"Save for next story\" from its popup, or pick words while building a story.",
  },
  noSavedWordsForSearch: { fa: "با این جستجو لغتی پیدا نشد.", en: "No words found for this search." },
  addNWordsToStory: { fa: "افزودن {n} لغت به داستان‌ساز", en: "Add {n} word(s) to Story Builder" },
  addToStoryBuilder: { fa: "افزودن به داستان‌ساز", en: "Add to Story Builder" },
  longPressToJump: { fa: "نگه‌دار تا به منبعِ این لغت بری", en: "Pres