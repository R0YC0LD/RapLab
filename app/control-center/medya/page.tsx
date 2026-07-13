/** Medya yönetimi — Şartname 14.1 */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { StatusChip } from "@/components/ui/Badge";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Medya — Control Center", robots: { index: false } };

export default async function CCMediaPage() {
  await requireCC();
  const media = isDemoMode() ? demoState().media : [];
  const totalMb = media.reduce((acc, m) => acc + m.file_size_bytes, 0) / 1_000_000;

  return (
    <CCShell
      activeHref="/control-center/medya"
      title="Medya"
      subtitle={`${media.length} dosya · ${totalMb.toFixed(1).replace(".", ",")} MB toplam depolama`}
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Dosya</th>
              <th scope="col">Tür</th>
              <th scope="col">Boyut</th>
              <th scope="col">Durum</th>
              <th scope="col">Bucket</th>
            </tr>
          </thead>
          <tbody>
            {media.map((m) => (
              <tr key={m.id}>
                <td style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.storage_path}
                </td>
                <td>{m.mime_type}</td>
                <td>{(m.file_size_bytes / 1_000_000).toFixed(2).replace(".", ",")} MB</td>
                <td>
                  <StatusChip tone={m.processing_status === "ready" ? "success" : m.processing_status === "failed" ? "danger" : "info"}>
                    {m.processing_status}
                  </StatusChip>
                </td>
                <td>{m.bucket_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "var(--space-5)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Yetim dosyalar (24 saatten eski pending/uploading) zamanlanmış <code>cleanup_orphan_media()</code>{" "}
        göreviyle işaretlenir; storage–veritabanı karşılaştırması haftalık çalışır (Şartname 28).
      </p>
    </CCShell>
  );
}
