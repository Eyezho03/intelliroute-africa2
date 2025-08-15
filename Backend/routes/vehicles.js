const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignDriver,
  updateLocation,
  addMaintenanceRecord,
  getAvailableVehicles,
  getVehicleMetrics
} = require('../controllers/vehicles');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Available vehicles route (should come before /:id)
router.get('/available', getAvailableVehicles);

// Main vehicle routes
router
  .route('/')
  .get(getVehicles)
  .post(createVehicle);

router
  .route('/:id')
  .get(getVehicle)
  .put(updateVehicle)
  .delete(deleteVehicle);

// Specialized vehicle routes
router.put('/:id/assign-driver', authorize('admin', 'fleet-manager'), assignDriver);
router.put('/:id/location', updateLocation);
router.post('/:id/maintenance', addMaintenanceRecord);
router.get('/:id/metrics', getVehicleMetrics);

module.exports = router;
