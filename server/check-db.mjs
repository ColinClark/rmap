import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function checkDB() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db()

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    console.log(`=== Checking for user with email ${testEmail} ===`)
    const user = await db.collection('users').findOne({ email: testEmail })
    console.log('User found:', user ? 'YES' : 'NO')
    if (user) {
      console.log('User details:')
      console.log('- ID:', user._id)
      console.log('- Email:', user.email)
      console.log('- Name:', user.name)
      console.log('- Has password:', user.passwordHash ? 'YES' : 'NO')
      console.log('- Created:', user.createdAt)
    }

    console.log('\n=== Checking tenant_users for this email ===')
    if (user) {
      const tenantUsers = await db.collection('tenant_users').find({ userId: user._id }).toArray()
      console.log('Tenant associations:', tenantUsers.length)
      tenantUsers.forEach(tu => {
        console.log('- Tenant:', tu.tenantId, 'Role:', tu.role)
      })
    }

    console.log(`\n=== Checking tenants with contact email ${testEmail} ===`)
    const tenants = await db.collection('tenants').find({ contactEmail: testEmail }).toArray()
    console.log('Tenants with this contact email:', tenants.length)
    tenants.forEach(t => {
      console.log('- Tenant:', t.name, '(' + t.slug + ')', 'ID:', t.id)
    })

  } finally {
    await client.close()
  }
}

checkDB().catch(console.error)