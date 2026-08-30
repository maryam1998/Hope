"""
سرویسِ هم‌گام‌سازیِ خودکار برایِ صوتِ آپلودیِ داستان — بک‌اندِ FastAPI که
app.jsx (تابعِ alignWithAI داخلِ useStoryUserAudio) بهش وصل می‌شه.

نکته‌ی مهم دربابِ روش: به‌جایِ اینکه بذاریم Whisper خودش صدا رو (از صفر)
transcribe کنه و بعد حدس بزنیم کدوم کلمه‌ش مالِ کدوم جمله‌ی متنِ داستانه،
مستقیماً متنِ *دقیقِ* خودِ داستان (که از قبل صد در صد درسته و از app.jsx
می‌رسه) رو به مدلِ alignment (wav2vec2 / forced alignment) می‌دیم. این یعنی
جایِ صداشناسیِ Whisper رو کلاً حذف می‌کنیم و فقط از قسمتِ alignment
استفاده می‌کنیم — دقیق‌تره چون دیگه لازم نیست حدس بزنیم Whisper هر کلمه رو
درست تشخیص داده یا نه، فقط می‌خوایم بفهمیم متنِ *شناخته‌شده* کِی گفته شده.

اجرا:
    pip install fastapi uvicorn python-multipart whisperx torch
    uvicorn whisperx_align_server:app --host 0.0.0.0 --port 8000

نیازمندِ GPU نیست (رویِ CPU هم کار می‌کنه، فقط کندتره) — ولی برایِ صداهایِ
طولانی (چند دقیقه‌ای)، GPU خیلی سریع‌تره. برایِ دیپلوی، می‌شه رویِ یه سرویسِ
GPU-as-a-service (مثلِ Modal، RunPod، یا هر VPS با GPU) بالا آورد.

فرمتِ درخواست (از app.jsx):
    POST /align   (multipart/form-data)
      audio:      فایلِ صوتی (هر فرمتی که ffmpeg بشناسه)
      language:   کدِ زبان (مثلاً "en")
      sentences:  JSON — [{ "pi": 0, "si": 0, "text": "Hello everyone." }, ...]

فرمتِ پاسخ:
    { "0-0": 0.20, "0-1": 1.98, ... }   — یعنی نگاشتِ همون "pi-si" -> ثانیه‌ی
    شروعِ اون جمله؛ دقیقاً همون شکلی که app.jsx با setBulkTimestamps ذخیره‌ش
    می‌کنه.
"""

import json
import re
import tempfile
from pathlib import Path

import torch
import whisperx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# در پروداکشن، به‌جایِ "*"، فقط دامنه‌ی واقعیِ خودِ اپ رو بذار.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "float32"

# مدل‌هایِ alignment سنگین‌ان، پس یه‌بار لود می‌شن و بینِ درخواست‌ها کش
# می‌مونن (کلید: کدِ زبان) — نه هر درخواست از نو.
_align_model_cache: dict[str, tuple] = {}


def _get_align_model(language_code: str):
    if language_code not in _align_model_cache:
        model_a, metadata = whisperx.load_align_model(language_code=language_code, device=DEVICE)
        _align_model_cache[language_code] = (model_a, metadata)
    return _align_model_cache[language_code]


def _tokenize(text: str) -> list[str]:
    # ساده — فقط برایِ ساختنِ لیستِ کلمه‌ها که whisperx.align انتظار داره؛
    # علامت‌های نگارشی رو نگه نمی‌داریم چون مدلِ alignment با خودِ کلمه‌ها کار
    # می‌کنه، نه نشونه‌گذاری.
    return [w for w in re.split(r"\s+", text.strip()) if w]


@app.post("/align")
async def align(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    sentences: str = Form(...),
):
    try:
        sentence_list = json.loads(sentences)
    except json.JSONDecodeError:
        raise HTTPException(400, "فیلدِ sentences باید JSON معتبر باشه")

    if not sentence_list:
        raise HTTPException(400, "لیستِ جمله‌ها خالیه")

    # فایلِ آپلودی رو موقتاً روی دیسک می‌نویسیم — whisperx.load_audio مسیرِ
    # فایل می‌خواد، نه بایت‌های خام.
    suffix = Path(audio.filename or "audio").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        audio_path = tmp.name

    try:
        audio_arr = whisperx.load_audio(audio_path)
        duration = len(audio_arr) / whisperx.audio.SAMPLE_RATE

        # کلِ متنِ داستان (همه‌ی جمله‌ها به‌ترتیب) رو به‌عنوانِ یه segmentِ
        # واحد، با بازه‌ی زمانیِ کلِ فایلِ صوتی، به alignment می‌دیم — چون
        # زمان‌بندیِ واقعیِ هر جمله رو نمی‌دونیم (دقیقاً همون چیزیه که
        # می‌خوایم ازش دربیاریم)، فقط می‌دونیم متنِ درست چیه.
        full_text = " ".join(s.get("text", "") for s in sentence_list).strip()
        segments = [{"text": full_text, "start": 0.0, "end": duration}]

        model_a, metadata = _get_align_model(language)
        aligned = whisperx.align(
            segments, model_a, metadata, audio_arr, DEVICE, return_char_alignments=False
        )

        # aligned["word_segments"] یه لیستِ تخته از {word, start, end} برمی‌گردونه
        # — به‌همون ترتیبِ متنی که دادیم، پس می‌شه با شمارشِ کلمه‌های هر جمله
        # (بدونِ نیاز به تطبیقِ متنی) رسوندش به pi/si.
        word_segments = aligned.get("word_segments", [])

        result: dict[str, float] = {}
        word_idx = 0
        for s in sentence_list:
            words_in_sentence = _tokenize(s.get("text", ""))
            n = len(words_in_sentence)
            if n == 0:
                continue
            chunk = word_segments[word_idx : word_idx + n]
            word_idx += n
            start_time = next(
                (w["start"] for w in chunk if w.get("start") is not None), None
            )
            if start_time is not None:
                result[f"{s['pi']}-{s['si']}"] = round(float(start_time), 2)

        return result
    finally:
        Path(audio_path).unlink(missing_ok=True)
