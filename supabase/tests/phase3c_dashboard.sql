begin;

create temporary table phase3c_dashboard_test_users (
  administrator_id uuid not null,
  manager_id uuid not null,
  order_staff_id uuid not null,
  non_staff_id uuid not null,
  restaurant_id uuid not null
) on commit drop;

create temporary table phase3c_dashboard_test_orders (
  fixture_key text primary key,
  order_id uuid not null
) on commit drop;

insert into phase3c_dashboard_test_users
select
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  id
from public.restaurants
where slug = 'bun-run-tashkent'
  and is_active;

do $$
begin
  if not exists (select 1 from phase3c_dashboard_test_users) then
    raise exception 'Active development restaurant is required for dashboard tests';
  end if;
end;
$$;

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
select test_ids.user_id,
       'authenticated',
       'authenticated',
       'phase3c.' || test_ids.role_name || '.' || test_ids.user_id || '@example.test',
       now(),
       now(),
       false,
       false
from phase3c_dashboard_test_users context
cross join lateral (
  values
    (context.administrator_id, 'administrator'),
    (context.manager_id, 'manager'),
    (context.order_staff_id, 'order_staff'),
    (context.non_staff_id, 'non_staff')
) as test_ids(user_id, role_name);

insert into public.restaurant_staff (
  restaurant_id,
  auth_user_id,
  role_id,
  is_active
)
select context.restaurant_id,
       staff.user_id,
       roles.id,
       true
from phase3c_dashboard_test_users context
cross join lateral (
  values
    (context.administrator_id, 'administrator'),
    (context.manager_id, 'manager'),
    (context.order_staff_id, 'order_staff')
) as staff(user_id, role_slug)
join public.roles on roles.slug = staff.role_slug;

select set_config(
  'phase3c.dashboard_restaurant_id',
  (select restaurant_id::text from phase3c_dashboard_test_users),
  true
);
select set_config(
  'phase3c.dashboard_admin_id',
  (select administrator_id::text from phase3c_dashboard_test_users),
  true
);
select set_config(
  'phase3c.dashboard_manager_id',
  (select manager_id::text from phase3c_dashboard_test_users),
  true
);
select set_config(
  'phase3c.dashboard_order_staff_id',
  (select order_staff_id::text from phase3c_dashboard_test_users),
  true
);
select set_config(
  'phase3c.dashboard_non_staff_id',
  (select non_staff_id::text from phase3c_dashboard_test_users),
  true
);

insert into public.orders (
  public_number,
  restaurant_id,
  fulfillment_type,
  status,
  subtotal,
  total,
  created_at,
  updated_at
)
select fixture.public_number,
       context.restaurant_id,
       fixture.fulfillment_type::public.fulfillment_type,
       fixture.status::public.order_status,
       fixture.amount,
       fixture.amount,
       now(),
       now()
from phase3c_dashboard_test_users context
cross join (
  values
    ('phase3c-pickup-pending', 'pickup', 'pending', 11000::bigint),
    ('phase3c-delivery-pending', 'delivery', 'pending', 90000::bigint),
    ('phase3c-pickup-completed', 'pickup', 'completed', 25000::bigint),
    ('phase3c-delivery-delivered', 'delivery', 'delivered', 80000::bigint)
) as fixture(public_number, fulfillment_type, status, amount);

insert into phase3c_dashboard_test_orders (fixture_key, order_id)
select o.public_number, o.id
from public.orders o
join phase3c_dashboard_test_users context
  on context.restaurant_id = o.restaurant_id
where o.public_number like 'phase3c-%';

insert into public.order_items (
  order_id,
  product_name,
  quantity,
  unit_price,
  line_total
)
select test_order.order_id,
       jsonb_build_object('uz', fixture.name_uz, 'ru', fixture.name_ru),
       fixture.quantity,
       fixture.unit_price,
       fixture.quantity * fixture.unit_price
from phase3c_dashboard_test_orders test_order
join lateral (
  values
    (
      'phase3c-pickup-pending',
      'Phase 3C pickup item',
      'Товар самовывоза Phase 3C',
      1,
      11000::bigint
    ),
    (
      'phase3c-delivery-pending',
      'Phase 3C delivery-only item',
      'Товар доставки Phase 3C',
      1000,
      90::bigint
    ),
    (
      'phase3c-pickup-completed',
      'Phase 3C completed pickup item',
      'Завершённый товар самовывоза Phase 3C',
      1,
      25000::bigint
    ),
    (
      'phase3c-delivery-delivered',
      'Phase 3C delivered-only item',
      'Доставленный товар Phase 3C',
      1,
      80000::bigint
    )
) as fixture(fixture_key, name_uz, name_ru, quantity, unit_price)
  on fixture.fixture_key = test_order.fixture_key;

insert into public.payments (
  order_id,
  provider,
  status,
  amount,
  verified_at
)
select fixture.order_id,
       'cash',
       'verified',
       case fixture.fixture_key
         when 'phase3c-pickup-pending' then 11000
         else 90000
       end,
       now()
from phase3c_dashboard_test_orders fixture
where fixture.fixture_key in (
  'phase3c-pickup-pending',
  'phase3c-delivery-pending'
);

insert into public.order_status_history (
  order_id,
  previous_status,
  new_status
)
select fixture.order_id,
       case fixture.fixture_key
         when 'phase3c-pickup-completed' then 'preparing'::public.order_status
         when 'phase3c-delivery-delivered' then 'out_for_delivery'::public.order_status
         else null
       end,
       case fixture.fixture_key
         when 'phase3c-pickup-completed' then 'completed'::public.order_status
         when 'phase3c-delivery-delivered' then 'delivered'::public.order_status
         else 'pending'::public.order_status
       end
from phase3c_dashboard_test_orders fixture;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase3c.dashboard_admin_id'),
  true
);
set local role authenticated;

do $$
declare
  dashboard jsonb;
  test_restaurant_id uuid;
  local_today timestamp without time zone;
  expected_orders bigint;
  expected_gross numeric;
  expected_collected numeric;
  expected_pending bigint;
  expected_completed bigint;
  chart_gross numeric;
  chart_collected numeric;
begin
  test_restaurant_id :=
    current_setting('phase3c.dashboard_restaurant_id')::uuid;
  local_today := date_trunc(
    'day',
    now() at time zone 'Asia/Tashkent'
  );

  dashboard := public.get_restaurant_dashboard(
    test_restaurant_id,
    'daily'
  );

  select
    count(*),
    coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)
  into expected_orders, expected_gross
  from public.orders o
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and o.created_at >= local_today at time zone 'Asia/Tashkent'
    and o.created_at < (local_today + interval '1 day')
      at time zone 'Asia/Tashkent';

  select coalesce(sum(p.amount), 0)
  into expected_collected
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and p.status = 'verified'
    and p.verified_at >= local_today at time zone 'Asia/Tashkent'
    and p.verified_at < (local_today + interval '1 day')
      at time zone 'Asia/Tashkent';

  select count(*)
  into expected_pending
  from public.orders o
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and o.status = 'pending';

  select count(*)
  into expected_completed
  from public.orders o
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and o.status = 'completed'
    and o.updated_at >= local_today at time zone 'Asia/Tashkent'
    and o.updated_at < (local_today + interval '1 day')
      at time zone 'Asia/Tashkent';

  select
    coalesce(
      sum((bucket.value ->> 'gross_order_value')::numeric),
      0
    ),
    coalesce(
      sum((bucket.value ->> 'collected_revenue')::numeric),
      0
    )
  into chart_gross, chart_collected
  from jsonb_array_elements(dashboard -> 'sales') as bucket(value);

  if dashboard #>> '{metrics,orders_today}' <> expected_orders::text
    or dashboard #>> '{metrics,gross_order_value_today}' <> expected_gross::text
    or dashboard #>> '{metrics,collected_revenue_today}' <> expected_collected::text
    or dashboard #>> '{metrics,pending_orders}' <> expected_pending::text
    or dashboard #>> '{metrics,completed_orders_today}' <> expected_completed::text
  then
    raise exception 'Administrator dashboard metrics do not match scoped SQL aggregates';
  end if;

  select coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)
  into expected_gross
  from public.orders o
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and o.created_at >= (local_today - interval '6 days')
      at time zone 'Asia/Tashkent'
    and o.created_at < (local_today + interval '1 day')
      at time zone 'Asia/Tashkent';

  select coalesce(sum(p.amount), 0)
  into expected_collected
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.restaurant_id = test_restaurant_id
    and o.fulfillment_type = 'pickup'
    and p.status = 'verified'
    and p.verified_at >= (local_today - interval '6 days')
      at time zone 'Asia/Tashkent'
    and p.verified_at < (local_today + interval '1 day')
      at time zone 'Asia/Tashkent';

  if chart_gross <> expected_gross
    or chart_collected <> expected_collected
  then
    raise exception 'Administrator daily sales buckets do not match scoped SQL aggregates';
  end if;

  if dashboard ->> 'timezone' <> 'Asia/Tashkent'
    or dashboard ->> 'fulfillment_scope' <> 'pickup'
    or jsonb_array_length(dashboard -> 'sales') <> 7
    or jsonb_typeof(dashboard -> 'popular_products') <> 'array'
    or jsonb_typeof(dashboard -> 'recent_orders') <> 'array'
    or jsonb_typeof(dashboard -> 'recent_status_changes') <> 'array'
    or jsonb_typeof(
      dashboard #> '{metrics,gross_order_value_today}'
    ) <> 'string'
  then
    raise exception 'Administrator daily dashboard response is invalid';
  end if;

  if (dashboard -> 'recent_orders')
       @> jsonb_build_array(
         jsonb_build_object('reference', 'phase3c-delivery-pending')
       )
    or (dashboard -> 'recent_orders')
       @> jsonb_build_array(
         jsonb_build_object('reference', 'phase3c-delivery-delivered')
       )
    or (dashboard -> 'recent_status_changes')
       @> jsonb_build_array(
         jsonb_build_object('reference', 'phase3c-delivery-pending')
       )
    or (dashboard -> 'recent_status_changes')
       @> jsonb_build_array(
         jsonb_build_object('reference', 'phase3c-delivery-delivered')
       )
    or exists (
      select 1
      from jsonb_array_elements(dashboard -> 'popular_products') product
      where product ->> 'name' = 'Phase 3C delivery-only item'
    )
  then
    raise exception 'Dashboard included legacy delivery order data';
  end if;

  if not (
    (dashboard -> 'recent_orders')
    @> jsonb_build_array(
      jsonb_build_object(
        'id',
        (select order_id::text
         from phase3c_dashboard_test_orders
         where fixture_key = 'phase3c-pickup-pending')
      )
    )
  )
  then
    raise exception 'Pickup dashboard recent orders must include stable order IDs';
  end if;
end;
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase3c.dashboard_manager_id'),
  true
);
set local role authenticated;

do $$
declare
  dashboard jsonb;
begin
  dashboard := public.get_restaurant_dashboard(
    current_setting('phase3c.dashboard_restaurant_id')::uuid,
    'weekly'
  );

  if dashboard ->> 'period' <> 'weekly'
    or jsonb_array_length(dashboard -> 'sales') <> 8
  then
    raise exception 'Manager weekly dashboard response is invalid';
  end if;
end;
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase3c.dashboard_order_staff_id'),
  true
);
set local role authenticated;

do $$
begin
  begin
    perform public.get_restaurant_dashboard(
      current_setting('phase3c.dashboard_restaurant_id')::uuid,
      'daily'
    );
    raise exception 'Order-processing staff unexpectedly accessed dashboard';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase3c.dashboard_non_staff_id'),
  true
);
set local role authenticated;

do $$
begin
  begin
    perform public.get_restaurant_dashboard(
      current_setting('phase3c.dashboard_restaurant_id')::uuid,
      'daily'
    );
    raise exception 'Non-staff user unexpectedly accessed dashboard';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    perform public.get_restaurant_dashboard(
      current_setting('phase3c.dashboard_restaurant_id')::uuid,
      'daily'
    );
    raise exception 'Anonymous user unexpectedly accessed dashboard';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

rollback;

select test_case, result
from (
  values
    ('administrator pickup-only daily aggregates', 'passed'),
    ('legacy delivery exclusion from dashboard data', 'passed'),
    ('manager weekly dashboard', 'passed'),
    ('order staff dashboard denial', 'passed'),
    ('non-staff dashboard denial', 'passed'),
    ('anonymous dashboard denial', 'passed')
) as test_results(test_case, result);
