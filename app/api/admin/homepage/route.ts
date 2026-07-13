/** PATCH /api/admin/homepage — hero sanatçısı ve RapLine sırası (Şartname 14.6) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoState, writeAudit } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes, newRequestId } from "@/lib/errors";

const schema = z.object({
  hero_artist_id: z.string().optional(),
  rapline_order: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);

    if (!isDemoMode()) {
      // Supabase modunda homepage_config tablosu / system_settings üzerinden yönetilir
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE);
    }

    const s = demoState();
    const prev = { heroArtistId: s.heroArtistId, raplineOrder: [...s.raplineOrder] };

    if (parsed.data.hero_artist_id) {
      if (!s.artists.some((a) => a.id === parsed.data.hero_artist_id)) {
        throw new ApiError(ErrorCodes.VALIDATION_FAILED, { hero_artist_id: "Sanatçı bulunamadı." });
      }
      s.heroArtistId = parsed.data.hero_artist_id;
    }
    if (parsed.data.rapline_order) {
      s.raplineOrder = parsed.data.rapline_order.filter((id) =>
        s.artists.some((a) => a.id === id)
      );
    }

    writeAudit({
      actor_user_id: user.id,
      actor_role: user.profile.role,
      action: "homepage.updated",
      target_type: "homepage_config",
      previous_data: prev,
      new_data: { heroArtistId: s.heroArtistId, raplineOrder: s.raplineOrder },
      request_id: newRequestId(),
    });

    return NextResponse.json(
      apiSuccess({ hero_artist_id: s.heroArtistId, rapline_order: s.raplineOrder })
    );
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
