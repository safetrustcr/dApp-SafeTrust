require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeFirebaseAdmin } = require('./config/firebase-admin');

initializeFirebaseAdmin();

const app = express();

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3001',  // Next.js frontend dev
    'http://localhost:3000',  // same origin fallback
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Capture the raw request body so webhook signatures (HMAC) can be verified.
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

const router = require('./routes');
app.use(router);

module.exports = app;