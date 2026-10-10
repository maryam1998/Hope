// کاربران و نشستِ محلی
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// =============================================================================
// AUTHENTICATION
// -----------------------------------------------------------------------------
// Local, per-device accounts (email/password, stored+hashed in localStorage)
// plus real "Sign in with Google" via Google Identity Services.
//
// ⚠️ TO ENABLE REAL GOOGLE SIGN-IN:
//   1. Go to https://console.cloud.google.com/apis/credentials
//   2. Create an OAuth Client ID → Application type: "Web application"
//   3. Under "Authorized JavaScript origins" add:
//        - http://localhost:5173               (for `npm run dev`)
//        - your production URL (e.g. the Vercel domain from vercel.json)
//   4. Paste the Client ID below, replacing the placeholder.
// Until a real Client ID is set, the Google button falls back to a demo
// sign-in so you can still test the rest of the app end-to-end.
// =============================================================================
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const USERS_KEY = "phrasebook-users-v1";
const SESSION_KEY = "phrasebook-session-v1";
function loadUsers() {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}
function persistSession(user) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {}
}
function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}
// Client-side-only hash — fine for a local demo account system, NOT a
// substitute for real server-side auth with bcrypt/argon2 in production.
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return String(h);
}
