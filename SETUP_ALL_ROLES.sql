-- RUN THIS IN SUPABASE SQL EDITOR
-- This will set up admin, manager, and user roles with full feature access

-- Step 1: Ensure all features exist and are enabled globally
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

-- Step 2: Create sample users for each role (if they don't exist)
-- You can modify these email addresses to match your actual users

-- Grant ALL features to ALL existing users
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

-- Step 3: Assign roles to specific users
-- Replace these email addresses with your actual user emails

-- Make shivanand@airowire.com an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Example: Make another user a manager (replace with actual email)
-- Uncomment and replace email when you have a manager user
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'manager'::public.app_role
-- FROM auth.users
-- WHERE email = 'manager@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Example: Make another user a regular user (replace with actual email)
-- Uncomment and replace email when you have a regular user
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'user'::public.app_role
-- FROM auth.users
-- WHERE email = 'user@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Create profiles for all auth.users if missing
INSERT INTO public.profiles (id, email, full_name, enabled)
SELECT 
    id,
    email,
    email, -- Using email as full_name initially
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET enabled = true;

-- Step 5: Verify all users, their roles, and feature counts
SELECT 
    p.email,
    p.full_name,
    p.enabled,
    COALESCE(ur.role::text, 'no role') as role,
    COUNT(DISTINCT ufa.feature_name) as features_granted
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.user_feature_access ufa ON ufa.user_id = p.id AND ufa.enabled = true
GROUP BY p.email, p.full_name, p.enabled, ur.role
ORDER BY p.email;

-- Step 6: Show all available features
SELECT 
    feature_name,
    enabled,
    COUNT(ufa.user_id) as users_with_access
FROM public.feature_access fa
LEFT JOIN public.user_feature_access ufa ON ufa.feature_name = fa.feature_name AND ufa.enabled = true
GROUP BY fa.feature_name, fa.enabled
ORDER BY fa.feature_name;
