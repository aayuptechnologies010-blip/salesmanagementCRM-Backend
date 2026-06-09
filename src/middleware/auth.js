const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Session check — agar token DB ke sessionToken se match nahi karta
    if (user.sessionToken !== token) {
      return res.status(401).json({ message: 'SESSION_EXPIRED', code: 'SESSION_EXPIRED' });
    }

    req.user = user.toJSON ? user.toJSON() : user;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role === 'Super Admin' || req.user.role === 'Admin') return next();
  res.status(403).json({ message: 'Admin access required' });
};

const superAdminOnly = (req, res, next) => {
  if (req.user.role === 'Super Admin') return next();
  res.status(403).json({ message: 'Super Admin access required' });
};

module.exports = { protect, adminOnly, superAdminOnly };
