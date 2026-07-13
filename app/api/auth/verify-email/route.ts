/**
 * POST /api/auth/verify-email — profildeki "Doğrula" butonu
 *
 * Google ile girenlerde Supabase e-postayı zaten doğrulamıştır ama ayrı bir
 * doğrulama e-postası GELMEZ; bu uç, auth kaydındaki gerçek durumu okuyup
 * profili senkronlar. E-posta/parola kullanıcısı henüz doğrulamadıysa
 * doğrulama e-postasını yeniden gönderir.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { authCallbackUrl } from "@/lib/auth/redirects";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const user = await requireUser();

    if (isDemoMode()) {
      return NextResponse.json(apiSuccess({ email_verified: true, resent: false, provider: "demo" }));
    }

    if (!checkRateLimit("email_verification", user.id)) {
      throw new ApiError(
        ErrorCodes.RATE_LIMITED,
        undefined,
        "Çok sık doğrulama e-postası istedin. Birkaç dakika sonra tekrar dene."
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError(ErrorCodes.AUTH_REQUIRED);

    const provider = authUser.app_metadata?.provider;
    const confirmed = Boolean(authUser.email_confirmed_at) || provider === "google";

    if (confirmed) {
      // Auth kaydı doğrulanmış — profili senkronla (service role; RLS'e takılmaz)
      const admin = createSupabaseAdminClient();
      const { error } = await admin
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);
      if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
      return NextResponse.json(apiSuccess({ email_verified: true, resent: false, provider }));
    }

    // Henüz doğrulanmamış e-posta kullanıcısı: doğrulama e-postasını yeniden gönder
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: authUser.email ?? user.email,
      options: { emailRedirectTo: authCallbackUrl("/hesap?dogrulandi=1") },
    });
    if (error) throw new ApiError(ErrorCodes.RATE_LIMITED, undefined,
      "Doğrulama e-postası şu anda gönderilemedi. Birkaç dakika sonra tekrar dene.");

    return NextResponse.json(
      apiSuccess({
        email_verified: false,
        resent: true,
        provider,
        retry_after_seconds: 60,
      })
    );
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
