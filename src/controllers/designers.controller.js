const Designer = require('../models/Designer');
const Request = require('../models/Request');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { nextSeqId } = require('../utils/ids');

const genId = (Model) => nextSeqId(Model, 'id', 'D', 2);
const base = crud(Designer, { genId });

// On create, derive avatar initials if not supplied.
const create = asyncHandler(async (req, res) => {
  const body = { ...(req.body || {}) };
  if (!body.avatar && body.name) {
    body.avatar = String(body.name).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }
  for (let i = 0; i < 50; i++) {
    body.id = await genId(Designer);
    try { const doc = await Designer.create(body); return res.status(201).json(doc.toObject()); }
    catch (e) { if (e && e.code === 11000) continue; throw e; }
  }
  throw new ApiError(500, 'Could not allocate a designer id.');
});

// GET /api/designers/:id/requests — this designer's assigned requests (for the profile page).
const requestsForDesigner = asyncHandler(async (req, res) => {
  const d = await Designer.findOne({ id: req.params.id });
  if (!d) throw new ApiError(404, 'Designer not found.');
  const rows = await Request.find({ assignedDesigner: d.name }).sort({ dueDate: 1 }).lean();
  res.json(rows);
});

module.exports = { ...base, create, requestsForDesigner };
