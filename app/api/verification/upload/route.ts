/**
 * POST /api/verification/upload — başvuru doğrulama medyası (12.1, Kural 14)
 * multipart/form-data: file + kind (identity | voice)
 *
 * - identity: geçici kimlik fotoğrafı (görsel, ≤ 8 MB)
 * - voice: "sitenize sanatçı üyeliği yapmak istiyorum" ses beyanı (≤ 60 sn, ≤ 10 MB)
 *
 * Dosyalar ÖZEL verification-docs bucket'ına yazılır; hiçbir zaman herkese
 * açık olmaz. Kimlik belgesi süper yönetici tarafından yalnızca BİR KEZ,
 * süreli bağlantıyla görüntülenebilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { VERIFICATION_DOCS_BUCKET } from "@/lib/storage";
import { AUDIO_MIME_TYPES, IMAGE_MIME_TYPES } from "@/lib/validation";

const IDENTITY_MAX_BYTES = 8 * 1024 * 1024;
const VOICE_MAX_BYTES = 10 * 1024 * 1024;
// Tarayıcı MediaRecorder çıktıları için ek izinli türler
const VOICE_MIME_TYPES = [...AUDIO_MIME_TYPES, "audio/webm", "audio/webm;codecs=opus"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.profile.email_verified) throw new ApiError(ErrorCodes.EMAIL_NOT_VERIFIED);
    if (!checkRateLimit("media_upload", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    if (isDemoMode()) {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
        "Demo modunda dosya yükleme kapalıdır.");
    }

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    if (!(file instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { file: "Dosya gerekli." });

    let ext: string;
    if (kind === "identity") {
      if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new ApiError(ErrorCodes.INVALID_MEDIA, { file: "Kimlik için JPEG/PNG/WebP görseli yükle." });
      }
      if (file.size > IDENTITY_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE);
      ext = file.type.split("/")[1] ?? "jpg";
    } else if (kind === "voice") {
      const baseType = file.type.split(";")[0];
      if (!VOICE_MIME_TYPES.some((t) => t.split(";")[0] === baseType)) {
        throw new ApiError(ErrorCodes.INVALID_MEDIA, { file: "Ses kaydı formatı desteklenmiyor." });
      }
      if (file.size > VOICE_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE);
      ext = baseType === "audio/webm" ? "webm" : (baseType.split("/")[1] ?? "webm");
    } else {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, { kind: "Tür identity veya voice olmalı." });
    }

    // 22.6: dosya yolunun ilk klasörü kullanıcı ID'siyle eşleşir
    const path = `${user.id}/${kind}-${globalThis.crypto.randomUUID()}.${ext}`;

    const admin = createSupabaseAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage
      .from(VERIFICATION_DOCS_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new ApiError(ErrorCodes.UPLOAD_FAILED);

    return NextResponse.json(apiSuccess({ storage_path: path, kind }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
