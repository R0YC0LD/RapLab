import styles from "./ui.module.css";

/** Doğrulama rozeti — sadece renge dayanmaz, erişilebilir etiket taşır (31) */
export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      className={styles.verifiedBadge}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Doğrulanmış sanatçı"
      title="Doğrulanmış sanatçı"
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 6.2 4.8 9 10 3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const colors: Record<string, string> = {
    neutral: "var(--color-text-secondary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
    info: "var(--color-info)",
  };
  return (
    <span className={styles.statusChip} style={{ color: colors[tone] }}>
      {children}
    </span>
  );
}
