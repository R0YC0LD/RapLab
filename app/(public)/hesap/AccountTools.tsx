"use client";

/**
 * Hesap araçları:
 * - E-posta doğrulama: Google ile girenlerde ayrı doğrulama e-postası GELMEZ;
 *   bu buton auth kaydındaki durumu profile senkronlar. E-posta kullanıcısına
 *   ise doğrulama e-postasını yeniden gönderir.
 * - Profil fotoğrafı yükleme (gerçek Supabase Storage)
 * - Kullanıcı adı değiştirme (canlı müsaitlik kontrolü — tekil ad garantisi)
 */

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { uploadFormWithTimeout, validateImageSelection } from "@/lib/uploads/client";
import { SEARCH_DEBOUNCE_MS } from "@/lib/validation";

export function VerifyEmailButton({
  verified,
  provider,
}: {
  verified: boolean;
  provider: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "resent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    },
    []
  );

  function startCooldown(seconds: number) {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(seconds);
    cooldownTimer.current = setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  if (verified) return null;

  async function verify() {
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data.email_verified) {
        setState("done");
        router.refresh();
      } else if (json.success && json.data.resent) {
        setState("resent");
        startCooldown(json.data.retry_after_seconds ?? 60);
        setMessage("Doğrulama e-postası gönderildi — gelen kutunu (ve spam klasörünü) kontrol et.");
      } else {
        setState("error");
        setMessage(json.error?.message ?? "Doğrulama tamamlanamadı.");
      }
    } catch {
      setState("error");
      setMessage("Bağlantı sorunu. Tekrar dene.");
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <Button
        variant="secondary"
        onClick={verify}
        loading={state === "busy"}
        disabled={cooldown > 0}
      >
        {state === "done"
          ? "Doğrulandı ✓"
          : cooldown > 0
            ? `Tekrar gönder (${cooldown} sn)`
            : provider === "google"
              ? "Hesabımı doğrula"
              : "Doğrulama e-postasını yeniden gönder"}
      </Button>
      {message && (
        <span
          role={state === "error" ? "alert" : "status"}
          style={{
            fontSize: "var(--font-xs)",
            color: state === "error" ? "var(--color-danger)" : "var(--color-info)",
            maxWidth: 320,
          }}
        >
          {message}
        </span>
      )}
    </span>
  );
}

export function AvatarUploader({
  demoMode,
  currentAvatar,
}: {
  demoMode: boolean;
  currentAvatar: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatar);

  async function upload(file: File) {
    const validationError = validateImageSelection(file, 5 * 1024 * 1024);
    if (validationError) {
      setState("error");
      setMessage(validationError);
      return;
    }
    setState("busy");
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { json } = await uploadFormWithTimeout("/api/profile/avatar", fd);
      if (json.success) {
        setPreview(json.data.avatar_path);
        setState("done");
        setMessage("Profil fotoğrafın güncellendi.");
        startTransition(() => router.refresh());
      } else {
        setState("error");
        const requestId = json.request_id ? ` (${json.request_id})` : "";
        setMessage(`${json.error?.field_errors?.file ?? json.error?.message ?? "Yükleme başarısız."}${requestId}`);
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Bağlantı sorunu.");
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Yeni profil fotoğrafı ön izlemesi"
          width={56}
          height={56}
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border-soft)" }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        loading={state === "busy"}
        disabled={demoMode}
        onClick={() => inputRef.current?.click()}
        title={demoMode ? "Demo modunda kapalı" : undefined}
      >
        {currentAvatar ? "Profil fotoğrafını değiştir" : "Profil fotoğrafı yükle"}
      </Button>
      {message && (
        <span
          role={state === "error" ? "alert" : "status"}
          style={{ fontSize: "var(--font-xs)", color: state === "error" ? "var(--color-danger)" : "var(--color-success)", maxWidth: 320 }}
        >
          {message}
        </span>
      )}
    </span>
  );
}

export function UsernameChanger({
  currentUsername,
  displayName,
}: {
  currentUsername: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUsername);
  const [check, setCheck] = useState<{ available: boolean; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    const next = v.toLowerCase();
    setValue(next);
    setCheck(null);
    setMessage(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next === currentUsername || next.length < 3) return;
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-check?u=${encodeURIComponent(next)}`);
        const json = await res.json();
        if (json.success) setCheck(json.data);
      } catch {
        /* sessiz */
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value, display_name: displayName, terms_accepted: true }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        router.refresh();
      } else {
        setMessage(json.error?.field_errors?.username ?? json.error?.message ?? "Değiştirilemedi.");
      }
    } catch {
      setMessage("Bağlantı sorunu.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        ✏️ Kullanıcı adını değiştir
      </Button>
    );
  }

  const unchanged = value === currentUsername;

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Yeni kullanıcı adı
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={24}
          style={{
            padding: "10px 14px",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-soft)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
          }}
          aria-describedby="ka-durum"
        />
      </label>
      <span
        id="ka-durum"
        aria-live="polite"
        style={{
          fontSize: "var(--font-xs)",
          color: check
            ? check.available
              ? "var(--color-success)"
              : "var(--color-danger)"
            : "var(--color-text-muted)",
        }}
      >
        {unchanged
          ? "Mevcut kullanıcı adın."
          : check
            ? check.available
              ? "✓ Bu ad müsait"
              : `✗ ${check.reason ?? "Bu ad kullanılamaz."}`
            : "3–24 karakter; küçük harf, sayı, nokta, alt çizgi. Aynı ad iki kullanıcıya verilmez."}
      </span>
      {message && (
        <span role="alert" style={{ fontSize: "var(--font-xs)", color: "var(--color-danger)" }}>
          {message}
        </span>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={save} loading={busy} disabled={unchanged || !check?.available}>
          Kaydet
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); setValue(currentUsername); }}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
