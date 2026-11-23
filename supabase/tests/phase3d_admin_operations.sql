begin;

create temporary table phase3d_test_context (
  restaurant_id uuid not null,
  category_id uuid not null,
  admin_id uuid not null,
  manager_id uuid not null,
  order_staff_id uuid not null,
  non_staff_id uuid not null,
  product_id uuid not null,
  order_id uuid not null,
  address_id uuid not null,
  order_item_id uuid not null,
  order_item_option_id uuid not null
) on commit drop;

insert into phase3d_test_context
select
  restaurant.id,
  category.id,
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid()
from public.restaurants restaurant
join lateral (
  select id
  from public.categories
  where restaurant_id = restaurant.id
    and is_active
    and deleted_at is null
  order by display_order
  limit 1
) category on true
where restaurant.slug = 'bun-run-tashkent'
  and restaurant.is_active
limit 1;

do $$
begin
  if not exists (select 1 from phase3d_test_context) then
    raise exception 'An active development restaurant and category are required';
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
       'phase3d.' || test_ids.role_name || '.' || test_ids.user_id || '@example.test',
       now(),
       now(),
       false,
       false
from phase3d_test_context context
cross join lateral (
  values
    (context.admin_id, 'administrator'),
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
from phase3d_test_context context
cross join lateral (
  values
    (context.admin_id, 'administrator'),
    (context.manager_id, 'manager'),
    (context.order_staff_id, 'order_staff')
) as staff(user_id, role_slug)
join public.roles on roles.slug = staff.role_slug;

insert into public.products (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price
)
select
  product_id,
  restaurant_id,
  category_id,
  '{"uz":"Phase3D test product","ru":"Тестовый товар Phase3D"}'::jsonb,
  '{"uz":"","ru":""}'::jsonb,
  10000
from phase3d_test_context;

insert into public.addresses (
  id,
  customer_id,
  recipient_name,
  phone,
  line1,
  city
)
select
  address_id,
  non_staff_id,
  'Fictional Phase3D Recipient',
  '+998 00 000 00 01',
  '1 Test Street',
  'Tashkent'
from phase3d_test_context;

insert into public.orders (
  id,
  public_number,
  restaurant_id,
  customer_id,
  address_id,
  fulfillment_type,
  status,
  subtotal,
  delivery_fee,
  total,
  payment_method
)
select
  order_id,
  'TEST-' || left(order_id::text, 8),
  restaurant_id,
  non_staff_id,
  address_id,
  'delivery',
  'pending',
  10000,
  0,
  10000,
  'cash'
from phase3d_test_context;

insert into public.order_items (
  id,
  order_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  line_total
)
select
  order_item_id,
  order_id,
  product_id,
  '{"uz":"Phase3D test product","ru":"Тестовый товар Phase3D"}'::jsonb,
  1,
  10000,
  10000
from phase3d_test_context;

insert into public.order_item_options (
  id,
  order_item_id,
  option_name,
  value_name,
  price_delta
)
select
  order_item_option_id,
  order_item_id,
  '{"uz":"Qo''shimcha","ru":"Дополнительно"}'::jsonb,
  '{"uz":"Pishloq","ru":"Сыр"}'::jsonb,
  0
from phase3d_test_context;

insert into public.payments (
  order_id,
  provider,
  status,
  amount,
  currency
)
select order_id, 'cash', 'pending', 10000, 'UZS'
from phase3d_test_context;

select set_config(
  'phase3d.restaurant_id',
  (select restaurant_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.product_id',
  (select product_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.order_id',
  (select order_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.admin_id',
  (select admin_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.manager_id',
  (select manager_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.order_staff_id',
  (select order_staff_id::text from phase3d_test_context),
  true
);
select set_config(
  'phase3d.non_staff_id',
  (select non_staff_id::text from phase3d_test_context),
  true
);

select set_config('request.jwt.claim.sub', current_setting('phase3d.admin_id'), true);
set local role authenticated;

do $$
declare
  affected integer;
  image_name text;
begin
  update public.restaurants
  set name = 'Phase3D administrator rollback test'
  where id = current_setting('phase3d.restaurant_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Administrator could not update restaurant information';
  end if;

  update public.restaurant_settings
  set delivery_fee = delivery_fee + 1
  where restaurant_id = current_setting('phase3d.restaurant_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Administrator could not update restaurant settings';
  end if;

  update public.products
  set price = price + 1
  where id = current_setting('phase3d.product_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Administrator could not update a product';
  end if;

  image_name := current_setting('phase3d.restaurant_id')
    || '/products/'
    || current_setting('phase3d.product_id')
    || '/phase3d-admin.png';
  insert into storage.objects (bucket_id, name, owner, metadata)
  values (
    'restaurant-product-images',
    image_name,
    current_setting('phase3d.admin_id')::uuid,
    '{"mimetype":"image/png","size":128}'::jsonb
  );
  if not public.has_restaurant_role(
    current_setting('phase3d.restaurant_id')::uuid,
    array['administrator', 'manager']
  ) then
    raise exception 'Administrator image management role check failed';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('phase3d.manager_id'), true);
set local role authenticated;

do $$
declare
  affected integer;
  image_name text;
  foreign_image_name text;
begin
  update public.restaurants
  set phone = '+998 00 000 00 00'
  where id = current_setting('phase3d.restaurant_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Manager could not update restaurant information';
  end if;

  update public.restaurant_settings
  set minimum_order_amount = minimum_order_amount + 1
  where restaurant_id = current_setting('phase3d.restaurant_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Manager could not update restaurant settings';
  end if;

  update public.products
  set is_available = false
  where id = current_setting('phase3d.product_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Manager could not update product availability';
  end if;

  image_name := current_setting('phase3d.restaurant_id')
    || '/products/'
    || current_setting('phase3d.product_id')
    || '/phase3d-manager.webp';
  insert into storage.objects (bucket_id, name, owner, metadata)
  values (
    'restaurant-product-images',
    image_name,
    current_setting('phase3d.manager_id')::uuid,
    '{"mimetype":"image/webp","size":128}'::jsonb
  );
  if not public.has_restaurant_role(
    current_setting('phase3d.restaurant_id')::uuid,
    array['administrator', 'manager']
  ) then
    raise exception 'Manager image management role check failed';
  end if;

  foreign_image_name := gen_random_uuid()::text
    || '/products/'
    || current_setting('phase3d.product_id')
    || '/foreign.webp';
  begin
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'restaurant-product-images',
      foreign_image_name,
      current_setting('phase3d.manager_id')::uuid,
      '{"mimetype":"image/webp","size":128}'::jsonb
    );
    raise exception 'Manager unexpectedly uploaded to another restaurant path';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('phase3d.order_staff_id'), true);
set local role authenticated;

do $$
declare
  affected integer;
  status_rejected boolean := false;
begin
  if public.has_restaurant_role(
    current_setting('phase3d.restaurant_id')::uuid,
    array['administrator', 'manager']
  ) then
    raise exception 'Order staff unexpectedly passed the image deletion role check';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = current_setting('phase3d.order_id')::uuid
  ) then
    raise exception 'Order staff could not view its restaurant order';
  end if;
  if not exists (
    select 1
    from public.addresses
    where id = (
      select address_id
      from public.orders
      where id = current_setting('phase3d.order_id')::uuid
    )
      and recipient_name = 'Fictional Phase3D Recipient'
  ) then
    raise exception 'Order staff could not view authorized delivery information';
  end if;
  if not exists (
    select 1
    from public.order_items item
    join public.order_item_options option on option.order_item_id = item.id
    where item.order_id = current_setting('phase3d.order_id')::uuid
  ) then
    raise exception 'Order staff could not view items and selected extras';
  end if;
  if not exists (
    select 1
    from public.payments
    where order_id = current_setting('phase3d.order_id')::uuid
      and status = 'pending'
  ) then
    raise exception 'Order staff could not view the payment status';
  end if;

  update public.restaurant_settings
  set delivery_fee = delivery_fee + 1
  where restaurant_id = current_setting('phase3d.restaurant_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Order staff unexpectedly changed restaurant settings';
  end if;

  update public.products
  set is_available = true
  where id = current_setting('phase3d.product_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Order staff unexpectedly changed a product';
  end if;

  update public.orders
  set status = 'confirmed'
  where id = current_setting('phase3d.order_id')::uuid
    and status = 'pending';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Order staff could not perform an allowed status transition';
  end if;

  begin
    update public.orders
    set status = 'delivered'
    where id = current_setting('phase3d.order_id')::uuid
      and status = 'confirmed';
  exception
    when sqlstate 'P0001' then
      status_rejected := true;
  end;
  if not status_rejected then
    raise exception 'The database did not reject an invalid status transition';
  end if;

  update public.orders
  set status = 'preparing'
  where id = current_setting('phase3d.order_id')::uuid
    and status = 'pending';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'A stale expected status unexpectedly matched';
  end if;

  if (
    select count(*)
    from public.order_status_history
    where order_id = current_setting('phase3d.order_id')::uuid
  ) <> 1 then
    raise exception 'The database did not record the successful status change';
  end if;

  begin
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'restaurant-product-images',
      current_setting('phase3d.restaurant_id')
        || '/products/'
        || current_setting('phase3d.product_id')
        || '/unauthorized.png',
      current_setting('phase3d.order_staff_id')::uuid,
      '{"mimetype":"image/png","size":128}'::jsonb
    );
    raise exception 'Order staff unexpectedly uploaded product images';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('phase3d.non_staff_id'), true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  update public.products
  set is_available = true
  where id = current_setting('phase3d.product_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Non-staff user unexpectedly changed a product';
  end if;
end;
$$;

reset role;
set local role anon;

do $$
declare
  affected integer;
begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values (
      'restaurant-product-images',
      current_setting('phase3d.restaurant_id')
        || '/products/'
        || current_setting('phase3d.product_id')
        || '/anonymous.png',
      '{"mimetype":"image/png","size":128}'::jsonb
    );
    raise exception 'Anonymous user unexpectedly uploaded a product image';
  exception
    when insufficient_privilege then
      null;
  end;

  select count(*) into affected
  from storage.objects
  where bucket_id = 'restaurant-product-images'
    and name = current_setting('phase3d.restaurant_id')
      || '/products/'
      || current_setting('phase3d.product_id')
      || '/phase3d-manager.webp';
  if affected <> 1 then
    raise exception 'Public product image read access is unavailable';
  end if;
end;
$$;

reset role;

do $$
declare
  delete_policy text;
begin
  select qual
  into delete_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'product_images_staff_delete'
    and cmd = 'DELETE';

  if delete_policy is null
    or position('has_restaurant_role' in delete_policy) = 0
    or position('administrator' in delete_policy) = 0
    or position('manager' in delete_policy) = 0
  then
    raise exception 'Product image deletion policy is missing its staff role scope';
  end if;
end;
$$;

rollback;

select test_case, result
from (
  values
    ('administrator restaurant, product and image upload', 'passed'),
    ('manager restaurant, product and image upload', 'passed'),
    ('image deletion policy has management-role scope', 'passed'),
    ('order staff order, delivery, item, extra and payment access', 'passed'),
    ('order staff allowed status and denied management operations', 'passed'),
    ('database transition and stale-status validation', 'passed'),
    ('non-staff management denial', 'passed'),
    ('anonymous image read and upload denial', 'passed'),
    ('all synthetic data rolled back', 'passed')
) as test_results(test_case, result);
