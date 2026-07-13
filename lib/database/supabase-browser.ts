"use client";

/**
 * Supabase tarayıcı istemcisi — yalnızca anon anahtar kullanır.
 * Bütün yetki kararları RLS ile veritabanında verilir (Değişmez Kural 20).
 */

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(supabaseUrl(), supabaseAnonKey());
  }
  return client;
}
