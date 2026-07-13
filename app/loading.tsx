/** Yükleme durumu — Şartname 36: loading durumları tasarlanmalıdır */

export default function Loading() {
  return (
    <div
      className="container"
      style={{ padding: "var(--space-16) var(--space-6)", display: "grid", gap: "var(--space-6)" }}
      role="status"
      aria-label="Sayfa yükleniyor"
    >
      <div className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
      <div style={{ display: "flex", gap: "var(--space-5)" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: 84, height: 84, borderRadius: "50%" }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 180, maxWidth: 760, borderRadius: "var(--radius-lg)" }} />
      <div className="skeleton" style={{ height: 180, maxWidth: 760, borderRadius: "var(--radius-lg)" }} />
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}
