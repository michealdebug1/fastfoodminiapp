-- Deterministic fictional development seed data.
-- Do not run this seed against production.
-- No administrator accounts, passwords, or real customer information are included.

insert into public.restaurants (
  id, slug, name, description, address, phone, branding, timezone, currency, is_active
) values (
  '10000000-0000-4000-8000-000000000001',
  'bun-run-tashkent',
  'Bun Run Tashkent',
  'Fictional fast-food restaurant for development and testing.',
  '1 Fictional Street, Tashkent',
  '+998 71 000 00 00',
  '{"primaryColor":"#ef6a47","logo":"bun-run"}'::jsonb,
  'Asia/Tashkent',
  'UZS',
  true
) on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  address = excluded.address,
  phone = excluded.phone,
  branding = excluded.branding,
  timezone = excluded.timezone,
  currency = excluded.currency,
  is_active = excluded.is_active;

insert into public.restaurant_settings (
  restaurant_id,
  working_hours,
  minimum_order_amount,
  delivery_fee,
  free_delivery_threshold,
  delivery_enabled,
  pickup_enabled
) values (
  '10000000-0000-4000-8000-000000000001',
  '{"monday":{"open":"10:00","close":"23:00"},"tuesday":{"open":"10:00","close":"23:00"},"wednesday":{"open":"10:00","close":"23:00"},"thursday":{"open":"10:00","close":"23:00"},"friday":{"open":"10:00","close":"23:00"},"saturday":{"open":"10:00","close":"23:00"},"sunday":{"open":"10:00","close":"23:00"}}'::jsonb,
  35000,
  15000,
  150000,
  true,
  true
) on conflict (restaurant_id) do update set
  working_hours = excluded.working_hours,
  minimum_order_amount = excluded.minimum_order_amount,
  delivery_fee = excluded.delivery_fee,
  free_delivery_threshold = excluded.free_delivery_threshold,
  delivery_enabled = excluded.delivery_enabled,
  pickup_enabled = excluded.pickup_enabled;

insert into public.categories (
  id, restaurant_id, name, image_path, display_order, is_active
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '{"uz":"Burgerlar","ru":"Бургеры"}', null, 1, true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   '{"uz":"Tovuq","ru":"Курица"}', null, 2, true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   '{"uz":"Gazaklar","ru":"Закуски"}', null, 3, true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   '{"uz":"Ichimliklar","ru":"Напитки"}', null, 4, true)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

insert into public.products (
  id, restaurant_id, category_id, name, description, price, image_path,
  is_available, is_featured, display_order
) values
  ('30000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   '{"uz":"Smash Klassik","ru":"Смэш Классик"}',
   '{"uz":"Mol go''shti kotleti, cheddar va maxsus sous.","ru":"Говяжья котлета, чеддер и фирменный соус."}',
   89000, null, true, true, 1),
  ('30000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   '{"uz":"Ikki marta zarba","ru":"Двойной удар"}',
   '{"uz":"Ikki kotlet va ikki bo''lak pishloq.","ru":"Две котлеты и два ломтика сыра."}',
   119000, null, true, false, 2),
  ('30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '{"uz":"Xashtagi tovuq","ru":"Криспи чикен"}',
   '{"uz":"Mazali qarsildoq tovuq va kapusta.","ru":"Хрустящая курица и капустный салат."}',
   95000, null, true, true, 3),
  ('30000000-0000-4000-8000-000000000004',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000003',
   '{"uz":"Kartoshka fri","ru":"Картофель фри"}',
   '{"uz":"Qarsildoq kartoshka.","ru":"Хрустящий картофель."}',
   28000, null, true, false, 4),
  ('30000000-0000-4000-8000-000000000005',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000004',
   '{"uz":"Cola","ru":"Кола"}',
   '{"uz":"Sovuq gazli ichimlik.","ru":"Холодный газированный напиток."}',
   12000, null, true, false, 5)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  is_available = excluded.is_available,
  is_featured = excluded.is_featured,
  display_order = excluded.display_order;

insert into public.product_options (
  id, restaurant_id, product_id, name, is_required, min_selections,
  max_selections, display_order
) values
  ('40000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '{"uz":"Qo''shimcha","ru":"Дополнительно"}',
   false, 0, 3, 1)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  product_id = excluded.product_id,
  name = excluded.name,
  is_required = excluded.is_required,
  min_selections = excluded.min_selections,
  max_selections = excluded.max_selections,
  display_order = excluded.display_order;

insert into public.product_option_values (
  id, restaurant_id, option_id, name, price_delta, is_available, display_order
) values
  ('50000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000001',
   '{"uz":"Qo''shimcha pishloq","ru":"Дополнительный сыр"}',
   8000, true, 1),
  ('50000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000001',
   '{"uz":"Bekon","ru":"Бекон"}',
   12000, true, 2)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  option_id = excluded.option_id,
  name = excluded.name,
  price_delta = excluded.price_delta,
  is_available = excluded.is_available,
  display_order = excluded.display_order;

insert into public.promotions (
  id, restaurant_id, code, name, promotion_type, value,
  minimum_order_amount, starts_at, ends_at, usage_limit, is_active
) values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'WELCOME10',
  '{"uz":"Xush kelibsiz","ru":"Добро пожаловать"}',
  'percentage',
  10,
  50000,
  '2026-01-01 00:00:00+05',
  '2027-12-31 23:59:59+05',
  null,
  true
) on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  code = excluded.code,
  name = excluded.name,
  promotion_type = excluded.promotion_type,
  value = excluded.value,
  minimum_order_amount = excluded.minimum_order_amount,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = excluded.is_active;

-- Fictional example orders without customer identities.
insert into public.orders (
  id, public_number, restaurant_id, customer_id, address_id,
  fulfillment_type, status, currency, subtotal, discount_total,
  delivery_fee, total, payment_method, customer_note
) values
  ('70000000-0000-4000-8000-000000000001',
   'BR-1001', '10000000-0000-4000-8000-000000000001', null, null,
   'pickup', 'delivered', 'UZS', 89000, 0, 0, 89000, 'cash',
   'Fictional demo order'),
  ('70000000-0000-4000-8000-000000000002',
   'BR-1002', '10000000-0000-4000-8000-000000000001', null, null,
   'delivery', 'preparing', 'UZS', 119000, 11900, 15000, 122100, 'cash',
   'Fictional demo order'),
  ('70000000-0000-4000-8000-000000000003',
   'BR-1003', '10000000-0000-4000-8000-000000000001', null, null,
   'pickup', 'pending', 'UZS', 28000, 0, 0, 28000, 'cash',
   'Fictional demo order')
on conflict (id) do update set
  public_number = excluded.public_number,
  restaurant_id = excluded.restaurant_id,
  fulfillment_type = excluded.fulfillment_type,
  status = excluded.status,
  subtotal = excluded.subtotal,
  discount_total = excluded.discount_total,
  delivery_fee = excluded.delivery_fee,
  total = excluded.total,
  payment_method = excluded.payment_method,
  customer_note = excluded.customer_note;

insert into public.order_items (
  id, order_id, product_id, product_name, quantity, unit_price, line_total
) values
  ('71000000-0000-4000-8000-000000000001',
   '70000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '{"uz":"Smash Klassik","ru":"Смэш Классик"}', 1, 89000, 89000),
  ('71000000-0000-4000-8000-000000000002',
   '70000000-0000-4000-8000-000000000002',
   '30000000-0000-4000-8000-000000000002',
   '{"uz":"Ikki marta zarba","ru":"Двойной удар"}', 1, 119000, 119000),
  ('71000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000003',
   '30000000-0000-4000-8000-000000000004',
   '{"uz":"Kartoshka fri","ru":"Картофель фри"}', 1, 28000, 28000)
on conflict (id) do update set
  order_id = excluded.order_id,
  product_id = excluded.product_id,
  product_name = excluded.product_name,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  line_total = excluded.line_total;

insert into public.payments (
  id, order_id, provider, status, amount, currency,
  provider_reference, verified_at
) values
  ('72000000-0000-4000-8000-000000000001',
   '70000000-0000-4000-8000-000000000001',
   'cash', 'verified', 89000, 'UZS', 'Fictional cash receipt', now()),
  ('72000000-0000-4000-8000-000000000002',
   '70000000-0000-4000-8000-000000000002',
   'cash', 'pending', 122100, 'UZS', null, null),
  ('72000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000003',
   'cash', 'pending', 28000, 'UZS', null, null)
on conflict (id) do update set
  order_id = excluded.order_id,
  provider = excluded.provider,
  status = excluded.status,
  amount = excluded.amount,
  currency = excluded.currency,
  provider_reference = excluded.provider_reference,
  verified_at = excluded.verified_at;

insert into public.order_status_history (
  id, order_id, previous_status, new_status, changed_by, note
) values
  ('73000000-0000-4000-8000-000000000001',
   '70000000-0000-4000-8000-000000000001',
   'pending', 'confirmed', null, 'Fictional seed history'),
  ('73000000-0000-4000-8000-000000000002',
   '70000000-0000-4000-8000-000000000001',
   'confirmed', 'preparing', null, 'Fictional seed history'),
  ('73000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000001',
   'preparing', 'ready', null, 'Fictional seed history'),
  ('73000000-0000-4000-8000-000000000004',
   '70000000-0000-4000-8000-000000000001',
   'ready', 'delivered', null, 'Fictional seed history')
on conflict (id) do update set
  order_id = excluded.order_id,
  previous_status = excluded.previous_status,
  new_status = excluded.new_status,
  changed_by = excluded.changed_by,
  note = excluded.note;
