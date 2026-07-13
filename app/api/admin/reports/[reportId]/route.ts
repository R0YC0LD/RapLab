/** PATCH /api/admin/reports/{reportId} — rapor durumu güncelleme (Şartname 14.5, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateReport } from "@/features/moderation/service";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const schema = z.object({
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  resolution_note: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const user = await requireRole("moderator");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const report = await updateReport(reportId, parsed.data, user);
    return NextResponse.json(apiSuccess(report));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
