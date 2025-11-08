-- Seed Documents feature into feature_access (globally enabled)
insert into feature_access (feature_name, enabled)
values ('Documents', true)
on conflict (feature_name) do update set enabled = true;

-- Enable Documents for ALL users (everyone can upload, delete, and share their documents)
insert into user_feature_access (user_id, feature_name, enabled)
select 
  p.id,
  'Documents',
  true
from profiles p
on conflict (user_id, feature_name) 
do update set enabled = true;
