/** Parolamı unuttum — Şartname 11 */

import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/actions";
import { isDemoMode } from "@/lib/env";
import { AuthCard } from "../kayit/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Parolamı Unuttum" };

export default function ForgotPasswordPage() {
  const demo = isDemoMode();
  return (
    <AuthCard
      title="Parolanı sıfırla"
      subtitle="E-posta adresini gir; kayıtlıysa sıfırlama bağlantısı gönderelim."
    >
      <ResetForm action={requestPasswordReset} disabled={demo} />
      {demo && (
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>
          Demo modunda parola sıfırlama kapalıdır.
        </p>
      )}
      <p style={{ marginTop: "var(--space-6)", fontSize: "var(--font-sm)" }}>
        <Link href="/giris" style={{ color: "var(--artist-accent)" }}>
          ← Girişe dön
        </Link>
      </p>
    </AuthCard>
  );
}
