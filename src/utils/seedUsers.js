// One-time seed for the first login accounts so you can sign in to an otherwise
// empty database. Reads SEED_* from .env. Run with: npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();
    const seeds = [
      { name: process.env.SEED_HEAD_NAME || 'Design Head', email: process.env.SEED_HEAD_EMAIL, password: process.env.SEED_HEAD_PASSWORD, role: 'design_head' },
      { name: process.env.SEED_TEAM_NAME || 'Design Team', email: process.env.SEED_TEAM_EMAIL, password: process.env.SEED_TEAM_PASSWORD, role: 'design_team' },
    ];
    for (const s of seeds) {
      if (!s.email || !s.password) { console.log(`[seed] skipping ${s.role}: email/password not set in .env`); continue; }
      const existing = await User.findOne({ email: s.email.toLowerCase() });
      if (existing) { console.log(`[seed] ${s.email} already exists — skipped`); continue; }
      const u = new User({ name: s.name, email: s.email, role: s.role });
      await u.setPassword(s.password);
      await u.save();
      console.log(`[seed] created ${s.role}: ${s.email}`);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  }
})();
