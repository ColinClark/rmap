import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmap_control'

async function checkDB() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db()

    console.log('=== Checking for user with email colin@clark.ws ===')
    const user = await db.collection('users').findOne({ email: 'colin@clark.ws' })
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

    console.log('\n=== Checking tenants with contact email colin@clark.ws ===')
    const tenants = await db.collection('tenants').find({ contactEmail: 'colin@clark.ws' }).toArray()
    console.log('Tenants with this contact email:', tenants.length)
    tenants.forEach(t => {
      console.log('- Tenant:', t.name, '(' + t.slug + ')', 'ID:', t.id)
    })

  } finally {
    await client.close()
  }
}

checkDB().catch(console.error)