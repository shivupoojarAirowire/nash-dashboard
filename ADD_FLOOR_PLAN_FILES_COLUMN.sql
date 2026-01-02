-- Add floor_plan_files column to store file names as JSON array
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS floor_plan_files JSONB DEFAULT '[]'::jsonb;

-- Update CHN_PAMMAL_SS1R0CC with the actual file from storage
UPDATE public.stores
SET floor_plan_files = '[{"name": "Racking layout_CHN-Pammal SS_CHN_PAMMAL_SS1R0CC_SS_R5-1766648337711.pdf", "path": "CHN_PAMMAL_SS1R0CC/Racking layout_CHN-Pammal SS_CHN_PAMMAL_SS1R0CC_SS_R5-1766648337711.pdf"}]'::jsonb,
    has_floor_plan = true
WHERE store_code = 'CHN_PAMMAL_SS1R0CC';

-- Verify
SELECT store_code, has_floor_plan, floor_plan_files
FROM public.stores
WHERE store_code = 'CHN_PAMMAL_SS1R0CC';
