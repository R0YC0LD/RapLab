"use client";

/** Hero sanatçısı seçimi — Şartname 14.6 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function HeroPicker({
  artists,
  currentHeroId,
}: {
  artists: { id: string; stage_name: string }[];
  currentHeroId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentHeroId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_artist_id: selected }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Hero sanatçısı güncellendi ✓");
        router.refresh();
      } else {
        setMessage(json.error?.message ?? "Güncelleme başarısız.");
      }
    } catch {
      setMessage("Bağlantı sorunu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: "var(--space-6)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border-soft)",
        background: "var(--color-bg-secondary)",
      }}
    >
      <h2 style={{ fontSize: "var(--font-md)", marginBottom: "var(--space-4)" }}>Hero sanatçısı</h2>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-soft)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            minWidth: 240,
          }}
          aria-label="Hero sanatçısını seç"
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.stage_name}
            </option>
          ))}
        </select>
        <Button onClick={save} loading={busy} disabled={selected === currentHeroId}>
          Yayına al
        </Button>
      </div>
      {message && (
        <p role="status" style={{ marginTop: "var(--space-3)", fontSize: "var(--font-sm)", color: message.includes("✓") ? "var(--color-success)" : "var(--color-danger)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
