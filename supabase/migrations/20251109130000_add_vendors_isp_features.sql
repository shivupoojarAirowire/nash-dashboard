-- Add Vendors and ISP Management features
INSERT INTO feature_access (feature_name)
VALUES 
  ('Vendors'),
  ('ISP Management')
ON CONFLICT (feature_name) DO NOTHING;

-- Grant access to all existing users
INSERT INTO user_feature_access (user_id, feature_name)
SELECT id, 'Vendors'
FROM auth.users
ON CONFLICT (user_id, feature_name) DO NOTHING;

INSERT INTO user_feature_access (user_id, feature_name)
SELECT id, 'ISP Management'
FROM auth.users
ON CONFLICT (user_id, feature_name) DO NOTHING;
