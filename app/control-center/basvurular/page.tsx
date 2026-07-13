/** Sanatçı Başvuruları — Şartname 12.3, 14.1 */

import type { Metadata } from "next";
import { listApplications } from "@/features/moderation/service";
import { roleAtLeast } from "@/lib/permissions";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import { ApplicationActions } from "./ApplicationActions";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Başvurular — Control Center", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Taslak", tone: "neutral" },
  submitted: { label: "Gönderildi", tone: "info" },
  under_review: { label: "İncelemede", tone: "info" },
  more_information_required: { label: "Ek bilgi bekleniyor", tone: "warning" },
  approved: { label: "Onaylandı", tone: "success" },
  rejected: { label: "Reddedildi", tone: "danger" },
  withdrawn: { label: "Geri çekildi", tone: "neutral" },
};

export default async function ApplicationsPage() {
  const user = await requireCC();
  const applications = await listApplications(user);
  const canDecide = roleAtLeast(user.profile.role, "admin"); // moderatör yalnızca inceler (4.6)

  return (
    <CCShell
      activeHref="/control-center/basvurular"
      title="Sanatçı Başvuruları"
      subtitle={
        canDecide
          ? "Belgeleri süreli bağlantıyla incele; onayla veya reddet"
          : "Moderatör olarak inceleyebilir ve not ekleyebilirsin — nihai karar yöneticiye aittir"
      }
    >
      {applications.length === 0 ? (
        <EmptyState title="Bekleyen başvuru yok" />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {applications.map((app) => (
            <div key={app.id} className={styles.panel}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                <h2 style={{ fontSize: "var(--font-lg)" }}>{app.stage_name}</h2>
                <StatusChip tone={STATUS[app.status].tone}>{STATUS[app.status].label}</StatusChip>
                <span style={{ marginLeft: "auto", color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
                  {new Date(app.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                </span>
              </div>

              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-3)" }}>
                {app.artist_description}
              </p>

              <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)", margin: "0 0 var(--space-4)", fontSize: "var(--font-xs)" }}>
                <div>
                  <dt style={{ color: "var(--color-text-muted)" }}>İlişki</dt>
                  <dd style={{ margin: 0 }}>{app.applicant_relationship}</dd>
                </div>
                <div>
                  <dt style={{ color: "var(--color-text-muted)" }}>İletişim</dt>
                  <dd style={{ margin: 0 }}>{app.contact_email}</dd>
                </div>
                <div>
                  <dt style={{ color: "var(--color-text-muted)" }}>Bağlantılar</dt>
                  <dd style={{ margin: 0 }}>
                    {app.official_social_links.length + app.distribution_links.length} adet
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "var(--color-text-muted)" }}>Kimlik belgesi</dt>
                  <dd style={{ margin: 0 }}>
                    {app.identity_document_path ? "🔒 Süreli bağlantıyla görüntülenir" : "Yüklenmedi"}
                  </dd>
                </div>
              </dl>

              {app.review_note && (
                <p style={{ fontSize: "var(--font-xs)", color: "var(--color-warning)", marginBottom: "var(--space-3)" }}>
                  Not: {app.review_note}
                </p>
              )}

              {canDecide &&
                ["submitted", "under_review", "more_information_required"].includes(app.status) && (
                  <ApplicationActions applicationId={app.id} />
                )}
            </div>
          ))}
        </div>
      )}
    </CCShell>
  );
}
