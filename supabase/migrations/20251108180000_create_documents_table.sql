-- Create documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  file_type text not null, -- pdf, xlsx, docx, etc.
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete cascade,
  uploaded_at timestamptz default now(),
  shared_with jsonb default '[]'::jsonb, -- array of user IDs who can access
  folder text default 'General',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table documents enable row level security;

-- Policy: Users can view documents they uploaded or are shared with them
create policy "Users can view own or shared documents"
  on documents for select
  using (
    uploaded_by = auth.uid() 
    or auth.uid()::text = any(select jsonb_array_elements_text(shared_with))
  );

-- Policy: Users can upload documents
create policy "Users can upload documents"
  on documents for insert
  with check (uploaded_by = auth.uid());

-- Policy: Users can update their own documents
create policy "Users can update own documents"
  on documents for update
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

-- Policy: Users can delete their own documents
create policy "Users can delete own documents"
  on documents for delete
  using (uploaded_by = auth.uid());

-- Create index for performance
create index if not exists idx_documents_uploaded_by on documents(uploaded_by);
create index if not exists idx_documents_shared_with on documents using gin(shared_with);
create index if not exists idx_documents_folder on documents(folder);

-- Function to update updated_at timestamp
create or replace function update_documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_documents_updated_at();
