"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FanArtLikeButton({ postId, initialLiked, initialCount, isAuthenticated }: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState(false);

  async function toggle() {
    if (!isAuthenticated) {
      router.push(`/giris?geri=${encodeURIComponent("/sanatsal")}`);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const next = !liked;
    setLiked(next);
    setCount((value) => next ? value + 1 : Math.max(0, value - 1));
    setError(false);
    try {
      const response = await fetch(`/api/fan-art/${postId}/like`, { method: next ? "POST" : "DELETE" });
      const json = await response.json();
      if (json.success) setCount(json.data.like_count);
      else if (json.error?.code === "DUPLICATE_LIKE") setLiked(true);
      else throw new Error();
    } catch {
      setLiked(!next);
      setCount((value) => next ? Math.max(0, value - 1) : value + 1);
      setError(true);
    } finally {
      busy.current = false;
    }
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={liked} aria-label={liked ? "Beğeniyi kaldır" : "Beğen"} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: liked ? "var(--artist-accent)" : "var(--color-text-secondary)", minHeight: 44 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.8-9.2C.7 8.7 2.7 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2.2 1.5-2.2C14.4 6 15.8 5 17.8 5c3.5 0 5.5 3.7 4 6.8C19.5 16.4 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <span aria-live="polite">{count.toLocaleString("tr-TR")}</span>
      {error && <span role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)" }}>Tekrar dene</span>}
    </button>
  );
}
