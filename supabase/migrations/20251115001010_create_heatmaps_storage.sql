-- Create a storage bucket for created heatmaps (exported deliverables)
insert into storage.buckets (id, name, public)
values ('heatmaps', 'heatmaps', true)
on conflict (id) do nothing;

-- Allow public read access (drop/create to avoid IF NOT EXISTS syntax issue)
drop policy if exists "Public Access to heatmaps" on storage.objects;
create policy "Public Access to heatmaps"
  on storage.objects for select
  using (bucket_id = 'heatmaps');

-- Allow authenticated users to upload/manage their files in heatmaps bucket
drop policy if exists "Authenticated users can upload to heatmaps" on storage.objects;
create policy "Authenticated users can upload to heatmaps"
  on storage.objects for insert
  with check (bucket_id = 'heatmaps' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update heatmaps" on storage.objects;
create policy "Authenticated users can update heatmaps"
  on storage.objects for update
  using (bucket_id = 'heatmaps' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete heatmaps" on storage.objects;
create policy "Authenticated users can delete heatmaps"
  on storage.objects for delete
  using (bucket_id = 'heatmaps' and auth.role() = 'authenticated');