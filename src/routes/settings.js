const router = require('express').Router();
const Setting = require('../models/Setting');
const { protect, superAdminOnly } = require('../middleware/auth');

// Helper to get global settings, create if it doesn't exist
const getSettings = async () => {
  let settings = await Setting.findOne({ isGlobal: true });
  if (!settings) {
    settings = await Setting.create({ isGlobal: true });
  }
  return settings;
};

// GET /api/settings/permissions — fetch role permissions
router.get('/permissions', protect, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings.rolePermissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/settings/permissions — update role permissions (Super Admin only)
router.patch('/permissions', protect, superAdminOnly, async (req, res) => {
  try {
    const { rolePermissions } = req.body;
    if (!rolePermissions) {
      return res.status(400).json({ message: 'rolePermissions object required' });
    }

    const settings = await getSettings();
    settings.rolePermissions = rolePermissions;
    await settings.save();
    
    res.json(settings.rolePermissions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
