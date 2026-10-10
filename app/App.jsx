// کامپوننت ریشه‌ی اپ
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { setupNativeAuthListener } from "../nativeAuth.js";
import { supabase, supabaseUserToSession } from "./config/supabaseClient.js";
import { getCustomBackground } from "./storage/customBackgroundDb.js";
import { APP_FONTS, APP_FONT_SIZES, APP_THEMES, colors, hexToRgba } from "./ui/theme.js";
import { SHOW_CUSTOM_BG_OPTIONS, loadAppPrefs, saveAppPrefs } from "./prefs/appPrefs.js";
import { PhrasebookMain } from "./components/PhrasebookMain.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";

// -----------------------------------------------------------------------------
// Top-level export: gates the whole app behind login/signup, and remounts
// PhrasebookMain (key={user.email}) whenever the account changes so each
// user's saved progress loads fresh from their own storage slot.
// -----------------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [appPrefs, setAppPrefs] = useState(loadAppPrefs);

  useEffect(() => saveAppPrefs(appPrefs), [appPrefs]);

  // پس‌زمینه‌ی سفارشی — عکسِ خودِ کاربر از IndexedDB خونده می‌شه و به یه
  // object URL تبدیل می‌شه. customBgVersion فقط یه شمارنده‌ست: هر وقت از
  // تنظیمات عکسِ جدیدی آپلود/حذف بشه، این رو یکی زیاد می‌کنیم تا همین
  // useEffect دوباره از IndexedDB بخونه.
  const [customBg, setCustomBg] = useState(null);
  const [customBgVersion, setCustomBgVersion] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl = null;
    getCustomBackground().then((record) => {
      if (!active) return;
      if (record && record.blob) {
        objectUrl = URL.createObjectURL(record.blob);
        setCustomBg({ url: objectUrl });
      } else {
        setCustomBg(null);
      }
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [customBgVersion]);
  const onCustomBgChange = useCallback(() => setCustomBgVersion((v) => v + 1), []);

  // سشن واقعی Supabase: هم موقع بارگذاری اول صفحه (مثلاً بعد از برگشتن از
  // صفحه‌ی ورود گوگل) چک می‌کنیم، هم روی هر تغییر (ورود/خروج/تازه‌سازی توکن)
  // گوش می‌دیم. خود Supabase سشن رو تو localStorage نگه می‌داره، پس با
  // رفرش کردن صفحه هم لاگین باقی می‌مونه.
  useEffect(() => {
    let active = true;
    // NOTE: we used to strip access_token/error from the URL right here,
    // synchronously, before Supabase had a chance to read it. That's a race:
    // Supabase's own hash/code parsing (detectSessionInUrl) runs
    // asynchronously, and if we clear the URL first, Supabase finds nothing
    // left to parse — no session gets created — and the app falls back to
    // the login screen even though Google auth itself succeeded. So now we
    // let getSession()/onAuthStateChange do their job first, and only scrub
    // the address bar afterward (see onAuthStateChange below and the
    // fallback cleanup a few lines down).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(supabaseUserToSession(data?.session?.user || null));
      setCheckingSession(false);
      if (
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=") ||
        window.location.search.includes("error")
      ) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(supabaseUserToSession(session?.user || null));
      setCheckingSession(false);
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    const cleanupNativeAuth = setupNativeAuthListener(supabase);
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
      cleanupNativeAuth();
    };
  }, []);


  const theme = APP_THEMES[appPrefs.theme].values;
  const font = APP_FONTS[appPrefs.font];
  const fontSize = APP_FONT_SIZES[appPrefs.fontSize];

  // پنلِ شناورِ «تمرین جمله‌سازی» با createPortal مستقیم زیرِ <body> رندر
  // می‌شه (نه داخلِ این div پایین‌تر) — یعنی بیرون از دامنه‌ی CSS
  // custom-property هایی (--c-paper, --c-teal, ...) که فقط روی اون div
  // ست می‌شدن. نتیجه‌ش این بود که رنگ‌های colors.xxx (که همه‌شون
  // var(--c-xxx) هستن) داخلِ پنلِ پورتال‌شده تعریف‌نشده می‌موندن و
  // به‌جاش شفاف رندر می‌شدن — هم بک‌گراندِ خودِ پنل، هم آیکون‌هاش.
  // برای رفعِ همیشگیِ این مشکل، همین متغیرها رو مستقیماً روی
  // document.documentElement هم ست می‌کنیم؛ چون <html> جدِ مشترکِ هم
  // #root و هم document.body (مقصدِ پورتال) هست، این‌جوری همه‌جای صفحه —
  // پورتال‌شده یا نه — رنگ‌ها رو درست می‌بینه.
  useEffect(() => {
    const el = document.documentElement.style;
    el.setProperty("--c-paper", theme.paper);
    el.setProperty("--c-paperDark", theme.paperDark);
    el.setProperty("--c-ink", theme.ink);
    el.setProperty("--c-inkSoft", theme.inkSoft);
    el.setProperty("--c-gold", theme.gold);
    el.setProperty("--c-goldSoft", theme.goldSoft);
    el.setProperty("--c-teal", theme.teal);
    el.setProperty("--c-rose", theme.rose);
    el.setProperty("--c-cardBorder", theme.cardBorder);
    el.setProperty("--c-headerFrom", theme.headerFrom);
    el.setProperty("--c-headerTo", theme.headerTo);
    el.setProperty("--c-headerText", theme.headerText);
    el.setProperty("--font-fa", font.fa);
    el.setProperty("--font-latin", font.latin);
  }, [theme, font]);

  // فونتِ کادرِ ترجمه‌ی شناور (حباب) همان «نوع فونت» تنظیمات است؛ داخلِ کادر دیگر فونت انتخاب نمی‌شود.
  useEffect(() => {
    try {
      const cap = window.Capacitor;
      const B = cap && cap.Plugins && cap.Plugins.BubblePlugin;
      if (B && B.setPanelFont && cap.isNativePlatform && cap.isNativePlatform()) B.setPanelFont({ font: appPrefs.font });
    } catch (e) {}
  }, [appPrefs.font]);

  // Sets the CSS custom properties every `colors.xxx` / fontFa / fontLatin
  // reference resolves to, plus a `zoom` for the font-size preference — one
  // wrapper, whole app re-themed, login screen included.
  const rootStyle = {
    "--c-paper": theme.paper,
    "--c-paperDark": theme.paperDark,
    "--c-ink": theme.ink,
    "--c-inkSoft": theme.inkSoft,
    "--c-gold": theme.gold,
    "--c-goldSoft": theme.goldSoft,
    "--c-teal": theme.teal,
    "--c-rose": theme.rose,
    "--c-cardBorder": theme.cardBorder,
    "--c-headerFrom": theme.headerFrom,
    "--c-headerTo": theme.headerTo,
    "--c-headerText": theme.headerText,
    "--font-fa": font.fa,
    "--font-latin": font.latin,
    zoom: fontSize.zoom,
    minHeight: "100vh",
    // پس‌زمینه‌ی سفارشی: عکسِ کاربر + یه لایه‌ی رنگِ همون تمِ فعال روش، با
    // شفافیتی که از تنظیمات انتخاب کرده (customBgOpacity = میزانِ نمایانیِ
    // خودِ عکس؛ هرچی کمتر، لایه‌ی رنگِ زیرش برای خواناترشدنِ متن‌ها پررنگ‌تر).
    ...(SHOW_CUSTOM_BG_OPTIONS && appPrefs.customBgEnabled && customBg?.url
      ? {
          backgroundImage: `linear-gradient(${hexToRgba(theme.paper, 1 - (appPrefs.customBgOpacity ?? 55) / 100)}, ${hexToRgba(theme.paper, 1 - (appPrefs.customBgOpacity ?? 55) / 100)}), url(${customBg.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }
      : {}),
  };

  if (checkingSession) {
    return (
      <div style={{ ...rootStyle, display: "flex", alignItems: "center", justifyContent: "center", background: colors.paper }}>
        <Loader2 size={28} className="spin" color={colors.gold} />
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      {!user ? (
        <LoginScreen onAuthenticated={setUser} uiLang={appPrefs.uiLang} />
      ) : (
        <PhrasebookMain
          key={user.email}
          user={user}
          appPrefs={appPrefs}
          setAppPrefs={setAppPrefs}
          onCustomBgChange={onCustomBgChange}
          onLogout={async () => {
            try {
              await supabase.auth.signOut();
            } catch {}
            setUser(null);
          }}
        />
      )}
    </div>
  );
}
