const express = require('express');
const router = express.Router();
const { syncUserHandler } = require('../controllers/auth.controller');

// MOCK AUTH FOR LOCAL TESTING — REMOVE BEFORE COMMITTING
const mockAuth = (req, res, next) => {
    req.user = { uid: 'test-uid-12345', email: 'test@example.com' };
    next();
};

router.post('/sync-user', mockAuth, syncUserHandler);

module.exports = router;