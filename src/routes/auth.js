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

module.exports = router;
