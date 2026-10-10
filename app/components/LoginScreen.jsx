// صفحه‌ی ورود
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState } from "react";
import { Mail, Lock, User, UserPlus, LogIn, Loader2 } from "lucide-react";
import { isNativeAuthAvailable, nativeGoogleSignIn } from "../../nativeAuth.js";
import { supabase, supabaseUserToSession } from "../config/supabaseClient.js";
import { APP_LANGUAGES, colors, fontFa, fontLatin } from "../ui/theme.js";
import { tr } from "../ui/uiStrings.js";

function AuthField({ icon, placeholder, value, onChange, type = "text" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "10px 12px",
        background: "#fff",
      }}
    >
      <span style={{ color: colors.inkSoft }}>{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        style={{
          border: "none",
          outline: "none",
          flex: 1,
          fontFamily: fontFa,
          fontSize: 14,
          background: "transparent",
          color: colors.ink,
        }}
      />
    </div>
  );
}
export function LoginScreen({ onAuthenticated, uiLang = "fa" }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const dir = APP_LANGUAGES[uiLang]?.dir || "rtl";
  const loginFont = uiLang === "en" ? fontLatin : fontFa;

  // ورود واقعی با گوگل از طریق Supabase (نه Firebase، نه GIS محلی).
  // بعد از این‌که Google را در Supabase → Authentication → Providers فعال
  // کردی، این دکمه کاربر رو به صفحه‌ی ورود گوگل می‌فرسته و بعد از تایید،
  // Supabase خودش برش می‌گردونه به همین سایت با یه سشن واقعی.
  async function handleGoogleSignIn() {
    setError("");
    setGoogleBusy(true);
    // داخل اپ اندروید: ورود توی مرورگرِ سیستم انجام می‌شه و با deep link
    // (com.linglearn.app://login-callback) به خودِ اپ برمی‌گرده.
    if (isNativeAuthAvailable()) {
      try {
        await nativeGoogleSignIn(supabase);
      } catch (e) {
        setError(tr("googleSignInFailed", uiLang) + (e?.message || tr("tryAgain", uiLang)));
      }
      // اپ توی پس‌زمینه می‌ره؛ دکمه رو آزاد می‌کنیم تا اگه کاربر برگشت دوباره بتونه بزنه
      setTimeout(() => setGoogleBusy(false), 2500);
      return;
    }
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        // Always redirect to a CLEAN url (no leftover ?error=/#access_token=
        // from a previous login attempt). Reusing window.location.href as-is
        // carries old auth fragments into the new OAuth request and breaks
        // Supabase's state check ("bad_oauth_state") — this is what was
        // happening.
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (oauthError) throw oauthError;
      // مرورگر همین‌جا به صفحه‌ی گوگل ریدایرکت می‌شه؛ ادامه‌ی کار (ساخت
      // سشن) تو App، با onAuthStateChange انجام می‌شه.
    } catch (e) {
      setError(tr("googleSignInFailed", uiLang) + (e?.message || tr("tryAgain", uiLang)));
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError(tr("fillAllFields", uiLang));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // تایید ایمیل خاموشه (یا از قبل تاییده) — مستقیم وارد می‌شیم
          onAuthenticated(supabaseUserToSession(data.user));
        } else {
          // Supabase یه ایمیل تاییدیه فرستاده؛ تا کلیک نکنه نمی‌تونه وارد شه
          setNotice(tr("verifyEmailSent", uiLang));
          setMode("login");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onAuthenticated(supabaseUserToSession(data.user));
      }
    } catch (e) {
      const msg = e?.message || "";
      if (/already registered|already exists/i.test(msg)) setError(tr("emailAlreadyRegistered", uiLang));
      else if (/invalid login credentials/i.test(msg)) setError(tr("invalidCredentials", uiLang));
      else if (/email not confirmed/i.test(msg)) setError(tr("emailNotConfirmed", uiLang));
      else setError(msg || tr("genericError", uiLang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir={dir}
      lang={uiLang}
      style={{
        minHeight: "100vh",
        background: colors.paper,
        fontFamily: loginFont,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: colors.paperDark,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 18,
          padding: 32,
          boxShadow: "0 10px 30px rgba(28,37,65,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: colors.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: colors.paper,
            }}
          >
            {mode === "signup" ? <UserPlus size={26} /> : <LogIn size={26} />}
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.ink }}>
            {mode === "signup" ? tr("signupTitle", uiLang) : tr("loginTitle", uiLang)}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.inkSoft }}>
            {tr("loginSubtitle", uiLang)}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleBusy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 999,
              border: `1px solid ${colors.cardBorder}`,
              background: "#fff",
              color: colors.ink,
              fontFamily: loginFont,
              fontWeight: 600,
              fontSize: 14,
              cursor: googleBusy ? "default" : "pointer",
            }}
          >
            {googleBusy ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 15.6 3 8.4 8 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.5 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C8.3 40 15.5 45 24 45z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.4C41.4 35.9 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
              </svg>
            )}
            {tr("continueWithGoogle", uiLang)}
          </button>
        </div>

        <div className="flex items-center gap-2" style={{ margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
          <span style={{ fontSize: 12, color: colors.inkSoft }}>{tr("orWithEmail", uiLang)}</span>
          <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <AuthField icon={<User size={16} />} placeholder={tr("namePlaceholder", uiLang)} value={name} onChange={setName} />
          )}
          <AuthField icon={<Mail size={16} />} placeholder={tr("emailPlaceholder", uiLang)} value={email} onChange={setEmail} type="email" />
          <AuthField
            icon={<Lock size={16} />}
            placeholder={tr("passwordPlaceholder", uiLang)}
            value={password}
            onChange={setPassword}
            type="password"
          />

          {error && <div style={{ color: colors.rose, fontSize: 13, textAlign: "center" }}>{error}</div>}
          {notice && <div style={{ color: colors.teal, fontSize: 13, textAlign: "center" }}>{notice}</div>}

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 4,
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: colors.teal,
              color: colors.paper,
              fontFamily: loginFont,
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {busy && <Loader2 size={16} className="spin" />}
            {mode === "signup" ? tr("signupSubmit", uiLang) : tr("loginSubmit", uiLang)}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: colors.inkSoft }}>
          {mode === "signup" ? tr("haveAccount", uiLang) : tr("noAccount", uiLang)}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setNotice("");
            }}
            style={{
              background: "none",
              border: "none",
              color: colors.teal,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: loginFont,
              fontSize: 13,
            }}
          >
            {mode === "signup" ? tr("goToLogin", uiLang) : tr("goToSignup", uiLang)}
          </button>
        </div>
      </div>
    </div>
  );
}
