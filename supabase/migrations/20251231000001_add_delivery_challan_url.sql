-- Add delivery_challan_url column to site_assignments table
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS delivery_challan_url TEXT DEFAULT NULL;

-- Add delivery_challan_number column to track the unique challan number
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS delivery_challan_number TEXT DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_site_assignments_delivery_challan_number 
ON public.site_assignments(delivery_challan_number);

COMMENT ON COLUMN public.site_assignments.delivery_challan_url IS 'URL of the pre-generated delivery challan PDF in storage bucket';
COMMENT ON COLUMN public.site_assignments.delivery_challan_number IS 'Unique delivery challan number';
