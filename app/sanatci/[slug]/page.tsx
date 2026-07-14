/**
 * Sanatçı profil sayfası — Şartname 7
 * URL: /sanatci/[slug] · Sekmeler: Gönderiler, Medya, Projeler, Hakkında, Zaman Çizelgesi
 * Sanatçı teması (accent) kontrast kontrolünden geçirilir (17.2, 28).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistBySlug } from "@/features/artists/service";
import { getArtistPosts, type PostFilter } from "@/features/posts/service";
import { getSessionUser } from "@/lib/auth/session";
import { ensureReadableAccent, hexToRgbString } from "@/lib/theme/contrast";
import { FollowButton } from "@/components/artist/FollowButton";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerifiedBadge } from "@/components/ui/Badge";
import postStyles from "@/components/posts/posts.module.css";
import styles from "./profile.module.css";

const TABS = [
  { key: "gonderiler", label: "Gönderiler" },
  { key: "medya", label: "Medya" },
  { key: "projeler", label: "Projeler" },
  { key: "hakkinda", label: "Hakkında" },
  { key: "zaman-cizelgesi", label: "Zaman Çizelgesi" },
] as const;

const FILTERS: { key: PostFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "text", label: "Yazılar" },
  { key: "image", label: "Görseller" },
  { key: "video", label: "Videolar" },
  { key: "announcement", label: "Duyurular" },
  { key: "audio_teaser", label: "Kısa Sesler" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug, null);
  if (!artist) return { title: "Sanatçı bulunamadı" };
  return { title: artist.stage_name, description: artist.short_bio };
}

export default async function ArtistProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sekme?: string; filtre?: string }>;
}) {
  const { slug } = await params;
  const { sekme, filtre } = await searchParams;
  const user = await getSessionUser();
  const artist = await getArtistBySlug(slug, user?.id ?? null);
  if (!artist) notFound();

  const activeTab = TABS.some((t) => t.key === sekme) ? (sekme as string) : "gonderiler";
  const activeFilter = FILTERS.some((f) => f.key === filtre) ? (filtre as PostFilter) : "all";

  // Tema rengi kontrast kontrolünden geçer; okunmuyorsa otomatik düzeltilir (28)
  const accent = ensureReadableAccent(artist.theme_config.accent_color);
  const posts = await getArtistPosts(artist.id, user, activeTab === "gonderiler" ? activeFilter : "all");

  const projects = posts.filter((p) => ["project", "countdown", "announcement"].includes(p.post_type));
  const mediaImages = posts.flatMap((p) => p.media.filter((m) => m.media_type === "image"));

  const yearJoined = new Date(artist.created_at).getFullYear();

  return (
    <div
      className={styles.profile}
      style={{
        ["--artist-accent" as string]: accent,
        ["--artist-accent-rgb" as string]: hexToRgbString(accent),
        ["--artist-secondary" as string]: artist.theme_config.secondary_color,
        ["--overlay-strength" as string]: String(artist.theme_config.hero_overlay_strength ?? 0.55),
      }}
    >
      {/* 7.2 Kapak alanı — masaüstü ve mobil ayrı görseller */}
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artist.desktop_cover_path} alt="" className={`${styles.coverImage} ${styles.desktopCover}`} fetchPriority="high" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artist.mobile_cover_path} alt="" className={`${styles.coverImage} ${styles.mobileCover}`} />
        <div className={styles.coverOverlay} aria-hidden="true" />
      </div>

      <div className="container">
        <header className={styles.header}>
          <div className={styles.avatarFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artist.profile_image_path} alt={`${artist.stage_name} profil fotoğrafı`} />
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.artistName}>{artist.stage_name}</h1>
            <p className={styles.bioLine}>{artist.short_bio}</p>
            <div className={styles.metaRow}>
              {artist.verification_status === "approved" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <VerifiedBadge /> Doğrulanmış
                </span>
              )}
              {artist.city && <span>• {artist.city}</span>}
              {artist.genres.map((g) => (
                <span key={g} className={styles.genreTag}>
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.followerCount}>
              <strong>{artist.follower_count.toLocaleString("tr-TR")}</strong>
              <span>takipçi</span>
            </div>
            <FollowButton
              artistId={artist.id}
              initialFollowing={artist.followed_by_me}
              isAuthenticated={Boolean(user)}
            />
          </div>
        </header>

        {/* 7.3 Sekmeler */}
        <nav className={styles.tabs} aria-label="Profil sekmeleri">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/sanatci/${slug}?sekme=${tab.key}`}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* ---------- Gönderiler (7.4) ---------- */}
        {activeTab === "gonderiler" && (
          <div className={styles.content}>
            <div className={postStyles.filters} role="tablist" aria-label="Gönderi filtreleri">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`/sanatci/${slug}?sekme=gonderiler&filtre=${f.key}`}
                  className={`${postStyles.filterChip} ${activeFilter === f.key ? postStyles.filterChipActive : ""}`}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            {posts.length === 0 ? (
              <EmptyState title="Bu filtrede gönderi yok" description="Başka bir filtre deneyebilirsin." />
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
              ))
            )}
          </div>
        )}

        {/* ---------- Medya ---------- */}
        {activeTab === "medya" && (
          <div className={styles.content} style={{ maxWidth: "none" }}>
            {mediaImages.length === 0 ? (
              <EmptyState title="Henüz medya yok" />
            ) : (
              <div className={styles.mediaGrid}>
                {mediaImages.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.storage_path} alt={m.alt_text ?? ""} loading="lazy" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- Projeler ---------- */}
        {activeTab === "projeler" && (
          <div className={styles.content}>
            {projects.length === 0 ? (
              <EmptyState title="Aktif proje duyurusu yok" />
            ) : (
              projects.map((post) => (
                <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
              ))
            )}
          </div>
        )}

        {/* ---------- Hakkında (7.5) ---------- */}
        {activeTab === "hakkinda" && (
          <div className={`${styles.content} ${styles.aboutGrid}`} style={{ maxWidth: "1100px" }}>
            <div>
              <div className={styles.aboutBlock}>
                <h3>Hikâye</h3>
                <p className={styles.longBio}>{artist.long_bio ?? artist.short_bio}</p>
              </div>
              <div className={styles.aboutBlock}>
                <h3>Önemli Projeler</h3>
                {projects.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)" }}>Henüz proje kaydı yok.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.2em", color: "var(--color-text-secondary)", display: "grid", gap: 8 }}>
                    {projects.map((p) => (
                      <li key={p.id}>{p.title ?? p.post_type}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <div className={styles.aboutBlock}>
                <h3>Şehir</h3>
                <p>{artist.city ?? "—"}</p>
              </div>
              <div className={styles.aboutBlock}>
                <h3>Türler</h3>
                <p>{artist.genres.join(", ") || "—"}</p>
              </div>
              <div className={styles.aboutBlock}>
                <h3>Aktif Yıllar</h3>
                <p>
                  {yearJoined} — bugün
                </p>
              </div>
              <div className={styles.aboutBlock}>
                <h3>RapLab TR Doğrulama</h3>
                <p>
                  {new Date(artist.created_at).toLocaleDateString("tr-TR", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Zaman Çizelgesi ---------- */}
        {activeTab === "zaman-cizelgesi" && (
          <div className={styles.content}>
            <div className={styles.timeline}>
              {posts.slice(0, 12).map((p) => (
                <div key={p.id} className={styles.timelineItem}>
                  <div className={styles.timelineDate}>
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </div>
                  <p style={{ fontWeight: 600, margin: "4px 0" }}>{p.title ?? "Paylaşım"}</p>
                  {p.body && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
                      {p.body.slice(0, 140)}
                      {p.body.length > 140 ? "…" : ""}
                    </p>
                  )}
                </div>
              ))}
              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>
                  {new Date(artist.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                </div>
                <p style={{ fontWeight: 600, margin: "4px 0" }}>RapLab TR&apos;ye katıldı</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
