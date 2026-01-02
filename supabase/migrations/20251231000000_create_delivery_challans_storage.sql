-- Create storage bucket for delivery challans
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-challans', 'delivery-challans', true, 5242880, array['application/pdf']::text[])
on conflict (id) do update set 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf']::text[];

-- Drop existing policies if they exist and recreate them
drop policy if exists "Authenticated users can upload delivery challans" on storage.objects;
drop policy if exists "Public read access to delivery challans" on storage.objects;
drop policy if exists "Authenticated users can update delivery challans" on storage.objects;
drop policy if exists "Authenticated users can delete delivery challans" on storage.objects;

-- Allow authenticated users to upload delivery challans
create policy "Authenticated users can upload delivery challans"
on storage.objects for insert
to authenticated
with check (bucket_id = 'delivery-challans');

-- Allow public read access to delivery challans
create policy "Public read access to delivery challans"
on storage.objects for select
to public
using (bucket_id = 'delivery-challans');

-- Allow authenticated users to update their delivery challans
create policy "Authenticated users can update delivery challans"
on storage.objects for update
to authenticated
using (bucket_id = 'delivery-challans');

-- Allow authenticated users to delete delivery challans
create policy "Authenticated users can delete delivery challans"
on storage.objects for delete
to authenticated
using (bucket_id = 'delivery-challans');
