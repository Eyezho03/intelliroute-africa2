const express = require('express');
const {
  getRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  startRoute,
  completeRoute,
  updateLocation,
  updateWaypointStatus,
  addWaypoint,
  addNotification,
  optimizeRoute,
  getRouteAnalytics
} = require('../controllers/routes');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Main route routes
router
  .route('/')
  .get(getRoutes)
  .post(createRoute);

router
  .route('/:id')
  .get(getRoute)
  .put(updateRoute)
  .delete(deleteRoute);

// Specialized route routes
router.put('/:id/start', startRoute);
router.put('/:id/complete', completeRoute);
router.put('/:id/location', updateLocation);
router.put('/:id/waypoints/:waypointId', updateWaypointStatus);
router.post('/:id/waypoints', addWaypoint);
router.post('/:id/notifications', addNotification);
router.post('/:id/optimize', authorize('admin', 'fleet-manager'), optimizeRoute);
router.get('/:id/analytics', getRouteAnalytics);

module.exports = router;
