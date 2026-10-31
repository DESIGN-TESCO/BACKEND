const mongoose = require('mongoose');

// READ-ONLY view onto the Procurement portal's projects, which live in the SAME
// MongoDB (shared cluster) in the `purchase_projects` collection. The Design CRM
// uses this to pull the full, live project details for a design request that was
// raised from Procurement — so project info never has to be re-typed and stays in
// sync with Procurement. strict:false because the procurement schema is rich and
// evolves; we only ever read from it here.
const ProcurementProjectSchema = new mongoose.Schema(
  {},
  { timestamps: true, strict: false, collection: 'purchase_projects' }
);

// Guard against model overwrite on hot reload.
module.exports =
  mongoose.models.ProcurementProject ||
  mongoose.model('ProcurementProject', ProcurementProjectSchema);
