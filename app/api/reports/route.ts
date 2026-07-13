/** POST /api/reports — içerik bildirimi (Şartname 23, 26.3) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createReport } from "@/features/moderation/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  target_type: z.enum(["post", "artist", "user", "media"]),
  target_id: z.string().min(1),
  reason: z.enum(["spam", "harassment", "impersonation", "copyright", "inappropriate_content", "other"]),
  description: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!checkRateLimit("report", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
        body: "Bildirim bilgileri geçersiz.",
      });
    }
    const report = await createReport(parsed.data, user);
    return NextResponse.json(apiSuccess({ id: report.id }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
