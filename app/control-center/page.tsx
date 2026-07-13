/** Sistem Özeti — Şartname 14.2 */

import type { Metadata } from "next";
import { getSystemSummary, listAuditLogs } from "@/features/moderation/service";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "./helpers";
import styles from "./cc.module.css";

export const metadata: Metadata = { title: "Control Center", robots: { index: false } };

export default async function CCOverviewPage() {
  const user = await requireCC();
  const summary = await getSystemSummary(user);
  const recentAudit = (await listAuditLogs(user)).slice(0, 5);

  const metrics = [
    { label: "Toplam kullanıcı", value: summary.total_users },
    { label: "Günlük aktif", value: summary.daily_active_users },
    { label: "Aylık aktif", value: summary.monthly_active_users },
    { label: "Toplam sanatçı", value: summary.total_artists },
    { label: "Aktif sanatçı", value: summary.active_artists },
    { label: "Bekleyen başvuru", value: summary.pending_applications },
    { label: "24 saat gönderi", value: summary.posts_last_24h },
    { label: "24 saat beğeni", value: summary.likes_last_24h },
    { label: "Depolama (MB)", value: summary.total_storage_mb },
    { label: "Başarısız yükleme", value: summary.failed_uploads },
    { label: "Açık rapor", value: summary.open_reports },
    { label: "Hata oranı (%)", value: summary.error_rate },
  ];

  return (
    <CCShell
      activeHref="/control-center"
      title="Sistem Özeti"
      subtitle="Platformun anlık telemetri panosu"
    >
      <div className={styles.metricGrid}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <div className={styles.metricValue}>{m.value.toLocaleString("tr-TR")}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.panel} style={{ marginTop: "var(--space-8)" }}>
        <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-4)" }}>Son kritik işlemler</h2>
        <div style={{ display: "grid", gap: "var(--space-2)", fontSize: "var(--font-sm)" }}>
          {recentAudit.map((log) => (
            <div key={log.id} style={{ display: "flex", gap: "var(--space-3)", color: "var(--color-text-secondary)" }}>
              <code style={{ color: "var(--color-info)" }}>{log.action}</code>
              <span style={{ marginLeft: "auto", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                {new Date(log.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CCShell>
  );
}
