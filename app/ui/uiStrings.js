// متن‌های رابط (فارسی/انگلیسی) و tr/trf
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// Small translation dictionary for the app's own interface strings.
// Currently covers the Settings panel and the main tab bar; more screens
// can be added to this table the same way over time.
const UI_STRINGS = {
  settingsTitle: { fa: "تنظیمات", en: "Settings" },
  account: { fa: "حساب کاربری", en: "Account" },
  guestUser: { fa: "کاربر", en: "User" },
  logout: { fa: "خروج از حساب", en: "Log out" },
  themeSectionTitle: { fa: "رنگ و تم", en: "Color & theme" },
  fontSectionTitle: { fa: "نوع فونت", en: "Font style" },
  fontSizeTitle: { fa: "اندازه‌ی فونت", en: "Font size" },
  languageSectionTitle: { fa: "زبان نرم‌افزار", en: "App language" },
  offlineDownload: { fa: "دانلود آفلاین لغات", en: "Download offline words" },
  calendarSectionTitle: { fa: "تقویم تاریخ‌ها", en: "Date calendar" },
  calendarJalali: { fa: "شمسی", en: "Persian (Jalali)" },
  calendarGregorian: { fa: "میلادی", en: "Gregorian" },
  calendarBoth: { fa: "هر دو", en: "Both" },
  sortByLabel: { fa: "مرتب‌سازی", en: "Sort" },
  storyLangLevelSection: { fa: "۱. زبان و سطح داستان", en: "1. Story language & level" },
  storyWordsSection: { fa: "۲. انتخاب لغت‌ها", en: "2. Select words" },
  storyLevelLabel: { fa: "سطح داستان", en: "Story level" },
  storyContentTypeLabel: { fa: "نوع محتوا", en: "Content type" },
  storyLengthLabel: { fa: "طول داستان", en: "Story length" },
  storyRepeatCountLabel: { fa: "تعداد تکرار هر لغت", en: "Repeat count per word" },
  storyRepeatHint: { fa: "کمتر = داستان طبیعی‌تر و روان‌تر (پیشنهاد: ۲ تا ۴)", en: "Fewer = a more natural, flowing story (suggested: 2–4)" },
  srtToolTitle: { fa: "ترجمه‌ی زیرنویس (SRT)", en: "Subtitle translation (SRT)" },
  srtToolDesc: { fa: "یه فایلِ srt وارد کن، زبانِ مقصد رو انتخاب کن، ترجمه کن و فایلِ srtِ ترجمه‌شده رو دانلود کن — برای استفاده تو هر پلیرِ ویدیو/صوتِ دیگه.", en: "Upload an srt file, pick a target language, translate it, and download the translated srt file — for use in any video/audio player." },
  srtToolChooseFile: { fa: "انتخابِ فایل srt", en: "Choose srt file" },
  srtToolLinesCount: { fa: "{n} خط", en: "{n} lines" },
  srtToolTranslate: { fa: "ترجمه کن", en: "Translate" },
  srtToolStop: { fa: "توقف ({done}/{total})", en: "Stop ({done}/{total})" },
  srtToolDownload: { fa: "دانلودِ srt ترجمه‌شده", en: "Download translated srt" },
  srtToolErrEmptyFile: { fa: "فایل srt قابلِ خوندن نبود یا خالی بود.", en: "The srt file couldn't be read or was empty." },
  srtToolErrParse: { fa: "خطا در خواندنِ فایل srt.", en: "Error reading the srt file." },
  srtToolErrRead: { fa: "خطا در خواندنِ فایل.", en: "Error reading the file." },
  headerFromTo: { fa: "از {native} به {target}", en: "From {native} to {target}" },
  nativeLanguageLabel: { fa: "زبان مادری", en: "Native language" },
  targetLanguagesLabel: { fa: "زبان‌های مقصد", en: "Target languages" },
  translationOrderLabel: { fa: "ترتیب نمایش ترجمه‌ها (بکش تا جابجا بشه)", en: "Translation display order (drag to reorder)" },
  tabConversations: { fa: "دیالوگ‌های روزمره", en: "Daily dialogues" },
  tabStory: { fa: "داستان‌ساز", en: "Story generator" },
  tabSaved: { fa: "لغات ذخیره‌شده", en: "Saved words" },
  tabGrammar: { fa: "گرامر", en: "Grammar" },
  tabWords: { fa: "دیکشنری من", en: "My dictionary" },
  tabFavorites: { fa: "علاقه‌مندی‌ها", en: "Favorites" },
  tabVocabInUse: { fa: "لغات کاربردی", en: "Vocabulary in Use" },
  tabSlang: { fa: "اصطلاحات عامیانه", en: "Slang expressions" },
  tabReview: { fa: "مرور (جعبه لایتنر)", en: "Review (Leitner box)" },
  tabSpeaking: { fa: "تمرین مکالمه", en: "Speaking practice" },
  groupTalk: { fa: "مکالمه", en: "Talk" },
  groupStory: { fa: "داستان‌ساز", en: "Story" },
  groupWords: { fa: "لغات", en: "Words" },
  groupPractice: { fa: "تمرین", en: "Practice" },
  groupSaved: { fa: "ذخیره‌ها", en: "Saved" },
  storyModeCreate: { fa: "ساخت داستان", en: "Create story" },
  storyModeLibrary: { fa: "کتابخانه‌ی من", en: "My library" },
  tabsCustomizeTitle: { fa: "شخصی‌سازی تب‌ها", en: "Customize tabs" },
  tabsCustomizeHint: { fa: "با فلش‌ها ترتیبِ تب‌ها رو عوض کن.", en: "Use the arrows to reorder tabs." },
  tabsGroupHeader: { fa: "تب‌های بالا (هدر)", en: "Header tabs" },
  tabsGroupBar: { fa: "نوار تب‌ها", en: "Tab bar" },
  tabsMoveUp: { fa: "انتقال به قبل", en: "Move earlier" },
  tabsMoveDown: { fa: "انتقال به بعد", en: "Move later" },
  tabsResetOrder: { fa: "بازگشت به ترتیبِ پیش‌فرض", en: "Reset to default order" },
  // Login / signup screen
  loginTitle: { fa: "ورود به LingoLearn", en: "Sign in to LingoLearn" },
  signupTitle: { fa: "ساخت حساب کاربری", en: "Create an account" },
  loginSubtitle: { fa: "برای ذخیره‌ی پیشرفت و واژه‌هایتان وارد شوید", en: "Sign in to save your progress and words" },
  continueWithGoogle: { fa: "ورود با حساب گوگل", en: "Continue with Google" },
  orWithEmail: { fa: "یا با ایمیل", en: "or with email" },
  namePlaceholder: { fa: "نام شما", en: "Your name" },
  emailPlaceholder: { fa: "ایمیل", en: "Email" },
  passwordPlaceholder: { fa: "رمز عبور", en: "Password" },
  signupSubmit: { fa: "ساخت حساب", en: "Create account" },
  loginSubmit: { fa: "ورود", en: "Sign in" },
  haveAccount: { fa: "حساب دارید؟", en: "Already have an account?" },
  noAccount: { fa: "حساب ندارید؟", en: "Don't have an account?" },
  goToLogin: { fa: "وارد شوید", en: "Sign in" },
  goToSignup: { fa: "بسازید", en: "Create one" },
  fillAllFields: { fa: "همه‌ی فیلدها را پر کنید.", en: "Please fill in all fields." },
  googleSignInFailed: { fa: "ورود با گوگل ناموفق بود: ", en: "Google sign-in failed: " },
  tryAgain: { fa: "دوباره تلاش کنید.", en: "Please try again." },
  verifyEmailSent: { fa: "یک ایمیل تایید برایتان فرستاده شد. لطفاً ایمیلتان را باز کنید و لینک را بزنید، بعد وارد شوید.", en: "A verification email has been sent. Please open it and click the link, then sign in." },
  emailAlreadyRegistered: { fa: "این ایمیل قبلاً ثبت شده. وارد شوید.", en: "This email is already registered. Please sign in." },
  invalidCredentials: { fa: "ایمیل یا رمز عبور اشتباه است.", en: "Incorrect email or password." },
  emailNotConfirmed: { fa: "هنوز ایمیلتان را تایید نکرده‌اید — صندوق ورودی را چک کنید.", en: "Your email isn't verified yet — please check your inbox." },
  genericError: { fa: "خطایی رخ داد. دوباره تلاش کنید.", en: "Something went wrong. Please try again." },
  // زبان‌های خواندنِ بلند (Settings)
  voiceSectionTitle: { fa: "زبان‌های خواندن با صدای بلند", en: "Read-aloud languages" },
  installLanguagePacks: { fa: "نصب بسته‌های زبان", en: "Install language packages" },
  installLanguagePacksHint: {
    fa: "برای اینکه گوشی بتواند زبان‌های بیشتری را با صدای بلند بخواند، از تنظیمات گوشی بسته‌ی صوتی همان زبان را نصب کنید.",
    en: "To let your phone read more languages aloud, install that language's voice package from your phone's settings.",
  },
  voiceNotInstalled: { fa: "روی این گوشی نصب نیست", en: "Not installed on this device" },
  voiceInstalledCount: { fa: "صدای نصب‌شده", en: "installed voice(s)" },
  voicePickLabel: { fa: "انتخاب صدا", en: "Choose voice" },
  voiceAutoOption: { fa: "خودکار (پیشنهاد نرم‌افزار)", en: "Automatic (app default)" },
  persianVoiceNote: {
    fa: "فارسی به‌صورت خودکار و رایگان از اینترنت خوانده می‌شود؛ نیازی به نصب چیزی نیست.",
    en: "Persian is read automatically over the internet for free; nothing to install.",
  },
  androidInstallSteps: {
    fa: "اگر دکمه‌ی بالا تنظیمات را باز نکرد، به این مسیر بروید: تنظیمات گوشی ⟵ زبان و ورودی ⟵ تبدیل متن به گفتار ⟵ موتور گوگل ⟵ نصب داده‌ی صوتی زبان‌ها",
    en: "If the button above doesn't open settings, go to: Phone Settings ⟶ Language & input ⟶ Text-to-speech output ⟶ Google engine ⟶ Install voice data",
  },
  iosInstallSteps: {
    fa: "به این مسیر بروید: تنظیمات آیفون ⟵ دسترس‌پذیری ⟵ محتوای گفتاری ⟵ صداها، و زبان مورد نظر را دانلود کنید.",
    en: "Go to: iPhone Settings ⟶ Accessibility ⟶ Spoken Content ⟶ Voices, and download the language you need.",
  },
  desktopInstallSteps: {
    fa: "ویندوز: تنظیمات ⟵ زمان و زبان ⟵ گفتار ⟵ مدیریت صداها. مک: تنظیمات سیستم ⟵ دسترس‌پذیری ⟵ محتوای گفتاری ⟵ مدیریت صداها.",
    en: "Windows: Settings ⟶ Time & language ⟶ Speech ⟶ Manage voices. Mac: System Settings ⟶ Accessibility ⟶ Spoken Content ⟶ Manage Voices.",
  },
  searchWordsPlaceholder: { fa: "جستجوی لغت...", en: "Search words..." },
  searchConversationsPlaceholder: { fa: "جستجوی مکالمه...", en: "Search conversations..." },
  searchPhrasesPlaceholder: { fa: "جستجوی عبارت...", en: "Search phrases..." },
  noWordsForSearch: { fa: "چیزی با این جستجو پیدا نشد.", en: "Nothing found for this search." },
  noWordsToShow: { fa: "چیزی برای نمایش نیست.", en: "Nothing to show." },
  noWordsInList: { fa: "لغتی برای نمایش نیست.", en: "No words to show." },
  personalBadge: { fa: "شخصی", en: "Custom" },
  addToFavoritesAria: { fa: "افزودن به علاقه‌مندی‌ها", en: "Add to favorites" },
  noFavoritesYet: {
    fa: "هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی. روی ⭐ کنار هر عبارت یا لغت بزن.",
    en: "You haven't added anything to favorites yet. Tap ⭐ next to any phrase or word.",
  },
  favoritesWordsHeading: { fa: "لغات", en: "Words" },
  noPhrasesForSearch: { fa: "چیزی با این جستجو پیدا نشد.", en: "Nothing found for this search." },
  noPhrasesToShow: { fa: "چیزی برای نمایش نیست.", en: "Nothing to show." },
  // پنلِ لغاتِ ذخیره‌شده
  savedWordsTitle: { fa: "لغات ذخیره‌شده", en: "Saved words" },
  savedWordsHint: {
    fa: "لغاتی که با دکمه‌ی «ذخیره برای داستان بعدی» نشون کردی، یا موقع ساختن هر داستانی انتخاب کردی، همه‌شون اینجا جمع می‌شن. هرکدوم رو خواستی بزن تا انتخاب بشه، بعد «افزودن به داستان‌ساز» رو بزن.",
    en: "Words you marked with \"Save for next story\", or picked while building a story, all collect here. Tap any to select it, then hit \"Add to Story Builder\".",
  },
  searchSavedWords: { fa: "جستجو در لغات ذخیره‌شده...", en: "Search saved words..." },
  clearSearchAria: { fa: "پاک کردن جستجو", en: "Clear search" },
  deselectAll: { fa: "لغو انتخاب همه", en: "Deselect all" },
  selectAll: { fa: "انتخاب همه", en: "Select all" },
  clearAllWords: { fa: "پاک کردن همه", en: "Clear all" },
  deleteNSelected: { fa: "حذف {n} انتخاب‌شده", en: "Delete {n} selected" },
  noSavedWordsYet: {
    fa: "هنوز لغتی ذخیره نکردی. روی هر کلمه‌ی داخل متن‌ها بزن و از پاپ‌آپش «ذخیره برای داستان بعدی» رو انتخاب کن، یا موقع ساخت داستان لغت انتخاب کن.",
    en: "You haven't saved any words yet. Tap any word in the texts and choose \"Save for next story\" from its popup, or pick words while building a story.",
  },
  noSavedWordsForSearch: { fa: "با این جستجو لغتی پیدا نشد.", en: "No words found for this search." },
  addNWordsToStory: { fa: "افزودن {n} لغت به داستان‌ساز", en: "Add {n} word(s) to Story Builder" },
  addToStoryBuilder: { fa: "افزودن به داستان‌ساز", en: "Add to Story Builder" },
  longPressToJump: { fa: "نگه‌دار تا به منبعِ این لغت بری", en: "Press and hold to jump to this word's source" },
  deletePermanently: { fa: "حذف دائمی", en: "Delete permanently" },
  confirmDeleteSelectedWords: { fa: "حذف دائمی {n} لغت انتخاب‌شده؟", en: "Permanently delete {n} selected word(s)?" },
  wordsDeletedMsg: { fa: "{n} لغت حذف شد", en: "{n} word(s) deleted" },
  confirmClearFiltered: { fa: "{n} لغتِ در حال نمایش برای همیشه پاک بشن؟", en: "Permanently clear the {n} word(s) currently shown?" },
  confirmClearAllSaved: { fa: "همه‌ی {n} لغت ذخیره‌شده برای همیشه پاک بشن؟", en: "Permanently clear all {n} saved word(s)?" },
  wordsClearedMsg: { fa: "{n} لغت پاک شد", en: "{n} word(s) cleared" },
  jumpedToOriginMsg: { fa: "رفتیم به همون بخشی که «{word}» ازش ذخیره شده بود", en: "Jumped to where \"{word}\" was saved from" },
  jumpToOriginUnknownMsg: { fa: "منبعِ این لغت مشخص نیست (احتمالاً قبل از این قابلیت ذخیره شده)", en: "This word's source isn't known (likely saved before this feature existed)" },
  // پیام‌های حبابِ آدمکِ Lingova — طبقِ سیستمِ زبانِ نرم‌افزار (uiLang) انتخاب می‌شن
  lingovaBubbleRead: { fa: "بخون دیگه! 📖", en: "Come on, keep reading! 📖" },
  lingovaBubbleKeepGoing: { fa: "ادامه‌شو بخون!", en: "Keep going with it!" },
  lingovaBubbleStillThere: { fa: "هنوز اونجایی؟ 👀", en: "Still there? 👀" },
  lingovaBubbleHeyYou: { fa: "با توام‌ها، بخون!", en: "Hey, I'm talking to you — read!" },
};
// t(key, uiLang) — looks up a UI string in the current software language,
// falling back to Persian if the key or language is missing.
export function tr(key, uiLang) {
  const entry = UI_STRINGS[key];
  if (!entry) return key;
  return entry[uiLang] || entry.fa;
}
// نسخه‌ی «قالب‌دار»ِ tr — برای رشته‌هایی که یه عدد یا کلمه وسطشون جا می‌گیره
// (مثلاً «{n} لغت حذف شد»). values یه آبجکتِ ساده‌ست: { n: 3 } یا { added: 2, skipped: 1 }.
export function trf(key, uiLang, values) {
  let s = tr(key, uiLang);
  Object.entries(values || {}).forEach(([k, v]) => {
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  });
  return s;
}
