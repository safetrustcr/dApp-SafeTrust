import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth/sync-user.route.js';
import deployEscrowRouter from './routes/escrow/deploy.route.js';
import fundEscrowRouter from './routes/escrow/fund.route.js';
import milestoneStatusRouter from './routes/escrow/milestone-status.route.js';
import releaseFundsRouter from './routes/escrow/release-funds.route.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRouter);

// Escrow routes
app.use('/api/escrow', deployEscrowRouter);
app.use('/api/escrow', fundEscrowRouter);
app.use('/api/escrow', milestoneStatusRouter);
app.use('/api/escrow', releaseFundsRouter);

app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
});