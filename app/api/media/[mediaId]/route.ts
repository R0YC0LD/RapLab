/** DELETE /api/media/{mediaId} — medya kalıcı silme talebi (Şartname 13.5, 23) */

import { NextRequest, NextResponse } from "next/server";
import { getMembership } from "@/features/artists/service";
import { requireUser } from "@/lib/auth/session";
import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { memberHasPermission } from "@/lib/permissions";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const user = await requireUser();

    if (isDemoMode()) {
      const s = demoState();
      const media = s.media.find((m) => m.id === mediaId);
      if (!media) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
      const post = s.posts.find((p) => p.id === media.post_id);
      const membership = post ? await getMembership(post.artist_id, user.id) : null;
      if (!memberHasPermission(membership, "delete_posts") && user.profile.role !== "super_admin") {
        throw new ApiError(ErrorCodes.PERMISSION_DENIED);
      }
      media.processing_status = "deleted";
      return NextResponse.json(apiSuccess({ id: mediaId, status: "deleted" }));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("post_media")
      .update({ processing_status: "deleted" })
      .eq("id", mediaId);
    if (error) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    return NextResponse.json(apiSuccess({ id: mediaId, status: "deleted" }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
