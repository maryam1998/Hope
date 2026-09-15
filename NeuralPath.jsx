import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

/* =============================================================================
   🧬 مسیرهای عصبی (Neural Paths)
   -----------------------------------------------------------------------------
   ایده: هر بار که کاربر یه لغت/جمله رو (چه متنِ اصلی، چه هر کدوم از
   ترجمه‌هاش) از طریقِ پلیر پخش می‌کنه یا دستی ثبت می‌کنه، یه «تکرار» ثبت
   می‌شه. از رویِ روزهای متفاوتی که توش تکرار ثبت شده، «رشته‌های عصبی»
   ساخته می‌شه؛ وقتی تعدادِ روزهای متفاوت به حدِ کافی برسه، مرحله از
   «یادگیری» به «تثبیت» می‌ره.

   هر آیتم (لغت/جمله/ترجمه) با یه id ثابت شناسایی می‌شه — مثلاً
   `word:12:en` یا `conv:fa::سلام، حالت چطوره؟`. همین id باعث می‌شه متنِ
   اصلی و هر زبانِ ترجمه، هرکدوم مسیرِ عصبیِ جداگانه‌ی خودشون رو داشته باشن.

   ذخیره‌سازی فعلاً فقط localStorage (مستقل از بقیه‌ی اپ) — ساختارش ساده و
   صاف نگه داشته شده که بعداً راحت بشه به چرخه‌ی سینکِ ابری هم اضافه‌ش کرد.
   ============================================================================= */

const STORE_KEY = "phrasebook-neural-log-v1";
// دفترچه‌ی رشته‌های عصبی: هر آیتم یه {logs:{}, habitFormed:false} داره —
// جدا از رویدادهای بالا (که فقط برای آمار/تقویم نگه داشته می‌شن).
const LEDGER_KEY = "phrasebook-neural-ledger-v1";
// سقفِ نمایشی برای رنگِ نورونِ «عادت» — تعدادِ واقعیِ رشته‌ها می‌تونه بیشتر باشه
const NEURAL_FIBER_CAP = 10;

let cache = null;
let ledgerCache = null;
const listeners = new Set();

function loadStore() {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) {
      cache = null;
      loadStore();
    } else if (e.key === LEDGER_KEY) {
      ledgerCache = null;
      loadLedger();
    } else {
      return;
    }
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  });
}

/** یه تکرار (یا چند تکرار) رو برای یه آیتم ثبت می‌کنه.
 *  opts: { count=1, at=Date.now(), source: "player" | "manual" }
 */
export function recordNeuralRepeat(id, opts) {
  if (!id) return;
  const store = loadStore();
  const list = store[id] || (store[id] = []);
  const count = Math.max(1, Math.min(999, Number((opts && opts.count) || 1)));
  const ts = (opts && opts.at) || Date.now();
  const source = opts && opts.source === "manual" ? "m" : "p";
  for (let i = 0; i < count; i++) list.push({ t: ts, s: source });
  // یه فایلِ در حالِ رشد بی‌نهایت نمی‌خوایم؛ فعلاً سقفِ منطقی برای هر آیتم.
  if (list.length > 2000) list.splice(0, list.length - 2000);
  persist();
}

export function getNeuralEvents(id) {
  return id ? loadStore()[id] || [] : [];
}

// -----------------------------------------------------------------------
// شناساییِ «زبان» از رویِ خودِ id — دو قالبِ رایج داریم:
//   ۱) `نوع:شناسه:کدزبان` (مثلاً word:12:en) — زبان آخرین بخشه.
//   ۲) `نوع:کدزبان::متن` (مثلاً conv:en::Your tires are fine...، یا
//      story:fa::سلام) — اینجا زبان بلافاصله بعدِ اولین «:» میاد، نه
//      انتهای id (چون بعدش خودِ متن با «::» شروع می‌شه). توی تبِ مکالماتِ
//      روزمره، برای هر خط، «متن» همیشه همون جمله‌ی انگلیسیِ اصلیه (چه برایِ
//      خودِ انگلیسی، چه برایِ هر ترجمه) — پس با این الگو، شناسه‌ی پایه‌ی
//      همه‌ی زبان‌های یه خط یکی از آب در میاد و کنارِ هم جمع می‌شن.
// اگه هیچ‌کدوم مچ نشه، کلِ id به‌عنوانِ شناسه‌ی پایه در نظر گرفته می‌شه و
// زبانش نامشخص (null) می‌مونه.
const LANG_SUFFIX_RE = /^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/;
const LANG_DOUBLE_COLON_RE = /^([^:]+):([a-z]{2,3}(?:-[a-zA-Z]{2,4})?)::([\s\S]*)$/;
export function splitNeuralId(id) {
  if (!id) return { base: id, lang: null };
  const m = id.match(LANG_DOUBLE_COLON_RE);
  if (m) {
    const [, type, lang, rest] = m;
    return { base: `${type}::${rest}`, lang };
  }
  const idx = id.lastIndexOf(":");
  if (idx === -1) return { base: id, lang: null };
  const lang = id.slice(idx + 1);
  if (!LANG_SUFFIX_RE.test(lang)) return { base: id, lang: null };
  return { base: id.slice(0, idx), lang };
}

/** همه‌ی رویدادهای مربوط به یه آیتم رو — از رویِ همه‌ی زبان‌هاش —
 *  یکجا برمی‌گردونه؛ هر رویداد با {t, s, lang} مشخص می‌شه. برای تقویمی
 *  که باید «به‌طور لحظه‌ای» زبان‌های مختلفِ یه آیتم رو کنارِ هم نشون بده.
 */
export function getNeuralEventsGrouped(id) {
  if (!id) return [];
  const { base } = splitNeuralId(id);
  const store = loadStore();
  const out = [];
  Object.keys(store).forEach((key) => {
    const parts = splitNeuralId(key);
    if (parts.base !== base) return;
    const lang = parts.lang || "?";
    (store[key] || []).forEach((e) => out.push({ t: e.t, s: e.s, lang }));
  });
  return out;
}

export function clearNeuralPath(id) {
  if (!id) return;
  const store = loadStore();
  const ledger = loadLedger();
  let changed = false;
  if (store[id]) {
    delete store[id];
    changed = true;
  }
  if (ledger[id]) {
    delete ledger[id];
    changed = true;
  }
  if (changed) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
    } catch {}
    try {
      window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledgerCache));
    } catch {}
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }
}

// -----------------------------------------------------------------------
// «رشته‌های عصبی» — دفترچه‌ی جداگانه‌ای از رویدادهای بالا: هر آیتم یه
// {logs:{}, habitFormed:false} داره. هر بار کاربر دکمه‌ی «امروز انجام
// دادم» رو بزنه یه فیبرِ true اضافه می‌شه، هر بار «یک روز گذشت، انجام
// ندادم» رو بزنه یه فیبرِ false. «رشته‌های ساخته‌شده» = (تعداد true) −
// (تعداد false)، هیچ‌وقت منفی نمی‌شه. برخلافِ سیستمِ «بازی فراوانی»، اینجا
// (چون هر آیتم با هزاران آیتمِ دیگه رقابت می‌کنه) هیچ کاهشِ خودکاری برای
// روزهای بی‌تمرین نداریم — فقط با کلیکِ خودِ کاربر رشته اضافه/کم می‌شه.
function loadLedger() {
  if (ledgerCache) return ledgerCache;
  try {
    ledgerCache = JSON.parse(window.localStorage.getItem(LEDGER_KEY) || "{}");
  } catch {
    ledgerCache = {};
  }
  return ledgerCache;
}

function persistLedger() {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledgerCache));
  } catch {}
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function ensureLedgerEntry(id) {
  const store = loadLedger();
  if (!store[id] || typeof store[id] !== "object") store[id] = { logs: {}, habitFormed: false };
  if (!store[id].logs || typeof store[id].logs !== "object") store[id].logs = {};
  return store[id];
}

// کلید یکتا برای هر رشته — هر کلیک رشته‌ی جدای خودش رو می‌سازه
function fiberKey() {
  return "f" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

export function neuralFiberCount(logs) {
  let n = 0;
  Object.keys(logs || {}).forEach((k) => {
    if (logs[k] === true) n++;
    else if (logs[k] === false) n--;
  });
  return Math.max(0, n);
}

/** «امروز انجام دادم»: نامحدود، همیشه یه رشته‌ی تازه اضافه می‌کنه */
export function addNeuralFiber(id) {
  if (!id) return;
  const entry = ensureLedgerEntry(id);
  entry.logs[fiberKey()] = true;
  persistLedger();
}

/** «یک روز گذشت، انجام ندادم»: نامحدود، یه رشته کم می‌کنه (تا صفر) */
export function removeNeuralFiber(id) {
  if (!id) return;
  const entry = ensureLedgerEntry(id);
  entry.logs[fiberKey()] = false;
  persistLedger();
}

/** دکمه‌ی «همینه، این عادت جاافتاد» — یه قفلِ toggle‌شونده، نه یه‌طرفه */
export function toggleHabitFormed(id) {
  if (!id) return;
  const entry = ensureLedgerEntry(id);
  entry.habitFormed = !entry.habitFormed;
  persistLedger();
}

export function getNeuralLedger(id) {
  if (!id) return { logs: {}, habitFormed: false };
  return ensureLedgerEntry(id);
}

export function useNeuralLedger(id) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return getNeuralLedger(id);
}

export function useNeuralEvents(id) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return getNeuralEvents(id);
}

/** نسخه‌ی زنده‌ی getNeuralEventsGrouped — با هر تغییر (حتی یه تکرارِ
 *  آنی/لحظه‌ای)، بلافاصله دوباره محاسبه می‌شه، بدون نیاز به هیچ جمع‌زدنِ
 *  دستی از طرفِ کامپوننت‌ها. */
export function useNeuralEventsGrouped(id) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return getNeuralEventsGrouped(id);
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function yearKey(ts) {
  return String(new Date(ts).getFullYear());
}

function summarize(events) {
  const last = events.length ? Math.max(...events.map((e) => e.t)) : null;
  return { total: events.length, last };
}

function fmtRel(ts) {
  if (!ts) return "—";
  const now = new Date();
  const d = new Date(ts);
  if (d.toDateString() === now.toDateString()) return "امروز";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "دیروز";
  try {
    return d.toLocaleDateString("fa-IR");
  } catch {
    return d.toLocaleDateString();
  }
}

const DEFAULT_C = {
  paper: "#FBF6E9",
  border: "#E7DEC1",
  soft: "#F5F1E2",
  ink: "#1E2A26",
  inkSoft: "#4B5551",
  gold: "#C99A2E",
  goldSoft: "#E3C77E",
  teal: "#1B4640",
};

// ---------------------------------------------------------------------------
// اتصال به تنظیمِ تقویمِ app.jsx — از همون localStorage می‌خونیم که خودِ
// اپ تنظیمات رو اونجا ذخیره می‌کنه. هم به رویدادِ storage (تغییر بین تب‌ها)
// گوش می‌دیم، هم به رویدادِ custom (تغییر تو همون تب).
// ---------------------------------------------------------------------------
const APP_PREFS_KEY = "phrasebook-app-prefs";
const APP_PREFS_CHANGED_EVENT = "phrasebook:appPrefsChanged";

function getCalendarSystem() {
  try {
    const raw = window.localStorage.getItem(APP_PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return ["jalali", "gregorian", "both"].includes(parsed.calendarSystem) ? parsed.calendarSystem : "jalali";
  } catch {
    return "jalali";
  }
}
function useCalendarSystem() {
  const [cs, setCs] = useState(getCalendarSystem);
  useEffect(() => {
    const refresh = () => setCs(getCalendarSystem());
    window.addEventListener("storage", refresh);
    window.addEventListener(APP_PREFS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(APP_PREFS_CHANGED_EVENT, refresh);
    };
  }, []);
  return cs;
}

// ---------------------------------------------------------------------------
// تبدیلاتِ تاریخِ شمسی/میلادی — نسخه‌ی استاندارد
// ---------------------------------------------------------------------------
const PERSIAN_MONTHS_FULL = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const EN_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  if (gy > 1600) { jy = 979; gy -= 1600; } else { jy = 0; gy -= 621; }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let jm, jd;
  if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
  else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
  return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd) {
  let gy = jy > 979 ? 1600 : 621;
  if (jy > 979) jy -= 979;
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]) { gd -= monthDays[gm]; gm++; }
  return [gy, gm, gd];
}

function isJalaliLeapYear(jy) {
  const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30);
  const [ry, rm, rd] = gregorianToJalali(gy, gm, gd);
  return ry === jy && rm === 12 && rd === 30;
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toEnDigits(s) { return String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))); }

function navBtnStyle(c) {
  return {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    background: "#fff",
    color: c.ink,
    fontSize: 13,
    cursor: "pointer",
  };
}

function DayGrid({ cursor, setCursor, byDay, c, calendarSystem, selectedDay, onSelectDay }) {
  const isGregorian = calendarSystem === "gregorian";
  const showSecondary = calendarSystem === "both";

  // ---------- حالتِ میلادی ----------
  if (isGregorian) {
    const gyear = cursor.getFullYear();
    const gmonth = cursor.getMonth();
    const daysInMonth = new Date(gyear, gmonth + 1, 0).getDate();
    const startCol = new Date(gyear, gmonth, 1).getDay(); // یکشنبه=۰
    const cells = [];
    for (let i = 0; i < startCol; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const today = new Date();
    let recorded = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if ((byDay.get(`${gyear}-${pad2(gmonth + 1)}-${pad2(d)}`) || 0) > 0) recorded++;
    }
    return (
      <div dir="ltr">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => setCursor(new Date(gyear, gmonth - 1, 1))} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>‹</button>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>
            {["January","February","March","April","May","June","July","August","September","October","November","December"][gmonth]} {gyear}
          </span>
          <button onClick={() => setCursor(new Date(gyear, gmonth + 1, 1))} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, color: c.inkSoft, fontWeight: 700 }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const key = `${gyear}-${pad2(gmonth + 1)}-${pad2(d)}`;
            const n = byDay.get(key) || 0;
            const isToday = today.getFullYear() === gyear && today.getMonth() === gmonth && today.getDate() === d;
            const isSelected = key === selectedDay;
            return (
              <div
                key={i}
                onClick={() => onSelectDay && onSelectDay(key)}
                title={`${d} ${EN_MONTHS_SHORT[gmonth]} ${gyear}${n ? ` · ${n} تکرار` : " · ثبت نشده"}`}
                style={{
                  position: "relative", aspectRatio: "1", display: "flex",
                  alignItems: "center", justifyContent: "center", borderRadius: 7,
                  fontSize: 11, fontWeight: n ? 800 : 500,
                  background: n ? c.gold : "transparent",
                  color: n ? "#fff" : c.inkSoft,
                  border: isToday ? `1.5px solid ${c.teal}` : "1px solid transparent",
                  boxShadow: isSelected ? `0 0 0 2px ${c.teal}` : "none",
                  cursor: "pointer",
                }}
              >
                {d}
                {n > 0 && (
                  <span style={{ position: "absolute", top: 1, left: 2, fontSize: 7, fontWeight: 800, background: "#fff", color: c.gold, borderRadius: 5, padding: "0 3px", lineHeight: 1.3 }}>
                    {n}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {recorded === 0 && (
          <p style={{ fontSize: 10.5, color: c.inkSoft, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
            این ماه هیچ تمرینی ثبت نشده.
          </p>
        )}
        <button onClick={() => { const t = new Date(); setCursor(t); onSelectDay && onSelectDay(dayKey(t)); }} style={{ marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 8, border: `1px solid ${c.border}`, background: c.soft, color: c.ink, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
          برو به امروز
        </button>
      </div>
    );
  }

  // ---------- حالتِ شمسی (یا هردو) ----------
  const [jy, jm] = gregorianToJalali(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : (isJalaliLeapYear(jy) ? 30 : 29);
  const [gy0, gm0, gd0] = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(gy0, gm0 - 1, gd0);
  const startCol = (firstDate.getDay() + 1) % 7; // شنبه=۰
  const cells = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const [gyEnd, gmEnd, gdEnd] = jalaliToGregorian(jy, jm, daysInMonth);
  const today = new Date();
  const [tjy, tjm, tjd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  let recorded = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, d);
    if ((byDay.get(`${gy}-${pad2(gm)}-${pad2(gd)}`) || 0) > 0) recorded++;
  }

  const goMonth = (delta) => {
    let ny = jy, nm = jm + delta;
    while (nm > 12) { nm -= 12; ny += 1; }
    while (nm < 1) { nm += 12; ny -= 1; }
    const [gy, gm, gd] = jalaliToGregorian(ny, nm, 1);
    setCursor(new Date(gy, gm - 1, gd));
  };

  return (
    <div dir="ltr">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 4 }}>
        <button onClick={() => goMonth(-1)} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>‹</button>
        <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>
            {PERSIAN_MONTHS_FULL[jm - 1]} {jy}
          </div>
          {showSecondary && (
            <div style={{ fontSize: 9.5, color: c.inkSoft }}>
              {`${gd0} ${EN_MONTHS_SHORT[gm0 - 1]} – ${gdEnd} ${EN_MONTHS_SHORT[gmEnd - 1]} ${gy0}`}
            </div>
          )}
        </div>
        <button onClick={() => goMonth(1)} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {["ش","ی","د","س","چ","پ","ج"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: c.inkSoft, fontWeight: 700 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const [gy, gm, gd] = jalaliToGregorian(jy, jm, d);
          const key = `${gy}-${pad2(gm)}-${pad2(gd)}`;
          const n = byDay.get(key) || 0;
          const isToday = jy === tjy && jm === tjm && d === tjd;
          const isSelected = key === selectedDay;
          return (
            <div
              key={i}
              onClick={() => onSelectDay && onSelectDay(key)}
              title={`${d} ${PERSIAN_MONTHS_FULL[jm - 1]} ${jy}${showSecondary ? ` — ${gd} ${EN_MONTHS_SHORT[gm - 1]}` : ""}${n ? ` · ${n} تکرار` : " · ثبت نشده"}`}
              style={{
                position: "relative", aspectRatio: "1", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderRadius: 7, fontSize: 10.5, fontWeight: n ? 800 : 500,
                background: n ? c.gold : "transparent",
                color: n ? "#fff" : c.inkSoft,
                border: isToday ? `1.5px solid ${c.teal}` : "1px solid transparent",
                boxShadow: isSelected ? `0 0 0 2px ${c.teal}` : "none",
                cursor: "pointer",
                padding: "1px 0",
              }}
            >
              <span style={{ fontSize: 11, lineHeight: 1.1 }}>{d}</span>
              {showSecondary && (
                <span style={{ fontSize: 7.5, lineHeight: 1, opacity: 0.7, marginTop: 1 }}>{gd}</span>
              )}
              {n > 0 && (
                <span style={{ position: "absolute", top: 1, left: 2, fontSize: 7, fontWeight: 800, background: "#fff", color: c.gold, borderRadius: 5, padding: "0 3px", lineHeight: 1.3 }}>
                  {n}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {recorded === 0 && (
        <p style={{ fontSize: 10.5, color: c.inkSoft, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
          این ماه هیچ تمرینی ثبت نشده.
        </p>
      )}
      <button onClick={() => { const t = new Date(); setCursor(t); onSelectDay && onSelectDay(dayKey(t)); }} style={{ marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 8, border: `1px solid ${c.border}`, background: c.soft, color: c.ink, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
        برو به امروز
      </button>
    </div>
  );
}

const FA_MONTHS_SHORT = ["ژان", "فور", "مار", "آور", "می", "ژون", "جول", "اوت", "سپت", "اکت", "نوا", "دسا"];

function MonthGrid({ cursor, setCursor, byMonth, c, calendarSystem }) {
  const isGregorian = calendarSystem === "gregorian";
  const showSecondary = calendarSystem === "both";

  // ---------- میلادی ----------
  if (isGregorian) {
    const gyear = cursor.getFullYear();
    const cells = [];
    for (let m = 0; m < 12; m++) {
      let count = 0;
      const daysInMonth = new Date(gyear, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) count += byMonth.get(`${gyear}-${pad2(m + 1)}`) || 0;
      cells.push({ m, count });
    }
    return (
      <div dir="ltr">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => setCursor(new Date(gyear - 1, 0, 1))} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>‹</button>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>{gyear}</span>
          <button onClick={() => setCursor(new Date(gyear + 1, 0, 1))} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
          {cells.map((cell) => (
            <div
              key={cell.m}
              onClick={() => setCursor(new Date(gyear, cell.m, 1))}
              style={{ padding: "6px 3px", borderRadius: 8, textAlign: "center", background: cell.count ? c.goldSoft : c.soft, border: `1px solid ${cell.count ? c.gold : c.border}`, cursor: "pointer" }}
            >
              <div style={{ fontSize: 10.5, color: c.ink, fontWeight: 700 }}>{EN_MONTHS_SHORT[cell.m]}</div>
              <div style={{ fontSize: 12, color: cell.count ? c.gold : c.inkSoft, fontWeight: 800 }}>{cell.count || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- شمسی / هر دو ----------
  const [jy] = gregorianToJalali(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  const cells = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = m <= 6 ? 31 : m <= 11 ? 30 : (isJalaliLeapYear(jy) ? 30 : 29);
    const [gyS, gmS, gdS] = jalaliToGregorian(jy, m, 1);
    const [gyE, gmE, gdE] = jalaliToGregorian(jy, m, daysInMonth);
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const [gy, gm] = jalaliToGregorian(jy, m, d);
      count += byMonth.get(`${gy}-${pad2(gm)}`) || 0;
    }
    cells.push({ m, count, gyS, gmS, gdS, gmE, gdE });
  }
  const goYear = (delta) => {
    const [gy, gm, gd] = jalaliToGregorian(jy + delta, 1, 1);
    setCursor(new Date(gy, gm - 1, gd));
  };
  return (
    <div dir="ltr">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button onClick={() => goYear(-1)} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>‹</button>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>{jy}</span>
        <button onClick={() => goYear(1)} style={{ ...navBtnStyle(c), width: 30, height: 30, fontSize: 15 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
        {cells.map((cell) => (
          <div
            key={cell.m}
            onClick={() => {
              const [gy, gm, gd] = jalaliToGregorian(jy, cell.m, 1);
              setCursor(new Date(gy, gm - 1, gd));
            }}
            style={{ padding: "6px 3px", borderRadius: 8, textAlign: "center", background: cell.count ? c.goldSoft : c.soft, border: `1px solid ${cell.count ? c.gold : c.border}`, cursor: "pointer" }}
          >
            <div style={{ fontSize: 10.5, color: c.ink, fontWeight: 700 }}>{PERSIAN_MONTHS_FULL[cell.m - 1]}</div>
            {showSecondary && (
              <div style={{ fontSize: 8.5, color: c.inkSoft }}>{EN_MONTHS_SHORT[cell.gmS - 1]}–{EN_MONTHS_SHORT[cell.gmE - 1]}</div>
            )}
            <div style={{ fontSize: 12, color: cell.count ? c.gold : c.inkSoft, fontWeight: 800 }}>{cell.count || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearList({ byYear, c, calendarSystem }) {
  const years = Array.from(byYear.keys()).sort();
  if (years.length === 0)
    return <p style={{ fontSize: 12, color: c.inkSoft, textAlign: "center", padding: "6px 0" }}>هنوز داده‌ای برای نمای سالانه نیست.</p>;
  const isGregorian = calendarSystem === "gregorian";
  const showSecondary = calendarSystem === "both";
  return (
    <div dir="ltr" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {years.map((gy) => {
        const [jy] = gregorianToJalali(Number(gy), 1, 1);
        const primary = isGregorian ? gy : jy;
        const secondaryLabel = isGregorian
          ? (showSecondary ? `(${jy} شمسی)` : "")
          : (showSecondary ? `(${gy} میلادی)` : "");
        return (
          <div key={gy} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: c.soft, border: `1px solid ${c.border}` }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: c.ink }}>
              {primary} {secondaryLabel && <span style={{ fontSize: 10, color: c.inkSoft }}>{secondaryLabel}</span>}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: c.gold }}>{byYear.get(gy)} تکرار</span>
          </div>
        );
      })}
    </div>
  );
}

// فرمتِ عنوانِ روزِ انتخاب‌شده، مطابقِ همون تنظیمِ تقویمِ کاربر (شمسی/میلادی/هردو)
function formatDayHeader(key, calendarSystem) {
  const [gy, gm, gd] = key.split("-").map(Number);
  const gregorianStr = `${gd} ${EN_MONTHS_SHORT[gm - 1]} ${gy}`;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  const jalaliStr = `${jd} ${PERSIAN_MONTHS_FULL[jm - 1]} ${jy}`;
  if (calendarSystem === "gregorian") return gregorianStr;
  if (calendarSystem === "both") return `${jalaliStr} (${gregorianStr})`;
  return jalaliStr;
}

// جزئیاتِ روزِ انتخاب‌شده: طبقِ درخواستِ کاربر، دیگه ساعتِ دقیقِ هر
// تکرار نشون داده نمی‌شه — فقط توی همین تقویم، برای اون روز، تعدادِ
// تکرارِ هر زبان جدا جدا نشون داده می‌شه (مثلاً en: ۳ بار، es: ۶ بار).
// چون events از getNeuralEventsGrouped میاد، خودِ زبان‌ها (نسخه‌ی اصلی +
// همه‌ی ترجمه‌ها) به‌طور لحظه‌ای و بدون نیاز به جمع‌زدنِ دستی به‌هم
// وصل‌ان — با هر تکرارِ تازه، لیست بلافاصله به‌روز می‌شه.
function DayDetailsPanel({ dayKeyStr, events, c, calendarSystem }) {
  const dayEvents = useMemo(() => {
    return (events || []).filter((e) => dayKey(e.t) === dayKeyStr);
  }, [events, dayKeyStr]);

  const byLang = useMemo(() => {
    const m = new Map();
    dayEvents.forEach((e) => {
      const lang = e.lang || "?";
      m.set(lang, (m.get(lang) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [dayEvents]);

  if (!dayKeyStr) return null;
  const header = formatDayHeader(dayKeyStr, calendarSystem);

  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${c.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: c.ink, marginBottom: 6, textAlign: "center" }}>
        {header}
        {dayEvents.length > 0 && <span style={{ color: c.gold }}> · {dayEvents.length} تکرار</span>}
      </div>
      {dayEvents.length === 0 ? (
        <p style={{ fontSize: 10.5, color: c.inkSoft, textAlign: "center", fontStyle: "italic" }}>
          در این روز تمرینی ثبت نشده.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" }}>
          {byLang.map(([lang, count]) => (
            <div
              key={lang}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, padding: "5px 9px", borderRadius: 7, background: c.soft }}
            >
              <span style={{ color: c.ink, fontWeight: 800 }}>{lang}</span>
              <span style={{ color: c.inkSoft }}>{count} بار</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NeuralCalendar({ events, c }) {
  const calendarSystem = useCalendarSystem();
  const [mode, setMode] = useState("day");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(Date.now()));

  const byDay = useMemo(() => {
    const m = new Map();
    events.forEach((e) => m.set(dayKey(e.t), (m.get(dayKey(e.t)) || 0) + 1));
    return m;
  }, [events]);
  const byMonth = useMemo(() => {
    const m = new Map();
    events.forEach((e) => m.set(monthKey(e.t), (m.get(monthKey(e.t)) || 0) + 1));
    return m;
  }, [events]);
  const byYear = useMemo(() => {
    const m = new Map();
    events.forEach((e) => m.set(yearKey(e.t), (m.get(yearKey(e.t)) || 0) + 1));
    return m;
  }, [events]);

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setMode(key)}
      style={{
        flex: 1,
        padding: "6px 0",
        fontSize: 11.5,
        fontWeight: 700,
        borderRadius: 8,
        border: `1px solid ${mode === key ? c.gold : "transparent"}`,
        background: mode === key ? c.goldSoft : "transparent",
        color: c.ink,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginTop: 10, borderTop: `1px dashed ${c.border}`, paddingTop: 10 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {tabBtn("day", "روزانه")}
        {tabBtn("month", "ماهانه")}
        {tabBtn("year", "سالانه")}
      </div>
      {mode === "day" && (
        <>
          <DayGrid cursor={cursor} setCursor={setCursor} byDay={byDay} c={c} calendarSystem={calendarSystem} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          <DayDetailsPanel dayKeyStr={selectedDay} events={events} c={c} calendarSystem={calendarSystem} />
        </>
      )}
      {mode === "month" && <MonthGrid cursor={cursor} setCursor={setCursor} byMonth={byMonth} c={c} calendarSystem={calendarSystem} />}
      {mode === "year" && <YearList byYear={byYear} c={c} calendarSystem={calendarSystem} />}
    </div>
  );
}

// 🧬 خودِ «رشته‌های عصبی» — خط‌هایی که دو نرون (دایره‌ی یادگیری و دایره‌ی
// تثبیت) رو به‌هم وصل می‌کنن. برخلافِ نسخه‌ی قبلی (یه خطِ تکی که فقط
// ضخیم‌تر می‌شد)، الان هر «رشته» (یعنی هر روزِ متفاوتی که توش تمرین ثبت
// شده) یه خطِ نازکِ جداگانه‌ست — دقیقاً مثلِ یه کابلِ بافته‌شده از چندین
// رشته‌ی باریک که هرکدوم کنارِ هم (نه روی هم) جمع می‌شن، شکلِ عدسی‌مانندِ
// وسطش با هر رشته‌ی تازه یه‌کم بازتر می‌شه. با هر ثبتِ تازه («امروز انجام
// دادم») یه رشته‌ی تازه اضافه می‌شه و یه پالسِ نورانی رویِ همون رشته‌ی
// تازه می‌ره؛ با حذفِ یه رشته («یک روز گذشت، انجام ندادم») هم یه پالسِ
// محوشونده‌ی قرمزِکم‌رنگ رویِ آخرین رشته می‌ره تا حسِ «کم‌شدن» منتقل بشه.
const CIRCLE_SIZE = 34;
// قبلاً روی ۸۰ تا قفل بود و رشته‌های بیشتر اصلاً رندر نمی‌شدن (رشته‌ی صدم و
// دویستم و پونصدم هیچ فرقی با رشته‌ی هشتادم نداشت). حالا خودِ کاربر تا
// ۵۰۰ رشته رو واقعاً می‌بینه.
const MAX_RENDERED_FIBERS = 500;

// هش سادهٔ قطعی (نه Math.random) — برای هر ایندکسِ رشته همیشه همون عددِ
// «تصادفی» رو می‌ده، پس بین رندرها نمی‌پره و جای رشته‌ها ثابت می‌مونه.
function seededJitter(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // بین ۰ و ۱
}
function NeuralFibers({ fiberCount, habitFormed, c }) {
  const prevCountRef = useRef(fiberCount);
  const [pulse, setPulse] = useState(null); // { key, kind: "add" | "remove" } | null

  useEffect(() => {
    if (fiberCount > prevCountRef.current) setPulse({ key: Date.now(), kind: "add" });
    else if (fiberCount < prevCountRef.current) setPulse({ key: Date.now(), kind: "remove" });
    prevCountRef.current = fiberCount;
  }, [fiberCount]);

  // مثلِ نورونِ «عادت»: وقتی رشته‌ها به سقف می‌رسن یا عادت قفل شده، رنگِ
  // رشته‌ها هم طلایی می‌شه؛ قبلش رنگِ خنثی‌تر (teal).
  const strong = habitFormed || fiberCount >= NEURAL_FIBER_CAP;
  co                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               