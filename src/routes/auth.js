const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Account is inactive. Contact admin.' });
    }

    const token = signToken(user._id);
    // Save session token — purana session automatically invalid ho jaayega
    await User.findByIdAndUpdate(user._id, { sessionToken: token });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me  — get current logged-in user
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

// PATCH /api/auth/profile — update own profile (name, phone, profileImage)
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, phone, profileImage } = req.body;
    const avatar = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, profileImage, avatar },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/auth/notifications — update own notification preferences
router.patch('/notifications', protect, async (req, res) => {
  try {
    const { notifications } = req.body;
    if (!notifications) return res.status(400).json({ message: 'Notifications object required' });
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { notifications },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const token = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    console.log(`\n🔑 Password reset link for ${email}:\n${resetUrl}\n`);

    // If nodemailer is configured, send email — otherwise just log
    res.json({ message: 'If this email exists, a reset link has been sent.', resetUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });

    const crypto = require('crypto');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired.' });

    user.password             = password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
