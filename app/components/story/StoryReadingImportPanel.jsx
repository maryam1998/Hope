import React from "react";
import { ClickableSentence } from "./ClickableSentence.jsx";
import { Loader2 } from "lucide-react";
import { PdfLivePageView } from "./PdfLivePageView.jsx";
import { colors, fontLatin } from "../../ui/theme.js";
import { dirFor } from "../../constants/languages.js";

export function StoryReadingImportPanel({
  aiSettings,
  closePdfView,
  handleImagesImportForReading,
  handleLinkImportForReading,
  handlePastedTextForReading,
  handlePdfImgDoubleClick,
  handlePdfImgTouchEnd,
  handlePdfImgTouchMove,
  handlePdfImgTouchStart,
  handlePdfImportForReading,
  handlePdfViewImport,
  imgReadBusy,
  imgReadError,
  imgReadInputRef,
  imgReadProgress,
  linkReadBusy,
  linkReadError,
  linkReadUrl,
  nativeLabel,
  nativeLang,
  pastedReadingText,
  pdfImgGestureRef,
  pdfImgPan,
  pdfImgZoom,
  pdfjsLibRef,
  pdfReadBusy,
  pdfReadError,
  pdfReadInputRef,
  pdfReadProgress,
  pdfTranslationFontSize,
  pdfTranslationShouldBold,
  pdfViewBusy,
  pdfViewDocId,
  pdfViewError,
  pdfViewIndex,
  pdfViewInputRef,
  pdfViewLiveDoc,
  pdfViewPages,
  pdfViewPersisted,
  pdfViewProgress,
  pdfViewTitle,
  savedStories,
  savePdfToStories,
  setLinkReadUrl,
  setPastedReadingText,
  setPdfViewError,
  setPdfViewIndex,
  setShowLinkReading,
  setShowPasteReading,
  setShowPdfOriginalWords,
  showLinkReading,
  showPasteReading,
  showPdfOriginalWords,
  storyLang,
  uiLang,
}) {
  return (
      <div style={{ textAlign: "center" }}>
        <input
          ref={pdfReadInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfImportForReading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfReadInputRef.current?.click()}
          disabled={pdfReadBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfReadBusy ? 0.6 : 1,
          }}
        >
          {pdfReadBusy ? <Loader2 size={16} className="spin" /> : <span>📖</span>}
          {pdfReadBusy
            ? (pdfReadProgress || (uiLang === "en" ? "Reading PDF..." : "در حال خوندنِ PDF..."))
            : (uiLang === "en" ? "Import a PDF to read instead" : "به‌جاش یه PDF برای خوانش وارد کن")}
        </button>
        {pdfReadError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfReadError}</p>
        )}

        <input
          ref={imgReadInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImagesImportForReading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => imgReadInputRef.current?.click()}
          disabled={imgReadBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: imgReadBusy ? 0.6 : 1,
            marginTop: 10,
          }}
        >
          {imgReadBusy ? <Loader2 size={16} className="spin" /> : <span>🖼️</span>}
          {imgReadBusy
            ? (imgReadProgress || (uiLang === "en" ? "Reading images..." : "در حال خوندنِ عکس‌ها..."))
            : (uiLang === "en" ? "Import images to translate & read" : "وارد کردنِ عکس برای ترجمه و خوانش")}
        </button>
        {imgReadError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{imgReadError}</p>
        )}

        <input
          ref={pdfViewInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfViewImport}
          style={{ display: "none" }}
        />
        <button
          onClick={() => pdfViewInputRef.current?.click()}
          disabled={pdfViewBusy}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.teal}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            opacity: pdfViewBusy ? 0.6 : 1,
            marginTop: 10,
          }}
        >
          {pdfViewBusy ? <Loader2 size={16} className="spin" /> : <span>📑</span>}
          {pdfViewBusy
            ? (pdfViewProgress || (uiLang === "en" ? "Loading PDF..." : "در حال بارگذاریِ PDF..."))
            : (uiLang === "en" ? "Show the PDF here with original image + translation" : "PDF رو با عکسِ اصلی + ترجمه همینجا نشون بده")}
        </button>
        {pdfViewError && (
          <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{pdfViewError}</p>
        )}

        {/* لیستِ PDFهای ذخیره‌شده از این‌جا برداشته شد — حالا داخلِ پنلِ
            «داستان‌های ذخیره‌شده» (بالا، گوشه‌ی سمت چپ) نشون داده می‌شه،
            نه اینجا وسطِ صفحه‌ی اصلیِ داستان‌ساز. */}

        {pdfViewPages.length > 0 && (
          <div style={{ marginTop: 12, textAlign: "start" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>
                {uiLang === "en"
                  ? <>{pdfViewTitle} — page {pdfViewIndex + 1} of {pdfViewPages.length}</>
                  : <>{pdfViewTitle} — صفحه‌ی {pdfViewIndex + 1} از {pdfViewPages.length}</>}
                {pdfViewBusy && pdfViewDocId && (
                  <span style={{ color: colors.inkSoft, fontWeight: 400 }}> {uiLang === "en" ? "(remaining pages processing...)" : "(بقیه‌ی صفحات در حالِ پردازش...)"}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={savePdfToStories}
                  disabled={!pdfViewDocId || !pdfViewPersisted || savedStories.some((s) => s.pdfDocId === pdfViewDocId)}
                  title={!pdfViewPersisted ? (uiLang === "en" ? "Local storage failed, so this PDF can't be added to the list" : "چون ذخیره‌سازیِ محلی ناموفق بود، این PDF قابلِ اضافه‌کردن به لیست نیست") : undefined}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? colors.inkSoft : colors.gold,
                    textDecoration: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? "none" : "underline",
                    opacity: !pdfViewDocId || !pdfViewPersisted ? 0.5 : 1,
                  }}
                >
                  {uiLang === "en"
                    ? (savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                        ? "Saved ✓"
                        : !pdfViewPersisted
                        ? "Can't be saved"
                        : "Save to stories")
                    : (savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                        ? "ذخیره شد ✓"
                        : !pdfViewPersisted
                        ? "قابلِ ذخیره نیست"
                        : "ذخیره در داستان‌ها")}
                </button>
                <button onClick={closePdfView} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                  {uiLang === "en" ? "Close" : "بستن"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3" style={{ alignItems: "flex-start" }}>
              <div
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  overflow: "hidden",
                  borderRadius: 10,
                  border: `1px solid ${colors.cardBorder}`,
                  touchAction: pdfImgZoom > 1 ? "none" : "pan-y",
                }}
                onTouchStart={handlePdfImgTouchStart}
                onTouchMove={handlePdfImgTouchMove}
                onTouchEnd={handlePdfImgTouchEnd}
                onDoubleClick={handlePdfImgDoubleClick}
              >
                {(pdfViewLiveDoc?.docId === pdfViewDocId && pdfViewLiveDoc?.doc) || pdfViewPages[pdfViewIndex]?.imageUrl ? (
                  <div
                    style={{
                      transform: `scale(${pdfImgZoom}) translate(${pdfImgPan.x / pdfImgZoom}px, ${pdfImgPan.y / pdfImgZoom}px)`,
                      transformOrigin: "center center",
                      transition: pdfImgGestureRef.current.mode ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <PdfLivePageView
                      pdfDoc={pdfViewLiveDoc?.docId === pdfViewDocId ? pdfViewLiveDoc.doc : null}
                      pdfjsLib={pdfjsLibRef.current}
                      pageNum={pdfViewIndex + 1}
                      fallbackImageUrl={pdfViewPages[pdfViewIndex]?.imageUrl}
                      onError={() =>
                        setPdfViewError(uiLang === "en"
                          ? "There was a problem rendering this page live — the file may be corrupted or encrypted"
                          : "رندرِ زنده‌ی این صفحه مشکل داشت — ممکنه فایل خراب یا رمزگذاری‌شده باشه")
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div
                dir="auto"
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  backgroundColor: colors.goldSoft,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: pdfTranslationFontSize,
                  fontWeight: pdfTranslationShouldBold ? 700 : 400,
                  lineHeight: 1.9,
                  color: colors.ink,
                  maxHeight: 480,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {pdfViewPages[pdfViewIndex]?.translatedText}
              </div>
            </div>

            {pdfViewPages[pdfViewIndex]?.originalText && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowPdfOriginalWords((v) => !v)}
                  style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}
                >
                  {uiLang === "en"
                    ? (showPdfOriginalWords ? "Hide original text" : "Show original text (clickable)")
                    : (showPdfOriginalWords ? "بستنِ متنِ اصلی" : "نمایشِ متنِ اصلی (کلیک‌پذیر)")}
                </button>
                {showPdfOriginalWords && (
                  <div
                    dir={dirFor(storyLang)}
                    style={{
                      marginTop: 8,
                      backgroundColor: colors.paper,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      lineHeight: 2.1,
                      maxHeight: 300,
                      overflowY: "auto",
                      // متنِ خودِ PDF همیشه باید با جهتِ زبانِ داستان (storyLang)
                      // نوشته بشه، نه dir="auto" — چون dir="auto" جهتِ کلِ این
                      // div رو از رویِ اولین کاراکترِ قوی‌اش تشخیص می‌داد؛ چون
                      // اون کاراکتر معمولاً فارسیِ توضیحِ بالای همین باکس بود
                      // (نه خودِ متنِ انگلیسی)، کل پاراگراف RTL می‌شد و کلمات
                      // انگلیسی به‌هم‌ریخته/برعکس نشون داده می‌شدن.
                      textAlign: dirFor(storyLang) === "rtl" ? "right" : "left",
                    }}
                  >
                    <p
                      dir={dirFor(nativeLang)}
                      style={{
                        fontSize: 10,
                        color: colors.inkSoft,
                        marginBottom: 6,
                        textAlign: dirFor(nativeLang) === "rtl" ? "right" : "left",
                      }}
                    >
                      {uiLang === "en"
                        ? "Tap a word to see its translation; from there you can also add it to the next story, grammar practice, or the Leitner box."
                        : "روی هر کلمه بزن تا ترجمه‌اش رو ببینی؛ از همون‌جا می‌تونی به داستانِ بعدی، یادگیریِ گرامر یا جعبه‌ی لایتنر هم اضافه‌اش کنی."}
                    </p>
                    <ClickableSentence
                      text={pdfViewPages[pdfViewIndex].originalText}
                      langCode={storyLang}
                      nativeLang={nativeLang}
                      nativeLabel={nativeLabel}
                      aiSettings={aiSettings}
                      color={colors.ink}
                      fontFamily={fontLatin}
                      fontSize={13}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
              <button
                onClick={() => setPdfViewIndex((i) => Math.max(0, i - 1))}
                disabled={pdfViewIndex === 0}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === 0 ? 0.4 : 1 }}
              >
                ◀ {uiLang === "en" ? "Previous page" : "صفحه‌ی قبل"}
              </button>
              <button
                onClick={() => setPdfViewIndex((i) => Math.min(pdfViewPages.length - 1, i + 1))}
                disabled={pdfViewIndex === pdfViewPages.length - 1}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === pdfViewPages.length - 1 ? 0.4 : 1 }}
              >
                {uiLang === "en" ? "Next page" : "صفحه‌ی بعد"} ▶
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "start" }}>
          <button
            onClick={() => setShowLinkReading((v) => !v)}
            className="flex items-center justify-center gap-2"
            style={{
              width: "100%",
              border: `1px dashed ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              color: colors.teal,
              marginTop: 8,
            }}
          >
            <span>🔗</span>
            {uiLang === "en"
              ? (showLinkReading ? "Close link import" : "Or enter a page link")
              : (showLinkReading ? "بستنِ وارد کردنِ لینک" : "یا لینکِ یه صفحه رو وارد کن")}
          </button>
          {showLinkReading && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={linkReadUrl}
                onChange={(e) => setLinkReadUrl(e.target.value)}
                placeholder="https://example.com/article  یا  https://youtube.com/watch?v=..."
                dir="ltr"
                style={{
                  width: "100%",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                  textAlign: "left",
                }}
              />
              <p style={{ fontSize: 10, color: colors.inkSoft, marginTop: 4 }}>
                {uiLang === "en"
                  ? "Only the page's main text (body content) is extracted — menus, headers, footers, and ads are ignored."
                  : "فقط متنِ اصلیِ صفحه (بدنه‌ی نوشته) استخراج می‌شه — منو، هدر، فوتر و تبلیغ‌ها نادیده گرفته می‌شن."}
              </p>
              <button
                onClick={handleLinkImportForReading}
                disabled={!linkReadUrl.trim() || linkReadBusy}
                className="flex items-center justify-center gap-2"
                style={{
                  marginTop: 6,
                  width: "100%",
                  backgroundColor: colors.teal,
                  color: "white",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: !linkReadUrl.trim() || linkReadBusy ? 0.5 : 1,
                }}
              >
                {linkReadBusy ? <Loader2 size={16} className="spin" /> : <span>🔗</span>}
                {uiLang === "en"
                  ? (linkReadBusy ? "Reading the page..." : "Get text from link")
                  : (linkReadBusy ? "در حال خوندنِ صفحه..." : "دریافتِ متن از لینک")}
              </button>
              {linkReadError && (
                <p style={{ fontSize: 11, color: colors.rose, marginTop: 6 }}>{linkReadError}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPasteReading((v) => !v)}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13,
            color: colors.teal,
            marginTop: 8,
          }}
        >
          <span>📋</span>
          {uiLang === "en"
            ? (showPasteReading ? "Close text paste" : "Or paste a text/story here")
            : (showPasteReading ? "بستنِ پیست متن" : "یا یه متن/داستان رو اینجا پیست کن")}
        </button>

        {showPasteReading && (
          <div style={{ marginTop: 8, textAlign: "start" }}>
            <textarea
              value={pastedReadingText}
              onChange={(e) => setPastedReadingText(e.target.value)}
              placeholder={uiLang === "en" ? "Paste the text or story you want to read here..." : "متن یا داستانی که می‌خوای بخونی رو اینجا پیست کن..."}
              dir="auto"
              rows={6}
              style={{
                width: "100%",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handlePastedTextForReading}
              disabled={!pastedReadingText.trim()}
              style={{
                marginTop: 6,
                width: "100%",
                backgroundColor: colors.teal,
                color: "white",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 700,
                opacity: !pastedReadingText.trim() ? 0.5 : 1,
              }}
            >
              📖 {uiLang === "en" ? "Ready to read" : "آماده‌ی خوانش کن"}
            </button>
          </div>
        )}
      </div>
  );
}
