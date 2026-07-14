import type { CSSProperties } from "react";
import styles from "./brand-sticker.module.css";

export type BrandStickerName =
  | "microphone"
  | "machine"
  | "boombox"
  | "crown"
  | "vinyl"
  | "cassette"
  | "wave"
  | "headphones";

export function BrandSticker({
  name,
  size = 48,
  label,
  className,
}: {
  name: BrandStickerName;
  size?: number;
  label?: string;
  className?: string;
}) {
  const style = {
    "--sticker-size": `${size}px`,
    "--sticker-image": `url("/brand/stickers/${name}.webp")`,
  } as CSSProperties;

  return (
    <span
      className={`${styles.sticker} ${className ?? ""}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
