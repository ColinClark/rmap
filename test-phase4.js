#!/usr/bin/env node

/**
 * Test script for Phase 4: Tenant Management APIs
 */

const API_BASE = 'http://localhost:4000'

// Test credentials
const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'password123'

let accessToken = ''
let tenantId = ''
let invitedUserId = ''

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function makeRequest(method, endpoint, body = null, useAuth = true) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(useAuth && accessToken && { 'Authorization': `Bearer ${accessToken}` })
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options)
    const data = await response.json().catch(() => ({}))

    return {
      ok: response.ok,
      status: response.status,
      data
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    }
  }
}

async function testLogin() {
  log('\n=== Testing Login ===', 'cyan')

  const response = await makeRequest('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  }, false)

  if (response.ok && response.data.tokens?.accessToken) {
    accessToken = response.data.tokens.accessToken
    tenantId = response.data.tenant?.id

    // If no tenant, try to get it from /auth/me
    if (!tenantId) {
      const meResponse = await makeRequest('GET', '/auth/me', null, true)
      if (meResponse.ok && meResponse.data.tenant) {
        tenantId = meResponse.data.tenant.id
      }
    }

    log('✓ Login successful', 'green')
    log(`  Token: ${accessToken.substring(0, 20)}...`, 'yellow')
    log(`  Tenant ID: ${tenantId || 'No tenant'}`, 'yellow')
    return true
  } else {
    log('✗ Login failed: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetTenantInfo() {
  log('\n=== Testing GET /api/tenant/current ===', 'cyan')

  const response = await makeRequest('GET', '/api/tenant/current')

  if (response.ok) {
    log('✓ Got tenant info', 'green')
    log(`  Name: ${response.data.tenant?.name}`, 'yellow')
    log(`  Plan: ${response.data.tenant?.subscription?.plan}`, 'yellow')
    log(`  Users: ${response.data.usage?.users} / ${response.data.limits?.users}`, 'yellow')
    return true
  } else {
    log('✗ Failed to get tenant info: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testUpdateTenantSettings() {
  log('\n=== Testing PATCH /api/tenant/settings ===', 'cyan')

  const response = await makeRequest('PATCH', '/api/tenant/settings', {
    name: 'Test Organization Updated',
    contactEmail: 'admin@testorg.com',
    settings: {
      timezone: 'America/New_York',
      currency: 'USD'
    }
  })

  if (response.ok) {
    log('✓ Updated tenant settings', 'green')
    log(`  Name: ${response.data.tenant?.name}`, 'yellow')
    return true
  } else {
    log('✗ Failed to update settings: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetTeamMembers() {
  log('\n=== Testing GET /api/tenant/users ===', 'cyan')

  const response = await makeRequest('GET', '/api/tenant/users')

  if (response.ok) {
    log('✓ Got team members', 'green')
    log(`  Total users: ${response.data.total}`, 'yellow')
    response.data.users?.forEach(user => {
      log(`  - ${user.email} (${user.tenantRole})`, 'blue')
    })
    return true
  } else {
    log('✗ Failed to get users: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testInviteUser() {
  log('\n=== Testing POST /api/tenant/users/invite ===', 'cyan')

  const response = await makeRequest('POST', '/api/tenant/users/invite', {
    email: 'newuser@example.com',
    role: 'member',
    permissions: ['retail_media']
  })

  if (response.ok) {
    log('✓ Invited user', 'green')
    log(`  Email: ${response.data.invitation?.email}`, 'yellow')
    log(`  Role: ${response.data.invitation?.role}`, 'yellow')
    log(`  Token: ${response.data.invitation?.token}`, 'yellow')
    return true
  } else {
    log('✗ Failed to invite user: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testUpdateUserRole() {
  log('\n=== Testing PUT /api/tenant/users/:id ===', 'cyan')

  // First get a user to update (not ourselves)
  const usersResponse = await makeRequest('GET', '/api/tenant/users')
  const otherUser = usersResponse.data.users?.find(u => u.email !== TEST_EMAIL)

  if (!otherUser) {
    log('⚠ No other users to update role', 'yellow')
    return true
  }

  const response = await makeRequest('PUT', `/api/tenant/users/${otherUser.id}`, {
    role: 'manager',
    permissions: ['retail_media', 'google_ads']
  })

  if (response.ok) {
    log('✓ Updated user role', 'green')
    log(`  User ID: ${response.data.userId}`, 'yellow')
    log(`  New Role: ${response.data.role}`, 'yellow')
    return true
  } else {
    log('✗ Failed to update role: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testActivityLogs() {
  log('\n=== Testing GET /api/tenant/activity ===', 'cyan')

  const response = await makeRequest('GET', '/api/tenant/activity?limit=10')

  if (response.ok) {
    log('✓ Got activity logs', 'green')
    log(`  Total activities: ${response.data.total}`, 'yellow')
    response.data.activities?.slice(0, 3).forEach(activity => {
      log(`  - ${activity.action} on ${activity.resource} at ${activity.timestamp}`, 'blue')
    })
    return true
  } else {
    log('✗ Failed to get activities: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testActivityStats() {
  log('\n=== Testing GET /api/tenant/activity/stats ===', 'cyan')

  const response = await makeRequest('GET', '/api/tenant/activity/stats?days=7')

  if (response.ok) {
    log('✓ Got activity statistics', 'green')
    log(`  Total activities: ${response.data.totalActivities}`, 'yellow')
    log(`  Active users: ${response.data.activeUsers}`, 'yellow')
    if (response.data.topActions?.length > 0) {
      log('  Top actions:', 'yellow')
      response.data.topActions.slice(0, 3).forEach(action => {
        log(`    - ${action.action}: ${action.count}`, 'blue')
      })
    }
    return true
  } else {
    log('✗ Failed to get stats: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testSecuritySettings() {
  log('\n=== Testing PATCH /api/tenant/security ===', 'cyan')

  const response = await makeRequest('PATCH', '/api/tenant/security', {
    enforce2FA: false,
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true
    }
  })

  if (response.ok) {
    log('✓ Updated security settings', 'green')
    log(`  2FA: ${response.data.security?.enforce2FA}`, 'yellow')
    log(`  Session timeout: ${response.data.security?.sessionTimeout} minutes`, 'yellow')
    log(`  Password min length: ${response.data.security?.passwordPolicy?.minLength}`, 'yellow')
    return true
  } else {
    log('✗ Failed to update security: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testBranding() {
  log('\n=== Testing PUT /api/tenant/branding ===', 'cyan')

  const response = await makeRequest('PUT', '/api/tenant/branding', {
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    supportEmail: 'support@testorg.com',
    loginMessage: 'Welcome to Test Organization!',
    footerText: '© 2025 Test Org'
  })

  if (response.ok) {
    log('✓ Updated branding', 'green')
    log(`  Primary color: ${response.data.branding?.primaryColor}`, 'yellow')
    log(`  Support email: ${response.data.branding?.supportEmail}`, 'yellow')
    return true
  } else {
    log('✗ Failed to update branding: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testRemoveUser() {
  log('\n=== Testing DELETE /api/tenant/users/:id ===', 'cyan')

  // Get users list
  const usersResponse = await makeRequest('GET', '/api/tenant/users')
  const userToRemove = usersResponse.data.users?.find(u =>
    u.email !== TEST_EMAIL && u.tenantRole !== 'owner'
  )

  if (!userToRemove) {
    log('⚠ No users available to remove (need non-owner)', 'yellow')
    return true
  }

  const response = await makeRequest('DELETE', `/api/tenant/users/${userToRemove.id}`)

  if (response.ok) {
    log('✓ Removed user', 'green')
    log(`  User ID: ${response.data.userId}`, 'yellow')
    return true
  } else {
    log('✗ Failed to remove user: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(50), 'cyan')
  log('PHASE 4: TENANT MANAGEMENT API TESTS', 'cyan')
  log('='.repeat(50), 'cyan')

  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Get Tenant Info', fn: testGetTenantInfo },
    { name: 'Update Tenant Settings', fn: testUpdateTenantSettings },
    { name: 'Get Team Members', fn: testGetTeamMembers },
    { name: 'Invite User', fn: testInviteUser },
    { name: 'Update User Role', fn: testUpdateUserRole },
    { name: 'Activity Logs', fn: testActivityLogs },
    { name: 'Activity Stats', fn: testActivityStats },
    { name: 'Security Settings', fn: testSecuritySettings },
    { name: 'Branding', fn: testBranding },
    { name: 'Remove User', fn: testRemoveUser }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      log(`✗ ${test.name} threw error: ${error.message}`, 'red')
      failed++
    }
  }

  log('\n' + '='.repeat(50), 'cyan')
  log(`RESULTS: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green')
  log('='.repeat(50), 'cyan')
}

// Run tests
runAllTests().catch(error => {
  log('Fatal error: ' + error.message, 'red')
  process.exit(1)
})