// کلاینت و توابع Supabase
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// SUPABASE — real accounts (email/password + Google) and cross-device sync.
// این‌جا واقعاً به پروژه‌ی Supabase وصل می‌شیم؛ دیگه هیچ حساب یا داده‌ای فقط
// محلی/ساختگی نیست. برای فعال‌سازی ورود با گوگل هم باید تو داشبورد Supabase
// (نه فقط گوگل کنسول) این مسیر رو انجام بدی:
//   Authentication → Sign In / Providers → Google → روشنش کن و
//   Client ID و Client Secret که از Google Cloud Console گرفتی رو بذار.
// و تو Google Cloud Console، زیر همون OAuth Client، این آدرس رو به
// "Authorized redirect URIs" اضافه کن (Supabase خودش تو همون صفحه‌ی
// Providers این آدرس رو بهت نشون می‌ده تا کپی کنی):
//   https://avfceytrbmsdkuyppspp.supabase.co/auth/v1/callback
// و تو Supabase، زیر Authentication → URL Configuration → Site URL / Redirect
// URLs، آدرس واقعی سایتت رو اضافه کن (مثلاً https://maryam1998.github.io/Hope/)
// وگرنه بعد از ورود با گوگل به آدرس اشتباهی برمی‌گردی.
// ---------------------------------------------------------------------------
const SUPABASE_URL = "https://avfceytrbmsdkuyppspp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmNleXRyYm1zZGt1eXBwc3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjMwNDUsImV4cCI6MjEwMTQ5OTA0NX0.IYyNpcznb3g2zdruLn2XSlVHFtDK4OQPm0RIOcIBNhE";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ---------------------------------------------------------------------------
// ورودی/خروجی سازگار با بقیه‌ی اپ: { uid, email, name, picture, provider }
export function supabaseUserToSession(su) {
  if (!su) return null;
  const meta = su.user_metadata || {};
  return {
    uid: su.id,
    email: su.email,
    name: meta.name || meta.full_name || su.email,
    picture: meta.avatar_url || meta.picture || "",
    provider: meta.provider_source || (su.app_metadata?.provider === "google" ? "google" : "email"),
  };
}
// جدول: user_data (user_id uuid primary key references auth.users, data jsonb, updated_at timestamptz)
// با RLS که هر کاربر فقط ردیف خودش رو بخونه/بنویسه — SQL لازمش رو جدا فرستادم.
export async function supabaseLoadState(uid) {
  if (!uid) return null;
  try {
    const { data, error } = await supabase.from("user_data").select("data").eq("user_id", uid).maybeSingle();
    if (error || !data) return null;
    return data.data || null;
  } catch (e) {
    return null; // آفلاین یا جدول هنوز ساخته نشده — نسخه‌ی محلی همچنان کار می‌کنه
  }
}
export async function supabaseSaveState(uid, data) {
  if (!uid) return;
  try {
    await supabase.from("user_data").upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
  } catch (e) {
    // ذخیره‌ی ابری ناموفق بود — نسخه‌ی محلی (localStorage) هنوز سِیو شده
  }
}
