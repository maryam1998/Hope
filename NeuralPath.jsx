import React, { useState, useEffect, useRef, useMemo } from "react";

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

function NeuralPathCard({ id, label, c }) {
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
        padding: 12,
        width: 272,
        maxWidth: "85vw",
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: c.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span>🧬</span>
        <span>مسیر عصبی این {label}</span>
      </div>

      {!s.stage ? (
        <p style={{ fontSize: 12.5, color: c.inkSoft, lineHeight: 1.9, marginBottom: 10 }}>
          هنوز مسیر عصبی برای این {label} ساخته نشده — همین امروز تمرینش کن تا اولین رشته‌ی عصبی ساخته بشه.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
            {["یادگیری", "تثبیت"].map((stageLabel) => {
              const active = s.stage === stageLabel;
              return (
                <div key={stageLabel} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      margin: "0 auto 4px",
                      background: active ? c.gold : c.soft,
                      border: `2px solid ${active ? c.gold : c.border}`,
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? c.ink : c.inkSoft }}>{stageLabel}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: c.soft, borderRadius: 10, padding: "10px 8px", textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: c.inkSoft, marginBottom: 6 }}>رشته‌های ساخته‌شده</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
              {s.strandDays.map((d) => (
                <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: c.teal, display: "inline-block" }} />
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: c.inkSoft, marginTop: 6 }}>
              {s.total} تکرار · آخرین تمرین: {fmtRel(s.last)}
            </div>
          </div>
        </>
      )}

      <button
        onClick={doToday}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 9,
          border: "none",
          background: c.teal,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        ✨ امروز انجام دادم
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <input
          type="number"
          min={1}
          max={999}
          value={manualCount}
          onChange={(e) => setManualCount(e.target.value)}
          style={{ width: 48, padding: "6px 4px", borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, textAlign: "center" }}
        />
        <button
          onClick={doManual}
          style={{
            flex: 1,
            padding: "7px 0",
            borderRadius: 8,
            border: `1px solid ${c.gold}`,
            background: "transparent",
            color: c.gold,
            fontSize: 11,
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
          padding: "4px 0",
          background: "transparent",
          border: "none",
          color: c.inkSoft,
          fontSize: 11,
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
export function NeuralPathButton({ id, label, colors: cOverride, align = "end" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const c = cOverride || DEFAULT_C;
  const safeLabel = label || "مورد";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  if (!id) return null;

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="مسیر عصبی"
        aria-label="مسیر عصبی"
        style={{
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1,
          opacity: 0.62,
          flexShrink: 0,
        }}
      >
        🧬
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            zIndex: 60,
            top: "130%",
            ...(align === "start" ? { insetInlineStart: 0 } : { insetInlineEnd: 0 }),
          }}
        >
          <NeuralPathCard id={id} label={safeLabel} c={c} />
        </div>
      )}
    </span>
  );
}
