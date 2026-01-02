-- Fix user_feature_access RLS to allow PMO and admin users

-- Drop existing policies
DROP POLICY IF EXISTS "user_feature_access_admin_all" ON public.user_feature_access;
DROP POLICY IF EXISTS "user_feature_access_self_read" ON public.user_feature_access;

-- Allow admins and PMO users to manage all user feature access
CREATE POLICY "user_feature_access_admin_pmo_all"
  ON public.user_feature_access
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND department = 'PMO'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND department = 'PMO'
    )
  );

-- Users can read their own feature flags
CREATE POLICY "user_feature_access_self_read"
  ON public.user_feature_access 
  FOR SELECT
  USING (user_id = auth.uid());
