import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Globe, Pencil, Check, X } from "lucide-react";

const fontFa = "var(--font-fa)";
const fontLatin = "var(--font-latin)";
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
};

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

function detectPastedTextLanguage(text) {
  const sample = (text || "").slice(0, 4000);
  if (!sample.trim()) return null;
  if (/[\u0900-\u097F]/.test(sample)) return "hi";
  if (/[\u0600-\u06FF]/.test(sample)) {
    return /[\u067E\u0686\u0698\u06AF]/.test(sample) ? "fa" : "ar";
  }
  if (/[\u3040-\u30FF]/.test(sample)) return "ja";
  if (/[\uAC00-\uD7A3]/.test(sample)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";
  if (/[\u0400-\u04FF]/.test(sample)) return "ru";
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
  return topScore > 0 ? topCode : null;
}

// ---------------------------------------------------------------------------
// رنگ‌بندیِ اشتباه/تصحیح — چون خودِ AI نمی‌تونه به متنش رنگ بده (فقط متنِ
// ساده برمی‌گردونه)، این رنگ‌ها اینجا توی کدِ خودِ اپ روی بخش‌های مربوطه
// اعمال می‌شن: جایی که کاربر اشتباه نوشته با خطِ زیرِ قرمزِ پررنگ، و
// پیشنهادِ درست‌شده با رنگِ سبزِ تیره‌ی پررنگ مشخص می‌شه.
// ---------------------------------------------------------------------------
const MISTAKE_STYLE = {
  color: "#c81e1e",
  fontWeight: 700,
  textDecorationLine: "underline",
  textDecorationColor: "#c81e1e",
  textDecorationStyle: "solid",
  textDecorationThickness: 2,
  textUnderlineOffset: 3,
};
const CORRECTION_STYLE = {
  color: "#166534",
  fontWeight: 700,
};

// حذفِ نشانه‌های مارک‌داون (**bold**، *italic*) و یکسان‌سازیِ گیومه‌های
// فانتزی («" "» یا ‘ ’) به گیومه‌ی ساده — چون AI گاهی دورِ عبارتِ نقل‌شده
// از * استفاده می‌کنه (مثلاً *"X"*) و این باعث می‌شد ریجکسِ تشخیصِ
// تصحیح‌ها اصلاً مچ نشه.
function normalizeAiText(text) {
  return (text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

// متنِ پیام رو بر اساسِ بازه‌های اشتباه/تصحیح (که extractCorrections پیدا
// کرده) به قطعه‌های plain/mistake/correction می‌شکنه، تا هرکدوم جدا رنگ
// بگیرن.
function buildHighlightSegments(text, corrections) {
  if (!text || !corrections || corrections.length === 0) {
    return [{ type: "plain", text: text || "" }];
  }
  const ranges = [];
  corrections.forEach((c) => {
    if (typeof c.oStart === "number" && typeof c.oEnd === "number" && c.oEnd > c.oStart) {
      ranges.push({ start: c.oStart, end: c.oEnd, type: "mistake" });
    }
    if (typeof c.cStart === "number" && typeof c.cEnd === "number" && c.cEnd > c.cStart) {
      ranges.push({ start: c.cStart, end: c.cEnd, type: "correction" });
    }
  });
  if (ranges.length === 0) return [{ type: "plain", text }];
  ranges.sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  ranges.forEach((r) => {
    if (r.start < cursor) return; // بازه‌ی هم‌پوشان — رد می‌شه تا خراب نشه
    if (r.start > cursor) segments.push({ type: "plain", text: text.slice(cursor, r.start) });
    segments.push({ type: r.type, text: text.slice(r.start, r.end) });
    cursor = r.end;
  });
  if (cursor < text.length) segments.push({ type: "plain", text: text.slice(cursor) });
  return segments;
}

// ---------------------------------------------------------------------------
// ذخیره‌ی گفتگوی «تمرین مکالمه» — فقط روی خودِ گوشی/مرورگرِ کاربر
// (localStorage)، هیچ‌جا آپلود یا سینک ابری نمی‌شه. با رفرش یا بستن و
// بازکردنِ صفحه از بین نمی‌ره؛ فقط با زدنِ دکمه‌ی «پاک کردن گفتگو» حذف
// می‌شه. کلید بر اساسِ ایمیلِ کاربر جدا می‌شه (مثلِ بقیه‌ی داده‌های محلیِ
// اپ) تا اگه چند حساب رویِ همین گوشی وارد بشن، گفتگوهاشون قاطی نشه.
// ---------------------------------------------------------------------------
const SPEAKING_CHAT_STORAGE_KEY = "phrasebook-speaking-chat-v1";

function loadStoredChatMessages(storageKey) {
  try {
    const raw = window.localStorage?.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch (e) {
    return null; // localStorage در دسترس نبود یا دیتای خراب بود — شروعِ تازه
  }
}

function saveStoredChatMessages(storageKey, messages) {
  try {
    window.localStorage?.setItem(storageKey, JSON.stringify(messages));
  } catch (e) {
    // مثلاً فضای localStorage پر بوده — این نشستِ فعلی ذخیره نمی‌شه ولی
    // برنامه همچنان کار می‌کنه
  }
}

function SpeakingPracticePanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  callAI,
  SpeakButton,
  ClickableSentence,
  translateFree,
  user,
  saveGrammarNote,
}) {
  const storageKey = `${SPEAKING_CHAT_STORAGE_KEY}:${user?.email || "guest"}`;
  const [messages, setMessages] = useState(() => loadStoredChatMessages(storageKey) || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [corrections, setCorrections] = useState([]);
  const [correctionsSaved, setCorrectionsSaved] = useState(false);
  const [translations, setTranslations] = useState({});
  const [openTranslation, setOpenTranslation] = useState({});

  // ویرایشِ پیام‌هایی که خودِ کاربر توی این چت فرستاده — دقیقاً همون
  // مکانیزمِ تبِ «گرامر» (askGrammarTeacher): با تپ‌کردن رویِ پیام، اول یه
  // دکمه‌ی «ویرایش» ظاهر می‌شه (tappedMsgIndex)؛ با زدنش، همون پیام به یه
  // textarea تبدیل می‌شه (editingMsgIndex/editingMsgText). ذخیره‌کردن،
  // خودِ پیام رو با متنِ تازه جایگزین می‌کنه، هر چی *بعدِ* اون بود (جوابِ
  // قدیمیِ Jimmy + هر پیامِ بعدی‌تر) حذف می‌کنه، و دوباره برای همون متنِ
  // ویرایش‌شده از Jimmy جواب می‌گیره.
  const [tappedMsgIndex, setTappedMsgIndex] = useState(null);
  const [editingMsgIndex, setEditingMsgIndex] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const editMsgTextareaRef = useRef(null);

  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      const langLabel = LANGUAGES.find(l => l.code === chatLang)?.label || chatLang;
      const welcome = `Hey there! I'm Jimmy, your conversation coach. Let's practice ${langLabel} together. 😊

I'll help you with grammar, vocabulary, and natural expressions. Feel free to write anything you'd like to talk about!

By the way, what's your name? Or tell me something about yourself.`;
      setMessages([{ role: "ai", text: welcome }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, loading]);

  // هر تغییری توی گفتگو (پیامِ جدید، یا پاک‌شدن) بلافاصله روی همین گوشی
  // ذخیره می‌شه — نه ابری. اولین رندر هم همینجا سِیو می‌شه (پیامِ خوش‌آمد
  // یا همون گفتگوی قبلاً ذخیره‌شده)، پس چیزی از دست نمی‌ره.
  useEffect(() => {
    saveStoredChatMessages(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // اتوگرو برای textareaـیِ ویرایشِ پیام، دقیقاً مثلِ اتوگروی کادرِ اصلی.
  useEffect(() => {
    const el = editMsgTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [editingMsgText, editingMsgIndex]);

  // ✅ تابع استخراج تصحیح — الان علاوه بر متنِ اشتباه/درست، موقعیتِ دقیقِ
  // هرکدوم رو هم توی متنِ نرمال‌شده برمی‌گردونه (oStart/oEnd/cStart/cEnd)
  // تا بشه دقیقاً همون بخش رو توی حبابِ چت رنگی کرد — به‌جای این‌که کلِ
  // جمله‌ی تصحیح از متن حذف بشه. متنِ نرمال‌شده (بدونِ *‌های مارک‌داون و
  // با گیومه‌ی یکسان) هم برگردونده می‌شه تا همون، عیناً، توی حبابِ چت
  // نمایش داده بشه — پس آفست‌ها همیشه با متنِ نمایشی هم‌خون می‌مونن.
  function extractCorrections(reply) {
    const text = normalizeAiText(reply);
    const results = [];
    const numberedPattern = /(\d+)\.\s*Instead of\s+["']([^"']+)["']\s*,?\s*(?:you should say|you should|you can|try|use)\s+["']([^"']+)["']/gid;
    let match;
    while ((match = numberedPattern.exec(text)) !== null) {
      const [oStart, oEnd] = match.indices[2];
      const [cStart, cEnd] = match.indices[3];
      results.push({
        original: match[2].trim(),
        corrected: match[3].trim(),
        oStart, oEnd, cStart, cEnd,
      });
    }

    if (results.length === 0) {
      const simplePatterns = [
        { re: /Instead of\s+["']([^"']+)["']\s*,?\s*(?:you should say|you should|you can|try|use)\s+["']([^"']+)["']/id, order: "oc" },
        { re: /You should say\s+["']([^"']+)["']\s*(?:instead of|not)\s+["']([^"']+)["']/id, order: "co" },
        { re: /Use\s+["']([^"']+)["']\s+not\s+["']([^"']+)["']/id, order: "co" },
      ];
      for (const { re, order } of simplePatterns) {
        const m = text.match(re);
        if (m) {
          const [g1s, g1e] = m.indices[1];
          const [g2s, g2e] = m.indices[2];
          if (order === "oc") {
            results.push({ original: m[1].trim(), corrected: m[2].trim(), oStart: g1s, oEnd: g1e, cStart: g2s, cEnd: g2e });
          } else {
            results.push({ original: m[2].trim(), corrected: m[1].trim(), oStart: g2s, oEnd: g2e, cStart: g1s, cEnd: g1e });
          }
          break;
        }
      }
    }

    return { corrections: results, text };
  }

  // ✅ کاهشِ مصرفِ توکن — تاریخچه‌ای که هر بار توی prompt فرستاده می‌شه
  // نباید شاملِ لیستِ کاملِ «اشتباه/پیشنهادِ» دورهای قبل باشه (که می‌تونه
  // طولانی باشه)؛ برای ادامه‌دادنِ طبیعیِ گفت‌وگو فقط قسمتِ ادامه‌ی
  // مکالمه‌ی هر پاسخِ قبلیِ AI کافیه. این فقط روی چیزی که به AI فرستاده
  // می‌شه اثر می‌ذاره — خودِ حبابِ چت روی صفحه دست‌نخورده و کامل می‌مونه.
  function compactCoachTextForHistory(text) {
    if (!text) return "";
    const compacted = text
      .replace(
        /\d+\.\s*Instead of\s+["'][^"']*["']\s*,?\s*(?:you should say|you should|you can|try|use)\s+["'][^"']*["'][\s\S]*?(?=(?:\d+\.\s*Instead of\s+["'])|$)/gi,
        ""
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    // اگه کلِ پیام فقط لیستِ تصحیح بود (چیزی برای ادامه‌ی مکالمه نمونده)،
    // بازم بهتره یه چیزی برای context بمونه تا تاریخچه خالی نشه.
    return (compacted || text).slice(0, 400);
  }

  const askSpeakingTeacher = async ({ userSentence, langCode, nativeLang, nativeLabel, aiSettings, history, writtenInNative }) => {
    const langLabel = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
    const nativeLabelLocal = nativeLabel || LANGUAGES.find(l => l.code === nativeLang)?.label || "Persian";
    const historyText = history
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.role === 'ai' ? compactCoachTextForHistory(m.text) : m.text.slice(0, 300)}`)
      .join('\n');

    const prompt = `
You are Jimmy, a friendly patient ${langLabel} coach. Learner's native language: ${nativeLabelLocal}.
They just wrote${writtenInNative ? ` (in ${nativeLabelLocal}, not ${langLabel})` : ""}: "${userSentence}"

Rules:
- Reply ENTIRELY in ${langLabel}, plain text only (no markdown/asterisks).
- If they wrote in ${langLabel} with mistakes, number each: 1. Instead of "X", you should say "Y".
- If they wrote in ${nativeLabelLocal} instead (not a mistake), show the natural ${langLabel} equivalent in the SAME format: 1. Instead of "<what they wrote in ${nativeLabelLocal}>", you should say "<${langLabel} equivalent>".
- Then continue the chat naturally and briefly — react, ask a follow-up, keep it like a real conversation, not a report.

Recent conversation:
${historyText}

Now respond to: "${userSentence}"
`;

    const result = await callAI({ prompt, maxTokens: 550, retries: 1, aiSettings });
    return result.trim();
  };

  // ✅ ایده‌ی کاربر برای کمترشدنِ مصرفِ توکن: وقتی کاربر فارسی می‌نویسه،
  // چیزِ «مشکوکی» برای تحلیلِ گرامری نیست — فقط یه ترجمه‌ست. پس دیگه لازم
  // نیست AI کارِ ترجمه رو هم انجام بده (که در askSpeakingTeacher انجام
  // می‌شد)؛ ترجمه با translateFree (گوگل‌ترنسلیت و جایگزین‌هاش، رایگان و
  // بدونِ توکن) گرفته می‌شه، و از AI فقط یه جوابِ کوتاهِ محاوره‌ای برای
  // ادامه‌ی طبیعیِ مکالمه خواسته می‌شه — بدونِ دستورالعملِ سنگینِ تشخیصِ
  // اشتباه، و با سقفِ توکنِ خیلی کمتر.
  const askContinuationOnly = async ({ translatedSentence, langCode, nativeLabel, aiSettings, history }) => {
    const langLabel = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
    const historyText = history
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.role === 'ai' ? compactCoachTextForHistory(m.text) : m.text.slice(0, 300)}`)
      .join('\n');

    const prompt = `You are Jimmy, a friendly ${langLabel} conversation partner. The learner (native language: ${nativeLabel || "Persian"}) just said, in ${langLabel}: "${translatedSentence}"

Reply ENTIRELY in ${langLabel}, briefly and naturally (1-3 short sentences) — react to what they said and/or ask a short follow-up question, like a real chat message. Plain text only, no markdown, no numbered lists.

Recent conversation:
${historyText}
`;

    const result = await callAI({ prompt, maxTokens: 180, retries: 1, aiSettings });
    return normalizeAiText(result.trim());
  };

  // 🔁 هسته‌ی مشترکِ گرفتنِ جوابِ Jimmy برای یه جمله‌ی مشخص — قبلاً این
  // منطق فقط داخلِ sendMessage بود؛ الان جدا شده تا هم sendMessage (پیامِ
  // تازه) و هم saveEditingMsg (ویرایش/ارسالِ مجددِ یه پیامِ قبلی) از همون
  // یک‌جا استفاده کنن، بدونِ تکرارِ کد. history باید همون پیام‌هایی باشه
  // که *قبل* از همین جمله بودن (نه شاملِ خودش).
  async function generateCoachReply(text, history) {
    const detectedLang = detectPastedTextLanguage(text) || chatLang;
    const writtenInNative = detectedLang === nativeLang && nativeLang !== chatLang;
    let finalText, finalCorrections;

    if (writtenInNative) {
      // فارسی نوشته — «مشکوک» نیست، فقط ترجمه‌ست: اول با ترجمه‌ی رایگان
      // امتحان می‌کنیم.
      let translated = "";
      try {
        translated = (await translateFree(text, chatLang, nativeLang, aiSettings) || "").trim();
      } catch (e) {
        translated = "";
      }

      if (!translated || translated === text) {
        // ترجمه‌ی رایگان جواب نداد (مثلاً آفلاین/فیلتر) — برمی‌گردیم به
        // مسیرِ کاملِ AI که خودش هم می‌تونه ترجمه کنه هم ادامه بده.
        const reply = await askSpeakingTeacher({
          userSentence: text, langCode: chatLang, nativeLang, nativeLabel, aiSettings, history, writtenInNative,
        });
        const extracted = extractCorrections(reply);
        finalText = extracted.text;
        finalCorrections = extracted.corrections;
      } else {
        const continuation = await askContinuationOnly({
          translatedSentence: translated, langCode: chatLang, nativeLabel, aiSettings, history,
        });
        // خودمون دقیقاً همون فرمتِ «اشتباه/پیشنهاد» رو می‌سازیم تا هایلایتِ
        // قرمز/سبزِ همیشگی و دکمه‌ی «ذخیره در گرامر» بدونِ تغییر کار کنن.
        const prefix = `1. Instead of "`;
        const mid = `", you should say "`;
        const oStart = prefix.length;
        const oEnd = oStart + text.length;
        const cStart = oEnd + mid.length;
        const cEnd = cStart + translated.length;
        finalText = `${prefix}${text}${mid}${translated}".\n\n${continuation}`;
        finalCorrections = [{ original: text, corrected: translated, oStart, oEnd, cStart, cEnd }];
      }
    } else {
      // انگلیسی نوشته (یا هرچی زبانِ تمرینه) — اینجا واقعاً «مشکوکه»
      // (ممکنه غلطِ گرامری داشته باشه)، پس کاملاً با AI بررسی می‌شه.
      const reply = await askSpeakingTeacher({
        userSentence: text, langCode: chatLang, nativeLang, nativeLabel, aiSettings, history, writtenInNative,
      });
      const extracted = extractCorrections(reply);
      finalText = extracted.text;
      finalCorrections = extracted.corrections;
    }

    return { finalText, finalCorrections };
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setCorrections([]);
    setCorrectionsSaved(false);

    const userMsg = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { finalText, finalCorrections } = await generateCoachReply(text, messages);
      if (finalCorrections.length > 0) {
        setCorrections(finalCorrections);
      }
      setMessages([...newMessages, { role: "ai", text: finalText, corrections: finalCorrections }]);
    } catch (e) {
      setError(e?.message?.replace(/^ai-backend-error:\s*/, "") || "خطا در دریافت پاسخ.");
    } finally {
      setLoading(false);
    }
  };

  function startEditingMsg(idx, currentText) {
    setTappedMsgIndex(null);
    setEditingMsgIndex(idx);
    setEditingMsgText(currentText);
  }

  function cancelEditingMsg() {
    setEditingMsgIndex(null);
    setEditingMsgText("");
  }

  // ویرایشِ یه پیامِ قبلیِ کاربر — دقیقاً مثلِ تبِ «گرامر»: بعد از ذخیره،
  // خودِ همون پیام با متنِ تازه جایگزین می‌شه، هر چی *بعدِ* اون بود (جوابِ
  // قدیمیِ Jimmy + هر پیامِ بعدی‌تر) حذف می‌شه، و یه درخواستِ تازه با متنِ
  // ویرایش‌شده فرستاده می‌شه تا Jimmy دوباره — با توجه به متنِ جدید —
  // جواب بده.
  async function saveEditingMsg() {
    const text = editingMsgText.trim();
    const idx = editingMsgIndex;
    if (!text || idx == null) {
      cancelEditingMsg();
      return;
    }
    const historyBeforeEdit = messages.slice(0, idx);
    const truncated = [...historyBeforeEdit, { role: "user", text }];
    setMessages(truncated);
    cancelEditingMsg();
    setError("");
    setCorrections([]);
    setCorrectionsSaved(false);
    setLoading(true);
    try {
      const { finalText, finalCorrections } = await generateCoachReply(text, historyBeforeEdit);
      if (finalCorrections.length > 0) {
        setCorrections(finalCorrections);
      }
      setMessages((m) => [...m, { role: "ai", text: finalText, corrections: finalCorrections }]);
    } catch (e) {
      setError(e?.message?.replace(/^ai-backend-error:\s*/, "") || "خطا در دریافت پاسخ.");
    } finally {
      setLoading(false);
    }
  }

  const clearChat = () => {
    setMessages([]);
    setError("");
    setCorrections([]);
    setCorrectionsSaved(false);
    setTranslations({});
    setOpenTranslation({});
    const langLabel = LANGUAGES.find(l => l.code === chatLang)?.label || chatLang;
    const welcome = `Hey there! I'm Jimmy, your conversation coach. Let's practice ${langLabel} together. 😊

I'll help you with grammar, vocabulary, and natural expressions. Feel free to write anything you'd like to talk about!

By the way, what's your name? Or tell me something about yourself.`;
    setMessages([{ role: "ai", text: welcome }]);
  };

  const translateMessage = async (text, targetLang, sourceLang) => {
    if (translateFree) {
      return await translateFree(text, targetLang, sourceLang, aiSettings);
    } else {
      const prompt = `Translate from ${sourceLang} to ${targetLang}: ${text}`;
      const result = await callAI({ prompt, maxTokens: 400, retries: 1, aiSettings });
      return result.trim();
    }
  };

  const toggleTranslation = async (index, langCode) => {
    const msg = messages[index];
    if (!msg || msg.role !== "ai") return;

    if (openTranslation[index] === langCode) {
      setOpenTranslation(prev => ({ ...prev, [index]: null }));
      return;
    }

    if (translations[index] && translations[index][langCode]) {
      setOpenTranslation(prev => ({ ...prev, [index]: langCode }));
      return;
    }

    setOpenTranslation(prev => ({ ...prev, [index]: langCode }));
    try {
      const translated = await translateMessage(msg.text, langCode, chatLang);
      setTranslations(prev => ({
        ...prev,
        [index]: { ...(prev[index] || {}), [langCode]: translated }
      }));
    } catch (e) {
      setOpenTranslation(prev => ({ ...prev, [index]: null }));
    }
  };

  // ✅ ذخیره‌ی تصحیحاتِ همین ردوبدل (اشتباه‌ها + پیشنهادها) به‌عنوانِ یک
  // یادداشتِ گرامری در تبِ «گرامر» — همون سیستمِ ذخیره‌سازیِ گرامرِ کل اپ
  // (saveGrammarNote)، پس بعداً از اونجا هم قابلِ مرور و مرورِ دوره‌ایه.
  //
  // 🐛 قبلاً این تابع مستقیم saveGrammarNote رو به‌عنوانِ یه تابعِ سراسری
  // صدا می‌زد — ولی این کامپوننت توی یه فایلِ جداگانه (SpeakingPractice.jsx)
  // تعریف شده و saveGrammarNote فقط داخلِ app.jsx (ماژولِ دیگه) تعریف
  // می‌شه، پس اونجا هیچ‌وقت در دسترس نبود و با زدنِ دکمه دقیقاً همین خطا رو
  // می‌داد: «ReferenceError: saveGrammarNote is not defined». الان از
  // طریقِ props (دقیقاً مثلِ callAI/translateFree/SpeakButton که از قبل
  // همینجوری پاس داده می‌شدن) از app.jsx می‌گیریمش.
  function saveCorrectionsToGrammar() {
    if (!corrections.length || typeof saveGrammarNote !== "function") return;
    const langLabel = LANGUAGES.find((l) => l.code === chatLang)?.label || chatLang;
    const markdown =
      `## 🗣️ تصحیحاتِ تمرین مکالمه (${langLabel})\n\n` +
      corrections
        .map((c, i) => `**${i + 1}. اشتباه:** ${c.original}\n\n**✅ پیشنهاد:** ${c.corrected}`)
        .join("\n\n---\n\n");
    saveGrammarNote({ langCode: chatLang, word: "", sentence: "", markdown });
    setCorrectionsSaved(true);
  }

  // همون قابلیتِ بالا، ولی برای یه پیامِ خاص/قدیمی‌تر توی تاریخچه‌ی گفتگو —
  // قبلاً فقط آخرین ردوبدل (کادرِ زردِ «تصحیحات» بالای گفتگو) دکمه‌ی ذخیره
  // داشت و به‌محضِ اومدنِ پیامِ بعدی، اون کادر با تصحیحاتِ جدید عوض می‌شد؛
  // یعنی اگه همون لحظه ذخیره نمی‌کردی، دیگه هیچ راهی برای ذخیره‌ی تصحیحاتِ
  // یه پیامِ قبلی نبود. الان کنارِ خودِ هر پیامِ AI (دقیقاً «کنارِ جمله»، نه
  // فقط بالای گفتگو) هم یه دکمه‌ی ذخیره هست — برای همون پیام، هر وقت
  // بخوای، حتی بعد از رفتنِ گفتگو به پیام‌های بعدی.
  function saveMessageCorrectionsToGrammar(idx) {
    const m = messages[idx];
    if (!m || !m.corrections || !m.corrections.length || typeof saveGrammarNote !== "function") return;
    const langLabel = LANGUAGES.find((l) => l.code === chatLang)?.label || chatLang;
    const markdown =
      `## 🗣️ تصحیحاتِ تمرین مکالمه (${langLabel})\n\n` +
      m.corrections
        .map((c, i) => `**${i + 1}. اشتباه:** ${c.original}\n\n**✅ پیشنهاد:** ${c.corrected}`)
        .join("\n\n---\n\n");
    saveGrammarNote({ langCode: chatLang, word: "", sentence: "", markdown });
    setMessages((prev) => prev.map((msg, i) => (i === idx ? { ...msg, savedToGrammar: true } : msg)));
  }

  const langOptions = targetOrder && targetOrder.length ? targetOrder : ["en"];
  const translationLangs = Array.from(new Set([nativeLang, ...targetOrder])).filter(l => l !== chatLang);

  return (
    <div className="flex flex-col gap-4" style={{ padding: "0 4px" }}>
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>
          🗣️ تمرین مکالمه
        </h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          یک جمله به زبانی که یاد می‌گیری بنویس و جیمی (AI) آن را بررسی می‌کند،
          اشتباهات را تصحیح می‌کند و بر اساس زبان مادری‌ات توضیح می‌دهد. مثل یک معلم مکالمه!
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 12, color: colors.inkSoft }}>زبان تمرین:</span>
        <select
          value={chatLang}
          onChange={(e) => setChatLang(e.target.value)}
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            border: `1px solid ${colors.cardBorder}`,
            fontSize: 13,
            background: "white",
            color: colors.ink,
          }}
        >
          {langOptions.map((code) => {
            const label = LANGUAGES.find((l) => l.code === code)?.label || code;
            return <option key={code} value={code}>{label}</option>;
          })}
        </select>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1"
            style={{ fontSize: 12, color: colors.rose, fontWeight: 700, marginLeft: "auto" }}
          >
            <Trash2 size={14} /> پاک کردن گفتگو
          </button>
        )}
      </div>

      {/* ✅ کادر تصحیح با رنگ‌بندی */}
      {corrections.length > 0 && (
        <div
          style={{
            backgroundColor: colors.goldSoft,
            border: `1px solid ${colors.gold}`,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>✏️ تصحیحات</span>
            <button
              onClick={saveCorrectionsToGrammar}
              disabled={correctionsSaved}
              className="flex items-center gap-1"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: correctionsSaved ? colors.inkSoft : colors.teal,
                opacity: correctionsSaved ? 0.7 : 1,
              }}
            >
              {correctionsSaved ? "✅ ذخیره شد" : "💾 ذخیره در گرامر"}
            </button>
          </p>
          {corrections.map((c, idx) => (
            <p key={idx} style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: MISTAKE_STYLE.color }}>{idx + 1}. اشتباه: </span>
              <span style={MISTAKE_STYLE}>{c.original}</span>
              <br />
              <span style={{ fontWeight: 600, color: CORRECTION_STYLE.color }}>   ✅ پیشنهاد: </span>
              <span style={CORRECTION_STYLE}>{c.corrected}</span>
            </p>
          ))}
        </div>
      )}

      {/* منطقه چت */}
      <div
        style={{
          backgroundColor: "white",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: "10px 12px",
          minHeight: 200,
          maxHeight: 420,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          const isEditing = editingMsgIndex === idx;
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-start" : "flex-end" }}>
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
                      ذخیره و ارسالِ مجدد
                    </button>
                  </div>
                </div>
              ) : (
              <div
                onClick={() => isUser && setTappedMsgIndex((prev) => (prev === idx ? null : idx))}
                style={{
                  maxWidth: "88%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  backgroundColor: isUser ? colors.paper : colors.goldSoft,
                  border: `1px solid ${colors.cardBorder}`,
                  fontSize: 13,
                  lineHeight: 1.7,
                  wordBreak: "break-word",
                  direction: isUser ? "auto" : "ltr",
                  textAlign: isUser ? "start" : "left",
                  cursor: isUser ? "pointer" : "default",
                }}
              >
                {isUser ? (
                  m.text
                ) : (
                  buildHighlightSegments(m.text, m.corrections).map((seg, si) => {
                    if (seg.type === "mistake") {
                      return (
                        <span key={si} style={MISTAKE_STYLE}>
                          {seg.text}
                        </span>
                      );
                    }
                    if (seg.type === "correction") {
                      return (
                        <span key={si} style={CORRECTION_STYLE}>
                          {seg.text}
                        </span>
                      );
                    }
                    return ClickableSentence ? (
                      <ClickableSentence
                        key={si}
                        text={seg.text}
                        langCode={chatLang}
                        nativeLang={nativeLang}
                        aiSettings={aiSettings}
                        color={colors.ink}
                        fontFamily={fontLatin}
                        fontSize={13}
                      />
                    ) : (
                      <React.Fragment key={si}>{seg.text}</React.Fragment>
                    );
                  })
                )}
              </div>
              )}

              {/* دکمه‌ی «ویرایش» — فقط با تپ‌کردن رویِ پیامِ خودِ کاربر
                  ظاهر می‌شه؛ زدنش، خودِ پیام رو با متنِ تازه جایگزین
                  می‌کنه و از همون‌جا دوباره برای Jimmy می‌فرسته (جوابِ
                  قدیمی + هر پیامِ بعدی‌تر پاک می‌شه). */}
              {isUser && !isEditing && tappedMsgIndex === idx && (
                <button
                  onClick={() => startEditingMsg(idx, m.text)}
                  className="flex items-center gap-1"
                  style={{ fontSize: 11, color: colors.teal, fontWeight: 700, marginTop: 4 }}
                >
                  <Pencil size={12} />
                  ویرایش
                </button>
              )}

              {!isUser && (
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4, direction: "ltr" }}>
                  {SpeakButton && <SpeakButton text={m.text} code={chatLang} color={colors.teal} />}
                  {translationLangs.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe size={13} color={colors.inkSoft} />
                      {translationLangs.map(lang => {
                        const label = LANGUAGES.find(l => l.code === lang)?.label || lang;
                        const isOpen = openTranslation[idx] === lang;
                        return (
                          <button
                            key={lang}
                            onClick={() => toggleTranslation(idx, lang)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 999,
                              padding: "2px 8px",
                              backgroundColor: isOpen ? colors.teal : "white",
                              color: isOpen ? "white" : colors.inkSoft,
                              border: `1px solid ${isOpen ? colors.teal : colors.cardBorder}`,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </span>
                  )}
                  {/* دکمه‌ی ذخیره‌ی تصحیحاتِ همین پیامِ خاص — فقط وقتی این
                      پیام واقعاً تصحیح داشته باشه (m.corrections پر باشه)
                      نشون داده می‌شه؛ برخلافِ کادرِ زردِ بالای گفتگو (که
                      فقط آخرین ردوبدل رو نگه می‌داره)، این همیشه کنارِ
                      همون پیام می‌مونه، حتی بعد از رفتنِ گفتگو جلوتر. */}
                  {m.corrections && m.corrections.length > 0 && (
                    m.savedToGrammar ? (
                      <span
                        className="flex items-center gap-1"
                        style={{ fontSize: 11, color: colors.gold, fontWeight: 700 }}
                      >
                        ✅ ذخیره شد
                      </span>
                    ) : (
                      <button
                        onClick={() => saveMessageCorrectionsToGrammar(idx)}
                        className="flex items-center gap-1"
                        style={{ fontSize: 11, color: colors.teal, fontWeight: 700 }}
                      >
                        💾 ذخیره در گرامر
                      </button>
                    )
                  )}
                </div>
              )}

              {!isUser && openTranslation[idx] && translations[idx] && translations[idx][openTranslation[idx]] && (
                <div
                  dir="auto"
                  style={{
                    marginTop: 4,
                    maxWidth: "88%",
                    fontSize: 12,
                    color: colors.ink,
                    backgroundColor: colors.paperDark,
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: `1px solid ${colors.cardBorder}`,
                    alignSelf: "flex-end",
                    direction: openTranslation[idx] === "fa" ? "rtl" : "ltr",
                    textAlign: openTranslation[idx] === "fa" ? "right" : "left",
                  }}
                >
                  {translations[idx][openTranslation[idx]]}
                  {SpeakButton && (
                    <span style={{ marginLeft: 6 }}>
                      <SpeakButton text={translations[idx][openTranslation[idx]]} code={openTranslation[idx]} color={colors.teal} size={12} />
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.inkSoft }}>
            <Loader2 size={14} className="spin" />
            در حال بررسی...
          </div>
        )}
        {error && (
          <div style={{ alignSelf: "flex-end", color: colors.rose, fontSize: 12 }}>
            ❌ {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* نوار ورودی */}
      <div
        className="flex gap-2 items-end"
        style={{
          backgroundColor: "white",
          border: `1.5px solid ${colors.teal}`,
          borderRadius: 12,
          padding: 6,
        }}
      >
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: colors.teal,
            color: "#fff",
            borderRadius: 10,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading || !input.trim() ? 0.5 : 1,
            boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(28,37,65,0.25)",
            flexShrink: 0,
          }}
        >
          <Send size={16} color="#fff" />
        </button>
        <textarea
          ref={chatTextareaRef}
          dir="auto"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="متن خود را بنویسید..."
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
            touchAction: "manipulation",
            contain: "layout",
          }}
        />
      </div>
    </div>
  );
}

export default SpeakingPracticePanel;