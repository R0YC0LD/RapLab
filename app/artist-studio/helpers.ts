/** Artist Studio ortak yardımcıları — Şartname 13 */

import { redirect } from "next/navigation";
import { getArtistById, listMembershipsForUser } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { roleAtLeast } from "@/lib/permissions";
import type { Artist, ArtistMember, SessionUser } from "@/types";

export interface StudioContext {
  user: SessionUser;
  artist: Artist;
  memberships: ArtistMember[];
  membership: ArtistMember | null;
  managedArtists: Artist[];
}

/**
 * Studio erişim kontrolü: aktif ekip üyeliği veya admin+ gerekir (4.4).
 * Bir kullanıcı birden fazla sanatçı yönetiyorsa ?sanatci= ile seçim yapılır (13.1).
 */
export async function getStudioContext(selectedArtistId?: string): Promise<StudioContext> {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/artist-studio");

  const memberships = await listMembershipsForUser(user.id);
  const isStaff = roleAtLeast(user.profile.role, "admin");

  if (memberships.length === 0 && !isStaff) {
    redirect("/hata/403");
  }

  const managedArtists = (
    await Promise.all(memberships.map((m) => getArtistById(m.artist_id)))
  ).filter(Boolean) as Artist[];

  const artist =
    managedArtists.find((a) => a.id === selectedArtistId) ?? managedArtists[0] ?? null;

  if (!artist) redirect("/hata/403");

  const membership = memberships.find((m) => m.artist_id === artist.id) ?? null;

  return { user, artist, memberships, membership, managedArtists };
}
