/**
 * Hero alanı — Şartname 6.2: günlük/haftalık öne çıkan sanatçı.
 * Sinematik görsel, sanatçı adı, kısa cümle, son paylaşım/yaklaşan proje,
 * profili görüntüle + takip et. Otomatik carousel YOK (6.2).
 */

import Link from "next/link";
import type { ArtistWithFollowState, Post } from "@/types";
import { hexToRgbString } from "@/lib/theme/contrast";
import { VerifiedBadge } from "@/components/ui/Badge";
import { FollowButton } from "./FollowButton";
import styles from "./artist.module.css";

export function HeroSection({
  artist,
  latestPost,
  isAuthenticated,
}: {
  artist: ArtistWithFollowState;
  latestPost: Post | null;
  isAuthenticated: boolean;
}) {
  const accentRgb = hexToRgbString(artist.theme_config.accent_color);

  return (
    <section
      className={styles.hero}
      style={{
        ["--artist-accent" as string]: artist.theme_config.accent_color,
        ["--artist-accent-rgb" as string]: accentRgb,
      }}
      aria-label={`Öne çıkan sanatçı: ${artist.stage_name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- hero öncelikli yüklenir (30) */}
      <img
        src={artist.desktop_cover_path}
        alt=""
        className={styles.heroImage}
        fetchPriority="high"
      />
      <div className={styles.heroOverlay} aria-hidden="true" />

      <div className={`${styles.heroContent} page-enter`}>
        <p className={styles.heroKicker}>Bu haftanın öne çıkan sanatçısı</p>
        <h1 className={styles.heroName}>{artist.stage_name}</h1>
        <p className={styles.heroTagline}>{artist.short_bio}</p>

        <div className={styles.heroMeta}>
          {artist.verification_status === "approved" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <VerifiedBadge size={16} /> Doğrulanmış sanatçı
            </span>
          )}
          {artist.city && <span>• {artist.city}</span>}
          {latestPost && (
            <span>
              • Son paylaşım: {latestPost.title ?? (latestPost.body ?? "").slice(0, 60)}
            </span>
          )}
        </div>

        <div className={styles.heroActions}>
          <Link
            href={`/sanatci/${artist.slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "10px 26px",
              borderRadius: "var(--radius-pill)",
              background: "var(--color-text-primary)",
              color: "#0a0a0c",
              fontWeight: 700,
              fontSize: "var(--font-sm)",
            }}
          >
            Profili Görüntüle
          </Link>
          <FollowButton
            artistId={artist.id}
            initialFollowing={artist.followed_by_me}
            isAuthenticated={isAuthenticated}
            variant="secondary"
          />
        </div>
      </div>
    </section>
  );
}
