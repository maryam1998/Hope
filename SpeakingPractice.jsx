import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, X } from "lucide-react";

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

function SpeakingPracticePanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  askGrammarTeacher,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [correction, setCorrection] = useState(null); // { original, corrected }

  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);

  // پیام خوش‌آمدگویی جیمی در اولین رندر
  useEffect(() => {
    if (messages.length === 0) {
      const langLabel = LANGUAGES.find(l => l.code === chatLang)?.label || chatLang;
      setMessages([
        {
          role: "ai",
          text: `سلام! من جیمی هستم، معلم مکالمه‌ی تو. بیا با هم تمرین کنیم! یک جمله به ${langLabel} بنویس تا بررسی کنم.`
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // اسکرول خودکار به انتهای چت
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, loading]);

  // رشد خودکار textarea
  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // استخراج تصحیح از پاسخ هوش مصنوعی با الگوهای رایج
  function extractCorrection(reply, userSentence) {
    // الگوهای مختلف برای پیدا کردن تصحیح
    const patterns = [
      // انگلیسی: Instead of "X", you should say "Y"
      /Instead of\s+["']([^"']+)["']\s*,?\s*(?:you should|you can|try)\s+["']([^"']+)["']/i,
      // انگلیسی: You should say "Y" instead of "X"
      /You should say\s+["']([^"']+)["']\s*(?:instead of|not)\s+["']([^"']+)["']/i,
      // فارسی: به جای "X" باید بگویید "Y"
      /به جای\s+["']([^"']+)["']\s*(?:باید|می‌توانید)\s+["']([^"']+)["']/i,
      // انگلیسی ساده: Use "Y" not "X"
      /Use\s+["']([^"']+)["']\s+not\s+["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = reply.match(pattern);
      if (match) {
        // match[1] = عبارت اشتباه, match[2] = عبارت صحیح
        const wrong = match[1].trim();
        const correct = match[2].trim();
        // حذف بخش تصحیح از پاسخ اصلی
        const cleaned = reply.replace(match[0], '').trim();
        return { wrong, correct, cleaned };
      }
    }

    // اگر الگو پیدا نشد، بررسی کنیم که آیا پاسخ با "Instead of" شروع می‌شود
    if (reply.startsWith("Instead of") || reply.startsWith("به جای")) {
      // سعی کنیم با نقطه یا خط جدید جدا کنیم
      const parts = reply.split(/[.!?]\s+/);
      if (parts.length >= 2) {
        const correctionPart = parts[0];
        const rest = parts.slice(1).join(". ");
        // استخراج ساده: فرض کنیم اولین بخش تصحیح است
        const match = correctionPart.match(/["']([^"']+)["']/g);
        if (match && match.length >= 2) {
          const wrong = match[0].replace(/["']/g, '');
          const correct = match[1].replace(/["']/g, '');
          return { wrong, correct, cleaned: rest };
        }
      }
    }

    return null;
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setCorrection(null);

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await askGrammarTeacher({
        userSentence: text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: messages,
        targetOrder,
      });

      // تلاش برای استخراج تصحیح
      const extracted = extractCorrection(reply, text);
      let responseText = reply;
      if (extracted) {
        setCorrection({
          original: extracted.wrong,
          corrected: extracted.correct,
        });
        responseText = extracted.cleaned || reply;
        // اگر بعد از پاک کردن، رشته خالی شد، از یک پاسخ پیش‌فرض استفاده کن
        if (!responseText.trim()) {
          responseText = `پیشنهاد من: به جای "${extracted.wrong}" از "${extracted.correct}" استفاده کنید.`;
        }
      }

      setMessages([...newMessages, { role: "ai", text: responseText }]);
    } catch (e) {
      setError(e?.message?.replace(/^ai-backend-error:\s*/, "") || "خطا در دریافت پاسخ");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    setCorrection(null);
    const langLabel = LANGUAGES.find(l => l.code === chatLang)?.label || chatLang;
    setMessages([
      {
        role: "ai",
        text: `سلام! من جیمی هستم، معلم مکالمه‌ی تو. بیا با هم تمرین کنیم! یک جمله به ${langLabel} بنویس تا بررسی کنم.`
      }
    ]);
  };

  const langOptions = targetOrder && targetOrder.length ? targetOrder : ["en"];

  return (
    <div className="flex flex-col gap-4" style={{ padding: "0 4px" }}>
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>
          🗣️ تمرین مکالمه
        </h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          یک جمله به زبانی که یاد می‌گیری بنویس و جیمی (AI) آن را بررسی می‌کند، اشتباهات را تصحیح می‌کند و بر اساس زبان مادری‌ات توضیح می‌دهد. مثل یک معلم مکالمه!
        </p>
      </div>

      {/* انتخاب زبان هدف */}
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
            return (
              <option key={code} value={code}>
                {label}
              </option>
            );
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

      {/* کادر تصحیح (Correction) - در بالای چت */}
      {correction && (
        <div
          style={{
            backgroundColor: colors.goldSoft,
            border: `1px solid ${colors.gold}`,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>
            ✏️ تصحیح
          </p>
          <p style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: colors.rose }}>اشتباه: </span>
            <span style={{ textDecoration: "line-through", color: colors.rose }}>{correction.original}</span>
            <br />
            <span style={{ fontWeight: 600, color: colors.teal }}>{nativeLabel || "پیشنهاد"}: </span>
            <span style={{ color: colors.teal }}>{correction.corrected}</span>
          </p>
        </div>
      )}

      {/* منطقه پیام‌ها */}
      <div
        style={{
          backgroundColor: "white",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: "10px 12px",
          minHeight: 200,
          maxHeight: 400,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 && !loading && (
          <p style={{ color: colors.inkSoft, fontSize: 13, textAlign: "center", margin: "auto 0" }}>
            جمله‌ات را بنویس تا جیمی آن را بررسی کند...
          </p>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? "flex-start" : "flex-end",
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 12,
                backgroundColor: isUser ? colors.paper : colors.goldSoft,
                border: `1px solid ${colors.cardBorder}`,
                fontSize: 13,
                lineHeight: 1.7,
                wordBreak: "break-word",
              }}
            >
              {m.text}
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
          }}
        />
      </div>
    </div>
  );
}

export default SpeakingPracticePanel;