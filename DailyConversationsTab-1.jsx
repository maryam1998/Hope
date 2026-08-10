import React, { useState, useMemo } from "react";

// یک باکس گفتگو — یا "You Hear" (کرم) یا "You Say" (نارنجی روشن) — دقیقاً
// شبیه طرح تصویر. هر خط انگلیسی با ClickableSentence رندر می‌شه، یعنی
// دقیقاً همون پاپ‌آپِ روی-کلمه (افزودن به داستان بعدی / افزودن به یادگیری
// گرامر) که تو بقیه‌ی تب‌های برنامه هست، اینجا هم فعاله.
function ConversationBox({ items, variant, nativeLang, aiSettings, ClickableSentence, SpeakButton }) {
  const isHear = variant === "hear";
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: isHear ? "#fbf7e3" : "#fbdcae",
        border: "3px solid #1a1a1a",
        borderRadius: 10,
        padding: "16px 20px",
        margin: isHear ? "10px 46px 10px 0" : "10px 0 10px 46px",
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 0",
            borderBottom: i < items.length - 1 ? "1px dashed rgba(0,0,0,0.15)" : "none",
          }}
        >
          <div style={{ direction: "ltr", textAlign: "left", flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 500, color: "#1a1a1a" }}>
              {ClickableSentence ? (
                <ClickableSentence text={it.en} langCode="en" nativeLang={nativeLang} aiSettings={aiSettings} />
              ) : (
                it.en
              )}
            </div>
            {it.fa && (
              <div style={{ fontSize: 13, color: "#666", marginTop: 2, fontFamily: "var(--font-fa)" }}>{it.fa}</div>
            )}
          </div>
          {SpeakButton && <SpeakButton text={it.en} code="en" color="#8a7a5c" />}
        </div>
      ))}
      <span
        style={{
          position: "absolute",
          [isHear ? "right" : "left"]: -40,
          bottom: 6,
          fontSize: 30,
        }}
      >
        {isHear ? "🧑" : "👩‍🦰"}
      </span>
    </div>
  );
}

export default function DailyConversationsTab({ data, query, nativeLang, aiSettings, ClickableSentence, SpeakButton }) {
  const [openTopic, setOpenTopic] = useState(0);

  const filteredTopics = useMemo(() => {
    if (!query || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data
      .map((t) => {
        const scenarios = t.scenarios.filter(
          (sc) =>
            sc.scenario.toLowerCase().includes(q) ||
            sc.speakerA.some((x) => x.en.toLowerCase().includes(q)) ||
            sc.speakerB.some((x) => x.en.toLowerCase().includes(q))
        );
        return { ...t, scenarios };
      })
      .filter((t) => t.scenarios.length > 0);
  }, [data, query]);

  if (filteredTopics.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#888" }}>چیزی پیدا نشد.</div>;
  }

  const activeIndex = Math.min(openTopic, filteredTopics.length - 1);
  const activeTopic = filteredTopics[activeIndex];

  return (
    <div>
      {/* لیست موضوعات — اسکرول افقی */}
      <div className="flex gap-2 overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {filteredTopics.map((t, i) => (
          <button
            key={t.topic}
            onClick={() => setOpenTopic(i)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              border: "1px solid #d8cfae",
              backgroundColor: i === activeIndex ? "#2f6f6f" : "#fff",
              color: i === activeIndex ? "#fff" : "#333",
              fontSize: 13,
              fontFamily: "var(--font-fa)",
              flexShrink: 0,
            }}
          >
            {t.topic}
          </button>
        ))}
      </div>

      {/* سناریوهای موضوع انتخاب‌شده */}
      {activeTopic.scenarios.map((sc, si) => (
        <div key={si} style={{ marginTop: 28 }}>
          <div style={{ fontWeight: "bold", fontSize: 15, fontFamily: "var(--font-fa)" }}>{sc.scenario}</div>
          {sc.context && (
            <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontFamily: "var(--font-fa)" }}>{sc.context}</div>
          )}

          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 10, textAlign: "left" }}>You Hear</div>
          <ConversationBox
            items={sc.speakerA}
            variant="hear"
            nativeLang={nativeLang}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            SpeakButton={SpeakButton}
          />

          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, textAlign: "left" }}>You Say</div>
          <ConversationBox
            items={sc.speakerB}
            variant="say"
            nativeLang={nativeLang}
            aiSettings={aiSettings}
            ClickableSentence={ClickableSentence}
            SpeakButton={SpeakButton}
          />
        </div>
      ))}
    </div>
  );
}
