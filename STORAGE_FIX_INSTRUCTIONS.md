**QUICK FIX FOR STORAGE ERROR - DO THIS IN SUPABASE DASHBOARD:**

The error "operator does not exist: text ->> unknown" in storage.search() is a PostgreSQL compatibility issue.

**Option 1: Make Buckets Public (Easiest)**
1. Go to Supabase Dashboard → Storage
2. Click on `floor-maps` bucket
3. Click "Edit bucket" (pencil icon)
4. Check "Public bucket" checkbox
5. Click "Save"
6. Repeat for `heatmaps` bucket

This will make all files publicly accessible without authentication.

**Option 2: Use Dashboard UI to Create Policies**
If you need authentication:
1. Go to Storage → floor-maps → Policies tab
2. Click "New Policy" → "For full customization"
3. Create 4 policies:

INSERT Policy:
- Name: Allow uploads
- Operation: INSERT
- Target: authenticated
- WITH CHECK: bucket_id = 'floor-maps'

SELECT Policy:
- Name: Allow reads  
- Operation: SELECT
- Target: authenticated
- USING: bucket_id = 'floor-maps'

UPDATE Policy:
- Name: Allow updates
- Operation: UPDATE
- Target: authenticated
- USING: bucket_id = 'floor-maps'
- WITH CHECK: bucket_id = 'floor-maps'

DELETE Policy:
- Name: Allow deletes
- Operation: DELETE
- Target: authenticated
- USING: bucket_id = 'floor-maps'

Repeat for `heatmaps` bucket.

**After completing either option, refresh your browser and try uploading again.**
