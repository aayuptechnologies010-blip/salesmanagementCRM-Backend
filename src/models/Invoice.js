const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  client:        { type: String, required: true },
  contact:       { type: String, default: '' },
  amount:        { type: Number, required: true },
  status:        { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
  issueDate:     { type: String },
  dueDate:       { type: String },
  leadRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(1000 + count + 1)}`;
  }
  next();
});

invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
