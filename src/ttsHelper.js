import { Capacitor } from '@capacitor/core';

const BubblePlugin = Capacitor.Plugins.BubblePlugin;

let currentTtsLang = null;

/**
 * خواندن یک متن با TTS
 * @param {string} text - متنی که باید خونده بشه
 * @param {string} lang - کد زبان: "fa", "en", "ar", ...
 * @param {number} speed - سرعت (1.0 = عادی)
 */
export async function speakText(text, lang = 'fa', speed = 1.0) {
  if (!BubblePlugin || !text) return false;
  try {
    const status = await BubblePlugin.checkTtsStatus({ lang });
    if (!status.supported) {
      console.warn('[TTS] زبان پشتیبانی نمی‌شه:', lang);
      return false;
    }
    if (!status.downloaded) {
      console.warn('[TTS] بسته دانلود نشده:', lang);
      return false;
    }
    await BubblePlugin.speak({ text, lang, speed });
    currentTtsLang = lang;
    return true;
  } catch (e) {
    console.error('[TTS] خطا:', e);
    return false;
  }
}

/** توقف خواندن */
export async function stopSpeaking() {
  if (!BubblePlugin) return;
  try { await BubblePlugin.stopSpeaking(); } catch (e) {}
}

/** بررسی وضعیت بسته‌ی TTS */
export async function checkTtsStatus(lang) {
  if (!BubblePlugin) return { supported: false, downloaded: false };
  try {
    return await BubblePlugin.checkTtsStatus({ lang });
  } catch (e) {
    return { supported: false, downloaded: false };
  }
}

/** دانلود بسته‌ی TTS */
export async function downloadTtsModel(lang, onProgress) {
  if (!BubblePlugin) return;
  const p = await BubblePlugin.addListener('ttsModelDownloadProgress', (d) => {
    if (onProgress) onProgress(d.bytes);
  });
  const dn = await BubblePlugin.addListener('ttsModelDownloadDone', () => {
    p.remove(); dn.remove();
  });
  const er = await BubblePlugin.addListener('ttsModelDownloadError', (d) => {
    p.remove(); dn.remove(); er.remove();
    console.error('[TTS] دانلود ناموفق:', d.error);
  });
  await BubblePlugin.downloadTtsModel({ lang });
}
