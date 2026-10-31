const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Login accounts for the Design CRM. Tokens are signed with the shared Tesco
// JWT_SECRET so they interoperate with the other CRMs. Roles mirror the two
// personas in the UI: 'design_head' and 'design_team'.
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['design_head', 'design_team'], required: true },
    isActive: { type: Boolean, default: true },

    // Team-account fields (managed by the Design Head).
    employeeId: { type: String, default: '' },
    username: { type: String, default: '' },

    // For a Design Team user, the designer roster record they act as (optional).
    designerId: { type: String, default: '' },

    // Settings / preferences (Settings page).
    settings: {
      systemRole: { type: String, default: '' },     // e.g. "Lead Coordinator"
      emailAlerts: { type: Boolean, default: true },
      desktopNotifications: { type: Boolean, default: true },
      themeMode: { type: String, default: 'StudioPro Navy' },
    },
  },
  { timestamps: true, collection: 'design_users' }
);

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(String(plain), 10);
};
UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(String(plain), this.passwordHash || '');
};

// Never leak the hash.
UserSchema.methods.toSafeJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  return o;
};

module.exports = mongoose.model('DesignUser', UserSchema);
