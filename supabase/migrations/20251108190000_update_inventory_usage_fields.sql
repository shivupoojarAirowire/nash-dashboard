-- Add usage and lifecycle fields to inventory
alter table public.inventory
  add column if not exists in_use boolean default false,
  add column if not exists site text,
  add column if not exists arrival_date date,
  add column if not exists assigned_date date;

-- Optional indexes for querying active devices and by site
create index if not exists idx_inventory_in_use on public.inventory (in_use);
create index if not exists idx_inventory_site on public.inventory (site);
