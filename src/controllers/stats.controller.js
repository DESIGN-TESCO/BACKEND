const Request = require('../models/Request');
const Revision = require('../models/Revision');
const Boq = require('../models/Boq');
const asyncHandler = require('../utils/asyncHandler');

const todayStr = () => new Date().toISOString().slice(0, 10);

// GET /api/stats/head — all Design Head dashboard cards + summary strips, computed live.
const head = asyncHandler(async (req, res) => {
  const requests = await Request.find().select('status assignedDesigner dueDate').lean();
  const revisions = await Revision.find().select('status').lean();
  const boqs = await Boq.find().select('status').lean();
  const today = todayStr();

  const countStatus = (...s) => requests.filter((r) => s.includes(r.status)).length;
  const cards = {
    newRequests: countStatus('New'),
    pendingAssignment: requests.filter((r) => (r.assignedDesigner || 'Unassigned') === 'Unassigned').length,
    activeProjects: countStatus('In Progress', 'Assigned'),
    pendingReview: countStatus('Pending Review'),
    clientRevisions: revisions.filter((r) => ['Pending', 'Urgent'].includes(r.status)).length,
    overdueTasks: requests.filter((r) => ['Assigned', 'In Progress'].includes(r.status) && r.dueDate && r.dueDate < today).length,
    completedThisWeek: countStatus('Completed', 'Approved'),
  };
  const requestsSummary = {
    new: countStatus('New'),
    pendingAssign: requests.filter((r) => (r.assignedDesigner || 'Unassigned') === 'Unassigned').length,
    inProgress: countStatus('In Progress'),
    waitingReview: countStatus('Pending Review'),
    revision: revisions.filter((r) => ['Pending', 'Urgent'].includes(r.status)).length,
    completed: countStatus('Completed', 'Approved'),
  };
  const boqStatus = (s) => boqs.filter((b) => b.status === s).length;
  const boqSummary = {
    pending: boqStatus('Pending'),
    preparing: boqStatus('Preparing'),
    waitingApproval: boqStatus('Waiting Approval'),
    approved: boqStatus('Approved'),
    completed: boqStatus('Completed'),
  };
  res.json({ cards, requestsSummary, boqSummary, totals: { requests: requests.length, boqs: boqs.length, revisions: revisions.length } });
});

// GET /api/stats/team?designer=Name — Design Team metrics (scoped to PEB + designer).
const team = asyncHandler(async (req, res) => {
  const designer = req.query.designer && req.query.designer !== 'All Team' ? req.query.designer : null;
  const q = { projectType: 'PEB' };
  const all = await Request.find(q).select('status priority assignedDesigner comments').lean();
  const mine = all.filter((r) => !designer || r.assignedDesigner === designer || r.assignedDesigner === 'Unassigned');
  const has = (r, ...s) => s.includes(r.status);
  const revisionNeeded = (r) => ['Revision', 'Revision Requested'].includes(r.status) || (Array.isArray(r.comments) && r.comments.some((c) => c.role === 'Design Head'));
  res.json({
    totalAssigned: mine.length,
    inProgress: mine.filter((r) => has(r, 'In Progress', 'Assigned')).length,
    pendingReview: mine.filter((r) => has(r, 'Pending Review', 'Under Review')).length,
    approved: mine.filter((r) => has(r, 'Approved', 'Completed')).length,
    revisionNeeded: mine.filter(revisionNeeded).length,
    urgentCount: mine.filter((r) => r.priority === 'Urgent').length,
  });
});

module.exports = { head, team };
