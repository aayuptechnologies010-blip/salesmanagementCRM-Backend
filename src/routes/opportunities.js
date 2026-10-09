const router = require('express').Router();
const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

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

// GET /api/opportunities
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

    const opps = await Opportunity.find(filter).sort({ createdAt: -1 }).lean();
    res.json(opps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/opportunities/:id/convert-customer
router.post('/:id/convert-customer', protect, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    const hasAccess = await checkAccess(req.user, opp.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to convert this opportunity' });

    if (opp.stage !== 'Won') {
      return res.status(400).json({ message: 'Opportunity must be Won before converting to Customer' });
    }

    // Check if customer already exists for this opportunity
    const existing = await Customer.findOne({ opportunityId: opp._id });
    if (existing) return res.status(400).json({ message: 'Customer already exists for this Opportunity' });

    const customer = await Customer.create({
      opportunityId: opp._id,
      leadId: opp.leadId,
      name: opp.contactPerson || opp.name,
      company: opp.company || opp.name,
      email: opp.email,
      phone: opp.phone,
      contractValue: opp.value,
      assignedTo: opp.assignedTo,
      createdBy: req.user._id
    });

    await log(req.user.name, `Opportunity ${opp.name} converted to Customer`, opp.name, 'add');
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/opportunities/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const oppCheck = await Opportunity.findById(req.params.id).lean();
    if (!oppCheck) return res.status(404).json({ message: 'Opportunity not found' });

    const hasAccess = await checkAccess(req.user, oppCheck.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to edit this opportunity' });

    const opp = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await log(req.user.name, `Opportunity updated: ${opp.name}`, opp.name, 'edit');
    res.json(opp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
