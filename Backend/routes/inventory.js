const express = require('express');
const {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addMovement,
  reserveStock,
  releaseReservedStock,
  updatePrice,
  getLowStockItems,
  getExpiringItems,
  checkAlerts,
  getInventoryAnalytics
} = require('../controllers/inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special inventory routes (should come before /:id)
router.get('/low-stock', getLowStockItems);
router.get('/expiring', getExpiringItems);
router.get('/analytics', getInventoryAnalytics);

// Main inventory routes
router
  .route('/')
  .get(getInventoryItems)
  .post(createInventoryItem);

router
  .route('/:id')
  .get(getInventoryItem)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

// Specialized inventory routes
router.post('/:id/movements', addMovement);
router.post('/:id/reserve', reserveStock);
router.post('/:id/release', releaseReservedStock);
router.put('/:id/price', updatePrice);
router.get('/:id/alerts', checkAlerts);

module.exports = router;
