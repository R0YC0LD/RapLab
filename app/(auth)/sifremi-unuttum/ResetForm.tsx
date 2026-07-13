"use client";

import { useState, useTransition } from "react";
import type { AuthActionResult } from "@/features/auth/actions";

export function ResetForm({
  action,
  disabled,
}: {
  action: (formData: FormData) => Promise<AuthActionResult>;
  disabled: boolean;
}) {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(async () => setResult(await action(fd)))}
      style={{ display: "grid", gap: "var(--space-4)" }}
    >
      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${result.ok ? "var(--color-success)" : "var(--color-danger)"}`,
            color: result.ok ? "var(--color-success)" : "var(--color-danger)",
            fontSize: "var(--font-sm)",
          }}
        >
          {result.message}
        </p>
      )}
      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        E-posta
        <input name="email" type="email" required autoComplete="email" disabled={disabled} className="auth-input" />
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
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>
    </form>
  );
}
