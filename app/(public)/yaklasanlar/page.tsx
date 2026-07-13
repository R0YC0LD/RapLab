/** Yaklaşanlar — Şartname 6.1: geri sayımlar ve proje duyuruları */

import type { Metadata } from "next";
import { listActiveArtists } from "@/features/artists/service";
import { getArtistPosts } from "@/features/posts/service";
import { getSessionUser } from "@/lib/auth/session";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "Yaklaşanlar" };

export default async function UpcomingPage() {
  const user = await getSessionUser();
  const artists = await listActiveArtists(user?.id ?? null);

  const allPosts = (
    await Promise.all(artists.map((a) => getArtistPosts(a.id, user, "announcement")))
  ).flat();

  const upcoming = allPosts
    .filter(
      (p) =>
        p.post_type === "countdown" ||
        p.post_type === "announcement" ||
        p.post_type === "project"
    )
    .sort((a, b) => {
      const aEnd = a.meta?.countdown_ends_at ?? a.meta?.event_date ?? a.published_at ?? "";
      const bEnd = b.meta?.countdown_ends_at ?? b.meta?.event_date ?? b.published_at ?? "";
      return new Date(aEnd).getTime() - new Date(bEnd).getTime();
    });

  return (
    <div className={`container ${styles.section} page-enter`}>
      <h1 className={ui.sectionTitle}>
        Yaklaşanlar <span>albümler, tekliler, etkinlikler</span>
      </h1>
      {upcoming.length === 0 ? (
        <EmptyState title="Yaklaşan duyuru yok" description="Sanatçılar yeni projelerini duyurduğunda burada göreceksin." />
      ) : (
        <div className={styles.feed}>
          {upcoming.map((post) => (
            <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
