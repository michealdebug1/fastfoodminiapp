begin;

create table public.customer_telegram_contact_rate_limits (
  scope_type text not null
    constraint customer_telegram_contact_rate_limits_scope_type_check
    check (scope_type in (
      'profile',
      'telegram',
      'identity_ip',
      'recovery_start_ip',
      'recovery_start_telegram',
      'recovery_verify_ip',
      'recovery_verify_telegram',
      'recovery_enroll_start_ip',
      'recovery_enroll_start_telegram',
      'recovery_enroll_verify_ip',
      'recovery_enroll_verify_telegram'
    )),
  scope_id text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
    constraint customer_telegram_contact_rate_limits_count_check
    check (request_count >= 0),
  primary key (scope_type, scope_id)
);

create index customer_telegram_contact_rate_limits_window_idx
  on public.customer_telegram_contact_rate_limits (window_started_at);

alter table public.customer_telegram_identities force row level security;
alter table public.customer_telegram_contact_challenges force row level security;
alter table public.customer_telegram_contact_rate_limits enable row level security;
alter table public.customer_telegram_contact_rate_limits force row level security;

create function public.create_customer_telegram_contact_challenge(
  p_challenge_hash text,
  p_telegram_user_id text,
  p_profile_id uuid,
  p_expires_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_count integer;
  v_telegram_count integer;
  v_now timestamptz := now();
  v_existing_challenge public.customer_telegram_contact_challenges%rowtype;
begin
  if p_challenge_hash !~ '^[0-9a-f]{64}$'
    or p_telegram_user_id !~ '^[1-9][0-9]{0,19}$'
    or p_expires_at <= v_now
    or p_expires_at > v_now + interval '10 minutes' then
    raise exception 'invalid_challenge' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('profile:' || p_profile_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('telegram:' || p_telegram_user_id, 0)
  );

  if exists (
    select 1
    from public.customer_telegram_identities i
    where i.profile_id = p_profile_id
      or i.telegram_user_id = p_telegram_user_id
  ) then
    raise exception 'identity_exists' using errcode = 'P0001';
  end if;

  select *
  into v_existing_challenge
  from public.customer_telegram_contact_challenges c
  where (
    c.profile_id = p_profile_id
    or c.telegram_user_id = p_telegram_user_id
  )
    and c.finalized_at is null
    and c.expires_at > v_now
  order by c.created_at desc
  limit 1
  for update;

  if found then
    if v_existing_challenge.profile_id <> p_profile_id
      or v_existing_challenge.telegram_user_id <> p_telegram_user_id then
      raise exception 'challenge_already_pending' using errcode = 'P0001';
    end if;
  end if;

  insert into public.customer_telegram_contact_rate_limits (
    scope_type,
    scope_id,
    window_started_at,
    request_count
  )
  values ('profile', p_profile_id::text, v_now, 1)
  on conflict (scope_type, scope_id) do update
  set window_started_at = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - interval '10 minutes' then v_now
        else customer_telegram_contact_rate_limits.window_started_at
      end,
      request_count = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - interval '10 minutes' then 1
        else customer_telegram_contact_rate_limits.request_count + 1
      end
  returning request_count into v_profile_count;

  insert into public.customer_telegram_contact_rate_limits (
    scope_type,
    scope_id,
    window_started_at,
    request_count
  )
  values ('telegram', p_telegram_user_id, v_now, 1)
  on conflict (scope_type, scope_id) do update
  set window_started_at = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - interval '10 minutes' then v_now
        else customer_telegram_contact_rate_limits.window_started_at
      end,
      request_count = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - interval '10 minutes' then 1
        else customer_telegram_contact_rate_limits.request_count + 1
      end
  returning request_count into v_telegram_count;

  if v_profile_count > 3 or v_telegram_count > 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  delete from public.customer_telegram_contact_challenges c
  where (
    c.profile_id = p_profile_id
    or c.telegram_user_id = p_telegram_user_id
  )
    and c.finalized_at is null
    and (
      c.expires_at <= v_now
      or c.contact_verified_at is null
    );

  insert into public.customer_telegram_contact_challenges (
    challenge_hash,
    telegram_user_id,
    profile_id,
    expires_at
  )
  values (
    p_challenge_hash,
    p_telegram_user_id,
    p_profile_id,
    p_expires_at
  );

  return p_expires_at;
end;
$$;

create function public.record_customer_telegram_contact(
  p_challenge_hash text,
  p_telegram_user_id text,
  p_phone_e164 text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_challenge public.customer_telegram_contact_challenges%rowtype;
begin
  if p_phone_e164 !~ '^\+[1-9][0-9]{1,14}$' then
    raise exception 'invalid_contact' using errcode = 'P0001';
  end if;

  select *
  into v_challenge
  from public.customer_telegram_contact_challenges c
  where c.challenge_hash = p_challenge_hash
    and c.telegram_user_id = p_telegram_user_id
  for update;

  if not found then
    raise exception 'challenge_invalid' using errcode = 'P0001';
  end if;

  if v_challenge.phone_e164 is not null then
    if v_challenge.phone_e164 = p_phone_e164 then
      return 'already_verified';
    end if;
    raise exception 'contact_mismatch' using errcode = 'P0001';
  end if;

  if v_challenge.finalized_at is not null
    or v_challenge.expires_at <= now() then
    raise exception 'challenge_expired' using errcode = 'P0001';
  end if;

  update public.customer_telegram_contact_challenges
  set phone_e164 = p_phone_e164,
      contact_verified_at = now()
  where challenge_hash = p_challenge_hash;

  return 'verified';
end;
$$;

create function public.finalize_customer_telegram_identity(
  p_challenge_hash text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_challenge public.customer_telegram_contact_challenges%rowtype;
  v_identity public.customer_telegram_identities%rowtype;
begin
  select *
  into v_challenge
  from public.customer_telegram_contact_challenges c
  where c.challenge_hash = p_challenge_hash;

  if not found then
    raise exception 'challenge_invalid' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('profile:' || v_challenge.profile_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('telegram:' || v_challenge.telegram_user_id, 0)
  );

  select *
  into v_challenge
  from public.customer_telegram_contact_challenges c
  where c.challenge_hash = p_challenge_hash
  for update;

  if not found then
    raise exception 'challenge_invalid' using errcode = 'P0001';
  end if;

  if v_challenge.finalized_at is not null then
    if exists (
      select 1
      from public.customer_telegram_identities i
      where i.telegram_user_id = v_challenge.telegram_user_id
        and i.profile_id = v_challenge.profile_id
        and i.phone_e164 = v_challenge.phone_e164
    ) then
      return 'linked';
    end if;
    raise exception 'identity_conflict' using errcode = 'P0001';
  end if;

  if v_challenge.expires_at <= now()
    or v_challenge.contact_verified_at is null
    or v_challenge.phone_e164 is null then
    raise exception 'challenge_not_verified' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.customer_telegram_identities i
    where (
      i.telegram_user_id = v_challenge.telegram_user_id
      and i.profile_id <> v_challenge.profile_id
    ) or (
      i.profile_id = v_challenge.profile_id
      and i.telegram_user_id <> v_challenge.telegram_user_id
    )
  ) then
    raise exception 'identity_conflict' using errcode = 'P0001';
  end if;

  select *
  into v_identity
  from public.customer_telegram_identities i
  where i.telegram_user_id = v_challenge.telegram_user_id
     and i.profile_id = v_challenge.profile_id
  for update;

  if found then
    if v_identity.telegram_user_id <> v_challenge.telegram_user_id
      or v_identity.profile_id <> v_challenge.profile_id then
      raise exception 'identity_conflict' using errcode = 'P0001';
    end if;

    update public.customer_telegram_identities
    set phone_e164 = v_challenge.phone_e164,
        phone_verified_at = v_challenge.contact_verified_at,
        phone_consent_at = v_challenge.created_at
    where telegram_user_id = v_challenge.telegram_user_id;
  else
    insert into public.customer_telegram_identities (
      telegram_user_id,
      profile_id,
      phone_e164,
      phone_verified_at,
      phone_consent_at
    )
    values (
      v_challenge.telegram_user_id,
      v_challenge.profile_id,
      v_challenge.phone_e164,
      v_challenge.contact_verified_at,
      v_challenge.created_at
    );
  end if;

  update public.customer_telegram_contact_challenges
  set finalized_at = now()
  where challenge_hash = p_challenge_hash;

  return 'linked';
end;
$$;

create function public.check_customer_telegram_rate_limit(
  p_action text,
  p_ip_hash text,
  p_telegram_user_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer;
  v_window_seconds integer;
  v_ip_count integer;
  v_telegram_count integer;
  v_ip_scope text;
  v_telegram_scope text;
  v_now timestamptz := now();
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_key' using errcode = 'P0001';
  end if;

  case p_action
    when 'identity' then
      v_limit := 20;
      v_window_seconds := 60;
      if p_telegram_user_id is not null then
        raise exception 'invalid_rate_limit_action' using errcode = 'P0001';
      end if;
    when 'recovery_start', 'recovery_enroll_start' then
      v_limit := 3;
      v_window_seconds := 900;
    when 'recovery_verify', 'recovery_enroll_verify' then
      v_limit := 10;
      v_window_seconds := 900;
    else
      raise exception 'invalid_rate_limit_action' using errcode = 'P0001';
  end case;

  if p_action <> 'identity'
    and p_telegram_user_id !~ '^[1-9][0-9]{0,19}$' then
    raise exception 'invalid_rate_limit_key' using errcode = 'P0001';
  end if;

  delete from public.customer_telegram_contact_rate_limits
  where window_started_at <= v_now - interval '1 day';

  v_ip_scope := p_action || '_ip';
  insert into public.customer_telegram_contact_rate_limits (
    scope_type,
    scope_id,
    window_started_at,
    request_count
  )
  values (v_ip_scope, p_ip_hash, v_now, 1)
  on conflict (scope_type, scope_id) do update
  set window_started_at = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - make_interval(secs => v_window_seconds)
          then v_now
        else customer_telegram_contact_rate_limits.window_started_at
      end,
      request_count = case
        when customer_telegram_contact_rate_limits.window_started_at
          <= v_now - make_interval(secs => v_window_seconds) then 1
        else customer_telegram_contact_rate_limits.request_count + 1
      end
  returning request_count into v_ip_count;

  if p_action <> 'identity' then
    v_telegram_scope := p_action || '_telegram';
    insert into public.customer_telegram_contact_rate_limits (
      scope_type,
      scope_id,
      window_started_at,
      request_count
    )
    values (v_telegram_scope, p_telegram_user_id, v_now, 1)
    on conflict (scope_type, scope_id) do update
    set window_started_at = case
          when customer_telegram_contact_rate_limits.window_started_at
            <= v_now - make_interval(secs => v_window_seconds)
            then v_now
          else customer_telegram_contact_rate_limits.window_started_at
        end,
        request_count = case
          when customer_telegram_contact_rate_limits.window_started_at
            <= v_now - make_interval(secs => v_window_seconds) then 1
          else customer_telegram_contact_rate_limits.request_count + 1
        end
    returning request_count into v_telegram_count;
  end if;

  if v_ip_count > v_limit
    or (v_telegram_count is not null and v_telegram_count > v_limit) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return true;
end;
$$;

revoke all on public.customer_telegram_contact_rate_limits
  from public, anon, authenticated, service_role;

revoke all on function public.create_customer_telegram_contact_challenge(
  text, text, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.record_customer_telegram_contact(
  text, text, text
) from public, anon, authenticated;
revoke all on function public.finalize_customer_telegram_identity(text)
  from public, anon, authenticated;
revoke all on function public.check_customer_telegram_rate_limit(
  text, text, text
) from public, anon, authenticated;

grant execute on function public.create_customer_telegram_contact_challenge(
  text, text, uuid, timestamptz
) to service_role;
grant execute on function public.record_customer_telegram_contact(
  text, text, text
) to service_role;
grant execute on function public.finalize_customer_telegram_identity(text)
  to service_role;
grant execute on function public.check_customer_telegram_rate_limit(
  text, text, text
) to service_role;

commit;
