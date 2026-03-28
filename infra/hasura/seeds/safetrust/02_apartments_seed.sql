-- MVP demo apartment listings
INSERT INTO apartments (
  id, name, description, address, location,
  price_per_month, bedrooms, bathrooms, pet_friendly,
  is_promoted, owner_id, created_at, updated_at
) VALUES
(
  uuid_generate_v4(),
  'La sabana sur',
  'Beautiful apartment in the heart of San José with modern amenities and stunning views.',
  '329 Calle santos, paseo colón, San José',
  'San José',
  4058.00, 2, 1, true, true,
  'demo-owner-uid-002',
  NOW(), NOW()
),
(
  uuid_generate_v4(),
  'Los yoses',
  'Cozy apartment in the Los Yoses district, close to restaurants and parks.',
  '329 Calle santos, paseo colón, San José',
  'San José',
  4000.00, 2, 1, true, false,
  'demo-owner-uid-002',
  NOW(), NOW()
),
(
  uuid_generate_v4(),
  'Escazú plaza',
  'Modern studio near Multiplaza and Santa Ana.',
  '45 Avenida central, Escazú',
  'San José',
  3500.00, 1, 1, false, false,
  'demo-owner-uid-002',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;
