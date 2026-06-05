const { syncUser } = require('../services/user.service');

async function syncUserHandler(req, res) {
    const { uid, email } = req.user;
    const { phone_number, country_code, location } = req.body;

    try {
        const user = await syncUser({
            uid,
            email,
            phone_number,
            country_code,
            location,
        });

        console.log('[sync-user] ✅ user synced:', uid);
        return res.status(200).json({ user });
    } catch (error) {
        console.error('[sync-user] ❌ error:', error.message);
        return res.status(500).json({ error: 'Database error' });
    }
}

module.exports = { syncUserHandler };