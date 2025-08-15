const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  assignOrder,
  cancelOrder,
  addNote,
  getOrderTracking
} = require('../controllers/orders');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route for order tracking (with tracking number)
router.get('/:id/tracking', getOrderTracking);

// Protect all other routes
router.use(protect);

// Main order routes
router
  .route('/')
  .get(getOrders)
  .post(createOrder);

router
  .route('/:id')
  .get(getOrder)
  .put(updateOrder)
  .delete(authorize('admin'), deleteOrder);

// Specialized order routes
router.put('/:id/status', updateOrderStatus);
router.put('/:id/assign', authorize('admin', 'fleet-manager'), assignOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/notes', addNote);

module.exports = router;
