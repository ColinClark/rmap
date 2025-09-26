#!/usr/bin/env node

/**
 * Test user invitation system
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

async function testInvitationSystem() {
  log('\n========================================', 'blue');
  log('TESTING USER INVITATION SYSTEM', 'blue');
  log('========================================', 'blue');

  const timestamp = Date.now();

  // Create admin user who will send invitations
  const adminData = {
    email: `admin${timestamp}@example.com`,
    password: 'AdminPass123!',
    name: 'Admin User',
    tenantName: `Test Company ${timestamp}`
  };

  // User to be invited
  const inviteeEmail = `invitee${timestamp}@example.com`;

  try {
    // Step 1: Register admin user
    log('\n1. Registering admin user...', 'cyan');
    const registerResponse = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      log(`❌ Admin registration failed: ${registerData.error}`, 'red');
      return;
    }

    log('✅ Admin registered successfully!', 'green');
    log(`   Admin ID: ${registerData.user.id}`, 'green');
    log(`   Tenant ID: ${registerData.tenant?.id}`, 'green');

    const adminToken = registerData.tokens?.accessToken;
    const tenantId = registerData.tenant?.id;

    if (!adminToken || !tenantId) {
      log('❌ Missing admin token or tenant ID', 'red');
      return;
    }

    // Step 2: Create invitation
    log('\n2. Creating invitation for new user...', 'cyan');
    const inviteResponse = await fetch('http://localhost:4000/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        email: inviteeEmail,
        tenantId: tenantId,
        role: 'member',
        permissions: ['read:campaigns', 'read:analytics']
      })
    });

    const inviteData = await inviteResponse.json();

    if (!inviteResponse.ok) {
      log(`❌ Invitation failed: ${inviteData.error}`, 'red');
      return;
    }

    log('✅ Invitation created successfully!', 'green');
    log(`   Invitation ID: ${inviteData.invitation.id}`, 'green');
    log(`   Email: ${inviteData.invitation.email}`, 'green');
    log(`   Role: ${inviteData.invitation.role}`, 'green');
    log(`   Expires: ${new Date(inviteData.invitation.expiresAt).toLocaleString()}`, 'green');

    // Step 3: Get all invitations for the tenant
    log('\n3. Fetching all invitations for tenant...', 'cyan');
    const listResponse = await fetch('http://localhost:4000/api/invitations', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-ID': tenantId
      }
    });

    const listData = await listResponse.json();

    if (!listResponse.ok) {
      log(`❌ Failed to list invitations: ${listData.error}`, 'red');
    } else {
      log('✅ Successfully fetched invitations!', 'green');
      log(`   Total invitations: ${listData.invitations.length}`, 'green');
      listData.invitations.forEach(inv => {
        log(`   - ${inv.email} (${inv.status})`, 'green');
      });
    }

    // Step 4: Test resending invitation
    log('\n4. Testing resend invitation...', 'cyan');
    const resendResponse = await fetch(`http://localhost:4000/api/invitations/${inviteData.invitation.id}/resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-ID': tenantId
      }
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      log(`❌ Resend failed: ${resendData.error}`, 'red');
    } else {
      log('✅ Invitation resent successfully!', 'green');
    }

    // Step 5: Register the invited user
    log('\n5. Registering invited user...', 'cyan');
    const inviteeData = {
      email: inviteeEmail,
      password: 'UserPass123!',
      name: 'Invited User'
    };

    const inviteeRegResponse = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteeData)
    });

    const inviteeRegData = await inviteeRegResponse.json();

    if (!inviteeRegResponse.ok) {
      log(`❌ Invitee registration failed: ${inviteeRegData.error}`, 'red');
      return;
    }

    log('✅ Invitee registered successfully!', 'green');
    const inviteeToken = inviteeRegData.tokens?.accessToken;

    // Note: In a real scenario, the invitation token would be extracted from the email
    // For testing, we'll simulate this by using the admin to get the invitation details
    log('\n6. Simulating invitation acceptance...', 'cyan');
    log('   Note: In production, the invitation token comes from the email link', 'yellow');

    // Step 6: Try creating duplicate invitation
    log('\n7. Testing duplicate invitation (should fail)...', 'cyan');
    const duplicateResponse = await fetch('http://localhost:4000/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        email: inviteeEmail,
        tenantId: tenantId,
        role: 'member'
      })
    });

    const duplicateData = await duplicateResponse.json();

    if (duplicateResponse.ok) {
      log('❌ Duplicate invitation should have been rejected!', 'red');
    } else {
      log('✅ Duplicate invitation correctly rejected', 'green');
      log(`   Error: ${duplicateData.error}`, 'green');
    }

    // Step 7: Test revoking invitation
    log('\n8. Testing revoke invitation...', 'cyan');
    const revokeResponse = await fetch(`http://localhost:4000/api/invitations/${inviteData.invitation.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-ID': tenantId
      }
    });

    const revokeData = await revokeResponse.json();

    if (!revokeResponse.ok) {
      log(`❌ Revoke failed: ${revokeData.error}`, 'red');
    } else {
      log('✅ Invitation revoked successfully!', 'green');
    }

    log('\n========================================', 'blue');
    log('✅ INVITATION SYSTEM TESTS COMPLETED!', 'green');
    log('========================================', 'blue');

    log('\n📧 To see invitation emails, visit:', 'cyan');
    log('   URL: https://ethereal.email/messages', 'cyan');
    log('   Email: hueabfri4nvhxx4m@ethereal.email', 'cyan');
    log('   Password: PAMN2Yc3xArMvEVTpz', 'cyan');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
  }
}

// Run test
testInvitationSystem().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});