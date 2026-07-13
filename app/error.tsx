"use client";

/** Genel hata sınırı — Şartname 27.3 (500 ekranı) */

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Teknik detay kullanıcıya gösterilmez; konsola request takibi için yazılır
    console.error("[raplab]", error.digest ?? error.message);
  }, [error]);

  return (
    <ErrorScreen
      code="500"
      requestId={error.digest}
      action={
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "12px 28px",
            borderRadius: "var(--radius-pill)",
            background: "var(--artist-accent)",
            color: "#0a0a0c",
            fontWeight: 700,
            minHeight: 44,
          }}
        >
          Tekrar dene
        </button>
      }
    />
  );
}
