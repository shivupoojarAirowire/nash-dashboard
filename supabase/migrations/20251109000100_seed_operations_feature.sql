-- Seed Operations feature into feature_access (globally enabled)
insert into feature_access (feature_name, enabled)
values ('Operations', true)
on conflict (feature_name) do update set enabled = true;

-- Enable Operations for ALL users
insert into user_feature_access (user_id, feature_name, enabled)
select 
  p.id,
  'Operations',
  true
from profiles p
on conflict (user_id, feature_name) 
do update set enabled = true;

-- Seed Finance feature into feature_access (globally enabled)
insert into feature_access (feature_name, enabled)
values ('Finance', true)
on conflict (feature_name) do update set enabled = true;

-- Enable Finance for ALL users
insert into user_feature_access (user_id, feature_name, enabled)
select 
  p.id,
  'Finance',
  true
from profiles p
on conflict (user_id, feature_name) 
do update set enabled = true;

-- Seed Settings feature into feature_access (globally enabled)
insert into feature_access (feature_name, enabled)
values ('Settings', true)
on conflict (feature_name) do update set enabled = true;

-- Enable Settings for ALL users
insert into user_feature_access (user_id, feature_name, enabled)
select 
  p.id,
  'Settings',
  true
from profiles p
on conflict (user_id, feature_name) 
do update set enabled = true;

-- Seed Project Operations feature into feature_access (globally enabled)
insert into feature_access (feature_name, enabled)
values ('Project Operations', true)
on conflict (feature_name) do update set enabled = true;

-- Enable Project Operations for users who had Project Manager
insert into user_feature_access (user_id, feature_name, enabled)
select 
  p.id,
  'Project Operations',
  true
from profiles p
on conflict (user_id, feature_name) 
do update set enabled = true;
