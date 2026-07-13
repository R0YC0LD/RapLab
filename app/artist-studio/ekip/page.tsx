/** Ekip — Şartname 13.8: roller, izinler, davetler */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { StatusChip } from "@/components/ui/Badge";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Ekip — Artist Studio", robots: { index: false } };

const ROLE_LABEL: Record<string, string> = {
  owner: "Sanatçı sahibi",
  manager: "Menajer",
  content_manager: "İçerik yöneticisi",
  visual_editor: "Görsel editör",
  analytics_viewer: "Analiz görüntüleyici",
  label_rep: "Label temsilcisi",
};

const PERM_LABEL: Record<string, string> = {
  manage_posts: "Gönderi yönetimi",
  publish_posts: "Yayımlama",
  delete_posts: "Silme",
  manage_media: "Medya",
  manage_profile: "Profil",
  view_analytics: "Analiz",
  manage_team: "Ekip",
  manage_projects: "Projeler",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);

  const members = isDemoMode()
    ? demoState().members.filter((m) => m.artist_id === ctx.artist.id)
    : [];
  const profiles = isDemoMode() ? demoState().profiles : [];

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/ekip"
      title="Ekip"
      subtitle="Her rol ayrı izin setine sahiptir; davetler e-posta ile gönderilir"
    >
      <div className={styles.tableWrap} style={{ marginBottom: "var(--space-8)" }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Üye</th>
              <th scope="col">Rol</th>
              <th scope="col">İzinler</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const profile = profiles.find((p) => p.id === m.user_id);
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{profile?.display_name ?? m.user_id}</td>
                  <td>{ROLE_LABEL[m.member_role]}</td>
                  <td style={{ maxWidth: 320 }}>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {m.member_role === "owner" ? (
                        <StatusChip tone="info">Tüm izinler</StatusChip>
                      ) : (
                        m.permissions.map((p) => (
                          <StatusChip key={p}>{PERM_LABEL[p] ?? p}</StatusChip>
                        ))
                      )}
                    </span>
                  </td>
                  <td>
                    <StatusChip tone={m.status === "active" ? "success" : "warning"}>
                      {m.status === "active" ? "Aktif" : m.status === "invited" ? "Davet edildi" : m.status}
                    </StatusChip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.panel}>
        <h3 style={{ marginBottom: "var(--space-4)" }}>Rol şablonları ve varsayılan izinler</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
          {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, perms]) => (
            <div key={role} style={{ padding: "var(--space-4)", border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-sm)" }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{ROLE_LABEL[role]}</p>
              <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                {perms.map((p) => PERM_LABEL[p]).join(" · ")}
              </p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "var(--space-5)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
          Davet akışı (invite_email, member_role, permissions, expires_at) Supabase modunda
          e-posta ile çalışır; demo modunda davet gönderimi kapalıdır.
        </p>
      </div>
    </StudioShell>
  );
}
