INSERT INTO public.user_wallets (user_id, wallet_address, chain_type, is_primary)
VALUES 
  ('demo-tenant-uid-001', 'GBXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMGTXXLEKBBAMG', 'STELLAR', true),
  ('demo-owner-uid-002',  'GCYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMG', 'STELLAR', true)
ON CONFLICT (wallet_address) DO NOTHING;