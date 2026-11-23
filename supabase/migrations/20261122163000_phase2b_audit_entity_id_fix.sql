create or replace function public.audit_application_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_restaurant_id uuid;
  entity_id uuid;
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
      entity_id := old.id;
    else
      target_restaurant_id := new.id;
      entity_id := new.id;
    end if;
  elsif tg_table_name = 'restaurant_settings' then
    if tg_op = 'DELETE' then
      target_restaurant_id := old.restaurant_id;
      entity_id := old.restaurant_id;
    else
      target_restaurant_id := new.restaurant_id;
      entity_id := new.restaurant_id;
    end if;
  else
    if tg_op = 'DELETE' then
      target_restaurant_id := old.restaurant_id;
      entity_id := old.id;
    else
      target_restaurant_id := new.restaurant_id;
      entity_id := new.id;
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
    entity_id,
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
