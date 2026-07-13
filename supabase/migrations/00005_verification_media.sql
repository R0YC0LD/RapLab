-- ============================================================
-- RapLab — Doğrulama medyaları ve kayıt sağlamlaştırması
-- 1) Sanatçı başvurusuna ses beyanı ("sitenize sanatçı üyeliği yapmak
--    istiyorum") ve kimlik belgesi TEK SEFERLİK görüntüleme işaretleri
-- 2) handle_new_user: kullanıcı adı çakışırsa kayıt patlamaz, güvenli
--    üretilmiş ada düşer (tekil kullanıcı adı garantisi zaten unique
--    constraint ile sağlanır)
-- ============================================================

alter table artist_applications
  add column if not exists voice_declaration_path text,
  add column if not exists identity_viewed_at timestamptz,
  add column if not exists identity_viewed_by uuid references profiles (id);

comment on column artist_applications.identity_viewed_at is
  'Kimlik belgesi süper yönetici tarafından yalnızca BİR KEZ görüntülenebilir; bu alan dolduktan sonra erişim kapanır.';

-- Kullanıcı adı çakışmasında kayıt akışını koru
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
begin
  v_username := coalesce(new.raw_user_meta_data ->> 'username', 'uye_' || substr(new.id::text, 1, 8));
  begin
    insert into profiles (id, username, display_name, email_verified)
    values (
      new.id,
      v_username,
      coalesce(new.raw_user_meta_data ->> 'display_name', 'Yeni Üye'),
      new.email_confirmed_at is not null
    )
    on conflict (id) do nothing;
  exception when unique_violation then
    -- İstenen kullanıcı adı alınmış: kayıt engellenmez, geçici ad atanır;
    -- kullanıcı /hesap sayfasından benzersiz bir ad seçebilir.
    insert into profiles (id, username, display_name, email_verified)
    values (
      new.id,
      'uye_' || substr(new.id::text, 1, 8),
      coalesce(new.raw_user_meta_data ->> 'display_name', 'Yeni Üye'),
      new.email_confirmed_at is not null
    )
    on conflict (id) do nothing;
  end;
  return new;
end $$;
