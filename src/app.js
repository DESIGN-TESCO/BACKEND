const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();

// CORS — allowed origins from CORS_ORIGINS (comma-separated), or * in dev.
const origins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: origins.includes('*') ? true : origins,
  credentials: true,
}));

// Body parsing — generous limit so base64 file uploads (≤12 MB file ≈ 16 MB
// encoded) fit comfortably.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Health check.
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'design-crm', time: new Date().toISOString() }));

// All API routes under /api.
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
