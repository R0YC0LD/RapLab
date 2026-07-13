/** Bildirim yönetimi — Şartname 14.1, 24 */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Bildirimler — Control Center", robots: { index: false } };

export default async function CCNotificationsPage() {
  await requireCC();
  const notifications = isDemoMode() ? demoState().notifications : [];

  const byType = new Map<string, number>();
  for (const n of notifications) {
    byType.set(n.notification_type, (byType.get(n.notification_type) ?? 0) + 1);
  }

  return (
    <CCShell
      activeHref="/control-center/bildirimler"
      title="Bildirimler"
      subtitle="Sistem geneli bildirim akışı ve tür dağılımı"
    >
      <div className={styles.metricGrid} style={{ marginBottom: "var(--space-8)" }}>
        {[...byType.entries()].map(([type, count]) => (
          <div key={type} className={styles.metric}>
            <div className={styles.metricValue}>{count}</div>
            <div className={styles.metricLabel}>{type}</div>
          </div>
        ))}
      </div>
      <div className={styles.panel}>
        <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-3)" }}>Kurallar</h2>
        <ul style={{ margin: 0, paddingLeft: "1.2em", color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", display: "grid", gap: 6 }}>
          <li>Güvenlik bildirimleri kullanıcı tarafından kapatılamaz.</li>
          <li>Her beğeni için sanatçıya ayrı bildirim gönderilmez; panelde gruplanır.</li>
          <li>system_announcement türü yalnızca buradan, süper yönetici onayıyla gönderilir.</li>
        </ul>
      </div>
    </CCShell>
  );
}
