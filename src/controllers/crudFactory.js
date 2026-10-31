const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Builds standard list/get/create/update/remove handlers for a model keyed by a
// human `id` field. `genId(Model)` returns the next id for a new record.
// `projection` lets list/get exclude heavy fields (e.g. file bytes).
function crud(Model, { genId, projection = null, listSort = { createdAt: -1 } } = {}) {
  const list = asyncHandler(async (req, res) => {
    // Allow simple equality filters from the query string (?status=New&projectType=PEB).
    const q = {};
    for (const [k, v] of Object.entries(req.query || {})) {
      if (['sort', 'limit', 'page'].includes(k)) continue;
      if (v !== undefined && v !== '') q[k] = v;
    }
    let query = Model.find(q).sort(listSort);
    if (projection) query = query.select(projection);
    res.json(await query.lean());
  });

  const getOne = asyncHandler(async (req, res) => {
    let query = Model.findOne({ id: req.params.id });
    if (projection) query = query.select(projection);
    const doc = await query.lean();
    if (!doc) throw new ApiError(404, 'Record not found.');
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    const body = { ...(req.body || {}) };
    delete body._id;
    if (genId) {
      for (let i = 0; i < 50; i++) {
        body.id = await genId(Model);
        try { const doc = await Model.create(body); return res.status(201).json(doc.toObject()); }
        catch (e) { if (e && e.code === 11000) continue; throw e; }
      }
      throw new ApiError(500, 'Could not allocate an id.');
    }
    const doc = await Model.create(body);
    res.status(201).json(doc.toObject());
  });

  const update = asyncHandler(async (req, res) => {
    const body = { ...(req.body || {}) };
    delete body._id; delete body.id;
    const doc = await Model.findOneAndUpdate({ id: req.params.id }, { $set: body }, { new: true, runValidators: true });
    if (!doc) throw new ApiError(404, 'Record not found.');
    res.json(doc.toObject());
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findOneAndDelete({ id: req.params.id });
    if (!doc) throw new ApiError(404, 'Record not found.');
    res.json({ success: true });
  });

  return { list, getOne, create, update, remove };
}

module.exports = crud;
