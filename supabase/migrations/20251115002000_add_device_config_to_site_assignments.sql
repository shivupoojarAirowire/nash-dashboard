-- Add device_config column to store device configuration details
ALTER TABLE site_assignments
ADD COLUMN IF NOT EXISTS device_config JSONB;

COMMENT ON COLUMN site_assignments.device_config IS 'Device configuration details including switch, firewall, and access points information';
