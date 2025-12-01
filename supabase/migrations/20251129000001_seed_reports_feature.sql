-- Enable Reports feature for all users
-- This migration adds the Reports feature to the feature_access table
-- and enables it for all existing users

-- Insert the feature into feature_access table
insert into public.feature_access (feature_name, enabled)
values ('Reports', true)
on conflict (feature_name) do nothing;

-- Enable Reports for all users
insert into public.user_feature_access (user_id, feature_name, enabled)
select 
  id,
  'Reports',
  true
from auth.users
where not exists (
  select 1 from public.user_feature_access ufa
  where ufa.user_id = auth.users.id 
    and ufa.feature_name = 'Reports'
);
