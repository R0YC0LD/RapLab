import type { Metadata } from "next";
import { listFanArt } from "@/features/fan-art/service";
import { FanArtCard } from "@/app/(public)/sanatsal/FanArtCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudioShell } from "@/components/studio/StudioShell";
import { getStudioContext } from "../helpers";
import styles from "@/app/(public)/sanatsal/sanatsal.module.css";

export const metadata: Metadata = { title: "Fan Sanatı - Artist Studio", robots: { index: false } };

export default async function ArtistFanArtPage({ searchParams }: { searchParams: Promise<{ sanatci?: string }> }) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const items = await listFanArt(ctx.user.id, ctx.artist.id);
  return <StudioShell artist={ctx.artist} managedArtists={ctx.managedArtists} activePath="/fan-sanati" title="Fan Sanatı" subtitle="Sanatsal alanında seninle ilişkilendirilen doğrulanmış fan çalışmaları">
    {items.length ? <div className={styles.grid} style={{ paddingTop: 0 }}>{items.map((item) => <FanArtCard key={item.id} item={item} isAuthenticated />)}</div> : <EmptyState title="Henüz fan çalışması yok" description="Seninle ilişkilendirilen paylaşımlar burada görünecek." />}
  </StudioShell>;
}
