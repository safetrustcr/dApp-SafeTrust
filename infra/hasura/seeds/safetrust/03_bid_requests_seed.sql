-- Idempotent: fixed UUIDs + ON CONFLICT
DELETE FROM public.bid_requests
WHERE tenant_id = 'demo-tenant-uid-001';

INSERT INTO public.bid_requests (
    id,
    apartment_id,
    tenant_id,
    current_status,
    proposed_price,
    desired_move_in
)
VALUES
    (
        'bid-demo-001',
        'apt-demo-001',
        'demo-tenant-uid-001',
        'PENDING',
        1150.00,
        NOW() + INTERVAL '1 month'
    ),
    (
        'bid-demo-002',
        'apt-demo-002',
        'demo-tenant-uid-001',
        'APPROVED',
        900.00,
        NOW() + INTERVAL '2 months'
    )
ON CONFLICT (id) DO NOTHING;