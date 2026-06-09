const router = require('express').Router();
const User = require('../models/User');
const Lead = require('../models/Lead');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

// GET /api/users — all users with lead stats (admin+)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [leads, converted] = await Promise.all([
        Lead.countDocuments({ assignedTo: u.name, status: { $ne: 'New' } }),
        Lead.countDocuments({ assignedTo: u.name, status: 'Won' }),
      ]);
      return { ...u, leadsCount: leads, convertedCount: converted };
    }));
    res.json(usersWithStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/team — non-super-admin users with lead stats
router.get('/team', protect, async (req, res) => {
  try {
    const members = await User.find({ role: { $ne: 'Super Admin' } }).select('-password').lean();
    const withStats = await Promise.all(members.map(async (u) => {
      const [leads, converted] = await Promise.all([
        Lead.countDocuments({ assignedTo: u.name, status: { $ne: 'New' } }),
        Lead.countDocuments({ assignedTo: u.name, status: 'Won' }),
      ]);
      return { ...u, leadsCount: leads, convertedCount: converted };
    }));
    res.json(withStats);
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

// POST /api/users/superadmin — create a new Super Admin (public setup)
router.post('/superadmin', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,       // pre-save hook will hash this automatically
      role: 'Super Admin',
      team: '-',
      avatar,
      status: 'Active'
    });

    res.status(201).json({
      message: 'Super Admin created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt
      }
    });
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
