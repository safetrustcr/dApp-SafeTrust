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

// CORS configuration - restrict to trusted frontend origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
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