"use client";

/**
 * Üst navigasyon — Şartname 6.1
 * Masaüstü: logo, Keşfet, Sanatçılar, Son Paylaşımlar, Yaklaşanlar,
 * RapLab Özel, Arama, Bildirimler, Profil, Giriş/Kayıt.
 * Kaydırınca yükseklik küçülür, arka plan bulanıklaşır, logo kompaktlaşır,
 * aktif sayfa göstergesi korunur.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./nav.module.css";

const NAV_LINKS = [
  { href: "/kesfet", label: "Keşfet" },
  { href: "/sanatcilar", label: "Sanatçılar" },
  { href: "/son-paylasimlar", label: "Son Paylaşımlar" },
  { href: "/yaklasanlar", label: "Yaklaşanlar" },
  { href: "/raplab-ozel", label: "RapLab Özel" },
];

export function TopNav({
  user,
  notificationCount,
}: {
  user: SessionUser | null;
  notificationCount: number;
}) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Panel sayfalarında kendi navigasyonları vardır
  if (pathname?.startsWith("/artist-studio") || pathname?.startsWith("/control-center")) {
    return null;
  }

  return (
    <>
      <a href="#icerik" className={styles.skipLink}>
        İçeriğe atla
      </a>
      <header className={`${styles.topNav} ${compact ? styles.topNavCompact : ""}`}>
        <div className={styles.navInner}>
          <Link href="/" className={`${styles.logo} ${compact ? styles.logoCompact : ""}`} aria-label="RapLab ana sayfa">
            RAP<em>LAB</em>
          </Link>

          <nav className={styles.links} aria-label="Ana navigasyon">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${pathname === l.href ? styles.linkActive : ""}`}
                aria-current={pathname === l.href ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <Link href="/arama" className={styles.iconButton} aria-label="Arama">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>

            {user ? (
              <>
                <Link href="/bildirimler" className={styles.iconButton} aria-label={`Bildirimler${notificationCount > 0 ? ` (${notificationCount} okunmamış)` : ""}`}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 2a5 5 0 0 0-5 5v3l-1.5 3h13L15 10V7a5 5 0 0 0-5-5Zm-2 12a2 2 0 0 0 4 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {notificationCount > 0 && (
                    <span className={styles.badge}>{notificationCount > 9 ? "9+" : notificationCount}</span>
                  )}
                </Link>
                <Link href="/hesap" aria-label="Profil ve hesap ayarları" style={{ display: "inline-flex", borderRadius: "50%" }}>
                  <Avatar src={user.profile.avatar_path} alt={user.profile.display_name} size={36} />
                </Link>
              </>
            ) : (
              <Link
                href="/giris"
                className={styles.link}
                style={{
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-text-primary)",
                }}
              >
                Giriş / Kayıt
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
