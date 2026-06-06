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

app.use(express.json());

const router = require('./routes');
app.use(router);

module.exports = app;