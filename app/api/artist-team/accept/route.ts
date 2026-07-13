/** POST /api/artist-team/accept — davet kabulü (Şartname 13.8, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptInvite } from "@/features/artists/team";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const schema = z.object({ membership_id: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    await acceptInvite(parsed.data.membership_id, user);
    return NextResponse.json(apiSuccess({ accepted: true }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
