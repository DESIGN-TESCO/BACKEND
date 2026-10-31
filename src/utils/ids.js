// Human-readable sequential ID generators (REQ-2026-001, D01, BOQ-2026-002, …).
// The backend owns ID allocation so the frontend never has to guess. Each helper
// finds the current max numeric suffix for a prefix and returns the next one.

const pad = (n, w) => String(n).padStart(w, '0');

// Build "PREFIX-YYYY-001" style ids, scoped to the current year by default.
async function nextYearlyId(Model, field, prefix, width = 3) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const rows = await Model.find({ [field]: re }).select(field).lean();
  const max = rows.reduce((m, r) => {
    const n = parseInt(String(r[field]).split('-').pop(), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${year}-${pad(max + 1, width)}`;
}

// Build "PREFIX001" / "D01" style ids (no year segment).
async function nextSeqId(Model, field, prefix, width = 2) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  const rows = await Model.find({ [field]: re }).select(field).lean();
  const max = rows.reduce((m, r) => {
    const n = parseInt(String(r[field]).replace(prefix, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${pad(max + 1, width)}`;
}

module.exports = { nextYearlyId, nextSeqId, pad };
