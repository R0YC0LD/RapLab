/**
 * Yetki sistemi — Şartname Bölüm 5 (Yetki Matrisi), 4 (Kullanıcı Grupları), 13.8 (Ekip izinleri)
 *
 * ÖNEMLİ: Bu modül yalnızca arayüz kararları içindir. Asıl güvenlik
 * veritabanı seviyesinde RLS politikalarıyla sağlanır (Değişmez Kural 20).
 */

import type { ArtistMember, TeamPermission, UserRole } from "@/types";

export const ROLE_ORDER: UserRole[] = ["user", "artist", "moderator", "admin", "super_admin"];

export function roleAtLeast(role: UserRole, min: UserRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

/* ---------- 5. Yetki Matrisi ---------- */

export type MatrixAction =
  | "view_public_profiles"
  | "like_post"
  | "follow_artist"
  | "create_post"
  | "edit_post"
  | "hide_post"
  | "design_profile"
  | "view_analytics"
  | "verify_artist"
  | "suspend_user"
  | "create_admin"
  | "system_settings"
  | "view_audit_log"
  | "delete_audit_log";

type MatrixValue = "yes" | "no" | "own" | "delegated" | "limited" | "review" | "temporary" | "as_needed";

/** Satırlar şartnamedeki 5. bölüm tablosunun birebir karşılığıdır. */
export const PERMISSION_MATRIX: Record<
  MatrixAction,
  Record<"visitor" | UserRole | "team", MatrixValue>
> = {
  view_public_profiles: { visitor: "yes", user: "yes", artist: "yes", team: "yes", moderator: "yes", admin: "yes", super_admin: "yes" },
  like_post:            { visitor: "no", user: "yes", artist: "yes", team: "yes", moderator: "yes", admin: "yes", super_admin: "yes" },
  follow_artist:        { visitor: "no", user: "yes", artist: "yes", team: "yes", moderator: "yes", admin: "yes", super_admin: "yes" },
  create_post:          { visitor: "no", user: "no", artist: "own", team: "delegated", moderator: "no", admin: "as_needed", super_admin: "yes" },
  edit_post:            { visitor: "no", user: "no", artist: "own", team: "delegated", moderator: "no", admin: "yes", super_admin: "yes" },
  hide_post:            { visitor: "no", user: "no", artist: "own", team: "delegated", moderator: "temporary", admin: "yes", super_admin: "yes" },
  design_profile:       { visitor: "no", user: "no", artist: "own", team: "delegated", moderator: "no", admin: "yes", super_admin: "yes" },
  view_analytics:       { visitor: "no", user: "no", artist: "own", team: "delegated", moderator: "no", admin: "yes", super_admin: "yes" },
  verify_artist:        { visitor: "no", user: "no", artist: "no", team: "no", moderator: "review", admin: "yes", super_admin: "yes" },
  suspend_user:         { visitor: "no", user: "no", artist: "no", team: "no", moderator: "limited", admin: "yes", super_admin: "yes" },
  create_admin:         { visitor: "no", user: "no", artist: "no", team: "no", moderator: "no", admin: "no", super_admin: "yes" },
  system_settings:      { visitor: "no", user: "no", artist: "no", team: "no", moderator: "no", admin: "limited", super_admin: "yes" },
  view_audit_log:       { visitor: "no", user: "no", artist: "no", team: "no", moderator: "limited", admin: "yes", super_admin: "yes" },
  // Audit log hiçbir rol tarafından silinemez — 15.10
  delete_audit_log:     { visitor: "no", user: "no", artist: "no", team: "no", moderator: "no", admin: "no", super_admin: "no" },
};

export function matrixAllows(action: MatrixAction, role: UserRole | "visitor" | "team"): boolean {
  return PERMISSION_MATRIX[action][role] !== "no";
}

/* ---------- 13.8 Ekip rolleri varsayılan izinleri ---------- */

export const DEFAULT_ROLE_PERMISSIONS: Record<string, TeamPermission[]> = {
  owner: [
    "manage_posts",
    "publish_posts",
    "delete_posts",
    "manage_media",
    "manage_profile",
    "view_analytics",
    "manage_team",
    "manage_projects",
  ],
  manager: [
    "manage_posts",
    "publish_posts",
    "manage_media",
    "manage_profile",
    "view_analytics",
    "manage_projects",
  ],
  content_manager: ["manage_posts", "publish_posts", "manage_media", "manage_projects"],
  visual_editor: ["manage_media", "manage_profile"],
  analytics_viewer: ["view_analytics"],
  label_rep: ["view_analytics", "manage_projects"],
};

/** Ekip üyesinin belirli bir izne sahip olup olmadığını kontrol eder. */
export function memberHasPermission(member: ArtistMember | null, permission: TeamPermission): boolean {
  if (!member || member.status !== "active") return false;
  if (member.member_role === "owner") return true;
  return member.permissions.includes(permission);
}

/** Kullanıcı bu sanatçı profilinde gönderi oluşturabilir mi?
 *  Değişmez Kural 9–11: yalnızca doğrulanmış sanatçı ve yetkili ekip üyeleri;
 *  sanatçı yalnızca kendi profilinde. */
export function canCreatePostForArtist(params: {
  role: UserRole;
  membership: ArtistMember | null;
  artistVerified: boolean;
}): boolean {
  const { role, membership, artistVerified } = params;
  if (roleAtLeast(role, "admin")) return true;
  if (!artistVerified) return false;
  return memberHasPermission(membership, "manage_posts");
}

export function canPublishPostForArtist(params: {
  role: UserRole;
  membership: ArtistMember | null;
  artistVerified: boolean;
}): boolean {
  const { role, membership, artistVerified } = params;
  if (roleAtLeast(role, "admin")) return true;
  if (!artistVerified) return false;
  return memberHasPermission(membership, "publish_posts");
}

export function canAccessArtistStudio(role: UserRole, memberships: ArtistMember[]): boolean {
  if (roleAtLeast(role, "admin")) return true;
  return memberships.some((m) => m.status === "active");
}

export function canAccessControlCenter(role: UserRole): boolean {
  return roleAtLeast(role, "moderator");
}

/** Moderatör sanatçı doğrulamasını tek başına ONAYLAYAMAZ (4.6) — yalnızca inceler. */
export function canApproveArtistApplication(role: UserRole): boolean {
  return roleAtLeast(role, "admin");
}

export function canCreateAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function canChangeSystemSettings(role: UserRole): boolean {
  return role === "super_admin";
}
