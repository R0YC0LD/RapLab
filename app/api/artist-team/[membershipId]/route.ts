/** DELETE /api/artist-team/{membershipId} — ekip üyeliğini kaldırma (Şartname 13.8, 23) */

import { NextRequest, NextResponse } from "next/server";
import { removeMember } from "@/features/artists/team";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess } from "@/lib/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const user = await requireUser();
    await removeMember(membershipId, user);
    return NextResponse.json(apiSuccess({ removed: true }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
