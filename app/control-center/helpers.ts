/** Control Center erişim kontrolü — Şartname 4.6–4.8, 5 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessControlCenter } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export async function requireCC(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/control-center");
  if (!canAccessControlCenter(user.profile.role)) redirect("/hata/403");
  return user;
}
