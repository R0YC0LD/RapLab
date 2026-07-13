"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function FanReviewActions({ verificationId, canDecide }: { verificationId: string; canDecide: boolean }) {
  const router = useRouter();
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function media(kind: "sample" | "voice") {
    setBusy(kind); setError(null);
    try {
      const response = await fetch(`/api/admin/fan-verifications/${verificationId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Medya açılamadı.");
      if (kind === "sample") setSampleUrl(json.data.url); else setVoiceUrl(json.data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bağlantı sorunu."); }
    finally { setBusy(null); }
  }

  async function review(status: "approved" | "rejected") {
    if (status === "rejected" && !note.trim()) { setError("Ret gerekçesi gerekli."); return; }
    setBusy(status); setError(null);
    try {
      const response = await fetch(`/api/admin/fan-verifications/${verificationId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
      const json = await response.json();
      if (!json.success) throw new Error(`${json.error?.message ?? "Karar kaydedilemedi."}${json.request_id ? ` (${json.request_id})` : ""}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bağlantı sorunu."); }
    finally { setBusy(null); }
  }

  return <div style={{ display: "grid", gap: "var(--space-3)" }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button variant="secondary" loading={busy === "sample"} onClick={() => media("sample")}>Örnek görseli aç</Button><Button variant="secondary" loading={busy === "voice"} onClick={() => media("voice")}>Sesli beyanı dinle</Button></div>
    {sampleUrl && <div style={{ maxWidth: 420, aspectRatio: "4 / 5", background: "#050607", display: "grid", placeItems: "center", overflow: "hidden" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={sampleUrl} alt="Fan doğrulama örnek görseli" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>}
    {voiceUrl && <audio controls autoPlay src={voiceUrl} style={{ maxWidth: "100%" }} />}
    {canDecide && <><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="İnceleme notu / ret gerekçesi" style={{ padding: 12, border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-elevated)", color: "inherit" }} /><div style={{ display: "flex", gap: 8 }}><Button loading={busy === "approved"} onClick={() => review("approved")}>Fanı onayla</Button><Button variant="danger" loading={busy === "rejected"} onClick={() => review("rejected")}>Reddet</Button></div></>}
    {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>{error}</p>}
  </div>;
}
