/**
 * Oturum yönetimi — Şartname 11 (Kayıt/Giriş), 11.4 (Oturum güvenliği)
 *
 * Supabase modunda gerçek Supabase Auth oturumu kullanılır.
 * Demo modunda güvenli httpOnly çerezle demo persona oturumu tutulur;
 * bu yalnızca geliştirme/demo içindir ve arayüzde açıkça belirtilir.
 */

import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env";
import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { ApiError, ErrorCodes } from "@/lib/errors";
import { canAccessControlCenter, roleAtLeast } from "@/lib/permissions";
import type { Profile, SessionUser, UserRole } from "@/types";

export const DEMO_SESSION_COOKIE = "raplab_demo_session";

/** Demo modunda seçilebilir personalar */
export const DEMO_PERSONAS = [
  { id: "u-demo-user", label: "Dinleyici (normal kullanıcı)", role: "user" },
  { id: "u-demo-artist", label: "Ray Vold (doğrulanmış sanatçı)", role: "artist" },
  { id: "u-demo-mod", label: "Gözcü (moderatör)", role: "moderator" },
  { id: "u-demo-admin", label: "Kurucu (süper yönetici)", role: "super_admin" },
] as const;

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const store = await cookies();
    const id = store.get(DEMO_SESSION_COOKIE)?.value;
    if (!id) return null;
    const profile = demoState().profiles.find((p) => p.id === id && !p.deleted_at);
    if (!profile || profile.account_status !== "active") return null;
    return { id: profile.id, email: `${profile.username}@demo.raplab.local`, profile };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    auth_provider: String(user.app_metadata?.provider ?? "email"),
    profile: profile as Profile,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(ErrorCodes.AUTH_REQUIRED);
  return user;
}

export async function requireRole(min: UserRole): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.profile.role, min)) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  return user;
}

export async function requireControlCenterAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessControlCenter(user.profile.role)) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  return user;
}
