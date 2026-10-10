import React from "react";
import { Bookmark, Loader2, Plus, X } from "lucide-react";
import { colors, fontFa, fontLatin } from "../../ui/theme.js";
import { tr } from "../../ui/uiStrings.js";

export function StoryWordPicker({
  addCustomWord,
  customWord,
  filteredVocab,
  handleVocabPaste,
  matchingSavedWords,
  otherTabMatches,
  pickedTermTranslations,
  pickForeignWord,
  selectedWords,
  setCustomWord,
  setSelectedWords,
  setVocabQuery,
  storyLang,
  storyLangLabel,
  toggleWord,
  translateNote,
  translatingPick,
  uiLang,
  vocabQuery,
  wordTranslating,
}) {
  return (
      <div
        style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
      >
        <div className="flex items-center justify-between mb-2">
          <p style={{ fontWeight: 700, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("storyWordsSection", uiLang)}</p>
        </div>

        <div className="flex gap-2 mb-1">
          <input
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !wordTranslating && addCustomWord()}
            placeholder={
              uiLang === "en"
                ? `Type a word (in any language) — it'll be translated and added to ${storyLangLabel}...`
                : `یه لغت بنویس (به هر زبونی) — به ${storyLangLabel} ترجمه و اضافه می‌شه...`
            }
            dir="auto"
            disabled={wordTranslating}
            style={{
              flex: 1,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 13,
              outline: "none",
              textAlign: "start",
              opacity: wordTranslating ? 0.6 : 1,
            }}
          />
          <button
            onClick={addCustomWord}
            disabled={wordTranslating}
            style={{ backgroundColor: colors.ink, color: "white", borderRadius: 10, padding: "0 12px", opacity: wordTranslating ? 0.6 : 1 }}
          >
            {wordTranslating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          </button>
        </div>
        {translateNote && (
          <p style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>{translateNote}</p>
        )}


        <input
          value={vocabQuery}
          onChange={(e) => setVocabQuery(e.target.value)}
          onPaste={handleVocabPaste}
          placeholder={
            uiLang === "en"
              ? "Or search vocab, daily dialogues, words & news, slang expressions, saved words..."
              : "یا از دیکشنری من، دیالوگ‌های روزمره، لغات و اخبار، اصطلاحات عامیانه، لغات ذخیره‌شده جستجو کن..."
          }
          style={{
            width: "100%",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
            marginBottom: 10,
          }}
        />
        <div className="flex flex-wrap gap-2 mb-3" style={{ maxHeight: 140, overflowY: "auto" }}>
          {filteredVocab.map((v) => {
            const w = v.t[storyLang] || v.t.en;
            const active = selectedWords.includes(w);
            return (
              <button
                key={v.id}
                onClick={() => toggleWord(w)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.cardBorder}`,
                  backgroundColor: active ? colors.goldSoft : colors.paper,
                }}
              >
                {w}
              </button>
            );
          })}

          {/* لغاتِ ذخیره‌شده‌ی همین زبان — فقط وقتی کاربر جستجو می‌کنه (طبق
              درخواست، دیگه به‌طور پیش‌فرض نشون داده نمی‌شن). */}
          {matchingSavedWords.map((e) => {
            const active = selectedWords.includes(e.word);
            return (
              <button
                key={`saved-${e.word}`}
                onClick={() => toggleWord(e.word)}
                title={uiLang === "en" ? "From saved words" : "از لغات ذخیره‌شده"}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${active ? colors.gold : colors.teal}`,
                  backgroundColor: active ? colors.goldSoft : "white",
                }}
              >
                <Bookmark size={11} color={colors.teal} />
                {e.word}
              </button>
            );
          })}

          {/* نتایجِ جستجو از تب‌های لغات / لغات و اخبار / مکالمه‌ی روزمره /
              مکالمات روزمره — فقط وقتی کاربر تایپ کرده. چون این‌ها فقط به
              انگلیسی‌ان، اگه زبانِ داستان چیز دیگه‌ای باشه، اول ترجمه می‌شن. */}
          {otherTabMatches
            .filter((item) => {
              // اگه این لغت (به شکلِ ترجمه‌شده‌ی واقعاً اضافه‌شده‌اش) همین الان
              // تو انتخاب‌های داستانه، دیگه تو این لیست نشونش نده.
              const mapped = storyLang === "en" ? item.term : pickedTermTranslations[item.term];
              return !mapped || !selectedWords.includes(mapped);
            })
            .map((item) => {
            const busy = translatingPick === item.term;
            return (
              <button
                key={`other-${item.source}-${item.term}`}
                onClick={() => pickForeignWord(item.term)}
                disabled={busy}
                title={item.source}
                className="flex items-center gap-1"
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: `1px solid ${colors.cardBorder}`,
                  backgroundColor: colors.paper,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy && <Loader2 size={11} className="spin" />}
                {item.term}
                <span style={{ fontSize: 9, color: colors.inkSoft }}>({item.source})</span>
              </button>
            );
          })}
        </div>

        {selectedWords.length > 0 && (
          <div style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((w) => (
                <span
                  key={w}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    backgroundColor: colors.ink,
                    color: "white",
                  }}
                >
                  {w}
                  <button onClick={() => toggleWord(w)} aria-label={uiLang === "en" ? "Remove" : "حذف"}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setSelectedWords([])}
                style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}
              >
                {tr("clearAllWords", uiLang)}
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
