"use client";

/** Bildir butonu — Şartname 4.2/8.4: uygunsuz içeriği bildirme */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReportReason, ReportTargetType } from "@/types";
import { Button } from "@/components/ui/Button";
import styles from "./posts.module.css";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam veya yanıltıcı" },
  { value: "harassment", label: "Taciz veya nefret" },
  { value: "impersonation", label: "Sahte hesap / taklit" },
  { value: "copyright", label: "Telif ihlali" },
  { value: "inappropriate_content", label: "Uygunsuz içerik" },
  { value: "other", label: "Diğer" },
];

export function ReportButton({
  targetType,
  targetId,
  isAuthenticated,
}: {
  targetType: ReportTargetType;
  targetId: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function openDialog() {
    if (!isAuthenticated) {
      router.push("/giris?geri=" + encodeURIComponent(window.location.pathname));
      return;
    }
    setOpen(true);
  }

  async function submit() {
    setState("sending");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, description }),
      });
      const json = await res.json();
      setState(json.success ? "sent" : "error");
      if (json.success) setTimeout(() => setOpen(false), 1600);
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.footerAction}
        onClick={openDialog}
        aria-label="İçeriği bildir"
        aria-haspopup="dialog"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 3v14M5 4h9l-2 3.5L14 11H5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Bildir
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="İçeriği bildir"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(4, 4, 6, 0.7)",
            backdropFilter: "blur(8px)",
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-8)",
              width: "min(440px, 100%)",
              boxShadow: "var(--shadow-deep)",
            }}
          >
            <h3 style={{ marginBottom: "var(--space-4)" }}>İçeriği bildir</h3>

            {state === "sent" ? (
              <p style={{ color: "var(--color-success)" }} role="status">
                Bildirimin alındı. Moderasyon ekibi inceleyecek.
              </p>
            ) : (
              <>
                <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
                  <legend className="sr-only">Bildirim nedeni</legend>
                  {REASONS.map((r) => (
                    <label key={r.value} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 32, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </fieldset>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                  placeholder="İsteğe bağlı açıklama"
                  rows={3}
                  style={{
                    width: "100%",
                    marginTop: "var(--space-4)",
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-soft)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-3)",
                    resize: "vertical",
                  }}
                />

                {state === "error" && (
                  <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", marginTop: "var(--space-2)" }}>
                    Bildirim gönderilemedi. Tekrar dene.
                  </p>
                )}

                <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)", justifyContent: "flex-end" }}>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Vazgeç
                  </Button>
                  <Button variant="danger" onClick={submit} loading={state === "sending"}>
                    Bildir
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
