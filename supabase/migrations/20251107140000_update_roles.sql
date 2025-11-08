-- Drop existing type and recreate with new roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'department');

-- Recreate user_roles table since CASCADE dropped it
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add enabled field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- Add department field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department text;

-- Create permissions table for RBAC
CREATE TABLE public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(role, permission_id)
);

-- Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create feature_access table for tab/feature control
CREATE TABLE IF NOT EXISTS public.feature_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name text NOT NULL UNIQUE,
    enabled boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on feature_access
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_feature_access_updated_at
    BEFORE UPDATE ON public.feature_access
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features
INSERT INTO public.feature_access (feature_name, enabled) VALUES
    ('users', true),
    ('stores', true),
    ('inventory', true),
    ('delivery', true),
    ('subscriptions', true)
ON CONFLICT (feature_name) DO NOTHING;

-- Insert default permissions
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
    ('inventory.delete', 'Delete inventory items');

-- Assign permissions to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::app_role, id FROM public.permissions 
WHERE name IN (
    'users.view',
    'stores.view', 'stores.create', 'stores.edit',
    'inventory.view', 'inventory.create', 'inventory.edit'
);

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user'::app_role, id FROM public.permissions 
WHERE name IN (
    'stores.view',
    'inventory.view'
);

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'department'::app_role, id FROM public.permissions 
WHERE name IN (
    'stores.view',
    'inventory.view',
    'inventory.create',
    'inventory.edit'
);

-- Recreate has_role function (was dropped by CASCADE) - MUST be before has_permission
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(
    _user_id uuid,
    _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = _user_id
        AND p.name = _permission
    );
$$;

-- Create policies for tables
CREATE POLICY "Admins can do everything with permissions"
    ON public.permissions
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can do everything with role_permissions"
    ON public.role_permissions
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Add policies for viewing profiles based on role
CREATE POLICY "Users can view enabled profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        enabled = true 
        AND (
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'manager')
            OR id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
    );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy for feature_access
CREATE POLICY "Everyone can view features"
  ON public.feature_access
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage features"
  ON public.feature_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));