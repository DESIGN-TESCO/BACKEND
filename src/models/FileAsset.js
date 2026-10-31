const mongoose = require('mongoose');

// Binary file storage directly in MongoDB (one document = one file), mirroring the
// Procurement portal's approach so viewing/downloading never depends on any
// third-party storage. Referenced by its _id (stored as `fileId` on the owning
// entity). A single Mongo document caps at 16 MB, so the upload route rejects
// files larger than MAX_UPLOAD_MB (default 12 MB).
const FileAssetSchema = new mongoose.Schema(
  {
    entity: { type: String, default: '' },   // 'request' | 'submittal' | 'drawing' | 'document' | 'revision'
    entityId: { type: String, default: '' },  // the owning record's human id
    name: { type: String, default: 'file' },
    type: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: String, default: '' },
    data: Buffer,
  },
  { timestamps: true, collection: 'design_files' }
);

FileAssetSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('FileAsset', FileAssetSchema);
