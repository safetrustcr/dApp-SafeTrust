import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth/sync-user.route.js';

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

// TODO: wire escrow routes after trustlesswork.js ESM migration
// app.use('/api/escrow', escrowRouter);

app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
});