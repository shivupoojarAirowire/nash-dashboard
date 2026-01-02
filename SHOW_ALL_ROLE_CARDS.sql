-- RUN THIS IN SUPABASE SQL EDITOR
-- This will set up all role cards to appear on the Users page

-- Step 1: Insert all required features
INSERT INTO public.feature_access (feature_name, enabled) VALUES
('Dashboard', true),
('Stores', true),
('Operations', true),
('Finance', true),
('Project Operations', true),
('Engineering', true),
('Documents', true),
('Vendors', true),
('ISP Management', true),
('Network Operations', true),
('Reports', true),
('Settings', true)
ON CONFLICT (feature_name) DO UPDATE SET enabled = true;

-- Step 2: Grant ALL features to ALL existing users
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

-- Step 3: Create profiles for all users if missing
INSERT INTO public.profiles (id, email, full_name, enabled)
SELECT 
    id,
    email,
    email,
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET enabled = true;

-- Step 4: Assign roles to demonstrate all three internal roles
-- This will assign different roles to your existing users

-- Get list of all current users
SELECT id, email FROM auth.users ORDER BY created_at;

-- OPTION A: If you have 2 users, make one admin and one manager
-- Uncomment the lines below and replace the email addresses with actual emails from the query above

-- Make first user admin (replace with actual email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Make second user manager (replace with actual email of your second user)
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'manager'::public.app_role
-- FROM auth.users
-- WHERE email = 'SECOND_USER_EMAIL_HERE'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- OPTION B: Assign additional roles to existing users to show all cards
-- You can assign multiple roles to the same user for demonstration
-- This will make the cards appear even if you only have one or two users

-- Uncomment these to assign manager and user roles to show all three cards:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'manager'::public.app_role
-- FROM auth.users
-- WHERE email = 'shivanand@airowire.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'user'::public.app_role
-- FROM auth.users
-- WHERE email = 'shivanand@airowire.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Verify all users and their roles
SELECT 
    u.email,
    p.full_name,
    ARRAY_AGG(DISTINCT ur.role::text ORDER BY ur.role::text) as roles,
    COUNT(DISTINCT ufa.feature_name) FILTER (WHERE ufa.enabled = true) as features_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.user_feature_access ufa ON ufa.user_id = u.id
GROUP BY u.email, p.full_name
ORDER BY u.email;
