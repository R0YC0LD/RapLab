"use client";

/** Başvuru onay/ret — Şartname 12.3 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/admin/artist-applications/${applicationId}/approve`, { method: "POST" });
      const json = await res.json();
      if (json.success) router.refresh();
      else {
        const requestId = json.request_id ? ` İstek kodu: ${json.request_id}` : "";
        setError(`${json.error?.message ?? "Onay başarısız."}${requestId}`);
      }
    } catch {
      setError("Bağlantı sorunu.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejectNote.trim()) {
      setError("Ret gerekçesi zorunlu.");
      return;
    }
    setBusy("reject");
    setError(null);
    try {
      const res = await fetch(`/api/admin/artist-applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: rejectNote }),
      });
      const json = await res.json();
      if (json.success) router.refresh();
      else setError(json.error?.message ?? "Ret başarısız.");
    } catch {
      setError("Bağlantı sorunu.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button onClick={approve} loading={busy === "approve"}>
          Onayla — sanatçı profili oluştur
        </Button>
        <Button variant="danger" onClick={() => setShowReject((s) => !s)}>
          Reddet
        </Button>
      </div>
      {showReject && (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <input
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Ret gerekçesi (başvurana iletilir)"
            style={{
              flex: 1,
              minWidth: 240,
              padding: "10px 14px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
          />
          <Button variant="danger" onClick={reject} loading={busy === "reject"}>
            Reddi onayla
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
