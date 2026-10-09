const router = require('express').Router();
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const checkLeadAccess = async (user, assignedTo) => {
  const adminRoles = ['Super Admin', 'Admin', 'Manager'];
  if (adminRoles.includes(user.role)) return true;
  
  const restrictRoles = ['Sales Executive', 'Sales Employee', 'Telecaller', 'Support'];
  if (restrictRoles.includes(user.role)) {
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

// Helper — log activity
const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

// GET /api/leads
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, assignedTo, page, limit } = req.query;
    const filter = {};

    // Data scoping logic based on roles
    const adminRoles = ['Super Admin', 'Admin', 'Manager'];
    const restrictRoles = ['Sales Executive', 'Sales Employee', 'Telecaller', 'Support'];
    
    if (restrictRoles.includes(req.user.role)) {
      filter.assignedTo = req.user.name;
    } else if (req.user.role === 'Team Leader') {
      const teamMembers = await User.find({ team: req.user.team }).select('name').lean();
      const memberNames = teamMembers.map(u => u.name);
      memberNames.push(req.user.name);
      filter.assignedTo = { $in: memberNames };
      if (status) filter.status = status;
      if (assignedTo && memberNames.includes(assignedTo)) filter.assignedTo = assignedTo;
    } else {
      if (status)     filter.status = status;
      if (assignedTo) filter.assignedTo = assignedTo;
    }
    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { phone:   { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, Number(page) || 1);
    const limitNum = limit !== undefined ? Number(limit) : 2000;

    let query = Lead.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [leads, total] = await Promise.all([
      query.exec(),
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

    const hasAccess = await checkLeadAccess(req.user, lead.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to view this lead' });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leads
router.post('/', protect, async (req, res) => {
  try {
    const { email, phone, status, lostReason } = req.body;

    const orConditions = [];
    if (email && email.trim() !== '') orConditions.push({ email: email.toLowerCase() });
    if (phone && phone.trim() !== '') orConditions.push({ phone });
    
    if (orConditions.length > 0) {
      const existing = await Lead.findOne({ $or: orConditions });
      if (existing) return res.status(400).json({ message: 'Lead with this email or phone already exists.' });
    }

    if (status === 'Lost' && !lostReason) {
      return res.status(400).json({ message: 'Lost Reason is mandatory when status is Lost.' });
    }

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
    const leadCheck = await Lead.findById(req.params.id).lean();
    if (!leadCheck) return res.status(404).json({ message: 'Lead not found' });

    const hasAccess = await checkLeadAccess(req.user, leadCheck.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to edit this lead' });

    if (req.body.status === 'Lost') {
      const reason = req.body.lostReason || leadCheck.lostReason;
      if (!reason) return res.status(400).json({ message: 'Lost Reason is mandatory when marking a lead as Lost.' });
    }

    if (!['Super Admin', 'Admin', 'Manager'].includes(req.user.role)) {
      const allowedKeys = ['status', 'followUpDate', 'lostReason'];
      const updates = Object.keys(req.body);
      const isTryingToEditOtherFields = updates.some(key => !allowedKeys.includes(key));
      if (isTryingToEditOtherFields) {
        return res.status(403).json({ message: 'Only Admins/Managers are allowed to edit core lead details' });
      }
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (req.body.status) {
      await log(req.user.name, `Status changed to "${req.body.status}" for ${lead.name}`, lead.name, 'edit');
      if (lead.assignedTo && lead.assignedTo !== req.user.name) {
        const assignedUser = await User.findOne({ name: lead.assignedTo }).lean();
        if (assignedUser && assignedUser.fcmToken) {
          const { sendPushNotification } = require('../utils/firebase');
          await sendPushNotification(
            assignedUser.fcmToken,
            'Lead Status Updated',
            `${req.user.name} changed status of ${lead.name} to ${req.body.status}`,
            { url: `/leads/${lead._id}` }
          );
        }
      }
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

// PATCH /api/leads/assign/bulk
router.patch('/assign/bulk', protect, async (req, res) => {
  try {
    const { ids, assignedTo, followUpDate } = req.body;
    if (!ids?.length || !assignedTo) return res.status(400).json({ message: 'ids and assignedTo required' });

    // Only assign leads that are NOT already assigned
    const eligibleLeads = await Lead.find({ _id: { $in: ids }, assignedTo: { $in: [null, '', undefined] } }).lean();
    const eligibleIds = eligibleLeads.map(l => l._id);
    if (!eligibleIds.length) return res.status(400).json({ message: 'All selected leads are already assigned or do not exist' });

    // Authorization: only Admin/Manager/Team Leader can bulk assign
    if (!['Super Admin', 'Admin', 'Manager', 'Team Leader'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to assign leads' });
    }

    const updateData = { assignedTo };
    if (followUpDate) updateData.followUpDate = followUpDate;

    await Lead.updateMany({ _id: { $in: eligibleIds } }, updateData);

    if (followUpDate) {
      const followUpsToCreate = eligibleLeads.map(l => ({
        lead: l.name, company: l.company || '', date: followUpDate,
        time: '10:00', assignedTo, priority: 'Medium', status: 'Pending',
        leadRef: l._id, createdBy: req.user._id
      }));
      if (followUpsToCreate.length > 0) await FollowUp.insertMany(followUpsToCreate);
    }

    await log(req.user.name, `${eligibleIds.length} lead(s) assigned to ${assignedTo}`, assignedTo, 'assign');

    // Real-time Push & Socket Notification to assigned user
    const io = req.app.get('io');
    if (io) {
      io.emit('lead_assigned', {
        assignedTo,
        assignedBy: req.user.name,
        count: eligibleIds.length,
        leadNames: eligibleLeads.map(l => l.name).slice(0, 3),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    // FCM Push Notification
    const assignedUser = await User.findOne({ name: assignedTo }).lean();
    if (assignedUser && assignedUser.fcmToken) {
      const { sendPushNotification } = require('../utils/firebase');
      const title = 'New Leads Assigned';
      const body = `You have been assigned ${eligibleIds.length} new lead(s) by ${req.user.name}.`;
      await sendPushNotification(assignedUser.fcmToken, title, body, { url: '/leads' });
    }

    res.json({ message: `${eligibleIds.length} leads assigned to ${assignedTo}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/leads
router.delete('/', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids required' });

    if (!['Super Admin', 'Admin', 'Manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only Admins/Managers can delete leads' });
    }

    await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} lead(s) deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/leads/:id/notes
router.patch('/:id/notes', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const leadCheck = await Lead.findById(req.params.id).lean();
    if (!leadCheck) return res.status(404).json({ message: 'Lead not found' });

    const hasAccess = await checkLeadAccess(req.user, leadCheck.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to add notes to this lead' });

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

// POST /api/leads/:id/convert-opportunity
router.post('/:id/convert-opportunity', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const hasAccess = await checkLeadAccess(req.user, lead.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to convert this lead' });

    const Opportunity = require('../models/Opportunity');
    const existing = await Opportunity.findOne({ leadId: lead._id });
    if (existing) return res.status(400).json({ message: 'Opportunity already exists for this lead' });

    const opp = await Opportunity.create({
      leadId: lead._id,
      name: lead.name,
      company: lead.company,
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      stage: 'Qualified',
      assignedTo: lead.assignedTo,
      createdBy: req.user._id
    });

    await log(req.user.name, `Lead ${lead.name} converted to Opportunity`, lead.name, 'add');
    res.status(201).json(opp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/leads/:id/email
router.post('/:id/email', protect, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!lead.email) return res.status(400).json({ message: 'Lead has no email address' });

    const hasAccess = await checkLeadAccess(req.user, lead.assignedTo);
    if (!hasAccess) return res.status(403).json({ message: 'Not authorized to communicate with this lead' });

    const sendEmail = require('../utils/sendEmail');
    await sendEmail({
      email: lead.email,
      subject: subject,
      message: message,
      html: `<div style="font-family: Arial, sans-serif;">${message.replace(/\n/g, '<br>')}</div>`
    });

    await log(req.user.name, `Email sent to ${lead.email}: "${subject}"`, lead.name, 'edit');
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
