-- Update site_readiness constraint to include 'Canceled' option
-- First, drop the old constraint if it exists
ALTER TABLE stores
DROP CONSTRAINT IF EXISTS stores_site_readiness_check;

-- Fix any existing rows with invalid values
UPDATE stores
SET site_readiness = 'Existing Site'
WHERE site_readiness IS NULL OR TRIM(site_readiness) = '';

-- Standardize existing values to match constraint (handle various cases)
UPDATE stores
SET site_readiness = CASE 
  WHEN LOWER(TRIM(site_readiness)) = 'existing site' THEN 'Existing Site'
  WHEN LOWER(TRIM(site_readiness)) = 'new site' THEN 'New Site'
  WHEN LOWER(TRIM(site_readiness)) = 'canceled' THEN 'Canceled'
  WHEN LOWER(TRIM(site_readiness)) = 'cancel' THEN 'Canceled'
  ELSE 'Existing Site'
END
WHERE site_readiness IS NOT NULL;

-- Add new constraint with all three values
ALTER TABLE stores
ADD CONSTRAINT stores_site_readiness_check 
CHECK (site_readiness IN ('Existing Site', 'New Site', 'Canceled'));

-- Add comment explaining the valid values
COMMENT ON COLUMN stores.site_readiness IS 'Site readiness status: Existing Site, New Site, or Canceled';
