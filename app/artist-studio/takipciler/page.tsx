/** Takipçiler — Şartname 13.1: büyüme özeti (tekil kullanıcı verisi gösterilmez) */

import type { Metadata } from "next";
import { getStudioOverview } from "@/lib/analytics";
import { isDemoMode } from "@/lib/env";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Takipçiler — Artist Studio", robots: { index: false } };

export default async function FollowersPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const overview = isDemoMode() ? await getStudioOverview(ctx.artist.id, ctx.user) : null;

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/takipciler"
      title="Takipçiler"
      subtitle="Topluluğunun büyümesi — gizlilik gereği yalnızca toplu sayılar"
    >
      {overview && (
        <div className={styles.statGrid} style={{ marginBottom: "var(--space-8)" }}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{overview.total_followers.toLocaleString("tr-TR")}</div>
            <div className={styles.statLabel}>Toplam takipçi</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>+{overview.new_followers_7d.toLocaleString("tr-TR")}</div>
            <div className={styles.statLabel}>Son 7 gün</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>%{overview.avg_like_rate}</div>
            <div className={styles.statLabel}>Ortalama etkileşim</div>
          </div>
        </div>
      )}
      <p className={styles.panel} style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)", lineHeight: 1.7 }}>
        RapLab, sanatçılara takipçilerin kimliklerini veya tekil hareketlerini göstermez
        (Şartname 13.7). Takipçi listesi yerine büyüme, etkileşim ve dönüşüm gibi
        toplulaştırılmış veriler sunulur. Ayrıntılı kırılımlar için Analizler bölümüne bak.
      </p>
    </StudioShell>
  );
}
