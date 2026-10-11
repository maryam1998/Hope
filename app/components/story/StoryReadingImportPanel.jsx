import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
            ? (pdfReadProgress || t("import_pdf_busy"))
            : t("import_pdf")}
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
            ? (imgReadProgress || t("import_img_busy"))
            : t("import_img")}
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
            ? (pdfViewProgress || t("import_pdfview_busy"))
            : t("import_pdfview")}
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
                {t("import_page_of", { title: pdfViewTitle, n: pdfViewIndex + 1, total: pdfViewPages.length })}
                {pdfViewBusy && pdfViewDocId && (
                  <span style={{ color: colors.inkSoft, fontWeight: 400 }}> {t("import_remaining_pages")}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={savePdfToStories}
                  disabled={!pdfViewDocId || !pdfViewPersisted || savedStories.some((s) => s.pdfDocId === pdfViewDocId)}
                  title={!pdfViewPersisted ? t("import_local_storage_failed") : undefined}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? colors.inkSoft : colors.gold,
                    textDecoration: savedStories.some((s) => s.pdfDocId === pdfViewDocId) ? "none" : "underline",
                    opacity: !pdfViewDocId || !pdfViewPersisted ? 0.5 : 1,
                  }}
                >
                  {savedStories.some((s) => s.pdfDocId === pdfViewDocId)
                    ? t("import_saved")
                    : !pdfViewPersisted
                    ? t("import_cant_save")
                    : t("import_save_to_stories")}
                </button>
                <button onClick={closePdfView} style={{ fontSize: 11, color: colors.rose, textDecoration: "underline" }}>
                  {t("import_close")}
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
                        setPdfViewError(t("import_render_error"))
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
                  {showPdfOriginalWords ? t("import_hide_original") : t("import_show_original")}
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
                      {t("import_tap_word_hint")}
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
                ◀ {t("import_prev_page")}
              </button>
              <button
                onClick={() => setPdfViewIndex((i) => Math.min(pdfViewPages.length - 1, i + 1))}
                disabled={pdfViewIndex === pdfViewPages.length - 1}
                style={{ fontSize: 12, fontWeight: 700, color: colors.teal, opacity: pdfViewIndex === pdfViewPages.length - 1 ? 0.4 : 1 }}
              >
                {t("import_next_page")} ▶
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
            {showLinkReading ? t("import_link_close") : t("import_link_open")}
          </button>
          {showLinkReading && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={linkReadUrl}
                onChange={(e) => setLinkReadUrl(e.target.value)}
                placeholder="https://example.com/article  |  https://youtube.com/watch?v=..."
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
                {t("import_link_hint")}
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
                {linkReadBusy ? t("import_link_busy") : t("import_link_get")}
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
          {showPasteReading ? t("import_paste_close") : t("import_paste_open")}
        </button>

        {showPasteReading && (
          <div style={{ marginTop: 8, textAlign: "start" }}>
            <textarea
              value={pastedReadingText}
              onChange={(e) => setPastedReadingText(e.target.value)}
              placeholder={t("import_paste_placeholder")}
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
              📖 {t("import_ready_to_read")}
            </button>
          </div>
        )}
      </div>
  );
}
