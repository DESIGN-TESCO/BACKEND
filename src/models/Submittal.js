const mongoose = require('mongoose');

// A deliverable file submitted by the Design Team for Head review. The actual
// bytes live in FileAsset (fileId); this record holds the metadata + workflow.
const SubmittalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // SUB-001
    reqId: { type: String, default: '' },               // -> Request.id
    projectName: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileType: { type: String, default: '' },            // AutoCAD | PDF | 3D Model | STAAD | ZIP Archive
    fileSize: { type: String, default: '' },
    deliverable: { type: String, default: '' },
    version: { type: String, default: 'V1' },
    submittedBy: { type: String, default: '' },         // designer name
    submittedDate: { type: String, default: '' },
    status: { type: String, default: 'Pending Head Review' }, // Pending Head Review | Approved by Head | Revision Requested
    notes: { type: String, default: '' },
    fileId: { type: String, default: '' },              // -> FileAsset._id
  },
  { timestamps: true, strict: false, collection: 'design_submittals' }
);

module.exports = mongoose.model('Submittal', SubmittalSchema);
