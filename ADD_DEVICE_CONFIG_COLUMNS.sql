-- Add device configuration columns to site_assignments table
-- This enables tracking of device configuration status and details

-- Add config_status column
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_status TEXT DEFAULT 'Not Started';

-- Add device_config column for storing device configuration details
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS device_config JSONB DEFAULT NULL;

-- Add firewall_ip column
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS firewall_ip TEXT DEFAULT NULL;

-- Add zonal_port_number column
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS zonal_port_number TEXT DEFAULT NULL;

-- Create index for config_status for faster queries
CREATE INDEX IF NOT EXISTS idx_site_assignments_config_status 
ON public.site_assignments(config_status);

-- Update existing records to have 'Not Started' status if they're Done but no config status
UPDATE public.site_assignments 
SET config_status = 'Not Started' 
WHERE status = 'Done' AND config_status IS NULL;

-- Verify the columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'site_assignments'
  AND table_schema = 'public'
  AND column_name IN ('config_status', 'device_config', 'firewall_ip', 'zonal_port_number')
ORDER BY ordinal_position;

-- Check current data
SELECT 
  id,
  store_code,
  status,
  config_status,
  firewall_ip,
  zonal_port_number
FROM public.site_assignments
WHERE status = 'Done'
ORDER BY created_at DESC
LIMIT 10;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Device configuration columns added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Columns added:';
  RAISE NOTICE '   - config_status (TEXT) - Tracks configuration progress';
  RAISE NOTICE '   - device_config (JSONB) - Stores device configuration details';
  RAISE NOTICE '   - firewall_ip (TEXT) - Stores firewall IP address';
  RAISE NOTICE '   - zonal_port_number (TEXT) - Stores zonal port number';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 The Device Configurations page should now load properly!';
END $$;
