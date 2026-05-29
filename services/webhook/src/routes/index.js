const express = require('express');
const router = express.Router();
const { authenticateFirebase } = require('../middleware/auth');
const authRoutes = require('./auth');

// Public routes — no auth required
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Protected routes — authenticateFirebase runs before every route below
router.use('/api/auth', authenticateFirebase, authRoutes);

module.exports = router;
