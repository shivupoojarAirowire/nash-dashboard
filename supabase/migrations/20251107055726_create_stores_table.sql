-- Create stores table
CREATE TABLE stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    store TEXT NOT NULL,
    store_code TEXT NOT NULL UNIQUE,
    address TEXT,
    poc TEXT,
    poc_no TEXT,
    priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    site_readiness TEXT CHECK (site_readiness IN ('Ready', 'Not Ready', 'Partial')) DEFAULT 'Not Ready',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster city-based searches
CREATE INDEX idx_stores_city ON stores(city);
CREATE INDEX idx_stores_store_code ON stores(store_code);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
ON stores
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy to allow insert access to authenticated users
CREATE POLICY "Allow insert access to authenticated users"
ON stores
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow update access to authenticated users
CREATE POLICY "Allow update access to authenticated users"
ON stores
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Insert initial store data
INSERT INTO stores (city, store, store_code, priority, site_readiness) VALUES
    ('MUMBAI', 'MUM-KOTHARI COMPOUND NEW', 'MUM_KOTARI_P01R1CC', 'Medium', 'Ready'),
    ('MUMBAI', 'MUM-Bhandup New', 'MUM_BHNDUP_P01R1CC', 'High', 'Ready'),
    ('MUMBAI', 'MUM-Dombivali W New', 'MUM_DBM(W)_P01R1CC', 'Medium', 'Ready'),
    ('BENGALURU', 'BLR-Sarjapur New', 'BLR_SRJPUR_P01R1CC', 'High', 'Ready'),
    ('BENGALURU', 'BLR-BROOKEFIELD', 'BLR_BRKFLD_P01R0CC', 'Medium', 'Ready'),
    ('DELHI', 'DEL-JANAKPURI', 'DEL_JNKPRI_P01R0CF', 'High', 'Ready'),
    ('DELHI', 'DEL-UTTAM NAGAR New', 'DEL_UTMNGR_P01R1CC', 'Medium', 'Not Ready'),
    ('HYDERABAD', 'HYD-SECUNDERABAD', 'HYD_SCNDBD_P01R0CC', 'High', 'Ready'),
    ('HYDERABAD', 'HYD-Chandanagar New', 'HYD_CHDNGR_P01R1CC', 'Medium', 'Ready');