import fetch from 'node-fetch'

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiYWRtaW4tMDAxIiwiZW1haWwiOiJhZG1pbkBybWFwLmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInBlcm1pc3Npb25zIjpbIm1hbmFnZV90ZW5hbnRzIiwidmlld190ZW5hbnRzIiwibWFuYWdlX2JpbGxpbmciLCJtYW5hZ2VfYXBwcyIsInZpZXdfYW5hbHl0aWNzIiwibWFuYWdlX2FkbWlucyIsInZpZXdfbG9ncyIsIm1hbmFnZV9zdXBwb3J0Il0sInR5cGUiOiJhZG1pbiIsImlhdCI6MTc1OTAzMzg3MCwiZXhwIjoxNzU5MDYyNjcwfQ.gOw8zYAr5Nh9bB3NGqac476bjrqBdx0SEiwkQNA79IU'

async function testAPIs() {
  console.log('Testing Admin APIs with token...\n')

  // Test tenants endpoint
  try {
    console.log('1. Testing /admin/tenants:')
    const tenantsRes = await fetch('http://localhost:4000/admin/tenants', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const tenants = await tenantsRes.json()
    console.log(`   ✓ Found ${tenants.tenants?.length || 0} tenants`)
    if (tenants.tenants?.length > 0) {
      console.log('   Tenants:', tenants.tenants.map(t => t.name).join(', '))
    }
  } catch (err) {
    console.log('   ✗ Error:', err.message)
  }

  // Test apps endpoint
  try {
    console.log('\n2. Testing /admin/apps:')
    const appsRes = await fetch('http://localhost:4000/admin/apps', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const apps = await appsRes.json()
    console.log(`   ✓ Found ${apps.apps?.length || 0} apps`)
    if (apps.apps?.length > 0) {
      console.log('   Apps:', apps.apps.map(a => a.name).join(', '))
    }
  } catch (err) {
    console.log('   ✗ Error:', err.message)
  }

  // Test stats endpoint
  try {
    console.log('\n3. Testing /admin/stats:')
    const statsRes = await fetch('http://localhost:4000/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const stats = await statsRes.json()
    console.log('   ✓ Stats retrieved')
    console.log('   Total tenants:', stats.tenants?.total)
    console.log('   Total apps:', stats.apps?.total)
    console.log('   Total users:', stats.users?.total)
  } catch (err) {
    console.log('   ✗ Error:', err.message)
  }

  console.log('\n✅ API Test Complete')
  console.log('\nTo use this token in the browser console:')
  console.log(`localStorage.setItem('adminToken', '${token}')`)
  console.log('window.location.reload()')
}

testAPIs()