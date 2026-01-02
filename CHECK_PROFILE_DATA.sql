-- Quick Diagnostic: Check Profile Data for Engineering Users
-- Run this to see exactly what data is in the profiles table

-- Check all engineering users with ALL fields
SELECT 
  id,
  email,
  full_name,
  department,
  phone,
  created_at
FROM public.profiles
WHERE department = 'Engineering'
ORDER BY email;

-- Check if full_name is NULL or empty
SELECT 
  email,
  full_name,
  CASE 
    WHEN full_name IS NULL THEN '❌ NULL (will show email only)'
    WHEN full_name = '' THEN '❌ Empty string (will show email only)'
    ELSE '✅ Has name: ' || full_name
  END AS name_status,
  department
FROM public.profiles
WHERE department = 'Engineering';

-- Check for users matching "su" search
SELECT 
  email,
  full_name,
  department,
  CASE 
    WHEN LOWER(full_name) LIKE '%su%' THEN '✅ Matches in full_name'
    WHEN LOWER(email) LIKE '%su%' THEN '✅ Matches in email'
    ELSE '❌ No match for "su"'
  END AS search_match
FROM public.profiles
WHERE department = 'Engineering';

-- Update full_name if it's NULL (set it to email for now)
-- Uncomment to run:
-- UPDATE public.profiles 
-- SET full_name = email 
-- WHERE department = 'Engineering' AND full_name IS NULL;

-- Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
