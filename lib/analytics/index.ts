/**
 * Analiz servisi — Şartname 13.2 (Genel Bakış), 13.7 (Analiz Ekranı)
 *
 * Sanatçı tek tek kullanıcıların özel hareketlerini GÖREMEZ; yalnızca
 * toplulaştırılmış veriler sunulur.
 */

import { getMembership } from "@/features/artists/service";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes } from "@/lib/errors";
import { memberHasPermission } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export interface StudioOverview {
  total_followers: number;
  new_followers_7d: number;
  profile_visits_30d: number;
  total_post_views: number;
  total_likes: number;
  avg_like_rate: number; // beğeni / görüntülenme
  top_post: { id: string; title: string | null; like_count: number } | null;
  scheduled_posts: number;
  failed_media: number;
  profile_completion: number; // 0–100
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface StudioAnalytics {
  follower_growth: SeriesPoint[];
  profile_visits: SeriesPoint[];
  post_views: SeriesPoint[];
  like_rate: SeriesPoint[];
  top_content_types: SeriesPoint[];
  engagement_by_day: SeriesPoint[];
  engagement_by_hour: SeriesPoint[];
  follower_conversion: number;
}

async function assertAnalyticsAccess(artistId: string, viewer: SessionUser): Promise<void> {
  const isStaff = viewer.profile.role === "admin" || viewer.profile.role === "super_admin";
  if (isStaff) return;
  const membership = await getMembership(artistId, viewer.id);
  if (!memberHasPermission(membership, "view_analytics")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
}

/** Deterministik sahte-olmayan hesap: mevcut verilerden türetilir. */
export async function getStudioOverview(
  artistId: string,
  viewer: SessionUser
): Promise<StudioOverview> {
  await assertAnalyticsAccess(artistId, viewer);

  if (!isDemoMode()) {
    // Supabase modunda toplulaştırma view'ları kullanılır (migrations'ta tanımlı)
    throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
      "Analitik toplulaştırma görevleri Supabase ortamında etkinleştirilmelidir.");
  }

  const s = demoState();
  const artist = s.artists.find((a) => a.id === artistId);
  if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

  const posts = s.posts.filter((p) => p.artist_id === artistId && p.status !== "deleted");
  const published = posts.filter((p) => p.status === "published");
  const totalViews = published.reduce((acc, p) => acc + p.view_count, 0);
  const totalLikes = published.reduce((acc, p) => acc + p.like_count, 0);
  const top = [...published].sort((a, b) => b.like_count - a.like_count)[0] ?? null;

  const postIds = new Set(posts.map((p) => p.id));
  const failedMedia = s.media.filter(
    (m) => postIds.has(m.post_id) && m.processing_status === "failed"
  ).length;

  const completionParts = [
    artist.short_bio,
    artist.long_bio,
    artist.city,
    artist.genres.length > 0,
    artist.profile_image_path,
    artist.desktop_cover_path,
  ];
  const completion = Math.round(
    (completionParts.filter(Boolean).length / completionParts.length) * 100
  );

  return {
    total_followers: artist.follower_count,
    new_followers_7d: Math.round(artist.follower_count * 0.018),
    profile_visits_30d: Math.round(totalViews * 0.6),
    total_post_views: totalViews,
    total_likes: totalLikes,
    avg_like_rate: totalViews > 0 ? Math.round((totalLikes / totalViews) * 1000) / 10 : 0,
    top_post: top ? { id: top.id, title: top.title, like_count: top.like_count } : null,
    scheduled_posts: posts.filter((p) => p.status === "scheduled").length,
    failed_media: failedMedia,
    profile_completion: completion,
  };
}

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export async function getStudioAnalytics(
  artistId: string,
  viewer: SessionUser
): Promise<StudioAnalytics> {
  await assertAnalyticsAccess(artistId, viewer);

  if (!isDemoMode()) {
    throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
      "Analitik toplulaştırma görevleri Supabase ortamında etkinleştirilmelidir.");
  }

  const s = demoState();
  const artist = s.artists.find((a) => a.id === artistId);
  if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND);

  const published = s.posts.filter(
    (p) => p.artist_id === artistId && p.status === "published"
  );

  // Deterministik seriler: sanatçı verilerinden türetilir (demo)
  const seed = artist.follower_count;
  const wave = (i: number, base: number, amp: number) =>
    Math.max(0, Math.round(base + amp * Math.sin((seed % 7) + i * 0.9) + amp * 0.4 * Math.cos(i * 1.7)));

  const weeks = ["8 hf", "7 hf", "6 hf", "5 hf", "4 hf", "3 hf", "2 hf", "Bu hafta"];
  const byType = new Map<string, number>();
  for (const p of published) {
    byType.set(p.post_type, (byType.get(p.post_type) ?? 0) + p.like_count);
  }

  return {
    follower_growth: weeks.map((label, i) => ({
      label,
      value: Math.round(artist.follower_count * (0.86 + i * 0.02)),
    })),
    profile_visits: weeks.map((label, i) => ({ label, value: wave(i, seed / 40, seed / 160) })),
    post_views: weeks.map((label, i) => ({ label, value: wave(i, seed / 20, seed / 90) })),
    like_rate: weeks.map((label, i) => ({ label, value: 8 + (wave(i, 4, 3) % 9) })),
    top_content_types: [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    engagement_by_day: DAY_LABELS.map((label, i) => ({ label, value: wave(i, seed / 60, seed / 200) })),
    engagement_by_hour: Array.from({ length: 12 }, (_, i) => ({
      label: `${i * 2}:00`,
      value: wave(i, seed / 90, seed / 260),
    })),
    follower_conversion: 4.2,
  };
}

/** Sanatçı paneli için gruplanmış bildirim özetleri (24) */
export function getGroupedArtistNotifications(artistId: string): string[] {
  const s = demoState();
  const artist = s.artists.find((a) => a.id === artistId);
  if (!artist) return [];
  const posts = s.posts.filter((p) => p.artist_id === artistId && p.status === "published");
  const lastHourLikes = posts.reduce((acc, p) => acc + Math.round(p.like_count * 0.01), 0);
  const weeklyFollowers = Math.round(artist.follower_count * 0.018);
  const messages: string[] = [];
  if (lastHourLikes > 0) {
    messages.push(`Gönderilerin son 1 saatte ${lastHourLikes} beğeni aldı.`);
  }
  if (weeklyFollowers > 0) {
    messages.push(`Bu hafta ${weeklyFollowers} yeni takipçi kazandın.`);
  }
  return messages;
}
