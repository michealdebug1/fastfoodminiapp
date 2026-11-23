insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'restaurant-product-images',
  'restaurant-product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

grant update (name, description, address, phone, branding)
  on public.restaurants to authenticated;

create policy restaurants_staff_update
  on public.restaurants
  for update
  to authenticated
  using (
    public.has_restaurant_role(id, array['administrator', 'manager'])
  )
  with check (
    public.has_restaurant_role(id, array['administrator', 'manager'])
  );

create policy product_images_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'restaurant-product-images');

create policy product_images_staff_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-product-images'
    and (storage.foldername(name))[2] = 'products'
    and case
      when (storage.foldername(name))[1] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[3] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_restaurant_role(
        ((storage.foldername(name))[1])::uuid,
        array['administrator', 'manager']
      )
      else false
    end
  );

create policy product_images_staff_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'restaurant-product-images'
    and (storage.foldername(name))[2] = 'products'
    and case
      when (storage.foldername(name))[1] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[3] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_restaurant_role(
        ((storage.foldername(name))[1])::uuid,
        array['administrator', 'manager']
      )
      else false
    end
  );
