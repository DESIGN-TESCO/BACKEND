const Request = require('../models/Request');
const Designer = require('../models/Designer');
const Submittal = require('../models/Submittal');
const Revision = require('../models/Revision');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const ProcurementProject = require('../models/ProcurementProject');
const User = require('../models/User');
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
const pushFeedback = (reqDoc, by, role, action, text) => {
  reqDoc.feedback = reqDoc.feedback || [];
  reqDoc.feedback.push({ by: by || '', role: role || '', action: action || '', text: text || '', time: now() });
  reqDoc.markModified('feedback');
};

// POST /api/requests/:id/assign  { assigneeId | assigneeName, dueDate, estHours, priority, notes, notify }
const assign = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { assigneeUserId, assigneeEmployeeId, assigneeId, assigneeName, dueDate, estHours, priority, notes, notify } = req.body || {};
  // Prefer a real team-member login account (design_users) so the assignment reaches
  // the person who actually logs in. Fall back to the designer roster for compatibility.
  let user = null;
  if (assigneeUserId) user = await User.findById(assigneeUserId).catch(() => null);
  if (!user && assigneeEmployeeId) user = await User.findOne({ employeeId: assigneeEmployeeId });
  if (!user && assigneeName) user = await User.findOne({ name: assigneeName, role: 'design_team' });
  let designer = null;
  if (!user) {
    if (assigneeId) designer = await Designer.findOne({ id: assigneeId });
    if (!designer && assigneeName) designer = await Designer.findOne({ name: assigneeName });
  }
  if (!user && !designer) throw new ApiError(400, 'Pick a valid team member to assign.');
  const memberName = user ? user.name : designer.name;
  const memberUserId = user ? String(user._id) : '';
  const memberEmpId = user ? (user.employeeId || '') : '';

  const prev = reqDoc.assignedDesigner;
  if (prev && prev !== 'Unassigned' && prev !== memberName) {
    await adjustDesignerWorkload(prev, { tasks: -1, workload: -15 });
  }
  reqDoc.assignedDesigner = memberName;
  reqDoc.assignedUserId = memberUserId;
  reqDoc.assignedEmployeeId = memberEmpId;
  reqDoc.assignedDate = new Date().toISOString().slice(0, 10);
  if (dueDate) reqDoc.dueDate = dueDate;
  if (priority) reqDoc.priority = priority;
  if (estHours != null) reqDoc.estHours = String(estHours);
  reqDoc.status = 'Assigned';
  pushHistory(reqDoc, 'Design Head assigned designer', `${memberName} assigned${dueDate ? ` \u00b7 due ${dueDate}` : ''}${notes ? ` \u00b7 ${notes}` : ''}`);
  await reqDoc.save();

  if (prev !== memberName) await adjustDesignerWorkload(memberName, { tasks: 1, workload: 15 });
  await logActivity(req.auth?.name || 'Design Head', 'assigned', `${reqDoc.id} \u2192 ${memberName}`);
  if (notify !== false) {
    await Notification.create({ audience: 'team', type: 'assignment', title: 'New task assigned', desc: `${reqDoc.projectName || reqDoc.id}${reqDoc.procurementProjectCode ? ' (' + reqDoc.procurementProjectCode + ')' : ''} assigned to you${reqDoc.dueDate ? ' \u00b7 due ' + reqDoc.dueDate : ''}`, time: 'just now', designerName: memberName, requestId: reqDoc.id, projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '' });
  }
  res.json(reqDoc.toObject());
});

// PUT /api/requests/:id/designer  { designerName }  — quick (re)assign / unassign inline.
const directAssign = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const { designerName, assigneeUserId } = req.body || {};
  let user = null;
  if (assigneeUserId) user = await User.findById(assigneeUserId).catch(() => null);
  if (!user && designerName && designerName !== 'Unassigned') user = await User.findOne({ name: designerName, role: 'design_team' });
  const name = user ? user.name : (designerName || 'Unassigned');
  const prev = reqDoc.assignedDesigner;
  if (prev && prev !== 'Unassigned' && prev !== name) await adjustDesignerWorkload(prev, { tasks: -1, workload: -15 });
  reqDoc.assignedDesigner = name;
  reqDoc.assignedUserId = user ? String(user._id) : (name === 'Unassigned' ? '' : reqDoc.assignedUserId);
  reqDoc.assignedEmployeeId = user ? (user.employeeId || '') : (name === 'Unassigned' ? '' : reqDoc.assignedEmployeeId);
  if (name === 'Unassigned') { reqDoc.assignedUserId = ''; reqDoc.assignedEmployeeId = ''; if (reqDoc.status === 'Assigned') reqDoc.status = 'New'; }
  else { reqDoc.assignedDate = reqDoc.assignedDate || new Date().toISOString().slice(0, 10); if (reqDoc.status === 'New') reqDoc.status = 'Assigned'; await adjustDesignerWorkload(name, { tasks: 1, workload: 15 }); }
  pushHistory(reqDoc, 'Assignment updated', name === 'Unassigned' ? 'Designer unassigned' : `Assigned to ${name}`);
  await reqDoc.save();
  if (name && name !== 'Unassigned' && name !== prev) {
    await Notification.create({ audience: 'team', type: 'assignment', title: 'New task assigned', desc: `${reqDoc.projectName || reqDoc.id}${reqDoc.procurementProjectCode ? ' (' + reqDoc.procurementProjectCode + ')' : ''} assigned to you${reqDoc.dueDate ? ' \u00b7 due ' + reqDoc.dueDate : ''}`, time: 'just now', designerName: name, requestId: reqDoc.id, projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '' });
  }
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
  const approveNote = (req.body && (req.body.feedback || req.body.note)) || '';
  pushHistory(reqDoc, 'Design approved', `Approved by ${reqDoc.approvedBy}${approveNote ? ' \u00b7 ' + approveNote : ''}`);
  pushFeedback(reqDoc, reqDoc.approvedBy, 'Design Head', 'Approved', approveNote);
  await reqDoc.save();
  await logActivity(reqDoc.approvedBy, 'approved design', reqDoc.id);
  await Notification.create({ audience: 'team', type: 'approval', title: 'Design approved', desc: `${reqDoc.projectName || reqDoc.id}${reqDoc.procurementProjectCode ? ' (' + reqDoc.procurementProjectCode + ')' : ''} approved${approveNote ? ' \u2014 ' + approveNote : ''}`, time: 'just now', designerName: reqDoc.assignedDesigner, requestId: reqDoc.id, projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '' });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'approval', title: 'Design approved', desc: `${reqDoc.projectName || reqDoc.id} (${reqDoc.procurementProjectCode || ''}) approved — files ready to download`, time: 'just now' });
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/reject  { reason }
const reject = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const reason = (req.body && (req.body.reason || req.body.feedback)) || '';
  if (!String(reason).trim()) throw new ApiError(400, 'Feedback is required when rejecting a submission.');
  const reviewer = (req.auth && req.auth.name) || 'Design Head';
  reqDoc.status = 'Rejected';
  reqDoc.rejectionReason = reason;
  pushHistory(reqDoc, 'Design rejected', reason);
  pushFeedback(reqDoc, reviewer, 'Design Head', 'Rejected', reason);
  await reqDoc.save();
  await Notification.create({ audience: 'team', type: 'revision', title: 'Design rejected', desc: `${reqDoc.projectName || reqDoc.id}: ${reason}`, time: 'just now', designerName: reqDoc.assignedDesigner, requestId: reqDoc.id, projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '' });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'revision', title: 'Design rejected', desc: `${reqDoc.projectName || reqDoc.id}: ${reason}`, time: 'just now' });
  res.json(reqDoc.toObject());
});

// POST /api/requests/:id/request-changes  { remarks } — send back for rework.
const requestChanges = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const remarks = (req.body && (req.body.remarks || req.body.feedback)) || '';
  if (!String(remarks).trim()) throw new ApiError(400, 'Feedback is required when requesting changes.');
  const reviewer = (req.auth && req.auth.name) || 'Design Head';
  reqDoc.status = 'Changes Requested';
  reqDoc.changeRemarks = remarks;
  pushHistory(reqDoc, 'Changes requested', remarks);
  pushFeedback(reqDoc, reviewer, 'Design Head', 'Changes Requested', remarks);
  await reqDoc.save();
  await Submittal.updateMany({ reqId: reqDoc.id, status: 'Pending Head Review' }, { $set: { status: 'Revision Requested' } });
  const count = await Revision.countDocuments({ requestId: reqDoc.id });
  const revId = await nextSeqId(Revision, 'id', 'REV-', 3);
  await Revision.create({ id: revId, requestId: reqDoc.id, project: reqDoc.projectName, revNumber: 'R' + (count + 1), designer: reqDoc.assignedDesigner, requestedBy: (req.auth && req.auth.name) || 'Design Head', status: 'Pending', comments: remarks, date: new Date().toISOString().slice(0, 10) });
  await Notification.create({ audience: 'team', type: 'revision', title: 'Changes requested', desc: `${reqDoc.projectName || reqDoc.id}: ${remarks}`, time: 'just now', designerName: reqDoc.assignedDesigner, requestId: reqDoc.id, projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '' });
  if (reqDoc.source === 'procurement') await Notification.create({ audience: 'procurement', type: 'revision', title: 'Changes requested', desc: `${reqDoc.projectName || reqDoc.id}: ${remarks}`, time: 'just now' });
  res.json(reqDoc.toObject());
});


// GET /api/requests/:id/project — full, LIVE project details pulled from the
// Procurement portal (shared `purchase_projects` collection). Lets both the Design
// Head and the assigned Design Team member see the complete project info without it
// being re-entered, and keeps it in sync with Procurement.
const getProject = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id }).lean();
  if (!reqDoc) throw new ApiError(404, 'Request not found.');

  let proj = null;
  if (reqDoc.procurementProjectId) proj = await ProcurementProject.findOne({ id: reqDoc.procurementProjectId }).lean();
  if (!proj && reqDoc.procurementProjectCode) proj = await ProcurementProject.findOne({ code: reqDoc.procurementProjectCode }).lean();
  if (!proj && reqDoc.projectName) proj = await ProcurementProject.findOne({ name: reqDoc.projectName }).lean();

  // Build a clean, display-ready object. Prefer live procurement data, fall back to
  // the snapshot stored on the request at creation time.
  const out = {
    source: reqDoc.source || 'manual',
    found: !!proj,
    projectName: (proj && proj.name) || reqDoc.projectName || '',
    projectCode: (proj && proj.code) || reqDoc.procurementProjectCode || '',
    client: (proj && proj.client) || reqDoc.customerName || '',
    location: (proj && (proj.projectLocation || proj.siteAddress)) || reqDoc.location || '',
    projectType: (proj && proj.typeOfProject) || reqDoc.projectType || '',
    requirement: reqDoc.requirement || reqDoc.service || '',
    priority: reqDoc.priority || '',
    dueDate: reqDoc.dueDate || '',
    status: reqDoc.status || '',
    requestedBy: reqDoc.requestedBy || reqDoc.requestedByUser || '',
    description: reqDoc.description || '',
  };
  if (proj) {
    out.projectSize = proj.projectSize || '';
    out.materialDescription = proj.materialDescription || '';
    out.contactDetails = proj.contactDetails || proj.mobileNumber || '';
    out.siteAddress = proj.siteAddress || '';
    out.billingName = proj.billingName || '';
    out.gstNumber = proj.gstNumber || '';
    out.salespersonName = proj.salespersonName || '';
    out.tentativeCompletionDate = proj.tentativeCompletionDate || '';
    out.quotedPrice = proj.quotedPrice != null ? proj.quotedPrice : '';
    out.design2D = !!proj.design2D;
    out.design3D = !!proj.design3D;
    out.projectStatus = proj.status || '';
  }
  res.json(out);
});


// POST /api/requests/:id/submit  { remarks, submittedBy }  — team member submits
// (or resubmits) completed work for Head approval. Files are uploaded separately as
// submittals (version history); this flips status and notifies the Head once.
const submitForApproval = asyncHandler(async (req, res) => {
  const reqDoc = await Request.findOne({ id: req.params.id });
  if (!reqDoc) throw new ApiError(404, 'Request not found.');
  const submittedBy = (req.body && req.body.submittedBy) || (req.auth && req.auth.name) || reqDoc.assignedDesigner || '';

  // Only the assigned member (or the Head) may submit this request.
  if (req.auth && req.auth.role === 'design_team') {
    const mineById = reqDoc.assignedUserId && String(reqDoc.assignedUserId) === String(req.auth.id);
    const mineByName = reqDoc.assignedDesigner && reqDoc.assignedDesigner === req.auth.name;
    if (!mineById && !mineByName) throw new ApiError(403, 'You can only submit a project assigned to you.');
  }

  const remarks = (req.body && req.body.remarks) || '';
  const wasChanges = ['Changes Requested', 'Rework Required', 'Revision Requested', 'Rejected'].includes(reqDoc.status);
  reqDoc.status = wasChanges ? 'Resubmitted' : 'Submitted for Approval';
  reqDoc.submittedBy = submittedBy;
  reqDoc.submittedAt = now();
  reqDoc.submissionCount = (reqDoc.submissionCount || 0) + 1;
  pushHistory(reqDoc, reqDoc.status, `${submittedBy}${remarks ? ' \u00b7 ' + remarks : ''}`);
  if (remarks) pushFeedback(reqDoc, submittedBy, 'Design Team', 'Submitted', remarks);
  await reqDoc.save();

  await Notification.create({
    audience: 'head', type: 'review', category: 'Reviews',
    title: wasChanges ? 'Design resubmitted for approval' : 'Design submitted for approval',
    message: `${reqDoc.projectName || reqDoc.id}${reqDoc.procurementProjectCode ? ' (' + reqDoc.procurementProjectCode + ')' : ''} \u2014 by ${submittedBy}`,
    desc: `${reqDoc.projectName || reqDoc.id} \u2014 by ${submittedBy}`,
    time: 'just now', read: false, requestId: reqDoc.id,
    projectName: reqDoc.projectName || '', projectCode: reqDoc.procurementProjectCode || '',
  });
  res.json(reqDoc.toObject());
});

// GET /api/requests/mine — requests assigned to the logged-in team member (by account
// id first, then by name). Visible across logout/login because it is read from the DB.
const mine = asyncHandler(async (req, res) => {
  const uid = req.auth && req.auth.id ? String(req.auth.id) : '';
  const name = (req.auth && req.auth.name) || '';
  const or = [];
  if (uid) or.push({ assignedUserId: uid });
  if (name) or.push({ assignedDesigner: name });
  const docs = or.length ? await Request.find({ $or: or }).sort({ updatedAt: -1 }).lean() : [];
  res.json(docs);
});

module.exports = { ...base, assign, getProject, submitForApproval, mine, directAssign, setStatus, addComment, saveRequirement, addAttachment, approve, reject, requestChanges };
