-- Allow admins and managers to view all profiles
-- Run this migration in Supabase SQL Editor or include in your migration flow

CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and (
          public.has_role(ur.user_id, 'admin'::public.app_role) OR
          public.has_role(ur.user_id, 'manager'::public.app_role)
        )
    )
  );

-- Note: This policy assumes `user_roles.role` contains 'admin' or 'manager'.
-- If your role values differ, adjust the IN list accordingly.
