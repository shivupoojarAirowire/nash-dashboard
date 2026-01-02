-- Make shivanand@airowire.com an admin
-- This migration adds the admin role to the specified user and grants all features

-- Add admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'shivanand@airowire.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role = 'admin'::public.app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant all features to this admin user
INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
SELECT u.id, fa.feature_name, true
FROM auth.users u
CROSS JOIN public.feature_access fa
WHERE u.email = 'shivanand@airowire.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_feature_access ufa
  WHERE ufa.user_id = u.id AND ufa.feature_name = fa.feature_name
)
ON CONFLICT (user_id, feature_name) DO UPDATE SET enabled = true;
