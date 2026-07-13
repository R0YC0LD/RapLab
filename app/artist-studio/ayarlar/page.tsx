/** Ayarlar — Şartname 13.1: profil bilgileri ve güvenlik notları */

import type { Metadata } from "next";
import { StatusChip } from "@/components/ui/Badge";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Ayarlar — Artist Studio", robots: { index: false } };

export default async function StudioSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const a = ctx.artist;

  return (
    <StudioShell
      artist={a}
      managedArtists={ctx.managedArtists}
      activePath="/ayarlar"
      title="Ayarlar"
      subtitle="Profil bilgileri, durum ve güvenlik"
    >
      <div className={styles.panel} style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={{ marginBottom: "var(--space-4)" }}>Profil bilgileri</h3>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", margin: 0, fontSize: "var(--font-sm)" }}>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Sahne adı</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{a.stage_name}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Profil adresi</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>/sanatci/{a.slug}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Şehir</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{a.city ?? "—"}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Türler</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{a.genres.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Doğrulama</dt>
            <dd style={{ margin: 0 }}>
              <StatusChip tone={a.verification_status === "approved" ? "success" : "warning"}>
                {a.verification_status === "approved" ? "Doğrulanmış" : a.verification_status}
              </StatusChip>
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--color-text-muted)" }}>Profil durumu</dt>
            <dd style={{ margin: 0 }}>
              <StatusChip tone={a.profile_status === "active" ? "success" : "warning"}>
                {a.profile_status === "active" ? "Yayında" : a.profile_status}
              </StatusChip>
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.panel}>
        <h3 style={{ marginBottom: "var(--space-3)" }}>Güvenlik sınırları</h3>
        <ul style={{ margin: 0, paddingLeft: "1.2em", color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", display: "grid", gap: 8 }}>
          <li>Doğrulama durumunu ve rozetini yalnızca platform yönetimi değiştirebilir (Kural 12).</li>
          <li>Takipçi ve beğeni sayıları veritabanı tarafından yönetilir; panelden değiştirilemez.</li>
          <li>Profil slug değişikliği Control Center onayı gerektirir (14.3).</li>
          <li>Sahiplik transferi destek üzerinden, kimlik doğrulamasıyla yürütülür.</li>
        </ul>
      </div>
    </StudioShell>
  );
}
