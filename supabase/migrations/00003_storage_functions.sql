-- ============================================================
-- RapLab — Storage kuralları ve sunucu fonksiyonları (RPC)
-- Şartname 21 (Medya), 22.6 (Storage RLS), 12.3 (Başvuru onayı), 14.7 (Bayraklar)
-- ============================================================

-- ---------- Storage bucket'ları ----------

insert into storage.buckets (id, name, public)
values
  ('post-media', 'post-media', true),
  ('avatars', 'avatars', true),
  ('verification-docs', 'verification-docs', false) -- Kural 14: belgeler asla herkese açık olmaz
on conflict (id) do nothing;

-- 22.6: Normal kullanıcı gönderi bucket'ına yükleme yapamaz;
-- sanatçı yalnızca kendi klasörüne yükler
-- (dosya yolu: artists/{artist_id}/posts/{post_id}/{media_id}.{ext})

create policy "post media herkes okur"
on storage.objects for select
using (bucket_id = 'post-media');

create policy "sanatci kendi klasorune yukler"
on storage.objects for insert
with check (
  bucket_id = 'post-media'
  and (string_to_array(name, '/'))[1] = 'artists'
  and member_has_permission(((string_to_array(name, '/'))[2])::uuid, 'manage_media')
);

create policy "sanatci kendi medyasini siler"
on storage.objects for delete
using (
  bucket_id = 'post-media'
  and (string_to_array(name, '/'))[1] = 'artists'
  and member_has_permission(((string_to_array(name, '/'))[2])::uuid, 'delete_posts')
);

create policy "avatar sahibi yukler"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (string_to_array(name, '/'))[1] = auth.uid()::text
);

create policy "avatar herkes okur"
on storage.objects for select
using (bucket_id = 'avatars');

-- Doğrulama belgeleri: yalnızca sahibi yükler, yalnızca moderatör+ okur
-- (süreli bağlantılarla açılır — 12.3)
create policy "belge sahibi yukler"
on storage.objects for insert
with check (
  bucket_id = 'verification-docs'
  and (string_to_array(name, '/'))[1] = auth.uid()::text
);

create policy "belgeleri moderator okur"
on storage.objects for select
using (
  bucket_id = 'verification-docs'
  and (
    (string_to_array(name, '/'))[1] = auth.uid()::text
    or current_role_at_least('moderator')
  )
);

-- ---------- Audit log yazma fonksiyonu ----------

create or replace function write_audit_log(
  p_actor_id uuid,
  p_action varchar,
  p_target_type varchar,
  p_target_id uuid,
  p_previous jsonb,
  p_new jsonb,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  select role into v_role from profiles where id = p_actor_id;
  insert into audit_logs
    (actor_user_id, actor_role, action, target_type, target_id, previous_data, new_data, request_id)
  values
    (p_actor_id, coalesce(v_role, 'user'), p_action, p_target_type, p_target_id, p_previous, p_new, p_request_id);
end $$;

-- ---------- 12.3 Başvuru onayı (tek transaksiyon) ----------

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
  -- Moderatör tek başına onaylayamaz (4.6)
  if v_actor_role not in ('admin', 'super_admin') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select * into v_app from artist_applications where id = p_application_id for update;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_app.status = 'approved' then
    raise exception 'ALREADY_APPROVED' using errcode = 'P0001';
  end if;

  -- 3. Profil slug üretimi (Türkçe karakter dönüşümü)
  v_slug := regexp_replace(
    lower(translate(v_app.stage_name, 'çÇğĞıİöÖşŞüÜ', 'ccggiioossuu')),
    '[^a-z0-9]+', '-', 'g'
  );
  v_slug := trim(both '-' from v_slug);
  if exists (select 1 from artists where slug = v_slug) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  end if;

  -- 1. Sanatçı kaydı oluştur + 4. doğrulama aktif
  insert into artists (stage_name, slug, short_bio, long_bio, verification_status, profile_status, owner_user_id)
  values (v_app.stage_name, v_slug, left(v_app.artist_description, 300), v_app.artist_description,
          'approved', 'active', v_app.user_id)
  returning id into v_artist_id;

  -- 2. Kullanıcıyı sanatçı sahibi olarak bağla + 5. Artist Studio erişimi
  insert into artist_members (artist_id, user_id, member_role, permissions, status, invited_by, accepted_at)
  values (v_artist_id, v_app.user_id, 'owner',
          '["manage_posts","publish_posts","delete_posts","manage_media","manage_profile","view_analytics","manage_team","manage_projects"]'::jsonb,
          'active', p_actor_id, now());

  update profiles set role = 'artist' where id = v_app.user_id and role = 'user';
  update artist_applications set status = 'approved' where id = p_application_id;

  -- 6. Audit log
  perform write_audit_log(
    p_actor_id, 'artist_application.approved', 'artist_application', p_application_id,
    jsonb_build_object('status', v_app.status),
    jsonb_build_object('status', 'approved', 'artist_id', v_artist_id, 'slug', v_slug),
    p_request_id
  );

  -- 7. Kullanıcıya bildirim
  insert into notifications (recipient_user_id, notification_type, artist_id, title, body, action_url)
  values (v_app.user_id, 'artist_application_update', v_artist_id,
          'Sanatçı başvurun onaylandı',
          v_app.stage_name || ' profili artık aktif. Artist Studio erişimin açıldı.',
          '/artist-studio');

  return jsonb_build_object('artistId', v_artist_id, 'slug', v_slug);
end $$;

-- ---------- Gönderi durum değişikliği RPC ----------

create or replace function change_post_status(
  p_post_id uuid,
  p_new_status post_status
) returns posts language plpgsql security definer set search_path = public as $$
declare
  v_post posts%rowtype;
begin
  select * into v_post from posts where id = p_post_id for update;
  if not found then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    member_has_permission(v_post.artist_id, 'manage_posts')
    or current_role_at_least('moderator')
  ) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  update posts set status = p_new_status where id = p_post_id
  returning * into v_post;
  return v_post;
end $$;

-- ---------- 14.7 Özellik bayrağı güncelleme ----------

create or replace function update_feature_flag(
  p_key text,
  p_value boolean,
  p_actor_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_prev jsonb;
  v_next jsonb;
begin
  select role into v_role from profiles where id = p_actor_id;
  if v_role <> 'super_admin' then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select flags into v_prev from system_settings where id = 1 for update;
  v_next := jsonb_set(v_prev, array[p_key], to_jsonb(p_value));
  update system_settings set flags = v_next, updated_at = now() where id = 1;

  -- Özellik değişiklikleri audit log'a yazılır
  perform write_audit_log(
    p_actor_id, 'feature_flag.updated', 'system_settings', null,
    jsonb_build_object(p_key, v_prev -> p_key),
    jsonb_build_object(p_key, p_value),
    gen_random_uuid()
  );
  return v_next;
end $$;

-- ---------- 24. Yeni gönderi bildirimi (yayımlandığında takipçilere) ----------

create or replace function notify_followers_on_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and old.status is distinct from 'published'
     and new.notify_followers and new.visibility <> 'unlisted' then
    insert into notifications (recipient_user_id, notification_type, artist_id, post_id, title, body, action_url)
    select
      f.user_id,
      case new.post_type
        when 'announcement' then 'artist_new_announcement'::notification_type
        when 'countdown' then 'artist_countdown_started'::notification_type
        else 'artist_new_post'::notification_type
      end,
      new.artist_id,
      new.id,
      a.stage_name || ' yeni bir paylaşım yaptı',
      coalesce(new.title, left(coalesce(new.body, ''), 120)),
      '/sanatci/' || a.slug
    from artist_follows f
    join artists a on a.id = new.artist_id
    where f.artist_id = new.artist_id;
  end if;
  return new;
end $$;

create trigger posts_notify_followers after update of status on posts
  for each row execute function notify_followers_on_publish();

-- ---------- 28. Yetim dosya temizliği (zamanlanmış görev için) ----------

create or replace function cleanup_orphan_media()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with orphans as (
    update post_media
    set processing_status = 'deleted'
    where processing_status in ('pending', 'uploading')
      and created_at < now() - interval '24 hours'
    returning id
  )
  select count(*) into v_count from orphans;
  return v_count;
end $$;
