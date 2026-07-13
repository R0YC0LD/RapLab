-- ============================================================
-- RLS testleri — Şartname 29.3 (pgTAP ile supabase test db üzerinde çalışır)
-- Çalıştırma: supabase test db
--
-- Kapsam:
--   1. Ziyaretçi taslak göremez.
--   2. Kullanıcı gönderi oluşturamaz.
--   3. Kullanıcı başka kullanıcı adına beğenemez.
--   4. Sanatçı başka sanatçının gönderisini düzenleyemez.
--   5. Moderatör süper yönetici işlemi yapamaz (audit log değiştirilemez).
--   6. Doğrulama dosyası herkese açık değildir.
-- ============================================================

begin;
select plan(10);

-- Test verisi (seed.sql yüklendiği varsayılır)
-- Kullanıcılar: ...0001 dinleyici, ...0002 sanatçı (Ray Vold sahibi)

-- ---------- 1. Ziyaretçi taslak göremez ----------
set local role anon;
select is(
  (select count(*) from posts where status = 'draft')::int,
  0,
  'ziyaretçi taslak gönderi göremez'
);

-- Ziyaretçi yalnızca public + published görür
select is(
  (select count(*) from posts where visibility = 'followers')::int,
  0,
  'ziyaretçi takipçi içeriğini göremez'
);

-- ---------- 2. Kullanıcı gönderi oluşturamaz ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$insert into posts (artist_id, author_user_id, post_type, body, status)
    values ('10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000001',
            'text', 'izinsiz gönderi', 'published')$$,
  '42501',
  null,
  'normal kullanıcı gönderi oluşturamaz (Kural 1)'
);

-- ---------- 3. Kullanıcı başka kullanıcı adına beğenemez ----------
select throws_ok(
  $$insert into post_likes (post_id, user_id)
    values ('20000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'kullanıcı başka kullanıcı adına beğeni oluşturamaz (22.4)'
);

-- Kendi adına beğenebilir (idempotens: seed'de zaten beğenmişse çakışma)
select lives_ok(
  $$insert into post_likes (post_id, user_id)
    values ('20000000-0000-4000-8000-000000000002',
            '00000000-0000-4000-8000-000000000001')$$,
  'kullanıcı kendi adına beğeni oluşturabilir'
);

-- Çift beğeni birincil anahtar ile engellenir
select throws_ok(
  $$insert into post_likes (post_id, user_id)
    values ('20000000-0000-4000-8000-000000000002',
            '00000000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'aynı gönderi iki kez beğenilemez (Kural 8)'
);

-- ---------- 4. Sanatçı başka sanatçının gönderisini düzenleyemez ----------
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
-- (dinleyici hesabı hiçbir sanatçının üyesi değil)
select is(
  (select count(*) from posts
   where id = '20000000-0000-4000-8000-000000000001'
   for update skip locked)::int,
  1,
  'okuma mümkün'
);
-- update RLS: manage_posts izni olmayan güncelleyemez
select results_eq(
  $$update posts set title = 'ele geçirildi'
    where id = '20000000-0000-4000-8000-000000000001'
    returning 1$$,
  $$values (1) limit 0$$,
  'üyeliği olmayan kullanıcı gönderi güncelleyemez (22.3)'
);

-- ---------- 5. Audit log değiştirilemez ----------
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$delete from audit_logs$$,
  null, null,
  'moderatör audit log silemez (Yetki matrisi: Hayır)'
);

-- ---------- 6. Doğrulama dosyaları herkese açık değildir ----------
set local role anon;
select is(
  (select count(*) from storage.objects where bucket_id = 'verification-docs')::int,
  0,
  'ziyaretçi doğrulama belgelerini listeleyemez (Kural 14)'
);

select * from finish();
rollback;
