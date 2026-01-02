    -- RUN THIS IN SUPABASE SQL EDITOR
    -- This will create your profile, grant admin role, and enable all features

    -- Step 1: Create profile if missing
    INSERT INTO public.profiles (id, email, full_name, enabled)
    SELECT 
        id,
        email,
        email, -- Use email as full_name for now
        true
    FROM auth.users
    WHERE email = 'shivanand@airowire.com'
    ON CONFLICT (id) DO UPDATE 
    SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.email,
        enabled = true;

    -- Step 2: Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::public.app_role
    FROM auth.users
    WHERE email = 'shivanand@airowire.com'
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Step 3: Grant ALL features
    INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
    SELECT u.id, fa.feature_name, true
    FROM auth.users u
    CROSS JOIN public.feature_access fa
    WHERE u.email = 'shivanand@airowire.com'
    ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;

    -- Step 4: Verify everything was created
    SELECT 
        u.email,
        p.full_name,
        p.enabled as profile_enabled,
        ur.role,
        COUNT(ufa.feature_name) as features_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    LEFT JOIN public.user_feature_access ufa ON ufa.user_id = u.id AND ufa.enabled = true
    WHERE u.email = 'shivanand@airowire.com'
    GROUP BY u.email, p.full_name, p.enabled, ur.role;

    -- Step 5: List all your features
    SELECT 
        u.email,
        ufa.feature_name,
        ufa.enabled
    FROM auth.users u
    JOIN public.user_feature_access ufa ON ufa.user_id = u.id
    WHERE u.email = 'shivanand@airowire.com'
    ORDER BY ufa.feature_name;
