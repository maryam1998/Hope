// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { detectTextCEFRLevel } from "../constants/languages.js";
import { useCallback } from "react";

export function useImportYtSaved({
  setSavedStories,
  ytImportBusyRef,
}) {
  const importYtSaved = useCallback(async () => {
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BubblePlugin;
    if (!B || !B.ytSavedList || ytImportBusyRef.current) return;
    ytImportBusyRef.current = true;
    try {
      const res = await B.ytSavedList();
      const items = (res && res.items) || [];
      if (!items.length) return;
      setSavedStories((prev) => {
        let next = [...prev];
        for (const it of items) {
          if (!it || !it.key) continue;
          const lines = []; // زیرنویس‌ها ذخیره نمی‌شوند؛ فقط عنوان/لینک/منبع
          const at = next.findIndex((x) => x.ytKey === it.key);
          if (at >= 0) {
            const old = next[at];
            const byT = new Map();
            for (const l of old.ytLines || []) byT.set(Math.round((l.t || 0) * 1000), l);
            for (const l of lines) {
              const k = Math.round((l.t || 0) * 1000);
              const o = byT.get(k);
              byT.set(k, { ...l, tr: { ...((o && o.tr) || {}), ...(l.tr || {}) } });
            }
            const merged = [...byT.values()].sort((a, b) => (a.t || 0) - (b.t || 0));
            next[at] = {
              ...old,
              ytLines: [],
              ytTargets: it.targets || old.ytTargets,
              savedAt: it.savedAt || old.savedAt,
              ytSource: it.source || old.ytSource || null,
              ytUrl: it.url || old.ytUrl || "",
              ytChannel: it.channel || old.ytChannel || "",
              title: (it.live && it.source && it.title) ? it.title : old.title,
            };
          } else {
            let level = "B1";
            try { level = detectTextCEFRLevel(lines.map((l) => l.s).join(" ")) || level; } catch (e) { /* ignore */ }
            next = [{
              id: Number(it.rev) || Date.now(),
              ytSession: true,
              ytKey: it.key,
              ytLive: !!it.live,
              ytVideoId: it.videoId || "",
              ytUrl: it.url || "",
              ytChannel: it.channel || "",
              ytSource: it.source || null,
              ytTargets: it.targets || [],
              ytLines: lines,
              title: it.title || (it.live ? "ترجمه‌ی زنده" : ""),
              storyLang: it.lang || "en",
              storyLevel: level,
              contentType: "general",
              storyLength: "medium",
              selectedWords: [],
              paragraphs: [],
              savedAt: it.savedAt || new Date().toISOString(),
            }, ...next];
          }
        }
        return next;
      });
      try { await B.ytSavedAck({ items: items.map((it) => ({ key: it.key, rev: it.rev })) }); } catch (e) { /* ignore */ }
    } catch (e) {
      /* بدونِ پلاگین/خطا: چیزی برای وارد کردن نیست */
    } finally {
      ytImportBusyRef.current = false;
    }
  }, [setSavedStories]);
  return importYtSaved;
}

export function createSaveCurrentStory({
  contentType,
  currentStoryId,
  paragraphs,
  selectedWords,
  setCurrentStoryId,
  setSavedStories,
  storyLang,
  storyLength,
  storyLevel,
}) {
  const saveCurrentStory = () => {
    if (!paragraphs.length) return;
    // اگه همین داستان (بدونِ تغییر) از قبل ذخیره شده (currentStoryId ست
    // شده)، دوباره یه کپیِ تکراری نساز — قبلاً هر بار کلیک، یه ورودیِ
    // جدید و تکراری به «داستان‌های ذخیره‌شده» اضافه می‌کرد.
    if (currentStoryId) return;
    const entry = {
      id: Date.now(),
      storyLang,
      storyLevel,
      contentType,
      storyLength,
      selectedWords,
      paragraphs,
      savedAt: new Date().toISOString(),
    };
    setSavedStories((prev) => [entry, ...prev]);
    setCurrentStoryId(entry.id);
  };
  return saveCurrentStory;
}

export function createSavePdfToStories({
  pdfViewDocId,
  pdfViewPages,
  pdfViewPersisted,
  pdfViewTitle,
  setSavedStories,
}) {
  // 🆕 دکمه‌ی «ذخیره در داستان‌ها»یِ خودِ نمایشگرِ PDF — سندِ PDF از قبل با
  // بازشدنش خودکار تویِ IndexedDBِ خودش ذخیره شده (savePdfViewMeta/Page)،
  // این دکمه فقط یه کارتِ سبک (اشاره‌گر) براش تویِ همون لیستِ یکپارچه‌ی
  // «داستان‌های ذخیره‌شده» می‌سازه، دقیقاً مثلِ بقیه‌ی داستان‌ها — با آیکونِ
  // 📄 کنارش (شبیهِ همون 🎵ای که برای صوتِ آپلودی گذاشته شده).
  const savePdfToStories = () => {
    // 🩹 اگه ذخیره‌سازیِ واقعیِ صفحات تو IndexedDB شکست خورده باشه، دیگه
    // کارتِ اشاره‌گر نساز — چون بعداً بازکردنش هیچی نشون نمی‌ده (دقیقاً
    // همون باگی که قبلاً باعث می‌شد کارت باشه ولی خالی باز بشه).
    if (!pdfViewDocId || !pdfViewPersisted) return;
    setSavedStories((prev) => {
      if (prev.some((s) => s.pdfDocId === pdfViewDocId)) return prev; // قبلاً ذخیره شده
      const entry = {
        id: Date.now(),
        pdfDocId: pdfViewDocId,
        title: pdfViewTitle,
        pageCount: pdfViewPages.length,
        savedAt: new Date().toISOString(),
      };
      return [entry, ...prev];
    });
  };
  return savePdfToStories;
}
