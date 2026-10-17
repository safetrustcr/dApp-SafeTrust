-- 06_trustless_work_escrows_seed.sql
-- Idempotent: DELETE before INSERT, respects FK order
--
-- Seeds representative trustless_work_escrows lifecycle data so
-- contributors can test the Fund Escrow and Mark Completed → Release
-- Funds flows without deploying a real escrow via Freighter.
--
-- Dependencies (applied in order):
--   01_users_seed.sql            → demo-tenant-uid-001, demo-owner-uid-002
--   02_user_wallets_seed.sql     → wallet_addresses for tenant + owner
--   03_apartments_seed.sql       → apartment UUIDs for booking_id
--
-- DELETE order: escrow_milestones → trustless_work_escrows

DELETE FROM public.escrow_milestones
WHERE escrow_id IN (
  SELECT id FROM public.trustless_work_escrows
  WHERE contract_id IN (
    'STELLAR_TEST_CONTRACT_001',
    'STELLAR_TEST_CONTRACT_002'
  )
);

DELETE FROM public.trustless_work_escrows
WHERE contract_id IN (
  'STELLAR_TEST_CONTRACT_001',
  'STELLAR_TEST_CONTRACT_002'
);

-- Escrow 1: created — tests Fund Escrow action
INSERT INTO public.trustless_work_escrows (
  contract_id, marker, approver, releaser,
  escrow_type, status, asset_code, amount, balance,
  booking_id, tenant_id
)
SELECT
  'STELLAR_TEST_CONTRACT_001',
  ow.wallet_address,
  tn.wallet_address,
  'GCYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGAAAAAAAAAAA',
  'single_release', 'created', 'USDC',
  1200.00, 0.00,
  '550e8400-e29b-41d4-a716-446655440001',
  'safetrust'
FROM public.user_wallets ow
CROSS JOIN public.user_wallets tn
WHERE ow.user_id = 'demo-owner-uid-002'
  AND tn.user_id = 'demo-tenant-uid-001'
ON CONFLICT (contract_id) DO NOTHING;

-- Escrow 2: funded — tests Mark Completed → Release Funds path
INSERT INTO public.trustless_work_escrows (
  contract_id, marker, approver, releaser,
  escrow_type, status, asset_code, amount, balance,
  booking_id, tenant_id
)
SELECT
  'STELLAR_TEST_CONTRACT_002',
  ow.wallet_address,
  tn.wallet_address,
  'GCYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGTYYLEJCCBMGAAAAAAAAAAA',
  'single_release', 'funded', 'USDC',
  950.00, 950.00,
  '550e8400-e29b-41d4-a716-446655440002',
  'safetrust'
FROM public.user_wallets ow
CROSS JOIN public.user_wallets tn
WHERE ow.user_id = 'demo-owner-uid-002'
  AND tn.user_id = 'demo-tenant-uid-001'
ON CONFLICT (contract_id) DO NOTHING;

-- Milestone for Escrow 2 (pending — ready for approve-milestone action)
INSERT INTO public.escrow_milestones (
  escrow_id, milestone_id, description,
  amount, status, tenant_id
)
SELECT
  id, 'check_in',
  'Check-in milestone for rental period',
  950.00, 'pending', 'safetrust'
FROM public.trustless_work_escrows
WHERE contract_id = 'STELLAR_TEST_CONTRACT_002'
ON CONFLICT (escrow_id, milestone_id) DO NOTHING;
