/** Sanatçı doğrulama başvurusu — Şartname 12.1 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getFeatureFlags } from "@/features/moderation/service";
import { isDemoMode } from "@/lib/env";
import ui from "@/components/ui/ui.module.css";
import { ApplicationForm } from "./ApplicationForm";

export const metadata: Metadata = { title: "Sanatçı Başvurusu" };

export default async function ApplicationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/sanatci-basvurusu");

  const flags = await getFeatureFlags();

  return (
    <div className="container page-enter" style={{ padding: "var(--space-12) var(--space-6)", maxWidth: 680 }}>
      <h1 className={ui.sectionTitle}>
        Sanatçı Başvurusu <span>doğrulanmış profil için</span>
      </h1>

      {!user.profile.email_verified ? (
        <div className={ui.card} style={{ padding: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--font-lg)", marginBottom: "var(--space-2)" }}>
            Önce hesabını doğrula
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-5)" }}>
            Sanatçı doğrulama belgelerini göndermeden önce e-posta hesabının sana ait
            olduğunu doğrulamamız gerekiyor.
          </p>
          <Link href="/hesap" className={ui.button + " " + ui.buttonPrimary}>
            Hesaba git
          </Link>
        </div>
      ) : !flags.artist_applications_enabled ? (
        <p className={ui.card} style={{ padding: "var(--space-8)", color: "var(--color-text-secondary)" }}>
          Sanatçı başvuruları şu anda kapalı. Daha sonra tekrar dene.
        </p>
      ) : (
        <>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-8)", lineHeight: 1.7 }}>
            Başvurun moderasyon ekibi tarafından incelenir; onay yalnızca yönetici tarafından
            verilir. Kimlik ve yetki belgelerin <strong>hiçbir zaman herkese açık olmaz</strong>{" "}
            ve yalnızca süreli özel bağlantılarla incelenir.
          </p>
          <ApplicationForm demoMode={isDemoMode()} />
        </>
      )}
    </div>
  );
}
