const mongoose = require('mongoose');

// Connect to MongoDB. The URI comes from MONGODB_URI (see .env.example).
async function connectDB() {
  // MONGO_URI matches the other Tesco CRMs (Procurement, Sales Head, …); MONGODB_URI
  // is accepted as a fallback. Point it at the SAME cluster + database as Procurement
  // to share the database — the Design CRM uses its own design_* collections.
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and set it to the same value Procurement uses.');
  }
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
  });
  const { host, name } = mongoose.connection;
  console.log(`[db] connected to ${host}/${name}`);
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  return mongoose.connection;
}

module.exports = connectDB;
