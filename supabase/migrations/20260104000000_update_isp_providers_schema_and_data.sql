-- Update isp_providers table to include pricing columns
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS operational_area TEXT;
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS cost_50mbps DECIMAL(10, 2);
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS cost_100mbps DECIMAL(10, 2);
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS cost_150mbps DECIMAL(10, 2);
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS otc_charges DECIMAL(10, 2);

-- Update columns to be nullable for flexibility
ALTER TABLE isp_providers ALTER COLUMN contact_person DROP NOT NULL;
ALTER TABLE isp_providers ALTER COLUMN contact_email DROP NOT NULL;
ALTER TABLE isp_providers ALTER COLUMN contact_phone DROP NOT NULL;
ALTER TABLE isp_providers ALTER COLUMN city DROP NOT NULL;
ALTER TABLE isp_providers ALTER COLUMN area DROP NOT NULL;

-- Insert ISP provider data
INSERT INTO isp_providers (
  provider_name, 
  contact_person, 
  contact_phone, 
  email,
  city, 
  area, 
  operational_area,
  service_type, 
  cost_50mbps,
  cost_100mbps,
  cost_150mbps,
  otc_charges,
  status
) VALUES
('Ghadai', 'Shankar', '9811935009', NULL, 'Delhi', 'Delhi', 'Pan India', 'ISP & Engineer support', 1050.00, 1200.00, NULL, 1000.00, 'Active'),
('A2M Tech', 'Sai Raj', '6364745281', NULL, 'BNG', 'BNG', 'Pan India', 'ISP & Engineer support', NULL, NULL, NULL, NULL, 'Active'),
('Airtel', 'Zaheer', '9886163891', NULL, 'BNG', 'BNG', 'Pan India', 'ISP', 499.00, 799.00, NULL, NULL, 'Active'),
('Asia net', 'Aneesha', '9349370775', NULL, 'Kerala', 'Kerala', 'Kerala', 'ISP', NULL, NULL, 884.00, NULL, 'Active'),
('Aspirare', 'Fathima', '6364081118', NULL, 'BNG', 'BNG', 'Pan India', 'ISP', NULL, NULL, NULL, NULL, 'Active'),
('Allient', NULL, NULL, NULL, NULL, NULL, 'Pan India', 'ISP', NULL, NULL, NULL, NULL, 'Active'),
('Internet Mumbai', 'Kiara', '7558296753', 'CORPORATE@INTERNETMUMBAI.COM', 'MUM', 'Mumbai', 'Mumbai', 'ISP', NULL, 1200.00, NULL, 1000.00, 'Active'),
('GTPL', NULL, NULL, NULL, NULL, 'Gujarat', 'Gujarat', 'ISP', NULL, NULL, NULL, NULL, 'Active'),
('Excitel', 'Abdul', NULL, NULL, 'BNG', 'Bengalore', 'Bengalore', 'ISP', NULL, 699.00, NULL, NULL, 'Active')
ON CONFLICT DO NOTHING;

-- Add comments for new columns
COMMENT ON COLUMN isp_providers.cost_50mbps IS '50 Mbps monthly cost in INR';
COMMENT ON COLUMN isp_providers.cost_100mbps IS '100 Mbps monthly cost in INR';
COMMENT ON COLUMN isp_providers.cost_150mbps IS '150 Mbps monthly cost in INR';
COMMENT ON COLUMN isp_providers.otc_charges IS 'One-time charges (OTC) in INR';
COMMENT ON COLUMN isp_providers.operational_area IS 'Coverage area of ISP';
