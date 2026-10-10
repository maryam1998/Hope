// بخشی از StoryBuilder — هر تابع یه factory هست که وابستگی‌هاش (state/setterها) رو به‌صورتِ آبجکت می‌گیره؛ بدنه‌ی توابع دست‌نخورده.
import { setCachedTranslation } from "../storage/translationCacheDb.js";

export function createRetranslateStoryParagraph({
  paragraphs,
  retranslateOneSentenceText,
  setParagraphs,
  setRetranslatingSentences,
  storyLang,
}) {
  // نسخه‌ی پاراگرافیِ رفرش — وقتی نمایش روی حالتِ «پاراگراف» (نه جمله‌به‌جمله)
  // باشه، ترجمه‌ی کلِ پاراگراف از join همه‌ی s.t[code] ساخته می‌شه؛ پس رفرشِ
  // اینجا یعنی همه‌ی جمله‌های همون پاراگراف رو برای این زبان دوباره بگیریم.
  async function retranslateStoryParagraph(pi, code) {
    const key = `${pi}-all-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const sentences = paragraphs[pi]?.sentences || [];
      await Promise.all(
        sentences.map(async (s, si) => {
          try {
            const translated = await retranslateOneSentenceText(s.text || "", code);
            setCachedTranslation(s.text || "", code, storyLang, translated); // fire-and-forget — جایِ ترجمه‌ی غلطِ قبلی رو تو کش می‌گیره
            setParagraphs((prevParagraphs) => {
              const target = prevParagraphs[pi];
              const targetSentence = target?.sentences?.[si];
              if (!targetSentence) return prevParagraphs;
              const updated = [...prevParagraphs];
              const list = [...(target.sentences || [])];
              list[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
              updated[pi] = { ...target, sentences: list };
              return updated;
            });
          } catch {
            // این یکی شکست خورد؛ بقیه‌ی جمله‌ها همچنان ادامه می‌دن.
          }
        })
      );
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  return retranslateStoryParagraph;
}

export function createRetranslateStorySentence({
  retranslateOneSentenceText,
  setParagraphs,
  setRetranslatingSentences,
  storyLang,
}) {
  async function retranslateStorySentence(pi, si, code, text) {
    const key = `${pi}-${si}-${code}`;
    setRetranslatingSentences((prev) => ({ ...prev, [key]: true }));
    try {
      const translated = await retranslateOneSentenceText(text, code);
      setCachedTranslation(text || "", code, storyLang, translated); // fire-and-forget — جایِ ترجمه‌ی غلطِ قبلی رو تو کش می‌گیره
      setParagraphs((prevParagraphs) => {
        const target = prevParagraphs[pi];
        const targetSentence = target?.sentences?.[si];
        if (!targetSentence) return prevParagraphs;
        const updated = [...prevParagraphs];
        const sentences = [...(target.sentences || [])];
        sentences[si] = { ...targetSentence, t: { ...(targetSentence.t || {}), [code]: translated } };
        updated[pi] = { ...target, sentences };
        return updated;
      });
    } catch {
      // شکست خورد؛ ترجمه‌ی قبلی همون‌جا می‌مونه، کاربر می‌تونه دوباره امتحان کنه.
    } finally {
      setRetranslatingSentences((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }
  return retranslateStorySentence;
}
