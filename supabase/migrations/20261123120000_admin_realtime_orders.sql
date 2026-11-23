-- Publish order changes to Supabase Realtime for the admin panel.
--
-- Additive and idempotent: the table is added to the existing Supabase-managed
-- publication only when it is not already present. Existing RLS policies
-- (orders_staff_read) continue to scope delivered events to authorized staff
-- of the matching restaurant.
--
-- Prepared for review only. Do not apply to production without explicit
-- approval after inspecting the live publication configuration.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end
$$;
