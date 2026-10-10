// لیست عبارات و لغات
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Star } from "lucide-react";
import { TTS_LOCALE } from "../tts/ttsConfig.js";
import { POS_FA } from "../constants/levels.js";
import { categoryLabel } from "../constants/categories.js";
import { STAR_FAVORITE_COLOR, colors, fontFa, highlightBg, mainTextColor, translationColor } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";
import { speechController, useAutoplayOnScroll } from "../speech/speechController.js";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelBadge } from "./levels/LevelControls.jsx";
import { ClickableSentence } from "./story/ClickableSentence.jsx";
import { NativeTextResolver } from "./PhrasebookMain.jsx";

// ---------------------------------------------------------------------------
// Phrase list (used for both "all conversation " and "favorites")
// ---------------------------------------------------------------------------
export const PhraseList = React.memo(function PhraseList({ conversation , nativeLang, targetLangs, favorites, toggleFavorite, emptyText, query, levelFilter, aiSettings, autoplayEnabled, onFullTextChange, autoScrollActive, highlightColor, uiLang }) {
  // ترجمه‌های زبانِ مادری که دیتایِ ثابت نداشتشون و لحظه‌ای/زنده resolve
  // شدن — کلید: `${nativeLang}:${phraseId}` (تا با عوض‌شدنِ زبانِ مادری،
  // ترجمه‌ی زبانِ قبلی به‌جایِ زبانِ جدید نمایش داده نشه).
  const [liveNativeText, setLiveNativeText] = useState({});
  const reportNativeText = useCallback((key, value) => {
    setLiveNativeText((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);
  const getNativeText = useCallback(
    (p) => p.t[nativeLang] || liveNativeText[`${nativeLang}:${p.id}`] || "",
    [nativeLang, liveNativeText]
  );
  const q = (query || "").trim().toLowerCase();
  let filtered = levelFilter && levelFilter !== "all" ? conversation .filter((p) => p.level === levelFilter) : conversation ;
  filtered = q
    ? filtered.filter((p) => {
        const nativeText = getNativeText(p).toLowerCase();
        if (nativeText.includes(q)) return true;
        return targetLangs.some((l) => (p.t[l.code] || "").toLowerCase().includes(q));
      })
    : filtered;

  const firstTargetCode = targetLangs[0]?.code;
  const autoplayItems = filtered.map((p) => ({ id: p.id, text: firstTargetCode ? p.t[firstTargetCode] : "", code: firstTargetCode }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  // «خواندنِ کل لیست» + هایلایتِ عبارتِ در حالِ پخش — دقیقاً همون الگویی
  // که مکالمات روزمره (ConversationBox) و لیستِ لغات (WordList) دارن،
  // اینجا هم برای لیستِ عبارت‌های علاقه‌مندی. متنِ خونده‌شده‌ی پیش‌فرضِ
  // نوارِ پلیر همون زبانِ مقصدِ اولِ کاربره (firstTargetCode).
  //
  // طبق درخواستِ جدید، این دیگه فقط مخصوصِ firstTargetCode نیست: برای
  // *هر* زبانِ ترجمه‌ی انتخاب‌شده (targetLangs) جدا جدا یه fullText/آفست
  // ساخته می‌شه، تا زدنِ بلندگوی هر خطِ ترجمه (به هر زبونی)، دقیقاً از
  // همون‌جا وارد پخشِ پیوسته‌ی همون زبان بشه و خودکار جلو بره — نه فقط
  // یه پخشِ تکیِ ایزوله.
  const fullText = firstTargetCode ? filtered.map((p) => p.t[firstTargetCode] || "").join(" ") : "";

  const translationInfo = useMemo(() => {
    const info = {};
    targetLangs.forEach((l) => {
      let offset = 0;
      const parts = [];
      const offsets = [];
      filtered.forEach((p) => {
        const val = p.t[l.code];
        if (!val) return;
        const start = offset;
        parts.push(val);
        offset += val.length + 1; // فاصله‌ی join(" ")
        offsets.push({ id: p.id, start, end: start + val.length });
      });
      info[l.code] = { fullText: parts.join(" "), offsets };
    });
    return info;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, targetLangs]);

  // همون fullText/آفستِ بالا، اما برایِ خودِ متنِ اصلی (زبانِ مادری) —
  // قبلاً فقط برایِ ترجمه‌ها (targetLangs) ساخته می‌شد، پس زدنِ 🔊ِ متنِ
  // اصلی نه هایلایت می‌شد نه از همون‌جا به بقیه‌ی لیست ادامه می‌داد. این‌جا
  // دقیقاً همون الگو برایِ nativeLang تکرار می‌شه.
  const nativeInfo = useMemo(() => {
    let offset = 0;
    const parts = [];
    const offsets = [];
    filtered.forEach((p) => {
      const val = getNativeText(p);
      if (!val) return;
      const start = offset;
      parts.push(val);
      offset += val.length + 1;
      offsets.push({ id: p.id, start, end: start + val.length });
    });
    return { fullText: parts.join(" "), offsets };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, nativeLang, liveNativeText]);

  useEffect(() => {
    if (onFullTextChange) onFullTextChange({ text: fullText, code: firstTargetCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);
  useEffect(() => {
    return () => {
      if (onFullTextChange) onFullTextChange({ text: "", code: "" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // خط/زبانی که همین الان در حالِ پخشه — {code, id} | null. جایگزینِ
  // activePhraseIdِ قبلی (که فقط firstTargetCode رو می‌شناخت) — حالا با
  // چک‌کردنِ کلیدِ speechController رویِ fullTextِ *همه‌ی* زبان‌های هدف،
  // هر کدوم که در حالِ پخش باشه رو (چه از پلیرِ پایین، چه با کلیک روی
  // بلندگوی یه خطِ خاص) پیدا می‌کنه.
  const [activeTranslation, setActiveTranslation] = useState(null);
  useEffect(() => {
    const update = (state) => {
      if (!state.key || state.status === "idle") {
        setActiveTranslation(null);
        return;
      }
      // اول خودِ متنِ اصلی (زبانِ مادری) رو چک می‌کنیم — دقیقاً همون منطقِ
      // پایینی که برایِ هر زبانِ ترجمه تکرار می‌شه.
      if (nativeInfo && nativeInfo.fullText) {
        const nativeKey = `${TTS_LOCALE[nativeLang] || "en-US"}::${nativeInfo.fullText}`;
        if (state.key === nativeKey) {
          const offset = speechController.getCharOffset();
          let found = nativeInfo.offsets[0] || null;
          for (const p of nativeInfo.offsets) {
            if (offset >= p.start) found = p;
            else break;
          }
          setActiveTranslation((prev) => {
            if (prev && prev.code === nativeLang && found && prev.id === found.id) return prev;
            return found ? { code: nativeLang, id: found.id } : null;
          });
          return;
        }
      }
      for (const l of targetLangs) {
        const info = translationInfo[l.code];
        if (!info || !info.fullText) continue;
        const myKey = `${TTS_LOCALE[l.code] || "en-US"}::${info.fullText}`;
        if (state.key !== myKey) continue;
        const offset = speechController.getCharOffset();
        let found = info.offsets[0] || null;
        for (const p of info.offsets) {
          if (offset >= p.start) found = p;
          else break;
        }
        setActiveTranslation((prev) => {
          if (prev && prev.code === l.code && found && prev.id === found.id) return prev;
          return found ? { code: l.code, id: found.id } : null;
        });
        return;
      }
      setActiveTranslation(null);
    };
    update(speechController.getState());
    return speechController.subscribe(update);
  }, [targetLangs, translationInfo, nativeInfo, nativeLang]);
  const activePhraseId = activeTranslation ? activeTranslation.id : null;

  const phraseNodeMapRef = useRef(new Map());
  useEffect(() => {
    if (!autoScrollActive || activePhraseId == null) return;
    const node = phraseNodeMapRef.current.get(String(activePhraseId));
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScrollActive, activePhraseId]);
  const registerPhraseRef = (id) => (node) => {
    const key = String(id);
    if (node) phraseNodeMapRef.current.set(key, node);
    else phraseNodeMapRef.current.delete(key);
  };

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        {q ? tr("noPhrasesForSearch", uiLang) : emptyText || tr("noPhrasesToShow", uiLang)}
      </p>
    );
  }

  const grouped = filtered.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 style={{ color: colors.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            {categoryLabel(cat, uiLang)}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((p) => (
              <div
                key={p.id}
                ref={(el) => {
                  registerRef(p.id)(el);
                  registerPhraseRef(p.id)(el);
                }}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  backgroundColor: highlightBg(highlightColor, activePhraseId === p.id, "white"),
                  border: `1px solid ${colors.cardBorder}`,
                  transition: "background-color 0.55s ease-in-out",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2" style={{ direction: "ltr" }}>
                    {p.level && <LevelBadge level={p.level} />}
                    <p
                      style={{
                        flex: 1,
                        fontWeight: 800,
                        fontSize: 15,
                        color: mainTextColor,
                        backgroundColor: highlightBg(highlightColor, activeTranslation && activeTranslation.code === nativeLang && activeTranslation.id === p.id),
                        borderRadius: 5,
                        padding: activeTranslation && activeTranslation.code === nativeLang && activeTranslation.id === p.id ? "2px 4px" : "2px 0",
                        transition: "background-color 0.55s ease-in-out",
                      }}
                    >
                      {getNativeText(p)}
                    </p>
                    <SpeakButton
                      text={getNativeText(p)}
                      code={nativeLang}
                      edge="end"
                      fullText={nativeInfo.fullText}
                      startOffset={nativeInfo.offsets.find((o) => o.id === p.id)?.start}
                      neuralId={`phrase:${p.id}:${nativeLang}`}
                      neuralLabel="عبارت"
                    />
                    {!p.t[nativeLang] && (
                      <NativeTextResolver
                        resolveKey={`${nativeLang}:${p.id}`}
                        sourceText={p.t.en || ""}
                        nativeLang={nativeLang}
                        knownText={null}
                        aiSettings={aiSettings}
                        onResolved={reportNativeText}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                    {targetLangs.map((l) => {
                      const info = translationInfo[l.code];
                      const myOffset = info && info.offsets.find((o) => o.id === p.id);
                      const isTransActive = activeTranslation && activeTranslation.code === l.code && activeTranslation.id === p.id;
                      return (
                      <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
                        <span
                          style={{
                            fontFamily: fontFa,
                            fontSize: 10,
                            fontWeight: 700,
                            color: colors.gold,
                            border: `1px solid ${colors.goldSoft}`,
                            borderRadius: 6,
                            padding: "1px 5px",
                            flexShrink: 0,
                          }}
                        >
                          {l.abbr}
                        </span>
                        <p
                          style={{
                            flex: 1,
                            fontWeight: 800,
                            color: translationColor,
                            backgroundColor: highlightBg(highlightColor, isTransActive),
                            borderRadius: 5,
                            padding: isTransActive ? "2px 4px" : "2px 0",
                            transition: "background-color 0.55s ease-in-out",
                          }}
                        >
                          {p.t[l.code] ? (
                            <ClickableSentence
                              text={p.t[l.code]}
                              langCode={l.code}
                              nativeLang={nativeLang}
                              aiSettings={aiSettings}
                              color={translationColor}
                            />
                          ) : (
                            "—"
                          )}
                        </p>
                        {p.t[l.code] && (
                          <SpeakButton
                            text={p.t[l.code]}
                            code={l.code}
                            color={translationColor}
                            edge="end"
                            fullText={info ? info.fullText : undefined}
                            startOffset={myOffset ? myOffset.start : undefined}
                            neuralId={`phrase:${p.id}:${l.code}`}
                            neuralLabel="ترجمه"
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => toggleFavorite(p.id)} aria-label={tr("addToFavoritesAria", uiLang)} style={{ marginRight: 4 }}>
                  <Star
                    size={20}
                    color={STAR_FAVORITE_COLOR}
                    fill={favorites.has(p.id) ? STAR_FAVORITE_COLOR : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
// ---------------------------------------------------------------------------
// Vocabulary & news words — click a word to reveal meaning + part of speech
// ---------------------------------------------------------------------------
const VocabList = React.memo(function VocabList({ words, nativeLang, targetLangs, levelFilter, aiSettings, autoplayEnabled }) {
  const [openIds, setOpenIds] = useState(new Set());
  // همون رفعِ باگِ «زبانِ مادریِ بیرون از دیتای ثابت خالی می‌مونه» که برایِ
  // PhraseList انجام شد، اینجا هم لازم بود — قبلاً فقط `w.t.fa` fallback
  // داشت (یعنی هر زبانِ مادریِ غیرِ فارسی که دیتا نداشتش، به‌جایِ ترجمه‌ی
  // خودش، فارسی نشون داده می‌شد).
  const [liveNativeText, setLiveNativeText] = useState({});
  const reportNativeText = useCallback((key, value) => {
    setLiveNativeText((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);
  const getNativeText = useCallback(
    (w) => w.t[nativeLang] || liveNativeText[`${nativeLang}:${w.id}`] || "",
    [nativeLang, liveNativeText]
  );

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = levelFilter && levelFilter !== "all" ? words.filter((w) => w.level === levelFilter) : words;
  const autoplayItems = filtered.map((w) => ({ id: w.id, text: getNativeText(w), code: nativeLang }));
  const { registerRef } = useAutoplayOnScroll(autoplayEnabled, autoplayItems);

  if (filtered.length === 0) {
    return (
      <p style={{ color: colors.inkSoft, fontSize: 14, textAlign: "center", marginTop: 40 }}>
        در این سطح لغتی نیست.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map((w) => {
        const isOpen = openIds.has(w.id);
        return (
          <div
            key={w.id}
            ref={registerRef(w.id)}
            onClick={() => toggleOpen(w.id)}
            className="p-3 rounded-lg"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p style={{ fontWeight: 800, fontSize: 16, color: mainTextColor }}>{getNativeText(w)}</p>
                <SpeakButton text={getNativeText(w)} code={nativeLang} neuralId={`word:${w.id}:${nativeLang}`} neuralLabel="لغت" />
                {!w.t[nativeLang] && (
                  <NativeTextResolver
                    resolveKey={`${nativeLang}:${w.id}`}
                    sourceText={w.t.en || ""}
                    nativeLang={nativeLang}
                    knownText={null}
                    aiSettings={aiSettings}
                    onResolved={reportNativeText}
                  />
                )}
              </div>
              <LevelBadge level={w.level} />
            </div>

            {isOpen && (
              <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${colors.cardBorder}` }}>
                <p style={{ fontSize: 12, color: colors.gold, fontWeight: 700, marginBottom: 4 }}>
                  {POS_FA[w.pos] || w.pos}
                </p>
                <p style={{ fontSize: 14, color: colors.inkSoft, marginBottom: 8 }}>{w.meaningFa}</p>
                <div className="flex flex-col gap-1">
                  {targetLangs.map((l) => (
                    <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr" }}>
                      <span
                        style={{
                          fontFamily: fontFa,
                          fontSize: 10,
                          fontWeight: 700,
                          color: colors.gold,
                          border: `1px solid ${colors.goldSoft}`,
                          borderRadius: 6,
                          padding: "1px 5px",
                          flexShrink: 0,
                        }}
                      >
                        {l.abbr}
                      </span>
                      <p style={{ flex: 1, fontWeight: 800, color: translationColor }}>
                        {w.t[l.code] ? (
                          <ClickableSentence
                            text={w.t[l.code]}
                            langCode={l.code}
                            nativeLang={nativeLang}
                            aiSettings={aiSettings}
                            color={translationColor}
                            originExtra={{ id: w.id }}
                          />
                        ) : (
                          "—"
                        )}
                      </p>
                      {w.t[l.code] && (
                        <SpeakButton
                          text={w.t[l.code]}
                          code={l.code}
                          color={translationColor}
                          edge="end"
                          neuralId={`word:${w.id}:${l.code}`}
                          neuralLabel="ترجمه"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isOpen && (
              <p style={{ color: colors.cardBorder, fontSize: 11, marginTop: 4 }}>(برای دیدن معنی لمس کن)</p>
            )}
          </div>
        );
      })}
    </div>
  );
});
