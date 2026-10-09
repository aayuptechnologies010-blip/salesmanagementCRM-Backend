const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  name: { type: String, required: true }, // Contact Person
  company: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  onboardingStatus: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  contractValue: { type: String },
  supportContact: { type: String },
  assignedTo: { type: String },
  notes: [{ text: String, time: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
