const Boq = require('../models/Boq');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { nextYearlyId } = require('../utils/ids');

const genId = (Model) => nextYearlyId(Model, 'id', 'BOQ');
const base = crud(Boq);

const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
const derive = (body) => {
  const materials = Array.isArray(body.materials) ? body.materials : [];
  body.materialCount = materials.length;
  const total = materials.reduce((s, m) => s + num(m.total), 0);
  body.estimatedCost = '₹' + total.toLocaleString('en-IN');
  return body;
};

const create = asyncHandler(async (req, res) => {
  const body = derive({ ...(req.body || {}) });
  delete body._id;
  for (let i = 0; i < 50; i++) {
    body.id = await genId(Boq);
    try { const doc = await Boq.create(body); return res.status(201).json(doc.toObject()); }
    catch (e) { if (e && e.code === 11000) continue; throw e; }
  }
  throw new ApiError(500, 'Could not allocate a BOQ id.');
});

const update = asyncHandler(async (req, res) => {
  const body = { ...(req.body || {}) };
  delete body._id; delete body.id;
  if (Array.isArray(body.materials)) derive(body);
  const doc = await Boq.findOneAndUpdate({ id: req.params.id }, { $set: body }, { new: true, runValidators: true });
  if (!doc) throw new ApiError(404, 'BOQ not found.');
  res.json(doc.toObject());
});

module.exports = { ...base, create, update };
