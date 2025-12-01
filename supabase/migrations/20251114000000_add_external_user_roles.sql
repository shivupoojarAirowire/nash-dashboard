-- Add support for external user roles (vendor, customer, isp-vendor)
-- Part 1: Add new enum values
-- These must be committed before they can be used

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'isp-vendor';

-- Add a comment to clarify role types
COMMENT ON TYPE public.app_role IS 'User role enum. Internal: admin, manager, user, department. External: vendor, customer, isp-vendor';
