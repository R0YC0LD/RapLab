/** Kullanıcı yönetimi — Şartname 14.4 (parola/token asla görüntülenmez) */

import type { Metadata } from "next";
import { listUsers } from "@/features/moderation/service";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/Badge";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Kullanıcılar — Control Center", robots: { index: false } };

const ROLE_LABEL: Record<string, string> = {
  user: "Kullanıcı",
  artist: "Sanatçı",
  moderator: "Moderatör",
  admin: "Yönetici",
  super_admin: "Süper Yönetici",
};

export default async function CCUsersPage() {
  const user = await requireCC();
  const users = await listUsers(user);

  return (
    <CCShell
      activeHref="/control-center/kullanicilar"
      title="Kullanıcılar"
      subtitle="Hesap durumları ve roller — parola veya token bilgisi hiçbir zaman görüntülenmez"
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Kullanıcı</th>
              <th scope="col">Rol</th>
              <th scope="col">Durum</th>
              <th scope="col">E-posta doğrulama</th>
              <th scope="col">Son görülme</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar src={u.avatar_path} alt={u.display_name} size={30} />
                    <span>
                      <strong>{u.display_name}</strong>
                      <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: "var(--font-xs)" }}>
                        @{u.username}
                      </span>
                    </span>
                  </span>
                </td>
                <td>
                  <StatusChip tone={u.role === "super_admin" ? "danger" : u.role === "admin" ? "warning" : u.role === "moderator" ? "info" : "neutral"}>
                    {ROLE_LABEL[u.role]}
                  </StatusChip>
                </td>
                <td>
                  <StatusChip tone={u.account_status === "active" ? "success" : "warning"}>
                    {u.account_status === "active" ? "Aktif" : u.account_status}
                  </StatusChip>
                </td>
                <td>{u.email_verified ? "✓" : "—"}</td>
                <td style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {u.last_seen_at
                    ? new Date(u.last_seen_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "var(--space-5)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Geçici askıya alma, kalıcı kapatma, bot beğeni incelemesi ve hesap silme talepleri buradan
        yürütülür; her işlem audit log&apos;a yazılır. Son süper yönetici hesabı silinemez (4.8).
      </p>
    </CCShell>
  );
}
