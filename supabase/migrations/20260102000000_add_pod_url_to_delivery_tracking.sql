-- Add pod_url column to delivery_tracking table
ALTER TABLE delivery_tracking
ADD COLUMN IF NOT EXISTS pod_url TEXT;

-- Add index for pod_url
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_pod_url ON delivery_tracking(pod_url);
