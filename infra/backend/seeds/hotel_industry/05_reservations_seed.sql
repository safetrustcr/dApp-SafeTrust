INSERT INTO reservations (
  id, room_id, wallet_address,
  check_in, check_out, capacity,
  reservation_status, total_amount
)
VALUES
(
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'GBXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMG',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '5 days',
  2,
  'CONFIRMED',
  240.00      -- 3 nights x $80
),
(
  'e0000000-0000-0000-0000-000000000002'::uuid,
  'd0000000-0000-0000-0000-000000000002'::uuid,
  'GCYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMG',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '10 days',
  2,
  'PENDING',
  450.00      -- 3 nights x $150
)
ON CONFLICT DO NOTHING;
