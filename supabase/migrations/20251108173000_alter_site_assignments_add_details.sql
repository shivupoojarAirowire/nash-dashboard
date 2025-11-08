-- Add details fields to site_assignments for engineering completion
alter table public.site_assignments
  add column if not exists aps_needed integer,
  add column if not exists remarks text,
  add column if not exists completed_at timestamptz;

-- Optional helpful check: aps_needed non-negative
alter table public.site_assignments
  add constraint if not exists chk_site_assignments_aps_needed_nonneg
  check (aps_needed is null or aps_needed >= 0);
-- You may want to backfill existing records with default values if needed                                                                                                      
update public.site_assignments
set aps_needed = 0,
    remarks = '',
    completed_at = null
where aps_needed is null;                                                                               