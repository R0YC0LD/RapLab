/** Genel Bakış — Şartname 13.2 kartları */

import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { getStudioOverview } from "@/lib/analytics";
import { getGroupedArtistNotifications } from "@/lib/analytics";
import { isDemoMode } from "@/lib/env";
import { getStudioContext } from "./helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "./studio.module.css";

export const metadata: Metadata = { title: "Artist Studio", robots: { index: false } };

export default async function StudioOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);

  const overview = isDemoMode() ? await getStudioOverview(ctx.artist.id, ctx.user) : null;
  const grouped = isDemoMode() ? getGroupedArtistNotifications(ctx.artist.id) : [];

  const cards = overview
    ? [
        { label: "Toplam takipçi", value: overview.total_followers.toLocaleString("tr-TR") },
        { label: "Son 7 gün yeni takipçi", value: `+${overview.new_followers_7d.toLocaleString("tr-TR")}` },
        { label: "Son 30 gün profil ziyareti", value: overview.profile_visits_30d.toLocaleString("tr-TR") },
        { label: "Toplam gönderi görüntülenmesi", value: overview.total_post_views.toLocaleString("tr-TR") },
        { label: "Toplam beğeni", value: overview.total_likes.toLocaleString("tr-TR") },
        { label: "Ortalama beğeni oranı", value: `%${overview.avg_like_rate}` },
        { label: "Zamanlanmış gönderiler", value: String(overview.scheduled_posts) },
        { label: "Başarısız medya işlemleri", value: String(overview.failed_media) },
        { label: "Profil tamamlanma", value: `%${overview.profile_completion}` },
      ]
    : [];

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/"
      title="Genel Bakış"
      subtitle={`${ctx.artist.stage_name} profilinin kontrol masası`}
    >
      {/* Gruplanmış bildirimler — Şartname 24 */}
      {grouped.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "var(--space-2)",
            marginBottom: "var(--space-8)",
          }}
        >
          {grouped.map((msg) => (
            <p
              key={msg}
              style={{
                padding: "var(--space-4) var(--space-5)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(var(--artist-accent-rgb), 0.3)",
                background: "rgba(var(--artist-accent-rgb), 0.06)",
                fontSize: "var(--font-sm)",
              }}
            >
              <Zap size={16} aria-hidden="true" style={{ verticalAlign: -3, marginRight: 7 }} />
              {msg}
            </p>
          ))}
        </div>
      )}

      {overview ? (
        <>
          <div className={styles.statGrid}>
            {cards.map((c) => (
              <div key={c.label} className={styles.statCard}>
                <div className={styles.statValue}>{c.value}</div>
                <div className={styles.statLabel}>{c.label}</div>
              </div>
            ))}
          </div>

          {overview.top_post && (
            <div className={styles.panel} style={{ marginTop: "var(--space-8)" }}>
              <h3 style={{ fontSize: "var(--font-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                EN BAŞARILI GÖNDERİ
              </h3>
              <p style={{ fontWeight: 700, fontSize: "var(--font-lg)" }}>
                {overview.top_post.title ?? "Başlıksız gönderi"}
              </p>
              <p style={{ color: "var(--artist-accent)", marginTop: 4 }}>
                {overview.top_post.like_count.toLocaleString("tr-TR")} beğeni
              </p>
            </div>
          )}
        </>
      ) : (
        <p className={styles.panel} style={{ color: "var(--color-text-secondary)" }}>
          Analitik toplulaştırma Supabase ortamında zamanlanmış görevlerle üretilir. Bu
          kurulumda görüntülemek için demo modunu kullan.
        </p>
      )}
    </StudioShell>
  );
}
