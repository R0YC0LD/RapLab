import styles from "./ui.module.css";

export function Avatar({
  src,
  alt,
  size = 40,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  if (!src) {
    return (
      <span
        className={styles.avatar}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.4,
          color: "var(--color-text-muted)",
        }}
        aria-label={alt}
        role="img"
      >
        {alt.slice(0, 1).toLocaleUpperCase("tr-TR")}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- demo SVG varlıkları için yerel img
  return <img className={styles.avatar} src={src} alt={alt} width={size} height={size} />;
}
