-- 04_escrows_seed.sql should reference apartments created in 02
INSERT INTO public.escrows (
  contract_id, engagement_id, property_id,
  apartment_id,  -- ← must match UUIDs from 02_apartments_seed.sql
  sender_address, receiver_address, amount, status
) VALUES (
  'STELLAR_CONTRACT_001',
  'engagement-abc-001',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'GBXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMG',
  'GCYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMG',
  2400.00,
  'pending_signature'
);