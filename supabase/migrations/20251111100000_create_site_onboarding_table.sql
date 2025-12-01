-- Create site_onboarding table to track vendor assignments for deployment
CREATE TABLE IF NOT EXISTS site_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployment_status TEXT DEFAULT 'Pending',
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_site_onboarding_store_code ON site_onboarding(store_code);
CREATE INDEX IF NOT EXISTS idx_site_onboarding_vendor_id ON site_onboarding(vendor_id);
CREATE INDEX IF NOT EXISTS idx_site_onboarding_deployment_status ON site_onboarding(deployment_status);
CREATE INDEX IF NOT EXISTS idx_site_onboarding_assigned_date ON site_onboarding(assigned_date);

-- Enable RLS
ALTER TABLE site_onboarding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view site_onboarding"
  ON site_onboarding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert site_onboarding"
  ON site_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update site_onboarding"
  ON site_onboarding FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete site_onboarding"
  ON site_onboarding FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_site_onboarding_updated_at
  BEFORE UPDATE ON site_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE site_onboarding IS 'Tracks vendor assignments for site deployment after devices and ISP connections are delivered';
COMMENT ON COLUMN site_onboarding.store_code IS 'Store identifier';
COMMENT ON COLUMN site_onboarding.vendor_id IS 'Assigned vendor for deployment';
COMMENT ON COLUMN site_onboarding.deployment_status IS 'Status: Pending, Scheduled, In Progress, Completed, On Hold';
COMMENT ON COLUMN site_onboarding.scheduled_date IS 'Scheduled deployment date';
COMMENT ON COLUMN site_onboarding.completed_date IS 'Actual completion date';
