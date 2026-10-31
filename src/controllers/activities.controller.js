const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/activities?limit=20
const list = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(await Activity.find().sort({ createdAt: -1 }).limit(limit).lean());
});

// POST /api/activities  { user, action, target, time }
const create = asyncHandler(async (req, res) => {
  const { user, action, target, time } = req.body || {};
  const doc = await Activity.create({ user: user || (req.auth && req.auth.name) || '', action: action || '', target: target || '', time: time || 'just now' });
  res.status(201).json(doc.toObject());
});

module.exports = { list, create };
