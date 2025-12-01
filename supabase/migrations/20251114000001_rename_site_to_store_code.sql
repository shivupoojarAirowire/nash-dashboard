-- Rename site column to store_code in inventory table
ALTER TABLE public.inventory
RENAME COLUMN site TO store_code;

-- Update the index name for consistency
DROP INDEX IF EXISTS idx_inventory_site;
CREATE INDEX IF NOT EXISTS idx_inventory_store_code ON public.inventory(store_code);

-- Add comment
COMMENT ON COLUMN public.inventory.store_code IS 'Foreign key reference to stores.store_code';
