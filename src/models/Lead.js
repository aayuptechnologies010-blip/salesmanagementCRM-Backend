const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  phone:        { type: String, trim: true },
  company:      { type: String, trim: true },
  value:        { type: String, default: '' },
  source:       { type: String, enum: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Conference', 'Other'], default: 'Website' },
  status:       { type: String, enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'], default: 'New' },
  assignedTo:   { type: String, default: '' },
  followUpDate: { type: String, default: '' },
  notes:        [{ text: String, time: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for fast search & filter
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ name: 'text', company: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
