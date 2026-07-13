/**
 * Ortam yapılandırması — Şartname 33 (Yayınlama), 37 (Mock veri kuralı)
 *
 * Supabase kimlik bilgileri tanımlıysa gerçek backend kullanılır.
 * Tanımlı değilse uygulama DEMO modunda çalışır: kurgusal sanatçılar ve
 * bellek içi veri deposu ile. Demo modu arayüzde açıkça belirtilir —
 * hiçbir özellik "çalışıyor gibi" gösterilmez (Şartname 37).
 */

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isDemoMode(): boolean {
  if (process.env.RAPLAB_FORCE_DEMO === "true") return true;
  return !hasSupabaseConfig();
}

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL tanımlı değil.");
  return url;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.");
  return key;
}

/** Service role anahtarı yalnızca sunucuda kullanılır — istemciye asla gönderilmez (26.4). */
export function supabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  if (typeof window !== "undefined") {
    throw new Error("Service role anahtarı istemcide kullanılamaz.");
  }
  return key;
}
