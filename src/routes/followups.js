const router = require('express').Router();
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

// GET /api/followups?status=&assignedTo=&date=
router.get('/', protect, async (req, res) => {
  try {
    const { status, assignedTo, date } = req.query;
    const filter = {};
    if (status)     filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (date)       filter.date = date;

    const followUps = await FollowUp.find(filter).sort({ date: 1, time: 1 }).lean();
    res.json(followUps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/followups
router.post('/', protect, async (req, res) => {
  try {
    const fu = await FollowUp.create({ ...req.body, createdBy: req.user._id });
    await log(req.user.name, `Follow-up scheduled for ${fu.lead}`, fu.lead, 'followup');
    res.status(201).json(fu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/followups/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const fu = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fu) return res.status(404).json({ message: 'Follow-up not found' });
    res.json(fu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await FollowUp.findByIdAndDelete(req.params.id);
    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
