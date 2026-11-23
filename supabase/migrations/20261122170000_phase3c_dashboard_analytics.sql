create index if not exists orders_restaurant_created_at_idx
  on public.orders (restaurant_id, created_at desc);

create index if not exists orders_restaurant_status_updated_idx
  on public.orders (restaurant_id, status, updated_at desc);

create index if not exists payments_verified_at_order_idx
  on public.payments (verified_at desc, order_id)
  where status = 'verified';

create or replace function public.get_restaurant_dashboard(
  p_restaurant_id uuid,
  p_period text default 'daily'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  restaurant_timezone constant text := 'Asia/Tashkent';
  local_now timestamp without time zone;
  today_start timestamp without time zone;
  today_end timestamp without time zone;
  chart_start timestamp without time zone;
  chart_end timestamp without time zone;
  chart_interval interval;
  chart_unit text;
  chart_start_at timestamptz;
  chart_end_at timestamptz;
  orders_today bigint;
  gross_order_value_today numeric;
  collected_revenue_today numeric;
  pending_orders bigint;
  completed_orders_today bigint;
  sales jsonb;
  popular_products jsonb;
  recent_orders jsonb;
  recent_status_changes jsonb;
begin
  if p_restaurant_id is null then
    raise exception using
      errcode = '22023',
      message = 'A restaurant is required';
  end if;

  if p_period is null or p_period not in ('daily', 'weekly') then
    raise exception using
      errcode = '22023',
      message = 'Period must be daily or weekly';
  end if;

  if auth.uid() is null
    or not public.has_restaurant_role(
      p_restaurant_id,
      array['administrator', 'manager']
    )
  then
    raise exception using
      errcode = '42501',
      message = 'Dashboard access denied';
  end if;

  local_now := now() at time zone restaurant_timezone;
  today_start := date_trunc('day', local_now);
  today_end := today_start + interval '1 day';

  if p_period = 'daily' then
    chart_unit := 'day';
    chart_interval := interval '1 day';
    chart_start := today_start - interval '6 days';
    chart_end := today_start;
  else
    chart_unit := 'week';
    chart_interval := interval '1 week';
    chart_start := date_trunc('week', local_now) - interval '7 weeks';
    chart_end := date_trunc('week', local_now);
  end if;

  chart_start_at := chart_start at time zone restaurant_timezone;
  chart_end_at := today_end at time zone restaurant_timezone;

  select
    count(*),
    coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)
  into orders_today, gross_order_value_today
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and o.created_at >= today_start at time zone restaurant_timezone
    and o.created_at < today_end at time zone restaurant_timezone;

  select coalesce(sum(p.amount), 0)
  into collected_revenue_today
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.restaurant_id = p_restaurant_id
    and p.status = 'verified'
    and p.verified_at >= today_start at time zone restaurant_timezone
    and p.verified_at < today_end at time zone restaurant_timezone;

  select count(*)
  into pending_orders
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and o.status = 'pending';

  select count(*)
  into completed_orders_today
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and o.status = 'delivered'
    and o.updated_at >= today_start at time zone restaurant_timezone
    and o.updated_at < today_end at time zone restaurant_timezone;

  with buckets as (
    select bucket_start
    from generate_series(chart_start, chart_end, chart_interval)
      as generated(bucket_start)
  ),
  order_totals as (
    select
      date_trunc(chart_unit, o.created_at at time zone restaurant_timezone) as bucket_start,
      sum(o.total) as gross_order_value
    from public.orders o
    where o.restaurant_id = p_restaurant_id
      and o.status <> 'cancelled'
      and o.created_at >= chart_start_at
      and o.created_at < today_end at time zone restaurant_timezone
    group by 1
  ),
  payment_totals as (
    select
      date_trunc(chart_unit, p.verified_at at time zone restaurant_timezone) as bucket_start,
      sum(p.amount) as collected_revenue
    from public.payments p
    join public.orders o on o.id = p.order_id
    where o.restaurant_id = p_restaurant_id
      and p.status = 'verified'
      and p.verified_at >= chart_start_at
      and p.verified_at < today_end at time zone restaurant_timezone
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(b.bucket_start, 'YYYY-MM-DD'),
        'label', case
          when p_period = 'weekly' then to_char(b.bucket_start, 'Mon DD')
          else to_char(b.bucket_start, 'Dy DD')
        end,
        'gross_order_value', coalesce(ot.gross_order_value, 0)::text,
        'collected_revenue', coalesce(pt.collected_revenue, 0)::text
      )
      order by b.bucket_start
    ),
    '[]'::jsonb
  )
  into sales
  from buckets b
  left join order_totals ot using (bucket_start)
  left join payment_totals pt using (bucket_start);

  with item_totals as (
    select
      coalesce(
        oi.product_name ->> 'uz',
        oi.product_name ->> 'ru',
        'Unnamed product'
      ) as product_name,
      sum(oi.quantity)::bigint as units_ordered,
      sum(
        oi.line_total
        + coalesce(options.option_total, 0) * oi.quantity
      ) as revenue_contribution
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    left join lateral (
      select sum(oio.price_delta) as option_total
      from public.order_item_options oio
      where oio.order_item_id = oi.id
    ) options on true
    where o.restaurant_id = p_restaurant_id
      and o.status <> 'cancelled'
      and o.created_at >= chart_start_at
      and o.created_at < today_end at time zone restaurant_timezone
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', product_name,
        'units_ordered', units_ordered,
        'revenue_contribution', revenue_contribution::text
      )
      order by units_ordered desc, revenue_contribution desc, product_name
    ),
    '[]'::jsonb
  )
  into popular_products
  from (
    select *
    from item_totals
    order by units_ordered desc, revenue_contribution desc, product_name
    limit 5
  ) top_products;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reference', coalesce(
          latest.public_number,
          upper(left(latest.id::text, 8))
        ),
        'customer', latest.recipient_name,
        'total', latest.total::text,
        'status', latest.status::text,
        'created_at', latest.created_at
      )
      order by latest.created_at desc
    ),
    '[]'::jsonb
  )
  into recent_orders
  from (
    select
      o.id,
      o.public_number,
      a.recipient_name,
      o.total,
      o.status,
      o.created_at
    from public.orders o
    left join public.addresses a on a.id = o.address_id
    where o.restaurant_id = p_restaurant_id
    order by o.created_at desc
    limit 8
  ) latest;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reference', coalesce(
          latest.public_number,
          upper(left(latest.id::text, 8))
        ),
        'previous_status', latest.previous_status,
        'new_status', latest.new_status,
        'created_at', latest.created_at
      )
      order by latest.created_at desc
    ),
    '[]'::jsonb
  )
  into recent_status_changes
  from (
    select
      h.id,
      o.id as order_id,
      o.public_number,
      h.previous_status,
      h.new_status,
      h.created_at
    from public.order_status_history h
    join public.orders o on o.id = h.order_id
    where o.restaurant_id = p_restaurant_id
    order by h.created_at desc
    limit 8
  ) latest;

  return jsonb_build_object(
    'timezone', restaurant_timezone,
    'period', p_period,
    'generated_at', now(),
    'metrics', jsonb_build_object(
      'orders_today', orders_today,
      'gross_order_value_today', gross_order_value_today::text,
      'collected_revenue_today', collected_revenue_today::text,
      'pending_orders', pending_orders,
      'completed_orders_today', completed_orders_today
    ),
    'sales', sales,
    'popular_products', popular_products,
    'recent_orders', recent_orders,
    'recent_status_changes', recent_status_changes
  );
end;
$$;

revoke all on function public.get_restaurant_dashboard(uuid, text)
  from public, anon;
grant execute on function public.get_restaurant_dashboard(uuid, text)
  to authenticated;
