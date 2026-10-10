// تخمین سطح لغات
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { VOCAB } from "../../VOCAB.js";
import { WORDS_AZ } from "../../WORDS_AZ.js";
import { DAILY_WORDS } from "../../DAILY_WORDS.js";
import { ALL_DAILY_CONVERSATIONS } from "../config/dataPools.js";
import { LEVELS } from "../constants/levels.js";
import { conversation } from "../constants/categories.js";
import { normalizeWord } from "./wordCache.js";

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
export const LEVEL_BY_EN_WORD = new Map();
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
export function lookupSavedWordLevel(word, langCode) {
  const w = normalizeWord(word);
  if (!w) return null;
  if (langCode === "en" && LEVEL_BY_EN_WORD.has(w)) return LEVEL_BY_EN_WORD.get(w);
  const key = `${langCode}:${w}`;
  if (LEVEL_BY_LANG_WORD.has(key)) return LEVEL_BY_LANG_WORD.get(key);
  return null;
}
// ---------------------------------------------------------------------------
// تخمینِ خودکارِ سطح (A1..C2) برای لغت/عبارتِ انگلیسی — کاملاً داخلی و افلاین.
// ترتیب: ۱) خودِ لغت تو دیتای محلی  ۲) ریشه‌ی لغت (grabbed→grab، cities→city،
// went→go) با همون سطحِ ریشه  ۳) مشتق‌ها (quickly، happiness، unhappy) با یه پله
// بالاتر از ریشه  ۴) لغتِ ناشناخته: حدسِ تقریبی از روی طول (لغتِ بلندتر معمولاً
// تخصصی‌تر). برای عبارت، بالاترین سطحِ کلماتِ شناخته‌شده‌ی داخلش.
// ---------------------------------------------------------------------------
const EN_IRREGULAR_BASE = {
  was: "be", were: "be", been: "be", am: "be", is: "be", are: "be", had: "have", has: "have",
  did: "do", done: "do", does: "do", went: "go", gone: "go", goes: "go", said: "say", made: "make",
  took: "take", taken: "take", came: "come", saw: "see", seen: "see", got: "get", gotten: "get",
  gave: "give", given: "give", found: "find", knew: "know", known: "know", thought: "think",
  told: "tell", became: "become", left: "leave", felt: "feel", brought: "bring", began: "begin",
  begun: "begin", kept: "keep", held: "hold", wrote: "write", written: "write", stood: "stand",
  heard: "hear", meant: "mean", met: "meet", ran: "run", paid: "pay", sat: "sit", spoke: "speak",
  spoken: "speak", led: "lead", grew: "grow", grown: "grow", lost: "lose", fell: "fall",
  fallen: "fall", sent: "send", built: "build", understood: "understand", drew: "draw",
  drawn: "draw", broke: "break", broken: "break", spent: "spend", rose: "rise", risen: "rise",
  drove: "drive", driven: "drive", bought: "buy", wore: "wear", worn: "wear", chose: "choose",
  chosen: "choose", ate: "eat", eaten: "eat", sold: "sell", caught: "catch", taught: "teach",
  forgot: "forget", forgotten: "forget", slept: "sleep", won: "win", threw: "throw",
  thrown: "throw", flew: "fly", flown: "fly", sang: "sing", sung: "sing", swam: "swim",
  hid: "hide", hidden: "hide", shook: "shake", stole: "steal", stolen: "steal", woke: "wake",
  children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth", mice: "mouse",
  people: "person", lives: "life", knives: "knife", wives: "wife",
};
function enInflectionCandidates(w) {
  const c = [];
  const add = (x) => { if (x && x.length >= 2 && !c.includes(x)) c.push(x); };
  if (EN_IRREGULAR_BASE[w]) add(EN_IRREGULAR_BASE[w]);
  const undouble = (x) => (x.length > 2 && x[x.length - 1] === x[x.length - 2] ? x.slice(0, -1) : null);
  if (/ies$/.test(w)) add(w.slice(0, -3) + "y");
  if (/ied$/.test(w)) add(w.slice(0, -3) + "y");
  if (/ier$/.test(w)) add(w.slice(0, -3) + "y");
  if (/iest$/.test(w)) add(w.slice(0, -4) + "y");
  if (/ing$/.test(w)) {
    const st = w.slice(0, -3);
    add(st); add(st + "e"); add(undouble(st));
  }
  if (/ed$/.test(w)) {
    const st = w.slice(0, -2);
    add(st); add(w.slice(0, -1)); add(undouble(st));
  }
  if (/es$/.test(w)) add(w.slice(0, -2));
  if (/s$/.test(w) && !/ss$/.test(w)) add(w.slice(0, -1));
  if (/er$/.test(w)) { const st = w.slice(0, -2); add(st); add(w.slice(0, -1)); add(undouble(st)); }
  if (/est$/.test(w)) { const st = w.slice(0, -3); add(st); add(w.slice(0, -2)); add(undouble(st)); }
  if (/ly$/.test(w)) { add(w.slice(0, -2)); if (/ily$/.test(w)) add(w.slice(0, -3) + "y"); if (/ally$/.test(w)) add(w.slice(0, -4)); }
  return c;
}
function enDerivationCandidates(w) {
  const c = [];
  const add = (x) => { if (x && x.length >= 3 && !c.includes(x)) c.push(x); };
  [["ness", ""], ["ment", ""], ["ful", ""], ["less", ""], ["able", ""], ["ible", ""], ["ably", ""],
   ["ity", ""], ["ous", ""], ["ive", ""], ["ize", ""], ["ise", ""], ["ist", ""], ["ism", ""]].forEach(([suf]) => {
    if (w.endsWith(suf) && w.length > suf.length + 2) {
      const st = w.slice(0, -suf.length);
      add(st); add(st + "e");
      if (/i$/.test(st)) add(st.slice(0, -1) + "y");
    }
  });
  ["un", "re", "dis", "mis", "non", "over", "under", "pre", "in", "im"].forEach((pre) => {
    if (w.startsWith(pre) && w.length > pre.length + 2) add(w.slice(pre.length));
  });
  return c;
}
function estimateSingleEnglishWordLevel(w) {
  if (LEVEL_BY_EN_WORD.has(w)) return LEVEL_BY_EN_WORD.get(w);
  for (const cand of enInflectionCandidates(w)) {
    if (LEVEL_BY_EN_WORD.has(cand)) return LEVEL_BY_EN_WORD.get(cand);
  }
  for (const cand of enDerivationCandidates(w)) {
    const lv = LEVEL_BY_EN_WORD.get(cand) || (enInflectionCandidates(cand).map((x) => LEVEL_BY_EN_WORD.get(x)).find(Boolean));
    if (lv) return LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(lv) + 1)];
  }
  return null;
}
export function estimateEnglishWordLevel(text) {
  const norm = normalizeWord(text);
  if (!norm) return null;
  const toks = norm.split(/\s+/).map((t) => t.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")).filter(Boolean);
  if (!toks.length) return null;
  let best = -1;
  let longest = "";
  toks.forEach((tk) => {
    if (tk.length > longest.length) longest = tk;
    const lv = estimateSingleEnglishWordLevel(tk);
    if (lv) best = Math.max(best, LEVELS.indexOf(lv));
  });
  if (best >= 0) return LEVELS[best];
  // هیچ‌کدوم تو دیتا نبود → حدسِ تقریبی از روی طولِ بلندترین کلمه
  const n = longest.length;
  if (n <= 5) return "B2";
  if (n <= 8) return "C1";
  return "C2";
}
