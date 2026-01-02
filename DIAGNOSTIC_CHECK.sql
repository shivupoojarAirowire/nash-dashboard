-- RUN THIS IN SUPABASE SQL EDITOR TO DIAGNOSE THE ISSUE
-- This will show what's currently in your database

-- 1. Check if user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'shivanand@airowire.com';

-- 2. Check user roles
SELECT ur.user_id, u.email, ur.role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'shivanand@airowire.com';

-- 3. Check available features in feature_access table
SELECT feature_name, enabled
FROM public.feature_access
ORDER BY feature_name;

-- 4. Check user's current feature access
SELECT ufa.user_id, u.email, ufa.feature_name, ufa.enabled
FROM public.user_feature_access ufa
JOIN auth.users u ON u.id = ufa.user_id
WHERE u.email = 'shivanand@airowire.com'
ORDER BY ufa.feature_name;

-- 5. Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_roles', 'feature_access', 'user_feature_access', 'profiles')
ORDER BY table_name;
