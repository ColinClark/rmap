#!/usr/bin/env node

/**
 * Comprehensive auth flow testing
 */

const API_BASE = 'http://localhost:4000/auth';
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRegistration() {
  log('\n========================================', 'blue');
  log('TEST 1: Registration Flow', 'blue');
  log('========================================', 'blue');

  const timestamp = Date.now();
  const testData = {
    email: `test${timestamp}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    tenantName: `Test Company ${timestamp}`
  };

  try {
    log('\n1. Testing registration with new user...', 'cyan');
    const registerResponse = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      log(`❌ Registration failed: ${registerData.error}`, 'red');
      return null;
    }

    log('✅ Registration successful!', 'green');
    log(`   User ID: ${registerData.user.id}`, 'green');
    log(`   Email: ${registerData.user.email}`, 'green');
    log(`   Email Verified: ${registerData.user.emailVerified}`, 'green');
    log(`   Has Access Token: ${!!registerData.tokens?.accessToken}`, 'green');
    log(`   Has Refresh Token: ${!!registerData.tokens?.refreshToken}`, 'green');

    return {
      ...testData,
      userId: registerData.user.id,
      accessToken: registerData.tokens?.accessToken,
      refreshToken: registerData.tokens?.refreshToken
    };
  } catch (error) {
    log(`❌ Registration test failed: ${error.message}`, 'red');
    return null;
  }
}

async function testDuplicateRegistration(existingEmail) {
  log('\n2. Testing duplicate email registration...', 'cyan');

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: existingEmail,
        password: 'AnotherPass123!',
        name: 'Another User',
        tenantName: 'Another Company'
      })
    });

    const data = await response.json();

    if (response.ok) {
      log('❌ Duplicate registration should have failed!', 'red');
      return false;
    }

    if (data.error && data.error.includes('already registered')) {
      log('✅ Duplicate email correctly rejected', 'green');
      return true;
    }

    log(`⚠️ Unexpected error: ${data.error}`, 'yellow');
    return false;
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testLogin(credentials) {
  log('\n========================================', 'blue');
  log('TEST 2: Login Flow', 'blue');
  log('========================================', 'blue');

  try {
    log('\n1. Testing login with registered user...', 'cyan');
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      log(`❌ Login failed: ${loginData.error}`, 'red');
      return false;
    }

    log('✅ Login successful!', 'green');
    log(`   Has Access Token: ${!!loginData.tokens?.accessToken}`, 'green');
    log(`   Has Session Token: ${!!loginData.session?.sessionToken}`, 'green');

    return loginData.tokens?.accessToken;
  } catch (error) {
    log(`❌ Login test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testInvalidLogin() {
  log('\n2. Testing login with invalid credentials...', 'cyan');

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'WrongPass123!'
      })
    });

    const data = await response.json();

    if (response.ok) {
      log('❌ Invalid login should have failed!', 'red');
      return false;
    }

    log('✅ Invalid credentials correctly rejected', 'green');
    return true;
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPasswordReset(email) {
  log('\n========================================', 'blue');
  log('TEST 3: Password Reset Flow', 'blue');
  log('========================================', 'blue');

  try {
    log('\n1. Testing forgot password request...', 'cyan');
    const forgotResponse = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const forgotData = await forgotResponse.json();

    if (!forgotResponse.ok) {
      log(`❌ Forgot password failed: ${forgotData.error}`, 'red');
      return false;
    }

    log('✅ Password reset email request sent!', 'green');
    log(`   Message: ${forgotData.message}`, 'green');

    return true;
  } catch (error) {
    log(`❌ Password reset test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testTokenRefresh(refreshToken) {
  log('\n========================================', 'blue');
  log('TEST 4: Token Refresh', 'blue');
  log('========================================', 'blue');

  try {
    log('\n1. Testing token refresh...', 'cyan');
    const refreshResponse = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      log(`❌ Token refresh failed: ${refreshData.error}`, 'red');
      return false;
    }

    log('✅ Token refresh successful!', 'green');
    log(`   New Access Token: ${refreshData.accessToken?.substring(0, 20)}...`, 'green');

    return true;
  } catch (error) {
    log(`❌ Token refresh test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🧪 STARTING COMPREHENSIVE AUTH TESTS', 'blue');
  log('=====================================', 'blue');

  let allTestsPassed = true;

  // Test 1: Registration
  const registrationResult = await testRegistration();
  if (!registrationResult) {
    allTestsPassed = false;
  } else {
    // Test duplicate registration
    const dupTest = await testDuplicateRegistration(registrationResult.email);
    if (!dupTest) allTestsPassed = false;
  }

  await sleep(500);

  // Test 2: Login
  if (registrationResult) {
    const accessToken = await testLogin(registrationResult);
    if (!accessToken) {
      allTestsPassed = false;
    } else {
      // Test invalid login
      const invalidTest = await testInvalidLogin();
      if (!invalidTest) allTestsPassed = false;

      // Test token refresh
      if (registrationResult.refreshToken) {
        const refreshTest = await testTokenRefresh(registrationResult.refreshToken);
        if (!refreshTest) allTestsPassed = false;
      }
    }
  }

  await sleep(500);

  // Test 3: Password Reset
  if (registrationResult) {
    const resetTest = await testPasswordReset(registrationResult.email);
    if (!resetTest) allTestsPassed = false;
  }

  // Summary
  log('\n========================================', 'blue');
  log('TEST SUMMARY', 'blue');
  log('========================================', 'blue');

  if (allTestsPassed) {
    log('✅ ALL TESTS PASSED!', 'green');
  } else {
    log('❌ SOME TESTS FAILED', 'red');
  }

  log('\n📧 To see test emails, visit:', 'cyan');
  log('   URL: https://ethereal.email/messages', 'cyan');
  log('   Email: hueabfri4nvhxx4m@ethereal.email', 'cyan');
  log('   Password: PAMN2Yc3xArMvEVTpz', 'cyan');
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});