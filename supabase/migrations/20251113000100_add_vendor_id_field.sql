-- Add vendor_id as a unique human-readable identifier to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS vendor_id TEXT UNIQUE;

-- Create a sequence for vendor IDs
CREATE SEQUENCE IF NOT EXISTS vendor_id_seq START 1001;

-- Function to generate vendor_id automatically
CREATE OR REPLACE FUNCTION generate_vendor_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
  new_vendor_id TEXT;
BEGIN
  -- Get next sequence value
  next_id := nextval('vendor_id_seq');
  
  -- Format as VEN-XXXX
  new_vendor_id := 'VEN-' || LPAD(next_id::TEXT, 4, '0');
  
  RETURN new_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate vendor_id on insert
CREATE OR REPLACE FUNCTION set_vendor_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_id IS NULL THEN
    NEW.vendor_id := generate_vendor_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to vendors table
DROP TRIGGER IF EXISTS trigger_set_vendor_id ON vendors;
CREATE TRIGGER trigger_set_vendor_id
  BEFORE INSERT ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION set_vendor_id();

-- Update existing vendors with vendor_id
DO $$
DECLARE
  vendor_record RECORD;
BEGIN
  FOR vendor_record IN 
    SELECT id FROM vendors WHERE vendor_id IS NULL ORDER BY created_at
  LOOP
    UPDATE vendors 
    SET vendor_id = generate_vendor_id() 
    WHERE id = vendor_record.id;
  END LOOP;
END $$;

-- Create index for vendor_id
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_id ON vendors(vendor_id);

-- Add comment
COMMENT ON COLUMN vendors.vendor_id IS 'Unique human-readable vendor identifier (e.g., VEN-1001)';
