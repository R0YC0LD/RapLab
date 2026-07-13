/** GET /api/auth/callback — OAuth (Google) geri dönüşü (Şartname 11) */

import { NextRequest, NextResponse } from "next/server";
import { isProfileComplete } from "@/lib/auth/profile-completion";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/giris?hata=oauth", url.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  // 11.3: ilk giriş akışı — yalnızca profil gerçekten eksikse onboarding'e yönlendir
  return NextResponse.redirect(
    new URL(profile && isProfileComplete(profile) ? "/" : "/hosgeldin", url.origin)
  );
}
