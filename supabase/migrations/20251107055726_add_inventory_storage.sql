-- Create the inventory storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'inventory', 'inventory', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'inventory'
);

-- Allow public access to view files (since we're using public URLs)
create policy "Public Access"
on storage.objects for select
using (bucket_id = 'inventory');

-- Allow authenticated users to upload files
create policy "Authenticated users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'inventory' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
create policy "Users can update their own files"
on storage.objects for update
using (
  bucket_id = 'inventory'
  and auth.uid() = owner
)
with check (
  bucket_id = 'inventory'
  and auth.uid() = owner
);

-- Allow authenticated users to delete their own files
create policy "Users can delete their own files"
on storage.objects for delete
using (
  bucket_id = 'inventory'
  and auth.uid() = owner
);