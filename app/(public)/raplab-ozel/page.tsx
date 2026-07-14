/** RapLab Özel — Şartname 6.1/6.3: accent-gold işaretli editör içerikleri */

import type { Metadata } from "next";
import { listActiveArtists } from "@/features/artists/service";
import { getArtistPosts } from "@/features/posts/service";
import { getSessionUser } from "@/lib/auth/session";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "RapLab TR Özel" };

export default async function SpecialPage() {
  const user = await getSessionUser();
  const artists = await listActiveArtists(user?.id ?? null);
  const special = artists.filter((a) => a.is_raplab_special);

  const posts = (
    await Promise.all(special.map((a) => getArtistPosts(a.id, user, "all")))
  ).flat();

  return (
    <div className={`container ${styles.section} page-enter`}>
      <h1 className={ui.sectionTitle}>
        RapLab TR Özel <span style={{ color: "var(--accent-gold)" }}>editör masasından</span>
      </h1>

      {special.length === 0 ? (
        <EmptyState title="Şu anda özel içerik yok" />
      ) : (
        <>
          <div className={styles.discoveryGrid} style={{ marginBottom: "var(--space-12)" }}>
            {special.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
          <div className={styles.feed}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
