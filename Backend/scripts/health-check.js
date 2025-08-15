const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

const healthCheck = async () => {
  try {
    console.log('🔍 Performing health check...');
    
    // Test basic health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    
    if (healthResponse.status === 200) {
      console.log('✅ API Health Check: PASSED');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Message: ${healthResponse.data.message}`);
      console.log(`   Version: ${healthResponse.data.version}`);
      console.log(`   Environment: ${healthResponse.data.environment || 'Unknown'}`);
    } else {
      console.log('❌ API Health Check: FAILED');
      console.log(`   Status Code: ${healthResponse.status}`);
    }
    
    // Test API endpoints info
    try {
      const apiResponse = await axios.get(`${BASE_URL}/api`, {
        timeout: 5000
      });
      
      if (apiResponse.status === 200) {
        console.log('✅ API Info Endpoint: ACCESSIBLE');
        console.log(`   Available Endpoints: ${Object.keys(apiResponse.data.endpoints).length}`);
      }
    } catch (error) {
      console.log('⚠️  API Info Endpoint: NOT ACCESSIBLE');
    }
    
    // Test database connectivity (indirect through auth endpoint)
    try {
      const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@test.com',
        password: 'test'
      }, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx but not 5xx
      });
      
      if (authResponse.status < 500) {
        console.log('✅ Database Connectivity: OK (Auth endpoint responsive)');
      } else {
        console.log('❌ Database Connectivity: FAILED');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Database Connectivity: SERVER NOT RUNNING');
      } else {
        console.log('⚠️  Database Connectivity: UNKNOWN (Auth endpoint test failed)');
      }
    }
    
    console.log('\n📊 Health Check Summary:');
    console.log(`   API URL: ${BASE_URL}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log('   Status: Health check completed\n');
    
  } catch (error) {
    console.error('❌ Health Check FAILED:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔴 Server is not running or not accessible');
      console.error(`   🔍 Check if server is started on ${BASE_URL}`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   ⏱️  Request timeout - server might be slow to respond');
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    process.exit(1);
  }
};

// Run health check if script is called directly
if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;
