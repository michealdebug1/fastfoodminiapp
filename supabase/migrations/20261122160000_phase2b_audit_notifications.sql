create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  event_type text not null
    constraint notification_outbox_event_check
    check (event_type in (
      'order.created',
      'order.confirmed',
      'order.status.changed',
      'order.cancelled'
    )),
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0
    constraint notification_outbox_attempts_check check (attempts >= 0),
  max_attempts integer not null default 5
    constraint notification_outbox_max_attempts_check check (max_attempts >= 1),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_outbox_dispatch_idx
  on public.notification_outbox (status, next_attempt_at)
  where status in ('pending','failed');
create index notification_outbox_restaurant_created_idx
  on public.notification_outbox (restaurant_id, created_at desc);

alter table public.notification_outbox enable row level security;

create policy notification_outbox_staff_read on public.notification_outbox
  for select to authenticated
  using (
    public.has_restaurant_role(
      restaurant_id,
      array['administrator','manager','order_staff']
    )
  );

revoke all on public.notification_outbox from anon, authenticated;
grant select on public.notification_outbox to authenticated;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Audit records are immutable';
end;
$$;

create trigger audit_logs_prevent_update
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_mutation();

create or replace function public.prevent_status_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Order status history is immutable';
end;
$$;

create trigger order_status_history_prevent_update
  before update or delete on public.order_status_history
  for each row execute function public.prevent_status_history_mutation();

create or replace function public.prevent_payment_unsupported_confirmation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  online_provider boolean;
begin
  online_provider := new.provider in ('click','payme');

  if new.status = 'verified' then
    if new.verified_at is null then
      raise exception 'A verified payment requires verified_at';
    end if;

    if online_provider and coalesce(new.provider_reference, '') = '' then
      raise exception 'An online payment requires a provider reference';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_protect_confirmation
  before insert or update on public.payments
  for each row execute function public.prevent_payment_unsupported_confirmation();

create or replace function public.audit_application_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_restaurant_id uuid;
  old_json jsonb;
  new_json jsonb;
  operation_action text;
begin
  if tg_op = 'DELETE' then
    new_json := null;
    old_json := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    old_json := null;
    new_json := to_jsonb(new);
  else
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
  end if;

  if tg_table_name = 'restaurants' then
    if tg_op = 'DELETE' then
      target_restaurant_id := old.id;
    else
      target_restaurant_id := new.id;
    end if;
  elsif tg_table_name = 'restaurant_settings' then
    if tg_op = 'DELETE' then
      target_restaurant_id := old.restaurant_id;
    else
      target_restaurant_id := new.restaurant_id;
    end if;
  else
    if tg_op = 'DELETE' then
      target_restaurant_id := old.restaurant_id;
    else
      target_restaurant_id := new.restaurant_id;
    end if;
  end if;

  operation_action := tg_table_name || '.' || lower(tg_op);

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
    target_restaurant_id,
    auth.uid(),
    operation_action,
    tg_table_name,
    case
      when tg_op = 'DELETE' then old.id
      else new.id
    end,
    old_json,
    new_json,
    jsonb_build_object('trigger', 'audit_application_change')
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger restaurants_audit_change
  after insert or update or delete on public.restaurants
  for each row execute function public.audit_application_change();

create trigger restaurant_settings_audit_change
  after insert or update or delete on public.restaurant_settings
  for each row execute function public.audit_application_change();

create trigger categories_audit_change
  after insert or update or delete on public.categories
  for each row execute function public.audit_application_change();

create trigger products_audit_change
  after insert or update or delete on public.products
  for each row execute function public.audit_application_change();

create trigger product_options_audit_change
  after insert or update or delete on public.product_options
  for each row execute function public.audit_application_change();

create trigger product_option_values_audit_change
  after insert or update or delete on public.product_option_values
  for each row execute function public.audit_application_change();

create trigger promotions_audit_change
  after insert or update or delete on public.promotions
  for each row execute function public.audit_application_change();

create trigger notification_outbox_set_updated_at
  before update on public.notification_outbox
  for each row execute function public.set_updated_at();
