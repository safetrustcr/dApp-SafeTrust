const express = require('express');
const router = express.Router();
const { authenticateFirebase } = require('../middleware/auth');
const authRoutes = require('./auth');

router.get('/health', (req, res) => res.status(200).send('OK'));
router.get('/test', (req, res) => res.json({ message: 'index.js is loaded' }));

// MOCK AUTH FOR LOCAL TESTING — REMOVE BEFORE COMMITTING
const mockAuth = (req, res, next) => {
    req.user = { uid: 'test-uid-12345', email: 'test@example.com' };
    next();
};

// Comment out real auth, use mock instead
// router.use('/api', authenticateFirebase);
router.use('/api', mockAuth);

router.use('/api/auth', authRoutes);

module.exports = router;