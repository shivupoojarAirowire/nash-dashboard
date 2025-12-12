-- Seed Customer feature
INSERT INTO public.feature_access (feature_name, description, enabled)
VALUES ('Customer', 'Customer management module', true)
ON CONFLICT (feature_name) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;
