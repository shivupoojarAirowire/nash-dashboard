-- Add configuration fields to site_assignments table
ALTER TABLE site_assignments
ADD COLUMN IF NOT EXISTS config_status TEXT DEFAULT 'Not Started',
ADD COLUMN IF NOT EXISTS firewall_ip TEXT,
ADD COLUMN IF NOT EXISTS zonal_port_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN site_assignments.config_status IS 'Configuration work status: Not Started, In Progress, Completed';
COMMENT ON COLUMN site_assignments.firewall_ip IS 'Firewall IP address configured by engineer';
COMMENT ON COLUMN site_assignments.zonal_port_number IS 'Zonal port number configured by engineer';
