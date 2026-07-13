/** Keşfet — Şartname 6.5: yeni doğrulananlar, öne çıkanlar, şehirler, türler, editör seçkisi, yaklaşanlar */

import type { Metadata } from "next";
import Link from "next/link";
import { listActiveArtists } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { RapLine } from "@/components/artist/RapLine";
import ui from "@/components/ui/ui.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "Keşfet" };

export default async function DiscoverPage() {
  const user = await getSessionUser();
  const all = await listActiveArtists(user?.id ?? null);

  const newest = all.filter((a) => a.is_newly_verified);
  const featured = [...all].sort((a, b) => b.follower_count - a.follower_count).slice(0, 3);
  const editorsPick = all.filter((a) => a.is_raplab_special);
  const upcoming = all.filter((a) => a.has_active_countdown);
  const cities = [...new Set(all.map((a) => a.city).filter(Boolean))] as string[];

  return (
    <div className="page-enter">
      <section className={`container ${styles.section}`}>
        <h1 className={ui.sectionTitle}>
          Keşfet <span>Türkçe rap&apos;in yaşayan haritası</span>
        </h1>
        <RapLine artists={all} />
      </section>

      {newest.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className="container">
            <h2 className={ui.sectionTitle}>
              Yeni Doğrulanan Sanatçılar <span>taze imzalar</span>
            </h2>
            <div className={styles.discoveryGrid}>
              {newest.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`container ${styles.section}`}>
        <h2 className={ui.sectionTitle}>
          Bu Hafta Öne Çıkanlar <span>topluluğun nabzı</span>
        </h2>
        <div className={styles.discoveryGrid}>
          {featured.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className="container">
          <h2 className={ui.sectionTitle}>
            Şehirlerden Sanatçılar <span>coğrafyaya göre keşfet</span>
          </h2>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {cities.map((city) => (
              <Link
                key={city}
                href={`/sanatcilar?sehir=${encodeURIComponent(city)}`}
                style={{
                  padding: "var(--space-4) var(--space-8)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-soft)",
                  background: "var(--color-bg-elevated)",
                  fontWeight: 700,
                  fontSize: "var(--font-lg)",
                }}
              >
                {city}{" "}
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)", fontWeight: 400 }}>
                  {all.filter((a) => a.city === city).length} sanatçı
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {editorsPick.length > 0 && (
        <section className={`container ${styles.section}`}>
          <h2 className={ui.sectionTitle}>
            RapLab Editör Seçkisi <span>bizden tavsiyeler</span>
          </h2>
          <div className={styles.discoveryGrid}>
            {editorsPick.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className="container">
            <h2 className={ui.sectionTitle}>
              Yaklaşan Proje Duyuruları <span>geri sayımlar</span>
            </h2>
            <div className={styles.discoveryGrid}>
              {upcoming.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
