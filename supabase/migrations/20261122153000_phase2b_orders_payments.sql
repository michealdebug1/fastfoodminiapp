create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  district text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_customer_default_idx
  on public.addresses (customer_id, is_default);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_number text,
  restaurant_id uuid not null references public.restaurants(id),
  customer_id uuid references public.profiles(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  fulfillment_type public.fulfillment_type not null,
  status public.order_status not null default 'pending',
  currency text not null default 'UZS'
    constraint orders_currency_check check (currency = 'UZS'),
  subtotal bigint not null
    constraint orders_subtotal_check check (subtotal >= 0),
  discount_total bigint not null default 0
    constraint orders_discount_check check (discount_total >= 0),
  delivery_fee bigint not null default 0
    constraint orders_delivery_fee_check check (delivery_fee >= 0),
  total bigint not null
    constraint orders_total_check check (total >= 0),
  payment_method public.payment_method not null default 'cash',
  customer_note text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_consistency_check
    check (total = subtotal - discount_total + delivery_fee)
);

create unique index orders_public_number_idx
  on public.orders (restaurant_id, public_number)
  where public_number is not null;
create index orders_restaurant_status_created_idx
  on public.orders (restaurant_id, status, created_at desc);
create index orders_customer_created_idx
  on public.orders (customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name jsonb not null default '{}'::jsonb,
  quantity integer not null
    constraint order_items_quantity_check check (quantity > 0),
  unit_price bigint not null
    constraint order_items_unit_price_check check (unit_price >= 0),
  line_total bigint not null
    constraint order_items_line_total_check check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  option_id uuid references public.product_options(id) on delete set null,
  option_value_id uuid references public.product_option_values(id) on delete set null,
  option_name jsonb not null default '{}'::jsonb,
  value_name jsonb not null default '{}'::jsonb,
  price_delta bigint not null default 0
    constraint order_item_options_delta_check check (price_delta >= 0),
  created_at timestamptz not null default now()
);

create index order_item_options_item_idx
  on public.order_item_options (order_item_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount bigint not null
    constraint payments_amount_check check (amount >= 0),
  currency text not null default 'UZS'
    constraint payments_currency_check check (currency = 'UZS'),
  provider_reference text,
  verified_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_verified_consistency_check
    check (
      (status = 'verified' and verified_at is not null)
      or (status <> 'verified')
    ),
  unique (order_id, provider)
);

create index payments_order_status_idx
  on public.payments (order_id, status);

create table public.order_idempotency_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  idempotency_key_hash text not null,
  request_hash text not null,
  status text not null default 'processing'
    constraint order_idempotency_status_check
    check (status in ('processing', 'completed', 'failed')),
  order_id uuid references public.orders(id) on delete set null,
  error_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (restaurant_id, idempotency_key_hash)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_restaurant_created_idx
  on public.audit_logs (restaurant_id, created_at desc);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_profile();

create or replace function public.validate_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  allowed boolean;
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := public.has_restaurant_role(
    new.restaurant_id,
    array['administrator','manager','order_staff']
  );
  if not allowed then
    raise exception 'Only authorized restaurant staff may change order status';
  end if;

  if old.status = 'pending' and new.status not in ('confirmed','cancelled') then
    raise exception 'Invalid order status transition: pending -> %', new.status;
  end if;
  if old.status = 'confirmed' and new.status not in ('preparing','cancelled') then
    raise exception 'Invalid order status transition: confirmed -> %', new.status;
  end if;
  if old.status = 'preparing' and new.status not in ('ready','cancelled') then
    raise exception 'Invalid order status transition: preparing -> %', new.status;
  end if;
  if old.status = 'ready' and new.status not in ('out_for_delivery','delivered','cancelled') then
    raise exception 'Invalid order status transition: ready -> %', new.status;
  end if;
  if old.status = 'out_for_delivery' and new.status not in ('delivered','cancelled') then
    raise exception 'Invalid order status transition: out_for_delivery -> %', new.status;
  end if;
  if old.status in ('delivered','cancelled') then
    raise exception 'A terminal order status cannot be changed';
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at = coalesce(new.cancelled_at, now());
  end if;

  insert into public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    note
  )
  values (
    new.id,
    old.status,
    new.status,
    auth.uid(),
    null
  );

  insert into public.audit_logs (
    restaurant_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  )
  values (
    new.restaurant_id,
    auth.uid(),
    'order.status.changed',
    'order',
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status),
    '{}'::jsonb
  );

  return new;
end;
$$;

create trigger orders_validate_status_change
  before update of status on public.orders
  for each row execute function public.validate_order_status_change();

create or replace function public.protect_order_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (
    new.public_number is distinct from old.public_number
    or new.restaurant_id is distinct from old.restaurant_id
    or new.customer_id is distinct from old.customer_id
    or new.address_id is distinct from old.address_id
    or new.fulfillment_type is distinct from old.fulfillment_type
    or new.currency is distinct from old.currency
    or new.subtotal is distinct from old.subtotal
    or new.discount_total is distinct from old.discount_total
    or new.delivery_fee is distinct from old.delivery_fee
    or new.total is distinct from old.total
    or new.payment_method is distinct from old.payment_method
    or new.customer_note is distinct from old.customer_note
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Only the order status may be changed through application access';
  end if;
  return new;
end;
$$;

create trigger orders_protect_fields
  before update on public.orders
  for each row execute function public.protect_order_fields();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger addresses_set_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.payments enable row level security;
alter table public.order_idempotency_requests enable row level security;
alter table public.order_status_history enable row level security;
alter table public.audit_logs enable row level security;

create policy addresses_own_read on public.addresses
  for select to authenticated
  using (customer_id = auth.uid());

create policy addresses_own_manage on public.addresses
  for all to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy addresses_staff_read on public.addresses
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.address_id = addresses.id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

create policy orders_customer_read on public.orders
  for select to authenticated
  using (customer_id = auth.uid());

create policy orders_staff_read on public.orders
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

create policy orders_staff_status_update on public.orders
  for update to authenticated
  using (
    public.has_restaurant_role(
      restaurant_id,
      array['administrator','manager','order_staff']
    )
  )
  with check (
    public.has_restaurant_role(
      restaurant_id,
      array['administrator','manager','order_staff']
    )
  );

create policy order_items_customer_read on public.order_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy order_items_staff_read on public.order_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

create policy order_item_options_customer_read on public.order_item_options
  for select to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_options.order_item_id
        and o.customer_id = auth.uid()
    )
  );

create policy order_item_options_staff_read on public.order_item_options
  for select to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_options.order_item_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

create policy payments_customer_read on public.payments
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = payments.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy payments_staff_read on public.payments
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = payments.order_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

create policy order_status_history_staff_read on public.order_status_history
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_status_history.order_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

create policy order_status_history_customer_read on public.order_status_history
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_status_history.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy audit_logs_staff_read on public.audit_logs
  for select to authenticated
  using (
    public.has_restaurant_role(
      restaurant_id,
      array['administrator','manager','order_staff']
    )
  );

revoke all on public.addresses, public.orders, public.order_items,
  public.order_item_options, public.payments, public.order_idempotency_requests,
  public.order_status_history, public.audit_logs
  from anon, authenticated;

grant select, insert, update, delete on public.addresses to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.order_item_options,
  public.payments, public.order_status_history
  to authenticated;
grant select on public.audit_logs to authenticated;
