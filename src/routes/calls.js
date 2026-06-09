const router = require('express').Router();
const { protect } = require('../middleware/auth');
const CallRecording = require('../models/CallRecording');
const Activity = require('../models/Activity');
const Lead = require('../models/Lead');

// GET /api/calls/log — get call logs (kept for recordings page if needed)
router.get('/log', protect, async (req, res) => {
  try {
    const logs = await CallRecording.find().populate('calledBy', 'name').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
