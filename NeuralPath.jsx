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
// بعد از تمرین در این‌همه روزِ متفاوت، مرحله می‌شه «تثبیت» — قبلش «یادگیری»
const CONSOLIDATE_AFTER_DAYS = 3;

let cache = null;
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
    } else if (e.key === CONSOLIDATED_KEY) {
      consolidatedCache = null;
      loadConsolidatedStore();
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
  const store = loadStore();
  if (store[id]) {
    delete store[id];
    persist();
  }
}

/** برعکسِ recordNeuralRepeat: یه «رشته»ی کامل (یعنی همه‌ی تکرارهای
 *  جدیدترین روزِ متفاوتی که توش تکرار ثبت شده) رو برمی‌داره — نه فقط یه
 *  تکرارِ تکی. این همون دکمه‌ی «یک روز گذشت، انجام ندادم»ه: کاربر داره
 *  می‌گه یه روز از این مسیر جا مونده، پس یکی از رشته‌هایی که تا الان
 *  ساخته بود (جدیدترینش) از بین می‌ره.
 */
export function removeNeuralStrand(id) {
  if (!id) return;
  const store = loadStore();
  const list = store[id];
  if (!list || !list.length) return;
  let latestDay = null;
  for (const e of list) {
    const dk = dayKey(e.t);
    if (latestDay === null || dk > latestDay) latestDay = dk;
  }
  if (latestDay === null) return;
  const filtered = list.filter((e) => dayKey(e.t) !== latestDay);
  if (filtered.length) store[id] = filtered;
  else delete store[id];
  persist();
}

// -----------------------------------------------------------------------
// «تثبیتِ دستی» — وقتی کاربر خودش حس می‌کنه یه جمله دیگه کاملاً تثبیت
// شده (دکمه‌ی «همینه، این تثبیت شد ✅»)، صرف‌نظر از تعدادِ روزهای واقعیِ
// تمرین‌شده، مرحله رو برای همیشه رویِ «تثبیت» قفل می‌کنیم. یه فروشگاهِ
// جدا و سبک (فقط یه مجموعه از idها) — تا منطقِ رویدادها/رشته‌های بالا
// دست‌نخورده بمونه.
const CONSOLIDATED_KEY = "phrasebook-neural-consolidated-v1";
let consolidatedCache = null;

function loadConsolidatedStore() {
  if (consolidatedCache) return consolidatedCache;
  try {
    consolidatedCache = JSON.parse(window.localStorage.getItem(CONSOLIDATED_KEY) || "{}");
  } catch {
    consolidatedCache = {};
  }
  return consolidatedCache;
}

function persistConsolidated() {
  try {
    window.localStorage.setItem(CONSOLIDATED_KEY, JSON.stringify(consolidatedCache));
  } catch {}
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function markManuallyConsolidated(id) {
  if (!id) return;
  const store = loadConsolidatedStore();
  store[id] = true;
  persistConsolidated();
}

export function isManuallyConsolidated(id) {
  return !!(id && loadConsolidatedStore()[id]);
}

export function useManuallyConsolidated(id) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return isManuallyConsolidated(id);
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
  const days = new Map();
  events.forEach((e) => days.set(dayKey(e.t), (days.get(dayKey(e.t)) || 0) + 1));
  const strandDays = Array.from(days.keys()).sort();
  const stage = strandDays.length === 0 ? null : strandDays.length >= CONSOLIDATE_AFTER_DAYS ? "تثبیت" : "یادگیری";
  const last = events.length ? Math.max(...events.map((e) => e.t)) : null;
  return { total: events.length, strandDays, stage, last };
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
const MAX_RENDERED_STRANDS = 60;
function NeuralStrand({ strandCount, stage, c }) {
  const prevCountRef = useRef(strandCount);
  const [pulse, setPulse] = useState(null); // { key, kind: "add" | "remove" } | null

  useEffect(() => {
    if (strandCount > prevCountRef.current) setPulse({ key: Date.now(), kind: "add" });
    else if (strandCount < prevCountRef.current) setPulse({ key: Date.now(), kind: "remove" });
    prevCountRef.current = strandCount;
  }, [strandCount]);

  const consolidated = stage === "تثبیت";
  const strandColor = consolidated ? c.gold : c.teal;

  if (strandCount <= 0) return null;

  const n = Math.min(strandCount, MAX_RENDERED_STRANDS);
  // پهنایِ بازشدنِ عدسی: با تعدادِ رشته‌ها کم‌کم زیاد می‌شه، ولی همیشه یه
  // سقفِ منطقی داره تا از کادر بیرون نزنه.
  const spread = Math.min(26, 6 + n * 0.7);
  const paths = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const bow = -spread / 2 + t * spread; // از بالا به پایینِ عدسی پخش می‌شن
    const isNewest = i === n - 1;
    paths.push(
      <path
        key={i}
        d={`M 14 20 Q 50 ${20 + bow} 86 20`}
        fill="none"
        stroke={strandColor}
        strokeWidth={isNewest && pulse && pulse.kind === "add" ? 1.6 : 1}
        strokeLinecap="round"
        opacity={isNewest ? 0.95 : 0.55}
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
      {pulse && pulse.kind === "add" && (
        <path
          key={`pulse-${pulse.key}`}
          d={`M 14 20 Q 50 ${20 + (n === 1 ? 0 : spread / 2)} 86 20`}
          fill="none"
          stroke={c.gold}
          strokeWidth={6}
          strokeLinecap="round"
          style={{ animation: "neuralStrandPulse 0.9s ease-out" }}
        />
      )}
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

function NeuralPathCard({ id, label, c, onClose }) {
  const events = useNeuralEvents(id);
  const s = useMemo(() => summarize(events), [events]);
  const manuallyConsolidated = useManuallyConsolidated(id);
  // مرحله‌ای که واقعاً نشون داده می‌شه: اگه کاربر خودش دستی «تثبیت»ش
  // کرده باشه، صرف‌نظر از تعدادِ روزهای واقعی، همیشه «تثبیت» می‌مونه.
  const displayStage = manuallyConsolidated ? "تثبیت" : s.stage;
  const strandCount = s.strandDays.length;
  const [manualCount, setManualCount] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);

  const doToday = () => recordNeuralRepeat(id, { source: "manual", count: 1 });
  const doMissedDay = () => removeNeuralStrand(id);
  const doConsolidate = () => markManuallyConsolidated(id);
  const doManual = () => {
    const n = Math.max(1, Math.min(999, Number(manualCount) || 1));
    recordNeuralRepeat(id, { source: "manual", count: n });
  };

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: c.ink, display: "flex", alignItems: "center", gap: 5 }}>
          <span>🧬</span>
          <span>مسیر عصبی این {label}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="بستن"
            style={{ width: 20, height: 20, flexShrink: 0, border: "none", background: "transparent", color: c.inkSoft, fontSize: 13, cursor: "pointer" }}
          >
            ✕
          </button>
        )}
      </div>

      {!s.stage ? (
        <p style={{ fontSize: 11.5, color: c.inkSoft, lineHeight: 1.85, marginBottom: 8 }}>
          هنوز مسیر عصبی برای این {label} ساخته نشده — همین امروز تمرینش کن تا اولین رشته‌ی عصبی ساخته بشه.
        </p>
      ) : (
        <>
          {/* دو نرون («یادگیری» و «تثبیت») در دو سرِ کادر + دسته‌ای از
              رشته‌های عصبیِ نازک که بینشون، مثلِ یه کابلِ بافته‌شده، وصل
              می‌شن. خطوطِ رشته پشتِ خودِ دایره‌ها (لایه‌ی اول) نشستن،
              دایره‌ها روی همون فضا (لایه‌ی دوم، absolute در دو سر) قرار
              می‌گیرن — این‌جوری همیشه دقیقاً از یه نرون به نرونِ دیگه
              کشیده می‌مونن.  */}
          <div style={{ position: "relative", height: 62, marginBottom: 3 }}>
            <NeuralStrand strandCount={strandCount} stage={displayStage} c={c} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {["یادگیری", "تثبیت"].map((stageLabel) => {
                const active = displayStage === stageLabel;
                return (
                  <div
                    key={stageLabel}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: active ? c.gold : c.soft,
                      border: `2px solid ${active ? c.gold : c.border}`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            {["یادگیری", "تثبیت"].map((stageLabel) => {
              const active = displayStage === stageLabel;
              return (
                <span key={stageLabel} style={{ fontSize: 10, fontWeight: 700, color: active ? c.ink : c.inkSoft, width: 44, flexShrink: 0, textAlign: "center" }}>
                  {stageLabel}
                </span>
              );
            })}
          </div>

          <div style={{ background: c.soft, borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: c.inkSoft, marginBottom: 5 }}>رشته‌های ساخته‌شده</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: c.ink, marginBottom: 5 }}>{strandCount}</div>
            <div style={{ fontSize: 9.5, color: c.inkSoft }}>
              {s.total} تکرار · آخرین تمرین: {fmtRel(s.last)}
            </div>
          </div>

          {/* دقیقاً همون پیامِ «این یه مسیرِ عصبیِ جاافتاده‌ست» — با
              اصطلاحِ این تب («جمله») به‌جایِ «عادت». */}
          <p style={{ fontSize: 10.5, color: c.inkSoft, lineHeight: 1.85, marginBottom: 8, textAlign: "center" }}>
            این {label} یه مسیرِ عصبیِ محکم و جاافتاده‌ست — اگه حس می‌کنی واقعاً تثبیت شده، می‌تونی خودت همین‌جا علامتش بزنی.
          </p>
        </>
      )}

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
        disabled={strandCount === 0}
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: "transparent",
          color: strandCount === 0 ? c.border : c.inkSoft,
          fontSize: 11,
          fontWeight: 700,
          cursor: strandCount === 0 ? "default" : "pointer",
          marginBottom: 6,
        }}
      >
        یک روز گذشت، انجام ندادم
      </button>

      <button
        onClick={doConsolidate}
        disabled={manuallyConsolidated || !s.stage}
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: `1px solid ${manuallyConsolidated || !s.stage ? c.border : "#3F9B72"}`,
          background: manuallyConsolidated ? c.soft : "transparent",
          color: manuallyConsolidated || !s.stage ? c.inkSoft : "#2E7D5B",
          fontSize: 11,
          fontWeight: 700,
          cursor: manuallyConsolidated || !s.stage ? "default" : "pointer",
          marginBottom: 6,
        }}
      >
        {manuallyConsolidated ? "✅ این تثبیت شد" : "همینه، این تثبیت شد ✅"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <input
          type="number"
          min={1}
          max={999}
          value={manualCount}
          onChange={(e) => setManualCount(e.target.value)}
          style={{ width: 42, padding: "5px 3px", borderRadius: 7, border: `1px solid ${c.border}`, fontSize: 11, textAlign: "center" }}
        />
        <button
          onClick={doManual}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 7,
            border: `1px solid ${c.gold}`,
            background: "transparent",
            color: c.gold,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ثبت دستیِ تعداد تکرار
        </button>
      </div>

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

  if (!id) return null;

  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
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
              background: "rgba(20,20,15,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: 16,
            }}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <NeuralPathCard id={id} label={safeLabel} c={c} onClose={() => setOpen(false)} />
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
