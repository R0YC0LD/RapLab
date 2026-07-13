/** POST /api/admin/artist-applications/{id}/reject — başvuru reddi (Şartname 12.3, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rejectApplication } from "@/features/moderation/service";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ note: z.string().min(1, "Ret gerekçesi zorunlu.").max(1000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole("admin");
    if (!checkRateLimit("admin_action", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { note: "Ret gerekçesi zorunlu." });

    await rejectApplication(id, parsed.data.note, user);
    return NextResponse.json(apiSuccess({ id, status: "rejected" }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
