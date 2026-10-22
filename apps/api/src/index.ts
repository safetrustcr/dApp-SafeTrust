import './config/env.js';
import { createApp } from './app.js';

import { initFirebaseAdmin } from './lib/firebase-admin.js';

initFirebaseAdmin();

const app = createApp();
const PORT = process.env.PORT || 3002;

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
