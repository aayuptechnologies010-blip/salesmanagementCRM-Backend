const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, adminOnly } = require('../middleware/auth');
const CallRecording = require('../models/CallRecording');

// Recordings folder
const recordingsDir = path.join(__dirname, '../../uploads/recordings');
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, recordingsDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const allowed = /webm|ogg|mp4|wav|mp3/;
    allowed.test(path.extname(file.originalname).toLowerCase()) || allowed.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only audio files allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// POST /api/recordings — save a call recording
router.post('/', protect, upload.single('recording'), async (req, res) => {
  try {
    const { leadId, phone, duration } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No recording file uploaded' });

    const url = `/uploads/recordings/${req.file.filename}`;
    const rec = await CallRecording.create({
      leadId,
      calledBy: req.user._id,
      phone,
      duration: Number(duration) || 0,
      filename: req.file.filename,
      url,
    });

    const populated = await rec.populate('calledBy', 'name avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/recordings/:leadId — get all recordings for a lead
router.get('/:leadId', protect, async (req, res) => {
  try {
    const recordings = await CallRecording.find({ leadId: req.params.leadId })
      .populate('calledBy', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/recordings/:id — delete a call recording (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const rec = await CallRecording.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recording not found' });

    // Delete the physical file from uploads/recordings
    const filePath = path.join(__dirname, '../../uploads/recordings', rec.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete physical recording file:', e);
      }
    }

    await CallRecording.findByIdAndDelete(req.params.id);
    res.json({ message: 'Recording deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
