/**
 * POST /api/artists/{artistId}/follow — takip et
 * DELETE /api/artists/{artistId}/follow — takibi bırak
 * Şartname 10 (Takip), 23 (API zarfı), 26.3 (rate limit)
 */

import { NextRequest, NextResponse } from "next/server";
import { followArtist, unfollowArtist } from "@/features/follows/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("follow", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = await followArtist(artistId, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("follow", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = await unfollowArtist(artistId, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
