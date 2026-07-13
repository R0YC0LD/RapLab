/**
 * PATCH /api/posts/{postId} — durum/sabitleme güncelleme
 * DELETE /api/posts/{postId} — soft delete (Şartname 8.2, 23)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updatePostStatus } from "@/features/posts/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const patchSchema = z.object({
  status: z.enum(["published", "hidden", "archived"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await requireUser();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success || !parsed.data.status) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    }
    const post = await updatePostStatus(postId, parsed.data.status, user);
    return NextResponse.json(apiSuccess(post));
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
    const post = await updatePostStatus(postId, "deleted", user);
    return NextResponse.json(apiSuccess({ id: post.id, status: post.status }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
