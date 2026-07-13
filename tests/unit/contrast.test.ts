/** Unit testler — Şartname 29.1: tema kontrast kontrolü */

import { describe, expect, it } from "vitest";
import {
  accentPassesContrast,
  contrastRatio,
  ensureReadableAccent,
  hexToRgb,
  hexToRgbString,
  rgbToHex,
} from "@/lib/theme/contrast";

describe("renk dönüşümleri", () => {
  it("hex → rgb → hex gidiş dönüş", () => {
    expect(hexToRgb("#ff4d5a")).toEqual({ r: 255, g: 77, b: 90 });
    expect(rgbToHex({ r: 255, g: 77, b: 90 })).toBe("#ff4d5a");
    expect(hexToRgb("hatalı")).toBeNull();
  });

  it("CSS rgb dizesi üretir", () => {
    expect(hexToRgbString("#ff4d5a")).toBe("255, 77, 90");
  });
});

describe("WCAG kontrast (17.2, 28, 31)", () => {
  it("beyaz-siyah maksimum orana yakındır", () => {
    const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    expect(ratio).toBeGreaterThan(20);
  });

  it("koyu zeminde koyu vurgu rengini yakalar", () => {
    expect(accentPassesContrast("#111318")).toBe(false);
    expect(accentPassesContrast("#ff4d5a")).toBe(true);
    expect(accentPassesContrast("#f2c94c")).toBe(true);
  });

  it("okunmayan rengi otomatik düzeltir (28)", () => {
    const fixed = ensureReadableAccent("#101216");
    expect(accentPassesContrast(fixed)).toBe(true);
  });

  it("geçersiz renkte platform varsayılanına döner", () => {
    expect(ensureReadableAccent("bozuk")).toBe("#ff5f68");
  });

  it("zaten okunabilir rengi değiştirmez", () => {
    expect(ensureReadableAccent("#58d68d")).toBe("#58d68d");
  });
});
