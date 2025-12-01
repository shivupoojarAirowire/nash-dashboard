-- Part 2: Create view to classify internal vs external users
-- Run this AFTER the enum values have been committed

CREATE OR REPLACE VIEW user_roles_classified AS
SELECT 
  user_id,
  role,
  CASE 
    WHEN role IN ('admin', 'manager', 'user', 'department') THEN 'internal'
    WHEN role IN ('vendor', 'customer', 'isp-vendor') THEN 'external'
    ELSE 'unknown'
  END AS role_type
FROM user_roles;

COMMENT ON VIEW user_roles_classified IS 'Classifies user roles as internal or external for easier filtering';

-- Grant select on the view to authenticated users
GRANT SELECT ON user_roles_classified TO authenticated;
