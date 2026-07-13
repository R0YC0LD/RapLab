/**
 * Storage yardımcıları — Şartname 21 (Medya), 22.6 (Storage RLS)
 */

import { createSupabaseAdminClient } from "@/lib/database/supabase-server";

export const POST_MEDIA_BUCKET = "post-media";
export const AVATARS_BUCKET = "avatars";
/** Doğrulama belgeleri: özel bucket — hiçbir zaman herkese açık olmaz (Kural 14) */
export const VERIFICATION_DOCS_BUCKET = "verification-docs";
export const FAN_ART_BUCKET = "fan-art";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function extensionForMime(mime: string, fallback: string): string {
  return EXTENSION_BY_MIME[mime.split(";")[0]] ?? fallback;
}

/** Yalnizca Supabase public Storage URL'sindeki ilgili bucket yolunu ayiklar. */
export function publicStoragePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    if (!path || path.includes("..") || path.startsWith("/")) return null;
    return path;
  } catch {
    return null;
  }
}

/** 21.4 Dosya yolu şablonu */
export function postMediaPath(artistId: string, postId: string, mediaId: string, ext: string): string {
  return `artists/${artistId}/posts/${postId}/${mediaId}.${ext.replace(/^\./, "")}`;
}

/** Dosya yolundan sanatçı ID'sini çıkarır — erişim kontrolü eşleştirmesi için (22.6) */
export function artistIdFromPath(path: string): string | null {
  const m = /^artists\/([^/]+)\//.exec(path);
  return m ? m[1] : null;
}

/**
 * Doğrulama belgeleri için süreli özel bağlantı üretir (12.3).
 * Yalnızca sunucu tarafında, moderatör+ isteğiyle çağrılır.
 */
export async function createTimeLimitedDocumentUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(VERIFICATION_DOCS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error("Belge bağlantısı üretilemedi.");
  }
  return data.signedUrl;
}
