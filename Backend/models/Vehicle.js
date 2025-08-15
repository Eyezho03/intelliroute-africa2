const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  // Basic vehicle information
  registrationNumber: {
    type: String,
    required: [true, 'Please add a registration number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  make: {
    type: String,
    required: [true, 'Please add vehicle make'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please add vehicle model'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Please add vehicle year'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  color: {
    type: String,
    trim: true
  },
  
  // Vehicle specifications
  type: {
    type: String,
    required: [true, 'Please specify vehicle type'],
    enum: [
      'truck',
      'van', 
      'pickup',
      'trailer',
      'container',
      'motorcycle',
      'bicycle',
      'other'
    ]
  },
  capacity: {
    weight: {
      type: Number,
      required: [true, 'Please specify weight capacity in kg']
    },
    volume: {
      type: Number,
      required: [true, 'Please specify volume capacity in cubic meters']
    }
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'],
    required: [true, 'Please specify fuel type']
  },
  
  // Ownership and assignment
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Vehicle must belong to an owner']
  },
  assignedDriver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  fleetManager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  
  // Current status
  status: {
    type: String,
    enum: [
      'available',
      'in-transit',
      'maintenance', 
      'out-of-service',
      'loading',
      'unloading'
    ],
    default: 'available'
  },
  
  // Location tracking
  currentLocation: {
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    address: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Route history
  routeHistory: [{
    route: {
      type: mongoose.Schema.ObjectId,
      ref: 'Route'
    },
    startTime: Date,
    endTime: Date,
    distanceCovered: Number, // in kilometers
    fuelConsumed: Number // in liters
  }],
  
  // Vehicle documents
  documents: {
    registration: {
      number: String,
      expiryDate: Date,
      imageUrl: String
    },
    insurance: {
      policyNumber: String,
      provider: String,
      expiryDate: Date,
      imageUrl: String
    },
    roadworthiness: {
      certificateNumber: String,
      expiryDate: Date,
      imageUrl: String
    }
  },
  
  // Maintenance records
  maintenance: {
    lastService: {
      date: Date,
      type: String,
      mileage: Number,
      cost: Number,
      description: String,
      serviceProvider: String
    },
    nextServiceDue: {
      date: Date,
      mileage: Number
    },
    maintenanceHistory: [{
      date: {
        type: Date,
        required: true
      },
      type: {
        type: String,
        enum: ['routine', 'repair', 'inspection', 'emergency'],
        required: true
      },
      description: String,
      cost: Number,
      mileage: Number,
      serviceProvider: String,
      partsReplaced: [String],
      nextServiceDate: Date
    }]
  },
  
  // Performance metrics
  metrics: {
    totalDistance: {
      type: Number,
      default: 0
    },
    totalFuelConsumed: {
      type: Number,
      default: 0
    },
    averageFuelEfficiency: {
      type: Number,
      default: 0
    },
    totalTrips: {
      type: Number,
      default: 0
    },
    totalMaintenanceCost: {
      type: Number,
      default: 0
    },
    utilizationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Ratings and reviews
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  // Vehicle features
  features: {
    gps: {
      type: Boolean,
      default: false
    },
    airConditioning: {
      type: Boolean,
      default: false
    },
    refrigeration: {
      type: Boolean,
      default: false
    },
    crane: {
      type: Boolean,
      default: false
    },
    tailgate: {
      type: Boolean,
      default: false
    }
  },
  
  // Images
  images: [{
    url: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Vehicle status flags
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Additional notes
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for fuel efficiency calculation
VehicleSchema.virtual('fuelEfficiency').get(function() {
  if (this.metrics.totalFuelConsumed > 0) {
    return (this.metrics.totalDistance / this.metrics.totalFuelConsumed).toFixed(2);
  }
  return 0;
});

// Virtual for next maintenance due
VehicleSchema.virtual('maintenanceDue').get(function() {
  const nextServiceDate = this.maintenance.nextServiceDue?.date;
  if (nextServiceDate) {
    return nextServiceDate <= new Date();
  }
  return false;
});

// Index for location-based queries
VehicleSchema.index({ 'currentLocation.coordinates': '2dsphere' });

// Index for searching
VehicleSchema.index({ owner: 1 });
VehicleSchema.index({ assignedDriver: 1 });
VehicleSchema.index({ status: 1 });

// Pre-save middleware to update utilization rate
VehicleSchema.pre('save', function(next) {
  if (this.isModified('metrics.totalTrips') || this.isModified('createdAt')) {
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)));
    this.metrics.utilizationRate = Math.min(100, (this.metrics.totalTrips / daysSinceCreation) * 10);
  }
  next();
});

// Method to update location
VehicleSchema.methods.updateLocation = function(lat, lng, address) {
  this.currentLocation = {
    coordinates: { lat, lng },
    address,
    lastUpdated: new Date()
  };
  return this.save();
};

// Method to add maintenance record
VehicleSchema.methods.addMaintenanceRecord = function(maintenanceData) {
  this.maintenance.maintenanceHistory.push({
    ...maintenanceData,
    date: new Date()
  });
  
  // Update last service info
  this.maintenance.lastService = {
    date: new Date(),
    type: maintenanceData.type,
    mileage: maintenanceData.mileage,
    cost: maintenanceData.cost,
    description: maintenanceData.description,
    serviceProvider: maintenanceData.serviceProvider
  };
  
  // Update total maintenance cost
  if (maintenanceData.cost) {
    this.metrics.totalMaintenanceCost += maintenanceData.cost;
  }
  
  return this.save();
};

// Method to assign driver
VehicleSchema.methods.assignDriver = function(driverId) {
  this.assignedDriver = driverId;
  return this.save();
};

module.exports = mongoose.model('Vehicle', VehicleSchema);
