/** Ana Sayfa Yönetimi — Şartname 14.6: hero seçimi ve bölüm yönetimi */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import { HeroPicker } from "./HeroPicker";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Ana Sayfa — Control Center", robots: { index: false } };

export default async function HomepageAdminPage() {
  await requireCC();
  const s = isDemoMode() ? demoState() : null;

  return (
    <CCShell
      activeHref="/control-center/ana-sayfa"
      title="Ana Sayfa Yönetimi"
      subtitle="Hero sanatçısı, bölüm sıralaması, kampanyalar ve ön izleme"
    >
      {s ? (
        <>
          <HeroPicker
            artists={s.artists.map((a) => ({ id: a.id, stage_name: a.stage_name }))}
            currentHeroId={s.heroArtistId}
          />
          <div className={styles.panel} style={{ marginTop: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-3)" }}>Bölüm sıralaması</h2>
            <ol style={{ margin: 0, paddingLeft: "1.4em", color: "var(--color-text-secondary)", display: "grid", gap: 8, fontSize: "var(--font-sm)" }}>
              <li>Hero — öne çıkan sanatçı</li>
              <li>RapLine — sanatçı şeridi</li>
              <li>Kişiselleştirilmiş akış</li>
              <li>Keşif alanları</li>
            </ol>
            <p style={{ marginTop: "var(--space-4)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
              Kampanya alanları, yayın başlangıç/bitiş tarihleri ve mobil/masaüstü kampanya
              görselleri Supabase modunda homepage_config üzerinden yönetilir; her değişiklik
              taslak ön izleme ile yayına alınır.
            </p>
          </div>
        </>
      ) : (
        <p className={styles.panel} style={{ color: "var(--color-text-secondary)" }}>
          Ana sayfa yapılandırması Supabase ortamında homepage_config tablosundan okunur.
        </p>
      )}
    </CCShell>
  );
}
