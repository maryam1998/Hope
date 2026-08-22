// این فایل به‌صورتِ Web Worker اجرا می‌شه — یعنی کاملاً جدا از threadِ اصلیِ
// صفحه. قبلاً لودِ مدل و خودِ رونویسی مستقیماً تویِ کامپوننتِ React (روی
// threadِ اصلی) اجرا می‌شد؛ چون WebAssembly برای محاسباتِ سنگین (مثلِ
// دانلود+کامپایلِ مدلِ Whisper، یا رونویسیِ چند دقیقه صدا) هیچ‌وقت به
// event loop برنمی‌گرده، کل صفحه (حتی دکمه‌ها/اسکرول) قفل می‌شد — دقیقاً
// همون چیزی که باعث می‌شد اپ «هنگ» به‌نظر برسه و کاربر مجبور بشه با
// force-quit خارج بشه. با انتقالِ این کار به یه Worker جدا، threadِ اصلی
// همیشه آزاد می‌مونه، پیشرفتِ واقعی قابلِ نمایشه، و کاربر هر وقت خواست
// می‌تونه با یه دکمه لغوش کنه (worker.terminate()) بدون نیاز به بستنِ اپ.
//
// این Worker دو نوع پیام می‌گیره:
//   { type: "preload", modelId }              → فقط دانلود/آماده‌سازیِ مدل (دکمه‌ی تنظیمات)
//   { type: "transcribe", pcmData, modelId }   → دانلود/آماده‌سازیِ مدل + رونویسیِ واقعی

let cachedTranscriber = null;
let cachedModelId = null;

// دانلود/آماده‌سازیِ مدل، با watchdog: اگه ۳۰ ثانیه هیچ پیشرفتی تویِ
// دانلود نیاد (مثلاً به‌خاطرِ محدودیتِ دسترسی به huggingface.co تویِ بعضی
// شبکه‌ها)، به‌جای هنگِ ابدی، خطایِ روشن می‌ده.
// نکته‌ی مهم: تویِ transformers.js، دیفالتِ dtype رویِ wasm از قبل خودش
// "q8" (کوانتایزِ int8) بود — یعنی کدِ قبلی هم از اولش کوانتایز بارگذاری
// می‌کرد و اینجا صراحتاً همون q8 رو نگه می‌داریم، فقط برایِ خوانایی.
// رویِ WebGPU اما یه باگِ شناخته‌شده تویِ خودِ transformers.js هست:
// دیکودرِ q8 با WebGPU برایِ مدل‌هایِ Whisper خروجیِ نامفهوم/بی‌معنی
// می‌ده (encoder سالمه، فقط decoder)؛ پس رویِ WebGPU از dtypeِ پیش‌فرضش
// (fp32) استفاده می‌کنیم، نه q8 — حجمِ دانلود بیشتره ولی خروجی درسته.
function dtypeFor(device) {
  return device === "webgpu" ? "fp32" : "q8";
}

// اگه مرورگر از WebGPU پشتیبانی کنه، اجراش رو بهش می‌سپاریم (چند برابرِ
// wasm سریع‌تره)؛ در غیرِ این صورت (یا اگه خودِ بارگذاری با WebGPU خطا
// بده) به‌صورتِ خودکار به wasm برمی‌گردیم — پس رویِ گوشی/مرورگرِ قدیمی‌تر
// هم چیزی نمی‌شکنه.
async function pickDevice() {
  try {
    if (self.navigator?.gpu && (await self.navigator.gpu.requestAdapter())) {
      return "webgpu";
    }
  } catch {
    // ignore — می‌ریم سراغِ wasm
  }
  return "wasm";
}

async function loadWithWatchdog(pipelineFn, modelId, device) {
  let lastProgressAt = Date.now();
  const modelPromise = pipelineFn("automatic-speech-recognition", modelId, {
    dtype: dtypeFor(device),
    device,
    progress_callback: (p) => {
      lastProgressAt = Date.now();
      if (p?.status === "progress" && Number.isFinite(p.progress)) {
        self.postMessage({ type: "model-progress", progress: p.progress });
      }
    },
  });
  let stallTimer;
  const stallPromise = new Promise((_, reject) => {
    stallTimer = setInterval(() => {
      if (Date.now() - lastProgressAt > 30000) {
        clearInterval(stallTimer);
        reject(new Error("دانلود/آماده‌سازیِ مدل بیش از ۳۰ ثانیه بدونِ پیشرفت متوقف موند — احتمالاً دسترسی به سرورِ مدل تویِ این شبکه محدوده."));
      }
    }, 3000);
  });
  try {
    return await Promise.race([modelPromise, stallPromise]);
  } finally {
    clearInterval(stallTimer);
  }
}

async function ensureModelLoaded(modelId) {
  if (cachedTranscriber && cachedModelId === modelId) {
    self.postMessage({ type: "model-progress", progress: 100 });
    return cachedTranscriber;
  }
  const { pipeline, env } = await import("https://esm.sh/@huggingface/transformers@3.0.0");
  env.allowLocalModels = false;

  const device = await pickDevice();
  try {
    cachedTranscriber = await loadWithWatchdog(pipeline, modelId, device);
  } catch (err) {
    // اگه انتخابِ WebGPU بود و خودِ بارگذاری (نه تایم‌اوت) شکست خورد، یه بار
    // دیگه با wasm امتحان می‌کنیم — بعضی مرورگرها navigator.gpu رو دارن ولی
    // موقعِ ساختِ واقعیِ pipeline خطا می‌دن.
    if (device === "webgpu" && !/بیش از ۳۰ ثانیه/.test(err?.message || "")) {
      cachedTranscriber = await loadWithWatchdog(pipeline, modelId, "wasm");
    } else {
      throw err;
    }
  }
  cachedModelId = modelId;
  return cachedTranscriber;
}

self.onmessage = async (e) => {
  const { type, pcmData, modelId } = e.data || {};

  if (type === "preload") {
    try {
      await ensureModelLoaded(modelId);
      self.postMessage({ type: "done" });
    } catch (err) {
      self.postMessage({ type: "error", message: err?.message || err?.name || String(err || "خطای نامشخص") });
    }
    return;
  }

  if (type !== "transcribe") return;

  try {
    const transcriber = await ensureModelLoaded(modelId);

    const totalChunksEstimate = Math.max(1, Math.ceil(pcmData.length / 16000 / 25));
    let chunksDone = 0;
    let lastChunkAt = Date.now();

    // Watchdog جداگانه برای خودِ مرحله‌ی رونویسی (نه فقط دانلودِ مدل) — اگه
    // بینِ دو قطعه بیش از ۹۰ ثانیه هیچ پیشرفتی نباشه (که رویِ گوشی‌های خیلی
    // ضعیف هم بعیده)، به‌جای هنگِ ابدی، خطایِ روشن می‌ده.
    let transcribeWatchdog = setInterval(() => {
      if (Date.now() - lastChunkAt > 90000) {
        clearInterval(transcribeWatchdog);
        self.postMessage({ type: "error", message: "پردازشِ صدا بیش از ۹۰ ثانیه بدونِ پیشرفت متوقف موند." });
      }
    }, 5000);

    let result;
    try {
      result = await transcriber(pcmData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: "word",
        chunk_callback: () => {
          chunksDone++;
          lastChunkAt = Date.now();
          self.postMessage({ type: "chunk-progress", chunksDone, totalChunksEstimate });
        },
      });
    } finally {
      clearInterval(transcribeWatchdog);
    }

    self.postMessage({
      type: "done",
      text: (result?.text || "").trim(),
      chunks: Array.isArray(result?.chunks) ? result.chunks : [],
    });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || err?.name || String(err || "خطای نامشخص") });
  }
};
