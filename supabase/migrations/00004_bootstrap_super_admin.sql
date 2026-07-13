-- ============================================================
-- RapLab — İlk süper yönetici ataması (bootstrap) + e-posta doğrulama senkronu
-- Şartname 4.8: "En az bir süper yönetici olmalıdır."
--
-- Sistemde hiç süper yönetici yokken platform sahibinin hesabı bir kez
-- yükseltilir. Zaten bir süper yönetici varsa bu migration hiçbir şey yapmaz;
-- rol koruma trigger'ı yalnızca bu kontrollü blok için geçici kapatılır.
-- ============================================================

alter table profiles disable trigger profiles_privilege_guard;

update profiles
set role = 'super_admin'
where username = 'r0yc0ld'
  and not exists (
    select 1 from profiles
    where role = 'super_admin' and deleted_at is null
  );

alter table profiles enable trigger profiles_privilege_guard;

-- ------------------------------------------------------------
-- E-posta doğrulama senkronu: kullanıcı doğrulama bağlantısına
-- kayıttan SONRA tıkladığında profiles.email_verified güncellenir.
-- ------------------------------------------------------------

create or replace function sync_email_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update profiles set email_verified = true where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified after update of email_confirmed_at on auth.users
  for each row execute function sync_email_verified();
