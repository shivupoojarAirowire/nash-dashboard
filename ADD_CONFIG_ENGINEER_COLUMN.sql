-- Add Device Configuration Engineer Assignment
-- Separates heatmap engineer from device configuration engineer

-- Add new column for device configuration engineer
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_assigned_to UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add config_assigned_by column to track who assigned the config engineer
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_assigned_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add config_deadline column for device configuration deadline
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_deadline_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_site_assignments_config_assigned_to 
ON public.site_assignments(config_assigned_to);

-- Verify columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'site_assignments'
  AND column_name IN ('assigned_to', 'config_assigned_to', 'config_assigned_by', 'config_deadline_at', 'config_status')
ORDER BY ordinal_position;

-- Example data structure:
-- assigned_to = Heatmap Engineer (who completed the heatmap)
-- config_assigned_to = Device Config Engineer (who will configure devices)
-- config_status = 'Not Started', 'In Progress', 'Completed'

DO $$
BEGIN
  RAISE NOTICE '✅ Device configuration engineer columns added!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Column Structure:';
  RAISE NOTICE '   - assigned_to: Heatmap engineer (existing)';
  RAISE NOTICE '   - config_assigned_to: Device config engineer (NEW)';
  RAISE NOTICE '   - config_assigned_by: Who assigned the config engineer (NEW)';
  RAISE NOTICE '   - config_deadline_at: Device config deadline (NEW)';
  RAISE NOTICE '   - config_status: Configuration status';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Workflow:';
  RAISE NOTICE '   1. Engineer completes heatmap → status = Done';
  RAISE NOTICE '   2. Manager assigns DIFFERENT engineer for device config';
  RAISE NOTICE '   3. Config engineer sees assignment in their page';
  RAISE NOTICE '   4. Config engineer completes → config_status = Completed';
END $$;
