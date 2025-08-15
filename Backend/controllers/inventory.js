const Inventory = require('../models/Inventory');
const logger = require('../utils/logger');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
const getInventoryItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;
    const category = req.query.category;
    const status = req.query.status;
    const lowStock = req.query.lowStock;
    const expiring = req.query.expiring;

    // Build query
    let query = {};

    // Role-based filtering
    if (req.user.role !== 'admin') {
      query.owner = req.user._id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter low stock items
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock.available', '$stock.reorderPoint'] };
    }

    // Filter expiring items
    if (expiring === 'true') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Next 30 days
      query['expiration.hasExpiration'] = true;
      query['expiration.expirationDate'] = { $lte: futureDate };
    }

    const skip = (page - 1) * limit;

    const items = await Inventory.find(query)
      .populate('owner', 'firstName lastName email phone profile.businessName')
      .populate('audit.createdBy', 'firstName lastName')
      .populate('audit.lastModifiedBy', 'firstName lastName')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Get inventory items error:', error);
    next(error);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
const getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone profile.businessName')
      .populate('movements.user', 'firstName lastName email')
      .populate('audit.createdBy', 'firstName lastName')
      .populate('audit.lastModifiedBy', 'firstName lastName');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canAccess = (
      req.user.role === 'admin' ||
      item.owner._id.toString() === req.user._id.toString()
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this inventory item'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('Get inventory item error:', error);
    next(error);
  }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private
const createInventoryItem = async (req, res, next) => {
  try {
    // Set owner as current user if not admin
    if (req.user.role !== 'admin') {
      req.body.owner = req.user._id;
    }

    // Set audit trail
    req.body.audit = {
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
      lastModifiedAt: new Date()
    };

    const item = await Inventory.create(req.body);

    // Populate the created item
    const populatedItem = await Inventory.findById(item._id)
      .populate('owner', 'firstName lastName email phone')
      .populate('audit.createdBy', 'firstName lastName');

    logger.info(`New inventory item created: ${item.name} (${item.sku}) by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: populatedItem
    });
  } catch (error) {
    logger.error('Create inventory item error:', error);
    next(error);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
const updateInventoryItem = async (req, res, next) => {
  try {
    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this inventory item'
      });
    }

    // Update audit trail
    req.body.audit = {
      ...item.audit,
      lastModifiedBy: req.user._id,
      lastModifiedAt: new Date()
    };

    // Prevent certain fields from being updated by non-admin users
    if (req.user.role !== 'admin') {
      delete req.body.owner;
    }

    item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('owner', 'firstName lastName email phone')
      .populate('audit.lastModifiedBy', 'firstName lastName');

    logger.info(`Inventory item updated: ${item.name} (${item.sku}) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });
  } catch (error) {
    logger.error('Update inventory item error:', error);
    next(error);
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canDelete = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this inventory item'
      });
    }

    await item.remove();

    logger.info(`Inventory item deleted: ${item.name} (${item.sku}) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    logger.error('Delete inventory item error:', error);
    next(error);
  }
};

// @desc    Add stock movement
// @route   POST /api/inventory/:id/movements
// @access  Private
const addMovement = async (req, res, next) => {
  try {
    const { type, quantity, reason, reference, notes } = req.body;
    
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canAdd = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canAdd) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add movement to this inventory item'
      });
    }

    // Validate movement
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    // Check if there's enough stock for outbound movements
    if (['out', 'damaged', 'expired', 'lost'].includes(type) || (type === 'adjustment' && quantity < 0)) {
      if (Math.abs(quantity) > item.stock.current) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for this movement'
        });
      }
    }

    await item.addMovement(type, quantity, reason, req.user._id, reference, notes);

    logger.info(`Stock movement added to ${item.name} (${item.sku}): ${type} ${quantity} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Movement added successfully',
      data: item
    });
  } catch (error) {
    logger.error('Add movement error:', error);
    next(error);
  }
};

// @desc    Reserve stock
// @route   POST /api/inventory/:id/reserve
// @access  Private
const reserveStock = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;
    
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canReserve = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canReserve) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reserve stock for this inventory item'
      });
    }

    // Validate reservation
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    await item.reserveStock(quantity, reason, req.user._id);

    logger.info(`Stock reserved for ${item.name} (${item.sku}): ${quantity} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Stock reserved successfully',
      data: item
    });
  } catch (error) {
    logger.error('Reserve stock error:', error);
    next(error);
  }
};

// @desc    Release reserved stock
// @route   POST /api/inventory/:id/release
// @access  Private
const releaseReservedStock = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;
    
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canRelease = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canRelease) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to release reserved stock for this inventory item'
      });
    }

    // Validate release
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    if (quantity > item.stock.reserved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot release more than reserved quantity'
      });
    }

    await item.releaseReservedStock(quantity, reason, req.user._id);

    logger.info(`Reserved stock released for ${item.name} (${item.sku}): ${quantity} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Reserved stock released successfully',
      data: item
    });
  } catch (error) {
    logger.error('Release reserved stock error:', error);
    next(error);
  }
};

// @desc    Update item price
// @route   PUT /api/inventory/:id/price
// @access  Private
const updatePrice = async (req, res, next) => {
  try {
    const { price, reason } = req.body;
    
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canUpdate = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update price for this inventory item'
      });
    }

    // Validate price
    if (!price || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than or equal to 0'
      });
    }

    await item.updatePrice(price, reason);

    logger.info(`Price updated for ${item.name} (${item.sku}): ${price} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Price updated successfully',
      data: item
    });
  } catch (error) {
    logger.error('Update price error:', error);
    next(error);
  }
};

// @desc    Get low stock items
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStockItems = async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'admin' ? null : req.user._id;
    const items = await Inventory.getLowStockItems(ownerId);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    logger.error('Get low stock items error:', error);
    next(error);
  }
};

// @desc    Get expiring items
// @route   GET /api/inventory/expiring
// @access  Private
const getExpiringItems = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const ownerId = req.user.role === 'admin' ? null : req.user._id;
    const items = await Inventory.getExpiringItems(days, ownerId);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    logger.error('Get expiring items error:', error);
    next(error);
  }
};

// @desc    Check alerts for inventory item
// @route   GET /api/inventory/:id/alerts
// @access  Private
const checkAlerts = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check authorization
    const canView = (
      req.user.role === 'admin' ||
      item.owner.toString() === req.user._id.toString()
    );

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view alerts for this inventory item'
      });
    }

    const alerts = await item.checkAlerts();

    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Check alerts error:', error);
    next(error);
  }
};

// @desc    Get inventory analytics
// @route   GET /api/inventory/analytics
// @access  Private
const getInventoryAnalytics = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { owner: req.user._id };

    const totalItems = await Inventory.countDocuments(query);
    const activeItems = await Inventory.countDocuments({ ...query, status: 'active' });
    const lowStockItems = await Inventory.countDocuments({
      ...query,
      $expr: { $lte: ['$stock.available', '$stock.reorderPoint'] }
    });
    const outOfStockItems = await Inventory.countDocuments({
      ...query,
      status: 'out-of-stock'
    });

    // Get expiring items count
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiringItems = await Inventory.countDocuments({
      ...query,
      'expiration.hasExpiration': true,
      'expiration.expirationDate': { $lte: futureDate }
    });

    // Calculate total inventory value
    const inventoryValue = await Inventory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$stock.current', '$pricing.price']
            }
          },
          totalCost: {
            $sum: {
              $multiply: ['$stock.current', '$pricing.cost']
            }
          }
        }
      }
    ]);

    // Get category distribution
    const categoryDistribution = await Inventory.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: {
            $sum: {
              $multiply: ['$stock.current', '$pricing.price']
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const analytics = {
      overview: {
        totalItems,
        activeItems,
        lowStockItems,
        outOfStockItems,
        expiringItems,
        totalValue: inventoryValue[0]?.totalValue || 0,
        totalCost: inventoryValue[0]?.totalCost || 0
      },
      categoryDistribution,
      alerts: {
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
        expiring: expiringItems
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get inventory analytics error:', error);
    next(error);
  }
};

module.exports = {
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
};
