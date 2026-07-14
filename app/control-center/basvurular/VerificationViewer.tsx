"use client";

/**
 * Doğrulama medyası görüntüleyici (yalnızca süper yönetici):
 *
 * KİMLİK: tek seferlik — buton basıldığında sunucu erişimi kalıcı olarak
 * kilitler, 60 sn'lik imzalı bağlantı döner. Görüntü filigranla (izleyen
 * yönetici + zaman) gösterilir; sağ tık/seçim kapalıdır. Dürüst not:
 * cihaz düzeyinde ekran görüntüsü hiçbir web sitesince %100 engellenemez;
 * güvence tek sefer + kimlikli filigran + silinemez denetim kaydıdır.
 *
 * SES BEYANI: süreli bağlantıyla dinlenir; her dinleme loglanır.
 */

import { useEffect, useRef, useState } from "react";
import { IdCard, LockKeyhole, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function VerificationViewer({
  applicationId,
  hasIdentity,
  identityViewedAt,
  hasVoice,
  adminUsername,
}: {
  applicationId: string;
  hasIdentity: boolean;
  identityViewedAt: string | null;
  hasVoice: boolean;
  adminUsername: string;
}) {
  const [identityUrl, setIdentityUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"identity" | "voice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [locallyViewed, setLocallyViewed] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function fetchMedia(kind: "identity" | "voice") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/verification/${applicationId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Erişim reddedildi.");
        return;
      }
      if (kind === "identity") {
        setIdentityUrl(json.data.url);
        setLocallyViewed(true);
        setCountdown(json.data.expires_in ?? 60);
        timerRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              setIdentityUrl(null); // süre doldu — görüntü kapanır
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        setVoiceUrl(json.data.url);
      }
    } catch {
      setError("Bağlantı sorunu.");
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  const identitySpent = Boolean(identityViewedAt) || locallyViewed;

  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: "1px dashed var(--color-border-strong)",
        marginBottom: "var(--space-4)",
      }}
    >
      <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Doğrulama Medyaları — yalnızca süper yönetici
      </p>

      {/* Kimlik */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--font-sm)", fontWeight: 600, minWidth: 130 }}>
          <IdCard size={17} aria-hidden="true" /> Kimlik fotoğrafı
        </span>
        {!hasIdentity ? (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>Yüklenmedi</span>
        ) : identityUrl ? (
          <span style={{ color: "var(--color-warning)", fontSize: "var(--font-sm)" }}>
            Açık — {countdown} sn sonra kapanır
          </span>
        ) : identitySpent ? (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
            <LockKeyhole size={15} aria-hidden="true" style={{ verticalAlign: -3, marginRight: 6 }} />
            Bir kez görüntülendi{identityViewedAt ? ` (${new Date(identityViewedAt).toLocaleString("tr-TR")})` : ""} — erişim kalıcı olarak kapandı
          </span>
        ) : confirming ? (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "var(--color-warning)", fontSize: "var(--font-sm)" }}>
              Bu belgeyi yalnızca BİR KEZ açabilirsin ve erişim loglanır. Emin misin?
            </span>
            <Button variant="danger" onClick={() => fetchMedia("identity")} loading={busy === "identity"}>
              Evet, tek seferlik aç
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
          </span>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Tek seferlik görüntüle
          </Button>
        )}
      </div>

      {identityUrl && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", maxWidth: 520, borderRadius: "var(--radius-md)", overflow: "hidden", userSelect: "none" }}
          aria-label="Kimlik belgesi — tek seferlik görüntüleme"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={identityUrl} alt="Kimlik belgesi" style={{ width: "100%", display: "block", pointerEvents: "none" }} draggable={false} />
          {/* Kimlikli filigran — caydırıcı */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {[0, 1, 2].map((i) => (
              <p
                key={i}
                style={{
                  transform: "rotate(-22deg)",
                  color: "rgba(255, 255, 255, 0.35)",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                }}
              >
                RAPLAB · @{adminUsername} · {new Date().toLocaleString("tr-TR")} · TEK SEFERLİK
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Ses beyanı */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--font-sm)", fontWeight: 600, minWidth: 130 }}>
          <Mic2 size={17} aria-hidden="true" /> Ses beyanı
        </span>
        {!hasVoice ? (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>Yüklenmedi</span>
        ) : voiceUrl ? (
          <audio controls autoPlay src={voiceUrl} style={{ height: 40 }} />
        ) : (
          <Button variant="secondary" onClick={() => fetchMedia("voice")} loading={busy === "voice"}>
            Beyanı dinle (loglanır)
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
