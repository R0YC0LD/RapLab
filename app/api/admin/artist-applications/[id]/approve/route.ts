/** POST /api/admin/artist-applications/{id}/approve — başvuru onayı (Şartname 12.3, 23) */

import { NextRequest, NextResponse } from "next/server";
import { approveApplication } from "@/features/moderation/service";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole("admin"); // moderatör tek başına onaylayamaz (4.6)
    if (!checkRateLimit("admin_action", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = await approveApplication(id, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
