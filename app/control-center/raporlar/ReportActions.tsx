"use client";

/** Rapor durum güncelleme — Şartname 4.6, 14.5 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: "in_review" | "resolved" | "dismissed") {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution_note: note || undefined }),
      });
      const json = await res.json();
      if (json.success) router.refresh();
      else setError(json.error?.message ?? "Güncelleme başarısız.");
    } catch {
      setError("Bağlantı sorunu.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Moderasyon notu (isteğe bağlı)"
        style={{
          padding: "10px 14px",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-soft)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
        }}
      />
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => update("in_review")} loading={busy === "in_review"}>
          İncelemeye al
        </Button>
        <Button onClick={() => update("resolved")} loading={busy === "resolved"}>
          Çözüldü olarak kapat
        </Button>
        <Button variant="ghost" onClick={() => update("dismissed")} loading={busy === "dismissed"}>
          Geçersiz — kapat
        </Button>
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
