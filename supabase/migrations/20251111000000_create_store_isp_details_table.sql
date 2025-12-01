-- Create store_isp_details table
CREATE TABLE IF NOT EXISTS store_isp_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL UNIQUE,
  isp1_status TEXT DEFAULT 'Pending',
  isp1_provider TEXT,
  isp1_circuit_id TEXT,
  isp1_delivery_date DATE,
  isp2_status TEXT DEFAULT 'Pending',
  isp2_provider TEXT,
  isp2_circuit_id TEXT,
  isp2_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Foreign key constraint commented out to allow store codes that don't exist in stores table yet
-- Uncomment if you want to enforce referential integrity:
-- ALTER TABLE store_isp_details
-- ADD CONSTRAINT store_isp_details_store_code_fkey
-- FOREIGN KEY (store_code)
-- REFERENCES stores(store_code)
-- ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_store_isp_details_store_code ON store_isp_details(store_code);
CREATE INDEX IF NOT EXISTS idx_store_isp_details_isp1_status ON store_isp_details(isp1_status);
CREATE INDEX IF NOT EXISTS idx_store_isp_details_isp2_status ON store_isp_details(isp2_status);

-- Enable RLS
ALTER TABLE store_isp_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view store_isp_details"
  ON store_isp_details FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert store_isp_details"
  ON store_isp_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update store_isp_details"
  ON store_isp_details FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete store_isp_details"
  ON store_isp_details FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_store_isp_details_updated_at
  BEFORE UPDATE ON store_isp_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
