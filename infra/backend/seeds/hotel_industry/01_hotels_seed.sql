INSERT INTO hotels (id, name, description, address, coordinates)
VALUES
(
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Grand SafeTrust',
  'Luxury hotel with stellar escrow payments',
  'Avenida Central, San José, Costa Rica',
  ST_SetSRID(ST_MakePoint(-84.0807, 9.9282), 4326)
),
(
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'Boutique San José',
  'Charming boutique hotel near Sabana park',
  'Calle 42, Sabana Norte, San José, Costa Rica',
  ST_SetSRID(ST_MakePoint(-84.0907, 9.9382), 4326)
)
ON CONFLICT DO NOTHING;
