const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  lead:       { type: String, required: true },
  company:    { type: String, default: '' },
  date:       { type: String, required: true },
  time:       { type: String, default: '' },
  assignedTo: { type: String, default: '' },
  priority:   { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status:     { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
  leadRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

followUpSchema.index({ date: 1 });
followUpSchema.index({ assignedTo: 1 });
followUpSchema.index({ status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
