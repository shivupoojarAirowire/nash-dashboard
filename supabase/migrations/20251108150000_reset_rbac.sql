-- Safe RBAC reset: drops and recreates only RBAC-related objects
-- Does NOT touch application data tables like stores/deliveries/inventory
-- Run this in Supabase SQL Editor if CLI is unavailable

-- 1) Drop dependent functions first
DROP FUNCTION IF EXISTS public.has_permission(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- 2) Drop RBAC tables and type (CASCADE removes dependent policies/indexes)
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.feature_access CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the enum last so we can recreate it cleanly
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 3) Recreate enum and core tables
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'department');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(role, permission_id)
);

CREATE TABLE public.feature_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name text NOT NULL UNIQUE,
    enabled boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;

-- 5) Utilities (update_updated_at_column) – recreate if missing
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_feature_access_updated_at ON public.feature_access;
CREATE TRIGGER update_feature_access_updated_at
  BEFORE UPDATE ON public.feature_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Seed default features (idempotent)
INSERT INTO public.feature_access (feature_name, enabled) VALUES
  ('users', true),
  ('stores', true),
  ('inventory', true),
  ('delivery', true),
  ('subscriptions', true)
ON CONFLICT (feature_name) DO NOTHING;

-- 7) Seed permissions (idempotent)
INSERT INTO public.permissions (name, description) VALUES
  ('users.view', 'View users list'),
  ('users.create', 'Create new users'),
  ('users.edit', 'Edit user details'),
  ('users.delete', 'Delete users'),
  ('roles.assign', 'Assign roles to users'),
  ('features.manage', 'Enable/disable app features'),
  ('stores.view', 'View stores'),
  ('stores.create', 'Create stores'),
  ('stores.edit', 'Edit stores'),
  ('stores.delete', 'Delete stores'),
  ('inventory.view', 'View inventory'),
  ('inventory.create', 'Create inventory items'),
  ('inventory.edit', 'Edit inventory items'),
  ('inventory.delete', 'Delete inventory items')
ON CONFLICT (name) DO NOTHING;

-- 8) Grant all permissions to admin role (idempotent)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::public.app_role, p.id
FROM public.permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

-- 9) Assign limited sets to other roles (idempotent)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::public.app_role, p.id
FROM public.permissions p
WHERE p.name IN (
  'users.view',
  'stores.view','stores.create','stores.edit',
  'inventory.view','inventory.create','inventory.edit'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user'::public.app_role, p.id
FROM public.permissions p
WHERE p.name IN ('stores.view','inventory.view')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'department'::public.app_role, p.id
FROM public.permissions p
WHERE p.name IN ('stores.view','inventory.view','inventory.create','inventory.edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- 10) Recreate helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id AND p.name = _permission
  );
$$;

-- 11) RLS policies
-- user_roles
CREATE POLICY IF NOT EXISTS "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- permissions
CREATE POLICY IF NOT EXISTS "Admins manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- role_permissions
CREATE POLICY IF NOT EXISTS "Admins manage role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- feature_access
CREATE POLICY IF NOT EXISTS "Everyone can view features"
  ON public.feature_access FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Admins can manage features"
  ON public.feature_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 12) Ensure profiles has required columns (do not drop/recreate)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS department text;

-- 13) Ensure there is at least one admin: promote earliest user if none
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE role = 'admin'
)
ORDER BY u.created_at ASC
LIMIT 1;
