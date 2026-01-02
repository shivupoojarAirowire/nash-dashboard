-- Update has_floor_plan for stores that already have floor plans in the bucket
-- This will check the floor-maps bucket and set has_floor_plan = true for stores with files

-- For CHN_PAMMAL_SS1R0CC specifically
UPDATE public.stores
SET has_floor_plan = true
WHERE store_code = 'CHN_PAMMAL_SS1R0CC';

-- You can add more stores that have floor plans:
-- UPDATE public.stores
-- SET has_floor_plan = true
-- WHERE store_code IN ('STORE_CODE_1', 'STORE_CODE_2', 'STORE_CODE_3');

-- Or update ALL stores to check their floor plans manually:
-- After running this, you'll need to manually verify which stores have files
-- and update them accordingly

-- Verify the update
SELECT store_code, store, city, has_floor_plan
FROM public.stores
WHERE store_code = 'CHN_PAMMAL_SS1R0CC';
