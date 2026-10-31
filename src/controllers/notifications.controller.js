const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/notifications?audience=head|team
const list = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.audience) q.audience = req.query.audience;
  if (req.query.designerName) q.designerName = req.query.designerName;
  res.json(await Notification.find(q).sort({ createdAt: -1 }).limit(200).lean());
});

// POST /api/notifications  { audience, title, message|desc, category|type, designerName }
const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.audience || !['head', 'team', 'procurement'].includes(b.audience)) throw new ApiError(400, 'audience must be "head", "team" or "procurement".');
  const doc = await Notification.create({ ...b, time: b.time || 'just now', read: false });
  res.status(201).json(doc.toObject());
});

// PUT /api/notifications/:id/read  { read }
const setRead = asyncHandler(async (req, res) => {
  const read = req.body && req.body.read === false ? false : true;
  const doc = await Notification.findByIdAndUpdate(req.params.id, { $set: { read } }, { new: true });
  if (!doc) throw new ApiError(404, 'Notification not found.');
  res.json(doc.toObject());
});

// PUT /api/notifications/read-all?audience=head|team
const markAllRead = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.audience) q.audience = req.query.audience;
  await Notification.updateMany(q, { $set: { read: true } });
  res.json({ success: true });
});

// DELETE /api/notifications/:id
const remove = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = { list, create, setRead, markAllRead, remove };
