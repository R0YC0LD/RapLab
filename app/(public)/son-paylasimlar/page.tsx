/** Son Paylaşımlar — Şartname 6.1 navigasyon bölümü */

import type { Metadata } from "next";
import { getPersonalFeed } from "@/features/posts/service";
import { getSessionUser } from "@/lib/auth/session";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "Son Paylaşımlar" };

export default async function LatestPostsPage() {
  const user = await getSessionUser();
  // Herkese açık son paylaşımlar (takip filtresi olmadan)
  const feed = await getPersonalFeed(null, 0);

  return (
    <div className={`container ${styles.section} page-enter`}>
      <h1 className={ui.sectionTitle}>
        Son Paylaşımlar <span>platformdaki en yeni içerikler</span>
      </h1>
      {feed.posts.length === 0 ? (
        <EmptyState title="Henüz paylaşım yok" />
      ) : (
        <div className={styles.feed}>
          {feed.posts.map((post) => (
            <PostCard key={post.id} post={post} isAuthenticated={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
