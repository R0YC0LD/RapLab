import { NextRequest, NextResponse } from "next/server";
import { addFanArtLike, removeFanArtLike } from "@/features/fan-art/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

async function mutate(postId: string, method: "POST" | "DELETE") {
  try {
    const user = await requireUser();
    if (!checkRateLimit("like", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const result = method === "POST"
      ? await addFanArtLike(postId, user)
      : await removeFanArtLike(postId, user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return mutate((await params).postId, "POST");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return mutate((await params).postId, "DELETE");
}
