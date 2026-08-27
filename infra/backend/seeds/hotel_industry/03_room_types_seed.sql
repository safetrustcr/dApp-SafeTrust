INSERT INTO room_types (id, name, description)
VALUES
(
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'Standard',
  'Comfortable room with all basic amenities'
),
(
  'c0000000-0000-0000-0000-000000000002'::uuid,
  'Deluxe',
  'Spacious room with premium furnishings and city view'
),
(
  'c0000000-0000-0000-0000-000000000003'::uuid,
  'Suite',
  'Full suite with living area, kitchenette, and panoramic view'
)
ON CONFLICT DO NOTHING;
