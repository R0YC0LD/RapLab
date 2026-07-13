"use server";

/**
 * Kimlik doğrulama sunucu aksiyonları — Şartname 11
 *
 * Supabase modunda: Google OAuth + e-posta/parola (Supabase Auth).
 * Demo modunda: kurgusal persona oturumu (yalnızca geliştirme/demo).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_PERSONAS, DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { registrationSchema } from "@/lib/validation";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/* ---------- Demo oturumu ---------- */

export async function demoSignIn(personaId: string): Promise<void> {
  if (!isDemoMode()) redirect("/giris");
  const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
  if (!persona) redirect("/giris");

  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, persona.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  redirect("/");
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) {
    const store = await cookies();
    store.delete(DEMO_SESSION_COOKIE);
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/* ---------- Supabase: e-posta ile kayıt (11.1) ---------- */

export async function registerWithEmail(formData: FormData): Promise<AuthActionResult> {
  if (isDemoMode()) {
    return {
      ok: false,
      message:
        "Demo modunda gerçek kayıt kapalıdır. Supabase ortam değişkenlerini tanımlayınca bu form gerçek hesap oluşturur.",
    };
  }

  const parsed = registrationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    password_confirmation: formData.get("password_confirmation"),
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    terms_accepted: formData.get("terms_accepted") === "on",
    privacy_accepted: formData.get("privacy_accepted") === "on",
    marketing_consent: formData.get("marketing_consent") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, message: "Formda düzeltilmesi gereken alanlar var.", fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.display_name,
        marketing_consent: parsed.data.marketing_consent,
      },
    },
  });

  if (error) {
    return { ok: false, message: "Kayıt tamamlanamadı. Lütfen bilgileri kontrol edip tekrar dene." };
  }
  return { ok: true, message: "Doğrulama bağlantısı e-posta adresine gönderildi." };
}

/* ---------- Supabase: e-posta ile giriş ---------- */

export async function signInWithEmail(formData: FormData): Promise<AuthActionResult> {
  if (isDemoMode()) {
    return {
      ok: false,
      message: "Demo modunda e-posta girişi kapalıdır. Aşağıdan bir demo persona seç.",
    };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: "Giriş bilgileri doğrulanamadı." };
  }
  redirect("/");
}

/* ---------- Supabase: Google ile devam et ---------- */

export async function signInWithGoogle(): Promise<AuthActionResult> {
  if (isDemoMode()) {
    return {
      ok: false,
      message: "Demo modunda Google girişi kapalıdır. Supabase yapılandırması gerekir.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/auth/callback`,
    },
  });
  if (error || !data.url) {
    return { ok: false, message: "Google girişi başlatılamadı." };
  }
  redirect(data.url);
}

/** Form action sarmalayıcıları — <form action> void bekler; hata durumunda
 *  kullanıcı ?hata= parametresiyle bilgilendirilir. */
export async function signInWithEmailForm(formData: FormData): Promise<void> {
  const result = await signInWithEmail(formData);
  if (!result.ok) redirect("/giris?hata=eposta");
}

export async function signInWithGoogleForm(): Promise<void> {
  const result = await signInWithGoogle();
  if (!result.ok) redirect("/giris?hata=google");
}

/* ---------- Supabase: parola sıfırlama ---------- */

export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  if (isDemoMode()) {
    return { ok: false, message: "Demo modunda parola sıfırlama kapalıdır." };
  }
  const email = String(formData.get("email") ?? "");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sifre-yenile`,
  });
  // Hesabın var olup olmadığı sızdırılmaz — her durumda aynı mesaj
  return { ok: true, message: "Bu adrese kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi." };
}
