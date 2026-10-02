-- hotel_industry users.id seed
INSERT INTO users (id, firebase_uid, email, first_name, last_name, phone_number, role)
VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'demo-manager-firebase-uid-001',
  'manager@grandsafetrust.com',
  'Carlos', 'Mendoza', '+50688001122',
  'MANAGER'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'demo-guest-firebase-uid-001',
  'john.guest@gmail.com',
  'John', 'Smith', '+50688003344',
  'GUEST'
),
(
  'b0000000-0000-0000-0000-000000000003',
  'demo-guest-firebase-uid-002',
  'maria.guest@gmail.com',
  'Maria', 'González', '+50688005566',
  'GUEST'
)
ON CONFLICT DO NOTHING;
