import type { Profile } from "@/types";

const GENERATED_USERNAME_RE = /^uye_[0-9a-f]{8}$/i;

export function isProfileComplete(profile: Pick<Profile, "username" | "display_name">): boolean {
  const username = profile.username.trim();
  const displayName = profile.display_name.trim();

  return Boolean(
    username &&
      displayName &&
      !GENERATED_USERNAME_RE.test(username) &&
      displayName !== "Yeni Üye"
  );
}
