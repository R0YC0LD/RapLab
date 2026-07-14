"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import type { SessionUser } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./nav.module.css";

const NAV_LINKS = [
  { href: "/kesfet", label: "Keşfet", beat: "hat" },
  { href: "/sanatcilar", label: "Sanatçılar", beat: "snare" },
  { href: "/sanatsal", label: "Sanatsal", beat: "bass" },
  { href: "/vatan", label: "Vatan" },
  { href: "/son-paylasimlar", label: "Son Paylaşımlar", beat: "kick" },
  { href: "/yaklasanlar", label: "Yaklaşanlar", beat: "snare" },
  { href: "/raplab-ozel", label: "RapLab TR Özel", beat: "bass" },
] satisfies ReadonlyArray<{ href: string; label: string; beat?: string }>;

export function TopNav({
  user,
  notificationCount,
}: {
  user: SessionUser | null;
  notificationCount: number;
}) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      const next = window.scrollY > 24;
      if (next !== compactRef.current) {
        compactRef.current = next;
        setCompact(next);
      }
    };
    const onScroll = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

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
          <Link
            href="/"
            className={`${styles.logo} ${compact ? styles.logoCompact : ""}`}
            aria-label="RapLab TR ana sayfa"
          >
            RAP<em>LAB</em><span className={styles.countryMark}>TR</span>
          </Link>

          <nav className={styles.links} aria-label="Ana navigasyon">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${pathname === link.href ? styles.linkActive : ""}`}
                aria-current={pathname === link.href ? "page" : undefined}
                data-beat-instrument={link.beat}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <Link
              href="/arama"
              className={styles.iconButton}
              aria-label="Arama"
            >
              <Search size={19} strokeWidth={2} aria-hidden="true" />
            </Link>

            {user ? (
              <>
                <Link
                  href="/bildirimler"
                  className={styles.iconButton}
                  aria-label={`Bildirimler${notificationCount > 0 ? ` (${notificationCount} okunmamış)` : ""}`}
                >
                  <Bell size={19} strokeWidth={1.9} aria-hidden="true" />
                  {notificationCount > 0 && (
                    <span className={styles.badge}>{notificationCount > 9 ? "9+" : notificationCount}</span>
                  )}
                </Link>
                <Link
                  href="/hesap"
                  aria-label="Profil ve hesap ayarları"
                  style={{ display: "inline-flex", borderRadius: "50%" }}
                >
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
