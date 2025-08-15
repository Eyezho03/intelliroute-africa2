const Route = require('../models/Route');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get all routes
// @route   GET /api/routes
// @access  Private
const getRoutes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;
    const status = req.query.status;
    const priority = req.query.priority;
    const driverId = req.query.driver;

    // Build query
    let query = {};

    // Role-based filtering
    if (req.user.role === 'driver') {
      query.assignedDriver = req.user._id;
    } else if (req.user.role === 'fleet-manager') {
      // Get managed drivers
      const managedDrivers = req.user.profile?.managedDrivers || [];
      query.$or = [
        { assignedDriver: { $in: managedDrivers } },
        { createdBy: req.user._id }
      ];
    } else if (req.user.role !== 'admin') {
      query.createdBy = req.user._id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by driver
    if (driverId) {
      query.assignedDriver = driverId;
    }

    const skip = (page - 1) * limit;

    const routes = await Route.find(query)
      .populate('createdBy', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('assignedVehicle', 'registrationNumber type make model')
      .populate('orders', 'orderNumber status priority')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Route.countDocuments(query);

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get routes error:', error);
    next(error);
  }
};

// @desc    Get single route
// @route   GET /api/routes/:id
// @access  Private
const getRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName email phone avatar ratings')
      .populate('assignedVehicle', 'registrationNumber type make model capacity')
      .populate('orders', 'orderNumber status priority pickup.location.address delivery.location.address')
      .populate('attachments.uploadedBy', 'firstName lastName');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canAccess = (
      req.user.role === 'admin' ||
      route.createdBy._id.toString() === req.user._id.toString() ||
      route.assignedDriver?._id.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager' && req.user.profile?.managedDrivers?.includes(route.assignedDriver?._id))
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    logger.error('Get route error:', error);
    next(error);
  }
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Private
const createRoute = async (req, res, next) => {
  try {
    // Set creator as current user
    req.body.createdBy = req.user._id;

    const route = await Route.create(req.body);

    // Populate the created route
    const populatedRoute = await Route.findById(route._id)
      .populate('createdBy', 'firstName lastName email phone')
      .populate('orders', 'orderNumber status');

    logger.info(`New route created: ${route.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: populatedRoute
    });
  } catch (error) {
    logger.error('Create route error:', error);
    next(error);
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private
const updateRoute = async (req, res, next) => {
  try {
    let route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      route.createdBy.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this route'
      });
    }

    // Prevent updating route if it's in progress
    if (route.status === 'in-progress' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update route that is in progress'
      });
    }

    route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('assignedVehicle', 'registrationNumber type');

    logger.info(`Route updated: ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      data: route
    });
  } catch (error) {
    logger.error('Update route error:', error);
    next(error);
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private
const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canDelete = (
      req.user.role === 'admin' ||
      route.createdBy.toString() === req.user._id.toString()
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this route'
      });
    }

    // Only allow deletion of draft or cancelled routes
    if (!['draft', 'cancelled'].includes(route.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete route that is not in draft or cancelled status'
      });
    }

    await route.remove();

    logger.info(`Route deleted: ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    logger.error('Delete route error:', error);
    next(error);
  }
};

// @desc    Start route
// @route   PUT /api/routes/:id/start
// @access  Private (Driver)
const startRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization - only assigned driver or admin can start route
    if (route.assignedDriver?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this route'
      });
    }

    // Check if route can be started
    if (route.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: 'Route must be in assigned status to start'
      });
    }

    await route.startRoute();

    // Update vehicle status
    if (route.assignedVehicle) {
      const vehicle = await Vehicle.findById(route.assignedVehicle);
      if (vehicle) {
        vehicle.status = 'in-transit';
        await vehicle.save();
      }
    }

    logger.info(`Route started: ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Route started successfully',
      data: route
    });
  } catch (error) {
    logger.error('Start route error:', error);
    next(error);
  }
};

// @desc    Complete route
// @route   PUT /api/routes/:id/complete
// @access  Private (Driver)
const completeRoute = async (req, res, next) => {
  try {
    const { notes, issues } = req.body;
    
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization - only assigned driver or admin can complete route
    if (route.assignedDriver?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this route'
      });
    }

    // Check if route can be completed
    if (route.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Route must be in progress to complete'
      });
    }

    await route.completeRoute(notes, issues || []);

    // Update vehicle status back to available
    if (route.assignedVehicle) {
      const vehicle = await Vehicle.findById(route.assignedVehicle);
      if (vehicle) {
        vehicle.status = 'available';
        // Update vehicle metrics
        vehicle.metrics.totalTrips += 1;
        if (route.metrics.actualDistance) {
          vehicle.metrics.totalDistance += route.metrics.actualDistance;
        }
        if (route.metrics.fuelConsumed) {
          vehicle.metrics.totalFuelConsumed += route.metrics.fuelConsumed;
        }
        await vehicle.save();
      }
    }

    logger.info(`Route completed: ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Route completed successfully',
      data: route
    });
  } catch (error) {
    logger.error('Complete route error:', error);
    next(error);
  }
};

// @desc    Update route location
// @route   PUT /api/routes/:id/location
// @access  Private (Driver)
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body;
    
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization - only assigned driver can update location
    if (route.assignedDriver?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this route location'
      });
    }

    await route.updateCurrentLocation(lat, lng, address);

    res.status(200).json({
      success: true,
      message: 'Route location updated successfully',
      data: {
        currentLocation: route.tracking.currentLocation,
        path: route.tracking.path
      }
    });
  } catch (error) {
    logger.error('Update route location error:', error);
    next(error);
  }
};

// @desc    Update waypoint status
// @route   PUT /api/routes/:id/waypoints/:waypointId
// @access  Private (Driver)
const updateWaypointStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { waypointId } = req.params;
    
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization - only assigned driver can update waypoint status
    if (route.assignedDriver?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this waypoint status'
      });
    }

    await route.updateWaypointStatus(waypointId, status);

    logger.info(`Waypoint status updated in route ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Waypoint status updated successfully',
      data: route
    });
  } catch (error) {
    logger.error('Update waypoint status error:', error);
    next(error);
  }
};

// @desc    Add waypoint to route
// @route   POST /api/routes/:id/waypoints
// @access  Private
const addWaypoint = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canAdd = (
      req.user.role === 'admin' ||
      route.createdBy.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canAdd) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add waypoint to this route'
      });
    }

    // Prevent adding waypoints to routes in progress
    if (route.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add waypoints to route in progress'
      });
    }

    await route.addWaypoint(req.body);

    logger.info(`Waypoint added to route ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Waypoint added successfully',
      data: route
    });
  } catch (error) {
    logger.error('Add waypoint error:', error);
    next(error);
  }
};

// @desc    Add notification to route
// @route   POST /api/routes/:id/notifications
// @access  Private
const addNotification = async (req, res, next) => {
  try {
    const { type, message } = req.body;
    
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    await route.addNotification(type, message);

    logger.info(`Notification added to route ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Notification added successfully',
      data: route
    });
  } catch (error) {
    logger.error('Add notification error:', error);
    next(error);
  }
};

// @desc    Optimize route
// @route   POST /api/routes/:id/optimize
// @access  Private
const optimizeRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id).populate('orders');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canOptimize = (
      req.user.role === 'admin' ||
      route.createdBy.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canOptimize) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to optimize this route'
      });
    }

    // Simple optimization algorithm (can be enhanced with external services)
    const optimizedWaypoints = optimizeWaypoints(route.waypoints);
    const { totalDistance, estimatedDuration, estimatedFuelCost } = calculateRouteMetrics(optimizedWaypoints);

    route.waypoints = optimizedWaypoints;
    route.optimization.totalDistance = totalDistance;
    route.optimization.estimatedDuration = estimatedDuration;
    route.optimization.estimatedFuelCost = estimatedFuelCost;

    await route.save();

    logger.info(`Route optimized: ${route.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Route optimized successfully',
      data: route
    });
  } catch (error) {
    logger.error('Optimize route error:', error);
    next(error);
  }
};

// @desc    Get route analytics
// @route   GET /api/routes/:id/analytics
// @access  Private
const getRouteAnalytics = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('assignedDriver', 'firstName lastName')
      .populate('assignedVehicle', 'registrationNumber type make model');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    const canView = (
      req.user.role === 'admin' ||
      route.createdBy.toString() === req.user._id.toString() ||
      route.assignedDriver?.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this route analytics'
      });
    }

    const analytics = {
      basic: {
        status: route.status,
        priority: route.priority,
        progress: route.progress,
        currentDelay: route.currentDelay
      },
      optimization: route.optimization,
      metrics: route.metrics,
      waypoints: {
        total: route.waypoints.length,
        completed: route.waypoints.filter(w => w.status === 'completed').length,
        pending: route.waypoints.filter(w => w.status === 'pending').length
      },
      timing: {
        plannedDuration: route.scheduling.plannedEndTime - route.scheduling.plannedStartTime,
        actualDuration: route.metrics.actualDuration,
        delayTime: route.metrics.delayTime,
        onTimePerformance: route.metrics.onTimePerformance
      },
      costs: route.costs,
      notifications: {
        total: route.notifications.length,
        unacknowledged: route.notifications.filter(n => !n.acknowledged).length
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get route analytics error:', error);
    next(error);
  }
};

// Helper function to optimize waypoints (simplified)
const optimizeWaypoints = (waypoints) => {
  // This is a simplified optimization. In production, you would use
  // more sophisticated algorithms like Genetic Algorithm, Simulated Annealing,
  // or external services like Google Routes Optimization API
  
  const pickupPoints = waypoints.filter(w => w.type === 'pickup');
  const deliveryPoints = waypoints.filter(w => w.type === 'delivery');
  const otherPoints = waypoints.filter(w => !['pickup', 'delivery'].includes(w.type));
  
  // Simple heuristic: pickups first, then deliveries, then others
  const optimized = [...pickupPoints, ...deliveryPoints, ...otherPoints];
  
  // Reassign order numbers
  return optimized.map((waypoint, index) => ({
    ...waypoint,
    order: index + 1
  }));
};

// Helper function to calculate route metrics
const calculateRouteMetrics = (waypoints) => {
  // Simplified calculation - in production, use real mapping services
  let totalDistance = 0;
  let estimatedDuration = 0;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i];
    const next = waypoints[i + 1];
    
    // Calculate distance using Haversine formula (simplified)
    const distance = calculateDistance(
      current.location.coordinates.lat,
      current.location.coordinates.lng,
      next.location.coordinates.lat,
      next.location.coordinates.lng
    );
    
    totalDistance += distance;
  }
  
  // Estimate duration (assuming average speed of 50 km/h)
  estimatedDuration = (totalDistance / 50) * 60; // in minutes
  
  // Estimate fuel cost (assuming 10 km/l and $1.2 per liter)
  const estimatedFuelCost = (totalDistance / 10) * 1.2;
  
  return { totalDistance, estimatedDuration, estimatedFuelCost };
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

module.exports = {
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
};
