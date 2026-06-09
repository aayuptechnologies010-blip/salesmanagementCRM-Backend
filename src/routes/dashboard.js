const router = require('express').Router();
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/dashboard — role-aware stats
router.get('/', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const isSalesExec = req.user.role === 'Sales Executive';
    const isAdmin = req.user.role === 'Super Admin' || req.user.role === 'Admin';

    // For Sales Executive — filter everything by their name
    const leadFilter = isSalesExec ? { assignedTo: req.user.name } : {};
    const followUpFilter = isSalesExec
      ? { date: today, status: 'Pending', assignedTo: req.user.name }
      : { date: today, status: 'Pending' };
    const activityFilter = isSalesExec ? { user: req.user.name } : {};

    const [
      totalLeads,
      newToday,
      assigned,
      converted,
      leadsByStatus,
      todayFollowUps,
      recentActivities,
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, createdAt: { $gte: new Date(today) } }),
      isAdmin ? Lead.countDocuments({ assignedTo: { $ne: '' } }) : Lead.countDocuments({ ...leadFilter, assignedTo: { $ne: '' } }),
      Lead.countDocuments({ ...leadFilter, status: 'Won' }),
      Lead.aggregate([{ $match: leadFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      FollowUp.find(followUpFilter).limit(5).lean(),
      Activity.find(activityFilter).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    // Team performance — only for Admin/Super Admin
    let teamPerformance = [];
    if (isAdmin) {
      const teamMembers = await User.find({ role: { $ne: 'Super Admin' } }).select('name').lean();
      teamPerformance = await Promise.all(
        teamMembers.map(async (m) => {
          const [leads, converted] = await Promise.all([
            Lead.countDocuments({ assignedTo: m.name }),
            Lead.countDocuments({ assignedTo: m.name, status: 'Won' }),
          ]);
          return { name: m.name.split(' ')[0], leads, converted };
        })
      );
    }

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
