-- Idempotent: DELETE + INSERT ensures clean state on reapply
DELETE FROM public.apartments
WHERE owner_id IN ('demo-tenant-uid-001', 'demo-owner-uid-002');

INSERT INTO public.apartments (
    id,
    owner_id,
    name,
    description,
    price,
    warranty_deposit,
    address,
    is_available,
    available_from,
    available_until
)
VALUES
    (
        'apt-demo-001',
        'demo-owner-uid-002',
        'Moderno Apartamento en San José Centro',
        'Apartamento renovado con acabados de lujo, 2 habitaciones, 2 baños, cerca del Parque Nacional',
        1200.00,
        2400.00,
        '{"street": "Avenida Central", "neighborhood": "Centro", "city": "San José", "country": "Costa Rica", "postal_code": "10101"}',
        true,
        NOW() - INTERVAL '2 months',
        NOW() + INTERVAL '10 months'
    ),
    (
        'apt-demo-002',
        'demo-owner-uid-002',
        'Suite Ejecutiva Sabana Norte',
        'Suite perfecta para ejecutivos, amueblada, con gimnasio y piscina en el edificio',
        950.00,
        1900.00,
        '{"street": "Calle 42", "neighborhood": "Sabana Norte", "city": "San José", "country": "Costa Rica", "postal_code": "10108"}',
        true,
        NOW() - INTERVAL '1 month',
        NOW() + INTERVAL '12 months'
    )
ON CONFLICT (id) DO NOTHING;