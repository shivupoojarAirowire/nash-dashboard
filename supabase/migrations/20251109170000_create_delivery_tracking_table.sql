-- Create delivery_tracking table
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no SERIAL NOT NULL,
  pickup_date DATE,
  consignment_number TEXT NOT NULL,
  invoice_dc_no TEXT NOT NULL,
  store_code TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'Pending',
  comments TEXT,
  delivered_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key to stores table
ALTER TABLE delivery_tracking
ADD CONSTRAINT delivery_tracking_store_code_fkey
FOREIGN KEY (store_code)
REFERENCES stores(store_code)
ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_store_code ON delivery_tracking(store_code);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_consignment ON delivery_tracking(consignment_number);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status ON delivery_tracking(delivery_status);

-- Enable RLS
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view delivery_tracking"
  ON delivery_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert delivery_tracking"
  ON delivery_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update delivery_tracking"
  ON delivery_tracking FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete delivery_tracking"
  ON delivery_tracking FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_tracking_updated_at
  BEFORE UPDATE ON delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
