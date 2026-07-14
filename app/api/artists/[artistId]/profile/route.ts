import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMembership } from "@/features/artists/service";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { memberHasPermission, roleAtLeast } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { TURKEY_CITY_NAMES } from "@/lib/turkey/cities";

const schema = z.object({
  city: z.enum(TURKEY_CITY_NAMES),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const user = await requireUser();
    if (!checkRateLimit("profile_update", user.id)) {
      throw new ApiError(ErrorCodes.RATE_LIMITED);
    }

    if (!roleAtLeast(user.profile.role, "admin")) {
      const membership = await getMembership(artistId, user.id);
      if (!memberHasPermission(membership, "manage_profile")) {
        throw new ApiError(ErrorCodes.PERMISSION_DENIED);
      }
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
        city: "Türkiye'deki 81 ilden birini seçmelisin.",
      });
    }

    if (isDemoMode()) {
      const artist = demoState().artists.find((item) => item.id === artistId);
      if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
      artist.city = parsed.data.city;
      artist.updated_at = new Date().toISOString();
      return NextResponse.json(apiSuccess({ id: artist.id, city: artist.city }));
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("artists")
      .update({ city: parsed.data.city, updated_at: new Date().toISOString() })
      .eq("id", artistId)
      .select("id, city")
      .single();

    if (error || !data) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
