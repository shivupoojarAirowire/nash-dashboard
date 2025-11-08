-- Seed Engineering feature into global and per-user flags for admins/managers
insert into public.feature_access (feature_name, enabled)
select 'Engineering', true
where not exists (select 1 from public.feature_access where feature_name = 'Engineering');

insert into public.user_feature_access (user_id, feature_name, enabled)
select ur.user_id, 'Engineering', true
from public.user_roles ur
where ur.role in ('admin','manager')
and not exists (
  select 1 from public.user_feature_access ufa
  where ufa.user_id = ur.user_id and ufa.feature_name = 'Engineering'
);
