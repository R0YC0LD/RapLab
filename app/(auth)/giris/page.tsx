/** Giriş — Şartname 11: Google ile devam et, e-posta/parola, parolamı unuttum */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { demoSignIn, signInWithEmailForm, signInWithGoogleForm } from "@/features/auth/actions";
import { DEMO_PERSONAS, getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { AuthCard } from "../kayit/AuthCard";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect("/");
  const demo = isDemoMode();

  return (
    <AuthCard title="Tekrar hoş geldin" subtitle="Sanatçılarını takip etmeye kaldığın yerden devam et.">
      {hata && (
        <p
          role="alert"
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
            fontSize: "var(--font-sm)",
            marginBottom: "var(--space-5)",
          }}
        >
          {hata === "google"
            ? "Google girişi başlatılamadı. Lütfen tekrar dene."
            : "Giriş bilgileri doğrulanamadı. Lütfen tekrar dene."}
        </p>
      )}
      {demo && (
        <div
          style={{
            padding: "var(--space-5)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--color-border-strong)",
            marginBottom: "var(--space-6)",
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: "var(--space-2)" }}>Demo personaları</p>
          <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
            Supabase yapılandırılmadığı için gerçek giriş kapalı. Platformu farklı rollerle
            denemek için bir persona seç:
          </p>
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            {DEMO_PERSONAS.map((p) => (
              <form key={p.id} action={demoSignIn.bind(null, p.id)}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-soft)",
                    background: "var(--color-bg-secondary)",
                    minHeight: 44,
                  }}
                >
                  {p.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={signInWithGoogleForm}>
        <button
          type="submit"
          disabled={demo}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-border-strong)",
            fontWeight: 600,
            opacity: demo ? 0.5 : 1,
            minHeight: 44,
          }}
          title={demo ? "Demo modunda kapalı" : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.6z" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1l-3.9 3C3.2 21.3 7.3 24 12 24z" />
            <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-3.9-3C.5 8.3 0 10.1 0 12s.5 3.7 1.3 5.3l3.9-3z" />
            <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4L19 2.9C17 1.1 14.7 0 12 0 7.3 0 3.2 2.7 1.3 6.7l3.9 3c.9-3 3.6-5 6.8-5z" />
          </svg>
          Google ile devam et
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "var(--space-6) 0", color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
        <span style={{ flex: 1, height: 1, background: "var(--color-border-soft)" }} />
        veya e-posta ile
        <span style={{ flex: 1, height: 1, background: "var(--color-border-soft)" }} />
      </div>

      <form action={signInWithEmailForm} style={{ display: "grid", gap: "var(--space-4)" }}>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          E-posta
          <input name="email" type="email" required autoComplete="email" disabled={demo} className="auth-input" />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Parola
          <input name="password" type="password" required autoComplete="current-password" disabled={demo} className="auth-input" />
        </label>
        <button
          type="submit"
          disabled={demo}
          style={{
            padding: "12px",
            borderRadius: "var(--radius-pill)",
            background: "var(--artist-accent)",
            color: "#0a0a0c",
            fontWeight: 700,
            opacity: demo ? 0.5 : 1,
            minHeight: 44,
          }}
        >
          Giriş yap
        </button>
      </form>

      <div style={{ marginTop: "var(--space-6)", display: "grid", gap: 8, fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>
        <Link href="/sifremi-unuttum" style={{ color: "var(--color-info)" }}>
          Parolamı unuttum
        </Link>
        <p>
          Hesabın yok mu?{" "}
          <Link href="/kayit" style={{ color: "var(--artist-accent)", fontWeight: 600 }}>
            Kayıt ol
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
