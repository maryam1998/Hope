// پنل لغات ذخیره‌شده
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef, useEffect } from "react";
import { Check, X, Search, Sparkles, Trash2, CheckSquare } from "lucide-react";
import RangeSliderFilter from "../../RangeSliderFilter.jsx";
import { LANGUAGES, dirFor, englishLangName } from "../constants/languages.js";
import { READ_DONE_BORDER, READ_DONE_CHECK_GRADIENT, READ_DONE_GRADIENT, READ_DONE_SHADOW, colors, fontFa, fontLatin } from "../ui/theme.js";
import { tr, trf } from "../ui/uiStrings.js";
import { SAVED_WORDS_SORT_OPTIONS, sortSavedWordEntries } from "../sort/sortHelpers.js";
import { translateFree } from "../translate/translateService.js";
import { normalizeWord } from "../words/wordCache.js";
import { SAVED_WORDS_CHANGED_EVENT, crossTranslateInFlight, loadSavedStoryWords, removeSavedStoryWord, updateSavedWordTranslation } from "../words/savedStoryWords.js";
import { loadReadWordIds, saveReadWordIds } from "../words/wordTranslations.js";
import { lookupSavedWordLevel } from "../words/wordLevels.js";
import { GenericSortMenu } from "./SortMenus.jsx";
import { SpeakButton } from "./player/SpeakButton.jsx";
import { LevelBadge } from "./levels/LevelControls.jsx";
import { WORDS_PAGE_SIZE } from "./WordList.jsx";

// ---------------------------------------------------------------------------
// Saved Words — a dedicated home for every word bookmarked via the word-tap
// popover's "save for next story" button, grouped by language, so they're
// easy to find later instead of only surfacing inside Story Builder.
// ---------------------------------------------------------------------------
export function SavedWordsPanel({ onJumpToStory, onJumpToOrigin, nativeLang, nativeLabel, targetOrder, uiLang }) {
  const [words, setWords] = useState([]);
  // لغاتی که کاربر توی همین صفحه علامت زده تا ببره داستان‌ساز — جدا از
  // خودِ انبار دائمی؛ فقط یه انتخاب موقتیه، نه حذف/اضافه به ذخیره‌شده‌ها.
  // همین انتخاب برای «حذف انتخاب‌شده‌ها» و «کپی در دیکشنری» هم استفاده می‌شه.
  const [picked, setPicked] = useState({}); // { [langCode]: Set(word) }
  // متن جستجو برای فیلترکردن لغات ذخیره‌شده (روی خودِ لغت یا هر کدوم از
  // معادل‌هاش) — روی «انتخاب همه» و «پاک کردن همه» هم اثر می‌ذاره، یعنی
  // فقط لغاتِ در حال نمایش رو در برمی‌گیرن.
  const [query, setQuery] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  // مرتب‌سازی — دقیقاً همون الگویِ داستان‌ساز، اینجا رویِ لغاتِ ذخیره‌شده
  // (نگاه کن به GenericSortMenu/SAVED_WORDS_SORT_OPTIONS بالای فایل).
  const [sortKey, setSortKey] = useState("newest");

  // نگه‌داشتنِ طولانی (لانگ‌پرس) روی هر کارت → کاربر رو به همون تبی می‌بره
  // که اون لغت/عبارت اونجا ذخیره شده بود (origin.tab — نگاه کن به
  // toggleSavedStoryWord/ensureSavedStoryWord). یه ref مشترکِ بینِ همه‌ی
  // کارت‌ها کافیه چون همیشه فقط یک لمس/کلیک در آنِ واحد فعاله.
  const pressStateRef = useRef({ key: null, timer: null, moved: false, startX: 0, startY: 0, fired: false });

  // توجه: touchend/mouseup فقط تایمر/موقعیت رو پاک می‌کنه، نه fired رو —
  // چون fired باید تا لحظه‌ی رسیدنِ رویدادِ click (که درست بعد از
  // touchend شلیک می‌شه) زنده بمونه تا handleCardClickCapture بتونه
  // جلوش رو بگیره (دقیقاً همون الگویی که برای پلیرِ پایینِ صفحه هست).
  const clearPress = () => {
    if (pressStateRef.current.timer) clearTimeout(pressStateRef.current.timer);
    pressStateRef.current = { ...pressStateRef.current, key: null, timer: null, moved: false, startX: 0, startY: 0 };
  };

  const jumpToOrigin = (entry) => {
    if (!onJumpToOrigin) return;
    const ok = onJumpToOrigin(entry);
    setActionMsg(
      ok
        ? trf("jumpedToOriginMsg", uiLang, { word: entry.word })
        : tr("jumpToOriginUnknownMsg", uiLang)
    );
  };

  const beginPress = (key, clientX, clientY, entry, target) => {
    // فقط اگه لمس/کلیک روی دکمه‌ی پخشِ صدا یا دکمه‌ی حذف (که با
    // data-jump-exclude مشخص شدن) شروع شده باشه، لانگ‌پرس غیرفعال می‌مونه —
    // خودِ دکمه‌ی لغت دیگه مستثنا نیست، چون دقیقاً همون‌جاست که کاربر
    // طبیعتاً انگشتش رو نگه می‌داره تا به منبعِ لغت بره.
    if (target && target.closest && target.closest("[data-jump-exclude]")) return;
    clearPress();
    pressStateRef.current = {
      key,
      startX: clientX,
      startY: clientY,
      moved: false,
      fired: false,
      timer: setTimeout(() => {
        if (pressStateRef.current.key === key && !pressStateRef.current.moved) {
          pressStateRef.current.fired = true;
          jumpToOrigin(entry);
        }
      }, 550),
    };
  };

  // بعد از یه لانگ‌پرسِ موفق (که به تبِ مبدأ پرید)، کلیکِ طبیعی‌ای که
  // مرورگر بلافاصله بعدِ touchend روی همون دکمه‌ی لغت شلیک می‌کنه رو خنثی
  // می‌کنیم — وگرنه همون لغت هم‌زمان «انتخاب» (برای داستان‌ساز) می‌شد.
  const handleCardClickCapture = (ev) => {
    if (pressStateRef.current.fired) {
      ev.preventDefault();
      ev.stopPropagation();
      pressStateRef.current.fired = false;
    }
  };

  const movePress = (clientX, clientY) => {
    const st = pressStateRef.current;
    if (!st.key) return;
    if (Math.abs(clientX - st.startX) > 10 || Math.abs(clientY - st.startY) > 10) {
      st.moved = true;
      if (st.timer) clearTimeout(st.timer);
    }
  };

  useEffect(() => {
    const refresh = () => setWords(loadSavedStoryWords());
    refresh();
    window.addEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORDS_CHANGED_EVENT, refresh);
  }, []);

  // زبان‌هایی که باید معادل هر لغت رو نشون بدیم: زبان مادری + هر زبان
  // مقصدی که کاربر بالای صفحه انتخاب کرده. اگه کاربر یه زبان مقصد تازه
  // اضافه کنه، همین‌جا هم خودکار معادلش برای همه‌ی لغات ذخیره‌شده می‌آد.
  const relevantLangs = Array.from(new Set([nativeLang, ...(targetOrder || [])])).filter(Boolean);

  // هر لغتی که هنوز ترجمه‌اش به یکی از این زبون‌ها ذخیره نشده (مثلاً چون از
  // داستان‌ساز اضافه شده، نه از پاپ‌آپ لغت، یا چون کاربر تازه یه زبون مقصد
  // جدید اضافه کرده)، همین‌جا در پس‌زمینه ترجمه و کش می‌شه تا زیر همون کلمه
  // نشون داده بشه.
  useEffect(() => {
    if (!relevantLangs.length) return;
    words.forEach((e) => {
      relevantLangs.forEach((toLang) => {
        if (toLang === e.langCode) return;
        if (e.translations && e.translations[toLang]) return;
        const fetchKey = `${e.langCode}:${normalizeWord(e.word)}:${toLang}`;
        if (crossTranslateInFlight.has(fetchKey)) return;
        crossTranslateInFlight.add(fetchKey);
        translateFree(e.word, toLang, e.langCode)
          .then((result) => {
            if (result && normalizeWord(result) !== normalizeWord(e.word)) {
              updateSavedWordTranslation(e.word, e.langCode, toLang, result);
            }
          })
          .catch(() => {})
          .finally(() => crossTranslateInFlight.delete(fetchKey));
      });
    });
  }, [words, relevantLangs.join(",")]);

  const togglePick = (code, word) => {
    setPicked((prev) => {
      const set = new Set(prev[code] || []);
      if (set.has(word)) set.delete(word);
      else set.add(word);
      return { ...prev, [code]: set };
    });
  };

  // -----------------------------------------------------------------------
  // بازه‌ی نمایش («از # تا #») + ردیابیِ خوانده‌شده — دقیقاً همون الگویی که
  // WordList برای لغات/واژگان/اسلنگ/علاقه‌مندی‌ها داره، اینجا هم به‌ازای هر
  // زبان (چون لیستِ هر زبان جدا رندر می‌شه). چون خودِ کلمه بینِ زبون‌های
  // مختلف ممکنه تکراری باشه، id رو با کدِ زبان ترکیب می‌کنیم؛ همه‌ی زبون‌ها
  // زیرِ یه listId مشترک («savedWords») ذخیره می‌شن، چون یه انبارِ واحده،
  // نه چند تبِ جدا.
  const SAVED_WORDS_LIST_ID = "savedWords";
  const [readIds, setReadIds] = useState(() => loadReadWordIds(SAVED_WORDS_LIST_ID));
  const savedWordReadId = (code, word) => `${code}::${word}`;
  const toggleSavedWordRead = (code, word) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      const id = savedWordReadId(code, word);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReadWordIds(SAVED_WORDS_LIST_ID, next);
      return next;
    });
  };
  const markSavedRangeRead = (code, items, read) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((e) => {
        const id = savedWordReadId(code, e.word);
        if (read) next.add(id);
        else next.delete(id);
      });
      saveReadWordIds(SAVED_WORDS_LIST_ID, next);
      return next;
    });
  };
  // ورودی‌های بازه به‌ازای هر زبان جدا نگه داشته می‌شن (رشته، نه عدد — به
  // همون دلیلی که WordList توضیح داده: تایپ‌کردن نباید فوراً به بازه‌ی
  // پیش‌فرض برگرده).
  const [savedRangeInputs, setSavedRangeInputs] = useState({});
  const getSavedRange = (code, total) => {
    const cur = savedRangeInputs[code] || {};
    const defaultTo = Math.min(total, WORDS_PAGE_SIZE) || total || 1;
    const parsedFrom = parseInt(cur.from, 10);
    const parsedTo = parseInt(cur.to, 10);
    const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
    const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
    const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(total, 1));
    const clampedTo = Math.min(Math.max(clampedFrom, effTo), total || clampedFrom);
    return { fromInput: cur.from ?? "", toInput: cur.to ?? "", defaultTo, clampedFrom, clampedTo };
  };
  const setSavedRangeInput = (code, field, value) => {
    setSavedRangeInputs((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (e) => {
    if (!normalizedQuery) return true;
    if ((e.word || "").toLowerCase().includes(normalizedQuery)) return true;
    if (e.translations) {
      return Object.values(e.translations).some((t) => (t || "").toLowerCase().includes(normalizedQuery));
    }
    return false;
  };
  // فقط لغاتی که با متن جستجو مچ می‌شن نمایش داده می‌شن؛ «انتخاب همه» و
  // «پاک کردن همه» هم روی همین لیستِ فیلترشده عمل می‌کنن، نه کل انبار.
  const filteredWords = words.filter(matchesQuery);

  const byLang = {};
  filteredWords.forEach((w) => {
    if (!byLang[w.langCode]) byLang[w.langCode] = [];
    byLang[w.langCode].push(w);
  });
  // مرتب‌سازیِ هر گروهِ زبان جدا (نگاه کن به GenericSortMenu/sortKey بالا) —
  // چون هر زبان لیستِ مستقلِ خودش رو داره (کارتِ جدا، بازه‌ی نمایشِ جدا).
  Object.keys(byLang).forEach((code) => {
    byLang[code] = sortSavedWordEntries(byLang[code], sortKey);
  });
  const langCodes = Object.keys(byLang);

  const totalPicked = Object.values(picked).reduce((sum, set) => sum + (set ? set.size : 0), 0);
  const allVisibleSelected =
    filteredWords.length > 0 && filteredWords.every((e) => (picked[e.langCode] || new Set()).has(e.word));

  const toggleSelectAll = () => {
    setPicked((prev) => {
      const next = { ...prev };
      filteredWords.forEach((e) => {
        const set = new Set(next[e.langCode] || []);
        if (allVisibleSelected) set.delete(e.word);
        else set.add(e.word);
        next[e.langCode] = set;
      });
      return next;
    });
  };

  const deleteSelected = () => {
    if (!totalPicked) return;
    if (!window.confirm(trf("confirmDeleteSelectedWords", uiLang, { n: totalPicked }))) return;
    Object.entries(picked).forEach(([code, set]) => {
      (set || new Set()).forEach((word) => removeSavedStoryWord(word, code));
    });
    setPicked({});
    setActionMsg(trf("wordsDeletedMsg", uiLang, { n: totalPicked }));
  };

  const clearAll = () => {
    if (!filteredWords.length) return;
    const msg = normalizedQuery
      ? trf("confirmClearFiltered", uiLang, { n: filteredWords.length })
      : trf("confirmClearAllSaved", uiLang, { n: filteredWords.length });
    if (!window.confirm(msg)) return;
    filteredWords.forEach((e) => removeSavedStoryWord(e.word, e.langCode));
    setPicked({});
    setActionMsg(trf("wordsClearedMsg", uiLang, { n: filteredWords.length }));
  };

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(""), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const toolbarButtonStyle = {
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 20,
    border: `1px solid ${colors.cardBorder}`,
    backgroundColor: "white",
    whiteSpace: "nowrap",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: colors.ink, marginBottom: 4 }}>{tr("savedWordsTitle", uiLang)}</h2>
        <p style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.7 }}>
          {tr("savedWordsHint", uiLang)}
        </p>
      </div>

      {words.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3"
            style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
          >
            <Search size={15} color={colors.inkSoft} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("searchSavedWords", uiLang)}
              dir="auto"
              style={{ flex: 1, fontFamily: uiLang === "en" ? fontLatin : fontFa, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={tr("clearSearchAria", uiLang)} style={{ display: "flex" }}>
                <X size={15} color={colors.inkSoft} />
              </button>
            )}
          </div>

          <div className="flex justify-start">
            <GenericSortMenu sortKey={sortKey} setSortKey={setSortKey} options={SAVED_WORDS_SORT_OPTIONS} uiLang={uiLang} />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={toggleSelectAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.ink, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <CheckSquare size={13} />
              {allVisibleSelected ? tr("deselectAll", uiLang) : tr("selectAll", uiLang)}
            </button>
            <button
              onClick={clearAll}
              disabled={filteredWords.length === 0}
              className="flex items-center gap-1"
              style={{ ...toolbarButtonStyle, color: colors.rose, opacity: filteredWords.length ? 1 : 0.5 }}
            >
              <Trash2 size={13} />
              {tr("clearAllWords", uiLang)}
            </button>
            {totalPicked > 0 && (
              <button onClick={deleteSelected} className="flex items-center gap-1" style={{ ...toolbarButtonStyle, color: colors.rose }}>
                <X size={13} />
                {trf("deleteNSelected", uiLang, { n: totalPicked })}
              </button>
            )}
          </div>

          {actionMsg && (
            <p className="flex items-center gap-2" style={{ fontSize: 12, color: colors.teal }}>
              {actionMsg}
            </p>
          )}
        </div>
      )}

      {langCodes.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.inkSoft }}>
          {words.length === 0
            ? tr("noSavedWordsYet", uiLang)
            : tr("noSavedWordsForSearch", uiLang)}
        </p>
      ) : (
        langCodes.map((code) => {
          const label = uiLang === "en" ? englishLangName(code) : LANGUAGES.find((l) => l.code === code)?.label || code;
          const pickedSet = picked[code] || new Set();
          const groupWords = byLang[code];
          const range = getSavedRange(code, groupWords.length);
          const visibleGroupWords = groupWords.slice(range.clampedFrom - 1, range.clampedTo);
          const readCountInRange = visibleGroupWords.filter((e) => readIds.has(savedWordReadId(code, e.word))).length;
          const readCountTotal = groupWords.filter((e) => readIds.has(savedWordReadId(code, e.word))).length;
          return (
            <div
              key={code}
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 16 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontWeight: 700 }}>
                  {label} ({groupWords.length})
                </p>
                <button
                  onClick={() => {
                    // با فرستادنِ این لغات به داستان‌ساز، خودکار «خوانده‌شده»
                    // (یعنی «باهاش داستان ساختم») علامت می‌خورن — کاربر لازم
                    // نیست جدا یکی‌یکی تیک بزنه تا بفهمه کدوما رو قبلاً برده.
                    markSavedRangeRead(
                      code,
                      groupWords.filter((e) => pickedSet.has(e.word)),
                      true
                    );
                    onJumpToStory(code, Array.from(pickedSet));
                  }}
                  disabled={pickedSet.size === 0}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 12,
                    color: pickedSet.size ? colors.teal : colors.inkSoft,
                    textDecoration: "underline",
                    opacity: pickedSet.size ? 1 : 0.5,
                  }}
                >
                  <Sparkles size={13} />
                  {pickedSet.size ? trf("addNWordsToStory", uiLang, { n: pickedSet.size }) : tr("addToStoryBuilder", uiLang)}
                </button>
              </div>

              {/* بازه‌ی نمایش + وضعیتِ خوانده‌شده — فقط وقتی لیستِ این زبان
                  به‌اندازه‌ی کافی بزرگه لازم می‌شه، ولی برای ساده‌موندنِ
                  منطق همیشه نشون داده می‌شه (مثلِ WordList). */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <RangeSliderFilter
                  min={1}
                  max={groupWords.length}
                  from={range.clampedFrom}
                  to={range.clampedTo}
                  onFromChange={(val) => setSavedRangeInput(code, "from", val)}
                  onToChange={(val) => setSavedRangeInput(code, "to", val)}
                  readCount={readCountInRange}
                  totalInRange={visibleGroupWords.length}
                  readCountTotal={readCountTotal}
                  label={uiLang === "en" ? "Words" : "کلمات"}
                  uiLang={uiLang}
                  colors={colors}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => markSavedRangeRead(code, visibleGroupWords, true)}
                    style={{ fontSize: 10, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 8px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markSavedRangeRead(code, visibleGroupWords, false)}
                    style={{ fontSize: 10, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 8px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {visibleGroupWords.map((e) => {
                  const isPicked = pickedSet.has(e.word);
                  const isRead = readIds.has(savedWordReadId(code, e.word));
                  // معادلِ این لغت به هر زبونی غیر از خودِ زبونِ مبدا —
                  // زبان مادری اول، بعد هر زبان مقصدِ دیگه‌ای که کاربر
                  // بالای صفحه فعال کرده، به همون ترتیب.
                  const otherLangs = relevantLangs.filter((l) => l !== code);
                  const level = lookupSavedWordLevel(e.word, code);
                  const pressKey = `${code}:${e.word}`;
                  return (
                    <div
                      key={e.word}
                      title={tr("longPressToJump", uiLang)}
                      onMouseDown={(ev) => beginPress(pressKey, ev.clientX, ev.clientY, e, ev.target)}
                      onMouseMove={(ev) => movePress(ev.clientX, ev.clientY)}
                      onMouseUp={clearPress}
                      onMouseLeave={clearPress}
                      onTouchStart={(ev) => {
                        const t = ev.touches[0];
                        beginPress(pressKey, t.clientX, t.clientY, e, ev.target);
                      }}
                      onTouchMove={(ev) => {
                        const t = ev.touches[0];
                        movePress(t.clientX, t.clientY);
                      }}
                      onTouchEnd={clearPress}
                      onTouchCancel={clearPress}
                      onContextMenu={(ev) => ev.preventDefault()}
                      onClickCapture={handleCardClickCapture}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 110,
                        maxWidth: 210,
                        borderRadius: 14,
                        border: `1px solid ${isPicked ? colors.gold : isRead ? READ_DONE_BORDER : colors.cardBorder}`,
                        background: isPicked ? colors.goldSoft : isRead ? READ_DONE_GRADIENT : colors.paper,
                        boxShadow: !isPicked && isRead ? READ_DONE_SHADOW : "none",
                        padding: "7px 10px",
                        touchAction: "pan-y",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      {/* این ردیف عمداً direction: ltr داره (توضیح بالا)، پس دایره‌ی
                          خوانده‌شده رو در گروهِ دومِ همین ردیف، به‌عنوانِ آخرین
                          عضو گذاشتیم — تا فیزیکاً سمتِ راستِ کارت بیفته، یکسان
                          با بقیه‌ی تب‌ها (قبلاً اول-ردیف بود و زیرِ ltr سمتِ چپ در میومد). */}
                      <div className="flex items-center justify-between gap-2" style={{ direction: "ltr" }}>
                        <span className="flex items-center gap-1" style={{ minWidth: 0 }}>
                          <button
                            onClick={() => togglePick(code, e.word)}
                            dir="auto"
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: colors.ink,
                              textAlign: "start",
                              overflowWrap: "break-word",
                            }}
                          >
                            {e.word}
                          </button>
                        </span>
                        <span className="flex items-center gap-1" style={{ flexShrink: 0 }} data-jump-exclude="1">
                          <SpeakButton text={e.word} code={code} color={colors.gold} neuralId={`word:${e.word}:${code}`} neuralLabel="لغت" />
                          <button
                            onClick={() => removeSavedStoryWord(e.word, code)}
                            style={{ color: colors.inkSoft, display: "flex" }}
                            title={tr("deletePermanently", uiLang)}
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => toggleSavedWordRead(code, e.word)}
                            aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
                            data-jump-exclude="1"
                            style={{
                              flexShrink: 0,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: isRead ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                              background: isRead ? READ_DONE_CHECK_GRADIENT : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isRead && <Check size={13} color="white" strokeWidth={3} />}
                          </button>
                        </span>
                      </div>
                      {level && (
                        <div>
                          <LevelBadge level={level} />
                        </div>
                      )}
                      {otherLangs.map((toLang) => {
                        const translation = (e.translations && e.translations[toLang]) || "";
                        const toLabel = uiLang === "en" ? englishLangName(toLang) : LANGUAGES.find((l) => l.code === toLang)?.label || toLang;
                        return (
                          <div key={toLang} className="flex items-center justify-between gap-2" style={{ direction: "ltr" }}>
                            <div
                              dir={dirFor(toLang)}
                              title={toLabel}
                              style={{
                                fontSize: 11,
                                color: colors.inkSoft,
                                lineHeight: 1.6,
                                fontFamily: toLang === "fa" ? fontFa : fontLatin,
                                overflowWrap: "break-word",
                                flex: 1,
                              }}
                            >
                              {translation || "…"}
                            </div>
                            {translation && <SpeakButton text={translation} code={toLang} color={colors.teal} neuralId={`word:${e.word}:${toLang}`} neuralLabel="ترجمه" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
