/** GET /api/auth/callback — OAuth (Google) geri dönüşü (Şartname 11) */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (isDemoMode() || !code) {
    return NextResponse.redirect(new URL("/giris", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/giris?hata=oauth", url.origin));
  }
  // 11.3: ilk giriş akışı — profil tamamlanmamışsa onboarding'e yönlendir
  return NextResponse.redirect(new URL("/hosgeldin", url.origin));
}
