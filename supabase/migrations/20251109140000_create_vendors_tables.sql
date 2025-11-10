-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  expertise TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendor_tasks table
CREATE TABLE IF NOT EXISTS vendor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  store_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  devices INTEGER DEFAULT 0,
  task_type TEXT DEFAULT 'Onboarding' CHECK (task_type IN ('Onboarding', 'Installation', 'Maintenance')),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Confirmed')),
  assigned_date TIMESTAMPTZ DEFAULT now(),
  completion_date TIMESTAMPTZ,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid')),
  payment_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_vendor_id ON vendor_tasks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_status ON vendor_tasks(status);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_payment_status ON vendor_tasks(payment_status);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vendors
CREATE POLICY "Allow authenticated users to view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for vendor_tasks
CREATE POLICY "Allow authenticated users to view vendor_tasks"
  ON vendor_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert vendor_tasks"
  ON vendor_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vendor_tasks"
  ON vendor_tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete vendor_tasks"
  ON vendor_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_tasks_updated_at
  BEFORE UPDATE ON vendor_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
