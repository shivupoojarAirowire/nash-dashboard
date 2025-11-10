-- Add city column to vendors table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'city'
  ) THEN
    ALTER TABLE vendors ADD COLUMN city TEXT;
  END IF;
END $$;

-- Create index on city if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
