-- Create isp_providers table
CREATE TABLE IF NOT EXISTS isp_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create isp_connections table
CREATE TABLE IF NOT EXISTS isp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isp_id UUID REFERENCES isp_providers(id) ON DELETE CASCADE,
  store_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  circuit_id TEXT NOT NULL UNIQUE,
  link_type TEXT DEFAULT 'Primary' CHECK (link_type IN ('Primary', 'Backup', 'Load Balance')),
  bandwidth TEXT NOT NULL,
  monthly_cost DECIMAL(10, 2) NOT NULL,
  provisioned_date DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending')),
  billing_cycle TEXT DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Yearly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create isp_tasks table
CREATE TABLE IF NOT EXISTS isp_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isp_id UUID REFERENCES isp_providers(id) ON DELETE CASCADE,
  store_code TEXT NOT NULL,
  task_type TEXT DEFAULT 'Installation' CHECK (task_type IN ('Installation', 'Maintenance', 'Upgrade', 'Renewal')),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_isp_providers_city ON isp_providers(city);
CREATE INDEX IF NOT EXISTS idx_isp_providers_status ON isp_providers(status);
CREATE INDEX IF NOT EXISTS idx_isp_connections_isp_id ON isp_connections(isp_id);
CREATE INDEX IF NOT EXISTS idx_isp_connections_store_code ON isp_connections(store_code);
CREATE INDEX IF NOT EXISTS idx_isp_connections_status ON isp_connections(status);
CREATE INDEX IF NOT EXISTS idx_isp_connections_circuit_id ON isp_connections(circuit_id);
CREATE INDEX IF NOT EXISTS idx_isp_tasks_isp_id ON isp_tasks(isp_id);
CREATE INDEX IF NOT EXISTS idx_isp_tasks_status ON isp_tasks(status);

-- Enable RLS
ALTER TABLE isp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE isp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE isp_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for isp_providers
CREATE POLICY "Allow authenticated users to view isp_providers"
  ON isp_providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert isp_providers"
  ON isp_providers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update isp_providers"
  ON isp_providers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete isp_providers"
  ON isp_providers FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for isp_connections
CREATE POLICY "Allow authenticated users to view isp_connections"
  ON isp_connections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert isp_connections"
  ON isp_connections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update isp_connections"
  ON isp_connections FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete isp_connections"
  ON isp_connections FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for isp_tasks
CREATE POLICY "Allow authenticated users to view isp_tasks"
  ON isp_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert isp_tasks"
  ON isp_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update isp_tasks"
  ON isp_tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete isp_tasks"
  ON isp_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_isp_providers_updated_at
  BEFORE UPDATE ON isp_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_isp_connections_updated_at
  BEFORE UPDATE ON isp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_isp_tasks_updated_at
  BEFORE UPDATE ON isp_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
