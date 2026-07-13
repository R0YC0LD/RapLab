"use client";

/**
 * Sanatçı görselleri yükleme — Şartname 13.6: profile_image, desktop_cover,
 * mobile_cover. Yalnızca manage_profile izni olan üyeler (sunucu doğrular).
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const KINDS = [
  { key: "profile", label: "Profil fotoğrafı", hint: "Kare, en az 400×400" },
  { key: "desktop_cover", label: "Masaüstü kapak", hint: "Geniş, en az 1600×900" },
  { key: "mobile_cover", label: "Mobil kapak", hint: "Dikey, en az 800×1200" },
] as const;

export function ArtistImageUploader({
  artistId,
  demoMode,
  current,
}: {
  artistId: string;
  demoMode: boolean;
  current: { profile: string; desktop_cover: string; mobile_cover: string };
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeKind, setActiveKind] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function pick(kind: string) {
    setActiveKind(kind);
    setMessage(null);
    inputRef.current?.click();
  }

  async function upload(file: File) {
    if (!activeKind) return;
    setBusy(activeKind);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", activeKind);
    try {
      const res = await fetch(`/api/artists/${artistId}/image`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setMessage({ tone: "ok", text: "Görsel güncellendi ✓" });
        router.refresh();
      } else {
        setMessage({ tone: "err", text: json.error?.field_errors?.file ?? json.error?.message ?? "Yükleme başarısız." });
      }
    } catch {
      setMessage({ tone: "err", text: "Bağlantı sorunu." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        padding: "var(--space-6)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border-soft)",
        background: "var(--color-bg-secondary)",
        marginBottom: "var(--space-8)",
      }}
    >
      <h3 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-4)" }}>
        Görseller
      </h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        {KINDS.map((k) => {
          const src = current[k.key];
          return (
            <div key={k.key} style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  aspectRatio: k.key === "mobile_cover" ? "3 / 4" : k.key === "profile" ? "1" : "16 / 9",
                  borderRadius: k.key === "profile" ? "50%" : "var(--radius-sm)",
                  overflow: "hidden",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-soft)",
                  maxWidth: k.key === "profile" ? 120 : undefined,
                }}
              >
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "var(--font-sm)" }}>{k.label}</p>
                <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>{k.hint}</p>
                <Button
                  variant="secondary"
                  onClick={() => pick(k.key)}
                  loading={busy === k.key}
                  disabled={demoMode}
                  title={demoMode ? "Demo modunda kapalı" : undefined}
                >
                  Değiştir
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {message && (
        <p
          role={message.tone === "err" ? "alert" : "status"}
          style={{
            marginTop: "var(--space-4)",
            fontSize: "var(--font-sm)",
            color: message.tone === "err" ? "var(--color-danger)" : "var(--color-success)",
          }}
        >
          {message.text}
        </p>
      )}
      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        JPEG/PNG/WebP/AVIF, en fazla 12 MB (Şartname 21.1). Görsel yüklendiği anda profilde yayınlanır.
      </p>
    </div>
  );
}
