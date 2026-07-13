/** Sanatçılar dizini — Şartname 6.5 (şehir ve tür bazlı keşif) */

import type { Metadata } from "next";
import Link from "next/link";
import { listActiveArtists } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";
import postStyles from "@/components/posts/posts.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "Sanatçılar" };

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ sehir?: string; tur?: string }>;
}) {
  const { sehir, tur } = await searchParams;
  const user = await getSessionUser();
  const all = await listActiveArtists(user?.id ?? null);

  const cities = [...new Set(all.map((a) => a.city).filter(Boolean))] as string[];
  const genres = [...new Set(all.flatMap((a) => a.genres))];

  let artists = all;
  if (sehir) artists = artists.filter((a) => a.city === sehir);
  if (tur) artists = artists.filter((a) => a.genres.includes(tur));

  return (
    <div className={`container ${styles.section} page-enter`}>
      <h1 className={ui.sectionTitle}>
        Sanatçılar <span>{all.length} doğrulanmış profil</span>
      </h1>

      <div className={postStyles.filters} style={{ marginBottom: "var(--space-4)" }}>
        <Link href="/sanatcilar" className={`${postStyles.filterChip} ${!sehir && !tur ? postStyles.filterChipActive : ""}`}>
          Tümü
        </Link>
        {cities.map((c) => (
          <Link
            key={c}
            href={`/sanatcilar?sehir=${encodeURIComponent(c)}`}
            className={`${postStyles.filterChip} ${sehir === c ? postStyles.filterChipActive : ""}`}
          >
            {c}
          </Link>
        ))}
        {genres.map((g) => (
          <Link
            key={g}
            href={`/sanatcilar?tur=${encodeURIComponent(g)}`}
            className={`${postStyles.filterChip} ${tur === g ? postStyles.filterChipActive : ""}`}
          >
            {g}
          </Link>
        ))}
      </div>

      {artists.length === 0 ? (
        <EmptyState title="Bu filtrede sanatçı bulunamadı" />
      ) : (
        <div className={styles.discoveryGrid}>
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}
    </div>
  );
}
