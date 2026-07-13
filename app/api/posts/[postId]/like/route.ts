/**
 * POST /api/posts/{postId}/like — beğeni ekle
 * DELETE /api/posts/{postId}/like — beğeni kaldır
 * Şartname 9 (Beğeni), 23 (API zarfı), 26.3 (rate limit)
 */

import { NextRequest, NextResponse } from "next/server";
import { addLike, removeLike } from "@/features/likes/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("like", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = await addLike(postId, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("like", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = await removeLike(postId, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
