// پل وضعیتِ بین کامپوننت‌ها (جایگزین متغیرهای let سراسری)
// این متغیرها قبلاً `let`های سراسریِ app.jsx بودن و از چند کامپوننت مقداردهی/خوانده می‌شدن.
// چون ماژول‌ها نمی‌تونن به متغیرِ import‌شده مقدار بدن، همه‌شون تویِ یک آبجکتِ مشترک جمع شدن:
// به‌جای `x = ...` حالا `bridge.x = ...` نوشته می‌شه.
export const bridge = {
  // آخرین متن/زبانِ داستان — چون GlobalAddToStorySelection سراسریه و مستقیم
  // به StoryBuilder دسترسی نداره، از همین متغیر برای ساختنِ کلیدِ درستِ
  // speechController موقعِ به‌خاطرسپردنِ نقطه‌ی ادامه استفاده می‌کنه.
  latestStoryTextContext: { text: "", code: "" },
  // همون دلیلِ latestStoryTextContext بالا: GlobalAddToStorySelection سراسریه
  // و مستقیم به هوکِ useStoryUserAudio (که داخلِ PhrasebookMain ساخته می‌شه)
  // دسترسی نداره. پس هر بار حالتِ صوتِ آپلودیِ کاربر عوض بشه (پلیر رو حالتِ
  // «صوتِ من» گذاشته/برداشته، فایل آپلود/حذف شده)، PhrasebookMain همین
  // متغیر رو به‌روز نگه می‌داره تا GlobalAddToStorySelection، درست مثلِ
  // speechController.pauseForFocus برای TTS، بتونه صوتِ آپلودی رو هم موقعِ
  // بازشدنِ پاپ‌آپِ لغت مکث کنه.
  activeUserAudioFocusPause: null, // function | null
  // درست مثلِ activeUserAudioFocusPause، ولی نسخه‌ی «مکثِ سادهِ بدونِ تایمرِ
  // خودکار» (userAudio.pause خامِ خودِ هوک) — GlobalAddToStorySelection وقتی
  // کاربر صراحتاً روی 🔊ِ پاپ‌آپ می‌زنه از این استفاده می‌کنه، چون این کار
  // خودش تایمرِ سه‌ثانیه‌ایِ pauseForFocus (که با بازشدنِ پاپ‌آپ شروع شده
  // بود) رو هم لغو می‌کنه — وگرنه ممکن بود صوتِ آپلودی وسطِ خواندنِ همون
  // لغت با TTS، خودش‌به‌خود (زودتر از موعد) دوباره پخش بشه.
  activeUserAudioPause: null, // function | null
  // همون دلیلِ activeUserAudioFocusPause بالا: وقتی کاربر داخلِ پاپ‌آپِ لغت
  // روی 🔊 می‌زنه تا تلفظِ تکیِ همون لغت با TTS خونده بشه (درحالی‌که پلیرِ
  // اصلی رو حالتِ «صوتِ من» ایستاده)، بعد از تمومِ خواندنِ همون لغت باید
  // خودِ صوتِ آپلودیِ کاربر خودکار ادامه پیدا کنه — نه اینکه بمونه پازشده یا
  // خواندنِ کلِ داستان به TTS بیفته. activeUserAudioPlay دقیقاً همون
  // userAudio.play (بدونِ منطقِ تایمرِ سه‌ثانیه‌ایِ pauseForFocus) رو در
  // دسترسِ GlobalAddToStorySelection می‌ذاره تا بتونه خودش، بعد از پایانِ
  // خواندنِ لغت + یه مکثِ کوتاه، صدا بزنتش.
  activeUserAudioPlay: null, // function | null
  // Set once by PhrasebookMain (below) so any ClickableSentence popover,
  // wherever it's rendered, can hand a word off to the Grammar tab without
  // threading a callback prop through every intermediate component — same
  // escape hatch style as the SAVED_WORDS_CHANGED_EVENT plumbing above.
  requestGrammarJump: null,
  // Same escape-hatch style as requestGrammarJump above: lets the word-tap
  // popover (ClickableSentence) add a word straight into the Leitner review
  // pool without threading boxes/setBoxes through every intermediate
  // component. Set once by PhrasebookMain.
  requestAddToLeitner: null,
};
