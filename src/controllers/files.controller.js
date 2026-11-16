const mongoose = require('mongoose');
const FileAsset = require('../models/FileAsset');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Large design files (SketchUp, STAAD, CAD, big PDFs) do not fit in a single Mongo
// document (16 MB BSON cap). We store file bytes in GridFS, which chunks a file
// across many documents, so there is effectively no per-file size limit — only the
// configurable MAX_UPLOAD_MB guardrail. Legacy files written before this change still
// live as single documents in `design_files` (FileAsset); reads/deletes fall back to
// that collection so nothing already uploaded breaks.
const BUCKET = 'design_uploads'; // -> design_uploads.files / design_uploads.chunks
const maxBytes = () => (Number(process.env.MAX_UPLOAD_MB) || 60) * 1024 * 1024;

const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
const asObjectId = (id) => { try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; } };

// POST /api/files  { entity, entityId, name, type, size, dataBase64, uploadedBy }
const upload = asyncHandler(async (req, res) => {
  const { entity, entityId, name, type, size, dataBase64, uploadedBy } = req.body || {};
  if (!dataBase64) throw new ApiError(400, 'No file data received.');
  const raw = String(dataBase64);
  const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw new ApiError(400, 'The file appears to be empty.');
  if (buf.length > maxBytes()) throw new ApiError(413, `That file is larger than ${process.env.MAX_UPLOAD_MB || 60} MB.`);

  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(name || 'file', {
    contentType: type || 'application/octet-stream',
    metadata: { entity: entity || '', entityId: entityId || '', uploadedBy: uploadedBy || (req.auth && req.auth.name) || '', size: buf.length },
  });
  await new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', resolve);
    uploadStream.end(buf);
  });
  res.status(201).json({ success: true, fileId: String(uploadStream.id), name: name || 'file', type: type || 'application/octet-stream', size: buf.length });
});

// GET /api/files?entity=request&entityId=REQ-2026-001  — metadata list (no bytes).
const listByEntity = asyncHandler(async (req, res) => {
  const { entity, entityId } = req.query || {};
  const meta = {};
  if (entity) meta['metadata.entity'] = entity;
  if (entityId) meta['metadata.entityId'] = entityId;
  const gfiles = await mongoose.connection.db.collection(`${BUCKET}.files`).find(meta).sort({ uploadDate: 1 }).toArray();
  const out = gfiles.map((d) => ({ fileId: String(d._id), name: d.filename, type: d.contentType || (d.metadata && d.metadata.type) || '', size: (d.metadata && d.metadata.size) || d.length, entity: d.metadata && d.metadata.entity, entityId: d.metadata && d.metadata.entityId, uploadedAt: d.uploadDate }));

  const q = {};
  if (entity) q.entity = entity;
  if (entityId) q.entityId = entityId;
  const legacy = await FileAsset.find(q).select('-data').sort({ createdAt: 1 }).lean();
  for (const d of legacy) out.push({ fileId: String(d._id), name: d.name, type: d.type, size: d.size, entity: d.entity, entityId: d.entityId, uploadedAt: d.createdAt });
  res.json(out);
});

// GET /api/files/:id  — stream bytes. Inline by default; ?download=1 to save.
const stream = asyncHandler(async (req, res) => {
  const oid = asObjectId(req.params.id);
  const safeDisp = (name) => {
    const disp = req.query.download ? 'attachment' : 'inline';
    const safe = (name || 'file').replace(/[^\w.\-]+/g, '_');
    res.set('Content-Disposition', `${disp}; filename="${safe}"`);
    res.set('Cache-Control', 'private, max-age=60');
  };

  if (oid) {
    const gfile = await mongoose.connection.db.collection(`${BUCKET}.files`).findOne({ _id: oid });
    if (gfile) {
      res.set('Content-Type', gfile.contentType || 'application/octet-stream');
      safeDisp(gfile.filename);
      const dl = getBucket().openDownloadStream(gfile._id);
      dl.on('error', () => { if (!res.headersSent) res.status(404).json({ message: 'File not found.' }); });
      return dl.pipe(res);
    }
  }

  const doc = await FileAsset.findById(req.params.id).catch(() => null);
  if (!doc || !doc.data) throw new ApiError(404, 'File not found.');
  res.set('Content-Type', doc.type || 'application/octet-stream');
  safeDisp(doc.name);
  res.send(doc.data);
});

// DELETE /api/files/:id
const remove = asyncHandler(async (req, res) => {
  const oid = asObjectId(req.params.id);
  if (oid) {
    const gfile = await mongoose.connection.db.collection(`${BUCKET}.files`).findOne({ _id: oid });
    if (gfile) { try { await getBucket().delete(oid); } catch { /* already gone */ } return res.json({ success: true }); }
  }
  await FileAsset.deleteOne({ _id: req.params.id }).catch(() => {});
  res.json({ success: true });
});

// POST /api/files/stream?entity=&entityId=&name=&type=&uploadedBy=
// The raw file bytes ARE the request body (no base64, no JSON wrapper). They are piped
// straight into GridFS, so even very large files never load fully into memory and the
// JSON body-size limit does not apply. This is the memory-safe path for big uploads.
const uploadStream = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const name = (q.name ? decodeURIComponent(String(q.name)) : '') || 'file';
  const type = String(q.type || req.headers['content-type'] || 'application/octet-stream');
  const max = maxBytes();
  const declared = Number(req.headers['content-length'] || 0);
  if (declared && declared > max) throw new ApiError(413, `That file is larger than ${process.env.MAX_UPLOAD_MB || 60} MB.`);

  const bucket = getBucket();
  const up = bucket.openUploadStream(name, {
    contentType: type,
    metadata: { entity: String(q.entity || ''), entityId: String(q.entityId || ''), uploadedBy: String(q.uploadedBy || (req.auth && req.auth.name) || '') },
  });

  let bytes = 0, tooBig = false;
  try {
    await new Promise((resolve, reject) => {
      up.on('error', reject);
      up.on('finish', resolve);
      req.on('error', reject);
      req.on('aborted', () => reject(new Error('aborted')));
      req.on('data', (chunk) => { bytes += chunk.length; if (bytes > max && !tooBig) { tooBig = true; up.destroy(new Error('too-big')); } });
      req.pipe(up);
    });
  } catch (e) {
    try { await bucket.delete(up.id); } catch (_) { /* nothing written */ }
    if (tooBig) throw new ApiError(413, `That file is larger than ${process.env.MAX_UPLOAD_MB || 60} MB.`);
    throw new ApiError(400, 'Upload failed — the connection dropped before the file finished. Please try again.');
  }
  if (!bytes) { try { await bucket.delete(up.id); } catch (_) {} throw new ApiError(400, 'The file appears to be empty.'); }
  res.status(201).json({ success: true, fileId: String(up.id), name, type, size: bytes });
});

module.exports = { upload, uploadStream, listByEntity, stream, remove };
