// جعبه‌ی مرور
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import { colors, fontFa, fontLatin, mainTextColor, translationColor } from "../ui/theme.js";
import { translateFree } from "../translate/translateService.js";
import { fillLeitnerCustomWordTranslation } from "../leitner/leitnerCustomWords.js";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelBadge, LevelFilterChips } from "./levels/LevelControls.jsx";
import { NativeTextResolver } from "./PhrasebookMain.jsx";

// ---------------------------------------------------------------------------
// Leitner review box
// ---------------------------------------------------------------------------
export function ReviewBox({ conversation , boxes, setBoxes, nativeLang, targetLangs, index, setIndex, showAnswer, setShowAnswer, uiLang, aiSettings }) {
  // همون رفعِ باگِ زبانِ مادریِ خالی: قبلاً `current.t[nativeLang]` مستقیم
  // نمایش داده می‌شد و برایِ زبان‌هایی که VOCAB ازشون ترجمه‌ی ثابت نداشت،
  // روییِ کارتِ فلش‌کارت هیچی نشون داده نمی‌شد.
  const [liveNativeText, setLiveNativeText] = useState({});
  const reportNativeText = useCallback((key, value) => {
    setLiveNativeText((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);
  const getNativeText = useCallback(
    (p) => (p ? p.t[nativeLang] || liveNativeText[`${nativeLang}:${p.id}`] || "" : ""),
    [nativeLang, liveNativeText]
  );
  // نکته‌ی مهمِ رفعِ باگ: boxes[p.id] برای عبارتی که هنوز اصلاً مرور نشده
  // undefined هست، و «undefined < 5» توی جاوااسکریپت به‌جای true، false
  // برمی‌گرده (چون undefined به NaN تبدیل می‌شه و هر مقایسه‌ای با NaN
  // false هست) — یعنی عبارت‌های مرورنشده به‌جای «باید مرور بشن»، اشتباهاً
  // «قبلاً بلدشون بودی» حساب می‌شدن و جعبه همیشه خالی/تمام‌شده نشون
  // می‌داد. با ?? 1 (یعنی جعبه‌ی اول = هنوز مرورنشده) این مشکل حل می‌شه.
  const [levelFilter, setLevelFilter] = useState("all");
  // سطح‌بندی برای مرور: هر آیتم بر اساسِ جعبه‌ش (۱ تا ۵) دسته‌بندی می‌شه —
  // پیش‌فرض همه‌ی سطح‌ها با هم، ولی از سطحِ پایین (تازه/ضعیف) به بالا
  // (مسلط‌تر) مرتب می‌شن تا لغاتی که بیشتر نیاز به مرور دارن زودتر بیان.
  // کاربر هم می‌تونه با چیپ‌های پایین، فقط رویِ یه سطحِ خاص تمرکز کنه.
  const withLevel = conversation .map((p) => ({ p, lvl: boxes[p.id] ?? 1 }));
  const dueAll = withLevel.filter((x) => x.lvl < 5);
  const levelCounts = [1, 2, 3, 4].map((lvl) => dueAll.filter((x) => x.lvl === lvl).length);
  const filtered = levelFilter === "all" ? dueAll : dueAll.filter((x) => x.lvl === levelFilter);
  const active = filtered.sort((a, b) => a.lvl - b.lvl).map((x) => x.p);
  const current = active.length ? active[index % active.length] : null;

  // لغاتِ سفارشیِ لایتنر (که با «افزودن به جعبه‌ی لایتنر» از پاپ‌آپِ لغت
  // اضافه می‌شن) موقعِ افزوده‌شدن فقط ترجمه‌ی همون یه زبونِ مقصدی که اون
  // لحظه باز بوده رو دارن — نه همه‌ی زبون‌های فعال (targetLangs). این‌جا،
  // وقتی کاربر جوابِ کارت رو باز می‌کنه، برای هر زبونِ مقصدِ فعالی که هنوز
  // ترجمه نداره، جدا از خودِ لغت (t[current.langCode]) با translateFree
  // ترجمه می‌گیریم و با fillLeitnerCustomWordTranslation روی همون رکورد
  // پرش می‌کنیم — یعنی این تب هم مثلِ بقیه‌ی جاهای اپ «مولتی‌ترجمه» می‌شه،
  // نه فقط تک‌ترجمه. pendingRef جلویِ درخواستِ تکراری برای یه (لغت،زبون)ِ
  // در حالِ انتظار رو می‌گیره.
  const pendingLeitnerTranslationsRef = useRef(new Set());
  useEffect(() => {
    if (!showAnswer || !current || !current.langCode) return;
    const sourceWord = current.t[current.langCode];
    if (!sourceWord) return;
    (targetLangs || []).forEach((l) => {
      if (l.code === current.langCode || current.t[l.code]) return;
      const key = `${current.id}:${l.code}`;
      if (pendingLeitnerTranslationsRef.current.has(key)) return;
      pendingLeitnerTranslationsRef.current.add(key);
      translateFree(sourceWord, l.code, current.langCode)
        .then((text) => {
          if (text) fillLeitnerCustomWordTranslation(current.id, l.code, text);
        })
        .catch(() => {})
        .finally(() => pendingLeitnerTranslationsRef.current.delete(key));
    });
  }, [showAnswer, current, targetLangs]);

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 mt-6">
        {levelFilter !== "all" && (
          <LevelFilterChips levelFilter={levelFilter} setLevelFilter={setLevelFilter} levelCounts={levelCounts} uiLang={uiLang} />
        )}
        <p style={{ textAlign: "center", color: colors.teal, marginTop: 20, fontWeight: 600 }}>
          {levelFilter === "all"
            ? (uiLang === "en" ? "You know all the phrases! 🎉" : "همه‌ی عبارات رو بلدی! 🎉")
            : (uiLang === "en" ? "Nothing left to review at this level! 🎉" : "چیزی تو این سطح برای مرور نمونده! 🎉")}
        </p>
      </div>
    );
  }
  const currentLevel = boxes[current.id] ?? 1;

  const handle = (knew) => {
    setBoxes((prev) => ({
      ...prev,
      // همینجا هم همون مشکل بود: prev[current.id] برای اولین مرور
      // undefined بود و undefined + 1 می‌شد NaN — با ?? 1 درست می‌شه.
      [current.id]: knew ? Math.min(5, (prev[current.id] ?? 1) + 1) : 1,
    }));
    setShowAnswer(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <LevelFilterChips levelFilter={levelFilter} setLevelFilter={setLevelFilter} levelCounts={levelCounts} uiLang={uiLang} />
      <p style={{ fontSize: 12, color: colors.inkSoft }}>
        {uiLang === "en" ? (
          <>Left to review: {active.length}{" · "}Box {currentLevel} of 5</>
        ) : (
          <>باقی‌مانده برای مرور: {active.length}{" · "}جعبه‌ی {currentLevel} از ۵</>
        )}
      </p>
      <div
        className="w-full max-w-sm rounded-xl p-8 text-center"
        style={{ backgroundColor: "white", border: `2px solid ${colors.gold}`, minHeight: 140 }}
      >
        <div onClick={() => setShowAnswer((s) => !s)} style={{ cursor: "pointer" }}>
          <div className="flex items-center justify-center gap-2">
            <p style={{ fontWeight: 800, fontSize: 18, color: mainTextColor }}>{getNativeText(current)}</p>
            <SpeakButton text={getNativeText(current)} code={nativeLang} neuralId={`phrase:${current.id}:${nativeLang}`} neuralLabel="عبارت" />
            {current && !current.t[nativeLang] && (
              <NativeTextResolver
                resolveKey={`${nativeLang}:${current.id}`}
                sourceText={current.t.en || ""}
                nativeLang={nativeLang}
                knownText={null}
                aiSettings={aiSettings}
                onResolved={reportNativeText}
              />
            )}
            {current.level && <LevelBadge level={current.level} />}
          </div>
          {!showAnswer && (
            <p style={{ color: colors.cardBorder, fontSize: 12, marginTop: 14 }}>
              {uiLang === "en" ? "(tap to see translation)" : "(برای دیدن ترجمه لمس کن)"}
            </p>
          )}
        </div>
        {showAnswer && (
          <div className="flex flex-col gap-2" style={{ marginTop: 14 }}>
            {targetLangs.map((l) => (
              <div key={l.code} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, direction: "ltr" }}>
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
                <p style={{ fontFamily: fontLatin, color: translationColor, fontWeight: 800, fontSize: 16 }}>
                  {current.t[l.code] ?? "—"}
                </p>
                {current.t[l.code] && <SpeakButton text={current.t[l.code]} code={l.code} color={translationColor} edge="end" neuralId={`phrase:${current.id}:${l.code}`} neuralLabel="ترجمه" />}
              </div>
            ))}
          </div>
        )}
      </div>
      {showAnswer && (
        <div className="flex gap-3">
          <button
            onClick={() => handle(false)}
            className="flex items-center gap-1 px-4 py-2 rounded-full"
            style={{ backgroundColor: colors.rose, color: "white", fontFamily: uiLang === "en" ? fontLatin : fontFa }}
          >
            <X size={16} /> {uiLang === "en" ? "Didn't know it" : "بلد نبودم"}
          </button>
          <button
            onClick={() => handle(true)}
            className="flex items-center gap-1 px-4 py-2 rounded-full"
            style={{ backgroundColor: colors.teal, color: "white", fontFamily: uiLang === "en" ? fontLatin : fontFa }}
          >
            <Check size={16} /> {uiLang === "en" ? "Knew it" : "بلد بودم"}
          </button>
        </div>
      )}
    </div>
  );
}
