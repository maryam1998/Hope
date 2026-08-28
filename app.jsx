import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useReducer } from "react";
import { createPortal } from "react-dom";
import { Star, MessageCircle, RotateCcw, Repeat, Send, Check, X, BookOpen, Heart, Search, Volume2, VolumeX, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Wand2, Menu, Palette, Type, Trash2, PlayCircle, Gauge, Layers, Blend, Coffee, CheckSquare, Copy, Globe, SkipBack, SkipForward, ListMusic, Square, ListChecks, Mic } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { VOCAB } from "./VOCAB.js";
import { WORDS_AZ } from "./WORDS_AZ.js";
import { DAILY_WORDS } from "./DAILY_WORDS.js";
import { SLANG_WORDS } from "./SLANG_WORDS.js";
import { VOCAB_IN_USE_UNITS } from "./vocabularyInUseData.js";
import { DAILY_CONVERSATIONS,THEMATIC_CONVERSATIONS } from "./DAILY_CONVERSATIONS.js";
import DailyConversationsTab from "./DailyConversationsTab.jsx";
// مکالمات روزمره + مکالمات موضوعی، یکجا مرج‌شده — تا هرجا که قبلاً از
// DAILY_CONVERSATIONS استفاده می‌شد (تبِ مکالمه، استخرِ جستجوی داستان‌ساز،
// نگاشتِ سطح‌بندیِ لغات)، مکالمات موضوعی هم به‌صورت خودکار دیده بشن.
const ALL_DAILY_CONVERSATIONS = [...DAILY_CONVERSATIONS, ...(THEMATIC_CONVERSATIONS || [])];
import RangeSliderFilter from "./RangeSliderFilter.jsx";

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

function openStoryAudioDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const req = indexedDB.open(STORY_AUDIO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORY_AUDIO_STORE)) {
        db.createObjectStore(STORY_AUDIO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// record شکل: { blob: Blob, timestamps: [{pi,si,time}, ...], savedAt }
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
    repeatsDoneRef.current = 0;
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
      if (cancelled || !rec) return;
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
    // رندر می‌کنه. رویدادِ «timeupdate» مرورگرها رو معمولاً چندین‌بار در
    // ثانیه صدا می‌زنن؛ اگه هر بار state رو آپدیت کنیم، کلِ StoryBuilder
    // (با همه‌ی اون متنِ سنگین) هم چندین‌بار در ثانیه دوباره رندر می‌شه —
    // دقیقاً همون چیزی که با فایل‌های صوتیِ طولانی (که مدتِ بیشتری در حالِ
    // پخش می‌مونن) باعثِ کند/هنگ‌شدنِ محسوس می‌شه. برای همین، currentTime رو
    // فقط وقتی به state می‌بریم که حداقل نیم‌ثانیه از آخرین آپدیت گذشته
    // باشه — برایِ نوارِ پیشرفت/نمایشِ زمان کاملاً کافیه، ولی تعدادِ
    // رندرها رو ۴-۸ برابر کم می‌کنه.
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
      if (Math.abs(t - lastReportedTimeRef.current) >= 0.5) {
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

  // پخشِ دستی/تازه (با زدنِ دکمه‌ی پخش) همیشه شمارشگرِ تکرار رو صفر می‌کنه —
  // وگرنه اگه کاربر وسطِ یه چرخه‌ی تکرار دستی pause/play بزنه، شمارشِ
  // تکرارهای قبلی باقی می‌موند و زودتر از موعد قطع می‌شد.
  function play() { repeatsDoneRef.current = 0; audioElRef.current?.play().catch(() => {}); }
  function pause() { audioElRef.current?.pause(); }
  function seek(t) { if (audioElRef.current) audioElRef.current.currentTime = t; }

  function nextLine() {
    setManualIndex((i) => Math.min(i + 1, Math.max((allSentences?.length || 1) - 1, 0)));
  }
  function prevLine() {
    setManualIndex((i) => Math.max(i - 1, 0));
  }

  async function removeAudio() {
    pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    if (audioElRef.current) audioElRef.current.removeAttribute("src");
    setHasAudio(false);
    setManualIndex(0);
    setAudioSaveError("");
    if (storyKey) await deleteStoryAudioRecord(storyKey);
  }

  // خطِ فعال، فقط از روی manualIndex — هیچ ربطی به currentTime نداره.
  const activeSentence = useMemo(() => {
    if (!allSentences || !allSentences.length) return null;
    const s = allSentences[Math.min(manualIndex, allSentences.length - 1)];
    return s ? { pi: s._pi, si: s._si } : null;
  }, [allSentences, manualIndex]);

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
    seek,
    nextLine,
    prevLine,
    removeAudio,
    abState,
    abA,
    abB,
    markAB,
    clearAB,
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

async function translateFreeNetwork(text, targetLang, sourceLang, aiSettings, forceVerify) {
  const providers = [translateViaGoogle, translateViaMyMemory, translateViaLingva, translateViaLibre];
  for (const provider of providers) {
    if (isProviderTemporarilyBlocked(provider)) continue;
    try {
      const result = await provider(text, targetLang, sourceLang);
      if (result && result.trim()) {
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
        // و draft خام همون متن مبدأ برگشت)، کش نکن — برو سراغ سرویس بعدی به‌جای
        // اینکه یه ترجمه‌ی غلط برای همیشه تو IndexedDB ذخیره بمونه.
        if (looksLikelyMistranslated(text, finalResult, targetLang, sourceLang)) {
          continue;
        }
        reportProviderOutcome(provider, true);
        setCachedTranslation(text, targetLang, sourceLang, finalResult); // fire-and-forget
        return finalResult;
      }
      // جواب خالی/بی‌محتوا هم یه‌جور شکستِ همون سرویسه
      reportProviderOutcome(provider, false);
    } catch (error) {
      reportProviderOutcome(provider, false);
      console.warn(`ترجمه با ${provider.name} ناموفق بود، رفتن سراغ سرویس بعدی:`, error?.message || error);
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
  // Login / signup screen
  loginTitle: { fa: "ورود به کتاب مکالمه", en: "Sign in to Phrasebook" },
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
  longPressToJump: { fa: "نگه‌دار تا به منبعِ این لغت بری", en: "Press and hold to jump to this word's source" },
  deletePermanently: { fa: "حذف دائمی", en: "Delete permanently" },
  confirmDeleteSelectedWords: { fa: "حذف دائمی {n} لغت انتخاب‌شده؟", en: "Permanently delete {n} selected word(s)?" },
  wordsDeletedMsg: { fa: "{n} لغت حذف شد", en: "{n} word(s) deleted" },
  confirmClearFiltered: { fa: "{n} لغتِ در حال نمایش برای همیشه پاک بشن؟", en: "Permanently clear the {n} word(s) currently shown?" },
  confirmClearAllSaved: { fa: "همه‌ی {n} لغت ذخیره‌شده برای همیشه پاک بشن؟", en: "Permanently clear all {n} saved word(s)?" },
  wordsClearedMsg: { fa: "{n} لغت پاک شد", en: "{n} word(s) cleared" },
  jumpedToOriginMsg: { fa: "رفتیم به همون بخشی که «{word}» ازش ذخیره شده بود", en: "Jumped to where \"{word}\" was saved from" },
  jumpToOriginUnknownMsg: { fa: "منبعِ این لغت مشخص نیست (احتمالاً قبل از این قابلیت ذخیره شده)", en: "This word's source isn't known (likely saved before this feature existed)" },
  // پیام‌های حبابِ آدمکِ Lingova — طبقِ سیستمِ زبانِ نرم‌افزار (uiLang) انتخاب می‌شن
  lingovaBubbleRead: { fa: "بخون دیگه! 📖", en: "Come on, keep reading! 📖" },
  lingovaBubbleKeepGoing: { fa: "ادامه‌شو بخون!", en: "Keep going with it!" },
  lingovaBubbleStillThere: { fa: "هنوز اونجایی؟ 👀", en: "Still there? 👀" },
  lingovaBubbleHeyYou: { fa: "با توام‌ها، بخون!", en: "Hey, I'm talking to you — read!" },
};
// t(key, uiLang) — looks up a UI string in the current software language,
// falling back to Persian if the key or language is missing.
function tr(key, uiLang) {
  const entry = UI_STRINGS[key];
  if (!entry) return key;
  return entry[uiLang] || entry.fa;
}
// نسخه‌ی «قالب‌دار»ِ tr — برای رشته‌هایی که یه عدد یا کلمه وسطشون جا می‌گیره
// (مثلاً «{n} لغت حذف شد»). values یه آبجکتِ ساده‌ست: { n: 3 } یا { added: 2, skipped: 1 }.
function trf(key, uiLang, values) {
  let s = tr(key, uiLang);
  Object.entries(values || {}).forEach(([k, v]) => {
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  });
  return s;
}

const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";

const STORAGE_KEY = "phrasebook-state-v1";

// Appearance preferences (theme / font family / font size) — separate from
// the per-account STORAGE_KEY above since these are device-level, not tied
// to any one user, and should already apply on the login screen before
// anyone's signed in.
const APP_PREFS_KEY = "phrasebook-app-prefs";
const CALENDAR_SYSTEMS = ["jalali", "gregorian", "both"];
function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      theme: APP_THEMES[parsed.theme] ? parsed.theme : "vintage",
      font: APP_FONTS[parsed.font] ? parsed.font : "default",
      fontSize: APP_FONT_SIZES[parsed.fontSize] ? parsed.fontSize : "medium",
      uiLang: APP_LANGUAGES[parsed.uiLang] ? parsed.uiLang : "fa",
      calendarSystem: CALENDAR_SYSTEMS.includes(parsed.calendarSystem) ? parsed.calendarSystem : "jalali",
      highlightColor: (parsed.highlightColor === "none" || HIGHLIGHT_COLOR_PALETTE.includes(parsed.highlightColor)) ? parsed.highlightColor : HIGHLIGHT_COLOR_PALETTE[0],
      mascotOutfit: LINGOVA_OUTFIT_KEYS.includes(parsed.mascotOutfit) ? parsed.mascotOutfit : "classic",
      // آیا آدمکِ متحرکِ Lingova نمایش داده بشه یا نه — پیش‌فرض روشنه؛ خاموش
      // کردنش آدمک رو حذف نمی‌کنه، فقط با ترنزیشنِ opacity محو می‌شه (خودِ
      // راه‌رفتن/تایمرهاش پشتِ صحنه ادامه دارن، فقط دیده نمی‌شه).
      mascotEnabled: parsed.mascotEnabled !== false,
    };
  } catch (e) {
    return { theme: "vintage", font: "default", fontSize: "medium", uiLang: "fa", calendarSystem: "jalali", highlightColor: HIGHLIGHT_COLOR_PALETTE[0], mascotOutfit: "classic", mascotEnabled: true };
  }
}
function saveAppPrefs(prefs) {
  try {
    localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

// --- Jalali (Persian) calendar conversion --------------------------------
// Well-known Gregorian→Jalali algorithm (accurate for the whole modern
// range we care about). Used to show saved-story timestamps in Shamsi,
// Gregorian, or both, based on the user's choice in Settings.
const PERSIAN_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function toFaDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    parseInt((gy2 + 3) / 4) -
    parseInt((gy2 + 99) / 100) +
    parseInt((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + parseInt(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + parseInt((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}
function formatJalaliDateTime(date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const jmStr = String(jm).padStart(2, "0");
  const jdStr = String(jd).padStart(2, "0");
  // فرمتِ خواسته‌شده: ۱۴۰۵/۰۵/۲۰     ۲۰:۱۱ — سال/ماه/روزِ عددی (هرکدوم
  // دو رقمی با صفرِ ابتدایی)، بعد چند فاصله‌ی ثابت (با نویسه‌ی nbsp تا
  // مرورگر جمعشون نکنه)، بعد ساعت:دقیقه.
  return toFaDigits(`${jy}/${jmStr}/${jdStr}\u00A0\u00A0\u00A0\u00A0\u00A0${hh}:${mm}`);
}
function formatGregorianDateTime(date) {
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
// calendarSystem: "jalali" | "gregorian" | "both"
function formatSavedDate(iso, calendarSystem) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  if (calendarSystem === "gregorian") return formatGregorianDateTime(date);
  if (calendarSystem === "both") return `${formatJalaliDateTime(date)} — ${formatGregorianDateTime(date)}`;
  return formatJalaliDateTime(date);
}

// ---------------------------------------------------------------------------
// مرتب‌سازیِ داستان‌های ذخیره‌شده — «نام» یه داستان همون لغاتِ انتخابیِ
// ذخیره‌شده باهاشه (چیزی که زیرِ هر کارت هم نشون داده می‌شه)، و «اندازه»
// همون تعدادِ کلمه‌های کلِ داستانه (چون داستان‌ها فایل جداگونه نیستن که
// حجمِ بایتی معنی‌دار داشته باشن).
const SAVED_STORIES_SORT_OPTIONS = [
  { key: "newest", fa: "جدیدترین تاریخ", en: "Newest date" },
  { key: "oldest", fa: "قدیمی‌ترین تاریخ", en: "Oldest date" },
  { key: "wordsDesc", fa: "بیشترین تعداد کلمه", en: "Most words" },
  { key: "wordsAsc", fa: "کمترین تعداد کلمه", en: "Fewest words" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
];

function getStoryWordCount(entry) {
  const paragraphs = entry?.paragraphs || [];
  let count = 0;
  for (const p of paragraphs) {
    for (const s of p?.sentences || []) {
      const text = (s?.text || "").trim();
      if (text) count += text.split(/\s+/).filter(Boolean).length;
    }
  }
  return count;
}

function getStoryNameKey(entry) {
  return (entry?.selectedWords || []).join("، ").trim();
}

function sortSavedStories(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case "oldest":
      return arr.sort((a, b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
    case "wordsDesc":
      return arr.sort((a, b) => getStoryWordCount(b) - getStoryWordCount(a));
    case "wordsAsc":
      return arr.sort((a, b) => getStoryWordCount(a) - getStoryWordCount(b));
    case "nameAsc":
      return arr.sort((a, b) => getStoryNameKey(a).localeCompare(getStoryNameKey(b), "fa"));
    case "nameDesc":
      return arr.sort((a, b) => getStoryNameKey(b).localeCompare(getStoryNameKey(a), "fa"));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  }
}

// دکمه‌ی «مرتب‌سازی» + منوی کشویی — با ظاهر و رفتاری شبیه به Sort byِ
// سیستم (یه دکمه که با تپ، لیستِ گزینه‌ها رو باز می‌کنه).
function SavedStoriesSortMenu({ sortKey, setSortKey, uiLang }) {
  const [open, setOpen] = useState(false);
  const lang = uiLang === "en" ? "en" : "fa";
  const current = SAVED_STORIES_SORT_OPTIONS.find((o) => o.key === sortKey) || SAVED_STORIES_SORT_OPTIONS[0];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: lang === "en" ? fontLatin : fontFa,
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 14,
          border: `1px solid ${colors.cardBorder}`,
          backgroundColor: "white",
          color: colors.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        ⇅ {tr("sortByLabel", lang)}: {current[lang]}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              [lang === "en" ? "left" : "right"]: 0,
              zIndex: 41,
              backgroundColor: "white",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            {SAVED_STORIES_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setSortKey(opt.key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: lang === "en" ? "left" : "right",
                  fontFamily: lang === "en" ? fontLatin : fontFa,
                  fontSize: 13,
                  fontWeight: opt.key === sortKey ? 700 : 500,
                  padding: "9px 14px",
                  border: "none",
                  backgroundColor: opt.key === sortKey ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {opt[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// دکمه‌ی «مرتب‌سازی» عمومی — دقیقاً همون ظاهر/رفتارِ SavedStoriesSortMenu
// (تبِ داستان‌ساز)، ولی به‌جای قفل‌شدن رویِ گزینه‌های اختصاصیِ داستان‌ها،
// یه آرایه‌ی options دلخواه می‌گیره — تا هم تبِ لغات/Vocabulary in
// Use/اسلنگ/علاقه‌مندی‌ها (WordList) و هم تبِ «لغات ذخیره‌شده»
// (SavedWordsPanel) بتونن با گزینه‌های خودشون همینو استفاده کنن، بدونِ
// تکرارِ کدِ منویِ کشویی.
function GenericSortMenu({ sortKey, setSortKey, options, uiLang }) {
  const [open, setOpen] = useState(false);
  const lang = uiLang === "en" ? "en" : "fa";
  const current = options.find((o) => o.key === sortKey) || options[0];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: lang === "en" ? fontLatin : fontFa,
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 14,
          border: `1px solid ${colors.cardBorder}`,
          backgroundColor: "white",
          color: colors.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        ⇅ {tr("sortByLabel", lang)}: {current[lang] ?? current.label}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              [lang === "en" ? "left" : "right"]: 0,
              zIndex: 41,
              backgroundColor: "white",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setSortKey(opt.key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: lang === "en" ? "left" : "right",
                  fontFamily: lang === "en" ? fontLatin : fontFa,
                  fontSize: 13,
                  fontWeight: opt.key === sortKey ? 700 : 500,
                  padding: "9px 14px",
                  border: "none",
                  backgroundColor: opt.key === sortKey ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {opt[lang] ?? opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// گزینه‌های مرتب‌سازیِ لیستِ لغات (تب‌های لغات/Vocabulary in
// Use/اسلنگ/علاقه‌مندی‌ها) — این لغات تاریخِ ذخیره‌سازی ندارن (یه دیکشنریِ
// ثابتن)، پس فقط بر اساسِ نام (الفبا) و سطحِ CEFR مرتب می‌شن.
const WORD_LIST_SORT_OPTIONS = [
  { key: "default", fa: "پیش‌فرض", en: "Default" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
  { key: "levelAsc", fa: "سطح: ساده ← سخت", en: "Level: easy → hard" },
  { key: "levelDesc", fa: "سطح: سخت ← ساده", en: "Level: hard → easy" },
];
const WORD_LIST_LEVEL_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
function sortWordListEntries(list, sortKey) {
  if (!sortKey || sortKey === "default") return list;
  const arr = [...list];
  const levelRank = (w) => WORD_LIST_LEVEL_ORDER[w?.level] ?? 99;
  switch (sortKey) {
    case "nameAsc":
      return arr.sort((a, b) => (a.en || "").localeCompare(b.en || ""));
    case "nameDesc":
      return arr.sort((a, b) => (b.en || "").localeCompare(a.en || ""));
    case "levelAsc":
      return arr.sort((a, b) => levelRank(a) - levelRank(b));
    case "levelDesc":
      return arr.sort((a, b) => levelRank(b) - levelRank(a));
    default:
      return arr;
  }
}

// گزینه‌های مرتب‌سازیِ «لغات ذخیره‌شده» (تبِ ذخیره‌شده‌ها) — این‌ها برخلافِ
// بالا savedAt دارن (وقتی از پاپ‌آپِ لغت/داستان‌ساز ذخیره می‌شن)، پس
// جدیدترین/قدیمی‌ترین هم به گزینه‌ها اضافه می‌شه.
const SAVED_WORDS_SORT_OPTIONS = [
  { key: "newest", fa: "جدیدترین تاریخ", en: "Newest date" },
  { key: "oldest", fa: "قدیمی‌ترین تاریخ", en: "Oldest date" },
  { key: "nameAsc", fa: "نام: الف ← ی", en: "Name: A → Z" },
  { key: "nameDesc", fa: "نام: ی ← الف", en: "Name: Z → A" },
];
function sortSavedWordEntries(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case "oldest":
      return arr.sort((a, b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
    case "nameAsc":
      return arr.sort((a, b) => (a.word || "").localeCompare(b.word || ""));
    case "nameDesc":
      return arr.sort((a, b) => (b.word || "").localeCompare(a.word || ""));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  }
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
// نسخه‌ی انگلیسیِ همون برچسب‌های نوعِ دستوریِ بالا — کلیدها دقیقاً همونن،
// فقط برای حالتی که زبانِ نرم‌افزار (uiLang) روی English باشه.
const POS_EN = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  pronoun: "pronoun",
  conjunction: "conjunction",
  article: "article",
  interjection: "interjection",
  numeral: "numeral",
  auxiliary: "auxiliary verb",
  other: "other",
  determiner: "determiner",
  exclamation: "exclamation",
  "modal verb": "modal verb",
  number: "number",
  "ordinal number": "ordinal number",
  "indefinite article": "indefinite article",
  "definite article": "definite article",
  "linking verb": "linking verb",
  "infinitive marker": "infinitive marker",
  idiom: "idiom",
  slang: "slang",
};
function posLabel(pos, uiLang) {
  const table = uiLang === "en" ? POS_EN : POS_FA;
  return table[pos] || pos;
}

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

// نامِ صداهای Neural مایکروسافت (Edge Read Aloud / Azure) برای مسیرِ
// آنلاینِ جایگزین — این سرویس برخلافِ Google-Translate-TTS/StreamElements
// برای همه‌ی این زبون‌ها (از جمله فارسی/عربی/ایتالیایی/هندی/کره‌ای/روسی/
// ژاپنی که قبلاً بی‌صدا شکست می‌خوردن) صدای واقعی داره.
const EDGE_TTS_VOICE = {
  fa: "fa-IR-DilaraNeural",
  en: "en-US-AriaNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
  fr: "fr-FR-DeniseNeural",
  ar: "ar-SA-ZariyahNeural",
  tr: "tr-TR-EmelNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ru: "ru-RU-SvetlanaNeural",
  it: "it-IT-ElsaNeural",
  ko: "ko-KR-SunHiNeural",
  ja: "ja-JP-NanamiNeural",
  hi: "hi-IN-SwaraNeural",
  ga: "ga-IE-OrlaNeural",
  uk: "uk-UA-PolinaNeural",
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
// There is no per-word highlighting anymore — no onboundary tracking, no
// word-position estimation. Pause/resume/repeat just track which SENTENCE
// is currently playing.
// ---------------------------------------------------------------------------

const speechController = (() => {
  let fullText = "";
  let chunks = []; // [{start, end, text}] sentence-sized chunks of fullText
  let chunkIndex = 0; // index into chunks of the sentence currently playing/paused
  let key = null; // `${locale}::${text}` — identifies what's currently loaded
  let locale = "en-US";
  let status = "idle"; // "idle" | "playing" | "paused"
  let rate = Number(localStorage.getItem("phrasebook-tts-rate")) || 1; // 0.25 (slow) .. 2 (fast), 1 = normal
  // بی‌صداکردنِ خروجیِ صوتیِ خودِ خوانش (TTS/آنلاین) — برای کسی که یه
  // نرم‌افزارِ جداگانه (مثلاً یه پخش‌کننده/screen reader دیگه رویِ گوشی)
  // صدایِ خودش رو داره و نمی‌خواد صدایِ این اپ باهاش تداخل کنه؛ هایلایت و
  // پیش‌رفتنِ جمله‌به‌جمله دقیقاً عادی ادامه پیدا می‌کنه، فقط صدا خاموشه.
  let muted = localStorage.getItem("phrasebook-tts-muted") === "1";
  // "local" = TTS خود گوشی (speechSynthesis) | "online" = سرویس رایگان
  // آنلاین (وقتی گوشی اصلاً صدایی برای اون زبون نصب نداره).
  let mode = "local";
  // پیش‌بارگذاریِ فهرستِ صداهای گوشی: روی خیلی از مرورگرهای موبایل (به‌خصوص
  // Chrome/Android)، اولین باری که getVoices() صدا زده می‌شه لیست خالی
  // برمی‌گرده، تا رویدادِ voiceschanged بعداً شلیک بشه. چون toggle() پایین‌تر
  // دقیقاً همون‌لحظه که کاربر دکمه رو می‌زنه getVoices() رو چک می‌کنه، این
  // خالی‌بودنِ موقت باعث می‌شد حتی برای زبون‌هایی مثل انگلیسی (که قطعاً روی
  // گوشی صدا دارن) نتیجه «no-local-voice» بشه و اصلاً هیچی خونده نشه. این‌جا
  // همون اولِ کار، هم یه‌بار زودهنگام getVoices() صدا زده می‌شه (که خودش روی
  // خیلی مرورگرها بارگذاریِ لیست رو تریگر می‌کنه)، هم به voiceschanged گوش
  // می‌دیم تا لیست هرچه زودتر آماده باشه.
  // voicesEverLoaded / controllerInitTime: صرفاً برای تشخیصِ «گوشی اصلاً
  // موتور TTS نداره» از «فهرستِ صداها هنوز لود نشده» — پایین‌تر، توضیحِ
  // کامل‌تر همون‌جا که استفاده می‌شه.
  let voicesEverLoaded = false;
  const controllerInitTime = Date.now();
  function markVoicesLoadedIfAny() {
    try {
      if (window.speechSynthesis.getVoices().length > 0) voicesEverLoaded = true;
    } catch (e) {}
  }
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      markVoicesLoadedIfAny();
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        window.speechSynthesis.getVoices();
        markVoicesLoadedIfAny();
      });
    }
  } catch (e) {}
  // اگه هیچ‌کدوم از سرویس‌های آنلاینِ جایگزین حتی یه تکه هم صدا پخش نکردن
  // (یعنی گوشی برای این زبون صدای محلی نداشت، و مسیرِ آنلاین هم کلاً شکست
  // خورد — مثلاً به‌خاطرِ بلاک‌شدنِ دامنه‌ها یا قطعیِ اینترنت)، کلیدِ همون
  // سشن اینجا ذخیره می‌شه تا SpeakButton بتونه به‌جای سکوتِ کامل (که دقیقاً
  // شبیهِ «این زبون اصلاً پشتیبانی نمی‌شه» به‌نظر می‌رسه)، واقعاً یه خطا به
  // کاربر نشون بده.
  let ttsError = null;
  // --- تکرار سراسری ---------------------------------------------------
  let globalRepeatSetting = (() => {
    const saved = localStorage.getItem("phrasebook-tts-repeat");
    if (saved === "inf") return "inf";
    const n = Number(saved);
    return n === 2 || n === 3 ? n : 0;
  })();
  let remaining = 0;
  let singleShot = false;
  // وقتی true باشه یعنی این سِشن با options.loop باز شده (مثلاً دکمه‌ی
  // مرکزیِ «پخشِ کل متن») — تنظیمِ تکرارِ سراسری (globalRepeatSetting) روش
  // اثر نمی‌ذاره؛ به‌جاش کلِ متن، از اول تا آخر، همیشه از سر گرفته می‌شه.
  let loopWholeText = false;
  // چند بار همین جمله/چانکِ فعلی (که مسیرِ محلیِ speakChunk داره می‌خونتش)
  // تا الان علاوه‌بر خواندنِ اولش تکرار شده — هر بار که واقعاً به یه چانکِ
  // *دیگه* بریم صفر می‌شه. با این، تکرارِ سراسری دیگه «کلِ متن رو از اول
  // دوباره بخون» نیست؛ «همین جمله رو N بار بخون، بعد برو جمله‌ی بعد»ه —
  // دقیقاً همون چیزی که دکمه‌ی 🔁 از اولش قرار بود بکنه (تکرار روی «هر
  // جمله‌ای که پخش می‌کنی»، نه کلِ پاراگراف). مسیرِ آنلاینِ جایگزین
  // (playOnlineChunk) عمداً دست‌نخورده مونده و هنوز کلِ متن رو تکرار
  // می‌کنه، چون چانک‌بندیِ اونجا (onlineChunks) بر اساسِ طولِ کاراکتر
  // نیست بر اساسِ مرزِ جمله، پس با مرزِ خط/جمله یکی نیست.
  let chunkRepeatsDone = 0;
  // --- تکرارِ A-B (بازه‌ی دلخواهِ بینِ دو جمله، با دکمه‌ی گردِ A-B رویِ
  // پلیر) --------------------------------------------------------------
  // چون پخشِ TTS پیوسته نیست (هر جمله یه utterance جداست، نه یه فایلِ
  // صوتیِ یکپارچه با currentTime)، اینجا A و B به‌جایِ زمان، شماره‌ی
  // جمله (chunkIndex) هستن — یعنی «از جمله‌ی X تا جمله‌ی Y رو تکرار کن».
  // abState: "idle" (بدونِ بازه) -> "waitingB" (A ثبت شده، منتظرِ B) ->
  // "looping" (هر دو ثبت شدن، بعد از رسیدن به آخرِ جمله‌ی B برمی‌گرده به A).
  let abState = "idle";
  let abChunkA = null;
  let abChunkB = null;
  // اگه تکرارِ سراسری رو «بی‌نهایت» بذاری، طبقِ همون توضیحِ بالا («همین جمله
  // رو N بار بخون، بعد برو جمله‌ی بعد») باید یه جایی این N تموم بشه وگرنه
  // پخش برای همیشه رو همون جمله‌ی اول گیر می‌کنه و هیچ‌وقت به جمله‌های
  // بعدی (وسط/آخرِ متن) نمی‌رسه — دقیقاً همون هنگ‌کردن/ادامه‌ندادنی که
  // باعثش می‌شه. برای همینه که «بی‌نهایت» رو، فقط وقتی متن بیش از یه جمله
  // داره، به یه عددِ خیلی بزرگ ولی محدود سقف می‌زنیم؛ برای متنِ تک‌جمله‌ای
  // (مثلاً یه کلمه/عبارتِ تنها) هیچ جمله‌ی بعدی‌ای برای رسیدن بهش نیست، پس
  // همون‌جا واقعاً بی‌نهایت (تا کاربر خودش خاموشش کنه) می‌مونه.
  const CHUNK_REPEAT_INFINITE_CAP = 40;
  // وقتی خودمون عمداً speechSynthesis.cancel() صدا می‌زنیم (برای مکث یا
  // شروع پخش جدید)، مرورگر یه onerror با error="interrupted" شلیک می‌کنه که
  // خطای واقعی نیست. این فلگ همون قطع‌شدن‌های عمدی رو از خطای واقعی جدا می‌کنه.
  let expectingCancel = false;
  // ---------------------------------------------------------------------
  // «نقطه‌ی ادامه»ی سراسری و خودکار برای هر متن — کلیدش همون کلیدِ
  // speechController (`${locale}::${text}`) است. هر بار که وضعیتِ فعلی
  // (چه در حالِ پخش، چه مکث‌شده) اعلام می‌شه، آخرین آفستِ رسیده‌شده برای
  // همون کلید اینجا ذخیره می‌شه. این باعث می‌شه اگه به هر دلیلی (توقفِ
  // کاملِ speechController.stop()، یا شروعِ پخشِ یه متنِ دیگه روش) پخشِ این
  // متن قطع بشه، دفعه‌ی بعد که همین متن دوباره خواسته بشه (از هر دکمه‌ای،
  // در هر حالتی)، به‌جای از اول، از همون نقطه ادامه پیدا کنه — مگر اینکه
  // خودِ صدازننده صریحاً یه startCharOffset دیگه بده. با پایان‌یافتنِ
  // طبیعیِ کاملِ متن (بدونِ تکرارِ باقی‌مونده)، نقطه‌ش پاک می‌شه تا دفعه‌ی
  // بعد از اول شروع بشه.
  const lastOffsetByKey = new Map();
  // کدِ زبانِ (نه لوکِیل — همون چیزی که به toggle داده می‌شه، مثلاً "en")
  // سشنِ فعلاً بارشده — فقط برای وقتی لازمه که سشنِ فعلی قطع می‌شه و باید
  // بعداً دوباره باهاش toggle صدا بزنیم (پایین‌تر، pendingResume).
  let currentCode = null;
  // وقتی یه سشنِ «خواندنِ پیوسته‌ی متنِ اصلی» (loopWholeText) با کلیک روی
  // یه پخشِ تکیِ دیگه (مثلاً پخشِ یه کلمه از پاپ‌آپِ معنیِ لغت) وسط‌راه قطع
  // بشه، اطلاعاتِ لازم برای برگشتن بهش اینجا نگه داشته می‌شه: متنِ اصلی،
  // کدِ زبانش، و نقطه‌ای که توش قطع شده. بعد از اینکه اون پخشِ تکی کاملاً
  // تمام شد (با هر چند بار تکراری که کاربر روش گذاشته بود)، سه ثانیه بعد
  // همین‌جا ازش استفاده می‌شه تا خواندنِ متنِ اصلی خودکار از همون نقطه
  // ادامه پیدا کنه.
  let pendingResume = null; // { text, code, offset } | null
  let resumeTimer = null;

  function clearPendingResume() {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
    pendingResume = null;
  }

  function scheduleResumeIfPending() {
    if (!pendingResume) return;
    const toResume = pendingResume;
    pendingResume = null;
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      controller.toggle(toResume.text, toResume.code, toResume.offset, { loop: true });
    }, 3000);
  }
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
  // آیا توی همین سشنِ آنلاینِ فعلی، حتی یه تکه‌صدا هم واقعاً شروع به پخش
  // کرده؟ اگه اولین تکه شکست بخوره و این هنوز false باشه، یعنی کلِ مسیرِ
  // آنلاین از همون اول خراب بوده (نه یه قطعیِ موقتِ وسطِ‌راه) — پس به‌جای
  // رد شدنِ بی‌صدا از همه‌ی تکه‌های باقی‌مونده، باید متوقف بشیم و خطا بدیم.
  let onlineAnyAudioPlayed = false;

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

  // -------------------------------------------------------------------
  // Edge/Azure Neural TTS — قبلاً اینجا مستقیم از خودِ صفحه یه وب‌سوکت به
  // speech.platform.bing.com باز می‌شد، ولی چون Origin صفحه یه دامنه‌ی
  // معمولیه (نه خودِ اپلیکیشنِ Edge)، سرورِ مایکروسافت همیشه رد می‌کرد و
  // اتصال با "failed" می‌افتاد — این یه محدودیتِ ذاتیه، نه یه باگِ قابلِ
  // رفع از سمتِ کلاینت. برای همین این درخواست رو به بک‌اندِ Cloudflare
  // Worker خودمون (همونی که برای AI chat استفاده می‌شه — src/index.js)
  // فرستادیم؛ اونجا سمتِ سرور (بدونِ محدودیتِ Origin) وب‌سوکت رو به
  // مایکروسافت وصل می‌کنه، mp3 رو می‌گیره، و یه فایلِ صوتیِ ساده
  // برمی‌گردونه — از دیدِ اینجا دقیقاً مثلِ یه URLِ معمولی (مثلِ
  // Google-Translate-TTS/StreamElements)، بدونِ نیاز به هیچ منطقِ
  // وب‌سوکت/GEC-token توی خودِ اپ.
  // -------------------------------------------------------------------

  // فهرستِ سرویس‌های آنلاینِ جایگزین برای یه تکه‌متن، به‌ترتیبِ اولویت:
  // اول پراکسیِ Edge/Azureِ خودمون (پوششِ کاملِ همه‌ی زبون‌ها از جمله فارسی
  // و عربی، که Google-Translate-TTS اصلاً پشتیبانی‌شون نمی‌کنه)، بعد
  // Google-Translate-TTS و StreamElements به‌عنوانِ پشتیبان اگه به هر
  // دلیلی خودِ Worker دردسترس نبود.
  // برای فارسی/عربی، Google-Translate-TTS (۴۰۴ می‌ده) و StreamElements
  // (۴۰۱ می‌ده) اصلاً کار نمی‌کنن — امتحان‌کردن‌شون فقط باعثِ تأخیر و یه
  // خطای اضافه توی کنسول می‌شه، برای همین فقط پراکسیِ Edge رو برمی‌گردونیم.
  function onlineTtsProviders(chunkText, langCode) {
    const voice = EDGE_TTS_VOICE[langCode] || EDGE_TTS_VOICE.en;
    const q = encodeURIComponent(sanitizeForTTS(chunkText));
    const edgeProxy = { kind: "url", url: `${DEFAULT_BACKEND_URL}/api/tts?voice=${encodeURIComponent(voice)}&text=${q}` };
    if (langCode === "fa" || langCode === "ar") return [edgeProxy];
    const googleTranslate = { kind: "url", url: `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${q}` };
    const streamElements = { kind: "url", url: `https://api.streamelements.com/kappa/v2/speech?voice=${langCode}&text=${q}` };
    return [edgeProxy, googleTranslate, streamElements];
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

  // بازه‌ی A-B رو برایِ مسیرِ آنلاین هم اعمال می‌کنه — قبلاً این مسیر
  // (که فقط فارسی/عربی، یا وقتی گوشی صدایِ محلی نداره ازش استفاده می‌شه)
  // اصلاً abState رو چک نمی‌کرد و همیشه idx+1 می‌رفت، پس روی این زبون‌ها
  // دکمه‌ی A-B هیچ اثری نداشت. چون تکه‌بندیِ آنلاین (onlineChunks) با
  // تکه‌بندیِ جمله‌ایِ abChunkA/abChunkB (که رویِ chunks حساب می‌شن) یکی
  // نیست، اینجا با chunkIndexForOffset یه تخمینِ «این idx آنلاین معادلِ
  // کدوم جمله‌ست» می‌زنیم؛ وقتی به جمله‌یِ B یا بعدترش رسیدیم، به‌جایِ
  // idx+1 برمی‌گردیم به نزدیک‌ترین idx آنلاینِ معادلِ شروعِ جمله‌ی A.
  function nextOnlineIdx(idx) {
    const fallback = idx + 1;
    if (abState !== "looping" || abChunkB === null || abChunkA === null) return fallback;
    if (!onlineChunks.length || !fullText.length) return fallback;
    const approxChunk = chunkIndexForOffset(
      Math.min(fullText.length - 1, Math.floor((fallback / Math.max(onlineChunks.length, 1)) * fullText.length))
    );
    if (approxChunk < abChunkB) return fallback;
    const aStart = chunks[abChunkA] ? chunks[abChunkA].start : 0;
    const frac = Math.min(Math.max(aStart / fullText.length, 0), 1);
    return Math.min(onlineChunks.length - 1, Math.max(0, Math.floor(frac * onlineChunks.length)));
  }

  function playOnlineChunkUrls(providers, providerIndex, idx) {
    if (providerIndex >= providers.length) {
      if (!onlineAnyAudioPlayed) {
        // هیچ‌کدوم از سرویس‌های آنلاین حتی یه تکه هم پخش نشد — بقیه‌ی
        // تکه‌ها هم قطعاً همین‌طور شکست می‌خورن (چون علتش معمولاً کلیه:
        // بلاک‌بودنِ دامنه یا قطعیِ اینترنت، نه یه تکه‌ی خاص). به‌جای
        // رد شدنِ بی‌صدا از همه‌شون تا آخر (که دقیقاً همون چیزیه که باعث
        // می‌شه انگار این زبون اصلاً پشتیبانی نمی‌شه)، همین‌جا متوقف
        // می‌شیم و خطا رو گزارش می‌کنیم.
        ttsError = key;
        status = "idle";
        notify();
        return;
      }
      playOnlineChunk(nextOnlineIdx(idx));
      return;
    }
    const provider = providers[providerIndex];
    const goNext = () => {
      if (status !== "playing") return;
      playOnlineChunkUrls(providers, providerIndex + 1, idx);
    };

    const audio = new Audio(provider.url);
    audio.playbackRate = rate;
    audio.volume = muted ? 0 : 1;
    audio.onplaying = () => {
      onlineAnyAudioPlayed = true;
    };
    audio.onended = () => {
      if (status !== "playing") return;
      playOnlineChunk(nextOnlineIdx(idx));
    };
    audio.onerror = () => {
      goNext();
    };
    onlineAudio = audio;
    audio.play().catch(() => {
      goNext();
    });
  }

  function playOnlineChunk(idx) {
    if (idx >= onlineChunks.length) {
      if (abState === "looping" && abChunkA !== null && fullText.length) {
        const aStart = chunks[abChunkA] ? chunks[abChunkA].start : 0;
        const frac = Math.min(Math.max(aStart / fullText.length, 0), 1);
        playOnlineChunk(Math.min(onlineChunks.length - 1, Math.max(0, Math.floor(frac * onlineChunks.length))));
        return;
      }
      if (!singleShot && globalRepeatSetting === "inf") {
        playOnlineChunk(0);
        return;
      }
      if (!singleShot && remaining > 0) {
        remaining -= 1;
        playOnlineChunk(0);
        return;
      }
      if (key) lastOffsetByKey.delete(key);
      status = "idle";
      chunkIndex = 0;
      notify();
      scheduleResumeIfPending();
      return;
    }
    onlineChunkIndex = idx;
    chunkIndex = chunkIndexForOffset(
      Math.min(fullText.length - 1, Math.floor((idx / Math.max(onlineChunks.length, 1)) * fullText.length))
    );
    status = "playing";
    notify();
    playOnlineChunkUrls(onlineTtsProviders(onlineChunks[idx], onlineLangForTts), 0, idx);
  }

  function speakOnline(text, langCodeForTts, startCharOffset, forceSingle, forceLoop) {
    stopOnlineAudio();
    mode = "online";
    onlineAnyAudioPlayed = false;
    fullText = text;
    chunks = splitSentences(text);
    onlineChunks = splitForOnlineTts(text);
    onlineLangForTts = langCodeForTts;
    singleShot = !!forceSingle;
    loopWholeText = !!forceLoop;
    remaining = singleShot ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
    let startChunk = 0;
    if (Number.isInteger(startCharOffset) && startCharOffset > 0 && text.length && onlineChunks.length) {
      const frac = Math.min(Math.max(startCharOffset / text.length, 0), 1);
      startChunk = Math.min(onlineChunks.length - 1, Math.floor(frac * onlineChunks.length));
    }
    playOnlineChunk(startChunk);
  }

  function notify() {
    if (key && (status === "playing" || status === "paused") && chunks[chunkIndex]) {
      lastOffsetByKey.set(key, chunks[chunkIndex].start);
    }
    listeners.forEach((cb) =>
      cb({ key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, ttsError, muted, abState, abChunkA, abChunkB })
    );
  }

  // حداکثر چند کلمه تو یه تکه (chunk) بگنجه. این فقط یه دریچه‌ی اطمینانه
  // برای متنِ خیلی بلندِ بدونِ علامتِ‌نگارشی (مثلاً «خواندنِ کل لیستِ لغات»
  // که کلی کلمه با فاصله به‌هم چسبیده‌ن) — جمله‌های عادی (که تقریباً همیشه
  // کمتر از این عدد کلمه دارن) هیچ‌وقت بهش نمی‌رسن و کاملاً یک‌تکه و
  // یک‌نفس خونده می‌شن (ویرگولِ داخلِ جمله دیگه جایی برای شکستنِ چانک
  // نیست — بریدنِ گفتار سرِ هر ویرگول خودش مصنوعی به‌نظر می‌رسید؛ مکثِ
  // ویرگول رو حالا موتور خودش به‌طورِ طبیعی توی همون یک‌ utterance می‌سازه).
  const MAX_WORDS_PER_CHUNK = 40;

  // متن رو اول به جمله تقسیم می‌کنه (روی .!?؟ و غیره)، بعد فقط اگه یه
  // «جمله» به‌طرز غیرعادی بلند بود (یعنی احتمالاً اصلاً جمله نیست، یه بلوکِ
  // متنِ بدونِ نقطه‌ست) به تکه‌های چندکلمه‌ای می‌شکنه.
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
        out.push({ ...seg, boundary: "sentence" });
        continue;
      }
      for (let i = 0; i < wordPositions.length; i += MAX_WORDS_PER_CHUNK) {
        const lastIdx = Math.min(i + MAX_WORDS_PER_CHUNK, wordPositions.length) - 1;
        const isLastSub = lastIdx === wordPositions.length - 1;
        const wStart = wordPositions[i].start;
        const wEnd = wordPositions[lastIdx].end;
        out.push({
          start: seg.start + wStart,
          end: seg.start + wEnd,
          text: seg.text.slice(wStart, wEnd),
          boundary: isLastSub ? "sentence" : "none",
        });
      }
    }
    return out;
  }

  // چیزی که واقعاً باید با صدا خونده بشه — نه هر چی که روی صفحه نوشته شده.
  // گیومه‌های فارسی/عربی/انگلیسی/فرانسوی (« » " " ' ' „ ‟ ` ´) و نشونه‌های
  // نامرئیِ جهتِ‌متن (که برای رفعِ باگِ راست‌به‌چپ/چپ‌به‌راست به متن اضافه
  // می‌شن) هیچ‌کدوم معنایی برای گفتار ندارن؛ بعضی موتورهای TTS گوشی
  // (خصوصاً موتورهای آفلاین/محلی) به‌جای رد شدن ازشون، اسمشون رو با زبانِ
  // فعلی می‌خونن (یا باعثِ یه مکثِ عجیب می‌شن) — همینه که کاربر به‌عنوانِ
  // «گیومه‌ها و فاصله‌ها رو با هر زبونی که باشه می‌خونه» گزارش کرد. این
  // تابع فقط رویِ متنی که مستقیم به موتورِ گفتار داده می‌شه اثر می‌ذاره؛
  // به chunks[i].text یا آفست‌های start/end دست نمی‌زنه (اونا برای
  // sync/ادامه‌دادن از همون نقطه هنوز باید دقیقاً با متنِ اصلی یکی باشن).
  function sanitizeForTTS(s) {
    // علائمِ نگارشی‌ای که برای مکثِ طبیعیِ بینِ‌جمله/بند لازمن و نگه‌داشته
    // می‌شن — بقیه‌ی نشونه‌ها (ایموجی، #، @، %، &، پرانتز، بولت، و غیره)
    // پایین‌تر حذف می‌شن چون خیلی از موتورهای TTS به‌جای ردشدن ازشون،
    // اسم/توصیفِ لفظی‌شون رو می‌خونن.
    const KEEP_PUNCT = ".,!?;:،؛؟…";
    return String(s || "")
      .replace(/[\u2066-\u2069\u200B-\u200F\u061C\uFEFF]/g, "") // isolate marks/zero-width/bidi/BOM
      // ایموجی‌ها — صورتک/نماد/پرچم/تغییردهنده‌ی رنگِ‌پوست/دنباله‌های ZWJ و
      // انتخاب‌گرِ نمایشِ ایموجی. اکثرِ موتورهای TTS به‌جای رد شدن ازشون،
      // توصیفِ لفظی‌شون رو می‌خونن (مثلاً «😊» → «face with smiling eyes»)
      // که دقیقاً همون چیزیه که کاربر گزارش کرد.
      .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u20E3\uFE0F]/gu, "")
      // علامت‌های نقل‌قول رو در هر شکلی حذف می‌کنیم — چه گیومه‌ی فارسی/تایپوگرافیک
      // («» „ ‟ " " ' ')، چه گیومه‌ی ساده‌ی انگلیسیِ روی کیبورد (" و ') که قبلاً
      // حذف نمی‌شدن و همون چیزی بودن که باعثِ خونده‌شدنِ «گیومه» توسطِ موتورِ
      // TTS می‌شدن — صرف‌نظر از اینکه متن به چه زبونی باشه.
      .replace(/[«»‹›„‟""'''`´"']/g, "")
      // نشونه‌های باقی‌مونده‌ی مارک‌داون (اگه یه‌جایی قبل از رسیدن به اینجا
      // پاک نشده باشن) — بعضی موتورهای TTS این علامت‌ها رو هم لفظی می‌خونن.
      .replace(/[*_~]/g, "")
      // بقیه‌ی علائمِ نگارشی/نمادها (#، @، %، &، +، =، <، >، |، \، ^، پرانتز/
      // براکت، بولت، خط‌تیره‌ی تزئینی و ...) — چون خیلی از موتورها این‌ها رو
      // به‌جای سکوت، لفظی («هشتگ»، «امپرسند»، ...) می‌خونن. فقط علائمِ لازم
      // برای مکثِ طبیعیِ بینِ‌جمله (بالا در KEEP_PUNCT) دست‌نخورده می‌مونن؛
      // بقیه با یه فاصله جایگزین می‌شن تا کلمه‌های اطرافشون به‌هم نچسبن.
      .replace(/[\p{P}\p{S}]/gu, (ch) => (KEEP_PUNCT.includes(ch) ? ch : " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  function chunkIndexForOffset(offset) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (offset >= chunks[i].start) return i;
    }
    return 0;
  }

  // چیزی که موتورِ TTS واقعاً باهاش صدا کنیم. زیرِ حدودِ ۰.۴ اکثرِ موتورهای
  // مرورگر پروسودیِ طبیعی‌شون رو از دست می‌دن (مکثِ عجیب/تک‌کلمه‌خونی) —
  // برای همین اینجا پایین‌تر از ۰.۴ نمی‌ریم. مکثِ سرِ ویرگول رو دیگه خودِ
  // موتور، داخلِ همون یک utterance، به‌طورِ طبیعی می‌سازه — نه ما با شکستنِ
  // دستی. سرعتِ واقعیِ حس‌شده رو مکثِ بینِ‌جمله‌ها (sentenceGapMs) تکمیل
  // می‌کنه که کاملاً دستِ خودمونه.
  function engineRate(r) {
    if (r >= 1) return r;
    // r در بازه‌ی [0.25 .. 1] → engine rate در بازه‌ی [0.4 .. 1]
    return 0.4 + ((r - 0.25) / 0.75) * 0.6;
  }

  // مکثِ بعد از پایانِ یه جمله‌ی واقعی — تنها جایی که خودمون دستی مکث
  // اضافه می‌کنیم؛ چون سرِ مرزِ دو جمله‌ی جداست، مصنوعی به‌نظر نمی‌رسه.
  function sentenceGapMs(r) {
    const base = 360;
    return Math.round(base / Math.min(Math.max(r, 0.2), 2));
  }

  // 🔥 انتخاب صدای بهتر (Google Voices در کروم/اج)
  function getBestVoice(langCode) {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split("-")[0];

    // اگه کاربر خودش از تنظیمات یه صدای مشخص برای این زبون انتخاب کرده
    // (از بینِ صداهایی که گوشی‌اش واقعاً نصب داره)، همیشه همون اولویت داره.
    try {
      const savedURI = loadVoicePrefs()[langPrefix];
      if (savedURI) {
        const savedVoice = voices.find(v => v.voiceURI === savedURI);
        if (savedVoice) return savedVoice;
      }
    } catch (e) {}

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

  function speakChunk(idx, forceRestart = false, isRepeatContinuation = false) {
    if (!chunks.length) {
      status = "idle";
      notify();
      return;
    }
    if (idx >= chunks.length) {
      // به آخرِ کلِ متن رسیدیم. تکرارِ سراسری دیگه اینجا اثری نداره — چون
      // اگه روشن بود، همین‌الان قبلاً به‌ازای هر جمله/خط، جدا جدا اعمال
      // شده (پایین‌تر، توی utter.onend). فقط سِشن‌های «loop»ی (پخشِ همیشگیِ
      // کل متن) اینجا از اول شروع می‌شن.
      if (!singleShot && loopWholeText) {
        speakChunk(0, true);
        return;
      }
      if (key) lastOffsetByKey.delete(key);
      status = "idle";
      chunkIndex = 0;
      notify();
      scheduleResumeIfPending();
      return;
    }

    clearGapTimer();
    if (forceRestart) cancelSpeech();
    chunkIndex = idx;
    if (!isRepeatContinuation) chunkRepeatsDone = 0;
    status = "playing";
    notify();

    const utter = new SpeechSynthesisUtterance(sanitizeForTTS(chunks[idx].text));
    utter.lang = locale;
    utter.rate = engineRate(rate);
    utter.volume = muted ? 0 : 1;

    const bestVoice = getBestVoice(locale);
    if (bestVoice) utter.voice = bestVoice;

    utter.onend = () => {
      if (status !== "playing") return;
      // فقط سرِ پایانِ یه جمله‌ی واقعی مکثِ دستی می‌ذاریم؛ تکه‌های حاصل از
      // شکستنِ اضطراریِ وسطِ متنِ خیلی‌بلند (boundary: "none") بدونِ مکثِ
      // اضافه پشتِ‌سرِهم ادامه پیدا می‌کنن.
      const boundary = chunks[idx] && chunks[idx].boundary;
      const gap = boundary === "sentence" ? sentenceGapMs(rate) : 0;

      // تکرارِ سراسری (اگه روشن باشه) اینجا اعمال می‌شه: قبل از رفتن سراغِ
      // جمله‌ی بعد، همینِ جمله‌ی همین‌الان‌تمام‌شده رو دوباره می‌خونه — به
      // تعدادِ تنظیمِ ۳/۶/بی‌نهایت. فقط وقتی این تعداد کامل شد (یا تکرار
      // خاموش بود)، نوبتِ جمله‌ی بعدی می‌رسه. توجه: این دیگه به loopWholeText
      // بستگی نداره — چون همه‌ی دکمه‌های 🔊 (کنار هر خط) الان با
      // options.loop=true صدا زده می‌شن (برای اینکه رسیدن به آخرِ متن به‌جای
      // توقف، از اول ادامه پیدا کنه)، و اگه اینجا رو به loopWholeText گیر
      // می‌دادیم، همون true‌بودنش باعث می‌شد تکرارِ هر خط/جمله کلاً غیرفعال
      // بشه — دقیقاً همون باگی که کاربر گزارش کرد (دکمه‌ی تکرار ۳/۶/∞ اثر
      // نداشت). loopWholeText فقط پایین‌تر، توی speakChunk، برای تصمیمِ
      // «رسیدن به آخرِ متن → از اول شروع کن یا نه» استفاده می‌شه؛ اینجا
      // فقط singleShot (پخشِ تک‌ضربه‌ی بدونِ تکرار و بدونِ لوپ) باید
      // خاموشش کنه.
      if (!singleShot) {
        const isMultiChunk = chunks.length > 1;
        // تنظیمِ تکرار یعنی «کلاً N بار خونده بشه»، نه «N بار اضافه بر
        // خوندنِ اولش». چون همینِ خط داره برای اولین‌بار تمومِ خوندنش رو
        // اعلام می‌کنه (یعنی همون ۱ بار اول قبلاً اتفاق افتاده)، فقط N-1
        // بارِ اضافه لازمه تا جمعاً به N برسه — قبلاً این -1 نبود و برای
        // مثلاً تنظیمِ ۳، در واقع ۴ بار خونده می‌شد.
        const repeatTarget =
          globalRepeatSetting === "inf"
            ? isMultiChunk
              ? CHUNK_REPEAT_INFINITE_CAP
              : Infinity
            : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
        if (chunkRepeatsDone < repeatTarget) {
          chunkRepeatsDone += 1;
          gapTimer = setTimeout(() => {
            gapTimer = null;
            speakChunk(idx, false, true);
          }, gap);
          return;
        }
      }

      // اگه تکرارِ A-B روشنه و همین‌الان جمله‌ی B تمام شد، به‌جایِ رفتن سراغِ
      // جمله‌ی بعد، برمی‌گردیم سرِ جمله‌ی A — همون مکانیزمِ لوپی که قبلاً
      // برایِ صوتِ آپلودی (useStoryUserAudio) ساختیم، اینجا بر حسبِ
      // شماره‌ی جمله به‌جایِ ثانیه.
      const nextIdx =
        abState === "looping" && abChunkB !== null && idx === abChunkB ? abChunkA : chunkIndex + 1;
      gapTimer = setTimeout(() => {
        gapTimer = null;
        speakChunk(nextIdx, false, false);
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

  // این آبجکت به یه نامِ ثابت (controller) نگه داشته می‌شه، نه فقط return
  // مستقیم — چون scheduleResumeIfPending (بالاتر) برای برگشتِ خودکار به
  // متنِ اصلی، بعد از تمام‌شدنِ پخشِ یه کلمه‌ی تکی، خودش دوباره controller.toggle
  // رو صدا می‌زنه.
  const controller = {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState() {
      return { key, status, chunkIndex, total: chunks.length, rate, globalRepeatSetting, remaining, muted, abState, abChunkA, abChunkB };
    },
    // دکمه‌ی گردِ A-B رویِ پلیر همینِ یه تابع رو صدا می‌زنه؛ خودش وضعیتِ
    // فعلی رو می‌چرخونه: idle -> waitingB -> looping -> idle.
    markAB() {
      if (!chunks.length) return abState;
      if (abState === "idle") {
        abChunkA = chunkIndex;
        abState = "waitingB";
      } else if (abState === "waitingB") {
        if (chunkIndex < abChunkA) {
          abChunkB = abChunkA;
          abChunkA = chunkIndex;
        } else {
          abChunkB = chunkIndex;
        }
        abState = "looping";
      } else {
        abChunkA = null;
        abChunkB = null;
        abState = "idle";
      }
      notify();
      return abState;
    },
    clearAB() {
      abChunkA = null;
      abChunkB = null;
      abState = "idle";
      notify();
    },
    // آفستِ کاراکتریِ شروعِ جمله‌ای که همین الان (یا آخرین‌بار) در حال
    // پخشه — فقط برای «ادامه‌ی پخش از همون‌جا» وقتی متنِ در حال پخش عوض
    // می‌شه (مثلاً تغییرِ حالتِ نمایش ترجمه) لازمه. دیگه هیچ‌جا برای
    // هایلایتِ بصری استفاده نمی‌شه.
    getCharOffset() {
      if (!chunks.length) return 0;
      const idx = Math.min(Math.max(chunkIndex, 0), chunks.length - 1);
      return chunks[idx].start;
    },
    getGlobalRepeatSetting() {
      return globalRepeatSetting;
    },
    cycleGlobalRepeat() {
      const order = [0, 2, 3, "inf"];
      const idx = order.indexOf(globalRepeatSetting);
      globalRepeatSetting = order[(idx + 1) % order.length];
      try {
        localStorage.setItem("phrasebook-tts-repeat", String(globalRepeatSetting));
      } catch (e) {}
      if (status === "playing" || status === "paused") {
        remaining = globalRepeatSetting === "inf" ? Infinity : Math.max(0, (Number(globalRepeatSetting) || 0) - 1);
      }
      notify();
    },
    // startCharOffset (اختیاری): آفستِ کاراکتری‌ای که پخش باید تقریباً از
    // جمله‌ی متناظرش شروع بشه — برای «ادامه از همون‌جا» بعد از تغییرِ متن.
    // نکته: toggle خودش پایین‌تر هم دوباره صدا زده می‌شه — از داخلِ
    // scheduleResumeIfPending، برای برگشتِ خودکار به متنِ اصلی بعد از پخشِ
    // یه کلمه‌ی تکی. برای همینه که این آبجکت به یه نامِ ثابت (controller)
    // نگه داشته می‌شه، نه فقط return مستقیم.
    toggle(text, code, startCharOffset, options) {
      try {
        if (!text) return "unsupported";
        const forceSingle = !!(options && options.singlePass);
        const forceLoop = !!(options && options.loop);
        const hasSynthesis = "speechSynthesis" in window;

        let newLocale = TTS_LOCALE[code] || "en-US";
        // فارسی و عربی: طبقِ تصمیمِ صریحِ کاربر، این دو زبون همیشه از سرویسِ
        // آنلاینِ رایگان (Edge/Azure ...) خونده می‌شن، نه از TTS خودِ گوشی —
        // چون کیفیت/وجودِ صدای محلی برای این دو زبون رو نمی‌شه مطمئن بود.
        // همه‌ی زبون‌های دیگه برعکس: فقط و فقط از TTS خودِ گوشی (بدونِ
        // نیاز به اینترنت) — حتی اگه گوشی صدایی براشون نصب نداشته باشه،
        // دیگه به‌صورتِ خودکار سراغِ سرویسِ آنلاین نمی‌ریم.
        const ONLINE_ONLY_LANGS = new Set(["fa", "ar"]);
        const forceOnlineForLang = ONLINE_ONLY_LANGS.has(code);

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
            // ادامه بعد از مکث — همون جمله‌ست، نه جمله‌ی جدید، پس شمارشِ
            // تکرارهاش (chunkRepeatsDone) نباید صفر بشه.
            speakChunk(chunkIndex, false, true);
          }
          return "ok";
        }

        // اگه همین‌الان یه سشنِ «خواندنِ پیوسته»(loopWholeText) واقعاً در حالِ
        // پخش بود و این متنِ تازه یه چیزِ دیگه‌ست (نه ادامه‌ی خودِ همون سشن —
        // چون اون حالت با return "ok"ِ بالا قبلاً رد شده)، قبل از رد شدن روش،
        // خودِ همون سشنِ قطع‌شده رو نگه می‌داریم: متنش، کدِ زبانش، و نقطه‌ای
        // که توش قطع شده — دقیقاً همون سناریوییه که کاربر روی یه کلمه‌ی وسطِ
        // متن کلیک می‌کنه (مثلاً از پاپ‌آپِ معنیِ لغت) تا تلفظش رو تنها
        // بشنوه. وقتی این پخشِ تکیِ لغت (با هر چند بار تکراری که کاربر
        // روش گذاشته) کاملاً تموم شد، سه ثانیه بعد خودکار از همینجا خواندنِ
        // متنِ اصلی ادامه پیدا می‌کنه. اگه سشنِ جدید هم خودش یه سشنِ پیوسته‌ی
        // دیگه‌ست (forceLoop — یعنی کاربر عمداً یه جمله‌ی دیگه از متنِ اصلی
        // رو زده)، این «برگشتِ خودکار» بی‌معنیه؛ پس فقط وقتی سشنِ جدید
        // تک‌ضربه‌ایه (بدونِ loop) این حافظه نگه داشته می‌شه.
        clearPendingResume();
        if ((status === "playing" || status === "paused") && loopWholeText && !forceLoop && key) {
          pendingResume = {
            text: fullText,
            code: currentCode,
            offset: chunks[chunkIndex] ? chunks[chunkIndex].start : 0,
          };
        }

        // متنِ کاملاً جدیدیه (نه ادامه/مکثِ همون قبلی) — بازه‌ی A-B که
        // مالِ متنِ قبلی بود دیگه معنی نداره، پاکش می‌کنیم.
        abChunkA = null;
        abChunkB = null;
        abState = "idle";
        // متن جدید — شمارنده‌ی تکرار از روی تنظیم سراسری تازه می‌شه
        const voices = hasSynthesis ? window.speechSynthesis.getVoices() : [];
        const baseLang = newLocale.split("-")[0].toLowerCase();
        const hasVoice = voices.some((v) => v.lang && v.lang.toLowerCase().startsWith(baseLang));

        key = newKey;
        locale = newLocale;
        currentCode = code;
        ttsError = null;

        // اگه صدازننده صریحاً آفستی نداده، ببین همین متن قبلاً (با توقفِ
        // کامل یا با پخشِ یه متنِ دیگه روش) نیمه‌کاره مونده بود یا نه —
        // اگه آره، به‌جای از اول، از همون نقطه ادامه می‌دیم.
        let effectiveStartOffset = startCharOffset;
        if (!(Number.isInteger(effectiveStartOffset) && effectiveStartOffset > 0)) {
          const saved = lastOffsetByKey.get(newKey);
          if (Number.isInteger(saved) && saved > 0) effectiveStartOffset = saved;
        }

        // نکته: قبلاً اینجا «voices.length === 0» هم مسیرِ محلی رو مجاز
        // می‌کرد — یعنی اگه فهرستِ صداهای گوشی هنوز اصلاً لود نشده بود
        // (یه رفتارِ شناخته‌شده و رایج در Chrome/Android که getVoices()
        // بارِ اول می‌تونه خالی برگرده تا رویدادِ voiceschanged شلیک بشه)،
        // کد فرض می‌کرد «حتماً یه صدایی هست» و مسیرِ محلی رو امتحان
        // می‌کرد — با هیچ صدایی برای رندر، که یعنی سکوتِ کامل و بدونِ
        // هیچ خطایی (چون utter.onerror همیشه هم شلیک نمی‌شه). حالا فقط
        // وقتی واقعاً یه صدای منطبق پیدا شده باشه می‌ریم سراغِ محلی؛
        // در غیرِ این‌صورت (چه صدایی نبود، چه فهرست هنوز خالی بود) مسیرِ
        // آنلاینِ جایگزین — که حالا خودش هم دیگه بی‌صدا شکست نمی‌خوره
        // (بالاتر، ttsError) — انتخاب می‌شه.
        // نکته‌ی مهمِ رفعِ باگ: «voices.length === 0» به این معنی نیست که
        // گوشی صدایی نداره — یعنی فهرستِ صداها هنوز لود نشده (رفتارِ شناخته‌
        // شده‌ی getVoices() قبل از شلیکِ voiceschanged، مخصوصاً روی
        // Chrome/Android). قبلاً اینجا این حالت هم مجاز بود؛ بعد به‌خاطرِ یه
        // باگِ دیگه سخت‌گیرتر شد (فقط hasVoice===true)، ولی همون سخت‌گیری
        // خودش باعث شد وقتی فهرست هنوز خالیه (که خیلی وقتا همینه، چون
        // getVoices() سنکرونه و شاید تا اون لحظه لود نشده باشه)، حتی
        // انگلیسی هم اصلاً پخش نشه. الان: وقتی صدای منطبق پیدا شده *یا*
        // فهرست هنوز کلاً خالیه (یعنی وضعیتش نامعلومه، نه قطعاً «نداره»)،
        // مسیرِ محلی رو امتحان می‌کنیم؛ فقط وقتی فهرست واقعاً لود شده و
        // مطمئنیم صدایی برای این زبون نیست، خطای no-local-voice می‌دیم.
        // اگه فهرستِ صداها از اولِ کارِ speechController (چند ثانیه پیش)
        // هیچ‌وقت حتی یه صدا هم نداشته (نه الان، نه هیچ‌وقتِ قبل‌تر)، دیگه
        // نمی‌شه گفت «هنوز لود نشده» — یعنی گوشی/مرورگر اصلاً هیچ موتورِ
        // TTSای نداره (نه فقط برای این زبون خاص). این حالت رو از حالتِ
        // «این زبون رو نداره ولی موتور TTS هست» جدا می‌کنیم چون راهِ حلِ
        // کاربر برای هرکدوم فرق می‌کنه (نصبِ کلِ موتور در برابرِ دانلودِ
        // صدای یه زبونِ خاص).
        const noTtsEngineAtAll =
          hasSynthesis && voices.length === 0 && !voicesEverLoaded && Date.now() - controllerInitTime > 4000;

        if (!forceOnlineForLang && hasSynthesis && !noTtsEngineAtAll && (hasVoice || voices.length === 0)) {
          mode = "local";
          stopOnlineAudio();
          fullText = text;
          chunks = splitSentences(text);
          status = "playing";
          singleShot = forceSingle;
          loopWholeText = !!forceLoop;
          remaining = forceSingle ? 0 : forceLoop ? Infinity : globalRepeatSetting === "inf" ? Infinity : Number(globalRepeatSetting) || 0;
          const startIdx = Number.isInteger(effectiveStartOffset) && effectiveStartOffset > 0
            ? chunkIndexForOffset(Math.min(effectiveStartOffset, Math.max(text.length - 1, 0)))
            : 0;
          speakChunk(startIdx, true);
          return "ok";
        }

        // اگه زبون جزوِ فارسی/عربی نبود و گوشی هم صدایی براش نداشت، دیگه
        // خودکار سراغِ اینترنت نمی‌ریم (طبقِ خواستِ کاربر: «فقط TTS گوشی،
        // بدونِ نیاز به اینترنت» برای همه‌ی زبون‌ها غیر از فارسی/عربی) —
        // به‌جاش یه خطای روشن نشون می‌دیم که کاربر صدای اون زبون رو از
        // تنظیماتِ گوشی نصب کنه.
        if (!forceOnlineForLang) {
          status = "idle";
          notify();
          return noTtsEngineAtAll ? "no-tts-engine" : "no-local-voice";
        }

        // مسیر آنلاینِ رایگان — فقط برای فارسی/عربی
        cancelSpeech();
        const onlineLang = code === "zh" ? "zh-CN" : code;
        speakOnline(text, onlineLang, effectiveStartOffset, forceSingle, forceLoop);
        return "online-fallback";
      } catch (e) {
        status = "idle";
        notify();
        return "error";
      }
    },
    stop() {
      clearPendingResume();
      cancelSpeech();
      stopOnlineAudio();
      mode = "local";
      key = null;
      chunks = [];
      status = "idle";
      chunkIndex = 0;
      remaining = 0;
      singleShot = false;
      loopWholeText = false;
      chunkRepeatsDone = 0;
      abState = "idle";
      abChunkA = null;
      abChunkB = null;
      notify();
    },
    // فقط وقتی متنِ اصلی (loopWholeText) در حال پخشه صدا می‌زنیم — مثلاً
    // همون لحظه که کاربر روی یه لغت/محدوده لمسِ طولانی می‌کنه و پاپ‌آپ باز
    // می‌شه، حتی اگه هنوز روی 🔊ِ خودِ پاپ‌آپ نزده باشه. پخشِ اصلی رو فوراً
    // مکث می‌کنیم و نقطه‌ی دقیقِ توقف رو (مثلِ همون منطقِ توقفِ toggle) به
    // pendingResume می‌سپاریم، بعد سه ثانیه بعد خودکار از همونجا ادامه پیدا
    // می‌کنه — مگر اینکه تا اون موقع کاربر خودش 🔊ِ پاپ‌آپ رو بزنه، که اونجا
    // toggle خودش (پایین‌تر) این pendingResume رو با نسخه‌ی تازه‌تر
    // (بعد از تمومِ خواندنِ همون لغت) جایگزین می‌کنه.
    pauseForFocus() {
      if (status !== "playing" || !loopWholeText) return false;
      clearPendingResume();
      pendingResume = {
        text: fullText,
        code: currentCode,
        offset: chunks[chunkIndex] ? chunks[chunkIndex].start : 0,
      };
      if (mode === "online") {
        if (onlineAudio) {
          try {
            onlineAudio.pause();
          } catch (e) {}
        }
      } else {
        clearGapTimer();
        cancelSpeech();
      }
      status = "paused";
      notify();
      scheduleResumeIfPending();
      return true;
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
      } else {
        // جمله‌ی درحالِ‌پخش رو قطع نمی‌کنیم (مرورگر هم اصلاً اجازه‌ی عوض‌کردنِ
        // سرعتِ یه utterance رو وسطِ پخش نمی‌ده). سرعتِ جدید خودکار از جمله‌ی
        // بعدی اعمال می‌شه؛ فعلاً فقط اعلامش می‌کنیم که UI آپدیت بشه.
        notify();
      }
    },
    // بی‌صداکردنِ صرفاً خروجیِ صوتی — پخش/هایلایت/پیش‌رفتنِ جمله‌به‌جمله
    // دقیقاً عادی ادامه پیدا می‌کنه. رویِ صدایِ آنلاینِ درحالِ‌پخش (اگه
    // بود) فوراً اعمال می‌شه؛ برایِ TTSِ محلی، چون مرورگر اجازه‌ی
    // تغییرِ volumeِ یه utteranceِ درحالِ‌پخش رو نمی‌ده، از جمله‌ی بعدی
    // اعمال می‌شه (مثلِ سرعت).
    getMuted() {
      return muted;
    },
    setMuted(v) {
      muted = !!v;
      try {
        localStorage.setItem("phrasebook-tts-muted", muted ? "1" : "0");
      } catch (e) {}
      if (onlineAudio) onlineAudio.volume = muted ? 0 : 1;
      notify();
    },
    toggleMuted() {
      controller.setMuted(!muted);
    },
    // --- برای نوارِ پیشرفتِ پلیرِ جدید (کِشیدنی/تپ‌کردنی) --------------------
    // مرزهای هر جمله (start/end کاراکتری) داخلِ متنِ کاملِ در حالِ پخش —
    // فقط برای تخمینِ بصریِ درصدِ پیشرفت لازمه، نه پخشِ واقعی.
    getChunksMeta() {
      return chunks.map((c) => ({ start: c.start, end: c.end }));
    },
    // متنِ خودِ جمله‌یِ idx‌ام — برایِ نشون‌دادنِ A/B رویِ دکمه‌ی تکرارِ بازه
    // به‌جایِ یه شماره‌ی انتزاعی (که کاربر باید حدس بزنه کدوم جمله‌ست)؛
    // حالا خودِ متنِ جمله (کوتاه‌شده) نشون داده می‌شه.
    getChunkText(idx) {
      return (chunks[idx] && chunks[idx].text) || "";
    },
    getFullTextLength() {
      return fullText.length;
    },
    // پرش مستقیم به جمله‌یِ idx‌ام و ادامه‌ی پخش از همون‌جا — هم برای دکمه‌های
    // «جمله‌ی قبل/بعد» و هم برای کشیدنِ نوارِ پیشرفت استفاده می‌شه. اگه هیچ
    // متنی لود نشده باشه (idle)، کاری نمی‌کنه.
    seekToChunk(idx) {
      if (!key || !chunks.length) return "idle";
      const clamped = Math.min(Math.max(Number(idx) || 0, 0), chunks.length - 1);
      if (mode === "online") {
        stopOnlineAudio();
        const frac = chunks.length ? clamped / chunks.length : 0;
        const onlineIdx = onlineChunks.length
          ? Math.min(onlineChunks.length - 1, Math.floor(frac * onlineChunks.length))
          : 0;
        status = "playing";
        playOnlineChunk(onlineIdx);
      } else {
        speakChunk(clamped, true);
      }
      return "ok";
    },
  };
  return controller;
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
      // ⛔️ قبلاً این fetch هیچ timeoutـی نداشت — اگه سرور بی‌صدا (نه با خطای
      // فوری، بلکه سکوتِ کامل) بلاک/غیرقابل‌دسترس بود، این Promise تا ابد
      // آویزون می‌موند و کل زنجیره‌ی ترجمه (که به‌عنوان آخرین fallback به
      // اینجا می‌رسه) رو برای همیشه معطل می‌کرد. حالا مثلِ fetchWithTimeout
      // بالا، با AbortController یه سقفِ ۱۰ثانیه‌ای داره.
      const aiController = new AbortController();
      const aiTimer = setTimeout(() => aiController.abort(), 10000);
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

// دنبال‌کردنِ «پخشِ فعلی از کدوم تب شروع شده» — برای لانگ‌پرس روی نوارِ
// پلیرِ پایینِ صفحه: کاربر ممکنه وقتی چیزی داره پخش می‌شه (یا مکث شده)
// به یه تبِ دیگه بره؛ نوارِ پلیر همیشه روی صفحه می‌مونه، پس لانگ‌پرس روش
// باید کاربر رو دقیقاً به همون تب و همون سطری که پخش ازش شروع شده برگردونه.
// چون دکمه‌ی پخشِ هر آیتم فقط وقتی قابل‌کلیکه که تبِ خودش همین الان بازه
// (تب‌های دیگه یا اصلاً mount نیستن یا با display:none غیرقابل‌لمسن)، همون
// لحظه‌ای که یه پخشِ *تازه* (کلیدِ جدید، نه صرفاً ادامه/مکثِ همون متنِ قبلی)
// شروع می‌شه، currentOriginTab دقیقاً همون تبِ مبدأشه. رفتنِ خودِ سطر
// (نه فقط تب) رو منطقِ اسکرولِ خودکارِ هر لیست (که از قبل وجود داشت) بعد از
// setTab خودش انجام می‌ده.
let lastPlayOriginTab = null;
let lastPlayOriginKey = null;
speechController.subscribe((state) => {
  if (state.key && state.key !== lastPlayOriginKey) {
    lastPlayOriginKey = state.key;
    lastPlayOriginTab = currentOriginTab;
  } else if (!state.key) {
    lastPlayOriginKey = null;
  }
});
function getLastPlayOriginTab() {
  return lastPlayOriginTab;
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
// فارسی). چون خودِ دیتای WORDS_AZ/DAILY_WORDS فقط انگلیسی+فارسی
// دارن، بقیه‌ی زبان‌ها رو همین‌جا، لحظه‌ای و با همون زنجیره‌ی ترجمه‌ی رایگان
// (translateFree) می‌گیریم و روی دستگاه کش می‌کنیم — تا هر لغت فقط یه‌بار
// در طول عمر برنامه از سرور خواسته بشه، نه هر بار که کاربر اسکرول می‌کنه.
const WORD_TRANSLATIONS_KEY = "phrasebook-word-translations-v1";

// ⚡️ فیکسِ سرعت (هنگ‌کردنِ جستجو): loadAllWordTranslations() قبلاً هر بار
// صدا زده می‌شد کلِ رشته‌ی localStorage رو از نو JSON.parse می‌کرد. این
// تابع از داخلِ فیلترِ جستجوی WordList، به‌ازای هر لغتی که مستقیم با
// متنِ جستجو جور در نمیومد، به‌ازای هر زبانِ مقصد دوباره صدا زده می‌شد —
// یعنی با چند هزار لغت (مثلاً تبِ لغات با ۶٬۳۱۹ ردیف) و چند زبان، هر
// کاراکتری که کاربر تایپ می‌کرد چند هزار بار JSON.parse رویِ یه بلاکِ
// به‌مرورِ‌زمان بزرگ‌شونده اجرا می‌شد — دقیقاً همون چیزی که باعثِ هنگِ
// کاملِ جستجو (توی همه‌ی تب‌ها) می‌شد. حالا نتیجه‌ی parse شده رو تا وقتی
// چیزی عوض نشده (فقط با saveWordTranslation) توی حافظه نگه می‌داریم —
// یعنی در طولِ یه نشست، این بلاک حداکثر یه‌بار parse می‌شه، نه هزاران بار.
let wordTranslationsMemoCache = null;
function loadAllWordTranslations() {
  if (wordTranslationsMemoCache) return wordTranslationsMemoCache;
  try {
    const raw = window.localStorage.getItem(WORD_TRANSLATIONS_KEY);
    wordTranslationsMemoCache = raw ? JSON.parse(raw) : {};
  } catch {
    wordTranslationsMemoCache = {};
  }
  return wordTranslationsMemoCache;
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
  // کشِ حافظه رو هم هم‌زمان به‌روز نگه می‌داریم (نه فقط localStorage) تا
  // لغتِ تازه‌ترجمه‌شده همون لحظه توی جستجو/نمایش هم در دسترس باشه، بدونِ
  // نیاز به یه parse دیگه.
  wordTranslationsMemoCache = all;
  try {
    window.localStorage.setItem(WORD_TRANSLATIONS_KEY, JSON.stringify(all));
  } catch {}
}

// ---------------------------------------------------------------------------
// ردیابیِ «خوانده‌شده / خوانده‌نشده»ی هر لغت — چون تعداد لغاتِ هر تب
// (لغات/لغات‌و‌اخبار/اسلنگ/علاقه‌مندی‌ها) خیلی زیاده، کاربر می‌تونه با یه
// بازه‌ی عددی (از # تا #) فقط بخشی از لیست رو ببینه، و مشخص کنه کدوم لغات رو
// قبلاً خونده. چون شماره‌ی id بینِ فایل‌های مختلفِ لغت (WORDS_AZ/
// DAILY_WORDS/SLANG_WORDS/...) ممکنه تکراری باشه، این وضعیت را جداگانه به
// ازای هر تب (listId) ذخیره می‌کنیم، نه فقط به ازای id.
const WORD_READ_KEY = "phrasebook-word-read-v1";
function loadReadWordIds(listId) {
  try {
    const raw = window.localStorage.getItem(WORD_READ_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return new Set(all[listId] || []);
  } catch {
    return new Set();
  }
}
function saveReadWordIds(listId, idsSet) {
  try {
    const raw = window.localStorage.getItem(WORD_READ_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[listId] = Array.from(idsSet);
    window.localStorage.setItem(WORD_READ_KEY, JSON.stringify(all));
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

// ---------------------------------------------------------------------------
// یادداشتِ آزادِ کاربر برای هر داستان — یک متنِ ساده (بدونِ محدودیتِ تعدادِ
// کلمه) که زیرِ خودِ داستان نگه‌داری می‌شه. با mainStoryKey (همون کلیدی که
// useStoryUserAudio هم استفاده می‌کنه) به داستانِ مشخص وصل می‌شه، پس هر
// داستان یادداشتِ مستقلِ خودش رو داره و با عوض‌شدنِ داستان، یادداشتِ داستانِ
// دیگه نشون داده می‌شه.
// ---------------------------------------------------------------------------
const STORY_NOTES_KEY = "phrasebook-story-notes-v1";
function loadStoryNotesMap() {
  try {
    const raw = window.localStorage.getItem(STORY_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}
function loadStoryNote(storyKey) {
  if (!storyKey) return "";
  const all = loadStoryNotesMap();
  return typeof all[storyKey] === "string" ? all[storyKey] : "";
}
function saveStoryNote(storyKey, text) {
  if (!storyKey) return;
  const all = loadStoryNotesMap();
  if (text && text.trim()) {
    all[storyKey] = text;
  } else {
    delete all[storyKey];
  }
  try {
    window.localStorage.setItem(STORY_NOTES_KEY, JSON.stringify(all));
  } catch {}
}
// هوکِ ساده‌ی یادداشتِ هر داستان — با عوض‌شدنِ storyKey (یعنی رفتن سراغِ
// داستانِ دیگه)، متنِ ذخیره‌شده‌ی همون داستان از localStorage خونده می‌شه؛
// هر تغییری هم بلافاصله (بدونِ دکمه‌ی جداگونه‌ی «ذخیره») روی همون کلید
// نوشته می‌شه.
function useStoryNote(storyKey) {
  const [text, setText] = useState(() => loadStoryNote(storyKey));
  const lastKeyRef = useRef(storyKey);
  useEffect(() => {
    if (lastKeyRef.current !== storyKey) {
      lastKeyRef.current = storyKey;
      setText(loadStoryNote(storyKey));
    }
  }, [storyKey]);
  const update = (next) => {
    setText(next);
    saveStoryNote(storyKey, next);
  };
  return [text, update];
}

// تنظیماتِ نمایشِ متنِ زبان‌های مقصد — اندازه‌ی فونت (به‌صورتِ درصدِ
// مقیاس، با نوارِ پیمایشِ کم/زیاد در تنظیمات) و حالتِ بولدشدن (برای متنِ
// اصلی، ترجمه، هردو، یا هیچ‌کدوم). این جدا از «اندازه‌ی فونتِ کلیِ اپ»یِ
// APP_FONT_SIZES هست؛ فقط روی متن‌های زبانِ خارجی/ترجمه (که از
// ClickableSentence رد می‌شن) اثر می‌ذاره، نه رابط کاربریِ فارسیِ اپ.
const TARGET_TEXT_PREFS_KEY = "phrasebook-target-text-prefs-v1";
const TARGET_TEXT_PREFS_CHANGED_EVENT = "phrasebook:targetTextPrefsChanged";
const DEFAULT_TARGET_TEXT_PREFS = { scale: 100, bold: "both" }; // bold: "both" | "text" | "translation" | "none"
// ---------------------------------------------------------------------------
// ترجیحِ صدای هر زبان — کاربر توی تنظیمات می‌تونه از بینِ صداهایی که خودِ
// گوشی‌اش (سیستم‌عامل/مرورگر) براش نصب داره، یکی رو مشخص انتخاب کنه (به‌جای
// انتخابِ خودکارِ getBestVoice). با voiceURI ذخیره می‌شه چون یکتاست؛ فارسی
// اینجا نیست چون فارسی همیشه از مسیرِ آنلاینِ رایگان خونده می‌شه (پایین‌تر).
// ---------------------------------------------------------------------------
const VOICE_PREFS_KEY = "phrasebook-voice-prefs-v1";
const VOICE_PREFS_CHANGED_EVENT = "phrasebook:voicePrefsChanged";
function loadVoicePrefs() {
  try {
    const raw = window.localStorage.getItem(VOICE_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveVoicePrefs(prefs) {
  try {
    window.localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(VOICE_PREFS_CHANGED_EVENT));
  } catch {}
}
function setVoicePrefForLang(langPrefix, voiceURI) {
  const prefs = loadVoicePrefs();
  if (voiceURI) prefs[langPrefix] = voiceURI;
  else delete prefs[langPrefix];
  saveVoicePrefs(prefs);
}

function loadTargetTextPrefs() {
  try {
    const raw = window.localStorage.getItem(TARGET_TEXT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_TARGET_TEXT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TARGET_TEXT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_TARGET_TEXT_PREFS };
  }
}
function saveTargetTextPrefs(prefs) {
  try {
    window.localStorage.setItem(TARGET_TEXT_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(TARGET_TEXT_PREFS_CHANGED_EVENT));
  } catch {}
}
// هوکِ کوچیکِ مشترک — هر جایی که متنِ زبانِ مقصد رندر می‌شه (اینجا: خودِ
// ClickableSentence) با همین هوک به تنظیماتِ بالا گوش می‌ده و بلافاصله
// با تغییرشون (مثلاً از تبِ تنظیمات) به‌روز می‌شه.
function useTargetTextPrefs() {
  const [prefs, setPrefs] = useState(loadTargetTextPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(loadTargetTextPrefs());
    window.addEventListener(TARGET_TEXT_PREFS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TARGET_TEXT_PREFS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return prefs;
}

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
// پاک‌کردنِ همه‌ی یادداشت‌های گرامریِ ذخیره‌شده، یک‌جا.
function clearAllGrammarNotes() {
  try {
    window.localStorage.setItem(GRAMMAR_NOTES_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event(GRAMMAR_NOTES_CHANGED_EVENT));
  } catch {}
}
// حذفِ دسته‌ایِ چند یادداشتِ انتخاب‌شده با آی‌دی — برای حالتِ «انتخاب» در
// تبِ گرامر (حذف براساسِ تاریخچه، مثلِ مدیریتِ فایل).
function removeGrammarNotesBulk(ids) {
  if (!ids || !ids.size) return;
  const list = loadGrammarNotes().filter((n) => !ids.has(n.id));
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

// Same escape-hatch style as requestGrammarJump above: lets the word-tap
// popover (ClickableSentence) add a word straight into the Leitner review
// pool without threading boxes/setBoxes through every intermediate
// component. Set once by PhrasebookMain.
let requestAddToLeitner = null;

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
  const langLabel = englishLangName(langCode);
  const otherLangsLabel = (targetOrder || [])
    .filter((c) => c !== langCode && c !== nativeLang)
    .map((c) => englishLangName(c))
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
  // برای خودِ پرامپتِ انگلیسی، از نامِ انگلیسیِ زبون استفاده می‌کنیم (نه
  // برچسبِ فارسیِ LANGUAGES) — چون قاطی‌کردنِ یه کلمه‌ی فارسی وسطِ یه
  // دستورالعملِ انگلیسی باعث می‌شد بعضی مدل‌های سریع/رایگانِ زنجیره
  // (groq/mistral/...) درست تشخیصش ندن و به‌جاش خودشون پیش‌فرض برن سراغِ
  // انگلیسی برای مثال‌ها — دقیقاً همون باگی که کاربر گزارش کرد.
  const langLabel = englishLangName(langCode);
  const otherLangsLabel =
    (targetOrder || [])
      .filter((c) => c !== langCode && c !== nativeLang)
      .map((c) => englishLangName(c))
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
    `- CRITICAL: this learner is practicing ${langLabel}, NOT English. Every example sentence in your reply MUST be in ${langLabel} (unless ${langLabel} literally is English, or the learner explicitly asked about English/another language). Never default to English examples just out of habit — that is a mistake.\n` +
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

// یه لایه‌ی سبک برای «روی لغت زدن → دیدنِ ترجمه» — مخصوصِ متن‌هایی که به
// زبانِ مادریِ کاربر نوشته شدن (مثل توضیحِ گرامری) و ClickableSentence
// معمولی (که برعکس، از زبانِ خارجی به مادری ترجمه می‌کنه) روشون فعال
// نمی‌شه. اینجا هر کلمه‌ای که لمس/کلیک بشه، با translateFree به
// targetLangCode (مثلاً اولین زبانِ مقصدِ چیده‌شده‌ی کاربر) ترجمه و توی
// یه حبابِ کوچیک زیرِ همون کلمه نشون داده می‌شه.
// 🔥 React.memo — این کامپوننت هر بار که پنلِ چتِ تمرین رندر بشه (مثلاً با
// هر حرفی که تو کادرِ ورودی تایپ می‌شه، یا با تپ‌کردنِ رویِ یه پیام)، دوباره
// صدا زده می‌شد و کل کارِ سنگینِ پارس‌کردنِ مارک‌داون + توکِن‌کردنِ
// تک‌تکِ کلماتِ *همه‌ی* پیام‌های قبلی رو از نو انجام می‌داد — نه فقط پیامِ
// تغییریافته. هر چی مکالمه طولانی‌تر می‌شد، این کار سنگین‌تر می‌شد و همون
// «کندیِ روزافزونِ تپ‌کردن» که کاربر گزارش کرد رو می‌ساخت. با memo، وقتی
// props (متن/زبان/...) واقعاً عوض نشده، رندرِ دوباره‌ی این کامپوننت کاملاً
// رد می‌شه.
const TapWordTranslate = React.memo(function TapWordTranslate({ text, targetLangCode }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [results, setResults] = useState({});
  if (!text || !targetLangCode) return text || null;
  const tokens = String(text).split(/(\s+)/);
  const handleTap = async (idx, raw) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!word) return;
    if (openIdx === idx) {
      setOpenIdx(null);
      return;
    }
    setOpenIdx(idx);
    if (results[idx]) return;
    setResults((r) => ({ ...r, [idx]: "loading" }));
    try {
      const t = await translateFree(word, targetLangCode, "auto");
      setResults((r) => ({ ...r, [idx]: t || "—" }));
    } catch {
      setResults((r) => ({ ...r, [idx]: "—" }));
    }
  };
  return (
    <span dir="auto">
      {tokens.map((tok, idx) => {
        if (!tok || /^\s+$/.test(tok)) return <React.Fragment key={idx}>{tok}</React.Fragment>;
        return (
          // نکته‌ی مهم (دقیقاً مثلِ ClickableSentence): این span باید
          // display:inline بمونه، نه inline-block. inline-block هر کلمه رو
          // برای موتورِ بیدایِ مرورگر یه «جعبه‌ی اتمیک» جدا حساب می‌کنه؛ وقتی
          // چندتا از این جعبه‌ها پشتِ‌سرِهم داخلِ یه بلاکِ راست‌به‌چپ (فارسی)
          // می‌شینن، مرورگر با کلماتِ داخلِ هرکدوم مثلِ یه کاراکترِ خنثی رفتار
          // می‌کنه و کلِ ترتیبِ جعبه‌ها رو راست‌به‌چپ می‌چینه — یعنی دقیقاً
          // همون باگی که کاربر گزارش کرد: کلماتِ فارسی و حتی کلماتِ انگلیسیِ
          // وسطِ جمله هم بی‌ربط به‌هم‌ریخته/معکوس نشون داده می‌شن. با
          // display:inline، position:relative همچنان برای لنگرِ پاپ‌آپِ
          // زیرش کار می‌کنه، ولی دیگه جعبه‌ی اتمیکِ جدا نمی‌سازه و ترتیبِ
          // طبیعیِ بیدایِ یونیکد رعایت می‌شه.
          <span key={idx} style={{ position: "relative", display: "inline" }}>
            <span
              onClick={() => handleTap(idx, tok)}
              style={{ cursor: "pointer", borderBottom: `1px dotted ${colors.inkSoft}` }}
            >
              {tok}
            </span>
            {openIdx === idx && (
              <span
                dir="auto"
                style={{
                  position: "absolute",
                  top: "100%",
                  insetInlineStart: 0,
                  backgroundColor: colors.gold,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  zIndex: 5,
                  marginTop: 2,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                }}
              >
                {results[idx] === "loading" ? "…" : results[idx] || ""}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
});

// 🔥 React.memo — همون دلیلِ بالا (TapWordTranslate): این کامپوننت
// جوابِ هوش‌مصنوعی رو تو چتِ تمرین رندر می‌کنه و کارِ سنگینِ پارس‌کردنِ
// مارک‌داون توش انجام می‌شه؛ بدونِ memo، با هر تپ/تایپ تو کادرِ ورودی، این
// کار برای *همه‌ی* پیام‌های قبلیِ مکالمه (نه فقط پیامِ تغییریافته) از نو
// اجرا می‌شد و باعثِ کندیِ روزافزونی می‌شد که کاربر گزارش کرد.
const MiniMarkdown = React.memo(function MiniMarkdown({ text, speakCode, nativeLang, aiSettings, wordTapTarget, justify }) {
  if (!text) return null;
  // این استایل رو بذاریم رو هر بلاک (پاراگراف/تیتر/آیتمِ لیست) به‌جای
  // «start»ِ همیشگی — فقط وقتی justify=true باشه (یعنی فقط از چتِ تمرین
  // جمله‌سازی صدا زده شده، نه بقیه‌ی جاهایی که از MiniMarkdown استفاده
  // می‌کنن). unicodeBidi:"plaintext" اینجا لازمه چون بدونش، وقتی یه خط
  // ترکیبی از فارسی/عربی (rtl) و کلماتِ زبونِ دیگه (ltr) باشه، justify
  // معمولی فاصله‌های عجیب/نامتقارن بینِ کلمات می‌ذاره (چون مرورگر جهتِ
  // بلاک رو با embedding پیش‌فرض حساب می‌کنه، نه بر اساسِ جهتِ واقعیِ خودِ
  // متن)؛ plaintext باعث می‌شه مرورگر جهتِ هر پاراگراف رو مستقیماً از رو
  // اولین حرفِ قوی‌ش تشخیص بده و چیدمانِ justify درست دربیاد.
  const blockAlignStyle = justify ? { textAlign: "justify", unicodeBidi: "plaintext" } : { textAlign: "start" };
  // dir="auto" جهتِ کل خط رو فقط از رو اولین حرفِ قوی‌ش تشخیص می‌ده — این
  // دقیقاً چیزیه که تو نمونه‌ی کاربر خرابش کرد: خطِ "1. ¿Qué? → بین انتخاب..."
  // با یه کلمه‌ی اسپانیاییِ لاتین (Qué) شروع می‌شه، پس dir="auto" کلِ خط رو
  // (با اینکه ۹۰٪ فارسیه) ltr حساب می‌کنه و ترتیبِ کلمه‌ها/پرانتزها به‌هم
  // می‌ریزه. به‌جاش، وقتی justify=true باشه، جهتِ هر بلاک رو از رو غالبِ
  // اسکریپتِ خودِ خط (isPersianScriptLine) تعیین می‌کنیم، نه اولین حرفش.
  const blockDir = (content) => (justify ? (isPersianScriptLine(content) ? "rtl" : "ltr") : "auto");
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
    // خط‌هایی که به زبانِ مادریِ کاربرن (توضیحاتِ گرامری) از ClickableSentence
    // معمولی رد می‌شن (چون اون برعکس، از زبانِ خارجی به مادری ترجمه می‌کنه)؛
    // اگه wordTapTarget داده شده باشه (مثلاً توی چتِ تمرین)، همین‌جا با
    // TapWordTranslate قابلِ‌لمس‌شدن می‌کنیمشون تا هر کلمه به اولین زبانِ
    // مقصدِ کاربر ترجمه بشه.
    if (wordTapTarget) {
      return <TapWordTranslate key={key} text={stripMdInline(content)} targetLangCode={wordTapTarget} />;
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
            <li key={i} dir={blockDir(li)} className="flex items-start gap-1" style={{ marginBottom: 2, lineHeight: 1.8, ...blockAlignStyle }}>
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
          dir={blockDir(content)}
          className="flex items-start gap-1"
          style={{
            fontWeight: 800,
            fontSize: level === 1 ? 16 : level === 2 ? 15 : 14,
            margin: "10px 0 4px",
            color: colors.ink,
            ...blockAlignStyle,
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
      <p key={blocks.length} dir={blockDir(line)} className="flex items-start gap-1" style={{ margin: "4px 0", lineHeight: 1.9, ...blockAlignStyle }}>
        {shouldSpeak(line) && <SpeakButton text={line} code={speakCode} color={colors.inkSoft} edge={isPersianScriptLine(line) ? undefined : "end"} />}
        <span style={{ flex: 1 }}>{renderContent(line, blocks.length)}</span>
      </p>
    );
  });
  flushList();
  return <div>{blocks}</div>;
}, (prev, next) =>
  prev.text === next.text &&
  prev.speakCode === next.speakCode &&
  prev.nativeLang === next.nativeLang &&
  prev.aiSettings === next.aiSettings &&
  prev.wordTapTarget === next.wordTapTarget &&
  prev.justify === next.justify
);


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
// لغاتِ دلخواهی که کاربر از پاپ‌آپِ تک‌لغه‌ای (ClickableSentence) با دکمه‌ی
// «افزودن به جعبه‌ی لایتنر» اضافه می‌کنه — جدا از VOCAB ثابتِ برنامه، چون
// این‌ها می‌تونن از هر متنی (داستانِ AI، PDFِ وارد‌شده، هر جای دیگه) بیان.
// شکلِ هر آیتم دقیقاً هم‌شکلِ آیتم‌های VOCAB‌ه (id + t:{lang:text}) تا
// ReviewBox بتونه بدونِ هیچ تغییری، این‌ها رو هم کنارِ VOCAB نمایش بده.
const LEITNER_CUSTOM_WORDS_KEY = "phrasebook-leitner-custom-words-v1";
const LEITNER_CUSTOM_WORDS_CHANGED_EVENT = "phrasebook:leitnerCustomWordsChanged";
function loadLeitnerCustomWords() {
  try {
    const raw = window.localStorage.getItem(LEITNER_CUSTOM_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLeitnerCustomWordsList(list) {
  try {
    window.localStorage.setItem(LEITNER_CUSTOM_WORDS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(LEITNER_CUSTOM_WORDS_CHANGED_EVENT));
  } catch {}
}
// اگه همون لغت (همون زبان) از قبل اضافه شده باشه، دوباره اضافه نمی‌کنه —
// فقط اگه معنیِ تازه‌تری داشته باشیم (opts.meaning)، همون رکورد رو به‌روز
// می‌کنه. برمی‌گردونه: true اگه تازه اضافه شد، false اگه از قبل بود.
function addLeitnerCustomWord(word, langCode, opts) {
  const w = normalizeWord(word);
  if (!w) return false;
  const nativeLang = (opts && opts.nativeLang) || "fa";
  const meaning = (opts && opts.meaning) || "";
  const id = `custom:${langCode}:${w}`;
  const list = loadLeitnerCustomWords();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    if (meaning && !list[idx].t[nativeLang]) {
      list[idx] = { ...list[idx], t: { ...list[idx].t, [nativeLang]: meaning } };
      saveLeitnerCustomWordsList(list);
    }
    return false;
  }
  const entry = { id, langCode, t: { [langCode]: word, ...(meaning ? { [nativeLang]: meaning } : {}) } };
  list.unshift(entry);
  saveLeitnerCustomWordsList(list);
  return true;
}

// وقتی یه لغتِ سفارشیِ لایتنر فقط ترجمه‌ی یک زبون رو داره (چون موقعِ
// افزودن، فقط همون یه زبونِ مقصد باز بود) و کاربر بعداً یه زبونِ مقصدِ
// دیگه هم فعال می‌کنه، ReviewBox این تابع رو صدا می‌زنه تا ترجمه‌یِ همون
// زبونِ تازه رو (که جدا با translateFree گرفته) روی همون رکورد پر کنه —
// دقیقاً همون الگویِ «تکمیلِ تنبل» که updateSavedWordTranslation برای
// پنلِ لغاتِ ذخیره‌شده استفاده می‌کنه.
function fillLeitnerCustomWordTranslation(id, langCode, text) {
  if (!text) return;
  const list = loadLeitnerCustomWords();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0 || list[idx].t[langCode]) return; // دیگه وجود نداره یا از قبل پر شده
  list[idx] = { ...list[idx], t: { ...list[idx].t, [langCode]: text } };
  saveLeitnerCustomWordsList(list);
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

// نامِ انگلیسیِ هر زبون — مخصوصِ متنِ پرامپتی که به هوش مصنوعی فرستاده
// می‌شه (askGrammarTeacher و مشابه‌هاش)، چون خودِ اون پرامپت‌ها به انگلیسی
// نوشته شدن. قبلاً به‌جاش برچسبِ فارسیِ LANGUAGES (مثلاً «اسپانیایی») مستقیم
// وسطِ یه جمله‌ی انگلیسی می‌رفت — که خصوصاً مدل‌های سریع/رایگانِ زنجیره
// (groq/mistral/...) بعضی‌وقت‌ها درست تشخیصش نمی‌دادن و به‌جاش خودشون
// پیش‌فرض می‌رفتن سراغِ انگلیسی برای مثال‌ها. اسمِ انگلیسیِ واضح این ابهام
// رو از بین می‌بره.
const ENGLISH_LANG_NAME = {
  fa: "Persian",
  en: "English",
  it: "Italian",
  hi: "Hindi",
  tr: "Turkish",
  ar: "Arabic",
  es: "Spanish",
  de: "German",
  fr: "French",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ja: "Japanese",
};
function englishLangName(code) {
  return ENGLISH_LANG_NAME[code] || code;
}

// Languages that read right-to-left — used so any text block (story
// sentences, translations, custom words the user types) gets the correct
// direction/alignment no matter which language it's actually written in,
// instead of inheriting the app's own RTL layout.
const RTL_LANGS = ["fa", "ar"];
const dirFor = (code) => (RTL_LANGS.includes(code) ? "rtl" : "ltr");

// حدس زدنِ خودکارِ زبونِ یه متنِ پیست‌شده/وارد‌شده (بدونِ نیاز به AI و
// بدونِ اینترنت) — قبلاً متنِ پیست‌شده برای خوانش همیشه با storyLangِ
// فعلی (هر چی که قبلاً بالای صفحه انتخاب شده بود) نمایش داده و خونده
// می‌شد، نه با زبونِ *واقعیِ* خودِ متن. همین باعث می‌شد یه متنِ انگلیسی با
// جهتِ راست‌به‌چپ نشون داده بشه و/یا موقعِ خوانش دنبالِ صدای زبونِ اشتباه
// بگرده، صدای محلیِ گوشی رو پیدا نکنه، و مجبور بشه بره سراغِ سرویسِ
// آنلاینِ کندتر. اینجا با اسکریپتِ یونیکد (فارسی/عربی/چینی/ژاپنی/کره‌ای/
// هندی/روسی) و برای زبون‌های لاتین با شمارشِ کلماتِ خیلی پرتکرارِ هر زبون
// (the/der/el/le/il/ve/...) حدس می‌زنیم. فقط بین ۱۳ زبونی که خودِ برنامه
// پشتیبانی می‌کنه (LANGUAGES) تصمیم می‌گیره؛ اگه هیچ سرنخِ روشنی نبود،
// null برمی‌گردونه تا زبونِ فعلی دست‌نخورده بمونه.
function detectPastedTextLanguage(text) {
  const sample = (text || "").slice(0, 4000);
  if (!sample.trim()) return null;

  // دیوان‌ناگری → هندی
  if (/[\u0900-\u097F]/.test(sample)) return "hi";

  // اسکریپتِ عربی → فارسی یا عربی (حروفِ ویژه‌ی فارسی: پ چ ژ گ)
  if (/[\u0600-\u06FF]/.test(sample)) {
    return /[\u067E\u0686\u0698\u06AF]/.test(sample) ? "fa" : "ar";
  }

  // هیراگانا/کاتاکانا → ژاپنی
  if (/[\u3040-\u30FF]/.test(sample)) return "ja";
  // هانگول → کره‌ای
  if (/[\uAC00-\uD7A3]/.test(sample)) return "ko";
  // ایدئوگرام‌های یکپارچه‌ی چینی (بدونِ هیراگانا/هانگول که بالاتر رد شدن) → چینی
  if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";
  // سیریلیک → روسی
  if (/[\u0400-\u04FF]/.test(sample)) return "ru";

  // زبون‌های لاتین: هیچ اسکریپتِ منحصربه‌فردی ندارن، پس با شمارشِ
  // کلماتِ خیلی پرتکرارِ هر زبون تصمیم می‌گیریم.
  const words = sample.toLowerCase().match(/[a-zàâäçèéêëîïôöùûüÿñßışğî]+/g) || [];
  if (!words.length) return null;
  const wordSet = new Set(words);
  const scoreOf = (list) => list.reduce((sum, w) => sum + (wordSet.has(w) ? 1 : 0), 0);
  const stop = {
    de: ["der", "die", "das", "und", "ist", "nicht", "mit", "für", "ein", "eine", "sie", "auf", "was", "wie", "wenn", "aber", "auch", "sich", "dass", "ich"],
    es: ["el", "la", "los", "las", "de", "que", "y", "en", "no", "es", "un", "una", "para", "por", "con", "su", "del", "al", "se", "lo"],
    fr: ["le", "la", "les", "et", "est", "une", "des", "dans", "pour", "que", "qui", "ne", "pas", "ce", "vous", "je", "nous", "avec", "au", "un"],
    it: ["il", "la", "di", "che", "è", "un", "una", "per", "non", "con", "gli", "le", "sono", "questo", "questa", "del", "alla", "si", "mi", "ma"],
    tr: ["ve", "bir", "bu", "için", "ile", "de", "da", "çok", "ama", "ne", "gibi", "daha", "var", "yok", "ben", "sen", "biz", "onun", "şey", "değil"],
    en: ["the", "and", "is", "to", "of", "in", "that", "it", "was", "for", "on", "with", "he", "she", "you", "this", "but", "not", "are", "as"],
  };
  const scores = Object.entries(stop).map(([code, list]) => [code, scoreOf(list)]);
  scores.sort((a, b) => b[1] - a[1]);
  const [topCode, topScore] = scores[0];
  // اگه حتی برنده هم امتیازِ صفر داشت، سرنخِ قابلِ‌اطمینانی نیست — به‌جای
  // حدسِ کورکورانه، null برمی‌گردونیم تا زبونِ قبلی دست‌نخورده بمونه.
  return topScore > 0 ? topCode : null;
}

// ---------------------------------------------------------------------------
// تشخیصِ سریعِ سطحِ CEFR یه متن — کاملاً محلی، بدونِ هیچ فراخوانیِ AI، پس
// آنی (چند میلی‌ثانیه، حتی برای متنِ چندهزارکاراکتری) اجرا می‌شه؛ دقیقاً
// برای همون لحظه‌ای طراحی شده که کاربر متن رو پیست/PDF/لینک می‌کنه و قبلاً
// سطح همیشه رویِ A2 (مقدارِ اولیه‌ی storyLevel) می‌موند، چون هیچ‌کدوم از
// این سه مسیر اصلاً سطح رو تنظیم نمی‌کردن.
//
// روش: چند سنجه‌ی سبکِ زبان‌شناسیِ کلاسیک (شبیهِ خانواده‌ی Flesch-Kincaid،
// ولی بدونِ نیاز به شمارشِ دقیقِ هجا که برای فارسی/عربی و خیلی زبون‌های
// دیگه اصلاً تعریف‌شده/قابلِ‌اتکا نیست) با هم ترکیب می‌شن:
//   • میانگینِ طولِ جمله (کلمه) — جمله‌های بلندتر → معمولاً سطحِ بالاتر
//   • میانگینِ طولِ کلمه (حرف) — جایگزینِ سبکِ «تعدادِ هجا»، مستقل از زبون
//   • نسبتِ کلماتِ «بلند» (۷+ حرف) — سرنخِ واژگانِ تخصصی/پیچیده
//   • تنوعِ واژگانی (نسبتِ کلماتِ یکتا به کلِ کلمات) — تکرارِ زیاد → ساده‌تر
// این یه تخمینِ صرفاً آماریه، نه تحلیلِ زبان‌شناختیِ واقعی — دقتش قابلِ
// مقایسه با قضاوتِ AI/معلم نیست، ولی برای اینکه سطحِ پیش‌فرض دیگه همیشه
// «ثابت رویِ A2» نباشه و تقریباً درست باشه، کافیه. آستانه‌های زیر تجربی‌ان؛
// اگه بعداً حس شد سیستماتیک بالا/پایین می‌زنه، همینا رو می‌شه تنظیم کرد.
function detectTextCEFRLevel(text) {
  const t = (text || "").trim();
  if (!t) return "A2";
  const sentences = splitTextIntoSentenceStrings(t);
  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length || !sentences.length) return "A2";

  const cleanWords = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  if (!cleanWords.length) return "A2";

  const avgSentenceLen = words.length / sentences.length;
  const avgWordLen = cleanWords.reduce((sum, w) => sum + w.length, 0) / cleanWords.length;
  const longWordRatio = cleanWords.filter((w) => w.length >= 7).length / cleanWords.length;
  const uniqueRatio = new Set(cleanWords.map((w) => w.toLowerCase())).size / cleanWords.length;

  const score = avgSentenceLen * 1.0 + avgWordLen * 3.0 + longWordRatio * 40 + uniqueRatio * 15;

  if (score < 14) return "A1";
  if (score < 19) return "A2";
  if (score < 24) return "B1";
  if (score < 29) return "B2";
  if (score < 34) return "C1";
  return "C2";
}

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
// نسخه‌ی انگلیسیِ همون دسته‌بندی‌ها — برای وقتی uiLang روی English باشه.
const CATEGORIES_EN = {
  greetings: "Greetings",
  airport: "Airport",
  restaurant: "Restaurant",
  shopping: "Shopping",
  hotel: "Hotel",
  directions: "Directions",
  emergency: "Emergency",
  numbers: "Numbers & time",
  meeting: "Meeting",
  introducing: "Introducing",
  old_friend: "Old friend",
  acquainted: "Getting acquainted",
  invitation: "Invitation",
  goodbye: "Goodbye",
  telephone: "Telephone",
  transport: "Transport",
  taxi: "Taxi",
  common: "Common phrases",
  exercises: "Conversation practice",
  bus: "Bus",
  rental: "Car rental",
  train: "Train",
  gas: "Gas station",
  repair: "Car repair",
};
function categoryLabel(cat, uiLang) {
  const table = uiLang === "en" ? CATEGORIES_EN : CATEGORIES;
  return table[cat] || cat;
}

export const conversation = [
  ];

// ---------------------------------------------------------------------------
// نگاشتِ لغت/عبارت/جمله → سطح (A1..C2)، برای نشون‌دادنِ سطح توی پنل «لغات
// ذخیره‌شده» — هم برای تک‌لغت، هم برای اصطلاح/عبارت، هم برای کل یه جمله؛
// چون با قابلیتِ «انتخابِ آزادِ متن → افزودن به داستان» کاربر می‌تونه هرکدوم
// از این‌ها رو ذخیره کنه، نه فقط تک‌کلمه. این نگاشت‌ها فقط یه‌بار (موقع لود
// شدنِ ماژول) از روی دیتای موجود ساخته می‌شن، نه هر بار که پنل رندر می‌شه.
// باید بعد از تعریفِ conversation بیاد چون بهش نیاز داره.
//   ۱) WORDS_AZ / DAILY_WORDS: تک‌لغتِ انگلیسی (فیلد en).
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
[...WORDS_AZ, ...DAILY_WORDS].forEach((w) => {
  const key = normalizeWord(w.en);
  if (key && !LEVEL_BY_EN_WORD.has(key)) LEVEL_BY_EN_WORD.set(key, w.level);
});
(ALL_DAILY_CONVERSATIONS || []).forEach((sc) => {
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
        width: 52,
        height: 52,
        borderRadius: "50%",
        // این مهر همیشه روی پس‌زمینه‌ی تیره‌ی هدر (گرادیانتِ teal→ink) رندر
        // می‌شه، نه روی کارتِ روشنِ صفحه — برای همین حالتِ غیرفعالش باید از
        // رنگ‌های ثابتِ خودِ هدر (نه colors.inkSoft/colors.cardBorder که
        // برای متنِ روی زمینه‌ی روشن طراحی شدن) استفاده کنه. مقادیر دقیقاً
        // از موکاپِ طراحی (language-app-home.html) گرفته شده.
        border: active ? `1.6px solid ${colors.gold}` : "1.6px dashed rgba(233,226,200,.4)",
        background: active ? `linear-gradient(135deg, ${colors.gold}, ${colors.goldSoft})` : "rgba(255,255,255,.03)",
        color: active ? colors.ink : "#CFE3DC",
        fontWeight: 700,
        fontSize: 12.5,
        letterSpacing: 0.3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        boxShadow: active ? "0 6px 16px -4px rgba(201,154,46,.55)" : "none",
        transition: "background-color 0.15s, border-color 0.15s",
        // این متن (AR/HI/IT/...) هیچ‌وقت نباید با لمسِ طولانی (که برای
        // جابه‌جاییِ ترتیب استفاده می‌شه) به‌صورتِ متنِ قابل‌انتخاب/های‌لایت
        // آبیِ مرورگر دربیاد — چون این یه دکمه‌ست، نه متنِ داستان.
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
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
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
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
// VOCAB / WORDS_AZ / DAILY_WORDS رو یکی‌یکی با همون زنجیره‌ی
// سرویس‌های رایگان (translateFree) ترجمه می‌کنه و توی IndexedDB ذخیره
// می‌کنه. بعد از اون، همون کلمات کاملاً آفلاین در دسترسن (چون translateFree
// اول کش رو چک می‌کنه). اگه وسط کار قطع بشه، دفعه‌ی بعد فقط لغاتِ باقی‌مونده
// رو ادامه می‌ده (لغاتی که قبلاً کش شدن رد می‌شن، پس منابع رو هدر نمی‌ده).
// ============================================================
function formatDownloadSize(bytes) {
  if (!bytes) return "۰ کیلوبایت";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)}`.replace(".", "٫") + " کیلوبایت";
  const mb = kb / 1024;
  return `${mb.toFixed(1)}`.replace(".", "٫") + " مگابایت";
}

function OfflineWordsModal({ open, onClose, aiSettings }) {
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, bytes: 0, failed: 0 });
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
    [VOCAB, WORDS_AZ, DAILY_WORDS].forEach((list) => {
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
    setProgress({ done: 0, total: jobs.length, bytes: 0, failed: 0 });

    let doneCount = 0;
    let byteCount = 0;
    let failedCount = 0;
    // با اضافه‌شدنِ circuit-breakerِ سرویس‌های ترجمه (که سرویسِ فیلترشده رو
    // بعد از چندبار شکست کنار می‌ذاره)، هر کار خیلی سریع‌تر از قبل تصمیم
    // می‌گیره — پس هم‌زمانیِ محلیِ این دانلود رو هم به همون سقفِ سراسری
    // (GLOBAL_TRANSLATE_CONCURRENCY) نزدیک می‌کنیم تا صف زودتر خالی بشه.
    const CONCURRENCY = 8;
    let cursor = 0;

    async function worker() {
      while (cursor < jobs.length) {
        if (cancelRef.current) return;
        const job = jobs[cursor++];
        setCurrentWord(job.word);
        try {
          const result = await translateFree(job.word, job.lang, "en", aiSettings);
          // اگه نتیجه هنوز مشکوک/ترجمه‌نشده‌ست (یعنی همه‌ی سرویس‌ها شکست
          // خوردن و متنِ اصلی برگشته)، به‌عنوانِ «موفق» حسابش نمی‌کنیم —
          // تا شمارشگرِ کاربر واقعی باشه، نه گمراه‌کننده.
          if (result && !looksLikelyMistranslated(job.word, result, job.lang, "en")) {
            byteCount += new TextEncoder().encode(result).length;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
        doneCount++;
        setProgress({ done: doneCount, total: jobs.length, bytes: byteCount, failed: failedCount });
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
              {progress.done.toLocaleString("fa-IR")} از {progress.total.toLocaleString("fa-IR")} ({pct}٪) · {formatDownloadSize(progress.bytes)}
            </p>
            {progress.failed > 0 && (
              <p style={{ fontSize: 11, color: colors.rose, marginBottom: 4 }}>
                {progress.failed.toLocaleString("fa-IR")} تا هنوز جواب نگرفتن (بعداً دوباره امتحان می‌شن)
              </p>
            )}
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
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              الان {cachedCount?.toLocaleString("fa-IR")} ترجمه (حدود {formatDownloadSize(progress.bytes)} این‌بار) روی گوشی ذخیره‌ست و کاملاً آفلاین در دسترسه.
            </p>
            {progress.failed > 0 && (
              <p style={{ fontSize: 11, color: colors.rose, marginBottom: 10 }}>
                {progress.failed.toLocaleString("fa-IR")} تا ترجمه نشدن (احتمالاً سرویس‌ها موقتاً در دسترس نبودن) — می‌تونی دوباره «شروع دانلود» رو بزنی، فقط همین‌ها امتحان می‌شن.
              </p>
            )}
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

// ---------------------------------------------------------------------------
// بخشِ «زبان‌های خواندن با صدای بلند» توی تنظیمات — به کاربر نشون می‌ده
// گوشی‌اش برای هر زبون صدای نصب‌شده داره یا نه، اجازه می‌ده از بینِ
// صداهای نصب‌شده یکی رو انتخاب کنه، و یه دکمه‌ی «نصب بسته‌های زبان» داره که
// سعی می‌کنه (فقط در اندروید) مستقیم صفحه‌ی تنظیماتِ گوشی رو باز کنه؛ در
// غیرِ این‌صورت (iOS/دسکتاپ، یا اگه بازکردنِ خودکار جواب نداد) یه راهنمای
// متنیِ کوتاه نشون می‌ده. فارسی این‌جا نیست، چون همیشه از مسیرِ آنلاینِ
// رایگان (بالاتر، onlineTtsProviders) پخش می‌شه و نیازی به نصب نداره.
// ---------------------------------------------------------------------------
function detectPlatform() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

function openLanguagePackSettings(platform) {
  if (platform === "android") {
    // این intent-uri فقط داخلِ کروم/اندروید کار می‌کنه؛ روی مرورگرها/
    // دستگاه‌های دیگه بی‌اثره (بی‌خطر) و کاربر راهنمای متنی رو می‌بینه.
    try {
      window.location.href =
        "intent://#Intent;action=com.android.settings.TTS_SETTINGS;end";
    } catch (e) {}
  }
}

function LanguageVoiceSettings({ uiLang, colors }) {
  const [voices, setVoices] = useState(() =>
    typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  );
  const [voicePrefs, setVoicePrefsState] = useState(loadVoicePrefs);
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    const refresh = () => setVoicePrefsState(loadVoicePrefs());
    window.addEventListener(VOICE_PREFS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(VOICE_PREFS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const installSteps =
    platform === "android" ? tr("androidInstallSteps", uiLang) : platform === "ios" ? tr("iosInstallSteps", uiLang) : tr("desktopInstallSteps", uiLang);

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        🔊 {tr("voiceSectionTitle", uiLang)}
      </p>

      <button
        onClick={() => openLanguagePackSettings(platform)}
        className="flex items-center gap-2"
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: colors.ink,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: "9px 12px",
          width: "100%",
          marginBottom: 6,
        }}
      >
        📥 {tr("installLanguagePacks", uiLang)}
      </button>
      <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 6, lineHeight: 1.6 }}>{tr("installLanguagePacksHint", uiLang)}</p>
      <p style={{ fontSize: 10.5, color: colors.inkSoft, marginBottom: 12, lineHeight: 1.6, opacity: 0.85 }}>{installSteps}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
        {LANGUAGES.filter((l) => l.code !== "fa").map((l) => {
          const matches = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(l.code));
          const hasVoices = matches.length > 0;
          const currentURI = voicePrefs[l.code] || "";
          return (
            <div
              key={l.code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "7px 10px",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.ink, flexShrink: 0 }}>{l.label}</span>
              {hasVoices ? (
                <select
                  value={currentURI}
                  onChange={(e) => setVoicePrefForLang(l.code, e.target.value || null)}
                  style={{
                    fontSize: 11.5,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 8,
                    padding: "4px 6px",
                    color: colors.ink,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <option value="">{tr("voiceAutoOption", uiLang)}</option>
                  {matches.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 11, color: colors.inkSoft, opacity: 0.8 }}>{tr("voiceNotInstalled", uiLang)}</span>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 6, lineHeight: 1.6, opacity: 0.85 }}>🌐 {tr("persianVoiceNote", uiLang)}</p>
    </div>
  );
}

function SettingsMenu({ appPrefs, setAppPrefs, user, onLogout, aiSettings }) {
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const uiLang = appPrefs.uiLang || "fa";
  const panelDir = APP_LANGUAGES[uiLang]?.dir || "rtl";
  const panelFont = uiLang === "en" ? fontLatin : fontFa;
  // اندازه/بولدِ متنِ زبان‌های مقصد (جدا از اندازه‌ی فونتِ کلیِ اپ بالا) —
  // در localStorage با کلیدِ خودش ذخیره می‌شه (نه appPrefs)، چون از یه
  // هوکِ سبکِ مشترک (useTargetTextPrefs) توسطِ خودِ ClickableSentence هم
  // خونده می‌شه.
  const [targetTextPrefs, setTargetTextPrefsState] = useState(loadTargetTextPrefs);
  const updateTargetTextPrefs = (patch) => {
    setTargetTextPrefsState((prev) => {
      const next = { ...prev, ...patch };
      saveTargetTextPrefs(next);
      return next;
    });
  };

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
        aria-label={tr("settingsTitle", uiLang)}
        title={tr("settingsTitle", uiLang)}
        style={{ color: colors.goldSoft, display: "flex" }}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          dir={panelDir}
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
            fontFamily: panelFont,
          }}
        >
          {/* Account */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>{tr("account", uiLang)}</p>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.gold, color: colors.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || tr("guestUser", uiLang)}</p>
              <p style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: colors.rose, marginBottom: 16 }}
          >
            <LogOut size={14} /> {tr("logout", uiLang)}
          </button>

          {/* Software language */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} /> {tr("languageSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_LANGUAGES).map(([key, l]) => (
              <button
                key={key}
                onClick={() => update("uiLang", key)}
                aria-pressed={uiLang === key}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${uiLang === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: uiLang === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Theme */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Palette size={14} /> {tr("themeSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {Object.entries(APP_THEMES).map(([key, th]) => (
              <button
                key={key}
                onClick={() => update("theme", key)}
                title={th.label[uiLang] || th.label.fa}
                aria-pressed={appPrefs.theme === key}
                style={swatchButtonStyle(th.swatch, appPrefs.theme === key)}
              />
            ))}
          </div>

          {/* Font family */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={14} /> {tr("fontSectionTitle", uiLang)}
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
                {f.label[uiLang] || f.label.fa}
              </button>
            ))}
          </div>

          {/* Font size */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>{tr("fontSizeTitle", uiLang)}</p>
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
                {s.label[uiLang] || s.label.fa}
              </button>
            ))}
          </div>

          {/* اندازه‌ی فونتِ زبان‌های مقصد — جدا از اندازه‌ی فونتِ کلیِ اپ
              بالا؛ فقط روی متنِ زبانِ خارجی/ترجمه (همون‌جاهایی که
              ClickableSentence رندرشون می‌کنه: تبِ داستان، مکالمات
              روزمره، لغات، و…) اثر می‌ذاره. با یه نوارِ پیمایشِ ساده
              (کم/زیاد) به‌جای دکمه‌های ثابت. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={14} /> {uiLang === "en" ? "Target-language font size" : "اندازه‌ی فونتِ زبان‌های مقصد"}
          </p>
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <button
              onClick={() => updateTargetTextPrefs({ scale: Math.max(70, (targetTextPrefs.scale || 100) - 10) })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1px solid ${colors.cardBorder}`,
                backgroundColor: "white",
                color: colors.ink,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-label={uiLang === "en" ? "Decrease" : "کم کردن"}
            >
              −
            </button>
            <input
              type="range"
              min={70}
              max={160}
              step={5}
              value={targetTextPrefs.scale || 100}
              onChange={(e) => updateTargetTextPrefs({ scale: Number(e.target.value) })}
              style={{ flex: 1, accentColor: colors.gold }}
            />
            <button
              onClick={() => updateTargetTextPrefs({ scale: Math.min(160, (targetTextPrefs.scale || 100) + 10) })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1px solid ${colors.cardBorder}`,
                backgroundColor: "white",
                color: colors.ink,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-label={uiLang === "en" ? "Increase" : "زیاد کردن"}
            >
              +
            </button>
            <span style={{ fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center" }}>
              {(targetTextPrefs.scale || 100).toLocaleString(uiLang === "en" ? "en-US" : "fa-IR")}٪
            </span>
          </div>

          {/* حالتِ بولدشدنِ متنِ زبانِ مقصد — می‌تونه فقط رویِ «متنِ اصلی»
              (زبانی که یاد می‌گیره)، فقط رویِ «ترجمه»، هر دو، یا هیچ‌کدوم
              اعمال بشه. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Bold target text" : "بولدشدنِ متنِ زبانِ مقصد"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {[
              ["none", uiLang === "en" ? "None" : "هیچ‌کدام"],
              ["text", uiLang === "en" ? "Original text" : "متن اصلی"],
              ["translation", uiLang === "en" ? "Translation" : "ترجمه"],
              ["both", uiLang === "en" ? "Both" : "هر دو (متن و ترجمه)"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => updateTargetTextPrefs({ bold: key })}
                aria-pressed={(targetTextPrefs.bold || "both") === key}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${(targetTextPrefs.bold || "both") === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: (targetTextPrefs.bold || "both") === key ? colors.goldSoft : "white",
                  color: colors.ink,
                  fontWeight: key === "none" ? 400 : 700,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar system for saved-story dates */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            📅 {tr("calendarSectionTitle", uiLang)}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {[
              ["jalali", "calendarJalali"],
              ["gregorian", "calendarGregorian"],
              ["both", "calendarBoth"],
            ].map(([key, labelKey]) => (
              <button
                key={key}
                onClick={() => update("calendarSystem", key)}
                aria-pressed={(appPrefs.calendarSystem || "jalali") === key}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${(appPrefs.calendarSystem || "jalali") === key ? colors.gold : colors.cardBorder}`,
                  backgroundColor: (appPrefs.calendarSystem || "jalali") === key ? colors.goldSoft : "white",
                  color: colors.ink,
                }}
              >
                {tr(labelKey, uiLang)}
              </button>
            ))}
          </div>

          {/* رنگِ هایلایتِ خواندن — همون مارکری که موقع «خواندنِ خودکار»
              دورِ جمله/کلمه‌ی در‌حالِ‌خواندن کشیده می‌شه. یه پالتِ ثابت از
              رنگ‌های کم‌رنگ/بی‌حال (نه تند)، چون رنگ‌های پررنگ روی متنِ
              تیره خوندن رو خسته‌کننده می‌کنه. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Read-aloud highlight color" : "رنگ هایلایتِ خواندن"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {/* گزینه‌ی «بدون هایلایت»: کاربر می‌تونه انتخاب کنه که موقعِ
                خواندنِ خودکار، هیچ رنگی دورِ جمله/کلمه/پاراگرافِ در‌حالِ‌خواندن
                کشیده نشه — فقط متن با صدای بلند خونده بشه. */}
            <button
              onClick={() => update("highlightColor", "none")}
              aria-pressed={appPrefs.highlightColor === "none"}
              title={uiLang === "en" ? "No highlight" : "بدون هایلایت"}
              style={swatchButtonStyle("white", appPrefs.highlightColor === "none", 30)}
            >
              <X size={14} color={colors.inkSoft} />
            </button>
            {HIGHLIGHT_COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => update("highlightColor", hex)}
                aria-pressed={appPrefs.highlightColor === hex}
                title={hex}
                style={swatchButtonStyle(hex, appPrefs.highlightColor === hex, 30)}
              />
            ))}
          </div>

          {/* لباسِ آدمکِ Lingova — سه دست‌لباسِ آماده؛ هر دکمه با دو نقطه‌رنگ
              (پیراهن/شلوار) پیش‌نمایش داده می‌شه. گزینه‌ی «کلاسیک» از رنگِ
              تمِ فعلیِ اپ پیروی می‌کنه، دو تای دیگه رنگِ ثابت دارن. */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Mascot outfit" : "لباسِ آدمک"}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {LINGOVA_OUTFIT_KEYS.map((key) => {
              const outfit = LINGOVA_OUTFITS[key];
              const shirtPreview = outfit.shirt || colors.teal;
              const pantsPreview = outfit.pants || colors.ink;
              const selected = (appPrefs.mascotOutfit || "classic") === key;
              const outfitLabelKeys = {
                classic: uiLang === "en" ? "Classic" : "کلاسیک",
                scout: uiLang === "en" ? "Scout" : "کاوشگر",
                royal: uiLang === "en" ? "Royal" : "درباری",
              };
              return (
                <button
                  key={key}
                  onClick={() => update("mascotOutfit", key)}
                  aria-pressed={selected}
                  title={outfitLabelKeys[key]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    border: `1px solid ${selected ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selected ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  <span style={{ display: "flex", gap: 2 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: shirtPreview, border: "1px solid rgba(0,0,0,.15)" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: pantsPreview, border: "1px solid rgba(0,0,0,.15)" }} />
                  </span>
                  {outfitLabelKeys[key]}
                </button>
              );
            })}
          </div>

          {/* نمایش/محوشدنِ آدمکِ متحرک — خاموش‌کردنش آدمک رو یهو حذف
              نمی‌کنه، با یه ترنزیشنِ نرمِ opacity محو می‌شه (به همین دلیل
              تویِ LingovaMascot با opacity کنترل می‌شه نه رندرِ شرطی). */}
          <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 8 }}>
            {uiLang === "en" ? "Walking mascot" : "آدمکِ متحرک"}
          </p>
          <div className="flex gap-2" style={{ marginBottom: 16 }}>
            {[
              { key: true, labelFa: "نمایش داده بشه", labelEn: "Show" },
              { key: false, labelFa: "محو بشه", labelEn: "Fade out" },
            ].map((opt) => {
              const selected = (appPrefs.mascotEnabled !== false) === opt.key;
              return (
                <button
                  key={String(opt.key)}
                  onClick={() => update("mascotEnabled", opt.key)}
                  aria-pressed={selected}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1px solid ${selected ? colors.gold : colors.cardBorder}`,
                    backgroundColor: selected ? colors.goldSoft : "white",
                    color: colors.ink,
                  }}
                >
                  {uiLang === "en" ? opt.labelEn : opt.labelFa}
                </button>
              );
            })}
          </div>

          {/* «زبان‌های خواندن با صدای بلند» (پنلِ نصب بسته‌ی زبان) از تنظیمات
              حذف شد — به‌جاش، هر جا کاربر بخواد ترجمه‌ای رو با صدای بلند
              بشنوه که زبونش رو گوشی نصب نداره، خودِ دکمه‌ی 🔊 (SpeakButton)
              یه پیامِ کوچیکِ درجا نشون می‌ده (نه اینجا، توی تنظیمات). */}

          {/* Offline words download */}
          <button
            onClick={() => setOfflineModalOpen(true)}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: "9px 12px", width: "100%" }}
          >
            <BookOpen size={14} /> {tr("offlineDownload", uiLang)}
          </button>

        </div>
      )}

      <OfflineWordsModal open={offlineModalOpen} onClose={() => setOfflineModalOpen(false)} aiSettings={aiSettings} />
    </div>
  );
}

// ردیفِ سه‌تا تبِ اصلی (مکالمات روزمره، داستان‌ساز، لغات ذخیره‌شده) که —
// دقیقاً طبقِ موکاپِ طراحی (language-app-home.html، کلاسِ .tab/.tab.active —
// دیگه توی نوارِ جداگانه‌ی زیرِ هدر (که پس‌زمینه‌ی روشنِ colors.paperDark
// داره) نیستن، بلکه خودِ هدر (روی گرادیانتِ تیره‌ش) رندر می‌شن: هر سه با
// عرضِ مساوی (flex:1)، غیرفعال = پیلِ کِرم‌رنگ با متنِ تیره، فعال = پیلِ
// هم‌رنگِ خودِ هدر (تقریباً محو می‌شه توی پس‌زمینه، دقیقاً همون افکتِ موکاپ).
function HeaderPrimaryTabButton({ label, icon: Icon, active, onClick, fontFamily: fontFamilyProp }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full"
      style={{
        flex: 1,
        gap: 6,
        fontFamily: fontFamilyProp || fontFa,
        fontSize: 13,
        fontWeight: 600,
        padding: "11px 6px",
        backgroundColor: active ? colors.ink : "#E6DAB2",
        color: active ? "#F3EFDD" : "#5C5637",
        border: `1px solid ${active ? colors.ink : "#E7DEC1"}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function TabButton({ label, icon: Icon, active, onClick, fontFamily: fontFamilyProp }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 justify-center rounded-full"
      style={{
        fontFamily: fontFamilyProp || fontFa,
        fontSize: 13,
        fontWeight: 600,
        padding: "11px 16px",
        // غیرفعال: کِرمِ تیره‌ترِ همون طرحِ مرجع؛ فعال: سبزِ تیره‌ی هدر —
        // دقیقاً همون جفت‌رنگِ .tab / .tab.active توی language-app-home.html
        backgroundColor: active ? colors.ink : colors.paperDark,
        color: active ? colors.paper : colors.inkSoft,
        border: `1px solid ${active ? colors.ink : colors.cardBorder}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

// fullText (اختیاری): وقتی این دکمه کنارِ یه جمله/پاراگرافِ داخلِ یه متنِ
// بزرگ‌تر (مثلاً یه جمله‌ی داخلِ داستان) نشسته و می‌خوایم کلیک روش، به‌جای
// پخشِ *ایزوله‌ی* همون جمله‌ی کوچیک، دقیقاً از همون‌جا وسطِ پخشِ *کلِ* متن
// بپره و ادامه بده (یعنی «خواندنِ کلی از همینجا شروع بشه») — fullText همون
// متنِ کامله، و startOffset/resolveStartOffset آفستِ این جمله‌ی خاص داخلِ
// اون متنِ کامله. کلیدِ speechController همیشه بر اساسِ fullText+code
// حساب می‌شه (نه text)، طوری که این دکمه دقیقاً همون سِشنِ پخشِ کلِ متن رو
// (چه در حالِ پخش، چه مکث‌شده) پیدا کنه.
function SpeakButton({ text, code, color, edge, forceRepeat, startOffset, resolveStartOffset, onPlayed, fullText }) {
  const locale = TTS_LOCALE[code] || "en-US";
  const jumpText = fullText || text;
  const myKey = `${locale}::${jumpText}`;
  const [state, setState] = useState(() => speechController.getState());
  // پیغامِ خطای فوری (سنکرون، از خودِ handleToggle) — مثلاً «مرورگر
  // پشتیبانی نمی‌کنه». چند ثانیه بعد خودش پاک می‌شه.
  const [localMsg, setLocalMsg] = useState(null);
  // پیغامِ دوستانه (نه خطا) — وقتی این دکمه، به‌جای صدای نصب‌شده‌ی خودِ
  // گوشی، از مسیرِ آنلاینِ رایگان پخش کرد. جایگزینِ همون پنلِ قدیمیِ
  // «نصب بسته‌ی زبان» تو تنظیمات که حذف شد — حالا این پیام دقیقاً همون‌جا
  // که کاربر واقعاً بهش نیاز داره (زیرِ همون دکمه‌ی 🔊ی همون زبون) ظاهر می‌شه.
  const [voiceHint, setVoiceHint] = useState(null);

  useEffect(() => speechController.subscribe(setState), []);

  useEffect(() => {
    if (!localMsg) return;
    const t = setTimeout(() => setLocalMsg(null), 5000);
    return () => clearTimeout(t);
  }, [localMsg]);

  useEffect(() => {
    if (!voiceHint) return;
    const t = setTimeout(() => setVoiceHint(null), 6000);
    return () => clearTimeout(t);
  }, [voiceHint]);

  // اگه مسیرِ آنلاینِ جایگزین (وقتی گوشی صدایی برای این زبون نداره) کلاً
  // شکست خورد — نه فقط این دکمه ساکت شد، بلکه واقعاً هیچ صدایی از هیچ
  // سرویسی پخش نشد — به‌جای پاپ‌آپِ alert (که کاربر رو مجبور به بستنِ
  // دستی می‌کرد)، پایین‌تر همین‌جا، درست زیرِ همین دکمه/جمله، یه پیغامِ
  // کوچیکِ درجا نشون داده می‌شه (پایین‌تر، errorMsg).
  const errorMsg =
    localMsg || (state.ttsError && state.ttsError === myKey ? "پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن" : null);

  const isActive = state.key === myKey && state.status !== "idle";
  const isPlaying = isActive && state.status === "playing";
  const c = color || colors.gold;

  const handleToggle = (e) => {
    e.stopPropagation();
    // نکته‌ی مهم: اگه resolveStartOffset پاس داده شده، به‌جای پراپِ
    // startOffset (که موقعِ رندرِ قبلیِ این کامپوننت محاسبه شده و ممکنه
    // کهنه باشه — چون rememberMainTextResumeOffset فقط یه Map رو مستقیم
    // آپدیت می‌کنه و هیچ ری‌رندری رو تریگر نمی‌کنه)، همین لحظه که کاربر
    // واقعاً دکمه رو زده دوباره از Map می‌خونیمش. این دقیقاً همون چیزیه که
    // باعث می‌شد «خواندنِ کل متن» بعد از یه پخشِ جزئی (کلمه/محدوده/جمله)
    // گاهی از همون نقطه ادامه پیدا نکنه و از اول شروع بشه.
    const effectiveStartOffset = resolveStartOffset ? resolveStartOffset() : startOffset;

    if (fullText) {
      // حالتِ «پرش داخلِ متنِ کامل» — اگه همین الان دقیقاً همین متنِ کامل
      // (چه در حالِ پخش، چه مکث‌شده) لود شده، هیچ‌وقت نباید toggle معمولی
      // صدا بزنیم (چون toggle با کلیدِ یکسان یعنی «پاز/ادامه»، نه «پرش»).
      // به‌جاش seekToChunk رو مستقیم صدا می‌زنیم تا از دقیقاً همینجا ادامه
      // بده. فقط وقتی کاربر دقیقاً روی همون جمله‌ای که همین الان داره
      // خونده می‌شه دوباره کلیک کنه (یعنی چیزی برای «پرش» نیست)، توگل
      // می‌کنیم تا رفتارِ آشنای «پاز/ادامه» حفظ بشه.
      const st = speechController.getState();
      let fullTextResult = null;
      if (st.key === myKey && st.status !== "idle") {
        const meta = speechController.getChunksMeta();
        const off = Number.isInteger(effectiveStartOffset) ? effectiveStartOffset : 0;
        let idx = 0;
        for (let i = 0; i < meta.length; i++) {
          if (off >= meta[i].start) idx = i;
          else break;
        }
        if (idx === st.chunkIndex) {
          fullTextResult = speechController.toggle(jumpText, code);
        } else {
          speechController.seekToChunk(idx);
        }
      } else {
        // نکته‌ی مهمِ رفعِ باگ: هر دکمه‌ای که با fullText صدا زده می‌شه یعنی
        // «کلِ متن رو از همین‌جا بخون» — پس صرف‌نظر از اینکه کدوم دکمه
        // (پلیرِ مرکزی، یه جمله‌ی خاص، یا یه پاراگراف) این پخش رو شروع
        // کرده، باید همون‌قدر «loop» باشه که پلیرِ مرکزی هست؛ وگرنه با
        // شروعِ پخش از یه جمله‌ی وسط (نه از دکمه‌ی مرکزی) وقتی به آخرِ متن
        // می‌رسید، به‌جای برگشتن به اول، پخش کامل متوقف می‌شد. فقط وقتی
        // صراحتاً forceRepeat === false داده بشه (که فعلاً هیچ‌جا این‌طور
        // نیست)، لوپ خاموش می‌مونه.
        fullTextResult = speechController.toggle(jumpText, code, effectiveStartOffset, forceRepeat === false ? undefined : { loop: true });
      }
      if (fullTextResult === "online-fallback") {
        const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
        setVoiceHint(`صدای ${langLabel} روی گوشیت نصب نیست — فعلاً از اینترنت پخش می‌شه`);
      }
      if (onPlayed) onPlayed();
      return;
    }

    const result = speechController.toggle(text, code, effectiveStartOffset, forceRepeat ? { loop: true } : undefined);
    if (onPlayed) onPlayed();
    // "no-voice" دیگه پیش نمی‌آد چون خودکار می‌ره سراغ سرویس آنلاین رایگان
    // (result === "online-fallback")؛ فقط وقتی هیچ راهی — نه گوشی نه آنلاین —
    // ممکن نبود، خطا نشون می‌دیم. به‌جای alert، همین‌جا زیرِ دکمه نشون
    // داده می‌شه (بالاتر، errorMsg).
    if (result === "unsupported") {
      setLocalMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
    } else if (result === "error") {
      setLocalMsg("پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن");
    } else if (result === "online-fallback") {
      const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
      setVoiceHint(`صدای ${langLabel} روی گوشیت نصب نیست — فعلاً از اینترنت پخش می‌شه`);
    } else if (result === "no-local-voice") {
      const langLabel = LANGUAGES.find((l) => l.code === code)?.label || code;
      setLocalMsg(`صدای ${langLabel} روی گوشیت نصب نیست — از تنظیماتِ گوشی نصبش کن`);
    } else if (result === "no-tts-engine") {
      setLocalMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, order: orderStyle, position: "relative" }}>
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
      {(errorMsg || voiceHint) && (
        <span
          style={{
            position: "absolute",
            top: "100%",
            insetInlineStart: 0,
            marginTop: 2,
            fontSize: 11,
            color: errorMsg ? colors.rose : colors.teal,
            whiteSpace: "nowrap",
            fontFamily: fontFa,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {errorMsg || voiceHint}
        </span>
      )}
    </span>
  );
}
// دکمه‌ی مرکزیِ Play/Pause توی نوارِ پلیرِ پایینِ صفحه. قبلاً این دکمه به‌جای
// subscribe کردن به speechController، state رو فقط یک‌بار موقعِ رندر
// می‌خوند — در نتیجه با یه وضعیتِ کهنه کار می‌کرد و کلیک روش گاهی به‌جای
// «ادامه‌ی پخش» می‌رفت تو مسیرِ «متنِ جدید» (چون key کهنه بود) و از اول
// شروع می‌شد. حالا مثلِ SpeakButton درست subscribe می‌کنه تا همیشه با
// وضعیتِ واقعی و به‌روزِ speechController کار کنه.
function PlayerCentralButton() {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key;
  const isPlaying = isActive && state.status === "playing";
  // متن کوتاه‌شده‌ای که در حال پخشه (حداکثر ۲۰ کاراکتر)
  const shortText = isActive ? state.key?.split("::")?.[1]?.slice(0, 20) : "";

  const handleClick = () => {
    if (!isActive) return;
    // اگر در حال پخش یا مکث است، همان toggle را روی همان متن صدا بزن
    // باید کلید state.key را بشکافیم تا text و code را به دست آوریم
    const parts = state.key?.split("::");
    if (parts && parts.length === 2) {
      const code = Object.keys(TTS_LOCALE).find(k => TTS_LOCALE[k] === parts[0]) || "en";
      speechController.toggle(parts[1], code);
    }
  };

  return (
    <button
      onClick={handleClick}
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
        padding: 6,
        color: active ? c : colors.cardBorder,
        opacity: active ? 1 : 0.6,
      }}
    >
      <Repeat size={19} />
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
// دکمه‌ی A-B — تکرارِ یه بازه‌ی دلخواه بینِ دو جمله، رویِ متنِ TTSِ در حالِ
// پخش. کلاسیک، شبیهِ پلیرهایِ قدیمی: بارِ اول جایِ فعلی رو نقطه‌ی A
// می‌کنه، بارِ دوم نقطه‌ی B — از همون‌جا پخش بینِ A و B تکرار می‌شه. بارِ
// سوم پاک می‌کنه. چون TTS جمله‌به‌جمله‌ست (نه یه فایلِ صوتیِ پیوسته)، A و B
// اینجا شماره‌یِ جمله‌ن (خودِ speechController.markAB این رو مدیریت می‌کنه).
function ABRepeatButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key;
  const disabled = !isActive;
  const c = color || colors.gold;
  const ab = state.abState || "idle";

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    speechController.markAB();
  };

  // به‌جایِ شماره‌ی خامِ جمله (که کاربر هیچ‌جوره نمی‌دونه کدوم جمله‌ست، مگه
  // بره بشمره)، خودِ متنِ همون جمله رو (کوتاه‌شده) نشون می‌دیم — دقیقاً همون
  // شفافیتی که نسخه‌ی صوتِ آپلودی با نمایشِ زمان داره.
  const truncateAB = (s, n) => {
    if (!s) return "";
    const t = s.trim();
    return t.length > n ? `${t.slice(0, n).trim()}…` : t;
  };
  const chunkPreview = (idx, n) => truncateAB(speechController.getChunkText(idx), n);

  const title =
    ab === "idle"
      ? "تکرارِ یه بازه‌ی دلخواه — بزن تا نقطه‌ی A ثبت بشه"
      : ab === "waitingB"
      ? `نقطه‌ی A: «${chunkPreview(state.abChunkA, 30)}» — حالا رویِ جمله‌ی موردنظر برایِ B بزن`
      : `تکرارِ «${chunkPreview(state.abChunkA, 20)}» تا «${chunkPreview(state.abChunkB, 20)}» — بزن تا پاک بشه`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="تکرار بازه A-B"
      title={title}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 2,
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: -0.5,
        color: disabled ? colors.cardBorder : ab === "idle" ? colors.inkSoft : c,
        opacity: disabled ? 0.4 : ab === "idle" ? 0.75 : 1,
      }}
    >
      A-B
      {ab === "waitingB" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          A
        </span>
      )}
      {ab === "looping" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          ↻
        </span>
      )}
      {/* روی موبایل title (تولتیپِ هاور) اصلاً دیده نمی‌شه، برایِ همین بدونِ
          این برچسبِ همیشه‌-نمایان، هیچ راهی نبود بفهمی A/B کجان یا اصلاً
          فعاله یا نه. این چیپ همیشه، بدونِ نیاز به لمسِ نگه‌داشته، بالایِ
          دکمه نشون‌داده می‌شه. */}
      {ab !== "idle" && (
        <span
          style={{
            position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4,
            fontSize: 9, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap",
            backgroundColor: c, color: "white", borderRadius: 5, padding: "2px 5px",
            textAlign: "center", pointerEvents: "none",
          }}
        >
          {ab === "waitingB"
            ? `A: «${chunkPreview(state.abChunkA, 12)}»`
            : `«${chunkPreview(state.abChunkA, 9)}»→«${chunkPreview(state.abChunkB, 9)}»`}
        </span>
      )}
    </button>
  );
}
// همینِ دکمه‌ی A-B، نسخه‌ی صوتِ آپلودیِ کاربر — دقیقاً همون سه‌حالته
// (idle -> waitingB -> looping)، ولی چون اینجا صدا پیوسته‌ست (نه
// جمله‌به‌جمله‌ی TTS)، A و B زمانِ دقیقِ ثانیه‌ای‌ان — همون چیزی که توی
// پروتوتایپِ HTML امتحان شد. منطقش داخلِ useStoryUserAudio (markAB) است.
function UserAudioABButton({ ua, color }) {
  const disabled = !ua.hasAudio;
  const c = color || colors.gold;
  const ab = ua.abState || "idle";

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    ua.markAB();
  };

  const fmtShort = (t) => {
    if (t === null || t === undefined || !isFinite(t)) return "";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const title =
    ab === "idle"
      ? "تکرارِ یه بازه‌ی دلخواه — بزن تا نقطه‌ی A ثبت بشه"
      : ab === "waitingB"
      ? `نقطه‌ی A: ${fmtShort(ua.abA)} — حالا نقطه‌ی B رو بزن`
      : `تکرارِ ${fmtShort(ua.abA)} تا ${fmtShort(ua.abB)} — بزن تا پاک بشه`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="تکرار بازه A-B"
      title={title}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 2,
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: -0.5,
        color: disabled ? colors.cardBorder : ab === "idle" ? colors.inkSoft : c,
        opacity: disabled ? 0.4 : ab === "idle" ? 0.75 : 1,
      }}
    >
      A-B
      {ab === "waitingB" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          A
        </span>
      )}
      {ab === "looping" && (
        <span
          style={{
            position: "absolute", top: -5, right: -7, fontSize: 9, fontWeight: 700, lineHeight: 1,
            backgroundColor: c, color: "white", borderRadius: 6, padding: "1px 3px", minWidth: 10, textAlign: "center",
          }}
        >
          ↻
        </span>
      )}
      {/* همون چیپِ همیشه‌-نمایان که برای نسخه‌ی TTS اضافه شد — اینجا به‌جایِ
          شماره‌ی جمله، زمانِ دقیقِ ثانیه‌ایِ A/B رو نشون می‌ده. */}
      {ab !== "idle" && (
        <span
          style={{
            position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4,
            fontSize: 9, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap",
            backgroundColor: c, color: "white", borderRadius: 5, padding: "2px 5px",
            textAlign: "center", pointerEvents: "none",
          }}
        >
          {ab === "waitingB" ? `A: ${fmtShort(ua.abA)}` : `${fmtShort(ua.abA)}–${fmtShort(ua.abB)}`}
        </span>
      )}
    </button>
  );
}
// دکمه‌ی «بی‌صداکردنِ خوانش» — برایِ کسی که یه نرم‌افزار/دستگاهِ صوتیِ
// جداگانه داره و نمی‌خواد صدایِ TTS اپ باهاش قاطی/تداخل کنه: با زدنش،
// خروجیِ صوتی خاموش می‌شه ولی پخش (پیش‌رفتنِ جمله‌به‌جمله، هایلایت، نوارِ
// پیشرفت) دقیقاً عادی ادامه پیدا می‌کنه — انگار داره می‌خونه، فقط بی‌صدا.
// این یه تنظیمِ سراسریه (خودِ speechController نگهش می‌داره، مثلِ تکرار/
// سرعت) — هرجایِ اپ که بشه پخش کرد، همینجا خاموش/روشنش می‌کنه.
function MuteButton({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const handleClick = (e) => {
    e.stopPropagation();
    speechController.toggleMuted();
  };

  const c = color || colors.gold;
  const muted = !!state.muted;

  return (
    <button
      onClick={handleClick}
      aria-label={muted ? "روشن‌کردنِ صدا" : "بی‌صداکردنِ صدا"}
      title={
        muted
          ? "صدا خاموشه — پخش و هایلایت عادی ادامه داره؛ بزن روشنش کن"
          : "بی‌صداکردنِ صدایِ خوانش — برایِ وقتی نرم‌افزارِ دیگه‌ای صدایِ خودش رو داره"
      }
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        color: muted ? colors.rose : c,
        opacity: muted ? 1 : 0.6,
      }}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      {/* خطِ قطریِ روشن/واضح روی خودِ آیکون — علاوه بر آیکونِ VolumeX،
          تا وقتی صدا خاموشه، بدونِ هیچ ابهامی (حتی با یه نگاهِ گذرا) روشن
          باشه که صدا قطعه. */}
      {muted && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 17,
            height: 2,
            backgroundColor: colors.rose,
            transform: "translate(-50%, -50%) rotate(-45deg)",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}
// دکمه‌ی «رفرش / شروع مجدد» — کنارِ دکمه‌ی تکرارِ سراسری می‌شینه. با زدنش،
// خواندنِ همون متنِ کاملِ تبِ فعلی (چیزی که MainPlayButton هم روش کار
// می‌کنه — startText/startCode) از دقیقاً از ابتدا شروع می‌شه؛ چه الان
// چیزی در حالِ پخش/مکث باشه چه نه، و چه این متن همون متنِ همین الان
// لودشده باشه چه یه متنِ دیگه (مثلاً کاربر بینِ تب‌ها جابه‌جا شده و
// حافظه‌ی «نقطه‌ی ادامه» یه‌جای وسط رو نگه داشته).
// نکته‌ی مهم برای حفظِ هایلایت: اینجا کلیدِ speechController (key) رو
// عوض نمی‌کنیم — فقط chunkIndex رو با seekToChunk(0) برمی‌گردونیم به صفر.
// همه‌ی جاهایی که هایلایتِ زنده رو نشون می‌دن (StoryBuilder، PhraseList،
// WordList و...) با subscribe شدن به همین speechController و مقایسه‌ی
// key/chunkIndex کار می‌کنن؛ پس چون key دست‌نخورده می‌مونه، هایلایت هم
// بدونِ هیچ تغییرِ اضافه‌ای، خودش با chunkIndexِ صفر هماهنگ می‌شه.
function RestartButton({ color, startText, startCode }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const locale = TTS_LOCALE[startCode] || "en-US";
  const myKey = startText ? `${locale}::${startText}` : null;
  const isLoaded = !!myKey && state.key === myKey && state.status !== "idle";
  const disabled = !startText;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!startText) return;
    if (isLoaded) {
      // همین متن از قبل لود شده (چه در حالِ پخش، چه مکث‌شده) — فقط جهش به
      // چانکِ صفر، بدونِ باز کردنِ یه سِشنِ جدید (که باعثِ ازدست‌رفتنِ
      // پیوستگیِ key/هایلایت می‌شد).
      speechController.seekToChunk(0);
    } else {
      // متنِ دیگه‌ای لود بود یا هیچی — یه سِشنِ تازه باز می‌کنیم. توگل با
      // آفستِ ۰ رو صریح حساب نمی‌کنه (۰ یعنی «آفستِ صریح نداده»، پس ممکنه
      // به‌جاش نقطه‌ی ادامه‌ی قبلاً ذخیره‌شده رو بردارد) — برای همین بلافاصله
      // بعدش seekToChunk(0) رو هم صدا می‌زنیم تا مطمئن از ابتدا شروع بشه.
      speechController.toggle(startText, startCode);
      speechController.seekToChunk(0);
    }
  };

  const c = color || colors.gold;
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="شروع مجدد از ابتدای این تب"
      title="شروع مجدد از ابتدای همینِ متن — هایلایت هم همراهش از اول می‌شه"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 6,
        color: disabled ? colors.cardBorder : c,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <RotateCcw size={19} />
    </button>
  );
}
// دکمه‌ی مرکزیِ Play/Pause تو طراحیِ جدیدِ پلیر (شبیهِ پلیرهای موزیک). دو
// حالت داره:
//  - وقتی صدایی از قبل فعاله (پخش/مکث): دقیقاً مثلِ PlayerCentralButtonِ
//    قبلی، همون toggle رو رو همون متن صدا می‌زنه.
//  - وقتی هیچی فعال نیست: اگه startText بهش داده شده باشه (متنِ کاملِ تبِ
//    فعلی — داستان/مکالمه/لیست‌کلمات)، با زدنش همون متن با تنظیمِ تکرارِ
//    سراسری شروع به پخش می‌کنه. این همون کاریه که قبلاً یه SpeakButtonِ
//    جدا کنارِ پلیر انجامش می‌داد؛ الان همون قابلیت داخلِ دکمه‌ی مرکزیه.
function MainPlayButton({ startText, startCode, resolveStartOffset, color, size }) {
  const [state, setState] = useState(() => speechController.getState());
  const [localMsg, setLocalMsg] = useState(null);
  useEffect(() => speechController.subscribe(setState), []);

  useEffect(() => {
    if (!localMsg) return;
    const t = setTimeout(() => setLocalMsg(null), 5000);
    return () => clearTimeout(t);
  }, [localMsg]);

  const isActive = state.status !== "idle" && !!state.key;
  const isPlaying = isActive && state.status === "playing";
  const canStart = !isActive && !!startText;
  const disabled = !isActive && !canStart;
  const c = color || colors.teal;
  const btnSize = size || 30;

  const myKey = startText ? `${TTS_LOCALE[startCode] || "en-US"}::${startText}` : null;
  const errorMsg =
    localMsg || (state.ttsError && myKey && state.ttsError === myKey ? "پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن" : null);

  const handleClick = () => {
    if (isActive) {
      const parts = state.key?.split("::");
      if (parts && parts.length === 2) {
        const code = Object.keys(TTS_LOCALE).find((k) => TTS_LOCALE[k] === parts[0]) || "en";
        speechController.toggle(parts[1], code);
      }
      return;
    }
    if (!startText) return;
    const offset = resolveStartOffset ? resolveStartOffset() : undefined;
    const result = speechController.toggle(startText, startCode, offset, { loop: true });
    // به‌جای alert، همین‌جا زیرِ دکمه‌ی مرکزیِ پلیر نشون داده می‌شه.
    if (result === "unsupported") {
      setLocalMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
    } else if (result === "error") {
      setLocalMsg("پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن");
    } else if (result === "no-local-voice") {
      const langLabel = LANGUAGES.find((l) => l.code === startCode)?.label || startCode;
      setLocalMsg(`صدای ${langLabel} روی گوشیت نصب نیست — از تنظیماتِ گوشی نصبش کن`);
    } else if (result === "no-tts-engine") {
      setLocalMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
    }
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-label={isPlaying ? "توقف موقت" : "پخش"}
        title={isPlaying ? "توقف موقت" : isActive ? "ادامه‌ی پخش" : canStart ? "پخشِ کل متن" : "متنی برای پخش نیست"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: btnSize + 18,
          height: btnSize + 18,
          borderRadius: "50%",
          background: disabled ? colors.cardBorder : c,
          border: "none",
          cursor: disabled ? "default" : "pointer",
          color: colors.paper,
          opacity: disabled ? 0.45 : 1,
          flexShrink: 0,
          padding: 0,
          boxShadow: disabled ? "none" : "0 2px 6px rgba(28,37,65,0.22)",
        }}
      >
        {isPlaying ? (
          <Pause size={Math.round(btnSize * 0.56)} fill={colors.paper} />
        ) : (
          <Play size={Math.round(btnSize * 0.56)} fill={colors.paper} style={{ marginInlineStart: 2 }} />
        )}
      </button>
      {errorMsg && (
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 2,
            fontSize: 11,
            color: colors.rose,
            whiteSpace: "nowrap",
            fontFamily: fontFa,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {errorMsg}
        </span>
      )}
    </span>
  );
}
// آیکونِ سه‌گوشِ خطی-سبک («کلاسیک») برایِ دکمه‌های عقب/جلوی پلیر — به‌جایِ
// آیکونِ SkipBack/SkipForwardِ پیش‌فرضِ lucide (که یه خط/بار کنارِ مثلث
// داره، شبیهِ «برو ترکِ بعدی»)، اینجا فقط یه مثلثِ توخالیِ ساده می‌کشیم؛
// دقیقاً شبیهِ دکمه‌های پلیرهایِ قدیمی/کلاسیک.
function ClassicTriangleIcon({ direction = "right", size = 20, color = "currentColor" }) {
  const points = direction === "right" ? "7,4 20,12 7,20" : "17,4 4,12 17,20";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points={points} stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
// دکمه‌های «جمله‌ی قبل / جمله‌ی بعد» — تو نوارِ کنترلِ پلیرِ جدید، کنارِ دکمه‌ی
// مرکزیِ پخش می‌شینن. فقط وقتی یه متن در حالِ پخش/مکث‌شدنه فعالن؛ با
// speechController.seekToChunk جمله‌ی currentِ فعلی رو عوض می‌کنن (پخش هم
// خودکار از همون‌جا ادامه پیدا می‌کنه).
function ChunkNavButton({ direction, color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);

  const isActive = state.status !== "idle" && !!state.key && state.total > 0;
  const atStart = state.chunkIndex <= 0;
  const atEnd = state.chunkIndex >= state.total - 1;
  const disabled = !isActive || (direction === "prev" ? atStart : atEnd);
  const c = color || colors.ink;

  const handleClick = () => {
    if (disabled) return;
    speechController.seekToChunk(state.chunkIndex + (direction === "prev" ? -1 : 1));
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "جمله‌ی قبل" : "جمله‌ی بعد"}
      title={direction === "prev" ? "جمله‌ی قبل" : "جمله‌ی بعد"}
      style={{
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? colors.cardBorder : c,
        opacity: disabled ? 0.45 : 1,
        padding: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <ClassicTriangleIcon direction={direction === "prev" ? "left" : "right"} size={22} color={disabled ? colors.cardBorder : c} />
    </button>
  );
}
// دکمه‌ی «ضبطِ صدایِ خودم» — گوشه‌ی بالا-راستِ پلیر. کاملاً جدا از پخشِ
// اصلیِ TTS (که با MuteButton/MainPlayButton و speechController کار
// می‌کنه): این ضبط با getUserMedia + MediaRecorder انجام می‌شه و پخشِ
// برگشتی‌اش هم یه <audio> کاملاً مستقله — پس نه رویِ خواندنِ اپ تأثیر
// می‌ذاره نه برعکس، و می‌شه هر دو رو همزمان پخش کرد و باهم مقایسه کرد.
// صدایِ ضبط‌شده فقط توی حافظه (state) نگه داشته می‌شه — جایی ذخیره
// نمی‌شه، موقتیه، و با دکمه‌ی ضربدر یا بستنِ صفحه پاک می‌شه.
function MyVoiceRecorder({ color }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [micError, setMicError] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const audioUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioElRef.current) audioElRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const startRecording = async (e) => {
    e.stopPropagation();
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        audioElRef.current = null;
        setAudioUrl(url);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setMicError(true);
    }
  };

  const stopRecording = (e) => {
    e.stopPropagation();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (!audioElRef.current) {
      audioElRef.current = new Audio(audioUrl);
      audioElRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioElRef.current.pause();
      setPlaying(false);
    } else {
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const deleteRecording = (e) => {
    e.stopPropagation();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setPlaying(false);
  };

  const c = color || colors.rose;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6, flexShrink: 0 }}
    >
      {micError && (
        <span style={{ fontSize: 10, color: colors.rose }}>دسترسی به میکروفون رد شد</span>
      )}
      {audioUrl && (
        <>
          <button
            onClick={togglePlay}
            aria-label={playing ? "توقفِ پخشِ صدایِ ضبط‌شده" : "پخشِ صدایِ ضبط‌شده‌ی من"}
            title="پخشِ صدایِ خودم — جدا از خواندنِ اپ"
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.teal, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {playing ? <Pause size={15} /> : <PlayCircle size={15} />}
          </button>
          <button
            onClick={deleteRecording}
            aria-label="حذفِ صدایِ ضبط‌شده"
            title="حذفِ صدایِ ضبط‌شده (موقتی بود، ذخیره نمی‌شه)"
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.inkSoft, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} />
          </button>
        </>
      )}
      <button
        onClick={recording ? stopRecording : startRecording}
        aria-label={recording ? "توقفِ ضبط" : "ضبطِ صدایِ من"}
        title={recording ? "توقفِ ضبط" : "ضبطِ صدایِ من — برایِ خواندنِ متن و تمرین با صدایِ بلندِ خودم"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: recording ? colors.rose : c,
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {recording ? <Square size={19} fill={colors.rose} /> : <Mic size={19} />}
      </button>
    </div>
  );
}
// نوارِ پیشرفتِ کِشیدنی/تپ‌کردنیِ پلیر — دقیقاً همون ایده‌ی دموی
// «demo-progress-bar.html»: چون پخش با Web Speech API انجام می‌شه (نه یه
// فایلِ صوتیِ واقعی)، مرورگر currentTime/duration واقعی بهمون نمی‌ده. برای
// همین دقتِ این نوار «جمله‌به‌جمله»ست (نه میلی‌ثانیه‌ای)، و زمانِ نشون‌داده‌شده
// یه تخمینه — بر اساسِ طولِ کاراکتریِ متن و سرعتِ فعلیِ پخش. کشیدن/تپ‌کردن
// رو نوار، جمله‌ی متناظرش رو با speechController.seekToChunk صدا می‌زنه.
const TTS_MS_PER_CHAR = 90; // فقط برای تخمینِ زمانِ نمایشی — نه پخشِ واقعی
function PlayerProgressTrack({ color }) {
  const [state, setState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setState), []);
  const trackRef = useRef(null);
  const [dragPct, setDragPct] = useState(null);
  const draggingRef = useRef(false);

  const isActive = state.status !== "idle" && !!state.key && state.total > 0;
  const meta = isActive ? speechController.getChunksMeta() : [];
  const fullLen = isActive ? speechController.getFullTextLength() : 0;
  const msPerChar = TTS_MS_PER_CHAR / Math.max(state.rate || 1, 0.25);
  const totalMs = fullLen * msPerChar;
  const chunkStart = isActive && meta[state.chunkIndex] ? meta[state.chunkIndex].start : 0;
  const restPct = fullLen ? (chunkStart / fullLen) * 100 : 0;
  const shownPct = dragPct != null ? dragPct : restPct;
  const c = color || colors.gold;

  function fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return toFaDigits(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
  }

  function pctFromClientX(clientX) {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    // پخش همیشه از چپ به راست پیش می‌ره (استانداردِ جهانیِ پلیرهای صوتی،
    // مستقل از راست‌به‌چپ بودنِ متن/رابط): سمتِ چپِ نوار = صفر درصد، راست = صد درصد
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(100, Math.max(0, pct));
  }
  function idxFromPct(pct) {
    if (!meta.length || !fullLen) return 0;
    const targetChar = (pct / 100) * fullLen;
    let idx = 0;
    for (let i = 0; i < meta.length; i++) {
      if (targetChar >= meta[i].start) idx = i;
    }
    return idx;
  }
  function onMove(clientX) {
    setDragPct(pctFromClientX(clientX));
  }
  function onEnd(clientX) {
    const pct = pctFromClientX(clientX);
    const idx = idxFromPct(pct);
    setDragPct(null);
    draggingRef.current = false;
    speechController.seekToChunk(idx);
  }
  function startDrag(clientX) {
    if (!isActive) return;
    draggingRef.current = true;
    onMove(clientX);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (draggingRef.current) onMove(e.clientX);
    }
    function handleMouseUp(e) {
      if (draggingRef.current) onEnd(e.clientX);
    }
    function handleTouchMove(e) {
      if (draggingRef.current && e.touches[0]) onMove(e.touches[0].clientX);
    }
    function handleTouchEnd(e) {
      if (draggingRef.current) {
        const t = e.changedTouches[0];
        onEnd(t ? t.clientX : 0);
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, fullLen]);

  return (
    <div className="px-4 flex items-center gap-2" style={{ paddingTop: 2 }}>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center", flexShrink: 0 }}>
        {isActive ? fmtTime((shownPct / 100) * totalMs) : "۰۰:۰۰"}
      </span>
      <div
        ref={trackRef}
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) startDrag(t.clientX);
        }}
        style={{
          position: "relative",
          flex: 1,
          height: 24,
          display: "flex",
          alignItems: "center",
          cursor: isActive ? "pointer" : "default",
          touchAction: "none",
          opacity: isActive ? 1 : 0.45,
        }}
      >
        <div style={{ position: "absolute", right: 0, left: 0, height: 4, borderRadius: 2, background: colors.goldSoft }} />
        {isActive && meta.length > 1 && fullLen > 0 && (
          <div style={{ position: "absolute", right: 0, left: 0, height: 4 }}>
            {meta.slice(1).map((m, i) => (
              <div
                key={i}
                style={{ position: "absolute", top: 0, width: 2, height: 4, background: "rgba(28,37,65,.3)", left: `${(m.start / fullLen) * 100}%` }}
              />
            ))}
          </div>
        )}
        {/* پخش از چپ به راست پیش می‌ره: بخشِ پرشده از سمتِ چپِ نوار شروع
            می‌شه و با پیشرفتِ خواندن به سمتِ راست بزرگ‌تر می‌شه. */}
        <div style={{ position: "absolute", left: 0, height: 4, borderRadius: 2, background: c, width: `${shownPct}%` }} />
        <div
          style={{
            position: "absolute",
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: c,
            border: `2px solid ${colors.paper}`,
            boxShadow: "0 1px 4px rgba(28,37,65,.35)",
            left: `${shownPct}%`,
            transform: "translateX(-50%)",
          }}
        />
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, color: colors.inkSoft, minWidth: 36, textAlign: "center", flexShrink: 0 }}>
        {isActive ? fmtTime(totalMs) : "۰۰:۰۰"}
      </span>
      <SpeedControl color={colors.gold} />
    </div>
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
  // آخرین ایندکسِ آیتمی که خواندنِ خودکار توش بود، وقتی کاربر دکمه‌ی
  // توقف رو زد (یا کامپوننت خاموش شد). دفعه‌ی بعد که دوباره روشنش کنه،
  // از همین ایندکس ادامه می‌ده — نه از آیتمِ اول. (آفستِ دقیقِ داخلِ خودِ
  // همون آیتم رو دیگه لازم نیست جدا نگه داریم؛ چون speechController خودش
  // به‌طور خودکار آخرین نقطه‌ی هر متن رو به‌خاطر می‌سپاره و همین که
  // playAt دوباره برای همون آیتم toggle رو صدا بزنه، از همون‌جا ادامه
  // پیدا می‌کنه.)
  const savedIdxRef = useRef(0);
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
      // کل لیست طبیعی تموم شد — دفعه‌ی بعد که «خواندنِ خودکار» دوباره
      // زده بشه، باید از آیتمِ اول شروع بشه، نه اینکه بخواد ادامه‌ی
      // چیزی بده که قبلاً تمام‌شده.
      savedIdxRef.current = 0;
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
      // نقطه‌ی توقف رو نگه می‌داریم — دفعه‌ی بعد که «خواندنِ خودکار» دوباره
      // روشن بشه، از همین آیتم ادامه پیدا می‌کنه (نه از اول لیست). آفستِ
      // دقیقِ داخلِ خودِ آیتم رو خودِ speechController خودکار به‌خاطر می‌سپاره.
      savedIdxRef.current = idxRef.current;
      activeRef.current = false;
      setActive(false);
      speechController.stop();
    } else {
      activeRef.current = true;
      idxRef.current = savedIdxRef.current;
      setActive(true);
      playAt(savedIdxRef.current);
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
  // همون منطق برای دکمه‌ی «افزودن به جعبه‌ی لایتنر» — فقط برای فیدبکِ خودِ
  // دکمه (تیک‌خوردن)، هر بار که یه لغتِ تازه باز می‌شه ریست می‌شه.
  const [leitnerAdded, setLeitnerAdded] = useState(false);
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
  // تنظیماتِ سراسریِ اندازه/بولدِ متنِ زبانِ مقصد — alignSourceText فقط
  // وقتی پر می‌شه که این نمونه داره یه «ترجمه» رو نشون می‌ده (نه خودِ
  // متنِ اصلی)؛ همون علامتیه که برای تفکیکِ «متن اصلی» از «ترجمه» در
  // تنظیماتِ بولد استفاده می‌کنیم.
  const targetTextPrefs = useTargetTextPrefs();
  const isTranslationInstance = !!alignSourceText;
  const targetShouldBold =
    targetTextPrefs.bold === "both" ||
    (targetTextPrefs.bold === "text" && !isTranslationInstance) ||
    (targetTextPrefs.bold === "translation" && isTranslationInstance);
  const targetEffectiveWeight = targetShouldBold ? fontWeight || 700 : 400;
  const targetEffectiveSize = Math.round((fontSize || 14) * ((targetTextPrefs.scale || 100) / 100));

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
        // این جمله (alignSourceText) فقط وقتی صاحبِ واقعیِ این لغته که خودِ
        // لغت عیناً توش باشه. قبلاً اگه این ClickableSentence خاص جمله‌ی
        // درستِ این لغت رو نداشت (چون هر نمونه از ClickableSentence برای
        // *همه‌ی* لغاتِ ذخیره‌شده تلاش می‌کرد، نه فقط لغاتِ همون جمله)، باز
        // هم می‌رفت سراغِ «ترجمه‌ی مجزای کلمه» (بی‌ربط به این جمله) و همون
        // نتیجه‌ی نادرست رو *سراسری* (برای کل اپ) کش می‌کرد — و اگه این
        // بره جلوتر از نمونه‌ای که واقعاً جمله‌ی درست رو داره، زیرخط همیشه
        // رو کلمه‌ی اشتباه می‌افتاد. پس اگه این جمله زبانِ مبدأِ لغت رو داره
        // ولی خودِ لغت توش نیست، این نمونه کلاً بی‌خیالِ این لغت می‌شه و
        // می‌ذاره نمونه‌ای که واقعاً همون جمله رو داره حلش کنه.
        if (alignSourceText && e.langCode === alignSourceLang && findWholeWordIndex(alignSourceText, e.word) === -1) {
          return;
        }
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
    // قبلاً این عدد ثابت (۴) بود، یعنی محدوده‌های انتخابیِ بلندتر از ۴ کلمه
    // (مثلاً یک جمله‌ی کامل که با «افزودن به داستان بعدی» ذخیره شده) هرگز
    // به‌صورتِ یک واحد پیدا/زیرخط نمی‌شدن — نه در متنِ اصلی، نه معادلشون در
    // ترجمه (crossTerms). حالا سقف رو از رویِ درازترین عبارتِ واقعاً
    // ذخیره‌شده حساب می‌کنیم تا هر محدوده‌ای، هرچقدر هم بلند، دقیقاً همون‌طور
    // که انتخاب و ذخیره شده زیرخط بخوره.
    const phraseWordLens = [...savedTerms.map((e) => e.word), ...crossTerms]
      .map((w) => (w.match(/\S+/g) || []).length)
      .filter((n) => n > 0);
    const MAX_EXPR_WORDS = phraseWordLens.length ? Math.min(60, Math.max(...phraseWordLens)) : 1;
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
    setLeitnerAdded(false);
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

  // مثلِ saveActiveTermToGrammar بالا، ولی به‌جای گرامر، لغت رو به استخرِ
  // مرورِ جعبه‌ی لایتنر اضافه می‌کنه (سطحِ اول = تازه/نیازمندِ مرور). از
  // singletonِ requestAddToLeitner (بالای فایل، ست‌شده توسطِ PhrasebookMain)
  // استفاده می‌کنه تا لازم نباشه boxes/setBoxes رو تا این‌جا پاس بدیم.
  function addActiveTermToLeitner() {
    if (!activeTerm || !requestAddToLeitner) return;
    const meaningText = info && info !== "loading" && info !== "error" ? info.meaning : "";
    requestAddToLeitner(activeTerm, langCode, meaningText);
    setLeitnerAdded(true);
  }

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
                fontWeight: targetEffectiveWeight,
                fontSize: targetEffectiveSize,
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addActiveTermToLeitner();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: leitnerAdded ? colors.gold : colors.paper,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${leitnerAdded ? colors.gold : "rgba(255,255,255,0.25)"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      <RotateCcw size={11} />
                      {leitnerAdded
                        ? isFa
                          ? "به جعبه‌ی لایتنر اضافه شد"
                          : "Added to Leitner box"
                        : isFa
                        ? "افزودن به جعبه‌ی لایتنر"
                        : "Add to Leitner box"}
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

function LevelFilterRow({ levelFilter, setLevelFilter, uiLang }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => setLevelFilter("all")}
        style={{
          fontFamily: uiLang === "en" ? fontLatin : fontFa,
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 16px",
          borderRadius: 999,
          border: `1px solid ${levelFilter === "all" ? colors.ink : colors.cardBorder}`,
          backgroundColor: levelFilter === "all" ? colors.ink : "white",
          color: levelFilter === "all" ? colors.paper : colors.inkSoft,
          flexShrink: 0,
        }}
      >
        {uiLang === "en" ? "All levels" : "همه سطح‌ها"}
      </button>
      {LEVELS.map((lvl) => (
        <button
          key={lvl}
          onClick={() => setLevelFilter(lvl)}
          style={{
            fontFamily: fontLatin,
            fontSize: 13,
            fontWeight: 600,
            padding: "9px 16px",
            borderRadius: 999,
            border: `1px solid ${levelFilter === lvl ? colors.ink : colors.cardBorder}`,
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
// شبکه‌ی چیپ‌های زبانِ داستان‌ساز («داستان همزمان به چه زبان‌هایی ترجمه
// بشه؟») — هم با تپ، انتخاب/عدمِ انتخاب می‌شن (مثلِ قبل)، هم با
// نگه‌داشتن‌وکشیدن (چه با ماوس چه با انگشت) جابه‌جا می‌شن — دقیقاً همون
// تکنیکِ OrderChips بالا، با این تفاوت که این‌جا چون خودِ چیپ‌ها هم قابلِ
// تپ‌کردن‌اند (نه فقط کشیدن)، تشخیصِ «تپ» از «کشیدن» کاملاً خودمون انجام
// می‌دیم (نه با رویدادِ onClick): تا وقتی جابه‌جاییِ لمس/ماوس از یه آستانه‌ی
// کوچیک بیشتر نشده، «تپ» حساب می‌شه و در پایانِ لمس/کلیک، انتخاب/عدمِ
// انتخاب رو صدا می‌زنیم؛ اگه از اون آستانه گذشت، دیگه «کشیدن» حساب می‌شه و
// چیدمانِ چیپ‌ها عوض می‌شه (بدونِ اینکه انتخابش عوض بشه).
function DraggableToggleLangGrid({ order, onReorder, languages, selected, onToggle }) {
  const [dragCode, setDragCode] = useState(null);
  const stateRef = useRef({ code: null, x: 0, y: 0, dragging: false });

  useEffect(() => {
    const DRAG_THRESHOLD = 8; // px — کمتر از این، تپ حساب می‌شه نه کشیدن
    const getPoint = (e) => (e.touches ? e.touches[0] : e);

    const handleMove = (e) => {
      const st = stateRef.current;
      if (!st.code) return;
      const point = getPoint(e);
      if (!point) return;
      const dx = point.clientX - st.x;
      const dy = point.clientY - st.y;
      if (!st.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        st.dragging = true;
        setDragCode(st.code);
      }
      if (e.cancelable) e.preventDefault();
      const el = document.elementFromPoint(point.clientX, point.clientY);
      const chipEl = el && el.closest("[data-order-code]");
      if (!chipEl) return;
      const hoveredCode = chipEl.getAttribute("data-order-code");
      if (hoveredCode === st.code) return;
      const fromIndex = order.indexOf(st.code);
      const toIndex = order.indexOf(hoveredCode);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...order];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, st.code);
      onReorder(next);
    };

    const handleUp = () => {
      const st = stateRef.current;
      // فقط اگه واقعاً کشیده نشده بود (یعنی همون‌جا رها شد)، تپ حساب
      // می‌شه و انتخاب/عدمِ انتخابش عوض می‌شه.
      if (st.code && !st.dragging) onToggle(st.code);
      stateRef.current = { code: null, x: 0, y: 0, dragging: false };
      setDragCode(null);
    };

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
  }, [order, onReorder, onToggle]);

  return (
    <div className="flex flex-wrap gap-2">
      {order.map((code) => {
        const lang = languages.find((l) => l.code === code);
        if (!lang) return null;
        const isOn = selected.includes(code);
        const isDragging = dragCode === code;
        return (
          <div
            key={code}
            data-order-code={code}
            onMouseDown={(e) => {
              stateRef.current = { code, x: e.clientX, y: e.clientY, dragging: false };
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              stateRef.current = { code, x: t.clientX, y: t.clientY, dragging: false };
            }}
            style={{
              touchAction: "none",
              userSelect: "none",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 12,
              border: `1px solid ${isDragging ? colors.gold : isOn ? colors.gold : colors.cardBorder}`,
              backgroundColor: isDragging ? colors.gold : isOn ? colors.goldSoft : "white",
              color: isDragging ? "white" : colors.ink,
              cursor: "grab",
            }}
          >
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

// طولِ هر گزینه، تقریبی: «کوتاه» ≈ ۱ تا ۲ پاراگراف (۴-۶ جمله‌ای)، «متوسط» ≈
// ۲ تا ۳ پاراگراف (۵-۸ جمله‌ای)، «بلند» ≈ ۴ تا ۶ پاراگراف (۶-۱۰ جمله‌ای).
// عددِ tokens یعنی سقفِ توکنِ خروجی‌ای که به AI اجازه می‌دیم برای هر تلاش
// مصرف کنه (نه چیزی که همیشه پر می‌شه) — این سقف‌ها نسبت به قبل حدودِ ۲۵٪
// کم شدن (قبلاً ۱۴۰۰/۲۵۰۰/۴۲۰۰ بود) چون فاصله‌ی خالیِ زیادی نسبت به حجمِ
// واقعیِ JSONِ خروجی (پاراگراف‌ها + ۵ سوال) داشتن؛ اگه برای یه زبانِ خاص
// (مثلاً زبان‌هایی با توکن‌به‌ازای‌حرفِ بیشتر) بازم truncation دیدی، همینجا
// بالا ببرشون.
const STORY_LENGTHS = [
  { key: "short", label: "کوتاه", labelEn: "Short", paragraphs: "1-2", paragraphMin: 1, paragraphMax: 2, sentencesHint: "short, roughly 4-6 sentences per paragraph", tokens: 1100 },
  { key: "medium", label: "متوسط", labelEn: "Medium", paragraphs: "2-3", paragraphMin: 2, paragraphMax: 3, sentencesHint: "medium length, roughly 5-8 sentences per paragraph", tokens: 1900 },
  { key: "long", label: "بلند", labelEn: "Long", paragraphs: "4-6", paragraphMin: 4, paragraphMax: 6, sentencesHint: "long, roughly 6-10 sentences per paragraph", tokens: 3200 },
];

const CONTENT_TYPES = [
  { key: "general", label: "عمومی", labelEn: "General", prompt: "a general, everyday short story" },
  { key: "news", label: "خبری", labelEn: "News", prompt: "a short news-style report, written like a news article" },
  { key: "psychology", label: "روان‌شناسی", labelEn: "Psychology", prompt: "a short piece exploring a psychology or self-understanding theme" },
  { key: "children", label: "کودکانه", labelEn: "Children's", prompt: "a simple, gentle children's story" },
  { key: "funny", label: "خنده‌دار", labelEn: "Funny", prompt: "a lighthearted, funny, comedic story with a humorous twist" },
  { key: "mystery", label: "رازآلود و ترسناک", labelEn: "Mystery & scary", prompt: "a suspenseful, mysterious, slightly scary story with an eerie atmosphere" },
  { key: "crime", label: "جنایی", labelEn: "Crime", prompt: "a crime/detective story involving an investigation or mystery to solve" },
  { key: "scientific", label: "علمی", labelEn: "Scientific", prompt: "a short popular-science explainer written as a narrative" },
  { key: "conversational", label: "مکالمه‌ای", labelEn: "Conversational", prompt: "a natural back-and-forth dialogue between two people" },
  { key: "philosophical", label: "فلسفی", labelEn: "Philosophical", prompt: "a short philosophical reflection or thought experiment" },
  { key: "metaphysical", label: "متافیزیکی", labelEn: "Metaphysical", prompt: "a short metaphysical/speculative piece about existence, mind, or reality" },
];

// ---------------------------------------------------------------------------
// شکستنِ متنِ یه پاراگراف به جمله‌های واقعی — هوش مصنوعی که داستان می‌سازه
// قراره طبق پرامپت هر جمله رو یه آیتمِ جدا تو آرایه‌ی «sentences» برگردونه،
// ولی بعضی‌وقت‌ها (خصوصاً مدل‌های سریع/رایگانِ زنجیره) چند جمله رو تو یه
// آیتم می‌چپونه — دقیقاً همون باگی که کاربر تو حالتِ «جمله به جمله» دید
// (یه بلوکِ هایلایت‌شده‌ی خیلی طولانی، شاملِ چند جمله‌ی کامل). به‌جای اینکه
// صرفاً به رعایتِ مدل اعتماد کنیم، خروجیِ هر پاراگراف رو خودمون هم از نو
// رویِ علامتِ‌های پایانِ‌جمله (.!?؟。！) می‌شکنیم تا «جمله به جمله» همیشه
// واقعاً جمله‌به‌جمله باشه — صرف‌نظر از این‌که مدل چطور گروه‌بندی کرده بود.
// سقفِ تعدادِ کلمه در هر «جمله»‌یِ داخلِ دیتای اپ — دقیقاً همون عددی که
// speechController برای شکستنِ اضطراریِ جمله‌های خیلی‌بلند موقعِ خوندن با
// صدا استفاده می‌کنه (MAX_WORDS_PER_CHUNK). قبلاً این‌جا هیچ سقفی نبود، و
// وقتی متنِ ورودی (خصوصاً PDF/پیست/لینک) علامتِ‌پایانِ‌جمله نداشت (یا کم
// داشت)، کلِ یه پاراگراف/صفحه به‌عنوانِ یک «جمله»‌ی غول‌پیکر ثبت می‌شد —
// همون چیزی که کاربر به‌عنوانِ «جمله‌به‌جمله جدا نمی‌شه» می‌دید. بدترش این
// بود که همین یک «جمله»‌ی غول‌پیکر، موقعِ پخشِ صوتی، خودِ speechController
// (با همین سقف) به چند تکه‌ی کوچیک‌تر می‌شکستش تا بخونتش — یعنی صدا داشت
// جمله‌به‌جمله جلو می‌رفت ولی هایلایت/اسکرول (که رویِ گرانولاریتیِ دیتای
// اپ کار می‌کنه) کلِ اون مدت رویِ همون یک آیتمِ غول‌پیکر گیر می‌کرد و
// حرکت نمی‌کرد. با اعمالِ همین سقف این‌جا هم، دیتای اپ و چیزی که صدا واقعاً
// می‌خونه یک‌به‌یک هماهنگ می‌مونن.
const MAX_WORDS_PER_SENTENCE_ITEM = 40;

function splitTextIntoSentenceStrings(text) {
  const t = (text || "").trim();
  if (!t) return [];
  // نقطه‌ی بینِ دو رقم (مثلِ 3.2 یا 20.15) پایانِ جمله نیست، یه عددِ اعشاریه —
  // قبل از تقسیم‌کردن موقتاً با یه کاراکترِ کنترلی (که تو متنِ واقعی پیش
  // نمی‌آد) جایگزینش می‌کنیم تا رجکسِ زیر روش نشکنه، بعد برش‌ش می‌دیم.
  const DECIMAL_MARK = "\u0001";
  const protectedT = t.replace(/(\d)\.(?=\d)/g, `$1${DECIMAL_MARK}`);
  const re = /[^.!?؟。！]+[.!?؟。！]*/g;
  const rawParts = [];
  let m;
  while ((m = re.exec(protectedT))) {
    const trimmed = m[0].trim();
    if (trimmed) rawParts.push(trimmed);
  }
  const restoreDecimals = (s) => s.split(DECIMAL_MARK).join(".");
  const parts = (rawParts.length ? rawParts : [protectedT]).map(restoreDecimals);
  // اگه یکی از این «جمله»‌ها (به‌خاطرِ نبودِ نقطه/علامتِ‌نگارشیِ کافی تو
  // متنِ خام) غیرعادی بلند از آب دراومد، همینجا هم رویِ مرزِ کلمه می‌شکونیمش
  // — دقیقاً هم‌شکلِ همون منطقی که speechController برای پخشِ صوتی داره.
  const out = [];
  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS_PER_SENTENCE_ITEM) {
      out.push(part);
      continue;
    }
    for (let i = 0; i < words.length; i += MAX_WORDS_PER_SENTENCE_ITEM) {
      out.push(words.slice(i, i + MAX_WORDS_PER_SENTENCE_ITEM).join(" "));
    }
  }
  return out.length ? out : [t];
}
function enforceSentenceSplit(paragraphs) {
  return (paragraphs || []).map((p) => {
    const joined = (p.sentences || []).map((s) => s?.text || "").join(" ");
    const resplit = splitTextIntoSentenceStrings(joined);
    return { ...p, sentences: resplit.map((text) => ({ text })) };
  });
}

// استخراجِ متنِ یک صفحه‌ی PDF از content.items، طوری که ساختارِ سطربندیِ
// خودِ صفحه (کجا خط عوض شده، کجا یه پاراگراف/بلوکِ جدا شروع شده) حفظ
// بشه — نه این‌که همه‌چی با یه space به هم بچسبن و کاملاً یه بلوکِ
// یک‌دست بشن. این برای اونجاهایی لازمه که بعداً ترجمه هم قراره پاراگراف‌
// به‌پاراگراف، هم‌شکلِ متنِ اصلی نشون داده بشه (وگرنه کاربر نمی‌فهمه کدوم
// تکه‌ی ترجمه مالِ کدوم خط/بخشِ اصلیه).
// pdf.js رویِ هر آیتمِ متنی یک `hasEOL` می‌ده (یعنی «بعدِ این آیتم خط عوض
// می‌شه»)؛ از همون برای مرزِ خط استفاده می‌کنیم. برای تشخیصِ مرزِ
// پاراگراف (نه فقط خط)، فاصله‌ی عمودیِ بینِ خط‌ها رو با فاصله‌ی «معمولیِ»
// بینِ خط‌های همون صفحه مقایسه می‌کنیم — فاصله‌ی به‌مراتب بزرگ‌تر یعنی
// این‌جا یه بلوکِ تازه (پاراگراف/تیتر/آیتمِ جدا) شروع شده.
// استخراجِ «تخت» (بدونِ حفظِ پاراگراف) از content.items یه صفحه‌ی PDF —
// برخلافِ چسبوندنِ سرراستِ هر آیتم با یه space وسطشون
// (`.map(it=>it.str).join(" ")`)، که چون خیلی از فونت‌ها/PDFها
// (مخصوصاً متنِ justify‌شده) هر چندتا حرف رو به‌صورتِ آیتمِ جداگونه
// می‌دن، باعثِ افتادنِ فاصله‌ی اضافه وسطِ خودِ کلمه‌ها می‌شد — مثلاً
// «was» به‌صورتِ «w as» یا «time» به‌صورتِ «ti m e» درمی‌اومد، چون
// بینِ هر دو آیتم (even وسطِ یه کلمه) یه space زوری اضافه می‌شد.
// اینجا دقیقاً مثلِ extractPdfPageTextWithBreaks آیتم‌ها رو بدونِ
// separatorِ اضافه بهم می‌چسبونیم (فاصله‌ی واقعیِ بینِ کلمه‌ها از قبل
// خودِ pdf.js تشخیص داده و تو str آیتم‌ها گذاشته)، و فقط سرِ هر خط
// (hasEOL) یه space می‌ذاریم تا کلمه‌های دو سرِ خط بهم نچسبن.
function extractPdfPageTextFlat(content) {
  const items = content?.items || [];
  let out = "";
  for (const it of items) {
    out += it.str || "";
    if (it.hasEOL) out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

function extractPdfPageTextWithBreaks(content) {
  const items = content?.items || [];
  const rawLines = [];
  let curStr = "";
  let curY = null;
  for (const it of items) {
    if (curY === null && Array.isArray(it.transform)) curY = it.transform[5];
    curStr += it.str || "";
    if (it.hasEOL) {
      rawLines.push({ text: curStr, y: curY });
      curStr = "";
      curY = null;
    }
  }
  if (curStr.trim()) rawLines.push({ text: curStr, y: curY });
  const lines = rawLines.filter((l) => l.text.trim());
  if (!lines.length) return "";

  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i - 1].y != null && lines[i].y != null) {
      gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
    }
  }
  gaps.sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

  let out = lines[0].text.trim();
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const line = lines[i];
    const gap = prev.y != null && line.y != null ? Math.abs(prev.y - line.y) : typicalGap;
    const isParagraphBreak = typicalGap > 0 && gap > typicalGap * 1.5;
    out += (isParagraphBreak ? "\n\n" : "\n") + line.text.trim();
  }
  return out.trim();
}

// ترجمه‌ی یک متنِ چندپاراگرافه (خروجیِ تابعِ بالا) طوری که مرزِ پاراگراف‌ها
// (خطِ خالی بینِ بلوک‌ها) عیناً تو ترجمه هم حفظ بشه — هر پاراگراف جدا
// ترجمه می‌شه و با همون \n\n به‌هم وصل می‌شن، تا کاربر بتونه بلوک‌به‌بلوک
// متنِ اصلی و ترجمه رو کنارِ هم تطبیق بده.
async function translatePageTextPreservingParagraphs(pageText, targetLang, aiSettings) {
  const paragraphs = (pageText || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  const translatedParagraphs = await runWithConcurrencyLimit(paragraphs, GLOBAL_TRANSLATE_CONCURRENCY, async (para) => {
    const flat = para.replace(/\s*\n\s*/g, " ").trim();
    if (!flat) return "";
    const sentences = splitTextIntoSentenceStrings(flat);
    const groups = [];
    let cur = "";
    for (const s of sentences.length ? sentences : [flat]) {
      if (cur && (cur + " " + s).length > 400) {
        groups.push(cur);
        cur = s;
      } else {
        cur = cur ? `${cur} ${s}` : s;
      }
    }
    if (cur) groups.push(cur);
    const translatedGroups = await runWithConcurrencyLimit(groups, GLOBAL_TRANSLATE_CONCURRENCY, (g) =>
      translateFree(g, targetLang, "auto", aiSettings)
    );
    return translatedGroups.join(" ");
  });
  return translatedParagraphs.join("\n\n");
}

// نوارِ کوچکِ صوتِ کاربر برای داستان — بالای متنِ داستان می‌شینه. یه سوییچِ
// دوحالته (TTS ⇄ صوتِ من) داره؛ اگه هنوز صوتی آپلود نشده فقط دکمه‌ی آپلود
// نشون می‌ده (هیچ محدودیتی رو فرمتِ فایل نیست). هیچ هایلایت/خوانشِ
// خودکاری وجود نداره — خطِ فعال فقط با دکمه‌های «◀ جمله‌ی قبل / جمله‌ی
// بعد ▶» پایینِ پلیر عوض می‌شه، کاملاً دستی و مستقل از پخشِ صدا.
// این نوار حالا فقط آپلود/حذفِ فایلِ صوتی رو نشون می‌ده — سوییچِ TTS⇄صوتِ
// من و کنترل‌های پخش (پخش/توقف، جمله‌ی قبل/بعد، نوارِ زمان) دیگه اینجا
// نیستن؛ اون‌ها به نوارِ سراسریِ پایینِ صفحه (پلیرِ اصلی) منتقل شدن —
// PlayerBarStorySwitch و UserAudioMainPlayButton/UserAudioChunkNavButton/
// UserAudioProgressTrack همون‌جا رندر می‌شن.
function StoryUserAudioBar({ userAudio }) {
  const fileInputRef = useRef(null);
  const { hasAudio, uploadFile, removeAudio, audioSaving, audioSaveError } = userAudio;

  const boxStyle = {
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 14,
    backgroundColor: colors.cardBg || "white",
  };

  return (
    <div style={boxStyle}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span style={{ fontSize: 12, color: colors.inkSoft }}>
          {audioSaving
            ? "در حالِ ذخیره‌ی فایلِ صوتی..."
            : hasAudio
            ? "صوتِ من (آپلودی) وصل شده"
            : "صوتِ خودت رو برای این داستان آپلود کن"}
        </span>

        {!hasAudio || audioSaving ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => !audioSaving && fileInputRef.current?.click()}
              disabled={audioSaving}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, opacity: audioSaving ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
            >
              {audioSaving && <Loader2 size={14} className="spin" />}
              {audioSaving ? "در حالِ آپلود..." : "آپلود صوت"}
            </button>
          </>
        ) : (
          <button
            onClick={removeAudio}
            style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "none", color: colors.rose, fontSize: 12 }}
          >
            حذف صوت
          </button>
        )}
      </div>
      {audioSaveError && (
        <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{audioSaveError}</p>
      )}
    </div>
  );
}

// نسخه‌ی «صوتِ کاربر» از دکمه‌ی مرکزیِ پخشِ نوارِ سراسریِ پایینِ صفحه —
// دقیقاً هم‌شکلِ MainPlayButton، فقط به‌جای speechController (تی‌تی‌اس)،
// play/pause خودِ userAudio (فایلِ آپلودی) رو صدا می‌زنه. فقط وقتی
// tab==="story" و کاربر سوییچ رو رویِ «صوت من» گذاشته رندر می‌شه.
function UserAudioMainPlayButton({ ua, color }) {
  const { isPlaying, hasAudio, play, pause } = ua || {};
  return (
    <button
      onClick={() => { if (!hasAudio) return; isPlaying ? pause() : play(); }}
      disabled={!hasAudio}
      aria-label={isPlaying ? "توقف" : "پخش"}
      style={{
        width: 44, height: 44, borderRadius: 999, border: "none",
        background: color, color: "white", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, opacity: hasAudio ? 1 : 0.5,
        boxShadow: hasAudio ? "0 2px 6px rgba(28,37,65,0.22)" : "none",
      }}
    >
      {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginInlineStart: 2 }} />}
    </button>
  );
}

// نسخه‌ی «صوتِ کاربر» از دکمه‌ی جمله‌ی قبل/بعد — کاملاً دستی (manualIndex)،
// هیچ ربطی به زمانِ صدا نداره؛ همونی که قبلاً فقط توی StoryUserAudioBar بود.
function UserAudioChunkNavButton({ direction, ua, color }) {
  const { nextLine, prevLine, hasAudio } = ua || {};
  return (
    <button
      onClick={() => { if (!hasAudio) return; direction === "prev" ? prevLine() : nextLine(); }}
      title={direction === "prev" ? "جمله‌ی قبل" : "جمله‌ی بعد"}
      disabled={!hasAudio}
      style={{ background: "none", border: "none", cursor: hasAudio ? "pointer" : "default", color, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: hasAudio ? 1 : 0.5 }}
    >
      <ClassicTriangleIcon direction={direction === "prev" ? "left" : "right"} size={22} color={color} />
    </button>
  );
}

// نسخه‌ی «صوتِ کاربر» از نوارِ پیشرفتِ پلیر — زمانِ فعلی/کل + اسلایدرِ
// seek، دقیقاً همون چیزی که توی StoryUserAudioBar بود.
function UserAudioProgressTrack({ ua, color }) {
  const { currentTime, duration, seek, hasAudio } = ua || {};
  function fmtTime(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return toFaDigits(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
  }
  return (
    <div
      className="px-4 flex items-center gap-2"
      style={{ paddingTop: 6 }}
      // نوارِ پخشِ سراسریِ پایینِ صفحه (playerBarRef) خودش روی onTouchStart/
      // onTouchMove یه لانگ‌پرسِ کلی سوار کرده (برای پرش به تبِ در حالِ
      // پخش)؛ این هندلرها روی خودِ عنصرِ والد نصب شدن و باعث می‌شدن کشیدنِ
      // این اسلایدر با انگشت درست کار نکنه — دقیقاً همون مشکلی که برای
      // اسلایدرِ شفافیتِ پلیر هم پیش اومده بود و اونجا با همین ترفند حل شد.
      // با stopPropagation جلوی رسیدنِ لمس/کلیک به هندلرِ والد رو می‌گیریم.
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 34 }}>{fmtTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime || 0}
        onChange={(e) => hasAudio && seek(Number(e.target.value))}
        disabled={!hasAudio}
        // پخش همیشه چپ‌به‌راست پیش می‌ره؛ بدونِ direction:ltr صریح، اینپوتِ
        // native داخلِ صفحه‌ی dir="rtl" برعکس (راست‌به‌چپ) پر می‌شد.
        style={{ flex: 1, accentColor: color, opacity: hasAudio ? 1 : 0.5, direction: "ltr", touchAction: "pan-x" }}
      />
      <span style={{ fontSize: 11, color: colors.inkSoft, minWidth: 34, textAlign: "left" }}>{fmtTime(duration)}</span>
      <UserAudioSpeedControl ua={ua} color={color} />
    </div>
  );
}

// کنترلِ سرعتِ پخشِ صوتِ آپلودیِ کاربر — دقیقاً همون ظاهر/رفتارِ SpeedControl
// (سرعتِ TTS)، ولی به‌جایِ speechController، رویِ ua.rate/ua.setRate از
// useStoryUserAudio کار می‌کنه؛ آخرین آیتمِ همین ردیفه، پس (با جهتِ rtl)
// سمتِ چپِ پلیر می‌شینه — دقیقاً کنارِ دکمه‌ی سرعتِ TTS در همون موقعیت.
function UserAudioSpeedControl({ ua, color }) {
  const { rate, setRate, hasAudio } = ua || {};
  const r = rate || 1;
  const c = color || colors.gold;
  const disabled = !hasAudio || !setRate;
  const step = (delta) => setRate && setRate(Math.round((r + delta) * 10) / 10);
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
      title={`سرعتِ پخشِ صوتِ من: ${r.toFixed(1)}×`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, opacity: disabled ? 0.5 : 1 }}
    >
      <Gauge size={15} color={colors.inkSoft} />
      <button
        type="button"
        onClick={() => step(-0.1)}
        disabled={disabled || r <= 0.5}
        style={{ ...btnStyle, opacity: disabled || r <= 0.5 ? 0.4 : 1 }}
        aria-label="کم‌کردنِ سرعتِ صوتِ من"
      >
        −
      </button>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={r}
        onChange={(e) => setRate && setRate(e.target.value)}
        disabled={disabled}
        style={{ width: 44, accentColor: c }}
        aria-label="سرعتِ پخشِ صوتِ من"
      />
      <button
        type="button"
        onClick={() => step(0.1)}
        disabled={disabled || r >= 2}
        style={{ ...btnStyle, opacity: disabled || r >= 2 ? 0.4 : 1 }}
        aria-label="زیادکردنِ سرعتِ صوتِ من"
      >
        +
      </button>
      <span style={{ fontSize: 11, color: colors.inkSoft, whiteSpace: "nowrap", minWidth: 24 }}>
        {r.toFixed(1)}×
      </span>
    </span>
  );
}

// سوییچِ دوحالته‌ی TTS ⇄ صوتِ من — نسخه‌ی کوچیکِ همون سوییچِ داخلِ
// StoryUserAudioBar، فقط برای نمایش روی نوارِ سراسریِ پایینِ صفحه (پلیرِ
// اصلی) وقتی تبِ فعلی «داستان‌ساز»ه.
function PlayerBarStorySwitch({ ua }) {
  const { hasAudio, playbackMode, setPlaybackMode } = ua || {};
  return (
    <div className="flex items-center justify-center" style={{ flexShrink: 0 }}>
      <div className="flex items-center gap-1" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 20, padding: 2 }}>
        <button
          onClick={() => setPlaybackMode && setPlaybackMode("tts")}
          style={{
            padding: "3px 12px", borderRadius: 18, fontSize: 11, border: "none",
            backgroundColor: playbackMode === "tts" ? colors.teal : "transparent",
            color: playbackMode === "tts" ? "white" : colors.ink,
          }}
        >
          صدای اپ
        </button>
        <button
          onClick={() => hasAudio && setPlaybackMode && setPlaybackMode("user")}
          disabled={!hasAudio}
          style={{
            padding: "3px 12px", borderRadius: 18, fontSize: 11, border: "none",
            backgroundColor: playbackMode === "user" ? colors.teal : "transparent",
            color: playbackMode === "user" ? "white" : (hasAudio ? colors.ink : colors.cardBorder),
            cursor: hasAudio ? "pointer" : "default",
          }}
        >
          صوت من
        </button>
      </div>
    </div>
  );
}

// متنِ کاملِ یه داستانِ ذخیره‌شده رو از روی paragraphs می‌سازه — دقیقاً با
// همون منطقِ fullStoryText/allSentences که داخلِ خودِ StoryBuilder برای
// داستانِ فعلی استفاده می‌شه؛ اینجا برای این لازمه که بتونیم، بدونِ باز
// کردنِ هر داستان، کلیدِ صوتِ آپلودیِ اون رو (که بر اساسِ متن ساخته می‌شه)
// حساب کنیم و بفهمیم آیا صدایی براش ذخیره شده یا نه.
function getStoryEntryFullText(entry) {
  if (!entry || !Array.isArray(entry.paragraphs)) return "";
  return entry.paragraphs
    .flatMap((p) => (p?.sentences || []).map((s) => s?.text || ""))
    .join(" ");
}

// همون کلیدی که useStoryUserAudio/mainStoryKey برای داستانِ بازِ فعلی
// می‌سازه — `${locale}::${fullText}` — تا صوتِ آپلودیِ هر داستانِ
// ذخیره‌شده رو بدونِ بازکردنش تو IndexedDB پیدا کنیم.
function getStoryEntryAudioKey(entry) {
  const text = getStoryEntryFullText(entry);
  if (!text) return null;
  return `${TTS_LOCALE[entry.storyLang] || "en-US"}::${text}`;
}

// یه تکه از متنِ خودِ داستان (نه لیستِ لغات) به‌عنوانِ نامِ کارت — درست
// مثل وقتی خودِ متن رو موقعِ ساختن/ذخیره‌کردن می‌بینیم.
function getStoryEntryPreview(entry, maxLen) {
  const limit = maxLen || 70;
  const text = getStoryEntryFullText(entry).trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

// ============================================================
// نمایشِ زنده‌ی صفحه‌ی PDF — به‌جای اتکا به یک عکسِ ثابتِ از پیش‌رندرشده،
// هر بار که صفحه عوض می‌شه، خودِ pdf.js همون لحظه صفحه رو روی یک
// <canvas> می‌کِشه، به‌علاوه‌ی یک لایه‌ی نامرئیِ متن (دقیقاً همون تکنیکی
// که ویووِرهای واقعیِ PDF مثلِ خودِ کروم استفاده می‌کنن) که متنِ خودِ PDF
// رو واقعاً قابلِ سلکت/کپی می‌کنه — نه فقط یک عکس. این کامپوننت هیچ
// UIای بیرون از خودِ صفحه (نوارِ ابزار، دکمه‌ی دانلود و…) نداره — همه‌چیز
// داخلِ همین کارتِ داستان‌ساز می‌مونه.
//
// برای PDFهایی که پیش از این تغییر ذخیره شده بودن (که فرمتِ قدیمی‌شون
// فقط عکسِ از پیش‌رندرشده داره، نه بایتِ خامِ خودِ فایل)، از fallbackImageUrl
// استفاده می‌شه — همون عکسِ قدیمی نشون داده می‌شه، بدونِ این‌که کاربر
// مجبور بشه دوباره فایل رو آپلود کنه.
function PdfLivePageView({ pdfDoc, pdfjsLib, pageNum, fallbackImageUrl, onError }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfDoc || !pageNum) return undefined;
    (async () => {
      try {
        // اگه رندرِ صفحه‌ی قبلی هنوز تموم نشده، اول کنسلش کن — وگرنه موقعِ
        // ورق‌زدنِ سریع، دو رندرِ هم‌زمان روی یک canvas به‌هم می‌ریزن.
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch {}
        }
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        // مقیاسِ رندر: کافی برای شارپ‌بودن رویِ صفحه‌نمایش‌های retina/موبایل
        // (تا سقفِ ۳ برابر، تا حجمِ canvas بی‌جهت زیاد نشه).
        const renderScale = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * 1.4));
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const ctx = canvas.getContext("2d");
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
        if (cancelled) return;

        // لایه‌ی متنِ نامرئی/قابلِ‌سلکت، هم‌مکان با تصویرِ صفحه. چون canvas
        // با رزولوشنِ بالاتر (renderScale) رسم شده ولی رویِ صفحه با
        // style.width:100% کوچیک‌تر نمایش داده می‌شه، لایه‌ی متن هم باید تو
        // همون مختصاتِ بزرگِ viewport ساخته بشه و بعد با یک transform:scale
        // به همون اندازه‌ی نمایشیِ canvas کوچیک بشه — دقیقاً همون تکنیکِ
        // خودِ ویووِرِ pdf.js.
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = "";
          const displayWidth = canvas.getBoundingClientRect().width || canvas.width;
          const cssScale = displayWidth / viewport.width;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.transform = `scale(${cssScale})`;
          textLayerDiv.style.transformOrigin = "0 0";
          try {
            if (pdfjsLib?.TextLayer) {
              const textContent = await page.getTextContent();
              if (cancelled) return;
              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport,
              });
              await textLayer.render();
            }
          } catch {
            // لایه‌ی متن اختیاریه — اگه ساختش شکست خورد، تصویرِ صفحه هنوز
            // درست دیده می‌شه، فقط سلکت‌کردنِ مستقیمِ متنِ روش کار نمی‌کنه.
          }
        }
      } catch (err) {
        if (!cancelled && onError) onError(err);
      }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum]);

  if (!pdfDoc) {
    return fallbackImageUrl ? (
      <img src={fallbackImageUrl} alt={`صفحه‌ی ${pageNum}`} style={{ width: "100%", display: "block" }} />
    ) : null;
  }

  return (
    <div style={{ position: "relative", width: "100%", lineHeight: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div ref={textLayerRef} className="textLayer" style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

function StoryBuilder({ nativeLang, nativeLabel, targetOrder, langPickerOrder, setLangPickerOrder, wordStats, setWordStats, savedStories, setSavedStories, aiSettings, jumpTo, onFullTextChange, onUserAudioStateChange, autoScrollActive, calendarSystem, highlightColor, uid, uiLang }) {
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
  // آپلودِ PDF برای «منبعِ لغت» — استخراجِ متن کاملاً تو خودِ مرورگره
  // (با pdf.js)، هیچ فایلی به هیچ سروری فرستاده نمی‌شه. pdfBusy یعنی «داره
  // پردازش می‌کنه»، pdfError پیامِ خطا (حجمِ زیاد/فایلِ خراب/و غیره).
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const pdfInputRef = useRef(null);
  // همون الگو، برای «وارد کردنِ PDF برای خوانش» (جدا از PDFِ بالا که فقط
  // برای منبعِ لغته) — این‌یکی متنِ کامل رو می‌ذاره تو سیستمِ خوانش.
  const [pdfReadBusy, setPdfReadBusy] = useState(false);
  const [pdfReadProgress, setPdfReadProgress] = useState("");
  const [pdfReadError, setPdfReadError] = useState("");
  const pdfReadInputRef = useRef(null);
  // خروجیِ «PDF دوزبانه» — برخلافِ دوتای بالا (که فقط متنِ PDF رو
  // استخراج می‌کنن)، این‌یکی خودِ فایل رو دست‌نخورده نگه می‌داره: هر صفحه‌ی
  // اصلی (با عکس/چیدمانِ خودش) دقیقاً همون‌جوری که هست به‌صورتِ عکس رندر
  // و در یک PDFِ خروجیِ جدید embed می‌شه، و بلافاصله بعدش یک صفحه‌ی
  // «روبرو» با ترجمه‌ی همون متن اضافه می‌شه — پس چیزی از فایلِ اصلی
  // (عکس‌ها/فرمت) گم نمی‌شه، فقط یک PDFِ تازه با متن+ترجمه ساخته و دانلود
  // می‌شه (فایلِ اصلیِ کاربر جایی آپلود/تغییر داده نمی‌شه).
  const [bilingualPdfBusy, setBilingualPdfBusy] = useState(false);
  const [bilingualPdfProgress, setBilingualPdfProgress] = useState("");
  const [bilingualPdfError, setBilingualPdfError] = useState("");
  const bilingualPdfInputRef = useRef(null);
  // «نمایشِ PDF همینجا» — حالتِ دومِ بارگذاریِ PDF، برخلافِ «خروجی PDF
  // دوزبانه» بالا (که یک فایلِ تازه می‌سازه و دانلود می‌کنه)، این‌یکی
  // چیزی دانلود نمی‌کنه: فایلِ خام رو با عکس‌های خودش همینجا تو
  // داستان‌ساز، صفحه‌به‌صفحه نشون می‌ده و ترجمه‌ی متنِ همون صفحه رو
  // درست کنارش/زیرش می‌ذاره (روبروی هم).
  const [pdfViewBusy, setPdfViewBusy] = useState(false);
  const [pdfViewProgress, setPdfViewProgress] = useState("");
  const [pdfViewError, setPdfViewError] = useState("");
  const [pdfViewPages, setPdfViewPages] = useState([]); // [{pageNum, originalText, translatedText}] (سندهای قدیمی‌تر ممکنه imageUrl هم داشته باشن — fallback)
  const [pdfViewTitle, setPdfViewTitle] = useState("");
  const [pdfViewIndex, setPdfViewIndex] = useState(0);
  // همون تنظیماتِ سراسریِ «اندازه/بولدِ فونتِ زبانِ مقصد» که تو صفحه‌ی
  // تنظیمات هست و ClickableSentence خودش داخلی اعمال می‌کنه — اینجا هم
  // دستی روی باکسِ ترجمه‌ی PDF (که خودش ClickableSentence نیست، فقط یه
  // <div> ساده‌ست) اعمال می‌شه، تا با بقیه‌ی اپ هماهنگ باشه.
  const pdfTargetTextPrefs = useTargetTextPrefs();
  const pdfTranslationShouldBold =
    pdfTargetTextPrefs.bold === "both" || pdfTargetTextPrefs.bold === "translation";
  const pdfTranslationFontSize = Math.round(13 * ((pdfTargetTextPrefs.scale || 100) / 100));
  const pdfViewInputRef = useRef(null);
  // شناسه‌ی سندِ جاری (برای ذخیره‌ی صفحه‌به‌صفحه تو IndexedDB حین پردازش)،
  // و لیستِ PDFهایی که قبلاً کامل/ناقص ذخیره شدن — تا کاربر بتونه بدونِ
  // آپلود و ترجمه‌ی دوباره، از لیست بازشون کنه.
  const [pdfViewDocId, setPdfViewDocId] = useState(null);
  const [pdfViewDocs, setPdfViewDocs] = useState([]);
  // 🆕 نمونه‌ی زنده‌ی pdf.js برای فایلِ فعلاً بازشده — تا هر صفحه به‌جای
  // عکسِ ثابت، همون لحظه با PdfLivePageView رندر بشه (لایه‌ی متنِ
  // قابلِ‌سلکت هم داره). pdfjsLibRef فقط برای این‌که ماژولِ pdfjs-dist
  // (و workerSrc اش) فقط یه‌بار import بشه، نه هر بار که PDF عوض می‌شه.
  const pdfjsLibRef = useRef(null);
  const [pdfViewLiveDoc, setPdfViewLiveDoc] = useState(null); // { docId, doc } | null
  const getPdfjsLib = async () => {
    if (!pdfjsLibRef.current) {
      const lib = await import("pdfjs-dist");
      lib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      pdfjsLibRef.current = lib;
    }
    return pdfjsLibRef.current;
  };
  const clearPdfViewLiveDoc = () => {
    setPdfViewLiveDoc((prev) => {
      if (prev?.doc) {
        try { prev.doc.destroy(); } catch {}
      }
      return null;
    });
  };
  // اگه کاربر کاملاً از تبِ داستان‌ساز بره بیرون (کامپوننت unmount بشه)،
  // نمونه‌ی زنده‌ی pdf.js هم آزاد بشه — وگرنه حافظه نگه داشته می‌مونه.
  useEffect(() => {
    return () => {
      setPdfViewLiveDoc((prev) => {
        if (prev?.doc) {
          try { prev.doc.destroy(); } catch {}
        }
        return null;
      });
    };
  }, []);
  // 🩹 آیا صفحاتِ همین PDFِ باز، واقعاً توی IndexedDB ذخیره شدن یا نه —
  // چون تا الان «ذخیره در داستان‌ها» بدونِ توجه به این، همیشه یه کارتِ
  // اشاره‌گر می‌ساخت؛ حتی وقتی نوشتنِ واقعیِ صفحات (به‌خاطرِ پُر بودنِ
  // فضا/حالتِ خصوصی/محدودیتِ WebView) شکست خورده بود. نتیجه: کارت تو
  // لیست بود ولی بازکردنش هیچی نشون نمی‌داد. حالا این دکمه فقط وقتی فعاله
  // که ذخیره‌سازیِ واقعی موفق بوده باشه.
  const [pdfViewPersisted, setPdfViewPersisted] = useState(true);
  // نمایش/عدم‌نمایشِ متنِ اصلیِ همین صفحه به‌صورتِ کلمه‌به‌کلمه‌ی کلیک‌پذیر
  // (برای افزودنِ لغات به داستان‌ساز).
  const [showPdfOriginalWords, setShowPdfOriginalWords] = useState(false);

  // زوم/جابه‌جاییِ تصویرِ صفحه‌ی PDF با انگشت (پینچ برای زوم، تک‌انگشت
  // برای جابه‌جایی وقتی زوم شده). هر بار صفحه عوض بشه، زوم ریست می‌شه.
  const [pdfImgZoom, setPdfImgZoom] = useState(1);
  const [pdfImgPan, setPdfImgPan] = useState({ x: 0, y: 0 });
  const pdfImgGestureRef = useRef({ mode: null, startDist: 0, startZoom: 1, startPan: { x: 0, y: 0 }, startTouch: { x: 0, y: 0 } });

  useEffect(() => {
    setPdfImgZoom(1);
    setPdfImgPan({ x: 0, y: 0 });
    setShowPdfOriginalWords(false);
  }, [pdfViewIndex]);

  function pdfImgTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  const handlePdfImgTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pdfImgGestureRef.current = {
        mode: "pinch",
        startDist: pdfImgTouchDist(e.touches),
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: 0, y: 0 },
      };
    } else if (e.touches.length === 1 && pdfImgZoom > 1) {
      pdfImgGestureRef.current = {
        mode: "pan",
        startDist: 0,
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, [pdfImgZoom, pdfImgPan]);

  const handlePdfImgTouchMove = useCallback((e) => {
    const g = pdfImgGestureRef.current;
    if (g.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const dist = pdfImgTouchDist(e.touches);
      const ratio = dist / (g.startDist || dist);
      const newZoom = Math.min(4, Math.max(1, g.startZoom * ratio));
      setPdfImgZoom(newZoom);
      if (newZoom <= 1) setPdfImgPan({ x: 0, y: 0 });
    } else if (g.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - g.startTouch.x;
      const dy = e.touches[0].clientY - g.startTouch.y;
      setPdfImgPan({ x: g.startPan.x + dx, y: g.startPan.y + dy });
    }
  }, []);

  const handlePdfImgTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      pdfImgGestureRef.current.mode = null;
    } else if (e.touches.length === 1) {
      // از پینچ به تک‌انگشت افتاد — اگه هنوز زوم داریم، پن رو از همینجا ادامه بده
      pdfImgGestureRef.current = {
        mode: pdfImgZoom > 1 ? "pan" : null,
        startDist: 0,
        startZoom: pdfImgZoom,
        startPan: pdfImgPan,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, [pdfImgZoom, pdfImgPan]);

  const handlePdfImgDoubleClick = useCallback(() => {
    setPdfImgZoom((z) => (z > 1 ? 1 : 2));
    setPdfImgPan({ x: 0, y: 0 });
  }, []);

  const refreshPdfViewDocs = useCallback(async () => {
    setPdfViewDocs(await listPdfViewDocs());
  }, []);

  // اولین باری که این تب باز می‌شه، لیستِ PDFهای ذخیره‌شده رو بیار.
  useEffect(() => {
    refreshPdfViewDocs();
  }, [refreshPdfViewDocs]);
  // پیست‌کردنِ مستقیمِ متن/داستان برای خوانش — همون مسیرِ «وارد کردنِ PDF
  // برای خوانش» بالا، فقط منبعِ متن به‌جای فایل، تایپ‌شده/پیست‌شده‌ی خودِ کاربره.
  const [pastedReadingText, setPastedReadingText] = useState("");
  const [showPasteReading, setShowPasteReading] = useState(false);
  // ویرایشِ متنِ داستانِ همین الان (بعد از این‌که پیست/PDF/لینک قبلاً به
  // paragraphs تبدیل شده) — چون قبلاً تنها راهِ تصحیحِ یه غلط تو متنِ اصلی
  // (نه ترجمه) این بود که کل داستان پاک بشه و از اول پیست بشه. با این
  // دکمه، متنِ فعلی (با همون تقسیم‌بندیِ پاراگرافی‌ش) برمی‌گرده تو یه
  // textarea قابل‌ویرایش؛ با تأیید، دوباره از splitTextIntoSentenceStrings
  // رد می‌شه و paragraphs تازه می‌سازه (ترجمه‌های قبلی این‌جوری از نو
  // گرفته می‌شن، چون متنِ اصلی عوض شده و دیگه معتبر نیستن).
  const [editingStoryText, setEditingStoryText] = useState(false);
  const [storyEditDraft, setStoryEditDraft] = useState("");
  const startEditingStoryText = () => {
    const draft = paragraphs.map((p) => (p.sentences || []).map((s) => s?.text || "").join(" ")).join("\n\n");
    setStoryEditDraft(draft);
    setEditingStoryText(true);
  };
  const cancelEditingStoryText = () => {
    setEditingStoryText(false);
    setStoryEditDraft("");
  };
  const applyEditedStoryText = () => {
    const raw = storyEditDraft.trim();
    if (!raw) return;
    const rawParagraphs = raw.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
    const storyParagraphs = rawParagraphs
      .map((paraText) => ({ sentences: splitTextIntoSentenceStrings(paraText).map((text) => ({ text })) }))
      .filter((p) => p.sentences.length);
    if (!storyParagraphs.length) return;
    setParagraphs(storyParagraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setRepeatNotice("");
    setEditingStoryText(false);
    setStoryEditDraft("");
  };
  // وارد کردنِ یه لینک برای خوانش — به‌جای کپی/پیستِ دستیِ متن، کاربر فقط
  // آدرسِ صفحه رو می‌ده و خودِ برنامه متنِ اصلیِ صفحه (بدنه/بادیِ نوشته، نه
  // منو/فوتر/تبلیغ) رو استخراج می‌کنه. همون مسیرِ پردازشِ بعدیِ PDF/پیست
  // (تقسیم به جمله → پاراگراف) دقیقاً همین‌جا هم استفاده می‌شه.
  const [linkReadUrl, setLinkReadUrl] = useState("");
  const [showLinkReading, setShowLinkReading] = useState(false);
  const [linkReadBusy, setLinkReadBusy] = useState(false);
  const [linkReadError, setLinkReadError] = useState("");
  const [newWordTerm, setNewWordTerm] = useState("");
  const [newWordMeaning, setNewWordMeaning] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editDraftMeaning, setEditDraftMeaning] = useState("");
  const [translatingAll, setTranslatingAll] = useState(false);
  const [vocabQuery, setVocabQuery] = useState("");
  const [paragraphs, setParagraphs] = useState([]); // [{ sentences: [{text, t:{lang:text}}] }]
  // کلیدهای `${pi}-${si}-${code}`ای که الان دارن دوباره ترجمه می‌شن — برای
  // نشون‌دادنِ اسپینر روی دکمه‌ی رفرشِ همون جمله، بدون قفل‌کردنِ کل صفحه.
  const [retranslatingSentences, setRetranslatingSentences] = useState({});
  // دکمه‌ی رفرشِ ترجمه‌ی هر جمله — اگه ترجمه‌ی خودکار یه جمله اشتباه از آب
  // دراومد، کاربر می‌تونه فقط همون یکی رو (بدون دست‌زدن به بقیه‌ی داستان)
  // دوباره از زنجیره‌ی translateFree بگیره؛ forceVerify=true یعنی حتی اگه
  // نتیجه‌ی رایگان مشکوک نبود هم یه بار با AI بررسی/تأیید بشه.
  // نسخه‌ی پاراگرافیِ رفرش — وقتی نمایش روی حالتِ «پاراگراف» (نه جمله‌به‌جمله)
  // باشه، ترجمه‌ی کلِ پاراگراف از join همه‌ی s.t[code] ساخته می‌شه؛ پس رفرشِ
  // اینجا یعنی همه‌ی جمله‌های همون پاراگراف رو برای این زبان دوباره بگیریم.
  async function retranslateStoryParagraph(pi, code) {
    const key = `${pi}-all-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const sentences = paragraphs[pi]?.sentences || [];
      await Promise.all(
        sentences.map(async (s, si) => {
          try {
            const translated = await translateFree(s.text || "", code, storyLang, aiSettings, true);
            setParagraphs((prevParagraphs) => {
              const target = prevParagraphs[pi];
              const targetSentence = target?.sentences?.[si];
              if (!targetSentence) return prevParagraphs;
              const updated = [...prevParagraphs];
              const list = [...(target.sentences || [])];
              list[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
              updated[pi] = { ...target, sentences: list };
              return updated;
            });
          } catch {
            // این یکی شکست خورد؛ بقیه‌ی جمله‌ها همچنان ادامه می‌دن.
          }
        })
      );
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  async function retranslateStorySentence(pi, si, code, text) {
    const key = `${pi}-${si}-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const translated = await translateFree(text || "", code, storyLang, aiSettings, true);
      setParagraphs((prevParagraphs) => {
        const target = prevParagraphs[pi];
        const targetSentence = target?.sentences?.[si];
        if (!targetSentence) return prevParagraphs;
        const updated = [...prevParagraphs];
        const sentences = [...(target.sentences || [])];
        sentences[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
        updated[pi] = { ...target, sentences };
        return updated;
      });
    } catch {
      // شکست خورد؛ ترجمه‌ی قبلی همون‌جا می‌مونه، کاربر می‌تونه دوباره امتحان کنه.
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  // نمایش/ترجمه‌ی تدریجی: به‌جای رندر و صف‌کردنِ ترجمه‌ی همه‌ی پاراگراف‌ها
  // یه‌جا (که برای داستان‌های خیلی بلند — مثلاً از PDF — هم DOM رو سنگین
  // می‌کنه و هم صدها/هزاران درخواستِ ترجمه رو یه‌جا صف می‌کنه و کاربر تا
  // آخرِ کل کار هیچی نمی‌بینه)، فقط این تعداد پاراگرافِ اول رندر/ترجمه
  // می‌شه؛ با دکمه‌ی «نمایش بیشتر» جلو می‌ره.
  const PARAGRAPH_PAGE_SIZE = 15;
  const [visibleParagraphCount, setVisibleParagraphCount] = useState(PARAGRAPH_PAGE_SIZE);
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
  // جستجوی آزاد داخلِ متنِ داستان — کاربر می‌تونه با هر زبانی تایپ کنه؛ روی
  // متنِ اصلیِ هر جمله و روی همه‌ی ترجمه‌هاش (هر زبانی که فعاله) چک می‌شه.
  // فقط برای پیداکردن و پریدن به جمله‌ی موردنظره، لیستِ داستان رو فیلتر
  // نمی‌کنه (که شماره‌ی پاراگراف/جمله‌ها به‌هم نریزه).
  const [storySearchQuery, setStorySearchQuery] = useState("");
  // یه شمارنده‌ی ساده که با هر بار زدنِ رویِ یه نتیجه‌ی جستجو یکی زیاد می‌شه،
  // فقط برای این‌که کامپوننت مطمئناً یه رندرِ تازه بزنه و useLayoutEffectِ
  // اسکرول (پایین‌تر، بر اساسِ pendingScrollRef) بعدش اجرا بشه — حتی اگه
  // granularity/visibleParagraphCount قبلاً همون مقدار بودن.
  const [searchJumpSeq, setSearchJumpSeq] = useState(0);
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
  // فیلترِ سطح برای لیستِ «داستان‌های ذخیره‌شده» — دقیقاً همون الگوی
  // LevelFilterRow که بقیه‌ی تب‌ها (واژگان، عبارت‌ها و ...) دارن؛ هر داستان
  // از قبل با سطحِ خودش (storyLevel) ذخیره می‌شه، این فیلتر فقط برای پیداکردن
  // و ساماندهیِ راحت‌ترِ همون داستان‌های ازقبل‌ذخیره‌شده‌ست.
  const [savedStoriesLevelFilter, setSavedStoriesLevelFilter] = useState("all");
  // جستجو در لیستِ «داستان‌های ذخیره‌شده» — روی متنِ خودِ داستان، لغاتِ
  // انتخاب‌شده، و عنوانِ PDF (برای کارت‌های PDF) چک می‌شه؛ زبانِ داستان
  // اصلاً مهم نیست — چون فقط includeِ سادهٔ رشته‌ست، هر زبان/اسکریپتی
  // (فارسی، انگلیسی، عربی، هرچی) بدونِ هیچ فرقی جستجو می‌شه.
  const [savedStoriesSearch, setSavedStoriesSearch] = useState("");
  // مرتب‌سازیِ لیستِ «داستان‌های ذخیره‌شده» — گزینه‌ها دقیقاً مثلِ منوی
  // Sort byِ سیستم (جدیدترین/قدیمی‌ترین تاریخ، نام A→Z/Z→A، و تعدادِ
  // کلمات کم/زیاد به‌جای اندازه‌ی فایل).
  const [savedStoriesSort, setSavedStoriesSort] = useState("newest");
  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده روی لیستِ داستان‌های
  // ذخیره‌شده — همون الگویِ WordList/SavedWordsPanel، اینجا واحدِ لیست
  // خودِ داستان‌هاست (نه لغات تکی). شمارنده‌ها هر بار از رویِ readIds و
  // لیستِ فعلی (فیلترشده/مرتب‌شده) دوباره محاسبه می‌شن، نه عددِ ثابت.
  const STORY_LIST_ID = "storyBuilder";
  const [savedStoryReadIds, setSavedStoryReadIds] = useState(() => loadReadWordIds(STORY_LIST_ID));
  const toggleSavedStoryRead = (id) => {
    setSavedStoryReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(STORY_LIST_ID, next);
      return next;
    });
  };
  const markStoryRangeRead = (items, read) => {
    setSavedStoryReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((s) => {
        if (read) next.add(s.id);
        else next.delete(s.id);
      });
      saveReadWordIds(STORY_LIST_ID, next);
      return next;
    });
  };
  const [savedStoryRangeInput, setSavedStoryRangeInput] = useState({ from: "", to: "" });
  // نقشه‌ی id-ِ داستانِ ذخیره‌شده → آیا صوتِ آپلودیِ کاربر داره یا نه؛ فقط
  // برای نشون‌دادنِ آیکونِ 🎵 کنارِ کارتِ داستان‌های ذخیره‌شده استفاده می‌شه.
  // چون صوت با کلیدِ متن (نه idِ داستان) توی IndexedDB ذخیره می‌شه، اینجا
  // برای هر داستان همون کلید رو از روی متنش می‌سازیم و وجودش رو چک می‌کنیم.
  const [savedStoriesAudioMap, setSavedStoriesAudioMap] = useState({});
  useEffect(() => {
    if (!showSaved || !savedStories.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        savedStories.map(async (s) => {
          const key = getStoryEntryAudioKey(s);
          if (!key) return [s.id, false];
          const rec = await getStoryAudioRecord(key);
          return [s.id, !!rec];
        })
      );
      if (cancelled) return;
      const map = {};
      entries.forEach(([id, has]) => { map[id] = has; });
      setSavedStoriesAudioMap(map);
    })();
    return () => { cancelled = true; };
  }, [showSaved, savedStories]);
  // نکته: قبلاً یه state جدا به‌اسمِ justSaved بود که فقط ۱.۸ ثانیه بعدِ
  // سیو، تیک نشون می‌داد و بعدش خودش برمی‌گشت به حالتِ اولیه — کاربر گیج
  // می‌شد که آیا واقعاً ذخیره شده یا نه. حالا به‌جاش مستقیم از
  // currentStoryId استفاده می‌کنیم (پایین‌تر، دکمه‌ی ذخیره): تا وقتی همین
  // داستان ذخیره‌شده باز مونده، تیک همیشه می‌مونه؛ فقط با ساختن/بازکردنِ
  // یه داستانِ دیگه (currentStoryId => null/idِ دیگه) عوض می‌شه.
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
  // نسخه‌ی «ترجمه‌شده»ی fullStoryText/sentenceOffsets — برای هر زبانِ
  // ترجمه‌ای که فعلاً نمایش داده می‌شه (translationLangs)، متنِ کاملِ همون
  // ترجمه (به همون ترتیبِ جمله‌ها، با join(" ") دقیقاً مثلِ متنِ اصلی) و
  // آفستِ شروعِ هر جمله‌ش رو می‌سازیم — تا دکمه‌ی 🔊ِ روی هر ترجمه هم بتونه
  // (دقیقاً مثلِ متنِ اصلی) کلِ ترجمه رو با هایلایت/اسکرولِ خودکار و رفتنِ
  // خودکار به جمله‌ی بعد بخونه، نه فقط همون یک جمله رو.
  const fullTranslatedTextByLang = useMemo(() => {
    const map = {};
    (translationLangs || []).forEach((code) => {
      if (allSentences.length && allSentences.every((s) => s?.t?.[code])) {
        map[code] = allSentences.map((s) => s.t[code]).join(" ");
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSentences, translationLangs.join(",")]);

  const translatedSentenceOffsetsByLang = useMemo(() => {
    const map = {};
    Object.keys(fullTranslatedTextByLang).forEach((code) => {
      let offset = 0;
      map[code] = allSentences.map((s, idx) => {
        const t = s?.t?.[code] || "";
        const start = offset;
        offset += t.length;
        if (idx < allSentences.length - 1) offset += 1; // فاصله‌ی join(" ")
        return { pi: s._pi, si: s._si, start, end: start + t.length };
      });
    });
    return map;
  }, [fullTranslatedTextByLang, allSentences]);

  const translatedSentenceOffsetMapByLang = useMemo(() => {
    const map = {};
    Object.keys(translatedSentenceOffsetsByLang).forEach((code) => {
      const inner = {};
      translatedSentenceOffsetsByLang[code].forEach((s) => {
        inner[`${s.pi}-${s.si}`] = s;
      });
      map[code] = inner;
    });
    return map;
  }, [translatedSentenceOffsetsByLang]);

  const translatedParagraphBaseOffsetMapByLang = useMemo(() => {
    const map = {};
    Object.keys(translatedSentenceOffsetsByLang).forEach((code) => {
      const inner = {};
      translatedSentenceOffsetsByLang[code].forEach((s) => {
        if (!(s.pi in inner)) inner[s.pi] = s.start;
      });
      map[code] = inner;
    });
    return map;
  }, [translatedSentenceOffsetsByLang]);

  const mainStoryKey = fullStoryText ? `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}` : null;
  // صوتِ خودِ کاربر برای همین داستان (اگه آپلود/علامت‌گذاری شده باشه) —
  // کاملاً مستقل از speechController/TTS، فقط با mainStoryKey به داستان
  // فعلی وصل می‌شه. playbackMode مشخص می‌کنه پلیر الان کدوم منبع رو نشون
  // می‌ده: "tts" (پیش‌فرض، همون سیستمِ قبلی) یا "user" (فایلِ صوتیِ کاربر).
  const userAudio = useStoryUserAudio(mainStoryKey, allSentences);
  const [playbackMode, setPlaybackMode] = useState("tts"); // "tts" | "user"
  useEffect(() => {
    // اگه داستان عوض شد و صوتِ کاربر نداشت، خودکار برگرد به TTS
    if (playbackMode === "user" && !userAudio.hasAudio) setPlaybackMode("tts");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainStoryKey, userAudio.hasAudio]);
  // وقتی از پاپ‌آپِ کلمه یا محدوده‌ی انتخابی، دکمه‌ی پخش زده می‌شه، همین‌جا
  // موقعیت (نسبت به کلِ fullStoryText) به‌خاطر سپرده می‌شه — تا دفعه‌ی بعد
  // که دکمه‌ی «پخشِ کل متن» روی نوارِ پلیر زده بشه، از همون‌جا (نه از اول)
  // ادامه پیدا کنه.
  function reportStoryWordSpoken(baseOffset, localEnd) {
    if (!mainStoryKey) return;
    rememberMainTextResumeOffset(mainStoryKey, (baseOffset || 0) + (localEnd || 0));
  }

  // یادداشتِ آزادِ همین داستان — با mainStoryKey مشخص می‌شه دقیقاً کدوم
  // داستانه، پس با بازکردنِ داستانِ دیگه، یادداشتِ همون داستانِ دیگه نشون
  // داده می‌شه.
  const [storyNote, setStoryNote] = useStoryNote(mainStoryKey);

  // نتیجه‌های جستجوی آزادِ داخلِ متنِ داستان — روی متنِ اصلیِ هر جمله و
  // ترجمه‌های فعالش چک می‌شه؛ حداکثر ۳۰ نتیجه (برای سبک‌موندنِ رابط) نشون
  // داده می‌شه.
  const storySearchMatches = useMemo(() => {
    const q = storySearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    for (let pi = 0; pi < paragraphs.length; pi++) {
      const sentences = paragraphs[pi]?.sentences || [];
      for (let si = 0; si < sentences.length; si++) {
        const s = sentences[si];
        if (!s) continue;
        const original = (s.text || "").toLowerCase();
        const translated = translationLangs
          .map((code) => s.t?.[code] || "")
          .join(" ")
          .toLowerCase();
        if (original.includes(q) || translated.includes(q)) {
          results.push({ pi, si, text: s.text || "" });
          if (results.length >= 30) return results;
        }
      }
    }
    return results;
  }, [storySearchQuery, paragraphs, translationLangs]);

  // پریدن به یه نتیجه‌ی جستجو — همون مکانیزمِ pendingScrollRef/highlightSentence
  // که برای لانگ‌پرسِ لغاتِ ذخیره‌شده استفاده می‌شه؛ اگه پاراگرافش هنوز نمایش
  // داده نشده، visibleParagraphCount رو هم جلو می‌بره. علاوه بر اسکرول، خودِ
  // خواندن (TTS یا صوتِ آپلودیِ کاربر، هرکدوم الان فعاله) هم از دقیقاً همون
  // جمله ادامه/شروع می‌شه — نه فقط یه هایلایتِ بی‌صدا.
  function jumpToStorySearchMatch(pi, si) {
    setGranularity("sentence");
    setVisibleParagraphCount((n) => (pi >= n ? pi + 1 : n));
    pendingScrollRef.current = { pi, si };
    setSearchJumpSeq((n) => n + 1);

    const offset = sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0;

    if (playbackMode === "user" && userAudio.hasAudio) {
      // صوتِ آپلودیِ کاربر: هیچ نگاشتِ دقیقِ کاراکتر↔زمان نداریم (برخلافِ
      // TTS)، پس فقط یه تخمینِ نسبیِ ساده — درصدِ آفستِ کاراکتری از کلِ متن
      // رو روی طولِ کلِ صدا اعمال می‌کنیم و از همون‌جا پخش رو شروع می‌کنیم.
      const ratio = fullStoryText.length ? offset / fullStoryText.length : 0;
      const target = ratio * (userAudio.duration || 0);
      userAudio.seek(target);
      userAudio.play();
      return;
    }

    // حالتِ TTS: اگه همین متن همین الان (پخش‌شده یا مکث‌شده) لود شده،
    // seekToChunk می‌زنیم تا دقیقاً از همین جمله ادامه بده (بدونِ توگل‌کردنِ
    // پاز/پخش)؛ وگرنه از صفر، یه سشنِ تازه‌ی «خواندنِ کل متن» رو از همین
    // آفست شروع می‌کنیم.
    if (!fullStoryText) return;
    const st = speechController.getState();
    if (st.key === mainStoryKey && st.status !== "idle") {
      const meta = speechController.getChunksMeta();
      let idx = 0;
      for (let i = 0; i < meta.length; i++) {
        if (offset >= meta[i].start) idx = i;
        else break;
      }
      speechController.seekToChunk(idx);
    } else {
      speechController.toggle(fullStoryText, storyLang, offset, { loop: true });
    }
  }

  // جمله‌ای که همین الان، در حینِ پخشِ «کل متن» از روی پلیر، داره خونده
  // می‌شه — هم برای هایلایتِ بصریِ زنده (متنِ اصلی + همه‌ی ترجمه‌هاش، چون
  // هر دو داخلِ همون باکسِ jsهایلایت‌شونده‌ان) و هم برای اسکرولِ خودکار
  // استفاده می‌شه. وقتی پخشِ فعلی چیز دیگه‌ای غیر از کلِ داستانه (مثلاً
  // کاربر خودش رو یک جمله‌ی خاص زده)، این null می‌مونه.
  const [activeStorySentence, setActiveStorySentence] = useState(null); // {pi, si} | null
  useEffect(() => {
    const myKey = `${TTS_LOCALE[storyLang] || "en-US"}::${fullStoryText}`;
    const update = (state) => {
      if (!fullStoryText || state.key !== myKey || state.status === "idle") {
        setActiveStorySentence(null);
        return;
      }
      const offset = speechController.getCharOffset();
      let found = sentenceOffsets[0] || null;
      for (const s of sentenceOffsets) {
        if (offset >= s.start) found = s;
        else break;
      }
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

  // دقیقاً همون مکانیزمِ activeStorySentence بالا، ولی برای «پخشِ کلِ یه
  // ترجمه» — وقتی کاربر روی 🔊ِ کنارِ یه ترجمه می‌زنه، حالا (به‌جای فقط
  // همون یک جمله) کلِ ترجمه‌ی همون زبان از همونجا تا آخر خونده می‌شه؛ این
  // افکت هر بار که speechController آپدیت می‌شه چک می‌کنه که آیا کلیدِ
  // فعلیِ پخش، دقیقاً مطابقِ یکی از fullTranslatedTextByLang هاست یا نه، و
  // اگه بود pi/si/code اون جمله رو نگه می‌داره — هم برای هایلایت، هم برای
  // اسکرولِ خودکار.
  const [activeTranslation, setActiveTranslation] = useState(null); // {code, pi, si} | null
  const translationLangsKey = (translationLangs || []).join(",");
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveTranslation(null);
        return;
      }
      for (const code of translationLangs || []) {
        const text = fullTranslatedTextByLang[code];
        if (!text) continue;
        const myKey = `${TTS_LOCALE[code] || "en-US"}::${text}`;
        if (state.key === myKey) {
          const offset = speechController.getCharOffset();
          const offs = translatedSentenceOffsetsByLang[code] || [];
          let found = offs[0] || null;
          for (const s of offs) {
            if (offset >= s.start) found = s;
            else break;
          }
          setActiveTranslation((prev) => {
            const next = found ? { code, pi: found.pi, si: found.si } : null;
            if (prev && next && prev.code === next.code && prev.pi === next.pi && prev.si === next.si) return prev;
            return next;
          });
          return;
        }
      }
      setActiveTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationLangsKey, fullTranslatedTextByLang, translatedSentenceOffsetsByLang]);

  // موقع پخشِ سراسریِ داستان، اگه اسکرولِ خودکار (همون دکمه‌ی کنارِ پلیر)
  // فعال باشه، خطِ در حالِ خواندن رو خودکار وسطِ صفحه نگه می‌داره — کاربر
  // خطش رو گم نمی‌کنه.
  useEffect(() => {
    const sentenceForScroll = playbackMode === "user" ? userAudio.activeSentence : activeStorySentence;
    if (!autoScrollActive || !sentenceForScroll) return;
    const node =
      granularity === "sentence"
        ? sentenceElsRef.current[`${sentenceForScroll.pi}-${sentenceForScroll.si}`]
        : paragraphElsRef.current[sentenceForScroll.pi];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollActive, activeStorySentence?.pi, activeStorySentence?.si, userAudio.activeSentence?.pi, userAudio.activeSentence?.si, playbackMode, granularity]);

  // همون قابلیتِ بالا، ولی برای پخشِ کلِ یه ترجمه — وقتی کاربر 🔊ِ کنارِ یه
  // ترجمه رو می‌زنه و اسکرولِ خودکار فعاله، خطِ در حالِ خواندنِ همون ترجمه
  // رو خودکار وسطِ صفحه نگه می‌داره.
  useEffect(() => {
    if (!autoScrollActive || !activeTranslation) return;
    const node =
      granularity === "sentence"
        ? sentenceElsRef.current[`${activeTranslation.pi}-${activeTranslation.si}`]
        : paragraphElsRef.current[activeTranslation.pi];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollActive, activeTranslation?.pi, activeTranslation?.si, granularity]);

  // هر بار متنِ داستان یا زبانش عوض می‌شه، به بالا (App) گزارش می‌دیم تا
  // دکمه‌ی 🔊ِ روی نوارِ پلیر — همون‌جایی که قبلاً بالای این باکس بود —
  // بتونه همین متن رو بخونه. (این کامپوننت با display:none همیشه mount
  // می‌مونه، پس نیازی به پاک‌کردنش موقعِ خروج از تب نیست؛ نمایشِ دکمه روی
  // پلیر با چک‌کردنِ تبِ فعال کنترل می‌شه، نه با خالی‌بودنِ این متن.)
  useEffect(() => {
    latestStoryTextContext = { text: fullStoryText, code: storyLang };
    if (onFullTextChange) onFullTextChange({ text: fullStoryText, code: storyLang });
  }, [fullStoryText, storyLang]);

  // درست مثلِ onFullTextChange بالا — هر بار وضعیتِ صوتِ کاربر (آپلود شده یا
  // نه، در حالِ پخش یا نه، زمانِ فعلی/کل، و اینکه پلیر الان رو حالتِ tts یا
  // user ایستاده) عوض بشه، به App گزارش می‌شه تا نوارِ پخشِ سراسریِ پایینِ
  // صفحه (پلیرِ اصلی) بتونه سوییچ و کنترل‌های همین صوت رو نشون بده. توابعِ
  // play/pause/seek/nextLine/prevLine/setPlaybackMode مستقیم همینجا پاس داده
  // می‌شن (نه به‌عنوانِ dependency) تا افکت فقط با تغییرِ واقعیِ مقادیر اجرا
  // بشه، نه با هر رندر.
  useEffect(() => {
    if (onUserAudioStateChange) {
      onUserAudioStateChange({
        // این آبجکت قبلاً فقط یه زیرمجموعه‌ی ناقص از فیلدهایِ userAudio رو
        // می‌فرستاد (hasAudio/isPlaying/currentTime/duration/play/pause/
        // seek/nextLine/prevLine) — چیزهایی مثلِ markAB، abState، abA، abB
        // (که دکمه‌ی A-B رویِ پلیرِ سراسری بهشون نیاز داره) اصلاً توش نبودن.
        // نتیجه: با اپلودِ صوت و زدنِ دکمه‌ی A-B رویِ پلیرِ پایینِ صفحه،
        // ua.markAB یه تابع نبود (چون اصلاً پاس داده نشده بود) و اپ کرش
        // می‌کرد. حالا کلِ userAudio رو با spread می‌فرستیم تا هرچی به این
        // هوک اضافه بشه، خودکار به پلیرِ سراسری هم برسه.
        ...userAudio,
        playbackMode,
        setPlaybackMode,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mainStoryKey,
    userAudio.hasAudio,
    userAudio.isPlaying,
    userAudio.currentTime,
    userAudio.duration,
    userAudio.abState,
    userAudio.abA,
    userAudio.abB,
    userAudio.manualIndex,
    userAudio.audioSaving,
    userAudio.audioSaveError,
    playbackMode,
  ]);

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

  // آپلودِ PDF برای «منبعِ لغت» — استخراجِ متن با pdf.js (لود می‌شه از CDN،
  // فقط وقتی واقعاً لازم بشه، نه موقعِ بازشدنِ اپ) کاملاً سمتِ مرورگرِ
  // خودِ کاربره؛ هیچ فایلی جایی آپلود نمی‌شه، و نتیجه‌ش هم مثلِ بقیه‌ی
  // منبع‌های لغت فقط تو localStorage (روی همین گوشی) ذخیره می‌شه، نه تو
  // Supabase — پس نیازی به ارتقاءِ پلن نداره.
  const PDF_MAX_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت
  const PDF_MAX_CHARS = 20000; // سقفِ کاراکتر، برای اینکه حجمِ localStorage (که مشترکِ همه‌چیزِ اپه) پر نشه

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // تا انتخابِ دوباره‌ی همون فایل هم onChange رو صدا بزنه
    if (!file) return;
    setPdfError("");
    if (file.size > PDF_MAX_BYTES) {
      setPdfError(`حجمِ فایل بیشتر از ${Math.round(PDF_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setPdfBusy(true);
    try {
      // pdf.js فقط همین‌جا و فقط یه‌بار لود می‌شه (نه تو بارگذاریِ اولیه‌ی
      // اپ) — چون کتابخونه‌ی نسبتاً سنگینیه و اکثرِ کاربرا اصلاً ازش
      // استفاده نمی‌کنن.
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = doc.numPages;
      let lines = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        // هر PDF متنِ خام رو معمولاً به‌صورتِ یه رشته‌ی پیوسته می‌ده، نه
        // خط‌به‌خط — برای اینکه با پارسرِ فعلی (که هر خط رو یه لغت فرض
        // می‌کنه) جور دربیاد، رویِ نقطه/کاما/newline خودِ PDF می‌شکونیمش.
        pageText
          .split(/\n|(?<=[.،,؛])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => lines.push(s));
        if (i % 3 === 0 || i === pageCount) {
          await new Promise((resolve) => setTimeout(resolve, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — بدونِ این، فایل‌های بزرگ UI رو قفل نشون می‌دن
        }
        if (lines.join("\n").length > PDF_MAX_CHARS) break;
      }
      let text = lines.join("\n");
      let truncated = doc.numPages > pageCount;
      if (text.length > PDF_MAX_CHARS) {
        text = text.slice(0, PDF_MAX_CHARS);
        truncated = true;
      }
      if (!text.trim()) {
        setPdfError("متنی از این PDF استخراج نشد — شاید این فایل اسکن/عکسه، نه متنِ واقعی");
        return;
      }
      setNewCollectionText(text);
      if (!newCollectionTitle.trim()) {
        setNewCollectionTitle(file.name.replace(/\.pdf$/i, ""));
      }
      setShowAddCollection(true);
      if (truncated) {
        setPdfError("توجه: چون فایل بزرگ بود، فقط بخشی از متنش خونده شد — قبل از ذخیره می‌تونی ویرایشش کنی");
      }
    } catch (err) {
      setPdfError("خوندنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfBusy(false);
    }
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
  // ترتیبِ این چیپ‌ها از langPickerOrder (همون ترتیبِ سراسری/قابل‌کشیدنی که
  // بالای تنظیمات هم استفاده می‌شه) میاد — تا کاربر بتونه با کشیدنِ چیپ‌ها
  // (پایین‌تر، DraggableToggleLangGrid) جاشون رو عوض کنه، و همون ترتیب هم
  // این‌جا هم توی خودِ متنِ ترجمه‌شده‌ی داستان رعایت بشه.
  const translationLangOptions = (langPickerOrder && langPickerOrder.length ? langPickerOrder : LANGUAGES.map((l) => l.code)).filter(
    (c) => c !== storyLang
  );

  const toggleTranslationLang = (code) => {
    setTranslationLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };
  // ترتیبِ نمایشِ خودِ ترجمه‌ها زیرِ هر جمله/پاراگراف — همیشه بر اساسِ همون
  // ترتیبِ چیپ‌ها (نه بر اساسِ ترتیبِ تپ‌کردن/انتخاب‌کردن)، تا جابه‌جاکردنِ
  // چیپ‌ها واقعاً روی چیدمانِ ترجمه‌های داستان هم اثر بذاره.
  const orderedTranslationLangs = translationLangOptions.filter((c) => translationLangs.includes(c));
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
    // 🔥 فقط پاراگراف‌های فعلاً نمایش‌داده‌شده رو ترجمه می‌کنیم (نه کلِ
    // داستان یه‌جا) — هماهنگ با «نمایش تدریجی» بالا. با هر بار «نمایش
    // بیشتر»، این افکت دوباره اجرا می‌شه و فقط جمله‌های تازه‌نمایان‌شده
    // (که هنوز `s.t` ندارن) صف می‌شن؛ جمله‌های قبلی که ترجمه شدن، با چکِ
    // «in» زیر، دوباره صف نمی‌شن.
    const visibleParagraphs = paragraphs.slice(0, visibleParagraphCount);
    // نکته: چک با «in» (وجودِ کلید)، نه truthiness — چون اگه یه جمله متنِ
    // خالی داشته باشه، ترجمه‌ش هم می‌تونه رشته‌ی خالی برگرده؛ اگه اینجا با
    // truthiness چک می‌کردیم، همچین جمله‌ای همیشه «هنوز ترجمه نشده» حساب
    // می‌شد و این افکت هر بار دوباره اجرا می‌شد — یه حلقه‌ی بی‌پایان که کل
    // اپ رو کند/قفل می‌کرد.
    const missingLangs = translationLangs.filter((code) =>
      visibleParagraphs.some((p) => (p.sentences || []).some((s) => !s.t || !(code in s.t)))
    );
    if (!missingLangs.length) return;
    let cancelled = false;
    (async () => {
      // همه‌ی جمله‌های پاراگراف‌های نمایان (× همه‌ی زبان‌های ناقص) رو تو یه
      // لیستِ تخت جمع می‌کنیم و با سقفِ هم‌زمانیِ محدود اجرا می‌کنیم — نه
      // یک‌جا برای همه (که برای متن‌های طولانی باعثِ rate-limit/ترجمه‌ی
      // ناقص می‌شد).
      const jobs = [];
      visibleParagraphs.forEach((p, pIdx) => {
        (p.sentences || []).forEach((s, sIdx) => {
          missingLangs.forEach((code) => {
            if (s.t && code in s.t) return;
            jobs.push({ pIdx, sIdx, code, text: s.text || "" });
          });
        });
      });
      if (!jobs.length) return;
      // به‌جای صبر برای تمومِ کلِ jobs و یه setParagraphs در آخر (که باعث
      // می‌شد کاربر تا آخرِ کارِ صدها/هزاران درخواست هیچ ترجمه‌ای نبینه)،
      // نتیجه‌ی هر جمله همون لحظه که آماده شد به state اضافه می‌شه — پس
      // ترجمه‌ها تدریجی و زنده روی صفحه ظاهر می‌شن.
      const applyResult = (job, translated) => {
        if (cancelled) return;
        setParagraphs((prevParagraphs) => {
          const target = prevParagraphs[job.pIdx];
          const targetSentence = target?.sentences?.[job.sIdx];
          if (!targetSentence) return prevParagraphs;
          const updated = [...prevParagraphs];
          const sentences = [...(target.sentences || [])];
          sentences[job.sIdx] = { ...targetSentence, t: { ...(targetSentence.t || {}), [job.code]: translated } };
          updated[job.pIdx] = { ...target, sentences };
          return updated;
        });
      };
      let nextIndex = 0;
      async function worker() {
        while (nextIndex < jobs.length) {
          if (cancelled) return;
          const job = jobs[nextIndex++];
          let translated;
          try {
            // forceVerify=true: جمله‌های خودِ داستان مهم‌ترین متنِ اپن —
            // این‌جا حتی اگه تست‌های رایگان چیزی مشکوک ندیدن هم یه بار
            // (فقط دفعه‌ی اول، بعدش برای همیشه کش می‌شه) AI بررسیش کنه.
            translated = await translateFree(job.text, job.code, storyLang, aiSettings, true);
          } catch (e) {
            translated = job.text;
          }
          applyResult(job, translated);
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
    })();
    return () => {
      cancelled = true;
    };
  }, [translationLangs, paragraphs, storyLang, visibleParagraphCount]);

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

  // وقتی کاربر یه لغت/عبارتی که خودش جایی کپی کرده رو تو همین کادرِ جستجو
  // پیست می‌کنه: اگه این متن تو هیچ‌کدوم از منبع‌های خودِ نرم‌افزار (VOCAB،
  // لغات‌واخبار/اسلنگ/مکالمات‌روزمره، لغاتِ ذخیره‌شده) پیدا نشه — یعنی چیزیه
  // که کاربر از بیرون آورده — مستقیم (دقیقاً مثلِ addCustomWord) به
  // انتخاب‌هایِ داستان اضافه‌ش می‌کنیم، نه اینکه فقط تو کادرِ جستجو بمونه.
  // اگه پیدا بشه، دخالت نمی‌کنیم و می‌ذاریم جستجوی معمولی کارشو بکنه.
  const handleVocabPaste = async (e) => {
    const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const w = pasted.trim();
    if (!w) return;
    const q = w.toLowerCase();
    const foundInVocab = VOCAB.some((v) => {
      const vw = v.t[storyLang] || v.t.en || "";
      return vw.toLowerCase().includes(q) || (v.meaningFa && v.meaningFa.includes(w));
    });
    const foundInPools = [STORY_SEARCH_WORD_POOL, STORY_SEARCH_CONVERSATION_POOL].some((pool) =>
      pool.some((item) => item.term.toLowerCase().includes(q) || (item.fa && item.fa.includes(w)))
    );
    const foundInSaved = savedWordsForLang.some(
      (se) => se.word.toLowerCase().includes(q) || (se.meaning && se.meaning.includes(w))
    );
    if (foundInVocab || foundInPools || foundInSaved) return;

    e.preventDefault();
    if (selectedWords.includes(w)) return;
    // اگه چیزی که پیست شده از قبل همون زبونِ داستانه (مثلاً کاربر داره یه
    // داستانِ انگلیسی می‌سازه و یه عبارتِ انگلیسی پیست می‌کنه)، نیازی به
    // تماس با سرویسِ ترجمه نیست — همون لحظه، بدونِ تأخیرِ شبکه اضافه می‌شه.
    if (detectPastedTextLanguage(w) === storyLang) {
      setSelectedWords((prev) => [...prev, w]);
      ensureSavedStoryWord(w, storyLang);
      setTranslateNote(`«${w}» به داستان‌ساز اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
      return;
    }
    setWordTranslating(true);
    try {
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      setTranslateNote(
        normalizeWord(translated) !== normalizeWord(w)
          ? `«${w}» → «${translated}» اضافه شد`
          : `«${w}» به داستان‌ساز اضافه شد`
      );
      setTimeout(() => setTranslateNote(""), 3000);
    } catch (err) {
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

  const addCustomWord = async () => {
    const w = customWord.trim();
    if (!w) return;
    setCustomWord("");
    setTranslateNote("");
    // همون میان‌بر: اگه متنِ واردشده از قبل همون زبونِ داستانه، بدونِ زدن به
    // سرویسِ ترجمه (که تأخیرِ شبکه داره) مستقیم اضافه می‌شه.
    if (detectPastedTextLanguage(w) === storyLang) {
      if (!selectedWords.includes(w)) {
        setSelectedWords((prev) => [...prev, w]);
        ensureSavedStoryWord(w, storyLang);
      }
      return;
    }
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

  // افزودنِ تک‌تکِ کلماتِ متنِ استخراج‌شده از PDF (originalText) به داستان‌ساز
  // — دقیقاً همون منطقِ addCustomWord (تشخیصِ زبان، ترجمه در صورتِ نیاز)،
  // فقط به‌جای گرفتنِ ورودی از کادرِ متنی، مستقیم یه کلمه/عبارتِ کلیک‌شده
  // از متنِ PDF رو می‌گیره.
  const addPdfWordToStory = async (raw) => {
    const w = raw.trim().replace(/^[.,!?;:،؛؟»«"'()\[\]]+|[.,!?;:،؛؟»«"'()\[\]]+$/g, "");
    if (!w) return;
    setTranslateNote("");
    if (selectedWords.includes(w)) return;
    if (detectPastedTextLanguage(w) === storyLang) {
      setSelectedWords((prev) => [...prev, w]);
      ensureSavedStoryWord(w, storyLang);
      setTranslateNote(`«${w}» به داستان‌ساز اضافه شد`);
      setTimeout(() => setTranslateNote(""), 3000);
      return;
    }
    setWordTranslating(true);
    try {
      const res = await translateFree(w, storyLang, "auto", aiSettings);
      const translated = res.replace(/^["'«»]+|["'«».\s]+$/g, "").trim() || w;
      if (!selectedWords.includes(translated)) {
        setSelectedWords((prev) => [...prev, translated]);
        ensureSavedStoryWord(translated, storyLang);
      }
      setTranslateNote(
        normalizeWord(translated) !== normalizeWord(w)
          ? `«${w}» → «${translated}» اضافه شد`
          : `«${w}» به داستان‌ساز اضافه شد`
      );
      setTimeout(() => setTranslateNote(""), 3000);
    } catch (e) {
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
      // نسخه‌های قدیمی‌تر wordStats فیلدِ «word» رو ذخیره نمی‌کردن — برای
      // سازگاری با داده‌ی قبلاً ذخیره‌شده، اگه s.word نبود از خودِ کلید
      // (که به شکل storyLang:word هست) استخراجش می‌کنیم.
      .map(([key, s]) => s.word || key.slice(key.indexOf(":") + 1))
      .filter(Boolean);
    if (ranked.length) {
      setSelectedWords(ranked);
      ranked.forEach((w) => ensureSavedStoryWord(w, storyLang));
    }
  };

  // force=true یعنی «مطمئنم، بدونِ چک‌کردنِ دوباره‌ی داستان‌های مشابه، مستقیم
  // AI رو صدا بزن» — وقتی کاربر خودش از کارتِ «داستانِ مشابه پیدا شد» دکمه‌ی
  // «ساخت داستان جدید» رو بزنه همین حالت پیش میاد.
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
      // با \p{L}/\p{N} (یونیکد) مرزِ کلمه رو دستی می‌سازیم که برای هر زبانی
      // (فارسی/عربی/روسی/لاتینِ با علامت و ...) درست کار کنه.
      const countWordOccurrences = (text, word) => {
        const esc = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!esc) return 0;
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}[\\p{L}\\p{N}]*`, "giu");
        const matches = text.match(re);
        return matches ? matches.length : 0;
      };

      // بعضی از «لغات» انتخاب‌شده، به‌جای یه کلمه‌ی تکی، عبارت یا جمله‌ی کامل
      // مکالمه‌ان (طبق طراحیِ عمدی STORY_SEARCH_CONVERSATION_POOL — کاربر
      // می‌تونه یه خط کامل از مکالمه رو هم به‌عنوان هدف انتخاب کنه). تکرار
      // عینِ یه جمله‌ی ۲۰ کلمه‌ای ۸ بار تو یه داستان کوتاه نه طبیعیه نه اصلاً
      // ممکن — و باعث می‌شد این آیتم همیشه offender بمونه و چرخه‌ی پچ/ریترای
      // رو بی‌فایده و کند کنه. اینجا برای آیتم‌های طولانی، هدفِ تکرارِ
      // واقع‌بینانه‌تری حساب می‌کنیم؛ همه‌ی محاسبات (بودجه‌ی پاراگرافی،
      // offender-تشخیصی، پچ) از همین تابع استفاده می‌کنن.
      const wordUnitCount = (w) => w.trim().split(/\s+/).filter(Boolean).length;
      const effectiveTarget = (w) => {
        const units = wordUnitCount(w);
        if (units <= 3) return repeatCount;
        if (units <= 6) return Math.max(1, Math.min(repeatCount, 3));
        return 1;
      };

      // ============================================================
      // 🔥 بودجه‌بندیِ تکرار به‌ازای هر پاراگراف
      // به‌جای اینکه از مدل بخوایم یه شمارنده‌ی سراسری («۸ بار تو کل داستان»)
      // رو تو ذهنش نگه داره — که هم کند بود هم نادقیق — خودمون از قبل حساب
      // می‌کنیم هر پاراگراف چند بار از هر لغت رو باید ببره (جمعش دقیقاً
      // repeatCount می‌شه) و این جدول رو مستقیم تو پرامپت می‌دیم. «چند بار
      // تو همین یه پاراگراف» یه تسکِ لوکاله که مدل خیلی بهتر رعایتش می‌کنه.
      // برای اینکه بودجه‌بندی معنا داشته باشه، به‌جای یه بازه (کوتاه/متوسط/
      // بلند) یه عددِ ثابت (میانگینِ بازه) به‌عنوانِ تعداد پاراگراف می‌خوایم —
      // این هم به مدل کمک می‌کنه دقیق‌تر باشه (عددِ ثابت رو راحت‌تر از بازه
      // رعایت می‌کنه).
      const targetParagraphs = Math.round((lengthCfg.paragraphMin + lengthCfg.paragraphMax) / 2);
      const buildParagraphBudget = (numParagraphs) => {
        const budget = Array.from({ length: numParagraphs }, () => ({}));
        selectedWords.forEach((w) => {
          const target = effectiveTarget(w);
          const base = Math.floor(target / numParagraphs);
          const remainder = target % numParagraphs;
          const order = Array.from({ length: numParagraphs }, (_, i) => i).sort(() => Math.random() - 0.5);
          for (let i = 0; i < numParagraphs; i++) budget[i][w] = base;
          for (let i = 0; i < remainder; i++) budget[order[i]][w] += 1;
        });
        return budget;
      };
      const paraBudget = buildParagraphBudget(targetParagraphs);
      const budgetTable = paraBudget
        .map((b, i) => {
          const entries = Object.entries(b).filter(([, c]) => c > 0);
          const line = entries.length
            ? entries.map(([w, c]) => `"${w}" ×${c}`).join(", ")
            : "(no target word required here — just continue the narrative)";
          return `Paragraph ${i + 1}: ${line}`;
        })
        .join("\n");

      const buildPrompt = (correction) => `You are a skilled storyteller writing ${genre.prompt}, in ${storyLangLabel} at CEFR level ${storyLevel}, for a language learner whose native language is ${nativeLabel}.

TOPIC/GENRE — hard requirement, not a suggestion: the story MUST genuinely be ${genre.prompt}. Its plot, tone, setting, and vocabulary must clearly and unmistakably belong to this genre from the first sentence — do not default to a generic everyday story if the genre is something else.

LENGTH — hard requirement: write EXACTLY ${targetParagraphs} paragraphs in total (not fewer, not more), each with ${lengthCfg.sentencesHint}. The "paragraphs" array in your JSON output must contain exactly ${targetParagraphs} paragraph objects, in order.

NARRATIVE QUALITY:
- Write ONE genuinely coherent, connected story with a real narrative arc (setup → development → payoff/ending appropriate to the genre) — NOT a disconnected list of example sentences that merely happen to sit next to each other.
- Every sentence must follow logically or causally from the one before it and set up the one after it: consistent characters, setting, and cause-and-effect, the way a real short story reads — a reader should never be able to tell which sentence was "built around" which target word.
- The plot and content must feel fully intentional and relevant to the target words themselves — build a story that is actually ABOUT something connected to these words, not a generic story with the words awkwardly inserted.
- You do NOT need to introduce the target words in the order they're listed — use whatever order serves the story best.
- Paragraphs must flow into each other (later paragraphs should refer back to people, places, or events from earlier ones), not restart the scene each time.
- Every word/phrase you use — target words included — must be used with its correct, natural meaning and normal collocations, exactly as a native speaker would use it. Never force a target word into a sentence where it doesn't semantically fit just to hit the repetition budget (e.g. don't write something like "took off a pineapple from the table" — "take off" doesn't collocate with a fruit; "picked up a pineapple" would be correct). If a target word doesn't fit naturally in a given spot, rewrite the sentence or move the word elsewhere in the story instead of producing an unnatural sentence.

REPETITION — follow this PER-PARAGRAPH budget exactly, instead of trying to track a global count yourself. Each line below lists which target words (and how many times each, counting all grammatical forms/inflections together) should appear in THAT paragraph specifically. This budget already sums to the right total across the whole story, so just follow it paragraph by paragraph — being off by 1 in a single paragraph is fine, but don't ignore the split. Weave the words naturally into the sentence flow — don't just list them mechanically. Note: some target items below are full sentences or phrases rather than single words — for those, a budget of "×1" simply means work that sentence/phrase into the story naturally once; you do NOT need to repeat a long phrase verbatim multiple times.

${budgetTable}
${correction ? "\n" + correction : ""}

Do NOT lengthen any paragraph far beyond the sentence-count guideline above just to fit more repetitions of a word; if a word's budget doesn't fit naturally, reuse it within an existing sentence instead of adding new sentences.

After the story, write 5 multiple-choice comprehension/vocabulary questions in ${storyLangLabel}, each testing ONE of the target words, with 4 options and exactly one correct answer. Respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape: {"paragraphs": [{"sentences": [{"text": "sentence in ${storyLang}"}]}], "questions": [{"word": "the target word this question tests, matching one from the list exactly", "question": "...", "options": ["...","...","...","..."], "answerIndex": 0}]}`;

      const tokenBudget = Math.min(lengthCfg.tokens + 300, 8000);

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
        const paras = parsedAttempt.paragraphs || [];
        const paraTexts = paras.map((p) => (p.sentences || []).map((s) => s.text).join(" "));
        const text = paraTexts.join(" ");
        const attemptCounts = selectedWords.map((w) => {
          const target = effectiveTarget(w);
          return { word: w, count: countWordOccurrences(text, w), target };
        });
        const repDeviation = attemptCounts.reduce((sum, c) => sum + Math.abs(c.count - c.target), 0);
        // این دیگه نیازی به «دقیقاً» رسیدن به target نداره — یه لغت فقط وقتی
        // offender حساب می‌شه که انحرافش واقعاً بزرگ باشه (بیش از ۲ تا فاصله،
        // و بیشتر از دو برابر یا کمتر از نصفِ عددِ خواسته‌شده‌ی خودش)؛ فاصله‌ی
        // ۱ یا ۲ تایی طبیعیه و باعثِ پچ/ریترای نمی‌شه.
        const offenders = attemptCounts.filter(
          (c) => Math.abs(c.count - c.target) > 2 && (c.count > c.target * 2 || c.count < c.target / 2)
        );
        const paraCount = paras.length;
        const paraDeviation = paraCount !== targetParagraphs ? Math.abs(paraCount - targetParagraphs) * 3 : 0;
        const lengthOk = paraCount >= lengthCfg.paragraphMin && paraCount <= lengthCfg.paragraphMax;
        return { counts: attemptCounts, paraTexts, paraCount, lengthOk, deviation: repDeviation + paraDeviation, offenders };
      };

      let parsed = await runAttempt();
      let best = { parsed, ...scoreAttempt(parsed) };

      // ============================================================
      // 🔥 پچِ هدفمند به‌جای regenerate کامل
      // به‌جای اینکه (مثل قبل) تا ۳ بار کل داستان رو از صفر بسازیم، اگه
      // تعداد پاراگراف‌ها دقیقاً همون targetParagraphs بود، فقط همون
      // پاراگراف‌هایی که با بودجه‌ی خودشون فاصله‌ی محسوسی دارن رو (موازی، با
      // Promise.allSettled) بازنویسی می‌کنیم — هر کالِ پچ فقط یه پاراگراف
      // کوچیکه، پس خیلی سریع‌تر از تولید کل داستانه.
      if (best.paraCount === targetParagraphs && best.offenders.length > 0) {
        const paragraphsToPatch = [];
        best.paraTexts.forEach((ptext, i) => {
          const needs = [];
          selectedWords.forEach((w) => {
            const target = paraBudget[i][w] || 0;
            const actual = countWordOccurrences(ptext, w);
            if (Math.abs(actual - target) > 1) needs.push({ word: w, target, actual });
          });
          if (needs.length) paragraphsToPatch.push({ index: i, needs });
        });

        if (paragraphsToPatch.length) {
          const buildPatchPrompt = ({ index, needs }) => {
            const prev = best.paraTexts[index - 1] || "(this is the first paragraph — no previous context)";
            const next = best.paraTexts[index + 1] || "(this is the last paragraph — no next context)";
            const current = best.paraTexts[index];
            const needsList = needs
              .map((n) => `"${n.word}": currently appears ${n.actual} time(s), should appear ${n.target} time(s)`)
              .join("; ");
            return `You are lightly editing ONE paragraph of an existing ${storyLangLabel} story (CEFR ${storyLevel}) to fix word-usage counts, WITHOUT changing the plot, characters, or events.

Previous paragraph (context only — do NOT rewrite this): ${prev}

Paragraph to rewrite: ${current}

Next paragraph (context only — do NOT rewrite this): ${next}

Rewrite ONLY the "paragraph to rewrite" so it stays fully coherent with the previous/next paragraphs and keeps roughly the same length and tone, but adjusts these word counts (counting all grammatical forms/inflections together): ${needsList}. Weave the words naturally into the sentences — don't just repeat them mechanically or list them. Respond ONLY with strict JSON, no markdown fences, no extra text: {"sentences": [{"text": "..."}]}`;
          };

          const patchResults = await Promise.allSettled(
            paragraphsToPatch.map((item) =>
              callAI({ prompt: buildPatchPrompt(item), maxTokens: 900, aiSettings }).then((res) => {
                const cleaned = res.replace(/```json|```/g, "").trim();
                return { index: item.index, parsed: JSON.parse(cleaned) };
              })
            )
          );

          const patchedParagraphs = [...best.parsed.paragraphs];
          patchResults.forEach((r) => {
            if (r.status === "fulfilled" && r.value?.parsed?.sentences?.length) {
              const resplit = splitTextIntoSentenceStrings(r.value.parsed.sentences.map((s) => s?.text || "").join(" "));
              patchedParagraphs[r.value.index] = { sentences: resplit.map((text) => ({ text })) };
            }
          });
          const patchedAttempt = { ...best.parsed, paragraphs: patchedParagraphs };
          const patchedScore = { parsed: patchedAttempt, ...scoreAttempt(patchedAttempt) };
          if (patchedScore.deviation < best.deviation) best = patchedScore;
        }
      }

      // اگه بعد از پچِ پاراگرافی هنوزم مشکل داشت (یا اصلاً تعداد پاراگراف‌ها
      // درست نبود که پچ اصلاً قابل‌اعمال نبود)، فقط یه بار — نه سه بار مثل
      // قبل — کل داستان رو با بازخوردِ دقیق از نو می‌سازیم.
      if (best.offenders.length > 0 || !best.lengthOk) {
        const repDetail = best.offenders.map((c) => `"${c.word}": you used it ${c.count} times, but the target is about ${c.target}`).join("; ");
        const lengthDetail = best.lengthOk
          ? ""
          : ` Also, your previous attempt had ${best.paraCount} paragraphs, but it must have exactly ${targetParagraphs} paragraphs — fix the paragraph count too.`;
        const correction = `Your previous attempt had a large repetition imbalance for some words (${repDetail || "see above"}).${lengthDetail} Rewrite the story from scratch and this time follow the per-paragraph budget closely — being off by 1 in a single paragraph is fine, just avoid using a word way more than double or way less than half of its total target across the story. Keep the story just as natural, coherent, and connected as before (or more so) while you do this — don't turn it into disconnected example sentences to make counting easier.`;
        try {
          const retryParsed = await runAttempt(correction);
          const retryScore = { parsed: retryParsed, ...scoreAttempt(retryParsed) };
          if (retryScore.deviation < best.deviation) {
            best = retryScore;
          }
        } catch {
          // اگه این تلاش هم خطا داد، بهترین نسخه‌ی موجود رو نگه می‌داریم
        }
      }
      parsed = best.parsed;

      // بعد از تمومِ پچ/ریترای، اگه هنوزم بعضی لغات دقیقاً به تعدادِ درخواستی
      // نرسیده بودن، شفاف به کاربر می‌گیم — داستان رو (بهترین نسخه‌ی موجود)
      // بازم نشون می‌دیم، فقط دیگه ادعا نمی‌کنیم که تکرارها ۱۰۰٪ دقیقن.
      if (best.offenders && best.offenders.length > 0) {
        const detail = best.offenders.map((o) => `«${o.word}»: ${o.count} بار`).join("، ");
        setRepeatNotice(`تعداد تکرار این لغت‌ها با ${repeatCount} بار خواسته‌شده فاصله‌ی زیادی داره — ${detail}. می‌تونی دوباره «بساز داستان» رو بزنی.`);
      }

      const storyParagraphs = enforceSentenceSplit(parsed.paragraphs || []);
      
      // ============================================================
      // 🔥 داستان بدون ترجمه ذخیره می‌شه — ترجمه‌ی خودش (با سرویس‌های
      // رایگان، جدا از هوش مصنوعی) رو یه useEffect جدا انجام می‌ده که هر
      // وقت translationLangs عوض بشه (چه همین الان، چه هر وقت کاربر بعداً
      // یه زبان دیگه هم اضافه/کم کنه) خودش رو به‌روز می‌کنه — نیازی به
      // ساختن دوباره‌ی کل داستان نیست.
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      // داستانِ تازه‌ساخته‌شده هنوز ذخیره نشده — پس هنوز شناسه‌ای نداره؛ اگه
      // قبلاً یه داستانِ ذخیره‌شده‌ی دیگه باز بوده، این‌جا اون ارتباط پاک
      // می‌شه تا لغاتِ تازه‌ذخیره‌شده به اون داستانِ قدیمی نچسبن.
      setCurrentStoryId(null);
      
      const finalQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      setQuestions(finalQuestions);

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

  // «وارد کردنِ PDF برای خوانش» — برخلافِ آپلودِ PDF بالا (که فقط برای
  // «منبعِ لغت» بود)، این‌یکی کلِ متنِ PDF رو مستقیم می‌ذاره تو همون
  // سیستمِ خوانشِ داستان (پاراگراف‌به‌پاراگراف/جمله‌به‌جمله، هایلایت،
  // ترجمه، صدا) — بدون اینکه از هوش‌مصنوعی بخوایم داستانی بسازه؛ یعنی
  // paragraphs رو مستقیم از خودِ متنِ PDF می‌سازیم، دقیقاً هم‌شکلِ همون
  // چیزی که generateStory در پایان تولید می‌کنه، پس تمام رابط کاربریِ
  // پایین (که به paragraphs/currentStoryId/questions وصله) بدونِ هیچ
  // تغییری کار می‌کنه. کاربر بعداً خودش با پاپ‌آپِ لغت تصمیم می‌گیره کدوم
  // لغت‌ها رو «ذخیره برای داستانِ بعدی» یا «افزودن به جعبه‌ی لایتنر» کنه.
  const PDF_READ_MAX_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت
  const PDF_READ_SENTENCES_PER_PARAGRAPH = 5; // استخراجِ PDF معمولاً مرزِ پاراگرافِ واقعی رو حفظ نمی‌کنه، پس خودمون هر ۵ جمله رو یه «پاراگراف» حساب می‌کنیم تا خوانا بمونه
  const PDF_READ_MAX_SENTENCES = 2000; // سقفِ کلی — فراتر از این برای موبایل/سرویسِ ترجمه‌ی رایگان زیادی سنگین می‌شه (لازم شد می‌تونی این عدد رو دوباره کم/زیاد کنی)

  const handlePdfImportForReading = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setPdfReadError("");
    if (file.size > PDF_READ_MAX_BYTES) {
      setPdfReadError(`حجمِ فایل بیشتر از ${Math.round(PDF_READ_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setPdfReadBusy(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = doc.numPages;
      let allSentences = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        allSentences.push(...splitTextIntoSentenceStrings(pageText));
        // pdf.js انجامِ getTextContent روی صفحه‌های سنگین رو کاملاً
        // سینکرون/CPU-heavy انجام می‌ده؛ خودِ await هم همیشه کافی نیست تا
        // مرورگر فرصتِ رندر/پاسخ‌گویی به لمس پیدا کنه (چون resolve شدنِ
        // promise یه microtask‌ه، نه یه چرخه‌ی کاملِ event loop). برای
        // همینه که با حذفِ سقفِ صفحه، فایل‌های بزرگ باعثِ «قفل‌شدنِ» ظاهریِ
        // صفحه می‌شدن. هر چند صفحه یه‌بار صریحاً به event loop برمی‌گردیم
        // (setTimeout به‌جایِ Promise.resolve، چون setTimeout یه macrotask
        // واقعیه و بهِ مرورگر اجازه‌ی رندر/پاسخ به لمس رو می‌ده) تا هم UI
        // فریز نشه، هم کاربر بفهمه داره کار می‌کنه (نه هنگ کرده).
        if (i % 3 === 0 || i === pageCount) {
          setPdfReadProgress(`صفحه‌ی ${i} از ${pageCount}...`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (allSentences.length > PDF_READ_MAX_SENTENCES) break;
      }
      let truncated = false;
      if (allSentences.length > PDF_READ_MAX_SENTENCES) {
        allSentences = allSentences.slice(0, PDF_READ_MAX_SENTENCES);
        truncated = true;
      }
      if (!allSentences.length) {
        setPdfReadError("متنی از این PDF استخراج نشد — شاید این فایل اسکن/عکسه، نه متنِ واقعی");
        return;
      }
      const fullRawText = allSentences.join(" ");
      const detectedLang = detectPastedTextLanguage(fullRawText);
      if (detectedLang) setStoryLang(detectedLang);
      // سطح رو دیگه همیشه A2 نمی‌ذاریم — از رویِ خودِ متنِ استخراج‌شده،
      // بدونِ AI و آنی، حدس زده می‌شه (نگاه کن: detectTextCEFRLevel بالا).
      setStoryLevel(detectTextCEFRLevel(fullRawText));
      const storyParagraphs = [];
      for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
        const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
        storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
      }
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      setCurrentStoryId(null);
      setQuestions([]);
      setAnswers({});
      setSubmitted(false);
      setError("");
      setRepeatNotice("");
      if (truncated) {
        setPdfReadError("توجه: چون فایل بزرگ بود، فقط بخشی از متنش خونده و آماده‌ی خوانش شد");
      }
    } catch (err) {
      setPdfReadError("خوندنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfReadBusy(false);
      setPdfReadProgress("");
    }
  };

  // «خروجی PDF دوزبانه» — فایلِ خامِ PDF (عکس‌ها/چیدمانِ اصلی) دست‌نخورده
  // می‌مونه: هر صفحه با pdf.js دقیقاً همون‌جوری که هست به یک عکس رندر و
  // در یک PDFِ خروجیِ تازه گذاشته می‌شه، و بلافاصله بعدش یک صفحه‌ی
  // «روبرو»ی ترجمه اضافه می‌شه (متنِ همون صفحه، ترجمه‌شده). چون کشیدنِ
  // مستقیمِ متنِ فارسی/عربی با pdf-lib شکلِ حروف رو به‌هم نمی‌چسبونه (بدونِ
  // text-shaping بدشکل درمیاد)، ترجمه رو هم با canvas (fillText خودِ
  // مرورگر که shaping/جهتِ RTL رو کامل بلده) می‌کِشیم و مثلِ صفحه‌ی اصلی،
  // به‌صورتِ عکس embed می‌کنیم — نتیجه یک PDFِ واحد با متنِ اصلی و ترجمه‌ی
  // روبروی هم، برای هر صفحه.
  const BILINGUAL_PDF_MAX_BYTES = 80 * 1024 * 1024; // ۸۰ مگابایت — رندرِ تصویریِ صفحه‌به‌صفحه از استخراجِ صرفِ متن سنگین‌تره
  const BILINGUAL_PDF_MAX_PAGES = 60; // سقفِ صفحات، تا رندر+ترجمه رو موبایل خیلی طول نکشه/قفل نکنه
  const BILINGUAL_PDF_RENDER_SCALE = 1.6; // کیفیتِ کافی برای خوانا بودنِ متن/عکسِ صفحه، بدونِ حجمِ زیادِ نهایی

  const handleBilingualPdfExport = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setBilingualPdfError("");
    if (file.size > BILINGUAL_PDF_MAX_BYTES) {
      setBilingualPdfError(`حجمِ فایل بیشتر از ${Math.round(BILINGUAL_PDF_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    setBilingualPdfBusy(true);
    setBilingualPdfProgress("در حال آماده‌سازی...");
    try {
      const [pdfjsLib, pdfLib] = await Promise.all([import("pdfjs-dist"), import("pdf-lib")]);
      const { PDFDocument } = pdfLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const srcDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pageCount = Math.min(srcDoc.numPages, BILINGUAL_PDF_MAX_PAGES);
      const truncated = srcDoc.numPages > BILINGUAL_PDF_MAX_PAGES;

      // مطمئن شو فونتِ فارسیِ خودِ اپ قبل از رسم روی canvas لود شده —
      // وگرنه ممکنه اولین صفحات با فونتِ پیش‌فرضِ سیستم (زشت/بی‌ربط) کشیده بشن.
      try {
        await document.fonts.load("bold 26px Vazirmatn");
        await document.fonts.load("22px Vazirmatn");
        await document.fonts.ready;
      } catch {}

      const outDoc = await PDFDocument.create();
      const isRtl = /^(fa|ar|ur|he|ps|ku)/i.test(nativeLang || "");

      const canvasToJpgBytes = (canvas) =>
        new Promise((resolve) => {
          canvas.toBlob(
            (b) => (b ? b.arrayBuffer().then(resolve) : resolve(null)),
            "image/jpeg",
            0.85
          );
        });

      for (let i = 1; i <= pageCount; i++) {
        setBilingualPdfProgress(`صفحه‌ی ${i} از ${pageCount}: رندرِ صفحه‌ی اصلی...`);
        await new Promise((r) => setTimeout(r, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — تا UI قفل نشه

        const page = await srcDoc.getPage(i);
        const viewport = page.getViewport({ scale: BILINGUAL_PDF_RENDER_SCALE });
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = Math.max(1, Math.ceil(viewport.width));
        pageCanvas.height = Math.max(1, Math.ceil(viewport.height));
        const pageCtx = pageCanvas.getContext("2d");
        await page.render({ canvasContext: pageCtx, viewport }).promise;
        const pageBytes = await canvasToJpgBytes(pageCanvas);
        if (pageBytes) {
          const pageImg = await outDoc.embedJpg(pageBytes);
          const outPage1 = outDoc.addPage([pageCanvas.width, pageCanvas.height]);
          outPage1.drawImage(pageImg, { x: 0, y: 0, width: pageCanvas.width, height: pageCanvas.height });
        }

        // متنِ همین صفحه رو دربیار و ترجمه کن
        setBilingualPdfProgress(`صفحه‌ی ${i} از ${pageCount}: در حال ترجمه...`);
        const content = await page.getTextContent();
        const pageText = extractPdfPageTextFlat(content);
        let translatedText = "";
        if (pageText) {
          const sentences = splitTextIntoSentenceStrings(pageText);
          // سرویس‌های رایگانِ ترجمه سقفِ طولِ متن دارن — جمله‌ها رو تو
          // گروه‌های چندصدکاراکتری دسته می‌کنیم، هر گروه یه درخواستِ جدا.
          const groups = [];
          let cur = "";
          for (const s of sentences.length ? sentences : [pageText]) {
            if (cur && (cur + " " + s).length > 400) {
              groups.push(cur);
              cur = s;
            } else {
              cur = cur ? `${cur} ${s}` : s;
            }
          }
          if (cur) groups.push(cur);
          const translatedGroups = await runWithConcurrencyLimit(groups, GLOBAL_TRANSLATE_CONCURRENCY, (g) =>
            translateFree(g, nativeLang || "fa", "auto", aiSettings)
          );
          translatedText = translatedGroups.join(" ");
        }

        // صفحه‌ی «روبرو»ی ترجمه — به‌صورتِ عکسِ متنی (canvas)، دقیقاً به
        // همون اندازه‌ی صفحه‌ی اصلی، تا نظمِ صفحه‌به‌صفحه‌ی PDF حفظ بشه.
        const txCanvas = document.createElement("canvas");
        txCanvas.width = pageCanvas.width;
        txCanvas.height = pageCanvas.height;
        const txCtx = txCanvas.getContext("2d");
        txCtx.fillStyle = "#fdfbf5";
        txCtx.fillRect(0, 0, txCanvas.width, txCanvas.height);
        txCtx.direction = isRtl ? "rtl" : "ltr";
        txCtx.textBaseline = "top";
        txCtx.textAlign = isRtl ? "right" : "left";
        const margin = Math.round(txCanvas.width * 0.06);
        const maxWidth = txCanvas.width - margin * 2;
        const startX = isRtl ? txCanvas.width - margin : margin;
        let y = margin;

        txCtx.fillStyle = "#8a6d1f";
        txCtx.font = `bold 26px Vazirmatn, Tahoma, sans-serif`;
        txCtx.fillText(`ترجمه — صفحه‌ی ${i}`, startX, y);
        y += 46;

        txCtx.fillStyle = "#242018";
        const fontSizePx = 21;
        const lineHeight = Math.round(fontSizePx * 1.7);
        txCtx.font = `${fontSizePx}px Vazirmatn, Tahoma, sans-serif`;
        const words = (translatedText || "متنی برای ترجمه در این صفحه پیدا نشد.").split(/\s+/).filter(Boolean);
        let line = "";
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (line && txCtx.measureText(test).width > maxWidth) {
            if (y > txCanvas.height - margin - lineHeight) { line = ""; break; } // دیگه جا نیست — بقیه‌ی ترجمه‌ی این صفحه truncate می‌شه
            txCtx.fillText(line, startX, y);
            y += lineHeight;
            line = w;
          } else {
            line = test;
          }
        }
        if (line && y <= txCanvas.height - margin) txCtx.fillText(line, startX, y);

        const txBytes = await canvasToJpgBytes(txCanvas);
        if (txBytes) {
          const txImg = await outDoc.embedJpg(txBytes);
          const outPage2 = outDoc.addPage([txCanvas.width, txCanvas.height]);
          outPage2.drawImage(txImg, { x: 0, y: 0, width: txCanvas.width, height: txCanvas.height });
        }
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")} - دوزبانه.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      setBilingualPdfError(
        truncated
          ? `توجه: چون فایل بیشتر از ${BILINGUAL_PDF_MAX_PAGES} صفحه بود، فقط ${BILINGUAL_PDF_MAX_PAGES} صفحه‌ی اول پردازش و دانلود شد`
          : ""
      );
    } catch (err) {
      console.error(err);
      setBilingualPdfError("ساختِ PDFِ دوزبانه مشکل داشت — فایل ممکنه خراب باشه یا حجم/تعدادِ صفحاتش برای مرورگر زیاد باشه");
    } finally {
      setBilingualPdfBusy(false);
      setBilingualPdfProgress("");
    }
  };

  // «نمایشِ PDF همینجا» — حالتِ دومِ بارگذاریِ PDF. به‌جای رندرِ از پیش هر
  // صفحه به یک عکسِ ثابت، بایتِ خامِ خودِ فایل ذخیره می‌شه و هر صفحه با
  // PdfLivePageView همون لحظه که کاربر می‌بینتش زنده رندر می‌شه — یعنی یک
  // ویووِرِ واقعیِ PDF، با لایه‌ی متنِ قابلِ‌سلکت، نه یک عکس. متنِ هر صفحه
  // هم همچنان از قبل استخراج و ترجمه می‌شه (برای باکسِ ترجمه‌ی روبرو و
  // بخشِ «نمایشِ متنِ اصلی (کلیک‌پذیر)»).
  const PDF_VIEW_MAX_BYTES = 80 * 1024 * 1024; // ۸۰ مگابایت
  // 🩹 طبقِ درخواستِ کاربر، سقفِ تعدادِ صفحات کاملاً برداشته شد — قبلاً حتی
  // فایل‌های خیلی طولانی (مثلاً ۲۷۴ صفحه) رو فقط تا صفحه‌ی ۶۰ می‌خوند و
  // بی‌صدا بقیه رو کنار می‌ذاشت. الان همه‌ی صفحاتِ فایل پردازش می‌شن —
  // ممکنه برای فایل‌های خیلی حجیم/طولانی رو موبایل کمی طول بکشه، ولی
  // صفحه‌به‌صفحه که آماده می‌شه فوراً نشون داده و ذخیره می‌شه، پس نیازی به
  // صبرِ کاربر برای کلِ فایل نیست.

  const handlePdfViewImport = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setPdfViewError("");
    if (file.size > PDF_VIEW_MAX_BYTES) {
      setPdfViewError(`حجمِ فایل بیشتر از ${Math.round(PDF_VIEW_MAX_BYTES / (1024 * 1024))} مگابایتِ مجازه`);
      return;
    }
    // قبل از شروعِ فایلِ تازه، عکسِ فرمتِ قدیمی (اگه بود) و نمونه‌ی زنده‌ی
    // قبلی رو آزاد کن.
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewBusy(true);
    setPdfViewProgress("در حال آماده‌سازی...");
    // شناسه‌ی تازه برای این سند — همین از همین الان تو IndexedDB ثبت می‌شه
    // و صفحه‌به‌صفحه که آماده می‌شن بهش اضافه می‌شن، تا اگه کاربر وسطِ کار
    // هم اپ رو ببنده، صفحاتِ تا اون‌جا پردازش‌شده از دست نره.
    const docId = `pdf-${Date.now()}`;
    const docTitle = file.name.replace(/\.pdf$/i, "");
    setPdfViewDocId(docId);
    setPdfViewTitle(docTitle);
    setPdfViewPersisted(true);
    try {
      const pdfjsLib = await getPdfjsLib();
      const buf = await file.arrayBuffer();
      // یه کپیِ جدا برای ذخیره‌سازی — چون pdf.js ممکنه بافرِ اصلی رو به
      // خودش «منتقل» (transfer/detach) کنه و بعدش دیگه قابلِ خوندن نباشه.
      const bufForStorage = buf.slice(0);
      // disableFontFace:true → به‌جای تکیه به موتورِ فونتِ خودِ مرورگر/وب‌ویو
      // (که رویِ بعضی گوشی‌ها با فونت‌های embedded/subset این PDFها گلیف‌ها
      // رو با فاصله‌ی غلط می‌چیند و کلمه‌ها تکه‌تکه/به‌هم‌ریخته نشون داده
      // می‌شن)، خودِ pdf.js هر گلیف رو مستقیم به‌صورتِ مسیرِ برداری رسم
      // می‌کنه — دقیقاً همون چیزی که تو PDFِ اصلی هست، بدونِ وابستگی به
      // فونت‌شیپینگِ دستگاه.
      const srcDoc = await pdfjsLib.getDocument({ data: buf, disableFontFace: true }).promise;
      const pageCount = srcDoc.numPages;

      // نمایشِ زنده از همین الان فعاله — کاربر منتظرِ ترجمه نمی‌مونه تا
      // خودِ صفحه رو ببینه.
      setPdfViewLiveDoc({ docId, doc: srcDoc });

      const metaSaved = await savePdfViewMeta({
        id: docId,
        title: docTitle,
        pageCount,
        doneCount: 0,
        createdAt: Date.now(),
      });
      const fileSaved = await savePdfViewFile(docId, bufForStorage);
      await refreshPdfViewDocs();
      // savePdfViewMeta/savePdfViewPage/savePdfViewFile قبلاً هر خطایی رو
      // بی‌صدا قورت می‌دادن (فقط false برمی‌گردوندن) — یعنی اگه حافظه‌ی
      // مرورگر (IndexedDB) به هر دلیلی (حالتِ خصوصی، پُر بودنِ فضا، یا
      // محدودیتِ WebViewِ خودِ اپ) اجازه‌ی نوشتن نمی‌داد، کاربر هیچ
      // پیامی نمی‌دید و فقط بعداً می‌فهمید که PDF تو لیستِ «داستان‌های
      // ذخیره‌شده» نیست. حالا این حالت صریحاً ردگیری و به کاربر گفته می‌شه
      // (persistFailed پایین‌تر، بعدِ حلقه‌ی صفحات، چک می‌شه — نه همین‌جا،
      // چون پیامِ پایانِ حلقه نباید این هشدار رو پاک کنه). نامِ دقیقِ خطا
      // (مثلاً QuotaExceededError) هم نگه داشته می‌شه تا تو پیامِ نهایی
      // نشون داده بشه — بدونِ نیاز به کنسولِ دیباگ.
      let persistFailed = !metaSaved.ok || !fileSaved.ok;
      let firstErrorName = (!metaSaved.ok && metaSaved.errorName) || (!fileSaved.ok && fileSaved.errorName) || "";

      for (let i = 1; i <= pageCount; i++) {
        setPdfViewProgress(`صفحه‌ی ${i} از ${pageCount}: در حال ترجمه...`);
        await new Promise((r) => setTimeout(r, 0)); // نگاه کن به توضیحِ مشابه تو handlePdfImportForReading — تا UI قفل نشه

        const page = await srcDoc.getPage(i);
        const content = await page.getTextContent();
        // به‌جای چسبوندنِ همه‌چیز با یه space (که کاملاً مرزِ خط/پاراگرافِ
        // متنِ اصلی رو گم می‌کرد)، سطربندیِ واقعیِ صفحه حفظ می‌شه — تا
        // ترجمه هم بشه پاراگراف‌به‌پاراگراف هم‌شکلِ متنِ اصلی نشونش داد.
        const pageText = extractPdfPageTextWithBreaks(content);
        const translatedText = pageText
          ? await translatePageTextPreservingParagraphs(pageText, nativeLang || "fa", aiSettings)
          : "";

        const newPage = {
          pageNum: i,
          originalText: pageText,
          translatedText: translatedText || "متنی برای ترجمه در این صفحه پیدا نشد.",
        };

        // بلافاصله همین صفحه رو نشون بده — کاربر منتظرِ کلِ فایل نمی‌مونه،
        // از همون صفحه‌ی اول می‌تونه شروع به خوندن کنه، بقیه پشتِ‌صحنه
        // پردازش می‌شن. صفحه‌ی اول هم که آماده شد، خودکار باز می‌شه.
        setPdfViewPages((prev) => [...prev, newPage]);
        if (i === 1) setPdfViewIndex(0);

        // ذخیره‌ی متنِ همین صفحه تو IndexedDB — تا حتی اگه پردازشِ صفحاتِ
        // بعدی قطع بشه، همین‌قدر برای همیشه می‌مونه (خودِ عکس/صفحه دیگه
        // لازم نیست ذخیره بشه، چون از رویِ همون فایلِ خامِ ذخیره‌شده هر بار
        // زنده رندر می‌شه).
        const pageSaved = await savePdfViewPage(docId, newPage);
        const metaSavedThisPage = await savePdfViewMeta({ id: docId, title: docTitle, pageCount, doneCount: i, createdAt: Date.now() });
        if (!pageSaved.ok || !metaSavedThisPage.ok) {
          persistFailed = true;
          if (!firstErrorName) firstErrorName = (!pageSaved.ok && pageSaved.errorName) || (!metaSavedThisPage.ok && metaSavedThisPage.errorName) || "";
        }
      }

      if (persistFailed) {
        // 🩹 علاوه بر پیامِ کلی، تخمینِ واقعیِ فضای ذخیره‌سازیِ مرورگر و
        // نامِ دقیقِ خطا هم نشون داده می‌شه — تا معلوم بشه واقعاً «فضا پُره»
        // یا دلیلِ دیگه‌ای داره (مثلاً حالتِ خصوصی که QuotaExceeded نمی‌ده،
        // بلکه خودِ بازکردنِ دیتابیس رو رد می‌کنه).
        const estimate = await estimatePdfViewStorage();
        const details = [
          firstErrorName ? `نوعِ خطا: ${firstErrorName}` : "",
          estimate ? `فضای استفاده‌شده: ${estimate.usageMB} از ${estimate.quotaMB} مگابایت (${estimate.pct}%)` : "",
        ]
          .filter(Boolean)
          .join(" — ");
        setPdfViewError(
          "این PDF فقط تا وقتی همین صفحه بازه قابلِ خوندنه — حافظه‌ی محلیِ مرورگر/اپ اجازه‌ی ذخیره‌ی دائمی رو نداد (مثلاً به‌خاطرِ حالتِ خصوصی یا پُر بودنِ فضا)، پس بعد از بستن یا رفرش از دست می‌ره. دکمه‌ی «ذخیره در داستان‌ها» هم به همین دلیل غیرفعاله — چون چیزی برای بازکردنِ بعدی نمی‌مونه." +
            (details ? ` (${details})` : "")
        );
        setPdfViewPersisted(false);
      } else {
        setPdfViewError("");
        setPdfViewPersisted(true);
      }
      refreshPdfViewDocs();
    } catch (err) {
      console.error(err);
      setPdfViewError("بازکردنِ این PDF مشکل داشت — فایل ممکنه خراب یا رمزگذاری‌شده باشه");
    } finally {
      setPdfViewBusy(false);
      setPdfViewProgress("");
    }
  };

  // بازکردنِ یه PDFِ قبلاً ذخیره‌شده از لیست — بدونِ آپلودِ دوباره یا هیچ
  // درخواستِ ترجمه‌ی تازه‌ای؛ فقط عکس‌ها/ترجمه‌های همون‌موقع از IndexedDB
  // خونده می‌شن و به object URL تبدیل می‌شن.
  const openSavedPdfViewDoc = async (doc) => {
    // این لیست حالا داخلِ پنلِ «داستان‌های ذخیره‌شده»ست؛ برای دیدنِ خودِ
    // صفحاتِ PDF باید از اون پنل برگردیم به نمای اصلیِ داستان‌ساز — دقیقاً
    // همون‌طور که بازکردنِ یه داستانِ ذخیره‌شده هم این کار رو می‌کنه.
    setShowSaved(false);
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewError("");
    setPdfViewBusy(true);
    setPdfViewProgress("در حال بازکردنِ PDFِ ذخیره‌شده...");
    try {
      // 🩹 doc.pageCount ممکنه نامعلوم باشه (مثلاً کارتی که از قبل، پیش از
      // اضافه‌شدنِ این فیلد، ساخته شده) — بدونِ این fallback، حلقه‌ی
      // loadPdfViewPages اصلاً اجرا نمی‌شد (for i=1..undefined) و بی‌هیچ
      // خطایی صفحاتِ خالی برمی‌گشت؛ دقیقاً همون حالتی که کاربر می‌بینه
      // «هیچی نشون داده نمی‌شه» بدونِ هیچ پیام یا نشونه‌ای از چرایی‌اش.
      const expectedPageCount = doc.pageCount || 2000;
      // 🆕 اول بایتِ خامِ خودِ فایل رو بردار — اگه این PDF با نسخه‌ی جدید
      // ذخیره شده باشه (نه فرمتِ قدیمی‌ترِ فقط-عکس)، اینجا موجوده و می‌شه
      // با pdf.js دوباره بازش کرد تا صفحه‌ها زنده رندر بشن.
      const [fileBytes, storedPages] = await Promise.all([
        loadPdfViewFile(doc.id),
        loadPdfViewPages(doc.id, expectedPageCount),
      ]);
      const pages = storedPages
        .sort((a, b) => a.pageNum - b.pageNum)
        .map((p) => ({ ...p, imageUrl: p.imageBlob ? URL.createObjectURL(p.imageBlob) : "" }));
      setPdfViewPages(pages);
      setPdfViewTitle(doc.title);
      setPdfViewDocId(doc.id);
      setPdfViewIndex(0);

      let liveDocReady = false;
      if (fileBytes) {
        try {
          const pdfjsLib = await getPdfjsLib();
          // نگاه کن به همین توضیح تو handlePdfViewImport — همون
          // disableFontFace برای بازکردنِ PDFهای قبلاً ذخیره‌شده هم لازمه.
          const liveDoc = await pdfjsLib.getDocument({ data: fileBytes, disableFontFace: true }).promise;
          setPdfViewLiveDoc({ docId: doc.id, doc: liveDoc });
          liveDocReady = true;
        } catch (liveErr) {
          console.error(liveErr);
          // اگه بازکردنِ زنده‌ی فایل شکست خورد، حداقل صفحاتِ متنی/ترجمه
          // (اگه موجود باشن) هنوز قابلِ دیدنن.
        }
      }

      setPdfViewPersisted(liveDocReady || pages.length > 0);
      if (!liveDocReady && pages.length === 0) {
        // 🩹 قبلاً این حالت کاملاً بی‌صدا بود: نه خطا، نه هیچ چیزِ دیگه‌ای —
        // کاربر فقط یه اسپینر می‌دید و بعدش هیچی، انگار برنامه یخ زده.
        // این معمولاً یعنی صفحاتِ واقعیِ PDF (که فقط رویِ همون گوشی/مرورگرِ
        // اصلی، تویِ IndexedDB ذخیره شده بودن — نه رویِ سرور/ابر) از بین
        // رفتن: مثلاً کاربر کش/دیتای مرورگر رو پاک کرده، اپ رو حذف و دوباره
        // نصب کرده، یا داره از یه گوشی/مرورگرِ دیگه وارد می‌شه. کارتِ خودِ
        // داستان (اشاره‌گر) از طریق ابر همگام می‌مونه، ولی خودِ فایل/عکسِ
        // صفحات هیچ‌وقت به سرور فرستاده نمی‌شه، پس روی دستگاهِ تازه در
        // دسترس نیست.
        setPdfViewError(
          "این PDF دیگه روی این گوشی/مرورگر در دسترس نیست (چون فقط همینجا ذخیره شده بود، نه روی سرور) — احتمالاً حافظه‌ی مرورگر پاک شده یا داری از یه دستگاهِ دیگه وارد می‌شی. برای دیدنش دوباره، فایلِ PDF رو از اول آپلود کن."
        );
      } else if (pages.length > 0 && doc.doneCount < doc.pageCount) {
        setPdfViewError(
          `توجه: دفعه‌ی قبل فقط ${doc.doneCount} صفحه از ${doc.pageCount} صفحه پردازش شده بود؛ برای بقیه دوباره فایل رو آپلود کن`
        );
      }
    } catch (err) {
      console.error(err);
      setPdfViewError("بازکردنِ این PDFِ ذخیره‌شده مشکل داشت");
    } finally {
      setPdfViewBusy(false);
      setPdfViewProgress("");
    }
  };

  const handleDeletePdfViewDoc = async (doc) => {
    await deletePdfViewDoc(doc.id, doc.pageCount);
    if (pdfViewDocId === doc.id) {
      pdfViewPages.forEach((p) => {
        try { URL.revokeObjectURL(p.imageUrl); } catch {}
      });
      clearPdfViewLiveDoc();
      setPdfViewPages([]);
      setPdfViewIndex(0);
      setPdfViewTitle("");
      setPdfViewDocId(null);
    }
    refreshPdfViewDocs();
  };

  const closePdfView = () => {
    pdfViewPages.forEach((p) => {
      try { URL.revokeObjectURL(p.imageUrl); } catch {}
    });
    clearPdfViewLiveDoc();
    setPdfViewPages([]);
    setPdfViewIndex(0);
    setPdfViewTitle("");
    setPdfViewDocId(null);
    setPdfViewError("");
    // توجه: بستنِ نمایش، سندِ ذخیره‌شده رو پاک نمی‌کنه — هنوز تو لیستِ
    // «PDFهای ذخیره‌شده» پایینِ همین بخش هست و بعداً بدونِ آپلودِ دوباره
    // قابلِ بازکردنه.
  };

  // متنِ پیست‌شده (بدون PDF، بدون AI) رو دقیقاً با همون منطقِ بالا
  // (تقسیم به جمله → گروه‌بندیِ هر ۵ جمله در یک پاراگراف) وارد سیستمِ
  // خوانش می‌کنه — رایگان و آنیه چون هیچ درخواستی به AI زده نمی‌شه.
  // این کادر برخلافِ خوندنِ PDF (که به‌خاطرِ سنگینیِ سرویسِ رایگانِ ترجمه
  // برای موبایل سقفِ PDF_READ_MAX_SENTENCES رو داره) هیچ محدودیتی روی
  // طولِ متن نمی‌ذاره — کاربر هر چقدر متن که می‌خواد رو کامل پیست می‌کنه.
  // زبونِ متن هم دیگه از روی storyLangِ قبلی (که ممکنه هیچ ربطی به این
  // متنِ تازه نداشته باشه) گرفته نمی‌شه؛ خودکار از رویِ خودِ متن حدس زده
  // می‌شه تا هم جهتِ نمایش (چپ‌به‌راست/راست‌به‌چپ) درست باشه، هم موقعِ
  // خوانش صدای محلیِ گوشی برای همون زبون پیدا بشه (به‌جای افتادن به
  // مسیرِ آنلاینِ کندتر چون داشت دنبالِ صدای زبونِ اشتباه می‌گشت).
  const handlePastedTextForReading = () => {
    setPdfReadError("");
    const raw = pastedReadingText.trim();
    if (!raw) return;
    const allSentences = splitTextIntoSentenceStrings(raw);
    if (!allSentences.length) {
      setPdfReadError("متنی برای خوندن پیدا نشد");
      return;
    }
    const detectedLang = detectPastedTextLanguage(raw);
    if (detectedLang) setStoryLang(detectedLang);
    // همون تشخیصِ خودکارِ سطح، برای مسیرِ پیستِ مستقیمِ متن.
    setStoryLevel(detectTextCEFRLevel(raw));
    const storyParagraphs = [];
    for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
      const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
      storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
    }
    setParagraphs(storyParagraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setCurrentStoryId(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setError("");
    setRepeatNotice("");
    setPastedReadingText("");
    setShowPasteReading(false);
  };

  // استخراجِ «متنِ اصلیِ» یه صفحه‌ی وب از رویِ HTMLِ خامش — یعنی بدنه‌ی
  // نوشته (مقاله/پست)، نه منو/هدر/فوتر/سایدبار/تبلیغ/اسکریپت. اول دنبالِ
  // تگ‌های معناداری مثلِ <article> یا <main> می‌گردیم (رایج‌ترین الگو تو
  // سایت‌های خبری/وبلاگ‌ها)؛ اگه نبود، بینِ همه‌یِ بلاک‌های باقی‌مونده
  // (بعدِ حذفِ nav/header/footer/aside/script/style) اونی که بیشترین حجمِ
  // متن رو داره انتخاب می‌شه — یه heuristic ساده ولی برای اکثرِ صفحات کافیه.
  const extractMainBodyText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, nav, header, footer, aside, svg, form, iframe").forEach((el) => el.remove());
    const direct = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role='main']");
    if (direct && direct.textContent.trim().length > 200) {
      return direct.textContent;
    }
    const candidates = doc.body ? Array.from(doc.body.querySelectorAll("div, section, article")) : [];
    let best = doc.body;
    let bestLen = 0;
    for (const el of candidates) {
      // بلاک‌هایی که خودشون یه بلاکِ بزرگ‌تر رو کامل تو خودشون دارن، حساب
      // نمی‌شن (وگرنه همیشه بالاترین والد برنده می‌شد) — فقط طولِ متنِ
      // مستقیمِ خودِ این تگ (بدونِ فرزندهای بلاکیِ تو در تو) مهمه.
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3 || ["P", "SPAN", "STRONG", "EM", "B", "I", "A"].includes(n.nodeName))
        .map((n) => n.textContent)
        .join(" ");
      if (ownText.length > bestLen) {
        bestLen = ownText.length;
        best = el;
      }
    }
    return (bestLen > 200 ? best : doc.body)?.textContent || "";
  };

  // «وارد کردنِ یه لینک برای خوانش» — دقیقاً همون مقصدِ نهایی‌ای که PDF/پیست
  // دارن (paragraphs همون سیستمِ خوانش)، فقط منبعِ متن یه صفحه‌ی وبه. چون
  // فچِ مستقیمِ یه دامنه‌ی دلخواه از خودِ مرورگر معمولاً با CORS بلاک می‌شه،
  // اول یه تلاشِ مستقیم می‌زنیم (برای سایت‌هایی که CORS باز دارن)؛ اگه شکست
  // خورد، از همون Workerِ بک‌اندِ AI به‌عنوانِ پراکسی استفاده می‌کنیم
  // (/api/fetch-url) — این مسیر باید جداگانه تو Worker اضافه بشه، وگرنه
  // پیامِ خطای روشن نشون داده می‌شه به‌جای هنگ‌کردنِ بی‌دلیل.
  const handleLinkImportForReading = async () => {
    setLinkReadError("");
    let raw = linkReadUrl.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    let normalizedUrl;
    try {
      normalizedUrl = new URL(raw).toString();
    } catch {
      setLinkReadError("این لینک معتبر نیست — لطفاً آدرسِ کامل صفحه رو وارد کن");
      return;
    }
    setLinkReadBusy(true);
    try {
      let html = "";
      try {
        const directRes = await fetch(normalizedUrl);
        if (directRes.ok) html = await directRes.text();
      } catch {
        // مستقیم شکست خورد (احتمالاً CORS) — می‌ریم سراغِ پراکسیِ بک‌اند
      }
      if (!html) {
        const base = (aiSettings?.backendUrl || "").trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
        const proxyRes = await fetch(`${base}/api/fetch-url?url=${encodeURIComponent(normalizedUrl)}`);
        if (!proxyRes.ok) {
          throw new Error(
            proxyRes.status === 404
              ? "fetch-url-not-configured"
              : `HTTP ${proxyRes.status}`
          );
        }
        html = await proxyRes.text();
      }
      const bodyText = extractMainBodyText(html).replace(/\s+/g, " ").trim();
      if (!bodyText) {
        setLinkReadError("متنی از این صفحه استخراج نشد — شاید محتوای این سایت با جاوااسکریپت ساخته می‌شه");
        return;
      }
      let allSentences = splitTextIntoSentenceStrings(bodyText);
      if (!allSentences.length) {
        setLinkReadError("متنی برای خوندن پیدا نشد");
        return;
      }
      let truncated = false;
      if (allSentences.length > PDF_READ_MAX_SENTENCES) {
        allSentences = allSentences.slice(0, PDF_READ_MAX_SENTENCES);
        truncated = true;
      }
      const detectedLang = detectPastedTextLanguage(bodyText);
      if (detectedLang) setStoryLang(detectedLang);
      // همون تشخیصِ خودکارِ سطح، برای مسیرِ واردکردنِ لینک.
      setStoryLevel(detectTextCEFRLevel(bodyText));
      const storyParagraphs = [];
      for (let i = 0; i < allSentences.length; i += PDF_READ_SENTENCES_PER_PARAGRAPH) {
        const chunk = allSentences.slice(i, i + PDF_READ_SENTENCES_PER_PARAGRAPH);
        storyParagraphs.push({ sentences: chunk.map((text) => ({ text })) });
      }
      setParagraphs(storyParagraphs);
      setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
      setCurrentStoryId(null);
      setQuestions([]);
      setAnswers({});
      setSubmitted(false);
      setError("");
      setRepeatNotice("");
      setLinkReadUrl("");
      setShowLinkReading(false);
      if (truncated) {
        setLinkReadError("توجه: چون متنِ صفحه زیاد بود، فقط بخشی از اون آماده‌ی خوانش شد");
      }
    } catch (err) {
      setLinkReadError(
        err?.message === "fetch-url-not-configured"
          ? "خوندنِ این لینک نیاز به یه تنظیمِ اضافه تو سرور داره — فعلاً از کپی/پیستِ متن استفاده کن"
          : "این لینک قابلِ خوندن نبود — یا سایت اجازه‌ی دسترسیِ مستقیم نمی‌ده، یا آدرس اشتباهه"
      );
    } finally {
      setLinkReadBusy(false);
    }
  };

  const saveCurrentStory = () => {
    if (!paragraphs.length) return;
    // اگه همین داستان (بدونِ تغییر) از قبل ذخیره شده (currentStoryId ست
    // شده)، دوباره یه کپیِ تکراری نساز — قبلاً هر بار کلیک، یه ورودیِ
    // جدید و تکراری به «داستان‌های ذخیره‌شده» اضافه می‌کرد.
    if (currentStoryId) return;
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
  };

  const openSavedStory = (entry) => {
    // 🆕 داستان‌های ذخیره‌شده‌ای که از «PDF رو با عکسِ اصلی + ترجمه همینجا
    // نشون بده» اومدن، فقط یه اشاره‌گر (pdfDocId) به سندِ واقعی‌شون تو
    // IndexedDBِ خودِ PDFها نگه می‌دارن (نه خودِ تصاویر/صفحات — که خیلی
    // سنگین‌تر از اونه که تو همون آرایه‌ی savedStories/localStorage جا بشه).
    // پس بازکردن‌شون باید از همون مسیرِ «بازکردنِ PDFِ ذخیره‌شده» رد بشه.
    if (entry.pdfDocId) {
      openSavedPdfViewDoc({ id: entry.pdfDocId, title: entry.title, pageCount: entry.pageCount, doneCount: entry.pageCount });
      return;
    }
    setStoryLang(entry.storyLang);
    setStoryLevel(entry.storyLevel);
    setStoryLength(entry.storyLength || "medium");
    setContentType(entry.contentType || "general");
    setSelectedWords(entry.selectedWords);
    setParagraphs(entry.paragraphs);
    setVisibleParagraphCount(PARAGRAPH_PAGE_SIZE);
    setQuestions(entry.questions || []);
    setAnswers({});
    setSubmitted(false);
    setShowSaved(false);
    setCurrentStoryId(entry.id);
  };

  const deleteSavedStory = (id) => {
    setSavedStories((prev) => {
      const entry = prev.find((s) => s.id === id);
      // اگه این کارت در واقع یه اشاره‌گر به یه PDFِ ذخیره‌شده بود، خودِ
      // سندِ PDF (صفحات/عکس‌ها) رو هم از IndexedDBِ مخصوصِ PDFها پاک کن —
      // وگرنه یه سندِ یتیم و بی‌استفاده اونجا برای همیشه می‌مونه.
      if (entry?.pdfDocId) {
        deletePdfViewDoc(entry.pdfDocId, entry.pageCount).then(refreshPdfViewDocs).catch(() => {});
      }
      return prev.filter((s) => s.id !== id);
    });
  };

  // 🆕 دکمه‌ی «ذخیره در داستان‌ها»یِ خودِ نمایشگرِ PDF — سندِ PDF از قبل با
  // بازشدنش خودکار تویِ IndexedDBِ خودش ذخیره شده (savePdfViewMeta/Page)،
  // این دکمه فقط یه کارتِ سبک (اشاره‌گر) براش تویِ همون لیستِ یکپارچه‌ی
  // «داستان‌های ذخیره‌شده» می‌سازه، دقیقاً مثلِ بقیه‌ی داستان‌ها — با آیکونِ
  // 📄 کنارش (شبیهِ همون 🎵ای که برای صوتِ آپلودی گذاشته شده).
  const savePdfToStories = () => {
    // 🩹 اگه ذخیره‌سازیِ واقعیِ صفحات تو IndexedDB شکست خورده باشه، دیگه
    // کارتِ اشاره‌گر نساز — چون بعداً بازکردنش هیچی نشون نمی‌ده (دقیقاً
    // همون باگی که قبلاً باعث می‌شد کارت باشه ولی خالی باز بشه).
    if (!pdfViewDocId || !pdfViewPersisted) return;
    setSavedStories((prev) => {
      if (prev.some((s) => s.pdfDocId === pdfViewDocId)) return prev; // قبلاً ذخیره شده
      const entry = {
        id: Date.now(),
        pdfDocId: pdfViewDocId,
        title: pdfViewTitle,
        pageCount: pdfViewPages.length,
        savedAt: new Date().toISOString(),
      };
      return [entry, ...prev];
    });
  };

  const submitQuiz = () => {
    setSubmitted(true);
    setWordStats((prev) => {
      const next = { ...prev };
      questions.forEach((q, i) => {
        if (!q.word) return;
        const key = `${storyLang}:${q.word.toLowerCase()}`;
        const cur = next[key] || { lang: storyLang, word: q.word, missed: 0, correct: 0 };
        const isRight = answers[i] === q.answerIndex;
        next[key] = {
          lang: storyLang,
          word: q.word,
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
        <p style={{ fontWeight: 700, fontSize: 16, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("tabStory", uiLang)}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowSaved((s) => {
                const next = !s;
                // هر بار که پنل باز می‌شه، لیستِ PDFها رو دوباره از
                // IndexedDB بخون — قبلاً فقط یک‌بار موقعِ mount خونده
                // می‌شد، پس اگه اون خواندنِ اول به هر دلیلی (مثلاً هنوز
                // چیزی ذخیره نشده بود) خالی برمی‌گشت، دیگه هیچ‌وقت
                // خودش رو تازه نمی‌کرد؛ حالا هر بازکردنِ پنل یه فرصتِ
                // تازه برای دیدنِ آخرین وضعیتِ واقعیِ حافظه‌ست.
                if (next) refreshPdfViewDocs();
                return next;
              });
            }}
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
      </div>

      <SrtTranslatorTool nativeLang={nativeLang} targetOrder={targetOrder} aiSettings={aiSettings} uiLang={uiLang} />

      {showSaved ? (
        <div className="flex flex-col gap-3">
          {/* PDFهایی که با «PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده»
              ذخیره شدن، این‌جا بالای لیستِ داستان‌ها نشون داده می‌شن — نه
              پایینِ صفحه‌ی اصلیِ داستان‌ساز. */}
          {pdfViewDocs.length > 0 && (
            <div style={{ textAlign: "start" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>PDFهای ذخیره‌شده</span>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                {pdfViewDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                    style={{
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 12,
                      opacity: pdfViewBusy ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => openSavedPdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.ink, fontWeight: 700, textAlign: "start", flex: 1, minWidth: 0 }}
                    >
                      {doc.title}
                      <span style={{ color: colors.inkSoft, fontWeight: 400 }}>
                        {" "}
                        — {doc.doneCount === doc.pageCount ? `${doc.pageCount} صفحه` : `${doc.doneCount} از ${doc.pageCount} صفحه`}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeletePdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.rose, fontSize: 11, textDecoration: "underline", marginInlineStart: 8 }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* جستجو در داستان‌های ذخیره‌شده — روی متنِ خودِ داستان، لغاتِ
              انتخاب‌شده، و عنوانِ PDF چک می‌شه؛ کاملاً مستقل از زبانِ
              داستان (فارسی/انگلیسی/هرچی) — همه‌شون یکسان جستجو می‌شن. */}
          {savedStories.length > 1 && (
            <div
              className="flex items-center gap-2 px-3"
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
            >
              <Search size={15} color={colors.inkSoft} />
              <input
                value={savedStoriesSearch}
                onChange={(e) => setSavedStoriesSearch(e.target.value)}
                placeholder="جستجو در داستان‌های ذخیره‌شده..."
                dir="auto"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
              />
              {savedStoriesSearch && (
                <button onClick={() => setSavedStoriesSearch("")} aria-label="پاک کردن جستجو" style={{ display: "flex" }}>
                  <X size={15} color={colors.inkSoft} />
                </button>
              )}
            </div>
          )}
          {/* سطح‌ها همیشه توی ردیفِ خودشون، تمام‌عرض و بدون تنگ‌شدن نشون
              داده می‌شن؛ مرتب‌سازی یه ردیفِ جدا زیرشه — قبلاً کنارِ هم
              بودن و دکمه‌ی مرتب‌سازی جای سطح‌ها رو تنگ می‌کرد. */}
          <LevelFilterRow levelFilter={savedStoriesLevelFilter} setLevelFilter={setSavedStoriesLevelFilter} uiLang={uiLang} />
          {savedStories.length > 1 && (
            <div className="flex justify-start">
              <SavedStoriesSortMenu sortKey={savedStoriesSort} setSortKey={setSavedStoriesSort} uiLang={uiLang} />
            </div>
          )}
          {savedStories.length === 0 && (
            <p style={{ fontSize: 13, color: colors.inkSoft }}>هنوز داستانی ذخیره نکردی.</p>
          )}
          {savedStories.length > 0 && (() => {
            // جستجو، مستقلِ از زبانِ داستان — یه include سادهٔ رشته‌ست، پس
            // فارسی/انگلیسی/عربی/هر اسکریپتِ دیگه‌ای رو یکسان پیدا می‌کنه.
            const q = savedStoriesSearch.trim().toLowerCase();
            const searched = q
              ? savedStories.filter((s) => {
                  const haystack = [
                    s.pdfDocId ? s.title : getStoryEntryFullText(s),
                    (s.selectedWords || []).join(" "),
                  ]
                    .join(" ")
                    .toLowerCase();
                  return haystack.includes(q);
                })
              : savedStories;
            if (q && searched.length === 0) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>چیزی با این جستجو پیدا نشد.</p>
              );
            }
            // هر داستان از قبل با سطحِ خودش (storyLevel) ذخیره شده. وقتی فیلترِ
            // خاصی (مثلاً B1) انتخاب شده فقط داستان‌های همون سطح نشون داده
            // می‌شن. وقتی «همه سطح‌ها»ست، دیگه بر اساسِ سطح دسته‌بندی/تفکیک
            // نمی‌کنیم — همه‌ی داستان‌ها با هم قاطی، فقط بر اساسِ sortKey
            // (مثلاً تاریخ) مرتب می‌شن؛ سطحِ هر داستان همون‌طور که قبلاً بود
            // (خط اول کارت) نمایش داده می‌شه.
            const groups = (
              savedStoriesLevelFilter !== "all"
                ? [[savedStoriesLevelFilter, searched.filter((s) => s.storyLevel === savedStoriesLevelFilter)]]
                : [["all", searched]]
            ).map(([lv, list]) => [lv, sortSavedStories(list, savedStoriesSort)]);
            if (!groups.length || groups.every(([, list]) => list.length === 0)) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>
                  داستانی با سطح {savedStoriesLevelFilter} ذخیره نشده.
                </p>
              );
            }
            const totalCount = groups.reduce((sum, [, list]) => sum + list.length, 0);
            const defaultTo = Math.min(totalCount, WORDS_PAGE_SIZE) || totalCount || 1;
            const parsedFrom = parseInt(savedStoryRangeInput.from, 10);
            const parsedTo = parseInt(savedStoryRangeInput.to, 10);
            const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
            const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
            const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(totalCount, 1));
            const clampedTo = Math.min(Math.max(clampedFrom, effTo), totalCount || clampedFrom);
            let seen = 0;
            const rangedGroups = groups.map(([lv, list]) => {
              const groupStart = seen;
              seen += list.length;
              const from = Math.max(clampedFrom - 1 - groupStart, 0);
              const to = Math.max(clampedTo - groupStart, 0);
              return [lv, list.slice(from, to)];
            });
            const visibleTotal = rangedGroups.reduce((sum, [, list]) => sum + list.length, 0);
            const readCountInRange = rangedGroups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const readCountTotal = groups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const allInRangeFlat = rangedGroups.flatMap(([, list]) => list);
            return (
              <>
                <RangeSliderFilter
                  min={1}
                  max={totalCount}
                  from={clampedFrom}
                  to={clampedTo}
                  onFromChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, from: val }))}
                  onToChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, to: val }))}
                  readCount={readCountInRange}
                  totalInRange={visibleTotal}
                  readCountTotal={readCountTotal}
                  label="داستان‌ها"
                  uiLang="fa"
                  colors={colors}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, true)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    علامت‌گذاری همه به خوانده‌شده
                  </button>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, false)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    پاک‌کردن علامت این بازه
                  </button>
                </div>
                {rangedGroups.map(([lv, list]) => (
              <div key={lv} className="flex flex-col gap-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      position: "relative",
                      background: savedStoryReadIds.has(s.id) ? READ_DONE_GRADIENT : "white",
                      border: `1px solid ${savedStoryReadIds.has(s.id) ? READ_DONE_BORDER : colors.cardBorder}`,
                      borderRadius: 14,
                      padding: 14,
                      paddingTop: s.savedAt ? 26 : 14,
                      boxShadow: savedStoryReadIds.has(s.id) ? READ_DONE_SHADOW : "none",
                    }}
                  >
                    {s.savedAt && (
                      <p
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 10,
                          margin: 0,
                          fontSize: 10.5,
                          color: colors.inkSoft,
                          whiteSpace: "nowrap",
                          // چون این برچسب داخلِ صفحه‌ی RTL می‌شینه، بدونِ این‌جهت‌دهیِ
                          // صریح، الگوریتمِ Bidi ممکنه ترتیبِ تاریخ/ساعت رو برعکس
                          // نشون بده. با direction: ltr همیشه از چپ به راست —
                          // اول تاریخ، بعد ساعت — دقیقاً به همون ترتیبی که
                          // formatSavedDate می‌سازه، نمایش داده می‌شه.
                          direction: "ltr",
                          unicodeBidi: "isolate",
                          textAlign: "left",
                        }}
                      >
                        📅 {formatSavedDate(s.savedAt, calendarSystem)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {/* دایره‌ی خوانده‌شده کنارِ عنوان، همیشه اولین عضوِ ردیف —
                          تا در چیدمانِ راست‌به‌چپ دقیقاً سمتِ راستِ کارت بیفته،
                          یکسان با بقیه‌ی تب‌ها (قبلاً توی گروهِ دومِ دکمه‌ها
                          بود و سمتِ چپ در میومد). */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSavedStoryRead(s.id)}
                          aria-label="علامت‌زدن به‌عنوان خوانده‌شده"
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: savedStoryReadIds.has(s.id) ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                            background: savedStoryReadIds.has(s.id) ? READ_DONE_CHECK_GRADIENT : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {savedStoryReadIds.has(s.id) && <Check size={13} color="white" strokeWidth={3} />}
                        </button>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>
                            {savedStoriesAudioMap[s.id] && (
                              <span title="صوتِ آپلودی داره" style={{ marginLeft: 6 }}>🎵</span>
                            )}
                            {s.pdfDocId && (
                              <span title="فایلِ PDF" style={{ marginLeft: 6 }}>📄</span>
                            )}
                            {s.pdfDocId ? (
                              <>PDF{s.pageCount ? ` · ${s.pageCount} صفحه` : ""}</>
                            ) : (
                              <>
                                {LANGUAGES.find((l) => l.code === s.storyLang)?.label} · {s.storyLevel} ·{" "}
                                {CONTENT_TYPES.find((c) => c.key === s.contentType)?.label || "عمومی"} ·{" "}
                                {STORY_LENGTHS.find((l) => l.key === s.storyLength)?.label || "متوسط"}
                              </>
                            )}
                          </p>
                          {s.pdfDocId ? (
                            <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{s.title}</p>
                          ) : (
                            <>
                              {getStoryEntryPreview(s) && (
                                <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{getStoryEntryPreview(s)}</p>
                              )}
                              <p style={{ fontSize: 12, color: colors.inkSoft }}>{s.selectedWords.join("، ")}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                ))}
              </>
            );
          })()}
        </div>
      ) : (
        <>
      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <p style={{ fontWeight: 700, marginBottom: 10, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLangLevelSection", uiLang)}</p>
        {storyLangOptions.length > 1 ? (
          <>
            <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
              {uiLang === "en"
                ? "Story language (from the target languages picked above)"
                : "زبان داستان (از بین زبان‌های مقصدی که بالای صفحه انتخاب کردی)"}
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
                  {uiLang === "en" ? englishLangName(code) : LANGUAGES.find((l) => l.code === code)?.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 10 }}>
            {uiLang === "en"
              ? `Story language: ${englishLangName(storyLang)} (based on the target language picked above)`
              : `زبان داستان: ${storyLangLabel} (طبق زبان مقصدی که بالای صفحه انتخاب کردی)`}
          </p>
        )}
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "0 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLevelLabel", uiLang)}</p>
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
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyContentTypeLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.key}
              onClick={() => setContentType(c.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${contentType === c.key ? colors.rose : colors.cardBorder}`,
                backgroundColor: contentType === c.key ? colors.rose : "white",
                color: contentType === c.key ? "white" : colors.ink,
              }}
            >
              {uiLang === "en" ? c.labelEn : c.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: colors.inkSoft, margin: "10px 0 6px", fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyLengthLabel", uiLang)}</p>
        <div className="flex flex-wrap gap-2 mb-1">
          {STORY_LENGTHS.map((l) => (
            <button
              key={l.key}
              onClick={() => setStoryLength(l.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: uiLang === "en" ? fontLatin : fontFa,
                border: `1px solid ${storyLength === l.key ? colors.gold : colors.cardBorder}`,
                backgroundColor: storyLength === l.key ? colors.gold : "white",
                color: storyLength === l.key ? "white" : colors.ink,
              }}
            >
              {uiLang === "en" ? l.labelEn : l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span style={{ fontSize: 13, color: colors.inkSoft, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyRepeatCountLabel", uiLang)}</span>
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


        <input
          value={vocabQuery}
          onChange={(e) => setVocabQuery(e.target.value)}
          onPaste={handleVocabPaste}
          placeholder="یا از لغات، مکالمات روزمره، لغات و اخبار، اسلنگ، لغات ذخیره‌شده جستجو کن..."
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
          <div style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            <div className="flex flex-wrap gap-2">
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
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setSelectedWords([])}
                style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}
              >
                پاک کردن همه
              </button>
            </div>
          </div>
        )}
      </div>

      {translationLangOptions.length > 0 && (
        <div className="mb-3" style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 12, backgroundColor: colors.paper }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 12, color: colors.inkSoft }}>
              داستان همزمان به چه زبان‌هایی ترجمه بشه؟ (می‌تونی چند تا انتخاب کنی — برای جابه‌جاییِ ترتیب، نگه‌دار و بکش)
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
          <DraggableToggleLangGrid
            order={translationLangOptions}
            onReorder={(next) => {
              if (typeof setLangPickerOrder === "function") {
                setLangPickerOrder((prev) => syncLangPickerFromTargetOrder(prev, next));
              }
            }}
            languages={LANGUAGES}
            selected={translationLangs}
            onToggle={toggleTranslationLang}
          />
        </div>
      )}

      <button
        onClick={() => generateStory()}
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

      <div style={{ textAlign: "center" }}>
        <input
          ref={pdfReadInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfImportForReading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfReadInputRef.current?.click()}
          disabled={pdfReadBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfReadBusy ? 0.6 : 1,
          }}
        >
          {pdfReadBusy ? <Loader2 size={16} className="spin" /> : <span>📖</span>}
          {pdfReadBusy ? (pdfReadProgress || "در حال خوندنِ PDF...") : "به‌جاش یه PDF برای خوانش وارد کن"}
        </button>
        {pdfReadError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfReadError}</p>
        )}

        <input
          ref={pdfViewInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfViewImport}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfViewInputRef.current?.click()}
          disabled={pdfViewBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.teal}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfViewBusy ? 0.6 : 1,
            marginTop: 10,
          }}
        >
          {pdfViewBusy ? <Loader2 size={16} className="spin" /> : <span>📑</span>}
          {pdfViewBusy ? (pdfViewProgress || "در حال بارگذاریِ PDF...") : "PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده"}
        </button>
        {pdfViewError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfViewError}</p>
        )}

        {/* لیستِ PDFهای ذخیره‌شده از این‌جا برداشته شد — حالا داخلِ پنلِ
            «داستان‌های ذخیره‌شده» (بالا، گوشه‌ی سمت چپ) نشون داده می‌شه،
            نه اینجا وسطِ صفحه‌ی اصلیِ داستان‌ساز. */}

        {pdfViewPages.length > 0 && (
          <div style={{ marginTop: 12, textAlign: "start" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>
                {pdfViewTitle} — صفحه‌ی {pdfViewIndex + 1} از {pdfViewPages.length}
                {pdfViewBusy && pdfViewDocId && (
                  <span style={{ color: colors.inkSoft, fontWeight: 400 }}> (بقیه‌ی صفحات در حالِ پردازش...)</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={savePdfToStories}
                  disabled={!pdfViewDocId || !pdfViewPersisted || savedStories.some((s) => s.pdfDocId === pdfViewDocId)}
                  title={!pdfViewPersisted ? "چون ذخیره‌سازیِ محلی ناموفق بود، این PDF قابلِ اضافه‌کردن به لیست نیست" : undefined}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? colors.inkSoft : colors.gold,
                    textDecoration: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? "none" : "underline",
                    opacity: !pdfViewDocId || !pdfViewPersisted ? 0.5 : 1,
                  }}
                >
                  {savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                    ? "ذخیره شد ✓"
                    : !pdfViewPersisted
                    ? "قابلِ ذخیره نیست"
                    : "ذخیره در داستان‌ها"}
                </button>
                <button onClick={closePdfView} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                  بستن
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3" style={{ alignItems: "flex-start" }}>
              <div
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  overflow: "hidden",
                  borderRadius: 10,
                  border: `1px solid ${colors.cardBorder}`,
                  touchAction: pdfImgZoom > 1 ? "none" : "pan-y",
                }}
                onTouchStart={handlePdfImgTouchStart}
                onTouchMove={handlePdfImgTouchMove}
                onTouchEnd={handlePdfImgTouchEnd}
                onDoubleClick={handlePdfImgDoubleClick}
              >
                {(pdfViewLiveDoc?.docId === pdfViewDocId && pdfViewLiveDoc?.doc) || pdfViewPages[pdfViewIndex]?.imageUrl ? (
                  <div
                    style={{
                      transform: `scale(${pdfImgZoom}) translate(${pdfImgPan.x / pdfImgZoom}px, ${pdfImgPan.y / pdfImgZoom}px)`,
                      transformOrigin: "center center",
                      transition: pdfImgGestureRef.current.mode ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <PdfLivePageView
                      pdfDoc={pdfViewLiveDoc?.docId === pdfViewDocId ? pdfViewLiveDoc.doc : null}
                      pdfjsLib={pdfjsLibRef.current}
                      pageNum={pdfViewIndex + 1}
                      fallbackImageUrl={pdfViewPages[pdfViewIndex]?.imageUrl}
                      onError={() =>
                        setPdfViewError("رندرِ زنده‌ی این صفحه مشکل داشت — ممکنه فایل خراب یا رمزگذاری‌شده باشه")
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div
                dir="auto"
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  backgroundColor: colors.goldSoft,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: pdfTranslationFontSize,
                  fontWeight: pdfTranslationShouldBold ? 700 : 400,
                  lineHeight: 1.9,
                  color: colors.ink,
                  maxHeight: 480,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {pdfViewPages[pdfViewIndex]?.translatedText}
              </div>
            </div>

            {pdfViewPages[pdfViewIndex]?.originalText && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowPdfOriginalWords((v) => !v)}
                  style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}
                >
                  {showPdfOriginalWords ? "بستنِ متنِ اصلی" : "نمایشِ متنِ اصلی (کلیک‌پذیر)"}
                </button>
                {showPdfOriginalWords && (
                  <div
                    dir={dirFor(storyLang)}
                    style={{
                      marginTop: 8,
                      backgroundColor: colors.paper,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      lineHeight: 2.1,
                      maxHeight: 300,
                      overflowY: "auto",
                      // متنِ خودِ PDF همیشه باید با جهتِ زبانِ داستان (storyLang)
                      // نوشته بشه، نه dir="auto" — چون dir="auto" جهتِ کلِ این
                      // div رو از رویِ اولین کاراکترِ قوی‌اش تشخیص می‌داد؛ چون
                      // اون کاراکتر معمولاً فارسیِ توضیحِ بالای همین باکس بود
                      // (نه خودِ متنِ انگلیسی)، کل پاراگراف RTL می‌شد و کلمات
                      // انگلیسی به‌هم‌ریخته/برعکس نشون داده می‌شدن.
                      textAlign: dirFor(storyLang) === "rtl" ? "right" : "left",
                    }}
                  >
                    <p
                      dir={dirFor(nativeLang)}
                      style={{
                        fontSize: 10,
                        color: colors.inkSoft,
                        marginBottom: 6,
                        textAlign: dirFor(nativeLang) === "rtl" ? "right" : "left",
                      }}
                    >
                      روی هر کلمه بزن تا ترجمه‌اش رو ببینی؛ از همون‌جا می‌تونی به داستانِ بعدی، یادگیریِ گرامر یا جعبه‌ی لایتنر هم اضافه‌اش کنی.
                    </p>
                    <ClickableSentence
                      text={pdfViewPages[pdfViewIndex].originalText}
                      langCode={storyLang}
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      aiSettings={aiSettings}
                      color={colors.ink}
                      fontFamily={fontLatin}
                      fontSize={13}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
              <button
                onClick={() => setPdfViewIndex((i) => Math.max(0, i - 1))}
                disabled={pdfViewIndex === 0}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === 0 ? 0.4 : 1 }}
              >
                ◀ صفحه‌ی قبل
              </button>
              <button
                onClick={() => setPdfViewIndex((i) => Math.min(pdfViewPages.length - 1, i + 1))}
                disabled={pdfViewIndex === pdfViewPages.length - 1}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === pdfViewPages.length - 1 ? 0.4 : 1 }}
              >
                صفحه‌ی بعد ▶
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "start" }}>
          <button
            onClick={() => setShowLinkReading((v) => !v)}
            className="flex items-center justify-center gap-2"
            style={{
              width: "100%",
              border: `1px dashed ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              color: colors.teal,
              marginTop: 8,
            }}
          >
            <span>🔗</span>
            {showLinkReading ? "بستنِ وارد کردنِ لینک" : "یا لینکِ یه صفحه رو وارد کن"}
          </button>
          {showLinkReading && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={linkReadUrl}
                onChange={(e) => setLinkReadUrl(e.target.value)}
                placeholder="https://example.com/article"
                dir="ltr"
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                  textAlign: "left",
                }}
              />
              <p style={{ fontSize: 10, color: colors.inkSoft, marginTop: 4 }}>
                فقط متنِ اصلیِ صفحه (بدنه‌ی نوشته) استخراج می‌شه — منو، هدر، فوتر و تبلیغ‌ها نادیده گرفته می‌شن.
              </p>
              <button
                onClick={handleLinkImportForReading}
                disabled={!linkReadUrl.trim() || linkReadBusy}
                className="flex items-center justify-center gap-2"
                style={{
                  marginTop: 6,
                  width: "100%",
                  backgroundColor: colors.teal,
                  color: "white",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: !linkReadUrl.trim() || linkReadBusy ? 0.5 : 1,
                }}
              >
                {linkReadBusy ? <Loader2 size={16} className="spin" /> : <span>🔗</span>}
                {linkReadBusy ? "در حال خوندنِ صفحه..." : "دریافتِ متن از لینک"}
              </button>
              {linkReadError && (
                <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{linkReadError}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPasteReading((v) => !v)}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            marginTop: 8,
          }}
        >
          <span>📋</span>
          {showPasteReading ? "بستنِ پیست متن" : "یا یه متن/داستان رو اینجا پیست کن"}
        </button>

        {showPasteReading && (
          <div style={{ marginTop: 8, textAlign: "start" }}>
            <textarea
              value={pastedReadingText}
              onChange={(e) => setPastedReadingText(e.target.value)}
              placeholder="متن یا داستانی که می‌خوای بخونی رو اینجا پیست کن..."
              dir="auto"
              rows={6}
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handlePastedTextForReading}
              disabled={!pastedReadingText.trim()}
              style={{
                marginTop: 6,
                width: "100%",
                backgroundColor: colors.teal,
                color: "white",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 700,
                opacity: !pastedReadingText.trim() ? 0.5 : 1,
              }}
            >
              📖 آماده‌ی خوانش کن
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: "#F8E8E8", border: `1px solid ${colors.rose}`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: fontFa, fontSize: 13, color: colors.rose, marginBottom: 8 }}>{error}</p>
          <button
            onClick={() => generateStory()}
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
                onClick={editingStoryText ? cancelEditingStoryText : startEditingStoryText}
                title={editingStoryText ? "انصراف از ویرایش" : "ویرایشِ متنِ داستان"}
                aria-label={editingStoryText ? "انصراف از ویرایش" : "ویرایشِ متنِ داستان"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: editingStoryText ? colors.rose : colors.teal,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {editingStoryText ? <X size={16} /> : <Pencil size={16} />}
              </button>
              <button
                onClick={saveCurrentStory}
                title={currentStoryId ? "ذخیره شد" : "ذخیره داستان"}
                aria-label={currentStoryId ? "ذخیره شد" : "ذخیره داستان"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: currentStoryId ? colors.teal : colors.gold,
                  background: "none",
                  border: "none",
                  cursor: currentStoryId ? "default" : "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {currentStoryId ? <Check size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {!editingStoryText && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="flex items-center gap-2"
                style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px" }}
              >
                <Search size={14} color={colors.inkSoft} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="جستجو داخلِ متنِ داستان — به هر زبانی"
                  dir="auto"
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13, background: "transparent", color: colors.ink }}
                />
                {!!storySearchQuery && (
                  <button
                    onClick={() => setStorySearchQuery("")}
                    aria-label="پاک‌کردنِ جستجو"
                    style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: colors.inkSoft, cursor: "pointer", flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {!!storySearchQuery.trim() && (
                <div style={{ marginTop: 6 }}>
                  {storySearchMatches.length === 0 ? (
                    <p style={{ fontSize: 12, color: colors.inkSoft }}>چیزی پیدا نشد.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p style={{ fontSize: 11, color: colors.inkSoft }}>{storySearchMatches.length} نتیجه:</p>
                      {storySearchMatches.map((m, idx) => (
                        <button
                          key={`${m.pi}-${m.si}-${idx}`}
                          type="button"
                          onClick={() => jumpToStorySearchMatch(m.pi, m.si)}
                          dir="auto"
                          style={{
                            textAlign: "start",
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: `1px solid ${colors.cardBorder}`,
                            backgroundColor: colors.paper,
                            color: colors.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {editingStoryText ? (
            <div style={{ marginBottom: 8, textAlign: "start" }}>
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
                متن رو ویرایش کن — برای جداکردنِ پاراگراف‌ها یه خط خالی بینشون بذار.
              </p>
              <textarea
                value={storyEditDraft}
                onChange={(e) => setStoryEditDraft(e.target.value)}
                dir="auto"
                rows={10}
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                <button
                  onClick={applyEditedStoryText}
                  disabled={!storyEditDraft.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: colors.teal,
                    color: "white",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: !storyEditDraft.trim() ? 0.5 : 1,
                  }}
                >
                  ثبتِ ویرایش
                </button>
                <button
                  onClick={cancelEditingStoryText}
                  style={{
                    flex: 1,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.inkSoft,
                    background: "white",
                  }}
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
          <>
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

          {fullStoryText && (
            <StoryUserAudioBar userAudio={userAudio} />
          )}

          <div className="flex flex-col gap-5">
            {paragraphs.slice(0, visibleParagraphCount).map((p, pi) => {
              const paragraphText = (p.sentences || []).map((s) => s?.text || "").join(" ");
              const showTranslations = granularity !== "none" && translationLangs.length > 0;
              return (
                <div key={pi} style={{ borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 }}>
                  {granularity === "sentence" ? (
                    <div className="flex flex-col gap-3">
                      {(p.sentences || []).map((s, si) => {
                        // فعال بودنِ این جمله — یا چون همین الان با «پخشِ کل
                        // داستان» داره خونده می‌شه، یا چون تازه از یه
                        // لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش شده (هایلایتِ
                        // موقتِ ۲.۴ ثانیه‌ای).
                        const isSentenceActive =
                          (highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi && userAudio.activeSentence.si === si)
                            : (activeStorySentence && activeStorySentence.pi === pi && activeStorySentence.si === si));
                        return (
                        <div
                          key={si}
                          ref={(el) => (sentenceElsRef.current[`${pi}-${si}`] = el)}
                          style={{ position: "relative", paddingInlineStart: 10 }}
                        >
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={s.text}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
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
                              {/* هایلایتِ «جمله به جمله» — دقیقاً همون جلوه‌ی
                                  دموی مرجع: یه هایلایتِ کِشیده و تنگ دورِ خودِ
                                  متن (نه یه باکسِ تمام‌عرض)، با
                                  box-decoration-break: clone که اگه جمله چند
                                  خط بشه، هر خط هایلایتِ گردشده‌ی خودش رو
                                  می‌گیره — مو‌به‌مو مثلِ تصویرِ مرجع. */}
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isSentenceActive),
                                  borderRadius: 5,
                                  padding: isSentenceActive ? "2px 4px" : "2px 0",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.35s ease",
                                }}
                              >
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
                              </span>
                            </p>
                          </div>
                          {showTranslations &&
                            orderedTranslationLangs.map((code) => {
                              const translated = s.t?.[code];
                              // فعال بودنِ همین جمله‌ی ترجمه — یعنی همین الان
                              // دقیقاً همین زبان/جمله در حالِ پخشِ «کلِ ترجمه»ست؛
                              // دقیقاً مثلِ isSentenceActی متنِ اصلی بالا.
                              const isTranslationSentenceActive =
                                activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi && activeTranslation.si === si;
                              const fullTranslated = fullTranslatedTextByLang[code];
                              const translatedStartOffset = translatedSentenceOffsetMapByLang[code]?.[`${pi}-${si}`]?.start ?? 0;
                              return (
                                <div
                                  key={code}
                                  className="flex items-start gap-2"
                                  dir={dirFor(code)}
                                  style={{
                                    marginTop: 3,
                                  }}
                                >
                                  {translated && (
                                    <SpeakButton
                                      text={translated}
                                      code={code}
                                      color={translationColor}
                                      edge={dirFor(code) === "ltr" ? "end" : undefined}
                                      fullText={fullTranslated || translated}
                                      startOffset={translatedStartOffset}
                                    />
                                  )}
                                  <p
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      fontSize: 13.5,
                                      color: translationColor,
                                      fontWeight: 900,
                                      textAlign: "justify",
                                      fontFamily: code === "fa" ? fontFa : fontLatin,
                                    }}
                                  >
                                    <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                    {translated ? (
                                      <span
                                        style={{
                                          backgroundColor: highlightBg(highlightColor, isTranslationSentenceActive),
                                          borderRadius: 5,
                                          padding: isTranslationSentenceActive ? "2px 4px" : "2px 0",
                                          WebkitBoxDecorationBreak: "clone",
                                          boxDecorationBreak: "clone",
                                          transition: "background-color 0.35s ease",
                                        }}
                                      >
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
                                          storyBaseOffset={translatedStartOffset}
                                          originExtra={{ storyId: currentStoryId, pi, si }}
                                        />
                                      </span>
                                    ) : (
                                      <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                                    )}
                                  </p>
                                  {/* دکمه‌ی رفرش همیشه نشون داده می‌شه — حتی وقتی `translated`
                                      خالیه (یعنی ترجمه‌ی خودکار اصلاً شکست خورده و برای همیشه
                                      روی «در حال ترجمه...» گیر کرده)، چون قبلاً این دکمه فقط
                                      وقتی translated پر بود رندر می‌شد و کاربر هیچ راهی برای
                                      retry کردنِ جمله‌ای که ترجمه‌ش اصلاً نگرفته بود نداشت. */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      retranslateStorySentence(pi, si, code, s.text);
                                    }}
                                    disabled={!!retranslatingSentences[`${pi}-${si}-${code}`]}
                                    title={translated ? "اگه این ترجمه اشتباهه، دوباره امتحان کن" : "ترجمه نشده — برای امتحانِ دوباره بزن"}
                                    aria-label="ترجمه‌ی دوباره"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 4,
                                      flexShrink: 0,
                                      cursor: retranslatingSentences[`${pi}-${si}-${code}`] ? "default" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {retranslatingSentences[`${pi}-${si}-${code}`] ? (
                                      <Loader2 size={12} className="spin" color={translationColor} />
                                    ) : (
                                      <RotateCcw size={12} color={translationColor} style={{ opacity: translated ? 0.6 : 1 }} />
                                    )}
                                  </button>
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
                      style={{ position: "relative", paddingInlineStart: 10 }}
                    >
                      {(() => {
                        const isParaActive =
                          (highlightSentence && highlightSentence.pi === pi) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi)
                            : (activeStorySentence && activeStorySentence.pi === pi));
                        return (
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={paragraphText}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={paragraphBaseOffsetMap[pi] ?? 0}
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isParaActive),
                                  borderRadius: 5,
                                  padding: isParaActive ? "2px 4px" : "2px 0",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.35s ease",
                                }}
                              >
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
                              </span>
                            </p>
                          </div>
                        );
                      })()}
                      {showTranslations &&
                        orderedTranslationLangs.map((code) => {
                          const sentencesList = p.sentences || [];
                          const translated = sentencesList.length && sentencesList.every((s) => s?.t?.[code])
                            ? sentencesList.map((s) => s.t[code]).join(" ")
                            : null;
                          // فعال بودنِ این پاراگرافِ ترجمه — یعنی همین الان
                          // دقیقاً همین زبان/پاراگراف در حالِ پخشِ «کلِ ترجمه»ست.
                          const isTranslationParaActive =
                            activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi;
                          const fullTranslated = fullTranslatedTextByLang[code];
                          const translatedStartOffset = translatedParagraphBaseOffsetMapByLang[code]?.[pi] ?? 0;
                          return (
                            <div
                              key={code}
                              className="flex items-start gap-2"
                              dir={dirFor(code)}
                              style={{ marginTop: 4 }}
                            >
                              {translated && (
                                <SpeakButton
                                  text={translated}
                                  code={code}
                                  color={translationColor}
                                  edge={dirFor(code) === "ltr" ? "end" : undefined}
                                  fullText={fullTranslated || translated}
                                  startOffset={translatedStartOffset}
                                />
                              )}
                              <p
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 13.5,
                                  color: translationColor,
                                  fontWeight: 900,
                                  textAlign: "justify",
                                  fontFamily: code === "fa" ? fontFa : fontLatin,
                                }}
                              >
                                <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                {translated ? (
                                  <span
                                    style={{
                                      backgroundColor: highlightBg(highlightColor, isTranslationParaActive),
                                      borderRadius: 5,
                                      padding: isTranslationParaActive ? "2px 4px" : "2px 0",
                                      WebkitBoxDecorationBreak: "clone",
                                      boxDecorationBreak: "clone",
                                      transition: "background-color 0.35s ease",
                                    }}
                                  >
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
                                      storyBaseOffset={translatedStartOffset}
                                      originExtra={{ storyId: currentStoryId, pi, si: null }}
                                    />
                                  </span>
                                ) : (
                                  <span style={{ color: colors.inkSoft, opacity: 0.7 }}>(در حال ترجمه...)</span>
                                )}
                              </p>
                              {translated && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    retranslateStoryParagraph(pi, code);
                                  }}
                                  disabled={!!retranslatingSentences[`${pi}-all-${code}`]}
                                  title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
                                  aria-label="ترجمه‌ی دوباره"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 4,
                                    flexShrink: 0,
                                    cursor: retranslatingSentences[`${pi}-all-${code}`] ? "default" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {retranslatingSentences[`${pi}-all-${code}`] ? (
                                    <Loader2 size={12} className="spin" color={translationColor} />
                                  ) : (
                                    <RotateCcw size={12} color={translationColor} style={{ opacity: 0.6 }} />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {visibleParagraphCount < paragraphs.length && (
            <button
              type="button"
              onClick={() => setVisibleParagraphCount((n) => n + PARAGRAPH_PAGE_SIZE)}
              className="flex items-center justify-center gap-2"
              style={{
                width: "100%",
                marginTop: 10,
                border: `1px dashed ${colors.cardBorder}`,
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: 13,
                color: colors.teal,
              }}
            >
              نمایش بیشتر ({paragraphs.length - visibleParagraphCount} پاراگرافِ دیگه)
            </button>
          )}

          <div className="flex flex-wrap gap-2 mt-4" style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            {selectedWords.map((w) => (
              <span key={w} style={{ fontSize: 11, color: colors.inkSoft, backgroundColor: colors.paper, borderRadius: 10, padding: "3px 8px" }}>
                {w}: {countOccurrences(fullStoryText, w)} بار
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
              یادداشتِ من دربارهٔ این داستان
            </p>
            <textarea
              value={storyNote}
              onChange={(e) => setStoryNote(e.target.value)}
              dir="auto"
              rows={5}
              placeholder="هرچی می‌خوای دربارهٔ این داستان یادداشت کن — بدونِ محدودیتِ تعدادِ کلمه…"
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                minHeight: 90,
              }}
            />
          </div>
          </>
          )}
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
function SavedWordsPanel({ onJumpToStory, onJumpToOrigin, nativeLang, nativeLabel, targetOrder, uiLang }) {
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
  // مرتب‌سازی — دقیقاً همون الگویِ داستان‌ساز، اینجا رویِ لغاتِ ذخیره‌شده
  // (نگاه کن به GenericSortMenu/SAVED_WORDS_SORT_OPTIONS بالای فایل).
  const [sortKey, setSortKey] = useState("newest");

  // نگه‌داشتنِ طولانی (لانگ‌پرس) روی هر کارت → کاربر رو به همون تبی می‌بره
  // که اون لغت/عبارت اونجا ذخیره شده بود (origin.tab — نگاه کن به
  // toggleSavedStoryWord/ensureSavedStoryWord). یه ref مشترکِ بینِ همه‌ی
  // کارت‌ها کافیه چون همیشه فقط یک لمس/کلیک در آنِ واحد فعاله.
  const pressStateRef = useRef({ key: null, timer: null, moved: false, startX: 0, startY: 0, fired: false });

  // توجه: touchend/mouseup فقط تایمر/موقعیت رو پاک می‌کنه، نه fired رو —
  // چون fired باید تا لحظه‌ی رسیدنِ رویدادِ click (که درست بعد از
  // touchend شلیک می‌شه) زنده بمونه تا handleCardClickCapture بتونه
  // جلوش رو بگیره (دقیقاً همون الگویی که برای پلیرِ پایینِ صفحه هست).
  const clearPress = () => {
    if (pressStateRef.current.timer) clearTimeout(pressStateRef.current.timer);
    pressStateRef.current = { ...pressStateRef.current, key: null, timer: null, moved: false, startX: 0, startY: 0 };
  };

  const jumpToOrigin = (entry) => {
    if (!onJumpToOrigin) return;
    const ok = onJumpToOrigin(entry);
    setActionMsg(
      ok
        ? trf("jumpedToOriginMsg", uiLang, { word: entry.word })
        : tr("jumpToOriginUnknownMsg", uiLang)
    );
  };

  const beginPress = (key, clientX, clientY, entry, target) => {
    // فقط اگه لمس/کلیک روی دکمه‌ی پخشِ صدا یا دکمه‌ی حذف (که با
    // data-jump-exclude مشخص شدن) شروع شده باشه، لانگ‌پرس غیرفعال می‌مونه —
    // خودِ دکمه‌ی لغت دیگه مستثنا نیست، چون دقیقاً همون‌جاست که کاربر
    // طبیعتاً انگشتش رو نگه می‌داره تا به منبعِ لغت بره.
    if (target && target.closest && target.closest("[data-jump-exclude]")) return;
    clearPress();
    pressStateRef.current = {
      key,
      startX: clientX,
      startY: clientY,
      moved: false,
      fired: false,
      timer: setTimeout(() => {
        if (pressStateRef.current.key === key && !pressStateRef.current.moved) {
          pressStateRef.current.fired = true;
          jumpToOrigin(entry);
        }
      }, 550),
    };
  };

  // بعد از یه لانگ‌پرسِ موفق (که به تبِ مبدأ پرید)، کلیکِ طبیعی‌ای که
  // مرورگر بلافاصله بعدِ touchend روی همون دکمه‌ی لغت شلیک می‌کنه رو خنثی
  // می‌کنیم — وگرنه همون لغت هم‌زمان «انتخاب» (برای داستان‌ساز) می‌شد.
  const handleCardClickCapture = (ev) => {
    if (pressStateRef.current.fired) {
      ev.preventDefault();
      ev.stopPropagation();
      pressStateRef.current.fired = false;
    }
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

  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده — دقیقاً همون الگویی که
  // WordList برای لغات/واژگان/اسلنگ/علاقه‌مندی‌ها داره، اینجا هم به‌ازای هر
  // زبان (چون لیستِ هر زبان جدا رندر می‌شه). چون خودِ کلمه بینِ زبون‌های
  // مختلف ممکنه تکراری باشه، id رو با کدِ زبان ترکیب می‌کنیم؛ همه‌ی زبون‌ها
  // زیرِ یه listId مشترک («savedWords») ذخیره می‌شن، چون یه انبارِ واحده،
  // نه چند تبِ جدا.
  const SAVED_WORDS_LIST_ID = "savedWords";
  const [readIds, setReadIds] = useState(() => loadReadWordIds(SAVED_WORDS_LIST_ID));
  const savedWordReadId = (code, word) => `${code}::${word}`;
  const toggleSavedWordRead = (code, word) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      const id = savedWordReadId(code, word);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(SAVED_WORDS_LIST_ID, next);
      return next;
    });
  };
  const markSavedRangeRead = (code, items, read) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((e) => {
        const id = savedWordReadId(code, e.word);
        if (read) next.add(id);
        else next.delete(id);
      });
      saveReadWordIds(SAVED_WORDS_LIST_ID, next);
      return next;
    });
  };
  // ورودی‌های بازه به‌ازای هر زبان جدا نگه داشته می‌شن (رشته، نه عدد — به
  // همون دلیلی که WordList توضیح داده: تایپ‌کردن نباید فوراً به بازه‌ی
  // پیش‌فرض برگرده).
  const [savedRangeInputs, setSavedRangeInputs] = useState({});
  const getSavedRange = (code, total) => {
    const cur = savedRangeInputs[code] || {};
    const defaultTo = Math.min(total, WORDS_PAGE_SIZE) || total || 1;
    const parsedFrom = parseInt(cur.from, 10);
    const parsedTo = parseInt(cur.to, 10);
    const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
    const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
    const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(total, 1));
    const clampedTo = Math.min(Math.max(clampedFrom, effTo), total || clampedFrom);
    return { fromInput: cur.from ?? "", toInput: cur.to ?? "", defaultTo, clampedFrom, clampedTo };
  };
  const setSavedRangeInput = (code, field, value) => {
    setSavedRangeInputs((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
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
  // مرتب‌سازیِ هر گروهِ زبان جدا (نگاه کن به GenericSortMenu/sortKey بالا) —
  // چون هر زبان لیستِ مستقلِ خودش رو داره (کارتِ جدا، بازه‌ی نمایشِ جدا).
  Object.keys(byLang).forEach((code) => {
    byLang[code] = sortSavedWordEntries(byLang[code], sortKey);
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
    if (!window.confirm(trf("confirmDeleteSelectedWords", uiLang, { n: totalPicked }))) return;
    Object.entries(picked).forEach(([code, set]) => {
      (set || new Set()).forEach((word) => removeSavedStoryWord(word, code));
    });
    setPicked({});
    setActionMsg(trf("wordsDeletedMsg", uiLang, { n: totalPicked }));
  };

  const clearAll = () => {
    if (!filteredWords.length) return;
    const msg = normalizedQuery
      ? trf("confirmClearFiltered", uiLang, { n: filteredWords.length })
      : trf("confirmClearAllSaved", uiLang, { n: filteredWords.length });
    if (!window.confirm(msg)) return;
    filteredWords.forEach((e) => removeSavedStoryWord(e.word, e.langCode));
    setPicked({});
    setActionMsg(trf("wordsClearedMsg", uiLang, { n: filteredWords.length }));
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
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>{tr("savedWordsTitle", uiLang)}</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          {tr("savedWordsHint", uiLang)}
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
              placeholder={tr("searchSavedWords", uiLang)}
              dir="auto"
              style={{ flex: 1, fontFamily: uiLang === "en" ? fontLatin : fontFa, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={tr("clearSearchAria", uiLang)} style={{ display: "flex" }}>
                <X size={15} color={colors.inkSoft} />
              </button>
            )}
          </div>

          <div className="flex justify-start">
            <GenericSortMenu sortKey={sortKey} setSortKey={setSortKey} options={SAVED_WORDS_SORT_OPTIONS} uiLang={uiLang} />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={toggleSelectAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.ink, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <CheckSquare size={13} />
              {allVisibleSelected ? tr("deselectAll", uiLang) : tr("selectAll", uiLang)}
            </button>
            <button
              onClick={clearAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.rose, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <Trash2 size={13} />
              {tr("clearAllWords", uiLang)}
            </button>
            {totalPicked > 0 && (
              <button onClick={deleteSelected} className="flex items-center gap-1" style={{ ...toolbarButtonStyle, color: colors.rose }}>
                <X size={13} />
                {trf("deleteNSelected", uiLang, { n: totalPicked })}
              </button>
            )}
          </div>

          {actionMsg && (
            <p className="flex items-center gap-2" style={{ fontSize: 12, color: colors.teal }}>
              {actionMsg}
            </p>
          )}
        </div>
      )}

      {langCodes.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.inkSoft }}>
          {words.length === 0
            ? tr("noSavedWordsYet", uiLang)
            : tr("noSavedWordsForSearch", uiLang)}
        </p>
      ) : (
        langCodes.map((code) => {
          const label = uiLang === "en" ? englishLangName(code) : LANGUAGES.find((l) => l.code === code)?.label || code;
          const pickedSet = picked[code] || new Set();
          const groupWords = byLang[code];
          const range = getSavedRange(code, groupWords.length);
          const visibleGroupWords = groupWords.slice(range.clampedFrom - 1, range.clampedTo);
          const readCountInRange = visibleGroupWords.filter((e) => readIds.has(savedWordReadId(code, e.word))).length;
          const readCountTotal = groupWords.filter((e) => readIds.has(savedWordReadId(code, e.word))).length;
          return (
            <div
              key={code}
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontWeight: 700 }}>
                  {label} ({groupWords.length})
                </p>
                <button
                  onClick={() => {
                    // با فرستادنِ این لغات به داستان‌ساز، خودکار «خوانده‌شده»
                    // (یعنی «باهاش داستان ساختم») علامت می‌خورن — کاربر لازم
                    // نیست جدا یکی‌یکی تیک بزنه تا بفهمه کدوما رو قبلاً برده.
                    markSavedRangeRead(
                      code,
                      groupWords.filter((e) => pickedSet.has(e.word)),
                      true
                    );
                    onJumpToStory(code, Array.from(pickedSet));
                  }}
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
                  {pickedSet.size ? trf("addNWordsToStory", uiLang, { n: pickedSet.size }) : tr("addToStoryBuilder", uiLang)}
                </button>
              </div>

              {/* بازه‌ی نمایش + وضعیتِ خوانده‌شده — فقط وقتی لیستِ این زبان
                  به‌اندازه‌ی کافی بزرگه لازم می‌شه، ولی برای ساده‌موندنِ
                  منطق همیشه نشون داده می‌شه (مثلِ WordList). */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <RangeSliderFilter
                  min={1}
                  max={groupWords.length}
                  from={range.clampedFrom}
                  to={range.clampedTo}
                  onFromChange={(val) => setSavedRangeInput(code, "from", val)}
                  onToChange={(val) => setSavedRangeInput(code, "to", val)}
                  readCount={readCountInRange}
                  totalInRange={visibleGroupWords.length}
                  readCountTotal={readCountTotal}
                  label={uiLang === "en" ? "Words" : "کلمات"}
                  uiLang={uiLang}
                  colors={colors}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => markSavedRangeRead(code, visibleGroupWords, true)}
                    style={{ fontSize: 10, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 8px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markSavedRangeRead(code, visibleGroupWords, false)}
                    style={{ fontSize: 10, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 8px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {visibleGroupWords.map((e) => {
                  const isPicked = pickedSet.has(e.word);
                  const isRead = readIds.has(savedWordReadId(code, e.word));
                  // معادلِ این لغت به هر زبونی غیر از خودِ زبونِ مبدا —
                  // زبان مادری اول، بعد هر زبان مقصدِ دیگه‌ای که کاربر
                  // بالای صفحه فعال کرده، به همون ترتیب.
                  const otherLangs = relevantLangs.filter((l) => l !== code);
                  const level = lookupSavedWordLevel(e.word, code);
                  const pressKey = `${code}:${e.word}`;
                  return (
                    <div
                      key={e.word}
                      title={tr("longPressToJump", uiLang)}
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
                      onClickCapture={handleCardClickCapture}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 110,
                        maxWidth: 210,
                        borderRadius: 14,
                        border: `1px solid ${isPicked ? colors.gold : isRead ? READ_DONE_BORDER : colors.cardBorder}`,
                        background: isPicked ? colors.goldSoft : isRead ? READ_DONE_GRADIENT : colors.paper,
                        boxShadow: !isPicked && isRead ? READ_DONE_SHADOW : "none",
                        padding: "7px 10px",
                        touchAction: "pan-y",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      {/* این ردیف عمداً direction: ltr داره (توضیح بالا)، پس دایره‌ی
                          خوانده‌شده رو در گروهِ دومِ همین ردیف، به‌عنوانِ آخرین
                          عضو گذاشتیم — تا فیزیکاً سمتِ راستِ کارت بیفته، یکسان
                          با بقیه‌ی تب‌ها (قبلاً اول-ردیف بود و زیرِ ltr سمتِ چپ در میومد). */}
                      <div className="flex items-center justify-between gap-2" style={{ direction: "ltr" }}>
                        <span className="flex items-center gap-1" style={{ minWidth: 0 }}>
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
                        </span>
                        <span className="flex items-center gap-1" style={{ flexShrink: 0 }} data-jump-exclude="1">
                          <SpeakButton text={e.word} code={code} color={colors.gold} />
                          <button
                            onClick={() => removeSavedStoryWord(e.word, code)}
                            style={{ color: colors.inkSoft, display: "flex" }}
                            title={tr("deletePermanently", uiLang)}
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => toggleSavedWordRead(code, e.word)}
                            aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
                            data-jump-exclude="1"
                            style={{
                              flexShrink: 0,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: isRead ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                              background: isRead ? READ_DONE_CHECK_GRADIENT : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isRead && <Check size={13} color="white" strokeWidth={3} />}
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
                        const toLabel = uiLang === "en" ? englishLangName(toLang) : LANGUAGES.find((l) => l.code === toLang)?.label || toLang;
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
  // حالتِ «انتخاب» برای حذفِ دسته‌ایِ یادداشت‌های گرامری، دسته‌بندی‌شده
  // براساسِ تاریخِ ذخیره — دقیقاً مثلِ صفحه‌ی «چندتا انتخاب‌شده»یِ مدیریتِ
  // فایلِ اندروید: هر گروهِ تاریخ یه چک‌باکسِ «انتخابِ همه‌ی این گروه»
  // داره، و یه دکمه‌ی «انتخابِ همه» هم کلِ لیست رو انتخاب می‌کنه.
  const [noteSelectMode, setNoteSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(() => new Set());
  const grammarLocale = TTS_LOCALE[nativeLang] || "en-US";
  const formatNoteDateKey = useCallback(
    (iso) => {
      const d = new Date(iso);
      if (isNaN(d)) return (nativeLang === "fa") ? "بدون تاریخ" : "No date";
      return d.toLocaleDateString(grammarLocale, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    },
    [grammarLocale, nativeLang]
  );
  const formatNoteTime = useCallback(
    (iso) => {
      const d = new Date(iso);
      if (isNaN(d)) return "";
      return d.toLocaleTimeString(grammarLocale, { hour: "2-digit", minute: "2-digit" });
    },
    [grammarLocale]
  );
  const noteGroups = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      const key = formatNoteDateKey(n.savedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [notes, formatNoteDateKey]);
  function toggleNoteSelected(id) {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleGroupSelected(items) {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((n) => next.has(n.id));
      items.forEach((n) => (allSelected ? next.delete(n.id) : next.add(n.id)));
      return next;
    });
  }
  function selectAllNotes() {
    setSelectedNoteIds(new Set(notes.map((n) => n.id)));
  }
  function exitNoteSelectMode() {
    setNoteSelectMode(false);
    setSelectedNoteIds(new Set());
  }
  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده روی یادداشت‌های گرامری —
  // همون الگوی WordList، ولی گروه‌بندیِ بر اساسِ تاریخ (noteGroups) دست‌نخورده
  // می‌مونه: بازه رو رویِ ترتیبِ کلیِ notes حساب می‌کنیم، بعد هر گروهِ تاریخ
  // فقط یادداشت‌هایی که توی همون بازه‌ان رو نشون می‌ده.
  const GRAMMAR_NOTES_LIST_ID = "grammarNotes";
  const [noteReadIds, setNoteReadIds] = useState(() => loadReadWordIds(GRAMMAR_NOTES_LIST_ID));
  const toggleNoteRead = (id) => {
    setNoteReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(GRAMMAR_NOTES_LIST_ID, next);
      return next;
    });
  };
  const markNoteRangeRead = (items, read) => {
    setNoteReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((n) => {
        if (read) next.add(n.id);
        else next.delete(n.id);
      });
      saveReadWordIds(GRAMMAR_NOTES_LIST_ID, next);
      return next;
    });
  };
  const [noteRangeInput, setNoteRangeInput] = useState({ from: "", to: "" });
  // یه‌بار محاسبه می‌شه (نه دوبار با دو تا IIFEِ جدا)، و همیشه یه آرایه
  // برمی‌گردونه — حتی وقتی notes خالیه — که استفاده‌ی بعدی (.map) هیچ‌وقت
  // رو null صدا زده نشه.
  const rangedNoteGroups = useMemo(() => {
    if (!notes.length) return [];
    const indexById = new Map(notes.map((n, idx) => [n.id, idx]));
    const defaultTo = Math.min(notes.length, WORDS_PAGE_SIZE) || notes.length || 1;
    const parsedFrom = parseInt(noteRangeInput.from, 10);
    const parsedTo = parseInt(noteRangeInput.to, 10);
    const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
    const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
    const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(notes.length, 1));
    const clampedTo = Math.min(Math.max(clampedFrom, effTo), notes.length || clampedFrom);
    const inRange = (n) => {
      const idx = indexById.get(n.id);
      return idx != null && idx >= clampedFrom - 1 && idx < clampedTo;
    };
    return noteGroups
      .map((group) => ({ ...group, items: group.items.filter(inRange) }))
      .filter((group) => group.items.length > 0);
  }, [notes, noteGroups, noteRangeInput]);
  function deleteSelectedNotes() {
    if (!selectedNoteIds.size) return;
    if (!window.confirm((nativeLang === "fa") ? `${selectedNoteIds.size} یادداشتِ انتخاب‌شده پاک بشه؟` : `Delete ${selectedNoteIds.size} selected notes?`)) return;
    removeGrammarNotesBulk(selectedNoteIds);
    setExpandedNote(null);
    exitNoteSelectMode();
  }

  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [chatMessages, setChatMessages] = useState([]); // [{ role: "user"|"ai", text }]
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);
  // ویرایشِ پیام‌هایی که خودِ کاربر توی این چت فرستاده — با تپ‌کردن رویِ
  // پیام، اول یه دکمه‌ی «ویرایش» ظاهر می‌شه (tappedMsgIndex)؛ با زدنش،
  // همون پیام به یه textarea تبدیل می‌شه (editingMsgIndex/editingMsgText).
  // هیچ محدودیتی توی تعدادِ دفعاتِ ویرایش نیست — هر پیام هر چندبار که
  // بخوای قابلِ بازکردن و اصلاح‌کردنه.
  const [tappedMsgIndex, setTappedMsgIndex] = useState(null);
  const [editingMsgIndex, setEditingMsgIndex] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const editMsgTextareaRef = useRef(null);
  // نوارِ «تمرین جمله‌سازی» یه Bottom Sheetِ آزادانه قابلِ‌کشیدنه، دقیقاً
  // مثلِ نقشه‌ی گوگل ولی بدونِ اسنپ‌شدن به نقاطِ از‌پیش‌تعیین‌شده — هرجا
  // کاربر با انگشتش رهاش کنه، ارتفاع دقیقاً همون‌جا می‌مونه (بینِ ارتفاعِ
  // سرتیتر و ۹۲٪ صفحه). فقط دو حالت داریم:
  //   • peek — فقط سرتیترِ نوار دیده می‌شه (حالتِ جمع‌شده‌ی پیش‌فرض)
  //   • open — هر ارتفاعی که خودِ کاربر با کشیدن انتخاب کرده (practiceOpenHeight)
  // با کشیدنِ سرتیتر (grip handle) ارتفاع لحظه‌ای تغییر می‌کنه؛ با رهاکردن،
  // همون ارتفاعِ دقیق ذخیره می‌شه (مگه این‌که تا نزدیکِ ته کشیده بشه، که
  // اون‌وقت کاملاً جمع می‌شه). تپ‌ِ ساده (بدونِ حرکتِ محسوس) هم بینِ
  // peek و آخرین ارتفاعِ بازِ ذخیره‌شده سوییچ می‌کنه. خودِ گفتگو
  // (chatMessages) در هر دو حالت دست‌نخورده می‌مونه، چون این کامپوننت
  // همیشه mount شده‌ست.
  const [practiceSheet, setPracticeSheet] = useState("peek");
  const [practiceOpenHeight, setPracticeOpenHeight] = useState(null);
  const [practiceDragHeight, setPracticeDragHeight] = useState(null);
  const practicePanelRef = useRef(null);
  const practiceHeaderRef = useRef(null);
  const practiceDragInfoRef = useRef(null);
  const [practiceHeaderH, setPracticeHeaderH] = useState(56);
  const [practiceViewportH, setPracticeViewportH] = useState(() =>
    typeof window === "undefined" ? 800 : Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight)
  );

  // جابجاییِ آزادِ کلِ باکس (نه فقط ارتفاعش) — برای وقتی که کیبوردِ
  // موبایل بازه و باکس رویِ متنی که کاربر می‌خواد ببینه رو می‌پوشونه.
  // با دستگیره‌ی مخصوصِ «جابجایی» (کنارِ سرتیتر)، کاربر می‌تونه کلِ باکس
  // رو با انگشتش هرجایی از صفحه ببره؛ practiceMoveOffset همون جابجاییِ
  // ذخیره‌شده‌ست (نسبت به جای اصلیِ چسبیده‌به‌کف). با دکمه‌ی بازگشت
  // (RotateCcw)، دقیقاً به همون جای اولش برمی‌گرده (offset صفر با انیمیشن).
  const [practiceMoveOffset, setPracticeMoveOffset] = useState({ x: 0, y: 0 });
  const [practiceMoveDragOffset, setPracticeMoveDragOffset] = useState(null); // آفستِ لحظه‌ایِ حینِ کشیدن
  const practiceMoveDragInfoRef = useRef(null);
  const practiceMoved = practiceMoveOffset.x !== 0 || practiceMoveOffset.y !== 0;
  const practiceLiveMoveOffset = practiceMoveDragOffset || practiceMoveOffset;

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
      if (state === "peek") return practiceHeaderH;
      return practiceOpenHeight != null ? practiceOpenHeight : Math.round(practiceViewportH * 0.5);
    },
    [practiceViewportH, practiceHeaderH, practiceOpenHeight]
  );

  const practiceCurrentHeight = practiceDragHeight != null ? practiceDragHeight : practiceSnapHeight(practiceSheet);

  const handlePracticeMoveStart = useCallback(
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.stopPropagation();
      practiceMoveDragInfoRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffset: practiceMoveOffset,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    },
    [practiceMoveOffset]
  );

  const handlePracticeMoveMove = useCallback(
    (e) => {
      const info = practiceMoveDragInfoRef.current;
      if (!info) return;
      e.stopPropagation();
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      const vw = typeof window === "undefined" ? 400 : window.innerWidth;
      const panelH = practiceCurrentHeight;
      // فقط اجازه‌ی بالابردن می‌دیم (نه پایین‌تر از جای اصلیِ چسبیده‌به‌کف)
      // و اجازه‌ی چپ/راست تا جایی که حداقل بخشی از باکس رویِ صفحه بمونه.
      const minY = -(Math.max(0, practiceViewportH - panelH));
      const maxY = 0;
      const maxX = Math.max(0, vw - 60);
      const minX = -maxX;
      const nextX = Math.min(maxX, Math.max(minX, info.startOffset.x + dx));
      const nextY = Math.min(maxY, Math.max(minY, info.startOffset.y + dy));
      setPracticeMoveDragOffset({ x: nextX, y: nextY });
    },
    [practiceViewportH, practiceCurrentHeight]
  );

  const handlePracticeMoveEnd = useCallback(
    (e) => {
      try {
        e && e.currentTarget && e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const info = practiceMoveDragInfoRef.current;
      practiceMoveDragInfoRef.current = null;
      if (!info) return;
      setPracticeMoveOffset((prev) => practiceMoveDragOffset || prev);
      setPracticeMoveDragOffset(null);
    },
    [practiceMoveDragOffset]
  );

  const resetPracticePosition = useCallback(() => {
    // اگه به هر دلیلی (مثلاً از‌دست‌رفتنِ رویدادِ pointerup روی موبایل)
    // یه کشیدنِ نیمه‌کاره‌ی جابجایی گیر کرده باشه، اول اون رو هم پاک
    // می‌کنیم — وگرنه فرمولِ practiceLiveMoveOffset همچنان از آفستِ
    // گیرکرده استفاده می‌کنه و باکس با دکمه‌ی بازگشت جابجا نمی‌شه.
    practiceMoveDragInfoRef.current = null;
    setPracticeMoveDragOffset(null);
    setPracticeMoveOffset({ x: 0, y: 0 });
  }, []);

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
      // تپِ ساده (بدونِ کشیدنِ محسوس) — فقط بینِ جمع و بازِ ذخیره‌شده سوییچ کن.
      setPracticeSheet((prev) => (prev === "peek" ? "open" : "peek"));
      setPracticeDragHeight(null);
      return;
    }
    const finalHeight = practiceDragHeight != null ? practiceDragHeight : info.startHeight;
    if (finalHeight <= practiceHeaderH + 2) {
      // تا نزدیکِ ته کشیده شد => کاملاً جمع کن.
      setPracticeSheet("peek");
    } else {
      // هر ارتفاعی که کاربر با انگشتش انتخاب کرده رو دقیقاً همون نگه دار —
      // بدونِ اسنپ‌کردن به نقاطِ از‌پیش‌تعیین‌شده.
      setPracticeSheet("open");
      setPracticeOpenHeight(finalHeight);
    }
    setPracticeDragHeight(null);
  }, [practiceDragHeight, practiceHeaderH]);

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

  // وقتی هوش مصنوعی خطا می‌ده، آخرین پیامِ کاربر (که جوابش نیومده) توی
  // chatMessages می‌مونه بدونِ این‌که دوباره اضافه‌ش کنیم — فقط همون
  // درخواست رو دوباره می‌فرستیم، با تاریخچه‌ی درست (بدونِ خودِ این پیام).
  async function retryLastMessage() {
    const last = chatMessages[chatMessages.length - 1];
    if (!last || last.role !== "user" || chatLoading) return;
    setChatError("");
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: last.text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: chatMessages.slice(0, -1),
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: last.text }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply"));
    } finally {
      setChatLoading(false);
    }
  }

  function startEditingMsg(i, currentText) {
    setTappedMsgIndex(null);
    setEditingMsgIndex(i);
    setEditingMsgText(currentText);
  }

  function cancelEditingMsg() {
    setEditingMsgIndex(null);
    setEditingMsgText("");
  }

  // ویرایشِ یه پیامِ قبلیِ کاربر — دقیقاً مثلِ اپ‌های هوش‌مصنوعیِ معروف: بعد
  // از ذخیره، خودِ همون پیام با متنِ تازه جایگزین می‌شه، هر چی *بعدِ* اون
  // بود (جوابِ قدیمیِ هوش‌مصنوعی + هر پیامِ بعدی‌تر) حذف می‌شه، و یه درخواستِ
  // تازه با متنِ ویرایش‌شده فرستاده می‌شه تا هوش مصنوعی دوباره — با توجه به
  // متنِ جدید — جواب بده.
  async function saveEditingMsg() {
    const text = editingMsgText.trim();
    const idx = editingMsgIndex;
    if (!text || idx == null) {
      cancelEditingMsg();
      return;
    }
    const historyBeforeEdit = chatMessages.slice(0, idx);
    const truncated = [...historyBeforeEdit, { role: "user", text }];
    setChatMessages(truncated);
    cancelEditingMsg();
    setChatError("");
    setChatLoading(true);
    try {
      const reply = await askGrammarTeacher({
        userSentence: text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: historyBeforeEdit,
        targetOrder,
      });
      setChatMessages((m) => [...m, { role: "ai", text: reply, forSentence: text }]);
    } catch (e) {
      setChatError(e?.message?.replace(/^ai-backend-error:\s*/, "") || (isFa ? "خطا در دریافت پاسخ" : "Couldn't get a reply"));
    } finally {
      setChatLoading(false);
    }
  }

  // اتوگرو برای textareaـیِ ویرایشِ پیام، دقیقاً مثلِ اتوگروی کادرِ اصلی.
  useEffect(() => {
    const el = editMsgTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [editingMsgText, editingMsgIndex]);

  const langOptions = targetOrder && targetOrder.length ? targetOrder : LANGUAGES.map((l) => l.code);
  // ترجمه‌ی توضیحِ هر پیامِ هوش‌مصنوعی (که به زبانِ مادریِ کاربر نوشته
  // می‌شه) به هر کدوم از زبان‌های مقصدی که خودِ کاربر از تنظیماتِ اپ
  // چیده — با زدنِ تراشه‌ی هر زبان، همون‌جا زیرِ پیام باز/بسته می‌شه.
  // کلید: `${msgIndex}:${langCode}` → "loading" | متنِ ترجمه‌شده.
  const [msgTranslations, setMsgTranslations] = useState({});
  const [openMsgTranslation, setOpenMsgTranslation] = useState({}); // msgIndex -> langCode | null
  async function toggleMessageTranslation(msgIndex, text, langCode) {
    setOpenMsgTranslation((prev) => ({ ...prev, [msgIndex]: prev[msgIndex] === langCode ? null : langCode }));
    const key = `${msgIndex}:${langCode}`;
    if (msgTranslations[key]) return;
    setMsgTranslations((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const plain = String(text || "")
        .split(/\r?\n/)
        .map((l) => stripMdInline(l))
        .join("\n");
      const result = await translateFree(plain, langCode, "auto", aiSettings);
      setMsgTranslations((prev) => ({ ...prev, [key]: result || "—" }));
    } catch {
      setMsgTranslations((prev) => ({ ...prev, [key]: "—" }));
    }
  }
  // چون کرکره‌ی انتخابِ زبانِ تمرین از هدرِ باکس حذف شد، زبانِ تمرین همیشه
  // به اولین زبانِ مقصدی که کاربر از تنظیماتِ اصلیِ اپ چیده (targetOrder[0])
  // گره می‌خوره؛ با عوض‌شدنِ اون ترتیب، این هم خودکار به‌روز می‌شه.
  useEffect(() => {
    const first = targetOrder && targetOrder.length ? targetOrder[0] : null;
    if (first) setChatLang(first);
  }, [targetOrder && targetOrder[0]]);

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
        {notes.length > 0 && !noteSelectMode && (
          <div className="flex justify-end">
            <button
              onClick={() => setNoteSelectMode(true)}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: colors.rose, fontWeight: 700 }}
            >
              <ListChecks size={13} />
              انتخاب / حذف
            </button>
          </div>
        )}
        {notes.length > 0 && noteSelectMode && (
          <div
            className="flex items-center justify-between flex-wrap"
            style={{ gap: 8, backgroundColor: colors.goldSoft, borderRadius: 12, padding: "8px 10px" }}
          >
            <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>
              {selectedNoteIds.size > 0 ? `${selectedNoteIds.size} مورد انتخاب شد` : "انتخاب کن"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllNotes}
                className="flex items-center gap-1"
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}
              >
                <ListChecks size={13} />
                انتخاب همه
              </button>
              <button
                onClick={deleteSelectedNotes}
                disabled={!selectedNoteIds.size}
                className="flex items-center gap-1"
                style={{ fontSize: 12, fontWeight: 700, color: colors.rose, opacity: selectedNoteIds.size ? 1 : 0.5 }}
              >
                <Trash2 size={13} />
                حذف
              </button>
              <button onClick={exitNoteSelectMode} style={{ fontSize: 12, color: colors.inkSoft, fontWeight: 700 }}>
                انصراف
              </button>
            </div>
          </div>
        )}
        {(() => {
          if (!notes.length) return null;
          const defaultTo = Math.min(notes.length, WORDS_PAGE_SIZE) || notes.length || 1;
          const parsedFrom = parseInt(noteRangeInput.from, 10);
          const parsedTo = parseInt(noteRangeInput.to, 10);
          const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
          const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
          const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(notes.length, 1));
          const clampedTo = Math.min(Math.max(clampedFrom, effTo), notes.length || clampedFrom);
          const visibleTotal = rangedNoteGroups.reduce((sum, g) => sum + g.items.length, 0);
          const readCountInRange = rangedNoteGroups.reduce((sum, g) => sum + g.items.filter((n) => noteReadIds.has(n.id)).length, 0);
          const readCountTotal = notes.filter((n) => noteReadIds.has(n.id)).length;
          const allInRangeFlat = rangedNoteGroups.flatMap((g) => g.items);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RangeSliderFilter
                min={1}
                max={notes.length}
                from={clampedFrom}
                to={clampedTo}
                onFromChange={(val) => setNoteRangeInput((prev) => ({ ...prev, from: val }))}
                onToChange={(val) => setNoteRangeInput((prev) => ({ ...prev, to: val }))}
                readCount={readCountInRange}
                totalInRange={visibleTotal}
                readCountTotal={readCountTotal}
                label="یادداشت‌ها"
                uiLang="fa"
                colors={colors}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => markNoteRangeRead(allInRangeFlat, true)}
                  style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                >
                  علامت‌گذاری همه به خوانده‌شده
                </button>
                <button
                  type="button"
                  onClick={() => markNoteRangeRead(allInRangeFlat, false)}
                  style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                >
                  پاک‌کردن علامت این بازه
                </button>
              </div>
            </div>
          );
        })()}
        {rangedNoteGroups.map((group) => {
          const groupAllSelected = noteSelectMode && group.items.every((n) => selectedNoteIds.has(n.id));
          return (
            <div key={group.label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                {noteSelectMode && (
                  <button
                    onClick={() => toggleGroupSelected(group.items)}
                    style={{ color: groupAllSelected ? colors.gold : colors.inkSoft, display: "flex" }}
                    title="انتخابِ همه‌ی این تاریخ"
                  >
                    {groupAllSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                )}
                <p style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft }}>{group.label}</p>
              </div>
              {group.items.map((n) => {
                const isOpen = expandedNote === n.id;
                const langLabel = LANGUAGES.find((l) => l.code === n.langCode)?.label || n.langCode;
                const wordSaved = isWordSaved(n.word, n.langCode);
                const isSelected = selectedNoteIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    ref={(el) => (noteElsRef.current[n.id] = el)}
                    style={{
                      background: noteReadIds.has(n.id) ? READ_DONE_GRADIENT : "white",
                      border: `1px solid ${isSelected ? colors.gold : noteReadIds.has(n.id) ? READ_DONE_BORDER : colors.cardBorder}`,
                      borderRadius: 14,
                      padding: 12,
                      boxShadow: noteReadIds.has(n.id) ? READ_DONE_SHADOW : "none",
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      onClick={() => (noteSelectMode ? toggleNoteSelected(n.id) : setExpandedNote(isOpen ? null : n.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="flex items-center gap-2">
                        {/* دایره‌ی خوانده‌شده همیشه اولین عضوِ این گروه — تا
                            سمتِ راستِ کارت بمونه، یکسان با بقیه‌ی تب‌ها (قبلاً
                            توی گروهِ دومِ دکمه‌ها، سمتِ چپ بود). */}
                        {!noteSelectMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNoteRead(n.id);
                            }}
                            aria-label="علامت‌زدن به‌عنوان خوانده‌شده"
                            style={{
                              flexShrink: 0,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: noteReadIds.has(n.id) ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                              background: noteReadIds.has(n.id) ? READ_DONE_CHECK_GRADIENT : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {noteReadIds.has(n.id) && <Check size={13} color="white" strokeWidth={3} />}
                          </button>
                        )}
                        {noteSelectMode ? (
                          <span style={{ color: isSelected ? colors.gold : colors.inkSoft, display: "flex" }}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                        ) : (
                          <SpeakButton text={extractSpeakableText(n.markdown) || n.word} code={n.langCode} />
                        )}
                        <div>
                          <p dir="auto" style={{ fontWeight: 700, fontSize: 14 }}>
                            {n.word}
                          </p>
                          <p style={{ fontSize: 11, color: colors.inkSoft }}>
                            {langLabel}
                            {n.savedAt ? ` · ${formatNoteTime(n.savedAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      {!noteSelectMode && (
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
                      )}
                    </div>
                    {isOpen && !noteSelectMode && (
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
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.12)",
            transform: `translate3d(${practiceLiveMoveOffset.x}px, ${practiceLiveMoveOffset.y}px, 0)`,
            transition:
              practiceDragHeight != null
                ? "none"
                : practiceMoveDragOffset != null
                ? "none"
                : "height 0.24s cubic-bezier(.2,.8,.2,1), transform 0.24s cubic-bezier(.2,.8,.2,1)",
            // توجه: touchAction:none اینجا (روی کلِ باکس) عمداً گذاشته نشده —
            // چون این ویژگی روی تمامِ فرزندها هم اثر می‌ذاره (فرزند نمی‌تونه
            // با pan-y دوباره بازش کنه) و اسکرولِ لمسیِ لیستِ پیام‌ها رو
            // می‌بست. به‌جاش فقط روی خودِ دستگیره‌ها (هدر/گریپِ جابجایی)
            // که واقعاً از پوینترایونت‌های دستی استفاده می‌کنن گذاشته می‌شه.
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
            style={{
              background: `linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
              cursor: "grab",
              userSelect: "none",
              flexShrink: 0,
              touchAction: "none",
            }}
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
            <div className="px-3 py-2 flex items-center justify-between gap-1" style={{ flexWrap: "nowrap" }}>
              <div className="flex items-center gap-1" style={{ fontWeight: 700, color: "#fff", minWidth: 0, flex: "1 1 auto" }}>
                {/* دستگیره‌ی جابجایی و دکمه‌ی ریست، طبق درخواستِ جدید، حالا
                    کاملاً اولِ همین گروهِ سمت‌راست می‌شینن (یعنی لبه‌ی
                    راستِ نوار، چون کانتینر راست‌چینه) و بعدشون آیکون/عنوان
                    میاد — نه برعکس مثلِ قبل. */}
                <div
                  onPointerDown={(e) => { e.stopPropagation(); handlePracticeMoveStart(e); }}
                  onPointerMove={handlePracticeMoveMove}
                  onPointerUp={handlePracticeMoveEnd}
                  onPointerCancel={handlePracticeMoveEnd}
                  role="button"
                  tabIndex={0}
                  aria-label={isFa ? "جابجاکردنِ آزادِ باکس رویِ صفحه" : "Freely move this box"}
                  title={isFa ? "نگه‌دار و بکش تا باکس رو جابجا کنی" : "Hold and drag to move this box"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    cursor: "grab",
                    touchAction: "none",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 3px)",
                      gridAutoRows: "3px",
                      gap: 3,
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.85)" }} />
                    ))}
                  </div>
                </div>
                {practiceMoved && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetPracticePosition();
                    }}
                    className="flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.18)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                    title={isFa ? "بازگرداندنِ باکس به جای اولش" : "Reset box position"}
                    aria-label={isFa ? "بازگرداندنِ باکس به جای اولش" : "Reset box position"}
                  >
                    <RotateCcw size={12} color="#fff" />
                  </button>
                )}
                <span
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: colors.teal,
                    border: "2px solid rgba(255,255,255,0.85)",
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle size={11} color="#ffffff" fill="rgba(255,255,255,0.15)" strokeWidth={2.25} />
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
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                >
                  تمرین جمله‌سازی و گرامر
                </span>
                {practiceSheet === "peek" ? <ChevronUp size={15} color="#fff" /> : <ChevronDown size={15} color="#fff" />}
              </div>
              <div className="flex items-center gap-1" style={{ flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="flex items-center justify-center"
                    style={{ width: 24, height: 24, color: "#fff", opacity: 0.9, flexShrink: 0 }}
                    title={isFa ? "پاک‌کردن گفتگو" : "Clear conversation"}
                    aria-label={isFa ? "پاک‌کردن گفتگو" : "Clear conversation"}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
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
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      marginBottom: 10,
                      paddingRight: 2,
                      // پنلِ بیرونی برای امکانِ کشیدنِ دستی (تغییرِ ارتفاع/جابجایی)
                      // touchAction:none داره؛ چون این ویژگی روی فرزندها هم اثر
                      // می‌ذاره، اینجا صریحاً pan-y می‌ذاریم تا اسکرولِ عمودیِ
                      // معمولیِ لمسی (مثلِ هر اپِ چتی) روی خودِ لیستِ پیام‌ها کار کنه.
                      touchAction: "pan-y",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {chatMessages.map((m, i) => {
                      const isUser = m.role === "user";
                      const isEditing = editingMsgIndex === i;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end", marginBottom: 10 }}>
                          <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-start" : "flex-end" }}>
                            {isEditing ? (
                              <div
                                style={{
                                  width: "100%",
                                  minWidth: 180,
                                  padding: 6,
                                  borderRadius: 12,
                                  backgroundColor: colors.paper,
                                  border: `1.5px solid ${colors.teal}`,
                                }}
                              >
                                <textarea
                                  ref={editMsgTextareaRef}
                                  dir="auto"
                                  autoFocus
                                  rows={1}
                                  value={editingMsgText}
                                  onChange={(e) => setEditingMsgText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      saveEditingMsg();
                                    } else if (e.key === "Escape") {
                                      cancelEditingMsg();
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    padding: "4px 6px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    lineHeight: 1.6,
                                    maxHeight: 140,
                                    backgroundColor: "transparent",
                                    color: colors.ink,
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2" style={{ marginTop: 4 }}>
                                  <button
                                    onClick={cancelEditingMsg}
                                    className="flex items-center gap-1"
                                    style={{ fontSize: 11, color: colors.inkSoft }}
                                  >
                                    <X size={12} />
                                    انصراف
                                  </button>
                                  <button
                                    onClick={saveEditingMsg}
                                    className="flex items-center gap-1"
                                    style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "3px 8px" }}
                                  >
                                    <Check size={12} />
                                    ذخیره
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                dir={isUser ? (isPersianScriptLine(m.text || "") ? "rtl" : "ltr") : "auto"}
                                onClick={() => isUser && setTappedMsgIndex((prev) => (prev === i ? null : i))}
                                style={{
                                  maxWidth: "100%",
                                  padding: "8px 12px",
                                  borderRadius: 12,
                                  fontSize: 13,
                                  backgroundColor: isUser ? colors.paper : colors.goldSoft,
                                  border: `1px solid ${colors.cardBorder}`,
                                  cursor: isUser ? "pointer" : "default",
                                  // متنِ خودِ کاربر (سوال) مستقیم همینجا چاپ می‌شه؛
                                  // چون MiniMarkdown نیست، justify و فیکسِ
                                  // bidiِ ترکیبِ فارسی/عربی با بقیه‌ی زبون‌ها
                                  // باید مستقیم همینجا هم گذاشته بشه (جوابِ
                                  // هوش‌مصنوعی این استایل رو از طریقِ prop
                                  // «justify» به MiniMarkdown می‌گیره، پایین‌تر).
                                  ...(isUser ? { textAlign: "justify", unicodeBidi: "plaintext" } : null),
                                }}
                              >
                                {isUser ? m.text : <MiniMarkdown text={m.text} speakCode={chatLang} nativeLang={nativeLang} aiSettings={aiSettings} wordTapTarget={targetOrder && targetOrder[0]} justify />}
                                {m.role === "ai" && langOptions.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: 8, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 6 }}>
                                    <Globe size={12} color={colors.inkSoft} />
                                    {langOptions.map((code) => {
                                      const label = LANGUAGES.find((l) => l.code === code)?.label || code;
                                      const isOpenLang = openMsgTranslation[i] === code;
                                      return (
                                        <button
                                          key={code}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMessageTranslation(i, m.text, code);
                                          }}
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            borderRadius: 999,
                                            padding: "2px 8px",
                                            backgroundColor: isOpenLang ? colors.teal : "white",
                                            color: isOpenLang ? "white" : colors.inkSoft,
                                            border: `1px solid ${isOpenLang ? colors.teal : colors.cardBorder}`,
                                          }}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                {m.role === "ai" &&
                                  openMsgTranslation[i] &&
                                  (() => {
                                    const key = `${i}:${openMsgTranslation[i]}`;
                                    const val = msgTranslations[key];
                                    return (
                                      <div
                                        dir="auto"
                                        style={{
                                          marginTop: 6,
                                          fontSize: 12,
                                          color: colors.ink,
                                          backgroundColor: "white",
                                          borderRadius: 8,
                                          padding: "6px 8px",
                                          border: `1px solid ${colors.cardBorder}`,
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {val === "loading" ? (
                                          <span className="flex items-center gap-1" style={{ color: colors.inkSoft }}>
                                            <Loader2 size={12} className="spin" />
                                            در حال ترجمه...
                                          </span>
                                        ) : (
                                          val
                                        )}
                                      </div>
                                    );
                                  })()}
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
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                            )}
                            {/* دکمه‌ی «ویرایش» — فقط با تپ‌کردن رویِ پیامِ خودِ کاربر
                                ظاهر می‌شه؛ هیچ محدودیتی در تعدادِ دفعاتِ ویرایش نیست. */}
                            {isUser && !isEditing && tappedMsgIndex === i && (
                              <button
                                onClick={() => startEditingMsg(i, m.text)}
                                className="flex items-center gap-1"
                                style={{ fontSize: 11, color: colors.teal, fontWeight: 700, marginTop: 4 }}
                              >
                                <Pencil size={12} />
                                ویرایش
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {chatLoading && (
                      <div className="flex items-center gap-1" style={{ fontSize: 12, color: colors.inkSoft }}>
                        <Loader2 size={13} className="spin" />
                        در حال بررسی جمله...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
                {chatError && (
                  <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8, flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: colors.rose, margin: 0 }}>{chatError}</p>
                    <button
                      onClick={retryLastMessage}
                      disabled={chatLoading}
                      className="flex items-center gap-1"
                      style={{ fontSize: 11, color: "white", fontWeight: 700, backgroundColor: colors.teal, borderRadius: 8, padding: "4px 10px", flexShrink: 0, opacity: chatLoading ? 0.6 : 1 }}
                    >
                      <RotateCcw size={12} />
                      تلاش دوباره
                    </button>
                  </div>
                )}
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
                {/* دکمه‌ی ارسال طبق درخواستِ کاربر قبل از textarea میاد — چون
                    این باکس dir="rtl"ه (ریشه‌ی اپ rtlه)، اولین فرزندِ داخلِ
                    یه flex-rowِ rtl سمتِ راست می‌شینه؛ پس دکمه رو اول گذاشتیم
                    تا واقعاً سمتِ راستِ نوار بیفته، نه چپ. */}
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
  // ⚡️ فیکسِ سرعت: خودِ فیلدِ جستجو رو مستقیم به query وصل نگه می‌داریم (تا
  // تایپ‌کردن هیچ تأخیری حس نشه)، ولی چیزی که واقعاً به WordList/تبِ
  // مکالمات (فیلترِ سنگین رویِ چند هزار ردیف) پاس داده می‌شه debouncedQuery
  // ـه — فقط ۱۵۰ میلی‌ثانیه بعد از آخرین حرفی که کاربر تایپ کرده به‌روز
  // می‌شه. قبلاً هر تک‌کاراکتر بلافاصله کلِ فیلترِ سنگین رو (حتی بعدِ فیکسِ
  // کشِ ترجمه‌ها) روی چند هزار ردیف اجرا می‌کرد؛ روی گوشیِ کم‌رم، تایپِ
  // سریع باعث می‌شد چند اجرای سنگین پشتِ‌سرِهم صف بشن و تایپ کاملاً هنگ کنه.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);
  const [levelFilter, setLevelFilter] = useState("all");
  // مرتب‌سازیِ مشترکِ تب‌های لغات/Vocabulary in Use/اسلنگ/علاقه‌مندی‌ها —
  // همون الگویِ savedStoriesSort تویِ داستان‌ساز، اینجا رویِ WordList اثر
  // می‌ذاره (نگاه کن به GenericSortMenu/WORD_LIST_SORT_OPTIONS).
  const [wordSortKey, setWordSortKey] = useState("default");
  // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» — اگه اون لغت با شناسه‌ی دقیقِ
  // همون ردیف (id) ذخیره شده باشه (نگاه کن به originExtra توی WordList)،
  // این استیت به WordListِ همون تب می‌رسه تا دقیقاً همون ردیف رو (نه فقط
  // نتیجه‌ی جستجو) هایلایت و بهش اسکرول کنه.
  const [wordJumpTarget, setWordJumpTarget] = useState(null);
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
  // باز/بسته‌بودنِ پاپ‌آورِ تنظیمِ شفافیت — با کلیک روی آیکونِ شفافیت باز/بسته می‌شه.
  const [opacityPopoverOpen, setOpacityPopoverOpen] = useState(false);
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
  // لانگ‌پرس روی نوارِ پلیر — چه در حالِ پخش باشه چه مکث‌شده — کاربر رو به
  // همون تب و همون سطری که این پخش ازش شروع شده برمی‌گردونه. خودِ برگشتن به
  // سطرِ دقیق (نه فقط تب) رو منطقِ اسکرولِ خودکارِ هر لیست (که از قبل برای
  // هایلایت/دنبال‌کردنِ پخش وجود داشت) بعد از عوض‌شدنِ تب خودکار انجام می‌ده؛
  // اینجا فقط لازمه تبِ درست رو پیدا و ست کنیم.
  const playerLongPressRef = useRef({ startX: 0, startY: 0, timer: null, active: false, fired: false });
  function clearPlayerLongPress() {
    const st = playerLongPressRef.current;
    if (st.timer) {
      clearTimeout(st.timer);
      st.timer = null;
    }
    st.active = false;
  }
  function startPlayerLongPress(x, y) {
    const st = playerLongPressRef.current;
    clearPlayerLongPress();
    st.startX = x;
    st.startY = y;
    st.active = true;
    st.fired = false;
    st.timer = setTimeout(() => {
      if (!st.active) return;
      st.active = false;
      const state = speechController.getState();
      // فقط وقتی معنی داره که همین الان چیزی واقعاً در حالِ پخش یا مکث باشه —
      // وگرنه (پلیر خاموشه) این لمسِ طولانی رو اصلاً «شمرده‌شده» حساب نمی‌کنیم
      // تا کلیکِ بعدی‌ش (مثلاً چیزِ دیگه‌ای زیرِ همون انگشت) طبیعی کار کنه.
      if (!state.key) return;
      st.fired = true;
      const targetTab = getLastPlayOriginTab();
      if (targetTab && targetTab !== tab) setTab(targetTab);
    }, 550);
  }
  function movePlayerLongPress(x, y) {
    const st = playerLongPressRef.current;
    if (!st.active) return;
    if (Math.abs(x - st.startX) > 12 || Math.abs(y - st.startY) > 12) clearPlayerLongPress();
  }
  // بعد از یه لانگ‌پرسِ موفق، کلیکِ طبیعی‌ای که مرورگر روی همون المنتِ زیرِ
  // انگشت (مثلاً دکمه‌ی پخش) شلیک می‌کنه رو خنثی می‌کنیم — وگرنه بلافاصله
  // بعدِ رفتن به تبِ مقصد، پخش هم قطع/شروع می‌شد.
  function handlePlayerClickCapture(e) {
    const st = playerLongPressRef.current;
    if (st.fired) {
      e.preventDefault();
      e.stopPropagation();
      st.fired = false;
    }
  }
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
  const [backendUrl, setBackendUrl] = useState("");
  const [storyJump, setStoryJump] = useState(null); // { lang, token } — set when jumping in from Saved Words
  // متنِ کاملِ داستانِ ساخته‌شده در تبِ داستان‌ساز — برای این‌که دکمه‌ی
  // 🔊ِ «خواندنِ کل متن» روی نوارِ پلیر (پایینِ صفحه) بتونه بدونِ داشتنِ
  // دکمه‌ی جداگانه‌ی بالای داستان، همون متن رو بخونه.
  const [storyPlayerText, setStoryPlayerText] = useState({ text: "", code: "" });
  // وضعیت/کنترل‌های صوتِ آپلودیِ کاربر برای داستانِ فعلی — از StoryBuilder
  // گزارش می‌شه (onUserAudioStateChange) تا نوارِ سراسریِ پایینِ صفحه
  // (پلیرِ اصلی) بتونه سوییچِ TTS⇄صوتِ من و کنترل‌هاش رو نشون بده.
  const [storyUserAudio, setStoryUserAudio] = useState(null);
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
  // ⚡️ فیکسِ سرعت: قبلاً این آبجکت هر بار که PhrasebookMain رندر می‌شد (یعنی
  // با هر تایپ توی جستجو، هر تیک تایمر، هر حرکتِ انگشت روی نوارِ تمرینِ
  // جمله‌سازی، هرچیزی) یه رفرنسِ کاملاً تازه می‌ساخت. چون aiSettings به
  // ده‌ها کامپوننتِ React.memo‌شده در سراسرِ اپ (WordList، MiniMarkdown،
  // GrammarPanel، WordTargetTranslation و...) پاس داده می‌شه، رفرنسِ تازه
  // در هر رندر باعث می‌شد memo همیشه «تغییر کرده» تشخیص بده و کلِ اون
  // زیردرخت‌ها (از جمله فیلترِ سنگینِ جستجو و چتِ تمرینِ گرامر) دوباره
  // محاسبه/رندر بشن — همونی که باعثِ هنگ/کندیِ گسترده می‌شد. با useMemo،
  // فقط وقتی backendUrl واقعاً عوض بشه یه آبجکتِ تازه ساخته می‌شه.
  const aiSettings = useMemo(() => ({ backendUrl, setBackendUrl }), [backendUrl]);
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

  // همون الگو: پاپ‌آپِ لغت (ClickableSentence) این‌جوری یه لغتِ دلخواه رو
  // مستقیم به استخرِ مرورِ جعبه‌ی لایتنر اضافه می‌کنه — بدونِ اینکه boxes/
  // setBoxes رو لازم باشه به هر کامپوننتِ واسط پاس بدیم. خودِ ذخیره‌سازی تو
  // localStorage انجام می‌شه (addLeitnerCustomWord)؛ اینجا فقط با bump‌کردنِ
  // leitnerWordsVersion، useEffectِ لودِ لیست (پایین‌تر) رو دوباره اجرا می‌کنیم.
  const [leitnerCustomWords, setLeitnerCustomWords] = useState(() => loadLeitnerCustomWords());
  const [leitnerWordsVersion, setLeitnerWordsVersion] = useState(0);
  useEffect(() => {
    setLeitnerCustomWords(loadLeitnerCustomWords());
  }, [leitnerWordsVersion]);
  useEffect(() => {
    const refresh = () => setLeitnerCustomWords(loadLeitnerCustomWords());
    window.addEventListener(LEITNER_CUSTOM_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LEITNER_CUSTOM_WORDS_CHANGED_EVENT, refresh);
  }, []);
  useEffect(() => {
    requestAddToLeitner = (word, langCode, meaning) => {
      addLeitnerCustomWord(word, langCode, { meaning, nativeLang });
      setLeitnerWordsVersion((v) => v + 1);
    };
    return () => {
      requestAddToLeitner = null;
    };
  }, [nativeLang]);

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

  // لغاتی که کاربر با ⭐ از تب‌های لغات/لغات‌و‌اخبار/مکالمه‌روزمره/اسلنگ
  // علاقه‌مندشون کرده — قبلاً تنها جایی که ذخیره می‌شدن تنظیماتِ داخلی بود
  // و هیچ‌جا نشون داده نمی‌شدن (ستاره می‌خورد ولی توی تبِ «علاقه‌مندی‌ها»
  // ظاهر نمی‌شد)؛ حالا همین‌جا، کنارِ عبارت‌های علاقه‌مندشده، نشون داده می‌شن.
  const favoritedWords = useMemo(() => {
    const sources = [wordsWithSaved, DAILY_WORDS, SLANG_WORDS, VOCAB_IN_USE_WORDS];
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
    // نکته‌ی مهم: اینا هم مثلِ savedStories/savedStoryWords باید موقعِ merge
    // (یعنی وقتی این «saved» از نسخه‌ی ابریه، نه اولین لودِ محلی) با چیزی که
    // همین الان روی صفحه‌ست ادغام (union) بشن، نه جایگزینش بشن — قبلاً چون
    // بدونِ توجه به merge مستقیم setFavorites(new Set(saved.favorites))
    // صدا زده می‌شد، اگه یه ستاره‌ی تازه هنوز به ابر sync نشده بود (مثلاً
    // کاربر بلافاصله بعدِ ستاره‌زدن برنامه رو بسته بود)، نسخه‌ی قدیمی‌ترِ
    // ابری که چند لحظه بعد می‌رسید کاملاً جایگزینش می‌کرد و همون ستاره‌ی
    // تازه انگار «با هر بار وارد شدن حذف می‌شد».
    if (Array.isArray(saved.favorites)) {
      if (merge) {
        setFavorites((prev) => new Set([...prev, ...saved.favorites]));
      } else {
        setFavorites(new Set(saved.favorites));
      }
    }
    if (Array.isArray(saved.wordFavorites)) {
      if (merge) {
        setWordFavorites((prev) => new Set([...prev, ...saved.wordFavorites]));
      } else {
        setWordFavorites(new Set(saved.wordFavorites));
      }
    }
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
  // pendingSaveRef همیشه یه نسخه‌ی به‌روز از تابعِ «همین الان بساز و ذخیره کن»
  // رو نگه می‌داره (با آخرین مقادیرِ state، چون هر رندر دوباره نوشته می‌شه).
  // دلیلِ وجودش: اگه کاربر درست بعد از ستاره‌زدن (قبل از این‌که تایمرِ debounce
  // پایین فرصتِ اجرا پیدا کنه) صفحه رو رفرش/ببنده، اون تغییرِ آخر هیچ‌وقت
  // ذخیره نمی‌شه. پایین‌تر، با گوش‌دادن به pagehide/visibilitychange، همین
  // تابع رو درست همون لحظه (sync، بدون صبر برای تایمر) صدا می‌زنیم.
  const pendingSaveRef = useRef(null);
  useEffect(() => {
    pendingSaveRef.current = () => {
      const payload = {
        nativeLang,
        targetOrder,
        langPickerOrder,
        favorites: Array.from(favorites),
        wordFavorites: Array.from(wordFavorites),
        boxes,
        wordStats,
        savedStories,
        backendUrl,
        savedStoryWords: loadSavedStoryWords(),
        grammarNotes: loadGrammarNotes(),
        wordExamples: loadAllWordExamples(),
      };
      // مستقیم localStorage (نه storage.set که async-wrapped ولی همون زیرش
      // sync-ه) — چون تو هندلرِ pagehide/beforeunload نباید await کنیم، ممکنه
      // مرورگر قبل از تمومِ await صفحه رو واقعاً ببنده.
      try {
        window.localStorage.setItem(userStorageKey, JSON.stringify(payload));
      } catch (e) {
        // local save failed — still try the cloud copy below
      }
      if (user?.uid) supabaseSaveState(user.uid, payload);
      return payload;
    };
  });

  useEffect(() => {
    // تا وقتی هم نسخه‌ی محلی لود نشده («loaded»)، هم جوابِ ابری (چه موفق چه
    // ناموفق) نرسیده («cloudChecked»)، ذخیره‌ی خودکار رو شروع نمی‌کنیم — وگرنه
    // ممکنه حالتِ خالی/پیش‌فرضِ اولیه به‌جای نسخه‌ی واقعی روی ابری بشینه.
    if (!loaded || !cloudChecked) return;
    const timeout = setTimeout(() => {
      if (pendingSaveRef.current) pendingSaveRef.current();
    }, 500);
    return () => clearTimeout(timeout);
  }, [nativeLang, targetOrder, langPickerOrder, favorites, wordFavorites, boxes, wordStats, savedStories, backendUrl, loaded, cloudChecked, userStorageKey, user?.uid, savedWordsVersion, grammarNotesVersion, wordExamplesVersion]);

  // --- Flush فوری درست قبل از بستن/رفرش/مینیمایز‌کردنِ صفحه ------------------
  // اگه یه ذخیره‌ی معلق (تو تایمرِ ۵۰۰ میلی‌ثانیه‌یِ بالا) هنوز اجرا نشده،
  // همین‌جا فوری اجراش می‌کنیم — تا مثلاً ستاره‌ای که همین الان زده شده، با
  // رفرشِ سریع از دست نره.
  useEffect(() => {
    if (!loaded || !cloudChecked) return;
    const flush = () => {
      if (pendingSaveRef.current) pendingSaveRef.current();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [loaded, cloudChecked]);

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
  // مرور (جعبه‌ی لایتنر) رو دیگه فقط رویِ VOCABِ ثابتِ برنامه انجام نمی‌ده —
  // لغاتِ دلخواهی هم که کاربر از پاپ‌آپِ لغت («افزودن به جعبه‌ی لایتنر») در
  // هر تبی اضافه کرده، به همین استخر می‌پیوندن.
  const reviewPool = useMemo(() => [...conversation , ...leitnerCustomWords], [leitnerCustomWords]);
  // نوار پخشِ چسبیده به کف صفحه فقط تو تب‌هایی معنی داره که صدا/تکرار/
  // اسکرول خودکار توشون فعاله.
  // پلیر چسبیده به کف صفحه — سرتاسری، تو همه‌ی تب‌ها نشون داده می‌شه.
  const showPlayerBar = true;
  // متن/زبونِ مربوط به «پخشِ کل متنِ تبِ فعلی» — دقیقاً همون منطقی که قبلاً
  // سه‌تا SpeakButtonِ جدا (یکی برای هر تب) پیاده‌سازیش می‌کردن؛ حالا فقط
  // یه‌جا محاسبه می‌شه تا دکمه‌ی مرکزیِ پخشِ پلیرِ جدید (MainPlayButton)
  // وقتی چیزی در حالِ پخش نیست، بدونه با زدنش چه متنی رو باید شروع کنه.
  const activeTabAudio =
    tab === "story" && storyPlayerText.text
      ? {
          text: storyPlayerText.text,
          code: storyPlayerText.code,
          resolveStartOffset: () =>
            consumeMainTextResumeOffset(`${TTS_LOCALE[storyPlayerText.code] || "en-US"}::${storyPlayerText.text}`),
        }
      : tab === "conversations" && dailyPlayerText.text
      ? { text: dailyPlayerText.text, code: dailyPlayerText.code }
      : (tab === "words" || tab === "vocabInUse" || tab === "slang" || tab === "favorites") && wordListPlayerText.text
      ? {
          text: wordListPlayerText.text,
          code: wordListPlayerText.code,
          resolveStartOffset: () =>
            consumeMainTextResumeOffset(`${TTS_LOCALE[wordListPlayerText.code] || "en-US"}::${wordListPlayerText.text}`),
        }
      : null;
  // فقط وقتی تبِ فعلی «داستان‌ساز»ه و کاربر روی نوارِ سراسریِ پایینِ صفحه
  // سوییچ رو رویِ «صوتِ من» گذاشته، پلیرِ اصلی به‌جای TTS، فایلِ آپلودیِ
  // کاربر رو کنترل می‌کنه (پخش/توقف، جمله‌ی قبل/بعد کاملاً دستی، بدون
  // هایلایتِ خودکار — دقیقاً همون منطقی که خودِ StoryBuilder داره).
  const isStoryUserAudioMode = tab === "story" && storyUserAudio?.playbackMode === "user";

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
        /* لایه‌ی متنِ نامرئی/قابلِ‌سلکتِ ویووِرِ زنده‌ی PDF (PdfLivePageView) —
           همون CSSِ استانداردِ textLayer خودِ pdf.js: هر اسپن دقیقاً روی
           همون کلمه‌ی رسم‌شده تو canvas می‌شینه (شفاف، ولی قابلِ‌انتخاب). */
        .textLayer {
          position: absolute;
          text-align: initial;
          inset: 0;
          overflow: hidden;
          line-height: 1;
          text-size-adjust: none;
          forced-color-adjust: none;
          transform-origin: 0 0;
          caret-color: transparent;
        }
        .textLayer span, .textLayer br {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer ::selection { background: ${colors.gold}; opacity: 0.35; }
      `}</style>

      {/* Header — گرادیانتِ اختصاصیِ هر تم (headerFrom→headerTo)، به‌جای اینکه
          همیشه از teal→ink ساخته بشه؛ قبلاً چون ink توی همه‌ی تم‌ها خیلی
          تیره بود، هدر فارغ از تمِ انتخابی همیشه تقریباً یه‌شکل و تیره بود.
          radial highlight همون‌جوری برای حسِ عمق/نرمی نگه داشته شده. */}
      <header
        style={{
          background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.14), transparent 55%), linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
          color: colors.headerText,
        }}
        className="px-4 pt-6 pb-5"
      >
        <LingovaMascot uiLang={appPrefs.uiLang} fontZoom={APP_FONT_SIZES[appPrefs.fontSize]?.zoom || 1} outfitKey={appPrefs.mascotOutfit} enabled={appPrefs.mascotEnabled !== false} />
        <div className="flex items-center justify-end mb-1">
          <div className="flex items-center gap-2.5">
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 34, height: 34, borderRadius: "50%" }} />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldSoft})`,
                  color: colors.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <SettingsMenu appPrefs={appPrefs} setAppPrefs={setAppPrefs} user={user} onLogout={onLogout} aiSettings={aiSettings} />
          </div>
        </div>
        <p style={{ color: colors.headerText, opacity: 0.85, fontSize: 13.5, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
          {trf("headerFromTo", appPrefs.uiLang, { native: nativeLabel, target: targetLabel })} · {user?.name || user?.email}
        </p>

        {/* Language pickers */}
        <div className="mt-4">
          <p style={{ fontSize: 13.5, color: colors.headerText, opacity: 0.85, marginBottom: 10, lineHeight: 1.9, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
            {tr("nativeLanguageLabel", appPrefs.uiLang)}
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
          <div style={{ height: 1, background: "rgba(255,255,255,.14)", margin: "18px 0 14px" }} />
          <p style={{ fontSize: 13.5, color: colors.headerText, opacity: 0.85, marginBottom: 10, lineHeight: 1.9, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
            {tr("targetLanguagesLabel", appPrefs.uiLang)}
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
              <p style={{ fontSize: 12, color: colors.paperDark, margin: "10px 0 6px", fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa }}>
                {tr("translationOrderLabel", appPrefs.uiLang)}
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

        {/* سه تبِ اصلی — داخلِ خودِ هدر، رویِ همون گرادیانتِ تیره؛ طبقِ
            موکاپ، درست زیرِ زبان‌های مقصد. */}
        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <HeaderPrimaryTabButton label={tr("tabConversations", appPrefs.uiLang)} icon={MessageCircle} active={tab === "conversations"} onClick={() => setTab("conversations")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
          <HeaderPrimaryTabButton label={tr("tabStory", appPrefs.uiLang)} icon={Sparkles} active={tab === "story"} onClick={() => setTab("story")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
          <HeaderPrimaryTabButton label={tr("tabSaved", appPrefs.uiLang)} icon={Bookmark} active={tab === "saved"} onClick={() => setTab("saved")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ backgroundColor: colors.paperDark }}>
        <TabButton label={tr("tabGrammar", appPrefs.uiLang)} icon={Type} active={tab === "grammar"} onClick={() => setTab("grammar")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        <TabButton label={tr("tabWords", appPrefs.uiLang)} icon={Layers} active={tab === "words"} onClick={() => setTab("words")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        <TabButton label={tr("tabVocabInUse", appPrefs.uiLang)} icon={BookOpen} active={tab === "vocabInUse"} onClick={() => setTab("vocabInUse")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        <TabButton label={tr("tabFavorites", appPrefs.uiLang)} icon={Heart} active={tab === "favorites"} onClick={() => setTab("favorites")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        <TabButton label={tr("tabSlang", appPrefs.uiLang)} icon={Sparkles} active={tab === "slang"} onClick={() => setTab("slang")} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
        <TabButton label={tr("tabReview", appPrefs.uiLang)} icon={RotateCcw} active={tab === "review"} onClick={() => { setTab("review"); setReviewIndex(0); setShowAnswer(false); }} fontFamily={appPrefs.uiLang === "en" ? fontLatin : fontFa} />
      </nav>

      {/* Level filter — applies to conversation , words, favorites, and vocabulary */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3">
          <LevelFilterRow levelFilter={levelFilter} setLevelFilter={setLevelFilter} uiLang={appPrefs.uiLang} />
        </div>
      )}

      {/* دکمه‌ی مرتب‌سازی — دقیقاً همون چیزی که تبِ داستان‌ساز داره، اینجا هم
          برای تب‌های لغات/Vocabulary in Use/اسلنگ/علاقه‌مندی‌ها. مکالماتِ
          روزمره از یه کامپوننتِ جدا (DailyConversationsTab) استفاده می‌کنه
          که ترتیبِ خودِ سناریوها رو نگه می‌داره، پس اینجا نمی‌گنجه. */}
      {(tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3 flex justify-start">
          <GenericSortMenu sortKey={wordSortKey} setSortKey={setWordSortKey} options={WORD_LIST_SORT_OPTIONS} uiLang={appPrefs.uiLang} />
        </div>
      )}

      {/* Search — meaningful for the phrase and word list tabs */}
      {(tab === "conversations" || tab === "words" || tab === "favorites" || tab === "vocabInUse" || tab === "slang") && (
        <div className="px-4 pt-3">
          <div
            className="flex items-center gap-2 px-4"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, height: 48 }}
          >
            <Search size={17} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "words" || tab === "vocabInUse" || tab === "slang"
                  ? tr("searchWordsPlaceholder", appPrefs.uiLang)
                  : tab === "conversations"
                  ? tr("searchConversationsPlaceholder", appPrefs.uiLang)
                  : tr("searchPhrasesPlaceholder", appPrefs.uiLang)
              }
              style={{ flex: 1, fontFamily: appPrefs.uiLang === "en" ? fontLatin : fontFa, border: "none", outline: "none", fontSize: 14, backgroundColor: "transparent" }}
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
    data={ALL_DAILY_CONVERSATIONS}
    query={debouncedQuery}
    uiLang={appPrefs.uiLang || "fa"}
    nativeLang={nativeLang}
    nativeLabel={nativeLabel}
    aiSettings={aiSettings}
    ClickableSentence={ClickableSentence}
    SpeakButton={SpeakButton}
    targetLangs={targetLangList}
    translateFree={translateFree}
    getCachedTranslationMap={getCachedTranslationMap}
    levelFilter={levelFilter}
    speechController={speechController}
    onFullTextChange={setDailyPlayerText}
    autoScrollActive={tab === "conversations"}
    highlightColor={appPrefs.highlightColor}
    loadReadWordIds={loadReadWordIds}
    saveReadWordIds={saveReadWordIds}
    wordsPageSize={WORDS_PAGE_SIZE}
    readDoneColor={READ_DONE_COLOR}
    readDoneBg={READ_DONE_BG}
  />
)}

        {tab === "favorites" && (
          <div className="flex flex-col gap-6">
            {favorites.size === 0 && favoritedWords.length === 0 ? (
              <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
                {tr("noFavoritesYet", appPrefs.uiLang)}
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
                    query={debouncedQuery}
                    levelFilter={levelFilter}
                    aiSettings={aiSettings}
                    autoplayEnabled={tab === "favorites"}
                    emptyText=""
                    uiLang={appPrefs.uiLang}
                    // اگه عبارتِ علاقه‌مندی‌شده‌ای هست، دکمه‌ی مرکزیِ پخشِ پلیر
                    // همینا رو می‌خونه (با هایلایتِ همینجا). اگه چیزی نبود،
                    // نوبت به لیستِ لغاتِ زیرش می‌رسه (پایین‌تر).
                    onFullTextChange={setWordListPlayerText}
                    autoScrollActive={tab === "favorites"}
                    highlightColor={appPrefs.highlightColor}
                  />
                )}
                {favoritedWords.length > 0 && (
                  <div>
                    <h2 style={{ color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{tr("favoritesWordsHeading", appPrefs.uiLang)}</h2>
                    <WordList
                      words={favoritedWords}
                      listId="favorites"
                      wordFavorites={wordFavorites}
                      toggleWordFavorite={toggleWordFavorite}
                      query={debouncedQuery}
                      levelFilter={levelFilter}
                      sortKey={wordSortKey}
                      emptyText=""
                      uiLang={appPrefs.uiLang}
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      targetLangs={targetLangList}
                      aiSettings={aiSettings}
                      ClickableSentence={ClickableSentence}
                      autoplayEnabled={tab === "favorites"}
                      // فقط وقتی عبارتِ علاقه‌مندی‌شده‌ای نیست، لیستِ لغات
                      // مسئولِ متنِ دکمه‌ی مرکزیِ پلیر می‌شه — تا دو تا لیست
                      // با هم رویِ یه دکمه رقابت نکنن.
                      onFullTextChange={favorites.size > 0 ? undefined : setWordListPlayerText}
                      autoScrollActive={tab === "favorites"}
                      highlightColor={appPrefs.highlightColor}
                      jumpTarget={wordJumpTarget}
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
            listId="words"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "words"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "words"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "vocabInUse" && (
          <WordList
            words={VOCAB_IN_USE_WORDS}
            listId="vocabInUse"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "vocabInUse"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "vocabInUse"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "slang" && (
          <WordList
            words={SLANG_WORDS}
            listId="slang"
            wordFavorites={wordFavorites}
            toggleWordFavorite={toggleWordFavorite}
            query={debouncedQuery}
            levelFilter={levelFilter}
            sortKey={wordSortKey}
            emptyText={tr("noWordsInList", appPrefs.uiLang)}
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetLangs={targetLangList}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            autoplayEnabled={tab === "slang"}
            onFullTextChange={setWordListPlayerText}
            autoScrollActive={tab === "slang"}
            highlightColor={appPrefs.highlightColor}
            jumpTarget={wordJumpTarget}
          />
        )}

        {tab === "review" && (
          <ReviewBox
            conversation ={reviewPool}
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

        {tab === "saved" && (
          <SavedWordsPanel
            uiLang={appPrefs.uiLang}
            nativeLang={nativeLang}
            nativeLabel={nativeLabel}
            targetOrder={targetOrder}
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
              // تب‌های لغات (لغات/لغات‌و‌اخبار/اسلنگ/علاقه‌مندی‌ها) — اگه اون
              // لغت با شناسه‌ی دقیقِ همون ردیف (origin.id) ذخیره شده باشه،
              // به‌جای فقط پرکردنِ کادرِ جستجو، دقیقاً همون ردیف رو (بعد از
              // پاک‌کردنِ فیلترِ سطح و جستجو، تا چیزی قایمش نکنه) هایلایت و
              // بهش اسکرول می‌کنیم. اگه id نبود (لغاتی که قبل از این
              // قابلیت ذخیره شدن، یا از مکالمات روزمره اومدن — که ردیفِ
              // مستقلی نداره)، مثلِ قبل کادرِ جستجو رو با خودِ لغت پر می‌کنیم.
              if (["words", "vocabInUse", "slang", "favorites"].includes(originTab) && entry.origin.id != null) {
                setLevelFilter("all");
                setQuery("");
                setWordJumpTarget({ id: entry.origin.id, token: Date.now() });
              } else if (["conversations", "words", "favorites", "vocabInUse", "slang"].includes(originTab)) {
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
            langPickerOrder={langPickerOrder}
            setLangPickerOrder={setLangPickerOrder}
            wordStats={wordStats}
            setWordStats={setWordStats}
            savedStories={savedStories}
            setSavedStories={setSavedStories}
            aiSettings={aiSettings}
            jumpTo={storyJump}
            onFullTextChange={setStoryPlayerText}
            onUserAudioStateChange={setStoryUserAudio}
            autoScrollActive={tab === "story"}
            calendarSystem={appPrefs.calendarSystem || "jalali"}
            highlightColor={appPrefs.highlightColor}
            uid={user?.uid}
            uiLang={appPrefs.uiLang}
          />
        </div>
      </main>

      {/* پلیر — درست یه پله بالاترِ نوارِ «تمرین جمله‌سازی» می‌شینه (که حالا
          پایین‌ترین قسمتِ صفحه‌ست، bottom: 0)، پس ارتفاعِ اندازه‌گیری‌شده‌ی
          همون نوار (practicePanelHeight) رو به bottom اضافه می‌کنیم. همیشه
          روی صفحه می‌مونه (position: fixed)، حتی موقع اسکرول. */}
      {showPlayerBar && (
        <>
        <div
          ref={playerBarRef}
          onMouseDown={(e) => startPlayerLongPress(e.clientX, e.clientY)}
          onMouseMove={(e) => movePlayerLongPress(e.clientX, e.clientY)}
          onMouseUp={clearPlayerLongPress}
          onMouseLeave={clearPlayerLongPress}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) startPlayerLongPress(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) movePlayerLongPress(t.clientX, t.clientY);
          }}
          onTouchEnd={clearPlayerLongPress}
          onTouchCancel={clearPlayerLongPress}
          onClickCapture={handlePlayerClickCapture}
          onContextMenu={(e) => {
            if (playerLongPressRef.current.fired) e.preventDefault();
          }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: practicePanelHeight,
            zIndex: 40,
            // پس‌زمینه‌ی خودِ نوارِ پلیر، طبقِ درخواستِ کاربر، حالا با همون
            // گرادیانتِ اختصاصیِ تمِ فعلی که هدرِ بالای صفحه ازش استفاده
            // می‌کنه «ست» شده — به‌جایِ رنگِ صافِ paper. کنترل‌های خودِ پلیر
            // (نوارِ پیشرفت، دکمه‌ها) داخلِ یه پنلِ روشنِ داخلی می‌مونن (پایین‌تر)
            // تا کنتراست/خوانایی‌شون که برایِ زمینه‌ی روشن طراحی شده بود
            // دست‌نخورده بمونه، و فقط قابِ بیرونیِ نوار رنگِ هدر رو بگیره.
            background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.14), transparent 55%), linear-gradient(165deg, ${colors.headerFrom} 0%, ${colors.headerTo} 100%)`,
            opacity: playerOpacity / 100,
            padding: "7px 7px 0",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 14px rgba(28,37,65,0.18)",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <div
            style={{
              backgroundColor: colors.paper,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: "hidden",
            }}
          >
          {/* ردیفِ سوییچِ TTS⇄صوتِ من — فقط تبِ داستان‌ساز؛ اگه این تب نباشه
              اصلاً رندر نمی‌شه که فضایِ خالی نمونه. */}
          {tab === "story" && (
            <div className="px-4" style={{ paddingTop: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlayerBarStorySwitch ua={storyUserAudio} />
            </div>
          )}
          {/* ردیفِ نوارِ پیشرفت: زمانِ فعلی — نوارِ کِشیدنی — زمانِ کل — سرعت */}
          {isStoryUserAudioMode ? (
            <UserAudioProgressTrack ua={storyUserAudio} color={colors.gold} />
          ) : (
            <PlayerProgressTrack color={colors.gold} />
          )}
          {/* ردیفِ واحدِ همه‌ی آیکون‌ها: ضبطِ صدا، میوت، تکرار، بازگشت‌به‌اول،
              جمله‌ی بعد، پخش/توقفِ مرکزی، جمله‌ی قبل، شفافیت — با
              space-between پخش می‌شن رویِ کلِ عرضِ پلیر تا فضایِ خالیِ
              کنارها هدر نره، ولی خودِ آیکون‌ها هم زیادی به هم نچسبن. */}
          <div className="px-3" style={{ paddingTop: 2, paddingBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ marginInlineStart: 18 }}>
              <MyVoiceRecorder color={colors.rose} />
            </div>
            <MuteButton color={colors.gold} />
            <RepeatButton color={colors.gold} />
            <RestartButton color={colors.gold} startText={activeTabAudio?.text} startCode={activeTabAudio?.code} />
            {isStoryUserAudioMode ? (
              <UserAudioABButton ua={storyUserAudio} color={colors.gold} />
            ) : (
              <ABRepeatButton color={colors.gold} />
            )}
            {isStoryUserAudioMode ? (
              <UserAudioChunkNavButton direction="next" ua={storyUserAudio} color={colors.ink} />
            ) : (
              <ChunkNavButton direction="next" color={colors.ink} />
            )}
            <div style={{ margin: "0 4px" }}>
              {isStoryUserAudioMode ? (
                <UserAudioMainPlayButton ua={storyUserAudio} color={colors.teal} />
              ) : (
                <MainPlayButton
                  startText={activeTabAudio?.text}
                  startCode={activeTabAudio?.code}
                  resolveStartOffset={activeTabAudio?.resolveStartOffset}
                  color={colors.teal}
                />
              )}
            </div>
            {isStoryUserAudioMode ? (
              <UserAudioChunkNavButton direction="prev" ua={storyUserAudio} color={colors.ink} />
            ) : (
              <ChunkNavButton direction="prev" color={colors.ink} />
            )}
            {/* آیکونِ شفافیتِ پلیر — کلیک روش ردیفِ سرتاسریِ اسلایدر رو
                (که در کفِ پلیر، زیرِ همینِ ردیفِ آیکون‌ها رندر می‌شه) باز می‌کنه. */}
            <button
              onClick={(e) => { e.stopPropagation(); setOpacityPopoverOpen((v) => !v); }}
              aria-label="تنظیمِ شفافیتِ پلیر"
              title="تنظیمِ شفافیتِ پلیر"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: opacityPopoverOpen ? colors.gold : colors.inkSoft,
                padding: 7,
                marginInlineEnd: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Blend size={19} />
            </button>
          </div>
          {/* ردیفِ سرتاسریِ تنظیمِ شفافیت — دقیقاً در کفِ پلیر، زیرِ ردیفِ
              آیکون‌ها، به عرضِ کاملِ پلیر (نه یه پاپ‌آورِ کوچیکِ شناور که
              ممکنه از کادر بزنه بیرون). */}
          {opacityPopoverOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="px-3"
              style={{
                paddingTop: 6,
                paddingBottom: 10,
                borderTop: `1px solid ${colors.cardBorder}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
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
              <button
                onClick={() => setPlayerOpacity(100)}
                aria-label="بازنشانی شفافیت پلیر به ۱۰۰٪"
                title="بازنشانی شفافیت"
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.gold, padding: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
          </div>
        </div>
        {/* دکمه‌ی «بازنشانیِ شفافیت» — وقتی شفافیتِ پلیر خیلی پایین میاد (زیرِ
            ۷۰٪)، خودِ نوار (و اسلایدرِ توش) هم کم‌رنگ/کم‌کنتراست می‌شه و
            برگردوندنش به حالتِ عادی سخت می‌شه. این دکمه بیرونِ اون div ِ
            کم‌رنگ‌شده (خارج از اثرِ opacity والد) رندر می‌شه تا همیشه کاملاً
            واضح و قابل‌لمس بمونه، مهم نیست شفافیتِ پلیر چقدر پایین رفته باشه. */}
        {playerOpacity <= 7 && (
          <button
            onClick={() => setPlayerOpacity(100)}
            aria-label="بازنشانی شفافیت پلیر به ۱۰۰٪"
            title="بازنشانی شفافیت"
            style={{
              position: "fixed",
              left: 10,
              bottom: practicePanelHeight + 10,
              zIndex: 41,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${colors.cardBorder}`,
              backgroundColor: colors.paper,
              color: colors.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(28,37,65,0.25)",
              opacity: 1,
            }}
          >
            <RotateCcw size={16} />
          </button>
        )}
        </>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Phrase list (used for both "all conversation " and "favorites")
// ---------------------------------------------------------------------------
const PhraseList = React.memo(function PhraseList({ conversation , nativeLang, targetLangs, favorites, toggleFavorite, emptyText, query, levelFilter, aiSettings, autoplayEnabled, onFullTextChange, autoScrollActive, highlightColor, uiLang }) {
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

  // «خواندنِ کل لیست» + هایلایتِ عبارتِ در حالِ پخش — دقیقاً همون الگویی
  // که مکالمات روزمره (ConversationBox) و لیستِ لغات (WordList) دارن،
  // اینجا هم برای لیستِ عبارت‌های علاقه‌مندی. متنِ خونده‌شده‌ی پیش‌فرضِ
  // نوارِ پلیر همون زبانِ مقصدِ اولِ کاربره (firstTargetCode).
  //
  // طبق درخواستِ جدید، این دیگه فقط مخصوصِ firstTargetCode نیست: برای
  // *هر* زبانِ ترجمه‌ی انتخاب‌شده (targetLangs) جدا جدا یه fullText/آفست
  // ساخته می‌شه، تا زدنِ بلندگوی هر خطِ ترجمه (به هر زبونی)، دقیقاً از
  // همون‌جا وارد پخشِ پیوسته‌ی همون زبان بشه و خودکار جلو بره — نه فقط
  // یه پخشِ تکیِ ایزوله.
  const fullText = firstTargetCode ? filtered.map((p) => p.t[firstTargetCode] || "").join(" ") : "";

  const translationInfo = useMemo(() => {
    const info = {};
    targetLangs.forEach((l) => {
      let offset = 0;
      const parts = [];
      const offsets = [];
      filtered.forEach((p) => {
        const val = p.t[l.code];
        if (!val) return;
        const start = offset;
        parts.push(val);
        offset += val.length + 1; // فاصله‌ی join(" ")
        offsets.push({ id: p.id, start, end: start + val.length });
      });
      info[l.code] = { fullText: parts.join(" "), offsets };
    });
    return info;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, targetLangs]);

  // همون fullText/آفستِ بالا، اما برایِ خودِ متنِ اصلی (زبانِ مادری) —
  // قبلاً فقط برایِ ترجمه‌ها (targetLangs) ساخته می‌شد، پس زدنِ 🔊ِ متنِ
  // اصلی نه هایلایت می‌شد نه از همون‌جا به بقیه‌ی لیست ادامه می‌داد. این‌جا
  // دقیقاً همون الگو برایِ nativeLang تکرار می‌شه.
  const nativeInfo = useMemo(() => {
    let offset = 0;
    const parts = [];
    const offsets = [];
    filtered.forEach((p) => {
      const val = p.t[nativeLang];
      if (!val) return;
      const start = offset;
      parts.push(val);
      offset += val.length + 1;
      offsets.push({ id: p.id, start, end: start + val.length });
    });
    return { fullText: parts.join(" "), offsets };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, nativeLang]);

  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: firstTargetCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);
  useEffect(() => {
    return () => {
      if (onFullTextChange) onFullTextChange({ text: "", code: "" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // خط/زبانی که همین الان در حالِ پخشه — {code, id} | null. جایگزینِ
  // activePhraseIdِ قبلی (که فقط firstTargetCode رو می‌شناخت) — حالا با
  // چک‌کردنِ کلیدِ speechController رویِ fullTextِ *همه‌ی* زبان‌های هدف،
  // هر کدوم که در حالِ پخش باشه رو (چه از پلیرِ پایین، چه با کلیک روی
  // بلندگوی یه خطِ خاص) پیدا می‌کنه.
  const [activeTranslation, setActiveTranslation] = useState(null);
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveTranslation(null);
        return;
      }
      // اول خودِ متنِ اصلی (زبانِ مادری) رو چک می‌کنیم — دقیقاً همون منطقِ
      // پایینی که برایِ هر زبانِ ترجمه تکرار می‌شه.
      if (nativeInfo && nativeInfo.fullText) {
        const nativeKey = `${TTS_LOCALE[nativeLang] || "en-US"}::${nativeInfo.fullText}`;
        if (state.key === nativeKey) {
          const offset = speechController.getCharOffset();
          let found = nativeInfo.offsets[0] || null;
          for (const p of nativeInfo.offsets) {
            if (offset >= p.start) found = p;
            else break;
          }
          setActiveTranslation((prev) => {
            if (prev && prev.code === nativeLang && found && prev.id === found.id) return prev;
            return found ? { code: nativeLang, id: found.id } : null;
          });
          return;
        }
      }
      for (const l of targetLangs) {
        const info = translationInfo[l.code];
        if (!info || !info.fullText) continue;
        const myKey = `${TTS_LOCALE[l.code] || "en-US"}::${info.fullText}`;
        if (state.key !== myKey) continue;
        const offset = speechController.getCharOffset();
        let found = info.offsets[0] || null;
        for (const p of info.offsets) {
          if (offset >= p.start) found = p;
          else break;
        }
        setActiveTranslation((prev) => {
          if (prev && prev.code === l.code && found && prev.id === found.id) return prev;
          return found ? { code: l.code, id: found.id } : null;
        });
        return;
      }
      setActiveTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [targetLangs, translationInfo, nativeInfo, nativeLang]);
  const activePhraseId = activeTranslation ? activeTranslation.id : null;

  const phraseNodeMapRef = useRef(new Map());
  useEffect(() => {
    if (!autoScrollActive || activePhraseId == null) return;
    const node = phraseNodeMapRef.current.get(String(activePhraseId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, activePhraseId]);
  const registerPhraseRef = (id) => (node) => {
    const key = String(id);
    if (node) phraseNodeMapRef.current.set(key, node);
    else phraseNodeMapRef.current.delete(key);
  };

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? tr("noPhrasesForSearch", uiLang) : emptyText || tr("noPhrasesToShow", uiLang)}
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
            {categoryLabel(cat, uiLang)}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((p) => (
              <div
                key={p.id}
                ref={(el) => {
                  registerRef(p.id)(el);
                  registerPhraseRef(p.id)(el);
                }}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  backgroundColor: highlightBg(highlightColor, activePhraseId === p.id, "white"),
                  border: `1px solid ${colors.cardBorder}`,
                  transition: "background-color 0.35s ease",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
                    {p.level && <LevelBadge level={p.level} />}
                    <p
                      style={{
                        flex: 1,
                        fontWeight: 800,
                        fontSize: 15,
                        color: mainTextColor,
                        backgroundColor: highlightBg(highlightColor, activeTranslation && activeTranslation.code === nativeLang && activeTranslation.id === p.id),
                        borderRadius: 5,
                        padding: activeTranslation && activeTranslation.code === nativeLang && activeTranslation.id === p.id ? "2px 4px" : "2px 0",
                        transition: "background-color 0.35s ease",
                      }}
                    >
                      {p.t[nativeLang]}
                    </p>
                    <SpeakButton
                      text={p.t[nativeLang]}
                      code={nativeLang}
                      edge="end"
                      fullText={nativeInfo.fullText}
                      startOffset={nativeInfo.offsets.find((o) => o.id === p.id)?.start}
                    />
                  </div>
                  <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                    {targetLangs.map((l) => {
                      const info = translationInfo[l.code];
                      const myOffset = info && info.offsets.find((o) => o.id === p.id);
                      const isTransActive = activeTranslation && activeTranslation.code === l.code && activeTranslation.id === p.id;
                      return (
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
                        <p
                          style={{
                            flex: 1,
                            fontWeight: 800,
                            color: translationColor,
                            backgroundColor: highlightBg(highlightColor, isTransActive),
                            borderRadius: 5,
                            padding: isTransActive ? "2px 4px" : "2px 0",
                            transition: "background-color 0.35s ease",
                          }}
                        >
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
                        {p.t[l.code] && (
                          <SpeakButton
                            text={p.t[l.code]}
                            code={l.code}
                            color={translationColor}
                            edge="end"
                            fullText={info ? info.fullText : undefined}
                            startOffset={myOffset ? myOffset.start : undefined}
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => toggleFavorite(p.id)} aria-label={tr("addToFavoritesAria", uiLang)} style={{ marginRight: 4 }}>
                  <Star
                    size={20}
                    color={STAR_FAVORITE_COLOR}
                    fill={favorites.has(p.id) ? STAR_FAVORITE_COLOR : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Vocabulary & news words — click a word to reveal meaning + part of speech
// ---------------------------------------------------------------------------
const VocabList = React.memo(function VocabList({ words, nativeLang, targetLangs, levelFilter, aiSettings, autoplayEnabled }) {
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
                            originExtra={{ id: w.id }}
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
});

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
  // زمانِ دقیقِ بازشدنِ پاپ‌آپ — برای نادیده‌گرفتنِ «کلیک‌های شبح» (ghost
  // click)ی که بعضی موبایل‌براوزرها چند صدم‌ثانیه بعد از همون لمسی که
  // انتخاب رو ساخته می‌فرستن. چون پاپ‌آپ دقیقاً همون‌جایی باز می‌شه که
  // انگشت لمس کرده بود، اگه این کلیکِ تأخیریِ اضافه درست روی یکی از
  // دکمه‌های «ذخیره» بیفته، بدونِ اینکه کاربر واقعاً لمسش کرده باشه فعال
  // می‌شه — دقیقاً همون باگیه که باعث می‌شد لغت خودبه‌خود «ذخیره در گرامر»
  // بشه و پاپ‌آپ هم دیگه با لمسِ بیرون بسته نشه.
  const openedAtRef = useRef(0);
  // طبق درخواست: دیگه با تمومِ کشیدنِ محدوده (mouseup/touchend) بلافاصله
  // پاپ‌آپ باز نمی‌شه. اول محدوده «آماده» می‌مونه (فقط هایلایتِ طلایی روش
  // می‌مونه)، و پاپ‌آپ فقط وقتی باز می‌شه که کاربر روی همون محدوده انگشتش
  // رو HOLD_TO_OPEN_MS میلی‌ثانیه بدونِ جابه‌جاییِ زیاد نگه داره — یعنی یه
  // لمسِ طولانی/چندثانیه‌ای جدا، بعد از خودِ انتخاب. عددِ پایین رو می‌شه هر
  // وقت خواستی همین‌جا تغییر داد.
  const HOLD_TO_OPEN_MS = 160;
  const pendingRef = useRef(null); // { top, left, text, langCode, storyResumeOffset } | null — محدوده‌ی آماده، منتظرِ لمسِ طولانی
  const holdRef = useRef({ timer: null, startX: 0, startY: 0 });
  const [pendingActive, setPendingActive] = useState(false); // فقط برای رندرِ هایلایتِ CSS synced با وجودِ pendingRef
  const clearHold = () => {
    if (holdRef.current.timer) {
      clearTimeout(holdRef.current.timer);
      holdRef.current.timer = null;
    }
  };
  const [measuredHeight, setMeasuredHeight] = useState(null);
  // فقط برای این‌که دکمه‌ی 🔊ِ پاپ‌آپ بین آیکونِ پخش/توقف سوییچ کنه — دقیقاً
  // همون الگویی که SpeakButton خودش استفاده می‌کنه.
  const [speakState, setSpeakState] = useState(() => speechController.getState());
  useEffect(() => speechController.subscribe(setSpeakState), []);
  // پیغامِ خطای پخشِ صدا برای دکمه‌ی 🔊ِ همین پاپ‌آپ — به‌جای alert، زیرِ
  // متنِ انتخاب‌شده‌ی داخلِ خودِ پاپ‌آپ نشون داده می‌شه.
  const [popupSpeakMsg, setPopupSpeakMsg] = useState(null);
  useEffect(() => {
    if (!popupSpeakMsg) return;
    const t = setTimeout(() => setPopupSpeakMsg(null), 5000);
    return () => clearTimeout(t);
  }, [popupSpeakMsg]);

  const clearSelectionHighlight = () => {
    try {
      if (typeof CSS !== "undefined" && CSS.highlights) {
        CSS.highlights.delete(STORY_SELECTION_HIGHLIGHT);
      }
    } catch {}
  };

  // لغوِ حالتِ «آماده» (محدوده‌ی انتخاب‌شده که هنوز پاپ‌آپش باز نشده) — با
  // زدنِ جایی بیرون، اسکرول، یا شروعِ یه انتخابِ کاملاً تازه.
  const clearPending = () => {
    pendingRef.current = null;
    clearHold();
    setPendingActive(false);
    clearSelectionHighlight();
  };

  const closePopup = () => {
    setPopup(null);
    setTranslation(null);
    clearSelectionHighlight();
  };

  // کلیک/تاچِ شبح: هر رویدادی که کمتر از ۴۰۰ میلی‌ثانیه بعد از بازشدنِ
  // همین پاپ‌آپ برسه رو نادیده می‌گیریم. یه لمسِ واقعی و عمدی روی دکمه
  // همیشه بعد از این فاصله می‌رسه (کاربر باید اول ببینه پاپ‌آپ باز شده،
  // بعد جدا روش بزنه).
  const isGhostEvent = () => Date.now() - openedAtRef.current < 250;

  // ارتفاعِ واقعیِ پاپ‌آپ رو (به‌جای حدس ثابتِ ۸۸/۱۲۸ پیکسل قبلی) اندازه
  // می‌گیریم تا همیشه درست بالای محدوده‌ی انتخاب‌شده بشینه، نه رویش —
  // هم‌پوشانی با نقطه‌ی لمس دقیقاً همون چیزیه که احتمالِ گرفتارشدنِ یه
  // کلیکِ شبح توسطِ یکی از دکمه‌ها رو زیاد می‌کرد.
  useLayoutEffect(() => {
    if (!popup || !popupElRef.current) return;
    setMeasuredHeight(popupElRef.current.offsetHeight);
  }, [popup, translation]);

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
  // پارامترِ reportWrong (دکمه‌ی جدیدِ 🔄 کنارِ خودِ ترجمه، حتی وقتی status
  // از قبل "done" بوده): برخلافِ حالتِ عادی که اول کشِ IndexedDB رو چک
  // می‌کنه (و چون همون ترجمه‌ی «غلط» از قبل کش شده، دوباره همونو برمی‌گردوند
  // و دکمه عملاً هیچ‌کاری نمی‌کرد)، این حالت مستقیم می‌ره سراغِ شبکه با
  // forceVerify=true — یعنی حتی اگه هیچ‌کدوم از تست‌های heuristic مشکوکش
  // نکرده باشن هم، نتیجه‌ی خامِ سرویسِ رایگان قبل از نمایش با AI بازبینی/
  // اصلاح می‌شه (دقیقاً همون مسیری که برای اسلنگ/اصطلاح‌ها همیشه فعاله؛
  // خط ۱۷۵۹۷). نتیجه‌ی تازه همون‌جا (داخلِ translateFreeNetwork) جای کشِ
  // قدیمی رو توی IndexedDB می‌گیره، پس دفعه‌ی بعد هم دیگه همین ترجمه‌ی
  // اصلاح‌شده برمی‌گرده.
  function retryTranslation(reportWrong) {
    if (!popup) return;
    const targetLang = nativeLang || fallbackLangCode;
    setTranslation({ status: "loading" });
    const task = reportWrong
      ? translateFreeNetwork(popup.text, targetLang, popup.langCode, aiSettings, true)
      : translateFree(popup.text, targetLang, popup.langCode, aiSettings);
    task
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
  // دقیقاً معادل leitnerAdded توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence —
  // فیدبکِ خودِ دکمه‌ی «افزودن به جعبه‌ی لایتنر» برای یک محدوده‌ی انتخاب‌شده.
  const [leitnerAdded, setLeitnerAdded] = useState(false);
  // دکمه‌ی کپیِ خودِ اپ — چون بالاتر (خط‌های handleUp/handleContextMenu)
  // عمداً منوی بومیِ Copy گوشی رو غیرفعال کردیم (تا پاپ‌آپِ «افزودن به
  // داستان» جایگزینش بشه)، کاربر دیگه هیچ راهِ دیگه‌ای برای کپی‌کردنِ متنِ
  // انتخاب‌شده نداره. این دکمه دقیقاً همون کارِ آیکونِ Copy بومی رو با
  // navigator.clipboard انجام می‌ده، بدون این‌که مجبور باشیم اون رفتارِ
  // عمدیِ بالا (غیرفعال‌کردنِ منوی سیستم) رو کلاً برداریم.
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    const resolveLangCode = (node) => {
      const el = node && node.nodeType === 1 ? node : node?.parentElement;
      const host = el && el.closest ? el.closest("[data-lang-code]") : null;
      return (host && host.getAttribute("data-lang-code")) || fallbackLangCode;
    };

    const handleUp = (e) => {
      // اگه این touchend/mouseup از خودِ پاپ‌آپِ بازشده (یا لایه‌ی نامرئیِ
      // لمسِ طولانیِ pending) اومده — یعنی کاربر داره روی یکی از دکمه‌های
      // داخلِ پاپ‌آپ (🔊 / ذخیره / گرامر) می‌زنه — این‌جا کاملاً بی‌خیالش
      // می‌شیم. این‌جا دقیقاً همون باگی بود که باعث می‌شد با زدنِ دکمه‌های
      // پاپ‌آپ، یا خودِ پاپ‌آپ ناخواسته بسته بشه، یا (چون این event تا
      // اینجای تابع می‌رسید و window.getSelection() چیزی برمی‌گردوند) یه
      // انتخابِ کاملاً جدید و اشتباه (معمولاً یه تک‌کلمه‌ی زیرِ انگشت) به‌جای
      // تعاملِ واقعیِ کاربر با دکمه ثبت بشه.
      if (e && e.target) {
        if (popupElRef.current && popupElRef.current.contains(e.target)) return;
        if (e.target.closest && e.target.closest("[data-hope-selection-overlay]")) return;
      }
      const sel = window.getSelection && window.getSelection();
      const selectedText = sel ? sel.toString().trim() : "";
      if (!selectedText || !sel.rangeCount) return;
      // فیلدهای ورودی/قابل‌ویرایش (مثلاً جستجو، ورودی چت) از این قابلیت
      // مستثنی‌ان — همون‌جا انتخابِ عادیِ متن (برای کپی/پیست خودِ کاربر تو
      // فرم‌ها) باید دست‌نخورده بمونه.
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      // اگه پاپ‌آپِ یه محدوده‌ی قبلی هنوز بازه و کاربر محدوده‌ی کاملاً تازه‌ای
      // انتخاب کرده، اون پاپ‌آپِ قبلی رو ببند — محدوده‌ی جدید می‌ره تو حالتِ
      // «آماده» و باز هم منتظرِ لمسِ طولانیِ خودش می‌مونه. (setPopup(null)
      // حتی وقتی از قبل هم null بوده بی‌ضرره، پس شرط جداگانه لازم نیست —
      // همین‌جوری هم گیرِ کلوژرِ قدیمیِ متغیرِ popup نمی‌افتیم.)
      closePopup();
      let rect;
      // این متغیر رو بیرونِ try نگه می‌داریم (قبلاً داخلِ همون try/catچِ
      // اول با const تعریف شده بود و چون بلاک‌اسکوپ بود، توی try/catچِ بعدی
      // که storyResumeOffset رو حساب می‌کنه اصلاً در دسترس نبود — یه
      // ReferenceError که بی‌صدا قورت می‌رفت، و همین باعث می‌شد
      // storyResumeOffset همیشه null بمونه و «نقطه‌ی ادامه‌ی پخش» برای
      // محدوده‌های انتخابی هیچ‌وقت واقعاً ذخیره نشه).
      let range;
      try {
        range = sel.getRangeAt(0);
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
          const highlightRange = sel.getRangeAt(0).cloneRange();
          CSS.highlights.set(STORY_SELECTION_HIGHLIGHT, new Highlight(highlightRange));
        }
      } catch {}
      setSaved(isWordSaved(selectedText, langCode));
      setGrammarSaved(false);
      setLeitnerAdded(false);
      setCopiedText(false);
      setMeasuredHeight(null);
      // دیگه پاپ‌آپ همین‌جا باز نمی‌شه — محدوده فقط «آماده» می‌مونه (با
      // هایلایتِ طلاییِ بالا) تا کاربر جدا روش یه لمسِ طولانی انجام بده
      // (نگاه کن به بخشِ hold-to-open پایین‌تر).
      // مستطیل‌های واقعیِ محدوده (ممکنه چندخطی باشه) رو هم نگه می‌داریم تا
      // یه لایه‌ی لمسِ اختصاصی دقیقاً روی خودِ متنِ هایلایت‌شده بذاریم (نگاه
      // کن به توضیحِ overlay پایین‌تر برای دلیلش).
      let rects = [];
      try {
        rects = Array.from(range.getClientRects()).map((r) => ({ top: r.top, left: r.left, width: r.width, height: r.height }));
      } catch {}
      pendingRef.current = { top: rect.top, left: rect.left + rect.width / 2, text: selectedText, langCode, storyResumeOffset, rects };
      setPendingActive(true);
      // بلافاصله انتخابِ بومیِ مرورگر رو پاک می‌کنیم — هایلایتِ سفارشیِ خودمون
      // (که همین الان ست شد) جایگزینش می‌شه، و نوار ابزارِ سیستم دیگه چیزی
      // برای نشون‌دادن نداره. هایلایتِ سفارشیِ بالا از این کار متأثر نمی‌شه.
      try {
        window.getSelection()?.removeAllRanges?.();
      } catch {}
    };

    const handleContextMenu = (e) => {
      // منوی راست‌کلیک/لانگ‌پرسِ پیش‌فرض روی متنِ خواندنیِ داستان لازم
      // نیست (چون به‌جاش دکمه‌ی «افزودن به داستان» خودمون داریم) — ولی
      // این preventDefault قبلاً بدونِ قیدوشرط رو کل document بود، یعنی
      // داخلِ خودِ کادرهای ورودی (input/textarea) هم منوی Paste/کپی/
      // انتخاب‌همه‌ی بومیِ گوشی رو غیرفعال می‌کرد — برای همین کپی‌پیست تو
      // کادرهایی مثل «افزودن لغت» کار نمی‌کرد. الان فقط وقتی جلوش رو
      // می‌گیریم که هدف یه کادرِ متنیِ قابل‌ویرایش نباشه.
      const el = e.target;
      const isEditable = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (isEditable) return;
      e.preventDefault();
    };

    const handleScroll = () => {
      closePopup();
      clearPending();
    };

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

  // «لمسِ طولانی برای بازکردن»: تا وقتی محدوده‌ای «آماده»ست (pendingRef) و
  // پاپ‌آپ هنوز باز نشده، اگه HOLD_TO_OPEN_MS میلی‌ثانیه بدونِ جابه‌جاییِ زیاد
  // (بیشتر از چند پیکسل) ادامه پیدا کنه، پاپ‌آپ همون‌جا باز می‌شه؛ وگرنه
  // (برداشتن زودهنگامِ انگشت، یا جابه‌جاییِ زیاد) لغو می‌شه و محدوده همچنان
  // «آماده» می‌مونه تا کاربر دوباره امتحان کنه.
  //
  // نکته‌ی مهم (دلیلِ اصلیِ اینکه قبلاً کار نمی‌کرد): این تایمر رو دیگه با
  // شنودِ mousedown/touchstart روی کل document شروع نمی‌کنیم. چون متنِ زیرِ
  // هایلایت هنوز از نظرِ مرورگر «متنِ قابل‌انتخاب»ه، یه لمسِ طولانیِ دوم
  // درست روی همون متن رو خودِ موبایل‌براوزر به‌عنوانِ ژستِ سیستمیِ
  // انتخاب/منوی Copy-Look‌Up قورت می‌ده — و همون‌جا یه touchcancel می‌فرسته
  // که تایمرِ ما رو لغو می‌کنه، پس هیچ‌وقت به HOLD_TO_OPEN_MS نمی‌رسه (این
  // اتفاق مستقل از تنظیمِ CSS مثلِ user-select هم می‌افته، چون OS جدا از
  // CSS همچنان روی خودِ رویدادهای لمسی دست می‌ذاره).
  //
  // به‌جاش، یه لایه‌ی نامرئیِ اختصاصی (نه متن، یه <div> ساده) دقیقاً روی
  // مستطیل‌های خودِ محدوده‌ی انتخاب‌شده (pendingRef.current.rects) می‌ذاریم؛
  // چون این لایه اصلاً متن نیست، هیچ مرورگری روش ژستِ انتخاب/کپی سیستمی
  // اجرا نمی‌کنه و لمسِ طولانی مستقیم و بدون مزاحمت به تایمرِ خودمون می‌رسه.
  // شروعِ تایمر (startHold) پس فقط از رویدادهای onTouchStart/onMouseDown
  // خودِ همون overlay صدا زده می‌شه (پایین‌تر، بخشِ رندر). حرکت و رهاکردنِ
  // انگشت/ماوس همچنان سراسری زیرِ نظره تا اگه بیرون از overlay هم ادامه پیدا
  // کرد (مثلاً کاربر انگشتش رو کشید) به‌درستی لغو بشه.
  const startHold = (x, y) => {
    if (!pendingRef.current || popupElRef.current) return;
    clearHold();
    holdRef.current.startX = x;
    holdRef.current.startY = y;
    holdRef.current.timer = setTimeout(() => {
      const p = pendingRef.current;
      if (!p) return;
      openedAtRef.current = Date.now();
      // همون لحظه‌ای که پاپ‌آپ باز می‌شه (نه فقط وقتی کاربر خودش 🔊ِ داخلش
      // رو می‌زنه) پخشِ پیوسته‌ی متنِ اصلی رو مکث می‌کنیم — تا حواسِ کاربر
      // که رفته سراغِ پاپ‌آپ، با خواندنِ همزمانِ پلیر قاطی نشه. بعد از سه
      // ثانیه (اگه خودِ کاربر تا اون‌موقع 🔊ِ پاپ‌آپ رو نزده باشه) خودکار از
      // همون نقطه ادامه پیدا می‌کنه.
      speechController.pauseForFocus();
      setPopup(p);
      pendingRef.current = null;
      setPendingActive(false);
    }, HOLD_TO_OPEN_MS);
  };
  const moveHold = (x, y) => {
    if (!holdRef.current.timer) return;
    const dx = Math.abs(x - holdRef.current.startX);
    const dy = Math.abs(y - holdRef.current.startY);
    if (dx > 12 || dy > 12) clearHold();
  };

  useEffect(() => {
    const onMouseMove = (e) => moveHold(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (t) moveHold(t.clientX, t.clientY);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", clearHold);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", clearHold);
    document.addEventListener("touchcancel", clearHold);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", clearHold);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", clearHold);
      document.removeEventListener("touchcancel", clearHold);
    };
  }, []);

  // لمس/کلیک بیرون از پاپ‌آپ (بدون این‌که متن جدیدی انتخاب بشه) هم باید
  // هم پاپ‌آپ و هم هایلایتِ همراهش رو ببنده — وگرنه هایلایت تا ابد (یا تا
  // اسکرول بعدی) روی صفحه می‌مونه. همین‌طور، اگه محدوده هنوز فقط «آماده»ست
  // (پاپ‌آپ باز نشده، منتظرِ لمسِ طولانیه) و کاربر یه‌جای دیگه رو لمس کنه
  // بدونِ این‌که محدوده‌ی تازه‌ای انتخاب کنه، همون «آماده» هم لغو می‌شه.
  useEffect(() => {
    if (!popup && !pendingActive) return;
    const onOutside = (e) => {
      if (popup) {
        if (popupElRef.current && popupElRef.current.contains(e.target)) return;
        closePopup();
        return;
      }
      // یه تیکِ رندر صبر می‌کنیم چون همین لمس ممکنه داره یه انتخابِ تازه رو
      // شروع می‌کنه — اگه واقعاً همچین چیزی در جریان نبود، «آماده» رو پاک کن.
      setTimeout(() => {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.toString().trim()) return;
        // اگه همین لمس، لحظه‌ای پیش (توی همین event، سینکرون) یه لمسِ
        // طولانیِ تازه رو شروع کرده (یعنی داره دقیقاً روی محدوده‌ی هایلایت‌شده
        // نگه داشته می‌شه)، این یعنی خودِ همون ژستِ «نگه‌داشتن برای باز کردن»ه،
        // نه یه لمسِ واقعاً «بیرون». نباید همین‌جا لغوش کنیم — بذاریم
        // useEffect ِ hold-to-open خودش تصمیم بگیره (یا پاپ‌آپ باز بشه، یا
        // با جابه‌جاییِ زیاد/برداشتنِ زودهنگامِ انگشت لغو بشه).
        // (holdRef.current.timer همین الان، پیش از رسیدنِ این setTimeout،
        // توسطِ handler سینکرونِ startHold ست شده — چون هر دو به یه
        // touchstart/mousedown واحد گوش می‌دن و اون یکی زودتر اجرا می‌شه.)
        if (holdRef.current.timer) return;
        clearPending();
      }, 0);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [popup, pendingActive]);

  // لایه‌ی نامرئیِ لمسِ طولانی — فقط وقتی محدوده «آماده»ست (هایلایتِ طلایی
  // روشه) ولی پاپ‌آپ هنوز باز نشده رندر می‌شه. دقیقاً روی مستطیل‌های خودِ
  // متنِ انتخاب‌شده می‌شینه (نه رویِ کلِ صفحه)، پس بیرون از محدوده هیچ اثری
  // نداره و لمس/اسکرول توی بقیه‌ی صفحه دست‌نخورده می‌مونه.
  if (!popup) {
    if (!pendingActive || !pendingRef.current || !pendingRef.current.rects || !pendingRef.current.rects.length) return null;
    return (
      <div data-hope-selection-overlay="1" style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none" }}>
        {pendingRef.current.rects.map((r, i) => (
          <div
            key={i}
            onMouseDown={(e) => {
              e.stopPropagation();
              startHold(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const t = e.touches[0];
              if (t) startHold(t.clientX, t.clientY);
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: "fixed",
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              pointerEvents: "auto",
              background: "transparent",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
              touchAction: "none",
            }}
          />
        ))}
      </div>
    );
  }

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

  // دقیقاً معادل addActiveTermToLeitner توی پاپ‌آپِ تک‌لغه‌ایِ ClickableSentence
  // — از همون singletonِ requestAddToLeitner استفاده می‌کنه، فقط این‌جا برای
  // یک محدوده‌ی انتخاب‌شده (چند کلمه/جمله) به‌جای تک‌لغت.
  function addSelectionToLeitner() {
    if (!popup || !requestAddToLeitner) return;
    const meaningText = translation && translation.status === "done" ? translation.text : "";
    requestAddToLeitner(popup.text, popup.langCode, meaningText);
    setLeitnerAdded(true);
  }

  return (
    <div
      ref={popupElRef}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top: Math.max(8, popup.top - (measuredHeight != null ? measuredHeight + 10 : translation ? 128 : 88)),
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
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "manipulation",
      }}
    >
      {/* متنِ اصلیِ انتخاب‌شده + دکمه‌ی خواندنِ صوتی، دقیقاً مطابقِ تصویرِ
          مرجع: بالای پاپ‌آپ خودِ متنِ انتخاب‌شده‌ست، نه ترجمه. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
            if (isGhostEvent()) return;
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
              setPopupSpeakMsg("این مرورگر از خواندن صوتی پشتیبانی نمی‌کنه");
            } else if (result === "error") {
              setPopupSpeakMsg("پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن");
            } else if (result === "no-local-voice") {
              setPopupSpeakMsg("صدای این زبان روی گوشیت نصب نیست");
            } else if (result === "no-tts-engine") {
              setPopupSpeakMsg("گوشیت اصلاً موتور خواندنِ متن (TTS) نداره — از تنظیماتِ گوشی یه موتور TTS نصب/فعال کن");
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
        {/* دکمه‌ی بستنِ صریح — همیشه یه راهِ مطمئن برای خارج‌شدن از این
            پاپ‌آپ باشه، حتی اگه به هر دلیلی لمسِ بیرون کار نکرد. */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            closePopup();
          }}
          aria-label="بستن"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 22,
            height: 22,
            color: colors.paper,
            opacity: 0.7,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={15} />
        </button>
      </div>
      {(popupSpeakMsg ||
        (speakState.ttsError && speakState.ttsError === `${TTS_LOCALE[popup.langCode] || "en-US"}::${popup.text}`)) && (
        <div style={{ fontSize: 11, color: "#ff9a9a" }}>
          {popupSpeakMsg || "پخش صدا با مشکل مواجه شد — اتصال اینترنت رو چک کن"}
        </div>
      )}
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
              <span
                style={{
                  flex: 1,
                  overflowWrap: "break-word",
                  // دقیقاً هم‌زمان با «ذخیره برای داستان بعدی» زده می‌شه: تا
                  // وقتی محدوده ذخیره نشده زیرخط نداره، همین که saved=true
                  // بشه (چه با زدنِ دکمه، چه چون از قبل ذخیره بوده) ترجمه‌ی
                  // زبانِ مقصد هم مثلِ بقیه‌ی جاهای برنامه زیرخطِ نقطه‌چینِ
                  // طلایی می‌گیره.
                  textDecorationLine: saved ? "underline" : "none",
                  textDecorationStyle: "dotted",
                  textDecorationColor: colors.gold,
                  textUnderlineOffset: 3,
                }}
              >
                {translation.text}
              </span>
              {/* دکمه‌ی «ترجمه اشتباهه؟» — اگه ترجمه‌ی نشون‌داده‌شده درست
                  نبود، کاربر همین‌جا می‌تونه بدونِ بستنِ پاپ‌آپ درخواستِ
                  یه ترجمه‌ی تازه/بازبینی‌شده بده (نگاه کن به توضیحِ
                  reportWrong بالای retryTranslation). */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryTranslation(true);
                }}
                aria-label="این ترجمه اشتباهه، یکی بهتر پیدا کن"
                title="ترجمه اشتباهه؟ دوباره امتحان کن"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  color: colors.goldSoft,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={13} />
              </button>
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
            if (isGhostEvent()) return;
            const doFallbackCopy = () => {
              // بعضی WebViewهای قدیمیِ اندروید navigator.clipboard رو ندارن —
              // یه textarea موقت می‌سازیم و با execCommand("copy") کپی می‌کنیم.
              try {
                const ta = document.createElement("textarea");
                ta.value = popup.text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                ta.remove();
                setCopiedText(true);
                setTimeout(() => setCopiedText(false), 1500);
              } catch {}
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard
                .writeText(popup.text)
                .then(() => {
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 1500);
                })
                .catch(doFallbackCopy);
            } else {
              doFallbackCopy();
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: copiedText ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${copiedText ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <Copy size={13} />
          {copiedText ? "کپی شد ✓" : "کپیِ متن"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
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
            if (isGhostEvent()) return;
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGhostEvent()) return;
            addSelectionToLeitner();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: leitnerAdded ? colors.gold : colors.paper,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${leitnerAdded ? colors.gold : "rgba(255,255,255,0.25)"}`,
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={13} />
          {leitnerAdded ? "به جعبه‌ی لایتنر اضافه شد" : "افزودن به جعبه‌ی لایتنر"}
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

const WordList = React.memo(function WordList({ words, listId, wordFavorites, toggleWordFavorite, query, levelFilter, sortKey, emptyText, nativeLang, nativeLabel, targetLangs, aiSettings, autoplayEnabled, onFullTextChange, autoScrollActive, ClickableSentence, highlightColor, jumpTarget, uiLang, defaultPageSize }) {
  // بازه‌ی پیش‌فرضِ نمایش برای این لیستِ خاص. همه‌ی تب‌ها (لغات، اخبار،
  // اسلنگ، Vocabulary in Use) چیزی پاس نمی‌دن و همون WORDS_PAGE_SIZE
  // (۶۰ تا) امن رو می‌گیرن — چون هرکدوم می‌تونن چند صد تا چند هزار ردیف
  // داشته باشن و رندرِ همه‌شون با هم (هر ردیف چند فچِ ترجمه/مثالِ جدا داره)
  // برنامه رو هنگ می‌کنه. قبلاً تبِ «Vocabulary in Use» با
  // defaultPageSize={VOCAB_IN_USE_WORDS.length} کلِ ۲۲۶۸ لغتش رو یه‌جا
  // می‌ساخت — همون بلایی که سرِ اسلنگ اومده بود. الان دیگه هیچ تبی این
  // override رو پاس نمی‌ده؛ به‌جاش، پایین‌تر (loadMoreRef/IntersectionObserver)
  // با اسکرولِ کاربر به‌طور خودکار دسته‌های بعدی اضافه می‌شن، بدون نیاز به
  // تایپِ عدد.
  const effectivePageSize = defaultPageSize || WORDS_PAGE_SIZE;
  // زبان‌هایی که باید زیرِ هر لغت ترجمه‌شون نشون داده بشه: همون زبان‌های
  // مقصدی که کاربر بالای صفحه انتخاب/مرتب کرده (targetLangs)، منهای خودِ
  // انگلیسی (چون انگلیسی همون سرلغته که بالا نشون داده می‌شه و تکرارش
  // بی‌فایده‌ست). اگه به‌هر دلیلی چیزی انتخاب نشده بود، حداقل فارسی رو نشون
  // می‌دیم تا لیست هیچ‌وقت بدون معنی نمونه.
  const displayLangs = (targetLangs && targetLangs.length ? targetLangs.filter((l) => l.code !== "en") : []);
  const effectiveDisplayLangs = displayLangs.length ? displayLangs : [{ code: "fa", label: "فارسی", abbr: "FA" }];

  const q = (query || "").trim().toLowerCase();

  // ترجمه‌های همین لغت‌ها که تا الان (در این نشست، یا از کشِ دائمیِ دستگاه
  // در نشست‌های قبلی) resolve شدن. برای اینکه جستجو بتونه رویِ ترجمه‌ها هم
  // کار کنه — نه فقط متنِ اصلیِ انگلیسی/فارسی — این state رو زودتر از
  // فیلترِ پایین تعریف می‌کنیم (قبلاً پایین‌تر تعریف می‌شد و فقط برایِ
  // «خواندنِ پیوسته‌ی ترجمه‌ها» استفاده می‌شد، پس جستجو اصلاً بهش دسترسی
  // نداشت). WordTargetTranslation با onResolved همین رو پر می‌کنه.
  const [wordTranslationValues, setWordTranslationValues] = useState({}); // { [langCode]: { [wordId]: text } }
  const reportWordTranslation = useCallback((langCode, wordId, value) => {
    setWordTranslationValues((prev) => {
      const langMap = prev[langCode] || {};
      if (langMap[wordId] === value) return prev;
      return { ...prev, [langCode]: { ...langMap, [wordId]: value } };
    });
  }, []);

  // فیلترِ سطح/جستجو رو با useMemo محاسبه می‌کنیم — نه رویِ هر رندر از نو —
  // چون این لیست‌ها (مخصوصاً اسلنگ) می‌تونن چند هزار ردیف داشته باشن؛
  // محاسبه‌ی دوباره‌ش رویِ هر رندر (مثلاً هر بار که کاربر تویِ بازه‌ی
  // «از # تا #» یه رقم تایپ می‌کنه) همون چیزی بود که برنامه رو کند/هنگ
  // می‌کرد. displayLangsKey به‌جای خودِ آرایه‌ی effectiveDisplayLangs تویِ
  // وابستگی‌ها میاد چون اون آرایه هر رندر یه رفرنسِ تازه‌ست (حتی با محتوایِ
  // یکسان) و می‌ذاشت memo هیچ‌وقت واقعاً کار نکنه.
  const displayLangsKey = effectiveDisplayLangs.map((l) => l.code).join(",");
  const filtered = useMemo(() => {
    let list = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
    if (q) {
      list = list.filter((w) => {
        if (w.t) {
          return Object.values(w.t).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
        }
        if (w.en.toLowerCase().includes(q) || w.fa.includes(q)) return true;
        // لغاتی مثلِ DAILY_WORDS/SLANG_WORDS/WORDS_AZ ترجمه‌ی
        // ثابتِ توی دیتا ندارن — ترجمه‌شون فقط لحظه‌ای (lazy) گرفته و کش
        // می‌شه. برای این‌که جستجو رویِ همون ترجمه‌های انتخابیِ کاربر هم
        // جواب بده، هم کشِ زنده‌ی همین رندر (wordTranslationValues) و هم
        // کشِ دائمیِ دستگاه (localStorage، از بازدیدهای قبلی) رو چک می‌کنیم.
        return effectiveDisplayLangs.some((l) => {
          const live = wordTranslationValues[l.code] && wordTranslationValues[l.code][w.id];
          if (live && live.toLowerCase().includes(q)) return true;
          const cached = loadWordTranslation(w.en, l.code);
          return cached && cached.toLowerCase().includes(q);
        });
      });
    }
    // مرتب‌سازی — نگاه کن به GenericSortMenu/WORD_LIST_SORT_OPTIONS بالای
    // فایل. بعد از فیلترِ سطح/جستجو انجام می‌شه تا رویِ همون لیستِ نهاییِ
    // نمایش‌داده‌شده اثر بذاره.
    return sortWordListEntries(list, sortKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, levelFilter, q, wordTranslationValues, displayLangsKey, sortKey]);

  // به‌جای اسکرولِ بی‌نهایت، چون تعدادِ لغات خیلی زیاده، کاربر یه بازه‌ی
  // عددی («از # تا #») مشخص می‌کنه و فقط همون بخش از لیست رندر می‌شه.
  // ورودی‌ها رو به‌صورتِ رشته (نه عدد) نگه می‌داریم و پیش‌فرض خالی‌ان — اگه
  // مستقیم به عددِ ثابتِ ۱ ست بشن، همین که کاربر فیلد رو خالی کنه تا عددِ
  // جدید تایپ کنه، فوراً دوباره ۱ می‌شه و اصلاً نمی‌شه چیزی توش تایپ کرد
  // (باگی که قبلاً باعث می‌شد ستونِ «تا» همیشه رویِ ۱ بمونه). محدودکردنِ
  // مقدار به بازه‌ی معتبر فقط موقعِ خروج از فیلد (onBlur) انجام می‌شه، نه
  // حینِ تایپ.
  const [rangeFromInput, setRangeFromInput] = useState("");
  const [rangeToInput, setRangeToInput] = useState("");
  // مرزِ بالاییِ «خودکار» — با اسکرولِ کاربر به تهِ بخشِ فعلی، این مقدار
  // خودش effectivePageSize واحد زیاد می‌شه (اسکرولِ بی‌نهایتِ واقعی، بدون
  // نیاز به تایپِ عدد). فقط وقتی کاربر خودش چیزی تو فیلدِ «تا» تایپ/درگ
  // کنه (rangeToInput غیرخالی بشه)، اون مقدارِ دستی اولویت پیدا می‌کنه و
  // این مقدارِ خودکار نادیده گرفته می‌شه — تا وقتی که دوباره جستجو/فیلتر
  // عوض بشه و همه‌چیز ریست بشه.
  const [autoLoadedTo, setAutoLoadedTo] = useState(effectivePageSize);
  useEffect(() => {
    setRangeFromInput("");
    setRangeToInput("");
    setAutoLoadedTo(effectivePageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, levelFilter, words, effectivePageSize]);

  const defaultRangeTo = Math.min(filtered.length, autoLoadedTo) || filtered.length || 1;
  const parsedFrom = parseInt(rangeFromInput, 10);
  const parsedTo = parseInt(rangeToInput, 10);
  const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
  const effTo = Number.isNaN(parsedTo) ? defaultRangeTo : parsedTo;
  const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(filtered.length, 1));
  const clampedTo = Math.min(Math.max(clampedFrom, effTo), filtered.length || clampedFrom);
  const visible = filtered.slice(clampedFrom - 1, clampedTo);

  // اسکرولِ بی‌نهایتِ واقعی: یه سنتینلِ نامرئی زیرِ آخرین ردیفِ رندرشده
  // می‌ذاریم؛ همین که وارد دیدِ کاربر بشه (یعنی به تهِ لیستِ فعلی رسیده)،
  // با IntersectionObserver دسته‌ی بعدی رو خودکار اضافه می‌کنیم. این‌جوری
  // هم فقط effectivePageSize ردیف در هر لحظه رندر می‌شه (پایداری/سرعت،
  // چه لیست ۶۰ تایی باشه چه ۲۲۶۸ تایی مثلِ Vocabulary in Use)، هم کاربر
  // با اسکرولِ ساده، بدون هیچ تایپِ عددی، نهایتاً به همه‌ی لغات می‌رسه.
  const loadMoreRef = useRef(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setAutoLoadedTo((prev) => Math.min(prev + effectivePageSize, filtered.length));
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, effectivePageSize, clampedTo]);

  // -----------------------------------------------------------------------
  // ردیابیِ خوانده‌شده/خوانده‌نشده — به ازای همین تب (listId) روی دستگاه
  // ذخیره می‌شه تا کاربر بفهمه کدوم لغات رو قبلاً مرور کرده.
  const [readIds, setReadIds] = useState(() => loadReadWordIds(listId));
  useEffect(() => {
    setReadIds(loadReadWordIds(listId));
  }, [listId]);
  const toggleWordRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(listId, next);
      return next;
    });
  };
  const markRangeRead = (read) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      visible.forEach((w) => {
        if (read) next.add(w.id);
        else next.delete(w.id);
      });
      saveReadWordIds(listId, next);
      return next;
    });
  };
  const readCountInRange = visible.filter((w) => readIds.has(w.id)).length;
  // این یکی رویِ کلِ لیستِ فیلترشده حساب می‌شه (نه فقط بازه‌ی دیده‌شده)، پس
  // با useMemo فقط وقتی filtered یا readIds واقعاً عوض بشن دوباره محاسبه
  // می‌شه — نه رویِ هر رندر (مثلاً هر تایپ تویِ فیلدهای بازه).
  const readCountTotal = useMemo(() => filtered.filter((w) => readIds.has(w.id)).length, [filtered, readIds]);

  const autoplayItems = visible.map((w) => ({ id: w.id, text: w.en, code: "en" }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  // متنِ کاملِ «خواندنِ همه‌ی این لیست» — همون الگویی که داستان‌ساز و
  // مکالمات روزمره دارن، اینجا هم برای لیستِ لغات. فقط همون بازه‌ی
  // انتخاب‌شده (از # تا #) خونده می‌شه، نه کلِ لیستِ فیلترشده — هم چون
  // منطقی‌تره (کاربر همون بازه رو می‌بینه)، هم چون ساختنِ این متن برایِ
  // کلِ لیست (که می‌تونه چند هزار لغت باشه) رویِ هر رندر محاسبه می‌شد و
  // خودش یکی از عواملِ اصلیِ کندی/هنگِ صفحه بود.
  //
  // نکته‌ی مهم: برخلافِ داستان‌ساز/مکالمات (که خط‌هاشون خودشون نقطه‌ی پایانِ
  // جمله دارن و همین باعث می‌شه speechController هر خط رو یه «جمله»ی
  // جدا و مستقل حساب کنه)، این‌جا فقط کلمه‌های تک‌افتاده‌ی بدونِ علامتِ
  // نگارشی پشتِ‌سرِ‌همن. speechController اگه یه بلوکِ متنِ بدونِ نقطه رو
  // خیلی طولانی ببینه، مجبور می‌شه به‌صورتِ اضطراری هر ۴۰ کلمه رو یه‌جا تو
  // یه chunk بریزه (MAX_WORDS_PER_CHUNK) — یعنی هایلایت/اسکرول فقط هر ۴۰
  // کلمه یه‌بار به‌روز می‌شد، و چون این ۴۰ کلمه همه با هم توی یه نفس (یه
  // Utterance) خونده می‌شدن، برای کاربر مثلِ این بود که کلمه‌ها خیلی سریع
  // و بدونِ هیچ هایلایتِ قابلِ‌دنبال‌کردنی رد می‌شن. برای همین این‌جا بینِ
  // هر کلمه یه نقطه می‌ذاریم — این‌جوری خودِ همون منطقِ تقسیمِ جمله‌ایِ
  // speechController هر کلمه رو یه جمله‌ی مستقل حساب می‌کنه: هم چانک/آفست
  // دقیقاً روی همون کلمه می‌ایسته (هایلایتِ لحظه‌به‌لحظه‌ی هر کلمه)، هم بینِ
  // دو کلمه همون مکثِ طبیعیِ بینِ‌جمله‌ای (sentenceGapMs) میفته که سرعتِ
  // خوندن رو قابلِ‌دنبال‌کردن می‌کنه.
  const fullText = visible.map((w) => w.en).join(". ") + (visible.length ? "." : "");
  const wordOffsets = useMemo(() => {
    let offset = 0;
    return visible.map((w, idx) => {
      const start = offset;
      offset += w.en.length;
      const end = offset;
      offset += idx < visible.length - 1 ? 2 : 1; // "." یا ". " بینِ کلمه‌ها
      return { id: w.id, start, end };
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
  // می‌شه — هم برای هایلایتِ بصریِ زنده‌ی کارتِ لغت (لغت + همه‌ی ترجمه‌هاش)
  // و هم برای اسکرولِ خودکار استفاده می‌شه.
  const [activeWordId, setActiveWordId] = useState(null);
  useEffect(() => {
    const myKey = `en-US::${fullText}`;
    const update = (state) => {
      if (!fullText || state.key !== myKey || state.status === "idle") {
        setActiveWordId(null);
        return;
      }
      const offset = speechController.getCharOffset();
      let found = wordOffsets[0] || null;
      for (const w of wordOffsets) {
        if (offset >= w.start) found = w;
        else break;
      }
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

  // لانگ‌پرسِ یه لغت توی «لغات ذخیره‌شده» → دقیقاً همون ردیف اینجا (نه فقط
  // همون تب) هایلایت و بهش اسکرول می‌شه. jumpTarget ={ id, token } از
  // PhrasebookMain میاد؛ token فقط برای این‌که هر لانگ‌پرسِ تازه (حتی روی
  // همون لغتِ قبلی) یه افکتِ جدید بشه. اول باید مطمئن بشیم لغتِ موردنظر
  // توی بازه‌ی فعلی (rangeFrom..rangeTo) قرار داره، وگرنه هنوز رندر نشده —
  // پس در صورتِ نیاز، بازه رو طوری تنظیم می‌کنیم که خودِ همون لغت را دربر بگیره.
  const [justJumpedId, setJustJumpedId] = useState(null);
  useEffect(() => {
    if (!jumpTarget || jumpTarget.id == null) return;
    const idx = filtered.findIndex((w) => w.id === jumpTarget.id);
    if (idx === -1) return; // با این فیلتر/جستجو، این لغت دیده نمی‌شه
    // نکته‌ی مهم: onJumpToOrigin معمولاً هم‌زمان با تنظیمِ jumpTarget، جستجو
    // و فیلترِ سطح رو هم پاک می‌کنه (setQuery("")/setLevelFilter("all")) تا
    // چیزی لغتِ موردنظر رو قایم نکنه. اون تغییر، افکتِ بالاتر (ریستِ بازه
    // رویِ تغییرِ q/levelFilter) رو هم هم‌زمان (توی همون batch) فعال می‌کنه.
    // با functional updater روی رنج، همیشه رویِ آخرین مقدارِ صف‌شده حساب
    // می‌کنیم، پس این ریستِ هم‌زمان دیگه نمی‌تونه رویِ گسترشِ لازم رو بپوشونه.
    setRangeFromInput((prev) => {
      const prevNum = parseInt(prev, 10);
      const effPrev = Number.isNaN(prevNum) ? 1 : prevNum;
      return idx + 1 < effPrev ? "1" : prev;
    });
    setRangeToInput((prev) => {
      const prevNum = parseInt(prev, 10);
      const effPrev = Number.isNaN(prevNum) ? Math.min(filtered.length, effectivePageSize) || filtered.length || 1 : prevNum;
      return String(Math.max(effPrev, Math.min(idx + 1, filtered.length)));
    });
    setJustJumpedId(jumpTarget.id);
    const t = setTimeout(() => setJustJumpedId(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget?.token]);
  useEffect(() => {
    if (justJumpedId == null) return;
    const node = listNodeMapRef.current.get(String(justJumpedId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [justJumpedId, rangeFromInput, rangeToInput]);

  // -------------------------------------------------------------------------
  // «خواندنِ پیوسته‌ی ترجمه‌ها» — طبق درخواست، همون سیستمِ بالا (fullText +
  // wordOffsets + activeWordId + اسکرولِ خودکار) برایِ متنِ اصلیِ انگلیسی،
  // این‌جا هم برایِ هر زبانِ ترجمه‌ی هدف (effectiveDisplayLangs) جدا جدا
  // پیاده می‌شه. چون ترجمه‌ی هر لغت lazy و async لود می‌شه
  // (WordTargetTranslation)، نمی‌شه از قبل fullText رو ساخت؛ به‌جاش هر
  // لغت، به محضِ آماده‌شدنِ ترجمه‌ش، از طریق onResolveTranslation به بالا
  // خبر می‌ده و اینجا، از رویِ مقادیرِ جمع‌شده، fullText/آفستِ هر زبان
  // ساخته می‌شه.
  // (wordTranslationValues/reportWordTranslation حالا بالاترِ همین تابع،
  // کنارِ فیلترِ جستجو، تعریف شدن — تا جستجو هم بتونه ازشون استفاده کنه.)

  const wordTranslationInfo = useMemo(() => {
    const info = {};
    effectiveDisplayLangs.forEach((l) => {
      const langMap = wordTranslationValues[l.code] || {};
      // نکته‌ی مهم (عیناً همون دلیلی که fullText/wordOffsetsِ لیستِ انگلیسیِ
      // بالا بینِ لغت‌ها نقطه می‌ذاره): لغاتِ ترجمه‌شده هم مثلِ خودِ لغتِ
      // انگلیسی هیچ علامتِ‌نگارشیِ پایانی ندارن. اگه اینجا فقط با یه فاصله
      // به‌هم بچسبونیمشون، speechController کلِ رشته رو یه «جمله»ی
      // غیرعادی‌بلند می‌بینه و مجبور می‌شه هر ۴۰ لغت رو یه‌جا (یه نفس) بخونه
      // (MAX_WORDS_PER_CHUNK) — هم خیلی سریع/نامفهوم می‌شه، هم هایلایت/اسکرول
      // فقط هر ۴۰ لغت یه‌بار به‌روز می‌شه (تو لیست‌های کوتاه‌تر از ۴۰ اصلاً
      // انگار کاری نمی‌کنه). با گذاشتنِ «.» بینِ لغت‌ها، هر ترجمه دقیقاً مثلِ
      // خودِ لغتِ انگلیسی یه جمله‌ی مستقل حساب می‌شه.
      const entries = visible.filter((w) => langMap[w.id]);
      let offset = 0;
      const parts = [];
      const offsets = [];
      entries.forEach((w, idx) => {
        const val = langMap[w.id];
        const start = offset;
        parts.push(val);
        offset += val.length;
        offsets.push({ id: w.id, start, end: offset });
        offset += idx < entries.length - 1 ? 2 : 1; // "." یا ". " بینِ لغت‌ها
      });
      info[l.code] = { fullText: parts.join(". ") + (entries.length ? "." : ""), offsets };
    });
    return info;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDisplayLangs, wordTranslationValues, visible]);

  // لغت/زبانی که همین الان، در حینِ پخشِ پیوسته‌ی ترجمه‌های یک زبان، داره
  // خونده می‌شه — {code, id} | null.
  const [activeWordTranslation, setActiveWordTranslation] = useState(null);
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveWordTranslation(null);
        return;
      }
      for (const l of effectiveDisplayLangs) {
        const info = wordTranslationInfo[l.code];
        if (!info || !info.fullText) continue;
        const myKey = `${TTS_LOCALE[l.code] || "en-US"}::${info.fullText}`;
        if (state.key !== myKey) continue;
        const offset = speechController.getCharOffset();
        let found = info.offsets[0] || null;
        for (const w of info.offsets) {
          if (offset >= w.start) found = w;
          else break;
        }
        setActiveWordTranslation((prev) => {
          if (prev && prev.code === l.code && found && prev.id === found.id) return prev;
          return found ? { code: l.code, id: found.id } : null;
        });
        return;
      }
      setActiveWordTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [effectiveDisplayLangs, wordTranslationInfo]);

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? tr("noWordsForSearch", uiLang) : emptyText || tr("noWordsToShow", uiLang)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* کنترلِ بازه‌ی نمایش («از # تا #») + وضعیتِ خوانده‌شده — چون تعدادِ
          لغات این لیست زیاده، به‌جای اسکرولِ بی‌نهایت، کاربر خودش مشخص
          می‌کنه کدوم بازه رو ببینه. همون ظاهرِ progress-card طرحِ مرجع:
          کارتِ سفیدِ گرد با سایه، به‌جای جعبه‌ی تختِ paperDark قبلی. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>
        <RangeSliderFilter
          min={1}
          max={filtered.length}
          from={clampedFrom}
          to={clampedTo}
          onFromChange={(val) => setRangeFromInput(val)}
          onToChange={(val) => setRangeToInput(val)}
          readCount={readCountInRange}
          totalInRange={visible.length}
          readCountTotal={readCountTotal}
          label={uiLang === "en" ? "Dictionary" : "دیکشنری"}
          uiLang={uiLang}
          colors={colors}
        />
        <div className="flex items-center gap-2 flex-wrap" style={{ direction: uiLang === "en" ? "ltr" : "rtl" }}>
          <button
            type="button"
            onClick={() => markRangeRead(true)}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, border: "1px solid #CFE6DF", background: "#EAF4F1", color: colors.teal, cursor: "pointer" }}
          >
            {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
          </button>
          <button
            type="button"
            onClick={() => markRangeRead(false)}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, border: `1px solid ${colors.cardBorder}`, background: colors.paper, color: colors.teal, cursor: "pointer" }}
          >
            {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
          </button>
        </div>
      </div>
      {visible.map((w) => {
        const isRead = readIds.has(w.id);
        return (
        <div
          key={w.id}
          ref={(el) => {
            registerRef(w.id)(el);
            registerListRef(w.id)(el);
          }}
          className="flex items-center justify-between p-3"
          style={{
            position: "relative",
            borderRadius: 14,
            background: isRead ? READ_DONE_GRADIENT : "white",
            border: `1px solid ${highlightBg(highlightColor, justJumpedId === w.id, isRead ? READ_DONE_BORDER : colors.cardBorder)}`,
            boxShadow:
              justJumpedId === w.id && highlightColor !== "none"
                ? `0 0 0 2px ${highlightColor || READ_MARKER_COLOR}`
                : isRead
                ? READ_DONE_SHADOW
                : "none",
            transition: "border-color 0.4s ease, box-shadow 0.4s ease, background-color 0.3s ease",
          }}
        >
          <button
            onClick={() => toggleWordRead(w.id)}
            aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
            style={{
              marginLeft: 4,
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: isRead ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
              background: isRead ? READ_DONE_CHECK_GRADIENT : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRead && <Check size={13} color="white" strokeWidth={3} />}
          </button>
          <button onClick={() => toggleWordFavorite(w.id)} aria-label={tr("addToFavoritesAria", uiLang)} style={{ marginLeft: 4, flexShrink: 0 }}>
            <Star size={20} color={STAR_FAVORITE_COLOR} fill={wordFavorites.has(w.id) ? STAR_FAVORITE_COLOR : "none"} />
          </button>
          <div className="flex-1">
            {/* لغت + نشان‌های سطح/نوع توی یه زیرجعبه‌ی flex-wrap جدا هستن، و
                خودِ بلندگو بیرون از اون زیرجعبه، به‌عنوانِ یه خواهر/برادرِ
                ثابت — این‌جوری هر چقدرم لغت بلند باشه و نشان‌ها به خط بعد
                بیفتن، بلندگو همیشه دقیقاً روی یه ستونِ ثابت (لبه‌ی راستِ
                ردیف) می‌مونه، هم‌راستا با بلندگوهای ردیف‌های ترجمه‌ی زیرش. */}
            <div className="flex items-start gap-2" style={{ direction: "ltr" }}>
              <div className="flex items-center flex-wrap gap-2" style={{ flex: 1 }}>
                {/* هایلایتِ «همین الان داره خونده می‌شه» — دقیقاً همون مارکرِ
                    زردِ تنگِ دورِ خودِ متن که تو داستان‌ساز و مکالمات روزمره
                    هست، نه یه باکسِ تمام‌عرض دورِ کل ردیف. */}
                <span
                  style={{
                    backgroundColor: highlightBg(highlightColor, activeWordId === w.id),
                    borderRadius: 5,
                    padding: activeWordId === w.id ? "2px 4px" : "2px 0",
                    WebkitBoxDecorationBreak: "clone",
                    boxDecorationBreak: "clone",
                    transition: "background-color 0.35s ease",
                  }}
                >
                  <ClickableSentence
                    text={w.en}
                    langCode="en"
                    nativeLang={nativeLang}
                    aiSettings={aiSettings}
                    color={mainTextColor}
                    fontFamily={fontLatin}
                    fontWeight={800}
                    fontSize={19}
                    originExtra={{ id: w.id }}
                    // همون مکانیزمِ «نقطه‌ی ادامه»ای که داستان‌ساز داره
                    // (storyBaseOffset/onSpeakOffset → rememberMainTextResumeOffset)
                    // اینجا هم وصل می‌شه: با زدنِ 🔊ِ همین لغت از پاپ‌آپ، نقطه‌ش
                    // به‌خاطر سپرده می‌شه تا دفعه‌ی بعد که دکمه‌ی پخشِ کلِ لیست
                    // (روی پلیرِ پایین) زده بشه، از همین‌جا ادامه پیدا کنه — قبلاً
                    // این وایرینگ فقط توی داستان‌ساز بود، نه لیستِ لغات.
                    storyBaseOffset={wordOffsets.find((o) => o.id === w.id)?.start ?? 0}
                    onSpeakOffset={(localEnd) =>
                      rememberMainTextResumeOffset(`${TTS_LOCALE.en || "en-US"}::${fullText}`, (wordOffsets.find((o) => o.id === w.id)?.start ?? 0) + (localEnd || 0))
                    }
                  />
                </span>
                {w.level && <LevelBadge level={w.level} />}
                {w.isUserSaved && (
                  <span
                    style={{
                      fontFamily: uiLang === "en" ? fontLatin : fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.rose,
                      border: `1px solid ${colors.rose}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {tr("personalBadge", uiLang)}
                  </span>
                )}
                {w.pos && (
                  <span
                    style={{
                      fontFamily: uiLang === "en" ? fontLatin : fontFa,
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.teal,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 6,
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {posLabel(w.pos, uiLang)}
                  </span>
                )}
              </div>
              <SpeakButton
                text={w.en}
                code="en"
                color={colors.teal}
                edge="end"
                fullText={fullText}
                startOffset={wordOffsets.find((o) => o.id === w.id)?.start}
              />
            </div>
            {/* ترجمه‌ی این لغت به همه‌ی زبان‌های مقصدِ انتخاب‌شده — نه فقط
                فارسی. رنگ متن‌ها مشکی و پررنگه (نه رنگ‌های کم‌کنتراست) تا
                خوندنش چشم رو خسته نکنه. */}
            <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
              {effectiveDisplayLangs.map((l) => {
                const info = wordTranslationInfo[l.code];
                const isTransActive = !!(activeWordTranslation && activeWordTranslation.code === l.code && activeWordTranslation.id === w.id);
                return (
                  <WordTargetTranslation
                    key={l.code}
                    word={w.en}
                    wordId={w.id}
                    pos={w.pos}
                    langCode={l.code}
                    abbr={l.abbr}
                    knownText={l.code === "fa" ? w.fa : ""}
                    nativeLang={nativeLang}
                    nativeLabel={nativeLabel}
                    aiSettings={aiSettings}
                    ClickableSentence={ClickableSentence}
                    fullText={info ? info.fullText : ""}
                    lineOffsets={info ? info.offsets : []}
                    isActiveLine={isTransActive}
                    autoScrollActive={autoScrollActive}
                    highlightColor={highlightColor}
                    onResolved={reportWordTranslation}
                  />
                );
              })}
            </div>
            {/* مثال/کالوکیشنِ خودِ دیتا (فقط لغاتی که این فیلدها رو دارن،
                مثلِ تبِ «Vocabulary in Use» — بقیه‌ی لیست‌ها این فیلد رو
                ندارن، پس این بخش خودکار مخفی می‌مونه). این جدا از
                WordExamples پایینه که مثالِ زنده با AI می‌سازه؛ اینجا
                همون مثال/کالوکیشنِ ثابتِ نویسنده‌ی کتابه — با
                direction:"ltr"ِ صریح (چپ‌به‌راستِ درست، نه راست‌چین‌شده به‌خاطرِ
                ریشه‌یِ rtlِ اپ)، بلندگویِ خودش (لبه‌ی راست، هم‌راستا با بقیه‌ی
                ردیف‌ها)، و ترجمه‌ی زنده‌ی جمله‌ی مثال به هر زبانِ مقصدی که
                کاربر بالای صفحه انتخاب کرده. */}
            {(w.collocation || w.example) && (
              <VocabBookExample
                collocation={w.collocation}
                example={w.example}
                targetLangs={effectiveDisplayLangs}
                aiSettings={aiSettings}
                nativeLang={nativeLang}
                ClickableSentence={ClickableSentence}
              />
            )}
            <WordExamples word={w.en} langCode="en" meaningNative={w.fa} nativeLang={nativeLang} targetLangs={effectiveDisplayLangs} aiSettings={aiSettings} />
          </div>
        </div>
        );
      })}
      {/* سنتینلِ نامرئیِ اسکرولِ بی‌نهایت — فقط وقتی چیزی برای لود شدن مونده
          رندر می‌شه؛ ورودش به دیدِ کاربر (بالاتر، با IntersectionObserver)
          دسته‌ی بعدی رو خودکار اضافه می‌کنه. */}
      {clampedTo < filtered.length && <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} />}
    </div>
  );
});

// ---------------------------------------------------------------------------
// یک ردیف ترجمه‌ی یک لغت به یک زبان مقصد. اگه ترجمه‌اش از قبل معلومه
// (فارسی — چون تو خودِ دیتای لغت هست) همون رو مستقیم نشون می‌ده؛ وگرنه اول
// از کش دستگاه می‌خونه و اگه نبود، لحظه‌ای با translateFree می‌گیره و کش
// می‌کنه (تا دفعه‌ی بعد دیگه درخواستی به سرور نره). متن با رنگ مشکی‌پررنگ
// (colors.ink) و bold نشون داده می‌شه — نه رنگ‌های کم‌کنتراست — تا خوندنِ
// پشت‌سرهمِ چند زبان چشم رو خسته نکنه.
function WordTargetTranslation({ word, wordId, pos, langCode, abbr, knownText, nativeLang, nativeLabel, aiSettings, ClickableSentence, fullText, lineOffsets, isActiveLine, autoScrollActive, highlightColor, onResolved }) {
  const [text, setText] = useState(knownText || (() => loadWordTranslation(word, langCode)));
  // 🔁 دکمه‌ی «ترجمه‌ی این ردیف اشتباهه، دوباره امتحان کن» — چون گاهی سرویس‌های
  // رایگان برای یک زبونِ خاص (نه همه) همیشه یه جوابِ غلط/تکراری برمی‌گردونن
  // (مثلاً به‌خاطرِ فیلترینگ یا محدودیتِ خودِ اون سرویس برای اون زبون)، و
  // منتظرِ رفع‌شدنِ خودکارش موندن ممکنه هیچ‌وقت جواب نده. این دکمه به‌جایِ
  // چرخه‌ی معمولیِ ۴ سرویسِ رایگان (که همین الان همون جوابِ غلط رو دادن)،
  // مستقیم سراغِ بک‌اندِ AI خودِ اپ می‌ره (اگه در دسترس باشه) — شانسِ بیشتری
  // برایِ گرفتنِ جوابِ درست داره؛ و فقط اگه نتیجه از تستِ رایگانِ
  // looksLikelyMistranslated رد بشه کش/نمایش می‌شه، وگرنه به‌جایِ ذخیره‌یِ
  // یه غلطِ دیگه، فقط یه پیامِ کوتاهِ خطا نشون می‌ده.
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryFailed(false);
    try {
      let result = aiSettings ? await translateViaAI(word, langCode, "en", aiSettings).catch(() => null) : null;
      if (!result) {
        result = await translateFree(word, langCode, "en", aiSettings, true);
      }
      if (result && !looksLikelyMistranslated(word, result, langCode, "en")) {
        setText(result);
        saveWordTranslation(word, langCode, result);
      } else {
        setRetryFailed(true);
      }
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }, [retrying, word, langCode, aiSettings]);

  useEffect(() => {
    if (knownText) {
      setText(knownText);
      return;
    }
    // ⛔️ رفعِ باگِ «ترجمه‌ی قدیمیِ غلط که برای همیشه گیر می‌کرد»: قبلاً هرچی
    // از این کشِ localStorage (که بینِ همه‌ی تب‌ها مشترکه و فقط با
    // langCode+word کلید می‌شه) می‌اومد، بدونِ هیچ چکی مستقیم نشون داده
    // می‌شد — برخلافِ کشِ IndexedDBِ داخلِ translateFree که قبل از
    // نمایش/کش‌شدن، looksLikelyMistranslated رو چک می‌کنه. نتیجه: اگه یه
    // لغت (مثلاً routine) یه‌بار قبل‌تر (مثلاً موقعی که همه‌ی سرویس‌های
    // ترجمه شکست خورده بودن) با متنِ انگلیسیِ ترجمه‌نشده تو همین کش
    // ذخیره شده باشه، از اون به بعد برای همیشه همون غلط نشون داده می‌شد،
    // چون اصلاً دوباره سراغِ شبکه نمی‌رفت. حالا همون تستِ رایگان رو اینجا
    // هم اعمال می‌کنیم؛ اگه کشِ قدیمی مشکوک بود، نادیده‌ش می‌گیریم و مثلِ
    // حالتِ «کش نداریم» می‌ریم سراغِ translateFree — که خودش دوباره کش
    // می‌کنه (این‌بار با نتیجه‌ی تازه و چک‌شده).
    const cached = loadWordTranslation(word, langCode);
    if (cached && !looksLikelyMistranslated(word, cached, langCode, "en")) {
      setText(cached);
      return;
    }
    let cancelled = false;
    // slang/idiom بیشترین ریسکِ ترجمه‌ی غلطِ معنایی رو دارن (مثل gaslighter)
    // چون معمولاً تحت‌اللفظی نیستن — فقط برای این‌ها همیشه AI چک می‌کنه؛
    // برای بقیه‌ی انواعِ کلمه (noun/verb/...) همون هیوریستیکِ رایگانِ
    // translateFree کافیه، تا حجمِ زیادِ این دیتاست‌ها توکنِ زیادی نخوره.
    const forceVerify = pos === "slang" || pos === "idiom";
    translateFree(word, langCode, "en", aiSettings, forceVerify)
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

  // به محضِ آماده‌شدنِ ترجمه، به بالا (WordList) خبر می‌دیم — والد از رویِ
  // این مقادیر، «متنِ کاملِ ترجمه‌ها»یِ همین زبان رو می‌سازه تا زدنِ بلندگوی
  // هر لغت، دقیقاً مثلِ لیستِ اصلیِ انگلیسی، از همون‌جا وارد پخشِ پیوسته و
  // خودکارِ همه‌ی لغاتِ بعدی بشه (با اسکرول و هایلایتِ خودکار).
  useEffect(() => {
    if (text && onResolved && wordId != null) {
      onResolved(langCode, wordId, text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, langCode, wordId]);

  const rowRef = useRef(null);
  useEffect(() => {
    if (!autoScrollActive || !isActiveLine) return;
    if (rowRef.current && rowRef.current.scrollIntoView) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, isActiveLine]);

  const myOffset = lineOffsets && lineOffsets.find((o) => o.id === wordId);
  const highlightStyle = {
    backgroundColor: highlightBg(highlightColor, isActiveLine),
    borderRadius: 5,
    padding: isActiveLine ? "2px 4px" : "2px 0",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
    transition: "background-color 0.35s ease",
  };

  return (
    <div ref={rowRef} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
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
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft, ...highlightStyle }}>
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
            <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.inkSoft, ...highlightStyle }}>{text}</p>
          )}
          <SpeakButton
            text={text}
            code={langCode}
            color={colors.teal}
            edge="end"
            fullText={fullText}
            startOffset={myOffset ? myOffset.start : undefined}
          />
          <button
            onClick={handleRetry}
            disabled={retrying}
            title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
            aria-label="ترجمه‌ی دوباره"
            style={{ background: "none", border: "none", padding: 4, flexShrink: 0, cursor: retrying ? "default" : "pointer", display: "flex", alignItems: "center" }}
          >
            {retrying ? <Loader2 size={13} className="spin" color={colors.inkSoft} /> : <RotateCcw size={13} color={colors.inkSoft} style={{ opacity: 0.6 }} />}
          </button>
        </>
      ) : (
        <p style={{ flex: 1, fontSize: 12, color: colors.inkSoft }}>در حال ترجمه...</p>
      )}
      {retryFailed && (
        <span style={{ fontSize: 10, color: colors.rose, flexShrink: 0 }}>هنوز جواب درست نگرفتیم</span>
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
// ---------------------------------------------------------------------------
// ترجمه‌ی جمله‌یِ مثال/کالوکیشنِ ثابتِ کتاب (تبِ «Vocabulary in Use») به یک
// زبانِ مقصدِ مشخص — دقیقاً همون الگویِ WordExampleTranslationLine (بالاتر)
// برای مثال‌هایِ AI-ساز، فقط این‌جا به‌جایِ کشِ example.translations، از همون
// کشِ سراسریِ loadWordTranslation/saveWordTranslation استفاده می‌کنه (متنِ
// جمله رو نرمالایز و کلید می‌کنه) — چون این جمله‌ها ثابتِ دیتان، نه رکوردِ
// AI با id.
function VocabBookExampleTranslation({ text, targetLang, abbr, aiSettings }) {
  // ⛔️ همون فیکسِ WordTargetTranslation (بالاتر) اینجا هم لازم بود: قبلاً
  // نتیجه‌ی translateFree — چه از کش، چه تازه — بدونِ هیچ چکی مستقیم
  // ست/کش می‌شد. وقتی همه‌ی سرویس‌های ترجمه برای یه جمله (که معمولاً از
  // خودِ تکِ‌کلمه طولانی‌تره و شانسِ تایم‌اوت/شکست‌ش بیشتره) شکست می‌خوردن،
  // translateFree به‌جای throw، خودِ متنِ انگلیسیِ اصلی رو برمی‌گردوند —
  // نتیجه: همون جمله‌ی انگلیسی، بدونِ ترجمه، زیرِ برچسبِ زبونِ مقصد (مثلاً
  // KO) نشون داده و برای همیشه تو localStorage کش می‌شد. حالا دقیقاً مثلِ
  // WordTargetTranslation، هم موقعِ خوندنِ کش و هم موقعِ ذخیره‌ی نتیجه‌ی تازه،
  // با looksLikelyMistranslated چک می‌شه؛ اگه مشکوک بود (مثلاً عیناً همون
  // متنِ مبدأ)، نه نشون داده می‌شه نه کش — دوباره سراغِ شبکه می‌ره.
  const [translation, setTranslation] = useState(() => {
    const cached = loadWordTranslation(text, targetLang);
    return cached && !looksLikelyMistranslated(text, cached, targetLang, "en") ? cached : "";
  });
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryFailed(false);
    try {
      let result = aiSettings ? await translateViaAI(text, targetLang, "en", aiSettings).catch(() => null) : null;
      if (!result) {
        result = await translateFree(text, targetLang, "en", aiSettings, true);
      }
      if (result && !looksLikelyMistranslated(text, result, targetLang, "en")) {
        setTranslation(result);
        saveWordTranslation(text, targetLang, result);
      } else {
        setRetryFailed(true);
      }
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }, [retrying, text, targetLang, aiSettings]);

  useEffect(() => {
    const cached = loadWordTranslation(text, targetLang);
    if (cached && !looksLikelyMistranslated(text, cached, targetLang, "en")) {
      setTranslation(cached);
      return;
    }
    let cancelled = false;
    translateFree(text, targetLang, "en", aiSettings, true)
      .then((t) => {
        if (cancelled || !t) return;
        if (looksLikelyMistranslated(text, t, targetLang, "en")) return; // کش نکن — خودِ سیستمِ ترجمه دوباره امتحان می‌کنه
        setTranslation(t);
        saveWordTranslation(text, targetLang, t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, targetLang]);

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
      <button
        onClick={handleRetry}
        disabled={retrying}
        title="اگه این ترجمه اشتباهه، دوباره امتحان کن"
        aria-label="ترجمه‌ی دوباره"
        style={{ background: "none", border: "none", padding: 4, flexShrink: 0, cursor: retrying ? "default" : "pointer", display: "flex", alignItems: "center" }}
      >
        {retrying ? <Loader2 size={12} className="spin" color={colors.inkSoft} /> : <RotateCcw size={12} color={colors.inkSoft} style={{ opacity: 0.6 }} />}
      </button>
      {retryFailed && (
        <span style={{ fontSize: 10, color: colors.rose, flexShrink: 0 }}>هنوز جواب درست نگرفتیم</span>
      )}
    </div>
  );
}

// کالوکیشن/جمله‌ی مثالِ ثابتِ کتاب — چپ‌به‌راستِ صریح (dir=ltr)، بلندگو روی
// لبه‌ی راستِ ردیف (edge="end"، عیناً مثلِ بقیه‌ی تب‌ها)، و زیرش ترجمه‌ی
// جمله‌ی مثال به هرکدوم از زبان‌های مقصدِ انتخابیِ کاربر — تا بشه متنِ خودِ
// کتاب رو هم مثلِ مثال‌های AI-ساز به هر زبانی ترجمه/شنید.
function VocabBookExample({ collocation, example, targetLangs, aiSettings, nativeLang, ClickableSentence }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: "6px 10px",
        background: colors.paperDark,
        borderRadius: 8,
        borderInlineStart: `3px solid ${colors.teal}`,
      }}
    >
      {collocation && (
        <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
          <p style={{ flex: 1, margin: 0, fontSize: 12 }}>
            <ClickableSentence
              text={collocation}
              langCode="en"
              nativeLang={nativeLang}
              aiSettings={aiSettings}
              color={colors.teal}
              fontWeight={700}
              fontSize={12}
            />
          </p>
          <SpeakButton text={collocation} code="en" color={colors.teal} edge="end" />
        </div>
      )}
      {example && (
        <div className="flex items-center gap-2" style={{ marginTop: collocation ? 4 : 0, direction: "ltr" }}>
          <p style={{ flex: 1, margin: 0, fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}>
            <ClickableSentence
              text={example}
              langCode="en"
              nativeLang={nativeLang}
              aiSettings={aiSettings}
              color={colors.inkSoft}
              fontSize={12.5}
            />
          </p>
          <SpeakButton text={example} code="en" color={colors.teal} edge="end" />
        </div>
      )}
      {example &&
        (targetLangs || []).map((l) => (
          <VocabBookExampleTranslation key={l.code} text={example} targetLang={l.code} abbr={l.abbr} aiSettings={aiSettings} />
        ))}
    </div>
  );
}

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
        <WordExampleRow key={ex.id} example={ex} word={word} langCode={langCode} nativeLang={nativeLang} nativeLabel={nativeLabel} targetLangs={targetLangs} aiSettings={aiSettings} />
      ))}
    </div>
  );
}

// ترجمه‌ی خودِ جمله‌ی مثال به یک زبانِ مقصدِ مشخص — دقیقاً همون الگویی که
// WordTargetTranslation/LineTranslation برای خودِ لغت/جمله استفاده می‌کنن،
// اینجا هم عیناً برای هر کدوم از زبان‌های مقصدِ انتخاب‌شده تکرار می‌شه (نه
// فقط nativeLang) تا مثلاً هم فارسی هم اسپانیایی هم‌زمان دیده بشن.
function WordExampleTranslationLine({ example, word, langCode, targetLang, abbr, aiSettings, nativeLang, nativeLabel }) {
  const [translation, setTranslation] = useState(example.translations?.[targetLang] || "");

  useEffect(() => {
    if (example.translations?.[targetLang]) {
      setTranslation(example.translations[targetLang]);
      return;
    }
    let cancelled = false;
    translateFree(example.text, targetLang, langCode, aiSettings, true)
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
      {/* ClickableSentence به‌جای <p> ساده — تا روی ترجمه‌ی مثال‌های
          AI-ساز هم بشه لغت/محدوده انتخاب کرد و همون پاپ‌آپِ «افزودن به
          داستان بعدی / افزودن به گرامر / افزودن به جعبه‌ی لایتنر» باز
          بشه؛ alignSourceText/alignSourceLang همون تکنیکِ «ترجمه‌ی داخلِ
          جمله»یِ نسخه‌ی اصلیِ مثال رو فعال می‌کنه (دقیقاً همون الگویی که
          برایِ ترجمه‌های داخلِ خودِ داستان استفاده می‌شه). */}
      <div style={{ flex: 1 }}>
        <ClickableSentence
          text={translation}
          langCode={targetLang}
          nativeLang={nativeLang}
          nativeLabel={nativeLabel}
          aiSettings={aiSettings}
          color={translationColor}
          fontWeight={800}
          fontSize={12}
          alignSourceText={example.text}
          alignSourceLang={langCode}
        />
      </div>
      <SpeakButton text={translation} code={targetLang} color={translationColor} edge="end" />
    </div>
  );
}

function WordExampleRow({ example, word, langCode, nativeLang, targetLangs, aiSettings, nativeLabel }) {
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
            nativeLabel={nativeLabel}
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
          nativeLang={nativeLang}
          nativeLabel={nativeLabel}
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

// چیپ‌های فیلترِ سطح برای جعبه‌ی لایتنر: «همه» + جعبه‌های ۱ تا ۴ (جعبه‌ی ۵
// یعنی «بلد شدی»، پس اصلاً تو مرور نمی‌آد). هر چیپ تعدادِ موردهای همون سطح
// رو هم نشون می‌ده.
function LevelFilterChips({ levelFilter, setLevelFilter, levelCounts }) {
  const chips = [
    { key: "all", label: "همه", count: levelCounts.reduce((a, b) => a + b, 0) },
    ...[1, 2, 3, 4].map((lvl) => ({ key: lvl, label: `جعبه‌ی ${lvl}`, count: levelCounts[lvl - 1] })),
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => setLevelFilter(c.key)}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 20,
            border: `1px solid ${levelFilter === c.key ? colors.gold : colors.cardBorder}`,
            backgroundColor: levelFilter === c.key ? colors.gold : "transparent",
            color: levelFilter === c.key ? "white" : colors.inkSoft,
          }}
        >
          {c.label} ({c.count})
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leitner review box
// ---------------------------------------------------------------------------
function ReviewBox({ conversation , boxes, setBoxes, nativeLang, targetLangs, index, setIndex, showAnswer, setShowAnswer }) {
  // نکته‌ی مهمِ رفعِ باگ: boxes[p.id] برای عبارتی که هنوز اصلاً مرور نشده
  // undefined هست، و «undefined < 5» توی جاوااسکریپت به‌جای true، false
  // برمی‌گرده (چون undefined به NaN تبدیل می‌شه و هر مقایسه‌ای با NaN
  // false هست) — یعنی عبارت‌های مرورنشده به‌جای «باید مرور بشن»، اشتباهاً
  // «قبلاً بلدشون بودی» حساب می‌شدن و جعبه همیشه خالی/تمام‌شده نشون
  // می‌داد. با ?? 1 (یعنی جعبه‌ی اول = هنوز مرورنشده) این مشکل حل می‌شه.
  const [levelFilter, setLevelFilter] = useState("all");
  // سطح‌بندی برای مرور: هر آیتم بر اساسِ جعبه‌ش (۱ تا ۵) دسته‌بندی می‌شه —
  // پیش‌فرض همه‌ی سطح‌ها با هم، ولی از سطحِ پایین (تازه/ضعیف) به بالا
  // (مسلط‌تر) مرتب می‌شن تا لغاتی که بیشتر نیاز به مرور دارن زودتر بیان.
  // کاربر هم می‌تونه با چیپ‌های پایین، فقط رویِ یه سطحِ خاص تمرکز کنه.
  const withLevel = conversation .map((p) => ({ p, lvl: boxes[p.id] ?? 1 }));
  const dueAll = withLevel.filter((x) => x.lvl < 5);
  const levelCounts = [1, 2, 3, 4].map((lvl) => dueAll.filter((x) => x.lvl === lvl).length);
  const filtered = levelFilter === "all" ? dueAll : dueAll.filter((x) => x.lvl === levelFilter);
  const active = filtered.sort((a, b) => a.lvl - b.lvl).map((x) => x.p);
  const current = active.length ? active[index % active.length] : null;

  // لغاتِ سفارشیِ لایتنر (که با «افزودن به جعبه‌ی لایتنر» از پاپ‌آپِ لغت
  // اضافه می‌شن) موقعِ افزوده‌شدن فقط ترجمه‌ی همون یه زبونِ مقصدی که اون
  // لحظه باز بوده رو دارن — نه همه‌ی زبون‌های فعال (targetLangs). این‌جا،
  // وقتی کاربر جوابِ کارت رو باز می‌کنه، برای هر زبونِ مقصدِ فعالی که هنوز
  // ترجمه نداره، جدا از خودِ لغت (t[current.langCode]) با translateFree
  // ترجمه می‌گیریم و با fillLeitnerCustomWordTranslation روی همون رکورد
  // پرش می‌کنیم — یعنی این تب هم مثلِ بقیه‌ی جاهای اپ «مولتی‌ترجمه» می‌شه،
  // نه فقط تک‌ترجمه. pendingRef جلویِ درخواستِ تکراری برای یه (لغت،زبون)ِ
  // در حالِ انتظار رو می‌گیره.
  const pendingLeitnerTranslationsRef = useRef(new Set());
  useEffect(() => {
    if (!showAnswer || !current || !current.langCode) return;
    const sourceWord = current.t[current.langCode];
    if (!sourceWord) return;
    (targetLangs || []).forEach((l) => {
      if (l.code === current.langCode || current.t[l.code]) return;
      const key = `${current.id}:${l.code}`;
      if (pendingLeitnerTranslationsRef.current.has(key)) return;
      pendingLeitnerTranslationsRef.current.add(key);
      translateFree(sourceWord, l.code, current.langCode)
        .then((text) => {
          if (text) fillLeitnerCustomWordTranslation(current.id, l.code, text);
        })
        .catch(() => {})
        .finally(() => pendingLeitnerTranslationsRef.current.delete(key));
    });
  }, [showAnswer, current, targetLangs]);

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 mt-6">
        {levelFilter !== "all" && (
          <LevelFilterChips levelFilter={levelFilter} setLevelFilter={setLevelFilter} levelCounts={levelCounts} />
        )}
        <p style={{ textAlign: "center", color: colors.teal, marginTop: 20, fontWeight: 600 }}>
          {levelFilter === "all" ? "همه‌ی عبارات رو بلدی! 🎉" : "چیزی تو این سطح برای مرور نمونده! 🎉"}
        </p>
      </div>
    );
  }
  const currentLevel = boxes[current.id] ?? 1;

  const handle = (knew) => {
    setBoxes((prev) => ({
      ...prev,
      // همینجا هم همون مشکل بود: prev[current.id] برای اولین مرور
      // undefined بود و undefined + 1 می‌شد NaN — با ?? 1 درست می‌شه.
      [current.id]: knew ? Math.min(5, (prev[current.id] ?? 1) + 1) : 1,
    }));
    setShowAnswer(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <LevelFilterChips levelFilter={levelFilter} setLevelFilter={setLevelFilter} levelCounts={levelCounts} />
      <p style={{ fontSize: 12, color: colors.inkSoft }}>
        باقی‌مانده برای مرور: {active.length}
        {" · "}جعبه‌ی {currentLevel} از ۵
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

function LoginScreen({ onAuthenticated, uiLang = "fa" }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const dir = APP_LANGUAGES[uiLang]?.dir || "rtl";
  const loginFont = uiLang === "en" ? fontLatin : fontFa;

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
      setError(tr("googleSignInFailed", uiLang) + (e?.message || tr("tryAgain", uiLang)));
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError(tr("fillAllFields", uiLang));
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
          setNotice(tr("verifyEmailSent", uiLang));
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
      if (/already registered|already exists/i.test(msg)) setError(tr("emailAlreadyRegistered", uiLang));
      else if (/invalid login credentials/i.test(msg)) setError(tr("invalidCredentials", uiLang));
      else if (/email not confirmed/i.test(msg)) setError(tr("emailNotConfirmed", uiLang));
      else setError(msg || tr("genericError", uiLang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir={dir}
      lang={uiLang}
      style={{
        minHeight: "100vh",
        background: colors.paper,
        fontFamily: loginFont,
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
            {mode === "signup" ? tr("signupTitle", uiLang) : tr("loginTitle", uiLang)}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.inkSoft }}>
            {tr("loginSubtitle", uiLang)}
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
              fontFamily: loginFont,
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
            {tr("continueWithGoogle", uiLang)}
          </button>
        </div>

        <div className="flex items-center gap-2" style={{ margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
          <span style={{ fontSize: 12, color: colors.inkSoft }}>{tr("orWithEmail", uiLang)}</span>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <AuthField icon={<User size={16} />} placeholder={tr("namePlaceholder", uiLang)} value={name} onChange={setName} />
          )}
          <AuthField icon={<Mail size={16} />} placeholder={tr("emailPlaceholder", uiLang)} value={email} onChange={setEmail} type="email" />
          <AuthField
            icon={<Lock size={16} />}
            placeholder={tr("passwordPlaceholder", uiLang)}
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
              background: colors.teal,
              color: colors.paper,
              fontFamily: loginFont,
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
            {mode === "signup" ? tr("signupSubmit", uiLang) : tr("loginSubmit", uiLang)}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: colors.inkSoft }}>
          {mode === "signup" ? tr("haveAccount", uiLang) : tr("noAccount", uiLang)}{" "}
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
              fontFamily: loginFont,
              fontSize: 13,
            }}
          >
            {mode === "signup" ? tr("goToLogin", uiLang) : tr("goToSignup", uiLang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// آدمکِ Lingova — یه شخصیتِ کوچیکِ SVG که بالای هدر، تصادفی راه می‌ره، یه
// چماق دستشه، و حواسش به «خوندن»ه: هر از گاهی می‌ایسته و انگار داره متن رو
// می‌خونه (سرش خم می‌شه پایین)، بعد دوباره یه مقصدِ تصادفیِ دیگه انتخاب
// می‌کنه و راه می‌افته. اگه کاربر چند دقیقه هیچ تعاملی (لمس/اسکرول/کلیک/
// کیبورد) با صفحه نداشته باشه، آدمک وایمیسته، چماق رو بالا می‌گیره، و یه
// حبابِ کوچیکِ یادآوری («بخون دیگه!») نشون می‌ده — تا کاربر دوباره تعامل
// کنه، برمی‌گرده به راه‌رفتنِ عادی.
// ---------------------------------------------------------------------------
const LINGOVA_MASCOT_WIDTH = 30;
const LINGOVA_MASCOT_HEIGHT = 38;
const LINGOVA_IDLE_MS = 6000; // بعدِ این‌قدر بی‌تعاملی، پیام‌های یادآوری فعال می‌شن
const LINGOVA_LEG_MSG_COUNT = 2; // تعدادِ پیامی که تو هر «رفت» یا هر «برگشت» نشون داده می‌شه
const LINGOVA_LEG_MSG_PAUSE_MS = 2000; // مکثِ کوتاهِ نمایشِ هر پیام
// بازه‌ی تصادفیِ فاصله (بر حسبِ میلی‌ثانیه، از لحظه‌ای که کاربر بی‌تعامل
// می‌شه) که هر کدوم از دو پیامِ هر پا سرِ اون لحظه ظاهر می‌شه — کاملاً
// زمان‌محوره، نه موقعیت‌محور، پس به مکانِ آدمک رویِ صفحه (و درنتیجه به
// عرضِ گوشی) هیچ ربطی نداره.
const LINGOVA_LEG_MSG_MIN_DELAY_MS = 500;
const LINGOVA_LEG_MSG_MAX_DELAY_MS = 7000;
const LINGOVA_TURN_PAUSE_MS = 400; // مکثِ خیلی کوتاه سرِ لبه، قبلِ از برگشتن
// کلیدهای UI_STRINGS برای پیام‌های حباب — به‌جای متنِ ثابتِ فارسی، از سیستمِ
// زبانِ نرم‌افزار (tr/uiLang) خونده می‌شن تا با تغییرِ زبونِ اپ، این پیام‌ها
// هم خودکار انگلیسی/فارسی بشن.
const LINGOVA_BUBBLE_KEYS = ["lingovaBubbleRead", "lingovaBubbleKeepGoing", "lingovaBubbleStillThere", "lingovaBubbleHeyYou"];

// دو‌بار‌زدنِ سریع (بدونِ حرکتِ محسوس بینِ دوتاش) رویِ آدمک — بینِ حالتِ
// «همیشه رویِ صفحه، حتی موقعِ اسکرول» (پیش‌فرض) و حالتِ «چسبیده به هدر، با
// اسکرول‌کردنِ صفحه از دید خارج می‌شه» جابه‌جا می‌کنه.
const LINGOVA_DOUBLE_TAP_MS = 350; // حداکثر فاصله‌ی زمانیِ بینِ دو تپ
const LINGOVA_TAP_MOVE_TOLERANCE = 10; // px — بیشتر از این یعنی درگه، نه یه تپِ ساده
const LINGOVA_DOUBLE_TAP_DIST_TOLERANCE = 26; // px — حداکثر فاصله‌ی مکانیِ بینِ دو تپ
const LINGOVA_LONG_PRESS_MS = 550; // نگه‌داشتنِ بیشتر از این (بدونِ حرکتِ محسوس) یعنی long-press

// سه دست‌لباسِ متنوع برای آدمک — روی تنه (پیراهن) و پاها (شلوار) اعمال
// می‌شه. گزینه‌ی اول از رنگِ تمِ فعلیِ اپ پیروی می‌کنه (دقیقاً همون ظاهرِ
// قبلی)؛ دو گزینه‌ی بعدی رنگ‌های ثابت دارن تا مستقل از تمِ انتخابی، همیشه
// قابلِ‌تشخیص و متفاوت از هم باشن.
const LINGOVA_OUTFITS = {
  classic: { shirt: null, pants: null }, // null یعنی از colors.teal/colors.ink (رنگِ تم) استفاده کن
  scout: { shirt: "#c0562f", pants: "#33302b" },
  royal: { shirt: "#6a3fb5", pants: "#142c46" },
};
const LINGOVA_OUTFIT_KEYS = Object.keys(LINGOVA_OUTFITS);

// ---------------------------------------------------------------------------
// «سنجاق‌شدنِ» آدمک با درگ‌کردن — وقتی کاربر با انگشت آدمک رو می‌گیره و
// یه‌جای دیگه‌ی صفحه ول می‌کنه، دیگه تو نوارِ بالای صفحه راه نمی‌ره؛ همون‌جا
// می‌مونه و سرِ پا قدم می‌زنه. موقعیت به‌صورتِ درصدِ عرض/ارتفاعِ صفحه توی
// localStorage ذخیره می‌شه (نه پیکسلِ خام) تا با تغییرِ سایزِ صفحه/چرخشِ
// گوشی هم نسبی درست بمونه؛ اگه کاربر هنوز هیچ‌وقت درگش نکرده باشه، این مقدار
// خالیه و آدمک دقیقاً مثلِ قبل بالای صفحه راه می‌ره.
const LINGOVA_POS_STORAGE_KEY = "lingova-mascot-pos-v1";

function loadLingovaPinnedPos() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LINGOVA_POS_STORAGE_KEY);
    if (!raw) return null;
    const { xPct, yPct } = JSON.parse(raw);
    if (typeof xPct !== "number" || typeof yPct !== "number" || Number.isNaN(xPct) || Number.isNaN(yPct)) return null;
    return {
      left: Math.max(0, Math.min(window.innerWidth - LINGOVA_MASCOT_WIDTH, xPct * window.innerWidth)),
      top: Math.max(0, Math.min(window.innerHeight - LINGOVA_MASCOT_HEIGHT, yPct * window.innerHeight)),
    };
  } catch {
    return null;
  }
}

function saveLingovaPinnedPos(left, top) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LINGOVA_POS_STORAGE_KEY,
      JSON.stringify({ xPct: left / window.innerWidth, yPct: top / window.innerHeight })
    );
  } catch {
    // localStorage در دسترس نیست — مشکلی نیست، فقط موقعیت بینِ نشست‌ها یادش نمی‌مونه
  }
}

function useLingovaMascot(trackWidth, uiLang, pinned, walking, pinStartX, paused, localAnchor) {
  // پارک/توقف — با یه تپِ ساده رویِ آدمک (وقتی سنجاق‌شده) یا با یه تپِ ساده
  // بعدِ کوتاه‌مدت‌منتظرماندن برایِ دابل‌تپ (وقتی رویِ نوارِ بالاست) toggle
  // می‌شه؛ دقیقاً مثلِ دکمه‌ی توقف/پخشِ یه پلیر. با رفرنس نگه‌ش می‌داریم تا
  // تیکِ داخلِ setInterval بدونِ نیاز به ری‌استارت‌شدنِ خودِ تایمر، همیشه
  // آخرین مقدارش رو ببینه.
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const xRef = useRef(0);
  const targetRef = useRef(-1); // -1 یعنی هنوز هیچ مسیری شروع نشده
  const speedRef = useRef(0.55);
  const facingRef = useRef(1);
  const modeRef = useRef("walk"); // 'walk' | 'read' (مکثِ سرِ لبه) | 'alert' (نمایشِ پیام)
  const pauseUntilRef = useRef(0); // پایانِ مکثِ فعلی، چه سرِ لبه چه موقعِ نمایشِ پیام
  const checkpointsRef = useRef([]); // دو نقطه‌ی چک‌پوینت رویِ مسیرِ «رفت» یا «برگشتِ» جاری، برای نمایشِ پیام
  const checkpointIdxRef = useRef(0);
  const pinnedXRef = useRef(0); // فقط تو حالتِ pinned+walking: موقعیتِ x رویِ کلِ عرضِ صفحه
  const pinnedTargetRef = useRef(-1);
  const pinnedCheckpointsRef = useRef([]);
  const pinnedCheckpointIdxRef = useRef(0);
  // فقط تو حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه» (localAnchor): رفت‌وبرگشتِ
  // واقعیِ آدمک، ولی محدود به یه بازه‌ی کوچیک دورِ همون نقطه (نه کلِ عرضِ
  // صفحه) — چون قراره «سرِ همون مختصات» بمونه، نه جایِ دیگه بره.
  const localXRef = useRef(0);
  const localTargetRef = useRef(-1);
  const localCheckpointsRef = useRef([]);
  const localCheckpointIdxRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const bubbleRef = useRef(null);
  const [, forceTick] = useReducer((n) => n + 1, 0);

  // شروعِ یه «پا»ی تازه از رفت‌وبرگشت — همیشه تا دقیقاً لبه‌ی مقابل (۰ یا
  // انتهای عرض)، نه یه نقطه‌ی تصادفیِ وسط‌راه؛ همین باعث می‌شه آدمک هیچ‌وقت
  // وسطِ راه مسیرش عوض نشه. دو فاصله‌ی زمانیِ تصادفی هم این‌جا برای همین پا
  // ثبت می‌شن (نه دو موقعیتِ ثابتِ رویِ مسیر) — هر کدوم یعنی «چند میلی‌ثانیه
  // بعدِ بی‌تعامل‌شدنِ کاربر» یه پیامِ کوتاه نشون داده بشه، مستقل از این‌که
  // آدمک دقیقاً کجای مسیره؛ همین باعث می‌شه محلِ نمایشِ پیام‌ها تصادفی و
  // غیرقابل‌پیش‌بینی باشه، نه همیشه سرِ یه نقطه‌ی مشخص (مثلاً لبه‌ی صفحه).
  const startLeg = (fromX, toX, tgtRef, cpRef, cpIdxRef) => {
    tgtRef.current = toX;
    facingRef.current = toX >= fromX ? 1 : -1;
    speedRef.current = 0.45 + Math.random() * 0.3;
    cpRef.current = [
      LINGOVA_LEG_MSG_MIN_DELAY_MS + Math.random() * (LINGOVA_LEG_MSG_MAX_DELAY_MS - LINGOVA_LEG_MSG_MIN_DELAY_MS),
      LINGOVA_LEG_MSG_MIN_DELAY_MS + Math.random() * (LINGOVA_LEG_MSG_MAX_DELAY_MS - LINGOVA_LEG_MSG_MIN_DELAY_MS),
    ].sort((a, b) => a - b);
    cpIdxRef.current = 0;
  };

  // یه پیامِ حبابِ تصادفی، طبقِ زبانِ فعلیِ نرم‌افزار (uiLang)
  const pickBubbleLine = () => {
    const key = LINGOVA_BUBBLE_KEYS[Math.floor(Math.random() * LINGOVA_BUBBLE_KEYS.length)];
    return tr(key, uiLang);
  };

  // ثبتِ آخرین لحظه‌ی تعاملِ کاربر با کلِ اپ — هر نوع لمس/کلیک/اسکرول/کیبورد
  useEffect(() => {
    const mark = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("touchstart", mark, { passive: true });
    window.addEventListener("mousedown", mark);
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, { passive: true, capture: true });
    return () => {
      window.removeEventListener("touchstart", mark);
      window.removeEventListener("mousedown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark, true);
    };
  }, []);

  // پخش‌شدنِ پلیر هم مثلِ لمس/کلیک/اسکرول/کیبورد یه تعاملِ حساب می‌شه —
  // فقط وضعیتِ فعلی رو تو یه رفرنس نگه می‌داریم؛ خودِ رفرش‌کردنِ
  // lastActivityRef تو تیکِ stepLeg (پایین) انجام می‌شه، تا تا وقتی پخش
  // ادامه داره، بی‌تعاملی هیچ‌وقت فعال نشه.
  const playerPlayingRef = useRef(false);
  useEffect(() => {
    return speechController.subscribe((s) => {
      playerPlayingRef.current = s.status === "playing";
    });
  }, []);

  // یه تیکِ مشترک برای هر دو حالت (سنجاق‌شده رویِ کلِ عرضِ صفحه، یا آزادِ
  // رویِ عرضِ نوارِ بالا) — چون منطقشون کاملاً یکیه، فقط بازه‌ی حرکت/رفرنس‌ها
  // فرق می‌کنه.
  const stepLeg = (posRef, tgtRef, cpRef, cpIdxRef, edge0, edge1) => {
    // وقتی پلیر داره پخش می‌کنه، دقیقاً مثلِ یه تعاملِ واقعی، لحظه‌ی
    // «آخرین تعامل» رو مدام تازه نگه می‌داریم — یعنی تا پخش ادامه داره،
    // بی‌تعاملی هیچ‌وقت شمرده نمی‌شه.
    if (playerPlayingRef.current) {
      lastActivityRef.current = Date.now();
    }
    const isIdle = Date.now() - lastActivityRef.current > LINGOVA_IDLE_MS;

    if (tgtRef.current < 0) {
      startLeg(posRef.current, edge1, tgtRef, cpRef, cpIdxRef);
    }

    if (modeRef.current === "alert") {
      // پیام در حالِ نمایشه — با تعاملِ واقعیِ کاربر زودتر قطع می‌شه، وگرنه
      // بعدِ ۲ ثانیه خودش تمومِ و بدونِ تغییرِ مسیر ادامه‌ی راه رو می‌گیره.
      if (!isIdle || Date.now() >= pauseUntilRef.current) {
        modeRef.current = "walk";
        bubbleRef.current = null;
      }
      return;
    }

    if (modeRef.current === "read") {
      // مکثِ خیلی‌کوتاهِ سرِ لبه — بعدش برمی‌گرده به سمتِ لبه‌ی مقابل.
      if (Date.now() >= pauseUntilRef.current) {
        const next = tgtRef.current === edge0 ? edge1 : edge0;
        startLeg(posRef.current, next, tgtRef, cpRef, cpIdxRef);
        modeRef.current = "walk";
      }
      return;
    }

    const dx = tgtRef.current - posRef.current;
    if (Math.abs(dx) < 1.5) {
      // رسید به لبه — یه مکثِ خیلی‌کوتاه، بعد برمی‌گرده برای پاهای بعدی
      modeRef.current = "read";
      pauseUntilRef.current = Date.now() + LINGOVA_TURN_PAUSE_MS;
      return;
    }

    // فقط اگه کاربر واقعاً بی‌تعامل باشه و هنوز هر دو پیامِ این پا نشون داده
    // نشده باشن، بعدِ گذشتنِ فاصله‌ی زمانیِ تصادفیِ همون پیام (از لحظه‌ای که
    // کاربر بی‌تعامل شد) یه پیامِ کوتاه نشون می‌ده و به همون مسیر/مقصدِ قبلی
    // ادامه می‌ده. این فاصله کاملاً زمانیه، نه بر اساسِ موقعیتِ آدمک رویِ
    // مسیر — پس محلِ نمایشِ پیام رندوم و غیرقابل‌پیش‌بینیه.
    if (isIdle && cpIdxRef.current < LINGOVA_LEG_MSG_COUNT) {
      const idleSince = lastActivityRef.current + LINGOVA_IDLE_MS;
      const dueAt = idleSince + cpRef.current[cpIdxRef.current];
      if (Date.now() >= dueAt) {
        cpIdxRef.current += 1;
        modeRef.current = "alert";
        bubbleRef.current = pickBubbleLine();
        pauseUntilRef.current = Date.now() + LINGOVA_LEG_MSG_PAUSE_MS;
        return;
      }
    }

    posRef.current += Math.sign(dx) * speedRef.current;
  };

  // حالتِ «سنجاق‌شده» (pinned) — کاربر آدمک رو یه‌جای دلخواهِ صفحه گذاشته.
  // دیگه رویِ نوارِ بالای صفحه نیست، ولی همچنان تو همون ارتفاع (y ثابت)
  // کاملِ عرضِ صفحه رو رفت‌وبرگشت قدم می‌زنه — دقیقاً مثلِ راه‌رفتنِ آزادِ
  // نوارِ بالا، فقط رویِ محورِ y ثابت‌شده.
  useEffect(() => {
    // موقعِ خودِ درگ‌کردن (pinned=true ولی walking=false، چون هنوز رها نشده)
    // آدمک باید دقیقاً زیرِ انگشتِ کاربر بمونه؛ جابه‌جا نمی‌شه و هیچ تایمری
    // روشن نمی‌شه. اگه localAnchor فعال باشه هم این حلقه رو خاموش نگه
    // می‌داریم — اون یکی حلقه (پایین‌تر) مسئولِ حرکته تا با هم تداخل نکنن
    // (هر دو از modeRef/bubbleRef/pauseUntilRef مشترک استفاده می‌کنن).
    if (!pinned || !walking || localAnchor) {
      return undefined;
    }
    modeRef.current = "walk";
    pinnedXRef.current = pinStartX || 0;
    pinnedTargetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return; // پارک‌شده — هیچ حرکت/تیکِ منطقی انجام نشه
      const w = typeof window !== "undefined" ? window.innerWidth : 320;
      const edge1 = Math.max(w - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(pinnedXRef, pinnedTargetRef, pinnedCheckpointsRef, pinnedCheckpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [pinned, walking, localAnchor, uiLang]);

  useEffect(() => {
    if (pinned || localAnchor) return undefined;
    if (!trackWidth) return undefined;
    targetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return; // پارک‌شده — هیچ حرکت/تیکِ منطقی انجام نشه
      const edge1 = Math.max(trackWidth - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(xRef, targetRef, checkpointsRef, checkpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [trackWidth, pinned, localAnchor, uiLang]);

  // حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه» — با long-press رویِ آدمک فعال
  // می‌شه. خودِ نقطه (مختصاتِ سندِ صفحه) بیرون از این هوک، تویِ کامپوننت
  // نگه‌داری می‌شه؛ این‌جا فقط رفت‌وبرگشتِ محلیِ x رو، تویِ یه بازه‌ی کوچیکِ
  // دورِ همون نقطه، اجرا می‌کنیم — یه راه‌رفتنِ واقعی رویِ کلِ عرضِ صفحه
  // (دقیقاً مثلِ حالتِ سنجاق‌شده)، فقط با این تفاوت که ارتفاعِ (y) لنگر
  // نسبت‌به‌سندِ صفحه‌ست، نه ویوپورت.
  useEffect(() => {
    if (!localAnchor) return undefined;
    modeRef.current = "walk";
    localXRef.current = 0;
    localTargetRef.current = -1;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const w = typeof window !== "undefined" ? window.innerWidth : 320;
      const edge1 = Math.max(w - LINGOVA_MASCOT_WIDTH, 24);
      stepLeg(localXRef, localTargetRef, localCheckpointsRef, localCheckpointIdxRef, 0, edge1);
      forceTick();
    }, 45);

    return () => clearInterval(id);
  }, [localAnchor, uiLang]);

  return {
    x: localAnchor ? localXRef.current : walking ? pinnedXRef.current : pinned ? 0 : xRef.current,
    facing: facingRef.current,
    mode: pinned && !walking ? "walk" : modeRef.current,
    bubble: pinned && !walking ? null : bubbleRef.current,
  };
}

function LingovaMascot({ uiLang, fontZoom = 1, outfitKey = "classic", enabled = true }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);

  // موقعیتِ «سنجاق‌شده» — اگه کاربر قبلاً آدمک رو یه‌جایی درگ کرده باشه،
  // همون‌جا (بر اساسِ درصدِ ذخیره‌شده تو localStorage) بارگذاری می‌شه؛ وگرنه
  // null می‌مونه و آدمک دقیقاً مثلِ قبل تو نوارِ بالای صفحه راه می‌ره.
  const [pinnedPos, setPinnedPos] = useState(() => loadLingovaPinnedPos());
  const [dragPos, setDragPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  // حالتِ «چسبیده به هدر» — با دو‌بار‌زدنِ سریع (دابل‌تپ) رویِ آدمک toggle
  // می‌شه. وقتی true، آدمک دیگه position:fixed نیست و مستقیم داخلِ هدر
  // رندر می‌شه؛ پس با اسکرول‌کردنِ صفحه، مثلِ بقیه‌ی محتوایِ هدر از دید
  // خارج می‌شه. راه‌رفتنِ خودش (تایمر/state تویِ useLingovaMascot) مستقلِ
  // از این پرچمه و همچنان پشتِ صحنه ادامه پیدا می‌کنه، حتی وقتی دیده نمی‌شه.
  const [pageAttached, setPageAttached] = useState(false);
  // پارک/توقف — دقیقاً مثلِ دکمه‌ی توقف/پخشِ یه پلیر: یه تپِ ساده رویِ
  // آدمک همین‌جا نگهش می‌داره (بدونِ جابه‌جایی)، یه تپِ دیگه دوباره راه
  // می‌ندازتش. غیرِ ذخیره‌شونده‌ست (هر بارگذاریِ صفحه از نو راه می‌ره).
  const [paused, setPaused] = useState(false);
  // «قفل‌شده به یه ارتفاعِ مشخصِ صفحه» — با نگه‌داشتنِ انگشت (long-press)
  // رویِ خودِ آدمک روشن/خاموش می‌شه (نه با درگ یا تپ‌های قبلی). وقتی روشنه،
  // ارتفاعِ (y) همون لحظه نسبت‌به‌کلِ سندِ صفحه (نه ویوپورت) ذخیره می‌شه و
  // آدمک رویِ کلِ عرضِ صفحه رفت‌وبرگشتِ واقعی قدم می‌زنه — دقیقاً مثلِ
  // حالتِ سنجاق‌شده — با این فرق که چون ارتفاعش نسبت‌به‌سندِ صفحه‌ست نه
  // ویوپورت، با اسکرول‌کردنِ صفحه، خودِ اون ارتفاع هم دقیقاً هم‌زمان با
  // همون بخش از صفحه پیمایش می‌شه (نه این‌که رویِ ویوپورت ثابت بمونه). با
  // شروعِ پخشِ پلیر (speechController → "playing") خودکار خاموش می‌شه تا
  // آدمک دوباره «آزاد» بشه (برگرده به همون رفتارِ قبلیِ خودش: نوارِ بالا/
  // چسبیده‌به‌هدر/سنجاق‌شده — هرکدوم که قبلاً بوده).
  // سنجاق‌شده — هرکدوم که قبلاً بوده).
  const [stepInPlace, setStepInPlace] = useState(false);
  const [stepInPlacePos, setStepInPlacePos] = useState(null); // {top} — ارتفاعِ سندِ صفحه (نه ویوپورت) در لحظه‌ی روشن‌شدن
  const mascotElRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  // برایِ فعال/غیرفعال‌کردنِ «قدم‌زدنِ سرِ جا» با نگه‌داشتنِ انگشت (long-press)
  // رویِ آدمک — بدونِ نیاز به هیچ دکمه‌ی جداگانه‌ای رویِ صفحه.
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  // وقتی آدمک هنوز سنجاق نشده (رویِ نوارِ بالا)، یه تپِ ساده باید یه‌کم صبر
  // کنه ببینه تپِ دومی (برایِ دابل‌تپِ چسبیدن‌به‌هدر) از راه می‌رسه یا نه،
  // قبل از این‌که به‌عنوانِ toggleِ پارک حساب بشه؛ این تایمر همون صبرِ کوتاهه.
  const singleTapTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => setTrackWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // اگه بعدِ سنجاق‌شدن، سایزِ صفحه عوض بشه (مثلاً چرخیدنِ گوشی)، موقعیت رو
  // دوباره از همون درصدِ ذخیره‌شده حساب می‌کنیم تا همیشه داخلِ صفحه بمونه.
  useEffect(() => {
    if (!pinnedPos) return undefined;
    const onResize = () => setPinnedPos(loadLingovaPinnedPos());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pinnedPos]);

  // موقعِ درگ‌کردن، حرکت/رهاشدنِ انگشت رو رویِ کلِ صفحه (window) گوش می‌دیم —
  // نه فقط رویِ خودِ آدمک — چون همین‌که درگ شروع می‌شه، آدمک از نوارِ بالا
  // بیرون میاد و تو یه پورتالِ دیگه رندر می‌شه؛ اگه فقط رویِ خودِ گره‌ی DOM
  // قبلی گوش می‌دادیم، با این جابه‌جاییِ درخت، رویدادهای بعدی از دست می‌رفت.
  useEffect(() => {
    if (!isDragging) return undefined;
    const clamp = (left, top) => ({
      left: Math.max(0, Math.min(window.innerWidth - LINGOVA_MASCOT_WIDTH, left)),
      top: Math.max(0, Math.min(window.innerHeight - LINGOVA_MASCOT_HEIGHT, top)),
    });
    const onMove = (e) => {
      setDragPos(clamp(e.clientX - dragOffsetRef.current.dx, e.clientY - dragOffsetRef.current.dy));
      // حرکتِ محسوس یعنی این یه درگه، نه long-press؛ تایمرِ قدم‌زدنِ سرِ جا
      // رو لغو کن.
      const movedDist = Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y);
      if (movedDist > LINGOVA_TAP_MOVE_TOLERANCE && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
    const onUp = (e) => {
      // اگه long-press همین الان (تویِ همون فشار) فعال شده، این رهاشدنِ
      // انگشت رو اصلاً به‌عنوانِ تپ/درگِ عادی حساب نکن — فقط استیت رو تمیز کن.
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        setIsDragging(false);
        return;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsDragging(false);
      // اگه بینِ گذاشتن و برداشتنِ انگشت، حرکتِ محسوسی رخ داده، این یه
      // درگِ واقعیه — نه یه تپِ ساده — پس مثلِ قبل، جایی که رها شده رو
      // سنجاق می‌کنیم و به منطقِ دابل‌تپ اصلاً کاری نداریم.
      const movedDist = Math.hypot((e.clientX ?? pointerStartRef.current.x) - pointerStartRef.current.x, (e.clientY ?? pointerStartRef.current.y) - pointerStartRef.current.y);
      if (movedDist > LINGOVA_TAP_MOVE_TOLERANCE) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        setDragPos((dp) => {
          const finalPos = dp || { left: 0, top: 0 };
          setPinnedPos(finalPos);
          saveLingovaPinnedPos(finalPos.left, finalPos.top);
          return null;
        });
        return;
      }
      // یه تپِ ساده (بدونِ حرکتِ محسوس) — دیگه مثلِ قبل بلافاصله سنجاق‌ش
      // نمی‌کنیم؛ فقط چک می‌کنیم آیا این، دومین تپِ یه دابل‌تپِ سریعه یا نه.
      setDragPos(null);
      const now = Date.now();
      const last = lastTapRef.current;
      const sinceLastTap = now - last.time;
      const tapDist = Math.hypot((e.clientX ?? pointerStartRef.current.x) - last.x, (e.clientY ?? pointerStartRef.current.y) - last.y);
      if (!pinnedPos && sinceLastTap < LINGOVA_DOUBLE_TAP_MS && tapDist < LINGOVA_DOUBLE_TAP_DIST_TOLERANCE) {
        // دابل‌تپ — اگه یه توگلِ پارکِ معلق (از تپِ اول) منتظرِ اجراست،
        // لغوش کن؛ این دو تپ برایِ چسبیدن/جداشدن از هدره، نه پارک‌کردن.
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        setPageAttached((v) => !v);
      } else {
        lastTapRef.current = { time: now, x: e.clientX ?? pointerStartRef.current.x, y: e.clientY ?? pointerStartRef.current.y };
        if (pinnedPos) {
          // سنجاق‌شده — این‌جا هیچ دابل‌تپی معنی نداره (بالا هم شرطش
          // !pinnedPos بود)، پس هر تپِ ساده بی‌درنگ پارک/ادامه رو toggle می‌کنه.
          setPaused((p) => !p);
        } else {
          // رویِ نوارِ بالا — قبل از toggleِ پارک، یه‌کم صبر کن ببین تپِ
          // دومی (دابل‌تپِ چسبیدن‌به‌هدر) از راه می‌رسه یا نه.
          if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = setTimeout(() => {
            singleTapTimeoutRef.current = null;
            setPaused((p) => !p);
          }, LINGOVA_DOUBLE_TAP_MS + 30);
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  const pinned = !!(pinnedPos || isDragging);
  // موقعِ خودِ درگ‌کردن (isDragging) آدمک باید دقیقاً زیرِ انگشتِ کاربر
  // بمونه، نه این‌که هم‌زمان رفت‌وبرگشتِ خودکار هم بکنه؛ رفت‌وبرگشت فقط
  // بعدِ رهاشدن (pinnedPos ثبت شده) شروع می‌شه.
  const walking = !!pinnedPos && !isDragging;
  const { x, facing, mode, bubble } = useLingovaMascot(
    trackWidth,
    uiLang,
    pinned,
    walking,
    pinnedPos ? pinnedPos.left : 0,
    paused,
    stepInPlace
  );
  // پارک‌شده که باشه، مُد رو به یه حالتِ ایستاده‌ی ساده (نه walk/read/alert)
  // برمی‌گردونیم تا نه پاها تاب بخورن نه دست، و حبابِ پیام هم مخفی می‌شه —
  // دقیقاً مثلِ فریزشدنِ تصویر با دکمه‌ی توقفِ یه پلیر. تویِ حالتِ
  // «قفل‌شده به یه نقطه‌ی مشخص» نیازی به override نیست — mode/bubble رو
  // خودِ هوک، از رویِ همون رفت‌وبرگشتِ محلی، درست حساب می‌کنه.
  const effectiveMode = paused ? "parked" : mode;
  const effectiveBubble = paused ? null : bubble;

  // با شروعِ پخشِ پلیرِ صدا (دکمه‌ی پلیِ نوارِ پایین)، اگه آدمک «سرِ جا قفل»
  // بود، خودکار آزادش می‌کنیم — یعنی از حالتِ ثابت‌نسبت‌به‌ویوپورتِ این
  // دکمه بیرون میاد و برمی‌گرده به همون رفتارِ عادیِ خودش نسبت‌به‌اسکرول
  // (نوارِ بالا / چسبیده‌به‌هدر / سنجاق‌شده — هرکدوم که قبلاً فعال بوده).
  useEffect(() => {
    return speechController.subscribe((s) => {
      if (s.status === "playing") setStepInPlace(false);
    });
  }, []);

  // نگه‌داشتنِ انگشت رویِ آدمک (long-press، بدونِ حرکتِ محسوس) «قفل‌شدن به
  // همین ارتفاع» رو toggle می‌کنه. موقعِ روشن‌کردن، فقط ارتفاعِ (y) فعلیِ
  // خودِ آدمک رو نسبت‌به‌بالایِ کلِ سندِ صفحه (rect.top + مقدارِ فعلیِ
  // اسکرول) حساب می‌کنیم، نه نسبت‌به‌ویوپورت — همین باعث می‌شه با
  // اسکرول‌کردنِ صفحه، اون ارتفاع دقیقاً هم‌زمان با همون نقطه از صفحه
  // بالا/پایین بره؛ x رو دست‌نخورده می‌ذاریم چون قراره آدمک رویِ کلِ عرضِ
  // صفحه (نه فقط همون x فعلی) رفت‌وبرگشت کنه.
  const activateStepInPlace = () => {
    if (mascotElRef.current) {
      const rect = mascotElRef.current.getBoundingClientRect();
      setStepInPlacePos({ top: rect.top + window.scrollY });
    }
    setStepInPlace(true);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    if (stepInPlace) {
      // تویِ حالتِ «قدم‌زدنِ سرِ جا»، درگ/پین‌کردن بی‌معنیه — تنها کاری که
      // یه فشار این‌جا می‌تونه بکنه، long-press برایِ آزادکردنه.
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setStepInPlace(false);
      }, LINGOVA_LONG_PRESS_MS);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setDragPos({ left: rect.left, top: rect.top });
    setIsDragging(true);

    // long-press (نگه‌داشتن بدونِ حرکتِ محسوس) به‌طورِ مستقل از تپ/دابل‌تپ/
    // درگِ بالا، «قدم‌زدنِ سرِ جا» رو فعال می‌کنه. اگه قبلش حرکتِ محسوسی
    // ثبت بشه (onMove بالاتر) یا زودتر رها بشه (onUp)، همین تایمر لغو می‌شه.
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      setIsDragging(false);
      setDragPos(null);
      activateStepInPlace();
    }, LINGOVA_LONG_PRESS_MS);
  };

  const activePos = isDragging ? dragPos : pinnedPos;
  // اگه آدمک نزدیکِ لبه‌ی بالای صفحه سنجاق شده باشه، حباب رو به‌جای بالا،
  // پایینِ آدمک نشون می‌دیم تا از صفحه بیرون نزنه.
  const bubbleNearTop = pinned && activePos && activePos.top < 34;

  const bubbleDir = APP_LANGUAGES[uiLang]?.dir || "ltr";
  const bubbleFontFamily = uiLang === "fa" ? "var(--font-fa)" : "var(--font-latin)";

  const outfit = LINGOVA_OUTFITS[outfitKey] || LINGOVA_OUTFITS.classic;
  const shirtColor = outfit.shirt || colors.teal;
  const pantsColor = outfit.pants || colors.ink;

  // تویِ حالتِ «قفل‌شده به یه نقطه‌ی مشخصِ صفحه»، x همون رفت‌وبرگشتِ محلیِ
  // واقعیه که خودِ هوک (بالاتر) حساب کرده — نه صفرِ ثابت — یعنی آدمک واقعاً
  // قدم برمی‌داره و می‌ره‌وبرمی‌گرده، فقط تویِ یه بازه‌ی کوچیکِ دورِ همون
  // نقطه‌ی ثابت (نه رویِ کلِ صفحه).
  const displayX = x;

  // حبابِ پیام گاهی که آدمک تا انتهای عرضِ صفحه می‌ره، از کادرِ گوشی بیرون
  // می‌زد و متنش کامل دیده نمی‌شد. راه‌رفتنِ آدمک تا لبه‌ی صفحه خودش درسته
  // و دست‌نخورده می‌مونه؛ فقط خودِ حباب رو بعدِ رندر با getBoundingClientRect
  // اندازه می‌گیریم و اگه از عرضِ ویوپورت بیرون زده باشه (چپ یا راست)، با یه
  // translateX افقی به داخلِ صفحه هلش می‌دیم — بدونِ اینکه به موقعیتِ خودِ
  // آدمک یا انیمیشنِ بالا/پایین‌رفتنِ حباب (که رویِ همین transform ولی جدا،
  // رویِ یه div تو در تو، کار می‌کنه) دست بزنیم.
  const bubbleWrapRef = useRef(null);
  const [bubbleShiftX, setBubbleShiftX] = useState(0);
  useLayoutEffect(() => {
    if (!effectiveBubble) {
      setBubbleShiftX(0);
      return;
    }
    const el = bubbleWrapRef.current;
    if (!el) return;
    const prevTransform = el.style.transform;
    el.style.transform = "translateX(0px)";
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.left < margin) {
      shift = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }
    el.style.transform = prevTransform;
    setBubbleShiftX(shift);
  }, [effectiveBubble, displayX, facing, bubbleNearTop]);

  const mascotBody = (
    <div
      ref={mascotElRef}
      onPointerDown={enabled ? handlePointerDown : undefined}
      style={{
        position: "absolute",
        top: 0,
        left: displayX,
        width: LINGOVA_MASCOT_WIDTH,
        height: LINGOVA_MASCOT_HEIGHT,
        touchAction: "none",
        // به‌جایِ حذفِ شرطیِ آدمک، وقتی کاربر از تنظیمات خاموشش کنه فقط
        // opacity‌ش با یه ترنزیشنِ نرم صفر می‌شه (محو شدن) — راه‌رفتن/تایمرها
        // پشتِ صحنه ادامه پیدا می‌کنن، فقط دیگه دیده/قابلِ‌درگ‌کردن نیست.
        opacity: enabled ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: enabled ? "auto" : "none",
        cursor: isDragging ? "grabbing" : "grab",
        filter: isDragging ? "drop-shadow(0 3px 6px rgba(0,0,0,.45))" : "none",
      }}
    >
      {/* حبابِ پیام عمداً بیرونِ هر ظرفی‌ست که scaleX(facing) رو داره — قبلاً
          هم خودِ حباب یه scaleX(-1) جبرانی می‌گرفت تا متنش با چرخشِ آدمک
          آینه‌ای نشه، ولی ترکیبِ اون دو تبدیل باعث می‌شد متنِ فارسی (راست‌به‌چپ)
          گاهی برعکس/جابه‌جا رندر بشه. حالا فقط خودِ کاراکتر (svg) می‌چرخه، پس
          دیگه نیازی به هیچ تبدیلی رویِ حباب نیست و متنش همیشه طبیعی نمایش
          داده می‌شه. جهتِ متن (rtl/ltr) و فونت هم از تنظیماتِ زبان/فونتِ خودِ
          اپ (uiLang, fontFamily) خونده می‌شه، نه یه مقدارِ ثابت. */}
      {effectiveBubble && (
        <div
          ref={bubbleWrapRef}
          style={{
            position: "absolute",
            top: bubbleNearTop ? LINGOVA_MASCOT_HEIGHT + 2 : -22,
            left: facing === 1 ? -4 : -34,
            transform: `translateX(${bubbleShiftX}px)`,
            transition: "transform 0.15s ease",
          }}
        >
          <div
            className="lingova-bubble"
            dir={bubbleDir}
            style={{
              background: colors.paper,
              color: colors.ink,
              fontFamily: bubbleFontFamily,
              fontSize: 9 * fontZoom,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            {effectiveBubble}
          </div>
        </div>
      )}
      {/* نشونه‌ی کوچیکِ پارک‌بودن — یه آیکونِ پلیِ ریز بالای آدمک، تا کاربر
          بفهمه با تپِ بعدی دوباره راه می‌افته (دقیقاً مثلِ حالتِ Pause یه پلیر) */}
      {paused && (
        <div
          style={{
            position: "absolute",
            top: -16,
            left: facing === 1 ? 6 : -6,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: colors.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,.4)",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "3.5px solid transparent",
              borderBottom: "3.5px solid transparent",
              borderLeft: `5px solid ${colors.paper}`,
              marginLeft: 2,
            }}
          />
        </div>
      )}
      <svg
        viewBox="0 0 30 38"
        width={LINGOVA_MASCOT_WIDTH}
        height={LINGOVA_MASCOT_HEIGHT}
        style={{ overflow: "visible", display: "block", transform: `scaleX(${facing})` }}
      >
        {/* چماق — دستِ نگه‌دارنده‌اش وقتِ راه‌رفتن تاب می‌خوره، وقتِ
            هشدار (بی‌تعاملیِ کاربر) بالا نگه داشته می‌شه */}
        <g
          className={effectiveMode === "alert" ? "lingova-arm-alert" : effectiveMode === "walk" ? "lingova-arm-walk" : ""}
          style={{ transformOrigin: "18px 15px" }}
        >
          <rect x="17" y="3" width="2.6" height="11" rx="1.3" fill="#8a5a2b" />
          <circle cx="18.3" cy="3" r="2.6" fill="#6b4423" />
        </g>
        {/* سر — موقعِ «خوندن» یکم به‌سمتِ پایین خم می‌شه، انگار حواسش به متنه */}
        <g
          style={{
            transform: effectiveMode === "read" ? "rotate(18deg)" : "none",
            transformOrigin: "15px 8px",
            transition: "transform 0.35s ease",
          }}
        >
          <circle cx="15" cy="8" r="5" fill={colors.gold} />
          <circle cx="17" cy="7.2" r="0.8" fill={colors.ink} />
        </g>
        {/* تنه (پیراهن) */}
        <rect x="12" y="13" width="6" height="12" rx="3" fill={shirtColor} />
        {/* پاها (شلوار) — فقط موقعِ راه‌رفتن (چه رویِ نوار، چه سرِ جا) تاب می‌خورن */}
        <g className={effectiveMode === "walk" ? "lingova-leg-l" : ""} style={{ transformOrigin: "13px 25px" }}>
          <rect x="11.5" y="25" width="2.4" height="10" rx="1.2" fill={pantsColor} />
        </g>
        <g className={effectiveMode === "walk" ? "lingova-leg-r" : ""} style={{ transformOrigin: "17px 25px" }}>
          <rect x="16" y="25" width="2.4" height="10" rx="1.2" fill={pantsColor} />
        </g>
      </svg>
    </div>
  );

  return (
    <>
      {/* جای‌گیر — همون ارتفاعِ قبلی (40px) رو داخلِ هدر نگه می‌داره تا
          چیدمانِ بقیه‌ی هدر (ردیفِ آواتار/تنظیمات و...) جابه‌جا نشه؛ عرضِ
          همین‌جا برای اندازه‌گیریِ محدوده‌ی حرکتِ آدمک (trackWidth) استفاده
          می‌شه. تو حالتِ پیش‌فرض، آدمک این‌جا رندر نمی‌شه (چون با اسکرول‌شدنِ
          هدر از دیدِ کاربر خارج می‌شد؛ به‌جاش پایین‌تر با createPortal رندر
          می‌شه)، ولی تو حالتِ «چسبیده به هدر» (pageAttached، با دابل‌تپ
          فعال می‌شه)، دقیقاً همین‌جا و به‌صورتِ معمولی (نه پورتال/فیکس) رندر
          می‌شه تا با اسکرول‌کردنِ صفحه، مثلِ بقیه‌ی هدر از دید خارج بشه. */}
      <div ref={trackRef} style={{ height: 40, marginBottom: 2, position: "relative" }}>
        {!stepInPlace && pageAttached && !pinned && mascotBody}
      </div>

      {/* حالتِ پیش‌فرض/راه‌رفتن: آدمک مستقیم زیرِ <body> (با createPortal) و
          position: fixed رندر می‌شه — یه نوارِ باریکِ همیشه-ثابتِ بالای
          صفحه، هم‌رنگِ گرادیانتِ هدر، که با اسکرول‌کردنِ بقیه‌ی صفحه از دید
          خارج نمی‌شه. با دابل‌تپ رویِ آدمک می‌شه از این حالت به حالتِ
          «چسبیده به هدر» بالا سوییچ کرد و برعکس. */}
      {!stepInPlace &&
        !pinned &&
        !pageAttached &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: 40,
              zIndex: 60,
              overflow: "hidden",
              pointerEvents: "none",
              background: `radial-gradient(120% 140% at 15% -10%, rgba(255,255,255,.07), transparent 55%), linear-gradient(165deg, ${colors.teal} 0%, ${colors.ink} 78%)`,
            }}
          >
            <div className="px-4" style={{ position: "relative", height: "100%" }}>
              {mascotBody}
            </div>
          </div>,
          document.body
        )}

      {/* حالتِ سنجاق‌شده/درگ: آدمک از نوارِ بالا بیرون میاد و رویِ کلِ صفحه،
          دقیقاً همون‌جایی که کاربر با انگشتش گذاشته/داره می‌بره، رندر می‌شه.
          خودِ لایه‌ی بیرونی pointerEvents:none هست تا رویِ بقیه‌ی صفحه کلیک
          رو نگیره؛ فقط خودِ آدمک (pointerEvents:auto) قابلِ‌گرفتنه. */}
      {!stepInPlace &&
        pinned &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 70, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: activePos ? activePos.top : 0, left: walking ? 0 : activePos ? activePos.left : 0 }}>
              {mascotBody}
            </div>
          </div>,
          document.body
        )}

      {/* حالتِ «قفل‌شده به یه ارتفاعِ مشخص» — با نگه‌داشتنِ انگشت (long-press)
          رویِ آدمک فعال می‌شه. صرفِ‌نظر از این‌که قبلش تو کدوم حالت بود
          (نوارِ بالا/چسبیده‌به‌هدر/سنجاق‌شده)، حالا مستقیماً با ارتفاعِ سندِ
          صفحه (گرفته‌شده در لحظه‌ی long-press، نه ویوپورت) و left:0 (کلِ
          عرضِ صفحه) رندر می‌شه. این div به‌طورِ مستقیم زیرِ <body> پورتال
          شده و position:absolute داره — یعنی هیچ اجدادِ position:fixed/
          relative‌ای بینِ خودش و سندِ صفحه نیست، پس containing-blockِ
          واقعیش خودِ سندِ صفحه‌ست، نه ویوپورت. نتیجه: با اسکرول‌کردنِ صفحه،
          این ارتفاع هم دقیقاً هم‌زمان با همون بخش از صفحه بالا/پایین
          می‌ره — نه این‌که رویِ ویوپورت ثابت بمونه. آدمک خودش رویِ کلِ عرضِ
          صفحه واقعاً رفت‌وبرگشت قدم می‌زنه (x از هوکِ useLingovaMascot،
          دقیقاً مثلِ حالتِ سنجاق‌شده). */}
      {stepInPlace &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: stepInPlacePos ? stepInPlacePos.top : 0,
              left: 0,
              right: 0,
              zIndex: 75,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "relative", pointerEvents: "auto" }}>{mascotBody}</div>
          </div>,
          document.body
        )}
      <style>{`
        @keyframes lingovaLegL { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
        @keyframes lingovaLegR { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }
        @keyframes lingovaArmWalk { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes lingovaArmAlert { 0%, 100% { transform: rotate(-95deg) translateY(0); } 50% { transform: rotate(-95deg) translateY(-2px); } }
        @keyframes lingovaBubbleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .lingova-leg-l { animation: lingovaLegL 0.5s linear infinite; }
        .lingova-leg-r { animation: lingovaLegR 0.5s linear infinite; }
        .lingova-arm-walk { animation: lingovaArmWalk 0.5s linear infinite; }
        .lingova-arm-alert { animation: lingovaArmAlert 0.6s ease-in-out infinite; }
        .lingova-bubble { animation: lingovaBubbleBob 1s ease-in-out infinite; }
      `}</style>
    </>
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
    el.setProperty("--c-headerFrom", theme.headerFrom);
    el.setProperty("--c-headerTo", theme.headerTo);
    el.setProperty("--c-headerText", theme.headerText);
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
    "--c-headerFrom": theme.headerFrom,
    "--c-headerTo": theme.headerTo,
    "--c-headerText": theme.headerText,
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
        <LoginScreen onAuthenticated={setUser} uiLang={appPrefs.uiLang} />
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
