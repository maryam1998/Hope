// ============================================================
// audioSync.js — همگام‌سازیِ متنِ داستان با صوتِ آپلودیِ کاربر.
//
// فایلِ صوتی یک‌بار روی خودِ گوشی پردازش می‌شه (بدون سرور) و زمانِ شروعِ
// هر جمله ذخیره می‌شه؛ بعد از اون، پخش و هایلایت کاملاً آفلاین کار می‌کنه.
// مدل فقط وقتی کاربر از تنظیمات دکمه‌ی دانلود رو بزنه گرفته می‌شه.
// ============================================================

const d = (s) => atob(s);
const LIB = d("aHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AaHVnZ2luZ2ZhY2UvdHJhbnNmb3JtZXJzQDMuNS4x");
const CACHE_NAME = d("dHJhbnNmb3JtZXJzLWNhY2hl");
const MODEL_IDS = {
  fast: [d("b25ueC1jb21tdW5pdHkvd2hpc3Blci10aW55X3RpbWVzdGFtcGVk"), d("WGVub3ZhL3doaXNwZXItdGlueQ==")],
  balanced: [d("b25ueC1jb21tdW5pdHkvd2hpc3Blci1iYXNlX3RpbWVzdGFtcGVk"), d("WGVub3ZhL3doaXNwZXItYmFzZQ==")],
};
export const SYNC_MODEL_OPTIONS = [
  { id: "fast", approxMb: 45 },
  { id: "balanced", approxMb: 85 },
];

const PREF_KEY = "fb-sync-model";
const TIMES_PREFIX = "fb-sync:";

// ---------- وضعیتِ مدل (مشترک بینِ تنظیمات و نوارِ صوت) ----------
const listeners = new Set();
let modelState = { busy: false, mb: 0, error: "" };
function readPref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "null") || {}; } catch { return {}; }
}
function writePref(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
}
function emit() { listeners.forEach((fn) => { try { fn(); } catch {} }); }
export function subscribeSyncModel(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let snapshot = null;
export function getSyncModelState() {
  const p = readPref();
  const size = p.size === "fast" ? "fast" : "balanced";
  const key = `${p.downloaded ? 1 : 0}|${size}|${modelState.busy ? 1 : 0}|${modelState.mb}|${modelState.error}`;
  if (!snapshot || snapshot.key !== key) {
    snapshot = { key, downloaded: !!p.downloaded, size, busy: modelState.busy, mb: modelState.mb, error: modelState.error };
  }
  return snapshot;
}
export function setSyncModelSize(size) {
  const p = readPref();
  if (p.size === size) return;
  // با عوضکردنِ اندازه، مدلِ دانلودشده‌ی قبلی دیگه معتبر نیست
  writePref({ size, downloaded: p.downloaded && p.size === size });
  emit();
}

// ---------- ورکر ----------
// کدِ ورکر به‌صورت رشته‌ست تا بدون فایلِ جدا (و بدون وابستگی به مسیر) ساخته بشه.
const WORKER_SRC = `
let pipe = null, lib = null;
const files = {};
const SR = 16000, WIN = 30, STEP = 27, MARGIN = 1.5;
function post(m) { self.postMessage(m); }
function onProg(e) {
  if (!e || e.status !== "progress" || !e.file) return;
  files[e.file] = { l: e.loaded || 0, t: e.total || 0 };
  let l = 0; for (const k in files) l += files[k].l;
  post({ type: "dl", bytes: l });
}
async function load(cfg) {
  lib = await import(cfg.lib);
  const env = lib.env;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  try { if (!self.crossOriginIsolated) env.backends["on" + "nx"].wasm.numThreads = 1; } catch (e) {}
  let lastErr = null;
  for (const id of cfg.ids) {
    try {
      pipe = await lib.pipeline("automatic-speech-recognition", id, { dtype: "q8", device: "wasm", progress_callback: onProg });
      return;
    } catch (e) { lastErr = e; pipe = null; }
  }
  throw lastErr || new Error("load failed");
}
async function runWindow(slice, language, mode) {
  const opt = { task: "transcribe", return_timestamps: mode };
  if (language) opt.language = language;
  const out = await pipe(slice, opt);
  return (out && out.chunks) || [];
}
async function transcribe(audio, language) {
  const total = Math.max(1, Math.ceil(Math.max(0, audio.length / SR - WIN) / STEP) + 1);
  let mode = "word";
  const words = [];
  for (let k = 0; k < total; k++) {
    const off = k * STEP;
    const slice = audio.subarray(Math.floor(off * SR), Math.min(audio.length, Math.floor((off + WIN) * SR)));
    if (slice.length < SR * 0.5) break;
    let chunks;
    try { chunks = await runWindow(slice, language, mode); }
    catch (e) {
      if (mode === "word") { mode = true; chunks = await runWindow(slice, language, mode); }
      else throw e;
    }
    const lo = k === 0 ? 0 : off + MARGIN;
    const hi = k === total - 1 ? Infinity : off + WIN - MARGIN;
    const fresh = [];
    for (const c of chunks) {
      const ts = c.timestamp || [];
      if (ts[0] == null) continue;
      const s = off + ts[0];
      if (s < lo || s >= hi) continue;
      const e = ts[1] == null ? s + 0.4 : off + ts[1];
      const w = { t: String(c.text || ""), s, e };
      words.push(w);
      fresh.push(w);
    }
    post({ type: "part", words: fresh, seg: mode !== "word" });
    post({ type: "p", frac: (k + 1) / total });
  }
  post({ type: "done", words, seg: mode !== "word" });
}
self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.type === "init") { await load(m); post({ type: "ready" }); }
    else if (m.type === "run") { await transcribe(m.audio, m.language); }
  } catch (e) { post({ type: "error", message: String((e && e.message) || e) }); }
};
`;

function makeWorker() {
  const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
  const w = new Worker(url, { type: "module" });
  w.__url = url;
  return w;
}
function killWorker(w) {
  try { w.terminate(); } catch {}
  try { URL.revokeObjectURL(w.__url); } catch {}
}

let activeWorker = null;
let cancelFlag = false;
export function cancelSync() {
  cancelFlag = true;
  if (activeWorker) { killWorker(activeWorker); activeWorker = null; }
}

function initWorker(w, size, onBytes) {
  return new Promise((resolve, reject) => {
    w.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "dl") onBytes && onBytes(m.bytes);
      else if (m.type === "ready") resolve();
      else if (m.type === "error") reject(new Error(m.message));
    };
    w.onerror = (e) => reject(new Error((e && e.message) || "worker error"));
    w.postMessage({ type: "init", lib: LIB, ids: MODEL_IDS[size] || MODEL_IDS.balanced });
  });
}

// دانلودِ مدل (فقط یک‌بار). بعدش از کشِ مرورگر خونده می‌شه.
export async function downloadSyncModel() {
  if (modelState.busy) return;
  const size = getSyncModelState().size;
  cancelFlag = false;
  modelState = { busy: true, mb: 0, error: "" };
  emit();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  const w = makeWorker();
  activeWorker = w;
  try {
    await initWorker(w, size, (b) => {
      modelState = { ...modelState, mb: Math.round(b / (1024 * 1024)) };
      emit();
    });
    writePref({ size, downloaded: true, at: Date.now() });
    modelState = { busy: false, mb: 0, error: "" };
  } catch (e) {
    modelState = { busy: false, mb: 0, error: cancelFlag ? "" : String((e && e.message) || e) };
  } finally {
    killWorker(w);
    if (activeWorker === w) activeWorker = null;
    emit();
  }
}
export async function removeSyncModel() {
  try { await caches.delete(CACHE_NAME); } catch {}
  const p = readPref();
  writePref({ size: p.size, downloaded: false });
  emit();
}

// ---------- دیکودِ صوت به PCM تک‌کاناله ۱۶کیلوهرتز ----------
async function decodeTo16k(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const ch = buf.numberOfChannels;
    const out = new Float32Array(buf.length);
    for (let c = 0; c < ch; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < out.length; i++) out[i] += data[i] / ch;
    }
    return { pcm: out, seconds: buf.length / buf.sampleRate };
  } finally {
    try { ctx.close(); } catch {}
  }
}

const LANG_NAMES = {
  en: "english", fa: "persian", ar: "arabic", es: "spanish", fr: "french", de: "german", ru: "russian",
  ko: "korean", ja: "japanese", zh: "chinese", tr: "turkish", it: "italian", pt: "portuguese", hi: "hindi",
  nl: "dutch", pl: "polish", uk: "ukrainian", sv: "swedish", id: "indonesian", az: "azerbaijani",
};

// خروجی: { words:[{w,s,e}], seconds }
export async function transcribeForSync(blob, langCode, onProgress, onPartial) {
  const st = getSyncModelState();
  if (!st.downloaded) throw new Error("NO_MODEL");
  cancelFlag = false;
  onProgress && onProgress({ phase: "decode", frac: 0 });
  const { pcm, seconds } = await decodeTo16k(blob);
  if (cancelFlag) throw new Error("CANCELLED");
  const w = makeWorker();
  activeWorker = w;
  try {
    onProgress && onProgress({ phase: "load", frac: 0 });
    await initWorker(w, st.size);
    if (cancelFlag) throw new Error("CANCELLED");
    const partialRaw = [];
    const res = await new Promise((resolve, reject) => {
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === "part") {
          // هر پنجره که تموم شد، کلماتِ نهاییِ همون بخش رو فوراً بیرون می‌دیم (بدونِ صبر تا آخرِ فایل)
          if (onPartial && m.words && m.words.length) {
            for (const x of m.words) partialRaw.push(x);
            try { onPartial({ words: expandWords(partialRaw, m.seg), seconds }); } catch (e) {}
          }
        }
        else if (m.type === "p") onProgress && onProgress({ phase: "run", frac: m.frac });
        else if (m.type === "done") resolve(m);
        else if (m.type === "error") reject(new Error(m.message));
      };
      w.onerror = (e) => reject(new Error((e && e.message) || "worker error"));
      w.postMessage({ type: "run", audio: pcm, language: LANG_NAMES[langCode] || null }, [pcm.buffer]);
    });
    return { words: expandWords(res.words, res.seg), seconds };
  } catch (e) {
    if (cancelFlag) throw new Error("CANCELLED");
    throw e;
  } finally {
    killWorker(w);
    if (activeWorker === w) activeWorker = null;
  }
}

// اگه فقط زمانِ تکه‌های بلند (نه تک‌کلمه) گرفتیم، زمانِ هر کلمه رو
// به نسبتِ طولِ حروفش داخلِ همون تکه پخش می‌کنیم.
function expandWords(raw, segmentMode) {
  const out = [];
  for (const c of raw || []) {
    const toks = String(c.t).split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    if (!segmentMode || toks.length === 1) {
      out.push({ w: toks.join(" "), s: c.s, e: c.e });
      continue;
    }
    const total = toks.reduce((a, t) => a + t.length, 0) || 1;
    let cur = c.s;
    const span = Math.max(0.2, c.e - c.s);
    for (const t of toks) {
      const dur = (span * t.length) / total;
      out.push({ w: t, s: cur, e: cur + dur });
      cur += dur;
    }
  }
  return out;
}

// ---------- تطبیقِ کلماتِ تشخیص‌داده‌شده با جمله‌های متن ----------
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, "")
    .replace(/^'+|'+$/g, "");
}
function lev1(a, b) {
  // آیا فاصله‌ی ویرایشِ دو کلمه ≤ ۱ هست؟
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1 || Math.min(la, lb) < 4) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
  if (la > lb) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

// sentences: آرایه‌ای از رشته‌ها؛ words: خروجیِ transcribeForSync؛ duration: ثانیه
// خروجی: { ok, coverage, times:[ثانیه‌ی شروعِ هر جمله] }
export function alignSentences(sentences, words, duration) {
  const T = [];
  const sentOf = [];
  const firstTok = [];
  sentences.forEach((txt, si) => {
    firstTok[si] = T.length;
    String(txt || "").split(/\s+/).forEach((tok) => {
      const n = norm(tok);
      if (n) { T.push(n); sentOf.push(si); }
    });
  });
  const R = [];
  const Rs = [];
  const Re = [];
  (words || []).forEach((w) => {
    const n = norm(w.w);
    if (n) { R.push(n); Rs.push(w.s); Re.push(w.e); }
  });
  const N = T.length, M = R.length;
  if (!N || !M || N * M > 36e6) return { ok: false, coverage: 0, times: [] };

  // LCS با وزن: کلمه‌های بلندتر قابل‌اعتمادترن
  const wgt = (a, b) => {
    const base = Math.min(a.length, 8);
    if (a === b) return 2 + base;
    if (lev1(a, b)) return 1 + (base >> 1);
    return 0;
  };
  const W = M + 1;
  const dir = new Uint8Array((N + 1) * W); // 1=مچ, 2=بالا(جمله‌ی متن رد شد), 3=چپ(کلمه‌ی تشخیص رد شد)
  let prev = new Int32Array(W);
  let cur = new Int32Array(W);
  for (let i = 1; i <= N; i++) {
    cur[0] = 0;
    for (let j = 1; j <= M; j++) {
      let best = prev[j];
      let dd = 2;
      if (cur[j - 1] > best) { best = cur[j - 1]; dd = 3; }
      const sc = wgt(T[i - 1], R[j - 1]);
      if (sc > 0 && prev[j - 1] + sc >= best) { best = prev[j - 1] + sc; dd = 1; }
      cur[j] = best;
      dir[i * W + j] = dd;
    }
    const t = prev; prev = cur; cur = t;
  }
  const matchTime = new Array(N).fill(null);
  const matchEnd = new Array(N).fill(null);
  let i = N, j = M, matched = 0;
  while (i > 0 && j > 0) {
    const dd = dir[i * W + j];
    if (dd === 1) { matchTime[i - 1] = Rs[j - 1]; matchEnd[i - 1] = Re[j - 1]; matched++; i--; j--; }
    else if (dd === 2) i--;
    else j--;
  }
  const coverage = matched / N;

  // زمانِ شروعِ هر جمله از روی اولین کلمه‌ی مچ‌شده‌ی داخلش
  const S = sentences.length;
  const anchor = new Array(S).fill(null);
  const AVG_WORD = 0.35;
  for (let si = 0; si < S; si++) {
    const from = firstTok[si];
    const to = si + 1 < S ? firstTok[si + 1] : N;
    for (let k = from; k < to; k++) {
      if (matchTime[k] != null) { anchor[si] = matchTime[k] - (k - from) * AVG_WORD; break; }
    }
  }
  // جمله‌های بدونِ مچ: بینِ دو لنگرِ همسایه، به نسبتِ تعدادِ کلمه پخش می‌شن
  const cnt = (si) => Math.max(1, (si + 1 < S ? firstTok[si + 1] : N) - firstTok[si]);
  const times = new Array(S).fill(0);
  let a = -1;
  for (let si = 0; si < S; si++) {
    if (anchor[si] == null) continue;
    // پرکردنِ جمله‌های بینِ لنگرِ قبلی و این لنگر
    const t1 = Math.max(0, anchor[si]);
    const t0 = a >= 0 ? Math.max(0, anchor[a]) : 0;
    const gapStart = a + 1;
    if (si - gapStart > 0) {
      let total = 0;
      for (let k = a < 0 ? 0 : a; k < si; k++) total += cnt(k);
      let acc = a < 0 ? 0 : cnt(a);
      for (let k = gapStart; k < si; k++) {
        times[k] = t0 + ((t1 - t0) * acc) / total;
        acc += cnt(k);
      }
    }
    times[si] = t1;
    a = si;
  }
  // بعد از آخرین لنگر
  if (a < 0) {
    for (let si = 0; si < S; si++) times[si] = (duration * firstTok[si]) / N;
  } else if (a < S - 1) {
    const tl = Math.max(0, anchor[a]);
    const endT = Math.max(tl + 1, Math.min(duration || tl + 1, (matchEnd.filter((x) => x != null).pop() || tl) + 2));
    let total = 0;
    for (let k = a; k < S; k++) total += cnt(k);
    let acc = cnt(a);
    for (let k = a + 1; k < S; k++) {
      times[k] = tl + ((Math.max(endT, tl + 1) - tl) * acc) / total;
      acc += cnt(k);
    }
  }
  // یکنواخت، کمی زودتر از شروعِ واقعی (تا هایلایت قبل از کلمه برسه)، و جمله‌ی اول از صفر
  const LEAD = 0.2;
  let run = 0;
  for (let si = 0; si < S; si++) {
    let t = Math.max(0, times[si] - (si === 0 ? 0 : LEAD));
    if (duration) t = Math.min(t, duration);
    // فاصله‌ی حداقلیِ ۰٫۱۵ ثانیه بینِ شروعِ دو جمله — تا «جمله‌ی قبل/بعد»
    // هیچ‌وقت روی یه زمانِ مشترک گیر نکنه.
    run = si === 0 ? 0 : Math.max(t, run + 0.15);
    times[si] = Math.round(run * 100) / 100;
  }
  times[0] = 0;
  return { ok: coverage >= 0.3, coverage, times, anchored: a, matched };
}

// همگام‌سازیِ نیمه‌کاره: فقط جمله‌هایی که تا الان واقعاً با صدا جور شدن زمان دارن؛
// بقیه Infinity می‌گیرن (هیچ‌وقت «فعال» نمی‌شن). خروجیِ null یعنی هنوز مطمئن نیستیم.
export function alignPartial(sentences, words, duration) {
  const res = alignSentences(sentences, words, duration);
  if (!res || !res.times || !res.times.length || res.matched < 4 || res.anchored < 0) return null;
  const times = res.times.map((t, i) => (i <= res.anchored ? t : Infinity));
  return { times, upto: res.anchored };
}

// جمله‌ی فعال در لحظه‌ی t (جستجوی دودویی روی زمان‌های شروع)
export function sentenceIndexAt(times, t) {
  if (!times || !times.length) return 0;
  let lo = 0, hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t + 0.08) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// ---------- ذخیره‌ی زمان‌ها (برای هر داستان) ----------
function hashKey(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + ":" + str.length;
}
export function loadSyncTimes(storyKey, n) {
  if (!storyKey) return null;
  try {
    const rec = JSON.parse(localStorage.getItem(TIMES_PREFIX + hashKey(storyKey)) || "null");
    if (!rec || !Array.isArray(rec.times) || rec.times.length !== n) return null;
    return rec.times;
  } catch { return null; }
}
export function saveSyncTimes(storyKey, times) {
  if (!storyKey) return;
  try { localStorage.setItem(TIMES_PREFIX + hashKey(storyKey), JSON.stringify({ v: 1, times, at: Date.now() })); } catch {}
}
export function clearSyncTimes(storyKey) {
  if (!storyKey) return;
  try { localStorage.removeItem(TIMES_PREFIX + hashKey(storyKey)); } catch {}
}
