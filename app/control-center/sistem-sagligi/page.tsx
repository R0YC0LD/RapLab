/** Sistem Sağlığı — Şartname 14.1/14.2 */

import type { Metadata } from "next";
import { getSystemSummary } from "@/features/moderation/service";
import { isDemoMode } from "@/lib/env";
import { StatusChip } from "@/components/ui/Badge";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Sistem Sağlığı — Control Center", robots: { index: false } };

export default async function HealthPage() {
  const user = await requireCC();
  const summary = await getSystemSummary(user);

  const services = [
    { name: "Web uygulaması", status: "ok" as const, detail: "Next.js sunucusu yanıt veriyor" },
    {
      name: "Veritabanı",
      status: isDemoMode() ? ("demo" as const) : ("ok" as const),
      detail: isDemoMode() ? "Demo bellek deposu aktif — Supabase yapılandırılmadı" : "Supabase PostgreSQL",
    },
    {
      name: "Storage",
      status: isDemoMode() ? ("demo" as const) : ("ok" as const),
      detail: isDemoMode() ? "Statik demo varlıkları" : "Supabase Storage",
    },
    {
      name: "Medya işleme",
      status: summary.failed_uploads > 0 ? ("warn" as const) : ("ok" as const),
      detail: `${summary.failed_uploads} başarısız yükleme`,
    },
  ];

  return (
    <CCShell
      activeHref="/control-center/sistem-sagligi"
      title="Sistem Sağlığı"
      subtitle="Servis durumları, hata oranı ve yavaş sayfalar"
    >
      <div style={{ display: "grid", gap: "var(--space-3)", maxWidth: 640, marginBottom: "var(--space-8)" }}>
        {services.map((svc) => (
          <div
            key={svc.name}
            className={styles.panel}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  svc.status === "ok"
                    ? "var(--color-success)"
                    : svc.status === "warn"
                      ? "var(--color-warning)"
                      : "var(--color-info)",
                boxShadow: `0 0 8px ${svc.status === "ok" ? "var(--color-success)" : svc.status === "warn" ? "var(--color-warning)" : "var(--color-info)"}`,
              }}
            />
            <strong style={{ width: 160 }}>{svc.name}</strong>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)", flex: 1 }}>{svc.detail}</span>
            <StatusChip tone={svc.status === "ok" ? "success" : svc.status === "warn" ? "warning" : "info"}>
              {svc.status === "ok" ? "Sağlıklı" : svc.status === "warn" ? "Uyarı" : "Demo"}
            </StatusChip>
          </div>
        ))}
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>%{summary.error_rate}</div>
          <div className={styles.metricLabel}>Sistem hata oranı</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{summary.total_storage_mb} MB</div>
          <div className={styles.metricLabel}>Toplam depolama</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{summary.posts_last_24h}</div>
          <div className={styles.metricLabel}>24 saatte gönderi</div>
        </div>
      </div>

      <p style={{ marginTop: "var(--space-6)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Production ortamında en yavaş sayfalar ve uptime izleme, deployment sonrası health check
        ile birlikte harici monitoring servisi üzerinden beslenir (Şartname 33).
      </p>
    </CCShell>
  );
}
