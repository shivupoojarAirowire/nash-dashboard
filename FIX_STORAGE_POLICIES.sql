-- RUN THIS IN SUPABASE SQL EDITOR
-- This will fix storage bucket policies to allow authenticated users to upload files

-- Step 1: Drop existing restrictive policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can upload floor maps" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to floor-maps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view floor-maps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update floor-maps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete floor-maps" ON storage.objects;

-- Step 2: Create comprehensive policies for floor-maps bucket

-- Allow authenticated users to INSERT (upload) files to floor-maps
CREATE POLICY "Allow authenticated users to upload to floor-maps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'floor-maps');

-- Allow authenticated users to SELECT (view/download) files from floor-maps
CREATE POLICY "Allow authenticated users to view floor-maps"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'floor-maps');

-- Allow authenticated users to UPDATE files in floor-maps
CREATE POLICY "Allow authenticated users to update floor-maps"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'floor-maps')
WITH CHECK (bucket_id = 'floor-maps');

-- Allow authenticated users to DELETE files from floor-maps
CREATE POLICY "Allow authenticated users to delete floor-maps"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'floor-maps');

-- Step 3: Create policies for heatmaps bucket

DROP POLICY IF EXISTS "Allow authenticated users to upload to heatmaps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view heatmaps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update heatmaps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete heatmaps" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload to heatmaps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'heatmaps');

CREATE POLICY "Allow authenticated users to view heatmaps"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'heatmaps');

CREATE POLICY "Allow authenticated users to update heatmaps"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'heatmaps')
WITH CHECK (bucket_id = 'heatmaps');

CREATE POLICY "Allow authenticated users to delete heatmaps"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'heatmaps');

-- Step 4: Success message
SELECT 'Storage policies created successfully!' as message;
