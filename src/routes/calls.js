const router = require('express').Router();
const { protect } = require('../middleware/auth');
const CallRecording = require('../models/CallRecording');
const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const User = require('../models/User');
const maskCallingService = require('../utils/maskCallingService');

// POST /api/calls/initiate
router.post('/initiate', protect, async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ message: 'Lead ID required' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!lead.phone) return res.status(400).json({ message: 'Lead does not have a valid phone number' });

    const agent = await User.findById(req.user._id);
    if (!agent.phone) return res.status(400).json({ message: 'Your profile does not have a phone number configured. Please update your profile.' });

    const callResult = await maskCallingService.initiateCall(agent.phone, lead.phone, lead._id);

    await Activity.create({
      user: agent.name,
      action: `Initiated masked call to ${lead.contactPerson || lead.name}`,
      lead: lead.name,
      type: 'edit',
      time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: callResult.message, callId: callResult.callId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/calls/webhook
router.post('/webhook', async (req, res) => {
  try {
    const { CallSid, RecordingUrl, DialCallDuration, CustomField } = req.body;

    if (RecordingUrl && CustomField) {
      const lead = await Lead.findById(CustomField);
      if (lead) {
        let agentId = null;
        if (lead.assignedTo) {
          const u = await User.findOne({ name: lead.assignedTo });
          if (u) agentId = u._id;
        }

        await CallRecording.create({
          leadId: lead._id,
          calledBy: agentId, // Optional reference
          phone: 'MASKED_NUMBER',
          duration: parseInt(DialCallDuration) || 0,
          filename: `Call_${CallSid || Date.now()}.mp3`,
          url: RecordingUrl
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

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
