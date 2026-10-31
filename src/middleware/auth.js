const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Verifies "Authorization: Bearer <token>". Tokens are signed with the SHARED
// JWT_SECRET, so a token issued by this backend OR by any other Tesco CRM that
// uses the same secret will validate here (single sign-on across the CRMs).
// We trust the signed `role` claim; for this CRM's own users we additionally
// re-read the account from the DB to confirm it still exists and is active.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, 'Session expired or invalid. Please log in again.');
    }

    req.auth = { id: decoded.id, role: decoded.role, email: decoded.email, name: decoded.name };

    // For this CRM's own accounts, re-read from the DB so a deactivated or
    // deleted user is rejected and the role can't be tampered with.
    if (decoded.role === 'design_head' || decoded.role === 'design_team') {
      const user = await User.findById(decoded.id);
      if (!user || user.isActive === false) {
        throw new ApiError(401, 'Account no longer exists or is deactivated.');
      }
      req.user = user;
      req.auth.role = user.role;
      req.auth.name = user.name;
      req.auth.email = user.email;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Role guard — e.g. restrictTo('design_head'). With no args, any authenticated
// user passes.
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.auth) return next(new ApiError(401, 'Not authenticated.'));
  if (roles.length && !roles.includes(req.auth.role)) {
    return next(new ApiError(403, 'You do not have permission for this action.'));
  }
  next();
};

module.exports = { protect, restrictTo };
