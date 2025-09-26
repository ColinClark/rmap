#!/usr/bin/env node

async function testLoginIssue() {
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const testPassword = 'TestPass123!';

  console.log('Testing login issue...\n');

  // Step 1: Register
  console.log('1. Registering user...');
  const registerResponse = await fetch('http://localhost:4000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: 'Test User',
      tenantName: `Test Org ${timestamp}`
    })
  });

  const registerData = await registerResponse.json();
  console.log('Registration response:', {
    success: registerData.success,
    userId: registerData.user?.id,
    hasTokens: !!registerData.tokens
  });

  if (!registerData.success) {
    console.error('Registration failed:', registerData.error);
    return;
  }

  // Step 2: Try to login immediately
  console.log('\n2. Attempting login with same credentials...');
  const loginResponse = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  const loginData = await loginResponse.json();
  console.log('Login response:', {
    success: loginData.success,
    error: loginData.error
  });

  // Step 3: Try login with tenant ID from registration
  if (registerData.tenant?.id) {
    console.log('\n3. Attempting login WITH tenant ID...');
    const loginWithTenantResponse = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        tenantId: registerData.tenant.id
      })
    });

    const loginWithTenantData = await loginWithTenantResponse.json();
    console.log('Login with tenant response:', {
      success: loginWithTenantData.success,
      error: loginWithTenantData.error
    });
  }

  // Step 4: Use the access token to check /auth/me
  if (registerData.tokens?.accessToken) {
    console.log('\n4. Checking /auth/me with registration token...');
    const meResponse = await fetch('http://localhost:4000/auth/me', {
      headers: {
        'Authorization': `Bearer ${registerData.tokens.accessToken}`
      }
    });

    const meData = await meResponse.json();
    console.log('Me response:', meData);
  }
}

testLoginIssue().catch(console.error);