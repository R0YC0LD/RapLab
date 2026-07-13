/** Control Center kabuğu — Şartname 14.1 ana navigasyon */

import Link from "next/link";
import styles from "@/app/control-center/cc.module.css";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "İzleme",
    items: [
      { href: "/control-center", label: "Sistem Özeti" },
      { href: "/control-center/sistem-sagligi", label: "Sistem Sağlığı" },
      { href: "/control-center/hata-merkezi", label: "Hata Merkezi" },
      { href: "/control-center/audit-log", label: "Audit Log" },
    ],
  },
  {
    group: "Topluluk",
    items: [
      { href: "/control-center/basvurular", label: "Sanatçı Başvuruları" },
      { href: "/control-center/sanatcilar", label: "Sanatçılar" },
      { href: "/control-center/kullanicilar", label: "Kullanıcılar" },
      { href: "/control-center/gonderiler", label: "Gönderiler" },
      { href: "/control-center/raporlar", label: "Raporlar" },
      { href: "/control-center/bildirimler", label: "Bildirimler" },
    ],
  },
  {
    group: "Yayın",
    items: [
      { href: "/control-center/ana-sayfa", label: "Ana Sayfa Yönetimi" },
      { href: "/control-center/rapline", label: "RapLine" },
      { href: "/control-center/medya", label: "Medya" },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/control-center/roller", label: "Roller ve Yetkiler" },
      { href: "/control-center/ozellik-bayraklari", label: "Özellik Bayrakları" },
      { href: "/control-center/ayarlar", label: "Ayarlar" },
    ],
  },
];

export function CCShell({
  activeHref,
  title,
  subtitle,
  children,
}: {
  activeHref: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.statusDot} aria-hidden="true" />
          RAPLAB <span style={{ color: "var(--color-info)", letterSpacing: 0, fontSize: "var(--font-xs)" }}>control</span>
        </Link>

        {NAV.map((group) => (
          <nav key={group.group} aria-label={group.group}>
            <p className={styles.navGroupLabel}>{group.group}</p>
            <div style={{ display: "grid", gap: 2 }}>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${activeHref === item.href ? styles.navLinkActive : ""}`}
                  aria-current={activeHref === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ))}
      </aside>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageSubtitle}>{subtitle}</p>
        {children}
      </main>
    </div>
  );
}
