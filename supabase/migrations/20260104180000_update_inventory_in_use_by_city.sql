-- Delete firewall inventory records with no serial number
DELETE FROM inventory
WHERE store_code IS NOT NULL 
  AND type = 'Firewall' 
  AND serial IS NULL;

-- Update inventory table: set in_use = true when city is present
UPDATE inventory
SET in_use = true
WHERE city IS NOT NULL AND city != '';

-- Add comment explaining the change
COMMENT ON COLUMN inventory.in_use IS 'Set to true when inventory is deployed in a city location';
