/** Control Center Ayarlar — Şartname 14.1, 26.4, 33 */

import type { Metadata } from "next";
import { isDemoMode } from "@/lib/env";
import { StatusChip } from "@/components/ui/Badge";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Ayarlar — Control Center", robots: { index: false } };

export default async function CCSettingsPage() {
  const user = await requireCC();
  const demo = isDemoMode();

  return (
    <CCShell
      activeHref="/control-center/ayarlar"
      title="Ayarlar"
      subtitle="Ortam, güvenlik ve operasyon yapılandırması"
    >
      <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: 720 }}>
        <div className={styles.panel}>
          <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-4)" }}>Ortam</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", margin: 0, fontSize: "var(--font-sm)" }}>
            <div>
              <dt style={{ color: "var(--color-text-muted)" }}>Çalışma modu</dt>
              <dd style={{ margin: 0 }}>
                <StatusChip tone={demo ? "info" : "success"}>{demo ? "DEMO (bellek içi)" : "Supabase"}</StatusChip>
              </dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-text-muted)" }}>Oturum sahibi</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>
                {user.profile.display_name} ({user.profile.role})
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-3)" }}>Yönetici güvenliği (26.4)</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2em", color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", display: "grid", gap: 6 }}>
            <li>Yönetici hesaplarında MFA zorunludur (Supabase Auth MFA ile).</li>
            <li>Kritik işlemlerden önce yeniden kimlik doğrulaması istenir.</li>
            <li>Bu panel arama motorlarına kapalıdır (noindex başlığı aktif).</li>
            <li>Service role anahtarı yalnızca sunucu tarafında kullanılır; istemciye gönderilmez.</li>
            <li>IP/cihaz anormallikleri audit log ile ilişkilendirilir.</li>
          </ul>
        </div>

        <div className={styles.panel}>
          <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-3)" }}>Yayınlama kuralları (33)</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2em", color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", display: "grid", gap: 6 }}>
            <li>local → test → staging → production; her ortamda ayrı veritabanı.</li>
            <li>Migration dosyaları Git içinde tutulur (supabase/migrations).</li>
            <li>Staging&apos;de doğrulanmadan production&apos;a geçilmez; kritik hatada rollback.</li>
            <li>Ortam anahtarları koda yazılmaz; .env üzerinden yönetilir.</li>
          </ul>
        </div>
      </div>
    </CCShell>
  );
}
