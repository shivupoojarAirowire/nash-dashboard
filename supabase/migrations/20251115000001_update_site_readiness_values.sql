-- Update site_readiness values from old format to new format

-- First, drop the old check constraint
ALTER TABLE stores 
DROP CONSTRAINT IF EXISTS stores_site_readiness_check;

-- Now update the values
-- Update 'Not Ready' to 'Existing site'
UPDATE stores 
SET site_readiness = 'Existing site' 
WHERE site_readiness = 'Not Ready';

-- Update 'Ready' to 'Existing site' (assuming ready sites are existing sites)
UPDATE stores 
SET site_readiness = 'Existing site' 
WHERE site_readiness = 'Ready';

-- Update 'Partial' to 'Existing site' (assuming partial ready sites are existing sites)
UPDATE stores 
SET site_readiness = 'Existing site' 
WHERE site_readiness = 'Partial';

-- Finally, add the new check constraint with updated values
ALTER TABLE stores
ADD CONSTRAINT stores_site_readiness_check 
CHECK (site_readiness IN ('Existing site', 'New site'));
