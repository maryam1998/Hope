# کتاب مکالمه — بک‌اند روی Cloudflare Workers

این پوشه جایگزین پوشه‌ی قبلی `server/` (Express روی Render) است. همون
endpoint (`POST /api/generate`) رو می‌ده، فقط روی Cloudflare Workers اجرا
می‌شه: بدون cold start، تیر رایگان سخاوتمندانه (۱۰۰ هزار request در روز).

## مراحل دیپلوی

1. Node.js نصب باشه (فقط برای CLI؛ خود Worker نیازی به Node نداره).
2. توی همین پوشه (`phrasebook-cf/`):
   ```bash
   npm install -g wrangler
   wrangler login
   ```
   یه تب مرورگر باز می‌شه برای لاگین به اکانت Cloudflare (رایگان، فقط ایمیل
   لازمه).

3. کلید(های) API رو به‌عنوان secret ست کن (اینا هیچ‌وقت توی کد یا گیت‌هاب
   ذخیره نمی‌شن):
   ```bash
   wrangler secret put AVALAI_API_KEY
   ```
   بعد کلید AvalAI‌ت رو پیست کن و Enter بزن.

   اگه بعداً خواستی DeepSeek یا OpenAI مستقیم رو هم به‌عنوان fallback اضافه
   کنی:
   ```bash
   wrangler secret put DEEPSEEK_API_KEY
   wrangler secret put OPENAI_API_KEY
   ```
   و توی `wrangler.toml`، `AI_PROVIDER` رو مثلاً به
   `"avalai,deepseek,openai"` تغییر بده.

4. دیپلوی:
   ```bash
   wrangler deploy
   ```
   خروجی یه URL می‌ده شبیه:
   ```
   https://phrasebook-server.<your-subdomain>.workers.dev
   ```

## وصل کردن فرانت‌اند

توی `app.jsx`، مقدار `DEFAULT_BACKEND_URL` رو به همین URL جدید تغییر بده:

```js
const DEFAULT_BACKEND_URL = "https://phrasebook-server.<your-subdomain>.workers.dev";
```

(یا بدون تغییر کد، همین آدرس رو توی جعبه‌ی Settings داخل خود اپ — بخش
Story Builder — به‌عنوان backendUrl وارد کن؛ چون اون فیلد از قبل توی
`app.jsx` پشتیبانی می‌شه.)

## تست سریع

```bash
curl https://phrasebook-server.<your-subdomain>.workers.dev/health
curl -X POST https://phrasebook-server.<your-subdomain>.workers.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Say hello in Persian", "maxTokens": 50}'
```

## آپدیت بعدی

هر بار کد `src/index.js` رو عوض کردی، فقط دوباره `wrangler deploy` رو بزن —
نیازی به هیچ گیت‌هاب یا build step دیگه‌ای نیست.
