/** Hata Merkezi — Şartname 14.1, 27 */

import type { Metadata } from "next";
import { ErrorCodes, userMessages } from "@/lib/errors";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Hata Merkezi — Control Center", robots: { index: false } };

export default async function ErrorCenterPage() {
  await requireCC();

  return (
    <CCShell
      activeHref="/control-center/hata-merkezi"
      title="Hata Merkezi"
      subtitle="Hata kodu sözlüğü ve request_id ile takip"
    >
      <div className={styles.panel} style={{ marginBottom: "var(--space-6)" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", lineHeight: 1.7 }}>
          Her API hatası <code>request_id</code> ile loglanır. Kullanıcıya teknik ayrıntı asla
          gösterilmez; aşağıdaki eşleme kullanılır (Şartname 27.2). Production ortamında bu ekran
          gerçek hata akışına (log toplayıcı) bağlanır.
        </p>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Kod</th>
              <th scope="col">Kullanıcıya gösterilen mesaj</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(ErrorCodes).map((code) => (
              <tr key={code}>
                <td>
                  <code style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)" }}>{code}</code>
                </td>
                <td style={{ color: "var(--color-text-secondary)" }}>{userMessages[code]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CCShell>
  );
}
