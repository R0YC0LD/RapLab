/** Projeler — Şartname 13.1: geri sayımlar ve proje duyuruları yönetimi */

import type { Metadata } from "next";
import Link from "next/link";
import { getStudioPosts } from "@/features/posts/service";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Projeler — Artist Studio", robots: { index: false } };

/** Sunucu tarafında istek anına göre kalan gün hesabı */
function remainingDaysUntil(ends: string | undefined): number | null {
  if (!ends) return null;
  return Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / 86_400_000));
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const posts = await getStudioPosts(ctx.artist.id, ctx.user);
  const projects = posts.filter((p) =>
    ["project", "countdown", "announcement"].includes(p.post_type)
  );

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/projeler"
      title="Projeler"
      subtitle="Geri sayımlar, duyurular ve uzun soluklu projeler"
    >
      {projects.length === 0 ? (
        <EmptyState
          title="Aktif proje yok"
          description="Geri sayım veya duyuru oluşturarak takipçilerini bilgilendir."
          action={
            <Link href={`/artist-studio/yeni-gonderi?sanatci=${ctx.artist.id}`} style={{ color: "var(--artist-accent)", fontWeight: 600 }}>
              Yeni duyuru →
            </Link>
          }
        />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {projects.map((p) => {
            const ends = p.meta?.countdown_ends_at;
            const remainingDays = remainingDaysUntil(ends);
            return (
              <div key={p.id} className={styles.panel} style={{ display: "flex", gap: "var(--space-5)", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ fontWeight: 700, fontSize: "var(--font-lg)" }}>{p.title ?? "Duyuru"}</p>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
                    {p.post_type === "countdown" ? "Geri sayım" : p.post_type === "project" ? "Proje" : "Duyuru"}
                    {p.meta?.status_label ? ` · ${p.meta.status_label}` : ""}
                  </p>
                </div>
                {remainingDays !== null && (
                  <div style={{ textAlign: "center" }}>
                    <p className={styles.statValue} style={{ color: "var(--artist-accent)" }}>{remainingDays}</p>
                    <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>gün kaldı</p>
                  </div>
                )}
                <StatusChip tone={p.status === "published" ? "success" : "neutral"}>
                  {p.status === "published" ? "Yayında" : p.status}
                </StatusChip>
              </div>
            );
          })}
        </div>
      )}
    </StudioShell>
  );
}
