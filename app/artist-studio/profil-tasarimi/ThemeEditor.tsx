"use client";

/**
 * Tema editörü — Şartname 13.6 değişkenleri:
 * accent_color, secondary_color, background_mode, background_texture,
 * hero_overlay_strength, card_style, heading_style, motion_intensity,
 * profile_image, desktop_cover, mobile_cover, logo_mark_optional.
 * Kontrast kontrolü canlı yapılır (17.2, 28).
 */

import { useState } from "react";
import type { ArtistThemeConfig } from "@/types";
import { accentPassesContrast, ensureReadableAccent, hexToRgbString } from "@/lib/theme/contrast";
import styles from "../studio.module.css";

export function ThemeEditor({
  artistName,
  theme,
}: {
  artistName: string;
  theme: ArtistThemeConfig;
}) {
  const [accent, setAccent] = useState(theme.accent_color);
  const [secondary, setSecondary] = useState(theme.secondary_color);
  const [backgroundMode, setBackgroundMode] = useState(theme.background_mode);
  const [texture, setTexture] = useState(theme.background_texture);
  const [overlay, setOverlay] = useState(theme.hero_overlay_strength);
  const [cardStyle, setCardStyle] = useState(theme.card_style);
  const [headingStyle, setHeadingStyle] = useState(theme.heading_style);
  const [motion, setMotion] = useState(theme.motion_intensity);
  const [saved, setSaved] = useState(false);

  const contrastOk = accentPassesContrast(accent);
  const safeAccent = ensureReadableAccent(accent);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: "var(--space-8)", alignItems: "start" }}>
      <div className={styles.panel}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <label className={styles.field}>
            Vurgu rengi (accent_color)
            <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setSaved(false); }} className={styles.input} style={{ height: 48, padding: 4 }} />
            {!contrastOk && (
              <span role="alert" style={{ color: "var(--color-warning)", fontSize: "var(--font-xs)" }}>
                Bu renk koyu zeminde WCAG kontrastını geçmiyor; yayında {safeAccent} olarak
                otomatik düzeltilir.
              </span>
            )}
          </label>
          <label className={styles.field}>
            İkincil renk (secondary_color)
            <input type="color" value={secondary} onChange={(e) => { setSecondary(e.target.value); setSaved(false); }} className={styles.input} style={{ height: 48, padding: 4 }} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <label className={styles.field}>
            Arka plan modu
            <select className={styles.input} value={backgroundMode} onChange={(e) => { setBackgroundMode(e.target.value as ArtistThemeConfig["background_mode"]); setSaved(false); }}>
              <option value="solid">Düz</option>
              <option value="gradient">Gradient</option>
              <option value="texture">Dokulu</option>
            </select>
          </label>
          <label className={styles.field}>
            Doku
            <select className={styles.input} value={texture} onChange={(e) => { setTexture(e.target.value as ArtistThemeConfig["background_texture"]); setSaved(false); }}>
              <option value="none">Yok</option>
              <option value="grain">Film grain</option>
              <option value="paper">Kâğıt</option>
              <option value="studio_lines">Stüdyo çizgileri</option>
            </select>
          </label>
          <label className={styles.field}>
            Kart stili
            <select className={styles.input} value={cardStyle} onChange={(e) => { setCardStyle(e.target.value as ArtistThemeConfig["card_style"]); setSaved(false); }}>
              <option value="sharp">Keskin</option>
              <option value="soft">Yumuşak</option>
              <option value="round">Yuvarlak</option>
            </select>
          </label>
          <label className={styles.field}>
            Başlık stili
            <select className={styles.input} value={headingStyle} onChange={(e) => { setHeadingStyle(e.target.value as ArtistThemeConfig["heading_style"]); setSaved(false); }}>
              <option value="display">Display</option>
              <option value="condensed">Sıkışık</option>
              <option value="classic">Klasik</option>
            </select>
          </label>
        </div>

        <label className={styles.field}>
          Hero karartma gücü: {Math.round(overlay * 100)}%
          <input type="range" min={0} max={100} value={overlay * 100} onChange={(e) => { setOverlay(Number(e.target.value) / 100); setSaved(false); }} />
        </label>

        <label className={styles.field}>
          Hareket yoğunluğu
          <select className={styles.input} value={motion} onChange={(e) => { setMotion(e.target.value as ArtistThemeConfig["motion_intensity"]); setSaved(false); }}>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
        </label>

        <div
          style={{
            padding: "var(--space-4)",
            border: "1px dashed var(--color-border-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-xs)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-5)",
          }}
        >
          Profil fotoğrafı, masaüstü/mobil kapak ve logo yüklemeleri medya akışıyla yapılır.
          Güvenlik gereği sanatçılar kendi CSS veya JavaScript kodunu ekleyemez (Şartname 13.6).
        </div>

        <button
          type="button"
          onClick={() => setSaved(true)}
          style={{
            padding: "12px 28px",
            borderRadius: "var(--radius-pill)",
            background: safeAccent,
            color: "#0a0a0c",
            fontWeight: 700,
            minHeight: 44,
          }}
        >
          Temayı kaydet
        </button>
        {saved && (
          <p role="status" style={{ color: "var(--color-success)", fontSize: "var(--font-sm)", marginTop: "var(--space-3)" }}>
            Tema kaydedildi ✓ (demo modunda oturum süresince geçerli)
          </p>
        )}
      </div>

      {/* Canlı ön izleme */}
      <div
        aria-label="Tema ön izlemesi"
        style={{
          borderRadius: cardStyle === "sharp" ? "var(--radius-sm)" : cardStyle === "round" ? "var(--radius-xl)" : "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid var(--color-border-soft)",
          background: backgroundMode === "solid" ? "var(--color-bg-secondary)" : `linear-gradient(160deg, ${secondary}, var(--color-bg-primary) 70%)`,
        }}
      >
        <div
          style={{
            height: 130,
            background: `linear-gradient(180deg, rgba(${hexToRgbString(safeAccent)}, 0.5), rgba(8,9,11,${overlay}))`,
          }}
        />
        <div style={{ padding: "var(--space-5)" }}>
          <p
            style={{
              fontFamily: headingStyle === "classic" ? "var(--font-family-reading)" : "var(--font-family-display)",
              textTransform: headingStyle === "classic" ? "none" : "uppercase",
              fontSize: "var(--font-2xl)",
              letterSpacing: headingStyle === "condensed" ? "-0.04em" : "0",
              marginBottom: 8,
            }}
          >
            {artistName}
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "8px 20px",
              borderRadius: "var(--radius-pill)",
              background: safeAccent,
              color: "#0a0a0c",
              fontWeight: 700,
              fontSize: "var(--font-sm)",
            }}
          >
            Takip Et
          </span>
          <p style={{ marginTop: 14, fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>
            Hareket: {motion === "low" ? "düşük" : motion === "high" ? "yüksek" : "orta"} · Doku: {texture}
          </p>
        </div>
      </div>
    </div>
  );
}
