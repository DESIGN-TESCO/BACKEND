// Creates (or reactivates + resets) temporary test accounts so you can sign in,
// then delete them from Team Accounts afterwards. Runs against the same database
// your backend uses (reads MONGO_URI from .env). Run with:  npm run seed:dummy
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

// Edit this list to seed whatever test logins you need.
const ACCOUNTS = [
  { name: 'Karthick M', email: 'karthick@tescostructures.in', password: 'Karthick@123', role: 'design_head' },
  { name: 'Dummy Head', email: 'dummyhead@tesco.local',       password: 'Dummy@12345',  role: 'design_head' },
];

(async () => {
  try {
    await connectDB();
    for (const a of ACCOUNTS) {
      const email = a.email.toLowerCase();
      let u = await User.findOne({ email });
      if (u) {
        u.isActive = true; u.role = a.role; u.name = a.name;
        await u.setPassword(a.password);
        await u.save();
        console.log(`[seed:dummy] reactivated & reset: ${email}`);
      } else {
        u = new User({ name: a.name, email, role: a.role, isActive: true });
        await u.setPassword(a.password);
        await u.save();
        console.log(`[seed:dummy] created: ${email}`);
      }
      console.log(`   -> Email: ${a.email}  |  Password: ${a.password}  |  Role: ${a.role === 'design_head' ? 'Design Head' : 'Design Team'}`);
    }
    console.log('Delete these test accounts from Team Accounts when you are done.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[seed:dummy] failed:', err.message);
    process.exit(1);
  }
})();
