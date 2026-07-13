"use client";

/**
 * Beğeni butonu — Şartname 9
 * - Giriş yoksa giriş sayfasına yönlendirir (4.1)
 * - Optimistic update; hata durumunda geri alma + bildirim + tekrar dene (9.3)
 * - Çift tıklama kilidi (28); animasyon 9.2'ye birebir uygun
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import styles from "./posts.module.css";

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { px: `${Math.cos(angle) * 18}px`, py: `${Math.sin(angle) * 18}px` };
});

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  isAuthenticated,
  showCount = true,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
  showCount?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);
  const [particles, setParticles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countKey, setCountKey] = useState(0);
  const busyRef = useRef(false);

  async function toggle() {
    if (!isAuthenticated) {
      router.push("/giris?geri=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (busyRef.current) return; // istemci buton kilidi (28)
    busyRef.current = true;

    const next = !liked;
    // Optimistic update (9.3)
    setLiked(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    setCountKey((k) => k + 1);
    setError(null);

    if (next) {
      setAnimating(true);
      setParticles(true);
      setTimeout(() => setAnimating(false), 420);
      setTimeout(() => setParticles(false), 450);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: next ? "POST" : "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setCount(json.data.like_count); // sunucu doğrusu (9.1: sayı istemciden belirlenmez)
      } else if (json.error?.code === "DUPLICATE_LIKE") {
        setLiked(true);
      } else {
        // Geri alma (9.3)
        setLiked(!next);
        setCount((c) => (next ? Math.max(0, c - 1) : c + 1));
        setError("Beğeni kaydedilemedi");
      }
    } catch {
      setLiked(!next);
      setCount((c) => (next ? Math.max(0, c - 1) : c + 1));
      setError("Beğeni kaydedilemedi");
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        className={`${styles.likeButton} ${liked ? styles.likeButtonActive : ""}`}
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? "Beğeniyi kaldır" : "Beğen"}
      >
        <svg
          className={`${styles.likeIcon} ${animating ? styles.likeIconAnimating : ""}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          aria-hidden="true"
        >
          <path
            d="M12 21s-7.5-4.6-9.8-9.2C.7 8.7 2.7 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2.2 1.5-2.2C14.4 6 15.8 5 17.8 5c3.5 0 5.5 3.7 4 6.8C19.5 16.4 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {particles && (
          <span className={styles.likeParticles} aria-hidden="true">
            {PARTICLES.map((p, i) => (
              <i key={i} style={{ ["--px" as string]: p.px, ["--py" as string]: p.py }} />
            ))}
          </span>
        )}
        {showCount && (
          <span className={styles.likeCount} aria-live="polite">
            <span key={countKey} className={styles.likeCountInner}>
              {count.toLocaleString("tr-TR")}
            </span>
          </span>
        )}
      </button>
      {error && (
        <button
          type="button"
          onClick={toggle}
          role="alert"
          style={{
            fontSize: "var(--font-xs)",
            color: "var(--color-danger)",
            textDecoration: "underline",
          }}
        >
          {error} — tekrar dene
        </button>
      )}
    </span>
  );
}
