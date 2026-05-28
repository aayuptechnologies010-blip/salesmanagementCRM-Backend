const router = require('express').Router();
const Invoice = require('../models/Invoice');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/invoices?status=&search=
router.get('/', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { client: { $regex: search, $options: 'i' } },
      { invoiceNumber: { $regex: search, $options: 'i' } },
    ];
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invoices/summary — totals by status
router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await Invoice.aggregate([
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/invoices
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
