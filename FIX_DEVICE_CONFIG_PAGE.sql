-- COMPREHENSIVE FIX: Device Configurations Page
-- Run this entire script in Supabase SQL Editor

-- =====================================================================
-- STEP 1: Add missing columns to site_assignments
-- =====================================================================

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_status TEXT DEFAULT 'Not Started';

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS device_config JSONB DEFAULT NULL;

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS firewall_ip TEXT DEFAULT NULL;

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS zonal_port_number TEXT DEFAULT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_site_assignments_config_status 
ON public.site_assignments(config_status);

-- =====================================================================
-- STEP 2: Check and fix RLS policies for site_assignments
-- =====================================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.site_assignments;

-- Create new permissive policies
CREATE POLICY "Enable read access for all authenticated users"
ON public.site_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.site_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.site_assignments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.site_assignments
FOR DELETE
TO authenticated
USING (true);

-- =====================================================================
-- STEP 3: Verify table structure
-- =====================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'site_assignments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================================
-- STEP 4: Check RLS policies
-- =====================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'site_assignments';

-- =====================================================================
-- STEP 5: Test query (same as the app uses)
-- =====================================================================

SELECT 
  id, 
  city, 
  store_code, 
  status, 
  config_status, 
  assigned_to, 
  deadline_at, 
  aps_needed, 
  firewall_ip, 
  zonal_port_number
FROM public.site_assignments
WHERE status = 'Done'
ORDER BY updated_at DESC
LIMIT 5;

-- =====================================================================
-- STEP 6: Count completed sites
-- =====================================================================

SELECT 
  COUNT(*) as total_done_sites
FROM public.site_assignments
WHERE status = 'Done';

-- =====================================================================
-- STEP 7: Update existing Done records
-- =====================================================================

UPDATE public.site_assignments 
SET config_status = 'Not Started' 
WHERE status = 'Done' AND (config_status IS NULL OR config_status = '');

-- =====================================================================
-- VERIFICATION & SUCCESS MESSAGE
-- =====================================================================

DO $$
DECLARE
  col_count INTEGER;
  policy_count INTEGER;
  done_sites INTEGER;
BEGIN
  -- Check columns exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'site_assignments'
    AND column_name IN ('config_status', 'device_config', 'firewall_ip', 'zonal_port_number');
  
  -- Check policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'site_assignments';
  
  -- Check done sites
  SELECT COUNT(*) INTO done_sites
  FROM public.site_assignments
  WHERE status = 'Done';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ DEVICE CONFIGURATIONS SETUP COMPLETE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   - Columns added: % / 4', col_count;
  RAISE NOTICE '   - RLS policies: %', policy_count;
  RAISE NOTICE '   - Completed sites: %', done_sites;
  RAISE NOTICE '';
  
  IF col_count = 4 AND policy_count >= 4 THEN
    RAISE NOTICE '✓ All columns and policies configured correctly';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Refresh the Device Configurations page';
    RAISE NOTICE '   2. You should see % completed site(s)', done_sites;
    RAISE NOTICE '';
    IF done_sites = 0 THEN
      RAISE NOTICE '💡 No completed sites yet. Complete a heatmap first:';
      RAISE NOTICE '   - Go to HeatMaps → My Heatmaps (as engineer)';
      RAISE NOTICE '   - Click "Start" on pending assignment';
      RAISE NOTICE '   - Click "Complete" and fill in details';
    END IF;
  ELSE
    RAISE NOTICE '❌ Setup incomplete - please check errors above';
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
