\echo 'Phase 4 Telegram identity database security tests'

begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase4.telegram.customer.a@example.test',
    now(),
    now(),
    false,
    true
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase4.telegram.customer.b@example.test',
    now(),
    now(),
    false,
    true
  );

do $$
declare
  role_name text;
  table_name text;
  privilege_name text;
begin
  foreach role_name in array array['anon', 'authenticated']
  loop
    foreach table_name in array array[
      'public.customer_telegram_identities',
      'public.customer_telegram_contact_challenges',
      'public.customer_telegram_contact_rate_limits',
      'public.customer_telegram_webhook_updates'
    ]
    loop
      foreach privilege_name in array array[
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE'
      ]
      loop
        if has_table_privilege(role_name, table_name, privilege_name) then
          raise exception 'Client role % has % access to %',
            role_name, privilege_name, table_name;
        end if;
      end loop;
    end loop;
  end loop;

  if not has_table_privilege(
    'service_role',
    'public.customer_telegram_identities',
    'insert'
  ) or not has_table_privilege(
    'service_role',
    'public.customer_telegram_identities',
    'update'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_identities',
    'delete'
  ) then
    raise exception 'Telegram identity backend privileges are not least-privilege';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.customer_telegram_contact_challenges',
    'update'
  ) or not has_table_privilege(
    'service_role',
    'public.customer_telegram_contact_challenges',
    'delete'
  ) then
    raise exception 'Contact challenge backend privileges are not least-privilege';
  end if;

  if has_table_privilege(
    'service_role',
    'public.customer_telegram_contact_rate_limits',
    'select'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_contact_rate_limits',
    'insert'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_webhook_updates',
    'select'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_webhook_updates',
    'insert'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_webhook_updates',
    'update'
  ) or has_table_privilege(
    'service_role',
    'public.customer_telegram_webhook_updates',
    'delete'
  ) then
    raise exception 'Private identity tables must be accessed only through trusted RPCs';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'customer_telegram_identities',
          'customer_telegram_contact_challenges',
          'customer_telegram_contact_rate_limits',
          'customer_telegram_webhook_updates'
      )
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ) then
    raise exception 'RLS is not enabled and forced for an identity table';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'customer_telegram_identities',
        'customer_telegram_contact_challenges',
        'customer_telegram_contact_rate_limits',
        'customer_telegram_webhook_updates'
      )
  ) then
    raise exception 'A client-facing policy exists on an identity table';
  end if;
end;
$$;

do $$
declare
  routine_name text;
begin
  foreach routine_name in array array[
    'public.create_customer_telegram_contact_challenge(text,text,uuid,timestamp with time zone)',
    'public.record_customer_telegram_contact(text,text,text)',
    'public.finalize_customer_telegram_identity(text)',
    'public.check_customer_telegram_rate_limit(text,text,text)',
    'public.claim_customer_telegram_webhook_update(bigint)',
    'public.complete_customer_telegram_webhook_update(bigint,uuid)',
    'public.release_customer_telegram_webhook_update(bigint,uuid)'
  ]
  loop
    if not has_function_privilege('service_role', routine_name, 'execute') then
      raise exception 'Trusted backend cannot execute %', routine_name;
    end if;
    if has_function_privilege('anon', routine_name, 'execute')
      or has_function_privilege('authenticated', routine_name, 'execute') then
      raise exception 'A client role can execute %', routine_name;
    end if;
  end loop;
end;
$$;

insert into public.customer_telegram_identities (
  telegram_user_id,
  profile_id,
  phone_e164,
  phone_verified_at,
  phone_consent_at
)
values (
  '700000000000001',
  '91000000-0000-4000-8000-000000000001',
  '+998901234567',
  now(),
  now()
);

do $$
declare
  rejected boolean;
begin
  rejected := false;
  begin
    insert into public.customer_telegram_identities (
      telegram_user_id,
      profile_id,
      phone_e164,
      phone_verified_at,
      phone_consent_at
    )
    values (
      '700000000000001',
      '91000000-0000-4000-8000-000000000002',
      '+998901234568',
      now(),
      now()
    );
  exception
    when unique_violation then
      rejected := true;
  end;
  if not rejected then
    raise exception 'A Telegram user was linked to multiple profiles';
  end if;

  rejected := false;
  begin
    insert into public.customer_telegram_identities (
      telegram_user_id,
      profile_id,
      phone_e164,
      phone_verified_at,
      phone_consent_at
    )
    values (
      '700000000000002',
      '91000000-0000-4000-8000-000000000001',
      '+998901234568',
      now(),
      now()
    );
  exception
    when unique_violation then
      rejected := true;
  end;
  if not rejected then
    raise exception 'A profile was linked to multiple Telegram users';
  end if;

  rejected := false;
  begin
    update public.customer_telegram_identities
    set profile_id = '91000000-0000-4000-8000-000000000002'
    where telegram_user_id = '700000000000001';
  exception
    when others then
      rejected := true;
  end;
  if not rejected then
    raise exception 'A Telegram identity reassignment was accepted';
  end if;
end;
$$;

insert into public.customer_telegram_contact_challenges (
  challenge_hash,
  telegram_user_id,
  profile_id,
  expires_at
)
values (
  repeat('a', 64),
  '700000000000003',
  '91000000-0000-4000-8000-000000000002',
  now() + interval '10 minutes'
);

update public.customer_telegram_contact_challenges
set phone_e164 = '+998901234569',
    contact_verified_at = now()
where challenge_hash = repeat('a', 64);

update public.customer_telegram_contact_challenges
set finalized_at = now()
where challenge_hash = repeat('a', 64);

do $$
declare
  rejected boolean;
begin
  rejected := false;
  begin
    update public.customer_telegram_contact_challenges
    set phone_e164 = '+998901234570'
    where challenge_hash = repeat('a', 64);
  exception
    when others then
      rejected := true;
  end;
  if not rejected then
    raise exception 'A verified contact was replaced';
  end if;

  rejected := false;
  begin
    update public.customer_telegram_contact_challenges
    set finalized_at = now() + interval '1 second'
    where challenge_hash = repeat('a', 64);
  exception
    when others then
      rejected := true;
  end;
  if not rejected then
    raise exception 'A finalized challenge was replayed';
  end if;
end;
$$;

insert into public.customer_telegram_contact_challenges (
  challenge_hash,
  telegram_user_id,
  profile_id,
  created_at,
  expires_at
)
values (
  repeat('b', 64),
  '700000000000004',
  '91000000-0000-4000-8000-000000000002',
  now() - interval '2 hours',
  now() + interval '10 minutes'
);

update public.customer_telegram_contact_challenges
set expires_at = now() - interval '1 hour'
where challenge_hash = repeat('b', 64);

do $$
declare
  rejected boolean := false;
begin
  begin
    update public.customer_telegram_contact_challenges
    set phone_e164 = '+998901234571',
        contact_verified_at = now()
    where challenge_hash = repeat('b', 64);
  exception
    when others then
      rejected := true;
  end;
  if not rejected then
    raise exception 'An expired challenge was accepted';
  end if;
end;
$$;

do $$
declare
  attempt integer;
  rejected boolean := false;
  rpc_result text;
begin
  for attempt in 1..3
  loop
    perform public.create_customer_telegram_contact_challenge(
      lpad(to_hex(attempt), 64, '0'),
      '700000000000005',
      '91000000-0000-4000-8000-000000000002',
      now() + interval '10 minutes'
    );
  end loop;

  begin
    perform public.create_customer_telegram_contact_challenge(
      lpad(to_hex(4), 64, '0'),
      '700000000000005',
      '91000000-0000-4000-8000-000000000002',
      now() + interval '10 minutes'
    );
  exception
    when others then
      rejected := sqlerrm = 'rate_limited';
  end;
  if not rejected then
    raise exception 'Contact challenge rate limit was not enforced';
  end if;

  rpc_result := public.record_customer_telegram_contact(
    lpad(to_hex(3), 64, '0'),
    '700000000000005',
    '+998901234565'
  );
  if rpc_result <> 'verified' then
    raise exception 'A valid owned contact was not verified';
  end if;

  rpc_result := public.record_customer_telegram_contact(
    lpad(to_hex(3), 64, '0'),
    '700000000000005',
    '+998901234565'
  );
  if rpc_result <> 'already_verified' then
    raise exception 'A duplicate contact update was not idempotent';
  end if;

  rpc_result := public.finalize_customer_telegram_identity(
    lpad(to_hex(3), 64, '0')
  );
  if rpc_result <> 'linked' then
    raise exception 'A verified contact was not linked';
  end if;

  rpc_result := public.finalize_customer_telegram_identity(
    lpad(to_hex(3), 64, '0')
  );
  if rpc_result <> 'linked' then
    raise exception 'Identity finalization was not idempotent';
  end if;
end;
$$;

do $$
declare
  attempt integer;
  rejected boolean := false;
begin
  for attempt in 1..20
  loop
    perform public.check_customer_telegram_rate_limit(
      'identity',
      repeat('e', 64)
    );
  end loop;

  begin
    perform public.check_customer_telegram_rate_limit(
      'identity',
      repeat('e', 64)
    );
  exception
    when others then
      rejected := sqlerrm = 'rate_limited';
  end;
  if not rejected then
    raise exception 'Telegram verification rate limit was not enforced';
  end if;

  rejected := false;
  for attempt in 1..3
  loop
    perform public.check_customer_telegram_rate_limit(
      'recovery_start',
      repeat('f', 64),
      '700000000000006'
    );
  end loop;
  begin
    perform public.check_customer_telegram_rate_limit(
      'recovery_start',
      repeat('f', 64),
      '700000000000006'
    );
  exception
    when others then
      rejected := sqlerrm = 'rate_limited';
  end;
  if not rejected then
    raise exception 'Telegram OTP request rate limit was not enforced';
  end if;
end;
$$;

do $$
declare
  first_token uuid;
  next_token uuid;
  disposition text;
  action_succeeded boolean;
begin
  select lease_token
  into first_token
  from public.claim_customer_telegram_webhook_update(900000001);
  if first_token is null then
    raise exception 'A new Telegram webhook update was not claimed';
  end if;

  select update_claim.disposition
  into disposition
  from public.claim_customer_telegram_webhook_update(900000001) as update_claim;
  if disposition <> 'processing' then
    raise exception 'An in-flight Telegram webhook update was reclaimed';
  end if;

  action_succeeded := public.complete_customer_telegram_webhook_update(
    900000001,
    first_token
  );
  if not action_succeeded then
    raise exception 'A Telegram webhook update was not completed';
  end if;

  select update_claim.disposition
  into disposition
  from public.claim_customer_telegram_webhook_update(900000001) as update_claim;
  if disposition <> 'processed' then
    raise exception 'A duplicate Telegram webhook update was reprocessed';
  end if;

  select lease_token
  into first_token
  from public.claim_customer_telegram_webhook_update(900000002);
  action_succeeded := public.release_customer_telegram_webhook_update(
    900000002,
    first_token
  );
  if not action_succeeded then
    raise exception 'A failed Telegram webhook update claim was not released';
  end if;

  select lease_token
  into next_token
  from public.claim_customer_telegram_webhook_update(900000002);
  if next_token is null or next_token = first_token then
    raise exception 'A released Telegram webhook update was not retryable';
  end if;
end;
$$;

insert into public.customer_telegram_contact_challenges (
  challenge_hash,
  telegram_user_id,
  profile_id,
  expires_at,
  phone_e164,
  contact_verified_at
)
values (
  repeat('d', 64),
  '700000000000001',
  '91000000-0000-4000-8000-000000000002',
  now() + interval '10 minutes',
  '+998901234566',
  now()
);

do $$
declare
  rejected boolean := false;
begin
  begin
    perform public.finalize_customer_telegram_identity(repeat('d', 64));
  exception
    when others then
      rejected := sqlerrm = 'identity_conflict';
  end;
  if not rejected then
    raise exception 'A conflicting identity link was accepted';
  end if;
end;
$$;

rollback;

select test_case, result
from (
  values
    ('client roles cannot access identity or challenge tables', 'passed'),
    ('trusted backend grants are limited', 'passed'),
    ('Telegram ID and profile associations are unique', 'passed'),
    ('linked Telegram identities cannot be reassigned', 'passed'),
    ('contact challenge verifies and finalizes once', 'passed'),
    ('verified contact cannot be replaced or replayed', 'passed'),
    ('expired contact challenge cannot be verified', 'passed'),
    ('challenge issuance is durably rate limited', 'passed'),
    ('initData and OTP endpoints are durably rate limited', 'passed'),
    ('Telegram webhook updates are durably claimed and deduplicated', 'passed'),
    ('contact webhook operations are idempotent', 'passed'),
    ('profile and Telegram identity conflicts are rejected', 'passed'),
    ('all synthetic data rolled back', 'passed')
) as test_results(test_case, result);
