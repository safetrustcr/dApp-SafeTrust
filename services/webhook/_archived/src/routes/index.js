const express = require('express');
const router = express.Router();
const { authenticateFirebase } = require('../middleware/auth');
const authRoutes = require('./auth');

// Escrow lifecycle webhooks — TrustlessWork is the caller, not a Firebase user.
const initializeEscrowRoute = require('./escrows/initialize.route');
const fundEscrowRoute = require('./escrows/fund.route');
const approveMilestoneRoute = require('./escrows/approve-milestone.route');
const releaseFundsRoute = require('./escrows/release-funds.route');
const disputeRoute = require('./escrows/dispute.route');
const resolveDisputeRoute = require('./escrows/resolve-dispute.route');

// 1. Health check — public
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 2. Public Webhooks — MUST be registered before the Firebase auth middleware
router.use(initializeEscrowRoute);
router.use(fundEscrowRoute);
router.use(approveMilestoneRoute);
router.use(releaseFundsRoute);
router.use(disputeRoute);
router.use(resolveDisputeRoute);

// 3. Protected routes — authenticateFirebase runs before every route below
router.use('/api/auth', authenticateFirebase, authRoutes);

module.exports = router;
