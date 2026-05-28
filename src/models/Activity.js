const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user:   { type: String, required: true },
  action: { type: String, required: true },
  lead:   { type: String, default: '' },
  type:   { type: String, enum: ['add', 'edit', 'assign', 'followup', 'delete'], default: 'edit' },
  time:   { type: String },
}, { timestamps: true });

activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
