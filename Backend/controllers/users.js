const User = require('../models/User');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;
    const role = req.query.role;
    const isActive = req.query.isActive;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    logger.info(`User created by admin: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    logger.error('Create user error:', error);
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User updated by admin: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Soft delete - deactivate instead of removing
    user.isActive = false;
    await user.save();

    logger.info(`User deactivated by admin: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

// @desc    Upload avatar
// @route   PUT /api/users/:id/avatar
// @access  Private (Admin)
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      // Remove uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove old avatar if exists
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Set new avatar path (relative to uploads folder)
    const avatarPath = req.file.path.replace(/\\/g, '/').split('/uploads/')[1];
    user.avatar = `/uploads/${avatarPath}`;
    await user.save();

    logger.info(`Avatar uploaded for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    // Remove uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Upload avatar error:', error);
    next(error);
  }
};

// @desc    Get drivers
// @route   GET /api/users/drivers
// @access  Private
const getDrivers = async (req, res, next) => {
  try {
    const drivers = await User.find({ 
      role: 'driver',
      isActive: true
    }).select('firstName lastName email phone avatar ratings profile.experience profile.vehicleType profile.licenseNumber');

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    logger.error('Get drivers error:', error);
    next(error);
  }
};

// @desc    Get fleet managers
// @route   GET /api/users/fleet-managers
// @access  Private
const getFleetManagers = async (req, res, next) => {
  try {
    const fleetManagers = await User.find({ 
      role: 'fleet-manager',
      isActive: true
    })
    .populate('profile.managedDrivers', 'firstName lastName email')
    .select('firstName lastName email phone avatar ratings profile.fleetSize profile.managedDrivers');

    res.status(200).json({
      success: true,
      count: fleetManagers.length,
      data: fleetManagers
    });
  } catch (error) {
    logger.error('Get fleet managers error:', error);
    next(error);
  }
};

// @desc    Get business users (producers, wholesalers, retailers)
// @route   GET /api/users/business-users
// @access  Private
const getBusinessUsers = async (req, res, next) => {
  try {
    const businessUsers = await User.find({ 
      role: { $in: ['producer', 'wholesaler', 'retailer'] },
      isActive: true
    }).select('firstName lastName email phone avatar role ratings profile.businessName profile.businessType profile.businessAddress');

    res.status(200).json({
      success: true,
      count: businessUsers.length,
      data: businessUsers
    });
  } catch (error) {
    logger.error('Get business users error:', error);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  getDrivers,
  getFleetManagers,
  getBusinessUsers
};
