/**
 * Gönderi servisi — Şartname 8 (Gönderi Sistemi), 6.4 (Kişiselleştirilmiş akış),
 * 13.3–13.4 (Gönderi oluşturucu), 22.3 (RLS kuralları)
 */

import { demoState, writeAudit } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { canCreatePostForArtist, canPublishPostForArtist } from "@/lib/permissions";
import type { CreatePostInput } from "@/lib/validation";
import type { Artist, Post, PostMedia, PostStatus, PostWithArtist, SessionUser } from "@/types";
import { getMembership } from "@/features/artists/service";

const DAY_MS = 24 * 3600_000;
export const FEED_PAGE_SIZE = 15; // 6.4: sonsuz kaydırma yerine ilk 15 gönderi

/* ---------- 8.2 Gönderi durum makinesi ---------- */

const ALLOWED_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ["uploading"],
  uploading: ["processing"],
  processing: ["scheduled", "published", "failed"],
  scheduled: ["published"],
  published: ["hidden", "archived", "deleted"],
  hidden: ["published"],
  archived: ["published"],
  deleted: [],
  failed: [],
};

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ---------- Yardımcılar ---------- */

function toPostWithArtist(
  post: Post,
  artist: Artist,
  media: PostMedia[],
  likedIds: Set<string>
): PostWithArtist {
  return {
    ...post,
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
      slug: artist.slug,
      profile_image_path: artist.profile_image_path,
      verification_status: artist.verification_status,
      theme_config: artist.theme_config,
    },
    media: media
      .filter((m) => m.post_id === post.id && m.processing_status === "ready")
      .sort((a, b) => a.sort_order - b.sort_order),
    liked_by_me: likedIds.has(post.id),
  };
}

function visibleToViewer(post: Post, viewer: SessionUser | null, followedIds: Set<string>): boolean {
  if (post.status !== "published") return false;
  if (post.visibility === "public") return true;
  if (post.visibility === "unlisted") return true; // bağlantıyı bilen görür; listelerde gösterilmez
  if (post.visibility === "followers") {
    return viewer !== null && followedIds.has(post.artist_id);
  }
  return false;
}

async function demoContext(viewer: SessionUser | null) {
  const s = demoState();
  const likedIds = new Set(
    s.likes.filter((l) => l.user_id === viewer?.id).map((l) => l.post_id)
  );
  const followedIds = new Set(
    s.follows.filter((f) => f.user_id === viewer?.id).map((f) => f.artist_id)
  );
  const artistById = new Map(s.artists.map((a) => [a.id, a]));
  return { s, likedIds, followedIds, artistById };
}

/* ---------- 6.4 Kişiselleştirilmiş sanatçı akışı ---------- */

export async function getPersonalFeed(
  viewer: SessionUser | null,
  cursor?: number
): Promise<{ posts: PostWithArtist[]; nextCursor: number | null }> {
  if (isDemoMode()) {
    const { s, likedIds, followedIds, artistById } = await demoContext(viewer);
    const now = Date.now();

    const visible = s.posts.filter((p) => {
      if (!visibleToViewer(p, viewer, followedIds)) return false;
      if (p.visibility === "unlisted") return false; // listelenmez
      // Giriş yapan kullanıcı için takip edilen sanatçılar; ziyaretçi için genel akış
      if (viewer && followedIds.size > 0) return followedIds.has(p.artist_id);
      return true;
    });

    // Sıralama (6.4): sabitlenmiş duyurular → son 24 saat → popüler → kaçırılanlar
    const rank = (p: Post): number => {
      const age = p.published_at ? now - new Date(p.published_at).getTime() : Infinity;
      if (p.is_pinned) return 0;
      if (age < DAY_MS) return 1;
      if (p.like_count > 5000) return 2;
      return 3;
    };
    visible.sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
      );
    });

    const start = cursor ?? 0;
    const page = visible.slice(start, start + FEED_PAGE_SIZE);
    const nextCursor = start + FEED_PAGE_SIZE < visible.length ? start + FEED_PAGE_SIZE : null;
    return {
      posts: page.map((p) =>
        toPostWithArtist(p, artistById.get(p.artist_id)!, s.media, likedIds)
      ),
      nextCursor,
    };
  }

  const supabase = await createSupabaseServerClient();
  const start = cursor ?? 0;
  const { data } = await supabase
    .from("posts")
    .select("*, artists!inner(*), post_media(*)")
    .eq("status", "published")
    .neq("visibility", "unlisted")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(start, start + FEED_PAGE_SIZE - 1);

  const likedIds = new Set<string>();
  if (viewer && data && data.length > 0) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewer.id)
      .in("post_id", data.map((p) => p.id));
    for (const l of likes ?? []) likedIds.add(l.post_id);
  }

  const posts = (data ?? []).map((row) => {
    const { artists: artistRow, post_media: mediaRows, ...post } = row;
    const artist = artistRow as unknown as Artist;
    const media = (mediaRows ?? []) as PostMedia[];
    return toPostWithArtist(post as Post, artist, media, likedIds);
  });
  return {
    posts,
    nextCursor: posts.length === FEED_PAGE_SIZE ? start + FEED_PAGE_SIZE : null,
  };
}

/* ---------- 7.4 Sanatçı profil gönderileri ---------- */

export type PostFilter = "all" | "text" | "image" | "video" | "announcement" | "audio_teaser";

export async function getArtistPosts(
  artistId: string,
  viewer: SessionUser | null,
  filter: PostFilter = "all"
): Promise<PostWithArtist[]> {
  if (isDemoMode()) {
    const { s, likedIds, followedIds, artistById } = await demoContext(viewer);
    const artist = artistById.get(artistId);
    if (!artist) return [];

    let posts = s.posts.filter(
      (p) => p.artist_id === artistId && visibleToViewer(p, viewer, followedIds)
    );

    if (filter !== "all") {
      const map: Record<Exclude<PostFilter, "all">, string[]> = {
        text: ["text"],
        image: ["image", "gallery"],
        video: ["video"],
        announcement: ["announcement", "countdown", "project"],
        audio_teaser: ["audio_teaser"],
      };
      posts = posts.filter((p) => map[filter].includes(p.post_type));
    }

    // Sabitlenmiş gönderiler önce, ardından tarih sırası (7.4)
    posts.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return (
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
      );
    });

    return posts.map((p) => toPostWithArtist(p, artist, s.media, likedIds));
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("posts")
    .select("*, artists!inner(*), post_media(*)")
    .eq("artist_id", artistId)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(30);

  if (filter !== "all") {
    const map: Record<Exclude<PostFilter, "all">, string[]> = {
      text: ["text"],
      image: ["image", "gallery"],
      video: ["video"],
      announcement: ["announcement", "countdown", "project"],
      audio_teaser: ["audio_teaser"],
    };
    query = query.in("post_type", map[filter]);
  }

  const { data } = await query;
  const likedIds = new Set<string>();
  if (viewer && data && data.length > 0) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewer.id)
      .in("post_id", data.map((p) => p.id));
    for (const l of likes ?? []) likedIds.add(l.post_id);
  }

  return (data ?? []).map((row) => {
    const { artists: artistRow, post_media: mediaRows, ...post } = row;
    const artist = artistRow as unknown as Artist;
    const media = (mediaRows ?? []) as PostMedia[];
    return toPostWithArtist(post as Post, artist, media, likedIds);
  });
}

/* ---------- Studio: sanatçının bütün gönderileri (taslaklar dahil) ---------- */

export async function getStudioPosts(artistId: string, viewer: SessionUser): Promise<Post[]> {
  const membership = await getMembership(artistId, viewer.id);
  if (!membership && viewer.profile.role !== "admin" && viewer.profile.role !== "super_admin") {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }

  if (isDemoMode()) {
    return demoState()
      .posts.filter((p) => p.artist_id === artistId && p.status !== "deleted")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("artist_id", artistId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  return (data ?? []) as Post[];
}

/* ---------- 13.3 Gönderi oluşturma ---------- */

export async function createPost(
  artistId: string,
  input: CreatePostInput,
  viewer: SessionUser
): Promise<Post> {
  const requestId = newRequestId();
  const membership = await getMembership(artistId, viewer.id);

  if (isDemoMode()) {
    const s = demoState();
    const artist = s.artists.find((a) => a.id === artistId);
    if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

    // Değişmez Kural 9–11: yalnızca doğrulanmış sanatçı + yetkili ekip; kendi profili
    const verified = artist.verification_status === "approved";
    if (!canCreatePostForArtist({ role: viewer.profile.role, membership, artistVerified: verified })) {
      throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    }
    if (
      input.publish_mode !== "draft" &&
      !canPublishPostForArtist({ role: viewer.profile.role, membership, artistVerified: verified })
    ) {
      throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    }
    if (!s.featureFlags.scheduled_posts_enabled && input.publish_mode === "schedule") {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE);
    }
    if (!s.featureFlags.audio_teasers_enabled && input.post_type === "audio_teaser") {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE);
    }

    const nowIso = new Date().toISOString();
    const status: PostStatus =
      input.publish_mode === "draft"
        ? "draft"
        : input.publish_mode === "schedule"
          ? "scheduled"
          : "published";

    const post: Post = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      artist_id: artistId,
      author_user_id: viewer.id,
      post_type: input.post_type,
      title: input.title ?? null,
      body: input.body ?? null,
      visibility: input.visibility,
      status,
      is_pinned: input.is_pinned,
      like_count: 0,
      view_count: 0,
      allow_external_share: input.allow_external_share,
      notify_followers: input.notify_followers,
      scheduled_at: input.scheduled_at ?? null,
      published_at: status === "published" ? nowIso : null,
      edited_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
      meta: input.meta ?? null,
    };
    s.posts.unshift(post);

    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: `post.${status === "published" ? "published" : status === "scheduled" ? "scheduled" : "drafted"}`,
      target_type: "post",
      target_id: post.id,
      new_data: { post_type: post.post_type, visibility: post.visibility },
      request_id: requestId,
    });

    return post;
  }

  // Supabase modu: rol/izin denetimi RLS tarafından da yapılır; burada erken kontrol
  const supabase = await createSupabaseServerClient();
  const status: PostStatus =
    input.publish_mode === "draft"
      ? "draft"
      : input.publish_mode === "schedule"
        ? "scheduled"
        : "published";

  const { data, error } = await supabase
    .from("posts")
    .insert({
      artist_id: artistId,
      author_user_id: viewer.id,
      post_type: input.post_type,
      title: input.title ?? null,
      body: input.body ?? null,
      visibility: input.visibility,
      status,
      is_pinned: input.is_pinned,
      allow_external_share: input.allow_external_share,
      notify_followers: input.notify_followers,
      scheduled_at: input.scheduled_at ?? null,
      published_at: status === "published" ? new Date().toISOString() : null,
      meta: input.meta ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42501") throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }
  return data as Post;
}

/* ---------- Gönderi durum değişikliği (sabitle, gizle, arşivle) ---------- */

export async function updatePostStatus(
  postId: string,
  to: PostStatus,
  viewer: SessionUser
): Promise<Post> {
  if (isDemoMode()) {
    const s = demoState();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

    const membership = await getMembership(post.artist_id, viewer.id);
    const isStaff = viewer.profile.role === "admin" || viewer.profile.role === "super_admin";
    const isModerator = viewer.profile.role === "moderator";
    const canManage = isStaff || (membership !== null);
    const moderatorTemporaryHide = isModerator && to === "hidden";
    if (!canManage && !moderatorTemporaryHide) throw new ApiError(ErrorCodes.PERMISSION_DENIED);

    if (!canTransition(post.status, to)) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
        status: `${post.status} → ${to} geçişi kurallara aykırı.`,
      });
    }

    const prev = post.status;
    post.status = to;
    post.updated_at = new Date().toISOString();
    if (to === "deleted") post.deleted_at = post.updated_at; // soft delete (8.2)
    if (to === "published" && !post.published_at) post.published_at = post.updated_at;

    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "post.status_changed",
      target_type: "post",
      target_id: postId,
      previous_data: { status: prev },
      new_data: { status: to },
      request_id: newRequestId(),
    });
    return post;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("change_post_status", {
    p_post_id: postId,
    p_new_status: to,
  });
  if (error) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  return data as Post;
}
