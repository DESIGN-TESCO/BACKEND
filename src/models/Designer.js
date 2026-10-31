const mongoose = require('mongoose');

// Design team roster. `id` is the human key (D01, D02, …). Workload / task counts
// are maintained by the assignment logic (see requests controller) but can also
// be recomputed from live request data.
const DesignerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // D01
    name: { type: String, required: true },
    role: { type: String, default: '' },                // job title, e.g. "PEB Specialist"
    avatar: { type: String, default: '' },              // 2-letter initials
    experience: { type: String, default: '' },
    availability: { type: String, enum: ['Full-time', 'Part-time'], default: 'Full-time' },
    status: { type: String, enum: ['Available', 'Busy'], default: 'Available' },

    // Live workload (maintained on assignment / completion).
    currentTasks: { type: Number, default: 0 },
    workload: { type: Number, default: 0 },             // 0–100 %
    availableCapacity: { type: String, default: '40 hrs' },
    pendingReview: { type: Number, default: 0 },
    revisions: { type: Number, default: 0 },

    // Performance metrics (shown on the designer profile).
    avgCompletionTime: { type: String, default: '0 Days' },
    completedProjects: { type: Number, default: 0 },
    revisionRate: { type: String, default: '0%' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false, collection: 'design_designers' }
);

module.exports = mongoose.model('Designer', DesignerSchema);
