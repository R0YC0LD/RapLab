/**
 * Gönderi kartı — Şartname 8.4:
 * sanatçı fotoğrafı, ad, rozet, tarih, düzenlenme bilgisi, içerik, medya,
 * beğeni butonu + sayısı, dış bağlantı paylaşımı, bildir butonu.
 * YORUM ALANI YOKTUR.
 */

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { PostWithArtist } from "@/types";
import { hexToRgbString } from "@/lib/theme/contrast";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip, VerifiedBadge } from "@/components/ui/Badge";
import { AudioTeaser } from "@/components/media/AudioTeaser";
import { CountdownTimer } from "./CountdownTimer";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { ReportButton } from "./ReportButton";
import styles from "./posts.module.css";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600_000);
  if (hours < 1) return "Az önce";
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

const TYPE_LABEL: Record<string, string> = {
  announcement: "Duyuru",
  countdown: "Geri Sayım",
  project: "Proje",
  audio_teaser: "Ses Önizlemesi",
};

export function PostCard({
  post,
  isAuthenticated,
  showLikeCount = true,
}: {
  post: PostWithArtist;
  isAuthenticated: boolean;
  showLikeCount?: boolean;
}) {
  const accent = post.artist.theme_config?.accent_color ?? "#ff5f68";
  const images = post.media.filter((m) => m.media_type === "image");
  const video = post.media.find((m) => m.media_type === "video");
  const audio = post.media.find((m) => m.media_type === "audio");
  const serverNow = new Date().toISOString();

  return (
    <article
      className={styles.postCard}
      style={{
        ["--artist-accent" as string]: accent,
        ["--artist-accent-rgb" as string]: hexToRgbString(accent),
      }}
    >
      <header className={styles.postHeader}>
        <Link href={`/sanatci/${post.artist.slug}`} style={{ display: "inline-flex", borderRadius: "50%" }}>
          <Avatar src={post.artist.profile_image_path} alt={post.artist.stage_name} size={44} />
        </Link>
        <div className={styles.postHeaderInfo}>
          <Link href={`/sanatci/${post.artist.slug}`} className={styles.postArtistName}>
            {post.artist.stage_name}
            {post.artist.verification_status === "approved" && <VerifiedBadge size={15} />}
          </Link>
          <span className={styles.postDate}>
            {formatDate(post.published_at)}
            {post.edited_at && " · düzenlendi"}
            {post.visibility === "followers" && " · Takipçilere özel"}
          </span>
        </div>
        {post.is_pinned && (
          <span className={styles.pinnedTag}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M9.5 1.5 14 6l-3 1-2.5 5L7 9 3.5 12.5 2.7 11.7 6 8.2 4 6.5l5-2 .5-3Z" />
            </svg>
            Sabitlendi
          </span>
        )}
      </header>

      {TYPE_LABEL[post.post_type] && (
        <StatusChip tone={post.post_type === "countdown" ? "info" : "neutral"}>
          {TYPE_LABEL[post.post_type]}
          {post.meta?.status_label ? ` · ${post.meta.status_label}` : ""}
        </StatusChip>
      )}

      {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}
      {post.body && <p className={styles.postBody}>{post.body}</p>}

      {post.post_type === "countdown" && post.meta?.countdown_ends_at && (
        <CountdownTimer endsAt={post.meta.countdown_ends_at} serverNow={serverNow} />
      )}

      {images.length === 1 && (
        <figure className={styles.postMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 30: lazy load */}
          <img src={images[0].storage_path} alt={images[0].alt_text ?? ""} loading="lazy" className="image-reveal" />
        </figure>
      )}

      {images.length > 1 && (
        <div className={styles.gallery} role="group" aria-label="Görsel galerisi">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.storage_path} alt={img.alt_text ?? ""} loading="lazy" />
          ))}
        </div>
      )}

      {video && (
        <div className={styles.videoWrapper}>
          {/* 8.1: otomatik sesli oynatma yok, kullanıcı başlatınca oynar */}
          <video controls preload="none" poster={video.poster_path ?? undefined} playsInline>
            <source src={video.storage_path} type={video.mime_type} />
            Tarayıcın video oynatmayı desteklemiyor.
          </video>
        </div>
      )}

      {audio && (
        <AudioTeaser
          src={audio.storage_path}
          waveform={audio.waveform_data}
          durationSeconds={audio.duration_seconds}
          title={post.title}
        />
      )}

      {(post.post_type === "announcement" || post.post_type === "project") && post.meta?.event_date && (
        <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>
          <CalendarDays size={16} aria-hidden="true" />
          {new Date(post.meta.event_date).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {post.meta.event_location && ` · ${post.meta.event_location}`}
        </p>
      )}

      <footer className={styles.postFooter}>
        <LikeButton
          postId={post.id}
          initialLiked={post.liked_by_me}
          initialCount={post.like_count}
          isAuthenticated={isAuthenticated}
          showCount={showLikeCount}
        />
        {post.allow_external_share && (
          <ShareButton slug={post.artist.slug} postId={post.id} title={post.title ?? post.artist.stage_name} />
        )}
        <span style={{ marginLeft: "auto" }}>
          <ReportButton targetType="post" targetId={post.id} isAuthenticated={isAuthenticated} />
        </span>
      </footer>
    </article>
  );
}
