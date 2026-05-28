const router = require('express').Router();
const User = require('../models/User');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

// GET /api/users — all users (admin+)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/team — non-super-admin users (for dropdowns)
router.get('/team', protect, async (req, res) => {
  try {
    const members = await User.find({ role: { $ne: 'Super Admin' } }).select('-password').lean();
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users — create user (admin+)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/users/:id — update user (admin+)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const data = { ...req.body };
    // Only hash password if it's being changed
    if (data.password) {
      const bcrypt = require('bcryptjs');
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      delete data.password;
    }
    if (data.name) {
      data.avatar = data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id — delete user (super admin only)
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'Super Admin') return res.status(403).json({ message: 'Cannot delete Super Admin' });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
