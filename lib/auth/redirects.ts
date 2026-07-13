const LOCAL_ORIGIN = "http://raplab.local";

export function safeRelativePath(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authCallbackUrl(nextPath?: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/api/auth/callback", siteUrl);
  if (nextPath) url.searchParams.set("next", safeRelativePath(nextPath));
  return url.toString();
}
