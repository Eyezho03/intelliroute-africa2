const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
const getVehicles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;
    const status = req.query.status;
    const type = req.query.type;
    const ownerId = req.query.owner;
    const available = req.query.available;

    // Build query
    let query = {};

    // Role-based filtering
    if (req.user.role === 'fleet-manager') {
      query.fleetManager = req.user._id;
    } else if (req.user.role === 'driver') {
      query.$or = [
        { assignedDriver: req.user._id },
        { owner: req.user._id }
      ];
    } else if (req.user.role !== 'admin') {
      query.owner = req.user._id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { registrationNumber: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by owner
    if (ownerId) {
      query.owner = ownerId;
    }

    // Filter available vehicles
    if (available === 'true') {
      query.status = 'available';
    }

    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find(query)
      .populate('owner', 'firstName lastName email phone profile.businessName')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('fleetManager', 'firstName lastName email phone')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Vehicle.countDocuments(query);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get vehicles error:', error);
    next(error);
  }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
const getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone profile.businessName')
      .populate('assignedDriver', 'firstName lastName email phone avatar ratings')
      .populate('fleetManager', 'firstName lastName email phone')
      .populate('routeHistory.route', 'name status');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canAccess = (
      req.user.role === 'admin' ||
      vehicle.owner._id.toString() === req.user._id.toString() ||
      vehicle.assignedDriver?._id.toString() === req.user._id.toString() ||
      vehicle.fleetManager?._id.toString() === req.user._id.toString()
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this vehicle'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    logger.error('Get vehicle error:', error);
    next(error);
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private
const createVehicle = async (req, res, next) => {
  try {
    // Set owner as current user if not admin
    if (req.user.role !== 'admin') {
      req.body.owner = req.user._id;
    }

    // Set fleet manager if user is fleet manager
    if (req.user.role === 'fleet-manager') {
      req.body.fleetManager = req.user._id;
    }

    const vehicle = await Vehicle.create(req.body);

    // Populate the created vehicle
    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('owner', 'firstName lastName email phone')
      .populate('fleetManager', 'firstName lastName email phone');

    logger.info(`New vehicle created: ${vehicle.registrationNumber} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: populatedVehicle
    });
  } catch (error) {
    logger.error('Create vehicle error:', error);
    next(error);
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
const updateVehicle = async (req, res, next) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      vehicle.owner.toString() === req.user._id.toString() ||
      vehicle.fleetManager?.toString() === req.user._id.toString()
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle'
      });
    }

    // Prevent certain fields from being updated by non-admin users
    if (req.user.role !== 'admin') {
      delete req.body.owner;
      delete req.body.isVerified;
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('owner', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('fleetManager', 'firstName lastName email phone');

    logger.info(`Vehicle updated: ${vehicle.registrationNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });
  } catch (error) {
    logger.error('Update vehicle error:', error);
    next(error);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canDelete = (
      req.user.role === 'admin' ||
      vehicle.owner.toString() === req.user._id.toString()
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this vehicle'
      });
    }

    // Check if vehicle is currently assigned to any orders
    if (vehicle.status === 'in-transit' || vehicle.status === 'loading' || vehicle.status === 'unloading') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle that is currently in use'
      });
    }

    await vehicle.remove();

    logger.info(`Vehicle deleted: ${vehicle.registrationNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    logger.error('Delete vehicle error:', error);
    next(error);
  }
};

// @desc    Assign driver to vehicle
// @route   PUT /api/vehicles/:id/assign-driver
// @access  Private (Fleet Manager/Admin)
const assignDriver = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canAssign = (
      req.user.role === 'admin' ||
      vehicle.fleetManager?.toString() === req.user._id.toString() ||
      vehicle.owner.toString() === req.user._id.toString()
    );

    if (!canAssign) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign driver to this vehicle'
      });
    }

    // Verify driver exists and is a driver
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver selected'
      });
    }

    await vehicle.assignDriver(driverId);

    logger.info(`Driver ${driver.email} assigned to vehicle ${vehicle.registrationNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data: vehicle
    });
  } catch (error) {
    logger.error('Assign driver error:', error);
    next(error);
  }
};

// @desc    Update vehicle location
// @route   PUT /api/vehicles/:id/location
// @access  Private (Driver)
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization - only assigned driver can update location
    if (vehicle.assignedDriver?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle location'
      });
    }

    await vehicle.updateLocation(lat, lng, address);

    res.status(200).json({
      success: true,
      message: 'Vehicle location updated successfully',
      data: {
        currentLocation: vehicle.currentLocation
      }
    });
  } catch (error) {
    logger.error('Update vehicle location error:', error);
    next(error);
  }
};

// @desc    Add maintenance record
// @route   POST /api/vehicles/:id/maintenance
// @access  Private
const addMaintenanceRecord = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canAdd = (
      req.user.role === 'admin' ||
      vehicle.owner.toString() === req.user._id.toString() ||
      vehicle.fleetManager?.toString() === req.user._id.toString()
    );

    if (!canAdd) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add maintenance record to this vehicle'
      });
    }

    await vehicle.addMaintenanceRecord(req.body);

    logger.info(`Maintenance record added to vehicle ${vehicle.registrationNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Maintenance record added successfully',
      data: vehicle
    });
  } catch (error) {
    logger.error('Add maintenance record error:', error);
    next(error);
  }
};

// @desc    Get available vehicles for assignment
// @route   GET /api/vehicles/available
// @access  Private
const getAvailableVehicles = async (req, res, next) => {
  try {
    const { minWeight, minVolume, type, location } = req.query;

    let query = {
      status: 'available',
      isActive: true
    };

    // Filter by capacity
    if (minWeight) {
      query['capacity.weight'] = { $gte: parseInt(minWeight) };
    }

    if (minVolume) {
      query['capacity.volume'] = { $gte: parseInt(minVolume) };
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Role-based filtering
    if (req.user.role === 'fleet-manager') {
      query.fleetManager = req.user._id;
    } else if (req.user.role !== 'admin') {
      query.owner = req.user._id;
    }

    let vehicles = await Vehicle.find(query)
      .populate('assignedDriver', 'firstName lastName phone')
      .select('registrationNumber type make model capacity currentLocation features status');

    // If location is provided, sort by distance (simplified)
    if (location) {
      const [lat, lng] = location.split(',').map(Number);
      vehicles = vehicles.filter(vehicle => {
        return vehicle.currentLocation && 
               vehicle.currentLocation.coordinates &&
               vehicle.currentLocation.coordinates.lat &&
               vehicle.currentLocation.coordinates.lng;
      }).sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.currentLocation.coordinates.lat - lat, 2) + 
          Math.pow(a.currentLocation.coordinates.lng - lng, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.currentLocation.coordinates.lat - lat, 2) + 
          Math.pow(b.currentLocation.coordinates.lng - lng, 2)
        );
        return distA - distB;
      });
    }

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    logger.error('Get available vehicles error:', error);
    next(error);
  }
};

// @desc    Get vehicle performance metrics
// @route   GET /api/vehicles/:id/metrics
// @access  Private
const getVehicleMetrics = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('routeHistory.route', 'name status optimization.totalDistance');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check authorization
    const canView = (
      req.user.role === 'admin' ||
      vehicle.owner.toString() === req.user._id.toString() ||
      vehicle.fleetManager?.toString() === req.user._id.toString()
    );

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this vehicle metrics'
      });
    }

    // Calculate additional metrics
    const now = new Date();
    const daysSinceCreation = Math.ceil((now - vehicle.createdAt) / (1000 * 60 * 60 * 24));
    const maintenanceDue = vehicle.maintenanceDue;
    
    const metrics = {
      basic: vehicle.metrics,
      performance: {
        fuelEfficiency: vehicle.fuelEfficiency,
        utilizationRate: vehicle.metrics.utilizationRate,
        maintenanceDue,
        daysSinceCreation,
        averageTripsPerDay: daysSinceCreation > 0 ? (vehicle.metrics.totalTrips / daysSinceCreation).toFixed(2) : 0
      },
      maintenance: {
        lastService: vehicle.maintenance.lastService,
        nextServiceDue: vehicle.maintenance.nextServiceDue,
        totalMaintenanceRecords: vehicle.maintenance.maintenanceHistory.length,
        totalMaintenanceCost: vehicle.metrics.totalMaintenanceCost
      },
      ratings: vehicle.ratings
    };

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Get vehicle metrics error:', error);
    next(error);
  }
};

module.exports = {
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
};
