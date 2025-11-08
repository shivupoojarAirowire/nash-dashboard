-- Create deliveries table
CREATE TABLE deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('Firewall', 'Switch', 'AP')) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    delivery_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('Delivered', 'In Transit', 'Pending')) DEFAULT 'Pending',
    tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_store ON deliveries(store);
CREATE INDEX idx_deliveries_tracking ON deliveries(tracking_number);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
ON deliveries
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert access to authenticated users"
ON deliveries
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update access to authenticated users"
ON deliveries
FOR UPDATE
USING (auth.role() = 'authenticated');

-- NOTE: This migration creates the deliveries table used to persist device-level deliveries
