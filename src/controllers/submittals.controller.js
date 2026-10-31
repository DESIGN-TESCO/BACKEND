const Submittal = require('../models/Submittal');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { nextSeqId } = require('../utils/ids');

const genId = (Model) => nextSeqId(Model, 'id', 'SUB-', 3);
const base = crud(Submittal, { genId });

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// On create (a Design Team deliverable upload): set the linked request to Pending
// Review and append an attachment + history entry.
const create = asyncHandler(async (req, res) => {
  const body = { ...(req.body || {}) };
  delete body._id;
  body.submittedDate = body.submittedDate || now();
  body.status = body.status || 'Pending Head Review';
  let doc;
  for (let i = 0; i < 50; i++) {
    body.id = await genId(Submittal);
    try { doc = await Submittal.create(body); break; }
    catch (e) { if (e && e.code === 11000) continue; throw e; }
  }
  if (!doc) throw new ApiError(500, 'Could not allocate a submittal id.');

  if (body.reqId) {
    const reqDoc = await Request.findOne({ id: body.reqId });
    if (reqDoc) {
      if (!body.silent) reqDoc.status = 'Pending Review';
      reqDoc.attachments = reqDoc.attachments || [];
      reqDoc.attachments.unshift({ name: body.fileName || 'deliverable', size: body.fileSize || '', type: body.fileType || '', fileId: body.fileId || '' });
      reqDoc.history = reqDoc.history || [];
      reqDoc.history.push({ title: 'Deliverable submitted', time: now(), desc: `${body.submittedBy || ''} submitted ${body.fileName || ''}` });
      await reqDoc.save();
    }
  }
  if (!body.silent) await Notification.create({ audience: 'head', category: 'Reviews', title: 'New submittal for review', message: `${body.projectName || body.reqId} \u2014 ${body.fileName || ''}`, time: 'just now', requestId: body.reqId || '' });
  res.status(201).json(doc.toObject());
});

// PUT /api/submittals/:id/status  { status }  — Head approves or requests revision.
const setStatus = asyncHandler(async (req, res) => {
  const doc = await Submittal.findOne({ id: req.params.id });
  if (!doc) throw new ApiError(404, 'Submittal not found.');
  const { status } = req.body || {};
  if (!status) throw new ApiError(400, 'status is required.');
  doc.status = status;
  await doc.save();

  if (doc.reqId) {
    const reqDoc = await Request.findOne({ id: doc.reqId });
    if (reqDoc) {
      if (status === 'Approved by Head') reqDoc.status = 'Approved';
      else if (status === 'Revision Requested') reqDoc.status = 'Revision Requested';
      reqDoc.history = reqDoc.history || [];
      reqDoc.history.push({ title: `Head: ${status}`, time: now(), desc: doc.fileName || '' });
      await reqDoc.save();
    }
  }
  await Notification.create({ audience: 'team', type: status === 'Approved by Head' ? 'approval' : 'revision', title: status, desc: `${doc.projectName || doc.reqId} — ${doc.fileName || ''}`, time: 'just now', designerName: doc.submittedBy });
  res.json(doc.toObject());
});

module.exports = { ...base, create, setStatus };
