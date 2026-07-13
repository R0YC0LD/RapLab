/**
 * RapLab tip tanımları
 * Şartname Bölüm 15 (Veritabanı Değişkenleri) ve 16 (Enum Değerleri) birebir uygulanmıştır.
 */

/* ---------- 16. ENUM DEĞERLERİ ---------- */

export type UserRole = "user" | "artist" | "moderator" | "admin" | "super_admin";

export type AccountStatus =
  | "active"
  | "pending_verification"
  | "suspended"
  | "banned"
  | "deleted";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "revoked";

export type ArtistProfileStatus = "draft" | "active" | "hidden" | "suspended" | "archived";

export type MediaType = "image" | "video" | "audio";

export type MediaStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "quarantined"
  | "deleted";

/* ---------- 8.1 Gönderi türleri ---------- */

export type PostType =
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "audio_teaser"
  | "announcement"
  | "countdown"
  | "project";

/* ---------- 8.2 Gönderi durumları ---------- */

export type PostStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "scheduled"
  | "published"
  | "hidden"
  | "archived"
  | "deleted"
  | "failed";

/* ---------- 8.3 Gönderi görünürlüğü ---------- */

export type PostVisibility = "public" | "followers" | "unlisted";

/* ---------- 13.4 Yayım modu ---------- */

export type PublishMode = "now" | "schedule" | "draft";

/* ---------- 4.5 / 13.8 Ekip rolleri ve izinler ---------- */

export type ArtistMemberRole =
  | "owner" // Sanatçı sahibi
  | "manager" // Menajer
  | "content_manager" // İçerik yöneticisi
  | "visual_editor" // Görsel editör
  | "analytics_viewer" // Analiz görüntüleyici
  | "label_rep"; // Label temsilcisi

export type MembershipStatus = "invited" | "active" | "revoked" | "expired";

export type TeamPermission =
  | "manage_posts"
  | "publish_posts"
  | "delete_posts"
  | "manage_media"
  | "manage_profile"
  | "view_analytics"
  | "manage_team"
  | "manage_projects";

/* ---------- 12.2 Başvuru durumları ---------- */

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "more_information_required"
  | "approved"
  | "rejected"
  | "withdrawn";

/* ---------- 24. Bildirim türleri ---------- */

export type NotificationType =
  | "artist_new_post"
  | "artist_new_announcement"
  | "artist_countdown_started"
  | "artist_application_update"
  | "artist_team_invite"
  | "moderation_warning"
  | "system_announcement";

/* ---------- 15.9 Rapor ---------- */

export type ReportTargetType = "post" | "artist" | "user" | "media";

export type ReportReason =
  | "spam"
  | "harassment"
  | "impersonation"
  | "copyright"
  | "inappropriate_content"
  | "other";

export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

/* ---------- 15.1 profiles ---------- */

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  role: UserRole;
  account_status: AccountStatus;
  email_verified: boolean;
  locale: string; // default "tr-TR"
  timezone: string; // default "Europe/Istanbul"
  marketing_consent: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ---------- 13.6 Sanatçı tema yapılandırması ---------- */

export interface ArtistThemeConfig {
  accent_color: string;
  secondary_color: string;
  background_mode: "solid" | "gradient" | "texture";
  background_texture: "none" | "grain" | "paper" | "studio_lines";
  hero_overlay_strength: number; // 0–1
  card_style: "sharp" | "soft" | "round";
  heading_style: "display" | "condensed" | "classic";
  motion_intensity: "low" | "medium" | "high";
  logo_mark_optional?: string | null;
}

/* ---------- 15.2 artists ---------- */

export interface Artist {
  id: string;
  stage_name: string;
  slug: string;
  short_bio: string;
  long_bio: string | null;
  city: string | null;
  genres: string[];
  profile_image_path: string;
  desktop_cover_path: string;
  mobile_cover_path: string;
  theme_config: ArtistThemeConfig;
  verification_status: VerificationStatus;
  profile_status: ArtistProfileStatus;
  follower_count: number;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
}

/* ---------- 15.3 artist_members ---------- */

export interface ArtistMember {
  id: string;
  artist_id: string;
  user_id: string;
  member_role: ArtistMemberRole;
  permissions: TeamPermission[];
  status: MembershipStatus;
  invited_by: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ---------- 15.4 posts ---------- */

export interface Post {
  id: string;
  artist_id: string;
  author_user_id: string;
  post_type: PostType;
  title: string | null;
  body: string | null;
  visibility: PostVisibility;
  status: PostStatus;
  is_pinned: boolean;
  like_count: number;
  view_count: number;
  allow_external_share: boolean;
  notify_followers: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** countdown / announcement / project türleri için ek veriler */
  meta?: PostMeta | null;
}

export interface PostMeta {
  /** countdown: sunucu zamanına bağlı sayaç bitiş tarihi */
  countdown_ends_at?: string;
  /** announcement: tarih, yer/bağlantı, durum etiketi */
  event_date?: string;
  event_location?: string;
  event_url?: string;
  status_label?: string;
}

/* ---------- 15.5 post_media ---------- */

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  bucket_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string | null;
  poster_path: string | null;
  waveform_data: number[] | null;
  processing_status: MediaStatus;
  sort_order: number;
  checksum: string;
  created_at: string;
}

/* ---------- 15.6 post_likes ---------- */

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

/* ---------- 15.7 artist_follows ---------- */

export interface ArtistFollow {
  artist_id: string;
  user_id: string;
  created_at: string;
}

/* ---------- 15.8 notifications ---------- */

export interface Notification {
  id: string;
  recipient_user_id: string;
  notification_type: NotificationType;
  artist_id: string | null;
  post_id: string | null;
  title: string;
  body: string;
  action_url: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/* ---------- 15.9 reports ---------- */

export interface Report {
  id: string;
  reporter_user_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

/* ---------- 15.10 audit_logs ---------- */

export interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_role: UserRole;
  action: string;
  target_type: string;
  target_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  request_id: string;
  ip_hash: string | null;
  created_at: string;
}

/* ---------- 12.1 Sanatçı başvurusu ---------- */

export interface ArtistApplication {
  id: string;
  user_id: string;
  stage_name: string;
  legal_name: string;
  contact_email: string;
  phone_optional: string | null;
  artist_description: string;
  official_social_links: string[];
  distribution_links: string[];
  label_name_optional: string | null;
  applicant_relationship: "artist" | "manager" | "label" | "team_member";
  identity_document_path: string | null;
  authorization_document_path: string | null;
  rights_declaration: boolean;
  additional_notes: string | null;
  status: ApplicationStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

/* ---------- 14.7 Özellik bayrakları ---------- */

export interface FeatureFlags {
  artist_applications_enabled: boolean;
  new_registrations_enabled: boolean;
  audio_teasers_enabled: boolean;
  video_uploads_enabled: boolean;
  scheduled_posts_enabled: boolean;
  maintenance_mode: boolean;
  public_follower_counts: boolean;
  public_like_counts: boolean;
  artist_custom_themes: boolean;
}

/* ---------- Birleşik görünüm tipleri ---------- */

export interface PostWithArtist extends Post {
  artist: Pick<
    Artist,
    "id" | "stage_name" | "slug" | "profile_image_path" | "verification_status" | "theme_config"
  >;
  media: PostMedia[];
  liked_by_me: boolean;
}

export interface ArtistWithFollowState extends Artist {
  followed_by_me: boolean;
  has_new_post: boolean; // Son 24 saatte yeni gönderi
  has_active_countdown: boolean;
  is_raplab_special: boolean;
  is_newly_verified: boolean;
}

/* ---------- 23. API cevap zarfı ---------- */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  request_id: string;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    field_errors?: Record<string, string>;
  };
  request_id: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/* ---------- Oturum ---------- */

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}
