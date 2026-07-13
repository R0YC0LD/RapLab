"use client";

/** Onboarding adımları — Şartname 11.3 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

interface ArtistPick {
  id: string;
  stage_name: string;
  slug: string;
  profile_image_path: string;
  followed: boolean;
}

export function OnboardingClient({
  initialUsername,
  initialDisplayName,
  artists,
}: {
  initialUsername: string;
  initialDisplayName: string;
  artists: ArtistPick[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [followState, setFollowState] = useState<Record<string, boolean>>(
    Object.fromEntries(artists.map((a) => [a.id, a.followed]))
  );

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, display_name: displayName, terms_accepted: terms }),
      });
      const json = await res.json();
      if (json.success) {
        setStep(2);
      } else {
        setError(json.error?.field_errors?.username ?? json.error?.message ?? "Kaydedilemedi.");
      }
    } catch {
      setError("Bağlantı sorunu. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFollow(id: string) {
    const next = !followState[id];
    setFollowState((s) => ({ ...s, [id]: next }));
    try {
      const res = await fetch(`/api/artists/${id}/follow`, { method: next ? "POST" : "DELETE" });
      const json = await res.json();
      if (!json.success && json.error?.code !== "DUPLICATE_FOLLOW") {
        setFollowState((s) => ({ ...s, [id]: !next }));
      }
    } catch {
      setFollowState((s) => ({ ...s, [id]: !next }));
    }
  }

  if (step === 1) {
    return (
      <div style={{ display: "grid", gap: "var(--space-5)" }}>
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
            {error}
          </p>
        )}
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Kullanıcı adı
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Görünen ad
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
          />
        </label>
        <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Kullanım koşullarını ve gizlilik politikasını kabul ediyorum.</span>
        </label>
        <Button onClick={saveProfile} loading={saving} disabled={!terms}>
          Devam et
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      <p style={{ color: "var(--color-text-secondary)" }}>
        İlgini çeken sanatçıları seç; akışın onların paylaşımlarıyla dolsun. (İsteğe bağlı)
      </p>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {artists.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-soft)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <Avatar src={a.profile_image_path} alt={a.stage_name} size={44} />
            <span style={{ fontWeight: 600, flex: 1 }}>{a.stage_name}</span>
            <Button
              variant={followState[a.id] ? "secondary" : "primary"}
              onClick={() => toggleFollow(a.id)}
            >
              {followState[a.id] ? "Takip Ediliyor" : "Takip Et"}
            </Button>
          </div>
        ))}
      </div>
      <Button onClick={() => router.push("/")} variant="secondary">
        Ana sayfaya git →
      </Button>
      <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Profil görselini daha sonra <Link href="/hesap" style={{ color: "var(--color-info)" }}>Hesap</Link> sayfasından ekleyebilirsin.
      </p>
    </div>
  );
}
