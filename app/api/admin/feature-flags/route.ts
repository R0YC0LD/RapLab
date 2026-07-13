/** PATCH /api/admin/feature-flags — özellik bayrağı değişimi (Şartname 14.7, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateFeatureFlag } from "@/features/moderation/service";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const schema = z.object({
  key: z.enum([
    "artist_applications_enabled",
    "new_registrations_enabled",
    "audio_teasers_enabled",
    "video_uploads_enabled",
    "scheduled_posts_enabled",
    "maintenance_mode",
    "public_follower_counts",
    "public_like_counts",
    "artist_custom_themes",
  ]),
  value: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("super_admin"); // sistem ayarları yalnızca süper yönetici (5)
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const flags = await updateFeatureFlag(parsed.data.key, parsed.data.value, user);
    return NextResponse.json(apiSuccess(flags));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
