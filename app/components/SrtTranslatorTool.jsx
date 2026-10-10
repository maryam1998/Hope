// ابزار ترجمه‌ی SRT
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { parseSRT, serializeSRT } from "../srt/srtUtils.js";
import { LANGUAGES, englishLangName } from "../constants/languages.js";
import { colors, fontFa, fontLatin } from "../ui/theme.js";
import { tr, trf } from "../ui/uiStrings.js";
import { toFaDigits } from "../utils/calendar.js";
import { downloadTextFile } from "../utils/exportMarkdown.js";
import { translateFree } from "../translate/translateService.js";

// کامپوننتِ ابزارِ SRT — کاملاً مستقل از داستانِ فعلی؛ فقط داخلِ تبِ
// داستان‌ساز به‌عنوانِ یه پنلِ جمع‌شدنی نشون داده می‌شه.
export function SrtTranslatorTool({ nativeLang, targetOrder, aiSettings, uiLang }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [entries, setEntries] = useState([]); // [{index,start,end,text}]
  const [translatedEntries, setTranslatedEntries] = useState(null);
  const [targetLang, setTargetLang] = useState((targetOrder && targetOrder[0]) || "en");
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cancelRef = useRef(false);

  const langOptions = LANGUAGES;

  function handleFile(file) {
    if (!file) return;
    setError("");
    setTranslatedEntries(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSRT(String(reader.result || ""));
        if (!parsed.length) {
          setError(tr("srtToolErrEmptyFile", uiLang));
          setEntries([]);
          return;
        }
        setEntries(parsed);
      } catch {
        setError(tr("srtToolErrParse", uiLang));
        setEntries([]);
      }
    };
    reader.onerror = () => setError(tr("srtToolErrRead", uiLang));
    reader.readAsText(file);
  }

  async function translateAll() {
    if (!entries.length) return;
    setTranslating(true);
    setError("");
    cancelRef.current = false;
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      if (cancelRef.current) break;
      const e = entries[i];
      const plain = (e.text || "").replace(/\n/g, " ").trim();
      let translated = plain;
      try {
        translated = plain ? await translateFree(plain, targetLang, "auto", aiSettings) : "";
      } catch {
        translated = plain; // اگه ترجمه‌ی یه خط شکست خورد، متنِ اصلی نگه داشته می‌شه (بهتر از خالی)
      }
      out.push({ ...e, text: translated || plain });
      setProgress({ done: i + 1, total: entries.length });
    }
    setTranslatedEntries(out);
    setTranslating(false);
  }

  function cancelTranslate() {
    cancelRef.current = true;
    setTranslating(false);
  }

  function download() {
    if (!translatedEntries) return;
    const base = fileName.replace(/\.srt$/i, "") || "subtitles";
    downloadTextFile(`${base}.${targetLang}.srt`, serializeSRT(translatedEntries), "text/plain;charset=utf-8");
  }

  const boxStyle = {
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 14,
    backgroundColor: colors.cardBg || "white",
  };

  return (
    <div style={boxStyle}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{tr("srtToolTitle", uiLang)}</span>
        {open ? <ChevronUp size={18} color={colors.inkSoft} /> : <ChevronDown size={18} color={colors.inkSoft} />}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 8, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>
            {tr("srtToolDesc", uiLang)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
            >
              {tr("srtToolChooseFile", uiLang)}
            </button>
            {fileName && <span style={{ fontSize: 12, color: colors.inkSoft, fontFamily: uiLang === "en" ? fontLatin : fontFa }}>{fileName} ({trf("srtToolLinesCount", uiLang, { n: uiLang === "en" ? entries.length : toFaDigits(String(entries.length)) })})</span>}
          </div>

          {entries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
              <select
                value={targetLang}
                onChange={(e) => { setTargetLang(e.target.value); setTranslatedEntries(null); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
              >
                {langOptions.map((l) => (
                  <option key={l.code} value={l.code}>{uiLang === "en" ? englishLangName(l.code) : l.label}</option>
                ))}
              </select>

              {!translating ? (
                <button
                  onClick={translateAll}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.teal, color: "white", fontWeight: 600, fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {tr("srtToolTranslate", uiLang)}
                </button>
              ) : (
                <button
                  onClick={cancelTranslate}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.rose, color: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {trf("srtToolStop", uiLang, { done: uiLang === "en" ? progress.done : toFaDigits(String(progress.done)), total: uiLang === "en" ? progress.total : toFaDigits(String(progress.total)) })}
                </button>
              )}

              {translatedEntries && !translating && (
                <button
                  onClick={download}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${colors.teal}`, color: colors.teal, background: "white", fontSize: 13, fontFamily: uiLang === "en" ? fontLatin : fontFa }}
                >
                  {tr("srtToolDownload", uiLang)}
                </button>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: colors.rose, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
