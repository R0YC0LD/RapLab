/** POST /api/media/create-upload — yükleme yetkisi (Şartname 21.5 adım 2, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeUpload } from "@/features/media/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  artist_id: z.string().min(1),
  post_id: z.string().min(1),
  mime_type: z.string().min(3),
  file_size_bytes: z.number().int().positive(),
  duration_seconds: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!checkRateLimit("media_upload", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);

    const auth = await authorizeUpload(parsed.data, user);
    return NextResponse.json(apiSuccess(auth));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
