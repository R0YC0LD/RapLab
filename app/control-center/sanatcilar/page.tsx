/** Sanatçı yönetimi — Şartname 14.3 */

import type { Metadata } from "next";
import Link from "next/link";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { listActiveArtists } from "@/features/artists/service";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/Badge";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Sanatçılar — Control Center", robots: { index: false } };

export default async function CCArtistsPage() {
  const user = await requireCC();
  const artists = isDemoMode() ? demoState().artists : await listActiveArtists(user.id);
  const members = isDemoMode() ? demoState().members : [];

  return (
    <CCShell
      activeHref="/control-center/sanatcilar"
      title="Sanatçılar"
      subtitle="Doğrulama, yayın durumu, ekipler ve askıya alma işlemleri"
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Sanatçı</th>
              <th scope="col">Slug</th>
              <th scope="col">Doğrulama</th>
              <th scope="col">Profil durumu</th>
              <th scope="col">Takipçi</th>
              <th scope="col">Ekip</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a) => (
              <tr key={a.id}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar src={a.profile_image_path} alt={a.stage_name} size={32} />
                    <strong>{a.stage_name}</strong>
                  </span>
                </td>
                <td>
                  <Link href={`/sanatci/${a.slug}`} style={{ color: "var(--color-info)" }}>
                    /{a.slug}
                  </Link>
                </td>
                <td>
                  <StatusChip tone={a.verification_status === "approved" ? "success" : "warning"}>
                    {a.verification_status === "approved" ? "Doğrulanmış" : a.verification_status}
                  </StatusChip>
                </td>
                <td>
                  <StatusChip tone={a.profile_status === "active" ? "success" : a.profile_status === "suspended" ? "danger" : "neutral"}>
                    {a.profile_status === "active" ? "Yayında" : a.profile_status}
                  </StatusChip>
                </td>
                <td>{a.follower_count.toLocaleString("tr-TR")}</td>
                <td>{members.filter((m) => m.artist_id === a.id && m.status === "active").length} üye</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "var(--space-5)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Askıya alma, rozet kaldırma, slug değişimi ve sahiplik transferi işlemleri audit log&apos;a
        yazılır ve kritik işlemler için yeniden kimlik doğrulaması gerekir (Şartname 26.4).
      </p>
    </CCShell>
  );
}
