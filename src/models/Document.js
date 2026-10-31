const mongoose = require('mongoose');

// Documents library entry (requirements, BOQ files, site references). Bytes live
// in FileAsset (fileId).
const DocumentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // DOC-001
    name: { type: String, default: '' },
    category: { type: String, default: '' },            // 2D Requirements | 3D Briefs | BOQ Files | Site References
    project: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
    version: { type: String, default: 'V1' },
    date: { type: String, default: '' },
    fileId: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'design_documents' }
);

module.exports = mongoose.model('DesignDocument', DocumentSchema);
