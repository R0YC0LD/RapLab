/** Profil Tasarımı — Şartname 13.6: tema değişkenleri; özel CSS/JS eklenemez */

import type { Metadata } from "next";
import { getFeatureFlags } from "@/features/moderation/service";
import { isDemoMode } from "@/lib/env";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import { ArtistImageUploader } from "./ArtistImageUploader";
import { ThemeEditor } from "./ThemeEditor";

export const metadata: Metadata = { title: "Profil Tasarımı — Artist Studio", robots: { index: false } };

export default async function ThemePage({
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
      activePath="/profil-tasarimi"
      title="Profil Tasarımı"
      subtitle="Renkler, atmosfer ve kapaklar — kod ekleme yok, güvenli tema değişkenleri var"
    >
      <ArtistImageUploader
        artistId={ctx.artist.id}
        demoMode={isDemoMode()}
        current={{
          profile: ctx.artist.profile_image_path,
          desktop_cover: ctx.artist.desktop_cover_path,
          mobile_cover: ctx.artist.mobile_cover_path,
        }}
      />
      {!flags.artist_custom_themes ? (
        <p style={{ color: "var(--color-text-secondary)" }}>
          Özel sanatçı temaları şu anda platform genelinde kapalı (özellik bayrağı).
        </p>
      ) : (
        <ThemeEditor artistName={ctx.artist.stage_name} theme={ctx.artist.theme_config} />
      )}
    </StudioShell>
  );
}
