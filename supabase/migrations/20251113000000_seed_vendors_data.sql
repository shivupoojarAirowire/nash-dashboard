-- Seed vendor data
-- Insert vendors with rating default to 1 for everyone

INSERT INTO vendors (company, name, phone, address, city, rating, expertise, email, status) VALUES
('Free lancer - Pallav', 'Pallav', '7358418805', 'Chennai', 'Chennai', 1, ARRAY['Mounting'], 'pallav@freelancer.com', 'Active'),
('Free lancer - Sangam', 'Sangam', '9672221666', 'Alwar', 'Alwar', 1, ARRAY['Mounting'], 'sangam@freelancer.com', 'Active'),
('Free lancer - Hissar', 'Vendor', '9802458104', 'Hissar', 'Hissar', 1, ARRAY['Mounting'], 'hissar@freelancer.com', 'Active'),
('Free lancer - Davendra', 'Davendra', '9812225395', 'Rohtak', 'Rohtak', 1, ARRAY['Mounting'], 'davendra@freelancer.com', 'Active'),
('Free lancer - Sourav', 'Sourav', '8178984304', 'Welcome hub', 'Welcome hub', 1, ARRAY['Mounting', 'Tech support'], 'sourav@freelancer.com', 'Active'),
('Free lancer - Gautam', 'Gautam', '9870507123', 'Kollam', 'Kollam', 1, ARRAY['Mounting'], 'gautam@freelancer.com', 'Active'),
('Free lancer - Alex', 'Alex', '8129790788', 'Kollam', 'Kollam', 1, ARRAY['Mounting'], 'alex@freelancer.com', 'Active'),
('Free lancer - Old Faridabad', 'Vendor', '9910594533', 'Old faridabad', 'Old faridabad', 1, ARRAY['Mounting'], 'faridabad@freelancer.com', 'Active'),
('Free lancer - Najafgarh', 'Vendor', '8081708487', 'Najafgarh', 'Najafgarh', 1, ARRAY['Mounting'], 'najafgarh@freelancer.com', 'Active'),
('Free lancer - Karnalhub', 'Vendor', '9416120131', 'Karnalhub', 'Karnalhub', 1, ARRAY['Mounting'], 'karnalhub@freelancer.com', 'Active'),
('Trustly', 'Sanjay', '7977561414', 'Mumbai', 'Pan India', 1, ARRAY['Engineering support', 'Mounting'], 'sanjay@trustly.com', 'Active'),
('Dynamic IT networks', 'Vijay', '9036366123', 'BNG', 'Pan India', 1, ARRAY['Passive design', 'Passive work'], 'vijay@dynamicit.com', 'Active'),
('Scogo', 'Nitin', '9167148802', 'Mumbai', 'Pan India', 1, ARRAY['Passive design', 'Passive work', 'ISP provider'], 'nitin@scogo.com', 'Active'),
('Scogo', 'Kamini', '8422007424', 'Mumbai', 'Pan India', 1, ARRAY['Passive design', 'Passive work', 'ISP provider'], 'kamini@scogo.com', 'Active'),
('IOTA', 'Arjun', '9845508791', 'BNG', 'BNG', 1, ARRAY['Passive Work'], 'arjun@iota.com', 'Active'),
('Mvs', 'Venkatesh', '9686521214', 'BNG', 'Pan India', 1, ARRAY['Passive Work'], 'venkatesh@mvs.com', 'Active'),
('Network Tec Lab', 'Vendor', '8879004536', 'Mumbai', 'Mumbai', 1, ARRAY['Passive work'], 'contact@networkteclab.com', 'Active'),
('I4 communications', 'Rahul (Sales & Operations)', '9980077778', 'BNG', 'BNG', 1, ARRAY['Passive work'], 'rahul@i4communications.com', 'Active'),
('Free lancer - Samareul', 'Samareul', '9381013746', 'India', 'India', 1, ARRAY['Engineering support', 'Mounting'], 'samareul@freelancer.com', 'Active'),
('A2M Tech', 'Sai Raj', '6364745281', 'BNG', 'Pan India', 1, ARRAY['ISP', 'Engineer support'], 'sairaj@a2mtech.com', 'Active'),
('Free lancer - Hubballi', 'Vendor', '8951446821', 'Hubballi', 'Hubballi', 1, ARRAY['Mounting'], 'hubballi@freelancer.com', 'Active'),
('Javaskuare teck', 'Vinod', '9741845784', 'BNG', 'BNG', 1, ARRAY['Technical'], 'vinod@javaskuare.com', 'Active'),
('ADR net', 'Rahul Kote', '9049005964', 'Pune', 'Pan India', 1, ARRAY['Passive Work'], 'rahul@adrnet.com', 'Active'),
('Regards network', 'Arunish', '7680892143', 'Delhi', 'Pan India', 1, ARRAY['Passive Work'], 'arunish@regardsnetwork.com', 'Active')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE vendors IS 'Vendors table now includes seeded data for freelancers and companies';
