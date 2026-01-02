-- Diagnostic: Check Engineering Team Setup
-- Run this to see current status and fix issues

-- =====================================================================
-- STEP 1: Check all users and their departments
-- =====================================================================
SELECT 
  email,
  full_name,
  department,
  CASE 
    WHEN department = 'Engineering' THEN '✅ Engineering'
    WHEN department IS NULL THEN '❌ No Department'
    ELSE '⚠️  ' || department
  END AS status
FROM public.profiles
ORDER BY department NULLS LAST, email;

-- =====================================================================
-- STEP 2: Count users by department
-- =====================================================================
SELECT 
  COALESCE(department, 'No Department Set') AS department,
  COUNT(*) AS user_count
FROM public.profiles
GROUP BY department
ORDER BY user_count DESC;

-- =====================================================================
-- STEP 3: Find users who should be engineers but aren't set
-- =====================================================================
-- Look for users with "engineer" in their name or email
SELECT 
  email,
  full_name,
  department
FROM public.profiles
WHERE (
  email ILIKE '%engineer%' 
  OR full_name ILIKE '%engineer%'
  OR email ILIKE '%eng%'
  OR full_name ILIKE '%suresh%'
  OR full_name ILIKE '%technician%'
) AND (department IS NULL OR department != 'Engineering')
ORDER BY email;

-- =====================================================================
-- STEP 4: QUICK FIX - Set all users as Engineering (if unsure)
-- =====================================================================
-- Uncomment and run if you want ALL users to appear in engineering dropdown
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE department IS NULL;

-- =====================================================================
-- STEP 5: SPECIFIC FIX - Set specific users as Engineering
-- =====================================================================
-- Replace email addresses with your actual engineering team members
-- Example: If "Suresh H B" should appear when searching "su"

UPDATE public.profiles 
SET department = 'Engineering'
WHERE email IN (
  -- Add your engineering team emails here:
  'suresh@example.com',
  'engineer1@example.com',
  'engineer2@example.com'
  -- Add more emails as needed
);

-- Or update by name:
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE full_name ILIKE '%suresh%';

-- =====================================================================
-- STEP 6: Verify the fix worked
-- =====================================================================
SELECT 
  email,
  full_name,
  department
FROM public.profiles
WHERE department = 'Engineering'
ORDER BY full_name;

-- =====================================================================
-- STEP 7: Test the search functionality
-- =====================================================================
-- This simulates what the app does when you search for "su"
SELECT 
  id,
  email,
  full_name,
  department
FROM public.profiles
WHERE department = 'Engineering'
  AND (
    LOWER(full_name) LIKE '%su%'
    OR LOWER(email) LIKE '%su%'
  )
ORDER BY full_name;

-- =====================================================================
-- COMMON SCENARIOS
-- =====================================================================

-- Scenario A: You want ONLY specific users (e.g., Suresh) to appear
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE email = 'suresh.hb@example.com';

-- Scenario B: You want multiple users to appear
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE email IN (
--   'user1@example.com',
--   'user2@example.com',
--   'user3@example.com'
-- );

-- Scenario C: You want all users EXCEPT admins to appear
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE id NOT IN (
--   SELECT user_id FROM user_roles WHERE role = 'admin'
-- );

-- =====================================================================
-- REMOVE ENGINEERING DEPARTMENT (if needed)
-- =====================================================================
-- If you accidentally set wrong users, remove the department:
-- UPDATE public.profiles 
-- SET department = NULL
-- WHERE email IN ('wrong-user@example.com');

-- =====================================================================
-- TROUBLESHOOTING
-- =====================================================================

-- Issue: No users appear when searching
-- Solution: Make sure at least one user has department = 'Engineering'

-- Issue: Wrong users appear
-- Solution: Check which users have department = 'Engineering' and update

-- Issue: User appears but name doesn't match search
-- Solution: Check the full_name field matches what you're typing

-- =====================================================================
-- FINAL VERIFICATION
-- =====================================================================
DO $$
DECLARE
  eng_count INTEGER;
  no_dept_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO eng_count FROM public.profiles WHERE department = 'Engineering';
  SELECT COUNT(*) INTO no_dept_count FROM public.profiles WHERE department IS NULL;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Engineering Team Status';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Engineering users: %', eng_count;
  RAISE NOTICE '⚠️  Users without department: %', no_dept_count;
  RAISE NOTICE '';
  
  IF eng_count = 0 THEN
    RAISE NOTICE '❌ NO ENGINEERING USERS FOUND!';
    RAISE NOTICE '   Action required: Update profiles to set department = ''Engineering''';
    RAISE NOTICE '   Example: UPDATE profiles SET department = ''Engineering'' WHERE email = ''your-email@example.com'';';
  ELSE
    RAISE NOTICE '✓ Engineering team is configured';
    RAISE NOTICE '  When you type 2+ characters (e.g., "su"), matching names will appear';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To view engineering users:';
  RAISE NOTICE '   SELECT email, full_name FROM profiles WHERE department = ''Engineering'';';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
