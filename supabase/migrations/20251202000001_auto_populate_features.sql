-- Create a trigger to populate features after profile creation
-- This runs separately from the auth trigger to avoid blocking signup

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

COMMENT ON FUNCTION public.populate_features_after_profile() IS 'Automatically populate feature access after profile creation';
