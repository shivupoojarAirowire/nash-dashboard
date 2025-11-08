-- Create inventory table
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  make text not null,
  serial text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: index on serial for quick lookup
create index if not exists idx_inventory_serial on public.inventory (serial);
