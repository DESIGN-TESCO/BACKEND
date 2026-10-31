const Designer = require('../models/Designer');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Apply a workload delta to a designer (by name), mirroring the UI's engine:
// +1 task / +15% workload on assign, -1 / -15% on unassign; Busy when workload > 85.
async function adjustDesignerWorkload(name, { tasks = 0, workload = 0, pendingReview = 0, revisions = 0 } = {}) {
  if (!name || name === 'Unassigned') return null;
  const d = await Designer.findOne({ name });
  if (!d) return null;
  d.currentTasks = clamp((d.currentTasks || 0) + tasks, 0, 999);
  d.workload = clamp((d.workload || 0) + workload, 0, 100);
  d.pendingReview = clamp((d.pendingReview || 0) + pendingReview, 0, 999);
  d.revisions = clamp((d.revisions || 0) + revisions, 0, 999);
  d.status = d.workload > 85 ? 'Busy' : 'Available';
  await d.save();
  return d;
}

module.exports = { adjustDesignerWorkload, clamp };
