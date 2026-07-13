"use client";

/**
 * Kayıt formu — Şartname 11.1 değişkenleri:
 * email, password, password_confirmation, username, display_name,
 * terms_accepted, privacy_accepted, marketing_consent
 * Form hata özeti erişilebilirlik gereği en üstte gösterilir (31).
 */

import { useRef, useState, useTransition } from "react";
import { registerWithEmail, type AuthActionResult } from "@/features/auth/actions";
import { SEARCH_DEBOUNCE_MS, validateUsername } from "@/lib/validation";

export function RegisterForm({ disabled }: { disabled: boolean }) {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setResult(await registerWithEmail(formData));
    });
  }

  return (
    <form action={onSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
      {result && (
        <div
          role={result.ok ? "status" : "alert"}
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${result.ok ? "var(--color-success)" : "var(--color-danger)"}`,
            color: result.ok ? "var(--color-success)" : "var(--color-danger)",
            fontSize: "var(--font-sm)",
          }}
        >
          <p>{result.message}</p>
          {result.fieldErrors && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "1.2em" }}>
              {Object.entries(result.fieldErrors).map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        E-posta
        <input name="email" type="email" required autoComplete="email" disabled={disabled} className="auth-input" />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Kullanıcı adı
        <input
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9._]{3,24}"
          disabled={disabled}
          className="auth-input"
          aria-describedby="kullanici-adi-ipucu"
          onChange={(e) => {
            const v = e.target.value.toLowerCase();
            setUsernameOk(null);
            if (checkTimer.current) clearTimeout(checkTimer.current);
            if (!v) return setUsernameHint(null);
            const check = validateUsername(v);
            setUsernameHint(check.valid ? null : (check.error ?? null));
            if (!check.valid) return;
            // Canlı müsaitlik kontrolü — aynı ad iki kullanıcıya verilmez (11.2)
            checkTimer.current = setTimeout(async () => {
              try {
                const res = await fetch(`/api/auth/username-check?u=${encodeURIComponent(v)}`);
                const json = await res.json();
                if (json.success) {
                  setUsernameOk(json.data.available);
                  setUsernameHint(json.data.available ? null : (json.data.reason ?? "Bu ad alınmış."));
                }
              } catch {
                /* sessiz — asıl güvence veritabanı unique constraint */
              }
            }, SEARCH_DEBOUNCE_MS);
          }}
        />
        <span
          id="kullanici-adi-ipucu"
          aria-live="polite"
          style={{
            fontSize: "var(--font-xs)",
            color: usernameHint
              ? "var(--color-danger)"
              : usernameOk
                ? "var(--color-success)"
                : "var(--color-text-muted)",
          }}
        >
          {usernameHint ?? (usernameOk ? "✓ Bu kullanıcı adı müsait" : "3–24 karakter; küçük harf, sayı, nokta ve alt çizgi.")}
        </span>
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Görünen ad
        <input name="display_name" type="text" required maxLength={60} disabled={disabled} className="auth-input" />
        <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
          Türkçe karakterler görünen adda kullanılabilir.
        </span>
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Parola
        <input name="password" type="password" required minLength={8} autoComplete="new-password" disabled={disabled} className="auth-input" />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Parola (tekrar)
        <input name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" disabled={disabled} className="auth-input" />
      </label>

      <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
        <input name="terms_accepted" type="checkbox" required disabled={disabled} style={{ marginTop: 3 }} />
        <span>Kullanım koşullarını okudum ve kabul ediyorum.</span>
      </label>

      <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
        <input name="privacy_accepted" type="checkbox" required disabled={disabled} style={{ marginTop: 3 }} />
        <span>Gizlilik politikasını okudum ve kabul ediyorum.</span>
      </label>

      <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
        <input name="marketing_consent" type="checkbox" disabled={disabled} style={{ marginTop: 3 }} />
        <span>Yeni özellik ve kampanya duyurularını e-posta ile almak istiyorum (isteğe bağlı).</span>
      </label>

      <button
        type="submit"
        disabled={disabled || pending}
        style={{
          padding: "12px",
          borderRadius: "var(--radius-pill)",
          background: "var(--artist-accent)",
          color: "#0a0a0c",
          fontWeight: 700,
          opacity: disabled ? 0.5 : 1,
          minHeight: 44,
        }}
      >
        {pending ? "Gönderiliyor…" : "Kayıt ol"}
      </button>
    </form>
  );
}
