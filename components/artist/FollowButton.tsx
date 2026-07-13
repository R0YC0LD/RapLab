"use client";

/**
 * Takip butonu — Şartname 10.2 (durumlar), 10.3 (animasyon), 9.3 benzeri
 * optimistic update + hata geri alma. Ziyaretçi tıklarsa giriş sayfasına
 * yönlendirilir (4.1).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./artist.module.css";

export function FollowButton({
  artistId,
  initialFollowing,
  isAuthenticated,
  variant = "primary",
}: {
  artistId: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [glow, setGlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (!isAuthenticated) {
      router.push("/giris?geri=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (pending) return; // buton kilidi — çift istek engeli (28)

    const next = !following;
    setFollowing(next); // optimistic
    setError(null);
    if (next) {
      setGlow(true);
      setTimeout(() => setGlow(false), 400);
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/artists/${artistId}/follow`, {
          method: next ? "POST" : "DELETE",
        });
        const json = await res.json();
        if (!json.success && json.error?.code !== "DUPLICATE_FOLLOW") {
          setFollowing(!next); // geri al
          setError(json.error?.message ?? "İşlem tamamlanamadı.");
        }
        router.refresh();
      } catch {
        setFollowing(!next);
        setError("Bağlantı sorunu. Tekrar dene.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <Button
        variant={following ? "secondary" : variant}
        className={`${styles.followButton} ${glow ? styles.followRing : ""}`}
        onClick={toggle}
        aria-pressed={following}
        style={
          following
            ? { borderColor: "rgba(var(--artist-accent-rgb), 0.5)" }
            : undefined
        }
      >
        {following ? "Takip Ediliyor" : "Takip Et"}
      </Button>
      {error && (
        <span role="alert" style={{ fontSize: "var(--font-xs)", color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
