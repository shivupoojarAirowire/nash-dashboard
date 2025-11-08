-- Create storage bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Policy: Users can upload their own documents
create policy "Users can upload documents"
on storage.objects for insert
with check (
  bucket_id = 'documents' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view documents they uploaded or are shared with them
create policy "Users can view own or shared documents"
on storage.objects for select
using (
  bucket_id = 'documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1 from documents
      where file_url like '%' || name || '%'
      and (
        uploaded_by = auth.uid()
        or auth.uid()::text = any(select jsonb_array_elements_text(shared_with))
      )
    )
  )
);

-- Policy: Users can delete their own documents
create policy "Users can delete own documents"
on storage.objects for delete
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own documents
create policy "Users can update own documents"
on storage.objects for update
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
