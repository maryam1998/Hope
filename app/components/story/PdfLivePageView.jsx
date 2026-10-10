// نمای زنده‌ی صفحه‌ی PDF
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useRef, useEffect } from "react";

// ============================================================
// نمایشِ زنده‌ی صفحه‌ی PDF — به‌جای اتکا به یک عکسِ ثابتِ از پیش‌رندرشده،
// هر بار که صفحه عوض می‌شه، خودِ pdf.js همون لحظه صفحه رو روی یک
// <canvas> می‌کِشه، به‌علاوه‌ی یک لایه‌ی نامرئیِ متن (دقیقاً همون تکنیکی
// که ویووِرهای واقعیِ PDF مثلِ خودِ کروم استفاده می‌کنن) که متنِ خودِ PDF
// رو واقعاً قابلِ سلکت/کپی می‌کنه — نه فقط یک عکس. این کامپوننت هیچ
// UIای بیرون از خودِ صفحه (نوارِ ابزار، دکمه‌ی دانلود و…) نداره — همه‌چیز
// داخلِ همین کارتِ داستان‌ساز می‌مونه.
//
// برای PDFهایی که پیش از این تغییر ذخیره شده بودن (که فرمتِ قدیمی‌شون
// فقط عکسِ از پیش‌رندرشده داره، نه بایتِ خامِ خودِ فایل)، از fallbackImageUrl
// استفاده می‌شه — همون عکسِ قدیمی نشون داده می‌شه، بدونِ این‌که کاربر
// مجبور بشه دوباره فایل رو آپلود کنه.
export function PdfLivePageView({ pdfDoc, pdfjsLib, pageNum, fallbackImageUrl, onError }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfDoc || !pageNum) return undefined;
    (async () => {
      try {
        // اگه رندرِ صفحه‌ی قبلی هنوز تموم نشده، اول کنسلش کن — وگرنه موقعِ
        // ورق‌زدنِ سریع، دو رندرِ هم‌زمان روی یک canvas به‌هم می‌ریزن.
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch {}
        }
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        // مقیاسِ رندر: کافی برای شارپ‌بودن رویِ صفحه‌نمایش‌های retina/موبایل
        // (تا سقفِ ۳ برابر، تا حجمِ canvas بی‌جهت زیاد نشه).
        const renderScale = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * 1.4));
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const ctx = canvas.getContext("2d");
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
        if (cancelled) return;

        // لایه‌ی متنِ نامرئی/قابلِ‌سلکت، هم‌مکان با تصویرِ صفحه. چون canvas
        // با رزولوشنِ بالاتر (renderScale) رسم شده ولی رویِ صفحه با
        // style.width:100% کوچیک‌تر نمایش داده می‌شه، لایه‌ی متن هم باید تو
        // همون مختصاتِ بزرگِ viewport ساخته بشه و بعد با یک transform:scale
        // به همون اندازه‌ی نمایشیِ canvas کوچیک بشه — دقیقاً همون تکنیکِ
        // خودِ ویووِرِ pdf.js.
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = "";
          const displayWidth = canvas.getBoundingClientRect().width || canvas.width;
          const cssScale = displayWidth / viewport.width;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.transform = `scale(${cssScale})`;
          textLayerDiv.style.transformOrigin = "0 0";
          try {
            if (pdfjsLib?.TextLayer) {
              const textContent = await page.getTextContent();
              if (cancelled) return;
              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport,
              });
              await textLayer.render();
            }
          } catch {
            // لایه‌ی متن اختیاریه — اگه ساختش شکست خورد، تصویرِ صفحه هنوز
            // درست دیده می‌شه، فقط سلکت‌کردنِ مستقیمِ متنِ روش کار نمی‌کنه.
          }
        }
      } catch (err) {
        if (!cancelled && onError) onError(err);
      }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum]);

  if (!pdfDoc) {
    return fallbackImageUrl ? (
      <img src={fallbackImageUrl} alt={`صفحه‌ی ${pageNum}`} style={{ width: "100%", display: "block" }} />
    ) : null;
  }

  return (
    <div style={{ position: "relative", width: "100%", lineHeight: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div ref={textLayerRef} className="textLayer" style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}
