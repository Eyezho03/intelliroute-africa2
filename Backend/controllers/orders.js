const Order = require('../models/Order');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const logger = require('../utils/logger');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;
    const status = req.query.status;
    const priority = req.query.priority;
    const type = req.query.type;
    const customerId = req.query.customer;
    const driverId = req.query.driver;

    // Build query
    let query = {};

    // Role-based filtering
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'driver') {
      query.assignedDriver = req.user._id;
    } else if (req.user.role === 'fleet-manager') {
      // Get managed drivers
      const managedDrivers = req.user.profile?.managedDrivers || [];
      query.$or = [
        { assignedDriver: { $in: managedDrivers } },
        { createdBy: req.user._id }
      ];
    }

    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'tracking.trackingNumber': { $regex: search, $options: 'i' } },
        { 'pickup.location.address': { $regex: search, $options: 'i' } },
        { 'delivery.location.address': { $regex: search, $options: 'i' } }
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

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by customer
    if (customerId) {
      query.customer = customerId;
    }

    // Filter by driver
    if (driverId) {
      query.assignedDriver = driverId;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email phone profile.businessName')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('assignedVehicle', 'registrationNumber type make model')
      .populate('assignedRoute', 'name status')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('vendor', 'firstName lastName email phone profile.businessName')
      .populate('assignedDriver', 'firstName lastName email phone avatar ratings')
      .populate('assignedVehicle', 'registrationNumber type make model capacity')
      .populate('assignedRoute', 'name status optimization.totalDistance')
      .populate('tracking.statusHistory.updatedBy', 'firstName lastName')
      .populate('internalNotes.addedBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const canAccess = (
      req.user.role === 'admin' ||
      order.customer._id.toString() === req.user._id.toString() ||
      order.assignedDriver?._id.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager' && req.user.profile?.managedDrivers?.includes(order.assignedDriver?._id))
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order error:', error);
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    // Set customer as current user if not admin
    if (req.user.role !== 'admin') {
      req.body.customer = req.user._id;
    }

    const order = await Order.create(req.body);

    // Populate the created order
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email phone profile.businessName');

    logger.info(`New order created: ${order.orderNumber} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });
  } catch (error) {
    logger.error('Create order error:', error);
    next(error);
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      order.customer.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    // Prevent certain fields from being updated by non-admin users
    if (req.user.role !== 'admin') {
      delete req.body.pricing;
      delete req.body.customer;
      delete req.body.assignedDriver;
      delete req.body.assignedVehicle;
    }

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('customer', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName email phone')
      .populate('assignedVehicle', 'registrationNumber type');

    logger.info(`Order updated: ${order.orderNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Update order error:', error);
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Admin only)
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow deletion of pending or cancelled orders
    if (!['pending', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete orders that are in progress or completed'
      });
    }

    await order.remove();

    logger.info(`Order deleted: ${order.orderNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    logger.error('Delete order error:', error);
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, notes, location } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      order.assignedDriver?.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order status'
      });
    }

    await order.updateStatus(status, notes, location, req.user._id);

    logger.info(`Order status updated: ${order.orderNumber} to ${status} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    next(error);
  }
};

// @desc    Assign driver and vehicle to order
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin/Fleet Manager)
const assignOrder = async (req, res, next) => {
  try {
    const { driverId, vehicleId } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify driver exists and is available
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver selected'
      });
    }

    // Verify vehicle exists and is available
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not available'
      });
    }

    // Check if vehicle has sufficient capacity
    if (order.cargo.totalWeight > vehicle.capacity.weight) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle capacity insufficient for this order'
      });
    }

    await order.assignDriverAndVehicle(driverId, vehicleId);

    // Update vehicle status
    vehicle.status = 'assigned';
    vehicle.assignedDriver = driverId;
    await vehicle.save();

    logger.info(`Order ${order.orderNumber} assigned to driver ${driver.email} and vehicle ${vehicle.registrationNumber}`);

    res.status(200).json({
      success: true,
      message: 'Order assigned successfully',
      data: order
    });
  } catch (error) {
    logger.error('Assign order error:', error);
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const canCancel = (
      req.user.role === 'admin' ||
      order.customer.toString() === req.user._id.toString() ||
      (req.user.role === 'fleet-manager')
    );

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order with current status'
      });
    }

    const refundAmount = order.status === 'pending' ? order.pricing.totalAmount : 0;
    await order.cancelOrder(reason, req.user._id, refundAmount);

    // Release assigned vehicle if any
    if (order.assignedVehicle) {
      const vehicle = await Vehicle.findById(order.assignedVehicle);
      if (vehicle) {
        vehicle.status = 'available';
        vehicle.assignedDriver = null;
        await vehicle.save();
      }
    }

    logger.info(`Order cancelled: ${order.orderNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    next(error);
  }
};

// @desc    Add internal note to order
// @route   POST /api/orders/:id/notes
// @access  Private
const addNote = async (req, res, next) => {
  try {
    const { note, isPrivate = false } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.addInternalNote(note, req.user._id, isPrivate);

    logger.info(`Note added to order ${order.orderNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: order
    });
  } catch (error) {
    logger.error('Add note error:', error);
    next(error);
  }
};

// @desc    Get order tracking information
// @route   GET /api/orders/:id/tracking
// @access  Public (with tracking number) / Private
const getOrderTracking = async (req, res, next) => {
  try {
    let order;

    // If tracking number is provided, allow public access
    const trackingNumber = req.query.trackingNumber;
    if (trackingNumber) {
      order = await Order.findOne({ 'tracking.trackingNumber': trackingNumber })
        .select('orderNumber status tracking pickup delivery cargo.items')
        .populate('assignedDriver', 'firstName lastName phone');
    } else {
      // Private access with full order details
      order = await Order.findById(req.params.id)
        .populate('assignedDriver', 'firstName lastName phone')
        .populate('assignedVehicle', 'registrationNumber type make model');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check authorization for private access
      const canAccess = (
        req.user.role === 'admin' ||
        order.customer.toString() === req.user._id.toString() ||
        order.assignedDriver?._id.toString() === req.user._id.toString()
      );

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this order tracking'
        });
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        tracking: order.tracking,
        pickup: order.pickup,
        delivery: order.delivery,
        assignedDriver: order.assignedDriver,
        assignedVehicle: order.assignedVehicle,
        estimatedDelivery: order.tracking.estimatedDeliveryTime,
        progress: order.progress
      }
    });
  } catch (error) {
    logger.error('Get order tracking error:', error);
    next(error);
  }
};

module.exports = {
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
};
