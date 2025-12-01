-- Add completion-related fields to site_assignments
-- These fields are required when an assignment is marked as Done.
ALTER TABLE site_assignments
ADD COLUMN IF NOT EXISTS floors INTEGER,
ADD COLUMN IF NOT EXISTS floor_size TEXT,
ADD COLUMN IF NOT EXISTS heatmap_files JSONB,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update existing 'Done' rows to set default values for new fields if they're NULL
-- This ensures existing data won't violate the constraint
UPDATE site_assignments
SET 
  floors = COALESCE(floors, 1),
  floor_size = COALESCE(floor_size, 'Not specified'),
  heatmap_files = COALESCE(heatmap_files, '[]'::jsonb),
  completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'Done' AND (
  floors IS NULL OR 
  floor_size IS NULL OR 
  heatmap_files IS NULL OR 
  completed_at IS NULL
);

-- Enforce that completion fields are compulsory when status = 'Done'.
-- Use a CHECK constraint so we don't force values for Pending/In Progress rows.
ALTER TABLE site_assignments
  DROP CONSTRAINT IF EXISTS site_assignments_done_completion_required;
ALTER TABLE site_assignments
  ADD CONSTRAINT site_assignments_done_completion_required
  CHECK (
    status <> 'Done' OR (
      aps_needed IS NOT NULL AND
      floors IS NOT NULL AND
      floor_size IS NOT NULL AND
      heatmap_files IS NOT NULL AND
      completed_at IS NOT NULL
    )
  );