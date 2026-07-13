/** Analizler — Şartname 13.7: sekiz grafik; tekil kullanıcı hareketi gösterilmez */

import type { Metadata } from "next";
import { getStudioAnalytics } from "@/lib/analytics";
import { isDemoMode } from "@/lib/env";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Analizler — Artist Studio", robots: { index: false } };

function BarChart({ title, points }: { title: string; points: { label: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className={styles.chartCard}>
      <h3>{title}</h3>
      <div className={styles.chart} role="img" aria-label={`${title} grafiği`}>
        {points.map((p) => (
          <div
            key={p.label}
            className={styles.chartBar}
            style={{ height: `${(p.value / max) * 100}%` }}
            title={`${p.label}: ${p.value.toLocaleString("tr-TR")}`}
          >
            <span>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const analytics = isDemoMode() ? await getStudioAnalytics(ctx.artist.id, ctx.user) : null;

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/analizler"
      title="Analizler"
      subtitle="Toplulaştırılmış veriler — tekil kullanıcı hareketleri gösterilmez"
    >
      {!analytics ? (
        <p className={styles.panel} style={{ color: "var(--color-text-secondary)" }}>
          Analitik seriler Supabase ortamında toplulaştırma görevleriyle üretilir.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
          <BarChart title="Takipçi büyümesi" points={analytics.follower_growth} />
          <BarChart title="Profil ziyaretleri" points={analytics.profile_visits} />
          <BarChart title="Gönderi görüntülenmeleri" points={analytics.post_views} />
          <BarChart title="Beğeni oranı (%)" points={analytics.like_rate} />
          <BarChart title="En başarılı içerik türleri" points={analytics.top_content_types} />
          <BarChart title="Günlere göre etkileşim" points={analytics.engagement_by_day} />
          <BarChart title="Saatlere göre etkileşim" points={analytics.engagement_by_hour} />
          <div className={styles.chartCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3>Takipçi dönüşüm oranı</h3>
            <p className={styles.statValue} style={{ color: "var(--artist-accent)" }}>
              %{analytics.follower_conversion.toLocaleString("tr-TR")}
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
              profil ziyaretinden takibe dönüşüm
            </p>
          </div>
        </div>
      )}
    </StudioShell>
  );
}
