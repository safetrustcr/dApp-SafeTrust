const express = require('express');
const router = express.Router();
const { authenticateFirebase } = require('../middleware/auth');
const authRoutes = require('./auth');

router.get('/health', (req, res) => res.status(200).send('OK'));
router.use('/api', authenticateFirebase);
router.use('/api/auth', authRoutes);

module.exports = router;