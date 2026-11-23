alter type public.order_status
  add value if not exists 'ready_for_pickup';
alter type public.order_status
  add value if not exists 'completed';
