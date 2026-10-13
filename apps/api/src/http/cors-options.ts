import type { CorsOptions } from 'cors';

export function apiCorsOptions(frontendUrl = process.env.FRONTEND_URL): CorsOptions {
  return {
    origin: frontendUrl ? frontendUrl.split(',').map((origin) => origin.trim()) : ['http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'Idempotency-Key'],
    credentials: true,
  };
}
