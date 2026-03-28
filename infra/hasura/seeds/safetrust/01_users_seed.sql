-- MVP demo users (Firebase UID format — TEXT primary key)
INSERT INTO users (id, email, last_seen) VALUES
  ('demo-tenant-uid-001', 'john_s@gmail.com',         NOW()),
  ('demo-owner-uid-002',  'albertoCasas100@gmail.com', NOW())
ON CONFLICT (id) DO NOTHING;
