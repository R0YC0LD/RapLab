/** Hesap ayarları — Şartname 4.2: profil fotoğrafı, kullanıcı adı, hesap ayarları, hesabı silme */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { getMyApplications } from "@/features/applications/service";
import { listMembershipsForUser } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessControlCenter } from "@/lib/permissions";
import { isDemoMode } from "@/lib/env";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/Badge";
import ui from "@/components/ui/ui.module.css";
import { AvatarUploader, UsernameChanger, VerifyEmailButton } from "./AccountTools";

export const metadata: Metadata = { title: "Hesap" };

const APP_STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  under_review: "İncelemede",
  more_information_required: "Ek bilgi gerekli",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/hesap");

  const [applications, memberships] = await Promise.all([
    getMyApplications(user),
    listMembershipsForUser(user.id),
  ]);

  return (
    <div className="container page-enter" style={{ padding: "var(--space-12) var(--space-6)", maxWidth: 720 }}>
      <h1 className={ui.sectionTitle}>
        Hesap <span>@{user.profile.username}</span>
      </h1>

      <section className={ui.card} style={{ padding: "var(--space-8)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <Avatar src={user.profile.avatar_path} alt={user.profile.display_name} size={72} />
          <div>
            <p style={{ fontSize: "var(--font-xl)", fontWeight: 700 }}>{user.profile.display_name}</p>
            <p style={{ color: "var(--color-text-muted)" }}>@{user.profile.username} · {user.email}</p>
            <StatusChip tone={user.profile.email_verified ? "success" : "warning"}>
              {user.profile.email_verified ? "Hesap doğrulandı" : "Hesap doğrulanmadı"}
            </StatusChip>
          </div>
        </div>

        {/* Hesap araçları: doğrulama, fotoğraf, kullanıcı adı */}
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "var(--space-6)" }}>
          <VerifyEmailButton
            verified={user.profile.email_verified}
            provider={user.auth_provider ?? "email"}
          />
          <AvatarUploader demoMode={isDemoMode()} />
          <UsernameChanger currentUsername={user.profile.username} displayName={user.profile.display_name} />
        </div>
        {!user.profile.email_verified && (
          <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            Google ile giriş yaptıysan ayrıca doğrulama e-postası gelmez — &quot;Hesabımı doğrula&quot;
            butonuna basman yeterli. E-posta ile kayıt olduysan buton doğrulama bağlantısını
            yeniden gönderir.
          </p>
        )}

        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", margin: 0, fontSize: "var(--font-sm)" }}>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Rol</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{user.profile.role}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Dil / Saat dilimi</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {user.profile.locale} · {user.profile.timezone}
            </dd>
          </div>
        </dl>
      </section>

      {/* Panel bağlantıları */}
      <section style={{ display: "grid", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {memberships.length > 0 && (
          <Link
            href="/artist-studio"
            className={ui.card}
            style={{ padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 700 }}>🎛️ Artist Studio</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
              {memberships.length} sanatçı profili →
            </span>
          </Link>
        )}
        {canAccessControlCenter(user.profile.role) && (
          <Link
            href="/control-center"
            className={ui.card}
            style={{ padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 700 }}>🕹️ Control Center</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>platform yönetimi →</span>
          </Link>
        )}
      </section>

      {/* Sanatçı başvuruları — 4.3 */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "var(--font-lg)", marginBottom: "var(--space-4)" }}>Sanatçı Başvuruları</h2>
        {applications.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-4)" }}>
            Sanatçı mısın? Doğrulanmış profilini açmak için başvur.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            {applications.map((app) => (
              <div key={app.id} className={ui.card} style={{ padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{app.stage_name}</p>
                  {app.review_note && (
                    <p style={{ fontSize: "var(--font-xs)", color: "var(--color-warning)" }}>{app.review_note}</p>
                  )}
                </div>
                <StatusChip
                  tone={
                    app.status === "approved"
                      ? "success"
                      : app.status === "rejected"
                        ? "danger"
                        : app.status === "more_information_required"
                          ? "warning"
                          : "info"
                  }
                >
                  {APP_STATUS_LABEL[app.status]}
                </StatusChip>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/sanatci-basvurusu"
          style={{
            display: "inline-flex",
            padding: "10px 22px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-border-strong)",
            fontWeight: 600,
            fontSize: "var(--font-sm)",
            minHeight: 44,
            alignItems: "center",
          }}
        >
          Sanatçı doğrulama başvurusu
        </Link>
      </section>

      {/* Oturum ve tehlikeli işlemler */}
      <section style={{ display: "grid", gap: "var(--space-3)" }}>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              padding: "10px 22px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--color-border-strong)",
              fontWeight: 600,
              fontSize: "var(--font-sm)",
              minHeight: 44,
            }}
          >
            Çıkış yap
          </button>
        </form>
        <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
          Hesabını silmek istersen: hesap silme talebi destek üzerinden işlenir ve Control
          Center&apos;da yönetici onayıyla tamamlanır (Şartname 14.4).
        </p>
      </section>
    </div>
  );
}
