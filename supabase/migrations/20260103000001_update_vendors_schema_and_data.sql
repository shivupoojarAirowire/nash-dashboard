-- Update vendors table to match passive vendor list structure
ALTER TABLE vendors DROP COLUMN IF EXISTS address;
ALTER TABLE vendors DROP COLUMN IF EXISTS email;
ALTER TABLE vendors DROP COLUMN IF EXISTS rating;
ALTER TABLE vendors DROP COLUMN IF EXISTS expertise;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS poc TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS office_location TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS operational_area TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Update the name column to store POC name
COMMENT ON COLUMN vendors.name IS 'Point of Contact name';
COMMENT ON COLUMN vendors.company IS 'Company name';
COMMENT ON COLUMN vendors.phone IS 'Contact number (primary)';
COMMENT ON COLUMN vendors.city IS 'Office location';

-- Insert passive vendor data
INSERT INTO vendors (company, name, phone, city, operational_area, service_type, status) VALUES
('Free lancer', 'Pallav', '7358418805', 'Chennai', 'Chennai', 'Mounting', 'Active'),
('Free lancer', 'Sangam', '9672221666', 'Alwar', 'Alwar', 'Mounting', 'Active'),
('Free lancer', '', '9802458104', 'Hissar', 'Hissar', 'Mounting', 'Active'),
('Free lancer', 'Davendra', '9812225395', 'Rohtak', 'Rohtak', 'Mounting', 'Active'),
('Free lancer', 'Sourav', '8178984304', 'Welcome hub', 'Welcome hub', 'Mounting/Tech support', 'Active'),
('Free lancer', 'Gautam', '9870507123', 'Kollam', 'Kollam', 'Mounting', 'Active'),
('Free lancer', 'Alex', '8129790788', 'Kollam', 'Kollam', 'Mounting', 'Active'),
('Free lancer', '', '9910594533', 'Old faridabad', 'Old faridabad', 'Mounting', 'Active'),
('Free lancer', '', '8081708487', 'Najafgarh', 'Najafgarh', 'Mounting', 'Active'),
('Free lancer', '', '9416120131', 'Karnalhub', 'Karnalhub', 'Mounting', 'Active'),
('Trustly', 'Sanjay', '7977561414', 'Mumbai', 'Pan India', 'Engineering support/ Mounting', 'Active'),
('Dynamic IT networks', 'Vijay', '9036366123', 'BNG', 'Pan India', 'Passive design/work', 'Active'),
('Scogo', 'Nitin', '9167148802', 'Mumbai', 'Pan India', 'Passive design/work/ISP provider', 'Active'),
('Scogo', 'Kamini', '8422007424', 'Mumbai', 'Pan India', 'Passive design/work/ISP provider', 'Active'),
('IOTA', 'Arjun', '9845508791', 'BNG', '', 'Passive Work', 'Active'),
('Mvs', 'Venkatesh', '9686521214', 'BNG', 'Pan India', 'Passive Work', 'Active'),
('Network Tec Lab', '', '8879004536', 'Mumbai', 'Mumbai', 'Passive work', 'Active'),
('I4 communications', 'Rahul (Sales & Operations)', '9980077778', 'BNG', 'BNG', 'Passive work', 'Active'),
('Free lancer', 'Samareul', '9381013746', 'India', '', 'Engineering support/ Mounting', 'Active'),
('A2M Tech', 'Sai Raj', '6364745281', 'BNG', 'Pan India', 'ISP & Engineer support', 'Active'),
('A2M Tech', 'Sai Raj', '9844666971', 'BNG', 'Pan India', 'ISP & Engineer support', 'Active'),
('Unknown', '', '8951446821', 'Hubballi', '', '', 'Active'),
('Javaskuare teck', 'Vinod', '9741845784', 'BNG', '', '', 'Active'),
('ADR net', 'Rahul Kote', '9049005964', 'Pune', 'Pan India', 'Passive Work', 'Active'),
('Regards network', 'Arunish', '7680892143', 'Delhi', 'Pan India', 'Passive Work', 'Active'),
('IRA networks', 'Madhu', '', 'BNG', 'BNG', 'Passive Work', 'Active')
ON CONFLICT DO NOTHING;
