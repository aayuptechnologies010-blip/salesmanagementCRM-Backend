const router = require('express').Router();
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/dashboard — all stats in one request for fast load
router.get('/', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Run all queries in parallel
    const [
      totalLeads,
      newToday,
      assigned,
      converted,
      leadsByStatus,
      todayFollowUps,
      recentActivities,
      teamMembers,
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: new Date(today) } }),
      Lead.countDocuments({ assignedTo: { $ne: '' } }),
      Lead.countDocuments({ status: 'Won' }),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      FollowUp.find({ date: today, status: 'Pending' }).limit(5).lean(),
      Activity.find().sort({ createdAt: -1 }).limit(8).lean(),
      User.find({ role: { $ne: 'Super Admin' } }).select('-password').lean(),
    ]);

    // Team performance
    const teamPerformance = await Promise.all(
      teamMembers.map(async (m) => {
        const [leads, converted] = await Promise.all([
          Lead.countDocuments({ assignedTo: m.name }),
          Lead.countDocuments({ assignedTo: m.name, status: 'Won' }),
        ]);
        return { name: m.name.split(' ')[0], leads, converted };
      })
    );

    res.json({
      kpis: { totalLeads, newToday, assigned, converted },
      leadsByStatus,
      todayFollowUps,
      recentActivities,
      teamPerformance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
