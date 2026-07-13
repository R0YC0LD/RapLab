/** Sanatsal: fan doğrulaması, görsel akışı ve beğeniler. */

import { demoState, writeAudit } from "@/lib/database/demo-store";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { canApproveArtistApplication, roleAtLeast } from "@/lib/permissions";
import type {
  FanArtFeedItem,
  FanVerification,
  FanVerificationStatus,
  FanVerificationWithDetails,
  SessionUser,
} from "@/types";

export async function getMyFanVerification(userId: string): Promise<FanVerification | null> {
  if (isDemoMode()) {
    return demoState().fanVerifications.find((item) => item.user_id === userId) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fan_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }
  return (data as FanVerification | null) ?? null;
}

export async function isApprovedFan(userId: string): Promise<boolean> {
  const verification = await getMyFanVerification(userId);
  return verification?.status === "approved";
}

export async function listFanArt(
  viewerId: string | null,
  artistId?: string
): Promise<FanArtFeedItem[]> {
  if (isDemoMode()) {
    const state = demoState();
    const profiles = new Map(state.profiles.map((profile) => [profile.id, profile]));
    const artists = new Map(state.artists.map((artist) => [artist.id, artist]));
    const liked = new Set(
      state.fanArtLikes
        .filter((like) => like.user_id === viewerId)
        .map((like) => like.post_id)
    );
    return state.fanArtPosts
      .filter((post) => post.status === "published" && (!artistId || post.artist_id === artistId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .flatMap((post) => {
        const fan = profiles.get(post.fan_user_id);
        const artist = artists.get(post.artist_id);
        if (!fan || !artist) return [];
        return [{
          ...post,
          fan: { username: fan.username, display_name: fan.display_name, avatar_path: fan.avatar_path },
          artist: {
            id: artist.id,
            stage_name: artist.stage_name,
            slug: artist.slug,
            profile_image_path: artist.profile_image_path,
          },
          liked_by_me: liked.has(post.id),
        }];
      });
  }

  // Sunucu DTO'su yalnızca herkese açık fan alanlarını döndürür. Profil tablosu
  // istemciye veya public RLS'e tamamen açılmaz.
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("fan_art_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(60);
  if (artistId) query = query.eq("artist_id", artistId);
  const { data: posts, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }
  if (!posts?.length) return [];

  const userIds = [...new Set(posts.map((post) => post.fan_user_id))];
  const artistIds = [...new Set(posts.map((post) => post.artist_id))];
  const [{ data: profiles }, { data: artists }, likesResult] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_path").in("id", userIds),
    admin.from("artists").select("id, stage_name, slug, profile_image_path").in("id", artistIds),
    viewerId
      ? admin.from("fan_art_likes").select("post_id").eq("user_id", viewerId).in("post_id", posts.map((post) => post.id))
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const artistMap = new Map((artists ?? []).map((artist) => [artist.id, artist]));
  const liked = new Set((likesResult.data ?? []).map((like) => like.post_id));

  return posts.flatMap((post) => {
    const fan = profileMap.get(post.fan_user_id);
    const artist = artistMap.get(post.artist_id);
    if (!fan || !artist) return [];
    return [{ ...post, fan, artist, liked_by_me: liked.has(post.id) } as FanArtFeedItem];
  });
}

export async function addFanArtLike(postId: string, viewer: SessionUser) {
  if (isDemoMode()) {
    const state = demoState();
    const post = state.fanArtPosts.find((item) => item.id === postId);
    if (!post) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    if (post.status !== "published") throw new ApiError(ErrorCodes.POST_NOT_PUBLISHED);
    if (state.fanArtLikes.some((like) => like.post_id === postId && like.user_id === viewer.id)) {
      throw new ApiError(ErrorCodes.DUPLICATE_LIKE);
    }
    state.fanArtLikes.push({ post_id: postId, user_id: viewer.id, created_at: new Date().toISOString() });
    post.like_count += 1;
    return { liked: true, like_count: post.like_count };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fan_art_likes").insert({ post_id: postId, user_id: viewer.id });
  if (error?.code === "23505") throw new ApiError(ErrorCodes.DUPLICATE_LIKE);
  if (error?.code === "42501") throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  const { data } = await supabase.from("fan_art_posts").select("like_count").eq("id", postId).single();
  return { liked: true, like_count: data?.like_count ?? 0 };
}

export async function removeFanArtLike(postId: string, viewer: SessionUser) {
  if (isDemoMode()) {
    const state = demoState();
    const post = state.fanArtPosts.find((item) => item.id === postId);
    if (!post) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    const index = state.fanArtLikes.findIndex((like) => like.post_id === postId && like.user_id === viewer.id);
    if (index >= 0) {
      state.fanArtLikes.splice(index, 1);
      post.like_count = Math.max(0, post.like_count - 1);
    }
    return { liked: false, like_count: post.like_count };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("fan_art_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", viewer.id);
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  const { data } = await supabase.from("fan_art_posts").select("like_count").eq("id", postId).single();
  return { liked: false, like_count: data?.like_count ?? 0 };
}

export async function listFanVerifications(viewer: SessionUser): Promise<FanVerificationWithDetails[]> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  if (isDemoMode()) {
    const state = demoState();
    return state.fanVerifications.flatMap((verification) => {
      const fan = state.profiles.find((profile) => profile.id === verification.user_id);
      const artist = state.artists.find((item) => item.id === verification.related_artist_id);
      if (!fan || !artist) return [];
      return [{
        ...verification,
        fan: { username: fan.username, display_name: fan.display_name, avatar_path: fan.avatar_path },
        artist: { id: artist.id, stage_name: artist.stage_name, slug: artist.slug },
      }];
    });
  }
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("fan_verifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }
  if (!rows?.length) return [];
  const [{ data: profiles }, { data: artists }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_path").in("id", rows.map((row) => row.user_id)),
    admin.from("artists").select("id, stage_name, slug").in("id", rows.map((row) => row.related_artist_id)),
  ]);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const artistMap = new Map((artists ?? []).map((artist) => [artist.id, artist]));
  return rows.flatMap((row) => {
    const fan = profileMap.get(row.user_id);
    const artist = artistMap.get(row.related_artist_id);
    return fan && artist ? [{ ...row, fan, artist } as FanVerificationWithDetails] : [];
  });
}

export async function reviewFanVerification(
  verificationId: string,
  status: Exclude<FanVerificationStatus, "pending">,
  note: string,
  viewer: SessionUser
) {
  if (!canApproveArtistApplication(viewer.profile.role)) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  const requestId = newRequestId();
  if (isDemoMode()) {
    const row = demoState().fanVerifications.find((item) => item.id === verificationId);
    if (!row) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    const previous = row.status;
    row.status = status;
    row.review_note = note || null;
    row.reviewed_by = viewer.id;
    row.reviewed_at = new Date().toISOString();
    row.updated_at = row.reviewed_at;
    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: `fan_verification.${status}`,
      target_type: "fan_verification",
      target_id: verificationId,
      previous_data: { status: previous },
      new_data: { status, review_note: note || null },
      request_id: requestId,
    });
    return { id: verificationId, status };
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("review_fan_verification", {
    p_verification_id: verificationId,
    p_actor_id: viewer.id,
    p_status: status,
    p_note: note,
    p_request_id: requestId,
  });
  if (error) {
    console.error(`[raplab][fan-review][${requestId}]`, { code: error.code, message: error.message });
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR, undefined, `Karar kaydedilemedi. Destek kodu: ${requestId}`);
  }
  return data;
}
