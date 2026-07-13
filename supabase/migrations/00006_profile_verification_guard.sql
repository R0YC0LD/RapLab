-- Kullanıcı kendi profilini düzenleyebilir, ancak doğrulama durumunu kendi
-- isteğiyle yükseltemez. Bu alan yalnızca service_role kullanan güvenilir
-- sunucu uçları ve auth.users senkron trigger'ı tarafından değiştirilebilir.

create or replace function prevent_self_email_verification()
returns trigger language plpgsql as $$
begin
  if new.email_verified is distinct from old.email_verified
     and coalesce(auth.jwt() ->> 'role', '') not in ('service_role')
     and pg_trigger_depth() = 1 then
    raise exception 'EMAIL_VERIFICATION_MANAGED_BY_AUTH' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_email_verification_guard on profiles;
create trigger profiles_email_verification_guard
  before update of email_verified on profiles
  for each row execute function prevent_self_email_verification();
