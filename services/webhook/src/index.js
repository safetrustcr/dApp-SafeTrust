const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[webhook] Server running on http://localhost:${port}`);
});