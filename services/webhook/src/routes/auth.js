const express = require('express');
const router = express.Router();
const db = require('../services/db');

/**
 * POST /api/auth/sync-user — upsert Firebase user into public.users.
 *
 * Reads uid and email from req.user (set by authenticateFirebase middleware).
 * Reads phone_number, country_code, location from req.body (optional).
 * COALESCE on update ensures existing values are never overwritten with null.
 *
 * @route POST /api/auth/sync-user
 * @access Protected (requires Firebase JWT)
 */
router.post('/sync-user', async (req, res) => {
  const { uid, email } = req.user;
  const { phone_number, country_code, location } = req.body;

  try {
    const query = `
      INSERT INTO public.users (
        id, firebase_uid, email,
        phone_number, country_code, location,
        last_seen
      )
      VALUES ($1, $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        last_seen    = NOW(),
        email        = EXCLUDED.email,
        firebase_uid = EXCLUDED.firebase_uid,
        phone_number = COALESCE(EXCLUDED.phone_number, public.users.phone_number),
        country_code = COALESCE(EXCLUDED.country_code, public.users.country_code),
        location     = COALESCE(EXCLUDED.location,     public.users.location)
      RETURNING id, firebase_uid, email, first_name,
                last_name, phone_number, country_code, location, last_seen
    `;
    const values = [
      uid,
      email,
      phone_number || null,
      country_code || null,
      location     || null,
    ];

    const result = await db.query(query, values);
    const user = result.rows[0];

    console.log(`[sync-user] ✅ user synced — uid: ${user.firebase_uid}`);

    res.status(200).json({ user });
  } catch (error) {
    console.error('[sync-user] ❌ error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;