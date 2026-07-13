/** Kayıt — Şartname 11.1 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { getFeatureFlags } from "@/features/moderation/service";
import { AuthCard } from "./AuthCard";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Kayıt Ol" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  const flags = await getFeatureFlags();
  const demo = isDemoMode();

  if (!flags.new_registrations_enabled) {
    return (
      <AuthCard title="Kayıtlar geçici olarak kapalı" subtitle="Yeni üye kayıtları şu anda durdurulmuş durumda.">
        <p style={{ color: "var(--color-text-secondary)" }}>
          Daha sonra tekrar dene veya{" "}
          <Link href="/giris" style={{ color: "var(--artist-accent)" }}>
            giriş yap
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="RapLab'e katıl" subtitle="Sanatçıları takip et, paylaşımlarına tepki ver, kültürün içinde ol.">
      {demo && (
        <p
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px dashed var(--color-border-strong)",
            fontSize: "var(--font-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-6)",
          }}
        >
          Demo modunda gerçek kayıt kapalıdır. Supabase anahtarları tanımlandığında bu form
          gerçek hesap oluşturur ve e-posta doğrulaması gönderir.
        </p>
      )}
      <RegisterForm disabled={demo} />
      <p style={{ marginTop: "var(--space-6)", fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>
        Zaten üye misin?{" "}
        <Link href="/giris" style={{ color: "var(--artist-accent)", fontWeight: 600 }}>
          Giriş yap
        </Link>
      </p>
    </AuthCard>
  );
}
