-- Add model column to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS model TEXT;

-- Add comment
COMMENT ON COLUMN public.inventory.model IS 'Device model name';
