-- EMERGENCY FIX: Run this in Supabase SQL Editor to fix 504 timeout on signup
-- This replaces the slow trigger with a fast one

-- Step 1: Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Replace function with minimal version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile (minimal data)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Step 3: Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create a function to update profiles later (run manually after signup)
CREATE OR REPLACE FUNCTION public.update_user_profile_details(
  user_id_param uuid,
  phone_param text DEFAULT NULL,
  address_param text DEFAULT NULL,
  department_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    phone = COALESCE(phone_param, phone),
    address = COALESCE(address_param, address),
    department = COALESCE(department_param, department),
    updated_at = now()
  WHERE id = user_id_param;
END;
$$;

-- Step 5: Update role assignment to be separate
CREATE OR REPLACE FUNCTION public.assign_user_role_if_missing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'user'::app_role
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Run this to fix any existing users without roles
SELECT public.assign_user_role_if_missing();

-- Step 6: Add feature population trigger (runs after profile creation, non-blocking)
CREATE OR REPLACE FUNCTION public.populate_features_after_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default features for the new user (non-blocking)
  INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
  SELECT NEW.id, f.feature_name, f.enabled
  FROM public.feature_access f
  WHERE f.enabled = true
  ON CONFLICT (user_id, feature_name) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail profile creation if feature population fails
    RAISE WARNING 'Failed to populate features for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table (runs after profile is created)
DROP TRIGGER IF EXISTS populate_features_on_profile_created ON public.profiles;
CREATE TRIGGER populate_features_on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_features_after_profile();
