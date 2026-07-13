import Link from "next/link";
import type { ArtistWithFollowState } from "@/types";
import { hexToRgbString } from "@/lib/theme/contrast";
import { VerifiedBadge } from "@/components/ui/Badge";
import styles from "./artist.module.css";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} Mn`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")} B`;
  return String(n);
}

export function ArtistCard({ artist }: { artist: ArtistWithFollowState }) {
  return (
    <Link
      href={`/sanatci/${artist.slug}`}
      className={styles.artistCard}
      style={{ ["--artist-accent-rgb" as string]: hexToRgbString(artist.theme_config.accent_color) }}
    >
      <div className={styles.artistCardCover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 30: lazy load */}
        <img src={artist.desktop_cover_path} alt="" loading="lazy" />
      </div>
      <div className={styles.artistCardBody}>
        <span className={styles.artistCardName}>
          {artist.stage_name}
          {artist.verification_status === "approved" && <VerifiedBadge size={16} />}
        </span>
        <p className={styles.artistCardBio}>{artist.short_bio}</p>
        <div className={styles.artistCardMeta}>
          {artist.city && <span>{artist.city}</span>}
          {artist.genres.slice(0, 2).map((g) => (
            <span key={g}>· {g}</span>
          ))}
          <span style={{ marginLeft: "auto" }}>{formatCount(artist.follower_count)} takipçi</span>
        </div>
      </div>
    </Link>
  );
}
