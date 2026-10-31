// Creates (or reactivates) a TEMPORARY dummy Design Head account so you can sign in,
// then delete it from Team Accounts afterwards. Runs against the same database your
// backend uses (reads MONGO_URI from .env). Run once with:  npm run seed:dummy
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const DUMMY = {
  name: 'Dummy Head',
  email: 'dummyhead@tesco.local',
  password: 'Dummy@12345',
  role: 'design_head',
};

(async () => {
  try {
    await connectDB();
    let u = await User.findOne({ email: DUMMY.email.toLowerCase() });
    if (u) {
      u.isActive = true;                 // reactivate if it was disabled
      u.role = DUMMY.role;
      await u.setPassword(DUMMY.password);
      await u.save();
      console.log(`[seed:dummy] reactivated & reset existing account: ${DUMMY.email}`);
    } else {
      u = new User({ name: DUMMY.name, email: DUMMY.email.toLowerCase(), role: DUMMY.role, isActive: true });
      await u.setPassword(DUMMY.password);
      await u.save();
      console.log(`[seed:dummy] created account: ${DUMMY.email}`);
    }
    console.log('--------------------------------------------------');
    console.log('  Login at the Design portal with:');
    console.log(`  Email    : ${DUMMY.email}`);
    console.log(`  Password : ${DUMMY.password}`);
    console.log('  Role     : Design Head');
    console.log('  (Delete this account from Team Accounts when done.)');
    console.log('--------------------------------------------------');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[seed:dummy] failed:', err.message);
    process.exit(1);
  }
})();
