/**
 * Ana sayfa — Şartname 6 (Ana Sayfa Mimarisi)
 * Hero (6.2) → RapLine (6.3) → kişiselleştirilmiş akış (6.4) → keşif alanları (6.5)
 * Sonsuz kaydırma yok: ilk 15 gönderi + "Daha fazla göster" (6.4).
 */

import Link from "next/link";
import {
  getHeroArtist,
  listActiveArtists,
  listRapLine,
} from "@/features/artists/service";
import { getArtistPosts, getPersonalFeed } from "@/features/posts/service";
import { getSessionUser } from "@/lib/auth/session";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { HeroSection } from "@/components/artist/HeroSection";
import { RapLine } from "@/components/artist/RapLine";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";
import styles from "./page.module.css";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const { sayfa } = await searchParams;
  const user = await getSessionUser();
  const cursor = Math.max(0, parseInt(sayfa ?? "0", 10) || 0);

  const [hero, rapline, feed, allArtists] = await Promise.all([
    getHeroArtist(user?.id ?? null),
    listRapLine(user?.id ?? null),
    getPersonalFeed(user, cursor),
    listActiveArtists(user?.id ?? null),
  ]);

  const heroLatest = hero ? (await getArtistPosts(hero.id, user, "all"))[0] ?? null : null;
  const newlyVerified = allArtists.filter((a) => a.is_newly_verified);
  const upcoming = allArtists.filter((a) => a.has_active_countdown);

  return (
    <div>
      {hero && (
        <HeroSection artist={hero} latestPost={heroLatest} isAuthenticated={Boolean(user)} />
      )}

      {/* RapLine — 6.3 */}
      <section className={`${styles.section}`} aria-labelledby="rapline-baslik">
        <div className="container">
          <h2 id="rapline-baslik" className={ui.sectionTitle}>
            RapLine <span>sanatçı şeridi</span>
          </h2>
          <RapLine artists={rapline} />
        </div>
      </section>

      {/* Kişiselleştirilmiş akış — 6.4 */}
      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="akis-baslik">
        <div className="container">
          <div className={styles.feedLayout}>
            <div>
              <h2 id="akis-baslik" className={ui.sectionTitle}>
                {user ? "Akışın" : "Son Paylaşımlar"}{" "}
                <span>{user ? "takip ettiğin sanatçılardan" : "platformdan seçkiler"}</span>
              </h2>

              {feed.posts.length === 0 ? (
                <EmptyState
                  title="Akışın henüz boş"
                  description="Sanatçıları takip etmeye başladığında paylaşımları burada görünecek."
                  action={
                    <Link href="/sanatcilar" style={{ color: "var(--artist-accent)", fontWeight: 600 }}>
                      Sanatçıları keşfet →
                    </Link>
                  }
                />
              ) : (
                <div className={styles.feed}>
                  {feed.posts.map((post) => (
                    <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
                  ))}
                </div>
              )}

              {feed.nextCursor !== null && (
                <div className={styles.showMore}>
                  <Link
                    href={`/?sayfa=${feed.nextCursor}#akis-baslik`}
                    style={{
                      padding: "12px 32px",
                      borderRadius: "var(--radius-pill)",
                      border: "1px solid var(--color-border-strong)",
                      fontWeight: 600,
                      fontSize: "var(--font-sm)",
                    }}
                  >
                    Daha fazla göster
                  </Link>
                </div>
              )}
            </div>

            <aside className={styles.aside} aria-label="Keşif önerileri">
              {newlyVerified.length > 0 && (
                <div className={styles.asideCard}>
                  <h3>Yeni Doğrulanan Sanatçılar</h3>
                  <ul className={styles.asideList}>
                    {newlyVerified.map((a) => (
                      <li key={a.id}>
                        <Link href={`/sanatci/${a.slug}`} style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                          {a.stage_name}
                        </Link>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)", display: "block" }}>
                          {a.city} · {a.genres[0] ?? "rap"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {upcoming.length > 0 && (
                <div className={styles.asideCard}>
                  <h3>Yaklaşan Projeler</h3>
                  <ul className={styles.asideList}>
                    {upcoming.map((a) => (
                      <li key={a.id}>
                        <Link href={`/sanatci/${a.slug}`} style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                          {a.stage_name}
                        </Link>
                        <span style={{ color: "var(--accent-violet)", fontSize: "var(--font-xs)", display: "block" }}>
                          Geri sayım aktif
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.asideCard}>
                <h3>RapLab TR Nedir?</h3>
                <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  Sanatçının konuştuğu, takipçinin takip edip beğenerek tepki verdiği premium
                  dijital kültür platformu.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Keşif alanları — 6.5 */}
      <section className={styles.section} aria-labelledby="kesif-baslik">
        <div className="container">
          <h2 id="kesif-baslik" className={ui.sectionTitle}>
            Bu Hafta Öne Çıkanlar <span>editör seçkisi</span>
          </h2>
          <div className={styles.discoveryGrid}>
            {allArtists.slice(0, 6).map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
