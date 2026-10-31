const Request = require('../models/Request');
const Designer = require('../models/Designer');
const Submittal = require('../models/Submittal');
const Revision = require('../models/Revision');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const crud = require('./crudFactory');
const { nextYearlyId, nextSeqId } = require('../utils/ids');
const { adjustDesignerWorkload } = require('../utils/workload');

const genId = (Model) => nextYearlyId(Model, 'id', 'REQ');
const base = crud(Request, { genId });

const now = () => {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', ' ');
};
const pushHistory = (reqDoc, title, desc) => {
  reqDoc.history = reqDoc.history || [];
  reqDoc.history.push({ title, time: now(), desc: desc || '' });
};
const logActivity = (user, action, target) => Activity.create({ user, action, target, time: 'just now' });

// POST /api/requests/:id/assign  { assigneeId | assigneeName, dueDate, estHours, priority, notes, notify }
const assign = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { assigneeId, assigneeName, dueDate, estHours, priority, notes, notify } = req.body || {};
  let designer = null;
  if (assigneeId) designer = await Designer.findOne({ id: assigneeId });
  if (!designer && assigneeName) designer = await Designer.findOne({ name: assigneeName });
  if (!designer) throw new ApiError(400, 'Pick a valid designer to assign.');

  const prev = reqDoc.assignedDesigner;
  if (prev && prev !== 'Unassigned' && prev !== designer.name) {
    await adjustDesignerWorkload(prev, { tasks: -1, workload: -15 });
  }
  reqDoc.assignedDesigner = designer.name;
  if (dueDate) reqDoc.dueDate = dueDate;
  if (priority) reqDoc.priority = priority;
  if (estHours != null) reqDoc.estHours = String(estHours);
  reqDoc.status = 'Assigned';
  pushHistory(reqDoc, 'Design Head assigned designer', `${designer.name} assigned${dueDate ? ` · due ${dueDate}` : ''}${notes ? ` · ${notes}` : ''}`);
  await reqDoc.save();

  if (prev !== designer.name) await adjustDesignerWorkload(designer.name, { tasks: 1, workload: 15 });
  await logActivity(req.auth?.name || 'Design Head', 'assigned', `${reqDoc.id} → ${designer.name}`);
  if (notify !== false) {
    await Notification.create({ audience: 'team', type: 'assignment', title: 'New task assigned', desc: `${reqDoc.projectName || reqDoc.id} assigned to you`, time: 'just now', designerName: designer.name });
  }
  res.json(reqDoc.toObject());
});

// PUT /api/requests/:id/designer  { designerName }  — quick (re)assign / unassign inline.
const directAssign = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const name = (req.body && req.body.designerName) || 'Unassigned';
  const prev = reqDoc.assignedDesigner;
  if (prev && prev !== 'Unassigned' && prev !== name) await adjustDesignerWorkload(prev, { tasks: -1, workload: -15 });
  reqDoc.assignedDesigner = name;
  if (name === 'Unassigned') { if (reqDoc.status === 'Assigned') reqDoc.status = 'New'; }
  else { if (reqDoc.status === 'New') reqDoc.status = 'Assigned'; await adjustDesignerWorkload(name, { tasks: 1, workload: 15 }); }
  pushHistory(reqDoc, 'Assignment updated', name === 'Unassigned' ? 'Designer unassigned' : `Assigned to ${name}`);
  await reqDoc.save();
  res.json(reqDoc.toObject());
});

// PUT /api/requests/:id/status  { status, note }
const setStatus = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { status, note } = req.body || {};
  if (!status) throw new ApiError(400, 'status is required.');
  reqDoc.status = status;
  pushHistory(reqDoc, `Status → ${status}`, note || '');
  await reqDoc.save();
  await logActivity(req.auth?.name || 'Design Head', 'updated status', `${reqDoc.id} → ${status}`);
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/comments  { sender, role, text }
const addComment = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { sender, role, text } = req.body || {};
  if (!text || !String(text).trim()) throw new ApiError(400, 'Comment text is required.');
  reqDoc.comments = reqDoc.comments || [];
  reqDoc.comments.push({ sender: sender || req.auth?.name || 'User', role: role || 'User', text: String(text).trim(), time: now() });
  await reqDoc.save();
  res.json(reqDoc.toObject());
});

// PUT /api/requests/:id/requirement  { pebDetails?, residentialDetails?, deliverables? }
const saveRequirement = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { pebDetails, residentialDetails, deliverables } = req.body || {};
  if (pebDetails && typeof pebDetails === 'object') reqDoc.pebDetails = { ...(reqDoc.pebDetails || {}), ...pebDetails };
  if (residentialDetails && typeof residentialDetails === 'object') reqDoc.residentialDetails = { ...(reqDoc.residentialDetails || {}), ...residentialDetails };
  if (Array.isArray(deliverables)) reqDoc.deliverables = deliverables;
  reqDoc.markModified('pebDetails'); reqDoc.markModified('residentialDetails');
  pushHistory(reqDoc, 'Requirement details updated', '');
  await reqDoc.save();
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/attachments  { name, size, type, fileId }  — link an uploaded file.
const addAttachment = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { name, size, type, fileId } = req.body || {};
  if (!name) throw new ApiError(400, 'Attachment name is required.');
  reqDoc.attachments = reqDoc.attachments || [];
  reqDoc.attachments.push({ name, size: size || '', type: type || '', fileId: fileId || '' });
  await reqDoc.save();
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/approve — Design Head approves the submitted design.
const approve = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const subs = await Submittal.find({ reqId: reqDoc.id }).lean();
  const approvedFiles = subs.filter((s) => s.fileId).map((s) => ({ name: s.fileName, size: s.fileSize, type: s.fileType, fileId: s.fileId }));
  await Submittal.updateMany({ reqId: reqDoc.id, status: { $ne: 'Approved by Head' } }, { $set: { status: 'Approved by Head' } });
  reqDoc.status = 'Approved';
  reqDoc.approvedDate = new Date().toISOString().slice(0, 10);
  reqDoc.approvedBy = (req.auth && req.auth.name) || 'Design Head';
  reqDoc.approvedFiles = approvedFiles.length ? approvedFiles : (reqDoc.attachments || []);
  pushHistory(reqDoc, 'Design approved', `Approved by ${reqDoc.approvedBy}`);
  await reqDoc.save();
  await logActivity(reqDoc.approvedBy, 'approved design', reqDoc.id);
  await Notification.create({ audience: 'team', type: 'approval', title: 'Design approved', desc: `${reqDoc.projectName || reqDoc.id} approved`, time: 'just now', designerName: reqDoc.assignedDesigner });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'approval', title: 'Design approved', desc: `${reqDoc.projectName || reqDoc.id} (${reqDoc.procurementProjectCode || ''}) approved — files ready to download`, time: 'just now' });
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/reject  { reason }
const reject = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const reason = (req.body && req.body.reason) || '';
  reqDoc.status = 'Rejected';
  reqDoc.rejectionReason = reason;
  pushHistory(reqDoc, 'Design rejected', reason);
  await reqDoc.save();
  await Notification.create({ audience: 'team', type: 'revision', title: 'Design rejected', desc: `${reqDoc.projectName || reqDoc.id}: ${reason}`, time: 'just now', designerName: reqDoc.assignedDesigner });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'revision', title: 'Design rejected', desc: `${reqDoc.projectName || reqDoc.id}: ${reason}`, time: 'just now' });
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/request-changes  { remarks } — send back for rework.
const requestChanges = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const remarks = (req.body && req.body.remarks) || '';
  reqDoc.status = 'Rework Required';
  reqDoc.changeRemarks = remarks;
  pushHistory(reqDoc, 'Changes requested', remarks);
  await reqDoc.save();
  await Submittal.updateMany({ reqId: reqDoc.id, status: 'Pending Head Review' }, { $set: { status: 'Revision Requested' } });
  const count = await Revision.countDocuments({ requestId: reqDoc.id });
  const revId = await nextSeqId(Revision, 'id', 'REV-', 3);
  await Revision.create({ id: revId, requestId: reqDoc.id, project: reqDoc.projectName, revNumber: 'R' + (count + 1), designer: reqDoc.assignedDesigner, requestedBy: (req.auth && req.auth.name) || 'Design Head', status: 'Pending', comments: remarks, date: new Date().toISOString().slice(0, 10) });
  await Notification.create({ audience: 'team', type: 'revision', title: 'Changes requested', desc: `${reqDoc.projectName || reqDoc.id}: ${remarks}`, time: 'just now', designerName: reqDoc.assignedDesigner });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'revision', title: 'Changes requested', desc: `${reqDoc.projectName || reqDoc.id}: ${remarks}`, time: 'just now' });
  res.json(reqDoc.toObject());
});

module.exports = { ...base, assign, directAssign, setStatus, addComment, saveRequirement, addAttachment, approve, reject, requestChanges };
