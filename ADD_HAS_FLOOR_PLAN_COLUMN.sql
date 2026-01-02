-- Add has_floor_plan column to stores table
-- This column tracks whether a store has floor plans uploaded

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS has_floor_plan BOOLEAN DEFAULT false;

-- Update existing stores that have floor plans
-- Check floor-maps bucket and update has_floor_plan to true for stores with files
-- Note: This requires manual update or you can run it after uploading files

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stores' AND column_name = 'has_floor_plan';
