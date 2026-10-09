const router = require('express').Router();
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const checkAccess = async (user, assignedTo) => {
  const adminRoles = ['Super Admin', 'Admin', 'Manager'];
  if (adminRoles.includes(user.role)) return true;
  
  if (['Sales Executive', 'Sales Employee', 'Telecaller', 'Support'].includes(user.role)) {
    return assignedTo === user.name;
  }
  
  if (user.role === 'Team Leader') {
    const teamMembers = await User.find({ team: user.team }).select('name').lean();
    const memberNames = teamMembers.map(u => u.name);
    memberNames.push(user.name);
    return memberNames.includes(assignedTo) || !assignedTo;
  }
  
  return false;
};

const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

// GET /api/followups?status=&assignedTo=&date=
router.get('/', protect, async (req, res) => {
  try {
    const { status, assignedTo, date } = req.query;
    const filter = {};

    const adminRoles = ['Super Admin', 'Admin', 'Manager'];
    const restrictRoles = ['Sales Executive', 'Sales Employee', 'Telecaller', 'Support'];

    if (restrictRoles.includes(req.user.role)) {
      filter.assignedTo = req.user.name;
    } else if (req.user.role === 'Team Leader') {
      const teamMembers = await User.find({ team: req.user.team }).select('name').lean();
      const memberNames = teamMembers.map(u => u.name);
      memberNames.push(req.user.name);
      filter.assignedTo = { $in: memberNames };
      if (assignedTo && memberNames.includes(assignedTo)) filter.assignedTo = assignedTo;
    } else {
      if (assignedTo) filter.assignedTo = assignedTo;
    }

    if (status) filter.status = status;
    if (date) filter.date = date;

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
    const fuCheck = await FollowUp.findById(req.params.id).lean();
    if (!fuCheck) return res.status(404).json({ message: 'Follow-up not found' });

    const hasAccess = await checkAccess(req.user, fuCheck.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to edit this follow-up' });

    const fu = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(fu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const fuCheck = await FollowUp.findById(req.params.id).lean();
    if (!fuCheck) return res.status(404).json({ message: 'Follow-up not found' });

    if (!['Super Admin', 'Admin', 'Manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only Admins/Managers can delete follow-ups' });
    }

    await FollowUp.findByIdAndDelete(req.params.id);
    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
