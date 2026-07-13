import styles from "./ui.module.css";

/** Boş durum tasarımı — Şartname 36: loading, empty ve error durumları tasarlanmalıdır */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: "var(--space-5)" }}>{action}</div>}
    </div>
  );
}
