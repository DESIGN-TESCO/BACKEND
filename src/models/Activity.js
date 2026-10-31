const mongoose = require('mongoose');

// Department activity feed. `time` keeps the human relative string the UI shows;
// createdAt is the real timestamp used for ordering.
const ActivitySchema = new mongoose.Schema(
  {
    user: { type: String, default: '' },
    action: { type: String, default: '' },
    target: { type: String, default: '' },
    time: { type: String, default: '' },
  },
  { timestamps: true, collection: 'design_activities' }
);

ActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
