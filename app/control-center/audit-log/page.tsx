/** Audit Log — Şartname 15.10: kayıtlar silinemez; salt okunur görünüm */

import type { Metadata } from "next";
import { listAuditLogs } from "@/features/moderation/service";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Audit Log — Control Center", robots: { index: false } };

export default async function AuditLogPage() {
  const user = await requireCC();
  const logs = await listAuditLogs(user);

  return (
    <CCShell
      activeHref="/control-center/audit-log"
      title="Audit Log"
      subtitle="Kritik işlemlerin değiştirilemez kaydı — hiçbir rol silemez (yetki matrisi: Hayır/Hayır/Hayır)"
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">İşlem</th>
              <th scope="col">Aktör rolü</th>
              <th scope="col">Hedef</th>
              <th scope="col">Değişiklik</th>
              <th scope="col">Request ID</th>
              <th scope="col">Zaman</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <code style={{ color: "var(--color-info)", fontSize: "var(--font-xs)" }}>{log.action}</code>
                </td>
                <td>{log.actor_role}</td>
                <td style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                  {log.target_type}
                  {log.target_id ? ` · ${log.target_id.slice(0, 12)}` : ""}
                </td>
                <td style={{ maxWidth: 280 }}>
                  <code style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {JSON.stringify(log.previous_data)} → {JSON.stringify(log.new_data)}
                  </code>
                </td>
                <td style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>{log.request_id.slice(0, 12)}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
                  {new Date(log.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CCShell>
  );
}
