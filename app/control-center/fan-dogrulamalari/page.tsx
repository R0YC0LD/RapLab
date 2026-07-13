import type { Metadata } from "next";
import { listFanVerifications } from "@/features/fan-art/service";
import { roleAtLeast } from "@/lib/permissions";
import { CCShell } from "@/components/admin/CCShell";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireCC } from "../helpers";
import { FanReviewActions } from "./FanReviewActions";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Fan Doğrulamaları - Control Center", robots: { index: false } };

export default async function FanVerificationsPage() {
  const user = await requireCC();
  const rows = await listFanVerifications(user);
  const canDecide = roleAtLeast(user.profile.role, "admin");
  return <CCShell activeHref="/control-center/fan-dogrulamalari" title="Fan Doğrulamaları" subtitle="Örnek çalışmayı ve sesli sahiplik beyanını incele; tüm medya erişimleri audit kaydına yazılır">
    {rows.length === 0 ? <EmptyState title="Fan doğrulama başvurusu yok" /> : <div style={{ display: "grid", gap: "var(--space-4)" }}>{rows.map((row) => <section key={row.id} className={styles.panel}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}><div><h2 style={{ fontSize: "var(--font-lg)" }}>{row.fan.display_name} <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>@{row.fan.username}</span></h2><p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)" }}>{row.artist.stage_name} için, {new Date(`${row.art_created_on}T00:00:00`).toLocaleDateString("tr-TR")}</p></div><StatusChip tone={row.status === "approved" ? "success" : row.status === "rejected" ? "danger" : "info"}>{row.status === "approved" ? "Onaylı" : row.status === "rejected" ? "Reddedildi" : "İnceleniyor"}</StatusChip></div>
      {row.review_note && <p style={{ color: "var(--color-warning)", fontSize: "var(--font-sm)", marginBottom: 12 }}>{row.review_note}</p>}
      {row.status === "pending" && <FanReviewActions verificationId={row.id} canDecide={canDecide} />}
    </section>)}</div>}
  </CCShell>;
}
