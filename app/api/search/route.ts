/** GET /api/search?q= — arama (Şartname 25, 26.3) */

import { NextRequest, NextResponse } from "next/server";
import { search } from "@/features/artists/service";
import { getSessionUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { SEARCH_MIN_CHARS } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    // 25: boş sorguda veritabanının tamamı yüklenmez; en az iki karakter
    if (q.length < SEARCH_MIN_CHARS) {
      return NextResponse.json(apiSuccess({ artists: [], posts: [] }));
    }

    const user = await getSessionUser();
    const identity = user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
    if (!checkRateLimit("search", identity)) throw new ApiError(ErrorCodes.RATE_LIMITED);

    const results = await search(q, user?.id ?? null);
    return NextResponse.json(apiSuccess(results));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
