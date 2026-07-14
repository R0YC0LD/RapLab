/**
 * Rate limit — Şartname 26.3
 * Her işlem türü için ayrı limit. Bellek içi sabit pencere sayacı;
 * production'da Redis/Upstash gibi paylaşımlı bir depoya taşınabilir.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as typeof globalThis & { __raplabRate?: Map<string, Bucket> };

function store(): Map<string, Bucket> {
  if (!g.__raplabRate) g.__raplabRate = new Map();
  return g.__raplabRate;
}

/** İşlem türlerine göre limitler: [istek sayısı, pencere ms] */
export const RATE_LIMITS = {
  login: [10, 60_000],
  register: [5, 60_000],
  password_reset: [3, 60_000],
  email_verification: [3, 10 * 60_000],
  like: [60, 60_000],
  follow: [30, 60_000],
  search: [40, 60_000],
  create_post: [10, 60_000],
  media_upload: [20, 60_000],
  profile_update: [20, 60_000],
  artist_application: [3, 3600_000],
  report: [10, 3600_000],
  admin_action: [60, 60_000],
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/** true dönerse istek kabul edilir; false dönerse RATE_LIMITED. */
export function checkRateLimit(action: RateLimitAction, identity: string): boolean {
  const [max, windowMs] = RATE_LIMITS[action];
  const key = `${action}:${identity}`;
  const now = Date.now();
  const s = store();
  const bucket = s.get(key);

  if (!bucket || bucket.resetAt < now) {
    s.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}
