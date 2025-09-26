#!/usr/bin/env node

// Test script for registration flow
const testRegistration = async () => {
  const API_BASE = 'http://localhost:4000/auth';
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;

  console.log('🧪 Testing Registration Flow');
  console.log('============================');

  try {
    // 1. Test Registration
    console.log('\n1️⃣ Testing Registration...');
    const registerResponse = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!',
        name: 'Test User',
        tenantName: `Test Org ${timestamp}`
      })
    });

    const registerData = await registerResponse.json();
    console.log('Registration response:', {
      success: registerData.success,
      hasUser: !!registerData.user,
      hasTokens: !!registerData.tokens,
      emailVerified: registerData.user?.emailVerified
    });

    if (!registerData.success) {
      console.error('❌ Registration failed:', registerData.error);
      return;
    }

    console.log('✅ Registration successful!');
    console.log(`   User: ${registerData.user.email}`);
    console.log(`   Email Verified: ${registerData.user.emailVerified}`);

    // 2. Test Login
    console.log('\n2️⃣ Testing Login...');
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', {
      success: loginData.success,
      hasTokens: !!loginData.tokens
    });

    if (loginData.success) {
      console.log('✅ Login successful!');
    } else {
      console.log('⚠️ Login failed (expected if email verification required):', loginData.error);
    }

    // 3. Test Forgot Password
    console.log('\n3️⃣ Testing Forgot Password...');
    const forgotResponse = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    });

    const forgotData = await forgotResponse.json();
    console.log('Forgot password response:', {
      success: forgotData.success
    });

    if (forgotData.success) {
      console.log('✅ Password reset email sent!');
    }

    // Check Ethereal Email URL
    console.log('\n📧 Check Ethereal Email for test emails:');
    console.log('   URL: https://ethereal.email/messages');
    console.log('   Email: hueabfri4nvhxx4m@ethereal.email');
    console.log('   Password: PAMN2Yc3xArMvEVTpz');

    console.log('\n✨ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
};

// Run the test
testRegistration().catch(console.error);