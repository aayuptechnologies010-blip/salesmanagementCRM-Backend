const router = require('express').Router();
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

const checkAccess = async (user, assignedTo) => {
  const adminRoles = ['Super Admin', 'Admin', 'Manager'];
  if (adminRoles.includes(user.role)) return true;
  if (['Sales Executive', 'Sales Employee', 'Telecaller', 'Support', 'Accountant'].includes(user.role)) {
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

// GET /api/customers
router.get('/', protect, async (req, res) => {
  try {
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
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const custCheck = await Customer.findById(req.params.id).lean();
    if (!custCheck) return res.status(404).json({ message: 'Customer not found' });

    const hasAccess = await checkAccess(req.user, custCheck.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to edit this customer' });

    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await log(req.user.name, `Customer updated: ${customer.company}`, customer.company, 'edit');
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
