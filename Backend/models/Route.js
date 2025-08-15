const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  // Basic route information
  name: {
    type: String,
    required: [true, 'Please provide a route name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Route creator and assignment
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Route must have a creator']
  },
  assignedDriver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedVehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle'
  },
  
  // Route status
  status: {
    type: String,
    enum: [
      'draft',
      'planned',
      'assigned',
      'in-progress',
      'completed',
      'cancelled',
      'paused'
    ],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Route waypoints and stops
  waypoints: [{
    location: {
      coordinates: {
        lat: {
          type: Number,
          required: true,
          min: -90,
          max: 90
        },
        lng: {
          type: Number,
          required: true,
          min: -180,
          max: 180
        }
      },
      address: String,
      name: String
    },
    order: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['pickup', 'delivery', 'waypoint', 'rest-stop', 'fuel-stop'],
      required: true
    },
    estimatedArrival: Date,
    actualArrival: Date,
    estimatedDeparture: Date,
    actualDeparture: Date,
    duration: Number, // minutes to spend at this location
    notes: String,
    contact: {
      name: String,
      phone: String,
      email: String
    },
    status: {
      type: String,
      enum: ['pending', 'arrived', 'completed', 'skipped'],
      default: 'pending'
    }
  }],
  
  // Related orders
  orders: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Order'
  }],
  
  // Route optimization data
  optimization: {
    totalDistance: {
      type: Number,
      default: 0 // in kilometers
    },
    estimatedDuration: {
      type: Number,
      default: 0 // in minutes
    },
    estimatedFuelCost: {
      type: Number,
      default: 0
    },
    optimizedPath: [{
      lat: Number,
      lng: Number
    }],
    alternativeRoutes: [{
      name: String,
      distance: Number,
      duration: Number,
      path: [{
        lat: Number,
        lng: Number
      }]
    }]
  },
  
  // Time scheduling
  scheduling: {
    plannedStartTime: {
      type: Date,
      required: [true, 'Please provide planned start time']
    },
    plannedEndTime: {
      type: Date,
      required: [true, 'Please provide planned end time']
    },
    actualStartTime: Date,
    actualEndTime: Date,
    breaks: [{
      startTime: Date,
      endTime: Date,
      location: String,
      reason: String
    }]
  },
  
  // Route tracking
  tracking: {
    currentWaypoint: {
      type: Number,
      default: 0
    },
    completedWaypoints: [{
      waypointIndex: Number,
      completedAt: Date,
      notes: String
    }],
    currentLocation: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    path: [{
      coordinates: {
        lat: Number,
        lng: Number
      },
      timestamp: Date,
      speed: Number // km/h
    }]
  },
  
  // Performance metrics
  metrics: {
    actualDistance: Number,
    actualDuration: Number,
    fuelConsumed: Number,
    averageSpeed: Number,
    delayTime: Number, // minutes
    onTimePerformance: {
      type: Number,
      min: 0,
      max: 100
    },
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 0,
        max: 5
      },
      feedback: String
    }
  },
  
  // Weather and traffic considerations
  conditions: {
    weather: {
      condition: String,
      temperature: Number,
      visibility: String,
      impact: {
        type: String,
        enum: ['none', 'low', 'medium', 'high']
      }
    },
    traffic: {
      level: {
        type: String,
        enum: ['light', 'moderate', 'heavy', 'severe']
      },
      delays: [{
        location: String,
        delayMinutes: Number,
        reason: String
      }]
    }
  },
  
  // Cost calculation
  costs: {
    fuel: {
      type: Number,
      default: 0
    },
    tolls: {
      type: Number,
      default: 0
    },
    driver: {
      type: Number,
      default: 0
    },
    vehicle: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  
  // Route constraints
  constraints: {
    maxWeight: Number,
    maxVolume: Number,
    vehicleType: String,
    timeWindows: [{
      start: Date,
      end: Date,
      location: String
    }],
    avoidTolls: {
      type: Boolean,
      default: false
    },
    avoidHighways: {
      type: Boolean,
      default: false
    }
  },
  
  // Route notifications
  notifications: [{
    type: {
      type: String,
      enum: ['delay', 'arrival', 'departure', 'completion', 'issue', 'update'],
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  
  // Route attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Route tags for categorization
  tags: [String],
  
  // Route completion data
  completion: {
    completedAt: Date,
    completionNotes: String,
    issues: [{
      type: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      reportedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }],
    photos: [String] // URLs to completion photos
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for route progress percentage
RouteSchema.virtual('progress').get(function() {
  if (!this.waypoints || this.waypoints.length === 0) return 0;
  const completedWaypoints = this.waypoints.filter(w => w.status === 'completed').length;
  return Math.round((completedWaypoints / this.waypoints.length) * 100);
});

// Virtual for estimated completion time
RouteSchema.virtual('estimatedCompletion').get(function() {
  if (this.scheduling.actualStartTime && this.optimization.estimatedDuration) {
    return new Date(this.scheduling.actualStartTime.getTime() + (this.optimization.estimatedDuration * 60 * 1000));
  }
  return this.scheduling.plannedEndTime;
});

// Virtual for current delay
RouteSchema.virtual('currentDelay').get(function() {
  if (this.status === 'in-progress' && this.scheduling.actualStartTime) {
    const expectedCurrentTime = new Date(
      this.scheduling.actualStartTime.getTime() + 
      (this.optimization.estimatedDuration * (this.progress / 100) * 60 * 1000)
    );
    return Math.max(0, Math.floor((Date.now() - expectedCurrentTime) / (1000 * 60)));
  }
  return 0;
});

// Indexes for efficient querying
RouteSchema.index({ status: 1 });
RouteSchema.index({ assignedDriver: 1 });
RouteSchema.index({ assignedVehicle: 1 });
RouteSchema.index({ createdBy: 1 });
RouteSchema.index({ 'scheduling.plannedStartTime': 1 });
RouteSchema.index({ priority: 1, status: 1 });

// Method to add waypoint
RouteSchema.methods.addWaypoint = function(waypointData) {
  const order = this.waypoints.length + 1;
  this.waypoints.push({
    ...waypointData,
    order,
    status: 'pending'
  });
  return this.save();
};

// Method to update waypoint status
RouteSchema.methods.updateWaypointStatus = function(waypointId, status, timestamp = new Date()) {
  const waypoint = this.waypoints.id(waypointId);
  if (waypoint) {
    waypoint.status = status;
    if (status === 'arrived') {
      waypoint.actualArrival = timestamp;
    } else if (status === 'completed') {
      waypoint.actualDeparture = timestamp;
    }
  }
  return this.save();
};

// Method to update current location
RouteSchema.methods.updateCurrentLocation = function(lat, lng, address) {
  this.tracking.currentLocation = {
    coordinates: { lat, lng },
    address,
    lastUpdated: new Date()
  };
  
  // Add to path
  this.tracking.path.push({
    coordinates: { lat, lng },
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to start route
RouteSchema.methods.startRoute = function() {
  this.status = 'in-progress';
  this.scheduling.actualStartTime = new Date();
  return this.save();
};

// Method to complete route
RouteSchema.methods.completeRoute = function(notes, issues = []) {
  this.status = 'completed';
  this.scheduling.actualEndTime = new Date();
  this.completion.completedAt = new Date();
  this.completion.completionNotes = notes;
  this.completion.issues = issues;
  
  // Calculate actual metrics
  if (this.scheduling.actualStartTime && this.scheduling.actualEndTime) {
    this.metrics.actualDuration = Math.floor(
      (this.scheduling.actualEndTime - this.scheduling.actualStartTime) / (1000 * 60)
    );
    
    // Calculate delay
    const plannedDuration = Math.floor(
      (this.scheduling.plannedEndTime - this.scheduling.plannedStartTime) / (1000 * 60)
    );
    this.metrics.delayTime = Math.max(0, this.metrics.actualDuration - plannedDuration);
  }
  
  return this.save();
};

// Method to add notification
RouteSchema.methods.addNotification = function(type, message) {
  this.notifications.push({
    type,
    message,
    timestamp: new Date(),
    acknowledged: false
  });
  return this.save();
};

module.exports = mongoose.model('Route', RouteSchema);
