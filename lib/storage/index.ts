/**
 * Storage yardımcıları — Şartname 21 (Medya), 22.6 (Storage RLS)
 */

import { createSupabaseAdminClient } from "@/lib/database/supabase-server";

export const POST_MEDIA_BUCKET = "post-media";
export const AVATARS_BUCKET = "avatars";
/** Doğrulama belgeleri: özel bucket — hiçbir zaman herkese açık olmaz (Kural 14) */
export const VERIFICATION_DOCS_BUCKET = "verification-docs";

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
