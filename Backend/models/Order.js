const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    required: [true, 'Please provide an order number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Order participants
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must have a customer']
  },
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedDriver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedVehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle'
  },
  assignedRoute: {
    type: mongoose.Schema.ObjectId,
    ref: 'Route'
  },
  
  // Order status and priority
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'assigned',
      'picked-up',
      'in-transit',
      'out-for-delivery',
      'delivered',
      'cancelled',
      'returned',
      'failed'
    ],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Order type and category
  type: {
    type: String,
    enum: [
      'delivery',
      'pickup',
      'round-trip',
      'scheduled',
      'express',
      'bulk',
      'fragile',
      'perishable'
    ],
    required: [true, 'Please specify order type']
  },
  category: {
    type: String,
    enum: [
      'agriculture',
      'manufacturing',
      'retail',
      'healthcare',
      'construction',
      'food-beverage',
      'textiles',
      'electronics',
      'other'
    ]
  },
  
  // Pickup information
  pickup: {
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
      address: {
        type: String,
        required: [true, 'Pickup address is required']
      },
      name: String,
      instructions: String
    },
    contact: {
      name: {
        type: String,
        required: [true, 'Pickup contact name is required']
      },
      phone: {
        type: String,
        required: [true, 'Pickup contact phone is required']
      },
      email: String
    },
    timeWindow: {
      start: {
        type: Date,
        required: [true, 'Pickup time window start is required']
      },
      end: {
        type: Date,
        required: [true, 'Pickup time window end is required']
      }
    },
    actualTime: Date,
    notes: String,
    photos: [String], // URLs to pickup photos
    signature: String, // URL to signature image
    completedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  
  // Delivery information
  delivery: {
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
      address: {
        type: String,
        required: [true, 'Delivery address is required']
      },
      name: String,
      instructions: String
    },
    contact: {
      name: {
        type: String,
        required: [true, 'Delivery contact name is required']
      },
      phone: {
        type: String,
        required: [true, 'Delivery contact phone is required']
      },
      email: String
    },
    timeWindow: {
      start: {
        type: Date,
        required: [true, 'Delivery time window start is required']
      },
      end: {
        type: Date,
        required: [true, 'Delivery time window end is required']
      }
    },
    actualTime: Date,
    notes: String,
    photos: [String], // URLs to delivery photos
    signature: String, // URL to signature image
    completedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    deliveryAttempts: [{
      attemptDate: Date,
      reason: String,
      notes: String
    }]
  },
  
  // Package/cargo information
  cargo: {
    items: [{
      name: {
        type: String,
        required: true
      },
      description: String,
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      weight: {
        type: Number,
        required: true // in kg
      },
      volume: Number, // in cubic meters
      value: Number, // monetary value
      sku: String,
      barcode: String,
      category: String,
      specialHandling: {
        fragile: { type: Boolean, default: false },
        perishable: { type: Boolean, default: false },
        hazardous: { type: Boolean, default: false },
        refrigerated: { type: Boolean, default: false },
        upright: { type: Boolean, default: false }
      }
    }],
    totalWeight: {
      type: Number,
      required: true
    },
    totalVolume: Number,
    totalValue: Number,
    packagingType: {
      type: String,
      enum: ['box', 'envelope', 'pallet', 'container', 'bulk', 'custom']
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['cm', 'm', 'in', 'ft'],
        default: 'cm'
      }
    },
    packingList: String, // URL to packing list document
    photos: [String] // URLs to cargo photos
  },
  
  // Pricing and payment
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required']
    },
    additionalCharges: [{
      name: String,
      amount: Number,
      description: String
    }],
    discounts: [{
      name: String,
      amount: Number,
      percentage: Number,
      description: String
    }],
    taxes: [{
      name: String,
      amount: Number,
      rate: Number
    }],
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'XAF']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank-transfer', 'mobile-money', 'credit']
    },
    paymentReference: String
  },
  
  // Tracking and status updates
  tracking: {
    trackingNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    statusHistory: [{
      status: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      location: {
        coordinates: {
          lat: Number,
          lng: Number
        },
        address: String
      },
      updatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      notes: String,
      automatic: {
        type: Boolean,
        default: false
      }
    }],
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    lastKnownLocation: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String,
      timestamp: Date
    }
  },
  
  // Service requirements
  serviceRequirements: {
    insurance: {
      required: {
        type: Boolean,
        default: false
      },
      amount: Number,
      provider: String,
      policyNumber: String
    },
    signatureRequired: {
      type: Boolean,
      default: true
    },
    photoRequired: {
      type: Boolean,
      default: true
    },
    identificationRequired: {
      type: Boolean,
      default: false
    },
    ageVerification: {
      type: Boolean,
      default: false
    },
    specialInstructions: String
  },
  
  // Communication and notifications
  notifications: [{
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'call'],
      required: true
    },
    event: {
      type: String,
      enum: [
        'order-created',
        'order-confirmed',
        'driver-assigned',
        'picked-up',
        'in-transit',
        'out-for-delivery',
        'delivered',
        'delivery-failed',
        'cancelled'
      ],
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    deliveryStatus: String
  }],
  
  // Rating and feedback
  feedback: {
    customer: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    },
    driver: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    }
  },
  
  // Special handling and requirements
  specialHandling: {
    temperatureControl: {
      required: {
        type: Boolean,
        default: false
      },
      minTemperature: Number,
      maxTemperature: Number,
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C'
      }
    },
    hazardousMaterials: {
      present: {
        type: Boolean,
        default: false
      },
      classification: String,
      unNumber: String,
      packingGroup: String,
      documentation: [String] // URLs to hazmat documents
    },
    customsInformation: {
      required: {
        type: Boolean,
        default: false
      },
      declarationValue: Number,
      hsCode: String,
      countryOfOrigin: String,
      documentation: [String] // URLs to customs documents
    }
  },
  
  // Order documents and attachments
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'manifest', 'customs', 'insurance', 'other']
    },
    url: String,
    uploadedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Order tags for categorization and searching
  tags: [String],
  
  // Internal notes and comments
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    private: {
      type: Boolean,
      default: false
    }
  }],
  
  // Cancellation information
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for order duration (from creation to delivery)
OrderSchema.virtual('orderDuration').get(function() {
  if (this.tracking.actualDeliveryTime) {
    return Math.floor((this.tracking.actualDeliveryTime - this.createdAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Virtual for delivery status
OrderSchema.virtual('deliveryStatus').get(function() {
  if (this.status === 'delivered') return 'delivered';
  if (this.tracking.estimatedDeliveryTime) {
    const now = new Date();
    if (now > this.tracking.estimatedDeliveryTime) {
      return 'overdue';
    }
    const hoursUntilDelivery = (this.tracking.estimatedDeliveryTime - now) / (1000 * 60 * 60);
    if (hoursUntilDelivery <= 2) return 'due-soon';
  }
  return 'on-time';
});

// Indexes for efficient querying
OrderSchema.index({ customer: 1 });
OrderSchema.index({ assignedDriver: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ priority: 1, status: 1 });
OrderSchema.index({ 'pickup.timeWindow.start': 1 });
OrderSchema.index({ 'delivery.timeWindow.start': 1 });

// Pre-save middleware to generate order number and tracking number
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp.slice(-6)}${random}`;
  }
  
  if (this.isNew && !this.tracking.trackingNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.tracking.trackingNumber = `TRK${timestamp.slice(-8)}${random}`;
  }
  
  // Calculate total weight and volume if not provided
  if (this.cargo.items && this.cargo.items.length > 0) {
    if (!this.cargo.totalWeight) {
      this.cargo.totalWeight = this.cargo.items.reduce((total, item) => {
        return total + (item.weight * item.quantity);
      }, 0);
    }
    
    if (!this.cargo.totalVolume && this.cargo.items.some(item => item.volume)) {
      this.cargo.totalVolume = this.cargo.items.reduce((total, item) => {
        return total + ((item.volume || 0) * item.quantity);
      }, 0);
    }
    
    if (!this.cargo.totalValue && this.cargo.items.some(item => item.value)) {
      this.cargo.totalValue = this.cargo.items.reduce((total, item) => {
        return total + ((item.value || 0) * item.quantity);
      }, 0);
    }
  }
  
  next();
});

// Method to update order status
OrderSchema.methods.updateStatus = function(status, notes, location, updatedBy) {
  this.status = status;
  
  const statusUpdate = {
    status,
    timestamp: new Date(),
    updatedBy,
    notes,
    automatic: false
  };
  
  if (location) {
    statusUpdate.location = location;
    this.tracking.lastKnownLocation = {
      ...location,
      timestamp: new Date()
    };
  }
  
  this.tracking.statusHistory.push(statusUpdate);
  
  // Update specific timestamps based on status
  if (status === 'delivered') {
    this.tracking.actualDeliveryTime = new Date();
  }
  
  return this.save();
};

// Method to assign driver and vehicle
OrderSchema.methods.assignDriverAndVehicle = function(driverId, vehicleId) {
  this.assignedDriver = driverId;
  this.assignedVehicle = vehicleId;
  this.status = 'assigned';
  
  this.tracking.statusHistory.push({
    status: 'assigned',
    timestamp: new Date(),
    automatic: true
  });
  
  return this.save();
};

// Method to add internal note
OrderSchema.methods.addInternalNote = function(note, addedBy, isPrivate = false) {
  this.internalNotes.push({
    note,
    addedBy,
    addedAt: new Date(),
    private: isPrivate
  });
  
  return this.save();
};

// Method to calculate estimated delivery time
OrderSchema.methods.calculateEstimatedDelivery = function(transitTimeMinutes) {
  if (this.pickup.timeWindow.end && transitTimeMinutes) {
    this.tracking.estimatedDeliveryTime = new Date(
      this.pickup.timeWindow.end.getTime() + (transitTimeMinutes * 60 * 1000)
    );
  }
  return this.save();
};

// Method to cancel order
OrderSchema.methods.cancelOrder = function(reason, cancelledBy, refundAmount = 0) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy,
    reason,
    refundAmount,
    refundStatus: refundAmount > 0 ? 'pending' : undefined
  };
  
  this.tracking.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    updatedBy: cancelledBy,
    notes: reason,
    automatic: false
  });
  
  return this.save();
};

module.exports = mongoose.model('Order', OrderSchema);
