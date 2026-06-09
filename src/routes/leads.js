const router = require('express').Router();
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const FollowUp = require('../models/FollowUp');
const { protect } = require('../middleware/auth');

// Helper — log activity
const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

// GET /api/leads?search=&status=&assignedTo=&page=1&limit=500
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, assignedTo, page, limit } = req.query;
    const filter = {};

    // Role-based filter on backend
    if (req.user.role === 'Sales Executive') {
      filter.assignedTo = req.user.name;
    } else {
      if (status)     filter.status = status;
      if (assignedTo) filter.assignedTo = assignedTo;
    }
    if (search) filter.$text = { $search: search };

    const pageNum  = Number(page)  || 1;
    const limitNum = Math.min(Number(limit) || 500, 2000);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .select('name email phone company source status leadType assignedTo followUpDate value createdAt')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({ leads, total, page: pageNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leads
router.post('/', protect, async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body, createdBy: req.user._id });
    await log(req.user.name, `New lead added: ${lead.name}`, lead.name, 'add');
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/leads/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    // Lead edit restriction: Only Super Admin can modify details other than status & followUpDate
    if (req.user.role !== 'Super Admin') {
      const allowedKeys = ['status', 'followUpDate'];
      const updates = Object.keys(req.body);
      const isTryingToEditOtherFields = updates.some(key => !allowedKeys.includes(key));
      if (isTryingToEditOtherFields) {
        return res.status(403).json({ message: 'Only Super Admin is allowed to edit lead details' });
      }
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Specific activity messages
    if (req.body.status) {
      await log(req.user.name, `Status changed to "${req.body.status}" for ${lead.name}`, lead.name, 'edit');
    } else if (req.body.followUpDate) {
      await log(req.user.name, `Follow-up date updated for ${lead.name}`, lead.name, 'followup');
    } else {
      await log(req.user.name, `Lead updated: ${lead.name}`, lead.name, 'edit');
    }
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/leads/assign/bulk — assign multiple leads
router.patch('/assign/bulk', protect, async (req, res) => {
  try {
    const { ids, assignedTo, followUpDate } = req.body;
    if (!ids?.length || !assignedTo) return res.status(400).json({ message: 'ids and assignedTo required' });
    
    const updateData = { assignedTo };
    if (followUpDate) {
      updateData.followUpDate = followUpDate;
    }
    
    // Update leads
    await Lead.updateMany({ _id: { $in: ids } }, updateData);
    
    // Create FollowUp schedules if followUpDate is specified
    if (followUpDate) {
      const leadsList = await Lead.find({ _id: { $in: ids } }).lean();
      const followUpsToCreate = leadsList.map(l => ({
        lead: l.name,
        company: l.company || '',
        date: followUpDate,
        time: '10:00', // default time
        assignedTo,
        priority: 'Medium',
        status: 'Pending',
        leadRef: l._id,
        createdBy: req.user._id
      }));
      if (followUpsToCreate.length > 0) {
        await FollowUp.insertMany(followUpsToCreate);
      }
    }
    
    await log(req.user.name, `${ids.length} lead(s) assigned to ${assignedTo}`, assignedTo, 'assign');
    res.json({ message: `${ids.length} leads assigned to ${assignedTo}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/leads — bulk delete
router.delete('/', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids required' });
    await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} lead(s) deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/leads/:id/notes — add note to lead
router.patch('/:id/notes', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { $each: [{ text, time: new Date().toLocaleString() }], $position: 0 } } },
      { new: true }
    );
    await log(req.user.name, `Note added on lead: ${lead.name}`, lead.name, 'edit');
    res.json(lead.notes);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
