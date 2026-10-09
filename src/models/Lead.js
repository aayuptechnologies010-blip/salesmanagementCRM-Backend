const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, trim: true, lowercase: true },
  phone:          { type: String, trim: true, default: '' },
  alternatePhone: { type: String, trim: true, default: '' },
  company:        { type: String, trim: true },
  designation:    { type: String, trim: true, default: '' },
  requirement:    { type: String, trim: true, default: '' },
  budget:         { type: String, trim: true, default: '' },
  location:       { type: String, trim: true, default: '' },
  industry:       { type: String, trim: true, default: '' },
  companySize:    { type: String, trim: true, default: '' },
  priority:       { type: String, enum: ['Hot', 'Warm', 'Cold', ''], default: '' },
  value:          { type: String, default: '' },
  source:         { type: String, enum: ['Website', 'Facebook', 'Instagram', 'Google Ads', 'WhatsApp', 'Referral', 'Cold Call', 'Walk-in', 'Manual Entry', 'Excel/CSV Import', 'LinkedIn', 'Email Campaign', 'Conference', 'Other'], default: 'Website' },
  status:         { type: String, enum: ['New', 'Assigned', 'Contacted', 'Interested', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Not Interested', 'Invalid', 'Duplicate', 'No Response', 'Lost'], default: 'New' },
  lostReason:     { type: String, trim: true, default: '' },
  leadType:       { type: String, enum: ['Client Project', 'Student Training'], default: 'Client Project' },
  
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
