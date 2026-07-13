-- ============================================================
-- RapLab - onay akisi saglamlastirma + Sanatsal fan galerisi
-- ============================================================

-- Service Role ile calisan, kendi icinde yonetici kontrolu yapan RPC'lerin
-- profil rolunu guvenle degistirebilmesine izin ver. Normal kullanici kendi
-- rolunu veya hesap durumunu yine degistiremez.
create or replace function prevent_privilege_escalation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status then
    if coalesce(auth.role(), '') <> 'service_role'
       and not exists (
         select 1 from profiles
         where id = auth.uid() and role in ('admin', 'super_admin')
       ) then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

alter table artist_applications
  add column if not exists approved_artist_id uuid references artists (id) on delete set null;

-- Sanatci onayi tek transaksiyon ve tekrar denenebilir. Ilk istek basarili
-- olduysa sonraki istek yeni bir sanatci acmak yerine mevcut sonucu dondurur.
create or replace function approve_artist_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_app artist_applications%rowtype;
  v_artist_id uuid;
  v_slug text;
  v_actor_role user_role;
begin
  select role into v_actor_role from profiles where id = p_actor_id;
  if v_actor_role not in ('admin', 'super_admin') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select * into v_app
  from artist_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_app.status = 'approved' then
    v_artist_id := v_app.approved_artist_id;
    if v_artist_id is null then
      select id into v_artist_id
      from artists
      where owner_user_id = v_app.user_id and stage_name = v_app.stage_name
      order by created_at asc
      limit 1;
    end if;
    if v_artist_id is null then
      raise exception 'APPROVED_ARTIST_NOT_FOUND' using errcode = 'P0001';
    end if;
    select slug into v_slug from artists where id = v_artist_id;
    update artist_applications
      set approved_artist_id = v_artist_id
      where id = p_application_id and approved_artist_id is null;
    return jsonb_build_object('artistId', v_artist_id, 'slug', v_slug, 'alreadyApproved', true);
  end if;

  if v_app.status not in ('submitted', 'under_review', 'more_information_required') then
    raise exception 'INVALID_APPLICATION_STATUS' using errcode = 'P0001';
  end if;

  v_slug := regexp_replace(
    lower(translate(v_app.stage_name, 'çÇğĞıİöÖşŞüÜ', 'ccggiioossuu')),
    '[^a-z0-9]+', '-', 'g'
  );
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'sanatci';
  end if;
  while exists (select 1 from artists where slug = v_slug) loop
    v_slug := left(v_slug, 91) || '-' || substr(gen_random_uuid()::text, 1, 8);
  end loop;

  insert into artists (
    stage_name, slug, short_bio, long_bio,
    verification_status, profile_status, owner_user_id
  ) values (
    v_app.stage_name,
    v_slug,
    left(v_app.artist_description, 300),
    v_app.artist_description,
    'approved',
    'active',
    v_app.user_id
  ) returning id into v_artist_id;

  insert into artist_members (
    artist_id, user_id, member_role, permissions,
    status, invited_by, accepted_at
  ) values (
    v_artist_id,
    v_app.user_id,
    'owner',
    '["manage_posts","publish_posts","delete_posts","manage_media","manage_profile","view_analytics","manage_team","manage_projects"]'::jsonb,
    'active',
    p_actor_id,
    now()
  ) on conflict (artist_id, user_id) do update set
    member_role = 'owner',
    status = 'active',
    accepted_at = coalesce(artist_members.accepted_at, now());

  update profiles set role = 'artist'
  where id = v_app.user_id and role = 'user';

  update artist_applications
  set status = 'approved', approved_artist_id = v_artist_id
  where id = p_application_id;

  perform write_audit_log(
    p_actor_id,
    'artist_application.approved',
    'artist_application',
    p_application_id,
    jsonb_build_object('status', v_app.status),
    jsonb_build_object('status', 'approved', 'artist_id', v_artist_id, 'slug', v_slug),
    p_request_id
  );

  insert into notifications (
    recipient_user_id, notification_type, artist_id, title, body, action_url
  ) values (
    v_app.user_id,
    'artist_application_update',
    v_artist_id,
    'Sanatci basvurun onaylandi',
    v_app.stage_name || ' profili artik aktif. Artist Studio erisimin acildi.',
    '/artist-studio'
  );

  return jsonb_build_object('artistId', v_artist_id, 'slug', v_slug, 'alreadyApproved', false);
end $$;

revoke all on function approve_artist_application(uuid, uuid, uuid) from public;
revoke all on function approve_artist_application(uuid, uuid, uuid) from anon;
revoke all on function approve_artist_application(uuid, uuid, uuid) from authenticated;
grant execute on function approve_artist_application(uuid, uuid, uuid) to service_role;

-- ---------- Sanatsal ----------

do $$ begin
  create type fan_verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

alter type notification_type add value if not exists 'fan_verification_update';
alter type notification_type add value if not exists 'fan_art_related';

create table if not exists fan_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  related_artist_id uuid not null references artists (id) on delete restrict,
  sample_art_path text not null,
  voice_declaration_path text not null,
  art_created_on date not null,
  ownership_declaration boolean not null default false,
  status fan_verification_status not null default 'pending',
  review_note varchar(1000),
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fan_ownership_required check (ownership_declaration = true),
  constraint fan_art_date_not_future check (art_created_on <= current_date)
);

create index if not exists fan_verifications_status_idx
  on fan_verifications (status, created_at desc);

create table if not exists fan_art_posts (
  id uuid primary key default gen_random_uuid(),
  fan_user_id uuid not null references profiles (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete restrict,
  image_path text not null,
  caption varchar(600),
  hashtags text[] not null default '{}',
  like_count bigint not null default 0,
  status varchar(20) not null default 'published'
    check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint fan_art_hashtags_limit check (cardinality(hashtags) <= 10),
  constraint fan_art_like_count_nonnegative check (like_count >= 0)
);

create index if not exists fan_art_feed_idx
  on fan_art_posts (status, created_at desc, id desc);
create index if not exists fan_art_artist_idx
  on fan_art_posts (artist_id, status, created_at desc);
create index if not exists fan_art_user_idx
  on fan_art_posts (fan_user_id, created_at desc);

create table if not exists fan_art_likes (
  post_id uuid not null references fan_art_posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists fan_art_likes_user_idx on fan_art_likes (user_id);

drop trigger if exists fan_verifications_updated_at on fan_verifications;
create trigger fan_verifications_updated_at before update on fan_verifications
  for each row execute function set_updated_at();
drop trigger if exists fan_art_posts_updated_at on fan_art_posts;
create trigger fan_art_posts_updated_at before update on fan_art_posts
  for each row execute function set_updated_at();

create or replace function bump_fan_art_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update fan_art_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  end if;
  update fan_art_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  return old;
end $$;

drop trigger if exists fan_art_likes_count on fan_art_likes;
create trigger fan_art_likes_count after insert or delete on fan_art_likes
  for each row execute function bump_fan_art_like_count();

create or replace function check_fan_art_likeable()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from fan_art_posts where id = new.post_id and status = 'published'
  ) then
    raise exception 'POST_NOT_PUBLISHED' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists fan_art_likes_check on fan_art_likes;
create trigger fan_art_likes_check before insert on fan_art_likes
  for each row execute function check_fan_art_likeable();

alter table fan_verifications enable row level security;
alter table fan_art_posts enable row level security;
alter table fan_art_likes enable row level security;

create policy fan_verifications_select on fan_verifications for select using (
  user_id = auth.uid() or current_role_at_least('moderator')
);
create policy fan_verifications_insert on fan_verifications for insert with check (
  user_id = auth.uid()
  and ownership_declaration = true
  and exists (select 1 from profiles where id = auth.uid() and email_verified = true)
);
create policy fan_verifications_update_rejected on fan_verifications for update
  using (user_id = auth.uid() and status = 'rejected')
  with check (user_id = auth.uid() and status = 'pending' and ownership_declaration = true);

create policy fan_art_posts_select on fan_art_posts for select using (
  status = 'published'
  or fan_user_id = auth.uid()
  or is_active_member_of(artist_id)
  or current_role_at_least('moderator')
);
create policy fan_art_posts_insert on fan_art_posts for insert with check (
  fan_user_id = auth.uid()
  and exists (
    select 1 from fan_verifications
    where user_id = auth.uid() and status = 'approved'
  )
);
create policy fan_art_posts_update_own on fan_art_posts for update
  using (fan_user_id = auth.uid() or current_role_at_least('moderator'))
  with check (fan_user_id = auth.uid() or current_role_at_least('moderator'));

create policy fan_art_likes_select on fan_art_likes for select using (
  user_id = auth.uid() or current_role_at_least('moderator')
);
create policy fan_art_likes_insert on fan_art_likes for insert with check (
  user_id = auth.uid() and current_role_at_least('user')
);
create policy fan_art_likes_delete on fan_art_likes for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fan-art',
  'fan-art',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "fan art herkes okur"
on storage.objects for select using (bucket_id = 'fan-art');

create policy "onayli fan kendi klasorune yukler"
on storage.objects for insert with check (
  bucket_id = 'fan-art'
  and (string_to_array(name, '/'))[1] = auth.uid()::text
  and exists (
    select 1 from fan_verifications
    where user_id = auth.uid() and status = 'approved'
  )
);

create policy "fan kendi gorselini siler"
on storage.objects for delete using (
  bucket_id = 'fan-art'
  and (string_to_array(name, '/'))[1] = auth.uid()::text
);

create or replace function review_fan_verification(
  p_verification_id uuid,
  p_actor_id uuid,
  p_status fan_verification_status,
  p_note text,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row fan_verifications%rowtype;
  v_actor_role user_role;
begin
  select role into v_actor_role from profiles where id = p_actor_id;
  if v_actor_role not in ('admin', 'super_admin') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'INVALID_REVIEW_STATUS' using errcode = 'P0001';
  end if;

  select * into v_row from fan_verifications where id = p_verification_id for update;
  if not found then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  update fan_verifications set
    status = p_status,
    review_note = nullif(trim(p_note), ''),
    reviewed_by = p_actor_id,
    reviewed_at = now()
  where id = p_verification_id;

  perform write_audit_log(
    p_actor_id,
    'fan_verification.' || p_status::text,
    'fan_verification',
    p_verification_id,
    jsonb_build_object('status', v_row.status),
    jsonb_build_object('status', p_status, 'review_note', nullif(trim(p_note), '')),
    p_request_id
  );

  insert into notifications (
    recipient_user_id, notification_type, artist_id, title, body, action_url
  ) values (
    v_row.user_id,
    'fan_verification_update',
    v_row.related_artist_id,
    case when p_status = 'approved' then 'Fan dogrulaman onaylandi' else 'Fan dogrulaman icin duzeltme gerekiyor' end,
    case when p_status = 'approved'
      then 'Artik Sanatsal alaninda kendi cizimlerini paylasabilirsin.'
      else coalesce(nullif(trim(p_note), ''), 'Basvurun onaylanmadi. Ayrintilari Sanatsal sayfasindan gorebilirsin.')
    end,
    '/sanatsal/fan-ol'
  );

  return jsonb_build_object('id', p_verification_id, 'status', p_status);
end $$;

revoke all on function review_fan_verification(uuid, uuid, fan_verification_status, text, uuid) from public;
revoke all on function review_fan_verification(uuid, uuid, fan_verification_status, text, uuid) from anon;
revoke all on function review_fan_verification(uuid, uuid, fan_verification_status, text, uuid) from authenticated;
grant execute on function review_fan_verification(uuid, uuid, fan_verification_status, text, uuid) to service_role;
