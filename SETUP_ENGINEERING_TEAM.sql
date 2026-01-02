-- Quick Setup: Mark Users as Engineering Team
-- Run this to configure which users should appear in the engineer assignment dropdown

-- =====================================================================
-- STEP 1: View All Current Users
-- =====================================================================
SELECT 
  id,
  email,
  full_name,
  department,
  created_at
FROM public.profiles
ORDER BY email;

-- =====================================================================
-- STEP 2: Set Department for Engineering Users
-- =====================================================================

-- Option A: Update specific users by email
-- Replace the email addresses with your actual engineering team members
UPDATE public.profiles 
SET department = 'Engineering'
WHERE email IN (
  'engineer1@example.com',
  'engineer2@example.com',
  'engineer3@example.com',
  'shivanand@airowire.com'  -- Example user
);

-- Option B: Update users by name pattern
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE full_name ILIKE '%engineer%' OR email ILIKE '%engineer%';

-- Option C: Update all users except admins (use with caution!)
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE id NOT IN (
--   SELECT user_id FROM user_roles WHERE role = 'admin'
-- );

-- =====================================================================
-- STEP 3: Set Department for Other Teams (Optional)
-- =====================================================================

-- Sales Team
-- UPDATE public.profiles 
-- SET department = 'Sales'
-- WHERE email IN (
--   'sales1@example.com',
--   'sales2@example.com'
-- );

-- Management Team
-- UPDATE public.profiles 
-- SET department = 'Management'
-- WHERE email IN (
--   'manager1@example.com',
--   'manager2@example.com'
-- );

-- Support Team
-- UPDATE public.profiles 
-- SET department = 'Support'
-- WHERE email IN (
--   'support1@example.com',
--   'support2@example.com'
-- );

-- IT/Admin Team
-- UPDATE public.profiles 
-- SET department = 'IT'
-- WHERE email IN (
--   'admin1@example.com',
--   'it1@example.com'
-- );

-- =====================================================================
-- STEP 4: Verify Engineering Team Members
-- =====================================================================
SELECT 
  id,
  email,
  full_name,
  department,
  created_at
FROM public.profiles
WHERE department = 'Engineering'
ORDER BY full_name;

-- =====================================================================
-- STEP 5: View Department Summary
-- =====================================================================
SELECT 
  COALESCE(department, 'Not Set') AS department,
  COUNT(*) AS user_count
FROM public.profiles
GROUP BY department
ORDER BY user_count DESC;

-- =====================================================================
-- STEP 6: Set Default Department for Users Without One
-- =====================================================================
-- This sets users with NULL department to 'Engineering'
-- Only run if you want all unassigned users to be engineers
-- UPDATE public.profiles 
-- SET department = 'Engineering'
-- WHERE department IS NULL;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check users with no department
SELECT 
  email,
  full_name,
  department
FROM public.profiles
WHERE department IS NULL;

-- Check all departments in use
SELECT DISTINCT department 
FROM public.profiles 
WHERE department IS NOT NULL
ORDER BY department;

-- Check engineers with their roles
SELECT 
  p.email,
  p.full_name,
  p.department,
  STRING_AGG(ur.role::text, ', ') AS roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.department = 'Engineering'
GROUP BY p.email, p.full_name, p.department
ORDER BY p.email;

-- =====================================================================
-- IMPORTANT NOTES
-- =====================================================================
-- 
-- 1. Only users with department = 'Engineering' will appear in the 
--    "Assign to Engineering User" dropdown on the site assignment page
--
-- 2. The department field is case-sensitive, use 'Engineering' exactly
--
-- 3. You can create other departments (Sales, Support, etc.) for 
--    organization purposes, but only 'Engineering' users will be 
--    assignable for site loading tasks
--
-- 4. To add a new engineer in the future, just set their department:
--    UPDATE profiles SET department = 'Engineering' WHERE email = 'new@email.com'
--
-- 5. Users can have both a role (admin, manager, user) AND a department
--    These are independent fields for different purposes
--
-- =====================================================================

-- Success message
DO $$
DECLARE
  eng_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO eng_count 
  FROM public.profiles 
  WHERE department = 'Engineering';
  
  RAISE NOTICE '✅ Department setup complete!';
  RAISE NOTICE '📊 Total engineering team members: %', eng_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To verify, run:';
  RAISE NOTICE '   SELECT email, full_name, department FROM profiles WHERE department = ''Engineering'';';
  RAISE NOTICE '';
  RAISE NOTICE '➕ To add more engineers:';
  RAISE NOTICE '   UPDATE profiles SET department = ''Engineering'' WHERE email = ''engineer@email.com'';';
END $$;
