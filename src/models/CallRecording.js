const mongoose = require('mongoose');

const callRecordingSchema = new mongoose.Schema({
  leadId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  calledBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone:     { type: String, required: true },
  duration:  { type: Number, default: 0 }, // seconds
  filename:  { type: String, required: true },
  url:       { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CallRecording', callRecordingSchema);
