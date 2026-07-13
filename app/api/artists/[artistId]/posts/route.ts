/** POST /api/artists/{artistId}/posts — gönderi oluşturma (Şartname 13.3, 23) */

import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/features/posts/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPostSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("create_post", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    const parsed = createPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, fieldErrors);
    }

    const post = await createPost(artistId, parsed.data, user);
    return NextResponse.json(apiSuccess(post), { status: 201 });
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
