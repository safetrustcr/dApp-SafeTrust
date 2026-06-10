const db = require('./db');

const SYNC_USER_QUERY = `
  INSERT INTO public.users (
    id, email,first_name, last_name,
    phone_number, country_code, location,
    last_seen
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    last_seen    = NOW(),
    email        = EXCLUDED.email,
    first_name   = EXCLUDED.first_name,
    last_name    = EXCLUDED.last_name,
    phone_number = COALESCE(EXCLUDED.phone_number, public.users.phone_number),
    country_code = COALESCE(EXCLUDED.country_code, public.users.country_code),
    location     = COALESCE(EXCLUDED.location,     public.users.location)
  RETURNING id, email, first_name,
            last_name, phone_number, country_code, location, last_seen
`;

async function syncUser({ uid, email, first_name, last_name, phone_number, country_code, location }) {
  const values = [
    uid,
    email,
    first_name || null,
    last_name || null,
    phone_number || null,
    country_code || null,
    location     || null,
  ];

  const result = await db.query(SYNC_USER_QUERY, values);
  return result.rows[0];
}

module.exports = { syncUser };