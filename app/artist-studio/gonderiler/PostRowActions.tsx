"use client";

/** Gönderi satır işlemleri: gizle / geri aç / arşivle / sil (soft) — 8.2 durum makinesi */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PostRowActions({ postId, status }: { postId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "İşlem başarısız.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Bağlantı sorunu.");
    } finally {
      setBusy(false);
    }
  }

  const btn: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid var(--color-border-soft)",
    fontSize: "var(--font-xs)",
    color: "var(--color-text-secondary)",
    opacity: busy ? 0.5 : 1,
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {status === "published" && (
        <>
          <button style={btn} disabled={busy} onClick={() => change("PATCH", { status: "hidden" })}>
            Gizle
          </button>
          <button style={btn} disabled={busy} onClick={() => change("PATCH", { status: "archived" })}>
            Arşivle
          </button>
          <button
            style={{ ...btn, borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
            disabled={busy}
            onClick={() => {
              if (window.confirm("Bu gönderi silinecek (geri alınamaz görünür ama soft delete uygulanır). Emin misin?")) {
                change("DELETE");
              }
            }}
          >
            Sil
          </button>
        </>
      )}
      {(status === "hidden" || status === "archived") && (
        <button style={btn} disabled={busy} onClick={() => change("PATCH", { status: "published" })}>
          Geri aç
        </button>
      )}
      {error && <span style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)" }}>{error}</span>}
    </div>
  );
}
