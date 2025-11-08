-- Seed 'Users' feature globally and for admins/managers per-user
-- Global on by default
insert into feature_access (feature_name, enabled)
values ('Users', true)
on conflict (feature_name) do update set enabled = excluded.enabled;

-- Per-user: enable for admins and managers explicitly (so per-user overrides remain true)
insert into user_feature_access (user_id, feature_name, enabled)
select distinct ur.user_id, 'Users' as feature_name, true as enabled
from user_roles ur
where ur.role in ('admin','manager')
and not exists (
  select 1 from user_feature_access u
  where u.user_id = ur.user_id and u.feature_name = 'Users'
);
