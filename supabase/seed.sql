-- ============================================================
-- RapLab — Seed verisi (YALNIZCA local/test ortamı — Şartname 33)
-- Production verisi testte kullanılmaz; bu dosya kurgusal veri içerir.
-- ============================================================

-- Kurgusal auth kullanıcıları (supabase local için)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', 'dinleyici@raplab.test', now(),
   '{"username": "dinleyici.06", "display_name": "Deniz"}'::jsonb),
  ('00000000-0000-4000-8000-000000000002', 'rayvold@raplab.test', now(),
   '{"username": "rayvold", "display_name": "Ray Vold"}'::jsonb),
  ('00000000-0000-4000-8000-000000000003', 'moderator@raplab.test', now(),
   '{"username": "gozcu", "display_name": "Gözcü"}'::jsonb),
  ('00000000-0000-4000-8000-000000000004', 'kurucu@raplab.test', now(),
   '{"username": "kurucu", "display_name": "Kurucu"}'::jsonb)
on conflict (id) do nothing;

-- Roller (handle_new_user trigger'ı profilleri oluşturur; rolleri yükseltiyoruz)
update profiles set role = 'artist', email_verified = true
  where id = '00000000-0000-4000-8000-000000000002';
update profiles set role = 'moderator', email_verified = true
  where id = '00000000-0000-4000-8000-000000000003';
update profiles set role = 'super_admin', email_verified = true
  where id = '00000000-0000-4000-8000-000000000004';

-- Kurgusal sanatçı
insert into artists (id, stage_name, slug, short_bio, long_bio, city, genres,
  verification_status, profile_status, owner_user_id, theme_config)
values (
  '10000000-0000-4000-8000-000000000001',
  'Ray Vold', 'rayvold',
  'Gece trafiğinde yazılan şarkılar. İstanbul''un batı yakasından sinyaller.',
  'Ray Vold, 2018''den beri kendi kayıt düzeninde üreten kurgusal bir demo sanatçısıdır.',
  'İstanbul',
  array['alternatif rap', 'boom bap'],
  'approved', 'active',
  '00000000-0000-4000-8000-000000000002',
  '{"accent_color": "#ff4d5a", "secondary_color": "#2b3a67"}'::jsonb
)
on conflict (id) do nothing;

insert into artist_members (artist_id, user_id, member_role, permissions, status, invited_by, accepted_at)
values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'owner',
  '["manage_posts","publish_posts","delete_posts","manage_media","manage_profile","view_analytics","manage_team","manage_projects"]'::jsonb,
  'active',
  '00000000-0000-4000-8000-000000000002',
  now()
)
on conflict (artist_id, user_id) do nothing;

-- Kurgusal gönderiler
insert into posts (id, artist_id, author_user_id, post_type, title, body, visibility, status, is_pinned, published_at)
values
  ('20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002',
   'announcement',
   '『GECE TRAFİĞİ』 — Yeni albüm süreci başladı',
   'Üçüncü stüdyo albümünün kayıtları bitti, miks aşamasındayız.',
   'public', 'published', true, now() - interval '6 days'),
  ('20000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002',
   'text', null,
   'Miks odasından ilk izlenimler: analog masaya dönmek iyi geldi.',
   'public', 'published', false, now() - interval '5 hours'),
  ('20000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002',
   'text', 'Takipçilere özel',
   'Kapalı dinleme etkinliğinin detayları yalnızca burada paylaşılacak.',
   'followers', 'published', false, now() - interval '1 day')
on conflict (id) do nothing;

-- Takip ve beğeni örnekleri
insert into artist_follows (artist_id, user_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into post_likes (post_id, user_id)
values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
