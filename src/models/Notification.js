const mongoose = require('mongoose');

// Notifications for both personas in one collection. `audience` routes a
// notification to the Design Head bell ('head') or the Design Team bell ('team').
// `category` is used by the Head UI (Assignments|Reviews|Revisions|Completed) and
// `type` by the Team UI (revision|assignment|approval).
const NotificationSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['head', 'team', 'procurement'], required: true, index: true },
    title: { type: String, default: '' },
    message: { type: String, default: '' },  // Head uses `message`; Team uses `desc`
    desc: { type: String, default: '' },
    category: { type: String, default: '' }, // head categories
    type: { type: String, default: '' },     // team types
    read: { type: Boolean, default: false },
    time: { type: String, default: '' },
    designerName: { type: String, default: '' }, // optional: target team member
  },
  { timestamps: true, collection: 'design_notifications' }
);

NotificationSchema.index({ audience: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('DesignNotification', NotificationSchema);
