"use client";

/**
 * RapLine — Şartname 6.3: yatay sanatçı gezinti şeridi.
 * Durum halkaları: accent-red (24s içinde gönderi), accent-violet (geri sayım),
 * accent-gold (RapLab özel), accent-blue (yeni doğrulanmış), neutral.
 * Fare tekerleği, sürükleme, dokunma ve klavye yön tuşlarıyla kullanılır.
 */

import Link from "next/link";
import { useRef } from "react";
import type { ArtistWithFollowState } from "@/types";
import { VerifiedBadge } from "@/components/ui/Badge";
import styles from "./artist.module.css";

function ringColor(a: ArtistWithFollowState): { color: string; label: string } {
  if (a.has_new_post) return { color: "var(--accent-red)", label: "Yeni gönderi" };
  if (a.has_active_countdown) return { color: "var(--accent-violet)", label: "Geri sayım aktif" };
  if (a.is_raplab_special) return { color: "var(--accent-gold)", label: "RapLab özel" };
  if (a.is_newly_verified) return { color: "var(--accent-blue)", label: "Yeni doğrulandı" };
  return { color: "var(--accent-neutral)", label: "" };
}

export function RapLine({ artists }: { artists: ArtistWithFollowState[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function onWheel(e: React.WheelEvent) {
    if (!trackRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      trackRef.current.scrollLeft += e.deltaY;
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!trackRef.current) return;
    if (e.key === "ArrowRight") {
      trackRef.current.scrollBy({ left: 120, behavior: "smooth" });
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      trackRef.current.scrollBy({ left: -120, behavior: "smooth" });
      e.preventDefault();
    }
  }

  return (
    <div
      ref={trackRef}
      className={styles.rapline}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      role="list"
      aria-label="RapLine — sanatçı şeridi"
      tabIndex={0}
    >
      {artists.map((a) => {
        const ring = ringColor(a);
        return (
          <Link
            key={a.id}
            href={`/sanatci/${a.slug}`}
            className={styles.raplineItem}
            role="listitem"
          >
            <span
              className={styles.raplineRing}
              style={{ ["--ring-color" as string]: ring.color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.profile_image_path} alt="" loading="lazy" />
            </span>
            <span className={styles.raplineName}>
              {a.stage_name}
              {a.verification_status === "approved" && <VerifiedBadge size={13} />}
            </span>
            <span className={styles.raplineStatus}>
              {ring.label || (a.followed_by_me ? "Takiptesin" : "")}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
