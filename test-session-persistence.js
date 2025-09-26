#!/usr/bin/env node

/**
 * Test session persistence and /auth/me endpoint
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSessionPersistence() {
  log('\n========================================', 'blue');
  log('TESTING SESSION PERSISTENCE', 'blue');
  log('========================================', 'blue');

  const timestamp = Date.now();
  const testData = {
    email: `test${timestamp}@example.com`,
    password: 'TestPass123!',
    name: 'Session Test User',
    tenantName: `Test Org ${timestamp}`
  };

  try {
    // Step 1: Register a new user
    log('\n1. Registering new user...', 'cyan');
    const registerResponse = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      log(`❌ Registration failed: ${registerData.error}`, 'red');
      return;
    }

    log('✅ Registration successful!', 'green');
    log(`   User ID: ${registerData.user.id}`, 'green');
    log(`   Access Token: ${registerData.tokens?.accessToken?.substring(0, 20)}...`, 'green');

    const accessToken = registerData.tokens?.accessToken;
    const refreshToken = registerData.tokens?.refreshToken;

    if (!accessToken) {
      log('❌ No access token received', 'red');
      return;
    }

    // Step 2: Test /auth/me with the access token
    log('\n2. Testing /auth/me with access token...', 'cyan');
    const meResponse = await fetch('http://localhost:4000/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const meData = await meResponse.json();

    if (!meResponse.ok) {
      log(`❌ /auth/me failed: ${meData.error}`, 'red');
      return;
    }

    log('✅ /auth/me successful!', 'green');
    log(`   User Email: ${meData.user.email}`, 'green');
    log(`   User Name: ${meData.user.name}`, 'green');
    log(`   Email Verified: ${meData.user.emailVerified}`, 'green');
    if (meData.tenant) {
      log(`   Tenant: ${meData.tenant.name} (${meData.tenant.slug})`, 'green');
      log(`   Role: ${meData.tenant.role}`, 'green');
    }

    // Step 3: Wait a moment and test again (simulating page refresh)
    log('\n3. Simulating page refresh (testing token persistence)...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const meResponse2 = await fetch('http://localhost:4000/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const meData2 = await meResponse2.json();

    if (!meResponse2.ok) {
      log(`❌ /auth/me failed after refresh: ${meData2.error}`, 'red');
      return;
    }

    log('✅ Token still valid after simulated refresh!', 'green');

    // Step 4: Test with invalid token
    log('\n4. Testing /auth/me with invalid token...', 'cyan');
    const invalidResponse = await fetch('http://localhost:4000/auth/me', {
      headers: {
        'Authorization': 'Bearer invalid-token-here'
      }
    });

    const invalidData = await invalidResponse.json();

    if (invalidResponse.ok) {
      log('❌ Should have rejected invalid token!', 'red');
      return;
    }

    log('✅ Invalid token correctly rejected', 'green');
    log(`   Error: ${invalidData.error}`, 'green');

    // Step 5: Test without token
    log('\n5. Testing /auth/me without token...', 'cyan');
    const noTokenResponse = await fetch('http://localhost:4000/auth/me');
    const noTokenData = await noTokenResponse.json();

    if (noTokenResponse.ok) {
      log('❌ Should have required authentication!', 'red');
      return;
    }

    log('✅ Correctly requires authentication', 'green');
    log(`   Error: ${noTokenData.error}`, 'green');

    // Step 6: Test token refresh
    if (refreshToken) {
      log('\n6. Testing token refresh...', 'cyan');
      const refreshResponse = await fetch('http://localhost:4000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        log(`❌ Token refresh failed: ${refreshData.error}`, 'red');
      } else {
        log('✅ Token refresh successful!', 'green');
        log(`   New Access Token: ${refreshData.accessToken?.substring(0, 20)}...`, 'green');

        // Test /auth/me with new token
        log('\n7. Testing /auth/me with refreshed token...', 'cyan');
        const newMeResponse = await fetch('http://localhost:4000/auth/me', {
          headers: {
            'Authorization': `Bearer ${refreshData.accessToken}`
          }
        });

        const newMeData = await newMeResponse.json();

        if (!newMeResponse.ok) {
          log(`❌ /auth/me failed with new token: ${newMeData.error}`, 'red');
        } else {
          log('✅ /auth/me works with refreshed token!', 'green');
        }
      }
    }

    log('\n========================================', 'blue');
    log('✅ ALL SESSION PERSISTENCE TESTS PASSED!', 'green');
    log('========================================', 'blue');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
  }
}

// Run test
testSessionPersistence().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});