const mongoose = require('mongoose');

// Drawings Library entry. Bytes live in FileAsset (fileId).
const DrawingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // DWG-001
    name: { type: String, default: '' },
    folder: { type: String, default: '2D Drawings' },   // 2D Drawings | 3D Drawings | BOQ
    version: { type: String, default: 'V1' },
    designer: { type: String, default: '' },
    project: { type: String, default: '' },
    date: { type: String, default: '' },
    fileId: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'design_drawings' }
);

module.exports = mongoose.model('Drawing', DrawingSchema);
