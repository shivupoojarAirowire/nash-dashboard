-- RUN THIS IN SUPABASE SQL EDITOR
-- This will check what features exist and insert any missing ones

-- Step 1: Check what features currently exist
SELECT feature_name, enabled
FROM public.feature_access
ORDER BY feature_name;

-- Step 2: Insert all required features based on the sidebar menu items
-- These match the menu items in AppSidebar.tsx
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

-- Step 3: Verify all features are now in the table and enabled
SELECT feature_name, enabled
FROM public.feature_access
ORDER BY feature_name;

-- Step 4: Grant all features to shivanand@airowire.com explicitly
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
WHERE u.email = 'shivanand@airowire.com'
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

-- Step 5: Verify your user has all features
SELECT 
    u.email,
    ufa.feature_name,
    ufa.enabled
FROM auth.users u
LEFT JOIN public.user_feature_access ufa ON ufa.user_id = u.id
WHERE u.email = 'shivanand@airowire.com'
ORDER BY ufa.feature_name;
