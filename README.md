# کتاب مکالمه — راهنمای اجرا روی گوشی

این پوشه یک وب‌اپ کامل (PWA) است؛ نیازی به Xcode، Android Studio یا کامپایل ندارد.
فایل `app.jsx` مستقیم در مرورگر گوشی اجرا می‌شود (از طریق React + Babel که از CDN لود می‌شوند).

## ⚠️ نکته‌ی مهم
این فایل‌ها باید از طریق یک آدرس **https** سرو بشن (نه با دوبار کلیک کردن روی index.html)،
چون مرورگرها اجازه‌ی fetch کردن app.jsx با پروتکل file:// را نمی‌دهند.

## سریع‌ترین راه — تست فوری (چند ثانیه)
1. برو به https://app.netlify.com/drop
2. کل پوشه‌ی `phrasebook-app` (یا فایل zip باز شده‌اش) را داخل صفحه بکش و رها کن (Drag & Drop)
3. یک لینک https فوری می‌گیری — همان را روی گوشی باز کن

## راه دائمی و رایگان — GitHub Pages
1. یک ریپازیتوری جدید در GitHub بساز
2. محتوای این پوشه (index.html, app.jsx, manifest.json, sw.js, icons/) را در آن آپلود کن
3. از Settings → Pages، انتشار را از شاخه‌ی main فعال کن
4. بعد از چند دقیقه یک آدرس مثل `https://username.github.io/repo-name` خواهی داشت

## نصب روی گوشی (بعد از باز کردن لینک)
- **اندروید (Chrome):** منوی سه‌نقطه → "Add to Home screen" / "نصب اپ"
- **آیفون (Safari):** دکمه‌ی اشتراک‌گذاری (Share) → "Add to Home Screen"

بعد از نصب، آیکون اپ روی صفحه‌ی اصلی گوشی می‌آید و مثل یک اپ واقعی (تمام‌صفحه، بدون نوار آدرس) باز می‌شود.
داده‌های ذخیره‌شده (پیشرفت، کلمات نشان‌شده و...) در `localStorage` همان مرورگر/دستگاه می‌مانند.

## تست محلی روی کامپیوتر (اختیاری)
اگر Python نصب داری:
```
cd phrasebook-app
python3 -m http.server 8080
```
سپس در مرورگر: `http://localhost:8080`

## اتصال هوش مصنوعی (Story Generator + معنی کلمات)
اپ به یک بک‌اند وصل می‌شه، نه مستقیم به هوش مصنوعی (کلید API هیچ‌وقت داخل کد فرانت‌اند نیست).
پوشه‌ی `server/` یک بک‌اند آماده‌ست که به‌صورت پیش‌فرض از **DeepSeek** استفاده می‌کنه و اگه اون جواب نده، خودکار می‌ره سراغ **ChatGPT (OpenAI)** — یعنی نیازی به تنظیم دستی نیست. (Gemini در این پروژه پشتیبانی نمی‌شه، چون در برخی کشورها فیلتره.)

1. یک کلید از https://platform.deepseek.com/api_keys بگیر (و اختیاری، یک کلید OpenAI هم از https://platform.openai.com/api-keys برای فال‌بک)
2. پوشه‌ی `server/` را در یک ریپازیتوری جدا (یا همین ریپو) به Render دیپلوی کن:
   - Render → New → Web Service → ریپازیتوری را وصل کن → Root Directory: `server`
   - Build Command: `npm install` — Start Command: `npm start`
   - در Environment، `DEEPSEEK_API_KEY` (و در صورت تمایل `OPENAI_API_KEY`) را با کلیدهایی که گرفتی ست کن (بقیه‌ی متغیرها در `.env.example` توضیح داده شده)
3. آدرس Render که گرفتی (مثل `https://phrasebook-server-xxxx.onrender.com`) را در `app.jsx` جای `DEFAULT_BACKEND_URL` بذار
   (یا بدون تغییر کد، همون آدرس رو داخل خود اپ، در بخش «۱. زبان و سطح داستان» → کادر آدرس بک‌اند، وارد کن)

اگه خواستی فقط از یکی از این دو استفاده کنی (بدون فال‌بک)، `AI_PROVIDER` را در Render روی `deepseek` یا `openai` بذار. برای تغییر ترتیب یا فعال کردن فال‌بک دوطرفه، `AI_PROVIDER=openai,deepseek` را ست کن.
⚠️ سرویس رایگان Render بعد از چند دقیقه بی‌کاری می‌خوابه؛ اولین درخواست بعد از خواب تا ۵۰ ثانیه طول می‌کشه تا بیدار بشه.

## ورود با گوگل + همگام‌سازی بین دستگاه‌ها (Firebase)
برای این‌که لغات ذخیره‌شده، داستان‌ها و تاریخچه با حساب گوگل کاربر همراه بشه (نه فقط روی یک گوشی)،
اپ از **Firebase** (رایگان) استفاده می‌کنه:

1. https://console.firebase.google.com → Add project (رایگان)
2. Build → Authentication → Sign-in method → فعال کردن «Google»
3. Build → Firestore Database → Create database، و در Rules این را بذار:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Project settings (⚙️) → General → Your apps → Web app (`</>`) → مقادیر `firebaseConfig` را کپی کن
   و در `app.jsx` جای `FIREBASE_CONFIG` بذار (دقیقاً مثل جای‌گذاری `GOOGLE_CLIENT_ID` قبلی)

تا وقتی `FIREBASE_CONFIG.apiKey` پر نشده، اپ خودکار به حالت آزمایشی (حساب محلی/دمو، فقط همین مرورگر) برمی‌گرده.
