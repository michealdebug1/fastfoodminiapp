begin;

create table public.customer_telegram_webhook_updates (
  update_id bigint primary key
    constraint customer_telegram_webhook_updates_id_check
    check (update_id >= 0),
  lease_token uuid,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  attempts integer not null default 1
    constraint customer_telegram_webhook_updates_attempts_check
    check (attempts > 0),
  created_at timestamptz not null default now(),
  constraint customer_telegram_webhook_updates_state_check
    check (
      (processed_at is null and lease_token is not null
        and lease_expires_at is not null)
      or (processed_at is not null and lease_token is null
        and lease_expires_at is null)
    )
);

create index customer_telegram_webhook_updates_processed_idx
  on public.customer_telegram_webhook_updates (processed_at)
  where processed_at is not null;

alter table public.customer_telegram_webhook_updates enable row level security;
alter table public.customer_telegram_webhook_updates force row level security;

revoke all on public.customer_telegram_webhook_updates
  from public, anon, authenticated, service_role;

create function public.claim_customer_telegram_webhook_update(
  p_update_id bigint
)
returns table (disposition text, lease_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_lease_token uuid := gen_random_uuid();
  v_claimed_token uuid;
  v_processed_at timestamptz;
begin
  if p_update_id is null or p_update_id < 0 then
    raise exception 'invalid_webhook_update_id' using errcode = 'P0001';
  end if;

  delete from public.customer_telegram_webhook_updates
  where update_id in (
    select update_id
    from public.customer_telegram_webhook_updates
    where processed_at < v_now - interval '30 days'
    order by processed_at
    limit 1000
  );

  insert into public.customer_telegram_webhook_updates (
    update_id,
    lease_token,
    lease_expires_at
  )
  values (
    p_update_id,
    v_lease_token,
    v_now + interval '5 minutes'
  )
  on conflict (update_id) do update
  set lease_token = excluded.lease_token,
      lease_expires_at = excluded.lease_expires_at,
      attempts = customer_telegram_webhook_updates.attempts + 1
  where customer_telegram_webhook_updates.processed_at is null
    and customer_telegram_webhook_updates.lease_expires_at <= v_now
  returning lease_token into v_claimed_token;

  if v_claimed_token is not null then
    return query select 'claimed'::text, v_claimed_token;
    return;
  end if;

  select processed_at
  into v_processed_at
  from public.customer_telegram_webhook_updates
  where update_id = p_update_id;

  if v_processed_at is not null then
    return query select 'processed'::text, null::uuid;
  else
    return query select 'processing'::text, null::uuid;
  end if;
end;
$$;

create function public.complete_customer_telegram_webhook_update(
  p_update_id bigint,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_rows integer;
begin
  update public.customer_telegram_webhook_updates
  set processed_at = now(),
      lease_token = null,
      lease_expires_at = null
  where update_id = p_update_id
    and lease_token = p_lease_token
    and processed_at is null;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

create function public.release_customer_telegram_webhook_update(
  p_update_id bigint,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_rows integer;
begin
  delete from public.customer_telegram_webhook_updates
  where update_id = p_update_id
    and lease_token = p_lease_token
    and processed_at is null;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.claim_customer_telegram_webhook_update(bigint)
  from public, anon, authenticated;
revoke all on function public.complete_customer_telegram_webhook_update(
  bigint, uuid
) from public, anon, authenticated;
revoke all on function public.release_customer_telegram_webhook_update(
  bigint, uuid
) from public, anon, authenticated;

grant execute on function public.claim_customer_telegram_webhook_update(bigint)
  to service_role;
grant execute on function public.complete_customer_telegram_webhook_update(
  bigint, uuid
) to service_role;
grant execute on function public.release_customer_telegram_webhook_update(
  bigint, uuid
) to service_role;

commit;
