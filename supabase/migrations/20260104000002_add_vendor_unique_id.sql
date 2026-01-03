-- Add vendor_id column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_id TEXT UNIQUE;

-- Create a sequence for vendor IDs
CREATE SEQUENCE IF NOT EXISTS vendor_id_seq START WITH 1;

-- Function to generate vendor ID
CREATE OR REPLACE FUNCTION generate_vendor_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
  new_vendor_id TEXT;
BEGIN
  -- Get next sequence value
  next_id := nextval('vendor_id_seq');
  
  -- Format as VEN-XX (zero-padded to 2 digits)
  new_vendor_id := 'VEN-' || LPAD(next_id::TEXT, 2, '0');
  
  RETURN new_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to have vendor_id
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM vendors WHERE vendor_id IS NULL ORDER BY created_at
  LOOP
    UPDATE vendors 
    SET vendor_id = 'VEN-' || LPAD(counter::TEXT, 2, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to start from correct number
  PERFORM setval('vendor_id_seq', counter);
END $$;

-- Make vendor_id NOT NULL after populating existing records
ALTER TABLE vendors ALTER COLUMN vendor_id SET NOT NULL;

-- Create trigger to auto-generate vendor_id for new records
CREATE OR REPLACE FUNCTION set_vendor_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_id IS NULL THEN
    NEW.vendor_id := generate_vendor_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_vendor_id ON vendors;
CREATE TRIGGER trigger_set_vendor_id
  BEFORE INSERT ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION set_vendor_id();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_id ON vendors(vendor_id);

-- Comment
COMMENT ON COLUMN vendors.vendor_id IS 'Human-readable unique identifier for vendor (e.g., VEN-01, VEN-02)';
