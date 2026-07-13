/** Gönderiler — Şartname 13.1: taslaklar, zamanlanmışlar, yayındakiler; sabitle/gizle/arşivle */

import type { Metadata } from "next";
import Link from "next/link";
import { getStudioPosts } from "@/features/posts/service";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import { PostRowActions } from "./PostRowActions";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Gönderiler — Artist Studio", robots: { index: false } };

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Taslak", tone: "neutral" },
  uploading: { label: "Yükleniyor", tone: "info" },
  processing: { label: "İşleniyor", tone: "info" },
  scheduled: { label: "Zamanlandı", tone: "warning" },
  published: { label: "Yayında", tone: "success" },
  hidden: { label: "Gizli", tone: "warning" },
  archived: { label: "Arşivde", tone: "neutral" },
  failed: { label: "Başarısız", tone: "danger" },
};

const TYPE_LABEL: Record<string, string> = {
  text: "Metin",
  image: "Görsel",
  gallery: "Galeri",
  video: "Video",
  audio_teaser: "Kısa Ses",
  announcement: "Duyuru",
  countdown: "Geri Sayım",
  project: "Proje",
};

export default async function StudioPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const posts = await getStudioPosts(ctx.artist.id, ctx.user);

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/gonderiler"
      title="Gönderiler"
      subtitle={`${posts.length} gönderi — taslaklar, zamanlanmışlar ve yayındakiler`}
    >
      {posts.length === 0 ? (
        <EmptyState
          title="Henüz gönderi yok"
          description="İlk gönderini oluşturarak topluluğunla konuşmaya başla."
          action={
            <Link href={`/artist-studio/yeni-gonderi?sanatci=${ctx.artist.id}`} style={{ color: "var(--artist-accent)", fontWeight: 600 }}>
              Yeni gönderi oluştur →
            </Link>
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Gönderi</th>
                <th scope="col">Tür</th>
                <th scope="col">Durum</th>
                <th scope="col">Görünürlük</th>
                <th scope="col">Beğeni</th>
                <th scope="col">Tarih</th>
                <th scope="col">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
                return (
                  <tr key={p.id}>
                    <td style={{ maxWidth: 280 }}>
                      <p style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.is_pinned && "📌 "}
                        {p.title ?? p.body?.slice(0, 60) ?? "—"}
                      </p>
                    </td>
                    <td>{TYPE_LABEL[p.post_type]}</td>
                    <td>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </td>
                    <td>
                      {p.visibility === "public" ? "Herkese açık" : p.visibility === "followers" ? "Takipçiler" : "Liste dışı"}
                    </td>
                    <td>{p.like_count.toLocaleString("tr-TR")}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--color-text-muted)" }}>
                      {p.status === "scheduled" && p.scheduled_at
                        ? `⏱ ${new Date(p.scheduled_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : new Date(p.published_at ?? p.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </td>
                    <td>
                      <PostRowActions postId={p.id} status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </StudioShell>
  );
}
