const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  // Product information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  
  // Product classification
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'agriculture',
      'manufacturing',
      'retail',
      'healthcare',
      'construction',
      'food-beverage',
      'textiles',
      'electronics',
      'automotive',
      'chemicals',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  tags: [String],
  
  // Ownership and location
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Inventory must have an owner']
  },
  warehouse: {
    location: {
      name: {
        type: String,
        required: [true, 'Warehouse name is required']
      },
      address: {
        type: String,
        required: [true, 'Warehouse address is required']
      },
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
      contact: {
        name: String,
        phone: String,
        email: String
      }
    },
    zone: String,
    aisle: String,
    shelf: String,
    bin: String
  },
  
  // Stock information
  stock: {
    current: {
      type: Number,
      required: [true, 'Current stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative']
    },
    available: {
      type: Number,
      default: 0,
      min: [0, 'Available quantity cannot be negative']
    },
    minimum: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock level cannot be negative']
    },
    maximum: {
      type: Number,
      min: [0, 'Maximum stock level cannot be negative']
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: [0, 'Reorder point cannot be negative']
    },
    reorderQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reorder quantity cannot be negative']
    }
  },
  
  // Unit and measurements
  unit: {
    base: {
      type: String,
      required: [true, 'Base unit is required'],
      enum: ['piece', 'kg', 'g', 'ton', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen']
    },
    alternative: [{
      unit: String,
      conversion: Number // how many base units = 1 alternative unit
    }]
  },
  
  // Physical properties
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
  weight: {
    value: {
      type: Number,
      min: [0, 'Weight cannot be negative']
    },
    unit: {
      type: String,
      enum: ['g', 'kg', 'ton', 'lb', 'oz'],
      default: 'kg'
    }
  },
  volume: {
    value: {
      type: Number,
      min: [0, 'Volume cannot be negative']
    },
    unit: {
      type: String,
      enum: ['ml', 'l', 'cm3', 'm3', 'in3', 'ft3'],
      default: 'l'
    }
  },
  
  // Pricing information
  pricing: {
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative']
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'XAF']
    },
    priceHistory: [{
      price: Number,
      effectiveDate: Date,
      reason: String
    }]
  },
  
  // Product status and conditions
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out-of-stock', 'low-stock'],
    default: 'active'
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished', 'damaged'],
    default: 'new'
  },
  quality: {
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D']
    },
    certifications: [String],
    inspectionDate: Date,
    inspectedBy: String
  },
  
  // Expiration and batch information
  expiration: {
    hasExpiration: {
      type: Boolean,
      default: false
    },
    expirationDate: Date,
    shelfLife: Number, // in days
    batchNumber: String,
    manufactureDate: Date,
    lotNumber: String
  },
  
  // Storage requirements
  storage: {
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C'
      }
    },
    humidity: {
      min: Number,
      max: Number
    },
    specialConditions: [{
      type: String,
      enum: ['refrigerated', 'frozen', 'dry', 'dark', 'ventilated', 'hazardous'],
      description: String
    }],
    stackable: {
      type: Boolean,
      default: true
    },
    maxStackHeight: Number,
    fragile: {
      type: Boolean,
      default: false
    }
  },
  
  // Supply chain information
  supplier: {
    name: String,
    contact: {
      name: String,
      phone: String,
      email: String
    },
    leadTime: Number, // in days
    minimumOrderQuantity: Number,
    lastOrderDate: Date,
    nextDeliveryDate: Date
  },
  
  // Stock movements and history
  movements: [{
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment', 'damaged', 'expired', 'lost'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: String,
    reference: {
      type: String, // Order ID, Transfer ID, etc.
      sparse: true
    },
    location: {
      from: String,
      to: String
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    documentUrl: String // Receipt, delivery note, etc.
  }],
  
  // Alerts and notifications
  alerts: {
    lowStock: {
      enabled: {
        type: Boolean,
        default: true
      },
      threshold: Number,
      lastAlerted: Date
    },
    expiration: {
      enabled: {
        type: Boolean,
        default: false
      },
      daysBefore: {
        type: Number,
        default: 30
      },
      lastAlerted: Date
    },
    overstock: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: Number,
      lastAlerted: Date
    }
  },
  
  // Analytics and metrics
  analytics: {
    totalIn: {
      type: Number,
      default: 0
    },
    totalOut: {
      type: Number,
      default: 0
    },
    averageDailyUsage: {
      type: Number,
      default: 0
    },
    turnoverRate: {
      type: Number,
      default: 0
    },
    stockoutDays: {
      type: Number,
      default: 0
    },
    lastSoldDate: Date,
    fastMoving: {
      type: Boolean,
      default: false
    }
  },
  
  // Digital assets
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['manual', 'certificate', 'specification', 'warranty', 'other']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Custom fields for different industries
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'boolean', 'date', 'list']
    }
  }],
  
  // Audit trail
  audit: {
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for stock availability
InventorySchema.virtual('stockAvailable').get(function() {
  return Math.max(0, this.stock.current - this.stock.reserved);
});

// Virtual for stock status
InventorySchema.virtual('stockStatus').get(function() {
  const available = this.stockAvailable;
  if (available <= 0) return 'out-of-stock';
  if (available <= this.stock.reorderPoint) return 'low-stock';
  if (this.stock.maximum && available >= this.stock.maximum) return 'overstock';
  return 'in-stock';
});

// Virtual for days until expiration
InventorySchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expiration.hasExpiration || !this.expiration.expirationDate) return null;
  const now = new Date();
  const expiration = new Date(this.expiration.expirationDate);
  return Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
InventorySchema.virtual('isExpired').get(function() {
  const daysUntil = this.daysUntilExpiration;
  return daysUntil !== null && daysUntil < 0;
});

// Virtual for total value
InventorySchema.virtual('totalValue').get(function() {
  return this.stock.current * (this.pricing.price || 0);
});

// Indexes for efficient querying
InventorySchema.index({ owner: 1 });
InventorySchema.index({ category: 1 });
InventorySchema.index({ status: 1 });
InventorySchema.index({ 'stock.current': 1 });
InventorySchema.index({ 'expiration.expirationDate': 1 });
InventorySchema.index({ 'warehouse.location.coordinates': '2dsphere' });

// Pre-save middleware to calculate available stock and update analytics
InventorySchema.pre('save', function(next) {
  // Calculate available stock
  this.stock.available = Math.max(0, this.stock.current - this.stock.reserved);
  
  // Update status based on stock levels
  if (this.stock.available <= 0) {
    this.status = 'out-of-stock';
  } else if (this.stock.available <= this.stock.reorderPoint) {
    this.status = 'low-stock';
  } else if (this.status === 'out-of-stock' || this.status === 'low-stock') {
    this.status = 'active';
  }
  
  // Update audit trail
  if (this.isModified() && !this.isNew) {
    this.audit.lastModifiedAt = new Date();
    this.audit.version += 1;
  }
  
  next();
});

// Method to add stock movement
InventorySchema.methods.addMovement = function(type, quantity, reason, user, reference = null, notes = null) {
  const movement = {
    type,
    quantity: Math.abs(quantity),
    reason,
    user,
    reference,
    notes,
    timestamp: new Date()
  };
  
  this.movements.push(movement);
  
  // Update stock based on movement type
  if (type === 'in' || type === 'adjustment' && quantity > 0) {
    this.stock.current += Math.abs(quantity);
    this.analytics.totalIn += Math.abs(quantity);
  } else if (['out', 'damaged', 'expired', 'lost'].includes(type) || (type === 'adjustment' && quantity < 0)) {
    this.stock.current = Math.max(0, this.stock.current - Math.abs(quantity));
    this.analytics.totalOut += Math.abs(quantity);
    
    if (type === 'out') {
      this.analytics.lastSoldDate = new Date();
    }
  }
  
  return this.save();
};

// Method to reserve stock
InventorySchema.methods.reserveStock = function(quantity, reason, user) {
  if (quantity > this.stockAvailable) {
    throw new Error('Insufficient stock available for reservation');
  }
  
  this.stock.reserved += quantity;
  
  this.movements.push({
    type: 'out',
    quantity,
    reason: `Reserved: ${reason}`,
    user,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to release reserved stock
InventorySchema.methods.releaseReservedStock = function(quantity, reason, user) {
  const releaseQuantity = Math.min(quantity, this.stock.reserved);
  this.stock.reserved -= releaseQuantity;
  
  this.movements.push({
    type: 'in',
    quantity: releaseQuantity,
    reason: `Released: ${reason}`,
    user,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to update pricing
InventorySchema.methods.updatePrice = function(newPrice, reason, effectiveDate = new Date()) {
  this.pricing.priceHistory.push({
    price: this.pricing.price,
    effectiveDate: new Date(),
    reason: 'Price update'
  });
  
  this.pricing.price = newPrice;
  
  this.pricing.priceHistory.push({
    price: newPrice,
    effectiveDate,
    reason
  });
  
  return this.save();
};

// Method to check and create alerts
InventorySchema.methods.checkAlerts = async function() {
  const alerts = [];
  const now = new Date();
  
  // Low stock alert
  if (this.alerts.lowStock.enabled && this.stockAvailable <= (this.alerts.lowStock.threshold || this.stock.reorderPoint)) {
    const daysSinceLastAlert = this.alerts.lowStock.lastAlerted 
      ? Math.floor((now - this.alerts.lowStock.lastAlerted) / (1000 * 60 * 60 * 24))
      : null;
    
    if (!daysSinceLastAlert || daysSinceLastAlert >= 1) {
      alerts.push({
        type: 'low-stock',
        message: `Low stock alert for ${this.name} (${this.sku}). Current: ${this.stockAvailable} units`,
        priority: 'high'
      });
      this.alerts.lowStock.lastAlerted = now;
    }
  }
  
  // Expiration alert
  if (this.alerts.expiration.enabled && this.expiration.hasExpiration && this.expiration.expirationDate) {
    const daysUntilExpiration = this.daysUntilExpiration;
    if (daysUntilExpiration <= this.alerts.expiration.daysBefore) {
      const daysSinceLastAlert = this.alerts.expiration.lastAlerted 
        ? Math.floor((now - this.alerts.expiration.lastAlerted) / (1000 * 60 * 60 * 24))
        : null;
      
      if (!daysSinceLastAlert || daysSinceLastAlert >= 1) {
        alerts.push({
          type: 'expiration',
          message: `${this.name} (${this.sku}) expires in ${daysUntilExpiration} days`,
          priority: daysUntilExpiration <= 7 ? 'urgent' : 'medium'
        });
        this.alerts.expiration.lastAlerted = now;
      }
    }
  }
  
  // Overstock alert
  if (this.alerts.overstock.enabled && this.stock.maximum && this.stock.current >= (this.alerts.overstock.threshold || this.stock.maximum)) {
    const daysSinceLastAlert = this.alerts.overstock.lastAlerted 
      ? Math.floor((now - this.alerts.overstock.lastAlerted) / (1000 * 60 * 60 * 24))
      : null;
    
    if (!daysSinceLastAlert || daysSinceLastAlert >= 7) {
      alerts.push({
        type: 'overstock',
        message: `Overstock alert for ${this.name} (${this.sku}). Current: ${this.stock.current} units`,
        priority: 'low'
      });
      this.alerts.overstock.lastAlerted = now;
    }
  }
  
  if (alerts.length > 0) {
    await this.save();
  }
  
  return alerts;
};

// Static method to get low stock items
InventorySchema.statics.getLowStockItems = function(owner = null) {
  const query = {
    $expr: { $lte: ['$stock.available', '$stock.reorderPoint'] },
    status: 'active'
  };
  
  if (owner) {
    query.owner = owner;
  }
  
  return this.find(query).populate('owner', 'firstName lastName email');
};

// Static method to get expiring items
InventorySchema.statics.getExpiringItems = function(days = 30, owner = null) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const query = {
    'expiration.hasExpiration': true,
    'expiration.expirationDate': { $lte: futureDate },
    status: 'active'
  };
  
  if (owner) {
    query.owner = owner;
  }
  
  return this.find(query).populate('owner', 'firstName lastName email');
};

module.exports = mongoose.model('Inventory', InventorySchema);
