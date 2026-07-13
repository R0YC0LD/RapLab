"use client";

/**
 * Mobil alt navigasyon — Şartname 6.1:
 * Ana Sayfa, Keşfet, Sanatçılar, Bildirimler, Profil
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/types";
import styles from "./nav.module.css";

const ITEMS = [
  {
    href: "/",
    label: "Ana Sayfa",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m3 9 7-6 7 6v8h-5v-5H8v5H3V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/sanatsal",
    label: "Sanatsal",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 15.5 7.5 11l3 3L17 7.5V17H3v-1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <circle cx="7" cy="6" r="2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    href: "/sanatcilar",
    label: "Sanatçılar",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 17c1-3 3.5-4.5 6.5-4.5s5.5 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/bildirimler",
    label: "Bildirimler",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 2a5 5 0 0 0-5 5v3l-1.5 3h13L15 10V7a5 5 0 0 0-5-5Zm-2 12a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function MobileNav({
  user,
  notificationCount,
}: {
  user: SessionUser | null;
  notificationCount: number;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/artist-studio") || pathname?.startsWith("/control-center")) {
    return null;
  }

  return (
    <nav className={styles.mobileNav} aria-label="Mobil navigasyon">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.mobileLink} ${pathname === item.href ? styles.mobileLinkActive : ""}`}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.href === "/bildirimler" && notificationCount > 0 && (
            <>
              <span className={styles.mobileBadge} aria-hidden="true">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
              <span className="sr-only">{notificationCount} okunmamış bildirim</span>
            </>
          )}
        </Link>
      ))}
      <Link
        href={user ? "/hesap" : "/giris"}
        className={`${styles.mobileLink} ${pathname === "/hesap" || pathname === "/giris" ? styles.mobileLinkActive : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 17c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>{user ? "Profil" : "Giriş"}</span>
      </Link>
    </nav>
  );
}
