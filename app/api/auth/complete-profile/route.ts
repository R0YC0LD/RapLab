/** POST /api/auth/complete-profile — ilk giriş akışı, kullanıcı adı belirleme (Şartname 11.3, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { validateUsername } from "@/lib/validation";

const schema = z.object({
  username: z.string(),
  display_name: z.string().min(1).max(60),
  terms_accepted: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);

    const usernameCheck = validateUsername(parsed.data.username);
    if (!usernameCheck.valid) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
        username: usernameCheck.error ?? "Geçersiz kullanıcı adı.",
      });
    }

    if (isDemoMode()) {
      // Demo modunda profil zaten hazır — gerçek değişiklik yapılmaz
      return NextResponse.json(apiSuccess({ id: user.id, username: user.profile.username }));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: parsed.data.username,
        display_name: parsed.data.display_name,
      })
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
          username: "Bu kullanıcı adı zaten alınmış.",
        });
      }
      throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
    }
    return NextResponse.json(apiSuccess({ id: user.id, username: parsed.data.username }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
