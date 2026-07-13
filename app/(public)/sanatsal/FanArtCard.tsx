import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { FanArtFeedItem } from "@/types";
import { FanArtLikeButton } from "./FanArtLikeButton";
import styles from "./sanatsal.module.css";

export function FanArtCard({ item, isAuthenticated }: { item: FanArtFeedItem; isAuthenticated: boolean }) {
  return (
    <article className={styles.card}>
      <div className={styles.artFrame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.artImage} src={item.image_path} alt={item.caption || `${item.artist.stage_name} için fan çalışması`} loading="lazy" decoding="async" />
      </div>
      <div className={styles.meta}>
        <div className={styles.identity}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Avatar src={item.fan.avatar_path} alt={item.fan.display_name} size={32} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{item.fan.username} <strong style={{ color: "var(--color-info)" }}>fan</strong></span>
          </span>
          <FanArtLikeButton postId={item.id} initialLiked={item.liked_by_me} initialCount={item.like_count} isAuthenticated={isAuthenticated} />
        </div>
        <Link className={styles.artistLink} href={`/sanatci/${item.artist.slug}`}>#{item.artist.slug}</Link>
        {item.caption && <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)" }}>{item.caption}</p>}
        <div className={styles.tags}>{item.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <time dateTime={item.created_at} style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>{new Date(item.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</time>
      </div>
    </article>
  );
}
