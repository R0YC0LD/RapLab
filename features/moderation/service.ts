/**
 * Moderasyon ve yönetim servisi — Şartname 4.6 (Moderatör), 12 (Doğrulama),
 * 14 (Control Center), 15.9 (Raporlar), 15.10 (Audit log)
 */

import { demoState, writeAudit } from "@/lib/database/demo-store";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { canApproveArtistApplication, canChangeSystemSettings, roleAtLeast } from "@/lib/permissions";
import { slugify } from "@/lib/validation";
import type {
  ArtistApplication,
  AuditLog,
  FeatureFlags,
  Profile,
  Report,
  ReportReason,
  ReportTargetType,
  SessionUser,
} from "@/types";

/* ---------- Raporlama (kullanıcı tarafı) ---------- */

export async function createReport(
  input: {
    target_type: ReportTargetType;
    target_id: string;
    reason: ReportReason;
    description?: string;
  },
  viewer: SessionUser
): Promise<Report> {
  if (isDemoMode()) {
    const s = demoState();
    const report: Report = {
      id: `r-${Date.now()}`,
      reporter_user_id: viewer.id,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description ?? null,
      status: "open",
      assigned_to: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    s.reports.unshift(report);
    return report;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_user_id: viewer.id,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  return data as Report;
}

/* ---------- Rapor yönetimi (moderatör+) ---------- */

export async function listReports(viewer: SessionUser): Promise<Report[]> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    return [...demoState().reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Report[];
}

export async function updateReport(
  reportId: string,
  update: { status: Report["status"]; resolution_note?: string },
  viewer: SessionUser
): Promise<Report> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    const s = demoState();
    const report = s.reports.find((r) => r.id === reportId);
    if (!report) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    const prev = report.status;
    report.status = update.status;
    report.resolution_note = update.resolution_note ?? report.resolution_note;
    report.assigned_to = viewer.id;
    if (update.status === "resolved" || update.status === "dismissed") {
      report.resolved_at = new Date().toISOString();
    }
    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "report.updated",
      target_type: "report",
      target_id: reportId,
      previous_data: { status: prev },
      new_data: { status: update.status },
      request_id: newRequestId(),
    });
    return report;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .update({
      status: update.status,
      resolution_note: update.resolution_note,
      assigned_to: viewer.id,
      resolved_at:
        update.status === "resolved" || update.status === "dismissed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", reportId)
    .select()
    .single();
  if (error) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  return data as Report;
}

/* ---------- 12. Sanatçı başvuruları ---------- */

export async function listApplications(viewer: SessionUser): Promise<ArtistApplication[]> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    return [...demoState().applications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("artist_applications")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ArtistApplication[];
}

/** 12.3 Onaylama: sanatçı kaydı + sahip bağlama + slug + doğrulama + audit + bildirim */
export async function approveApplication(
  applicationId: string,
  viewer: SessionUser
): Promise<{ artistId: string; slug: string }> {
  // Moderatör tek başına onaylayamaz (4.6)
  if (!canApproveArtistApplication(viewer.profile.role)) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  const requestId = newRequestId();

  if (isDemoMode()) {
    const s = demoState();
    const app = s.applications.find((a) => a.id === applicationId);
    if (!app) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    if (app.status === "approved") throw new ApiError(ErrorCodes.VALIDATION_FAILED);

    let slug = slugify(app.stage_name);
    if (s.artists.some((a) => a.slug === slug)) slug = `${slug}-${Date.now() % 1000}`;

    const nowIso = new Date().toISOString();
    const artistId = `a-${Date.now()}`;
    s.artists.push({
      id: artistId,
      stage_name: app.stage_name,
      slug,
      short_bio: app.artist_description.slice(0, 300),
      long_bio: app.artist_description,
      city: null,
      genres: [],
      profile_image_path: "/demo/avatars/user.svg",
      desktop_cover_path: "/demo/artists/default-cover.svg",
      mobile_cover_path: "/demo/artists/default-cover.svg",
      theme_config: {
        accent_color: "#ff5f68",
        secondary_color: "#2b3a67",
        background_mode: "gradient",
        background_texture: "grain",
        hero_overlay_strength: 0.55,
        card_style: "soft",
        heading_style: "display",
        motion_intensity: "medium",
      },
      verification_status: "approved",
      profile_status: "active",
      follower_count: 0,
      owner_user_id: app.user_id,
      created_at: nowIso,
      updated_at: nowIso,
      suspended_at: null,
    });
    s.members.push({
      id: `m-${artistId}`,
      artist_id: artistId,
      user_id: app.user_id,
      member_role: "owner",
      permissions: [
        "manage_posts", "publish_posts", "delete_posts", "manage_media",
        "manage_profile", "view_analytics", "manage_team", "manage_projects",
      ],
      status: "active",
      invited_by: viewer.id,
      accepted_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
    app.status = "approved";
    app.updated_at = nowIso;

    const owner = s.profiles.find((p) => p.id === app.user_id);
    if (owner && owner.role === "user") owner.role = "artist";

    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "artist_application.approved",
      target_type: "artist_application",
      target_id: applicationId,
      previous_data: { status: "under_review" },
      new_data: { status: "approved", artist_id: artistId, slug },
      request_id: requestId,
    });
    s.notifications.unshift({
      id: `n-${Date.now()}`,
      recipient_user_id: app.user_id,
      notification_type: "artist_application_update",
      artist_id: artistId,
      post_id: null,
      title: "Sanatçı başvurun onaylandı",
      body: `${app.stage_name} profili artık aktif. Artist Studio erişimin açıldı.`,
      action_url: "/artist-studio",
      is_read: false,
      read_at: null,
      created_at: nowIso,
    });
    return { artistId, slug };
  }

  // Supabase modunda onay tek transaksiyonluk RPC ile yapılır (audit + bildirim dahil)
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("approve_artist_application", {
    p_application_id: applicationId,
    p_actor_id: viewer.id,
    p_request_id: requestId,
  });
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  return data as { artistId: string; slug: string };
}

export async function rejectApplication(
  applicationId: string,
  note: string,
  viewer: SessionUser
): Promise<void> {
  if (!canApproveArtistApplication(viewer.profile.role)) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    const s = demoState();
    const app = s.applications.find((a) => a.id === applicationId);
    if (!app) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    app.status = "rejected";
    app.review_note = note;
    app.updated_at = new Date().toISOString();
    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "artist_application.rejected",
      target_type: "artist_application",
      target_id: applicationId,
      new_data: { status: "rejected" },
      request_id: newRequestId(),
    });
    return;
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("artist_applications")
    .update({ status: "rejected", review_note: note })
    .eq("id", applicationId);
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
}

/* ---------- 14.2 Sistem özeti ---------- */

export interface SystemSummary {
  total_users: number;
  daily_active_users: number;
  monthly_active_users: number;
  total_artists: number;
  active_artists: number;
  pending_applications: number;
  posts_last_24h: number;
  likes_last_24h: number;
  total_storage_mb: number;
  failed_uploads: number;
  open_reports: number;
  error_rate: number;
}

export async function getSystemSummary(viewer: SessionUser): Promise<SystemSummary> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  const dayAgo = Date.now() - 24 * 3600_000;

  if (isDemoMode()) {
    const s = demoState();
    return {
      total_users: s.profiles.filter((p) => !p.deleted_at).length,
      daily_active_users: s.profiles.filter(
        (p) => p.last_seen_at && new Date(p.last_seen_at).getTime() > dayAgo
      ).length,
      monthly_active_users: s.profiles.filter(
        (p) => p.last_seen_at && new Date(p.last_seen_at).getTime() > Date.now() - 30 * 24 * 3600_000
      ).length,
      total_artists: s.artists.length,
      active_artists: s.artists.filter((a) => a.profile_status === "active").length,
      pending_applications: s.applications.filter((a) =>
        ["submitted", "under_review", "more_information_required"].includes(a.status)
      ).length,
      posts_last_24h: s.posts.filter(
        (p) => p.published_at && new Date(p.published_at).getTime() > dayAgo
      ).length,
      likes_last_24h: s.likes.filter((l) => new Date(l.created_at).getTime() > dayAgo).length,
      total_storage_mb: Math.round(
        s.media.reduce((acc, m) => acc + m.file_size_bytes, 0) / 1_000_000
      ),
      failed_uploads: s.media.filter((m) => m.processing_status === "failed").length,
      open_reports: s.reports.filter((r) => r.status === "open").length,
      error_rate: 0.2,
    };
  }

  const supabase = await createSupabaseServerClient();
  const resolveCount = async (q: PromiseLike<{ count: number | null }>) =>
    (await q).count ?? 0;
  const head = { count: "exact" as const, head: true };
  const dayIso = new Date(dayAgo).toISOString();
  const monthIso = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  return {
    total_users: await resolveCount(supabase.from("profiles").select("*", head)),
    daily_active_users: await resolveCount(
      supabase.from("profiles").select("*", head).gte("last_seen_at", dayIso)
    ),
    monthly_active_users: await resolveCount(
      supabase.from("profiles").select("*", head).gte("last_seen_at", monthIso)
    ),
    total_artists: await resolveCount(supabase.from("artists").select("*", head)),
    active_artists: await resolveCount(
      supabase.from("artists").select("*", head).eq("profile_status", "active")
    ),
    pending_applications: await resolveCount(
      supabase
        .from("artist_applications")
        .select("*", head)
        .in("status", ["submitted", "under_review", "more_information_required"])
    ),
    posts_last_24h: await resolveCount(
      supabase.from("posts").select("*", head).gte("published_at", dayIso)
    ),
    likes_last_24h: await resolveCount(
      supabase.from("post_likes").select("*", head).gte("created_at", dayIso)
    ),
    total_storage_mb: 0,
    failed_uploads: await resolveCount(
      supabase.from("post_media").select("*", head).eq("processing_status", "failed")
    ),
    open_reports: await resolveCount(
      supabase.from("reports").select("*", head).eq("status", "open")
    ),
    error_rate: 0,
  };
}

/* ---------- Kullanıcı listesi (14.4) ---------- */

export async function listUsers(viewer: SessionUser): Promise<Profile[]> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    // Parola veya hassas kimlik bilgisi zaten modelde yok (14.4)
    return demoState().profiles.filter((p) => !p.deleted_at);
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").is("deleted_at", null).limit(100);
  return (data ?? []) as Profile[];
}

/* ---------- Audit log (salt okunur — silinemez) ---------- */

export async function listAuditLogs(viewer: SessionUser): Promise<AuditLog[]> {
  if (!roleAtLeast(viewer.profile.role, "moderator")) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) return demoState().auditLogs;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AuditLog[];
}

/* ---------- 14.7 Özellik bayrakları ---------- */

export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (isDemoMode()) return demoState().featureFlags;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("system_settings").select("flags").eq("id", 1).single();
  return (data?.flags ?? {}) as FeatureFlags;
}

export async function updateFeatureFlag(
  key: keyof FeatureFlags,
  value: boolean,
  viewer: SessionUser
): Promise<FeatureFlags> {
  if (!canChangeSystemSettings(viewer.profile.role)) {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (isDemoMode()) {
    const s = demoState();
    const prev = s.featureFlags[key];
    s.featureFlags[key] = value;
    // Özellik değişiklikleri audit log'a yazılır (14.7)
    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "feature_flag.updated",
      target_type: "system_settings",
      previous_data: { [key]: prev },
      new_data: { [key]: value },
      request_id: newRequestId(),
    });
    return s.featureFlags;
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("update_feature_flag", {
    p_key: key,
    p_value: value,
    p_actor_id: viewer.id,
  });
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  return data as FeatureFlags;
}
