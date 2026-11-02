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
import conversationsRouter from './routes/messages/conversations.route.js';
import messagesRouter from './routes/messages/send.route.js';
import syncWalletRouter from './routes/auth/sync-wallet.route.js';
import adminUsersRouter from './routes/admin/users.route.js';
import reconciliationRouter from './routes/reconciliation/sync-escrows.route.js';
import { requestIdMiddleware, errorHandler } from './http/error-middleware.js';
import listingsRouter from './routes/listings/listings.route.js';
import hotelsRouter from './routes/hotels/hotels.route.js';
import walletAuthRouter from './routes/auth/wallet-auth.route.js';

/**
 * Builds the apps/api Express app without binding a port.
 *
 * index.ts owns the process lifecycle (env, Firebase init, listen); the MCP
 * contract tests mount this same composition in-process so a response-shape
 * change in a route fails CI instead of only breaking the editor tools.
 */
export function createApp(): express.Express {
  const app = express();

  app.use(cors(apiCorsOptions()));
  app.use('/api/hotels', express.json({ limit: '6mb' }));
  app.use(express.json());
  app.use(tenantMiddleware);
  app.use(requestIdMiddleware); // attach X-Request-Id before all routes

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', firebase: 'configured' });
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

  // Messages routes
  app.use('/api/messages', conversationsRouter);
  app.use('/api/messages', messagesRouter);

  // Hotel routes
  app.use('/api/hotels', hotelsRouter);
  app.use('/api/listings', listingsRouter);

  // Global Problem Details error boundary
  app.use(errorHandler);

  return app;
}
