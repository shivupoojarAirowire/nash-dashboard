-- Delete static test stores from the database
-- Run this in Supabase SQL Editor

-- Delete stores NYC-01 and LA-02
DELETE FROM public.stores
WHERE store_code IN ('NYC-01', 'LA-02');

-- Verify deletion
SELECT store_code, store, city
FROM public.stores
ORDER BY created_at DESC;
