const router = require('express').Router();
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// GET /api/activities?limit=30&lead=LeadName
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const filter = {};
    if (req.user.role === 'Sales Executive') filter.user = req.user.name;
    if (req.query.lead) filter.lead = req.query.lead;
    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
