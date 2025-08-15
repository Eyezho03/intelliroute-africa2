const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: [
      'admin',
      'driver', 
      'fleet-manager',
      'producer',
      'wholesaler',
      'retailer'
    ],
    required: [true, 'Please specify a role'],
    default: 'driver'
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please add a valid phone number']
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Role-specific fields
  profile: {
    // Driver specific
    licenseNumber: String,
    licenseExpiry: Date,
    vehicleType: String,
    experience: Number, // years of experience
    
    // Business specific (producer, wholesaler, retailer)
    businessName: String,
    businessRegistration: String,
    businessType: {
      type: String,
      enum: ['agriculture', 'manufacturing', 'retail', 'wholesale', 'distribution']
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    // Fleet manager specific
    fleetSize: Number,
    managedDrivers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    
    // General profile info
    bio: String,
    website: String,
    socialMedia: {
      facebook: String,
      twitter: String,
      linkedin: String
    }
  },
  
  // Location tracking
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
  
  // Activity tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'fr', 'sw', 'ar'] // English, French, Swahili, Arabic
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    }
  },
  
  // Performance metrics
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
  
  // Verification status
  verification: {
    identity: {
      type: Boolean,
      default: false
    },
    business: {
      type: Boolean,
      default: false
    },
    license: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.emailVerificationToken = verificationToken;
  return verificationToken;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.resetPasswordToken = resetToken;
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Update last login
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);
