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

    req.user = user.toJSON ? user.toJSON() : user;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const adminOnly = (req, res, next) => {
  if (['Super Admin', 'Admin', 'Manager'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Admin/Manager access required' });
};

const superAdminOnly = (req, res, next) => {
  if (req.user.role === 'Super Admin') return next();
  res.status(403).json({ message: 'Super Admin access required' });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: `Access restricted. Required roles: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = { protect, adminOnly, superAdminOnly, authorizeRoles };
