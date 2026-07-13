/** Yeni Gönderi — Şartname 13.3 (üç sütun / mobil sihirbaz), 13.4 (ayarlar) */

import type { Metadata } from "next";
import { getFeatureFlags } from "@/features/moderation/service";
import { isDemoMode } from "@/lib/env";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import { Composer } from "./Composer";

export const metadata: Metadata = { title: "Yeni Gönderi — Artist Studio", robots: { index: false } };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);
  const flags = await getFeatureFlags();

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/yeni-gonderi"
      title="Yeni Gönderi"
      subtitle="Tür seç, içeriği hazırla, ön izle ve yayımla"
    >
      <Composer
        artistId={ctx.artist.id}
        artistName={ctx.artist.stage_name}
        artistAvatar={ctx.artist.profile_image_path}
        audioEnabled={flags.audio_teasers_enabled}
        videoEnabled={flags.video_uploads_enabled}
        schedulingEnabled={flags.scheduled_posts_enabled}
        demoMode={isDemoMode()}
      />
    </StudioShell>
  );
}
