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
    if (e.key !== STORE_KEY) return;
    cache = null;
    loadStore();
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

// 🧬 خودِ «رشته‌ی عصبی» — خطی که دو نرون (دایره‌ی یادگیری و دایره‌ی
// تثبیت) رو به‌هم وصل می‌کنه. به‌جای اینکه هر تکرار یه خطِ جدا و جدا
// بکشه (که با تکرارهای زیاد از کادر می‌زد بیرون)، همیشه فقط *یه* خط
// هست که ضخامتش با تعدادِ تکرارها (رشدِ لگاریتمی، نه خطی) کم‌کم بیشتر
// می‌شه — یعنی رشته‌ها روی هم «جمع» می‌شن، نه کنارِ هم ردیف. هر بار که
// یه تکرارِ تازه ثبت بشه (چه با «امروز انجام دادم»، چه خودکار از
// پلیر)، یه پالسِ نورانیِ کوتاه هم روی خط می‌ره تا لحظه‌ی «ساخته‌شدنِ»
// همون رشته‌ی تازه، حس بشه.
function NeuralStrand({ total, stage, c }) {
  const prevTotalRef = useRef(total);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (total > prevTotalRef.current) setPulseKey((k) => k + 1);
    prevTotalRef.current = total;
  }, [total]);

  // رشدِ لگاریتمی: از یه خطِ خیلی نازک شروع می‌شه و هیچ‌وقت واقعاً از
  // یه سقفِ منطقی (که داخلِ کادر جا بشه) رد نمی‌شه — حتی با تکرارِ
  // نامحدود.
  const width = total > 0 ? Math.min(9, 1.6 + Math.log2(total + 1) * 1.9) : 0;
  const consolidated = stage === "تثبیت";
  const strandColor = consolidated ? c.gold : c.teal;

  if (total <= 0) return null;

  return (
    <svg
      viewBox="0 0 100 34"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
    >
      <path
        d="M 25 17 Q 50 8 75 17"
        fill="none"
        stroke={strandColor}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={0.8}
        style={{ transition: "stroke-width 0.5s ease, stroke 0.5s ease" }}
      />
      {pulseKey > 0 && (
        <path
          key={pulseKey}
          d="M 25 17 Q 50 8 75 17"
          fill="none"
          stroke={c.gold}
          strokeWidth={width + 5}
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
  const [manualCount, setManualCount] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);

  const doToday = () => recordNeuralRepeat(id, { source: "manual", count: 1 });
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
          {/* دو نرون («یادگیری» و «تثبیت») + خطِ رشته‌ی عصبی که بینشون
              وصل می‌شه. خطِ رشته پشتِ خودِ دایره‌ها (لایه‌ی اول) نشسته،
              دایره‌ها روی همون فضا (لایه‌ی دوم، absolute) قرار می‌گیرن —
              این‌جوری همیشه دقیقاً بینِ دو نرون کشیده می‌مونه. */}
          <div style={{ position: "relative", height: 34, marginBottom: 3 }}>
            <NeuralStrand total={s.total} stage={s.stage} c={c} />
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around" }}>
              {["یادگیری", "تثبیت"].map((stageLabel) => {
                const active = s.stage === stageLabel;
                return (
                  <div
                    key={stageLabel}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: active ? c.gold : c.soft,
                      border: `2px solid ${active ? c.gold : c.border}`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 8 }}>
            {["یادگیری", "تثبیت"].map((stageLabel) => {
              const active = s.stage === stageLabel;
              return (
                <span key={stageLabel} style={{ fontSize: 10, fontWeight: 700, color: active ? c.ink : c.inkSoft, flex: 1, textAlign: "center" }}>
                  {stageLabel}
                </span>
              );
            })}
          </div>

          <div style={{ background: c.soft, borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: c.inkSoft, marginBottom: 5 }}>رشته‌های ساخته‌شده</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
              {s.strandDays.map((d) => (
                <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: c.teal, display: "inline-block" }} />
              ))}
            </div>
            <div style={{ fontSize: 9.5, color: c.inkSoft, marginTop: 5 }}>
              {s.total} تکرار · آخرین تمرین: {fmtRel(s.last)}
            </div>
          </div>
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
