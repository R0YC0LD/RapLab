"use client";

/** Bayrak anahtarları — Şartname 14.7 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeatureFlags } from "@/types";

const FLAG_LABELS: Record<keyof FeatureFlags, { label: string; hint: string }> = {
  artist_applications_enabled: { label: "Sanatçı başvuruları", hint: "Yeni doğrulama başvurusu alınır" },
  new_registrations_enabled: { label: "Yeni kayıtlar", hint: "Yeni üye kaydı açık" },
  audio_teasers_enabled: { label: "Ses önizlemeleri", hint: "audio_teaser gönderi türü" },
  video_uploads_enabled: { label: "Video yükleme", hint: "video gönderi türü" },
  scheduled_posts_enabled: { label: "Zamanlanmış gönderiler", hint: "İleri tarihli yayım" },
  maintenance_mode: { label: "Bakım modu", hint: "Site ziyaretçilere kapatılır" },
  public_follower_counts: { label: "Açık takipçi sayıları", hint: "Profillerde takipçi sayısı görünür" },
  public_like_counts: { label: "Açık beğeni sayıları", hint: "Kartlarda beğeni sayısı görünür" },
  artist_custom_themes: { label: "Sanatçı temaları", hint: "Profil tasarım ekranı" },
};

export function FlagToggles({ flags, canEdit }: { flags: FeatureFlags; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<FeatureFlags>(flags);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof FeatureFlags) {
    if (!canEdit || busyKey) return;
    const nextValue = !state[key];
    setBusyKey(key);
    setError(null);
    // Optimistic
    setState((s) => ({ ...s, [key]: nextValue }));
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: nextValue }),
      });
      const json = await res.json();
      if (!json.success) {
        setState((s) => ({ ...s, [key]: !nextValue })); // geri al
        setError(json.error?.message ?? "Değişiklik kaydedilemedi.");
      } else {
        router.refresh();
      }
    } catch {
      setState((s) => ({ ...s, [key]: !nextValue }));
      setError("Bağlantı sorunu.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)", maxWidth: 640 }}>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          {error}
        </p>
      )}
      {(Object.keys(FLAG_LABELS) as (keyof FeatureFlags)[]).map((key) => {
        const on = state[key];
        const danger = key === "maintenance_mode";
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={!canEdit || busyKey === key}
            onClick={() => toggle(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${on && danger ? "var(--color-danger)" : "var(--color-border-soft)"}`,
              background: "var(--color-bg-secondary)",
              textAlign: "left",
              opacity: canEdit ? 1 : 0.7,
              cursor: canEdit ? "pointer" : "default",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                background: on ? (danger ? "var(--color-danger)" : "var(--color-success)") : "var(--color-border-strong)",
                position: "relative",
                flexShrink: 0,
                transition: "background-color 180ms",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: on ? 20 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 180ms",
                }}
              />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, display: "block" }}>{FLAG_LABELS[key].label}</span>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                <code>{key}</code> — {FLAG_LABELS[key].hint}
              </span>
            </span>
            <span style={{ fontSize: "var(--font-xs)", color: on ? "var(--color-success)" : "var(--color-text-muted)", fontWeight: 700 }}>
              {on ? "AÇIK" : "KAPALI"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
