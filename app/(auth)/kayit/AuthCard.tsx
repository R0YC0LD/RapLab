/** Kimlik doğrulama sayfaları için ortak kart yerleşimi */

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="page-enter"
      style={{
        minHeight: "calc(100dvh - var(--nav-height))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-10) var(--space-4) var(--space-24)",
      }}
    >
      <div
        style={{
          width: "min(460px, 100%)",
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-soft)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-10)",
          boxShadow: "var(--shadow-deep)",
        }}
      >
        <p
          className="type-display"
          style={{ fontSize: "var(--font-lg)", color: "var(--artist-accent)", marginBottom: "var(--space-2)" }}
        >
          RAPLAB TR
        </p>
        <h1 style={{ fontSize: "var(--font-2xl)", marginBottom: "var(--space-2)" }}>{title}</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-8)", fontSize: "var(--font-sm)" }}>
          {subtitle}
        </p>
        {children}
        <style>{`
          .auth-input {
            padding: 12px 14px;
            background: var(--color-bg-elevated);
            border: 1px solid var(--color-border-soft);
            border-radius: var(--radius-sm);
            color: var(--color-text-primary);
            width: 100%;
          }
          .auth-input:disabled { opacity: 0.5; }
        `}</style>
      </div>
    </div>
  );
}
