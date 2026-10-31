require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5006;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`[server] Design CRM API listening on :${PORT}`));
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
})();

// Fail loudly on unhandled async errors.
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err); process.exit(1); });
