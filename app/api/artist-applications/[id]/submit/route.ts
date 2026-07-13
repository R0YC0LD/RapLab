/** POST /api/artist-applications/{id}/submit — taslak başvuruyu gönder (Şartname 12.2, 23) */

import { NextRequest, NextResponse } from "next/server";
import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    if (isDemoMode()) {
      const app = demoState().applications.find((a) => a.id === id && a.user_id === user.id);
      if (!app) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
      if (app.status !== "draft" && app.status !== "more_information_required") {
        throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
          status: "Yalnızca taslak veya ek bilgi bekleyen başvuru gönderilebilir.",
        });
      }
      app.status = "submitted";
      app.updated_at = new Date().toISOString();
      return NextResponse.json(apiSuccess({ id, status: app.status }));
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("artist_applications")
      .update({ status: "submitted" })
      .eq("id", id)
      .eq("user_id", user.id)
      .in("status", ["draft", "more_information_required"])
      .select("id, status")
      .single();
    if (error || !data) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
