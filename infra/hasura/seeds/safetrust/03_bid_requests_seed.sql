-- MVP demo bid request (tenant → La sabana sur)
INSERT INTO bid_requests (
  id, apartment_id, tenant_id, current_status,
  proposed_price, desired_move_in, created_at, updated_at
) VALUES
(
  uuid_generate_v4(),
  (SELECT id FROM apartments WHERE name = 'La sabana sur' LIMIT 1),
  'demo-tenant-uid-001',
  'PENDING',
  4058.00,
  NOW() + INTERVAL '30 days',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;
