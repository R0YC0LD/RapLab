-- ============================================================
-- RapLab — Temel şema
-- Şartname 15 (Veritabanı), 16 (Enumlar), 22 (RLS), 3 (Değişmez Kurallar)
-- Güvenlik arayüzde buton gizleyerek DEĞİL, veritabanı seviyesinde sağlanır.
-- ============================================================

-- ---------- 16. ENUM DEĞERLERİ ----------

create type user_role as enum ('user', 'artist', 'moderator', 'admin', 'super_admin');

create type account_status as enum
  ('active', 'pending_verification', 'suspended', 'banned', 'deleted');

create type verification_status as enum
  ('unverified', 'pending', 'under_review', 'approved', 'rejected', 'revoked');

create type artist_profile_status as enum
  ('draft', 'active', 'hidden', 'suspended', 'archived');

create type media_type as enum ('image', 'video', 'audio');

create type media_status as enum
  ('pending', 'uploading', 'processing', 'ready', 'failed', 'quarantined', 'deleted');

-- 8.1 Gönderi türleri
create type post_type as enum
  ('text', 'image', 'gallery', 'video', 'audio_teaser', 'announcement', 'countdown', 'project');

-- 8.2 Gönderi durumları
create type post_status as enum
  ('draft', 'uploading', 'processing', 'scheduled', 'published', 'hidden', 'archived', 'deleted', 'failed');

-- 8.3 Gönderi görünürlüğü
create type post_visibility as enum ('public', 'followers', 'unlisted');

-- 4.5 Ekip rolleri
create type artist_member_role as enum
  ('owner', 'manager', 'content_manager', 'visual_editor', 'analytics_viewer', 'label_rep');

create type membership_status as enum ('invited', 'active', 'revoked', 'expired');

-- 12.2 Başvuru durumları
create type application_status as enum
  ('draft', 'submitted', 'under_review', 'more_information_required', 'approved', 'rejected', 'withdrawn');

-- 24. Bildirim türleri
create type notification_type as enum
  ('artist_new_post', 'artist_new_announcement', 'artist_countdown_started',
   'artist_application_update', 'artist_team_invite', 'moderation_warning', 'system_announcement');

create type report_target_type as enum ('post', 'artist', 'user', 'media');
create type report_reason as enum
  ('spam', 'harassment', 'impersonation', 'copyright', 'inappropriate_content', 'other');
create type report_status as enum ('open', 'in_review', 'resolved', 'dismissed');

-- ---------- 15.1 profiles ----------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username varchar(24) unique not null,
  display_name varchar(60) not null,
  avatar_path text,
  role user_role not null default 'user',
  account_status account_status not null default 'active',
  email_verified boolean not null default false,
  locale varchar(10) not null default 'tr-TR',
  timezone varchar(50) not null default 'Europe/Istanbul',
  marketing_consent boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 11.2: 3–24 karakter; küçük harf, sayı, nokta, alt çizgi
  constraint username_format check (username ~ '^[a-z0-9._]{3,24}$')
);

-- ---------- 15.2 artists ----------

create table artists (
  id uuid primary key default gen_random_uuid(),
  stage_name varchar(80) not null,
  slug varchar(100) unique not null,
  short_bio varchar(300) not null default '',
  long_bio text,
  city varchar(80),
  genres text[] not null default '{}',
  profile_image_path text not null default '',
  desktop_cover_path text not null default '',
  mobile_cover_path text not null default '',
  theme_config jsonb not null default '{}'::jsonb,
  verification_status verification_status not null default 'unverified',
  profile_status artist_profile_status not null default 'draft',
  follower_count bigint not null default 0,
  owner_user_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz
);

create index artists_slug_idx on artists (slug);
create index artists_status_idx on artists (profile_status, verification_status);

-- ---------- 15.3 artist_members ----------

create table artist_members (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  member_role artist_member_role not null,
  permissions jsonb not null default '[]'::jsonb,
  status membership_status not null default 'invited',
  invited_by uuid not null references profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Benzersiz alan: artist_id + user_id
  constraint artist_members_unique unique (artist_id, user_id)
);

create index artist_members_user_idx on artist_members (user_id) where status = 'active';

-- ---------- 15.4 posts ----------

create table posts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  author_user_id uuid not null references profiles (id),
  post_type post_type not null,
  title varchar(160),
  body varchar(800),
  visibility post_visibility not null default 'public',
  status post_status not null default 'draft',
  is_pinned boolean not null default false,
  like_count bigint not null default 0,
  view_count bigint not null default 0,
  allow_external_share boolean not null default true,
  notify_followers boolean not null default true,
  scheduled_at timestamptz,
  published_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  meta jsonb
);

-- 28: cursor pagination için published_at + id sıralaması
create index posts_feed_idx on posts (status, visibility, published_at desc, id desc);
create index posts_artist_idx on posts (artist_id, status, is_pinned desc, published_at desc);

-- ---------- 15.5 post_media ----------

create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  media_type media_type not null,
  bucket_name text not null,
  storage_path text not null,
  mime_type varchar(100) not null,
  file_size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds numeric,
  alt_text varchar(300),
  poster_path text,
  waveform_data jsonb,
  processing_status media_status not null default 'pending',
  sort_order smallint not null default 0,
  checksum text not null default '',
  created_at timestamptz not null default now(),
  -- 21.2/21.3: video ≤ 90 sn, ses ≤ 60 sn
  constraint video_duration_limit check (
    media_type <> 'video' or duration_seconds is null or duration_seconds <= 90
  ),
  constraint audio_duration_limit check (
    media_type <> 'audio' or duration_seconds is null or duration_seconds <= 60
  )
);

create index post_media_post_idx on post_media (post_id, sort_order);
create index post_media_orphan_idx on post_media (processing_status, created_at); -- yetim dosya temizliği (28)

-- ---------- 15.6 post_likes ----------
-- Birleşik primary key: bir kullanıcı bir gönderiyi EN FAZLA BİR KEZ beğenir (Kural 8)

create table post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on post_likes (user_id);

-- ---------- 15.7 artist_follows ----------

create table artist_follows (
  artist_id uuid not null references artists (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

create index artist_follows_user_idx on artist_follows (user_id);

-- ---------- 15.8 notifications ----------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references profiles (id) on delete cascade,
  notification_type notification_type not null,
  artist_id uuid references artists (id) on delete set null,
  post_id uuid references posts (id) on delete set null,
  title varchar(160) not null,
  body varchar(300) not null,
  action_url text not null default '',
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_user_id, is_read, created_at desc);

-- ---------- 15.9 reports ----------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references profiles (id),
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  description varchar(1000),
  status report_status not null default 'open',
  assigned_to uuid references profiles (id),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_status_idx on reports (status, created_at desc);

-- ---------- 15.10 audit_logs ----------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_role user_role not null,
  action varchar(120) not null,
  target_type varchar(80) not null,
  target_id uuid,
  previous_data jsonb,
  new_data jsonb,
  request_id uuid not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------- 12.1 artist_applications ----------

create table artist_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  stage_name varchar(80) not null,
  legal_name varchar(160) not null,
  contact_email varchar(255) not null,
  phone_optional varchar(40),
  artist_description text not null,
  official_social_links text[] not null default '{}',
  distribution_links text[] not null default '{}',
  label_name_optional varchar(120),
  applicant_relationship varchar(40) not null default 'artist',
  identity_document_path text,
  authorization_document_path text,
  rights_declaration boolean not null default false,
  additional_notes text,
  status application_status not null default 'draft',
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artist_applications_status_idx on artist_applications (status, created_at desc);

-- ---------- 14.7 system_settings (özellik bayrakları) ----------

create table system_settings (
  id smallint primary key default 1 check (id = 1),
  flags jsonb not null default '{
    "artist_applications_enabled": true,
    "new_registrations_enabled": true,
    "audio_teasers_enabled": true,
    "video_uploads_enabled": true,
    "scheduled_posts_enabled": true,
    "maintenance_mode": false,
    "public_follower_counts": true,
    "public_like_counts": true,
    "artist_custom_themes": true
  }'::jsonb,
  updated_at timestamptz not null default now()
);

insert into system_settings (id) values (1);

-- ============================================================
-- TRIGGER'LAR
-- ============================================================

-- updated_at otomasyonu
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger artists_updated_at before update on artists
  for each row execute function set_updated_at();
create trigger posts_updated_at before update on posts
  for each row execute function set_updated_at();
create trigger artist_members_updated_at before update on artist_members
  for each row execute function set_updated_at();
create trigger artist_applications_updated_at before update on artist_applications
  for each row execute function set_updated_at();

-- 9.1 / 28: Beğeni sayısı İSTEMCİDEN ASLA gelmez — trigger ile korunur
create or replace function bump_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

create trigger post_likes_count after insert or delete on post_likes
  for each row execute function bump_like_count();

-- 10.1: Takipçi sayısı istemciden değiştirilemez
create or replace function bump_follower_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update artists set follower_count = follower_count + 1 where id = new.artist_id;
    return new;
  elsif tg_op = 'DELETE' then
    update artists set follower_count = greatest(0, follower_count - 1) where id = old.artist_id;
    return old;
  end if;
  return null;
end $$;

create trigger artist_follows_count after insert or delete on artist_follows
  for each row execute function bump_follower_count();

-- 9.1: Silinmiş/gizlenmiş gönderi beğenilemez
create or replace function check_post_likeable()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from posts where id = new.post_id and status = 'published') then
    raise exception 'POST_NOT_PUBLISHED' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger post_likes_check before insert on post_likes
  for each row execute function check_post_likeable();

-- 10.1: Askıya alınmış sanatçı takip edilemez
create or replace function check_artist_followable()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from artists
    where id = new.artist_id and profile_status = 'active' and suspended_at is null
  ) then
    raise exception 'ARTIST_NOT_FOLLOWABLE' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger artist_follows_check before insert on artist_follows
  for each row execute function check_artist_followable();

-- 8.2: Gönderi durum makinesi — geçersiz geçişler veritabanında engellenir
create or replace function enforce_post_status_machine()
returns trigger language plpgsql as $$
declare
  allowed boolean := false;
begin
  if old.status = new.status then
    return new;
  end if;
  allowed := case old.status
    when 'draft' then new.status in ('uploading')
    when 'uploading' then new.status in ('processing')
    when 'processing' then new.status in ('scheduled', 'published', 'failed')
    when 'scheduled' then new.status in ('published')
    when 'published' then new.status in ('hidden', 'archived', 'deleted')
    when 'hidden' then new.status in ('published')
    when 'archived' then new.status in ('published')
    else false
  end;
  if not allowed then
    raise exception 'INVALID_POST_TRANSITION: % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;
  if new.status = 'deleted' then
    new.deleted_at = now(); -- soft delete (8.2)
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

create trigger posts_status_machine before update of status on posts
  for each row execute function enforce_post_status_machine();

-- Kural 12 / 22.1: Kullanıcı kendi rolünü ve hesap durumunu değiştiremez
create or replace function prevent_privilege_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status then
    if not exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    ) then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_privilege_guard before update on profiles
  for each row execute function prevent_privilege_escalation();

-- 4.8: Son süper yönetici silinemez veya yetkisi kaldırılamaz
create or replace function protect_last_super_admin()
returns trigger language plpgsql as $$
declare
  remaining integer;
begin
  if tg_op = 'UPDATE' and old.role = 'super_admin' and new.role <> 'super_admin' then
    select count(*) into remaining from profiles
      where role = 'super_admin' and deleted_at is null and id <> old.id;
    if remaining = 0 then
      raise exception 'LAST_SUPER_ADMIN_PROTECTED' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'DELETE' and old.role = 'super_admin' then
    select count(*) into remaining from profiles
      where role = 'super_admin' and deleted_at is null and id <> old.id;
    if remaining = 0 then
      raise exception 'LAST_SUPER_ADMIN_PROTECTED' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger profiles_super_admin_guard before update or delete on profiles
  for each row execute function protect_last_super_admin();

-- 15.10: Audit kayıtları normal panelden silinemez ve değiştirilemez
create or replace function prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE' using errcode = 'P0001';
end $$;

create trigger audit_logs_immutable before update or delete on audit_logs
  for each row execute function prevent_audit_mutation();

-- Yeni auth kullanıcısı için profil oluşturma (11.3 ilk giriş akışı)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'uye_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Yeni Üye'),
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
