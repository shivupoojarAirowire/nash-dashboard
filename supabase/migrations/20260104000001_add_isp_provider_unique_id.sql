-- Add provider_id column to isp_providers table
ALTER TABLE isp_providers ADD COLUMN IF NOT EXISTS provider_id TEXT UNIQUE;

-- Create a sequence for ISP provider IDs
CREATE SEQUENCE IF NOT EXISTS isp_provider_id_seq START WITH 1;

-- Function to generate ISP provider ID
CREATE OR REPLACE FUNCTION generate_isp_provider_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
  new_provider_id TEXT;
BEGIN
  -- Get next sequence value
  next_id := nextval('isp_provider_id_seq');
  
  -- Format as ISP-XX (zero-padded to 2 digits)
  new_provider_id := 'ISP-' || LPAD(next_id::TEXT, 2, '0');
  
  RETURN new_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to have provider_id
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM isp_providers WHERE provider_id IS NULL ORDER BY created_at
  LOOP
    UPDATE isp_providers 
    SET provider_id = 'ISP-' || LPAD(counter::TEXT, 2, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to start from correct number
  PERFORM setval('isp_provider_id_seq', counter);
END $$;

-- Make provider_id NOT NULL after populating existing records
ALTER TABLE isp_providers ALTER COLUMN provider_id SET NOT NULL;

-- Create trigger to auto-generate provider_id for new records
CREATE OR REPLACE FUNCTION set_isp_provider_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider_id IS NULL THEN
    NEW.provider_id := generate_isp_provider_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_isp_provider_id ON isp_providers;
CREATE TRIGGER trigger_set_isp_provider_id
  BEFORE INSERT ON isp_providers
  FOR EACH ROW
  EXECUTE FUNCTION set_isp_provider_id();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_isp_providers_provider_id ON isp_providers(provider_id);

-- Comment
COMMENT ON COLUMN isp_providers.provider_id IS 'Human-readable unique identifier for ISP provider (e.g., ISP-01, ISP-02)';
