const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  phone:        { type: String, trim: true, default: '' },
  company:      { type: String, trim: true },
  value:        { type: String, default: '' },
  source:       { type: String, enum: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Conference', 'Other'], default: 'Website' },
  status:       { type: String, enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'No Response', 'Interested'], default: 'New' },
  leadType:     { type: String, enum: ['Client Project', 'Student Training'], default: 'Client Project' },
  
  // Student Training details
  course:       { type: String, default: '' },
  branch:       { type: String, default: '' },
  college:      { type: String, default: '' },
  year:         { type: String, default: '' },
  trainingType: { type: String, default: '' },

  // Client Project details
  projectType:   { type: String, default: '' },
  techStack:     { type: String, default: '' },
  timeline:      { type: String, default: '' },

  // Client-specific contact & business details
  contactPerson: { type: String, default: '' },
  pinCode:       { type: String, default: '' },
  typeOfCare:    { type: String, default: '' },
  hospitalZone:  { type: String, default: '' },
  tpaName:       { type: String, default: '' },

  assignedTo:   { type: String, default: '' },
  followUpDate: { type: String, default: '' },
  notes:        [{ text: String, time: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for fast search & filter
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ name: 'text', company: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
