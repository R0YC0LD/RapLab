/**
 * Beğeni servisi — Şartname 9 (Beğeni Sistemi), 22.4 (RLS), 28 (çift beğeni çözümü)
 *
 * Kurallar: giriş zorunlu; bir kullanıcı bir gönderiyi bir kez beğenir;
 * ikinci istek 409 döner; kaldırma yalnızca kendi beğenisi için;
 * sayı istemciden asla kabul edilmez.
 */

import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes } from "@/lib/errors";
import type { SessionUser } from "@/types";

export interface LikeResult {
  liked: boolean;
  like_count: number;
}

export async function addLike(postId: string, viewer: SessionUser): Promise<LikeResult> {
  if (isDemoMode()) {
    const s = demoState();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    // Silinmiş veya gizlenmiş gönderi beğenilemez (9.1)
    if (post.status !== "published") throw new ApiError(ErrorCodes.POST_NOT_PUBLISHED);

    // Tekil beğeni: post_id + user_id birleşik anahtar (15.6)
    const exists = s.likes.some((l) => l.post_id === postId && l.user_id === viewer.id);
    if (exists) throw new ApiError(ErrorCodes.DUPLICATE_LIKE);

    s.likes.push({ post_id: postId, user_id: viewer.id, created_at: new Date().toISOString() });
    post.like_count += 1;
    return { liked: true, like_count: post.like_count };
  }

  const supabase = await createSupabaseServerClient();
  // RLS: kullanıcı yalnızca kendi user_id değeriyle beğeni oluşturabilir (22.4)
  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: viewer.id });

  if (error) {
    if (error.code === "23505") throw new ApiError(ErrorCodes.DUPLICATE_LIKE);
    if (error.code === "42501") throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    if (error.code === "23503") throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }

  // like_count veritabanı trigger'ı ile artar; güncel değeri okuyoruz
  const { data } = await supabase.from("posts").select("like_count").eq("id", postId).single();
  return { liked: true, like_count: data?.like_count ?? 0 };
}

export async function removeLike(postId: string, viewer: SessionUser): Promise<LikeResult> {
  if (isDemoMode()) {
    const s = demoState();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

    const idx = s.likes.findIndex((l) => l.post_id === postId && l.user_id === viewer.id);
    if (idx === -1) return { liked: false, like_count: post.like_count };

    s.likes.splice(idx, 1);
    post.like_count = Math.max(0, post.like_count - 1);
    return { liked: false, like_count: post.like_count };
  }

  const supabase = await createSupabaseServerClient();
  // RLS: kullanıcı yalnızca kendi beğenisini silebilir (22.4)
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", viewer.id);

  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

  const { data } = await supabase.from("posts").select("like_count").eq("id", postId).single();
  return { liked: false, like_count: data?.like_count ?? 0 };
}
