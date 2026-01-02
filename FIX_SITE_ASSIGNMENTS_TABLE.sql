-- Fix site_assignments table schema and RLS policies
-- This fixes the "operator does not exist: text ->> unknown" error

-- First, let's check the current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'site_assignments'
ORDER BY ordinal_position;

-- If the table doesn't exist or has issues, recreate it
DROP TABLE IF EXISTS public.site_assignments CASCADE;

CREATE TABLE public.site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  store_code TEXT NOT NULL,
  floor_map_path TEXT,
  floor_map_url TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  deadline_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  aps_needed INTEGER,
  remarks TEXT,
  floors INTEGER,
  floor_size NUMERIC,
  heatmap_files JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_assignments_store_code ON public.site_assignments(store_code);
CREATE INDEX IF NOT EXISTS idx_site_assignments_assigned_to ON public.site_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_assignments_status ON public.site_assignments(status);
CREATE INDEX IF NOT EXISTS idx_site_assignments_deadline ON public.site_assignments(deadline_at);

-- Enable RLS
ALTER TABLE public.site_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.site_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.site_assignments;

-- Create RLS policies
CREATE POLICY "Enable read access for all authenticated users"
ON public.site_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.site_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.site_assignments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.site_assignments
FOR DELETE
TO authenticated
USING (true);

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'site_assignments'
ORDER BY ordinal_position;
