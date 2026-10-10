import React from "react";
import { Bookmark, Check, Loader2, Pencil, RotateCcw, Search, X } from "lucide-react";
import { ClickableSentence } from "./ClickableSentence.jsx";
import { RTL_LANGS, dirFor } from "../../constants/languages.js";
import { SpeakButton } from "../player/SpeakButton.jsx";
import { StoryUserAudioBar } from "./UserAudioBar.jsx";
import { colors, fontFa, fontLatin, highlightBg, mainTextColor, translationColor } from "../../ui/theme.js";
import { countOccurrences } from "../../story/storyText.js";
import { PARAGRAPH_PAGE_SIZE } from "../../story/readingHelpers.js";

export function StoryReaderPanel({
  activeStorySentence,
  activeTranslation,
  aiSettings,
  applyEditedStoryText,
  cancelEditingStoryText,
  currentStoryId,
  editingStoryText,
  fullStoryText,
  fullTranslatedTextByLang,
  granularity,
  highlightColor,
  highlightSentence,
  jumpToLineInUserAudio,
  jumpToStorySearchMatch,
  nativeLabel,
  nativeLang,
  orderedTranslationLangs,
  paragraphBaseOffsetMap,
  paragraphElsRef,
  paragraphs,
  playbackMode,
  reportStoryWordSpoken,
  retranslateStoryParagraph,
  retranslateStorySentence,
  retranslatingSentences,
  saveCurrentStory,
  selectedWords,
  sentenceElsRef,
  sentenceOffsetMap,
  setGranularity,
  setStoryEditDraft,
  setStoryNote,
  setStorySearchQuery,
  setVisibleParagraphCount,
  startEditingStoryText,
  storyEditDraft,
  storyLang,
  storyNote,
  storySearchMatches,
  storySearchQuery,
  storySentenceBoundaries,
  translatedParagraphBaseOffsetMapByLang,
  translatedSentenceBoundariesByLang,
  translatedSentenceOffsetMapByLang,
  translationLangOptions,
  translationLangs,
  uiLang,
  userAudio,
  visibleParagraphCount,
}) {
  return (
        <div
          style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontWeight: 700 }}>{uiLang === "en" ? "Story" : "داستان"}</p>
            <div className="flex items-center gap-3 flex-wrap" style={{ rowGap: 8 }}>
              <button
                onClick={editingStoryText ? cancelEditingStoryText : startEditingStoryText}
                title={editingStoryText ? (uiLang === "en" ? "Cancel editing" : "انصراف از ویرایش") : (uiLang === "en" ? "Edit story text" : "ویرایشِ متنِ داستان")}
                aria-label={editingStoryText ? (uiLang === "en" ? "Cancel editing" : "انصراف از ویرایش") : (uiLang === "en" ? "Edit story text" : "ویرایشِ متنِ داستان")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: editingStoryText ? colors.rose : colors.teal,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {editingStoryText ? <X size={16} /> : <Pencil size={16} />}
              </button>
              <button
                onClick={saveCurrentStory}
                title={currentStoryId ? (uiLang === "en" ? "Saved" : "ذخیره شد") : (uiLang === "en" ? "Save story" : "ذخیره داستان")}
                aria-label={currentStoryId ? (uiLang === "en" ? "Saved" : "ذخیره شد") : (uiLang === "en" ? "Save story" : "ذخیره داستان")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: currentStoryId ? colors.teal : colors.gold,
                  background: "none",
                  border: "none",
                  cursor: currentStoryId ? "default" : "pointer",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {currentStoryId ? <Check size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {!editingStoryText && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="flex items-center gap-2"
                style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: "6px 10px" }}
              >
                <Search size={14} color={colors.inkSoft} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder={uiLang === "en" ? "Search inside the story text — any language" : "جستجو داخلِ متنِ داستان — به هر زبانی"}
                  dir="auto"
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13, background: "transparent", color: colors.ink }}
                />
                {!!storySearchQuery && (
                  <button
                    onClick={() => setStorySearchQuery("")}
                    aria-label={uiLang === "en" ? "Clear search" : "پاک‌کردنِ جستجو"}
                    style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: colors.inkSoft, cursor: "pointer", flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {!!storySearchQuery.trim() && (
                <div style={{ marginTop: 6 }}>
                  {storySearchMatches.length === 0 ? (
                    <p style={{ fontSize: 12, color: colors.inkSoft }}>{uiLang === "en" ? "Nothing found." : "چیزی پیدا نشد."}</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p style={{ fontSize: 11, color: colors.inkSoft }}>{uiLang === "en" ? `${storySearchMatches.length} results:` : `${storySearchMatches.length} نتیجه:`}</p>
                      {storySearchMatches.map((m, idx) => (
                        <button
                          key={`${m.pi}-${m.si}-${idx}`}
                          type="button"
                          onClick={() => jumpToStorySearchMatch(m.pi, m.si)}
                          dir="auto"
                          style={{
                            textAlign: "start",
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: `1px solid ${colors.cardBorder}`,
                            backgroundColor: colors.paper,
                            color: colors.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {editingStoryText ? (
            <div style={{ marginBottom: 8, textAlign: "start" }}>
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>
                {uiLang === "en"
                  ? "Edit the text — leave a blank line between paragraphs."
                  : "متن رو ویرایش کن — برای جداکردنِ پاراگراف‌ها یه خط خالی بینشون بذار."}
              </p>
              <textarea
                value={storyEditDraft}
                onChange={(e) => setStoryEditDraft(e.target.value)}
                dir="auto"
                rows={10}
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                <button
                  onClick={applyEditedStoryText}
                  disabled={!storyEditDraft.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: colors.teal,
                    color: "white",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: !storyEditDraft.trim() ? 0.5 : 1,
                  }}
                >
                  {uiLang === "en" ? "Apply edit" : "ثبتِ ویرایش"}
                </button>
                <button
                  onClick={cancelEditingStoryText}
                  style={{
                    flex: 1,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.inkSoft,
                    background: "white",
                  }}
                >
                  {uiLang === "en" ? "Cancel" : "انصراف"}
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* انتخاب زبان‌های ترجمه از اینجا حذف شد — همون انتخاب بالای دکمه‌ی
              «بساز داستان» (قبل از ساخت) کافیه و دیگه دوباره اینجا تکرار
              نمی‌شه. فقط «نمایش ترجمه» (نحوه‌ی چیدمانش) اینجا می‌مونه. */}
          {translationLangOptions.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>{uiLang === "en" ? "Translation display:" : "نمایش ترجمه:"}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "sentence", label: uiLang === "en" ? "Sentence by sentence" : "جمله به جمله" },
                  { key: "paragraph", label: uiLang === "en" ? "Paragraph by paragraph" : "پاراگراف به پاراگراف" },
                  { key: "none", label: uiLang === "en" ? "None" : "هیچکدام" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGranularity(opt.key)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${granularity === opt.key ? colors.teal : colors.cardBorder}`,
                      backgroundColor: granularity === opt.key ? colors.teal : "white",
                      color: granularity === opt.key ? "white" : colors.ink,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {fullStoryText && (
            <StoryUserAudioBar userAudio={userAudio} storyLang={storyLang} />
          )}

          <div className="flex flex-col gap-5">
            {paragraphs.slice(0, visibleParagraphCount).map((p, pi) => {
              const paragraphText = (p.sentences || []).map((s) => s?.text || "").join(" ");
              const showTranslations = granularity !== "none" && translationLangs.length > 0;
              return (
                <div key={pi} style={{ borderBottom: pi < paragraphs.length - 1 ? `1px dashed ${colors.cardBorder}` : "none", paddingBottom: 14 }}>
                  {granularity === "sentence" ? (
                    <div className="flex flex-col gap-3">
                      {(p.sentences || []).map((s, si) => {
                        // فعال بودنِ این جمله — یا چون همین الان با «پخشِ کل
                        // داستان» داره خونده می‌شه، یا چون تازه از یه
                        // لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش شده (هایلایتِ
                        // موقتِ ۲.۴ ثانیه‌ای).
                        const isSentenceActive =
                          (highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi && userAudio.activeSentence.si === si)
                            : (activeStorySentence && activeStorySentence.pi === pi && activeStorySentence.si === si));
                        return (
                        <div
                          key={si}
                          ref={(el) => (sentenceElsRef.current[`${pi}-${si}`] = el)}
                          style={{ position: "relative", paddingInlineStart: 10 }}
                        >
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={s.text}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                              sentenceBoundaries={storySentenceBoundaries}
                              onOverrideClick={
                                playbackMode === "user" && userAudio.hasAudio
                                  ? () => jumpToLineInUserAudio(pi, si, sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0)
                                  : undefined
                              }
                              neuralId={`story:${storyLang}::${s.text}`}
                              neuralLabel="جمله"
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                // برخی فونت‌های سریف بارگذاری‌شده (مثل Lora) وزن ۸۰۰/۹۰۰ واقعی
                                // ندارن و مرورگر بی‌سروصدا همون رگولار رو نشون می‌ده؛ این
                                // text-stroke تضمین می‌کنه متن اصلیِ داستان همیشه پررنگ دیده
                                // بشه، صرف‌نظر از اینکه فونت خودش وزن سنگین داره یا نه.
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              {/* هایلایتِ «جمله به جمله» — دقیقاً همون جلوه‌ی
                                  دموی مرجع: یه هایلایتِ کِشیده و تنگ دورِ خودِ
                                  متن (نه یه باکسِ تمام‌عرض)، با
                                  box-decoration-break: clone که اگه جمله چند
                                  خط بشه، هر خط هایلایتِ گردشده‌ی خودش رو
                                  می‌گیره — مو‌به‌مو مثلِ تصویرِ مرجع. */}
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isSentenceActive),
                                  borderRadius: 5,
                                  padding: "2px 4px",
                                  margin: "0 -4px",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.55s ease-in-out",
                                }}
                              >
                                <ClickableSentence
                                  text={s.text}
                                  langCode={storyLang}
                                  nativeLang={nativeLang}
                                  nativeLabel={nativeLabel}
                                  aiSettings={aiSettings}
                                  color={mainTextColor}
                                  fontWeight={900}
                                  storyBaseOffset={sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0}
                                  onSpeakOffset={(localEnd) => reportStoryWordSpoken(sentenceOffsetMap[`${pi}-${si}`]?.start ?? 0, localEnd)}
                                  originExtra={{ storyId: currentStoryId, pi, si }}
                                />
                              </span>
                            </p>
                          </div>
                          {showTranslations &&
                            orderedTranslationLangs.map((code) => {
                              const translated = s.t?.[code];
                              // فعال بودنِ همین جمله‌ی ترجمه — یا چون همین الان
                              // دقیقاً همین زبان/جمله در حالِ پخشِ «کلِ ترجمه»ست، یا
                              // چون تازه از یه لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش
                              // شده (همون highlightSentenceِ موقتی که متنِ اصلی
                              // بالا هم باهاش هایلایت می‌شه) — قبلاً این‌جا فقط
                              // activeTranslation چک می‌شد، پس موقعِ پرش از یه
                              // داستانِ ذخیره‌شده، متنِ اصلی هایلایت/اسکرول می‌شد ولی
                              // ترجمه‌ی کنارش نه.
                              const isTranslationSentenceActive =
                                (highlightSentence && highlightSentence.pi === pi && highlightSentence.si === si) ||
                                (activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi && activeTranslation.si === si);
                              const fullTranslated = fullTranslatedTextByLang[code];
                              const translatedStartOffset = translatedSentenceOffsetMapByLang[code]?.[`${pi}-${si}`]?.start ?? 0;
                              return (
                                <div
                                  key={code}
                                  className="flex items-start gap-2"
                                  style={{
                                    marginTop: 3,
                                    // 🐛 قبلاً این div اصلاً dir نداشت، پس جهتش از صفحه (که
                                    // برای این اپ rtl ـه) به ارث می‌رسید — یعنی توی یه
                                    // ردیفِ rtl، فرزندِ اول (متن) سمتِ راست می‌شینه و فرزندِ
                                    // دوم (گروهِ دکمه‌ها) سمتِ چپ، دقیقاً برعکسِ چیزی که
                                    // می‌خواستیم. با ثابت‌کردنِ جهتِ خودِ این ردیف رویِ ltr
                                    // (مستقل از جهتِ صفحه یا زبونِ ترجمه)، فرزندِ آخر
                                    // (گروهِ بلندگو+رفرش) همیشه سمتِ راستِ خط می‌مونه —
                                    // برایِ هر زبونی، چه صفحه rtl باشه چه ltr.
                                    direction: "ltr",
                                  }}
                                >
                                  <p
                                    dir={dirFor(code)}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      fontSize: 13.5,
                                      color: translationColor,
                                      fontWeight: 900,
                                      textAlign: "justify",
                                      fontFamily: code === "fa" ? fontFa : fontLatin,
                                    }}
                                  >
                                    <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                    {translated ? (
                                      <span
                                        style={{
                                          backgroundColor: highlightBg(highlightColor, isTranslationSentenceActive),
                                          borderRadius: 5,
                                          padding: isTranslationSentenceActive ? "2px 4px" : "2px 0",
                                          WebkitBoxDecorationBreak: "clone",
                                          boxDecorationBreak: "clone",
                                          transition: "background-color 0.55s ease-in-out",
                                        }}
                                      >
                                        <ClickableSentence
                                          text={translated}
                                          langCode={code}
                                          nativeLang={nativeLang}
                                          nativeLabel={nativeLabel}
                                          aiSettings={aiSettings}
                                          color={translationColor}
                                          fontFamily={code === "fa" ? fontFa : fontLatin}
                                          alignSourceText={s.text}
                                          alignSourceLang={storyLang}
                                          storyBaseOffset={translatedStartOffset}
                                          originExtra={{ storyId: currentStoryId, pi, si }}
                                        />
                                      </span>
                                    ) : (
                                      <span style={{ color: colors.inkSoft, opacity: 0.7 }}>{uiLang === "en" ? "(translating...)" : "(در حال ترجمه...)"}</span>
                                    )}
                                  </p>
                                  {/* هر دو دکمه (بلندگو + رفرش) همیشه توی یه گروهِ ثابت،
                                      آخرین فرزندِ ردیف (بعد از خودِ متن) قرار می‌گیرن —
                                      کاملاً مستقل از dir/جهتِ زبونِ ترجمه (که فقط رویِ خودِ
                                      <p> بالا اثر می‌ذاره، نه رویِ چیدمانِ این ردیف). قبلاً
                                      این دو دکمه با ترفندِ order+dir رویِ کلِ ردیف جابه‌جا
                                      می‌شدن که برایِ زبون‌هایِ rtl (مثلاً فارسی/عربی) نتیجه‌ی
                                      برعکس می‌داد — دکمه‌ها از هم جدا می‌شدن یا کلاً می‌رفتن
                                      سمتِ چپ. الان چون خودِ این div هیچ dirی نداره (همیشه
                                      چیدمانِ عادی/ثابت)، این گروه همیشه دقیقاً سمتِ راستِ
                                      خط می‌مونه — برایِ هر زبونی. */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                    {translated && (
                                      <SpeakButton
                                        text={translated}
                                        code={code}
                                        color={translationColor}
                                        fullText={fullTranslated || translated}
                                        startOffset={translatedStartOffset}
                                        sentenceBoundaries={translatedSentenceBoundariesByLang[code]}
                                        neuralId={`story:${currentStoryId}:${pi}:${si}:${code}`}
                                        neuralLabel="ترجمه"
                                      />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retranslateStorySentence(pi, si, code, s.text);
                                      }}
                                      disabled={!!retranslatingSentences[`${pi}-${si}-${code}`]}
                                      title={translated ? (uiLang === "en" ? "If this translation is wrong, try again" : "اگه این ترجمه اشتباهه، دوباره امتحان کن") : (uiLang === "en" ? "Not translated — tap to retry" : "ترجمه نشده — برای امتحانِ دوباره بزن")}
                                      aria-label={uiLang === "en" ? "Retranslate" : "ترجمه‌ی دوباره"}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: 4,
                                        flexShrink: 0,
                                        cursor: retranslatingSentences[`${pi}-${si}-${code}`] ? "default" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {retranslatingSentences[`${pi}-${si}-${code}`] ? (
                                        <Loader2 size={12} className="spin" color={translationColor} />
                                      ) : (
                                        <RotateCcw size={12} color={translationColor} style={{ opacity: translated ? 0.6 : 1 }} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      ref={(el) => (paragraphElsRef.current[pi] = el)}
                      style={{ position: "relative", paddingInlineStart: 10 }}
                    >
                      {(() => {
                        const isParaActive =
                          (highlightSentence && highlightSentence.pi === pi) ||
                          (playbackMode === "user"
                            ? (userAudio.activeSentence && userAudio.activeSentence.pi === pi)
                            : (activeStorySentence && activeStorySentence.pi === pi));
                        return (
                          <div className="flex items-start gap-2" dir={dirFor(storyLang)}>
                            <SpeakButton
                              text={paragraphText}
                              code={storyLang}
                              color={colors.inkSoft}
                              edge={dirFor(storyLang) === "ltr" ? "end" : undefined}
                              fullText={fullStoryText}
                              startOffset={paragraphBaseOffsetMap[pi] ?? 0}
                              sentenceBoundaries={storySentenceBoundaries}
                              onOverrideClick={
                                playbackMode === "user" && userAudio.hasAudio
                                  ? () => jumpToLineInUserAudio(pi, 0, paragraphBaseOffsetMap[pi] ?? 0)
                                  : undefined
                              }
                              neuralId={`story:${storyLang}::${paragraphText}`}
                              neuralLabel="پاراگراف"
                            />
                            <p
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: RTL_LANGS.includes(storyLang) ? fontFa : fontLatin,
                                fontSize: 15,
                                lineHeight: 1.8,
                                textAlign: "justify",
                                fontWeight: 900,
                                WebkitTextStroke: `0.4px ${mainTextColor}`,
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: highlightBg(highlightColor, isParaActive),
                                  borderRadius: 5,
                                  padding: "2px 4px",
                                  margin: "0 -4px",
                                  WebkitBoxDecorationBreak: "clone",
                                  boxDecorationBreak: "clone",
                                  transition: "background-color 0.55s ease-in-out",
                                }}
                              >
                                <ClickableSentence
                                  text={paragraphText}
                                  langCode={storyLang}
                                  nativeLang={nativeLang}
                                  nativeLabel={nativeLabel}
                                  aiSettings={aiSettings}
                                  color={mainTextColor}
                                  fontWeight={900}
                                  storyBaseOffset={paragraphBaseOffsetMap[pi] ?? 0}
                                  onSpeakOffset={(localEnd) => reportStoryWordSpoken(paragraphBaseOffsetMap[pi] ?? 0, localEnd)}
                                  originExtra={{ storyId: currentStoryId, pi, si: null }}
                                />
                              </span>
                            </p>
                          </div>
                        );
                      })()}
                      {showTranslations &&
                        orderedTranslationLangs.map((code) => {
                          const sentencesList = p.sentences || [];
                          const translated = sentencesList.length && sentencesList.every((s) => s?.t?.[code])
                            ? sentencesList.map((s) => s.t[code]).join(" ")
                            : null;
                          // فعال بودنِ این پاراگرافِ ترجمه — یا چون همین الان
                          // دقیقاً همین زبان/پاراگراف در حالِ پخشِ «کلِ ترجمه»ست، یا
                          // چون تازه از یه لانگ‌پرسِ «لغات ذخیره‌شده» بهش پرش شده
                          // (همون highlightSentenceِ موقتی که متنِ اصلی/isParaActive
                          // بالا هم باهاش هایلایت می‌شه).
                          const isTranslationParaActive =
                            (highlightSentence && highlightSentence.pi === pi) ||
                            (activeTranslation && activeTranslation.code === code && activeTranslation.pi === pi);
                          const fullTranslated = fullTranslatedTextByLang[code];
                          const translatedStartOffset = translatedParagraphBaseOffsetMapByLang[code]?.[pi] ?? 0;
                          return (
                            <div
                              key={code}
                              className="flex items-start gap-2"
                              style={{ marginTop: 4, direction: "ltr" }}
                            >
                              <p
                                dir={dirFor(code)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 13.5,
                                  color: translationColor,
                                  fontWeight: 900,
                                  textAlign: "justify",
                                  fontFamily: code === "fa" ? fontFa : fontLatin,
                                }}
                              >
                                <span style={{ fontSize: 10, color: colors.gold }}>[{code}]</span>{" "}
                                {translated ? (
                                  <span
                                    style={{
                                      backgroundColor: highlightBg(highlightColor, isTranslationParaActive),
                                      borderRadius: 5,
                                      padding: isTranslationParaActive ? "2px 4px" : "2px 0",
                                      WebkitBoxDecorationBreak: "clone",
                                      boxDecorationBreak: "clone",
                                      transition: "background-color 0.55s ease-in-out",
                                    }}
                                  >
                                    <ClickableSentence
                                      text={translated}
                                      langCode={code}
                                      nativeLang={nativeLang}
                                      nativeLabel={nativeLabel}
                                      aiSettings={aiSettings}
                                      color={translationColor}
                                      fontFamily={code === "fa" ? fontFa : fontLatin}
                                      alignSourceText={paragraphText}
                                      alignSourceLang={storyLang}
                                      storyBaseOffset={translatedStartOffset}
                                      originExtra={{ storyId: currentStoryId, pi, si: null }}
                                    />
                                  </span>
                                ) : (
                                  <span style={{ color: colors.inkSoft, opacity: 0.7 }}>{uiLang === "en" ? "(translating...)" : "(در حال ترجمه...)"}</span>
                                )}
                              </p>
                              {/* هر دو دکمه (بلندگو + رفرش) توی یه گروهِ ثابت، همیشه آخرین
                                  فرزندِ ردیف — مستقل از dir/جهتِ زبونِ ترجمه (طبقِ همون
                                  توضیحِ نسخه‌ی جمله‌به‌جمله‌یِ بالاتر). */}
                              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                {translated && (
                                  <SpeakButton
                                    text={translated}
                                    code={code}
                                    color={translationColor}
                                    fullText={fullTranslated || translated}
                                    startOffset={translatedStartOffset}
                                    sentenceBoundaries={translatedSentenceBoundariesByLang[code]}
                                    neuralId={`story:${currentStoryId}:${pi}:p:${code}`}
                                    neuralLabel="ترجمه"
                                  />
                                )}
                                {translated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      retranslateStoryParagraph(pi, code);
                                    }}
                                    disabled={!!retranslatingSentences[`${pi}-all-${code}`]}
                                    title={uiLang === "en" ? "If this translation is wrong, try again" : "اگه این ترجمه اشتباهه، دوباره امتحان کن"}
                                    aria-label={uiLang === "en" ? "Retranslate" : "ترجمه‌ی دوباره"}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 4,
                                      flexShrink: 0,
                                      cursor: retranslatingSentences[`${pi}-all-${code}`] ? "default" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {retranslatingSentences[`${pi}-all-${code}`] ? (
                                      <Loader2 size={12} className="spin" color={translationColor} />
                                    ) : (
                                      <RotateCcw size={12} color={translationColor} style={{ opacity: 0.6 }} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {visibleParagraphCount < paragraphs.length && (
            <button
              type="button"
              onClick={() => setVisibleParagraphCount((n) => n + PARAGRAPH_PAGE_SIZE)}
              className="flex items-center justify-center gap-2"
              style={{
                width: "100%",
                marginTop: 10,
                border: `1px dashed ${colors.cardBorder}`,
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: 13,
                color: colors.teal,
              }}
            >
              {uiLang === "en"
                ? `Show more (${paragraphs.length - visibleParagraphCount} more paragraphs)`
                : `نمایش بیشتر (${paragraphs.length - visibleParagraphCount} پاراگرافِ دیگه)`}
            </button>
          )}

          <div className="flex flex-wrap gap-2 mt-4" style={{ borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 10 }}>
            {selectedWords.map((w) => (
              <span key={w} style={{ fontSize: 11, color: colors.inkSoft, backgroundColor: colors.paper, borderRadius: 10, padding: "3px 8px" }}>
                {w}: {countOccurrences(fullStoryText, w)} {uiLang === "en" ? "times" : "بار"}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14, borderTop: `1px dashed ${colors.cardBorder}`, paddingTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, marginBottom: 6 }}>
              {uiLang === "en" ? "My notes about this story" : "یادداشتِ من دربارهٔ این داستان"}
            </p>
            <textarea
              value={storyNote}
              onChange={(e) => setStoryNote(e.target.value)}
              dir="auto"
              rows={5}
              placeholder={uiLang === "en" ? "Write anything you want about this story — no word limit…" : "هرچی می‌خوای دربارهٔ این داستان یادداشت کن — بدونِ محدودیتِ تعدادِ کلمه…"}
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                minHeight: 90,
              }}
            />
          </div>
          </>
          )}
        </div>
  );
}
