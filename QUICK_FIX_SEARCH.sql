-- ⚡ QUICK FIX: Enable Engineering User Search
-- Copy and run this entire script in Supabase SQL Editor

-- Step 1: Check current status
DO $$
DECLARE
  total_users INTEGER;
  eng_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO eng_users FROM public.profiles WHERE department = 'Engineering';
  
  RAISE NOTICE '📊 Current Status:';
  RAISE NOTICE '   Total users: %', total_users;
  RAISE NOTICE '   Engineering users: %', eng_users;
  RAISE NOTICE '';
  
  IF eng_users = 0 THEN
    RAISE NOTICE '❌ NO ENGINEERING USERS - Search will show no results!';
  ELSE
    RAISE NOTICE '✅ Engineering users configured';
  END IF;
END $$;

-- Step 2: Show all users (check who needs department update)
SELECT 
  email,
  full_name,
  department,
  CASE 
    WHEN department = 'Engineering' THEN '✅ Will appear in search'
    ELSE '❌ Will NOT appear in search'
  END AS search_status
FROM public.profiles
ORDER BY email;

-- Step 3: FIX - Set users as Engineering
-- ⚠️ IMPORTANT: Replace the email addresses below with your actual engineers!

UPDATE public.profiles 
SET department = 'Engineering'
WHERE email IN (
  -- 👇 ADD YOUR ENGINEERING TEAM EMAILS HERE:
  'suresh@example.com',        -- Example: Suresh H B
  'engineer1@example.com',     -- Replace with actual emails
  'engineer2@example.com',
  'engineer3@example.com'
  -- Add more as needed
);

-- Alternative: If you want ALL users to appear in the search, uncomment below:
-- UPDATE public.profiles SET department = 'Engineering';

-- Step 4: Verify the fix
SELECT 
  email,
  full_name,
  department
FROM public.profiles
WHERE department = 'Engineering'
ORDER BY full_name;

-- Step 5: Test search (simulates typing "su" in the app)
SELECT 
  email,
  full_name
FROM public.profiles
WHERE department = 'Engineering'
  AND (
    LOWER(full_name) LIKE '%su%' 
    OR LOWER(email) LIKE '%su%'
  );

-- Final status
DO $$
DECLARE
  eng_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO eng_count FROM public.profiles WHERE department = 'Engineering';
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Engineering users: %', eng_count;
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST INSTRUCTIONS:';
  RAISE NOTICE '1. Go to: http://localhost:8082/project-manager/load-site';
  RAISE NOTICE '2. Click: "Assign Site Loading"';
  RAISE NOTICE '3. Type 2 characters in "Assign to Engineering User" field';
  RAISE NOTICE '4. You should see matching names appear!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 TIP: Open browser console (F12) to see debug info';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
