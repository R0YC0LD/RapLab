/** Raporlar — Şartname 14.5 / 4.6 moderasyon akışı */

import type { Metadata } from "next";
import { listReports } from "@/features/moderation/service";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import { ReportActions } from "./ReportActions";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Raporlar — Control Center", robots: { index: false } };

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Taciz",
  impersonation: "Taklit hesap",
  copyright: "Telif",
  inappropriate_content: "Uygunsuz içerik",
  other: "Diğer",
};

export default async function ReportsPage() {
  const user = await requireCC();
  const reports = await listReports(user);

  return (
    <CCShell
      activeHref="/control-center/raporlar"
      title="Raporlar"
      subtitle="Kullanıcı bildirimleri — inceleme, çözüm notu ve kapatma"
    >
      {reports.length === 0 ? (
        <EmptyState title="Açık rapor yok" />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {reports.map((r) => (
            <div key={r.id} className={styles.panel}>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                <StatusChip tone={r.status === "open" ? "danger" : r.status === "resolved" ? "success" : "info"}>
                  {r.status === "open" ? "Açık" : r.status === "in_review" ? "İncelemede" : r.status === "resolved" ? "Çözüldü" : "Kapatıldı"}
                </StatusChip>
                <strong>{REASON_LABEL[r.reason]}</strong>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
                  hedef: {r.target_type} · {r.target_id}
                </span>
                <span style={{ marginLeft: "auto", color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
                  {new Date(r.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {r.description && (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-3)" }}>
                  “{r.description}”
                </p>
              )}
              {r.resolution_note && (
                <p style={{ color: "var(--color-success)", fontSize: "var(--font-xs)", marginBottom: "var(--space-3)" }}>
                  Çözüm notu: {r.resolution_note}
                </p>
              )}
              {(r.status === "open" || r.status === "in_review") && <ReportActions reportId={r.id} />}
            </div>
          ))}
        </div>
      )}
    </CCShell>
  );
}
