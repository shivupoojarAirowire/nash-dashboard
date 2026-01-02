-- RUN THIS IN SUPABASE SQL EDITOR
-- This will check for and fix policies/triggers causing the JSON operator error

-- Step 1: Check policies on profiles table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Check triggers on profiles table  
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Step 3: Drop and recreate simple policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create simple SELECT policy that allows all authenticated users to see all profiles
CREATE POLICY "Allow all authenticated users to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Create INSERT policy
CREATE POLICY "Allow users to insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create UPDATE policy
CREATE POLICY "Allow users to update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Step 4: Now enable all features globally
UPDATE public.feature_access
SET enabled = true;

-- Step 5: Create profile for shivanand@airowire.com
INSERT INTO public.profiles (id, email, full_name, enabled)
SELECT 
    id,
    email,
    'Shivanand Poojar',
    true
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (id) DO UPDATE 
SET enabled = true, full_name = 'Shivanand Poojar';

-- Step 6: Grant admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'shivanand@airowire.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 7: Verify profile was created
SELECT id, email, full_name, enabled
FROM public.profiles
WHERE email = 'shivanand@airowire.com';
