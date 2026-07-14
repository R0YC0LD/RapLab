/** Medya Kütüphanesi — Şartname 13.5 */

import type { Metadata } from "next";
import { Headphones, Video } from "lucide-react";
import { listArtistMedia } from "@/features/media/service";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Medya — Artist Studio", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Bekliyor", tone: "neutral" },
  uploading: { label: "Yükleniyor", tone: "info" },
  processing: { label: "İşleniyor", tone: "info" },
  ready: { label: "Hazır", tone: "success" },
  failed: { label: "Başarısız", tone: "danger" },
  quarantined: { label: "Karantinada", tone: "warning" },
  deleted: { label: "Silindi", tone: "neutral" },
};

export default async function StudioMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string; filtre?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const media = await listArtistMedia(ctx.artist.id, ctx.user);

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/medya"
      title="Medya Kütüphanesi"
      subtitle={`${media.length} dosya — durumlar, tekrar kullanım ve temizlik`}
    >
      {media.length === 0 ? (
        <EmptyState title="Medya kütüphanen boş" description="Gönderilerine eklediğin görsel, video ve sesler burada listelenir." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Ön izleme</th>
                <th scope="col">Tür</th>
                <th scope="col">Boyut</th>
                <th scope="col">Durum</th>
                <th scope="col">Alt metin</th>
                <th scope="col">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {media.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.media_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.storage_path} alt="" width={56} height={56} style={{ borderRadius: 8, objectFit: "cover" }} loading="lazy" />
                    ) : (
                      <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}>
                        {m.media_type === "video" ? <Video size={19} aria-label="Video" /> : <Headphones size={19} aria-label="Ses" />}
                      </span>
                    )}
                  </td>
                  <td>{m.mime_type}</td>
                  <td>{(m.file_size_bytes / 1_000_000).toFixed(1).replace(".", ",")} MB</td>
                  <td>
                    <StatusChip tone={STATUS[m.processing_status]?.tone ?? "neutral"}>
                      {STATUS[m.processing_status]?.label ?? m.processing_status}
                    </StatusChip>
                  </td>
                  <td style={{ maxWidth: 220, color: "var(--color-text-muted)" }}>{m.alt_text ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--color-text-muted)" }}>
                    {new Date(m.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: "var(--space-6)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Başarısız yüklemeler tekrar başlatılabilir; 24 saatten eski bekleyen kayıtlar zamanlanmış
        temizlik göreviyle işaretlenir (Şartname 28 — yetim dosyalar). Kalıcı silme talebi destek
        üzerinden işlenir.
      </p>
    </StudioShell>
  );
}
