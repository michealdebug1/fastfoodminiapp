\echo 'Phase 2B RLS and database security tests'

begin;

insert into auth.users (
  id, aud, role, email, created_at, updated_at,
  is_sso_user, is_anonymous
) values
  ('81000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'phase2b.customer.a@example.test', now(), now(), false, false),
  ('81000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'phase2b.customer.b@example.test', now(), now(), false, false),
  ('81000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'phase2b.admin@example.test', now(), now(), false, false),
  ('81000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'phase2b.manager@example.test', now(), now(), false, false),
  ('81000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'phase2b.staff@example.test', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.restaurant_staff (
  id, restaurant_id, auth_user_id, role_id, is_active
) values
  ('82000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000003',
   (select id from public.roles where slug = 'administrator'),
   true),
  ('82000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000004',
   (select id from public.roles where slug = 'manager'),
   true),
  ('82000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000005',
   (select id from public.roles where slug = 'order_staff'),
   true)
on conflict (id) do update set
  is_active = excluded.is_active,
  role_id = excluded.role_id;

insert into public.orders (
  id, public_number, restaurant_id, customer_id,
  fulfillment_type, status, subtotal, discount_total,
  delivery_fee, total, payment_method
) values
  ('83000000-0000-4000-8000-000000000001',
   'TEST-A', '10000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000001',
   'pickup', 'pending', 10000, 0, 0, 10000, 'cash'),
  ('83000000-0000-4000-8000-000000000002',
   'TEST-B', '10000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000002',
   'pickup', 'pending', 10000, 0, 0, 10000, 'cash')
on conflict (id) do update set
  customer_id = excluded.customer_id,
  status = excluded.status;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  public_product_count integer;
begin
  select count(*) into public_product_count
  from public.products
  where is_available and deleted_at is null;

  if public_product_count < 1 then
    raise exception 'Anonymous catalog read returned no active products';
  end if;
end;
$$;

reset role;

select set_config('request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001', true);
set local role authenticated;

do $$
declare
  own_order_count integer;
  other_order_count integer;
begin
  select count(*) into own_order_count
  from public.orders
  where id = '83000000-0000-4000-8000-000000000001';

  select count(*) into other_order_count
  from public.orders
  where id = '83000000-0000-4000-8000-000000000002';

  if own_order_count <> 1 then
    raise exception 'Customer could not read their own order';
  end if;

  if other_order_count <> 0 then
    raise exception 'Customer read isolation failed';
  end if;
end;
$$;

reset role;

select set_config('request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000003', true);
set local role authenticated;

update public.orders
set status = 'confirmed'
where id = '83000000-0000-4000-8000-000000000001';

do $$
declare
  transition_count integer;
begin
  select count(*) into transition_count
  from public.order_status_history
  where order_id = '83000000-0000-4000-8000-000000000001'
    and previous_status = 'pending'
    and new_status = 'confirmed';

  if transition_count <> 1 then
    raise exception 'Administrator status transition did not create history';
  end if;
end;
$$;

reset role;

select set_config('request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000005', true);
set local role authenticated;

update public.orders
set status = 'preparing'
where id = '83000000-0000-4000-8000-000000000001';

do $$
declare
  caught_invalid_transition boolean := false;
begin
  begin
    update public.orders
    set status = 'delivered'
    where id = '83000000-0000-4000-8000-000000000002';
  exception
    when others then
      caught_invalid_transition := true;
  end;

  if not caught_invalid_transition then
    raise exception 'Invalid pending-to-delivered transition was accepted';
  end if;
end;
$$;

reset role;

do $$
declare
  caught_payment boolean := false;
  caught_audit_update boolean := false;
  caught_history_update boolean := false;
begin
  begin
    insert into public.payments (
      order_id, provider, status, amount, currency,
      provider_reference, verified_at
    ) values (
      '83000000-0000-4000-8000-000000000002',
      'click',
      'verified',
      10000,
      'UZS',
      null,
      now()
    );
  exception
    when others then
      caught_payment := true;
  end;

  if not caught_payment then
    raise exception 'Verified online payment without provider reference was accepted';
  end if;

  begin
    update public.audit_logs set action = 'tampered';
  exception
    when others then
      caught_audit_update := true;
  end;

  if not caught_audit_update then
    raise exception 'Audit log modification was accepted';
  end if;

  begin
    update public.order_status_history set note = 'tampered';
  exception
    when others then
      caught_history_update := true;
  end;

  if not caught_history_update then
    raise exception 'Order status history modification was accepted';
  end if;
end;
$$;

rollback;
\echo 'Phase 2B RLS and database security tests passed'
