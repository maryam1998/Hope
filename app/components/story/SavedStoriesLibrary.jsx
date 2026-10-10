import React from "react";
import { CONTENT_TYPES, STORY_LENGTHS } from "../../story/storyText.js";
import { Check, Pencil, Search, Star, X } from "lucide-react";
import { LANGUAGES } from "../../constants/languages.js";
import { LevelFilterRow } from "../levels/LevelControls.jsx";
import { READ_DONE_BORDER, READ_DONE_CHECK_GRADIENT, READ_DONE_GRADIENT, READ_DONE_SHADOW, STAR_FAVORITE_COLOR, colors } from "../../ui/theme.js";
import RangeSliderFilter from "../../../RangeSliderFilter.jsx";
import { SavedStoriesSortMenu } from "../SortMenus.jsx";
import { WORDS_PAGE_SIZE } from "../WordList.jsx";
import { formatSavedDate } from "../../utils/calendar.js";
import { getStoryEntryFullText, getStoryEntryPreview } from "../../story/storyEntries.js";
import { sortSavedStories } from "../../sort/sortHelpers.js";
import { tr } from "../../ui/uiStrings.js";

export function SavedStoriesLibrary({
  calendarSystem,
  commitRenamingStory,
  deleteSavedStory,
  handleDeletePdfViewDoc,
  markStoryRangeRead,
  openSavedPdfViewDoc,
  openSavedStory,
  pdfViewBusy,
  pdfViewDocs,
  renameDraft,
  renamingStoryId,
  savedStories,
  savedStoriesAudioMap,
  savedStoriesLevelFilter,
  savedStoriesSearch,
  savedStoriesSort,
  savedStoryRangeInput,
  savedStoryReadIds,
  setRenameDraft,
  setRenamingStoryId,
  setSavedStoriesLevelFilter,
  setSavedStoriesSearch,
  setSavedStoriesSort,
  setSavedStoryRangeInput,
  startRenamingStory,
  toggleSavedStoryFavorite,
  toggleSavedStoryRead,
  uiLang,
}) {
  return (
        <div className="flex flex-col gap-3">
          {/* PDFهایی که با «PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده»
              ذخیره شدن، این‌جا بالای لیستِ داستان‌ها نشون داده می‌شن — نه
              پایینِ صفحه‌ی اصلیِ داستان‌ساز. */}
          {pdfViewDocs.length > 0 && (
            <div style={{ textAlign: "start" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>{uiLang === "en" ? "Saved PDFs" : "PDFهای ذخیره‌شده"}</span>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                {pdfViewDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                    style={{
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 12,
                      opacity: pdfViewBusy ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => openSavedPdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.ink, fontWeight: 700, textAlign: "start", flex: 1, minWidth: 0 }}
                    >
                      {doc.title}
                      <span style={{ color: colors.inkSoft, fontWeight: 400 }}>
                        {" "}
                        — {doc.doneCount === doc.pageCount
                          ? (uiLang === "en" ? `${doc.pageCount} pages` : `${doc.pageCount} صفحه`)
                          : (uiLang === "en" ? `${doc.doneCount} of ${doc.pageCount} pages` : `${doc.doneCount} از ${doc.pageCount} صفحه`)}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeletePdfViewDoc(doc)}
                      disabled={pdfViewBusy}
                      style={{ color: colors.rose, fontSize: 11, textDecoration: "underline", marginInlineStart: 8 }}
                    >
                      {uiLang === "en" ? "Delete" : "حذف"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* جستجو در داستان‌های ذخیره‌شده — روی متنِ خودِ داستان، لغاتِ
              انتخاب‌شده، و عنوانِ PDF چک می‌شه؛ کاملاً مستقل از زبانِ
              داستان (فارسی/انگلیسی/هرچی) — همه‌شون یکسان جستجو می‌شن. */}
          {savedStories.length > 1 && (
            <div
              className="flex items-center gap-2 px-3"
              style={{ backgroundColor: "white", border: `1px solid ${colors.cardBorder}`, borderRadius: 20, height: 40 }}
            >
              <Search size={15} color={colors.inkSoft} />
              <input
                value={savedStoriesSearch}
                onChange={(e) => setSavedStoriesSearch(e.target.value)}
                placeholder={uiLang === "en" ? "Search saved stories..." : "جستجو در داستان‌های ذخیره‌شده..."}
                dir="auto"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, backgroundColor: "transparent" }}
              />
              {savedStoriesSearch && (
                <button onClick={() => setSavedStoriesSearch("")} aria-label={uiLang === "en" ? "Clear search" : "پاک کردن جستجو"} style={{ display: "flex" }}>
                  <X size={15} color={colors.inkSoft} />
                </button>
              )}
            </div>
          )}
          {/* سطح‌ها همیشه توی ردیفِ خودشون، تمام‌عرض و بدون تنگ‌شدن نشون
              داده می‌شن؛ مرتب‌سازی یه ردیفِ جدا زیرشه — قبلاً کنارِ هم
              بودن و دکمه‌ی مرتب‌سازی جای سطح‌ها رو تنگ می‌کرد. */}
          <LevelFilterRow levelFilter={savedStoriesLevelFilter} setLevelFilter={setSavedStoriesLevelFilter} uiLang={uiLang} />
          {savedStories.length > 1 && (
            <div className="flex justify-start">
              <SavedStoriesSortMenu sortKey={savedStoriesSort} setSortKey={setSavedStoriesSort} uiLang={uiLang} />
            </div>
          )}
          {savedStories.length === 0 && (
            <p style={{ fontSize: 13, color: colors.inkSoft }}>{uiLang === "en" ? "You haven't saved any stories yet." : "هنوز داستانی ذخیره نکردی."}</p>
          )}
          {savedStories.length > 0 && (() => {
            // جستجو، مستقلِ از زبانِ داستان — یه include سادهٔ رشته‌ست، پس
            // فارسی/انگلیسی/عربی/هر اسکریپتِ دیگه‌ای رو یکسان پیدا می‌کنه.
            const q = savedStoriesSearch.trim().toLowerCase();
            const searched = q
              ? savedStories.filter((s) => {
                  const haystack = [
                    s.title || "",
                    s.pdfDocId ? "" : getStoryEntryFullText(s),
                    (s.selectedWords || []).join(" "),
                  ]
                    .join(" ")
                    .toLowerCase();
                  return haystack.includes(q);
                })
              : savedStories;
            if (q && searched.length === 0) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>{uiLang === "en" ? "Nothing found for this search." : "چیزی با این جستجو پیدا نشد."}</p>
              );
            }
            // هر داستان از قبل با سطحِ خودش (storyLevel) ذخیره شده. وقتی فیلترِ
            // خاصی (مثلاً B1) انتخاب شده فقط داستان‌های همون سطح نشون داده
            // می‌شن. وقتی «همه سطح‌ها»ست، دیگه بر اساسِ سطح دسته‌بندی/تفکیک
            // نمی‌کنیم — همه‌ی داستان‌ها با هم قاطی، فقط بر اساسِ sortKey
            // (مثلاً تاریخ) مرتب می‌شن؛ سطحِ هر داستان همون‌طور که قبلاً بود
            // (خط اول کارت) نمایش داده می‌شه.
            const groups = (
              savedStoriesLevelFilter !== "all"
                ? [[savedStoriesLevelFilter, searched.filter((s) => s.storyLevel === savedStoriesLevelFilter)]]
                : [["all", searched]]
            ).map(([lv, list]) => [lv, sortSavedStories(list, savedStoriesSort)]);
            if (!groups.length || groups.every(([, list]) => list.length === 0)) {
              return (
                <p style={{ fontSize: 13, color: colors.inkSoft }}>
                  {uiLang === "en"
                    ? `No stories saved at level ${savedStoriesLevelFilter}.`
                    : `داستانی با سطح ${savedStoriesLevelFilter} ذخیره نشده.`}
                </p>
              );
            }
            const totalCount = groups.reduce((sum, [, list]) => sum + list.length, 0);
            const defaultTo = Math.min(totalCount, WORDS_PAGE_SIZE) || totalCount || 1;
            const parsedFrom = parseInt(savedStoryRangeInput.from, 10);
            const parsedTo = parseInt(savedStoryRangeInput.to, 10);
            const effFrom = Number.isNaN(parsedFrom) ? 1 : parsedFrom;
            const effTo = Number.isNaN(parsedTo) ? defaultTo : parsedTo;
            const clampedFrom = Math.min(Math.max(1, effFrom), Math.max(totalCount, 1));
            const clampedTo = Math.min(Math.max(clampedFrom, effTo), totalCount || clampedFrom);
            let seen = 0;
            const rangedGroups = groups.map(([lv, list]) => {
              const groupStart = seen;
              seen += list.length;
              const from = Math.max(clampedFrom - 1 - groupStart, 0);
              const to = Math.max(clampedTo - groupStart, 0);
              return [lv, list.slice(from, to)];
            });
            const visibleTotal = rangedGroups.reduce((sum, [, list]) => sum + list.length, 0);
            const readCountInRange = rangedGroups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const readCountTotal = groups.reduce(
              (sum, [, list]) => sum + list.filter((s) => savedStoryReadIds.has(s.id)).length,
              0
            );
            const allInRangeFlat = rangedGroups.flatMap(([, list]) => list);
            return (
              <>
                <RangeSliderFilter
                  min={1}
                  max={totalCount}
                  from={clampedFrom}
                  to={clampedTo}
                  onFromChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, from: val }))}
                  onToChange={(val) => setSavedStoryRangeInput((prev) => ({ ...prev, to: val }))}
                  readCount={readCountInRange}
                  totalInRange={visibleTotal}
                  readCountTotal={readCountTotal}
                  label={uiLang === "en" ? "Stories" : "داستان‌ها"}
                  uiLang={uiLang}
                  colors={colors}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, true)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.teal, border: `1px solid ${colors.teal}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Mark range read" : "علامت‌گذاری همه به خوانده‌شده"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markStoryRangeRead(allInRangeFlat, false)}
                    style={{ fontSize: 11, fontWeight: 700, color: colors.inkSoft, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: "4px 12px", background: "#fff", cursor: "pointer" }}
                  >
                    {uiLang === "en" ? "Clear range" : "پاک‌کردن علامت این بازه"}
                  </button>
                </div>
                {rangedGroups.map(([lv, list]) => (
              <div key={lv} className="flex flex-col gap-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openSavedStory(s)}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      background: savedStoryReadIds.has(s.id) ? READ_DONE_GRADIENT : "white",
                      border: `1px solid ${savedStoryReadIds.has(s.id) ? READ_DONE_BORDER : colors.cardBorder}`,
                      borderRadius: 14,
                      padding: 14,
                      paddingTop: s.savedAt ? 26 : 14,
                      boxShadow: savedStoryReadIds.has(s.id) ? READ_DONE_SHADOW : "none",
                    }}
                  >
                    {s.savedAt && (
                      <p
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 10,
                          margin: 0,
                          fontSize: 10.5,
                          color: colors.inkSoft,
                          whiteSpace: "nowrap",
                          // چون این برچسب داخلِ صفحه‌ی RTL می‌شینه، بدونِ این‌جهت‌دهیِ
                          // صریح، الگوریتمِ Bidi ممکنه ترتیبِ تاریخ/ساعت رو برعکس
                          // نشون بده. با direction: ltr همیشه از چپ به راست —
                          // اول تاریخ، بعد ساعت — دقیقاً به همون ترتیبی که
                          // formatSavedDate می‌سازه، نمایش داده می‌شه.
                          direction: "ltr",
                          unicodeBidi: "isolate",
                          textAlign: "left",
                        }}
                      >
                        📅 {formatSavedDate(s.savedAt, calendarSystem)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {/* دایره‌ی خوانده‌شده کنارِ عنوان، همیشه اولین عضوِ ردیف —
                          تا در چیدمانِ راست‌به‌چپ دقیقاً سمتِ راستِ کارت بیفته،
                          یکسان با بقیه‌ی تب‌ها (قبلاً توی گروهِ دومِ دکمه‌ها
                          بود و سمتِ چپ در میومد). */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSavedStoryRead(s.id); }}
                          aria-label={uiLang === "en" ? "Toggle read" : "علامت‌زدن به‌عنوان خوانده‌شده"}
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: savedStoryReadIds.has(s.id) ? `1.6px solid ${READ_DONE_BORDER}` : `1.6px dashed ${colors.cardBorder}`,
                            background: savedStoryReadIds.has(s.id) ? READ_DONE_CHECK_GRADIENT : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {savedStoryReadIds.has(s.id) && <Check size={13} color="white" strokeWidth={3} />}
                        </button>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>
                            {savedStoriesAudioMap[s.id] && (
                              <span title={uiLang === "en" ? "Has uploaded audio" : "صوتِ آپلودی داره"} style={{ marginLeft: 6 }}>🎵</span>
                            )}
                            {s.pdfDocId && (
                              <span title={uiLang === "en" ? "PDF file" : "فایلِ PDF"} style={{ marginLeft: 6 }}>📄</span>
                            )}
                            {s.ytSession && (
                              <span title={s.ytLive ? "Live" : "YouTube"} style={{ marginLeft: 6 }}>{s.ytLive ? "🎙" : "▶"}</span>
                            )}
                            {s.pdfDocId ? (
                              <>PDF{s.pageCount ? ` · ${s.pageCount} ${uiLang === "en" ? "pages" : "صفحه"}` : ""}</>
                            ) : s.ytSession ? (
                              <>{s.ytLive ? (uiLang === "en" ? "Live translation" : "ترجمه‌ی زنده") : "YouTube"} · {LANGUAGES.find((l) => l.code === s.storyLang)?.label}</>
                            ) : (
                              <>
                                {LANGUAGES.find((l) => l.code === s.storyLang)?.label} · {s.storyLevel} ·{" "}
                                {CONTENT_TYPES.find((c) => c.key === s.contentType)?.label || (uiLang === "en" ? "General" : "عمومی")} ·{" "}
                                {STORY_LENGTHS.find((l) => l.key === s.storyLength)?.label || (uiLang === "en" ? "Medium" : "متوسط")}
                              </>
                            )}
                          </p>
                          {renamingStoryId === s.id ? (
                            <div className="flex items-center gap-1" style={{ marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRenamingStory(s.id);
                                  if (e.key === "Escape") setRenamingStoryId(null);
                                }}
                                placeholder={uiLang === "en" ? "Custom title…" : "عنوانِ دلخواه…"}
                                style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: `1px solid ${colors.cardBorder}`, flex: 1, minWidth: 0 }}
                              />
                              <button onClick={() => commitRenamingStory(s.id)} aria-label={uiLang === "en" ? "Save title" : "ذخیره‌ی عنوان"}>
                                <Check size={14} color={colors.teal} />
                              </button>
                              <button onClick={() => setRenamingStoryId(null)} aria-label={uiLang === "en" ? "Cancel" : "انصراف"}>
                                <X size={14} color={colors.inkSoft} />
                              </button>
                            </div>
                          ) : s.pdfDocId ? (
                            <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{s.title}</p>
                          ) : (
                            <>
                              {s.title && (
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: colors.ink, marginTop: 2 }}>{s.title}</p>
                              )}
                              {getStoryEntryPreview(s) && (
                                <p style={{ fontSize: 12, color: colors.ink, marginTop: 2 }}>{getStoryEntryPreview(s)}</p>
                              )}
                              <p style={{ fontSize: 12, color: colors.inkSoft }}>{s.selectedWords.join(uiLang === "en" ? ", " : "، ")}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSavedStoryFavorite(s.id); }}
                          aria-label={tr("addToFavoritesAria", uiLang)}
                        >
                          <Star size={16} color={STAR_FAVORITE_COLOR} fill={s.favorite ? STAR_FAVORITE_COLOR : "none"} />
                        </button>
                        {renamingStoryId !== s.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startRenamingStory(s); }}
                            aria-label={uiLang === "en" ? "Rename" : "تغییرِ نام"}
                          >
                            <Pencil size={14} color={colors.inkSoft} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deleteSavedStory(s.id); }} aria-label={uiLang === "en" ? "Delete" : "حذف"}>
                          <X size={16} color={colors.rose} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                ))}
              </>
            );
          })()}
        </div>
  );
}
