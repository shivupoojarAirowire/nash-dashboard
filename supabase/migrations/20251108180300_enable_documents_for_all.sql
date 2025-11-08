-- Enable Documents for all existing users immediately
insert into user_feature_access (user_id, feature_name, enabled)
select 
  id,
  'Documents',
  true
from auth.users
on conflict (user_id, feature_name) 
do update set enabled = true;           
