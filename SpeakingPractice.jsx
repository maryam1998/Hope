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

// تعریف LANGUAGES برای استفاده در select
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

// این تابع از app.jsx وارد می‌شود، اما برای جلوگیری از وابستگی دایره‌ای،
// آن را به‌عنوان prop به کامپوننت پاس می‌دهیم یا مجدداً تعریف می‌کنیم.
// در اینجا فرض می‌کنیم که تابع askGrammarTeacher از app.jsx در دسترس است.
// برای سادگی، این تابع را به‌عنوان prop به کامپوننت می‌دهیم.
function SpeakingPracticePanel({
  nativeLang,
  nativeLabel,
  targetOrder,
  aiSettings,
  askGrammarTeacher, // تابع از app.jsx
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");

  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, loading]);

  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
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
        history: messages, // context قبلی
        targetOrder,
      });
      setMessages([...newMessages, { role: "ai", text: reply }]);
    } catch (e) {
      setError(e?.message?.replace(/^ai-backend-error:\s*/, "") || "خطا در دریافت پاسخ");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  const langOptions = targetOrder && targetOrder.length ? targetOrder : ["en"];

  const isFa = nativeLang === "fa";

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