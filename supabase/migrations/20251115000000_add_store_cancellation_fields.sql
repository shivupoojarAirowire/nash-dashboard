-- Add cancellation fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS cancel_remarks TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add check constraint for status
ALTER TABLE stores
ADD CONSTRAINT stores_status_check 
CHECK (status IN ('active', 'cancelled'));

-- Create index for faster status-based searches
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

-- Update existing stores to have 'active' status
UPDATE stores SET status = 'active' WHERE status IS NULL;
