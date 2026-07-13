/**
 * GET /api/auth/username-check?u=... — kullanıcı adı müsaitlik kontrolü
 * Tekil kullanıcı adı garantisinin canlı arayüz ayağı (11.2; asıl güvence
 * veritabanındaki unique constraint'tir).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateUsername } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const username = (req.nextUrl.searchParams.get("u") ?? "").trim().toLowerCase();

    const identity = req.headers.get("x-forwarded-for") ?? "anon";
    if (!checkRateLimit("search", identity)) {
      return NextResponse.json(apiSuccess({ available: false, reason: "Çok fazla deneme." }));
    }

    const format = validateUsername(username);
    if (!format.valid) {
      return NextResponse.json(apiSuccess({ available: false, reason: format.error }));
    }

    if (isDemoMode()) {
      const taken = demoState().profiles.some((p) => p.username === username);
      return NextResponse.json(
        apiSuccess({ available: !taken, reason: taken ? "Bu kullanıcı adı alınmış." : undefined })
      );
    }

    const admin = createSupabaseAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username", username);

    const taken = (count ?? 0) > 0;
    return NextResponse.json(
      apiSuccess({ available: !taken, reason: taken ? "Bu kullanıcı adı alınmış." : undefined })
    );
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
