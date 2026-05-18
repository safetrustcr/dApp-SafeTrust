DELETE FROM public.bid_requests
WHERE tenant_id IN (
    SELECT id FROM public.users
    WHERE firebase_uid = 'demo-tenant-uid-001'
);

INSERT INTO public.bid_requests (
    id,
    apartment_id,
    tenant_id,
    current_status,
    proposed_price,
    desired_move_in
)
SELECT
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    u.id,
    'PENDING',
    1150.00,
    NOW() + INTERVAL '1 month'
FROM public.users u WHERE u.firebase_uid = 'demo-tenant-uid-001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bid_requests (
    id,
    apartment_id,
    tenant_id,
    current_status,
    proposed_price,
    desired_move_in
)
SELECT
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    u.id,
    'APPROVED',
    900.00,
    NOW() + INTERVAL '2 months'
FROM public.users u WHERE u.firebase_uid = 'demo-tenant-uid-001'
ON CONFLICT (id) DO NOTHING;