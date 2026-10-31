const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/login  { email, password }  — email may also be a username.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');
  const id = String(email).trim();
  const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }] }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid credentials.');
  if (user.isActive === false) throw new ApiError(403, 'This account is deactivated. Contact your Design Head.');
  const ok = await user.checkPassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials.');
  res.json({ success: true, token: signToken(user), user: user.toSafeJSON() });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, user: user.toSafeJSON() });
});

// PUT /api/auth/me  { name, settings }
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.id);
  if (!user) throw new ApiError(404, 'User not found.');
  const { name, settings } = req.body || {};
  if (name != null) user.name = name;
  if (settings && typeof settings === 'object') user.settings = { ...user.settings, ...settings };
  await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
});

// PUT /api/auth/password  { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) throw new ApiError(400, 'New password must be at least 6 characters.');
  const user = await User.findById(req.auth.id).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found.');
  if (!(await user.checkPassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect.');
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true });
});

// POST /api/auth/users  (Design Head only) — create a Design Team login account.
const createUser = asyncHandler(async (req, res) => {
  const { name, email, username, password, role, employeeId, designerId, isActive } = req.body || {};
  if (!name || !password) throw new ApiError(400, 'Name and password are required.');
  if (!email && !username) throw new ApiError(400, 'An email or username is required.');
  const useRole = role === 'design_head' ? 'design_head' : 'design_team';
  const emailNorm = email ? String(email).toLowerCase().trim() : '';
  if (emailNorm && await User.findOne({ email: emailNorm })) throw new ApiError(409, 'A user with that email already exists.');
  if (username && await User.findOne({ username })) throw new ApiError(409, 'A user with that username already exists.');
  const user = new User({
    name, email: emailNorm, username: username || '', role: useRole,
    employeeId: employeeId || '', designerId: designerId || '',
    isActive: isActive === false ? false : true,
  });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ success: true, user: user.toSafeJSON() });
});

// GET /api/auth/users  (Design Head only)
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ success: true, users: users.map((u) => u.toSafeJSON()) });
});

// PUT /api/auth/users/:id  (Design Head only) — edit a team member's details.
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  const { name, email, username, employeeId, designerId, role, isActive } = req.body || {};
  if (name != null) user.name = name;
  if (email != null) user.email = String(email).toLowerCase().trim();
  if (username != null) user.username = username;
  if (employeeId != null) user.employeeId = employeeId;
  if (designerId != null) user.designerId = designerId;
  if (role && ['design_head', 'design_team'].includes(role)) user.role = role;
  if (isActive != null) user.isActive = !!isActive;
  await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
});

// PUT /api/auth/users/:id/password  (Design Head only) — reset a member's password.
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) throw new ApiError(400, 'New password must be at least 6 characters.');
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true });
});

// PUT /api/auth/users/:id/active  (Design Head only)  { isActive }
const setUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  user.isActive = !!(req.body && req.body.isActive);
  await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
});

module.exports = { login, me, updateMe, changePassword, createUser, listUsers, updateUser, resetUserPassword, setUserActive };
