/** POST /api/media/complete-upload — yükleme tamamlandı (Şartname 21.5 adım 4–7, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeUpload } from "@/features/media/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const schema = z.object({ media_id: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const media = await completeUpload(parsed.data.media_id, user);
    return NextResponse.json(apiSuccess(media));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
