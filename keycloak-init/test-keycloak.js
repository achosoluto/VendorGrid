/**
 * Keycloak Infrastructure Testing Script
 * 
 * This script tests all Keycloak components and integration points
 * to ensure Phase 2 setup is complete and ready for Phase 3 migration.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  keycloak: {
    baseUrl: 'http://localhost:8080',
    adminUser: 'admin',
    adminPassword: 'admin123',
    realm: 'vendorgrid'
  },
  timeouts: {
    connection: 5000,
    response: 10000
  }
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: config.timeouts.response,
      ...options
    };

    if (options.headers) {
      requestOptions.headers = options.headers;
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          json: () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              return null;
            }
          }
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.data) {
      req.write(options.data);
    }

    req.end();
  });
}

function addResult(name, passed, message, details = {}) {
  const result = { name, passed, message, details, timestamp: new Date() };
  results.tests.push(result);
  
  if (passed) {
    results.passed++;
    log(`✅ ${name}: ${message}`, 'green');
  } else {
    results.failed++;
    log(`❌ ${name}: ${message}`, 'red');
  }
}

function addWarning(name, message, details = {}) {
  const result = { name, passed: 'warning', message, details, timestamp: new Date() };
  results.tests.push(result);
  results.warnings++;
  log(`⚠️  ${name}: ${message}`, 'yellow');
}

// Test functions
async function testKeycloakAvailability() {
  try {
    const response = await makeRequest(`${config.keycloak.baseUrl}/realms/master`);
    addResult(
      'Keycloak Availability',
      response.statusCode === 200,
      `Master realm accessible (Status: ${response.statusCode})`,
      { statusCode: response.statusCode, responseTime: response.responseTime }
    );
  } catch (error) {
    addResult(
      'Keycloak Availability',
      false,
      `Keycloak not accessible: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testAdminConsole() {
  try {
    const response = await makeRequest(`${config.keycloak.baseUrl}/admin`);
    addResult(
      'Admin Console',
      response.statusCode === 200,
      `Admin console accessible (Status: ${response.statusCode})`,
      { statusCode: response.statusCode }
    );
  } catch (error) {
    addResult(
      'Admin Console',
      false,
      `Admin console not accessible: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testVendorGridRealm() {
  try {
    const response = await makeRequest(`${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`);
    addResult(
      'VendorGrid Realm',
      response.statusCode === 200,
      `VendorGrid realm accessible (Status: ${response.statusCode})`,
      { statusCode: response.statusCode }
    );
  } catch (error) {
    addResult(
      'VendorGrid Realm',
      false,
      `VendorGrid realm not accessible: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testOpenIDConnectDiscovery() {
  try {
    const response = await makeRequest(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/.well-known/openid_configuration`
    );
    
    if (response.statusCode === 200) {
      const config_data = response.json();
      const requiredFields = [
        'issuer', 'authorization_endpoint', 'token_endpoint', 
        'userinfo_endpoint', 'jwks_uri'
      ];
      
      const missingFields = requiredFields.filter(field => !config_data || !config_data[field]);
      
      if (missingFields.length === 0) {
        addResult(
          'OIDC Discovery',
          true,
          'All OIDC endpoints available',
          { 
            issuer: config_data.issuer,
            token_endpoint: config_data.token_endpoint,
            userinfo_endpoint: config_data.userinfo_endpoint
          }
        );
      } else {
        addResult(
          'OIDC Discovery',
          false,
          `Missing OIDC fields: ${missingFields.join(', ')}`,
          { missingFields }
        );
      }
    } else {
      addResult(
        'OIDC Discovery',
        false,
        `OIDC discovery failed (Status: ${response.statusCode})`,
        { statusCode: response.statusCode }
      );
    }
  } catch (error) {
    addResult(
      'OIDC Discovery',
      false,
      `OIDC discovery error: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testJWKSEndpoint() {
  try {
    const response = await makeRequest(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`
    );
    
    if (response.statusCode === 200) {
      const jwks = response.json();
      if (jwks.keys && Array.isArray(jwks.keys) && jwks.keys.length > 0) {
        addResult(
          'JWKS Endpoint',
          true,
          `JWKS available with ${jwks.keys.length} key(s)`,
          { keyCount: jwks.keys.length }
        );
      } else {
        addResult(
          'JWKS Endpoint',
          false,
          'JWKS response missing keys',
          { response: jwks }
        );
      }
    } else {
      addResult(
        'JWKS Endpoint',
        false,
        `JWKS endpoint failed (Status: ${response.statusCode})`,
        { statusCode: response.statusCode }
      );
    }
  } catch (error) {
    addResult(
      'JWKS Endpoint',
      false,
      `JWKS endpoint error: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testTokenEndpoint() {
  try {
    const response = await makeRequest(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: 'grant_type=client_credentials&client_id=vendorgrid-app&client_secret=test'
      }
    );
    
    if (response.statusCode === 401) {
      addResult(
        'Token Endpoint',
        true,
        'Token endpoint accessible (authentication required)',
        { statusCode: response.statusCode }
      );
    } else {
      addResult(
        'Token Endpoint',
        response.statusCode === 400,
        `Token endpoint status: ${response.statusCode} (expected 400 for bad credentials)`,
        { statusCode: response.statusCode }
      );
    }
  } catch (error) {
    addResult(
      'Token Endpoint',
      false,
      `Token endpoint error: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testUserInfoEndpoint() {
  try {
    const response = await makeRequest(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/userinfo`
    );
    
    if (response.statusCode === 401) {
      addResult(
        'UserInfo Endpoint',
        true,
        'UserInfo endpoint accessible (authentication required)',
        { statusCode: response.statusCode }
      );
    } else {
      addResult(
        'UserInfo Endpoint',
        response.statusCode === 400,
        `UserInfo endpoint status: ${response.statusCode} (expected 400 for missing token)`,
        { statusCode: response.statusCode }
      );
    }
  } catch (error) {
    addResult(
      'UserInfo Endpoint',
      false,
      `UserInfo endpoint error: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testDatabaseConnectivity() {
  // This would require a direct database connection test
  // For now, we'll test if the service is accessible
  try {
    const response = await makeRequest('http://localhost:5433');
    addResult(
      'Keycloak Database',
      response.statusCode === 200 || response.statusCode === 501,
      'Keycloak database service accessible',
      { statusCode: response.statusCode }
    );
  } catch (error) {
    addResult(
      'Keycloak Database',
      false,
      `Database connection issue: ${error.message}`,
      { error: error.message }
    );
  }
}

async function testEnvironmentVariables() {
  // Test if environment variables are properly configured
  const requiredVars = [
    'KEYCLOAK_BASE_URL',
    'KEYCLOAK_REALM', 
    'KEYCLOAK_CLIENT_ID',
    'KEYCLOAK_AUTH_URL',
    'KEYCLOAK_TOKEN_URL'
  ];
  
  const missingVars = [];
  const env = process.env;
  
  for (const variable of requiredVars) {
    if (!env[variable]) {
      missingVars.push(variable);
    }
  }
  
  if (missingVars.length === 0) {
    addResult(
      'Environment Variables',
      true,
      'All required Keycloak environment variables are set',
      { variables: requiredVars }
    );
  } else {
    addResult(
      'Environment Variables',
      false,
      `Missing environment variables: ${missingVars.join(', ')}`,
      { missing: missingVars }
    );
  }
}

async function testClientConfiguration() {
  try {
    // Test OIDC discovery to check client configuration
    const response = await makeRequest(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/.well-known/openid_configuration`
    );
    
    if (response.statusCode === 200) {
      const config_data = response.json();
      const redirectUris = config_data.redirect_uris || [];
      const webOrigins = config_data.web_uris || [];
      
      const hasLocalhost = redirectUris.some(uri => uri.includes('localhost:5173'));
      const hasWebOrigins = webOrigins.some(uri => uri.includes('localhost:5173'));
      
      if (hasLocalhost && hasWebOrigins) {
        addResult(
          'Client Configuration',
          true,
          'Client properly configured for localhost:5173',
          { redirectUris, webOrigins }
        );
      } else {
        addWarning(
          'Client Configuration',
          'Client may need redirect URI configuration for localhost:5173',
          { redirectUris, webOrigins }
        );
      }
    }
  } catch (error) {
    addResult(
      'Client Configuration',
      false,
      `Client configuration test failed: ${error.message}`,
      { error: error.message }
    );
  }
}

// Main test execution
async function runTests() {
  log('Starting Keycloak Infrastructure Tests', 'blue');
  log('=====================================', 'blue');
  log('');
  
  // Run all tests
  const tests = [
    testKeycloakAvailability,
    testAdminConsole,
    testVendorGridRealm,
    testOpenIDConnectDiscovery,
    testJWKSEndpoint,
    testTokenEndpoint,
    testUserInfoEndpoint,
    testDatabaseConnectivity,
    testEnvironmentVariables,
    testClientConfiguration
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      addResult(
        test.name || 'Unknown Test',
        false,
        `Test execution failed: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  // Display results summary
  log('');
  log('Test Results Summary', 'blue');
  log('===================', 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  if (results.warnings > 0) {
    log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  }
  log('');
  
  // Display detailed results
  log('Detailed Results', 'blue');
  log('================', 'blue');
  results.tests.forEach(test => {
    const status = test.passed === true ? '✅' : (test.passed === 'warning' ? '⚠️' : '❌');
    const color = test.passed === true ? 'green' : (test.passed === 'warning' ? 'yellow' : 'red');
    log(`${status} ${test.name}: ${test.message}`, color);
    if (test.details && Object.keys(test.details).length > 0) {
      log(`   Details: ${JSON.stringify(test.details, null, 2)}`, 'blue');
    }
  });
  
  // Overall status
  const successRate = (results.passed / (results.passed + results.failed)) * 100;
  log('');
  if (results.failed === 0) {
    log('🎉 All tests passed! Keycloak infrastructure is ready for Phase 3.', 'green');
  } else if (successRate >= 80) {
    log('⚠️  Most tests passed. Review failed tests before proceeding.', 'yellow');
  } else {
    log('❌ Several tests failed. Please resolve issues before Phase 3.', 'red');
  }
  
  log('');
  log('Next Steps:', 'blue');
  log('1. Review and resolve any failed tests');
  log('2. Generate client secrets using ./keycloak-init/start-keycloak.sh secrets');
  log('3. Create test users in the Keycloak admin console');
  log('4. Update .env with generated client secrets');
  log('5. Proceed to Phase 3: Authentication Migration');
  log('');
  log(`Test completed at: ${new Date().toISOString()}`);
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest, config };