/**
 * Tema kontrast kontrolü — Şartname 17.2 ("Sanatçı vurgu rengi kontrast
 * kontrolünden geçmelidir"), 28 ("Tema renginde okunmayan metin" çözümü)
 * WCAG AA hedefi — Şartname 31.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/** WCAG kontrast oranı (1–21) */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const BG_PRIMARY: Rgb = { r: 8, g: 9, b: 11 }; // --color-bg-primary #08090b
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

/** Vurgu rengi koyu zeminde AA kontrastını geçiyor mu? */
export function accentPassesContrast(hex: string, minRatio = WCAG_AA_LARGE): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return contrastRatio(rgb, BG_PRIMARY) >= minRatio;
}

/**
 * Güvensiz renkleri otomatik düzeltme — Şartname 28.
 * Renk koyu zeminde okunmuyorsa kontrast sağlanana kadar aydınlatılır.
 */
export function ensureReadableAccent(hex: string, minRatio = WCAG_AA_LARGE): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ff5f68"; // geçersiz girişte platform varsayılanı
  let current = { ...rgb };
  let guard = 0;
  while (contrastRatio(current, BG_PRIMARY) < minRatio && guard < 40) {
    current = {
      r: current.r + (255 - current.r) * 0.12,
      g: current.g + (255 - current.g) * 0.12,
      b: current.b + (255 - current.b) * 0.12,
    };
    guard++;
  }
  return rgbToHex(current);
}

/** CSS değişkenleri için "r, g, b" dizesi üretir. */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex) ?? { r: 255, g: 95, b: 104 };
  return `${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}`;
}
