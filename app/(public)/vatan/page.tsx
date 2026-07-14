import type { Metadata } from "next";
import { listActiveArtists } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { VatanMap } from "./VatanMap";

export const metadata: Metadata = {
  title: "Vatan",
  description: "Türkiye'nin 81 ilinden doğrulanmış rap sanatçılarını keşfet.",
};

export default async function VatanPage() {
  const user = await getSessionUser();
  const artists = await listActiveArtists(user?.id ?? null);

  return (
    <VatanMap
      artists={artists.map((artist) => ({
        id: artist.id,
        stage_name: artist.stage_name,
        slug: artist.slug,
        city: artist.city,
        genres: artist.genres,
        profile_image_path: artist.profile_image_path,
        follower_count: artist.follower_count,
      }))}
    />
  );
}
