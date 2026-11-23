create extension if not exists "pgcrypto";

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.payment_method as enum ('cash', 'click', 'payme');
create type public.payment_status as enum (
  'pending',
  'processing',
  'verified',
  'failed',
  'refunded',
  'cancelled'
);
create type public.promotion_type as enum ('percentage', 'fixed');
create type public.notification_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  address text,
  phone text,
  branding jsonb not null default '{}'::jsonb,
  timezone text not null default 'Asia/Tashkent'
    constraint restaurants_timezone_check check (timezone = 'Asia/Tashkent'),
  currency text not null default 'UZS'
    constraint restaurants_currency_check check (currency = 'UZS'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.restaurants add constraint restaurants_id_scope_unique unique (id, slug);

create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  working_hours jsonb not null default '{}'::jsonb,
  minimum_order_amount bigint not null default 0
    constraint restaurant_settings_minimum_check check (minimum_order_amount >= 0),
  delivery_fee bigint not null default 0
    constraint restaurant_settings_delivery_fee_check check (delivery_fee >= 0),
  free_delivery_threshold bigint,
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  locale text not null default 'uz'
    constraint profiles_locale_check check (locale in ('uz', 'ru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id smallint generated always as identity primary key,
  slug text not null unique
    constraint roles_slug_check check (slug in ('administrator', 'manager', 'order_staff')),
  name text not null
);

insert into public.roles (slug, name) values
  ('administrator', 'Administrator'),
  ('manager', 'Manager'),
  ('order_staff', 'Order processing staff');

create table public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role_id smallint not null references public.roles(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, auth_user_id)
);

create index restaurant_staff_auth_user_idx
  on public.restaurant_staff (auth_user_id) where is_active;
create index restaurant_staff_restaurant_role_idx
  on public.restaurant_staff (restaurant_id, role_id) where is_active;

create or replace function public.is_restaurant_staff(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.restaurant_staff rs
    where rs.restaurant_id = p_restaurant_id
      and rs.auth_user_id = auth.uid()
      and rs.is_active
  );
$$;

create or replace function public.has_restaurant_role(
  p_restaurant_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.restaurant_staff rs
    join public.roles r on r.id = rs.role_id
    where rs.restaurant_id = p_restaurant_id
      and rs.auth_user_id = auth.uid()
      and rs.is_active
      and r.slug = any(p_roles)
  );
$$;

revoke execute on function public.is_restaurant_staff(uuid) from public, anon;
revoke execute on function public.has_restaurant_role(uuid, text[]) from public, anon;
grant execute on function public.is_restaurant_staff(uuid) to authenticated;
grant execute on function public.has_restaurant_role(uuid, text[]) to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name jsonb not null default '{}'::jsonb,
  image_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories add constraint categories_id_restaurant_unique unique (id, restaurant_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  price bigint not null
    constraint products_price_check check (price >= 0),
  image_path text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_category_restaurant_check
    foreign key (category_id, restaurant_id)
    references public.categories(id, restaurant_id)
    deferrable initially deferred
);
alter table public.products add constraint products_id_restaurant_unique unique (id, restaurant_id);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  min_selections integer not null default 0
    constraint product_options_min_check check (min_selections >= 0),
  max_selections integer,
  display_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_selection_check
    check (max_selections is null or max_selections >= min_selections),
  constraint product_options_product_restaurant_check
    foreign key (product_id, restaurant_id)
    references public.products(id, restaurant_id)
    deferrable initially deferred
);
alter table public.product_options add constraint product_options_id_restaurant_unique unique (id, restaurant_id);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  option_id uuid not null references public.product_options(id) on delete cascade,
  name jsonb not null default '{}'::jsonb,
  price_delta bigint not null default 0
    constraint product_option_values_delta_check check (price_delta >= 0),
  is_available boolean not null default true,
  display_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_values_option_restaurant_check
    foreign key (option_id, restaurant_id)
    references public.product_options(id, restaurant_id)
    deferrable initially deferred
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  name jsonb not null default '{}'::jsonb,
  promotion_type public.promotion_type not null,
  value bigint not null
    constraint promotions_value_check check (value >= 0),
  minimum_order_amount bigint not null default 0
    constraint promotions_minimum_check check (minimum_order_amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0
    constraint promotions_used_check check (used_count >= 0),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_validity_check
    check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint promotions_usage_check
    check (usage_limit is null or used_count <= usage_limit),
  unique (restaurant_id, code)
);

create index categories_restaurant_active_idx
  on public.categories (restaurant_id, display_order) where is_active and deleted_at is null;
create index products_restaurant_available_idx
  on public.products (restaurant_id, is_available, display_order) where deleted_at is null;
create index products_category_idx on public.products (category_id);
create index product_options_product_idx
  on public.product_options (product_id, display_order) where deleted_at is null;
create index product_option_values_option_idx
  on public.product_option_values (option_id, display_order) where deleted_at is null;
create index promotions_restaurant_active_idx
  on public.promotions (restaurant_id, starts_at, ends_at) where is_active and deleted_at is null;

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

create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger restaurant_settings_set_updated_at before update on public.restaurant_settings
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger restaurant_staff_set_updated_at before update on public.restaurant_staff
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_options_set_updated_at before update on public.product_options
  for each row execute function public.set_updated_at();
create trigger product_option_values_set_updated_at before update on public.product_option_values
  for each row execute function public.set_updated_at();
create trigger promotions_set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;
alter table public.promotions enable row level security;

create policy restaurants_public_read on public.restaurants
  for select to anon, authenticated
  using (is_active);

create policy restaurant_settings_public_read on public.restaurant_settings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_settings.restaurant_id and r.is_active
    )
  );

create policy restaurant_settings_staff_read on public.restaurant_settings
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

create policy restaurant_settings_administrator_write on public.restaurant_settings
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

create policy profiles_own_read on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_own_write on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy roles_authenticated_read on public.roles
  for select to authenticated using (true);

create policy restaurant_staff_member_read on public.restaurant_staff
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_restaurant_staff(restaurant_id));

create policy restaurant_staff_administrator_manage on public.restaurant_staff
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator']));

create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (is_active and deleted_at is null);

create policy categories_staff_manage on public.categories
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

create policy products_public_read on public.products
  for select to anon, authenticated
  using (
    is_available
    and deleted_at is null
    and exists (
      select 1 from public.restaurants r
      where r.id = products.restaurant_id and r.is_active
    )
  );

create policy products_staff_manage on public.products
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

create policy product_options_public_read on public.product_options
  for select to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.products p
      where p.id = product_options.product_id
        and p.is_available
        and p.deleted_at is null
    )
  );

create policy product_options_staff_manage on public.product_options
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

create policy product_option_values_public_read on public.product_option_values
  for select to anon, authenticated
  using (
    is_available
    and deleted_at is null
  );

create policy product_option_values_staff_manage on public.product_option_values
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

create policy promotions_public_read on public.promotions
  for select to anon, authenticated
  using (
    is_active
    and deleted_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy promotions_staff_manage on public.promotions
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['administrator','manager']))
  with check (public.has_restaurant_role(restaurant_id, array['administrator','manager']));

revoke all on public.roles, public.restaurant_staff, public.categories,
  public.products, public.product_options, public.product_option_values,
  public.promotions, public.restaurants, public.restaurant_settings,
  public.profiles
  from anon, authenticated;

grant select on public.restaurants, public.restaurant_settings, public.categories,
  public.products, public.product_options, public.product_option_values,
  public.promotions to anon, authenticated;

grant select on public.roles to authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select on public.restaurant_staff to authenticated;
grant insert, update, delete on public.restaurant_staff to authenticated;
grant insert, update, delete on public.categories, public.products,
  public.product_options, public.product_option_values, public.promotions
  to authenticated;
grant insert, update, delete on public.restaurant_settings to authenticated;
