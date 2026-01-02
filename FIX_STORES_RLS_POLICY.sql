-- Fix RLS policies for stores table to allow insert, update, and delete operations

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.stores;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.stores;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.stores;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.stores;

-- Allow all authenticated users to read stores
CREATE POLICY "Enable read access for all authenticated users"
ON public.stores
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert stores
CREATE POLICY "Enable insert for authenticated users"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update stores
CREATE POLICY "Enable update for authenticated users"
ON public.stores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete stores
CREATE POLICY "Enable delete for authenticated users"
ON public.stores
FOR DELETE
TO authenticated
USING (true);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'stores';

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'stores';
