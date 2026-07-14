"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, Images, Mic2, UserRound, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/types";
import styles from "./nav.module.css";

const ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  beat: "kick" | "snare" | "hat" | "bass";
}[] = [
  { href: "/", label: "Ana Sayfa", icon: House, beat: "kick" },
  { href: "/sanatsal", label: "Sanatsal", icon: Images, beat: "bass" },
  { href: "/sanatcilar", label: "Sanatçılar", icon: Mic2, beat: "snare" },
  { href: "/bildirimler", label: "Bildirimler", icon: Bell, beat: "hat" },
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
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.mobileLink} ${pathname === item.href ? styles.mobileLinkActive : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}
            data-beat-instrument={item.beat}
          >
            <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
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
        );
      })}
      <Link
        href={user ? "/hesap" : "/giris"}
        className={`${styles.mobileLink} ${pathname === "/hesap" || pathname === "/giris" ? styles.mobileLinkActive : ""}`}
        data-beat-instrument="bass"
      >
        <UserRound size={20} strokeWidth={1.9} aria-hidden="true" />
        <span>{user ? "Profil" : "Giriş"}</span>
      </Link>
    </nav>
  );
}
