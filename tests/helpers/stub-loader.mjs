// تست‌ها فقط منطقِ خالص را می‌سنجند، نه رندرِ UI. بعضی ماژول‌های منطقی
// (مثلاً appPrefs) آیکون‌ها را از "lucide-react" import می‌کنند؛ این لودر
// آن کتابخانه را با یک stub جایگزین می‌کند تا تست‌ها بدونِ npm install هم
// اجرا شوند. نام‌های export از روی خودِ سورس‌ها (app/، ریشه) خوانده می‌شود،
// پس اگر آیکونِ تازه‌ای import شد، نیازی به ویرایشِ دستیِ stub نیست.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STUBBED = new Set(["lucide-react"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "tests") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(name) && !name.endsWith(".min.js")) out.push(p);
  }
  return out;
}

function collectIconNames() {
  const names = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g;
  for (const file of walk(ROOT)) {
    const src = readFileSync(file, "utf8");
    let m;
    while ((m = re.exec(src))) {
      for (const part of m[1].split(",")) {
        const n = part.trim().split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
      }
    }
  }
  return [...names];
}

export async function resolve(specifier, context, next) {
  if (STUBBED.has(specifier)) return { url: `stub:${specifier}`, shortCircuit: true };
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url === "stub:lucide-react") {
    const body = collectIconNames().map((n) => `export const ${n} = () => null;`).join("\n");
    return { format: "module", source: body || "export {};", shortCircuit: true };
  }
  return next(url, context);
}
