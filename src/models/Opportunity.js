const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  name: { type: String, required: true }, // Deal Name
  company: { type: String },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String },
  value: { type: String, default: '0' },
  stage: { 
    type: String, 
    enum: ['Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'], 
    default: 'Qualified' 
  },
  expectedCloseDate: { type: String },
  probability: { type: Number, default: 50 },
  assignedTo: { type: String },
  notes: [{ text: String, time: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Opportunity', opportunitySchema);
