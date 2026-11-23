create or replace function public.mark_cash_payment_paid(p_payment_id uuid)
returns table (
  payment_id uuid,
  order_id uuid,
  status public.payment_status,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_order_id uuid;
  v_restaurant_id uuid;
  v_order_status public.order_status;
  v_fulfillment_type public.fulfillment_type;
  v_order_payment_method public.payment_method;
  v_provider public.payment_method;
  v_payment_status public.payment_status;
  v_verified_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Staff authentication is required';
  end if;

  select p.order_id, o.restaurant_id, o.status, o.fulfillment_type,
    o.payment_method, p.provider, p.status, p.verified_at
  into v_order_id, v_restaurant_id, v_order_status, v_fulfillment_type,
    v_order_payment_method, v_provider, v_payment_status, v_verified_at
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = p_payment_id
  for update of p, o;

  if not found then
    raise exception 'Payment is unavailable to this staff account';
  end if;

  if not public.has_restaurant_role(
    v_restaurant_id,
    array['administrator','manager','order_staff']
  ) then
    raise exception 'Payment is unavailable to this staff account';
  end if;

  if v_fulfillment_type <> 'pickup'
    or v_order_payment_method <> 'cash'
    or v_provider <> 'cash' then
    raise exception 'Only in-person cash payments can be confirmed here';
  end if;

  if v_payment_status = 'verified' then
    return query
      select p.id, p.order_id, p.status, p.verified_at
      from public.payments p
      where p.id = p_payment_id;
    return;
  end if;

  if v_payment_status <> 'pending' or v_order_status = 'cancelled' then
    raise exception 'This payment cannot be confirmed';
  end if;

  update public.payments p
  set status = 'verified',
    verified_at = now()
  where p.id = p_payment_id
  returning p.verified_at into v_verified_at;

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
    v_restaurant_id,
    auth.uid(),
    'payment.cash.confirmed',
    'payment',
    p_payment_id,
    jsonb_build_object('status', v_payment_status),
    jsonb_build_object('status', 'verified'),
    jsonb_build_object('order_id', v_order_id)
  );

  return query
    select p.id, p.order_id, p.status, p.verified_at
    from public.payments p
    where p.id = p_payment_id;
end;
$$;

revoke all on function public.mark_cash_payment_paid(uuid) from public, anon;
grant execute on function public.mark_cash_payment_paid(uuid) to authenticated;
