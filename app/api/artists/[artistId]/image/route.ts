/**
 * POST /api/artists/{artistId}/image — sanatçı görselleri (13.6)
 * multipart/form-data: file + kind (profile | desktop_cover | mobile_cover)
 * Yalnızca manage_profile izni olan ekip üyeleri (22.2).
 */

import { NextRequest, NextResponse } from "next/server";
import { getMembership } from "@/features/artists/service";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { memberHasPermission, roleAtLeast } from "@/lib/permissions";
import { AVATARS_BUCKET } from "@/lib/storage";
import { IMAGE_MIME_TYPES, IMAGE_MAX_BYTES } from "@/lib/validation";

const KIND_COLUMN: Record<string, string> = {
  profile: "profile_image_path",
  desktop_cover: "desktop_cover_path",
  mobile_cover: "mobile_cover_path",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const user = await requireUser();
    if (!roleAtLeast(user.profile.role, "admin")) {
      const membership = await getMembership(artistId, user.id);
      if (!memberHasPermission(membership, "manage_profile")) {
        throw new ApiError(ErrorCodes.PERMISSION_DENIED);
      }
    }

    if (isDemoMode()) {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
        "Demo modunda dosya yükleme kapalıdır.");
    }

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "profile");
    const column = KIND_COLUMN[kind];
    if (!column) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { kind: "Geçersiz görsel türü." });
    if (!(file instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { file: "Dosya gerekli." });

    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      throw new ApiError(ErrorCodes.INVALID_MEDIA);
    }
    if (file.size > IMAGE_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE);

    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `artists/${artistId}/${kind}-${globalThis.crypto.randomUUID()}.${ext}`;

    const admin = createSupabaseAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(AVATARS_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new ApiError(ErrorCodes.UPLOAD_FAILED);

    const { data: pub } = admin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    const { error: updateError } = await admin
      .from("artists")
      .update({ [column]: pub.publicUrl })
      .eq("id", artistId);
    if (updateError) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

    return NextResponse.json(apiSuccess({ path: pub.publicUrl, kind }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
