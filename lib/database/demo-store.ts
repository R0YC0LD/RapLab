/**
 * DEMO veri deposu — bellek içi, yalnızca geliştirme/demo ortamı (Şartname 37).
 *
 * Değişmez kurallar burada da uygulanır: tekil beğeni (post_id+user_id),
 * tekil takip (artist_id+user_id), rol kontrolleri, soft delete.
 * globalThis üzerinde saklanır ki Next.js HMR sırasında durum kaybolmasın.
 */

import type {
  Artist,
  ArtistApplication,
  ArtistFollow,
  ArtistMember,
  AuditLog,
  FeatureFlags,
  FanArtLike,
  FanArtPost,
  FanVerification,
  Notification,
  Post,
  PostLike,
  PostMedia,
  Profile,
  Report,
  UserRole,
} from "@/types";
import {
  demoApplications,
  demoArtists,
  demoAuditLogs,
  demoFeatureFlags,
  demoFanArtLikes,
  demoFanArtPosts,
  demoFanVerifications,
  demoFollows,
  demoLikes,
  demoMedia,
  demoMembers,
  demoNotifications,
  demoPosts,
  demoProfiles,
  demoReports,
} from "./demo-data";

export interface DemoState {
  profiles: Profile[];
  artists: Artist[];
  members: ArtistMember[];
  posts: Post[];
  media: PostMedia[];
  likes: PostLike[];
  follows: ArtistFollow[];
  applications: ArtistApplication[];
  reports: Report[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  featureFlags: FeatureFlags;
  fanVerifications: FanVerification[];
  fanArtPosts: FanArtPost[];
  fanArtLikes: FanArtLike[];
  raplineOrder: string[];
  heroArtistId: string;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function initialState(): DemoState {
  return {
    profiles: clone(demoProfiles),
    artists: clone(demoArtists),
    members: clone(demoMembers),
    posts: clone(demoPosts),
    media: clone(demoMedia),
    likes: clone(demoLikes),
    follows: clone(demoFollows),
    applications: clone(demoApplications),
    reports: clone(demoReports),
    auditLogs: clone(demoAuditLogs),
    notifications: clone(demoNotifications),
    featureFlags: clone(demoFeatureFlags),
    fanVerifications: clone(demoFanVerifications),
    fanArtPosts: clone(demoFanArtPosts),
    fanArtLikes: clone(demoFanArtLikes),
    raplineOrder: ["a-rayvold", "a-karga", "a-semak", "a-golge06", "a-nefes", "a-beton"],
    heroArtistId: "a-rayvold",
  };
}

const g = globalThis as typeof globalThis & { __raplabDemoState?: DemoState };

export function demoState(): DemoState {
  if (!g.__raplabDemoState) g.__raplabDemoState = initialState();
  return g.__raplabDemoState;
}

export function resetDemoState(): void {
  g.__raplabDemoState = initialState();
}

/* ---------- Audit log yardımcı ---------- */

export function writeAudit(entry: {
  actor_user_id: string;
  actor_role: UserRole;
  action: string;
  target_type: string;
  target_id?: string | null;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  request_id: string;
}): void {
  const s = demoState();
  s.auditLogs.unshift({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actor_user_id: entry.actor_user_id,
    actor_role: entry.actor_role,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id ?? null,
    previous_data: entry.previous_data ?? null,
    new_data: entry.new_data ?? null,
    request_id: entry.request_id,
    ip_hash: null,
    created_at: new Date().toISOString(),
  });
}
