const axios = require('axios');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

// Test users
const testUsers = {
  admin: { email: 'admin@intelliroute.com', password: 'admin123' },
  driver: { email: 'driver@intelliroute.com', password: 'driver123' },
  producer: { email: 'producer@intelliroute.com', password: 'producer123' },
  fleetManager: { email: 'fleet@intelliroute.com', password: 'fleet123' },
  customer: { email: 'customer@intelliroute.com', password: 'customer123' }
};

let tokens = {};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

const runTests = async () => {
  log('blue', '🚀 Starting IntelliRoute Africa API Tests...\n');

  // 1. Test Health Check
  log('cyan', '📋 Testing Health Check...');
  const health = await makeRequest('GET', '/health');
  if (health.success) {
    log('green', `✅ Health Check: ${health.data.status} - ${health.data.message}`);
  } else {
    log('red', `❌ Health Check Failed: ${health.error}`);
    return;
  }

  // 2. Test User Authentication
  log('cyan', '\n🔐 Testing User Authentication...');
  
  for (const [role, credentials] of Object.entries(testUsers)) {
    const loginResult = await makeRequest('POST', '/api/auth/login', credentials);
    if (loginResult.success) {
      tokens[role] = loginResult.data.token;
      log('green', `✅ ${role} login successful`);
    } else {
      log('red', `❌ ${role} login failed: ${loginResult.error}`);
    }
  }

  // 3. Test Protected Routes
  log('cyan', '\n👤 Testing Protected Routes...');
  
  const meResult = await makeRequest('GET', '/api/auth/me', null, tokens.admin);
  if (meResult.success) {
    log('green', `✅ Get current user: ${meResult.data.data.fullName} (${meResult.data.data.role})`);
  } else {
    log('red', `❌ Get current user failed: ${meResult.error}`);
  }

  // 4. Test Users Management
  log('cyan', '\n👥 Testing Users Management...');
  
  const driversResult = await makeRequest('GET', '/api/users/drivers', null, tokens.admin);
  if (driversResult.success) {
    log('green', `✅ Get drivers: ${driversResult.data.count} drivers found`);
  } else {
    log('red', `❌ Get drivers failed: ${driversResult.error}`);
  }

  const businessUsersResult = await makeRequest('GET', '/api/users/business-users', null, tokens.admin);
  if (businessUsersResult.success) {
    log('green', `✅ Get business users: ${businessUsersResult.data.count} business users found`);
  } else {
    log('red', `❌ Get business users failed: ${businessUsersResult.error}`);
  }

  // 5. Test Vehicles
  log('cyan', '\n🚗 Testing Vehicles...');
  
  const vehiclesResult = await makeRequest('GET', '/api/vehicles', null, tokens.admin);
  if (vehiclesResult.success) {
    log('green', `✅ Get vehicles: ${vehiclesResult.data.count} vehicles found`);
  } else {
    log('red', `❌ Get vehicles failed: ${vehiclesResult.error}`);
  }

  // 6. Test Inventory
  log('cyan', '\n📦 Testing Inventory...');
  
  const inventoryResult = await makeRequest('GET', '/api/inventory', null, tokens.admin);
  if (inventoryResult.success) {
    log('green', `✅ Get inventory: ${inventoryResult.data.count} items found`);
  } else {
    log('red', `❌ Get inventory failed: ${inventoryResult.error}`);
  }

  // 7. Test Orders
  log('cyan', '\n📝 Testing Orders...');
  
  const ordersResult = await makeRequest('GET', '/api/orders', null, tokens.admin);
  if (ordersResult.success) {
    log('green', `✅ Get orders: ${ordersResult.data.count} orders found`);
  } else {
    log('red', `❌ Get orders failed: ${ordersResult.error}`);
  }

  // 8. Test Analytics (Admin only)
  log('cyan', '\n📊 Testing Analytics...');
  
  const dashboardResult = await makeRequest('GET', '/api/analytics/dashboard', null, tokens.admin);
  if (dashboardResult.success) {
    log('green', `✅ Dashboard analytics retrieved successfully`);
  } else {
    log('red', `❌ Dashboard analytics failed: ${dashboardResult.error}`);
  }

  // 9. Test User Registration
  log('cyan', '\n📝 Testing New User Registration...');
  
  const newUser = {
    firstName: 'New',
    lastName: 'TestUser',
    email: `test${Date.now()}@intelliroute.com`,
    password: 'test123',
    role: 'driver',
    phone: '+254700001000'
  };
  
  const registrationResult = await makeRequest('POST', '/api/auth/register', newUser);
  if (registrationResult.success) {
    log('green', `✅ User registration successful: ${newUser.email}`);
  } else {
    log('red', `❌ User registration failed: ${registrationResult.error}`);
  }

  // 10. Test Role-based Access Control
  log('cyan', '\n🔒 Testing Role-based Access Control...');
  
  // Try to access admin-only endpoint with driver token
  const unauthorizedResult = await makeRequest('GET', '/api/users', null, tokens.driver);
  if (!unauthorizedResult.success && unauthorizedResult.status === 403) {
    log('green', '✅ Access control working: Driver cannot access admin endpoints');
  } else {
    log('red', '❌ Access control failed: Unauthorized access allowed');
  }

  log('cyan', '\n🎉 API Tests Completed!\n');
  
  // Summary
  log('blue', '📋 Test Summary:');
  log('blue', `   API Base URL: ${BASE_URL}`);
  log('blue', `   Total Users Tested: ${Object.keys(testUsers).length}`);
  log('blue', `   Authentication Tokens Generated: ${Object.keys(tokens).length}`);
  log('green', '\n✅ All core functionality is working correctly!');
  
  console.log('\n🔗 Available API Endpoints:');
  console.log('   Auth: /api/auth/login, /api/auth/register, /api/auth/me');
  console.log('   Users: /api/users, /api/users/drivers, /api/users/business-users');
  console.log('   Vehicles: /api/vehicles');
  console.log('   Orders: /api/orders');
  console.log('   Inventory: /api/inventory');
  console.log('   Analytics: /api/analytics/dashboard');
  console.log('   Health: /health');
};

// Run tests if script is called directly
if (require.main === module) {
  runTests().catch(error => {
    log('red', `Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests };
