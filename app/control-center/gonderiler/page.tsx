/** Gönderi yönetimi — Şartname 14.5: filtreler ve moderasyon işlemleri */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { StatusChip } from "@/components/ui/Badge";
import { PostRowActions } from "@/app/artist-studio/gonderiler/PostRowActions";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Gönderiler — Control Center", robots: { index: false } };

export default async function CCPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; tur?: string }>;
}) {
  await requireCC();
  const { durum, tur } = await searchParams;

  const s = isDemoMode() ? demoState() : null;
  let posts = s ? [...s.posts] : [];
  const artistById = s ? new Map(s.artists.map((a) => [a.id, a])) : new Map();

  if (durum) posts = posts.filter((p) => p.status === durum);
  if (tur) posts = posts.filter((p) => p.post_type === tur);
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <CCShell
      activeHref="/control-center/gonderiler"
      title="Gönderiler"
      subtitle="Platformdaki bütün gönderiler — geçici gizleme, geri açma, kaldırma"
    >
      <form method="get" style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        <select name="durum" defaultValue={durum ?? ""} style={{ padding: "8px 12px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)" }}>
          <option value="">Durum: tümü</option>
          {["published", "scheduled", "draft", "hidden", "archived", "deleted", "failed"].map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <select name="tur" defaultValue={tur ?? ""} style={{ padding: "8px 12px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)" }}>
          <option value="">Tür: tümü</option>
          {["text", "image", "gallery", "video", "audio_teaser", "announcement", "countdown", "project"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: "8px 20px", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border-strong)", fontSize: "var(--font-sm)" }}>
          Filtrele
        </button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Gönderi</th>
              <th scope="col">Sanatçı</th>
              <th scope="col">Tür</th>
              <th scope="col">Durum</th>
              <th scope="col">Görünürlük</th>
              <th scope="col">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td style={{ maxWidth: 240 }}>
                  <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {p.title ?? p.body?.slice(0, 50) ?? "—"}
                  </p>
                </td>
                <td>{artistById.get(p.artist_id)?.stage_name ?? p.artist_id}</td>
                <td>{p.post_type}</td>
                <td>
                  <StatusChip tone={p.status === "published" ? "success" : p.status === "deleted" ? "danger" : "neutral"}>
                    {p.status}
                  </StatusChip>
                </td>
                <td>{p.visibility}</td>
                <td>
                  <PostRowActions postId={p.id} status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CCShell>
  );
}
