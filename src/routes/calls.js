const router = require('express').Router();
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Lead = require('../models/Lead');
const CallRecording = require('../models/CallRecording');
const Activity = require('../models/Activity');

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const backendUrl = process.env.BACKEND_URL;

const getTwilioClient = () => {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured in environment.');
  }
  return twilio(accountSid, authToken);
};

// Helper to format phone number to E.164
const formatPhone = (num) => {
  if (!num) return '';
  let clean = num.replace(/[^0-9+]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.length === 10) {
      clean = '+91' + clean;
    } else if (clean.length === 12 && clean.startsWith('91')) {
      clean = '+' + clean;
    }
  }
  return clean;
};

// POST /api/calls/make-call — Make a double-call to agent then lead
router.post('/make-call', protect, async (req, res) => {
  try {
    const { leadId, phone } = req.body;
    if (!leadId || !phone) {
      return res.status(400).json({ message: 'leadId and phone are required' });
    }

    const agent = await User.findById(req.user._id);
    if (!agent || !agent.phone) {
      return res.status(400).json({ message: 'Please set your phone number in your Profile/Settings first' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const agentPhone = formatPhone(agent.phone);
    const leadPhone = formatPhone(phone);

    const client = getTwilioClient();
    
    // Call the agent first. When they pick up, Twilio hits /connect-lead webhook.
    const call = await client.calls.create({
      url: `${backendUrl}/api/calls/connect-lead?leadPhone=${encodeURIComponent(leadPhone)}&leadId=${leadId}&agentId=${agent._id.toString()}`,
      to: agentPhone,
      from: twilioNumber,
      record: false, // Don't record this first leg itself
    });

    res.json({ success: true, callSid: call.sid, message: 'Initiating call. Your phone will ring shortly.' });
  } catch (err) {
    console.error('Twilio make-call failed:', err);
    res.status(500).json({ message: err.message || 'Failed to initiate call' });
  }
});

// POST /api/calls/connect-lead — Webhook for Twilio to connect agent to lead
router.post('/connect-lead', (req, res) => {
  const { leadPhone, leadId, agentId } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({
    record: 'record-from-answer-dual', // Record both sides once connected
    recordingStatusCallback: `${backendUrl}/api/calls/recording-callback?leadId=${leadId}&agentId=${agentId}&phone=${encodeURIComponent(leadPhone)}`,
    recordingStatusCallbackMethod: 'POST'
  });
  dial.number(leadPhone);

  res.type('text/xml');
  res.send(twiml.toString());
});

// Helper function to download file from https URL to a path
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // delete local file
      reject(err);
    });
  });
};

// POST /api/calls/recording-callback — Webhook for Twilio to send recording details
router.post('/recording-callback', async (req, res) => {
  try {
    const { leadId, agentId, phone } = req.query;
    const { RecordingUrl, RecordingDuration } = req.body;

    if (!RecordingUrl || !leadId || !agentId) {
      console.warn('Incomplete recording callback parameters:', { RecordingUrl, leadId, agentId });
      return res.status(400).send('Incomplete parameters');
    }

    const duration = Number(RecordingDuration) || 0;
    const filename = `call-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp3`;
    const recordingsDir = path.join(__dirname, '../../uploads/recordings');
    
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    const filePath = path.join(recordingsDir, filename);

    // Download the recording from Twilio (append .mp3 to download mp3 instead of default wav)
    await downloadFile(`${RecordingUrl}.mp3`, filePath);

    const url = `/uploads/recordings/${filename}`;

    // Save Call Recording record
    const rec = await CallRecording.create({
      leadId,
      calledBy: agentId,
      phone,
      duration,
      filename,
      url,
    });

    // Create activity log
    const agent = await User.findById(agentId);
    const lead = await Lead.findById(leadId);
    if (agent && lead) {
      await Activity.create({
        user: agent.name,
        action: `Completed a call (${Math.round(duration)}s)`,
        lead: lead.name,
        type: 'edit',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
    }

    console.log('Twilio Call Recording saved successfully:', rec._id);
    res.status(200).send('Success');
  } catch (err) {
    console.error('Failed to handle Twilio recording callback:', err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
