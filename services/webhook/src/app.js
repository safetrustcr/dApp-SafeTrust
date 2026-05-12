require('dotenv').config();
const express = require('express');
const { initializeFirebaseAdmin } = require('./config/firebase-admin');

initializeFirebaseAdmin();

const app = express();
app.use(express.json());

const router = require('./routes');
app.use(router);

module.exports = app;