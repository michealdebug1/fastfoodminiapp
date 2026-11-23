begin;

create table public.customer_telegram_identities (
  telegram_user_id text primary key
    constraint customer_telegram_identities_telegram_user_id_check
    check (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  profile_id uuid not null unique
    references public.profiles(id) on delete cascade,
  phone_e164 text not null
    constraint customer_telegram_identities_phone_e164_check
    check (phone_e164 ~ '^\+[1-9][0-9]{1,14}$'),
  phone_verified_at timestamptz not null,
  phone_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint customer_telegram_identities_consent_order_check
    check (phone_consent_at <= phone_verified_at)
);

create table public.customer_telegram_contact_challenges (
  challenge_hash text primary key
    constraint customer_telegram_contact_challenges_hash_check
    check (challenge_hash ~ '^[0-9a-f]{64}$'),
  telegram_user_id text not null
    constraint customer_telegram_contact_challenges_telegram_user_id_check
    check (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  profile_id uuid not null
    references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  phone_e164 text,
  contact_verified_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_telegram_contact_challenges_expiry_check
    check (expires_at > created_at),
  constraint customer_telegram_contact_challenges_contact_check
    check (
      (phone_e164 is null) = (contact_verified_at is null)
      and (finalized_at is null or contact_verified_at is not null)
    ),
  constraint customer_telegram_contact_challenges_phone_check
    check (
      phone_e164 is null
      or phone_e164 ~ '^\+[1-9][0-9]{1,14}$'
    )
);

create index customer_telegram_contact_challenges_pending_idx
  on public.customer_telegram_contact_challenges (expires_at)
  where finalized_at is null;

create function public.guard_customer_telegram_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.telegram_user_id is distinct from old.telegram_user_id
    or new.profile_id is distinct from old.profile_id
    or new.created_at is distinct from old.created_at then
    raise exception 'A Telegram identity cannot be reassigned';
  end if;

  return new;
end;
$$;

create trigger customer_telegram_identity_no_reassignment
  before update on public.customer_telegram_identities
  for each row
  execute function public.guard_customer_telegram_identity();

create function public.guard_customer_telegram_contact_challenge()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.phone_e164 is not null
      or new.contact_verified_at is not null
      or new.finalized_at is not null then
      raise exception 'A contact challenge must start unverified';
    end if;
    if new.expires_at <= now() then
      raise exception 'A contact challenge must expire in the future';
    end if;
    return new;
  end if;

  if new.challenge_hash is distinct from old.challenge_hash
    or new.telegram_user_id is distinct from old.telegram_user_id
    or new.profile_id is distinct from old.profile_id
    or new.created_at is distinct from old.created_at then
    raise exception 'A contact challenge cannot be reassigned';
  end if;

  if new.expires_at > old.expires_at then
    raise exception 'A contact challenge expiration cannot be extended';
  end if;

  if old.contact_verified_at is not null then
    if new.phone_e164 is distinct from old.phone_e164
      or new.contact_verified_at is distinct from old.contact_verified_at then
      raise exception 'A verified contact cannot be replaced';
    end if;
  elsif new.contact_verified_at is not null then
    if old.expires_at <= now() then
      raise exception 'A contact challenge has expired';
    end if;
    if new.phone_e164 is null then
      raise exception 'A verified contact must include a phone number';
    end if;
  end if;

  if old.finalized_at is not null then
    if new.finalized_at is distinct from old.finalized_at then
      raise exception 'A contact challenge can only be finalized once';
    end if;
  elsif new.finalized_at is not null then
    if old.expires_at <= now() then
      raise exception 'A contact challenge has expired';
    end if;
    if old.contact_verified_at is null then
      raise exception 'A contact challenge must be verified before finalizing';
    end if;
  end if;

  return new;
end;
$$;

create trigger customer_telegram_contact_challenge_state
  before insert or update on public.customer_telegram_contact_challenges
  for each row
  execute function public.guard_customer_telegram_contact_challenge();

alter table public.customer_telegram_identities enable row level security;
alter table public.customer_telegram_contact_challenges enable row level security;

revoke all on public.customer_telegram_identities,
  public.customer_telegram_contact_challenges
  from public, anon, authenticated, service_role;

grant select, insert, update
  on public.customer_telegram_identities
  to service_role;
grant select, insert, update
  on public.customer_telegram_contact_challenges
  to service_role;
grant delete
  on public.customer_telegram_contact_challenges
  to service_role;

revoke all on function public.guard_customer_telegram_identity()
  from public, anon, authenticated;
revoke all on function public.guard_customer_telegram_contact_challenge()
  from public, anon, authenticated;
grant execute on function public.guard_customer_telegram_identity()
  to service_role;
grant execute on function public.guard_customer_telegram_contact_challenge()
  to service_role;

commit;
