create sequence if not exists public.order_public_number_seq;

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
  if old.status = 'preparing' then
    if old.fulfillment_type = 'pickup'
      and new.status not in ('ready_for_pickup','cancelled') then
      raise exception 'Invalid pickup status transition: preparing -> %', new.status;
    end if;
    if old.fulfillment_type = 'delivery'
      and new.status not in ('ready','cancelled') then
      raise exception 'Invalid delivery status transition: preparing -> %', new.status;
    end if;
  end if;
  if old.status = 'ready'
    and new.status not in ('out_for_delivery','delivered','cancelled') then
    raise exception 'Invalid order status transition: ready -> %', new.status;
  end if;
  if old.status = 'ready_for_pickup' then
    if old.fulfillment_type <> 'pickup'
      or new.status not in ('completed','cancelled') then
      raise exception 'Invalid pickup status transition: ready_for_pickup -> %', new.status;
    end if;
  end if;
  if old.status = 'out_for_delivery'
    and new.status not in ('delivered','cancelled') then
    raise exception 'Invalid order status transition: out_for_delivery -> %', new.status;
  end if;
  if old.status in ('delivered','completed','cancelled') then
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

create or replace function public.place_pickup_order(
  p_idempotency_key uuid,
  p_items jsonb
)
returns table (
  order_id uuid,
  public_number text,
  status public.order_status,
  subtotal bigint,
  total bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_customer_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_active_restaurants integer;
  v_pickup_enabled boolean;
  v_minimum_order bigint;
  v_idempotency_hash text;
  v_request_hash text;
  v_idempotency_id uuid;
  v_existing_customer_id uuid;
  v_existing_hash text;
  v_existing_status text;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_public_number text;
  v_sequence_number bigint;
  v_subtotal bigint := 0;
  v_total bigint;
  v_line jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_option_value_ids uuid[];
  v_selected_count integer;
  v_valid_selected_count integer;
  v_options_total bigint;
  v_unit_price bigint;
  v_line_total bigint;
  v_item_id uuid;
  v_product public.products%rowtype;
  v_option public.product_options%rowtype;
begin
  if v_customer_id is null then
    raise exception 'Customer authentication is required';
  end if;
  if p_idempotency_key is null then
    raise exception 'An idempotency key is required';
  end if;
  if p_items is null
    or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'The cart must be a product array';
  end if;
  if jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 50 then
    raise exception 'The cart must contain between 1 and 50 product lines';
  end if;

  select count(*) into v_active_restaurants
  from public.restaurants
  where is_active;

  if v_active_restaurants <> 1 then
    raise exception 'The restaurant is unavailable for ordering';
  end if;

  select r.id,
    coalesce(rs.pickup_enabled, false),
    coalesce(rs.minimum_order_amount, 0)
  into v_restaurant_id, v_pickup_enabled, v_minimum_order
  from public.restaurants r
  left join public.restaurant_settings rs on rs.restaurant_id = r.id
  where r.is_active
  limit 1;

  if not v_pickup_enabled then
    raise exception 'Pickup ordering is currently unavailable';
  end if;

  v_idempotency_hash := md5(p_idempotency_key::text);
  v_request_hash := md5(p_items::text);

  insert into public.order_idempotency_requests (
    restaurant_id,
    customer_id,
    idempotency_key_hash,
    request_hash,
    status,
    expires_at
  )
  values (
    v_restaurant_id,
    v_customer_id,
    v_idempotency_hash,
    v_request_hash,
    'processing',
    now() + interval '1 day'
  )
  on conflict (restaurant_id, idempotency_key_hash) do nothing
  returning id into v_idempotency_id;

  if v_idempotency_id is null then
    select i.id, i.customer_id, i.request_hash, i.status, i.order_id
    into v_idempotency_id, v_existing_customer_id, v_existing_hash,
      v_existing_status, v_existing_order_id
    from public.order_idempotency_requests i
    where i.restaurant_id = v_restaurant_id
      and i.idempotency_key_hash = v_idempotency_hash
    for update;

    if v_existing_customer_id is distinct from v_customer_id then
      raise exception 'This checkout request is not available';
    end if;
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'The cart changed; submit it as a new checkout request';
    end if;

    if v_existing_status = 'completed' and v_existing_order_id is not null then
      if not exists (
        select 1
        from public.orders o
        where o.id = v_existing_order_id
          and o.customer_id = v_customer_id
      ) then
        raise exception 'The previous checkout order is no longer available';
      end if;

      return query
        select o.id, o.public_number, o.status, o.subtotal, o.total
        from public.orders o
        where o.id = v_existing_order_id
          and o.customer_id = v_customer_id;
      return;
    end if;

    if v_existing_status = 'processing'
      and exists (
        select 1
        from public.order_idempotency_requests i
        where i.id = v_idempotency_id
          and i.expires_at > now()
      ) then
      raise exception 'This checkout request is already being processed';
    end if;

    update public.order_idempotency_requests
    set status = 'processing',
      order_id = null,
      error_code = null,
      expires_at = now() + interval '1 day',
      completed_at = null
    where id = v_idempotency_id;
  end if;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_line) is distinct from 'object'
      or jsonb_typeof(v_line->'productId') is distinct from 'string'
      or jsonb_typeof(v_line->'quantity') is distinct from 'number' then
      raise exception 'A cart line is invalid';
    end if;

    if (v_line->>'quantity') !~ '^[0-9]{1,3}$' then
      raise exception 'A product quantity is invalid';
    end if;
    v_quantity := (v_line->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 20 then
      raise exception 'Product quantities must be between 1 and 20';
    end if;

    begin
      v_product_id := (v_line->>'productId')::uuid;
    exception when invalid_text_representation then
      raise exception 'A product is no longer available';
    end;

    if v_line ? 'optionValueIds'
      and jsonb_typeof(v_line->'optionValueIds') is distinct from 'array' then
      raise exception 'Product selections are invalid';
    end if;
    if jsonb_typeof(coalesce(v_line->'optionValueIds', '[]'::jsonb)) = 'array'
      and jsonb_array_length(
        coalesce(v_line->'optionValueIds', '[]'::jsonb)
      ) > 50 then
      raise exception 'Too many product extras were selected';
    end if;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_option_value_ids
    from jsonb_array_elements_text(
      coalesce(v_line->'optionValueIds', '[]'::jsonb)
    ) as selected(value);

    select count(*) into v_selected_count
    from unnest(v_option_value_ids) as selected(value);
    select count(distinct value) into v_valid_selected_count
    from unnest(v_option_value_ids) as selected(value);
    if v_selected_count <> v_valid_selected_count then
      raise exception 'The same product extra cannot be selected twice';
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_product_id
      and p.restaurant_id = v_restaurant_id
      and p.is_available
      and p.deleted_at is null
    for share;

    if not found then
      raise exception 'A product is unavailable; refresh the menu and try again';
    end if;

    select count(*) into v_valid_selected_count
    from public.product_option_values ov
    join public.product_options op
      on op.id = ov.option_id
      and op.restaurant_id = ov.restaurant_id
    where ov.id = any(v_option_value_ids)
      and ov.restaurant_id = v_restaurant_id
      and ov.is_available
      and ov.deleted_at is null
      and op.product_id = v_product_id
      and op.deleted_at is null;

    if v_valid_selected_count <> cardinality(v_option_value_ids) then
      raise exception 'A selected product extra is unavailable';
    end if;

    perform ov.id
    from public.product_option_values ov
    where ov.id = any(v_option_value_ids)
      and ov.restaurant_id = v_restaurant_id
    for share;

    for v_option in
      select op.*
      from public.product_options op
      where op.product_id = v_product_id
        and op.restaurant_id = v_restaurant_id
        and op.deleted_at is null
      for share
    loop
      select count(*) into v_selected_count
      from public.product_option_values ov
      where ov.option_id = v_option.id
        and ov.id = any(v_option_value_ids)
        and ov.restaurant_id = v_restaurant_id
        and ov.is_available
        and ov.deleted_at is null;

      if v_selected_count < greatest(
        v_option.min_selections,
        case when v_option.is_required then 1 else 0 end
      ) then
        raise exception 'A required product extra has not been selected';
      end if;
      if v_option.max_selections is not null
        and v_selected_count > v_option.max_selections then
        raise exception 'Too many values were selected for a product extra';
      end if;
    end loop;

    select coalesce(sum(ov.price_delta), 0)
    into v_options_total
    from public.product_option_values ov
    where ov.id = any(v_option_value_ids)
      and ov.restaurant_id = v_restaurant_id;

    v_unit_price := v_product.price + v_options_total;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if v_subtotal < v_minimum_order then
    raise exception 'The order does not meet the restaurant minimum';
  end if;

  v_total := v_subtotal;
  v_sequence_number := nextval('public.order_public_number_seq');
  v_public_number := 'BR-'
    || to_char(now() at time zone 'Asia/Tashkent', 'YYMMDD')
    || '-'
    || v_sequence_number::text;

  insert into public.orders (
    public_number,
    restaurant_id,
    customer_id,
    fulfillment_type,
    status,
    currency,
    subtotal,
    discount_total,
    delivery_fee,
    total,
    payment_method
  )
  values (
    v_public_number,
    v_restaurant_id,
    v_customer_id,
    'pickup',
    'pending',
    'UZS',
    v_subtotal,
    0,
    0,
    v_total,
    'cash'
  )
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_line->>'productId')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_option_value_ids
    from jsonb_array_elements_text(
      coalesce(v_line->'optionValueIds', '[]'::jsonb)
    ) as selected(value);

    select p.* into v_product
    from public.products p
    where p.id = v_product_id
      and p.restaurant_id = v_restaurant_id;

    select coalesce(sum(ov.price_delta), 0)
    into v_options_total
    from public.product_option_values ov
    where ov.id = any(v_option_value_ids)
      and ov.restaurant_id = v_restaurant_id;

    v_unit_price := v_product.price + v_options_total;
    v_line_total := v_unit_price * v_quantity;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price,
      v_line_total
    )
    returning id into v_item_id;

    insert into public.order_item_options (
      order_item_id,
      option_id,
      option_value_id,
      option_name,
      value_name,
      price_delta
    )
    select
      v_item_id,
      op.id,
      ov.id,
      op.name,
      ov.name,
      ov.price_delta
    from public.product_option_values ov
    join public.product_options op
      on op.id = ov.option_id
      and op.restaurant_id = ov.restaurant_id
    where ov.id = any(v_option_value_ids)
      and ov.restaurant_id = v_restaurant_id;
  end loop;

  insert into public.payments (
    order_id,
    provider,
    status,
    amount,
    currency
  )
  values (
    v_order_id,
    'cash',
    'pending',
    v_total,
    'UZS'
  );

  insert into public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    note
  )
  values (
    v_order_id,
    null,
    'pending',
    null,
    'Order created'
  );

  update public.order_idempotency_requests
  set status = 'completed',
    order_id = v_order_id,
    completed_at = now(),
    expires_at = now() + interval '30 days'
  where id = v_idempotency_id;

  return query
    select o.id, o.public_number, o.status, o.subtotal, o.total
    from public.orders o
    where o.id = v_order_id;
end;
$$;

revoke all on function public.place_pickup_order(uuid, jsonb) from public, anon;
grant execute on function public.place_pickup_order(uuid, jsonb) to authenticated;
