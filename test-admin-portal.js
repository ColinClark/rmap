#!/usr/bin/env node

/**
 * Test script for Admin Portal APIs
 */

const API_BASE = 'http://localhost:4000'

// Admin credentials (default created by setup)
const ADMIN_EMAIL = 'admin@rmap.com'
const ADMIN_PASSWORD = 'Admin123'

let adminToken = ''

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
      ...(useAuth && adminToken && { 'Authorization': `Bearer ${adminToken}` })
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

// Test functions
async function testAdminLogin() {
  log('\n=== Testing Admin Login ===', 'cyan')

  const response = await makeRequest('POST', '/admin/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, false)

  if (response.ok && response.data.token) {
    adminToken = response.data.token
    log('✓ Admin login successful', 'green')
    log(`  Admin: ${response.data.admin?.name} (${response.data.admin?.role})`, 'yellow')
    return true
  } else {
    log('✗ Admin login failed: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetAdminInfo() {
  log('\n=== Testing GET /admin/me ===', 'cyan')

  const response = await makeRequest('GET', '/admin/me')

  if (response.ok) {
    log('✓ Got admin info', 'green')
    log(`  Name: ${response.data.admin?.name}`, 'yellow')
    log(`  Role: ${response.data.admin?.role}`, 'yellow')
    log(`  Permissions: ${response.data.admin?.permissions?.length} permissions`, 'yellow')
    return true
  } else {
    log('✗ Failed to get admin info: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testPlatformStats() {
  log('\n=== Testing GET /admin/stats ===', 'cyan')

  const response = await makeRequest('GET', '/admin/stats')

  if (response.ok) {
    log('✓ Got platform statistics', 'green')
    log(`  Total tenants: ${response.data.tenants?.total}`, 'yellow')
    log(`  Total users: ${response.data.users?.total}`, 'yellow')
    log(`  MRR: $${response.data.revenue?.mrr}`, 'yellow')
    return true
  } else {
    log('✗ Failed to get stats: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetAllTenants() {
  log('\n=== Testing GET /admin/tenants ===', 'cyan')

  const response = await makeRequest('GET', '/admin/tenants')

  if (response.ok) {
    log('✓ Got tenants list', 'green')
    log(`  Total tenants: ${response.data.total}`, 'yellow')
    response.data.tenants?.slice(0, 3).forEach(tenant => {
      log(`  - ${tenant.name} (${tenant.subscription?.plan})`, 'blue')
    })
    return true
  } else {
    log('✗ Failed to get tenants: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetAllApps() {
  log('\n=== Testing GET /admin/apps ===', 'cyan')

  const response = await makeRequest('GET', '/admin/apps')

  if (response.ok) {
    log('✓ Got apps catalog', 'green')
    log(`  Total apps: ${response.data.apps?.length}`, 'yellow')
    response.data.apps?.forEach(app => {
      log(`  - ${app.name} (${app.status})`, 'blue')
      log(`    ${app.shortDescription}`, 'blue')
      log(`    Rating: ${app.rating}/5 | Installs: ${app.installs}`, 'blue')
    })
    return true
  } else {
    log('✗ Failed to get apps: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGrantAppToTenant() {
  log('\n=== Testing POST /admin/tenants/:id/apps/:appId/grant ===', 'cyan')

  // Grant retail-media-planner to demo tenant
  const response = await makeRequest('POST', '/admin/tenants/demo-tenant-id/apps/retail-media-planner/grant', {
    config: {},
    limits: {}
  })

  if (response.ok) {
    log('✓ Granted app to tenant', 'green')
    log(`  Tenant: demo-tenant-id`, 'yellow')
    log(`  App: retail-media-planner`, 'yellow')
    log(`  Status: ${response.data.entitlement?.status}`, 'yellow')
    return true
  } else {
    log('✗ Failed to grant app: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function testGetTenantApps() {
  log('\n=== Testing GET /admin/tenants/:id/apps ===', 'cyan')

  const response = await makeRequest('GET', '/admin/tenants/demo-tenant-id/apps')

  if (response.ok) {
    log('✓ Got tenant apps', 'green')
    log(`  Total apps: ${response.data.apps?.length}`, 'yellow')
    response.data.apps?.forEach(app => {
      log(`  - ${app.name}`, 'blue')
      log(`    ${app.highlights?.join(', ')}`, 'blue')
    })
    return true
  } else {
    log('✗ Failed to get tenant apps: ' + JSON.stringify(response.data), 'red')
    return false
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(50), 'cyan')
  log('ADMIN PORTAL API TESTS', 'cyan')
  log('='.repeat(50), 'cyan')

  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Get Admin Info', fn: testGetAdminInfo },
    { name: 'Platform Stats', fn: testPlatformStats },
    { name: 'Get All Tenants', fn: testGetAllTenants },
    { name: 'Get All Apps', fn: testGetAllApps },
    { name: 'Grant App to Tenant', fn: testGrantAppToTenant },
    { name: 'Get Tenant Apps', fn: testGetTenantApps }
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

  log('\n📝 Default Admin Credentials:', 'cyan')
  log('  Email: admin@rmap.com', 'yellow')
  log('  Password: Admin123!@#', 'yellow')
}

// Run tests
runAllTests().catch(error => {
  log('Fatal error: ' + error.message, 'red')
  process.exit(1)
})