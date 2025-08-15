const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedAdminUser = async () => {
  try {
    console.log('Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@intelliroute.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    const adminUser = new User({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@intelliroute.com',
      password: 'admin123',
      role: 'admin',
      phone: '+254700000000',
      isEmailVerified: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@intelliroute.com');
    console.log('🔐 Password: admin123');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

const seedSampleUsers = async () => {
  try {
    console.log('Creating sample users...');

    const users = [
      {
        firstName: 'John',
        lastName: 'Driver',
        email: 'driver@intelliroute.com',
        password: 'driver123',
        role: 'driver',
        phone: '+254700000001',
        isEmailVerified: true,
        profile: {
          licenseNumber: 'DL001234',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      },
      {
        firstName: 'Jane',
        lastName: 'FleetManager',
        email: 'fleet@intelliroute.com',
        password: 'fleet123',
        role: 'fleet-manager',
        phone: '+254700000002',
        isEmailVerified: true
      },
      {
        firstName: 'Producer',
        lastName: 'Fresh',
        email: 'producer@intelliroute.com',
        password: 'producer123',
        role: 'producer',
        phone: '+254700000003',
        isEmailVerified: true
      },
      {
        firstName: 'Customer',
        lastName: 'One',
        email: 'customer@intelliroute.com',
        password: 'customer123',
        role: 'retailer',
        phone: '+254700000004',
        isEmailVerified: true
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created ${userData.role}: ${userData.email}`);
      } else {
        console.log(`${userData.role} already exists: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error('Error creating sample users:', error);
    throw error;
  }
};

const seedSampleVehicles = async () => {
  try {
    console.log('Creating sample vehicles...');

    // Get admin user as owner
    const admin = await User.findOne({ email: 'admin@intelliroute.com' });
    const fleetManager = await User.findOne({ role: 'fleet-manager' });
    
    if (!admin) {
      console.log('No admin found, skipping vehicle creation');
      return;
    }

    const vehicles = [
      {
        registrationNumber: 'KBZ-001A',
        type: 'truck',
        make: 'Isuzu',
        model: 'NPR',
        year: 2020,
        capacity: {
          weight: 5000,
          volume: 25
        },
        fuelType: 'diesel',
        status: 'available',
        owner: admin._id,
        fleetManager: fleetManager?._id,
        currentLocation: {
          coordinates: {
            lat: -1.2921,
            lng: 36.8219
          },
          address: 'Nairobi, Kenya'
        }
      },
      {
        registrationNumber: 'KBZ-002B',
        type: 'van',
        make: 'Toyota',
        model: 'Hiace',
        year: 2021,
        capacity: {
          weight: 2000,
          volume: 15
        },
        fuelType: 'petrol',
        status: 'available',
        owner: admin._id,
        fleetManager: fleetManager?._id,
        currentLocation: {
          coordinates: {
            lat: -4.0435,
            lng: 39.6682
          },
          address: 'Mombasa, Kenya'
        }
      },
      {
        registrationNumber: 'KBZ-003C',
        type: 'pickup',
        make: 'Ford',
        model: 'Ranger',
        year: 2019,
        capacity: {
          weight: 1000,
          volume: 8
        },
        fuelType: 'diesel',
        status: 'available',
        owner: admin._id,
        currentLocation: {
          coordinates: {
            lat: -0.3031,
            lng: 36.0667
          },
          address: 'Nakuru, Kenya'
        }
      }
    ];

    for (const vehicleData of vehicles) {
      const existingVehicle = await Vehicle.findOne({ registrationNumber: vehicleData.registrationNumber });
      if (!existingVehicle) {
        const vehicle = new Vehicle(vehicleData);
        await vehicle.save();
        console.log(`✅ Created vehicle: ${vehicleData.registrationNumber}`);
      } else {
        console.log(`Vehicle already exists: ${vehicleData.registrationNumber}`);
      }
    }
  } catch (error) {
    console.error('Error creating sample vehicles:', error);
    throw error;
  }
};

const seedSampleInventory = async () => {
  try {
    console.log('Creating sample inventory...');

    const producer = await User.findOne({ role: 'producer' });
    if (!producer) {
      console.log('No producer found, skipping inventory creation');
      return;
    }

    const inventoryItems = [
      {
        name: 'Fresh Tomatoes',
        description: 'Fresh red tomatoes from Nakuru farms',
        sku: 'TOM-001',
        category: 'agriculture',
        subcategory: 'vegetables',
        owner: producer._id,
        warehouse: {
          location: {
            name: 'Nakuru Central Warehouse',
            address: 'Nakuru Industrial Area, Kenya',
            coordinates: {
              lat: -0.3031,
              lng: 36.0667
            }
          },
          zone: 'Cold Storage',
          aisle: 'A1',
          shelf: '01'
        },
        stock: {
          current: 500,
          minimum: 100,
          maximum: 1000,
          reorderPoint: 200,
          reorderQuantity: 500
        },
        unit: {
          base: 'kg'
        },
        pricing: {
          cost: 60,
          price: 80,
          currency: 'KES'
        },
        expiration: {
          hasExpiration: true,
          expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          shelfLife: 7
        },
        storage: {
          temperature: {
            min: 2,
            max: 8,
            unit: 'C'
          },
          specialConditions: ['refrigerated']
        }
      },
      {
        name: 'Green Beans',
        description: 'Fresh green beans',
        sku: 'GRB-001',
        category: 'agriculture',
        subcategory: 'vegetables',
        owner: producer._id,
        warehouse: {
          location: {
            name: 'Nakuru Central Warehouse',
            address: 'Nakuru Industrial Area, Kenya',
            coordinates: {
              lat: -0.3031,
              lng: 36.0667
            }
          },
          zone: 'Cold Storage',
          aisle: 'A1',
          shelf: '02'
        },
        stock: {
          current: 300,
          minimum: 50,
          maximum: 500,
          reorderPoint: 100,
          reorderQuantity: 250
        },
        unit: {
          base: 'kg'
        },
        pricing: {
          cost: 90,
          price: 120,
          currency: 'KES'
        },
        expiration: {
          hasExpiration: true,
          expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          shelfLife: 5
        },
        storage: {
          temperature: {
            min: 2,
            max: 8,
            unit: 'C'
          },
          specialConditions: ['refrigerated']
        }
      },
      {
        name: 'Maize Grain',
        description: 'Dry maize grains, Grade A',
        sku: 'MAI-001',
        category: 'agriculture',
        subcategory: 'grains',
        owner: producer._id,
        warehouse: {
          location: {
            name: 'Nakuru Central Warehouse',
            address: 'Nakuru Industrial Area, Kenya',
            coordinates: {
              lat: -0.3031,
              lng: 36.0667
            }
          },
          zone: 'Dry Storage',
          aisle: 'B1',
          shelf: '01'
        },
        stock: {
          current: 100,
          minimum: 20,
          maximum: 200,
          reorderPoint: 30,
          reorderQuantity: 100
        },
        unit: {
          base: 'kg'
        },
        pricing: {
          cost: 45,
          price: 60,
          currency: 'KES'
        },
        expiration: {
          hasExpiration: true,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          shelfLife: 365
        },
        storage: {
          temperature: {
            min: 15,
            max: 25,
            unit: 'C'
          },
          humidity: {
            min: 10,
            max: 14
          },
          specialConditions: ['dry']
        },
        quality: {
          grade: 'A',
          certifications: ['Organic', 'Fair Trade']
        }
      }
    ];

    for (const itemData of inventoryItems) {
      const existingItem = await Inventory.findOne({ 
        sku: itemData.sku
      });
      if (!existingItem) {
        const item = new Inventory(itemData);
        await item.save();
        console.log(`✅ Created inventory item: ${itemData.name}`);
      } else {
        console.log(`Inventory item already exists: ${itemData.name}`);
      }
    }
  } catch (error) {
    console.error('Error creating sample inventory:', error);
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    console.log('⚠️  Clearing existing data...');
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Route.deleteMany({});
    await Order.deleteMany({});
    await Inventory.deleteMany({});
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Check if we should clear database
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearDatabase();
    }

    await seedAdminUser();
    await seedSampleUsers();
    await seedSampleVehicles();
    await seedSampleInventory();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('Admin: admin@intelliroute.com / admin123');
    console.log('Driver: driver@intelliroute.com / driver123');
    console.log('Fleet Manager: fleet@intelliroute.com / fleet123');
    console.log('Producer: producer@intelliroute.com / producer123');
    console.log('Customer: customer@intelliroute.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
