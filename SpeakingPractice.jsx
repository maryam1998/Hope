import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Globe } from "lucide-react";

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
  callAI,
  SpeakButton,
  ClickableSentence,
  translateFree,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatLang, setChatLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [correction, setCorrection] = useState(null); // ← اینجا تعریف شده
  const [translations, setTranslations] = useState({});
  const [openTranslation, setOpenTranslation] = useState({});

  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);

  // شروع مکالمه
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

  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // استخراج تصحیح
  function extractCorrection(reply) {
    const patterns = [
      /Instead of\s+["']([^"']+)["']\s*,?\s*(?:you should|you can|try|use)\s+["']([^"']+)["']/i,
      /You should say\s+["']([^"']+)["']\s*(?:instead of|not)\s+["']([^"']+)["']/i,
      /Use\s+["']([^"']+)["']\s+not\s+["']([^"']+)["']/i,
      /به جای\s+["']([^"']+)["']\s*(?:باید|می‌توانید)\s+["']([^"']+)["']/i,
    ];
    for (const pattern of patterns) {
      const match = reply.match(pattern);
      if (match) {
        return {
          wrong: match[1].trim(),
          correct: match[2].trim(),
          cleaned: reply.replace(match[0], '').trim()
        };
      }
    }
    return null;
  }

  // تابع مکالمه (مستقل از askGrammarTeacher)
  const askSpeakingTeacher = async ({ userSentence, langCode, nativeLang, nativeLabel, aiSettings, history }) => {
    const langLabel = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
    const nativeLabelLocal = nativeLabel || LANGUAGES.find(l => l.code === nativeLang)?.label || "Persian";
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.text}`)
      .join('\n');

    const prompt = `
You are Jimmy, a friendly and patient language coach for a learner whose native language is ${nativeLabelLocal}.
The learner is practicing ${langLabel}. They just wrote: "${userSentence}"

Your task:
- Respond ENTIRELY in ${langLabel} (unless they specifically ask about grammar in their native language).
- If they made any mistake, gently point it out. Use this exact format: "Instead of 'X', you should say 'Y'." (in ${langLabel}).
- Then give a short explanation of the mistake in ${nativeLabelLocal} (but keep the example sentences in ${langLabel}).
- Continue the conversation naturally by asking a follow‑up question or suggesting a related topic.
- Keep your reply friendly, encouraging, and not too long (3–5 sentences maximum).

Recent conversation:
${historyText}

Now respond to: "${userSentence}"
`;

    const result = await callAI({ prompt, maxTokens: 600, retries: 1, aiSettings });
    return result.trim();
  };

  // ارسال پیام
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setCorrection(null);

    const userMsg = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await askSpeakingTeacher({
        userSentence: text,
        langCode: chatLang,
        nativeLang,
        nativeLabel,
        aiSettings,
        history: messages,
      });

      const extracted = extractCorrection(reply);
      let displayReply = reply;
      if (extracted) {
        setCorrection({ original: extracted.wrong, corrected: extracted.correct });
        displayReply = extracted.cleaned || reply;
        if (!displayReply.trim()) {
          displayReply = `Try using "${extracted.correct}" instead of "${extracted.wrong}".`;
        }
      }

      setMessages([...newMessages, { role: "ai", text: displayReply }]);
    } catch (e) {
      setError(e?.message?.replace(/^ai-backend-error:\s*/, "") || "خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  // پاک کردن چت
  const clearChat = () => {
    setMessages([]);
    setError("");
    setCorrection(null);
    setTranslations({});
    setOpenTranslation({});
    const langLabel = LANGUAGES.find(l => l.code === chatLang)?.label || chatLang;
    const welcome = `Hey there! I'm Jimmy, your conversation coach. Let's practice ${langLabel} together. 😊

I'll help you with grammar, vocabulary, and natural expressions. Feel free to write anything you'd like to talk about!

By the way, what's your name? Or tell me something about yourself.`;
    setMessages([{ role: "ai", text: welcome }]);
  };

  // ترجمه
  const translateMessage = async (text, targetLang, sourceLang) => {
    if (translateFree) {
      return await translateFree(text, targetLang, sourceLang, aiSettings);
    } else {
      const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Respond with only the translation, no extra text.\n\nText: ${text}`;
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
      console.warn("Translation failed:", e);
      setOpenTranslation(prev => ({ ...prev, [index]: null }));
    }
  };

  const langOptions = targetOrder && targetOrder.length ? targetOrder : ["en"];
  const translationLangs = Array.from(new Set([nativeLang, ...targetOrder])).filter(l => l !== chatLang);

  return (
    <div className="flex flex-col gap-4" style={{ padding: "0 4px" }}>
      {/* هدر */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>
          🗣️ تمرین مکالمه
        </h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          یک جمله به زبانی که یاد می‌گیری بنویس و جیمی (AI) آن را بررسی می‌کند،
          اشتباهات را تصحیح می‌کند و بر اساس زبان مادری‌ات توضیح می‌دهد. مثل یک معلم مکالمه!
        </p>
      </div>

      {/* نوار ابزار */}
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

      {/* کادر تصحیح - با رنگ قرمز و بولد */}
      {correction && (
        <div
          style={{
            backgroundColor: colors.goldSoft,
            border: `1px solid ${colors.gold}`,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>
            ✏️ تصحیح
          </p>
          <p style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: colors.rose }}>اشتباه: </span>
            <span style={{ color: colors.rose }}>{correction.original}</span>
            <br />
            <span style={{ fontWeight: 600, color: colors.teal }}>پیشنهاد: </span>
            <span style={{ fontWeight: "bold", color: colors.teal }}>{correction.corrected}</span>
          </p>
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
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-start" : "flex-end" }}>
              <div
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
                }}
              >
                {isUser ? (
                  m.text
                ) : (
                  ClickableSentence ? (
                    <ClickableSentence
                      text={m.text}
                      langCode={chatLang}
                      nativeLang={nativeLang}
                      aiSettings={aiSettings}
                      color={colors.ink}
                      fontFamily={fontLatin}
                      fontSize={13}
                    />
                  ) : (
                    m.text
                  )
                )}
              </div>

              {/* دکمه‌های TTS و ترجمه */}
              {!isUser && (
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4, direction: "ltr" }}>
                  {SpeakButton && (
                    <SpeakButton text={m.text} code={chatLang} color={colors.teal} />
                  )}
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
                </div>
              )}

              {/* نمایش ترجمه */}
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

      {/* نوار ورودی - با touchAction و contain برای جلوگیری از زوم */}
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
            touchAction: "manipulation",    // جلوگیری از زوم ناخواسته
            contain: "layout",              // جلوگیری از جابه‌جایی صفحه
          }}
        />
      </div>
    </div>
  );
}

export default SpeakingPracticePanel;