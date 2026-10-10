// ابزارهای Markdown ساده
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React from "react";
import { fontLatin } from "../ui/theme.js";

// A tiny, purpose-built Markdown renderer — just enough for the specific
// shapes lookupWordGrammarDetail()/askGrammarTeacher() are prompted to
// produce (## / ### headers, **bold**, `inline code`, "- " bullet lists,
// "---" rules, plain paragraphs). Avoids pulling in a full Markdown package
// for what's really a fixed, known set of formatting the AI is instructed
// to use.
export function mdInline(str, keyBase) {
  const parts = [];
  let rest = String(str || "");
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/;
  let key = 0;
  while (rest) {
    const m = rest.match(regex);
    if (!m) {
      parts.push(rest);
      break;
    }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[2] !== undefined) {
      parts.push(<b key={`${keyBase}-${key++}`}>{m[2]}</b>);
    } else if (m[3] !== undefined) {
      parts.push(
        <code
          key={`${keyBase}-${key++}`}
          dir="auto"
          style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontFamily: fontLatin }}
        >
          {m[3]}
        </code>
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}
// از متن مارک‌داونِ یک نکته‌ی گرامری، فقط جمله‌های زبان مقصد رو (برای خوندن
// با tts) بیرون می‌کشه — خط‌های ترجمه‌ی فارسی/زبان مادری، هدرها و علامت‌های
// مارک‌داون کنار گذاشته می‌شن، چون خوندنشون با صدای زبان مقصد اشتباه از آب
// در میاد.
export function extractSpeakableText(markdown) {
  if (!markdown) return "";
  const lines = String(markdown).split(/\r?\n/);
  const kept = [];
  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) continue; // headers
    if (/^-{3,}$/.test(line)) continue; // hr
    line = line.replace(/^[-*]\s+/, ""); // list bullets
    line = line.replace(/^(ترجمه|Translation)\s*:\s*/i, "TRANSLATION::"); // mark translation lines
    if (line.startsWith("TRANSLATION::")) continue;
    if (/[\u0600-\u06FF]/.test(line)) continue; // skip Persian/Arabic-script lines
    line = line.replace(/^[❌✅🟢🟡🔴]\s*/u, "");
    line = line.replace(/\*\*/g, "").replace(/`/g, "");
    line = line.replace(/^\*\*?🔹.*?:\*\*?/, "").trim();
    if (!line) continue;
    kept.push(line);
  }
  return kept.join(". ");
}
// تشخیصِ سرهم‌دستیِ اینکه یه خط عمدتاً با حروف فارسی/عربی نوشته شده یا نه —
// برای اینکه بفهمیم کدوم خط‌های داخل توضیح گرامری، جمله‌ی زبان مقصده (باید
// کنارش دکمه‌ی 🔊 بذاریم) و کدوم‌ها ترجمه/توضیح فارسیه (نیازی به 🔊 نداره).
export function isPersianScriptLine(s) {
  const persianChars = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const letters = (s.match(/[^\s\d.,;:!?()"'«»\-–—]/g) || []).length;
  return letters > 0 && persianChars / letters > 0.4;
}
export function stripMdInline(s) {
  return String(s || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}
