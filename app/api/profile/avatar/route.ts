/**
 * POST /api/profile/avatar — kullanıcı profil fotoğrafı yükleme (4.2)
 * multipart/form-data, alan adı: file. Görsel doğrulanır (21.1),
 * UUID adla avatars bucket'ına yazılır, profiles.avatar_path güncellenir.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { AVATARS_BUCKET } from "@/lib/storage";
import { IMAGE_MIME_TYPES } from "@/lib/validation";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!checkRateLimit("media_upload", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    if (isDemoMode()) {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
        "Demo modunda dosya yükleme kapalıdır.");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { file: "Dosya gerekli." });

    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      throw new ApiError(ErrorCodes.INVALID_MEDIA);
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new ApiError(ErrorCodes.FILE_TOO_LARGE, { file: "Profil fotoğrafı en fazla 5 MB olabilir." });
    }

    const ext = file.type.split("/")[1] ?? "jpg";
    // 21.1: orijinal ad yerine UUID
    const path = `${user.id}/${globalThis.crypto.randomUUID()}.${ext}`;

    const admin = createSupabaseAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(AVATARS_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new ApiError(ErrorCodes.UPLOAD_FAILED);

    const { data: pub } = admin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_path: pub.publicUrl })
      .eq("id", user.id);
    if (updateError) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

    return NextResponse.json(apiSuccess({ avatar_path: pub.publicUrl }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
