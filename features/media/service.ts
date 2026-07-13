/**
 * Medya servisi — Şartname 21 (Medya Yükleme), 13.5 (Medya Kütüphanesi), 22.6 (Storage RLS)
 *
 * Yükleme akışı (21.5):
 * 1. İstemci ön kontrolü → 2. Sunucudan yükleme yetkisi → 3. Geçici alana yükleme
 * → 4. MIME/imza doğrulama → 5. İşleme → 6. Zararlı içerik kontrolü → 7. ready → 8. yayım
 */

import { getMembership } from "@/features/artists/service";
import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes } from "@/lib/errors";
import { memberHasPermission } from "@/lib/permissions";
import { mediaStoragePath, validateMediaFile } from "@/lib/validation";
import type { PostMedia, SessionUser } from "@/types";

export const POST_MEDIA_BUCKET = "post-media";
export const VERIFICATION_DOCS_BUCKET = "verification-docs"; // özel bucket — asla herkese açık olmaz (Kural 14)

/** Sanatçının medya kütüphanesi (13.5) */
export async function listArtistMedia(artistId: string, viewer: SessionUser): Promise<PostMedia[]> {
  const membership = await getMembership(artistId, viewer.id);
  const isStaff = viewer.profile.role === "admin" || viewer.profile.role === "super_admin";
  if (!isStaff && !memberHasPermission(membership, "manage_media")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }

  if (isDemoMode()) {
    const s = demoState();
    const postIds = new Set(s.posts.filter((p) => p.artist_id === artistId).map((p) => p.id));
    return s.media.filter((m) => postIds.has(m.post_id));
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("post_media")
    .select("*, posts!inner(artist_id)")
    .eq("posts.artist_id", artistId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PostMedia[];
}

export interface UploadAuthorization {
  upload_url: string | null;
  storage_path: string;
  media_id: string;
}

/**
 * Adım 2: Sunucudan yükleme yetkisi.
 * Supabase modunda imzalı yükleme URL'si üretir; dosya yolu içindeki sanatçı
 * ID'si üyelikle eşleşmek zorundadır (22.6).
 */
export async function authorizeUpload(
  params: {
    artist_id: string;
    post_id: string;
    mime_type: string;
    file_size_bytes: number;
    duration_seconds?: number;
    width?: number;
    height?: number;
  },
  viewer: SessionUser
): Promise<UploadAuthorization> {
  const membership = await getMembership(params.artist_id, viewer.id);
  if (!memberHasPermission(membership, "manage_media")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }

  const check = validateMediaFile(params);
  if (!check.valid) {
    if (check.error?.includes("MB")) throw new ApiError(ErrorCodes.FILE_TOO_LARGE);
    throw new ApiError(ErrorCodes.INVALID_MEDIA, { file: check.error ?? "Geçersiz dosya." });
  }

  const mediaId = globalThis.crypto.randomUUID();
  const ext = params.mime_type.split("/")[1] ?? "bin";
  // 21.1: Orijinal ad yerine UUID kullanılır; 21.4 dosya yolu şablonu
  const storagePath = mediaStoragePath(params.artist_id, params.post_id, mediaId, ext);

  if (isDemoMode()) {
    // Demo modunda gerçek storage yoktur; yükleme arayüzü bunu açıkça belirtir.
    return { upload_url: null, storage_path: storagePath, media_id: mediaId };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error) throw new ApiError(ErrorCodes.UPLOAD_FAILED);

  await supabase.from("post_media").insert({
    id: mediaId,
    post_id: params.post_id,
    media_type: params.mime_type.startsWith("image")
      ? "image"
      : params.mime_type.startsWith("video")
        ? "video"
        : "audio",
    bucket_name: POST_MEDIA_BUCKET,
    storage_path: storagePath,
    mime_type: params.mime_type,
    file_size_bytes: params.file_size_bytes,
    width: params.width ?? null,
    height: params.height ?? null,
    duration_seconds: params.duration_seconds ?? null,
    processing_status: "pending",
    sort_order: 0,
    checksum: "",
  });

  return { upload_url: data.signedUrl, storage_path: storagePath, media_id: mediaId };
}

/** Adım 4–7: Yükleme tamamlandı bildirimi → doğrulama ve işleme kuyruğu */
export async function completeUpload(mediaId: string, viewer: SessionUser): Promise<PostMedia> {
  if (isDemoMode()) {
    throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
      "Demo modunda gerçek dosya yükleme kapalıdır. Supabase yapılandırması gerektirir.");
  }
  const supabase = await createSupabaseServerClient();
  const { data: media } = await supabase
    .from("post_media")
    .select("*, posts!inner(artist_id)")
    .eq("id", mediaId)
    .single();
  if (!media) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

  const membership = await getMembership(
    (media.posts as unknown as { artist_id: string }).artist_id,
    viewer.id
  );
  if (!memberHasPermission(membership, "manage_media")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }

  // Gerçek dağıtımda: MIME imza kontrolü + işleme (Edge Function / kuyruğa alma)
  const { data, error } = await supabase
    .from("post_media")
    .update({ processing_status: "processing" })
    .eq("id", mediaId)
    .select()
    .single();
  if (error) throw new ApiError(ErrorCodes.PROCESSING_FAILED);
  return data as PostMedia;
}
