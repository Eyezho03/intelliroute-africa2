const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account has been deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user owns the resource or is admin
const checkOwnership = (Model, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params[resourceIdParam]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Allow admin access or ownership
      if (req.user.role === 'admin' || resource.user?.toString() === req.user._id.toString()) {
        req.resource = resource;
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }
    } catch (error) {
      logger.error('Ownership check error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

module.exports = {
  protect,
  authorize,
  checkOwnership
};
