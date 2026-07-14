-- RapLab TR Vatan haritasi: basvuru sehrini sakla ve onaylanan profile tasi.

alter table artist_applications
  add column if not exists city varchar(80);

create index if not exists artists_city_active_idx
  on artists (city, profile_status, verification_status);

-- 00007'deki tekrar denenebilir onay akisini korur; yalnizca sehri de
-- sanatci profiline atomik olarak aktarir.
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
    stage_name, slug, short_bio, long_bio, city,
    verification_status, profile_status, owner_user_id
  ) values (
    v_app.stage_name,
    v_slug,
    left(v_app.artist_description, 300),
    v_app.artist_description,
    v_app.city,
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
    jsonb_build_object(
      'status', 'approved',
      'artist_id', v_artist_id,
      'slug', v_slug,
      'city', v_app.city
    ),
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
