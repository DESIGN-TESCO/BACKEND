const mongoose = require('mongoose');

// Client/Head-requested revision on a project.
const RevisionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // REV-001
    requestId: { type: String, default: '' },           // -> Request.id
    project: { type: String, default: '' },
    revNumber: { type: String, default: 'R1' },
    designer: { type: String, default: '' },
    requestedBy: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    status: { type: String, default: 'Pending' },       // Pending | Urgent | Completed
    comments: { type: String, default: '' },
    oldVersion: { type: String, default: '' },
    newVersion: { type: String, default: '' },
    date: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'design_revisions' }
);

module.exports = mongoose.model('Revision', RevisionSchema);
