const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const logger = require('../utils/logger');

const router = express.Router();

// Protect all routes
router.use(protect);

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const timeRange = req.query.timeRange || '30d'; // 7d, 30d, 90d, 1y

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '1y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    let analytics = {};

    if (userRole === 'admin') {
      // Admin dashboard - system-wide analytics
      analytics = await getAdminAnalytics(startDate);
    } else if (userRole === 'fleet-manager') {
      // Fleet manager dashboard
      analytics = await getFleetManagerAnalytics(userId, startDate);
    } else if (userRole === 'driver') {
      // Driver dashboard
      analytics = await getDriverAnalytics(userId, startDate);
    } else {
      // Customer/Business user dashboard
      analytics = await getCustomerAnalytics(userId, startDate);
    }

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    next(error);
  }
});

// @desc    Get orders analytics
// @route   GET /api/analytics/orders
// @access  Private
router.get('/orders', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
    if (userRole !== 'admin') {
      if (userRole === 'driver') {
        matchQuery.assignedDriver = userId;
      } else if (userRole === 'fleet-manager') {
        const managedDrivers = req.user.profile?.managedDrivers || [];
        matchQuery.$or = [
          { assignedDriver: { $in: managedDrivers } },
          { createdBy: userId }
        ];
      } else {
        matchQuery.customer = userId;
      }
    }

    const orderAnalytics = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          avgOrderValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    // Status distribution
    const statusDistribution = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly trend
    const monthlyTrend = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: orderAnalytics[0] || {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0
        },
        statusDistribution,
        monthlyTrend
      }
    });
  } catch (error) {
    logger.error('Get orders analytics error:', error);
    next(error);
  }
});

// @desc    Get vehicles analytics
// @route   GET /api/analytics/vehicles
// @access  Private (Admin/Fleet Manager)
router.get('/vehicles', authorize('admin', 'fleet-manager'), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
    if (userRole === 'fleet-manager') {
      matchQuery.fleetManager = userId;
    }

    const vehicleAnalytics = await Vehicle.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          activeVehicles: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          inTransitVehicles: {
            $sum: { $cond: [{ $eq: ['$status', 'in-transit'] }, 1, 0] }
          },
          maintenanceVehicles: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
          },
          totalDistance: { $sum: '$metrics.totalDistance' },
          totalFuelConsumed: { $sum: '$metrics.totalFuelConsumed' },
          avgUtilization: { $avg: '$metrics.utilizationRate' }
        }
      }
    ]);

    // Vehicle type distribution
    const typeDistribution = await Vehicle.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgUtilization: { $avg: '$metrics.utilizationRate' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: vehicleAnalytics[0] || {},
        typeDistribution
      }
    });
  } catch (error) {
    logger.error('Get vehicles analytics error:', error);
    next(error);
  }
});

// Helper functions
async function getAdminAnalytics(startDate) {
  const [orderStats, vehicleStats, userStats, inventoryStats] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]),
    Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          activeVehicles: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          }
        }
      }
    ]),
    User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]),
    Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$stock.current', '$pricing.price'] }
          },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$stock.available', '$stock.reorderPoint'] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  return {
    orders: orderStats[0] || { totalOrders: 0, totalRevenue: 0, completedOrders: 0 },
    vehicles: vehicleStats[0] || { totalVehicles: 0, activeVehicles: 0 },
    users: userStats[0] || { totalUsers: 0, activeUsers: 0 },
    inventory: inventoryStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0 }
  };
}

async function getFleetManagerAnalytics(userId, startDate) {
  const managedDrivers = await User.find({ 
    'profile.managedBy': userId,
    role: 'driver'
  }).select('_id');
  
  const driverIds = managedDrivers.map(driver => driver._id);

  const [orderStats, vehicleStats, routeStats] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          assignedDriver: { $in: driverIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]),
    Vehicle.aggregate([
      { $match: { fleetManager: userId } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          activeVehicles: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          avgUtilization: { $avg: '$metrics.utilizationRate' }
        }
      }
    ]),
    Route.aggregate([
      {
        $match: {
          assignedDriver: { $in: driverIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRoutes: { $sum: 1 },
          completedRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDistance: { $sum: '$optimization.totalDistance' }
        }
      }
    ])
  ]);

  return {
    orders: orderStats[0] || { totalOrders: 0, completedOrders: 0, totalRevenue: 0 },
    vehicles: vehicleStats[0] || { totalVehicles: 0, activeVehicles: 0, avgUtilization: 0 },
    routes: routeStats[0] || { totalRoutes: 0, completedRoutes: 0, totalDistance: 0 },
    managedDrivers: driverIds.length
  };
}

async function getDriverAnalytics(userId, startDate) {
  const [orderStats, routeStats, vehicleStats] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          assignedDriver: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]),
    Route.aggregate([
      {
        $match: {
          assignedDriver: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRoutes: { $sum: 1 },
          completedRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDistance: { $sum: '$metrics.actualDistance' }
        }
      }
    ]),
    Vehicle.findOne({ assignedDriver: userId }).select('metrics ratings')
  ]);

  return {
    orders: orderStats[0] || { totalOrders: 0, completedOrders: 0 },
    routes: routeStats[0] || { totalRoutes: 0, completedRoutes: 0, totalDistance: 0 },
    vehicle: vehicleStats || null,
    performance: {
      completionRate: orderStats[0] ? 
        (orderStats[0].completedOrders / orderStats[0].totalOrders * 100).toFixed(1) : 0
    }
  };
}

async function getCustomerAnalytics(userId, startDate) {
  const [orderStats, inventoryStats] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          customer: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalSpent: { $sum: '$pricing.totalAmount' },
          avgOrderValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]),
    Inventory.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$stock.current', '$pricing.price'] }
          },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$stock.available', '$stock.reorderPoint'] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  return {
    orders: orderStats[0] || { totalOrders: 0, completedOrders: 0, totalSpent: 0, avgOrderValue: 0 },
    inventory: inventoryStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0 }
  };
}

module.exports = router;
