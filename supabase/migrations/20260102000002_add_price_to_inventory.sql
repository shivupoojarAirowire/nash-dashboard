-- Add price column to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- Add comment for the column
COMMENT ON COLUMN public.inventory.price IS 'Price of the inventory item in currency units';
