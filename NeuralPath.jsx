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

function DayGrid({ cursor, setCursor, byDay, c }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  let monthLabel = `${month + 1}/${year}`;
  try {
    monthLabel = cursor.toLocaleDateString("fa-IR", { month: "long", year: "numeric" });
  } catch {}
  const todayKey = dayKey(Date.now());

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtnStyle(c)}>‹</button>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>{monthLabel}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtnStyle(c)}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["ی", "د", "س", "چ", "پ", "ج", "ش"].map((d, idx) => (
          <div key={idx} style={{ textAlign: "center", fontSize: 10, color: c.inkSoft, fontWeight: 700 }}>
            {d}
          </div>
        ))}
        {cells.map((d, idx) => {
          if (d === null) return <div key={idx} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const n = byDay.get(key) || 0;
          const isToday = key === todayKey;
          return (
            <div
              key={idx}
              title={n ? `${n} تکرار` : ""}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 7,
                fontSize: 10.5,
                fontWeight: n ? 800 : 500,
                background: n ? c.gold : "transparent",
                color: n ? "#fff" : c.inkSoft,
                opacity: n ? Math.min(1, 0.45 + n * 0.15) : 1,
                border: isToday ? `1.5px solid ${c.teal}` : "1px solid transparent",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FA_MONTHS_SHORT = ["ژان", "فور", "مار", "آور", "می", "ژون", "جول", "اوت", "سپت", "اکت", "نوا", "دسا"];

function MonthGrid({ cursor, setCursor, byMonth, c }) {
  const year = cursor.getFullYear();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button onClick={() => setCursor(new Date(year - 1, cursor.getMonth(), 1))} style={navBtnStyle(c)}>‹</button>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>{year}</span>
        <button onClick={() => setCursor(new Date(year + 1, cursor.getMonth(), 1))} style={navBtnStyle(c)}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {Array.from({ length: 12 }, (_, m) => {
          const key = `${year}-${String(m + 1).padStart(2, "0")}`;
          const n = byMonth.get(key) || 0;
          return (
            <div
              key={m}
              style={{
                padding: "8px 4px",
                borderRadius: 8,
                textAlign: "center",
                background: n ? c.goldSoft : c.soft,
                border: `1px solid ${c.border}`,
              }}
            >
              <div style={{ fontSize: 10, color: c.inkSoft, fontWeight: 700 }}>{FA_MONTHS_SHORT[m]}</div>
              <div style={{ fontSize: 13, color: c.ink, fontWeight: 800 }}>{n || "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearList({ byYear, c }) {
  const years = Array.from(byYear.keys()).sort();
  if (years.length === 0)
    return <p style={{ fontSize: 12, color: c.inkSoft, textAlign: "center", padding: "6px 0" }}>هنوز داده‌ای برای نمای سالانه نیست.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {years.map((y) => (
        <div
          key={y}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "7px 10px",
            borderRadius: 8,
            background: c.soft,
            border: `1px solid ${c.border}`,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c.ink }}>{y}</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: c.gold }}>{byYear.get(y)} تکرار</span>
        </div>
      ))}
    </div>
  );
}

function NeuralCalendar({ events, c }) {
  const [mode, setMode] = useState("day");
  const [cursor, setCursor] = useState(() => new Date());

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
      {mode === "day" && <DayGrid cursor={cursor} setCursor={setCursor} byDay={byDay} c={c} />}
      {mode === "month" && <MonthGrid cursor={cursor} setCursor={setCursor} byMonth={byMonth} c={c} />}
      {mode === "year" && <YearList byYear={byYear} c={c} />}
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
  const strandColor = strong ? c.gold : c.teal;

  if (fiberCount <= 0) return null;

  const n = Math.min(fiberCount, MAX_RENDERED_FIBERS);
  // پهنایِ بازشدنِ عدسی: رشدش با ریشه‌ی تعداد کنده می‌شه (نه خطی)، وگرنه با
  // چند صد رشته از کادر می‌زنه بیرون؛ با sqrt هم برای ۱۰ تا هم برای ۵۰۰ تا
  // فرق قابلِ‌دیدن داره.
  const spread = Math.min(34, 8 + Math.sqrt(n) * 1.2);
  // رشته‌ها دیگه هر دوتا سرشون رو دقیقاً روی همون یه پیکسل نمی‌ذارن — یه
  // کمی جابه‌جاییِ ثابت (نه رندوم واقعی) روی محیطِ نورون می‌گیرن تا وقتی
  // تعداد زیاد شد، سرها هم مثلِ یه دسته‌ی واقعی از رشته باز شن، نه یه نقطه‌ی
  // تیره‌ی توپر.
  const endpointSpread = Math.min(9, 2 + Math.sqrt(n) * 0.35);
  // هرچی رشته بیشتر باشه، هر تکِ رشته کم‌رنگ‌تر و نازک‌تر می‌شه — این باعث
  // می‌شه دسته‌ی رشته‌ها به‌جای یه لکه‌ی توپرِ تیره، مثلِ یه بافتِ ظریف دیده
  // بشه، حتی وقتی ۵۰۰ تا روی هم‌اند.
  const baseOpacity = Math.max(0.15, 0.6 - n * 0.0008);
  const baseWidth = n > 200 ? 0.2 : n > 80 ? 0.3 : 0.4;
  const paths = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const bow = -spread / 2 + t * spread; // از بالا به پایینِ عدسی پخش می‌شن
    const startJitter = (seededJitter(i * 2 + 1) - 0.5) * endpointSpread;
    const endJitter = (seededJitter(i * 2 + 2) - 0.5) * endpointSpread;
    const isNewest = i === n - 1;
    paths.push(
      <path
        key={i}
        d={`M 14 ${20 + startJitter} Q 50 ${20 + bow} 86 ${20 + endJitter}`}
        fill="none"
        stroke={strandColor}
        strokeWidth={isNewest && pulse && pulse.kind === "add" ? baseWidth + 0.2 : baseWidth}
        strokeLinecap="round"
        opacity={isNewest ? 0.95 : baseOpacity}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
    >
      {paths}
      {pulse && pulse.kind === "remove" && (
        <path
          key={`pulse-${pulse.key}`}
          d="M 14 20 Q 50 20 86 20"
          fill="none"
          stroke={c.rose || "#B4483F"}
          strokeWidth={6}
          strokeLinecap="round"
          style={{ animation: "neuralStrandPulse 0.9s ease-out" }}
        />
      )}
      <style>{`
        @keyframes neuralStrandPulse {
          0% { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

function NeuralPathCard({ id, label, c, onClose, dragHandleProps }) {
  const events = useNeuralEvents(id);
  const s = useMemo(() => summarize(events), [events]);
  const ledger = useNeuralLedger(id);
  const fiberCount = neuralFiberCount(ledger.logs);
  const habitFormed = !!ledger.habitFormed;
  // آستانه‌های رنگِ نورونِ «عادت»: یه‌کم رنگ می‌گیره وقتی به یه سومِ سقف
  // رسیده، رنگِ کامل می‌گیره وقتی به سقف رسیده یا کاربر خودش قفلش کرده.
  const nodeMid = habitFormed || fiberCount >= Math.ceil(NEURAL_FIBER_CAP / 3);
  const nodeStrong = habitFormed || fiberCount >= NEURAL_FIBER_CAP;
  const [showCalendar, setShowCalendar] = useState(false);

  const doToday = () => addNeuralFiber(id);
  const doMissedDay = () => removeNeuralFiber(id);
  const doToggleHabit = () => toggleHabitFormed(id);

  let status;
  if (habitFormed) status = `این ${label} کاملاً جاافتاده — یک رشته‌ی عصبیِ واقعی 🎉`;
  else if (fiberCount <= 0) status = `هنوز مسیرِ عصبی‌ای برای این ${label} شکل نگرفته — همین امروز انجامش بده.`;
  else if (!nodeMid) status = `اولین رشته‌های عصبیِ این ${label} شکل گرفتن، ادامه بده.`;
  else if (!nodeStrong) status = `رشته‌های این ${label} دارن کنار هم جمع و ضخیم می‌شن.`;
  else status = `این ${label} یه مسیرِ عصبیِ محکم و جاافتاده شده — اگه حس می‌کنی واقعاً عادت شده، می‌تونی قفلش کنی.`;

  return (
    <div
      style={{
        background: c.paper,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 10,
        width: 232,
        maxWidth: "78vw",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
      }}
    >
      {/* دستگیره‌ی جابجایی — یه نوارِ کوچیکِ بالای کارت + کلِ ردیفِ عنوان،
          هر دو با انگشت/موس قابلِ کشیدنن (dragHandleProps از رویِ
          NeuralPathButton میاد). دکمه‌ی ✕ از این قانون مستثناست تا فشار
          دادنش با شروعِ درگ قاطی نشه. */}
      <div {...dragHandleProps} style={{ cursor: "grab", touchAction: "none", marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: c.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: c.ink, display: "flex", alignItems: "center", gap: 5 }}>
            <span>🧬</span>
            <span>مسیر عصبی این {label}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="بستن"
              style={{ width: 20, height: 20, flexShrink: 0, border: "none", background: "transparent", color: c.inkSoft, fontSize: 13, cursor: "pointer" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* دو نرون («رفتار» و «عادت») در دو سرِ کادر + دسته‌ای از رشته‌های
          عصبیِ نازک که بینشون، مثلِ یه کابلِ بافته‌شده، وصل می‌شن. نرونِ
          «رفتار» همیشه خنثی می‌مونه؛ نرونِ «عادت» هرچی رشته‌ها بیشتر بشن
          پررنگ‌تر می‌شه. */}
      <div style={{ position: "relative", height: 62, marginBottom: 3 }}>
        <NeuralFibers fiberCount={fiberCount} habitFormed={habitFormed} c={c} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: "50%",
              flexShrink: 0,
              background: c.soft,
              border: `2px solid ${c.border}`,
            }}
          />
          <div
            style={{
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: "50%",
              flexShrink: 0,
              background: nodeStrong ? c.goldSoft : c.soft,
              border: `2px solid ${nodeMid ? c.gold : c.border}`,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: c.inkSoft, width: CIRCLE_SIZE, flexShrink: 0, textAlign: "center" }}>یادگیری</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: nodeMid ? c.ink : c.inkSoft, width: CIRCLE_SIZE, flexShrink: 0, textAlign: "center" }}>تثبیت</span>
      </div>

      <div style={{ background: c.soft, borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: c.inkSoft, marginBottom: 5 }}>رشته‌های ساخته‌شده</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: c.ink, marginBottom: 5 }}>{fiberCount}</div>
        {s.total > 0 && (
          <div style={{ fontSize: 9.5, color: c.inkSoft }}>
            {s.total} تکرار · آخرین تمرین: {fmtRel(s.last)}
          </div>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: c.inkSoft, lineHeight: 1.85, marginBottom: 8, textAlign: "center" }}>{status}</p>

      <button
        onClick={doToday}
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: "none",
          background: c.teal,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 6,
        }}
      >
        ✨ امروز انجام دادم
      </button>

      <button
        onClick={doMissedDay}
        disabled={fiberCount === 0}
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: "transparent",
          color: fiberCount === 0 ? c.border : c.inkSoft,
          fontSize: 11,
          fontWeight: 700,
          cursor: fiberCount === 0 ? "default" : "pointer",
          marginBottom: 6,
        }}
      >
        یک روز گذشت، انجام ندادم
      </button>

      {(fiberCount > 0 || habitFormed) && (
        <button
          onClick={doToggleHabit}
          style={{
            width: "100%",
            padding: "7px 0",
            borderRadius: 8,
            border: `1px solid ${habitFormed ? c.border : "#3F9B72"}`,
            background: habitFormed ? c.soft : "transparent",
            color: habitFormed ? c.inkSoft : "#2E7D5B",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 6,
          }}
        >
          {habitFormed ? "↩️ هنوز کافی نیست، ادامه بده" : "✅ همینه، رفت تو حافظه‌ی دائمیم"}
        </button>
      )}

      <button
        onClick={() => setShowCalendar((v) => !v)}
        style={{
          width: "100%",
          padding: "3px 0",
          background: "transparent",
          border: "none",
          color: c.inkSoft,
          fontSize: 10,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {showCalendar ? "بستنِ تقویم" : "نمایشِ تقویمِ این مسیر"}
      </button>
      {showCalendar && <NeuralCalendar events={events} c={c} />}
    </div>
  );
}

/** دکمه‌ی کوچیکِ 🧬 که کنارِ هر بلندگو/آیتم می‌شینه؛ با تپ‌کردن، کارتِ
 *  مسیر عصبیِ همون آیتم به‌صورتِ popover باز می‌شه — پیش‌فرض چیزی نشون
 *  داده نمی‌شه تا هیچ‌جا شلوغ نشه.
 */
export function NeuralPathButton({ id, label, colors: cOverride }) {
  const [open, setOpen] = useState(false);
  const c = cOverride || DEFAULT_C;
  const safeLabel = label || "مورد";

  // جابجاییِ کارت با انگشت/موس — موقعیتِ کارت به‌صورتِ یه آفستِ نسبیِ
  // {x,y} از مرکزِ صفحه نگه داشته می‌شه. از Pointer Events (نه Touch/Mouse
  // جدا) استفاده شده چون هم لمسِ گوشی، هم موسِ دسکتاپ رو با یه کد پوشش
  // می‌ده؛ setPointerCapture هم باعث می‌شه حتی اگه انگشت سریع حرکت کنه و
  // از رویِ دستگیره بیرون بره، درگ قطع نشه.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const onDragPointerDown = (e) => {
    e.stopPropagation();
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  const onDragPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    e.stopPropagation();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy });
  };
  const onDragPointerUp = (e) => {
    dragRef.current.dragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };
  const dragHandleProps = {
    onPointerDown: onDragPointerDown,
    onPointerMove: onDragPointerMove,
    onPointerUp: onDragPointerUp,
    onPointerCancel: onDragPointerUp,
  };

  if (!id) return null;

  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          // هر بار که کارت از نو باز می‌شه، دوباره از وسطِ صفحه شروع کنه —
          // نه از جایی که دفعه‌ی قبل کاربر جابجاش کرده بود.
          setPos({ x: 0, y: 0 });
          setOpen(true);
        }}
        title="مسیر عصبی"
        aria-label="مسیر عصبی"
        style={{
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 11,
          lineHeight: 1,
          opacity: 0.6,
          flexShrink: 0,
          padding: 0,
        }}
      >
        🧬
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              // 🩹 طبقِ درخواستِ کاربر: این پاپ‌آور دیگه پشتِ خودش رو
              // کم‌رنگ/تیره نمی‌کنه — پس‌زمینه کاملاً شفافه (صفحه‌ی اصلی
              // ۱۰۰٪ واضح می‌مونه)؛ این لایه فقط برایِ گرفتنِ کلیکِ «بیرونِ
              // کارت = بستن» نگه داشته شده.
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
            >
              <NeuralPathCard id={id} label={safeLabel} c={c} onClose={() => setOpen(false)} dragHandleProps={dragHandleProps} />
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
