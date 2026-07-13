/**
 * Supabase sunucu istemcileri — Şartname 22 (RLS), 26.4 (service role güvenliği)
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Oturum çerezleriyle çalışan sunucu istemcisi.
 * Bütün sorgular RLS politikalarına tabidir.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              // 11.4 Oturum güvenliği: güvenli çerezler
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          );
        } catch {
          // Server Component içinden çağrıldığında yazma yapılamaz; middleware devralır.
        }
      },
    },
  });
}

/**
 * Service role istemcisi — RLS'i atlar; YALNIZCA sunucu tarafı yönetici
 * işlemlerinde (rol değişikliği, başvuru onayı, audit log) kullanılır.
 * Bu anahtar istemciye asla gönderilmez (26.4).
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
