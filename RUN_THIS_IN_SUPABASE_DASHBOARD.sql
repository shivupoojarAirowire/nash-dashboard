-- INSTRUCTIONS: 
-- 1. Go to your Supabase project dashboard
-- 2. Open the SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- 5. Refresh your application

-- Step 1: Make shivanand@airowire.com an admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'shivanand@airowire.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Grant ALL features to this admin user
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
WHERE u.email = 'shivanand@airowire.com'
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

-- Step 3: Verify the grants
SELECT 
    p.email,
    ur.role,
    COUNT(ufa.feature_name) as features_granted
FROM auth.users p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.user_feature_access ufa ON ufa.user_id = p.id AND ufa.enabled = true
WHERE p.email = 'shivanand@airowire.com'
GROUP BY p.email, ur.role;

-- Step 4: List all granted features
SELECT 
    p.email,
    ufa.feature_name,
    ufa.enabled
FROM auth.users p
JOIN public.user_feature_access ufa ON ufa.user_id = p.id
WHERE p.email = 'shivanand@airowire.com'
ORDER BY ufa.feature_name;
