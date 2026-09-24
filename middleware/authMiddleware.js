const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      req.user = await User.findById(decoded.id).select('-password');

      // User no longer exists
      if (!req.user) {
        return res.status(401).json({
          message: 'User not found',
        });
      }

      next();
      return;
    } catch (error) {
      console.error('Authentication error:', error.message);

      return res.status(401).json({
        message: 'Not authorized, token failed',
      });
    }
  }

  return res.status(401).json({
    message: 'Not authorized, no token',
  });
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
    return;
  }

  return res.status(403).json({
    message: 'Not authorized as an admin',
  });
};

module.exports = {
  protect,
  admin,
};