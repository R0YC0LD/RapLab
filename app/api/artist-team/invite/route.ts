/** POST /api/artist-team/invite — ekip daveti (Şartname 13.8, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inviteMember } from "@/features/artists/team";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

const schema = z.object({
  artist_id: z.string().min(1),
  invite_email: z.string().email(),
  member_role: z.enum(["manager", "content_manager", "visual_editor", "analytics_viewer", "label_rep"]),
  permissions: z
    .array(
      z.enum([
        "manage_posts", "publish_posts", "delete_posts", "manage_media",
        "manage_profile", "view_analytics", "manage_team", "manage_projects",
      ])
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const member = await inviteMember(parsed.data, user);
    return NextResponse.json(apiSuccess({ id: member.id, status: member.status }), { status: 201 });
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
