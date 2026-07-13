/** POST /api/fan-art - onaylı fanın Sanatsal paylaşımı. */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { extensionForMime, FAN_ART_BUCKET } from "@/lib/storage";
import { containsHtml, fanArtMetadataSchema, IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, normalizeHashtags } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const user = await requireUser();
    if (!user.profile.email_verified) throw new ApiError(ErrorCodes.EMAIL_NOT_VERIFIED);
    if (!checkRateLimit("create_post", user.id) || !checkRateLimit("media_upload", user.id)) {
      throw new ApiError(ErrorCodes.RATE_LIMITED);
    }
    if (isDemoMode()) throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined, "Demo modunda görsel yükleme kapalıdır.");

    const form = await req.formData();
    const parsed = fanArtMetadataSchema.safeParse({
      artist_id: String(form.get("artist_id") ?? ""),
      caption: String(form.get("caption") ?? ""),
      hashtags: String(form.get("hashtags") ?? ""),
    });
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    if (containsHtml(parsed.data.caption)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { caption: "HTML kabul edilmez." });
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { file: "Görsel gerekli." });
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type) || file.size <= 0) throw new ApiError(ErrorCodes.INVALID_MEDIA);
    if (file.size > IMAGE_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE);

    const admin = createSupabaseAdminClient();
    const [{ data: verification }, { data: artist }] = await Promise.all([
      admin.from("fan_verifications").select("status").eq("user_id", user.id).maybeSingle(),
      admin.from("artists").select("id, slug, stage_name, owner_user_id").eq("id", parsed.data.artist_id).eq("profile_status", "active").eq("verification_status", "approved").maybeSingle(),
    ]);
    if (verification?.status !== "approved") throw new ApiError(ErrorCodes.PERMISSION_DENIED, undefined, "Paylaşım için fan doğrulamanın onaylanması gerekiyor.");
    if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND, undefined, "Seçilen sanatçı bulunamadı.");

    uploadedPath = `${user.id}/${globalThis.crypto.randomUUID()}.${extensionForMime(file.type, "jpg")}`;
    const { error: uploadError } = await admin.storage.from(FAN_ART_BUCKET).upload(
      uploadedPath,
      new Uint8Array(await file.arrayBuffer()),
      { contentType: file.type, upsert: false }
    );
    if (uploadError) throw new ApiError(ErrorCodes.UPLOAD_FAILED);
    const { data: publicUrl } = admin.storage.from(FAN_ART_BUCKET).getPublicUrl(uploadedPath);
    const hashtags = normalizeHashtags([...parsed.data.hashtags, artist.slug, "fanart"]);
    const { data, error } = await admin.from("fan_art_posts").insert({
      fan_user_id: user.id,
      artist_id: artist.id,
      image_path: publicUrl.publicUrl,
      caption: parsed.data.caption.trim() || null,
      hashtags,
      status: "published",
    }).select("*").single();
    if (error || !data) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

    await admin.from("notifications").insert({
      recipient_user_id: artist.owner_user_id,
      notification_type: "fan_art_related",
      artist_id: artist.id,
      title: `${artist.stage_name} için yeni bir fan çizimi paylaşıldı`,
      body: `@${user.profile.username} Sanatsal alanında yeni bir çalışma paylaştı.`,
      action_url: `/artist-studio/fan-sanati?sanatci=${artist.id}`,
    });
    uploadedPath = null;
    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    if (uploadedPath && !isDemoMode()) {
      await createSupabaseAdminClient().storage.from(FAN_ART_BUCKET).remove([uploadedPath]);
    }
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
