const express = require('express');
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationStats
} = require('../controllers/notifications');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special notification routes (should come before /:id)
router.get('/stats', getNotificationStats);
router.put('/mark-all-read', markAllAsRead);
router.delete('/read', deleteAllRead);

// Main notification routes
router
  .route('/')
  .get(getNotifications)
  .post(authorize('admin', 'fleet-manager'), createNotification);

router
  .route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

// Specialized notification routes
router.put('/:id/read', markAsRead);
router.put('/:id/unread', markAsUnread);

module.exports = router;
