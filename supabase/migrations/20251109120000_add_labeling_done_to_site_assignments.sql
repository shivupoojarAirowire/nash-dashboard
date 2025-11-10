-- Add labeling_done field to site_assignments table
ALTER TABLE site_assignments
ADD COLUMN IF NOT EXISTS labeling_done BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN site_assignments.labeling_done IS 'Whether device labeling has been completed for this site';
