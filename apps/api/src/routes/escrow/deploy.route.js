const express = require('express');
const { deployEscrowHandler } = require('./deploy.handler');

const router = express.Router();

/**
 * POST /api/escrow/deploy
 * Scaffolds the route for escrow deployment
 */
router.post('/deploy', deployEscrowHandler);

module.exports = router;
