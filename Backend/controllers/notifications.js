const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const unreadOnly = req.query.unread === 'true';
    const type = req.query.type;

    // Build query
    let query = { recipient: req.user._id };

    if (unreadOnly) {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName email avatar')
      .populate('relatedOrder', 'orderNumber status')
      .populate('relatedRoute', 'name status')
      .populate('relatedVehicle', 'registrationNumber make model')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      read: false 
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    next(error);
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
const getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email')
      .populate('relatedOrder', 'orderNumber status priority')
      .populate('relatedRoute', 'name status')
      .populate('relatedVehicle', 'registrationNumber make model');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check authorization - user can only access their own notifications
    if (notification.recipient._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification'
      });
    }

    // Mark as read if not already read
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Get notification error:', error);
    next(error);
  }
};

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private (Admin only)
const createNotification = async (req, res, next) => {
  try {
    // Set sender as current user
    req.body.sender = req.user._id;

    const notification = await Notification.create(req.body);

    // Populate the created notification
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email');

    // TODO: Send real-time notification via WebSocket/Socket.io
    // TODO: Send push notification if enabled
    // TODO: Send email notification if enabled

    logger.info(`Notification created: ${notification.title} for ${populatedNotification.recipient.email} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: populatedNotification
    });
  } catch (error) {
    logger.error('Create notification error:', error);
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check authorization
    if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    next(error);
  }
};

// @desc    Mark notification as unread
// @route   PUT /api/notifications/:id/unread
// @access  Private
const markAsUnread = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check authorization
    if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    notification.read = false;
    notification.readAt = null;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
      data: notification
    });
  } catch (error) {
    logger.error('Mark notification as unread error:', error);
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { 
        $set: { 
          read: true, 
          readAt: new Date() 
        } 
      }
    );

    logger.info(`${result.modifiedCount} notifications marked as read for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check authorization
    if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await notification.remove();

    logger.info(`Notification deleted: ${notification.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    next(error);
  }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
const deleteAllRead = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      read: true
    });

    logger.info(`${result.deletedCount} read notifications deleted for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`
    });
  } catch (error) {
    logger.error('Delete all read notifications error:', error);
    next(error);
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { recipient: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$read', false] }, 1, 0]
            }
          },
          byType: {
            $push: {
              type: '$type',
              priority: '$priority',
              read: '$read'
            }
          }
        }
      }
    ]);

    // Group by type and priority
    const typeStats = {};
    const priorityStats = {};

    if (stats.length > 0) {
      stats[0].byType.forEach(item => {
        // Type statistics
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0 };
        }
        typeStats[item.type].total++;
        if (!item.read) typeStats[item.type].unread++;

        // Priority statistics
        if (!priorityStats[item.priority]) {
          priorityStats[item.priority] = { total: 0, unread: 0 };
        }
        priorityStats[item.priority].total++;
        if (!item.read) priorityStats[item.priority].unread++;
      });
    }

    const result = {
      total: stats.length > 0 ? stats[0].total : 0,
      unread: stats.length > 0 ? stats[0].unread : 0,
      read: stats.length > 0 ? stats[0].total - stats[0].unread : 0,
      byType: typeStats,
      byPriority: priorityStats
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get notification stats error:', error);
    next(error);
  }
};

module.exports = {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationStats
};
