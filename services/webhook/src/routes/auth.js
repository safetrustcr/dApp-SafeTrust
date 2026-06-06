const express = require('express');
const router = express.Router();
const { syncUserHandler } = require('../controllers/auth.controller');

router.post('/sync-user', syncUserHandler);

module.exports = router;
