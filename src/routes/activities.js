const router = require('express').Router();
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// GET /api/activities?limit=50
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
