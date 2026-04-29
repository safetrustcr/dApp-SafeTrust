require('dotenv').config();
const express = require('express');
const cors = require('cors');
const escrowRoutes = require('./routes/escrow/deploy.route');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register Escrow routes
app.use('/api/escrow', escrowRoutes);

app.listen(port, () => {
  console.log(`[api] Server running on http://localhost:${port}`);
});

module.exports = app;
