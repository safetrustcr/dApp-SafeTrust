const app = require('./app');

const port = Number(process.env.PORT || 3000);

/**
 * HTTP server entrypoint for the webhook service.
 */
const server = app.listen(port, () => {
  console.log(`[webhook] Server running on http://localhost:${port}`);
});

server.on('error', (err) => {
  console.error('[webhook] failed to start', err);
  process.exit(1);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[webhook] ${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
