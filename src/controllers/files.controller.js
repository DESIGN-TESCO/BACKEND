const FileAsset = require('../models/FileAsset');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const maxBytes = () => (Number(process.env.MAX_UPLOAD_MB) || 12) * 1024 * 1024;

// POST /api/files  { entity, entityId, name, type, size, dataBase64, uploadedBy }
// Stores one file's bytes in MongoDB and returns its reference id + metadata.
const upload = asyncHandler(async (req, res) => {
  const { entity, entityId, name, type, size, dataBase64, uploadedBy } = req.body || {};
  if (!dataBase64) throw new ApiError(400, 'No file data received.');
  const raw = String(dataBase64);
  const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw new ApiError(400, 'The file appears to be empty.');
  if (buf.length > maxBytes()) throw new ApiError(413, `That file is larger than ${process.env.MAX_UPLOAD_MB || 12} MB.`);
  const doc = await FileAsset.create({
    entity: entity || '', entityId: entityId || '',
    name: name || 'file', type: type || 'application/octet-stream',
    size: size || buf.length, uploadedBy: uploadedBy || (req.auth && req.auth.name) || '',
    data: buf,
  });
  res.status(201).json({ success: true, fileId: String(doc._id), name: doc.name, type: doc.type, size: doc.size });
});

// GET /api/files?entity=request&entityId=REQ-2026-001  — metadata list (no bytes).
const listByEntity = asyncHandler(async (req, res) => {
  const { entity, entityId } = req.query || {};
  const q = {};
  if (entity) q.entity = entity;
  if (entityId) q.entityId = entityId;
  const docs = await FileAsset.find(q).select('-data').sort({ createdAt: 1 }).lean();
  res.json(docs.map((d) => ({ fileId: String(d._id), name: d.name, type: d.type, size: d.size, entity: d.entity, entityId: d.entityId, uploadedAt: d.createdAt })));
});

// GET /api/files/:id  — stream bytes. Inline by default; ?download=1 to save.
const stream = asyncHandler(async (req, res) => {
  const doc = await FileAsset.findById(req.params.id);
  if (!doc || !doc.data) throw new ApiError(404, 'File not found.');
  const disp = req.query.download ? 'attachment' : 'inline';
  const safe = (doc.name || 'file').replace(/[^\w.\-]+/g, '_');
  res.set('Content-Type', doc.type || 'application/octet-stream');
  res.set('Content-Disposition', `${disp}; filename="${safe}"`);
  res.set('Cache-Control', 'private, max-age=60');
  res.send(doc.data);
});

// DELETE /api/files/:id
const remove = asyncHandler(async (req, res) => {
  await FileAsset.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = { upload, listByEntity, stream, remove };
