"use client";

/** RapLine sıra editörü — yukarı/aşağı taşıma (klavye erişilebilir) */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RapLineOrderEditor({
  initialOrder,
}: {
  initialOrder: { id: string; stage_name: string }[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setMessage(null);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rapline_order: order.map((o) => o.id) }),
      });
      const json = await res.json();
      setMessage(json.success ? "Sıralama kaydedildi ✓" : (json.error?.message ?? "Kaydedilemedi."));
      if (json.success) router.refresh();
    } catch {
      setMessage("Bağlantı sorunu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
        {order.map((item, i) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-soft)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", width: 24 }}>
              {i + 1}.
            </span>
            <span style={{ fontWeight: 600, flex: 1 }}>{item.stage_name}</span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`${item.stage_name} yukarı taşı`}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border-soft)", opacity: i === 0 ? 0.3 : 1 }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              aria-label={`${item.stage_name} aşağı taşı`}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border-soft)", opacity: i === order.length - 1 ? 0.3 : 1 }}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        <Button onClick={save} loading={busy}>
          Sıralamayı kaydet
        </Button>
        {message && (
          <span role="status" style={{ fontSize: "var(--font-sm)", color: message.includes("✓") ? "var(--color-success)" : "var(--color-danger)" }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
