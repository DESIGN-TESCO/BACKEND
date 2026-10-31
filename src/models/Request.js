const mongoose = require('mongoose');

// A design request — the central entity. Mirrors the frontend seed shape exactly,
// including the two alternative spec blocks (pebDetails / residentialDetails) and
// the embedded attachments / comments / history arrays. strict:false so the PEB
// requirement form can store its many extra fields without a rigid schema.

const AttachmentSchema = new mongoose.Schema(
  { name: String, size: String, type: String, fileId: String }, // fileId -> FileAsset._id
  { _id: false }
);
const CommentSchema = new mongoose.Schema(
  { sender: String, role: String, text: String, time: String },
  { _id: false }
);
const HistorySchema = new mongoose.Schema(
  { title: String, time: String, desc: String },
  { _id: false }
);

const RequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // REQ-2026-001
    leadId: { type: String, default: '' },              // link to sales Lead (LD-1001)
    customerName: { type: String, default: '' },
    projectName: { type: String, default: '' },
    projectType: { type: String, default: '' },         // PEB | Mangalore Tile Roofing | Glass Roofing | …
    service: { type: String, default: '' },
    requirement: { type: String, default: '' },         // deliverable format (2D + 3D, BOQ, …)
    priority: { type: String, default: 'Medium' },      // Urgent | High | Medium | Normal | Low
    requestedBy: { type: String, default: '' },         // "Name (Role)"
    salesManager: { type: String, default: '' },
    projectManager: { type: String, default: '' },
    assignedDesigner: { type: String, default: 'Unassigned' }, // designer NAME or 'Unassigned'
    dueDate: { type: String, default: '' },             // YYYY-MM-DD
    status: { type: String, default: 'New' },           // New|Assigned|In Progress|Pending Review|Completed|Approved|Revision…
    budget: { type: String, default: '' },
    timeline: { type: String, default: '' },
    location: { type: String, default: '' },
    estHours: { type: String, default: '' },

    deliverables: { type: [String], default: [] },
    pebDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    residentialDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },

    attachments: { type: [AttachmentSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },
    history: { type: [HistorySchema], default: [] },

    // ── Procurement ⇄ Design integration (shared database) ──
    source: { type: String, default: 'manual' },        // 'procurement' | 'manual'
    procurementProjectId: { type: String, default: '' }, // Procurement PRJ-xxx
    procurementProjectCode: { type: String, default: '' },
    requestedByUser: { type: String, default: '' },      // procurement user name/email

    // ── Approval outcome (written back for Procurement to read) ──
    approvedDate: { type: String, default: '' },
    approvedBy: { type: String, default: '' },
    approvedFiles: { type: [AttachmentSchema], default: [] }, // {name,size,type,fileId}
    rejectionReason: { type: String, default: '' },
    changeRemarks: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'design_requests' }
);

RequestSchema.index({ status: 1 });
RequestSchema.index({ assignedDesigner: 1 });
RequestSchema.index({ projectType: 1 });

module.exports = mongoose.model('DesignRequest', RequestSchema);
