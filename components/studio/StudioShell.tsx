/**
 * Studio kabuğu — Şartname 13.1 panel navigasyonu + sanatçı seçici
 */

import Link from "next/link";
import type { Artist } from "@/types";
import { ensureReadableAccent, hexToRgbString } from "@/lib/theme/contrast";
import { Avatar } from "@/components/ui/Avatar";
import styles from "@/app/artist-studio/studio.module.css";

const NAV = [
  { href: "", label: "Genel Bakış", icon: "◉" },
  { href: "/gonderiler", label: "Gönderiler", icon: "▤" },
  { href: "/yeni-gonderi", label: "Yeni Gönderi", icon: "＋" },
  { href: "/medya", label: "Medya Kütüphanesi", icon: "▣" },
  { href: "/profil-tasarimi", label: "Profil Tasarımı", icon: "◐" },
  { href: "/projeler", label: "Projeler", icon: "◔" },
  { href: "/analizler", label: "Analizler", icon: "∿" },
  { href: "/takipciler", label: "Takipçiler", icon: "◎" },
  { href: "/ekip", label: "Ekip", icon: "⦿" },
  { href: "/ayarlar", label: "Ayarlar", icon: "⚙" },
  { href: "/destek", label: "Destek", icon: "?" },
];

export function StudioShell({
  artist,
  managedArtists,
  activePath,
  title,
  subtitle,
  children,
}: {
  artist: Artist;
  managedArtists: Artist[];
  activePath: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const accent = ensureReadableAccent(artist.theme_config.accent_color);

  return (
    <div
      className={styles.shell}
      style={{
        ["--artist-accent" as string]: accent,
        ["--artist-accent-rgb" as string]: hexToRgbString(accent),
      }}
    >
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          RAP<em>LAB</em> <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", letterSpacing: 0 }}>studio</span>
        </Link>

        {/* 13.1: birden fazla sanatçı yönetiliyorsa seçici */}
        <div>
          <div className={styles.artistPicker}>
            <Avatar src={artist.profile_image_path} alt={artist.stage_name} size={36} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "var(--font-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {artist.stage_name}
              </p>
              <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>aktif profil</p>
            </div>
          </div>
          {managedArtists.length > 1 && (
            <div style={{ display: "grid", gap: 4, marginTop: "var(--space-2)" }}>
              {managedArtists
                .filter((a) => a.id !== artist.id)
                .map((a) => (
                  <Link
                    key={a.id}
                    href={`/artist-studio?sanatci=${a.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Avatar src={a.profile_image_path} alt={a.stage_name} size={22} />
                    {a.stage_name}
                  </Link>
                ))}
            </div>
          )}
        </div>

        <nav className={styles.nav} aria-label="Studio navigasyonu">
          {NAV.map((item) => {
            const href = `/artist-studio${item.href}${item.href ? `?sanatci=${artist.id}` : `?sanatci=${artist.id}`}`;
            const isActive = activePath === (item.href || "/");
            return (
              <Link
                key={item.label}
                href={href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true" style={{ width: 18, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={`/sanatci/${artist.slug}`}
          style={{
            marginTop: "auto",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-soft)",
            textAlign: "center",
            fontSize: "var(--font-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          Herkese açık profili gör ↗
        </Link>
      </aside>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageSubtitle}>{subtitle}</p>
        {children}
      </main>
    </div>
  );
}
