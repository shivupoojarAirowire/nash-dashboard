# Create Delivery Challans Storage Bucket

## Steps to create the storage bucket in Supabase Dashboard:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Fill in the details:
   - **Name**: `delivery-challans`
   - **Public bucket**: ✅ Check this (enabled)
   - **File size limit**: 5 MB (or higher if needed)
   - **Allowed MIME types**: `application/pdf` (or leave empty for all types)
6. Click **"Create bucket"**

## Set up Storage Policies:

After creating the bucket, click on it and go to **Policies** tab:

### Policy 1: Public Read Access
- Click **"New Policy"**
- Select **"Get started quickly"** → **"Select for read access to all users"**
- Name: `Public read access to delivery challans`
- Policy definition: Should auto-fill, or use:
  ```sql
  bucket_id = 'delivery-challans'
  ```

### Policy 2: Authenticated Upload
- Click **"New Policy"** 
- Select **"Get started quickly"** → **"Insert for authenticated users only"**
- Name: `Authenticated users can upload delivery challans`
- Policy definition:
  ```sql
  bucket_id = 'delivery-challans'
  ```

### Policy 3: Authenticated Update
- Click **"New Policy"**
- Select **"Get started quickly"** → **"Update for authenticated users only"**
- Name: `Authenticated users can update delivery challans`
- Policy definition:
  ```sql
  bucket_id = 'delivery-challans'
  ```

### Policy 4: Authenticated Delete
- Click **"New Policy"**
- Select **"Get started quickly"** → **"Delete for authenticated users only"**
- Name: `Authenticated users can delete delivery challans`
- Policy definition:
  ```sql
  bucket_id = 'delivery-challans'
  ```

## Alternative: Run SQL in Supabase SQL Editor

You can also create the bucket by running this SQL in the **SQL Editor**:

```sql
-- Create storage bucket for delivery challans
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-challans', 'delivery-challans', true, 5242880, array['application/pdf'])
on conflict (id) do update set 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf'];

-- Allow authenticated users to upload delivery challans
create policy if not exists "Authenticated users can upload delivery challans"
on storage.objects for insert
to authenticated
with check (bucket_id = 'delivery-challans');

-- Allow public read access to delivery challans
create policy if not exists "Public read access to delivery challans"
on storage.objects for select
to public
using (bucket_id = 'delivery-challans');

-- Allow authenticated users to update their delivery challans
create policy if not exists "Authenticated users can update delivery challans"
on storage.objects for update
to authenticated
using (bucket_id = 'delivery-challans');

-- Allow authenticated users to delete delivery challans
create policy if not exists "Authenticated users can delete delivery challans"
on storage.objects for delete
to authenticated
using (bucket_id = 'delivery-challans');
```

After creating the bucket, refresh your application and the delivery challan generation should work!
