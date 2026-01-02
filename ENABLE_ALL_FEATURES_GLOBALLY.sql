-- RUN THIS IN SUPABASE SQL EDITOR
-- This will enable all features globally so ALL users can see the sidebar menu

-- Step 1: Enable all features globally in feature_access table
UPDATE public.feature_access
SET enabled = true;

-- Step 2: Verify all features are now enabled globally
SELECT feature_name, enabled
FROM public.feature_access
ORDER BY feature_name;

-- Step 3: (Optional) Grant features to your specific user as well
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
WHERE u.email = 'shivanand@airowire.com'
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

-- Step 4: Grant admin role to your user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Create your profile if missing
INSERT INTO public.profiles (id, email, full_name, enabled)
SELECT 
    id,
    email,
    'Shivanand Poojar',
    true
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    full_name = 'Shivanand Poojar',
    enabled = true;
