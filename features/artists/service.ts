/**
 * Sanatçı servisi — Şartname 6 (Ana Sayfa), 7 (Profil), 10 (Takip), 25 (Arama)
 */

import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import type { Artist, ArtistMember, ArtistWithFollowState } from "@/types";

const DAY_MS = 24 * 3600_000;

function withState(
  artist: Artist,
  opts: {
    followedIds: Set<string>;
    postsByArtist: Map<string, { published_at: string | null; post_type: string; meta?: { countdown_ends_at?: string } | null }[]>;
  }
): ArtistWithFollowState {
  const posts = opts.postsByArtist.get(artist.id) ?? [];
  const now = Date.now();
  const hasNewPost = posts.some(
    (p) => p.published_at && now - new Date(p.published_at).getTime() < DAY_MS
  );
  const hasCountdown = posts.some(
    (p) =>
      p.post_type === "countdown" &&
      p.meta?.countdown_ends_at &&
      new Date(p.meta.countdown_ends_at).getTime() > now
  );
  const newlyVerified = now - new Date(artist.created_at).getTime() < 14 * DAY_MS;
  return {
    ...artist,
    followed_by_me: opts.followedIds.has(artist.id),
    has_new_post: hasNewPost,
    has_active_countdown: hasCountdown,
    is_raplab_special: artist.slug === "golge-06", // editör seçkisi — demo işareti
    is_newly_verified: newlyVerified,
  };
}

async function demoArtistsWithState(userId: string | null): Promise<ArtistWithFollowState[]> {
  const s = demoState();
  const followedIds = new Set(
    s.follows.filter((f) => f.user_id === userId).map((f) => f.artist_id)
  );
  const postsByArtist = new Map<string, typeof s.posts>();
  for (const p of s.posts) {
    if (p.status !== "published") continue;
    const arr = postsByArtist.get(p.artist_id) ?? [];
    arr.push(p);
    postsByArtist.set(p.artist_id, arr);
  }
  return s.artists
    .filter((a) => a.profile_status === "active" && a.verification_status === "approved")
    .map((a) => withState(a, { followedIds, postsByArtist }));
}

export async function listActiveArtists(userId: string | null): Promise<ArtistWithFollowState[]> {
  if (isDemoMode()) return demoArtistsWithState(userId);

  const supabase = await createSupabaseServerClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("*")
    .eq("profile_status", "active")
    .eq("verification_status", "approved")
    .order("follower_count", { ascending: false });

  const { data: follows } = userId
    ? await supabase.from("artist_follows").select("artist_id").eq("user_id", userId)
    : { data: [] as { artist_id: string }[] };

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("artist_id, published_at, post_type, meta")
    .eq("status", "published")
    .gte("published_at", since);

  const followedIds = new Set((follows ?? []).map((f) => f.artist_id));
  const postsByArtist = new Map<string, NonNullable<typeof recentPosts>>();
  for (const p of recentPosts ?? []) {
    const arr = postsByArtist.get(p.artist_id) ?? [];
    arr.push(p);
    postsByArtist.set(p.artist_id, arr);
  }
  return ((artists ?? []) as Artist[]).map((a) =>
    withState(a, { followedIds, postsByArtist })
  );
}

/** RapLine sırası — Control Center'dan yönetilir (14.6). */
export async function listRapLine(userId: string | null): Promise<ArtistWithFollowState[]> {
  const all = await listActiveArtists(userId);
  if (isDemoMode()) {
    const order = demoState().raplineOrder;
    const byId = new Map(all.map((a) => [a.id, a]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean) as ArtistWithFollowState[];
    const rest = all.filter((a) => !order.includes(a.id));
    return [...ordered, ...rest];
  }
  return all;
}

/** Hero sanatçısı — günlük/haftalık öne çıkan (6.2), yönetici belirler (14.6). */
export async function getHeroArtist(userId: string | null): Promise<ArtistWithFollowState | null> {
  const all = await listActiveArtists(userId);
  if (all.length === 0) return null;
  if (isDemoMode()) {
    return all.find((a) => a.id === demoState().heroArtistId) ?? all[0];
  }
  return all[0];
}

export async function getArtistBySlug(
  slug: string,
  userId: string | null
): Promise<ArtistWithFollowState | null> {
  const all = await listActiveArtists(userId);
  return all.find((a) => a.slug === slug) ?? null;
}

/** Kullanıcının aktif ekip üyelikleri (Artist Studio erişimi için). */
export async function listMembershipsForUser(userId: string): Promise<ArtistMember[]> {
  if (isDemoMode()) {
    return demoState().members.filter((m) => m.user_id === userId && m.status === "active");
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("artist_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");
  return (data ?? []) as ArtistMember[];
}

export async function getMembership(
  artistId: string,
  userId: string
): Promise<ArtistMember | null> {
  const memberships = await listMembershipsForUser(userId);
  return memberships.find((m) => m.artist_id === artistId) ?? null;
}

export async function getArtistById(artistId: string): Promise<Artist | null> {
  if (isDemoMode()) {
    return demoState().artists.find((a) => a.id === artistId) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("artists").select("*").eq("id", artistId).single();
  return (data as Artist) ?? null;
}

/* ---------- 25. Arama ---------- */

export interface SearchResults {
  artists: ArtistWithFollowState[];
  posts: { id: string; title: string | null; body: string | null; artist_slug: string; artist_name: string }[];
}

export async function search(query: string, userId: string | null): Promise<SearchResults> {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (q.length < 2) return { artists: [], posts: [] };

  const artists = await listActiveArtists(userId);

  // Sonuç sırası (25): tam eşleşme → başlangıç eşleşmesi → doğrulanmış → benzer → gönderi
  const scored = artists
    .map((a) => {
      const name = a.stage_name.toLocaleLowerCase("tr-TR");
      const slug = a.slug.toLowerCase();
      const city = (a.city ?? "").toLocaleLowerCase("tr-TR");
      const genres = a.genres.join(" ").toLocaleLowerCase("tr-TR");
      let score = 0;
      if (name === q || slug === q) score = 100;
      else if (name.startsWith(q) || slug.startsWith(q)) score = 80;
      else if (name.includes(q) || slug.includes(q)) score = 60;
      else if (city.includes(q) || genres.includes(q)) score = 40;
      if (score > 0 && a.verification_status === "approved") score += 5;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);

  let posts: SearchResults["posts"] = [];
  if (isDemoMode()) {
    const s = demoState();
    const artistById = new Map(s.artists.map((a) => [a.id, a]));
    posts = s.posts
      .filter(
        (p) =>
          p.status === "published" &&
          p.visibility === "public" &&
          ((p.title ?? "").toLocaleLowerCase("tr-TR").includes(q) ||
            (p.body ?? "").toLocaleLowerCase("tr-TR").includes(q))
      )
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        artist_slug: artistById.get(p.artist_id)?.slug ?? "",
        artist_name: artistById.get(p.artist_id)?.stage_name ?? "",
      }));
  } else {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("posts")
      .select("id, title, body, artists!inner(slug, stage_name)")
      .eq("status", "published")
      .eq("visibility", "public")
      .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
      .limit(10);
    posts = (data ?? []).map((p) => {
      const artist = p.artists as unknown as { slug: string; stage_name: string };
      return { id: p.id, title: p.title, body: p.body, artist_slug: artist.slug, artist_name: artist.stage_name };
    });
  }

  return { artists: scored, posts };
}
