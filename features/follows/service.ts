/**
 * Takip servisi — Şartname 10 (Takip Sistemi), 22.5 (RLS)
 *
 * Kurallar: yalnızca sanatçılar takip edilebilir; aynı sanatçı iki kez
 * takip edilemez; askıya alınmış sanatçı takip edilemez; sayı istemciden
 * değiştirilemez.
 */

import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes } from "@/lib/errors";
import type { SessionUser } from "@/types";

export interface FollowResult {
  following: boolean;
  follower_count: number;
}

export async function followArtist(artistId: string, viewer: SessionUser): Promise<FollowResult> {
  if (isDemoMode()) {
    const s = demoState();
    const artist = s.artists.find((a) => a.id === artistId);
    if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    // Askıya alınmış sanatçı takip edilemez (10.1)
    if (artist.profile_status !== "active" || artist.suspended_at) {
      throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    }

    const exists = s.follows.some((f) => f.artist_id === artistId && f.user_id === viewer.id);
    if (exists) throw new ApiError(ErrorCodes.DUPLICATE_FOLLOW);

    s.follows.push({ artist_id: artistId, user_id: viewer.id, created_at: new Date().toISOString() });
    artist.follower_count += 1;
    return { following: true, follower_count: artist.follower_count };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("artist_follows")
    .insert({ artist_id: artistId, user_id: viewer.id });

  if (error) {
    if (error.code === "23505") throw new ApiError(ErrorCodes.DUPLICATE_FOLLOW);
    if (error.code === "42501") throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }

  const { data } = await supabase
    .from("artists")
    .select("follower_count")
    .eq("id", artistId)
    .single();
  return { following: true, follower_count: data?.follower_count ?? 0 };
}

export async function unfollowArtist(artistId: string, viewer: SessionUser): Promise<FollowResult> {
  if (isDemoMode()) {
    const s = demoState();
    const artist = s.artists.find((a) => a.id === artistId);
    if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

    const idx = s.follows.findIndex((f) => f.artist_id === artistId && f.user_id === viewer.id);
    if (idx === -1) return { following: false, follower_count: artist.follower_count };

    s.follows.splice(idx, 1);
    artist.follower_count = Math.max(0, artist.follower_count - 1);
    return { following: false, follower_count: artist.follower_count };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("artist_follows")
    .delete()
    .eq("artist_id", artistId)
    .eq("user_id", viewer.id);

  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

  const { data } = await supabase
    .from("artists")
    .select("follower_count")
    .eq("id", artistId)
    .single();
  return { following: false, follower_count: data?.follower_count ?? 0 };
}
