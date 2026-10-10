// خروجی Markdown و دانلود فایل متنی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { VOCAB } from "../../VOCAB.js";
import { LANGUAGES } from "../constants/languages.js";
import { POS_FA } from "../constants/levels.js";
import { CATEGORIES, conversation } from "../constants/categories.js";

export function downloadTextFile(filename, content, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function conversationToMarkdown(nativeLang, targetOrder) {
  const langs = [nativeLang, ...targetOrder.filter((c) => c !== nativeLang)];
  const langLabels = langs.map((c) => LANGUAGES.find((l) => l.code === c)?.label || c);
  let md = `# LingoLearn — عبارات\n\nزبان‌ها: ${langLabels.join(" / ")}\n\n`;
  const byCategory = {};
  conversation .forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    md += `## ${CATEGORIES[cat] || cat}\n\n`;
    items.forEach((p) => {
      const parts = langs.map((l) => p.t[l]).filter(Boolean);
      md += `- **[${p.level}]** ${parts.join(" — ")}\n`;
    });
    md += `\n`;
  });
  return md;
}
function vocabToMarkdown() {
  let md = `# LingoLearn — دیکشنری\n\n`;
  VOCAB.forEach((v) => {
    md += `- **${v.t.en || v.t.fa}** _(${v.level}, ${POS_FA[v.pos] || v.pos})_ — ${v.meaningFa}\n`;
  });
  return md;
}
