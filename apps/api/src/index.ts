import './config/env.js';
import { createApp } from './app.js';
import express from 'express';
import cors from 'cors';
import { apiCorsOptions } from './http/cors-options.js';
import { tenantMiddleware } from './middleware/tenant.middleware.js';
import authRouter from './routes/auth/sync-user.route.js';
import promoteToHostRouter from './routes/auth/promote-to-host.route.js';
import activateWalletRouter from './routes/auth/activate-wallet.route.js';
import hotelReservationEscrowRouter from './routes/escrow/hotel-reservation.route.js';
import deployEscrowRouter from './routes/escrow/deploy.route.js';
import approveMilestoneRouter from './routes/escrow/approve-milestone.route.js';
import fundEscrowRouter from './routes/escrow/fund.route.js';
import milestoneStatusRouter from './routes/escrow/milestone-status.route.js';
import releaseFundsRouter from './routes/escrow/release-funds.route.js';
import resolveDisputeRouter from './routes/escrow/resolve-dispute.route.js';
import recoverFromTxhashRouter from './routes/escrow/recover-from-txhash.route.js';
import sendTransactionRouter from './routes/escrow/send-transaction.route.js';
import statusStreamRouter from './routes/escrow/status-stream.route.js';
import readinessRouter from './routes/escrow/readiness.route.js';
import conversationsRouter from './routes/messages/conversations.route.js';
import messagesRouter from './routes/messages/send.route.js';
import notificationDevicesRouter from './routes/notifications/devices.route.js';
import syncWalletRouter from './routes/auth/sync-wallet.route.js';
import adminUsersRouter from './routes/admin/users.route.js';
import reconciliationRouter from './routes/reconciliation/sync-escrows.route.js';
import { requestIdMiddleware, errorHandler } from './http/error-middleware.js';
import listingsRouter from './routes/listings/listings.route.js';
import hotelsRouter from './routes/hotels/hotels.route.js';
import hotelReservationsRouter from './routes/hotels/reservations.route.js';
import walletAuthRouter from './routes/auth/wallet-auth.route.js';

import { initFirebaseAdmin } from './lib/firebase-admin.js';
import { isTestnet } from './services/wallet-readiness.js';

initFirebaseAdmin();

const app = createApp();
const PORT = process.env.PORT || 3002;

app.use(cors(apiCorsOptions()));
app.use("/api/hotels", express.json({ limit: "6mb" }));
app.use(express.json());
app.use(tenantMiddleware);
app.use(requestIdMiddleware); // attach X-Request-Id before all routes

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    firebase: 'configured',
    stellarNetwork: isTestnet() ? 'TESTNET' : 'PUBLIC',
  });
});

app.use('/reconciliation', reconciliationRouter);

// Auth routes
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth', syncWalletRouter);
app.use('/api/auth', promoteToHostRouter);
app.use('/api/auth', activateWalletRouter);
app.use('/api/admin', adminUsersRouter);

// Escrow routes
app.use('/api/escrow', deployEscrowRouter);
app.use('/api/escrow', hotelReservationEscrowRouter);
app.use('/api/escrow', approveMilestoneRouter);
app.use('/api/escrow', fundEscrowRouter);
app.use('/api/escrow', milestoneStatusRouter);
app.use('/api/escrow', releaseFundsRouter);
app.use('/api/escrow', resolveDisputeRouter);
app.use('/api/escrow', recoverFromTxhashRouter);
app.use('/api/escrow', sendTransactionRouter);
app.use('/api/escrow', statusStreamRouter);
app.use('/api/escrow', readinessRouter);

// Messages routes
app.use('/api/messages', conversationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationDevicesRouter);

// Hotel routes
app.use('/api/hotels', hotelsRouter);
app.use('/api/hotel-reservations', hotelReservationsRouter);
app.use('/api/listings', listingsRouter);

// Global Problem Details error boundary
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[api] Port ${PORT} is already occupied. Stop the existing API before restarting. Run one dev stack: pnpm dev.`);
  } else {
    console.error('[api] Server could not start:', error.message);
  }
  process.exitCode = 1;
});
