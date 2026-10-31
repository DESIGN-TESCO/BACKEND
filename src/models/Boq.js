const mongoose = require('mongoose');

// Bill of Quantities. materials[] is embedded; materialCount and estimatedCost
// are derived on save from the material rows.
const MaterialSchema = new mongoose.Schema(
  {
    item: String,
    quantity: String,
    unit: String,     // rft | Nos | lits | SqM | kgs | Tons
    price: String,
    total: String,
    category: String, // "M.S materials - type" | "Sheets - type" | "Accessories"
  },
  { _id: false }
);

const BoqSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // BOQ-2026-001
    project: { type: String, default: '' },
    projectType: { type: String, default: '' },
    leadId: { type: String, default: '' },
    engineer: { type: String, default: '' },            // designer name
    materialCount: { type: Number, default: 0 },
    estimatedCost: { type: String, default: '₹0' },
    version: { type: String, default: 'V1' },
    status: { type: String, default: 'Preparing' },     // Preparing | Waiting Approval | Approved | Completed | Pending
    materials: { type: [MaterialSchema], default: [] },
  },
  { timestamps: true, strict: false, collection: 'design_boqs' }
);

module.exports = mongoose.model('Boq', BoqSchema);
