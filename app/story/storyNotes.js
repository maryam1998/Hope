// یادداشت‌های داستان
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// یادداشتِ آزادِ کاربر برای هر داستان — یک متنِ ساده (بدونِ محدودیتِ تعدادِ
// کلمه) که زیرِ خودِ داستان نگه‌داری می‌شه. با mainStoryKey (همون کلیدی که
// useStoryUserAudio هم استفاده می‌کنه) به داستانِ مشخص وصل می‌شه، پس هر
// داستان یادداشتِ مستقلِ خودش رو داره و با عوض‌شدنِ داستان، یادداشتِ داستانِ
// دیگه نشون داده می‌شه.
// ---------------------------------------------------------------------------
const STORY_NOTES_KEY = "phrasebook-story-notes-v1";
function loadStoryNotesMap() {
  try {
    const raw = window.localStorage.getItem(STORY_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}
function loadStoryNote(storyKey) {
  if (!storyKey) return "";
  const all = loadStoryNotesMap();
  return typeof all[storyKey] === "string" ? all[storyKey] : "";
}
function saveStoryNote(storyKey, text) {
  if (!storyKey) return;
  const all = loadStoryNotesMap();
  if (text && text.trim()) {
    all[storyKey] = text;
  } else {
    delete all[storyKey];
  }
  try {
    window.localStorage.setItem(STORY_NOTES_KEY, JSON.stringify(all));
  } catch {}
}
// هوکِ ساده‌ی یادداشتِ هر داستان — با عوض‌شدنِ storyKey (یعنی رفتن سراغِ
// داستانِ دیگه)، متنِ ذخیره‌شده‌ی همون داستان از localStorage خونده می‌شه؛
// هر تغییری هم بلافاصله (بدونِ دکمه‌ی جداگونه‌ی «ذخیره») روی همون کلید
// نوشته می‌شه.
export function useStoryNote(storyKey) {
  const [text, setText] = useState(() => loadStoryNote(storyKey));
  const lastKeyRef = useRef(storyKey);
  useEffect(() => {
    if (lastKeyRef.current !== storyKey) {
      lastKeyRef.current = storyKey;
      setText(loadStoryNote(storyKey));
    }
  }, [storyKey]);
  const update = (next) => {
    setText(next);
    saveStoryNote(storyKey, next);
  };
  return [text, update];
}
