const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Notification identification
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  // Notification type and category
  type: {
    type: String,
    enum: [
      'order',
      'route',
      'vehicle',
      'driver',
      'maintenance',
      'payment',
      'system',
      'promotional',
      'alert',
      'reminder',
      'update'
    ],
    required: [true, 'Notification type is required']
  },
  category: {
    type: String,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'urgent'
    ],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Notification sender and recipients
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  recipients: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    dismissed: {
      type: Boolean,
      default: false
    },
    dismissedAt: Date,
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date
  }],
  
  // Notification targeting
  targetRoles: [{
    type: String,
    enum: ['admin', 'driver', 'fleet-manager', 'producer', 'wholesaler', 'retailer']
  }],
  targetUsers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  
  // Related entities
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Order', 'Route', 'Vehicle', 'User', 'Payment']
    },
    entityId: mongoose.Schema.ObjectId
  },
  
  // Notification delivery channels
  channels: {
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date
    },
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      failureReason: String
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      failureReason: String
    },
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      failureReason: String
    }
  },
  
  // Notification scheduling
  scheduling: {
    sendAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    recurring: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly']
      },
      endDate: Date,
      lastSent: Date,
      nextSend: Date
    }
  },
  
  // Notification status
  status: {
    type: String,
    enum: [
      'draft',
      'scheduled',
      'sending',
      'sent',
      'delivered',
      'failed',
      'cancelled',
      'expired'
    ],
    default: 'draft'
  },
  
  // Action buttons and interactions
  actions: [{
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['url', 'api', 'dismiss', 'custom'],
      required: true
    },
    url: String,
    apiEndpoint: String,
    apiMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE']
    },
    payload: mongoose.Schema.Types.Mixed,
    style: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'warning', 'danger'],
      default: 'primary'
    }
  }],
  
  // Rich content
  content: {
    html: String,
    markdown: String,
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    images: [{
      url: String,
      alt: String,
      caption: String
    }]
  },
  
  // Notification metadata
  metadata: {
    source: String, // system, api, manual
    correlationId: String, // for tracking related notifications
    tags: [String],
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Analytics and tracking
  analytics: {
    sentCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    readCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    dismissCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    }
  },
  
  // Auto-actions
  autoActions: {
    markAsRead: {
      after: Number, // minutes after delivery
      enabled: {
        type: Boolean,
        default: false
      }
    },
    autoExpire: {
      after: Number, // minutes after sending
      enabled: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for read percentage
NotificationSchema.virtual('readPercentage').get(function() {
  if (this.recipients.length === 0) return 0;
  const readCount = this.recipients.filter(r => r.read).length;
  return Math.round((readCount / this.recipients.length) * 100);
});

// Virtual for delivery percentage
NotificationSchema.virtual('deliveryPercentage').get(function() {
  if (this.recipients.length === 0) return 0;
  const deliveredCount = this.recipients.filter(r => r.delivered).length;
  return Math.round((deliveredCount / this.recipients.length) * 100);
});

// Virtual for notification age
NotificationSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60)); // minutes
});

// Virtual for is expired
NotificationSchema.virtual('isExpired').get(function() {
  if (this.scheduling.expiresAt) {
    return new Date() > this.scheduling.expiresAt;
  }
  return false;
});

// Indexes for efficient querying
NotificationSchema.index({ 'recipients.user': 1 });
NotificationSchema.index({ type: 1, category: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ 'scheduling.sendAt': 1 });
NotificationSchema.index({ 'scheduling.expiresAt': 1 });
NotificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });
NotificationSchema.index({ targetRoles: 1 });

// Method to mark as read for a specific user
NotificationSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient && !recipient.read) {
    recipient.read = true;
    recipient.readAt = new Date();
    this.analytics.readCount += 1;
  }
  return this.save();
};

// Method to mark as dismissed for a specific user
NotificationSchema.methods.markAsDismissed = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient && !recipient.dismissed) {
    recipient.dismissed = true;
    recipient.dismissedAt = new Date();
    this.analytics.dismissCount += 1;
  }
  return this.save();
};

// Method to add recipient
NotificationSchema.methods.addRecipient = function(userId) {
  const existingRecipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (!existingRecipient) {
    this.recipients.push({
      user: userId,
      read: false,
      dismissed: false,
      delivered: false
    });
  }
  return this.save();
};

// Method to send notification
NotificationSchema.methods.send = async function() {
  this.status = 'sending';
  this.analytics.sentCount = this.recipients.length;
  
  // Mark all recipients as delivered for in-app notifications
  if (this.channels.inApp.enabled) {
    this.recipients.forEach(recipient => {
      if (!recipient.delivered) {
        recipient.delivered = true;
        recipient.deliveredAt = new Date();
      }
    });
    this.channels.inApp.delivered = true;
    this.channels.inApp.deliveredAt = new Date();
    this.analytics.deliveredCount = this.recipients.length;
  }
  
  this.status = 'sent';
  return this.save();
};

// Method to schedule notification
NotificationSchema.methods.schedule = function(sendAt, expiresAt = null) {
  this.scheduling.sendAt = sendAt;
  if (expiresAt) {
    this.scheduling.expiresAt = expiresAt;
  }
  this.status = 'scheduled';
  return this.save();
};

// Method to cancel notification
NotificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Method to expire notification
NotificationSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

// Static method to get unread count for user
NotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipients.user': userId,
    'recipients.read': false,
    status: { $in: ['sent', 'delivered'] },
    $or: [
      { 'scheduling.expiresAt': { $exists: false } },
      { 'scheduling.expiresAt': { $gt: new Date() } }
    ]
  });
};

// Static method to get notifications for user
NotificationSchema.statics.getForUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null,
    category = null
  } = options;

  const query = {
    'recipients.user': userId,
    status: { $in: ['sent', 'delivered'] },
    $or: [
      { 'scheduling.expiresAt': { $exists: false } },
      { 'scheduling.expiresAt': { $gt: new Date() } }
    ]
  };

  if (unreadOnly) {
    query['recipients.read'] = false;
  }

  if (type) {
    query.type = type;
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('sender', 'firstName lastName email avatar')
    .populate('relatedEntity.entityId');
};

// Static method to create and send notification
NotificationSchema.statics.createAndSend = async function(notificationData) {
  const notification = new this(notificationData);
  await notification.save();
  await notification.send();
  return notification;
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Auto-set sendAt if not provided and status is not draft
  if (!this.scheduling.sendAt && this.status !== 'draft') {
    this.scheduling.sendAt = new Date();
  }
  
  // Update analytics counts based on recipients
  if (this.isModified('recipients')) {
    this.analytics.readCount = this.recipients.filter(r => r.read).length;
    this.analytics.deliveredCount = this.recipients.filter(r => r.delivered).length;
    this.analytics.dismissCount = this.recipients.filter(r => r.dismissed).length;
  }
  
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
