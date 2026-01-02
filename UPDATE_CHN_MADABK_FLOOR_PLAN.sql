-- Update CHN_MADABK_SS1R0CC store with floor plan information
-- Replace the filename below with the actual filename from your storage bucket

-- First, check what files exist in storage for this store
-- Go to Supabase Dashboard > Storage > floor-maps > CHN_MADABK_SS1R0CC folder
-- Copy the exact filename you see there

-- Then update this SQL with the correct filename:
UPDATE public.stores
SET floor_plan_files = '[{"name": "YOUR_ACTUAL_FILENAME.pdf", "path": "CHN_MADABK_SS1R0CC/YOUR_ACTUAL_FILENAME.pdf"}]'::jsonb,
    has_floor_plan = true
WHERE store_code = 'CHN_MADABK_SS1R0CC';

-- Verify the update
SELECT store_code, has_floor_plan, floor_plan_files
FROM public.stores
WHERE store_code = 'CHN_MADABK_SS1R0CC';
