-- ============================================================
-- RapLab — RLS Politikaları
-- Şartname 22 (Erişim ve RLS Kuralları), 3 (Değişmez Kurallar)
--
-- Değişmez Kural 20: Sistem güvenliği yalnızca arayüzde buton
-- gizleyerek sağlanmaz; veritabanı seviyesinde uygulanır.
-- ============================================================

alter table profiles enable row level security;
alter table artists enable row level security;
alter table artist_members enable row level security;
alter table posts enable row level security;
alter table post_media enable row level security;
alter table post_likes enable row level security;
alter table artist_follows enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table audit_logs enable row level security;
alter table artist_applications enable row level security;
alter table system_settings enable row level security;

-- ---------- Yardımcı fonksiyonlar ----------

create or replace function current_role_at_least(min_role user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and deleted_at is null
      and account_status = 'active'
      and case min_role
        when 'user' then role in ('user','artist','moderator','admin','super_admin')
        when 'artist' then role in ('artist','moderator','admin','super_admin')
        when 'moderator' then role in ('moderator','admin','super_admin')
        when 'admin' then role in ('admin','super_admin')
        when 'super_admin' then role = 'super_admin'
      end
  );
$$;

create or replace function is_active_member_of(target_artist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from artist_members
    where artist_id = target_artist_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function member_has_permission(target_artist_id uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from artist_members
    where artist_id = target_artist_id
      and user_id = auth.uid()
      and status = 'active'
      and (member_role = 'owner' or permissions ? perm)
  );
$$;

create or replace function is_following(target_artist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from artist_follows
    where artist_id = target_artist_id and user_id = auth.uid()
  );
$$;

-- ---------- 22.1 profiles ----------

-- Kullanıcı kendi profilini okuyabilir; moderatör+ herkesi okuyabilir.
-- Normal kullanıcı BAŞKA kullanıcıların ayrıntılı profilini göremez (4.2).
create policy profiles_select on profiles for select using (
  id = auth.uid() or current_role_at_least('moderator')
);

-- Kullanıcı kendi profilini düzenleyebilir (rol/durum değişimi trigger ile engelli)
create policy profiles_update_own on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Rol değişiklikleri yalnızca service role üzerinden sunucu fonksiyonuyla yapılır.

-- ---------- 22.2 artists ----------

-- Açık sanatçı profilleri HERKES tarafından okunabilir (giriş şartı yok)
create policy artists_select_public on artists for select using (
  (profile_status = 'active' and verification_status = 'approved')
  or is_active_member_of(id)
  or current_role_at_least('moderator')
);

-- Sanatçı sahibi/yetkili ekip üyesi yalnızca kendi profilini düzenler
create policy artists_update_member on artists for update
  using (member_has_permission(id, 'manage_profile') or current_role_at_least('admin'))
  with check (
    member_has_permission(id, 'manage_profile') or current_role_at_least('admin')
  );

-- Doğrulama durumu istemciden DEĞİŞTİRİLEMEZ (Kural 12) — kolon guard trigger'ı
create or replace function prevent_artist_self_verification()
returns trigger language plpgsql as $$
begin
  if (new.verification_status is distinct from old.verification_status
      or new.follower_count is distinct from old.follower_count
      or new.profile_status is distinct from old.profile_status)
     and not current_role_at_least('admin') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger artists_verification_guard before update on artists
  for each row execute function prevent_artist_self_verification();

-- Sanatçı kaydı yalnızca sunucu fonksiyonu (başvuru onayı) ile oluşturulur.

-- ---------- artist_members ----------

create policy artist_members_select on artist_members for select using (
  user_id = auth.uid() or is_active_member_of(artist_id) or current_role_at_least('moderator')
);

create policy artist_members_insert on artist_members for insert with check (
  member_has_permission(artist_id, 'manage_team') or current_role_at_least('admin')
);

create policy artist_members_update on artist_members for update using (
  member_has_permission(artist_id, 'manage_team')
  or user_id = auth.uid() -- davet kabulü
  or current_role_at_least('admin')
);

create policy artist_members_delete on artist_members for delete using (
  member_has_permission(artist_id, 'manage_team') or current_role_at_least('admin')
);

-- ---------- 22.3 posts ----------

-- Ziyaretçi yalnızca published + public görür.
-- Takipçi içeriği yalnızca takip eden görür.
-- Taslakları yalnızca sanatçı ekibi görür.
create policy posts_select on posts for select using (
  (status = 'published' and deleted_at is null and (
    visibility = 'public'
    or visibility = 'unlisted'
    or (visibility = 'followers' and is_following(artist_id))
  ))
  or is_active_member_of(artist_id)
  or current_role_at_least('moderator')
);

-- Kural 1/9/10/11: normal kullanıcı gönderi EKLEYEMEZ; sanatçı yalnızca
-- üyesi olduğu sanatçı ID'sine, doğrulanmış sanatçı profiline ekler.
create policy posts_insert on posts for insert with check (
  author_user_id = auth.uid()
  and member_has_permission(artist_id, 'manage_posts')
  and exists (
    select 1 from artists
    where id = artist_id and verification_status = 'approved'
  )
);

create policy posts_update on posts for update using (
  member_has_permission(artist_id, 'manage_posts') or current_role_at_least('moderator')
);

-- Kalıcı silme yok — soft delete durum makinesiyle yapılır
create policy posts_no_delete on posts for delete using (false);

-- ---------- post_media ----------

create policy post_media_select on post_media for select using (
  exists (
    select 1 from posts p
    where p.id = post_id and (
      (p.status = 'published' and p.deleted_at is null)
      or is_active_member_of(p.artist_id)
      or current_role_at_least('moderator')
    )
  )
);

create policy post_media_insert on post_media for insert with check (
  exists (
    select 1 from posts p
    where p.id = post_id and member_has_permission(p.artist_id, 'manage_media')
  )
);

create policy post_media_update on post_media for update using (
  exists (
    select 1 from posts p
    where p.id = post_id and member_has_permission(p.artist_id, 'manage_media')
  ) or current_role_at_least('moderator')
);

create policy post_media_delete on post_media for delete using (
  exists (
    select 1 from posts p
    where p.id = post_id and member_has_permission(p.artist_id, 'delete_posts')
  ) or current_role_at_least('admin')
);

-- ---------- 22.4 post_likes ----------

create policy post_likes_select on post_likes for select using (
  user_id = auth.uid() or current_role_at_least('moderator')
);

-- Kullanıcı YALNIZCA kendi user_id değeriyle beğeni oluşturabilir
create policy post_likes_insert on post_likes for insert with check (
  user_id = auth.uid() and current_role_at_least('user')
);

-- Kullanıcı yalnızca kendi beğenisini silebilir
create policy post_likes_delete on post_likes for delete using (user_id = auth.uid());

-- Beğeni kaydı GÜNCELLENEMEZ
create policy post_likes_no_update on post_likes for update using (false);

-- ---------- 22.5 artist_follows ----------

create policy artist_follows_select on artist_follows for select using (
  user_id = auth.uid() or current_role_at_least('moderator')
);

create policy artist_follows_insert on artist_follows for insert with check (
  user_id = auth.uid() and current_role_at_least('user')
);

create policy artist_follows_delete on artist_follows for delete using (user_id = auth.uid());

create policy artist_follows_no_update on artist_follows for update using (false);

-- ---------- notifications ----------

create policy notifications_select on notifications for select using (
  recipient_user_id = auth.uid()
);

create policy notifications_update on notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- Bildirimler sunucu fonksiyonlarıyla üretilir (service role).

-- ---------- reports ----------

create policy reports_insert on reports for insert with check (
  reporter_user_id = auth.uid() and current_role_at_least('user')
);

create policy reports_select on reports for select using (
  reporter_user_id = auth.uid() or current_role_at_least('moderator')
);

create policy reports_update on reports for update using (
  current_role_at_least('moderator')
);

-- ---------- audit_logs ----------

-- Görüntüleme: moderatör sınırlı, yönetici+ tam (5. matris)
create policy audit_logs_select on audit_logs for select using (
  current_role_at_least('moderator')
);

-- INSERT yalnızca service role (varsayılan: hiçbir policy INSERT'e izin vermez).
-- UPDATE/DELETE trigger ile kalıcı olarak engelli — hiçbir rol silemez.

-- ---------- artist_applications ----------

-- Başvuru sahibi kendi başvurusunu görür; moderatör+ hepsini görür.
-- Doğrulama belgeleri hiçbir zaman herkese açık OLMAZ (Kural 14).
create policy applications_select on artist_applications for select using (
  user_id = auth.uid() or current_role_at_least('moderator')
);

create policy applications_insert on artist_applications for insert with check (
  user_id = auth.uid() and current_role_at_least('user')
);

-- Başvuru sahibi taslak/ek bilgi aşamasında günceller; onay/ret sunucu fonksiyonuyla
create policy applications_update_own on artist_applications for update using (
  (user_id = auth.uid() and status in ('draft', 'more_information_required'))
  or current_role_at_least('moderator')
);

-- ---------- system_settings ----------

create policy system_settings_select on system_settings for select using (true);

-- Değişiklik yalnızca service role RPC üzerinden (süper yönetici kontrolüyle).
